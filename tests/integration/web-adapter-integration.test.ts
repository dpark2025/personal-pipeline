/**
 * WebAdapter Integration Tests
 * 
 * Integration tests that test the WebAdapter with real web content
 * using a local test server to simulate various web scenarios.
 */

import { WebAdapter } from '../../src/adapters/web.js';
import { SourceConfig } from '../../src/types/index.js';
import express from 'express';
import { Server } from 'http';

// Mock logger to avoid console output in tests
jest.mock('../../src/utils/logger.js', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  })),
}));

describe('WebAdapter Integration', () => {
  let app: express.Application;
  let server: Server;
  let baseUrl: string;
  let adapter: WebAdapter;
  let mockConfig: SourceConfig & { type: 'web'; base_urls: string[] };

  beforeAll(async () => {
    // Set up test server
    app = express();
    
    // Test pages
    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>Test Documentation Site</title>
            <meta name="description" content="A test documentation site for integration testing">
          </head>
          <body>
            <nav>Navigation menu</nav>
            <article class="main-content">
              <h1>Welcome to Test Docs</h1>
              <p>This is a test documentation site with multiple pages and content types.</p>
              <p>You can find various guides and runbooks here.</p>
              <ul>
                <li><a href="/guides/setup">Setup Guide</a></li>
                <li><a href="/runbooks/database">Database Runbook</a></li>
                <li><a href="/api/reference">API Reference</a></li>
                <li><a href="/archive/old">Old Archive</a></li>
              </ul>
            </article>
            <footer>Site footer</footer>
          </body>
        </html>
      `);
    });

    app.get('/guides/setup', (req, res) => {
      res.send(`
        <html>
          <head><title>Setup Guide</title></head>
          <body>
            <article>
              <h1>System Setup Guide</h1>
              <p>This guide will help you set up the system properly.</p>
              <h2>Prerequisites</h2>
              <p>Before starting, ensure you have the following:</p>
              <ul>
                <li>Node.js 18 or higher</li>
                <li>Docker installed</li>
                <li>Database access</li>
              </ul>
              <h2>Installation Steps</h2>
              <p>Step 1: Clone the repository</p>
              <pre><code>git clone https://github.com/example/repo.git</code></pre>
              <p>Step 2: Install dependencies</p>
              <pre><code>npm install</code></pre>
              <p>Step 3: Configure environment</p>
              <p>Copy the .env.example file and update with your settings.</p>
            </article>
          </body>
        </html>
      `);
    });

    app.get('/runbooks/database', (req, res) => {
      res.send(`
        <html>
          <head><title>Database High CPU Runbook</title></head>
          <body>
            <article class="runbook">
              <h1>Database High CPU Alert Response</h1>
              <p><strong>Alert Type:</strong> high_cpu</p>
              <p><strong>Severity:</strong> critical</p>
              <p><strong>Affected Systems:</strong> database, mysql</p>
              
              <h2>Troubleshooting Procedure</h2>
              <p>This runbook addresses high CPU usage on database servers.</p>
              
              <h3>Investigation Steps</h3>
              <p>Step 1: Check current CPU usage</p>
              <pre><code>top -p $(pidof mysqld)</code></pre>
              
              <p>Step 2: Identify expensive queries</p>
              <pre><code>SHOW PROCESSLIST;</code></pre>
              
              <p>Step 3: Analyze query performance</p>
              <pre><code>EXPLAIN SELECT * FROM slow_query_table;</code></pre>
              
              <h3>Resolution Steps</h3>
              <p>Step 4: Kill long-running queries if needed</p>
              <pre><code>KILL QUERY [process_id];</code></pre>
              
              <p>Step 5: Restart MySQL service if critical</p>
              <pre><code>sudo systemctl restart mysql</code></pre>
              
              <p>Step 6: Monitor CPU levels for 10 minutes</p>
              
              <h3>Escalation</h3>
              <p>If CPU remains high after following these steps, escalate to the database team.</p>
            </article>
          </body>
        </html>
      `);
    });

    app.get('/api/reference', (req, res) => {
      res.send(`
        <html>
          <head><title>API Reference</title></head>
          <body>
            <article>
              <h1>REST API Reference</h1>
              <p>Complete reference for the REST API endpoints.</p>
              
              <h2>Authentication</h2>
              <p>All requests require an API key in the Authorization header:</p>
              <pre><code>Authorization: Bearer YOUR_API_KEY</code></pre>
              
              <h2>Endpoints</h2>
              
              <h3>GET /api/users</h3>
              <p>Retrieve a list of users.</p>
              <p><strong>Response:</strong> 200 OK</p>
              <pre><code>{
  "users": [
    {"id": 1, "name": "John Doe", "email": "john@example.com"}
  ]
}</code></pre>
              
              <h3>POST /api/users</h3>
              <p>Create a new user.</p>
              <p><strong>Request Body:</strong></p>
              <pre><code>{
  "name": "Jane Smith",
  "email": "jane@example.com"
}</code></pre>
            </article>
          </body>
        </html>
      `);
    });

    app.get('/archive/old', (req, res) => {
      res.send(`
        <html>
          <head><title>Old Archive</title></head>
          <body>
            <article>
              <h1>Archived Content</h1>
              <p>This is old archived content that should be excluded from crawling.</p>
            </article>
          </body>
        </html>
      `);
    });

    app.get('/robots.txt', (req, res) => {
      res.type('text/plain').send(`
User-agent: *
Allow: /
Disallow: /private/
Disallow: /admin/

Crawl-delay: 1
      `.trim());
    });

    // Start server
    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    mockConfig = {
      name: 'integration-web',
      type: 'web',
      base_urls: [baseUrl],
      max_depth: 2,
      rate_limit: {
        requests_per_second: 5, // Reasonable for tests
        concurrent_requests: 2,
      },
      cache_ttl: '5m',
      respect_robots_txt: true,
    };

    adapter = new WebAdapter(mockConfig);
  });

  describe('End-to-End Web Crawling', () => {
    it('should crawl multiple pages and extract content', async () => {
      await adapter.initialize();
      
      const result = await adapter.refreshIndex(true);
      expect(result).toBe(true);
      
      const metadata = await adapter.getMetadata();
      expect(metadata.documentCount).toBeGreaterThan(1);
      expect(metadata.successRate).toBeGreaterThan(0.5);
    }, 30000);

    it('should respect depth limits during crawling', async () => {
      const shallowConfig = { ...mockConfig, max_depth: 1 };
      const shallowAdapter = new WebAdapter(shallowConfig);
      
      await shallowAdapter.initialize();
      await shallowAdapter.refreshIndex(true);
      
      const shallowMetadata = await shallowAdapter.getMetadata();
      
      const deepConfig = { ...mockConfig, max_depth: 3 };
      const deepAdapter = new WebAdapter(deepConfig);
      
      await deepAdapter.initialize();
      await deepAdapter.refreshIndex(true);
      
      const deepMetadata = await deepAdapter.getMetadata();
      
      expect(deepMetadata.documentCount).toBeGreaterThanOrEqual(shallowMetadata.documentCount);
      
      await shallowAdapter.cleanup();
      await deepAdapter.cleanup();
    }, 30000);

    it('should apply URL pattern filters correctly', async () => {
      const filteredConfig = {
        ...mockConfig,
        url_patterns: {
          include: ['.*/guides/.*', '.*/runbooks/.*'],
          exclude: ['.*/archive/.*'],
        },
      };
      
      const filteredAdapter = new WebAdapter(filteredConfig);
      await filteredAdapter.initialize();
      await filteredAdapter.refreshIndex(true);
      
      const results = await filteredAdapter.search('archive');
      expect(results.length).toBe(0); // Archive should be excluded
      
      const guideResults = await filteredAdapter.search('setup guide');
      expect(guideResults.length).toBeGreaterThan(0);
      
      await filteredAdapter.cleanup();
    }, 30000);
  });

  describe('Content Classification and Extraction', () => {
    beforeEach(async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);
    });

    afterEach(async () => {
      await adapter.cleanup();
    });

    it('should correctly classify documents by category', async () => {
      const runbookResults = await adapter.search('database high cpu', {
        category: 'runbook',
      });
      
      expect(runbookResults.length).toBeGreaterThan(0);
      expect(runbookResults[0].category).toBe('runbook');
      expect(runbookResults[0].title).toContain('Database');
      
      const apiResults = await adapter.search('API reference', {
        category: 'api',
      });
      
      expect(apiResults.length).toBeGreaterThan(0);
      expect(apiResults[0].category).toBe('api');
    }, 30000);

    it('should extract main content while removing navigation', async () => {
      const results = await adapter.search('welcome test docs');
      
      expect(results.length).toBeGreaterThan(0);
      const content = results[0].content;
      
      expect(content).toContain('Welcome to Test Docs');
      expect(content).toContain('test documentation site');
      expect(content).not.toContain('Navigation menu');
      expect(content).not.toContain('Site footer');
    }, 30000);

    it('should detect runbook indicators correctly', async () => {
      const runbookResults = await adapter.search('database cpu runbook');
      
      expect(runbookResults.length).toBeGreaterThan(0);
      const runbook = runbookResults[0];
      
      expect(runbook.match_reasons).toContain('Document identified as runbook');
      expect(runbook.match_reasons).toContain('Contains numbered procedure steps');
      expect(runbook.match_reasons).toContain('Contains executable commands');
    }, 30000);
  });

  describe('Search and Retrieval', () => {
    beforeEach(async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);
    });

    afterEach(async () => {
      await adapter.cleanup();
    });

    it('should perform fuzzy search across all indexed content', async () => {
      const results = await adapter.search('databse setup'); // Typo intentional
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence_score).toBeGreaterThan(0.3); // Should still match with typo
    }, 30000);

    it('should search with confidence thresholds', async () => {
      const lowThresholdResults = await adapter.search('database', {
        min_confidence: 0.3,
      });
      
      const highThresholdResults = await adapter.search('database', {
        min_confidence: 0.8,
      });
      
      expect(highThresholdResults.length).toBeLessThanOrEqual(lowThresholdResults.length);
      
      highThresholdResults.forEach(result => {
        expect(result.confidence_score).toBeGreaterThanOrEqual(0.8);
      });
    }, 30000);

    it('should retrieve documents by ID', async () => {
      const searchResults = await adapter.search('setup guide');
      expect(searchResults.length).toBeGreaterThan(0);
      
      const documentId = searchResults[0].id;
      const document = await adapter.getDocument(documentId);
      
      expect(document).not.toBeNull();
      expect(document!.id).toBe(documentId);
      expect(document!.title).toContain('Setup');
    }, 30000);
  });

  describe('Runbook Processing', () => {
    beforeEach(async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);
    });

    afterEach(async () => {
      await adapter.cleanup();
    });

    it('should extract structured runbooks from web content', async () => {
      const runbooks = await adapter.searchRunbooks('high_cpu', 'critical', ['database']);
      
      expect(runbooks.length).toBeGreaterThan(0);
      
      const runbook = runbooks[0];
      expect(runbook.title).toContain('Database High CPU');
      expect(runbook.triggers).toContain('high_cpu');
      expect(runbook.procedures.length).toBeGreaterThan(0);
      
      // Check that steps are extracted correctly
      const firstStep = runbook.procedures.find(p => p.name === 'Step 1');
      expect(firstStep).toBeDefined();
      expect(firstStep!.description).toContain('Check current CPU usage');
    }, 30000);

    it('should handle runbook search with system filters', async () => {
      const databaseRunbooks = await adapter.searchRunbooks('high_cpu', 'critical', ['database']);
      const webServerRunbooks = await adapter.searchRunbooks('high_cpu', 'critical', ['web-server']);
      
      expect(databaseRunbooks.length).toBeGreaterThan(0);
      expect(webServerRunbooks.length).toBe(0); // No web server runbooks in test data
    }, 30000);
  });

  describe('Performance and Caching', () => {
    it('should respect rate limiting during bulk operations', async () => {
      const slowConfig = {
        ...mockConfig,
        rate_limit: { requests_per_second: 2, concurrent_requests: 1 },
      };
      
      const slowAdapter = new WebAdapter(slowConfig);
      await slowAdapter.initialize();
      
      const startTime = Date.now();
      await slowAdapter.refreshIndex(true);
      const duration = Date.now() - startTime;
      
      // Should take time due to rate limiting
      expect(duration).toBeGreaterThan(1000); // At least 1 second for multiple requests
      
      await slowAdapter.cleanup();
    }, 30000);

    it('should cache content and avoid redundant crawls', async () => {
      await adapter.initialize();
      
      // First crawl
      const startTime1 = Date.now();
      await adapter.refreshIndex(true);
      const duration1 = Date.now() - startTime1;
      
      // Second crawl (should use cache)
      const startTime2 = Date.now();
      await adapter.refreshIndex(false); // Don't force refresh
      const duration2 = Date.now() - startTime2;
      
      expect(duration2).toBeLessThan(duration1); // Cached should be faster
      
      const metadata = await adapter.getMetadata();
      expect(metadata.documentCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error Handling and Resilience', () => {
    it('should handle mixed success/failure scenarios', async () => {
      // Add a broken link to the test server
      app.get('/broken-link', (req, res) => {
        res.status(500).send('Internal Server Error');
      });

      // Add a page that links to the broken page
      app.get('/mixed-content', (req, res) => {
        res.send(`
          <html>
            <body>
              <h1>Mixed Content</h1>
              <p>This page has both good and bad links.</p>
              <a href="/guides/setup">Good link</a>
              <a href="/broken-link">Broken link</a>
            </body>
          </html>
        `);
      });

      const mixedConfig = {
        ...mockConfig,
        base_urls: [`${baseUrl}/mixed-content`],
        max_depth: 2,
      };
      
      const mixedAdapter = new WebAdapter(mixedConfig);
      await mixedAdapter.initialize();
      
      const result = await mixedAdapter.refreshIndex(true);
      expect(result).toBe(true); // Should complete despite some failures
      
      const metadata = await mixedAdapter.getMetadata();
      expect(metadata.documentCount).toBeGreaterThan(0); // Should have crawled some pages
      expect(metadata.successRate).toBeLessThan(1.0); // Should reflect some failures
      
      await mixedAdapter.cleanup();
    }, 30000);

    it('should provide meaningful health check information', async () => {
      await adapter.initialize();
      await adapter.refreshIndex(true);
      
      const health = await adapter.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.source_name).toBe('integration-web');
      expect(health.response_time_ms).toBeGreaterThan(0);
      expect(health.metadata).toHaveProperty('urls_crawled');
      expect(health.metadata).toHaveProperty('documents_indexed');
      expect(health.metadata).toHaveProperty('avg_response_time');
    }, 30000);
  });

  describe('Robots.txt Compliance', () => {
    it('should respect robots.txt when enabled', async () => {
      // Add a disallowed path
      app.get('/private/secret', (req, res) => {
        res.send('<html><body><h1>Secret Page</h1></body></html>');
      });

      const robotsConfig = {
        ...mockConfig,
        base_urls: [`${baseUrl}/private/secret`],
        respect_robots_txt: true,
      };
      
      const robotsAdapter = new WebAdapter(robotsConfig);
      await robotsAdapter.initialize();
      await robotsAdapter.refreshIndex(true);
      
      const metadata = await robotsAdapter.getMetadata();
      expect(metadata.documentCount).toBe(0); // Should be blocked by robots.txt
      
      await robotsAdapter.cleanup();
    }, 30000);

    it('should crawl disallowed paths when robots.txt is disabled', async () => {
      const noRobotsConfig = {
        ...mockConfig,
        base_urls: [`${baseUrl}`],
        respect_robots_txt: false,
      };
      
      const noRobotsAdapter = new WebAdapter(noRobotsConfig);
      await noRobotsAdapter.initialize();
      await noRobotsAdapter.refreshIndex(true);
      
      const metadata = await noRobotsAdapter.getMetadata();
      expect(metadata.documentCount).toBeGreaterThan(0);
      
      await noRobotsAdapter.cleanup();
    }, 30000);
  });
});