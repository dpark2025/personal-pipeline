import { SourceAdapter } from '../adapters/base.js';
import { SemanticSearchEngine } from './semantic-engine.js';
import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';
export class SemanticEnhancedAdapter extends SourceAdapter {
    baseAdapter;
    semanticEngine = null;
    semanticAdapterConfig;
    documentsIndexed = false;
    constructor(baseAdapter, config) {
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
    async initialize() {
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
            }
            catch (error) {
                logger.error('Failed to initialize semantic search, falling back to base adapter', { error });
                this.semanticEngine = null;
            }
        }
    }
    async search(query, filters) {
        const startTime = performance.now();
        try {
            if (this.semanticEngine && this.documentsIndexed) {
                logger.debug('Using semantic search for query', { query: query.substring(0, 50) });
                const semanticResults = await this.semanticEngine.search(query, filters);
                const responseTime = performance.now() - startTime;
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
        }
        catch (error) {
            logger.warn('Semantic search failed, falling back to base adapter', { error });
        }
        if (this.semanticAdapterConfig.enableFallback) {
            logger.debug('Using fallback search for query', { query: query.substring(0, 50) });
            const fallbackResults = await this.baseAdapter.search(query, filters);
            const responseTime = performance.now() - startTime;
            fallbackResults.forEach(result => {
                result.retrieval_time_ms = responseTime;
            });
            return fallbackResults;
        }
        throw new Error('No search method available');
    }
    async searchRunbooks(alertType, severity, affectedSystems, context) {
        try {
            if (this.semanticEngine && this.documentsIndexed) {
                return await this.semanticEngine.searchRunbooks(alertType, severity, affectedSystems, context);
            }
        }
        catch (error) {
            logger.warn('Semantic runbook search failed, falling back to base adapter', { error });
        }
        if (this.semanticAdapterConfig.enableFallback) {
            return await this.baseAdapter.searchRunbooks(alertType, severity, affectedSystems, context);
        }
        throw new Error('No runbook search method available');
    }
    async getDocument(id) {
        return await this.baseAdapter.getDocument(id);
    }
    async healthCheck() {
        const baseHealth = await this.baseAdapter.healthCheck();
        const semanticHealth = this.semanticEngine ? {
            semantic_search_enabled: true,
            semantic_status: this.semanticEngine.getStatus(),
            documents_indexed: this.documentsIndexed,
            performance_metrics: this.semanticEngine.getPerformanceMetrics(),
        } : {
            semantic_search_enabled: false,
            reason: 'Semantic search not initialized',
        };
        return {
            ...baseHealth,
            semantic_enhancement: semanticHealth,
        };
    }
    async refreshIndex(force) {
        const baseRefreshSuccess = await this.baseAdapter.refreshIndex(force);
        if (baseRefreshSuccess && this.semanticEngine) {
            try {
                await this.indexDocumentsForSemantic();
                logger.info('Semantic index refreshed successfully');
            }
            catch (error) {
                logger.error('Failed to refresh semantic index', { error });
                return false;
            }
        }
        return baseRefreshSuccess;
    }
    async getMetadata() {
        const baseMetadata = await this.baseAdapter.getMetadata();
        const semanticMetadata = this.semanticEngine ? {
            semantic_search_enabled: true,
            semantic_cache_size: this.semanticEngine.getStatus().embeddingCacheSize,
            semantic_model: this.semanticEngine.getStatus().model,
            performance_metrics: this.semanticEngine.getPerformanceMetrics(),
        } : {
            semantic_search_enabled: false,
        };
        return {
            ...baseMetadata,
            semantic_enhancement: semanticMetadata,
        };
    }
    configure(config) {
        this.baseAdapter.configure(config);
        if (config.semantic_config) {
            this.semanticAdapterConfig = { ...this.semanticAdapterConfig, ...config.semantic_config };
            logger.info('Semantic configuration updated', { config: this.semanticAdapterConfig });
        }
    }
    getConfig() {
        return {
            base_config: this.baseAdapter.getConfig(),
            semantic_config: this.semanticAdapterConfig,
        };
    }
    isSemanticReady() {
        return this.semanticEngine !== null && this.documentsIndexed;
    }
    isReady() {
        return this.baseAdapter.isReady();
    }
    async cleanup() {
        if (this.semanticEngine) {
            await this.semanticEngine.cleanup();
        }
        await this.baseAdapter.cleanup();
    }
    async indexDocumentsForSemantic() {
        if (!this.semanticEngine) {
            throw new Error('Semantic engine not initialized');
        }
        try {
            logger.info('Starting semantic indexing of documents');
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
        }
        catch (error) {
            logger.error('Failed to index documents for semantic search', { error });
            this.documentsIndexed = false;
            throw error;
        }
    }
    async getAllDocumentsFromBase() {
        try {
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
            const allResults = [];
            const seenIds = new Set();
            for (const term of broadSearchTerms) {
                try {
                    const results = await this.baseAdapter.search(term);
                    for (const result of results) {
                        if (!seenIds.has(result.id)) {
                            seenIds.add(result.id);
                            allResults.push(result);
                        }
                    }
                }
                catch (error) {
                    logger.debug('Search term failed during document collection', { term, error });
                }
            }
            logger.debug('Collected documents for semantic indexing', {
                uniqueDocuments: allResults.length,
                totalSearches: broadSearchTerms.length,
            });
            return allResults;
        }
        catch (error) {
            logger.error('Failed to collect documents from base adapter', { error });
            return [];
        }
    }
}
export function createSemanticEnhancedAdapter(baseAdapter, config) {
    return new SemanticEnhancedAdapter(baseAdapter, config);
}
export async function enhanceAdapterWithSemantic(adapter, config) {
    const enhancedAdapter = new SemanticEnhancedAdapter(adapter, config);
    await enhancedAdapter.initialize();
    return enhancedAdapter;
}
//# sourceMappingURL=semantic-integration.js.map