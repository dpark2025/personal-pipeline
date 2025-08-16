# ⚠️ PLANNING DOCUMENTATION ARCHIVE STATUS ⚠️
## 🔒 **COMPLETED - NO LONGER REFERENCED FOR CURRENT PROJECT PLANS**
**Status**: MILESTONE/PLAN COMPLETE (2025)  
**Archive Date**: August 16, 2025  
**Reference**: Historical planning record only - do not use for current planning  

---


# ⚠️ DEPRECATED: Implementation Plan: Web Scraper & Discord Adapters

> **DEPRECATION NOTICE**: This document has been **deprecated** as of 2025-07-31 and integrated into the comprehensive Phase 2 planning documents. 
> 
> **Please refer to the updated Phase 2 documentation**:
> - **Requirements**: [`planning/phase-2-requirements.md`](./phase-2-requirements.md)
> - **Implementation Plans**: [`planning/phase-2-adapter-implementations.md`](./phase-2-adapter-implementations.md)
> - **Timeline & Resources**: [`planning/phase-2-timeline-resources.md`](./phase-2-timeline-resources.md)
>
> All specifications from this document have been **fully incorporated** into the Phase 2 planning with:
> - **WebAdapter**: Enhanced implementation of the original WebScraperAdapter specifications
> - **DiscordAdapter**: Complete bi-directional integration as originally planned
> - **Integration**: Full compatibility with the 6-adapter Phase 2 ecosystem
>
> This document is retained for historical reference only.

---

## Original Overview (DEPRECATED)

This document outlined the implementation plan for two new source adapters for the Personal Pipeline MCP server:

1. **Generic Web Scraper Adapter** - Crawls and indexes web pages with configurable depth
2. **Discord Adapter** - Bi-directional integration with Discord channels (read/write)

### Project Coordination
**Project Manager**: Kira Preston (kir) - Senior technical project manager for milestone tracking and delivery
**Technical Lead**: Cindy Molin (cin) - Overall technical architecture and integration
**Quality Lead**: Darren Fong - Quality assurance and testing strategy

## 1. Generic Web Scraper Adapter

### 1.1 Purpose & Use Cases

The Web Scraper Adapter enables PP to index and search documentation from any web-based source without requiring specific API integration.

**Use Cases:**
- Public documentation sites without APIs
- Internal wikis with web interfaces
- Knowledge bases and forums
- Product documentation sites
- Blog posts and articles

### 1.2 Technical Design
**Design Lead**: Cindy Molin (cin) - Senior backend/Node.js technical lead
**Architecture Review**: Sanchez North (firepower) - Security architecture

#### Core Features
- Recursive web crawling with configurable depth (default: 1)
- Intelligent content extraction (main content vs navigation/ads)
- URL pattern filtering (include/exclude patterns)
- Rate limiting and politeness controls
- Robots.txt compliance
- Session/cookie support for authenticated content
- Content caching with TTL
- Duplicate detection via URL normalization

#### Configuration Schema
```typescript
interface WebScraperConfig extends SourceConfig {
  type: 'web-scraper';
  base_urls: string[];          // Starting URLs for crawling
  max_depth: number;            // Maximum recursion depth (default: 1)
  url_patterns?: {
    include?: string[];         // Regex patterns to include
    exclude?: string[];         // Regex patterns to exclude
  };
  rate_limit?: {
    requests_per_second?: number;  // Rate limit (default: 2)
    concurrent_requests?: number;  // Max concurrent (default: 3)
  };
  content_selectors?: {
    main?: string;              // CSS selector for main content
    title?: string;             // CSS selector for title
    exclude?: string[];         // CSS selectors to exclude
  };
  auth?: {
    type: 'basic' | 'bearer' | 'cookie';
    credentials?: Record<string, string>;
  };
  cache_ttl?: string;           // Cache duration (default: '1h')
  respect_robots_txt?: boolean; // Default: true
  user_agent?: string;          // Custom user agent
}
```

#### Implementation Architecture

```
WebScraperAdapter
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

#### Key Classes & Methods

```typescript
export class WebScraperAdapter extends SourceAdapter {
  private crawler: WebCrawler;
  private contentProcessor: ContentProcessor;
  private urlCache: Set<string>;
  private contentCache: CacheService;
  
