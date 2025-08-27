/**
 * Query Processing Module Exports - Intelligent query processing system
 *
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 *
 * Centralized exports for the intelligent query processing system that provides
 * intent classification, context enhancement, and search strategy optimization
 * for operational scenarios with sub-50ms processing targets.
 */

// Core query processing components
// export { QueryProcessor } from './query-processor.js';
export { IntentClassifier } from './intent-classifier.js';
// export { ContextEnhancer } from './context-enhancer.js';
export { QueryOptimizer } from './query-optimizer.js';
export { OperationalIntelligence } from './operational-intelligence.js';
export { PerformanceMonitor } from './performance-monitor.js';

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
} from './types.js';

// Re-export search types for convenience
export type { SearchResult, SearchFilters } from '../../types/index.js';
