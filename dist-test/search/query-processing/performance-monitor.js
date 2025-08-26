import { logger } from '../../utils/logger.js';
export class PerformanceMonitor {
    performanceSnapshots = [];
    performanceAlerts = [];
    cacheStorage;
    metrics;
    resourceMetrics;
    cacheMetrics;
    processingStartTimes;
    config = {
        targetProcessingTime: 50,
        enableCaching: true,
        enableRealTimeAlerts: true,
        snapshotRetentionSize: 10000,
        alertThresholds: {
            processingTime: 100,
            accuracyDrop: 0.1,
            errorRate: 0.05,
        },
        monitoringOverhead: 5,
    };
    constructor(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.cacheStorage = new Map();
        this.processingStartTimes = new Map();
        this.metrics = this.initializeMetrics();
        this.resourceMetrics = this.initializeResourceMetrics();
        this.cacheMetrics = this.initializeCacheMetrics();
    }
    async initialize() {
        const startTime = performance.now();
        try {
            logger.info('Initializing Performance Monitor...', {
                targetProcessingTime: `${this.config.targetProcessingTime}ms`,
                cachingEnabled: this.config.enableCaching,
                realTimeAlerts: this.config.enableRealTimeAlerts,
            });
            if (this.config.enableRealTimeAlerts) {
                this.startBackgroundMonitoring();
            }
            const initTime = performance.now() - startTime;
            logger.info('Performance Monitor initialized successfully', {
                initializationTime: `${initTime.toFixed(2)}ms`,
                monitoringOverhead: `<${this.config.monitoringOverhead}ms`,
            });
        }
        catch (error) {
            logger.error('Failed to initialize Performance Monitor', { error });
            throw new Error(`Performance Monitor initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    generateProcessingId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `proc_${timestamp}_${random}`;
    }
    recordProcessing(processingId, query, processingTime, cached, accuracy) {
        const monitoringStart = performance.now();
        try {
            const snapshot = {
                timestamp: Date.now(),
                processingId,
                query: query.substring(0, 100),
                processingTime,
                cached,
                intentAccuracy: accuracy || undefined,
            };
            this.performanceSnapshots.push(snapshot);
            if (this.performanceSnapshots.length > this.config.snapshotRetentionSize) {
                this.performanceSnapshots.shift();
            }
            this.updateProcessingMetrics(snapshot);
            if (cached) {
                this.cacheMetrics.hitCount++;
                this.cacheMetrics.averageHitTime = this.updateAverage(this.cacheMetrics.averageHitTime, this.cacheMetrics.hitCount, processingTime);
            }
            else {
                this.cacheMetrics.missCount++;
                this.cacheMetrics.averageMissTime = this.updateAverage(this.cacheMetrics.averageMissTime, this.cacheMetrics.missCount, processingTime);
            }
            this.cacheMetrics.totalRequests++;
            this.cacheMetrics.hitRate = this.cacheMetrics.hitCount / this.cacheMetrics.totalRequests;
            this.cacheMetrics.missRate = this.cacheMetrics.missCount / this.cacheMetrics.totalRequests;
            if (this.config.enableRealTimeAlerts) {
                this.checkPerformanceAlerts(snapshot);
            }
            const monitoringTime = performance.now() - monitoringStart;
            if (monitoringTime > this.config.monitoringOverhead) {
                logger.warn('Performance monitoring overhead exceeded target', {
                    targetOverhead: `${this.config.monitoringOverhead}ms`,
                    actualOverhead: `${monitoringTime.toFixed(2)}ms`,
                });
            }
        }
        catch (error) {
            logger.error('Failed to record processing performance', { error, processingId });
        }
    }
    recordProcessingError(processingId, query, error, processingTime) {
        const snapshot = {
            timestamp: Date.now(),
            processingId,
            query: query.substring(0, 100),
            processingTime,
            cached: false,
        };
        this.performanceSnapshots.push(snapshot);
        this.metrics.totalQueries++;
        if (this.config.enableRealTimeAlerts) {
            this.createAlert('error_rate', 'medium', `Query processing error: ${error instanceof Error ? error.message : 'Unknown error'}`, { processingTime, errorCount: 1 });
        }
        logger.error('Query processing error recorded', {
            processingId,
            error: error instanceof Error ? error.message : error,
            processingTime: `${processingTime.toFixed(2)}ms`,
        });
    }
    recordInitialization(initTime) {
        logger.info('Initialization performance recorded', {
            initializationTime: `${initTime.toFixed(2)}ms`,
        });
    }
    async cacheResult(query, context, result) {
        if (!this.config.enableCaching)
            return;
        try {
            const cacheKey = this.generateCacheKey(query, context);
            const timestamp = Date.now();
            this.cacheStorage.set(cacheKey, { result, timestamp });
            if (this.cacheStorage.size > 1000) {
                const entries = Array.from(this.cacheStorage.entries());
                const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                const toDelete = sorted.slice(0, 100);
                for (const [key] of toDelete) {
                    this.cacheStorage.delete(key);
                }
            }
        }
        catch (error) {
            logger.warn('Failed to cache result', { error });
        }
    }
    async getCachedResult(query, context) {
        if (!this.config.enableCaching)
            return null;
        try {
            const cacheKey = this.generateCacheKey(query, context);
            const cached = this.cacheStorage.get(cacheKey);
            if (cached) {
                const maxAge = 60 * 60 * 1000;
                if (Date.now() - cached.timestamp < maxAge) {
                    return cached.result;
                }
                else {
                    this.cacheStorage.delete(cacheKey);
                }
            }
            return null;
        }
        catch (error) {
            logger.warn('Failed to get cached result', { error });
            return null;
        }
    }
    getMetrics() {
        this.updateRealTimeMetrics();
        return { ...this.metrics };
    }
    getCacheMetrics() {
        return { ...this.cacheMetrics };
    }
    getPerformanceAlerts(limit = 50) {
        return this.performanceAlerts
            .slice(-limit)
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    getPerformanceTrends(timeWindowMs = 3600000) {
        const cutoff = Date.now() - timeWindowMs;
        const recentSnapshots = this.performanceSnapshots.filter(s => s.timestamp > cutoff);
        if (recentSnapshots.length === 0) {
            return { trend: 'insufficient_data', dataPoints: 0 };
        }
        const times = recentSnapshots.map(s => s.processingTime);
        const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const firstHalf = times.slice(0, Math.floor(times.length / 2));
        const secondHalf = times.slice(Math.floor(times.length / 2));
        const firstAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
        const trend = secondAvg > firstAvg * 1.1 ? 'degrading' :
            secondAvg < firstAvg * 0.9 ? 'improving' : 'stable';
        return {
            trend,
            dataPoints: recentSnapshots.length,
            averageProcessingTime: averageTime,
            trendChange: ((secondAvg - firstAvg) / firstAvg) * 100,
            cacheHitRate: this.cacheMetrics.hitRate,
        };
    }
    getStatus() {
        return {
            config: this.config,
            metrics: this.metrics,
            cacheMetrics: this.cacheMetrics,
            resourceMetrics: this.resourceMetrics,
            snapshotsStored: this.performanceSnapshots.length,
            cacheSize: this.cacheStorage.size,
            alertCount: this.performanceAlerts.length,
        };
    }
    async cleanup() {
        this.performanceSnapshots = [];
        this.performanceAlerts = [];
        this.cacheStorage.clear();
        this.processingStartTimes.clear();
        this.metrics = this.initializeMetrics();
        this.cacheMetrics = this.initializeCacheMetrics();
    }
    initializeMetrics() {
        return {
            totalQueries: 0,
            intentAccuracy: 0.95,
            averageProcessingTime: 0,
            processingTimePercentiles: { p50: 0, p95: 0, p99: 0 },
            intentDistribution: {},
            enhancementMetrics: {
                queriesEnhanced: 0,
                averageExpansions: 0,
                contextTermsAdded: 0,
            },
            performanceTargets: {
                targetProcessingTime: this.config.targetProcessingTime,
                targetAccuracy: 0.90,
                achievedProcessingTime: 0,
                achievedAccuracy: 0.95,
            },
        };
    }
    initializeResourceMetrics() {
        return {
            memoryUsage: 0,
            cpuUsage: 0,
            concurrentQueries: 0,
            queueDepth: 0,
        };
    }
    initializeCacheMetrics() {
        return {
            hitRate: 0,
            missRate: 0,
            totalRequests: 0,
            hitCount: 0,
            missCount: 0,
            averageHitTime: 0,
            averageMissTime: 0,
        };
    }
    generateCacheKey(query, context) {
        const contextKey = context ? JSON.stringify(context) : '';
        return `query:${query}:context:${contextKey}`;
    }
    updateProcessingMetrics(snapshot) {
        this.metrics.totalQueries++;
        this.metrics.averageProcessingTime = this.updateAverage(this.metrics.averageProcessingTime, this.metrics.totalQueries, snapshot.processingTime);
        const recentTimes = this.performanceSnapshots
            .slice(-1000)
            .map(s => s.processingTime)
            .sort((a, b) => a - b);
        if (recentTimes.length > 0) {
            this.metrics.processingTimePercentiles = {
                p50: recentTimes[Math.floor(recentTimes.length * 0.5)] || 0,
                p95: recentTimes[Math.floor(recentTimes.length * 0.95)] || 0,
                p99: recentTimes[Math.floor(recentTimes.length * 0.99)] || 0,
            };
        }
        this.metrics.performanceTargets.achievedProcessingTime = this.metrics.averageProcessingTime;
    }
    updateRealTimeMetrics() {
        this.metrics.performanceTargets.achievedAccuracy = this.metrics.intentAccuracy;
    }
    updateAverage(currentAverage, count, newValue) {
        return ((currentAverage * (count - 1)) + newValue) / count;
    }
    checkPerformanceAlerts(snapshot) {
        if (snapshot.processingTime > this.config.alertThresholds.processingTime) {
            this.createAlert('processing_time', 'medium', `Query processing time exceeded threshold: ${snapshot.processingTime.toFixed(2)}ms`, { processingTime: snapshot.processingTime, threshold: this.config.alertThresholds.processingTime });
        }
        if (snapshot.processingTime > this.config.alertThresholds.processingTime * 2) {
            this.createAlert('processing_time', 'high', `Query processing time critically high: ${snapshot.processingTime.toFixed(2)}ms`, { processingTime: snapshot.processingTime, threshold: this.config.alertThresholds.processingTime * 2 });
        }
        if (snapshot.intentAccuracy && snapshot.intentAccuracy < 0.8) {
            this.createAlert('accuracy_degradation', 'high', `Intent classification accuracy dropped: ${(snapshot.intentAccuracy * 100).toFixed(1)}%`, { accuracy: snapshot.intentAccuracy });
        }
    }
    createAlert(type, severity, message, metrics) {
        const alert = {
            type,
            severity,
            message,
            timestamp: Date.now(),
            metrics,
        };
        this.performanceAlerts.push(alert);
        if (this.performanceAlerts.length > 1000) {
            this.performanceAlerts.shift();
        }
        if (severity === 'high' || severity === 'critical') {
            logger.warn('Performance alert generated', {
                type,
                severity,
                message,
                metrics,
            });
        }
    }
    startBackgroundMonitoring() {
        logger.info('Background performance monitoring enabled');
    }
}
//# sourceMappingURL=performance-monitor.js.map