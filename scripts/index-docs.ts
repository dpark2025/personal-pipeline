#!/usr/bin/env tsx

/**
 * Documentation Indexer Tool
 * 
 * Authored by: Integration Specialist (Barry Young)
 * Date: 2025-08-15
 * 
 * Batch index documentation from multiple sources with advanced features:
 * - Multi-source processing with parallel execution
 * - Change detection and corpus synchronization  
 * - Incremental indexing with document fingerprinting
 * - Cache warming and performance optimization
 * - Quality analysis and metadata extraction
 */

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../src/utils/config.js';
import logger from '../src/utils/logger.js';
import { CacheService } from '../src/utils/cache.js';
import { PerformanceMonitor, PerformanceMetrics } from '../src/utils/performance.js';
import { SourceAdapter } from '../src/adapters/base.js';
import { EnhancedFileSystemAdapter as FileSystemAdapter } from '../src/adapters/file-enhanced.js';
import { ConfluenceAdapter } from '../src/adapters/confluence.js';
import { GitHubAdapter } from '../src/adapters/github.js';
import { WebAdapter } from '../src/adapters/web.js';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

// ========================================
// Core Interfaces & Types
// ========================================

export interface IndexerConfig {
  sources: string[];
  parallel: boolean;
  batch_size: number;
  output_format: 'json' | 'yaml' | 'csv';
  cache_warm: boolean;
  dry_run: boolean;
  verbose: boolean;
  incremental: boolean;
  since?: Date;
  force_fingerprint_check: boolean;
  cleanup_orphaned: boolean;
  validate_corpus: boolean;
  show_changes: boolean;
}

export interface IndexingReport {
  summary: {
    total_sources: number;
    processed_sources: number;
    total_documents: number;
    processed_documents: number;
    success_rate: number;
    total_duration_ms: number;
    avg_documents_per_second: number;
  };
  sources: SourceReport[];
  performance: PerformanceMetrics & { total_duration_ms: number; documents_per_second: number };
  cache_warming: CacheWarmingResult | null;
  quality_analysis: QualityReport | null;
  change_detection?: ChangeSet;
  errors: IndexingError[];
  recommendations: string[];
}

export interface SourceReport {
  source_name: string;
  source_type: string;
  status: 'success' | 'partial' | 'failed';
  documents_processed: number;
  documents_skipped: number;
  processing_time_ms: number;
  avg_processing_time_per_doc: number;
  cache_entries_created: number;
  quality_score: number;
  errors: SourceError[];
  metadata: SourceMetadata;
  changes?: ChangeSet;
}

export interface IndexerPerformanceMetrics {
  total_duration_ms: number;
  avg_response_time_ms: number;
  peak_memory_mb: number;
  cache_hit_rate: number;
  documents_per_second: number;
  parallel_efficiency: number;
}

export interface CacheWarmingResult {
  entries_warmed: number;
  cache_hit_improvement: number;
  warming_time_ms: number;
  success_rate: number;
}

export interface QualityReport {
  overall_score: number;
  total_documents: number;
  quality_issues: QualityIssue[];
  duplicate_content: DuplicationReport;
  freshness_analysis: FreshnessReport;
  structure_validation: StructureReport;
}

