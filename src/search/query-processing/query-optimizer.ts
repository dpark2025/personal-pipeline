/**
 * Query Optimizer - Search strategy optimization based on intent and context
 * 
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 * 
 * Intelligent search strategy optimizer that selects optimal search approaches,
 * scoring weights, and filtering strategies based on query intent, context,
 * and operational requirements with <10ms processing time.
 */

import { 
  IntentType, 
  SearchStrategy, 
  ProcessedQuery, 
  QueryContext,
} from './types.js';
import { SearchFilters } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

interface StrategyRule {
  intent: IntentType;
  conditions: {
    urgency?: boolean;
    severity?: string[];
    systems?: string[];
    confidence?: number;
  };
  strategy: {
    approach: SearchStrategy['approach'];
    scoringWeights: SearchStrategy['scoringWeights'];
    resultLimits: SearchStrategy['resultLimits'];
    timeConstraints: SearchStrategy['timeConstraints'];
    filters?: SearchFilters;
  };
  priority: number;
}

interface QueryOptimizerConfig {
  enableStrategyOptimization: boolean;
  enableAdaptiveWeights: boolean;
  enableTimeConstraints: boolean;
  maxProcessingTime: number;
}

interface OptimizerMetrics {
  totalOptimizations: number;
  strategyDistribution: Record<SearchStrategy['approach'], number>;
  averageProcessingTime: number;
  processingTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  optimizationEffectiveness: {
    urgentQueriesOptimized: number;
    contextBasedOptimizations: number;
    performanceOptimizations: number;
  };
}

/**
 * Production-grade query optimizer for search strategy selection
 */
export class QueryOptimizer {
  private strategyRules: StrategyRule[];
  private metrics: OptimizerMetrics;
  private processingTimes: number[] = [];
  private readonly maxProcessingHistorySize = 1000;

  private readonly config: QueryOptimizerConfig = {
    enableStrategyOptimization: true,
    enableAdaptiveWeights: true,
    enableTimeConstraints: true,
    maxProcessingTime: 10, // 10ms target
  };

