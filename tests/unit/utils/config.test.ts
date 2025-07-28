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
});
