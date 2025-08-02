/**
 * Test Helper Utilities
 * 
 * Common helper functions for test setup, cleanup, and test environment management.
 * Provides utilities for service lifecycle management and test isolation.
 */

import { CacheService } from '../../src/utils/cache.js';
import type { CacheConfig } from '../../src/types/index.js';
import { memoryOnlyCacheConfig, hybridCacheConfig } from './test-configs.js';

/**
 * Service cleanup tracking for proper test isolation
 */
const activeServices: CacheService[] = [];

/**
 * Create a cache service with automatic cleanup tracking
 */
export function createTestCacheService(config: CacheConfig = memoryOnlyCacheConfig): CacheService {
  const service = new CacheService(config);
  activeServices.push(service);
  return service;
}

/**
 * Wait for service initialization to complete
 */
export async function waitForServiceInitialization(
  service: CacheService,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    checkFunction?: (service: CacheService) => boolean;
  } = {}
): Promise<void> {
  const {
    maxAttempts = 20,
    intervalMs = 50,
    checkFunction = (service) => {
      try {
        const stats = service.getStats();
        return typeof stats.redis_connected === 'boolean';
      } catch {
        return false;
      }
    },
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (checkFunction(service)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`Service initialization timed out after ${maxAttempts * intervalMs}ms`);
}

/**
 * Clean up a specific cache service
 */
export async function cleanupCacheService(service: CacheService): Promise<void> {
  try {
    await service.shutdown();
    const index = activeServices.indexOf(service);
    if (index > -1) {
      activeServices.splice(index, 1);
    }
  } catch (error) {
    console.warn('Error during cache service cleanup:', error);
  }
}

/**
 * Clean up all active test services (for use in afterEach/afterAll)
 */
export async function cleanupAllTestServices(): Promise<void> {
  const services = [...activeServices]; // Copy to avoid modification during iteration
  await Promise.allSettled(services.map(service => cleanupCacheService(service)));
  activeServices.length = 0; // Clear the array
}

/**
 * Create isolated test environment for cache tests
 */
export async function createIsolatedCacheTest<T>(
  config: CacheConfig,
  testFunction: (service: CacheService) => Promise<T>
): Promise<T> {
  const service = createTestCacheService(config);
  try {
    await waitForServiceInitialization(service);
    return await testFunction(service);
  } finally {
    await cleanupCacheService(service);
  }
}

/**
 * Measure execution time of async operations
 */
export async function measureExecutionTime<T>(
  operation: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now();
  const result = await operation();
  const durationMs = Date.now() - startTime;
  return { result, durationMs };
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: any;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
    }
  }
  
  throw lastError;
}

/**
 * Wait for condition to be met with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    timeoutMessage?: string;
  } = {}
): Promise<void> {
  const {
    timeoutMs = 5000,
    intervalMs = 100,
    timeoutMessage = 'Condition not met within timeout',
  } = options;

  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`${timeoutMessage} (${timeoutMs}ms)`);
}

/**
 * Create a test timeout wrapper for operations
 */
export function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${timeoutMessage} (${timeoutMs}ms)`)), timeoutMs);
    }),
  ]);
}

/**
 * Generate unique test identifiers to avoid conflicts
 */
let testIdCounter = 0;
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${++testIdCounter}`;
}

/**
 * Memory usage monitoring for performance tests
 */
export class MemoryMonitor {
  private initialMemory: NodeJS.MemoryUsage;
  private samples: NodeJS.MemoryUsage[] = [];

  constructor() {
    this.initialMemory = process.memoryUsage();
  }

  sample(): void {
    this.samples.push(process.memoryUsage());
  }

  getStats(): {
    initialMemoryMB: number;
    finalMemoryMB: number;
    peakMemoryMB: number;
    memoryIncreaseMB: number;
    samples: number;
  } {
    const final = this.samples[this.samples.length - 1] || this.initialMemory;
    const peak = this.samples.reduce((max, sample) => 
      sample.heapUsed > max.heapUsed ? sample : max, this.initialMemory);

    return {
      initialMemoryMB: this.initialMemory.heapUsed / 1024 / 1024,
      finalMemoryMB: final.heapUsed / 1024 / 1024,
      peakMemoryMB: peak.heapUsed / 1024 / 1024,
      memoryIncreaseMB: (final.heapUsed - this.initialMemory.heapUsed) / 1024 / 1024,
      samples: this.samples.length,
    };
  }
}

/**
 * Test environment info for debugging
 */
export function getTestEnvironmentInfo(): {
  nodeVersion: string;
  platform: string;
  arch: string;
  totalMemoryMB: number;
  availableMemoryMB: number;
} {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    totalMemoryMB: (process.memoryUsage().heapTotal) / 1024 / 1024,
    availableMemoryMB: (process.memoryUsage().heapUsed) / 1024 / 1024,
  };
}

/**
 * Setup common test hooks for consistent environment
 */
export function setupTestHooks(options: {
  cleanupServices?: boolean;
  logEnvironmentInfo?: boolean;
} = {}) {
  const { cleanupServices = true, logEnvironmentInfo = false } = options;
  
  if (logEnvironmentInfo) {
    console.log('Test Environment Info:', getTestEnvironmentInfo());
  }
  
  // Global cleanup after each test
  if (cleanupServices) {
    // Note: This would need to be called from test files since we can't add global hooks here
    return {
      async afterEach() {
        await cleanupAllTestServices();
      },
    };
  }
  
  return {};
}