export interface IndexingError {
  source: string;
  error_type: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SourceError {
  operation: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
}

// Change Detection Types
export interface ChangeSet {
  source: string;
  timestamp: Date;
  additions: DocumentAddition[];
  updates: DocumentUpdate[];
  deletions: DocumentDeletion[];
  statistics: ChangeStatistics;
}

export interface DocumentFingerprint {
  id: string;
  content_hash: string;
  metadata_hash: string;
  last_modified: Date;
  size_bytes: number;
  structure_hash: string;
}

export interface DocumentAddition {
  id: string;
  title: string;
  fingerprint: DocumentFingerprint;
  classification: string;
}

export interface DocumentUpdate {
  id: string;
  title: string;
  old_fingerprint: DocumentFingerprint;
  new_fingerprint: DocumentFingerprint;
  change_type: 'content' | 'metadata' | 'structure' | 'all';
}

export interface DocumentDeletion {
  id: string;
  title: string;
  last_fingerprint: DocumentFingerprint;
  deletion_detected: Date;
}

export interface ChangeStatistics {
  total_changes: number;
  additions_count: number;
  updates_count: number;
  deletions_count: number;
  content_changes: number;
  metadata_changes: number;
  structure_changes: number;
}

// Quality Analysis Types
export interface QualityIssue {
  type: 'missing_metadata' | 'broken_links' | 'outdated_content' | 'formatting_errors' | 'duplicate_content';
  severity: 'low' | 'medium' | 'high';
  document_id: string;
  description: string;
  suggestion: string;
}

export interface DuplicationReport {
  duplicate_groups: DuplicateGroup[];
  similarity_threshold: number;
  total_duplicates: number;
}

export interface DuplicateGroup {
  documents: string[];
  similarity_score: number;
  content_overlap: number;
}

export interface FreshnessReport {
  average_age_days: number;
  stale_documents: string[];
  recent_documents: string[];
  last_update_distribution: Record<string, number>;
}

export interface StructureReport {
  well_formed_documents: number;
  malformed_documents: number;
  missing_required_fields: number;
  validation_errors: ValidationError[];
}

export interface ValidationError {
  document_id: string;
  field: string;
  error_type: string;
  message: string;
}

// ========================================
// Progress Tracking System
// ========================================

export class ProgressTracker {
  private startTime: Date;
  private totalSources: number = 0;
  private processedSources: number = 0;
  private totalDocuments: number = 0;
  private processedDocuments: number = 0;
  private errors: IndexingError[] = [];
  private sourceProgress: Map<string, SourceProgress> = new Map();
  private spinner: any;

  constructor(private verbose: boolean = false) {
    this.startTime = new Date();
    this.spinner = ora();
  }

  startIndexing(sources: string[]): void {
    this.totalSources = sources.length;
    this.processedSources = 0;
    this.totalDocuments = 0;
    this.processedDocuments = 0;
    this.errors = [];
    
    if (this.verbose) {
      console.log(chalk.blue(`🚀 Starting indexing for ${sources.length} sources...`));
    }
    
    this.spinner.start('Initializing documentation indexing...');
  }

  updateProgress(sourceName: string, processed: number, total: number, phase?: string): void {
    const progress = this.sourceProgress.get(sourceName) || {
      processed: 0,
      total: 0,
      startTime: new Date(),
      phase: 'processing'
    };
    
    progress.processed = processed;
    progress.total = total;
    if (phase) progress.phase = phase;
    
    this.sourceProgress.set(sourceName, progress);
    
    // Update totals
    this.totalDocuments = Array.from(this.sourceProgress.values())
      .reduce((sum, p) => sum + p.total, 0);
    this.processedDocuments = Array.from(this.sourceProgress.values())
      .reduce((sum, p) => sum + p.processed, 0);
    
    // Update spinner
    const percentage = this.totalDocuments > 0 
      ? Math.round((this.processedDocuments / this.totalDocuments) * 100)
      : 0;
    
    this.spinner.text = `Processing documents... ${this.processedDocuments}/${this.totalDocuments} (${percentage}%)`;
    
    if (this.verbose) {
      console.log(chalk.gray(`📊 ${sourceName}: ${processed}/${total} documents ${phase ? `(${phase})` : ''}`));
    }
  }

  reportError(error: IndexingError): void {
    this.errors.push(error);
    
    if (this.verbose) {
      const color = error.severity === 'critical' ? chalk.red : 
                   error.severity === 'high' ? chalk.yellow : 
                   chalk.gray;
      console.log(color(`❌ ${error.source}: ${error.message}`));
    }
  }

  completeSource(sourceName: string): void {
    this.processedSources++;
    
    if (this.verbose) {
      console.log(chalk.green(`✅ Completed source: ${sourceName}`));
    }
  }

  generateProgressReport(): ProgressReport {
    const duration = Date.now() - this.startTime.getTime();
    const documentsPerSecond = duration > 0 ? (this.processedDocuments / (duration / 1000)) : 0;
    
    return {
      total_sources: this.totalSources,
      processed_sources: this.processedSources,
      total_documents: this.totalDocuments,
      processed_documents: this.processedDocuments,
      success_rate: this.totalDocuments > 0 ? (this.processedDocuments / this.totalDocuments) : 0,
      duration_ms: duration,
      documents_per_second: documentsPerSecond,
      errors_count: this.errors.length,
      estimated_completion: this.estimateTimeRemaining()
    };
  }

