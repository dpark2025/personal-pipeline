import { performance } from 'perf_hooks';
import { logger } from './logger.js';
export class PerformanceMonitor {
    metrics = new Map();
    toolMetrics = new Map();
    errorCounts = new Map();
    startTime = Date.now();
    windowSize = 60000;
    maxSamples = 1000;
    monitoringInterval = null;
    realtimeCallbacks = [];
    constructor(options = {}) {
        this.windowSize = options.windowSize || 60000;
        this.maxSamples = options.maxSamples || 1000;
    }
    recordToolExecution(toolName, executionTimeMs, isError = false) {
        const key = `tool_${toolName}`;
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }
        const samples = this.metrics.get(key);
        samples.push(executionTimeMs);
        this.pruneOldSamples(samples);
        let toolData = this.toolMetrics.get(toolName);
        if (!toolData) {
            toolData = {
                tool_name: toolName,
                total_calls: 0,
                total_time_ms: 0,
                avg_time_ms: 0,
                error_count: 0,
                error_rate: 0,
                last_called: new Date().toISOString(),
                percentiles: { p50: 0, p95: 0, p99: 0 },
            };
            this.toolMetrics.set(toolName, toolData);
        }
        toolData.total_calls++;
        toolData.total_time_ms += executionTimeMs;
        toolData.avg_time_ms = toolData.total_time_ms / toolData.total_calls;
        toolData.last_called = new Date().toISOString();
        if (isError) {
            toolData.error_count++;
            this.recordError(`tool_${toolName}`);
        }
        toolData.error_rate = toolData.error_count / toolData.total_calls;
        const sortedSamples = [...samples].sort((a, b) => a - b);
        toolData.percentiles = {
            p50: this.getPercentile(sortedSamples, 50),
            p95: this.getPercentile(sortedSamples, 95),
            p99: this.getPercentile(sortedSamples, 99),
        };
        logger.debug('Tool execution recorded', {
            tool: toolName,
            execution_time_ms: executionTimeMs,
            is_error: isError,
            avg_time_ms: toolData.avg_time_ms,
        });
    }
    recordError(errorType) {
        const current = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, current + 1);
    }
    getMetrics() {
        const allResponseTimes = [];
        let totalRequests = 0;
        for (const [key, samples] of this.metrics.entries()) {
            if (key.startsWith('tool_')) {
                allResponseTimes.push(...samples);
                totalRequests += samples.length;
            }
        }
        const sortedTimes = allResponseTimes.sort((a, b) => a - b);
        const uptime = (Date.now() - this.startTime) / 1000;
        const requestsPerSecond = totalRequests > 0 ? totalRequests / Math.min(uptime, this.windowSize / 1000) : 0;
        const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
        const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
        const memUsage = process.memoryUsage();
        const resourceMetrics = {
            memory_mb: Math.round(memUsage.rss / 1024 / 1024),
            heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
            cpu_percent: this.getCPUUsage(),
            active_handles: process._getActiveHandles().length,
            active_requests: process._getActiveRequests().length,
        };
        return {
            response_times: {
                count: sortedTimes.length,
                total_ms: sortedTimes.reduce((sum, time) => sum + time, 0),
                avg_ms: sortedTimes.length > 0
                    ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length
                    : 0,
                p50_ms: this.getPercentile(sortedTimes, 50),
                p95_ms: this.getPercentile(sortedTimes, 95),
                p99_ms: this.getPercentile(sortedTimes, 99),
                max_ms: sortedTimes.length > 0 ? Math.max(...sortedTimes) : 0,
                min_ms: sortedTimes.length > 0 ? Math.min(...sortedTimes) : 0,
            },
            throughput: {
                requests_per_second: requestsPerSecond,
                total_requests: totalRequests,
                window_size_seconds: this.windowSize / 1000,
            },
            error_tracking: {
                total_errors: totalErrors,
                error_rate: errorRate,
                errors_by_type: Object.fromEntries(this.errorCounts),
            },
            resource_usage: resourceMetrics,
            cache_performance: {
                hit_rate: 0,
                total_operations: 0,
                avg_response_time_ms: 0,
            },
        };
    }
    getToolMetrics() {
        return new Map(this.toolMetrics);
    }
    getToolPerformance(toolName) {
        return this.toolMetrics.get(toolName) || null;
    }
    startRealtimeMonitoring(intervalMs = 5000) {
        if (this.monitoringInterval) {
            return;
        }
        this.monitoringInterval = setInterval(() => {
            const metrics = this.getMetrics();
            for (const callback of this.realtimeCallbacks) {
                try {
                    callback(metrics);
                }
                catch (error) {
                    logger.error('Real-time monitoring callback failed', { error });
                }
            }
            this.checkPerformanceAlerts(metrics);
        }, intervalMs);
        logger.info('Real-time performance monitoring started', {
            interval_ms: intervalMs,
            callbacks: this.realtimeCallbacks.length,
        });
    }
    stopRealtimeMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger.info('Real-time performance monitoring stopped');
        }
    }
    onMetricsUpdate(callback) {
        this.realtimeCallbacks.push(callback);
    }
    removeMetricsCallback(callback) {
        const index = this.realtimeCallbacks.indexOf(callback);
        if (index > -1) {
            this.realtimeCallbacks.splice(index, 1);
        }
    }
    reset() {
        this.metrics.clear();
        this.toolMetrics.clear();
        this.errorCounts.clear();
        this.startTime = Date.now();
        logger.info('Performance metrics reset');
    }
    generateReport() {
        const summary = this.getMetrics();
        const tools = Array.from(this.toolMetrics.values());
        const recommendations = [];
        const alerts = [];
        if (summary.response_times.p95_ms > 1000) {
            recommendations.push('P95 response time exceeds 1s - consider caching optimization');
        }
        if (summary.error_tracking.error_rate > 0.05) {
            recommendations.push(`Error rate of ${(summary.error_tracking.error_rate * 100).toFixed(1)}% is high - investigate error causes`);
        }
        if (summary.resource_usage.memory_mb > 1024) {
            recommendations.push('Memory usage exceeds 1GB - consider memory optimization');
        }
        if (summary.throughput.requests_per_second < 5) {
            recommendations.push('Low throughput detected - investigate performance bottlenecks');
        }
        for (const [toolName, toolData] of this.toolMetrics.entries()) {
            if (toolData.avg_time_ms > 2000) {
                alerts.push(`Tool ${toolName} has high average response time: ${toolData.avg_time_ms.toFixed(0)}ms`);
            }
            if (toolData.error_rate > 0.1) {
                alerts.push(`Tool ${toolName} has high error rate: ${(toolData.error_rate * 100).toFixed(1)}%`);
            }
        }
        return {
            summary,
            tools,
            recommendations,
            alerts,
        };
    }
    checkPerformanceAlerts(metrics) {
        const alerts = [];
        if (metrics.response_times.p95_ms > 2000) {
            alerts.push(`HIGH: P95 response time is ${metrics.response_times.p95_ms.toFixed(0)}ms (>2s)`);
        }
        if (metrics.error_tracking.error_rate > 0.1) {
            alerts.push(`HIGH: Error rate is ${(metrics.error_tracking.error_rate * 100).toFixed(1)}% (>10%)`);
        }
        if (metrics.resource_usage.memory_mb > 2048) {
            alerts.push(`MEDIUM: Memory usage is ${metrics.resource_usage.memory_mb}MB (>2GB)`);
        }
        if (metrics.throughput.requests_per_second > 0 && metrics.throughput.requests_per_second < 1) {
            alerts.push(`MEDIUM: Low throughput: ${metrics.throughput.requests_per_second.toFixed(1)} req/s`);
        }
        for (const alert of alerts) {
            logger.warn('Performance alert', { alert });
        }
    }
    getCPUUsage() {
        const usage = process.cpuUsage();
        return Math.round((usage.user + usage.system) / 1000) / 10;
    }
    getPercentile(sortedArray, percentile) {
        if (sortedArray.length === 0)
            return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))] || 0;
    }
    pruneOldSamples(samples) {
        if (samples.length > this.maxSamples) {
            samples.splice(0, samples.length - this.maxSamples);
        }
    }
}
let performanceMonitorInstance = null;
export function getPerformanceMonitor() {
    if (!performanceMonitorInstance) {
        performanceMonitorInstance = new PerformanceMonitor();
    }
    return performanceMonitorInstance;
}
export function initializePerformanceMonitor(options) {
    performanceMonitorInstance = new PerformanceMonitor(options);
    return performanceMonitorInstance;
}
export function measurePerformance(toolName) {
    return function (_target, _propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const monitor = getPerformanceMonitor();
            const startTime = performance.now();
            let isError = false;
            try {
                const result = await method.apply(this, args);
                return result;
            }
            catch (error) {
                isError = true;
                throw error;
            }
            finally {
                const executionTime = performance.now() - startTime;
                monitor.recordToolExecution(toolName, executionTime, isError);
            }
        };
    };
}
export class PerformanceTimer {
    startTime;
    constructor() {
        this.startTime = performance.now();
    }
    elapsed() {
        return performance.now() - this.startTime;
    }
    reset() {
        this.startTime = performance.now();
    }
    lap() {
        const elapsed = this.elapsed();
        this.reset();
        return elapsed;
    }
}
export function createTimer() {
    return new PerformanceTimer();
}
//# sourceMappingURL=performance.js.map