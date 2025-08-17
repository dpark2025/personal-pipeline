/**
 * Confluence Content Processor - Advanced content extraction and processing
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Sophisticated content processing system for Confluence pages:
 * - HTML storage format parsing and cleaning
 * - Rich content extraction (text, tables, images, links)
 * - Metadata enrichment and tagging
 * - Content normalization for search optimization
 * - Runbook structure detection and parsing
 * - Performance-optimized processing pipeline
 */

import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { SearchResult, DocumentCategory } from '../../types/index.js';
import { ConfluencePageContent } from './confluence-adapter.js';
import { logger } from '../../utils/logger.js';

export interface ContentMetrics {
  wordCount: number;
  readingTimeMinutes: number;
  complexity: 'low' | 'medium' | 'high';
  contentTypes: string[];
  hasStructuredData: boolean;
  hasCode: boolean;
  hasImages: boolean;
  hasTables: boolean;
  hasLinks: boolean;
}

export interface ExtractedContent {
  plainText: string;
  htmlContent: string;
  markdownContent: string;
  structuredData: any;
  metadata: ContentMetrics;
  runbookData?: any;
}

export interface ProcessingOptions {
  extractRunbookStructure?: boolean;
  includeMarkdown?: boolean;
  preserveFormatting?: boolean;
  extractMetadata?: boolean;
  maxContentLength?: number;
}

/**
 * Advanced content processor for Confluence pages
 */
export class ContentProcessor {
  private turndownService: TurndownService;
  private processingMetrics = {
    totalProcessed: 0,
    totalProcessingTime: 0,
    errorCount: 0,
    avgProcessingTime: 0,
  };

  constructor() {
    this.turndownService = this.initializeTurndownService();
  }

  /**
   * Convert Confluence page to SearchResult format
   */
  async convertToSearchResult(
    page: ConfluencePageContent,
    options: ProcessingOptions = {}
  ): Promise<SearchResult> {
    const startTime = performance.now();

    try {
      this.processingMetrics.totalProcessed++;

      const extractedContent = await this.extractContent(page, options);
      const category = this.categorizeContent(page, extractedContent);
      const confidenceScore = this.calculateConfidenceScore(page, extractedContent);

      const searchResult: SearchResult = {
        id: page.id,
        title: page.title,
        content: extractedContent.plainText,
        source: page._links.base + page._links.webui,
        source_name: `${page.space.name} (${page.space.key})`,
        source_type: 'confluence',
        category,
        confidence_score: confidenceScore,
        match_reasons: this.generateMatchReasons(page, extractedContent),
        retrieval_time_ms: performance.now() - startTime,
        url: page._links.base + page._links.webui,
        last_updated: page.version.when,
        metadata: {
          space_key: page.space.key,
          space_name: page.space.name,
          page_id: page.id,
          version: page.version.number,
          author: page.version.by.displayName,
          author_email: page.version.by.email,
          ancestors: page.ancestors?.map(a => ({ id: a.id, title: a.title })),
          labels: page.labels?.results?.map(l => l.name) || page.metadata?.labels?.results?.map(l => l.name) || [],
          content_metrics: extractedContent.metadata,
          html_content: options.preserveFormatting ? extractedContent.htmlContent : undefined,
          markdown_content: options.includeMarkdown ? extractedContent.markdownContent : undefined,
          structured_data: extractedContent.structuredData,
          runbook_data: extractedContent.runbookData,
        },
      };

      const processingTime = performance.now() - startTime;
      this.updateProcessingMetrics(processingTime);

      return searchResult;

    } catch (error) {
      this.processingMetrics.errorCount++;
      logger.error('Failed to convert Confluence page to SearchResult', {
        pageId: page.id,
        pageTitle: page.title,
        error,
      });

      // Return a basic SearchResult with error information
      return this.createErrorSearchResult(page, error);
    }
  }

