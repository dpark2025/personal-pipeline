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
import { SourceAdapter } from './base';
import {
  SourceConfig,
  SearchResult,
  SearchFilters,
  HealthCheck,
  Runbook,
  ConfidenceScore,
} from '../types';

interface FileDocument {
  id: string;
  path: string;
  name: string;
  content: string;
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

    const searchOptions = {
      includeScore: true,
      threshold: filters?.confidence_threshold ? 1 - filters.confidence_threshold : 0.4,
      keys: ['name', 'content'],
      limit: 50,
    };

    const results = this.searchIndex.search(query, searchOptions);

    return results.map(result => ({
      id: result.item.id,
      title: result.item.name,
      content: this.truncateContent(result.item.content),
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
    // Search for runbook files that might contain relevant information
    const runbookQuery = `runbook ${alertType} ${severity} ${affectedSystems.join(' ')}`;
    const searchResults = await this.search(runbookQuery);

    const runbooks: Runbook[] = [];

    for (const result of searchResults) {
      try {
        // Try to parse JSON runbooks
        if (result.metadata?.file_type === '.json') {
          const runbook = JSON.parse(result.content);
          if (this.isValidRunbook(runbook)) {
            runbooks.push(runbook);
          }
        } else {
          // Create synthetic runbook from markdown/text content
          const syntheticRunbook = this.createSyntheticRunbook(result, alertType, severity);
          if (syntheticRunbook) {
            runbooks.push(syntheticRunbook);
          }
        }
      } catch (error) {
        // Skip invalid documents
        continue;
      }
    }

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

      // Create search index
      this.searchIndex = new Fuse(Array.from(this.documents.values()), {
        keys: ['name', 'content'],
        includeScore: true,
        threshold: 0.4,
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

      const document: FileDocument = {
        id,
        path: filePath,
        name: path.basename(filePath),
        content,
        lastModified: stats.mtime,
        size: stats.size,
        type: path.extname(filePath),
      };

      this.documents.set(id, document);
    } catch (error) {
      console.error(`Error indexing file ${filePath}:`, error);
    }
  }

  private isSupportedFile(filename: string): boolean {
    return this.supportedExtensions.some(ext => filename.endsWith(ext));
  }

  private truncateContent(content: string, maxLength: number = 2000): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
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
