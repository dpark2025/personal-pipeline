"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisConnectionManager = exports.ConnectionState = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const logger_js_1 = require("./logger.js");
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["DISCONNECTED"] = "disconnected";
    ConnectionState["CONNECTING"] = "connecting";
    ConnectionState["CONNECTED"] = "connected";
    ConnectionState["FAILED"] = "failed";
    ConnectionState["CIRCUIT_OPEN"] = "circuit_open";
})(ConnectionState || (exports.ConnectionState = ConnectionState = {}));
class RedisConnectionManager extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.redis = null;
        this.state = ConnectionState.DISCONNECTED;
        this.totalAttempts = 0;
        this.successfulConnections = 0;
        this.consecutiveFailures = 0;
        this.lastAttempt = null;
        this.lastSuccess = null;
        this.nextRetryAt = null;
        this.retryTimer = null;
        this.isShuttingDown = false;
        this.config = config;
        this.currentDelay = config.retry_delay_ms;
    }
    getClient() {
        return this.redis;
    }
    getState() {
        return this.state;
    }
    getStats() {
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
    async connect() {
        if (this.isShuttingDown) {
            return;
        }
        if (this.state === ConnectionState.CONNECTING) {
            logger_js_1.logger.debug('Redis connection attempt already in progress');
            return;
        }
        if (this.state === ConnectionState.CIRCUIT_OPEN &&
            this.nextRetryAt &&
            Date.now() < this.nextRetryAt.getTime()) {
            const remainingMs = this.nextRetryAt.getTime() - Date.now();
            logger_js_1.logger.debug('Redis connection circuit breaker open, waiting for retry window', {
                nextRetryAt: this.nextRetryAt.toISOString(),
                remainingMs,
                consecutiveFailures: this.consecutiveFailures,
            });
            return;
        }
        await this.attemptConnection();
    }
    async disconnect() {
        this.isShuttingDown = true;
        this.clearRetryTimer();
        if (this.redis) {
            try {
                await this.redis.quit();
            }
            catch (error) {
                logger_js_1.logger.debug('Redis quit error during shutdown', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            this.redis = null;
        }
        this.setState(ConnectionState.DISCONNECTED);
    }
    isAvailable() {
        return this.state === ConnectionState.CONNECTED && this.redis !== null;
    }
    async executeOperation(operation) {
        if (!this.isAvailable()) {
            if (this.state === ConnectionState.DISCONNECTED || this.state === ConnectionState.FAILED) {
                await this.connect();
            }
            if (!this.isAvailable()) {
                return null;
            }
        }
        try {
            return await operation(this.redis);
        }
        catch (error) {
            logger_js_1.logger.warn('Redis operation failed', {
                error: error instanceof Error ? error.message : String(error),
                state: this.state,
            });
            if (error instanceof Error &&
                (error.message.includes('Connection is closed') ||
                    error.message.includes('ECONNREFUSED') ||
                    error.message.includes('ETIMEDOUT'))) {
                this.handleConnectionFailure(error);
            }
            return null;
        }
    }
    async attemptConnection() {
        if (this.consecutiveFailures >= this.config.connection_retry_limit) {
            this.setState(ConnectionState.CIRCUIT_OPEN);
            this.scheduleNextRetry();
            return;
        }
        this.setState(ConnectionState.CONNECTING);
        this.totalAttempts++;
        this.lastAttempt = new Date();
        try {
            if (this.redis) {
                this.redis.removeAllListeners();
                try {
                    await this.redis.quit();
                }
                catch {
                }
            }
            this.redis = new ioredis_1.default(this.config.url, {
                connectTimeout: this.config.connection_timeout_ms,
                maxRetriesPerRequest: 0,
                lazyConnect: true,
                keepAlive: 30000,
                enableOfflineQueue: false,
                enableReadyCheck: false,
                showFriendlyErrorStack: false,
                autoResubscribe: false,
                autoResendUnfulfilledCommands: false,
            });
            this.setupRedisEventHandlers();
            try {
                await this.redis.connect();
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error(`Connection timeout after ${this.config.connection_timeout_ms}ms`));
                    }, this.config.connection_timeout_ms);
                    if (this.redis && this.redis.status === 'ready') {
                        clearTimeout(timeout);
                        resolve();
                        return;
                    }
                    this.redis.once('ready', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                    this.redis.once('error', error => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });
            }
            catch (error) {
                throw error;
            }
            this.handleConnectionSuccess();
        }
        catch (error) {
            this.handleConnectionFailure(error);
        }
    }
    setupRedisEventHandlers() {
        if (!this.redis)
            return;
        this.redis.on('ready', () => {
            logger_js_1.logger.debug('Redis client ready');
        });
        this.redis.on('connect', () => {
            logger_js_1.logger.debug('Redis client connected');
        });
        this.redis.on('error', error => {
            if (this.state === ConnectionState.CIRCUIT_OPEN) {
                logger_js_1.logger.debug('Redis client error (circuit open)', {
                    error: error.message,
                    state: this.state,
                    consecutiveFailures: this.consecutiveFailures,
                });
            }
            else if (this.consecutiveFailures <= 3) {
                logger_js_1.logger.debug('Redis client error', {
                    error: error.message,
                    state: this.state,
                    consecutiveFailures: this.consecutiveFailures,
                });
            }
            else {
                logger_js_1.logger.debug('Redis client error (repeated)', {
                    error: error.message,
                    state: this.state,
                    consecutiveFailures: this.consecutiveFailures,
                });
            }
        });
        this.redis.on('close', () => {
            logger_js_1.logger.debug('Redis connection closed', {
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
            logger_js_1.logger.debug('Redis client reconnecting');
        });
        this.redis.on('end', () => {
            logger_js_1.logger.debug('Redis connection ended');
        });
    }
    handleConnectionSuccess() {
        this.setState(ConnectionState.CONNECTED);
        this.successfulConnections++;
        this.consecutiveFailures = 0;
        this.lastSuccess = new Date();
        this.nextRetryAt = null;
        this.currentDelay = this.config.retry_delay_ms;
        this.clearRetryTimer();
        logger_js_1.logger.info('Redis connection established', {
            totalAttempts: this.totalAttempts,
            successfulConnections: this.successfulConnections,
        });
        this.emit('connected');
    }
    handleConnectionFailure(error) {
        this.consecutiveFailures++;
        this.setState(ConnectionState.FAILED);
        if (this.redis) {
            this.redis.removeAllListeners();
            this.redis = null;
        }
        if (this.consecutiveFailures === 1) {
            logger_js_1.logger.warn('Redis connection failed - first attempt', {
                error: error.message,
                attempt: this.totalAttempts,
                consecutiveFailures: this.consecutiveFailures,
            });
        }
        else if (this.consecutiveFailures <= 3) {
            logger_js_1.logger.info('Redis connection failed - persistent issue', {
                error: error.message,
                attempt: this.totalAttempts,
                consecutiveFailures: this.consecutiveFailures,
            });
        }
        else {
            logger_js_1.logger.debug('Redis connection failed (repeated failures)', {
                error: error.message,
                attempt: this.totalAttempts,
                consecutiveFailures: this.consecutiveFailures,
                state: this.state,
            });
        }
        this.emit('connectionFailed', error);
        if (this.consecutiveFailures >= this.config.connection_retry_limit) {
            this.setState(ConnectionState.CIRCUIT_OPEN);
            logger_js_1.logger.warn('Redis connection circuit breaker opened - further attempts paused', {
                consecutiveFailures: this.consecutiveFailures,
                retryLimit: this.config.connection_retry_limit,
                nextRetryInMs: Math.max(60000, this.config.max_retry_delay_ms),
                message: 'Redis connection attempts will be reduced to prevent resource waste',
            });
            this.emit('circuitOpened');
        }
        this.scheduleNextRetry();
    }
    scheduleReconnect() {
        if (this.isShuttingDown)
            return;
        this.scheduleNextRetry(1000);
    }
    scheduleNextRetry(customDelay) {
        if (this.isShuttingDown)
            return;
        this.clearRetryTimer();
        let delay = customDelay || this.currentDelay;
        if (this.state === ConnectionState.CIRCUIT_OPEN) {
            delay = Math.max(60000, this.config.max_retry_delay_ms);
            this.nextRetryAt = new Date(Date.now() + delay);
            logger_js_1.logger.debug('Redis circuit breaker open - scheduling long delay retry', {
                delay,
                nextRetryAt: this.nextRetryAt.toISOString(),
                consecutiveFailures: this.consecutiveFailures,
                state: this.state,
            });
        }
        else {
            if (!customDelay && this.consecutiveFailures > 0) {
                delay = Math.min(this.currentDelay *
                    Math.pow(this.config.backoff_multiplier, this.consecutiveFailures - 1), this.config.max_retry_delay_ms);
            }
            this.nextRetryAt = new Date(Date.now() + delay);
            logger_js_1.logger.debug('Scheduling Redis reconnection', {
                delay,
                nextRetryAt: this.nextRetryAt.toISOString(),
                consecutiveFailures: this.consecutiveFailures,
                state: this.state,
            });
        }
        this.retryTimer = setTimeout(() => {
            if (!this.isShuttingDown) {
                this.connect().catch(error => {
                    logger_js_1.logger.debug('Scheduled reconnection failed', {
                        error: error instanceof Error ? error.message : String(error),
                        state: this.state,
                    });
                });
            }
        }, delay);
    }
    clearRetryTimer() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }
    setState(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            logger_js_1.logger.debug('Redis connection state changed', {
                oldState,
                newState,
                consecutiveFailures: this.consecutiveFailures,
            });
            this.emit('stateChanged', { oldState, newState });
        }
    }
}
exports.RedisConnectionManager = RedisConnectionManager;
