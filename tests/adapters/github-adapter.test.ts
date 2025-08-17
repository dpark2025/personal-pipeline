/**
 * GitHub Adapter Tests
 * 
 * Comprehensive test suite for the GitHub adapter implementation
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { GitHubAdapter } from '../../src/adapters/github/index.js';
import { GitHubConfig, SearchFilters } from '../../src/types/index.js';

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;
  let mockConfig: GitHubConfig;

  beforeEach(() => {
    mockConfig = {
      name: 'test-github',
      type: 'github',
      organization: 'test-org',
      auth: {
        type: 'personal_token',
        token_env: 'GITHUB_TOKEN',
      },
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3,
    };

    adapter = new GitHubAdapter(mockConfig, {
      enableSemanticSearch: false, // Disable for basic tests
    });
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.cleanup();
    }
  });

  describe('Constructor', () => {
    it('should create GitHub adapter with valid config', () => {
      assert.ok(adapter);
      assert.strictEqual(adapter.getConfig().name, 'test-github');
      assert.strictEqual(adapter.getConfig().type, 'github');
    });

    it('should throw error with invalid config', () => {
      const invalidConfig = {
        name: 'test',
        type: 'invalid' as any,
        refresh_interval: '1h',
        priority: 1,
      };

      assert.throws(() => {
        new GitHubAdapter(invalidConfig);
      }, /Invalid adapter type/);
    });

    it('should set default options', () => {
      const adapter = new GitHubAdapter(mockConfig);
      assert.ok(adapter);
    });
  });

  describe('Configuration Validation', () => {
    it('should accept minimal valid configuration', () => {
      const minimalConfig: GitHubConfig = {
        name: 'minimal-github',
        type: 'github',
        organization: 'test-org',
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 30000,
        max_retries: 3,
      };

      const adapter = new GitHubAdapter(minimalConfig);
      assert.ok(adapter);
    });

    it('should handle organization-based configuration', () => {
      const orgConfig: GitHubConfig = {
        ...mockConfig,
        organization: 'my-org',
      };

      const adapter = new GitHubAdapter(orgConfig);
      assert.strictEqual(adapter.getConfig().organization, 'my-org');
    });

    it('should handle repository-based configuration', () => {
      const repoConfig: GitHubConfig = {
        ...mockConfig,
        organization: undefined,
        repositories: ['owner1/repo1', 'owner2/repo2'],
      };

      const adapter = new GitHubAdapter(repoConfig);
      assert.deepStrictEqual(adapter.getConfig().repositories, ['owner1/repo1', 'owner2/repo2']);
    });

    it('should handle GitHub Enterprise Server configuration', () => {
      const enterpriseConfig: GitHubConfig = {
        ...mockConfig,
        api_url: 'https://github.enterprise.com/api/v3',
        graphql_url: 'https://github.enterprise.com/api/graphql',
      };

      const adapter = new GitHubAdapter(enterpriseConfig);
      assert.strictEqual(adapter.getConfig().api_url, 'https://github.enterprise.com/api/v3');
    });
  });

  describe('Authentication Configuration', () => {
    it('should handle personal token authentication', () => {
      const tokenConfig: GitHubConfig = {
        ...mockConfig,
        auth: {
          type: 'personal_token',
          token_env: 'GITHUB_TOKEN',
        },
      };

      const adapter = new GitHubAdapter(tokenConfig);
      assert.strictEqual(adapter.getConfig().auth?.type, 'personal_token');
    });

    it('should handle GitHub App authentication', () => {
      const appConfig: GitHubConfig = {
        ...mockConfig,
        auth: {
          type: 'github_app',
          app_id_env: 'GITHUB_APP_ID',
          private_key_env: 'GITHUB_PRIVATE_KEY',
          installation_id_env: 'GITHUB_INSTALLATION_ID',
        },
      };

      const adapter = new GitHubAdapter(appConfig);
      assert.strictEqual(adapter.getConfig().auth?.type, 'github_app');
    });

    it('should handle OAuth2 authentication', () => {
      const oauthConfig: GitHubConfig = {
        ...mockConfig,
        auth: {
          type: 'oauth2',
          client_id_env: 'GITHUB_CLIENT_ID',
          client_secret_env: 'GITHUB_CLIENT_SECRET',
          redirect_uri: 'https://app.example.com/callback',
          scope: ['repo', 'read:org'],
        },
      };

      const adapter = new GitHubAdapter(oauthConfig);
      assert.strictEqual(adapter.getConfig().auth?.type, 'oauth2');
    });
  });

  describe('Adapter Interface', () => {
    it('should implement required SourceAdapter methods', () => {
      assert.ok(typeof adapter.initialize === 'function');
      assert.ok(typeof adapter.search === 'function');
      assert.ok(typeof adapter.getDocument === 'function');
      assert.ok(typeof adapter.searchRunbooks === 'function');
      assert.ok(typeof adapter.healthCheck === 'function');
      assert.ok(typeof adapter.refreshIndex === 'function');
      assert.ok(typeof adapter.cleanup === 'function');
      assert.ok(typeof adapter.getMetadata === 'function');
    });

    it('should not be ready before initialization', () => {
      assert.strictEqual(adapter.isReady(), false);
    });
  });

  describe('Health Check', () => {
    it('should return unhealthy when not initialized', async () => {
      const health = await adapter.healthCheck();
      
      assert.strictEqual(health.source_name, 'test-github');
      assert.strictEqual(health.healthy, false);
      assert.ok(health.response_time_ms >= 0);
      assert.ok(health.last_check);
      assert.ok(health.error_message);
    });
  });

  describe('Metadata', () => {
    it('should return basic metadata', async () => {
      const metadata = await adapter.getMetadata();
      
      assert.strictEqual(metadata.name, 'test-github');
      assert.strictEqual(metadata.type, 'github');
      assert.strictEqual(metadata.documentCount, 0);
      assert.strictEqual(metadata.lastIndexed, 'never');
      assert.ok(typeof metadata.avgResponseTime === 'number');
      assert.ok(typeof metadata.successRate === 'number');
    });
  });

  describe('Search Interface', () => {
    it('should handle search calls gracefully when not initialized', async () => {
      try {
        await adapter.search('test query');
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error instanceof Error);
      }
    });

    it('should handle search with filters', async () => {
      const filters: SearchFilters = {
        source_types: ['github'],
        categories: ['runbook'],
        limit: 10,
      };

      try {
        await adapter.search('test query', filters);
        assert.fail('Should have thrown an error when not initialized');
      } catch (error) {
        assert.ok(error instanceof Error);
      }
    });
  });

  describe('Runbook Search', () => {
    it('should handle runbook search calls', async () => {
      try {
        await adapter.searchRunbooks('memory_pressure', 'high', ['web-server'], {
          environment: 'production',
        });
        assert.fail('Should have thrown an error when not initialized');
      } catch (error) {
        assert.ok(error instanceof Error);
      }
    });
  });

  describe('Document Retrieval', () => {
    it('should handle document retrieval calls', async () => {
      const result = await adapter.getDocument('github:repo:12345');
      assert.strictEqual(result, null); // Should return null when not initialized
    });

    it('should handle invalid document IDs', async () => {
      const result = await adapter.getDocument('invalid:id:format');
      assert.strictEqual(result, null);
    });
  });

  describe('Index Management', () => {
    it('should handle refresh index calls', async () => {
      const result = await adapter.refreshIndex();
      assert.strictEqual(result, false); // Should fail when not initialized
    });

    it('should handle forced refresh', async () => {
      const result = await adapter.refreshIndex(true);
      assert.strictEqual(result, false); // Should fail when not initialized
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources gracefully', async () => {
      await adapter.cleanup();
      assert.strictEqual(adapter.isReady(), false);
    });

    it('should be safe to call cleanup multiple times', async () => {
      await adapter.cleanup();
      await adapter.cleanup(); // Should not throw
      assert.strictEqual(adapter.isReady(), false);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing auth configuration', () => {
      const configWithoutAuth: GitHubConfig = {
        ...mockConfig,
        auth: undefined,
      };

      const adapter = new GitHubAdapter(configWithoutAuth);
      assert.ok(adapter);
    });

    it('should handle empty repositories array', () => {
      const configWithEmptyRepos: GitHubConfig = {
        ...mockConfig,
        organization: undefined,
        repositories: [],
      };

      const adapter = new GitHubAdapter(configWithEmptyRepos);
      assert.deepStrictEqual(adapter.getConfig().repositories, []);
    });
  });

  describe('Options Handling', () => {
    it('should handle semantic search options', () => {
      const adapter = new GitHubAdapter(mockConfig, {
        enableSemanticSearch: true,
      });
      assert.ok(adapter);
    });

    it('should handle performance options', () => {
      const adapter = new GitHubAdapter(mockConfig, {
        performance: {
          cacheTtlSeconds: 1800,
          maxConcurrentRequests: 5,
          requestTimeoutMs: 15000,
        },
      });
      assert.ok(adapter);
    });

    it('should handle filtering options', () => {
      const adapter = new GitHubAdapter(mockConfig, {
        filtering: {
          includePatterns: ['**/*.md', '**/docs/**'],
          excludePatterns: ['node_modules/**'],
          syncPrivateRepos: true,
          syncArchivedRepos: false,
          syncForks: true,
        },
      });
      assert.ok(adapter);
    });

    it('should handle webhook options', () => {
      const adapter = new GitHubAdapter(mockConfig, {
        enableChangeWatching: true,
        webhookUrl: 'https://api.example.com/webhook',
      });
      assert.ok(adapter);
    });
  });
});

describe('GitHubAdapter Integration', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    const config: GitHubConfig = {
      name: 'integration-github',
      type: 'github',
      organization: 'octocat', // Use a known public org
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3,
    };

    adapter = new GitHubAdapter(config, {
      enableSemanticSearch: false,
      maxRepositoriesPerOrg: 5, // Limit for testing
      maxFilesPerRepo: 10,
    });
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.cleanup();
    }
  });

  describe('Real GitHub API Integration', () => {
    // These tests require actual GitHub API access
    // They are designed to work with public repositories without authentication
    
    it.skip('should initialize successfully with public access', async () => {
      // Skip by default since it requires network access
      await adapter.initialize();
      assert.strictEqual(adapter.isReady(), true);
    });

    it.skip('should perform health check with public access', async () => {
      // Skip by default since it requires network access
      const health = await adapter.healthCheck();
      assert.ok(health.response_time_ms >= 0);
    });
  });
});

/**
 * Mock Tests for GitHub Adapter Components
 * 
 * These tests verify the integration between GitHub adapter components
 * without requiring actual GitHub API access.
 */
