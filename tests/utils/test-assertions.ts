/**
 * Test Assertion Helpers
 * 
 * Common assertion utilities for testing cache services, statistics,
 * and other system components with consistent validation patterns.
 */

import assert from 'node:assert';
import type { CacheStats, CacheHealthCheck } from '../../src/types/index.js';
import type { CacheService } from '../../src/utils/cache.js';

/**
 * Assert cache statistics match expected patterns
 */
export function assertCacheStats(
  stats: CacheStats,
  expected: {
    hits?: number;
    misses?: number;
    total_operations?: number;
    hit_rate?: number;
    redis_connected?: boolean;
  }
) {
  if (expected.hits !== undefined) {
    assert.strictEqual(stats.hits, expected.hits, `Expected ${expected.hits} hits, got ${stats.hits}`);
  }
  
  if (expected.misses !== undefined) {
    assert.strictEqual(stats.misses, expected.misses, `Expected ${expected.misses} misses, got ${stats.misses}`);
  }
  
  if (expected.total_operations !== undefined) {
    assert.strictEqual(stats.total_operations, expected.total_operations, 
      `Expected ${expected.total_operations} total operations, got ${stats.total_operations}`);
  }
  
  if (expected.hit_rate !== undefined) {
    const tolerance = 0.001; // Allow small floating point differences
    const actualRate = stats.hit_rate;
    const expectedRate = expected.hit_rate;
    assert(
      Math.abs(actualRate - expectedRate) < tolerance,
      `Expected hit rate ${expectedRate}, got ${actualRate} (difference: ${Math.abs(actualRate - expectedRate)})`
    );
  }
  
  if (expected.redis_connected !== undefined) {
    assert.strictEqual(stats.redis_connected, expected.redis_connected,
      `Expected redis_connected ${expected.redis_connected}, got ${stats.redis_connected}`);
  }
  
  // Validate required fields are present
  assert(typeof stats.hits === 'number', 'hits should be a number');
  assert(typeof stats.misses === 'number', 'misses should be a number');
  assert(typeof stats.total_operations === 'number', 'total_operations should be a number');
  assert(typeof stats.hit_rate === 'number', 'hit_rate should be a number');
  assert(typeof stats.last_reset === 'string', 'last_reset should be a string');
}

/**
 * Assert health check results match expected patterns
 */
export function assertHealthCheck(
  healthCheck: CacheHealthCheck,
  expected: {
    overall_healthy?: boolean;
    memory_cache_healthy?: boolean;
    redis_cache_healthy?: boolean;
    redis_cache_present?: boolean;
  }
) {
  if (expected.overall_healthy !== undefined) {
    assert.strictEqual(healthCheck.overall_healthy, expected.overall_healthy,
      `Expected overall_healthy ${expected.overall_healthy}, got ${healthCheck.overall_healthy}`);
  }
  
  if (expected.memory_cache_healthy !== undefined) {
    assert.strictEqual(healthCheck.memory_cache.healthy, expected.memory_cache_healthy,
      `Expected memory cache healthy ${expected.memory_cache_healthy}, got ${healthCheck.memory_cache.healthy}`);
  }
  
  if (expected.redis_cache_present !== undefined) {
    const redisPresent = healthCheck.redis_cache !== undefined;
    assert.strictEqual(redisPresent, expected.redis_cache_present,
      `Expected Redis cache present ${expected.redis_cache_present}, got ${redisPresent}`);
  }
  
  if (expected.redis_cache_healthy !== undefined && healthCheck.redis_cache) {
    assert.strictEqual(healthCheck.redis_cache.healthy, expected.redis_cache_healthy,
      `Expected Redis cache healthy ${expected.redis_cache_healthy}, got ${healthCheck.redis_cache.healthy}`);
  }
  
  // Validate required fields
  assert(typeof healthCheck.overall_healthy === 'boolean', 'overall_healthy should be boolean');
  assert(typeof healthCheck.memory_cache === 'object', 'memory_cache should be object');
  assert(typeof healthCheck.memory_cache.healthy === 'boolean', 'memory_cache.healthy should be boolean');
  assert(typeof healthCheck.memory_cache.response_time_ms === 'number', 'memory_cache.response_time_ms should be number');
}

/**
 * Assert cache service operations work as expected
 */