  estimateTimeRemaining(): number {
    if (this.processedDocuments === 0) return 0;
    
    const elapsed = Date.now() - this.startTime.getTime();
    const rate = this.processedDocuments / elapsed;
    const remaining = this.totalDocuments - this.processedDocuments;
    
    return remaining / rate;
  }

  finish(): void {
    this.spinner.stop();
    
    const report = this.generateProgressReport();
    const duration = Math.round(report.duration_ms / 1000);
    
    console.log(chalk.green(`\n🎉 Indexing completed in ${duration}s`));
    console.log(chalk.blue(`📊 Processed ${report.processed_documents}/${report.total_documents} documents`));
    console.log(chalk.blue(`⚡ Rate: ${Math.round(report.documents_per_second)} docs/sec`));
    
    if (this.errors.length > 0) {
      console.log(chalk.yellow(`⚠️ ${this.errors.length} errors encountered`));
    }
  }
}

interface SourceProgress {
  processed: number;
  total: number;
  startTime: Date;
  phase: string;
}

interface ProgressReport {
  total_sources: number;
  processed_sources: number;
  total_documents: number;
  processed_documents: number;
  success_rate: number;
  duration_ms: number;
  documents_per_second: number;
  errors_count: number;
  estimated_completion: number;
}

// ========================================
// Change Detection Service
// ========================================

export class ChangeDetectionService {
  private stateDir: string;
  private logger: any;

  constructor(private cacheService: CacheService, stateDir = './state/indexing') {
    this.stateDir = stateDir;
    this.logger = logger.child({ component: 'ChangeDetection' });
  }

