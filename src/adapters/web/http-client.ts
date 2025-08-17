/**
 * HTTP Client - Enterprise HTTP client with circuit breaker and rate limiting
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Features:
 * - Circuit breaker pattern for resilience
 * - Intelligent rate limiting with burst allowance
 * - Retry logic with exponential backoff
 * - Request/response interceptors
 * - Concurrent request management
 * - Performance monitoring and metrics
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Logger } from 'winston';
import { AuthManager } from './auth-manager.js';
import { WebSource, WebEndpoint } from './web-adapter.js';

export interface HttpClientOptions {
  timeout: number;
  retryAttempts: number;
  maxConcurrentRequests: number;
  userAgent: string;
  validateSSL: boolean;
  followRedirects: boolean;
}

export interface HttpRequest {
  method: string;
  url: string;
  query?: string;
  endpoint: WebEndpoint;
  source: WebSource;
  headers?: Record<string, string>;
  data?: any;
}

export interface HttpResponse {
  data: any;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
  contentType: string;
  contentLength: number;
  responseTime: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttempt: number;
}

export interface RateLimitState {
  requests: number;
  windowStart: number;
  burstUsed: number;
}

/**
 * Enterprise HTTP client with resilience patterns
 */
export class HttpClient {
  private axiosInstance: AxiosInstance;
  private logger: Logger;
  private authManager: AuthManager;
  private options: HttpClientOptions;
  
  // Circuit Breaker Management
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 60000; // 1 minute
  private readonly halfOpenMaxCalls = 3;
  
  // Rate Limiting Management
  private rateLimits = new Map<string, RateLimitState>();
  private readonly windowDuration = 60000; // 1 minute
  
  // Concurrent Request Management
  private activeRequests = 0;
  private requestQueue: Array<{
    resolve: (value: HttpResponse) => void;
    reject: (reason: any) => void;
    request: () => Promise<HttpResponse>;
  }> = [];
  
