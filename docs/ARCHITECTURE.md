# Architecture Documentation

This document provides a comprehensive overview of Personal Pipeline's system architecture, components, and design decisions.

## System Overview

Personal Pipeline is an intelligent Model Context Protocol (MCP) server designed for automated retrieval of internal documentation to support AI-driven monitoring alert response and incident management.

### High-Level Architecture

```mermaid
graph TB
    subgraph "External Clients"
        LA[LangGraph Agent]
        EI[External Integrations]
        DS[Demo Scripts]
        WUI[Web UI]
    end
    
    subgraph "Personal Pipeline Server"
        subgraph "API Layer"
            MCP[MCP Protocol Handler]
            REST[REST API Handler]
            MW[Middleware Layer]
        end
        
        subgraph "Core Engine"
            CE[Core Engine]
            TM[Tool Manager]
            SM[Search Manager]
        end
        
        subgraph "Caching Layer"
            HC[Hybrid Cache]
            MC[Memory Cache]
            RC[Redis Cache]
        end
        
        subgraph "Adapter Framework"
            AR[Adapter Registry]
            FA[File Adapter]
            WA[Web Adapter]
            GA[GitHub Adapter]
            CA[Confluence Adapter]
        end
    end
    
    subgraph "Data Sources"
        LF[Local Files]
        WS[Web Services]
        GR[GitHub Repos]
        CF[Confluence]
    end
    
    LA --> MCP
    EI --> REST
    DS --> REST
    WUI --> REST
    
    MCP --> CE
    REST --> MW
    MW --> CE
    
    CE --> TM
    CE --> SM
    CE --> HC
    
    HC --> MC
    HC --> RC
    
    SM --> AR
    AR --> FA
    AR --> WA
    AR --> GA
    AR --> CA
    
    FA --> LF
    WA --> WS
    GA --> GR
    CA --> CF
```

## Core Components

### 1. API Layer

The API layer provides dual access patterns to accommodate different integration needs:

#### MCP Protocol Handler
- **Purpose**: Native MCP protocol support for LangGraph agents
- **Implementation**: `src/core/server.ts`
- **Features**:
  - 7 core MCP tools
  - Real-time tool execution
  - Structured response formats
  - Error handling and logging

#### REST API Handler
- **Purpose**: HTTP endpoint access for web integrations
- **Implementation**: `src/api/routes.ts`
- **Features**:
  - 11 REST endpoints
  - OpenAPI/Swagger documentation
  - Request validation and transformation
  - Performance monitoring

#### Middleware Layer
- **Purpose**: Cross-cutting concerns for API requests
- **Implementation**: `src/api/middleware.ts`
- **Components**:
  - Request validation
  - Performance monitoring
  - Error handling
  - Security headers
  - CORS support

```mermaid
graph LR
    subgraph "API Layer Architecture"
        subgraph "Request Processing"
            RV[Request Validation]
            RT[Rate Limiting]
            AU[Authentication]
            CO[CORS Handler]
        end
        
        subgraph "Core Processing"
            TT[Tool Transform]
            CE[Core Engine]
            RM[Response Mapping]
        end
        
        subgraph "Response Processing"
            CH[Caching Headers]
            PM[Performance Metrics]
            EH[Error Handling]
            LG[Logging]
        end
    end
    
    RV --> TT
    RT --> TT
    AU --> TT
    CO --> TT
    
    TT --> CE
    CE --> RM
    
    RM --> CH
    RM --> PM
    RM --> EH
    RM --> LG
```

### 2. Core Engine

The core engine coordinates tool execution, search operations, and response generation.

#### Core Server (PersonalPipelineServer)
- **Location**: `src/core/server.ts`
- **Responsibilities**:
  - MCP tool registration and execution
  - Request routing and coordination
  - Error handling and recovery
  - Performance monitoring

#### Tool Manager (PPMCPTools)
- **Location**: `src/tools/index.ts`
- **Features**:
  - 7 core MCP tools implementation
  - Tool validation and execution
  - Response formatting and confidence scoring
  - Caching integration

