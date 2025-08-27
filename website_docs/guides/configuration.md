# Configuration Guide

Comprehensive guide to configuring Personal Pipeline for your environment, including source adapters, caching, security, and performance optimization.

## Overview

Personal Pipeline uses YAML configuration files with environment variable support for secure credential management. This guide covers all configuration options and best practices.

## Configuration File Structure

### Basic Structure

```yaml
# config/config.yaml
server:
  port: 3000
  host: '0.0.0.0'

sources:
  - name: "local-docs"
    type: "file"
    base_url: "./docs"
    recursive: true
    max_depth: 5
    watch_changes: true
    supported_extensions:
      - '.md'
      - '.txt'
      - '.json'
      - '.yml'

cache:
  strategy: "memory"  # or "hybrid" with Redis
  ttl: 300
  max_size: "100mb"
  redis:
    enabled: false  # set to true and provide url to enable
    url: "redis://localhost:6379"
    ttl: 3600

logging:
  level: "info"
  format: "json"
```

## Source Adapter Configuration

Personal Pipeline supports multiple documentation sources through a pluggable adapter framework. Each adapter type has specific configuration requirements.

### FileSystem Adapter

**Basic Configuration**
```yaml
sources:
  - name: "local-runbooks"
    type: "file"
    base_url: "./runbooks"
    refresh_interval: "5m"
    priority: 1
    enabled: true
    timeout_ms: 5000
    max_retries: 1
    
    # Enhanced features
    watch_changes: true
    pdf_extraction: true
    recursive: true
    max_depth: 5
    extract_metadata: true
    
    supported_extensions: 
      - '.md'
      - '.txt' 
      - '.json'
      - '.yml'
      - '.yaml'
      - '.pdf'
      - '.rst'
      
    file_patterns:
      include: []
      exclude: 
        - '**/node_modules/**'
        - '**/.git/**'
        - '**/tmp/**'
```

### Web Adapter ✅ (Implemented)

For REST APIs and web content sources:

```yaml
sources:
  - name: "api-docs"
    type: "web"
    base_url: "https://api.example.com"
    auth:
      type: "bearer_token"
      token_env: "API_TOKEN"
    endpoints:
      - path: "/docs"
        method: "GET"
        content_type: "json"
      - path: "/knowledge"
        method: "GET" 
        content_type: "html"
    performance:
      timeout_ms: 10000
      max_retries: 3
      rate_limit_per_minute: 60
```


## Server Configuration

### Basic Server Settings

```yaml
server:
  port: 3000                    # Server port
  host: '0.0.0.0'              # Bind address
  max_request_size: '10mb'      # Maximum request size
  timeout: 30000               # Request timeout (ms)
  keep_alive: true             # HTTP keep-alive
  
  # HTTPS configuration (optional)
  https:
    enabled: false
    cert_file: '/path/to/cert.pem'
    key_file: '/path/to/key.pem'
    
  # Security headers
  security:
    cors:
      enabled: true
      origins: ['http://localhost:3000']
    helmet:
      enabled: true
      content_security_policy: true
```

### Advanced Server Settings

```yaml
server:
  # Process management
  cluster:
    enabled: false             # Enable cluster mode
    workers: 'auto'           # Number of workers ('auto' = CPU cores)
    
  # Rate limiting
  rate_limiting:
    enabled: true
    window_ms: 60000          # 1 minute window
    max_requests: 100         # Max requests per window
    
  # Request logging
  request_logging:
    enabled: true
    format: 'combined'        # 'combined', 'common', 'dev'
    exclude_paths: ['/health', '/metrics']
```

## Source Adapter Configuration

### File System Adapter

```yaml
sources:
  - name: "local-docs"
    type: "filesystem"
    path: "./docs"                    # Directory path
    recursive: true                   # Scan subdirectories
    file_patterns:                    # File patterns to include
      - "*.md"
      - "*.json"
      - "*.yaml"
    exclude_patterns:                 # Patterns to exclude
      - "node_modules/**"
      - ".git/**"
    refresh_interval: "5m"            # Auto-refresh interval
    priority: 1                       # Source priority (1 = highest)
    encoding: "utf-8"                # File encoding
    max_file_size: "10mb"            # Maximum file size
```


### Database Adapter

```yaml
sources:
  - name: "knowledge-db"
    type: "database"
    connection:
      type: "postgresql"              # or "mysql", "mongodb"
      url_env: "DATABASE_URL"
      # Or individual settings:
      # host: "localhost"
      # port: 5432
      # database: "knowledge_base"
      # username_env: "DB_USER"
      # password_env: "DB_PASS"
    queries:
      runbooks: |
        SELECT id, title, content, updated_at, tags
        FROM runbooks 
        WHERE status = 'active'
      procedures: |
        SELECT id, title, steps, category
        FROM procedures
        WHERE published = true
    refresh_interval: "15m"
    priority: 4
    pool_size: 10                     # Connection pool size
```

