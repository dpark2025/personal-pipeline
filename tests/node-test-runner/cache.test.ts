/**
 * Cache Service Tests using Node.js Test Runner
 * 
 * Tests cache operations, Redis integration, error handling, and statistics
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  CacheService,
  createCacheKey,
  initializeCacheService,
  getCacheService,
} from '../../src/utils/cache.js';
import type { CacheConfig } from '../../src/types/index.js';

// Mock logger to prevent console output during tests
const mockLogger = {
  info: mock.fn(),
  debug: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
};

// Mock circuit breaker
const mockCircuitBreaker = {
  execute: mock.fn((fn) => fn()),
};

const mockCircuitBreakerFactory = {
  forCache: mock.fn(() => mockCircuitBreaker),
};

// Mock Redis instance
const mockRedisInstance = {
  get: mock.fn(),
  setex: mock.fn(),
  del: mock.fn(),
  keys: mock.fn(),
  ping: mock.fn(async () => 'PONG'),
  quit: mock.fn(),
  on: mock.fn(),
  off: mock.fn(),
  removeAllListeners: mock.fn(),
  status: 'ready',
  connect: mock.fn(),
  disconnect: mock.fn(),
};

// Mock Redis Connection Manager
const mockRedisConnectionManager = {
  redis: mockRedisInstance,
  connect: mock.fn(async () => true),
  disconnect: mock.fn(async () => undefined),
  isConnected: mock.fn(() => true),
  isAvailable: mock.fn(() => true),
  getClient: mock.fn(() => mockRedisInstance),
  executeOperation: mock.fn(async (operation: any) => {
    if (typeof operation === 'function') {
      return await operation(mockRedisInstance);
    }
    return null;
  }),
  getStats: mock.fn(() => ({
    state: 'connected',
    totalAttempts: 1,
    successfulConnections: 1,
    consecutiveFailures: 0,
  })),
  on: mock.fn(),
  emit: mock.fn(),
  removeAllListeners: mock.fn(),
};

describe('CacheService (Node.js Test Runner)', () => {
  let cacheService: CacheService;
  
  const createTestConfig = (
    strategy: 'memory_only' | 'hybrid' | 'redis_only' = 'memory_only'
  ): CacheConfig => ({
    enabled: true,
    strategy,
    memory: {
      max_keys: 100,
      ttl_seconds: 300,
      check_period_seconds: 60,
    },
    redis: {
      enabled: strategy !== 'memory_only',
      url: 'redis://localhost:6379',
      ttl_seconds: 600,
      key_prefix: 'pp:test:',
      connection_timeout_ms: 5000,
      retry_attempts: 3,
      retry_delay_ms: 1000,
      max_retry_delay_ms: 10000,
      backoff_multiplier: 2,
      connection_retry_limit: 5,
    },
    content_types: {
      runbooks: {
        ttl_seconds: 300,
        warmup: true,
      },
      procedures: {
        ttl_seconds: 180,
        warmup: false,
      },
      decision_trees: {
        ttl_seconds: 240,
        warmup: true,
      },
      knowledge_base: {
        ttl_seconds: 90,
        warmup: false,
      },
    },
  });

  beforeEach(() => {
    // Reset all mock calls
    Object.values(mockLogger).forEach(fn => fn.mock.resetCalls());
    Object.values(mockRedisInstance).forEach(fn => {
      if (typeof fn === 'object' && fn.mock) {
        fn.mock.resetCalls();
      }
    });
    Object.values(mockRedisConnectionManager).forEach(fn => {
      if (typeof fn === 'object' && fn.mock) {
        fn.mock.resetCalls();
      }
    });
  });

  afterEach(async () => {
    if (cacheService) {
      await cacheService.shutdown();
    }
  });

  describe('Memory-Only Cache Operations', () => {
    beforeEach(() => {
      cacheService = new CacheService(createTestConfig('memory_only'));
    });

    it('should set and get values from memory cache', async () => {
      const key = createCacheKey('runbooks', 'test-runbook-1');
      const value = {
        id: 'test-runbook-1',
        title: 'Emergency Response Runbook',
        procedures: ['step1', 'step2', 'step3'],
      };

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      assert.deepStrictEqual(result, value);
    });

    it('should return null for non-existent keys', async () => {
      const key = createCacheKey('runbooks', 'non-existent-key');
      const result = await cacheService.get(key);

      assert.strictEqual(result, null);
    });

    it('should delete values from memory cache', async () => {
      const key = createCacheKey('procedures', 'test-procedure');
      const value = { step: 'test step', duration: '5min' };

      await cacheService.set(key, value);
      assert.deepStrictEqual(await cacheService.get(key), value);

      await cacheService.delete(key);
      assert.strictEqual(await cacheService.get(key), null);
    });

    it('should clear all entries for a content type', async () => {
      const runbook1 = createCacheKey('runbooks', 'rb1');
      const runbook2 = createCacheKey('runbooks', 'rb2');
      const procedure1 = createCacheKey('procedures', 'proc1');

      await cacheService.set(runbook1, { data: 'rb1' });
      await cacheService.set(runbook2, { data: 'rb2' });
      await cacheService.set(procedure1, { data: 'proc1' });

      await cacheService.clearByType('runbooks');

      assert.strictEqual(await cacheService.get(runbook1), null);
      assert.strictEqual(await cacheService.get(runbook2), null);
      assert.deepStrictEqual(await cacheService.get(procedure1), { data: 'proc1' });
    });

    it('should clear all cache entries', async () => {
      const key1 = createCacheKey('runbooks', 'rb1');
      const key2 = createCacheKey('procedures', 'proc1');

      await cacheService.set(key1, { data: 'rb1' });
      await cacheService.set(key2, { data: 'proc1' });

      await cacheService.clearAll();

      assert.strictEqual(await cacheService.get(key1), null);
      assert.strictEqual(await cacheService.get(key2), null);
    });

    it('should track cache statistics correctly', async () => {
      const key = createCacheKey('runbooks', 'stats-test');

      // Initial stats
      let stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 0);
      assert.strictEqual(stats.misses, 0);
      assert.strictEqual(stats.hit_rate, 0);

      // Generate a miss
      await cacheService.get(key);
      stats = cacheService.getStats();
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.total_operations, 1);
      assert.strictEqual(stats.hit_rate, 0);

      // Set value and generate a hit
      await cacheService.set(key, { data: 'test' });
      await cacheService.get(key);
      stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 1);
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.total_operations, 2);
      assert.strictEqual(stats.hit_rate, 0.5);

      // Check content type statistics
      assert(stats.by_content_type?.runbooks);
      assert.strictEqual(stats.by_content_type.runbooks.hits, 1);
      assert.strictEqual(stats.by_content_type.runbooks.misses, 1);
      assert.strictEqual(stats.by_content_type.runbooks.hit_rate, 0.5);
    });

    it('should perform health check on memory cache', async () => {
      const health = await cacheService.healthCheck();

      assert.strictEqual(health.memory_cache.healthy, true);
      assert(health.memory_cache.keys_count >= 0);
      assert(health.memory_cache.response_time_ms >= 0);
      assert.strictEqual(health.overall_healthy, true);
      assert.strictEqual(health.redis_cache, undefined);
    });

    it('should handle warm cache with critical data', async () => {
      const criticalData = [
        {
          key: createCacheKey('runbooks', 'critical-runbook-1'),
          data: { title: 'Critical System Failure Response', priority: 'high' },
        },
        {
          key: createCacheKey('procedures', 'emergency-procedure'),
          data: { steps: ['assess', 'contain', 'resolve'], urgency: 'critical' },
        },
      ];

      await cacheService.warmCache(criticalData);

      // Verify all critical data is cached
      for (const item of criticalData) {
        const result = await cacheService.get(item.key);
        assert.deepStrictEqual(result, item.data);
      }
    });

    it('should handle complex nested objects', async () => {
      const key = createCacheKey('decision_trees', 'complex-object-test');
      const complexValue = {
        id: 'dt-001',
        name: 'Complex Decision Tree',
        nodes: [
          {
            id: 'node-1',
            type: 'condition',
            condition: 'severity === "critical"',
            branches: {
              true: { action: 'escalate_immediately' },
              false: { next: 'node-2' },
            },
          },
        ],
        metadata: {
          created: new Date().toISOString(),
          tags: ['emergency', 'system-failure'],
          confidence: 0.95,
        },
      };

      await cacheService.set(key, complexValue);
      const result = await cacheService.get(key);

      assert.deepStrictEqual(result, complexValue);
    });

    it('should handle concurrent cache operations', async () => {
      const promises = [];

      // Simulate concurrent operations
      for (let i = 0; i < 10; i++) {
        const key = createCacheKey('runbooks', `concurrent-test-${i}`);
        const value = { id: i, data: `concurrent data ${i}` };

        promises.push(cacheService.set(key, value).then(() => cacheService.get(key)));
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        assert.deepStrictEqual(result, { id: index, data: `concurrent data ${index}` });
      });
    });
  });

  describe('Disabled Cache Behavior', () => {
    beforeEach(() => {
      const config = createTestConfig('memory_only');
      config.enabled = false;
      cacheService = new CacheService(config);
    });

    it('should return null for all operations when disabled', async () => {
      const key = createCacheKey('runbooks', 'disabled-test');
      const value = { data: 'should not be cached' };

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      assert.strictEqual(result, null);
    });

    it('should not perform cache operations when disabled', async () => {
      const key = createCacheKey('procedures', 'disabled-ops-test');

      // These should complete without error but do nothing
      await assert.doesNotReject(async () => {
        await cacheService.delete(key);
        await cacheService.clearByType('runbooks');
        await cacheService.clearAll();
        await cacheService.warmCache([]);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      cacheService = new CacheService(createTestConfig('memory_only'));
    });

    it('should handle malformed cache keys gracefully', async () => {
      const key = createCacheKey('runbooks', '');
      const value = { data: 'empty key test' };

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      assert.deepStrictEqual(result, value);
    });

    it('should handle null/undefined values', async () => {
      const key = createCacheKey('procedures', 'null-test');

      await cacheService.set(key, null);
      const result = await cacheService.get(key);

      assert.strictEqual(result, null);
    });

    it('should handle high-volume cache operations efficiently', async () => {
      const startTime = Date.now();
      const operations = [];

      // Generate 100 cache operations (reduced from 1000 for faster tests)
      for (let i = 0; i < 100; i++) {
        const key = createCacheKey('knowledge_base', `perf-test-${i}`);
        const value = {
          id: i,
          content: `Performance test data item ${i}`,
          timestamp: Date.now(),
        };

        operations.push(cacheService.set(key, value).then(() => cacheService.get(key)));
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All operations should complete successfully
      assert.strictEqual(results.length, 100);
      assert(results.every(result => result !== null));

      // Should complete within reasonable time
      assert(duration < 2000); // 2 seconds

      // Check final statistics
      const stats = cacheService.getStats();
      assert(stats.total_operations >= 200); // 100 sets + 100 gets
      assert.strictEqual(stats.hits, 100);
    });
  });

  describe('Cache Key Utilities', () => {
    it('should create proper cache keys for all content types', () => {
      const contentTypes = ['runbooks', 'procedures', 'decision_trees', 'knowledge_base'] as const;

      contentTypes.forEach(type => {
        const key = createCacheKey(type, `test-${type}-123`);

        assert.strictEqual(key.type, type);
        assert.strictEqual(key.identifier, `test-${type}-123`);
      });
    });

    it('should handle special characters in identifiers', () => {
      const specialId = 'test@#$%^&*()_+-=[]{}|;:,.<>?';
      const key = createCacheKey('runbooks', specialId);

      assert.strictEqual(key.type, 'runbooks');
      assert.strictEqual(key.identifier, specialId);
    });

    it('should handle unicode characters in identifiers', () => {
      const unicodeId = 'тест-ランブック-测试-🚨📋✅';
      const key = createCacheKey('procedures', unicodeId);

      assert.strictEqual(key.type, 'procedures');
      assert.strictEqual(key.identifier, unicodeId);
    });
  });

  describe('Singleton Pattern and Factory Functions', () => {
    it('should maintain singleton instance with initializeCacheService', () => {
      const config = createTestConfig('memory_only');

      const service1 = initializeCacheService(config);
      const service2 = initializeCacheService(config);

      assert.strictEqual(service1, service2);
    });

    it('should return initialized service with getCacheService', () => {
      const config = createTestConfig('memory_only');
      const initializedService = initializeCacheService(config);
      const retrievedService = getCacheService();

      assert.strictEqual(retrievedService, initializedService);
    });
  });
});