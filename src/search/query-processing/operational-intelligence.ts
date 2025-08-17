/**
 * Operational Intelligence - Domain-specific patterns and incident response flows
 * 
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 * 
 * Advanced operational intelligence system that understands incident response
 * patterns, organizational workflows, and operational context to predict and
 * enhance query context with enterprise operations knowledge.
 */

import { 
  IntentType, 
  QueryContext, 
  OperationalPattern,
} from './types.js';
import { logger } from '../../utils/logger.js';

interface IncidentResponseFlow {
  id: string;
  name: string;
  triggerConditions: {
    alertTypes: string[];
    severityLevels: string[];
    systemCategories: string[];
  };
  responsePhases: Array<{
    phase: string;
    duration: string;
    actions: string[];
    roles: string[];
    escalationTriggers: string[];
  }>;
  contextEnhancements: {
    urgencyBoost: number;
    requiredSystems: string[];
    suggestedIntents: IntentType[];
  };
}

interface OrganizationalContext {
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
  escalationMatrix: Array<{
    severity: string;
    timeToEscalate: string;
    roles: string[];
    contactMethods: string[];
  }>;
  systemCriticality: Record<string, {
    level: 'low' | 'medium' | 'high' | 'critical';
    businessImpact: string;
    stakeholders: string[];
  }>;
}

interface OperationalIntelligenceConfig {
  enablePatternMatching: boolean;
  enableContextPrediction: boolean;
  enableFlowAnalysis: boolean;
  maxProcessingTime: number;
}

interface IntelligenceMetrics {
  totalPredictions: number;
  contextEnhancements: number;
  patternMatches: number;
  flowAnalysisCount: number;
  averageProcessingTime: number;
  processingTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  predictionAccuracy: {
    contextPredictions: number;
    patternMatches: number;
    flowPredictions: number;
  };
}

/**
 * Production-grade operational intelligence for incident response patterns
 */
export class OperationalIntelligence {
  private incidentResponseFlows: IncidentResponseFlow[];
  private operationalPatterns: OperationalPattern[];
  private organizationalContext: OrganizationalContext;
  private metrics: IntelligenceMetrics;
  private processingTimes: number[] = [];
  private readonly maxProcessingHistorySize = 1000;

  private readonly config: OperationalIntelligenceConfig = {
    enablePatternMatching: true,
    enableContextPrediction: true,
    enableFlowAnalysis: true,
    maxProcessingTime: 10, // 10ms target
  };

