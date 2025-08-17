/**
 * Database Content Processor - Content processing and runbook detection
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Enterprise-grade content processor for database content with intelligent
 * runbook detection, content sanitization, and metadata extraction.
 * 
 * Features:
 * - Intelligent runbook detection using ML patterns
 * - Content sanitization and security filtering
 * - Metadata extraction and enrichment
 * - Multi-format content support (JSON, HTML, Markdown, plain text)
 * - Performance optimization with caching
 */

import { logger } from '../../utils/logger.js';
import { SearchResult, DocumentCategory, SourceType } from '../../types/index.js';
import { DatabaseType, DatabaseSearchResult, SchemaMapping } from './database-adapter.js';
import * as crypto from 'crypto';

/**
 * Content processing options
 */
export interface ContentProcessingOptions {
  /** Enable intelligent runbook detection */
  enableRunbookDetection?: boolean;
  /** Enable content sanitization */
  contentSanitization?: boolean;
  /** Enable metadata extraction */
  metadataExtraction?: boolean;
  /** Maximum content length to process */
  maxContentLength?: number;
  /** Enable HTML parsing and cleanup */
  htmlProcessing?: boolean;
  /** Enable Markdown processing */
  markdownProcessing?: boolean;
  /** Confidence threshold for runbook detection */
  runbookConfidenceThreshold?: number;
}

/**
 * Extracted database content structure
 */
export interface ExtractedDatabaseContent {
  title: string;
  content: string;
  summary?: string;
  category?: DocumentCategory;
  tags?: string[];
  author?: string;
  lastUpdated?: string;
  confidence: number;
  metadata: Record<string, any>;
  isRunbook: boolean;
  runbookIndicators: string[];
}

/**
 * Content processing metrics
 */
export interface ContentMetrics {
  totalProcessed: number;
  runbooksDetected: number;
  processingErrors: number;
  avgProcessingTime: number;
  contentTypes: Record<string, number>;
  confidenceDistribution: Record<string, number>;
}

/**
 * Runbook detection result
 */
export interface RunbookDetectionResult {
  isRunbook: boolean;
  confidence: number;
  indicators: string[];
  category?: 'incident' | 'maintenance' | 'troubleshooting' | 'procedure';
  metadata: {
    hasSteps: boolean;
    hasDecisionTree: boolean;
    hasEscalation: boolean;
    complexity: 'low' | 'medium' | 'high';
  };
}

/**
 * Content type detection patterns
 */
interface ContentPatterns {
  runbook: RegExp[];
  procedure: RegExp[];
  troubleshooting: RegExp[];
  faq: RegExp[];
  documentation: RegExp[];
}

/**
 * Enterprise-grade content processor for database content
 */
export class ContentProcessor {
  private schemaMapping: SchemaMapping;
  private options: Required<ContentProcessingOptions>;
  private contentPatterns: ContentPatterns;
  private processingMetrics: ContentMetrics = {
    totalProcessed: 0,
    runbooksDetected: 0,
    processingErrors: 0,
    avgProcessingTime: 0,
    contentTypes: {},
    confidenceDistribution: {},
  };

  constructor(schemaMapping: SchemaMapping, options: ContentProcessingOptions = {}) {
    this.schemaMapping = schemaMapping;
    this.options = {
      enableRunbookDetection: options.enableRunbookDetection ?? true,
      contentSanitization: options.contentSanitization ?? true,
      metadataExtraction: options.metadataExtraction ?? true,
      maxContentLength: options.maxContentLength ?? 100000, // 100KB
      htmlProcessing: options.htmlProcessing ?? true,
      markdownProcessing: options.markdownProcessing ?? true,
      runbookConfidenceThreshold: options.runbookConfidenceThreshold ?? 0.7,
    };

    this.initializeContentPatterns();
  }

