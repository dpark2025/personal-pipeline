/**
 * Context Enhancer - Query expansion and enhancement with domain knowledge
 * 
 * Authored by: AI/ML Engineer
 * Date: 2025-01-17
 * 
 * Intelligent query enhancement system that expands queries with operational
 * context, synonyms, domain knowledge, and contextual understanding to improve
 * search relevance by >30% while maintaining <15ms processing time.
 */

import { IntentType, IntentClassification, QueryContext, EnhancedQuery } from './types.js';
import { logger } from '../../utils/logger.js';

interface SynonymGroup {
  primary: string;
  synonyms: string[];
  weight: number;
}

interface OperationalContext {
  domain: string;
  relatedTerms: string[];
  contextualBoosts: Record<string, number>;
  systemMappings: Record<string, string[]>;
}

interface ContextEnhancerConfig {
  maxExpansions: number;
  enableSynonyms: boolean;
  enableContextInjection: boolean;
  maxProcessingTime: number;
  synonymConfidence: number;
  contextWeight: number;
}

interface EnhancementMetrics {
  totalEnhancements: number;
  averageExpansions: number;
  averageContextTerms: number;
  averageProcessingTime: number;
  processingTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  enhancementEffectiveness: {
    synonymsAdded: number;
    contextTermsAdded: number;
    operationalKeywordsFound: number;
  };
}

/**
 * Production-grade context enhancer for operational query expansion
 */
export class ContextEnhancer {
  private synonymGroups: SynonymGroup[];
  private operationalContexts: Map<IntentType, OperationalContext>;
  private domainKnowledge: Map<string, string[]>;
  private metrics: EnhancementMetrics;
  private processingTimes: number[] = [];
  private readonly maxProcessingHistorySize = 1000;

  private readonly config: ContextEnhancerConfig = {
    maxExpansions: 10,
    enableSynonyms: true,
    enableContextInjection: true,
    maxProcessingTime: 15, // 15ms target
    synonymConfidence: 0.8,
    contextWeight: 1.2,
  };

