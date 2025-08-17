# Database Adapter - Enterprise Multi-Database Integration

The Database Adapter provides enterprise-grade integration with multiple database systems, enabling intelligent documentation retrieval from structured data sources with advanced features like semantic search, connection pooling, and automatic schema discovery.

## Overview

The Database Adapter is a production-ready solution that supports multiple database types and provides:

- **Multi-Database Support**: PostgreSQL, MongoDB, MySQL, MariaDB, SQLite, SQL Server, Oracle
- **Enterprise Features**: Connection pooling, caching, monitoring, security hardening
- **Intelligent Content Processing**: Automatic runbook detection, content categorization
- **Performance Optimization**: Sub-200ms response times, 25+ concurrent connections
- **Semantic Search Integration**: Enhanced search capabilities with ML-powered relevance
- **Automatic Schema Discovery**: Dynamic table/collection detection and mapping

## Supported Databases

| Database | Type | Features | Performance |
|----------|------|----------|-------------|
| **PostgreSQL** | SQL | Full-text search, JSON support, advanced indexing | Excellent |
| **MongoDB** | NoSQL | Document storage, aggregation pipeline, flexible schema | Excellent |
| **MySQL/MariaDB** | SQL | Wide compatibility, proven reliability | Very Good |
| **SQLite** | SQL | Embedded, zero-configuration, perfect for development | Good |
| **SQL Server** | SQL | Enterprise features, T-SQL support, Windows integration | Very Good |
| **Oracle** | SQL | Enterprise-grade, advanced analytics, high performance | Excellent |

## Architecture

### Component Architecture

```
DatabaseAdapter
├── ConnectionManager     # Multi-database connection pooling
├── QueryBuilder         # Dynamic SQL/NoSQL query construction
├── ContentProcessor     # Intelligent content processing & runbook detection
├── SchemaDetector      # Automatic schema discovery & mapping
├── CacheManager        # Query result caching & optimization
└── SemanticIntegration # Enhanced search capabilities
```

### Data Flow

```
Client Request → DatabaseAdapter → QueryBuilder → ConnectionManager → Database
                                ↓
SearchResult ← ContentProcessor ← QueryResult ← Database Connection
                                ↓
             CacheManager ← (Cache for future requests)
```

## Quick Start

### 1. Basic Configuration

Create a database source configuration in your `config.yaml`:

```yaml
sources:
  - name: "postgres-knowledge-base"
    type: "database"
    connection:
      type: "postgresql"
      host: "localhost"
      port: 5432
      database: "knowledge_base"
      username_env: "DB_USER"
      password_env: "DB_PASSWORD"
      ssl: true
      pool_size: 20
    
    schema:
      tables:
        - name: "documentation"
          title_field: "title"
          content_field: "content"
          category_field: "category"
          type: "documentation"
        
        - name: "runbooks"
          title_field: "name"
          content_field: "procedure"
          category_field: "severity"
          type: "runbook"
    
    refresh_interval: "30m"
    priority: 1
    enabled: true
```

### 2. Environment Variables

Set up your database credentials:

```bash
export DB_USER="your_username"
export DB_PASSWORD="your_password"
```

### 3. Start the Server

```bash
npm start
```

## Configuration Reference

### Connection Configuration

#### PostgreSQL
```yaml
connection:
  type: "postgresql"
  host: "localhost"
  port: 5432
  database: "knowledge_base"
  username_env: "POSTGRES_USER"
  password_env: "POSTGRES_PASSWORD"
  ssl: true
  ssl_cert_path: "/path/to/client-cert.pem"  # Optional
  ssl_key_path: "/path/to/client-key.pem"    # Optional
  ssl_ca_path: "/path/to/ca-cert.pem"        # Optional
  pool_size: 20
  connection_timeout_ms: 30000
  idle_timeout_ms: 300000
  max_lifetime_ms: 1800000
```

#### MongoDB
```yaml
connection:
  type: "mongodb"
  database: "documentation"
  uri_env: "MONGODB_URI"  # mongodb://username:password@host:port/database
  ssl: true
  pool_size: 30
  connection_timeout_ms: 30000
```

#### MySQL/MariaDB
```yaml
connection:
  type: "mysql"  # or "mariadb"
  host: "localhost"
  port: 3306
  database: "docs"
  username_env: "MYSQL_USER"
  password_env: "MYSQL_PASSWORD"
  ssl: true
  pool_size: 15
```

#### SQLite
```yaml
connection:
  type: "sqlite"
  database: "/path/to/database.db"  # or ":memory:" for in-memory
  pool_size: 1  # SQLite is single-threaded
```

### Schema Mapping

