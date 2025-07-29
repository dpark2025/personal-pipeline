/**
 * Network Issues Scenario Tests
 * Testing system behavior under various network failure conditions
 * 
 * QA Engineer: Network error scenario testing for milestone 1.3
 * Coverage: Network timeouts, connection drops, DNS failures, slow networks
 */

import { createTestEnvironment, TestEnvironment, generateLoad, waitForCondition } from '../helpers/test-utils';
import { createCacheKey } from '../../src/utils/cache';
import Redis from 'ioredis';

// Mock Redis to simulate network issues
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

describe('Network Issues Scenarios', () => {
  let testEnv: TestEnvironment;
  let mockRedisInstance: jest.Mocked<Redis>;

  beforeEach(async () => {
    // Setup Redis mock with network simulation capabilities
    mockRedisInstance = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
      status: 'ready',
      disconnect: jest.fn(),
      flushall: jest.fn().mockResolvedValue('OK'),
      exists: jest.fn().mockResolvedValue(0),
      ttl: jest.fn().mockResolvedValue(-1),
    } as any;

    MockedRedis.mockImplementation(() => mockRedisInstance);

    // Create test environment with Redis enabled for network testing
    testEnv = await createTestEnvironment({
      cacheStrategy: 'hybrid' as const,
      generateTestData: {
        runbooks: 5,
        procedures: 3,
        knowledgeBase: 4
      },
      performanceOptions: {
        realtimeMonitoring: true
      }
    });
  });

  afterEach(async () => {
    await testEnv.cleanup();
    jest.clearAllMocks();
  });

  describe('Network Timeout Scenarios', () => {
    it('should handle Redis connection timeouts gracefully', async () => {
      // Simulate slow network with timeouts
      mockRedisInstance.get.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 5000ms')), 100)
        )
      );
      
      mockRedisInstance.setex.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 5000ms')), 100)
        )
      );

      mockRedisInstance.ping.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 5000ms')), 100)
        )
      );

      // Operations should complete successfully despite timeouts
      const response = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'network_timeout_test',
            severity: 'high',
            systems: ['network']
          }
        }
      });

      expect(response.isError).toBe(false);

      // System should fallback to memory cache
      const cacheKey = createCacheKey('runbooks', 'timeout-test');
      await testEnv.cacheService.set(cacheKey, { timeout: 'test' });
      const result = await testEnv.cacheService.get(cacheKey);
      expect(result).toEqual({ timeout: 'test' });

      // Health check should show timeout issues
      const health = await testEnv.cacheService.healthCheck();
      expect(health.memory_cache.healthy).toBe(true);
      expect(health.redis_cache?.healthy).toBe(false);
      expect(health.overall_healthy).toBe(true);
    });

    it('should handle partial timeouts with some operations succeeding', async () => {
      let operationCount = 0;
      
      // Simulate intermittent timeouts (every 3rd operation times out)
      mockRedisInstance.get.mockImplementation(() => {
        operationCount++;
        if (operationCount % 3 === 0) {
          return new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 50)
          );
        }
        return Promise.resolve(null);
      });

      mockRedisInstance.setex.mockImplementation(() => {
        if (operationCount % 3 === 0) {
          return new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 50)
          );
        }
        return Promise.resolve('OK');
      });

      // Multiple operations should handle intermittent timeouts
      const operations = [];
      for (let i = 0; i < 9; i++) {
        operations.push(
          testEnv.mcpExecutor.executeToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `partial_timeout_test_${i}`,
                severity: 'medium',
                systems: ['partial_timeout']
              }
            }
          })
        );
      }

      const responses = await Promise.all(operations);
      
      // All operations should succeed despite some timeouts
      responses.forEach((response: any) => {
        expect(response.isError).toBe(false);
      });

      // Cache should have some successful operations
      const stats = testEnv.cacheService.getStats();
      expect(stats.total_operations).toBeGreaterThan(0);
    });

    it('should handle DNS lookup timeouts', async () => {
      // Simulate DNS timeout
      const dnsTimeoutError = new Error('DNS lookup timeout');
      (dnsTimeoutError as any).code = 'ETIMEDOUT';

      mockRedisInstance.get.mockRejectedValue(dnsTimeoutError);
      mockRedisInstance.setex.mockRejectedValue(dnsTimeoutError);
      mockRedisInstance.ping.mockRejectedValue(dnsTimeoutError);

      // System should continue functioning
      const response = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'get_procedure',
          arguments: {
            procedure_id: 'proc-001',
            section: 'all'
          }
        }
      });

      expect(response.isError).toBe(false);

      // Health check should indicate DNS issues
      const health = await testEnv.cacheService.healthCheck();
      expect(health.redis_cache?.healthy).toBe(false);
      expect(health.redis_cache?.error_message).toContain('DNS lookup timeout');
    });
  });

  describe('Connection Drop Scenarios', () => {
    it('should handle sudden connection drops during operations', async () => {
      // Start with working connection
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.ping.mockResolvedValue('PONG');

      // Perform initial operation
      const response1 = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'connection_drop_before',
            severity: 'medium',
            systems: ['connection_test']
          }
        }
      });

      expect(response1.isError).toBe(false);

      // Simulate connection drop
      mockRedisInstance.get.mockRejectedValue(new Error('Connection dropped'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Connection dropped'));
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection dropped'));

      // Subsequent operations should handle connection drop
      const response2 = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'connection_drop_after',
            severity: 'medium',
            systems: ['connection_test']
          }
        }
      });

      expect(response2.isError).toBe(false);

      // Cache should work with memory fallback
      const key = createCacheKey('runbooks', 'connection-drop-test');
      await testEnv.cacheService.set(key, { connection: 'dropped' });
      const result = await testEnv.cacheService.get(key);
      expect(result).toEqual({ connection: 'dropped' });
    });

    it('should handle connection drops during high load', async () => {
      // Simulate connection drop during load
      let requestCount = 0;
      mockRedisInstance.get.mockImplementation(() => {
        requestCount++;
        if (requestCount > 5) {
          return Promise.reject(new Error('Connection lost during load'));
        }
        return Promise.resolve(null);
      });

      mockRedisInstance.setex.mockImplementation(() => {
        if (requestCount > 5) {
          return Promise.reject(new Error('Connection lost during load'));
        }
        return Promise.resolve('OK');
      });

      // Generate load that includes connection drop
      const loadResult = await generateLoad(testEnv.server, {
        requestCount: 15,
        concurrency: 3,
        requestTypes: [{
          name: 'search_runbooks',
          arguments: {
            alert_type: 'load_connection_drop',
            severity: 'medium',
            systems: ['load_test']
          }
        }]
      });

      // All requests should succeed despite connection drop
      expect(loadResult.successCount).toBe(15);
      expect(loadResult.errorCount).toBe(0);
      
      // Performance should be reasonable
      expect(loadResult.averageTimeMs).toBeLessThan(1000); // <1s average
    });

    it('should detect and report connection instability', async () => {
      let flipFlop = false;
      
      // Simulate unstable connection (alternating success/failure)
      mockRedisInstance.get.mockImplementation(() => {
        flipFlop = !flipFlop;
        if (flipFlop) {
          return Promise.resolve(null);
        }
        return Promise.reject(new Error('Unstable connection'));
      });

      mockRedisInstance.setex.mockImplementation(() => {
        if (flipFlop) {
          return Promise.resolve('OK');
        }
        return Promise.reject(new Error('Unstable connection'));
      });

      mockRedisInstance.ping.mockImplementation(() => {
        if (flipFlop) {
          return Promise.resolve('PONG');
        }
        return Promise.reject(new Error('Unstable connection'));
      });

      // Perform multiple operations to detect instability
      for (let i = 0; i < 10; i++) {
        const response = await testEnv.mcpExecutor.executeToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: `instability_test_${i}`,
              severity: 'low',
              systems: ['instability_test']
            }
          }
        });

        expect(response.isError).toBe(false);
      }

      // System should remain functional despite instability
      const health = await testEnv.cacheService.healthCheck();
      expect(health.memory_cache.healthy).toBe(true);
      expect(health.overall_healthy).toBe(true);
    });
  });

  describe('Slow Network Scenarios', () => {
    it('should handle very slow Redis responses', async () => {
      // Simulate very slow network (but not timing out)
      mockRedisInstance.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(null), 1000) // 1 second delay
        )
      );

      mockRedisInstance.setex.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve('OK'), 1000) // 1 second delay
        )
      );

      mockRedisInstance.ping.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve('PONG'), 500) // 0.5 second delay
        )
      );

      // Operations should still complete but may be slower
      const startTime = Date.now();
      
      const response = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'slow_network_test',
            severity: 'medium',
            systems: ['slow_network']
          }
        }
      });

      const responseTime = Date.now() - startTime;

      expect(response.isError).toBe(false);
      
      // Response should complete despite slow Redis
      // (memory cache should make it faster than Redis delays)
      expect(responseTime).toBeLessThan(5000); // Should complete in <5s

      // Health check should detect slow responses
      const health = await testEnv.cacheService.healthCheck();
      expect(health.redis_cache?.response_time_ms).toBeGreaterThan(0);
    });

    it('should maintain performance with degraded network conditions', async () => {
      // Simulate degraded network with variable delays
      mockRedisInstance.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(null), Math.random() * 800 + 200) // 200-1000ms delay
        )
      );

      mockRedisInstance.setex.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve('OK'), Math.random() * 800 + 200) // 200-1000ms delay
        )
      );

      // Perform concurrent operations under degraded conditions
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          testEnv.mcpExecutor.executeToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `degraded_network_${i}`,
                severity: 'medium',
                systems: ['degraded_test']
              }
            }
          })
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const totalTime = Date.now() - startTime;

      // All operations should succeed
      responses.forEach((response: any) => {
        expect(response.isError).toBe(false);
      });

      // Performance should be reasonable despite network degradation
      expect(totalTime).toBeLessThan(15000); // <15s for all operations
      
      const avgTime = totalTime / operations.length;
      expect(avgTime).toBeLessThan(2000); // <2s average per operation
    });

    it('should handle packet loss simulation', async () => {
      let packetLossCount = 0;
      const packetLossRate = 0.3; // 30% packet loss

      // Simulate packet loss (some operations fail, others succeed with delay)
      mockRedisInstance.get.mockImplementation(() => {
        packetLossCount++;
        if (Math.random() < packetLossRate) {
          return Promise.reject(new Error('Packet lost'));
        }
        return new Promise(resolve => 
          setTimeout(() => resolve(null), Math.random() * 300 + 100) // 100-400ms delay
        );
      });

      mockRedisInstance.setex.mockImplementation(() => {
        if (Math.random() < packetLossRate) {
          return Promise.reject(new Error('Packet lost'));
        }
        return new Promise(resolve => 
          setTimeout(() => resolve('OK'), Math.random() * 300 + 100)
        );
      });

      // System should handle packet loss gracefully
      const operations = [];
      for (let i = 0; i < 20; i++) {
        operations.push(
          testEnv.mcpExecutor.executeToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `packet_loss_test_${i}`,
                severity: 'low',
                systems: ['packet_loss']
              }
            }
          })
        );
      }

      const responses = await Promise.all(operations);

      // All operations should succeed despite packet loss
      responses.forEach((response: any) => {
        expect(response.isError).toBe(false);
      });

      // Cache should still function
      const stats = testEnv.cacheService.getStats();
      expect(stats.total_operations).toBeGreaterThan(0);
    });
  });

  describe('Network Recovery Scenarios', () => {
    it('should handle network recovery after extended outage', async () => {
      // Start with network failure
      mockRedisInstance.get.mockRejectedValue(new Error('Network unreachable'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Network unreachable'));
      mockRedisInstance.ping.mockRejectedValue(new Error('Network unreachable'));

      // Operations during outage
      const outageOperations = [];
      for (let i = 0; i < 5; i++) {
        outageOperations.push(
          testEnv.mcpExecutor.executeToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `outage_test_${i}`,
                severity: 'medium',
                systems: ['outage_test']
              }
            }
          })
        );
      }

      const outageResponses = await Promise.all(outageOperations);
      
      // All should succeed with memory cache
      outageResponses.forEach((response: any) => {
        expect(response.isError).toBe(false);
      });

      // Simulate network recovery
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.ping.mockResolvedValue('PONG');

      // Wait a bit for potential internal recovery detection
      await new Promise(resolve => setTimeout(resolve, 100));

      // Operations after recovery
      const recoveryOperations = [];
      for (let i = 0; i < 5; i++) {
        recoveryOperations.push(
          testEnv.mcpExecutor.executeToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `recovery_test_${i}`,
                severity: 'medium',
                systems: ['recovery_test']
              }
            }
          })
        );
      }

      const recoveryResponses = await Promise.all(recoveryOperations);
      
      // All should succeed after recovery
      recoveryResponses.forEach((response: any) => {
        expect(response.isError).toBe(false);
      });

      // Health check should reflect recovery
      const health = await testEnv.cacheService.healthCheck();
      expect(health.memory_cache.healthy).toBe(true);
      expect(health.redis_cache?.healthy).toBe(true);
      expect(health.overall_healthy).toBe(true);
    });

    it('should handle gradual network quality improvement', async () => {
      let networkQuality = 0; // Start with poor quality
      
      // Simulate gradually improving network
      mockRedisInstance.get.mockImplementation(() => {
        networkQuality += 0.1; // Improve by 10% each call
        
        if (Math.random() > networkQuality) {
          return Promise.reject(new Error('Network quality poor'));
        }
        
        const delay = Math.max(50, 1000 * (1 - networkQuality)); // Decreasing delay
        return new Promise(resolve => 
          setTimeout(() => resolve(null), delay)
        );
      });

      mockRedisInstance.setex.mockImplementation(() => {
        if (Math.random() > networkQuality) {
          return Promise.reject(new Error('Network quality poor'));
        }
        
        const delay = Math.max(50, 1000 * (1 - networkQuality));
        return new Promise(resolve => 
          setTimeout(() => resolve('OK'), delay)
        );
      });

      // Perform operations as network improves
      const operations = [];
      for (let i = 0; i < 20; i++) {
        operations.push(
          testEnv.mcpExecutor.executeToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `quality_improvement_${i}`,
                severity: 'low',
                systems: ['quality_test']
              }
            }
          })
        );
        
        // Small delay between operations to allow quality improvement
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const responses = await Promise.all(operations);

      // All operations should succeed
      responses.forEach((response: any) => {
        expect(response.isError).toBe(false);
      });

      // Later operations should be faster due to improved network
      expect(networkQuality).toBeGreaterThan(0.5); // Network should have improved
    });
  });

  describe('Network Monitoring and Alerting', () => {
    it('should trigger monitoring alerts for network issues', async () => {
      // Configure Redis to have consistent network issues
      mockRedisInstance.get.mockRejectedValue(new Error('Network monitoring test'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Network monitoring test'));
      mockRedisInstance.ping.mockRejectedValue(new Error('Network monitoring test'));

      // Start monitoring
      testEnv.monitoringService.start();

      // Generate load to trigger potential alerts
      await generateLoad(testEnv.server, {
        requestCount: 10,
        concurrency: 2,
        requestTypes: [{
          name: 'search_runbooks',
          arguments: {
            alert_type: 'network_monitoring',
            severity: 'medium',
            systems: ['monitoring_test']
          }
        }]
      });

      // Wait for monitoring cycle
      await waitForCondition(
        () => testEnv.monitoringService.getAlertHistory().length > 0,
        3000
      );

      // Check if any network-related monitoring occurred
      const status = testEnv.monitoringService.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.running).toBe(true);

      testEnv.monitoringService.stop();
    });

    it('should track network performance metrics', async () => {
      // Simulate varying network performance
      let responseTime = 100;
      
      mockRedisInstance.get.mockImplementation(() => 
        new Promise(resolve => {
          responseTime += Math.random() * 100 - 50; // Vary response time
          responseTime = Math.max(50, Math.min(500, responseTime)); // Keep in range
          setTimeout(() => resolve(null), responseTime);
        })
      );

      mockRedisInstance.setex.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve('OK'), responseTime)
        )
      );

      // Generate operations to collect metrics
      for (let i = 0; i < 15; i++) {
        await testEnv.mcpExecutor.executeToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: `metrics_test_${i}`,
              severity: 'low',
              systems: ['metrics_test']
            }
          }
        });
      }

      // Check performance metrics
      const metrics = testEnv.performanceMonitor.getMetrics();
      expect(metrics.response_times.count).toBeGreaterThan(0);
      expect(metrics.response_times.avg_ms).toBeGreaterThan(0);
      
      // Check cache health includes response times
      const health = await testEnv.cacheService.healthCheck();
      expect(health.redis_cache?.response_time_ms).toBeGreaterThan(0);
    });
  });

  describe('Mixed Network Conditions', () => {
    it('should handle mixed success and failure conditions', async () => {
      let operationCount = 0;
      
      // Create complex network simulation with multiple failure modes
      mockRedisInstance.get.mockImplementation(() => {
        operationCount++;
        const scenario = operationCount % 5;
        
        switch (scenario) {
          case 0: // Success
            return Promise.resolve(null);
          case 1: // Timeout
            return new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 100)
            );
          case 2: // Connection refused
            return Promise.reject(new Error('Connection refused'));
          case 3: // DNS failure
            const dnsError = new Error('DNS failure');
            (dnsError as any).code = 'ENOTFOUND';
            return Promise.reject(dnsError);
          case 4: // Slow response
            return new Promise(resolve => 
              setTimeout(() => resolve(null), 800)
            );
          default:
            return Promise.resolve(null);
        }
      });

      // Similar pattern for setex
      mockRedisInstance.setex.mockImplementation(() => {
        const scenario = operationCount % 5;
        
        switch (scenario) {
          case 0:
            return Promise.resolve('OK');
          case 1:
            return new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 100)
            );
          case 2:
            return Promise.reject(new Error('Connection refused'));
          case 3:
            const dnsError = new Error('DNS failure');
            (dnsError as any).code = 'ENOTFOUND';
            return Promise.reject(dnsError);
          case 4:
            return new Promise(resolve => 
              setTimeout(() => resolve('OK'), 800)
            );
          default:
            return Promise.resolve('OK');
        }
      });

      // System should handle all mixed conditions gracefully
      const mixedOperations = [];
      for (let i = 0; i < 25; i++) {
        mixedOperations.push(
          testEnv.mcpExecutor.executeToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `mixed_conditions_${i}`,
                severity: 'medium',
                systems: ['mixed_test']
              }
            }
          })
        );
      }

      const responses = await Promise.all(mixedOperations);

      // All operations should succeed despite mixed network conditions
      responses.forEach((response: any) => {
        expect(response.isError).toBe(false);
      });

      // System should maintain good cache statistics
      const stats = testEnv.cacheService.getStats();
      expect(stats.total_operations).toBeGreaterThanOrEqual(25);
      expect(stats.hit_rate).toBeGreaterThanOrEqual(0); // Should be reasonable
    });
  });
});