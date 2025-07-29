/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides fault tolerance and resilience for external service calls,
 * implementing the circuit breaker pattern to prevent cascading failures.
 * 
 * Authored by: DevOps Engineer (Hank)
 * Date: 2025-07-29
 */

import { EventEmitter } from 'events';
import { logger } from './logger.js';

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Circuit is open, requests fail fast
  HALF_OPEN = 'half_open' // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  recoveryTimeout: number;       // Time to wait before trying again (ms)
  monitoringWindow: number;      // Time window for failure counting (ms)
  successThreshold: number;      // Successes needed to close in half-open state
  timeout: number;               // Request timeout (ms)
  name?: string;                 // Circuit name for logging
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  uptime: number; // Percentage
  nextRetry: Date | null;
}

export class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private nextRetry: Date | null = null;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private failureWindow: Date[] = [];
  private name: string;

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
    this.name = config.name || 'Circuit';
    
    logger.debug('Circuit breaker initialized', {
      name: this.name,
      failureThreshold: config.failureThreshold,
      recoveryTimeout: config.recoveryTimeout,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.setState(CircuitState.HALF_OPEN);
    }

    // Fail fast if circuit is open
    if (this.state === CircuitState.OPEN) {
      const error = new Error(`Circuit breaker ${this.name} is OPEN`);
      this.emit('fallback', error);
      throw error;
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Execute function with timeout protection
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Circuit breaker timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successes++;
    this.totalSuccesses++;
    this.lastSuccess = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.setState(CircuitState.CLOSED);
        this.reset();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failures = 0;
      this.failureWindow = [];
    }

    this.emit('success', {
      state: this.state,
      successes: this.successes,
      totalSuccesses: this.totalSuccesses,
    });

    logger.debug('Circuit breaker success', {
      name: this.name,
      state: this.state,
      successes: this.successes,
    });
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailure = new Date();
    this.failureWindow.push(new Date());

    // Clean up old failures outside monitoring window
    this.cleanupFailureWindow();

    this.emit('failure', {
      error,
      state: this.state,
      failures: this.failures,
      totalFailures: this.totalFailures,
    });

    logger.warn('Circuit breaker failure', {
      name: this.name,
      state: this.state,
      failures: this.failures,
      error: error.message,
    });

    // Check if we should open the circuit
    if (this.state === CircuitState.CLOSED && this.shouldOpenCircuit()) {
      this.setState(CircuitState.OPEN);
      this.nextRetry = new Date(Date.now() + this.config.recoveryTimeout);
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Go back to open state on any failure in half-open
      this.setState(CircuitState.OPEN);
      this.nextRetry = new Date(Date.now() + this.config.recoveryTimeout);
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    return this.failureWindow.length >= this.config.failureThreshold;
  }

  /**
   * Check if circuit should attempt reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    return this.nextRetry !== null && Date.now() >= this.nextRetry.getTime();
  }

  /**
   * Clean up failures outside the monitoring window
   */
  private cleanupFailureWindow(): void {
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.failureWindow = this.failureWindow.filter(
      failureTime => failureTime.getTime() > cutoff
    );
  }

  /**
   * Set circuit state and emit events
   */
  private setState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (oldState !== newState) {
      logger.info('Circuit breaker state changed', {
        name: this.name,
        oldState,
        newState,
        failures: this.failures,
        successes: this.successes,
      });

      this.emit('stateChange', {
        oldState,
        newState,
        name: this.name,
      });

      if (newState === CircuitState.OPEN) {
        this.emit('open');
      } else if (newState === CircuitState.CLOSED) {
        this.emit('close');
      } else if (newState === CircuitState.HALF_OPEN) {
        this.emit('halfOpen');
      }
    }
  }

  /**
   * Reset circuit breaker state
   */
  private reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.failureWindow = [];
    this.nextRetry = null;
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      uptime: this.totalRequests > 0 ? (this.totalSuccesses / this.totalRequests) * 100 : 100,
      nextRetry: this.nextRetry,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Manually trip the circuit (for testing)
   */
  trip(): void {
    this.setState(CircuitState.OPEN);
    this.nextRetry = new Date(Date.now() + this.config.recoveryTimeout);
    logger.info('Circuit breaker manually tripped', { name: this.name });
  }

  /**
   * Manually reset the circuit (for testing)
   */
  manualReset(): void {
    this.setState(CircuitState.CLOSED);
    this.reset();
    logger.info('Circuit breaker manually reset', { name: this.name });
  }
}

