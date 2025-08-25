/**
 * Semantic Search Engine - Production-grade transformer-based search
 * 
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 * 
 * Core semantic search engine using @xenova/transformers for embeddings
 * with hybrid scoring combining semantic similarity, fuzzy matching, and metadata.
 * 
 * Performance targets:
 * - Search response: <200ms (95% of queries)
 * - Embedding generation: <50ms per document
 * - Memory usage: <500MB for 10K documents
 * - Accuracy improvement: >25% over fuzzy search
 */

import { pipeline, env, Pipeline } from '@xenova/transformers';
import Fuse from 'fuse.js';
import { SearchResult, SearchFilters, Runbook } from '../types/index.js';
import { HybridScoringAlgorithm } from './hybrid-scoring.js';
import { EmbeddingManager } from './embedding-manager.js';
import { SearchPerformanceOptimizer } from './performance-optimizer.js';
import { SearchAnalytics } from './search-analytics.js';
import { logger } from '../utils/logger.js';

// Configure transformers for Node.js environment
env.allowRemoteModels = false;
env.allowLocalModels = true;

interface SemanticSearchConfig {
  /** Model name for embeddings */
  model: string;
  /** Maximum embedding cache size */
  maxCacheSize: number;
  /** Minimum similarity threshold for results */
  minSimilarityThreshold: number;
  /** Maximum results to return */
  maxResults: number;
  /** Hybrid scoring weights */
  scoringWeights: {
    semantic: number;
    fuzzy: number;
    metadata: number;
  };
  /** Performance optimization settings */
  performance: {
    batchSize: number;
    enableCaching: boolean;
    warmupCache: boolean;
  };
}

/**
 * Production-grade semantic search engine with transformer embeddings
 */
export class SemanticSearchEngine {
  private embeddingPipeline: Pipeline | null = null;
  private embeddingManager: EmbeddingManager;
  private hybridScoring: HybridScoringAlgorithm;
  private performanceOptimizer: SearchPerformanceOptimizer;
  private analytics: SearchAnalytics;
  private fuseIndex: Fuse<SearchResult> | null = null;
  private documents: SearchResult[] = [];
  private isInitialized = false;

  private readonly config: SemanticSearchConfig = {
    model: 'Xenova/all-MiniLM-L6-v2', // Fast, lightweight model
    maxCacheSize: 10000,
    minSimilarityThreshold: 0.3,
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
  };

  constructor(config?: Partial<SemanticSearchConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.embeddingManager = new EmbeddingManager({
      model: this.config.model,
      maxCacheSize: this.config.maxCacheSize,
      enableCaching: this.config.performance.enableCaching,
    });

    this.hybridScoring = new HybridScoringAlgorithm(this.config.scoringWeights);
    this.performanceOptimizer = new SearchPerformanceOptimizer();
    this.analytics = new SearchAnalytics();

    this.initializeFuseIndex();
  }

