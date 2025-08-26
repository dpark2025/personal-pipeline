export class CacheManager {
    logger;
    options;
    globalCache;
    memoryCache = new Map();
    accessOrder = new Map();
    accessCounter = 0;
    metrics = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        totalSize: 0,
        memoryUsage: 0
    };
    ttlCache = new Map();
    warmupKeys = [];
    constructor(options, logger, globalCache) {
        this.options = options;
        this.logger = logger.child({ component: 'CacheManager' });
        this.globalCache = globalCache;
    }
    async initialize() {
        this.logger.info('Initializing cache manager', {
            defaultTtl: this.options.defaultTtl,
            maxCacheSize: this.options.maxCacheSize,
            enableMetrics: this.options.enableMetrics,
            hasGlobalCache: !!this.globalCache
        });
        const defaultTtlMs = this.parseTtl(this.options.defaultTtl);
        this.logger.debug('Parsed default TTL', {
            ttlString: this.options.defaultTtl,
            ttlMs: defaultTtlMs
        });
        if (this.options.warmupOnStart) {
            await this.warmupCache();
        }
        this.logger.info('Cache manager initialized successfully');
    }
    async get(key) {
        const startTime = Date.now();
        try {
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
            if (this.globalCache) {
                try {
                    const globalEntry = await this.globalCache.get({ type: 'web_response', identifier: key });
                    if (globalEntry) {
                        this.setMemoryCache(key, globalEntry, this.options.defaultTtl);
                        this.metrics.hits++;
                        this.logger.debug('Cache hit (global)', { key });
                        return globalEntry;
                    }
                }
                catch (error) {
                    this.logger.warn('Global cache get failed', {
                        key,
                        error: error.message
                    });
                }
            }
            this.metrics.misses++;
            this.logger.debug('Cache miss', {
                key,
                responseTime: Date.now() - startTime
            });
            return null;
        }
        catch (error) {
            this.metrics.misses++;
            this.logger.error('Cache get failed', {
                key,
                error: error.message
            });
            return null;
        }
    }
    async set(key, data, ttl, httpHeaders) {
        try {
            const ttlMs = ttl ? this.parseTtl(ttl) : this.parseTtl(this.options.defaultTtl);
            this.setMemoryCache(key, data, ttl || this.options.defaultTtl, httpHeaders);
            if (this.globalCache) {
                try {
                    await this.globalCache.set({ type: 'web_response', identifier: key }, data);
                }
                catch (error) {
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
        }
        catch (error) {
            this.logger.error('Cache set failed', {
                key,
                error: error.message
            });
        }
    }
    async delete(key) {
        try {
            const entry = this.memoryCache.get(key);
            if (entry) {
                this.memoryCache.delete(key);
                this.accessOrder.delete(key);
                this.metrics.totalSize -= entry.size;
                this.metrics.deletes++;
            }
            if (this.globalCache) {
                try {
                    await this.globalCache.delete({ type: 'web_response', identifier: key });
                }
                catch (error) {
                    this.logger.warn('Global cache delete failed', {
                        key,
                        error: error.message
                    });
                }
            }
            this.logger.debug('Cache delete', { key });
        }
        catch (error) {
            this.logger.error('Cache delete failed', {
                key,
                error: error.message
            });
        }
    }
    async clear() {
        try {
            this.memoryCache.clear();
            this.accessOrder.clear();
            this.accessCounter = 0;
            this.metrics.totalSize = 0;
            if (this.globalCache) {
                try {
                    await this.globalCache.clearByType('web_response');
                }
                catch (error) {
                    this.logger.warn('Global cache clear failed', {
                        error: error.message
                    });
                }
            }
            this.logger.info('Cache cleared');
        }
        catch (error) {
            this.logger.error('Cache clear failed', {
                error: error.message
            });
        }
    }
    async getStats() {
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
    getMetrics() {
        return {
            ...this.metrics,
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    async warmupCache(keys) {
        const keysToWarm = keys || this.warmupKeys;
        if (keysToWarm.length === 0) {
            this.logger.debug('No keys configured for cache warmup');
            return;
        }
        this.logger.info('Starting cache warmup', {
            keyCount: keysToWarm.length
        });
        this.logger.info('Cache warmup completed');
    }
    configureWarmup(keys) {
        this.warmupKeys = keys;
        this.logger.debug('Cache warmup configured', {
            keyCount: keys.length
        });
    }
    isValidForHttpHeaders(key, httpHeaders) {
        const entry = this.memoryCache.get(key);
        if (!entry || !this.isEntryValid(entry)) {
            return false;
        }
        if (!httpHeaders) {
            return true;
        }
        const etag = httpHeaders['etag'];
        if (etag && entry.etag && entry.etag !== etag) {
            this.logger.debug('Cache invalidated by ETag change', {
                key,
                oldETag: entry.etag,
                newETag: etag
            });
            return false;
        }
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
    async cleanup() {
        this.logger.info('Cleaning up cache manager');
        await this.clear();
        this.ttlCache.clear();
        this.warmupKeys = [];
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
    setMemoryCache(key, data, ttl, httpHeaders) {
        const ttlMs = this.parseTtl(ttl);
        const size = this.estimateSize(data);
        this.evictIfNecessary(size);
        const entry = {
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
    isEntryValid(entry) {
        const now = Date.now();
        const age = now - entry.timestamp;
        if (age > entry.ttl) {
            return false;
        }
        if (this.options.adaptiveTtl && entry.hitCount > 10) {
            const extendedTtl = entry.ttl * (1 + Math.log(entry.hitCount) / 10);
            if (age < extendedTtl) {
                return true;
            }
        }
        return true;
    }
    updateAccessOrder(key) {
        this.accessOrder.set(key, ++this.accessCounter);
    }
    evictIfNecessary(newItemSize) {
        while (this.memoryCache.size >= this.options.maxCacheSize) {
            this.evictLru();
        }
        const maxMemoryBytes = this.options.maxCacheSize * 1024 * 1024;
        while (this.metrics.totalSize + newItemSize > maxMemoryBytes && this.memoryCache.size > 0) {
            this.evictLru();
        }
    }
    evictLru() {
        let lruKey = null;
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
    parseTtl(ttlString) {
        if (this.ttlCache.has(ttlString)) {
            return this.ttlCache.get(ttlString);
        }
        const ttlLower = ttlString.toLowerCase();
        let milliseconds = 0;
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
                    milliseconds = 5 * 60 * 1000;
            }
        }
        else {
            const parsed = parseInt(ttlString);
            if (!isNaN(parsed)) {
                milliseconds = parsed;
            }
            else {
                milliseconds = 5 * 60 * 1000;
            }
        }
        this.ttlCache.set(ttlString, milliseconds);
        return milliseconds;
    }
    estimateSize(data) {
        try {
            if (typeof data === 'string') {
                return data.length * 2;
            }
            else if (typeof data === 'object') {
                return JSON.stringify(data).length * 2;
            }
            else {
                return 64;
            }
        }
        catch {
            return 64;
        }
    }
    estimateMemoryUsage() {
        let totalMemory = 0;
        for (const entry of this.memoryCache.values()) {
            totalMemory += entry.size;
            totalMemory += 200;
        }
        totalMemory += this.memoryCache.size * 50;
        totalMemory += this.ttlCache.size * 50;
        return totalMemory;
    }
}
//# sourceMappingURL=cache-manager.js.map