  /**
   * Extract and process content from Confluence page
   */
  async extractContent(
    page: ConfluencePageContent,
    options: ProcessingOptions = {}
  ): Promise<ExtractedContent> {
    const defaultOptions: Required<ProcessingOptions> = {
      extractRunbookStructure: true,
      includeMarkdown: false,
      preserveFormatting: false,
      extractMetadata: true,
      maxContentLength: 100000, // 100KB limit
      ...options,
    };

    // Get HTML content from storage format
    const htmlContent = page.body?.storage?.value || '';
    
    if (!htmlContent) {
      return this.createEmptyContent();
    }

    // Load HTML into Cheerio for processing
    const $ = cheerio.load(htmlContent);

    // Extract plain text
    const plainText = this.extractPlainText($, defaultOptions.maxContentLength);

    // Convert to Markdown if requested
    const markdownContent = defaultOptions.includeMarkdown 
      ? this.convertToMarkdown(htmlContent)
      : '';

    // Extract structured data
    const structuredData = this.extractStructuredData($);

    // Extract metadata
    const metadata = defaultOptions.extractMetadata 
      ? this.extractContentMetrics($, plainText)
      : this.createDefaultMetrics();

    // Extract runbook structure if requested
    const runbookData = defaultOptions.extractRunbookStructure 
      ? this.extractRunbookStructure($, page)
      : undefined;

    return {
      plainText,
      htmlContent: defaultOptions.preserveFormatting ? htmlContent : '',
      markdownContent,
      structuredData,
      metadata,
      runbookData,
    };
  }

  /**
   * Get processing performance metrics
   */
  getMetrics() {
    return { ...this.processingMetrics };
  }

  /**
   * Reset processing metrics
   */
  resetMetrics(): void {
    this.processingMetrics = {
      totalProcessed: 0,
      totalProcessingTime: 0,
      errorCount: 0,
      avgProcessingTime: 0,
    };
  }

  // Private methods

