/**
 * Performance Analytics Module for Enhanced MCP Tool Explorer
 *
 * Authored by: Backend Technical Lead Agent
 * Date: 2025-08-15
 *
 * Provides comprehensive performance tracking, metrics collection,
 * and analytics for MCP tool usage with intelligent insights.
 */

import chalk from 'chalk';

interface RequestRecord {
  id: string;
  tool: string;
  timestamp: Date;
  responseTime: number;
  success: boolean;
  error?: string;
  parameters?: any;
}

interface ToolMetrics {
  calls: number;
  successfulCalls: number;
  failedCalls: number;
  totalResponseTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
  lastUsed: Date;
  errors: string[];
}

interface PerformanceThresholds {
  excellent: number; // < 100ms
  good: number; // < 300ms
  warning: number; // < 500ms
  critical: number; // >= 500ms
}

interface PerformanceTrend {
  period: string;
  avgResponseTime: number;
  successRate: number;
  requestCount: number;
}

/**
 * Comprehensive performance analytics and monitoring
 */
export class PerformanceAnalytics {
  private requests: RequestRecord[] = [];
  private maxRecords: number = 10000;
  private thresholds: PerformanceThresholds = {
    excellent: 100,
    good: 300,
    warning: 500,
    critical: 500,
  };

  constructor() {
    // Initialize with empty state
  }

  /**
   * Record a request for analytics
   */
  recordRequest(
    tool: string,
    responseTime: number,
    success: boolean,
    error?: string,
    parameters?: any
  ): void {
    const record: RequestRecord = {
      id: this.generateId(),
      tool,
      timestamp: new Date(),
      responseTime,
      success,
      ...(error && { error }),
      ...(parameters && { parameters }),
    };

    this.requests.push(record);

    // Keep within memory limits
    if (this.requests.length > this.maxRecords) {
      this.requests = this.requests.slice(-this.maxRecords);
    }
  }

  /**
   * Get total number of requests
   */
  getTotalRequests(): number {
    return this.requests.length;
  }

  /**
   * Get overall average response time
   */
  getAverageResponseTime(): number {
    if (this.requests.length === 0) return 0;

    const total = this.requests.reduce((sum, req) => sum + req.responseTime, 0);
    return total / this.requests.length;
  }

  /**
   * Get overall success rate
   */
  getSuccessRate(): number {
    if (this.requests.length === 0) return 1;

    const successful = this.requests.filter(req => req.success).length;
    return successful / this.requests.length;
  }

  /**
   * Get tool-specific metrics
   */
  getToolStats(): Record<string, ToolMetrics> {
    const stats: Record<string, ToolMetrics> = {};

    this.requests.forEach(req => {
      if (!stats[req.tool]) {
        stats[req.tool] = {
          calls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalResponseTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0,
          successRate: 0,
          lastUsed: new Date(0),
          errors: [],
        };
      }

      const toolStats = stats[req.tool]!;
      toolStats.calls++;
      toolStats.totalResponseTime += req.responseTime;

      if (req.success) {
        toolStats.successfulCalls++;
      } else {
        toolStats.failedCalls++;
        if (req.error && !toolStats.errors.includes(req.error)) {
          toolStats.errors.push(req.error);
        }
      }

      toolStats.minTime = Math.min(toolStats.minTime, req.responseTime);
      toolStats.maxTime = Math.max(toolStats.maxTime, req.responseTime);

      if (req.timestamp > toolStats.lastUsed) {
        toolStats.lastUsed = req.timestamp;
      }
    });

    // Calculate derived metrics
    Object.values(stats).forEach(toolStats => {
      toolStats.avgTime = toolStats.totalResponseTime / toolStats.calls;
      toolStats.successRate = toolStats.successfulCalls / toolStats.calls;
      if (toolStats.minTime === Infinity) toolStats.minTime = 0;
    });

    return stats;
  }

  /**
   * Get recent activity (last N requests)
   */
  getRecentActivity(limit: number = 20): RequestRecord[] {
    return this.requests
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(periodType: 'hour' | 'day' | 'week' = 'hour'): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    const now = new Date();
    const periods = this.getPeriods(periodType, now);

    periods.forEach(period => {
      const periodRequests = this.requests.filter(
        req => req.timestamp >= period.start && req.timestamp < period.end
      );

      if (periodRequests.length > 0) {
        const avgResponseTime =
          periodRequests.reduce((sum, req) => sum + req.responseTime, 0) / periodRequests.length;
        const successCount = periodRequests.filter(req => req.success).length;
        const successRate = successCount / periodRequests.length;

        trends.push({
          period: period.label,
          avgResponseTime,
          successRate,
          requestCount: periodRequests.length,
        });
      }
    });

    return trends;
  }