describe('GitHubAdapter Component Integration', () => {
  describe('AuthManager Integration', () => {
    it('should create AuthManager with correct configuration', () => {
      const config: GitHubConfig = {
        name: 'test',
        type: 'github',
        organization: 'test-org',
        auth: {
          type: 'personal_token',
          token_env: 'TEST_GITHUB_TOKEN',
        },
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 30000,
        max_retries: 3,
      };

      const adapter = new GitHubAdapter(config);
      assert.ok(adapter);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate complete GitHub configuration', () => {
      const fullConfig: GitHubConfig = {
        name: 'full-github',
        type: 'github',
        api_url: 'https://api.github.com',
        graphql_url: 'https://api.github.com/graphql',
        organization: 'my-org',
        repositories: [
          'owner1/repo1',
          { owner: 'owner2', name: 'repo2' },
        ],
        auth: {
          type: 'github_app',
          app_id_env: 'GITHUB_APP_ID',
          private_key_env: 'GITHUB_PRIVATE_KEY',
          installation_id_env: 'GITHUB_INSTALLATION_ID',
        },
        scope: {
          repositories: ['owner/repo'],
          include_private: true,
          user_consent_given: true,
        },
        webhook: {
          endpoint_url: 'https://api.example.com/webhook',
          secret_env: 'GITHUB_WEBHOOK_SECRET',
          events: ['push', 'pull_request'],
        },
        refresh_interval: '30m',
        priority: 1,
        enabled: true,
        timeout_ms: 30000,
        max_retries: 3,
      };

      const adapter = new GitHubAdapter(fullConfig, {
        enableSemanticSearch: true,
        enableChangeWatching: true,
        maxRepositoriesPerOrg: 100,
        maxFilesPerRepo: 500,
        syncIntervalMinutes: 30,
        webhookUrl: 'https://api.example.com/webhook',
        performance: {
          cacheTtlSeconds: 1800,
          maxConcurrentRequests: 10,
          requestTimeoutMs: 30000,
        },
        filtering: {
          includePatterns: ['**/*.md', '**/README*', '**/docs/**'],
          excludePatterns: ['node_modules/**', '.git/**'],
          syncPrivateRepos: true,
          syncArchivedRepos: false,
          syncForks: true,
        },
      });

      assert.ok(adapter);
      assert.strictEqual(adapter.getConfig().name, 'full-github');
      assert.strictEqual(adapter.getConfig().organization, 'my-org');
      assert.ok(adapter.getConfig().repositories);
      assert.strictEqual(adapter.getConfig().repositories.length, 2);
    });
  });
});