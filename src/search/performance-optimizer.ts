/**
 * Search Performance Optimizer - Intelligent caching and query optimization
 * 
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 * 
 * Advanced performance optimization system with multi-level caching,
 * query preprocessing, and intelligent cache warming for sub-200ms response times.
 */

import { SearchResult, SearchFilters } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';

interface CacheEntry {
  key: string;
  query: string;
  filters?: SearchFilters;
  results: SearchResult[];
  timestamp: number;
  hitCount: number;
  lastAccess: number;
  computationTime: number;
}

interface CacheMetrics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgCacheRetrievalTime: number;
  avgComputationTime: number;
  cacheSize: number;
  memoryUsageMB: number;
}

interface OptimizationConfig {
  maxCacheSize: number;
  ttlMs: number;
  enableQueryNormalization: boolean;
  enablePrefetching: boolean;
  maxPrefetchQueries: number;
  warmupQueries: string[];
}

/**
 * High-performance search optimization with intelligent caching
 */
export class SearchPerformanceOptimizer {
  private cache: Map<string, CacheEntry> = new Map();
  private queryFrequency: Map<string, number> = new Map();
  private metrics: CacheMetrics;
  private config: OptimizationConfig;
  private readonly LRU_CHECK_INTERVAL = 60000; // 1 minute
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      maxCacheSize: 1000,
      ttlMs: 300000, // 5 minutes
      enableQueryNormalization: true,
      enablePrefetching: true,
      maxPrefetchQueries: 50,
      warmupQueries: [
        'disk space full',
        'memory pressure',
        'cpu high usage',
        'database connection',
        'service restart',
        'network timeout',
        'authentication error',
        'performance issue',
      ],
      ...config,
    };

    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      avgCacheRetrievalTime: 0,
      avgComputationTime: 0,
      cacheSize: 0,
      memoryUsageMB: 0,
    };
  }

  /**
   * Initialize the performance optimizer
   */
  async initialize(): Promise<void> {
    logger.info('SearchPerformanceOptimizer initializing', {
      maxCacheSize: this.config.maxCacheSize,
      ttlMs: this.config.ttlMs,
      queryNormalization: this.config.enableQueryNormalization,
      prefetching: this.config.enablePrefetching,
    });

    // Start LRU cleanup timer
    this.startCleanupTimer();

    logger.info('SearchPerformanceOptimizer initialized successfully');
  }

  /**
   * Get cached search results if available
   */
  async getCachedResults(query: string, filters?: SearchFilters): Promise<SearchResult[] | null> {
    const startTime = performance.now();
    
    try {
      const cacheKey = this.generateCacheKey(query, filters);
      const cachedEntry = this.cache.get(cacheKey);

      if (!cachedEntry) {
        this.metrics.cacheMisses++;
        this.updateQueryFrequency(query);
        return null;
      }

      // Check TTL
      if (Date.now() - cachedEntry.timestamp > this.config.ttlMs) {
        this.cache.delete(cacheKey);
        this.metrics.cacheMisses++;
        return null;
      }

      // Update access metrics
      cachedEntry.hitCount++;
      cachedEntry.lastAccess = Date.now();
      this.metrics.cacheHits++;

      const retrievalTime = performance.now() - startTime;
      this.updateCacheMetrics(retrievalTime);

      logger.debug('Cache hit for search query', {
        cacheKey,
        hitCount: cachedEntry.hitCount,
        age: Date.now() - cachedEntry.timestamp,
        resultCount: cachedEntry.results.length,
      });

      return [...cachedEntry.results]; // Return copy to prevent mutation
    } catch (error) {
      logger.error('Cache retrieval failed', { error });
      return null;
    }
  }

  /**
   * Cache search results with intelligent eviction
   */
  async cacheResults(
    query: string,
    filters: SearchFilters | undefined,
    results: SearchResult[],
    computationTime?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(query, filters);
      
      // Don't cache empty results or very large result sets
      if (results.length === 0 || results.length > 100) {
        return;
      }

      // Implement cache size management
      if (this.cache.size >= this.config.maxCacheSize) {
        this.evictLeastUseful();
      }

      const cacheEntry: CacheEntry = {
        key: cacheKey,
        query,
        results: [...results], // Store copy to prevent external mutation
        timestamp: Date.now(),
        hitCount: 0,
        lastAccess: Date.now(),
        computationTime: computationTime || 0,
        ...(filters && { filters }),
      };

      this.cache.set(cacheKey, cacheEntry);

      logger.debug('Cached search results', {
        cacheKey,
        resultCount: results.length,
        cacheSize: this.cache.size,
        computationTime: computationTime ? `${computationTime.toFixed(2)}ms` : 'unknown',
      });

      // Update metrics
      this.updateMetrics();
    } catch (error) {
      logger.error('Failed to cache search results', { error });
    }
  }

  /**
   * Normalize query for better cache hit rates
   */
  normalizeQuery(query: string): string {
    if (!this.config.enableQueryNormalization) {
      return query;
    }

    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove special characters
      .split(' ')
      .filter(word => word.length > 2) // Remove short words
      .sort() // Sort words for consistent ordering
      .join(' ');
  }

  /**
   * Prefetch results for common queries
   */
  async prefetchCommonQueries(searchFunction: (query: string) => Promise<SearchResult[]>): Promise<void> {
    if (!this.config.enablePrefetching) {
      return;
    }

    logger.info('Starting query prefetching', {
      queryCount: this.config.warmupQueries.length,
    });

    const prefetchPromises = this.config.warmupQueries.map(async (query) => {
      try {
        if (!this.cache.has(this.generateCacheKey(query))) {
          const results = await searchFunction(query);
          await this.cacheResults(query, undefined, results);
        }
      } catch (error) {
        logger.warn('Prefetch failed for query', { query, error });
      }
    });

    await Promise.allSettled(prefetchPromises);
    logger.info('Query prefetching completed');
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Clear cache and reset metrics
   */
  clearCache(): void {
    this.cache.clear();
    this.queryFrequency.clear();
    this.resetMetrics();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStatistics(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
    topQueries: Array<{ query: string; frequency: number }>;
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    const entries = Array.from(this.cache.values());
    const sortedByFrequency = Array.from(this.queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      utilizationPercent: (this.cache.size / this.config.maxCacheSize) * 100,
      topQueries: sortedByFrequency.map(([query, frequency]) => ({ query, frequency })),
      oldestEntry: entries.length > 0 ? 
        entries.reduce((oldest, entry) => entry.timestamp < oldest.timestamp ? entry : oldest).query : 
        null,
      newestEntry: entries.length > 0 ? 
        entries.reduce((newest, entry) => entry.timestamp > newest.timestamp ? entry : newest).query : 
        null,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clearCache();
    logger.info('SearchPerformanceOptimizer cleaned up');
  }

  // Private methods

  private generateCacheKey(query: string, filters?: SearchFilters): string {
    const normalizedQuery = this.normalizeQuery(query);
    const filterHash = filters ? this.hashFilters(filters) : '';
    return `${normalizedQuery}|${filterHash}`;
  }

  private hashFilters(filters: SearchFilters): string {
    // Simple hash for filters - in production consider using crypto
    const filterString = JSON.stringify(filters, Object.keys(filters).sort());
    let hash = 0;
    for (let i = 0; i < filterString.length; i++) {
      const char = filterString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private evictLeastUseful(): void {
    if (this.cache.size === 0) return;

    // Calculate usefulness score: (hitCount * recency) / age
    let leastUseful: CacheEntry | null = null;
    let lowestScore = Infinity;

    const now = Date.now();
    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp;
      const recency = now - entry.lastAccess;
      const score = (entry.hitCount + 1) / (age + recency + 1);

      if (score < lowestScore) {
        lowestScore = score;
        leastUseful = entry;
      }
    }

    if (leastUseful) {
      this.cache.delete(leastUseful.key);
      logger.debug('Evicted cache entry', {
        query: leastUseful.query,
        hitCount: leastUseful.hitCount,
        age: now - leastUseful.timestamp,
        score: lowestScore,
      });
    }
  }

  private updateQueryFrequency(query: string): void {
    const normalizedQuery = this.normalizeQuery(query);
    const current = this.queryFrequency.get(normalizedQuery) || 0;
    this.queryFrequency.set(normalizedQuery, current + 1);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performLRUCleanup();
    }, this.LRU_CHECK_INTERVAL);
  }

  private performLRUCleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttlMs) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug('LRU cleanup completed', {
        expiredEntries: expiredCount,
        remainingEntries: this.cache.size,
      });
    }
  }

  private updateCacheMetrics(retrievalTime: number): void {
    // Update average cache retrieval time
    const currentAvg = this.metrics.avgCacheRetrievalTime;
    const totalHits = this.metrics.cacheHits;
    this.metrics.avgCacheRetrievalTime = (currentAvg * (totalHits - 1) + retrievalTime) / totalHits;
  }

  private updateMetrics(): void {
    this.metrics.totalQueries = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.hitRate = this.metrics.totalQueries > 0 ? 
      this.metrics.cacheHits / this.metrics.totalQueries : 0;
    this.metrics.cacheSize = this.cache.size;

    // Estimate memory usage
    const avgEntrySize = 2000; // Approximate bytes per cache entry
    this.metrics.memoryUsageMB = (this.cache.size * avgEntrySize) / (1024 * 1024);
  }

  private resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      avgCacheRetrievalTime: 0,
      avgComputationTime: 0,
      cacheSize: 0,
      memoryUsageMB: 0,
    };
  }
}