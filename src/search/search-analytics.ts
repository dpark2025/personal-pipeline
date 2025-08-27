/**
 * Search Analytics - Comprehensive metrics and monitoring
 *
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 *
 * Advanced analytics system for search performance monitoring,
 * user behavior analysis, and continuous optimization insights.
 */

import { logger } from '../utils/logger.js';

interface SearchMetrics {
  searchId: string;
  query: string;
  timestamp: number;
  responseTime: number;
  resultCount: number;
  cached: boolean;
  accuracy?: number;
  userSatisfaction?: number;
}

interface PerformanceStats {
  totalSearches: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  throughputPerMinute: number;
}

interface QueryAnalytics {
  query: string;
  frequency: number;
  avgResponseTime: number;
  avgResultCount: number;
  cacheHitRate: number;
  lastSeen: number;
}

interface AccuracyMetrics {
  avgAccuracy: number;
  accuracyTrend: number[];
  highAccuracyQueries: string[];
  lowAccuracyQueries: string[];
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  responseTimeThreshold: number;
  errorRateThreshold: number;
  cacheHitRateThreshold: number;
  alerts: string[];
}

/**
 * Comprehensive search analytics and monitoring system
 */
export class SearchAnalytics {
  private searchHistory: SearchMetrics[] = [];
  private queryAnalytics: Map<string, QueryAnalytics> = new Map();
  private responseTimes: number[] = [];
  private errorCount = 0;
  private searchCount = 0;
  private cacheHits = 0;
  private readonly MAX_HISTORY_SIZE = 10000;
  private readonly PERCENTILE_WINDOW_SIZE = 1000;

  // Performance thresholds
  private readonly RESPONSE_TIME_THRESHOLD = 200; // ms
  private readonly ERROR_RATE_THRESHOLD = 0.05; // 5%
  private readonly CACHE_HIT_RATE_THRESHOLD = 0.6; // 60%

  constructor() {
    logger.info('SearchAnalytics initialized');
  }

  /**
   * Generate unique search ID for tracking
   */
  generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record search initialization time
   */
  recordInitialization(initTime: number): void {
    logger.info('Search system initialization recorded', {
      initializationTime: `${initTime.toFixed(2)}ms`,
    });
  }

  /**
   * Record document indexing metrics
   */
  recordIndexing(documentCount: number, indexingTime: number): void {
    const docsPerSecond = documentCount / (indexingTime / 1000);
    logger.info('Document indexing recorded', {
      documentCount,
      indexingTime: `${indexingTime.toFixed(2)}ms`,
      docsPerSecond: docsPerSecond.toFixed(2),
    });
  }

  /**
   * Record a search operation
   */
  recordSearch(
    searchId: string,
    query: string,
    resultCount: number,
    responseTime: number,
    cached: boolean,
    accuracy?: number
  ): void {
    const searchMetric: SearchMetrics = {
      searchId,
      query: query.toLowerCase().trim(),
      timestamp: Date.now(),
      responseTime,
      resultCount,
      cached,
      ...(accuracy !== undefined && { accuracy }),
    };

    // Add to history
    this.searchHistory.push(searchMetric);
    if (this.searchHistory.length > this.MAX_HISTORY_SIZE) {
      this.searchHistory.shift();
    }

    // Update response times for percentile calculations
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.PERCENTILE_WINDOW_SIZE) {
      this.responseTimes.shift();
    }

    // Update counters
    this.searchCount++;
    if (cached) {
      this.cacheHits++;
    }

    // Update query analytics
    this.updateQueryAnalytics(searchMetric);

    // Log performance issues
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

