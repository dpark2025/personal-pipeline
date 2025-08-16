# ⚠️ PLANNING DOCUMENTATION ARCHIVE STATUS ⚠️
## 🔒 **COMPLETED - NO LONGER REFERENCED FOR CURRENT PROJECT PLANS**
**Status**: MILESTONE/PLAN COMPLETE (2025)  
**Archive Date**: August 16, 2025  
**Reference**: Historical planning record only - do not use for current planning  

---


# Phase 2: Adapter Implementation Plans

## Overview

This document provides detailed technical specifications for implementing all 4 source adapters in Phase 2. Each adapter follows the `SourceAdapter` abstract class pattern established in Phase 1, ensuring consistent interfaces while supporting diverse source types.

**Team Leadership**:
- **Integration Specialist**: Barry Young (bear) - Enterprise system integrations and API design
- **Backend Lead**: Cindy Molin (cin) - System architecture and database integrations  
- **Security Lead**: Sanchez North (firepower) - Authentication frameworks and security compliance
- **Performance Lead**: Chan Choi (chacha) - Optimization and scale testing

## Adapter Implementation Framework

### Base SourceAdapter Interface
All adapters implement the following core interface:

```typescript
abstract class SourceAdapter {
  abstract name: string;
  abstract type: SourceType;
  
  // Core search methods (required for MCP tools)
  abstract search(query: string, filters?: SearchFilters): Promise<SearchResult[]>;
  abstract getDocument(id: string): Promise<Document>;
  abstract searchRunbooks(alertType: string, severity: string, systems: string[]): Promise<Runbook[]>;
  
  // Health and lifecycle management
  abstract healthCheck(): Promise<HealthStatus>;
  abstract configure(config: SourceConfig): Promise<void>;
  abstract authenticate(credentials: AuthCredentials): Promise<boolean>;
  abstract cleanup(): Promise<void>;
  
  // Metadata and performance
  abstract getMetadata(): SourceMetadata;
  abstract refreshIndex(): Promise<void>;
}
```

## Adapter 1: Enhanced FileSystemAdapter (Existing → Enhanced)

### Enhancement Scope
The existing FileSystemAdapter from Phase 1 receives significant enhancements for enterprise functionality.

### New Capabilities
- **Recursive Directory Scanning**: Configurable depth limits and pattern matching
- **Advanced File Type Detection**: MIME type detection, content sniffing
- **Metadata Extraction**: File statistics, last modified, author information  
- **PDF Text Extraction**: Full-text search within PDF documents
- **Binary File Handling**: Skip non-text files, log unsupported formats

### Enhanced Configuration
```typescript
interface FileSystemConfig extends SourceConfig {
  type: 'filesystem';
  base_paths: string[];                    // Multiple root directories
  recursive: boolean;                      // Enable recursive scanning
  max_depth?: number;                      // Maximum recursion depth
  file_patterns?: {
    include?: string[];                    // Glob patterns to include
    exclude?: string[];                    // Glob patterns to exclude  
  };
  supported_extensions?: string[];         // File extensions to process
  extract_metadata?: boolean;              // Enable metadata extraction
  pdf_extraction?: boolean;                // Enable PDF text extraction
  watch_changes?: boolean;                 // File system watching
}
```

### Implementation Priority
**Week 4, Day 1** - Foundation enhancement before new adapter implementation

## Adapter 2: GitHubAdapter

### Purpose & Integration  
Repository documentation integration supporting GitHub API v4 (GraphQL) and v3 (REST) for comprehensive repository content access.

### Technical Specification

#### Configuration Schema
```typescript
interface GitHubConfig extends SourceConfig {
  type: 'github';
  auth: {
    type: 'personal_token' | 'github_app';
    token_env: string;                     // PAT or installation token
    app_config?: GitHubAppConfig;          // GitHub App configuration
  };
  repositories?: string[];                 // Specific repos (owner/repo format)
  organizations?: string[];                // Organizations to scan
  include_private?: boolean;               // Include private repositories
  content_types?: {
    readme?: boolean;                      // Include README files
    wiki?: boolean;                        // Include wiki pages
    issues?: boolean;                      // Include issues and PRs
    code_docs?: boolean;                   // Include inline documentation
  };
  webhook_config?: {
    endpoint?: string;                     // Webhook endpoint for updates
    secret_env?: string;                   // Webhook secret
  };
}
```