```typescript
class PPMCPTools {
  // Primary operational tools
  search_runbooks(alertType, severity?, systems?, context?)
  get_decision_tree(scenario, context?)
  get_procedure(procedureId, step?)
  get_escalation_path(severity, context?, businessHours?)
  
  // Supporting tools
  list_sources(includeHealth?)
  search_knowledge_base(query, filters?)
  record_resolution_feedback(incidentId, outcome, feedback?)
}
```

### 3. Search and Intelligence Layer

#### Intelligent Search Engine
- **Location**: `src/search/intelligent-search-engine.ts`
- **Features**:
  - Multi-adapter search coordination
  - Confidence scoring algorithms
  - Result ranking and filtering
  - Performance optimization

#### Query Processing Pipeline
- **Location**: `src/search/query-processing/`
- **Components**:
  - Intent classification
  - Context enhancement
  - Query optimization
  - Operational intelligence

```mermaid
graph LR
    subgraph "Search Pipeline"
        QI[Query Input]
        IC[Intent Classifier]
        CE[Context Enhancer]
        QO[Query Optimizer]
        
        subgraph "Search Execution"
            MS[Multi-Source Search]
            CS[Confidence Scoring]
            RR[Result Ranking]
        end
        
        RF[Formatted Response]
    end
    
    QI --> IC
    IC --> CE
    CE --> QO
    QO --> MS
    MS --> CS
    CS --> RR
    RR --> RF
```

### 4. Caching System

#### Hybrid Caching Architecture
- **Implementation**: `src/utils/cache.ts`
- **Strategy**: Multi-tier caching with intelligent fallback
- **Performance**: <50ms cache hits, graceful degradation

```mermaid
graph TB
    subgraph "Caching Architecture"
        subgraph "Memory Tier"
            L1[L1 Cache - Hot Data]
            L2[L2 Cache - Warm Data]
        end
        
        subgraph "Persistence Tier"
            RC[Redis Cache]
            RCF[Redis Fallback]
        end
        
        subgraph "Cache Management"
            CM[Cache Manager]
            CW[Cache Warmer]
            CI[Cache Invalidation]
        end
    end
    
    CM --> L1
    CM --> L2
    CM --> RC
    
    CW --> L1
    CI --> L1
    CI --> L2
    CI --> RC
    
    RC -.fallback.-> RCF
```

#### Cache Strategies
1. **Hot Path Caching**: Critical runbooks cached in memory
2. **Warm Cache**: Frequently accessed content in Redis
3. **Cold Storage**: Full search index with lazy loading
4. **Cache Warming**: Proactive loading of high-priority content

### 5. Adapter Framework

#### Base Architecture
```typescript
abstract class SourceAdapter {
  abstract search(query: string, filters?: any): Promise<SearchResult[]>
  abstract getDocument(id: string): Promise<Document>
  abstract searchRunbooks(alertType: string, severity?: string, systems?: string[]): Promise<RunbookResult[]>
  abstract healthCheck(): Promise<HealthStatus>
  abstract getMetadata(): Promise<AdapterMetadata>
  abstract cleanup(): Promise<void>
}
```

#### File System Adapter
- **Location**: `src/adapters/file-enhanced.ts`
- **Features**:
  - Recursive directory scanning
  - Multiple format support (MD, JSON, YAML, TXT)
  - Intelligent content indexing
  - Real-time file watching
  - Metadata extraction

```mermaid
graph TB
    subgraph "FileSystem Adapter"
        subgraph "Indexing"
            FS[File Scanner]
            CI[Content Indexer]
            MI[Metadata Indexer]
            FW[File Watcher]
        end
        
        subgraph "Search"
            FTS[Full-Text Search]
            MS[Metadata Search]
            FS2[Fuzzy Search]
        end
        
        subgraph "Caching"
            FC[File Cache]
            IC[Index Cache]
            SC[Search Cache]
        end
    end
    
    FS --> CI
    CI --> MI
    FW --> CI
    
    CI --> FTS
    MI --> MS
    FTS --> FS2
    
    FTS --> FC
    MS --> IC
    FS2 --> SC
```

#### Web Adapter
- **Location**: `src/adapters/web/`
- **Components**:
  - HTTP client with retry logic
  - Content extraction and cleaning
  - Authentication management
  - Rate limiting and circuit breaker
  - URL management and validation

### 6. Configuration System

