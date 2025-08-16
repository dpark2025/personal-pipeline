# ⚠️ DOCUMENTATION ARCHIVE STATUS ⚠️
## 🔒 **DEPRECATED - NO LONGER REFERENCED FOR CURRENT PROJECT**
**Status**: Historical/milestone documentation - reference only  
**Archive Date**: August 16, 2025  
**Reference**: This document is deprecated and should not be used for current development  

---


# Adapter Integration Guide - Enterprise Integration Considerations

**Document Version**: 1.0  
**Created**: 2025-07-31  
**Author**: Barry Young (Integration Specialist)  
**Project**: Personal Pipeline MCP Server - Phase 2 Integration Guide  

## Executive Summary

This guide provides comprehensive integration considerations for Phase 2 adapter development, covering technical architecture, security requirements, performance optimization, and operational concerns. It serves as the definitive reference for implementing enterprise-grade adapters that integrate seamlessly with the existing Personal Pipeline framework.

**Key Integration Areas:**
- **Caching System Integration** - Hybrid Redis/memory caching with adapter-specific strategies
- **REST API & MCP Compatibility** - Dual access patterns with consistent behavior
- **Configuration Management** - YAML-based configuration with environment variable security
- **Error Handling & Circuit Breakers** - Resilient error handling with automatic recovery
- **Performance Monitoring** - Real-time metrics and alerting integration

---

## 1. Caching System Integration

### 1.1 Hybrid Caching Architecture

The Personal Pipeline uses a sophisticated hybrid caching system that new adapters must integrate with properly.

```typescript
// Current caching architecture
interface CacheService {
  get<T>(key: CacheKey): Promise<T | null>;
  set<T>(key: CacheKey, value: T, ttl?: number): Promise<void>;
  invalidate(key: CacheKey): Promise<void>;
  warmCache(data: Array<{key: CacheKey, data: any}>): Promise<void>;
  clearByType(contentType: CacheContentType): Promise<void>;
}

// Adapter integration pattern
export class YourAdapter extends SourceAdapter {
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // 1. Create cache key
    const cacheKey = createCacheKey('your_adapter', JSON.stringify({query, filters}));
    
    // 2. Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get<SearchResult[]>(cacheKey);
      if (cached) {
        logger.debug('Cache hit for search', { adapter: 'your_adapter', query });
        return cached;
      }
    }
    
    // 3. Execute actual search
    const results = await this.performActualSearch(query, filters);
    
    // 4. Cache results if available
    if (this.cacheService && results.length > 0) {
      await this.cacheService.set(cacheKey, results);
      logger.debug('Cached search results', { adapter: 'your_adapter', count: results.length });
    }
    
    return results;
  }
}
```

### 1.2 Cache Key Strategy

**Consistent Cache Key Generation:**
```typescript
import { createCacheKey, CacheContentType } from '../utils/cache.js';

// Content-type specific cache keys
const runbookCacheKey = createCacheKey(
  'runbooks',
  JSON.stringify({ alertType, severity, systems })
);

const searchCacheKey = createCacheKey(
  'knowledge_base', 
  JSON.stringify({ query, categories, maxAge })
);

const procedureCacheKey = createCacheKey(
  'procedures',
  JSON.stringify({ runbookId, stepName })
);
```

### 1.3 Content-Type Specific Caching

**Cache TTL Configuration:**
```yaml
# Each adapter should respect content-type TTL settings
cache:
  content_types:
    runbooks:
      ttl_seconds: 3600    # Critical runbooks cached longer
      warmup: true         # Pre-load into cache
    procedures:
      ttl_seconds: 1800    # Procedures cached moderately  
      warmup: false        # Load on-demand
    knowledge_base:
      ttl_seconds: 900     # General content cached shorter
      warmup: false        # Load on-demand
```

**Adapter Cache Integration:**
```typescript
// Use content-type aware caching
const getCacheConfig = (contentType: CacheContentType) => {
  return this.cacheService?.getContentTypeConfig(contentType);
};

// Set TTL based on content type
await this.cacheService?.set(cacheKey, results, getCacheConfig('runbooks')?.ttl_seconds);
```

### 1.4 Cache Warming Strategies

