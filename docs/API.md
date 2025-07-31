# Personal Pipeline API Reference

> **🚀 New in v1.4**: Complete REST API layer with 11 endpoints, dual access patterns (REST + MCP), and intelligent caching system.

## Getting Started

The Personal Pipeline API provides two ways to access incident response documentation:
- **🌐 REST API**: Standard HTTP endpoints for any application
- **⚡ MCP Protocol**: Native protocol for LangGraph agents

### Quick Example
```bash
# Search for runbooks (REST API)
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "memory pressure", "max_results": 3}'

# Same search via MCP protocol
echo '{"method":"tools/call","params":{"name":"search_knowledge_base","arguments":{"query":"memory pressure","max_results":3}}}' | npx @modelcontextprotocol/cli stdio node dist/index.js
```

---

## 📋 API Endpoints Overview

### 🔍 Search & Discovery
| Endpoint | Method | Purpose | Response Time |
|----------|--------|---------|---------------|
| `/api/search` | POST | General documentation search | < 200ms |
| `/api/runbooks/search` | POST | Find runbooks by alert type | < 150ms |
| `/api/runbooks` | GET | List all runbooks | < 100ms |
| `/api/runbooks/:id` | GET | Get specific runbook | < 50ms |

### 🔧 Operational Support  
| Endpoint | Method | Purpose | Response Time |
|----------|--------|---------|---------------|
| `/api/decision-tree` | POST | Get decision logic | < 150ms |
| `/api/procedures/:id` | GET | Get procedure steps | < 100ms |
| `/api/escalation` | POST | Get escalation path | < 50ms |
| `/api/feedback` | POST | Record resolution feedback | < 100ms |

### 📊 System Management
| Endpoint | Method | Purpose | Response Time |
|----------|--------|---------|---------------|
| `/api/sources` | GET | List documentation sources | < 50ms |
| `/api/health` | GET | API health status | < 10ms |
| `/api/performance` | GET | Performance metrics | < 10ms |

---

## 🔐 Authentication

**Current Version**: No authentication required  
**Planned**: API key authentication, OAuth2, role-based access control

```bash
# All requests work without authentication
curl http://localhost:3000/api/health
```

---

## 🔍 Search Operations

### General Search

Find documentation across all sources with fuzzy matching and confidence scoring.

```http
POST /api/search
Content-Type: application/json

{
  "query": "database connection timeout",
  "categories": ["troubleshooting", "database"],
  "max_results": 5,
  "max_age_days": 30
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "db-timeout-guide",
      "title": "Database Connection Timeout Troubleshooting",
      "content": "Step-by-step guide for resolving timeout issues...",
      "source": "local-docs",
      "confidence_score": 0.87,
      "match_reasons": ["title match", "content relevance"],
      "last_updated": "2025-07-28T10:00:00.000Z"
    }
  ],
  "total_results": 1,
  "performance": {
    "response_time_ms": 23,
    "cache_hit": false,
    "optimization_applied": ["query_preprocessing", "result_ranking"]
  }
}
```

### Runbook Search

Search operational runbooks by alert characteristics with intelligent matching.

```http
POST /api/runbooks/search
Content-Type: application/json

{
  "alert_type": "memory_pressure",
  "severity": "high",
  "affected_systems": ["web-server-01", "api-gateway"],
  "context": {
    "memory_usage_percent": 85,
    "duration_minutes": 15,
    "time_of_day": "peak_hours"
  }
}
```

**Advanced Features:**
- **🎯 Context-aware matching**: Uses alert context for better runbook selection
- **📊 Confidence scoring**: Each result includes match confidence (0.0-1.0)
- **⚡ Intelligent caching**: Frequently used runbooks cached for sub-150ms response
- **📈 Success tracking**: Historical success rates included in results

