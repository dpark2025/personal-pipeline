/**
 * URL Manager - Intelligent URL construction and management for web sources
 *
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 *
 * Features:
 * - Smart URL construction and validation
 * - Template-based URL generation with parameter substitution
 * - Pagination support for multi-page content
 * - URL normalization and canonicalization
 * - Sitemap discovery and crawling guidance
 * - Link resolution and validation
 */

import { Logger } from 'winston';
import { WebSource, WebEndpoint, PaginationConfig } from './web-adapter.js';

export interface UrlTemplate {
  pattern: string;
  parameters: string[];
  examples: string[];
}

export interface PaginatedUrls {
  urls: string[];
  hasMore: boolean;
  nextCursor?: string;
  totalPages?: number;
}

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  issues: string[];
  suggestions: string[];
}

/**
 * URL construction and management for web sources
 */
export class UrlManager {
  private logger: Logger;
  private sources: WebSource[];

  // URL templates and patterns
  private urlTemplates = new Map<string, UrlTemplate>();
  private baseUrlCache = new Map<string, URL>();

  // Pagination state tracking
  private paginationState = new Map<
    string,
    {
      currentPage: number;
      totalPages?: number;
      nextCursor?: string;
      hasMore: boolean;
    }
  >();

  constructor(sources: WebSource[], logger: Logger) {
    this.sources = sources;
    this.logger = logger.child({ component: 'UrlManager' });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing URL manager', {
      sourceCount: this.sources.length,
    });

    // Validate and cache base URLs
    for (const source of this.sources) {
      try {
        const baseUrl = new URL(source.base_url);
        this.baseUrlCache.set(source.name, baseUrl);

        this.logger.debug('Base URL validated', {
          source: source.name,
          baseUrl: source.base_url,
        });
      } catch (error: any) {
        this.logger.error('Invalid base URL', {
          source: source.name,
          baseUrl: source.base_url,
          error: error.message,
        });
        throw new Error(`Invalid base URL for source ${source.name}: ${error.message}`);
      }
    }

    // Initialize URL templates
    this.initializeUrlTemplates();

    this.logger.info('URL manager initialized successfully');
  }

  buildEndpointUrl(
    source: WebSource,
    endpoint: WebEndpoint,
    params?: Record<string, string>
  ): string {
    try {
      const baseUrl = this.baseUrlCache.get(source.name);
      if (!baseUrl) {
        throw new Error(`Base URL not found for source: ${source.name}`);
      }

      // Handle absolute URLs in endpoint path
      if (endpoint.path.startsWith('http://') || endpoint.path.startsWith('https://')) {
        return this.processUrlTemplate(endpoint.path, params);
      }

      // Construct URL from base + path
      const url = new URL(endpoint.path, baseUrl);

      // Apply parameter substitution
      const finalUrl = this.processUrlTemplate(url.href, params);

      this.logger.debug('Built endpoint URL', {
        source: source.name,
        endpoint: endpoint.name,
        url: finalUrl,
        params,
      });

      return finalUrl;
    } catch (error: any) {
      this.logger.error('Failed to build endpoint URL', {
        source: source.name,
        endpoint: endpoint.name,
        error: error.message,
      });
      throw error;
    }
  }

  buildHealthCheckUrl(source: WebSource, healthPath: string): string {
    try {
      const baseUrl = this.baseUrlCache.get(source.name);
      if (!baseUrl) {
        throw new Error(`Base URL not found for source: ${source.name}`);
      }

      const url = new URL(healthPath, baseUrl);
      return url.href;
    } catch (error: any) {
      this.logger.error('Failed to build health check URL', {
        source: source.name,
        healthPath,
        error: error.message,
      });
      throw error;
    }
  }

  buildDocumentUrl(source: WebSource, endpoint: WebEndpoint, documentId: string): string {
    try {
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
    } catch (error: any) {
      this.logger.error('Failed to build document URL', {
        source: source.name,
        endpoint: endpoint.name,
        documentId,
        error: error.message,
      });
      throw error;
    }
  }

  generatePaginatedUrls(
    source: WebSource,
    endpoint: WebEndpoint,
    pagination: PaginationConfig,
    startPage = 1,
    maxPages = 10
  ): PaginatedUrls {
    try {
      const baseUrl = this.buildEndpointUrl(source, endpoint);
      const _urls: string[] = []; // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars

      const stateKey = `${source.name}:${endpoint.name}`;
      const state = this.paginationState.get(stateKey) || {
        currentPage: startPage,
        hasMore: true,
      };

      switch (pagination.type) {
        case 'page_number':
          return this.generatePageNumberUrls(baseUrl, pagination, state, maxPages);

        case 'offset':
          return this.generateOffsetUrls(baseUrl, pagination, state, maxPages);

        case 'cursor':
          return this.generateCursorUrls(baseUrl, pagination, state, maxPages);

        default:
          throw new Error(`Unsupported pagination type: ${pagination.type}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to generate paginated URLs', {
        source: source.name,
        endpoint: endpoint.name,
        error: error.message,
      });
      throw error;
    }
  }

  validateUrl(urlString: string): UrlValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const url = new URL(urlString);

      // Basic validation
      if (!url.protocol.startsWith('http')) {
        issues.push('URL must use HTTP or HTTPS protocol');
      }

      if (!url.hostname) {
        issues.push('URL must have a valid hostname');
      }

      // Security checks
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        issues.push('Localhost URLs are not recommended for production');
        suggestions.push('Use a proper domain name for production environments');
      }

      // Common issues
      if (url.pathname.includes('//')) {
        issues.push('URL contains double slashes in path');
        suggestions.push('Normalize path separators');
      }

      if (url.href.includes(' ')) {
        issues.push('URL contains unencoded spaces');
        suggestions.push('URL encode special characters');
      }

      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);

      return {
        isValid: issues.length === 0,
        normalizedUrl: normalizedUrl.href,
        issues,
        suggestions,
      };
    } catch (error: any) {
      return {
        isValid: false,
        issues: [`Invalid URL format: ${error.message}`],
        suggestions: ['Check URL syntax and ensure it includes protocol (http:// or https://)'],
      };
    }
  }

  resolveRelativeUrl(relativeUrl: string, baseUrl: string): string {
    try {
      const resolved = new URL(relativeUrl, baseUrl);
      return resolved.href;
    } catch (error: any) {
      this.logger.warn('Failed to resolve relative URL', {
        relativeUrl,
        baseUrl,
        error: error.message,
      });
      return relativeUrl; // Return as-is if resolution fails
    }
  }

  extractDomainInfo(url: string): {
    domain: string;
    subdomain?: string;
    tld: string;
    port?: number;
  } {
    try {
      const urlObj = new URL(url);
      const hostParts = urlObj.hostname.split('.');

      const tld = hostParts[hostParts.length - 1];
      const domain = hostParts.length > 1 ? hostParts[hostParts.length - 2] : hostParts[0];
      const subdomain = hostParts.length > 2 ? hostParts.slice(0, -2).join('.') : undefined;

      return {
        domain,
        subdomain,
        tld,
        port: urlObj.port ? parseInt(urlObj.port) : undefined,
      };
    } catch (error: any) {
      throw new Error(`Failed to extract domain info: ${error.message}`);
    }
  }

  updatePaginationState(
    source: WebSource,
    endpoint: WebEndpoint,
    page: number,
    hasMore: boolean,
    nextCursor?: string,
    totalPages?: number
  ): void {
    const stateKey = `${source.name}:${endpoint.name}`;

    this.paginationState.set(stateKey, {
      currentPage: page,
      hasMore,
      nextCursor,
      totalPages,
    });

    this.logger.debug('Updated pagination state', {
      source: source.name,
      endpoint: endpoint.name,
      page,
      hasMore,
      totalPages,
    });
  }

  getPaginationState(source: WebSource, endpoint: WebEndpoint) {
    const stateKey = `${source.name}:${endpoint.name}`;
    return this.paginationState.get(stateKey);
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up URL manager');

    this.urlTemplates.clear();
    this.baseUrlCache.clear();
    this.paginationState.clear();

    this.logger.info('URL manager cleanup completed');
  }

  // ============================
  // Private Implementation
  // ============================

  private initializeUrlTemplates(): void {
    // Common URL patterns for different types of endpoints
    const commonTemplates: Record<string, UrlTemplate> = {
      search: {
        pattern: '/search?q=${query}',
        parameters: ['query'],
        examples: ['/search?q=documentation', '/search?q=api+guide'],
      },
      document: {
        pattern: '/documents/${id}',
        parameters: ['id'],
        examples: ['/documents/123', '/documents/user-guide'],
      },
      list: {
        pattern: '/items?page=${page}&limit=${limit}',
        parameters: ['page', 'limit'],
        examples: ['/items?page=1&limit=20', '/items?page=2&limit=50'],
      },
      rss: {
        pattern: '/feed.xml',
        parameters: [],
        examples: ['/feed.xml', '/rss.xml'],
      },
    };

    for (const [name, template] of Object.entries(commonTemplates)) {
      this.urlTemplates.set(name, template);
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

      processedUrl = processedUrl.replace(new RegExp(placeholder1, 'g'), encodeURIComponent(value));
      processedUrl = processedUrl.replace(new RegExp(placeholder2, 'g'), encodeURIComponent(value));
    }

    return processedUrl;
  }

  private generatePageNumberUrls(
    baseUrl: string,
    pagination: PaginationConfig,
    state: any,
    maxPages: number
  ): PaginatedUrls {
    const urls: string[] = [];
    const url = new URL(baseUrl);

    const startPage = state.currentPage;
    const endPage = Math.min(
      startPage + maxPages - 1,
      pagination.max_pages || startPage + maxPages - 1
    );

    for (let page = startPage; page <= endPage; page++) {
      const pageUrl = new URL(url);
      pageUrl.searchParams.set(pagination.page_param, page.toString());

      if (pagination.size_param) {
        pageUrl.searchParams.set(pagination.size_param, '20'); // Default page size
      }

      urls.push(pageUrl.href);
    }

    const hasMore = pagination.max_pages ? endPage < pagination.max_pages : true;

    return {
      urls,
      hasMore,
      totalPages: pagination.max_pages,
    };
  }

  private generateOffsetUrls(
    baseUrl: string,
    pagination: PaginationConfig,
    state: any,
    maxPages: number
  ): PaginatedUrls {
    const urls: string[] = [];
    const url = new URL(baseUrl);
    const pageSize = 20; // Default page size

    for (let i = 0; i < maxPages; i++) {
      const offset = (state.currentPage - 1 + i) * pageSize;
      const offsetUrl = new URL(url);
      offsetUrl.searchParams.set(pagination.page_param, offset.toString());

      if (pagination.size_param) {
        offsetUrl.searchParams.set(pagination.size_param, pageSize.toString());
      }

      urls.push(offsetUrl.href);
    }

    return {
      urls,
      hasMore: true, // Can't determine without making requests
    };
  }

  private generateCursorUrls(
    baseUrl: string,
    pagination: PaginationConfig,
    state: any,
    maxPages: number // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  ): PaginatedUrls {
    const urls: string[] = [];
    const url = new URL(baseUrl);

    // First page
    if (state.nextCursor) {
      url.searchParams.set(pagination.page_param, state.nextCursor);
    }

    if (pagination.size_param) {
      url.searchParams.set(pagination.size_param, '20'); // Default page size
    }

    urls.push(url.href);

    // Note: For cursor pagination, we can only generate one URL at a time
    // The next cursor comes from the API response

    return {
      urls,
      hasMore: state.hasMore,
      nextCursor: state.nextCursor,
    };
  }

  private normalizeUrl(url: URL): URL {
    const normalized = new URL(url.href);

    // Remove default ports
    if (
      (normalized.protocol === 'http:' && normalized.port === '80') ||
      (normalized.protocol === 'https:' && normalized.port === '443')
    ) {
      normalized.port = '';
    }

    // Normalize pathname
    normalized.pathname = normalized.pathname.replace(/\/+/g, '/'); // Remove double slashes

    if (normalized.pathname.length > 1 && normalized.pathname.endsWith('/')) {
      normalized.pathname = normalized.pathname.slice(0, -1); // Remove trailing slash
    }

    // Sort query parameters for consistency
    const params = Array.from(normalized.searchParams.entries()).sort();
    normalized.search = '';
    for (const [key, value] of params) {
      normalized.searchParams.append(key, value);
    }

    return normalized;
  }
}
