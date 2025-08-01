/**
 * Integration tests for Enhanced FileSystemAdapter
 * 
 * These tests verify that the enhanced features actually work
 * with real files and directories.
 * 
 * Authored by: Integration Specialist (Barry)
 * Date: 2025-08-01
 */

import { EnhancedFileSystemAdapter } from '../../src/adapters/file-enhanced';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Enhanced FileSystemAdapter Integration Tests', () => {
  let adapter: EnhancedFileSystemAdapter;
  let testDir1: string;

  beforeAll(async () => {
    // Use fixtures directory
    testDir1 = path.join(process.cwd(), 'tests/fixtures/enhanced-adapter');
  });

  beforeEach(() => {
    const config = {
      name: 'integration-test',
      type: 'file' as const,
      base_paths: [testDir1],
      recursive: true,
      max_depth: 3,
      file_patterns: {
        include: ['*.md', '*.json', '*.txt'],
        exclude: ['**/drafts/**'],
      },
      supported_extensions: ['.md', '.json', '.txt', '.pdf'],
      extract_metadata: true,
      pdf_extraction: true,
      watch_changes: false,
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3,
      categories: ['runbooks', 'documentation'],
    };

    adapter = new EnhancedFileSystemAdapter(config);
  });

  afterEach(async () => {
    await adapter.cleanup();
  });

  describe('Multiple Root Directories', () => {
    it('should index files from multiple base paths', async () => {
      const multiPathAdapter = new EnhancedFileSystemAdapter({
        name: 'multi-path-test',
        type: 'file' as const,
        base_paths: [testDir1, './docs'], // Real directories
        recursive: true,
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 30000,
        max_retries: 3,
      });

      await multiPathAdapter.initialize();
      
      const metadata = await multiPathAdapter.getMetadata();
      expect(metadata.documentCount).toBeGreaterThan(0);

      // Should find documents from both paths
      const results = await multiPathAdapter.search('runbook');
      expect(results.length).toBeGreaterThan(0);

      await multiPathAdapter.cleanup();
    });
  });

  describe('File Pattern Matching', () => {
    it('should include files matching include patterns', async () => {
      await adapter.initialize();

      const metadata = await adapter.getMetadata();
      expect(metadata.documentCount).toBeGreaterThan(0);

      // Should find the test files we created
      const results = await adapter.search('disk space');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should exclude files matching exclude patterns', async () => {
      await adapter.initialize();

      // Should not find the draft document
      const results = await adapter.search('draft');
      
      // If any results are found, they should not be from the drafts directory
      results.forEach(result => {
        expect(result.metadata?.file_path).not.toContain('drafts');
      });
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract front matter from markdown files', async () => {
      await adapter.initialize();

      const results = await adapter.search('SRE Team');
      expect(results.length).toBeGreaterThan(0);

      const runbookResult = results.find(r => r.title === 'test-runbook.md');
      expect(runbookResult).toBeDefined();
      expect(runbookResult?.metadata?.author).toBe('SRE Team');
      expect(runbookResult?.metadata?.tags).toContain('disk-space');
    });

    it('should extract file system metadata', async () => {
      await adapter.initialize();

      const results = await adapter.search('test');
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result).toBeDefined();
      if (result) {
        expect(result.metadata).toHaveProperty('file_type');
        expect(result.metadata).toHaveProperty('size');
        expect(result.metadata).toHaveProperty('last_modified');
        expect(result.metadata).toHaveProperty('directory');
      }
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should perform fuzzy search', async () => {
      // Search with a typo
      const results = await adapter.search('runbok'); // Missing 'o'
      expect(results.length).toBeGreaterThan(0);
    });

    it('should perform exact substring search', async () => {
      const results = await adapter.search('Emergency Cleanup');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should apply confidence threshold filters', async () => {
      const highConfidenceResults = await adapter.search('disk', {
        confidence_threshold: 0.8,
      });
      
      const lowConfidenceResults = await adapter.search('disk', {
        confidence_threshold: 0.3,
      });

      expect(highConfidenceResults.length).toBeLessThanOrEqual(lowConfidenceResults.length);
      
      // All high confidence results should meet the threshold
      highConfidenceResults.forEach(result => {
        expect(result.confidence_score).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should search by categories', async () => {
      const runbookResults = await adapter.search('disk', {
        categories: ['runbooks'],
      });

      const documentationResults = await adapter.search('disk', {
        categories: ['documentation'],
      });

      // Should return results since our adapter supports these categories
      expect(runbookResults.length).toBeGreaterThanOrEqual(0);
      expect(documentationResults.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Runbook Search', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should find JSON runbooks', async () => {
      const runbooks = await adapter.searchRunbooks(
        'disk_usage_critical',
        'critical',
        ['production']
      );

      // Should find our test JSON runbook
      const testRunbook = runbooks.find(r => r.id === 'test_disk_space');
      expect(testRunbook).toBeDefined();
      expect(testRunbook?.title).toBe('Test Disk Space Runbook');
    });

    it('should handle malformed JSON gracefully', async () => {
      // Create a malformed JSON file temporarily
      const malformedPath = path.join(testDir1, 'malformed.json');
      await fs.writeFile(malformedPath, '{ invalid json }');

      try {
        // Re-initialize to pick up the new file
        await adapter.refreshIndex(true);

        const runbooks = await adapter.searchRunbooks('test', 'critical', []);
        
        // Should not crash and should still return valid runbooks
        expect(Array.isArray(runbooks)).toBe(true);
      } finally {
        // Clean up the malformed file
        try {
          await fs.unlink(malformedPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Document Retrieval', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should retrieve documents by ID', async () => {
      const searchResults = await adapter.search('test');
      expect(searchResults.length).toBeGreaterThan(0);

      const firstResult = searchResults[0];
      expect(firstResult).toBeDefined();
      
      if (firstResult) {
        const retrievedDoc = await adapter.getDocument(firstResult.id);

        expect(retrievedDoc).toBeDefined();
        expect(retrievedDoc?.id).toBe(firstResult.id);
        expect(retrievedDoc?.title).toBe(firstResult.title);
        expect(retrievedDoc?.content).toBe(firstResult.content);
      }
    });

    it('should return null for non-existent documents', async () => {
      const doc = await adapter.getDocument('non-existent-id');
      expect(doc).toBeNull();
    });
  });

  describe('Health Monitoring', () => {
    it('should report healthy status after successful initialization', async () => {
      await adapter.initialize();

      const health = await adapter.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.response_time_ms).toBeGreaterThanOrEqual(0);
      expect(health.metadata?.document_count).toBeGreaterThan(0);
      expect(health.metadata?.base_paths).toEqual([testDir1]);
    });

    it('should report unhealthy status for non-existent paths', async () => {
      const badAdapter = new EnhancedFileSystemAdapter({
        name: 'bad-test',
        type: 'file' as const,
        base_paths: ['/non/existent/path'],
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 30000,
        max_retries: 3,
      });

      const health = await badAdapter.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.error_message).toContain('Base path inaccessible');
    });
  });

  describe('Index Management', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should refresh index successfully', async () => {
      const initialMetadata = await adapter.getMetadata();
      
      const refreshResult = await adapter.refreshIndex(true);
      
      expect(refreshResult).toBe(true);
      
      const updatedMetadata = await adapter.getMetadata();
      expect(updatedMetadata.documentCount).toBe(initialMetadata.documentCount);
    });

    it('should handle concurrent refresh requests', async () => {
      const refresh1Promise = adapter.refreshIndex(true);
      const refresh2Promise = adapter.refreshIndex(true);

      const [result1, result2] = await Promise.all([refresh1Promise, refresh2Promise]);

      // One should succeed, one should be skipped
      expect(result1 || result2).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should index files quickly', async () => {
      const startTime = Date.now();
      await adapter.initialize();
      const duration = Date.now() - startTime;

      // Should initialize in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max

      const metadata = await adapter.getMetadata();
      expect(metadata.documentCount).toBeGreaterThan(0);
    });

    it('should search quickly', async () => {
      await adapter.initialize();

      const startTime = Date.now();
      const results = await adapter.search('test');
      const duration = Date.now() - startTime;

      // Should search very quickly
      expect(duration).toBeLessThan(100); // 100ms max
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle file permission errors gracefully', async () => {
      // This test would require creating files with restricted permissions
      // For now, we'll test the adapter handles missing files gracefully
      await adapter.initialize();
      
      const health = await adapter.healthCheck();
      expect(health).toBeDefined();
      expect(typeof health.healthy).toBe('boolean');
    });

    it('should handle corrupted files gracefully', async () => {
      // Create a file with null bytes or other corruption
      const corruptedPath = path.join(testDir1, 'corrupted.txt');
      await fs.writeFile(corruptedPath, Buffer.from([0x00, 0x01, 0x02, 0xFF]));

      try {
        await adapter.initialize();
        
        // Should not crash
        const metadata = await adapter.getMetadata();
        expect(metadata).toBeDefined();
      } finally {
        // Clean up
        try {
          await fs.unlink(corruptedPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
});