  async crawl(): Promise<void> {
    // Main crawling logic with depth management
  }
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Search indexed content
  }
  
  async getDocument(id: string): Promise<Document> {
    // Retrieve specific document by URL
  }
  
  async searchRunbooks(alertType: string, severity: string, systems: string[]): Promise<Runbook[]> {
    // Search for runbook-like content
  }
  
  private async extractContent(html: string, url: string): Promise<ExtractedContent> {
    // Intelligent content extraction
  }
  
  private async shouldCrawl(url: string, currentDepth: number): Promise<boolean> {
    // URL filtering and depth checking
  }
}
```

#### Content Extraction Strategy

1. **Automatic Detection** (default):
   - Remove navigation, headers, footers
   - Identify main content area using heuristics
   - Extract structured data (headings, lists, code blocks)

2. **Selector-Based** (when configured):
   - Use provided CSS selectors
   - Fallback to automatic if selectors fail

3. **Metadata Extraction**:
   - Title, description, keywords
   - Last modified date
   - Author information
   - Structured data (JSON-LD, microdata)

#### Runbook Detection Heuristics

For `searchRunbooks()` compatibility:
- Identify procedural content patterns
- Look for numbered steps, commands
- Extract decision trees from nested lists
- Detect alert/error keywords
- Score content based on operational relevance

### 1.3 Dependencies & Libraries

- **cheerio**: HTML parsing and manipulation
- **p-queue**: Concurrent request management
- **robots-parser**: Robots.txt parsing
- **normalize-url**: URL normalization
- **got** or **axios**: HTTP client with retry logic

### 1.4 Performance Considerations
**Performance Lead**: Chan Choi (chacha) - Performance engineer specializing in scale testing and optimization

- Implement connection pooling
- Use streaming for large documents
- Compress cached content
- Implement bloom filters for URL deduplication
- Progressive indexing during crawl

### 1.5 Error Handling

- Retry failed requests with exponential backoff
- Handle various HTTP errors gracefully
- Skip and log problematic pages
- Partial crawl recovery
- Circuit breaker for unreliable sites

## 2. Discord Adapter

### 2.1 Purpose & Use Cases

The Discord Adapter enables bi-directional integration with Discord, allowing PP to both read documentation from Discord channels and post updates/notifications.

**Use Cases:**
- Reading pinned messages as documentation
- Searching channel history for solutions
- Posting runbook execution status
- Sending alerts and notifications
- Creating incident response threads
- Interactive Q&A with the bot

### 2.2 Technical Design
**Design Lead**: Cindy Molin (cin) - Senior backend/Node.js technical lead
**Security Lead**: Sanchez North (firepower) - Security engineer for permission models
**Integration Lead**: Barry Young (bear) - Integration specialist for Discord API

#### Core Features
- Real-time message monitoring
- Historical message search
- Message filtering by type/author/content
- Thread support
- Attachment handling (documents, images)
- Embed parsing for rich content
- Rate limit compliance
- Permission-aware operations
- Bi-directional communication

#### Configuration Schema
```typescript
interface DiscordConfig extends SourceConfig {
  type: 'discord';
  bot_token: string;            // Discord bot token
  mode: 'read' | 'write' | 'read-write';
  channels: {
    read?: string[];            // Channel IDs to read from
    write?: string[];           // Channel IDs to write to
  };
  guild_id: string;             // Discord server ID
  filters?: {
    message_types?: string[];   // Filter by message type
    authors?: string[];         // Filter by author ID/role
    has_attachments?: boolean;  // Only messages with attachments
    is_pinned?: boolean;        // Only pinned messages
    content_patterns?: string[]; // Regex patterns
  };
  search_options?: {
    history_limit?: number;     // Max messages to index (default: 1000)
    include_threads?: boolean;  // Include thread messages
    index_attachments?: boolean; // Index attachment content
  };
  write_options?: {
    default_channel?: string;   // Default channel for writes
    mention_roles?: string[];   // Roles to mention on alerts
    embed_style?: boolean;      // Use rich embeds
  };
  cache_ttl?: string;           // Message cache duration
}
```

#### Implementation Architecture

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

#### Key Classes & Methods

```typescript
export class DiscordAdapter extends SourceAdapter {
  private client: Discord.Client;
  private messageCache: Map<string, ProcessedMessage>;
  private indexedChannels: Set<string>;
  
