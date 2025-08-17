#!/usr/bin/env tsx
/**
 * Phase 2 Server Integration Test Suite
 *
 * Tests PersonalPipelineServer integration with all Phase 2 adapters,
 * MCP protocol compliance, REST API functionality, and end-to-end workflows.
 *
 * Authored by: QA/Test Engineer
 * Date: 2025-08-17
 */

import { test, describe, beforeAll, afterAll } from 'node:test';
import assert from 'node:assert';
import { PersonalPipelineServer } from '../../../src/core/server.js';
import { SemanticSearchEngine } from '../../../src/search/semantic-engine.js';
import { 
  FileSystemAdapter,
  ConfluenceAdapter,
  GitHubAdapter,
  DatabaseAdapter,
  WebAdapter
} from '../../../src/adapters/index.js';
import { PPMCPTools } from '../../../src/tools/index.js';
import { SearchResult, SearchFilters, Runbook } from '../../../src/types/index.js';
import { logger } from '../../../src/utils/logger.js';
import axios, { AxiosInstance } from 'axios';

// ============================================================================
// Test Configuration
// ============================================================================

interface ServerIntegrationConfig {
  server: {
    port: number;
    timeout: number;
    healthCheckInterval: number;
  };
  adapters: {
    file: boolean;
    confluence: boolean;
    github: boolean;
    database: boolean;
    web: boolean;
  };
  mcp: {
    validateProtocol: boolean;
    testAllTools: boolean;
    maxToolResponseTime: number;
  };
  restApi: {
    testAllEndpoints: boolean;
    validateSecurity: boolean;
    maxResponseTime: number;
  };
  performance: {
    concurrentConnections: number;
    loadTestDuration: number;
    responseTimeTarget: number;
  };
}

const serverIntegrationConfig: ServerIntegrationConfig = {
  server: {
    port: 3001, // Use different port to avoid conflicts
    timeout: 30000,
    healthCheckInterval: 5000,
  },
  adapters: {
    file: true,
    confluence: !!process.env.CONFLUENCE_TOKEN,
    github: !!process.env.GITHUB_TOKEN,
    database: !!process.env.DATABASE_URL,
    web: true,
  },
  mcp: {
    validateProtocol: true,
    testAllTools: true,
    maxToolResponseTime: 5000,
  },
  restApi: {
    testAllEndpoints: true,
    validateSecurity: true,
    maxResponseTime: 1000,
  },
  performance: {
    concurrentConnections: 20,
    loadTestDuration: 30000, // 30 seconds
    responseTimeTarget: 200,
  },
};

interface ServerTestMetrics {
  serverInitialization: {
    initTime: number;
    adaptersRegistered: number;
    healthyAdapters: number;
  };
  mcpProtocol: {
    toolsAvailable: number;
    toolsValidated: number;
    avgToolResponseTime: number;
  };
  restApi: {
    endpointsValidated: number;
    avgResponseTime: number;
    securityValidated: boolean;
  };
  performance: {
    maxConcurrentConnections: number;
    avgResponseTimeUnderLoad: number;
    errorRateUnderLoad: number;
  };
  endToEnd: {
    workflowsValidated: number;
    dataConsistency: boolean;
    crossAdapterSearch: boolean;
  };
}

let server: PersonalPipelineServer;
let semanticEngine: SemanticSearchEngine;
let mcpTools: PPMCPTools;
let adapters: Record<string, any> = {};
let restApiClient: AxiosInstance;
let testMetrics: ServerTestMetrics;

// ============================================================================
// Test Setup and Teardown
// ============================================================================

