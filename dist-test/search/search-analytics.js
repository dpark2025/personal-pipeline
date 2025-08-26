import { logger } from '../utils/logger.js';
export class SearchAnalytics {
    searchHistory = [];
    queryAnalytics = new Map();
    responseTimes = [];
    errorCount = 0;
    searchCount = 0;
    cacheHits = 0;
    MAX_HISTORY_SIZE = 10000;
    PERCENTILE_WINDOW_SIZE = 1000;
    RESPONSE_TIME_THRESHOLD = 200;
    ERROR_RATE_THRESHOLD = 0.05;
    CACHE_HIT_RATE_THRESHOLD = 0.6;
    constructor() {
        logger.info('SearchAnalytics initialized');
    }
    generateSearchId() {
        return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    recordInitialization(initTime) {
        logger.info('Search system initialization recorded', {
            initializationTime: `${initTime.toFixed(2)}ms`,
        });
    }
    recordIndexing(documentCount, indexingTime) {
        const docsPerSecond = documentCount / (indexingTime / 1000);
        logger.info('Document indexing recorded', {
            documentCount,
            indexingTime: `${indexingTime.toFixed(2)}ms`,
            docsPerSecond: docsPerSecond.toFixed(2),
        });
    }
    recordSearch(searchId, query, resultCount, responseTime, cached, accuracy) {
        const searchMetric = {
            searchId,
            query: query.toLowerCase().trim(),
            timestamp: Date.now(),
            responseTime,
            resultCount,
            cached,
            ...(accuracy !== undefined && { accuracy }),
        };
        this.searchHistory.push(searchMetric);
        if (this.searchHistory.length > this.MAX_HISTORY_SIZE) {
            this.searchHistory.shift();
        }
        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > this.PERCENTILE_WINDOW_SIZE) {
            this.responseTimes.shift();
        }
        this.searchCount++;
        if (cached) {
            this.cacheHits++;
        }
        this.updateQueryAnalytics(searchMetric);
        if (responseTime > this.RESPONSE_TIME_THRESHOLD) {
            logger.warn('Slow search detected', {
                searchId,
                query: query.substring(0, 50),
                responseTime: `${responseTime.toFixed(2)}ms`,
                threshold: `${this.RESPONSE_TIME_THRESHOLD}ms`,
            });
        }
        logger.debug('Search recorded', {
            searchId,
            responseTime: `${responseTime.toFixed(2)}ms`,
            resultCount,
            cached,
            accuracy: accuracy?.toFixed(3),
        });
    }
    recordSearchError(searchId, query, error, responseTime) {
        this.errorCount++;
        logger.error('Search error recorded', {
            searchId,
            query: query.substring(0, 50),
            error: error instanceof Error ? error.message : 'Unknown error',
            responseTime: `${responseTime.toFixed(2)}ms`,
        });
    }
    getPerformanceStats() {
        const recentSearches = this.getRecentSearches(300000);
        const totalResponseTime = recentSearches.reduce((sum, s) => sum + s.responseTime, 0);
        const avgResponseTime = recentSearches.length > 0 ? totalResponseTime / recentSearches.length : 0;
        return {
            totalSearches: this.searchCount,
            avgResponseTime,
            p95ResponseTime: this.calculatePercentile(95),
            p99ResponseTime: this.calculatePercentile(99),
            cacheHitRate: this.searchCount > 0 ? this.cacheHits / this.searchCount : 0,
            errorRate: this.searchCount > 0 ? this.errorCount / this.searchCount : 0,
            throughputPerMinute: this.calculateThroughput(),
        };
    }
    getQueryAnalytics() {
        return Array.from(this.queryAnalytics.values())
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 50);
    }
    getAccuracyMetrics() {
        const searchesWithAccuracy = this.searchHistory.filter(s => s.accuracy !== undefined);
        if (searchesWithAccuracy.length === 0) {
            return {
                avgAccuracy: 0,
                accuracyTrend: [],
                highAccuracyQueries: [],
                lowAccuracyQueries: [],
            };
        }
        const totalAccuracy = searchesWithAccuracy.reduce((sum, s) => sum + (s.accuracy ?? 0), 0);
        const avgAccuracy = totalAccuracy / searchesWithAccuracy.length;
        const recentSearches = searchesWithAccuracy.slice(-20);
        const accuracyTrend = recentSearches.map(s => s.accuracy ?? 0);
        const queryAccuracyMap = new Map();
        searchesWithAccuracy.forEach(s => {
            if (s.accuracy !== undefined) {
                const accuracies = queryAccuracyMap.get(s.query) || [];
                accuracies.push(s.accuracy);
                queryAccuracyMap.set(s.query, accuracies);
            }
        });
        const queryAvgAccuracy = Array.from(queryAccuracyMap.entries())
            .map(([query, accuracies]) => ({
            query,
            avgAccuracy: accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length,
        }))
            .filter(qa => qa.avgAccuracy > 0);
        const highAccuracyQueries = queryAvgAccuracy
            .filter(qa => qa.avgAccuracy >= 0.8)
            .map(qa => qa.query);
        const lowAccuracyQueries = queryAvgAccuracy
            .filter(qa => qa.avgAccuracy < 0.5)
            .map(qa => qa.query);
        return {
            avgAccuracy,
            accuracyTrend,
            highAccuracyQueries,
            lowAccuracyQueries,
        };
    }
    getSystemHealth() {
        const stats = this.getPerformanceStats();
        const alerts = [];
        let status = 'healthy';
        if (stats.avgResponseTime > this.RESPONSE_TIME_THRESHOLD) {
            alerts.push(`High average response time: ${stats.avgResponseTime.toFixed(2)}ms`);
            status = 'degraded';
        }
        if (stats.p95ResponseTime > this.RESPONSE_TIME_THRESHOLD * 2) {
            alerts.push(`Very high P95 response time: ${stats.p95ResponseTime.toFixed(2)}ms`);
            status = 'critical';
        }
        if (stats.errorRate > this.ERROR_RATE_THRESHOLD) {
            alerts.push(`High error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
            status = status === 'critical' ? 'critical' : 'degraded';
        }
        if (stats.cacheHitRate < this.CACHE_HIT_RATE_THRESHOLD) {
            alerts.push(`Low cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);
            if (status === 'healthy')
                status = 'degraded';
        }
        return {
            status,
            responseTimeThreshold: this.RESPONSE_TIME_THRESHOLD,
            errorRateThreshold: this.ERROR_RATE_THRESHOLD,
            cacheHitRateThreshold: this.CACHE_HIT_RATE_THRESHOLD,
            alerts,
        };
    }
    getMetrics() {
        return {
            performance: this.getPerformanceStats(),
            accuracy: this.getAccuracyMetrics(),
            health: this.getSystemHealth(),
            topQueries: this.getQueryAnalytics(),
            recentActivity: this.getRecentSearches(60000),
        };
    }
    generateReport(periodMs = 3600000) {
        const endTime = Date.now();
        const startTime = endTime - periodMs;
        const periodSearches = this.searchHistory.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
        const stats = this.getPerformanceStats();
        const health = this.getSystemHealth();
        const topQueries = this.getQueryAnalytics().slice(0, 10);
        const report = `
Search Analytics Report
Period: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}

PERFORMANCE METRICS:
- Total Searches: ${stats.totalSearches}
- Average Response Time: ${stats.avgResponseTime.toFixed(2)}ms
- P95 Response Time: ${stats.p95ResponseTime.toFixed(2)}ms
- P99 Response Time: ${stats.p99ResponseTime.toFixed(2)}ms
- Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(2)}%
- Error Rate: ${(stats.errorRate * 100).toFixed(2)}%
- Throughput: ${stats.throughputPerMinute.toFixed(2)} searches/minute

SYSTEM HEALTH: ${health.status.toUpperCase()}
${health.alerts.length > 0 ? `ALERTS:\n${health.alerts.map(alert => `- ${alert}`).join('\n')}` : 'No alerts'}

TOP QUERIES:
${topQueries.map((q, i) => `${i + 1}. "${q.query}" (${q.frequency} times, ${q.avgResponseTime.toFixed(2)}ms avg)`).join('\n')}

PERIOD ACTIVITY:
- Searches in period: ${periodSearches.length}
- Unique queries: ${new Set(periodSearches.map(s => s.query)).size}
- Average results per search: ${periodSearches.length > 0 ?
            (periodSearches.reduce((sum, s) => sum + s.resultCount, 0) / periodSearches.length).toFixed(2) : 0}
`;
        return report.trim();
    }
    reset() {
        this.searchHistory = [];
        this.queryAnalytics.clear();
        this.responseTimes = [];
        this.errorCount = 0;
        this.searchCount = 0;
        this.cacheHits = 0;
        logger.info('Search analytics reset');
    }
    updateQueryAnalytics(searchMetric) {
        const existing = this.queryAnalytics.get(searchMetric.query);
        if (existing) {
            existing.frequency++;
            existing.avgResponseTime = (existing.avgResponseTime + searchMetric.responseTime) / 2;
            existing.avgResultCount = (existing.avgResultCount + searchMetric.resultCount) / 2;
            existing.cacheHitRate = searchMetric.cached ?
                (existing.cacheHitRate * (existing.frequency - 1) + 1) / existing.frequency :
                (existing.cacheHitRate * (existing.frequency - 1)) / existing.frequency;
            existing.lastSeen = searchMetric.timestamp;
        }
        else {
            this.queryAnalytics.set(searchMetric.query, {
                query: searchMetric.query,
                frequency: 1,
                avgResponseTime: searchMetric.responseTime,
                avgResultCount: searchMetric.resultCount,
                cacheHitRate: searchMetric.cached ? 1 : 0,
                lastSeen: searchMetric.timestamp,
            });
        }
    }
    getRecentSearches(timeWindowMs) {
        const cutoffTime = Date.now() - timeWindowMs;
        return this.searchHistory.filter(s => s.timestamp >= cutoffTime);
    }
    calculatePercentile(percentile) {
        if (this.responseTimes.length === 0)
            return 0;
        const sorted = [...this.responseTimes].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)] ?? 0;
    }
    calculateThroughput() {
        const oneMinuteAgo = Date.now() - 60000;
        const recentSearches = this.searchHistory.filter(s => s.timestamp >= oneMinuteAgo);
        return recentSearches.length;
    }
}
//# sourceMappingURL=search-analytics.js.map