  /**
   * Initialize the semantic search engine
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      logger.info('Initializing Semantic Search Engine...', {
        model: this.config.model,
        caching: this.config.performance.enableCaching,
      });

      // Initialize embedding pipeline
      this.embeddingPipeline = await pipeline(
        'feature-extraction',
        this.config.model
      ) as Pipeline;

      // Initialize components
      await this.embeddingManager.initialize(this.embeddingPipeline);
      await this.performanceOptimizer.initialize();

      this.isInitialized = true;

      const initTime = performance.now() - startTime;
      logger.info('Semantic Search Engine initialized successfully', {
        initializationTime: `${initTime.toFixed(2)}ms`,
        model: this.config.model,
      });

      this.analytics.recordInitialization(initTime);
    } catch (error) {
      logger.error('Failed to initialize Semantic Search Engine', { error });
      throw new Error(`Semantic Search Engine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add documents to the search index
   */
  async indexDocuments(documents: SearchResult[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Semantic Search Engine not initialized');
    }

    const startTime = performance.now();

    try {
      logger.info('Indexing documents for semantic search', {
        documentCount: documents.length,
      });

      // Store documents
      this.documents = [...documents];

      // Generate embeddings for all documents
      await this.embeddingManager.indexDocuments(documents);

      // Update Fuse index
      this.updateFuseIndex(documents);

      // Warm up cache if enabled
      if (this.config.performance.warmupCache) {
        await this.warmupSearchCache();
      }

      const indexTime = performance.now() - startTime;
      logger.info('Document indexing completed', {
        documentCount: documents.length,
        indexingTime: `${indexTime.toFixed(2)}ms`,
      });

      this.analytics.recordIndexing(documents.length, indexTime);
    } catch (error) {
      logger.error('Failed to index documents', { error });
      throw new Error(`Document indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform semantic search with hybrid scoring
   */
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Semantic Search Engine not initialized');
    }

    const startTime = performance.now();
    const searchId = this.analytics.generateSearchId();

    try {
      logger.debug('Performing semantic search', {
        searchId,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        filters,
      });

      // Check cache first
      const cachedResults = await this.performanceOptimizer.getCachedResults(query, filters);
      if (cachedResults) {
        const responseTime = performance.now() - startTime;
        this.analytics.recordSearch(searchId, query, cachedResults.length, responseTime, true);
        return cachedResults;
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingManager.generateEmbedding(query);

      // Get semantic similarity scores
      const semanticScores = await this.embeddingManager.calculateSimilarities(queryEmbedding);

      // Get fuzzy search results
      const fuzzyResults = this.performFuzzySearch(query, filters);

      // Combine results with hybrid scoring
      const hybridResults = await this.hybridScoring.combineResults(
        query,
        this.documents,
        semanticScores,
        fuzzyResults.map(result => ({ item: result, score: 1 - result.confidence_score })),
        filters
      );

      // Apply filters and limits
      const filteredResults = this.applyFilters(hybridResults, filters);
      const finalResults = filteredResults.slice(0, this.config.maxResults);

      // Cache results
      await this.performanceOptimizer.cacheResults(query, filters, finalResults);

      const responseTime = performance.now() - startTime;
      this.analytics.recordSearch(searchId, query, finalResults.length, responseTime, false);

      logger.debug('Semantic search completed', {
        searchId,
        resultCount: finalResults.length,
        responseTime: `${responseTime.toFixed(2)}ms`,
        cached: false,
      });

      return finalResults;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      logger.error('Semantic search failed', { searchId, error, responseTime });

      // Fallback to fuzzy search
      const fallbackResults = this.performFuzzySearch(query, filters);
      this.analytics.recordSearchError(searchId, query, error, responseTime);

      return fallbackResults;
    }
  }

  /**
   * Search for runbooks with enhanced semantic understanding
   */
  async searchRunbooks(
    alertType: string,
    severity: string,
    affectedSystems: string[],
    context?: Record<string, any>
  ): Promise<Runbook[]> {
    const searchQuery = this.constructRunbookQuery(alertType, severity, affectedSystems, context);
    
    const filters: SearchFilters = {
      categories: ['runbook'],
    };

    const results = await this.search(searchQuery, filters);
    
    // Convert SearchResult to Runbook (assumes runbook data is in metadata)
    return results
      .filter(result => result.metadata?.runbook_data)
      .map(result => result.metadata!.runbook_data as Runbook);
  }

  /**
   * Get search performance metrics
   */
  getPerformanceMetrics(): any {
    return {
      analytics: this.analytics.getMetrics(),
      cache: this.performanceOptimizer.getCacheMetrics(),
      embeddings: this.embeddingManager.getMetrics(),
    };
  }

  /**
   * Get search engine status
   */
  getStatus(): any {
    return {
      initialized: this.isInitialized,
      documentCount: this.documents.length,
      model: this.config.model,
      cacheEnabled: this.config.performance.enableCaching,
      embeddingCacheSize: this.embeddingManager.getCacheSize(),
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up Semantic Search Engine');
    
    await this.embeddingManager.cleanup();
    await this.performanceOptimizer.cleanup();
    
    this.embeddingPipeline = null;
    this.fuseIndex = null;
    this.documents = [];
    this.isInitialized = false;
  }

  // Private methods

  private initializeFuseIndex(): void {
    this.fuseIndex = new Fuse([], {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'content', weight: 0.6 },
        { name: 'category', weight: 0.2 },
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }

  private updateFuseIndex(documents: SearchResult[]): void {
    if (this.fuseIndex) {
      this.fuseIndex.setCollection(documents);
    }
  }

  private performFuzzySearch(query: string, _filters?: SearchFilters): SearchResult[] {
    if (!this.fuseIndex) {
      return [];
    }

    const results = this.fuseIndex.search(query);
    return results
      .map(result => ({
        ...result.item,
        confidence_score: Math.max(0, 1 - (result.score || 0)), // Convert Fuse score to confidence
      }))
      .filter(result => result.confidence_score >= this.config.minSimilarityThreshold);
  }

  private applyFilters(results: SearchResult[], _filters?: SearchFilters): SearchResult[] {
    if (!_filters) return results;

    return results.filter(result => {
      // Category filter
      if (_filters.categories && _filters.categories.length > 0) {
        if (!result.category || !_filters.categories.includes(result.category)) {
          return false;
        }
      }

      // Source type filter
      if (_filters.source_types && _filters.source_types.length > 0) {
        if (!_filters.source_types.includes(result.source_type)) {
          return false;
        }
      }

      // Age filter
      if (_filters.max_age_days !== undefined) {
        const resultDate = new Date(result.last_updated);
        const maxAge = new Date(Date.now() - _filters.max_age_days * 24 * 60 * 60 * 1000);
        if (resultDate < maxAge) {
          return false;
        }
      }

      // Confidence threshold filter
      if (_filters.confidence_threshold !== undefined) {
        if (result.confidence_score < _filters.confidence_threshold) {
          return false;
        }
      }

      return true;
    });
  }

  private constructRunbookQuery(
    alertType: string,
    severity: string,
    affectedSystems: string[],
    context?: Record<string, any>
  ): string {
    const queryParts = [
      alertType,
      severity,
      ...affectedSystems,
    ];

    if (context) {
      queryParts.push(...Object.values(context).map(v => String(v)));
    }

    return queryParts.join(' ');
  }

  private async warmupSearchCache(): Promise<void> {
    if (this.documents.length === 0) return;

    const commonQueries = [
      'disk space',
      'memory usage',
      'cpu load',
      'network issue',
      'database connection',
      'service restart',
      'error log',
      'performance issue',
    ];

    for (const query of commonQueries) {
      try {
        await this.search(query);
      } catch (error) {
        logger.warn('Failed to warm up cache for query', { query, error });
      }
    }
  }
}