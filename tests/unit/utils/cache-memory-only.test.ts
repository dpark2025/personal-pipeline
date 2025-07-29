/**
 * Memory-only cache tests that don't require Redis
 */

// Unmock the cache module for this test since we want to test the real implementation
jest.unmock('../../../src/utils/cache');

import { CacheService, createCacheKey } from '../../../src/utils/cache';
import { CacheConfig } from '../../../src/types';

describe('CacheService (Memory-Only)', () => {
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

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const key = createCacheKey('runbooks', 'non-existent');
      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      const key = createCacheKey('procedures', 'test-delete');
      const value = { step: 'test' };

      await cacheService.set(key, value);
      expect(await cacheService.get(key)).toEqual(value);

      await cacheService.delete(key);
      expect(await cacheService.get(key)).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      const key = createCacheKey('runbooks', 'stats-test');

      // Miss
      await cacheService.get(key);
      let stats = cacheService.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);

      // Set and hit
      await cacheService.set(key, { data: 'test' });
      await cacheService.get(key);
      stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hit_rate).toBe(0.5);
    });
  });

  describe('Health Check', () => {
    it('should report healthy status', async () => {
      const health = await cacheService.healthCheck();

      expect(health.memory_cache.healthy).toBe(true);
      expect(health.overall_healthy).toBe(true);
      expect(health.redis_cache).toBeUndefined();
    });
  });
});

describe('Cache Key Creation', () => {
  it('should create proper cache keys', () => {
    const key = createCacheKey('runbooks', 'my-runbook-123');
    
    expect(key.type).toBe('runbooks');
    expect(key.identifier).toBe('my-runbook-123');
  });
});