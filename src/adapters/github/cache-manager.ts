/**
 * GitHub Cache Manager - Repository-aware intelligent caching system
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Advanced caching system for GitHub adapter:
 * - Multi-tier caching (Redis + memory)
 * - Repository-aware cache keys and invalidation
 * - Webhook-triggered cache invalidation
 * - TTL-based and tag-based cache strategies
 * - Circuit breaker for cache failures
 * - Performance metrics and monitoring
 */

import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { SearchResult } from '../../types/index.js';
import { GitHubRepository } from './api-client.js';
import { ChangeEvent } from './content-synchronizer.js';
import { logger } from '../../utils/logger.js';

export interface CacheManagerOptions {
  redisUrl?: string;
  enableRedis?: boolean;
  memoryCacheTtlSeconds?: number;
  redisCacheTtlSeconds?: number;
  maxMemoryCacheSize?: number;
  compressionEnabled?: boolean;
  circuitBreakerEnabled?: boolean;
  cacheWarmupEnabled?: boolean;
}

export interface CacheStats {
  memoryCache: {
    keys: number;
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  redisCache: {
    connected: boolean;
    hits: number;
    misses: number;
    hitRate: number;
    errors: number;
  };
  circuitBreaker: {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime?: Date;
  };
  performance: {
    avgGetTime: number;
    avgSetTime: number;
    totalOperations: number;
  };
}

export interface CacheEntry<T = any> {
  value: T;
  timestamp: Date;
  ttl: number;
  tags: string[];
  repository?: string;
  path?: string;
  hash?: string;
}

/**
 * Multi-tier caching system for GitHub data
 */
export class CacheManager {
  private memoryCache: NodeCache;
  private redisClient?: Redis;
  private options: Required<CacheManagerOptions>;
  
  // Circuit breaker state
  private circuitBreaker = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: undefined as Date | undefined,
    resetTime: 60000, // 1 minute
    failureThreshold: 5,
  };

  // Performance metrics
  private stats: CacheStats = {
    memoryCache: { keys: 0, hits: 0, misses: 0, hitRate: 0, size: 0 },
    redisCache: { connected: false, hits: 0, misses: 0, hitRate: 0, errors: 0 },
    circuitBreaker: { isOpen: false, failureCount: 0 },
    performance: { avgGetTime: 0, avgSetTime: 0, totalOperations: 0 },
  };

  private operationTimes: number[] = [];

  constructor(options: CacheManagerOptions = {}) {
    this.options = {
      redisUrl: options.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379',
      enableRedis: options.enableRedis ?? true,
      memoryCacheTtlSeconds: options.memoryCacheTtlSeconds ?? 300, // 5 minutes
      redisCacheTtlSeconds: options.redisCacheTtlSeconds ?? 3600, // 1 hour
      maxMemoryCacheSize: options.maxMemoryCacheSize ?? 1000,
      compressionEnabled: options.compressionEnabled ?? true,
      circuitBreakerEnabled: options.circuitBreakerEnabled ?? true,
      cacheWarmupEnabled: options.cacheWarmupEnabled ?? true,
    };

    // Initialize memory cache
    this.memoryCache = new NodeCache({
      stdTTL: this.options.memoryCacheTtlSeconds,
      maxKeys: this.options.maxMemoryCacheSize,
      useClones: false,
      deleteOnExpire: true,
    });

    // Setup memory cache event listeners
    this.setupMemoryCacheEvents();

    // Initialize Redis if enabled
    if (this.options.enableRedis) {
      this.initializeRedis();
    }
  }