  // Performance Metrics
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    circuitBreakerTrips: 0,
    rateLimitHits: 0,
    avgResponseTime: 0,
    concurrentPeak: 0
  };

  constructor(options: HttpClientOptions, authManager: AuthManager, logger: Logger) {
    this.options = options;
    this.authManager = authManager;
    this.logger = logger.child({ component: 'HttpClient' });
    
    this.axiosInstance = this.createAxiosInstance();
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing HTTP client', {
      timeout: this.options.timeout,
      maxConcurrent: this.options.maxConcurrentRequests,
      retryAttempts: this.options.retryAttempts
    });
    
    // Test basic connectivity
    try {
      await this.axiosInstance.get('https://httpbin.org/status/200', { timeout: 5000 });
      this.logger.debug('HTTP client connectivity test passed');
    } catch (error) {
      this.logger.warn('HTTP client connectivity test failed', { error: error.message });
    }
  }

  async request(request: HttpRequest): Promise<HttpResponse> {
    const startTime = Date.now();
    const sourceKey = `${request.source.name}:${request.endpoint.name}`;
    
    // Check circuit breaker
    if (!this.isCircuitBreakerClosed(sourceKey)) {
      throw new Error(`Circuit breaker is open for ${sourceKey}`);
    }
    
    // Check rate limiting
    await this.checkRateLimit(request.source, request.endpoint);
    
    // Handle concurrent request limiting
    if (this.activeRequests >= this.options.maxConcurrentRequests) {
      return this.queueRequest(request);
    }
    
    this.activeRequests++;
    this.updateConcurrentPeak();
    
    try {
      const response = await this.executeRequest(request);
      
      // Record success
      this.recordSuccess(sourceKey);
      this.updateMetrics(true, Date.now() - startTime);
      
      return response;
    } catch (error: any) {
      // Record failure
      this.recordFailure(sourceKey);
      this.updateMetrics(false, Date.now() - startTime);
      
      throw error;
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  async healthCheck(url: string, timeout: number): Promise<{ status: number; responseTime: number }> {
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
    } catch (error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          responseTime: Date.now() - startTime
        };
      }
      throw error;
    }
  }

  getMetrics(): Record<string, any> {
    return {
      ...this.metrics,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      circuitBreakerStates: Object.fromEntries(this.circuitBreakers),
      rateLimitStates: Object.fromEntries(this.rateLimits)
    };
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up HTTP client');
    
    // Clear queued requests
    this.requestQueue.forEach(({ reject }) => {
      reject(new Error('HTTP client shutting down'));
    });
    this.requestQueue = [];
    
    // Reset circuit breakers
    this.circuitBreakers.clear();
    this.rateLimits.clear();
    
    this.logger.info('HTTP client cleanup completed');
  }

  // ============================
  // Private Implementation
  // ============================

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      timeout: this.options.timeout,
      maxRedirects: this.options.followRedirects ? 5 : 0,
      validateStatus: () => true, // Don't throw on HTTP errors
      headers: {
        'User-Agent': this.options.userAgent
      }
    });

    // Request interceptor
    instance.interceptors.request.use(
      (config) => {
        this.logger.debug('HTTP request starting', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: this.sanitizeHeaders(config.headers || {})
        });
        return config;
      },
      (error) => {
        this.logger.error('HTTP request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    instance.interceptors.response.use(
      (response) => {
        this.logger.debug('HTTP response received', {
          status: response.status,
          url: response.config.url,
          contentType: response.headers['content-type'],
          size: this.getResponseSize(response)
        });
        return response;
      },
      (error) => {
        this.logger.error('HTTP response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );

    return instance;
  }

  private async executeRequest(request: HttpRequest): Promise<HttpResponse> {
    const config = await this.buildRequestConfig(request);
    const startTime = Date.now();
    
    // Implement retry logic
    let lastError: Error;
    const maxRetries = request.endpoint.retry_attempts ?? this.options.retryAttempts;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.request(config);
        
        return {
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
          url: response.config.url || request.url,
          contentType: response.headers['content-type'] || 'unknown',
          contentLength: this.getContentLength(response),
          responseTime: Date.now() - startTime
        };
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on authentication errors or client errors
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          break;
        }
        
        // Wait before retry (exponential backoff with jitter)
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

  private async buildRequestConfig(request: HttpRequest): Promise<AxiosRequestConfig> {
    const config: AxiosRequestConfig = {
      method: request.method as any,
      url: request.url,
      timeout: request.endpoint.timeout_ms || this.options.timeout,
      headers: {
        ...request.headers,
        ...request.endpoint.headers
      }
    };

    // Add authentication
    const authHeaders = await this.authManager.getAuthHeaders(request.source.auth_override);
    Object.assign(config.headers, authHeaders);

    // Add query parameters
    if (request.endpoint.query_params) {
      config.params = { ...config.params, ...request.endpoint.query_params };
    }

    // Add search query
    if (request.query && request.method === 'GET') {
      config.params = { 
        ...config.params, 
        q: request.query, 
        query: request.query, 
        search: request.query 
      };
    }

    // Add request body for non-GET requests
    if (request.method !== 'GET' && request.endpoint.body_template) {
      let body = request.endpoint.body_template;
      if (request.query) {
        body = body.replace('${query}', request.query);
      }
      config.data = body;
      config.headers!['Content-Type'] = 'application/json';
    }

    return config;
  }

  private async queueRequest(request: HttpRequest): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resolve,
        reject,
        request: () => this.request(request)
      });
    });
  }

  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests < this.options.maxConcurrentRequests) {
      const { resolve, reject, request } = this.requestQueue.shift()!;
      
      request()
        .then(resolve)
        .catch(reject);
    }
  }

  private isCircuitBreakerClosed(sourceKey: string): boolean {
    const breaker = this.circuitBreakers.get(sourceKey);
    
    if (!breaker) {
      return true; // No breaker = closed
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

  private recordSuccess(sourceKey: string): void {
    const breaker = this.circuitBreakers.get(sourceKey);
    
    if (breaker) {
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failures = 0;
        this.logger.info('Circuit breaker closed after successful recovery', { sourceKey });
      }
    }
  }

  private recordFailure(sourceKey: string): void {
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

  private async checkRateLimit(source: WebSource, endpoint: WebEndpoint): Promise<void> {
    const sourceKey = `${source.name}:${endpoint.name}`;
    const limit = endpoint.rate_limit || source.performance_override?.default_retry_attempts || 60;
    const burstAllowance = Math.ceil(limit * 0.2); // 20% burst
    
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
    
    // Reset window if expired
    if (now - state.windowStart >= this.windowDuration) {
      state.requests = 0;
      state.windowStart = now;
      state.burstUsed = 0;
    }
    
    // Check if rate limit exceeded
    if (state.requests >= limit) {
      // Check if burst is available
      if (state.burstUsed < burstAllowance) {
        state.burstUsed++;
        this.logger.debug('Using burst allowance for rate limit', {
          sourceKey,
          burstUsed: state.burstUsed,
          burstAllowance
        });
      } else {
        // Calculate wait time
        const waitTime = this.windowDuration - (now - state.windowStart);
        this.metrics.rateLimitHits++;
        
        this.logger.info('Rate limit exceeded, waiting', {
          sourceKey,
          waitTime,
          requests: state.requests,
          limit
        });
        
        await this.sleep(waitTime);
        
        // Reset after waiting
        state.requests = 0;
        state.windowStart = Date.now();
        state.burstUsed = 0;
      }
    }
    
    state.requests++;
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    // Update rolling average response time
    const totalRequests = this.metrics.totalRequests;
    this.metrics.avgResponseTime = 
      ((this.metrics.avgResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  private updateConcurrentPeak(): void {
    if (this.activeRequests > this.metrics.concurrentPeak) {
      this.metrics.concurrentPeak = this.activeRequests;
    }
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase().includes('authorization') || 
          key.toLowerCase().includes('key') || 
          key.toLowerCase().includes('token')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }

  private getResponseSize(response: AxiosResponse): string {
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      const bytes = parseInt(contentLength);
      return bytes > 1024 ? `${Math.round(bytes / 1024)}KB` : `${bytes}B`;
    }
    return 'unknown';
  }

  private getContentLength(response: AxiosResponse): number {
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      return parseInt(contentLength);
    }
    
    // Estimate from data size
    if (typeof response.data === 'string') {
      return response.data.length;
    } else if (response.data) {
      return JSON.stringify(response.data).length;
    }
    
    return 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}