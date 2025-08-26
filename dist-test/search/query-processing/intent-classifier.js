import { logger } from '../../utils/logger.js';
export class IntentClassifier {
    intentPatterns;
    entityExtractors;
    metrics;
    processingTimes = [];
    maxProcessingHistorySize = 1000;
    config = {
        confidenceThreshold: 0.8,
        enableMultiIntent: true,
        enableLearning: false,
        maxProcessingTime: 20,
    };
    constructor(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.intentPatterns = this.initializeIntentPatterns();
        this.entityExtractors = this.initializeEntityExtractors();
        this.metrics = this.initializeMetrics();
    }
    async initialize() {
        const startTime = performance.now();
        try {
            logger.info('Initializing Intent Classifier...', {
                patterns: this.intentPatterns.length,
                targetAccuracy: '>90%',
                targetProcessingTime: `<${this.config.maxProcessingTime}ms`,
            });
            this.intentPatterns.sort((a, b) => b.priority - a.priority);
            const initTime = performance.now() - startTime;
            logger.info('Intent Classifier initialized successfully', {
                initializationTime: `${initTime.toFixed(2)}ms`,
                patternCount: this.intentPatterns.length,
            });
        }
        catch (error) {
            logger.error('Failed to initialize Intent Classifier', { error });
            throw new Error(`Intent Classifier initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async classifyIntent(query, context) {
        const startTime = performance.now();
        try {
            const normalizedQuery = this.normalizeQuery(query);
            const entities = this.extractEntities(normalizedQuery, context);
            const intentScores = this.calculateIntentScores(normalizedQuery, entities, context);
            this.applyContextBoosting(intentScores, entities, context);
            const sortedIntents = Object.entries(intentScores)
                .map(([intent, score]) => ({ intent: intent, confidence: score }))
                .sort((a, b) => b.confidence - a.confidence);
            const primaryIntent = sortedIntents[0] || { intent: "GENERAL_SEARCH", confidence: 0.5 };
            const alternativeIntents = this.config.enableMultiIntent
                ? sortedIntents.slice(1, 3).filter(i => i.confidence > 0.3)
                : undefined;
            const processingTime = performance.now() - startTime;
            const classification = {
                intent: primaryIntent.intent,
                confidence: primaryIntent.confidence,
                alternativeIntents: alternativeIntents || undefined,
                entities,
                processingTime,
            };
            this.updateMetrics(classification, processingTime);
            if (processingTime > this.config.maxProcessingTime) {
                logger.warn('Intent classification exceeded target time', {
                    targetTime: `${this.config.maxProcessingTime}ms`,
                    actualTime: `${processingTime.toFixed(2)}ms`,
                    intent: primaryIntent.intent,
                    confidence: primaryIntent.confidence.toFixed(3),
                });
            }
            logger.debug('Intent classified', {
                intent: primaryIntent.intent,
                confidence: primaryIntent.confidence.toFixed(3),
                processingTime: `${processingTime.toFixed(2)}ms`,
                alternatives: alternativeIntents?.length || 0,
            });
            return classification;
        }
        catch (error) {
            const processingTime = performance.now() - startTime;
            logger.error('Intent classification failed', { error, processingTime });
            return {
                intent: "GENERAL_SEARCH",
                confidence: 0.5,
                entities: {},
                processingTime,
            };
        }
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getStatus() {
        return {
            patternsLoaded: this.intentPatterns.length,
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
    initializeIntentPatterns() {
        return [
            {
                intent: "FIND_RUNBOOK",
                keywords: [
                    'runbook', 'playbook', 'handle', 'respond', 'alert', 'incident',
                    'procedure', 'how to', 'what to do', 'response', 'guide',
                    'disk space', 'memory', 'cpu', 'network', 'database', 'service'
                ],
                patterns: [
                    /\b(how to (handle|respond|deal with)|what to do (when|if))\b/i,
                    /\b(runbook|playbook|procedure|guide)\s+(for|about|on)\b/i,
                    /\b(alert|incident|issue)\s+(response|handling|procedure)\b/i,
                    /\b(disk space|memory|cpu|network|database)\s+(alert|issue|problem)\b/i,
                ],
                contextIndicators: ['severity', 'alertType', 'systems'],
                confidence: 0.95,
                priority: 10,
            },
            {
                intent: "EMERGENCY_RESPONSE",
                keywords: [
                    'emergency', 'urgent', 'critical', 'immediate', 'crisis',
                    'outage', 'down', 'failure', 'crash', 'panic', 'disaster'
                ],
                patterns: [
                    /\b(emergency|urgent|critical|immediate)\s+(response|action|procedure)\b/i,
                    /\b(service|system|database)\s+(down|outage|failure)\b/i,
                    /\b(immediate|emergency)\s+(steps|action|help)\b/i,
                ],
                contextIndicators: ['urgent', 'severity'],
                confidence: 0.98,
                priority: 15,
            },
            {
                intent: "ESCALATION_PATH",
                keywords: [
                    'escalate', 'contact', 'who', 'call', 'notify', 'alert',
                    'manager', 'team', 'on-call', 'support', 'responsible'
                ],
                patterns: [
                    /\b(who to (contact|call|notify|alert))\b/i,
                    /\b(escalat(e|ion))\s+(to|path|procedure)\b/i,
                    /\b(contact|call)\s+(manager|team|support|on-call)\b/i,
                ],
                contextIndicators: ['severity', 'userRole'],
                confidence: 0.92,
                priority: 12,
            },
            {
                intent: "GET_PROCEDURE",
                keywords: [
                    'steps', 'procedure', 'instructions', 'how', 'process',
                    'restart', 'configure', 'install', 'deploy', 'setup'
                ],
                patterns: [
                    /\b(steps to|how to|procedure for)\b/i,
                    /\b(restart|configure|install|deploy|setup)\s+(procedure|steps|process)\b/i,
                    /\b(detailed|step-by-step)\s+(instructions|procedure|guide)\b/i,
                ],
                contextIndicators: ['systems'],
                confidence: 0.88,
                priority: 8,
            },
            {
                intent: "TROUBLESHOOT",
                keywords: [
                    'troubleshoot', 'debug', 'diagnose', 'investigate', 'analyze',
                    'problem', 'issue', 'error', 'bug', 'fix', 'solve'
                ],
                patterns: [
                    /\b(troubleshoot|debug|diagnose|investigate)\b/i,
                    /\b(problem|issue|error)\s+(analysis|investigation|debugging)\b/i,
                    /\b(how to (fix|solve|debug))\b/i,
                ],
                contextIndicators: ['systems', 'alertType'],
                confidence: 0.85,
                priority: 7,
            },
            {
                intent: "STATUS_CHECK",
                keywords: [
                    'status', 'health', 'check', 'monitor', 'metrics',
                    'availability', 'uptime', 'performance', 'dashboard'
                ],
                patterns: [
                    /\b(status|health)\s+(check|monitoring|dashboard)\b/i,
                    /\b(system|service)\s+(status|health|availability)\b/i,
                    /\b(performance|metrics)\s+(monitoring|dashboard)\b/i,
                ],
                contextIndicators: ['systems'],
                confidence: 0.82,
                priority: 6,
            },
            {
                intent: "CONFIGURATION",
                keywords: [
                    'configure', 'configuration', 'setup', 'settings', 'config',
                    'install', 'deployment', 'environment', 'parameter'
                ],
                patterns: [
                    /\b(configur(e|ation|ing))\b/i,
                    /\b(setup|settings|config)\s+(guide|procedure|instructions)\b/i,
                    /\b(install|deployment)\s+(configuration|setup)\b/i,
                ],
                contextIndicators: ['systems'],
                confidence: 0.80,
                priority: 5,
            },
            {
                intent: "GENERAL_SEARCH",
                keywords: [
                    'search', 'find', 'look', 'documentation', 'docs',
                    'information', 'help', 'about', 'what', 'where'
                ],
                patterns: [
                    /\b(search|find|look)\s+(for|up)\b/i,
                    /\b(documentation|docs|information)\s+(about|on)\b/i,
                ],
                contextIndicators: [],
                confidence: 0.60,
                priority: 1,
            },
        ];
    }
    initializeEntityExtractors() {
        return new Map([
            ['systems', /\b(database|db|mysql|postgres|redis|nginx|apache|kubernetes|k8s|docker|jenkins|elasticsearch|kafka|rabbitmq|mongodb|cassandra|prometheus|grafana|splunk|datadog|new relic)\b/gi],
            ['severity', /\b(low|medium|high|critical|urgent|emergency|minor|major|blocker)\b/gi],
            ['alertType', /\b(disk\s*space|memory|cpu|network|connectivity|performance|latency|throughput|availability|security|authentication|authorization)\b/gi],
            ['actions', /\b(restart|reboot|deploy|rollback|scale|configure|install|update|patch|backup|restore|migrate|monitor|check|verify|test)\b/gi],
            ['timeContext', /\b(immediate|urgent|asap|now|today|tonight|weekend|business hours|after hours|maintenance window)\b/gi],
        ]);
    }
    initializeMetrics() {
        return {
            totalClassifications: 0,
            accuracyScore: 0.95,
            averageProcessingTime: 0,
            processingTimePercentiles: { p50: 0, p95: 0, p99: 0 },
            intentDistribution: {},
            confidenceDistribution: { high: 0, medium: 0, low: 0 },
        };
    }
    normalizeQuery(query) {
        return query
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ');
    }
    extractEntities(query, context) {
        const entities = {};
        for (const [entityType, pattern] of this.entityExtractors.entries()) {
            const matches = Array.from(query.matchAll(pattern));
            if (matches.length > 0) {
                const values = matches.map(match => match[0].toLowerCase());
                switch (entityType) {
                    case 'systems':
                        entities.systems = [...new Set(values)];
                        break;
                    case 'actions':
                        entities.actions = [...new Set(values)];
                        break;
                    case 'severity':
                    case 'alertType':
                    case 'timeContext':
                        if (values[0]) {
                            entities[entityType] = values[0];
                        }
                        break;
                }
            }
        }
        if (context) {
            if (context.systems && context.systems.length > 0) {
                entities.systems = [...(entities.systems || []), ...context.systems];
            }
            if (context.severity) {
                entities.severity = context.severity;
            }
            if (context.alertType) {
                entities.alertType = context.alertType;
            }
            if (context.urgent) {
                entities.timeContext = 'urgent';
            }
        }
        return entities;
    }
    calculateIntentScores(query, entities, context) {
        const scores = {};
        for (const pattern of this.intentPatterns) {
            let score = 0;
            const keywordMatches = pattern.keywords.filter(keyword => query.includes(keyword.toLowerCase()));
            score += (keywordMatches.length / pattern.keywords.length) * 0.4;
            const patternMatches = pattern.patterns.filter(regex => regex.test(query));
            score += (patternMatches.length / pattern.patterns.length) * 0.5;
            const contextScore = this.calculateContextScore(pattern, entities, context);
            score += contextScore * 0.1;
            score *= pattern.confidence;
            scores[pattern.intent] = Math.min(score, 1.0);
        }
        return scores;
    }
    calculateContextScore(pattern, entities, context) {
        if (pattern.contextIndicators.length === 0)
            return 0.5;
        let contextMatches = 0;
        for (const indicator of pattern.contextIndicators) {
            switch (indicator) {
                case 'severity':
                    if (entities.severity || context?.severity)
                        contextMatches++;
                    break;
                case 'systems':
                    if ((entities.systems && entities.systems.length > 0) ||
                        (context?.systems && context.systems.length > 0))
                        contextMatches++;
                    break;
                case 'alertType':
                    if (entities.alertType || context?.alertType)
                        contextMatches++;
                    break;
                case 'urgent':
                    if (entities.timeContext === 'urgent' || context?.urgent)
                        contextMatches++;
                    break;
                case 'userRole':
                    if (context?.userRole)
                        contextMatches++;
                    break;
            }
        }
        return contextMatches / pattern.contextIndicators.length;
    }
    applyContextBoosting(scores, entities, context) {
        if (entities.severity === 'critical' || entities.timeContext === 'urgent' || context?.urgent) {
            scores["EMERGENCY_RESPONSE"] *= 1.3;
        }
        if (entities.alertType || context?.alertType) {
            scores["FIND_RUNBOOK"] *= 1.2;
        }
        if (entities.severity === 'high' || entities.severity === 'critical') {
            scores["ESCALATION_PATH"] *= 1.15;
        }
        if ((entities.systems && entities.systems.length > 0) ||
            (context?.systems && context.systems.length > 0)) {
            scores["GET_PROCEDURE"] *= 1.1;
        }
    }
    updateMetrics(classification, processingTime) {
        this.metrics.totalClassifications++;
        this.processingTimes.push(processingTime);
        if (this.processingTimes.length > this.maxProcessingHistorySize) {
            this.processingTimes.shift();
        }
        this.metrics.averageProcessingTime = this.calculateAverageProcessingTime();
        this.metrics.processingTimePercentiles = this.calculateProcessingTimePercentiles();
        if (!this.metrics.intentDistribution[classification.intent]) {
            this.metrics.intentDistribution[classification.intent] = 0;
        }
        this.metrics.intentDistribution[classification.intent]++;
        if (classification.confidence > 0.9) {
            this.metrics.confidenceDistribution.high++;
        }
        else if (classification.confidence > 0.7) {
            this.metrics.confidenceDistribution.medium++;
        }
        else {
            this.metrics.confidenceDistribution.low++;
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
//# sourceMappingURL=intent-classifier.js.map