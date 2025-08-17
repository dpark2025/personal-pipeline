# Source Adapters API

Personal Pipeline uses a pluggable adapter framework to support multiple documentation sources. This guide covers the adapter API, available adapters, and how to implement custom adapters.

## Adapter Framework

### Abstract Base Class

All adapters implement the `SourceAdapter` interface:

```typescript
interface SourceAdapter {
  // Core search functionality
  search(query: string, filters?: SearchFilters): Promise<SearchResult[]>
  getDocument(id: string): Promise<Document>
  searchRunbooks(alertType: string, severity: string, systems?: string[]): Promise<Runbook[]>
  
  // Health and metadata
  healthCheck(): Promise<HealthStatus>
  getMetadata(): AdapterMetadata
  
  // Lifecycle management
  initialize(): Promise<void>
  cleanup(): Promise<void>
}
```

### Search Filters

```typescript
interface SearchFilters {
  document_types?: string[]     // Filter by document type
  tags?: string[]              // Filter by tags
  date_range?: {               // Filter by date range
    start?: Date
    end?: Date
  }
  sources?: string[]           // Filter by specific sources
  limit?: number              // Maximum results
  offset?: number             // Pagination offset
}
```

### Search Results

```typescript
interface SearchResult {
  id: string                  // Unique document identifier
  title: string              // Document title
  summary: string            // Brief summary/excerpt
  content?: string           // Full content (if requested)
  source: string             // Source adapter name
  type: string               // Document type
  url?: string               // Original URL (if applicable)
  tags: string[]             // Associated tags
  metadata: {
    author?: string
    created_date?: Date
    modified_date?: Date
    size?: number
    [key: string]: any
  }
  confidence_score: number   // Relevance score (0.0-1.0)
  match_reasons: string[]    // Why this document matched
}
```

## Available Adapters

### FileSystem Adapter ✅

**Status**: Implemented  
**Type**: `file`

Indexes local files and directories with support for multiple formats.

**Supported Formats**:
- Markdown (`.md`)
- Plain text (`.txt`)
- JSON (`.json`)
- YAML (`.yml`, `.yaml`)
- PDF (`.pdf`) - with text extraction
- reStructuredText (`.rst`)
- AsciiDoc (`.adoc`)

**Configuration**:
```yaml
sources:
  - name: "local-docs"
    type: "file"
    base_url: "./docs"
    recursive: true
    max_depth: 5
    watch_changes: true
    pdf_extraction: true
    extract_metadata: true
    
    supported_extensions:
      - '.md'
      - '.txt'
      - '.json'
      - '.yml'
      - '.yaml'
      - '.pdf'
      
    file_patterns:
      include: []
      exclude:
        - '**/node_modules/**'
        - '**/.git/**'
        - '**/tmp/**'
```

**Features**:
- Real-time file change monitoring
- PDF text extraction
- Metadata extraction (author, tags, dates)
- Recursive directory scanning
- Configurable file pattern filtering
- Fast fuzzy search with Fuse.js

**Performance**:
- Index time: ~100ms per file
- Search time: ~10-50ms
- Memory usage: ~1MB per 1000 files

### Confluence Adapter 🚧

**Status**: Phase 2 - Planned  
**Type**: `confluence`

Connects to Atlassian Confluence instances via REST API.

**Planned Configuration**:
```yaml
sources:
  - name: "confluence-ops"
    type: "confluence"
    base_url: "https://company.atlassian.net/wiki"
    auth:
      type: "bearer_token"
      token_env: "CONFLUENCE_TOKEN"
    
    spaces:
      - "OPS"
      - "DEVOPS"
    content_types:
      - "page"
      - "blogpost"
    include_attachments: true
    extract_labels: true
```

**Planned Features**:
- Space and page filtering
- Label and tag extraction
- Attachment handling
- Version history access
- Real-time change notifications

### GitHub Adapter 🚧

**Status**: Phase 2 - Planned  
**Type**: `github`

Indexes documentation from GitHub repositories.

**Planned Configuration**:
```yaml
sources:
  - name: "github-docs"
    type: "github"
    base_url: "https://api.github.com"
    auth:
      type: "token"
      token_env: "GITHUB_TOKEN"
    
    repositories:
      - "company/runbooks"
      - "company/procedures"
    branches:
      - "main"
      - "docs"
    include_wiki: true
```