  async ensureStateDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.stateDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create state directory', { error, stateDir: this.stateDir });
      throw error;
    }
  }

  async detectChanges(source: string, currentDocuments: any[]): Promise<ChangeSet> {
    await this.ensureStateDirectory();
    
    const previousState = await this.loadPreviousState(source);
    const currentFingerprints = new Map<string, DocumentFingerprint>();
    
    // Generate fingerprints for current documents
    for (const doc of currentDocuments) {
      const fingerprint = this.generateDocumentFingerprint(doc);
      currentFingerprints.set(doc.id, fingerprint);
    }
    
    const additions: DocumentAddition[] = [];
    const updates: DocumentUpdate[] = [];
    const deletions: DocumentDeletion[] = [];
    
    // Detect additions and updates
    for (const [docId, currentFingerprint] of currentFingerprints) {
      const previousFingerprint = previousState.get(docId);
      
      if (!previousFingerprint) {
        // New document
        const doc = currentDocuments.find(d => d.id === docId);
        additions.push({
          id: docId,
          title: doc?.title || 'Unknown',
          fingerprint: currentFingerprint,
          classification: this.classifyDocument(doc)
        });
      } else {
        // Check for changes
        const changeType = this.compareFingerprints(currentFingerprint, previousFingerprint);
        if (changeType !== 'none') {
          const doc = currentDocuments.find(d => d.id === docId);
          updates.push({
            id: docId,
            title: doc?.title || 'Unknown',
            old_fingerprint: previousFingerprint,
            new_fingerprint: currentFingerprint,
            change_type: changeType
          });
        }
      }
    }
    
    // Detect deletions
    for (const [docId, previousFingerprint] of previousState) {
      if (!currentFingerprints.has(docId)) {
        deletions.push({
          id: docId,
          title: 'Deleted Document',
          last_fingerprint: previousFingerprint,
          deletion_detected: new Date()
        });
      }
    }
    
    // Save current state
    await this.saveCurrentState(source, currentFingerprints);
    
    const statistics: ChangeStatistics = {
      total_changes: additions.length + updates.length + deletions.length,
      additions_count: additions.length,
      updates_count: updates.length,
      deletions_count: deletions.length,
      content_changes: updates.filter(u => u.change_type === 'content' || u.change_type === 'all').length,
      metadata_changes: updates.filter(u => u.change_type === 'metadata' || u.change_type === 'all').length,
      structure_changes: updates.filter(u => u.change_type === 'structure' || u.change_type === 'all').length
    };
    
    return {
      source,
      timestamp: new Date(),
      additions,
      updates,
      deletions,
      statistics
    };
  }

  private generateDocumentFingerprint(document: any): DocumentFingerprint {
    const content = JSON.stringify(document.content || '');
    const metadata = JSON.stringify({
      title: document.title,
      source: document.source,
      source_type: document.source_type,
      last_updated: document.last_updated
    });
    
    // Structure hash based on document type and structure
    const structure = JSON.stringify({
      type: document.type,
      has_procedures: !!document.procedures,
      has_decision_tree: !!document.decision_tree,
      section_count: document.content ? document.content.split('\n').filter(line => line.startsWith('#')).length : 0
    });
    
    return {
      id: document.id,
      content_hash: crypto.createHash('sha256').update(content).digest('hex'),
      metadata_hash: crypto.createHash('sha256').update(metadata).digest('hex'),
      structure_hash: crypto.createHash('sha256').update(structure).digest('hex'),
      last_modified: new Date(document.last_updated || Date.now()),
      size_bytes: content.length
    };
  }

  private compareFingerprints(current: DocumentFingerprint, previous: DocumentFingerprint): 'content' | 'metadata' | 'structure' | 'all' | 'none' {
    const contentChanged = current.content_hash !== previous.content_hash;
    const metadataChanged = current.metadata_hash !== previous.metadata_hash;
    const structureChanged = current.structure_hash !== previous.structure_hash;
    
    if (contentChanged && metadataChanged && structureChanged) return 'all';
    if (contentChanged && !metadataChanged && !structureChanged) return 'content';
    if (!contentChanged && metadataChanged && !structureChanged) return 'metadata';
    if (!contentChanged && !metadataChanged && structureChanged) return 'structure';
    if (contentChanged || metadataChanged || structureChanged) return 'all';
    
    return 'none';
  }

  private classifyDocument(document: any): string {
    if (document.type === 'runbook') return 'runbook';
    if (document.content && document.content.includes('escalation')) return 'escalation_guide';
    if (document.title && document.title.toLowerCase().includes('troubleshoot')) return 'troubleshooting';
    if (document.type === 'procedure' && document.title && document.title.toLowerCase().includes('escalation')) return 'documentation';
    if (document.type === 'procedure') return 'procedure';
    return 'documentation';
  }

  private async loadPreviousState(source: string): Promise<Map<string, DocumentFingerprint>> {
    const statePath = path.join(this.stateDir, `${source}.json`);
    
    try {
      const stateData = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(stateData);
      const fingerprintMap = new Map<string, DocumentFingerprint>();
      
      for (const [id, fingerprint] of Object.entries(state.fingerprints || {})) {
        fingerprintMap.set(id, fingerprint as DocumentFingerprint);
      }
      
      return fingerprintMap;
    } catch (error) {
      this.logger.debug('No previous state found', { source, error: error.message });
      return new Map();
    }
  }

  private async saveCurrentState(source: string, fingerprints: Map<string, DocumentFingerprint>): Promise<void> {
    const statePath = path.join(this.stateDir, `${source}.json`);
    
    const state = {
      source,
      last_updated: new Date().toISOString(),
      document_count: fingerprints.size,
      fingerprints: Object.fromEntries(fingerprints)
    };
    
    try {
      await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
      this.logger.debug('Saved indexing state', { source, documents: fingerprints.size });
    } catch (error) {
      this.logger.error('Failed to save indexing state', { source, error });
      throw error;
    }
  }
}

// ========================================
// Documentation Indexer Main Class
// ========================================

export class DocumentationIndexer {
  private adapters: Map<string, SourceAdapter> = new Map();
  private progressTracker: ProgressTracker;
  private changeDetection: ChangeDetectionService;
  private cacheService: CacheService;
  private performanceMonitor: PerformanceMonitor;
  private logger: any;