  constructor(config?: Partial<QueryOptimizerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.strategyRules = this.initializeStrategyRules();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize the query optimizer
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      logger.info('Initializing Query Optimizer...', {
        strategyRules: this.strategyRules.length,
        adaptiveWeights: this.config.enableAdaptiveWeights,
        targetProcessingTime: `<${this.config.maxProcessingTime}ms`,
      });

      // Sort strategy rules by priority for faster matching
      this.strategyRules.sort((a, b) => b.priority - a.priority);

      const initTime = performance.now() - startTime;
      logger.info('Query Optimizer initialized successfully', {
        initializationTime: `${initTime.toFixed(2)}ms`,
        rulesLoaded: this.strategyRules.length,
      });
    } catch (error) {
      logger.error('Failed to initialize Query Optimizer', { error });
      throw new Error(`Query Optimizer initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize search strategy based on processed query
   */
  optimizeSearchStrategy(processedQuery: ProcessedQuery): SearchStrategy {
    const startTime = performance.now();

    try {
      // Find matching strategy rule
      const rule = this.findBestStrategy(processedQuery);
      
      // Apply adaptive optimizations
      const optimizedStrategy = this.config.enableAdaptiveWeights
        ? this.applyAdaptiveOptimizations(rule.strategy, processedQuery)
        : rule.strategy;

      // Apply time constraints
      if (this.config.enableTimeConstraints) {
        this.applyTimeConstraints(optimizedStrategy, processedQuery);
      }

      const processingTime = performance.now() - startTime;

      // Update metrics
      this.updateMetrics(optimizedStrategy, processedQuery, processingTime);

      // Log performance warning if target not met
      if (processingTime > this.config.maxProcessingTime) {
        logger.warn('Query optimization exceeded target time', {
          targetTime: `${this.config.maxProcessingTime}ms`,
          actualTime: `${processingTime.toFixed(2)}ms`,
          intent: processedQuery.intent.intent,
        });
      }

      logger.debug('Search strategy optimized', {
        intent: processedQuery.intent.intent,
        approach: optimizedStrategy.approach,
        targetTime: `${optimizedStrategy.timeConstraints.targetResponseTime}ms`,
        processingTime: `${processingTime.toFixed(2)}ms`,
      });

      return optimizedStrategy;
    } catch (error) {
      const processingTime = performance.now() - startTime;
      logger.error('Search strategy optimization failed', { error, processingTime });

      // Return fallback strategy
      return this.getFallbackStrategy();
    }
  }

  /**
   * Get optimizer performance metrics
   */
  getMetrics(): OptimizerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get optimizer status
   */
  getStatus(): any {
    return {
      strategyRules: this.strategyRules.length,
      config: this.config,
      metrics: this.metrics,
      recentPerformance: {
        averageProcessingTime: this.calculateAverageProcessingTime(),
        targetMet: this.calculateTargetMetPercentage(),
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.processingTimes = [];
    this.metrics = this.initializeMetrics();
  }

  // Private methods

  private initializeStrategyRules(): StrategyRule[] {
    return [
      // Emergency Response - Fastest possible search
      {
        intent: IntentType.EMERGENCY_RESPONSE,
        conditions: { urgency: true },
        strategy: {
          approach: 'exact_match',
          scoringWeights: {
            semantic: 0.3,
            fuzzy: 0.7,
            metadata: 0.0,
            recency: 0.0,
          },
          resultLimits: { target: 3, maximum: 5 },
          timeConstraints: { targetResponseTime: 50, maxResponseTime: 100 },
          filters: { categories: ['runbook', 'emergency'] },
        },
        priority: 100,
      },

      // Critical Runbook Finding - High precision, fast response
      {
        intent: IntentType.FIND_RUNBOOK,
        conditions: { severity: ['critical', 'high'], confidence: 0.8 },
        strategy: {
          approach: 'semantic_primary',
          scoringWeights: {
            semantic: 0.7,
            fuzzy: 0.2,
            metadata: 0.1,
            recency: 0.0,
          },
          resultLimits: { target: 5, maximum: 10 },
          timeConstraints: { targetResponseTime: 100, maxResponseTime: 200 },
          filters: { categories: ['runbook'], confidence_threshold: 0.7 },
        },
        priority: 90,
      },

      // Standard Runbook Finding - Balanced approach
      {
        intent: IntentType.FIND_RUNBOOK,
        conditions: {},
        strategy: {
          approach: 'hybrid_balanced',
          scoringWeights: {
            semantic: 0.6,
            fuzzy: 0.3,
            metadata: 0.1,
            recency: 0.0,
          },
          resultLimits: { target: 10, maximum: 20 },
          timeConstraints: { targetResponseTime: 150, maxResponseTime: 300 },
          filters: { categories: ['runbook'] },
        },
        priority: 80,
      },

      // Escalation Path - Organizational focus
      {
        intent: IntentType.ESCALATION_PATH,
        conditions: {},
        strategy: {
          approach: 'fuzzy_primary',
          scoringWeights: {
            semantic: 0.4,
            fuzzy: 0.5,
            metadata: 0.1,
            recency: 0.0,
          },
          resultLimits: { target: 5, maximum: 10 },
          timeConstraints: { targetResponseTime: 100, maxResponseTime: 200 },
          filters: { categories: ['escalation', 'contact', 'organization'] },
        },
        priority: 85,
      },

      // Procedure Steps - Step-by-step focus
      {
        intent: IntentType.GET_PROCEDURE,
        conditions: {},
        strategy: {
          approach: 'semantic_primary',
          scoringWeights: {
            semantic: 0.7,
            fuzzy: 0.2,
            metadata: 0.1,
            recency: 0.0,
          },
          resultLimits: { target: 8, maximum: 15 },
          timeConstraints: { targetResponseTime: 150, maxResponseTime: 300 },
          filters: { categories: ['procedure', 'instructions'] },
        },
        priority: 75,
      },

      // Troubleshooting - Comprehensive search
      {
        intent: IntentType.TROUBLESHOOT,
        conditions: {},
        strategy: {
          approach: 'hybrid_balanced',
          scoringWeights: {
            semantic: 0.5,
            fuzzy: 0.4,
            metadata: 0.1,
            recency: 0.0,
          },
          resultLimits: { target: 15, maximum: 30 },
          timeConstraints: { targetResponseTime: 200, maxResponseTime: 400 },
          filters: { categories: ['troubleshooting', 'debugging', 'diagnostics'] },
        },
        priority: 70,
      },

      // Status Check - Quick monitoring info
      {
        intent: IntentType.STATUS_CHECK,
        conditions: {},
        strategy: {
          approach: 'fuzzy_primary',
          scoringWeights: {
            semantic: 0.3,
            fuzzy: 0.6,
            metadata: 0.1,
            recency: 0.0,
          },
          resultLimits: { target: 5, maximum: 10 },
          timeConstraints: { targetResponseTime: 100, maxResponseTime: 200 },
          filters: { categories: ['monitoring', 'status', 'health'] },
        },
        priority: 65,
      },

      // Configuration - Technical documentation
      {
        intent: IntentType.CONFIGURATION,
        conditions: {},
        strategy: {
          approach: 'semantic_primary',
          scoringWeights: {
            semantic: 0.6,
            fuzzy: 0.3,
            metadata: 0.1,
            recency: 0.0,
          },
          resultLimits: { target: 10, maximum: 20 },
          timeConstraints: { targetResponseTime: 200, maxResponseTime: 400 },
          filters: { categories: ['configuration', 'setup', 'installation'] },
        },
        priority: 60,
      },

      // General Search - Broad, comprehensive approach
      {
        intent: IntentType.GENERAL_SEARCH,
        conditions: {},
        strategy: {
          approach: 'hybrid_balanced',
          scoringWeights: {
            semantic: 0.5,
            fuzzy: 0.4,
            metadata: 0.1,
            recency: 0.0,
          },
          resultLimits: { target: 20, maximum: 50 },
          timeConstraints: { targetResponseTime: 250, maxResponseTime: 500 },
        },
        priority: 10,
      },
    ];
  }

  private initializeMetrics(): OptimizerMetrics {
    return {
      totalOptimizations: 0,
      strategyDistribution: {
        'semantic_primary': 0,
        'fuzzy_primary': 0,
        'hybrid_balanced': 0,
        'exact_match': 0,
      },
      averageProcessingTime: 0,
      processingTimePercentiles: { p50: 0, p95: 0, p99: 0 },
      optimizationEffectiveness: {
        urgentQueriesOptimized: 0,
        contextBasedOptimizations: 0,
        performanceOptimizations: 0,
      },
    };
  }

  private findBestStrategy(processedQuery: ProcessedQuery): StrategyRule {
    const { intent, context } = processedQuery;
    
    // Find rules matching the intent
    const candidateRules = this.strategyRules.filter(rule => rule.intent === intent.intent);
    
    // Score each rule based on conditions
    let bestRule = candidateRules[0]; // Default to first match
    let bestScore = 0;

    for (const rule of candidateRules) {
      let score = rule.priority;

      // Check urgency condition
      if (rule.conditions.urgency !== undefined) {
        const isUrgent = context?.urgent || intent.entities.timeContext === 'urgent';
        if (rule.conditions.urgency === isUrgent) {
          score += 20;
        } else {
          continue; // Skip if urgency requirement not met
        }
      }

      // Check severity condition
      if (rule.conditions.severity) {
        const severity = intent.entities.severity || context?.severity;
        if (severity && rule.conditions.severity.includes(severity)) {
          score += 15;
        }
      }

      // Check systems condition
      if (rule.conditions.systems) {
        const systems = intent.entities.systems || context?.systems || [];
        const hasMatchingSystems = rule.conditions.systems.some(sys => 
          systems.includes(sys) || systems.some(s => s.includes(sys))
        );
        if (hasMatchingSystems) {
          score += 10;
        }
      }

      // Check confidence condition
      if (rule.conditions.confidence && intent.confidence >= rule.conditions.confidence) {
        score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestRule = rule;
      }
    }

    return bestRule || this.getDefaultRule(intent.intent);
  }

  private applyAdaptiveOptimizations(
    baseStrategy: StrategyRule['strategy'], 
    processedQuery: ProcessedQuery
  ): SearchStrategy {
    const strategy = JSON.parse(JSON.stringify(baseStrategy)) as SearchStrategy; // Deep copy
    const { intent, enhancedQuery, context } = processedQuery;

    // Adjust based on query complexity
    const queryComplexity = this.calculateQueryComplexity(enhancedQuery);
    if (queryComplexity > 0.8) {
      // Complex queries benefit from semantic search
      strategy.scoringWeights.semantic += 0.1;
      strategy.scoringWeights.fuzzy -= 0.1;
      strategy.timeConstraints.targetResponseTime += 50;
    } else if (queryComplexity < 0.3) {
      // Simple queries can use faster fuzzy search
      strategy.scoringWeights.fuzzy += 0.1;
      strategy.scoringWeights.semantic -= 0.1;
      strategy.timeConstraints.targetResponseTime -= 20;
    }

    // Adjust based on context richness
    const contextRichness = this.calculateContextRichness(context);
    if (contextRichness > 0.7) {
      // Rich context allows for more metadata scoring
      strategy.scoringWeights.metadata += 0.05;
      strategy.scoringWeights.semantic -= 0.025;
      strategy.scoringWeights.fuzzy -= 0.025;
    }

    // Adjust based on intent confidence
    if (intent.confidence < 0.7) {
      // Low confidence suggests broader search
      strategy.resultLimits.target = Math.floor(strategy.resultLimits.target * 1.5);
      strategy.resultLimits.maximum = Math.floor(strategy.resultLimits.maximum * 1.3);
      strategy.approach = 'hybrid_balanced';
    }

    // Normalize weights to ensure they sum to 1.0
    this.normalizeScoreWeights(strategy.scoringWeights);

    return strategy;
  }

  private applyTimeConstraints(strategy: SearchStrategy, processedQuery: ProcessedQuery): void {
    const { context } = processedQuery;

    // Urgent queries get tighter time constraints
    if (context?.urgent) {
      strategy.timeConstraints.targetResponseTime = Math.min(
        strategy.timeConstraints.targetResponseTime, 
        100
      );
      strategy.timeConstraints.maxResponseTime = Math.min(
        strategy.timeConstraints.maxResponseTime, 
        200
      );
    }

    // Business hours context allows for slightly longer times
    if (context?.businessHours === false) {
      strategy.timeConstraints.targetResponseTime *= 1.2;
      strategy.timeConstraints.maxResponseTime *= 1.2;
    }

    // Ensure minimum response times
    strategy.timeConstraints.targetResponseTime = Math.max(
      strategy.timeConstraints.targetResponseTime, 
      50
    );
    strategy.timeConstraints.maxResponseTime = Math.max(
      strategy.timeConstraints.maxResponseTime, 
      100
    );
  }

  private calculateQueryComplexity(enhancedQuery: any): number {
    const factors = [
      enhancedQuery.expansions.length / 10,           // Expansion complexity
      enhancedQuery.contextTerms.length / 8,          // Context complexity
      enhancedQuery.operationalKeywords.length / 6,   // Keyword complexity
      enhancedQuery.enhancedQuery.length / 200,       // Query length complexity
    ];

    return Math.min(factors.reduce((sum, factor) => sum + factor, 0) / factors.length, 1.0);
  }

  private calculateContextRichness(context?: QueryContext): number {
    if (!context) return 0;

    let richness = 0;
    if (context.severity) richness += 0.2;
    if (context.systems && context.systems.length > 0) richness += 0.3;
    if (context.alertType) richness += 0.2;
    if (context.userRole) richness += 0.1;
    if (context.conversationHistory && context.conversationHistory.length > 0) richness += 0.2;

    return Math.min(richness, 1.0);
  }

  private normalizeScoreWeights(weights: SearchStrategy['scoringWeights']): void {
    const total = weights.semantic + weights.fuzzy + weights.metadata + weights.recency;
    if (total > 0) {
      weights.semantic /= total;
      weights.fuzzy /= total;
      weights.metadata /= total;
      weights.recency /= total;
    }
  }

  private getDefaultRule(intent: IntentType): StrategyRule {
    return {
      intent,
      conditions: {},
      strategy: {
        approach: 'hybrid_balanced',
        scoringWeights: {
          semantic: 0.5,
          fuzzy: 0.4,
          metadata: 0.1,
          recency: 0.0,
        },
        resultLimits: { target: 10, maximum: 25 },
        timeConstraints: { targetResponseTime: 200, maxResponseTime: 400 },
      },
      priority: 1,
    };
  }

  private getFallbackStrategy(): SearchStrategy {
    return {
      approach: 'hybrid_balanced',
      scoringWeights: {
        semantic: 0.5,
        fuzzy: 0.4,
        metadata: 0.1,
        recency: 0.0,
      },
      resultLimits: { target: 10, maximum: 25 },
      timeConstraints: { targetResponseTime: 250, maxResponseTime: 500 },
    };
  }

  private updateMetrics(
    strategy: SearchStrategy, 
    processedQuery: ProcessedQuery, 
    processingTime: number
  ): void {
    this.metrics.totalOptimizations++;

    // Update processing time tracking
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > this.maxProcessingHistorySize) {
      this.processingTimes.shift();
    }

    // Update processing time metrics
    this.metrics.averageProcessingTime = this.calculateAverageProcessingTime();
    this.metrics.processingTimePercentiles = this.calculateProcessingTimePercentiles();

    // Update strategy distribution
    this.metrics.strategyDistribution[strategy.approach]++;

    // Update optimization effectiveness
    if (processedQuery.context?.urgent) {
      this.metrics.optimizationEffectiveness.urgentQueriesOptimized++;
    }

    if (processedQuery.context && Object.keys(processedQuery.context).length > 2) {
      this.metrics.optimizationEffectiveness.contextBasedOptimizations++;
    }

    if (strategy.timeConstraints.targetResponseTime < 150) {
      this.metrics.optimizationEffectiveness.performanceOptimizations++;
    }
  }

  private calculateAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    return this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
  }

  private calculateProcessingTimePercentiles(): { p50: number; p95: number; p99: number } {
    if (this.processingTimes.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.processingTimes].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: sorted[Math.floor(len * 0.5)] || 0,
      p95: sorted[Math.floor(len * 0.95)] || 0,
      p99: sorted[Math.floor(len * 0.99)] || 0,
    };
  }

  private calculateTargetMetPercentage(): number {
    if (this.processingTimes.length === 0) return 100;
    const withinTarget = this.processingTimes.filter(time => time <= this.config.maxProcessingTime).length;
    return (withinTarget / this.processingTimes.length) * 100;
  }
}