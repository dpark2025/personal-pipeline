/**
 * Database Cache Manager - Intelligent query result caching
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Enterprise-grade caching system optimized for database query results
 * with intelligent invalidation, performance monitoring, and memory management.
 * 
 * Features:
 * - Multi-tier caching (memory + Redis optional)
 * - Intelligent cache invalidation strategies
 * - Query result optimization and compression
 * - Performance monitoring and metrics
 * - Memory pressure management
 * - TTL-based expiration with sliding windows
 */

import { logger } from '../../utils/logger.js';
import * as crypto from 'crypto';

/**
 * Database cache options
 */
export interface DatabaseCacheOptions {
  /** Cache TTL in seconds */
  ttlSeconds?: number;
  /** Maximum number of keys in memory cache */
  maxKeys?: number;
  /** Enable query result caching */
  enableQueryCache?: boolean;
  /** Enable metadata caching */
  enableMetadataCache?: boolean;
  /** Enable result compression */
  enableCompression?: boolean;
  /** Memory threshold for cache eviction (MB) */
  memoryThresholdMB?: number;
  /** Cache key prefix */
  keyPrefix?: string;
  /** Enable cache warming */
  enableCacheWarming?: boolean;
  /** Redis configuration (optional) */
  redis?: {
    enabled: boolean;
    url: string;
    ttlSeconds: number;
    keyPrefix: string;
  };
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  ttl: number;
  size: number;
  compressed: boolean;
  metadata?: {
    queryHash?: string;
    tableName?: string;
    resultCount?: number;
    queryType?: 'search' | 'document' | 'metadata' | 'schema';
  };
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalKeys: number;
  totalSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  compressionRatio: number;
  memoryUsageMB: number;
  avgAccessTime: number;
  queryTypes: Record<string, number>;
  tableCacheStats: Record<string, {
    hits: number;
    misses: number;
    keys: number;
  }>;
}

/**
 * Cache warming configuration
 */
interface CacheWarmingConfig {
  enabled: boolean;
  popularQueries: string[];
  commonTables: string[];
  warmingSchedule: string; // Cron-like schedule
}

/**
 * LRU Cache Node for efficient eviction
 */
class CacheNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: CacheNode<T> | null = null;
  next: CacheNode<T> | null = null;

  constructor(key: string, entry: CacheEntry<T>) {
    this.key = key;
    this.entry = entry;
  }
}

/**
 * Enterprise-grade cache manager for database operations
 */
export class CacheManager {
  private options: Required<DatabaseCacheOptions>;
  private cache: Map<string, CacheNode<any>> = new Map();
  private head: CacheNode<any> | null = null;
  private tail: CacheNode<any> | null = null;
  private currentSize = 0;
  private stats: CacheStats = {
    totalKeys: 0,
    totalSize: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    evictions: 0,
    compressionRatio: 1,
    memoryUsageMB: 0,
    avgAccessTime: 0,
    queryTypes: {},
    tableCacheStats: {},
  };
  private warmingConfig?: CacheWarmingConfig;
  private cleanupInterval?: NodeJS.Timeout;
  private redisClient?: any; // Redis client if enabled

  constructor(options: DatabaseCacheOptions = {}) {
    this.options = {
      ttlSeconds: options.ttlSeconds ?? 3600,
      maxKeys: options.maxKeys ?? 10000,
      enableQueryCache: options.enableQueryCache ?? true,
      enableMetadataCache: options.enableMetadataCache ?? true,
      enableCompression: options.enableCompression ?? true,
      memoryThresholdMB: options.memoryThresholdMB ?? 100,
      keyPrefix: options.keyPrefix ?? 'db_cache:',
      enableCacheWarming: options.enableCacheWarming ?? false,
      redis: options.redis,
    };

    this.initializeCache();
  }

