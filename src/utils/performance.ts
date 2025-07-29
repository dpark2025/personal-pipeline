/**
 * Performance Monitoring Utilities
 * 
 * Comprehensive performance tracking and metrics collection for MCP tools,
 * caching, and system resources with real-time monitoring capabilities.
 */

import { performance } from 'perf_hooks';
import { logger } from './logger.js';

export interface PerformanceMetrics {
  response_times: {
    count: number;
    total_ms: number;
    avg_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    max_ms: number;
    min_ms: number;
  };
  throughput: {
    requests_per_second: number;
    total_requests: number;
    window_size_seconds: number;
  };
  error_tracking: {
    total_errors: number;
    error_rate: number;
    errors_by_type: Record<string, number>;
  };
  resource_usage: {
    memory_mb: number;
    heap_used_mb: number;
    cpu_percent: number;
    active_handles: number;
    active_requests: number;
  };
  cache_performance: {
    hit_rate: number;
    total_operations: number;
    avg_response_time_ms: number;
  };
}

export interface ToolPerformanceData {
  tool_name: string;
  total_calls: number;
  total_time_ms: number;
  avg_time_ms: number;
  error_count: number;
  error_rate: number;
  last_called: string;
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private toolMetrics: Map<string, ToolPerformanceData> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private startTime: number = Date.now();
  private windowSize: number = 60000; // 1 minute sliding window
  private maxSamples: number = 1000; // Keep last 1000 samples
  
  // Real-time monitoring
  private monitoringInterval: NodeJS.Timeout | null = null;
  private realtimeCallbacks: Array<(metrics: PerformanceMetrics) => void> = [];

  constructor(options: { windowSize?: number; maxSamples?: number } = {}) {
    this.windowSize = options.windowSize || 60000;
    this.maxSamples = options.maxSamples || 1000;
  }

