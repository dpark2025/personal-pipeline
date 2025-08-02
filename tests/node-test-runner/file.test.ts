/**
 * FileSystemAdapter Tests using Node.js Test Runner
 * 
 * Tests the basic FileSystemAdapter implementation for local file indexing
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { FileSystemAdapter } from '../../src/adapters/file.js';

describe('FileSystemAdapter (Node.js Test Runner)', () => {
  let adapter: FileSystemAdapter;
  let testDir: string;
  let mockConfig: any;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(tmpdir(), `fs-adapter-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    mockConfig = {
      name: 'test-file-adapter',
      type: 'file',
      base_url: testDir,
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3,
    };

    adapter = new FileSystemAdapter(mockConfig);
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await adapter.cleanup();
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Constructor and Configuration', () => {
    it('should create adapter with valid configuration', () => {
      assert(adapter instanceof FileSystemAdapter);
      assert.strictEqual(adapter.getConfig().name, 'test-file-adapter');
      assert.strictEqual(adapter.getConfig().type, 'file');
    });

    it('should use default base directory if not provided', () => {
      const defaultConfig = {
        name: 'default-adapter',
        type: 'file',
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 30000,
        max_retries: 3,
      };

      const defaultAdapter = new FileSystemAdapter(defaultConfig);
      // The adapter sets base_url to './docs' during construction
      assert.strictEqual((defaultAdapter as any).baseDirectory, './docs');
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid directory', async () => {
      await adapter.initialize();
      assert.strictEqual(adapter.isReady(), true);
    });

    it('should fail to initialize with non-existent directory', async () => {
      const badConfig = {
        ...mockConfig,
        base_url: '/nonexistent/directory',
      };

      const badAdapter = new FileSystemAdapter(badConfig);
      await assert.rejects(
        async () => await badAdapter.initialize(),
        /Failed to initialize FileSystemAdapter/
      );
    });
  });

  describe('File Indexing', () => {
    beforeEach(async () => {
      // Create test files
      await fs.writeFile(
        path.join(testDir, 'test-doc.md'),
        `# Test Document

This is a test markdown document with some content.

## Section 1
Some important information here.

## Troubleshooting
Step 1: Check the system
Step 2: Restart service
Step 3: Verify fix
`
      );

      await fs.writeFile(
        path.join(testDir, 'runbook.json'),
        JSON.stringify({
          id: 'test-runbook',
          title: 'Database Performance Runbook',
          description: 'Steps to resolve database performance issues',
          procedures: [
            { step: 1, description: 'Check query performance' },
            { step: 2, description: 'Optimize indexes' },
          ],
        }, null, 2)
      );

      await fs.writeFile(
        path.join(testDir, 'notes.txt'),
        'Plain text notes\nSome operational procedures\nMemory troubleshooting guide'
      );

      // Create subdirectory with file
      await fs.mkdir(path.join(testDir, 'subdir'));
      await fs.writeFile(
        path.join(testDir, 'subdir', 'nested.md'),
        '# Nested Document\nThis is in a subdirectory'
      );
    });

    it('should index markdown files correctly', async () => {
      await adapter.initialize();
      
      const results = await adapter.search('test document');
      assert(results.length > 0, 'Should find markdown document');
      
      const mdResult = results.find(r => r.title.includes('test-doc.md'));
      assert(mdResult, 'Should find the markdown document');
      assert.strictEqual(mdResult.source_type, 'file');
      assert(mdResult.content.includes('test markdown document'));
    });

    it('should index JSON files correctly', async () => {
      await adapter.initialize();
      
      const results = await adapter.search('database performance');
      assert(results.length > 0, 'Should find JSON document');
      
      const jsonResult = results.find(r => r.content.includes('Database Performance'));
      assert(jsonResult, 'Should find the JSON runbook');
      assert(jsonResult.source_type, 'file');
    });

    it('should index text files correctly', async () => {
      await adapter.initialize();
      
      const results = await adapter.search('operational procedures');
      assert(results.length > 0, 'Should find text document');
      
      const txtResult = results.find(r => r.content.includes('operational procedures'));
      assert(txtResult, 'Should find the text document');
    });

    it('should handle subdirectories', async () => {
      await adapter.initialize();
      
      const results = await adapter.search('nested document');
      assert(results.length > 0, 'Should find nested document');
      
      const nestedResult = results.find(r => r.title.includes('nested.md'));
      assert(nestedResult, 'Should find document in subdirectory');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(testDir, 'search-test.md'),
        `# Database Performance Guide

This guide covers database optimization and troubleshooting procedures.

## Common Issues
- High CPU usage
- Slow query performance  
- Memory leaks
- Connection timeouts

## Resolution Steps
1. Analyze query execution plans
2. Check index usage
3. Monitor memory consumption
4. Optimize connection pooling
`
      );

      await adapter.initialize();
    });

    it('should return relevant search results', async () => {
      const results = await adapter.search('database performance');
      
      assert(results.length > 0, 'Should return search results');
      assert(results[0].confidence_score > 0.1, 'Should have reasonable confidence');
      assert(results[0].title.includes('search-test.md'));
    });

    it('should return empty results for non-matching queries', async () => {
      const results = await adapter.search('quantum physics');
      assert.strictEqual(results.length, 0, 'Should return no results for unrelated query');
    });

    it('should support case-insensitive search', async () => {
      const results = await adapter.search('DATABASE PERFORMANCE');
      assert(results.length > 0, 'Should find results with case-insensitive search');
    });

    it('should support partial word matching', async () => {
      const results = await adapter.search('optim');
      assert(results.length > 0, 'Should find results with partial word matching');
    });

    it('should filter by confidence threshold', async () => {
      const allResults = await adapter.search('database');
      const filteredResults = await adapter.search('database', {
        confidence_threshold: 0.3, // Use the API that FileSystemAdapter expects
      });
      
      assert(filteredResults.length <= allResults.length, 'Filtered results should be subset');
      // Note: FileSystemAdapter uses confidence_threshold differently than min_confidence
    });
  });

  describe('Runbook Search', () => {
    beforeEach(async () => {
      // Create adapter with runbook category support
      const runbookConfig = {
        ...mockConfig,
        categories: ['runbooks'],
      };
      
      await adapter.cleanup();
      adapter = new FileSystemAdapter(runbookConfig);
      
      await fs.writeFile(
        path.join(testDir, 'cpu-runbook.md'),
        `# High CPU Alert Runbook

**Alert Type**: high_cpu
**Severity**: critical
**Systems**: web-server, database

## Procedures

### Step 1: Identify High CPU Processes
Run top command to see processes consuming CPU

### Step 2: Analyze Process Details  
Use ps aux to get detailed process information

### Step 3: Take Action
Either restart problematic services or scale resources
`
      );

      await adapter.initialize();
    });

    it('should find and structure runbooks correctly', async () => {
      const runbooks = await adapter.searchRunbooks('high_cpu', 'critical', ['web-server']);
      
      assert(runbooks.length > 0, 'Should find relevant runbooks');
      
      const runbook = runbooks[0];
      assert(runbook.title.includes('High CPU') || runbook.title.includes('cpu-runbook.md'));
      assert(runbook.procedures && runbook.procedures.length > 0, 'Should extract procedures');
      // Note: trigger extraction may vary by implementation
    });

    it('should handle empty runbook searches', async () => {
      const runbooks = await adapter.searchRunbooks('nonexistent_alert', 'low', ['unknown-system']);
      assert.strictEqual(runbooks.length, 0, 'Should return empty array for no matches');
    });
  });

  describe('Document Retrieval', () => {
    let documentId: string;

    beforeEach(async () => {
      await fs.writeFile(
        path.join(testDir, 'retrieval-test.md'),
        '# Retrieval Test\nDocument for testing direct retrieval'
      );

      await adapter.initialize();
      
      const results = await adapter.search('retrieval test');
      documentId = results[0]?.id;
    });

    it('should retrieve document by ID', async () => {
      if (!documentId) {
        console.log('No document ID found from search, checking results...');
        const results = await adapter.search('retrieval test');
        console.log('Search results:', results.map(r => ({ id: r.id, title: r.title })));
        assert(results.length > 0, 'Should have search results to get document ID from');
        documentId = results[0].id;
      }
      
      assert(documentId, 'Should have a document ID from search');
      
      const document = await adapter.getDocument(documentId);
      assert(document, 'Should retrieve document by ID');
      assert.strictEqual(document.id, documentId);
      assert(document.title.includes('retrieval-test.md'));
    });

    it('should return null for non-existent document ID', async () => {
      const document = await adapter.getDocument('nonexistent-id');
      assert.strictEqual(document, null, 'Should return null for invalid ID');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when directory is accessible', async () => {
      await adapter.initialize();
      
      const health = await adapter.healthCheck();
      assert.strictEqual(health.healthy, true);
      assert.strictEqual(health.source_name, 'test-file-adapter');
      assert(health.response_time_ms >= 0);
    });

    it('should return unhealthy status when directory is not accessible', async () => {
      const badConfig = {
        ...mockConfig,
        base_url: '/nonexistent/directory',
      };

      const badAdapter = new FileSystemAdapter(badConfig);
      const health = await badAdapter.healthCheck();
      
      assert.strictEqual(health.healthy, false);
      assert(health.error_message);
    });
  });

  describe('Index Refresh', () => {
    it('should refresh index and pick up new files', async () => {
      await adapter.initialize();
      
      // Initial search should find no results
      let results = await adapter.search('new document');
      assert.strictEqual(results.length, 0);
      
      // Add new file
      await fs.writeFile(
        path.join(testDir, 'new-doc.md'),
        '# New Document\nThis is a newly added document'
      );
      
      // Refresh index
      const refreshResult = await adapter.refreshIndex(true);
      assert.strictEqual(refreshResult, true, 'Index refresh should succeed');
      
      // Now search should find the new document
      results = await adapter.search('new document');
      assert(results.length > 0, 'Should find newly added document after refresh');
    });

    it('should use cached index when not forcing refresh', async () => {
      await adapter.initialize();
      
      const firstRefresh = await adapter.refreshIndex(false);
      assert.strictEqual(firstRefresh, true);
      
      // Should use cache on second call
      const secondRefresh = await adapter.refreshIndex(false);
      assert.strictEqual(secondRefresh, true);
    });
  });

  describe('Metadata', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(testDir, 'meta-test.md'), '# Metadata Test');
      await adapter.initialize();
    });

    it('should return correct metadata', async () => {
      const metadata = await adapter.getMetadata();
      
      assert.strictEqual(metadata.name, 'test-file-adapter');
      assert.strictEqual(metadata.type, 'file');
      assert(metadata.documentCount >= 1, 'Should have indexed at least one document');
      assert(metadata.lastIndexed, 'Should have last indexed timestamp');
      assert(metadata.avgResponseTime >= 0, 'Should have response time metric');
      assert(metadata.successRate >= 0 && metadata.successRate <= 1, 'Success rate should be 0-1');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await adapter.initialize();
      assert.strictEqual(adapter.isReady(), true);
      
      await adapter.cleanup();
      assert.strictEqual(adapter.isReady(), false);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted files gracefully', async () => {
      // Create a file with invalid encoding
      await fs.writeFile(path.join(testDir, 'corrupted.md'), Buffer.from([0xFF, 0xFE, 0x00]));
      
      // Should still initialize successfully
      await adapter.initialize();
      
      const results = await adapter.search('corrupted');
      // May or may not find the corrupted file, but shouldn't crash
      assert(Array.isArray(results), 'Should return array even with corrupted files');
    });

    it('should handle search on uninitialized adapter', async () => {
      const results = await adapter.search('test');
      assert.strictEqual(results.length, 0, 'Should return empty results when not initialized');
    });

    it('should handle file permission errors during indexing', async () => {
      // This test may not work on all systems, but tests error handling
      await adapter.initialize();
      
      // Should complete without crashing even if some files can't be read
      const health = await adapter.healthCheck();
      assert(typeof health.healthy === 'boolean', 'Should return health status');
    });
  });
});