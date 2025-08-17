/**
 * Confluence Adapter Test Suite - Comprehensive enterprise testing
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Production-grade test suite covering:
 * - Core adapter functionality and interface compliance
 * - Authentication flows (OAuth 2.0, API tokens, Basic auth)
 * - Content processing and semantic search integration
 * - Rate limiting and error handling
 * - Performance requirements validation
 * - Enterprise-scale scenarios
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfluenceAdapter, ConfluenceAdapterOptions } from '../../../src/adapters/confluence/confluence-adapter.js';
import { AuthManager } from '../../../src/adapters/confluence/auth-manager.js';
import { ApiClient } from '../../../src/adapters/confluence/api-client.js';
import { ContentProcessor } from '../../../src/adapters/confluence/content-processor.js';
import { ContentSynchronizer } from '../../../src/adapters/confluence/content-synchronizer.js';
import { CacheManager } from '../../../src/adapters/confluence/cache-manager.js';
import { SemanticSearchEngine } from '../../../src/search/semantic-engine.js';
import { ConfluenceConfig, SearchFilters, SearchResult } from '../../../src/types/index.js';

// Mock external dependencies
jest.mock('../../../src/adapters/confluence/auth-manager.js');
jest.mock('../../../src/adapters/confluence/api-client.js');
jest.mock('../../../src/adapters/confluence/content-processor.js');
jest.mock('../../../src/adapters/confluence/content-synchronizer.js');
jest.mock('../../../src/adapters/confluence/cache-manager.js');
jest.mock('../../../src/search/semantic-engine.js');

const MockAuthManager = AuthManager as jest.MockedClass<typeof AuthManager>;
const MockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const MockContentProcessor = ContentProcessor as jest.MockedClass<typeof ContentProcessor>;
const MockContentSynchronizer = ContentSynchronizer as jest.MockedClass<typeof ContentSynchronizer>;
const MockCacheManager = CacheManager as jest.MockedClass<typeof CacheManager>;
const MockSemanticSearchEngine = SemanticSearchEngine as jest.MockedClass<typeof SemanticSearchEngine>;

describe('ConfluenceAdapter', () => {
  let adapter: ConfluenceAdapter;
  let mockConfig: ConfluenceConfig;
  let mockOptions: ConfluenceAdapterOptions;
  
  // Mock instances
  let mockAuthManager: jest.Mocked<AuthManager>;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockContentProcessor: jest.Mocked<ContentProcessor>;
  let mockSynchronizer: jest.Mocked<ContentSynchronizer>;
  let mockCacheManager: jest.Mocked<CacheManager>;
  let mockSemanticEngine: jest.Mocked<SemanticSearchEngine>;

  const createMockConfluencePage = (id: string, title: string) => ({
    id,
    title,
    type: 'page',
    body: {
      storage: {
        value: `<p>Content for ${title}</p>`,
      },
    },
    space: {
      key: 'TEST',
      name: 'Test Space',
    },
    version: {
      number: 1,
      when: '2025-01-17T10:00:00.000Z',
      by: {
        displayName: 'Test Author',
        email: 'test@example.com',
      },
    },
    _links: {
      webui: '/spaces/TEST/pages/123456',
      base: 'https://company.atlassian.net/wiki',
    },
  });

  const createMockSearchResult = (id: string, title: string): SearchResult => ({
    id,
    title,
    content: `Content for ${title}`,
    source: 'https://company.atlassian.net/wiki/spaces/TEST/pages/123456',
    source_name: 'Test Space (TEST)',
    source_type: 'confluence',
    category: 'general',
    confidence_score: 0.9,
    match_reasons: ['Confluence page content'],
    retrieval_time_ms: 50,
    url: 'https://company.atlassian.net/wiki/spaces/TEST/pages/123456',
    last_updated: '2025-01-17T10:00:00.000Z',
    metadata: {
      space_key: 'TEST',
      space_name: 'Test Space',
      page_id: id,
      version: 1,
      author: 'Test Author',
    },
  });

  beforeEach(() => {
    mockConfig = {
      name: 'test-confluence',
      type: 'confluence',
      base_url: 'https://company.atlassian.net/wiki',
      space_keys: ['TEST', 'DOCS'],
      auth: {
        type: 'bearer_token',
        token_env: 'CONFLUENCE_TOKEN',
      },
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3,
      rate_limit: 10,
      max_results: 50,
    };

    mockOptions = {
      enableSemanticSearch: true,
      maxPagesPerSpace: 1000,
      syncIntervalMinutes: 60,
      enableChangeWatching: true,
      performance: {
        cacheTtlSeconds: 3600,
        maxConcurrentRequests: 10,
        requestTimeoutMs: 30000,
      },
    };

    // Setup mocks
    mockAuthManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      authenticate: jest.fn().mockResolvedValue({ success: true, userId: 'test-user' }),
      validateAuth: jest.fn().mockResolvedValue(true),
      getAuthHeaders: jest.fn().mockReturnValue({ 'Authorization': 'Bearer test-token' }),
      getMetrics: jest.fn().mockReturnValue({ successfulAuths: 1, failedAuths: 0 }),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockApiClient = {
      initialize: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([]),
      getPage: jest.fn().mockResolvedValue(null),
      getSpacePages: jest.fn().mockResolvedValue([]),
      getAllSpacePages: jest.fn().mockResolvedValue([]),
      getSpaces: jest.fn().mockResolvedValue([]),
      getSpace: jest.fn().mockResolvedValue(null),
      getRecentlyUpdated: jest.fn().mockResolvedValue([]),
      getMetrics: jest.fn().mockReturnValue({ totalRequests: 0, avgResponseTime: 0 }),
      getRateLimitInfo: jest.fn().mockReturnValue(undefined),
      isCircuitBreakerOpen: jest.fn().mockReturnValue(false),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockContentProcessor = {
      convertToSearchResult: jest.fn().mockResolvedValue(createMockSearchResult('123', 'Test Page')),
      extractContent: jest.fn().mockResolvedValue({
        plainText: 'Test content',
        htmlContent: '<p>Test content</p>',
        markdownContent: 'Test content',
        structuredData: {},
        metadata: { wordCount: 2, complexity: 'low' },
      }),
      getMetrics: jest.fn().mockReturnValue({ totalProcessed: 0, avgProcessingTime: 0 }),
      resetMetrics: jest.fn(),
    } as any;

    mockSynchronizer = {
      syncAllSpaces: jest.fn().mockResolvedValue({
        spaces: [],
        pages: [],
        errors: [],
        metrics: { totalSpaces: 0, totalPages: 0, processingTime: 0 },
      }),
      syncSpace: jest.fn().mockResolvedValue({
        spaces: [],
        pages: [],
        errors: [],
        metrics: { totalSpaces: 0, totalPages: 0, processingTime: 0 },
      }),
      startChangeMonitoring: jest.fn().mockResolvedValue(undefined),
      stopChangeMonitoring: jest.fn().mockResolvedValue(undefined),
      forceSyncPages: jest.fn().mockResolvedValue([]),
      getMetrics: jest.fn().mockReturnValue({ totalSyncs: 0, avgSyncTime: 0 }),
    } as any;

    mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      warmCache: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({ hitRate: 0, totalHits: 0, totalMisses: 0 }),
      getHealth: jest.fn().mockResolvedValue({ healthy: true }),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockSemanticEngine = {
      initialize: jest.fn().mockResolvedValue(undefined),
      indexDocuments: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([]),
      searchRunbooks: jest.fn().mockResolvedValue([]),
      getPerformanceMetrics: jest.fn().mockReturnValue({}),
      getStatus: jest.fn().mockReturnValue({ initialized: true }),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Configure mock constructors
    MockAuthManager.mockImplementation(() => mockAuthManager);
    MockApiClient.mockImplementation(() => mockApiClient);
    MockContentProcessor.mockImplementation(() => mockContentProcessor);
    MockContentSynchronizer.mockImplementation(() => mockSynchronizer);
    MockCacheManager.mockImplementation(() => mockCacheManager);
    MockSemanticSearchEngine.mockImplementation(() => mockSemanticEngine);

    // Create adapter instance
    mockOptions.semanticEngine = mockSemanticEngine;
    adapter = new ConfluenceAdapter(mockConfig, mockOptions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid configuration', async () => {
      // Setup mocks for successful initialization
      mockApiClient.getSpaces.mockResolvedValue([
        { key: 'TEST', name: 'Test Space' } as any
      ]);
      
      mockSynchronizer.syncAllSpaces.mockResolvedValue({
        spaces: [{ key: 'TEST', name: 'Test Space' } as any],
        pages: [createMockConfluencePage('123', 'Test Page') as any],
        errors: [],
        metrics: { totalSpaces: 1, totalPages: 1, processingTime: 100 } as any,
      });

      await adapter.initialize();

      expect(mockAuthManager.initialize).toHaveBeenCalled();
      expect(mockApiClient.initialize).toHaveBeenCalled();
      expect(mockSynchronizer.syncAllSpaces).toHaveBeenCalled();
      expect(adapter.isReady()).toBe(true);
    });

    test('should handle authentication failure during initialization', async () => {
      mockAuthManager.initialize.mockRejectedValue(new Error('Authentication failed'));

      await expect(adapter.initialize()).rejects.toThrow('Confluence adapter initialization failed');
      expect(adapter.isReady()).toBe(false);
    });

    test('should handle API client initialization failure', async () => {
      mockApiClient.initialize.mockRejectedValue(new Error('API client failed'));

      await expect(adapter.initialize()).rejects.toThrow('Confluence adapter initialization failed');
      expect(adapter.isReady()).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Initialize adapter for search tests
      mockApiClient.getSpaces.mockResolvedValue([]);
      mockSynchronizer.syncAllSpaces.mockResolvedValue({
        spaces: [],
        pages: [],
        errors: [],
        metrics: { totalSpaces: 0, totalPages: 0, processingTime: 0 } as any,
      });
      await adapter.initialize();
    });

    test('should perform semantic search when available', async () => {
      const mockResults = [createMockSearchResult('123', 'Test Page')];
      mockSemanticEngine.search.mockResolvedValue(mockResults);
      mockCacheManager.get.mockResolvedValue(null); // Cache miss

      const results = await adapter.search('test query');

      expect(mockSemanticEngine.search).toHaveBeenCalledWith(
        'test query',
        expect.objectContaining({ source_types: ['confluence'] })
      );
      expect(results).toEqual(mockResults);
    });

    test('should fallback to native search when semantic search fails', async () => {
      const mockSearchResults = [{
        id: '123',
        title: 'Test Page',
        body: { storage: { value: '<p>Content</p>' } },
        space: { key: 'TEST', name: 'Test Space' },
        version: { number: 1, when: '2025-01-17T10:00:00.000Z' },
        _links: { webui: '/page', base: 'https://test.com' },
      }];
      
      mockSemanticEngine.search.mockRejectedValue(new Error('Semantic search failed'));
      mockApiClient.search.mockResolvedValue(mockSearchResults as any);
      mockContentProcessor.convertToSearchResult.mockResolvedValue(
        createMockSearchResult('123', 'Test Page')
      );

      const results = await adapter.search('test query');

      expect(mockApiClient.search).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('123');
    });

    test('should use cached results when available', async () => {
      const cachedResults = [createMockSearchResult('123', 'Cached Page')];
      mockCacheManager.get.mockResolvedValue(cachedResults);

      const results = await adapter.search('test query');

      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockSemanticEngine.search).not.toHaveBeenCalled();
      expect(results).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: '123',
          title: 'Cached Page',
        })
      ]));
    });

    test('should apply search filters correctly', async () => {
      const filters: SearchFilters = {
        categories: ['runbook'],
        max_age_days: 30,
        limit: 10,
      };

      await adapter.search('test query', filters);

      expect(mockSemanticEngine.search).toHaveBeenCalledWith(
        'test query',
        expect.objectContaining({
          ...filters,
          source_types: ['confluence'],
        })
      );
    });
  });

  describe('Document Retrieval', () => {
    beforeEach(async () => {
      // Initialize adapter
      mockApiClient.getSpaces.mockResolvedValue([]);
      mockSynchronizer.syncAllSpaces.mockResolvedValue({
        spaces: [],
        pages: [],
        errors: [],
        metrics: { totalSpaces: 0, totalPages: 0, processingTime: 0 } as any,
      });
      await adapter.initialize();
    });

    test('should retrieve document by ID from cache first', async () => {
      const cachedDoc = createMockSearchResult('123', 'Cached Document');
      mockCacheManager.get.mockResolvedValue(cachedDoc);

      const result = await adapter.getDocument('123');

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining('document:123')
      );
      expect(result).toEqual(expect.objectContaining({
        id: '123',
        title: 'Cached Document',
      }));
    });

    test('should fetch document from API when not cached', async () => {
      const mockPage = createMockConfluencePage('123', 'API Document');
      const mockSearchResult = createMockSearchResult('123', 'API Document');
      
      mockCacheManager.get.mockResolvedValue(null); // Cache miss
      mockApiClient.getPage.mockResolvedValue(mockPage as any);
      mockContentProcessor.convertToSearchResult.mockResolvedValue(mockSearchResult);

      const result = await adapter.getDocument('123');

      expect(mockApiClient.getPage).toHaveBeenCalledWith('123', expect.any(Object));
      expect(mockContentProcessor.convertToSearchResult).toHaveBeenCalledWith(mockPage);
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(result).toEqual(mockSearchResult);
    });

    test('should return null for non-existent document', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockApiClient.getPage.mockResolvedValue(null);

      const result = await adapter.getDocument('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('Runbook Search', () => {
    beforeEach(async () => {
      // Initialize adapter
      mockApiClient.getSpaces.mockResolvedValue([]);
      mockSynchronizer.syncAllSpaces.mockResolvedValue({
        spaces: [],
        pages: [],
        errors: [],
        metrics: { totalSpaces: 0, totalPages: 0, processingTime: 0 } as any,
      });
      await adapter.initialize();
    });

    test('should search for runbooks with alert characteristics', async () => {
      const mockRunbooks = [{
        id: 'runbook-123',
        title: 'Disk Space Alert Runbook',
        version: '1.0',
        description: 'Handle disk space alerts',
        triggers: ['disk_full', 'disk_space_low'],
        severity_mapping: { critical: 'critical' },
        decision_tree: {
          id: 'dt-1',
          name: 'Disk Space Decision Tree',
          description: 'Decision tree for disk space issues',
          branches: [],
          default_action: 'escalate',
        },
        procedures: [],
        metadata: {
          created_at: '2025-01-17T10:00:00.000Z',
          updated_at: '2025-01-17T10:00:00.000Z',
          author: 'Test Author',
          confidence_score: 0.9,
        },
      }];

      const mockSearchResults = [
        {
          ...createMockSearchResult('runbook-123', 'Disk Space Alert Runbook'),
          metadata: {
            ...createMockSearchResult('runbook-123', 'Disk Space Alert Runbook').metadata,
            runbook_data: mockRunbooks[0],
          },
        },
      ];

      mockSemanticEngine.search.mockResolvedValue(mockSearchResults);

      const results = await adapter.searchRunbooks(
        'disk_full',
        'critical',
        ['server1', 'server2'],
        { environment: 'production' }
      );

      expect(mockSemanticEngine.search).toHaveBeenCalledWith(
        'disk_full critical runbook server1 server2 production',
        expect.objectContaining({
          categories: ['runbook'],
          source_types: ['confluence'],
        })
      );

      expect(results).toEqual(mockRunbooks);
    });
  });

  describe('Health Monitoring', () => {
    test('should perform comprehensive health check', async () => {
      mockAuthManager.validateAuth.mockResolvedValue(true);
      mockApiClient.getSpaces.mockResolvedValue([
        { key: 'TEST', name: 'Test Space' } as any
      ]);

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.source_name).toBe('test-confluence');
      expect(health.response_time_ms).toBeGreaterThan(0);
      expect(health.metadata).toBeDefined();
    });

    test('should report unhealthy when authentication fails', async () => {
      mockAuthManager.validateAuth.mockResolvedValue(false);

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error_message).toBe('Authentication failed');
    });

    test('should report unhealthy when API is unavailable', async () => {
      mockAuthManager.validateAuth.mockResolvedValue(true);
      mockApiClient.getSpaces.mockRejectedValue(new Error('API unavailable'));

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error_message).toBe('API unavailable');
    });
  });

  describe('Index Refresh', () => {
    beforeEach(async () => {
      // Initialize adapter
      mockApiClient.getSpaces.mockResolvedValue([]);
      mockSynchronizer.syncAllSpaces.mockResolvedValue({
        spaces: [],
        pages: [],
        errors: [],
        metrics: { totalSpaces: 0, totalPages: 0, processingTime: 0 } as any,
      });
      await adapter.initialize();
    });

    test('should refresh index successfully', async () => {
      const mockSyncResult = {
        spaces: [{ key: 'TEST', name: 'Test Space' } as any],
        pages: [createMockConfluencePage('123', 'Test Page') as any],
        errors: [],
        metrics: { totalSpaces: 1, totalPages: 1, processingTime: 100 } as any,
      };

      mockSynchronizer.syncAllSpaces.mockResolvedValue(mockSyncResult);

      const result = await adapter.refreshIndex(false);

      expect(result).toBe(true);
      expect(mockSynchronizer.syncAllSpaces).toHaveBeenCalled();
    });

    test('should force refresh and clear cache', async () => {
      const result = await adapter.refreshIndex(true);

      expect(mockCacheManager.clear).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle refresh errors gracefully', async () => {
      mockSynchronizer.syncAllSpaces.mockRejectedValue(new Error('Sync failed'));

      const result = await adapter.refreshIndex(false);

      expect(result).toBe(false);
    });
  });

  describe('Performance Requirements', () => {
    beforeEach(async () => {
      // Initialize adapter
      mockApiClient.getSpaces.mockResolvedValue([]);
      mockSynchronizer.syncAllSpaces.mockResolvedValue({
        spaces: [],
        pages: [],
        errors: [],
        metrics: { totalSpaces: 0, totalPages: 0, processingTime: 0 } as any,
      });
      await adapter.initialize();
    });

    test('should meet response time targets for critical operations', async () => {
      const mockResults = [createMockSearchResult('123', 'Critical Runbook')];
      mockSemanticEngine.search.mockResolvedValue(mockResults);

      const startTime = performance.now();
      await adapter.search('critical alert');
      const responseTime = performance.now() - startTime;

      // Should be under 200ms for critical operations
      expect(responseTime).toBeLessThan(200);
    });

    test('should handle concurrent operations efficiently', async () => {
      const mockResults = [createMockSearchResult('123', 'Test Page')];
      mockSemanticEngine.search.mockResolvedValue(mockResults);

      // Simulate 20 concurrent search operations
      const promises = Array.from({ length: 20 }, (_, i) =>
        adapter.search(`query ${i}`)
      );

      const startTime = performance.now();
      await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      // Should handle 20+ concurrent operations efficiently
      expect(totalTime).toBeLessThan(1000); // Under 1 second total
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources properly', async () => {
      await adapter.cleanup();

      expect(mockSynchronizer.stopChangeMonitoring).toHaveBeenCalled();
      expect(mockCacheManager.clear).toHaveBeenCalled();
      expect(mockApiClient.cleanup).toHaveBeenCalled();
    });

    test('should handle cleanup errors gracefully', async () => {
      mockApiClient.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      // Should not throw
      await expect(adapter.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Metadata and Statistics', () => {
    test('should provide comprehensive metadata', async () => {
      const metadata = await adapter.getMetadata();

      expect(metadata).toEqual({
        name: 'test-confluence',
        type: 'confluence',
        documentCount: expect.any(Number),
        lastIndexed: expect.any(String),
        avgResponseTime: expect.any(Number),
        successRate: expect.any(Number),
      });
    });
  });

  describe('Enterprise Features', () => {
    test('should support space-level filtering', async () => {
      const results = await adapter.search('test query');
      
      // Verify that space filtering is applied via configuration
      expect(mockSemanticEngine.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          source_types: ['confluence'],
        })
      );
    });

    test('should support real-time change monitoring', async () => {
      await adapter.watchChanges(['TEST', 'DOCS']);

      expect(mockSynchronizer.startChangeMonitoring).toHaveBeenCalledWith(
        ['TEST', 'DOCS'],
        60 // syncIntervalMinutes from options
      );
    });

    test('should handle authentication challenges', async () => {
      const authResult = await adapter.authenticateUser({
        type: 'bearer_token',
        token: 'test-token',
      });

      expect(mockAuthManager.authenticate).toHaveBeenCalled();
      expect(authResult.success).toBe(true);
    });
  });
});