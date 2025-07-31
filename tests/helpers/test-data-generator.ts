/**
 * Test Data Generator
 * Utilities for generating consistent test data across test suites
 *
 * QA Engineer: Quality assurance framework for milestone 1.3
 * Coverage: Test data generation, fixtures, and utilities
 */

import fs from 'fs/promises';
import path from 'path';
import { CacheContentType } from '../../src/utils/cache';

export interface TestRunbook {
  id: string;
  title: string;
  triggers: string[];
  severity_mapping: Record<string, string>;
  decision_tree?: {
    id: string;
    nodes: Array<{
      id: string;
      type: 'condition' | 'action';
      condition?: string;
      action?: string;
      branches?: Record<string, any>;
    }>;
  };
  procedures: Array<{
    step: string;
    timeout: string;
    failure_handling?: string;
    success_criteria?: string;
  }>;
  metadata: {
    confidence_score: number;
    last_updated: string;
    tags?: string[];
    category?: string;
    priority?: 'high' | 'medium' | 'low';
  };
}

export interface TestProcedure {
  id: string;
  name: string;
  description?: string;
  steps: string[];
  estimated_duration: string;
  prerequisites?: string[];
  success_criteria?: string[];
  failure_recovery?: string[];
  metadata?: {
    complexity: 'low' | 'medium' | 'high';
    frequency: 'daily' | 'weekly' | 'monthly' | 'on-demand';
    last_executed?: string;
    success_rate?: number;
  };
}

export interface TestDecisionTree {
  id: string;
  name: string;
  description: string;
  root_node: string;
  nodes: Array<{
    id: string;
    type: 'condition' | 'action' | 'escalation';
    condition?: string;
    action?: string;
    branches?: Record<string, string>;
    escalation_level?: number;
  }>;
  metadata: {
    confidence_score: number;
    last_validated: string;
    applicable_scenarios: string[];
  };
}

export interface TestKnowledgeBase {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  metadata: {
    created_at: string;
    updated_at: string;
    author: string;
    version: string;
    relevance_score?: number;
  };
}

export class TestDataGenerator {
  private static instance: TestDataGenerator;
  private runbookTemplates: Partial<TestRunbook>[] = [];
  private procedureTemplates: Partial<TestProcedure>[] = [];
  private decisionTreeTemplates: Partial<TestDecisionTree>[] = [];
  private knowledgeBaseTemplates: Partial<TestKnowledgeBase>[] = [];

  private constructor() {
    this.initializeTemplates();
  }

  public static getInstance(): TestDataGenerator {
    if (!TestDataGenerator.instance) {
      TestDataGenerator.instance = new TestDataGenerator();
    }
    return TestDataGenerator.instance;
  }