  /**
   * Initialize the cache manager
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing GitHub cache manager', {
        enableRedis: this.options.enableRedis,
        redisUrl: this.options.redisUrl ? '[CONFIGURED]' : '[NOT_CONFIGURED]',
        memoryCacheTtl: this.options.memoryCacheTtlSeconds,
        redisCacheTtl: this.options.redisCacheTtlSeconds,
      });

      // Test Redis connection if enabled
      if (this.redisClient) {
        await this.testRedisConnection();
        this.stats.redisCache.connected = true;
        logger.info('Redis cache connection established');
      }

      // Perform cache warmup if enabled
      if (this.options.cacheWarmupEnabled) {
        await this.performCacheWarmup();
      }

      logger.info('GitHub cache manager initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize GitHub cache manager', { error });
      throw new Error(`Cache manager initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get value from cache with fallback strategy
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      this.stats.performance.totalOperations++;

      // Try memory cache first
      const memoryCacheKey = this.generateMemoryCacheKey(key);
      const memoryValue = this.memoryCache.get<CacheEntry<T>>(memoryCacheKey);
      
      if (memoryValue) {
        this.stats.memoryCache.hits++;
        this.recordOperationTime(performance.now() - startTime);
        return memoryValue.value;
      }

      this.stats.memoryCache.misses++;

      // Try Redis cache if available and circuit breaker is closed
      if (this.redisClient && !this.isCircuitBreakerOpen()) {
        try {
          const redisValue = await this.getFromRedis<T>(key);
          
          if (redisValue) {
            this.stats.redisCache.hits++;
            
            // Store in memory cache for faster access
            await this.setInMemoryCache(memoryCacheKey, redisValue, this.options.memoryCacheTtlSeconds);
            
            this.recordOperationTime(performance.now() - startTime);
            return redisValue.value;
          }

          this.stats.redisCache.misses++;

        } catch (error) {
          this.handleRedisError(error);
        }
      }

      this.recordOperationTime(performance.now() - startTime);
      return null;

    } catch (error) {
      logger.error('Cache get operation failed', { error, key });
      this.recordOperationTime(performance.now() - startTime);
      return null;
    }
  }

  /**
   * Set value in cache with tags and TTL
   */
  async set<T>(
    key: string, 
    value: T, 
    ttlSeconds?: number,
    tags: string[] = [],
    repository?: string,
    path?: string
  ): Promise<void> {
    const startTime = performance.now();

    try {
      this.stats.performance.totalOperations++;

      const cacheEntry: CacheEntry<T> = {
        value,
        timestamp: new Date(),
        ttl: ttlSeconds || this.options.memoryCacheTtlSeconds,
        tags,
        repository,
        path,
        hash: this.generateContentHash(value),
      };

      // Set in memory cache
      const memoryCacheKey = this.generateMemoryCacheKey(key);
      await this.setInMemoryCache(memoryCacheKey, cacheEntry, cacheEntry.ttl);

      // Set in Redis cache if available and circuit breaker is closed
      if (this.redisClient && !this.isCircuitBreakerOpen()) {
        try {
          const redisTtl = ttlSeconds || this.options.redisCacheTtlSeconds;
          await this.setInRedis(key, cacheEntry, redisTtl);
        } catch (error) {
          this.handleRedisError(error);
        }
      }

      this.recordOperationTime(performance.now() - startTime);

    } catch (error) {
      logger.error('Cache set operation failed', { error, key });
      this.recordOperationTime(performance.now() - startTime);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      // Delete from memory cache
      const memoryCacheKey = this.generateMemoryCacheKey(key);
      this.memoryCache.del(memoryCacheKey);

      // Delete from Redis cache
      if (this.redisClient && !this.isCircuitBreakerOpen()) {
        try {
          await this.redisClient.del(this.generateRedisCacheKey(key));
        } catch (error) {
          this.handleRedisError(error);
        }
      }

    } catch (error) {
      logger.error('Cache delete operation failed', { error, key });
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      logger.info('Invalidating cache by tags', { tags });

      // Invalidate memory cache by tags
      await this.invalidateMemoryCacheByTags(tags);

      // Invalidate Redis cache by tags
      if (this.redisClient && !this.isCircuitBreakerOpen()) {
        try {
          await this.invalidateRedisCacheByTags(tags);
        } catch (error) {
          this.handleRedisError(error);
        }
      }

    } catch (error) {
      logger.error('Cache invalidation by tags failed', { error, tags });
    }
  }

