/**
 * ConfigManager Tests using Node.js Test Runner
 * 
 * Tests configuration loading, saving, and management functionality with real files
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { ConfigManager } from '../../src/utils/config.js';

describe('ConfigManager (Node.js Test Runner)', () => {
  let configManager: ConfigManager;
  let testConfigPath: string;
  let testDir: string;

  beforeEach(async () => {
    // Create a unique test directory and config path
    testDir = path.join(tmpdir(), `config-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    testConfigPath = path.join(testDir, 'test-config.yaml');
    
    configManager = new ConfigManager(testConfigPath);
  });

  afterEach(async () => {
    // Clean up test files and directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadConfig', () => {
    it('should load and parse YAML configuration', async () => {
      const yamlContent = `
server:
  port: 3000
  host: localhost
  log_level: info
  cache_ttl_seconds: 3600
  max_concurrent_requests: 100
  request_timeout_ms: 30000
  health_check_interval_ms: 60000
sources: []
embedding:
  enabled: true
      `;

      await fs.writeFile(testConfigPath, yamlContent);

      const config = await configManager.loadConfig();

      assert(config);
      assert.strictEqual(config.server.port, 3000);
      assert.strictEqual(config.server.host, 'localhost');
      assert.deepStrictEqual(config.sources, []);
    });

    it('should create default config when file does not exist', async () => {
      // Don't create the file, let ConfigManager create default
      const config = await configManager.loadConfig();

      assert(config);
      assert(config.server);
      assert.strictEqual(config.server.port, 3000);
      assert(Array.isArray(config.sources));
      
      // Check that the file was created
      const fileExists = await fs.access(testConfigPath).then(() => true).catch(() => false);
      assert(fileExists, 'Config file should be created');
    });

    it('should throw error for invalid YAML configuration', async () => {
      await fs.writeFile(testConfigPath, 'invalid: yaml: content: [unclosed');

      await assert.rejects(async () => {
        await configManager.loadConfig();
      });
    });
  });

  describe('configuration management', () => {
    beforeEach(async () => {
      const yamlContent = `
server:
  port: 3000
  host: localhost
  log_level: info
  cache_ttl_seconds: 3600
  max_concurrent_requests: 100
  request_timeout_ms: 30000
  health_check_interval_ms: 60000
sources: []
embedding:
  enabled: true
      `;
      await fs.writeFile(testConfigPath, yamlContent);
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

      assert.strictEqual(config.sources.length, 1);
      assert.strictEqual(config.sources[0]?.name, 'test-source');
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

      assert.strictEqual(config.sources.length, 1);
      assert.strictEqual(config.sources[0]?.base_url, './test2');
      assert.strictEqual(config.sources[0]?.priority, 2);
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
      assert.strictEqual(configManager.getConfig().sources.length, 1);

      const removed = configManager.removeSource('test-source');
      assert.strictEqual(removed, true);
      assert.strictEqual(configManager.getConfig().sources.length, 0);
    });

    it('should return false when removing non-existent source', () => {
      const removed = configManager.removeSource('non-existent');
      assert.strictEqual(removed, false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when getting config before loading', () => {
      const newConfigManager = new ConfigManager(path.join(testDir, 'new-config.yaml'));

      assert.throws(() => {
        newConfigManager.getConfig();
      }, /Configuration not loaded. Call loadConfig\(\) first./);
    });

    it('should handle configuration reloading', async () => {
      // Initial config
      const yamlContent1 = `
server:
  port: 3001
  host: localhost
  log_level: info
  cache_ttl_seconds: 300
  max_concurrent_requests: 100
  request_timeout_ms: 30000
  health_check_interval_ms: 60000
sources: []
      `;
      
      await fs.writeFile(testConfigPath, yamlContent1);
      await configManager.loadConfig();
      
      assert.strictEqual(configManager.getConfig().server.port, 3001);

      // Update config file
      const yamlContent2 = `
server:
  port: 4001
  host: test-host
  log_level: debug
  cache_ttl_seconds: 600
  max_concurrent_requests: 200
  request_timeout_ms: 45000
  health_check_interval_ms: 90000
sources: []
      `;
      
      await fs.writeFile(testConfigPath, yamlContent2);
      const reloadedConfig = await configManager.reloadConfig();

      assert.strictEqual(reloadedConfig.server.port, 4001);
      assert.strictEqual(reloadedConfig.server.host, 'test-host');
      assert.strictEqual(reloadedConfig.server.log_level, 'debug');
    });

    it('should handle saveConfig', async () => {
      // Load initial config
      await configManager.loadConfig();
      
      // Add a source
      configManager.addSource({
        name: 'test-source',
        type: 'file' as const,
        base_url: './test',
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 5000,
        max_retries: 2,
      });

      // Save config
      await assert.doesNotReject(async () => {
        await configManager.saveConfig();
      });
      
      // Verify file was updated by creating new manager and loading
      const newConfigManager = new ConfigManager(testConfigPath);
      const loadedConfig = await newConfigManager.loadConfig();
      
      // Check that our test source is in the sources (may include defaults)
      const testSource = loadedConfig.sources.find(s => s.name === 'test-source');
      assert(testSource, 'Test source should be found in saved config');
      assert.strictEqual(testSource.name, 'test-source');
    });

    it('should handle updateServerConfig', async () => {
      // Load initial config
      await configManager.loadConfig();

      const serverUpdate = {
        port: 4001,
        host: 'updated-host',
        log_level: 'debug' as const,
        max_concurrent_requests: 200,
      };

      configManager.updateServerConfig(serverUpdate);
      const config = configManager.getConfig();

      assert.strictEqual(config.server.port, 4001);
      assert.strictEqual(config.server.host, 'updated-host');
      assert.strictEqual(config.server.log_level, 'debug');
      assert.strictEqual(config.server.max_concurrent_requests, 200);
    });
  });

  describe('Directory Creation', () => {
    it('should create nested directory structure when saving', async () => {
      const nestedPath = path.join(testDir, 'nested', 'deep', 'config.yaml');
      const nestedConfigManager = new ConfigManager(nestedPath);
      
      // Load (creates default) and save
      await nestedConfigManager.loadConfig();
      await nestedConfigManager.saveConfig();
      
      // Verify the nested directories were created
      const fileExists = await fs.access(nestedPath).then(() => true).catch(() => false);
      assert(fileExists, 'Nested config file should be created');
      
      // Verify parent directories exist
      const dirExists = await fs.access(path.dirname(nestedPath)).then(() => true).catch(() => false);
      assert(dirExists, 'Nested directories should be created');
    });
  });
});