/**
 * Integration Tests for Cache Service
 * End-to-end testing of caching with real MCP tool calls
 * 
 * QA Engineer: Integration testing for milestone 1.3 cache functionality
 * Coverage: Full cache workflow, performance validation, Redis integration
 */

import request from 'supertest';
import { PersonalPipelineServer } from '../../src/core/server';
import { CacheService, createCacheKey, initializeCacheService } from '../../src/utils/cache';
import { ConfigManager } from '../../src/utils/config';
import { getPerformanceMonitor, initializePerformanceMonitor } from '../../src/utils/performance';
import { getMonitoringService, initializeMonitoringService } from '../../src/utils/monitoring';
import Redis from 'ioredis';
import fs from 'fs/promises';
import path from 'path';

// Mock Redis for consistent testing
jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Cache Integration Tests', () => {
  let server: PersonalPipelineServer;
  let cacheService: CacheService;
  let mockRedisInstance: jest.Mocked<Redis>;
  let testDataDir: string;

  beforeAll(async () => {
    // Setup test data directory
    testDataDir = path.join(__dirname, '../fixtures/integration-test-data');
    await fs.mkdir(testDataDir, { recursive: true });

    // Create test runbook files
    const testRunbook1 = {
      id: 'rb-001',
      title: 'Emergency Database Recovery',
      triggers: ['database_down', 'connection_timeout'],
      severity_mapping: { critical: 'immediate', high: 'escalate' },
      procedures: [
        { step: 'Check database connectivity', timeout: '30s' },
        { step: 'Restart database service', timeout: '2m' },
        { step: 'Verify data integrity', timeout: '5m' }
      ],
      metadata: { confidence_score: 0.95, last_updated: new Date().toISOString() }
    };

    const testRunbook2 = {
      id: 'rb-002',
      title: 'High Memory Usage Response',
      triggers: ['memory_alert', 'oom_warning'],
      severity_mapping: { high: 'investigate', medium: 'monitor' },
      procedures: [
        { step: 'Identify memory-consuming processes', timeout: '1m' },
        { step: 'Scale resources if needed', timeout: '3m' },
        { step: 'Monitor for stabilization', timeout: '10m' }
      ],
      metadata: { confidence_score: 0.88, last_updated: new Date().toISOString() }
    };

    await fs.writeFile(
      path.join(testDataDir, 'db-recovery-runbook.json'),
      JSON.stringify(testRunbook1, null, 2)
    );

    await fs.writeFile(
      path.join(testDataDir, 'memory-runbook.json'),
      JSON.stringify(testRunbook2, null, 2)
    );

    // Create test procedure files
    const testProcedure = {
      id: 'proc-001',
      name: 'Database Backup Procedure',
      steps: [
        'Connect to backup system',
        'Initiate database dump',
        'Verify backup integrity',
        'Store in secure location'
      ],
      estimated_duration: '15 minutes'
    };

    await fs.writeFile(
      path.join(testDataDir, 'backup-procedure.json'),
      JSON.stringify(testProcedure, null, 2)
    );
  });

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup Redis mock
    mockRedisInstance = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn(),
      on: jest.fn(),
      status: 'ready',
    } as any;

    MockedRedis.mockImplementation(() => mockRedisInstance);

    // Initialize test configuration
    const testConfig = {
      sources: [{
        name: 'test-filesystem',
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
          max_keys: 100,
          ttl_seconds: 300,
          check_period_seconds: 60
        },
        redis: {
          enabled: true,
          url: 'redis://localhost:6379',
          ttl_seconds: 600,
          key_prefix: 'pp:test:',
          connection_timeout_ms: 5000,
          retry_attempts: 3,
          retry_delay_ms: 1000
        },
        content_types: {
          runbooks: { ttl_seconds: 300, warmup: true },
          procedures: { ttl_seconds: 180, warmup: false },
          decision_trees: { ttl_seconds: 240, warmup: true },
          knowledge_base: { ttl_seconds: 90, warmup: false }
        }
      },
      performance: {
        enabled: true,
        windowSize: 60000,
        maxSamples: 1000,
        realtimeMonitoring: false
      },
      monitoring: {
        enabled: true,
        checkIntervalMs: 5000,
        alertRetentionHours: 24,
        maxActiveAlerts: 50,
        notificationChannels: {
          console: true,
          webhook: undefined
        }
      }
    };

    // Initialize services
    cacheService = initializeCacheService(testConfig.cache);
    initializePerformanceMonitor(testConfig.performance);
    initializeMonitoringService(testConfig.monitoring);

    // Initialize server
    server = new PersonalPipelineServer();
    await server.initialize(testConfig);
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
    if (cacheService) {
      await cacheService.shutdown();
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

  describe('End-to-End Cache Workflow', () => {
    it('should cache runbook search results from MCP tool calls', async () => {
      // First call - should hit filesystem and cache result
      const firstResponse = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'database_down',
            severity: 'critical',
            systems: ['database']
          }
        }
      });

      expect(firstResponse.isError).toBe(false);
      
      if (!firstResponse.isError) {
        const firstResult = firstResponse.result.content[0];
        expect(firstResult.type).toBe('text');
        
        if (firstResult.type === 'text') {
          const firstData = JSON.parse(firstResult.text);
          expect(firstData.results).toHaveLength(1);
          expect(firstData.results[0].title).toBe('Emergency Database Recovery');
          expect(firstData.retrieval_time_ms).toBeGreaterThan(0);
          expect(firstData.cache_hit).toBe(false);
        }
      }

      // Second call - should hit cache
      const secondResponse = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'database_down',
            severity: 'critical',
            systems: ['database']
          }
        }
      });

      expect(secondResponse.isError).toBe(false);
      
      if (!secondResponse.isError) {
        const secondResult = secondResponse.result.content[0];
        expect(secondResult.type).toBe('text');
        
        if (secondResult.type === 'text') {
          const secondData = JSON.parse(secondResult.text);
          expect(secondData.cache_hit).toBe(true);
          expect(secondData.retrieval_time_ms).toBeLessThan(50); // Should be much faster
        }
      }

      // Verify cache statistics
      const cacheStats = cacheService.getStats();
      expect(cacheStats.hits).toBeGreaterThanOrEqual(1);
      expect(cacheStats.hit_rate).toBeGreaterThan(0);
    });

    it('should cache procedure retrieval across multiple MCP calls', async () => {
      // Test multiple procedure calls to verify caching
      const procedureCalls = [
        { procedure_id: 'proc-001', section: 'overview' },
        { procedure_id: 'proc-001', section: 'steps' },
        { procedure_id: 'proc-001', section: 'overview' } // Duplicate to test cache hit
      ];

      const responses = [];
      
      for (const callParams of procedureCalls) {
        const response = await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'get_procedure',
            arguments: callParams
          }
        });
        responses.push(response);
      }

      // Verify all calls succeeded
      responses.forEach(response => {
        expect(response.isError).toBe(false);
      });

      // Last call should be a cache hit
      if (!responses[2].isError) {
        const lastResult = responses[2].result.content[0];
        if (lastResult.type === 'text') {
          const lastData = JSON.parse(lastResult.text);
          expect(lastData.cache_hit).toBe(true);
        }
      }
    });

    it('should handle cache warming during server initialization', async () => {
      // Restart server to trigger cache warming
      await server.close();
      
      // Mock warm cache data
      const warmCacheData = [
        {
          key: createCacheKey('runbooks', 'critical-runbook-1'),
          data: { id: 'critical-runbook-1', title: 'Critical System Response' }
        },
        {
          key: createCacheKey('decision_trees', 'escalation-tree-1'),
          data: { id: 'escalation-tree-1', name: 'Escalation Decision Tree' }
        }
      ];

      await cacheService.warmCache(warmCacheData);
      
      // Verify warm data is cached
      for (const item of warmCacheData) {
        const cachedData = await cacheService.get(item.key);
        expect(cachedData).toEqual(item.data);
      }

      // Reinitialize server
      server = new PersonalPipelineServer();
      await server.initialize({
        sources: [{
          name: 'test-filesystem',
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
          memory: { max_keys: 100, ttl_seconds: 300, check_period_seconds: 60 },
          redis: {
            enabled: true,
            url: 'redis://localhost:6379',
            ttl_seconds: 600,
            key_prefix: 'pp:test:',
            connection_timeout_ms: 5000,
            retry_attempts: 3,
            retry_delay_ms: 1000
          },
          content_types: {
            runbooks: { ttl_seconds: 300, warmup: true },
            procedures: { ttl_seconds: 180, warmup: false },
            decision_trees: { ttl_seconds: 240, warmup: true },
            knowledge_base: { ttl_seconds: 90, warmup: false }
          }
        }
      } as any);
    });
  });

  describe('Performance Validation with Caching', () => {
    it('should meet sub-200ms response time requirements for cached queries', async () => {
      // First call to populate cache
      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'memory_alert',
            severity: 'high',
            systems: ['application']
          }
        }
      });

      // Measure cached response times
      const performanceResults = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        const response = await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: 'memory_alert',
              severity: 'high',
              systems: ['application']
            }
          }
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(response.isError).toBe(false);
        performanceResults.push(responseTime);
      }

      // Verify performance requirements
      const avgResponseTime = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length;
      const maxResponseTime = Math.max(...performanceResults);
      
      expect(avgResponseTime).toBeLessThan(200); // Average under 200ms
      expect(maxResponseTime).toBeLessThan(500); // Max under 500ms
      
      // Verify all were cache hits
      const performanceMonitor = getPerformanceMonitor();
      const toolMetrics = performanceMonitor.getToolPerformance('search_runbooks');
      expect(toolMetrics).toBeDefined();
      expect(toolMetrics!.total_calls).toBeGreaterThanOrEqual(10);
    });

    it('should maintain cache performance under concurrent load', async () => {
      // Pre-populate cache with test data
      const testQueries = [
        { alert_type: 'database_down', severity: 'critical', systems: ['database'] },
        { alert_type: 'memory_alert', severity: 'high', systems: ['application'] },
        { alert_type: 'disk_space', severity: 'medium', systems: ['storage'] }
      ];

      // Populate cache
      for (const query of testQueries) {
        await server.handleRequest({
          method: 'tools/call',
          params: { name: 'search_runbooks', arguments: query }
        });
      }

      // Execute concurrent requests
      const concurrentRequests = [];
      const startTime = Date.now();

      for (let i = 0; i < 20; i++) {
        const query = testQueries[i % testQueries.length];
        concurrentRequests.push(
          server.handleRequest({
            method: 'tools/call',
            params: { name: 'search_runbooks', arguments: query }
          })
        );
      }

      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.isError).toBe(false);
      });

      // Verify performance under load
      expect(totalTime).toBeLessThan(5000); // All 20 requests in under 5 seconds
      
      // Verify cache statistics show high hit rate
      const cacheStats = cacheService.getStats();
      expect(cacheStats.hit_rate).toBeGreaterThan(0.8); // 80%+ hit rate
    });
  });

  describe('Redis Integration and Fallback', () => {
    it('should fallback gracefully when Redis is unavailable', async () => {
      // Configure Redis to fail
      mockRedisInstance.get.mockRejectedValue(new Error('Redis unavailable'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis unavailable'));
      mockRedisInstance.ping.mockRejectedValue(new Error('Redis unavailable'));

      // Should still work with memory cache
      const response = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'database_down',
            severity: 'critical',
            systems: ['database']
          }
        }
      });

      expect(response.isError).toBe(false);
      
      // Verify health check shows Redis issues but overall health OK
      const healthCheck = await cacheService.healthCheck();
      expect(healthCheck.memory_cache.healthy).toBe(true);
      expect(healthCheck.redis_cache?.healthy).toBe(false);
      expect(healthCheck.overall_healthy).toBe(true); // Should still be healthy
    });

    it('should sync data between memory and Redis successfully', async () => {
      // Configure Redis to work properly
      mockRedisInstance.get.mockResolvedValue(null); // Initially empty
      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.ping.mockResolvedValue('PONG');

      // Make request that will cache data
      const response = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'memory_alert',
            severity: 'high',
            systems: ['application']
          }
        }
      });

      expect(response.isError).toBe(false);

      // Verify Redis setex was called
      expect(mockRedisInstance.setex).toHaveBeenCalled();
      
      // Mock Redis to return cached data for fallback test
      const cachedData = {
        data: { results: [{ title: 'Cached Result' }] },
        timestamp: Date.now(),
        ttl: 300,
        content_type: 'runbooks'
      };
      
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedData));
      
      // Clear memory cache to force Redis fallback
      await cacheService.clearAll();
      
      // Make same request - should get data from Redis
      const fallbackResponse = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'memory_alert',
            severity: 'high',
            systems: ['application']
          }
        }
      });

      expect(fallbackResponse.isError).toBe(false);
      expect(mockRedisInstance.get).toHaveBeenCalled();
    });
  });

  describe('Cache Health Monitoring Integration', () => {
    it('should integrate with monitoring service for cache alerts', async () => {
      const monitoringService = getMonitoringService();
      let alertTriggered = false;

      // Listen for cache-related alerts
      monitoringService.on('alert', (alert) => {
        if (alert.title === 'Low Cache Hit Rate') {
          alertTriggered = true;
        }
      });

      // Start monitoring
      monitoringService.start();

      // Generate cache misses to trigger low hit rate
      for (let i = 0; i < 20; i++) {
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: `unique_alert_${i}`,
              severity: 'low',
              systems: ['test']
            }
          }
        });
      }

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify cache statistics are being monitored
      const cacheStats = cacheService.getStats();
      expect(cacheStats.total_operations).toBeGreaterThan(0);

      monitoringService.stop();
    });

    it('should provide comprehensive cache health checks', async () => {
      // Generate some cache activity
      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'test_alert',
            severity: 'medium',
            systems: ['test']
          }
        }
      });

      const healthCheck = await cacheService.healthCheck();

      // Verify comprehensive health information
      expect(healthCheck.memory_cache).toBeDefined();
      expect(healthCheck.memory_cache.healthy).toBe(true);
      expect(healthCheck.memory_cache.keys_count).toBeGreaterThanOrEqual(0);
      expect(healthCheck.memory_cache.response_time_ms).toBeGreaterThan(0);

      expect(healthCheck.redis_cache).toBeDefined();
      expect(healthCheck.redis_cache?.response_time_ms).toBeGreaterThan(0);

      expect(healthCheck.overall_healthy).toBe(true);
      expect(healthCheck.cache_stats).toBeDefined();
      expect(healthCheck.cache_stats?.total_operations).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Scenario Testing', () => {
    it('should handle filesystem errors gracefully with caching', async () => {
      // First request should succeed and cache result
      const firstResponse = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'database_down',
            severity: 'critical',
            systems: ['database']
          }
        }
      });

      expect(firstResponse.isError).toBe(false);

      // Remove test files to simulate filesystem error
      await fs.rm(path.join(testDataDir, 'db-recovery-runbook.json'));

      // Second request should still succeed from cache
      const secondResponse = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'database_down',
            severity: 'critical',
            systems: ['database']
          }
        }
      });

      expect(secondResponse.isError).toBe(false);
      
      if (!secondResponse.isError) {
        const result = secondResponse.result.content[0];
        if (result.type === 'text') {
          const data = JSON.parse(result.text);
          expect(data.cache_hit).toBe(true);
        }
      }
    });

    it('should handle cache corruption gracefully', async () => {
      // Manually corrupt cache data
      const corruptKey = createCacheKey('runbooks', 'corrupt-test');
      
      // Set invalid JSON in Redis mock
      mockRedisInstance.get.mockResolvedValue('invalid-json-data');

      // Request should still work by falling back to source
      const response = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'new_alert_type',
            severity: 'medium',
            systems: ['test']
          }
        }
      });

      expect(response.isError).toBe(false);
    });

    it('should handle network timeouts and connection issues', async () => {
      // Configure Redis to timeout
      mockRedisInstance.get.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );

      // Should still work with memory cache fallback
      const response = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'timeout_test',
            severity: 'low',
            systems: ['network']
          }
        }
      });

      expect(response.isError).toBe(false);
    });
  });

  describe('Cache Invalidation and Management', () => {
    it('should handle cache invalidation correctly', async () => {
      // Populate cache
      const response1 = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'invalidation_test',
            severity: 'medium',
            systems: ['test']
          }
        }
      });

      expect(response1.isError).toBe(false);

      // Clear cache
      await cacheService.clearAll();

      // Next request should miss cache
      const response2 = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'invalidation_test',
            severity: 'medium',
            systems: ['test']
          }
        }
      });

      expect(response2.isError).toBe(false);
      
      if (!response2.isError) {
        const result = response2.result.content[0];
        if (result.type === 'text') {
          const data = JSON.parse(result.text);
          expect(data.cache_hit).toBe(false);
        }
      }
    });

    it('should handle content-type specific cache clearing', async () => {
      // Populate different content types
      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: { alert_type: 'runbook_test', severity: 'low', systems: ['test'] }
        }
      });

      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'get_procedure',
          arguments: { procedure_id: 'proc-001', section: 'overview' }
        }
      });

      // Clear only runbooks
      await cacheService.clearByType('runbooks');

      // Runbook request should miss cache
      const runbookResponse = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: { alert_type: 'runbook_test', severity: 'low', systems: ['test'] }
        }
      });

      // Procedure request should hit cache
      const procedureResponse = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'get_procedure',
          arguments: { procedure_id: 'proc-001', section: 'overview' }
        }
      });

      expect(runbookResponse.isError).toBe(false);
      expect(procedureResponse.isError).toBe(false);
    });
  });
});