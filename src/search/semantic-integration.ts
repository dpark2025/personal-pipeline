/**
 * Semantic Search Integration Layer - PersonalPipelineServer compatibility
 *
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 *
 * Integration layer that seamlessly enhances existing source adapters
 * with semantic search capabilities while maintaining full backward compatibility.
 */

import { SourceAdapter } from '../adapters/base.js';
import { SearchResult, SearchFilters, Runbook } from '../types/index.js';
import { SemanticSearchEngine } from './semantic-engine.js';
import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';

interface SemanticAdapterConfig {
  /** Enable semantic search enhancement */
  enableSemanticSearch: boolean;
  /** Fallback to fuzzy search on semantic failures */
  enableFallback: boolean;
  /** Minimum confidence threshold for semantic results */
  semanticThreshold: number;
  /** Weight for combining semantic and fuzzy results */
  semanticWeight: number;
  /** Maximum results to return */
  maxResults: number;
}

/**
 * Enhanced source adapter with semantic search capabilities
 */
export class SemanticEnhancedAdapter extends SourceAdapter {
  private baseAdapter: SourceAdapter;
  private semanticEngine: SemanticSearchEngine | null = null;
  private semanticAdapterConfig: SemanticAdapterConfig;
  private documentsIndexed = false;

  constructor(baseAdapter: SourceAdapter, config?: Partial<SemanticAdapterConfig>) {
    super(baseAdapter.getConfig());
    this.baseAdapter = baseAdapter;
    this.semanticAdapterConfig = {
      enableSemanticSearch: true,
      enableFallback: true,
      semanticThreshold: 0.3,
      semanticWeight: 0.7,
      maxResults: 50,
      ...config,
    };

    logger.info('SemanticEnhancedAdapter created', {
      baseAdapterType: baseAdapter.constructor.name,
      semanticEnabled: this.semanticAdapterConfig.enableSemanticSearch,
    });
  }

  /**
   * Initialize semantic enhancement
   */
  async initialize(): Promise<void> {
    // Initialize base adapter first
    await this.baseAdapter.initialize();

    if (this.semanticAdapterConfig.enableSemanticSearch) {
      try {
        this.semanticEngine = new SemanticSearchEngine({
          minSimilarityThreshold: this.semanticAdapterConfig.semanticThreshold,
          maxResults: this.semanticAdapterConfig.maxResults,
          scoringWeights: {
            semantic: this.semanticAdapterConfig.semanticWeight,
            fuzzy: 1 - this.semanticAdapterConfig.semanticWeight,
            metadata: 0.1,
          },
        });

        await this.semanticEngine.initialize();
        await this.indexDocumentsForSemantic();

        logger.info('Semantic search enhancement initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize semantic search, falling back to base adapter', {
          error,
        });
        this.semanticEngine = null;
      }
    }
  }

  /**
   * Enhanced search with semantic capabilities
   */
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const startTime = performance.now();

    try {
      // If semantic search is available and enabled, use it
      if (this.semanticEngine && this.documentsIndexed) {
        logger.debug('Using semantic search for query', { query: query.substring(0, 50) });

        const semanticResults = await this.semanticEngine.search(query, filters);
        const responseTime = performance.now() - startTime;

        // Update retrieval time for all results
        semanticResults.forEach(result => {
          result.retrieval_time_ms = responseTime;
        });

        logger.debug('Semantic search completed', {
          query: query.substring(0, 50),
          resultCount: semanticResults.length,
          responseTime: `${responseTime.toFixed(2)}ms`,
        });

        return semanticResults;
      }
    } catch (error) {
      logger.warn('Semantic search failed, falling back to base adapter', { error });
    }

    // Fallback to base adapter search
    if (this.semanticAdapterConfig.enableFallback) {
      logger.debug('Using fallback search for query', { query: query.substring(0, 50) });

      const fallbackResults = await this.baseAdapter.search(query, filters);
      const responseTime = performance.now() - startTime;

      // Update retrieval time for all results
      fallbackResults.forEach(result => {
        result.retrieval_time_ms = responseTime;
      });

      return fallbackResults;
    }

