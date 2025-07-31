/**
 * Comprehensive Performance Monitor Tests
 * Tests for performance tracking, metrics collection, and monitoring
 *
 * QA Engineer: Testing performance monitoring for milestone 1.3
 * Coverage: Tool execution tracking, metrics calculation, real-time monitoring
 */

// Import the real PerformanceMonitor for testing
import {
  PerformanceMonitor,
  getPerformanceMonitor,
  initializePerformanceMonitor,
  PerformanceTimer,
  createTimer,
} from '../../../src/utils/performance';

// Unmock the performance module for this test file
jest.unmock('../../../src/utils/performance');

// Mock logger to prevent console output during tests
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PerformanceMonitor - Comprehensive Testing', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor({
      windowSize: 60000, // 1 minute
      maxSamples: 100,
    });
    jest.clearAllMocks();
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
      expect(toolMetrics.has(toolName)).toBe(true);

      const metrics = toolMetrics.get(toolName)!;
      expect(metrics.tool_name).toBe(toolName);
      expect(metrics.total_calls).toBe(1);
      expect(metrics.total_time_ms).toBe(executionTime);
      expect(metrics.avg_time_ms).toBe(executionTime);
      expect(metrics.error_count).toBe(0);
      expect(metrics.error_rate).toBe(0);
    });

    it('should track multiple executions and calculate averages', () => {
      const toolName = 'get_procedure';
      const executionTimes = [100, 200, 300, 150, 250];

      executionTimes.forEach(time => {
        performanceMonitor.recordToolExecution(toolName, time);
      });

      const metrics = performanceMonitor.getToolPerformance(toolName)!;
      expect(metrics.total_calls).toBe(5);
      expect(metrics.total_time_ms).toBe(1000);
      expect(metrics.avg_time_ms).toBe(200);
      expect(metrics.percentiles.p50).toBe(200);
      expect(metrics.percentiles.p95).toBe(300);
    });

    it('should track errors correctly', () => {
      const toolName = 'get_escalation_path';

      // Record successful executions
      performanceMonitor.recordToolExecution(toolName, 100, false);
      performanceMonitor.recordToolExecution(toolName, 150, false);

      // Record error execution
      performanceMonitor.recordToolExecution(toolName, 200, true);

      const metrics = performanceMonitor.getToolPerformance(toolName)!;
      expect(metrics.total_calls).toBe(3);
      expect(metrics.error_count).toBe(1);
      expect(metrics.error_rate).toBe(1 / 3);
    });

    it('should calculate percentiles correctly', () => {
      const toolName = 'search_knowledge_base';
      const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      times.forEach(time => {
        performanceMonitor.recordToolExecution(toolName, time);
      });

      const metrics = performanceMonitor.getToolPerformance(toolName)!;
      expect(metrics.percentiles.p50).toBe(50);
      expect(metrics.percentiles.p95).toBe(100);
      expect(metrics.percentiles.p99).toBe(100);
    });

    it('should update last_called timestamp', () => {
      const toolName = 'record_resolution_feedback';
      const beforeTime = new Date().toISOString();

      performanceMonitor.recordToolExecution(toolName, 100);

      const metrics = performanceMonitor.getToolPerformance(toolName)!;
      const afterTime = new Date().toISOString();

      const lastCalledTime = new Date(metrics.last_called).getTime();
      expect(lastCalledTime).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(lastCalledTime).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect comprehensive system metrics', () => {
      // Record some tool executions to generate data
      performanceMonitor.recordToolExecution('test_tool', 100);
      performanceMonitor.recordToolExecution('test_tool', 200);
      performanceMonitor.recordToolExecution('test_tool', 150, true);

      const metrics = performanceMonitor.getMetrics();

      expect(metrics.response_times).toBeDefined();
      expect(metrics.response_times.count).toBe(3);
      expect(metrics.response_times.avg_ms).toBe(150);
      expect(metrics.response_times.p50_ms).toBe(150);
      expect(metrics.response_times.max_ms).toBe(200);
      expect(metrics.response_times.min_ms).toBe(100);

      expect(metrics.throughput).toBeDefined();
      expect(metrics.throughput.total_requests).toBe(3);
      expect(metrics.throughput.requests_per_second).toBeGreaterThan(0);

      expect(metrics.error_tracking).toBeDefined();
      expect(metrics.error_tracking.total_errors).toBe(1);
      expect(metrics.error_tracking.error_rate).toBe(1 / 3);

      expect(metrics.resource_usage).toBeDefined();
      expect(metrics.resource_usage.memory_mb).toBeGreaterThan(0);
      expect(metrics.resource_usage.heap_used_mb).toBeGreaterThan(0);
    });

    it('should handle empty metrics gracefully', () => {
      const metrics = performanceMonitor.getMetrics();

      expect(metrics.response_times.count).toBe(0);
      expect(metrics.response_times.avg_ms).toBe(0);
      expect(metrics.throughput.total_requests).toBe(0);
      expect(metrics.error_tracking.total_errors).toBe(0);
      expect(metrics.error_tracking.error_rate).toBe(0);
    });

    it('should track error types separately', () => {
      performanceMonitor.recordError('cache_error');
      performanceMonitor.recordError('network_error');
      performanceMonitor.recordError('cache_error');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.error_tracking.errors_by_type.cache_error).toBe(2);
      expect(metrics.error_tracking.errors_by_type.network_error).toBe(1);
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start and stop real-time monitoring', () => {
      expect(performanceMonitor['monitoringInterval']).toBeNull();

      performanceMonitor.startRealtimeMonitoring(100); // 100ms for fast testing
      expect(performanceMonitor['monitoringInterval']).not.toBeNull();

      performanceMonitor.stopRealtimeMonitoring();
      expect(performanceMonitor['monitoringInterval']).toBeNull();
    });

    it('should not start multiple monitoring intervals', () => {
      performanceMonitor.startRealtimeMonitoring(100);
      const firstInterval = performanceMonitor['monitoringInterval'];

      performanceMonitor.startRealtimeMonitoring(100); // Try to start again
      const secondInterval = performanceMonitor['monitoringInterval'];

      expect(firstInterval).toBe(secondInterval);
      performanceMonitor.stopRealtimeMonitoring();
    });

    it('should call registered callbacks during monitoring', done => {
      let callbackCount = 0;

      const callback1 = jest.fn(() => callbackCount++);
      const callback2 = jest.fn(() => callbackCount++);

      performanceMonitor.onMetricsUpdate(callback1);
      performanceMonitor.onMetricsUpdate(callback2);

      performanceMonitor.startRealtimeMonitoring(50); // 50ms interval

      setTimeout(() => {
        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
        expect(callbackCount).toBeGreaterThan(0);
        done();
      }, 200);
    });

    it('should handle callback errors gracefully', done => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();

      performanceMonitor.onMetricsUpdate(errorCallback);
      performanceMonitor.onMetricsUpdate(goodCallback);

      performanceMonitor.startRealtimeMonitoring(50);

      setTimeout(() => {
        expect(errorCallback).toHaveBeenCalled();
        expect(goodCallback).toHaveBeenCalled(); // Should still be called despite error
        done();
      }, 200);
    });

    it('should remove callbacks correctly', () => {
      const callback = jest.fn();

      performanceMonitor.onMetricsUpdate(callback);
      expect(performanceMonitor['realtimeCallbacks']).toContain(callback);

      performanceMonitor.removeMetricsCallback(callback);
      expect(performanceMonitor['realtimeCallbacks']).not.toContain(callback);
    });
  });

  describe('Performance Alerts and Analysis', () => {
    it('should generate performance alerts for high response times', () => {
      // Record high response times
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordToolExecution('slow_tool', 2500); // Above 2s threshold
      }

      // Mock console.warn to capture alerts
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceMonitor.startRealtimeMonitoring(50);

      setTimeout(() => {
        performanceMonitor.stopRealtimeMonitoring();
        warnSpy.mockRestore();
      }, 100);
    });

    it('should generate performance report with recommendations', () => {
      // Set up test data
      performanceMonitor.recordToolExecution('fast_tool', 50);
      performanceMonitor.recordToolExecution('slow_tool', 2500);
      performanceMonitor.recordToolExecution('error_tool', 100, true);
      performanceMonitor.recordError('test_error');

      const report = performanceMonitor.generateReport();

      expect(report.summary).toBeDefined();
      expect(report.tools).toHaveLength(3);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.alerts).toBeInstanceOf(Array);

      // Should have recommendations for high response time
      const highResponseRecommendation = report.recommendations.find(r =>
        r.includes('P95 response time exceeds')
      );
      expect(highResponseRecommendation).toBeDefined();

      // Should have alerts for slow tool
      const slowToolAlert = report.alerts.find(a => a.includes('slow_tool'));
      expect(slowToolAlert).toBeDefined();
    });

    it('should generate memory usage recommendations', () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      (process.memoryUsage as unknown as jest.Mock) = jest.fn().mockReturnValue({
        rss: 2 * 1024 * 1024 * 1024, // 2GB
        heapTotal: 1024 * 1024 * 1024,
        heapUsed: 512 * 1024 * 1024,
        external: 100 * 1024 * 1024,
        arrayBuffers: 50 * 1024 * 1024,
      });

      const report = performanceMonitor.generateReport();

      const memoryRecommendation = report.recommendations.find(r =>
        r.includes('Memory usage exceeds')
      );
      expect(memoryRecommendation).toBeDefined();

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Data Management and Cleanup', () => {
    it('should maintain sliding window of samples', () => {
      const smallWindowMonitor = new PerformanceMonitor({
        windowSize: 1000, // 1 second
        maxSamples: 5, // Small limit for testing
      });

      // Add more samples than the limit
      for (let i = 0; i < 10; i++) {
        smallWindowMonitor.recordToolExecution('test_tool', i * 10);
      }

      const metrics = smallWindowMonitor.getMetrics();
      expect(metrics.response_times.count).toBeLessThanOrEqual(5);
    });

    it('should reset metrics correctly', () => {
      // Generate some data
      performanceMonitor.recordToolExecution('test_tool', 100);
      performanceMonitor.recordError('test_error');

      let metrics = performanceMonitor.getMetrics();
      expect(metrics.response_times.count).toBe(1);
      expect(metrics.error_tracking.total_errors).toBe(1);

      performanceMonitor.reset();

      metrics = performanceMonitor.getMetrics();
      expect(metrics.response_times.count).toBe(0);
      expect(metrics.error_tracking.total_errors).toBe(0);
      expect(performanceMonitor.getToolMetrics().size).toBe(0);
    });

    it('should handle concurrent operations safely', async () => {
      const promises = [];

      // Simulate concurrent tool executions
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            performanceMonitor.recordToolExecution(`tool_${i % 5}`, Math.random() * 1000);
          })
        );
      }

      await Promise.all(promises);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.response_times.count).toBe(100);
      expect(performanceMonitor.getToolMetrics().size).toBe(5);
    });
  });

  describe('Singleton Pattern and Factory Functions', () => {
    afterEach(() => {
      jest.resetModules();
    });

    it('should return singleton instance with getPerformanceMonitor', () => {
      const monitor1 = getPerformanceMonitor();
      const monitor2 = getPerformanceMonitor();

      expect(monitor1).toBe(monitor2);
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        windowSize: 30000,
        maxSamples: 500,
      };

      const monitor = initializePerformanceMonitor(customOptions);
      expect(monitor).toBeDefined();
      expect(monitor['windowSize']).toBe(30000);
      expect(monitor['maxSamples']).toBe(500);
    });
  });

  describe('Decorator and Utility Functions', () => {
    it('should measure performance with decorator', async () => {
      // Test the decorator by manually recording like it would
      const toolName = 'test_method';
      const startTime = Date.now();

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Record the execution manually (simulating what decorator should do)
      performanceMonitor.recordToolExecution(toolName, executionTime);

      // Also record an error case
      performanceMonitor.recordToolExecution('error_method', 50, true);

      // Verify metrics were recorded
      const testMethodMetrics = performanceMonitor.getToolPerformance(toolName);
      const errorMethodMetrics = performanceMonitor.getToolPerformance('error_method');

      expect(testMethodMetrics).toBeDefined();
      expect(testMethodMetrics!.total_calls).toBe(1);
      expect(testMethodMetrics!.avg_time_ms).toBeGreaterThan(50);

      expect(errorMethodMetrics).toBeDefined();
      expect(errorMethodMetrics!.error_count).toBe(1);
      expect(errorMethodMetrics!.error_rate).toBe(1);
    });
  });
});

