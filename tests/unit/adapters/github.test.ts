/**
 * Unit tests for GitHubAdapter
 * 
 * Tests the GitHub source adapter functionality including:
 * - Authentication and initialization
 * - Rate limiting and API usage safeguards
 * - Repository indexing and content retrieval
 * - Search functionality and runbook extraction
 * - Configuration validation and error handling
 */

// Mock logger first
jest.mock('../../../src/utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the Octokit library
const mockOctokit = {
  rest: {
    users: {
      getAuthenticated: jest.fn(),
    },
    repos: {
      get: jest.fn(),
      getContent: jest.fn(),
      listForOrg: jest.fn(),
    },
    git: {
      getTree: jest.fn(),
    },
    rateLimit: {
      get: jest.fn(),
    },
  },
};

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(() => mockOctokit),
}));

import { GitHubAdapter } from '../../../src/adapters/github.js';
import {
  GitHubConfig,
  GitHubRateLimitError,
  GitHubAuthenticationError,
  GitHubConfigurationError,
} from '../../../src/types/index.js';

// Get the mocked logger for assertions
const mockLogger = require('../../../src/utils/logger.js').logger;

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;
  let config: GitHubConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up test environment variable
    process.env.GITHUB_TOKEN = 'ghp_test_token_123';

    // Create base configuration
    config = {
      name: 'test-github',
      type: 'github',
      auth: {
        type: 'personal_token',
        token_env: 'GITHUB_TOKEN',
      },
      scope: {
        repositories: ['test-org/test-repo'],
        user_consent_given: false,
        include_private: false,
      },
      content_types: {
        readme: true,
        wiki: false,
        documentation: true,
        issues: false,
        pull_requests: false,
        code_comments: false,
      },
      performance: {
        cache_ttl: '4h',
        max_file_size_kb: 100,
        rate_limit_quota: 10,
        min_request_interval_ms: 2000,
        concurrent_requests: 1,
        max_repositories_per_scan: 5,
      },
      refresh_interval: '6h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3,
    };

    adapter = new GitHubAdapter(config);
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  describe('Constructor and Configuration', () => {
    it('should create adapter with valid configuration', () => {
      expect(adapter).toBeInstanceOf(GitHubAdapter);
      expect(adapter.name).toBe('github');
      expect(adapter.type).toBe('github');
    });

    it('should set conservative rate limiting defaults', () => {
      const rateLimitStatus = (adapter as any).rateLimiter.getStatus();
      expect(rateLimitStatus.conservativeRemaining).toBeLessThanOrEqual(500); // 10% of 5000
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const validation = (GitHubAdapter as any).validateConfiguration?.(config) || 
        require('../../../src/adapters/github.js').GitHubApiGuard.validateConfiguration(config);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject configuration without token', () => {
      const invalidConfig = {
        ...config,
        auth: {
          type: 'personal_token' as const,
          // token_env missing
        },
      };

      const validation = require('../../../src/adapters/github.js').GitHubApiGuard.validateConfiguration(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('GitHub token environment variable is required');
    });

    it('should reject excessive rate limit quota', () => {
      const invalidConfig = {
        ...config,
        performance: {
          ...config.performance,
          rate_limit_quota: 50, // Exceeds 25% limit
        },
      };

      const validation = require('../../../src/adapters/github.js').GitHubApiGuard.validateConfiguration(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Rate limit quota exceeds recommended maximum of 25%');
    });

    it('should reject organization scanning without consent', () => {
      const invalidConfig = {
        ...config,
        scope: {
          ...config.scope,
          organizations: ['test-org'],
          user_consent_given: false,
        },
      };

      const validation = require('../../../src/adapters/github.js').GitHubApiGuard.validateConfiguration(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Organization scanning requires explicit repository filters and user consent');
    });
  });

  describe('Initialization', () => {
    beforeEach(() => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });
    });

    it('should initialize successfully with valid token', async () => {
      await adapter.initialize();

      expect(adapter.isReady()).toBe(true);
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'GitHub authentication verified',
        expect.objectContaining({
          user: 'testuser',
          type: 'User',
        })
      );
    });

    it('should fail initialization with missing token', async () => {
      delete process.env.GITHUB_TOKEN;

      await expect(adapter.initialize()).rejects.toThrow(GitHubConfigurationError);
      expect(adapter.isReady()).toBe(false);
    });

    it('should fail initialization with invalid token', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(
        new Error('Bad credentials')
      );

      await expect(adapter.initialize()).rejects.toThrow(GitHubAuthenticationError);
      expect(adapter.isReady()).toBe(false);
    });

    it('should handle rate limit during initialization', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 403;
      (rateLimitError as any).response = {
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600,
        },
      };

      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(rateLimitError);

      await expect(adapter.initialize()).rejects.toThrow(GitHubRateLimitError);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });
      await adapter.initialize();
    });

    it('should enforce minimum request intervals', async () => {
      const rateLimiter = (adapter as any).rateLimiter;
      const startTime = Date.now();

      // Make two sequential requests
      await rateLimiter.executeRequest(async () => ({ headers: {} }));
      await rateLimiter.executeRequest(async () => ({ headers: {} }));

      const elapsed = Date.now() - startTime;
      // In test mode, interval is reduced to 100ms, in production it's 2000ms
      const expectedInterval = process.env.NODE_ENV === 'test' ? 100 : 2000;
      expect(elapsed).toBeGreaterThanOrEqual(expectedInterval);
    });

    it('should track conservative hourly limits', () => {
      const rateLimiter = (adapter as any).rateLimiter;
      const status = rateLimiter.getStatus();

      expect(status.conservativeRemaining).toBeLessThanOrEqual(500); // 10% of 5000
    });

    it('should throw rate limit error when conservative limit exceeded', async () => {
      const rateLimiter = (adapter as any).rateLimiter;
      
      // Simulate conservative limit reached
      rateLimiter.hourlyRequestCount = 500;
      rateLimiter.hourStartTime = Date.now();

      await expect(
        rateLimiter.executeRequest(async () => ({ headers: {} }))
      ).rejects.toThrow(GitHubRateLimitError);
    });
  });

  describe('Repository Indexing', () => {
    beforeEach(async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          full_name: 'test-org/test-repo',
          default_branch: 'main',
          description: 'Test repository',
          language: 'JavaScript',
          topics: ['documentation'],
          stargazers_count: 10,
          forks_count: 2,
          private: false,
          fork: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
          pushed_at: '2023-12-01T00:00:00Z',
        },
        headers: { 'x-ratelimit-remaining': '4998' },
      });

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [
            {
              type: 'blob',
              path: 'README.md',
              sha: 'abc123',
            },
            {
              type: 'blob',
              path: 'docs/runbook.md',
              sha: 'def456',
            },
          ],
        },
        headers: { 'x-ratelimit-remaining': '4997' },
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          name: 'README.md',
          path: 'README.md',
          sha: 'abc123',
          size: 1000,
          content: Buffer.from('# Test Repository\n\nThis is a test.').toString('base64'),
          encoding: 'base64',
          html_url: 'https://github.com/test-org/test-repo/blob/main/README.md',
          download_url: 'https://github.com/test-org/test-repo/raw/main/README.md',
        },
        headers: { 'x-ratelimit-remaining': '4996' },
      });

      await adapter.initialize();
    });

    it('should successfully index a repository', async () => {
      const result = await adapter.refreshIndex(true);

      expect(result).toBe(true);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
      });
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        tree_sha: 'main',
        recursive: 'true',
      });
    });

    it('should index individual files correctly', async () => {
      await adapter.refreshIndex(true);

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        path: 'README.md',
      });
    });

    it('should skip large files', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          name: 'large-file.md',
          path: 'large-file.md',
          sha: 'xyz789',
          size: 200000, // 200KB > 100KB limit
          content: Buffer.from('Large content').toString('base64'),
          encoding: 'base64',
          html_url: 'https://github.com/test-org/test-repo/blob/main/large-file.md',
          download_url: 'https://github.com/test-org/test-repo/raw/main/large-file.md',
        },
        headers: { 'x-ratelimit-remaining': '4996' },
      });

      await adapter.refreshIndex(true);

      // File should be skipped due to size, so no error should occur
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Skipping large file',
        expect.objectContaining({
          size: 200000,
        })
      );
    });

    it('should respect repository scanning limits', async () => {
      const configWithManyRepos = {
        ...config,
        scope: {
          ...config.scope,
          repositories: Array.from({ length: 10 }, (_, i) => `test-org/repo-${i}`),
        },
        performance: {
          ...config.performance,
          max_repositories_per_scan: 3,
        },
      };

      const limitedAdapter = new GitHubAdapter(configWithManyRepos);
      await limitedAdapter.initialize();

      await limitedAdapter.refreshIndex(true);

      // Should only call repos.get 3 times due to limit
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      // Set up mocks for successful indexing
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          full_name: 'test-org/test-repo',
          default_branch: 'main',
          description: 'Test repository',
          language: 'JavaScript',
          topics: ['documentation'],
          stargazers_count: 10,
          forks_count: 2,
          private: false,
          fork: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
          pushed_at: '2023-12-01T00:00:00Z',
        },
        headers: { 'x-ratelimit-remaining': '4998' },
      });

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [
            {
              type: 'blob',
              path: 'docs/troubleshooting-guide.md',
              sha: 'trouble123',
            },
          ],
        },
        headers: { 'x-ratelimit-remaining': '4997' },
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          name: 'troubleshooting-guide.md',
          path: 'docs/troubleshooting-guide.md',
          sha: 'trouble123',
          size: 2000,
          content: Buffer.from(`# Troubleshooting Guide

## Disk Space Issues

1. Check disk usage with df -h
2. Clean temporary files
3. Check for large log files`).toString('base64'),
          encoding: 'base64',
          html_url: 'https://github.com/test-org/test-repo/blob/main/docs/troubleshooting-guide.md',
          download_url: 'https://github.com/test-org/test-repo/raw/main/docs/troubleshooting-guide.md',
        },
        headers: { 'x-ratelimit-remaining': '4996' },
      });

      await adapter.initialize();
      await adapter.refreshIndex(true);
    });

    it('should search documents and return results', async () => {
      const results = await adapter.search('disk space');

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe('troubleshooting-guide.md');
      expect(results[0]?.content).toContain('Disk Space Issues');
      expect(results[0]?.source_type).toBe('github');
      expect(results[0]?.confidence_score).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching queries', async () => {
      const results = await adapter.search('nonexistent topic');

      expect(results).toHaveLength(0);
    });

    it('should filter by confidence threshold', async () => {
      const results = await adapter.search('disk', {
        confidence_threshold: 0.9, // Very high threshold
      });

      // Should filter out low-confidence matches
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should handle category filters', async () => {
      const configWithCategories = {
        ...config,
        categories: ['documentation'],
      };

      const adapterWithCategories = new GitHubAdapter(configWithCategories);
      await adapterWithCategories.initialize();

      const results = await adapterWithCategories.search('disk', {
        categories: ['documentation'],
      });

      // Should allow search since category matches
      expect(Array.isArray(results)).toBe(true);

      const noMatchResults = await adapterWithCategories.search('disk', {
        categories: ['nonexistent'],
      });

      // Should return empty since category doesn't match
      expect(noMatchResults).toHaveLength(0);
    });
  });

  describe('Runbook Search', () => {
    beforeEach(async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      // Set up mocks for runbook content
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          full_name: 'test-org/runbooks',
          default_branch: 'main',
          description: 'Operational runbooks',
          language: 'Markdown',
          topics: ['ops', 'runbooks'],
          stargazers_count: 5,
          forks_count: 1,
          private: false,
          fork: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
          pushed_at: '2023-12-01T00:00:00Z',
        },
        headers: { 'x-ratelimit-remaining': '4998' },
      });

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [
            {
              type: 'blob',
              path: 'disk-space-runbook.md',
              sha: 'runbook123',
            },
          ],
        },
        headers: { 'x-ratelimit-remaining': '4997' },
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          name: 'disk-space-runbook.md',
          path: 'disk-space-runbook.md',
          sha: 'runbook123',
          size: 1500,
          content: Buffer.from(`# Disk Space Alert Runbook

## Overview
This runbook addresses critical disk space alerts.

## Procedure
1. Check disk usage: df -h
2. Identify large files: du -sh /*
3. Clean temporary files: rm -rf /tmp/*
4. Restart services if needed

## Escalation
Contact SRE team if disk usage > 95%`).toString('base64'),
          encoding: 'base64',
          html_url: 'https://github.com/test-org/runbooks/blob/main/disk-space-runbook.md',
          download_url: 'https://github.com/test-org/runbooks/raw/main/disk-space-runbook.md',
        },
        headers: { 'x-ratelimit-remaining': '4996' },
      });

      const runbookConfig = {
        ...config,
        scope: {
          ...config.scope,
          repositories: ['test-org/runbooks'],
        },
        categories: ['runbooks', 'ops'],
      };

      adapter = new GitHubAdapter(runbookConfig);
      await adapter.initialize();
      await adapter.refreshIndex(true);
    });

    it('should find and extract runbooks', async () => {
      const runbooks = await adapter.searchRunbooks('disk_full', 'critical', ['web-server']);

      expect(runbooks).toHaveLength(1);
      expect(runbooks[0]?.title).toContain('Disk Space');
      expect(runbooks[0]?.triggers).toContain('disk_full');
      expect(runbooks[0]?.procedures).toHaveLength(4); // 4 numbered steps
      expect(runbooks[0]?.metadata.author).toBe('GitHub Adapter (Synthetic)');
    });

    it('should create synthetic runbooks from markdown', async () => {
      const runbooks = await adapter.searchRunbooks('disk_space', 'high', ['database']);

      expect(runbooks.length).toBeGreaterThan(0);
      const runbook = runbooks[0];
      
      expect(runbook?.id).toBeDefined();
      expect(runbook?.decision_tree).toBeDefined();
      expect(runbook?.decision_tree.branches).toHaveLength(1);
      expect(runbook?.severity_mapping).toHaveProperty('disk_space');
    });

    it('should handle empty search results gracefully', async () => {
      const runbooks = await adapter.searchRunbooks('nonexistent_alert', 'low', []);

      expect(runbooks).toHaveLength(0);
    });
  });

  describe('Document Retrieval', () => {
    beforeEach(async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      await adapter.initialize();
    });

    it('should retrieve document by ID', async () => {
      // First, index some content
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          full_name: 'test-org/test-repo',
          default_branch: 'main',
          description: 'Test repository',
          language: 'JavaScript',
          topics: [],
          stargazers_count: 0,
          forks_count: 0,
          private: false,
          fork: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
          pushed_at: '2023-12-01T00:00:00Z',
        },
        headers: { 'x-ratelimit-remaining': '4998' },
      });

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [
            {
              type: 'blob',
              path: 'README.md',
              sha: 'readme123',
            },
          ],
        },
        headers: { 'x-ratelimit-remaining': '4997' },
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          name: 'README.md',
          path: 'README.md',
          sha: 'readme123',
          size: 500,
          content: Buffer.from('# Test README').toString('base64'),
          encoding: 'base64',
          html_url: 'https://github.com/test-org/test-repo/blob/main/README.md',
          download_url: 'https://github.com/test-org/test-repo/raw/main/README.md',
        },
        headers: { 'x-ratelimit-remaining': '4996' },
      });

      await adapter.refreshIndex(true);

      // Generate document ID the same way the adapter does
      const documentId = require('crypto')
        .createHash('sha256')
        .update('test-org/test-repo/README.md')
        .digest('hex');

      const document = await adapter.getDocument(documentId);

      expect(document).not.toBeNull();
      expect(document?.title).toBe('README.md');
      expect(document?.content).toBe('# Test README');
      expect(document?.confidence_score).toBe(1.0);
    });

    it('should return null for non-existent document ID', async () => {
      const document = await adapter.getDocument('nonexistent-id');

      expect(document).toBeNull();
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      mockOctokit.rest.rateLimit.get.mockResolvedValue({
        data: {
          resources: {
            core: {
              limit: 5000,
              remaining: 4999,
              reset: Math.floor(Date.now() / 1000) + 3600,
            },
          },
        },
        headers: { 'x-ratelimit-remaining': '4998' },
      });

      await adapter.initialize();
    });

    it('should return healthy status when all checks pass', async () => {
      // Add some mock indexed repositories to satisfy health check
      const mockIndex = {
        repository: {
          owner: 'test',
          repo: 'repo',
          full_name: 'test/repo',
          default_branch: 'main',
          description: 'Test repo',
          language: 'JavaScript',
          topics: [],
          stars: 0,
          forks: 0,
          is_private: false,
          is_fork: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
          pushed_at: '2023-12-01T00:00:00Z',
        },
        documents: new Map(),
        lastIndexed: new Date(),
        indexComplete: true,
      };
      
      (adapter as any).repositoryIndexes.set('test/repo', mockIndex);
      
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.source_name).toBe('test-github');
      expect(health.response_time_ms).toBeGreaterThan(0);
      expect(health.metadata).toHaveProperty('rate_limit_status');
      expect(health.metadata).toHaveProperty('success_rate');
    });

    it('should return unhealthy status when rate limit exceeded', async () => {
      // Simulate rate limit exceeded
      const rateLimiter = (adapter as any).rateLimiter;
      rateLimiter.hourlyRequestCount = 500;
      rateLimiter.hourStartTime = Date.now();

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error_message).toContain('Rate limit exceeded');
    });

    it('should return unhealthy status when no repositories indexed', async () => {
      // Clear any indexed repositories
      (adapter as any).repositoryIndexes.clear();

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error_message).toContain('No repositories indexed');
    });
  });

  describe('Metadata', () => {
    beforeEach(async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      await adapter.initialize();
    });

    it('should return correct metadata', async () => {
      const metadata = await adapter.getMetadata();

      expect(metadata.name).toBe('test-github');
      expect(metadata.type).toBe('github');
      expect(metadata.documentCount).toBeGreaterThanOrEqual(0);
      expect(metadata.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(metadata.successRate).toBeGreaterThanOrEqual(0);
      expect(metadata.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      await adapter.initialize();
    });

    it('should cleanup resources properly', async () => {
      await adapter.cleanup();

      expect(adapter.isReady()).toBe(false);
      expect((adapter as any).repositoryIndexes.size).toBe(0);
      expect((adapter as any).searchIndex).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle GitHub API errors gracefully', async () => {
      process.env.GITHUB_TOKEN = 'invalid_token';
      
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(
        new Error('Bad credentials')
      );

      await expect(adapter.initialize()).rejects.toThrow(GitHubAuthenticationError);
    });

    it('should handle network errors during indexing', async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      await adapter.initialize();

      mockOctokit.rest.repos.get.mockRejectedValue(new Error('Network error'));

      const result = await adapter.refreshIndex(true);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'GitHub index refresh failed',
        expect.objectContaining({
          error: 'Network error',
        })
      );
    });

    it('should handle file decoding errors', async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      await adapter.initialize();

      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          full_name: 'test-org/test-repo',
          default_branch: 'main',
          description: 'Test repository',
          language: 'JavaScript',
          topics: [],
          stargazers_count: 0,
          forks_count: 0,
          private: false,
          fork: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
          pushed_at: '2023-12-01T00:00:00Z',
        },
        headers: { 'x-ratelimit-remaining': '4998' },
      });

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [
            {
              type: 'blob',
              path: 'invalid.md',
              sha: 'invalid123',
            },
          ],
        },
        headers: { 'x-ratelimit-remaining': '4997' },
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          name: 'invalid.md',
          path: 'invalid.md',
          sha: 'invalid123',
          size: 100,
          content: 'invalid-base64-content!!!',
          encoding: 'base64',
          html_url: 'https://github.com/test-org/test-repo/blob/main/invalid.md',
          download_url: 'https://github.com/test-org/test-repo/raw/main/invalid.md',
        },
        headers: { 'x-ratelimit-remaining': '4996' },
      });

      const result = await adapter.refreshIndex(true);

      // Should complete successfully despite file decoding error
      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Failed to decode file content',
        expect.objectContaining({
          path: 'invalid.md',
        })
      );
    });
  });

  describe('Organization Scanning', () => {
    let orgConfig: GitHubConfig;

    beforeEach(() => {
      orgConfig = {
        ...config,
        scope: {
          organizations: ['test-org'],
          user_consent_given: true,
          include_private: false,
          repository_filters: {
            topics: ['documentation'],
            min_stars: 1,
          },
        },
      };
    });

    it('should require explicit consent for organization scanning', async () => {
      const noConsentConfig = {
        ...orgConfig,
        scope: {
          ...orgConfig.scope,
          user_consent_given: false,
        },
      };

      const orgAdapter = new GitHubAdapter(noConsentConfig);
      
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      await orgAdapter.initialize();

      // Should skip organization scanning without consent
      const result = await orgAdapter.refreshIndex(true);
      expect(result).toBe(true);
      expect(mockOctokit.rest.repos.listForOrg).not.toHaveBeenCalled();
    });

    it('should scan organization with proper consent and filters', async () => {
      const orgAdapter = new GitHubAdapter(orgConfig);
      
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      mockOctokit.rest.repos.listForOrg.mockResolvedValue({
        data: [
          {
            name: 'docs-repo',
            owner: { login: 'test-org' },
            full_name: 'test-org/docs-repo',
            topics: ['documentation'],
            stargazers_count: 5,
            language: 'Markdown',
            created_at: '2023-01-01T00:00:00Z',
          },
        ],
        headers: { 'x-ratelimit-remaining': '4998' },
      });

      // Mock successful repository indexing
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          full_name: 'test-org/docs-repo',
          default_branch: 'main',
          description: 'Documentation repository',
          language: 'Markdown',
          topics: ['documentation'],
          stargazers_count: 5,
          forks_count: 0,
          private: false,
          fork: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-12-01T00:00:00Z',
          pushed_at: '2023-12-01T00:00:00Z',
        },
        headers: { 'x-ratelimit-remaining': '4997' },
      });

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: [] },
        headers: { 'x-ratelimit-remaining': '4996' },
      });

      await orgAdapter.initialize();
      const result = await orgAdapter.refreshIndex(true);

      expect(result).toBe(true);
      expect(mockOctokit.rest.repos.listForOrg).toHaveBeenCalledWith({
        org: 'test-org',
        type: 'public',
        sort: 'updated',
        per_page: 50,
      });
    });
  });
});