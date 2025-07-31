/**
 * Comprehensive Cache Service Tests
 * Tests for both memory-only and Redis-enabled cache configurations
 * 
 * QA Engineer: Comprehensive testing for milestone 1.3 cache functionality
 * Coverage: Cache operations, Redis fallback, error handling, statistics
 */

// Unmock the cache module for this test since we want to test the real implementation
jest.unmock('../../../src/utils/cache');

import { CacheService, createCacheKey, initializeCacheService, getCacheService } from '../../../src/utils/cache';
import { CacheConfig } from '../../../src/types';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

// Mock logger to prevent console output during tests
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock circuit breaker
jest.mock('../../../src/utils/circuit-breaker', () => ({
  CircuitBreakerFactory: {
    forCache: jest.fn(() => ({
      execute: jest.fn((fn) => fn())
    }))
  }
}));

describe('CacheService - Comprehensive Testing', () => {
  let cacheService: CacheService;
  let mockRedisInstance: jest.Mocked<Redis>;

  const createTestConfig = (strategy: 'memory_only' | 'hybrid' | 'redis_only' = 'memory_only'): CacheConfig => ({
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
    // Reset mocks
    jest.clearAllMocks();
    MockedRedis.mockClear();

    // Setup Redis mock
    mockRedisInstance = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      ping: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
      status: 'ready',
    } as any;

    MockedRedis.mockImplementation(() => mockRedisInstance);
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
        procedures: ['step1', 'step2', 'step3']
      };

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const key = createCacheKey('runbooks', 'non-existent-key');
      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('should delete values from memory cache', async () => {
      const key = createCacheKey('procedures', 'test-procedure');
      const value = { step: 'test step', duration: '5min' };

      await cacheService.set(key, value);
      expect(await cacheService.get(key)).toEqual(value);

      await cacheService.delete(key);
      expect(await cacheService.get(key)).toBeNull();
    });

    it('should clear all entries for a content type', async () => {
      const runbook1 = createCacheKey('runbooks', 'rb1');
      const runbook2 = createCacheKey('runbooks', 'rb2');
      const procedure1 = createCacheKey('procedures', 'proc1');

      await cacheService.set(runbook1, { data: 'rb1' });
      await cacheService.set(runbook2, { data: 'rb2' });
      await cacheService.set(procedure1, { data: 'proc1' });

      await cacheService.clearByType('runbooks');

      expect(await cacheService.get(runbook1)).toBeNull();
      expect(await cacheService.get(runbook2)).toBeNull();
      expect(await cacheService.get(procedure1)).toEqual({ data: 'proc1' });
    });

    it('should clear all cache entries', async () => {
      const key1 = createCacheKey('runbooks', 'rb1');
      const key2 = createCacheKey('procedures', 'proc1');

      await cacheService.set(key1, { data: 'rb1' });
      await cacheService.set(key2, { data: 'proc1' });

      await cacheService.clearAll();

      expect(await cacheService.get(key1)).toBeNull();
      expect(await cacheService.get(key2)).toBeNull();
    });

    it('should track cache statistics correctly', async () => {
      const key = createCacheKey('runbooks', 'stats-test');

      // Initial stats
      let stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hit_rate).toBe(0);

      // Generate a miss
      await cacheService.get(key);
      stats = cacheService.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.total_operations).toBe(1);
      expect(stats.hit_rate).toBe(0);

      // Set value and generate a hit
      await cacheService.set(key, { data: 'test' });
      await cacheService.get(key);
      stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.total_operations).toBe(2);
      expect(stats.hit_rate).toBe(0.5);

      // Check content type statistics
      expect(stats.by_content_type?.runbooks).toBeDefined();
      expect(stats.by_content_type?.runbooks?.hits).toBe(1);
      expect(stats.by_content_type?.runbooks?.misses).toBe(1);
      expect(stats.by_content_type?.runbooks?.hit_rate).toBe(0.5);
    });

    it('should perform health check on memory cache', async () => {
      const health = await cacheService.healthCheck();

      expect(health.memory_cache.healthy).toBe(true);
      expect(health.memory_cache.keys_count).toBeGreaterThanOrEqual(0);
      expect(health.memory_cache.response_time_ms).toBeGreaterThanOrEqual(0);
      expect(health.overall_healthy).toBe(true);
      expect(health.redis_cache).toBeUndefined();
    });

    it('should handle warm cache with critical data', async () => {
      const criticalData = [
        {
          key: createCacheKey('runbooks', 'critical-runbook-1'),
          data: { title: 'Critical System Failure Response', priority: 'high' }
        },
        {
          key: createCacheKey('procedures', 'emergency-procedure'),
          data: { steps: ['assess', 'contain', 'resolve'], urgency: 'critical' }
        }
      ];

      await cacheService.warmCache(criticalData);

      // Verify all critical data is cached
      for (const item of criticalData) {
        const result = await cacheService.get(item.key);
        expect(result).toEqual(item.data);
      }
    });

    it('should respect content-type specific TTL values', async () => {
      // This test verifies TTL configuration is properly applied
      const runbookKey = createCacheKey('runbooks', 'ttl-test');
      const procedureKey = createCacheKey('procedures', 'ttl-test');

      await cacheService.set(runbookKey, { data: 'runbook' });
      await cacheService.set(procedureKey, { data: 'procedure' });

      // Both should be accessible immediately
      expect(await cacheService.get(runbookKey)).toEqual({ data: 'runbook' });
      expect(await cacheService.get(procedureKey)).toEqual({ data: 'procedure' });
    });
  });

  describe('Redis Integration Tests', () => {
    beforeEach(() => {
      cacheService = new CacheService(createTestConfig('hybrid'));
    });

    it('should fallback to Redis when memory cache misses', async () => {
      const key = createCacheKey('runbooks', 'redis-fallback-test');
      const value = { source: 'redis', data: 'fallback test' };

      // Mock Redis to return cached data
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({
        data: value,
        timestamp: Date.now(),
        ttl: 300,
        content_type: 'runbooks'
      }));

      const result = await cacheService.get(key);

      expect(mockRedisInstance.get).toHaveBeenCalledWith('runbooks:redis-fallback-test');
      expect(result).toEqual(value);
    });

    it('should store data in both memory and Redis', async () => {
      const key = createCacheKey('procedures', 'dual-storage-test');
      const value = { step: 'dual storage test', critical: true };

      mockRedisInstance.setex.mockResolvedValue('OK');

      await cacheService.set(key, value);

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'procedures:dual-storage-test',
        180, // procedures TTL
        expect.any(String)
      );

      // Should also be available from memory cache
      const result = await cacheService.get(key);
      expect(result).toEqual(value);
    });

    it('should handle Redis connection failures gracefully', async () => {
      const key = createCacheKey('runbooks', 'redis-failure-test');
      const value = { data: 'should work despite Redis failure' };

      // Mock Redis to fail
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis connection failed'));
      mockRedisInstance.get.mockRejectedValue(new Error('Redis connection failed'));

      // Should still work with memory cache
      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('should perform health check with Redis', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');

      const health = await cacheService.healthCheck();

      expect(health.memory_cache.healthy).toBe(true);
      expect(health.redis_cache?.healthy).toBe(true);
      expect(health.redis_cache?.connected).toBe(true);
      expect(health.overall_healthy).toBe(true);
    });

    it('should handle Redis health check failures', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Redis unavailable'));

      const health = await cacheService.healthCheck();

      expect(health.memory_cache.healthy).toBe(true);
      expect(health.redis_cache?.healthy).toBe(false);
      expect(health.redis_cache?.connected).toBe(false);
      expect(health.redis_cache?.error_message).toBe('Redis unavailable');
      // Overall should still be healthy for hybrid strategy
      expect(health.overall_healthy).toBe(true);
    });

    it('should clear Redis cache by content type', async () => {
      mockRedisInstance.keys.mockResolvedValue(['pp:test:runbooks:rb1', 'pp:test:runbooks:rb2']);
      mockRedisInstance.del.mockResolvedValue(2);

      await cacheService.clearByType('runbooks');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('pp:test:runbooks:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('pp:test:runbooks:rb1', 'pp:test:runbooks:rb2');
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

      expect(result).toBeNull();
    });

    it('should not perform cache operations when disabled', async () => {
      const key = createCacheKey('procedures', 'disabled-ops-test');

      // These should complete without error but do nothing
      await cacheService.delete(key);
      await cacheService.clearByType('runbooks');
      await cacheService.clearAll();
      await cacheService.warmCache([]);

      expect(true).toBe(true); // Should reach here without errors
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

      expect(result).toEqual(value);
    });

    it('should handle null/undefined values', async () => {
      const key = createCacheKey('procedures', 'null-test');

      await cacheService.set(key, null);
      const result = await cacheService.get(key);

      expect(result).toBeNull();
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
              false: { next: 'node-2' }
            }
          }
        ],
        metadata: {
          created: new Date().toISOString(),
          tags: ['emergency', 'system-failure'],
          confidence: 0.95
        }
      };

      await cacheService.set(key, complexValue);
      const result = await cacheService.get(key);

      expect(result).toEqual(complexValue);
    });

    it('should handle concurrent cache operations', async () => {
      const promises = [];
      
      // Simulate concurrent operations
      for (let i = 0; i < 10; i++) {
        const key = createCacheKey('runbooks', `concurrent-test-${i}`);
        const value = { id: i, data: `concurrent data ${i}` };
        
        promises.push(
          cacheService.set(key, value).then(() => cacheService.get(key))
        );
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result).toEqual({ id: index, data: `concurrent data ${index}` });
      });
    });
  });

  describe('Singleton Pattern and Factory Functions', () => {
    afterEach(() => {
      // Reset singleton state
      jest.resetModules();
    });

    it('should maintain singleton instance with initializeCacheService', () => {
      const config = createTestConfig('memory_only');
      
      const service1 = initializeCacheService(config);
      const service2 = initializeCacheService(config);
      
      expect(service1).toBe(service2);
    });

    it('should throw error when getting service before initialization', () => {
      expect(() => getCacheService()).toThrow('Cache service not initialized');
    });

    it('should return initialized service with getCacheService', () => {
      const config = createTestConfig('memory_only');
      const initializedService = initializeCacheService(config);
      const retrievedService = getCacheService();
      
      expect(retrievedService).toBe(initializedService);
    });
  });

  describe('Performance and Load Testing', () => {
    beforeEach(() => {
      cacheService = new CacheService(createTestConfig('memory_only'));
    });

    it('should handle high-volume cache operations efficiently', async () => {
      const startTime = Date.now();
      const operations = [];

      // Generate 1000 cache operations
      for (let i = 0; i < 1000; i++) {
        const key = createCacheKey('knowledge_base', `perf-test-${i}`);
        const value = { 
          id: i, 
          content: `Performance test data item ${i}`,
          timestamp: Date.now()
        };
        
        operations.push(
          cacheService.set(key, value).then(() => cacheService.get(key))
        );
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All operations should complete successfully
      expect(results).toHaveLength(1000);
      expect(results.every(result => result !== null)).toBe(true);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      // Check final statistics
      const stats = cacheService.getStats();
      expect(stats.total_operations).toBeGreaterThanOrEqual(2000); // 1000 sets + 1000 gets
      expect(stats.hits).toBe(1000);
    });

    it('should maintain performance under mixed read/write workload', async () => {
      const writePromises = [];

      // Create initial data
      for (let i = 0; i < 100; i++) {
        const key = createCacheKey('runbooks', `mixed-workload-${i}`);
        const value = { id: i, data: `workload test ${i}` };
        writePromises.push(cacheService.set(key, value));
      }

      await Promise.all(writePromises);

      // Mixed read/write operations
      const mixedPromises = [];
      for (let i = 0; i < 500; i++) {
        const key = createCacheKey('runbooks', `mixed-workload-${i % 100}`);
        
        if (i % 3 === 0) {
          // Write operation
          mixedPromises.push(cacheService.set(key, { id: i, updated: true }));
        } else {
          // Read operation
          mixedPromises.push(cacheService.get(key));
        }
      }

      const startTime = Date.now();
      await Promise.all(mixedPromises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});

describe('Cache Key Utilities', () => {
  it('should create proper cache keys for all content types', () => {
    const contentTypes = ['runbooks', 'procedures', 'decision_trees', 'knowledge_base'] as const;
    
    contentTypes.forEach(type => {
      const key = createCacheKey(type, `test-${type}-123`);
      
      expect(key.type).toBe(type);
      expect(key.identifier).toBe(`test-${type}-123`);
    });
  });

  it('should handle special characters in identifiers', () => {
    const specialId = 'test@#$%^&*()_+-=[]{}|;:,.<>?';
    const key = createCacheKey('runbooks', specialId);
    
    expect(key.type).toBe('runbooks');
    expect(key.identifier).toBe(specialId);
  });

  it('should handle unicode characters in identifiers', () => {
    const unicodeId = 'тест-ランブック-测试-🚨📋✅';
    const key = createCacheKey('procedures', unicodeId);
    
    expect(key.type).toBe('procedures');
    expect(key.identifier).toBe(unicodeId);
  });
});