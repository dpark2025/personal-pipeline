"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
exports.initializeCacheService = initializeCacheService;
exports.getCacheService = getCacheService;
exports.createCacheKey = createCacheKey;
const node_cache_1 = __importDefault(require("node-cache"));
const logger_js_1 = require("./logger.js");
const circuit_breaker_js_1 = require("./circuit-breaker.js");
const redis_connection_manager_js_1 = require("./redis-connection-manager.js");
class CacheService {
    constructor(config) {
        this.redisManager = null;
        this.config = config;
        this.enabled = config.enabled;
        this.stats = this.initializeStats();
        this.memoryCache = new node_cache_1.default({
            stdTTL: config.memory.ttl_seconds,
            checkperiod: config.memory.check_period_seconds,
            maxKeys: config.memory.max_keys,
            useClones: false,
        });
        this.memoryCache.on('set', (key) => {
            logger_js_1.logger.debug('Memory cache SET', { key });
        });
        this.memoryCache.on('del', (key) => {
            logger_js_1.logger.debug('Memory cache DEL', { key });
        });
        this.memoryCache.on('expired', (key) => {
            logger_js_1.logger.debug('Memory cache EXPIRED', { key });
        });
        if (this.enabled && config.redis.enabled && config.strategy !== 'memory_only') {
            this.initializeRedis();
            this.redisCircuitBreaker = circuit_breaker_js_1.CircuitBreakerFactory.forCache('redis');
        }
        logger_js_1.logger.info('Cache service initialized', {
            strategy: config.strategy,
            memory_enabled: true,
            redis_enabled: config.redis.enabled,
            memory_max_keys: config.memory.max_keys,
        });
    }
    async get(key) {
        if (!this.enabled) {
            return null;
        }
        const cacheKey = this.buildCacheKey(key);
        const startTime = Date.now();
        try {
            const memoryResult = this.memoryCache.get(cacheKey);
            if (memoryResult) {
                this.recordHit(key.type);
                logger_js_1.logger.debug('Cache HIT (memory)', {
                    key: cacheKey,
                    type: key.type,
                    responseTime: Date.now() - startTime,
                });
                return memoryResult.data;
            }
            if (this.redisManager && this.config.strategy !== 'memory_only') {
                try {
                    const redisResult = await this.redisCircuitBreaker.execute(() => this.getFromRedis(cacheKey));
                    if (redisResult) {
                        this.memoryCache.set(cacheKey, redisResult, this.getTTL(key.type));
                        this.recordHit(key.type);
                        logger_js_1.logger.debug('Cache HIT (redis)', {
                            key: cacheKey,
                            type: key.type,
                            responseTime: Date.now() - startTime,
                        });
                        return redisResult.data;
                    }
                }
                catch (error) {
                    logger_js_1.logger.debug('Redis cache access failed, using memory cache only', {
                        key: cacheKey,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            this.recordMiss(key.type);
            logger_js_1.logger.debug('Cache MISS', {
                key: cacheKey,
                type: key.type,
                responseTime: Date.now() - startTime,
            });
            return null;
        }
        catch (error) {
            logger_js_1.logger.error('Cache GET error', {
                key: cacheKey,
                error: error instanceof Error ? error.message : String(error),
            });
            this.recordMiss(key.type);
            return null;
        }
    }
    async set(key, value) {
        if (!this.enabled) {
            return;
        }
        const cacheKey = this.buildCacheKey(key);
        const ttl = this.getTTL(key.type);
        const entry = {
            data: value,
            timestamp: Date.now(),
            ttl,
            content_type: key.type,
        };
        try {
            this.memoryCache.set(cacheKey, entry, ttl);
            if (this.redisManager && this.config.strategy !== 'memory_only') {
                try {
                    await this.redisCircuitBreaker.execute(() => this.setInRedis(cacheKey, entry, ttl));
                }
                catch (error) {
                    logger_js_1.logger.debug('Redis cache write failed, data stored in memory cache only', {
                        key: cacheKey,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            logger_js_1.logger.debug('Cache SET', {
                key: cacheKey,
                type: key.type,
                ttl,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Cache SET error', {
                key: cacheKey,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async delete(key) {
        if (!this.enabled) {
            return;
        }
        const cacheKey = this.buildCacheKey(key);
        try {
            this.memoryCache.del(cacheKey);
            if (this.redisManager && this.config.strategy !== 'memory_only') {
                await this.redisManager.executeOperation(redis => redis.del(this.buildRedisKey(cacheKey)));
            }
            logger_js_1.logger.debug('Cache DELETE', { key: cacheKey, type: key.type });
        }
        catch (error) {
            logger_js_1.logger.error('Cache DELETE error', {
                key: cacheKey,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async clearByType(contentType) {
        if (!this.enabled) {
            return;
        }
        try {
            const memoryKeys = this.memoryCache.keys();
            const typePrefix = `${contentType}:`;
            const keysToDelete = memoryKeys.filter(key => key.includes(typePrefix));
            this.memoryCache.del(keysToDelete);
            if (this.redisManager && this.config.strategy !== 'memory_only') {
                await this.redisManager.executeOperation(async (redis) => {
                    const redisPattern = `${this.config.redis.key_prefix}${typePrefix}*`;
                    const redisKeys = await redis.keys(redisPattern);
                    if (redisKeys.length > 0) {
                        await redis.del(...redisKeys);
                    }
                });
            }
            logger_js_1.logger.info('Cache cleared by type', {
                contentType,
                memoryKeysDeleted: keysToDelete.length,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Cache clear by type error', {
                contentType,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async clearAll() {
        if (!this.enabled) {
            return;
        }
        try {
            this.memoryCache.flushAll();
            if (this.redisManager && this.config.strategy !== 'memory_only') {
                await this.redisManager.executeOperation(async (redis) => {
                    const pattern = `${this.config.redis.key_prefix}*`;
                    const keys = await redis.keys(pattern);
                    if (keys.length > 0) {
                        await redis.del(...keys);
                    }
                });
            }
            this.stats = this.initializeStats();
            logger_js_1.logger.info('Cache cleared completely');
        }
        catch (error) {
            logger_js_1.logger.error('Cache clear all error', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    getStats() {
        this.stats.hit_rate =
            this.stats.total_operations > 0 ? this.stats.hits / this.stats.total_operations : 0;
        const keys = this.memoryCache.keys();
        this.stats.memory_usage_bytes = keys.length * 1024;
        this.stats.redis_connected = this.redisManager?.isAvailable() || false;
        return { ...this.stats };
    }
    async healthCheck() {
        const memoryStartTime = Date.now();
        const testKey = 'health_check_test';
        const testValue = { test: true, timestamp: Date.now() };
        this.memoryCache.set(testKey, testValue, 60);
        const memoryResult = this.memoryCache.get(testKey);
        this.memoryCache.del(testKey);
        const memoryResponseTime = Date.now() - memoryStartTime;
        const memoryStats = this.memoryCache.getStats();
        const result = {
            memory_cache: {
                healthy: memoryResult !== undefined,
                keys_count: memoryStats.keys,
                memory_usage_mb: Math.round(((memoryStats.ksize || 0) / 1024 / 1024) * 100) / 100,
                response_time_ms: memoryResponseTime,
            },
            overall_healthy: memoryResult !== undefined,
        };
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
                }
                else {
                    throw new Error('Redis ping failed');
                }
            }
            catch (error) {
                const stats = this.redisManager.getStats();
                result.redis_cache = {
                    healthy: false,
                    connected: false,
                    response_time_ms: Date.now() - redisStartTime,
                    error_message: error instanceof Error ? error.message : `Redis ${stats.state}`,
                };
                if (this.config.strategy === 'redis_only') {
                    result.overall_healthy = false;
                }
            }
        }
        return result;
    }
    async warmCache(criticalData) {
        if (!this.enabled) {
            return;
        }
        logger_js_1.logger.info('Starting cache warming', { itemCount: criticalData.length });
        const promises = criticalData.map(async ({ key, data }) => {
            try {
                await this.set(key, data);
            }
            catch (error) {
                logger_js_1.logger.error('Cache warming error for key', {
                    key: this.buildCacheKey(key),
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        });
        await Promise.allSettled(promises);
        logger_js_1.logger.info('Cache warming completed', { itemCount: criticalData.length });
    }
    async shutdown() {
        logger_js_1.logger.info('Shutting down cache service');
        try {
            this.memoryCache.close();
            if (this.redisManager) {
                await this.redisManager.disconnect();
                this.redisManager = null;
            }
            logger_js_1.logger.info('Cache service shutdown completed');
        }
        catch (error) {
            logger_js_1.logger.error('Cache service shutdown error', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    initializeRedis() {
        try {
            this.redisManager = new redis_connection_manager_js_1.RedisConnectionManager(this.config.redis);
            this.redisManager.on('connected', () => {
                logger_js_1.logger.info('Redis cache connected successfully');
            });
            this.redisManager.on('connectionFailed', (error) => {
                logger_js_1.logger.debug('Redis connection attempt failed', {
                    error: error.message,
                });
            });
            this.redisManager.on('circuitOpened', () => {
                logger_js_1.logger.warn('Redis connection circuit breaker opened - too many failures');
            });
            this.redisManager.on('stateChanged', ({ oldState, newState }) => {
                logger_js_1.logger.debug('Redis connection state changed', {
                    oldState,
                    newState,
                });
            });
            this.redisManager.connect().catch(error => {
                logger_js_1.logger.debug('Initial Redis connection failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        }
        catch (error) {
            logger_js_1.logger.error('Redis initialization failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.redisManager = null;
        }
    }
    async getFromRedis(key) {
        if (!this.redisManager) {
            return null;
        }
        const redisKey = this.buildRedisKey(key);
        const result = await this.redisManager.executeOperation(async (redis) => {
            const data = await redis.get(redisKey);
            if (!data) {
                return null;
            }
            return JSON.parse(data);
        });
        return result;
    }
    async setInRedis(key, entry, ttl) {
        if (!this.redisManager) {
            return;
        }
        const redisKey = this.buildRedisKey(key);
        await this.redisManager.executeOperation(async (redis) => {
            const serialized = JSON.stringify(entry);
            await redis.setex(redisKey, ttl, serialized);
        });
    }
    buildCacheKey(key) {
        return `${key.type}:${key.identifier}`;
    }
    buildRedisKey(cacheKey) {
        return `${this.config.redis.key_prefix}${cacheKey}`;
    }
    getTTL(contentType) {
        return this.config.content_types[contentType]?.ttl_seconds || this.config.memory.ttl_seconds;
    }
    recordHit(contentType) {
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
    recordMiss(contentType) {
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
    initializeStats() {
        return {
            hits: 0,
            misses: 0,
            hit_rate: 0,
            total_operations: 0,
            last_reset: new Date().toISOString(),
            by_content_type: {},
        };
    }
}
exports.CacheService = CacheService;
let cacheServiceInstance = null;
function initializeCacheService(config) {
    if (cacheServiceInstance) {
        logger_js_1.logger.warn('Cache service already initialized, returning existing instance');
        return cacheServiceInstance;
    }
    cacheServiceInstance = new CacheService(config);
    return cacheServiceInstance;
}
function getCacheService() {
    if (!cacheServiceInstance) {
        throw new Error('Cache service not initialized. Call initializeCacheService() first.');
    }
    return cacheServiceInstance;
}
function createCacheKey(type, identifier) {
    return { type, identifier };
}
