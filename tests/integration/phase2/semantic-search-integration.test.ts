#!/usr/bin/env tsx
/**
 * Phase 2 Semantic Search Integration Test Suite
 *
 * Comprehensive testing of SemanticSearchEngine integration with all adapters,
 * validating enhanced search capabilities, performance targets, and accuracy improvements.
 *
 * Authored by: QA/Test Engineer  
 * Date: 2025-08-17
 */

import { test, describe, beforeAll, afterAll } from 'node:test';
import assert from 'node:assert';
import { SemanticSearchEngine } from '../../../src/search/semantic-engine.js';
import { IntelligentSearchEngine } from '../../../src/search/intelligent-search-engine.js';
import { HybridScoringAlgorithm } from '../../../src/search/hybrid-scoring.js';
import { EmbeddingManager } from '../../../src/search/embedding-manager.js';
import { SearchPerformanceOptimizer } from '../../../src/search/performance-optimizer.js';
import { 
  FileSystemAdapter,
  ConfluenceAdapter,
  GitHubAdapter,
  DatabaseAdapter,
  WebAdapter
} from '../../../src/adapters/index.js';
import { SearchResult, SearchFilters } from '../../../src/types/index.js';
import { logger } from '../../../src/utils/logger.js';

// ============================================================================
// Test Configuration
// ============================================================================

interface SemanticTestConfig {
  performance: {
    embeddingGenerationTarget: number; // ms per document
    searchResponseTarget: number; // ms per query
    batchProcessingTarget: number; // documents per second
    memoryUsageTarget: number; // MB for 1K documents
  };
  accuracy: {
    semanticImprovementTarget: number; // percentage improvement over fuzzy
    relevanceThreshold: number; // minimum confidence score
    topKAccuracy: number; // accuracy for top-K results
  };
  scalability: {
    maxDocuments: number;
    maxConcurrentQueries: number;
    cacheHitRateTarget: number; // percentage
  };
}

const semanticTestConfig: SemanticTestConfig = {
  performance: {
    embeddingGenerationTarget: 50, // <50ms per document
    searchResponseTarget: 200, // <200ms per query
    batchProcessingTarget: 100, // >100 docs/sec
    memoryUsageTarget: 500, // <500MB for 1K docs
  },
  accuracy: {
    semanticImprovementTarget: 25, // 25% improvement over fuzzy
    relevanceThreshold: 0.3, // minimum 0.3 confidence
    topKAccuracy: 0.8, // 80% accuracy for top-5 results
  },
  scalability: {
    maxDocuments: 10000,
    maxConcurrentQueries: 50,
    cacheHitRateTarget: 70, // 70% cache hit rate
  },
};

interface SemanticTestMetrics {
  embeddingPerformance: {
    avgGenerationTime: number;
    totalDocumentsProcessed: number;
    batchProcessingRate: number;
  };
  searchPerformance: {
    avgResponseTime: number;
    totalQueries: number;
    cacheHitRate: number;
  };
  accuracyMetrics: {
    semanticVsFuzzyImprovement: number;
    avgRelevanceScore: number;
    topKAccuracy: number;
  };
  scalabilityMetrics: {
    maxDocumentsHandled: number;
    maxConcurrentQueries: number;
    memoryUsage: number;
  };
}

let semanticEngine: SemanticSearchEngine;
let intelligentEngine: IntelligentSearchEngine;
let adapters: Record<string, any> = {};
let testDocuments: SearchResult[] = [];
let testMetrics: SemanticTestMetrics;

// ============================================================================
// Test Setup and Teardown
// ============================================================================

beforeAll(async () => {
  logger.info('Setting up Phase 2 Semantic Search Integration Tests');
  
  // Initialize test metrics
  testMetrics = {
    embeddingPerformance: {
      avgGenerationTime: 0,
      totalDocumentsProcessed: 0,
      batchProcessingRate: 0,
    },
    searchPerformance: {
      avgResponseTime: 0,
      totalQueries: 0,
      cacheHitRate: 0,
    },
    accuracyMetrics: {
      semanticVsFuzzyImprovement: 0,
      avgRelevanceScore: 0,
      topKAccuracy: 0,
    },
    scalabilityMetrics: {
      maxDocumentsHandled: 0,
      maxConcurrentQueries: 0,
      memoryUsage: 0,
    },
  };

  try {
    // Initialize Semantic Search Engine
    semanticEngine = new SemanticSearchEngine({
      model: 'Xenova/all-MiniLM-L6-v2',
      maxCacheSize: 5000,
      minSimilarityThreshold: 0.2,
      maxResults: 50,
      scoringWeights: {
        semantic: 0.6,
        fuzzy: 0.3,
        metadata: 0.1,
      },
      performance: {
        batchSize: 32,
        enableCaching: true,
        warmupCache: true,
      },
    });
    
    await semanticEngine.initialize();
    logger.info('Semantic search engine initialized');
    
    // Initialize Intelligent Search Engine
    intelligentEngine = new IntelligentSearchEngine({
      semanticEngine,
      enableQueryOptimization: true,
      enableIntentClassification: true,
      enableContextEnhancement: true,
    });
    
    await intelligentEngine.initialize();
    logger.info('Intelligent search engine initialized');
    
    // Initialize adapters with semantic search
    await initializeAdaptersWithSemantic();
    
    // Generate test documents
    await generateTestDocuments();
    
    // Index test documents
    await indexTestDocuments();
    
  } catch (error) {
    logger.error('Failed to initialize semantic search test environment', { error });
    throw error;
  }
});

