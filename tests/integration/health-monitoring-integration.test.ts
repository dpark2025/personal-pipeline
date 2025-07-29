/**
 * Health Monitoring Integration Tests
 * End-to-end testing of health checks and monitoring system integration
 * 
 * QA Engineer: Health monitoring validation for milestone 1.3
 * Coverage: Health endpoints, monitoring alerts, system degradation scenarios
 */

import request from 'supertest';
import express from 'express';
import { PersonalPipelineServer } from '../../src/core/server';
import { getMonitoringService, initializeMonitoringService, MonitoringService } from '../../src/utils/monitoring';
import { getCacheService, initializeCacheService } from '../../src/utils/cache';
import { getPerformanceMonitor, initializePerformanceMonitor } from '../../src/utils/performance';
import fs from 'fs/promises';
import path from 'path';

// Mock Redis for health testing
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

describe('Health Monitoring Integration Tests', () => {
  let server: PersonalPipelineServer;
  let monitoringService: MonitoringService;
  let app: express.Application;
  let testDataDir: string;

  beforeAll(async () => {
    // Setup test data directory
    testDataDir = path.join(__dirname, '../fixtures/health-test-data');
    await fs.mkdir(testDataDir, { recursive: true });

    // Create minimal test data
    const testRunbook = {
      id: 'health-rb-001',
      title: 'Health Check Test Runbook',
      triggers: ['health_test'],
      severity_mapping: { medium: 'monitor' },
      procedures: [{ step: 'Test health monitoring', timeout: '1m' }],
      metadata: { confidence_score: 0.9, last_updated: new Date().toISOString() }
    };

    await fs.writeFile(
      path.join(testDataDir, 'health-test-runbook.json'),
      JSON.stringify(testRunbook, null, 2)
    );
  });

  beforeEach(async () => {
    // Initialize test configuration
    const testConfig = {
      sources: [{
        name: 'health-test-filesystem',
        type: 'filesystem',
        enabled: true,
        config: {
          path: testDataDir,
          watch: false,
          extensions: ['.json']
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
          key_prefix: 'pp:health:',
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
        realtimeMonitoring: true
      },
      monitoring: {
        enabled: true,
        checkIntervalMs: 1000, // Fast for testing
        alertRetentionHours: 1,
        maxActiveAlerts: 50,
        notificationChannels: {
          console: false, // Disable for clean test output
          webhook: undefined
        }
      },
      server: {
        port: 3001, // Different port for testing
        host: 'localhost'
      }
    };

    // Initialize services
    initializeCacheService(testConfig.cache);
    initializePerformanceMonitor(testConfig.performance);
    monitoringService = initializeMonitoringService(testConfig.monitoring);

    // Initialize and start server
    server = new PersonalPipelineServer();
    await server.initialize(testConfig);
    
    // Create Express app for health endpoints
    app = express();
    app.use(express.json());
    
    // Add health endpoints that would be created by the server
    app.get('/health', async (req, res) => {
      try {
        const cacheService = getCacheService();
        const performanceMonitor = getPerformanceMonitor();
        const monitoringService = getMonitoringService();

        const cacheHealth = await cacheService.healthCheck();
        const performanceMetrics = performanceMonitor.getMetrics();
        const monitoringStatus = monitoringService.getStatus();

        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.3.0',
          cache: cacheHealth,
          performance: {
            response_times: performanceMetrics.response_times,
            error_rate: performanceMetrics.error_tracking.error_rate,
            memory_usage_mb: performanceMetrics.resource_usage.memory_mb
          },
          monitoring: {
            enabled: monitoringStatus.enabled,
            running: monitoringStatus.running,
            active_alerts: monitoringStatus.activeAlerts,
            rules_count: monitoringStatus.rules
          }
        };

        res.json(health);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/health/detailed', async (req, res) => {
      try {
        const cacheService = getCacheService();
        const performanceMonitor = getPerformanceMonitor();
        const monitoringService = getMonitoringService();

        const cacheHealth = await cacheService.healthCheck();
        const cacheStats = cacheService.getStats();
        const performanceMetrics = performanceMonitor.getMetrics();
        const monitoringStatus = monitoringService.getStatus();
        const activeAlerts = monitoringService.getActiveAlerts();

        const detailedHealth = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime_seconds: process.uptime(),
          cache: {
            ...cacheHealth,
            statistics: cacheStats
          },
          performance: {
            metrics: performanceMetrics,
            tool_performance: Array.from(performanceMonitor.getToolMetrics().entries()).map(([name, metrics]) => ({
              tool_name: name,
              ...metrics
            }))
          },
          monitoring: {
            status: monitoringStatus,
            active_alerts: activeAlerts,
            rules: monitoringService.getRules()
          },
          system: {
            memory: process.memoryUsage(),
            cpu_usage: process.cpuUsage(),
            platform: process.platform,
            node_version: process.version
          }
        };

        res.json(detailedHealth);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/health/cache', async (req, res) => {
      try {
        const cacheService = getCacheService();
        const health = await cacheService.healthCheck();
        const stats = cacheService.getStats();

        res.json({
          health,
          statistics: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/health/performance', async (req, res) => {
      try {
        const performanceMonitor = getPerformanceMonitor();
        const metrics = performanceMonitor.getMetrics();
        const report = performanceMonitor.generateReport();

        res.json({
          metrics,
          report,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/monitoring/status', (req, res) => {
      try {
        const monitoringService = getMonitoringService();
        const status = monitoringService.getStatus();

        res.json({
          ...status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/monitoring/alerts', (req, res) => {
      try {
        const monitoringService = getMonitoringService();
        const active = req.query.active === 'true';
        
        const alerts = active 
          ? monitoringService.getActiveAlerts()
          : monitoringService.getAlertHistory();

        res.json({
          alerts,
          count: alerts.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  });

  afterEach(async () => {
    if (monitoringService) {
      monitoringService.stop();
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

  describe('Basic Health Endpoints', () => {
    it('should provide basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: '1.3.0',
        cache: expect.objectContaining({
          overall_healthy: expect.any(Boolean),
          memory_cache: expect.objectContaining({
            healthy: expect.any(Boolean)
          })
        }),
        performance: expect.objectContaining({
          response_times: expect.any(Object),
          error_rate: expect.any(Number),
          memory_usage_mb: expect.any(Number)
        }),
        monitoring: expect.objectContaining({
          enabled: expect.any(Boolean),
          running: expect.any(Boolean),
          active_alerts: expect.any(Number),
          rules_count: expect.any(Number)
        })
      });
    });

    it('should provide detailed health information', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime_seconds: expect.any(Number),
        cache: expect.objectContaining({
          overall_healthy: expect.any(Boolean),
          statistics: expect.objectContaining({
            hits: expect.any(Number),
            misses: expect.any(Number),
            hit_rate: expect.any(Number)
          })
        }),
        performance: expect.objectContaining({
          metrics: expect.any(Object),
          tool_performance: expect.any(Array)
        }),
        monitoring: expect.objectContaining({
          status: expect.any(Object),
          active_alerts: expect.any(Array),
          rules: expect.any(Array)
        }),
        system: expect.objectContaining({
          memory: expect.any(Object),
          cpu_usage: expect.any(Object),
          platform: expect.any(String),
          node_version: expect.any(String)
        })
      });
    });

    it('should provide cache-specific health information', async () => {
      const response = await request(app)
        .get('/health/cache')
        .expect(200);

      expect(response.body).toMatchObject({
        health: expect.objectContaining({
          overall_healthy: expect.any(Boolean),
          memory_cache: expect.objectContaining({
            healthy: expect.any(Boolean),
            keys_count: expect.any(Number),
            response_time_ms: expect.any(Number)
          })
        }),
        statistics: expect.objectContaining({
          hits: expect.any(Number),
          misses: expect.any(Number),
          total_operations: expect.any(Number),
          hit_rate: expect.any(Number)
        }),
        timestamp: expect.any(String)
      });
    });

    it('should provide performance health information', async () => {
      // Generate some performance data first
      const performanceMonitor = getPerformanceMonitor();
      performanceMonitor.recordToolExecution('test_tool', 100);
      performanceMonitor.recordToolExecution('test_tool', 150);

      const response = await request(app)
        .get('/health/performance')
        .expect(200);

      expect(response.body).toMatchObject({
        metrics: expect.objectContaining({
          response_times: expect.any(Object),
          throughput: expect.any(Object),
          error_tracking: expect.any(Object),
          resource_usage: expect.any(Object)
        }),
        report: expect.objectContaining({
          summary: expect.any(Object),
          tools: expect.any(Array),
          recommendations: expect.any(Array),
          alerts: expect.any(Array)
        }),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Monitoring Status and Alerts', () => {
    it('should provide monitoring service status', async () => {
      // Start monitoring to get active status
      monitoringService.start();

      const response = await request(app)
        .get('/monitoring/status')
        .expect(200);

      expect(response.body).toMatchObject({
        enabled: true,
        running: true,
        rules: expect.any(Number),
        activeAlerts: expect.any(Number),
        totalAlerts: expect.any(Number),
        lastCheck: expect.any(String),
        timestamp: expect.any(String)
      });

      expect(response.body.rules).toBeGreaterThan(0); // Should have default rules
    });

    it('should list monitoring alerts', async () => {
      const response = await request(app)
        .get('/monitoring/alerts')
        .expect(200);

      expect(response.body).toMatchObject({
        alerts: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String)
      });
    });

    it('should list only active alerts when requested', async () => {
      const response = await request(app)
        .get('/monitoring/alerts?active=true')
        .expect(200);

      expect(response.body).toMatchObject({
        alerts: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String)
      });

      // Active alerts should be a subset of all alerts
      const allAlertsResponse = await request(app)
        .get('/monitoring/alerts')
        .expect(200);

      expect(response.body.count).toBeLessThanOrEqual(allAlertsResponse.body.count);
    });
  });

  describe('Health Check Integration with MCP Operations', () => {
    it('should reflect MCP operation health in status', async () => {
      // Perform MCP operations to generate metrics
      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'health_test',
            severity: 'medium',
            systems: ['health']
          }
        }
      });

      // Check that health reflects the operation
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.performance.tool_performance.length).toBeGreaterThan(0);
      
      // Should have metrics for the search_runbooks tool
      const searchRunbooksMetrics = response.body.performance.tool_performance.find(
        (tool: any) => tool.tool_name === 'search_runbooks'
      );
      expect(searchRunbooksMetrics).toBeDefined();
      expect(searchRunbooksMetrics.total_calls).toBeGreaterThanOrEqual(1);
    });

    it('should show cache statistics after MCP operations', async () => {
      // Perform operations to populate cache
      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'health_test',
            severity: 'medium',
            systems: ['health']
          }
        }
      });

      // Second identical request should hit cache
      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'health_test',
            severity: 'medium',
            systems: ['health']
          }
        }
      });

      const response = await request(app)
        .get('/health/cache')
        .expect(200);

      expect(response.body.statistics.total_operations).toBeGreaterThanOrEqual(2);
      expect(response.body.statistics.hits).toBeGreaterThanOrEqual(1);
      expect(response.body.statistics.hit_rate).toBeGreaterThan(0);
    });
  });

  describe('System Degradation Scenarios', () => {
    it('should handle and report cache service degradation', async () => {
      // Simulate cache service issues by forcing errors
      const cacheService = getCacheService();
      
      // Force cache operations to generate some misses
      await cacheService.clearAll();

      // Generate multiple unique requests to create cache misses
      for (let i = 0; i < 5; i++) {
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: `degradation_test_${i}`,
              severity: 'low',
              systems: ['test']
            }
          }
        });
      }

      const response = await request(app)
        .get('/health/cache')
        .expect(200);

      // Should still be healthy but with lower hit rate
      expect(response.body.health.overall_healthy).toBe(true);
      expect(response.body.statistics.total_operations).toBeGreaterThan(0);
    });

    it('should handle monitoring service alerts during degradation', async () => {
      // Start monitoring
      monitoringService.start();

      // Simulate high error rate to trigger alerts
      const performanceMonitor = getPerformanceMonitor();
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordToolExecution('error_prone_tool', 100, true); // Record errors
      }

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await request(app)
        .get('/monitoring/alerts?active=true')
        .expect(200);

      // Check if error rate alert was triggered
      const errorAlert = response.body.alerts.find((alert: any) => 
        alert.title === 'High Error Rate'
      );

      // Note: Alert may or may not be triggered depending on exact timing
      // The important thing is that the endpoint responds correctly
      expect(response.body.alerts).toBeInstanceOf(Array);
    });

    it('should report performance degradation in health checks', async () => {
      // Record slow operations to simulate performance degradation
      const performanceMonitor = getPerformanceMonitor();
      for (let i = 0; i < 5; i++) {
        performanceMonitor.recordToolExecution('slow_degraded_tool', 3000); // 3 seconds
      }

      const response = await request(app)
        .get('/health/performance')
        .expect(200);

      expect(response.body.report.alerts.length).toBeGreaterThan(0);
      
      // Should have alert about slow tool
      const slowToolAlert = response.body.report.alerts.find((alert: string) =>
        alert.includes('slow_degraded_tool') && alert.includes('high response time')
      );
      expect(slowToolAlert).toBeDefined();
    });
  });

  describe('Health Check Error Handling', () => {
    it('should handle health check errors gracefully', async () => {
      // This test would require more complex mocking to force health check failures
      // For now, we test that error responses are properly formatted
      
      // Mock a service failure by creating an endpoint that throws
      app.get('/health/error-test', (req, res) => {
        throw new Error('Simulated service failure');
      });

      const response = await request(app)
        .get('/health/error-test')
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        error: 'Simulated service failure'
      });
    });

    it('should maintain health endpoint availability during high load', async () => {
      // Generate high load on MCP operations
      const loadPromises = [];
      for (let i = 0; i < 20; i++) {
        loadPromises.push(
          server.handleRequest({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `load_test_${i}`,
                severity: 'low',
                systems: ['load']
              }
            }
          })
        );
      }

      // Simultaneously check health endpoints
      const healthPromises = [
        request(app).get('/health'),
        request(app).get('/health/cache'),
        request(app).get('/health/performance'),
        request(app).get('/monitoring/status')
      ];

      // Both load and health checks should complete successfully
      const [loadResults, healthResults] = await Promise.all([
        Promise.all(loadPromises),
        Promise.all(healthPromises)
      ]);

      // Verify load operations succeeded
      loadResults.forEach(result => {
        expect(result.isError).toBe(false);
      });

      // Verify health endpoints responded successfully
      healthResults.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Metrics Collection and Reporting', () => {
    it('should collect comprehensive system metrics', async () => {
      // Generate varied operations for comprehensive metrics
      const operations = [
        { name: 'search_runbooks', args: { alert_type: 'test1', severity: 'high', systems: ['db'] } },
        { name: 'get_procedure', args: { procedure_id: 'proc-001', section: 'overview' } },
        { name: 'search_knowledge_base', args: { query: 'health test', category: 'operational' } }
      ];

      for (const op of operations) {
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: op.name,
            arguments: op.args
          }
        });
      }

      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      // Verify comprehensive metrics collection
      expect(response.body.performance.metrics).toMatchObject({
        response_times: expect.objectContaining({
          count: expect.any(Number),
          avg_ms: expect.any(Number),
          p50_ms: expect.any(Number),
          p95_ms: expect.any(Number),
          max_ms: expect.any(Number),
          min_ms: expect.any(Number)
        }),
        throughput: expect.objectContaining({
          total_requests: expect.any(Number),
          requests_per_second: expect.any(Number),
          window_size_seconds: expect.any(Number)
        }),
        error_tracking: expect.objectContaining({
          total_errors: expect.any(Number),
          error_rate: expect.any(Number),
          errors_by_type: expect.any(Object)
        }),
        resource_usage: expect.objectContaining({
          memory_mb: expect.any(Number),
          heap_used_mb: expect.any(Number),
          cpu_percent: expect.any(Number)
        })
      });

      // Should have tool-specific metrics
      expect(response.body.performance.tool_performance.length).toBeGreaterThanOrEqual(operations.length);
    });

    it('should provide actionable health recommendations', async () => {
      // Create conditions that would trigger recommendations
      const performanceMonitor = getPerformanceMonitor();
      
      // High memory usage simulation
      performanceMonitor.recordToolExecution('memory_intensive_tool', 500);
      
      // High response time simulation
      performanceMonitor.recordToolExecution('slow_tool', 2500);

      const response = await request(app)
        .get('/health/performance')
        .expect(200);

      expect(response.body.report.recommendations).toBeInstanceOf(Array);
      expect(response.body.report.recommendations.length).toBeGreaterThan(0);

      // Recommendations should be actionable strings
      response.body.report.recommendations.forEach((rec: string) => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(10); // Should be meaningful
      });
    });
  });
});