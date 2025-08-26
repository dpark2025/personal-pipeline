import axios from 'axios';
export class HttpClient {
    axiosInstance;
    logger;
    authManager;
    options;
    circuitBreakers = new Map();
    failureThreshold = 5;
    recoveryTimeout = 60000;
    halfOpenMaxCalls = 3;
    rateLimits = new Map();
    windowDuration = 60000;
    activeRequests = 0;
    requestQueue = [];
    metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        circuitBreakerTrips: 0,
        rateLimitHits: 0,
        avgResponseTime: 0,
        concurrentPeak: 0
    };
    constructor(options, authManager, logger) {
        this.options = options;
        this.authManager = authManager;
        this.logger = logger.child({ component: 'HttpClient' });
        this.axiosInstance = this.createAxiosInstance();
    }
    async initialize() {
        this.logger.info('Initializing HTTP client', {
            timeout: this.options.timeout,
            maxConcurrent: this.options.maxConcurrentRequests,
            retryAttempts: this.options.retryAttempts
        });
        try {
            await this.axiosInstance.get('https://httpbin.org/status/200', { timeout: 5000 });
            this.logger.debug('HTTP client connectivity test passed');
        }
        catch (error) {
            this.logger.warn('HTTP client connectivity test failed', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async request(request) {
        const startTime = Date.now();
        const sourceKey = `${request.source.name}:${request.endpoint.name}`;
        if (!this.isCircuitBreakerClosed(sourceKey)) {
            throw new Error(`Circuit breaker is open for ${sourceKey}`);
        }
        await this.checkRateLimit(request.source, request.endpoint);
        if (this.activeRequests >= this.options.maxConcurrentRequests) {
            return this.queueRequest(request);
        }
        this.activeRequests++;
        this.updateConcurrentPeak();
        try {
            const response = await this.executeRequest(request);
            this.recordSuccess(sourceKey);
            this.updateMetrics(true, Date.now() - startTime);
            return response;
        }
        catch (error) {
            this.recordFailure(sourceKey);
            this.updateMetrics(false, Date.now() - startTime);
            throw error;
        }
        finally {
            this.activeRequests--;
            this.processQueue();
        }
    }
    async healthCheck(url, timeout) {
        const startTime = Date.now();
        try {
            const response = await this.axiosInstance.get(url, {
                timeout,
                headers: { 'User-Agent': this.options.userAgent }
            });
            return {
                status: response.status,
                responseTime: Date.now() - startTime
            };
        }
        catch (error) {
            if (error.response) {
                return {
                    status: error.response.status,
                    responseTime: Date.now() - startTime
                };
            }
            throw error;
        }
    }
    getMetrics() {
        return {
            ...this.metrics,
            activeRequests: this.activeRequests,
            queuedRequests: this.requestQueue.length,
            circuitBreakerStates: Object.fromEntries(this.circuitBreakers),
            rateLimitStates: Object.fromEntries(this.rateLimits)
        };
    }
    async cleanup() {
        this.logger.info('Cleaning up HTTP client');
        this.requestQueue.forEach(({ reject }) => {
            reject(new Error('HTTP client shutting down'));
        });
        this.requestQueue = [];
        this.circuitBreakers.clear();
        this.rateLimits.clear();
        this.logger.info('HTTP client cleanup completed');
    }
    createAxiosInstance() {
        const instance = axios.create({
            timeout: this.options.timeout,
            maxRedirects: this.options.followRedirects ? 5 : 0,
            validateStatus: () => true,
            headers: {
                'User-Agent': this.options.userAgent
            }
        });
        instance.interceptors.request.use((config) => {
            this.logger.debug('HTTP request starting', {
                method: config.method?.toUpperCase(),
                url: config.url,
                headers: this.sanitizeHeaders(config.headers || {})
            });
            return config;
        }, (error) => {
            this.logger.error('HTTP request interceptor error', { error: error.message });
            return Promise.reject(error);
        });
        instance.interceptors.response.use((response) => {
            this.logger.debug('HTTP response received', {
                status: response.status,
                url: response.config.url,
                contentType: response.headers['content-type'],
                size: this.getResponseSize(response)
            });
            return response;
        }, (error) => {
            this.logger.error('HTTP response error', {
                status: error.response?.status,
                url: error.config?.url,
                message: error.message
            });
            return Promise.reject(error);
        });
        return instance;
    }
    async executeRequest(request) {
        const config = await this.buildRequestConfig(request);
        const startTime = Date.now();
        let lastError = new Error('Unknown error');
        const maxRetries = request.endpoint.retry_attempts ?? this.options.retryAttempts;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.axiosInstance.request(config);
                return {
                    data: response.data,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    url: response.config.url || request.url,
                    contentType: response.headers['content-type'] || 'unknown',
                    contentLength: this.getContentLength(response),
                    responseTime: Date.now() - startTime
                };
            }
            catch (error) {
                lastError = error;
                if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
                    break;
                }
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 10000) + Math.random() * 1000;
                    this.logger.debug('Retrying request after delay', {
                        attempt: attempt + 1,
                        maxRetries,
                        delay,
                        error: error.message
                    });
                    await this.sleep(delay);
                }
            }
        }
        throw new Error(`Request failed after ${maxRetries + 1} attempts: ${lastError.message}`);
    }
    async buildRequestConfig(request) {
        const config = {
            method: request.method,
            url: request.url,
            timeout: request.endpoint.timeout_ms || this.options.timeout,
            headers: {
                ...request.headers,
                ...request.endpoint.headers
            }
        };
        const authHeaders = await this.authManager.getAuthHeaders(request.source.auth_override);
        if (authHeaders) {
            config.headers = { ...config.headers, ...authHeaders };
        }
        if (request.endpoint.query_params) {
            config.params = { ...config.params, ...request.endpoint.query_params };
        }
        if (request.query && request.method === 'GET') {
            config.params = {
                ...config.params,
                q: request.query,
                query: request.query,
                search: request.query
            };
        }
        if (request.method !== 'GET' && request.endpoint.body_template) {
            let body = request.endpoint.body_template;
            if (request.query) {
                body = body.replace('${query}', request.query);
            }
            config.data = body;
            config.headers['Content-Type'] = 'application/json';
        }
        return config;
    }
    async queueRequest(request) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                resolve,
                reject,
                request: () => this.request(request)
            });
        });
    }
    processQueue() {
        if (this.requestQueue.length > 0 && this.activeRequests < this.options.maxConcurrentRequests) {
            const { resolve, reject, request } = this.requestQueue.shift();
            request()
                .then(resolve)
                .catch(reject);
        }
    }
    isCircuitBreakerClosed(sourceKey) {
        const breaker = this.circuitBreakers.get(sourceKey);
        if (!breaker) {
            return true;
        }
        const now = Date.now();
        switch (breaker.state) {
            case 'closed':
                return true;
            case 'open':
                if (now >= breaker.nextAttempt) {
                    breaker.state = 'half-open';
                    breaker.failures = 0;
                    this.logger.info('Circuit breaker transitioning to half-open', { sourceKey });
                    return true;
                }
                return false;
            case 'half-open':
                return breaker.failures < this.halfOpenMaxCalls;
            default:
                return true;
        }
    }
    recordSuccess(sourceKey) {
        const breaker = this.circuitBreakers.get(sourceKey);
        if (breaker) {
            if (breaker.state === 'half-open') {
                breaker.state = 'closed';
                breaker.failures = 0;
                this.logger.info('Circuit breaker closed after successful recovery', { sourceKey });
            }
        }
    }
    recordFailure(sourceKey) {
        let breaker = this.circuitBreakers.get(sourceKey);
        if (!breaker) {
            breaker = {
                failures: 0,
                lastFailure: 0,
                state: 'closed',
                nextAttempt: 0
            };
            this.circuitBreakers.set(sourceKey, breaker);
        }
        breaker.failures++;
        breaker.lastFailure = Date.now();
        if (breaker.failures >= this.failureThreshold) {
            breaker.state = 'open';
            breaker.nextAttempt = Date.now() + this.recoveryTimeout;
            this.metrics.circuitBreakerTrips++;
            this.logger.warn('Circuit breaker opened due to failures', {
                sourceKey,
                failures: breaker.failures,
                nextAttempt: new Date(breaker.nextAttempt).toISOString()
            });
        }
    }
    async checkRateLimit(source, endpoint) {
        const sourceKey = `${source.name}:${endpoint.name}`;
        const limit = endpoint.rate_limit || source.performance_override?.default_retry_attempts || 60;
        const burstAllowance = Math.ceil(limit * 0.2);
        let state = this.rateLimits.get(sourceKey);
        const now = Date.now();
        if (!state) {
            state = {
                requests: 0,
                windowStart: now,
                burstUsed: 0
            };
            this.rateLimits.set(sourceKey, state);
        }
        if (now - state.windowStart >= this.windowDuration) {
            state.requests = 0;
            state.windowStart = now;
            state.burstUsed = 0;
        }
        if (state.requests >= limit) {
            if (state.burstUsed < burstAllowance) {
                state.burstUsed++;
                this.logger.debug('Using burst allowance for rate limit', {
                    sourceKey,
                    burstUsed: state.burstUsed,
                    burstAllowance
                });
            }
            else {
                const waitTime = this.windowDuration - (now - state.windowStart);
                this.metrics.rateLimitHits++;
                this.logger.info('Rate limit exceeded, waiting', {
                    sourceKey,
                    waitTime,
                    requests: state.requests,
                    limit
                });
                await this.sleep(waitTime);
                state.requests = 0;
                state.windowStart = Date.now();
                state.burstUsed = 0;
            }
        }
        state.requests++;
    }
    updateMetrics(success, responseTime) {
        this.metrics.totalRequests++;
        if (success) {
            this.metrics.successfulRequests++;
        }
        else {
            this.metrics.failedRequests++;
        }
        const totalRequests = this.metrics.totalRequests;
        this.metrics.avgResponseTime =
            ((this.metrics.avgResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
    }
    updateConcurrentPeak() {
        if (this.activeRequests > this.metrics.concurrentPeak) {
            this.metrics.concurrentPeak = this.activeRequests;
        }
    }
    sanitizeHeaders(headers) {
        const sanitized = {};
        for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase().includes('authorization') ||
                key.toLowerCase().includes('key') ||
                key.toLowerCase().includes('token')) {
                sanitized[key] = '[REDACTED]';
            }
            else {
                sanitized[key] = String(value);
            }
        }
        return sanitized;
    }
    getResponseSize(response) {
        const contentLength = response.headers['content-length'];
        if (contentLength) {
            const bytes = parseInt(contentLength);
            return bytes > 1024 ? `${Math.round(bytes / 1024)}KB` : `${bytes}B`;
        }
        return 'unknown';
    }
    getContentLength(response) {
        const contentLength = response.headers['content-length'];
        if (contentLength) {
            return parseInt(contentLength);
        }
        if (typeof response.data === 'string') {
            return response.data.length;
        }
        else if (response.data) {
            return JSON.stringify(response.data).length;
        }
        return 0;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=http-client.js.map