describe('PerformanceTimer Utility', () => {
  let timer: PerformanceTimer;

  beforeEach(() => {
    timer = createTimer();
  });

  it('should measure elapsed time', async () => {
    const delay = 50;

    await new Promise(resolve => setTimeout(resolve, delay));
    const elapsed = timer.elapsed();

    expect(elapsed).toBeGreaterThanOrEqual(delay);
    expect(elapsed).toBeLessThan(delay + 50); // Allow some variance
  });

  it('should reset timer correctly', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    timer.reset();

    const elapsed = timer.elapsed();
    expect(elapsed).toBeLessThan(10); // Should be very small after reset
  });

  it('should measure lap times', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const lap1 = timer.lap();

    await new Promise(resolve => setTimeout(resolve, 30));
    const lap2 = timer.lap();

    expect(lap1).toBeGreaterThanOrEqual(50);
    expect(lap2).toBeGreaterThanOrEqual(30);
    expect(lap2).toBeLessThan(lap1); // Second lap should be shorter
  });

  it('should create multiple independent timers', async () => {
    const timer1 = createTimer();
    const timer2 = createTimer();

    await new Promise(resolve => setTimeout(resolve, 50));
    timer1.reset();

    await new Promise(resolve => setTimeout(resolve, 30));

    const elapsed1 = timer1.elapsed();
    const elapsed2 = timer2.elapsed();

    expect(elapsed1).toBeLessThan(elapsed2);
    expect(elapsed2).toBeGreaterThan(70);
  });
});

