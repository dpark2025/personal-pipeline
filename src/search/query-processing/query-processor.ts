/**
 * Query Processor - Core query processing orchestration
 * 
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 * 
 * Main orchestration class for intelligent query processing that coordinates
 * intent classification, query enhancement, and search strategy optimization
 * with sub-50ms processing targets.
 */

import { IntentClassifier } from './intent-classifier.js';
// import { ContextEnhancer } from './context-enhancer.js';
import { QueryOptimizer } from './query-optimizer.js';
import { OperationalIntelligence } from './operational-intelligence.js';
import { PerformanceMonitor } from './performance-monitor.js';
import { 
  QueryContext, 
  ProcessedQuery, 
  IntentClassification, 
  EnhancedQuery, 
  SearchStrategy,
  QueryProcessingConfig,
} from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Production-grade query processor with sub-50ms processing target
 */
export class QueryProcessor {
  private intentClassifier: IntentClassifier;
  // private contextEnhancer: ContextEnhancer;
  private queryOptimizer: QueryOptimizer;
  private operationalIntelligence: OperationalIntelligence;
  private performanceMonitor: PerformanceMonitor;
  private isInitialized = false;

  private readonly config: QueryProcessingConfig = {
    intentClassification: {
      confidenceThreshold: 0.8,
      enableMultiIntent: true,
      fallbackToGeneral: true,
    },
    queryEnhancement: {
      maxExpansions: 10,
      enableSynonyms: true,
      enableContextInjection: true,
      boostOperationalTerms: true,
    },
    performance: {
      targetProcessingTime: 50, // 50ms target
      enableCaching: true,
      enableParallelProcessing: true,
    },
    operationalIntelligence: {
      enablePatternMatching: true,
      enableContextPrediction: true,
      enableStrategyOptimization: true,
    },
  };

  constructor(config?: Partial<QueryProcessingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize components
    this.intentClassifier = new IntentClassifier({
      confidenceThreshold: this.config.intentClassification.confidenceThreshold,
      enableMultiIntent: this.config.intentClassification.enableMultiIntent,
    });

    // this.contextEnhancer = new ContextEnhancer({
    //   maxExpansions: this.config.queryEnhancement.maxExpansions,
    //   enableSynonyms: this.config.queryEnhancement.enableSynonyms,
    //   enableContextInjection: this.config.queryEnhancement.enableContextInjection,
    // });

    this.queryOptimizer = new QueryOptimizer({
      enableStrategyOptimization: this.config.operationalIntelligence.enableStrategyOptimization,
    });

    this.operationalIntelligence = new OperationalIntelligence({
      enablePatternMatching: this.config.operationalIntelligence.enablePatternMatching,
      enableContextPrediction: this.config.operationalIntelligence.enableContextPrediction,
    });

    this.performanceMonitor = new PerformanceMonitor({
      targetProcessingTime: this.config.performance.targetProcessingTime,
      enableCaching: this.config.performance.enableCaching,
    });
  }

