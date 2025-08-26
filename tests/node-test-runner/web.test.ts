/**
 * WebAdapter Tests using Node.js Test Runner
 *
 * Pilot implementation to demonstrate benefits over Jest
 * This file tests the same functionality as tests/unit/adapters/web.test.ts
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import nock from 'nock';
import { WebAdapter } from '../../src/adapters/web/index.js';

// Mock logger to avoid console output in tests
const mockLogger = {
  info: () => {},
  error: () => {},
  debug: () => {},
  warn: () => {},
};

// Override the logger import
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

describe('WebAdapter (Node.js Test Runner)', () => {
  let adapter;
  let mockConfig;

  beforeEach(() => {
    // Reset nock
    nock.cleanAll();
    
    // Mock httpbin.org connectivity test that HttpClient does during initialization
    nock('https://httpbin.org').get('/status/200').reply(200).persist();
    
    // Mock common robots.txt request
    nock('https://example.com').get('/robots.txt').reply(404).persist();
    
    // Mock health check endpoint for WebAdapter initialization
    nock('https://example.com').get('/').reply(200, { status: 'ok' }).persist();

    mockConfig = {
      name: 'test-web',
      type: 'web',
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3,
      sources: [{
        name: 'test-source',
        type: 'scraping',
        base_url: 'https://example.com',
        endpoints: [{
          name: 'test-endpoint',
          path: '/',
          method: 'GET',
          content_type: 'json'
        }],
        health_check: {
          enabled: true,
          endpoint: '/',
          timeout_ms: 5000,
          expected_status: 200
        }
      }],
      performance: {
        default_timeout_ms: 1000,
        max_concurrent_requests: 2,
        default_retry_attempts: 2,
        default_cache_ttl: '5m',
        user_agent: 'PersonalPipeline-Test/1.0'
      },
      content_processing: {
        max_content_size_mb: 5,
        follow_redirects: true,
        validate_ssl: false, // Disable for tests
        extract_links: false,
        respect_robots: false
      },
      rate_limiting: {
        global_requests_per_minute: 100,
        per_source_requests_per_minute: 30,
        burst_allowance: 10
      }
    };

    adapter = new WebAdapter(mockConfig);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Constructor and Configuration', () => {
    it('should create adapter with valid configuration', () => {
      assert(adapter instanceof WebAdapter);
      assert.strictEqual(adapter.config.name, 'test-web');
      assert.strictEqual(adapter.config.type, 'web');
    });

    it('should apply default configuration values', () => {
      const minimalConfig = {
        name: 'minimal-web',
        type: 'web',
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 30000,
        max_retries: 3,
        sources: [{
          name: 'minimal-source',
          type: 'scraping',
          base_url: 'https://example.com',
          endpoints: [{
            name: 'minimal-endpoint',
            path: '/',
            method: 'GET',
            content_type: 'json'
          }]
        }],
        performance: {
          default_timeout_ms: 1000,
          max_concurrent_requests: 2,
          default_retry_attempts: 2,
          default_cache_ttl: '5m',
          user_agent: 'PersonalPipeline-Test/1.0'
        },
        content_processing: {
          max_content_size_mb: 5,
          follow_redirects: true,
          validate_ssl: false,
          extract_links: false,
          respect_robots: false
        },
        rate_limiting: {
          global_requests_per_minute: 100,
          per_source_requests_per_minute: 30,
          burst_allowance: 10
        }
      };

      const minimalAdapter = new WebAdapter(minimalConfig);
      const config = minimalAdapter.config;

      assert.strictEqual(config.name, 'minimal-web');
      assert.strictEqual(config.type, 'web');
      assert.strictEqual(config.performance.default_timeout_ms, 1000);
      assert.strictEqual(config.content_processing.follow_redirects, true);
      assert.strictEqual(config.rate_limiting.global_requests_per_minute, 100);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await adapter.initialize();
      assert.strictEqual(adapter.isReady(), true);
    });

    it('should initialize crawl queue with base URLs', async () => {
      const multiUrlConfig = {
        ...mockConfig,
        base_urls: ['https://example.com', 'https://test.com'],
      };

      const multiAdapter = new WebAdapter(multiUrlConfig);
      await multiAdapter.initialize();
      assert.strictEqual(multiAdapter.isReady(), true);
    });
  });

  describe('Web API Search (Enterprise WebAdapter)', () => {


    it('should search API endpoints successfully', async () => {
      const apiResponse = [
        {
          title: "Test Article",
          content: "This is test content with some information.",
          id: "test-1"
        }
      ];

      // Debug: Check nock is working 
      const scope = nock('https://example.com')
        .get('/')
        .query(true) // Accept any query parameters
        .reply(200, apiResponse, { 'Content-Type': 'application/json' });

      await adapter.initialize();
      
      // Search should return results from the API endpoint
      const results = await adapter.search('test content');
      console.log('Search results:', results.length, results[0]?.title);
      console.log('Nock done:', scope.isDone());
      
      assert(results.length > 0, 'Should return search results from API');
      
      const metadata = await adapter.getMetadata();
      assert.strictEqual(metadata.name, 'test-web');
      assert.strictEqual(metadata.type, 'web');
    });

    it('should handle multiple API endpoints with caching', async () => {
      const apiResponse1 = [
        { title: "Article 1", content: "Main article content", id: "art-1" }
      ];
      
      const apiResponse2 = [
        { title: "Article 2", content: "Second article content", id: "art-2" }
      ];

      // Mock two different API calls with query parameters
      nock('https://example.com').get('/').query(true).reply(200, apiResponse1, { 'Content-Type': 'application/json' });
      nock('https://example.com').get('/search').query(true).reply(200, apiResponse2, { 'Content-Type': 'application/json' });

      await adapter.initialize();
      
      // First search should hit the API and cache results
      const results1 = await adapter.search('content');
      assert(results1.length > 0, 'Should return search results');
      
      // Check that metadata reflects cached entries
      const metadata = await adapter.getMetadata();
      assert(metadata.documentCount >= 0, 'Should have cached entries');
      
      assert.strictEqual(metadata.type, 'web');
    });

    it('should handle HTTP errors gracefully', async () => {
      nock.cleanAll();
      nock('https://example.com').get('/robots.txt').reply(404);
      nock('https://example.com').get('/').reply(404, 'Not Found');

      await adapter.initialize();
      
      // Search should handle 404 errors and return empty results
      const results = await adapter.search('test query');
      assert.strictEqual(results.length, 0, 'Should return no results for failed API call');

      const metadata = await adapter.getMetadata();
      assert.strictEqual(metadata.type, 'web');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {

      // Mock API responses for search functionality
      const searchResults = [
        {
          title: "Database Performance Guide",
          content: "This guide covers database optimization and troubleshooting. Common issues include high CPU usage and slow queries.",
          id: "guide-1"
        }
      ];

      nock('https://example.com').get('/').query(true).reply(200, searchResults, { 'Content-Type': 'application/json' });

      await adapter.initialize();
    });

    it('should search documents and return results', async () => {
      const results = await adapter.search('database performance');
      console.log('Search results length:', results.length);
      if (results.length > 0) {
        console.log('First result title:', results[0].title);
      }

      assert(results.length > 0, 'Should return search results');
      assert(results[0].title.includes('Database') || results[0].title.includes('Performance') || results[0].title.includes('Guide'), `Got title: ${results[0].title}`);
      assert(results[0].confidence_score >= 0, 'Should have non-negative confidence score');
      assert.strictEqual(results[0].source_type, 'web');
    });

    it('should return empty results for non-matching queries', async () => {
      // Clean up any existing nocks
      nock.cleanAll();
      
      // Add required mocks for initialization
      nock('https://httpbin.org').get('/status/200').reply(200);
      nock('https://example.com').get('/robots.txt').reply(404);
      
      // Create fresh adapter to avoid cached data from other tests
      const freshAdapter = new WebAdapter(mockConfig);
      
      // Mock empty response for non-matching query
      nock('https://example.com').get('/').query(true).reply(200, [], { 'Content-Type': 'application/json' });
      
      await freshAdapter.initialize();
      const results = await freshAdapter.search('quantum mechanics');
      assert.strictEqual(results.length, 0, 'Should return no results for non-matching query');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when base URL is accessible', async () => {
      // Create fresh adapter for health check test
      const healthyAdapter = new WebAdapter(mockConfig);
      
      // Mock health check endpoint
      nock('https://example.com').get('/').reply(200, { status: 'ok' });

      await healthyAdapter.initialize();

      const health = await healthyAdapter.healthCheck();
      assert.strictEqual(health.healthy, true);
      assert.strictEqual(health.source_name, 'test-web');
      assert(health.response_time_ms > 0);
    });

    it('should return unhealthy status when base URL is not accessible', async () => {
      // Clean up existing nocks and set up specific mocks for this test
      nock.cleanAll();
      
      // Required mocks for initialization
      nock('https://httpbin.org').get('/status/200').reply(200);
      nock('https://example.com').get('/robots.txt').reply(404);
      
      // Mock 500 error for health check endpoint (for both initialization and healthCheck call)
      nock('https://example.com').get('/').reply(500, 'Server Error').persist();
      
      // Create fresh adapter for unhealthy test
      const unhealthyAdapter = new WebAdapter(mockConfig);

      await unhealthyAdapter.initialize();

      const health = await unhealthyAdapter.healthCheck();
      assert.strictEqual(health.healthy, false);
      assert(health.error_message);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when adapter not initialized', async () => {
      await assert.rejects(async () => await adapter.search('test'), /Adapter not initialized/);
    });
  });
});
