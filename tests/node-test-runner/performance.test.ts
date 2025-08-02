/**
 * Performance Monitor Tests using Node.js Test Runner
 * 
 * Tests performance tracking, metrics collection, and monitoring
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  PerformanceMonitor,
  getPerformanceMonitor,
  initializePerformanceMonitor,
  PerformanceTimer,
  createTimer,
} from '../../src/utils/performance.js';

// Mock logger to prevent console output during tests
const mockLogger = {
  info: mock.fn(),
  debug: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
};

describe('PerformanceMonitor (Node.js Test Runner)', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor({
      windowSize: 60000, // 1 minute
      maxSamples: 100,
    });
    
    // Reset all mock calls
    Object.values(mockLogger).forEach(fn => fn.mock.resetCalls());
  });

  afterEach(() => {
    if (performanceMonitor) {
      performanceMonitor.stopRealtimeMonitoring();
    }
  });

  describe('Tool Execution Tracking', () => {
    it('should record tool execution times', () => {
      const toolName = 'search_runbooks';
      const executionTime = 150;

      performanceMonitor.recordToolExecution(toolName, executionTime);

      const toolMetrics = performanceMonitor.getToolMetrics();
      assert(toolMetrics.has(toolName));

      const metrics = toolMetrics.get(toolName)!;
      assert.strictEqual(metrics.tool_name, toolName);
      assert.strictEqual(metrics.total_calls, 1);
      assert.strictEqual(metrics.total_time_ms, executionTime);
      assert.strictEqual(metrics.avg_time_ms, executionTime);
      assert.strictEqual(metrics.error_count, 0);
      assert.strictEqual(metrics.error_rate, 0);
    });

    it('should track multiple executions and calculate averages', () => {
      const toolName = 'get_procedure';
      const executionTimes = [100, 200, 300, 150, 250];

      executionTimes.forEach(time => {
        performanceMonitor.recordToolExecution(toolName, time);
      });

      const metrics = performanceMonitor.getToolPerformance(toolName)!;
      assert.strictEqual(metrics.total_calls, 5);
      assert.strictEqual(metrics.total_time_ms, 1000);
      assert.strictEqual(metrics.avg_time_ms, 200);
      assert.strictEqual(metrics.percentiles.p50, 200);
      assert.strictEqual(metrics.percentiles.p95, 300);
    });

    it('should track errors correctly', () => {
      const toolName = 'get_escalation_path';

      // Record successful executions
      performanceMonitor.recordToolExecution(toolName, 100, false);
      performanceMonitor.recordToolExecution(toolName, 150, false);

      // Record error execution
      performanceMonitor.recordToolExecution(toolName, 200, true);

      const metrics = performanceMonitor.getToolPerformance(toolName)!;
      assert.strictEqual(metrics.total_calls, 3);
      assert.strictEqual(metrics.error_count, 1);
      assert.strictEqual(metrics.error_rate, 1 / 3);
    });

    it('should calculate percentiles correctly', () => {
      const toolName = 'search_knowledge_base';
      const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      times.forEach(time => {
        performanceMonitor.recordToolExecution(toolName, time);
      });

      const metrics = performanceMonitor.getToolPerformance(toolName)!;
      assert.strictEqual(metrics.percentiles.p50, 50);
      assert.strictEqual(metrics.percentiles.p95, 100);
      assert.strictEqual(metrics.percentiles.p99, 100);
    });

    it('should update last_called timestamp', () => {
      const toolName = 'record_resolution_feedback';
      const beforeTime = new Date().toISOString();

      performanceMonitor.recordToolExecution(toolName, 100);

      const metrics = performanceMonitor.getToolPerformance(toolName)!;
      const afterTime = new Date().toISOString();

      const lastCalledTime = new Date(metrics.last_called).getTime();
      assert(lastCalledTime >= new Date(beforeTime).getTime());
      assert(lastCalledTime <= new Date(afterTime).getTime());
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect comprehensive system metrics', () => {
      // Record some tool executions to generate data
      performanceMonitor.recordToolExecution('test_tool', 100);
      performanceMonitor.recordToolExecution('test_tool', 200);
      performanceMonitor.recordToolExecution('test_tool', 150, true);

      const metrics = performanceMonitor.getMetrics();

      assert(metrics.response_times);
      assert.strictEqual(metrics.response_times.count, 3);
      assert.strictEqual(metrics.response_times.avg_ms, 150);
      assert.strictEqual(metrics.response_times.p50_ms, 150);
      assert.strictEqual(metrics.response_times.max_ms, 200);
      assert.strictEqual(metrics.response_times.min_ms, 100);

      assert(metrics.throughput);
      assert.strictEqual(metrics.throughput.total_requests, 3);
      assert(metrics.throughput.requests_per_second > 0);

      assert(metrics.error_tracking);
      assert.strictEqual(metrics.error_tracking.total_errors, 1);
      assert.strictEqual(metrics.error_tracking.error_rate, 1 / 3);

      assert(metrics.resource_usage);
      assert(metrics.resource_usage.memory_mb > 0);
      assert(metrics.resource_usage.heap_used_mb > 0);
    });

    it('should handle empty metrics gracefully', () => {
      const metrics = performanceMonitor.getMetrics();

      assert.strictEqual(metrics.response_times.count, 0);
      assert.strictEqual(metrics.response_times.avg_ms, 0);
      assert.strictEqual(metrics.throughput.total_requests, 0);
      assert.strictEqual(metrics.error_tracking.total_errors, 0);
      assert.strictEqual(metrics.error_tracking.error_rate, 0);
    });

    it('should track error types separately', () => {
      performanceMonitor.recordError('cache_error');
      performanceMonitor.recordError('network_error');
      performanceMonitor.recordError('cache_error');

      const metrics = performanceMonitor.getMetrics();
      assert.strictEqual(metrics.error_tracking.errors_by_type.cache_error, 2);
      assert.strictEqual(metrics.error_tracking.errors_by_type.network_error, 1);
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start and stop real-time monitoring', () => {
      assert.strictEqual((performanceMonitor as any).monitoringInterval, null);

      performanceMonitor.startRealtimeMonitoring(100); // 100ms for fast testing
      assert((performanceMonitor as any).monitoringInterval !== null);

      performanceMonitor.stopRealtimeMonitoring();
      assert.strictEqual((performanceMonitor as any).monitoringInterval, null);
    });

    it('should not start multiple monitoring intervals', () => {
      performanceMonitor.startRealtimeMonitoring(100);
      const firstInterval = (performanceMonitor as any).monitoringInterval;

      performanceMonitor.startRealtimeMonitoring(100); // Try to start again
      const secondInterval = (performanceMonitor as any).monitoringInterval;

      assert.strictEqual(firstInterval, secondInterval);
      performanceMonitor.stopRealtimeMonitoring();
    });
  });

  describe('Response Time Tracking', () => {
    it('should record response times', () => {
      const responseTime = 250;
      performanceMonitor.recordResponseTime(responseTime);

      const metrics = performanceMonitor.getMetrics();
      assert(metrics.response_times.count > 0);
      assert(metrics.response_times.avg_ms >= 0);
    });
  });

  describe('Error Recording', () => {
    it('should record errors by type', () => {
      performanceMonitor.recordError('cache_error');
      performanceMonitor.recordError('network_error');
      performanceMonitor.recordError('cache_error');

      const metrics = performanceMonitor.getMetrics();
      assert.strictEqual(metrics.error_tracking.errors_by_type.cache_error, 2);
      assert.strictEqual(metrics.error_tracking.errors_by_type.network_error, 1);
    });
  });

  describe('Performance Reports', () => {
    it('should generate performance reports', () => {
      // Record some test data
      performanceMonitor.recordToolExecution('test_tool', 100, false);
      performanceMonitor.recordToolExecution('test_tool', 200, true);

      const report = performanceMonitor.getPerformanceReport();

      assert(report.summary);
      assert(Array.isArray(report.tools));
      assert(Array.isArray(report.recommendations));
      assert(Array.isArray(report.alerts));
    });
  });

  describe('Metrics Callbacks', () => {
    it('should register and remove metrics callbacks', () => {
      const callback = mock.fn();

      performanceMonitor.onMetricsUpdate(callback);
      performanceMonitor.removeMetricsCallback(callback);

      // Should not throw
      assert.doesNotThrow(() => {
        performanceMonitor.onMetricsUpdate(callback);
        performanceMonitor.removeMetricsCallback(callback);
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      // Add some data
      performanceMonitor.recordToolExecution('test_tool', 100);
      performanceMonitor.recordError('test_error');

      // Reset
      performanceMonitor.reset();

      const metrics = performanceMonitor.getMetrics();
      assert.strictEqual(metrics.response_times.count, 0);
      assert.strictEqual(metrics.error_tracking.total_errors, 0);
    });
  });
});

describe('PerformanceTimer (Node.js Test Runner)', () => {
  it('should create and use performance timer', () => {
    const timer = createTimer();
    assert(timer instanceof PerformanceTimer);

    // Should be able to get elapsed time
    const elapsed = timer.elapsed();
    assert(typeof elapsed === 'number');
    assert(elapsed >= 0);
  });

  it('should handle lap timing', () => {
    const timer = createTimer();

    // Get lap time
    const lapTime = timer.lap();
    assert(typeof lapTime === 'number');
    assert(lapTime >= 0);

    // Get another lap time
    const lapTime2 = timer.lap();
    assert(typeof lapTime2 === 'number');
    assert(lapTime2 >= 0);
  });

  it('should reset timer', () => {
    const timer = createTimer();
    
    // Get initial elapsed time
    const elapsed1 = timer.elapsed();
    
    // Reset should not throw
    assert.doesNotThrow(() => {
      timer.reset();
    });

    // Elapsed time after reset should be close to 0
    const elapsed2 = timer.elapsed();
    assert(elapsed2 < elapsed1);
  });
});

describe('Performance Monitor Factory Functions (Node.js Test Runner)', () => {
  it('should initialize performance monitor', () => {
    const monitor = initializePerformanceMonitor({
      windowSize: 30000,
      maxSamples: 50,
    });
    
    assert(monitor instanceof PerformanceMonitor);
  });

  it('should return same monitor instance', () => {
    const monitor1 = initializePerformanceMonitor({
      windowSize: 30000,
      maxSamples: 50,
    });
    
    const monitor2 = getPerformanceMonitor();
    
    assert.strictEqual(monitor1, monitor2);
  });
});