  private initializeTurndownService(): TurndownService {
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
    });

    // Add custom rules for Confluence-specific elements
    turndownService.addRule('confluenceMacro', {
      filter: ['ac:structured-macro'],
      replacement: (content, node) => {
        const macroName = node.getAttribute('ac:name');
        return `\n<!-- Confluence Macro: ${macroName} -->\n${content}\n`;
      },
    });

    turndownService.addRule('confluenceStatus', {
      filter: ['ac:structured-macro[ac:name="status"]'],
      replacement: (content, node) => {
        const color = node.querySelector('ac:parameter[ac:name="colour"]')?.textContent;
        const title = node.querySelector('ac:parameter[ac:name="title"]')?.textContent;
        return `**Status:** ${title || 'Unknown'} ${color ? `(${color})` : ''}`;
      },
    });

    return turndownService;
  }

  private extractPlainText($: cheerio.CheerioAPI, maxLength: number): string {
    // Remove script and style elements
    $('script, style, .confluence-metadata').remove();
    
    // Extract text content
    let text = $.root().text().trim();
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/\n\s*\n/g, '\n');
    
    // Truncate if necessary
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return text;
  }

  private convertToMarkdown(htmlContent: string): string {
    try {
      return this.turndownService.turndown(htmlContent);
    } catch (error) {
      logger.warn('Failed to convert HTML to Markdown', { error });
      return '';
    }
  }

  private extractStructuredData($: cheerio.CheerioAPI): any {
    const structuredData: any = {
      headings: [],
      tables: [],
      lists: [],
      codeBlocks: [],
      macros: [],
      links: [],
      images: [],
    };

    // Extract headings
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const $el = $(element);
      structuredData.headings.push({
        level: parseInt(element.tagName.substring(1)),
        text: $el.text().trim(),
        id: $el.attr('id'),
      });
    });

    // Extract tables
    $('table').each((_, element) => {
      const $table = $(element);
      const headers: string[] = [];
      const rows: string[][] = [];

      $table.find('thead th, tr:first-child td').each((_, th) => {
        headers.push($(th).text().trim());
      });

      $table.find('tbody tr, tr:not(:first-child)').each((_, tr) => {
        const row: string[] = [];
        $(tr).find('td').each((_, td) => {
          row.push($(td).text().trim());
        });
        if (row.length > 0) {
          rows.push(row);
        }
      });

      if (headers.length > 0 || rows.length > 0) {
        structuredData.tables.push({ headers, rows });
      }
    });

    // Extract lists
    $('ul, ol').each((_, element) => {
      const $list = $(element);
      const items: string[] = [];
      
      $list.find('li').each((_, li) => {
        items.push($(li).text().trim());
      });

      if (items.length > 0) {
        structuredData.lists.push({
          type: element.tagName.toLowerCase(),
          items,
        });
      }
    });

    // Extract code blocks
    $('pre, code').each((_, element) => {
      const $code = $(element);
      const content = $code.text().trim();
      if (content) {
        structuredData.codeBlocks.push({
          content,
          language: $code.attr('class')?.match(/language-(\w+)/)?.[1],
        });
      }
    });

    // Extract Confluence macros
    $('ac\\:structured-macro').each((_, element) => {
      const $macro = $(element);
      const macroName = $macro.attr('ac:name');
      const parameters: Record<string, string> = {};

      $macro.find('ac\\:parameter').each((_, param) => {
        const $param = $(param);
        const name = $param.attr('ac:name');
        const value = $param.text();
        if (name) {
          parameters[name] = value;
        }
      });

      structuredData.macros.push({
        name: macroName,
        parameters,
      });
    });

    // Extract links
    $('a[href]').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (href && text) {
        structuredData.links.push({
          url: href,
          text,
          internal: href.startsWith('/') || href.includes(window?.location?.hostname || ''),
        });
      }
    });

    // Extract images
    $('img[src]').each((_, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      const alt = $img.attr('alt');
      const title = $img.attr('title');
      
      if (src) {
        structuredData.images.push({
          src,
          alt: alt || '',
          title: title || '',
        });
      }
    });

    return structuredData;
  }

  private extractContentMetrics($: cheerio.CheerioAPI, plainText: string): ContentMetrics {
    const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200); // Average reading speed
    
    // Determine complexity based on content features
    const hasCode = $('pre, code').length > 0;
    const hasImages = $('img').length > 0;
    const hasTables = $('table').length > 0;
    const hasLinks = $('a[href]').length > 0;
    const hasMacros = $('ac\\:structured-macro').length > 0;
    const hasStructuredData = hasTables || hasCode || hasMacros;
    
    const complexityFactors = [
      hasCode,
      hasImages,
      hasTables,
      hasMacros,
      wordCount > 2000,
      $('h1, h2, h3, h4, h5, h6').length > 10,
    ].filter(Boolean).length;
    
    let complexity: 'low' | 'medium' | 'high';
    if (complexityFactors <= 1) {
      complexity = 'low';
    } else if (complexityFactors <= 3) {
      complexity = 'medium';
    } else {
      complexity = 'high';
    }

    const contentTypes: string[] = [];
    if (hasCode) contentTypes.push('code');
    if (hasImages) contentTypes.push('images');
    if (hasTables) contentTypes.push('tables');
    if (hasLinks) contentTypes.push('links');
    if (hasMacros) contentTypes.push('macros');
    if (wordCount > 0) contentTypes.push('text');

    return {
      wordCount,
      readingTimeMinutes,
      complexity,
      contentTypes,
      hasStructuredData,
      hasCode,
      hasImages,
      hasTables,
      hasLinks,
    };
  }

  private extractRunbookStructure($: cheerio.CheerioAPI, page: ConfluencePageContent): any {
    // Check if this appears to be a runbook based on content patterns
    const title = page.title.toLowerCase();
    const content = $.root().text().toLowerCase();
    
    const runbookIndicators = [
      'runbook',
      'procedure',
      'incident',
      'troubleshoot',
      'escalation',
      'response',
      'playbook',
      'sop',
      'standard operating procedure',
    ];

    const isRunbook = runbookIndicators.some(indicator => 
      title.includes(indicator) || content.includes(indicator)
    );

    if (!isRunbook) {
      return null;
    }

    // Extract runbook structure
    const runbookData: any = {
      id: page.id,
      title: page.title,
      type: 'confluence_runbook',
      triggers: this.extractTriggers($),
      procedures: this.extractProcedures($),
      escalation: this.extractEscalation($),
      metadata: {
        space: page.space.key,
        created_at: page.version.when,
        author: page.version.by.displayName,
        version: page.version.number,
      },
    };

    return runbookData;
  }

  private extractTriggers($: cheerio.CheerioAPI): string[] {
    const triggers: string[] = [];
    
    // Look for trigger sections
    const triggerSections = [
      'triggers',
      'when to use',
      'applicable scenarios',
      'conditions',
      'alerts',
    ];

    triggerSections.forEach(sectionName => {
      $('h1, h2, h3, h4').each((_, element) => {
        const $heading = $(element);
        const headingText = $heading.text().toLowerCase();
        
        if (headingText.includes(sectionName)) {
          // Extract content from this section
          const sectionContent = this.extractSectionContent($, $heading);
          const extractedTriggers = this.parseTriggerContent(sectionContent);
          triggers.push(...extractedTriggers);
        }
      });
    });

    return [...new Set(triggers)]; // Remove duplicates
  }

  private extractProcedures($: cheerio.CheerioAPI): any[] {
    const procedures: any[] = [];
    
    // Look for procedure sections
    $('h1, h2, h3, h4').each((_, element) => {
      const $heading = $(element);
      const headingText = $heading.text().toLowerCase();
      
      const procedureIndicators = [
        'procedure',
        'steps',
        'solution',
        'resolution',
        'fix',
        'action',
      ];
      
      if (procedureIndicators.some(indicator => headingText.includes(indicator))) {
        const sectionContent = this.extractSectionContent($, $heading);
        const steps = this.parseStepsContent(sectionContent);
        
        if (steps.length > 0) {
          procedures.push({
            id: `proc_${procedures.length + 1}`,
            name: $heading.text().trim(),
            steps,
          });
        }
      }
    });

    return procedures;
  }

  private extractEscalation($: cheerio.CheerioAPI): any {
    // Look for escalation information
    const escalationSections = [
      'escalation',
      'contact',
      'support',
      'team',
      'owner',
    ];

    for (const sectionName of escalationSections) {
      const sectionElement = $('h1, h2, h3, h4').filter((_, element) => {
        return $(element).text().toLowerCase().includes(sectionName);
      }).first();

      if (sectionElement.length > 0) {
        const sectionContent = this.extractSectionContent($, sectionElement);
        return this.parseEscalationContent(sectionContent);
      }
    }

    return null;
  }

  private extractSectionContent($: cheerio.CheerioAPI, $heading: cheerio.Cheerio<cheerio.Element>): string {
    const sectionElements: cheerio.Element[] = [];
    let currentElement = $heading[0].nextSibling;
    
    while (currentElement) {
      const $current = $(currentElement);
      
      // Stop if we hit another heading of the same or higher level
      if (currentElement.nodeType === 1) { // Element node
        const tagName = currentElement.tagName;
        if (tagName && /^h[1-6]$/i.test(tagName)) {
          const currentLevel = parseInt(tagName.substring(1));
          const headingLevel = parseInt($heading[0].tagName.substring(1));
          
          if (currentLevel <= headingLevel) {
            break;
          }
        }
        
        sectionElements.push(currentElement);
      }
      
      currentElement = currentElement.nextSibling;
    }
    
    return $(sectionElements).text();
  }

  private parseTriggerContent(content: string): string[] {
    const triggers: string[] = [];
    
    // Look for bullet points or numbered lists
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      // Remove list markers
      const cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      
      if (cleaned.length > 10) { // Filter out very short items
        triggers.push(cleaned);
      }
    }
    
    return triggers;
  }

  private parseStepsContent(content: string): any[] {
    const steps: any[] = [];
    
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let stepNumber = 1;
    for (const line of lines) {
      const cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      
      if (cleaned.length > 5) {
        steps.push({
          id: `step_${stepNumber}`,
          description: cleaned,
          order: stepNumber,
        });
        stepNumber++;
      }
    }
    
    return steps;
  }

  private parseEscalationContent(content: string): any {
    // Simple escalation parsing - in practice, this would be more sophisticated
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailRegex) || [];
    
    return {
      contacts: emails,
      instructions: content.trim(),
    };
  }

  private categorizeContent(page: ConfluencePageContent, content: ExtractedContent): DocumentCategory {
    const title = page.title.toLowerCase();
    const text = content.plainText.toLowerCase();
    
    // Check for runbook indicators
    const runbookIndicators = ['runbook', 'procedure', 'incident', 'troubleshoot', 'sop'];
    if (runbookIndicators.some(indicator => title.includes(indicator) || text.includes(indicator))) {
      return 'runbook';
    }
    
    // Check for API documentation
    const apiIndicators = ['api', 'endpoint', 'rest', 'graphql', 'swagger', 'openapi'];
    if (apiIndicators.some(indicator => title.includes(indicator) || text.includes(indicator))) {
      return 'api';
    }
    
    // Check for guide/tutorial
    const guideIndicators = ['guide', 'tutorial', 'how to', 'getting started', 'setup', 'installation'];
    if (guideIndicators.some(indicator => title.includes(indicator) || text.includes(indicator))) {
      return 'guide';
    }
    
    return 'general';
  }

  private calculateConfidenceScore(page: ConfluencePageContent, content: ExtractedContent): number {
    let score = 0.8; // Base confidence for Confluence content
    
    // Boost confidence based on content quality
    if (content.metadata.wordCount > 100) score += 0.05;
    if (content.metadata.wordCount > 500) score += 0.05;
    if (content.metadata.hasStructuredData) score += 0.05;
    if (page.version.number > 1) score += 0.02; // Has been updated
    
    // Reduce confidence for very short content
    if (content.metadata.wordCount < 50) score -= 0.1;
    
    return Math.min(1.0, Math.max(0.1, score));
  }

  private generateMatchReasons(page: ConfluencePageContent, content: ExtractedContent): string[] {
    const reasons: string[] = ['Confluence page content'];
    
    if (content.metadata.wordCount > 500) {
      reasons.push('Comprehensive content');
    }
    
    if (content.metadata.hasStructuredData) {
      reasons.push('Contains structured data');
    }
    
    if (page.version.number > 1) {
      reasons.push('Recently updated');
    }
    
    if (content.metadata.hasCode) {
      reasons.push('Contains code examples');
    }
    
    if (content.metadata.hasTables) {
      reasons.push('Contains tabular data');
    }
    
    return reasons;
  }

  private createEmptyContent(): ExtractedContent {
    return {
      plainText: '',
      htmlContent: '',
      markdownContent: '',
      structuredData: {},
      metadata: this.createDefaultMetrics(),
    };
  }

  private createDefaultMetrics(): ContentMetrics {
    return {
      wordCount: 0,
      readingTimeMinutes: 0,
      complexity: 'low',
      contentTypes: [],
      hasStructuredData: false,
      hasCode: false,
      hasImages: false,
      hasTables: false,
      hasLinks: false,
    };
  }

  private createErrorSearchResult(page: ConfluencePageContent, error: any): SearchResult {
    return {
      id: page.id,
      title: page.title,
      content: `Error processing content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      source: page._links.base + page._links.webui,
      source_name: `${page.space.name} (${page.space.key})`,
      source_type: 'confluence',
      category: 'general',
      confidence_score: 0.1,
      match_reasons: ['Processing error'],
      retrieval_time_ms: 0,
      url: page._links.base + page._links.webui,
      last_updated: page.version.when,
      metadata: {
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }

  private updateProcessingMetrics(processingTime: number): void {
    this.processingMetrics.totalProcessingTime += processingTime;
    this.processingMetrics.avgProcessingTime = 
      this.processingMetrics.totalProcessingTime / this.processingMetrics.totalProcessed;
  }
}