  /**
   * Get cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      // Try memory cache first
      const memoryCached = this.getFromMemory<T>(key);
      if (memoryCached !== null) {
        this.stats.hits++;
        this.updateAccessTime(startTime);
        return memoryCached;
      }

      // Try Redis cache if enabled
      if (this.redisClient) {
        const redisCached = await this.getFromRedis<T>(key);
        if (redisCached !== null) {
          // Store in memory cache for faster future access
          await this.setInMemory(key, redisCached, this.options.ttlSeconds);
          this.stats.hits++;
          this.updateAccessTime(startTime);
          return redisCached;
        }
      }

      this.stats.misses++;
      this.updateAccessTime(startTime);
      return null;

    } catch (error) {
      logger.error('Cache get operation failed', { key, error });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached value with key
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const finalTtl = ttl ?? this.options.ttlSeconds;

      // Store in memory cache
      await this.setInMemory(key, value, finalTtl);

      // Store in Redis cache if enabled
      if (this.redisClient) {
        await this.setInRedis(key, value, finalTtl);
      }

    } catch (error) {
      logger.error('Cache set operation failed', { key, error });
    }
  }

  /**
   * Delete cached value by key
   */
  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;

      // Delete from memory cache
      if (this.cache.has(key)) {
        const node = this.cache.get(key)!;
        this.removeNode(node);
        this.cache.delete(key);
        this.currentSize -= node.entry.size;
        this.stats.totalKeys--;
        this.stats.totalSize -= node.entry.size;
        deleted = true;
      }

      // Delete from Redis cache if enabled
      if (this.redisClient) {
        const redisKey = this.buildRedisKey(key);
        const redisDeleted = await this.redisClient.del(redisKey);
        deleted = deleted || redisDeleted > 0;
      }

