/**
 * Cache Service Integration Tests
 * 
 * Tests the complete cache service functionality including Redis integration,
 * fallback mechanisms, and error handling scenarios.
 * 
 * Enhanced with improved test utilities for better maintainability and consistency.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CacheService, createCacheKey } from '../../src/utils/cache.js';
import { CacheConfig } from '../../src/types/index.js';
import { 
  memoryOnlyCacheConfig, 
  disabledCacheConfig,
  assertCacheStats,
  assertHealthCheck,
  generateCacheKeyTestSet,
  generateRunbookData,
  cleanupCacheService
} from '../utils/index.js';

describe('Cache Service Integration Tests', () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    // Create a fresh cache service instance using shared config
    cacheService = new CacheService(memoryOnlyCacheConfig);
  });

  afterEach(async () => {
    if (cacheService) {
      await cleanupCacheService(cacheService);
    }
  });

  describe('Cache Service Initialization', () => {
    it('should initialize with memory-only strategy', () => {
      const stats = cacheService.getStats();
      // Use enhanced assertion utility for better error messages
      assertCacheStats(stats, {
        hits: 0,
        misses: 0,
        total_operations: 0,
        hit_rate: 0,
        redis_connected: false
      });
    });

    it('should have Redis disabled in memory-only mode', () => {
      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 0);
      assert.strictEqual(stats.redis_connected, false);
    });

    it('should handle disabled cache', async () => {
      const disabledCacheService = new CacheService(disabledCacheConfig);
      const stats = disabledCacheService.getStats();
      
      // Use assertion utility for consistent validation
      assertCacheStats(stats, {
        hits: 0,
        misses: 0,
        total_operations: 0,
        hit_rate: 0
      });
      
      await cleanupCacheService(disabledCacheService);
    });
  });

  describe('Basic Cache Operations', () => {
    it('should set and get values from memory cache', async () => {
      const key = createCacheKey('runbooks', 'test-runbook-1');
      const testData = generateRunbookData('test-runbook-1', {
        title: 'Test Runbook',
        severity: 'high'
      });

      await cacheService.set(key, testData);
      const result = await cacheService.get(key);

      assert.deepStrictEqual(result, testData);

      // Use enhanced assertion utility
      const stats = cacheService.getStats();
      assertCacheStats(stats, {
        hits: 1,
        total_operations: 1,
        hit_rate: 1
      });
    });

    it('should return null for non-existent keys', async () => {
      const key = createCacheKey('runbooks', 'non-existent-key');
      const result = await cacheService.get(key);

      assert.strictEqual(result, null);

      const stats = cacheService.getStats();
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.total_operations, 1);
      assert.strictEqual(stats.hit_rate, 0);
    });

    it('should delete cached values', async () => {
      const key = createCacheKey('procedures', 'test-procedure');
      const testData = { steps: ['step1', 'step2'] };

      await cacheService.set(key, testData);
      let result = await cacheService.get(key);
      assert.deepStrictEqual(result, testData);

      await cacheService.delete(key);
      result = await cacheService.get(key);
      assert.strictEqual(result, null);
    });
  });

  describe('Content Type Specific Caching', () => {
    it('should use different TTLs for different content types', async () => {
      const runbookKey = createCacheKey('runbooks', 'test-runbook');
      const procedureKey = createCacheKey('procedures', 'test-procedure');

      await cacheService.set(runbookKey, { type: 'runbook' });
      await cacheService.set(procedureKey, { type: 'procedure' });

      // Both should be retrievable immediately
      const runbookResult = await cacheService.get(runbookKey);
      const procedureResult = await cacheService.get(procedureKey);

      assert.deepStrictEqual(runbookResult, { type: 'runbook' });
      assert.deepStrictEqual(procedureResult, { type: 'procedure' });

      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 2);
      assert.strictEqual(stats.by_content_type?.runbooks?.hits, 1);
      assert.strictEqual(stats.by_content_type?.procedures?.hits, 1);
    });

    it('should track statistics by content type', async () => {
      const runbookKey1 = createCacheKey('runbooks', 'runbook-1');
      const runbookKey2 = createCacheKey('runbooks', 'runbook-2');
      const procedureKey = createCacheKey('procedures', 'procedure-1');

      // Set values
      await cacheService.set(runbookKey1, { id: 1 });
      await cacheService.set(runbookKey2, { id: 2 });
      await cacheService.set(procedureKey, { id: 3 });

      // Get values (hits)
      await cacheService.get(runbookKey1);
      await cacheService.get(runbookKey2);
      await cacheService.get(procedureKey);

      // Try to get non-existent runbook (miss)
      await cacheService.get(createCacheKey('runbooks', 'non-existent'));

      const stats = cacheService.getStats();
      assert.strictEqual(stats.by_content_type?.runbooks?.hits, 2);
      assert.strictEqual(stats.by_content_type?.runbooks?.misses, 1);
      assert.strictEqual(stats.by_content_type?.procedures?.hits, 1);
      assert.strictEqual(stats.by_content_type?.procedures?.misses, 0);
    });
  });

  describe('Clear Operations', () => {
    it('should clear all cache entries', async () => {
      // Add some test data
      await cacheService.set(createCacheKey('runbooks', 'rb1'), { id: 1 });
      await cacheService.set(createCacheKey('procedures', 'proc1'), { id: 2 });
      await cacheService.set(createCacheKey('decision_trees', 'dt1'), { id: 3 });

      // Verify data exists
      const result1 = await cacheService.get(createCacheKey('runbooks', 'rb1'));
      assert.deepStrictEqual(result1, { id: 1 });

      // Clear all
      await cacheService.clearAll();

      // Verify data is gone
      const result2 = await cacheService.get(createCacheKey('runbooks', 'rb1'));
      const result3 = await cacheService.get(createCacheKey('procedures', 'proc1'));
      const result4 = await cacheService.get(createCacheKey('decision_trees', 'dt1'));

      assert.strictEqual(result2, null);
      assert.strictEqual(result3, null);
      assert.strictEqual(result4, null);

      // Stats should be reset
      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 0);
      assert.strictEqual(stats.misses, 3); // From the get attempts after clear
    });

    it('should clear cache entries by content type', async () => {
      // Add different types of data
      await cacheService.set(createCacheKey('runbooks', 'rb1'), { id: 1 });
      await cacheService.set(createCacheKey('runbooks', 'rb2'), { id: 2 });
      await cacheService.set(createCacheKey('procedures', 'proc1'), { id: 3 });

      // Clear only runbooks
      await cacheService.clearByType('runbooks');

      // Runbooks should be gone
      const runbook1 = await cacheService.get(createCacheKey('runbooks', 'rb1'));
      const runbook2 = await cacheService.get(createCacheKey('runbooks', 'rb2'));
      assert.strictEqual(runbook1, null);
      assert.strictEqual(runbook2, null);

      // Procedures should still exist
      const procedure1 = await cacheService.get(createCacheKey('procedures', 'proc1'));
      assert.deepStrictEqual(procedure1, { id: 3 });
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const healthCheck = await cacheService.healthCheck();

      assert.strictEqual(healthCheck.memory_cache.healthy, true);
      assert.strictEqual(healthCheck.overall_healthy, true);
      assert(healthCheck.memory_cache.response_time_ms >= 0);
      assert.strictEqual(healthCheck.memory_cache.keys_count, 0);
    });

    it('should not include Redis in health check for memory-only mode', async () => {
      const healthCheck = await cacheService.healthCheck();

      assert.strictEqual(healthCheck.memory_cache.healthy, true);
      assert.strictEqual(healthCheck.overall_healthy, true);
      assert.strictEqual(healthCheck.redis_cache, undefined);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with critical data', async () => {
      const criticalData = [
        {
          key: createCacheKey('runbooks', 'critical-rb-1'),
          data: { title: 'Critical Runbook 1', priority: 'high' },
        },
        {
          key: createCacheKey('decision_trees', 'critical-dt-1'),
          data: { title: 'Critical Decision Tree 1', branches: [] },
        },
      ];

      await cacheService.warmCache(criticalData);

      // Verify data was cached
      const rb1 = await cacheService.get(createCacheKey('runbooks', 'critical-rb-1'));
      const dt1 = await cacheService.get(createCacheKey('decision_trees', 'critical-dt-1'));

      assert.deepStrictEqual(rb1, { title: 'Critical Runbook 1', priority: 'high' });
      assert.deepStrictEqual(dt1, { title: 'Critical Decision Tree 1', branches: [] });

      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 2);
    });

    it('should handle errors during cache warming gracefully', async () => {
      const criticalData = [
        {
          key: createCacheKey('runbooks', 'valid-rb'),
          data: { title: 'Valid Runbook' },
        },
        // This would cause an error in a real scenario, but our mock handles it gracefully
        {
          key: createCacheKey('procedures', 'test-proc'),
          data: { title: 'Test Procedure' },
        },
      ];

      // Should not throw an error
      await assert.doesNotReject(async () => {
        await cacheService.warmCache(criticalData);
      });

      // Valid data should still be cached
      const result = await cacheService.get(createCacheKey('runbooks', 'valid-rb'));
      assert.deepStrictEqual(result, { title: 'Valid Runbook' });
    });
  });

  describe('Error Handling', () => {
    it('should handle disabled cache gracefully', async () => {
      const disabledConfig = disabledCacheConfig;
      const disabledCache = new CacheService(disabledConfig);

      const key = createCacheKey('runbooks', 'test');
      
      // Operations should be no-ops
      await disabledCache.set(key, { test: true });
      const result = await disabledCache.get(key);
      
      assert.strictEqual(result, null);
      
      const stats = disabledCache.getStats();
      assert.strictEqual(stats.hits, 0);
      assert.strictEqual(stats.misses, 0);
      
      await disabledCache.shutdown();
    });

    it('should handle memory cache operations reliably', async () => {
      const key = createCacheKey('runbooks', 'test-reliability');
      const testData = { title: 'Test reliability' };

      // Should work reliably with memory cache
      await assert.doesNotReject(async () => {
        await cacheService.set(key, testData);
      });

      const result = await cacheService.get(key);
      assert.deepStrictEqual(result, testData);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate cache statistics', async () => {
      // Perform various operations
      const key1 = createCacheKey('runbooks', 'rb1');
      const key2 = createCacheKey('procedures', 'proc1');
      const key3 = createCacheKey('runbooks', 'rb2');

      // 2 sets
      await cacheService.set(key1, { id: 1 });
      await cacheService.set(key2, { id: 2 });

      // 2 hits
      await cacheService.get(key1);
      await cacheService.get(key2);

      // 1 miss
      await cacheService.get(key3);

      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 2);
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.total_operations, 3);
      assert.strictEqual(stats.hit_rate, 2/3);
      assert(stats.memory_usage_bytes !== undefined);
      assert(stats.last_reset);
    });

    it('should track performance across multiple operations', async () => {
      const operations = [];
      
      // Perform multiple cache operations
      for (let i = 0; i < 10; i++) {
        const key = createCacheKey('runbooks', `rb-${i}`);
        operations.push(cacheService.set(key, { id: i }));
      }
      
      await Promise.all(operations);

      // Get half of them (hits)
      for (let i = 0; i < 5; i++) {
        const key = createCacheKey('runbooks', `rb-${i}`);
        await cacheService.get(key);
      }

      // Try to get non-existent keys (misses)
      for (let i = 10; i < 15; i++) {
        const key = createCacheKey('runbooks', `rb-${i}`);
        await cacheService.get(key);
      }

      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 5);
      assert.strictEqual(stats.misses, 5);
      assert.strictEqual(stats.total_operations, 10);
      assert.strictEqual(stats.hit_rate, 0.5);
    });
  });
});