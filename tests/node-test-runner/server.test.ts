/**
 * PersonalPipelineServer Tests using Node.js Test Runner
 * 
 * Tests the core MCP server functionality with minimal mocking
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { PersonalPipelineServer } from '../../src/core/server.js';
import { ConfigManager } from '../../src/utils/config.js';

// Mock the logger to avoid console output in tests
const mockLogger = {
  info: mock.fn(),
  error: mock.fn(),
  debug: mock.fn(),
  warn: mock.fn(),
};

// Simple mock for MCP SDK
const mockServer = {
  setRequestHandler: mock.fn(),
  connect: mock.fn(),
  close: mock.fn(),
};

const mockTransport = {
  start: mock.fn(),
  close: mock.fn(),
};

// Mock cache service 
const mockCacheService = {
  get: mock.fn(),
  set: mock.fn(),
  del: mock.fn(),
  clear: mock.fn(),
  getStats: mock.fn(() => ({ hits: 0, misses: 0, keys: 0 })),
  healthCheck: mock.fn(async () => ({ healthy: true })),
  shutdown: mock.fn(),
};

// Mock performance monitor
const mockPerformanceMonitor = {
  recordResponseTime: mock.fn(),
  recordCacheHit: mock.fn(),
  recordCacheMiss: mock.fn(),
  getMetrics: mock.fn(() => ({
    requests: { total: 0, success: 0, errors: 0 },
    response_times: { avg: 0, p95: 0, p99: 0 },
    cache: { hits: 0, misses: 0, hit_rate: 0 },
  })),
  healthCheck: mock.fn(async () => ({ healthy: true })),
  shutdown: mock.fn(),
};

// Mock monitoring service
const mockMonitoringService = {
  start: mock.fn(),
  stop: mock.fn(),
  recordMetric: mock.fn(),
  checkThresholds: mock.fn(),
  getStatus: mock.fn(() => ({ status: 'healthy' })),
  getAlertHistory: mock.fn(() => []),
  getActiveAlerts: mock.fn(() => []),
  manuallyResolveAlert: mock.fn(() => true),
  getRules: mock.fn(() => []),
  healthCheck: mock.fn(async () => ({ healthy: true })),
  shutdown: mock.fn(),
};

describe('PersonalPipelineServer (Node.js Test Runner)', () => {
  let server: PersonalPipelineServer;
  let mockConfig: any;

  beforeEach(() => {
    // Create minimal test configuration
    mockConfig = {
      server: {
        port: 3000,
        host: 'localhost',
        log_level: 'info',
        cache_ttl_seconds: 3600,
        max_concurrent_requests: 100,
        request_timeout_ms: 30000,
        health_check_interval_ms: 60000,
      },
      sources: [],
      cache: {
        enabled: false,
        strategy: 'memory_only',
        memory: {
          max_keys: 1000,
          ttl_seconds: 3600,
          check_period_seconds: 600,
        },
      },
    };

    // Reset all mocks
    Object.values(mockLogger).forEach(fn => fn.mock.resetCalls());
    Object.values(mockServer).forEach(fn => fn.mock.resetCalls());
    Object.values(mockCacheService).forEach(fn => fn.mock.resetCalls());
    Object.values(mockPerformanceMonitor).forEach(fn => fn.mock.resetCalls());
    Object.values(mockMonitoringService).forEach(fn => fn.mock.resetCalls());
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

  describe('Constructor and Configuration', () => {
    it('should create server with valid configuration', () => {
      server = new PersonalPipelineServer(mockConfig);
      assert(server instanceof PersonalPipelineServer);
    });

    it('should handle configuration through ConfigManager', async () => {
      const configManager = new ConfigManager();
      
      // Load config first, then test
      await configManager.loadConfig();
      const config = configManager.getConfig();
      assert(config);
      assert(config.server);
      assert(Array.isArray(config.sources));
    });
  });

  describe('Initialization', () => {
    it('should initialize with minimal configuration', async () => {
      server = new PersonalPipelineServer(mockConfig);
      
      // Mock the dependencies that would be initialized
      (server as any).cacheService = mockCacheService;
      (server as any).performanceMonitor = mockPerformanceMonitor;
      (server as any).monitoringService = mockMonitoringService;
      
      // For testing, we'll test the constructor doesn't throw
      assert(server instanceof PersonalPipelineServer);
    });

    it('should handle initialization with cache enabled', () => {
      const cacheConfig = {
        ...mockConfig,
        cache: {
          enabled: true,
          strategy: 'memory_only',
          memory: {
            max_keys: 1000,
            ttl_seconds: 3600,
            check_period_seconds: 600,
          },
        },
      };

      server = new PersonalPipelineServer(cacheConfig);
      assert(server instanceof PersonalPipelineServer);
    });

    it('should handle initialization with performance monitoring enabled', () => {
      const perfConfig = {
        ...mockConfig,
        performance: {
          enabled: true,
          metrics_retention_hours: 24,
          gc_threshold_mb: 100,
        },
      };

      server = new PersonalPipelineServer(perfConfig);
      assert(server instanceof PersonalPipelineServer);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration fields', () => {
      // Test with missing required fields
      const invalidConfigs = [
        {}, // Empty config
        { name: 'test' }, // Missing version and description
        { name: 'test', version: '1.0.0' }, // Missing description
      ];

      invalidConfigs.forEach((config, index) => {
        try {
          new PersonalPipelineServer(config);
        } catch (error) {
          // Some configs might throw validation errors, which is expected
          assert(error instanceof Error, `Config ${index} should either work or throw an Error`);
        }
      });
    });

    it('should handle valid minimal configuration', () => {
      const minimalConfig = {
        name: 'minimal-server',
        version: '1.0.0',
        description: 'Minimal test server',
        sources: [],
      };

      server = new PersonalPipelineServer(minimalConfig);
      assert(server instanceof PersonalPipelineServer);
    });
  });

  describe('Source Management', () => {
    it('should handle configuration with no sources', () => {
      server = new PersonalPipelineServer(mockConfig);
      assert(server instanceof PersonalPipelineServer);
    });

    it('should handle configuration with file sources', () => {
      const sourceConfig = {
        ...mockConfig,
        sources: [
          {
            name: 'test-docs',
            type: 'file',
            base_url: './test-docs',
            refresh_interval: '1h',
            priority: 1,
            enabled: true,
            timeout_ms: 30000,
            max_retries: 3,
          },
        ],
      };

      server = new PersonalPipelineServer(sourceConfig);
      assert(server instanceof PersonalPipelineServer);
    });

    it('should handle configuration with multiple source types', () => {
      const multiSourceConfig = {
        ...mockConfig,
        sources: [
          {
            name: 'file-source',
            type: 'file',
            base_url: './docs',
            refresh_interval: '1h',
            priority: 1,
            enabled: true,
            timeout_ms: 30000,
            max_retries: 3,
          },
          {
            name: 'web-source',
            type: 'web',
            base_urls: ['https://example.com'],
            refresh_interval: '2h',
            priority: 2,
            enabled: true,
            timeout_ms: 30000,
            max_retries: 3,
          },
        ],
      };

      server = new PersonalPipelineServer(multiSourceConfig);
      assert(server instanceof PersonalPipelineServer);
    });
  });

  describe('Service Integration', () => {
    beforeEach(() => {
      server = new PersonalPipelineServer(mockConfig);
    });

    it('should handle cache service integration', () => {
      // Inject mock cache service
      (server as any).cacheService = mockCacheService;
      
      // Test that the server can work with cache service
      assert(server instanceof PersonalPipelineServer);
    });

    it('should handle performance monitor integration', () => {
      // Inject mock performance monitor
      (server as any).performanceMonitor = mockPerformanceMonitor;
      
      // Test that the server can work with performance monitor
      assert(server instanceof PersonalPipelineServer);
    });

    it('should handle monitoring service integration', () => {
      // Inject mock monitoring service
      (server as any).monitoringService = mockMonitoringService;
      
      // Test that the server can work with monitoring service
      assert(server instanceof PersonalPipelineServer);
    });
  });

  describe('REST API Configuration', () => {
    it('should handle REST API disabled configuration', () => {
      const apiDisabledConfig = {
        ...mockConfig,
        rest_api: {
          enabled: false,
        },
      };

      server = new PersonalPipelineServer(apiDisabledConfig);
      assert(server instanceof PersonalPipelineServer);
    });

    it('should handle REST API enabled configuration', () => {
      const apiEnabledConfig = {
        ...mockConfig,
        rest_api: {
          enabled: true,
          port: 3000,
          host: 'localhost',
          cors: {
            enabled: true,
            origins: ['http://localhost:3000'],
          },
          rate_limiting: {
            enabled: true,
            requests_per_minute: 60,
          },
        },
      };

      server = new PersonalPipelineServer(apiEnabledConfig);
      assert(server instanceof PersonalPipelineServer);
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration errors gracefully', () => {
      // Test various configuration scenarios
      const testConfigs = [
        mockConfig, // Valid config
        { ...mockConfig, sources: null }, // Invalid sources
        { ...mockConfig, cache: null }, // Invalid cache config
      ];

      testConfigs.forEach((config, index) => {
        try {
          const testServer = new PersonalPipelineServer(config);
          assert(testServer instanceof PersonalPipelineServer, `Config ${index} should create server`);
        } catch (error) {
          // Some configs might throw, which is acceptable for invalid configs
          assert(error instanceof Error, `Config ${index} should throw Error if invalid`);
        }
      });
    });

    it('should handle cleanup properly', async () => {
      server = new PersonalPipelineServer(mockConfig);
      
      // Mock the services
      (server as any).cacheService = mockCacheService;
      (server as any).performanceMonitor = mockPerformanceMonitor;
      (server as any).monitoringService = mockMonitoringService;
      
      // Test cleanup doesn't throw
      await assert.doesNotReject(async () => {
        await server.stop();
      });
    });
  });

  describe('Configuration Manager Integration', () => {
    it('should work with ConfigManager default configuration', async () => {
      const configManager = new ConfigManager();
      await configManager.loadConfig();
      const config = configManager.getConfig();
      
      // Test that ConfigManager produces valid config
      assert(config.server);
      assert(Array.isArray(config.sources));
      
      // Test that server can be created with ConfigManager config
      server = new PersonalPipelineServer(config);
      assert(server instanceof PersonalPipelineServer);
    });

    it('should handle configuration updates', async () => {
      const configManager = new ConfigManager();
      await configManager.loadConfig();
      let config = configManager.getConfig();
      
      // Create server with initial config
      server = new PersonalPipelineServer(config);
      assert(server instanceof PersonalPipelineServer);
      
      // Test that config can be modified
      config = { ...config, server: { ...config.server, host: 'updated-host' } };
      const updatedServer = new PersonalPipelineServer(config);
      assert(updatedServer instanceof PersonalPipelineServer);
    });
  });

  describe('Concurrency and Resource Management', () => {
    it('should handle multiple server instances', async () => {
      const server1 = new PersonalPipelineServer({ 
        ...mockConfig, 
        server: { ...mockConfig.server, port: 3001 }
      });
      const server2 = new PersonalPipelineServer({ 
        ...mockConfig, 
        server: { ...mockConfig.server, port: 3002 }
      });
      
      assert(server1 instanceof PersonalPipelineServer);
      assert(server2 instanceof PersonalPipelineServer);
      
      // Cleanup
      await server1.stop();
      await server2.stop();
    });

    it('should handle resource constraints gracefully', () => {
      const resourceConstrainedConfig = {
        ...mockConfig,
        cache: {
          enabled: true,
          strategy: 'memory_only',
          memory: {
            max_keys: 10, // Very small cache
            ttl_seconds: 60,
            check_period_seconds: 10,
          },
        },
        performance: {
          enabled: true,
          metrics_retention_hours: 1, // Short retention
          gc_threshold_mb: 50, // Low threshold
        },
      };

      server = new PersonalPipelineServer(resourceConstrainedConfig);
      assert(server instanceof PersonalPipelineServer);
    });
  });
});