**Critical Content Pre-loading:**
```typescript
export class YourAdapter extends SourceAdapter {
  async warmCriticalCache(): Promise<void> {
    if (!this.cacheService) return;
    
    // Identify critical content for pre-loading
    const criticalQueries = [
      'memory pressure',
      'disk full', 
      'service down',
      'high cpu usage'
    ];
    
    const warmingData = [];
    for (const query of criticalQueries) {
      const results = await this.search(query);
      const cacheKey = createCacheKey('runbooks', query);
      warmingData.push({ key: cacheKey, data: results });
    }
    
    await this.cacheService.warmCache(warmingData);
    logger.info('Cache warming completed', { 
      adapter: 'your_adapter', 
      items: warmingData.length 
    });
  }
}
```

### 1.5 Cache Invalidation Patterns

**Intelligent Cache Invalidation:**
```typescript
// Invalidate cache when source content changes
export class YourAdapter extends SourceAdapter {
  async onContentUpdated(documentId: string, contentType: string): Promise<void> {
    // Invalidate specific document cache
    const documentKey = createCacheKey(contentType, documentId);
    await this.cacheService?.invalidate(documentKey);
    
    // Invalidate broader search caches if needed
    if (contentType === 'runbooks') {
      await this.cacheService?.clearByType('runbooks');
      logger.info('Invalidated runbook caches', { documentId });
    }
  }
  
  async refreshIndex(force?: boolean): Promise<boolean> {
    const success = await super.refreshIndex(force);
    
    if (success && force) {
      // Clear all caches for this adapter when force refreshing
      await this.clearAdapterCaches();
    }
    
    return success;
  }
  
  private async clearAdapterCaches(): Promise<void> {
    const contentTypes: CacheContentType[] = ['runbooks', 'procedures', 'knowledge_base'];
    for (const type of contentTypes) {
      await this.cacheService?.clearByType(type);
    }
  }
}
```

---

## 2. REST API & MCP Protocol Compatibility

### 2.1 Dual Access Pattern Architecture

Personal Pipeline supports both MCP protocol and REST API access. Adapters must work seamlessly with both patterns.

```typescript
// MCP Protocol Flow
MCP Client → PPMCPTools → SourceAdapterRegistry → YourAdapter

// REST API Flow  
HTTP Client → API Routes → PPMCPTools → SourceAdapterRegistry → YourAdapter
```

### 2.2 Consistent Response Format

**Standardized SearchResult Format:**
```typescript
// All adapters MUST return this consistent format
interface SearchResult {
  id: string;                      // Unique across ALL sources
  title: string;                   // Human-readable title
  content: string;                 // Normalized content (prefer markdown)
  source: string;                  // Adapter source name
  source_type: SourceType;         // 'confluence' | 'github' | 'database' | etc.
  confidence_score: ConfidenceScore; // 0.0-1.0 match quality
  match_reasons: string[];         // Why this result was selected
  retrieval_time_ms: number;       // Performance tracking (set by caller)
  url?: string;                    // Original source URL if available
  last_updated: string;            // ISO timestamp
  metadata?: Record<string, any>;  // Source-specific metadata
}
```

### 2.3 MCP Tool Integration

**Integration with MCP Tools:**
```typescript
// Your adapter will be called by these MCP tools
class PPMCPTools {
  // 1. search_runbooks() calls adapter.searchRunbooks()
  async searchRunbooks(args: any): Promise<RunbookSearchResponse> {
    const adapters = this.sourceRegistry.getAllAdapters();
    const allRunbooks: Runbook[] = [];
    
    for (const adapter of adapters) {
      const runbooks = await adapter.searchRunbooks(
        args.alert_type, 
        args.severity, 
        args.affected_systems
      );
      allRunbooks.push(...runbooks);
    }
    
    return { runbooks: allRunbooks, /* ... */ };
  }
  
  // 2. search_knowledge_base() calls adapter.search()
  async searchKnowledgeBase(args: any): Promise<SearchResponse> {
    const adapters = this.sourceRegistry.getAllAdapters();
    const allResults: SearchResult[] = [];
    
    for (const adapter of adapters) {
      const results = await adapter.search(args.query, args.filters);
      allResults.push(...results);
    }
    
    return { results: allResults, /* ... */ };
  }
}
```

### 2.4 REST API Integration