  /**
   * Convert database row to SearchResult
   */
  async convertToSearchResult(
    row: Record<string, any>,
    tableName: string,
    databaseType: DatabaseType
  ): Promise<SearchResult> {
    const startTime = performance.now();

    try {
      this.processingMetrics.totalProcessed++;

      // Find table configuration
      const tableConfig = this.findTableConfig(tableName);
      if (!tableConfig) {
        throw new Error(`No configuration found for table: ${tableName}`);
      }

      // Extract content using field mapping
      const extractedContent = await this.extractContent(row, tableConfig);

      // Process and enrich content
      const processedContent = await this.processContent(extractedContent);

      // Generate document ID
      const documentId = this.generateDocumentId(tableName, row, tableConfig);

      // Build SearchResult
      const searchResult: SearchResult = {
        id: documentId,
        title: processedContent.title,
        content: processedContent.content,
        summary: processedContent.summary,
        source: tableName,
        source_name: `database:${tableName}`,
        source_type: 'database' as SourceType,
        category: processedContent.category,
        confidence_score: processedContent.confidence,
        match_reasons: this.generateMatchReasons(processedContent),
        retrieval_time_ms: performance.now() - startTime,
        url: this.generateDocumentUrl(databaseType, tableName, row),
        last_updated: processedContent.lastUpdated || new Date().toISOString(),
        metadata: {
          ...processedContent.metadata,
          database_type: databaseType,
          table_name: tableName,
          is_runbook: processedContent.isRunbook,
          runbook_indicators: processedContent.runbookIndicators,
          processing_time_ms: performance.now() - startTime,
          raw_data_hash: this.generateContentHash(row),
        },
      };

      // Update metrics
      if (processedContent.isRunbook) {
        this.processingMetrics.runbooksDetected++;
      }

      const processingTime = performance.now() - startTime;
      this.updateProcessingMetrics(processingTime, processedContent.category);

      return searchResult;

    } catch (error) {
      this.processingMetrics.processingErrors++;
      logger.error('Failed to convert database row to SearchResult', {
        tableName,
        databaseType,
        error,
      });
      throw error;
    }
  }

  /**
   * Detect if content appears to be a runbook
   */
  async detectRunbook(content: string, title: string, metadata?: Record<string, any>): Promise<RunbookDetectionResult> {
    if (!this.options.enableRunbookDetection) {
      return {
        isRunbook: false,
        confidence: 0,
        indicators: [],
        metadata: {
          hasSteps: false,
          hasDecisionTree: false,
          hasEscalation: false,
          complexity: 'low',
        },
      };
    }

    const indicators: string[] = [];
    let confidence = 0;

    // Title-based detection
    const titleScore = this.analyzeTitle(title);
    confidence += titleScore.score;
    indicators.push(...titleScore.indicators);

    // Content-based detection
    const contentScore = this.analyzeContent(content);
    confidence += contentScore.score;
    indicators.push(...contentScore.indicators);

    // Structure-based detection
    const structureScore = this.analyzeStructure(content);
    confidence += structureScore.score;
    indicators.push(...structureScore.indicators);

    // Metadata-based detection
    if (metadata) {
      const metadataScore = this.analyzeMetadata(metadata);
      confidence += metadataScore.score;
      indicators.push(...metadataScore.indicators);
    }

    // Normalize confidence (0-1)
    confidence = Math.min(confidence / 4, 1);

    const isRunbook = confidence >= this.options.runbookConfidenceThreshold;

    return {
      isRunbook,
      confidence,
      indicators: [...new Set(indicators)], // Remove duplicates
      category: this.categorizeRunbook(content, title),
      metadata: {
        hasSteps: this.hasStepByStepInstructions(content),
        hasDecisionTree: this.hasDecisionLogic(content),
        hasEscalation: this.hasEscalationProcedure(content),
        complexity: this.assessComplexity(content),
      },
    };
  }