beforeAll(async () => {
  logger.info('Setting up Phase 2 Server Integration Tests');
  
  // Initialize test metrics
  testMetrics = {
    serverInitialization: {
      initTime: 0,
      adaptersRegistered: 0,
      healthyAdapters: 0,
    },
    mcpProtocol: {
      toolsAvailable: 0,
      toolsValidated: 0,
      avgToolResponseTime: 0,
    },
    restApi: {
      endpointsValidated: 0,
      avgResponseTime: 0,
      securityValidated: false,
    },
    performance: {
      maxConcurrentConnections: 0,
      avgResponseTimeUnderLoad: 0,
      errorRateUnderLoad: 0,
    },
    endToEnd: {
      workflowsValidated: 0,
      dataConsistency: false,
      crossAdapterSearch: false,
    },
  };

  try {
    // Initialize semantic search engine
    semanticEngine = new SemanticSearchEngine({
      model: 'Xenova/all-MiniLM-L6-v2',
      maxCacheSize: 1000,
      performance: {
        batchSize: 16,
        enableCaching: true,
        warmupCache: false, // Speed up tests
      },
    });
    await semanticEngine.initialize();
    
    // Initialize adapters
    await initializeTestAdapters();
    
    // Initialize MCP tools
    mcpTools = new PPMCPTools({
      adapters: Object.values(adapters),
      semanticEngine,
      enablePerformanceMonitoring: true,
    });
    
    // Initialize PersonalPipelineServer
    const startTime = performance.now();
    server = new PersonalPipelineServer({
      port: serverIntegrationConfig.server.port,
      adapters: Object.values(adapters),
      semanticEngine,
      mcpTools,
      restApi: {
        enabled: true,
        cors: { origin: true },
        rateLimit: {
          windowMs: 60000,
          max: 1000,
        },
      },
      performance: {
        enableMonitoring: true,
        responseTimeTarget: serverIntegrationConfig.performance.responseTimeTarget,
      },
    });
    
    await server.initialize();
    await server.start();
    
    testMetrics.serverInitialization.initTime = performance.now() - startTime;
    testMetrics.serverInitialization.adaptersRegistered = Object.keys(adapters).length;
    
    // Initialize REST API client
    restApiClient = axios.create({
      baseURL: `http://localhost:${serverIntegrationConfig.server.port}`,
      timeout: serverIntegrationConfig.server.timeout,
      validateStatus: () => true, // Don't throw on HTTP errors
    });
    
    // Wait for server to be fully ready
    await waitForServerReady();
    
    logger.info('Server integration test environment initialized', {
      initTime: `${testMetrics.serverInitialization.initTime.toFixed(2)}ms`,
      adaptersRegistered: testMetrics.serverInitialization.adaptersRegistered,
      serverPort: serverIntegrationConfig.server.port,
    });
    
  } catch (error) {
    logger.error('Failed to initialize server integration test environment', { error });
    throw error;
  }
});

afterAll(async () => {
  logger.info('Cleaning up Phase 2 Server Integration Tests');
  
  try {
    // Stop server
    if (server) {
      await server.stop();
      await server.cleanup();
    }
    
    // Cleanup adapters
    for (const adapter of Object.values(adapters)) {
      if (adapter && typeof adapter.cleanup === 'function') {
        await adapter.cleanup();
      }
    }
    
    // Cleanup semantic engine
    if (semanticEngine) {
      await semanticEngine.cleanup();
    }
    
    // Log final metrics
    logger.info('Server Integration Test Metrics', testMetrics);
    
  } catch (error) {
    logger.error('Error during server integration test cleanup', { error });
  }
});

async function initializeTestAdapters(): Promise<void> {
  // Always initialize FileSystem adapter
  if (serverIntegrationConfig.adapters.file) {
    adapters.file = new FileSystemAdapter({
      name: 'integration-test-file',
      type: 'file',
      config: {
        base_path: './test-data',
        file_patterns: ['**/*.md', '**/*.json'],
        watch_for_changes: false,
      },
    });
    await adapters.file.initialize();
  }
  
  // Initialize other adapters based on configuration
  if (serverIntegrationConfig.adapters.confluence && process.env.CONFLUENCE_TOKEN) {
    adapters.confluence = new ConfluenceAdapter({
      name: 'integration-test-confluence',
      type: 'confluence',
      config: {
        base_url: process.env.CONFLUENCE_URL || 'https://test.atlassian.net/wiki',
        auth: {
          type: 'bearer_token',
          token: process.env.CONFLUENCE_TOKEN,
        },
        spaces: ['TEST'],
        content_types: ['page'],
      },
    }, {
      enableSemanticSearch: true,
      semanticEngine,
    });
    await adapters.confluence.initialize();
  }
  
  if (serverIntegrationConfig.adapters.github && process.env.GITHUB_TOKEN) {
    adapters.github = new GitHubAdapter({
      name: 'integration-test-github',
      type: 'github',
      config: {
        repositories: [{
          owner: 'test-org',
          repo: 'docs',
          paths: ['docs/', 'README.md'],
        }],
        auth: {
          type: 'token',
          token: process.env.GITHUB_TOKEN,
        },
      },
    }, {
      enableSemanticSearch: true,
      semanticEngine,
    });
    await adapters.github.initialize();
  }
  
  if (serverIntegrationConfig.adapters.database && process.env.DATABASE_URL) {
    adapters.database = new DatabaseAdapter({
      name: 'integration-test-database',
      type: 'database',
      config: {
        connection: {
          type: 'postgresql',
          connection_string_env: 'DATABASE_URL',
        },
        schema: {
          tables: [
            {
              name: 'documents',
              title_field: 'title',
              content_field: 'content',
              category_field: 'category',
              type: 'documentation',
            },
          ],
        },
      },
    }, {
      enableSemanticSearch: true,
      semanticEngine,
    });
    await adapters.database.initialize();
  }
  
  if (serverIntegrationConfig.adapters.web) {
    adapters.web = new WebAdapter({
      name: 'integration-test-web',
      type: 'web',
      config: {
        urls: [{
          url: 'https://docs.example.com',
          selectors: {
            title: 'h1',
            content: '.content',
          },
          max_depth: 1,
        }],
        rate_limit: {
          requests_per_minute: 10,
          concurrent_requests: 2,
        },
      },
    }, {
      enableSemanticSearch: true,
      semanticEngine,
    });
    await adapters.web.initialize();
  }
  
  logger.info('Test adapters initialized', {
    adapters: Object.keys(adapters),
    totalAdapters: Object.keys(adapters).length,
  });
}