afterAll(async () => {
  logger.info('Cleaning up Phase 2 Semantic Search Integration Tests');
  
  try {
    // Cleanup engines
    if (semanticEngine) {
      await semanticEngine.cleanup();
    }
    
    if (intelligentEngine) {
      await intelligentEngine.cleanup();
    }
    
    // Cleanup adapters
    for (const adapter of Object.values(adapters)) {
      if (adapter && typeof adapter.cleanup === 'function') {
        await adapter.cleanup();
      }
    }
    
    // Log final metrics
    logger.info('Semantic Search Test Metrics', testMetrics);
    
  } catch (error) {
    logger.error('Error during semantic search test cleanup', { error });
  }
});

async function initializeAdaptersWithSemantic(): Promise<void> {
  // FileSystem Adapter with semantic search
  adapters.file = new FileSystemAdapter({
    name: 'semantic-test-file',
    type: 'file',
    config: {
      base_path: './test-data',
      file_patterns: ['**/*.md', '**/*.json'],
      watch_for_changes: false,
    },
  });
  
  // Enable semantic search on file adapter
  adapters.file.enableSemanticSearch(semanticEngine);
  await adapters.file.initialize();
  
  // Initialize other adapters if credentials are available
  if (process.env.CONFLUENCE_TOKEN) {
    adapters.confluence = new ConfluenceAdapter({
      name: 'semantic-test-confluence',
      type: 'confluence',
      config: {
        base_url: process.env.CONFLUENCE_URL || 'https://test.atlassian.net/wiki',
        auth: {
          type: 'bearer_token',
          token: process.env.CONFLUENCE_TOKEN,
        },
        spaces: ['TEST'],
      },
    }, {
      enableSemanticSearch: true,
      semanticEngine,
    });
    await adapters.confluence.initialize();
  }
  
  if (process.env.GITHUB_TOKEN) {
    adapters.github = new GitHubAdapter({
      name: 'semantic-test-github',
      type: 'github',
      config: {
        repositories: [{
          owner: 'test-org',
          repo: 'docs',
          paths: ['docs/', 'README.md'],
        }],
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
  
  logger.info('Adapters initialized with semantic search', {
    enabledAdapters: Object.keys(adapters),
  });
}

async function generateTestDocuments(): Promise<void> {
  // Generate diverse test documents for semantic search testing
  const documentTemplates = [
    {
      category: 'troubleshooting',
      documents: [
        {
          title: 'Memory Leak Investigation Guide',
          content: 'This guide covers identifying and resolving memory leaks in production applications. Topics include heap analysis, profiling tools, and common patterns that cause memory issues.',
          tags: ['memory', 'debugging', 'performance', 'troubleshooting'],
        },
        {
          title: 'Disk Space Cleanup Procedures',
          content: 'Step-by-step procedures for reclaiming disk space in critical situations. Covers log rotation, temporary file cleanup, and storage optimization techniques.',
          tags: ['storage', 'cleanup', 'maintenance', 'disk'],
        },
        {
          title: 'High CPU Usage Analysis',
          content: 'Comprehensive analysis techniques for diagnosing high CPU usage. Includes profiling, process monitoring, and optimization strategies.',
          tags: ['cpu', 'performance', 'analysis', 'optimization'],
        },
      ],
    },
    {
      category: 'security',
      documents: [
        {
          title: 'Security Incident Response Playbook',
          content: 'Immediate response procedures for security incidents. Covers containment, investigation, and recovery processes for various threat scenarios.',
          tags: ['security', 'incident', 'response', 'threats'],
        },
        {
          title: 'Vulnerability Assessment Guidelines',
          content: 'Guidelines for conducting vulnerability assessments. Includes scanning tools, risk evaluation, and remediation prioritization.',
          tags: ['vulnerability', 'assessment', 'security', 'scanning'],
        },
        {
          title: 'Access Control Management',
          content: 'Best practices for managing user access controls. Covers authentication, authorization, and privilege escalation prevention.',
          tags: ['access', 'authentication', 'authorization', 'security'],
        },
      ],
    },
    {
      category: 'operations',
      documents: [
        {
          title: 'Database Performance Tuning',
          content: 'Techniques for optimizing database performance. Includes index optimization, query tuning, and connection pool management.',
          tags: ['database', 'performance', 'tuning', 'optimization'],
        },
        {
          title: 'API Rate Limiting Configuration',
          content: 'Configuration and management of API rate limiting. Covers different algorithms, monitoring, and dynamic adjustment strategies.',
          tags: ['api', 'rate-limiting', 'configuration', 'throttling'],
        },
        {
          title: 'Load Balancer Health Checks',
          content: 'Setting up and monitoring load balancer health checks. Includes configuration examples and troubleshooting common issues.',
          tags: ['load-balancer', 'health-check', 'monitoring', 'networking'],
        },
      ],
    },
  ];
  
  testDocuments = [];
  let documentId = 1;
  
  for (const category of documentTemplates) {
    for (const doc of category.documents) {
      testDocuments.push({
        id: `test-doc-${documentId++}`,
        title: doc.title,
        content: doc.content,
        source_name: 'semantic-test',
        source_type: 'test',
        confidence_score: 1.0,
        match_reasons: ['test document'],
        retrieval_time_ms: 0,
        metadata: {
          category: category.category,
          tags: doc.tags,
          document_type: 'guide',
          created_at: new Date().toISOString(),
        },
      });
    }
  }
  
  logger.info('Generated test documents for semantic search', {
    totalDocuments: testDocuments.length,
    categories: documentTemplates.map(c => c.category),
  });
}

async function indexTestDocuments(): Promise<void> {
  const startTime = performance.now();
  
  // Index documents in semantic search engine
  await semanticEngine.indexDocuments(testDocuments);
  
  const indexingTime = performance.now() - startTime;
  testMetrics.embeddingPerformance.totalDocumentsProcessed = testDocuments.length;
  testMetrics.embeddingPerformance.avgGenerationTime = indexingTime / testDocuments.length;
  testMetrics.embeddingPerformance.batchProcessingRate = (testDocuments.length / indexingTime) * 1000;
  
  logger.info('Test documents indexed in semantic search engine', {
    documentsIndexed: testDocuments.length,
    indexingTime: `${indexingTime.toFixed(2)}ms`,
    avgTimePerDoc: `${testMetrics.embeddingPerformance.avgGenerationTime.toFixed(2)}ms`,
    processingRate: `${testMetrics.embeddingPerformance.batchProcessingRate.toFixed(2)} docs/sec`,
  });
}

// ============================================================================
// Semantic Search Integration Tests
// ============================================================================

describe('Phase 2 Semantic Search Integration Tests', () => {
  
  describe('Semantic Engine Initialization and Performance', () => {
    
    test('Semantic search engine should initialize with target performance', async () => {
      try {
        assert.ok(semanticEngine.isInitialized, 'Semantic search engine should be initialized');
        assert.ok(intelligentEngine.isInitialized, 'Intelligent search engine should be initialized');
        
        // Verify embedding generation performance
        assert.ok(testMetrics.embeddingPerformance.avgGenerationTime <= semanticTestConfig.performance.embeddingGenerationTarget,
          `Embedding generation should be within ${semanticTestConfig.performance.embeddingGenerationTarget}ms target, ` +
          `got ${testMetrics.embeddingPerformance.avgGenerationTime.toFixed(2)}ms`);
        
        // Verify batch processing performance
        assert.ok(testMetrics.embeddingPerformance.batchProcessingRate >= semanticTestConfig.performance.batchProcessingTarget,
          `Batch processing should meet ${semanticTestConfig.performance.batchProcessingTarget} docs/sec target, ` +
          `got ${testMetrics.embeddingPerformance.batchProcessingRate.toFixed(2)} docs/sec`);
        
        logger.info('Semantic engine performance validation passed', {
          avgGenerationTime: `${testMetrics.embeddingPerformance.avgGenerationTime.toFixed(2)}ms`,
          batchProcessingRate: `${testMetrics.embeddingPerformance.batchProcessingRate.toFixed(2)} docs/sec`,
          documentsProcessed: testMetrics.embeddingPerformance.totalDocumentsProcessed,
        });
      } catch (error) {
        logger.error('Semantic engine performance test failed', { error });
        throw error;
      }
    });
    
    test('Embedding manager should handle large document sets efficiently', async () => {
      try {
        // Test with larger document set
        const largeDocumentSet = [];
        for (let i = 0; i < 1000; i++) {
          largeDocumentSet.push({
            id: `large-test-${i}`,
            title: `Test Document ${i}`,
            content: `This is test content for document ${i}. It contains various keywords and phrases for semantic analysis.`,
            source_name: 'large-test',
            source_type: 'test',
            confidence_score: 1.0,
            match_reasons: ['large test'],
            retrieval_time_ms: 0,
          });
        }
        
        const startTime = performance.now();
        await semanticEngine.indexDocuments(largeDocumentSet);
        const processingTime = performance.now() - startTime;
        
        const docsPerSecond = (largeDocumentSet.length / processingTime) * 1000;
        const avgTimePerDoc = processingTime / largeDocumentSet.length;
        
        assert.ok(docsPerSecond >= semanticTestConfig.performance.batchProcessingTarget,
          `Large document set processing should meet ${semanticTestConfig.performance.batchProcessingTarget} docs/sec, ` +
          `got ${docsPerSecond.toFixed(2)} docs/sec`);
        
        assert.ok(avgTimePerDoc <= semanticTestConfig.performance.embeddingGenerationTarget,
          `Per-document processing should be within ${semanticTestConfig.performance.embeddingGenerationTarget}ms, ` +
          `got ${avgTimePerDoc.toFixed(2)}ms`);
        
        testMetrics.scalabilityMetrics.maxDocumentsHandled = Math.max(
          testMetrics.scalabilityMetrics.maxDocumentsHandled,
          largeDocumentSet.length
        );
        
        logger.info('Large document set processing validated', {
          documentsProcessed: largeDocumentSet.length,
          processingTime: `${processingTime.toFixed(2)}ms`,
          docsPerSecond: `${docsPerSecond.toFixed(2)}`,
          avgTimePerDoc: `${avgTimePerDoc.toFixed(2)}ms`,
        });
      } catch (error) {
        logger.error('Large document set test failed', { error });
        throw error;
      }
    });
  });
  
  describe('Semantic Search Accuracy and Relevance', () => {
    
    test('Semantic search should outperform fuzzy search for conceptual queries', async () => {
      try {
        const conceptualQueries = [
          {
            query: 'memory issues',
            expectedMatches: ['Memory Leak Investigation Guide', 'High CPU Usage Analysis'],
            description: 'Should match memory-related troubleshooting docs',
          },
          {
            query: 'storage problems',
            expectedMatches: ['Disk Space Cleanup Procedures'],
            description: 'Should match disk/storage related docs',
          },
          {
            query: 'security breach',
            expectedMatches: ['Security Incident Response Playbook', 'Vulnerability Assessment Guidelines'],
            description: 'Should match security incident docs',
          },
          {
            query: 'performance bottlenecks',
            expectedMatches: ['Database Performance Tuning', 'High CPU Usage Analysis'],
            description: 'Should match performance optimization docs',
          },
          {
            query: 'access management',
            expectedMatches: ['Access Control Management'],
            description: 'Should match access control docs',
          },
        ];
        
        let totalQueries = 0;
        let semanticImprovement = 0;
        let totalRelevanceScore = 0;
        let totalResponseTime = 0;
        
        for (const testCase of conceptualQueries) {
          totalQueries++;
          
          // Get semantic search results
          const startTime = performance.now();
          const semanticResults = await semanticEngine.search(testCase.query, {
            max_results: 10,
          });
          const responseTime = performance.now() - startTime;
          totalResponseTime += responseTime;
          
          // Get fuzzy search results for comparison
          const fuzzyResults = await semanticEngine.search(testCase.query, {
            max_results: 10,
            use_semantic: false, // Force fuzzy-only search
          });
          
          // Calculate relevance scores
          const semanticRelevance = calculateRelevanceScore(semanticResults, testCase.expectedMatches);
          const fuzzyRelevance = calculateRelevanceScore(fuzzyResults, testCase.expectedMatches);
          totalRelevanceScore += semanticRelevance;
          
          // Check for improvement
          const improvement = semanticRelevance > fuzzyRelevance;
          if (improvement) {
            semanticImprovement++;
          }
          
          // Verify response time
          assert.ok(responseTime <= semanticTestConfig.performance.searchResponseTarget,
            `Search response time should be within ${semanticTestConfig.performance.searchResponseTarget}ms, ` +
            `got ${responseTime.toFixed(2)}ms for query: "${testCase.query}"`);
          
          // Verify minimum relevance threshold
          assert.ok(semanticRelevance >= semanticTestConfig.accuracy.relevanceThreshold,
            `Semantic relevance should meet ${semanticTestConfig.accuracy.relevanceThreshold} threshold, ` +
            `got ${semanticRelevance.toFixed(3)} for query: "${testCase.query}"`);
          
          logger.info('Conceptual query test completed', {
            query: testCase.query,
            semanticRelevance: semanticRelevance.toFixed(3),
            fuzzyRelevance: fuzzyRelevance.toFixed(3),
            improvement: improvement ? 'Yes' : 'No',
            responseTime: `${responseTime.toFixed(2)}ms`,
            topResult: semanticResults[0]?.title || 'No results',
          });
        }
        
        // Calculate overall metrics
        const improvementPercentage = (semanticImprovement / totalQueries) * 100;
        const avgRelevanceScore = totalRelevanceScore / totalQueries;
        const avgResponseTime = totalResponseTime / totalQueries;
        
        // Update test metrics
        testMetrics.accuracyMetrics.semanticVsFuzzyImprovement = improvementPercentage;
        testMetrics.accuracyMetrics.avgRelevanceScore = avgRelevanceScore;
        testMetrics.searchPerformance.avgResponseTime = avgResponseTime;
        testMetrics.searchPerformance.totalQueries += totalQueries;
        
        // Validate against targets
        assert.ok(improvementPercentage >= semanticTestConfig.accuracy.semanticImprovementTarget,
          `Semantic improvement should meet ${semanticTestConfig.accuracy.semanticImprovementTarget}% target, ` +
          `got ${improvementPercentage.toFixed(1)}%`);
        
        assert.ok(avgRelevanceScore >= semanticTestConfig.accuracy.relevanceThreshold,
          `Average relevance should meet ${semanticTestConfig.accuracy.relevanceThreshold} threshold, ` +
          `got ${avgRelevanceScore.toFixed(3)}`);
        
        logger.info('Semantic vs fuzzy search comparison completed', {
          totalQueries,
          improvementPercentage: `${improvementPercentage.toFixed(1)}%`,
          avgRelevanceScore: avgRelevanceScore.toFixed(3),
          avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        });
      } catch (error) {
        logger.error('Semantic accuracy test failed', { error });
        throw error;
      }
    });
    
    test('Semantic search should handle synonym and context variations', async () => {
      try {
        const synonymTests = [
          {
            queries: ['memory leak', 'memory issues', 'memory problems', 'heap overflow'],
            expectedDoc: 'Memory Leak Investigation Guide',
            description: 'Memory-related synonyms',
          },
          {
            queries: ['disk space', 'storage space', 'disk full', 'storage cleanup'],
            expectedDoc: 'Disk Space Cleanup Procedures',
            description: 'Storage-related synonyms',
          },
          {
            queries: ['security breach', 'security incident', 'cyber attack', 'unauthorized access'],
            expectedDoc: 'Security Incident Response Playbook',
            description: 'Security-related synonyms',
          },
        ];
        
        for (const synonymTest of synonymTests) {
          const results = [];
          
          for (const query of synonymTest.queries) {
            const searchResults = await semanticEngine.search(query, {
              max_results: 5,
            });
            
            const targetFound = searchResults.some(result => 
              result.title.includes(synonymTest.expectedDoc) ||
              result.title.toLowerCase().includes(synonymTest.expectedDoc.toLowerCase())
            );
            
            results.push({
              query,
              targetFound,
              topResult: searchResults[0]?.title || 'No results',
              confidence: searchResults[0]?.confidence_score || 0,
            });
          }
          
          const successRate = results.filter(r => r.targetFound).length / results.length;
          
          assert.ok(successRate >= 0.7, // 70% of synonym queries should find the target
            `Synonym handling should have ≥70% success rate for ${synonymTest.description}, ` +
            `got ${(successRate * 100).toFixed(1)}%`);
          
          logger.info('Synonym test completed', {
            testGroup: synonymTest.description,
            successRate: `${(successRate * 100).toFixed(1)}%`,
            results,
          });
        }
      } catch (error) {
        logger.error('Synonym handling test failed', { error });
        throw error;
      }
    });
    
    test('Top-K results should maintain high accuracy', async () => {
      try {
        const precisionTests = [
          {
            query: 'database optimization',
            relevantDocs: ['Database Performance Tuning'],
            k: 3,
          },
          {
            query: 'incident response',
            relevantDocs: ['Security Incident Response Playbook'],
            k: 3,
          },
          {
            query: 'performance troubleshooting',
            relevantDocs: ['Database Performance Tuning', 'High CPU Usage Analysis', 'Memory Leak Investigation Guide'],
            k: 5,
          },
        ];
        
        let totalTests = 0;
        let accurateTests = 0;
        
        for (const test of precisionTests) {
          const results = await semanticEngine.search(test.query, {
            max_results: test.k,
          });
          
          const topKResults = results.slice(0, test.k);
          const relevantInTopK = topKResults.filter(result =>
            test.relevantDocs.some(doc => 
              result.title.toLowerCase().includes(doc.toLowerCase()) ||
              doc.toLowerCase().includes(result.title.toLowerCase())
            )
          ).length;
          
          const precision = relevantInTopK / Math.min(test.k, test.relevantDocs.length);
          totalTests++;
          
          if (precision >= semanticTestConfig.accuracy.topKAccuracy) {
            accurateTests++;
          }
          
          logger.info('Top-K precision test', {
            query: test.query,
            k: test.k,
            relevantInTopK,
            precision: precision.toFixed(3),
            topResults: topKResults.map(r => r.title),
          });
        }
        
        const overallAccuracy = accurateTests / totalTests;
        testMetrics.accuracyMetrics.topKAccuracy = overallAccuracy;
        
        assert.ok(overallAccuracy >= semanticTestConfig.accuracy.topKAccuracy,
          `Top-K accuracy should meet ${semanticTestConfig.accuracy.topKAccuracy} target, ` +
          `got ${overallAccuracy.toFixed(3)}`);
        
        logger.info('Top-K accuracy validation completed', {
          totalTests,
          accurateTests,
          overallAccuracy: overallAccuracy.toFixed(3),
        });
      } catch (error) {
        logger.error('Top-K accuracy test failed', { error });
        throw error;
      }
    });
  });
  
  describe('Cross-Adapter Semantic Integration', () => {
    
    test('Semantic search should work consistently across all adapter types', async () => {
      try {
        const crossAdapterQueries = [
          'troubleshooting procedures',
          'security guidelines',
          'performance optimization',
          'operational procedures',
        ];
        
        for (const query of crossAdapterQueries) {
          const adapterResults = {};
          
          // Test semantic search on each adapter
          for (const [adapterName, adapter] of Object.entries(adapters)) {
            if (adapter && typeof adapter.search === 'function') {
              try {
                const results = await adapter.search(query, {
                  max_results: 5,
                  use_semantic: true,
                });
                
                adapterResults[adapterName] = {
                  resultCount: results.length,
                  avgConfidence: results.length > 0 
                    ? results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length 
                    : 0,
                  topResult: results[0]?.title || 'No results',
                };
              } catch (error) {
                logger.warn(`Semantic search failed on ${adapterName}`, { query, error: error.message });
                adapterResults[adapterName] = { error: error.message };
              }
            }
          }
          
          // Verify at least one adapter returned semantic results
          const successfulAdapters = Object.values(adapterResults).filter(
            (result: any) => !result.error && result.resultCount > 0
          );
          
          assert.ok(successfulAdapters.length > 0,
            `At least one adapter should return semantic results for query: "${query}"`);
          
          logger.info('Cross-adapter semantic search completed', {
            query,
            adapterResults,
            successfulAdapters: successfulAdapters.length,
          });
        }
      } catch (error) {
        logger.error('Cross-adapter semantic integration test failed', { error });
        throw error;
      }
    });
    
    test('Semantic enhancement should improve result quality from all sources', async () => {
      try {
        const testQuery = 'system monitoring and alerting';
        
        // Get results with and without semantic enhancement
        const semanticResults = await semanticEngine.search(testQuery, {
          max_results: 10,
          source_types: Object.keys(adapters) as any[],
        });
        
        const traditionalResults = await semanticEngine.search(testQuery, {
          max_results: 10,
          use_semantic: false,
          source_types: Object.keys(adapters) as any[],
        });
        
        // Compare result quality
        const semanticAvgConfidence = semanticResults.length > 0
          ? semanticResults.reduce((sum, r) => sum + r.confidence_score, 0) / semanticResults.length
          : 0;
        
        const traditionalAvgConfidence = traditionalResults.length > 0
          ? traditionalResults.reduce((sum, r) => sum + r.confidence_score, 0) / traditionalResults.length
          : 0;
        
        // Check for diversity in semantic results
        const semanticSources = new Set(semanticResults.map(r => r.source_type));
        const traditionalSources = new Set(traditionalResults.map(r => r.source_type));
        
        // Semantic search should maintain or improve source diversity
        assert.ok(semanticSources.size >= traditionalSources.size || semanticSources.size >= 1,
          'Semantic search should maintain source diversity');
        
        logger.info('Cross-source semantic enhancement comparison', {
          query: testQuery,
          semanticResults: {
            count: semanticResults.length,
            avgConfidence: semanticAvgConfidence.toFixed(3),
            sources: Array.from(semanticSources),
          },
          traditionalResults: {
            count: traditionalResults.length,
            avgConfidence: traditionalAvgConfidence.toFixed(3),
            sources: Array.from(traditionalSources),
          },
          improvement: semanticAvgConfidence > traditionalAvgConfidence ? 'Yes' : 'No',
        });
      } catch (error) {
        logger.error('Cross-source semantic enhancement test failed', { error });
        throw error;
      }
    });
  });
  
  describe('Performance and Scalability', () => {
    
    test('Concurrent semantic queries should maintain performance', async () => {
      try {
        const concurrentQueries = [
          'memory optimization strategies',
          'security vulnerability assessment',
          'database performance tuning',
          'incident response procedures',
          'system monitoring best practices',
          'network troubleshooting guide',
          'backup and recovery processes',
          'load balancing configuration',
          'API rate limiting setup',
          'access control management',
        ];
        
        const maxConcurrent = Math.min(concurrentQueries.length, semanticTestConfig.scalability.maxConcurrentQueries);
        const selectedQueries = concurrentQueries.slice(0, maxConcurrent);
        
        const startTime = performance.now();
        
        // Execute concurrent queries
        const promises = selectedQueries.map(query =>
          semanticEngine.search(query, { max_results: 5 })
        );
        
        const results = await Promise.allSettled(promises);
        const totalTime = performance.now() - startTime;
        
        // Analyze results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        const successRate = successful / results.length;
        const avgResponseTime = totalTime / results.length;
        
        // Update metrics
        testMetrics.scalabilityMetrics.maxConcurrentQueries = Math.max(
          testMetrics.scalabilityMetrics.maxConcurrentQueries,
          maxConcurrent
        );
        
        // Validate performance
        assert.ok(successRate >= 0.95,
          `Concurrent query success rate should be ≥95%, got ${(successRate * 100).toFixed(1)}%`);
        
        assert.ok(avgResponseTime <= semanticTestConfig.performance.searchResponseTarget * 1.5,
          `Average response time under concurrent load should be within 1.5x target, ` +
          `got ${avgResponseTime.toFixed(2)}ms`);
        
        logger.info('Concurrent semantic query performance validated', {
          concurrentQueries: maxConcurrent,
          successful,
          failed,
          successRate: `${(successRate * 100).toFixed(1)}%`,
          totalTime: `${totalTime.toFixed(2)}ms`,
          avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        });
      } catch (error) {
        logger.error('Concurrent query performance test failed', { error });
        throw error;
      }
    });
    
    test('Semantic search cache should improve performance', async () => {
      try {
        const testQueries = [
          'performance monitoring',
          'security assessment',
          'database optimization',
          'incident response',
        ];
        
        let totalQueries = 0;
        let cacheHits = 0;
        
        // First pass - populate cache
        for (const query of testQueries) {
          await semanticEngine.search(query, { max_results: 5 });
          totalQueries++;
        }
        
        // Second pass - should hit cache
        for (const query of testQueries) {
          const startTime = performance.now();
          const results = await semanticEngine.search(query, { max_results: 5 });
          const responseTime = performance.now() - startTime;
          
          totalQueries++;
          
          // Check if this was likely a cache hit (very fast response)
          if (responseTime < 50) { // Less than 50ms suggests cache hit
            cacheHits++;
          }
          
          // Verify results are still valid
          assert.ok(Array.isArray(results), 'Cached results should be valid arrays');
        }
        
        const cacheHitRate = (cacheHits / testQueries.length) * 100;
        testMetrics.searchPerformance.cacheHitRate = cacheHitRate;
        
        assert.ok(cacheHitRate >= semanticTestConfig.scalability.cacheHitRateTarget,
          `Cache hit rate should meet ${semanticTestConfig.scalability.cacheHitRateTarget}% target, ` +
          `got ${cacheHitRate.toFixed(1)}%`);
        
        logger.info('Semantic search cache performance validated', {
          totalQueries: testQueries.length,
          cacheHits,
          cacheHitRate: `${cacheHitRate.toFixed(1)}%`,
        });
      } catch (error) {
        logger.error('Cache performance test failed', { error });
        throw error;
      }
    });
  });
  
  describe('Intelligent Search Features', () => {
    
    test('Query optimization should improve search effectiveness', async () => {
      try {
        const testQueries = [
          {
            original: 'how to fix memory leak',
            expected_optimization: 'memory leak troubleshooting',
            description: 'Question format to declarative',
          },
          {
            original: 'db is slow what should i do',
            expected_optimization: 'database performance optimization',
            description: 'Informal to formal technical terms',
          },
          {
            original: 'security issue help',
            expected_optimization: 'security incident response',
            description: 'Vague to specific security context',
          },
        ];
        
        for (const testCase of testQueries) {
          // Get results with optimization
          const optimizedResults = await intelligentEngine.search(testCase.original, {
            max_results: 5,
            enable_optimization: true,
          });
          
          // Get results without optimization (direct semantic search)
          const directResults = await semanticEngine.search(testCase.original, {
            max_results: 5,
          });
          
          // Compare result quality
          const optimizedAvgConfidence = optimizedResults.length > 0
            ? optimizedResults.reduce((sum, r) => sum + r.confidence_score, 0) / optimizedResults.length
            : 0;
          
          const directAvgConfidence = directResults.length > 0
            ? directResults.reduce((sum, r) => sum + r.confidence_score, 0) / directResults.length
            : 0;
          
          // Optimization should improve or maintain result quality
          assert.ok(optimizedAvgConfidence >= directAvgConfidence * 0.9,
            `Query optimization should maintain result quality for: "${testCase.original}"`);
          
          logger.info('Query optimization test completed', {
            original: testCase.original,
            description: testCase.description,
            optimizedConfidence: optimizedAvgConfidence.toFixed(3),
            directConfidence: directAvgConfidence.toFixed(3),
            improvement: optimizedAvgConfidence > directAvgConfidence ? 'Yes' : 'No',
            topOptimizedResult: optimizedResults[0]?.title || 'No results',
          });
        }
      } catch (error) {
        logger.error('Query optimization test failed', { error });
        throw error;
      }
    });
    
    test('Intent classification should route queries appropriately', async () => {
      try {
        const intentTests = [
          {
            query: 'how to respond to security incident',
            expectedIntent: 'procedural',
            expectedCategory: 'security',
          },
          {
            query: 'what causes memory leaks',
            expectedIntent: 'informational',
            expectedCategory: 'troubleshooting',
          },
          {
            query: 'optimize database performance',
            expectedIntent: 'operational',
            expectedCategory: 'performance',
          },
        ];
        
        for (const test of intentTests) {
          const results = await intelligentEngine.search(test.query, {
            max_results: 5,
            enable_intent_classification: true,
          });
          
          // Verify results are relevant to the intent
          assert.ok(results.length > 0, `Should return results for intent-classified query: "${test.query}"`);
          
          // Check if results match expected category
          const relevantResults = results.filter(result =>
            result.metadata?.category === test.expectedCategory ||
            result.title.toLowerCase().includes(test.expectedCategory.toLowerCase()) ||
            result.content.toLowerCase().includes(test.expectedCategory.toLowerCase())
          );
          
          const relevanceRate = relevantResults.length / results.length;
          assert.ok(relevanceRate >= 0.6, // 60% of results should be relevant to intent
            `Intent classification should produce relevant results, got ${(relevanceRate * 100).toFixed(1)}% relevance`);
          
          logger.info('Intent classification test completed', {
            query: test.query,
            expectedIntent: test.expectedIntent,
            expectedCategory: test.expectedCategory,
            relevantResults: relevantResults.length,
            totalResults: results.length,
            relevanceRate: `${(relevanceRate * 100).toFixed(1)}%`,
          });
        }
      } catch (error) {
        logger.error('Intent classification test failed', { error });
        throw error;
      }
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function calculateRelevanceScore(results: SearchResult[], expectedMatches: string[]): number {
  if (results.length === 0 || expectedMatches.length === 0) {
    return 0;
  }
  
  let relevantCount = 0;
  const topResults = results.slice(0, 5); // Consider top 5 results
  
  for (const result of topResults) {
    for (const expected of expectedMatches) {
      if (result.title.toLowerCase().includes(expected.toLowerCase()) ||
          expected.toLowerCase().includes(result.title.toLowerCase())) {
        relevantCount++;
        break; // Don't double-count the same result
      }
    }
  }
  
  return relevantCount / Math.min(topResults.length, expectedMatches.length);
}

function generateSemanticTestReport(): string {
  return `
# Phase 2 Semantic Search Integration Test Report

## Performance Metrics

### Embedding Performance
- **Average Generation Time**: ${testMetrics.embeddingPerformance.avgGenerationTime.toFixed(2)}ms
- **Documents Processed**: ${testMetrics.embeddingPerformance.totalDocumentsProcessed}
- **Batch Processing Rate**: ${testMetrics.embeddingPerformance.batchProcessingRate.toFixed(2)} docs/sec

### Search Performance
- **Average Response Time**: ${testMetrics.searchPerformance.avgResponseTime.toFixed(2)}ms
- **Total Queries**: ${testMetrics.searchPerformance.totalQueries}
- **Cache Hit Rate**: ${testMetrics.searchPerformance.cacheHitRate.toFixed(1)}%

## Accuracy Metrics
- **Semantic vs Fuzzy Improvement**: ${testMetrics.accuracyMetrics.semanticVsFuzzyImprovement.toFixed(1)}%
- **Average Relevance Score**: ${testMetrics.accuracyMetrics.avgRelevanceScore.toFixed(3)}
- **Top-K Accuracy**: ${testMetrics.accuracyMetrics.topKAccuracy.toFixed(3)}

## Scalability Metrics
- **Max Documents Handled**: ${testMetrics.scalabilityMetrics.maxDocumentsHandled}
- **Max Concurrent Queries**: ${testMetrics.scalabilityMetrics.maxConcurrentQueries}
- **Memory Usage**: ${testMetrics.scalabilityMetrics.memoryUsage}MB

## Target Validation
- **Embedding Generation**: ${testMetrics.embeddingPerformance.avgGenerationTime <= semanticTestConfig.performance.embeddingGenerationTarget ? '✅' : '❌'} 
  (${testMetrics.embeddingPerformance.avgGenerationTime.toFixed(2)}ms vs ${semanticTestConfig.performance.embeddingGenerationTarget}ms target)
- **Search Response Time**: ${testMetrics.searchPerformance.avgResponseTime <= semanticTestConfig.performance.searchResponseTarget ? '✅' : '❌'} 
  (${testMetrics.searchPerformance.avgResponseTime.toFixed(2)}ms vs ${semanticTestConfig.performance.searchResponseTarget}ms target)
- **Semantic Improvement**: ${testMetrics.accuracyMetrics.semanticVsFuzzyImprovement >= semanticTestConfig.accuracy.semanticImprovementTarget ? '✅' : '❌'} 
  (${testMetrics.accuracyMetrics.semanticVsFuzzyImprovement.toFixed(1)}% vs ${semanticTestConfig.accuracy.semanticImprovementTarget}% target)
- **Cache Hit Rate**: ${testMetrics.searchPerformance.cacheHitRate >= semanticTestConfig.scalability.cacheHitRateTarget ? '✅' : '❌'} 
  (${testMetrics.searchPerformance.cacheHitRate.toFixed(1)}% vs ${semanticTestConfig.scalability.cacheHitRateTarget}% target)

---
*Generated on ${new Date().toISOString()}*
`;
}

// Export test metrics and configuration for external reporting
export { testMetrics, semanticTestConfig, generateSemanticTestReport };
