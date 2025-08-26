import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';
export class SearchPerformanceOptimizer {
    cache = new Map();
    queryFrequency = new Map();
    metrics;
    config;
    LRU_CHECK_INTERVAL = 60000;
    cleanupTimer = null;
    constructor(config) {
        this.config = {
            maxCacheSize: 1000,
            ttlMs: 300000,
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
    async initialize() {
        logger.info('SearchPerformanceOptimizer initializing', {
            maxCacheSize: this.config.maxCacheSize,
            ttlMs: this.config.ttlMs,
            queryNormalization: this.config.enableQueryNormalization,
            prefetching: this.config.enablePrefetching,
        });
        this.startCleanupTimer();
        logger.info('SearchPerformanceOptimizer initialized successfully');
    }
    async getCachedResults(query, filters) {
        const startTime = performance.now();
        try {
            const cacheKey = this.generateCacheKey(query, filters);
            const cachedEntry = this.cache.get(cacheKey);
            if (!cachedEntry) {
                this.metrics.cacheMisses++;
                this.updateQueryFrequency(query);
                return null;
            }
            if (Date.now() - cachedEntry.timestamp > this.config.ttlMs) {
                this.cache.delete(cacheKey);
                this.metrics.cacheMisses++;
                return null;
            }
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
            return [...cachedEntry.results];
        }
        catch (error) {
            logger.error('Cache retrieval failed', { error });
            return null;
        }
    }
    async cacheResults(query, filters, results, computationTime) {
        try {
            const cacheKey = this.generateCacheKey(query, filters);
            if (results.length === 0 || results.length > 100) {
                return;
            }
            if (this.cache.size >= this.config.maxCacheSize) {
                this.evictLeastUseful();
            }
            const cacheEntry = {
                key: cacheKey,
                query,
                results: [...results],
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
            this.updateMetrics();
        }
        catch (error) {
            logger.error('Failed to cache search results', { error });
        }
    }
    normalizeQuery(query) {
        if (!this.config.enableQueryNormalization) {
            return query;
        }
        return query
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .filter(word => word.length > 2)
            .sort()
            .join(' ');
    }
    async prefetchCommonQueries(searchFunction) {
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
            }
            catch (error) {
                logger.warn('Prefetch failed for query', { query, error });
            }
        });
        await Promise.allSettled(prefetchPromises);
        logger.info('Query prefetching completed');
    }
    getCacheMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    clearCache() {
        this.cache.clear();
        this.queryFrequency.clear();
        this.resetMetrics();
        logger.info('Cache cleared');
    }
    getCacheStatistics() {
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
    async cleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clearCache();
        logger.info('SearchPerformanceOptimizer cleaned up');
    }
    generateCacheKey(query, filters) {
        const normalizedQuery = this.normalizeQuery(query);
        const filterHash = filters ? this.hashFilters(filters) : '';
        return `${normalizedQuery}|${filterHash}`;
    }
    hashFilters(filters) {
        const filterString = JSON.stringify(filters, Object.keys(filters).sort());
        let hash = 0;
        for (let i = 0; i < filterString.length; i++) {
            const char = filterString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    evictLeastUseful() {
        if (this.cache.size === 0)
            return;
        let leastUseful = null;
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
    updateQueryFrequency(query) {
        const normalizedQuery = this.normalizeQuery(query);
        const current = this.queryFrequency.get(normalizedQuery) || 0;
        this.queryFrequency.set(normalizedQuery, current + 1);
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.performLRUCleanup();
        }, this.LRU_CHECK_INTERVAL);
    }
    performLRUCleanup() {
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
    updateCacheMetrics(retrievalTime) {
        const currentAvg = this.metrics.avgCacheRetrievalTime;
        const totalHits = this.metrics.cacheHits;
        this.metrics.avgCacheRetrievalTime = (currentAvg * (totalHits - 1) + retrievalTime) / totalHits;
    }
    updateMetrics() {
        this.metrics.totalQueries = this.metrics.cacheHits + this.metrics.cacheMisses;
        this.metrics.hitRate = this.metrics.totalQueries > 0 ?
            this.metrics.cacheHits / this.metrics.totalQueries : 0;
        this.metrics.cacheSize = this.cache.size;
        const avgEntrySize = 2000;
        this.metrics.memoryUsageMB = (this.cache.size * avgEntrySize) / (1024 * 1024);
    }
    resetMetrics() {
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
//# sourceMappingURL=performance-optimizer.js.map