  /**
   * Get performance insights and recommendations
   */
  getPerformanceInsights(): string[] {
    const insights: string[] = [];
    const toolStats = this.getToolStats();
    const recentRequests = this.getRecentActivity(100);

    // Overall performance insights
    const avgResponseTime = this.getAverageResponseTime();
    const successRate = this.getSuccessRate();

    if (avgResponseTime > this.thresholds.warning) {
      insights.push(
        `⚠️  Average response time (${avgResponseTime.toFixed(1)}ms) exceeds warning threshold`
      );
    } else if (avgResponseTime < this.thresholds.excellent) {
      insights.push(`✅ Excellent average response time (${avgResponseTime.toFixed(1)}ms)`);
    }

    if (successRate < 0.9) {
      insights.push(`🚨 Success rate (${(successRate * 100).toFixed(1)}%) is below 90%`);
    } else if (successRate >= 0.99) {
      insights.push(`🌟 Outstanding success rate (${(successRate * 100).toFixed(1)}%)`);
    }

    // Tool-specific insights
    Object.entries(toolStats).forEach(([tool, stats]) => {
      if (stats.avgTime > this.thresholds.critical) {
        insights.push(`🐌 ${tool} is consistently slow (${stats.avgTime.toFixed(1)}ms avg)`);
      }

      if (stats.successRate < 0.8) {
        insights.push(`❌ ${tool} has low success rate (${(stats.successRate * 100).toFixed(1)}%)`);
      }

      if (stats.calls > 50 && stats.avgTime < this.thresholds.excellent) {
        insights.push(`⚡ ${tool} is performing excellently (${stats.avgTime.toFixed(1)}ms avg)`);
      }
    });

    // Recent trends
    const recentFailures = recentRequests.filter(req => !req.success);
    if (recentFailures.length > recentRequests.length * 0.2) {
      insights.push(
        `📈 Recent failure rate is elevated (${recentFailures.length}/${recentRequests.length})`
      );
    }

    // Performance variance insights
    Object.entries(toolStats).forEach(([tool, stats]) => {
      const variance = stats.maxTime - stats.minTime;
      if (variance > 1000) {
        insights.push(
          `📊 ${tool} shows high response time variance (${stats.minTime}ms - ${stats.maxTime}ms)`
        );
      }
    });

    return insights;
  }

  /**
   * Get performance summary for display
   */
  getPerformanceSummary(): {
    overview: any;
    topPerformers: any[];
    slowest: any[];
    mostUsed: any[];
    recentFailures: any[];
  } {
    const toolStats = this.getToolStats();
    const recentActivity = this.getRecentActivity(50);

    // Sort tools by different criteria
    const toolEntries = Object.entries(toolStats);

    const topPerformers = toolEntries
      .filter(([, stats]) => stats.calls >= 5) // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
      .sort((a, b) => a[1].avgTime - b[1].avgTime)
      .slice(0, 3)
      .map(([tool, stats]) => ({
        tool,
        avgTime: stats.avgTime,
        successRate: stats.successRate,
        calls: stats.calls,
      }));

    const slowest = toolEntries
      .sort((a, b) => b[1].avgTime - a[1].avgTime)
      .slice(0, 3)
      .map(([tool, stats]) => ({
        tool,
        avgTime: stats.avgTime,
        maxTime: stats.maxTime,
        calls: stats.calls,
      }));

    const mostUsed = toolEntries
      .sort((a, b) => b[1].calls - a[1].calls)
      .slice(0, 5)
      .map(([tool, stats]) => ({
        tool,
        calls: stats.calls,
        avgTime: stats.avgTime,
        successRate: stats.successRate,
      }));

    const recentFailures = recentActivity
      .filter(req => !req.success)
      .slice(0, 5)
      .map(req => ({
        tool: req.tool,
        error: req.error,
        timestamp: req.timestamp,
        responseTime: req.responseTime,
      }));

    return {
      overview: {
        totalRequests: this.getTotalRequests(),
        avgResponseTime: this.getAverageResponseTime(),
        successRate: this.getSuccessRate(),
        uniqueTools: Object.keys(toolStats).length,
      },
      topPerformers,
      slowest,
      mostUsed,
      recentFailures,
    };
  }

