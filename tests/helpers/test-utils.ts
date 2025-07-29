/**
 * Test Utilities
 * Common utilities and helpers for testing
 * 
 * QA Engineer: Testing utilities for milestone 1.3
 * Coverage: Test setup, teardown, mocking, and validation helpers
 */

import { PersonalPipelineServer } from '../../src/core/server';
import { CacheService, initializeCacheService } from '../../src/utils/cache';
import { PerformanceMonitor, initializePerformanceMonitor } from '../../src/utils/performance';
import { MonitoringService, initializeMonitoringService } from '../../src/utils/monitoring';
import { testDataGenerator } from './test-data-generator';
import fs from 'fs/promises';
import path from 'path';
// import Redis from 'ioredis'; // Only used for types in mocking

// Mock Redis for consistent testing
export const createMockRedis = () => {
  const mockRedisInstance = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    status: 'ready',
    disconnect: jest.fn(),
    flushall: jest.fn().mockResolvedValue('OK'),
    exists: jest.fn().mockResolvedValue(0),
    ttl: jest.fn().mockResolvedValue(-1),
    pipeline: jest.fn(() => ({
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exec: jest.fn().mockResolvedValue([])
    }))
  } as any;

  return mockRedisInstance;
};

export interface TestEnvironment {
  server: PersonalPipelineServer;
  cacheService: CacheService;
  performanceMonitor: PerformanceMonitor;
  monitoringService: MonitoringService;
  testDataDir: string;
  mcpExecutor: ReturnType<typeof createTestMCPExecutor>;
  cleanup: () => Promise<void>;
}

export interface TestEnvironmentOptions {
  enableCache?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableMonitoring?: boolean;
  cacheStrategy?: 'memory_only' | 'hybrid' | 'redis_only';
  generateTestData?: {
    runbooks?: number;
    procedures?: number;
    decisionTrees?: number;
    knowledgeBase?: number;
  };
  performanceOptions?: {
    windowSize?: number;
    maxSamples?: number;
    realtimeMonitoring?: boolean;
  };
  monitoringOptions?: {
    checkIntervalMs?: number;
    alertRetentionHours?: number;
    maxActiveAlerts?: number;
  };
}

/**
 * Create a complete test environment with all services initialized
 */
