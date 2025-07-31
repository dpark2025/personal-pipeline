/**
 * Unit tests for PersonalPipelineServer
 */

import { PersonalPipelineServer } from '../../../src/core/server';
import { ConfigManager } from '../../../src/utils/config';
import { AppConfig } from '../../../src/types';

// Mock the MCP SDK
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

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
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

jest.mock('../../../src/utils/cache', () => ({
  initializeCacheService: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0 }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../src/utils/performance', () => ({
  initializePerformanceMonitor: jest.fn().mockResolvedValue({
    recordResponseTime: jest.fn(),
    recordCacheHit: jest.fn(),
    recordCacheMiss: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      requests: { total: 0, success: 0, errors: 0 },
      response_times: { avg: 0, p95: 0, p99: 0 },
      cache: { hits: 0, misses: 0, hit_rate: 0 },
    }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../src/utils/monitoring', () => ({
  initializeMonitoringService: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    recordMetric: jest.fn(),
    checkThresholds: jest.fn(),
    getStatus: jest.fn().mockReturnValue({ status: 'healthy' }),
    getAlertHistory: jest.fn().mockReturnValue([]),
    getActiveAlerts: jest.fn().mockReturnValue([]),
    manuallyResolveAlert: jest.fn().mockReturnValue(true),
    getRules: jest.fn().mockReturnValue([]),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
  getMonitoringService: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    recordMetric: jest.fn(),
    checkThresholds: jest.fn(),
    getStatus: jest.fn().mockReturnValue({ status: 'healthy' }),
    getAlertHistory: jest.fn().mockReturnValue([]),
    getActiveAlerts: jest.fn().mockReturnValue([]),
    manuallyResolveAlert: jest.fn().mockReturnValue(true),
    getRules: jest.fn().mockReturnValue([]),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
  defaultMonitoringConfig: {
    enabled: true,
    check_interval_ms: 30000,
    thresholds: {},
  },
}));