**Planned Features**:
- Multi-repository support
- Branch-specific indexing
- Wiki integration
- Issue and PR documentation
- Markdown rendering

### Database Adapter 🚧

**Status**: Phase 2 - Planned  
**Type**: `database`

Connects to SQL and NoSQL databases for structured documentation.

**Planned Configuration**:
```yaml
sources:
  - name: "knowledge-db"
    type: "database"
    connection:
      type: "postgresql"
      host: "localhost"
      port: 5432
      database: "knowledge"
      username_env: "DB_USERNAME"
      password_env: "DB_PASSWORD"
    
    tables:
      runbooks:
        table: "runbooks"
        title_column: "title"
        content_column: "content"
        metadata_columns:
          - "tags"
          - "severity"
```

**Planned Features**:
- Multi-database support (PostgreSQL, MySQL, MongoDB)
- Custom query mapping
- Join table support
- Real-time change detection
- Connection pooling

## Adapter API Methods

### search()

Primary search method for finding relevant documents.

```typescript
async search(
  query: string, 
  filters?: SearchFilters
): Promise<SearchResult[]>
```

**Parameters**:
- `query`: Search query string
- `filters`: Optional filtering criteria

**Returns**: Array of search results ordered by relevance

**Example**:
```typescript
const results = await adapter.search("disk space runbook", {
  document_types: ["runbook"],
  limit: 5
});
```

### getDocument()

Retrieve a specific document by ID.

```typescript
async getDocument(id: string): Promise<Document>
```

**Parameters**:
- `id`: Unique document identifier

**Returns**: Complete document with full content

**Example**:
```typescript
const document = await adapter.getDocument("runbook_disk_space_001");
```

### searchRunbooks()

Specialized search for operational runbooks.

```typescript
async searchRunbooks(
  alertType: string, 
  severity: string, 
  systems?: string[]
): Promise<Runbook[]>
```

**Parameters**:
- `alertType`: Type of alert (e.g., "disk_space", "memory_high")
- `severity`: Alert severity level
- `systems`: Affected systems (optional)

**Returns**: Array of relevant runbooks with confidence scores

**Example**:
```typescript
const runbooks = await adapter.searchRunbooks(
  "disk_space_critical",
  "high",
  ["web-server-01"]
);
```

### healthCheck()

Check adapter health and connectivity.

```typescript
async healthCheck(): Promise<HealthStatus>
```

**Returns**: Health status information

```typescript
interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  response_time_ms: number
  last_check: Date
  error_message?: string
  metadata: {
    total_documents: number
    last_index_time: Date
    index_size_mb: number
  }
}
```

### getMetadata()

Get adapter configuration and statistics.

```typescript
getMetadata(): AdapterMetadata
```

**Returns**: Adapter metadata and statistics

```typescript
interface AdapterMetadata {
  name: string
  type: string
  version: string
  supported_features: string[]
  statistics: {
    total_documents: number
    total_size_mb: number
    average_response_time_ms: number
    success_rate: number
  }
  configuration: {
    refresh_interval: string
    timeout_ms: number
    max_retries: number
  }
}
```

## Creating Custom Adapters

### Implementation Template

