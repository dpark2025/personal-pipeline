/**
 * Enhanced unit tests for Confluence Adapter Day 2 features
 * Tests the advanced content processing and search capabilities
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { ConfluenceAdapter } from '../../../src/adapters/confluence.js';
import { ConfluenceConfig, SearchFilters } from '../../../src/types/index.js';

describe('ConfluenceAdapter - Enhanced Day 2 Features', () => {
  let adapter: ConfluenceAdapter;
  let mockConfig: ConfluenceConfig;

  beforeEach(() => {
    // Mock environment variable for testing
    process.env.TEST_CONFLUENCE_TOKEN = 'mock-token';
    
    mockConfig = {
      name: 'test-confluence-enhanced',
      type: 'confluence',
      base_url: 'https://test.atlassian.net/wiki',
      space_keys: ['TEST', 'DOCS'],
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

    adapter = new ConfluenceAdapter(mockConfig);
  });

  afterEach(() => {
    delete process.env.TEST_CONFLUENCE_TOKEN;
  });

  describe('Enhanced Content Processing', () => {
    it('should process Confluence HTML content with structured elements', () => {
      const mockPage = {
        id: 'test-page-1',
        type: 'page',
        status: 'current',
        title: 'Test Runbook - Database Issues',
        space: { key: 'TEST', name: 'Test Space' },
        body: {
          storage: {
            value: `
              <h1>Database Troubleshooting</h1>
              <h2>Prerequisites</h2>
              <ul>
                <li>Database admin access</li>
                <li>Monitoring dashboard access</li>
              </ul>
              <h2>Steps</h2>
              <ol>
                <li>Check database connections</li>
                <li>Review error logs</li>
              </ol>
              <ac:structured-macro ac:name="info">
                <ac:rich-text-body>This is critical information</ac:rich-text-body>
              </ac:structured-macro>
              <code>SELECT * FROM health_check;</code>
            `,
            representation: 'storage'
          }
        },
        version: {
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
          by: { displayName: 'Test User' }
        },
        _links: {
          webui: '/spaces/TEST/pages/test-page-1',
          self: '/rest/api/content/test-page-1'
        }
      };

      // Access the private method through any casting
      const contentProcessor = (adapter as any).contentProcessor;
      const processedContent = contentProcessor.parsePageContent(mockPage);

      // Verify structured content is preserved (case insensitive and flexible)
      console.log('Processed content:', processedContent);
      assert.ok(processedContent.toLowerCase().includes('database troubleshooting'));
      assert.ok(processedContent.toLowerCase().includes('prerequisites'));
      assert.ok(processedContent.includes('• Database admin access'));
      assert.ok(processedContent.includes('Review error logs'));
      assert.ok(processedContent.includes('critical information') || processedContent.includes('[INFO]'));
      assert.ok(processedContent.includes('SELECT * FROM health_check'));
    });

    it('should extract Confluence macros correctly', () => {
      const contentWithMacros = `
        <ac:structured-macro ac:name="warning">
          <ac:rich-text-body>Critical warning message</ac:rich-text-body>
        </ac:structured-macro>
        <ac:structured-macro ac:name="code">
          <ac:plain-text-body><![CDATA[
            function test() {
              return "hello";
            }
          ]]></ac:plain-text-body>
        </ac:structured-macro>
        <ac:structured-macro ac:name="expand">
          <ac:rich-text-body>Expandable content here</ac:rich-text-body>
        </ac:structured-macro>
      `;

      const contentProcessor = (adapter as any).contentProcessor;
      const extractedMacros = contentProcessor.extractMacros(contentWithMacros);

      assert.strictEqual(extractedMacros.length, 3);
      assert.strictEqual(extractedMacros[0].type, 'warning');
      assert.strictEqual(extractedMacros[1].type, 'code');
      assert.strictEqual(extractedMacros[2].type, 'expand');
    });
  });

  describe('Advanced Search Functionality', () => {
    it('should build advanced CQL queries with filters', () => {
      const filters: SearchFilters = {
        max_age_days: 30,
        categories: ['runbook', 'api'],
        confidence_threshold: 0.7,
      };

      // Access private method
      const buildAdvancedCQLQuery = (adapter as any).buildAdvancedCQLQuery.bind(adapter);
      const query = buildAdvancedCQLQuery('database error', filters);

      // Verify query structure
      assert.ok(query.includes('text ~ "database error"'));
      assert.ok(query.includes('lastModified >='));
      assert.ok(query.includes('runbook OR procedure OR troubleshoot'));
      assert.ok(query.includes('API OR endpoint OR REST'));
      assert.ok(query.includes('space.key = "TEST" OR space.key = "DOCS"'));
    });

    it('should calculate enhanced confidence scores accurately', () => {
      const mockPage = {
        id: 'test-page-confidence',
        type: 'page',
        status: 'current',
        title: 'Database Connection Troubleshooting Runbook',
        space: { key: 'OPS', name: 'Operations Space' },
        body: {
          storage: {
            value: 'This runbook covers database connection issues and troubleshooting procedures for API endpoints.',
            representation: 'storage'
          }
        },
        version: {
          number: 2,
          when: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          by: { displayName: 'DevOps Team' }
        },
        _links: {
          webui: '/spaces/OPS/pages/test-page-confidence',
          self: '/rest/api/content/test-page-confidence'
        }
      };

      // Test with query that matches well
      const calculateEnhancedConfidence = (adapter as any).calculateEnhancedConfidence.bind(adapter);
      const confidence = calculateEnhancedConfidence(mockPage, 'database connection troubleshoot');

      // Should have high confidence due to:
      // - Title matches (database, connection, troubleshoot)
      // - Content matches (database, connection, troubleshoot, procedures)
      // - Recent update (7 days)
      // - Operations space
      // - Contains "runbook" keyword
      assert.ok(confidence > 0.8, `Expected confidence > 0.8, got ${confidence}`);
    });
  });

  describe('Enhanced Runbook Search', () => {
    it('should build multiple search queries for comprehensive matching', () => {
      const alertType = 'database_timeout';
      const severity = 'critical';
      const affectedSystems = ['mysql', 'redis', 'postgres'];

      const buildRunbookSearchQueries = (adapter as any).buildRunbookSearchQueries.bind(adapter);
      const queries = buildRunbookSearchQueries(alertType, severity, affectedSystems);

      assert.ok(queries.length >= 4, `Expected at least 4 queries, got ${queries.length}`);

      // Verify query variety
      assert.ok(queries.some(q => q.includes('database_timeout') && q.includes('critical')));
      assert.ok(queries.some(q => q.includes('mysql') && q.includes('runbook')));
      assert.ok(queries.some(q => q.includes('critical') && q.includes('incident')));
      assert.ok(queries.some(q => q.includes('runbook') && q.includes('database_timeout')));
    });

    it('should calculate runbook relevance scores correctly', () => {
      const mockRunbook = {
        id: 'rb-db-timeout',
        title: 'Database Timeout Critical Issues Runbook',
        version: '1.0',
        description: 'Handles critical database timeout issues in MySQL and Redis systems',
        triggers: ['database_timeout', 'connection_timeout'],
        severity_mapping: {
          critical: 'critical',
          high: 'high',
          medium: 'medium'
        },
        decision_tree: {
          id: 'dt-1',
          name: 'Database Decision Tree',
          description: 'Test decision tree',
          branches: [],
          default_action: 'escalate'
        },
        procedures: [],
        metadata: {
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          author: 'DevOps Team',
          confidence_score: 0.9
        }
      };

      const calculateRunbookRelevance = (adapter as any).calculateRunbookRelevance.bind(adapter);
      const score = calculateRunbookRelevance(
        mockRunbook,
        'database_timeout',
        'critical',
        ['mysql', 'redis']
      );

      // Should have high relevance due to:
      // - Title contains alert type
      // - Description contains alert type and systems
      // - Severity mapping matches
      // - Triggers match exactly
      assert.ok(score > 0.7, `Expected relevance score > 0.7, got ${score}`);
    });
  });

  describe('Markdown Conversion', () => {
    it('should convert Confluence HTML to readable markdown', () => {
      const htmlContent = `
        <h1>Main Title</h1>
        <p>This is a paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
        <code>inline code</code>
        <pre>
          code block
          multiple lines
        </pre>
      `;

      const contentProcessor = (adapter as any).contentProcessor;
      const markdown = contentProcessor.convertToMarkdown(htmlContent);

      console.log('Converted markdown:', markdown);
      assert.ok(markdown.toLowerCase().includes('main title'));
      assert.ok(markdown.includes('bold text'));
      assert.ok(markdown.includes('italic text'));
      assert.ok(markdown.includes('First item') || markdown.includes('• First item'));
      assert.ok(markdown.includes('inline code'));
      assert.ok(markdown.includes('code block') || markdown.includes('multiple lines'));
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle empty or malformed content gracefully', () => {
      const mockPageEmpty = {
        id: 'empty-page',
        type: 'page',
        status: 'current',
        title: 'Empty Page',
        space: { key: 'TEST', name: 'Test Space' },
        body: {},
        version: {
          number: 1,
          when: '2024-01-01T00:00:00.000Z',
          by: { displayName: 'Test User' }
        },
        _links: {
          webui: '/spaces/TEST/pages/empty-page',
          self: '/rest/api/content/empty-page'
        }
      };

      const contentProcessor = (adapter as any).contentProcessor;
      const processedContent = contentProcessor.parsePageContent(mockPageEmpty);

      assert.strictEqual(processedContent, '');
    });

    it('should handle invalid macro content without breaking', () => {
      const invalidMacroContent = `
        <ac:structured-macro ac:name="broken">
          <invalid-content>This is broken</invalid-content>
        </ac:structured-macro>
        <ac:structured-macro ac:name="incomplete"
        <p>Valid content after broken macro</p>
      `;

      const contentProcessor = (adapter as any).contentProcessor;
      // Should not throw and should process what it can
      assert.doesNotThrow(() => {
        const result = contentProcessor.processMacros(invalidMacroContent);
        assert.ok(typeof result === 'string');
      });
    });
  });
});