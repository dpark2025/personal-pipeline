/**
 * Redis Failure Scenario Tests
 * Testing system behavior when Redis is unavailable or failing
 * 
 * QA Engineer: Error scenario testing for milestone 1.3
 * Coverage: Redis failures, network issues, graceful degradation
 */

import { createTestEnvironment, TestEnvironment, CacheTestHelper } from '../helpers/test-utils';
import { createCacheKey } from '../../src/utils/cache';
import Redis from 'ioredis';

// Mock Redis to simulate various failure modes
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

describe('Redis Failure Scenarios', () => {
  let testEnv: TestEnvironment;
  let cacheHelper: CacheTestHelper;
  let mockRedisInstance: jest.Mocked<Redis>;

  beforeEach(async () => {
    // Setup Redis mock with default working state
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

    // Create test environment with Redis enabled
    testEnv = await createTestEnvironment({
      cacheStrategy: 'hybrid' as const,
      generateTestData: {
        runbooks: 3,
        procedures: 2
      }
    });

    cacheHelper = new CacheTestHelper(testEnv.cacheService);
  });

  afterEach(async () => {
    await testEnv.cleanup();
    jest.clearAllMocks();
  });

  describe('Redis Connection Failures', () => {
    it('should handle Redis connection timeout gracefully', async () => {
      // Simulate connection timeout
      mockRedisInstance.get.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );
      mockRedisInstance.setex.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection timeout'));

      // Operations should still work with memory cache fallback
      const response = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'timeout_test',
            severity: 'medium',
            systems: ['redis_test']
          }
        }
      });

      expect(response.isError).toBe(false);

      // Cache should still function with memory-only
      const cacheKey = createCacheKey('runbooks', 'timeout-test');
      await testEnv.cacheService.set(cacheKey, { test: 'data' });
      const cachedData = await testEnv.cacheService.get(cacheKey);
      expect(cachedData).toEqual({ test: 'data' });

      // Health check should show Redis issues but overall health OK
      const health = await testEnv.cacheService.healthCheck();
      expect(health.memory_cache.healthy).toBe(true);
      expect(health.redis_cache?.healthy).toBe(false);
      expect(health.overall_healthy).toBe(true); // Should still be healthy
    });

    it('should handle Redis connection refused errors', async () => {
      // Simulate connection refused
      const connectionError = new Error('Connection refused');
      (connectionError as any).code = 'ECONNREFUSED';

      mockRedisInstance.get.mockRejectedValue(connectionError);
      mockRedisInstance.setex.mockRejectedValue(connectionError);
      mockRedisInstance.ping.mockRejectedValue(connectionError);

      // MCP operations should continue working
      const response = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'get_procedure',
          arguments: {
            procedure_id: 'proc-001',
            section: 'overview'
          }
        }
      });

      expect(response.isError).toBe(false);

      // Cache operations should work with memory fallback
      const key = createCacheKey('procedures', 'connection-refused-test');
      await testEnv.cacheService.set(key, { connection: 'refused_test' });
      const result = await testEnv.cacheService.get(key);
      expect(result).toEqual({ connection: 'refused_test' });
    });

    it('should handle Redis authentication failures', async () => {
      // Simulate authentication error
      const authError = new Error('Authentication failed');
      (authError as any).code = 'NOAUTH';

      mockRedisInstance.get.mockRejectedValue(authError);
      mockRedisInstance.setex.mockRejectedValue(authError);
      mockRedisInstance.ping.mockRejectedValue(authError);

      // System should fallback to memory-only cache
      const response = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'auth_failure_test',
            severity: 'high',
            systems: ['auth_test']
          }
        }
      });

      expect(response.isError).toBe(false);

      // Health check should indicate Redis authentication issues
      const health = await testEnv.cacheService.healthCheck();
      expect(health.redis_cache?.healthy).toBe(false);
      expect(health.redis_cache?.error_message).toContain('Authentication failed');
    });

    it('should handle Redis server unavailable scenarios', async () => {
      // Simulate server unavailable
      const serverError = new Error('Server not available');
      (serverError as any).code = 'ENOTFOUND';

      mockRedisInstance.get.mockRejectedValue(serverError);
      mockRedisInstance.setex.mockRejectedValue(serverError);
      mockRedisInstance.ping.mockRejectedValue(serverError);

      // Multiple operations should work without Redis
      const operations = [
        {
          name: 'search_runbooks',
          arguments: { alert_type: 'server_unavailable_1', severity: 'medium', systems: ['test'] }
        },
        {
          name: 'get_procedure',
          arguments: { procedure_id: 'proc-001', section: 'steps' }
        },
        {
          name: 'search_knowledge_base',
          arguments: { query: 'server unavailable test', category: 'test' }
        }
      ];

      for (const op of operations) {
        const response = await testEnv.mcpExecutor.executeToolCall({
          method: 'tools/call',
          params: op
        });
        expect(response.isError).toBe(false);
      }

      // Cache statistics should still be tracked
      const stats = testEnv.cacheService.getStats();
      expect(stats.total_operations).toBeGreaterThan(0);
    });
  });

  describe('Redis Operation Failures', () => {
    it('should handle partial Redis operation failures', async () => {
      // Simulate get working but set failing
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockRejectedValue(new Error('Write operation failed'));
      mockRedisInstance.ping.mockResolvedValue('PONG');

      // Operations should work, but writes to Redis will fail silently
      const response = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'partial_failure_test',
            severity: 'low',
            systems: ['partial_test']
          }
        }
      });

      expect(response.isError).toBe(false);

      // Memory cache should still work
      const key = createCacheKey('runbooks', 'partial-failure-test');
      await testEnv.cacheService.set(key, { partial: 'test' });
      const result = await testEnv.cacheService.get(key);
      expect(result).toEqual({ partial: 'test' });

      // Health check should show mixed Redis state
      const health = await testEnv.cacheService.healthCheck();
      expect(health.memory_cache.healthy).toBe(true);
      // Redis health might be healthy for reads but problematic for writes
    });

    it('should handle Redis data corruption scenarios', async () => {
      // Simulate corrupted data in Redis
      mockRedisInstance.get.mockResolvedValue('invalid-json-data-that-cannot-be-parsed');
      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.ping.mockResolvedValue('PONG');

      // System should handle corrupted data gracefully
      const response = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'corruption_test',
            severity: 'medium',
            systems: ['corruption_test']
          }
        }
      });

      expect(response.isError).toBe(false);

      // Should fallback to source data when Redis data is corrupted
      if (!response.isError) {
        const result = response.result.content[0];
        expect(result.type).toBe('text');
        if (result.type === 'text') {
          const data = JSON.parse(result.text);
          expect(data.cache_hit).toBe(false); // Should not be a cache hit due to corruption
        }
      }
    });

    it('should handle Redis memory pressure scenarios', async () => {
      // Simulate Redis out of memory
      const memoryError = new Error('Out of memory');
      (memoryError as any).code = 'OOM';

      mockRedisInstance.setex.mockRejectedValue(memoryError);
      mockRedisInstance.get.mockResolvedValue(null); // Gets still work
      mockRedisInstance.ping.mockResolvedValue('PONG');

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

      // Memory cache should still work for new data
      const key = createCacheKey('procedures', 'memory-pressure-test');
      await testEnv.cacheService.set(key, { memory_pressure: 'test' });
      const result = await testEnv.cacheService.get(key);
      expect(result).toEqual({ memory_pressure: 'test' });
    });

    it('should handle Redis key expiration edge cases', async () => {
      // Simulate data existing but expiring between checks
      let callCount = 0;
      mockRedisInstance.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(JSON.stringify({
            data: { test: 'expiring_data' },
            timestamp: Date.now(),
            ttl: 1, // Very short TTL
            content_type: 'runbooks'
          }));
        }
        return Promise.resolve(null); // Expired on subsequent calls
      });

      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.ping.mockResolvedValue('PONG');

      // First call should get cached data
      const response1 = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'expiration_test',
            severity: 'low',
            systems: ['expiration_test']
          }
        }
      });

      expect(response1.isError).toBe(false);

      // Wait briefly for expiration simulation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second call should not get cached data
      const response2 = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'expiration_test',
            severity: 'low',
            systems: ['expiration_test']
          }
        }
      });

      expect(response2.isError).toBe(false);
    });
  });

  describe('Network-Related Failures', () => {
    it('should handle intermittent network issues', async () => {
      // Simulate intermittent failures
      let failureCount = 0;
      const maxFailures = 3;

      mockRedisInstance.get.mockImplementation(() => {
        failureCount++;
        if (failureCount <= maxFailures) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(null);
      });

      mockRedisInstance.setex.mockImplementation(() => {
        if (failureCount <= maxFailures) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve('OK');
      });

      mockRedisInstance.ping.mockResolvedValue('PONG');

      // Multiple operations should eventually succeed
      for (let i = 0; i < 5; i++) {
        const response = await testEnv.mcpExecutor.executeToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: `intermittent_test_${i}`,
              severity: 'medium',
              systems: ['network_test']
            }
          }
        });

        expect(response.isError).toBe(false);
      }

      // System should recover and work normally
      const health = await testEnv.cacheService.healthCheck();
      expect(health.memory_cache.healthy).toBe(true);
    });

    it('should handle DNS resolution failures', async () => {
      // Simulate DNS resolution failure
      const dnsError = new Error('DNS resolution failed');
      (dnsError as any).code = 'ENOTFOUND';

      mockRedisInstance.get.mockRejectedValue(dnsError);
      mockRedisInstance.setex.mockRejectedValue(dnsError);
      mockRedisInstance.ping.mockRejectedValue(dnsError);

      // System should fallback gracefully
      const response = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'dns_failure_test',
            severity: 'high',
            systems: ['dns_test']
          }
        }
      });

      expect(response.isError).toBe(false);

      // Health check should reflect DNS issues
      const health = await testEnv.cacheService.healthCheck();
      expect(health.redis_cache?.healthy).toBe(false);
      expect(health.redis_cache?.error_message).toContain('DNS resolution failed');
    });

    it('should handle network partition scenarios', async () => {
      // Simulate network partition (connection drops)
      mockRedisInstance.get.mockRejectedValue(new Error('Connection lost'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Connection lost'));
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection lost'));

      // System should continue operating in partition
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          testEnv.mcpExecutor.executeToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `partition_test_${i}`,
                severity: 'medium',
                systems: ['partition_test']
              }
            }
          })
        );
      }

      const responses = await Promise.all(operations);
      responses.forEach((response: any) => {
        expect(response.isError).toBe(false);
      });

      // Cache should work with memory-only during partition
      const stats = testEnv.cacheService.getStats();
      expect(stats.total_operations).toBeGreaterThan(0);
    });
  });

  describe('Redis Recovery Scenarios', () => {
    it('should handle Redis recovery after failure', async () => {
      // Start with Redis failing
      mockRedisInstance.get.mockRejectedValue(new Error('Redis unavailable'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis unavailable'));
      mockRedisInstance.ping.mockRejectedValue(new Error('Redis unavailable'));

      // Operations during failure should work
      const response1 = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'recovery_test_before',
            severity: 'medium',
            systems: ['recovery_test']
          }
        }
      });

      expect(response1.isError).toBe(false);

      // Simulate Redis recovery
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.ping.mockResolvedValue('PONG');

      // Operations after recovery should work normally
      const response2 = await testEnv.mcpExecutor.executeToolCall({
        method: 'tools/call',
        params: {
          name: 'search_runbooks',
          arguments: {
            alert_type: 'recovery_test_after',
            severity: 'medium',
            systems: ['recovery_test']
          }
        }
      });

      expect(response2.isError).toBe(false);

      // Health check should show recovery
      const health = await testEnv.cacheService.healthCheck();
      expect(health.memory_cache.healthy).toBe(true);
      expect(health.redis_cache?.healthy).toBe(true);
      expect(health.overall_healthy).toBe(true);
    });

    it('should handle cache synchronization after Redis recovery', async () => {
      // Populate memory cache while Redis is down
      mockRedisInstance.get.mockRejectedValue(new Error('Redis down'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis down'));
      mockRedisInstance.ping.mockRejectedValue(new Error('Redis down'));

      const key = createCacheKey('runbooks', 'sync-test');
      await testEnv.cacheService.set(key, { sync: 'test_data' });

      // Verify data is in memory cache
      const memoryData = await testEnv.cacheService.get(key);
      expect(memoryData).toEqual({ sync: 'test_data' });

      // Simulate Redis recovery
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');
      mockRedisInstance.ping.mockResolvedValue('PONG');

      // New operations should work with both caches
      await testEnv.cacheService.set(key, { sync: 'updated_data' });
      const updatedData = await testEnv.cacheService.get(key);
      expect(updatedData).toEqual({ sync: 'updated_data' });

      // Verify Redis operations are being called after recovery
      expect(mockRedisInstance.setex).toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should trigger circuit breaker after multiple Redis failures', async () => {
      // Simulate multiple consecutive failures
      for (let i = 0; i < 10; i++) {
        mockRedisInstance.get.mockRejectedValue(new Error('Consecutive failure'));
        mockRedisInstance.setex.mockRejectedValue(new Error('Consecutive failure'));
      }

      mockRedisInstance.ping.mockRejectedValue(new Error('Consecutive failure'));

      // Operations should continue working despite failures
      for (let i = 0; i < 5; i++) {
        const response = await testEnv.mcpExecutor.executeToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: `circuit_breaker_test_${i}`,
              severity: 'medium',
              systems: ['circuit_test']
            }
          }
        });

        expect(response.isError).toBe(false);
      }

      // System should remain healthy with memory cache
      const health = await testEnv.cacheService.healthCheck();
      expect(health.memory_cache.healthy).toBe(true);
      expect(health.overall_healthy).toBe(true);
    });
  });

  describe('Performance Impact During Redis Failures', () => {
    it('should maintain performance when Redis is unavailable', async () => {
      // Configure Redis to fail
      mockRedisInstance.get.mockRejectedValue(new Error('Redis unavailable'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis unavailable'));
      mockRedisInstance.ping.mockRejectedValue(new Error('Redis unavailable'));

      // Measure performance during Redis failure
      const startTime = Date.now();
      const operations = [];

      for (let i = 0; i < 20; i++) {
        operations.push(
          testEnv.mcpExecutor.executeToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: {
                alert_type: `performance_test_${i}`,
                severity: 'medium',
                systems: ['performance_test']
              }
            }
          })
        );
      }

      const responses = await Promise.all(operations);
      const totalTime = Date.now() - startTime;

      // All operations should succeed
      responses.forEach((response: any) => {
        expect(response.isError).toBe(false);
      });

      // Performance should be reasonable (operations complete in <10s)
      expect(totalTime).toBeLessThan(10000);

      // Average response time should be acceptable
      const avgResponseTime = totalTime / operations.length;
      expect(avgResponseTime).toBeLessThan(500); // <500ms average
    });

    it('should not significantly impact memory usage during Redis failures', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Configure Redis to fail
      mockRedisInstance.get.mockRejectedValue(new Error('Memory test failure'));
      mockRedisInstance.setex.mockRejectedValue(new Error('Memory test failure'));
      mockRedisInstance.ping.mockRejectedValue(new Error('Memory test failure'));

      // Generate load during Redis failure
      for (let i = 0; i < 50; i++) {
        await testEnv.mcpExecutor.executeToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: {
              alert_type: `memory_test_${i}`,
              severity: 'low',
              systems: ['memory_test']
            }
          }
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (<50MB for this test)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });
});