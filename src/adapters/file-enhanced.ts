/**
 * Enhanced File System Source Adapter
 *
 * Phase 2 implementation with advanced capabilities:
 * - Recursive directory scanning with configurable depth
 * - Advanced file type detection with MIME types
 * - PDF text extraction for full-text search
 * - Multiple root directories support
 * - File pattern matching (include/exclude)
 * - Enhanced metadata extraction
 * - File system watching for real-time updates
 *
 * Authored by: Integration Specialist (Barry)
 * Date: 2025-08-01
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { glob } from 'glob';
import { fileTypeFromFile } from 'file-type';
import * as chokidar from 'chokidar';
// Dynamic import for pdf-parse to avoid test file loading issue
let pdf: any;
import Fuse from 'fuse.js';
import { SourceAdapter } from './base.js';
import {
  SourceConfig,
  SearchResult,
  SearchFilters,
  HealthCheck,
  Runbook,
  ConfidenceScore,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// Enhanced configuration interface for FileSystem adapter
interface FileSystemConfig extends SourceConfig {
  type: 'file';
  base_paths?: string[]; // Multiple root directories
  recursive?: boolean; // Enable recursive scanning
  max_depth?: number; // Maximum recursion depth
  file_patterns?: {
    include?: string[]; // Glob patterns to include
    exclude?: string[]; // Glob patterns to exclude
  };
  supported_extensions?: string[]; // File extensions to process
  extract_metadata?: boolean; // Enable metadata extraction
  pdf_extraction?: boolean; // Enable PDF text extraction
  watch_changes?: boolean; // File system watching
}

interface EnhancedFileDocument {
  id: string;
  path: string;
  relativePath: string;
  name: string;
  content: string;
  searchableContent?: string;
  lastModified: Date;
  size: number;
  type: string;
  mimeType: string | undefined;
  metadata: {
    extension: string;
    depth: number;
    directory: string;
    author?: string;
    created?: Date;
    modified?: Date;
    tags?: string[];
  };
}

export class EnhancedFileSystemAdapter extends SourceAdapter {
  private documents: Map<string, EnhancedFileDocument> = new Map();
  private searchIndex: Fuse<EnhancedFileDocument> | null = null;
  private basePaths: string[];
  private supportedExtensions: string[];
  private filePatterns: { include?: string[]; exclude?: string[] };
  private recursive: boolean;
  private maxDepth: number;
  private extractMetadata: boolean;
  private pdfExtraction: boolean;
  private watchChanges: boolean;
  private watchers: chokidar.FSWatcher[] = [];
  private indexingInProgress = false;

  constructor(config: FileSystemConfig) {
    super(config);

    // Initialize configuration with defaults
    this.basePaths = config.base_paths || [config.base_url || './docs'];
    this.supportedExtensions = config.supported_extensions || [
      '.md',
      '.txt',
      '.json',
      '.yml',
      '.yaml',
      '.pdf',
      '.rst',
      '.adoc',
    ];
    this.filePatterns = config.file_patterns || {};
    this.recursive = config.recursive ?? true;
    this.maxDepth = config.max_depth ?? 10;
    this.extractMetadata = config.extract_metadata ?? true;
    this.pdfExtraction = config.pdf_extraction ?? true;
    this.watchChanges = config.watch_changes ?? false;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Enhanced FileSystemAdapter', {
        basePaths: this.basePaths,
        recursive: this.recursive,
        maxDepth: this.maxDepth,
        supportedExtensions: this.supportedExtensions,
      });

      // Verify all base directories exist
      for (const basePath of this.basePaths) {
        try {
          await fs.access(basePath);
        } catch (error) {
          throw new Error(`Base path does not exist: ${basePath}`);
        }
      }

      // Index all documents
      await this.refreshIndex(true);

      // Set up file watchers if enabled
      if (this.watchChanges) {
        await this.setupFileWatchers();
      }

      this.isInitialized = true;
      logger.info('Enhanced FileSystemAdapter initialized successfully', {
        documentCount: this.documents.size,
        watchersActive: this.watchers.length > 0,
      });
    } catch (error) {
      logger.error('Failed to initialize Enhanced FileSystemAdapter', { error });
      throw new Error(`Failed to initialize FileSystemAdapter: ${error}`);
    }
  }

  /**
   * Refresh the document index by scanning all base paths
   */
  async refreshIndex(force?: boolean): Promise<boolean> {
    const fullReindex = force ?? false;
    if (this.indexingInProgress) {
      logger.warn('Index refresh already in progress, skipping');
      return false;
    }

    this.indexingInProgress = true;
    const startTime = Date.now();

    try {
      logger.info('Starting index refresh', { fullReindex });

      if (fullReindex) {
        this.documents.clear();
      }

      // Index documents from all base paths
      for (const basePath of this.basePaths) {
        await this.indexDirectory(basePath, basePath, 0);
      }

      // Build search index
      this.buildSearchIndex();

      const duration = Date.now() - startTime;
      logger.info('Index refresh completed', {
        duration,
        documentCount: this.documents.size,
        fullReindex,
      });
      return true;
    } catch (error) {
      logger.error('Error during index refresh', { error });
      return false;
    } finally {
      this.indexingInProgress = false;
    }
  }

  /**
   * Recursively index a directory
   */
  private async indexDirectory(
    dirPath: string,
    basePath: string,
    currentDepth: number
  ): Promise<void> {
    if (!this.recursive && currentDepth > 0) {
      return;
    }

    if (currentDepth > this.maxDepth) {
      logger.debug('Max depth reached, skipping directory', { dirPath, currentDepth });
      return;
    }

    try {
      // Build glob patterns for this directory
      const patterns = this.buildGlobPatterns(dirPath);

      // Find matching files
      const files = await glob(patterns.include, {
        ignore: patterns.exclude,
        nodir: true,
        absolute: true,
      });

      // Process each file
      for (const filePath of files) {
        await this.indexFile(filePath, basePath);
      }

      // If recursive, process subdirectories
      if (this.recursive && currentDepth < this.maxDepth) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const subDirPath = path.join(dirPath, entry.name);
            await this.indexDirectory(subDirPath, basePath, currentDepth + 1);
          }
        }
      }
    } catch (error) {
      logger.error('Error indexing directory', { dirPath, error });
    }
  }

  /**
   * Build glob patterns for file matching
   */
  private buildGlobPatterns(dirPath: string): { include: string[]; exclude: string[] } {
    const include: string[] = [];
    const exclude: string[] = [];

    // Build include patterns
    if (this.filePatterns.include && this.filePatterns.include.length > 0) {
      include.push(...this.filePatterns.include.map(pattern => path.join(dirPath, pattern)));
    } else {
      // Default: include all supported extensions
      include.push(...this.supportedExtensions.map(ext => path.join(dirPath, `*${ext}`)));
    }

    // Build exclude patterns
    const defaultExcludes = [
      '**/.git/**',
      '**/node_modules/**',
      '**/.DS_Store',
      '**/dist/**',
      '**/build/**',
    ];

    exclude.push(...defaultExcludes);
    if (this.filePatterns.exclude) {
      exclude.push(...this.filePatterns.exclude);
    }

    return { include, exclude };
  }

  /**
   * Index a single file
   */
  private async indexFile(filePath: string, basePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);

      // Skip if file is too large (>10MB by default)
      const maxSize = 10 * 1024 * 1024;
      if (stats.size > maxSize) {
        logger.debug('Skipping large file', { filePath, size: stats.size });
        return;
      }

      // Detect file type
      const fileType = await this.detectFileType(filePath);

      // Skip unsupported file types
      if (!this.isSupported(filePath, fileType)) {
        return;
      }

      // Read and process content
      const content = await this.readFileContent(filePath, fileType);
      if (!content) {
        return;
      }

      // Extract metadata
      const metadata = await this.extractFileMetadata(filePath, stats, fileType);

      // Create document
      const id = this.generateDocumentId(filePath);
      const relativePath = path.relative(basePath, filePath);

      const document: EnhancedFileDocument = {
        id,
        path: filePath,
        relativePath,
        name: path.basename(filePath),
        content,
        searchableContent: this.extractSearchableContent(content, fileType),
        lastModified: stats.mtime,
        size: stats.size,
        type: path.extname(filePath),
        mimeType: fileType?.mime,
        metadata,
      };

      this.documents.set(id, document);
      logger.debug('Indexed file', {
        filePath: relativePath,
        size: stats.size,
        mimeType: fileType?.mime,
      });
    } catch (error) {
      logger.error('Error indexing file', { filePath, error });
    }
  }

  /**
   * Detect file type using magic bytes
   */
  private async detectFileType(
    filePath: string
  ): Promise<{ ext: string; mime: string } | undefined> {
    try {
      const fileType = await fileTypeFromFile(filePath);

      // If file-type returns a result, use it
      if (fileType) {
        return fileType;
      }

      // file-type returns undefined for text files, so fallback to extension-based detection
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.md': 'text/markdown',
        '.txt': 'text/plain',
        '.json': 'application/json',
        '.yml': 'text/yaml',
        '.yaml': 'text/yaml',
        '.pdf': 'application/pdf',
        '.rst': 'text/x-rst',
        '.adoc': 'text/asciidoc',
      };

      return {
        ext: ext.slice(1),
        mime: mimeMap[ext] || 'application/octet-stream',
      };
    } catch (error) {
      // If everything fails, fallback to extension-based detection
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.md': 'text/markdown',
        '.txt': 'text/plain',
        '.json': 'application/json',
        '.yml': 'text/yaml',
        '.yaml': 'text/yaml',
        '.pdf': 'application/pdf',
        '.rst': 'text/x-rst',
        '.adoc': 'text/asciidoc',
      };

      return {
        ext: ext.slice(1),
        mime: mimeMap[ext] || 'application/octet-stream',
      };
    }
  }

  /**
   * Check if file type is supported
   */
  private isSupported(filePath: string, fileType?: { ext: string; mime: string }): boolean {
    const ext = path.extname(filePath).toLowerCase();

    // Check by extension
    if (this.supportedExtensions.includes(ext)) {
      return true;
    }

    // Check by MIME type for PDF
    if (this.pdfExtraction && fileType?.mime === 'application/pdf') {
      return true;
    }

    return false;
  }

  /**
   * Read file content based on type
   */
  private async readFileContent(
    filePath: string,
    fileType?: { ext: string; mime: string }
  ): Promise<string | null> {
    try {
      // Handle PDF files
      if (this.pdfExtraction && fileType?.mime === 'application/pdf') {
        return await this.extractPdfText(filePath);
      }

      // Handle text files
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      logger.error('Error reading file content', { filePath, error });
      return null;
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractPdfText(filePath: string): Promise<string | null> {
    try {
      // Lazy load pdf-parse to avoid test file loading issue
      if (!pdf) {
        pdf = (await import('pdf-parse')).default;
      }
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      logger.error('Error extracting PDF text', { filePath, error });
      return null;
    }
  }

  /**
   * Extract searchable content from document
   */
  private extractSearchableContent(
    content: string,
    fileType?: { ext: string; mime: string }
  ): string {
    // For markdown, extract headings and important sections
    if (fileType?.ext === 'md' || fileType?.mime === 'text/markdown') {
      const headings = content.match(/^#+\s+.+$/gm) || [];
      const lists = content.match(/^[\*\-\+]\s+.+$/gm) || [];

      return [
        ...headings,
        ...lists,
        content.slice(0, 500), // First 500 chars
      ].join(' ');
    }

    // For JSON, extract keys and string values
    if (fileType?.mime === 'application/json') {
      try {
        const json = JSON.parse(content);
        return this.extractJsonSearchableContent(json);
      } catch {
        return content.slice(0, 1000);
      }
    }

    // Default: use first 1000 characters
    return content.slice(0, 1000);
  }

  /**
   * Extract searchable content from JSON
   */
  private extractJsonSearchableContent(obj: any, depth = 0): string {
    if (depth > 3) return '';

    const parts: string[] = [];

    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        parts.push(key);
        if (typeof value === 'string') {
          parts.push(value.slice(0, 100));
        } else if (typeof value === 'object') {
          parts.push(this.extractJsonSearchableContent(value, depth + 1));
        }
      }
    }

    return parts.join(' ');
  }

  /**
   * Extract file metadata
   */
  private async extractFileMetadata(
    filePath: string,
    stats: any,
    fileType?: { ext: string; mime: string }
  ): Promise<EnhancedFileDocument['metadata']> {
    const metadata: EnhancedFileDocument['metadata'] = {
      extension: path.extname(filePath),
      depth: filePath.split(path.sep).length - 1,
      directory: path.dirname(filePath),
      created: stats.birthtime,
      modified: stats.mtime,
    };

    if (this.extractMetadata) {
      // Extract additional metadata based on file type
      if (fileType?.ext === 'md' || fileType?.mime === 'text/markdown') {
        const content = await fs.readFile(filePath, 'utf-8');

        // Extract front matter if present
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontMatterMatch) {
          try {
            const { default: yaml } = await import('yaml');
            const frontMatter = yaml.parse(frontMatterMatch[1] || '');
            if (frontMatter.author) metadata.author = frontMatter.author;
            if (frontMatter.tags) metadata.tags = frontMatter.tags;
          } catch (error) {
            logger.debug('Error parsing front matter', { filePath, error });
          }
        }
      }
    }

    return metadata;
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(filePath: string): string {
    return createHash('sha256').update(filePath).digest('hex');
  }

  /**
   * Build search index using Fuse.js
   */
  private buildSearchIndex(): void {
    const documents = Array.from(this.documents.values());

    this.searchIndex = new Fuse(documents, {
      includeScore: true,
      threshold: 0.4,
      keys: [
        { name: 'name', weight: 0.3 },
        { name: 'searchableContent', weight: 0.5 },
        { name: 'content', weight: 0.2 },
        { name: 'metadata.tags', weight: 0.3 },
        { name: 'relativePath', weight: 0.1 },
      ],
      ignoreLocation: true,
      minMatchCharLength: 2,
    });

    logger.debug('Search index built', { documentCount: documents.length });
  }

  /**
   * Set up file system watchers
   */
  private async setupFileWatchers(): Promise<void> {
    if (!this.watchChanges) {
      return;
    }

    logger.info('Setting up file system watchers');

    for (const basePath of this.basePaths) {
      const watcher = chokidar.watch(basePath, {
        ignored: [
          /(^|[\/\\])\../, // Ignore dotfiles
          /node_modules/,
          /.git/,
          /dist/,
          /build/,
        ],
        persistent: true,
        ignoreInitial: true,
        depth: this.recursive ? this.maxDepth : 0,
      });

      watcher
        .on('add', filePath => this.handleFileAdd(filePath, basePath))
        .on('change', filePath => this.handleFileChange(filePath, basePath))
        .on('unlink', filePath => this.handleFileRemove(filePath))
        .on('error', error => logger.error('Watcher error', { error }));

      this.watchers.push(watcher);
    }

    logger.info('File system watchers set up', { watcherCount: this.watchers.length });
  }

  /**
   * Handle file addition
   */
  private async handleFileAdd(filePath: string, basePath: string): Promise<void> {
    logger.debug('File added', { filePath });
    await this.indexFile(filePath, basePath);
    this.buildSearchIndex();
  }

  /**
   * Handle file change
   */
  private async handleFileChange(filePath: string, basePath: string): Promise<void> {
    logger.debug('File changed', { filePath });

    // Re-index the file
    await this.indexFile(filePath, basePath);
    this.buildSearchIndex();
  }

  /**
   * Handle file removal
   */
  private handleFileRemove(filePath: string): void {
    logger.debug('File removed', { filePath });
    const id = this.generateDocumentId(filePath);

    if (this.documents.has(id)) {
      this.documents.delete(id);
      this.buildSearchIndex();
    }
  }

  /**
   * Search for documents
   */
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!this.searchIndex) {
      return [];
    }

    // Check category filters
    if (filters?.categories && filters.categories.length > 0) {
      const sourceCategories = this.config.categories || [];
      const hasMatchingCategory = filters.categories.some(category =>
        sourceCategories.includes(category)
      );

      if (!hasMatchingCategory) {
        return [];
      }
    }

    const searchOptions = {
      limit: 50, // Default limit
      includeScore: true,
    };

    let results = this.searchIndex.search(query, searchOptions);

    // If no fuzzy results, try exact substring matching
    if (results.length === 0) {
      const allDocuments = Array.from(this.documents.values());
      const exactMatches = allDocuments.filter(doc => {
        const searchContent = (doc.searchableContent || doc.content).toLowerCase();
        return searchContent.includes(query.toLowerCase());
      });

      results = exactMatches.map((doc, index) => ({
        item: doc,
        score: 0.1,
        refIndex: index,
      }));
    }

    // Apply confidence threshold filter
    if (filters?.confidence_threshold !== undefined) {
      const threshold = filters.confidence_threshold;
      results = results.filter(result => 1 - (result.score || 0) >= threshold);
    }

    // Transform to SearchResult format
    return results.map(result => this.transformToSearchResult(result));
  }

  /**
   * Transform Fuse result to SearchResult
   */
  private transformToSearchResult(fuseResult: any): SearchResult {
    const doc = fuseResult.item as EnhancedFileDocument;
    const confidence = 1 - (fuseResult.score || 0);

    return {
      id: doc.id,
      title: doc.name,
      content: doc.content,
      source: this.config.name,
      source_type: 'file' as const,
      url: `file://${doc.path}`,
      confidence_score: confidence as ConfidenceScore,
      last_updated: doc.lastModified.toISOString(),
      metadata: {
        file_path: doc.relativePath,
        file_type: doc.type,
        mime_type: doc.mimeType,
        last_modified: doc.lastModified.toISOString(),
        size: doc.size,
        ...doc.metadata,
      },
      match_reasons: this.generateMatchReasons(fuseResult),
      retrieval_time_ms: 0, // Will be set by the caller
    };
  }

  /**
   * Generate match reasons for a search result
   */
  private generateMatchReasons(fuseResult: any): string[] {
    const reasons: string[] = [];
    const matches = fuseResult.matches || [];

    for (const match of matches) {
      switch (match.key) {
        case 'name':
          reasons.push('Filename match');
          break;
        case 'searchableContent':
          reasons.push('Content keyword match');
          break;
        case 'metadata.tags':
          reasons.push('Tag match');
          break;
        case 'relativePath':
          reasons.push('Path match');
          break;
      }
    }

    if (reasons.length === 0) {
      reasons.push('General relevance');
    }

    return reasons;
  }

  /**
   * Get a specific document by ID
   */
  async getDocument(id: string): Promise<SearchResult | null> {
    const doc = this.documents.get(id);
    if (!doc) {
      return null;
    }

    return {
      id: doc.id,
      title: doc.name,
      content: doc.content,
      source: this.config.name,
      source_type: 'file' as const,
      url: `file://${doc.path}`,
      confidence_score: 1.0 as ConfidenceScore,
      last_updated: doc.lastModified.toISOString(),
      metadata: {
        file_path: doc.relativePath,
        file_type: doc.type,
        mime_type: doc.mimeType,
        last_modified: doc.lastModified.toISOString(),
        size: doc.size,
        ...doc.metadata,
      },
      match_reasons: ['Direct document retrieval'],
      retrieval_time_ms: 0,
    };
  }

  /**
   * Search for runbooks
   */
  async searchRunbooks(alertType: string, severity: string, systems: string[]): Promise<Runbook[]> {
    // Build search queries
    const queries = [
      alertType,
      `${alertType} ${severity}`,
      ...systems.map(system => `${system} ${alertType}`),
    ];

    const allResults: SearchResult[] = [];

    for (const query of queries) {
      const results = await this.search(query, { categories: ['runbooks'] });
      allResults.push(...results);
    }

    // Deduplicate results
    const uniqueResults = Array.from(
      new Map(allResults.map(result => [result.id, result])).values()
    );

    // Convert to runbooks
    const runbooks: Runbook[] = [];

    for (const result of uniqueResults) {
      try {
        // Try to parse JSON runbooks
        if (result.metadata?.mime_type === 'application/json') {
          const runbook = JSON.parse(result.content);
          if (this.isValidRunbook(runbook)) {
            runbooks.push(runbook);
          }
        } else {
          // Create synthetic runbook from markdown/text
          const syntheticRunbook = this.createSyntheticRunbook(result, alertType, severity);
          if (syntheticRunbook) {
            runbooks.push(syntheticRunbook);
          }
        }
      } catch (error) {
        logger.debug('Error processing runbook', { title: result.title, error });
      }
    }

    return runbooks;
  }

  /**
   * Validate runbook structure
   */
  private isValidRunbook(runbook: any): boolean {
    return (
      runbook &&
      typeof runbook.id === 'string' &&
      typeof runbook.title === 'string' &&
      Array.isArray(runbook.triggers) &&
      runbook.decision_tree &&
      Array.isArray(runbook.procedures)
    );
  }

  /**
   * Create synthetic runbook from text content
   */
  private createSyntheticRunbook(
    _result: SearchResult,
    _alertType: string,
    _severity: string
  ): Runbook | null {
    // Implementation would create a runbook structure from markdown/text content
    // This is a placeholder that returns null for now
    return null;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // Check all base paths
      for (const basePath of this.basePaths) {
        try {
          await fs.access(basePath);
        } catch (error) {
          issues.push(`Base path inaccessible: ${basePath}`);
        }
      }

      // Check document count
      if (this.documents.size === 0) {
        issues.push('No documents indexed');
      }

      // Check search index
      if (!this.searchIndex) {
        issues.push('Search index not built');
      }

      // Check watchers if enabled
      if (this.watchChanges && this.watchers.length === 0) {
        issues.push('File watchers not active');
      }

      return {
        source_name: this.config.name,
        healthy: issues.length === 0,
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: issues.length > 0 ? issues.join('; ') : undefined,
        metadata: {
          document_count: this.documents.size,
          base_paths: this.basePaths,
          watchers_active: this.watchers.length,
          index_health: this.searchIndex ? 'healthy' : 'not built',
        },
      };
    } catch (error) {
      return {
        source_name: this.config.name,
        healthy: false,
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: `Health check failed: ${error}`,
      };
    }
  }

  /**
   * Get adapter metadata
   */
  async getMetadata(): Promise<{
    name: string;
    type: string;
    documentCount: number;
    lastIndexed: string;
    avgResponseTime: number;
    successRate: number;
  }> {
    return {
      name: this.config.name,
      type: 'file',
      documentCount: this.documents.size,
      lastIndexed: new Date().toISOString(),
      avgResponseTime: 50, // Typical file system response time
      successRate: 0.99, // High success rate for local files
    };
  }

  /**
   * Clean up resources
   */
  override async cleanup(): Promise<void> {
    logger.info('Cleaning up Enhanced FileSystemAdapter');

    // Close file watchers
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];

    // Clear documents and index
    this.documents.clear();
    this.searchIndex = null;

    this.isInitialized = false;
    logger.info('Enhanced FileSystemAdapter cleaned up');
  }
}
