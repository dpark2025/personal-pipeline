import { logger } from '../../utils/logger.js';
export class QueryOptimizer {
    strategyRules;
    metrics;
    processingTimes = [];
    maxProcessingHistorySize = 1000;
    config = {
        enableStrategyOptimization: true,
        enableAdaptiveWeights: true,
        enableTimeConstraints: true,
        maxProcessingTime: 10,
    };
    constructor(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.strategyRules = this.initializeStrategyRules();
        this.metrics = this.initializeMetrics();
    }
    async initialize() {
        const startTime = performance.now();
        try {
            logger.info('Initializing Query Optimizer...', {
                strategyRules: this.strategyRules.length,
                adaptiveWeights: this.config.enableAdaptiveWeights,
                targetProcessingTime: `<${this.config.maxProcessingTime}ms`,
            });
            this.strategyRules.sort((a, b) => b.priority - a.priority);
            const initTime = performance.now() - startTime;
            logger.info('Query Optimizer initialized successfully', {
                initializationTime: `${initTime.toFixed(2)}ms`,
                rulesLoaded: this.strategyRules.length,
            });
        }
        catch (error) {
            logger.error('Failed to initialize Query Optimizer', { error });
            throw new Error(`Query Optimizer initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    optimizeSearchStrategy(processedQuery) {
        const startTime = performance.now();
        try {
            const rule = this.findBestStrategy(processedQuery);
            const optimizedStrategy = this.config.enableAdaptiveWeights
                ? this.applyAdaptiveOptimizations(rule.strategy, processedQuery)
                : rule.strategy;
            if (this.config.enableTimeConstraints) {
                this.applyTimeConstraints(optimizedStrategy, processedQuery);
            }
            const processingTime = performance.now() - startTime;
            this.updateMetrics(optimizedStrategy, processedQuery, processingTime);
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
        }
        catch (error) {
            const processingTime = performance.now() - startTime;
            logger.error('Search strategy optimization failed', { error, processingTime });
            return this.getFallbackStrategy();
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getStatus() {
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
    async cleanup() {
        this.processingTimes = [];
        this.metrics = this.initializeMetrics();
    }
    initializeStrategyRules() {
        return [
            {
                intent: "EMERGENCY_RESPONSE",
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
            {
                intent: "FIND_RUNBOOK",
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
            {
                intent: "FIND_RUNBOOK",
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
            {
                intent: "ESCALATION_PATH",
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
            {
                intent: "GET_PROCEDURE",
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
            {
                intent: "TROUBLESHOOT",
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
            {
                intent: "STATUS_CHECK",
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
            {
                intent: "CONFIGURATION",
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
            {
                intent: "GENERAL_SEARCH",
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
    initializeMetrics() {
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
    findBestStrategy(processedQuery) {
        const { intent, context } = processedQuery;
        const candidateRules = this.strategyRules.filter(rule => rule.intent === intent.intent);
        let bestRule = candidateRules[0];
        let bestScore = 0;
        for (const rule of candidateRules) {
            let score = rule.priority;
            if (rule.conditions.urgency !== undefined) {
                const isUrgent = context?.urgent || intent.entities.timeContext === 'urgent';
                if (rule.conditions.urgency === isUrgent) {
                    score += 20;
                }
                else {
                    continue;
                }
            }
            if (rule.conditions.severity) {
                const severity = intent.entities.severity || context?.severity;
                if (severity && rule.conditions.severity.includes(severity)) {
                    score += 15;
                }
            }
            if (rule.conditions.systems) {
                const systems = intent.entities.systems || context?.systems || [];
                const hasMatchingSystems = rule.conditions.systems.some(sys => systems.includes(sys) || systems.some(s => s.includes(sys)));
                if (hasMatchingSystems) {
                    score += 10;
                }
            }
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
    applyAdaptiveOptimizations(baseStrategy, processedQuery) {
        const strategy = JSON.parse(JSON.stringify(baseStrategy));
        const { intent, enhancedQuery, context } = processedQuery;
        const queryComplexity = this.calculateQueryComplexity(enhancedQuery);
        if (queryComplexity > 0.8) {
            strategy.scoringWeights.semantic += 0.1;
            strategy.scoringWeights.fuzzy -= 0.1;
            strategy.timeConstraints.targetResponseTime += 50;
        }
        else if (queryComplexity < 0.3) {
            strategy.scoringWeights.fuzzy += 0.1;
            strategy.scoringWeights.semantic -= 0.1;
            strategy.timeConstraints.targetResponseTime -= 20;
        }
        const contextRichness = this.calculateContextRichness(context);
        if (contextRichness > 0.7) {
            strategy.scoringWeights.metadata += 0.05;
            strategy.scoringWeights.semantic -= 0.025;
            strategy.scoringWeights.fuzzy -= 0.025;
        }
        if (intent.confidence < 0.7) {
            strategy.resultLimits.target = Math.floor(strategy.resultLimits.target * 1.5);
            strategy.resultLimits.maximum = Math.floor(strategy.resultLimits.maximum * 1.3);
            strategy.approach = 'hybrid_balanced';
        }
        this.normalizeScoreWeights(strategy.scoringWeights);
        return strategy;
    }
    applyTimeConstraints(strategy, processedQuery) {
        const { context } = processedQuery;
        if (context?.urgent) {
            strategy.timeConstraints.targetResponseTime = Math.min(strategy.timeConstraints.targetResponseTime, 100);
            strategy.timeConstraints.maxResponseTime = Math.min(strategy.timeConstraints.maxResponseTime, 200);
        }
        if (context?.businessHours === false) {
            strategy.timeConstraints.targetResponseTime *= 1.2;
            strategy.timeConstraints.maxResponseTime *= 1.2;
        }
        strategy.timeConstraints.targetResponseTime = Math.max(strategy.timeConstraints.targetResponseTime, 50);
        strategy.timeConstraints.maxResponseTime = Math.max(strategy.timeConstraints.maxResponseTime, 100);
    }
    calculateQueryComplexity(enhancedQuery) {
        const factors = [
            enhancedQuery.expansions.length / 10,
            enhancedQuery.contextTerms.length / 8,
            enhancedQuery.operationalKeywords.length / 6,
            enhancedQuery.enhancedQuery.length / 200,
        ];
        return Math.min(factors.reduce((sum, factor) => sum + factor, 0) / factors.length, 1.0);
    }
    calculateContextRichness(context) {
        if (!context)
            return 0;
        let richness = 0;
        if (context.severity)
            richness += 0.2;
        if (context.systems && context.systems.length > 0)
            richness += 0.3;
        if (context.alertType)
            richness += 0.2;
        if (context.userRole)
            richness += 0.1;
        if (context.conversationHistory && context.conversationHistory.length > 0)
            richness += 0.2;
        return Math.min(richness, 1.0);
    }
    normalizeScoreWeights(weights) {
        const total = weights.semantic + weights.fuzzy + weights.metadata + weights.recency;
        if (total > 0) {
            weights.semantic /= total;
            weights.fuzzy /= total;
            weights.metadata /= total;
            weights.recency /= total;
        }
    }
    getDefaultRule(intent) {
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
    getFallbackStrategy() {
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
    updateMetrics(strategy, processedQuery, processingTime) {
        this.metrics.totalOptimizations++;
        this.processingTimes.push(processingTime);
        if (this.processingTimes.length > this.maxProcessingHistorySize) {
            this.processingTimes.shift();
        }
        this.metrics.averageProcessingTime = this.calculateAverageProcessingTime();
        this.metrics.processingTimePercentiles = this.calculateProcessingTimePercentiles();
        this.metrics.strategyDistribution[strategy.approach]++;
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
    calculateAverageProcessingTime() {
        if (this.processingTimes.length === 0)
            return 0;
        return this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
    }
    calculateProcessingTimePercentiles() {
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
    calculateTargetMetPercentage() {
        if (this.processingTimes.length === 0)
            return 100;
        const withinTarget = this.processingTimes.filter(time => time <= this.config.maxProcessingTime).length;
        return (withinTarget / this.processingTimes.length) * 100;
    }
}
//# sourceMappingURL=query-optimizer.js.map