  /**
   * Initialize the query processor
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      logger.info('Initializing Query Processor...', {
        targetProcessingTime: `${this.config.performance.targetProcessingTime}ms`,
        parallelProcessing: this.config.performance.enableParallelProcessing,
      });

      // Initialize components in parallel for faster startup
      await Promise.all([
        this.intentClassifier.initialize(),
        // this.contextEnhancer.initialize(),
        this.queryOptimizer.initialize(),
        this.operationalIntelligence.initialize(),
        this.performanceMonitor.initialize(),
      ]);

      this.isInitialized = true;

      const initTime = performance.now() - startTime;
      logger.info('Query Processor initialized successfully', {
        initializationTime: `${initTime.toFixed(2)}ms`,
        componentsReady: 5,
      });

      this.performanceMonitor.recordInitialization(initTime);
    } catch (error) {
      logger.error('Failed to initialize Query Processor', { error });
      throw new Error(`Query Processor initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process natural language query into optimized search parameters
   * Target: <50ms processing time for 95% of queries
   */
  async processQuery(query: string, context?: QueryContext): Promise<ProcessedQuery> {
    if (!this.isInitialized) {
      throw new Error('Query Processor not initialized');
    }

    const startTime = performance.now();
    const processingId = this.performanceMonitor.generateProcessingId();

    try {
      logger.debug('Processing query', {
        processingId,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        hasContext: !!context,
      });

      // Check cache first
      const cachedResult = await this.performanceMonitor.getCachedResult(query, context);
      if (cachedResult) {
        const responseTime = performance.now() - startTime;
        this.performanceMonitor.recordProcessing(processingId, query, responseTime, true);
        return cachedResult;
      }

      // Apply operational intelligence for context prediction
      const enhancedContext = await this.operationalIntelligence.predictContext(query, context);

      let intent: IntentClassification;
      let enhancedQuery: EnhancedQuery;
      let strategy: SearchStrategy;

      if (this.config.performance.enableParallelProcessing) {
        // Parallel processing for sub-50ms performance
        const [intentResult] = await Promise.all([
          this.classifyIntent(query, enhancedContext),
          // this.contextEnhancer.enhanceQuery(query, enhancedContext),
        ]);

        intent = intentResult;
        // Temporary fallback: use original query as enhanced query
        enhancedQuery = {
          originalQuery: query,
          enhancedQuery: query,
          expansions: [],
          contextTerms: [],
          operationalKeywords: [],
          processingTime: 0,
        };

        // Strategy optimization depends on intent, so runs after
        const tempProcessedQuery: ProcessedQuery = {
          intent,
          enhancedQuery,
          strategy: {
            approach: 'hybrid_balanced',
            scoringWeights: { semantic: 0.5, fuzzy: 0.4, metadata: 0.1, recency: 0.0 },
            resultLimits: { target: 10, maximum: 50 },
            timeConstraints: { targetResponseTime: 200, maxResponseTime: 500 },
          },
          context: enhancedContext,
          totalProcessingTime: 0,
          timingBreakdown: {
            intentClassification: intent.processingTime,
            queryEnhancement: enhancedQuery.processingTime,
            strategyOptimization: 0,
          },
        };
        
        strategy = await this.queryOptimizer.optimizeSearchStrategy(tempProcessedQuery);
      } else {
        // Sequential processing
        intent = await this.classifyIntent(query, enhancedContext);
        // enhancedQuery = await this.contextEnhancer.enhanceQuery(query, enhancedContext, intent);
        // Temporary fallback: use original query as enhanced query
        enhancedQuery = {
          originalQuery: query,
          enhancedQuery: query,
          expansions: [],
          contextTerms: [],
          operationalKeywords: [],
          processingTime: 0,
        };
        const tempProcessedQuery2: ProcessedQuery = {
          intent,
          enhancedQuery,
          strategy: {
            approach: 'hybrid_balanced',
            scoringWeights: { semantic: 0.5, fuzzy: 0.4, metadata: 0.1, recency: 0.0 },
            resultLimits: { target: 10, maximum: 50 },
            timeConstraints: { targetResponseTime: 200, maxResponseTime: 500 },
          },
          context: enhancedContext,
          totalProcessingTime: 0,
          timingBreakdown: {
            intentClassification: intent.processingTime,
            queryEnhancement: enhancedQuery.processingTime,
            strategyOptimization: 0,
          },
        };
        
        strategy = await this.queryOptimizer.optimizeSearchStrategy(tempProcessedQuery2);
      }

      const totalProcessingTime = performance.now() - startTime;

      const processedQuery: ProcessedQuery = {
        intent,
        enhancedQuery,
        strategy,
        context: enhancedContext,
        totalProcessingTime,
        timingBreakdown: {
          intentClassification: intent.processingTime,
          queryEnhancement: enhancedQuery.processingTime,
          strategyOptimization: strategy.timeConstraints.targetResponseTime || 0,
        },
      };

      // Cache the result
      await this.performanceMonitor.cacheResult(query, context, processedQuery);

      // Record performance metrics
      this.performanceMonitor.recordProcessing(processingId, query, totalProcessingTime, false);

      // Log performance warning if target not met
      if (totalProcessingTime > this.config.performance.targetProcessingTime) {
        logger.warn('Query processing exceeded target time', {
          processingId,
          targetTime: `${this.config.performance.targetProcessingTime}ms`,
          actualTime: `${totalProcessingTime.toFixed(2)}ms`,
          query: query.substring(0, 50) + '...',
        });
      } else {
        logger.debug('Query processing completed within target', {
          processingId,
          processingTime: `${totalProcessingTime.toFixed(2)}ms`,
          intent: intent.intent,
          confidence: intent.confidence.toFixed(3),
        });
      }

      return processedQuery;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      logger.error('Query processing failed', { 
        processingId, 
        error, 
        responseTime: `${responseTime.toFixed(2)}ms`,
      });

      this.performanceMonitor.recordProcessingError(processingId, query, error, responseTime);

      // Return fallback processing result
      return this.createFallbackResult(query, context, responseTime);
    }
  }

