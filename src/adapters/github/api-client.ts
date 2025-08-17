/**
 * GitHub API Client - Enterprise REST/GraphQL API wrapper
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Comprehensive GitHub API client supporting:
 * - REST API v4 and GraphQL API v4
 * - Intelligent rate limiting and backoff
 * - Circuit breaker patterns for resilience
 * - Concurrent request management
 * - Repository and organization-level operations
 * - Search API optimization
 * - Enterprise Server compatibility
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { GitHubConfig } from '../../types/index.js';
import { AuthManager } from './auth-manager.js';
import { logger } from '../../utils/logger.js';

export interface ApiClientOptions {
  maxConcurrentRequests?: number;
  requestTimeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  enableCircuitBreaker?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  resource: string;
}

export interface SearchParams {
  q: string;
  sort?: 'indexed' | 'created' | 'updated';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface RepositorySearchParams extends SearchParams {
  type?: 'all' | 'owner' | 'member';
}

export interface CodeSearchParams extends SearchParams {
  in?: 'file' | 'path' | 'file,path';
  language?: string;
  size?: string;
  filename?: string;
  extension?: string;
  repo?: string;
  user?: string;
  org?: string;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    type: 'User' | 'Organization';
  };
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  language?: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  has_wiki: boolean;
  has_pages: boolean;
  archived: boolean;
  disabled: boolean;
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url?: string;
  type: 'file' | 'dir';
  content?: string; // base64 encoded for files
  encoding?: 'base64';
  target?: string; // for symlinks
  submodule_git_url?: string; // for submodules
}

export interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: any[];
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  labels: Array<{
    name: string;
    color: string;
    description?: string;
  }>;
  assignees: Array<{
    login: string;
    id: number;
  }>;
  milestone?: {
    title: string;
    description?: string;
    state: 'open' | 'closed';
  };
  created_at: string;
  updated_at: string;
  closed_at?: string;
  html_url: string;
}

/**
 * Enterprise GitHub API client with resilience patterns
 */
export class ApiClient {
  private config: GitHubConfig;
  private authManager: AuthManager;
  private httpClient: AxiosInstance;
  private graphqlClient: AxiosInstance;
  private options: Required<ApiClientOptions>;
  