  /**
   * Export analytics data
   */
  exportData(): any {
    return {
      summary: this.getPerformanceSummary(),
      toolStats: this.getToolStats(),
      recentActivity: this.getRecentActivity(100),
      trends: this.getPerformanceTrends(),
      insights: this.getPerformanceInsights(),
      thresholds: this.thresholds,
      exportedAt: new Date(),
    };
  }

  /**
   * Reset analytics data
   */
  reset(): void {
    this.requests = [];
  }

  /**
   * Get performance rating for a response time
   */
  getPerformanceRating(responseTime: number): {
    rating: 'excellent' | 'good' | 'warning' | 'critical';
    color: string;
    emoji: string;
  } {
    if (responseTime < this.thresholds.excellent) {
      return { rating: 'excellent', color: 'green', emoji: '🚀' };
    } else if (responseTime < this.thresholds.good) {
      return { rating: 'good', color: 'cyan', emoji: '✅' };
    } else if (responseTime < this.thresholds.warning) {
      return { rating: 'warning', color: 'yellow', emoji: '⚠️' };
    } else {
      return { rating: 'critical', color: 'red', emoji: '🐌' };
    }
  }

  /**
   * Get colored response time display
   */
  formatResponseTime(responseTime: number): string {
    const rating = this.getPerformanceRating(responseTime);
    const chalkFunction = (chalk as any)[rating.color];
    return chalkFunction(`${responseTime}ms ${rating.emoji}`);
  }

  /**
   * Get success rate color
   */
  formatSuccessRate(successRate: number): string {
    if (successRate >= 0.95) {
      return chalk.green(`${(successRate * 100).toFixed(1)}% 🌟`);
    } else if (successRate >= 0.9) {
      return chalk.cyan(`${(successRate * 100).toFixed(1)}% ✅`);
    } else if (successRate >= 0.8) {
      return chalk.yellow(`${(successRate * 100).toFixed(1)}% ⚠️`);
    } else {
      return chalk.red(`${(successRate * 100).toFixed(1)}% ❌`);
    }
  }

  /**
   * Get request count display
   */
  formatRequestCount(count: number): string {
    if (count > 1000) {
      return chalk.cyan(`${(count / 1000).toFixed(1)}K requests`);
    } else if (count > 100) {
      return chalk.blue(`${count} requests`);
    } else if (count > 10) {
      return chalk.gray(`${count} requests`);
    } else {
      return chalk.gray(`${count} request${count === 1 ? '' : 's'}`);
    }
  }

  /**
   * Helper methods
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getPeriods(
    periodType: 'hour' | 'day' | 'week',
    now: Date
  ): Array<{
    start: Date;
    end: Date;
    label: string;
  }> {
    const periods = [];
    let maxPeriods = 0;
    let duration = 0;
    let labelFormat = '';

    switch (periodType) {
      case 'hour':
        maxPeriods = 24;
        duration = 60 * 60 * 1000; // 1 hour in ms
        labelFormat = 'HH:00';
        break;
      case 'day':
        maxPeriods = 7;
        duration = 24 * 60 * 60 * 1000; // 1 day in ms
        labelFormat = 'MMM DD';
        break;
      case 'week':
        maxPeriods = 4;
        duration = 7 * 24 * 60 * 60 * 1000; // 1 week in ms
        labelFormat = 'Week of MMM DD';
        break;
    }

    for (let i = maxPeriods - 1; i >= 0; i--) {
      const end = new Date(now.getTime() - i * duration);
      const start = new Date(end.getTime() - duration);

      periods.push({
        start,
        end,
        label: this.formatPeriodLabel(start, labelFormat) || 'Unknown',
      });
    }

    return periods;
  }

  private formatPeriodLabel(date: Date, format: string): string {
    // Simple date formatting - in production, use a proper date library
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    switch (format) {
      case 'HH:00':
        return `${date.getHours().toString().padStart(2, '0')}:00`;
      case 'MMM DD':
        return `${months[date.getMonth()]} ${date.getDate()}`;
      case 'Week of MMM DD':
        return `Week of ${months[date.getMonth()]} ${date.getDate()}`;
      default:
        return date.toISOString().split('T')[0] || 'Unknown';
    }
  }
}
