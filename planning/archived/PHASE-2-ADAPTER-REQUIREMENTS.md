# ⚠️ PLANNING DOCUMENTATION ARCHIVE STATUS ⚠️
## 🔒 **COMPLETED - NO LONGER REFERENCED FOR CURRENT PROJECT PLANS**
**Status**: MILESTONE/PLAN COMPLETE (2025)  
**Archive Date**: August 16, 2025  
**Reference**: Historical planning record only - do not use for current planning  

---


# Phase 2 Adapter Requirements Specification

**Document Version**: 1.0  
**Created**: 2025-07-31  
**Author**: Barry Young (Integration Specialist)  
**Project**: Personal Pipeline MCP Server - Phase 2 Multi-Source Integration  
**Timeline**: Weeks 4-6 (Phase 2)

## Executive Summary

Phase 2 focuses on implementing enterprise-grade source adapters to connect Personal Pipeline with major documentation systems used in operational environments. This specification defines requirements for 5 priority adapters that will enable comprehensive documentation retrieval from diverse enterprise sources.

**Priority Adapters:**
1. **Confluence Adapter** (Week 4) - Primary enterprise wiki platform
2. **GitHub Adapter** (Week 4) - Repository documentation and wikis  
3. **Database Adapter** (Week 5) - PostgreSQL/MongoDB runbook storage
4. **Notion Adapter** (Week 5) - Modern documentation platform
5. **Web Adapter** (Week 6) - Generic REST API and web scraping

**Success Criteria:**
- Sub-200ms response times for cached content
- 95%+ authentication success rate
- Support for 10+ concurrent queries per adapter
- Graceful degradation when sources unavailable
- Enterprise security compliance

---

## Adapter Priority Matrix

| Adapter | Business Priority | Implementation Complexity | Enterprise Usage | Timeline |
|---------|-----------------|-------------------------|------------------|----------|
| **Confluence** | 🔴 Critical | Medium | 90%+ enterprises | Week 4.1-4.3 |
| **GitHub** | 🔴 Critical | Medium | 85%+ dev teams | Week 4.4-4.6 |
| **Database** | 🟡 High | High | 70%+ structured data | Week 5.1-5.3 |
| **Notion** | 🟡 High | Medium | 60%+ modern teams | Week 5.4-5.6 |
| **Web** | 🟢 Medium | High | Universal fallback | Week 6.1-6.6 |

---

## 1. Confluence Adapter Requirements

### Business Requirements
- **Primary Use Case**: Enterprise wiki and documentation retrieval
- **Content Types**: Pages, attachments, comments, page metadata
- **Search Requirements**: Full-text search, space filtering, page hierarchy navigation
- **Authentication**: Personal Access Tokens, OAuth2 flows
- **Rate Limits**: Respect Atlassian rate limits (typically 10 requests/second)

### Technical Specifications

```typescript
export class ConfluenceAdapter extends SourceAdapter {
  private client: ConfluenceClient;
  private spacesCache: Map<string, SpaceInfo>;
  private pageCache: Map<string, PageContent>;
  
  // Core Implementation Requirements
  async initialize(): Promise<void> {
    // Validate Confluence instance connectivity
    // Authenticate using configured credentials
    // Cache available spaces and permissions
    // Initialize page indexing for configured spaces
  }
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Use Confluence CQL (Confluence Query Language)
    // Support space filtering via filters.categories
    // Handle pagination for large result sets
    // Extract and normalize content for consistent formatting
  }
  
  async searchRunbooks(alertType: string, severity: string, affectedSystems: string[]): Promise<Runbook[]> {
    // Search using CQL with runbook-specific labels
    // Parse structured runbook content from pages
    // Extract decision trees from page content
    // Map page metadata to runbook confidence scores
  }
}
```

### Configuration Schema
```yaml
sources:
  - name: confluence-ops
    type: confluence
    base_url: https://company.atlassian.net/wiki
    auth:
      type: bearer_token
      token_env: CONFLUENCE_TOKEN
    spaces: ["OPS", "RUNBOOKS", "INCIDENT"]  # Configurable space filtering
    page_size: 50                            # Pagination size
    max_attachment_size_mb: 25               # Attachment processing limit
    cache_attachments: false                 # Whether to cache binary content
```

