import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';
export class EmbeddingManager {
    pipeline = null;
    embeddings = new Map();
    contentHashCache = new Map();
    metrics;
    config;
    constructor(config) {
        this.config = {
            batchSize: 32,
            embeddingDimension: 384,
            ...config,
        };
        this.metrics = {
            totalEmbeddings: 0,
            cacheHits: 0,
            cacheMisses: 0,
            avgGenerationTime: 0,
            avgSimilarityTime: 0,
            memoryUsageMB: 0,
        };
    }
    async initialize(pipeline) {
        this.pipeline = pipeline;
        logger.info('EmbeddingManager initialized', {
            model: this.config.model,
            maxCacheSize: this.config.maxCacheSize,
            batchSize: this.config.batchSize,
        });
    }
    async indexDocuments(documents) {
        if (!this.pipeline) {
            throw new Error('EmbeddingManager not initialized');
        }
        const startTime = performance.now();
        let newEmbeddings = 0;
        try {
            for (let i = 0; i < documents.length; i += this.config.batchSize) {
                const batch = documents.slice(i, i + this.config.batchSize);
                const batchPromises = batch.map(doc => this.processDocument(doc));
                const results = await Promise.all(batchPromises);
                newEmbeddings += results.filter(Boolean).length;
            }
            const totalTime = performance.now() - startTime;
            const avgTimePerDoc = totalTime / documents.length;
            logger.info('Document indexing completed', {
                totalDocuments: documents.length,
                newEmbeddings,
                cached: documents.length - newEmbeddings,
                totalTime: `${totalTime.toFixed(2)}ms`,
                avgTimePerDoc: `${avgTimePerDoc.toFixed(2)}ms`,
            });
            this.updateMetrics();
        }
        catch (error) {
            logger.error('Failed to index documents', { error });
            throw error;
        }
    }
    async generateEmbedding(text) {
        if (!this.pipeline) {
            throw new Error('EmbeddingManager not initialized');
        }
        const startTime = performance.now();
        try {
            const contentHash = this.generateContentHash(text);
            const cached = this.embeddings.get(contentHash);
            if (cached && this.config.enableCaching) {
                this.metrics.cacheHits++;
                return cached.embedding;
            }
            const result = await this.pipeline(text, {
                pooling: 'mean',
                normalize: true,
            });
            const embedding = Array.from(result.data);
            if (embedding.length !== this.config.embeddingDimension) {
                logger.warn('Unexpected embedding dimension', {
                    expected: this.config.embeddingDimension,
                    actual: embedding.length,
                });
            }
            if (this.config.enableCaching) {
                this.cacheEmbedding(contentHash, embedding, contentHash);
            }
            const generationTime = performance.now() - startTime;
            this.updateGenerationMetrics(generationTime);
            this.metrics.cacheMisses++;
            return embedding;
        }
        catch (error) {
            logger.error('Failed to generate embedding', { error, textLength: text.length });
            throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async calculateSimilarities(queryEmbedding) {
        const startTime = performance.now();
        const similarities = new Map();
        try {
            for (const [documentId, docEmbedding] of this.embeddings.entries()) {
                const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding.embedding);
                similarities.set(documentId, similarity);
            }
            const calculationTime = performance.now() - startTime;
            this.updateSimilarityMetrics(calculationTime);
            logger.debug('Similarity calculation completed', {
                queryEmbeddingDim: queryEmbedding.length,
                documentCount: similarities.size,
                calculationTime: `${calculationTime.toFixed(2)}ms`,
            });
            return similarities;
        }
        catch (error) {
            logger.error('Failed to calculate similarities', { error });
            throw new Error(`Similarity calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getDocumentEmbedding(documentId) {
        const embedding = this.embeddings.get(documentId);
        return embedding ? embedding.embedding : null;
    }
    hasDocumentEmbedding(documentId, contentHash) {
        const embedding = this.embeddings.get(documentId);
        if (!embedding)
            return false;
        if (contentHash && embedding.contentHash !== contentHash) {
            return false;
        }
        return true;
    }
    removeDocumentEmbedding(documentId) {
        return this.embeddings.delete(documentId);
    }
    getCacheSize() {
        return this.embeddings.size;
    }
    getMetrics() {
        this.updateMetrics();
        return { ...this.metrics };
    }
    clearCache() {
        this.embeddings.clear();
        this.contentHashCache.clear();
        this.metrics.totalEmbeddings = 0;
        this.metrics.cacheHits = 0;
        this.metrics.cacheMisses = 0;
        logger.info('Embedding cache cleared');
    }
    async cleanup() {
        this.clearCache();
        this.pipeline = null;
        logger.info('EmbeddingManager cleaned up');
    }
    async processDocument(document) {
        try {
            const contentHash = this.generateContentHash(document.content);
            if (this.hasDocumentEmbedding(document.id, contentHash)) {
                this.metrics.cacheHits++;
                return false;
            }
            const embedding = await this.generateEmbedding(document.content);
            this.cacheEmbedding(document.id, embedding, contentHash);
            this.metrics.cacheMisses++;
            return true;
        }
        catch (error) {
            logger.error('Failed to process document', {
                documentId: document.id,
                error,
            });
            return false;
        }
    }
    cacheEmbedding(documentId, embedding, contentHash) {
        if (this.embeddings.size >= this.config.maxCacheSize) {
            this.evictOldestEmbedding();
        }
        const documentEmbedding = {
            documentId,
            embedding,
            timestamp: Date.now(),
            contentHash,
        };
        this.embeddings.set(documentId, documentEmbedding);
        this.contentHashCache.set(contentHash, documentId);
    }
    evictOldestEmbedding() {
        let oldestTime = Date.now();
        let oldestId = '';
        for (const [id, embedding] of this.embeddings.entries()) {
            if (embedding.timestamp < oldestTime) {
                oldestTime = embedding.timestamp;
                oldestId = id;
            }
        }
        if (oldestId) {
            const embedding = this.embeddings.get(oldestId);
            if (embedding) {
                this.contentHashCache.delete(embedding.contentHash);
            }
            this.embeddings.delete(oldestId);
            logger.debug('Evicted oldest embedding from cache', { documentId: oldestId });
        }
    }
    generateContentHash(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same dimension');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            const a = vecA[i] ?? 0;
            const b = vecB[i] ?? 0;
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    updateGenerationMetrics(generationTime) {
        const currentAvg = this.metrics.avgGenerationTime;
        const count = this.metrics.totalEmbeddings + 1;
        this.metrics.avgGenerationTime = (currentAvg * this.metrics.totalEmbeddings + generationTime) / count;
        this.metrics.totalEmbeddings = count;
    }
    updateSimilarityMetrics(similarityTime) {
        if (this.metrics.avgSimilarityTime === 0) {
            this.metrics.avgSimilarityTime = similarityTime;
        }
        else {
            this.metrics.avgSimilarityTime = (this.metrics.avgSimilarityTime + similarityTime) / 2;
        }
    }
    updateMetrics() {
        const embeddingSize = this.config.embeddingDimension * 8;
        const metadataSize = 100;
        const totalSize = this.embeddings.size * (embeddingSize + metadataSize);
        this.metrics.memoryUsageMB = totalSize / (1024 * 1024);
    }
}
//# sourceMappingURL=embedding-manager.js.map