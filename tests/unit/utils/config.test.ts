/**
 * Unit tests for ConfigManager
 */

import { ConfigManager } from '../../../src/utils/config';
import * as fs from 'fs/promises';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
}));

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager('./test-config.yaml');

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should load and parse YAML configuration', async () => {
      const yamlContent = `
server:
  port: 3000
  host: localhost
sources: []
embedding:
  enabled: true
      `;

      (fs.readFile as jest.Mock).mockResolvedValue(yamlContent);

      const config = await configManager.loadConfig();

      expect(config).toBeDefined();
      expect(config.server.port).toBe(3000);
      expect(fs.readFile).toHaveBeenCalledWith('./test-config.yaml', 'utf-8');
    });

    it('should create default config when file does not exist', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValue(error);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const config = await configManager.loadConfig();

      expect(config).toBeDefined();
      expect(config.server.port).toBe(3000);
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should throw error for invalid configuration', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('invalid: yaml: content: [');

      await expect(configManager.loadConfig()).rejects.toThrow();
    });
  });

  describe('configuration management', () => {
    beforeEach(async () => {
      const yamlContent = `
server:
  port: 3000
sources: []
embedding:
  enabled: true
      `;
      (fs.readFile as jest.Mock).mockResolvedValue(yamlContent);
      await configManager.loadConfig();
    });

    it('should add new source configuration', () => {
      const sourceConfig = {
        name: 'test-source',
        type: 'file' as const,
        base_url: './test',
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 5000,
        max_retries: 2,
      };

      configManager.addSource(sourceConfig);
      const config = configManager.getConfig();

      expect(config.sources).toHaveLength(1);
      expect(config.sources[0]?.name).toBe('test-source');
    });

    it('should update existing source configuration', () => {
      const sourceConfig1 = {
        name: 'test-source',
        type: 'file' as const,
        base_url: './test1',
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 5000,
        max_retries: 2,
      };

      const sourceConfig2 = {
        name: 'test-source',
        type: 'file' as const,
        base_url: './test2',
        refresh_interval: '2h',
        priority: 2,
        enabled: false,
        timeout_ms: 10000,
        max_retries: 3,
      };

      configManager.addSource(sourceConfig1);
      configManager.addSource(sourceConfig2);

      const config = configManager.getConfig();

      expect(config.sources).toHaveLength(1);
      expect(config.sources[0]?.base_url).toBe('./test2');
      expect(config.sources[0]?.priority).toBe(2);
    });

    it('should remove source configuration', () => {
      const sourceConfig = {
        name: 'test-source',
        type: 'file' as const,
        base_url: './test',
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 5000,
        max_retries: 2,
      };

      configManager.addSource(sourceConfig);
      expect(configManager.getConfig().sources).toHaveLength(1);

      const removed = configManager.removeSource('test-source');
      expect(removed).toBe(true);
      expect(configManager.getConfig().sources).toHaveLength(0);
    });

    it('should return false when removing non-existent source', () => {
      const removed = configManager.removeSource('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Error Handling Coverage', () => {
    it('should throw error when getting config before loading (line 65)', () => {
      const newConfigManager = new ConfigManager('./test-config.yaml');
      
      expect(() => newConfigManager.getConfig()).toThrow(
        'Configuration not loaded. Call loadConfig() first.'
      );
    });

    it('should handle file write errors in saveConfig (lines 103-107)', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      
      // Load config first
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        sources: [],
        server: { port: 3001, host: 'localhost', log_level: 'info', cache_ttl_seconds: 300, max_concurrent_requests: 100, request_timeout_ms: 30000, health_check_interval_ms: 60000 },
        cache: { 
          enabled: true, 
          strategy: 'memory_only', 
          memory: { max_keys: 100, ttl_seconds: 300, check_period_seconds: 60 },
          redis: { enabled: false, url: 'redis://localhost:6379', ttl_seconds: 600, key_prefix: 'pp:', connection_timeout_ms: 5000, retry_attempts: 3, retry_delay_ms: 1000, max_retry_delay_ms: 10000, backoff_multiplier: 2, connection_retry_limit: 5 },
          content_types: {
            runbooks: { ttl_seconds: 300, warmup: true },
            procedures: { ttl_seconds: 180, warmup: false },
            decision_trees: { ttl_seconds: 240, warmup: true },
            knowledge_base: { ttl_seconds: 90, warmup: false }
          }
        }
      }));
      
      await configManager.loadConfig();
      
      // Mock writeFile to throw error
      const writeError = new Error('Write permission denied');
      mockFs.writeFile.mockRejectedValue(writeError);
      
      await expect(configManager.saveConfig()).rejects.toThrow('Write permission denied');
    });

    it('should handle mkdir errors in saveConfig (lines 74-75)', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      
      // Load config first
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        sources: [],
        server: { port: 3001, host: 'localhost', log_level: 'info', cache_ttl_seconds: 300, max_concurrent_requests: 100, request_timeout_ms: 30000, health_check_interval_ms: 60000 },
        cache: { 
          enabled: true, 
          strategy: 'memory_only', 
          memory: { max_keys: 100, ttl_seconds: 300, check_period_seconds: 60 },
          redis: { enabled: false, url: 'redis://localhost:6379', ttl_seconds: 600, key_prefix: 'pp:', connection_timeout_ms: 5000, retry_attempts: 3, retry_delay_ms: 1000, max_retry_delay_ms: 10000, backoff_multiplier: 2, connection_retry_limit: 5 },
          content_types: {
            runbooks: { ttl_seconds: 300, warmup: true },
            procedures: { ttl_seconds: 180, warmup: false },
            decision_trees: { ttl_seconds: 240, warmup: true },
            knowledge_base: { ttl_seconds: 90, warmup: false }
          }
        }
      }));
      
      await configManager.loadConfig();
      
      // Mock mkdir to throw error (line 84)
      const mkdirError = new Error('Cannot create directory');
      mockFs.mkdir.mockRejectedValue(mkdirError);
      
      await expect(configManager.saveConfig()).rejects.toThrow('Cannot create directory');
    });
  });

  describe('Additional Methods Coverage', () => {
    it('should reload configuration (lines 74-75)', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      
      // Initial load
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        sources: [],
        server: { port: 3001, host: 'localhost', log_level: 'info', cache_ttl_seconds: 300, max_concurrent_requests: 100, request_timeout_ms: 30000, health_check_interval_ms: 60000 },
        cache: { 
          enabled: true, 
          strategy: 'memory_only', 
          memory: { max_keys: 100, ttl_seconds: 300, check_period_seconds: 60 },
          redis: { enabled: false, url: 'redis://localhost:6379', ttl_seconds: 600, key_prefix: 'pp:', connection_timeout_ms: 5000, retry_attempts: 3, retry_delay_ms: 1000, max_retry_delay_ms: 10000, backoff_multiplier: 2, connection_retry_limit: 5 },
          content_types: {
            runbooks: { ttl_seconds: 300, warmup: true },
            procedures: { ttl_seconds: 180, warmup: false },
            decision_trees: { ttl_seconds: 240, warmup: true },
            knowledge_base: { ttl_seconds: 90, warmup: false }
          }
        }
      }));
      
      await configManager.loadConfig();
      
      // Change mock to return different config
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        sources: [],
        server: { port: 4001, host: 'test-host', log_level: 'debug', cache_ttl_seconds: 600, max_concurrent_requests: 200, request_timeout_ms: 45000, health_check_interval_ms: 90000 },
        cache: { 
          enabled: false, 
          strategy: 'memory_only', 
          memory: { max_keys: 200, ttl_seconds: 600, check_period_seconds: 120 },
          redis: { enabled: false, url: 'redis://localhost:6379', ttl_seconds: 600, key_prefix: 'pp:', connection_timeout_ms: 5000, retry_attempts: 3, retry_delay_ms: 1000, max_retry_delay_ms: 10000, backoff_multiplier: 2, connection_retry_limit: 5 },
          content_types: {
            runbooks: { ttl_seconds: 300, warmup: true },
            procedures: { ttl_seconds: 180, warmup: false },
            decision_trees: { ttl_seconds: 240, warmup: true },
            knowledge_base: { ttl_seconds: 90, warmup: false }
          }
        }
      }));
      
      const reloadedConfig = await configManager.reloadConfig();
      
      expect(reloadedConfig.server.port).toBe(4001);
      expect(reloadedConfig.server.host).toBe('test-host');
      expect(reloadedConfig.server.log_level).toBe('debug');
    });

    it('should successfully save config (lines 86-108)', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      
      // Load config first
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        sources: [],
        server: { port: 3001, host: 'localhost', log_level: 'info', cache_ttl_seconds: 300, max_concurrent_requests: 100, request_timeout_ms: 30000, health_check_interval_ms: 60000 },
        cache: { 
          enabled: true, 
          strategy: 'memory_only', 
          memory: { max_keys: 100, ttl_seconds: 300, check_period_seconds: 60 },
          redis: { enabled: false, url: 'redis://localhost:6379', ttl_seconds: 600, key_prefix: 'pp:', connection_timeout_ms: 5000, retry_attempts: 3, retry_delay_ms: 1000, max_retry_delay_ms: 10000, backoff_multiplier: 2, connection_retry_limit: 5 },
          content_types: {
            runbooks: { ttl_seconds: 300, warmup: true },
            procedures: { ttl_seconds: 180, warmup: false },
            decision_trees: { ttl_seconds: 240, warmup: true },
            knowledge_base: { ttl_seconds: 90, warmup: false }
          }
        }
      }));
      
      await configManager.loadConfig();
      
      // Mock successful write operations
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();
      
      await expect(configManager.saveConfig()).resolves.not.toThrow();
      
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle updateServerConfig (line 156)', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      
      // Load initial config
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        sources: [],
        server: { port: 3001, host: 'localhost', log_level: 'info', cache_ttl_seconds: 300, max_concurrent_requests: 100, request_timeout_ms: 30000, health_check_interval_ms: 60000 }
      }));
      
      await configManager.loadConfig();

      const serverUpdate = {
        port: 4001,
        host: 'updated-host',
        log_level: 'debug' as const,
        max_concurrent_requests: 200
      };

      configManager.updateServerConfig(serverUpdate);
      const config = configManager.getConfig();

      expect(config.server.port).toBe(4001);
      expect(config.server.host).toBe('updated-host');
      expect(config.server.log_level).toBe('debug');
      expect(config.server.max_concurrent_requests).toBe(200);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle file access errors (line 157-162)', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      
      // Mock access to throw error
      mockFs.access.mockRejectedValue(new Error('File not accessible'));
      
      // Should create default config when file is not accessible
      const config = await configManager.loadConfig();
      
      expect(config).toBeDefined();
      expect(config.sources).toEqual([]);
    });

    it('should handle YAML parsing errors with invalid content', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      
      // Mock reading invalid YAML
      mockFs.readFile.mockResolvedValue('invalid: yaml: content: [unclosed');
      
      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should handle validation errors for malformed config', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      
      // Mock reading config with invalid server structure
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        sources: [],
        server: { port: "invalid-port" }, // Invalid port type
        cache: {
          enabled: true,
          strategy: 'memory_only',
          memory: { max_keys: 100, ttl_seconds: 300, check_period_seconds: 60 },
          redis: { enabled: false, url: 'redis://localhost:6379', ttl_seconds: 600, key_prefix: 'pp:', connection_timeout_ms: 5000, retry_attempts: 3, retry_delay_ms: 1000, max_retry_delay_ms: 10000, backoff_multiplier: 2, connection_retry_limit: 5 },
          content_types: {
            runbooks: { ttl_seconds: 300, warmup: true },
            procedures: { ttl_seconds: 180, warmup: false },
            decision_trees: { ttl_seconds: 240, warmup: true },
            knowledge_base: { ttl_seconds: 90, warmup: false }
          }
        }
      }));
      
      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should create directory structure if needed (line 84)', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      
      // Load config first
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        sources: [],
        server: { port: 3001, host: 'localhost', log_level: 'info', cache_ttl_seconds: 300, max_concurrent_requests: 100, request_timeout_ms: 30000, health_check_interval_ms: 60000 },
        cache: { 
          enabled: true, 
          strategy: 'memory_only', 
          memory: { max_keys: 100, ttl_seconds: 300, check_period_seconds: 60 },
          redis: { enabled: false, url: 'redis://localhost:6379', ttl_seconds: 600, key_prefix: 'pp:', connection_timeout_ms: 5000, retry_attempts: 3, retry_delay_ms: 1000, max_retry_delay_ms: 10000, backoff_multiplier: 2, connection_retry_limit: 5 },
          content_types: {
            runbooks: { ttl_seconds: 300, warmup: true },
            procedures: { ttl_seconds: 180, warmup: false },
            decision_trees: { ttl_seconds: 240, warmup: true },
            knowledge_base: { ttl_seconds: 90, warmup: false }
          }
        }
      }));
      
      await configManager.loadConfig();
      
      // Mock mkdir to succeed
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue();
      
      // ConfigManager with nested path
      const nestedConfigManager = new ConfigManager('./nested/path/config.yaml');
      await nestedConfigManager.loadConfig();
      await nestedConfigManager.saveConfig();
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('./nested/path', { recursive: true });
    });
  });
});
