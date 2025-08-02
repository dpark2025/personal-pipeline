/**
 * Memory-only Cache Tests using Node.js Test Runner
 * 
 * Tests cache operations with memory-only strategy (no Redis)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CacheService, createCacheKey } from '../../src/utils/cache.js';
import type { CacheConfig } from '../../src/types/index.js';

describe('CacheService (Memory-Only - Node.js Test Runner)', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    const config: CacheConfig = {
      enabled: true,
      strategy: 'memory_only',
      memory: {
        max_keys: 100,
        ttl_seconds: 300,
        check_period_seconds: 60,
      },
      redis: {
        enabled: false,
        url: 'redis://localhost:6379',
        ttl_seconds: 600,
        key_prefix: 'pp:cache:',
        connection_timeout_ms: 5000,
        retry_attempts: 3,
        retry_delay_ms: 1000,
        max_retry_delay_ms: 30000,
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
    };

    cacheService = new CacheService(config);
  });

  afterEach(async () => {
    await cacheService.shutdown();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      const key = createCacheKey('runbooks', 'test-1');
      const value = { id: 'test-1', name: 'Test Runbook' };

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      assert.deepStrictEqual(result, value);
    });

    it('should return null for non-existent keys', async () => {
      const key = createCacheKey('runbooks', 'non-existent');
      const result = await cacheService.get(key);

      assert.strictEqual(result, null);
    });

    it('should delete values', async () => {
      const key = createCacheKey('procedures', 'test-delete');
      const value = { step: 'test' };

      await cacheService.set(key, value);
      assert.deepStrictEqual(await cacheService.get(key), value);

      await cacheService.delete(key);
      assert.strictEqual(await cacheService.get(key), null);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      const key = createCacheKey('runbooks', 'stats-test');

      // Miss
      await cacheService.get(key);
      let stats = cacheService.getStats();
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.hits, 0);

      // Set and hit
      await cacheService.set(key, { data: 'test' });
      await cacheService.get(key);
      stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 1);
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.hit_rate, 0.5);
    });
  });

  describe('Health Check', () => {
    it('should report healthy status', async () => {
      const health = await cacheService.healthCheck();

      assert.strictEqual(health.memory_cache.healthy, true);
      assert.strictEqual(health.overall_healthy, true);
      assert.strictEqual(health.redis_cache, undefined);
    });
  });
});

describe('Cache Key Creation', () => {
  it('should create proper cache keys', () => {
    const key = createCacheKey('runbooks', 'my-runbook-123');

    assert.strictEqual(key.type, 'runbooks');
    assert.strictEqual(key.identifier, 'my-runbook-123');
  });
});