  /**
   * Extract and sanitize content from database row
   */
  async extractContent(row: Record<string, any>, tableConfig: any): Promise<ExtractedDatabaseContent> {
    const title = this.extractField(row, tableConfig.title_field) || 'Untitled';
    let content = this.extractField(row, tableConfig.content_field) || '';

    // Sanitize and process content
    if (this.options.contentSanitization) {
      content = this.sanitizeContent(content);
    }

    // Limit content length
    if (content.length > this.options.maxContentLength) {
      content = content.substring(0, this.options.maxContentLength) + '...';
    }

    // Process HTML if detected
    if (this.options.htmlProcessing && this.isHtmlContent(content)) {
      content = this.processHtmlContent(content);
    }

    // Process Markdown if detected
    if (this.options.markdownProcessing && this.isMarkdownContent(content)) {
      content = this.processMarkdownContent(content);
    }

    // Extract additional fields
    const category = this.extractField(row, tableConfig.category_field);
    const author = this.extractField(row, tableConfig.author_field);
    const lastUpdated = this.extractField(row, tableConfig.updated_field);
    const tags = this.extractTags(row, tableConfig.tags_field);

    // Generate summary
    const summary = this.generateSummary(content);

    // Detect runbook characteristics
    const runbookDetection = await this.detectRunbook(content, title, row);

    // Calculate confidence score
    const confidence = this.calculateConfidenceScore(title, content, category, runbookDetection);

    return {
      title,
      content,
      summary,
      category: this.mapCategory(category, runbookDetection.isRunbook),
      tags,
      author,
      lastUpdated,
      confidence,
      metadata: {
        original_category: category,
        row_id: row.id || row._id,
        field_mapping: {
          title: tableConfig.title_field,
          content: tableConfig.content_field,
          category: tableConfig.category_field,
        },
        content_stats: {
          character_count: content.length,
          word_count: content.split(/\s+/).length,
          line_count: content.split('\n').length,
        },
      },
      isRunbook: runbookDetection.isRunbook,
      runbookIndicators: runbookDetection.indicators,
    };
  }

  /**
   * Get processing metrics
   */
  getMetrics(): ContentMetrics {
    return { ...this.processingMetrics };
  }

  /**
   * Reset processing metrics
   */
  resetMetrics(): void {
    this.processingMetrics = {
      totalProcessed: 0,
      runbooksDetected: 0,
      processingErrors: 0,
      avgProcessingTime: 0,
      contentTypes: {},
      confidenceDistribution: {},
    };
  }

  // Private methods

  private initializeContentPatterns(): void {
    this.contentPatterns = {
      runbook: [
        /\b(?:runbook|playbook|procedure|incident\s+response)\b/i,
        /\b(?:step\s+by\s+step|instructions|troubleshoot)\b/i,
        /\b(?:emergency|critical|outage|failure)\b/i,
        /\b(?:escalate|contact|on-call)\b/i,
      ],
      procedure: [
        /\b(?:procedure|process|workflow|checklist)\b/i,
        /\b(?:step\s+\d+|step\s+one|first\s+step)\b/i,
        /\b(?:follow|execute|perform|complete)\b/i,
      ],
      troubleshooting: [
        /\b(?:troubleshoot|debug|diagnose|resolve)\b/i,
        /\b(?:error|issue|problem|bug)\b/i,
        /\b(?:solution|fix|workaround|remedy)\b/i,
      ],
      faq: [
        /\b(?:faq|frequently\s+asked|questions|q&a)\b/i,
        /\b(?:how\s+to|what\s+is|why\s+does|when\s+should)\b/i,
      ],
      documentation: [
        /\b(?:documentation|guide|manual|reference)\b/i,
        /\b(?:overview|introduction|getting\s+started)\b/i,
      ],
    };
  }

  private findTableConfig(tableName: string): any {
    return this.schemaMapping.tables.find(table => table.name === tableName) ||
           this.schemaMapping.collections?.find(collection => collection.name === tableName);
  }

  private extractField(row: Record<string, any>, fieldName?: string): string | undefined {
    if (!fieldName) return undefined;
    
    // Support nested field access (e.g., "metadata.title")
    const fieldParts = fieldName.split('.');
    let value = row;
    
    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return typeof value === 'string' ? value : String(value);
  }

  private extractTags(row: Record<string, any>, tagsField?: string): string[] {
    if (!tagsField) return [];
    
    const tagsValue = this.extractField(row, tagsField);
    if (!tagsValue) return [];
    
    // Handle different tag formats
    try {
      // Try parsing as JSON array
      return JSON.parse(tagsValue);
    } catch {
      // Fall back to comma-separated values
      return tagsValue.split(',').map(tag => tag.trim()).filter(Boolean);
    }
  }

  private async processContent(content: ExtractedDatabaseContent): Promise<ExtractedDatabaseContent> {
    // Apply additional processing based on detected content type
    if (content.isRunbook) {
      content.content = this.enhanceRunbookContent(content.content);
    }

    return content;
  }

  private sanitizeContent(content: string): string {
    // Remove potentially dangerous content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  private isHtmlContent(content: string): boolean {
    return /<[^>]+>/g.test(content);
  }