**Automatic REST API Exposure:**
```typescript
// Your adapter automatically works with REST API endpoints
POST /api/search                    → adapter.search()
POST /api/runbooks/search           → adapter.searchRunbooks()  
GET  /api/runbooks/:id              → adapter.getDocument()
GET  /api/sources                   → adapter.healthCheck() + getMetadata()
```

**API Response Transformation:**
```typescript
// REST API automatically transforms MCP responses
const mcpResponse = await this.mcpTools.searchKnowledgeBase(requestBody);

// Transformed to REST format
const restResponse = {
  success: true,
  data: mcpResponse.results,
  metadata: {
    total_results: mcpResponse.results.length,
    retrieval_time_ms: executionTime,
    timestamp: new Date().toISOString()
  }
};
```

---

## 3. Configuration Management Integration

### 3.1 YAML Configuration Schema

**Standard Adapter Configuration:**
```yaml
sources:
  - name: your-adapter-instance          # Unique instance name
    type: your_adapter_type              # Maps to factory registration
    base_url: https://api.example.com    # Primary endpoint
    auth:                                # Authentication configuration
      type: bearer_token                 # bearer_token | basic_auth | api_key | oauth2
      token_env: YOUR_API_TOKEN          # Environment variable name
    refresh_interval: 1h                 # How often to refresh content
    priority: 1                          # Search result ordering (1=highest)
    enabled: true                        # Runtime enable/disable
    timeout_ms: 30000                    # Request timeout
    max_retries: 3                       # Retry attempts
    categories: ["runbooks", "procedures"] # Content categories
    # Adapter-specific configuration
    custom_field: custom_value
```

### 3.2 Configuration Validation

**Runtime Configuration Validation:**
```typescript
export class YourAdapter extends SourceAdapter {
  constructor(config: SourceConfig) {
    super(config);
    this.validateConfiguration();
  }
  
  private validateConfiguration(): void {
    // Validate required fields
    if (!this.config.base_url) {
      throw new ValidationError('base_url is required', 'base_url');
    }
    
    // Validate authentication configuration
    if (!this.config.auth?.token_env) {
      throw new ValidationError('auth.token_env is required', 'auth.token_env');
    }
    
    // Validate environment variables exist
    const tokenValue = process.env[this.config.auth.token_env];
    if (!tokenValue) {
      throw new ValidationError(
        `Environment variable ${this.config.auth.token_env} not found`,
        'auth.token_env'
      );
    }
    
    // Adapter-specific validation
    this.validateAdapterSpecificConfig();
  }
}
```

### 3.3 Environment Variable Management

**Secure Credential Handling:**
```typescript
// Standard environment variable patterns
const credentials = {
  // Confluence
  CONFLUENCE_TOKEN: 'Bearer token for Confluence API',
  CONFLUENCE_USERNAME: 'Username for basic auth (if needed)',
  CONFLUENCE_PASSWORD: 'Password for basic auth (if needed)',
  
  // GitHub  
  GITHUB_TOKEN: 'Personal access token or GitHub App token',
  
  // Database
  DATABASE_URL: 'Full database connection string',
  DB_USERNAME: 'Database username',
  DB_PASSWORD: 'Database password',
  
  // Notion
  NOTION_TOKEN: 'Internal integration token',
  
  // Generic API
  API_KEY: 'Generic API key',
  API_SECRET: 'API secret for signed requests'
};

// Access pattern in adapters
export class YourAdapter extends SourceAdapter {
  private getCredential(envVar: string): string {
    const value = process.env[envVar];
    if (!value) {
      throw new Error(`Required environment variable ${envVar} not found`);
    }
    return value;
  }
  
  async initialize(): Promise<void> {
    const token = this.getCredential(this.config.auth.token_env!);
    this.setupAuthentication(token);
  }
}
```

---

## 4. Error Handling & Circuit Breaker Integration

### 4.1 Circuit Breaker Pattern

**Automatic Circuit Breaker Integration:**
```typescript
import { CircuitBreakerFactory } from '../utils/circuit-breaker.js';

export class YourAdapter extends SourceAdapter {
  private circuitBreaker = CircuitBreakerFactory.getBreaker('your_adapter');
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Circuit breaker automatically handles failures
    return this.circuitBreaker.execute(async () => {
      return this.performActualSearch(query, filters);
    });
  }
  
  async healthCheck(): Promise<HealthCheck> {
    return this.circuitBreaker.execute(async () => {
      return this.performHealthCheck();
    });
  }
}
```

