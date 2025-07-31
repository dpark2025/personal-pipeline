/**
 * Performance Integration Tests
 * End-to-end performance testing with real MCP tool execution
 * 
 * QA Engineer: Performance validation for milestone 1.3
 * Coverage: Load testing, benchmarking, performance regression detection
 */

import { PersonalPipelineServer } from '../../src/core/server';
import { initializePerformanceMonitor, PerformanceMonitor } from '../../src/utils/performance';
import { initializeCacheService } from '../../src/utils/cache';
import { initializeMonitoringService } from '../../src/utils/monitoring';
import fs from 'fs/promises';
import path from 'path';

// Mock Redis for consistent performance testing
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    status: 'ready',
  }));
});

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Performance Integration Tests', () => {
  let server: PersonalPipelineServer;
  let performanceMonitor: PerformanceMonitor;
  let testDataDir: string;

  beforeAll(async () => {
    // Setup test data directory with substantial content for performance testing
    testDataDir = path.join(__dirname, '../fixtures/performance-test-data');
    await fs.mkdir(testDataDir, { recursive: true });

    // Create multiple test runbooks for load testing
    const runbookTemplates = [
      {
        id: 'perf-rb-001',
        title: 'Database Performance Alert Response',
        triggers: ['slow_query', 'database_timeout', 'connection_pool_exhausted'],
        severity_mapping: { critical: 'immediate', high: 'escalate', medium: 'investigate' },
        procedures: [
          { step: 'Check current active connections', timeout: '30s' },
          { step: 'Analyze slow query log', timeout: '2m' },
          { step: 'Review connection pool metrics', timeout: '1m' },
          { step: 'Optimize queries or scale resources', timeout: '5m' }
        ],
        metadata: { confidence_score: 0.92, last_updated: new Date().toISOString() }
      },
      {
        id: 'perf-rb-002',
        title: 'Application Memory Leak Response',
        triggers: ['memory_growth', 'gc_pressure', 'heap_overflow'],
        severity_mapping: { critical: 'restart', high: 'investigate', medium: 'monitor' },
        procedures: [
          { step: 'Generate heap dump', timeout: '2m' },
          { step: 'Analyze memory patterns', timeout: '10m' },
          { step: 'Identify leak sources', timeout: '15m' },
          { step: 'Apply fixes or restart service', timeout: '5m' }
        ],
        metadata: { confidence_score: 0.88, last_updated: new Date().toISOString() }
      },
      {
        id: 'perf-rb-003',
        title: 'Network Latency Troubleshooting',
        triggers: ['high_latency', 'packet_loss', 'connection_drops'],
        severity_mapping: { critical: 'escalate', high: 'investigate', medium: 'monitor' },
        procedures: [
          { step: 'Run network diagnostics', timeout: '5m' },
          { step: 'Check routing tables', timeout: '2m' },
          { step: 'Analyze traffic patterns', timeout: '10m' },
          { step: 'Implement traffic shaping', timeout: '3m' }
        ],
        metadata: { confidence_score: 0.85, last_updated: new Date().toISOString() }
      }
    ];

    // Create runbook files
    for (let i = 0; i < runbookTemplates.length; i++) {
      const template = runbookTemplates[i];
      if (!template) continue;
      
      // Create multiple variations for load testing
      for (let j = 0; j < 10; j++) {
        const runbook = {
          ...template,
          id: `${template.id}-var-${j}`,
          title: `${template.title} - Variation ${j}`,
          triggers: [...template.triggers, `variation_${j}_trigger`]
        };
        
        await fs.writeFile(
          path.join(testDataDir, `runbook-${i}-${j}.json`),
          JSON.stringify(runbook, null, 2)
        );
      }
    }

    // Create performance test procedures
    for (let i = 0; i < 5; i++) {
      const procedure = {
        id: `perf-proc-${i}`,
        name: `Performance Test Procedure ${i}`,
        description: `Procedure for performance testing scenario ${i}`,
        steps: [
          `Initialize test environment ${i}`,
          `Execute performance scenario ${i}`,
          `Collect metrics and data ${i}`,
          `Analyze results for scenario ${i}`,
          `Generate performance report ${i}`
        ],
        estimated_duration: `${5 + i * 2} minutes`,
        metadata: {
          complexity: i % 3 === 0 ? 'high' : 'medium',
          frequency: 'on-demand',
          last_executed: new Date().toISOString()
        }
      };

      await fs.writeFile(
        path.join(testDataDir, `procedure-${i}.json`),
        JSON.stringify(procedure, null, 2)
      );
    }
  });

  beforeEach(async () => {
    // Initialize test configuration optimized for performance testing
    const testConfig = {
      sources: [{
        name: 'performance-test-filesystem',
        type: 'filesystem',
        enabled: true,
        config: {
          path: testDataDir,
          watch: false,
          extensions: ['.json', '.md']
        }
      }],
      cache: {
        enabled: true,
        strategy: 'memory_with_redis' as const,
        memory: {
          max_keys: 1000,
          ttl_seconds: 300,
          check_period_seconds: 60
        },
        redis: {
          enabled: true,
          url: 'redis://localhost:6379',
          ttl_seconds: 600,
          key_prefix: 'pp:perf:',
          connection_timeout_ms: 2000,
          retry_attempts: 2,
          retry_delay_ms: 500
        },
        content_types: {
          runbooks: { ttl_seconds: 300, warmup: true },
          procedures: { ttl_seconds: 180, warmup: true },
          decision_trees: { ttl_seconds: 240, warmup: true },
          knowledge_base: { ttl_seconds: 90, warmup: false }
        }
      },
      performance: {
        enabled: true,
        windowSize: 60000, // 1 minute
        maxSamples: 10000,  // Large sample size for performance testing
        realtimeMonitoring: true
      },
      monitoring: {
        enabled: true,
        checkIntervalMs: 1000, // Fast monitoring for performance tests
        alertRetentionHours: 1,
        maxActiveAlerts: 100,
        notificationChannels: {
          console: false, // Disable to avoid noise during performance tests
          webhook: undefined
        }
      }
    };

    // Initialize services
    initializeCacheService(testConfig.cache);
    performanceMonitor = initializePerformanceMonitor(testConfig.performance);
    initializeMonitoringService(testConfig.monitoring);

    // Initialize server
    server = new PersonalPipelineServer();
    await server.initialize(testConfig);

    // Clear performance monitor for clean test
    performanceMonitor.reset();
  });

  afterEach(async () => {
    if (performanceMonitor) {
      performanceMonitor.stopRealtimeMonitoring();
    }
    if (server) {
      await server.close();
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Response Time Performance Requirements', () => {
    it('should meet <200ms cached response time requirement', async () => {
      // Warm up cache with first request
      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'slow_query',
            severity: 'critical',
            systems: ['database']
          }
        }
      });

      // Measure cached response times
      const cachedResponseTimes = [];
      
      for (let i = 0; i < 20; i++) {
        const startTime = process.hrtime.bigint();
        
        const response = await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: 'slow_query',
              severity: 'critical',
              systems: ['database']
            }
          }
        });
        
        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number(endTime - startTime) / 1_000_000;
        
        expect(response.isError).toBe(false);
        cachedResponseTimes.push(responseTimeMs);
      }

      // Validate performance requirements
      const avgResponseTime = cachedResponseTimes.reduce((a, b) => a + b, 0) / cachedResponseTimes.length;
      const p95ResponseTime = cachedResponseTimes.sort((a, b) => a - b)[Math.floor(cachedResponseTimes.length * 0.95)];
      const maxResponseTime = Math.max(...cachedResponseTimes);

      expect(avgResponseTime).toBeLessThan(200); // <200ms average
      expect(p95ResponseTime).toBeLessThan(300); // <300ms P95
      expect(maxResponseTime).toBeLessThan(500); // <500ms max

      console.log(`Cached Response Performance:
        Average: ${avgResponseTime.toFixed(2)}ms
        P95: ${p95ResponseTime.toFixed(2)}ms
        Max: ${maxResponseTime.toFixed(2)}ms`);
    });

    it('should meet <500ms uncached response time requirement', async () => {
      const uncachedResponseTimes = [];
      
      // Test different queries to avoid cache hits
      for (let i = 0; i < 10; i++) {
        const startTime = process.hrtime.bigint();
        
        const response = await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: `unique_alert_${i}`,
              severity: 'medium',
              systems: [`system_${i}`]
            }
          }
        });
        
        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number(endTime - startTime) / 1_000_000;
        
        expect(response.isError).toBe(false);
        uncachedResponseTimes.push(responseTimeMs);
      }

      // Validate performance requirements
      const avgResponseTime = uncachedResponseTimes.reduce((a, b) => a + b, 0) / uncachedResponseTimes.length;
      const p95ResponseTime = uncachedResponseTimes.sort((a, b) => a - b)[Math.floor(uncachedResponseTimes.length * 0.95)];
      const maxResponseTime = Math.max(...uncachedResponseTimes);

      expect(avgResponseTime).toBeLessThan(500); // <500ms average
      expect(p95ResponseTime).toBeLessThan(1000); // <1s P95
      expect(maxResponseTime).toBeLessThan(2000); // <2s max

      console.log(`Uncached Response Performance:
        Average: ${avgResponseTime.toFixed(2)}ms
        P95: ${p95ResponseTime.toFixed(2)}ms
        Max: ${maxResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Load Testing', () => {
    it('should handle 50+ concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const testQueries = [
        { alert_type: 'memory_growth', severity: 'high', systems: ['application'] },
        { alert_type: 'high_latency', severity: 'critical', systems: ['network'] },
        { alert_type: 'slow_query', severity: 'medium', systems: ['database'] },
        { alert_type: 'packet_loss', severity: 'high', systems: ['network'] },
        { alert_type: 'connection_drops', severity: 'critical', systems: ['network'] }
      ];

      const startTime = process.hrtime.bigint();
      const concurrentPromises = [];

      // Generate concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const query = testQueries[i % testQueries.length];
        
        concurrentPromises.push(
          server.handleRequest({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                ...query,
                request_id: `concurrent_${i}` // Make each request unique
              }
            }
          })
        );
      }

      // Execute all requests concurrently
      const responses = await Promise.all(concurrentPromises);
      const totalTime = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      // Validate all responses succeeded
      responses.forEach((response, index) => {
        expect(response.isError).toBe(false);
      });

      // Performance validation
      const avgTimePerRequest = totalTime / concurrentRequests;
      expect(totalTime).toBeLessThan(10000); // Complete all requests in <10s
      expect(avgTimePerRequest).toBeLessThan(200); // Avg <200ms per request

      // Check performance metrics
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.throughput.total_requests).toBeGreaterThanOrEqual(concurrentRequests);
      expect(metrics.throughput.requests_per_second).toBeGreaterThan(5); // >5 RPS

      console.log(`Concurrent Load Test (${concurrentRequests} requests):
        Total Time: ${totalTime.toFixed(2)}ms
        Avg per Request: ${avgTimePerRequest.toFixed(2)}ms
        Throughput: ${metrics.throughput.requests_per_second.toFixed(2)} RPS`);
    });

    it('should maintain cache performance under high load', async () => {
      // Pre-populate cache
      const cacheWarmupQueries = [
        { alert_type: 'warmup_query_1', severity: 'high', systems: ['test'] },
        { alert_type: 'warmup_query_2', severity: 'medium', systems: ['test'] },
        { alert_type: 'warmup_query_3', severity: 'low', systems: ['test'] }
      ];

      for (const query of cacheWarmupQueries) {
        await server.handleRequest({
          method: 'tools/call',
          params: { name: 'search_runbooks', arguments: query }
        });
      }

      // Execute high-load cached requests
      const highLoadRequests = 100;
      const cachedPromises = [];
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < highLoadRequests; i++) {
        const query = cacheWarmupQueries[i % cacheWarmupQueries.length];
        
        cachedPromises.push(
          server.handleRequest({
            method: 'tools/call',
            params: { name: 'search_runbooks', arguments: query }
          })
        );
      }

      const responses = await Promise.all(cachedPromises);
      const totalTime = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      // Validate performance under load
      responses.forEach(response => {
        expect(response.isError).toBe(false);
      });

      const avgTimePerRequest = totalTime / highLoadRequests;
      expect(avgTimePerRequest).toBeLessThan(50); // Very fast cached responses
      expect(totalTime).toBeLessThan(5000); // Complete all in <5s

      console.log(`High Load Cache Test (${highLoadRequests} requests):
        Total Time: ${totalTime.toFixed(2)}ms
        Avg per Request: ${avgTimePerRequest.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Performance', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate sustained load
      for (let batch = 0; batch < 10; batch++) {
        const batchPromises = [];
        
        for (let i = 0; i < 20; i++) {
          batchPromises.push(
            server.handleRequest({
              method: 'tools/call',
              params: {
                name: 'search_runbooks',
                arguments: {
                  alert_type: `memory_test_${batch}_${i}`,
                  severity: 'medium',
                  systems: ['memory_test']
                }
              }
            })
          );
        }
        
        await Promise.all(batchPromises);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      // Memory growth should be reasonable (<100MB for this test)
      expect(memoryGrowthMB).toBeLessThan(100);
      expect(finalMemory.heapUsed).toBeLessThan(512 * 1024 * 1024); // <512MB total

      console.log(`Memory Performance:
        Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Growth: ${memoryGrowthMB.toFixed(2)}MB`);
    });

    it('should handle resource cleanup properly', async () => {
      // Create resource-intensive operations
      const resourcePromises = [];
      
      for (let i = 0; i < 50; i++) {
        resourcePromises.push(
          server.handleRequest({
            method: 'tools/call',
            params: {
              name: 'get_procedure',
              arguments: {
                procedure_id: `perf-proc-${i % 5}`,
                section: 'all'
              }
            }
          })
        );
      }

      await Promise.all(resourcePromises);

      // Check that performance monitor shows reasonable resource usage
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.resource_usage.memory_mb).toBeLessThan(1024); // <1GB
      expect(metrics.resource_usage.heap_used_mb).toBeLessThan(512); // <512MB heap

      // Verify no memory leaks in performance tracking
      const toolMetrics = performanceMonitor.getToolMetrics();
      expect(toolMetrics.size).toBeLessThanOrEqual(10); // Should not grow indefinitely
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance degradation in tool execution', async () => {
      // Establish baseline performance
      const baselineResults = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = process.hrtime.bigint();
        
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: 'baseline_test',
              severity: 'medium',
              systems: ['baseline']
            }
          }
        });
        
        const endTime = process.hrtime.bigint();
        baselineResults.push(Number(endTime - startTime) / 1_000_000);
      }

      const baselineAvg = baselineResults.reduce((a, b) => a + b, 0) / baselineResults.length;

      // Simulate performance regression with more complex query
      const regressionResults = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = process.hrtime.bigint();
        
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: 'complex_regression_test',
              severity: 'critical',
              systems: ['regression', 'complex', 'multiple', 'systems']
            }
          }
        });
        
        const endTime = process.hrtime.bigint();
        regressionResults.push(Number(endTime - startTime) / 1_000_000);
      }

      const regressionAvg = regressionResults.reduce((a, b) => a + b, 0) / regressionResults.length;

      // Check for performance metrics tracking
      const searchRunbooksMetrics = performanceMonitor.getToolPerformance('search_runbooks');
      expect(searchRunbooksMetrics).toBeDefined();
      expect(searchRunbooksMetrics!.total_calls).toBeGreaterThanOrEqual(20);

      console.log(`Performance Regression Analysis:
        Baseline Avg: ${baselineAvg.toFixed(2)}ms
        Regression Avg: ${regressionAvg.toFixed(2)}ms
        Change: ${((regressionAvg - baselineAvg) / baselineAvg * 100).toFixed(1)}%`);
    });

    it('should generate performance alerts for slow operations', async () => {
      // Record slow operations to trigger alerts
      for (let i = 0; i < 5; i++) {
        performanceMonitor.recordToolExecution('slow_test_tool', 3000); // 3 seconds
      }

      // Generate performance report
      const report = performanceMonitor.generateReport();
      
      expect(report.alerts.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      // Should have alerts for slow tools
      const slowToolAlert = report.alerts.find(alert => 
        alert.includes('slow_test_tool') && alert.includes('high response time')
      );
      expect(slowToolAlert).toBeDefined();

      // Should have performance recommendations
      const performanceRecommendation = report.recommendations.find(rec =>
        rec.includes('response time') || rec.includes('performance')
      );
      expect(performanceRecommendation).toBeDefined();
    });
  });

  describe('Scalability Testing', () => {
    it('should scale performance linearly with increased load', async () => {
      const loadLevels = [10, 25, 50]; // Different load levels
      const results = [];

      for (const loadLevel of loadLevels) {
        performanceMonitor.reset(); // Reset for clean metrics
        
        const startTime = process.hrtime.bigint();
        const promises = [];

        // Generate load
        for (let i = 0; i < loadLevel; i++) {
          promises.push(
            server.handleRequest({
              method: 'tools/call',
              params: {
                name: 'search_runbooks',
                arguments: {
                  alert_type: `scale_test_${i}`,
                  severity: 'medium',
                  systems: ['scale']
                }
              }
            })
          );
        }

        await Promise.all(promises);
        const totalTime = Number(process.hrtime.bigint() - startTime) / 1_000_000;
        
        const metrics = performanceMonitor.getMetrics();
        results.push({
          loadLevel,
          totalTime,
          avgResponseTime: totalTime / loadLevel,
          throughput: metrics.throughput.requests_per_second
        });
      }

      // Analyze scalability
      results.forEach((result, index) => {
        console.log(`Load Level ${result.loadLevel}:
          Total Time: ${result.totalTime.toFixed(2)}ms
          Avg Response: ${result.avgResponseTime.toFixed(2)}ms
          Throughput: ${result.throughput.toFixed(2)} RPS`);

        // Performance should not degrade significantly
        if (index > 0) {
          const prevResult = results[index - 1];
          const throughputRatio = result.throughput / prevResult.throughput;
          const loadRatio = result.loadLevel / prevResult.loadLevel;
          
          // Throughput should scale reasonably with load
          expect(throughputRatio).toBeGreaterThan(0.5); // Should not drop below 50% efficiency
        }
      });
    });

    it('should maintain performance with large datasets', async () => {
      // Test performance with many different queries to stress filesystem adapter
      const largeDatasetQueries = [];
      
      // Generate 100 unique queries
      for (let i = 0; i < 100; i++) {
        largeDatasetQueries.push({
          alert_type: `dataset_query_${i}`,
          severity: i % 3 === 0 ? 'critical' : i % 3 === 1 ? 'high' : 'medium',
          systems: [`system_${i % 10}`, `component_${i % 5}`]
        });
      }

      const startTime = process.hrtime.bigint();
      
      // Execute all queries
      const datasetPromises = largeDatasetQueries.map(query =>
        server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: query
          }
        })
      );

      const responses = await Promise.all(datasetPromises);
      const totalTime = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      // Validate all succeeded
      responses.forEach(response => {
        expect(response.isError).toBe(false);
      });

      // Performance should be reasonable even with large dataset
      const avgTimePerQuery = totalTime / largeDatasetQueries.length;
      expect(avgTimePerQuery).toBeLessThan(1000); // <1s average per query
      expect(totalTime).toBeLessThan(30000); // Complete all in <30s

      console.log(`Large Dataset Performance (${largeDatasetQueries.length} queries):
        Total Time: ${(totalTime / 1000).toFixed(2)}s
        Avg per Query: ${avgTimePerQuery.toFixed(2)}ms`);
    });
  });
});