### Authentication Requirements
- **Bearer Token**: Personal Access Token (primary method)
- **OAuth2**: Full OAuth2 flow for enterprise SSO integration
- **Basic Auth**: Username/password fallback (legacy support)
- **Token Validation**: Automatic token refresh and validation
- **Permission Handling**: Respect user permissions and space access

### Content Processing Requirements
- **HTML to Markdown**: Convert Confluence HTML to clean markdown
- **Macro Expansion**: Handle Confluence macros (code blocks, info panels)
- **Attachment Extraction**: Index attachment metadata, optionally extract text
- **Link Resolution**: Convert internal links to searchable references
- **Version Handling**: Track page versions and update timestamps

### Performance Requirements
- **Cold Query**: <500ms for uncached Confluence API calls
- **Cached Query**: <150ms for cached content retrieval
- **Concurrent Requests**: Support 10+ concurrent queries
- **Rate Limit Compliance**: Automatic throttling with exponential backoff
- **Circuit Breaker**: Automatic failover when Confluence unavailable

### Error Handling Requirements
```typescript
// Confluence-specific error scenarios
- AuthenticationError: Invalid or expired tokens
- PermissionError: Insufficient space/page permissions  
- RateLimitError: API rate limit exceeded
- NetworkError: Confluence instance unreachable
- ContentError: Malformed page content or macros
```

---

## 2. GitHub Adapter Requirements

### Business Requirements
- **Primary Use Case**: Repository documentation, wikis, README files, issues
- **Content Types**: README files, wiki pages, docs/ directories, issue descriptions
- **Search Requirements**: Repository search, file content search, issue search
- **Authentication**: Personal Access Tokens, GitHub Apps
- **Rate Limits**: GitHub API rate limits (5000 requests/hour authenticated)

### Technical Specifications

```typescript
export class GitHubAdapter extends SourceAdapter {
  private octokit: Octokit;
  private repositoryCache: Map<string, RepoInfo>;
  private contentCache: Map<string, FileContent>;
  
  async initialize(): Promise<void> {
    // Authenticate with GitHub API
    // Validate repository access permissions
    // Index configured repositories and documentation paths
    // Set up webhook endpoints for real-time updates (optional)
  }
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Use GitHub search API for code and repositories
    // Search across README files, wiki pages, docs/ directories
    // Support repository filtering via filters.categories
    // Parse markdown content and extract metadata
  }
}
```

### Configuration Schema
```yaml
sources:
  - name: github-docs
    type: github
    base_url: https://api.github.com
    auth:
      type: bearer_token
      token_env: GITHUB_TOKEN
    repositories:
      - "company/ops-runbooks"
      - "company/infrastructure-docs"
      - "company/incident-response"
    content_paths:
      - "docs/"
      - "runbooks/"
      - "*.md"
    include_wikis: true
    include_issues: false
```

### Content Processing Requirements
- **Markdown Processing**: Native markdown parsing and rendering
- **Code Block Extraction**: Extract and index code examples
- **Link Resolution**: Handle relative links and cross-references
- **Branch Management**: Support for main/master branch content
- **File Size Limits**: Skip large binary files, focus on documentation

### Webhook Integration (Optional)
```typescript
// Real-time updates via GitHub webhooks
interface GitHubWebhookHandler {
  onPush(repository: string, files: string[]): Promise<void>;
  onWikiUpdate(repository: string, pages: string[]): Promise<void>;
  onIssueUpdate(repository: string, issue: Issue): Promise<void>;
}
```

---

## 3. Database Adapter Requirements

### Business Requirements
- **Primary Use Case**: Structured runbook storage in databases
- **Supported Databases**: PostgreSQL, MongoDB, MySQL (future)
- **Query Types**: SQL queries, MongoDB aggregations, full-text search
- **Schema Flexibility**: Support for different runbook table structures
- **Connection Pooling**: Efficient connection management

### Technical Specifications

```typescript
export class DatabaseAdapter extends SourceAdapter {
  private connectionPool: ConnectionPool<DatabaseConnection>;
  private queryBuilder: QueryBuilder;
  private schemaValidator: SchemaValidator;
  
  async initialize(): Promise<void> {
    // Establish database connection with pooling
    // Validate database schema and table structure
    // Create indexes for optimal search performance
    // Test query performance and connection stability
  }
  
  async searchRunbooks(alertType: string, severity: string, affectedSystems: string[]): Promise<Runbook[]> {
    // Execute parameterized queries to prevent SQL injection
    // Support both SQL and NoSQL query patterns
    // Map database results to Runbook schema
    // Handle complex joins for related procedure data
  }
}
```