### Web Scraping Adapter

```yaml
sources:
  - name: "internal-wiki"
    type: "web"
    base_url: "https://wiki.company.com"
    auth:
      type: "session_cookie"
      cookie_env: "WIKI_SESSION"
    crawl_config:
      max_depth: 3                    # Maximum crawl depth
      max_pages: 1000                # Maximum pages to crawl
      delay_ms: 1000                 # Delay between requests
      user_agent: "PersonalPipeline/1.0"
    selectors:
      title: "h1.page-title"
      content: ".page-content"
      last_modified: ".last-updated"
    filters:
      include_paths:
        - "/runbooks/"
        - "/procedures/"
      exclude_paths:
        - "/archive/"
    refresh_interval: "2h"
    priority: 5
```

## Caching Configuration

### Memory Cache

```yaml
cache:
  type: "memory"
  max_size: "100mb"                  # Maximum memory usage
  ttl: 300                          # Time to live (seconds)
  max_items: 10000                  # Maximum cached items
  update_age_on_get: true           # Update age when accessed
  check_period: 60                  # Cleanup interval (seconds)
```

### Redis Cache

```yaml
cache:
  type: "redis"
  url: "redis://localhost:6379"     # Redis URL
  # Or individual settings:
  # host: "localhost"
  # port: 6379
  # password_env: "REDIS_PASSWORD"
  # database: 0
  
  ttl: 3600                         # Default TTL (seconds)
  key_prefix: "pp:"                 # Key prefix
  
  # Connection options
  connection:
    max_retries: 3
    retry_delay_ms: 1000
    connect_timeout: 5000
    command_timeout: 3000
    
  # Circuit breaker
  circuit_breaker:
    enabled: true
    failure_threshold: 5            # Failures before opening
    reset_timeout: 30000           # Reset attempt interval (ms)
    monitor_timeout: 5000          # Health check interval (ms)
```

### Hybrid Cache

```yaml
cache:
  type: "hybrid"
  
  # Primary cache (Redis)
  primary:
    type: "redis"
    url: "redis://localhost:6379"
    ttl: 3600
    
  # Fallback cache (Memory)
  fallback:
    type: "memory"
    max_size: "50mb"
    ttl: 300
    
  # Cache warming
  warming:
    enabled: true
    strategies:
      - "most_accessed"             # Warm most accessed items
      - "recent_searches"           # Warm recent search results
    interval: "1h"                  # Warming interval
```

## Performance Configuration

### Response Time Optimization

```yaml
performance:
  # Response time targets
  targets:
    critical_operations: 150        # ms - runbook searches
    standard_operations: 200        # ms - general searches
    management_operations: 100      # ms - health checks
    
  # Monitoring
  monitoring:
    enabled: true
    metrics_endpoint: "/metrics"
    detailed_logging: false
    alert_thresholds:
      response_time_p95: 500       # 95th percentile threshold
      error_rate: 0.01             # 1% error rate threshold
      
  # Optimization settings
  optimization:
    parallel_searches: true         # Enable parallel source searches
    result_streaming: true          # Stream results as available
    adaptive_timeouts: true         # Adjust timeouts based on source performance
    connection_pooling: true        # Enable connection pooling
```

### Concurrency Settings

```yaml
performance:
  concurrency:
    max_concurrent_requests: 100    # Maximum concurrent requests
    max_concurrent_searches: 10     # Maximum concurrent source searches
    queue_size: 1000               # Request queue size
    worker_threads: 4              # Worker thread pool size
    
  # Resource limits
  limits:
    max_memory_usage: "1gb"        # Maximum memory usage
    max_cpu_usage: 80              # Maximum CPU usage (%)
    max_file_descriptors: 1024     # Maximum open files
```

## Logging Configuration

### Basic Logging

```yaml
logging:
  level: "info"                     # debug, info, warn, error
  format: "json"                    # json, text
  
  # Output destinations
  destinations:
    - type: "console"
      level: "info"
    - type: "file"
      filename: "logs/app.log"
      level: "info"
      max_size: "10mb"
      max_files: 5
      
  # Structured logging
  structured:
    include_timestamp: true
    include_hostname: true
    include_pid: true
    include_trace_id: true
```

### Advanced Logging

```yaml
logging:
  # Request logging
  requests:
    enabled: true
    include_body: false             # Include request/response bodies
    include_headers: false          # Include headers
    exclude_paths: ["/health"]      # Paths to exclude
    
  # Performance logging
  performance:
    enabled: true
    slow_query_threshold: 1000      # Log queries slower than 1s
    include_stack_traces: false     # Include stack traces
    
  # Security logging
  security:
    enabled: true
    log_authentication: true        # Log auth attempts
    log_authorization: true         # Log access denials
    log_rate_limiting: true         # Log rate limit hits
```