#### Core Implementation
```typescript
export class GitHubAdapter extends SourceAdapter {
  name = 'github';
  type = 'code' as const;
  
  private octokit: Octokit;
  private repoCache: Map<string, Repository>;
  private contentCache: CacheService;
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Use GitHub Code Search API
    const searchQuery = this.buildGitHubQuery(query, filters);
    const results = await this.octokit.rest.search.code({ q: searchQuery });
    return this.transformCodeResults(results.data.items);
  }
  
  async searchRunbooks(alertType: string, severity: string, systems: string[]): Promise<Runbook[]> {
    // Search for operational files (runbooks, procedures, troubleshooting)
    const operationalQuery = `${alertType} ${severity} ${systems.join(' ')} extension:md path:ops path:runbooks path:docs`;
    const results = await this.search(operationalQuery);
    return this.extractRunbookContent(results);
  }
  
  private async indexRepository(owner: string, repo: string): Promise<void> {
    // Index README, wiki, and documentation files
    const contents = await this.octokit.rest.repos.getContent({ owner, repo, path: '' });
    await this.processRepositoryContents(contents.data, owner, repo);
  }
}
```

### Key Features
- **Repository Discovery**: Automatic repository detection in organizations
- **Branch Awareness**: Support for multiple branches and tags
- **Webhook Integration**: Real-time updates via GitHub webhooks
- **Content Type Filtering**: README, wiki, issues, inline documentation
- **Rate Limit Management**: Respect GitHub API rate limits (5000/hour authenticated)

### Performance Targets
- **Repository Content**: <300ms for indexed content
- **Live API Calls**: <1s for GitHub API responses
- **Webhook Processing**: <5s for real-time updates
- **Cache Strategy**: Repository-level caching with TTL

## Adapter 3: WebAdapter (Enhanced Web Scraping)

### Purpose & Integration
**Enhanced implementation incorporating all specifications from the original WebScraperAdapter plan**, providing comprehensive web crawling and content extraction capabilities.

### Technical Specification

#### Configuration Schema
```typescript
interface WebConfig extends SourceConfig {
  type: 'web';
  base_urls: string[];                     // Starting URLs for crawling
  max_depth: number;                       // Maximum recursion depth (default: 1)
  url_patterns?: {
    include?: string[];                    // Regex patterns to include
    exclude?: string[];                    // Regex patterns to exclude
  };
  rate_limit?: {
    requests_per_second?: number;          // Rate limit (default: 2)
    concurrent_requests?: number;          // Max concurrent (default: 3)
  };
  content_selectors?: {
    main?: string;                         // CSS selector for main content
    title?: string;                        // CSS selector for title
    exclude?: string[];                    // CSS selectors to exclude
  };
  auth?: {
    type: 'basic' | 'bearer' | 'cookie';
    credentials?: Record<string, string>;
  };
  cache_ttl?: string;                      // Cache duration (default: '1h')
  respect_robots_txt?: boolean;            // Default: true
  user_agent?: string;                     // Custom user agent
}
```

#### Core Implementation Architecture
```
WebAdapter
├── Crawler Engine
│   ├── URL Queue Manager
│   ├── Depth Tracker  
│   ├── Rate Limiter
│   └── Concurrent Request Pool
├── Content Processor
│   ├── HTML Parser (cheerio)
│   ├── Content Extractor
│   ├── Metadata Extractor
│   └── Link Extractor
├── Cache Layer
│   ├── URL Cache (visited URLs)
│   ├── Content Cache (extracted content)
│   └── Robots.txt Cache
└── Search Interface
    ├── Content Indexer
    ├── Fuzzy Search (fuse.js)
    └── Relevance Scoring
```