#### Configuration Manager
- **Location**: `src/utils/config.ts`
- **Features**:
  - YAML configuration parsing
  - Environment variable support
  - Runtime configuration validation
  - Hot configuration reloading

```yaml
# Configuration Structure
server:
  port: 3000
  host: '0.0.0.0'
  
cache:
  strategy: hybrid  # memory | redis | hybrid
  ttl: 300
  
sources:
  - name: "local-runbooks"
    type: "file"
    config: { /* adapter-specific config */ }
    
performance:
  concurrent_searches: 10
  timeout_ms: 5000
```

## Data Flow

### MCP Tool Execution Flow

```mermaid
sequenceDiagram
    participant Client as LangGraph Agent
    participant MCP as MCP Handler
    participant Engine as Core Engine
    participant Cache as Cache Layer
    participant Adapter as Source Adapter
    participant Source as Data Source
    
    Client->>MCP: Tool Call (search_runbooks)
    MCP->>Engine: Process Request
    Engine->>Cache: Check Cache
    
    alt Cache Hit
        Cache-->>Engine: Return Cached Result
    else Cache Miss
        Engine->>Adapter: Search Request
        Adapter->>Source: Query Data
        Source-->>Adapter: Raw Results
        Adapter-->>Engine: Processed Results
        Engine->>Cache: Store Results
    end
    
    Engine-->>MCP: Formatted Response
    MCP-->>Client: Tool Result
```

### REST API Request Flow

```mermaid
sequenceDiagram
    participant Client as External Client
    participant REST as REST API
    participant MW as Middleware
    participant Transform as Transform Layer
    participant Engine as Core Engine
    
    Client->>REST: HTTP Request
    REST->>MW: Validate Request
    MW->>Transform: Transform to Internal Format
    Transform->>Engine: Execute Operation
    Engine-->>Transform: Internal Response
    Transform-->>MW: HTTP Response Format
    MW-->>REST: Add Headers/Metrics
    REST-->>Client: HTTP Response
```

## Performance Architecture

### Response Time Optimization

```mermaid
graph TB
    subgraph "Performance Layers"
        subgraph "Hot Path (< 50ms)"
            HC[Health Checks]
            CC[Cache Hits]
            MD[Metadata Queries]
        end
        
        subgraph "Fast Path (< 200ms)"
            RB[Runbook Retrieval]
            DT[Decision Trees]
            PR[Procedures]
        end
        
        subgraph "Standard Path (< 500ms)"
            FS[Full Search]
            CS[Complex Queries]
            AG[Aggregations]
        end
        
        subgraph "Optimization Techniques"
            PL[Parallel Loading]
            CB[Circuit Breaker]
            RT[Request Throttling]
            IC[Intelligent Caching]
        end
    end
    
    PL --> HC
    PL --> CC
    PL --> MD
    
    CB --> RB
    CB --> DT
    CB --> PR
    
    RT --> FS
    RT --> CS
    RT --> AG
    
    IC --> PL
    IC --> CB
    IC --> RT
```

### Scalability Patterns

1. **Horizontal Scaling**: Multiple server instances with shared cache
2. **Vertical Scaling**: Resource optimization and memory management
3. **Cache Scaling**: Distributed caching with consistent hashing
4. **Adapter Scaling**: Independent scaling of adapter instances

## Security Architecture

### Security Layers

```mermaid
graph TB
    subgraph "Security Architecture"
        subgraph "Network Security"
            CORS[CORS Policy]
            RL[Rate Limiting]
            IP[IP Filtering]
        end
        
        subgraph "Input Security"
            IV[Input Validation]
            XSS[XSS Protection]
            SQLi[Injection Prevention]
        end
        
        subgraph "Authentication"
            JWT[JWT Tokens]
            API[API Keys]
            OAuth[OAuth Integration]
        end
        
        subgraph "Authorization"
            RBAC[Role-Based Access]
            ACL[Access Control Lists]
            PERM[Permission Matrix]
        end
        
        subgraph "Data Security"
            ENC[Encryption at Rest]
            TLS[TLS in Transit]
            LOG[Audit Logging]
        end
    end
```

### Security Features

1. **Input Sanitization**: All inputs validated and sanitized
2. **HTTPS Enforcement**: TLS encryption for all communications
3. **Rate Limiting**: Protection against abuse and DDoS
4. **Audit Logging**: Comprehensive security event logging
5. **Secret Management**: Environment variable based credential storage

