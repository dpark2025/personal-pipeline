/**
 * Confluence Adapter - Enterprise Integration Package
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Complete Confluence adapter package for Personal Pipeline
 * with semantic search integration and enterprise features.
 */

export { ConfluenceAdapter } from './confluence-adapter.js';
export { AuthManager } from './auth-manager.js';
export { ApiClient } from './api-client.js';
export { ContentProcessor } from './content-processor.js';
export { ContentSynchronizer } from './content-synchronizer.js';
export { CacheManager } from './cache-manager.js';

export type {
  ConfluenceAdapterOptions,
  ConfluenceSearchResult,
  ConfluenceSpace,
  ConfluencePageContent,
} from './confluence-adapter.js';

export type {
  AuthCredentials,
  AuthResult,
  OAuth2Credentials,
  TokenRefreshResult,
} from './auth-manager.js';

export type {
  ApiClientOptions,
  RateLimitInfo,
  SearchParams,
  SpaceSearchParams,
  PageSearchParams,
  CircuitBreakerState,
} from './api-client.js';

export type {
  ContentMetrics,
  ExtractedContent,
  ProcessingOptions,
} from './content-processor.js';

export type {
  SyncResult,
  SyncMetrics,
  ChangeEvent,
  SyncOptions,
} from './content-synchronizer.js';

export type {
  CacheManagerOptions,
  CacheStats,
  CacheEntry,
} from './cache-manager.js';