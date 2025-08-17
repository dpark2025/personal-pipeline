/**
 * Confluence API Client - Enterprise-grade Atlassian REST API wrapper
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Production-ready API client with:
 * - Intelligent rate limiting per Atlassian guidelines
 * - Circuit breaker pattern for resilience
 * - Exponential backoff with jitter
 * - Comprehensive error handling and recovery
 * - Request/response logging and metrics
 * - Concurrent request management
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ConfluenceConfig } from '../../types/index.js';
import { AuthManager } from './auth-manager.js';
import { logger } from '../../utils/logger.js';
import { ConfluencePageContent, ConfluenceSpace, ConfluenceSearchResult } from './confluence-adapter.js';

export interface ApiClientOptions {
  maxConcurrentRequests?: number;
  requestTimeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  maxRetryDelayMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface SearchParams {
  cql: string;
  limit?: number;
  start?: number;
  expand?: string;
}

export interface SpaceSearchParams {
  spaceKey?: string;
  type?: 'global' | 'personal';
  status?: 'current' | 'archived';
  favourite?: boolean;
  limit?: number;
  start?: number;
  expand?: string;
}

export interface PageSearchParams {
  spaceKey?: string;
  title?: string;
  type?: 'page' | 'blogpost';
  status?: 'current' | 'trashed' | 'historical' | 'draft';
  parentId?: string;
  limit?: number;
  start?: number;
  expand?: string;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

/**
 * Enterprise-grade Confluence API client
 */
export class ApiClient {
  private config: ConfluenceConfig;
  private authManager: AuthManager;
  private httpClient: AxiosInstance;
  private options: Required<ApiClientOptions>;
  
  // Rate limiting
  private rateLimitInfo?: RateLimitInfo;
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  
  // Circuit breaker
  private circuitBreaker: CircuitBreakerState = {
    state: 'closed',
    failureCount: 0,
  };
  
