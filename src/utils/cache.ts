/**
 * Comprehensive caching service for Personal Pipeline MCP Server
 *
 * Implements a hybrid caching strategy with both in-memory and Redis persistence.
 * Features cache-aside pattern, performance metrics, and graceful fallbacks.
 */

import NodeCache from 'node-cache';
import { logger } from './logger.js';
import { CacheConfig, CacheStats, CacheHealthCheck } from '../types/index.js';
import { CircuitBreakerFactory } from './circuit-breaker.js';
import { RedisConnectionManager } from './redis-connection-manager.js';

export type CacheContentType = 'runbooks' | 'procedures' | 'decision_trees' | 'knowledge_base' | 'web_response';

export interface CacheKey {
  type: CacheContentType;
  identifier: string;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  content_type: CacheContentType;
}

/**
 * Cache service implementing hybrid memory + Redis strategy
 */
export class CacheService {
  private memoryCache: NodeCache;
  private redisManager: RedisConnectionManager | null = null;
  private config: CacheConfig;
  private stats: CacheStats;
  private enabled: boolean;
  private redisCircuitBreaker: any;

  constructor(config: CacheConfig) {
    this.config = config;
    this.enabled = config.enabled;
    this.stats = this.initializeStats();

    // Initialize memory cache
    this.memoryCache = new NodeCache({
      stdTTL: config.memory.ttl_seconds,
      checkperiod: config.memory.check_period_seconds,
      maxKeys: config.memory.max_keys,
      useClones: false, // For performance
    });

    // Setup memory cache event listeners
    this.memoryCache.on('set', (key: string) => {
      logger.debug('Memory cache SET', { key });
    });

    this.memoryCache.on('del', (key: string) => {
      logger.debug('Memory cache DEL', { key });
    });

    this.memoryCache.on('expired', (key: string) => {
      logger.debug('Memory cache EXPIRED', { key });
    });

    // Initialize Redis if enabled
    if (this.enabled && config.redis.enabled && config.strategy !== 'memory_only') {
      this.initializeRedis();
      // Initialize circuit breaker for Redis operations
      this.redisCircuitBreaker = CircuitBreakerFactory.forCache('redis');
    }

    logger.info('Cache service initialized', {
      strategy: config.strategy,
      memory_enabled: true,
      redis_enabled: config.redis.enabled,
      memory_max_keys: config.memory.max_keys,
    });
  }

  /**
   * Get cached value with fallback chain: memory -> Redis -> null
   */
  async get<T = any>(key: CacheKey): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    const cacheKey = this.buildCacheKey(key);
    const startTime = Date.now();

