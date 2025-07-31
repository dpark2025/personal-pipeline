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
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockReturnValue({ 
      hits: 10, 
      misses: 5, 
      total_operations: 15,
      hit_rate: 0.67 
    }),
    healthCheck: jest.fn().mockResolvedValue({ 
      overall_healthy: true,
      memory_cache: { healthy: true, response_time_ms: 10 },
      redis_cache: { healthy: true, response_time_ms: 50 }
    }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
  CacheService: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockReturnValue({ 
      hits: 10, 
      misses: 5, 
      total_operations: 15,
      hit_rate: 0.67 
    }),
    healthCheck: jest.fn().mockResolvedValue({ 
      overall_healthy: true,
      memory_cache: { healthy: true, response_time_ms: 10 },
      redis_cache: { healthy: true, response_time_ms: 50 }
    }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
  createCacheKey: jest.fn().mockImplementation((type, key) => `${type}:${key}`),
}));

// Create a sophisticated performance monitor mock with state tracking
const createPerformanceMonitorMock = () => {
  const toolMetrics = new Map();
  const errorCounts = new Map();
  let monitoringInterval: NodeJS.Timeout | null = null;
  let responseTimes: number[] = [];
  const callbacks: Array<(metrics: any) => void> = [];
  let currentExecutionSamples: number[] = [];
  
  const mock = {
    // Window and sample configuration for tests
    windowSize: 60000,
    maxSamples: 1000,
    
    recordResponseTime: jest.fn((timeMs: number) => {
      responseTimes.push(timeMs);
    }),
    recordCacheHit: jest.fn(),
    recordCacheMiss: jest.fn(),
    recordToolExecution: jest.fn((toolName: string, timeMs: number, isError = false) => {
      let metrics = toolMetrics.get(toolName);
      if (!metrics) {
        metrics = {
          tool_name: toolName,
          total_calls: 0,
          total_time_ms: 0,
          avg_time_ms: 0,
          error_count: 0,
          error_rate: 0,
          last_called: Date.now(),
          percentiles: { p50: 0, p95: 0, p99: 0 },
        };
        toolMetrics.set(toolName, metrics);
        currentExecutionSamples = [];
      }
      
      currentExecutionSamples.push(timeMs);
      
      metrics.total_calls++;
      metrics.total_time_ms += timeMs;
      metrics.avg_time_ms = metrics.total_time_ms / metrics.total_calls;
      metrics.last_called = Date.now();
      
      if (isError) {
        metrics.error_count++;
      }
      metrics.error_rate = metrics.error_count / metrics.total_calls;
      
      // Calculate percentiles from actual execution samples
      const sortedSamples = [...currentExecutionSamples].sort((a, b) => a - b);
      const p50Index = Math.floor(sortedSamples.length * 0.5);
      const p95Index = Math.floor(sortedSamples.length * 0.95);
      const p99Index = Math.floor(sortedSamples.length * 0.99);
      
      metrics.percentiles = {
        p50: sortedSamples[p50Index] || timeMs,
        p95: sortedSamples[p95Index] || timeMs,
        p99: sortedSamples[p99Index] || timeMs,
      };
    }),
    recordError: jest.fn((errorType: string) => {
      const current = errorCounts.get(errorType) || 0;
      errorCounts.set(errorType, current + 1);
    }),
    getMetrics: jest.fn(() => ({
      response_times: {
        count: responseTimes.length,
        total_ms: responseTimes.reduce((sum, t) => sum + t, 0),
        avg_ms: responseTimes.length > 0 ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length : 0,
        p50_ms: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.5)] || 0 : 0,
        p95_ms: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] || 0 : 0,
        p99_ms: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] || 0 : 0,
        max_ms: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        min_ms: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      },
      throughput: {
        requests_per_second: responseTimes.length / 60, // Assume 60 second window
        total_requests: responseTimes.length,
        window_size_seconds: 60,
      },
      error_tracking: {
        total_errors: Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0),
        error_rate: responseTimes.length > 0 ? Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0) / responseTimes.length : 0,
        errors_by_type: Object.fromEntries(errorCounts),
      },
      resource_usage: {
        memory_mb: 100,
        heap_used_mb: 50,
        cpu_percent: 10,
        active_handles: 5,
        active_requests: 2,
      },
      cache_performance: {
        hit_rate: 0.8,
        total_operations: 100,
        avg_response_time_ms: 50,
      },
    })),
    getToolMetrics: jest.fn(() => toolMetrics),
    getToolPerformance: jest.fn((toolName: string) => toolMetrics.get(toolName) || null),
    generateReport: jest.fn().mockReturnValue({
      recommendations: Array.from(errorCounts.keys()).length > 0 
        ? [`High error rate detected in ${Array.from(errorCounts.keys()).join(', ')}`]
        : []
    }),
    startRealtimeMonitoring: jest.fn((intervalMs = 5000) => {
      if (!monitoringInterval) {
        monitoringInterval = setInterval(() => {
          const metrics = mock.getMetrics();
          callbacks.forEach(callback => {
            try {
              callback(metrics);
            } catch (error) {
              // Handle callback errors gracefully
            }
          });
        }, intervalMs);
      }
    }),
    stopRealtimeMonitoring: jest.fn(() => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
      }
    }),
    onMetricsUpdate: jest.fn((callback: (metrics: any) => void) => {
      callbacks.push(callback);
    }),
    removeCallback: jest.fn((callback: (metrics: any) => void) => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }),
    reset: jest.fn(() => {
      toolMetrics.clear();
      errorCounts.clear();
      responseTimes = [];
      callbacks.length = 0;
      currentExecutionSamples = [];
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
      }
    }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
    // Expose private properties for testing
    get monitoringInterval() { return monitoringInterval; },
  };
  
  return mock;
};