**Response:**
```json
{
  "success": true,
  "runbooks": [
    {
      "id": "mem-pressure-001",
      "title": "High Memory Usage Runbook",
      "version": "1.2",
      "description": "Comprehensive procedures for memory pressure alerts",
      "triggers": ["memory_usage > 80%", "OOM killer active"],
      "severity_mapping": {"high": "critical", "medium": "high"},
      "procedures": [
        {
          "name": "check_memory_usage",
          "description": "Analyze current memory utilization patterns",
          "estimated_time_minutes": 2
        },
        {
          "name": "identify_memory_hogs",
          "description": "Find processes consuming excessive memory",
          "estimated_time_minutes": 3
        }
      ],
      "metadata": {
        "confidence_score": 0.92,
        "success_rate": 0.85,
        "avg_resolution_time_minutes": 12,
        "last_used": "2025-07-28T18:30:00.000Z"
      }
    }
  ],
  "performance": {
    "response_time_ms": 45,
    "cache_hit": true,
    "search_strategy": "alert_type_priority"
  }
}
```

---

## 🔧 Operational Support

### Decision Trees

Get intelligent decision logic for progressive incident resolution.

```http
POST /api/decision-tree
Content-Type: application/json

{
  "alert_context": {
    "alert_type": "disk_full",
    "severity": "critical",
    "affected_systems": ["database-01"],
    "disk_usage_percent": 95,
    "business_hours": false
  },
  "current_agent_state": {
    "previous_actions": ["checked_disk_usage"],
    "current_step": "cleanup_evaluation"
  }
}
```

**Smart Features:**
- **🧠 Progressive logic**: Adapts based on current state
- **⏰ Time-aware**: Different logic for business vs. off hours
- **📊 Confidence weighting**: Each branch includes confidence score
- **🔄 State tracking**: Maintains context across decision points

### Procedure Details

Get executable steps for specific procedures with parameter substitution.

```http
GET /api/procedures/mem-pressure-001_restart_service?context={"service_name":"nginx","server":"web-01"}
```

**Response:**
```json
{
  "success": true,
  "procedure": {
    "id": "mem-pressure-001_restart_service",
    "name": "restart_service",
    "description": "Gracefully restart the affected service",
    "command": "sudo systemctl restart nginx",
    "expected_outcome": "Service restarted, memory usage decreased by ~30%",
    "timeout_seconds": 300,
    "prerequisites": ["backup_config", "notify_oncall_team"],
    "rollback_steps": ["restore_previous_config", "restart_service"],
    "validation": {
      "success_indicators": ["service_status=active", "memory_usage<70%"],
      "failure_indicators": ["service_status=failed", "error_logs_present"]
    }
  }
}
```

---

## ⚡ MCP Protocol Tools

Perfect for LangGraph agents and MCP-compatible systems.

### Available Tools

| Tool Name | Purpose | Input | Response Time |
|-----------|---------|-------|---------------|
| `search_runbooks` | Find operational runbooks | alert context | < 150ms |
| `get_decision_tree` | Get decision logic | alert + state | < 150ms |
| `get_procedure` | Get procedure steps | runbook + step | < 100ms |
| `get_escalation_path` | Find escalation contacts | severity + hours | < 50ms |
| `list_sources` | List documentation sources | health flag | < 50ms |
| `search_knowledge_base` | General search | query + filters | < 200ms |
| `record_resolution_feedback` | Record outcomes | feedback data | < 100ms |

### Example: MCP Tool Usage

```javascript
// MCP client example
const response = await mcpClient.callTool('search_runbooks', {
  alert_type: 'memory_pressure',
  severity: 'high',
  affected_systems: ['web-server-01']
});

console.log(`Found ${response.runbooks.length} runbooks`);
console.log(`Best match confidence: ${response.confidence_scores[0]}`);
```

---

## 🚨 Error Handling

### Error Response Format

All errors follow a consistent structure with actionable recovery guidance:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed: missing required field 'alert_type'",
    "severity": "low",
    "http_status": 400,
    "recovery_actions": [
      "Add required 'alert_type' field to request body",
      "Check API documentation for valid alert_type values"
    ],
    "retry_recommended": true,
    "documentation_link": "/docs#alert-types"
  },
  "performance": {
    "response_time_ms": 15,
    "request_id": "req_2025072820153001"
  }
}
```

### Common Error Scenarios

#### 🔍 Search Errors
```bash
# Invalid query format
curl -X POST /api/search -d '{"invalid": "json}'
# Returns: VALIDATION_ERROR with field requirements

