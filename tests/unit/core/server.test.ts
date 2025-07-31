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

jest.mock('../../../src/tools', () => ({
  PPMCPTools: jest.fn().mockImplementation(() => ({
    initializeTools: jest.fn(),
    getToolHandlers: jest.fn().mockReturnValue({}),
    cleanup: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock middleware modules
jest.mock('helmet', () => jest.fn(() => jest.fn()));
jest.mock('cors', () => jest.fn(() => jest.fn()));
jest.mock('morgan', () => jest.fn(() => jest.fn()));

jest.mock('../../../src/adapters/base', () => ({
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
      // Create a server instance that will fail health checks
      const failingServer = new PersonalPipelineServer(mockConfigManager);

      const health = await failingServer.getHealthStatus();
      expect(health.status).toBe('unhealthy');
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
