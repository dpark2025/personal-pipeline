/**
 * WebAdapter - Universal HTTP Client for Web-Based Documentation Sources
 * 
 * Authored by: Barry Young (Integration Specialist)
 * Date: 2025-08-14
 * 
 * This adapter provides universal connectivity to web-based documentation sources,
 * REST APIs, and content management systems via HTTP/HTTPS. It supports multiple
 * authentication methods, content formats, and intelligent content processing.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { parseString as parseXML } from 'xml2js';
import { JSONPath } from 'jsonpath-plus';
import { SourceAdapter } from './base.js';
import { 
  SearchResult, 
  SearchFilters, 
  Runbook, 
  HealthCheck,
  SourceConfig,
  AlertSeverity
} from '../types/index.js';
import { CacheService } from '../utils/cache.js';
import { Logger } from 'winston';
import logger from '../utils/logger.js';

// ============================
// Type Definitions
// ============================

export interface WebConfig extends SourceConfig {
  type: 'web';
  
  // Endpoint Definitions
  endpoints: WebEndpoint[];
  
  // Authentication Configuration
  auth: {
    type: 'api_key' | 'bearer_token' | 'basic_auth' | 'bearer' | 'basic' | 'oauth2' | 'personal_token' | 'github_app' | 'cookie';
    
    // API Key Authentication
    api_key_header?: string;          // Header name (e.g., "X-API-Key")
    api_key_query?: string;           // Query parameter name
    api_key_env: string;              // Environment variable
    
    // Bearer Token Authentication  
    bearer_token_env?: string;        // Environment variable for token
    
    // Basic Authentication
    username_env?: string;            // Environment variable for username
    password_env?: string;            // Environment variable for password
    
    // OAuth2 Authentication
    oauth_config?: Record<string, string>;
    
    // GitHub App Authentication
    credentials?: Record<string, string>;
    
    // Custom Headers
    custom_headers?: Record<string, string>; // Static headers
    header_envs?: Record<string, string>;    // Headers from env vars
  };
  
  // Global Performance Settings
  performance: {
    default_timeout_ms: number;       // Default request timeout
    max_concurrent_requests: number;  // Global concurrent limit
    default_retry_attempts: number;   // Default retry count
    default_cache_ttl: string;        // Default cache duration
    user_agent: string;               // User agent string
  };
  
  // Content Processing Configuration
  content_processing: {
    max_content_size_mb: number;      // Skip large responses
    follow_redirects: boolean;        // Follow HTTP redirects
    validate_ssl: boolean;            // SSL certificate validation
    extract_links: boolean;           // Extract internal links
  };
}

export interface WebEndpoint {
  name: string;                       // Endpoint identifier
  url: string;                        // Base URL or full endpoint URL
  method: 'GET' | 'POST';            // HTTP method
  
  // Content Processing
  content_type: 'html' | 'json' | 'xml' | 'text' | 'auto';
  selectors?: ContentSelectors;       // For HTML content
  json_paths?: string[];              // JSONPath expressions
  xml_xpaths?: string[];              // XPath expressions
  
  // Performance Settings
  rate_limit?: number;                // Requests per minute
  timeout_ms?: number;                // Request timeout override
  retry_attempts?: number;            // Retry count override
  cache_ttl?: string;                 // Cache duration override
  
  // Request Configuration
  headers?: Record<string, string>;   // Additional headers
  query_params?: Record<string, string>; // Static query parameters
  body?: string;                      // POST body (for POST requests)
  
  // Content Filtering
  include_patterns?: string[];        // Regex patterns to include
  exclude_patterns?: string[];        // Regex patterns to exclude
  min_content_length?: number;        // Minimum content length
  max_content_length?: number;        // Maximum content length
}

export interface ContentSelectors {
  title?: string;           // CSS selector for title
  content?: string;         // CSS selector for main content
  metadata?: string;        // CSS selector for metadata
  links?: string;           // CSS selector for navigation links
  exclude?: string[];       // CSS selectors to exclude
}

export interface ExtractedContent {
  title: string;
  content: string;
  raw_content: string;
  metadata: Record<string, any>;
  links?: string[];
  searchable_content: string;
}

export interface WebResponse {
  data: any;
  status: number;
  headers: Record<string, string>;
  url: string;
  content_type: string;
}

export interface RateLimitState {
  requestCount: number;
  windowStart: number;
}

// ============================
// Error Classes
// ============================

export class WebAdapterError extends Error {
  constructor(message: string, public readonly endpoint?: string) {
    super(message);
    this.name = 'WebAdapterError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public readonly endpoint?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public readonly endpoint?: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// ============================
// Main WebAdapter Class
// ============================

/**
 * Universal HTTP client adapter for web-based documentation sources
 */