### Configuration Schema
```yaml
sources:
  - name: ops-database
    type: database
    connection:
      type: postgresql
      host: db.ops.company.com
      port: 5432
      database: operational_docs
      username_env: DB_USERNAME
      password_env: DB_PASSWORD
      ssl: true
      pool_size: 10
    schema:
      runbooks_table: runbooks
      procedures_table: procedures
      decision_trees_table: decision_trees
    query_timeout_ms: 5000
    max_result_size: 1000
```

### Query Requirements
```sql
-- PostgreSQL runbook search query example
SELECT r.id, r.title, r.content, r.severity, r.confidence_score,
       array_agg(p.name) as procedures,
       dt.branches as decision_tree
FROM runbooks r
LEFT JOIN procedures p ON r.id = p.runbook_id
LEFT JOIN decision_trees dt ON r.decision_tree_id = dt.id
WHERE r.triggers @> $1::jsonb  -- alertType match
  AND r.severity = $2          -- severity match
  AND r.systems && $3::text[]  -- affected systems overlap
ORDER BY r.confidence_score DESC, r.updated_at DESC
LIMIT $4;
```

### Security Requirements
- **Connection Security**: SSL/TLS encryption for all database connections
- **Query Parameterization**: All queries use parameterized statements
- **Credential Management**: Database credentials stored in environment variables
- **Access Control**: Read-only database user with minimal permissions
- **Query Logging**: Log all database queries for security auditing

---

## 4. Notion Adapter Requirements

### Business Requirements
- **Primary Use Case**: Modern documentation platform integration
- **Content Types**: Pages, databases, blocks, properties
- **Search Requirements**: Full-text search across pages and databases
- **Authentication**: Internal integrations with API tokens
- **Rate Limits**: Notion API limits (3 requests/second)

### Technical Specifications

```typescript
export class NotionAdapter extends SourceAdapter {
  private notion: Client;
  private databaseCache: Map<string, DatabaseInfo>;
  private pageCache: Map<string, PageContent>;
  private blockParser: NotionBlockParser;
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Use Notion search API with query filtering
    // Parse complex block structures (headers, lists, tables)
    // Extract database properties and relations
    // Convert Notion blocks to markdown for consistent formatting
  }
}
```

### Configuration Schema
```yaml
sources:
  - name: notion-ops
    type: notion
    auth:
      type: bearer_token
      token_env: NOTION_TOKEN
    databases:
      - "runbooks-database-id"
      - "procedures-database-id"
    include_pages: true
    max_depth: 3  # Maximum page hierarchy depth
```

### Content Processing Requirements
- **Block Parsing**: Handle all Notion block types (text, headings, lists, tables)
- **Database Integration**: Query Notion databases with property filtering
- **Rich Text Extraction**: Convert Notion rich text to plain text/markdown
- **Relation Handling**: Follow page relations and references
- **Property Mapping**: Map Notion properties to runbook metadata

---

## 5. Web Adapter Requirements

### Business Requirements
- **Primary Use Case**: Generic REST API integration and web scraping
- **Content Types**: JSON APIs, XML feeds, HTML pages, RSS feeds
- **Authentication**: API keys, OAuth2, basic auth, custom headers
- **Content Extraction**: Intelligent content extraction from web pages
- **Rate Limiting**: Configurable rate limiting per endpoint

### Technical Specifications

```typescript
export class WebAdapter extends SourceAdapter {
  private httpClient: AxiosInstance;
  private contentExtractor: ContentExtractor;
  private rateLimiter: RateLimiter;
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    // Execute HTTP requests to configured endpoints
    // Parse JSON/XML/HTML responses
    // Extract meaningful content using configurable selectors
    // Apply rate limiting and retry logic
  }
}
```

### Configuration Schema
```yaml
sources:
  - name: ops-api
    type: web
    endpoints:
      - url: https://api.ops.company.com/runbooks
        method: GET
        auth:
          type: api_key
          header: X-API-Key
          key_env: OPS_API_KEY
        content_type: json
        rate_limit: 10  # requests per minute
      - url: https://docs.ops.company.com
        method: GET
        content_type: html
        selectors:
          title: "h1"
          content: ".documentation-content"
        rate_limit: 30
```

---

