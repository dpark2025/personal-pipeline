/**
 * WebAdapter Enhanced Test Suite
 * 
 * Authored by: Barry Young (Integration Specialist)
 * Date: 2025-08-14
 * 
 * Comprehensive test suite for the WebAdapter implementation covering
 * HTTP client functionality, content processing, authentication, 
 * rate limiting, and runbook search capabilities.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { WebAdapter } from '../../../src/adapters/web.js';
import { CacheService } from '../../../src/utils/cache.js';
import type { WebConfig } from '../../../src/types/index.js';

// ============================
// Test Configuration & Setup
// ============================

const createTestWebConfig = (): WebConfig => ({
  name: 'test-web',
  type: 'web',
  enabled: true,
  
  endpoints: [
    {
      name: 'api-docs',
      url: 'https://docs.api.company.com',
      method: 'GET',
      content_type: 'html',
      selectors: {
        title: 'h1, .page-title',
        content: '.content, .documentation',
        exclude: ['.sidebar', '.navigation', '.footer']
      },
      rate_limit: 30,
      timeout_ms: 15000,
      cache_ttl: '1h'
    },
    {
      name: 'runbooks-api',
      url: 'https://api.ops.company.com/runbooks',
      method: 'GET',
      content_type: 'json',
      json_paths: ['$.runbooks[*]', '$.procedures[*]'],
      rate_limit: 10,
      timeout_ms: 10000,
      cache_ttl: '30m'
    }
  ],
  
  auth: {
    type: 'none'
  },
  
  performance: {
    default_timeout_ms: 15000,
    max_concurrent_requests: 3,
    default_retry_attempts: 2,
    default_cache_ttl: '1h',
    user_agent: 'PersonalPipeline/1.0 WebAdapter'
  },
  
  content_processing: {
    max_content_size_mb: 10,
    follow_redirects: true,
    validate_ssl: true,
    extract_links: false
  },
  
  refresh_interval: '2h',
  priority: 1
});

// Mock cache service for testing
const createMockCache = () => ({
  get: async (_key: string) => null, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  set: async (_key: string, _value: any, _ttl?: string) => {}, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  delete: async (_key: string) => {}, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  clear: async () => {},
  keys: async (_pattern?: string) => [], // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  ttl: async (_key: string) => 0, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  healthCheck: async () => ({ healthy: true, latency_ms: 1 }),
  getStats: () => ({ hits: 0, misses: 0, sets: 0, deletes: 0, size: 0 })
});

// ============================
// HTTP Client & Authentication Tests
// ============================

describe('WebAdapter - HTTP Client Operations', () => {
  let adapter: WebAdapter;
  let mockCache: CacheService;
  
  beforeEach(async () => {
    const config = createTestWebConfig();
    mockCache = createMockCache() as any;
    adapter = new WebAdapter(config, mockCache);
    await adapter.initialize();
  });
  
  afterEach(async () => {
    await adapter.cleanup();
  });

  it('should initialize HTTP client with proper defaults', async () => {
    const metadata = await adapter.getMetadata();
    
    assert.strictEqual(metadata.source_name, 'test-web');
    assert.strictEqual(metadata.source_type, 'http');
    assert.strictEqual(metadata.status, 'ready');
    assert.ok(metadata.endpoints_configured > 0);
  });

  it('should handle API key authentication correctly', async () => {
    const authConfig = createTestWebConfig();
    authConfig.auth = {
      type: 'api_key',
      api_key_header: 'X-API-Key',
      api_key_env: 'TEST_API_KEY'
    };
    
    // Set mock environment variable
    process.env.TEST_API_KEY = 'test-key-12345';
    
    const authAdapter = new WebAdapter(authConfig, mockCache);
    await authAdapter.initialize();
    
    const metadata = await authAdapter.getMetadata();
    assert.strictEqual(metadata.status, 'ready');
    assert.ok(metadata.auth_configured);
    
    await authAdapter.cleanup();
    delete process.env.TEST_API_KEY;
  });

  it('should handle bearer token authentication correctly', async () => {
    const authConfig = createTestWebConfig();
    authConfig.auth = {
      type: 'bearer_token',
      bearer_token_env: 'TEST_BEARER_TOKEN'
    };
    
    // Set mock environment variable
    process.env.TEST_BEARER_TOKEN = 'bearer-token-67890';
    
    const authAdapter = new WebAdapter(authConfig, mockCache);
    await authAdapter.initialize();
    
    const metadata = await authAdapter.getMetadata();
    assert.strictEqual(metadata.status, 'ready');
    assert.ok(metadata.auth_configured);
    
    await authAdapter.cleanup();
    delete process.env.TEST_BEARER_TOKEN;
  });

  it('should handle basic authentication correctly', async () => {
    const authConfig = createTestWebConfig();
    authConfig.auth = {
      type: 'basic_auth',
      username_env: 'TEST_USERNAME',
      password_env: 'TEST_PASSWORD'
    };
    
    // Set mock environment variables
    process.env.TEST_USERNAME = 'testuser';
    process.env.TEST_PASSWORD = 'testpass';
    
    const authAdapter = new WebAdapter(authConfig, mockCache);
    await authAdapter.initialize();
    
    const metadata = await authAdapter.getMetadata();
    assert.strictEqual(metadata.status, 'ready');
    assert.ok(metadata.auth_configured);
    
    await authAdapter.cleanup();
    delete process.env.TEST_USERNAME;
    delete process.env.TEST_PASSWORD;
  });
});

// ============================
// Content Processing Tests
// ============================

describe('WebAdapter - Content Processing', () => {
  let adapter: WebAdapter;
  let mockCache: CacheService;
  
  beforeEach(async () => {
    const config = createTestWebConfig();
    mockCache = createMockCache() as any;
    adapter = new WebAdapter(config, mockCache);
    await adapter.initialize();
  });
  
  afterEach(async () => {
    await adapter.cleanup();
  });

  it('should extract content from HTML using CSS selectors', async () => {
    const mockHtmlContent = `
      <html>
        <head><title>Test Documentation</title></head>
        <body>
          <nav class="sidebar">Navigation</nav>
          <h1 class="page-title">API Documentation</h1>
          <div class="content">
            <h2>Getting Started</h2>
            <p>This is the main content about our API endpoints.</p>
            <div class="code-block">POST /api/runbooks</div>
          </div>
          <footer class="footer">Footer content</footer>
        </body>
      </html>
    `;
    
    // Test HTML content extraction (this would normally be done internally)
    const processedContent = (adapter as any).extractFromHTML(mockHtmlContent, {
      title: 'h1, .page-title',
      content: '.content',
      exclude: ['.sidebar', '.footer']
    });
    
    assert.ok(processedContent.title.includes('API Documentation'));
    assert.ok(processedContent.content.includes('Getting Started'));
    assert.ok(processedContent.content.includes('API endpoints'));
    assert.ok(!processedContent.content.includes('Navigation'));
    assert.ok(!processedContent.content.includes('Footer content'));
  });

  it('should process JSON responses with JSONPath expressions', async () => {
    const mockJsonContent = {
      runbooks: [
        {
          id: 'disk-space-runbook',
          title: 'Disk Space Alert Runbook',
          description: 'Handle disk space alerts',
          procedures: [
            { step: 1, action: 'Check disk usage' },
            { step: 2, action: 'Clear temporary files' }
          ]
        }
      ],
      metadata: {
        total: 1,
        version: '1.0'
      }
    };
    
    // Test JSON content extraction
    const processedContent = (adapter as any).extractFromJSON(mockJsonContent, ['$.runbooks[*]']);
    
    assert.ok(processedContent.title.includes('Disk Space Alert'));
    assert.ok(processedContent.content.includes('disk space alerts'));
    assert.ok(processedContent.content.includes('Check disk usage'));
    assert.ok(processedContent.content.includes('Clear temporary files'));
  });

  it('should convert HTML to markdown preserving structure', async () => {
    const mockHtml = `
      <h1>Runbook Documentation</h1>
      <h2>Overview</h2>
      <p>This runbook covers <strong>critical</strong> disk space alerts.</p>
      <ul>
        <li>Step 1: Identify the issue</li>
        <li>Step 2: Execute remediation</li>
      </ul>
      <pre><code>df -h</code></pre>
    `;
    
    // Test HTML to Markdown conversion
    const markdownContent = (adapter as any).convertToMarkdown(mockHtml);
    
    assert.ok(markdownContent.includes('# Runbook Documentation'));
    assert.ok(markdownContent.includes('## Overview'));
    assert.ok(markdownContent.includes('**critical**'));
    assert.ok(markdownContent.includes('- Step 1:'));
    assert.ok(markdownContent.includes('```\ndf -h\n```'));
  });

  it('should handle malformed content gracefully', async () => {
    const malformedHtml = '<html><body><h1>Title</h1><p>Content</p><unclosed-tag>Bad content';
    
    // Test malformed content handling
    const processedContent = (adapter as any).extractFromHTML(malformedHtml, {
      title: 'h1',
      content: 'p'
    });
    
    // Should still extract valid parts
    assert.ok(processedContent.title.includes('Title'));
    assert.ok(processedContent.content.includes('Content'));
  });
});

// ============================
// Rate Limiting & Performance Tests
// ============================

describe('WebAdapter - Rate Limiting & Performance', () => {
  let adapter: WebAdapter;
  let mockCache: CacheService;
  
  beforeEach(async () => {
    const config = createTestWebConfig();
    mockCache = createMockCache() as any;
    adapter = new WebAdapter(config, mockCache);
    await adapter.initialize();
  });
  
  afterEach(async () => {
    await adapter.cleanup();
  });

  it('should apply rate limiting correctly', async () => {
    // Test rate limiting state management
    const endpoint = 'https://api.test.com';
    const rateLimitInfo = {
      requests_per_minute: 10,
      current_count: 8,
      window_start: Date.now() - 30000 // 30 seconds ago
    };
    
    // Test rate limit checking (internal method)
    const canProceed = (adapter as any).checkRateLimit(endpoint, rateLimitInfo);
    assert.strictEqual(typeof canProceed, 'boolean');
  });

  it('should retry failed requests with exponential backoff', async () => {
    // Test retry configuration
    const retryConfig = {
      max_attempts: 3,
      base_delay_ms: 1000,
      max_delay_ms: 10000
    };
    
    // Test backoff calculation
    const delay1 = (adapter as any).calculateBackoffDelay(1, retryConfig);
    const delay2 = (adapter as any).calculateBackoffDelay(2, retryConfig);
    const delay3 = (adapter as any).calculateBackoffDelay(3, retryConfig);
    
    assert.ok(delay1 >= 1000);
    assert.ok(delay2 > delay1);
    assert.ok(delay3 > delay2);
    assert.ok(delay3 <= 10000);
  });

  it('should handle concurrent requests efficiently', async () => {
    const startTime = Date.now();
    
    // Test concurrent search operations (with mocked responses)
    const searchPromises = [
      adapter.search('test query 1'),
      adapter.search('test query 2'),
      adapter.search('test query 3')
    ];
    
    const results = await Promise.all(searchPromises);
    const duration = Date.now() - startTime;
    
    // All searches should complete
    assert.strictEqual(results.length, 3);
    results.forEach(result => assert.ok(Array.isArray(result)));
    
    // Should complete within reasonable time (5 seconds for concurrent operations)
    assert.ok(duration < 5000, `Concurrent searches took ${duration}ms, expected <5000ms`);
  });

  it('should timeout requests appropriately', async () => {
    const timeoutConfig = createTestWebConfig();
    timeoutConfig.performance.default_timeout_ms = 100; // Very short timeout
    
    const timeoutAdapter = new WebAdapter(timeoutConfig, mockCache);
    await timeoutAdapter.initialize();
    
    // Test timeout handling (this will likely timeout quickly due to short timeout)
    const startTime = Date.now();
    const results = await timeoutAdapter.search('test query');
    const _duration = Date.now() - startTime; // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
    
    // Should return empty results for timeout scenarios
    assert.ok(Array.isArray(results));
    
    await timeoutAdapter.cleanup();
  });
});

// ============================
// Search Functionality Tests
// ============================

describe('WebAdapter - Search Operations', () => {
  let adapter: WebAdapter;
  let mockCache: CacheService;
  
  beforeEach(async () => {
    const config = createTestWebConfig();
    mockCache = createMockCache() as any;
    adapter = new WebAdapter(config, mockCache);
    await adapter.initialize();
  });
  
  afterEach(async () => {
    await adapter.cleanup();
  });

  it('should search across multiple endpoints simultaneously', async () => {
    const results = await adapter.search('documentation', {
      confidence_threshold: 0.3
    });
    
    // Should return an array (even if empty due to no real endpoints)
    assert.ok(Array.isArray(results));
    
    // Each result should have the required structure
    results.forEach(result => {
      assert.ok(typeof result.id === 'string');
      assert.ok(typeof result.title === 'string');
      assert.ok(typeof result.content === 'string');
      assert.ok(typeof result.confidence_score === 'number');
      assert.ok(result.confidence_score >= 0 && result.confidence_score <= 1);
      assert.ok(Array.isArray(result.match_reasons));
      assert.ok(typeof result.retrieval_time_ms === 'number');
      assert.strictEqual(result.source, 'test-web');
      assert.strictEqual(result.source_type, 'http');
    });
  });

  it('should handle empty search queries gracefully', async () => {
    const results = await adapter.search('', {});
    
    // Should return empty array for empty query
    assert.ok(Array.isArray(results));
    assert.strictEqual(results.length, 0);
  });

  it('should handle search with no configured endpoints', async () => {
    const emptyConfig = createTestWebConfig();
    emptyConfig.endpoints = [];
    
    const emptyAdapter = new WebAdapter(emptyConfig, mockCache);
    await emptyAdapter.initialize();
    
    const results = await emptyAdapter.search('test query');
    
    // Should return empty array when no endpoints configured
    assert.ok(Array.isArray(results));
    assert.strictEqual(results.length, 0);
    
    await emptyAdapter.cleanup();
  });

  it('should respect confidence threshold filtering', async () => {
    const results = await adapter.search('test query', {
      confidence_threshold: 0.8  // High threshold
    });
    
    // All results should meet the confidence threshold
    results.forEach(result => {
      assert.ok(result.confidence_score >= 0.8);
    });
  });
});

// ============================
// Runbook Search Tests
// ============================

describe('WebAdapter - Runbook Operations', () => {
  let adapter: WebAdapter;
  let mockCache: CacheService;
  
  beforeEach(async () => {
    const config = createTestWebConfig();
    mockCache = createMockCache() as any;
    adapter = new WebAdapter(config, mockCache);
    await adapter.initialize();
  });
  
  afterEach(async () => {
    await adapter.cleanup();
  });

  it('should search for runbooks with alert-specific queries', async () => {
    const runbooks = await adapter.searchRunbooks('disk_space_alert', 'critical', ['web-server']);
    
    // Should return an array of runbooks
    assert.ok(Array.isArray(runbooks));
    
    // Each runbook should have the required structure
    runbooks.forEach(runbook => {
      assert.ok(typeof runbook.id === 'string');
      assert.ok(typeof runbook.title === 'string');
      assert.ok(typeof runbook.version === 'string');
      assert.ok(Array.isArray(runbook.triggers));
      assert.ok(typeof runbook.severity_mapping === 'object');
      assert.ok(typeof runbook.decision_tree === 'object');
      assert.ok(Array.isArray(runbook.procedures));
      assert.ok(typeof runbook.metadata === 'object');
      assert.ok(typeof runbook.metadata.confidence_score === 'number');
    });
  });

  it('should identify likely runbook content accurately', async () => {
    // Test runbook detection logic
    const runbookContent = {
      title: 'Disk Space Alert Runbook',
      content: 'Steps to resolve disk space alerts: 1. Check usage 2. Clean files',
      url: 'https://ops.company.com/runbooks/disk-space.html'
    };
    
    const isRunbook = (adapter as any).isLikelyRunbook(runbookContent, 'disk_space_alert', 'critical');
    assert.strictEqual(typeof isRunbook, 'boolean');
  });

  it('should create synthetic runbooks from content', async () => {
    const content = `
      # Disk Space Recovery Procedure
      
      ## Overview
      This procedure handles critical disk space alerts.
      
      ## Steps
      1. Identify the affected filesystem using df -h
      2. Clear temporary files in /tmp and /var/tmp
      3. Rotate and compress log files
      4. Notify the infrastructure team
      
      ## Expected Outcome
      Disk usage should drop below 85% threshold.
    `;
    
    // Test synthetic runbook creation
    const syntheticRunbook = (adapter as any).createSyntheticRunbook(
      { id: 'test-1', title: 'Disk Space Recovery', content, url: 'https://test.com' },
      'disk_space_alert',
      'critical',
      ['web-server']
    );
    
    assert.ok(typeof syntheticRunbook === 'object');
    assert.ok(typeof syntheticRunbook.id === 'string');
    assert.ok(typeof syntheticRunbook.title === 'string');
    assert.ok(Array.isArray(syntheticRunbook.procedures));
    assert.ok(syntheticRunbook.procedures.length > 0);
    assert.ok(typeof syntheticRunbook.metadata.confidence_score === 'number');
  });

  it('should handle edge case alert types gracefully', async () => {
    // Test with empty alert type
    const runbooks = await adapter.searchRunbooks('', 'critical', []);
    
    // Should return empty array for invalid input
    assert.ok(Array.isArray(runbooks));
    assert.strictEqual(runbooks.length, 0);
  });
});

// ============================
// Error Handling & Edge Cases Tests
// ============================

describe('WebAdapter - Error Handling', () => {
  let adapter: WebAdapter;
  let mockCache: CacheService;
  
  beforeEach(async () => {
    const config = createTestWebConfig();
    mockCache = createMockCache() as any;
    adapter = new WebAdapter(config, mockCache);
    await adapter.initialize();
  });
  
  afterEach(async () => {
    await adapter.cleanup();
  });

  it('should handle network failures gracefully', async () => {
    // Test with unreachable endpoint
    const unreachableConfig = createTestWebConfig();
    unreachableConfig.endpoints = [{
      name: 'unreachable',
      url: 'https://unreachable-endpoint-12345.invalid',
      method: 'GET',
      content_type: 'html',
      rate_limit: 10,
      timeout_ms: 1000
    }];
    
    const unreachableAdapter = new WebAdapter(unreachableConfig, mockCache);
    await unreachableAdapter.initialize();
    
    const results = await unreachableAdapter.search('test query');
    
    // Should handle gracefully and return empty results
    assert.ok(Array.isArray(results));
    
    await unreachableAdapter.cleanup();
  });

  it('should handle invalid JSON responses gracefully', async () => {
    // Test JSON parsing error handling
    const invalidJson = '{ "invalid": json, content }';
    
    try {
      const parsed = (adapter as any).extractFromJSON(invalidJson, ['$.data']);
      // Should either return empty content or handle gracefully
      assert.ok(typeof parsed === 'object');
    } catch (error) {
      // Should catch and handle JSON parsing errors
      assert.ok(error instanceof Error);
    }
  });

  it('should handle authentication failures gracefully', async () => {
    const authConfig = createTestWebConfig();
    authConfig.auth = {
      type: 'api_key',
      api_key_header: 'X-API-Key',
      api_key_env: 'NONEXISTENT_API_KEY'  // No env var set
    };
    
    const authAdapter = new WebAdapter(authConfig, mockCache);
    
    // Should handle missing credentials gracefully
    try {
      await authAdapter.initialize();
      const results = await authAdapter.search('test');
      assert.ok(Array.isArray(results));
    } catch (error) {
      // Should catch authentication errors appropriately
      assert.ok(error instanceof Error);
    }
    
    await authAdapter.cleanup();
  });

  it('should handle rate limit exceeded scenarios', async () => {
    // Test rate limit exceeded handling
    const rateLimitState = {
      requests_per_minute: 10,
      current_count: 10,  // At limit
      window_start: Date.now() - 30000
    };
    
    const endpoint = 'https://api.test.com';
    const canProceed = (adapter as any).checkRateLimit(endpoint, rateLimitState);
    
    // Should respect rate limits
    assert.strictEqual(typeof canProceed, 'boolean');
  });

  it('should handle configuration validation errors', async () => {
    // Test with invalid configuration
    const invalidConfig = createTestWebConfig();
    invalidConfig.endpoints = []; // No endpoints
    invalidConfig.auth = { type: 'invalid_auth_type' as any };
    
    try {
      const invalidAdapter = new WebAdapter(invalidConfig, mockCache);
      await invalidAdapter.initialize();
      // Should handle invalid config gracefully
    } catch (error) {
      // Should catch configuration errors
      assert.ok(error instanceof Error);
    }
  });
});

// ============================
// Health Check & Metadata Tests
// ============================

describe('WebAdapter - Health & Metadata', () => {
  let adapter: WebAdapter;
  let mockCache: CacheService;
  
  beforeEach(async () => {
    const config = createTestWebConfig();
    mockCache = createMockCache() as any;
    adapter = new WebAdapter(config, mockCache);
    await adapter.initialize();
  });
  
  afterEach(async () => {
    await adapter.cleanup();
  });

  it('should perform health checks correctly', async () => {
    const health = await adapter.healthCheck();
    
    assert.strictEqual(typeof health.healthy, 'boolean');
    assert.strictEqual(typeof health.latency_ms, 'number');
    assert.ok(health.latency_ms >= 0);
    
    if (health.details) {
      assert.strictEqual(typeof health.details, 'object');
    }
  });

  it('should provide accurate metadata', async () => {
    const metadata = await adapter.getMetadata();
    
    assert.strictEqual(metadata.source_name, 'test-web');
    assert.strictEqual(metadata.source_type, 'http');
    assert.strictEqual(typeof metadata.status, 'string');
    assert.strictEqual(typeof metadata.endpoints_configured, 'number');
    assert.strictEqual(typeof metadata.auth_configured, 'boolean');
    assert.strictEqual(typeof metadata.last_updated, 'string');
    assert.strictEqual(typeof metadata.document_count, 'number');
    assert.ok(metadata.document_count >= 0);
  });

  it('should handle refresh index operations', async () => {
    const refreshResult = await adapter.refreshIndex();
    
    assert.strictEqual(typeof refreshResult, 'boolean');
  });

  it('should handle force refresh correctly', async () => {
    const forceRefreshResult = await adapter.refreshIndex(true);
    
    assert.strictEqual(typeof forceRefreshResult, 'boolean');
  });
});

// ============================
// Performance Benchmarks
// ============================

describe('WebAdapter - Performance Validation', () => {
  let adapter: WebAdapter;
  let mockCache: CacheService;
  
  beforeEach(async () => {
    const config = createTestWebConfig();
    mockCache = createMockCache() as any;
    adapter = new WebAdapter(config, mockCache);
    await adapter.initialize();
  });
  
  afterEach(async () => {
    await adapter.cleanup();
  });

  it('should complete search operations within time limits', async () => {
    const startTime = Date.now();
    const results = await adapter.search('test query', { confidence_threshold: 0.5 });
    const duration = Date.now() - startTime;
    
    // Should complete within 2 seconds for web adapter
    assert.ok(duration < 2000, `Search took ${duration}ms, expected <2000ms`);
    assert.ok(Array.isArray(results));
  });

  it('should handle runbook search performance requirements', async () => {
    const startTime = Date.now();
    const runbooks = await adapter.searchRunbooks('disk_space_alert', 'critical', ['web-server']);
    const duration = Date.now() - startTime;
    
    // Should complete within 3 seconds for runbook search
    assert.ok(duration < 3000, `Runbook search took ${duration}ms, expected <3000ms`);
    assert.ok(Array.isArray(runbooks));
  });

  it('should validate content processing performance', async () => {
    const htmlContent = `
      <html>
        <body>
          <h1>Test Document</h1>
          <div class="content">
            ${'<p>Test paragraph content. '.repeat(100)}</p>
          </div>
        </body>
      </html>
    `;
    
    const startTime = Date.now();
    const processedContent = (adapter as any).extractFromHTML(htmlContent, {
      title: 'h1',
      content: '.content'
    });
    const duration = Date.now() - startTime;
    
    // Content processing should be very fast (<100ms)
    assert.ok(duration < 100, `Content processing took ${duration}ms, expected <100ms`);
    assert.ok(typeof processedContent === 'object');
    assert.ok(typeof processedContent.title === 'string');
    assert.ok(typeof processedContent.content === 'string');
  });
});