    throw new Error('No search method available');
  }

  /**
   * Enhanced runbook search with semantic understanding
   */
  async searchRunbooks(
    alertType: string,
    severity: string,
    affectedSystems: string[],
    context?: Record<string, any>
  ): Promise<Runbook[]> {
    try {
      // Try semantic runbook search first
      if (this.semanticEngine && this.documentsIndexed) {
        return await this.semanticEngine.searchRunbooks(
          alertType,
          severity,
          affectedSystems,
          context
        );
      }
    } catch (error) {
      logger.warn('Semantic runbook search failed, falling back to base adapter', { error });
    }

    // Fallback to base adapter
    if (this.semanticAdapterConfig.enableFallback) {
      return await this.baseAdapter.searchRunbooks(alertType, severity, affectedSystems, context);
    }

    throw new Error('No runbook search method available');
  }

  /**
   * Get specific document by ID
   */
  async getDocument(id: string): Promise<SearchResult | null> {
    return await this.baseAdapter.getDocument(id);
  }

  /**
   * Health check for both base adapter and semantic engine
   */
  async healthCheck(): Promise<any> {
    const baseHealth = await this.baseAdapter.healthCheck();

    const semanticHealth = this.semanticEngine
      ? {
          semantic_search_enabled: true,
          semantic_status: this.semanticEngine.getStatus(),
          documents_indexed: this.documentsIndexed,
          performance_metrics: this.semanticEngine.getPerformanceMetrics(),
        }
      : {
          semantic_search_enabled: false,
          reason: 'Semantic search not initialized',
        };

    return {
      ...baseHealth,
      semantic_enhancement: semanticHealth,
    };
  }

  /**
   * Refresh both base index and semantic index
   */
  async refreshIndex(force?: boolean): Promise<boolean> {
    const baseRefreshSuccess = await this.baseAdapter.refreshIndex(force);

    if (baseRefreshSuccess && this.semanticEngine) {
      try {
        await this.indexDocumentsForSemantic();
        logger.info('Semantic index refreshed successfully');
      } catch (error) {
        logger.error('Failed to refresh semantic index', { error });
        return false;
      }
    }

    return baseRefreshSuccess;
  }

  /**
   * Get enhanced metadata including semantic capabilities
   */
  async getMetadata(): Promise<any> {
    const baseMetadata = await this.baseAdapter.getMetadata();

    const semanticMetadata = this.semanticEngine
      ? {
          semantic_search_enabled: true,
          semantic_cache_size: this.semanticEngine.getStatus().embeddingCacheSize,
          semantic_model: this.semanticEngine.getStatus().model,
          performance_metrics: this.semanticEngine.getPerformanceMetrics(),
        }
      : {
          semantic_search_enabled: false,
        };

    return {
      ...baseMetadata,
      semantic_enhancement: semanticMetadata,
    };
  }

  /**
   * Configure both base adapter and semantic settings
   */
  override configure(config: any): void {
    this.baseAdapter.configure(config);

    if (config.semantic_config) {
      this.semanticAdapterConfig = { ...this.semanticAdapterConfig, ...config.semantic_config };
      logger.info('Semantic configuration updated', { config: this.semanticAdapterConfig });
    }
  }

  /**
   * Override SourceAdapter methods to delegate to base adapter
   */
  override getConfig(): any {
    return {
      base_config: this.baseAdapter.getConfig(),
      semantic_config: this.semanticAdapterConfig,
    };
  }

  /**
   * Check if semantic enhancement is ready
   */
  isSemanticReady(): boolean {
    return this.semanticEngine !== null && this.documentsIndexed;
  }

  /**
   * Check if adapter is ready
   */
  override isReady(): boolean {
    return this.baseAdapter.isReady();
  }

  /**
   * Cleanup resources
   */
  override async cleanup(): Promise<void> {
    if (this.semanticEngine) {
      await this.semanticEngine.cleanup();
    }
    await this.baseAdapter.cleanup();
  }

  // Private methods

  /**
   * Index all documents from base adapter for semantic search
   */
  private async indexDocumentsForSemantic(): Promise<void> {
    if (!this.semanticEngine) {
      throw new Error('Semantic engine not initialized');
    }

    try {
      logger.info('Starting semantic indexing of documents');

      // Get all documents from base adapter
      // Note: This is a simplified approach. In production, you might want to implement
      // a more efficient way to get all documents from the base adapter
      const allDocuments = await this.getAllDocumentsFromBase();

      if (allDocuments.length === 0) {
        logger.warn('No documents found in base adapter for semantic indexing');
        this.documentsIndexed = false;
        return;
      }

      await this.semanticEngine.indexDocuments(allDocuments);
      this.documentsIndexed = true;

      logger.info('Semantic indexing completed successfully', {
        documentCount: allDocuments.length,
      });
    } catch (error) {
      logger.error('Failed to index documents for semantic search', { error });
      this.documentsIndexed = false;
      throw error;
    }
  }

  /**
   * Get all documents from base adapter
   * This is a workaround since base adapter doesn't have a getAllDocuments method
   */
  private async getAllDocumentsFromBase(): Promise<SearchResult[]> {
    try {
      // Use a broad search to get most documents
      const broadSearchTerms = [
        '*',
        'documentation',
        'runbook',
        'procedure',
        'guide',
        'help',
        'troubleshoot',
        'error',
        'issue',
        'problem',
        'solution',
      ];

      const allResults: SearchResult[] = [];
      const seenIds = new Set<string>();

      for (const term of broadSearchTerms) {
        try {
          const results = await this.baseAdapter.search(term);
          for (const result of results) {
            if (!seenIds.has(result.id)) {
              seenIds.add(result.id);
              allResults.push(result);
            }
          }
        } catch (error) {
          logger.debug('Search term failed during document collection', { term, error });
        }
      }

      logger.debug('Collected documents for semantic indexing', {
        uniqueDocuments: allResults.length,
        totalSearches: broadSearchTerms.length,
      });

      return allResults;
    } catch (error) {
      logger.error('Failed to collect documents from base adapter', { error });
      return [];
    }
  }
}

/**
 * Factory function to create semantic-enhanced adapters
 */
export function createSemanticEnhancedAdapter(
  baseAdapter: SourceAdapter,
  config?: Partial<SemanticAdapterConfig>
): SemanticEnhancedAdapter {
  return new SemanticEnhancedAdapter(baseAdapter, config);
}

/**
 * Utility function to enhance existing adapter registry
 */
export async function enhanceAdapterWithSemantic(
  adapter: SourceAdapter,
  config?: Partial<SemanticAdapterConfig>
): Promise<SemanticEnhancedAdapter> {
  const enhancedAdapter = new SemanticEnhancedAdapter(adapter, config);
  await enhancedAdapter.initialize();
  return enhancedAdapter;
}
