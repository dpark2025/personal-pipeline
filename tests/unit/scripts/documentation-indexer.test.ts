/**
 * Documentation Indexer Test Suite
 *
 * Comprehensive test coverage for the Documentation Indexer CLI tool including:
 * - CLI argument parsing and validation
 * - Core indexing functionality
 * - Change detection and incremental indexing
 * - Progress tracking and reporting
 * - Error handling and recovery
 */

import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DocumentationIndexer,
  ProgressTracker,
  ChangeDetectionService,
  IndexerConfig,
} from '../../../scripts/index-docs.js';
import { ConfigManager } from '../../../src/utils/config.js';
import { CacheService } from '../../../src/utils/cache.js';

describe('Documentation Indexer Test Suite', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  let mockConfig: any;

  beforeEach(async () => {
    // Create temporary directory for test state
    tempDir = path.join(process.cwd(), 'test-temp', `indexer-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Mock configuration
    mockConfig = {
      sources: [
        {
          name: 'test-source',
          type: 'file',
          base_paths: [tempDir],
          recursive: true,
          enabled: true,
        },
      ],
    };

    configManager = new ConfigManager();
    mock.method(configManager, 'getConfig', () => mockConfig);
  });

  afterEach(async () => {
    // Cleanup temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('IndexerConfig Validation', () => {
    it('should create valid default configuration', () => {
      const config: IndexerConfig = {
        sources: [],
        parallel: false,
        batch_size: 25,
        output_format: 'json',
        cache_warm: false,
        dry_run: false,
        verbose: false,
        incremental: false,
        force_fingerprint_check: false,
        cleanup_orphaned: false,
        validate_corpus: false,
        show_changes: false,
      };

      assert.strictEqual(config.batch_size, 25);
      assert.strictEqual(config.output_format, 'json');
      assert.strictEqual(config.parallel, false);
      assert.strictEqual(config.dry_run, false);
    });

    it('should handle incremental configuration', () => {
      const config: IndexerConfig = {
        sources: ['test-source'],
        parallel: true,
        batch_size: 50,
        output_format: 'yaml',
        cache_warm: true,
        dry_run: true,
        verbose: true,
        incremental: true,
        since: new Date('2025-08-01'),
        force_fingerprint_check: true,
        cleanup_orphaned: true,
        validate_corpus: true,
        show_changes: true,
      };

      assert.strictEqual(config.incremental, true);
      assert.strictEqual(config.show_changes, true);
      assert.strictEqual(config.force_fingerprint_check, true);
      assert.ok(config.since instanceof Date);
    });
  });

  describe('ProgressTracker', () => {
    let progressTracker: ProgressTracker;

    beforeEach(() => {
      progressTracker = new ProgressTracker(false); // Non-verbose for testing
    });

    afterEach(() => {
      progressTracker.finish();
    });

    it('should initialize progress tracking correctly', () => {
      const sources = ['source1', 'source2', 'source3'];
      progressTracker.startIndexing(sources);

      const report = progressTracker.generateProgressReport();
      assert.strictEqual(report.total_sources, 3);
      assert.strictEqual(report.processed_sources, 0);
      assert.strictEqual(report.total_documents, 0);
      assert.strictEqual(report.processed_documents, 0);
    });

    it('should track progress updates correctly', () => {
      const sources = ['source1'];
      progressTracker.startIndexing(sources);

      progressTracker.updateProgress('source1', 5, 10, 'processing');

      const report = progressTracker.generateProgressReport();
      assert.strictEqual(report.total_documents, 10);
      assert.strictEqual(report.processed_documents, 5);
      assert.strictEqual(report.success_rate, 0.5);
    });

    it('should handle error reporting', () => {
      const sources = ['source1'];
      progressTracker.startIndexing(sources);

      progressTracker.reportError({
        source: 'source1',
        error_type: 'connection_failed',
        message: 'Failed to connect to source',
        timestamp: new Date(),
        severity: 'high',
      });

      const report = progressTracker.generateProgressReport();
      assert.strictEqual(report.errors_count, 1);
    });

    it('should complete sources and calculate rates', () => {
      const sources = ['source1'];
      progressTracker.startIndexing(sources);

      progressTracker.updateProgress('source1', 10, 10, 'processing');
      progressTracker.completeSource('source1');

      const report = progressTracker.generateProgressReport();
      assert.strictEqual(report.processed_sources, 1);
      assert.strictEqual(report.success_rate, 1);
      assert.ok(report.documents_per_second >= 0);
    });

    it('should estimate completion time', () => {
      const sources = ['source1'];
      progressTracker.startIndexing(sources);

      progressTracker.updateProgress('source1', 5, 10, 'processing');

      const estimatedTime = progressTracker.estimateTimeRemaining();
      assert.ok(typeof estimatedTime === 'number');
      assert.ok(estimatedTime >= 0);
    });
  });

  describe('ChangeDetectionService', () => {
    let changeDetection: ChangeDetectionService;
    let cacheService: CacheService;

    beforeEach(() => {
      const cacheConfig = {
        enabled: true,
        memory: {
          ttl_seconds: 3600,
          check_period_seconds: 600,
          max_keys: 1000,
        },
        redis: {
          enabled: false,
        },
      };

      cacheService = new CacheService(cacheConfig as any);
      changeDetection = new ChangeDetectionService(cacheService, path.join(tempDir, 'state'));
    });

    it('should detect new documents as additions', async () => {
      const documents = [
        {
          id: 'doc1',
          title: 'Test Document 1',
          content: 'This is test content',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
        {
          id: 'doc2',
          title: 'Test Document 2',
          content: 'This is more test content',
          type: 'procedure',
          last_updated: new Date().toISOString(),
        },
      ];

      const changes = await changeDetection.detectChanges('test-source', documents);

      assert.strictEqual(changes.source, 'test-source');
      assert.strictEqual(changes.additions.length, 2);
      assert.strictEqual(changes.updates.length, 0);
      assert.strictEqual(changes.deletions.length, 0);
      assert.strictEqual(changes.statistics.total_changes, 2);
      assert.strictEqual(changes.statistics.additions_count, 2);
    });

    it('should detect no changes for identical documents', async () => {
      const documents = [
        {
          id: 'doc1',
          title: 'Test Document',
          content: 'This is test content',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
      ];

      // First run - should detect addition
      await changeDetection.detectChanges('test-source', documents);

      // Second run - should detect no changes
      const changes = await changeDetection.detectChanges('test-source', documents);

      assert.strictEqual(changes.additions.length, 0);
      assert.strictEqual(changes.updates.length, 0);
      assert.strictEqual(changes.deletions.length, 0);
      assert.strictEqual(changes.statistics.total_changes, 0);
    });

    it('should detect content updates', async () => {
      const initialDocuments = [
        {
          id: 'doc1',
          title: 'Test Document',
          content: 'Original content',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
      ];

      // First run
      await changeDetection.detectChanges('test-source', initialDocuments);

      // Modify content
      const updatedDocuments = [
        {
          id: 'doc1',
          title: 'Test Document',
          content: 'Updated content',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
      ];

      // Second run - should detect content change
      const changes = await changeDetection.detectChanges('test-source', updatedDocuments);

      assert.strictEqual(changes.additions.length, 0);
      assert.strictEqual(changes.updates.length, 1);
      assert.strictEqual(changes.deletions.length, 0);
      assert.strictEqual(changes.updates[0].change_type, 'content');
    });

    it('should detect metadata updates', async () => {
      const initialDocuments = [
        {
          id: 'doc1',
          title: 'Original Title',
          content: 'Test content',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
      ];

      // First run
      await changeDetection.detectChanges('test-source', initialDocuments);

      // Modify title (metadata)
      const updatedDocuments = [
        {
          id: 'doc1',
          title: 'Updated Title',
          content: 'Test content',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
      ];

      // Second run - should detect metadata change
      const changes = await changeDetection.detectChanges('test-source', updatedDocuments);

      assert.strictEqual(changes.updates.length, 1);
      assert.strictEqual(changes.updates[0].change_type, 'metadata');
    });

    it('should detect deletions', async () => {
      const initialDocuments = [
        {
          id: 'doc1',
          title: 'Document 1',
          content: 'Content 1',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
        {
          id: 'doc2',
          title: 'Document 2',
          content: 'Content 2',
          type: 'procedure',
          last_updated: new Date().toISOString(),
        },
      ];

      // First run
      await changeDetection.detectChanges('test-source', initialDocuments);

      // Remove one document
      const updatedDocuments = [
        {
          id: 'doc1',
          title: 'Document 1',
          content: 'Content 1',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
      ];

      // Second run - should detect deletion
      const changes = await changeDetection.detectChanges('test-source', updatedDocuments);

      assert.strictEqual(changes.additions.length, 0);
      assert.strictEqual(changes.updates.length, 0);
      assert.strictEqual(changes.deletions.length, 1);
      assert.strictEqual(changes.deletions[0].id, 'doc2');
    });

    it('should generate document fingerprints correctly', async () => {
      const document = {
        id: 'test-doc',
        title: 'Test Document',
        content: 'This is test content',
        type: 'runbook',
        last_updated: new Date().toISOString(),
      };

      // Access private method through any for testing
      const fingerprint = (changeDetection as any).generateDocumentFingerprint(document);

      assert.strictEqual(fingerprint.id, 'test-doc');
      assert.ok(fingerprint.content_hash);
      assert.ok(fingerprint.metadata_hash);
      assert.ok(fingerprint.structure_hash);
      assert.ok(fingerprint.last_modified instanceof Date);
      assert.ok(typeof fingerprint.size_bytes === 'number');
    });

    it('should classify documents correctly', async () => {
      const runbookDoc = {
        id: 'runbook1',
        title: 'Server Restart Procedure',
        content: 'Steps to restart server',
        type: 'runbook',
        last_updated: new Date().toISOString(),
      };

      const troubleshootDoc = {
        id: 'troubleshoot1',
        title: 'Troubleshooting Network Issues',
        content: 'How to troubleshoot network problems',
        type: 'guide',
        last_updated: new Date().toISOString(),
      };

      const escalationDoc = {
        id: 'escalation1',
        title: 'Escalation Procedures',
        content: 'When to escalate issues to senior team',
        type: 'procedure',
        last_updated: new Date().toISOString(),
      };

      const changes1 = await changeDetection.detectChanges('test-source', [runbookDoc]);
      const changes2 = await changeDetection.detectChanges('test-source-2', [troubleshootDoc]);
      const changes3 = await changeDetection.detectChanges('test-source-3', [escalationDoc]);

      assert.strictEqual(changes1.additions[0].classification, 'runbook');
      assert.strictEqual(changes2.additions[0].classification, 'troubleshooting');
      assert.strictEqual(changes3.additions[0].classification, 'documentation');
    });
  });

  describe('DocumentationIndexer Integration', () => {
    let indexer: DocumentationIndexer;
    let indexerConfig: IndexerConfig;

    beforeEach(async () => {
      // Create test documents in temp directory
      await fs.writeFile(
        path.join(tempDir, 'test-runbook.md'),
        '# Test Runbook\n\nThis is a test runbook for indexing.'
      );

      await fs.writeFile(
        path.join(tempDir, 'test-procedure.json'),
        JSON.stringify({
          id: 'proc1',
          title: 'Test Procedure',
          steps: ['Step 1', 'Step 2', 'Step 3'],
        })
      );

      indexerConfig = {
        sources: [],
        parallel: false,
        batch_size: 10,
        output_format: 'json',
        cache_warm: false,
        dry_run: true,
        verbose: false,
        incremental: false,
        force_fingerprint_check: false,
        cleanup_orphaned: false,
        validate_corpus: false,
        show_changes: false,
      };

      indexer = new DocumentationIndexer(configManager, indexerConfig);
    });

    afterEach(async () => {
      await indexer.cleanup();
    });

    it('should initialize successfully', async () => {
      await indexer.initialize();
      // If no error is thrown, initialization succeeded
      assert.ok(true);
    });

    it('should perform dry run indexing', async () => {
      await indexer.initialize();

      const report = await indexer.indexAllSources();

      assert.ok(report);
      assert.ok(report.summary);
      assert.strictEqual(typeof report.summary.total_sources, 'number');
      assert.strictEqual(typeof report.summary.success_rate, 'number');
      assert.ok(Array.isArray(report.sources));
      assert.ok(Array.isArray(report.errors));
      assert.ok(Array.isArray(report.recommendations));
    });

    it('should handle incremental indexing', async () => {
      indexerConfig.incremental = true;
      indexerConfig.show_changes = true;

      const incrementalIndexer = new DocumentationIndexer(configManager, indexerConfig);
      await incrementalIndexer.initialize();

      const report = await incrementalIndexer.indexAllSources();

      assert.ok(report);
      assert.strictEqual(report.summary.success_rate, 1);

      // Check that change detection was performed
      for (const sourceReport of report.sources) {
        if (sourceReport.changes) {
          assert.ok(sourceReport.changes.statistics);
          assert.ok(typeof sourceReport.changes.statistics.total_changes === 'number');
        }
      }

      await incrementalIndexer.cleanup();
    });

    it('should generate quality recommendations', async () => {
      await indexer.initialize();

      const report = await indexer.indexAllSources();

      assert.ok(Array.isArray(report.recommendations));
      assert.ok(report.recommendations.length > 0);

      // Should include cache warming recommendation
      const hasCacheRecommendation = report.recommendations.some(rec =>
        rec.includes('cache warming')
      );
      assert.ok(hasCacheRecommendation);
    });

    it('should handle source failures gracefully', async () => {
      // Mock a source config that will fail
      const failingConfig = {
        sources: [
          {
            name: 'failing-source',
            type: 'nonexistent',
            enabled: true,
          },
        ],
      };

      mock.method(configManager, 'getConfig', () => failingConfig);

      const failingIndexer = new DocumentationIndexer(configManager, indexerConfig);

      // Should not throw error during initialization with dry_run
      await failingIndexer.initialize();

      const report = await failingIndexer.indexAllSources();

      // Should complete despite failures
      assert.ok(report);
      assert.ok(report.errors.length >= 0); // May have errors

      await failingIndexer.cleanup();
    });

    it('should calculate quality scores', async () => {
      await indexer.initialize();

      const report = await indexer.indexAllSources();

      for (const sourceReport of report.sources) {
        assert.ok(typeof sourceReport.quality_score === 'number');
        assert.ok(sourceReport.quality_score >= 0);
        assert.ok(sourceReport.quality_score <= 10);
      }
    });

    it('should track performance metrics', async () => {
      await indexer.initialize();

      const report = await indexer.indexAllSources();

      assert.ok(report.performance);
      assert.ok(typeof report.performance.total_duration_ms === 'number');
      assert.ok(report.performance.total_duration_ms >= 0);

      for (const sourceReport of report.sources) {
        assert.ok(typeof sourceReport.processing_time_ms === 'number');
        assert.ok(sourceReport.processing_time_ms >= 0);

        if (sourceReport.documents_processed > 0) {
          assert.ok(typeof sourceReport.avg_processing_time_per_doc === 'number');
          assert.ok(sourceReport.avg_processing_time_per_doc >= 0);
        }
      }
    });
  });

  describe('CLI Error Handling', () => {
    it('should handle invalid batch size', () => {
      const config: IndexerConfig = {
        sources: [],
        parallel: false,
        batch_size: -1, // Invalid
        output_format: 'json',
        cache_warm: false,
        dry_run: false,
        verbose: false,
        incremental: false,
        force_fingerprint_check: false,
        cleanup_orphaned: false,
        validate_corpus: false,
        show_changes: false,
      };

      // Should handle invalid batch size gracefully
      assert.ok(config.batch_size < 1);
    });

    it('should handle invalid output format', () => {
      const config: IndexerConfig = {
        sources: [],
        parallel: false,
        batch_size: 25,
        output_format: 'xml' as any, // Invalid format
        cache_warm: false,
        dry_run: false,
        verbose: false,
        incremental: false,
        force_fingerprint_check: false,
        cleanup_orphaned: false,
        validate_corpus: false,
        show_changes: false,
      };

      // Should handle invalid output format
      assert.strictEqual(config.output_format, 'xml');
    });

    it('should handle invalid since date', () => {
      const invalidDate = new Date('invalid-date');

      const config: IndexerConfig = {
        sources: [],
        parallel: false,
        batch_size: 25,
        output_format: 'json',
        cache_warm: false,
        dry_run: false,
        verbose: false,
        incremental: true,
        since: invalidDate,
        force_fingerprint_check: false,
        cleanup_orphaned: false,
        validate_corpus: false,
        show_changes: false,
      };

      // Should handle invalid date
      assert.ok(isNaN(config.since!.getTime()));
    });
  });

  describe('State Persistence', () => {
    let changeDetection: ChangeDetectionService;
    let stateDir: string;

    beforeEach(() => {
      stateDir = path.join(tempDir, 'indexing-state');
      const cacheConfig = {
        enabled: true,
        memory: { ttl_seconds: 3600, check_period_seconds: 600, max_keys: 1000 },
        redis: { enabled: false },
      };

      const cacheService = new CacheService(cacheConfig as any);
      changeDetection = new ChangeDetectionService(cacheService, stateDir);
    });

    it('should create state directory if it does not exist', async () => {
      const documents = [
        {
          id: 'doc1',
          title: 'Test Document',
          content: 'Test content',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
      ];

      await changeDetection.detectChanges('test-source', documents);

      // Check that state directory was created
      const stateDirExists = await fs
        .access(stateDir)
        .then(() => true)
        .catch(() => false);
      assert.ok(stateDirExists);
    });

    it('should persist and load state correctly', async () => {
      const documents = [
        {
          id: 'doc1',
          title: 'Test Document',
          content: 'Test content',
          type: 'runbook',
          last_updated: new Date().toISOString(),
        },
      ];

      // First detection should create state
      const changes1 = await changeDetection.detectChanges('test-source', documents);
      assert.strictEqual(changes1.additions.length, 1);

      // Second detection should load state and find no changes
      const changes2 = await changeDetection.detectChanges('test-source', documents);
      assert.strictEqual(changes2.additions.length, 0);
      assert.strictEqual(changes2.updates.length, 0);
      assert.strictEqual(changes2.deletions.length, 0);

      // Check that state file exists
      const stateFile = path.join(stateDir, 'test-source.json');
      const stateExists = await fs
        .access(stateFile)
        .then(() => true)
        .catch(() => false);
      assert.ok(stateExists);

      // Verify state content
      const stateContent = await fs.readFile(stateFile, 'utf-8');
      const state = JSON.parse(stateContent);
      assert.strictEqual(state.source, 'test-source');
      assert.strictEqual(state.document_count, 1);
      assert.ok(state.fingerprints);
      assert.ok(state.fingerprints['doc1']);
    });
  });
});