jest.mock('../../../src/tools', () => ({
  PPMCPTools: jest.fn().mockImplementation(() => ({
    getTools: jest.fn().mockReturnValue([
      { name: 'search_runbooks', description: 'Search for runbooks' },
      { name: 'get_decision_tree', description: 'Get decision tree' },
    ]),
    handleToolCall: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '{"success": true}' }],
      isError: false,
    }),
    getCacheStats: jest.fn().mockReturnValue({
      hit_rate: 0.8,
      hits: 80,
      misses: 20,
      total_operations: 100,
    }),
    getPerformanceMetrics: jest.fn().mockReturnValue({
      by_tool: {
        search_runbooks: {
          calls: 10,
          errors: 1,
          avg_time_ms: 250,
          error_rate: 0.1,
        },
      },
    }),
    cleanup: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock additional dependencies
jest.mock('../../../src/utils/performance', () => ({
  initializePerformanceMonitor: jest.fn(),
  getPerformanceMonitor: jest.fn().mockReturnValue({
    recordResponseTime: jest.fn(),
    recordCacheHit: jest.fn(),
    recordCacheMiss: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      requests: { total: 0, success: 0, errors: 0 },
      response_times: { avg_ms: 150, p95_ms: 300, p99_ms: 500 },
      error_tracking: { error_rate: 0.05 },
      resource_usage: { memory_mb: 512 },
      throughput: { requests_per_second: 15, total_requests: 100 },
    }),
    generateReport: jest.fn().mockReturnValue({
      summary: {
        response_times: { avg_ms: 150, p95_ms: 300, p99_ms: 500 },
        error_tracking: { error_rate: 0.05 },
        resource_usage: { memory_mb: 512 },
        throughput: { requests_per_second: 15, total_requests: 100 },
      },
    }),
    reset: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    shutdown: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../src/utils/circuit-breaker', () => ({
  CircuitBreakerFactory: {
    getHealthStatus: jest.fn().mockReturnValue({
      circuit_breakers: [],
      healthy_count: 0,
      total_count: 0,
    }),
    getBreaker: jest.fn().mockReturnValue({
      manualReset: jest.fn(),
    }),
  },
}));

jest.mock('../../../src/api/routes', () => ({
  createAPIRoutes: jest.fn().mockReturnValue({
    stack: [{ route: { path: '/test' } }],
  }),
}));

jest.mock('../../../src/api/middleware', () => ({
  securityHeaders: jest.fn(() => jest.fn()),
  performanceMonitoring: jest.fn(() => jest.fn()),
  requestSizeLimiter: jest.fn(() => jest.fn()),
  globalErrorHandler: jest.fn(() => jest.fn()),
}));

jest.mock('../../../src/api/correlation', () => ({
  correlationMiddleware: jest.fn(),
  correlationErrorHandler: jest.fn(),
}));

jest.mock('../../../src/api/swagger', () => ({
  createSwaggerRouter: jest.fn().mockReturnValue({
    stack: [],
  }),
}));

jest.mock('../../../src/api/caching-middleware', () => ({
  intelligentCaching: jest.fn(() => jest.fn()),
  warmCriticalCache: jest.fn().mockResolvedValue(undefined),
}));

// Mock middleware modules
jest.mock('helmet', () => jest.fn(() => jest.fn()));
jest.mock('cors', () => jest.fn(() => jest.fn()));
jest.mock('morgan', () => jest.fn(() => jest.fn()));

jest.mock('../../../src/adapters/base', () => ({
  SourceAdapterRegistry: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    registerFactory: jest.fn(),
    createAdapter: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    getAll: jest.fn().mockReturnValue([]),
    getAllAdapters: jest.fn().mockReturnValue([
      {
        getConfig: jest.fn().mockReturnValue({ name: 'test-adapter', type: 'file' }),
        getMetadata: jest.fn().mockResolvedValue({ 
          name: 'test-adapter', 
          type: 'file',
          documents_count: 100,
          last_updated: new Date().toISOString(),
        }),
      },
    ]),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    healthCheckAll: jest.fn().mockResolvedValue([
      { name: 'test-adapter', healthy: true, response_time_ms: 50 },
    ]),
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

jest.mock('../../../src/adapters/file', () => ({
  FileSystemAdapter: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue([]),
    getDocument: jest.fn().mockResolvedValue(null),
    searchRunbooks: jest.fn().mockResolvedValue([]),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    getMetadata: jest.fn().mockReturnValue({}),
    cleanup: jest.fn().mockResolvedValue(undefined),
  })),
}));

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
  const mockRouter = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    use: jest.fn(),
  };
  const express: any = jest.fn(() => mockApp);
  express.json = jest.fn(() => jest.fn());
  express.urlencoded = jest.fn(() => jest.fn());
  express.static = jest.fn(() => jest.fn());
  express.Router = jest.fn(() => mockRouter);
  return express;
});