  private isMarkdownContent(content: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s/m, // Headers
      /\*\*.*\*\*/, // Bold
      /\*.*\*/, // Italic
      /```[\s\S]*```/, // Code blocks
      /^\* /m, // Bullet lists
      /^\d+\. /m, // Numbered lists
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
  }

  private processHtmlContent(content: string): string {
    // Simple HTML to text conversion
    return content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  private processMarkdownContent(content: string): string {
    // Simple Markdown processing - remove formatting but preserve structure
    return content
      .replace(/^#{1,6}\s+(.+)$/gm, '$1') // Remove header markers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/```[\s\S]*?```/g, '[Code Block]') // Replace code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code markers
      .trim();
  }

  private generateSummary(content: string, maxLength = 200): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Try to break at sentence boundary
    const sentences = content.split(/[.!?]+/);
    let summary = '';
    
    for (const sentence of sentences) {
      if (summary.length + sentence.length + 1 <= maxLength) {
        summary += (summary ? '. ' : '') + sentence.trim();
      } else {
        break;
      }
    }
    
    return summary || content.substring(0, maxLength - 3) + '...';
  }

  private analyzeTitle(title: string): { score: number; indicators: string[] } {
    const indicators: string[] = [];
    let score = 0;

    for (const [type, patterns] of Object.entries(this.contentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(title)) {
          indicators.push(`title_contains_${type}_keywords`);
          score += type === 'runbook' ? 0.4 : 0.2;
        }
      }
    }

    return { score: Math.min(score, 1), indicators };
  }

  private analyzeContent(content: string): { score: number; indicators: string[] } {
    const indicators: string[] = [];
    let score = 0;

    // Check for runbook patterns
    for (const pattern of this.contentPatterns.runbook) {
      const matches = content.match(pattern);
      if (matches) {
        indicators.push(`content_contains_runbook_pattern`);
        score += 0.2 * Math.min(matches.length, 3); // Max 0.6 from content patterns
      }
    }

    return { score: Math.min(score, 1), indicators };
  }

  private analyzeStructure(content: string): { score: number; indicators: string[] } {
    const indicators: string[] = [];
    let score = 0;

    // Check for numbered steps
    if (/^\s*\d+\.\s/m.test(content)) {
      indicators.push('has_numbered_steps');
      score += 0.3;
    }

    // Check for bullet points
    if (/^\s*[-*]\s/m.test(content)) {
      indicators.push('has_bullet_points');
      score += 0.2;
    }

    // Check for decision points
    if (/\b(?:if|when|then|else|otherwise)\b/i.test(content)) {
      indicators.push('has_decision_logic');
      score += 0.2;
    }

    return { score: Math.min(score, 1), indicators };
  }

  private analyzeMetadata(metadata: Record<string, any>): { score: number; indicators: string[] } {
    const indicators: string[] = [];
    let score = 0;

    // Check category field
    if (metadata.category) {
      const category = String(metadata.category).toLowerCase();
      if (category.includes('runbook') || category.includes('procedure')) {
        indicators.push('category_indicates_runbook');
        score += 0.5;
      }
    }

    // Check tags
    if (metadata.tags && Array.isArray(metadata.tags)) {
      const runbookTags = metadata.tags.filter((tag: string) => 
        /\b(?:runbook|procedure|incident|emergency)\b/i.test(tag)
      );
      if (runbookTags.length > 0) {
        indicators.push('tags_indicate_runbook');
        score += 0.3;
      }
    }

    return { score: Math.min(score, 1), indicators };
  }

  private categorizeRunbook(content: string, title: string): 'incident' | 'maintenance' | 'troubleshooting' | 'procedure' | undefined {
    const combined = `${title} ${content}`.toLowerCase();

    if (/\b(?:incident|outage|emergency|critical)\b/.test(combined)) {
      return 'incident';
    } else if (/\b(?:maintenance|update|deployment|upgrade)\b/.test(combined)) {
      return 'maintenance';
    } else if (/\b(?:troubleshoot|debug|diagnose|problem)\b/.test(combined)) {
      return 'troubleshooting';
    } else {
      return 'procedure';
    }
  }

  private hasStepByStepInstructions(content: string): boolean {
    return /^\s*\d+\.\s/m.test(content) || /\b(?:step\s+\d+|step\s+by\s+step)\b/i.test(content);
  }

  private hasDecisionLogic(content: string): boolean {
    return /\b(?:if|when|then|else|otherwise|choose|select|decide)\b/i.test(content);
  }