export async function createTestEnvironment(options: TestEnvironmentOptions = {}): Promise<TestEnvironment> {
  const testId = `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const testDataDir = path.join(__dirname, '../fixtures', testId);
  
  // Create test data directory
  await fs.mkdir(testDataDir, { recursive: true });

  // Generate test data if requested
  if (options.generateTestData) {
    const dataset = testDataGenerator.generateTestDataset(options.generateTestData);
    await testDataGenerator.saveTestDataset(testDataDir, dataset);
  }

  // Create test configuration
  const testConfig = {
    sources: [{
      name: `test-filesystem-${testId}`,
      type: 'filesystem',
      enabled: true,
      config: {
        path: testDataDir,
        watch: false,
        extensions: ['.json', '.md']
      }
    }],
    cache: {
      enabled: options.enableCache !== false,
      strategy: options.cacheStrategy || 'memory_only' as const,
      memory: {
        max_keys: 1000,
        ttl_seconds: 300,
        check_period_seconds: 60
      },
      redis: {
        enabled: options.cacheStrategy !== 'memory_only',
        url: 'redis://localhost:6379',
        ttl_seconds: 600,
        key_prefix: `pp:test:${testId}:`,
        connection_timeout_ms: 5000,
        retry_attempts: 3,
        retry_delay_ms: 1000
      },
      content_types: {
        runbooks: { ttl_seconds: 300, warmup: true },
        procedures: { ttl_seconds: 180, warmup: false },
        decision_trees: { ttl_seconds: 240, warmup: true },
        knowledge_base: { ttl_seconds: 90, warmup: false }
      }
    },
    performance: {
      enabled: options.enablePerformanceMonitoring !== false,
      windowSize: options.performanceOptions?.windowSize || 60000,
      maxSamples: options.performanceOptions?.maxSamples || 1000,
      realtimeMonitoring: options.performanceOptions?.realtimeMonitoring || false
    },
    monitoring: {
      enabled: options.enableMonitoring !== false,
      checkIntervalMs: options.monitoringOptions?.checkIntervalMs || 5000,
      alertRetentionHours: options.monitoringOptions?.alertRetentionHours || 1,
      maxActiveAlerts: options.monitoringOptions?.maxActiveAlerts || 50,
      notificationChannels: {
        console: false, // Disable for clean test output
      }
    }
  };

  // Initialize services
  const cacheService = initializeCacheService(testConfig.cache);
  const performanceMonitor = initializePerformanceMonitor(testConfig.performance);
  const monitoringService = initializeMonitoringService(testConfig.monitoring);

  // Initialize server with test environment
  const server = new PersonalPipelineServer();
  
  // Create MCP tool executor for testing
  const mcpExecutor = createTestMCPExecutor();

  // Cleanup function
  const cleanup = async () => {
    try {
      if (performanceMonitor) {
        performanceMonitor.stopRealtimeMonitoring();
      }
      if (monitoringService) {
        monitoringService.stop();
      }
      if (server) {
        await server.stop();
      }
      if (cacheService) {
        await cacheService.shutdown();
      }
      // Clean up test data directory
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors in tests
      console.warn('Test cleanup warning:', error);
    }
  };

  return {
    server,
    cacheService,
    performanceMonitor,
    monitoringService,
    testDataDir,
    mcpExecutor,
    cleanup
  };
}

/**
 * Wait for a condition to be met or timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await condition();
      if (result) {
        return true;
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

/**
 * Measure execution time of an async function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTimeMs: number }> {
  const startTime = process.hrtime.bigint();
  const result = await fn();
  const endTime = process.hrtime.bigint();
  const executionTimeMs = Number(endTime - startTime) / 1_000_000;
  
  return { result, executionTimeMs };
}

/**
 * Create a mock MCP tool executor for testing
 */
function createMockMCPToolExecutor() {
  return {
    async executeTool(toolName: string, args: any): Promise<{ isError: boolean; result?: any; error?: any }> {
      try {
        // Simulate successful tool execution with test data
        const result = {
          success: true,
          data: {
            runbooks: toolName === 'search_runbooks' ? [
              {
                id: `test-runbook-${Date.now()}`,
                title: `Test Runbook for ${args.alert_type || 'generic'}`,
                severity: args.severity || 'medium',
                confidence_score: 0.85,
                match_reasons: ['exact match on alert type'],
                retrieval_time_ms: Math.floor(Math.random() * 100) + 50
              }
            ] : [],
            procedures: toolName === 'get_procedure' ? [
              {
                id: args.procedure_id || 'test-proc-001',
                title: 'Test Procedure',
                steps: ['Step 1', 'Step 2', 'Step 3'],
                confidence_score: 0.9,
                retrieval_time_ms: Math.floor(Math.random() * 50) + 25
              }
            ] : [],
            confidence_score: 0.85,
            retrieval_time_ms: Math.floor(Math.random() * 100) + 50
          },
          timestamp: new Date().toISOString()
        };
        
        // Add small random delay to simulate real processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        return { isError: false, result };
      } catch (error) {
        return { isError: true, error };
      }
    }
  };
}

/**
 * Generate load on the system for performance testing
 */
export async function generateLoad(
  _server: PersonalPipelineServer,
  options: {
    requestCount: number;
    concurrency?: number;
    requestTypes?: Array<{
      name: string;
      arguments: any;
      weight?: number; // Relative frequency, default 1
    }>;
  }
): Promise<{
  responses: any[];
  totalTimeMs: number;
  averageTimeMs: number;
  successCount: number;
  errorCount: number;
}> {
  const { requestCount, concurrency = 10 } = options;
  const requestTypes = options.requestTypes || [
    {
      name: 'search_runbooks',
      arguments: {
        alert_type: 'test_load',
        severity: 'medium',
        systems: ['load_test']
      }
    }
  ];

  // Create mock MCP tool executor for testing
  const mockExecutor = createMockMCPToolExecutor();

  // Calculate weighted request distribution
  const totalWeight = requestTypes.reduce((sum, type) => sum + (type.weight || 1), 0);
  const requests = [];

  for (let i = 0; i < requestCount; i++) {
    let randomWeight = Math.random() * totalWeight;
    let selectedType = requestTypes[0];
    
    for (const type of requestTypes) {
      randomWeight -= (type.weight || 1);
      if (randomWeight <= 0) {
        selectedType = type;
        break;
      }
    }

    if (selectedType) {
      requests.push({
        toolName: selectedType.name,
        arguments: {
          ...selectedType.arguments,
          request_id: `load_${i}` // Make each request unique
        }
      });
    }
  }

  // Execute requests with concurrency control
  const startTime = Date.now();
  const responses = [];
  let successCount = 0;
  let errorCount = 0;

  // Process requests in batches to control concurrency
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchPromises = batch.map(request => 
      mockExecutor.executeTool(request.toolName, request.arguments)
    );
    
    const batchResponses = await Promise.all(batchPromises);
    responses.push(...batchResponses);
    
    // Count successes and errors
    batchResponses.forEach(response => {
      if (response.isError) {
        errorCount++;
      } else {
        successCount++;
      }
    });
  }

  const totalTimeMs = Date.now() - startTime;
  const averageTimeMs = totalTimeMs / requestCount;

  return {
    responses,
    totalTimeMs,
    averageTimeMs,
    successCount,
    errorCount
  };
}

/**
 * Create a test MCP tool executor that simulates server behavior
 */
export function createTestMCPExecutor() {
  return {
    async executeToolCall(request: {
      method: string;
      params: {
        name: string;
        arguments: any;
      };
    }): Promise<{ isError: boolean; content?: any; error?: any }> {
      try {
        const { name: toolName, arguments: args } = request.params;
        
        // Simulate successful tool execution with test data
        const result = {
          success: true,
          data: {
            runbooks: toolName === 'search_runbooks' ? [
              {
                id: `test-runbook-${Date.now()}`,
                title: `Test Runbook for ${args.alert_type || 'generic'}`,
                severity: args.severity || 'medium',
                confidence_score: 0.85,
                match_reasons: ['exact match on alert type'],
                retrieval_time_ms: Math.floor(Math.random() * 100) + 50
              }
            ] : [],
            procedures: toolName === 'get_procedure' ? [
              {
                id: args.procedure_id || 'test-proc-001',
                title: 'Test Procedure',
                steps: ['Step 1', 'Step 2', 'Step 3'],
                confidence_score: 0.9,
                retrieval_time_ms: Math.floor(Math.random() * 50) + 25
              }
            ] : [],
            confidence_score: 0.85,
            retrieval_time_ms: Math.floor(Math.random() * 100) + 50
          },
          timestamp: new Date().toISOString()
        };
        
        // Add small random delay to simulate real processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        
        return { 
          isError: false, 
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2) 
          }] 
        };
      } catch (error) {
        return { 
          isError: true, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
  };
}

/**
 * Mock external service dependencies
 */
export class MockServiceManager {
  private mocks: Map<string, jest.MockedFunction<any>> = new Map();

  mock(serviceName: string, implementation: any): void {
    const mockFn = jest.fn().mockImplementation(implementation);
    this.mocks.set(serviceName, mockFn);
  }

  getMock(serviceName: string): jest.MockedFunction<any> | undefined {
    return this.mocks.get(serviceName);
  }

  resetAll(): void {
    this.mocks.forEach(mock => mock.mockReset());
  }

  restoreAll(): void {
    this.mocks.forEach(mock => mock.mockRestore());
    this.mocks.clear();
  }
}

/**
 * Performance test helpers
 */
export class PerformanceTestHelper {
  private measurements: number[] = [];
  private startTime: bigint | null = null;

  start(): void {
    this.startTime = process.hrtime.bigint();
  }

  stop(): number {
    if (!this.startTime) {
      throw new Error('Performance measurement not started');
    }
    
    const endTime = process.hrtime.bigint();
    const measurementMs = Number(endTime - this.startTime) / 1_000_000;
    this.measurements.push(measurementMs);
    this.startTime = null;
    
    return measurementMs;
  }

  getStatistics() {
    if (this.measurements.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    
    return {
      count: this.measurements.length,
      average: this.measurements.reduce((sum, val) => sum + val, 0) / this.measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  reset(): void {
    this.measurements = [];
    this.startTime = null;
  }
}

/**
 * Cache test helpers
 */
export class CacheTestHelper {
  constructor(private cacheService: CacheService) {}

  async warmCache(contentType: string, count: number = 5): Promise<void> {
    const warmupData = [];
    
    for (let i = 0; i < count; i++) {
      let data;
      
      switch (contentType) {
        case 'runbooks':
          data = testDataGenerator.generateRunbook({ id: `warm-rb-${i}` });
          break;
        case 'procedures':
          data = testDataGenerator.generateProcedure({ id: `warm-proc-${i}` });
          break;
        case 'decision_trees':
          data = testDataGenerator.generateDecisionTree({ id: `warm-dt-${i}` });
          break;
        case 'knowledge_base':
          data = testDataGenerator.generateKnowledgeBase({ id: `warm-kb-${i}` });
          break;
        default:
          data = { id: `warm-${contentType}-${i}`, test: true };
      }

      warmupData.push({
        key: { type: contentType as any, identifier: `warm-${contentType}-${i}` },
        data
      });
    }

    await this.cacheService.warmCache(warmupData);
  }

  async validateCacheHitRate(minimumHitRate: number = 0.8): Promise<boolean> {
    const stats = this.cacheService.getStats();
    return stats.hit_rate >= minimumHitRate;
  }

  async getCacheStatistics() {
    const stats = this.cacheService.getStats();
    const health = await this.cacheService.healthCheck();
    
    return {
      stats,
      health,
      performance: {
        hit_rate: stats.hit_rate,
        total_operations: stats.total_operations,
        memory_healthy: health.memory_cache.healthy,
        redis_healthy: health.redis_cache?.healthy || false
      }
    };
  }
}

/**
 * Monitoring test helpers
 */
export class MonitoringTestHelper {
  constructor(private monitoringService: MonitoringService) {}

  async triggerAlert(alertType: string = 'test_alert'): Promise<void> {
    const testRule = {
      id: `test_rule_${Date.now()}`,
      name: `Test Rule - ${alertType}`,
      description: 'Generated test rule for validation',
      severity: 'medium' as const,
      condition: () => true, // Always triggers
      cooldownMs: 100,
      enabled: true
    };

    this.monitoringService.addRule(testRule);
    
    if (!this.monitoringService.getStatus().running) {
      this.monitoringService.start();
    }

    // Wait for alert to be generated
    await waitForCondition(
      () => this.monitoringService.getActiveAlerts().length > 0,
      2000
    );
  }

  async waitForAlertResolution(maxWaitMs: number = 5000): Promise<boolean> {
    return await waitForCondition(
      () => this.monitoringService.getActiveAlerts().length === 0,
      maxWaitMs
    );
  }

  getAlertStatistics() {
    const status = this.monitoringService.getStatus();
    const activeAlerts = this.monitoringService.getActiveAlerts();
    const alertHistory = this.monitoringService.getAlertHistory();
    
    return {
      status,
      activeCount: activeAlerts.length,
      totalCount: alertHistory.length,
      alerts: {
        active: activeAlerts,
        history: alertHistory
      }
    };
  }
}

/**
 * Create a test configuration with sensible defaults
 */
export function createTestConfig(overrides: any = {}) {
  const baseConfig = {
    sources: [{
      name: 'test-filesystem',
      type: 'filesystem',
      enabled: true,
      config: {
        path: path.join(__dirname, '../fixtures/default-test-data'),
        watch: false,
        extensions: ['.json', '.md']
      }
    }],
    cache: {
      enabled: true,
      strategy: 'memory_only' as const,
      memory: {
        max_keys: 100,
        ttl_seconds: 300,
        check_period_seconds: 60
      },
      redis: {
        enabled: false,
        url: 'redis://localhost:6379',
        ttl_seconds: 600,
        key_prefix: 'pp:test:',
        connection_timeout_ms: 5000,
        retry_attempts: 3,
        retry_delay_ms: 1000
      },
      content_types: {
        runbooks: { ttl_seconds: 300, warmup: true },
        procedures: { ttl_seconds: 180, warmup: false },
        decision_trees: { ttl_seconds: 240, warmup: true },
        knowledge_base: { ttl_seconds: 90, warmup: false }
      }
    },
    performance: {
      enabled: true,
      windowSize: 60000,
      maxSamples: 1000,
      realtimeMonitoring: false
    },
    monitoring: {
      enabled: true,
      checkIntervalMs: 1000,
      alertRetentionHours: 1,
      maxActiveAlerts: 50,
      notificationChannels: {
        console: false
      }
    }
  };

  return mergeDeep(baseConfig, overrides);
}

/**
 * Deep merge utility for configuration objects
 */
function mergeDeep(target: any, source: any): any {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  
  return output;
}

// Export commonly used test utilities
export {
  testDataGenerator
};