  async connect(): Promise<void> {
    // Initialize Discord client and login
  }
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Search indexed Discord messages
  }
  
  async getDocument(id: string): Promise<Document> {
    // Retrieve specific message by ID
  }
  
  async searchRunbooks(alertType: string, severity: string, systems: string[]): Promise<Runbook[]> {
    // Search for runbook-like content in messages
  }
  
  // Discord-specific write methods
  async postMessage(channel: string, content: string, options?: MessageOptions): Promise<void> {
    // Post a message to Discord
  }
  
  async postRunbookStatus(runbookId: string, status: RunbookStatus): Promise<void> {
    // Post runbook execution status
  }
  
  async createIncidentThread(alert: Alert): Promise<string> {
    // Create a new thread for incident response
  }
  
  private async indexChannel(channelId: string): Promise<void> {
    // Index messages from a channel
  }
  
  private async processMessage(message: Discord.Message): Promise<ProcessedMessage> {
    // Extract and process message content
  }
}
```

#### Message Processing Strategy

1. **Content Extraction**:
   - Plain text content
   - Code blocks with language detection
   - Embedded links and references
   - Mentioned users/roles/channels

2. **Attachment Processing**:
   - Text files (.txt, .md, .json, .yaml)
   - Images with OCR (optional)
   - PDFs with text extraction
   - Ignore binary files

3. **Structured Data**:
   - Parse embeds as structured documents
   - Extract fields, titles, descriptions
   - Preserve formatting and links

#### Runbook Detection in Discord

- Pinned messages with procedural content
- Messages with step-by-step instructions
- Code blocks with commands
- Messages tagged with specific keywords
- Thread titles indicating procedures

### 2.3 Write Capabilities

#### Supported Write Operations

1. **Simple Messages**:
   ```typescript
   await adapter.postMessage(channelId, "Runbook execution completed successfully");
   ```

2. **Rich Embeds**:
   ```typescript
   await adapter.postEmbed(channelId, {
     title: "Incident Alert",
     description: "High CPU usage detected",
     fields: [
       { name: "System", value: "web-server-01" },
       { name: "CPU Usage", value: "95%" }
     ],
     color: 0xFF0000
   });
   ```

3. **Interactive Features**:
   - Create threads for incidents
   - Add reactions for acknowledgment
   - Edit messages with status updates
   - Reply to specific messages

### 2.4 Dependencies & Libraries

- **discord.js**: Official Discord API library
- **pdf-parse**: PDF text extraction
- **tesseract.js**: OCR for images (optional)
- **node-cache**: Message caching

### 2.5 Performance Considerations
**Performance Lead**: Chan Choi (chacha) - Performance optimization for Discord operations

- Implement message pagination for large channels
- Cache frequently accessed messages
- Use gateway intents to reduce bandwidth
- Batch API requests where possible
- Implement connection pooling

### 2.6 Security & Permissions
**Security Lead**: Sanchez North (firepower) - Security engineer for authentication and permissions

- Validate bot permissions before operations
- Implement role-based access control
- Sanitize user input in searches
- Audit log for all write operations
- Encrypt stored bot tokens

## 3. Integration with Existing System

### 3.1 Registration

Both adapters will register with the `SourceAdapterRegistry`:

```typescript
// In src/adapters/index.ts
export async function registerAdapters(): Promise<void> {
  const registry = SourceAdapterRegistry.getInstance();
  
  registry.register('web-scraper', WebScraperAdapter);
  registry.register('discord', DiscordAdapter);
}
```

### 3.2 MCP Tool Compatibility

Both adapters implement all required methods for MCP tools:
- `search_runbooks()`
- `get_procedure()`
- `search_knowledge_base()`
- `get_decision_tree()`
- `get_escalation_path()`

### 3.3 REST API Compatibility

The existing REST API will automatically support both adapters through the transformation layer.

## 4. Testing Strategy
**Test Lead**: Darren Fong - QA/Test engineer
**Performance Testing**: Chan Choi (chacha) - Performance engineer
**Security Testing**: Sanchez North (firepower) - Security engineer

### 4.1 Unit Tests

- Mock HTTP requests for web scraper
- Mock Discord API for Discord adapter
- Test content extraction algorithms
- Test search relevance scoring
- Test error handling scenarios

### 4.2 Integration Tests

- Test with real websites (using test fixtures)
- Test with Discord test server
- Validate rate limiting
- Test cache behavior
- Test concurrent operations

### 4.3 Performance Tests

- Crawl performance with various depths
- Search performance with large datasets
- Memory usage during crawling
- Discord message processing speed

## 5. Implementation Timeline

### Phase 1: Web Scraper Adapter (3-4 days)
1. **Day 1**: Core crawler implementation
   - **Lead Agent**: Barry Young (bear) - Integration specialist for APIs and enterprise systems
   - **Supporting Agent**: Chan Choi (chacha) - Performance engineer for optimization
   - **Tasks**: URL queue management, rate limiting, concurrent request handling
2. **Day 2**: Content extraction and processing
   - **Lead Agent**: Jackson Brown (jack) - AI/ML engineer for intelligent content extraction
   - **Supporting Agent**: Barry Young (bear) - Content extraction patterns
   - **Tasks**: HTML parsing, content heuristics, metadata extraction
3. **Day 3**: Search interface and caching
   - **Lead Agent**: Cindy Molin (cin) - Backend lead for caching strategies
   - **Supporting Agent**: Jackson Brown (jack) - Search algorithm implementation
   - **Tasks**: Indexing, fuzzy search, cache layer implementation
4. **Day 4**: Testing and refinement
   - **Lead Agent**: Darren Fong - QA engineer for comprehensive testing
   - **Supporting Agent**: Chan Choi (chacha) - Performance testing
   - **Tasks**: Unit tests, integration tests, performance validation

### Phase 2: Discord Adapter (3-4 days)
1. **Day 1**: Discord client setup and read operations
   - **Lead Agent**: Barry Young (bear) - API integration specialist
   - **Supporting Agent**: Sanchez North (firepower) - Security for token management
   - **Tasks**: Discord.js setup, authentication, channel reading
2. **Day 2**: Message processing and indexing
   - **Lead Agent**: Jackson Brown (jack) - Content processing and indexing
   - **Supporting Agent**: Cindy Molin (cin) - Database design for message storage
   - **Tasks**: Message parsing, attachment handling, search implementation
3. **Day 3**: Write operations and interactive features
   - **Lead Agent**: Cindy Molin (cin) - Backend architecture for bi-directional communication
   - **Supporting Agent**: Sanchez North (firepower) - Permission management
   - **Tasks**: Message posting, embed creation, thread management
4. **Day 4**: Testing and refinement
   - **Lead Agent**: Darren Fong - QA engineer for integration testing
   - **Supporting Agent**: Sanchez North (firepower) - Security testing
   - **Tasks**: End-to-end tests, permission tests, rate limit validation

### Phase 3: Integration & Testing (2 days)
1. **Day 1**: Integration with PP system
   - **Lead Agent**: Cindy Molin (cin) - System integration
   - **Supporting Agent**: Hank Tran - DevOps for deployment architecture
   - **Tasks**: Registry integration, MCP tool compatibility, REST API integration
2. **Day 2**: End-to-end testing and documentation
   - **Lead Agent**: Darren Fong - Comprehensive testing
   - **Supporting Agent**: Harry Lewis (louie) - Technical documentation
   - **Project Manager**: Kira Preston (kir) - Milestone tracking and delivery
   - **Tasks**: Integration tests, documentation, deployment guide

## 6. Configuration Examples

### Web Scraper Example
```yaml
sources:
  - name: "public-docs"
    type: "web-scraper"
    base_urls:
      - "https://docs.example.com"
    max_depth: 2
    url_patterns:
      include:
        - "https://docs.example.com/guides/.*"
        - "https://docs.example.com/api/.*"
      exclude:
        - ".*/archive/.*"
    rate_limit:
      requests_per_second: 2
    content_selectors:
      main: "article.documentation"
      title: "h1.page-title"
      exclude: [".navigation", ".footer"]
    cache_ttl: "6h"
