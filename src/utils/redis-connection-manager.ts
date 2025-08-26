/**
 * Redis Connection Manager with Exponential Backoff
 *
 * Manages Redis connections with intelligent retry logic, exponential backoff,
 * and connection state tracking to prevent log spam and excessive retries.
 *
 * Authored by: Backend Lead (Cindy)
 * Date: 2025-07-29
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { logger } from './logger.js';
import { CacheConfig } from '../types/index.js';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed',
  CIRCUIT_OPEN = 'circuit_open',
}

export interface ConnectionStats {
  state: ConnectionState;
  totalAttempts: number;
  successfulConnections: number;
  consecutiveFailures: number;
  lastAttempt: Date | null;
  lastSuccess: Date | null;
  nextRetryAt: Date | null;
  currentDelay: number;
}

export class RedisConnectionManager extends EventEmitter {
  private redis: Redis | null = null;
  private config: CacheConfig['redis'];
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private totalAttempts: number = 0;
  private successfulConnections: number = 0;
  private consecutiveFailures: number = 0;
  private lastAttempt: Date | null = null;
  private lastSuccess: Date | null = null;
  private nextRetryAt: Date | null = null;
  private currentDelay: number;
  private retryTimer: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;

  constructor(config: CacheConfig['redis']) {
    super();
    this.config = config;
    this.currentDelay = config.retry_delay_ms;
  }

  /**
   * Get Redis client instance (may be null if not connected)
   */
  getClient(): Redis | null {
    return this.redis;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return {
      state: this.state,
      totalAttempts: this.totalAttempts,
      successfulConnections: this.successfulConnections,
      consecutiveFailures: this.consecutiveFailures,
      lastAttempt: this.lastAttempt,
      lastSuccess: this.lastSuccess,
      nextRetryAt: this.nextRetryAt,
      currentDelay: this.currentDelay,
    };
  }

  /**
   * Initialize connection attempt
   */
  async connect(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    if (this.state === ConnectionState.CONNECTING) {
      logger.debug('Redis connection attempt already in progress');
      return;
    }

    if (
      this.state === ConnectionState.CIRCUIT_OPEN &&
      this.nextRetryAt &&
      Date.now() < this.nextRetryAt.getTime()
    ) {
      const remainingMs = this.nextRetryAt.getTime() - Date.now();
      logger.debug('Redis connection circuit breaker open, waiting for retry window', {
        nextRetryAt: this.nextRetryAt.toISOString(),
        remainingMs,
        consecutiveFailures: this.consecutiveFailures,
      });
      return;
    }

    await this.attemptConnection();
  }

  /**
   * Force disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    this.clearRetryTimer();

    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        // Ignore quit errors during shutdown
        logger.debug('Redis quit error during shutdown', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.redis = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
  }

  /**
   * Check if Redis is available for operations
   */
  isAvailable(): boolean {
    return this.state === ConnectionState.CONNECTED && this.redis !== null;
  }

  /**
   * Execute Redis operation with connection check
   */
  async executeOperation<T>(operation: (redis: Redis) => Promise<T>): Promise<T | null> {
    if (!this.isAvailable()) {
      // Try to reconnect if not in circuit breaker state
      if (this.state === ConnectionState.DISCONNECTED || this.state === ConnectionState.FAILED) {
        await this.connect();
      }

      if (!this.isAvailable()) {
        return null;
      }
    }

    try {
      return await operation(this.redis!);
    } catch (error) {
      logger.warn('Redis operation failed', {
        error: error instanceof Error ? error.message : String(error),
        state: this.state,
      });

      // Check if this is a connection error
      if (
        error instanceof Error &&
        (error.message.includes('Connection is closed') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT'))
      ) {
        this.handleConnectionFailure(error);
      }

      return null;
    }
  }

  private async attemptConnection(): Promise<void> {
    if (this.consecutiveFailures >= this.config.connection_retry_limit) {
      this.setState(ConnectionState.CIRCUIT_OPEN);
      this.scheduleNextRetry();
      return;
    }

    this.setState(ConnectionState.CONNECTING);
    this.totalAttempts++;
    this.lastAttempt = new Date();

    try {
      // Clean up existing connection
      if (this.redis) {
        this.redis.removeAllListeners();
        try {
          await this.redis.quit();
        } catch {
          // Ignore quit errors
        }
      }

      // Create new Redis instance with proper error handling configuration
      this.redis = new Redis(this.config.url, {
        connectTimeout: this.config.connection_timeout_ms,
        maxRetriesPerRequest: 0, // Don't retry failed commands
        lazyConnect: true, // Don't connect immediately - we'll connect manually
        keepAlive: 30000, // Keep alive for 30 seconds
        enableOfflineQueue: false, // Don't queue commands when offline
        // Disable ready check to prevent extra connections
        enableReadyCheck: false,
        // Reduce verbose error stacks
        showFriendlyErrorStack: false,
        // Disable automatic resubscribe on reconnect
        autoResubscribe: false,
        // Disable automatic resend of unfulfilled commands
        autoResendUnfulfilledCommands: false,
      });

      this.setupRedisEventHandlers();

      // Now manually initiate connection after handlers are set up
      try {
        await this.redis.connect();

        // Wait for ready state with timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Connection timeout after ${this.config.connection_timeout_ms}ms`));
          }, this.config.connection_timeout_ms);

          if (this.redis && this.redis.status === 'ready') {
            clearTimeout(timeout);
            resolve();
            return;
          }

          this.redis!.once('ready', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.redis!.once('error', error => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      } catch (error) {
        // Connection failed, but error is already handled by event handlers
        throw error;
      }

      // Connection successful
      this.handleConnectionSuccess();
    } catch (error) {
      this.handleConnectionFailure(error as Error);
    }
  }

  private setupRedisEventHandlers(): void {
    if (!this.redis) return;

    // Remove any existing listeners to prevent duplicates
    this.redis.removeAllListeners();

    this.redis.on('ready', () => {
      logger.debug('Redis client ready');
      this.handleConnectionSuccess();
    });

    this.redis.on('connect', () => {
      logger.debug('Redis client connected');
    });

    // Handle all errors to prevent unhandled error events
    this.redis.on('error', (error: Error) => {
      // This handler MUST be synchronous and handle ALL errors
      // to prevent them from becoming unhandled
      this.handleConnectionFailure(error);
      
      // Suppress Redis error logging during tests with error-level logging
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.LOG_LEVEL === 'error';
      
      if (!isTestEnv) {
        // Log level depends on circuit breaker state and failure count
        if (this.state === ConnectionState.CIRCUIT_OPEN) {
          // Circuit breaker is open, log at trace level to reduce spam
          logger.debug('Redis client error (circuit open)', {
            error: error.message,
            state: this.state,
            consecutiveFailures: this.consecutiveFailures,
          });
        } else if (this.consecutiveFailures <= 3) {
          // First few failures, log at debug level
          logger.debug('Redis client error', {
            error: error.message,
            state: this.state,
            consecutiveFailures: this.consecutiveFailures,
          });
        } else {
          // Repeated failures, log at trace level to minimize spam
          logger.debug('Redis client error (repeated)', {
            error: error.message,
            state: this.state,
            consecutiveFailures: this.consecutiveFailures,
          });
        }
      }
      
      // Prevent error propagation
      return;
    });

    this.redis.on('close', () => {
      logger.debug('Redis connection closed', {
        state: this.state,
        wasConnected: this.state === ConnectionState.CONNECTED,
      });

      if (this.state === ConnectionState.CONNECTED) {
        this.setState(ConnectionState.DISCONNECTED);
        if (!this.isShuttingDown) {
          this.scheduleReconnect();
        }
      }
    });

    this.redis.on('reconnecting', () => {
      logger.debug('Redis client reconnecting');
    });

    // Handle lazyConnect events to prevent unhandled errors
    this.redis.on('end', () => {
      logger.debug('Redis connection ended');
    });
  }

  private handleConnectionSuccess(): void {
    this.setState(ConnectionState.CONNECTED);
    this.successfulConnections++;
    this.consecutiveFailures = 0;
    this.lastSuccess = new Date();
    this.nextRetryAt = null;
    this.currentDelay = this.config.retry_delay_ms; // Reset delay
    this.clearRetryTimer();

    logger.info('Redis connection established', {
      totalAttempts: this.totalAttempts,
      successfulConnections: this.successfulConnections,
    });

    this.emit('connected');
  }

  private handleConnectionFailure(error: Error): void {
    this.consecutiveFailures++;
    this.setState(ConnectionState.FAILED);

    // Clean up failed connection
    if (this.redis) {
      this.redis.removeAllListeners();
      this.redis = null;
    }

    // Log appropriately based on failure count and circuit breaker state
    // Suppress logging during tests unless LOG_LEVEL allows it
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.LOG_LEVEL === 'error';
    
    if (this.consecutiveFailures === 1) {
      // First failure - log as warning to alert administrators (unless in test mode)
      if (!isTestEnv) {
        logger.warn('Redis connection failed - first attempt', {
          error: error.message,
          attempt: this.totalAttempts,
          consecutiveFailures: this.consecutiveFailures,
        });
      }
    } else if (this.consecutiveFailures <= 3) {
      // Second and third failures - log as info to show the issue persists (unless in test mode)
      if (!isTestEnv) {
        logger.info('Redis connection failed - persistent issue', {
          error: error.message,
          attempt: this.totalAttempts,
          consecutiveFailures: this.consecutiveFailures,
        });
      }
    } else {
      // Repeated failures after 3 attempts - reduce to debug level to prevent spam
      logger.debug('Redis connection failed (repeated failures)', {
        error: error.message,
        attempt: this.totalAttempts,
        consecutiveFailures: this.consecutiveFailures,
        state: this.state,
      });
    }

    this.emit('connectionFailed', error);

    // Check if we should open the circuit breaker
    if (this.consecutiveFailures >= this.config.connection_retry_limit) {
      this.setState(ConnectionState.CIRCUIT_OPEN);
      logger.warn('Redis connection circuit breaker opened - further attempts paused', {
        consecutiveFailures: this.consecutiveFailures,
        retryLimit: this.config.connection_retry_limit,
        nextRetryInMs: Math.max(60000, this.config.max_retry_delay_ms),
        message: 'Redis connection attempts will be reduced to prevent resource waste',
      });
      this.emit('circuitOpened');
    }

    this.scheduleNextRetry();
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) return;

    // Immediate reconnect for unexpected disconnections
    this.scheduleNextRetry(1000); // 1 second delay
  }

  private scheduleNextRetry(customDelay?: number): void {
    if (this.isShuttingDown) return;

    this.clearRetryTimer();

    let delay = customDelay || this.currentDelay;

    // When circuit breaker is open, use much longer delays to reduce log spam
    if (this.state === ConnectionState.CIRCUIT_OPEN) {
      // Circuit breaker timeout - use configuration value or default to 60 seconds
      delay = Math.max(60000, this.config.max_retry_delay_ms); // At least 60 seconds

      this.nextRetryAt = new Date(Date.now() + delay);

      logger.debug('Redis circuit breaker open - scheduling long delay retry', {
        delay,
        nextRetryAt: this.nextRetryAt.toISOString(),
        consecutiveFailures: this.consecutiveFailures,
        state: this.state,
      });
    } else {
      // Apply exponential backoff for failed connections
      if (!customDelay && this.consecutiveFailures > 0) {
        delay = Math.min(
          this.currentDelay *
            Math.pow(this.config.backoff_multiplier, this.consecutiveFailures - 1),
          this.config.max_retry_delay_ms
        );
      }

      this.nextRetryAt = new Date(Date.now() + delay);

      logger.debug('Scheduling Redis reconnection', {
        delay,
        nextRetryAt: this.nextRetryAt.toISOString(),
        consecutiveFailures: this.consecutiveFailures,
        state: this.state,
      });
    }

    this.retryTimer = setTimeout(() => {
      if (!this.isShuttingDown) {
        this.connect().catch(error => {
          logger.debug('Scheduled reconnection failed', {
            error: error instanceof Error ? error.message : String(error),
            state: this.state,
          });
        });
      }
    }, delay);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;

      logger.debug('Redis connection state changed', {
        oldState,
        newState,
        consecutiveFailures: this.consecutiveFailures,
      });

      this.emit('stateChanged', { oldState, newState });
    }
  }
}