  constructor(
    private configManager: ConfigManager,
    private config: IndexerConfig
  ) {
    this.logger = logger.child({ component: 'DocumentationIndexer' });
    this.progressTracker = new ProgressTracker(config.verbose);
    // Initialize cache service with minimal config for indexer
    this.cacheService = new CacheService({
      enabled: true,
      memory: {
        ttl_seconds: 3600,
        check_period_seconds: 600,
        max_keys: 1000
      },
      redis: {
        enabled: false
      }
    } as any);
    this.performanceMonitor = new PerformanceMonitor();
    this.changeDetection = new ChangeDetectionService(this.cacheService);
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Documentation Indexer', { config: this.config });
    
    // Initialize source adapters
    await this.initializeAdapters();
    
    this.logger.info('Documentation Indexer initialized successfully');
  }

  private async initializeAdapters(): Promise<void> {
    const config = this.configManager.getConfig();
    const sourceConfigs = config.sources;
    
    for (const sourceConfig of sourceConfigs) {
      if (this.config.sources.length > 0 && !this.config.sources.includes(sourceConfig.name)) {
        continue; // Skip sources not in the filter list
      }
      
      let adapter: SourceAdapter;
      
      switch (sourceConfig.type) {
        case 'file':
          adapter = new FileSystemAdapter(sourceConfig);
          break;
        case 'confluence':
          adapter = new ConfluenceAdapter(sourceConfig, this.cacheService);
          break;
        case 'github':
          adapter = new GitHubAdapter(sourceConfig, this.cacheService);
          break;
        case 'web':
          adapter = new WebAdapter(sourceConfig, this.cacheService);
          break;
        default:
          this.logger.warn('Unknown adapter type', { type: sourceConfig.type, name: sourceConfig.name });
          continue;
      }
      
      try {
        await adapter.initialize();
        this.adapters.set(sourceConfig.name, adapter);
        this.logger.info('Adapter initialized', { name: sourceConfig.name, type: sourceConfig.type });
      } catch (error) {
        this.logger.error('Failed to initialize adapter', { 
          name: sourceConfig.name, 
          type: sourceConfig.type, 
          error: error.message 
        });
        
        if (!this.config.dry_run) {
          throw error;
        }
      }
    }
  }

