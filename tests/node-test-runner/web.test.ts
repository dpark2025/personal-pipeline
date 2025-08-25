/**
 * WebAdapter Tests using Node.js Test Runner
 *
 * Pilot implementation to demonstrate benefits over Jest
 * This file tests the same functionality as tests/unit/adapters/web.test.ts
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import nock from 'nock';
import { WebAdapter } from '../../src/adapters/web.js';

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
          content_type: 'html'
        }]
      }],
      performance: {
        default_timeout_ms: 15000,
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
            content_type: 'html'
          }]
        }],
        performance: {
          default_timeout_ms: 15000,
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
      assert.strictEqual(config.performance.default_timeout_ms, 15000);
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

  describe('Web Crawling (Fixed HTTP Mocking)', () => {
    beforeEach(() => {
      // Mock robots.txt to allow crawling
      nock('https://example.com').get('/robots.txt').reply(404);
    });

    it('should crawl a single page successfully', async () => {
      const html = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <article>
              <h1>Test Article</h1>
              <p>This is test content with some information.</p>
              <p>Step 1: First procedure step</p>
              <p>Step 2: Second procedure step</p>
            </article>
          </body>
        </html>
      `;

      nock('https://example.com').get('/').reply(200, html, { 'Content-Type': 'text/html' });

      await adapter.initialize();
      const result = await adapter.refreshIndex(true);

      assert.strictEqual(result, true);

      const metadata = await adapter.getMetadata();
      assert.strictEqual(metadata.documentCount, 1);
    });

    it('should extract content and follow links within depth limit (FIXED)', async () => {
      const mainHtml = `
        <html>
          <head><title>Main Page</title></head>
          <body>
            <article>
              <h1>Main Article</h1>
              <p>This is the main content.</p>
              <a href="/page2">Link to Page 2</a>
            </article>
          </body>
        </html>
      `;

      const page2Html = `
        <html>
          <head><title>Page 2</title></head>
          <body>
            <article>
              <h1>Second Page</h1>
              <p>This is the second page content.</p>
            </article>
          </body>
        </html>
      `;

      // Set up nock interceptors - these will work properly without got mock conflicts!
      nock('https://example.com').get('/').reply(200, mainHtml).get('/page2').reply(200, page2Html);

      const depthConfig = { ...mockConfig, max_depth: 2 };
      const depthAdapter = new WebAdapter(depthConfig);

      await depthAdapter.initialize();
      const result = await depthAdapter.refreshIndex(true);

      assert.strictEqual(result, true);

      const metadata = await depthAdapter.getMetadata();
      console.log('Node.js Test Runner - indexed documents:', metadata.documentCount);
      console.log('Node.js Test Runner - metadata:', metadata);

      // This should work correctly now - no mock conflicts!
      assert.strictEqual(metadata.documentCount, 2, 'Should crawl both main page and linked page');
    });

    it('should handle HTTP errors gracefully', async () => {
      nock('https://example.com').get('/').reply(404, 'Not Found');

      await adapter.initialize();
      const result = await adapter.refreshIndex(true);

      // Should complete but with no documents
      assert.strictEqual(result, true);

      const metadata = await adapter.getMetadata();
      assert.strictEqual(metadata.documentCount, 0);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      nock('https://example.com').get('/robots.txt').reply(404);

      // Mock a page with searchable content
      const html = `
        <html>
          <body>
            <article>
              <h1>Database Performance Guide</h1>
              <p>This guide covers database optimization and troubleshooting.</p>
              <p>Step 1: Analyze query performance</p>
              <p>Step 2: Optimize indexes</p>
              <p>Common issues include high CPU usage and slow queries.</p>
            </article>
          </body>
        </html>
      `;

      nock('https://example.com').get('/').reply(200, html);

      await adapter.initialize();
      await adapter.refreshIndex(true);
    });

    it('should search documents and return results', async () => {
      const results = await adapter.search('database performance');

      assert(results.length > 0, 'Should return search results');
      assert.strictEqual(results[0].title, 'Database Performance Guide');
      assert(results[0].confidence_score > 0.5, 'Should have reasonable confidence score');
      assert.strictEqual(results[0].source_type, 'web');
    });

    it('should return empty results for non-matching queries', async () => {
      const results = await adapter.search('quantum mechanics');
      assert.strictEqual(results.length, 0);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when base URL is accessible', async () => {
      nock('https://example.com').head('/').reply(200);

      await adapter.initialize();

      const health = await adapter.healthCheck();
      assert.strictEqual(health.healthy, true);
      assert.strictEqual(health.source_name, 'test-web');
      assert(health.response_time_ms > 0);
    });

    it('should return unhealthy status when base URL is not accessible', async () => {
      nock('https://example.com').head('/').reply(500, 'Server Error');

      await adapter.initialize();

      const health = await adapter.healthCheck();
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
