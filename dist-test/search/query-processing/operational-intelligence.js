import { logger } from '../../utils/logger.js';
export class OperationalIntelligence {
    incidentResponseFlows;
    operationalPatterns;
    organizationalContext;
    metrics;
    processingTimes = [];
    maxProcessingHistorySize = 1000;
    config = {
        enablePatternMatching: true,
        enableContextPrediction: true,
        enableFlowAnalysis: true,
        maxProcessingTime: 10,
    };
    constructor(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        this.incidentResponseFlows = this.initializeIncidentResponseFlows();
        this.operationalPatterns = this.initializeOperationalPatterns();
        this.organizationalContext = this.initializeOrganizationalContext();
        this.metrics = this.initializeMetrics();
    }
    async initialize() {
        const startTime = performance.now();
        try {
            logger.info('Initializing Operational Intelligence...', {
                incidentFlows: this.incidentResponseFlows.length,
                patterns: this.operationalPatterns.length,
                targetProcessingTime: `<${this.config.maxProcessingTime}ms`,
            });
            this.optimizeDataStructures();
            const initTime = performance.now() - startTime;
            logger.info('Operational Intelligence initialized successfully', {
                initializationTime: `${initTime.toFixed(2)}ms`,
                flowsLoaded: this.incidentResponseFlows.length,
                patternsLoaded: this.operationalPatterns.length,
            });
        }
        catch (error) {
            logger.error('Failed to initialize Operational Intelligence', { error });
            throw new Error(`Operational Intelligence initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async predictContext(query, existingContext) {
        const startTime = performance.now();
        try {
            const normalizedQuery = this.normalizeQuery(query);
            const enhancedContext = { ...existingContext };
            if (this.config.enablePatternMatching) {
                this.applyPatternBasedEnhancements(normalizedQuery, enhancedContext);
            }
            if (this.config.enableFlowAnalysis) {
                this.applyIncidentFlowContext(normalizedQuery, enhancedContext);
            }
            this.applyOrganizationalContext(enhancedContext);
            this.applyTimeBasedContext(enhancedContext);
            const processingTime = performance.now() - startTime;
            this.updateMetrics(processingTime, enhancedContext !== existingContext);
            if (processingTime > this.config.maxProcessingTime) {
                logger.warn('Context prediction exceeded target time', {
                    targetTime: `${this.config.maxProcessingTime}ms`,
                    actualTime: `${processingTime.toFixed(2)}ms`,
                });
            }
            logger.debug('Context predicted and enhanced', {
                hasExistingContext: !!existingContext,
                enhancements: Object.keys(enhancedContext).length,
                processingTime: `${processingTime.toFixed(2)}ms`,
            });
            return enhancedContext;
        }
        catch (error) {
            const processingTime = performance.now() - startTime;
            logger.error('Context prediction failed', { error, processingTime });
            return existingContext || {};
        }
    }
    analyzeIncidentFlow(query, context) {
        const normalizedQuery = this.normalizeQuery(query);
        for (const flow of this.incidentResponseFlows) {
            const score = this.calculateFlowMatchScore(normalizedQuery, context, flow);
            if (score > 0.7) {
                return flow;
            }
        }
        return null;
    }
    getPatternRecommendations(query, intent) {
        const normalizedQuery = this.normalizeQuery(query);
        return this.operationalPatterns
            .filter(pattern => pattern.applicableIntents.includes(intent))
            .filter(pattern => {
            const keywordMatches = pattern.triggerKeywords.filter(keyword => normalizedQuery.includes(keyword.toLowerCase()));
            return keywordMatches.length > 0;
        })
            .slice(0, 3);
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getStatus() {
        return {
            incidentFlows: this.incidentResponseFlows.length,
            patterns: this.operationalPatterns.length,
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
    initializeIncidentResponseFlows() {
        return [
            {
                id: 'critical_system_outage',
                name: 'Critical System Outage Response',
                triggerConditions: {
                    alertTypes: ['system_down', 'service_unavailable', 'critical_error'],
                    severityLevels: ['critical', 'high'],
                    systemCategories: ['core', 'payment', 'authentication', 'database'],
                },
                responsePhases: [
                    {
                        phase: 'immediate_response',
                        duration: '0-5 minutes',
                        actions: ['assess impact', 'notify stakeholders', 'initiate war room'],
                        roles: ['on_call_engineer', 'incident_commander'],
                        escalationTriggers: ['no response in 2 minutes'],
                    },
                    {
                        phase: 'diagnosis',
                        duration: '5-15 minutes',
                        actions: ['check monitoring', 'review logs', 'identify root cause'],
                        roles: ['engineering_team', 'ops_team'],
                        escalationTriggers: ['no progress in 10 minutes'],
                    },
                    {
                        phase: 'mitigation',
                        duration: '15-30 minutes',
                        actions: ['implement fix', 'rollback if needed', 'monitor recovery'],
                        roles: ['engineering_team', 'ops_team'],
                        escalationTriggers: ['fix unsuccessful'],
                    },
                ],
                contextEnhancements: {
                    urgencyBoost: 2.0,
                    requiredSystems: ['monitoring', 'alerting', 'communication'],
                    suggestedIntents: ["EMERGENCY_RESPONSE", "ESCALATION_PATH"],
                },
            },
            {
                id: 'performance_degradation',
                name: 'Performance Degradation Response',
                triggerConditions: {
                    alertTypes: ['high_latency', 'slow_response', 'timeout'],
                    severityLevels: ['medium', 'high'],
                    systemCategories: ['web', 'api', 'database', 'cache'],
                },
                responsePhases: [
                    {
                        phase: 'assessment',
                        duration: '0-10 minutes',
                        actions: ['check metrics', 'identify affected components', 'assess user impact'],
                        roles: ['on_call_engineer'],
                        escalationTriggers: ['widespread impact'],
                    },
                    {
                        phase: 'investigation',
                        duration: '10-30 minutes',
                        actions: ['analyze performance metrics', 'check recent deployments', 'review resource usage'],
                        roles: ['engineering_team'],
                        escalationTriggers: ['no clear cause identified'],
                    },
                    {
                        phase: 'optimization',
                        duration: '30-60 minutes',
                        actions: ['implement performance fixes', 'scale resources', 'optimize queries'],
                        roles: ['engineering_team', 'ops_team'],
                        escalationTriggers: ['performance not improved'],
                    },
                ],
                contextEnhancements: {
                    urgencyBoost: 1.3,
                    requiredSystems: ['monitoring', 'performance_tools'],
                    suggestedIntents: ["TROUBLESHOOT", "FIND_RUNBOOK"],
                },
            },
            {
                id: 'security_incident',
                name: 'Security Incident Response',
                triggerConditions: {
                    alertTypes: ['unauthorized_access', 'security_breach', 'suspicious_activity'],
                    severityLevels: ['high', 'critical'],
                    systemCategories: ['authentication', 'user_data', 'payment', 'admin'],
                },
                responsePhases: [
                    {
                        phase: 'containment',
                        duration: '0-15 minutes',
                        actions: ['isolate affected systems', 'disable compromised accounts', 'preserve evidence'],
                        roles: ['security_team', 'ops_team'],
                        escalationTriggers: ['data breach suspected'],
                    },
                    {
                        phase: 'investigation',
                        duration: '15-60 minutes',
                        actions: ['analyze logs', 'identify attack vector', 'assess damage'],
                        roles: ['security_team', 'forensics_team'],
                        escalationTriggers: ['widespread compromise'],
                    },
                    {
                        phase: 'recovery',
                        duration: '1-4 hours',
                        actions: ['patch vulnerabilities', 'restore services', 'implement additional monitoring'],
                        roles: ['engineering_team', 'security_team'],
                        escalationTriggers: ['recovery unsuccessful'],
                    },
                ],
                contextEnhancements: {
                    urgencyBoost: 1.8,
                    requiredSystems: ['security_tools', 'logging', 'forensics'],
                    suggestedIntents: ["EMERGENCY_RESPONSE", "ESCALATION_PATH"],
                },
            },
        ];
    }
    initializeOperationalPatterns() {
        return [
            {
                id: 'disk_space_alert',
                name: 'Disk Space Alert Pattern',
                applicableIntents: ["FIND_RUNBOOK", "GET_PROCEDURE"],
                triggerKeywords: ['disk space', 'disk full', 'storage', 'filesystem'],
                contextEnhancements: {
                    requiredSystems: ['filesystem', 'monitoring'],
                    impliedSeverity: 'high',
                    suggestedActions: ['cleanup logs', 'archive data', 'expand storage'],
                    escalationThreshold: 95,
                },
                strategyAdjustments: {
                    scoringBoosts: { 'disk': 1.5, 'cleanup': 1.4, 'storage': 1.3 },
                    filterPreferences: { categories: ['runbook', 'procedure'] },
                    resultPriorities: ['immediate_actions', 'prevention', 'monitoring'],
                },
            },
            {
                id: 'memory_leak_pattern',
                name: 'Memory Leak Investigation Pattern',
                applicableIntents: ["TROUBLESHOOT", "FIND_RUNBOOK"],
                triggerKeywords: ['memory leak', 'oom', 'out of memory', 'heap'],
                contextEnhancements: {
                    requiredSystems: ['application', 'monitoring', 'profiling'],
                    impliedSeverity: 'medium',
                    suggestedActions: ['analyze heap dump', 'review memory metrics', 'restart service'],
                    escalationThreshold: 80,
                },
                strategyAdjustments: {
                    scoringBoosts: { 'memory': 1.6, 'heap': 1.4, 'profile': 1.3 },
                    filterPreferences: { categories: ['troubleshooting', 'debugging'] },
                    resultPriorities: ['diagnostic_tools', 'analysis_procedures', 'mitigation'],
                },
            },
            {
                id: 'database_connection_issue',
                name: 'Database Connection Issue Pattern',
                applicableIntents: ["TROUBLESHOOT", "GET_PROCEDURE"],
                triggerKeywords: ['database', 'connection', 'db', 'timeout', 'connection refused'],
                contextEnhancements: {
                    requiredSystems: ['database', 'connection_pool', 'network'],
                    impliedSeverity: 'high',
                    suggestedActions: ['check connection pool', 'verify network', 'restart database'],
                    escalationThreshold: 70,
                },
                strategyAdjustments: {
                    scoringBoosts: { 'database': 1.5, 'connection': 1.4, 'pool': 1.3 },
                    filterPreferences: { categories: ['troubleshooting', 'database'] },
                    resultPriorities: ['connection_diagnostics', 'network_checks', 'database_health'],
                },
            },
            {
                id: 'deployment_rollback',
                name: 'Deployment Rollback Pattern',
                applicableIntents: ["GET_PROCEDURE", "EMERGENCY_RESPONSE"],
                triggerKeywords: ['rollback', 'deployment', 'release', 'revert'],
                contextEnhancements: {
                    requiredSystems: ['deployment', 'version_control', 'monitoring'],
                    impliedSeverity: 'high',
                    suggestedActions: ['stop deployment', 'revert to previous version', 'notify stakeholders'],
                    escalationThreshold: 60,
                },
                strategyAdjustments: {
                    scoringBoosts: { 'rollback': 1.6, 'deployment': 1.4, 'revert': 1.5 },
                    filterPreferences: { categories: ['procedure', 'deployment'] },
                    resultPriorities: ['immediate_rollback', 'verification', 'communication'],
                },
            },
            {
                id: 'ssl_certificate_expiry',
                name: 'SSL Certificate Expiry Pattern',
                applicableIntents: ["FIND_RUNBOOK", "GET_PROCEDURE"],
                triggerKeywords: ['ssl', 'certificate', 'cert', 'tls', 'expired'],
                contextEnhancements: {
                    requiredSystems: ['ssl', 'certificate_management', 'load_balancer'],
                    impliedSeverity: 'high',
                    suggestedActions: ['renew certificate', 'update load balancer', 'verify chain'],
                    escalationThreshold: 50,
                },
                strategyAdjustments: {
                    scoringBoosts: { 'ssl': 1.5, 'certificate': 1.6, 'renewal': 1.4 },
                    filterPreferences: { categories: ['security', 'procedure'] },
                    resultPriorities: ['renewal_procedure', 'verification_steps', 'monitoring_setup'],
                },
            },
        ];
    }
    initializeOrganizationalContext() {
        return {
            businessHours: {
                start: '09:00',
                end: '17:00',
                timezone: 'UTC',
            },
            escalationMatrix: [
                {
                    severity: 'critical',
                    timeToEscalate: '5 minutes',
                    roles: ['incident_commander', 'engineering_manager', 'cto'],
                    contactMethods: ['phone', 'slack', 'pager'],
                },
                {
                    severity: 'high',
                    timeToEscalate: '15 minutes',
                    roles: ['team_lead', 'engineering_manager'],
                    contactMethods: ['slack', 'email'],
                },
                {
                    severity: 'medium',
                    timeToEscalate: '1 hour',
                    roles: ['team_lead'],
                    contactMethods: ['slack', 'email'],
                },
            ],
            systemCriticality: {
                'authentication': {
                    level: 'critical',
                    businessImpact: 'Users cannot login, complete service disruption',
                    stakeholders: ['product_team', 'customer_success'],
                },
                'payment': {
                    level: 'critical',
                    businessImpact: 'Revenue loss, customer trust impact',
                    stakeholders: ['finance_team', 'business_team'],
                },
                'api': {
                    level: 'high',
                    businessImpact: 'Integration partners affected, feature degradation',
                    stakeholders: ['partner_team', 'product_team'],
                },
                'monitoring': {
                    level: 'high',
                    businessImpact: 'Reduced observability, delayed incident detection',
                    stakeholders: ['engineering_team', 'ops_team'],
                },
            },
        };
    }
    initializeMetrics() {
        return {
            totalPredictions: 0,
            contextEnhancements: 0,
            patternMatches: 0,
            flowAnalysisCount: 0,
            averageProcessingTime: 0,
            processingTimePercentiles: { p50: 0, p95: 0, p99: 0 },
            predictionAccuracy: {
                contextPredictions: 0,
                patternMatches: 0,
                flowPredictions: 0,
            },
        };
    }
    normalizeQuery(query) {
        return query
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ');
    }
    applyPatternBasedEnhancements(query, context) {
        for (const pattern of this.operationalPatterns) {
            const keywordMatches = pattern.triggerKeywords.filter(keyword => query.includes(keyword.toLowerCase()));
            if (keywordMatches.length > 0) {
                if (pattern.contextEnhancements.impliedSeverity && !context.severity) {
                    context.severity = pattern.contextEnhancements.impliedSeverity;
                }
                if (pattern.contextEnhancements.requiredSystems) {
                    context.systems = [
                        ...(context.systems || []),
                        ...pattern.contextEnhancements.requiredSystems,
                    ];
                }
                context.metadata = {
                    ...context.metadata,
                    matchedPatterns: [
                        ...(context.metadata?.matchedPatterns || []),
                        pattern.id,
                    ],
                };
                this.metrics.patternMatches++;
            }
        }
    }
    applyIncidentFlowContext(query, context) {
        const matchingFlow = this.analyzeIncidentFlow(query, context);
        if (matchingFlow) {
            if (matchingFlow.contextEnhancements.urgencyBoost > 1.0) {
                context.urgent = true;
            }
            context.systems = [
                ...(context.systems || []),
                ...matchingFlow.contextEnhancements.requiredSystems,
            ];
            context.metadata = {
                ...context.metadata,
                incidentFlow: matchingFlow.id,
                responsePhases: matchingFlow.responsePhases.map(phase => phase.phase),
            };
            this.metrics.flowAnalysisCount++;
        }
    }
    applyOrganizationalContext(context) {
        const now = new Date();
        const currentTime = now.getUTCHours() * 100 + now.getUTCMinutes();
        const businessStart = 900;
        const businessEnd = 1700;
        context.businessHours = currentTime >= businessStart && currentTime <= businessEnd;
        if (context.systems) {
            for (const system of context.systems) {
                const criticality = this.organizationalContext.systemCriticality[system];
                if (criticality && criticality.level === 'critical') {
                    context.urgent = true;
                    break;
                }
            }
        }
    }
    applyTimeBasedContext(context) {
        if (context.businessHours === false) {
            if (context.severity === 'high' || context.severity === 'critical') {
                context.urgent = true;
            }
        }
        const dayOfWeek = new Date().getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            context.metadata = {
                ...context.metadata,
                weekendContext: true,
            };
        }
    }
    calculateFlowMatchScore(query, context, flow) {
        let score = 0;
        const alertTypeMatches = flow.triggerConditions.alertTypes.filter(alertType => query.includes(alertType.replace('_', ' ')));
        score += (alertTypeMatches.length / flow.triggerConditions.alertTypes.length) * 0.4;
        const severity = context?.severity;
        if (severity && flow.triggerConditions.severityLevels.includes(severity)) {
            score += 0.3;
        }
        const systems = context?.systems || [];
        const systemMatches = flow.triggerConditions.systemCategories.filter(category => systems.some(system => system.includes(category) || category.includes(system)));
        score += (systemMatches.length / flow.triggerConditions.systemCategories.length) * 0.3;
        return Math.min(score, 1.0);
    }
    optimizeDataStructures() {
        this.operationalPatterns.sort((a, b) => b.triggerKeywords.length - a.triggerKeywords.length);
        this.incidentResponseFlows.sort((a, b) => {
            const aUrgency = a.contextEnhancements.urgencyBoost;
            const bUrgency = b.contextEnhancements.urgencyBoost;
            return bUrgency - aUrgency;
        });
    }
    updateMetrics(processingTime, contextEnhanced) {
        this.metrics.totalPredictions++;
        if (contextEnhanced) {
            this.metrics.contextEnhancements++;
        }
        this.processingTimes.push(processingTime);
        if (this.processingTimes.length > this.maxProcessingHistorySize) {
            this.processingTimes.shift();
        }
        this.metrics.averageProcessingTime = this.calculateAverageProcessingTime();
        this.metrics.processingTimePercentiles = this.calculateProcessingTimePercentiles();
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
//# sourceMappingURL=operational-intelligence.js.map