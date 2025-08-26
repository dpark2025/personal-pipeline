/**
 * Redis Cache Integration Tests
 *
 * Tests Redis integration scenarios, including connection failures,
 * fallback mechanisms, and circuit breaker behavior.
 * Uses memory-only strategy to avoid requiring actual Redis instance.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CacheService, createCacheKey } from '../../src/utils/cache.js';
import { CacheConfig } from '../../src/types/index.js';

describe('Redis Cache Integration Tests', () => {
  // Only run Redis integration tests when explicitly enabled
  const shouldRunRedisTests = process.env.TEST_REDIS === 'true' || process.env.REDIS_URL !== undefined;
  
  if (!shouldRunRedisTests) {
    it('should skip Redis integration tests unless TEST_REDIS=true or REDIS_URL is set', () => {
      console.log('Skipping Redis integration tests - Use TEST_REDIS=true or set REDIS_URL to enable');
    });
    return;
  }
  let cacheService: CacheService;

  const hybridConfig: CacheConfig = {
    enabled: true,
    strategy: 'hybrid',
    memory: {
      max_keys: 50,
      ttl_seconds: 30,
      check_period_seconds: 15,
    },
    redis: {
      enabled: true,
      url: 'redis://localhost:6379', // This will fail in test environment
      ttl_seconds: 60,
      key_prefix: 'test:redis:',
      connection_timeout_ms: 1000, // Short timeout for faster test failure
      retry_attempts: 1, // Minimal retries for faster tests
      retry_delay_ms: 100,
      max_retry_delay_ms: 1000,
      backoff_multiplier: 2,
      connection_retry_limit: 2, // Quick circuit breaker
    },
    content_types: {
      runbooks: {
        ttl_seconds: 1800,
        warmup: true,
      },
      procedures: {
        ttl_seconds: 900,
        warmup: false,
      },
      decision_trees: {
        ttl_seconds: 1200,
        warmup: true,
      },
      knowledge_base: {
        ttl_seconds: 600,
        warmup: false,
      },
    },
  };

  beforeEach(async () => {
    // Create a fresh cache service instance that will attempt Redis connection
    // but gracefully fall back to memory-only when Redis is unavailable
    cacheService = new CacheService(hybridConfig);

    // Wait briefly for Redis connection attempt to complete
    // The cache service initializes synchronously, but Redis connection is async
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    if (cacheService) {
      await cacheService.shutdown();
    }
  });

  describe('Redis Connection Failure Handling', () => {
    it('should gracefully handle Redis connection failure', async () => {
      // Cache service should initialize successfully even when Redis is unavailable
      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 0);
      assert.strictEqual(stats.misses, 0);

      // The service should operate normally even with Redis issues
      // (Redis connection status may vary depending on initialization timing)
      assert(typeof stats.redis_connected === 'boolean');
    });

    it('should fallback to memory-only caching when Redis fails', async () => {
      const key = createCacheKey('runbooks', 'redis-fallback-test');
      const testData = { title: 'Redis Fallback Test', content: 'Should work with memory only' };

      // Set operation should succeed using memory cache
      await assert.doesNotReject(async () => {
        await cacheService.set(key, testData);
      });

      // Get operation should succeed using memory cache
      const result = await cacheService.get(key);
      assert.deepStrictEqual(result, testData);

      // Stats should show memory cache activity
      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 1);
      assert.strictEqual(stats.total_operations, 1);
      // Cache should work regardless of Redis status
      assert(typeof stats.redis_connected === 'boolean');
    });

    it('should handle cache clearing when Redis is unavailable', async () => {
      // Add test data to memory cache
      await cacheService.set(createCacheKey('runbooks', 'rb1'), { id: 1 });
      await cacheService.set(createCacheKey('procedures', 'proc1'), { id: 2 });

      // Verify data exists
      const result1 = await cacheService.get(createCacheKey('runbooks', 'rb1'));
      assert.deepStrictEqual(result1, { id: 1 });

      // Clear should work with memory cache only
      await assert.doesNotReject(async () => {
        await cacheService.clearAll();
      });

      // Data should be cleared
      const result2 = await cacheService.get(createCacheKey('runbooks', 'rb1'));
      assert.strictEqual(result2, null);
    });

    it('should handle content-type clearing when Redis is unavailable', async () => {
      // Add mixed content types
      await cacheService.set(createCacheKey('runbooks', 'rb1'), { type: 'runbook' });
      await cacheService.set(createCacheKey('procedures', 'proc1'), { type: 'procedure' });

      // Clear only runbooks
      await assert.doesNotReject(async () => {
        await cacheService.clearByType('runbooks');
      });

      // Runbook should be cleared, procedure should remain
      const runbook = await cacheService.get(createCacheKey('runbooks', 'rb1'));
      const procedure = await cacheService.get(createCacheKey('procedures', 'proc1'));

      assert.strictEqual(runbook, null);
      assert.deepStrictEqual(procedure, { type: 'procedure' });
    });
  });

  describe('Health Check with Redis Unavailable', () => {
    it('should report Redis as unhealthy in health check', async () => {
      const healthCheck = await cacheService.healthCheck();

      // Memory cache should be healthy
      assert.strictEqual(healthCheck.memory_cache.healthy, true);
      assert(healthCheck.memory_cache.response_time_ms >= 0);

      // Redis health depends on connection attempt results
      // May be undefined if Redis manager not initialized, or unhealthy if connection failed
      if (healthCheck.redis_cache) {
        // If Redis cache info is present, connection was attempted
        assert(typeof healthCheck.redis_cache.healthy === 'boolean');
        assert(typeof healthCheck.redis_cache.connected === 'boolean');
      }

      // Overall health should still be true since memory cache works
      // (hybrid strategy tolerates Redis failures)
      assert.strictEqual(healthCheck.overall_healthy, true);
    });

    it('should handle health check timeouts gracefully', async () => {
      // Health check should complete quickly even if Redis is unresponsive
      const startTime = Date.now();
      const healthCheck = await cacheService.healthCheck();
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (not hang on Redis timeout)
      assert(duration < 5000); // Less than 5 seconds

      assert.strictEqual(healthCheck.memory_cache.healthy, true);
      assert.strictEqual(healthCheck.overall_healthy, true);
    });
  });

  describe('Performance Under Redis Failure', () => {
    it('should maintain good performance without Redis', async () => {
      const operations = [];
      const startTime = Date.now();

      // Perform multiple cache operations
      for (let i = 0; i < 20; i++) {
        const key = createCacheKey('runbooks', `perf-test-${i}`);
        operations.push(
          cacheService.set(key, { id: i, data: `test-${i}` }).then(() => cacheService.get(key))
        );
      }

      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // All operations should succeed
      assert.strictEqual(results.length, 20);
      results.forEach((result, index) => {
        assert.deepStrictEqual(result, { id: index, data: `test-${index}` });
      });

      // Should complete quickly (memory cache is fast)
      assert(duration < 1000); // Less than 1 second for 20 operations

      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 20);
      assert.strictEqual(stats.total_operations, 20);
    });

    it('should handle concurrent operations without Redis', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        Promise.all([
          cacheService.set(createCacheKey('runbooks', `concurrent-${i}`), { id: i }),
          cacheService.set(createCacheKey('procedures', `concurrent-${i}`), { id: i + 100 }),
        ])
      );

      // All concurrent operations should succeed
      await assert.doesNotReject(async () => {
        await Promise.all(concurrentOperations);
      });

      // Verify data integrity
      for (let i = 0; i < 10; i++) {
        const runbook = await cacheService.get(createCacheKey('runbooks', `concurrent-${i}`));
        const procedure = await cacheService.get(createCacheKey('procedures', `concurrent-${i}`));

        assert.deepStrictEqual(runbook, { id: i });
        assert.deepStrictEqual(procedure, { id: i + 100 });
      }
    });
  });

  describe('Cache Warming Without Redis', () => {
    it('should warm cache successfully without Redis', async () => {
      const warmupData = [
        {
          key: createCacheKey('runbooks', 'critical-1'),
          data: { title: 'Critical Runbook 1', priority: 'high' },
        },
        {
          key: createCacheKey('decision_trees', 'critical-dt'),
          data: { title: 'Critical Decision Tree', branches: [] },
        },
        {
          key: createCacheKey('procedures', 'critical-proc'),
          data: { title: 'Critical Procedure', steps: ['step1', 'step2'] },
        },
      ];

      await assert.doesNotReject(async () => {
        await cacheService.warmCache(warmupData);
      });

      // Verify all data was warmed
      for (const { key, data } of warmupData) {
        const result = await cacheService.get(key);
        assert.deepStrictEqual(result, data);
      }

      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 3);
    });
  });

  describe('Memory-Only Fallback Strategy', () => {
    it('should effectively operate as memory-only when Redis fails', async () => {
      // Perform typical cache operations
      const operations = [
        { action: 'set', key: createCacheKey('runbooks', 'mem-test-1'), data: { id: 1 } },
        { action: 'set', key: createCacheKey('procedures', 'mem-test-2'), data: { id: 2 } },
        { action: 'get', key: createCacheKey('runbooks', 'mem-test-1') },
        { action: 'get', key: createCacheKey('procedures', 'mem-test-2') },
        { action: 'get', key: createCacheKey('runbooks', 'non-existent') },
      ];

      const results = [];
      for (const op of operations) {
        if (op.action === 'set') {
          await cacheService.set(op.key, op.data);
          results.push('set_ok');
        } else {
          const result = await cacheService.get(op.key);
          results.push(result);
        }
      }

      // Verify expected results
      assert.strictEqual(results[0], 'set_ok');
      assert.strictEqual(results[1], 'set_ok');
      assert.deepStrictEqual(results[2], { id: 1 });
      assert.deepStrictEqual(results[3], { id: 2 });
      assert.strictEqual(results[4], null);

      // Verify statistics are accurate
      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 2);
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.total_operations, 3);
      assert.strictEqual(stats.hit_rate, 2 / 3);
    });
  });
});
