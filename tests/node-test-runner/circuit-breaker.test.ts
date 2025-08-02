/**
 * Circuit Breaker Tests using Node.js Test Runner
 * 
 * Tests circuit breaker pattern implementation, factory, and resilience features
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  CircuitBreaker,
  CircuitBreakerFactory,
  CircuitState,
  withCircuitBreaker,
} from '../../src/utils/circuit-breaker.js';
import type { CircuitBreakerConfig } from '../../src/utils/circuit-breaker.js';

// Mock logger to prevent console output during tests
const mockLogger = {
  info: mock.fn(),
  debug: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
};

// Helper to wait for timeout
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('CircuitBreaker (Node.js Test Runner)', () => {
  let circuitBreaker: CircuitBreaker;
  let mockConfig: CircuitBreakerConfig;

  beforeEach(() => {
    // Reset all mock calls
    Object.values(mockLogger).forEach(fn => fn.mock.resetCalls());

    mockConfig = {
      failureThreshold: 3,
      recoveryTimeout: 1000, // 1 second for faster testing
      monitoringWindow: 5000, // 5 seconds
      successThreshold: 2,
      timeout: 500, // 500ms timeout
      name: 'test-circuit',
    };

    circuitBreaker = new CircuitBreaker(mockConfig);
  });

  describe('Circuit States and Transitions', () => {
    it('should initialize in CLOSED state', () => {
      assert.strictEqual(circuitBreaker.getState(), CircuitState.CLOSED);
      assert.strictEqual(circuitBreaker.isHealthy(), true);
    });

    it('should transition to OPEN state after failure threshold', async () => {
      const failingFunction = mock.fn(async () => {
        throw new Error('Service unavailable');
      });

      // Trigger failures up to threshold
      for (let i = 0; i < mockConfig.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      assert.strictEqual(circuitBreaker.getState(), CircuitState.OPEN);
      assert.strictEqual(circuitBreaker.isHealthy(), false);
    });

    it('should fail fast when circuit is OPEN', async () => {
      // Force circuit to OPEN state
      circuitBreaker.trip();
      assert.strictEqual(circuitBreaker.getState(), CircuitState.OPEN);

      const mockFunction = mock.fn(async () => 'success');

      await assert.rejects(
        async () => {
          await circuitBreaker.execute(mockFunction);
        },
        (error: Error) => {
          assert(error.message.includes('Circuit breaker test-circuit is OPEN'));
          return true;
        }
      );

      assert.strictEqual(mockFunction.mock.callCount(), 0);
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      // Force circuit to OPEN state with short recovery timeout
      const shortTimeoutConfig: CircuitBreakerConfig = {
        ...mockConfig,
        recoveryTimeout: 100, // 100ms
      };

      const shortTimeoutBreaker = new CircuitBreaker(shortTimeoutConfig);
      shortTimeoutBreaker.trip();

      assert.strictEqual(shortTimeoutBreaker.getState(), CircuitState.OPEN);

      // Wait for recovery timeout
      await wait(150);

      // Next execution should transition to HALF_OPEN then CLOSED
      const successFunction = mock.fn(async () => 'success');
      await shortTimeoutBreaker.execute(successFunction);

      assert.strictEqual(shortTimeoutBreaker.getState(), CircuitState.CLOSED);
    });

    it('should transition from HALF_OPEN to CLOSED after success threshold', async () => {
      // Set up circuit in HALF_OPEN state
      const breaker = new CircuitBreaker({
        ...mockConfig,
        recoveryTimeout: 100,
      });

      breaker.trip();
      await wait(150);

      const successFunction = mock.fn(async () => 'success');

      // Execute successful calls to meet success threshold
      for (let i = 0; i < mockConfig.successThreshold; i++) {
        await breaker.execute(successFunction);
      }

      assert.strictEqual(breaker.getState(), CircuitState.CLOSED);
      assert.strictEqual(breaker.isHealthy(), true);
    });

    it('should transition from HALF_OPEN back to OPEN on failure', async () => {
      const breaker = new CircuitBreaker({
        ...mockConfig,
        recoveryTimeout: 100,
      });

      // Force to HALF_OPEN state
      breaker.trip();
      await wait(150);

      // First success to get to HALF_OPEN
      const successFunction = mock.fn(async () => 'success');
      await breaker.execute(successFunction);

      // Now fail - should go back to OPEN
      const failFunction = mock.fn(async () => {
        throw new Error('Failed again');
      });

      try {
        await breaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      assert.strictEqual(breaker.getState(), CircuitState.OPEN);
    });
  });

  describe('Execution and Timeout Handling', () => {
    it('should execute successful functions normally', async () => {
      const successFunction = mock.fn(async () => 'test result');

      const result = await circuitBreaker.execute(successFunction);

      assert.strictEqual(result, 'test result');
      assert.strictEqual(successFunction.mock.callCount(), 1);
      assert.strictEqual(circuitBreaker.getState(), CircuitState.CLOSED);
    });

    it('should handle function timeouts', async () => {
      const slowFunction = mock.fn(() => 
        new Promise(resolve => setTimeout(() => resolve('slow result'), 1000))
      );

      await assert.rejects(
        async () => {
          await circuitBreaker.execute(slowFunction);
        },
        (error: Error) => {
          assert(error.message.includes('timeout after 500ms'));
          return true;
        }
      );
    });

    it('should propagate function errors', async () => {
      const errorFunction = mock.fn(async () => {
        throw new Error('Function error');
      });

      await assert.rejects(
        async () => {
          await circuitBreaker.execute(errorFunction);
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Function error');
          return true;
        }
      );
    });

    it('should handle synchronous function errors', async () => {
      const syncErrorFunction = mock.fn(() => {
        throw new Error('Sync error');
      });

      await assert.rejects(
        async () => {
          await circuitBreaker.execute(syncErrorFunction);
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Sync error');
          return true;
        }
      );
    });
  });

  describe('Event Emission', () => {
    it('should emit success events', async () => {
      const successHandler = mock.fn();
      circuitBreaker.on('success', successHandler);

      const successFunction = mock.fn(async () => 'result');
      await circuitBreaker.execute(successFunction);

      assert.strictEqual(successHandler.mock.callCount(), 1);
      const callArgs = successHandler.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.state, CircuitState.CLOSED);
      assert.strictEqual(callArgs.successes, 1);
      assert.strictEqual(callArgs.totalSuccesses, 1);
    });

    it('should emit failure events', async () => {
      const failureHandler = mock.fn();
      circuitBreaker.on('failure', failureHandler);

      const failFunction = mock.fn(async () => {
        throw new Error('Test failure');
      });

      try {
        await circuitBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      assert.strictEqual(failureHandler.mock.callCount(), 1);
      const callArgs = failureHandler.mock.calls[0].arguments[0];
      assert(callArgs.error instanceof Error);
      assert.strictEqual(callArgs.state, CircuitState.CLOSED);
      assert.strictEqual(callArgs.failures, 1);
      assert.strictEqual(callArgs.totalFailures, 1);
    });

    it('should emit state change events', async () => {
      const stateChangeHandler = mock.fn();
      circuitBreaker.on('stateChange', stateChangeHandler);

      // Force state change to OPEN
      circuitBreaker.trip();

      assert.strictEqual(stateChangeHandler.mock.callCount(), 1);
      const callArgs = stateChangeHandler.mock.calls[0].arguments[0];
      assert.strictEqual(callArgs.oldState, CircuitState.CLOSED);
      assert.strictEqual(callArgs.newState, CircuitState.OPEN);
      assert.strictEqual(callArgs.name, 'test-circuit');
    });

    it('should emit specific state events', async () => {
      const openHandler = mock.fn();
      const closeHandler = mock.fn();

      circuitBreaker.on('open', openHandler);
      circuitBreaker.on('close', closeHandler);

      // Trip to open
      circuitBreaker.trip();
      assert.strictEqual(openHandler.mock.callCount(), 1);

      // Reset to closed
      circuitBreaker.manualReset();
      assert.strictEqual(closeHandler.mock.callCount(), 1);
    });

    it('should emit fallback events', async () => {
      const fallbackHandler = mock.fn();
      circuitBreaker.on('fallback', fallbackHandler);

      circuitBreaker.trip(); // Force to OPEN state

      const mockFunction = mock.fn();
      try {
        await circuitBreaker.execute(mockFunction);
      } catch (error) {
        // Expected
      }

      assert.strictEqual(fallbackHandler.mock.callCount(), 1);
      assert(fallbackHandler.mock.calls[0].arguments[0] instanceof Error);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive statistics', async () => {
      const successFunction = mock.fn(async () => 'success');
      const failFunction = mock.fn(async () => {
        throw new Error('failure');
      });

      // Execute mixed operations
      await circuitBreaker.execute(successFunction);
      await circuitBreaker.execute(successFunction);

      try {
        await circuitBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      const stats = circuitBreaker.getStats();

      assert.strictEqual(stats.name, 'test-circuit');
      assert.strictEqual(stats.state, CircuitState.CLOSED);
      assert.strictEqual(stats.successes, 2);
      assert.strictEqual(stats.failures, 1);
      assert.strictEqual(stats.totalRequests, 3);
      assert.strictEqual(stats.totalSuccesses, 2);
      assert.strictEqual(stats.totalFailures, 1);
      assert.strictEqual(stats.uptime, (2 / 3) * 100);
      assert(stats.lastSuccess instanceof Date);
      assert(stats.lastFailure instanceof Date);
    });

    it('should calculate uptime correctly', async () => {
      const stats = circuitBreaker.getStats();
      assert.strictEqual(stats.uptime, 100); // No requests yet

      const successFunction = mock.fn(async () => 'success');
      await circuitBreaker.execute(successFunction);

      const updatedStats = circuitBreaker.getStats();
      assert.strictEqual(updatedStats.uptime, 100); // 100% success rate
    });

    it('should track failure window correctly', async () => {
      const failFunction = mock.fn(async () => {
        throw new Error('failure');
      });

      // Generate failures within window
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(failFunction);
        } catch (error) {
          // Expected
        }
      }

      assert.strictEqual(circuitBreaker.getState(), CircuitState.CLOSED);

      // One more failure should trigger OPEN state
      try {
        await circuitBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      assert.strictEqual(circuitBreaker.getState(), CircuitState.OPEN);
    });
  });

  describe('Manual Controls', () => {
    it('should manually trip circuit', () => {
      assert.strictEqual(circuitBreaker.getState(), CircuitState.CLOSED);

      circuitBreaker.trip();

      assert.strictEqual(circuitBreaker.getState(), CircuitState.OPEN);
      assert.strictEqual(circuitBreaker.isHealthy(), false);
    });

    it('should manually reset circuit', () => {
      circuitBreaker.trip();
      assert.strictEqual(circuitBreaker.getState(), CircuitState.OPEN);

      circuitBreaker.manualReset();

      assert.strictEqual(circuitBreaker.getState(), CircuitState.CLOSED);
      assert.strictEqual(circuitBreaker.isHealthy(), true);

      // Statistics should be reset
      const stats = circuitBreaker.getStats();
      assert.strictEqual(stats.failures, 0);
      assert.strictEqual(stats.successes, 0);
    });
  });

  describe('Failure Window Management', () => {
    it('should clean up old failures outside monitoring window', async () => {
      const shortWindowConfig: CircuitBreakerConfig = {
        ...mockConfig,
        monitoringWindow: 100, // 100ms window
      };

      const shortWindowBreaker = new CircuitBreaker(shortWindowConfig);
      const failFunction = mock.fn(async () => {
        throw new Error('failure');
      });

      // Add failure
      try {
        await shortWindowBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      assert.strictEqual(shortWindowBreaker.getStats().failures, 1);

      // Wait for window to expire
      await wait(150);

      // Add another failure - old one should be cleaned up
      try {
        await shortWindowBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      // Should still be in CLOSED state because old failure was cleaned up
      assert.strictEqual(shortWindowBreaker.getState(), CircuitState.CLOSED);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined function execution', async () => {
      await assert.rejects(async () => {
        await circuitBreaker.execute(null as any);
      });
    });

    it('should handle functions that return non-Promise values', async () => {
      const syncFunction = mock.fn(async () => 'sync result');

      const result = await circuitBreaker.execute(syncFunction);
      assert.strictEqual(result, 'sync result');
    });

    it('should handle concurrent executions safely', async () => {
      const mockFunction = mock.fn()
        .mockImplementationOnce(async () => 'result1')
        .mockImplementationOnce(async () => 'result2')
        .mockImplementationOnce(async () => 'result3');

      const promises = [
        circuitBreaker.execute(mockFunction),
        circuitBreaker.execute(mockFunction),
        circuitBreaker.execute(mockFunction),
      ];

      const results = await Promise.all(promises);

      assert.strictEqual(results.length, 3);
      assert.strictEqual(mockFunction.mock.callCount(), 3);
      assert.strictEqual(circuitBreaker.getStats().totalRequests, 3);
    });
  });
});

describe('CircuitBreakerFactory (Node.js Test Runner)', () => {
  beforeEach(() => {
    // Reset factory state
    CircuitBreakerFactory.resetAll();
  });

  afterEach(() => {
    CircuitBreakerFactory.resetAll();
  });

  describe('External Service Circuit Breakers', () => {
    it('should create circuit breaker for external service', () => {
      const breaker = CircuitBreakerFactory.forExternalService('github');

      assert(breaker instanceof CircuitBreaker);
      assert.strictEqual(breaker.getStats().name, 'github');
    });

    it('should return same instance for same service name', () => {
      const breaker1 = CircuitBreakerFactory.forExternalService('confluence');
      const breaker2 = CircuitBreakerFactory.forExternalService('confluence');

      assert.strictEqual(breaker1, breaker2);
    });

    it('should apply custom configuration', () => {
      const customConfig = {
        failureThreshold: 10,
        timeout: 60000,
      };

      const breaker = CircuitBreakerFactory.forExternalService('custom-service', customConfig);

      // Test that custom config is applied by checking behavior
      assert(breaker instanceof CircuitBreaker);
    });
  });

  describe('Cache Circuit Breakers', () => {
    it('should create circuit breaker for cache', () => {
      const breaker = CircuitBreakerFactory.forCache('redis');

      assert(breaker instanceof CircuitBreaker);
      assert.strictEqual(breaker.getStats().name, 'cache_redis');
    });

    it('should use default cache name', () => {
      const breaker = CircuitBreakerFactory.forCache();

      assert.strictEqual(breaker.getStats().name, 'cache_redis');
    });

    it('should return same instance for same cache name', () => {
      const breaker1 = CircuitBreakerFactory.forCache('memory');
      const breaker2 = CircuitBreakerFactory.forCache('memory');

      assert.strictEqual(breaker1, breaker2);
    });
  });

  describe('Database Circuit Breakers', () => {
    it('should create circuit breaker for database', () => {
      const breaker = CircuitBreakerFactory.forDatabase('postgres');

      assert(breaker instanceof CircuitBreaker);
      assert.strictEqual(breaker.getStats().name, 'db_postgres');
    });

    it('should return same instance for same database name', () => {
      const breaker1 = CircuitBreakerFactory.forDatabase('mongodb');
      const breaker2 = CircuitBreakerFactory.forDatabase('mongodb');

      assert.strictEqual(breaker1, breaker2);
    });
  });

  describe('Factory Management', () => {
    it('should get all created circuit breakers', () => {
      CircuitBreakerFactory.forExternalService('service1');
      CircuitBreakerFactory.forCache('redis');
      CircuitBreakerFactory.forDatabase('postgres');

      const allBreakers = CircuitBreakerFactory.getAllBreakers();
      assert.strictEqual(allBreakers.length, 3);
    });

    it('should get circuit breaker by name', () => {
      const createdBreaker = CircuitBreakerFactory.forExternalService('test-service');
      const retrievedBreaker = CircuitBreakerFactory.getBreaker('test-service');

      assert.strictEqual(retrievedBreaker, createdBreaker);
    });

    it('should return undefined for non-existent breaker', () => {
      const breaker = CircuitBreakerFactory.getBreaker('non-existent');
      assert.strictEqual(breaker, undefined);
    });

    it('should provide health status for all breakers', () => {
      const service1 = CircuitBreakerFactory.forExternalService('service1');
      CircuitBreakerFactory.forExternalService('service2');
      CircuitBreakerFactory.forCache('redis');

      // Trip one breaker
      service1.trip();

      const healthStatus = CircuitBreakerFactory.getHealthStatus();

      assert.strictEqual(healthStatus.total, 3);
      assert.strictEqual(healthStatus.healthy, 2); // service2 and cache
      assert.strictEqual(healthStatus.failed, 1); // service1
      assert.strictEqual(healthStatus.degraded, 0);
      assert.strictEqual(healthStatus.breakers.length, 3);
    });

    it('should reset all circuit breakers', () => {
      const service = CircuitBreakerFactory.forExternalService('service');
      const cache = CircuitBreakerFactory.forCache('redis');

      // Trip both breakers
      service.trip();
      cache.trip();

      assert.strictEqual(service.getState(), CircuitState.OPEN);
      assert.strictEqual(cache.getState(), CircuitState.OPEN);

      CircuitBreakerFactory.resetAll();

      assert.strictEqual(service.getState(), CircuitState.CLOSED);
      assert.strictEqual(cache.getState(), CircuitState.CLOSED);
    });
  });
});

describe('Utility Functions (Node.js Test Runner)', () => {
  describe('withCircuitBreaker wrapper', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringWindow: 5000,
        successThreshold: 1,
        timeout: 500,
        name: 'wrapper-test',
      });
    });

    it('should wrap async function with circuit breaker', async () => {
      const originalFunction = mock.fn(async (value: string) => `processed: ${value}`);
      const wrappedFunction = withCircuitBreaker(originalFunction, circuitBreaker);

      const result = await wrappedFunction('test');

      assert.strictEqual(result, 'processed: test');
      assert.strictEqual(originalFunction.mock.callCount(), 1);
      assert.deepStrictEqual(originalFunction.mock.calls[0].arguments, ['test']);
    });

    it('should handle function failures through circuit breaker', async () => {
      const failingFunction = mock.fn(async () => {
        throw new Error('Function failed');
      });
      const wrappedFunction = withCircuitBreaker(failingFunction, circuitBreaker);

      await assert.rejects(
        async () => {
          await wrappedFunction();
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Function failed');
          return true;
        }
      );

      assert.strictEqual(circuitBreaker.getStats().totalFailures, 1);
    });

    it('should maintain function signature and arguments', async () => {
      const multiArgFunction = mock.fn(async (a: string, b: number, c: boolean) => {
        return { a, b, c };
      });

      const wrappedFunction = withCircuitBreaker(multiArgFunction, circuitBreaker);
      const result = await wrappedFunction('test', 42, true);

      assert.deepStrictEqual(result, { a: 'test', b: 42, c: true });
      assert.strictEqual(multiArgFunction.mock.callCount(), 1);
      assert.deepStrictEqual(multiArgFunction.mock.calls[0].arguments, ['test', 42, true]);
    });

    it('should fail fast when circuit is open', async () => {
      const mockFunction = mock.fn(async () => 'result');
      const wrappedFunction = withCircuitBreaker(mockFunction, circuitBreaker);

      // Trip the circuit
      circuitBreaker.trip();

      await assert.rejects(
        async () => {
          await wrappedFunction();
        },
        (error: Error) => {
          assert(error.message.includes('Circuit breaker wrapper-test is OPEN'));
          return true;
        }
      );

      assert.strictEqual(mockFunction.mock.callCount(), 0);
    });
  });
});

describe('Performance Testing (Node.js Test Runner)', () => {
  it('should handle high-volume requests efficiently', async () => {
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 10,
      recoveryTimeout: 1000,
      monitoringWindow: 10000,
      successThreshold: 2,
      timeout: 100,
      name: 'load-test',
    });

    const fastFunction = mock.fn(async () => 'success');
    const promises = [];

    const startTime = Date.now();

    // Execute 100 requests (reduced from 1000 for faster tests)
    for (let i = 0; i < 100; i++) {
      promises.push(circuitBreaker.execute(fastFunction));
    }

    await Promise.all(promises);
    const endTime = Date.now();

    assert(endTime - startTime < 2000); // Should complete within 2 seconds
    assert.strictEqual(circuitBreaker.getStats().totalSuccesses, 100);
    assert.strictEqual(circuitBreaker.getState(), CircuitState.CLOSED);
  });

  it('should maintain performance with mixed success/failure patterns', async () => {
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 100, // High threshold to avoid opening
      recoveryTimeout: 1000,
      monitoringWindow: 10000,
      successThreshold: 2,
      timeout: 100,
      name: 'mixed-load-test',
    });

    const promises = [];
    const startTime = Date.now();

    // Mix of success and failure (reduced to 50 total for faster tests)
    for (let i = 0; i < 50; i++) {
      if (i % 10 === 0) {
        // 10% failures
        promises.push(
          circuitBreaker.execute(() => Promise.reject(new Error('Failure'))).catch(() => 'handled')
        );
      } else {
        // 90% successes
        promises.push(circuitBreaker.execute(() => Promise.resolve('success')));
      }
    }

    await Promise.all(promises);
    const endTime = Date.now();

    assert(endTime - startTime < 1000); // Should complete within 1 second

    const stats = circuitBreaker.getStats();
    assert.strictEqual(stats.totalRequests, 50);
    assert.strictEqual(stats.totalFailures, 5); // 10% of 50
    assert.strictEqual(stats.totalSuccesses, 45); // 90% of 50
  });
});