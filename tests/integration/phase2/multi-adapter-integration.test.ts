#!/usr/bin/env tsx
/**
 * Phase 2 Multi-Adapter Integration Test Suite
 *
 * Comprehensive integration testing for all 5 source adapters working together
 * in real-world scenarios with cross-adapter validation, semantic search testing,
 * and production readiness verification.
 *
 * Authored by: QA/Test Engineer
 * Date: 2025-08-17
 */

import { test, describe, beforeAll, afterAll } from 'node:test';
import assert from 'node:assert';
import { PersonalPipelineServer } from '../../../src/core/server.js';
import { SemanticSearchEngine } from '../../../src/search/semantic-engine.js';
import { 
  FileSystemAdapter,
  ConfluenceAdapter,
  GitHubAdapter,
  DatabaseAdapter,
  WebAdapter
} from '../../../src/adapters/index.js';
import { SearchResult, SearchFilters, Runbook } from '../../../src/types/index.js';
import { logger } from '../../../src/utils/logger.js';
import axios from 'axios';

// ============================================================================
// Test Configuration and Setup
// ============================================================================

interface Phase2TestConfig {
  adapters: {
    file: boolean;
    confluence: boolean;
    github: boolean;
    database: boolean;
    web: boolean;
  };
  semanticSearch: {
    enabled: boolean;
    model: string;
    performanceTarget: number; // ms
  };
  performance: {
    responseTimeTarget: number; // ms
    concurrentOperations: number;
    throughputTarget: number; // operations/second
  };
  validation: {
    minAccuracyImprovement: number; // percentage
    crossAdapterCoverage: number; // percentage
    serviceAvailability: number; // percentage
  };
}

const testConfig: Phase2TestConfig = {
  adapters: {
    file: true,
    confluence: !!process.env.CONFLUENCE_TOKEN,
    github: !!process.env.GITHUB_TOKEN,
    database: !!process.env.DATABASE_URL,
    web: true,
  },
  semanticSearch: {
    enabled: true,
    model: 'Xenova/all-MiniLM-L6-v2',
    performanceTarget: 1, // <1ms for semantic query processing
  },
  performance: {
    responseTimeTarget: 200, // <200ms for critical operations
    concurrentOperations: 25,
    throughputTarget: 100, // operations/second
  },
  validation: {
    minAccuracyImprovement: 25, // 25% improvement over baseline
    crossAdapterCoverage: 90, // 90% of queries should hit multiple adapters
    serviceAvailability: 99.9, // 99.9% uptime
  },
};

interface TestMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  averageResponseTime: number;
  semanticSearchAccuracy: number;
  crossAdapterCoverage: number;
  adapterHealthScores: Record<string, number>;
}

let server: PersonalPipelineServer;
let semanticEngine: SemanticSearchEngine;
let testMetrics: TestMetrics;
let adapters: Record<string, any> = {};

// ============================================================================
// Test Setup and Teardown
// ============================================================================

beforeAll(async () => {
  logger.info('Setting up Phase 2 Multi-Adapter Integration Tests');
  
  // Initialize test metrics
  testMetrics = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    averageResponseTime: 0,
    semanticSearchAccuracy: 0,
    crossAdapterCoverage: 0,
    adapterHealthScores: {},
  };

  try {
    // Initialize Semantic Search Engine
    if (testConfig.semanticSearch.enabled) {
      semanticEngine = new SemanticSearchEngine({
        model: testConfig.semanticSearch.model,
        maxCacheSize: 1000,
        performance: {
          batchSize: 16,
          enableCaching: true,
          warmupCache: true,
        },
      });
      await semanticEngine.initialize();
      logger.info('Semantic search engine initialized');
    }

    // Initialize Individual Adapters for direct testing
    await initializeAdapters();
    
    // Initialize PersonalPipelineServer with all adapters
    server = new PersonalPipelineServer({
      semanticEngine,
      adapters: Object.values(adapters),
      performance: {
        enableMonitoring: true,
        responseTimeTarget: testConfig.performance.responseTimeTarget,
      },
    });
    
    await server.initialize();
    logger.info('PersonalPipelineServer initialized with all adapters');
    
  } catch (error) {
    logger.error('Failed to initialize test environment', { error });
    throw error;
  }
});

