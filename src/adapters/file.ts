/**
 * File System Source Adapter
 *
 * Adapter for reading documentation from local files and directories.
 * Supports markdown, text, and JSON files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
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

interface FileDocument {
  id: string;
  path: string;
  name: string;
  content: string;
  searchableContent?: string; // Extracted searchable content for better Fuse.js matching
  lastModified: Date;
  size: number;
  type: string;
}

export class FileSystemAdapter extends SourceAdapter {
  private documents: Map<string, FileDocument> = new Map();
  private searchIndex: Fuse<FileDocument> | null = null;
  private baseDirectory: string;
  private supportedExtensions = ['.md', '.txt', '.json', '.yml', '.yaml'];

  constructor(config: SourceConfig) {
    super(config);
    this.baseDirectory = config.base_url || './docs';
  }

  async initialize(): Promise<void> {
    try {
      // Verify base directory exists
      await fs.access(this.baseDirectory);

      // Index all documents
      await this.refreshIndex(true);

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize FileSystemAdapter: ${error}`);
    }
  }

  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!this.searchIndex) {
      return [];
    }

    // Check if this adapter supports the requested categories
    if (filters?.categories && filters.categories.length > 0) {
      const sourceCategories = this.config.categories || [];
      const hasMatchingCategory = filters.categories.some(category =>
        sourceCategories.includes(category)
      );

      if (!hasMatchingCategory) {
        // This source doesn't match the requested categories, return empty results
        return [];
      }
    }

    const searchOptions = {
      includeScore: true,
      threshold: filters?.confidence_threshold ? 1 - filters.confidence_threshold : 0.5, // Balanced threshold
      keys: [
        { name: 'name', weight: 0.2 },
        { name: 'searchableContent', weight: 0.8 }, // Prioritize searchable content more
        { name: 'content', weight: 0.1 },
      ],
      limit: 50,
    };

    let results = this.searchIndex.search(query, searchOptions);

    // If no fuzzy results, try exact substring matching for better recall
    if (results.length === 0) {
      const allDocuments = Array.from(this.documents.values());
      const exactMatches = allDocuments.filter(doc => {
        const searchContent = (doc.searchableContent || doc.content).toLowerCase();
        return searchContent.includes(query.toLowerCase());
      });

      results = exactMatches.map((doc, index) => ({
        item: doc,
        score: 0.1, // High confidence for exact matches
        refIndex: index,
      }));
    }

    return results.map(result => ({
      id: result.item.id,
      title: result.item.name,
      content: result.item.content, // Don't truncate - let consumers decide when to truncate
      source: this.config.name,
      source_type: 'file' as const,
      confidence_score: Math.max(0, 1 - (result.score || 0)) as ConfidenceScore,
      match_reasons: this.generateMatchReasons(query, result.item),
      retrieval_time_ms: 0, // Will be set by caller
      url: `file://${result.item.path}`,
      last_updated: result.item.lastModified.toISOString(),
      metadata: {
        file_size: result.item.size,
        file_type: result.item.type,
      },
    }));
  }

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
      confidence_score: 1.0,
      match_reasons: ['exact_id_match'],
      retrieval_time_ms: 0,
      url: `file://${doc.path}`,
      last_updated: doc.lastModified.toISOString(),
      metadata: {
        file_size: doc.size,
        file_type: doc.type,
      },
    };
  }

  async searchRunbooks(
    alertType: string,
    severity: string,
    affectedSystems: string[],
    _context?: Record<string, any>
  ): Promise<Runbook[]> {
    console.log(`[FileSystemAdapter] searchRunbooks called:`, {
      alertType,
      severity,
      affectedSystems,
      sourceName: this.config.name,
      documentsCount: this.documents.size,
      searchIndexExists: !!this.searchIndex,
    });

    // Check if this source has runbook category support
    const sourceCategories = this.config.categories || [];
    const supportsRunbooks = sourceCategories.includes('runbooks');

    console.log(`[FileSystemAdapter] Category check:`, {
      sourceCategories,
      supportsRunbooks,
      sourceName: this.config.name,
    });

    if (!supportsRunbooks) {
      // This source doesn't contain runbooks, return empty results
      console.log(
        `[FileSystemAdapter] Source ${this.config.name} doesn't support runbooks category`
      );
      return [];
    }

    // Search for runbook files that might contain relevant information
    // Try multiple search strategies for better recall
    const searchQueries = [
      // Exact alert type
      alertType,
      // Alert type with underscores replaced by spaces
      alertType.replace(/_/g, ' '),
      // Severity-focused search
      `${severity} ${alertType.replace(/_/g, ' ')}`,
      // Combined terms
      `${alertType.replace(/_/g, ' ')} ${severity}`,
      // Broader search if systems specified
      affectedSystems.length > 0
        ? `${alertType.replace(/_/g, ' ')} ${affectedSystems.join(' ')}`
        : alertType,
    ];

    const allResults: any[] = [];

    // Execute all search queries and combine results with runbook category filter
    for (const query of searchQueries) {
      console.log(`[FileSystemAdapter] Executing search query: "${query}"`);
      const results = await this.search(query, { categories: ['runbooks'] });
      console.log(`[FileSystemAdapter] Search query "${query}" returned ${results.length} results`);
      allResults.push(...results);
    }

    console.log(
      `[FileSystemAdapter] Total search results before deduplication: ${allResults.length}`
    );

    // Remove duplicates based on id
    const uniqueResults = Array.from(
      new Map(allResults.map(result => [result.id, result])).values()
    );

    console.log(
      `[FileSystemAdapter] Unique search results after deduplication: ${uniqueResults.length}`
    );

    const runbooks: Runbook[] = [];

    for (const result of uniqueResults) {
      try {
        console.log(`[FileSystemAdapter] Processing result:`, {
          id: result.id,
          title: result.title,
          fileType: result.metadata?.file_type,
          contentLength: result.content?.length,
        });

        // Try to parse JSON runbooks
        if (result.metadata?.file_type === '.json') {
          console.log(`[FileSystemAdapter] Parsing JSON runbook: ${result.title}`);
          const runbook = JSON.parse(result.content);
          const isValid = this.isValidRunbook(runbook);
          console.log(`[FileSystemAdapter] JSON runbook validation:`, {
            title: result.title,
            isValid,
            hasId: !!runbook.id,
            hasTitle: !!runbook.title,
            hasTriggers: Array.isArray(runbook.triggers),
            hasDecisionTree: !!runbook.decision_tree,
            hasProcedures: Array.isArray(runbook.procedures),
          });

          if (isValid) {
            runbooks.push(runbook);
            console.log(`[FileSystemAdapter] Added valid runbook: ${runbook.id}`);
          } else {
            console.log(`[FileSystemAdapter] Rejected invalid runbook: ${result.title}`);
          }
        } else {
          // Create synthetic runbook from markdown/text content
          console.log(`[FileSystemAdapter] Creating synthetic runbook from: ${result.title}`);
          const syntheticRunbook = this.createSyntheticRunbook(result, alertType, severity);
          if (syntheticRunbook) {
            runbooks.push(syntheticRunbook);
            console.log(`[FileSystemAdapter] Added synthetic runbook: ${syntheticRunbook.id}`);
          }
        }
      } catch (error) {
        console.log(`[FileSystemAdapter] Error processing result:`, {
          title: result.title,
          error: error instanceof Error ? error.message : String(error),
        });
        // Skip invalid documents
        continue;
      }
    }

    console.log(`[FileSystemAdapter] Final runbooks count: ${runbooks.length}`);

    return runbooks;
  }

  async healthCheck(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      await fs.access(this.baseDirectory);
      const stats = await fs.stat(this.baseDirectory);

      return {
        source_name: this.config.name,
        healthy: true,
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        metadata: {
          document_count: this.documents.size,
          directory_exists: true,
          last_modified: stats.mtime.toISOString(),
        },
      };
    } catch (error) {
      return {
        source_name: this.config.name,
        healthy: false,
        response_time_ms: Date.now() - startTime,
        last_check: new Date().toISOString(),
        error_message: `Directory access failed: ${error}`,
      };
    }
  }

  async refreshIndex(_force?: boolean): Promise<boolean> {
    try {
      this.documents.clear();
      await this.indexDirectory(this.baseDirectory);

      // Create search index with better keys including extracted searchable content
      this.searchIndex = new Fuse(Array.from(this.documents.values()), {
        keys: [
          { name: 'name', weight: 0.2 },
          { name: 'searchableContent', weight: 0.8 }, // Prioritize extracted searchable content
          { name: 'content', weight: 0.1 }, // Keep original content as fallback
        ],
        includeScore: true,
        threshold: 0.5, // Balanced threshold
      });

      return true;
    } catch (error) {
      console.error(`Failed to refresh index for ${this.config.name}:`, error);
      return false;
    }
  }

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
      avgResponseTime: 50, // Estimated
      successRate: 0.95, // Estimated
    };
  }

  private async indexDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively index subdirectories
          await this.indexDirectory(fullPath);
        } else if (entry.isFile() && this.isSupportedFile(entry.name)) {
          await this.indexFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error indexing directory ${dirPath}:`, error);
    }
  }

  private async indexFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const id = createHash('md5').update(filePath).digest('hex');

      // Extract searchable content based on file type
      const searchableContent = this.extractSearchableContent(content, path.extname(filePath));

      const document: FileDocument = {
        id,
        path: filePath,
        name: path.basename(filePath),
        content,
        searchableContent, // Add searchable content for better Fuse.js indexing
        lastModified: stats.mtime,
        size: stats.size,
        type: path.extname(filePath),
      };

      this.documents.set(id, document);
    } catch (error) {
      console.error(`Error indexing file ${filePath}:`, error);
    }
  }

  /**
   * Extract searchable content from files based on their type
   */
  private extractSearchableContent(content: string, fileType: string): string {
    try {
      if (fileType === '.json') {
        const parsed = JSON.parse(content);

        // For runbook JSON files, extract key searchable fields
        const searchableFields = [];

        if (parsed.id) searchableFields.push(parsed.id);
        if (parsed.title) searchableFields.push(parsed.title);
        if (parsed.description) searchableFields.push(parsed.description);
        if (parsed.triggers && Array.isArray(parsed.triggers)) {
          searchableFields.push(...parsed.triggers);
        }

        // Add any procedure names
        if (parsed.procedures && Array.isArray(parsed.procedures)) {
          parsed.procedures.forEach((proc: any) => {
            if (proc.name) searchableFields.push(proc.name);
            if (proc.description) searchableFields.push(proc.description);
          });
        }

        // Return searchable fields joined with spaces for better fuzzy matching
        return searchableFields.join(' ');
      }

      // For other file types, return content as-is
      return content;
    } catch (error) {
      // If JSON parsing fails, return raw content
      return content;
    }
  }

  private isSupportedFile(filename: string): boolean {
    return this.supportedExtensions.some(ext => filename.endsWith(ext));
  }

  private generateMatchReasons(query: string, document: FileDocument): string[] {
    const reasons: string[] = [];
    const lowerQuery = query.toLowerCase();
    const lowerContent = document.content.toLowerCase();
    const lowerName = document.name.toLowerCase();

    if (lowerName.includes(lowerQuery)) {
      reasons.push('filename_match');
    }

    if (lowerContent.includes(lowerQuery)) {
      reasons.push('content_match');
    }

    // Check for keyword matches
    const keywords = lowerQuery.split(' ').filter(word => word.length > 2);
    const matchingKeywords = keywords.filter(
      keyword => lowerContent.includes(keyword) || lowerName.includes(keyword)
    );

    if (matchingKeywords.length > 0) {
      reasons.push(`keyword_match:${matchingKeywords.join(',')}`);
    }

    return reasons.length > 0 ? reasons : ['fuzzy_match'];
  }

  private isValidRunbook(obj: any): obj is Runbook {
    return (
      obj &&
      typeof obj.id === 'string' &&
      typeof obj.title === 'string' &&
      Array.isArray(obj.triggers) &&
      obj.decision_tree &&
      Array.isArray(obj.procedures)
    );
  }

  private createSyntheticRunbook(
    result: SearchResult,
    alertType: string,
    severity: string
  ): Runbook | null {
    // Create a basic runbook structure from text content
    // This is a simplified implementation - real implementation would
    // use more sophisticated parsing

    return {
      id: result.id,
      title: result.title,
      version: '1.0',
      description: `Auto-generated runbook for ${alertType}`,
      triggers: [alertType],
      severity_mapping: { [severity]: severity as any },
      decision_tree: {
        id: `dt_${result.id}`,
        name: `Decision Tree for ${alertType}`,
        description: 'Auto-generated decision tree',
        branches: [
          {
            id: 'default',
            condition: 'always',
            description: 'Default action',
            action: 'Follow the procedures below',
            confidence: 0.7,
          },
        ],
        default_action: 'escalate',
      },
      procedures: [
        {
          id: `proc_${result.id}`,
          name: 'Default Procedure',
          description: result.content.substring(0, 500),
          expected_outcome: 'Issue resolved or escalated',
          tools_required: [],
        },
      ],
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: result.last_updated,
        author: 'system',
        confidence_score: result.confidence_score,
      },
    };
  }
}