#### Enhanced Implementation
```typescript
export class WebAdapter extends SourceAdapter {
  name = 'web';
  type = 'web' as const;
  
  private crawler: WebCrawler;
  private contentProcessor: ContentProcessor;
  private urlCache: Set<string>;
  private contentCache: CacheService;
  private robotsCache: Map<string, RobotsRule>;
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Search indexed web content using fuse.js
    const results = await this.fuzzySearch.search(query);
    return this.rankResults(results, filters);
  }
  
  async searchRunbooks(alertType: string, severity: string, systems: string[]): Promise<Runbook[]> {
    // Apply runbook detection heuristics to web content
    const query = `${alertType} ${severity} ${systems.join(' ')} procedure steps troubleshoot`;
    const results = await this.search(query);
    return this.extractRunbookContent(results);
  }
  
  async crawl(): Promise<void> {
    // Main crawling logic with depth management
    const queue = new URLQueue(this.config.base_urls);
    const rateLimiter = new RateLimiter(this.config.rate_limit);
    
    while (!queue.isEmpty()) {
      const batch = queue.getBatch(this.config.rate_limit.concurrent_requests);
      await Promise.all(batch.map(url => this.crawlURL(url, rateLimiter)));
    }
  }
  
  private async extractContent(html: string, url: string): Promise<ExtractedContent> {
    const $ = cheerio.load(html);
    
    // Remove navigation, headers, footers using heuristics
    this.removeNoise($);
    
    // Extract main content using selectors or automatic detection
    const content = this.config.content_selectors?.main 
      ? $(this.config.content_selectors.main).text()
      : this.autoDetectContent($);
      
    return {
      title: this.extractTitle($, url),
      content: content.trim(),
      metadata: this.extractMetadata($, url),
      links: this.extractLinks($, url)
    };
  }
}
```

### Key Features (from Original Plan)
- **Intelligent Content Extraction**: Main content vs navigation/ads separation
- **URL Pattern Filtering**: Include/exclude regex patterns for targeted crawling
- **Rate Limiting & Politeness**: Configurable requests per second, robots.txt compliance
- **Authentication Support**: Basic, bearer token, and cookie-based authentication
- **Recursive Crawling**: Configurable depth with breadth-first traversal
- **Content Caching**: TTL-based caching with URL normalization
- **Runbook Detection**: Heuristics for identifying procedural content

### Performance Targets (from Original Plan)
- **Crawling Speed**: 2 requests/second (configurable)
- **Content Extraction**: 95%+ accuracy for main content identification  
- **Search Performance**: Sub-second search within indexed content
- **Cache Efficiency**: 80%+ cache hit rate for frequently accessed sites
- **Robots.txt Compliance**: 100% compliance with site crawling policies

### Dependencies (from Original Plan)
- **cheerio**: HTML parsing and manipulation
- **p-queue**: Concurrent request management
- **robots-parser**: Robots.txt parsing and compliance
- **normalize-url**: URL normalization and deduplication
- **got** or **axios**: HTTP client with retry logic and connection pooling

## Adapter 4: DiscordAdapter (Bi-directional Integration)

### Purpose & Integration
**Complete implementation from the original Discord adapter plan**, providing bi-directional Discord integration for both documentation retrieval and operational notifications.

### Technical Specification (from Original Plan)

#### Configuration Schema
```typescript
interface DiscordConfig extends SourceConfig {
  type: 'discord';
  bot_token_env: string;                   // Discord bot token environment variable
  mode: 'read' | 'write' | 'read-write';
  channels: {
    read?: string[];                       // Channel IDs to read from
    write?: string[];                      // Channel IDs to write to
  };
  guild_id: string;                        // Discord server ID
  filters?: {
    message_types?: string[];              // Filter by message type
    authors?: string[];                    // Filter by author ID/role
    has_attachments?: boolean;             // Only messages with attachments
    is_pinned?: boolean;                   // Only pinned messages
    content_patterns?: string[];           // Regex patterns
  };
  search_options?: {
    history_limit?: number;                // Max messages to index (default: 1000)
    include_threads?: boolean;             // Include thread messages
    index_attachments?: boolean;           // Index attachment content
  };
  write_options?: {
    default_channel?: string;              // Default channel for writes
    mention_roles?: string[];              // Roles to mention on alerts
    embed_style?: boolean;                 // Use rich embeds
  };
  cache_ttl?: string;                      // Message cache duration
}
```