  private initializeTemplates() {
    this.runbookTemplates = [
      {
        title: 'Database Connection Failure Response',
        triggers: ['database_connection_failure', 'connection_timeout', 'db_unreachable'],
        severity_mapping: { critical: 'immediate', high: 'escalate', medium: 'investigate' },
        procedures: [
          {
            step: 'Check database server status',
            timeout: '30s',
            success_criteria: 'Server responds to ping',
          },
          {
            step: 'Verify network connectivity',
            timeout: '1m',
            failure_handling: 'Check firewall rules',
          },
          {
            step: 'Restart database service',
            timeout: '3m',
            failure_handling: 'Escalate to DBA team',
          },
          {
            step: 'Validate database integrity',
            timeout: '5m',
            success_criteria: 'All tables accessible',
          },
        ],
        metadata: {
          confidence_score: 0.95,
          last_updated: new Date().toISOString(),
          tags: ['database', 'connectivity', 'critical'],
          category: 'infrastructure',
        },
      },
      {
        title: 'High Memory Usage Alert Response',
        triggers: ['high_memory_usage', 'memory_leak_detected', 'oom_warning'],
        severity_mapping: { critical: 'restart', high: 'investigate', medium: 'monitor' },
        procedures: [
          {
            step: 'Identify memory-consuming processes',
            timeout: '2m',
            success_criteria: 'Top processes identified',
          },
          {
            step: 'Analyze memory patterns over time',
            timeout: '5m',
            failure_handling: 'Use alternative monitoring tools',
          },
          {
            step: 'Determine if memory leak is present',
            timeout: '10m',
            success_criteria: 'Memory pattern analyzed',
          },
          {
            step: 'Apply memory optimization or restart service',
            timeout: '3m',
            failure_handling: 'Escalate to development team',
          },
        ],
        metadata: {
          confidence_score: 0.88,
          last_updated: new Date().toISOString(),
          tags: ['memory', 'performance', 'optimization'],
          category: 'performance',
        },
      },
      {
        title: 'API Response Time Degradation',
        triggers: ['slow_api_response', 'api_timeout', 'high_latency'],
        severity_mapping: { critical: 'immediate', high: 'investigate', medium: 'monitor' },
        procedures: [
          {
            step: 'Check API endpoint response times',
            timeout: '1m',
            success_criteria: 'Response times measured',
          },
          {
            step: 'Analyze database query performance',
            timeout: '3m',
            failure_handling: 'Check slow query log',
          },
          {
            step: 'Review application server metrics',
            timeout: '2m',
            success_criteria: 'Server metrics collected',
          },
          {
            step: 'Implement caching or scale resources',
            timeout: '10m',
            failure_handling: 'Escalate to architecture team',
          },
        ],
        metadata: {
          confidence_score: 0.92,
          last_updated: new Date().toISOString(),
          tags: ['api', 'performance', 'latency'],
          category: 'application',
        },
      },
    ];

    this.procedureTemplates = [
      {
        name: 'Database Backup Verification',
        description: 'Verify database backup integrity and accessibility',
        steps: [
          'Connect to backup storage system',
          'List available backup files for last 7 days',
          'Select most recent backup file',
          'Perform backup integrity check',
          'Verify backup can be restored to test environment',
          'Document backup verification results',
        ],
        estimated_duration: '15 minutes',
        prerequisites: ['Access to backup storage', 'Test database environment'],
        success_criteria: [
          'Backup files present',
          'Integrity check passes',
          'Test restore successful',
        ],
        metadata: { complexity: 'medium', frequency: 'daily' },
      },
      {
        name: 'Application Deployment Rollback',
        description: 'Roll back application deployment to previous stable version',
        steps: [
          'Identify current deployment version',
          'Locate previous stable version',
          'Stop current application services',
          'Deploy previous version',
          'Start application services',
          'Verify application functionality',
          'Update monitoring and alerting',
          'Notify stakeholders of rollback',
        ],
        estimated_duration: '20 minutes',
        prerequisites: ['Deployment access', 'Previous version available'],
        success_criteria: ['Application responsive', 'All health checks pass', 'No error alerts'],
        failure_recovery: ['Contact development team', 'Consider emergency hotfix'],
        metadata: { complexity: 'high', frequency: 'on-demand' },
      },
    ];

    this.decisionTreeTemplates = [
      {
        name: 'Incident Escalation Decision Tree',
        description: 'Determine appropriate escalation path for incidents',
        root_node: 'severity_check',
        nodes: [
          {
            id: 'severity_check',
            type: 'condition',
            condition: 'incident.severity === "critical"',
            branches: { true: 'immediate_escalation', false: 'impact_assessment' },
          },
          {
            id: 'immediate_escalation',
            type: 'escalation',
            action: 'Escalate immediately to on-call engineer',
            escalation_level: 1,
          },
          {
            id: 'impact_assessment',
            type: 'condition',
            condition: 'incident.affected_users > 1000',
            branches: { true: 'high_impact_escalation', false: 'standard_response' },
          },
          {
            id: 'high_impact_escalation',
            type: 'escalation',
            action: 'Escalate to incident commander',
            escalation_level: 2,
          },
          {
            id: 'standard_response',
            type: 'action',
            action: 'Follow standard incident response procedure',
          },
        ],
        metadata: {
          confidence_score: 0.94,
          last_validated: new Date().toISOString(),
          applicable_scenarios: ['incidents', 'outages', 'performance_degradation'],
        },
      },
    ];

    this.knowledgeBaseTemplates = [
      {
        title: 'Database Performance Optimization Guide',
        content: `# Database Performance Optimization

## Query Optimization
- Use appropriate indexes for frequently queried columns
- Avoid SELECT * in production queries
- Use EXPLAIN PLAN to analyze query execution

## Connection Management
- Configure appropriate connection pool sizes
- Monitor connection usage patterns
- Implement connection recycling

## Monitoring Best Practices
- Track slow query logs
- Monitor connection counts
- Alert on unusual patterns`,
        category: 'database',
        tags: ['performance', 'optimization', 'queries', 'monitoring'],
        metadata: {
          author: 'Database Team',
          version: '2.1',
        },
      },
      {
        title: 'API Rate Limiting Configuration',
        content: `# API Rate Limiting Best Practices

## Rate Limit Types
- Per-user rate limits: 1000 requests/hour
- Per-IP rate limits: 100 requests/minute
- Global rate limits: 10,000 requests/minute

## Implementation
- Use token bucket algorithm
- Implement graceful degradation
- Provide clear error messages

## Monitoring
- Track rate limit violations
- Monitor legitimate traffic patterns
- Alert on unusual spikes`,
        category: 'api',
        tags: ['rate-limiting', 'security', 'performance', 'configuration'],
        metadata: {
          author: 'API Team',
          version: '1.3',
        },
      },
    ];
  }