```typescript
import { SourceAdapter } from '../types';

export class CustomAdapter implements SourceAdapter {
  private config: CustomAdapterConfig;
  private logger: Logger;

  constructor(config: CustomAdapterConfig) {
    this.config = config;
    this.logger = createLogger(`CustomAdapter:${config.name}`);
  }

  async initialize(): Promise<void> {
    // Initialize connections, validate configuration
    this.logger.info('Initializing Custom adapter');
    
    // Perform any setup required
    await this.validateConnection();
    await this.indexDocuments();
  }

  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    this.logger.debug('Searching documents', { query, filters });
    
    try {
      // Implement search logic
      const results = await this.performSearch(query, filters);
      
      return results.map(result => ({
        id: result.id,
        title: result.title,
        summary: this.extractSummary(result.content),
        source: this.config.name,
        type: result.type,
        confidence_score: this.calculateConfidence(result, query),
        match_reasons: this.getMatchReasons(result, query),
        metadata: result.metadata
      }));
    } catch (error) {
      this.logger.error('Search failed', { error, query });
      throw error;
    }
  }

  async getDocument(id: string): Promise<Document> {
    // Implement document retrieval
    return await this.fetchDocument(id);
  }

  async searchRunbooks(
    alertType: string, 
    severity: string, 
    systems?: string[]
  ): Promise<Runbook[]> {
    // Implement runbook-specific search
    const filters = {
      document_types: ['runbook'],
      tags: [alertType, severity, ...(systems || [])]
    };
    
    const results = await this.search(alertType, filters);
    return this.convertToRunbooks(results);
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      await this.validateConnection();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        response_time_ms: responseTime,
        last_check: new Date(),
        metadata: await this.getHealthMetadata()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        response_time_ms: -1,
        last_check: new Date(),
        error_message: error.message,
        metadata: {}
      };
    }
  }

  getMetadata(): AdapterMetadata {
    return {
      name: this.config.name,
      type: 'custom',
      version: '1.0.0',
      supported_features: ['search', 'get_document', 'health_check'],
      statistics: this.getStatistics(),
      configuration: {
        refresh_interval: this.config.refresh_interval,
        timeout_ms: this.config.timeout_ms,
        max_retries: this.config.max_retries
      }
    };
  }

  async cleanup(): Promise<void> {
    // Clean up resources, close connections
    this.logger.info('Cleaning up Custom adapter');
    await this.closeConnections();
  }

  // Private helper methods
  private async validateConnection(): Promise<void> {
    // Implement connection validation
  }

  private async performSearch(query: string, filters?: SearchFilters): Promise<any[]> {
    // Implement actual search logic
    return [];
  }

  private calculateConfidence(result: any, query: string): number {
    // Implement confidence scoring
    return 0.8;
  }

  private getMatchReasons(result: any, query: string): string[] {
    // Implement match reason detection
    return ['title match', 'content relevance'];
  }
}
```

### Registration

Register your custom adapter in the adapter registry:

```typescript
// src/adapters/index.ts
import { CustomAdapter } from './custom-adapter';

export const ADAPTER_REGISTRY = {
  file: FileSystemAdapter,
  confluence: ConfluenceAdapter,
  github: GitHubAdapter,
  database: DatabaseAdapter,
  custom: CustomAdapter  // Add your adapter
};
```

### Configuration Schema

Define a Zod schema for your adapter configuration:

```typescript
export const CustomAdapterConfigSchema = z.object({
  name: z.string(),
  type: z.literal('custom'),
  base_url: z.string().url(),
  auth: z.object({
    type: z.enum(['token', 'basic', 'oauth']),
    token_env: z.string().optional(),
    username_env: z.string().optional(),
    password_env: z.string().optional()
  }).optional(),
  timeout_ms: z.number().default(30000),
  max_retries: z.number().default(3)
});
```

## Performance Guidelines

### Search Performance
- Target response time: < 200ms for standard queries
- Cache frequently accessed documents
- Implement efficient indexing strategies
- Use connection pooling for database adapters

### Memory Management
- Limit in-memory caching to prevent memory leaks
- Implement proper cleanup in the `cleanup()` method
- Stream large documents rather than loading entirely into memory

### Error Handling
- Implement circuit breaker patterns for external services
- Provide meaningful error messages
- Log errors with sufficient context for debugging
- Gracefully degrade when external services are unavailable

### Testing
- Write unit tests for all adapter methods
- Test error conditions and edge cases
- Implement integration tests with real data sources
- Performance test with realistic data volumes

## Adapter Development Tools

### Testing Utilities

```typescript
// Test helper for adapter development
export class AdapterTestHelper {
  static async testAdapter(adapter: SourceAdapter): Promise<TestResults> {
    const results = {
      search: await this.testSearch(adapter),
      getDocument: await this.testGetDocument(adapter),
      healthCheck: await this.testHealthCheck(adapter)
    };
    
    return results;
  }
  
  static async testSearch(adapter: SourceAdapter): Promise<boolean> {
    try {
      const results = await adapter.search('test query');
      return Array.isArray(results);
    } catch (error) {
      return false;
    }
  }
}
```

### Debugging

```typescript
// Enable debug logging for adapter development
export const DEBUG_CONFIG = {
  log_level: 'debug',
  enable_request_logging: true,
  enable_performance_logging: true
};
```

This adapter framework provides a flexible foundation for integrating diverse documentation sources while maintaining consistent search and retrieval capabilities across all sources.