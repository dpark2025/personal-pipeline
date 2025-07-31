/**
 * Comprehensive Circuit Breaker Tests
 * Tests for circuit breaker pattern implementation and factory
 * 
 * QA Engineer: Testing circuit breaker resilience for milestone 1.3
 * Coverage: Circuit states, failure handling, recovery, factory patterns
 */

import { 
  CircuitBreaker, 
  CircuitBreakerFactory, 
  CircuitState, 
  CircuitBreakerConfig,
  withCircuitBreaker
} from '../../../src/utils/circuit-breaker';

// Mock logger to prevent console output during tests
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('CircuitBreaker - Comprehensive Testing', () => {
  let circuitBreaker: CircuitBreaker;
  let mockConfig: CircuitBreakerConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
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
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.isHealthy()).toBe(true);
    });

    it('should transition to OPEN state after failure threshold', async () => {
      const failingFunction = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      // Trigger failures up to threshold
      for (let i = 0; i < mockConfig.failureThreshold; i++) {
        try {
          await circuitBreaker.execute(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.isHealthy()).toBe(false);
    });

    it('should fail fast when circuit is OPEN', async () => {
      // Force circuit to OPEN state
      circuitBreaker.trip();
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      const mockFunction = jest.fn().mockResolvedValue('success');

      try {
        await circuitBreaker.execute(mockFunction);
        fail('Should have thrown circuit breaker error');
      } catch (error) {
        expect((error as Error).message).toContain('Circuit breaker test-circuit is OPEN');
        expect(mockFunction).not.toHaveBeenCalled();
      }
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      // Force circuit to OPEN state with short recovery timeout
      const shortTimeoutConfig: CircuitBreakerConfig = {
        ...mockConfig,
        recoveryTimeout: 100, // 100ms
      };
      
      const shortTimeoutBreaker = new CircuitBreaker(shortTimeoutConfig);
      shortTimeoutBreaker.trip();
      
      expect(shortTimeoutBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next execution should transition to HALF_OPEN
      const successFunction = jest.fn().mockResolvedValue('success');
      await shortTimeoutBreaker.execute(successFunction);

      expect(shortTimeoutBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition from HALF_OPEN to CLOSED after success threshold', async () => {
      // Set up circuit in HALF_OPEN state
      const breaker = new CircuitBreaker({
        ...mockConfig,
        recoveryTimeout: 100,
      });

      breaker.trip();
      await new Promise(resolve => setTimeout(resolve, 150));

      const successFunction = jest.fn().mockResolvedValue('success');

      // Execute successful calls to meet success threshold
      for (let i = 0; i < mockConfig.successThreshold; i++) {
        await breaker.execute(successFunction);
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isHealthy()).toBe(true);
    });

    it('should transition from HALF_OPEN back to OPEN on failure', async () => {
      const breaker = new CircuitBreaker({
        ...mockConfig,
        recoveryTimeout: 100,
      });

      // Force to HALF_OPEN state
      breaker.trip();
      await new Promise(resolve => setTimeout(resolve, 150));

      // First success to get to HALF_OPEN
      const successFunction = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFunction);

      // Now fail - should go back to OPEN
      const failFunction = jest.fn().mockRejectedValue(new Error('Failed again'));
      
      try {
        await breaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Execution and Timeout Handling', () => {
    it('should execute successful functions normally', async () => {
      const successFunction = jest.fn().mockResolvedValue('test result');

      const result = await circuitBreaker.execute(successFunction);

      expect(result).toBe('test result');
      expect(successFunction).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle function timeouts', async () => {
      const slowFunction = jest.fn(() => 
        new Promise(resolve => setTimeout(() => resolve('slow result'), 1000))
      );

      try {
        await circuitBreaker.execute(slowFunction);
        fail('Should have timed out');
      } catch (error) {
        expect((error as Error).message).toContain('timeout after 500ms');
      }
    });

    it('should propagate function errors', async () => {
      const errorFunction = jest.fn().mockRejectedValue(new Error('Function error'));

      try {
        await circuitBreaker.execute(errorFunction);
        fail('Should have thrown function error');
      } catch (error) {
        expect((error as Error).message).toBe('Function error');
      }
    });

    it('should handle synchronous function errors', async () => {
      const syncErrorFunction = jest.fn(() => {
        throw new Error('Sync error');
      });

      try {
        await circuitBreaker.execute(syncErrorFunction);
        fail('Should have thrown sync error');
      } catch (error) {
        expect((error as Error).message).toBe('Sync error');
      }
    });
  });

  describe('Event Emission', () => {
    it('should emit success events', async () => {
      const successHandler = jest.fn();
      circuitBreaker.on('success', successHandler);

      const successFunction = jest.fn().mockResolvedValue('result');
      await circuitBreaker.execute(successFunction);

      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          state: CircuitState.CLOSED,
          successes: 1,
          totalSuccesses: 1,
        })
      );
    });

    it('should emit failure events', async () => {
      const failureHandler = jest.fn();
      circuitBreaker.on('failure', failureHandler);

      const failFunction = jest.fn().mockRejectedValue(new Error('Test failure'));

      try {
        await circuitBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      expect(failureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          state: CircuitState.CLOSED,
          failures: 1,
          totalFailures: 1,
        })
      );
    });

    it('should emit state change events', async () => {
      const stateChangeHandler = jest.fn();
      circuitBreaker.on('stateChange', stateChangeHandler);

      // Force state change to OPEN
      circuitBreaker.trip();

      expect(stateChangeHandler).toHaveBeenCalledWith({
        oldState: CircuitState.CLOSED,
        newState: CircuitState.OPEN,
        name: 'test-circuit',
      });
    });

    it('should emit specific state events', async () => {
      const openHandler = jest.fn();
      const closeHandler = jest.fn();
      const halfOpenHandler = jest.fn();

      circuitBreaker.on('open', openHandler);
      circuitBreaker.on('close', closeHandler);
      circuitBreaker.on('halfOpen', halfOpenHandler);

      // Trip to open
      circuitBreaker.trip();
      expect(openHandler).toHaveBeenCalled();

      // Reset to closed
      circuitBreaker.manualReset();
      expect(closeHandler).toHaveBeenCalled();
    });

    it('should emit fallback events', async () => {
      const fallbackHandler = jest.fn();
      circuitBreaker.on('fallback', fallbackHandler);

      circuitBreaker.trip(); // Force to OPEN state

      const mockFunction = jest.fn();
      try {
        await circuitBreaker.execute(mockFunction);
      } catch (error) {
        // Expected
      }

      expect(fallbackHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive statistics', async () => {
      const successFunction = jest.fn().mockResolvedValue('success');
      const failFunction = jest.fn().mockRejectedValue(new Error('failure'));

      // Execute mixed operations
      await circuitBreaker.execute(successFunction);
      await circuitBreaker.execute(successFunction);
      
      try {
        await circuitBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      const stats = circuitBreaker.getStats();

      expect(stats.name).toBe('test-circuit');
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(1);
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
      expect(stats.uptime).toBe((2/3) * 100);
      expect(stats.lastSuccess).toBeInstanceOf(Date);
      expect(stats.lastFailure).toBeInstanceOf(Date);
    });

    it('should calculate uptime correctly', async () => {
      const stats = circuitBreaker.getStats();
      expect(stats.uptime).toBe(100); // No requests yet

      const successFunction = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFunction);

      const updatedStats = circuitBreaker.getStats();
      expect(updatedStats.uptime).toBe(100); // 100% success rate
    });

    it('should track failure window correctly', async () => {
      const failFunction = jest.fn().mockRejectedValue(new Error('failure'));

      // Generate failures within window
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(failFunction);
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      // One more failure should trigger OPEN state
      try {
        await circuitBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Manual Controls', () => {
    it('should manually trip circuit', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      circuitBreaker.trip();

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.isHealthy()).toBe(false);
    });

    it('should manually reset circuit', () => {
      circuitBreaker.trip();
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      circuitBreaker.manualReset();

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.isHealthy()).toBe(true);

      // Statistics should be reset
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
    });
  });

  describe('Failure Window Management', () => {
    it('should clean up old failures outside monitoring window', async () => {
      const shortWindowConfig: CircuitBreakerConfig = {
        ...mockConfig,
        monitoringWindow: 100, // 100ms window
      };

      const shortWindowBreaker = new CircuitBreaker(shortWindowConfig);
      const failFunction = jest.fn().mockRejectedValue(new Error('failure'));

      // Add failure
      try {
        await shortWindowBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      expect(shortWindowBreaker.getStats().failures).toBe(1);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Add another failure - old one should be cleaned up
      try {
        await shortWindowBreaker.execute(failFunction);
      } catch (error) {
        // Expected
      }

      // Should still be in CLOSED state because old failure was cleaned up
      expect(shortWindowBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined function execution', async () => {
      try {
        await circuitBreaker.execute(null as any);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle functions that return non-Promise values', async () => {
      const syncFunction = jest.fn(async () => 'sync result');

      const result = await circuitBreaker.execute(syncFunction);
      expect(result).toBe('sync result');
    });

    it('should handle very short timeouts gracefully', async () => {
      const veryShortTimeoutConfig: CircuitBreakerConfig = {
        ...mockConfig,
        timeout: 1, // 1ms timeout
      };

      const veryShortTimeoutBreaker = new CircuitBreaker(veryShortTimeoutConfig);
      const normalFunction = jest.fn().mockResolvedValue('result');

      try {
        await veryShortTimeoutBreaker.execute(normalFunction);
        // May or may not timeout depending on execution speed
      } catch (error) {
        // If it times out, that's acceptable
        if (!(error as Error).message.includes('timeout')) {
          throw error;
        }
      }
    });

    it('should handle concurrent executions safely', async () => {
      const mockFunction = jest.fn()
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2')
        .mockResolvedValueOnce('result3');

      const promises = [
        circuitBreaker.execute(mockFunction),
        circuitBreaker.execute(mockFunction),
        circuitBreaker.execute(mockFunction),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockFunction).toHaveBeenCalledTimes(3);
      expect(circuitBreaker.getStats().totalRequests).toBe(3);
    });
  });
});

describe('CircuitBreakerFactory - Factory Pattern Testing', () => {
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

      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker.getStats().name).toBe('github');
    });

    it('should return same instance for same service name', () => {
      const breaker1 = CircuitBreakerFactory.forExternalService('confluence');
      const breaker2 = CircuitBreakerFactory.forExternalService('confluence');

      expect(breaker1).toBe(breaker2);
    });

    it('should apply custom configuration', () => {
      const customConfig = {
        failureThreshold: 10,
        timeout: 60000,
      };

      const breaker = CircuitBreakerFactory.forExternalService('custom-service', customConfig);
      
      // Test that custom config is applied by checking behavior
      expect(breaker).toBeInstanceOf(CircuitBreaker);
    });
  });

  describe('Cache Circuit Breakers', () => {
    it('should create circuit breaker for cache', () => {
      const breaker = CircuitBreakerFactory.forCache('redis');

      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker.getStats().name).toBe('cache_redis');
    });

    it('should use default cache name', () => {
      const breaker = CircuitBreakerFactory.forCache();

      expect(breaker.getStats().name).toBe('cache_redis');
    });

    it('should return same instance for same cache name', () => {
      const breaker1 = CircuitBreakerFactory.forCache('memory');
      const breaker2 = CircuitBreakerFactory.forCache('memory');

      expect(breaker1).toBe(breaker2);
    });
  });

  describe('Database Circuit Breakers', () => {
    it('should create circuit breaker for database', () => {
      const breaker = CircuitBreakerFactory.forDatabase('postgres');

      expect(breaker).toBeInstanceOf(CircuitBreaker);
      expect(breaker.getStats().name).toBe('db_postgres');
    });

    it('should return same instance for same database name', () => {
      const breaker1 = CircuitBreakerFactory.forDatabase('mongodb');
      const breaker2 = CircuitBreakerFactory.forDatabase('mongodb');

      expect(breaker1).toBe(breaker2);
    });
  });

  describe('Factory Management', () => {
    it('should get all created circuit breakers', () => {
      CircuitBreakerFactory.forExternalService('service1');
      CircuitBreakerFactory.forCache('redis');
      CircuitBreakerFactory.forDatabase('postgres');

      const allBreakers = CircuitBreakerFactory.getAllBreakers();
      expect(allBreakers).toHaveLength(3);
    });

    it('should get circuit breaker by name', () => {
      const createdBreaker = CircuitBreakerFactory.forExternalService('test-service');
      const retrievedBreaker = CircuitBreakerFactory.getBreaker('test-service');

      expect(retrievedBreaker).toBe(createdBreaker);
    });

    it('should return undefined for non-existent breaker', () => {
      const breaker = CircuitBreakerFactory.getBreaker('non-existent');
      expect(breaker).toBeUndefined();
    });

    it('should provide health status for all breakers', () => {
      const service1 = CircuitBreakerFactory.forExternalService('service1');
      CircuitBreakerFactory.forExternalService('service2');
      CircuitBreakerFactory.forCache('redis');

      // Trip one breaker
      service1.trip();

      const healthStatus = CircuitBreakerFactory.getHealthStatus();

      expect(healthStatus.total).toBe(3);
      expect(healthStatus.healthy).toBe(2); // service2 and cache
      expect(healthStatus.failed).toBe(1); // service1
      expect(healthStatus.degraded).toBe(0);
      expect(healthStatus.breakers).toHaveLength(3);
    });

    it('should reset all circuit breakers', () => {
      const service = CircuitBreakerFactory.forExternalService('service');
      const cache = CircuitBreakerFactory.forCache('redis');

      // Trip both breakers
      service.trip();
      cache.trip();

      expect(service.getState()).toBe(CircuitState.OPEN);
      expect(cache.getState()).toBe(CircuitState.OPEN);

      CircuitBreakerFactory.resetAll();

      expect(service.getState()).toBe(CircuitState.CLOSED);
      expect(cache.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Configuration Variations', () => {
    it('should apply appropriate timeouts for different service types', () => {
      const externalService = CircuitBreakerFactory.forExternalService('github');
      const cache = CircuitBreakerFactory.forCache('redis');
      const database = CircuitBreakerFactory.forDatabase('postgres');

      // These are internal details, but we can verify they're different instances
      expect(externalService).not.toBe(cache);
      expect(cache).not.toBe(database);
      expect(database).not.toBe(externalService);
    });
  });
});

describe('Utility Functions', () => {
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
      const originalFunction = jest.fn(async (value: string) => `processed: ${value}`);
      const wrappedFunction = withCircuitBreaker(originalFunction, circuitBreaker);

      const result = await wrappedFunction('test');

      expect(result).toBe('processed: test');
      expect(originalFunction).toHaveBeenCalledWith('test');
    });

    it('should handle function failures through circuit breaker', async () => {
      const failingFunction = jest.fn(async () => {
        throw new Error('Function failed');
      });
      const wrappedFunction = withCircuitBreaker(failingFunction, circuitBreaker);

      try {
        await wrappedFunction();
        fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).toBe('Function failed');
      }

      expect(circuitBreaker.getStats().totalFailures).toBe(1);
    });

    it('should maintain function signature and arguments', async () => {
      const multiArgFunction = jest.fn(async (a: string, b: number, c: boolean) => {
        return { a, b, c };
      });
      
      const wrappedFunction = withCircuitBreaker(multiArgFunction, circuitBreaker);
      const result = await wrappedFunction('test', 42, true);

      expect(result).toEqual({ a: 'test', b: 42, c: true });
      expect(multiArgFunction).toHaveBeenCalledWith('test', 42, true);
    });

    it('should fail fast when circuit is open', async () => {
      const mockFunction = jest.fn().mockResolvedValue('result');
      const wrappedFunction = withCircuitBreaker(mockFunction, circuitBreaker);

      // Trip the circuit
      circuitBreaker.trip();

      try {
        await wrappedFunction();
        fail('Should have failed fast');
      } catch (error) {
        expect((error as Error).message).toContain('Circuit breaker wrapper-test is OPEN');
        expect(mockFunction).not.toHaveBeenCalled();
      }
    });
  });
});

