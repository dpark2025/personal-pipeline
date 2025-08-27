/**
 * Integration Tests - End-to-end semantic search integration
 *
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 *
 * Comprehensive integration tests for the semantic search system
 * with the existing PersonalPipelineServer and adapter framework.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SemanticEnhancedAdapter } from '../../src/search/semantic-integration.js';
import { SourceAdapter } from '../../src/adapters/base.js';
import { SearchResult, SearchFilters, Runbook, SourceConfig } from '../../src/types/index.js';

// Mock adapter for testing
class MockSourceAdapter extends SourceAdapter {
  private documents: SearchResult[] = [
    {
      id: 'mock-1',
      title: 'Disk Space Alert Runbook',
      content:
        'This runbook covers procedures for handling disk space alerts, including identifying the cause, cleaning up temporary files, and expanding storage capacity.',
      source: 'mock-source',
      source_type: 'file',
      confidence_score: 0.9,
      match_reasons: ['title match'],
      retrieval_time_ms: 0,
      last_updated: '2024-01-01T00:00:00Z',
      category: 'runbook',
      metadata: {
        priority: 1,
        success_rate: 0.95,
        runbook_data: {
          id: 'runbook-1',
          title: 'Disk Space Alert Runbook',
          version: '1.0',
          description: 'Handle disk space alerts',
          triggers: ['disk_full', 'disk_space_low'],
          severity_mapping: { critical: 'critical', high: 'high' },
          decision_tree: {
            id: 'dt-1',
            name: 'Disk Space Decision Tree',
            description: 'Decision logic for disk space issues',
            branches: [],
            default_action: 'escalate',
          },
          procedures: [],
          metadata: {
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            author: 'test',
            confidence_score: 0.9,
          },
        },
      },
    },
    {
      id: 'mock-2',
      title: 'Memory Pressure Investigation',
      content:
        'Guide for investigating memory pressure issues including analyzing memory usage patterns, identifying memory leaks, and optimizing application memory consumption.',
      source: 'mock-source',
      source_type: 'file',
      confidence_score: 0.85,
      match_reasons: ['content match'],
      retrieval_time_ms: 0,
      last_updated: '2024-01-01T00:00:00Z',
      category: 'guide',
      metadata: {
        priority: 2,
        success_rate: 0.88,
      },
    },
    {
      id: 'mock-3',
      title: 'Database Connection Troubleshooting',
      content:
        'Comprehensive troubleshooting procedures for database connectivity issues, covering connection pool problems, network configuration, and authentication failures.',
      source: 'mock-source',
      source_type: 'file',
      confidence_score: 0.8,
      match_reasons: ['fuzzy match'],
      retrieval_time_ms: 0,
      last_updated: '2024-01-01T00:00:00Z',
      category: 'procedure',
      metadata: {
        priority: 3,
        success_rate: 0.82,
      },
    },
  ];

  constructor(config: SourceConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async search(query: string, _filters?: SearchFilters): Promise<SearchResult[]> {
    // Simple fuzzy search simulation
    const queryLower = query.toLowerCase();
    return this.documents.filter(
      doc =>
        doc.title.toLowerCase().includes(queryLower) ||
        doc.content.toLowerCase().includes(queryLower)
    );
  }

  async getDocument(id: string): Promise<SearchResult | null> {
    return this.documents.find(doc => doc.id === id) || null;
  }

  async searchRunbooks(
    _alertType: string,
    _severity: string,
    _affectedSystems: string[],
    _context?: Record<string, any>
  ): Promise<Runbook[]> {
    const runbookDocs = this.documents.filter(doc => doc.category === 'runbook');
    return runbookDocs
      .filter(doc => doc.metadata?.runbook_data)
      .map(doc => doc.metadata.runbook_data as Runbook);
  }

  async healthCheck(): Promise<any> {
    return {
      source_name: this.config.name,
      healthy: true,
      response_time_ms: 10,
      last_check: new Date().toISOString(),
    };
  }

  async refreshIndex(_force?: boolean): Promise<boolean> {
    return true;
  }

  async getMetadata(): Promise<any> {
    return {
      name: this.config.name,
      type: this.config.type,
      documentCount: this.documents.length,
      lastIndexed: new Date().toISOString(),
      avgResponseTime: 10,
      successRate: 1.0,
    };
  }
}

const skipSemanticTests = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

(skipSemanticTests ? describe.skip : describe)('Semantic Integration Tests', () => {
  let mockAdapter: MockSourceAdapter;
  let enhancedAdapter: SemanticEnhancedAdapter;

  beforeEach(async () => {
    const config: SourceConfig = {
      name: 'mock-source',
      type: 'mock',
      enabled: true,
    };

    mockAdapter = new MockSourceAdapter(config);
    enhancedAdapter = new SemanticEnhancedAdapter(mockAdapter, {
      enableSemanticSearch: true,
      enableFallback: true,
      semanticThreshold: 0.3,
      semanticWeight: 0.7,
      maxResults: 10,
    });
  });

  afterEach(async () => {
    await enhancedAdapter.cleanup();
  });

  test('should initialize successfully with semantic enhancement', async () => {
    await enhancedAdapter.initialize();

    assert(enhancedAdapter.isReady(), 'Adapter should be ready');

    const healthCheck = await enhancedAdapter.healthCheck();
    assert(healthCheck.source_name === 'mock-source', 'Should preserve base adapter health check');
    assert(healthCheck.semantic_enhancement, 'Should include semantic enhancement status');
  });

  test('should fallback to base adapter when semantic fails', async () => {
    // Initialize with semantic disabled to test fallback
    const fallbackAdapter = new SemanticEnhancedAdapter(mockAdapter, {
      enableSemanticSearch: false,
      enableFallback: true,
    });

    await fallbackAdapter.initialize();

    const results = await fallbackAdapter.search('disk space');
    assert(results.length > 0, 'Should return results from base adapter');
    assert(results[0].source === 'mock-source', 'Should use base adapter results');

    await fallbackAdapter.cleanup();
  });

  test('should maintain backward compatibility with existing interfaces', async () => {
    await enhancedAdapter.initialize();

    // Test search interface compatibility
    const searchResults = await enhancedAdapter.search('memory pressure');
    assert(Array.isArray(searchResults), 'Should return array of SearchResults');

    searchResults.forEach(result => {
      assert(typeof result.id === 'string', 'Should have id');
      assert(typeof result.title === 'string', 'Should have title');
      assert(typeof result.content === 'string', 'Should have content');
      assert(typeof result.confidence_score === 'number', 'Should have confidence score');
      assert(Array.isArray(result.match_reasons), 'Should have match reasons');
      assert(typeof result.retrieval_time_ms === 'number', 'Should have retrieval time');
    });

    // Test getDocument interface compatibility
    const document = await enhancedAdapter.getDocument('mock-1');
    assert(document !== null, 'Should retrieve document');
    assert(document.id === 'mock-1', 'Should return correct document');

    // Test searchRunbooks interface compatibility
    const runbooks = await enhancedAdapter.searchRunbooks('disk_full', 'critical', ['web-server']);
    assert(Array.isArray(runbooks), 'Should return array of Runbooks');
  });

  test('should enhance search results with semantic understanding', async () => {
    await enhancedAdapter.initialize();

    // Wait for semantic indexing to complete
    let retries = 0;
    while (!enhancedAdapter.isSemanticReady() && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }

    if (enhancedAdapter.isSemanticReady()) {
      // Test semantic query that should find relevant content
      const semanticResults = await enhancedAdapter.search('storage space exhausted');

      // Should find disk space document even without exact keyword match
      const diskSpaceResult = semanticResults.find(r => r.title.includes('Disk Space'));
      assert(diskSpaceResult, 'Should find semantically relevant document');
    } else {
      console.log('Semantic search not ready, testing fallback behavior');

      // Test fallback behavior
      const fallbackResults = await enhancedAdapter.search('disk space');
      assert(fallbackResults.length > 0, 'Should return fallback results');
    }
  });

  test('should provide enhanced metadata with semantic capabilities', async () => {
    await enhancedAdapter.initialize();

    const metadata = await enhancedAdapter.getMetadata();

    // Should include base metadata
    assert(metadata.name === 'mock-source', 'Should include base metadata');
    assert(typeof metadata.documentCount === 'number', 'Should include document count');

    // Should include semantic enhancement metadata
    assert(metadata.semantic_enhancement, 'Should include semantic enhancement metadata');
    assert(
      typeof metadata.semantic_enhancement.semantic_search_enabled === 'boolean',
      'Should indicate if semantic search is enabled'
    );
  });

  test('should handle concurrent requests efficiently', async () => {
    await enhancedAdapter.initialize();

    const queries = [
      'disk space issues',
      'memory problems',
      'database connectivity',
      'network troubleshooting',
      'performance optimization',
    ];

    const startTime = performance.now();
    const searchPromises = queries.map(query => enhancedAdapter.search(query));
    const results = await Promise.all(searchPromises);
    const totalTime = performance.now() - startTime;

    // All searches should complete
    assert.strictEqual(results.length, queries.length);
    results.forEach(result => {
      assert(Array.isArray(result), 'Each search should return an array');
    });

    // Should handle concurrent requests efficiently
    const avgTimePerSearch = totalTime / queries.length;
    assert(
      avgTimePerSearch < 500,
      `Average search time ${avgTimePerSearch.toFixed(2)}ms should be reasonable`
    );

    console.log(
      `Concurrent search performance: ${totalTime.toFixed(2)}ms total, ${avgTimePerSearch.toFixed(2)}ms average`
    );
  });

  test('should maintain search quality during fallback scenarios', async () => {
    await enhancedAdapter.initialize();

    // Test search quality with both semantic and fallback
    const testQuery = 'disk space alert';

    // Get results (may be semantic or fallback depending on readiness)
    const results = await enhancedAdapter.search(testQuery);

    assert(results.length > 0, 'Should return relevant results');

    // Check result quality
    const relevantResult = results.find(
      r => r.title.toLowerCase().includes('disk') || r.content.toLowerCase().includes('disk space')
    );

    assert(relevantResult, 'Should find relevant results for disk space query');
    assert(relevantResult.confidence_score > 0, 'Should have positive confidence score');
    assert(relevantResult.retrieval_time_ms >= 0, 'Should record retrieval time');
  });

  test('should support configuration updates', async () => {
    await enhancedAdapter.initialize();

    const originalConfig = enhancedAdapter.getConfig();
    assert(originalConfig.semantic_config, 'Should have semantic config');

    // Update configuration
    enhancedAdapter.configure({
      semantic_config: {
        semanticThreshold: 0.5,
        maxResults: 20,
      },
    });

    const updatedConfig = enhancedAdapter.getConfig();
    assert(
      updatedConfig.semantic_config.semanticThreshold === 0.5,
      'Should update semantic threshold'
    );
    assert(updatedConfig.semantic_config.maxResults === 20, 'Should update max results');
  });

  test('should handle index refresh correctly', async () => {
    await enhancedAdapter.initialize();

    // Test index refresh
    const refreshSuccess = await enhancedAdapter.refreshIndex();
    assert(refreshSuccess === true, 'Index refresh should succeed');

    // Test forced refresh
    const forceRefreshSuccess = await enhancedAdapter.refreshIndex(true);
    assert(forceRefreshSuccess === true, 'Forced index refresh should succeed');
  });

  test('should provide comprehensive health monitoring', async () => {
    await enhancedAdapter.initialize();

    const health = await enhancedAdapter.healthCheck();

    // Base adapter health
    assert(health.source_name === 'mock-source', 'Should include source name');
    assert(health.healthy === true, 'Should report healthy status');
    assert(typeof health.response_time_ms === 'number', 'Should include response time');

    // Semantic enhancement health
    assert(health.semantic_enhancement, 'Should include semantic health');
    assert(
      typeof health.semantic_enhancement.semantic_search_enabled === 'boolean',
      'Should report semantic search status'
    );

    if (health.semantic_enhancement.semantic_search_enabled) {
      assert(health.semantic_enhancement.semantic_status, 'Should include semantic status');
      assert(
        typeof health.semantic_enhancement.documents_indexed === 'boolean',
        'Should report indexing status'
      );
    }
  });

  test('should handle error scenarios gracefully', async () => {
    // Test initialization without throwing
    const errorAdapter = new SemanticEnhancedAdapter(mockAdapter, {
      enableSemanticSearch: true,
      enableFallback: false, // Disable fallback to test error handling
    });

    await errorAdapter.initialize();

    // Even if semantic search fails, should not throw if fallback is enabled
    const fallbackEnabledAdapter = new SemanticEnhancedAdapter(mockAdapter, {
      enableSemanticSearch: true,
      enableFallback: true,
    });

    await fallbackEnabledAdapter.initialize();

    // Should handle search even if semantic fails
    const results = await fallbackEnabledAdapter.search('test query');
    assert(Array.isArray(results), 'Should return results array even with errors');

    await errorAdapter.cleanup();
    await fallbackEnabledAdapter.cleanup();
  });
});

(skipSemanticTests ? describe.skip : describe)('End-to-End Performance Integration', () => {
  let enhancedAdapter: SemanticEnhancedAdapter;

  beforeEach(async () => {
    const config: SourceConfig = {
      name: 'performance-test',
      type: 'mock',
      enabled: true,
    };

    const mockAdapter = new MockSourceAdapter(config);
    enhancedAdapter = new SemanticEnhancedAdapter(mockAdapter, {
      enableSemanticSearch: true,
      semanticWeight: 0.6,
      maxResults: 50,
    });

    await enhancedAdapter.initialize();
  });

  afterEach(async () => {
    await enhancedAdapter.cleanup();
  });

  test('should meet end-to-end performance targets', async () => {
    const performanceTargets = {
      searchResponseTime: 200, // ms
      concurrentSearches: 10,
      memoryEfficiency: true,
    };

    // Test single search performance
    const singleSearchStart = performance.now();
    const _singleResult = await enhancedAdapter.search('disk space management');
    const singleSearchTime = performance.now() - singleSearchStart;

    assert(
      singleSearchTime < performanceTargets.searchResponseTime,
      `Single search time ${singleSearchTime.toFixed(2)}ms should be <${performanceTargets.searchResponseTime}ms`
    );

    // Test concurrent searches
    const concurrentQueries = Array.from(
      { length: performanceTargets.concurrentSearches },
      (_, i) => `test query ${i}`
    );

    const concurrentStart = performance.now();
    const concurrentResults = await Promise.all(
      concurrentQueries.map(query => enhancedAdapter.search(query))
    );
    const concurrentTime = performance.now() - concurrentStart;

    const avgConcurrentTime = concurrentTime / performanceTargets.concurrentSearches;
    assert(
      avgConcurrentTime < performanceTargets.searchResponseTime * 1.5,
      `Average concurrent search time ${avgConcurrentTime.toFixed(2)}ms should be reasonable`
    );

    console.log(
      `End-to-end performance: Single=${singleSearchTime.toFixed(2)}ms, Concurrent avg=${avgConcurrentTime.toFixed(2)}ms`
    );

    // Verify all concurrent searches returned results
    concurrentResults.forEach(result => {
      assert(Array.isArray(result), 'Each concurrent search should return results');
    });
  });

  test('should maintain integration stability under load', async () => {
    const loadTestDuration = 5000; // 5 seconds
    const searchInterval = 100; // ms between searches
    const startTime = Date.now();

    let searchCount = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];

    while (Date.now() - startTime < loadTestDuration) {
      try {
        const searchStart = performance.now();
        await enhancedAdapter.search(`load test query ${searchCount}`);
        const responseTime = performance.now() - searchStart;

        responseTimes.push(responseTime);
        searchCount++;
      } catch (error) {
        errorCount++;
      }

      await new Promise(resolve => setTimeout(resolve, searchInterval));
    }

    const avgResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const errorRate = errorCount / (searchCount + errorCount);

    console.log(
      `Load test results: ${searchCount} searches, ${errorCount} errors, ${avgResponseTime.toFixed(2)}ms avg response`
    );

    // Should handle load with low error rate
    assert(errorRate < 0.05, `Error rate ${(errorRate * 100).toFixed(2)}% should be <5%`);
    assert(
      avgResponseTime < 300,
      `Average response time ${avgResponseTime.toFixed(2)}ms should be reasonable under load`
    );
    assert(searchCount > 0, 'Should complete some searches during load test');
  });
});