### 4.2 Error Classification & Handling

**Structured Error Handling:**
```typescript
import { SourceError, ValidationError } from '../types/index.js';

export class YourAdapter extends SourceAdapter {
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    try {
      return await this.performSearch(query, filters);
    } catch (error) {
      // Classify errors for appropriate handling
      if (this.isAuthenticationError(error)) {
        logger.error('Authentication failed', { adapter: 'your_adapter', error });
        throw new SourceError('Authentication failed', this.config.name, { 
          error_type: 'authentication',
          retry_possible: true 
        });
      }
      
      if (this.isRateLimitError(error)) {
        logger.warn('Rate limit exceeded', { adapter: 'your_adapter' });
        throw new SourceError('Rate limit exceeded', this.config.name, {
          error_type: 'rate_limit',
          retry_after: this.extractRetryAfter(error)
        });
      }
      
      if (this.isNetworkError(error)) {
        logger.warn('Network error', { adapter: 'your_adapter', error });
        throw new SourceError('Network error', this.config.name, {
          error_type: 'network',
          retry_possible: true
        });
      }
      
      // Generic error handling
      logger.error('Unexpected error', { adapter: 'your_adapter', error });
      throw new SourceError('Search failed', this.config.name, { error });
    }
  }
  
  private isAuthenticationError(error: any): boolean {
    return error.response?.status === 401;
  }
  
  private isRateLimitError(error: any): boolean {
    return error.response?.status === 429;
  }
  
  private isNetworkError(error: any): boolean {
    return error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
  }
}
```

### 4.3 Retry Strategies

**Exponential Backoff Implementation:**
```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class YourAdapter extends SourceAdapter {
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,      // 1 second
    maxDelay: 30000,      // 30 seconds
    backoffMultiplier: 2
  };
  
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on authentication or validation errors
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        if (attempt < this.retryConfig.maxAttempts) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelay
          );
          
          logger.info('Retrying operation', { 
            adapter: 'your_adapter', 
            attempt, 
            delay 
          });
          
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError!;
  }
  
  private isRetryableError(error: any): boolean {
    // Network errors and server errors are retryable
    return this.isNetworkError(error) || 
           this.isServerError(error) ||
           this.isRateLimitError(error);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 5. Performance Monitoring Integration

### 5.1 Performance Metrics Collection

**Automatic Performance Tracking:**
```typescript
import { getPerformanceMonitor, PerformanceTimer } from '../utils/performance.js';

export class YourAdapter extends SourceAdapter {
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const timer = new PerformanceTimer();
    const performanceMonitor = getPerformanceMonitor();
    
    try {
      const results = await this.performSearch(query, filters);
      
      // Record successful operation
      performanceMonitor.recordAdapterOperation(
        'your_adapter', 
        'search', 
        timer.elapsed(), 
        false // not an error
      );
      
      return results;
    } catch (error) {
      // Record failed operation
      performanceMonitor.recordAdapterOperation(
        'your_adapter', 
        'search', 
        timer.elapsed(), 
        true // is an error
      );
      throw error;
    }
  }
}
```

### 5.2 Health Check Integration

**Comprehensive Health Monitoring:**
```typescript
export class YourAdapter extends SourceAdapter {
  async healthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Perform adapter-specific health checks
      await this.validateConnectivity();
      await this.validateAuthentication();
      await this.validatePermissions();
      
      const responseTime = Date.now() - startTime;
      
      return {
        source_name: this.config.name,
        healthy: true,
        response_time_ms: responseTime,
        last_check: new Date().toISOString(),
        metadata: {
          adapter_type: 'your_adapter',
          connectivity: 'ok',
          authentication: 'ok',
          permissions: 'ok',
          document_count: await this.getDocumentCount(),
          last_indexed: await this.getLastIndexedTime()
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        source_name: this.config.name,
        healthy: false,
        response_time_ms: responseTime,
        last_check: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Health check failed',
        metadata: {
          adapter_type: 'your_adapter',
          error_type: this.classifyHealthError(error)
        }
      };
    }
  }
  
  private async validateConnectivity(): Promise<void> {
    // Test basic connectivity to external service
  }
  
  private async validateAuthentication(): Promise<void> {
    // Test authentication credentials
  }
  
  private async validatePermissions(): Promise<void> {
    // Test required permissions for operations
  }
}
```

### 5.3 Metrics Export

**Prometheus Metrics Integration:**
```typescript
// Metrics are automatically exported by the performance monitor
// Your adapter contributes to these metrics:

// Request counts
pp_adapter_requests_total{adapter="your_adapter", operation="search"}

// Error counts  
pp_adapter_errors_total{adapter="your_adapter", error_type="network"}

// Response times
pp_adapter_response_time_seconds{adapter="your_adapter", operation="search"}

// Health status
pp_adapter_health_status{adapter="your_adapter"}

// Document counts
pp_adapter_document_count{adapter="your_adapter"}
```

---

## 6. Security Integration Requirements

### 6.1 Credential Security

**Secure Credential Handling:**
```typescript
export class YourAdapter extends SourceAdapter {
  private credentials: Map<string, string> = new Map();
  
  async initialize(): Promise<void> {
    // Load credentials securely
    this.loadCredentials();
    
    // Clear credentials from memory when done (if needed)
    process.on('exit', () => this.clearCredentials());
  }
  
  private loadCredentials(): void {
    const tokenEnv = this.config.auth?.token_env;
    if (tokenEnv) {
      const token = process.env[tokenEnv];
      if (!token) {
        throw new Error(`Credential not found: ${tokenEnv}`);
      }
      this.credentials.set('token', token);
    }
  }
  
  private clearCredentials(): void {
    this.credentials.clear();
  }
  
  private getAuthHeaders(): Record<string, string> {
    const token = this.credentials.get('token');
    if (!token) {
      throw new Error('Authentication token not available');
    }
    
    switch (this.config.auth?.type) {
      case 'bearer_token':
        return { 'Authorization': `Bearer ${token}` };
      case 'api_key':
        return { 'X-API-Key': token };
      default:
        throw new Error(`Unsupported auth type: ${this.config.auth?.type}`);
    }
  }
}
```

### 6.2 Input Validation & Sanitization

**Comprehensive Input Validation:**
```typescript
import { ValidationError } from '../types/index.js';

export class YourAdapter extends SourceAdapter {
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Validate inputs before processing
    this.validateSearchInput(query, filters);
    
    return this.performSearch(query, filters);
  }
  
  private validateSearchInput(query: string, filters?: SearchFilters): void {
    // Query validation
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Query must be a non-empty string', 'query');
    }
    
    if (query.length > 1000) {
      throw new ValidationError('Query too long (max 1000 characters)', 'query');
    }
    
    // Remove potential injection attempts
    if (this.containsSuspiciousPatterns(query)) {
      throw new ValidationError('Query contains suspicious patterns', 'query');
    }
    
    // Filters validation
    if (filters) {
      this.validateFilters(filters);
    }
  }
  
  private containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /\$\{.*\}/,  // Template injection
      /'.*OR.*'/i, // SQL injection
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(input));
  }
  
  private validateFilters(filters: SearchFilters): void {
    if (filters.categories) {
      filters.categories.forEach(category => {
        if (typeof category !== 'string' || category.length > 100) {
          throw new ValidationError('Invalid category filter', 'categories');
        }
      });
    }
    
    if (filters.max_age_days !== undefined) {
      if (typeof filters.max_age_days !== 'number' || filters.max_age_days < 0) {
        throw new ValidationError('max_age_days must be a positive number', 'max_age_days');
      }
    }
  }
}
```

### 6.3 Data Sanitization

**Content Sanitization:**
```typescript
export class YourAdapter extends SourceAdapter {
  private sanitizeContent(content: string): string {
    // Remove potentially sensitive information
    let sanitized = content;
    
    // Remove potential credentials
    sanitized = sanitized.replace(/\b[A-Za-z0-9+/]{20,}={0,2}\b/g, '[REDACTED]'); // Base64
    sanitized = sanitized.replace(/\b[a-fA-F0-9]{32,64}\b/g, '[REDACTED]'); // Hex tokens
    
    // Remove email addresses in logs (but keep in content for search)
    if (this.shouldRedactEmails()) {
      sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    }
    
    // Remove potential API keys
    sanitized = sanitized.replace(/\b(api[_-]?key|token|secret)[:\s]*[A-Za-z0-9+/=]{10,}/gi, '[REDACTED]');
    
    return sanitized;
  }
  
