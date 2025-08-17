"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerFactory = exports.CircuitBreaker = exports.CircuitState = void 0;
exports.withCircuitBreaker = withCircuitBreaker;
const events_1 = require("events");
const logger_js_1 = require("./logger.js");
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = null;
        this.lastSuccess = null;
        this.nextRetry = null;
        this.totalRequests = 0;
        this.totalFailures = 0;
        this.totalSuccesses = 0;
        this.failureWindow = [];
        this.config = config;
        this.name = config.name || 'Circuit';
        logger_js_1.logger.debug('Circuit breaker initialized', {
            name: this.name,
            failureThreshold: config.failureThreshold,
            recoveryTimeout: config.recoveryTimeout,
        });
    }
    async execute(fn) {
        this.totalRequests++;
        if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
            this.setState(CircuitState.HALF_OPEN);
        }
        if (this.state === CircuitState.OPEN) {
            const error = new Error(`Circuit breaker ${this.name} is OPEN`);
            this.emit('fallback', error);
            throw error;
        }
        try {
            const result = await this.executeWithTimeout(fn);
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure(error);
            throw error;
        }
    }
    async executeWithTimeout(fn) {
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
    onSuccess() {
        this.successes++;
        this.totalSuccesses++;
        this.lastSuccess = new Date();
        if (this.state === CircuitState.HALF_OPEN) {
            if (this.successes >= this.config.successThreshold) {
                this.setState(CircuitState.CLOSED);
                this.reset();
            }
        }
        else if (this.state === CircuitState.CLOSED) {
            this.failures = 0;
            this.failureWindow = [];
        }
        this.emit('success', {
            state: this.state,
            successes: this.successes,
            totalSuccesses: this.totalSuccesses,
        });
        logger_js_1.logger.debug('Circuit breaker success', {
            name: this.name,
            state: this.state,
            successes: this.successes,
        });
    }
    onFailure(error) {
        this.failures++;
        this.totalFailures++;
        this.lastFailure = new Date();
        this.failureWindow.push(new Date());
        this.cleanupFailureWindow();
        this.emit('failure', {
            error,
            state: this.state,
            failures: this.failures,
            totalFailures: this.totalFailures,
        });
        logger_js_1.logger.warn('Circuit breaker failure', {
            name: this.name,
            state: this.state,
            failures: this.failures,
            error: error.message,
        });
        if (this.state === CircuitState.CLOSED && this.shouldOpenCircuit()) {
            this.setState(CircuitState.OPEN);
            this.nextRetry = new Date(Date.now() + this.config.recoveryTimeout);
        }
        else if (this.state === CircuitState.HALF_OPEN) {
            this.setState(CircuitState.OPEN);
            this.nextRetry = new Date(Date.now() + this.config.recoveryTimeout);
        }
    }
    shouldOpenCircuit() {
        return this.failureWindow.length >= this.config.failureThreshold;
    }
    shouldAttemptReset() {
        return this.nextRetry !== null && Date.now() >= this.nextRetry.getTime();
    }
    cleanupFailureWindow() {
        const cutoff = Date.now() - this.config.monitoringWindow;
        this.failureWindow = this.failureWindow.filter(failureTime => failureTime.getTime() > cutoff);
    }
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        if (oldState !== newState) {
            logger_js_1.logger.info('Circuit breaker state changed', {
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
            }
            else if (newState === CircuitState.CLOSED) {
                this.emit('close');
            }
            else if (newState === CircuitState.HALF_OPEN) {
                this.emit('halfOpen');
            }
        }
    }
    reset() {
        this.failures = 0;
        this.successes = 0;
        this.failureWindow = [];
        this.nextRetry = null;
    }
    getStats() {
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
    getState() {
        return this.state;
    }
    isHealthy() {
        return this.state === CircuitState.CLOSED;
    }
    trip() {
        this.setState(CircuitState.OPEN);
        this.nextRetry = new Date(Date.now() + this.config.recoveryTimeout);
        logger_js_1.logger.info('Circuit breaker manually tripped', { name: this.name });
    }
    manualReset() {
        this.setState(CircuitState.CLOSED);
        this.reset();
        logger_js_1.logger.info('Circuit breaker manually reset', { name: this.name });
    }
}
exports.CircuitBreaker = CircuitBreaker;
class CircuitBreakerFactory {
    static forExternalService(serviceName, customConfig) {
        if (this.breakers.has(serviceName)) {
            return this.breakers.get(serviceName);
        }
        const config = {
            failureThreshold: 5,
            recoveryTimeout: 60000,
            monitoringWindow: 300000,
            successThreshold: 3,
            timeout: 30000,
            name: serviceName,
            ...customConfig,
        };
        const breaker = new CircuitBreaker(config);
        this.breakers.set(serviceName, breaker);
        logger_js_1.logger.info('Circuit breaker created for external service', {
            serviceName,
            config,
        });
        return breaker;
    }
    static forCache(cacheName = 'redis') {
        const name = `cache_${cacheName}`;
        if (this.breakers.has(name)) {
            return this.breakers.get(name);
        }
        const config = {
            failureThreshold: 3,
            recoveryTimeout: 30000,
            monitoringWindow: 120000,
            successThreshold: 2,
            timeout: 5000,
            name,
        };
        const breaker = new CircuitBreaker(config);
        this.breakers.set(name, breaker);
        logger_js_1.logger.info('Circuit breaker created for cache', { cacheName, config });
        return breaker;
    }
    static forDatabase(dbName) {
        const name = `db_${dbName}`;
        if (this.breakers.has(name)) {
            return this.breakers.get(name);
        }
        const config = {
            failureThreshold: 3,
            recoveryTimeout: 60000,
            monitoringWindow: 300000,
            successThreshold: 2,
            timeout: 10000,
            name,
        };
        const breaker = new CircuitBreaker(config);
        this.breakers.set(name, breaker);
        logger_js_1.logger.info('Circuit breaker created for database', { dbName, config });
        return breaker;
    }
    static getAllBreakers() {
        return Array.from(this.breakers.values());
    }
    static getBreaker(name) {
        return this.breakers.get(name);
    }
    static getHealthStatus() {
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
    static resetAll() {
        this.breakers.forEach(breaker => breaker.manualReset());
        logger_js_1.logger.info('All circuit breakers reset');
    }
    static clearAll() {
        this.breakers.clear();
        logger_js_1.logger.info('All circuit breakers cleared from factory');
    }
}
exports.CircuitBreakerFactory = CircuitBreakerFactory;
CircuitBreakerFactory.breakers = new Map();
function withCircuitBreaker(fn, circuitBreaker) {
    return async (...args) => {
        return circuitBreaker.execute(() => fn(...args));
    };
}
