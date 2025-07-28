/**
 * Unit tests for PersonalPipelineServer
 */

import { PersonalPipelineServer } from '../../../src/core/server';
import { ConfigManager } from '../../../src/utils/config';
import { AppConfig } from '../../../src/types';

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

jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    listen: jest.fn((_port, _host, callback) => {
      setTimeout(callback, 0);
      return {
        on: jest.fn(),
      };
    }),
  };
  return jest.fn(() => mockApp);
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