describe('PersonalPipelineServer', () => {
  let server: PersonalPipelineServer;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let defaultConfig: AppConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    defaultConfig = {
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
          type: 'file' as const,
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
      cache: {
        enabled: true,
        strategy: 'hybrid' as const,
        memory: {
          max_keys: 1000,
          ttl_seconds: 3600,
          check_period_seconds: 600,
        },
        redis: {
          enabled: true,
          url: 'redis://localhost:6379',
          ttl_seconds: 7200,
          key_prefix: 'pp:cache:',
          connection_timeout_ms: 5000,
          retry_attempts: 3,
          retry_delay_ms: 1000,
          max_retry_delay_ms: 30000,
          backoff_multiplier: 2,
          connection_retry_limit: 5,
        },
        content_types: {
          runbooks: {
            ttl_seconds: 3600,
            warmup: true,
          },
          procedures: {
            ttl_seconds: 1800,
            warmup: false,
          },
          decision_trees: {
            ttl_seconds: 2400,
            warmup: true,
          },
          knowledge_base: {
            ttl_seconds: 900,
            warmup: false,
          },
        },
      },
    };

    mockConfigManager = {
      loadConfig: jest.fn().mockResolvedValue(defaultConfig),
      getConfig: jest.fn().mockReturnValue(defaultConfig),
      reloadConfig: jest.fn().mockResolvedValue(defaultConfig),
      saveConfig: jest.fn().mockResolvedValue(undefined),
      addSource: jest.fn(),
      removeSource: jest.fn().mockReturnValue(true),
      updateServerConfig: jest.fn(),
      watchConfig: jest.fn().mockResolvedValue(undefined),
    } as any;

    server = new PersonalPipelineServer(mockConfigManager);
  });

  afterEach(async () => {
    if (server) {
      try {
        await server.stop();
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    }
  });

  describe('constructor', () => {
    it('should create a new server instance', () => {
      expect(server).toBeInstanceOf(PersonalPipelineServer);
    });
  });

  describe('start', () => {
    it('should start the server successfully', async () => {
      await expect(server.start()).resolves.not.toThrow();
      expect(mockConfigManager.loadConfig).toHaveBeenCalled();
    });

    it('should not start if already started', async () => {
      await server.start();

      // Second start should not throw but should warn
      await expect(server.start()).resolves.not.toThrow();
    });

    it('should handle configuration loading errors', async () => {
      const error = new Error('Config load failed');
      mockConfigManager.loadConfig.mockRejectedValue(error);

      await expect(server.start()).rejects.toThrow('Config load failed');
    });
  });

  describe('stop', () => {
    it('should stop the server gracefully', async () => {
      await server.start();
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should handle stop when not started', async () => {
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      const health = await server.getHealthStatus();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('sources');
      expect(health).toHaveProperty('uptime');
      expect(typeof health.uptime).toBe('number');
    });

    it('should return unhealthy status on error', async () => {
      // Mock source registry to return no healthy adapters
      const mockFailingRegistry = {
        registerFactory: jest.fn(),
        createAdapter: jest.fn(),
        getAllAdapters: jest.fn().mockReturnValue([]),
        healthCheckAll: jest.fn().mockResolvedValue([
          { name: 'adapter1', healthy: false },
          { name: 'adapter2', healthy: false },
        ]),
        cleanup: jest.fn(),
      };

      const failingServer = new PersonalPipelineServer(mockConfigManager);
      (failingServer as any).sourceRegistry = mockFailingRegistry;

      const health = await failingServer.getHealthStatus();
      expect(health.status).toBe('unhealthy');
    });

    it('should include cache health when cache service is available', async () => {
      await server.start();
      const health = await server.getHealthStatus();

      expect(health).toHaveProperty('cache');
      expect(health.cache).toBeDefined();
    });

    it('should handle cache health check errors gracefully', async () => {
      // Mock cache service to throw error
      const mockCacheService = {
        healthCheck: jest.fn().mockRejectedValue(new Error('Cache error')),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
      
      jest.mocked(require('../../../src/utils/cache').initializeCacheService).mockReturnValue(mockCacheService);
      
      await server.start();
      const health = await server.getHealthStatus();

      expect(health).toHaveProperty('status');
      // Should still return a health status even if cache fails
    });
  });

  describe('getDetailedHealthStatus', () => {
    it('should return detailed health status', async () => {
      await server.start();
      const health = await server.getDetailedHealthStatus();

      expect(health).toHaveProperty('overall_status');
      expect(health).toHaveProperty('components');
      expect(health).toHaveProperty('summary');
      expect(health).toHaveProperty('timestamp');
      
      expect(health.components).toHaveProperty('mcp_server');
      expect(health.components).toHaveProperty('cache_service');
      expect(health.components).toHaveProperty('source_adapters');
      expect(health.components).toHaveProperty('performance');
      expect(health.components).toHaveProperty('mcp_tools');
    });

    it('should calculate health percentage correctly', async () => {
      await server.start();
      const health = await server.getDetailedHealthStatus();

      expect(health.summary).toHaveProperty('health_percentage');
      expect(typeof health.summary.health_percentage).toBe('number');
      expect(health.summary.health_percentage).toBeGreaterThanOrEqual(0);
      expect(health.summary.health_percentage).toBeLessThanOrEqual(100);
    });

    it('should return degraded status when partially healthy', async () => {
      // Mock performance monitor to return poor performance
      const mockPerformanceMonitor = {
        getMetrics: jest.fn().mockReturnValue({
          response_times: { p95_ms: 3000 }, // High response time
          error_tracking: { error_rate: 0.15 }, // High error rate 
          resource_usage: { memory_mb: 3000 }, // High memory usage
        }),
      };
      
      jest.mocked(require('../../../src/utils/performance').getPerformanceMonitor).mockReturnValue(mockPerformanceMonitor);
      
      // Mock some source adapters as unhealthy
      const mockSourceRegistry = {
        getAllAdapters: jest.fn().mockReturnValue([]),
        healthCheckAll: jest.fn().mockResolvedValue([
          { name: 'adapter1', healthy: true },
          { name: 'adapter2', healthy: false },
        ]),
        registerFactory: jest.fn(),
        createAdapter: jest.fn(),
        cleanup: jest.fn(),
      };

      const serverWithFailures = new PersonalPipelineServer(mockConfigManager);
      (serverWithFailures as any).sourceRegistry = mockSourceRegistry;

      await serverWithFailures.start();
      const health = await serverWithFailures.getDetailedHealthStatus();

      // With poor performance and mixed source health, should be degraded or unhealthy
      expect(health.overall_status).toMatch(/degraded|unhealthy/);
    });
  });

  describe('cache service initialization', () => {
    it('should initialize cache service when enabled in config', async () => {
      const initializeCacheService = jest.mocked(require('../../../src/utils/cache').initializeCacheService);
      
      await server.start();

      expect(initializeCacheService).toHaveBeenCalledWith(defaultConfig.cache);
    });

    it('should handle cache service initialization failure', async () => {
      const initializeCacheService = jest.mocked(require('../../../src/utils/cache').initializeCacheService);
      initializeCacheService.mockImplementation(() => {
        throw new Error('Cache initialization failed');
      });

      // Should not throw - should continue without cache
      await expect(server.start()).resolves.not.toThrow();
    });

    it('should skip cache service when disabled', async () => {
      const configWithoutCache = {
        ...defaultConfig,
        cache: { 
          ...defaultConfig.cache!, 
          enabled: false 
        },
      };
      
      mockConfigManager.loadConfig.mockResolvedValue(configWithoutCache);
      
      await server.start();
      
      // Cache service should be null
      expect((server as any).cacheService).toBeNull();
    });
  });

  describe('source adapter initialization', () => {
    it('should initialize enabled source adapters', async () => {
      await server.start();

      // Should have called createAdapter for enabled sources
      expect((server as any).sourceRegistry.createAdapter).toHaveBeenCalled();
    });

    it('should skip disabled source adapters', async () => {
      const configWithDisabledSource = {
        ...defaultConfig,
        sources: [
          { 
            ...defaultConfig.sources[0], 
            enabled: false,
            name: 'test-source',
            type: 'file' as const,
            refresh_interval: '1h',
            priority: 1,
            timeout_ms: 5000,
            max_retries: 2,
          },
        ],
      };
      
      mockConfigManager.loadConfig.mockResolvedValue(configWithDisabledSource);
      
      await server.start();

      // Should not have called createAdapter for disabled sources
      expect((server as any).sourceRegistry.createAdapter).not.toHaveBeenCalled();
    });

    it('should continue if some source adapters fail to initialize', async () => {
      const mockRegistry = {
        registerFactory: jest.fn(),
        createAdapter: jest.fn().mockRejectedValue(new Error('Adapter initialization failed')),
        getAllAdapters: jest.fn().mockReturnValue([]),
        healthCheckAll: jest.fn().mockResolvedValue([]),
        cleanup: jest.fn(),
      };

      (server as any).sourceRegistry = mockRegistry;

      // Should not throw even if adapter initialization fails
      await expect(server.start()).resolves.not.toThrow();
    });
  });

  describe('MCP server lifecycle', () => {
    it('should setup MCP handlers during construction', () => {
      const mcpServer = (server as any).mcpServer;
      
      expect(mcpServer.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(mcpServer.onerror).toBeDefined();
    });

    it('should connect MCP server during start', async () => {
      await server.start();

      const mcpServer = (server as any).mcpServer;
      expect(mcpServer.connect).toHaveBeenCalled();
    });

    it('should close MCP server during stop', async () => {
      await server.start();
      await server.stop();

      const mcpServer = (server as any).mcpServer;
      expect(mcpServer.close).toHaveBeenCalled();
    });
  });

  describe('Express server setup', () => {
    it('should setup security middleware', () => {
      const app = (server as any).expressApp;
      
      // Should have called middleware setup functions
      expect(app.use).toHaveBeenCalled();
    });

    it('should register health endpoints', () => {
      const app = (server as any).expressApp;
      
      expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function));
      expect(app.get).toHaveBeenCalledWith('/ready', expect.any(Function));
      expect(app.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
    });

    it('should setup API routes after initialization', async () => {
      const createAPIRoutes = jest.mocked(require('../../../src/api/routes').createAPIRoutes);
      
      await server.start();

      expect(createAPIRoutes).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpTools: expect.any(Object),
          sourceRegistry: expect.any(Object),
        })
      );
    });
  });

  describe('performance monitoring', () => {
    it('should initialize performance monitor during start', async () => {
      const initializePerformanceMonitor = jest.mocked(require('../../../src/utils/performance').initializePerformanceMonitor);
      
      await server.start();

      expect(initializePerformanceMonitor).toHaveBeenCalledWith({
        windowSize: 60000,
        maxSamples: 1000,
      });
    });

    it('should initialize monitoring service during start', async () => {
      const initializeMonitoringService = jest.mocked(require('../../../src/utils/monitoring').initializeMonitoringService);
      const mockMonitoringService = initializeMonitoringService();
      
      await server.start();

      expect(initializeMonitoringService).toHaveBeenCalled();
      expect(mockMonitoringService.start).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle monitoring service errors during stop', async () => {
      const getMonitoringService = jest.mocked(require('../../../src/utils/monitoring').getMonitoringService);
      getMonitoringService.mockImplementation(() => {
        throw new Error('Monitoring service not found');
      });

      await server.start();
      
      // Should not throw when monitoring service is not available
      await expect(server.stop()).resolves.not.toThrow();
    });

    it('should handle cache service shutdown errors', async () => {
      const mockCacheService = {
        healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
        shutdown: jest.fn().mockRejectedValue(new Error('Cache shutdown failed')),
      };
      
      jest.mocked(require('../../../src/utils/cache').initializeCacheService).mockReturnValue(mockCacheService);
      
      await server.start();
      
      // Should handle cache shutdown errors gracefully
      await expect(server.stop()).rejects.toThrow('Cache shutdown failed');
    });
  });
});

describe('Server Integration', () => {
  it('should handle missing configuration gracefully', async () => {
    const mockConfigManager = {
      loadConfig: jest.fn().mockRejectedValue(new Error('ENOENT: no such file')),
    } as any;

    const server = new PersonalPipelineServer(mockConfigManager);

    // Should not throw but should handle the error
    await expect(server.start()).rejects.toThrow();
  });
});