# No results found  
curl -X POST /api/search -d '{"query": "nonexistent_topic"}'
# Returns: success=true, results=[], with search suggestions
```

#### ⚡ Performance Errors
```bash
# Source timeout
curl -X POST /api/runbooks/search -d '{"alert_type": "complex_query"}'
# Returns: SOURCE_TIMEOUT with fallback options

# Rate limiting
curl -X POST /api/search # (101st request in minute)
# Returns: RATE_LIMITED with retry-after header
```

### HTTP Status Codes

| Code | Meaning | When It Happens | Recovery |
|------|---------|-----------------|----------|
| **200** | Success | Operation completed | Continue |
| **400** | Bad Request | Invalid parameters | Fix request format |
| **404** | Not Found | Resource doesn't exist | Check ID/path |
| **429** | Too Many Requests | Rate limit exceeded | Wait and retry |
| **500** | Internal Error | Server issue | Retry or contact support |
| **503** | Service Unavailable | Source adapter down | Use cached data |

---

## 📈 Performance & Optimization

### Response Time Targets

| Operation Type | Target | Typical | 95th Percentile |
|----------------|--------|---------|-----------------|
| **Health checks** | < 10ms | 3ms | 8ms |
| **Cached runbooks** | < 150ms | 45ms | 120ms |
| **Fresh searches** | < 200ms | 156ms | 185ms |
| **Procedure lookup** | < 100ms | 28ms | 75ms |

### Intelligent Caching

**7 Caching Strategies:**
- **Critical runbooks**: 24h TTL, pre-warmed at startup
- **Decision trees**: 12h TTL, context-aware keys
- **Procedures**: 6h TTL, parameter-specific caching
- **Search results**: 1h TTL, query normalization
- **Health checks**: 5min TTL, circuit breaker integration

**Cache Performance:**
```bash
# Check cache statistics
curl http://localhost:3000/api/performance

{
  "cache": {
    "hit_rate": 0.78,
    "response_time_improvement": "65%",
    "memory_usage_mb": 45,
    "redis_connected": true
  }
}
```

### Monitoring & Observability

Real-time performance metrics included in every response:

```json
{
  "performance": {
    "response_time_ms": 45,
    "cache_hit": true,
    "source_response_times": {"local-docs": 12},
    "optimization_applied": ["query_preprocessing", "result_caching"],
    "request_id": "req_2025072820153001"
  }
}
```

---

## 🚀 Getting Started Examples

### Basic Incident Response Flow

```bash
# 1. Search for relevant runbooks
curl -X POST http://localhost:3000/api/runbooks/search \
  -H "Content-Type: application/json" \
  -d '{
    "alert_type": "memory_pressure",
    "severity": "high",
    "affected_systems": ["web-server-01"]
  }'

# 2. Get decision tree for next steps
curl -X POST http://localhost:3000/api/decision-tree \
  -H "Content-Type: application/json" \
  -d '{
    "alert_context": {
      "alert_type": "memory_pressure",
      "severity": "high"
    }
  }'

# 3. Get specific procedure details
curl http://localhost:3000/api/procedures/mem-pressure-001_restart_service

# 4. Record feedback after resolution
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "runbook_id": "mem-pressure-001",
    "procedure_id": "restart_service",
    "outcome": "success",
    "resolution_time_minutes": 8
  }'
```

### Development & Testing

```bash
# Check API health
curl http://localhost:3000/api/health

# View performance metrics
curl http://localhost:3000/api/performance

# List all available sources
curl http://localhost:3000/api/sources

# Test with sample data
npm run generate-sample-data
npm run demo:walkthrough
```

---

## 📚 Additional Resources

- **🔧 Setup Guide**: See `docs/DEMO-GUIDE.md` for complete setup instructions
- **⚡ Performance**: See `docs/MILESTONE-1.3-SUMMARY.md` for caching details  
- **🚀 REST API**: See `docs/MILESTONE-1.4-REST-API.md` for implementation details
- **🛠️ Development**: Use `npm run test-mcp` for interactive testing