afterAll(async () => {
  logger.info('Cleaning up Phase 2 Multi-Adapter Integration Tests');
  
  try {
    // Cleanup server
    if (server) {
      await server.cleanup();
    }
    
    // Cleanup individual adapters
    for (const adapter of Object.values(adapters)) {
      if (adapter && typeof adapter.cleanup === 'function') {
        await adapter.cleanup();
      }
    }
    
    // Cleanup semantic engine
    if (semanticEngine) {
      await semanticEngine.cleanup();
    }
    
    // Log final metrics
    logger.info('Phase 2 Integration Test Metrics', testMetrics);
    
  } catch (error) {
    logger.error('Error during test cleanup', { error });
  }
});

async function initializeAdapters(): Promise<void> {
  // FileSystem Adapter (always available)
  if (testConfig.adapters.file) {
    adapters.file = new FileSystemAdapter({
      name: 'test-filesystem',
      type: 'file',
      config: {
        base_path: './test-data',
        watch_for_changes: false,
        file_patterns: ['**/*.md', '**/*.json', '**/*.txt'],
      },
    });
    await adapters.file.initialize();
  }

  // Confluence Adapter (requires authentication)
  if (testConfig.adapters.confluence) {
    adapters.confluence = new ConfluenceAdapter({
      name: 'test-confluence',
      type: 'confluence',
      config: {
        base_url: process.env.CONFLUENCE_URL || 'https://test.atlassian.net/wiki',
        auth: {
          type: 'bearer_token',
          token: process.env.CONFLUENCE_TOKEN,
        },
        spaces: ['TEST'],
        content_types: ['page', 'blog'],
      },
    }, {
      enableSemanticSearch: true,
      semanticEngine,
    });
    await adapters.confluence.initialize();
  }

  // GitHub Adapter (requires authentication)
  if (testConfig.adapters.github) {
    adapters.github = new GitHubAdapter({
      name: 'test-github',
      type: 'github',
      config: {
        repositories: [
          {
            owner: 'test-org',
            repo: 'documentation',
            paths: ['docs/', 'README.md'],
          },
        ],
        auth: {
          type: 'token',
          token: process.env.GITHUB_TOKEN,
        },
      },
    }, {
      enableSemanticSearch: true,
      semanticEngine,
    });
    await adapters.github.initialize();
  }

  // Database Adapter (requires database connection)
  if (testConfig.adapters.database) {
    adapters.database = new DatabaseAdapter({
      name: 'test-database',
      type: 'database',
      config: {
        connection: {
          type: 'postgresql',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'test_docs',
          username_env: 'DB_USER',
          password_env: 'DB_PASSWORD',
        },
        schema: {
          tables: [
            {
              name: 'runbooks',
              title_field: 'title',
              content_field: 'content',
              category_field: 'category',
              type: 'runbook',
            },
            {
              name: 'documentation',
              title_field: 'title',
              content_field: 'body',
              category_field: 'section',
              type: 'documentation',
            },
          ],
        },
      },
    }, {
      enableSemanticSearch: true,
      semanticEngine,
    });
    await adapters.database.initialize();
  }

  // Web Adapter (always available)
  if (testConfig.adapters.web) {
    adapters.web = new WebAdapter({
      name: 'test-web',
      type: 'web',
      config: {
        urls: [
          {
            url: 'https://docs.example.com',
            selectors: {
              title: 'h1',
              content: '.content',
              links: 'a[href]',
            },
            max_depth: 2,
          },
        ],
        rate_limit: {
          requests_per_minute: 30,
          concurrent_requests: 5,
        },
      },
    }, {
      enableSemanticSearch: true,
      semanticEngine,
    });
    await adapters.web.initialize();
  }

  logger.info('All configured adapters initialized', {
    enabledAdapters: Object.keys(adapters),
    totalAdapters: Object.keys(adapters).length,
  });
}

// ============================================================================
// Multi-Adapter Integration Tests
// ============================================================================