## Monitoring and Observability

### Monitoring Stack

```mermaid
graph TB
    subgraph "Observability Stack"
        subgraph "Metrics Collection"
            PM[Performance Metrics]
            UM[Usage Metrics]
            EM[Error Metrics]
            BM[Business Metrics]
        end
        
        subgraph "Logging"
            AL[Application Logs]
            AUL[Audit Logs]
            EL[Error Logs]
            PL[Performance Logs]
        end
        
        subgraph "Health Monitoring"
            HC[Health Checks]
            SC[Service Checks]
            DC[Dependency Checks]
            AC[Adapter Checks]
        end
        
        subgraph "Alerting"
            TH[Threshold Alerts]
            AN[Anomaly Detection]
            SLA[SLA Monitoring]
            ES[Escalation System]
        end
    end
```

### Key Metrics

1. **Performance Metrics**:
   - Response times (P50, P95, P99)
   - Request throughput
   - Cache hit rates
   - Error rates

2. **Business Metrics**:
   - Runbook retrieval success rate
   - Average resolution time improvement
   - User satisfaction scores
   - Knowledge base coverage

3. **System Metrics**:
   - CPU and memory usage
   - Network I/O
   - Disk usage
   - Connection pool status

## Deployment Architecture

### Containerized Deployment

```mermaid
graph TB
    subgraph "Deployment Environment"
        subgraph "Load Balancer"
            LB[Load Balancer]
            SSL[SSL Termination]
        end
        
        subgraph "Application Tier"
            APP1[PP Server 1]
            APP2[PP Server 2]
            APP3[PP Server N]
        end
        
        subgraph "Cache Tier"
            RC[Redis Cluster]
            RCS[Redis Sentinel]
        end
        
        subgraph "Data Sources"
            FS[File Systems]
            WS[Web Services]
            EXT[External APIs]
        end
        
        subgraph "Monitoring"
            MON[Monitoring Stack]
            LOG[Log Aggregation]
            ALERT[Alerting System]
        end
    end
    
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> RC
    APP2 --> RC
    APP3 --> RC
    
    RC --> RCS
    
    APP1 --> FS
    APP1 --> WS
    APP1 --> EXT
    
    APP1 --> MON
    APP2 --> MON
    APP3 --> MON
```

### Docker Configuration

```dockerfile
# Multi-stage build for optimization
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
```

## Development Architecture

### Development Environment

```mermaid
graph TB
    subgraph "Development Environment"
        subgraph "Local Development"
            IDE[IDE/Editor]
            LOCAL[Local Server]
            DEMO[Demo Environment]
        end
        
        subgraph "Testing"
            UNIT[Unit Tests]
            INT[Integration Tests]
            E2E[E2E Tests]
            PERF[Performance Tests]
        end
        
        subgraph "Quality Gates"
            LINT[ESLint]
            TYPE[TypeScript]
            COV[Coverage]
            SEC[Security Scan]
        end
        
        subgraph "CI/CD Pipeline"
            BUILD[Build Process]
            TEST[Test Execution]
            DEPLOY[Deployment]
            MONITOR[Monitoring]
        end
    end
```

### Development Workflow

1. **Local Development**: Hot reload with TypeScript compilation
2. **Testing**: Comprehensive test suite with coverage reporting
3. **Quality Assurance**: Automated linting, type checking, and security scanning
4. **CI/CD**: Automated build, test, and deployment pipeline
5. **Monitoring**: Continuous performance and error monitoring

## Future Architecture Considerations

### Planned Enhancements

1. **Semantic Search**: Integration of embedding-based search
2. **Machine Learning**: Predictive analytics for incident response
3. **Multi-tenancy**: Support for multiple organizations
4. **Federation**: Distributed deployment across multiple regions
5. **Event Streaming**: Real-time event processing and notifications

### Scalability Roadmap

1. **Phase 1**: Vertical scaling optimization
2. **Phase 2**: Horizontal scaling with load balancing
3. **Phase 3**: Microservices decomposition
4. **Phase 4**: Event-driven architecture
5. **Phase 5**: Global distribution and edge computing