```

### Discord Example
```yaml
sources:
  - name: "ops-discord"
    type: "discord"
    bot_token_env: "DISCORD_BOT_TOKEN"
    mode: "read-write"
    guild_id: "123456789012345678"
    channels:
      read:
        - "987654321098765432"  # #documentation
        - "876543210987654321"  # #runbooks
      write:
        - "765432109876543210"  # #alerts
    filters:
      is_pinned: true
      message_types: ["DEFAULT", "REPLY"]
    search_options:
      history_limit: 5000
      include_threads: true
    write_options:
      default_channel: "765432109876543210"
      embed_style: true
```

## 7. Future Enhancements

### Web Scraper
- JavaScript rendering support (Puppeteer/Playwright)
- Smart crawling with ML-based relevance detection
- Distributed crawling for large sites
- Change detection and incremental updates
- Support for authenticated sessions

### Discord
- Slash command support for interactive queries
- Voice channel transcription
- Multi-guild support
- Webhook integration
- Discord forum channel support

## 8. Risks & Mitigation

### Web Scraper Risks
- **Rate limiting**: Implement adaptive rate limiting
- **Dynamic content**: Add JavaScript rendering as future enhancement
- **Large sites**: Implement crawl budgets and priorities
- **Content changes**: Regular recrawling with change detection

### Discord Risks
- **API rate limits**: Implement proper rate limiting and queuing
- **Large message volumes**: Implement pagination and selective indexing
- **Permission issues**: Graceful degradation and clear error messages
- **Token security**: Secure storage and rotation procedures

## 9. Success Criteria

### Web Scraper
- Successfully crawl and index 95% of targeted pages
- Sub-second search performance for indexed content
- Respect all robots.txt and rate limits
- Accurate content extraction for 90%+ of pages

### Discord
- Index all accessible messages in configured channels
- < 100ms search response time
- Successful write operations with proper formatting
- Real-time message updates within 5 seconds

## 10. Documentation Requirements
**Documentation Lead**: Harry Lewis (louie) - Technical writer and documentation specialist
**Architecture Documentation**: Cindy Molin (cin) - System design documentation
**Security Documentation**: Sanchez North (firepower) - Security best practices guide

- Detailed setup guide for both adapters
- Configuration examples for common use cases
- Troubleshooting guide
- Performance tuning guide
- Security best practices