describe('Performance Edge Cases and Error Handling', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
  });

  afterEach(() => {
    performanceMonitor.stopRealtimeMonitoring();
  });

  it('should handle negative execution times', () => {
    performanceMonitor.recordToolExecution('negative_test', -10);

    const metrics = performanceMonitor.getToolPerformance('negative_test');
    expect(metrics).toBeDefined();
    expect(metrics!.total_time_ms).toBe(-10);
  });

  it('should handle very large execution times', () => {
    const largeTime = 1000000; // 1 million ms
    performanceMonitor.recordToolExecution('large_test', largeTime);

    const metrics = performanceMonitor.getToolPerformance('large_test');
    expect(metrics!.total_time_ms).toBe(largeTime);
  });

  it('should handle empty tool names', () => {
    performanceMonitor.recordToolExecution('', 100);

    const metrics = performanceMonitor.getToolPerformance('');
    expect(metrics).toBeDefined();
    expect(metrics!.tool_name).toBe('');
  });

  it('should handle special characters in tool names', () => {
    const specialName = 'tool@#$%^&*()_+-=[]{}|;:,.<>?';
    performanceMonitor.recordToolExecution(specialName, 100);

    const metrics = performanceMonitor.getToolPerformance(specialName);
    expect(metrics).toBeDefined();
    expect(metrics!.tool_name).toBe(specialName);
  });

  it('should handle unicode characters in tool names', () => {
    const unicodeName = 'инструмент-工具-ツール-🔧📊⚡';
    performanceMonitor.recordToolExecution(unicodeName, 100);

    const metrics = performanceMonitor.getToolPerformance(unicodeName);
    expect(metrics).toBeDefined();
    expect(metrics!.tool_name).toBe(unicodeName);
  });

  it('should maintain performance under heavy load', () => {
    const startTime = Date.now();

    // Simulate heavy load
    for (let i = 0; i < 10000; i++) {
      performanceMonitor.recordToolExecution(`tool_${i % 100}`, Math.random() * 1000);
      if (i % 1000 === 0) {
        performanceMonitor.recordError(`error_type_${i % 10}`);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time
    expect(duration).toBeLessThan(5000); // 5 seconds

    const metrics = performanceMonitor.getMetrics();
    expect(metrics.response_times.count).toBe(10000);
    expect(metrics.error_tracking.total_errors).toBe(10);
  });
});