    try {
      // Try memory cache first
      const memoryResult = this.memoryCache.get<CacheEntry<T>>(cacheKey);
      if (memoryResult) {
        this.recordHit(key.type);
        logger.debug('Cache HIT (memory)', {
          key: cacheKey,
          type: key.type,
          responseTime: Date.now() - startTime,
        });
        return memoryResult.data;
      }

      // Fallback to Redis if available
      if (this.redisManager && this.config.strategy !== 'memory_only') {
        try {
          const redisResult = await this.redisCircuitBreaker.execute(() =>
            this.getFromRedis<T>(cacheKey)
          );
          if (redisResult) {
            // Populate memory cache for faster future access
            this.memoryCache.set(cacheKey, redisResult, this.getTTL(key.type));
            this.recordHit(key.type);
            logger.debug('Cache HIT (redis)', {
              key: cacheKey,
              type: key.type,
              responseTime: Date.now() - startTime,
            });
            return redisResult.data;
          }
        } catch (error) {
          logger.debug('Redis cache access failed, using memory cache only', {
            key: cacheKey,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Cache miss
      this.recordMiss(key.type);
      logger.debug('Cache MISS', {
        key: cacheKey,
        type: key.type,
        responseTime: Date.now() - startTime,
      });
      return null;
    } catch (error) {
      logger.error('Cache GET error', {
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
      this.recordMiss(key.type);
      return null;
    }
  }

  /**
   * Set value in cache with appropriate TTL
   */
  async set<T = any>(key: CacheKey, value: T): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const cacheKey = this.buildCacheKey(key);
    const ttl = this.getTTL(key.type);
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      content_type: key.type,
    };

    try {
      // Always set in memory cache
      this.memoryCache.set(cacheKey, entry, ttl);

      // Set in Redis if available and strategy allows
      if (this.redisManager && this.config.strategy !== 'memory_only') {
        try {
          await this.redisCircuitBreaker.execute(() => this.setInRedis(cacheKey, entry, ttl));
        } catch (error) {
          logger.debug('Redis cache write failed, data stored in memory cache only', {
            key: cacheKey,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.debug('Cache SET', {
        key: cacheKey,
        type: key.type,
        ttl,
      });
    } catch (error) {
      logger.error('Cache SET error', {
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: CacheKey): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const cacheKey = this.buildCacheKey(key);

    try {
      // Delete from memory cache
      this.memoryCache.del(cacheKey);

      // Delete from Redis if available
      if (this.redisManager && this.config.strategy !== 'memory_only') {
        await this.redisManager.executeOperation(redis => redis.del(this.buildRedisKey(cacheKey)));
      }

      logger.debug('Cache DELETE', { key: cacheKey, type: key.type });
    } catch (error) {
      logger.error('Cache DELETE error', {
        key: cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clear all cache entries for a specific content type
   */
  async clearByType(contentType: CacheContentType): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Clear from memory cache
      const memoryKeys = this.memoryCache.keys();
      const typePrefix = `${contentType}:`;
      const keysToDelete = memoryKeys.filter(key => key.includes(typePrefix));
      this.memoryCache.del(keysToDelete);

      // Clear from Redis if available
      if (this.redisManager && this.config.strategy !== 'memory_only') {
        await this.redisManager.executeOperation(async redis => {
          const redisPattern = `${this.config.redis.key_prefix}${typePrefix}*`;
          const redisKeys = await redis.keys(redisPattern);
          if (redisKeys.length > 0) {
            await redis.del(...redisKeys);
          }
        });
      }

      logger.info('Cache cleared by type', {
        contentType,
        memoryKeysDeleted: keysToDelete.length,
      });
    } catch (error) {
      logger.error('Cache clear by type error', {
        contentType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Clear memory cache
      this.memoryCache.flushAll();

      // Clear Redis if available
      if (this.redisManager && this.config.strategy !== 'memory_only') {
        await this.redisManager.executeOperation(async redis => {
          const pattern = `${this.config.redis.key_prefix}*`;
          const keys = await redis.keys(pattern);
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        });
      }

      // Reset statistics
      this.stats = this.initializeStats();

      logger.info('Cache cleared completely');
    } catch (error) {
      logger.error('Cache clear all error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.stats.hit_rate =
      this.stats.total_operations > 0 ? this.stats.hits / this.stats.total_operations : 0;

    // Get memory usage if available
    const keys = this.memoryCache.keys();
    this.stats.memory_usage_bytes = keys.length * 1024; // Rough estimate

    // Check Redis connection status
    this.stats.redis_connected = this.redisManager?.isAvailable() || false;

    return { ...this.stats };
  }

  /**
   * Validate cache health
   */
  async healthCheck(): Promise<CacheHealthCheck> {
    const memoryStartTime = Date.now();

    // Test memory cache
    const testKey = 'health_check_test';
    const testValue = { test: true, timestamp: Date.now() };

    this.memoryCache.set(testKey, testValue, 60);
    const memoryResult = this.memoryCache.get(testKey);
    this.memoryCache.del(testKey);

    const memoryResponseTime = Date.now() - memoryStartTime;
    const memoryStats = this.memoryCache.getStats();

    const result: CacheHealthCheck = {
      memory_cache: {
        healthy: memoryResult !== undefined,
        keys_count: memoryStats.keys,
        memory_usage_mb: Math.round(((memoryStats.ksize || 0) / 1024 / 1024) * 100) / 100,
        response_time_ms: memoryResponseTime,
      },
      overall_healthy: memoryResult !== undefined,
    };

    // Test Redis if available
    if (this.redisManager && this.config.strategy !== 'memory_only') {
      const redisStartTime = Date.now();
      try {
        const pingResult = await this.redisManager.executeOperation(redis => redis.ping());
        const redisResponseTime = Date.now() - redisStartTime;

        if (pingResult === 'PONG') {
          result.redis_cache = {
            healthy: true,
            connected: this.redisManager.isAvailable(),
            response_time_ms: redisResponseTime,
          };

          result.overall_healthy = result.overall_healthy && result.redis_cache.healthy;
        } else {
          throw new Error('Redis ping failed');
        }
      } catch (error) {
        const stats = this.redisManager.getStats();
        result.redis_cache = {
          healthy: false,
          connected: false,
          response_time_ms: Date.now() - redisStartTime,
          error_message: error instanceof Error ? error.message : `Redis ${stats.state}`,
        };

        // Don't fail overall health if Redis is down but memory cache works
        if (this.config.strategy === 'redis_only') {
          result.overall_healthy = false;
        }
      }
    }

    return result;
  }

  /**
   * Warm cache with critical runbooks
   */
  async warmCache(criticalData: Array<{ key: CacheKey; data: any }>): Promise<void> {
    if (!this.enabled) {
      return;
    }

    logger.info('Starting cache warming', { itemCount: criticalData.length });

    const promises = criticalData.map(async ({ key, data }) => {
      try {
        await this.set(key, data);
      } catch (error) {
        logger.error('Cache warming error for key', {
          key: this.buildCacheKey(key),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.allSettled(promises);
    logger.info('Cache warming completed', { itemCount: criticalData.length });
  }

  /**
   * Shutdown cache service gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down cache service');

    try {
      // Close memory cache
      this.memoryCache.close();

      // Close Redis connection
      if (this.redisManager) {
        await this.redisManager.disconnect();
        this.redisManager = null;
      }

      logger.info('Cache service shutdown completed');
    } catch (error) {
      logger.error('Cache service shutdown error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Private methods

  private initializeRedis(): void {
    try {
      this.redisManager = new RedisConnectionManager(this.config.redis);

      // Set up event listeners for Redis connection events
      this.redisManager.on('connected', () => {
        logger.info('Redis cache connected successfully');
      });

      this.redisManager.on('connectionFailed', (error: Error) => {
        // Only log Redis connection failures if not in test mode with error-level logging
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.LOG_LEVEL === 'error';
        if (!isTestEnv) {
          logger.debug('Redis connection attempt failed', {
            error: error.message,
          });
        }
      });

      this.redisManager.on('circuitOpened', () => {
        logger.warn('Redis connection circuit breaker opened - too many failures');
      });

      this.redisManager.on('stateChanged', ({ oldState, newState }) => {
        logger.debug('Redis connection state changed', {
          oldState,
          newState,
        });
      });

      // Attempt initial connection
      this.redisManager.connect().catch(error => {
        logger.debug('Initial Redis connection failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    } catch (error) {
      logger.error('Redis initialization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.redisManager = null;
    }
  }

  private async getFromRedis<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.redisManager) {
      return null;
    }

    const redisKey = this.buildRedisKey(key);
    const result = await this.redisManager.executeOperation(async redis => {
      const data = await redis.get(redisKey);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as CacheEntry<T>;
    });

    return result;
  }

  private async setInRedis<T>(key: string, entry: CacheEntry<T>, ttl: number): Promise<void> {
    if (!this.redisManager) {
      return;
    }

    const redisKey = this.buildRedisKey(key);
    await this.redisManager.executeOperation(async redis => {
      const serialized = JSON.stringify(entry);
      await redis.setex(redisKey, ttl, serialized);
    });
  }

  private buildCacheKey(key: CacheKey): string {
    return `${key.type}:${key.identifier}`;
  }

  private buildRedisKey(cacheKey: string): string {
    return `${this.config.redis.key_prefix}${cacheKey}`;
  }

  private getTTL(contentType: CacheContentType): number {
    return this.config.content_types[contentType]?.ttl_seconds || this.config.memory.ttl_seconds;
  }

  private recordHit(contentType: CacheContentType): void {
    this.stats.hits++;
    this.stats.total_operations++;

    if (!this.stats.by_content_type) {
      this.stats.by_content_type = {};
    }

    if (!this.stats.by_content_type[contentType]) {
      this.stats.by_content_type[contentType] = { hits: 0, misses: 0, hit_rate: 0 };
    }

    this.stats.by_content_type[contentType].hits++;
    const typeStats = this.stats.by_content_type[contentType];
    const typeTotal = typeStats.hits + typeStats.misses;
    typeStats.hit_rate = typeTotal > 0 ? typeStats.hits / typeTotal : 0;
  }

  private recordMiss(contentType: CacheContentType): void {
    this.stats.misses++;
    this.stats.total_operations++;

    if (!this.stats.by_content_type) {
      this.stats.by_content_type = {};
    }

    if (!this.stats.by_content_type[contentType]) {
      this.stats.by_content_type[contentType] = { hits: 0, misses: 0, hit_rate: 0 };
    }

    this.stats.by_content_type[contentType].misses++;
    const typeStats = this.stats.by_content_type[contentType];
    const typeTotal = typeStats.hits + typeStats.misses;
    typeStats.hit_rate = typeTotal > 0 ? typeStats.hits / typeTotal : 0;
  }

  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      hit_rate: 0,
      total_operations: 0,
      last_reset: new Date().toISOString(),
      by_content_type: {},
    };
  }

  /**
   * Get cache strategy for debugging purposes
   */
  getStrategy(): string {
    return this.config.strategy;
  }
}

// Cache service singleton
let cacheServiceInstance: CacheService | null = null;

/**
 * Initialize cache service with configuration
 */
export function initializeCacheService(config: CacheConfig): CacheService {
  if (cacheServiceInstance) {
    logger.warn('Cache service already initialized, returning existing instance');
    return cacheServiceInstance;
  }

  cacheServiceInstance = new CacheService(config);
  return cacheServiceInstance;
}

/**
 * Get the cache service instance
 */
export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    throw new Error('Cache service not initialized. Call initializeCacheService() first.');
  }
  return cacheServiceInstance;
}

/**
 * Create cache key helper
 */
export function createCacheKey(type: CacheContentType, identifier: string): CacheKey {
  return { type, identifier };
}