  /**
   * Record a tool execution time
   */
  recordToolExecution(toolName: string, executionTimeMs: number, isError: boolean = false): void {
    
    // Record in sliding window
    const key = `tool_${toolName}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const samples = this.metrics.get(key)!;
    samples.push(executionTimeMs);
    
    // Maintain sliding window
    this.pruneOldSamples(samples);

    // Update tool-specific metrics
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

    // Calculate percentiles
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

  /**
   * Record an error occurrence
   */
  recordError(errorType: string): void {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const allResponseTimes: number[] = [];
    let totalRequests = 0;

    // Aggregate all tool response times
    for (const [key, samples] of this.metrics.entries()) {
      if (key.startsWith('tool_')) {
        allResponseTimes.push(...samples);
        totalRequests += samples.length;
      }
    }

    const sortedTimes = allResponseTimes.sort((a, b) => a - b);
    const uptime = (Date.now() - this.startTime) / 1000;
    
    // Calculate throughput
    const requestsPerSecond = totalRequests > 0 ? totalRequests / Math.min(uptime, this.windowSize / 1000) : 0;

    // Calculate error metrics
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // Get system resource metrics
    const memUsage = process.memoryUsage();
    const resourceMetrics = {
      memory_mb: Math.round(memUsage.rss / 1024 / 1024),
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      cpu_percent: this.getCPUUsage(),
      active_handles: (process as any)._getActiveHandles().length,
      active_requests: (process as any)._getActiveRequests().length,
    };

    return {
      response_times: {
        count: sortedTimes.length,
        total_ms: sortedTimes.reduce((sum, time) => sum + time, 0),
        avg_ms: sortedTimes.length > 0 ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length : 0,
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
        hit_rate: 0, // Will be populated by cache service
        total_operations: 0,
        avg_response_time_ms: 0,
      },
    };
  }

  /**
   * Get tool-specific performance data
   */
  getToolMetrics(): Map<string, ToolPerformanceData> {
    return new Map(this.toolMetrics);
  }

  /**
   * Get performance data for a specific tool
   */
  getToolPerformance(toolName: string): ToolPerformanceData | null {
    return this.toolMetrics.get(toolName) || null;
  }

  /**
   * Start real-time monitoring
   */
  startRealtimeMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      return; // Already running
    }

    this.monitoringInterval = setInterval(() => {
      const metrics = this.getMetrics();
      
      // Call all registered callbacks
      for (const callback of this.realtimeCallbacks) {
        try {
          callback(metrics);
        } catch (error) {
          logger.error('Real-time monitoring callback failed', { error });
        }
      }

      // Log performance alerts
      this.checkPerformanceAlerts(metrics);
    }, intervalMs);

    logger.info('Real-time performance monitoring started', {
      interval_ms: intervalMs,
      callbacks: this.realtimeCallbacks.length,
    });
  }

  /**
   * Stop real-time monitoring
   */
  stopRealtimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Real-time performance monitoring stopped');
    }
  }

  /**
   * Register callback for real-time metrics
   */
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): void {
    this.realtimeCallbacks.push(callback);
  }

  /**
   * Remove metrics update callback
   */
  removeMetricsCallback(callback: (metrics: PerformanceMetrics) => void): void {
    const index = this.realtimeCallbacks.indexOf(callback);
    if (index > -1) {
      this.realtimeCallbacks.splice(index, 1);
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.toolMetrics.clear();
    this.errorCounts.clear();
    this.startTime = Date.now();
    
    logger.info('Performance metrics reset');
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: PerformanceMetrics;
    tools: ToolPerformanceData[];
    recommendations: string[];
    alerts: string[];
  } {
    const summary = this.getMetrics();
    const tools = Array.from(this.toolMetrics.values());
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Generate recommendations based on metrics
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

    // Check for performance alerts
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

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    const alerts: string[] = [];

    // Response time alerts
    if (metrics.response_times.p95_ms > 2000) {
      alerts.push(`HIGH: P95 response time is ${metrics.response_times.p95_ms.toFixed(0)}ms (>2s)`);
    }

    // Error rate alerts
    if (metrics.error_tracking.error_rate > 0.1) {
      alerts.push(`HIGH: Error rate is ${(metrics.error_tracking.error_rate * 100).toFixed(1)}% (>10%)`);
    }

    // Memory alerts
    if (metrics.resource_usage.memory_mb > 2048) {
      alerts.push(`MEDIUM: Memory usage is ${metrics.resource_usage.memory_mb}MB (>2GB)`);
    }

    // Throughput alerts
    if (metrics.throughput.requests_per_second > 0 && metrics.throughput.requests_per_second < 1) {
      alerts.push(`MEDIUM: Low throughput: ${metrics.throughput.requests_per_second.toFixed(1)} req/s`);
    }

    // Log alerts
    for (const alert of alerts) {
      logger.warn('Performance alert', { alert });
    }
  }

  /**
   * Get CPU usage percentage (simplified)
   */
  private getCPUUsage(): number {
    // This is a simplified CPU usage calculation
    // In production, you might want to use a more sophisticated method
    const usage = process.cpuUsage();
    return Math.round((usage.user + usage.system) / 1000) / 10; // Convert to percentage
  }

  /**
   * Calculate percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))] || 0;
  }

  /**
   * Remove old samples outside the sliding window
   */
  private pruneOldSamples(samples: number[]): void {
    // Keep only the most recent samples up to maxSamples
    if (samples.length > this.maxSamples) {
      samples.splice(0, samples.length - this.maxSamples);
    }
  }
}

// Global performance monitor instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

/**
 * Get the global performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
}

/**
 * Initialize performance monitor with custom options
 */
export function initializePerformanceMonitor(options?: { windowSize?: number; maxSamples?: number }): PerformanceMonitor {
  performanceMonitorInstance = new PerformanceMonitor(options);
  return performanceMonitorInstance;
}

/**
 * Performance measurement decorator for async functions
 */
export function measurePerformance(toolName: string) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const startTime = performance.now();
      let isError = false;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        isError = true;
        throw error;
      } finally {
        const executionTime = performance.now() - startTime;
        monitor.recordToolExecution(toolName, executionTime, isError);
      }
    };
  };
}

/**
 * Simple performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Get elapsed time in milliseconds
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.startTime = performance.now();
  }

  /**
   * Get elapsed time and reset
   */
  lap(): number {
    const elapsed = this.elapsed();
    this.reset();
    return elapsed;
  }
}

/**
 * Create a new performance timer
 */
export function createTimer(): PerformanceTimer {
  return new PerformanceTimer();
}