  /**
   * Generate a test runbook with realistic data
   */
  public generateRunbook(
    options: {
      id?: string;
      category?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      complexity?: 'simple' | 'moderate' | 'complex';
    } = {}
  ): TestRunbook {
    const template =
      this.runbookTemplates[Math.floor(Math.random() * this.runbookTemplates.length)];
    const timestamp = new Date().toISOString();

    const runbook: TestRunbook = {
      id: options.id || `rb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: template.title || 'Generated Test Runbook',
      triggers: template.triggers || ['test_trigger'],
      severity_mapping: template.severity_mapping || { medium: 'investigate' },
      procedures: template.procedures || [{ step: 'Test step', timeout: '1m' }],
      metadata: {
        confidence_score: template.metadata?.confidence_score || 0.8 + Math.random() * 0.2,
        last_updated: timestamp,
        tags: template.metadata?.tags || ['test'],
        category: options.category || template.metadata?.category || 'test',
        priority: options.severity || 'medium',
      },
    };

    // Add decision tree for complex runbooks
    if (options.complexity === 'complex') {
      runbook.decision_tree = {
        id: `dt-${runbook.id}`,
        nodes: [
          {
            id: 'root',
            type: 'condition',
            condition: 'severity === "critical"',
            branches: { true: 'escalate', false: 'investigate' },
          },
          { id: 'escalate', type: 'action', action: 'Escalate immediately' },
          { id: 'investigate', type: 'action', action: 'Begin investigation' },
        ],
      };
    }

    return runbook;
  }

  /**
   * Generate a test procedure with realistic data
   */
  public generateProcedure(
    options: {
      id?: string;
      complexity?: 'low' | 'medium' | 'high';
      duration?: string;
    } = {}
  ): TestProcedure {
    const template =
      this.procedureTemplates[Math.floor(Math.random() * this.procedureTemplates.length)];

    const procedure: TestProcedure = {
      id: options.id || `proc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: template.name || 'Generated Test Procedure',
      description: template.description || 'Generated test procedure description',
      steps: template.steps || ['Test step 1', 'Test step 2'],
      estimated_duration: options.duration || template.estimated_duration || '10 minutes',
      prerequisites: template.prerequisites || [],
      success_criteria: template.success_criteria || ['Operation completes successfully'],
      failure_recovery: template.failure_recovery || ['Contact support team'],
      metadata: {
        complexity: options.complexity || template.metadata?.complexity || 'medium',
        frequency: template.metadata?.frequency || 'on-demand',
        last_executed: new Date().toISOString(),
        success_rate: 0.85 + Math.random() * 0.15,
      },
    };

    return procedure;
  }