#### SQL Tables
```yaml
schema:
  tables:
    - name: "documentation"
      title_field: "title"           # Required: Document title
      content_field: "content"       # Required: Main content
      category_field: "category"     # Optional: Content category
      updated_field: "updated_at"    # Optional: Last modified date
      author_field: "author"         # Optional: Content author
      tags_field: "tags"             # Optional: Document tags
      metadata_field: "metadata"     # Optional: Additional metadata
      type: "documentation"          # Content type: documentation, runbook, faq, procedure
      filters:                       # Optional: Additional WHERE conditions
        published: true
        status: "active"
```

#### MongoDB Collections
```yaml
schema:
  collections:
    - name: "articles"
      title_field: "title"
      content_field: "body"
      category_field: "category"
      updated_field: "updatedAt"
      type: "documentation"
```

### Performance Configuration

```yaml
performance:
  query_timeout_ms: 15000           # Query execution timeout
  max_concurrent_queries: 25        # Maximum concurrent database queries
  cache_ttl_seconds: 3600          # Cache time-to-live
  enable_query_optimization: true   # Enable query optimization
```

## Features

### 1. Intelligent Content Processing

The adapter automatically:
- **Detects Runbooks**: Uses ML patterns to identify operational procedures
- **Categorizes Content**: Automatically classifies documentation types
- **Extracts Metadata**: Pulls relevant information from database fields
- **Sanitizes Content**: Removes potentially dangerous content and scripts

### 2. Automatic Schema Discovery

```typescript
// The adapter can automatically discover your database schema
const detectionResult = await adapter.detectSchema();

console.log('Found tables:', detectionResult.tables.length);
console.log('Documentation tables:', detectionResult.documentationTables.length);
```

### 3. Advanced Query Building

The adapter supports complex queries across all database types:

```typescript
// SQL databases: Dynamic query building with type safety
const sqlQuery = queryBuilder
  .select(['title', 'content', 'category'])
  .from('documentation')
  .where('published', 'eq', true)
  .search('incident response', ['title', 'content'])
  .orderBy('updated_at', 'DESC')
  .limit(50)
  .build();

// MongoDB: Aggregation pipeline and filters
const mongoQuery = queryBuilder
  .from('articles')
  .where('category', { $in: ['runbook', 'procedure'] })
  .search('database failure', ['title', 'content'])
  .orderBy('updatedAt', 'DESC')
  .build();
```

### 4. Enterprise Connection Management

- **Connection Pooling**: Efficient resource management with configurable pool sizes
- **Health Monitoring**: Continuous monitoring of connection health and performance
- **Failover Support**: Automatic retry and circuit breaker patterns
- **SSL/TLS Security**: Full encryption support for all database types

### 5. Intelligent Caching

```typescript
// Multi-tier caching with intelligent invalidation
const cacheManager = new CacheManager({
  ttlSeconds: 3600,
  maxKeys: 10000,
  enableQueryCache: true,
  enableCompression: true,
  memoryThresholdMB: 100,
});

// Cache query results with metadata
await cacheManager.cacheQueryResult(
  query,
  parameters,
  result,
  'documentation',
  'search'
);
```

## API Reference

### Search Operations

```typescript
// Basic search
const results = await adapter.search('database troubleshooting');

// Advanced search with filters
const filteredResults = await adapter.search('memory leak', {
  categories: ['runbook'],
  severity: 'critical',
  limit: 10,
  confidence_threshold: 0.7
});

// Get specific document
const document = await adapter.getDocument('database:runbooks:123');
```

### Runbook Operations

```typescript
// Search for runbooks by alert characteristics
const runbooks = await adapter.searchRunbooks(
  'memory_pressure',     // Alert type
  'critical',           // Severity
  ['web-server', 'db'], // Affected systems
  { cpu_usage: '90%' }  // Additional context
);
```

### Health and Monitoring

```typescript
// Check adapter health
const health = await adapter.healthCheck();
console.log('Healthy:', health.healthy);
console.log('Response time:', health.response_time_ms);

// Get performance metrics
const metadata = await adapter.getMetadata();
console.log('Documents indexed:', metadata.documentCount);
console.log('Average response time:', metadata.avgResponseTime);
```

### Index Management

```typescript
// Refresh content index
const success = await adapter.refreshIndex();

// Force complete refresh
const forceSuccess = await adapter.refreshIndex(true);
```

## Performance Optimization

### Database Optimization

1. **Indexing Strategy**:
   ```sql
   -- PostgreSQL example
   CREATE INDEX idx_documentation_title ON documentation USING gin(to_tsvector('english', title));
   CREATE INDEX idx_documentation_content ON documentation USING gin(to_tsvector('english', content));
   CREATE INDEX idx_documentation_category ON documentation(category);
   CREATE INDEX idx_documentation_updated ON documentation(updated_at DESC);
   ```

