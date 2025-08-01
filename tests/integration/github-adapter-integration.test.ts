/**
 * Integration tests for GitHubAdapter
 * 
 * Tests the GitHub adapter with mock API responses to simulate
 * real-world usage scenarios and error conditions.
 */

import { GitHubAdapter } from '../../src/adapters/github.js';
import { GitHubConfig } from '../../src/types/index.js';

// Mock the entire Octokit library with detailed responses
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

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
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

// Get the mocked logger for assertions
const mockLogger = require('../../src/utils/logger.js').logger;

describe('GitHubAdapter Integration', () => {
  let adapter: GitHubAdapter;
  let config: GitHubConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.GITHUB_TOKEN = 'ghp_test_integration_token';

    config = {
      name: 'github-integration-test',
      type: 'github',
      auth: {
        type: 'personal_token',
        token_env: 'GITHUB_TOKEN',
      },
      scope: {
        repositories: ['test-org/documentation', 'test-org/runbooks'],
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
        min_request_interval_ms: 1000, // Faster for testing
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

  afterEach(async () => {
    await adapter.cleanup();
    delete process.env.GITHUB_TOKEN;
  });

  describe('End-to-End Documentation Retrieval', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'integration-test-user', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999', 'x-ratelimit-reset': '1640995200' },
      });

      // Mock documentation repository
      mockOctokit.rest.repos.get
        .mockResolvedValueOnce({
          data: {
            full_name: 'test-org/documentation',
            default_branch: 'main',
            description: 'Comprehensive documentation repository',
            language: 'Markdown',
            topics: ['documentation', 'guides'],
            stargazers_count: 25,
            forks_count: 8,
            private: false,
            fork: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-12-01T12:00:00Z',
            pushed_at: '2023-12-01T12:00:00Z',
          },
          headers: { 'x-ratelimit-remaining': '4998' },
        })
        .mockResolvedValueOnce({
          data: {
            full_name: 'test-org/runbooks',
            default_branch: 'main',
            description: 'Operational runbooks and procedures',
            language: 'Markdown',
            topics: ['ops', 'runbooks', 'sre'],
            stargazers_count: 15,
            forks_count: 3,
            private: false,
            fork: false,
            created_at: '2023-02-01T00:00:00Z',
            updated_at: '2023-12-01T15:30:00Z',
            pushed_at: '2023-12-01T15:30:00Z',
          },
          headers: { 'x-ratelimit-remaining': '4997' },
        });

      // Mock repository trees
      mockOctokit.rest.git.getTree
        .mockResolvedValueOnce({
          data: {
            tree: [
              { type: 'blob', path: 'README.md', sha: 'readme-sha-123' },
              { type: 'blob', path: 'docs/api-guide.md', sha: 'api-guide-sha-456' },
              { type: 'blob', path: 'docs/deployment-guide.md', sha: 'deploy-guide-sha-789' },
              { type: 'blob', path: 'docs/troubleshooting.md', sha: 'troubleshoot-sha-abc' },
            ],
          },
          headers: { 'x-ratelimit-remaining': '4996' },
        })
        .mockResolvedValueOnce({
          data: {
            tree: [
              { type: 'blob', path: 'disk-space-runbook.md', sha: 'disk-runbook-sha-def' },
              { type: 'blob', path: 'memory-alert-runbook.md', sha: 'memory-runbook-sha-ghi' },
              { type: 'blob', path: 'service-restart-procedure.md', sha: 'restart-proc-sha-jkl' },
            ],
          },
          headers: { 'x-ratelimit-remaining': '4995' },
        });

      // Mock file contents
      const fileContents = {
        'README.md': '# Documentation Repository\\n\\nComprehensive guides and documentation.',
        'docs/api-guide.md': `# API Guide

## Authentication
Use Bearer tokens for API authentication.

## Endpoints
- GET /api/users
- POST /api/users
- PUT /api/users/:id`,
        'docs/deployment-guide.md': `# Deployment Guide

## Prerequisites
- Docker installed
- Kubernetes cluster access

## Steps
1. Build the application
2. Create Docker image
3. Deploy to Kubernetes`,
        'docs/troubleshooting.md': `# Troubleshooting Guide

## Common Issues

### Database Connection
If you see connection errors:
1. Check database credentials
2. Verify network connectivity
3. Restart database service`,
        'disk-space-runbook.md': `# Disk Space Alert Runbook

## Severity: Critical

## Triggers
- Disk usage > 90%
- Available space < 1GB

## Procedure
1. Identify largest files: \`du -sh /* | sort -hr\`
2. Clean temporary files: \`find /tmp -type f -atime +7 -delete\`
3. Rotate logs: \`logrotate -f /etc/logrotate.conf\`
4. Check for core dumps: \`find / -name "core.*" -delete\`

## Escalation
If disk usage remains > 95% after cleanup, escalate to SRE team.`,
        'memory-alert-runbook.md': `# Memory Alert Runbook

## Severity: High

## Description
High memory usage detected on server.

## Immediate Actions
1. Check memory usage: \`free -h\`
2. Identify memory-intensive processes: \`ps aux --sort=-%mem | head -10\`
3. Check for memory leaks: \`valgrind --tool=memcheck app\`

## Resolution Steps
1. Restart high-memory processes
2. Clear system cache if needed
3. Scale horizontally if persistent`,
        'service-restart-procedure.md': `# Service Restart Procedure

## When to Use
- Service becomes unresponsive
- Memory leaks detected
- After configuration changes

## Steps
1. Check service status: \`systemctl status service-name\`
2. Stop service gracefully: \`systemctl stop service-name\`
3. Wait 10 seconds
4. Start service: \`systemctl start service-name\`
5. Verify startup: \`systemctl status service-name\`
6. Check logs: \`journalctl -u service-name -f\``,
      };

      mockOctokit.rest.repos.getContent.mockImplementation(({ path }) => {
        const content = fileContents[path as keyof typeof fileContents];
        if (!content) {
          throw new Error(`File not found: ${path}`);
        }

        return Promise.resolve({
          data: {
            type: 'file',
            name: path.split('/').pop(),
            path,
            sha: `${path}-sha`,
            size: content.length,
            content: Buffer.from(content).toString('base64'),
            encoding: 'base64',
            html_url: `https://github.com/test-org/${path.includes('runbook') ? 'runbooks' : 'documentation'}/blob/main/${path}`,
            download_url: `https://github.com/test-org/${path.includes('runbook') ? 'runbooks' : 'documentation'}/raw/main/${path}`,
          },
          headers: { 'x-ratelimit-remaining': '4990' },
        });
      });

      // Mock rate limit check
      mockOctokit.rest.rateLimit.get.mockResolvedValue({
        data: {
          resources: {
            core: {
              limit: 5000,
              remaining: 4990,
              reset: Math.floor(Date.now() / 1000) + 3600,
            },
          },
        },
        headers: { 'x-ratelimit-remaining': '4989' },
      });
    });

    it('should initialize and index multiple repositories successfully', async () => {
      await adapter.initialize();
      
      expect(adapter.isReady()).toBe(true);
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalledTimes(1);

      const indexResult = await adapter.refreshIndex(true);
      
      expect(indexResult).toBe(true);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(2);
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(2);
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(7); // 4 + 3 files

      const metadata = await adapter.getMetadata();
      expect(metadata.documentCount).toBe(7);
      expect(metadata.type).toBe('github');
    });

    it('should perform comprehensive documentation search', async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);

      // Test general documentation search
      const deploymentResults = await adapter.search('deployment kubernetes docker');
      expect(deploymentResults.length).toBeGreaterThan(0);
      
      const deploymentDoc = deploymentResults.find(r => r.title === 'deployment-guide.md');
      expect(deploymentDoc).toBeDefined();
      expect(deploymentDoc?.content).toContain('Kubernetes');
      expect(deploymentDoc?.confidence_score).toBeGreaterThan(0.5);

      // Test API documentation search
      const apiResults = await adapter.search('API authentication endpoints');
      expect(apiResults.length).toBeGreaterThan(0);
      
      const apiDoc = apiResults.find(r => r.title === 'api-guide.md');
      expect(apiDoc).toBeDefined();
      expect(apiDoc?.content).toContain('Bearer tokens');

      // Test troubleshooting search
      const troubleshootResults = await adapter.search('database connection error');
      expect(troubleshootResults.length).toBeGreaterThan(0);
      
      const troubleshootDoc = troubleshootResults.find(r => r.title === 'troubleshooting.md');
      expect(troubleshootDoc).toBeDefined();
      expect(troubleshootDoc?.content).toContain('database credentials');
    });

    it('should extract and structure runbooks correctly', async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);

      // Test disk space runbook extraction
      const diskRunbooks = await adapter.searchRunbooks('disk_full', 'critical', ['web-server']);
      expect(diskRunbooks.length).toBe(1);
      
      const diskRunbook = diskRunbooks[0];
      expect(diskRunbook?.title).toContain('Disk Space');
      expect(diskRunbook?.triggers).toContain('disk_full');
      expect(diskRunbook?.severity_mapping).toHaveProperty('disk_full', 'critical');
      expect(diskRunbook?.procedures).toHaveLength(4); // 4 procedure steps
      expect(diskRunbook?.escalation_path).toBeDefined();

      // Verify structured procedure extraction
      expect(diskRunbook?.procedures[0]?.description).toContain('du -sh');
      expect(diskRunbook?.procedures[1]?.description).toContain('/tmp');

      // Test memory runbook extraction
      const memoryRunbooks = await adapter.searchRunbooks('memory_pressure', 'high', ['app-server']);
      expect(memoryRunbooks.length).toBe(1);
      
      const memoryRunbook = memoryRunbooks[0];
      expect(memoryRunbook?.title).toContain('Memory Alert');
      expect(memoryRunbook?.procedures).toHaveLength(3); // 3 resolution steps
    });

    it('should handle document retrieval by ID', async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);

      // Get a document ID by searching first
      const searchResults = await adapter.search('API guide');
      expect(searchResults.length).toBeGreaterThan(0);
      
      const apiGuideResult = searchResults.find(r => r.title === 'api-guide.md');
      expect(apiGuideResult).toBeDefined();

      // Retrieve the same document by ID
      const retrievedDoc = await adapter.getDocument(apiGuideResult!.id);
      expect(retrievedDoc).not.toBeNull();
      expect(retrievedDoc?.title).toBe('api-guide.md');
      expect(retrievedDoc?.content).toContain('Bearer tokens');
      expect(retrievedDoc?.confidence_score).toBe(1.0); // Direct retrieval has full confidence
    });

    it('should respect rate limits during bulk operations', async () => {
      await adapter.initialize();

      // Monitor request timing
      const startTime = Date.now();
      await adapter.refreshIndex(true);
      const endTime = Date.now();

      // With rate limits in test mode (100ms intervals), expect much shorter time
      // In production this would be 6+ seconds, but in test mode it's much faster
      const expectedMinimumTime = process.env.NODE_ENV === 'test' ? 500 : 6000;
      expect(endTime - startTime).toBeGreaterThanOrEqual(expectedMinimumTime);

      // Verify rate limit status is being tracked
      const health = await adapter.healthCheck();
      expect(health.metadata?.rate_limit_status).toBeDefined();
      expect(health.metadata?.rate_limit_status.canMakeRequest).toBeDefined();
    });

    it('should handle mixed content types correctly', async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);

      // Search for content that should exist in both repositories
      const results = await adapter.search('steps');
      
      // Should find content from both documentation and runbooks repositories
      const foundRepos = new Set(results.map(r => {
        const repo = r.metadata?.repository || '';
        if (repo.includes('runbooks')) {
          return 'runbook';
        } else if (repo.includes('documentation')) {
          return 'documentation';
        }
        return 'other';
      }));

      expect(foundRepos.has('runbook')).toBe(true);
      expect(foundRepos.has('documentation')).toBe(true);

      // Verify metadata includes repository information
      results.forEach(result => {
        expect(result.metadata?.repository).toBeDefined();
        expect(result.metadata?.repository).toMatch(/test-org\/(documentation|runbooks)/);
        expect(result.source_type).toBe('github');
        expect(result.url).toMatch(/https:\/\/github\.com\/test-org/);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle authentication failures gracefully', async () => {
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(
        Object.assign(new Error('Bad credentials'), { status: 401 })
      );

      await expect(adapter.initialize()).rejects.toThrow('GitHub authentication verification failed');
      expect(adapter.isReady()).toBe(false);
    });

    it('should handle rate limit errors during indexing', async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'test-user', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      await adapter.initialize();

      // Mock rate limit error during repository indexing
      const rateLimitError = Object.assign(new Error('API rate limit exceeded'), {
        status: 403,
        response: {
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 3600,
          },
        },
      });

      mockOctokit.rest.repos.get.mockRejectedValue(rateLimitError);

      const result = await adapter.refreshIndex(true);
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'GitHub index refresh failed',
        expect.objectContaining({
          error: 'API rate limit exceeded',
        })
      );
    });

    it('should handle partial repository indexing failures', async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'test-user', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      await adapter.initialize();

      // First repository succeeds
      mockOctokit.rest.repos.get
        .mockResolvedValueOnce({
          data: {
            full_name: 'test-org/documentation',
            default_branch: 'main',
            description: 'Test repository',
            language: 'Markdown',
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
        })
        // Second repository fails
        .mockRejectedValueOnce(new Error('Repository not found'));

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: [] },
        headers: { 'x-ratelimit-remaining': '4997' },
      });

      const result = await adapter.refreshIndex(true);
      expect(result).toBe(true); // Should complete successfully despite one failure

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to index repository',
        expect.objectContaining({
          owner: 'test-org',
          repo: 'runbooks',
          error: 'Repository not found',
        })
      );
    });

    it('should handle malformed file content gracefully', async () => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'test-user', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      await adapter.initialize();

      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          full_name: 'test-org/documentation',
          default_branch: 'main',
          description: 'Test repository',
          language: 'Markdown',
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
            { type: 'blob', path: 'malformed.md', sha: 'malformed-sha' },
          ],
        },
        headers: { 'x-ratelimit-remaining': '4997' },
      });

      // Return malformed base64 content
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          name: 'malformed.md',
          path: 'malformed.md',
          sha: 'malformed-sha',
          size: 100,
          content: 'not-valid-base64-content!!!',
          encoding: 'base64',
          html_url: 'https://github.com/test-org/documentation/blob/main/malformed.md',
          download_url: 'https://github.com/test-org/documentation/raw/main/malformed.md',
        },
        headers: { 'x-ratelimit-remaining': '4996' },
      });

      const result = await adapter.refreshIndex(true);
      expect(result).toBe(true); // Should complete successfully despite malformed content

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Failed to decode file content',
        expect.objectContaining({
          path: 'malformed.md',
        })
      );
    });
  });

  describe('Performance and Caching', () => {
    beforeEach(() => {
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: { login: 'test-user', type: 'User' },
        headers: { 'x-ratelimit-remaining': '4999' },
      });

      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          full_name: 'test-org/documentation',
          default_branch: 'main',
          description: 'Test repository',
          language: 'Markdown',
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
        data: { tree: [] },
        headers: { 'x-ratelimit-remaining': '4997' },
      });

      mockOctokit.rest.rateLimit.get.mockResolvedValue({
        data: {
          resources: {
            core: {
              limit: 5000,
              remaining: 4997,
              reset: Math.floor(Date.now() / 1000) + 3600,
            },
          },
        },
        headers: { 'x-ratelimit-remaining': '4996' },
      });
    });

    it('should cache repository indexes and avoid redundant API calls', async () => {
      await adapter.initialize();
      
      // First indexing
      await adapter.refreshIndex(true);
      const firstCallCount = mockOctokit.rest.repos.get.mock.calls.length;

      // Second indexing without force should use cache
      await adapter.refreshIndex(false);
      const secondCallCount = mockOctokit.rest.repos.get.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount); // No additional API calls

      // Force refresh should make new API calls
      await adapter.refreshIndex(true);
      const thirdCallCount = mockOctokit.rest.repos.get.mock.calls.length;

      expect(thirdCallCount).toBeGreaterThan(secondCallCount);
    });

    it('should maintain good search performance with indexed content', async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);

      // Perform search and measure time
      const startTime = Date.now();
      const results = await adapter.search('documentation');
      const searchTime = Date.now() - startTime;

      // Search should be fast (under 100ms for empty results)
      expect(searchTime).toBeLessThan(100);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should provide accurate health and metadata information', async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.response_time_ms).toBeGreaterThan(0);
      expect(health.response_time_ms).toBeLessThan(1000);
      expect(health.metadata?.rate_limit_status).toBeDefined();

      const metadata = await adapter.getMetadata();
      expect(metadata.name).toBe('github-integration-test');
      expect(metadata.type).toBe('github');
      expect(metadata.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(metadata.successRate).toBeGreaterThanOrEqual(0);
      expect(metadata.successRate).toBeLessThanOrEqual(1);
    });
  });
});