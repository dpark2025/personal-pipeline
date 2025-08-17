/**
 * Confluence Cache Manager - Intelligent caching for enterprise performance
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * High-performance caching system optimized for Confluence data:
 * - Multi-tier caching (memory + Redis) with intelligent eviction
 * - Content-aware cache strategies for different data types
 * - Cache warming and preloading for critical content
 * - Performance monitoring and optimization
 * - Enterprise-scale cache management
 */

import NodeCache from 'node-cache';
import { Redis } from 'ioredis';
import { logger } from '../../utils/logger.js';

export interface CacheManagerOptions {
  /** Cache TTL in seconds */
  ttlSeconds?: number;
  /** Enable Redis backing */
  enableRedis?: boolean;
  /** Redis connection URL */
  redisUrl?: string;
  /** Memory cache size limit */
  memoryCacheSize?: number;
  /** Cache key prefix */
  keyPrefix?: string;
}

export interface CacheStats {
  memoryHits: number;
  memoryMisses: number;
  redisHits: number;
  redisMisses: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryKeys: number;
  redisKeys?: number;
  memorySize: number;
  lastReset: Date;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

/**
 * Enterprise-grade cache manager for Confluence adapter
 */
export class CacheManager {
  private memoryCache!: NodeCache;
  private redisClient?: Redis;
  private options: Required<CacheManagerOptions>;
  
  // Cache statistics
  private stats: CacheStats = {
    memoryHits: 0,
    memoryMisses: 0,
    redisHits: 0,
    redisMisses: 0,
    totalHits: 0,
    totalMisses: 0,
    hitRate: 0,
    memoryKeys: 0,
    memorySize: 0,
    lastReset: new Date(),
  };

  // Cache strategies for different content types
  private readonly cacheStrategies = {
    pages: { ttl: 3600, priority: 'high' }, // 1 hour
    search: { ttl: 1800, priority: 'medium' }, // 30 minutes
    spaces: { ttl: 7200, priority: 'high' }, // 2 hours
    metadata: { ttl: 900, priority: 'low' }, // 15 minutes
    user: { ttl: 1800, priority: 'medium' }, // 30 minutes
  };

  constructor(options: CacheManagerOptions = {}) {
    this.options = {
      ttlSeconds: options.ttlSeconds ?? 3600,
      enableRedis: options.enableRedis ?? true,
      redisUrl: options.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379',
      memoryCacheSize: options.memoryCacheSize ?? 1000,
      keyPrefix: options.keyPrefix ?? 'confluence:',
      ...options,
    };

    this.initializeMemoryCache();
    
    if (this.options.enableRedis) {
      this.initializeRedisCache();
    }
  }

  /**
   * Get value from cache (checks memory first, then Redis)
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);

    try {
      // Check memory cache first
      const memoryValue = this.memoryCache.get<T>(fullKey);
      if (memoryValue !== undefined) {
        this.stats.memoryHits++;
        this.stats.totalHits++;
        this.updateHitRate();
        
        logger.debug('Cache hit (memory)', { key: fullKey });
        return memoryValue;
      }

      this.stats.memoryMisses++;

      // Check Redis cache if available
      if (this.redisClient) {
        const redisValue = await this.getFromRedis<T>(fullKey);
        if (redisValue !== null) {
          this.stats.redisHits++;
          this.stats.totalHits++;
          
          // Store in memory cache for faster access
          this.memoryCache.set(fullKey, redisValue, this.getTtlForKey(key));
          
          this.updateHitRate();
          logger.debug('Cache hit (Redis)', { key: fullKey });
          return redisValue;
        }

        this.stats.redisMisses++;
      }

      this.stats.totalMisses++;
      this.updateHitRate();
      
      logger.debug('Cache miss', { key: fullKey });
      return null;

    } catch (error) {
      logger.error('Cache get operation failed', { key: fullKey, error });
      return null;
    }
  }

  /**
   * Set value in cache (stores in both memory and Redis)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const cacheTtl = ttl ?? this.getTtlForKey(key);

    try {
      // Store in memory cache
      this.memoryCache.set(fullKey, value, cacheTtl);

      // Store in Redis if available
      if (this.redisClient) {
        await this.setInRedis(fullKey, value, cacheTtl);
      }

      this.updateCacheStats();
      
      logger.debug('Cache set', { key: fullKey, ttl: cacheTtl });

    } catch (error) {
      logger.error('Cache set operation failed', { key: fullKey, error });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);

    try {
      // Delete from memory cache
      this.memoryCache.del(fullKey);

      // Delete from Redis if available
      if (this.redisClient) {
        await this.redisClient.del(fullKey);
      }

      logger.debug('Cache delete', { key: fullKey });

    } catch (error) {
      logger.error('Cache delete operation failed', { key: fullKey, error });
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.flushAll();

      // Clear Redis keys with our prefix
      if (this.redisClient) {
        const pattern = `${this.options.keyPrefix}*`;
        const keys = await this.redisClient.keys(pattern);
        
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }

      this.resetStats();
      
      logger.info('Cache cleared');

    } catch (error) {
      logger.error('Cache clear operation failed', { error });
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(warmupData: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    logger.info('Starting cache warmup', { itemCount: warmupData.length });

    const promises = warmupData.map(async ({ key, value, ttl }) => {
      try {
        await this.set(key, value, ttl);
      } catch (error) {
        logger.warn('Failed to warm cache item', { key, error });
      }
    });

    await Promise.allSettled(promises);
    
    logger.info('Cache warmup completed');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateCacheStats();
    return { ...this.stats };
  }

  /**
   * Get cache health information
   */
  async getHealth(): Promise<{
    healthy: boolean;
    memoryCache: { healthy: boolean; keys: number; size: number };
    redisCache?: { healthy: boolean; connected: boolean; keys?: number };
  }> {
    const health = {
      healthy: true,
      memoryCache: {
        healthy: true,
        keys: this.memoryCache.keys().length,
        size: this.getMemoryCacheSize(),
      },
      redisCache: undefined as any,
    };

    if (this.redisClient) {
      try {
        await this.redisClient.ping();
        const redisKeys = await this.redisClient.keys(`${this.options.keyPrefix}*`);
        
        health.redisCache = {
          healthy: true,
          connected: true,
          keys: redisKeys.length,
        };
      } catch (error) {
        health.healthy = false;
        health.redisCache = {
          healthy: false,
          connected: false,
        };
      }
    }

    return health;
  }