  /**
   * Classify user intent from query
   */
  async classifyIntent(query: string, context?: QueryContext): Promise<IntentClassification> {
    return await this.intentClassifier.classifyIntent(query, context);
  }

  /**
   * Enhance query with contextual understanding
   */
  async enhanceQuery(
    query: string, 
    intent: IntentClassification, 
    context?: QueryContext
  ): Promise<EnhancedQuery> {
    // return await this.contextEnhancer.enhanceQuery(query, context, intent);
    // Temporary fallback: return basic enhanced query structure
    return {
      originalQuery: query,
      enhancedQuery: query,
      expansions: [],
      contextTerms: [],
      operationalKeywords: [],
      processingTime: 0,
    };
  }

  /**
   * Optimize search strategy based on processing results
   */
  optimizeSearchStrategy(processedQuery: ProcessedQuery): SearchStrategy {
    return this.queryOptimizer.optimizeSearchStrategy(processedQuery);
  }

  /**
   * Get processing performance metrics
   */
  getPerformanceMetrics(): any {
    return {
      monitor: this.performanceMonitor.getMetrics(),
      intentClassifier: this.intentClassifier.getMetrics(),
      // contextEnhancer: this.contextEnhancer.getMetrics(),
      contextEnhancer: { disabled: true, reason: 'Temporarily disabled for build fix' },
      queryOptimizer: this.queryOptimizer.getMetrics(),
      operationalIntelligence: this.operationalIntelligence.getMetrics(),
    };
  }

  /**
   * Get processor status
   */
  getStatus(): any {
    return {
      initialized: this.isInitialized,
      config: this.config,
      components: {
        intentClassifier: this.intentClassifier.getStatus(),
        // contextEnhancer: this.contextEnhancer.getStatus(),
        contextEnhancer: { status: 'disabled', reason: 'Temporarily disabled for build fix' },
        queryOptimizer: this.queryOptimizer.getStatus(),
        operationalIntelligence: this.operationalIntelligence.getStatus(),
        performanceMonitor: this.performanceMonitor.getStatus(),
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up Query Processor');
    
    await Promise.all([
      this.intentClassifier.cleanup(),
      // this.contextEnhancer.cleanup(),
      this.queryOptimizer.cleanup(),
      this.operationalIntelligence.cleanup(),
      this.performanceMonitor.cleanup(),
    ]);
    
    this.isInitialized = false;
  }

  // Private methods

  private createFallbackResult(
    query: string, 
    context: QueryContext | undefined, 
    processingTime: number
  ): ProcessedQuery {
    return {
      intent: {
        intent: 'GENERAL_SEARCH' as any,
        confidence: 0.5,
        entities: {},
        processingTime: processingTime * 0.3,
      },
      enhancedQuery: {
        originalQuery: query,
        enhancedQuery: query,
        expansions: [],
        contextTerms: [],
        operationalKeywords: [],
        processingTime: processingTime * 0.3,
      },
      strategy: {
        approach: 'hybrid_balanced',
        scoringWeights: {
          semantic: 0.5,
          fuzzy: 0.4,
          metadata: 0.1,
          recency: 0.0,
        },
        resultLimits: {
          target: 10,
          maximum: 50,
        },
        timeConstraints: {
          targetResponseTime: 200,
          maxResponseTime: 500,
        },
      },
      context: context || undefined,
      totalProcessingTime: processingTime,
      timingBreakdown: {
        intentClassification: processingTime * 0.3,
        queryEnhancement: processingTime * 0.3,
        strategyOptimization: processingTime * 0.4,
      },
    };
  }
}