  /**
   * Generate a decision tree with realistic data
   */
  public generateDecisionTree(
    options: {
      id?: string;
      complexity?: 'simple' | 'moderate' | 'complex';
    } = {}
  ): TestDecisionTree {
    const template = this.decisionTreeTemplates[0]; // Use the first template

    const decisionTree: TestDecisionTree = {
      id: options.id || `dt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: template.name || 'Generated Decision Tree',
      description: template.description || 'Generated test decision tree',
      root_node: template.root_node || 'root',
      nodes: template.nodes || [
        {
          id: 'root',
          type: 'condition',
          condition: 'test === true',
          branches: { true: 'action1', false: 'action2' },
        },
        { id: 'action1', type: 'action', action: 'Perform action 1' },
        { id: 'action2', type: 'action', action: 'Perform action 2' },
      ],
      metadata: {
        confidence_score: 0.85 + Math.random() * 0.15,
        last_validated: new Date().toISOString(),
        applicable_scenarios: ['test_scenario', 'generated_scenario'],
      },
    };

    return decisionTree;
  }

  /**
   * Generate knowledge base article with realistic data
   */
  public generateKnowledgeBase(
    options: {
      id?: string;
      category?: string;
      tags?: string[];
    } = {}
  ): TestKnowledgeBase {
    const template =
      this.knowledgeBaseTemplates[Math.floor(Math.random() * this.knowledgeBaseTemplates.length)];
    const timestamp = new Date().toISOString();

    const article: TestKnowledgeBase = {
      id: options.id || `kb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: template.title || 'Generated Knowledge Base Article',
      content: template.content || 'Generated content for testing purposes.',
      category: options.category || template.category || 'general',
      tags: options.tags || template.tags || ['test', 'generated'],
      metadata: {
        created_at: timestamp,
        updated_at: timestamp,
        author: template.metadata?.author || 'Test Generator',
        version: template.metadata?.version || '1.0',
        relevance_score: 0.7 + Math.random() * 0.3,
      },
    };

    return article;
  }

  /**
   * Generate a complete test dataset with all content types
   */
  public generateTestDataset(
    options: {
      runbooks?: number;
      procedures?: number;
      decisionTrees?: number;
      knowledgeBase?: number;
    } = {}
  ) {
    const dataset = {
      runbooks: [] as TestRunbook[],
      procedures: [] as TestProcedure[],
      decision_trees: [] as TestDecisionTree[],
      knowledge_base: [] as TestKnowledgeBase[],
    };

    // Generate runbooks
    const runbookCount = options.runbooks || 5;
    for (let i = 0; i < runbookCount; i++) {
      dataset.runbooks.push(
        this.generateRunbook({
          category: i % 2 === 0 ? 'infrastructure' : 'application',
          complexity: i % 3 === 0 ? 'complex' : 'simple',
        })
      );
    }

    // Generate procedures
    const procedureCount = options.procedures || 3;
    for (let i = 0; i < procedureCount; i++) {
      dataset.procedures.push(
        this.generateProcedure({
          complexity: i % 2 === 0 ? 'high' : 'medium',
        })
      );
    }

    // Generate decision trees
    const decisionTreeCount = options.decisionTrees || 2;
    for (let i = 0; i < decisionTreeCount; i++) {
      dataset.decision_trees.push(
        this.generateDecisionTree({
          complexity: i % 2 === 0 ? 'complex' : 'simple',
        })
      );
    }

    // Generate knowledge base articles
    const knowledgeBaseCount = options.knowledgeBase || 4;
    for (let i = 0; i < knowledgeBaseCount; i++) {
      dataset.knowledge_base.push(
        this.generateKnowledgeBase({
          category: i % 2 === 0 ? 'database' : 'api',
        })
      );
    }

    return dataset;
  }