  constructor(config?: Partial<OperationalIntelligenceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.incidentResponseFlows = this.initializeIncidentResponseFlows();
    this.operationalPatterns = this.initializeOperationalPatterns();
    this.organizationalContext = this.initializeOrganizationalContext();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize the operational intelligence system
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      logger.info('Initializing Operational Intelligence...', {
        incidentFlows: this.incidentResponseFlows.length,
        patterns: this.operationalPatterns.length,
        targetProcessingTime: `<${this.config.maxProcessingTime}ms`,
      });

      // Optimize data structures for faster lookups
      this.optimizeDataStructures();

      const initTime = performance.now() - startTime;
      logger.info('Operational Intelligence initialized successfully', {
        initializationTime: `${initTime.toFixed(2)}ms`,
        flowsLoaded: this.incidentResponseFlows.length,
        patternsLoaded: this.operationalPatterns.length,
      });
    } catch (error) {
      logger.error('Failed to initialize Operational Intelligence', { error });
      throw new Error(`Operational Intelligence initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Predict and enhance context based on query and operational patterns
   */
  async predictContext(query: string, existingContext?: QueryContext): Promise<QueryContext> {
    const startTime = performance.now();

    try {
      const normalizedQuery = this.normalizeQuery(query);
      const enhancedContext = { ...existingContext } as QueryContext;

      // Pattern-based context prediction
      if (this.config.enablePatternMatching) {
        this.applyPatternBasedEnhancements(normalizedQuery, enhancedContext);
      }

      // Incident flow analysis
      if (this.config.enableFlowAnalysis) {
        this.applyIncidentFlowContext(normalizedQuery, enhancedContext);
      }

      // Organizational context enrichment
      this.applyOrganizationalContext(enhancedContext);

      // Time-based context enhancement
      this.applyTimeBasedContext(enhancedContext);

      const processingTime = performance.now() - startTime;

      // Update metrics
      this.updateMetrics(processingTime, enhancedContext !== existingContext);

      // Log performance warning if target not met
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
    } catch (error) {
      const processingTime = performance.now() - startTime;
      logger.error('Context prediction failed', { error, processingTime });

      // Return existing context or minimal context
      return existingContext || {};
    }
  }

  /**
   * Analyze query for incident response flow patterns
   */
  analyzeIncidentFlow(query: string, context?: QueryContext): IncidentResponseFlow | null {
    const normalizedQuery = this.normalizeQuery(query);
    
    for (const flow of this.incidentResponseFlows) {
      const score = this.calculateFlowMatchScore(normalizedQuery, context, flow);
      if (score > 0.7) {
        return flow;
      }
    }

    return null;
  }

  /**
   * Get operational pattern recommendations
   */
  getPatternRecommendations(query: string, intent: IntentType): OperationalPattern[] {
    const normalizedQuery = this.normalizeQuery(query);
    
    return this.operationalPatterns
      .filter(pattern => pattern.applicableIntents.includes(intent))
      .filter(pattern => {
        const keywordMatches = pattern.triggerKeywords.filter(keyword => 
          normalizedQuery.includes(keyword.toLowerCase())
        );
        return keywordMatches.length > 0;
      })
      .slice(0, 3); // Return top 3 recommendations
  }

  /**
   * Get intelligence performance metrics
   */
  getMetrics(): IntelligenceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get intelligence status
   */
  getStatus(): any {
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

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.processingTimes = [];
    this.metrics = this.initializeMetrics();
  }

  // Private methods

  private initializeIncidentResponseFlows(): IncidentResponseFlow[] {
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
          suggestedIntents: [IntentType.EMERGENCY_RESPONSE, IntentType.ESCALATION_PATH],
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
          suggestedIntents: [IntentType.TROUBLESHOOT, IntentType.FIND_RUNBOOK],
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
          suggestedIntents: [IntentType.EMERGENCY_RESPONSE, IntentType.ESCALATION_PATH],
        },
      },
    ];
  }

  private initializeOperationalPatterns(): OperationalPattern[] {
    return [
      {
        id: 'disk_space_alert',
        name: 'Disk Space Alert Pattern',
        applicableIntents: [IntentType.FIND_RUNBOOK, IntentType.GET_PROCEDURE],
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
        applicableIntents: [IntentType.TROUBLESHOOT, IntentType.FIND_RUNBOOK],
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
        applicableIntents: [IntentType.TROUBLESHOOT, IntentType.GET_PROCEDURE],
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
        applicableIntents: [IntentType.GET_PROCEDURE, IntentType.EMERGENCY_RESPONSE],
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
        applicableIntents: [IntentType.FIND_RUNBOOK, IntentType.GET_PROCEDURE],
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

  private initializeOrganizationalContext(): OrganizationalContext {
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

  private initializeMetrics(): IntelligenceMetrics {
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

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private applyPatternBasedEnhancements(query: string, context: QueryContext): void {
    for (const pattern of this.operationalPatterns) {
      const keywordMatches = pattern.triggerKeywords.filter(keyword => 
        query.includes(keyword.toLowerCase())
      );

      if (keywordMatches.length > 0) {
        // Apply context enhancements
        if (pattern.contextEnhancements.impliedSeverity && !context.severity) {
          context.severity = pattern.contextEnhancements.impliedSeverity as any;
        }

        if (pattern.contextEnhancements.requiredSystems) {
          context.systems = [
            ...(context.systems || []),
            ...pattern.contextEnhancements.requiredSystems,
          ];
        }

        // Add metadata for pattern match
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

  private applyIncidentFlowContext(query: string, context: QueryContext): void {
    const matchingFlow = this.analyzeIncidentFlow(query, context);
    
    if (matchingFlow) {
      // Apply urgency boost
      if (matchingFlow.contextEnhancements.urgencyBoost > 1.0) {
        context.urgent = true;
      }

      // Add required systems
      context.systems = [
        ...(context.systems || []),
        ...matchingFlow.contextEnhancements.requiredSystems,
      ];

      // Add flow metadata
      context.metadata = {
        ...context.metadata,
        incidentFlow: matchingFlow.id,
        responsePhases: matchingFlow.responsePhases.map(phase => phase.phase),
      };

      this.metrics.flowAnalysisCount++;
    }
  }

  private applyOrganizationalContext(context: QueryContext): void {
    // Determine business hours
    const now = new Date();
    const currentTime = now.getUTCHours() * 100 + now.getUTCMinutes();
    const businessStart = 900; // 09:00
    const businessEnd = 1700;  // 17:00

    context.businessHours = currentTime >= businessStart && currentTime <= businessEnd;

    // Apply system criticality context
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

  private applyTimeBasedContext(context: QueryContext): void {
    // After hours incidents are typically more urgent
    if (context.businessHours === false) {
      if (context.severity === 'high' || context.severity === 'critical') {
        context.urgent = true;
      }
    }

    // Weekend context (simplified - would need more sophisticated date handling)
    const dayOfWeek = new Date().getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      context.metadata = {
        ...context.metadata,
        weekendContext: true,
      };
    }
  }

  private calculateFlowMatchScore(query: string, context: QueryContext | undefined, flow: IncidentResponseFlow): number {
    let score = 0;

    // Check alert type matches
    const alertTypeMatches = flow.triggerConditions.alertTypes.filter(alertType =>
      query.includes(alertType.replace('_', ' '))
    );
    score += (alertTypeMatches.length / flow.triggerConditions.alertTypes.length) * 0.4;

    // Check severity matches
    const severity = context?.severity;
    if (severity && flow.triggerConditions.severityLevels.includes(severity)) {
      score += 0.3;
    }

    // Check system category matches
    const systems = context?.systems || [];
    const systemMatches = flow.triggerConditions.systemCategories.filter(category =>
      systems.some(system => system.includes(category) || category.includes(system))
    );
    score += (systemMatches.length / flow.triggerConditions.systemCategories.length) * 0.3;

    return Math.min(score, 1.0);
  }

  private optimizeDataStructures(): void {
    // Sort patterns by trigger keyword frequency for faster matching
    this.operationalPatterns.sort((a, b) => b.triggerKeywords.length - a.triggerKeywords.length);
    
    // Sort incident flows by criticality
    this.incidentResponseFlows.sort((a, b) => {
      const aUrgency = a.contextEnhancements.urgencyBoost;
      const bUrgency = b.contextEnhancements.urgencyBoost;
      return bUrgency - aUrgency;
    });
  }

  private updateMetrics(processingTime: number, contextEnhanced: boolean): void {
    this.metrics.totalPredictions++;

    if (contextEnhanced) {
      this.metrics.contextEnhancements++;
    }

    // Update processing time tracking
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > this.maxProcessingHistorySize) {
      this.processingTimes.shift();
    }

    // Update processing time metrics
    this.metrics.averageProcessingTime = this.calculateAverageProcessingTime();
    this.metrics.processingTimePercentiles = this.calculateProcessingTimePercentiles();
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