#### Implementation Architecture (from Original Plan)
```
DiscordAdapter
├── Discord Client (discord.js)
│   ├── Event Handlers
│   ├── Message Cache
│   └── Permission Manager
├── Message Processor
│   ├── Content Extractor
│   ├── Attachment Handler
│   ├── Embed Parser
│   └── Thread Resolver
├── Search Engine
│   ├── Message Indexer
│   ├── Full-text Search
│   └── Relevance Scoring
├── Write Interface
│   ├── Message Formatter
│   ├── Embed Builder
│   ├── Rate Limiter
│   └── Error Handler
└── Bi-directional Features
    ├── Command Handler
    ├── Interactive Responses
    └── Status Updates
```

#### Enhanced Implementation
```typescript
export class DiscordAdapter extends SourceAdapter {
  name = 'discord';
  type = 'chat' as const;
  
  private client: Discord.Client;
  private messageCache: Map<string, ProcessedMessage>;
  private indexedChannels: Set<string>;
  private writeQueue: MessageQueue;
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Search indexed Discord messages with full-text search
    const results = await this.searchMessages(query, filters);
    return this.transformMessageResults(results);
  }
  
  async searchRunbooks(alertType: string, severity: string, systems: string[]): Promise<Runbook[]> {
    // Search for pinned messages and procedural content
    const operationalQuery = `${alertType} ${severity} ${systems.join(' ')} procedure steps troubleshoot`;
    const results = await this.search(operationalQuery, { is_pinned: true });
    return this.extractRunbookContent(results);
  }
  
  // Discord-specific write methods (from original plan)
  async postMessage(channel: string, content: string, options?: MessageOptions): Promise<void> {
    await this.writeQueue.add(() => this.client.channels.cache.get(channel)?.send(content));
  }
  
  async postRunbookStatus(runbookId: string, status: RunbookStatus): Promise<void> {
    const embed = this.buildStatusEmbed(runbookId, status);
    await this.postEmbed(this.config.write_options.default_channel, embed);
  }
  
  async createIncidentThread(alert: Alert): Promise<string> {
    const channel = this.client.channels.cache.get(this.config.write_options.default_channel);
    const thread = await channel.threads.create({
      name: `Incident: ${alert.title}`,
      reason: `Incident response for ${alert.system}`
    });
    return thread.id;
  }
  
  private async processMessage(message: Discord.Message): Promise<ProcessedMessage> {
    // Extract content, attachments, embeds, and metadata
    return {
      id: message.id,
      content: message.content,
      author: message.author.username,
      attachments: await this.processAttachments(message.attachments),
      embeds: message.embeds.map(embed => this.parseEmbed(embed)),
      metadata: this.extractMessageMetadata(message)
    };
  }
}
```

### Key Features (from Original Plan)
- **Real-time Message Monitoring**: Live message indexing with event handlers
- **Historical Message Search**: Index existing channel history up to configured limits
- **Attachment Processing**: Text file extraction, PDF parsing, optional image OCR
- **Bi-directional Communication**: Read documentation, write status updates and alerts
- **Thread Support**: Full thread message indexing and interactive thread creation
- **Permission Management**: Respect Discord permissions and role-based access
- **Rich Embed Support**: Structured message formatting for status updates

### Write Capabilities (from Original Plan)
1. **Simple Messages**: Plain text alerts and notifications
2. **Rich Embeds**: Structured incident alerts with fields and formatting
3. **Interactive Features**: Thread creation, reaction acknowledgments, message editing
4. **Status Updates**: Runbook execution progress and completion notifications

### Performance Targets (from Original Plan)
- **Message Search**: <100ms response time for indexed content
- **Real-time Updates**: <5 seconds for new message indexing
- **Write Operations**: <2 seconds for message posting
- **Attachment Processing**: <10 seconds for document text extraction