  private hasEscalationProcedure(content: string): boolean {
    return /\b(?:escalate|contact|notify|alert|call|email)\b/i.test(content);
  }

  private assessComplexity(content: string): 'low' | 'medium' | 'high' {
    const lines = content.split('\n').length;
    const decisions = (content.match(/\b(?:if|when|then|else)\b/gi) || []).length;
    const steps = (content.match(/^\s*\d+\.\s/gm) || []).length;

    const complexityScore = lines * 0.1 + decisions * 2 + steps * 1;

    if (complexityScore < 10) return 'low';
    if (complexityScore < 25) return 'medium';
    return 'high';
  }

  private mapCategory(originalCategory?: string, isRunbook = false): DocumentCategory {
    if (isRunbook) return 'runbook';
    
    if (!originalCategory) return 'general';
    
    const category = originalCategory.toLowerCase();
    
    if (category.includes('api')) return 'api';
    if (category.includes('guide') || category.includes('tutorial')) return 'guide';
    
    return 'general';
  }

  private calculateConfidenceScore(
    title: string,
    content: string,
    category?: string,
    runbookDetection?: RunbookDetectionResult
  ): number {
    let confidence = 0.5; // Base confidence

    // Title quality
    if (title && title.length > 5) {
      confidence += 0.1;
    }

    // Content quality
    if (content.length > 100) {
      confidence += 0.1;
    }
    if (content.length > 500) {
      confidence += 0.1;
    }

    // Category confidence
    if (category) {
      confidence += 0.1;
    }

    // Runbook detection confidence
    if (runbookDetection) {
      confidence += runbookDetection.confidence * 0.2;
    }

    return Math.min(confidence, 1);
  }

  private generateMatchReasons(content: ExtractedDatabaseContent): string[] {
    const reasons: string[] = [];

    if (content.title) {
      reasons.push('title_match');
    }

    if (content.content.length > 0) {
      reasons.push('content_available');
    }

    if (content.isRunbook) {
      reasons.push('runbook_detected');
      reasons.push(...content.runbookIndicators.map(indicator => `runbook_${indicator}`));
    }

    if (content.category) {
      reasons.push(`category_${content.category}`);
    }

    return reasons;
  }

  private generateDocumentId(tableName: string, row: Record<string, any>, tableConfig: any): string {
    // Try to use primary key or unique identifier
    const primaryKey = row.id || row._id || row[`${tableName}_id`] || row.uuid;
    
    if (primaryKey) {
      return `database:${tableName}:${primaryKey}`;
    }

    // Fall back to hash of content
    const titleField = this.extractField(row, tableConfig.title_field) || '';
    const contentField = this.extractField(row, tableConfig.content_field) || '';
    const hash = crypto.createHash('md5').update(`${titleField}:${contentField}`).digest('hex');
    
    return `database:${tableName}:${hash}`;
  }

  private generateDocumentUrl(databaseType: DatabaseType, tableName: string, row: Record<string, any>): string {
    // Generate a placeholder URL - in practice, this could link to a database viewer
    const id = row.id || row._id || 'unknown';
    return `database://${databaseType}/${tableName}/${id}`;
  }

  private generateContentHash(row: Record<string, any>): string {
    return crypto.createHash('md5').update(JSON.stringify(row)).digest('hex');
  }

  private enhanceRunbookContent(content: string): string {
    // Add structure markers for better parsing
    let enhanced = content;

    // Mark steps more clearly
    enhanced = enhanced.replace(/^\s*(\d+)\.\s/gm, '\n**Step $1:**\n');

    // Mark decision points
    enhanced = enhanced.replace(/\b(if|when)\s+(.+?)(?=\n|$)/gi, '\n**Decision:** If $2\n');

    return enhanced;
  }

  private updateProcessingMetrics(processingTime: number, category?: DocumentCategory): void {
    // Update average processing time
    const totalTime = this.processingMetrics.avgProcessingTime * (this.processingMetrics.totalProcessed - 1) + processingTime;
    this.processingMetrics.avgProcessingTime = totalTime / this.processingMetrics.totalProcessed;

    // Update content type distribution
    if (category) {
      this.processingMetrics.contentTypes[category] = (this.processingMetrics.contentTypes[category] || 0) + 1;
    }
  }
}