  /**
   * Record search error
   */
  recordSearchError(searchId: string, query: string, error: any, responseTime: number): void {
    this.errorCount++;

    logger.error('Search error recorded', {
      searchId,
      query: query.substring(0, 50),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${responseTime.toFixed(2)}ms`,
    });
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    const recentSearches = this.getRecentSearches(300000); // Last 5 minutes
    const totalResponseTime = recentSearches.reduce((sum, s) => sum + s.responseTime, 0);
    const avgResponseTime =
      recentSearches.length > 0 ? totalResponseTime / recentSearches.length : 0;

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

  /**
   * Get query analytics for optimization insights
   */
  getQueryAnalytics(): QueryAnalytics[] {
    return Array.from(this.queryAnalytics.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50); // Top 50 queries
  }

  /**
   * Get accuracy metrics
   */
  getAccuracyMetrics(): AccuracyMetrics {
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

    // Calculate accuracy trend (last 20 searches with accuracy)
    const recentSearches = searchesWithAccuracy.slice(-20);
    const accuracyTrend = recentSearches.map(s => s.accuracy ?? 0);

    // Identify high and low accuracy queries
    const queryAccuracyMap = new Map<string, number[]>();
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

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealth {
    const stats = this.getPerformanceStats();
    const alerts: string[] = [];
    let status: SystemHealth['status'] = 'healthy';

    // Check response time
    if (stats.avgResponseTime > this.RESPONSE_TIME_THRESHOLD) {
      alerts.push(`High average response time: ${stats.avgResponseTime.toFixed(2)}ms`);
      status = 'degraded';
    }

    if (stats.p95ResponseTime > this.RESPONSE_TIME_THRESHOLD * 2) {
      alerts.push(`Very high P95 response time: ${stats.p95ResponseTime.toFixed(2)}ms`);
      status = 'critical';
    }

    // Check error rate
    if (stats.errorRate > this.ERROR_RATE_THRESHOLD) {
      alerts.push(`High error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
      status = status === 'critical' ? 'critical' : 'degraded';
    }

    // Check cache hit rate
    if (stats.cacheHitRate < this.CACHE_HIT_RATE_THRESHOLD) {
      alerts.push(`Low cache hit rate: ${(stats.cacheHitRate * 100).toFixed(2)}%`);
      if (status === 'healthy') status = 'degraded';
    }

    return {
      status,
      responseTimeThreshold: this.RESPONSE_TIME_THRESHOLD,
      errorRateThreshold: this.ERROR_RATE_THRESHOLD,
      cacheHitRateThreshold: this.CACHE_HIT_RATE_THRESHOLD,
      alerts,
    };
  }

  /**
   * Get comprehensive metrics for monitoring dashboard
   */
  getMetrics(): {
    performance: PerformanceStats;
    accuracy: AccuracyMetrics;
    health: SystemHealth;
    topQueries: QueryAnalytics[];
    recentActivity: SearchMetrics[];
  } {
    return {
      performance: this.getPerformanceStats(),
      accuracy: this.getAccuracyMetrics(),
      health: this.getSystemHealth(),
      topQueries: this.getQueryAnalytics(),
      recentActivity: this.getRecentSearches(60000), // Last minute
    };
  }

  /**
   * Generate analytics report
   */
  generateReport(periodMs: number = 3600000): string {
    const endTime = Date.now();
    const startTime = endTime - periodMs;
    const periodSearches = this.searchHistory.filter(
      s => s.timestamp >= startTime && s.timestamp <= endTime
    );

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
${topQueries
  .map(
    (q, i) => `${i + 1}. "${q.query}" (${q.frequency} times, ${q.avgResponseTime.toFixed(2)}ms avg)`
  )
  .join('\n')}

PERIOD ACTIVITY:
- Searches in period: ${periodSearches.length}
- Unique queries: ${new Set(periodSearches.map(s => s.query)).size}
- Average results per search: ${
      periodSearches.length > 0
        ? (
            periodSearches.reduce((sum, s) => sum + s.resultCount, 0) / periodSearches.length
          ).toFixed(2)
        : 0
    }
`;

    return report.trim();
  }

  /**
   * Reset all analytics data
   */
  reset(): void {
    this.searchHistory = [];
    this.queryAnalytics.clear();
    this.responseTimes = [];
    this.errorCount = 0;
    this.searchCount = 0;
    this.cacheHits = 0;
    logger.info('Search analytics reset');
  }

  // Private helper methods

  private updateQueryAnalytics(searchMetric: SearchMetrics): void {
    const existing = this.queryAnalytics.get(searchMetric.query);

    if (existing) {
      existing.frequency++;
      existing.avgResponseTime = (existing.avgResponseTime + searchMetric.responseTime) / 2;
      existing.avgResultCount = (existing.avgResultCount + searchMetric.resultCount) / 2;
      existing.cacheHitRate = searchMetric.cached
        ? (existing.cacheHitRate * (existing.frequency - 1) + 1) / existing.frequency
        : (existing.cacheHitRate * (existing.frequency - 1)) / existing.frequency;
      existing.lastSeen = searchMetric.timestamp;
    } else {
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

  private getRecentSearches(timeWindowMs: number): SearchMetrics[] {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.searchHistory.filter(s => s.timestamp >= cutoffTime);
  }

  private calculatePercentile(percentile: number): number {
    if (this.responseTimes.length === 0) return 0;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  private calculateThroughput(): number {
    const oneMinuteAgo = Date.now() - 60000;
    const recentSearches = this.searchHistory.filter(s => s.timestamp >= oneMinuteAgo);
    return recentSearches.length;
  }
}