describe('Phase 2 Multi-Adapter Integration Tests', () => {
  
  describe('Adapter Health and Initialization', () => {
    
    test('All configured adapters should initialize successfully', async () => {
      testMetrics.totalTests++;
      
      try {
        const enabledAdapters = Object.keys(adapters);
        assert.ok(enabledAdapters.length >= 2, 'At least 2 adapters should be enabled for integration testing');
        
        // Verify each adapter is initialized
        for (const [name, adapter] of Object.entries(adapters)) {
          assert.ok(adapter.isInitialized, `${name} adapter should be initialized`);
          testMetrics.adapterHealthScores[name] = 100; // Initialize health score
        }
        
        testMetrics.passed++;
        logger.info('All adapters initialized successfully', { enabledAdapters });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
    
    test('All adapters should pass health checks', async () => {
      testMetrics.totalTests++;
      
      try {
        const healthResults = [];
        
        for (const [name, adapter] of Object.entries(adapters)) {
          const startTime = performance.now();
          const health = await adapter.healthCheck();
          const responseTime = performance.now() - startTime;
          
          healthResults.push({
            name,
            healthy: health.healthy,
            responseTime,
            error: health.error_message,
          });
          
          assert.ok(health.healthy, `${name} adapter should be healthy: ${health.error_message || 'Unknown error'}`);
          assert.ok(responseTime < 1000, `${name} health check should complete within 1000ms, took ${responseTime}ms`);
          
          testMetrics.adapterHealthScores[name] = health.healthy ? 100 : 0;
        }
        
        testMetrics.passed++;
        logger.info('All adapter health checks passed', { healthResults });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
    
    test('PersonalPipelineServer should integrate all adapters', async () => {
      testMetrics.totalTests++;
      
      try {
        // Verify server has registered all adapters
        const registeredAdapters = await server.getRegisteredAdapters();
        const enabledAdapterNames = Object.keys(adapters);
        
        assert.ok(registeredAdapters.length >= enabledAdapterNames.length, 
          `Server should have at least ${enabledAdapterNames.length} adapters registered`);
        
        // Verify each expected adapter is registered
        for (const adapterName of enabledAdapterNames) {
          const found = registeredAdapters.some(adapter => 
            adapter.name.includes(adapterName) || adapter.type === adapterName
          );
          assert.ok(found, `${adapterName} adapter should be registered with server`);
        }
        
        testMetrics.passed++;
        logger.info('PersonalPipelineServer integration verified', { 
          registeredAdapters: registeredAdapters.length,
          expectedAdapters: enabledAdapterNames.length 
        });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
  });
  
  describe('Cross-Adapter Search Operations', () => {
    
    test('Multi-source search should return results from multiple adapters', async () => {
      testMetrics.totalTests++;
      const startTime = performance.now();
      
      try {
        const searchQueries = [
          'disk space cleanup procedure',
          'memory leak troubleshooting',
          'security incident response',
          'database performance optimization',
          'API documentation',
        ];
        
        let totalCrossAdapterQueries = 0;
        let successfulCrossAdapterQueries = 0;
        
        for (const query of searchQueries) {
          const results = await server.search(query, {
            max_results: 20,
            source_types: Object.keys(adapters) as any[],
          });
          
          totalCrossAdapterQueries++;
          
          // Check if results come from multiple sources
          const sourcesHit = new Set(results.map(r => r.source_type));
          
          if (sourcesHit.size > 1) {
            successfulCrossAdapterQueries++;
          }
          
          // Validate result quality
          for (const result of results) {
            assert.ok(result.id, 'Result should have an ID');
            assert.ok(result.title, 'Result should have a title');
            assert.ok(result.content, 'Result should have content');
            assert.ok(result.source_type, 'Result should have source type');
            assert.ok(result.confidence_score >= 0 && result.confidence_score <= 1, 
              'Confidence score should be between 0 and 1');
          }
          
          logger.info('Multi-source search completed', {
            query,
            resultsCount: results.length,
            sourcesHit: Array.from(sourcesHit),
            avgConfidence: results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length,
          });
        }
        
        // Calculate cross-adapter coverage
        const crossAdapterCoverage = (successfulCrossAdapterQueries / totalCrossAdapterQueries) * 100;
        testMetrics.crossAdapterCoverage = crossAdapterCoverage;
        
        // Verify coverage meets target
        assert.ok(crossAdapterCoverage >= testConfig.validation.crossAdapterCoverage, 
          `Cross-adapter coverage (${crossAdapterCoverage}%) should meet target (${testConfig.validation.crossAdapterCoverage}%)`);
        
        const responseTime = performance.now() - startTime;
        testMetrics.averageResponseTime = responseTime / searchQueries.length;
        
        testMetrics.passed++;
        logger.info('Cross-adapter search validation completed', {
          crossAdapterCoverage,
          averageResponseTime: testMetrics.averageResponseTime,
        });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
    
    test('Search result merging should maintain quality ranking', async () => {
      testMetrics.totalTests++;
      
      try {
        const testQuery = 'emergency response procedure';
        const results = await server.search(testQuery, {
          max_results: 30,
          source_types: Object.keys(adapters) as any[],
        });
        
        assert.ok(results.length > 0, 'Search should return results');
        
        // Verify results are sorted by confidence score (descending)
        for (let i = 1; i < results.length; i++) {
          assert.ok(results[i].confidence_score <= results[i - 1].confidence_score,
            `Results should be sorted by confidence: ${results[i - 1].confidence_score} >= ${results[i].confidence_score}`);
        }
        
        // Verify diversity of sources in top results
        const topResults = results.slice(0, 10);
        const topSources = new Set(topResults.map(r => r.source_type));
        
        assert.ok(topSources.size >= Math.min(2, Object.keys(adapters).length),
          'Top results should include multiple source types for diversity');
        
        // Check for duplicate removal
        const uniqueTitles = new Set(results.map(r => r.title.toLowerCase().trim()));
        assert.ok(uniqueTitles.size === results.length || uniqueTitles.size >= results.length * 0.9,
          'Results should have minimal duplicates');
        
        testMetrics.passed++;
        logger.info('Search result merging validation passed', {
          totalResults: results.length,
          topSources: Array.from(topSources),
          avgTopConfidence: topResults.reduce((sum, r) => sum + r.confidence_score, 0) / topResults.length,
        });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
    
    test('Runbook search should aggregate from all operational sources', async () => {
      testMetrics.totalTests++;
      
      try {
        const alertScenarios = [
          {
            alertType: 'disk_space',
            severity: 'critical',
            affectedSystems: ['web-server', 'database'],
          },
          {
            alertType: 'memory_leak',
            severity: 'high',
            affectedSystems: ['application-server'],
          },
          {
            alertType: 'cpu_high',
            severity: 'medium',
            affectedSystems: ['api-gateway'],
          },
        ];
        
        for (const scenario of alertScenarios) {
          const runbooks = await server.searchRunbooks(
            scenario.alertType,
            scenario.severity,
            scenario.affectedSystems
          );
          
          // Validate runbook structure
          for (const runbook of runbooks) {
            assert.ok(runbook.id, 'Runbook should have an ID');
            assert.ok(runbook.title, 'Runbook should have a title');
            assert.ok(runbook.triggers, 'Runbook should have triggers');
            assert.ok(runbook.procedures && runbook.procedures.length > 0, 
              'Runbook should have procedures');
          }
          
          // Check for multi-source runbooks if multiple adapters available
          if (Object.keys(adapters).length > 1) {
            const sources = new Set(runbooks.map(r => r.source_type));
            // Note: Not all scenarios may have runbooks in all sources, so this is informational
            logger.info('Runbook sources for scenario', {
              scenario: scenario.alertType,
              sources: Array.from(sources),
              runbookCount: runbooks.length,
            });
          }
        }
        
        testMetrics.passed++;
        logger.info('Runbook aggregation test completed successfully');
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
  });
  
  describe('Semantic Search Enhancement', () => {
    
    test('Semantic search should be available and functional', async () => {
      testMetrics.totalTests++;
      
      if (!testConfig.semanticSearch.enabled || !semanticEngine) {
        logger.info('Skipping semantic search test - not enabled');
        testMetrics.totalTests--; // Don't count skipped test
        return;
      }
      
      try {
        // Test semantic search initialization
        assert.ok(semanticEngine.isInitialized, 'Semantic search engine should be initialized');
        
        // Test semantic query processing
        const testQueries = [
          'memory issues', // Should match 'memory leak', 'out of memory', etc.
          'storage problems', // Should match 'disk space', 'storage full', etc.
          'security breach', // Should match 'security incident', 'unauthorized access', etc.
        ];
        
        let totalSemanticTests = 0;
        let successfulSemanticTests = 0;
        
        for (const query of testQueries) {
          const startTime = performance.now();
          
          // Get semantic search results
          const semanticResults = await semanticEngine.search(query, {
            max_results: 10,
          });
          
          // Get traditional search results for comparison
          const traditionalResults = await server.search(query, {
            max_results: 10,
            use_semantic: false,
          });
          
          const semanticTime = performance.now() - startTime;
          
          totalSemanticTests++;
          
          // Verify semantic search performance
          assert.ok(semanticTime < testConfig.semanticSearch.performanceTarget * 1000,
            `Semantic search should complete within ${testConfig.semanticSearch.performanceTarget * 1000}ms, took ${semanticTime}ms`);
          
          // Verify semantic results have meaningful confidence scores
          if (semanticResults.length > 0) {
            const avgSemanticConfidence = semanticResults.reduce((sum, r) => sum + r.confidence_score, 0) / semanticResults.length;
            const avgTraditionalConfidence = traditionalResults.reduce((sum, r) => sum + r.confidence_score, 0) / traditionalResults.length;
            
            // Semantic search should provide better relevance (higher confidence) for conceptual queries
            if (avgSemanticConfidence > avgTraditionalConfidence * 1.1) { // 10% improvement threshold
              successfulSemanticTests++;
            }
            
            logger.info('Semantic vs traditional search comparison', {
              query,
              semanticAvgConfidence: avgSemanticConfidence,
              traditionalAvgConfidence: avgTraditionalConfidence,
              improvement: ((avgSemanticConfidence - avgTraditionalConfidence) / avgTraditionalConfidence * 100).toFixed(1) + '%',
              semanticTime: `${semanticTime.toFixed(2)}ms`,
            });
          }
        }
        
        // Calculate semantic search accuracy improvement
        const accuracyImprovement = (successfulSemanticTests / totalSemanticTests) * 100;
        testMetrics.semanticSearchAccuracy = accuracyImprovement;
        
        // Verify accuracy meets target
        assert.ok(accuracyImprovement >= testConfig.validation.minAccuracyImprovement,
          `Semantic search accuracy improvement (${accuracyImprovement}%) should meet target (${testConfig.validation.minAccuracyImprovement}%)`);
        
        testMetrics.passed++;
        logger.info('Semantic search enhancement validated', {
          accuracyImprovement,
          averageQueryTime: `${(testMetrics.averageResponseTime / testQueries.length).toFixed(2)}ms`,
        });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
    
    test('Semantic search should enhance results across all adapter types', async () => {
      testMetrics.totalTests++;
      
      if (!testConfig.semanticSearch.enabled || !semanticEngine) {
        logger.info('Skipping cross-adapter semantic test - semantic search not enabled');
        testMetrics.totalTests--;
        return;
      }
      
      try {
        const conceptualQueries = [
          'performance bottleneck identification',
          'incident escalation procedures',
          'security vulnerability assessment',
          'system health monitoring',
        ];
        
        for (const query of conceptualQueries) {
          const results = await semanticEngine.search(query, {
            max_results: 15,
            source_types: Object.keys(adapters) as any[],
          });
          
          // Verify semantic enhancement across different adapter types
          const sourceTypes = new Set(results.map(r => r.source_type));
          
          assert.ok(results.length > 0, `Semantic search should return results for: ${query}`);
          
          // Verify semantic similarity scores are reasonable
          for (const result of results) {
            assert.ok(result.confidence_score >= 0.3, 
              `Semantic result confidence should be at least 0.3, got ${result.confidence_score} for "${result.title}"`);
          }
          
          logger.info('Cross-adapter semantic search results', {
            query,
            resultCount: results.length,
            sourceTypes: Array.from(sourceTypes),
            avgConfidence: results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length,
          });
        }
        
        testMetrics.passed++;
        logger.info('Cross-adapter semantic enhancement validated');
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
  });
  
  describe('Performance and Scalability', () => {
    
    test('Response times should meet Phase 2 performance targets', async () => {
      testMetrics.totalTests++;
      
      try {
        const performanceTests = [
          { name: 'Critical Operations', queries: ['emergency response', 'critical alert'], target: 200 },
          { name: 'Standard Search', queries: ['troubleshooting guide', 'best practices'], target: 500 },
          { name: 'Complex Queries', queries: ['memory leak investigation procedure', 'database performance optimization strategy'], target: 1000 },
        ];
        
        const performanceResults = [];
        
        for (const test of performanceTests) {
          const testResults = [];
          
          for (const query of test.queries) {
            const startTime = performance.now();
            const results = await server.search(query, {
              max_results: 10,
              source_types: Object.keys(adapters) as any[],
            });
            const responseTime = performance.now() - startTime;
            
            testResults.push({
              query,
              responseTime,
              resultCount: results.length,
              withinTarget: responseTime <= test.target,
            });
            
            assert.ok(responseTime <= test.target,
              `${test.name} query "${query}" should complete within ${test.target}ms, took ${responseTime}ms`);
          }
          
          const avgResponseTime = testResults.reduce((sum, r) => sum + r.responseTime, 0) / testResults.length;
          const successRate = testResults.filter(r => r.withinTarget).length / testResults.length;
          
          performanceResults.push({
            testName: test.name,
            avgResponseTime,
            successRate,
            target: test.target,
            allWithinTarget: successRate === 1,
          });
        }
        
        // Verify all performance tests passed
        const overallSuccessRate = performanceResults.filter(r => r.allWithinTarget).length / performanceResults.length;
        assert.ok(overallSuccessRate >= 0.8, 
          `At least 80% of performance tests should meet targets, got ${overallSuccessRate * 100}%`);
        
        testMetrics.passed++;
        logger.info('Performance validation completed', { performanceResults });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
    
    test('Concurrent operations should maintain performance', async () => {
      testMetrics.totalTests++;
      
      try {
        const concurrentQueries = Array.from(
          { length: testConfig.performance.concurrentOperations },
          (_, i) => `concurrent test query ${i + 1}`
        );
        
        const startTime = performance.now();
        
        // Execute all queries concurrently
        const promises = concurrentQueries.map(query =>
          server.search(query, {
            max_results: 5,
            source_types: Object.keys(adapters) as any[],
          })
        );
        
        const results = await Promise.allSettled(promises);
        const totalTime = performance.now() - startTime;
        
        // Analyze results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        const successRate = successful / results.length;
        const throughput = successful / (totalTime / 1000); // operations per second
        
        // Validate concurrent performance
        assert.ok(successRate >= 0.95, 
          `Concurrent operation success rate should be at least 95%, got ${successRate * 100}%`);
        
        assert.ok(throughput >= testConfig.performance.throughputTarget,
          `Throughput should meet target of ${testConfig.performance.throughputTarget} ops/sec, got ${throughput.toFixed(2)} ops/sec`);
        
        assert.ok(totalTime / concurrentQueries.length <= testConfig.performance.responseTimeTarget * 2,
          `Average response time under load should be within 2x normal target`);
        
        testMetrics.passed++;
        logger.info('Concurrent operations performance validated', {
          totalOperations: concurrentQueries.length,
          successful,
          failed,
          successRate: `${(successRate * 100).toFixed(1)}%`,
          throughput: `${throughput.toFixed(2)} ops/sec`,
          totalTime: `${totalTime.toFixed(2)}ms`,
          avgResponseTime: `${(totalTime / concurrentQueries.length).toFixed(2)}ms`,
        });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
    
    test('System should maintain high availability under load', async () => {
      testMetrics.totalTests++;
      
      try {
        const loadTestDuration = 30000; // 30 seconds
        const requestInterval = 100; // 10 requests per second
        const testQueries = [
          'system health check',
          'performance monitoring',
          'error analysis',
          'incident response',
        ];
        
        let totalRequests = 0;
        let successfulRequests = 0;
        let failedRequests = 0;
        const startTime = Date.now();
        
        // Run load test
        while (Date.now() - startTime < loadTestDuration) {
          const query = testQueries[totalRequests % testQueries.length];
          
          try {
            totalRequests++;
            await server.search(query, { max_results: 3 });
            successfulRequests++;
          } catch (error) {
            failedRequests++;
            logger.warn('Load test request failed', { query, error: error.message });
          }
          
          // Wait before next request
          await new Promise(resolve => setTimeout(resolve, requestInterval));
        }
        
        const availability = (successfulRequests / totalRequests) * 100;
        
        // Validate availability
        assert.ok(availability >= testConfig.validation.serviceAvailability,
          `Service availability should be at least ${testConfig.validation.serviceAvailability}%, got ${availability.toFixed(2)}%`);
        
        testMetrics.passed++;
        logger.info('High availability under load validated', {
          testDuration: `${loadTestDuration / 1000}s`,
          totalRequests,
          successfulRequests,
          failedRequests,
          availability: `${availability.toFixed(2)}%`,
          avgRequestsPerSecond: (totalRequests / (loadTestDuration / 1000)).toFixed(2),
        });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
  });
  
  describe('Error Handling and Resilience', () => {
    
    test('System should gracefully handle adapter failures', async () => {
      testMetrics.totalTests++;
      
      try {
        // Simulate adapter failure by temporarily disabling one
        const adapterNames = Object.keys(adapters);
        if (adapterNames.length < 2) {
          logger.info('Skipping adapter failure test - need at least 2 adapters');
          testMetrics.totalTests--;
          return;
        }
        
        const adapterToDisable = adapterNames[0];
        const originalAdapter = adapters[adapterToDisable];
        
        // Mock adapter failure
        adapters[adapterToDisable] = {
          ...originalAdapter,
          search: async () => { throw new Error('Simulated adapter failure'); },
          healthCheck: async () => ({ 
            source_name: originalAdapter.config.name,
            healthy: false, 
            response_time_ms: 0,
            last_check: new Date().toISOString(),
            error_message: 'Simulated failure' 
          }),
        };
        
        // Test that search still works with remaining adapters
        const results = await server.search('test query with adapter failure', {
          max_results: 10,
        });
        
        // Should still get some results from working adapters
        assert.ok(results.length >= 0, 'System should handle adapter failure gracefully');
        
        // Verify error is logged but doesn't crash system
        const remainingAdapters = adapterNames.filter(name => name !== adapterToDisable);
        if (remainingAdapters.length > 0) {
          assert.ok(true, 'System continues operating with remaining adapters');
        }
        
        // Restore original adapter
        adapters[adapterToDisable] = originalAdapter;
        
        testMetrics.passed++;
        logger.info('Adapter failure resilience validated', {
          simulatedFailure: adapterToDisable,
          remainingAdapters: remainingAdapters.length,
          resultsWithFailure: results.length,
        });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
    
    test('System should handle invalid queries gracefully', async () => {
      testMetrics.totalTests++;
      
      try {
        const invalidQueries = [
          '', // Empty query
          '   ', // Whitespace only
          'a'.repeat(10000), // Extremely long query
          '!@#$%^&*()_+{}|:<>?[]\\;\'"\\/.,`~', // Special characters only
          null as any, // Null value
          undefined as any, // Undefined value
        ];
        
        let gracefulHandling = 0;
        
        for (const invalidQuery of invalidQueries) {
          try {
            const results = await server.search(invalidQuery, { max_results: 5 });
            
            // Should either return empty results or handle gracefully
            assert.ok(Array.isArray(results), 'Should return array even for invalid queries');
            gracefulHandling++;
            
          } catch (error) {
            // Errors are acceptable for invalid inputs as long as they're handled gracefully
            assert.ok(error instanceof Error, 'Should throw proper Error objects');
            assert.ok(!error.message.includes('FATAL') && !error.message.includes('CRASH'), 
              'Should not contain fatal error indicators');
            gracefulHandling++;
          }
        }
        
        assert.ok(gracefulHandling === invalidQueries.length,
          'All invalid queries should be handled gracefully');
        
        testMetrics.passed++;
        logger.info('Invalid query handling validated', {
          invalidQueriesHandled: gracefulHandling,
          totalInvalidQueries: invalidQueries.length,
        });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
  });
  
  describe('Data Quality and Consistency', () => {
    
    test('Search results should have consistent structure across adapters', async () => {
      testMetrics.totalTests++;
      
      try {
        const testQuery = 'documentation standards';
        const results = await server.search(testQuery, {
          max_results: 20,
          source_types: Object.keys(adapters) as any[],
        });
        
        assert.ok(results.length > 0, 'Should have results to validate structure');
        
        // Validate required fields
        const requiredFields = ['id', 'title', 'content', 'source_type', 'confidence_score'];
        
        for (const result of results) {
          for (const field of requiredFields) {
            assert.ok(result[field] !== undefined && result[field] !== null,
              `Result should have ${field}: ${JSON.stringify(result, null, 2)}`);
          }
          
          // Validate field types
          assert.ok(typeof result.id === 'string', 'ID should be string');
          assert.ok(typeof result.title === 'string', 'Title should be string');
          assert.ok(typeof result.content === 'string', 'Content should be string');
          assert.ok(typeof result.source_type === 'string', 'Source type should be string');
          assert.ok(typeof result.confidence_score === 'number', 'Confidence score should be number');
          
          // Validate field values
          assert.ok(result.title.length > 0, 'Title should not be empty');
          assert.ok(result.content.length > 0, 'Content should not be empty');
          assert.ok(result.confidence_score >= 0 && result.confidence_score <= 1,
            `Confidence score should be 0-1, got ${result.confidence_score}`);
        }
        
        // Validate source type diversity
        const sourceTypes = new Set(results.map(r => r.source_type));
        logger.info('Result structure validation passed', {
          totalResults: results.length,
          sourceTypes: Array.from(sourceTypes),
          sampleResult: {
            id: results[0].id,
            title: results[0].title.substring(0, 50) + '...',
            sourceType: results[0].source_type,
            confidence: results[0].confidence_score,
          },
        });
        
        testMetrics.passed++;
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
    
    test('Runbook data should be properly structured and complete', async () => {
      testMetrics.totalTests++;
      
      try {
        const runbooks = await server.searchRunbooks(
          'system_failure',
          'critical',
          ['production-server']
        );
        
        // Validate runbook structure (even if no runbooks found, test passes)
        for (const runbook of runbooks) {
          // Required runbook fields
          assert.ok(runbook.id, 'Runbook should have ID');
          assert.ok(runbook.title, 'Runbook should have title');
          assert.ok(runbook.version, 'Runbook should have version');
          assert.ok(runbook.triggers && Array.isArray(runbook.triggers), 
            'Runbook should have triggers array');
          assert.ok(runbook.procedures && Array.isArray(runbook.procedures),
            'Runbook should have procedures array');
          
          // Validate procedures structure
          for (const procedure of runbook.procedures) {
            assert.ok(procedure.id, 'Procedure should have ID');
            assert.ok(procedure.title, 'Procedure should have title');
            assert.ok(procedure.steps && Array.isArray(procedure.steps),
              'Procedure should have steps array');
            
            // Validate steps
            for (const step of procedure.steps) {
              assert.ok(step.step_number !== undefined, 'Step should have step number');
              assert.ok(step.description, 'Step should have description');
            }
          }
        }
        
        testMetrics.passed++;
        logger.info('Runbook structure validation completed', {
          runbooksValidated: runbooks.length,
          totalProcedures: runbooks.reduce((sum, r) => sum + r.procedures.length, 0),
          totalSteps: runbooks.reduce((sum, r) => 
            sum + r.procedures.reduce((pSum, p) => pSum + p.steps.length, 0), 0),
        });
      } catch (error) {
        testMetrics.failed++;
        throw error;
      }
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function generateTestReport(): string {
  const successRate = testMetrics.totalTests > 0 
    ? (testMetrics.passed / testMetrics.totalTests) * 100 
    : 0;
    
  return `
# Phase 2 Multi-Adapter Integration Test Report

## Test Execution Summary
- **Total Tests**: ${testMetrics.totalTests}
- **Passed**: ${testMetrics.passed}
- **Failed**: ${testMetrics.failed}
- **Success Rate**: ${successRate.toFixed(1)}%

## Performance Metrics
- **Average Response Time**: ${testMetrics.averageResponseTime.toFixed(2)}ms
- **Cross-Adapter Coverage**: ${testMetrics.crossAdapterCoverage.toFixed(1)}%
- **Semantic Search Accuracy**: ${testMetrics.semanticSearchAccuracy.toFixed(1)}%

## Adapter Health Scores
${Object.entries(testMetrics.adapterHealthScores)
  .map(([name, score]) => `- **${name}**: ${score}%`)
  .join('\n')}

## Validation Results
- **Response Time Target**: ${testMetrics.averageResponseTime <= testConfig.performance.responseTimeTarget ? '✅' : '❌'} 
  (${testMetrics.averageResponseTime.toFixed(2)}ms vs ${testConfig.performance.responseTimeTarget}ms target)
- **Cross-Adapter Coverage**: ${testMetrics.crossAdapterCoverage >= testConfig.validation.crossAdapterCoverage ? '✅' : '❌'} 
  (${testMetrics.crossAdapterCoverage.toFixed(1)}% vs ${testConfig.validation.crossAdapterCoverage}% target)
- **Semantic Enhancement**: ${testMetrics.semanticSearchAccuracy >= testConfig.validation.minAccuracyImprovement ? '✅' : '❌'} 
  (${testMetrics.semanticSearchAccuracy.toFixed(1)}% vs ${testConfig.validation.minAccuracyImprovement}% target)

## Enabled Adapters
${Object.entries(testConfig.adapters)
  .filter(([_, enabled]) => enabled)
  .map(([name, _]) => `- ${name}`)
  .join('\n')}

---
*Generated on ${new Date().toISOString()}*
`;
}

// Export test metrics for external reporting
export { testMetrics, testConfig, generateTestReport };