## Security Configuration

### Authentication

```yaml
security:
  authentication:
    enabled: false                  # Enable authentication
    provider: "jwt"                 # jwt, basic, apikey
    
    # JWT configuration
    jwt:
      secret_env: "JWT_SECRET"
      algorithm: "HS256"
      expires_in: "1h"
      
    # API key configuration
    apikey:
      header_name: "X-API-Key"
      keys_env: "API_KEYS"          # Comma-separated keys
      
  # Authorization
  authorization:
    enabled: false
    roles:
      admin:
        permissions: ["*"]
      operator:
        permissions: ["search:*", "read:*"]
      viewer:
        permissions: ["read:*"]
```

### Network Security

```yaml
security:
  # Network access control
  network:
    allowed_ips:                    # IP whitelist
      - "127.0.0.1"
      - "10.0.0.0/8"
    blocked_ips:                    # IP blacklist
      - "192.168.1.100"
      
  # TLS configuration
  tls:
    min_version: "1.2"             # Minimum TLS version
    ciphers:                        # Allowed cipher suites
      - "ECDHE-RSA-AES128-GCM-SHA256"
      - "ECDHE-RSA-AES256-GCM-SHA384"
```

## Environment Variables

### Required Variables

```bash
# External integrations (example)

# Database connection
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Redis connection
export REDIS_URL="redis://localhost:6379"
export REDIS_PASSWORD="your_redis_password"

# Security
export JWT_SECRET="your_jwt_secret"
export API_KEYS="key1,key2,key3"
```

### Optional Variables

```bash
# Server configuration
export PORT=3000
export HOST=0.0.0.0
export NODE_ENV=production

# Logging
export LOG_LEVEL=info
export LOG_FORMAT=json

# Performance
export MAX_MEMORY_USAGE=1gb
export MAX_CONCURRENT_REQUESTS=100

# Development
export DEBUG=personal-pipeline:*
```

## Configuration Validation

### Schema Validation

Personal Pipeline validates configuration using JSON Schema:

```bash
# Validate configuration
npm run validate-config

# Output shows validation results:
# ✅ Configuration valid
# ⚠️  Optional field missing: cache.circuit_breaker
# ❌ Invalid value: server.port must be a number
```

### Environment-Specific Configs

```bash
# Development configuration
config/
├── config.yaml              # Default configuration
├── config.development.yaml  # Development overrides
├── config.staging.yaml      # Staging overrides
└── config.production.yaml   # Production overrides

# Set environment
export NODE_ENV=production
```

## Configuration Examples

### Development Setup

```yaml
# config/config.development.yaml
server:
  port: 3000
  host: 'localhost'
  
sources:
  - name: "local-docs"
    type: "filesystem"
    path: "./test-data"
    refresh_interval: "1m"
    
cache:
  type: "memory"
  ttl: 60
  
logging:
  level: "debug"
  format: "text"
```

### Production Setup

```yaml
# config/config.production.yaml
server:
  port: 3000
  host: '0.0.0.0'
  cluster:
    enabled: true
    workers: 'auto'
  rate_limiting:
    enabled: true
    
sources:
  - name: "local-docs"
    type: "file"
    base_url: "./docs"
    recursive: true
    
cache:
  type: "redis"
  url: "redis://redis-cluster:6379"
  ttl: 3600
  circuit_breaker:
    enabled: true
    
logging:
  level: "info"
  format: "json"
  destinations:
    - type: "file"
      filename: "/var/log/personal-pipeline/app.log"
    - type: "console"
      
performance:
  monitoring:
    enabled: true
    alert_thresholds:
      response_time_p95: 200
      error_rate: 0.001
```

## Troubleshooting Configuration

### Common Issues

**Invalid YAML syntax:**
```bash
# Check YAML syntax
yamllint config/config.yaml

# Or use online validator
cat config/config.yaml | python -c "import yaml; yaml.safe_load(input())"
```

**Environment variables not found:**
```bash
# Check if variables are set
env | grep -E "(REDIS|DATABASE)"

# Test variable substitution
node -e "console.log(process.env.DATABASE_URL || 'NOT_SET')"
```

**Source connection failures:**
```bash
# Test local file access
ls -la ./docs

# Check Redis connection
redis-cli -u $REDIS_URL ping
```

## Next Steps

- [Installation Guide](./installation.md) - Getting Personal Pipeline running
- [API Reference](../api/mcp-tools.md) - Using the configured system
- [Source Adapters](../api/adapters.md) - Detailed adapter configuration
- [Security Guide](./security.md) - Advanced security configuration