jest.mock('../../src/utils/performance', () => ({
  initializePerformanceMonitor: jest.fn().mockImplementation((options?: any) => {
    const mock = createPerformanceMonitorMock();
    // Add custom options support
    if (options) {
      mock.windowSize = options.windowSize || 60000;
      mock.maxSamples = options.maxSamples || 1000;
    }
    return Promise.resolve(mock);
  }),
  getPerformanceMonitor: jest.fn().mockReturnValue(createPerformanceMonitorMock()),
  PerformanceMonitor: jest.fn().mockImplementation((options?: any) => {
    const mock = createPerformanceMonitorMock();
    if (options) {
      mock.windowSize = options.windowSize || 60000;
      mock.maxSamples = options.maxSamples || 1000;
    }
    return mock;
  }),
  // Mock utility functions that tests expect
  measurePerformance: jest.fn().mockImplementation((_toolName: string) => {
    return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = async function (...args: any[]) {
        const start = Date.now();
        try {
          const result = await originalMethod.apply(this, args);
          return result;
        } finally {
          // Mock recording the execution (duration calculated but not used in mock)
          Date.now() - start;
        }
      };
      return descriptor;
    };
  }),
  createTimer: jest.fn().mockImplementation(() => ({
    elapsed: jest.fn().mockReturnValue(100),
    reset: jest.fn(),
    lap: jest.fn().mockReturnValue(50),
  })),
}));

// Create sophisticated monitoring service mock with proper event handling
const createMonitoringServiceMock = () => {
  const rules: any[] = [];
  const alertHistory: any[] = [];
  const eventListeners = new Map();
  let isRunning = false;
  let checkInterval: NodeJS.Timeout | null = null;
  
  return {
    start: jest.fn(() => {
      isRunning = true;
      // Simulate periodic checks without causing timeouts
      checkInterval = setTimeout(() => {
        // Trigger any pending events for tests
        if (eventListeners.has('alert')) {
          const handlers = eventListeners.get('alert');
          handlers.forEach((handler: any) => {
            setTimeout(() => handler({ 
              id: 'test_alert',
              title: 'Test Alert',
              message: 'Test alert message',
              severity: 'medium',
              timestamp: new Date()
            }), 10);
          });
        }
      }, 50);
    }),
    stop: jest.fn(() => {
      isRunning = false;
      if (checkInterval) {
        clearTimeout(checkInterval);
        checkInterval = null;
      }
    }),
    recordMetric: jest.fn(),
    checkThresholds: jest.fn(),
    addRule: jest.fn((rule: any) => {
      rules.push(rule);
    }),
    getRules: jest.fn(() => [...rules]),
    getStatus: jest.fn(() => ({ 
      status: 'healthy', 
      enabled: true, 
      running: isRunning,
      rules: rules.length,
      activeAlerts: 0,
      totalAlerts: alertHistory.length,
      lastCheck: new Date()
    })),
    getAlertHistory: jest.fn(() => [...alertHistory]),
    once: jest.fn((event: string, handler: any) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event).push(handler);
    }),
    on: jest.fn((event: string, handler: any) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event).push(handler);
    }),
    emit: jest.fn((event: string, data: any) => {
      if (eventListeners.has(event)) {
        eventListeners.get(event).forEach((handler: any) => {
          setTimeout(() => handler(data), 0);
        });
      }
    }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  };
};

// Global monitoring service instance for singleton pattern
let globalMonitoringService: any = null;

jest.mock('../../src/utils/monitoring', () => ({
  initializeMonitoringService: jest.fn().mockImplementation((_config?: any) => {
    globalMonitoringService = createMonitoringServiceMock();
    // Set environment variable to indicate initialization
    process.env.MONITORING_INITIALIZED = 'true';
    return globalMonitoringService;
  }),
  getMonitoringService: jest.fn().mockImplementation(() => {
    if (!globalMonitoringService && process.env.NODE_ENV === 'test' && !process.env.MONITORING_INITIALIZED) {
      // Initialize if not already done
      globalMonitoringService = createMonitoringServiceMock();
      process.env.MONITORING_INITIALIZED = 'true';
    }
    return globalMonitoringService || createMonitoringServiceMock();
  }),
  MonitoringService: jest.fn().mockImplementation(() => createMonitoringServiceMock()),
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

// Mock Express - Handle both CommonJS and ESM imports
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
  const mockRouter = () => ({
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  });
  
  const express: any = jest.fn(() => mockApp);
  express.json = jest.fn(() => jest.fn());
  express.urlencoded = jest.fn(() => jest.fn());
  express.static = jest.fn(() => jest.fn());
  express.Router = mockRouter;
  
  // Also add as default export property for CommonJS compatibility
  express.default = express;
  express.default.Router = mockRouter;
  
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