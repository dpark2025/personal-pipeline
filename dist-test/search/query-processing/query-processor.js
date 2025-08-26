import { IntentClassifier } from './intent-classifier.js';
import { QueryOptimizer } from './query-optimizer.js';
import { OperationalIntelligence } from './operational-intelligence.js';
import { PerformanceMonitor } from './performance-monitor.js';
import { logger } from '../../utils/logger.js';
export class QueryProcessor {
    intentClassifier;
    queryOptimizer;
    operationalIntelligence;
    performanceMonitor;
    isInitialized = false;
    config = {
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
            targetProcessingTime: 50,
            enableCaching: true,
            enableParallelProcessing: true,
        },
        operationalIntelligence: {
            enablePatternMatching: true,
            enableContextPrediction: true,
            enableStrategyOptimization: true,
        },
    };
    constructor(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.intentClassifier = new IntentClassifier({
            confidenceThreshold: this.config.intentClassification.confidenceThreshold,
            enableMultiIntent: this.config.intentClassification.enableMultiIntent,
        });
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
    async initialize() {
        const startTime = performance.now();
        try {
            logger.info('Initializing Query Processor...', {
                targetProcessingTime: `${this.config.performance.targetProcessingTime}ms`,
                parallelProcessing: this.config.performance.enableParallelProcessing,
            });
            await Promise.all([
                this.intentClassifier.initialize(),
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
        }
        catch (error) {
            logger.error('Failed to initialize Query Processor', { error });
            throw new Error(`Query Processor initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async processQuery(query, context) {
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
            const cachedResult = await this.performanceMonitor.getCachedResult(query, context);
            if (cachedResult) {
                const responseTime = performance.now() - startTime;
                this.performanceMonitor.recordProcessing(processingId, query, responseTime, true);
                return cachedResult;
            }
            const enhancedContext = await this.operationalIntelligence.predictContext(query, context);
            let intent;
            let enhancedQuery;
            let strategy;
            if (this.config.performance.enableParallelProcessing) {
                const [intentResult] = await Promise.all([
                    this.classifyIntent(query, enhancedContext),
                ]);
                intent = intentResult;
                enhancedQuery = {
                    originalQuery: query,
                    enhancedQuery: query,
                    expansions: [],
                    contextTerms: [],
                    operationalKeywords: [],
                    processingTime: 0,
                };
                const tempProcessedQuery = {
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
                strategy = this.queryOptimizer.optimizeSearchStrategy(tempProcessedQuery);
            }
            else {
                intent = await this.classifyIntent(query, enhancedContext);
                enhancedQuery = {
                    originalQuery: query,
                    enhancedQuery: query,
                    expansions: [],
                    contextTerms: [],
                    operationalKeywords: [],
                    processingTime: 0,
                };
                const tempProcessedQuery2 = {
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
                strategy = this.queryOptimizer.optimizeSearchStrategy(tempProcessedQuery2);
            }
            const totalProcessingTime = performance.now() - startTime;
            const processedQuery = {
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
            await this.performanceMonitor.cacheResult(query, context, processedQuery);
            this.performanceMonitor.recordProcessing(processingId, query, totalProcessingTime, false);
            if (totalProcessingTime > this.config.performance.targetProcessingTime) {
                logger.warn('Query processing exceeded target time', {
                    processingId,
                    targetTime: `${this.config.performance.targetProcessingTime}ms`,
                    actualTime: `${totalProcessingTime.toFixed(2)}ms`,
                    query: `${query.substring(0, 50)}...`,
                });
            }
            else {
                logger.debug('Query processing completed within target', {
                    processingId,
                    processingTime: `${totalProcessingTime.toFixed(2)}ms`,
                    intent: intent.intent,
                    confidence: intent.confidence.toFixed(3),
                });
            }
            return processedQuery;
        }
        catch (error) {
            const responseTime = performance.now() - startTime;
            logger.error('Query processing failed', {
                processingId,
                error,
                responseTime: `${responseTime.toFixed(2)}ms`,
            });
            this.performanceMonitor.recordProcessingError(processingId, query, error, responseTime);
            return this.createFallbackResult(query, context, responseTime);
        }
    }
    async classifyIntent(query, context) {
        return await this.intentClassifier.classifyIntent(query, context);
    }
    async enhanceQuery(query, _intent, _context) {
        return {
            originalQuery: query,
            enhancedQuery: query,
            expansions: [],
            contextTerms: [],
            operationalKeywords: [],
            processingTime: 0,
        };
    }
    optimizeSearchStrategy(processedQuery) {
        return this.queryOptimizer.optimizeSearchStrategy(processedQuery);
    }
    getPerformanceMetrics() {
        return {
            monitor: this.performanceMonitor.getMetrics(),
            intentClassifier: this.intentClassifier.getMetrics(),
            contextEnhancer: { disabled: true, reason: 'Temporarily disabled for build fix' },
            queryOptimizer: this.queryOptimizer.getMetrics(),
            operationalIntelligence: this.operationalIntelligence.getMetrics(),
        };
    }
    getStatus() {
        return {
            initialized: this.isInitialized,
            config: this.config,
            components: {
                intentClassifier: this.intentClassifier.getStatus(),
                contextEnhancer: { status: 'disabled', reason: 'Temporarily disabled for build fix' },
                queryOptimizer: this.queryOptimizer.getStatus(),
                operationalIntelligence: this.operationalIntelligence.getStatus(),
                performanceMonitor: this.performanceMonitor.getStatus(),
            },
        };
    }
    async cleanup() {
        logger.info('Cleaning up Query Processor');
        await Promise.all([
            this.intentClassifier.cleanup(),
            this.queryOptimizer.cleanup(),
            this.operationalIntelligence.cleanup(),
            this.performanceMonitor.cleanup(),
        ]);
        this.isInitialized = false;
    }
    createFallbackResult(query, context, processingTime) {
        return {
            intent: {
                intent: 'GENERAL_SEARCH',
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
//# sourceMappingURL=query-processor.js.map