  /**
   * Save test dataset to filesystem for integration tests
   */
  public async saveTestDataset(
    datasetPath: string,
    dataset: ReturnType<typeof TestDataGenerator.prototype.generateTestDataset>
  ): Promise<void> {
    await fs.mkdir(datasetPath, { recursive: true });

    // Save runbooks
    for (const runbook of dataset.runbooks) {
      await fs.writeFile(
        path.join(datasetPath, `runbook-${runbook.id}.json`),
        JSON.stringify(runbook, null, 2)
      );
    }

    // Save procedures
    for (const procedure of dataset.procedures) {
      await fs.writeFile(
        path.join(datasetPath, `procedure-${procedure.id}.json`),
        JSON.stringify(procedure, null, 2)
      );
    }

    // Save decision trees
    for (const tree of dataset.decision_trees) {
      await fs.writeFile(
        path.join(datasetPath, `decision-tree-${tree.id}.json`),
        JSON.stringify(tree, null, 2)
      );
    }

    // Save knowledge base articles
    for (const article of dataset.knowledge_base) {
      await fs.writeFile(
        path.join(datasetPath, `kb-${article.id}.md`),
        `# ${article.title}\n\n${article.content}\n\n---\nCategory: ${article.category}\nTags: ${article.tags.join(', ')}\nAuthor: ${article.metadata.author}\nVersion: ${article.metadata.version}`
      );
    }
  }

  /**
   * Generate performance test data for load testing
   */
  public generatePerformanceTestData(
    options: {
      scenarios?: number;
      variationsPerScenario?: number;
    } = {}
  ) {
    const scenarios = options.scenarios || 5;
    const variations = options.variationsPerScenario || 10;
    const testData = [];

    const alertTypes = [
      'database_slow_query',
      'high_memory_usage',
      'api_timeout',
      'disk_space_low',
      'cpu_high_usage',
      'network_latency',
      'service_unavailable',
      'cache_miss_rate_high',
    ];

    const severities = ['low', 'medium', 'high', 'critical'];
    const systems = [
      'database',
      'api_gateway',
      'web_server',
      'cache_layer',
      'message_queue',
      'file_storage',
      'monitoring',
      'logging',
    ];

    for (let s = 0; s < scenarios; s++) {
      for (let v = 0; v < variations; v++) {
        testData.push({
          alert_type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          systems: [
            systems[Math.floor(Math.random() * systems.length)],
            ...(Math.random() > 0.7 ? [systems[Math.floor(Math.random() * systems.length)]] : []),
          ],
          timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time in last 24h
          metadata: {
            scenario: s,
            variation: v,
            test_id: `perf-${s}-${v}-${Date.now()}`,
          },
        });
      }
    }

    return testData;
  }

  /**
   * Generate cache warmup data for testing
   */
  public generateCacheWarmupData(
    contentTypes: CacheContentType[] = [
      'runbooks',
      'procedures',
      'decision_trees',
      'knowledge_base',
    ]
  ) {
    const warmupData: any[] = [];

    contentTypes.forEach(type => {
      for (let i = 0; i < 5; i++) {
        let data;

        switch (type) {
          case 'runbooks':
            data = this.generateRunbook({ id: `warmup-rb-${i}` });
            break;
          case 'procedures':
            data = this.generateProcedure({ id: `warmup-proc-${i}` });
            break;
          case 'decision_trees':
            data = this.generateDecisionTree({ id: `warmup-dt-${i}` });
            break;
          case 'knowledge_base':
            data = this.generateKnowledgeBase({ id: `warmup-kb-${i}` });
            break;
        }

        warmupData.push({
          key: { type, identifier: `warmup-${type}-${i}` },
          data,
        });
      }
    });

    return warmupData;
  }
}

// Export singleton instance
export const testDataGenerator = TestDataGenerator.getInstance();
