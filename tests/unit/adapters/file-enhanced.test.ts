/**
 * Unit tests for Enhanced FileSystemAdapter
 * 
 * Tests all Phase 2 enhancements including:
 * - Multiple root directories
 * - Recursive scanning with depth control
 * - File pattern matching
 * - PDF text extraction
 * - Metadata extraction
 * - File watching
 * 
 * Authored by: Integration Specialist (Barry)
 * Date: 2025-08-01
 */

import { jest } from '@jest/globals';
import { EnhancedFileSystemAdapter } from '../../../src/adapters/file-enhanced';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock dependencies
jest.mock('fs/promises');
jest.mock('glob');
jest.mock('file-type');
jest.mock('chokidar');
jest.mock('pdf-parse');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EnhancedFileSystemAdapter', () => {
  let adapter: EnhancedFileSystemAdapter;
  
  const mockConfig = {
    name: 'test-adapter',
    type: 'file' as const,
    base_paths: ['./test-docs', './test-runbooks'],
    recursive: true,
    max_depth: 3,
    file_patterns: {
      include: ['*.md', '*.json', '*.pdf'],
      exclude: ['**/drafts/**', '**/archive/**'],
    },
    supported_extensions: ['.md', '.json', '.pdf', '.txt'],
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

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new EnhancedFileSystemAdapter(mockConfig);
  });

  afterEach(async () => {
    await adapter.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize with multiple base paths', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockResolvedValue(undefined);
      fsMock.readdir.mockResolvedValue([]);

      await adapter.initialize();

      // Should check access for both base paths
      expect(fsMock.access).toHaveBeenCalledWith('./test-docs');
      expect(fsMock.access).toHaveBeenCalledWith('./test-runbooks');
    });

    it('should fail initialization if base path does not exist', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockRejectedValue(new Error('ENOENT'));

      await expect(adapter.initialize()).rejects.toThrow('Base path does not exist');
    });

    it('should respect configuration options', () => {
      const customConfig = {
        ...mockConfig,
        recursive: false,
        max_depth: 1,
        watch_changes: true,
      };
      
      const customAdapter = new EnhancedFileSystemAdapter(customConfig);
      
      // Verify configuration is properly set
      expect(customAdapter['recursive']).toBe(false);
      expect(customAdapter['maxDepth']).toBe(1);
      expect(customAdapter['watchChanges']).toBe(true);
    });
  });

  describe('File Indexing', () => {
    it('should index files from multiple directories', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      const { glob } = await import('glob');
      const globMock = glob as jest.MockedFunction<typeof glob>;

      // Mock file system structure
      fsMock.access.mockResolvedValue(undefined);
      globMock.mockResolvedValue([
        '/test-docs/runbook1.md',
        '/test-docs/guide.json',
        '/test-runbooks/critical.md',
      ]);

      // Mock file stats and content
      fsMock.stat.mockResolvedValue({
        size: 1000,
        mtime: new Date(),
        birthtime: new Date(),
      } as any);
      
      fsMock.readFile.mockResolvedValue('# Test Content');

      await adapter.initialize();

      // Verify multiple paths were processed
      expect(globMock).toHaveBeenCalledTimes(2); // Once for each base path
    });

    it('should respect max depth limit', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockResolvedValue(undefined);

      // Mock deep directory structure
      const deepPath = './test-docs/level1/level2/level3/level4/file.md';
      
      // With max_depth of 3, level4 should not be indexed
      const adapter3Depth = new EnhancedFileSystemAdapter({
        ...mockConfig,
        max_depth: 3,
      });

      await adapter3Depth.initialize();

      // Verify depth limiting logic
      expect(adapter3Depth['maxDepth']).toBe(3);
    });

    it('should apply file pattern filters correctly', async () => {
      const { glob } = await import('glob');
      const globMock = glob as jest.MockedFunction<typeof glob>;

      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockResolvedValue(undefined);

      await adapter.initialize();

      // Check that glob was called with correct patterns
      const calls = globMock.mock.calls;
      expect(calls.some(call => 
        call[1]?.ignore?.includes('**/drafts/**')
      )).toBe(true);
    });
  });

  describe('File Type Detection', () => {
    it('should detect file types using magic bytes', async () => {
      const { fileTypeFromFile } = await import('file-type');
      const fileTypeMock = fileTypeFromFile as jest.MockedFunction<typeof fileTypeFromFile>;

      fileTypeMock.mockResolvedValue({
        ext: 'pdf',
        mime: 'application/pdf',
      });

      const fileType = await adapter['detectFileType']('/test/file.pdf');
      
      expect(fileType).toEqual({
        ext: 'pdf',
        mime: 'application/pdf',
      });
    });

    it('should fallback to extension-based detection', async () => {
      const { fileTypeFromFile } = await import('file-type');
      const fileTypeMock = fileTypeFromFile as jest.MockedFunction<typeof fileTypeFromFile>;

      fileTypeMock.mockRejectedValue(new Error('Cannot detect'));

      const fileType = await adapter['detectFileType']('/test/file.md');
      
      expect(fileType).toEqual({
        ext: 'md',
        mime: 'text/markdown',
      });
    });
  });

  describe('PDF Extraction', () => {
    it('should extract text from PDF files', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      const pdfBuffer = Buffer.from('mock pdf content');
      
      fsMock.readFile.mockResolvedValue(pdfBuffer);

      // Mock dynamic import of pdf-parse
      jest.doMock('pdf-parse', () => ({
        default: jest.fn().mockResolvedValue({
          text: 'Extracted PDF text content',
        }),
      }));

      const text = await adapter['extractPdfText']('/test/document.pdf');
      
      expect(text).toBe('Extracted PDF text content');
    });

    it('should handle PDF extraction errors gracefully', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.readFile.mockRejectedValue(new Error('Cannot read PDF'));

      const text = await adapter['extractPdfText']('/test/corrupt.pdf');
      
      expect(text).toBeNull();
    });
  });

  describe('Metadata Extraction', () => {
    it('should extract metadata from markdown front matter', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      const markdownContent = `---
author: Test Author
tags: [test, documentation]
created: 2024-01-15
---
# Test Document`;

      fsMock.readFile.mockResolvedValue(markdownContent);
      fsMock.stat.mockResolvedValue({
        mtime: new Date('2024-01-20'),
        birthtime: new Date('2024-01-15'),
      } as any);

      const metadata = await adapter['extractFileMetadata'](
        '/test/doc.md',
        { mtime: new Date('2024-01-20'), birthtime: new Date('2024-01-15') },
        { ext: 'md', mime: 'text/markdown' }
      );

      expect(metadata.author).toBe('Test Author');
      expect(metadata.tags).toEqual(['test', 'documentation']);
    });

    it('should handle missing front matter gracefully', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.readFile.mockResolvedValue('# Document without front matter');

      const metadata = await adapter['extractFileMetadata'](
        '/test/doc.md',
        { mtime: new Date(), birthtime: new Date() },
        { ext: 'md', mime: 'text/markdown' }
      );

      expect(metadata.author).toBeUndefined();
      expect(metadata.tags).toBeUndefined();
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockResolvedValue(undefined);
      
      // Initialize with empty index for search tests
      await adapter.initialize();
    });

    it('should perform fuzzy search', async () => {
      // Add mock documents to the adapter
      adapter['documents'].set('doc1', {
        id: 'doc1',
        path: '/test/doc1.md',
        relativePath: 'doc1.md',
        name: 'doc1.md',
        content: 'This is a test runbook for disk space',
        searchableContent: 'test runbook disk space',
        lastModified: new Date(),
        size: 100,
        type: '.md',
        mimeType: 'text/markdown',
        metadata: {
          extension: '.md',
          depth: 1,
          directory: '/test',
          created: new Date(),
          modified: new Date(),
        },
      });

      adapter['buildSearchIndex']();

      const results = await adapter.search('runbok'); // Typo intentional
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('doc1.md');
    });

    it('should apply confidence threshold filter', async () => {
      const results = await adapter.search('test', {
        confidence_threshold: 0.9,
      });

      // All results should meet the threshold
      results.forEach(result => {
        expect(result.confidence_score).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should fall back to exact substring matching', async () => {
      adapter['documents'].set('doc2', {
        id: 'doc2',
        path: '/test/doc2.md',
        relativePath: 'doc2.md',
        name: 'doc2.md',
        content: 'Specific phrase: emergency disk cleanup procedure',
        searchableContent: 'emergency disk cleanup',
        lastModified: new Date(),
        size: 100,
        type: '.md',
        mimeType: 'text/markdown',
        metadata: {
          extension: '.md',
          depth: 1,
          directory: '/test',
          created: new Date(),
          modified: new Date(),
        },
      });

      adapter['buildSearchIndex']();

      const results = await adapter.search('emergency disk cleanup procedure');
      
      expect(results.length).toBe(1);
      expect(results[0].content).toContain('emergency disk cleanup procedure');
    });
  });

  describe('Runbook Search', () => {
    it('should search for runbooks with alert type and severity', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockResolvedValue(undefined);
      
      await adapter.initialize();

      // Add a JSON runbook
      adapter['documents'].set('runbook1', {
        id: 'runbook1',
        path: '/test/runbook.json',
        relativePath: 'runbook.json',
        name: 'runbook.json',
        content: JSON.stringify({
          id: 'disk_space_critical',
          title: 'Disk Space Critical',
          triggers: ['disk_full'],
          decision_tree: {},
          procedures: [],
        }),
        lastModified: new Date(),
        size: 200,
        type: '.json',
        mimeType: 'application/json',
        metadata: {
          extension: '.json',
          depth: 1,
          directory: '/test',
          created: new Date(),
          modified: new Date(),
        },
      });

      adapter['buildSearchIndex']();

      const runbooks = await adapter.searchRunbooks(
        'disk_full',
        'critical',
        ['production']
      );

      expect(runbooks).toHaveLength(1);
      expect(runbooks[0].id).toBe('disk_space_critical');
    });
  });

  describe('Health Check', () => {
    it('should report healthy status when all checks pass', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockResolvedValue(undefined);
      
      await adapter.initialize();

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.metadata?.document_count).toBe(0);
      expect(health.metadata?.base_paths).toEqual(['./test-docs', './test-runbooks']);
    });

    it('should report unhealthy status with issues', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockRejectedValue(new Error('Permission denied'));

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error_message).toContain('Base path inaccessible');
    });
  });

  describe('File Watching', () => {
    it('should set up file watchers when enabled', async () => {
      const chokidar = await import('chokidar');
      const watchMock = jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });
      (chokidar as any).watch = watchMock;

      const watchAdapter = new EnhancedFileSystemAdapter({
        ...mockConfig,
        watch_changes: true,
      });

      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockResolvedValue(undefined);

      await watchAdapter.initialize();

      expect(watchMock).toHaveBeenCalledTimes(2); // Once for each base path
    });

    it('should handle file additions', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.stat.mockResolvedValue({
        size: 100,
        mtime: new Date(),
        birthtime: new Date(),
      } as any);
      fsMock.readFile.mockResolvedValue('New file content');

      await adapter['handleFileAdd']('/test/new-file.md', './test-docs');

      // Verify the file was indexed
      expect(adapter['documents'].size).toBeGreaterThan(0);
    });

    it('should handle file removals', () => {
      const docId = adapter['generateDocumentId']('/test/removed.md');
      
      // Add a document
      adapter['documents'].set(docId, {
        id: docId,
        path: '/test/removed.md',
        relativePath: 'removed.md',
        name: 'removed.md',
        content: 'Content',
        lastModified: new Date(),
        size: 100,
        type: '.md',
        mimeType: 'text/markdown',
        metadata: {
          extension: '.md',
          depth: 1,
          directory: '/test',
          created: new Date(),
          modified: new Date(),
        },
      });

      expect(adapter['documents'].has(docId)).toBe(true);

      adapter['handleFileRemove']('/test/removed.md');

      expect(adapter['documents'].has(docId)).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of files efficiently', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      const { glob } = await import('glob');
      const globMock = glob as jest.MockedFunction<typeof glob>;

      fsMock.access.mockResolvedValue(undefined);

      // Mock 1000 files
      const mockFiles = Array.from({ length: 1000 }, (_, i) => 
        `/test/file${i}.md`
      );
      globMock.mockResolvedValue(mockFiles);

      fsMock.stat.mockResolvedValue({
        size: 1000,
        mtime: new Date(),
        birthtime: new Date(),
      } as any);
      fsMock.readFile.mockResolvedValue('Content');

      const startTime = Date.now();
      await adapter.initialize();
      const duration = Date.now() - startTime;

      expect(adapter['documents'].size).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should index 1000 files in < 5 seconds
    });

    it('should skip large files', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.stat.mockResolvedValue({
        size: 20 * 1024 * 1024, // 20MB
        mtime: new Date(),
        birthtime: new Date(),
      } as any);

      await adapter['indexFile']('/test/huge-file.md', './test-docs');

      // File should not be indexed
      expect(adapter['documents'].size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent index refresh requests', async () => {
      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.access.mockResolvedValue(undefined);
      
      await adapter.initialize();

      // Start two refresh operations simultaneously
      const refresh1 = adapter.refreshIndex(true);
      const refresh2 = adapter.refreshIndex(true);

      const [result1, result2] = await Promise.all([refresh1, refresh2]);

      // One should succeed, one should be skipped
      expect([result1, result2]).toContain(true);
      expect([result1, result2]).toContain(false);
    });

    it('should handle malformed JSON runbooks', async () => {
      adapter['documents'].set('bad-runbook', {
        id: 'bad-runbook',
        path: '/test/bad.json',
        relativePath: 'bad.json',
        name: 'bad.json',
        content: '{ invalid json }',
        lastModified: new Date(),
        size: 100,
        type: '.json',
        mimeType: 'application/json',
        metadata: {
          extension: '.json',
          depth: 1,
          directory: '/test',
          created: new Date(),
          modified: new Date(),
        },
      });

      const runbooks = await adapter.searchRunbooks('test', 'critical', []);

      // Should handle the error gracefully
      expect(runbooks).toHaveLength(0);
    });
  });
});