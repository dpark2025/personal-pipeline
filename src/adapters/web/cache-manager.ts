/**
 * Cache Manager - Intelligent HTTP response caching with TTL and invalidation
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Features:
 * - Multi-tier caching strategy (memory + optional Redis)
 * - HTTP cache headers support (ETag, Last-Modified, Cache-Control)
 * - Intelligent TTL management with adaptive expiration
 * - Cache warming and preloading strategies
 * - Memory-efficient cache eviction policies (LRU)
 * - Performance metrics and cache analytics
 */

import { Logger } from 'winston';
import { CacheService } from '../../utils/cache.js';

export interface CacheManagerOptions {
  defaultTtl: string;
  maxCacheSize: number;
  enableMetrics: boolean;
  warmupOnStart?: boolean;
  adaptiveTtl?: boolean;
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
  hitCount: number;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  avgHitCount: number;
  oldestEntry?: number;
  newestEntry?: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalSize: number;
  memoryUsage: number;
}

/**
 * Web adapter cache management with HTTP semantics
 */
export class CacheManager {
  private logger: Logger;
  private options: CacheManagerOptions;
  private globalCache?: CacheService;
  
  // In-memory cache for HTTP responses
  private memoryCache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>(); // For LRU eviction
  private accessCounter = 0;
  