  /**
   * Invalidate cache entries for a repository
   */
  async invalidateRepository(repository: string): Promise<void> {
    try {
      logger.info('Invalidating cache for repository', { repository });

      const pattern = `github:${repository}:*`;
      
      // Invalidate memory cache
      const memoryKeys = this.memoryCache.keys().filter(key => 
        key.includes(repository)
      );
      this.memoryCache.del(memoryKeys);

      // Invalidate Redis cache
      if (this.redisClient && !this.isCircuitBreakerOpen()) {
        try {
          const redisPattern = this.generateRedisCacheKey(`${repository}:*`);
          const keys = await this.redisClient.keys(redisPattern);
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
          }
        } catch (error) {
          this.handleRedisError(error);
        }
      }

    } catch (error) {
      logger.error('Repository cache invalidation failed', { error, repository });
    }
  }

  /**
   * Process change events for cache invalidation
   */
  async processChangeEvent(changeEvent: ChangeEvent): Promise<void> {
    try {
      logger.debug('Processing change event for cache invalidation', { 
        type: changeEvent.type,
        action: changeEvent.action,
        repository: changeEvent.repository,
        path: changeEvent.path,
      });

      switch (changeEvent.action) {
        case 'created':
        case 'updated':
        case 'deleted':
          // Invalidate repository-level cache
          await this.invalidateRepository(changeEvent.repository);
          
          // Invalidate specific file cache if path is provided
          if (changeEvent.path) {
            const fileKey = `github:${changeEvent.repository}:file:${changeEvent.path}`;
            await this.delete(fileKey);
          }
          break;

        case 'renamed':
          // For renames, invalidate the entire repository cache
          await this.invalidateRepository(changeEvent.repository);
          break;
      }

    } catch (error) {
      logger.error('Failed to process change event for cache invalidation', { error, changeEvent });
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      logger.info('Clearing all cache entries');

      // Clear memory cache
      this.memoryCache.flushAll();

      // Clear Redis cache
      if (this.redisClient && !this.isCircuitBreakerOpen()) {
        try {
          const pattern = this.generateRedisCacheKey('*');
          const keys = await this.redisClient.keys(pattern);
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
          }
        } catch (error) {
          this.handleRedisError(error);
        }
      }

      this.resetStats();

    } catch (error) {
      logger.error('Failed to clear cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    // Update memory cache stats
    this.stats.memoryCache.keys = this.memoryCache.keys().length;
    this.stats.memoryCache.size = this.memoryCache.keys().length;
    
    // Calculate hit rates
    const totalMemoryOps = this.stats.memoryCache.hits + this.stats.memoryCache.misses;
    this.stats.memoryCache.hitRate = totalMemoryOps > 0 
      ? this.stats.memoryCache.hits / totalMemoryOps 
      : 0;

    const totalRedisOps = this.stats.redisCache.hits + this.stats.redisCache.misses;
    this.stats.redisCache.hitRate = totalRedisOps > 0 
      ? this.stats.redisCache.hits / totalRedisOps 
      : 0;

    // Update circuit breaker stats
    this.stats.circuitBreaker.isOpen = this.circuitBreaker.isOpen;
    this.stats.circuitBreaker.failureCount = this.circuitBreaker.failureCount;
    this.stats.circuitBreaker.lastFailureTime = this.circuitBreaker.lastFailureTime;

    // Update performance stats
    if (this.operationTimes.length > 0) {
      const avgTime = this.operationTimes.reduce((a, b) => a + b, 0) / this.operationTimes.length;
      this.stats.performance.avgGetTime = avgTime;
      this.stats.performance.avgSetTime = avgTime;
    }

    return { ...this.stats };
  }

  /**
   * Cleanup cache manager resources
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up GitHub cache manager');

      // Clear memory cache
      this.memoryCache.flushAll();
      this.memoryCache.close();

      // Close Redis connection
      if (this.redisClient) {
        await this.redisClient.quit();
        this.redisClient = undefined;
      }

      logger.info('GitHub cache manager cleaned up');

    } catch (error) {
      logger.error('Error during cache manager cleanup', { error });
    }
  }

  // Private methods

  private initializeRedis(): void {
    try {
      this.redisClient = new Redis(this.options.redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true,
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis cache connected');
        this.stats.redisCache.connected = true;
        this.resetCircuitBreaker();
      });

      this.redisClient.on('error', (error) => {
        logger.error('Redis cache error', { error });
        this.stats.redisCache.connected = false;
        this.handleRedisError(error);
      });

      this.redisClient.on('close', () => {
        logger.warn('Redis cache connection closed');
        this.stats.redisCache.connected = false;
      });

    } catch (error) {
      logger.error('Failed to initialize Redis cache', { error });
    }
  }

  private async testRedisConnection(): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    try {
      await this.redisClient.ping();
    } catch (error) {
      throw new Error(`Redis connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performCacheWarmup(): Promise<void> {
    try {
      logger.info('Performing cache warmup');
      
      // Cache warmup would involve pre-loading frequently accessed data
      // This is a placeholder for actual warmup logic
      
      logger.info('Cache warmup completed');
    } catch (error) {
      logger.warn('Cache warmup failed', { error });
    }
  }

  private setupMemoryCacheEvents(): void {
    this.memoryCache.on('set', (key, value) => {
      logger.debug('Memory cache set', { key });
    });

    this.memoryCache.on('del', (key, value) => {
      logger.debug('Memory cache delete', { key });
    });

    this.memoryCache.on('expired', (key, value) => {
      logger.debug('Memory cache expired', { key });
    });
  }

  private async getFromRedis<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.redisClient) {
      return null;
    }

    const redisKey = this.generateRedisCacheKey(key);
    const data = await this.redisClient.get(redisKey);
    
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as CacheEntry<T>;
    } catch (error) {
      logger.warn('Failed to parse Redis cache data', { error, key });
      return null;
    }
  }

  private async setInRedis<T>(key: string, entry: CacheEntry<T>, ttlSeconds: number): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const redisKey = this.generateRedisCacheKey(key);
    const data = JSON.stringify(entry);
    
    await this.redisClient.setex(redisKey, ttlSeconds, data);
  }

  private async setInMemoryCache<T>(key: string, entry: CacheEntry<T>, ttlSeconds: number): Promise<void> {
    this.memoryCache.set(key, entry, ttlSeconds);
  }

  private async invalidateMemoryCacheByTags(tags: string[]): Promise<void> {
    const keys = this.memoryCache.keys();
    
    for (const key of keys) {
      const entry = this.memoryCache.get<CacheEntry>(key);
      if (entry && entry.tags.some(tag => tags.includes(tag))) {
        this.memoryCache.del(key);
      }
    }
  }

  private async invalidateRedisCacheByTags(tags: string[]): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    // This would require storing tag-to-key mappings for efficient invalidation
    // For now, we'll use a pattern-based approach
    const pattern = this.generateRedisCacheKey('*');
    const keys = await this.redisClient.keys(pattern);
    
    for (const key of keys) {
      const data = await this.redisClient.get(key);
      if (data) {
        try {
          const entry = JSON.parse(data) as CacheEntry;
          if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
            await this.redisClient.del(key);
          }
        } catch (error) {
          // Skip invalid entries
        }
      }
    }
  }

  private generateMemoryCacheKey(key: string): string {
    return `mem:${key}`;
  }

  private generateRedisCacheKey(key: string): string {
    return `pp:github:${key}`;
  }

  private generateContentHash(value: any): string {
    // Simple hash for content change detection
    return Buffer.from(JSON.stringify(value)).toString('base64').slice(0, 16);
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.options.circuitBreakerEnabled) {
      return false;
    }

    if (this.circuitBreaker.isOpen) {
      // Check if we should try to close the circuit breaker
      if (this.circuitBreaker.lastFailureTime) {
        const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime.getTime();
        if (timeSinceLastFailure > this.circuitBreaker.resetTime) {
          this.circuitBreaker.isOpen = false;
          this.circuitBreaker.failureCount = 0;
          logger.info('Circuit breaker reset');
        }
      }
    }

    return this.circuitBreaker.isOpen;
  }

  private handleRedisError(error: any): void {
    this.stats.redisCache.errors++;
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.isOpen = true;
      logger.warn('Circuit breaker opened due to Redis failures', {
        failureCount: this.circuitBreaker.failureCount,
        threshold: this.circuitBreaker.failureThreshold,
      });
    }

    logger.warn('Redis operation failed', { error });
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = undefined;
  }

  private recordOperationTime(time: number): void {
    this.operationTimes.push(time);
    
    // Keep only last 1000 operation times for performance
    if (this.operationTimes.length > 1000) {
      this.operationTimes = this.operationTimes.slice(-1000);
    }
  }

  private resetStats(): void {
    this.stats = {
      memoryCache: { keys: 0, hits: 0, misses: 0, hitRate: 0, size: 0 },
      redisCache: { 
        connected: this.redisClient?.status === 'ready', 
        hits: 0, 
        misses: 0, 
        hitRate: 0, 
        errors: 0 
      },
      circuitBreaker: { 
        isOpen: this.circuitBreaker.isOpen, 
        failureCount: this.circuitBreaker.failureCount,
        lastFailureTime: this.circuitBreaker.lastFailureTime,
      },
      performance: { avgGetTime: 0, avgSetTime: 0, totalOperations: 0 },
    };
    
    this.operationTimes = [];
  }
}