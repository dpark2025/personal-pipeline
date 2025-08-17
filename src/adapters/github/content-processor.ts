/**
 * GitHub Content Processor - Advanced content processing and runbook detection
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Comprehensive content processing for GitHub repositories:
 * - GitHub-flavored Markdown processing
 * - Code documentation extraction
 * - Runbook and procedure detection
 * - Link resolution and asset handling
 * - Metadata extraction and enrichment
 * - Search result optimization
 */

import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { SearchResult } from '../../types/index.js';
import { GitHubContent, GitHubRepository, GitHubIssue } from './api-client.js';
import { logger } from '../../utils/logger.js';

export interface ContentMetrics {
  totalFiles: number;
  processedFiles: number;
  markdownFiles: number;
  codeFiles: number;
  runbooksDetected: number;
  proceduresDetected: number;
  avgProcessingTime: number;
  errors: number;
}

export interface ExtractedContent {
  title: string;
  content: string;
  summary: string;
  metadata: Record<string, any>;
  links: Array<{
    text: string;
    url: string;
    type: 'internal' | 'external' | 'relative';
  }>;
  codeBlocks: Array<{
    language: string;
    code: string;
    startLine?: number;
  }>;
  headings: Array<{
    level: number;
    text: string;
    anchor: string;
  }>;
  runbookIndicators: {
    isRunbook: boolean;
    confidence: number;
    indicators: string[];
    procedures: Array<{
      title: string;
      steps: string[];
      section: string;
    }>;
  };
}

export interface ProcessingOptions {
  extractCodeBlocks?: boolean;
  resolveRelativeLinks?: boolean;
  detectRunbooks?: boolean;
  generateSummary?: boolean;
  maxContentLength?: number;
  includeMetadata?: boolean;
}

/**
 * Advanced content processor for GitHub documentation
 */
export class ContentProcessor {
  private turndownService: TurndownService;
  private metrics: ContentMetrics = {
    totalFiles: 0,
    processedFiles: 0,
    markdownFiles: 0,
    codeFiles: 0,
    runbooksDetected: 0,
    proceduresDetected: 0,
    avgProcessingTime: 0,
    errors: 0,
  };
  private totalProcessingTime = 0;