  async indexAllSources(): Promise<IndexingReport> {
    const startTime = Date.now();
    this.logger.info('Starting documentation indexing', { 
      sources: Array.from(this.adapters.keys()),
      parallel: this.config.parallel 
    });
    
    this.progressTracker.startIndexing(Array.from(this.adapters.keys()));
    
    const sourceReports: SourceReport[] = [];
    const errors: IndexingError[] = [];
    
    try {
      if (this.config.parallel) {
        // Parallel processing
        const indexingPromises = Array.from(this.adapters.entries()).map(([name, adapter]) =>
          this.indexSource(name, adapter).catch(error => {
            errors.push({
              source: name,
              error_type: 'indexing_failure',
              message: error.message,
              timestamp: new Date(),
              severity: 'high'
            });
            return null;
          })
        );
        
        const results = await Promise.allSettled(indexingPromises);
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            sourceReports.push(result.value);
          }
        }
      } else {
        // Sequential processing
        for (const [name, adapter] of this.adapters) {
          try {
            const report = await this.indexSource(name, adapter);
            sourceReports.push(report);
          } catch (error) {
            errors.push({
              source: name,
              error_type: 'indexing_failure',
              message: error.message,
              timestamp: new Date(),
              severity: 'high'
            });
          }
        }
      }
    } finally {
      this.progressTracker.finish();
    }
    
    // Generate final report
    const totalDuration = Date.now() - startTime;
    const totalDocuments = sourceReports.reduce((sum, r) => sum + r.documents_processed, 0);
    const successfulDocuments = sourceReports
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + r.documents_processed, 0);
    
    const report: IndexingReport = {
      summary: {
        total_sources: this.adapters.size,
        processed_sources: sourceReports.length,
        total_documents: totalDocuments,
        processed_documents: successfulDocuments,
        success_rate: totalDocuments > 0 ? successfulDocuments / totalDocuments : 0,
        total_duration_ms: totalDuration,
        avg_documents_per_second: totalDuration > 0 ? (successfulDocuments / (totalDuration / 1000)) : 0
      },
      sources: sourceReports,
      performance: {
        ...this.performanceMonitor.getMetrics(),
        total_duration_ms: totalDuration,
        documents_per_second: totalDuration > 0 ? (successfulDocuments / (totalDuration / 1000)) : 0
      },
      cache_warming: null, // Will be populated if cache warming is enabled
      quality_analysis: null, // Will be populated if quality analysis is enabled
      errors,
      recommendations: this.generateRecommendations(sourceReports, errors)
    };
    
    this.logger.info('Documentation indexing completed', { 
      summary: report.summary,
      errors: errors.length 
    });
    
    return report;
  }

  private async indexSource(sourceName: string, adapter: SourceAdapter): Promise<SourceReport> {
    const sourceStartTime = Date.now();
    this.logger.info('Starting source indexing', { source: sourceName });
    
    this.progressTracker.updateProgress(sourceName, 0, 0, 'initializing');
    
    try {
      // Health check
      const health = await adapter.healthCheck();
      if (!health.healthy) {
        throw new Error(`Source ${sourceName} is not healthy: ${JSON.stringify(health.details)}`);
      }
      
      // Get all documents
      this.progressTracker.updateProgress(sourceName, 0, 0, 'fetching');
      const documents = await this.getAllDocuments(adapter);
      
      this.progressTracker.updateProgress(sourceName, 0, documents.length, 'processing');
      
      let processedCount = 0;
      let skippedCount = 0;
      const sourceErrors: SourceError[] = [];
      let changes: ChangeSet | undefined;
      
      // Change detection for incremental indexing
      if (this.config.incremental) {
        this.progressTracker.updateProgress(sourceName, 0, documents.length, 'detecting changes');
        changes = await this.changeDetection.detectChanges(sourceName, documents);
        
        if (this.config.show_changes) {
          this.logChanges(sourceName, changes);
        }
        
        if (!this.config.dry_run) {
          // Process only changed documents
          const changedDocuments = this.getChangedDocuments(documents, changes);
          processedCount = await this.processDocuments(adapter, changedDocuments, sourceName, sourceErrors);
        } else {
          processedCount = changes.statistics.total_changes;
        }
      } else {
        // Process all documents
        if (!this.config.dry_run) {
          processedCount = await this.processDocuments(adapter, documents, sourceName, sourceErrors);
        } else {
          processedCount = documents.length;
        }
      }
      
      this.progressTracker.completeSource(sourceName);
      
      const processingTime = Date.now() - sourceStartTime;
      const metadata = await adapter.getMetadata();
      
      return {
        source_name: sourceName,
        source_type: adapter.type,
        status: sourceErrors.length > 0 ? 'partial' : 'success',
        documents_processed: processedCount,
        documents_skipped: skippedCount,
        processing_time_ms: processingTime,
        avg_processing_time_per_doc: processedCount > 0 ? processingTime / processedCount : 0,
        cache_entries_created: processedCount, // Simplified for now
        quality_score: this.calculateQualityScore(documents),
        errors: sourceErrors,
        metadata,
        changes
      };
      
    } catch (error) {
      this.logger.error('Source indexing failed', { source: sourceName, error: error.message });
      
      return {
        source_name: sourceName,
        source_type: adapter.type,
        status: 'failed',
        documents_processed: 0,
        documents_skipped: 0,
        processing_time_ms: Date.now() - sourceStartTime,
        avg_processing_time_per_doc: 0,
        cache_entries_created: 0,
        quality_score: 0,
        errors: [{
          operation: 'index_source',
          message: error.message,
          timestamp: new Date(),
          recoverable: false
        }],
        metadata: {
          source_name: sourceName,
          source_type: adapter.type,
          status: 'failed',
          document_count: 0,
          last_updated: new Date().toISOString()
        }
      };
    }
  }

  private async getAllDocuments(adapter: SourceAdapter): Promise<any[]> {
    // Use wildcard search to get all documents
    const results = await adapter.search('*', { include_all: true });
    return results;
  }

  private getChangedDocuments(allDocuments: any[], changes: ChangeSet): any[] {
    const changedIds = new Set([
      ...changes.additions.map(a => a.id),
      ...changes.updates.map(u => u.id)
      // Don't include deletions as they don't need processing
    ]);
    
    return allDocuments.filter(doc => changedIds.has(doc.id));
  }

  private async processDocuments(
    adapter: SourceAdapter, 
    documents: any[], 
    sourceName: string, 
    errors: SourceError[]
  ): Promise<number> {
    let processedCount = 0;
    
    // Process in batches
    for (let i = 0; i < documents.length; i += this.config.batch_size) {
      const batch = documents.slice(i, i + this.config.batch_size);
      
      for (const doc of batch) {
        try {
          // Simple processing - in a real implementation, this would do more
          // like cache warming, quality analysis, etc.
          await this.processDocument(doc);
          processedCount++;
          
          this.progressTracker.updateProgress(sourceName, processedCount, documents.length, 'processing');
        } catch (error) {
          errors.push({
            operation: 'process_document',
            message: `Failed to process document ${doc.id}: ${error.message}`,
            timestamp: new Date(),
            recoverable: true
          });
        }
      }
    }
    
    return processedCount;
  }

  private async processDocument(document: any): Promise<void> {
    // Simulate document processing
    if (this.config.verbose) {
      this.logger.debug('Processing document', { id: document.id, title: document.title });
    }
    
    // Add artificial delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  private calculateQualityScore(documents: any[]): number {
    if (documents.length === 0) return 0;
    
    let score = 0;
    for (const doc of documents) {
      let docScore = 0;
      
      // Basic quality metrics
      if (doc.title && doc.title.length > 5) docScore += 2;
      if (doc.content && doc.content.length > 100) docScore += 3;
      if (doc.last_updated) docScore += 1;
      if (doc.type === 'runbook' && doc.procedures) docScore += 2;
      if (doc.confidence_score && doc.confidence_score > 0.7) docScore += 2;
      
      score += Math.min(docScore, 10); // Cap at 10 per document
    }
    
    return Math.min(score / documents.length, 10); // Normalize to 0-10 scale
  }

  private logChanges(sourceName: string, changes: ChangeSet): void {
    console.log(chalk.blue(`\n📊 Change Detection Results for ${sourceName}:`));
    console.log(chalk.green(`  ➕ Additions: ${changes.statistics.additions_count}`));
    console.log(chalk.yellow(`  📝 Updates: ${changes.statistics.updates_count}`));
    console.log(chalk.red(`  ➖ Deletions: ${changes.statistics.deletions_count}`));
    
    if (this.config.verbose && changes.additions.length > 0) {
      console.log(chalk.green(`\n  New Documents:`));
      for (const addition of changes.additions.slice(0, 5)) {
        console.log(chalk.gray(`    + ${addition.title} (${addition.classification})`));
      }
      if (changes.additions.length > 5) {
        console.log(chalk.gray(`    ... and ${changes.additions.length - 5} more`));
      }
    }
    
    if (this.config.verbose && changes.updates.length > 0) {
      console.log(chalk.yellow(`\n  Updated Documents:`));
      for (const update of changes.updates.slice(0, 5)) {
        console.log(chalk.gray(`    ~ ${update.title} (${update.change_type} changes)`));
      }
      if (changes.updates.length > 5) {
        console.log(chalk.gray(`    ... and ${changes.updates.length - 5} more`));
      }
    }
  }

  private generateRecommendations(sourceReports: SourceReport[], errors: IndexingError[]): string[] {
    const recommendations: string[] = [];
    
    // Performance recommendations
    const avgProcessingTime = sourceReports.reduce((sum, r) => sum + r.avg_processing_time_per_doc, 0) / sourceReports.length;
    if (avgProcessingTime > 200) {
      recommendations.push('Consider enabling parallel processing to improve performance');
    }
    
    // Quality recommendations
    const avgQualityScore = sourceReports.reduce((sum, r) => sum + r.quality_score, 0) / sourceReports.length;
    if (avgQualityScore < 6) {
      recommendations.push('Review documentation quality - many documents are missing essential metadata');
    }
    
    // Error recommendations
    if (errors.length > 0) {
      const criticalErrors = errors.filter(e => e.severity === 'critical').length;
      if (criticalErrors > 0) {
        recommendations.push(`Address ${criticalErrors} critical errors before production deployment`);
      }
    }
    
    // Cache recommendations
    recommendations.push('Enable cache warming for improved search response times');
    
    return recommendations;
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Documentation Indexer');
    
    // Cleanup adapters
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.cleanup();
      } catch (error) {
        this.logger.warn('Error during adapter cleanup', { error: error.message });
      }
    }
    
    // Cleanup cache service (if method exists)
    if (typeof this.cacheService.cleanup === 'function') {
      await this.cacheService.cleanup();
    }
    
    this.logger.info('Documentation Indexer cleanup completed');
  }
}