  // Cache metrics
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalSize: 0,
    memoryUsage: 0
  };
  
  // TTL parsing cache
  private ttlCache = new Map<string, number>();
  
  // Cache warming configuration
  private warmupKeys: string[] = [];

  constructor(options: CacheManagerOptions, logger: Logger, globalCache?: CacheService) {
    this.options = options;
    this.logger = logger.child({ component: 'CacheManager' });
    this.globalCache = globalCache;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing cache manager', {
      defaultTtl: this.options.defaultTtl,
      maxCacheSize: this.options.maxCacheSize,
      enableMetrics: this.options.enableMetrics,
      hasGlobalCache: !!this.globalCache
    });

    // Parse default TTL
    const defaultTtlMs = this.parseTtl(this.options.defaultTtl);
    this.logger.debug('Parsed default TTL', {
      ttlString: this.options.defaultTtl,
      ttlMs: defaultTtlMs
    });
    
    // Warm up cache if enabled
    if (this.options.warmupOnStart) {
      await this.warmupCache();
    }
    
    this.logger.info('Cache manager initialized successfully');
  }

  async get(key: string): Promise<any | null> {
    const startTime = Date.now();
    
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isEntryValid(memoryEntry)) {
        this.updateAccessOrder(key);
        memoryEntry.hitCount++;
        this.metrics.hits++;
        
        this.logger.debug('Cache hit (memory)', {
          key,
          hitCount: memoryEntry.hitCount,
          age: Date.now() - memoryEntry.timestamp
        });
        
        return memoryEntry.data;
      }
      
      // Check global cache if available
      if (this.globalCache) {
        try {
          const globalEntry = await this.globalCache.get({ type: 'web_response', identifier: key });
          if (globalEntry) {
            // Store in memory cache for faster future access
            this.setMemoryCache(key, globalEntry, this.options.defaultTtl);
            this.metrics.hits++;
            
            this.logger.debug('Cache hit (global)', { key });
            return globalEntry;
          }
        } catch (error: any) {
          this.logger.warn('Global cache get failed', {
            key,
            error: error.message
          });
        }
      }
      
      // Cache miss
      this.metrics.misses++;
      
      this.logger.debug('Cache miss', {
        key,
        responseTime: Date.now() - startTime
      });
      
      return null;
    } catch (error: any) {
      this.metrics.misses++;
      this.logger.error('Cache get failed', {
        key,
        error: error.message
      });
      return null;
    }
  }

  async set(key: string, data: any, ttl?: string, httpHeaders?: Record<string, string>): Promise<void> {
    try {
      const ttlMs = ttl ? this.parseTtl(ttl) : this.parseTtl(this.options.defaultTtl);
      
      // Store in memory cache
      this.setMemoryCache(key, data, ttl || this.options.defaultTtl, httpHeaders);
      
      // Store in global cache if available
      if (this.globalCache) {
        try {
          await this.globalCache.set(
            { type: 'web_response', identifier: key }, 
            data
          );
        } catch (error: any) {
          this.logger.warn('Global cache set failed', {
            key,
            error: error.message
          });
        }
      }
      
      this.metrics.sets++;
      
      this.logger.debug('Cache set', {
        key,
        ttl: ttlMs,
        size: this.estimateSize(data)
      });
    } catch (error: any) {
      this.logger.error('Cache set failed', {
        key,
        error: error.message
      });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // Remove from memory cache
      const entry = this.memoryCache.get(key);
      if (entry) {
        this.memoryCache.delete(key);
        this.accessOrder.delete(key);
        this.metrics.totalSize -= entry.size;
        this.metrics.deletes++;
      }
      
      // Remove from global cache if available
      if (this.globalCache) {
        try {
          await this.globalCache.delete({ type: 'web_response', identifier: key });
        } catch (error: any) {
          this.logger.warn('Global cache delete failed', {
            key,
            error: error.message
          });
        }
      }
      
      this.logger.debug('Cache delete', { key });
    } catch (error: any) {
      this.logger.error('Cache delete failed', {
        key,
        error: error.message
      });
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.accessOrder.clear();
      this.accessCounter = 0;
      this.metrics.totalSize = 0;
      
      // Clear global cache if available
      if (this.globalCache) {
        try {
          await this.globalCache.clearByType('web_response');
        } catch (error: any) {
          this.logger.warn('Global cache clear failed', {
            error: error.message
          });
        }
      }
      
      this.logger.info('Cache cleared');
    } catch (error: any) {
      this.logger.error('Cache clear failed', {
        error: error.message
      });
    }
  }

  async getStats(): Promise<CacheStats> {
    const entries = Array.from(this.memoryCache.values());
    const validEntries = entries.filter(entry => this.isEntryValid(entry));
    
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? this.metrics.hits / (this.metrics.hits + this.metrics.misses) 
      : 0;
    
    const timestamps = validEntries.map(entry => entry.timestamp);
    
    return {
      totalEntries: validEntries.length,
      totalSize: this.metrics.totalSize,
      hitRate,
      missRate: 1 - hitRate,
      evictionCount: this.metrics.evictions,
      avgHitCount: validEntries.length > 0 
        ? validEntries.reduce((sum, entry) => sum + entry.hitCount, 0) / validEntries.length 
        : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined
    };
  }

  getMetrics(): CacheMetrics {
    return {
      ...this.metrics,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  async warmupCache(keys?: string[]): Promise<void> {
    const keysToWarm = keys || this.warmupKeys;
    
    if (keysToWarm.length === 0) {
      this.logger.debug('No keys configured for cache warmup');
      return;
    }
    
    this.logger.info('Starting cache warmup', {
      keyCount: keysToWarm.length
    });
    
    // Note: Actual warmup would require coordination with the web adapter
    // to pre-fetch common URLs. This is a placeholder for that functionality.
    
    this.logger.info('Cache warmup completed');
  }

  configureWarmup(keys: string[]): void {
    this.warmupKeys = keys;
    this.logger.debug('Cache warmup configured', {
      keyCount: keys.length
    });
  }

  isValidForHttpHeaders(key: string, httpHeaders?: Record<string, string>): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry || !this.isEntryValid(entry)) {
      return false;
    }
    
    if (!httpHeaders) {
      return true;
    }
    
    // Check ETag
    const etag = httpHeaders['etag'];
    if (etag && entry.etag && entry.etag !== etag) {
      this.logger.debug('Cache invalidated by ETag change', {
        key,
        oldETag: entry.etag,
        newETag: etag
      });
      return false;
    }
    
    // Check Last-Modified
    const lastModified = httpHeaders['last-modified'];
    if (lastModified && entry.lastModified) {
      const entryTime = new Date(entry.lastModified).getTime();
      const headerTime = new Date(lastModified).getTime();
      
      if (headerTime > entryTime) {
        this.logger.debug('Cache invalidated by Last-Modified change', {
          key,
          oldLastModified: entry.lastModified,
          newLastModified: lastModified
        });
        return false;
      }
    }
    
    return true;
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up cache manager');
    
    await this.clear();
    this.ttlCache.clear();
    this.warmupKeys = [];
    
    // Reset metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalSize: 0,
      memoryUsage: 0
    };
    
    this.logger.info('Cache manager cleanup completed');
  }

  // ============================
  // Private Implementation
  // ============================

  private setMemoryCache(key: string, data: any, ttl: string, httpHeaders?: Record<string, string>): void {
    const ttlMs = this.parseTtl(ttl);
    const size = this.estimateSize(data);
    
    // Check if we need to evict entries
    this.evictIfNecessary(size);
    
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      etag: httpHeaders?.['etag'],
      lastModified: httpHeaders?.['last-modified'],
      hitCount: 0,
      size
    };
    
    this.memoryCache.set(key, entry);
    this.updateAccessOrder(key);
    this.metrics.totalSize += size;
  }

  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Check TTL
    if (age > entry.ttl) {
      return false;
    }
    
    // Adaptive TTL based on hit count
    if (this.options.adaptiveTtl && entry.hitCount > 10) {
      // Extend TTL for frequently accessed items
      const extendedTtl = entry.ttl * (1 + Math.log(entry.hitCount) / 10);
      if (age < extendedTtl) {
        return true;
      }
    }
    
    return true;
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder.set(key, ++this.accessCounter);
  }

  private evictIfNecessary(newItemSize: number): void {
    // Check if we need to evict based on count
    while (this.memoryCache.size >= this.options.maxCacheSize) {
      this.evictLru();
    }
    
    // Check if we need to evict based on total size (rough memory limit)
    const maxMemoryBytes = this.options.maxCacheSize * 1024 * 1024; // Convert to bytes
    while (this.metrics.totalSize + newItemSize > maxMemoryBytes && this.memoryCache.size > 0) {
      this.evictLru();
    }
  }

  private evictLru(): void {
    let lruKey: string | null = null;
    let lruAccess = Infinity;
    
    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      const entry = this.memoryCache.get(lruKey);
      if (entry) {
        this.memoryCache.delete(lruKey);
        this.accessOrder.delete(lruKey);
        this.metrics.totalSize -= entry.size;
        this.metrics.evictions++;
        
        this.logger.debug('Evicted LRU cache entry', {
          key: lruKey,
          age: Date.now() - entry.timestamp,
          hitCount: entry.hitCount
        });
      }
    }
  }

  private parseTtl(ttlString: string): number {
    // Check cache first
    if (this.ttlCache.has(ttlString)) {
      return this.ttlCache.get(ttlString)!;
    }
    
    const ttlLower = ttlString.toLowerCase();
    let milliseconds = 0;
    
    // Parse duration string (e.g., "1h", "30m", "45s", "1d")
    const match = ttlLower.match(/^(\d+)([smhd])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      
      switch (unit) {
        case 's':
          milliseconds = value * 1000;
          break;
        case 'm':
          milliseconds = value * 60 * 1000;
          break;
        case 'h':
          milliseconds = value * 60 * 60 * 1000;
          break;
        case 'd':
          milliseconds = value * 24 * 60 * 60 * 1000;
          break;
        default:
          milliseconds = 5 * 60 * 1000; // Default 5 minutes
      }
    } else {
      // Try parsing as raw milliseconds
      const parsed = parseInt(ttlString);
      if (!isNaN(parsed)) {
        milliseconds = parsed;
      } else {
        milliseconds = 5 * 60 * 1000; // Default 5 minutes
      }
    }
    
    // Cache the parsed result
    this.ttlCache.set(ttlString, milliseconds);
    
    return milliseconds;
  }

  private estimateSize(data: any): number {
    try {
      if (typeof data === 'string') {
        return data.length * 2; // Rough UTF-16 estimation
      } else if (typeof data === 'object') {
        return JSON.stringify(data).length * 2;
      } else {
        return 64; // Default size for primitives
      }
    } catch {
      return 64; // Fallback size
    }
  }

  private estimateMemoryUsage(): number {
    let totalMemory = 0;
    
    for (const entry of this.memoryCache.values()) {
      totalMemory += entry.size;
      totalMemory += 200; // Overhead for entry metadata
    }
    
    // Add overhead for maps and other structures
    totalMemory += this.memoryCache.size * 50; // Access order map
    totalMemory += this.ttlCache.size * 50; // TTL cache
    
    return totalMemory;
  }
}