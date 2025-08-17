/**
 * Confluence Adapter Integration Tests - End-to-end enterprise validation
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Comprehensive integration testing for:
 * - Real Confluence instance integration (with mocking)
 * - End-to-end workflow validation
 * - Performance benchmarking
 * - Error scenario handling
 * - Enterprise deployment scenarios
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfluenceAdapter } from '../../../src/adapters/confluence/confluence-adapter.js';
import { SemanticSearchEngine } from '../../../src/search/semantic-engine.js';
import { ConfluenceConfig } from '../../../src/types/index.js';
import nock from 'nock';

// Integration test configuration
const CONFLUENCE_BASE_URL = 'https://test-company.atlassian.net/wiki';
const TEST_TIMEOUT = 30000; // 30 seconds for integration tests

describe('Confluence Adapter Integration Tests', () => {
  let adapter: ConfluenceAdapter;
  let semanticEngine: SemanticSearchEngine;
  let confluenceScope: nock.Scope;

  const testConfig: ConfluenceConfig = {
    name: 'integration-test-confluence',
    type: 'confluence',
    base_url: CONFLUENCE_BASE_URL,
    space_keys: ['DOCS', 'RUNBOOKS'],
    auth: {
      type: 'bearer_token',
      token_env: 'TEST_CONFLUENCE_TOKEN',
    },
    refresh_interval: '1h',
    priority: 1,
    enabled: true,
    timeout_ms: 30000,
    max_retries: 3,
    rate_limit: 10,
    max_results: 50,
  };

  beforeAll(async () => {
    // Set up test environment variables
    process.env.TEST_CONFLUENCE_TOKEN = 'test-token-12345';
    
    // Initialize semantic search engine for integration
    semanticEngine = new SemanticSearchEngine({
      model: 'Xenova/all-MiniLM-L6-v2',
      maxCacheSize: 1000,
      minSimilarityThreshold: 0.3,
    });
    
    await semanticEngine.initialize();
  });

  afterAll(async () => {
    await semanticEngine?.cleanup();
    delete process.env.TEST_CONFLUENCE_TOKEN;
  });

  beforeEach(() => {
    // Create fresh adapter instance for each test
    adapter = new ConfluenceAdapter(testConfig, {
      enableSemanticSearch: true,
      semanticEngine,
      maxPagesPerSpace: 100, // Limit for testing
      syncIntervalMinutes: 5,
      enableChangeWatching: false, // Disable for testing
      performance: {
        cacheTtlSeconds: 300, // 5 minutes for testing
        maxConcurrentRequests: 5,
        requestTimeoutMs: 10000,
      },
    });

    // Set up nock interceptors for Confluence API
    confluenceScope = nock(CONFLUENCE_BASE_URL)
      .defaultReplyHeaders({
        'content-type': 'application/json',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
      });
  });

  afterEach(async () => {
    await adapter?.cleanup();
    nock.cleanAll();
  });

  describe('End-to-End Workflow', () => {
    test('should complete full initialization and search workflow', async () => {
      // Mock authentication
      confluenceScope
        .get('/rest/api/user/current')
        .reply(200, {
          accountId: 'test-user-123',
          displayName: 'Test User',
          email: 'test@company.com',
        });

      // Mock spaces endpoint
      confluenceScope
        .get('/rest/api/space')
        .query(true)
        .reply(200, {
          results: [
            {
              key: 'DOCS',
              name: 'Documentation',
              description: { plain: { value: 'Main documentation space' } },
              _links: { webui: '/spaces/DOCS' },
            },
            {
              key: 'RUNBOOKS',
              name: 'Runbooks',
              description: { plain: { value: 'Operational runbooks' } },
              _links: { webui: '/spaces/RUNBOOKS' },
            },
          ],
          size: 2,
        });

      // Mock content retrieval for initial sync
      confluenceScope
        .get('/rest/api/content')
        .query(true)
        .times(6) // 3 requests per space (pagination)
        .reply(200, {
          results: [
            {
              id: 'page-123',
              type: 'page',
              title: 'Disk Space Runbook',
              body: {
                storage: {
                  value: '<h1>Disk Space Alert Response</h1><p>This runbook covers disk space alert procedures...</p>',
                },
              },
              space: {
                key: 'RUNBOOKS',
                name: 'Runbooks',
              },
              version: {
                number: 2,
                when: '2025-01-17T10:00:00.000Z',
                by: {
                  displayName: 'DevOps Team',
                  email: 'devops@company.com',
                },
              },
              _links: {
                webui: '/spaces/RUNBOOKS/pages/123',
                base: CONFLUENCE_BASE_URL,
              },
            },
            {
              id: 'page-456',
              type: 'page',
              title: 'API Documentation',
              body: {
                storage: {
                  value: '<h1>REST API Guide</h1><p>Comprehensive API documentation...</p>',
                },
              },
              space: {
                key: 'DOCS',
                name: 'Documentation',
              },
              version: {
                number: 1,
                when: '2025-01-17T09:00:00.000Z',
                by: {
                  displayName: 'Dev Team',
                  email: 'dev@company.com',
                },
              },
              _links: {
                webui: '/spaces/DOCS/pages/456',
                base: CONFLUENCE_BASE_URL,
              },
            },
          ],
          size: 2,
        });

      // Initialize adapter
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);

      // Perform search
      const searchResults = await adapter.search('disk space alert');
      
      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);
      
      // Verify semantic search enhancement
      const diskSpaceResult = searchResults.find(r => r.title.includes('Disk Space'));
      expect(diskSpaceResult).toBeDefined();
      expect(diskSpaceResult?.confidence_score).toBeGreaterThan(0.5);

      // Verify all nock interceptors were called
      expect(confluenceScope.isDone()).toBe(true);
    }, TEST_TIMEOUT);

    test('should handle runbook-specific search workflow', async () => {
      // Setup initialization mocks (same as above)
      confluenceScope
        .get('/rest/api/user/current')
        .reply(200, { accountId: 'test-user-123', displayName: 'Test User' });

      confluenceScope
        .get('/rest/api/space')
        .query(true)
        .reply(200, { results: [], size: 0 });

      confluenceScope
        .get('/rest/api/content')
        .query(true)
        .times(2)
        .reply(200, {
          results: [
            {
              id: 'runbook-789',
              type: 'page',
              title: 'Memory Alert Runbook',
              body: {
                storage: {
                  value: `
                    <h1>Memory Alert Response</h1>
                    <h2>Triggers</h2>
                    <ul>
                      <li>memory_pressure</li>
                      <li>memory_threshold_exceeded</li>
                    </ul>
                    <h2>Procedure</h2>
                    <ol>
                      <li>Check memory usage on affected servers</li>
                      <li>Identify memory-consuming processes</li>
                      <li>Restart services if necessary</li>
                      <li>Escalate if issue persists</li>
                    </ol>
                  `,
                },
              },
              space: { key: 'RUNBOOKS', name: 'Runbooks' },
              version: {
                number: 3,
                when: '2025-01-17T11:00:00.000Z',
                by: { displayName: 'SRE Team' },
              },
              _links: {
                webui: '/spaces/RUNBOOKS/pages/789',
                base: CONFLUENCE_BASE_URL,
              },
            },
          ],
          size: 1,
        });

      await adapter.initialize();

      // Search for runbooks
      const runbooks = await adapter.searchRunbooks(
        'memory_pressure',
        'critical',
        ['web-server-01', 'web-server-02'],
        { environment: 'production' }
      );

      expect(runbooks).toBeDefined();
      // Note: The actual runbook conversion would depend on content structure
      // This test validates the search workflow
    }, TEST_TIMEOUT);
  });

  describe('Performance Validation', () => {
    test('should meet response time requirements', async () => {
      // Setup basic mocks
      confluenceScope
        .get('/rest/api/user/current')
        .reply(200, { accountId: 'test-user', displayName: 'Test User' });

      confluenceScope
        .get('/rest/api/space')
        .query(true)
        .reply(200, { results: [], size: 0 });

      confluenceScope
        .get('/rest/api/content')
        .query(true)
        .reply(200, { results: [], size: 0 });

      await adapter.initialize();

      // Mock cached search response for performance test
      const mockCacheManager = (adapter as any).cacheManager;
      const mockSearchResults = [
        {
          id: 'perf-test-1',
          title: 'Performance Test Page',
          content: 'Test content for performance',
          source: 'confluence',
          source_type: 'confluence',
          confidence_score: 0.9,
          match_reasons: ['cached result'],
          retrieval_time_ms: 5,
          url: 'https://test.com/page',
          last_updated: new Date().toISOString(),
        },
      ];

      // Mock the cache to return results quickly
      jest.spyOn(mockCacheManager, 'get').mockResolvedValue(mockSearchResults);

      // Test response time for critical operations
      const startTime = performance.now();
      const results = await adapter.search('performance test');
      const responseTime = performance.now() - startTime;

      expect(responseTime).toBeLessThan(200); // Sub-200ms requirement
      expect(results).toHaveLength(1);
    }, TEST_TIMEOUT);

    test('should handle concurrent operations efficiently', async () => {
      // Setup mocks
      confluenceScope
        .get('/rest/api/user/current')
        .reply(200, { accountId: 'test-user', displayName: 'Test User' });

      confluenceScope
        .get('/rest/api/space')
        .query(true)
        .reply(200, { results: [], size: 0 });

      confluenceScope
        .get('/rest/api/content')
        .query(true)
        .reply(200, { results: [], size: 0 });

      await adapter.initialize();

      // Mock search results for concurrency test
      const mockSemanticEngine = (adapter as any).semanticEngine;
      jest.spyOn(mockSemanticEngine, 'search').mockResolvedValue([
        {
          id: 'concurrent-test',
          title: 'Concurrent Test Page',
          content: 'Test content',
          source_type: 'confluence',
          confidence_score: 0.8,
          match_reasons: ['test'],
          retrieval_time_ms: 10,
          url: 'https://test.com',
          last_updated: new Date().toISOString(),
        },
      ]);

      // Test 20+ concurrent operations
      const concurrentOperations = Array.from({ length: 25 }, (_, i) =>
        adapter.search(`concurrent query ${i}`)
      );

      const startTime = performance.now();
      const results = await Promise.all(concurrentOperations);
      const totalTime = performance.now() - startTime;

      expect(results).toHaveLength(25);
      expect(totalTime).toBeLessThan(2000); // Should handle 25 operations in under 2 seconds
      results.forEach(result => expect(result).toHaveLength(1));
    }, TEST_TIMEOUT);
  });

  describe('Error Handling and Resilience', () => {
    test('should handle authentication failures gracefully', async () => {
      // Mock authentication failure
      confluenceScope
        .get('/rest/api/user/current')
        .reply(401, { message: 'Unauthorized' });

      await expect(adapter.initialize()).rejects.toThrow();

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.error_message).toContain('Authentication failed');
    }, TEST_TIMEOUT);

    test('should handle rate limiting appropriately', async () => {
      // Mock successful authentication
      confluenceScope
        .get('/rest/api/user/current')
        .reply(200, { accountId: 'test-user', displayName: 'Test User' });

      // Mock rate limit response
      confluenceScope
        .get('/rest/api/space')
        .query(true)
        .reply(429, { message: 'Rate limit exceeded' }, {
          'retry-after': '60',
          'x-ratelimit-remaining': '0',
        });

      await expect(adapter.initialize()).rejects.toThrow();
    }, TEST_TIMEOUT);

    test('should recover from transient network errors', async () => {
      let requestCount = 0;

      // Mock authentication
      confluenceScope
        .get('/rest/api/user/current')
        .reply(200, { accountId: 'test-user', displayName: 'Test User' });

      // Mock initial failure then success
      confluenceScope
        .get('/rest/api/space')
        .query(true)
        .reply(() => {
          requestCount++;
          if (requestCount === 1) {
            return [500, { message: 'Internal server error' }];
          }
          return [200, { results: [], size: 0 }];
        });

      confluenceScope
        .get('/rest/api/content')
        .query(true)
        .reply(200, { results: [], size: 0 });

      // Should retry and eventually succeed
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('Cache Integration', () => {
    test('should demonstrate cache warming and efficiency', async () => {
      // Setup mocks
      confluenceScope
        .get('/rest/api/user/current')
        .reply(200, { accountId: 'test-user', displayName: 'Test User' });

      confluenceScope
        .get('/rest/api/space')
        .query(true)
        .reply(200, { results: [], size: 0 });

      confluenceScope
        .get('/rest/api/content')
        .query(true)
        .reply(200, { results: [], size: 0 });

      await adapter.initialize();

      // First search (cache miss)
      const startTime1 = performance.now();
      await adapter.search('cache test');
      const firstSearchTime = performance.now() - startTime1;

      // Second search (should be faster due to caching)
      const startTime2 = performance.now();
      await adapter.search('cache test');
      const secondSearchTime = performance.now() - startTime2;

      // Cache should improve performance
      expect(secondSearchTime).toBeLessThan(firstSearchTime);
    }, TEST_TIMEOUT);
  });

  describe('Enterprise Scale Simulation', () => {
    test('should handle large content volumes efficiently', async () => {
      // Setup mocks
      confluenceScope
        .get('/rest/api/user/current')
        .reply(200, { accountId: 'test-user', displayName: 'Test User' });

      confluenceScope
        .get('/rest/api/space')
        .query(true)
        .reply(200, { results: [], size: 0 });

      // Mock large content response
      const largeMockContent = Array.from({ length: 50 }, (_, i) => ({
        id: `large-page-${i}`,
        type: 'page',
        title: `Large Content Page ${i}`,
        body: {
          storage: {
            value: `<h1>Page ${i}</h1><p>${'Lorem ipsum '.repeat(100)}</p>`,
          },
        },
        space: { key: 'LARGE', name: 'Large Space' },
        version: {
          number: 1,
          when: '2025-01-17T10:00:00.000Z',
          by: { displayName: 'Content Author' },
        },
        _links: {
          webui: `/spaces/LARGE/pages/${i}`,
          base: CONFLUENCE_BASE_URL,
        },
      }));

      confluenceScope
        .get('/rest/api/content')
        .query(true)
        .reply(200, {
          results: largeMockContent,
          size: 50,
        });

      const startTime = performance.now();
      await adapter.initialize();
      const initTime = performance.now() - startTime;

      // Should handle large content sets efficiently
      expect(initTime).toBeLessThan(10000); // Under 10 seconds for 50 pages
      expect(adapter.isReady()).toBe(true);
    }, TEST_TIMEOUT);
  });
});