import { EventEmitter } from 'events';
import { logger } from './logger.js';
export var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open";
})(CircuitState || (CircuitState = {}));
export class CircuitBreaker extends EventEmitter {
    config;
    state = CircuitState.CLOSED;
    failures = 0;
    successes = 0;
    lastFailure = null;
    lastSuccess = null;
    nextRetry = null;
    totalRequests = 0;
    totalFailures = 0;
    totalSuccesses = 0;
    failureWindow = [];
    name;
    constructor(config) {
        super();
        this.config = config;
        this.name = config.name || 'Circuit';
        logger.debug('Circuit breaker initialized', {
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
        logger.debug('Circuit breaker success', {
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
        logger.warn('Circuit breaker failure', {
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
        logger.info('Circuit breaker manually tripped', { name: this.name });
    }
    manualReset() {
        this.setState(CircuitState.CLOSED);
        this.reset();
        logger.info('Circuit breaker manually reset', { name: this.name });
    }
}
export class CircuitBreakerFactory {
    static breakers = new Map();
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
        logger.info('Circuit breaker created for external service', {
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
        logger.info('Circuit breaker created for cache', { cacheName, config });
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
        logger.info('Circuit breaker created for database', { dbName, config });
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
        logger.info('All circuit breakers reset');
    }
    static clearAll() {
        this.breakers.clear();
        logger.info('All circuit breakers cleared from factory');
    }
}
export function withCircuitBreaker(fn, circuitBreaker) {
    return async (...args) => {
        return circuitBreaker.execute(() => fn(...args));
    };
}
//# sourceMappingURL=circuit-breaker.js.map