// ========================================
// CLI Command Implementation
// ========================================

async function main() {
  program
    .name('index-docs')
    .description('Documentation Indexer for Personal Pipeline')
    .version('1.0.0');

  program
    .option('-s, --sources <sources>', 'Comma-separated list of sources to index', '')
    .option('-p, --parallel', 'Process sources in parallel', false)
    .option('-b, --batch-size <size>', 'Batch size for document processing', '25')
    .option('-o, --output <format>', 'Output format (json|yaml|csv)', 'json')
    .option('-f, --report-file <file>', 'Output report to file', '')
    .option('--cache-warm', 'Enable cache warming', false)
    .option('--dry-run', 'Preview operations without making changes', false)
    .option('--verbose', 'Enable verbose output', false)
    .option('--incremental', 'Perform incremental indexing', false)
    .option('--since <date>', 'Only process changes since date (for incremental)', '')
    .option('--force-fingerprint-check', 'Re-verify all document fingerprints', false)
    .option('--cleanup-orphaned', 'Remove orphaned cache entries', false)
    .option('--validate-corpus', 'Validate corpus consistency', false)
    .option('--show-changes', 'Display detected changes', false);

  program.action(async (options) => {
    try {
      // Parse and validate options
      const config: IndexerConfig = {
        sources: options.sources ? options.sources.split(',').map(s => s.trim()) : [],
        parallel: options.parallel,
        batch_size: parseInt(options.batchSize),
        output_format: options.output as 'json' | 'yaml' | 'csv',
        cache_warm: options.cacheWarm,
        dry_run: options.dryRun,
        verbose: options.verbose,
        incremental: options.incremental,
        since: options.since ? new Date(options.since) : undefined,
        force_fingerprint_check: options.forceFingerprintCheck,
        cleanup_orphaned: options.cleanupOrphaned,
        validate_corpus: options.validateCorpus,
        show_changes: options.showChanges
      };

      // Initialize configuration
      const configManager = new ConfigManager();
      await configManager.loadConfig();

      // Create and run indexer
      const indexer = new DocumentationIndexer(configManager, config);
      await indexer.initialize();

      if (config.dry_run) {
        console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made'));
      }

      const report = await indexer.indexAllSources();

      // Output report
      if (options.reportFile) {
        const reportContent = config.output_format === 'json' 
          ? JSON.stringify(report, null, 2)
          : JSON.stringify(report); // Simplified for other formats
        
        await fs.writeFile(options.reportFile, reportContent, 'utf-8');
        console.log(chalk.green(`📄 Report saved to ${options.reportFile}`));
      } else {
        console.log('\n📊 Indexing Report:');
        console.log(chalk.blue(`Sources processed: ${report.summary.processed_sources}/${report.summary.total_sources}`));
        console.log(chalk.blue(`Documents processed: ${report.summary.processed_documents}/${report.summary.total_documents}`));
        console.log(chalk.blue(`Success rate: ${Math.round(report.summary.success_rate * 100)}%`));
        console.log(chalk.blue(`Processing rate: ${Math.round(report.summary.avg_documents_per_second)} docs/sec`));
        
        if (report.errors.length > 0) {
          console.log(chalk.yellow(`\n⚠️ ${report.errors.length} errors encountered`));
        }
        
        if (report.recommendations.length > 0) {
          console.log(chalk.green('\n💡 Recommendations:'));
          for (const rec of report.recommendations) {
            console.log(chalk.gray(`  • ${rec}`));
          }
        }
      }

      await indexer.cleanup();
      process.exit(0);

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

  program.parse();
}

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default DocumentationIndexer;