  /**
   * Cleanup and close connections
   */
  async cleanup(): Promise<void> {
    try {
      this.memoryCache.flushAll();
      this.memoryCache.close();

      if (this.redisClient) {
        await this.redisClient.quit();
      }

      logger.info('Cache manager cleaned up');
    } catch (error) {
      logger.error('Cache cleanup failed', { error });
    }
  }

  // Private methods

  private initializeMemoryCache(): void {
    this.memoryCache = new NodeCache({
      stdTTL: this.options.ttlSeconds,
      maxKeys: this.options.memoryCacheSize,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false, // For better performance
    });

    // Set up event handlers
    this.memoryCache.on('expired', (key, value) => {
      logger.debug('Memory cache key expired', { key });
    });

    this.memoryCache.on('del', (key, value) => {
      logger.debug('Memory cache key deleted', { key });
    });

    logger.info('Memory cache initialized', {
      ttl: this.options.ttlSeconds,
      maxKeys: this.options.memoryCacheSize,
    });
  }

  private initializeRedisCache(): void {
    try {
      this.redisClient = new Redis(this.options.redisUrl, {
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis cache connected');
      });

      this.redisClient.on('error', (error) => {
        logger.error('Redis cache error', { error });
      });

      this.redisClient.on('close', () => {
        logger.warn('Redis cache connection closed');
      });

    } catch (error) {
      logger.error('Failed to initialize Redis cache', { error });
    }
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redisClient) {
      return null;
    }

    try {
      const value = await this.redisClient.get(key);
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn('Failed to get value from Redis', { key, error });
      return null;
    }
  }

  private async setInRedis<T>(key: string, value: T, ttl: number): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redisClient.setex(key, ttl, serialized);
    } catch (error) {
      logger.warn('Failed to set value in Redis', { key, error });
    }
  }

  private buildKey(key: string): string {
    return `${this.options.keyPrefix}${key}`;
  }

  private getTtlForKey(key: string): number {
    // Determine TTL based on key pattern
    if (key.includes('page:')) {
      return this.cacheStrategies.pages.ttl;
    } else if (key.includes('search:')) {
      return this.cacheStrategies.search.ttl;
    } else if (key.includes('space:')) {
      return this.cacheStrategies.spaces.ttl;
    } else if (key.includes('metadata:')) {
      return this.cacheStrategies.metadata.ttl;
    } else if (key.includes('user:')) {
      return this.cacheStrategies.user.ttl;
    }

    return this.options.ttlSeconds;
  }

  private updateCacheStats(): void {
    this.stats.memoryKeys = this.memoryCache.keys().length;
    this.stats.memorySize = this.getMemoryCacheSize();
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  private getMemoryCacheSize(): number {
    // Estimate memory usage (rough calculation)
    const keys = this.memoryCache.keys();
    let totalSize = 0;

    for (const key of keys) {
      const value = this.memoryCache.get(key);
      if (value !== undefined) {
        totalSize += this.estimateObjectSize(value);
      }
    }

    return totalSize;
  }

  private estimateObjectSize(obj: any): number {
    // Rough estimation of object size in bytes
    let size = 0;

    if (typeof obj === 'string') {
      size = obj.length * 2; // Rough estimate for UTF-16
    } else if (typeof obj === 'number') {
      size = 8; // 64-bit number
    } else if (typeof obj === 'boolean') {
      size = 4; // Boolean
    } else if (typeof obj === 'object' && obj !== null) {
      try {
        size = JSON.stringify(obj).length * 2;
      } catch {
        size = 1000; // Fallback estimate
      }
    }

    return size;
  }

  private resetStats(): void {
    this.stats = {
      memoryHits: 0,
      memoryMisses: 0,
      redisHits: 0,
      redisMisses: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      memoryKeys: 0,
      memorySize: 0,
      lastReset: new Date(),
    };
  }
}