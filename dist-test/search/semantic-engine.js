import { pipeline, env } from '@xenova/transformers';
import Fuse from 'fuse.js';
import { HybridScoringAlgorithm } from './hybrid-scoring.js';
import { EmbeddingManager } from './embedding-manager.js';
import { SearchPerformanceOptimizer } from './performance-optimizer.js';
import { SearchAnalytics } from './search-analytics.js';
import { logger } from '../utils/logger.js';
env.allowRemoteModels = true;
env.allowLocalModels = true;
export class SemanticSearchEngine {
    embeddingPipeline = null;
    embeddingManager;
    hybridScoring;
    performanceOptimizer;
    analytics;
    fuseIndex = null;
    documents = [];
    isInitialized = false;
    config = {
        model: 'Xenova/all-MiniLM-L6-v2',
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
    constructor(config) {
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
    async initialize() {
        const startTime = performance.now();
        try {
            if (process.env.SKIP_AI_TESTS === 'true') {
                logger.info('Skipping AI model initialization (SKIP_AI_TESTS=true)');
                this.isInitialized = true;
                return;
            }
            logger.info('Initializing Semantic Search Engine...', {
                model: this.config.model,
                caching: this.config.performance.enableCaching,
            });
            this.embeddingPipeline = await pipeline('feature-extraction', this.config.model);
            await this.embeddingManager.initialize(this.embeddingPipeline);
            await this.performanceOptimizer.initialize();
            this.isInitialized = true;
            const initTime = performance.now() - startTime;
            logger.info('Semantic Search Engine initialized successfully', {
                initializationTime: `${initTime.toFixed(2)}ms`,
                model: this.config.model,
            });
            this.analytics.recordInitialization(initTime);
        }
        catch (error) {
            logger.error('Failed to initialize Semantic Search Engine', { error });
            throw new Error(`Semantic Search Engine initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async indexDocuments(documents) {
        if (!this.isInitialized) {
            throw new Error('Semantic Search Engine not initialized');
        }
        const startTime = performance.now();
        try {
            logger.info('Indexing documents for semantic search', {
                documentCount: documents.length,
            });
            this.documents = [...documents];
            if (process.env.SKIP_AI_TESTS !== 'true') {
                await this.embeddingManager.indexDocuments(documents);
            }
            this.updateFuseIndex(documents);
            if (this.config.performance.warmupCache) {
                await this.warmupSearchCache();
            }
            const indexTime = performance.now() - startTime;
            logger.info('Document indexing completed', {
                documentCount: documents.length,
                indexingTime: `${indexTime.toFixed(2)}ms`,
            });
            this.analytics.recordIndexing(documents.length, indexTime);
        }
        catch (error) {
            logger.error('Failed to index documents', { error });
            throw new Error(`Document indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async search(query, filters) {
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
            const cachedResults = await this.performanceOptimizer.getCachedResults(query, filters);
            if (cachedResults) {
                const responseTime = performance.now() - startTime;
                this.analytics.recordSearch(searchId, query, cachedResults.length, responseTime, true);
                return cachedResults;
            }
            if (process.env.SKIP_AI_TESTS === 'true') {
                const fuzzyResults = this.performFuzzySearch(query, filters);
                const filteredResults = this.applyFilters(fuzzyResults, filters);
                const finalResults = filteredResults.slice(0, this.config.maxResults);
                const responseTime = performance.now() - startTime;
                this.analytics.recordSearch(searchId, query, finalResults.length, responseTime, false);
                return finalResults;
            }
            const queryEmbedding = await this.embeddingManager.generateEmbedding(query);
            const semanticScores = await this.embeddingManager.calculateSimilarities(queryEmbedding);
            const fuzzyResults = this.performFuzzySearch(query, filters);
            const hybridResults = await this.hybridScoring.combineResults(query, this.documents, semanticScores, fuzzyResults.map(result => ({ item: result, score: 1 - result.confidence_score })), filters);
            const filteredResults = this.applyFilters(hybridResults, filters);
            const finalResults = filteredResults.slice(0, this.config.maxResults);
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
        }
        catch (error) {
            const responseTime = performance.now() - startTime;
            logger.error('Semantic search failed', { searchId, error, responseTime });
            const fallbackResults = this.performFuzzySearch(query, filters);
            this.analytics.recordSearchError(searchId, query, error, responseTime);
            return fallbackResults;
        }
    }
    async searchRunbooks(alertType, severity, affectedSystems, context) {
        const searchQuery = this.constructRunbookQuery(alertType, severity, affectedSystems, context);
        const filters = {
            categories: ['runbook'],
        };
        const results = await this.search(searchQuery, filters);
        return results
            .filter(result => result.metadata?.runbook_data)
            .map(result => result.metadata.runbook_data);
    }
    getPerformanceMetrics() {
        return {
            analytics: this.analytics.getMetrics(),
            cache: this.performanceOptimizer.getCacheMetrics(),
            embeddings: this.embeddingManager.getMetrics(),
        };
    }
    getStatus() {
        return {
            initialized: this.isInitialized,
            documentCount: this.documents.length,
            model: this.config.model,
            cacheEnabled: this.config.performance.enableCaching,
            embeddingCacheSize: process.env.SKIP_AI_TESTS === 'true' ? this.documents.length : this.embeddingManager.getCacheSize(),
        };
    }
    async cleanup() {
        logger.info('Cleaning up Semantic Search Engine');
        await this.embeddingManager.cleanup();
        await this.performanceOptimizer.cleanup();
        this.embeddingPipeline = null;
        this.fuseIndex = null;
        this.documents = [];
        this.isInitialized = false;
    }
    initializeFuseIndex() {
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
    updateFuseIndex(documents) {
        if (this.fuseIndex) {
            this.fuseIndex.setCollection(documents);
        }
    }
    performFuzzySearch(query, _filters) {
        if (!this.fuseIndex) {
            return [];
        }
        const results = this.fuseIndex.search(query);
        return results
            .map(result => ({
            ...result.item,
            confidence_score: Math.max(0, 1 - (result.score || 0)),
        }))
            .filter(result => result.confidence_score >= this.config.minSimilarityThreshold);
    }
    applyFilters(results, _filters) {
        if (!_filters)
            return results;
        return results.filter(result => {
            if (_filters.categories && _filters.categories.length > 0) {
                if (!result.category || !_filters.categories.includes(result.category)) {
                    return false;
                }
            }
            if (_filters.source_types && _filters.source_types.length > 0) {
                if (!_filters.source_types.includes(result.source_type)) {
                    return false;
                }
            }
            if (_filters.max_age_days !== undefined) {
                const resultDate = new Date(result.last_updated);
                const maxAge = new Date(Date.now() - _filters.max_age_days * 24 * 60 * 60 * 1000);
                if (resultDate < maxAge) {
                    return false;
                }
            }
            if (_filters.confidence_threshold !== undefined) {
                if (result.confidence_score < _filters.confidence_threshold) {
                    return false;
                }
            }
            return true;
        });
    }
    constructRunbookQuery(alertType, severity, affectedSystems, context) {
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
    async warmupSearchCache() {
        if (this.documents.length === 0)
            return;
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
            }
            catch (error) {
                logger.warn('Failed to warm up cache for query', { query, error });
            }
        }
    }
}
//# sourceMappingURL=semantic-engine.js.map