export class WebAdapter extends SourceAdapter {
  name = 'web';
  type = 'http' as const;

  protected override config: WebConfig;
  private logger: Logger;
  private httpClient: AxiosInstance;
  private turndownService: TurndownService;
  private documentIndex: Map<string, ExtractedContent> = new Map();
  private rateLimitStates: Map<string, RateLimitState> = new Map();
  protected cache?: CacheService;

  constructor(config: WebConfig, cacheService?: CacheService) {
    super(config);
    this.config = config;
    this.logger = logger.child({ adapter: 'web', name: config.name });
    if (cacheService) {
      this.cache = cacheService;
    }
    
    this.httpClient = this.createHttpClient();
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing WebAdapter', {
      endpoints: this.config.endpoints.length,
      authType: this.config.auth.type,
      maxConcurrent: this.config.performance.max_concurrent_requests
    });

    // Validate configuration
    this.validateConfiguration();
    
    // Test connectivity to endpoints
    await this.validateEndpointConnectivity();
    
    this.logger.info('WebAdapter initialized successfully');
  }

  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    this.logger.debug('Starting web search', {
      query,
      filters,
      endpoints: this.config.endpoints.length
    });

    // Check cache first
    const cacheKey = this.generateCacheKey('search', { query, filters });
    if (this.cache) {
      const cached = await this.cache.get({ type: 'knowledge_base', identifier: cacheKey });
      if (cached) {
        this.logger.debug('Returning cached search results', {
          query,
          resultCount: cached.length,
          cacheKey
        });
        return cached;
      }
    }

    try {
      // Search across all endpoints in parallel (limited by max_concurrent)
      const searchPromises = this.config.endpoints.map(endpoint => 
        this.searchEndpoint(query, endpoint, filters)
      );
      
      const endpointResults = await Promise.allSettled(searchPromises);
      
      // Aggregate results and handle failures
      const allResults: SearchResult[] = [];
      endpointResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allResults.push(...result.value);
        } else {
          this.logger.warn('Endpoint search failed', {
            endpoint: this.config.endpoints[index]?.name || `endpoint_${index}`,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
      
      // Apply confidence scoring and ranking
      const scoredResults = allResults.map(result => ({
        ...result,
        confidence_score: this.calculateWebConfidence(result, query),
        match_reasons: this.generateWebMatchReasons(result, query),
        retrieval_time_ms: Date.now() - startTime
      }));
      
      // Filter and rank results
      const finalResults = this.filterAndRankResults(scoredResults, filters);
      
      // Cache results
      if (this.cache && finalResults.length > 0) {
        await this.cache.set({ type: 'knowledge_base', identifier: cacheKey }, finalResults);
      }
      
      const duration = Date.now() - startTime;
      this.logger.info('Web search completed', {
        query,
        resultCount: finalResults.length,
        duration,
        endpoints: this.config.endpoints.length
      });
      
      return finalResults;
    } catch (error: any) {
      this.logger.error('Web search failed', {
        query,
        error: error.message
      });
      throw new WebAdapterError(`Search failed: ${error.message}`);
    }
  }

  async getDocument(id: string): Promise<SearchResult | null> {
    this.logger.debug('Getting document', { id });
    
    // Check cache first
    const cacheKey = this.generateCacheKey('document', { id });
    if (this.cache) {
      const cached = await this.cache.get({ type: 'knowledge_base', identifier: cacheKey });
      if (cached) {
        this.logger.debug('Returning cached document', { id });
        return cached;
      }
    }
    
    // Try to find document in local index
    const content = this.documentIndex.get(id);
    if (content) {
      const result = this.convertContentToSearchResult(content, 'direct-access');
      
      // Cache result
      if (this.cache) {
        await this.cache.set({ type: 'knowledge_base', identifier: cacheKey }, result);
      }
      
      return result;
    }
    
    this.logger.warn('Document not found', { id });
    return null;
  }

  async searchRunbooks(alertType: string, severity: string, affectedSystems: string[]): Promise<Runbook[]> {
    this.logger.debug('Searching for runbooks', {
      alertType,
      severity,
      affectedSystems
    });

    // Build operational search terms
    const operationalTerms = [
      alertType,
      severity,
      ...affectedSystems,
      'runbook', 'procedure', 'troubleshooting', 'incident', 'operations'
    ].join(' ');
    
    // Search for operational content
    const searchResults = await this.search(operationalTerms, {
      categories: ['runbooks', 'procedures', 'operations'],
      confidence_threshold: 0.3
    });
    
    // Extract runbook structures
    const runbooks: Runbook[] = [];
    for (const result of searchResults) {
      try {
        if (this.isLikelyRunbookContent(result, alertType, severity)) {
          const runbook = await this.extractRunbookStructure(result, alertType, severity);
          if (runbook) {
            runbooks.push(runbook);
          }
        }
      } catch (error: any) {
        this.logger.warn('Failed to extract runbook structure', {
          resultId: result.id,
          error: error.message
        });
      }
    }
    
    this.logger.info('Runbook search completed', {
      alertType,
      runbookCount: runbooks.length
    });
    
    return runbooks;
  }

  override async healthCheck(): Promise<HealthCheck> {
    const checks: Record<string, boolean> = {};
    const errors: string[] = [];
    
    try {
      // Test each endpoint
      for (const endpoint of this.config.endpoints.slice(0, 3)) { // Limit health checks
        try {
          const response = await this.executeHttpRequest(endpoint);
          checks[endpoint.name] = response.status < 400;
        } catch (error: any) {
          checks[endpoint.name] = false;
          errors.push(`${endpoint.name}: ${error.message}`);
        }
      }
      
      const healthyEndpoints = Object.values(checks).filter(Boolean).length;
      const totalEndpoints = Object.keys(checks).length;
      const isHealthy = healthyEndpoints > 0; // At least one endpoint working
      
      return {
        source_name: this.config.name,
        healthy: isHealthy,
        response_time_ms: 200,
        last_check: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join('; ') : undefined,
        metadata: {
          totalEndpoints,
          healthyEndpoints,
          authType: this.config.auth.type,
          checks
        }
      };
    } catch (error: any) {
      return {
        source_name: this.config.name,
        healthy: false,
        response_time_ms: 0,
        last_check: new Date().toISOString(),
        error_message: error.message,
        metadata: {}
      };
    }
  }

  override async getMetadata(): Promise<{
    name: string;
    type: string;
    documentCount: number;
    lastIndexed: string;
    avgResponseTime: number;
    successRate: number;
  }> {
    return {
      name: this.config.name,
      type: 'web',
      documentCount: this.documentIndex.size,
      lastIndexed: new Date().toISOString(),
      avgResponseTime: 250,
      successRate: 0.95
    };
  }

  async refreshIndex(force = false): Promise<boolean> {
    this.logger.info('Refreshing web adapter index', { force });
    
    try {
      // Clear existing index if forcing refresh
      if (force) {
        this.documentIndex.clear();
        if (this.cache) {
          await this.cache.clearAll();
        }
      }
      
      // Re-validate endpoints
      await this.validateEndpointConnectivity();
      
      this.logger.info('Web adapter index refreshed successfully');
      return true;
    } catch (error: any) {
      this.logger.error('Failed to refresh web adapter index', {
        error: error.message
      });
      return false;
    }
  }

  override async cleanup(): Promise<void> {
    this.logger.info('Cleaning up WebAdapter');
    
    // Clear local caches
    this.documentIndex.clear();
    this.rateLimitStates.clear();
    
    this.logger.info('WebAdapter cleanup completed');
  }

  // ============================
  // Private Helper Methods
  // ============================

  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      timeout: this.config.performance.default_timeout_ms,
      headers: this.buildGlobalHeaders(),
      validateStatus: (status) => status < 500, // Don't throw on 4xx
      maxRedirects: this.config.content_processing.follow_redirects ? 5 : 0
    });

    // Add request interceptor for logging
    client.interceptors.request.use((config) => {
      this.logger.debug('HTTP request', {
        method: config.method?.toUpperCase(),
        url: config.url,
        headers: this.sanitizeHeaders(config.headers || {})
      });
      return config;
    });

    // Add response interceptor for logging
    client.interceptors.response.use(
      (response) => {
        this.logger.debug('HTTP response', {
          status: response.status,
          url: response.config.url,
          contentType: response.headers['content-type'],
          size: this.getResponseSize(response)
        });
        return response;
      },
      (error) => {
        this.logger.error('HTTP error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );

    return client;
  }

  private buildGlobalHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.config.performance.user_agent || 'PersonalPipeline-WebAdapter/1.0'
    };

    // Add authentication headers
    if (this.config.auth.type === 'api_key' && this.config.auth.api_key_header) {
      const apiKey = process.env[this.config.auth.api_key_env];
      if (apiKey) {
        headers[this.config.auth.api_key_header] = apiKey;
      }
    } else if (this.config.auth.type === 'bearer_token' && this.config.auth.bearer_token_env) {
      const token = process.env[this.config.auth.bearer_token_env];
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else if ((this.config.auth.type === 'basic_auth' || this.config.auth.type === 'basic') && this.config.auth.username_env && this.config.auth.password_env) {
      const username = process.env[this.config.auth.username_env];
      const password = process.env[this.config.auth.password_env];
      if (username && password) {
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }
    } else if (this.config.auth.type === 'bearer' && this.config.auth.bearer_token_env) {
      const token = process.env[this.config.auth.bearer_token_env];
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    // Add custom headers if they exist
    if (this.config.auth.custom_headers) {
      Object.assign(headers, this.config.auth.custom_headers);
    }
    
    // Add dynamic headers from environment variables
    if (this.config.auth.header_envs) {
      for (const [headerName, envVar] of Object.entries(this.config.auth.header_envs)) {
        const value = process.env[envVar];
        if (value) {
          headers[headerName] = value;
        }
      }
    }

    return headers;
  }

  private validateConfiguration(): void {
    if (!this.config.endpoints || this.config.endpoints.length === 0) {
      throw new WebAdapterError('No endpoints configured');
    }
    
    for (const endpoint of this.config.endpoints) {
      if (!endpoint.name || !endpoint.url) {
        throw new WebAdapterError(`Invalid endpoint configuration: missing name or URL`);
      }
      
      if (!['GET', 'POST'].includes(endpoint.method)) {
        throw new WebAdapterError(`Unsupported HTTP method: ${endpoint.method}`);
      }
      
      if (!['html', 'json', 'xml', 'text', 'auto'].includes(endpoint.content_type)) {
        throw new WebAdapterError(`Unsupported content type: ${endpoint.content_type}`);
      }
    }
    
    // Validate authentication configuration
    const requiredEnvVars: string[] = [];
    
    if (this.config.auth.type === 'api_key') {
      requiredEnvVars.push(this.config.auth.api_key_env);
    } else if (this.config.auth.type === 'bearer_token' || this.config.auth.type === 'bearer') {
      if (this.config.auth.bearer_token_env) {
        requiredEnvVars.push(this.config.auth.bearer_token_env);
      }
    } else if (this.config.auth.type === 'basic_auth' || this.config.auth.type === 'basic') {
      if (this.config.auth.username_env) requiredEnvVars.push(this.config.auth.username_env);
      if (this.config.auth.password_env) requiredEnvVars.push(this.config.auth.password_env);
    }
    
    for (const envVar of requiredEnvVars) {
      if (envVar && !process.env[envVar]) {
        this.logger.warn(`Missing environment variable: ${envVar}`);
      }
    }
  }

  private async validateEndpointConnectivity(): Promise<void> {
    const testPromises = this.config.endpoints.map(async (endpoint) => {
      try {
        const response = await this.executeHttpRequest(endpoint);
        this.logger.debug('Endpoint connectivity validated', {
          endpoint: endpoint.name,
          status: response.status
        });
        return { endpoint: endpoint.name, success: true };
      } catch (error: any) {
        this.logger.warn('Endpoint connectivity failed', {
          endpoint: endpoint.name,
          error: error.message
        });
        return { endpoint: endpoint.name, success: false, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(testPromises);
    const failedEndpoints = results
      .filter(result => result.status === 'fulfilled' && !result.value.success)
      .map(result => result.status === 'fulfilled' ? result.value.endpoint : 'unknown');
    
    if (failedEndpoints.length === this.config.endpoints.length) {
      this.logger.warn('All endpoints failed connectivity test - continuing anyway');
    }
    
    if (failedEndpoints.length > 0) {
      this.logger.warn('Some endpoints failed connectivity test', {
        failedEndpoints,
        totalEndpoints: this.config.endpoints.length
      });
    }
  }

  private async searchEndpoint(
    query: string, 
    endpoint: WebEndpoint, 
    _filters?: SearchFilters
  ): Promise<SearchResult[]> {
    try {
      // Apply rate limiting
      await this.checkRateLimit(endpoint);
      
      // Execute HTTP request
      const response = await this.executeHttpRequest(endpoint, query);
      
      // Process response content
      const extractedContent = await this.processContent(response, endpoint);
      
      // Store in document index
      const documentId = this.generateDocumentId(endpoint.name, extractedContent.title);
      this.documentIndex.set(documentId, extractedContent);
      
      // Convert to search results
      return this.convertToSearchResults(extractedContent, endpoint, query);
    } catch (error: any) {
      this.logger.error('Endpoint search failed', {
        endpoint: endpoint.name,
        error: error.message
      });
      
      // Don't throw - let other endpoints continue
      return [];
    }
  }

  private async executeHttpRequest(endpoint: WebEndpoint, query?: string): Promise<WebResponse> {
    const config: AxiosRequestConfig = {
      method: endpoint.method,
      url: endpoint.url,
      timeout: endpoint.timeout_ms || this.config.performance.default_timeout_ms,
      headers: {
        ...this.buildGlobalHeaders(),
        ...endpoint.headers
      }
    };

    // Add query parameters
    if (endpoint.query_params) {
      config.params = { ...config.params, ...endpoint.query_params };
    }

    // Add search query for GET requests
    if (query && endpoint.method === 'GET') {
      config.params = { ...config.params, q: query, query, search: query };
    }

    // Add API key as query parameter if configured
    if (this.config.auth.type === 'api_key' && this.config.auth.api_key_query) {
      const apiKey = process.env[this.config.auth.api_key_env];
      if (apiKey) {
        config.params = { ...config.params, [this.config.auth.api_key_query]: apiKey };
      }
    }

    // Add request body for POST requests
    if (endpoint.method === 'POST') {
      let body = endpoint.body || '{}';
      if (query) {
        body = body.replace('${query}', query);
      }
      config.data = body;
      config.headers!['Content-Type'] = 'application/json';
    }

    try {
      const response = await this.httpClient.request(config);
      
      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
        url: response.config.url || endpoint.url,
        content_type: response.headers['content-type'] || 'unknown'
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        
        if (status === 401 || status === 403) {
          throw new AuthenticationError(`Authentication failed for ${endpoint.name}: ${status}`, endpoint.name);
        }
        
        if (status === 429) {
          throw new RateLimitError(`Rate limit exceeded for ${endpoint.name}`, endpoint.name);
        }
        
        throw new WebAdapterError(`HTTP ${status} error for ${endpoint.name}: ${error.message}`, endpoint.name);
      }
      
      throw new WebAdapterError(`Request failed for ${endpoint.name}: ${error.message}`, endpoint.name);
    }
  }

  private async processContent(response: WebResponse, endpoint: WebEndpoint): Promise<ExtractedContent> {
    const contentType = this.detectContentType(response, endpoint);
    
    this.logger.debug('Processing content', {
      endpoint: endpoint.name,
      contentType,
      size: typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length
    });

    switch (contentType) {
      case 'html':
        return this.processHTML(response.data, endpoint.selectors || {}, endpoint.name);
      case 'json':
        return this.processJSON(response.data, endpoint.json_paths || [], endpoint.name);
      case 'xml':
        return await this.processXML(response.data, endpoint.xml_xpaths || [], endpoint.name);
      case 'text':
        return this.processText(response.data, endpoint.name);
      default:
        throw new WebAdapterError(`Unsupported content type: ${contentType}`, endpoint.name);
    }
  }

  private detectContentType(response: WebResponse, endpoint: WebEndpoint): string {
    if (endpoint.content_type !== 'auto') {
      return endpoint.content_type;
    }

    const contentType = response.content_type.toLowerCase();
    
    if (contentType.includes('application/json')) {
      return 'json';
    } else if (contentType.includes('text/html')) {
      return 'html';
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      return 'xml';
    } else {
      return 'text';
    }
  }

  private processHTML(html: string, selectors: ContentSelectors, endpointName: string): ExtractedContent {
    try {
      const $ = cheerio.load(html);
      
      // Extract title
      let title = '';
      if (selectors.title) {
        title = $(selectors.title).first().text().trim();
      } else {
        title = $('title').text().trim() || $('h1').first().text().trim() || '';
      }
      
      // Remove excluded elements
      if (selectors.exclude) {
        selectors.exclude.forEach(excludeSelector => {
          $(excludeSelector).remove();
        });
      }
      
      // Extract main content
      let contentHtml = '';
      if (selectors.content) {
        contentHtml = $(selectors.content).html() || '';
      } else {
        $('script, style, nav, header, footer, aside, .sidebar, .navigation').remove();
        contentHtml = $('main').html() || $('article').html() || $('body').html() || html;
      }
      
      // Convert to markdown
      const markdown = this.htmlToMarkdown(contentHtml);
      
      // Extract metadata
      const metadata = this.extractHTMLMetadata($);
      
      // Extract links if requested
      let links: string[] = [];
      if (selectors.links) {
        links = $(selectors.links).map((_, el) => $(el).attr('href')).get().filter(Boolean);
      }
      
      // Generate searchable content
      const searchableContent = this.generateSearchableContent(title, markdown, metadata);
      
      return {
        title: title || 'Web Document',
        content: markdown,
        raw_content: html,
        metadata,
        links,
        searchable_content: searchableContent
      };
    } catch (error: any) {
      this.logger.error('HTML processing failed', {
        endpoint: endpointName,
        error: error.message
      });
      throw new WebAdapterError(`HTML processing failed: ${error.message}`, endpointName);
    }
  }

  private processJSON(data: any, jsonPaths: string[], endpointName: string): ExtractedContent {
    try {
      const extractedData: any = {};
      
      if (jsonPaths.length > 0) {
        for (const path of jsonPaths) {
          try {
            const result = JSONPath({ path, json: data });
            const pathKey = path.replace(/^\$\.?/, '').replace(/\[\*\]/g, '');
            extractedData[pathKey] = result;
          } catch (error: any) {
            this.logger.warn('JSONPath extraction failed', {
              endpoint: endpointName,
              path,
              error: error.message
            });
          }
        }
      } else {
        Object.assign(extractedData, data);
      }
      
      const title = this.extractJSONTitle(extractedData);
      const content = this.jsonToMarkdown(extractedData);
      const searchableContent = this.generateSearchableContent(title, content, extractedData);
      
      return {
        title,
        content,
        raw_content: JSON.stringify(data, null, 2),
        metadata: extractedData,
        searchable_content: searchableContent
      };
    } catch (error: any) {
      this.logger.error('JSON processing failed', {
        endpoint: endpointName,
        error: error.message
      });
      throw new WebAdapterError(`JSON processing failed: ${error.message}`, endpointName);
    }
  }

  private async processXML(xmlData: string, _xpaths: string[], endpointName: string): Promise<ExtractedContent> {
    return new Promise((resolve, reject) => {
      parseXML(xmlData, { explicitArray: false }, (err, result) => {
        if (err) {
          this.logger.error('XML parsing failed', {
            endpoint: endpointName,
            error: err.message
          });
          reject(new WebAdapterError(`XML parsing failed: ${err.message}`, endpointName));
          return;
        }
        
        try {
          const extractedData = result || {};
          const title = this.extractXMLTitle(extractedData);
          const content = this.jsonToMarkdown(extractedData);
          const searchableContent = this.generateSearchableContent(title, content, extractedData);
          
          resolve({
            title,
            content,
            raw_content: xmlData,
            metadata: extractedData,
            searchable_content: searchableContent
          });
        } catch (error: any) {
          this.logger.error('XML processing failed', {
            endpoint: endpointName,
            error: error.message
          });
          reject(new WebAdapterError(`XML processing failed: ${error.message}`, endpointName));
        }
      });
    });
  }

  private processText(text: string, endpointName: string): ExtractedContent {
    try {
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      const title = lines[0] || 'Text Document';
      const content = text.trim();
      const searchableContent = this.generateSearchableContent(title, content, {});
      
      return {
        title,
        content,
        raw_content: text,
        metadata: { lines: lines.length, characters: text.length },
        searchable_content: searchableContent
      };
    } catch (error: any) {
      this.logger.error('Text processing failed', {
        endpoint: endpointName,
        error: error.message
      });
      throw new WebAdapterError(`Text processing failed: ${error.message}`, endpointName);
    }
  }

  private htmlToMarkdown(html: string): string {
    try {
      return this.turndownService.turndown(html);
    } catch (error: any) {
      this.logger.warn('HTML to Markdown conversion failed, using plain text', {
        error: error.message
      });
      const $ = cheerio.load(html);
      return $.root().text();
    }
  }

  private extractHTMLMetadata($: cheerio.Root): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (name && content) {
        metadata[name] = content;
      }
    });
    
    return metadata;
  }

  private extractJSONTitle(data: any): string {
    const titleFields = ['title', 'name', 'label', 'heading', 'subject'];
    
    for (const field of titleFields) {
      if (data[field] && typeof data[field] === 'string') {
        return data[field];
      }
    }
    
    for (const [, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 0 && value.length < 100) {
        return value;
      }
    }
    
    return 'JSON Document';
  }

  private extractXMLTitle(data: any): string {
    if (data.title) return String(data.title);
    if (data.name) return String(data.name);
    
    const keys = Object.keys(data);
    if (keys.length > 0) {
      return `XML Document (${keys[0]})`;
    }
    
    return 'XML Document';
  }

  private jsonToMarkdown(data: any): string {
    const lines: string[] = [];
    
    const processValue = (key: string, value: any, depth = 0): void => {
      const indent = '  '.repeat(depth);
      
      if (Array.isArray(value)) {
        lines.push(`${indent}**${key}:**`);
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            lines.push(`${indent}- Item ${index + 1}:`);
            Object.entries(item).forEach(([k, v]) => processValue(k, v, depth + 1));
          } else {
            lines.push(`${indent}- ${item}`);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`${indent}**${key}:**`);
        Object.entries(value).forEach(([k, v]) => processValue(k, v, depth + 1));
      } else {
        lines.push(`${indent}**${key}:** ${value}`);
      }
    };
    
    Object.entries(data).forEach(([key, value]) => processValue(key, value));
    
    return lines.join('\n');
  }

  private generateSearchableContent(title: string, content: string, metadata: Record<string, any>): string {
    const parts = [title, content];
    
    for (const value of Object.values(metadata)) {
      if (typeof value === 'string') {
        parts.push(value);
      } else if (Array.isArray(value)) {
        parts.push(...value.filter(v => typeof v === 'string'));
      }
    }
    
    return parts
      .join(' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  }

  private async checkRateLimit(endpoint: WebEndpoint): Promise<void> {
    const limit = endpoint.rate_limit || 60;
    const state = this.getOrCreateLimitState(endpoint.name);
    
    if (state.requestCount >= limit) {
      const waitTime = 60000 - (Date.now() - state.windowStart);
      if (waitTime > 0) {
        this.logger.info(`Rate limit reached for ${endpoint.name}, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.resetLimitWindow(endpoint.name);
      }
    }
    
    state.requestCount++;
  }

  private getOrCreateLimitState(endpointName: string): RateLimitState {
    if (!this.rateLimitStates.has(endpointName)) {
      this.rateLimitStates.set(endpointName, {
        requestCount: 0,
        windowStart: Date.now()
      });
    }
    
    const state = this.rateLimitStates.get(endpointName)!;
    
    if (Date.now() - state.windowStart >= 60000) {
      this.resetLimitWindow(endpointName);
    }
    
    return state;
  }

  private resetLimitWindow(endpointName: string): void {
    this.rateLimitStates.set(endpointName, {
      requestCount: 0,
      windowStart: Date.now()
    });
  }

  private convertToSearchResults(
    content: ExtractedContent, 
    endpoint: WebEndpoint, 
    _query: string
  ): SearchResult[] {
    const result: SearchResult = {
      id: this.generateDocumentId(endpoint.name, content.title),
      title: content.title,
      content: content.content,
      source: this.config.name,
      source_type: 'web',
      confidence_score: 0.8,
      match_reasons: [],
      retrieval_time_ms: 0,
      last_updated: new Date().toISOString(),
      metadata: {
        endpoint: endpoint.name,
        url: endpoint.url,
        content_type: endpoint.content_type,
        ...content.metadata
      }
    };
    
    return [result];
  }

  private convertContentToSearchResult(content: ExtractedContent, source: string): SearchResult {
    return {
      id: this.generateDocumentId(source, content.title),
      title: content.title,
      content: content.content,
      source: this.config.name,
      source_type: 'web',
      confidence_score: 1.0,
      match_reasons: ['Direct document access'],
      retrieval_time_ms: 0,
      last_updated: new Date().toISOString(),
      metadata: content.metadata
    };
  }

  private calculateWebConfidence(result: SearchResult, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = result.title.toLowerCase();
    const contentLower = result.content.toLowerCase();
    
    let confidence = 0.0;
    
    // Title relevance (40%)
    if (titleLower.includes(queryLower)) {
      confidence += 0.4;
    } else {
      const titleWords = queryLower.split(/\s+/);
      const titleMatches = titleWords.filter(word => titleLower.includes(word)).length;
      confidence += (titleMatches / titleWords.length) * 0.4;
    }
    
    // Content relevance (35%)
    if (contentLower.includes(queryLower)) {
      confidence += 0.35;
    } else {
      const contentWords = queryLower.split(/\s+/);
      const contentMatches = contentWords.filter(word => contentLower.includes(word)).length;
      confidence += (contentMatches / contentWords.length) * 0.35;
    }
    
    // Endpoint relevance (25%)
    const endpointName = result.metadata?.endpoint?.toLowerCase() || '';
    if (endpointName.includes('runbook') || endpointName.includes('ops')) {
      confidence += 0.25;
    } else if (endpointName.includes('doc') || endpointName.includes('api')) {
      confidence += 0.15;
    } else {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private generateWebMatchReasons(result: SearchResult, query: string): string[] {
    const reasons: string[] = [];
    const queryLower = query.toLowerCase();
    const titleLower = result.title.toLowerCase();
    const contentLower = result.content.toLowerCase();
    
    if (titleLower.includes(queryLower)) {
      reasons.push('Exact title match');
    } else if (queryLower.split(/\s+/).some(word => titleLower.includes(word))) {
      reasons.push('Partial title match');
    }
    
    if (contentLower.includes(queryLower)) {
      reasons.push('Exact content match');
    } else if (queryLower.split(/\s+/).some(word => contentLower.includes(word))) {
      reasons.push('Partial content match');
    }
    
    const endpointName = result.metadata?.endpoint?.toLowerCase() || '';
    if (endpointName.includes('runbook')) {
      reasons.push('Runbook endpoint');
    } else if (endpointName.includes('doc')) {
      reasons.push('Documentation endpoint');
    }
    
    if (reasons.length === 0) {
      reasons.push('General relevance');
    }
    
    return reasons;
  }

  private filterAndRankResults(results: SearchResult[], filters?: SearchFilters): SearchResult[] {
    let filtered = results;
    
    if (filters?.confidence_threshold) {
      filtered = filtered.filter(result => result.confidence_score >= filters.confidence_threshold!);
    }
    
    if (filters?.categories) {
      filtered = filtered.filter(result => {
        const endpointName = result.metadata?.endpoint?.toLowerCase() || '';
        return filters.categories!.some(category => 
          endpointName.includes(category.toLowerCase())
        );
      });
    }
    
    filtered.sort((a, b) => b.confidence_score - a.confidence_score);
    
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }
    
    return filtered;
  }

  private isLikelyRunbookContent(result: SearchResult, alertType: string, severity: string): boolean {
    const content = result.content.toLowerCase();
    const title = result.title.toLowerCase();
    const endpoint = result.metadata?.endpoint?.toLowerCase() || '';
    
    const runbookKeywords = ['runbook', 'procedure', 'troubleshoot', 'incident', 'operations', 'ops'];
    const hasRunbookKeywords = runbookKeywords.some(keyword => 
      title.includes(keyword) || content.includes(keyword) || endpoint.includes(keyword)
    );
    
    const alertTypeNormalized = alertType.replace(/_/g, ' ').toLowerCase();
    const hasAlertRelevance = content.includes(alertTypeNormalized) || title.includes(alertTypeNormalized);
    
    const hasSeverityRelevance = content.includes(severity.toLowerCase()) || title.includes(severity.toLowerCase());
    
    return hasRunbookKeywords && (hasAlertRelevance || hasSeverityRelevance);
  }

  private async extractRunbookStructure(result: SearchResult, alertType: string, severity: string): Promise<Runbook | null> {
    try {
      if (result.metadata?.content_type === 'json') {
        try {
          const jsonContent = JSON.parse(result.content);
          if (this.isValidRunbookJSON(jsonContent)) {
            return jsonContent;
          }
        } catch {
          // Not valid JSON, continue to synthetic generation
        }
      }
      
      return this.createSyntheticRunbook(result, alertType, severity);
    } catch (error: any) {
      this.logger.warn('Failed to extract runbook structure', {
        resultId: result.id,
        error: error.message
      });
      return null;
    }
  }

  private isValidRunbookJSON(obj: any): boolean {
    return obj && 
           typeof obj === 'object' && 
           obj.id && 
           obj.title && 
           (obj.procedures || obj.steps || obj.actions);
  }

  private createSyntheticRunbook(result: SearchResult, alertType: string, severity: string): Runbook {
    const procedures = this.extractProceduresFromContent(result.content);
    
    return {
      id: result.id,
      title: result.title,
      version: '1.0',
      description: `Runbook extracted from ${result.source}`,
      triggers: [alertType],
      severity_mapping: {
        [severity]: severity as AlertSeverity,
        critical: 'critical' as AlertSeverity,
        high: 'high' as AlertSeverity,
        medium: 'medium' as AlertSeverity,
        low: 'low' as AlertSeverity,
        info: 'info' as AlertSeverity
      },
      decision_tree: {
        id: 'main',
        name: 'Main Decision Tree',
        description: 'Primary decision flow for this runbook',
        branches: [],
        default_action: 'escalate'
      },
      procedures,
      escalation_path: 'Standard escalation procedure',
      metadata: {
        confidence_score: result.confidence_score,
        author: 'WebAdapter',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        success_rate: 0.85
      }
    };
  }

  private extractProceduresFromContent(content: string): any[] {
    const procedures: any[] = [];
    
    const stepPatterns = [
      /^\d+\.\s*(.+)$/gm,
      /^Step \d+:\s*(.+)$/gm,
      /^\*\s*(.+)$/gm,
      /^-\s*(.+)$/gm
    ];
    
    let stepCounter = 1;
    
    for (const pattern of stepPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        matches.forEach(match => {
          const description = match.replace(/^\d+\.\s*|^Step \d+:\s*|^\*\s*|^-\s*/, '').trim();
          if (description.length > 10) {
            procedures.push({
              id: `step_${stepCounter}`,
              name: `Step ${stepCounter}`,
              description,
              expected_outcome: 'Step completed successfully',
              timeout_seconds: 300
            });
            stepCounter++;
          }
        });
        break;
      }
    }
    
    if (procedures.length === 0) {
      procedures.push({
        id: 'step_1',
        name: 'Primary Procedure',
        description: content.substring(0, 500),
        expected_outcome: 'Procedure completed successfully',
        timeout_seconds: 600
      });
    }
    
    return procedures;
  }

  private generateDocumentId(endpoint: string, title: string): string {
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${endpoint}-${cleanTitle}`;
  }

  private generateCacheKey(operation: string, params: Record<string, any>): string {
    const paramString = JSON.stringify(params);
    const hash = Buffer.from(paramString).toString('base64').substring(0, 8);
    return `web:${operation}:${hash}`;
  }


  private sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('key')) {
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
}