## Cross-Adapter Requirements

### 1. Authentication Framework

**Multi-Protocol Support:**
```typescript
interface AuthenticationProvider {
  validateCredentials(): Promise<boolean>;
  refreshToken(): Promise<string>;
  getAuthHeaders(): Record<string, string>;
  handleAuthError(error: AuthError): Promise<void>;
}

// Supported authentication types
type AuthType = 'bearer_token' | 'basic_auth' | 'api_key' | 'oauth2' | 'custom';
```

**Security Requirements:**
- Environment variable credential storage
- Automatic token refresh and validation  
- Secure credential rotation support
- Audit logging for authentication events
- Support for enterprise SSO integration

### 2. Error Handling & Resilience

**Circuit Breaker Pattern:**
```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;        // Failures before opening circuit
  recoveryTimeout: number;         // Milliseconds before retry attempt
  monitoringWindow: number;        // Window for failure rate calculation
  halfOpenRetryLimit: number;      // Retries in half-open state
}
```

**Retry Strategy:**
```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;               // Initial delay in milliseconds
  maxDelay: number;                // Maximum delay cap
  backoffMultiplier: number;       // Exponential backoff factor
  retryableErrors: string[];       // Error codes that trigger retry
}
```

### 3. Content Normalization Pipeline

**Content Processing Chain:**
```typescript
interface ContentProcessor {
  extractText(content: any): string;
  normalizeFormat(content: string): string;
  extractMetadata(content: any): Record<string, any>;
  generateSearchableContent(content: any): string;
  calculateConfidenceScore(match: any): ConfidenceScore;
}
```

**Standardized Output Format:**
```typescript
// All adapters must return consistent SearchResult format
interface SearchResult {
  id: string;                      // Unique identifier across sources
  title: string;                   // Human-readable title
  content: string;                 // Normalized content (markdown preferred)
  source: string;                  // Adapter source name
  source_type: SourceType;         // Adapter type identifier
  confidence_score: ConfidenceScore; // 0.0-1.0 match confidence
  match_reasons: string[];         // Why this result was selected
  retrieval_time_ms: number;       // Performance tracking
  url?: string;                    // Original source URL
  last_updated: string;            // ISO timestamp
  metadata?: Record<string, any>;  // Source-specific metadata
}
```

### 4. Performance Requirements

**Response Time Targets:**
```typescript
interface PerformanceTargets {
  cachedQuery: 150;        // milliseconds - cached content retrieval
  uncachedQuery: 500;      // milliseconds - cold API calls
  healthCheck: 100;        // milliseconds - adapter health verification
  initialization: 5000;    // milliseconds - adapter startup time
}
```

**Concurrency Requirements:**
- **Concurrent Queries**: 10+ simultaneous queries per adapter
- **Connection Pooling**: Efficient connection reuse for database/HTTP
- **Rate Limit Management**: Automatic throttling with queue management
- **Memory Management**: Bounded memory usage with LRU cache eviction

### 5. Monitoring & Observability

**Adapter Metrics:**
```typescript
interface AdapterMetrics {
  requestCount: number;            // Total requests processed
  errorCount: number;              // Total errors encountered
  avgResponseTime: number;         // Average response time in ms
  cacheHitRate: number;           // Cache effectiveness (0.0-1.0)
  lastHealthCheck: string;        // ISO timestamp of last health check
  documentCount: number;          // Total documents indexed
  authSuccessRate: number;        // Authentication success rate
}
```

**Prometheus Metrics Export:**
```typescript
// Metrics exported for monitoring systems
- pp_adapter_requests_total{adapter, operation}
- pp_adapter_errors_total{adapter, error_type}
- pp_adapter_response_time_seconds{adapter, operation}
- pp_adapter_cache_hit_rate{adapter}
- pp_adapter_health_status{adapter}
```

---

## Implementation Priorities

### Week 4: Core Enterprise Adapters
**Days 1-3: Confluence Adapter**
- Authentication framework implementation
- CQL query integration
- Content extraction and normalization
- Basic health monitoring

**Days 4-6: GitHub Adapter**  
- Octokit integration
- Repository content indexing
- Markdown processing pipeline
- Rate limit management

### Week 5: Structured Data & Modern Platforms
**Days 1-3: Database Adapter**
- PostgreSQL/MongoDB drivers
- Query builder and parameterization
- Connection pooling and security
- Schema validation framework

