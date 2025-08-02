/**
 * Web Adapter for Personal Pipeline MCP Server
 * 
 * Provides web crawling and content extraction capabilities with
 * responsible crawling practices, rate limiting, and robots.txt compliance.
 */

import { SourceAdapter } from './base.js';
import {
  SourceConfig,
  SearchResult,
  SearchFilters,
  HealthCheck,
  Runbook,
  ConfidenceScore,
  DocumentCategory,
} from '../types/index.js';
import * as cheerio from 'cheerio';
// @ts-ignore
import got from 'got';
// @ts-ignore
const { HTTPError } = got;
import pLimit from 'p-limit';
import robotsParser from 'robots-parser';
import normalizeUrl from 'normalize-url';
import Fuse from 'fuse.js';
import NodeCache from 'node-cache';
import { URL } from 'url';
import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';

// Use the winston logger instance

// ============================================================================
// Types and Interfaces
// ============================================================================

interface WebConfig extends SourceConfig {
  type: 'web';
  base_urls: string[];
  max_depth?: number;
  url_patterns?: {
    include?: string[];
    exclude?: string[];
  };
  rate_limit?: {
    requests_per_second?: number;
    concurrent_requests?: number;
  };
  content_selectors?: {
    main?: string;
    title?: string;
    exclude?: string[];
  };
  cache_ttl?: string;
  respect_robots_txt?: boolean;
  user_agent?: string;
  max_urls_per_domain?: number;
}

interface CrawlResult {
  url: string;
  content: string;
  title: string;
  metadata: {
    description?: string;
    author?: string;
    keywords?: string[];
    lastModified?: string;
  };
  links: string[];
  depth: number;
}

interface IndexedDocument {
  id: string;
  url: string;
  title: string;
  content: string;
  category: DocumentCategory;
  metadata: Record<string, any>;
  lastIndexed: string;
  runbookIndicators: {
    hasNumberedSteps: boolean;
    hasProcedureKeywords: boolean;
    hasCommands: boolean;
    confidence: number;
  } | undefined;
}

interface URLQueueItem {
  url: string;
  depth: number;
  referrer?: string;
}

// ============================================================================
// Error Classes
// ============================================================================

class WebAdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public url?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'WebAdapterError';
  }
}

// WebCrawlError removed - using base WebAdapterError

class WebAuthenticationError extends WebAdapterError {
  constructor(message: string, url: string) {
    super(message, 'AUTH_ERROR', url, 401);
    this.name = 'WebAuthenticationError';
  }
}

class WebRateLimitError extends WebAdapterError {
  constructor(message: string, url: string) {
    super(message, 'RATE_LIMIT_ERROR', url, 429);
    this.name = 'WebRateLimitError';
  }
}

// WebContentExtractionError removed - using base WebAdapterError

// ============================================================================
// Main WebAdapter Class
// ============================================================================

export class WebAdapter extends SourceAdapter {
  protected override config: WebConfig;
  private httpClient: any;
  private urlCache: Set<string>;
  private contentCache: NodeCache;
  private robotsCache: Map<string, any>;
  private indexedDocuments: Map<string, IndexedDocument>;
  private fuseIndex?: Fuse<IndexedDocument>;
  private crawlQueue: URLQueueItem[];
  private rateLimiter?: ReturnType<typeof pLimit>;
  private crawlStartTime?: Date;
  private stats: {
    urlsCrawled: number;
    urlsSkipped: number;
    errors: number;
    totalResponseTime: number;
  };

  constructor(config: WebConfig) {
    super(config);
    this.config = this.normalizeConfig(config);
    
    // Initialize HTTP client with conservative defaults  
    this.httpClient = got.extend({
      timeout: {
        request: 30000, // 30 seconds
      },
      retry: {
        limit: 2,
        methods: ['GET'],
      },
      headers: {
        'User-Agent': this.config.user_agent || 'PersonalPipeline-MCP/1.0 (Documentation Indexer)',
      },
      followRedirect: true,
      maxRedirects: 5,
    });

    // Initialize caches and state
    this.urlCache = new Set();
    this.contentCache = new NodeCache({
      stdTTL: this.parseCacheTTL(this.config.cache_ttl || '1h'),
      checkperiod: 600, // Check for expired keys every 10 minutes
    });
    this.robotsCache = new Map();
    this.indexedDocuments = new Map();
    this.crawlQueue = [];
    this.stats = {
      urlsCrawled: 0,
      urlsSkipped: 0,
      errors: 0,
      totalResponseTime: 0,
    };
  }