### Dependencies (from Original Plan)
- **discord.js**: Official Discord API library for client implementation
- **pdf-parse**: PDF text extraction for attachment processing
- **tesseract.js**: Optional OCR for image text extraction
- **node-cache**: Message caching for performance optimization

## Implementation Timeline & Resource Allocation

### Week 4: Foundation & Core Adapters
**Days 1-2: Enhanced FileSystemAdapter + ConfluenceAdapter** 
- *Lead*: Barry Young (bear) - Integration specialist
- *Support*: Cindy Molin (cin) - Backend architecture
- *Tasks*: FileSystem enhancements, Confluence API integration, authentication framework

**Days 3-4: GitHubAdapter + DatabaseAdapter**
- *Lead*: Barry Young (bear) - API integrations  
- *Support*: Cindy Molin (cin) - Database connectivity and query optimization
- *Tasks*: GitHub API integration, database connection pooling, query interfaces

### Week 5: Advanced Adapters  
**Days 1-2: WebAdapter Implementation**
- *Lead*: Barry Young (bear) - Web scraping and content extraction
- *Support*: Jackson Brown (jack) - Content processing algorithms
- *Tasks*: Web crawler engine, content extraction, robots.txt compliance

**Days 3-4: DiscordAdapter Implementation**  
- *Lead*: Barry Young (bear) - Discord API integration
- *Support*: Sanchez North (firepower) - Security and permissions
- *Tasks*: Discord client setup, bi-directional messaging, attachment processing

### Week 6: Integration & Optimization
**Days 1-2: Multi-Source Search & Aggregation**
- *Lead*: Jackson Brown (jack) - Search algorithms and result ranking
- *Support*: Chan Choi (chacha) - Performance optimization
- *Tasks*: Result aggregation, confidence scoring, performance tuning

**Days 3-4: Testing & Quality Assurance**
- *Lead*: Darren Fong - Comprehensive testing strategy
- *Support*: Chan Choi (chacha) - Performance validation
- *Tasks*: Integration tests, performance benchmarks, security validation

## Quality Assurance & Testing Strategy

### Unit Testing (Per Adapter)
- **Adapter Interface Compliance**: Verify all required methods implemented
- **Configuration Validation**: Test configuration parsing and validation
- **Authentication Testing**: Mock authentication flows and error handling
- **Content Processing**: Validate content extraction and transformation
- **Error Handling**: Test failure scenarios and recovery mechanisms

### Integration Testing (Multi-Adapter)
- **Cross-Source Search**: Validate unified search across all 6 adapters
- **Result Aggregation**: Test confidence scoring and result ranking
- **Performance Testing**: Load testing with concurrent multi-source queries
- **Authentication Matrix**: Test all authentication types across adapters
- **Failover Testing**: Validate graceful degradation when sources unavailable

### Security Testing
- **Credential Management**: Ensure no credentials logged or exposed
- **Input Validation**: SQL injection, XSS, and command injection testing
- **Network Security**: TLS validation, certificate verification
- **Permission Testing**: Access control and authorization validation
- **Audit Logging**: Comprehensive security event logging

## Risk Mitigation Strategies

### High-Risk Areas
1. **Authentication Complexity**: Multiple auth types across 6 adapters
   - *Mitigation*: Unified auth framework, comprehensive testing matrix
2. **Rate Limiting Conflicts**: Different limits across external APIs
   - *Mitigation*: Adaptive rate limiting, request queuing, priority management
3. **Content Extraction Accuracy**: Diverse content formats and structures
   - *Mitigation*: Fallback parsers, manual selectors, accuracy monitoring
4. **Performance Under Load**: 6 adapters with external dependencies
   - *Mitigation*: Circuit breakers, intelligent caching, performance monitoring

### Contingency Plans
- **Source Unavailability**: Offline fallback modes with cached content
- **API Breaking Changes**: Version detection and backward compatibility
- **Performance Degradation**: Automatic adapter prioritization and load balancing
- **Security Incidents**: Immediate credential rotation and audit procedures

---

*This document provides comprehensive technical specifications for all 6 Phase 2 adapters, incorporating the complete requirements from the original web-scraper-discord-adapters-plan.md*