  constructor(config?: Partial<ContextEnhancerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.synonymGroups = this.initializeSynonymGroups();
    this.operationalContexts = this.initializeOperationalContexts();
    this.domainKnowledge = this.initializeDomainKnowledge();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize the context enhancer
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      logger.info('Initializing Context Enhancer...', {
        synonymGroups: this.synonymGroups.length,
        operationalContexts: this.operationalContexts.size,
        targetProcessingTime: `<${this.config.maxProcessingTime}ms`,
      });

      // Pre-process and optimize data structures for faster lookup
      this.optimizeDataStructures();

      const initTime = performance.now() - startTime;
      logger.info('Context Enhancer initialized successfully', {
        initializationTime: `${initTime.toFixed(2)}ms`,
        synonymGroups: this.synonymGroups.length,
        domainTerms: Array.from(this.domainKnowledge.keys()).length,
      });
    } catch (error) {
      logger.error('Failed to initialize Context Enhancer', { error });
      throw new Error(`Context Enhancer initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhance query with contextual understanding and domain knowledge
   */
  async enhanceQuery(
    query: string, 
    context?: QueryContext, 
    intent?: IntentClassification
  ): Promise<EnhancedQuery> {
    const startTime = performance.now();

    try {
      const normalizedQuery = this.normalizeQuery(query);
      
      // Extract operational keywords
      const operationalKeywords = this.extractOperationalKeywords(normalizedQuery, intent);
      
      // Generate synonyms and expansions
      const expansions = this.config.enableSynonyms 
        ? this.generateSynonymExpansions(normalizedQuery, operationalKeywords)
        : [];
      
      // Add contextual terms
      const contextTerms = this.config.enableContextInjection
        ? this.generateContextualTerms(normalizedQuery, context, intent)
        : [];
      
      // Build enhanced query
      const enhancedQuery = this.buildEnhancedQuery(
        normalizedQuery, 
        expansions, 
        contextTerms, 
        operationalKeywords
      );
      
      // Generate boost terms for scoring
      const boostTerms = this.generateBoostTerms(
        operationalKeywords, 
        contextTerms, 
        intent
      );

      const processingTime = performance.now() - startTime;

      const enhancement: EnhancedQuery = {
        originalQuery: query,
        enhancedQuery,
        expansions: expansions.slice(0, this.config.maxExpansions),
        contextTerms,
        operationalKeywords,
        boostTerms,
        processingTime,
      };

      // Update metrics
      this.updateMetrics(enhancement, processingTime);

      // Log performance warning if target not met
      if (processingTime > this.config.maxProcessingTime) {
        logger.warn('Query enhancement exceeded target time', {
          targetTime: `${this.config.maxProcessingTime}ms`,
          actualTime: `${processingTime.toFixed(2)}ms`,
          expansions: expansions.length,
          contextTerms: contextTerms.length,
        });
      }

      logger.debug('Query enhanced', {
        originalLength: query.length,
        enhancedLength: enhancedQuery.length,
        expansions: expansions.length,
        contextTerms: contextTerms.length,
        operationalKeywords: operationalKeywords.length,
        processingTime: `${processingTime.toFixed(2)}ms`,
      });

      return enhancement;
    } catch (error) {
      const processingTime = performance.now() - startTime;
      logger.error('Query enhancement failed', { error, processingTime });

      // Return minimal enhancement
      return {
        originalQuery: query,
        enhancedQuery: query,
        expansions: [],
        contextTerms: [],
        operationalKeywords: [],
        processingTime,
      };
    }
  }

  /**
   * Get enhancement performance metrics
   */
  getMetrics(): EnhancementMetrics {
    return { ...this.metrics };
  }

  /**
   * Get enhancer status
   */
  getStatus(): any {
    return {
      synonymGroups: this.synonymGroups.length,
      operationalContexts: this.operationalContexts.size,
      domainTerms: Array.from(this.domainKnowledge.keys()).length,
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

  private initializeSynonymGroups(): SynonymGroup[] {
    return [
      // Infrastructure terms
      {
        primary: 'database',
        synonyms: ['db', 'mysql', 'postgres', 'postgresql', 'mongodb', 'redis', 'cassandra', 'oracle'],
        weight: 1.0,
      },
      {
        primary: 'server',
        synonyms: ['instance', 'node', 'host', 'machine', 'vm', 'container', 'pod'],
        weight: 1.0,
      },
      {
        primary: 'service',
        synonyms: ['application', 'app', 'process', 'daemon', 'microservice', 'api'],
        weight: 1.0,
      },
      
      // Performance terms
      {
        primary: 'performance',
        synonyms: ['latency', 'response time', 'throughput', 'speed', 'efficiency'],
        weight: 0.9,
      },
      {
        primary: 'memory',
        synonyms: ['ram', 'heap', 'memory usage', 'memory leak', 'oom', 'out of memory'],
        weight: 1.0,
      },
      {
        primary: 'cpu',
        synonyms: ['processor', 'cpu usage', 'cpu load', 'compute', 'processing'],
        weight: 1.0,
      },
      
      // Problem types
      {
        primary: 'issue',
        synonyms: ['problem', 'error', 'bug', 'incident', 'failure', 'outage'],
        weight: 0.9,
      },
      {
        primary: 'alert',
        synonyms: ['notification', 'alarm', 'warning', 'trigger', 'event'],
        weight: 0.9,
      },
      {
        primary: 'restart',
        synonyms: ['reboot', 'reload', 'refresh', 'cycle', 'bounce'],
        weight: 1.0,
      },
      
      // Operations terms
      {
        primary: 'deploy',
        synonyms: ['deployment', 'release', 'rollout', 'publish', 'ship'],
        weight: 0.9,
      },
      {
        primary: 'monitor',
        synonyms: ['monitoring', 'observability', 'metrics', 'tracking', 'surveillance'],
        weight: 0.9,
      },
      {
        primary: 'backup',
        synonyms: ['backup', 'snapshot', 'archive', 'copy', 'dump'],
        weight: 1.0,
      },
      
      // Network terms
      {
        primary: 'network',
        synonyms: ['connectivity', 'connection', 'networking', 'internet', 'link'],
        weight: 1.0,
      },
      {
        primary: 'load balancer',
        synonyms: ['lb', 'proxy', 'reverse proxy', 'nginx', 'haproxy', 'f5'],
        weight: 1.0,
      },
      
      // Security terms
      {
        primary: 'security',
        synonyms: ['auth', 'authentication', 'authorization', 'permissions', 'access'],
        weight: 1.0,
      },
      {
        primary: 'ssl',
        synonyms: ['tls', 'certificate', 'cert', 'https', 'encryption'],
        weight: 1.0,
      },
    ];
  }

  private initializeOperationalContexts(): Map<IntentType, OperationalContext> {
    return new Map([
      [IntentType.FIND_RUNBOOK, {
        domain: 'incident_response',
        relatedTerms: ['alert', 'incident', 'response', 'procedure', 'guide', 'playbook'],
        contextualBoosts: { 'severity': 1.5, 'system': 1.3, 'alert_type': 1.4 },
        systemMappings: {
          'web': ['nginx', 'apache', 'load balancer', 'frontend'],
          'database': ['mysql', 'postgres', 'mongodb', 'redis'],
          'infrastructure': ['kubernetes', 'docker', 'aws', 'cloud'],
        },
      }],
      
      [IntentType.EMERGENCY_RESPONSE, {
        domain: 'critical_operations',
        relatedTerms: ['immediate', 'urgent', 'critical', 'emergency', 'outage', 'down'],
        contextualBoosts: { 'immediate': 2.0, 'critical': 1.8, 'outage': 1.6 },
        systemMappings: {
          'core': ['database', 'authentication', 'payment', 'api'],
          'infrastructure': ['network', 'dns', 'load balancer', 'cdn'],
        },
      }],
      
      [IntentType.ESCALATION_PATH, {
        domain: 'organizational',
        relatedTerms: ['contact', 'escalate', 'manager', 'team', 'on-call', 'support'],
        contextualBoosts: { 'manager': 1.4, 'team': 1.2, 'on-call': 1.6 },
        systemMappings: {
          'roles': ['manager', 'engineer', 'operator', 'admin'],
        },
      }],
      
      [IntentType.GET_PROCEDURE, {
        domain: 'operational_procedures',
        relatedTerms: ['steps', 'procedure', 'instructions', 'how to', 'process'],
        contextualBoosts: { 'steps': 1.3, 'procedure': 1.4, 'instructions': 1.2 },
        systemMappings: {
          'actions': ['restart', 'deploy', 'configure', 'backup', 'restore'],
        },
      }],
      
      [IntentType.TROUBLESHOOT, {
        domain: 'debugging',
        relatedTerms: ['debug', 'diagnose', 'investigate', 'analyze', 'troubleshoot'],
        contextualBoosts: { 'error': 1.3, 'log': 1.2, 'debug': 1.4 },
        systemMappings: {
          'debugging': ['logs', 'metrics', 'traces', 'monitoring'],
        },
      }],
      
      [IntentType.STATUS_CHECK, {
        domain: 'monitoring',
        relatedTerms: ['status', 'health', 'check', 'monitor', 'metrics'],
        contextualBoosts: { 'status': 1.3, 'health': 1.3, 'metrics': 1.2 },
        systemMappings: {
          'monitoring': ['dashboard', 'metrics', 'alerts', 'uptime'],
        },
      }],
      
      [IntentType.CONFIGURATION, {
        domain: 'system_configuration',
        relatedTerms: ['configure', 'config', 'setup', 'settings', 'parameter'],
        contextualBoosts: { 'config': 1.3, 'setup': 1.2, 'settings': 1.1 },
        systemMappings: {
          'config': ['environment', 'parameter', 'variable', 'setting'],
        },
      }],
    ]);
  }

  private initializeDomainKnowledge(): Map<string, string[]> {
    return new Map([
      // System categories
      ['web_servers', ['nginx', 'apache', 'iis', 'lighttpd', 'caddy']],
      ['databases', ['mysql', 'postgres', 'mongodb', 'redis', 'cassandra', 'elasticsearch']],
      ['monitoring', ['prometheus', 'grafana', 'datadog', 'new relic', 'splunk']],
      ['containers', ['docker', 'kubernetes', 'podman', 'containerd']],
      ['cloud_providers', ['aws', 'azure', 'gcp', 'digital ocean', 'linode']],
      ['message_queues', ['rabbitmq', 'kafka', 'sqs', 'redis', 'activemq']],
      
      // Alert types
      ['performance_alerts', ['high cpu', 'memory leak', 'slow response', 'timeout']],
      ['availability_alerts', ['service down', 'connection refused', '404 error', '500 error']],
      ['security_alerts', ['unauthorized access', 'failed login', 'certificate expired']],
      ['capacity_alerts', ['disk full', 'memory usage', 'connection limit', 'queue full']],
      
      // Common procedures
      ['restart_procedures', ['graceful restart', 'rolling restart', 'force restart', 'service reload']],
      ['deployment_procedures', ['blue green', 'canary deployment', 'rolling update', 'hotfix']],
      ['backup_procedures', ['full backup', 'incremental backup', 'point in time', 'snapshot']],
      ['scaling_procedures', ['horizontal scaling', 'vertical scaling', 'auto scaling', 'manual scaling']],
    ]);
  }

  private initializeMetrics(): EnhancementMetrics {
    return {
      totalEnhancements: 0,
      averageExpansions: 0,
      averageContextTerms: 0,
      averageProcessingTime: 0,
      processingTimePercentiles: { p50: 0, p95: 0, p99: 0 },
      enhancementEffectiveness: {
        synonymsAdded: 0,
        contextTermsAdded: 0,
        operationalKeywordsFound: 0,
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

  private extractOperationalKeywords(query: string, intent?: IntentClassification): string[] {
    const keywords: string[] = [];

    // Extract from domain knowledge
    for (const [, terms] of this.domainKnowledge.entries()) {
      for (const term of terms) {
        if (query.includes(term)) {
          keywords.push(term);
        }
      }
    }

    // Extract from synonym groups
    for (const group of this.synonymGroups) {
      if (query.includes(group.primary)) {
        keywords.push(group.primary);
      }
      for (const synonym of group.synonyms) {
        if (query.includes(synonym)) {
          keywords.push(group.primary); // Map to primary term
        }
      }
    }

    // Extract from intent-specific context
    if (intent && this.operationalContexts.has(intent.intent)) {
      const context = this.operationalContexts.get(intent.intent)!;
      for (const term of context.relatedTerms) {
        if (query.includes(term)) {
          keywords.push(term);
        }
      }
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  private generateSynonymExpansions(query: string, operationalKeywords: string[]): string[] {
    const expansions: string[] = [];

    // Add synonyms for operational keywords
    for (const keyword of operationalKeywords) {
      const synonymGroup = this.synonymGroups.find(group => 
        group.primary === keyword || group.synonyms.includes(keyword)
      );
      
      if (synonymGroup) {
        // Add primary term if we found a synonym
        if (synonymGroup.synonyms.includes(keyword)) {
          expansions.push(synonymGroup.primary);
        }
        
        // Add relevant synonyms
        const relevantSynonyms = synonymGroup.synonyms
          .filter(synonym => !query.includes(synonym))
          .slice(0, 3); // Limit synonyms per group
        
        expansions.push(...relevantSynonyms);
      }
    }

    // Add domain-specific expansions
    for (const [, terms] of this.domainKnowledge.entries()) {
      const hasRelatedTerm = terms.some(term => query.includes(term));
      if (hasRelatedTerm) {
        const additionalTerms = terms
          .filter(term => !query.includes(term))
          .slice(0, 2); // Limit terms per domain
        expansions.push(...additionalTerms);
      }
    }

    return expansions;
  }

  private generateContextualTerms(
    query: string,
    context?: QueryContext,
    intent?: IntentClassification
  ): string[] {
    const contextTerms: string[] = [];

    // Add context-based terms
    if (context) {
      if (context.severity) {
        contextTerms.push(context.severity);
      }
      if (context.systems) {
        contextTerms.push(...context.systems);
      }
      if (context.alertType) {
        contextTerms.push(context.alertType);
      }
      if (context.urgent) {
        contextTerms.push('urgent', 'immediate');
      }
    }

    // Add intent-specific context
    if (intent && this.operationalContexts.has(intent.intent)) {
      const operationalContext = this.operationalContexts.get(intent.intent)!;
      
      // Add related terms not already in query
      const newTerms = operationalContext.relatedTerms
        .filter(term => !query.includes(term))
        .slice(0, 3);
      contextTerms.push(...newTerms);
      
      // Add system mappings if relevant
      for (const [, terms] of Object.entries(operationalContext.systemMappings)) {
        const hasRelatedSystem = terms.some(term => 
          query.includes(term) || (context?.systems && context.systems.includes(term))
        );
        if (hasRelatedSystem) {
          const additionalTerms = terms
            .filter(term => !query.includes(term))
            .slice(0, 2);
          contextTerms.push(...additionalTerms);
        }
      }
    }

    return [...new Set(contextTerms)]; // Remove duplicates
  }

  private buildEnhancedQuery(
    originalQuery: string,
    expansions: string[],
    contextTerms: string[],
    _operationalKeywords: string[] // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  ): string {
    const queryParts = [originalQuery];
    
    // Add most relevant expansions
    const topExpansions = expansions.slice(0, Math.floor(this.config.maxExpansions * 0.6));
    if (topExpansions.length > 0) {
      queryParts.push(...topExpansions);
    }
    
    // Add context terms
    const topContextTerms = contextTerms.slice(0, Math.floor(this.config.maxExpansions * 0.4));
    if (topContextTerms.length > 0) {
      queryParts.push(...topContextTerms);
    }

    return queryParts.join(' ');
  }

  private generateBoostTerms(
    operationalKeywords: string[],
    contextTerms: string[],
    intent?: IntentClassification
  ): Record<string, number> {
    const boostTerms: Record<string, number> = {};

    // Boost operational keywords
    for (const keyword of operationalKeywords) {
      boostTerms[keyword] = 1.3;
    }

    // Boost context terms
    for (const term of contextTerms) {
      boostTerms[term] = this.config.contextWeight;
    }

    // Apply intent-specific boosts
    if (intent && this.operationalContexts.has(intent.intent)) {
      const context = this.operationalContexts.get(intent.intent)!;
      for (const [term, boost] of Object.entries(context.contextualBoosts)) {
        if (operationalKeywords.includes(term) || contextTerms.includes(term)) {
          boostTerms[term] = boost;
        }
      }
    }

    return boostTerms;
  }

  private optimizeDataStructures(): void {
    // Sort synonym groups by weight for faster processing
    this.synonymGroups.sort((a, b) => b.weight - a.weight);
    
    // Pre-compile any regex patterns if needed
    // Currently using simple string matching for performance
  }

  private updateMetrics(enhancement: EnhancedQuery, processingTime: number): void {
    this.metrics.totalEnhancements++;
    
    // Update processing time tracking
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > this.maxProcessingHistorySize) {
      this.processingTimes.shift();
    }

    // Update averages
    this.metrics.averageProcessingTime = this.calculateAverageProcessingTime();
    this.metrics.processingTimePercentiles = this.calculateProcessingTimePercentiles();
    
    // Update enhancement effectiveness
    this.metrics.averageExpansions = 
      (this.metrics.averageExpansions * (this.metrics.totalEnhancements - 1) + enhancement.expansions.length) / 
      this.metrics.totalEnhancements;
    
    this.metrics.averageContextTerms = 
      (this.metrics.averageContextTerms * (this.metrics.totalEnhancements - 1) + enhancement.contextTerms.length) / 
      this.metrics.totalEnhancements;

    this.metrics.enhancementEffectiveness.synonymsAdded += enhancement.expansions.length;
    this.metrics.enhancementEffectiveness.contextTermsAdded += enhancement.contextTerms.length;
    this.metrics.enhancementEffectiveness.operationalKeywordsFound += enhancement.operationalKeywords.length;
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