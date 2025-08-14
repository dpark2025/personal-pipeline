/**
 * Unit tests for Confluence Adapter
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { ConfluenceAdapter } from '../../../src/adapters/confluence.js';
import { ConfluenceConfig } from '../../../src/types/index.js';

describe('ConfluenceAdapter', () => {
  let adapter: ConfluenceAdapter;
  let mockConfig: ConfluenceConfig;

  beforeEach(() => {
    // Mock environment variable for testing
    process.env.TEST_CONFLUENCE_TOKEN = 'mock-token';
    
    mockConfig = {
      name: 'test-confluence',
      type: 'confluence',
      base_url: 'https://test.atlassian.net/wiki',
      space_keys: ['TEST'],
      auth: {
        type: 'bearer_token',
        token_env: 'TEST_CONFLUENCE_TOKEN',
      },
      rate_limit: 10,
      max_results: 50,
      timeout_ms: 10000,
      max_retries: 3,
      priority: 1,
      enabled: true,
      refresh_interval: '1h',
    };
  });

  afterEach(() => {
    delete process.env.TEST_CONFLUENCE_TOKEN;
  });

  describe('Constructor', () => {
    it('should create a ConfluenceAdapter instance with valid config', () => {
      assert.doesNotThrow(() => {
        adapter = new ConfluenceAdapter(mockConfig);
      });
      
      assert.ok(adapter);
      assert.strictEqual(adapter.config.name, 'test-confluence');
    });

    it('should throw error with missing token_env for bearer_token auth', () => {
      const invalidConfig = {
        ...mockConfig,
        auth: {
          type: 'bearer_token' as const,
          // Missing token_env
        },
      };
      
      assert.throws(() => {
        new ConfluenceAdapter(invalidConfig);
      }, /token_env required for bearer_token authentication/);
    });

    it('should throw error with missing credentials for basic auth', () => {
      const invalidConfig = {
        ...mockConfig,
        auth: {
          type: 'basic' as const,
          username_env: 'TEST_USER',
          // Missing password_env
        },
      };
      
      assert.throws(() => {
        new ConfluenceAdapter(invalidConfig);
      }, /username_env and password_env required for basic authentication/);
    });

    it('should throw error with unsupported auth type', () => {
      const invalidConfig = {
        ...mockConfig,
        auth: {
          type: 'oauth2' as any,
          token_env: 'TEST_TOKEN',
        },
      };
      
      assert.throws(() => {
        new ConfluenceAdapter(invalidConfig);
      }, /Unsupported authentication type: oauth2/);
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      adapter = new ConfluenceAdapter(mockConfig);
    });

    it('should throw error when environment variable is not set', () => {
      delete process.env.TEST_CONFLUENCE_TOKEN;
      
      assert.throws(() => {
        new ConfluenceAdapter(mockConfig);
      }, /Environment variable TEST_CONFLUENCE_TOKEN not set/);
    });
  });

  describe('Configuration', () => {
    it('should use default values when optional config is not provided', () => {
      const minimalConfig: ConfluenceConfig = {
        name: 'minimal-confluence',
        type: 'confluence',
        base_url: 'https://minimal.atlassian.net/wiki',
        auth: {
          type: 'bearer_token',
          token_env: 'TEST_CONFLUENCE_TOKEN',
        },
        refresh_interval: '1h',
        priority: 1,
      };
      
      adapter = new ConfluenceAdapter(minimalConfig);
      
      // Should use default values
      assert.ok(adapter);
    });

    it('should handle empty space_keys array', () => {
      const configWithEmptySpaces = {
        ...mockConfig,
        space_keys: [],
      };
      
      assert.doesNotThrow(() => {
        adapter = new ConfluenceAdapter(configWithEmptySpaces);
      });
    });
  });

  describe('Refresh Index', () => {
    beforeEach(() => {
      adapter = new ConfluenceAdapter(mockConfig);
    });

    it('should return true for refreshIndex (not applicable for API adapters)', async () => {
      const result = await adapter.refreshIndex();
      assert.strictEqual(result, true);
    });

    it('should return true for refreshIndex with force parameter', async () => {
      const result = await adapter.refreshIndex(true);
      assert.strictEqual(result, true);
    });
  });

  describe('Metadata', () => {
    beforeEach(() => {
      adapter = new ConfluenceAdapter(mockConfig);
    });

    it('should return correct adapter metadata', async () => {
      const metadata = await adapter.getMetadata();
      
      assert.strictEqual(metadata.name, 'test-confluence');
      assert.strictEqual(metadata.type, 'confluence');
      assert.strictEqual(metadata.documentCount, -1);
      assert.ok(typeof metadata.lastIndexed === 'string');
      assert.strictEqual(metadata.avgResponseTime, 300);
      assert.strictEqual(metadata.successRate, 0.95);
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      adapter = new ConfluenceAdapter(mockConfig);
    });

    it('should cleanup resources successfully', async () => {
      assert.doesNotThrow(() => adapter.cleanup());
      await adapter.cleanup();
      assert.strictEqual(adapter.isInitialized, false);
    });
  });
});