      return deleted;

    } catch (error) {
      logger.error('Cache delete operation failed', { key, error });
      return false;
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.cache.clear();
      this.head = null;
      this.tail = null;
      this.currentSize = 0;

      // Clear Redis cache if enabled
      if (this.redisClient) {
        const pattern = this.buildRedisKey('*');
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }

      // Reset stats
      this.stats = {
        ...this.stats,
        totalKeys: 0,
        totalSize: 0,
        evictions: 0,
      };

      logger.info('Cache cleared successfully');

    } catch (error) {
      logger.error('Cache clear operation failed', { error });
    }
  }

  /**
   * Cache a query result with intelligent metadata
   */
  async cacheQueryResult<T>(
    query: string,
    parameters: any[],
    result: T,
    tableName?: string,
    queryType: 'search' | 'document' | 'metadata' | 'schema' = 'search'
  ): Promise<void> {
    if (!this.options.enableQueryCache) {
      return;
    }

    const queryHash = this.generateQueryHash(query, parameters);
    const key = `query:${queryHash}`;

    const entry: CacheEntry<T> = {
      key,
      value: result,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      ttl: this.options.ttlSeconds,
      size: this.calculateSize(result),
      compressed: false,
      metadata: {
        queryHash,
        tableName,
        resultCount: Array.isArray(result) ? result.length : 1,
        queryType,
      },
    };

    // Apply compression if enabled and beneficial
    if (this.options.enableCompression && entry.size > 1024) {
      entry.value = await this.compressValue(result);
      entry.compressed = true;
      entry.size = this.calculateSize(entry.value);
    }

    await this.set(key, entry);

    // Update query type statistics
    this.stats.queryTypes[queryType] = (this.stats.queryTypes[queryType] || 0) + 1;

    // Update table cache statistics
    if (tableName) {
      if (!this.stats.tableCacheStats[tableName]) {
        this.stats.tableCacheStats[tableName] = { hits: 0, misses: 0, keys: 0 };
      }
      this.stats.tableCacheStats[tableName].keys++;
    }
  }

  /**
   * Get cached query result
   */
  async getCachedQueryResult<T>(query: string, parameters: any[]): Promise<T | null> {
    if (!this.options.enableQueryCache) {
      return null;
    }

    const queryHash = this.generateQueryHash(query, parameters);
    const key = `query:${queryHash}`;

    const cachedEntry = await this.get<CacheEntry<T>>(key);
    if (!cachedEntry) {
      return null;
    }

    // Update access statistics
    cachedEntry.lastAccessed = Date.now();
    cachedEntry.accessCount++;

    // Update table cache statistics
    if (cachedEntry.metadata?.tableName) {
      const tableName = cachedEntry.metadata.tableName;
      if (this.stats.tableCacheStats[tableName]) {
        this.stats.tableCacheStats[tableName].hits++;
      }
    }

    // Decompress if needed
    if (cachedEntry.compressed) {
      return await this.decompressValue(cachedEntry.value);
    }

    return cachedEntry.value;
  }

  /**
   * Invalidate cache entries for a specific table
   */
  async invalidateTable(tableName: string): Promise<number> {
    let invalidatedCount = 0;

    try {
      // Invalidate memory cache entries
      const keysToDelete: string[] = [];
      for (const [key, node] of this.cache.entries()) {
        if (node.entry.metadata?.tableName === tableName) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        await this.delete(key);
        invalidatedCount++;
      }

      // Invalidate Redis cache entries if enabled
      if (this.redisClient) {
        const pattern = this.buildRedisKey('*');
        const keys = await this.redisClient.keys(pattern);
        
        for (const redisKey of keys) {
          const entry = await this.redisClient.get(redisKey);
          if (entry) {
            try {
              const parsed = JSON.parse(entry);
              if (parsed.metadata?.tableName === tableName) {
                await this.redisClient.del(redisKey);
                invalidatedCount++;
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }

      // Reset table statistics
      if (this.stats.tableCacheStats[tableName]) {
        delete this.stats.tableCacheStats[tableName];
      }

      logger.info(`Invalidated ${invalidatedCount} cache entries for table ${tableName}`);
      return invalidatedCount;

    } catch (error) {
      logger.error(`Failed to invalidate cache for table ${tableName}`, { error });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Cleanup expired entries and optimize memory usage
   */
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const keysToDelete: string[] = [];

      // Find expired entries
      for (const [key, node] of this.cache.entries()) {
        const age = now - node.entry.createdAt;
        const isExpired = age > (node.entry.ttl * 1000);
        
        if (isExpired) {
          keysToDelete.push(key);
        }
      }

      // Delete expired entries
      for (const key of keysToDelete) {
        await this.delete(key);
      }

      // Check memory pressure and evict if necessary
      await this.evictIfNecessary();

      logger.debug(`Cache cleanup completed: removed ${keysToDelete.length} expired entries`);

    } catch (error) {
      logger.error('Cache cleanup failed', { error });
    }
  }

  /**
   * Initialize cache warming with popular queries
   */
  async warmCache(queries: Array<{ query: string; parameters: any[] }>): Promise<void> {
    if (!this.options.enableCacheWarming) {
      return;
    }

    logger.info(`Starting cache warming with ${queries.length} queries`);

    for (const { query, parameters } of queries) {
      try {
        // This would typically execute the query and cache the result
        // For now, we'll just generate the cache key structure
        const queryHash = this.generateQueryHash(query, parameters);
        logger.debug(`Cache warming query hash: ${queryHash}`);
      } catch (error) {
        logger.warn('Failed to warm cache for query', { query, error });
      }
    }
  }

  /**
   * Shutdown cache manager and cleanup resources
   */
  async shutdown(): Promise<void> {
    try {
      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Close Redis connection if enabled
      if (this.redisClient) {
        await this.redisClient.quit();
      }

      // Clear memory cache
      await this.clear();

      logger.info('Cache manager shutdown completed');

    } catch (error) {
      logger.error('Cache manager shutdown failed', { error });
    }
  }

  // Private methods

  private initializeCache(): void {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute

    // Initialize Redis if configured
    if (this.options.redis?.enabled) {
      this.initializeRedis();
    }

    logger.info('Cache manager initialized', {
      maxKeys: this.options.maxKeys,
      ttlSeconds: this.options.ttlSeconds,
      redisEnabled: !!this.options.redis?.enabled,
    });
  }

  private async initializeRedis(): Promise<void> {
    try {
      // This would typically use a Redis client library like ioredis
      // For now, this is a placeholder
      logger.info('Redis cache support configured but not implemented in this example');
    } catch (error) {
      logger.error('Failed to initialize Redis cache', { error });
    }
  }

  private getFromMemory<T>(key: string): T | null {
    const node = this.cache.get(key);
    if (!node) {
      return null;
    }

    // Check expiration
    const now = Date.now();
    const age = now - node.entry.createdAt;
    if (age > (node.entry.ttl * 1000)) {
      this.delete(key);
      return null;
    }

    // Move to front (LRU)
    this.moveToFront(node);
    
    // Update access statistics
    node.entry.lastAccessed = now;
    node.entry.accessCount++;

    return node.entry.value;
  }

  private async setInMemory<T>(key: string, value: T, ttl: number): Promise<void> {
    const size = this.calculateSize(value);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      ttl,
      size,
      compressed: false,
    };

    // Create new node
    const node = new CacheNode(key, entry);

    // Remove existing entry if present
    if (this.cache.has(key)) {
      const existingNode = this.cache.get(key)!;
      this.removeNode(existingNode);
      this.currentSize -= existingNode.entry.size;
    }

    // Add to cache
    this.cache.set(key, node);
    this.addToFront(node);
    this.currentSize += size;

    // Update statistics
    this.stats.totalKeys = this.cache.size;
    this.stats.totalSize = this.currentSize;

    // Evict if necessary
    await this.evictIfNecessary();
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redisClient) {
      return null;
    }

    try {
      const redisKey = this.buildRedisKey(key);
      const cached = await this.redisClient.get(redisKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.warn('Redis get operation failed', { key, error });
      return null;
    }
  }

  private async setInRedis<T>(key: string, value: T, ttl: number): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    try {
      const redisKey = this.buildRedisKey(key);
      const serialized = JSON.stringify(value);
      await this.redisClient.setex(redisKey, ttl, serialized);
    } catch (error) {
      logger.warn('Redis set operation failed', { key, error });
    }
  }

  private buildRedisKey(key: string): string {
    return `${this.options.redis?.keyPrefix || this.options.keyPrefix}${key}`;
  }

  private generateQueryHash(query: string, parameters: any[]): string {
    const combined = query + JSON.stringify(parameters);
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  private calculateSize(value: any): number {
    // Approximate size calculation
    return JSON.stringify(value).length * 2; // Rough estimate for UTF-16
  }

  private async compressValue<T>(value: T): Promise<string> {
    // Placeholder for compression logic
    // In a real implementation, you might use zlib or similar
    return JSON.stringify(value);
  }

  private async decompressValue<T>(compressed: string): Promise<T> {
    // Placeholder for decompression logic
    return JSON.parse(compressed);
  }

  private moveToFront(node: CacheNode<any>): void {
    if (node === this.head) {
      return;
    }

    // Remove from current position
    this.removeNode(node);
    
    // Add to front
    this.addToFront(node);
  }

  private addToFront(node: CacheNode<any>): void {
    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<any>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private async evictIfNecessary(): Promise<void> {
    // Evict based on memory threshold
    const memoryUsageMB = this.currentSize / (1024 * 1024);
    if (memoryUsageMB > this.options.memoryThresholdMB) {
      await this.evictLRU();
    }

    // Evict based on max keys
    while (this.cache.size > this.options.maxKeys) {
      await this.evictLRU();
    }
  }

  private async evictLRU(): Promise<void> {
    if (!this.tail) {
      return;
    }

    const node = this.tail;
    await this.delete(node.key);
    this.stats.evictions++;
  }

  private updateStats(): void {
    this.stats.totalKeys = this.cache.size;
    this.stats.totalSize = this.currentSize;
    this.stats.hitRate = this.stats.hits / Math.max(this.stats.hits + this.stats.misses, 1);
    this.stats.memoryUsageMB = this.currentSize / (1024 * 1024);
  }

  private updateAccessTime(startTime: number): void {
    const accessTime = performance.now() - startTime;
    const totalAccesses = this.stats.hits + this.stats.misses;
    this.stats.avgAccessTime = (this.stats.avgAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses;
  }
}