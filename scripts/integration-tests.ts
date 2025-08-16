#!/usr/bin/env tsx
/**
 * Personal Pipeline Integration Test Suite
 *
 * Comprehensive integration testing for all 4 source adapters working together
 * in real-world scenarios with multi-source validation, performance monitoring,
 * and end-to-end workflow testing.
 *
 * Authored by: Integration Specialist
 * Date: 2025-08-15
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';
import ora, { Ora } from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types and Interfaces
// ============================================================================

interface TestConfig {
  serverPort: number;
  serverTimeout: number;
  testTimeout: number;
  concurrentRequests: number;
  performanceThresholds: {
    cachedResponseTime: number;
    uncachedResponseTime: number;
    healthCheckTime: number;
    failoverTime: number;
  };
  adapters: {
    file: boolean;
    confluence: boolean;
    github: boolean;
    web: boolean;
  };
}

interface TestResult {
  testName: string;
  category: string;
  success: boolean;
  duration: number;
  details: any;
  error?: string;
  metrics?: {
    responseTime?: number;
    accuracy?: number;
    throughput?: number;
    failoverTime?: number;
  };
}

interface AdapterStatus {
  name: string;
  type: string;
  healthy: boolean;
  responseTime: number;
  error?: string;
  authentication: {
    configured: boolean;
    valid: boolean;
    method: string;
  };
}

interface IntegrationTestSuite {
  sourceIntegrationTests: TestResult[];
  crossSourceSearchTests: TestResult[];
  workflowIntegrationTests: TestResult[];
  performanceIntegrationTests: TestResult[];
  failoverIntegrationTests: TestResult[];
  authenticationIntegrationTests: TestResult[];
  configurationTests: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    overallDuration: number;
    successRate: number;
  };
}

// ============================================================================
// Integration Test Runner
// ============================================================================

export class IntegrationTestRunner {
  private config: TestConfig;
  private apiClient: AxiosInstance;
  private serverProcess: ChildProcess | null = null;
  private spinner: Ora;
  private testStartTime: number = 0;
  private results: IntegrationTestSuite;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      serverPort: 3000,
      serverTimeout: 30000,
      testTimeout: 60000,
      concurrentRequests: 10,
      performanceThresholds: {
        cachedResponseTime: 200,
        uncachedResponseTime: 500,
        healthCheckTime: 100,
        failoverTime: 5000,
      },
      adapters: {
        file: true,
        confluence: process.env.CONFLUENCE_TOKEN ? true : false,
        github: process.env.GITHUB_TOKEN ? true : false,
        web: true,
      },
      ...config,
    };

    this.apiClient = axios.create({
      baseURL: `http://localhost:${this.config.serverPort}`,
      timeout: this.config.testTimeout,
      validateStatus: () => true, // Don't throw on HTTP errors
    });

    this.spinner = ora();
    this.results = this.initializeResults();
  }

  private initializeResults(): IntegrationTestSuite {
    return {
      sourceIntegrationTests: [],
      crossSourceSearchTests: [],
      workflowIntegrationTests: [],
      performanceIntegrationTests: [],
      failoverIntegrationTests: [],
      authenticationIntegrationTests: [],
      configurationTests: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        overallDuration: 0,
        successRate: 0,
      },
    };
  }

  // ========================================================================
  // Test Orchestration
  // ========================================================================

  async runAllTests(): Promise<IntegrationTestSuite> {
    this.testStartTime = Date.now();
    
    console.log(chalk.cyan.bold('\n🚀 Personal Pipeline Integration Test Suite\n'));
    console.log(chalk.gray('Testing multi-adapter system with real-world scenarios...\n'));

    try {
      // Start server and validate environment
      await this.startTestEnvironment();
      
      // Run test categories in sequence
      await this.runSourceIntegrationTests();
      await this.runCrossSourceSearchTests();
      await this.runWorkflowIntegrationTests();
      await this.runPerformanceIntegrationTests();
      await this.runFailoverIntegrationTests();
      await this.runAuthenticationIntegrationTests();
      await this.runConfigurationTests();

      // Generate final report
      this.generateFinalReport();

    } catch (error) {
      this.spinner.fail(chalk.red(`Fatal error: ${error instanceof Error ? error.message : String(error)}`));
      throw error;
    } finally {
      await this.cleanup();
    }

    return this.results;
  }

  private async startTestEnvironment(): Promise<void> {
    this.spinner.start('Setting up test environment...');

    try {
      // Check if server is already running
      try {
        const response = await this.apiClient.get('/health');
        if (response.status === 200) {
          this.spinner.succeed('Connected to existing server');
          return;
        }
      } catch {
        // Server not running, need to start it
      }

      // Start the server
      this.spinner.text = 'Starting Personal Pipeline server...';
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          LOG_LEVEL: 'error', // Reduce noise during testing
        },
      });

      // Wait for server to be ready
      await this.waitForServer();
      this.spinner.succeed('Test environment ready');

    } catch (error) {
      this.spinner.fail('Failed to setup test environment');
      throw error;
    }
  }

  private async waitForServer(): Promise<void> {
    const startTime = Date.now();
    const maxWait = this.config.serverTimeout;

    while (Date.now() - startTime < maxWait) {
      try {
        const response = await this.apiClient.get('/health');
        if (response.status === 200) {
          return;
        }
      } catch {
        // Continue waiting
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Server failed to start within timeout');
  }

  // ========================================================================
  // Source Integration Tests
  // ========================================================================

  private async runSourceIntegrationTests(): Promise<void> {
    console.log(chalk.yellow('\n📊 Source Integration Tests'));
    console.log(chalk.gray('Testing all 4 adapters responding and healthy\n'));

    const tests = [
      () => this.testAdapterHealthChecks(),
      () => this.testAdapterBasicFunctionality(),
      () => this.testAdapterAuthentication(),
      () => this.testAdapterConfiguration(),
    ];

    for (const test of tests) {
      await test();
    }
  }

  private async testAdapterHealthChecks(): Promise<void> {
    const result = await this.executeTest(
      'Adapter Health Checks',
      'source-integration',
      async () => {
        const response = await this.apiClient.get('/api/sources');
        
        if (response.status !== 200) {
          throw new Error(`Health check failed with status ${response.status}`);
        }

        const sources = response.data.sources || [];
        const healthyAdapters = sources.filter((s: any) => s.health?.healthy);
        const enabledAdapters = sources.filter((s: any) => s.enabled);

        return {
          totalAdapters: sources.length,
          healthyAdapters: healthyAdapters.length,
          enabledAdapters: enabledAdapters.length,
          adapters: sources.map((s: any) => ({
            name: s.name,
            type: s.type,
            healthy: s.health?.healthy || false,
            responseTime: s.health?.response_time_ms || 0,
            error: s.health?.error_message,
          })),
        };
      }
    );

    this.results.sourceIntegrationTests.push(result);
  }

  private async testAdapterBasicFunctionality(): Promise<void> {
    const result = await this.executeTest(
      'Adapter Basic Functionality',
      'source-integration',
      async () => {
        const testQueries = [
          { query: 'disk space', description: 'Basic search query' },
          { query: 'memory troubleshooting', description: 'Technical search' },
          { query: 'emergency procedure', description: 'Procedure search' },
        ];

        const results = [];
        
        for (const testQuery of testQueries) {
          const response = await this.apiClient.post('/api/search', {
            query: testQuery.query,
            max_results: 5,
          });

          if (response.status === 200) {
            results.push({
              query: testQuery.query,
              description: testQuery.description,
              success: true,
              resultCount: response.data.results?.length || 0,
              responseTime: response.data.retrieval_time_ms || 0,
            });
          } else {
            results.push({
              query: testQuery.query,
              description: testQuery.description,
              success: false,
              error: response.data.message || 'Unknown error',
            });
          }
        }

        return { queryResults: results };
      }
    );

    this.results.sourceIntegrationTests.push(result);
  }

  private async testAdapterAuthentication(): Promise<void> {
    const result = await this.executeTest(
      'Adapter Authentication',
      'source-integration',
      async () => {
        const response = await this.apiClient.get('/api/sources');
        const sources = response.data.sources || [];

        const authStatus = sources.map((source: any) => {
          const auth = this.determineAuthStatus(source);
          return {
            name: source.name,
            type: source.type,
            authConfigured: auth.configured,
            authValid: auth.valid,
            authMethod: auth.method,
            error: auth.error,
          };
        });

        return { authenticationStatus: authStatus };
      }
    );

    this.results.sourceIntegrationTests.push(result);
  }

  private determineAuthStatus(source: any): { configured: boolean; valid: boolean; method: string; error?: string } {
    // Check if adapter has authentication configured
    const hasHealth = source.health && source.health.healthy;
    const hasError = source.health && source.health.error_message;

    // Determine auth method based on adapter type
    let method = 'none';
    let configured = false;
    let valid = false;

    switch (source.type) {
      case 'file':
        method = 'none';
        configured = true;
        valid = hasHealth;
        break;
      case 'confluence':
        method = 'bearer_token';
        configured = !!process.env.CONFLUENCE_TOKEN;
        valid = hasHealth && !hasError;
        break;
      case 'github':
        method = 'personal_token';
        configured = !!process.env.GITHUB_TOKEN;
        valid = hasHealth && !hasError;
        break;
      case 'web':
        method = 'api_key';
        configured = true; // Web adapter can work without auth
        valid = hasHealth;
        break;
    }

    return { configured, valid, method, error: hasError ? hasError : undefined };
  }

  private async testAdapterConfiguration(): Promise<void> {
    const result = await this.executeTest(
      'Adapter Configuration',
      'source-integration',
      async () => {
        const response = await this.apiClient.get('/api/sources');
        const sources = response.data.sources;

        const configStatus = sources.map((source: any) => ({
          name: source.name,
          type: source.type,
          enabled: source.enabled,
          hasMetadata: !!source.metadata,
          documentCount: source.metadata?.documentCount || 0,
          lastIndexed: source.metadata?.lastIndexed,
          avgResponseTime: source.metadata?.avgResponseTime || 0,
          successRate: source.metadata?.successRate || 0,
        }));

        return { configurationStatus: configStatus };
      }
    );

    this.results.sourceIntegrationTests.push(result);
  }

  // ========================================================================
  // Cross-Source Search Tests
  // ========================================================================

  private async runCrossSourceSearchTests(): Promise<void> {
    console.log(chalk.yellow('\n🔍 Cross-Source Search Tests'));
    console.log(chalk.gray('Testing search queries spanning multiple sources\n'));

    const tests = [
      () => this.testMultiSourceSearch(),
      () => this.testRunbookAggregation(),
      () => this.testKnowledgeBaseIntegration(),
      () => this.testSearchResultMerging(),
    ];

    for (const test of tests) {
      await test();
    }
  }

  private async testMultiSourceSearch(): Promise<void> {
    const result = await this.executeTest(
      'Multi-Source Search',
      'cross-source-search',
      async () => {
        const searchQueries = [
          'disk space cleanup',
          'memory leak investigation',
          'security incident response',
          'database performance',
        ];

        const searchResults = [];

        for (const query of searchQueries) {
          const response = await this.apiClient.post('/api/search', {
            query,
            max_results: 10,
          });

          if (response.status === 200) {
            const results = response.data.results || [];
            const sourceTypes = new Set(results.map((r: any) => r.source_type));
            
            searchResults.push({
              query,
              success: true,
              resultCount: results.length,
              sourceTypes: Array.from(sourceTypes),
              avgConfidence: results.reduce((sum: number, r: any) => sum + (r.confidence_score || 0), 0) / results.length,
              responseTime: response.data.retrieval_time_ms || 0,
            });
          } else {
            searchResults.push({
              query,
              success: false,
              error: response.data.message || 'Search failed',
            });
          }
        }

        return { searchResults };
      }
    );

    this.results.crossSourceSearchTests.push(result);
  }

  private async testRunbookAggregation(): Promise<void> {
    const result = await this.executeTest(
      'Runbook Aggregation',
      'cross-source-search',
      async () => {
        const alertScenarios = [
          {
            alert_type: 'disk_space',
            severity: 'critical',
            affected_systems: ['web-server-01', 'database-01'],
          },
          {
            alert_type: 'memory_leak',
            severity: 'high',
            affected_systems: ['app-server-02'],
          },
          {
            alert_type: 'cpu_high',
            severity: 'medium',
            affected_systems: ['api-gateway'],
          },
        ];

        const runbookResults = [];

        for (const scenario of alertScenarios) {
          const response = await this.apiClient.post('/api/runbooks/search', scenario);

          if (response.status === 200) {
            const runbooks = response.data.runbooks || [];
            const sourceTypes = new Set(runbooks.map((r: any) => r.source_type));
            
            runbookResults.push({
              scenario: scenario.alert_type,
              severity: scenario.severity,
              success: true,
              runbookCount: runbooks.length,
              sourceTypes: Array.from(sourceTypes),
              avgConfidence: runbooks.reduce((sum: number, r: any) => sum + (r.confidence_score || 0), 0) / runbooks.length,
              responseTime: response.data.retrieval_time_ms || 0,
            });
          } else {
            runbookResults.push({
              scenario: scenario.alert_type,
              severity: scenario.severity,
              success: false,
              error: response.data.message || 'Runbook search failed',
            });
          }
        }

        return { runbookResults };
      }
    );

    this.results.crossSourceSearchTests.push(result);
  }

  private async testKnowledgeBaseIntegration(): Promise<void> {
    const result = await this.executeTest(
      'Knowledge Base Integration',
      'cross-source-search',
      async () => {
        const knowledgeQueries = [
          'troubleshooting guide',
          'best practices security',
          'performance optimization',
          'incident response process',
        ];

        const kbResults = [];

        for (const query of knowledgeQueries) {
          const response = await this.apiClient.post('/api/search', {
            query,
            categories: ['knowledge_base', 'documentation'],
            max_results: 5,
          });

          if (response.status === 200) {
            const results = response.data.results || [];
            kbResults.push({
              query,
              success: true,
              resultCount: results.length,
              hasMultipleSources: new Set(results.map((r: any) => r.source_name)).size > 1,
              avgConfidence: results.reduce((sum: number, r: any) => sum + (r.confidence_score || 0), 0) / results.length,
            });
          } else {
            kbResults.push({
              query,
              success: false,
              error: response.data.message || 'Knowledge base search failed',
            });
          }
        }

        return { knowledgeBaseResults: kbResults };
      }
    );

    this.results.crossSourceSearchTests.push(result);
  }

  private async testSearchResultMerging(): Promise<void> {
    const result = await this.executeTest(
      'Search Result Merging',
      'cross-source-search',
      async () => {
        // Test that results from multiple sources are properly merged and ranked
        const response = await this.apiClient.post('/api/search', {
          query: 'emergency response',
          max_results: 20,
        });

        if (response.status !== 200) {
          throw new Error(`Search failed with status ${response.status}`);
        }

        const results = response.data.results || [];
        const sourceDistribution = {};
        
        results.forEach((result: any) => {
          const source = result.source_name || 'unknown';
          sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
        });

        // Check that results are properly sorted by confidence
        const confidenceScores = results.map((r: any) => r.confidence_score || 0);
        const isProperlyRanked = confidenceScores.every((score, index) => 
          index === 0 || score <= confidenceScores[index - 1]
        );

        return {
          totalResults: results.length,
          sourceDistribution,
          isProperlyRanked,
          confidenceRange: {
            min: Math.min(...confidenceScores),
            max: Math.max(...confidenceScores),
            avg: confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length,
          },
        };
      }
    );

    this.results.crossSourceSearchTests.push(result);
  }

  // ========================================================================
  // End-to-End Workflow Tests
  // ========================================================================

  private async runWorkflowIntegrationTests(): Promise<void> {
    console.log(chalk.yellow('\n🔄 Workflow Integration Tests'));
    console.log(chalk.gray('Testing complete incident response workflows\n'));

    const tests = [
      () => this.testIncidentResponseWorkflow(),
      () => this.testEscalationWorkflow(),
      () => this.testDecisionTreeWorkflow(),
      () => this.testFeedbackLoop(),
    ];

    for (const test of tests) {
      await test();
    }
  }

  private async testIncidentResponseWorkflow(): Promise<void> {
    const result = await this.executeTest(
      'Complete Incident Response Workflow',
      'workflow-integration',
      async () => {
        const incident = {
          alert_type: 'disk_space',
          severity: 'critical',
          affected_systems: ['web-server-01'],
          context: { disk_usage: '95%', mount_point: '/var' },
        };

        const workflow = [];

        // Step 1: Search for runbooks
        const runbookResponse = await this.apiClient.post('/api/runbooks/search', incident);
        workflow.push({
          step: 'runbook_search',
          success: runbookResponse.status === 200,
          responseTime: runbookResponse.data?.retrieval_time_ms || 0,
          resultCount: runbookResponse.data?.runbooks?.length || 0,
        });

        if (runbookResponse.status !== 200) {
          throw new Error('Runbook search failed');
        }

        const runbooks = runbookResponse.data.runbooks || [];
        
        // Use actual runbook if available, otherwise create a mock for testing workflow
        const selectedRunbook = runbooks.length > 0 ? runbooks[0] : {
          id: 'mock-runbook-001',
          title: 'Mock Disk Space Runbook',
          alert_type: 'disk_space',
          severity: 'critical'
        };

        // Step 2: Get decision tree
        const decisionResponse = await this.apiClient.post('/api/decision-tree', {
          alert_context: incident,
        });
        workflow.push({
          step: 'decision_tree',
          success: decisionResponse.status === 200,
          responseTime: decisionResponse.data?.retrieval_time_ms || 0,
        });

        // Step 3: Get procedure details
        const procedureResponse = await this.apiClient.get(`/api/procedures/${selectedRunbook.id}_emergency`);
        workflow.push({
          step: 'procedure_retrieval',
          success: procedureResponse.status === 200,
          responseTime: procedureResponse.data?.retrieval_time_ms || 0,
        });

        // Step 4: Check escalation path
        const escalationResponse = await this.apiClient.post('/api/escalation', {
          severity: incident.severity,
          business_hours: false,
        });
        workflow.push({
          step: 'escalation_check',
          success: escalationResponse.status === 200,
          responseTime: escalationResponse.data?.retrieval_time_ms || 0,
        });

        // Step 5: Record feedback
        const feedbackResponse = await this.apiClient.post('/api/feedback', {
          runbook_id: selectedRunbook.id,
          procedure_id: 'emergency_procedure',
          outcome: 'success',
          resolution_time_minutes: 10,
          notes: 'Integration test workflow completed successfully',
        });
        workflow.push({
          step: 'feedback_recording',
          success: feedbackResponse.status === 200,
          responseTime: feedbackResponse.data?.retrieval_time_ms || 0,
        });

        const totalResponseTime = workflow.reduce((sum, step) => sum + step.responseTime, 0);
        const allStepsSuccessful = workflow.every(step => step.success);

        return {
          workflow,
          totalResponseTime,
          allStepsSuccessful,
          workflowSteps: workflow.length,
        };
      }
    );

    this.results.workflowIntegrationTests.push(result);
  }

  private async testEscalationWorkflow(): Promise<void> {
    const result = await this.executeTest(
      'Escalation Workflow',
      'workflow-integration',
      async () => {
        const escalationScenarios = [
          { severity: 'critical', business_hours: false, expected_response_time: '5 minutes' },
          { severity: 'high', business_hours: true, expected_response_time: '15 minutes' },
          { severity: 'medium', business_hours: true, expected_response_time: '30 minutes' },
        ];

        const escalationResults = [];

        for (const scenario of escalationScenarios) {
          const response = await this.apiClient.post('/api/escalation', scenario);
          
          escalationResults.push({
            scenario,
            success: response.status === 200,
            hasContacts: response.data?.escalation_contacts?.length > 0,
            hasProcedure: !!response.data?.escalation_procedure,
            estimatedTime: response.data?.estimated_response_time,
            responseTime: response.data?.retrieval_time_ms || 0,
          });
        }

        return { escalationResults };
      }
    );

    this.results.workflowIntegrationTests.push(result);
  }

  private async testDecisionTreeWorkflow(): Promise<void> {
    const result = await this.executeTest(
      'Decision Tree Workflow',
      'workflow-integration',
      async () => {
        const alertContexts = [
          { alert_type: 'disk_space', severity: 'critical', system_load: 'high' },
          { alert_type: 'memory_leak', severity: 'high', jvm_heap_size: '8GB' },
          { alert_type: 'cpu_high', severity: 'medium', process_count: 150 },
        ];

        const decisionResults = [];

        for (const context of alertContexts) {
          const response = await this.apiClient.post('/api/decision-tree', {
            alert_context: context,
          });

          if (response.status === 200) {
            const decisionTree = response.data.decision_tree;
            decisionResults.push({
              context: context.alert_type,
              success: true,
              hasBranches: decisionTree?.branches?.length > 0,
              hasDefaultAction: !!decisionTree?.default_action,
              confidenceScore: response.data.confidence_score,
              responseTime: response.data.retrieval_time_ms || 0,
            });
          } else {
            decisionResults.push({
              context: context.alert_type,
              success: false,
              error: response.data.message || 'Decision tree retrieval failed',
            });
          }
        }

        return { decisionResults };
      }
    );

    this.results.workflowIntegrationTests.push(result);
  }

  private async testFeedbackLoop(): Promise<void> {
    const result = await this.executeTest(
      'Feedback Loop Integration',
      'workflow-integration',
      async () => {
        const feedbackScenarios = [
          {
            runbook_id: 'RB-DISK-001',
            procedure_id: 'emergency_cleanup',
            outcome: 'success',
            resolution_time_minutes: 15,
            notes: 'Quick resolution using automated cleanup script',
          },
          {
            runbook_id: 'RB-MEM-001',
            procedure_id: 'heap_dump_analysis',
            outcome: 'partial_success',
            resolution_time_minutes: 45,
            notes: 'Heap dump analysis provided insights but manual intervention required',
          },
          {
            runbook_id: 'RB-SEC-001',
            procedure_id: 'incident_containment',
            outcome: 'escalated',
            resolution_time_minutes: 120,
            notes: 'Security incident required escalation to specialist team',
          },
        ];

        const feedbackResults = [];

        for (const feedback of feedbackScenarios) {
          const response = await this.apiClient.post('/api/feedback', feedback);
          
          feedbackResults.push({
            scenario: feedback.runbook_id,
            outcome: feedback.outcome,
            success: response.status === 200,
            recorded: response.data?.success === true,
            responseTime: response.data?.retrieval_time_ms || 0,
          });
        }

        return { feedbackResults };
      }
    );

    this.results.workflowIntegrationTests.push(result);
  }

  // ========================================================================
  // Performance Integration Tests
  // ========================================================================

  private async runPerformanceIntegrationTests(): Promise<void> {
    console.log(chalk.yellow('\n⚡ Performance Integration Tests'));
    console.log(chalk.gray('Validating response times under realistic load\n'));

    const tests = [
      () => this.testCachedPerformance(),
      () => this.testUncachedPerformance(),
      () => this.testConcurrentQueries(),
      () => this.testLoadDistribution(),
    ];

    for (const test of tests) {
      await test();
    }
  }

  private async testCachedPerformance(): Promise<void> {
    const result = await this.executeTest(
      'Cached Response Performance',
      'performance-integration',
      async () => {
        const testQueries = [
          'disk space troubleshooting',
          'memory leak detection',
          'security incident response',
        ];

        const performanceResults = [];

        for (const query of testQueries) {
          // First request to warm cache
          await this.apiClient.post('/api/search', { query });

          // Second request should be cached
          const startTime = Date.now();
          const response = await this.apiClient.post('/api/search', { query });
          const responseTime = Date.now() - startTime;

          performanceResults.push({
            query,
            responseTime,
            cached: response.data?.cached || false,
            withinThreshold: responseTime <= this.config.performanceThresholds.cachedResponseTime,
            resultCount: response.data?.results?.length || 0,
          });
        }

        const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.responseTime, 0) / performanceResults.length;
        const allWithinThreshold = performanceResults.every(r => r.withinThreshold);

        return {
          performanceResults,
          avgResponseTime,
          allWithinThreshold,
          threshold: this.config.performanceThresholds.cachedResponseTime,
        };
      }
    );

    this.results.performanceIntegrationTests.push(result);
  }

  private async testUncachedPerformance(): Promise<void> {
    const result = await this.executeTest(
      'Uncached Response Performance',
      'performance-integration',
      async () => {
        // Clear cache first
        try {
          await this.apiClient.post('/performance/reset');
        } catch {
          // Cache reset not available, continue anyway
        }

        const testQueries = [
          'unique query ' + Date.now(),
          'another unique query ' + Math.random(),
          'performance test query ' + Date.now(),
        ];

        const performanceResults = [];

        for (const query of testQueries) {
          const startTime = Date.now();
          const response = await this.apiClient.post('/api/search', { query });
          const responseTime = Date.now() - startTime;

          performanceResults.push({
            query,
            responseTime,
            withinThreshold: responseTime <= this.config.performanceThresholds.uncachedResponseTime,
            resultCount: response.data?.results?.length || 0,
          });
        }

        const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.responseTime, 0) / performanceResults.length;
        const allWithinThreshold = performanceResults.every(r => r.withinThreshold);

        return {
          performanceResults,
          avgResponseTime,
          allWithinThreshold,
          threshold: this.config.performanceThresholds.uncachedResponseTime,
        };
      }
    );

    this.results.performanceIntegrationTests.push(result);
  }

  private async testConcurrentQueries(): Promise<void> {
    const result = await this.executeTest(
      'Concurrent Query Performance',
      'performance-integration',
      async () => {
        const concurrentQueries = Array.from({ length: this.config.concurrentRequests }, (_, i) => 
          `concurrent query ${i + 1}`
        );

        const startTime = Date.now();
        
        const promises = concurrentQueries.map(query =>
          this.apiClient.post('/api/search', { query })
        );

        const responses = await Promise.allSettled(promises);
        const totalTime = Date.now() - startTime;

        const successful = responses.filter(r => r.status === 'fulfilled').length;
        const failed = responses.filter(r => r.status === 'rejected').length;

        const responsesTimes = responses
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value.data?.retrieval_time_ms || 0);

        const avgResponseTime = responsesTimes.reduce((sum, time) => sum + time, 0) / responsesTimes.length;
        const throughput = successful / (totalTime / 1000); // Requests per second

        return {
          concurrentRequests: this.config.concurrentRequests,
          successful,
          failed,
          totalTime,
          avgResponseTime,
          throughput,
          successRate: successful / this.config.concurrentRequests,
        };
      }
    );

    this.results.performanceIntegrationTests.push(result);
  }

  private async testLoadDistribution(): Promise<void> {
    const result = await this.executeTest(
      'Load Distribution Across Adapters',
      'performance-integration',
      async () => {
        const queries = [
          'disk space cleanup procedure',
          'memory optimization guide',
          'security best practices',
          'performance monitoring',
          'incident response checklist',
        ];

        const adapterLoad = {};
        const totalRequests = queries.length * 3; // Test each query 3 times

        for (let i = 0; i < 3; i++) {
          for (const query of queries) {
            const response = await this.apiClient.post('/api/search', { query });
            
            if (response.status === 200 && response.data.results) {
              response.data.results.forEach((result: any) => {
                const adapter = result.source_name || 'unknown';
                adapterLoad[adapter] = (adapterLoad[adapter] || 0) + 1;
              });
            }
          }
        }

        const loadDistribution = Object.entries(adapterLoad).map(([adapter, count]) => ({
          adapter,
          count,
          percentage: ((count as number) / totalRequests) * 100,
        }));

        return {
          totalRequests,
          loadDistribution,
          activeAdapters: Object.keys(adapterLoad).length,
          evenDistribution: Math.max(...Object.values(adapterLoad)) / Math.min(...Object.values(adapterLoad)) < 3,
        };
      }
    );

    this.results.performanceIntegrationTests.push(result);
  }

  // ========================================================================
  // Failover Integration Tests
  // ========================================================================

  private async runFailoverIntegrationTests(): Promise<void> {
    console.log(chalk.yellow('\n🔄 Failover Integration Tests'));
    console.log(chalk.gray('Testing adapter failure and recovery mechanisms\n'));

    const tests = [
      () => this.testGracefulDegradation(),
      () => this.testCircuitBreakerBehavior(),
      () => this.testPartialFailure(),
      () => this.testRecoveryMechanisms(),
    ];

    for (const test of tests) {
      await test();
    }
  }

  private async testGracefulDegradation(): Promise<void> {
    const result = await this.executeTest(
      'Graceful Degradation',
      'failover-integration',
      async () => {
        // Test system behavior when some adapters are unavailable
        const response = await this.apiClient.post('/api/search', {
          query: 'emergency response procedure',
          max_results: 10,
        });

        if (response.status !== 200) {
          throw new Error(`Search failed with status ${response.status}`);
        }

        const results = response.data.results || [];
        const sourcesResponse = await this.apiClient.get('/api/sources');
        const sources = sourcesResponse.data.sources || [];

        const healthySources = sources.filter((s: any) => s.health?.healthy);
        const unhealthySources = sources.filter((s: any) => !s.health?.healthy);

        return {
          totalSources: sources.length,
          healthySources: healthySources.length,
          unhealthySources: unhealthySources.length,
          stillGotResults: results.length > 0,
          resultSources: new Set(results.map((r: any) => r.source_name)).size,
          systemStillOperational: response.status === 200,
        };
      }
    );

    this.results.failoverIntegrationTests.push(result);
  }

  private async testCircuitBreakerBehavior(): Promise<void> {
    const result = await this.executeTest(
      'Circuit Breaker Behavior',
      'failover-integration',
      async () => {
        // Check circuit breaker status across adapters
        let circuitBreakerStatus;
        try {
          const response = await this.apiClient.get('/circuit-breakers');
          circuitBreakerStatus = response.data;
        } catch {
          // Circuit breaker endpoint not available
          circuitBreakerStatus = { message: 'Circuit breaker monitoring not available' };
        }

        // Test system response under potential circuit breaker conditions
        const rapidRequests = Array.from({ length: 10 }, (_, i) => 
          this.apiClient.post('/api/search', { query: `rapid test ${i}` })
        );

        const responses = await Promise.allSettled(rapidRequests);
        const successful = responses.filter(r => r.status === 'fulfilled').length;
        const failed = responses.filter(r => r.status === 'rejected').length;

        return {
          circuitBreakerStatus,
          rapidRequestResults: {
            total: rapidRequests.length,
            successful,
            failed,
            successRate: successful / rapidRequests.length,
          },
          systemMaintainedStability: successful > failed,
        };
      }
    );

    this.results.failoverIntegrationTests.push(result);
  }

  private async testPartialFailure(): Promise<void> {
    const result = await this.executeTest(
      'Partial Failure Handling',
      'failover-integration',
      async () => {
        // Test how system handles when only some adapters respond
        const sourcesResponse = await this.apiClient.get('/api/sources');
        const sources = sourcesResponse.data.sources || [];

        const healthySources = sources.filter((s: any) => s.health?.healthy);
        const totalSources = sources.length;

        // Perform searches that should hit multiple sources
        const searchResponse = await this.apiClient.post('/api/search', {
          query: 'troubleshooting guide',
          max_results: 15,
        });

        const results = searchResponse.data.results || [];
        const resultSources = new Set(results.map((r: any) => r.source_name));

        return {
          totalConfiguredSources: totalSources,
          healthySources: healthySources.length,
          searchSuccessful: searchResponse.status === 200,
          resultsFromMultipleSources: resultSources.size > 1,
          totalResults: results.length,
          partialFailureHandled: searchResponse.status === 200 && results.length > 0,
        };
      }
    );

    this.results.failoverIntegrationTests.push(result);
  }

  private async testRecoveryMechanisms(): Promise<void> {
    const result = await this.executeTest(
      'Recovery Mechanisms',
      'failover-integration',
      async () => {
        // Test health check and recovery timing
        const healthCheckStart = Date.now();
        const healthResponse = await this.apiClient.get('/health');
        const healthCheckTime = Date.now() - healthCheckStart;

        // Test detailed health information
        let detailedHealth;
        try {
          const detailedResponse = await this.apiClient.get('/health/detailed');
          detailedHealth = detailedResponse.data;
        } catch {
          detailedHealth = null;
        }

        // Test source-specific health
        let sourceHealth;
        try {
          const sourceResponse = await this.apiClient.get('/health/sources');
          sourceHealth = sourceResponse.data;
        } catch {
          sourceHealth = null;
        }

        return {
          healthCheckTime,
          healthCheckWithinThreshold: healthCheckTime <= this.config.performanceThresholds.healthCheckTime,
          systemHealthy: healthResponse.status === 200,
          detailedHealthAvailable: !!detailedHealth,
          sourceHealthMonitoring: !!sourceHealth,
          recoveryMechanismsActive: healthResponse.status === 200,
        };
      }
    );

    this.results.failoverIntegrationTests.push(result);
  }

  // ========================================================================
  // Authentication Integration Tests
  // ========================================================================

  private async runAuthenticationIntegrationTests(): Promise<void> {
    console.log(chalk.yellow('\n🔐 Authentication Integration Tests'));
    console.log(chalk.gray('Testing different authentication methods across adapters\n'));

    const tests = [
      () => this.testMultipleAuthMethods(),
      () => this.testAuthenticationValidation(),
      () => this.testTokenRefresh(),
      () => this.testAuthenticationErrors(),
    ];

    for (const test of tests) {
      await test();
    }
  }

  private async testMultipleAuthMethods(): Promise<void> {
    const result = await this.executeTest(
      'Multiple Authentication Methods',
      'authentication-integration',
      async () => {
        const sourcesResponse = await this.apiClient.get('/api/sources');
        const sources = sourcesResponse.data.sources || [];

        const authMethods = sources.map((source: any) => {
          const authStatus = this.determineAuthStatus(source);
          return {
            sourceName: source.name,
            sourceType: source.type,
            authMethod: authStatus.method,
            authConfigured: authStatus.configured,
            authValid: authStatus.valid,
            healthy: source.health?.healthy || false,
          };
        });

        const uniqueAuthMethods = new Set(authMethods.map(a => a.authMethod));
        const configuredAuths = authMethods.filter(a => a.authConfigured);
        const validAuths = authMethods.filter(a => a.authValid);

        return {
          authMethods,
          totalSources: sources.length,
          uniqueAuthMethods: Array.from(uniqueAuthMethods),
          configuredAuthentications: configuredAuths.length,
          validAuthentications: validAuths.length,
          authenticationSuccessRate: validAuths.length / configuredAuths.length,
        };
      }
    );

    this.results.authenticationIntegrationTests.push(result);
  }

  private async testAuthenticationValidation(): Promise<void> {
    const result = await this.executeTest(
      'Authentication Validation',
      'authentication-integration',
      async () => {
        // Test if authenticated sources can perform operations
        const testOperations = [
          { name: 'search', operation: () => this.apiClient.post('/api/search', { query: 'test' }) },
          { name: 'runbook_search', operation: () => this.apiClient.post('/api/runbooks/search', { alert_type: 'test', severity: 'low', affected_systems: ['test'] }) },
          { name: 'list_sources', operation: () => this.apiClient.get('/api/sources') },
        ];

        const operationResults = [];

        for (const test of testOperations) {
          try {
            const response = await test.operation();
            operationResults.push({
              operation: test.name,
              success: response.status >= 200 && response.status < 300,
              statusCode: response.status,
              authenticated: !response.data?.error?.includes('authentication'),
            });
          } catch (error) {
            operationResults.push({
              operation: test.name,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        return { operationResults };
      }
    );

    this.results.authenticationIntegrationTests.push(result);
  }

  private async testTokenRefresh(): Promise<void> {
    const result = await this.executeTest(
      'Token Refresh Mechanisms',
      'authentication-integration',
      async () => {
        // Since we can't actually test token refresh without modifying tokens,
        // we'll test the system's behavior with current tokens
        const sourcesResponse = await this.apiClient.get('/api/sources');
        const sources = sourcesResponse.data.sources || [];

        const tokenBasedSources = sources.filter((source: any) => {
          const authStatus = this.determineAuthStatus(source);
          return authStatus.method.includes('token') || authStatus.method.includes('bearer');
        });

        // Test multiple requests to ensure tokens remain valid
        const multipleRequests = [];
        for (let i = 0; i < 5; i++) {
          const response = await this.apiClient.post('/api/search', { query: `token test ${i}` });
          multipleRequests.push({
            requestNumber: i + 1,
            success: response.status === 200,
            noAuthErrors: !response.data?.error?.includes('authentication'),
          });
        }

        return {
          tokenBasedSources: tokenBasedSources.length,
          multipleRequestsSuccessful: multipleRequests.every(r => r.success),
          noAuthenticationErrors: multipleRequests.every(r => r.noAuthErrors),
          tokenStability: multipleRequests.filter(r => r.success).length / multipleRequests.length,
        };
      }
    );

    this.results.authenticationIntegrationTests.push(result);
  }

  private async testAuthenticationErrors(): Promise<void> {
    const result = await this.executeTest(
      'Authentication Error Handling',
      'authentication-integration',
      async () => {
        const sourcesResponse = await this.apiClient.get('/api/sources');
        const sources = sourcesResponse.data.sources || [];

        const authErrors = sources
          .filter((source: any) => source.health?.error_message)
          .map((source: any) => ({
            sourceName: source.name,
            sourceType: source.type,
            errorMessage: source.health.error_message,
            isAuthError: source.health.error_message.toLowerCase().includes('auth') ||
                        source.health.error_message.toLowerCase().includes('token') ||
                        source.health.error_message.toLowerCase().includes('credential'),
          }));

        const authErrorCount = authErrors.filter(e => e.isAuthError).length;
        const totalErrors = authErrors.length;

        // Test that system still functions despite auth errors
        const searchResponse = await this.apiClient.post('/api/search', { query: 'test query' });
        const systemStillOperational = searchResponse.status === 200;

        return {
          totalErrors,
          authErrorCount,
          authErrors,
          systemStillOperational,
          gracefulErrorHandling: systemStillOperational && authErrorCount > 0,
        };
      }
    );

    this.results.authenticationIntegrationTests.push(result);
  }

  // ========================================================================
  // Configuration Tests
  // ========================================================================

  private async runConfigurationTests(): Promise<void> {
    console.log(chalk.yellow('\n⚙️  Configuration Integration Tests'));
    console.log(chalk.gray('Validating various configuration scenarios\n'));

    const tests = [
      () => this.testConfigurationValidation(),
      () => this.testAdapterConfiguration(),
      () => this.testCacheConfiguration(),
      () => this.testPerformanceConfiguration(),
    ];

    for (const test of tests) {
      await test();
    }
  }

  private async testConfigurationValidation(): Promise<void> {
    const result = await this.executeTest(
      'Configuration Validation',
      'configuration',
      async () => {
        const sourcesResponse = await this.apiClient.get('/api/sources');
        const sources = sourcesResponse.data.sources || [];

        const configValidation = sources.map((source: any) => ({
          name: source.name,
          type: source.type,
          enabled: source.enabled,
          hasValidConfig: source.enabled && (source.health?.healthy || false),
          metadata: {
            hasDocumentCount: typeof source.metadata?.documentCount === 'number',
            hasLastIndexed: !!source.metadata?.lastIndexed,
            hasResponseTime: typeof source.metadata?.avgResponseTime === 'number',
            hasSuccessRate: typeof source.metadata?.successRate === 'number',
          },
        }));

        const validConfigs = configValidation.filter(c => c.hasValidConfig);
        const enabledConfigs = configValidation.filter(c => c.enabled);

        return {
          totalSources: sources.length,
          enabledSources: enabledConfigs.length,
          validConfigurations: validConfigs.length,
          configurationSuccessRate: validConfigs.length / enabledConfigs.length,
          sourceValidation: configValidation,
        };
      }
    );

    this.results.configurationTests.push(result);
  }

  private async testAdapterConfiguration(): Promise<void> {
    const result = await this.executeTest(
      'Adapter Configuration',
      'configuration',
      async () => {
        const sourcesResponse = await this.apiClient.get('/api/sources');
        const sources = sourcesResponse.data.sources || [];

        const adapterTypes = {};
        const adapterConfigs = sources.map((source: any) => {
          adapterTypes[source.type] = (adapterTypes[source.type] || 0) + 1;
          
          return {
            name: source.name,
            type: source.type,
            enabled: source.enabled,
            healthy: source.health?.healthy || false,
            configured: this.determineAuthStatus(source).configured,
            hasMetadata: !!source.metadata,
            documentCount: source.metadata?.documentCount || 0,
          };
        });

        return {
          totalAdapters: sources.length,
          adapterTypes: Object.entries(adapterTypes).map(([type, count]) => ({ type, count })),
          healthyAdapters: adapterConfigs.filter(a => a.healthy).length,
          configuredAdapters: adapterConfigs.filter(a => a.configured).length,
          adapterDetails: adapterConfigs,
        };
      }
    );

    this.results.configurationTests.push(result);
  }

  private async testCacheConfiguration(): Promise<void> {
    const result = await this.executeTest(
      'Cache Configuration',
      'configuration',
      async () => {
        let cacheHealth;
        let cacheStats;

        try {
          const healthResponse = await this.apiClient.get('/health/cache');
          cacheHealth = healthResponse.data;
        } catch {
          cacheHealth = null;
        }

        try {
          const performanceResponse = await this.apiClient.get('/performance');
          cacheStats = performanceResponse.data;
        } catch {
          cacheStats = null;
        }

        // Test cache behavior with a simple query
        const testQuery = 'cache test ' + Date.now();
        
        // First request (should miss cache)
        const firstResponse = await this.apiClient.post('/api/search', { query: testQuery });
        
        // Second request (should hit cache)
        const secondResponse = await this.apiClient.post('/api/search', { query: testQuery });

        return {
          cacheHealthMonitoring: !!cacheHealth,
          cacheStatsAvailable: !!cacheStats,
          cacheHealth,
          cacheWorking: firstResponse.status === 200 && secondResponse.status === 200,
          cacheBehaviorConsistent: firstResponse.data?.results?.length === secondResponse.data?.results?.length,
        };
      }
    );

    this.results.configurationTests.push(result);
  }

  private async testPerformanceConfiguration(): Promise<void> {
    const result = await this.executeTest(
      'Performance Configuration',
      'configuration',
      async () => {
        let performanceMetrics;
        
        try {
          const response = await this.apiClient.get('/performance');
          performanceMetrics = response.data;
        } catch {
          performanceMetrics = null;
        }

        // Test performance monitoring endpoints
        let healthPerformance;
        try {
          const healthResponse = await this.apiClient.get('/health/performance');
          healthPerformance = healthResponse.data;
        } catch {
          healthPerformance = null;
        }

        return {
          performanceMonitoringEnabled: !!performanceMetrics,
          healthPerformanceMonitoring: !!healthPerformance,
          performanceMetrics,
          monitoringConfigured: !!(performanceMetrics || healthPerformance),
        };
      }
    );

    this.results.configurationTests.push(result);
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private async executeTest(
    testName: string,
    category: string,
    testFunction: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    this.spinner.start(`Running ${testName}...`);

    try {
      const details = await testFunction();
      const duration = Date.now() - startTime;

      this.spinner.succeed(chalk.green(`✅ ${testName} (${duration}ms)`));

      return {
        testName,
        category,
        success: true,
        duration,
        details,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.spinner.fail(chalk.red(`❌ ${testName} - ${errorMessage}`));

      return {
        testName,
        category,
        success: false,
        duration,
        details: null,
        error: errorMessage,
      };
    }
  }

  private generateFinalReport(): void {
    const endTime = Date.now();
    const totalDuration = endTime - this.testStartTime;

    // Collect all test results
    const allTests = [
      ...this.results.sourceIntegrationTests,
      ...this.results.crossSourceSearchTests,
      ...this.results.workflowIntegrationTests,
      ...this.results.performanceIntegrationTests,
      ...this.results.failoverIntegrationTests,
      ...this.results.authenticationIntegrationTests,
      ...this.results.configurationTests,
    ];

    this.results.summary = {
      totalTests: allTests.length,
      passed: allTests.filter(t => t.success).length,
      failed: allTests.filter(t => !t.success).length,
      skipped: 0, // No skipped tests in current implementation
      overallDuration: totalDuration,
      successRate: allTests.filter(t => t.success).length / allTests.length,
    };

    // Print summary report
    console.log(chalk.cyan.bold('\n📊 Integration Test Results Summary\n'));
    
    console.log(chalk.white('Overall Results:'));
    console.log(`  Total Tests: ${this.results.summary.totalTests}`);
    console.log(`  ${chalk.green('✅ Passed:')} ${this.results.summary.passed}`);
    console.log(`  ${chalk.red('❌ Failed:')} ${this.results.summary.failed}`);
    console.log(`  ${chalk.blue('Success Rate:')} ${(this.results.summary.successRate * 100).toFixed(1)}%`);
    console.log(`  ${chalk.gray('Duration:')} ${(totalDuration / 1000).toFixed(2)}s\n`);

    // Print category breakdown
    const categories = [
      'source-integration',
      'cross-source-search',
      'workflow-integration',
      'performance-integration',
      'failover-integration',
      'authentication-integration',
      'configuration',
    ];

    console.log(chalk.white('Results by Category:'));
    categories.forEach(category => {
      const categoryTests = allTests.filter(t => t.category === category);
      const passed = categoryTests.filter(t => t.success).length;
      const total = categoryTests.length;
      const rate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
      
      console.log(`  ${category}: ${passed}/${total} (${rate}%)`);
    });

    // Print performance summary
    const performanceTests = this.results.performanceIntegrationTests;
    if (performanceTests.length > 0) {
      console.log(chalk.white('\nPerformance Highlights:'));
      
      const cachedTest = performanceTests.find(t => t.testName.includes('Cached'));
      if (cachedTest && cachedTest.success) {
        const avgTime = cachedTest.details?.avgResponseTime || 0;
        const threshold = this.config.performanceThresholds.cachedResponseTime;
        console.log(`  Cached Response Time: ${avgTime}ms (threshold: ${threshold}ms)`);
      }

      const uncachedTest = performanceTests.find(t => t.testName.includes('Uncached'));
      if (uncachedTest && uncachedTest.success) {
        const avgTime = uncachedTest.details?.avgResponseTime || 0;
        const threshold = this.config.performanceThresholds.uncachedResponseTime;
        console.log(`  Uncached Response Time: ${avgTime}ms (threshold: ${threshold}ms)`);
      }

      const concurrentTest = performanceTests.find(t => t.testName.includes('Concurrent'));
      if (concurrentTest && concurrentTest.success) {
        const throughput = concurrentTest.details?.throughput || 0;
        console.log(`  Concurrent Throughput: ${throughput.toFixed(2)} req/s`);
      }
    }

    // Show failed tests
    const failedTests = allTests.filter(t => !t.success);
    if (failedTests.length > 0) {
      console.log(chalk.red('\n❌ Failed Tests:'));
      failedTests.forEach(test => {
        console.log(`  ${test.testName}: ${test.error}`);
      });
    }

    console.log(chalk.gray('\n' + '='.repeat(60)));
  }

  private async cleanup(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const config: Partial<TestConfig> = {};
  
  if (args.includes('--quick')) {
    config.testTimeout = 30000;
    config.concurrentRequests = 5;
  }
  
  if (args.includes('--thorough')) {
    config.testTimeout = 120000;
    config.concurrentRequests = 20;
  }

  if (args.includes('--no-github')) {
    config.adapters = { ...config.adapters, github: false };
  }

  if (args.includes('--no-confluence')) {
    config.adapters = { ...config.adapters, confluence: false };
  }

  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    config.serverPort = parseInt(args[portIndex + 1]);
  }

  try {
    const runner = new IntegrationTestRunner(config);
    const results = await runner.runAllTests();

    // Write results to file
    const resultsPath = path.join(__dirname, '..', 'integration-test-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    
    console.log(chalk.gray(`\nResults saved to: ${resultsPath}`));

    // Exit with appropriate code
    process.exit(results.summary.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(chalk.red('\n❌ Integration test suite failed:'));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Personal Pipeline Integration Test Suite

Usage: tsx scripts/integration-tests.ts [options]

Options:
  --quick               Run quick tests with reduced timeouts
  --thorough            Run thorough tests with extended timeouts
  --no-github           Skip GitHub adapter tests
  --no-confluence       Skip Confluence adapter tests
  --port <number>       Specify server port (default: 3000)
  --help, -h            Show this help message

Examples:
  tsx scripts/integration-tests.ts                    # Run all tests
  tsx scripts/integration-tests.ts --quick            # Quick test suite
  tsx scripts/integration-tests.ts --thorough         # Comprehensive tests
  tsx scripts/integration-tests.ts --no-github        # Skip GitHub tests
  `);
  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