  private normalizeConfig(config: WebConfig): WebConfig {
    return {
      ...config,
      max_depth: config.max_depth ?? 1,
      rate_limit: {
        requests_per_second: config.rate_limit?.requests_per_second ?? 2,
        concurrent_requests: config.rate_limit?.concurrent_requests ?? 3,
      },
      respect_robots_txt: config.respect_robots_txt ?? true,
      max_urls_per_domain: config.max_urls_per_domain ?? 100,
    };
  }

  private parseCacheTTL(ttl: string | undefined): number {
    if (!ttl) return 3600; // Default 1 hour
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const [, value, unit] = match;
    if (!value || !unit) return 3600; // Default 1 hour
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return parseInt(value) * multipliers[unit as keyof typeof multipliers];
  }

  // ============================================================================
  // SourceAdapter Implementation
  // ============================================================================

  async initialize(): Promise<void> {
    logger.info('Initializing WebAdapter', { name: this.config.name });

    // Set up rate limiter
    this.rateLimiter = pLimit(this.config.rate_limit!.concurrent_requests!);

    // Set up authentication if configured
    if (this.config.auth) {
      await this.configureAuthentication();
    }

    // Initialize crawl queue with base URLs
    this.crawlQueue = this.config.base_urls.map(url => ({
      url: normalizeUrl(url),
      depth: 0,
    }));

    this.isInitialized = true;
    logger.info('WebAdapter initialized successfully');
  }

  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new WebAdapterError('Adapter not initialized', 'NOT_INITIALIZED');
    }

    // Ensure index is built
    if (!this.fuseIndex) {
      await this.buildSearchIndex();
    }

    // Perform fuzzy search
    const fuseResults = this.fuseIndex!.search(query, {
      limit: filters?.limit || 20,
    });

    // Transform results
    const results = fuseResults.map(result => this.transformToSearchResult(result.item, result.score || 0));

    // Apply category filter if specified
    if (filters?.category) {
      return results.filter(r => r.category === filters.category);
    }

    // Apply confidence threshold (lowered default for better fuzzy search)
    const threshold = filters?.min_confidence || 0.3;
    return results.filter(r => r.confidence_score >= threshold);
  }

  async getDocument(id: string): Promise<SearchResult | null> {
    const doc = this.indexedDocuments.get(id);
    if (!doc) return null;

    return this.transformToSearchResult(doc, 1.0);
  }

  async searchRunbooks(
    alertType: string,
    severity: string,
    affectedSystems: string[]
  ): Promise<Runbook[]> {
    // Build runbook-specific search query
    const searchTerms = [
      alertType,
      severity,
      ...affectedSystems,
      'runbook',
      'procedure',
      'troubleshoot',
      'steps',
      'resolve',
    ].join(' ');

    const results = await this.search(searchTerms, {
      category: 'runbook',
      min_confidence: 0.6,
    });

    // Extract runbooks from search results
    const runbooks: Runbook[] = [];
    for (const result of results) {
      const runbook = await this.extractRunbookFromContent(result);
      if (runbook) {
        runbooks.push(runbook);
      }
    }

    return runbooks;
  }

  async healthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    const health: HealthCheck = {
      source_name: this.config.name,
      healthy: true,
      response_time_ms: 0,
      last_check: new Date().toISOString(),
      metadata: {},
    };

    try {
      // Check if we can reach at least one base URL
      const testUrl = this.config.base_urls[0];
      if (!testUrl) {
        throw new Error('No base URLs configured');
      }
      await this.httpClient.head(testUrl, { timeout: { request: 5000 } });

      health.metadata = {
        urls_crawled: this.stats.urlsCrawled,
        documents_indexed: this.indexedDocuments.size,
        cache_size: this.contentCache.keys().length,
        avg_response_time: this.stats.urlsCrawled > 0
          ? Math.round(this.stats.totalResponseTime / this.stats.urlsCrawled)
          : 0,
      };
    } catch (error) {
      health.healthy = false;
      health.error_message = error instanceof Error ? error.message : 'Health check failed';
    }

    health.response_time_ms = Date.now() - startTime;
    return health;
  }

  async refreshIndex(force?: boolean): Promise<boolean> {
    try {
      if (!force && this.indexedDocuments.size > 0) {
        logger.info('Using cached index', { documents: this.indexedDocuments.size });
        return true;
      }

      logger.info('Starting web crawl', {
        urls: this.config.base_urls,
        max_depth: this.config.max_depth,
      });

      // Reset state for new crawl
      this.urlCache.clear();
      this.crawlQueue = this.config.base_urls.map(url => ({
        url: normalizeUrl(url),
        depth: 0,
      }));
      this.crawlStartTime = new Date();

      // Crawl all URLs in queue
      await this.crawl();

      // Rebuild search index
      await this.buildSearchIndex();

      logger.info('Web crawl completed', {
        urls_crawled: this.stats.urlsCrawled,
        documents_indexed: this.indexedDocuments.size,
        duration_ms: Date.now() - this.crawlStartTime.getTime(),
      });

      return true;
    } catch (error) {
      logger.error('Failed to refresh index', { error });
      return false;
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
      documentCount: this.indexedDocuments.size,
      lastIndexed: this.crawlStartTime?.toISOString() || 'never',
      avgResponseTime: this.stats.urlsCrawled > 0
        ? Math.round(this.stats.totalResponseTime / this.stats.urlsCrawled)
        : 0,
      successRate: this.stats.urlsCrawled > 0
        ? (this.stats.urlsCrawled - this.stats.errors) / this.stats.urlsCrawled
        : 0,
    };
  }

  override async cleanup(): Promise<void> {
    this.contentCache.flushAll();
    this.urlCache.clear();
    this.robotsCache.clear();
    this.indexedDocuments.clear();
    this.fuseIndex = undefined as any;
    await super.cleanup();
  }

  // ============================================================================
  // Crawling Implementation
  // ============================================================================

  private async crawl(): Promise<void> {
    const requestsPerSecond = this.config.rate_limit!.requests_per_second!;
    const minInterval = 1000 / requestsPerSecond;
    let lastRequestTime = 0;

    while (this.crawlQueue.length > 0 && this.urlCache.size < this.config.max_urls_per_domain!) {
      const batch = this.crawlQueue.splice(0, this.config.rate_limit!.concurrent_requests!);
      
      const promises = batch.map(async (item) => {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < minInterval) {
          await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest));
        }
        lastRequestTime = Date.now();

        return this.rateLimiter!(async () => {
          await this.crawlURL(item);
        });
      });

      await Promise.all(promises);
    }
  }

  private async crawlURL(item: URLQueueItem): Promise<void> {
    const { url, depth } = item;

    // Skip if already crawled
    if (this.urlCache.has(url)) {
      this.stats.urlsSkipped++;
      return;
    }

    // Check URL patterns
    if (!this.shouldCrawlURL(url)) {
      this.stats.urlsSkipped++;
      return;
    }

    // Check robots.txt
    if (this.config.respect_robots_txt && !(await this.isAllowedByRobots(url))) {
      logger.debug('URL blocked by robots.txt', { url });
      this.stats.urlsSkipped++;
      return;
    }

    try {
      // Mark as visited
      this.urlCache.add(url);

      // Fetch content
      const startTime = Date.now();
      const response = await this.httpClient.get(url);
      this.stats.totalResponseTime += Date.now() - startTime;
      this.stats.urlsCrawled++;

      // Extract content
      const crawlResult = await this.extractContent(response.body, url, depth);

      // Index the document
      await this.indexDocument(crawlResult);

      // Add discovered links to queue if within depth limit
      if (depth < this.config.max_depth!) {
        const newLinks = crawlResult.links
          .filter(link => !this.urlCache.has(link))
          .slice(0, 10); // Limit new links per page

        for (const link of newLinks) {
          this.crawlQueue.push({
            url: link,
            depth: depth + 1,
            referrer: url,
          });
        }
      }
    } catch (err) {
      this.stats.errors++;
      
      // Type-safe error handling
      const error = err as Error | any;
      
      if (error && error.response && error.response.statusCode) {
        if (error.response.statusCode === 429) {
          throw new WebRateLimitError('Rate limit exceeded', url);
        } else if (error.response.statusCode === 401 || error.response.statusCode === 403) {
          throw new WebAuthenticationError('Authentication failed', url);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to crawl URL', { url, error: errorMessage });
    }
  }

  private shouldCrawlURL(url: string): boolean {
    // Check include patterns
    if (this.config.url_patterns?.include) {
      const matches = this.config.url_patterns.include.some(pattern =>
        new RegExp(pattern).test(url)
      );
      if (!matches) return false;
    }

    // Check exclude patterns
    if (this.config.url_patterns?.exclude) {
      const matches = this.config.url_patterns.exclude.some(pattern =>
        new RegExp(pattern).test(url)
      );
      if (matches) return false;
    }

    return true;
  }

  private async isAllowedByRobots(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

      if (!this.robotsCache.has(robotsUrl)) {
        try {
          const response = await this.httpClient.get(robotsUrl);
          const robots = (robotsParser as any)(robotsUrl, response.body);
          this.robotsCache.set(robotsUrl, robots);
        } catch {
          // If robots.txt doesn't exist, allow crawling
          return true;
        }
      }

      const robots = this.robotsCache.get(robotsUrl);
      return robots ? robots.isAllowed(url, this.config.user_agent) : true;
    } catch {
      return true;
    }
  }

  // ============================================================================
  // Content Extraction
  // ============================================================================

  private async extractContent(html: string, url: string, depth: number): Promise<CrawlResult> {
    const $ = cheerio.load(html);

    // Remove noise elements
    this.removeNoiseElements($);

    // Extract content based on selectors or auto-detection
    const content = this.extractMainContent($);
    const title = this.extractTitle($, url);
    const metadata = this.extractMetadata($);
    const links = this.extractLinks($, url);

    return {
      url,
      content,
      title,
      metadata,
      links,
      depth,
    };
  }

  private removeNoiseElements($: cheerio.Root): void {
    // Remove common noise elements
    const noiseSelectors = [
      'script',
      'style',
      'noscript',
      'iframe',
      'svg',
      'path',
      ...(this.config.content_selectors?.exclude || []),
    ];

    noiseSelectors.forEach(selector => {
      $(selector).remove();
    });

    // Remove common navigation/advertisement patterns
    $('[class*="nav"]').remove();
    $('[class*="menu"]').remove();
    $('[class*="sidebar"]').remove();
    $('[class*="footer"]').remove();
    $('[class*="header"]').remove();
    $('[class*="advertisement"]').remove();
    $('[class*="banner"]').remove();
  }

  private extractMainContent($: cheerio.Root): string {
    // Use configured selector if available
    if (this.config.content_selectors?.main) {
      const content = $(this.config.content_selectors.main).text();
      if (content.trim()) return content.trim();
    }

    // Auto-detection: Find the element with the most text content
    const contentBlocks = $('article, main, [role="main"], .content, #content, .post, .entry');
    
    if (contentBlocks.length > 0) {
      let maxLength = 0;
      let bestContent = '';

      contentBlocks.each((_, elem) => {
        const text = $(elem).text().trim();
        if (text.length > maxLength) {
          maxLength = text.length;
          bestContent = text;
        }
      });

      if (bestContent) return bestContent;
    }

    // Fallback: Get all paragraph text
    const paragraphs = $('p').map((_, el) => $(el).text().trim()).get();
    return paragraphs.filter(p => p.length > 50).join('\n\n');
  }

  private extractTitle($: cheerio.Root, url: string): string {
    // Use configured selector if available
    if (this.config.content_selectors?.title) {
      const title = $(this.config.content_selectors.title).text();
      if (title.trim()) return title.trim();
    }

    // Try common title selectors
    const titleSelectors = [
      'h1',
      'title',
      '[class*="title"]',
      'meta[property="og:title"]',
    ];

    for (const selector of titleSelectors) {
      const title = selector.startsWith('meta')
        ? $(selector).attr('content')
        : $(selector).first().text();
      
      if (title?.trim()) return title.trim();
    }

    // Fallback to URL
    return new URL(url).pathname.split('/').pop() || 'Untitled';
  }

  private extractMetadata($: cheerio.Root): CrawlResult['metadata'] {
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content');
    const author = $('meta[name="author"]').attr('content');
    const keywordsAttr = $('meta[name="keywords"]').attr('content');
    const lastModified = $('meta[name="last-modified"]').attr('content') ||
                        $('meta[property="article:modified_time"]').attr('content');

    const metadata: CrawlResult['metadata'] = {};
    if (description) metadata.description = description;
    if (author) metadata.author = author;
    if (keywordsAttr) metadata.keywords = keywordsAttr.split(',').map(k => k.trim());
    if (lastModified) metadata.lastModified = lastModified;
    
    return metadata;
  }

  private extractLinks($: cheerio.Root, baseUrl: string): string[] {
    const links: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (!href) return;

      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(href, baseUrl).toString();
        const urlObj = new URL(absoluteUrl);

        // Only include links from the same domain
        if (urlObj.hostname === baseUrlObj.hostname) {
          links.push(normalizeUrl(absoluteUrl));
        }
      } catch {
        // Invalid URL, skip
      }
    });

    return [...new Set(links)]; // Remove duplicates
  }

  // ============================================================================
  // Document Indexing
  // ============================================================================

  private async indexDocument(crawlResult: CrawlResult): Promise<void> {
    const documentId = this.generateDocumentId(crawlResult.url);
    const category = this.detectDocumentCategory(crawlResult);
    const runbookIndicators = this.detectRunbookIndicators(crawlResult);

    const document: IndexedDocument = {
      id: documentId,
      url: crawlResult.url,
      title: crawlResult.title,
      content: crawlResult.content,
      category,
      metadata: {
        ...crawlResult.metadata,
        depth: crawlResult.depth,
        contentLength: crawlResult.content.length,
      },
      lastIndexed: new Date().toISOString(),
      runbookIndicators: runbookIndicators || undefined,
    };

    this.indexedDocuments.set(documentId, document);

    // Cache the content
    this.contentCache.set(documentId, document);
  }

  private generateDocumentId(url: string): string {
    return createHash('sha256').update(url).digest('hex').substring(0, 16);
  }

  private detectDocumentCategory(crawlResult: CrawlResult): DocumentCategory {
    const { url, title, content } = crawlResult;
    const lowerContent = content.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // Check for runbook indicators
    if (
      lowerUrl.includes('runbook') ||
      lowerUrl.includes('procedure') ||
      lowerUrl.includes('troubleshoot') ||
      lowerTitle.includes('runbook') ||
      lowerTitle.includes('procedure') ||
      lowerContent.includes('step 1') ||
      lowerContent.includes('troubleshooting steps')
    ) {
      return 'runbook';
    }

    // Check for API documentation
    if (
      lowerUrl.includes('api') ||
      lowerTitle.includes('api') ||
      lowerContent.includes('endpoint') ||
      lowerContent.includes('request') && lowerContent.includes('response')
    ) {
      return 'api';
    }

    // Check for guides
    if (
      lowerUrl.includes('guide') ||
      lowerUrl.includes('tutorial') ||
      lowerTitle.includes('guide') ||
      lowerTitle.includes('how to')
    ) {
      return 'guide';
    }

    return 'general';
  }

  private detectRunbookIndicators(crawlResult: CrawlResult): IndexedDocument['runbookIndicators'] {
    const { content } = crawlResult;

    const indicators = {
      hasNumberedSteps: /step \d+|^\d+\./gm.test(content),
      hasProcedureKeywords: /procedure|troubleshoot|resolve|fix|diagnose|investigate/i.test(content),
      hasCommands: /```|`[^`]+`|^\$\s+|^>\s+/gm.test(content),
      confidence: 0,
    };

    // Calculate confidence score
    let confidence = 0;
    if (indicators.hasNumberedSteps) confidence += 0.4;
    if (indicators.hasProcedureKeywords) confidence += 0.3;
    if (indicators.hasCommands) confidence += 0.3;

    indicators.confidence = Math.min(confidence, 1.0);

    return indicators;
  }

  // ============================================================================
  // Search Implementation
  // ============================================================================

  private async buildSearchIndex(): Promise<void> {
    const documents = Array.from(this.indexedDocuments.values());

    this.fuseIndex = new Fuse(documents, {
      keys: [
        { name: 'title', weight: 0.3 },
        { name: 'content', weight: 0.5 },
        { name: 'url', weight: 0.1 },
        { name: 'metadata.keywords', weight: 0.1 },
      ],
      threshold: 0.5, // More lenient matching (higher = more lenient)
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2, // Allow shorter matches
    });
  }

  private transformToSearchResult(doc: IndexedDocument, fuseScore: number): SearchResult {
    // Convert Fuse score (0 = perfect match, 1 = no match) to confidence score
    const confidence = 1 - fuseScore;

    return {
      id: doc.id,
      source: this.config.name,
      source_name: this.config.name,
      source_type: 'web',
      title: doc.title,
      content: doc.content.substring(0, 1000), // Limit content in search results
      url: doc.url,
      category: doc.category,
      confidence_score: confidence as ConfidenceScore,
      match_reasons: this.generateMatchReasons(doc),
      retrieval_time_ms: 0, // Will be set by caller
      last_updated: doc.lastIndexed,
      metadata: {
        ...doc.metadata,
        extracted_at: doc.lastIndexed,
      },
    };
  }

  private generateMatchReasons(doc: IndexedDocument): string[] {
    const reasons: string[] = [];

    if (doc.category === 'runbook') {
      reasons.push('Document identified as runbook');
    }

    if (doc.runbookIndicators && doc.runbookIndicators.hasNumberedSteps) {
      reasons.push('Contains numbered procedure steps');
    }

    if (doc.runbookIndicators && doc.runbookIndicators.hasProcedureKeywords) {
      reasons.push('Contains troubleshooting keywords');
    }

    if (doc.runbookIndicators && doc.runbookIndicators.hasCommands) {
      reasons.push('Contains executable commands');
    }

    return reasons;
  }

  // ============================================================================
  // Runbook Extraction
  // ============================================================================

  private async extractRunbookFromContent(result: SearchResult): Promise<Runbook | null> {
    try {
      // This is a simplified extraction - in production, would use more sophisticated parsing
      const procedures = this.extractProcedureSteps(result.content);
      
      if (procedures.length === 0) return null;

      const runbook: Runbook = {
        id: result.id,
        title: result.title,
        version: '1.0.0',
        description: result.content.substring(0, 200),
        triggers: this.extractTriggers(result.content),
        severity_mapping: {
          critical: 'critical',
          high: 'high',
          medium: 'medium',
          low: 'low',
          info: 'info',
        },
        decision_tree: {
          id: `dt-${result.id}`,
          name: 'Default Decision Tree',
          description: 'Extracted from web content',
          branches: [],
          default_action: 'Follow documented procedures',
        },
        procedures,
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'WebAdapter',
          confidence_score: result.confidence_score,
        },
      };

      return runbook;
    } catch (error) {
      logger.error('Failed to extract runbook', { error, result_id: result.id });
      return null;
    }
  }

  private extractProcedureSteps(content: string): Runbook['procedures'] {
    const steps: Runbook['procedures'] = [];
    
    // Look for numbered steps
    const stepMatches = content.matchAll(/(?:step\s+)?(\d+)[.)]\s*([^\n]+)/gi);
    
    let stepNumber = 1;
    for (const match of stepMatches) {
      steps.push({
        id: `step-${stepNumber}`,
        name: `Step ${stepNumber}`,
        description: match[2]?.trim() || 'Step description',
        expected_outcome: 'Step completed successfully',
      });
      stepNumber++;
    }

    return steps;
  }

  private extractTriggers(content: string): string[] {
    const triggers: string[] = [];
    
    // Common alert patterns
    const alertPatterns = [
      /alert[:\s]+([^\n.]+)/gi,
      /error[:\s]+([^\n.]+)/gi,
      /warning[:\s]+([^\n.]+)/gi,
      /when[:\s]+([^\n.]+)/gi,
    ];

    for (const pattern of alertPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          triggers.push(match[1].trim().toLowerCase().replace(/\s+/g, '_'));
        }
      }
    }

    return [...new Set(triggers)].slice(0, 5); // Limit to 5 unique triggers
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  private async configureAuthentication(): Promise<void> {
    if (!this.config.auth) return;

    const auth = this.config.auth;

    switch (auth.type) {
      case 'basic':
        if ('credentials' in auth && auth.credentials?.username && auth.credentials?.password) {
          this.httpClient = this.httpClient.extend({
            username: auth.credentials.username,
            password: auth.credentials.password,
          });
        }
        break;

      case 'bearer':
        if ('credentials' in auth && auth.credentials?.token) {
          this.httpClient = this.httpClient.extend({
            headers: {
              Authorization: `Bearer ${auth.credentials.token}`,
            },
          });
        }
        break;

      case 'cookie':
        if ('credentials' in auth && auth.credentials?.cookie) {
          this.httpClient = this.httpClient.extend({
            headers: {
              Cookie: auth.credentials.cookie,
            },
          });
        }
        break;
        
      // Handle other auth types if needed
      default:
        logger.warn('Unsupported authentication type for WebAdapter', { type: auth.type });
        break;
    }
  }

  // ============================================================================
  // Base Class Method Implementations
  // ============================================================================

  /**
   * Check if the adapter is properly initialized
   * Explicit override for Jest compatibility
   */
  override isReady(): boolean {
    return this.isInitialized;
  }
}