**Days 4-6: Notion Adapter**
- Notion API client integration
- Block parsing and content extraction
- Database property mapping
- Rich text processing

### Week 6: Universal Connectivity
**Days 1-6: Web Adapter**
- HTTP client with authentication support
- Content extraction for multiple formats
- Rate limiting and retry logic
- Configurable endpoint management

---

## Testing Strategy

### Unit Testing Requirements
```typescript
// Each adapter must include comprehensive unit tests
describe('ConfluenceAdapter', () => {
  it('should authenticate successfully with valid token');
  it('should handle rate limiting gracefully');
  it('should parse Confluence content correctly');
  it('should handle network failures with circuit breaker');
  it('should maintain cache consistency');
});
```

### Integration Testing Requirements
- **Live API Testing**: Test against real API endpoints with test data
- **Error Scenario Testing**: Network failures, authentication errors, rate limits
- **Performance Testing**: Response time validation under load
- **Security Testing**: Credential handling and data sanitization
- **Cache Testing**: Cache invalidation and consistency validation

### End-to-End Testing
```typescript
// Full workflow testing
describe('Multi-Adapter Integration', () => {
  it('should aggregate results from multiple sources');
  it('should handle partial source failures gracefully');
  it('should maintain response time targets');
  it('should preserve result ranking and confidence scores');
});
```

---

## Security Considerations

### 1. Credential Management
- **Environment Variables**: All credentials stored in environment variables
- **Encryption at Rest**: Consider encrypted credential storage for production
- **Rotation Support**: Automatic handling of credential rotation
- **Audit Logging**: Log all authentication attempts and failures
- **Least Privilege**: Use read-only accounts with minimal required permissions

### 2. Data Protection
- **Data Sanitization**: Remove sensitive information from logs and responses
- **Content Filtering**: Configurable filtering of sensitive content types
- **Secure Transmission**: TLS encryption for all external communications
- **Memory Protection**: Clear sensitive data from memory after use

### 3. Input Validation
```typescript
// All adapter inputs must be validated
interface InputValidator {
  validateQuery(query: string): boolean;
  sanitizeFilters(filters: SearchFilters): SearchFilters;
  validateConfiguration(config: SourceConfig): ValidationResult;
  checkPermissions(operation: string, resource: string): boolean;
}
```

---

## Success Criteria

### Functional Requirements ✅
- [ ] All 5 adapters implemented and tested
- [ ] Comprehensive authentication support for all adapter types
- [ ] Consistent SearchResult format across all adapters
- [ ] Error handling and circuit breaker patterns implemented
- [ ] Configuration system supports all adapter types

### Performance Requirements ✅
- [ ] <150ms response time for cached queries
- [ ] <500ms response time for uncached queries  
- [ ] 10+ concurrent queries per adapter
- [ ] 95%+ authentication success rate
- [ ] 80%+ cache hit rate for repeated queries

### Quality Requirements ✅
- [ ] 90%+ unit test coverage for all adapters
- [ ] Integration tests for all external dependencies
- [ ] Security validation for credential handling
- [ ] Performance benchmarks meet targets
- [ ] Documentation complete for all adapters

### Integration Requirements ✅
- [ ] Full MCP protocol compatibility maintained
- [ ] REST API endpoints work with all adapters
- [ ] Caching system integrated with all adapters
- [ ] Monitoring and metrics collection operational
- [ ] Health checks and error reporting functional

---

## Conclusion

Phase 2 adapter requirements provide a comprehensive framework for enterprise-grade multi-source integration. The well-designed adapter framework from Phase 1 provides an excellent foundation for implementing these requirements with minimal risk.

**Key Success Factors:**
1. **Leverage Existing Framework**: Build on proven `SourceAdapter` interface
2. **Security First**: Implement comprehensive credential and data protection
3. **Performance Focus**: Meet enterprise response time and concurrency requirements
4. **Error Resilience**: Handle external system failures gracefully
5. **Consistent Quality**: Maintain testing and monitoring standards across all adapters

**Risk Mitigation:**
- Start with highest-priority adapters (Confluence, GitHub)
- Implement comprehensive testing for each adapter before production
- Use circuit breaker patterns to isolate adapter failures
- Maintain backwards compatibility with existing Phase 1 functionality

This specification provides a clear roadmap for Phase 2 implementation while ensuring enterprise-grade quality, security, and performance standards.