  // Circuit breaker and rate limiting
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
  };
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  
  // Performance metrics
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitHits: 0,
    circuitBreakerTrips: 0,
    avgResponseTime: 0,
    totalResponseTime: 0,
  };

  constructor(config: GitHubConfig, authManager: AuthManager, options: ApiClientOptions = {}) {
    this.config = config;
    this.authManager = authManager;
    
    this.options = {
      maxConcurrentRequests: options.maxConcurrentRequests ?? 10,
      requestTimeoutMs: options.requestTimeoutMs ?? 30000,
      retryAttempts: options.retryAttempts ?? 3,
      retryDelayMs: options.retryDelayMs ?? 1000,
      enableCircuitBreaker: options.enableCircuitBreaker ?? true,
    };

    // Initialize HTTP clients
    this.httpClient = this.createHttpClient();
    this.graphqlClient = this.createGraphQLClient();

    // Setup interceptors and middleware
    this.setupInterceptors();
  }

  /**
   * Initialize the API client
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing GitHub API client', {
        apiUrl: this.config.api_url || 'https://api.github.com',
        graphqlUrl: this.config.graphql_url || 'https://api.github.com/graphql',
        maxConcurrent: this.options.maxConcurrentRequests,
      });

      // Test API connectivity
      await this.testConnection();
      
      logger.info('GitHub API client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize GitHub API client', { error });
      throw new Error(`GitHub API client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return await this.makeRequest('GET', `/repos/${owner}/${repo}`);
  }

  /**
   * List repositories for an organization or user
   */
  async getRepositories(ownerOrOrg: string, options: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepository[]> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    // Determine if this is a user or organization
    const userOrOrg = await this.isOrganization(ownerOrOrg) ? 'orgs' : 'users';
    const url = `/${userOrOrg}/${ownerOrOrg}/repos?${params.toString()}`;
    
    return await this.makeRequest('GET', url);
  }

  /**
   * Get file content from repository
   */
  async getContent(owner: string, repo: string, path: string, ref?: string): Promise<GitHubContent | GitHubContent[]> {
    const params = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    return await this.makeRequest('GET', `/repos/${owner}/${repo}/contents/${path}${params}`);
  }

  /**
   * Get repository README
   */
  async getReadme(owner: string, repo: string, ref?: string): Promise<GitHubContent> {
    const params = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    return await this.makeRequest('GET', `/repos/${owner}/${repo}/readme${params}`);
  }

  /**
   * Search repositories
   */
  async searchRepositories(params: RepositorySearchParams): Promise<GitHubSearchResult> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return await this.makeRequest('GET', `/search/repositories?${searchParams.toString()}`);
  }

  /**
   * Search code within repositories
   */
  async searchCode(params: CodeSearchParams): Promise<GitHubSearchResult> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return await this.makeRequest('GET', `/search/code?${searchParams.toString()}`);
  }

  /**
   * Search issues and pull requests
   */
  async searchIssues(params: SearchParams): Promise<GitHubSearchResult> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return await this.makeRequest('GET', `/search/issues?${searchParams.toString()}`);
  }

  /**
   * Get repository issues
   */
  async getIssues(owner: string, repo: string, options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    since?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubIssue[]> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const url = `/repos/${owner}/${repo}/issues?${params.toString()}`;
    return await this.makeRequest('GET', url);
  }

  /**
   * Execute GraphQL query
   */
  async graphqlQuery(query: string, variables?: Record<string, any>): Promise<any> {
    const startTime = performance.now();
    
    try {
      if (this.circuitBreaker.isOpen && this.options.enableCircuitBreaker) {
        throw new Error('Circuit breaker is open');
      }

      const response = await this.graphqlClient.post('', {
        query,
        variables,
      });

      this.updateMetrics(true, performance.now() - startTime);
      this.resetCircuitBreaker();

      return response.data;

    } catch (error) {
      this.updateMetrics(false, performance.now() - startTime);
      this.handleRequestError(error);
      throw error;
    }
  }

  /**
   * Create a webhook for repository events
   */
  async createWebhook(owner: string, repo: string, config: {
    url: string;
    content_type: 'json' | 'form';
    secret?: string;
    insecure_ssl?: '0' | '1';
  }, events: string[] = ['push', 'pull_request', 'issues']): Promise<any> {
    return await this.makeRequest('POST', `/repos/${owner}/${repo}/hooks`, {
      name: 'web',
      active: true,
      events,
      config,
    });
  }

  /**
   * List repository webhooks
   */
  async getWebhooks(owner: string, repo: string): Promise<any[]> {
    return await this.makeRequest('GET', `/repos/${owner}/${repo}/hooks`);
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.makeRequest('DELETE', `/repos/${owner}/${repo}/hooks/${hookId}`);
  }

  /**
   * Get current rate limit status
   */
  async getRateLimit(): Promise<{
    resources: Record<string, RateLimitInfo>;
  }> {
    return await this.makeRequest('GET', '/rate_limit');
  }

  /**
   * Get API client metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      avgResponseTime: this.metrics.totalRequests > 0 
        ? this.metrics.totalResponseTime / this.metrics.totalRequests 
        : 0,
      successRate: this.metrics.totalRequests > 0
        ? this.metrics.successfulRequests / this.metrics.totalRequests
        : 1,
      circuitBreakerState: { ...this.circuitBreaker },
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      rateLimits: Object.fromEntries(this.rateLimits),
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cancel any pending requests
    this.requestQueue.length = 0;
    
    logger.info('GitHub API client cleaned up');
  }

  // Private methods

  private createHttpClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.api_url || 'https://api.github.com',
      timeout: this.options.requestTimeoutMs,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PersonalPipeline-GitHub-Adapter/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }

  private createGraphQLClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.graphql_url || 'https://api.github.com/graphql',
      timeout: this.options.requestTimeoutMs,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'PersonalPipeline-GitHub-Adapter/1.0',
      },
    });
  }

  private setupInterceptors(): void {
    // HTTP client interceptors
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Add authentication headers
        const authHeaders = this.authManager.getAuthHeaders();
        Object.assign(config.headers, authHeaders);
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response.headers);
        return response;
      },
      (error) => {
        this.handleRateLimitError(error);
        return Promise.reject(error);
      }
    );

    // GraphQL client interceptors
    this.graphqlClient.interceptors.request.use(
      async (config) => {
        const authHeaders = this.authManager.getAuthHeaders();
        Object.assign(config.headers, authHeaders);
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.graphqlClient.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response.headers);
        return response;
      },
      (error) => {
        this.handleRateLimitError(error);
        return Promise.reject(error);
      }
    );
  }

  private async makeRequest(method: string, url: string, data?: any): Promise<any> {
    const startTime = performance.now();
    
    try {
      if (this.circuitBreaker.isOpen && this.options.enableCircuitBreaker) {
        if (this.circuitBreaker.nextRetryTime && new Date() < this.circuitBreaker.nextRetryTime) {
          throw new Error('Circuit breaker is open');
        } else {
          // Try to close circuit breaker
          this.circuitBreaker.isOpen = false;
        }
      }

      // Wait for available slot if at concurrent limit
      await this.waitForAvailableSlot();
      
      this.activeRequests++;
      this.metrics.totalRequests++;

      const config: AxiosRequestConfig = { method: method.toLowerCase() as any, url };
      if (data) {
        config.data = data;
      }

      const response = await this.httpClient.request(config);
      
      this.updateMetrics(true, performance.now() - startTime);
      this.resetCircuitBreaker();

      return response.data;

    } catch (error) {
      this.updateMetrics(false, performance.now() - startTime);
      this.handleRequestError(error);
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  private async waitForAvailableSlot(): Promise<void> {
    if (this.activeRequests < this.options.maxConcurrentRequests) {
      return;
    }

    return new Promise((resolve) => {
      this.requestQueue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.requestQueue.length > 0 && this.activeRequests < this.options.maxConcurrentRequests) {
      const resolve = this.requestQueue.shift();
      if (resolve) {
        resolve();
      }
    }
  }

  private async testConnection(): Promise<void> {
    try {
      await this.makeRequest('GET', '/user');
    } catch (error) {
      throw new Error(`GitHub API connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async isOrganization(name: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', `/orgs/${name}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  private updateRateLimitInfo(headers: any): void {
    const resources = ['core', 'search', 'graphql'];
    
    resources.forEach(resource => {
      const limitHeader = headers[`x-ratelimit-limit`];
      const remainingHeader = headers[`x-ratelimit-remaining`];
      const resetHeader = headers[`x-ratelimit-reset`];
      
      if (limitHeader && remainingHeader && resetHeader) {
        this.rateLimits.set(resource, {
          limit: parseInt(limitHeader),
          remaining: parseInt(remainingHeader),
          reset: new Date(parseInt(resetHeader) * 1000),
          resource,
        });
      }
    });
  }

  private handleRateLimitError(error: any): void {
    if (error.response?.status === 403) {
      const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
      if (rateLimitRemaining === '0') {
        this.metrics.rateLimitHits++;
        const resetTime = new Date(parseInt(error.response.headers['x-ratelimit-reset']) * 1000);
        
        logger.warn('GitHub API rate limit exceeded', {
          resetTime,
          resource: error.response.headers['x-ratelimit-resource'] || 'core',
        });
      }
    }
  }

  private handleRequestError(error: any): void {
    if (this.options.enableCircuitBreaker) {
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = new Date();
      
      // Open circuit breaker after 5 consecutive failures
      if (this.circuitBreaker.failureCount >= 5) {
        this.circuitBreaker.isOpen = true;
        this.circuitBreaker.nextRetryTime = new Date(Date.now() + 60000); // 1 minute
        this.metrics.circuitBreakerTrips++;
        
        logger.warn('GitHub API circuit breaker opened', {
          failureCount: this.circuitBreaker.failureCount,
          nextRetryTime: this.circuitBreaker.nextRetryTime,
        });
      }
    }
  }

  private resetCircuitBreaker(): void {
    if (this.circuitBreaker.failureCount > 0) {
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.lastFailureTime = undefined;
      
      if (this.circuitBreaker.isOpen) {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.nextRetryTime = undefined;
        logger.info('GitHub API circuit breaker closed');
      }
    }
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.metrics.totalResponseTime += responseTime;
  }
}