/**
 * Web Adapter - Enterprise Integration Package
 *
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 *
 * Complete web adapter package for Personal Pipeline with semantic search
 * integration, multi-protocol support, and enterprise features.
 */

export { WebAdapter } from './web-adapter.js';
export { HttpClient } from './http-client.js';
export { AuthManager } from './auth-manager.js';
export { ContentExtractor } from './content-extractor.js';
export { UrlManager } from './url-manager.js';
export { CacheManager } from './cache-manager.js';

export type {
  WebSource,
  WebEndpoint,
  WebAuthConfig,
  ContentSelectors,
  ContentFilters,
  PaginationConfig,
  ExtractedWebContent,
} from './web-adapter.js';

export type {
  HttpClientOptions,
  HttpRequest,
  HttpResponse,
  CircuitBreakerState,
  RateLimitState,
} from './http-client.js';

export type { AuthCredentials, AuthResult, OAuth2TokenResponse } from './auth-manager.js';

export type {
  ContentExtractorOptions,
  ProcessingResult,
  ContentQuality,
} from './content-extractor.js';

export type { UrlTemplate, PaginatedUrls, UrlValidationResult } from './url-manager.js';

export type { CacheManagerOptions, CacheEntry, CacheStats, CacheMetrics } from './cache-manager.js';