  private shouldRedactEmails(): boolean {
    // Only redact emails in logs, not in search content
    return false;  // Override in subclasses as needed
  }
}
```

---

## 7. Testing Integration Guidelines

### 7.1 Unit Testing Framework

**Adapter Unit Test Structure:**
```typescript
// tests/unit/adapters/your-adapter.test.ts
import { YourAdapter } from '../../../src/adapters/your-adapter.js';
import { SourceConfig } from '../../../src/types/index.js';

describe('YourAdapter', () => {
  let adapter: YourAdapter;
  let mockConfig: SourceConfig;
  
  beforeEach(() => {
    mockConfig = {
      name: 'test-adapter',
      type: 'your_adapter_type',
      base_url: 'https://api.example.com',
      auth: {
        type: 'bearer_token',
        token_env: 'TEST_TOKEN'
      },
      refresh_interval: '1h',
      priority: 1,
      enabled: true
    };
    
    // Set up test environment
    process.env.TEST_TOKEN = 'test-token-value';
    
    adapter = new YourAdapter(mockConfig);
  });
  
  afterEach(() => {
    delete process.env.TEST_TOKEN;
  });
  
  describe('Authentication', () => {
    it('should initialize with valid configuration', async () => {
      await expect(adapter.initialize()).resolves.not.toThrow();
    });
    
    it('should throw error with missing token', async () => {
      delete process.env.TEST_TOKEN;
      await expect(adapter.initialize()).rejects.toThrow('Credential not found');
    });
  });
  
  describe('Search Functionality', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });
    
    it('should return search results', async () => {
      const results = await adapter.search('test query');
      expect(Array.isArray(results)).toBe(true);
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('confidence_score');
      });
    });
    
    it('should handle empty search results', async () => {
      const results = await adapter.search('nonexistent query');
      expect(results).toEqual([]);
    });
    
    it('should validate search input', async () => {
      await expect(adapter.search('')).rejects.toThrow('Query must be a non-empty string');
      await expect(adapter.search('x'.repeat(1001))).rejects.toThrow('Query too long');
    });
  });
  
  describe('Health Checks', () => {
    it('should return healthy status when operational', async () => {
      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.source_name).toBe('test-adapter');
      expect(typeof health.response_time_ms).toBe('number');
    });
  });
});
```

### 7.2 Integration Testing

**Live API Integration Tests:**
```typescript
// tests/integration/adapters/your-adapter.integration.test.ts
describe('YourAdapter Integration', () => {
  let adapter: YourAdapter;
  
  beforeAll(async () => {
    // Skip if no test credentials available
    if (!process.env.YOUR_ADAPTER_TEST_TOKEN) {
      console.log('Skipping integration tests - no test credentials');
      return;
    }
    
    const config: SourceConfig = {
      name: 'integration-test',
      type: 'your_adapter_type',
      base_url: process.env.YOUR_ADAPTER_TEST_URL,
      auth: {
        type: 'bearer_token',
        token_env: 'YOUR_ADAPTER_TEST_TOKEN'
      },
      // ... other config
    };
    
    adapter = new YourAdapter(config);
    await adapter.initialize();
  });
  
  it('should connect to live API', async () => {
    if (!adapter) return;
    
    const health = await adapter.healthCheck();
    expect(health.healthy).toBe(true);
  });
  
  it('should perform live search', async () => {
    if (!adapter) return;
    
    const results = await adapter.search('documentation');
    expect(Array.isArray(results)).toBe(true);
    
    if (results.length > 0) {
      const result = results[0];
      expect(result.confidence_score).toBeGreaterThan(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
    }
  });
});
```

### 7.3 Performance Testing

**Performance Validation:**
```typescript
// tests/performance/adapters/your-adapter.performance.test.ts
describe('YourAdapter Performance', () => {
  let adapter: YourAdapter;
  
  beforeAll(async () => {
    // Set up adapter with test configuration
  });
  
  it('should meet response time targets', async () => {
    const queries = ['test query 1', 'test query 2', 'test query 3'];
    const results = [];
    
    for (const query of queries) {
      const startTime = Date.now();
      const searchResults = await adapter.search(query);
      const endTime = Date.now();
      
      results.push({
        query,
        responseTime: endTime - startTime,
        resultCount: searchResults.length
      });
    }
    
    // Validate response times
    results.forEach(result => {
      expect(result.responseTime).toBeLessThan(500); // < 500ms for uncached
    });
  });
  
  it('should handle concurrent requests', async () => {
    const concurrentRequests = 10;
    const promises = Array(concurrentRequests).fill(null).map((_, i) => 
      adapter.search(`concurrent query ${i}`)
    );
    
    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    // All requests should succeed
    const failures = results.filter(r => r.status === 'rejected');
    expect(failures.length).toBe(0);
    
    // Total time should be reasonable for concurrent execution
    expect(endTime - startTime).toBeLessThan(2000); // < 2s for 10 concurrent requests
  });
});
```

---

## 8. Deployment & Operational Considerations

### 8.1 Configuration Deployment

**Environment-Specific Configuration:**
```yaml
# config/development.yaml
sources:
  - name: dev-confluence
    type: confluence
    base_url: https://dev-instance.atlassian.net/wiki
    auth:
      type: bearer_token
      token_env: DEV_CONFLUENCE_TOKEN
    timeout_ms: 10000  # Shorter timeout for development

# config/production.yaml  
sources:
  - name: prod-confluence
    type: confluence
    base_url: https://company.atlassian.net/wiki
    auth:
      type: bearer_token
      token_env: CONFLUENCE_TOKEN
    timeout_ms: 30000  # Longer timeout for production
    max_retries: 5     # More retries for production
```

### 8.2 Monitoring & Alerting

**Operational Monitoring Setup:**
```typescript
// Adapters automatically integrate with monitoring
// Configure alerts for:

// 1. Health check failures
const healthCheckAlert = {
  metric: 'pp_adapter_health_status',
  condition: 'value < 1',
  for: '5m',
  severity: 'warning',
  message: 'Adapter {{ $labels.adapter }} is unhealthy'
};

// 2. High error rates
const errorRateAlert = {
  metric: 'rate(pp_adapter_errors_total[5m])',
  condition: '> 0.1', // 10% error rate
  for: '2m', 
  severity: 'critical',
  message: 'High error rate for adapter {{ $labels.adapter }}'
};

// 3. Slow response times
const responseTimeAlert = {
  metric: 'pp_adapter_response_time_seconds',
  condition: 'p95 > 2', // 95th percentile > 2 seconds
  for: '5m',
  severity: 'warning', 
  message: 'Slow response times for adapter {{ $labels.adapter }}'
};
```

### 8.3 Scaling Considerations

**Horizontal Scaling Support:**
```typescript
export class YourAdapter extends SourceAdapter {
  // Ensure adapter is stateless for horizontal scaling
  private connectionPool: ConnectionPool; // OK - manages connections
  private instanceState: Map<string, any> = new Map(); // AVOID - instance state
  
  // Use external state stores for scaling
  async initialize(): Promise<void> {
    // Initialize connection pools that can be shared
    this.connectionPool = createConnectionPool(this.config);
    
    // Avoid storing state in memory - use Redis/database instead
    // this.cache = new Map(); // DON'T DO THIS
    // this.cache = redis.createClient(); // DO THIS
  }
}
```

---

## 9. Migration & Compatibility Guidelines

### 9.1 Backward Compatibility

**Version Compatibility Matrix:**
```typescript
interface AdapterVersionInfo {
  adapterVersion: string;
  frameworkVersion: string;
  breakingChanges: string[];
  migrationGuide: string;
}

// Maintain compatibility with framework versions
const compatibilityMatrix: AdapterVersionInfo[] = [
  {
    adapterVersion: '1.0.0',
    frameworkVersion: '^1.0.0', 
    breakingChanges: [],
    migrationGuide: 'No migration needed'
  },
  {
    adapterVersion: '1.1.0',
    frameworkVersion: '^1.1.0',
    breakingChanges: ['search() signature changed'],
    migrationGuide: 'Update search() method signature'
  }
];
```

### 9.2 Data Migration

**Content Migration Support:**
```typescript
export class YourAdapter extends SourceAdapter {
  async migrateFromVersion(oldVersion: string, newVersion: string): Promise<void> {
    logger.info('Starting adapter data migration', { 
      from: oldVersion, 
      to: newVersion 
    });
    
    // Clear old caches if schema changed
    if (this.hasSchemaChanges(oldVersion, newVersion)) {
      await this.clearAllCaches();
    }
    
    // Reindex content if needed
    if (this.needsReindexing(oldVersion, newVersion)) {
      await this.refreshIndex(true);
    }
    
    logger.info('Adapter migration completed', { 
      from: oldVersion, 
      to: newVersion 
    });
  }
  
  private hasSchemaChanges(oldVersion: string, newVersion: string): boolean {
    // Implement version comparison logic
    return false;
  }
  
  private needsReindexing(oldVersion: string, newVersion: string): boolean {
    // Implement reindexing necessity logic
    return false;
  }
}
```

---

## 10. Troubleshooting & Debugging

### 10.1 Debug Logging

**Comprehensive Debug Logging:**
```typescript
import { logger } from '../utils/logger.js';

export class YourAdapter extends SourceAdapter {
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    logger.debug('Starting search operation', {
      adapter: 'your_adapter',
      query: query.substring(0, 100), // Log first 100 chars
      filters,
      config: {
        enabled: this.config.enabled,
        priority: this.config.priority
      }
    });
    
    try {
      const results = await this.performSearch(query, filters);
      
      logger.debug('Search completed successfully', {
        adapter: 'your_adapter',
        resultCount: results.length,
        topConfidenceScore: results[0]?.confidence_score || 0
      });
      
      return results;
    } catch (error) {
      logger.error('Search operation failed', {
        adapter: 'your_adapter',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        query: query.substring(0, 100)
      });
      throw error;
    }
  }
}
```

### 10.2 Health Diagnostics

**Detailed Health Diagnostics:**
```typescript
export class YourAdapter extends SourceAdapter {
  async getDiagnostics(): Promise<AdapterDiagnostics> {
    return {
      adapter_name: this.config.name,
      adapter_type: 'your_adapter',
      configuration: {
        base_url: this.config.base_url,
        auth_type: this.config.auth?.type,
        timeout_ms: this.config.timeout_ms,
        max_retries: this.config.max_retries,
        enabled: this.config.enabled
      },
      connectivity: {
        can_connect: await this.testConnectivity(),
        response_time_ms: await this.measureResponseTime(),
        last_successful_connection: await this.getLastSuccessfulConnection()
      },
      authentication: {
        credentials_available: this.areCredentialsAvailable(),
        last_auth_success: await this.getLastAuthSuccess(),
        auth_error: await this.getLastAuthError()
      },
      performance: {
        avg_response_time_ms: await this.getAverageResponseTime(),
        success_rate: await this.getSuccessRate(),
        cache_hit_rate: await this.getCacheHitRate()
      },
      content: {
        indexed_documents: await this.getDocumentCount(),
        last_indexed: await this.getLastIndexedTime(),
        content_types: await this.getContentTypes()
      }
    };
  }
}

interface AdapterDiagnostics {
  adapter_name: string;
  adapter_type: string;
  configuration: Record<string, any>;
  connectivity: Record<string, any>;
  authentication: Record<string, any>;
  performance: Record<string, any>;
  content: Record<string, any>;
}
```

---

## Conclusion

This integration guide provides comprehensive guidance for implementing enterprise-grade adapters that seamlessly integrate with the Personal Pipeline framework. Following these guidelines ensures:

**✅ Consistent Integration**
- All adapters work identically with MCP and REST API access
- Unified caching, monitoring, and error handling
- Standardized configuration and deployment patterns

**✅ Enterprise-Grade Quality**  
- Comprehensive error handling and circuit breaker protection
- Security-first credential management and input validation
- Performance monitoring and optimization capabilities

**✅ Operational Excellence**
- Detailed health monitoring and diagnostics
- Comprehensive logging and troubleshooting capabilities
- Scalable architecture with migration support

**✅ Developer Experience**
- Clear testing patterns and validation frameworks
- Detailed documentation and examples  
- Consistent development and deployment workflows

By following this guide, Phase 2 adapter implementations will maintain the high quality standards established in Phase 1 while providing enterprise-grade integration capabilities for diverse documentation sources.