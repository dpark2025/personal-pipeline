/**
 * Query Processing Types - Intelligent query analysis and enhancement
 *
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 *
 * Type definitions for intelligent query processing, intent classification,
 * and context-aware search enhancement for operational scenarios.
 */

import { SearchFilters } from '../../types/index.js';

/**
 * User intent types for operational scenarios
 */
export const enum IntentType {
  FIND_RUNBOOK = 'FIND_RUNBOOK', // "How to handle disk space alerts"
  GET_PROCEDURE = 'GET_PROCEDURE', // "Steps to restart database service"
  ESCALATION_PATH = 'ESCALATION_PATH', // "Who to contact for critical memory issues"
  TROUBLESHOOT = 'TROUBLESHOOT', // "Debug network connectivity problems"
  EMERGENCY_RESPONSE = 'EMERGENCY_RESPONSE', // "Immediate actions for service outage"
  GENERAL_SEARCH = 'GENERAL_SEARCH', // General documentation search
  STATUS_CHECK = 'STATUS_CHECK', // "Check system health status"
  CONFIGURATION = 'CONFIGURATION', // "How to configure database settings"
}

/**
 * Operational context for query enhancement
 */
export interface QueryContext {
  /** Alert severity level */
  severity?: 'low' | 'medium' | 'high' | 'critical';

  /** Affected systems or services */
  systems?: string[];

  /** Alert type or category */
  alertType?: string;

  /** Time sensitivity indicator */
  urgent?: boolean;

  /** User role for context-appropriate results */
  userRole?: 'operator' | 'engineer' | 'manager' | 'on_call';

  /** Business context */
  businessHours?: boolean;

  /** Previous context from conversation */
  conversationHistory?: string[];

  /** Additional metadata */
  metadata?: Record<string, any> | undefined;
}

/**
 * Intent classification result with confidence
 */
export interface IntentClassification {
  /** Primary identified intent */
  intent: IntentType;

  /** Confidence score (0.0-1.0) */
  confidence: number;

  /** Secondary possible intents */
  alternativeIntents?:
    | Array<{
        intent: IntentType;
        confidence: number;
      }>
    | undefined;

  /** Extracted entities from query */
  entities: {
    systems?: string[];
    severity?: string;
    alertType?: string;
    actions?: string[];
    timeContext?: string;
  };

  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Enhanced query with context and expansions
 */
export interface EnhancedQuery {
  /** Original user query */
  originalQuery: string;

  /** Enhanced query with context */
  enhancedQuery: string;

  /** Query expansions and synonyms */
  expansions: string[];

  /** Context-specific terms added */
  contextTerms: string[];

  /** Operational keywords identified */
  operationalKeywords: string[];

  /** Boost terms for scoring */
  boostTerms?: Record<string, number> | undefined;

  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Search strategy optimization
 */
export interface SearchStrategy {
  /** Search approach to use */
  approach: 'semantic_primary' | 'fuzzy_primary' | 'hybrid_balanced' | 'exact_match';

  /** Scoring weight adjustments */
  scoringWeights: {
    semantic: number;
    fuzzy: number;
    metadata: number;
    recency: number;
  };

  /** Result count recommendations */
  resultLimits: {
    target: number;
    maximum: number;
  };

  /** Filter suggestions */
  recommendedFilters?: SearchFilters | undefined;

  /** Time constraints for search */
  timeConstraints: {
    targetResponseTime: number; // milliseconds
    maxResponseTime: number; // milliseconds
  };
}

/**
 * Complete processed query result
 */
export interface ProcessedQuery {
  /** Intent classification */
  intent: IntentClassification;

  /** Enhanced query */
  enhancedQuery: EnhancedQuery;

  /** Optimized search strategy */
  strategy: SearchStrategy;

  /** Applied context */
  context?: QueryContext | undefined;

  /** Total processing time */
  totalProcessingTime: number;

  /** Processing stages breakdown */
  timingBreakdown: {
    intentClassification: number;
    queryEnhancement: number;
    strategyOptimization: number;
  };
}

/**
 * Operational intelligence patterns
 */
export interface OperationalPattern {
  /** Pattern identifier */
  id: string;

  /** Pattern name */
  name: string;

  /** Intent types this pattern applies to */
  applicableIntents: IntentType[];

  /** Keywords that trigger this pattern */
  triggerKeywords: string[];

  /** Context enhancements */
  contextEnhancements: {
    requiredSystems?: string[];
    impliedSeverity?: string;
    suggestedActions?: string[];
    escalationThreshold?: number;
  };

  /** Search strategy adjustments */
  strategyAdjustments: {
    scoringBoosts?: Record<string, number>;
    filterPreferences?: SearchFilters;
    resultPriorities?: string[];
  };
}

/**
 * Query processing performance metrics
 */
export interface QueryProcessingMetrics {
  /** Total queries processed */
  totalQueries: number;

  /** Intent classification accuracy */
  intentAccuracy: number;

  /** Average processing time */
  averageProcessingTime: number;

  /** Processing time percentiles */
  processingTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };

  /** Intent distribution */
  intentDistribution: Record<IntentType, number>;

  /** Enhancement effectiveness */
  enhancementMetrics: {
    queriesEnhanced: number;
    averageExpansions: number;
    contextTermsAdded: number;
  };

  /** Performance targets */
  performanceTargets: {
    targetProcessingTime: number;
    targetAccuracy: number;
    achievedProcessingTime: number;
    achievedAccuracy: number;
  };
}

/**
 * Configuration for query processing
 */
export interface QueryProcessingConfig {
  /** Intent classification settings */
  intentClassification: {
    confidenceThreshold: number;
    enableMultiIntent: boolean;
    fallbackToGeneral: boolean;
  };

  /** Query enhancement settings */
  queryEnhancement: {
    maxExpansions: number;
    enableSynonyms: boolean;
    enableContextInjection: boolean;
    boostOperationalTerms: boolean;
  };

  /** Performance settings */
  performance: {
    targetProcessingTime: number;
    enableCaching: boolean;
    enableParallelProcessing: boolean;
  };

  /** Operational intelligence */
  operationalIntelligence: {
    enablePatternMatching: boolean;
    enableContextPrediction: boolean;
    enableStrategyOptimization: boolean;
  };
}