/**
 * Circuit breaker factory with common configurations
 */
export class CircuitBreakerFactory {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Create or get a circuit breaker for external services
   */
  static forExternalService(serviceName: string, customConfig?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (this.breakers.has(serviceName)) {
      return this.breakers.get(serviceName)!;
    }

    const config: CircuitBreakerConfig = {
      failureThreshold: 5,        // 5 failures
      recoveryTimeout: 60000,     // 1 minute
      monitoringWindow: 300000,   // 5 minutes
      successThreshold: 3,        // 3 successes to close
      timeout: 30000,             // 30 second timeout
      name: serviceName,
      ...customConfig,
    };

    const breaker = new CircuitBreaker(config);
    this.breakers.set(serviceName, breaker);

    logger.info('Circuit breaker created for external service', {
      serviceName,
      config,
    });

    return breaker;
  }

  /**
   * Create or get a circuit breaker for cache operations
   */
  static forCache(cacheName: string = 'redis'): CircuitBreaker {
    const name = `cache_${cacheName}`;
    
    if (this.breakers.has(name)) {
      return this.breakers.get(name)!;
    }

    const config: CircuitBreakerConfig = {
      failureThreshold: 3,        // 3 failures
      recoveryTimeout: 30000,     // 30 seconds
      monitoringWindow: 120000,   // 2 minutes
      successThreshold: 2,        // 2 successes to close
      timeout: 5000,              // 5 second timeout
      name,
    };

    const breaker = new CircuitBreaker(config);
    this.breakers.set(name, breaker);

    logger.info('Circuit breaker created for cache', { cacheName, config });

    return breaker;
  }

  /**
   * Create or get a circuit breaker for database operations
   */
  static forDatabase(dbName: string): CircuitBreaker {
    const name = `db_${dbName}`;
    
    if (this.breakers.has(name)) {
      return this.breakers.get(name)!;
    }

    const config: CircuitBreakerConfig = {
      failureThreshold: 3,        // 3 failures
      recoveryTimeout: 60000,     // 1 minute
      monitoringWindow: 300000,   // 5 minutes
      successThreshold: 2,        // 2 successes to close
      timeout: 10000,             // 10 second timeout
      name,
    };

    const breaker = new CircuitBreaker(config);
    this.breakers.set(name, breaker);

    logger.info('Circuit breaker created for database', { dbName, config });

    return breaker;
  }

  /**
   * Get all circuit breakers
   */
  static getAllBreakers(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Get circuit breaker by name
   */
  static getBreaker(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get health status of all circuit breakers
   */
  static getHealthStatus(): {
    healthy: number;
    degraded: number;
    failed: number;
    total: number;
    breakers: CircuitBreakerStats[];
  } {
    const breakers = this.getAllBreakers();
    const stats = breakers.map(b => b.getStats());
    
    let healthy = 0;
    let degraded = 0;
    let failed = 0;

    stats.forEach(stat => {
      switch (stat.state) {
        case CircuitState.CLOSED:
          healthy++;
          break;
        case CircuitState.HALF_OPEN:
          degraded++;
          break;
        case CircuitState.OPEN:
          failed++;
          break;
      }
    });

    return {
      healthy,
      degraded,
      failed,
      total: breakers.length,
      breakers: stats,
    };
  }

  /**
   * Reset all circuit breakers (for testing)
   */
  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.manualReset());
    logger.info('All circuit breakers reset');
  }
}

/**
 * Utility function to wrap async functions with circuit breaker
 */
export function withCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  circuitBreaker: CircuitBreaker
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return circuitBreaker.execute(() => fn(...args));
  };
}