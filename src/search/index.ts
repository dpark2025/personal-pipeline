/**
 * Search Module Exports - Production-grade intelligent search system
 * 
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 * 
 * Centralized exports for the intelligent search system including semantic search,
 * query processing, and contextual understanding components.
 */

// Main intelligent search engine with query processing
export { IntelligentSearchEngine } from './intelligent-search-engine.js';

// Core semantic search components
export { SemanticSearchEngine } from './semantic-engine.js';
export { EmbeddingManager } from './embedding-manager.js';
export { HybridScoringAlgorithm } from './hybrid-scoring.js';
export { SearchPerformanceOptimizer } from './performance-optimizer.js';
export { SearchAnalytics } from './search-analytics.js';

// Query processing components
export {
  // QueryProcessor,
  IntentClassifier,
  // ContextEnhancer,
  QueryOptimizer,
  OperationalIntelligence,
  PerformanceMonitor,
} from './query-processing/index.js';

// Type definitions
export type {
  IntentType,
  QueryContext,
  IntentClassification,
  EnhancedQuery,
  SearchStrategy,
  ProcessedQuery,
  OperationalPattern,
  QueryProcessingMetrics,
  QueryProcessingConfig,
} from './query-processing/index.js';

// Re-export types from the main types module for convenience
export type { SearchResult, SearchFilters, Runbook } from '../types/index.js';