async function waitForServerReady(): Promise<void> {
  const maxWait = serverIntegrationConfig.server.timeout;
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const response = await restApiClient.get('/health');
      if (response.status === 200) {
        return;
      }
    } catch {
      // Continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Server failed to become ready within timeout');
}

// ============================================================================
// Server Integration Tests
// ============================================================================

describe('Phase 2 Server Integration Tests', () => {
  
  describe('Server Initialization and Health', () => {
    
    test('Server should initialize with all adapters', async () => {
      try {
        assert.ok(server.isInitialized, 'Server should be initialized');
        assert.ok(server.isRunning, 'Server should be running');
        
        // Verify adapter registration
        const registeredAdapters = await server.getRegisteredAdapters();
        const expectedAdapterCount = Object.keys(adapters).length;
        
        assert.ok(registeredAdapters.length >= expectedAdapterCount,
          `Server should have at least ${expectedAdapterCount} adapters registered, got ${registeredAdapters.length}`);
        
        testMetrics.serverInitialization.adaptersRegistered = registeredAdapters.length;
        
        // Verify adapter health
        let healthyAdapters = 0;
        for (const adapter of registeredAdapters) {
          if (adapter.healthy) {
            healthyAdapters++;
          }
        }
        
        testMetrics.serverInitialization.healthyAdapters = healthyAdapters;
        
        assert.ok(healthyAdapters >= Math.ceil(registeredAdapters.length * 0.8),
          `At least 80% of adapters should be healthy, got ${healthyAdapters}/${registeredAdapters.length}`);
        
        logger.info('Server initialization validation passed', {
          adaptersRegistered: registeredAdapters.length,
          healthyAdapters,
          initTime: `${testMetrics.serverInitialization.initTime.toFixed(2)}ms`,
        });
      } catch (error) {
        logger.error('Server initialization test failed', { error });
        throw error;
      }
    });
    
    test('Server health endpoints should be operational', async () => {
      try {
        const healthEndpoints = [
          { path: '/health', description: 'Basic health check' },
          { path: '/health/detailed', description: 'Detailed health information' },
          { path: '/health/sources', description: 'Source adapter health' },
          { path: '/health/performance', description: 'Performance metrics' },
          { path: '/health/cache', description: 'Cache health status' },
        ];
        
        for (const endpoint of healthEndpoints) {
          const startTime = performance.now();
          const response = await restApiClient.get(endpoint.path);
          const responseTime = performance.now() - startTime;
          
          assert.ok(response.status === 200,
            `${endpoint.description} should return 200, got ${response.status}`);
          
          assert.ok(responseTime < 5000,
            `${endpoint.description} should respond within 5s, took ${responseTime.toFixed(2)}ms`);
          
          // Validate response structure
          assert.ok(response.data, `${endpoint.description} should return data`);
          
          if (endpoint.path === '/health') {
            assert.ok(typeof response.data.healthy === 'boolean',
              'Basic health check should include healthy boolean');
          }
        }
        
        logger.info('Health endpoints validation passed');
      } catch (error) {
        logger.error('Health endpoints test failed', { error });
        throw error;
      }
    });
  });
  
  describe('MCP Protocol Compliance', () => {
    
    test('All MCP tools should be available and functional', async () => {
      if (!serverIntegrationConfig.mcp.testAllTools) {
        logger.info('Skipping MCP tools test - disabled in configuration');
        return;
      }
      
      try {
        // Get available MCP tools
        const tools = await server.getMCPTools();
        testMetrics.mcpProtocol.toolsAvailable = tools.length;
        
        assert.ok(tools.length >= 7, 'Should have at least 7 MCP tools available');
        
        const expectedTools = [
          'search_runbooks',
          'get_decision_tree',
          'get_procedure',
          'get_escalation_path',
          'list_sources',
          'search_knowledge_base',
          'record_resolution_feedback',
        ];
        
        for (const expectedTool of expectedTools) {
          const tool = tools.find(t => t.name === expectedTool);
          assert.ok(tool, `MCP tool '${expectedTool}' should be available`);
          
          // Validate tool schema
          assert.ok(tool.description, `Tool '${expectedTool}' should have description`);
          assert.ok(tool.inputSchema, `Tool '${expectedTool}' should have input schema`);
        }
        
        testMetrics.mcpProtocol.toolsValidated = expectedTools.length;
        
        logger.info('MCP tools validation passed', {
          toolsAvailable: tools.length,
          toolsValidated: testMetrics.mcpProtocol.toolsValidated,
        });
      } catch (error) {
        logger.error('MCP tools test failed', { error });
        throw error;
      }
    });
    
    test('MCP tools should execute within performance targets', async () => {
      try {
        const toolTests = [
          {
            name: 'search_runbooks',
            args: {
              alert_type: 'test_alert',
              severity: 'medium',
              affected_systems: ['test-system'],
            },
          },
          {
            name: 'list_sources',
            args: {},
          },
          {
            name: 'search_knowledge_base',
            args: {
              query: 'test documentation',
              max_results: 5,
            },
          },
        ];
        
        let totalResponseTime = 0;
        let successfulTools = 0;
        
        for (const toolTest of toolTests) {
          try {
            const startTime = performance.now();
            const result = await server.executeMCPTool(toolTest.name, toolTest.args);
            const responseTime = performance.now() - startTime;
            
            totalResponseTime += responseTime;
            successfulTools++;
            
            assert.ok(responseTime <= serverIntegrationConfig.mcp.maxToolResponseTime,
              `MCP tool '${toolTest.name}' should respond within ${serverIntegrationConfig.mcp.maxToolResponseTime}ms, ` +
              `took ${responseTime.toFixed(2)}ms`);
            
            assert.ok(result !== undefined && result !== null,
              `MCP tool '${toolTest.name}' should return a result`);
            
            logger.info('MCP tool execution test completed', {
              tool: toolTest.name,
              responseTime: `${responseTime.toFixed(2)}ms`,
              resultType: typeof result,
            });
          } catch (error) {
            logger.warn(`MCP tool '${toolTest.name}' execution failed`, { error: error.message });
          }
        }
        
        testMetrics.mcpProtocol.avgToolResponseTime = totalResponseTime / successfulTools;
        
        assert.ok(successfulTools >= Math.ceil(toolTests.length * 0.7),
          `At least 70% of MCP tools should execute successfully, got ${successfulTools}/${toolTests.length}`);
        
        logger.info('MCP tool performance validation passed', {
          successfulTools,
          totalTools: toolTests.length,
          avgResponseTime: `${testMetrics.mcpProtocol.avgToolResponseTime.toFixed(2)}ms`,
        });
      } catch (error) {
        logger.error('MCP tool performance test failed', { error });
        throw error;
      }
    });
  });
  
  describe('REST API Integration', () => {
    
    test('All REST API endpoints should be operational', async () => {
      if (!serverIntegrationConfig.restApi.testAllEndpoints) {
        logger.info('Skipping REST API endpoints test - disabled in configuration');
        return;
      }
      
      try {
        const endpoints = [
          { method: 'POST', path: '/api/search', data: { query: 'test' } },
          { method: 'POST', path: '/api/runbooks/search', data: { alert_type: 'test', severity: 'low', affected_systems: ['test'] } },
          { method: 'GET', path: '/api/runbooks' },
          { method: 'POST', path: '/api/decision-tree', data: { alert_context: { type: 'test' } } },
          { method: 'POST', path: '/api/escalation', data: { severity: 'medium', business_hours: true } },
          { method: 'GET', path: '/api/sources' },
          { method: 'GET', path: '/api/health' },
          { method: 'GET', path: '/api/performance' },
          { method: 'POST', path: '/api/feedback', data: { runbook_id: 'test', procedure_id: 'test', outcome: 'success' } },
        ];
        
        let totalResponseTime = 0;
        let successfulEndpoints = 0;
        
        for (const endpoint of endpoints) {
          try {
            const startTime = performance.now();
            
            let response;
            if (endpoint.method === 'GET') {
              response = await restApiClient.get(endpoint.path);
            } else if (endpoint.method === 'POST') {
              response = await restApiClient.post(endpoint.path, endpoint.data);
            }
            
            const responseTime = performance.now() - startTime;
            totalResponseTime += responseTime;
            
            assert.ok(response.status >= 200 && response.status < 500,
              `${endpoint.method} ${endpoint.path} should return valid HTTP status, got ${response.status}`);
            
            assert.ok(responseTime <= serverIntegrationConfig.restApi.maxResponseTime,
              `${endpoint.method} ${endpoint.path} should respond within ${serverIntegrationConfig.restApi.maxResponseTime}ms, ` +
              `took ${responseTime.toFixed(2)}ms`);
            
            successfulEndpoints++;
            
          } catch (error) {
            logger.warn(`REST API endpoint ${endpoint.method} ${endpoint.path} failed`, { error: error.message });
          }
        }
        
        testMetrics.restApi.endpointsValidated = successfulEndpoints;
        testMetrics.restApi.avgResponseTime = totalResponseTime / successfulEndpoints;
        
        assert.ok(successfulEndpoints >= Math.ceil(endpoints.length * 0.8),
          `At least 80% of REST API endpoints should be operational, got ${successfulEndpoints}/${endpoints.length}`);
        
        logger.info('REST API endpoints validation passed', {
          successfulEndpoints,
          totalEndpoints: endpoints.length,
          avgResponseTime: `${testMetrics.restApi.avgResponseTime.toFixed(2)}ms`,
        });
      } catch (error) {
        logger.error('REST API endpoints test failed', { error });
        throw error;
      }
    });
    
    test('REST API security headers should be present', async () => {
      if (!serverIntegrationConfig.restApi.validateSecurity) {
        logger.info('Skipping REST API security test - disabled in configuration');
        return;
      }
      
      try {
        const response = await restApiClient.get('/api/health');
        
        const securityHeaders = {
          'x-content-type-options': 'nosniff',
          'x-frame-options': 'DENY',
          'x-xss-protection': '1; mode=block',
          'strict-transport-security': true, // Should be present for HTTPS
        };
        
        let securityScore = 0;
        let totalChecks = 0;
        
        for (const [header, expectedValue] of Object.entries(securityHeaders)) {
          totalChecks++;
          const headerValue = response.headers[header.toLowerCase()];
          
          if (headerValue) {
            if (typeof expectedValue === 'boolean' || headerValue.includes(String(expectedValue))) {
              securityScore++;
            }
          }
        }
        
        // CORS headers should be present
        if (response.headers['access-control-allow-origin']) {
          securityScore++;
          totalChecks++;
        }
        
        const securityPercentage = (securityScore / totalChecks) * 100;
        testMetrics.restApi.securityValidated = securityPercentage >= 70;
        
        assert.ok(securityPercentage >= 70,
          `Security headers should be at least 70% present, got ${securityPercentage.toFixed(1)}%`);
        
        logger.info('REST API security validation passed', {
          securityScore,
          totalChecks,
          securityPercentage: `${securityPercentage.toFixed(1)}%`,
        });
      } catch (error) {
        logger.error('REST API security test failed', { error });
        throw error;
      }
    });
  });
  
  describe('Performance Under Load', () => {
    
    test('Server should handle concurrent connections', async () => {
      try {
        const concurrentRequests = serverIntegrationConfig.performance.concurrentConnections;
        const requests = [];
        
        // Create concurrent requests
        for (let i = 0; i < concurrentRequests; i++) {
          requests.push(
            restApiClient.post('/api/search', {
              query: `concurrent test query ${i}`,
              max_results: 3,
            })
          );
        }
        
        const startTime = performance.now();
        const results = await Promise.allSettled(requests);
        const totalTime = performance.now() - startTime;
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        const successRate = successful / results.length;
        const avgResponseTime = totalTime / results.length;
        
        testMetrics.performance.maxConcurrentConnections = concurrentRequests;
        testMetrics.performance.avgResponseTimeUnderLoad = avgResponseTime;
        testMetrics.performance.errorRateUnderLoad = (failed / results.length) * 100;
        
        assert.ok(successRate >= 0.9,
          `Concurrent request success rate should be ≥90%, got ${(successRate * 100).toFixed(1)}%`);
        
        assert.ok(avgResponseTime <= serverIntegrationConfig.performance.responseTimeTarget * 2,
          `Average response time under load should be within 2x target (${serverIntegrationConfig.performance.responseTimeTarget * 2}ms), ` +
          `got ${avgResponseTime.toFixed(2)}ms`);
        
        logger.info('Concurrent connections performance validated', {
          concurrentRequests,
          successful,
          failed,
          successRate: `${(successRate * 100).toFixed(1)}%`,
          avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          totalTime: `${totalTime.toFixed(2)}ms`,
        });
      } catch (error) {
        logger.error('Concurrent connections test failed', { error });
        throw error;
      }
    });
    
    test('Server should maintain performance during sustained load', async () => {
      try {
        const loadTestDuration = serverIntegrationConfig.performance.loadTestDuration;
        const requestInterval = 100; // 10 requests per second
        
        let totalRequests = 0;
        let successfulRequests = 0;
        let totalResponseTime = 0;
        const startTime = Date.now();
        
        while (Date.now() - startTime < loadTestDuration) {
          try {
            totalRequests++;
            const requestStart = performance.now();
            
            const response = await restApiClient.post('/api/search', {
              query: `load test query ${totalRequests}`,
              max_results: 2,
            });
            
            const responseTime = performance.now() - requestStart;
            totalResponseTime += responseTime;
            
            if (response.status === 200) {
              successfulRequests++;
            }
          } catch (error) {
            logger.warn('Load test request failed', { error: error.message });
          }
          
          await new Promise(resolve => setTimeout(resolve, requestInterval));
        }
        
        const actualDuration = Date.now() - startTime;
        const avgResponseTime = totalResponseTime / successfulRequests;
        const successRate = successfulRequests / totalRequests;
        const requestsPerSecond = totalRequests / (actualDuration / 1000);
        
        assert.ok(successRate >= 0.95,
          `Sustained load success rate should be ≥95%, got ${(successRate * 100).toFixed(1)}%`);
        
        assert.ok(avgResponseTime <= serverIntegrationConfig.performance.responseTimeTarget * 1.5,
          `Average response time under sustained load should be within 1.5x target, ` +
          `got ${avgResponseTime.toFixed(2)}ms`);
        
        logger.info('Sustained load performance validated', {
          duration: `${actualDuration / 1000}s`,
          totalRequests,
          successfulRequests,
          successRate: `${(successRate * 100).toFixed(1)}%`,
          avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          requestsPerSecond: requestsPerSecond.toFixed(2),
        });
      } catch (error) {
        logger.error('Sustained load test failed', { error });
        throw error;
      }
    });
  });
  
  describe('End-to-End Workflow Validation', () => {
    
    test('Complete incident response workflow should work end-to-end', async () => {
      try {
        const incident = {
          alert_type: 'high_cpu',
          severity: 'high',
          affected_systems: ['web-server-01'],
          context: { cpu_usage: '85%', load_average: '3.2' },
        };
        
        const workflow = [];
        
        // Step 1: Search for runbooks
        const runbookResponse = await restApiClient.post('/api/runbooks/search', incident);
        workflow.push({
          step: 'runbook_search',
          success: runbookResponse.status === 200,
          responseTime: runbookResponse.data?.retrieval_time_ms || 0,
          data: runbookResponse.data,
        });
        
        // Step 2: Get decision tree
        const decisionResponse = await restApiClient.post('/api/decision-tree', {
          alert_context: incident,
        });
        workflow.push({
          step: 'decision_tree',
          success: decisionResponse.status === 200,
          responseTime: decisionResponse.data?.retrieval_time_ms || 0,
          data: decisionResponse.data,
        });
        
        // Step 3: Check escalation path
        const escalationResponse = await restApiClient.post('/api/escalation', {
          severity: incident.severity,
          business_hours: true,
        });
        workflow.push({
          step: 'escalation_check',
          success: escalationResponse.status === 200,
          responseTime: escalationResponse.data?.retrieval_time_ms || 0,
          data: escalationResponse.data,
        });
        
        // Step 4: Record feedback
        const feedbackResponse = await restApiClient.post('/api/feedback', {
          runbook_id: 'test-runbook-001',
          procedure_id: 'cpu_investigation',
          outcome: 'success',
          resolution_time_minutes: 15,
          notes: 'Integration test workflow completed',
        });
        workflow.push({
          step: 'feedback_recording',
          success: feedbackResponse.status === 200,
          responseTime: feedbackResponse.data?.retrieval_time_ms || 0,
          data: feedbackResponse.data,
        });
        
        // Validate workflow
        const totalResponseTime = workflow.reduce((sum, step) => sum + step.responseTime, 0);
        const successfulSteps = workflow.filter(step => step.success).length;
        const workflowSuccessRate = successfulSteps / workflow.length;
        
        testMetrics.endToEnd.workflowsValidated++;
        
        assert.ok(workflowSuccessRate >= 0.75,
          `Workflow success rate should be ≥75%, got ${(workflowSuccessRate * 100).toFixed(1)}%`);
        
        assert.ok(totalResponseTime <= 10000,
          `Total workflow response time should be ≤10s, got ${totalResponseTime.toFixed(2)}ms`);
        
        logger.info('End-to-end incident response workflow validated', {
          workflowSteps: workflow.length,
          successfulSteps,
          successRate: `${(workflowSuccessRate * 100).toFixed(1)}%`,
          totalResponseTime: `${totalResponseTime.toFixed(2)}ms`,
          workflow: workflow.map(s => ({ step: s.step, success: s.success, responseTime: `${s.responseTime}ms` })),
        });
      } catch (error) {
        logger.error('End-to-end workflow test failed', { error });
        throw error;
      }
    });
    
    test('Cross-adapter search should provide consistent results', async () => {
      try {
        const testQueries = [
          'system troubleshooting guide',
          'security incident response',
          'performance optimization',
        ];
        
        let consistentResults = 0;
        
        for (const query of testQueries) {
          // Get results via REST API
          const restResponse = await restApiClient.post('/api/search', {
            query,
            max_results: 10,
          });
          
          // Get results via MCP
          const mcpResults = await server.executeMCPTool('search_knowledge_base', {
            query,
            max_results: 10,
          });
          
          if (restResponse.status === 200) {
            const restResults = restResponse.data.results || [];
            const mcpResultsArray = Array.isArray(mcpResults) ? mcpResults : [];
            
            // Check for result consistency (should have overlap)
            const restTitles = new Set(restResults.map(r => r.title.toLowerCase()));
            const mcpTitles = new Set(mcpResultsArray.map(r => r.title?.toLowerCase()).filter(Boolean));
            
            const overlap = [...restTitles].filter(title => mcpTitles.has(title)).length;
            const consistencyRate = overlap / Math.min(restResults.length, mcpResultsArray.length);
            
            if (consistencyRate >= 0.5 || (restResults.length === 0 && mcpResultsArray.length === 0)) {
              consistentResults++;
            }
            
            logger.info('Cross-adapter search consistency check', {
              query,
              restResults: restResults.length,
              mcpResults: mcpResultsArray.length,
              overlap,
              consistencyRate: `${(consistencyRate * 100).toFixed(1)}%`,
            });
          }
        }
        
        const overallConsistency = consistentResults / testQueries.length;
        testMetrics.endToEnd.crossAdapterSearch = overallConsistency >= 0.7;
        
        assert.ok(overallConsistency >= 0.7,
          `Cross-adapter search consistency should be ≥70%, got ${(overallConsistency * 100).toFixed(1)}%`);
        
        logger.info('Cross-adapter search consistency validated', {
          totalQueries: testQueries.length,
          consistentResults,
          overallConsistency: `${(overallConsistency * 100).toFixed(1)}%`,
        });
      } catch (error) {
        logger.error('Cross-adapter search consistency test failed', { error });
        throw error;
      }
    });
    
    test('Data consistency should be maintained across interfaces', async () => {
      try {
        // Test data consistency between MCP and REST API
        const testCases = [
          {
            description: 'Source listing',
            restEndpoint: '/api/sources',
            mcpTool: 'list_sources',
            mcpArgs: {},
          },
        ];
        
        let consistentCases = 0;
        
        for (const testCase of testCases) {
          try {
            // Get data via REST API
            const restResponse = await restApiClient.get(testCase.restEndpoint);
            
            // Get data via MCP
            const mcpResult = await server.executeMCPTool(testCase.mcpTool, testCase.mcpArgs);
            
            if (restResponse.status === 200) {
              const restData = restResponse.data;
              
              // Basic consistency checks
              let isConsistent = false;
              
              if (testCase.mcpTool === 'list_sources') {
                const restSources = restData.sources || [];
                const mcpSources = Array.isArray(mcpResult) ? mcpResult : [];
                
                // Check if source counts are similar (within 20%)
                const countDifference = Math.abs(restSources.length - mcpSources.length);
                const maxAllowedDifference = Math.max(1, Math.ceil(Math.max(restSources.length, mcpSources.length) * 0.2));
                
                isConsistent = countDifference <= maxAllowedDifference;
              }
              
              if (isConsistent) {
                consistentCases++;
              }
              
              logger.info('Data consistency check completed', {
                testCase: testCase.description,
                consistent: isConsistent,
                restDataType: typeof restData,
                mcpDataType: typeof mcpResult,
              });
            }
          } catch (error) {
            logger.warn(`Data consistency check failed for ${testCase.description}`, { error: error.message });
          }
        }
        
        const consistencyRate = consistentCases / testCases.length;
        testMetrics.endToEnd.dataConsistency = consistencyRate >= 0.8;
        
        assert.ok(consistencyRate >= 0.8,
          `Data consistency should be ≥80%, got ${(consistencyRate * 100).toFixed(1)}%`);
        
        logger.info('Data consistency validation completed', {
          totalCases: testCases.length,
          consistentCases,
          consistencyRate: `${(consistencyRate * 100).toFixed(1)}%`,
        });
      } catch (error) {
        logger.error('Data consistency test failed', { error });
        throw error;
      }
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function generateServerIntegrationReport(): string {
  const overallSuccess = (
    testMetrics.serverInitialization.healthyAdapters >= testMetrics.serverInitialization.adaptersRegistered * 0.8 &&
    testMetrics.mcpProtocol.toolsValidated >= 7 &&
    testMetrics.restApi.endpointsValidated >= 8 &&
    testMetrics.performance.errorRateUnderLoad <= 10 &&
    testMetrics.endToEnd.workflowsValidated >= 1
  );
  
  return `
# Phase 2 Server Integration Test Report

## Overall Status: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}

## Server Initialization
- **Initialization Time**: ${testMetrics.serverInitialization.initTime.toFixed(2)}ms
- **Adapters Registered**: ${testMetrics.serverInitialization.adaptersRegistered}
- **Healthy Adapters**: ${testMetrics.serverInitialization.healthyAdapters}
- **Health Rate**: ${(testMetrics.serverInitialization.healthyAdapters / testMetrics.serverInitialization.adaptersRegistered * 100).toFixed(1)}%

## MCP Protocol Compliance
- **Tools Available**: ${testMetrics.mcpProtocol.toolsAvailable}
- **Tools Validated**: ${testMetrics.mcpProtocol.toolsValidated}
- **Average Tool Response Time**: ${testMetrics.mcpProtocol.avgToolResponseTime.toFixed(2)}ms

## REST API Performance
- **Endpoints Validated**: ${testMetrics.restApi.endpointsValidated}
- **Average Response Time**: ${testMetrics.restApi.avgResponseTime.toFixed(2)}ms
- **Security Validated**: ${testMetrics.restApi.securityValidated ? 'Yes' : 'No'}

## Performance Under Load
- **Max Concurrent Connections**: ${testMetrics.performance.maxConcurrentConnections}
- **Avg Response Time Under Load**: ${testMetrics.performance.avgResponseTimeUnderLoad.toFixed(2)}ms
- **Error Rate Under Load**: ${testMetrics.performance.errorRateUnderLoad.toFixed(1)}%

## End-to-End Validation
- **Workflows Validated**: ${testMetrics.endToEnd.workflowsValidated}
- **Data Consistency**: ${testMetrics.endToEnd.dataConsistency ? 'Maintained' : 'Issues detected'}
- **Cross-Adapter Search**: ${testMetrics.endToEnd.crossAdapterSearch ? 'Consistent' : 'Inconsistent'}

## Validation Summary
- **Server Health**: ${testMetrics.serverInitialization.healthyAdapters >= testMetrics.serverInitialization.adaptersRegistered * 0.8 ? '✅' : '❌'}
- **MCP Compliance**: ${testMetrics.mcpProtocol.toolsValidated >= 7 ? '✅' : '❌'}
- **REST API**: ${testMetrics.restApi.endpointsValidated >= 8 ? '✅' : '❌'}
- **Performance**: ${testMetrics.performance.errorRateUnderLoad <= 10 ? '✅' : '❌'}
- **End-to-End**: ${testMetrics.endToEnd.workflowsValidated >= 1 ? '✅' : '❌'}

---
*Generated on ${new Date().toISOString()}*
`;
}

// Export test metrics and configuration for external reporting
export { testMetrics, serverIntegrationConfig, generateServerIntegrationReport };