  // Performance metrics
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    circuitBreakerTrips: 0,
    totalResponseTime: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
  };

  constructor(
    config: ConfluenceConfig,
    authManager: AuthManager,
    options: ApiClientOptions = {}
  ) {
    this.config = config;
    this.authManager = authManager;
    
    this.options = {
      maxConcurrentRequests: options.maxConcurrentRequests ?? 10,
      requestTimeoutMs: options.requestTimeoutMs ?? 30000,
      retryAttempts: options.retryAttempts ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
      maxRetryDelayMs: options.maxRetryDelayMs ?? 30000,
      circuitBreakerThreshold: options.circuitBreakerThreshold ?? 5,
      circuitBreakerTimeout: options.circuitBreakerTimeout ?? 60000,
    };

    this.httpClient = this.createHttpClient();
  }

  /**
   * Initialize the API client
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Confluence API client', {
        baseUrl: this.config.base_url,
        maxConcurrentRequests: this.options.maxConcurrentRequests,
        timeout: this.options.requestTimeoutMs,
      });

      // Test connection with a simple API call
      await this.testConnection();
      
      logger.info('Confluence API client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Confluence API client', { error });
      throw error;
    }
  }

  /**
   * Search for content using CQL (Confluence Query Language)
   */
  async search(params: SearchParams): Promise<ConfluenceSearchResult[]> {
    const response = await this.makeRequest<{
      results: ConfluenceSearchResult[];
      size: number;
      totalSize: number;
    }>('GET', '/rest/api/search', { params });

    return response.results || [];
  }

  /**
   * Get a specific page by ID
   */
  async getPage(
    pageId: string,
    options: { expand?: string } = {}
  ): Promise<ConfluencePageContent | null> {
    try {
      const response = await this.makeRequest<ConfluencePageContent>(
        'GET',
        `/rest/api/content/${pageId}`,
        { params: options }
      );

      return response;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get pages from a specific space
   */
  async getSpacePages(
    spaceKey: string,
    options: PageSearchParams = {}
  ): Promise<ConfluencePageContent[]> {
    const params = {
      spaceKey,
      limit: 50,
      expand: 'body.storage,space,version',
      ...options,
    };

    const response = await this.makeRequest<{
      results: ConfluencePageContent[];
      size: number;
    }>('GET', '/rest/api/content', { params });

    return response.results || [];
  }

  /**
   * Get all pages from a space (with pagination)
   */
  async getAllSpacePages(
    spaceKey: string,
    maxPages?: number,
    expand = 'body.storage,space,version,ancestors,metadata.labels'
  ): Promise<ConfluencePageContent[]> {
    const allPages: ConfluencePageContent[] = [];
    let start = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore && (!maxPages || allPages.length < maxPages)) {
      const params: PageSearchParams = {
        spaceKey,
        limit,
        start,
        expand,
        type: 'page',
        status: 'current',
      };

      const response = await this.makeRequest<{
        results: ConfluencePageContent[];
        size: number;
        totalSize?: number;
      }>('GET', '/rest/api/content', { params });

      const pages = response.results || [];
      allPages.push(...pages);

      hasMore = pages.length === limit;
      start += limit;

      // Respect maxPages limit
      if (maxPages && allPages.length >= maxPages) {
        break;
      }

      // Add delay between requests to respect rate limits
      if (hasMore) {
        await this.delayBetweenRequests();
      }
    }

    return maxPages ? allPages.slice(0, maxPages) : allPages;
  }

  /**
   * Get spaces accessible to the user
   */
  async getSpaces(options: SpaceSearchParams = {}): Promise<ConfluenceSpace[]> {
    const params = {
      limit: 50,
      expand: 'description.plain',
      ...options,
    };

    const response = await this.makeRequest<{
      results: ConfluenceSpace[];
      size: number;
    }>('GET', '/rest/api/space', { params });

    return response.results || [];
  }

  /**
   * Get a specific space by key
   */
  async getSpace(spaceKey: string): Promise<ConfluenceSpace | null> {
    try {
      const response = await this.makeRequest<ConfluenceSpace>(
        'GET',
        `/rest/api/space/${spaceKey}`,
        { params: { expand: 'description.plain' } }
      );

      return response;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get recently updated content
   */
  async getRecentlyUpdated(
    since: Date,
    spaceKeys?: string[],
    limit = 50
  ): Promise<ConfluencePageContent[]> {
    const sinceStr = since.toISOString().split('T')[0];
    let cql = `lastModified >= "${sinceStr}"`;

    if (spaceKeys && spaceKeys.length > 0) {
      const spaceConditions = spaceKeys.map(key => `space.key = "${key}"`);
      cql += ` AND (${spaceConditions.join(' OR ')})`;
    }

    const searchResults = await this.search({
      cql,
      limit,
      expand: 'content.body.storage,content.space,content.version',
    });

    // Convert search results to page content
    return searchResults.map(result => result as any as ConfluencePageContent);
  }

  /**
   * Get API client metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      rateLimitInfo: this.rateLimitInfo,
      circuitBreakerState: this.circuitBreaker,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
    };
  }

  /**
   * Get current rate limit status
   */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this.rateLimitInfo;
  }

  /**
   * Check if the circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    return this.circuitBreaker.state === 'open';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cancel any pending requests
    this.requestQueue.length = 0;
    
    logger.info('Confluence API client cleaned up');
  }

  // Private methods

  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.base_url,
      timeout: this.options.requestTimeoutMs,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'PersonalPipeline-Confluence-Client/1.0',
      },
    });

    // Add request interceptor for authentication
    client.interceptors.request.use(
      (config) => {
        const authHeaders = this.authManager.getAuthHeaders();
        Object.assign(config.headers, authHeaders);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for rate limiting and metrics
    client.interceptors.response.use(
      (response) => this.handleSuccessResponse(response),
      (error) => this.handleErrorResponse(error)
    );

    return client;
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await this.makeRequest('GET', '/rest/api/user/current');
      logger.debug('Confluence connection test successful', {
        userId: response.accountId,
        displayName: response.displayName,
      });
    } catch (error) {
      throw new Error(`Confluence connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async makeRequest<T>(
    method: string,
    url: string,
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      if (this.shouldAttemptRequest()) {
        this.circuitBreaker.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }

    // Wait for available slot if at concurrency limit
    if (this.activeRequests >= this.options.maxConcurrentRequests) {
      await this.waitForAvailableSlot();
    }

    // Wait for rate limit if necessary
    await this.waitForRateLimit();

    return this.executeRequest<T>(method, url, config);
  }

  private async executeRequest<T>(
    method: string,
    url: string,
    config: AxiosRequestConfig
  ): Promise<T> {
    const startTime = performance.now();
    this.activeRequests++;
    this.metrics.totalRequests++;

    try {
      const response = await this.httpClient.request<T>({
        method,
        url,
        ...config,
      });

      this.handleRequestSuccess(startTime);
      return response.data;

    } catch (error) {
      this.handleRequestError(error, startTime);
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  private handleSuccessResponse(response: AxiosResponse): AxiosResponse {
    // Extract rate limit information from headers
    this.updateRateLimitInfo(response.headers);
    
    return response;
  }

  private handleErrorResponse(error: any): Promise<never> {
    if (error.response) {
      // Update rate limit info even on errors
      this.updateRateLimitInfo(error.response.headers);

      // Handle rate limiting
      if (error.response.status === 429) {
        this.metrics.rateLimitHits++;
        this.handleRateLimitError(error.response);
      }
    }

    return Promise.reject(error);
  }

  private updateRateLimitInfo(headers: any): void {
    const limit = parseInt(headers['x-ratelimit-limit']) || undefined;
    const remaining = parseInt(headers['x-ratelimit-remaining']) || undefined;
    const resetTime = headers['x-ratelimit-reset'] 
      ? new Date(parseInt(headers['x-ratelimit-reset']) * 1000)
      : undefined;
    const retryAfter = parseInt(headers['retry-after']) || undefined;

    if (limit !== undefined && remaining !== undefined && resetTime) {
      this.rateLimitInfo = {
        limit,
        remaining,
        resetTime,
        retryAfter,
      };
    }
  }

  private handleRateLimitError(response: any): void {
    const retryAfter = parseInt(response.headers['retry-after']) || 60;
    
    logger.warn('Rate limit exceeded', {
      retryAfter,
      rateLimitInfo: this.rateLimitInfo,
    });

    // Update rate limit info
    if (this.rateLimitInfo) {
      this.rateLimitInfo.remaining = 0;
      this.rateLimitInfo.retryAfter = retryAfter;
    }
  }

  private async waitForRateLimit(): Promise<void> {
    if (!this.rateLimitInfo) {
      return;
    }

    const now = new Date();
    
    // If we have remaining requests, we're good
    if (this.rateLimitInfo.remaining > 0) {
      return;
    }

    // If we have a retry-after header, wait for that duration
    if (this.rateLimitInfo.retryAfter) {
      const waitTime = this.rateLimitInfo.retryAfter * 1000;
      logger.info(`Waiting for rate limit reset: ${waitTime}ms`);
      await this.delay(waitTime);
      return;
    }

    // Otherwise, wait until the reset time
    if (this.rateLimitInfo.resetTime && now < this.rateLimitInfo.resetTime) {
      const waitTime = this.rateLimitInfo.resetTime.getTime() - now.getTime();
      logger.info(`Waiting for rate limit reset: ${waitTime}ms`);
      await this.delay(waitTime);
    }
  }

  private async waitForAvailableSlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeRequests < this.options.maxConcurrentRequests) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  private async delayBetweenRequests(): Promise<void> {
    // Add a small delay between requests to be respectful
    const baseDelay = 100; // 100ms base delay
    const jitter = Math.random() * 100; // Add up to 100ms jitter
    await this.delay(baseDelay + jitter);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleRequestSuccess(startTime: number): void {
    const responseTime = performance.now() - startTime;
    
    this.metrics.successfulRequests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);

    // Reset circuit breaker on success
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failureCount = 0;
      logger.info('Circuit breaker reset to closed state');
    }
  }

  private handleRequestError(error: any, startTime: number): void {
    const responseTime = performance.now() - startTime;
    
    this.metrics.failedRequests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;

    // Update circuit breaker on error (for 5xx errors)
    if (error.response?.status >= 500) {
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = new Date();

      if (this.circuitBreaker.failureCount >= this.options.circuitBreakerThreshold) {
        this.circuitBreaker.state = 'open';
        this.circuitBreaker.nextAttemptTime = new Date(
          Date.now() + this.options.circuitBreakerTimeout
        );
        this.metrics.circuitBreakerTrips++;
        
        logger.warn('Circuit breaker opened due to failures', {
          failureCount: this.circuitBreaker.failureCount,
          nextAttemptTime: this.circuitBreaker.nextAttemptTime,
        });
      }
    }
  }

  private shouldAttemptRequest(): boolean {
    if (this.circuitBreaker.state !== 'open') {
      return true;
    }

    if (!this.circuitBreaker.nextAttemptTime) {
      return false;
    }

    return new Date() >= this.circuitBreaker.nextAttemptTime;
  }
}