export async function assertCacheOperations(
  cacheService: CacheService,
  operations: Array<{
    type: 'set' | 'get' | 'delete';
    key: any;
    data?: any;
    expectedResult?: any;
  }>
) {
  for (const operation of operations) {
    switch (operation.type) {
      case 'set':
        await assert.doesNotReject(
          () => cacheService.set(operation.key, operation.data),
          `Set operation should not reject for key ${JSON.stringify(operation.key)}`
        );
        break;
        
      case 'get':
        const result = await cacheService.get(operation.key);
        if (operation.expectedResult !== undefined) {
          if (operation.expectedResult === null) {
            assert.strictEqual(result, null, `Expected null for key ${JSON.stringify(operation.key)}`);
          } else {
            assert.deepStrictEqual(result, operation.expectedResult, 
              `Expected ${JSON.stringify(operation.expectedResult)} for key ${JSON.stringify(operation.key)}`);
          }
        }
        break;
        
      case 'delete':
        await assert.doesNotReject(
          () => cacheService.delete(operation.key),
          `Delete operation should not reject for key ${JSON.stringify(operation.key)}`
        );
        break;
    }
  }
}

/**
 * Assert performance metrics meet expectations
 */
export function assertPerformanceMetrics(
  startTime: number,
  endTime: number,
  expected: {
    maxDurationMs?: number;
    minDurationMs?: number;
    operationsPerSecond?: number;
    totalOperations?: number;
  }
) {
  const duration = endTime - startTime;
  
  if (expected.maxDurationMs !== undefined) {
    assert(duration <= expected.maxDurationMs,
      `Operation took ${duration}ms, expected <= ${expected.maxDurationMs}ms`);
  }
  
  if (expected.minDurationMs !== undefined) {
    assert(duration >= expected.minDurationMs,
      `Operation took ${duration}ms, expected >= ${expected.minDurationMs}ms`);
  }
  
  if (expected.operationsPerSecond !== undefined && expected.totalOperations !== undefined) {
    const actualOpsPerSecond = (expected.totalOperations * 1000) / duration;
    assert(actualOpsPerSecond >= expected.operationsPerSecond,
      `Achieved ${actualOpsPerSecond.toFixed(2)} ops/sec, expected >= ${expected.operationsPerSecond} ops/sec`);
  }
}

/**
 * Assert data integrity after operations
 */
export async function assertDataIntegrity(
  cacheService: CacheService,
  expectedData: Array<{ key: any; data: any }>
) {
  for (const { key, data } of expectedData) {
    const result = await cacheService.get(key);
    assert.deepStrictEqual(result, data,
      `Data integrity check failed for key ${JSON.stringify(key)}`);
  }
}

/**
 * Assert error handling behavior
 */
export async function assertErrorHandling(
  operation: () => Promise<any>,
  expected: {
    shouldThrow?: boolean;
    errorMessage?: string;
    errorType?: string;
  }
) {
  if (expected.shouldThrow) {
    await assert.rejects(operation, (error: any) => {
      if (expected.errorMessage) {
        assert(error.message.includes(expected.errorMessage),
          `Expected error message to contain "${expected.errorMessage}", got "${error.message}"`);
      }
      if (expected.errorType) {
        assert.strictEqual(error.constructor.name, expected.errorType,
          `Expected error type ${expected.errorType}, got ${error.constructor.name}`);
      }
      return true;
    });
  } else {
    await assert.doesNotReject(operation, 'Operation should not throw an error');
  }
}

/**
 * Assert concurrent operations complete successfully
 */
export async function assertConcurrentOperations(
  operations: Array<() => Promise<any>>,
  expected: {
    maxConcurrentDurationMs?: number;
    allShouldSucceed?: boolean;
  }
) {
  const startTime = Date.now();
  
  if (expected.allShouldSucceed) {
    await Promise.all(operations.map(op => assert.doesNotReject(op)));
  } else {
    await Promise.allSettled(operations.map(op => op()));
  }
  
  const duration = Date.now() - startTime;
  
  if (expected.maxConcurrentDurationMs !== undefined) {
    assert(duration <= expected.maxConcurrentDurationMs,
      `Concurrent operations took ${duration}ms, expected <= ${expected.maxConcurrentDurationMs}ms`);
  }
}