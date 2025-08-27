/**
 * Embedding Manager - Document embedding generation and storage
 *
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 *
 * Manages document embedding generation, storage, and similarity calculations
 * with efficient caching and batch processing for optimal performance.
 */

import { Pipeline } from '@xenova/transformers';
import { SearchResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';

interface EmbeddingManagerConfig {
  model: string;
  maxCacheSize: number;
  enableCaching: boolean;
  batchSize?: number;
  embeddingDimension?: number;
}

interface DocumentEmbedding {
  documentId: string;
  embedding: number[];
  timestamp: number;
  contentHash: string;
}

interface EmbeddingMetrics {
  totalEmbeddings: number;
  cacheHits: number;
  cacheMisses: number;
  avgGenerationTime: number;
  avgSimilarityTime: number;
  memoryUsageMB: number;
}

/**
 * High-performance embedding manager with intelligent caching
 */
export class EmbeddingManager {
  private pipeline: Pipeline | null = null;
  private embeddings: Map<string, DocumentEmbedding> = new Map();
  private contentHashCache: Map<string, string> = new Map();
  private metrics: EmbeddingMetrics;
  private config: Required<EmbeddingManagerConfig>;

  constructor(config: EmbeddingManagerConfig) {
    this.config = {
      batchSize: 32,
      embeddingDimension: 384, // all-MiniLM-L6-v2 dimension
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

  /**
   * Initialize the embedding manager with a pipeline
   */
  async initialize(pipeline: Pipeline): Promise<void> {
    this.pipeline = pipeline;
    logger.info('EmbeddingManager initialized', {
      model: this.config.model,
      maxCacheSize: this.config.maxCacheSize,
      batchSize: this.config.batchSize,
    });
  }

  /**
   * Generate embeddings for all documents with batch processing
   */
  async indexDocuments(documents: SearchResult[]): Promise<void> {
    if (!this.pipeline) {
      throw new Error('EmbeddingManager not initialized');
    }

    const startTime = performance.now();
    let newEmbeddings = 0;

    try {
      // Process documents in batches for optimal performance
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
    } catch (error) {
      logger.error('Failed to index documents', { error });
      throw error;
    }
  }

  /**
   * Generate embedding for a single query or document
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.pipeline) {
      throw new Error('EmbeddingManager not initialized');
    }

    const startTime = performance.now();

    try {
      // Check cache first
      const contentHash = this.generateContentHash(text);
      const cached = this.embeddings.get(contentHash);

      if (cached && this.config.enableCaching) {
        this.metrics.cacheHits++;
        return cached.embedding;
      }

      // Generate new embedding
      const result = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert to plain array and ensure correct dimensions
      const embedding = Array.from(result.data) as number[];
      if (embedding.length !== this.config.embeddingDimension) {
        logger.warn('Unexpected embedding dimension', {
          expected: this.config.embeddingDimension,
          actual: embedding.length,
        });
      }

      // Cache the embedding
      if (this.config.enableCaching) {
        this.cacheEmbedding(contentHash, embedding, contentHash);
      }

      const generationTime = performance.now() - startTime;
      this.updateGenerationMetrics(generationTime);
      this.metrics.cacheMisses++;

      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', { error, textLength: text.length });
      throw new Error(
        `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate similarity scores between query embedding and all document embeddings
   */
  async calculateSimilarities(queryEmbedding: number[]): Promise<Map<string, number>> {
    const startTime = performance.now();
    const similarities = new Map<string, number>();

    try {
      // Calculate cosine similarity with all cached embeddings
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
    } catch (error) {
      logger.error('Failed to calculate similarities', { error });
      throw new Error(
        `Similarity calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get embedding for a specific document by ID
   */
  getDocumentEmbedding(documentId: string): number[] | null {
    const embedding = this.embeddings.get(documentId);
    return embedding ? embedding.embedding : null;
  }

  /**
   * Check if document embedding exists and is current
   */
  hasDocumentEmbedding(documentId: string, contentHash?: string): boolean {
    const embedding = this.embeddings.get(documentId);
    if (!embedding) return false;

    if (contentHash && embedding.contentHash !== contentHash) {
      return false; // Content has changed
    }

    return true;
  }

  /**
   * Remove embedding for a document
   */
  removeDocumentEmbedding(documentId: string): boolean {
    return this.embeddings.delete(documentId);
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.embeddings.size;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): EmbeddingMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Clear all embeddings and reset cache
   */
  clearCache(): void {
    this.embeddings.clear();
    this.contentHashCache.clear();
    this.metrics.totalEmbeddings = 0;
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
    logger.info('Embedding cache cleared');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.clearCache();
    this.pipeline = null;
    logger.info('EmbeddingManager cleaned up');
  }

  // Private methods

  private async processDocument(document: SearchResult): Promise<boolean> {
    try {
      const contentHash = this.generateContentHash(document.content);

      // Check if we already have this embedding
      if (this.hasDocumentEmbedding(document.id, contentHash)) {
        this.metrics.cacheHits++;
        return false; // Already cached
      }

      // Generate new embedding
      const embedding = await this.generateEmbedding(document.content);

      // Cache the embedding
      this.cacheEmbedding(document.id, embedding, contentHash);
      this.metrics.cacheMisses++;

      return true; // New embedding generated
    } catch (error) {
      logger.error('Failed to process document', {
        documentId: document.id,
        error,
      });
      return false;
    }
  }

  private cacheEmbedding(documentId: string, embedding: number[], contentHash: string): void {
    // Implement LRU-style cache eviction if needed
    if (this.embeddings.size >= this.config.maxCacheSize) {
      this.evictOldestEmbedding();
    }

    const documentEmbedding: DocumentEmbedding = {
      documentId,
      embedding,
      timestamp: Date.now(),
      contentHash,
    };

    this.embeddings.set(documentId, documentEmbedding);
    this.contentHashCache.set(contentHash, documentId);
  }

  private evictOldestEmbedding(): void {
    let oldestTime = Date.now();
    let oldestId = '';

    // Find the oldest embedding
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

  private generateContentHash(content: string): string {
    // Simple hash function for content - in production, consider using crypto
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
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

    // Avoid division by zero
    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private updateGenerationMetrics(generationTime: number): void {
    const currentAvg = this.metrics.avgGenerationTime;
    const count = this.metrics.totalEmbeddings + 1;
    this.metrics.avgGenerationTime =
      (currentAvg * this.metrics.totalEmbeddings + generationTime) / count;
    this.metrics.totalEmbeddings = count;
  }

  private updateSimilarityMetrics(similarityTime: number): void {
    // Simple running average for similarity calculation time
    if (this.metrics.avgSimilarityTime === 0) {
      this.metrics.avgSimilarityTime = similarityTime;
    } else {
      this.metrics.avgSimilarityTime = (this.metrics.avgSimilarityTime + similarityTime) / 2;
    }
  }

  private updateMetrics(): void {
    // Calculate approximate memory usage
    const embeddingSize = this.config.embeddingDimension * 8; // 8 bytes per float64
    const metadataSize = 100; // Approximate size of metadata per embedding
    const totalSize = this.embeddings.size * (embeddingSize + metadataSize);
    this.metrics.memoryUsageMB = totalSize / (1024 * 1024);
  }
}
