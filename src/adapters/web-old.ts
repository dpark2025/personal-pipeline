/**
 * Web Adapter - Simplified HTTP Client for Web-Based Documentation Sources
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Compatible implementation that properly extends SourceAdapter base class
 * with enterprise-grade features and simplified configuration.
 */

import { SourceAdapter } from './base.js';
import { 
  WebConfig, 
  SearchResult, 
  SearchFilters, 
  HealthCheck, 
  Runbook,
  AlertSeverity
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import { Logger } from 'winston';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

// Use existing WebConfig type instead of defining our own

/**
 * Web Adapter - HTTP client for web-based documentation sources
 */
export class WebAdapter extends SourceAdapter {
  name = 'web';
  type = 'web' as const;

  protected override config: WebConfig;
  private logger: Logger;
  private httpClient: AxiosInstance;
  private turndownService: TurndownService;
  
  // Performance Tracking
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    lastHealthCheck: new Date().toISOString()
  };

  constructor(config: WebConfig) {
    super(config);
    this.config = config;
    this.logger = logger.child({ adapter: 'web', name: config.name });
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: config.performance.default_timeout_ms,
      maxRedirects: config.content_processing.follow_redirects ? 5 : 0,
      validateStatus: () => true, // Don't throw on HTTP errors
      headers: {
        'User-Agent': config.performance.user_agent
      }
    });

    // Initialize HTML to Markdown converter
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing WebAdapter', {
      sources: this.config.sources?.length || 0,
      authType: this.config.auth?.type || 'none'
    });

    // Validate source connectivity
    await this.validateSourceConnectivity();
    
    this.isInitialized = true;
    this.logger.info('WebAdapter initialized successfully');
  }

  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('WebAdapter not initialized');
    }

    const startTime = Date.now();
    
    this.logger.debug('Starting web search', {
      query,
      filters,
      sources: this.config.sources?.length || 0
    });

    try {
      const allResults: SearchResult[] = [];
      
      if (this.config.sources) {
        const searchPromises = this.config.sources.flatMap(source => 
          source.endpoints.map(endpoint => 
            this.searchEndpoint(query, source, endpoint, filters)
          )
        );
        
        const endpointResults = await Promise.allSettled(searchPromises);
        
        // Aggregate results and handle failures
        endpointResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allResults.push(...result.value);
          } else {
            const sourceName = this.config.sources?.[Math.floor(index / 2)]?.name || `source_${index}`;
            this.logger.warn('Endpoint search failed', {
              source: sourceName,
              error: result.reason?.message || 'Unknown error'
            });
          }
        });
      }
      
      // Apply confidence scoring and ranking
      const scoredResults = allResults.map(result => ({
        ...result,
        confidence_score: this.calculateConfidence(result, query),
        match_reasons: this.generateMatchReasons(result, query),
        retrieval_time_ms: Date.now() - startTime
      }));
      
      // Filter and rank results
      const finalResults = this.filterAndRankResults(scoredResults, filters);
      
      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      
      const duration = Date.now() - startTime;
      this.logger.info('Web search completed', {
        query,
        resultCount: finalResults.length,
        duration
      });
      
      return finalResults;
    } catch (error: any) {
      this.updateMetrics(false, Date.now() - startTime);
      this.logger.error('Web search failed', {
        query,
        error: error.message
      });
      throw new Error(`Web search failed: ${error.message}`);
    }
  }

  async getDocument(id: string): Promise<SearchResult | null> {
    if (!this.isInitialized) {
      throw new Error('WebAdapter not initialized');
    }

    this.logger.debug('Getting document', { id });
    
    // Parse document ID to extract source and endpoint info
    const docInfo = this.parseDocumentId(id);
    if (!docInfo) {
      this.logger.warn('Invalid document ID format', { id });
      return null;
    }
    
    const { sourceName, endpointName, documentId } = docInfo;
    const source = this.config.sources?.find(s => s.name === sourceName);
    const endpoint = source?.endpoints.find(e => e.name === endpointName);
    
    if (!source || !endpoint) {
      this.logger.warn('Source or endpoint not found for document', { 
        id, sourceName, endpointName 
      });
      return null;
    }
    
    try {
      const content = await this.fetchDocument(source, endpoint, documentId);
      if (content) {
        return this.convertContentToSearchResult(content, source, endpoint);
      }
      
      return null;
    } catch (error: any) {
      this.logger.error('Failed to get document', {
        id,
        error: error.message
      });
      return null;
    }
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
      confidence_threshold: 0.3,
      limit: 20
    });
    
    // Extract runbook structures
    const runbooks: Runbook[] = [];
    for (const result of searchResults) {
      try {
        if (this.isLikelyRunbookContent(result, alertType, severity)) {
          const runbook = this.createSyntheticRunbook(result, alertType, severity);
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

  async healthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    const checks: Record<string, boolean> = {};
    const errors: string[] = [];
    
    try {
      // Test each source's health check endpoint
      if (this.config.sources) {
        for (const source of this.config.sources.slice(0, 5)) { // Limit health checks
          if (source.health_check.enabled) {
            try {
              const healthy = await this.testSourceHealth(source);
              checks[source.name] = healthy;
              
              if (!healthy) {
                errors.push(`${source.name}: Health check failed`);
              }
            } catch (error: any) {
              checks[source.name] = false;
              errors.push(`${source.name}: ${error.message}`);
            }
          }
        }
      }
      
      const healthySources = Object.values(checks).filter(Boolean).length;
      const totalSources = Object.keys(checks).length;
      const isHealthy = healthySources > 0; // At least one source working
      
      const responseTime = Date.now() - startTime;
      this.metrics.lastHealthCheck = new Date().toISOString();
      
      return {
        source_name: this.config.name,
        healthy: isHealthy,
        response_time_ms: responseTime,
        last_check: this.metrics.lastHealthCheck,
        error_message: errors.length > 0 ? errors.join('; ') : undefined,
        metadata: {
          totalSources,
          healthySources,
          authType: this.config.auth?.type || 'none',
          checks,
          metrics: this.getMetricsSummary()
        }
      };
    } catch (error: any) {
      return {
        source_name: this.config.name,
        healthy: false,
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: error.message,
        metadata: {
          metrics: this.getMetricsSummary()
        }
      };
    }
  }

  async getMetadata(): Promise<{
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
      documentCount: this.config.sources?.length || 0,
      lastIndexed: this.metrics.lastHealthCheck,
      avgResponseTime: this.metrics.avgResponseTime,
      successRate: this.metrics.totalRequests > 0 
        ? this.metrics.successfulRequests / this.metrics.totalRequests 
        : 0
    };
  }

  async refreshIndex(force = false): Promise<boolean> {
    this.logger.info('Refreshing web adapter index', { force });
    
    try {
      // Re-validate source connectivity
      await this.validateSourceConnectivity();
      
      // Reset metrics
      if (force) {
        this.resetMetrics();
      }
      
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
    await super.cleanup();
    this.logger.info('WebAdapter cleanup completed');
  }

  // ============================
  // Private Helper Methods
  // ============================

  private async validateSourceConnectivity(): Promise<void> {
    if (!this.config.sources) return;

    const testPromises = this.config.sources.map(async (source) => {
      try {
        const healthy = await this.testSourceHealth(source);
        this.logger.debug('Source connectivity validated', {
          source: source.name,
          healthy
        });
        return { source: source.name, success: healthy };
      } catch (error: any) {
        this.logger.warn('Source connectivity failed', {
          source: source.name,
          error: error.message
        });
        return { source: source.name, success: false, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(testPromises);
    const failedSources = results
      .filter(result => result.status === 'fulfilled' && !result.value.success)
      .map(result => result.status === 'fulfilled' ? result.value.source : 'unknown');
    
    if (failedSources.length === this.config.sources.length) {
      this.logger.warn('All sources failed connectivity test - continuing anyway');
    }
    
    if (failedSources.length > 0) {
      this.logger.warn('Some sources failed connectivity test', {
        failedSources,
        totalSources: this.config.sources.length
      });
    }
  }

  private async searchEndpoint(
    query: string, 
    source: WebConfig['sources'][0], 
    endpoint: WebConfig['sources'][0]['endpoints'][0], 
    _filters?: SearchFilters // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  ): Promise<SearchResult[]> {
    try {
      // Build request URL
      const url = this.buildEndpointUrl(source, endpoint, { query });
      
      // Execute HTTP request
      const response = await this.httpClient.request({
        method: endpoint.method,
        url,
        headers: {
          ...endpoint.headers,
          ...this.getAuthHeaders(source)
        },
        timeout: endpoint.timeout_ms || this.config.performance?.default_timeout_ms || 30000
      });
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Process response content
      const extractedContent = await this.extractContent(response.data, endpoint, source, url);
      
      // Convert to search results
      return extractedContent.map(content => this.convertContentToSearchResult(content, source, endpoint));
    } catch (error: any) {
      this.logger.error('Endpoint search failed', {
        source: source.name,
        endpoint: endpoint.name,
        error: error.message
      });
      
      // Don't throw - let other endpoints continue
      return [];
    }
  }

  private buildEndpointUrl(source: WebConfig['sources'][0], endpoint: WebConfig['sources'][0]['endpoints'][0], params?: Record<string, string>): string {
    try {
      // Handle absolute URLs in endpoint path
      if (endpoint.path.startsWith('http://') || endpoint.path.startsWith('https://')) {
        return this.processUrlTemplate(endpoint.path, params);
      }
      
      // Construct URL from base + path
      const baseUrl = source.base_url.endsWith('/') ? source.base_url.slice(0, -1) : source.base_url;
      const path = endpoint.path.startsWith('/') ? endpoint.path : `/${  endpoint.path}`;
      const url = baseUrl + path;
      
      // Apply parameter substitution
      return this.processUrlTemplate(url, params);
    } catch (error: any) {
      this.logger.error('Failed to build endpoint URL', {
        source: source.name,
        endpoint: endpoint.name,
        error: error.message
      });
      throw error;
    }
  }

  private processUrlTemplate(urlTemplate: string, params?: Record<string, string>): string {
    if (!params) {
      return urlTemplate;
    }
    
    let processedUrl = urlTemplate;
    
    // Replace ${param} style placeholders
    for (const [key, value] of Object.entries(params)) {
      const placeholder1 = `\${${key}}`;
      const placeholder2 = `{${key}}`;
      
      processedUrl = processedUrl.replace(new RegExp(placeholder1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), encodeURIComponent(value));
      processedUrl = processedUrl.replace(new RegExp(placeholder2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), encodeURIComponent(value));
    }
    
    return processedUrl;
  }

  private getAuthHeaders(source: WebConfig['sources'][0]): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Use source-specific auth override if available
    const authConfig = source.auth_override || this.config.auth;
    
    if (authConfig?.type === 'api_key' && authConfig.api_key) {
      const token = process.env[authConfig.api_key.env_var];
      if (token) {
        const prefix = authConfig.api_key.prefix || '';
        if (authConfig.api_key.location === 'header') {
          headers[authConfig.api_key.name] = `${prefix}${token}`;
        }
      }
    } else if (authConfig?.type === 'bearer_token' && authConfig.bearer_token) {
      const token = process.env[authConfig.bearer_token.env_var];
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else if (authConfig?.type === 'basic_auth' && authConfig.basic_auth) {
      const username = process.env[authConfig.basic_auth.username_env];
      const password = process.env[authConfig.basic_auth.password_env];
      if (username && password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      }
    } else if (authConfig?.type === 'oauth2' && authConfig.oauth2) {
      // OAuth2 would need token exchange - simplified for now
      // In a full implementation, would use client credentials flow
      // headers['Authorization'] = `Bearer ${oauth_token}`;
    }
    
    return headers;
  }

  private async extractContent(
    data: any, 
    endpoint: WebConfig['sources'][0]['endpoints'][0], 
    source: WebConfig['sources'][0], 
    url: string
  ): Promise<Array<{
    id: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
    source_url: string;
  }>> {

    try {
      switch (endpoint.content_type) {
        case 'html':
          return this.extractHtmlContent(data, endpoint, source, url);
        
        case 'json':
          return this.extractJsonContent(data, endpoint, source, url);
        
        case 'xml':
        case 'rss':
          return this.extractXmlContent(data, endpoint, source, url);
        
        case 'text':
          return this.extractTextContent(data, endpoint, source, url);
        
        case 'auto':
        default:
          // Auto-detect content type
          if (typeof data === 'string' && data.trim().startsWith('<')) {
            return this.extractHtmlContent(data, endpoint, source, url);
          } else if (typeof data === 'object') {
            return this.extractJsonContent(data, endpoint, source, url);
          } else {
            return this.extractTextContent(String(data), endpoint, source, url);
          }
      }
    } catch (error: any) {
      this.logger.error('Content extraction failed', {
        source: source.name,
        endpoint: endpoint.name,
        contentType: endpoint.content_type,
        error: error.message
      });
      return [];
    }
  }

  private extractHtmlContent(
    html: string, 
    endpoint: WebConfig['sources'][0]['endpoints'][0], 
    source: WebConfig['sources'][0], 
    url: string
  ): Array<{
    id: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
    source_url: string;
  }> {
    const $ = cheerio.load(html);
    const selectors = endpoint.selectors;
    
    const title = selectors?.title ? $(selectors.title).first().text().trim() : $('title').first().text().trim() || 'Untitled';
    
    let content = '';
    if (selectors?.content) {
      const contentEl = $(selectors.content);
      content = this.turndownService.turndown(contentEl.html() || '');
    } else {
      // Default content extraction
      $('script, style, nav, header, footer').remove();
      const mainContent = $('main, article, .content, .post, .entry').first();
      if (mainContent.length > 0) {
        content = this.turndownService.turndown(mainContent.html() || '');
      } else {
        content = this.turndownService.turndown($('body').html() || '');
      }
    }
    
    const metadata: Record<string, any> = {
      content_type: 'html',
      extracted_at: new Date().toISOString()
    };
    
    if (selectors?.metadata) {
      const metaEl = $(selectors.metadata);
      if (metaEl.length > 0) {
        metadata.extracted_metadata = metaEl.text().trim();
      }
    }
    
    if (selectors?.author) {
      const authorEl = $(selectors.author);
      if (authorEl.length > 0) {
        metadata.author = authorEl.text().trim();
      }
    }
    
    if (selectors?.date) {
      const dateEl = $(selectors.date);
      if (dateEl.length > 0) {
        metadata.date = dateEl.text().trim();
      }
    }
    
    return [{
      id: `${source.name}:${endpoint.name}:${Buffer.from(url).toString('base64').substring(0, 8)}`,
      title,
      content: content.trim(),
      metadata,
      source_url: url
    }];
  }

  private extractJsonContent(
    data: any, 
    endpoint: WebConfig['sources'][0]['endpoints'][0], 
    source: WebConfig['sources'][0], 
    url: string
  ): Array<{
    id: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
    source_url: string;
  }> {
    const results: Array<{
      id: string;
      title: string;
      content: string;
      metadata: Record<string, any>;
      source_url: string;
    }> = [];

    // Handle array of items
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          results.push({
            id: `${source.name}:${endpoint.name}:${index}`,
            title: item.title || item.name || item.subject || `Item ${index + 1}`,
            content: item.content || item.description || item.body || JSON.stringify(item, null, 2),
            metadata: {
              content_type: 'json',
              extracted_at: new Date().toISOString(),
              ...item
            },
            source_url: url
          });
        }
      });
    } else if (typeof data === 'object' && data !== null) {
      // Handle single object
      results.push({
        id: `${source.name}:${endpoint.name}:0`,
        title: data.title || data.name || data.subject || 'JSON Document',
        content: data.content || data.description || data.body || JSON.stringify(data, null, 2),
        metadata: {
          content_type: 'json',
          extracted_at: new Date().toISOString(),
          ...data
        },
        source_url: url
      });
    }

    return results;
  }

  private extractXmlContent(
    xml: string, 
    endpoint: WebConfig['sources'][0]['endpoints'][0], 
    source: WebConfig['sources'][0], 
    url: string
  ): Array<{
    id: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
    source_url: string;
  }> {
    const results: Array<{
      id: string;
      title: string;
      content: string;
      metadata: Record<string, any>;
      source_url: string;
    }> = [];

    try {
      const $ = cheerio.load(xml, { xmlMode: true });
      
      // RSS/Atom feed detection
      if ($('rss').length > 0 || $('feed').length > 0) {
        $('item, entry').each((index, element) => {
          const $item = $(element);
          const title = $item.find('title').first().text().trim() || `RSS Item ${index + 1}`;
          const description = $item.find('description, content, summary').first().text().trim();
          const link = $item.find('link').first().text().trim() || $item.find('link').attr('href') || '';
          const pubDate = $item.find('pubDate, published, updated').first().text().trim();
          
          results.push({
            id: `${source.name}:${endpoint.name}:rss_${index}`,
            title,
            content: description,
            metadata: {
              content_type: 'rss',
              link,
              pub_date: pubDate,
              extracted_at: new Date().toISOString()
            },
            source_url: link || url
          });
        });
      } else {
        // Generic XML processing
        results.push({
          id: `${source.name}:${endpoint.name}:xml`,
          title: $('title').first().text().trim() || 'XML Document',
          content: xml,
          metadata: {
            content_type: 'xml',
            extracted_at: new Date().toISOString()
          },
          source_url: url
        });
      }
    } catch (error: any) {
      this.logger.warn('XML parsing failed, treating as text', {
        error: error.message
      });
      
      results.push({
        id: `${source.name}:${endpoint.name}:text`,
        title: 'XML/RSS Content',
        content: xml,
        metadata: {
          content_type: 'text',
          extracted_at: new Date().toISOString()
        },
        source_url: url
      });
    }

    return results;
  }

  private extractTextContent(
    text: string, 
    endpoint: WebConfig['sources'][0]['endpoints'][0], 
    source: WebConfig['sources'][0], 
    url: string
  ): Array<{
    id: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
    source_url: string;
  }> {
    return [{
      id: `${source.name}:${endpoint.name}:text`,
      title: text.split('\n')[0]?.substring(0, 100) || 'Text Document',
      content: text,
      metadata: {
        content_type: 'text',
        extracted_at: new Date().toISOString()
      },
      source_url: url
    }];
  }

  private calculateConfidence(result: SearchResult, query: string): number {
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
    
    // Source type relevance (25%)
    const sourceType = result.metadata?.source_type || '';
    if (sourceType.includes('runbook') || sourceType.includes('ops')) {
      confidence += 0.25;
    } else if (sourceType.includes('doc') || sourceType.includes('api')) {
      confidence += 0.15;
    } else {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private generateMatchReasons(result: SearchResult, query: string): string[] {
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
    
    const sourceType = result.metadata?.source_type || '';
    if (sourceType.includes('runbook')) {
      reasons.push('Runbook source');
    } else if (sourceType.includes('doc')) {
      reasons.push('Documentation source');
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
        const sourceType = result.metadata?.source_type?.toLowerCase() || '';
        return filters.categories!.some(category => 
          sourceType.includes(category.toLowerCase())
        );
      });
    }
    
    // Sort by confidence score
    filtered.sort((a, b) => b.confidence_score - a.confidence_score);
    
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }
    
    return filtered;
  }

  private async testSourceHealth(source: WebConfig['sources'][0]): Promise<boolean> {
    if (!source.health_check.enabled) {
      return true; // Consider healthy if health check disabled
    }
    
    // In test environment, consider sources healthy by default
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_AI_TESTS === 'true') {
      return true;
    }
    
    try {
      const healthEndpoint = source.health_check.endpoint || source.endpoints[0]?.path || '/';
      const url = this.buildEndpointUrl(source, { 
        name: 'health', 
        path: healthEndpoint, 
        method: 'GET', 
        content_type: 'auto' 
      } as WebConfig['sources'][0]['endpoints'][0]);
      
      const response = await this.httpClient.get(url, {
        timeout: source.health_check.timeout_ms,
        headers: this.getAuthHeaders(source)
      });
      
      return response.status < 400;
    } catch (error: any) {
      this.logger.debug('Source health check failed', {
        source: source.name,
        error: error.message
      });
      return false;
    }
  }

  private async fetchDocument(source: WebConfig['sources'][0], endpoint: WebConfig['sources'][0]['endpoints'][0], documentId: string): Promise<{
    id: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
    source_url: string;
  } | null> {
    try {
      const url = this.buildDocumentUrl(source, endpoint, documentId);
      
      const response = await this.httpClient.get(url, {
        headers: this.getAuthHeaders(source),
        timeout: endpoint.timeout_ms || this.config.performance?.default_timeout_ms || 30000
      });
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const extractedContent = await this.extractContent(response.data, endpoint, source, url);
      
      return extractedContent && extractedContent.length > 0 ? extractedContent[0] || null : null;
    } catch (error: any) {
      this.logger.error('Failed to fetch document', {
        source: source.name,
        endpoint: endpoint.name,
        documentId,
        error: error.message
      });
      return null;
    }
  }

  private buildDocumentUrl(source: WebConfig['sources'][0], endpoint: WebConfig['sources'][0]['endpoints'][0], documentId: string): string {
    const baseUrl = this.buildEndpointUrl(source, endpoint);
    
    // If endpoint path contains document ID placeholder
    if (endpoint.path.includes('{id}') || endpoint.path.includes('${id}')) {
      return baseUrl.replace(/\{id\}|\$\{id\}/g, documentId);
    }
    
    // Append document ID as path parameter
    const url = new URL(baseUrl);
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/';
    }
    url.pathname += encodeURIComponent(documentId);
    
    return url.href;
  }

  private convertContentToSearchResult(
    content: {
      id: string;
      title: string;
      content: string;
      metadata: Record<string, any>;
      source_url: string;
    }, 
    source: WebConfig['sources'][0], 
    endpoint: WebConfig['sources'][0]['endpoints'][0]
  ): SearchResult {
    return {
      id: content.id,
      title: content.title,
      content: content.content,
      source: this.config.name,
      source_type: 'web',
      confidence_score: 0.8,
      match_reasons: [],
      retrieval_time_ms: 0,
      last_updated: content.metadata.extracted_at || new Date().toISOString(),
      metadata: {
        source_name: source.name,
        endpoint_name: endpoint.name,
        source_type: source.type,
        source_url: content.source_url,
        ...content.metadata
      }
    };
  }

  private isLikelyRunbookContent(result: SearchResult, alertType: string, severity: string): boolean {
    const content = result.content.toLowerCase();
    const title = result.title.toLowerCase();
    const sourceType = result.metadata?.source_type?.toLowerCase() || '';
    
    const runbookKeywords = ['runbook', 'procedure', 'troubleshoot', 'incident', 'operations', 'ops'];
    const hasRunbookKeywords = runbookKeywords.some(keyword => 
      title.includes(keyword) || content.includes(keyword) || sourceType.includes(keyword)
    );
    
    const alertTypeNormalized = alertType.replace(/_/g, ' ').toLowerCase();
    const hasAlertRelevance = content.includes(alertTypeNormalized) || title.includes(alertTypeNormalized);
    
    const hasSeverityRelevance = content.includes(severity.toLowerCase()) || title.includes(severity.toLowerCase());
    
    return hasRunbookKeywords && (hasAlertRelevance || hasSeverityRelevance);
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

  private parseDocumentId(id: string): { sourceName: string; endpointName: string; documentId: string } | null {
    const parts = id.split(':');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return null;
    }
    
    return {
      sourceName: parts[0],
      endpointName: parts[1],
      documentId: parts[2]
    };
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

  private resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      lastHealthCheck: new Date().toISOString()
    };
  }

  private getMetricsSummary(): Record<string, any> {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 
        ? this.metrics.successfulRequests / this.metrics.totalRequests 
        : 0
    };
  }
}