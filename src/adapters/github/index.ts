/**
 * GitHub Adapter - Enterprise Integration Package
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Complete GitHub adapter package for Personal Pipeline
 * with semantic search integration and enterprise features.
 */

export { GitHubAdapter } from './github-adapter.js';
export { AuthManager } from './auth-manager.js';
export { ApiClient } from './api-client.js';
export { ContentProcessor } from './content-processor.js';
export { ContentSynchronizer } from './content-synchronizer.js';
export { CacheManager } from './cache-manager.js';

export type {
  GitHubAdapterOptions,
  GitHubSearchResult,
} from './github-adapter.js';

export type {
  AuthCredentials,
  AuthResult,
  GitHubAppCredentials,
  OAuth2Credentials,
  TokenRefreshResult,
} from './auth-manager.js';

export type {
  ApiClientOptions,
  RateLimitInfo,
  SearchParams,
  RepositorySearchParams,
  CodeSearchParams,
  CircuitBreakerState,
  GitHubRepository,
  GitHubContent,
  GitHubIssue,
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
  WebhookPayload,
} from './content-synchronizer.js';

export type {
  CacheManagerOptions,
  CacheStats,
  CacheEntry,
} from './cache-manager.js';