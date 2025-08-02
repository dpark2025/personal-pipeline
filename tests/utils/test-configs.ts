/**
 * Test Configuration Utilities
 * 
 * Centralized test configurations to reduce duplication and provide
 * consistent test environments across different test suites.
 */

import { CacheConfig } from '../../src/types/index.js';

/**
 * Memory-only cache configuration for tests that don't need Redis
 */
export const memoryOnlyCacheConfig: CacheConfig = {
  enabled: true,
  strategy: 'memory_only',
  memory: {
    max_keys: 100,
    ttl_seconds: 60,
    check_period_seconds: 30,
  },
  redis: {
    enabled: false,
    url: 'redis://localhost:6379',
    ttl_seconds: 120,
    key_prefix: 'test:cache:',
    connection_timeout_ms: 5000,
    retry_attempts: 3,
    retry_delay_ms: 1000,
    max_retry_delay_ms: 30000,
    backoff_multiplier: 2,
    connection_retry_limit: 5,
  },
  content_types: {
    runbooks: {
      ttl_seconds: 3600,
      warmup: true,
    },
    procedures: {
      ttl_seconds: 1800,
      warmup: false,
    },
    decision_trees: {
      ttl_seconds: 2400,
      warmup: true,
    },
    knowledge_base: {
      ttl_seconds: 900,
      warmup: false,
    },
  },
};

/**
 * Hybrid cache configuration for Redis integration tests
 */
export const hybridCacheConfig: CacheConfig = {
  enabled: true,
  strategy: 'hybrid',
  memory: {
    max_keys: 50,
    ttl_seconds: 30,
    check_period_seconds: 15,
  },
  redis: {
    enabled: true,
    url: 'redis://localhost:6379',
    ttl_seconds: 60,
    key_prefix: 'test:redis:',
    connection_timeout_ms: 1000,
    retry_attempts: 1,
    retry_delay_ms: 100,
    max_retry_delay_ms: 1000,
    backoff_multiplier: 2,
    connection_retry_limit: 2,
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

/**
 * Disabled cache configuration for testing disabled state
 */
export const disabledCacheConfig: CacheConfig = {
  ...memoryOnlyCacheConfig,
  enabled: false,
};

/**
 * Performance test cache configuration with higher limits
 */
export const performanceCacheConfig: CacheConfig = {
  ...memoryOnlyCacheConfig,
  memory: {
    max_keys: 1000,
    ttl_seconds: 300,
    check_period_seconds: 60,
  },
};

/**
 * Fast test cache configuration with shorter timeouts
 */
export const fastTestCacheConfig: CacheConfig = {
  ...memoryOnlyCacheConfig,
  memory: {
    max_keys: 20,
    ttl_seconds: 5,
    check_period_seconds: 2,
  },
  content_types: {
    runbooks: { ttl_seconds: 10, warmup: false },
    procedures: { ttl_seconds: 5, warmup: false },
    decision_trees: { ttl_seconds: 8, warmup: false },
    knowledge_base: { ttl_seconds: 3, warmup: false },
  },
};