2. **Connection Pool Tuning**:
   - PostgreSQL/MySQL: 10-30 connections
   - MongoDB: 20-50 connections
   - SQL Server: 15-40 connections
   - SQLite: 1 connection (single-threaded)

3. **Query Optimization**:
   - Enable query optimization in configuration
   - Use appropriate WHERE clause filters
   - Limit result sets with pagination
   - Consider database-specific optimizations

### Caching Strategy

```yaml
cache:
  enabled: true
  strategy: "hybrid"  # memory_only, redis_only, or hybrid
  memory:
    max_keys: 10000
    ttl_seconds: 3600
  redis:
    enabled: true
    url: "redis://localhost:6379"
    ttl_seconds: 7200
```

### Performance Targets

| Operation | Target | Typical |
|-----------|--------|---------|
| **Search Query** | <200ms | 50-150ms |
| **Document Retrieval** | <100ms | 25-75ms |
| **Health Check** | <50ms | 10-30ms |
| **Cache Hit** | <10ms | 2-8ms |

## Security

### Connection Security

1. **SSL/TLS Encryption**:
   ```yaml
   connection:
     ssl: true
     ssl_cert_path: "/path/to/client-cert.pem"
     ssl_key_path: "/path/to/client-key.pem"
     ssl_ca_path: "/path/to/ca-cert.pem"
   ```

2. **Environment Variable Management**:
   - Never store credentials in configuration files
   - Use environment variables for all sensitive data
   - Rotate credentials regularly

3. **SQL Injection Prevention**:
   - All queries use parameterization
   - Input validation and sanitization
   - Content security filtering

### Access Control

```yaml
# Database-level security
connection:
  username_env: "DB_READONLY_USER"  # Use read-only accounts
  password_env: "DB_READONLY_PASSWORD"

schema:
  tables:
    - name: "sensitive_docs"
      filters:
        access_level: "public"  # Filter sensitive content
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**:
   ```yaml
   connection:
     connection_timeout_ms: 60000  # Increase timeout
     pool_size: 10                 # Reduce pool size
   ```

2. **Memory Issues**:
   ```yaml
   performance:
     max_concurrent_queries: 10    # Reduce concurrency
     cache_ttl_seconds: 1800      # Reduce cache TTL
   ```

3. **Slow Queries**:
   - Add database indexes on search fields
   - Enable query optimization
   - Use appropriate filters
   - Consider database-specific tuning

### Debug Logging

```yaml
server:
  log_level: "debug"  # Enable detailed logging
```

### Health Monitoring

```bash
# Check adapter health via REST API
curl -X GET http://localhost:3000/api/health

# Get performance metrics
curl -X GET http://localhost:3000/api/performance
```

## Migration Guide

### From Other Documentation Systems

1. **Export Data**: Export your existing documentation to SQL/JSON format
2. **Schema Mapping**: Create appropriate table structures
3. **Configuration**: Set up database adapter configuration
4. **Testing**: Verify search functionality and performance
5. **Deployment**: Deploy with monitoring and backup strategies

### Database Schema Design

```sql
-- Recommended table structure for optimal performance
CREATE TABLE documentation (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    author VARCHAR(100),
    tags TEXT[],  -- PostgreSQL array or JSON in other databases
    metadata JSONB,  -- Store additional metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT true
);

-- Indexes for optimal search performance
CREATE INDEX idx_documentation_title_fts ON documentation USING gin(to_tsvector('english', title));
CREATE INDEX idx_documentation_content_fts ON documentation USING gin(to_tsvector('english', content));
CREATE INDEX idx_documentation_category ON documentation(category);
CREATE INDEX idx_documentation_updated ON documentation(updated_at DESC);
```

## Best Practices

### Schema Design
- Use consistent field naming across tables
- Include timestamps for change detection
- Store metadata in JSON fields for flexibility
- Use appropriate data types for content fields

### Performance
- Monitor query performance and optimize slow queries
- Use connection pooling appropriately
- Implement proper caching strategies
- Consider read replicas for high-load scenarios

### Security
- Use read-only database accounts
- Implement proper access controls
- Encrypt connections and credentials
- Audit database access and changes

### Monitoring
- Set up health check monitoring
- Track performance metrics
- Monitor connection pool usage
- Alert on error rates and response times

## Support

For issues, questions, or contributions:

1. **Check Documentation**: Review this guide and configuration examples
2. **Debug Logging**: Enable debug logging for detailed troubleshooting
3. **Performance Monitoring**: Use built-in metrics and health checks
4. **Configuration Validation**: Verify database connectivity and schema mapping

## Examples

See `config/database-sample.yaml` for comprehensive configuration examples covering all supported database types and advanced features.