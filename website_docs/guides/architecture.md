# Architecture Overview

Personal Pipeline implements a modular, high-performance architecture designed for intelligent documentation retrieval and incident response automation.

## System Overview

Personal Pipeline follows a modular, event-driven architecture designed for high-performance document retrieval and incident response support. The system follows the Model Context Protocol (MCP) specification and provides intelligent documentation retrieval capabilities.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            System Architecture                              │
└─────────────────────────────────────────────────────────────────────────────┘

CLIENT LAYER:
  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
  │  LangGraph      │    │  External       │    │  Demo Scripts   │
  │  Agent          │    │  Systems        │    │  & Tools        │
  └─────────────────┘    └─────────────────┘    └─────────────────┘
           │                       │                       │
           ▼                       ▼                       ▼
  ┌─────────────────┐    ┌─────────────────────────────────────────┐
  │   MCP Client    │    │          REST Client                    │
  └─────────────────┘    └─────────────────────────────────────────┘

ACCESS LAYER:
  ┌─────────────────┐    ┌─────────────────────────────────────────┐
  │ MCP Protocol    │    │           REST API                      │
  │ Handler         │    │           Layer                         │
  └─────────────────┘    └─────────────────────────────────────────┘
           │                                    │
           └────────────────┬───────────────────┘
                           ▼
CORE ENGINE:
  ┌───────────────────────────────────────────────────────────────────────────┐
  │                          PPMCPTools                                       │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
  │  │ Source Registry │  │ Caching Layer   │  │  Performance Monitor        │ │
  │  │                 │  │                 │  │                             │ │
  │  │ • Adapter Mgmt  │  │ • Redis Cache   │  │ • Metrics Collection        │ │
  │  │ • Health Check  │  │ • Memory Cache  │  │ • Health Monitoring         │ │
  │  │ • Load Balance  │  │ • Circuit Break │  │ • Performance Analytics     │ │
  │  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
  └───────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
ADAPTER FRAMEWORK:
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                          Source Adapters                                    │
  │                                                                             │
  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐ │
  │  │ FileSystem   │ │   Web API    │ │   GitHub     │ │     Confluence      │ │
  │  │   Adapter    │ │   Adapter    │ │   Adapter    │ │     Adapter         │ │
  │  │      ✅       │ │      ✅       │ │  🚧(Planned) │ │   🚧(Planned)       │ │
  │  │ • Local MD   │ │ • REST APIs  │ │ • Repos      │ │ • Spaces            │ │
  │  │ • JSON Data  │ │ • Websites   │ │ • Issues     │ │ • Pages             │ │
  │  │ • Search     │ │ • Content    │ │ • Wiki       │ │ • Search            │ │
  │  │ • Indexing   │ │ • Auth       │ │ • API        │ │ • Auth              │ │
  │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────────────┘ │
  │        ▲               ▲               ▲(Planned)         ▲(Planned)        │
  └────────┼───────────────┼───────────────┼────────────────────┼─────────────────┘
           │               │               │                    │
           ▼               ▼               ▼                    ▼
EXTERNAL SOURCES:
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐
  │ Local Files  │ │   Web APIs   │ │ GitHub Repos │ │     Confluence      │
  │              │ │              │ │              │ │     Spaces          │
  │ • Markdown   │ │ • REST APIs  │ │ • Code Docs  │ │ • Knowledge Base    │
  │ • JSON       │ │ • Websites   │ │ • Runbooks   │ │ • Runbooks          │
  │ • Config     │ │ • Content    │ │ • Issues     │ │ • Procedures        │
  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────────────┘
```

## Core Components

### 1. Dual Access Patterns

**MCP Protocol Access**
- Native integration with LangGraph agents
- 7 specialized MCP tools for documentation retrieval
- Optimized for AI agent workflows
- <200ms response times for most operations

**REST API Access**  
- 11 HTTP endpoints for external integrations
- Standard REST semantics
- JSON request/response format
- Web UI and script integration

### 2. Core Engine

**PPMCPTools Class**
- Orchestrates all 7 MCP tools
- Manages source adapter coordination
- Implements caching strategies
- Provides performance monitoring

**Source Registry**
- Manages multiple documentation sources
- Health checking and failover
- Load balancing across sources
- Adapter lifecycle management

### 3. Adapter Framework

**Abstract Base Class**
All adapters implement the `SourceAdapter` interface:

```typescript
interface SourceAdapter {
  search(query: string, filters?: SearchFilters): Promise<SearchResult[]>
  getDocument(id: string): Promise<Document>
  searchRunbooks(alertType: string, severity: string): Promise<Runbook[]>
  healthCheck(): Promise<HealthStatus>
  getMetadata(): AdapterMetadata
  cleanup(): Promise<void>
}
```

**Current Adapters**
- **FileSystemAdapter**: ✅ Local files and directories (fully implemented)
- **WebAdapter**: ✅ REST APIs and web content (implemented, testing phase)
- **Planned**: GitHubAdapter, ConfluenceAdapter, DatabaseAdapter

### 4. Caching Architecture

**Hybrid Caching System**
- **Redis Layer**: Persistent, distributed caching
- **Memory Layer**: High-speed local cache
- **Circuit Breaker**: Automatic failover protection
- **Cache Warming**: Proactive content loading

**Performance Metrics**
- 60-80% cache hit rate typical
- <50ms cached response times
- Significant MTTR reduction with hybrid caching
- Automatic cache invalidation and warming

### 5. Performance Monitoring

**Real-time Metrics**
- Response time percentiles (P50, P95, P99)
- Cache hit/miss ratios
- Error rates and patterns
- Resource utilization

**Health Monitoring**
- Source adapter health checks
- System resource monitoring
- Automated alerting
- Performance dashboard

## Tool Architecture

### 7 Core MCP Tools

1. **search_runbooks** - Context-aware runbook retrieval
2. **get_decision_tree** - Decision logic for scenarios
3. **get_procedure** - Detailed execution steps
4. **get_escalation_path** - Escalation procedures
5. **list_sources** - Source management
6. **search_knowledge_base** - General documentation search
7. **record_resolution_feedback** - Outcome capture

Each tool provides:
- Input validation with Zod schemas
- Confidence scoring for results
- Performance metrics collection
- Error handling and logging

## Data Flow

### Search Request Flow

```
REQUEST FLOW SEQUENCE:

1. Client Request
   ┌─────────┐     search_runbooks()     ┌─────────────────┐
   │ Client  │ ────────────────────────► │ Personal        │
   │         │                          │ Pipeline API    │
   └─────────┘                          └─────────────────┘

2. Cache Check
   ┌─────────────────┐     check cache key     ┌─────────────┐
   │ Personal        │ ──────────────────────► │ Cache       │
   │ Pipeline API    │                         │ Layer       │
   └─────────────────┘                         └─────────────┘

3a. Cache Hit (60-80% of requests)
   ┌─────────────┐     cached result     ┌─────────────────┐     result     ┌─────────┐
   │ Cache       │ ────────────────────► │ Personal        │ ─────────────► │ Client  │
   │ Layer       │                       │ Pipeline API    │               │         │
   └─────────────┘                       └─────────────────┘               └─────────┘

3b. Cache Miss (20-40% of requests)
   ┌─────────────────┐     forward     ┌─────────────────┐     query     ┌─────────────────┐
   │ Personal        │ ──────────────► │ Source          │ ────────────► │ External        │
   │ Pipeline API    │                 │ Adapter         │               │ Source          │
   └─────────────────┘                 └─────────────────┘               └─────────────────┘
            ▲                                   │                                │
            │           processed result        │         raw data               │
            └───────────────────────────────────┴────────────────────────────────┘

4. Cache Storage & Response
   ┌─────────────────┐     store result     ┌─────────────┐
   │ Personal        │ ───────────────────► │ Cache       │
   │ Pipeline API    │                      │ Layer       │
   └─────────────────┘                      └─────────────┘
            │
            │ final response
            ▼
   ┌─────────┐
   │ Client  │
   │         │
   └─────────┘

PERFORMANCE CHARACTERISTICS:
• Cache Hit:  ~50ms response time
• Cache Miss: ~200ms response time  
• Cache TTL:  5-60 minutes (configurable)
• Hit Rate:   60-80% in typical workloads
```

### Configuration Management

**YAML Configuration**
```yaml
server:
  port: 3000
  host: '0.0.0.0'

sources:
  - name: "local-docs"
    type: "file"
    base_url: "./docs"
    recursive: true
    max_depth: 5
    supported_extensions:
      - '.md'
      - '.txt'
      - '.json'

cache:
  strategy: "hybrid"
  redis:
    enabled: true
    url: "redis://localhost:6379" 
    ttl: 3600
  memory:
    max_size: "50mb"
    ttl: 300

logging:
  level: "info"
  format: "json"
```

## Performance Characteristics

### Response Time Targets
- **Critical runbooks**: < 200ms
- **Standard procedures**: < 300ms  
- **Health checks**: < 50ms
- **Cached responses**: < 50ms

### Scalability
- **Concurrent operations**: 50+ simultaneous
- **Memory usage**: < 500MB baseline
- **CPU efficiency**: < 30% average load
- **Network**: Optimized payload sizes

### Reliability
- **Uptime target**: 99.9%
- **Circuit breaker**: Automatic failover
- **Error recovery**: Graceful degradation
- **Monitoring**: Real-time health checks

## Security Architecture

### Input Validation
- Zod schema validation for all inputs
- SQL injection prevention
- XSS protection on REST endpoints
- Request size limits

### Authentication & Authorization
- Environment variable credential storage
- Token-based authentication for sources
- Role-based access control (planned)
- Audit logging for all operations

### Data Protection
- No sensitive data logging
- Encrypted credential storage
- TLS encryption for external connections
- Secure configuration management

## Development Architecture

### TypeScript Foundation
- Strong type safety throughout
- Interface-driven design
- Comprehensive error handling
- Modern ES2022+ features

### Testing Strategy
- Unit tests for all core components
- Integration tests for adapters
- Performance benchmarking
- End-to-end workflow testing

### Build & Deployment
- Hot reload development environment
- Production-optimized builds
- Docker containerization support
- CI/CD pipeline integration

## Future Enhancements

### Planned Features
- Multi-source parallel search
- Enhanced semantic search with transformers
- Real-time source synchronization
- Advanced caching strategies
- LangGraph workflow integration
- Enhanced AI agent support
- Workflow automation
- Advanced analytics
- Multi-tenant architecture
- Advanced security features
- Compliance and audit trails
- Enterprise monitoring integration

## Monitoring & Observability

### Metrics Collection
- Prometheus-compatible metrics
- Custom performance indicators
- Business logic metrics
- Resource utilization tracking

### Logging Strategy
- Structured JSON logging
- Correlation IDs for tracing
- Performance correlation
- Error aggregation and analysis

### Health Monitoring
- Multi-level health checks
- Dependency health tracking
- Automatic recovery procedures
- Alert escalation paths

This architecture enables Personal Pipeline to deliver enterprise-grade performance while maintaining flexibility for future enhancements and integrations.