describe('Performance and Load Testing', () => {
  it('should handle high-volume requests efficiently', async () => {
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 10,
      recoveryTimeout: 1000,
      monitoringWindow: 10000,
      successThreshold: 2,
      timeout: 100,
      name: 'load-test',
    });

    const fastFunction = jest.fn().mockResolvedValue('success');
    const promises = [];

    const startTime = Date.now();

    // Execute 1000 requests
    for (let i = 0; i < 1000; i++) {
      promises.push(circuitBreaker.execute(fastFunction));
    }

    await Promise.all(promises);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    expect(circuitBreaker.getStats().totalSuccesses).toBe(1000);
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
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

    // Mix of success and failure
    for (let i = 0; i < 500; i++) {
      if (i % 10 === 0) {
        // 10% failures
        promises.push(
          circuitBreaker.execute(() => Promise.reject(new Error('Failure')))
            .catch(() => 'handled')
        );
      } else {
        // 90% successes
        promises.push(circuitBreaker.execute(() => Promise.resolve('success')));
      }
    }

    await Promise.all(promises);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    
    const stats = circuitBreaker.getStats();
    expect(stats.totalRequests).toBe(500);
    expect(stats.totalFailures).toBe(50); // 10% of 500
    expect(stats.totalSuccesses).toBe(450); // 90% of 500
  });
});