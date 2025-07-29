/**
 * Shared test mocks for all tests
 * This file contains common mocks that should be applied across all test files
 */

// Mock the MCP SDK first (must be before any imports that use it)
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: {},
  ListToolsRequestSchema: {},
}));

// Mock core dependencies
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  loggerStream: {
    write: jest.fn(),
  },
}));

jest.mock('../../src/utils/cache', () => ({
  initializeCacheService: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({ 
      hits: 0, 
      misses: 0, 
      total_operations: 0,
      hit_rate: 0 
    }),
    healthCheck: jest.fn().mockResolvedValue({ 
      healthy: true,
      redis_cache: { healthy: true, response_time_ms: 50 }
    }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
  createCacheKey: jest.fn().mockImplementation((type, key) => `${type}:${key}`),
}));

jest.mock('../../src/utils/performance', () => ({
  initializePerformanceMonitor: jest.fn().mockResolvedValue({
    recordResponseTime: jest.fn(),
    recordCacheHit: jest.fn(),
    recordCacheMiss: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      requests: { total: 0, success: 0, errors: 0 },
      response_times: { avg: 0, p95: 0, p99: 0, count: 0, avg_ms: 0 },
      cache: { hits: 0, misses: 0, hit_rate: 0 },
    }),
    stopRealtimeMonitoring: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
  getPerformanceMonitor: jest.fn().mockReturnValue({
    recordResponseTime: jest.fn(),
    recordCacheHit: jest.fn(),
    recordCacheMiss: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      requests: { total: 0, success: 0, errors: 0 },
      response_times: { avg: 0, p95: 0, p99: 0, count: 0, avg_ms: 0 },
      cache: { hits: 0, misses: 0, hit_rate: 0 },
    }),
    stopRealtimeMonitoring: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../src/utils/monitoring', () => ({
  initializeMonitoringService: jest.fn().mockReturnValue({
    start: jest.fn(),
    recordMetric: jest.fn(),
    checkThresholds: jest.fn(),
    getStatus: jest.fn().mockReturnValue({ status: 'healthy' }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
  getMonitoringService: jest.fn().mockReturnValue({
    start: jest.fn(),
    recordMetric: jest.fn(),
    checkThresholds: jest.fn(),
    getStatus: jest.fn().mockReturnValue({ status: 'healthy' }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
  defaultMonitoringConfig: {
    enabled: true,
    check_interval_ms: 30000,
    thresholds: {},
  },
}));

jest.mock('../../src/tools', () => ({
  PPMCPTools: jest.fn().mockImplementation(() => ({
    initializeTools: jest.fn(),
    getToolHandlers: jest.fn().mockReturnValue({}),
    cleanup: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../src/adapters/base', () => ({
  SourceAdapterRegistry: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    registerFactory: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn().mockReturnValue([]),
    getAllAdapters: jest.fn().mockReturnValue([]),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    cleanup: jest.fn().mockResolvedValue(undefined),
  })),
  SourceAdapter: class MockSourceAdapter {
    constructor() {}
    async search() { return []; }
    async getDocument() { return null; }
    async searchRunbooks() { return []; }
    async healthCheck() { return { healthy: true }; }
    async getMetadata() { return {}; }
    async cleanup() {}
  },
}));

jest.mock('../../src/adapters/file', () => ({
  FileSystemAdapter: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue([]),
    getDocument: jest.fn().mockResolvedValue(null),
    searchRunbooks: jest.fn().mockResolvedValue([]),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    getMetadata: jest.fn().mockReturnValue({}),
    cleanup: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock Express
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn((_port: any, _host: any, callback: any) => {
      setTimeout(callback, 0);
      return {
        on: jest.fn(),
        close: jest.fn((callback: any) => {
          setTimeout(callback, 0);
        }),
      };
    }),
  };
  const express: any = jest.fn(() => mockApp);
  express.json = jest.fn(() => jest.fn());
  express.urlencoded = jest.fn(() => jest.fn());
  express.static = jest.fn(() => jest.fn());
  return express;
});

// Mock middleware modules
jest.mock('helmet', () => jest.fn(() => jest.fn()));
jest.mock('cors', () => jest.fn(() => jest.fn()));
jest.mock('morgan', () => jest.fn(() => jest.fn()));

// Mock the test data generator to avoid TypeScript issues
jest.mock('../../tests/helpers/test-data-generator', () => ({
  testDataGenerator: {
    generateRunbook: jest.fn().mockReturnValue({
      title: 'Test Runbook',
      triggers: ['test_trigger'],
      procedures: [],
      metadata: { confidence_score: 0.9, last_updated: new Date().toISOString() }
    }),
    generateProcedure: jest.fn().mockReturnValue({
      name: 'Test Procedure',
      steps: ['Step 1'],
      metadata: { complexity: 'medium' }
    }),
    generateCacheWarmupData: jest.fn().mockReturnValue([]),
    generateTestDataset: jest.fn().mockReturnValue({
      runbooks: [],
      procedures: [],
      decision_trees: [],
      knowledge_base: []
    }),
    saveTestDataset: jest.fn().mockResolvedValue(undefined)
  }
}));

// Export a default mock configuration for tests
export const createMockConfig = () => ({
  server: {
    port: 3000,
    host: 'localhost',
    log_level: 'info',
    cache_ttl_seconds: 3600,
    max_concurrent_requests: 100,
    request_timeout_ms: 30000,
    health_check_interval_ms: 60000,
  },
  sources: [
    {
      name: 'test-source',
      type: 'file',
      base_url: './test-docs',
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 5000,
      max_retries: 2,
    },
  ],
  embedding: {
    enabled: true,
    model: 'test-model',
    cache_size: 100,
  },
});