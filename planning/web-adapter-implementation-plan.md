# WebAdapter Implementation Plan

## Overview

The WebAdapter provides comprehensive web crawling and content extraction capabilities for the Personal Pipeline MCP Server. It enables intelligent extraction of documentation, runbooks, and procedures from web sources with configurable crawling policies, rate limiting, and content parsing strategies.

## Technical Architecture

### Core Components

```
WebAdapter
├── Crawler Engine
│   ├── URL Queue Manager (breadth-first traversal)
│   ├── Depth Tracker (configurable max depth)
│   ├── Rate Limiter (p-limit with configurable RPS)
│   └── Concurrent Request Pool (got/axios with retry)
├── Content Processor
│   ├── HTML Parser (cheerio)
│   ├── Content Extractor (main content detection)
│   ├── Metadata Extractor (title, author, dates)
│   └── Link Extractor (URL normalization)
├── Cache Layer
│   ├── URL Cache (visited URLs with TTL)
│   ├── Content Cache (extracted content)
│   └── Robots.txt Cache (compliance)
└── Search Interface
    ├── Content Indexer (in-memory search)
    ├── Fuzzy Search (fuse.js)
    └── Relevance Scoring (TF-IDF inspired)
```

## Implementation Details

### 1. Configuration Schema

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

### 2. Responsible Web Crawling

Following the conservative approach from GitHubAdapter:

- **Default Rate Limiting**: 2 requests/second (configurable)
- **Concurrent Requests**: Maximum 3 simultaneous requests
- **Robots.txt Compliance**: Enabled by default
- **User Agent**: Identifies as "PersonalPipeline-MCP/1.0"
- **Crawl Depth**: Default maximum depth of 1 (single page + immediate links)
- **URL Limits**: Maximum 100 URLs per domain by default

### 3. Content Extraction Strategy

```typescript
interface ContentExtraction {
  // Automatic main content detection
  autoDetectContent(cheerio: CheerioAPI): string;
  
  // Noise removal heuristics
  removeNavigationElements(cheerio: CheerioAPI): void;
  removeAdvertisements(cheerio: CheerioAPI): void;
  removeFooterElements(cheerio: CheerioAPI): void;
  
  // Content scoring algorithm
  scoreContentBlocks(blocks: ContentBlock[]): ScoredBlock[];
  
  // Runbook detection heuristics
  detectRunbookContent(content: string): RunbookIndicators;
}
```

### 4. Runbook Detection Heuristics

The adapter will identify potential runbooks using:

- **Structural Patterns**: Numbered steps, bullet points, procedure keywords
- **Content Keywords**: "procedure", "steps", "troubleshoot", "resolve", "fix"
- **Metadata Signals**: URLs containing "runbook", "procedure", "guide", "troubleshooting"
- **Format Detection**: Markdown-style headers, code blocks, command examples

### 5. Error Handling & Resilience

```typescript
class WebAdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public url?: string,
    public statusCode?: number
  ) {
    super(message);
  }
}

// Specific error types
class WebCrawlError extends WebAdapterError {}
class WebAuthenticationError extends WebAdapterError {}
class WebRateLimitError extends WebAdapterError {}
class WebContentExtractionError extends WebAdapterError {}
```

## Implementation Phases

### Phase 1: Core Infrastructure (4 hours)
- [ ] Create WebAdapter class extending SourceAdapter
- [ ] Implement configuration validation and parsing
- [ ] Set up basic HTTP client with retry logic
- [ ] Implement URL normalization and deduplication

### Phase 2: Crawler Engine (6 hours)
- [ ] Implement URL queue with breadth-first traversal
- [ ] Add depth tracking and limits
- [ ] Implement rate limiter with p-limit
- [ ] Add robots.txt parser and compliance

### Phase 3: Content Processing (6 hours)
- [ ] Implement HTML parsing with cheerio
- [ ] Add automatic main content detection
- [ ] Implement noise removal heuristics
- [ ] Add metadata extraction

### Phase 4: Search & Indexing (4 hours)
- [ ] Implement in-memory content indexing
- [ ] Add fuse.js integration for fuzzy search
- [ ] Implement relevance scoring
- [ ] Add runbook detection and extraction

### Phase 5: Authentication & Security (3 hours)
- [ ] Implement basic authentication
- [ ] Add bearer token support
- [ ] Implement cookie-based auth
- [ ] Add security headers and validation

### Phase 6: Testing & Documentation (5 hours)
- [ ] Write comprehensive unit tests
- [ ] Add integration tests
- [ ] Create sample configuration
- [ ] Write usage documentation

**Total Estimated Time**: 28 hours

## Dependencies

```json
{
  "cheerio": "^1.0.0-rc.12",    // HTML parsing
  "got": "^14.0.0",              // HTTP client with retry
  "p-limit": "^5.0.0",           // Concurrency control
  "robots-parser": "^3.0.0",     // Robots.txt parsing
  "normalize-url": "^8.0.0",     // URL normalization
  "fuse.js": "^7.0.0",           // Fuzzy search (already in project)
  "node-cache": "^5.1.2"         // Caching (already in project)
}
```

## Testing Strategy

### Unit Tests
- Configuration validation
- URL normalization and pattern matching
- Content extraction accuracy
- Rate limiting enforcement
- Error handling scenarios

### Integration Tests
- Live website crawling (with test server)
- Authentication flows
- Multi-page crawling with depth limits
- Robots.txt compliance
- Cache behavior

### Performance Tests
- Rate limiting accuracy
- Memory usage under load
- Search performance with large indexes
- Concurrent request handling

## Security Considerations

1. **Input Validation**: Sanitize all URLs and prevent SSRF attacks
2. **Authentication Storage**: Never log credentials or sensitive headers
3. **Content Sanitization**: Remove scripts and potentially malicious content
4. **Rate Limiting**: Respect server resources and prevent abuse
5. **Error Messages**: Don't expose internal details in errors

## Success Metrics

- **Content Extraction Accuracy**: >95% main content identification
- **Crawl Performance**: 2 pages/second sustained rate
- **Search Latency**: <100ms for indexed content search
- **Memory Efficiency**: <500MB for 1000 indexed pages
- **Cache Hit Rate**: >80% for frequently accessed content

## Sample Configuration

```yaml
sources:
  - name: "company-docs"
    type: "web"
    base_urls:
      - "https://docs.company.com"
      - "https://wiki.company.com/operations"
    max_depth: 2
    url_patterns:
      include:
        - ".*/(runbooks|procedures|guides)/.*"
      exclude:
        - ".*/archive/.*"
        - ".*\\.(pdf|zip|tar)$"
    rate_limit:
      requests_per_second: 2
      concurrent_requests: 3
    content_selectors:
      main: "article.content, .documentation-content"
      exclude:
        - "nav"
        - ".sidebar"
        - "footer"
    cache_ttl: "4h"
    respect_robots_txt: true
    user_agent: "PersonalPipeline-MCP/1.0 (Runbook Indexer)"
```

## Risks & Mitigations

1. **Website Structure Changes**: Use flexible selectors and fallback extraction
2. **Rate Limiting**: Implement exponential backoff and respect 429 responses
3. **Memory Usage**: Implement content size limits and streaming for large pages
4. **Legal Compliance**: Always respect robots.txt and terms of service
5. **Performance Impact**: Use caching aggressively and limit crawl scope

## Next Steps

1. Review and approve implementation plan
2. Set up development branch
3. Install required dependencies
4. Begin Phase 1 implementation
5. Regular progress updates and testing