  // Runbook detection patterns
  private runbookPatterns = {
    titles: [
      /runbook/i,
      /playbook/i,
      /procedure/i,
      /incident[\s-]?response/i,
      /troubleshoot/i,
      /emergency[\s-]?response/i,
      /ops[\s-]?guide/i,
      /operations[\s-]?manual/i,
      /sop[\s-]?(standard[\s-]?operating[\s-]?procedure)?/i,
    ],
    content: [
      /step[\s-]?by[\s-]?step/i,
      /troubleshooting[\s-]?guide/i,
      /incident[\s-]?response/i,
      /escalation[\s-]?path/i,
      /recovery[\s-]?procedure/i,
      /emergency[\s-]?contact/i,
      /rollback[\s-]?procedure/i,
      /monitoring[\s-]?alert/i,
    ],
    structure: [
      /^##?\s*(steps?|procedures?|actions?)/i,
      /^##?\s*(troubleshooting|diagnosis)/i,
      /^##?\s*(escalation|contacts?)/i,
      /^##?\s*(rollback|recovery)/i,
      /^##?\s*(prerequisites|requirements)/i,
    ],
  };

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });

    // Configure marked for GitHub-flavored markdown
    marked.setOptions({
      gfm: true,
      breaks: true,
      sanitize: false,
    });
  }

  /**
   * Process GitHub content and convert to SearchResult
   */
  async processContent(
    content: GitHubContent | GitHubContent[],
    repository: GitHubRepository,
    options: ProcessingOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = performance.now();
    
    try {
      this.metrics.totalFiles++;
      
      const contents = Array.isArray(content) ? content : [content];
      const results: SearchResult[] = [];

      for (const item of contents) {
        if (item.type === 'file' && item.content) {
          const result = await this.processFile(item, repository, options);
          if (result) {
            results.push(result);
          }
        } else if (item.type === 'dir') {
          // For directories, create a summary entry
          const result = await this.processDirectory(item, repository);
          if (result) {
            results.push(result);
          }
        }
      }

      this.updateMetrics(true, performance.now() - startTime);
      return results;

    } catch (error) {
      this.updateMetrics(false, performance.now() - startTime);
      logger.error('GitHub content processing failed', { error, repository: repository.full_name });
      return [];
    }
  }

  /**
   * Convert GitHub repository to SearchResult
   */
  async convertRepositoryToSearchResult(repository: GitHubRepository): Promise<SearchResult> {
    const startTime = performance.now();

    try {
      // Create a summary of the repository
      const description = repository.description || `${repository.name} repository`;
      const content = this.generateRepositoryContent(repository);
      
      const searchResult: SearchResult = {
        id: `github:repo:${repository.id}`,
        title: repository.full_name,
        content,
        summary: description,
        source_type: 'github',
        source_name: repository.owner.login,
        url: repository.html_url,
        confidence_score: 0.8,
        match_reasons: ['Repository match'],
        retrieval_time_ms: performance.now() - startTime,
        last_updated: repository.updated_at,
        metadata: {
          repository_id: repository.id,
          repository_name: repository.name,
          owner: repository.owner.login,
          owner_type: repository.owner.type,
          default_branch: repository.default_branch,
          language: repository.language,
          topics: repository.topics,
          size: repository.size,
          stars: repository.stargazers_count,
          watchers: repository.watchers_count,
          has_wiki: repository.has_wiki,
          has_pages: repository.has_pages,
          archived: repository.archived,
          private: repository.private,
        },
      };

      return searchResult;

    } catch (error) {
      logger.error('Failed to convert repository to SearchResult', { 
        error, 
        repository: repository.full_name 
      });
      throw error;
    }
  }

  /**
   * Convert GitHub issue to SearchResult
   */
  async convertIssueToSearchResult(
    issue: GitHubIssue,
    repository: GitHubRepository
  ): Promise<SearchResult> {
    const startTime = performance.now();

    try {
      const content = `# ${issue.title}\n\n${issue.body || ''}`;
      const processedContent = await this.processMarkdownContent(content);
      
      const searchResult: SearchResult = {
        id: `github:issue:${issue.id}`,
        title: issue.title,
        content: processedContent.content,
        summary: processedContent.summary,
        source_type: 'github',
        source_name: repository.full_name,
        url: issue.html_url,
        confidence_score: this.calculateIssueConfidence(issue),
        match_reasons: this.generateIssueMatchReasons(issue),
        retrieval_time_ms: performance.now() - startTime,
        last_updated: issue.updated_at,
        metadata: {
          type: 'issue',
          issue_number: issue.number,
          state: issue.state,
          labels: issue.labels.map(l => l.name),
          assignees: issue.assignees.map(a => a.login),
          milestone: issue.milestone?.title,
          repository_id: repository.id,
          repository_name: repository.full_name,
          created_at: issue.created_at,
          closed_at: issue.closed_at,
          runbook_indicators: processedContent.runbookIndicators,
        },
      };

      return searchResult;

    } catch (error) {
      logger.error('Failed to convert issue to SearchResult', { 
        error, 
        issue: issue.id,
        repository: repository.full_name 
      });
      throw error;
    }
  }

  /**
   * Extract runbook procedures from content
   */
  extractProcedures(content: string): Array<{
    title: string;
    steps: string[];
    section: string;
  }> {
    const procedures: Array<{ title: string; steps: string[]; section: string; }> = [];
    
    // Parse markdown into sections
    const sections = this.parseMarkdownSections(content);
    
    for (const section of sections) {
      if (this.isProcedureSection(section.title)) {
        const steps = this.extractStepsFromSection(section.content);
        if (steps.length > 0) {
          procedures.push({
            title: section.title,
            steps,
            section: section.title,
          });
        }
      }
    }

    return procedures;
  }

  /**
   * Get processing metrics
   */
  getMetrics(): ContentMetrics {
    return {
      ...this.metrics,
      avgProcessingTime: this.metrics.processedFiles > 0 
        ? this.totalProcessingTime / this.metrics.processedFiles 
        : 0,
    };
  }

  /**
   * Reset processing metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalFiles: 0,
      processedFiles: 0,
      markdownFiles: 0,
      codeFiles: 0,
      runbooksDetected: 0,
      proceduresDetected: 0,
      avgProcessingTime: 0,
      errors: 0,
    };
    this.totalProcessingTime = 0;
  }

  // Private methods

  private async processFile(
    file: GitHubContent,
    repository: GitHubRepository,
    options: ProcessingOptions
  ): Promise<SearchResult | null> {
    try {
      if (!file.content) {
        return null;
      }

      // Decode base64 content
      const decodedContent = Buffer.from(file.content, 'base64').toString('utf-8');
      
      // Determine file type and process accordingly
      const fileExtension = this.getFileExtension(file.name);
      let processedContent: ExtractedContent;

      if (this.isMarkdownFile(file.name)) {
        this.metrics.markdownFiles++;
        processedContent = await this.processMarkdownContent(decodedContent, options);
      } else if (this.isCodeFile(file.name)) {
        this.metrics.codeFiles++;
        processedContent = await this.processCodeFile(decodedContent, fileExtension, options);
      } else {
        processedContent = await this.processPlainTextFile(decodedContent, options);
      }

      // Update runbook metrics
      if (processedContent.runbookIndicators.isRunbook) {
        this.metrics.runbooksDetected++;
      }
      if (processedContent.runbookIndicators.procedures.length > 0) {
        this.metrics.proceduresDetected += processedContent.runbookIndicators.procedures.length;
      }

      // Create SearchResult
      const searchResult: SearchResult = {
        id: `github:file:${file.sha}`,
        title: file.name,
        content: processedContent.content,
        summary: processedContent.summary,
        source_type: 'github',
        source_name: repository.full_name,
        url: file.html_url,
        confidence_score: this.calculateFileConfidence(processedContent, file),
        match_reasons: this.generateFileMatchReasons(processedContent, file),
        retrieval_time_ms: 0, // Will be set by caller
        last_updated: repository.updated_at,
        metadata: {
          file_path: file.path,
          file_name: file.name,
          file_size: file.size,
          file_sha: file.sha,
          file_type: fileExtension,
          repository_id: repository.id,
          repository_name: repository.full_name,
          owner: repository.owner.login,
          ...processedContent.metadata,
          runbook_indicators: processedContent.runbookIndicators,
          links: processedContent.links,
          code_blocks: processedContent.codeBlocks,
          headings: processedContent.headings,
        },
      };

      this.metrics.processedFiles++;
      return searchResult;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to process GitHub file', { 
        error, 
        file: file.path,
        repository: repository.full_name 
      });
      return null;
    }
  }

  private async processDirectory(
    directory: GitHubContent,
    repository: GitHubRepository
  ): Promise<SearchResult | null> {
    try {
      const content = `Directory: ${directory.path}\n\nThis is a directory in the ${repository.full_name} repository.`;
      
      const searchResult: SearchResult = {
        id: `github:dir:${directory.sha}`,
        title: `${directory.name}/ (Directory)`,
        content,
        summary: `Directory: ${directory.path}`,
        source_type: 'github',
        source_name: repository.full_name,
        url: directory.html_url,
        confidence_score: 0.3,
        match_reasons: ['Directory match'],
        retrieval_time_ms: 0,
        last_updated: repository.updated_at,
        metadata: {
          type: 'directory',
          file_path: directory.path,
          file_name: directory.name,
          repository_id: repository.id,
          repository_name: repository.full_name,
          owner: repository.owner.login,
        },
      };

      return searchResult;

    } catch (error) {
      logger.error('Failed to process GitHub directory', { 
        error, 
        directory: directory.path,
        repository: repository.full_name 
      });
      return null;
    }
  }

  private async processMarkdownContent(
    content: string,
    options: ProcessingOptions = {}
  ): Promise<ExtractedContent> {
    // Parse markdown to HTML then extract structured data
    const html = marked(content);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract title
    const titleElement = document.querySelector('h1');
    const title = titleElement?.textContent?.trim() || 'Untitled';

    // Extract headings
    const headings = this.extractHeadings(document);

    // Extract links
    const links = this.extractLinks(document, options.resolveRelativeLinks);

    // Extract code blocks
    const codeBlocks = options.extractCodeBlocks ? this.extractCodeBlocks(content) : [];

    // Clean content for search
    const cleanContent = this.cleanMarkdownContent(content);

    // Generate summary
    const summary = options.generateSummary ? this.generateSummary(cleanContent) : '';

    // Detect runbook indicators
    const runbookIndicators = options.detectRunbooks ? this.detectRunbookIndicators(content) : {
      isRunbook: false,
      confidence: 0,
      indicators: [],
      procedures: [],
    };

    return {
      title,
      content: cleanContent,
      summary,
      metadata: {
        headingCount: headings.length,
        linkCount: links.length,
        codeBlockCount: codeBlocks.length,
        wordCount: cleanContent.split(/\s+/).length,
      },
      links,
      codeBlocks,
      headings,
      runbookIndicators,
    };
  }

  private async processCodeFile(
    content: string,
    language: string,
    options: ProcessingOptions = {}
  ): Promise<ExtractedContent> {
    // Extract comments and documentation
    const comments = this.extractComments(content, language);
    const docstrings = this.extractDocstrings(content, language);
    
    // Combine comments and docstrings for searchable content
    const searchableContent = [
      ...comments,
      ...docstrings,
      content, // Include raw code for code search
    ].join('\n\n');

    // Extract inline documentation
    const inlineDoc = this.extractInlineDocumentation(content, language);

    const title = `Code: ${language} file`;
    const summary = options.generateSummary ? this.generateSummary(searchableContent) : '';

    return {
      title,
      content: searchableContent,
      summary,
      metadata: {
        language,
        lineCount: content.split('\n').length,
        commentCount: comments.length,
        docstringCount: docstrings.length,
        inlineDocumentation: inlineDoc,
      },
      links: [],
      codeBlocks: [{
        language,
        code: content,
      }],
      headings: [],
      runbookIndicators: {
        isRunbook: false,
        confidence: 0,
        indicators: [],
        procedures: [],
      },
    };
  }

  private async processPlainTextFile(
    content: string,
    options: ProcessingOptions = {}
  ): Promise<ExtractedContent> {
    const title = 'Text file';
    const summary = options.generateSummary ? this.generateSummary(content) : '';
    
    // Detect runbook indicators even in plain text
    const runbookIndicators = options.detectRunbooks ? this.detectRunbookIndicators(content) : {
      isRunbook: false,
      confidence: 0,
      indicators: [],
      procedures: [],
    };

    return {
      title,
      content,
      summary,
      metadata: {
        wordCount: content.split(/\s+/).length,
        lineCount: content.split('\n').length,
      },
      links: [],
      codeBlocks: [],
      headings: [],
      runbookIndicators,
    };
  }

  private detectRunbookIndicators(content: string): {
    isRunbook: boolean;
    confidence: number;
    indicators: string[];
    procedures: Array<{
      title: string;
      steps: string[];
      section: string;
    }>;
  } {
    const indicators: string[] = [];
    let confidence = 0;

    // Check title patterns
    for (const pattern of this.runbookPatterns.titles) {
      if (pattern.test(content)) {
        indicators.push(`Title pattern: ${pattern.source}`);
        confidence += 0.3;
      }
    }

    // Check content patterns
    for (const pattern of this.runbookPatterns.content) {
      if (pattern.test(content)) {
        indicators.push(`Content pattern: ${pattern.source}`);
        confidence += 0.2;
      }
    }

    // Check structural patterns
    for (const pattern of this.runbookPatterns.structure) {
      if (pattern.test(content)) {
        indicators.push(`Structure pattern: ${pattern.source}`);
        confidence += 0.3;
      }
    }

    // Extract procedures
    const procedures = this.extractProcedures(content);

    // Boost confidence if procedures found
    if (procedures.length > 0) {
      confidence += 0.4;
      indicators.push(`${procedures.length} procedures detected`);
    }

    return {
      isRunbook: confidence > 0.5,
      confidence: Math.min(confidence, 1.0),
      indicators,
      procedures,
    };
  }

  private extractHeadings(document: Document): Array<{
    level: number;
    text: string;
    anchor: string;
  }> {
    const headings: Array<{ level: number; text: string; anchor: string; }> = [];
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headingElements.forEach(element => {
      const level = parseInt(element.tagName[1]);
      const text = element.textContent?.trim() || '';
      const anchor = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      headings.push({ level, text, anchor });
    });

    return headings;
  }

  private extractLinks(document: Document, resolveRelative = false): Array<{
    text: string;
    url: string;
    type: 'internal' | 'external' | 'relative';
  }> {
    const links: Array<{ text: string; url: string; type: 'internal' | 'external' | 'relative'; }> = [];
    const linkElements = document.querySelectorAll('a[href]');
    
    linkElements.forEach(element => {
      const text = element.textContent?.trim() || '';
      const href = element.getAttribute('href') || '';
      
      let type: 'internal' | 'external' | 'relative';
      if (href.startsWith('http://') || href.startsWith('https://')) {
        type = 'external';
      } else if (href.startsWith('#')) {
        type = 'internal';
      } else {
        type = 'relative';
      }
      
      links.push({ text, url: href, type });
    });

    return links;
  }

  private extractCodeBlocks(content: string): Array<{
    language: string;
    code: string;
    startLine?: number;
  }> {
    const codeBlocks: Array<{ language: string; code: string; startLine?: number; }> = [];
    const fencedCodeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = fencedCodeRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      codeBlocks.push({ language, code });
    }

    return codeBlocks;
  }

  private extractComments(content: string, language: string): string[] {
    const comments: string[] = [];
    
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
      case 'java':
      case 'c':
      case 'cpp':
      case 'csharp':
        // Single line comments
        const singleLineRegex = /\/\/\s*(.*)/g;
        let match;
        while ((match = singleLineRegex.exec(content)) !== null) {
          comments.push(match[1].trim());
        }
        
        // Multi-line comments
        const multiLineRegex = /\/\*\*([\s\S]*?)\*\//g;
        while ((match = multiLineRegex.exec(content)) !== null) {
          comments.push(match[1].trim());
        }
        break;
        
      case 'python':
      case 'shell':
      case 'bash':
        const pythonRegex = /#\s*(.*)/g;
        while ((match = pythonRegex.exec(content)) !== null) {
          comments.push(match[1].trim());
        }
        break;
    }

    return comments.filter(comment => comment.length > 0);
  }

  private extractDocstrings(content: string, language: string): string[] {
    const docstrings: string[] = [];
    
    if (language.toLowerCase() === 'python') {
      const docstringRegex = /"""([\s\S]*?)"""|'''([\s\S]*?)'''/g;
      let match;
      while ((match = docstringRegex.exec(content)) !== null) {
        const docstring = (match[1] || match[2]).trim();
        if (docstring) {
          docstrings.push(docstring);
        }
      }
    }

    return docstrings;
  }

  private extractInlineDocumentation(content: string, language: string): string[] {
    // Extract function/method signatures with their documentation
    const inlineDoc: string[] = [];
    
    // This would be expanded based on language-specific patterns
    switch (language.toLowerCase()) {
      case 'python':
        const pythonFuncRegex = /def\s+(\w+)\([^)]*\):/g;
        let match;
        while ((match = pythonFuncRegex.exec(content)) !== null) {
          inlineDoc.push(`Function: ${match[1]}`);
        }
        break;
    }

    return inlineDoc;
  }

  private parseMarkdownSections(content: string): Array<{
    title: string;
    content: string;
    level: number;
  }> {
    const sections: Array<{ title: string; content: string; level: number; }> = [];
    const lines = content.split('\n');
    let currentSection: { title: string; content: string; level: number; } | null = null;

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: headingMatch[2].trim(),
          content: '',
          level: headingMatch[1].length,
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private isProcedureSection(title: string): boolean {
    const procedurePatterns = [
      /steps?/i,
      /procedures?/i,
      /actions?/i,
      /instructions?/i,
      /process/i,
      /workflow/i,
    ];

    return procedurePatterns.some(pattern => pattern.test(title));
  }

  private extractStepsFromSection(content: string): string[] {
    const steps: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Numbered steps
      if (/^\d+\.\s+/.test(trimmedLine)) {
        steps.push(trimmedLine.replace(/^\d+\.\s+/, '').trim());
      }
      // Bullet points
      else if (/^[-*+]\s+/.test(trimmedLine)) {
        steps.push(trimmedLine.replace(/^[-*+]\s+/, '').trim());
      }
    }

    return steps.filter(step => step.length > 0);
  }

  private cleanMarkdownContent(content: string): string {
    // Remove markdown syntax for cleaner search
    return content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/[#*_~`]/g, '') // Remove markdown syntax
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private generateSummary(content: string, maxLength = 200): string {
    // Extract first meaningful paragraph
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const firstParagraph = paragraphs[0] || '';
    
    if (firstParagraph.length <= maxLength) {
      return firstParagraph;
    }

    // Truncate and add ellipsis
    const truncated = firstParagraph.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    return lastSpaceIndex > -1 
      ? truncated.substring(0, lastSpaceIndex) + '...'
      : truncated + '...';
  }

  private generateRepositoryContent(repository: GitHubRepository): string {
    const parts = [
      `Repository: ${repository.full_name}`,
      repository.description ? `Description: ${repository.description}` : '',
      `Language: ${repository.language || 'Mixed'}`,
      repository.topics.length > 0 ? `Topics: ${repository.topics.join(', ')}` : '',
      `Stars: ${repository.stargazers_count}`,
      `Size: ${repository.size} KB`,
      `Last updated: ${repository.updated_at}`,
    ];

    return parts.filter(part => part).join('\n');
  }

  private calculateFileConfidence(processed: ExtractedContent, file: GitHubContent): number {
    let confidence = 0.5; // Base confidence

    // Boost for runbooks
    if (processed.runbookIndicators.isRunbook) {
      confidence += processed.runbookIndicators.confidence * 0.4;
    }

    // Boost for documentation files
    if (this.isMarkdownFile(file.name) || this.isDocumentationFile(file.name)) {
      confidence += 0.2;
    }

    // Boost for README files
    if (file.name.toLowerCase().includes('readme')) {
      confidence += 0.3;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateIssueConfidence(issue: GitHubIssue): number {
    let confidence = 0.6; // Base confidence for issues

    // Boost for runbook-related labels
    const runbookLabels = issue.labels.filter(label =>
      /runbook|procedure|incident|troubleshoot/i.test(label.name)
    );
    confidence += runbookLabels.length * 0.2;

    // Boost for documentation labels
    const docLabels = issue.labels.filter(label =>
      /documentation|docs|guide/i.test(label.name)
    );
    confidence += docLabels.length * 0.1;

    return Math.min(confidence, 1.0);
  }

  private generateFileMatchReasons(processed: ExtractedContent, file: GitHubContent): string[] {
    const reasons: string[] = [];

    if (processed.runbookIndicators.isRunbook) {
      reasons.push(`Runbook detected (confidence: ${processed.runbookIndicators.confidence.toFixed(2)})`);
    }

    if (this.isMarkdownFile(file.name)) {
      reasons.push('Markdown documentation');
    }

    if (file.name.toLowerCase().includes('readme')) {
      reasons.push('README file');
    }

    if (processed.runbookIndicators.procedures.length > 0) {
      reasons.push(`${processed.runbookIndicators.procedures.length} procedures found`);
    }

    return reasons.length > 0 ? reasons : ['File content match'];
  }

  private generateIssueMatchReasons(issue: GitHubIssue): string[] {
    const reasons: string[] = [];

    if (issue.labels.some(label => /runbook|procedure/i.test(label.name))) {
      reasons.push('Runbook-related labels');
    }

    if (issue.labels.some(label => /documentation|docs/i.test(label.name))) {
      reasons.push('Documentation labels');
    }

    if (/runbook|procedure|incident/i.test(issue.title)) {
      reasons.push('Runbook-related title');
    }

    return reasons.length > 0 ? reasons : ['Issue content match'];
  }

  private isMarkdownFile(filename: string): boolean {
    return /\.(md|markdown)$/i.test(filename);
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = [
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'rb', 'php', 'scala', 'kt'
    ];
    const extension = this.getFileExtension(filename);
    return codeExtensions.includes(extension.toLowerCase());
  }

  private isDocumentationFile(filename: string): boolean {
    const docPatterns = [
      /readme/i,
      /changelog/i,
      /contributing/i,
      /license/i,
      /docs?\//i,
      /documentation/i,
    ];
    return docPatterns.some(pattern => pattern.test(filename));
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot + 1) : '';
  }

  private updateMetrics(success: boolean, processingTime: number): void {
    this.totalProcessingTime += processingTime;
    
    if (!success) {
      this.metrics.errors++;
    }
  }
}