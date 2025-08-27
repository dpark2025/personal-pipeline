# API Documentation

This document provides comprehensive documentation for Personal Pipeline's API endpoints and MCP tools.

## Overview

Personal Pipeline provides dual access patterns:
- **MCP Protocol**: Native protocol for LangGraph agents and MCP-compatible clients
- **REST API**: Standard HTTP endpoints for demo scripts, external integrations, and web UIs

## MCP Tools

Personal Pipeline provides 7 core MCP tools for intelligent documentation retrieval:

### Primary Operational Tools

#### `search_runbooks(alertType, severity?, systems?, context?)`

Context-aware operational runbook retrieval for incident response.

**Parameters:**
- `alertType` (string, required): Type of alert or incident (e.g., "disk_space", "memory_leak")
- `severity` (string, optional): Severity level ("critical", "high", "medium", "low")
- `systems` (array, optional): Affected systems or components
- `context` (object, optional): Additional context for better matching

**Response:**
```json
{
  "runbooks": [
    {
      "id": "disk-space-critical",
      "title": "Critical Disk Space Alert Response",
      "confidence_score": 0.95,
      "severity_mapping": {
        "critical": "immediate_response",
        "high": "rapid_response"
      },
      "decision_tree": { /* structured decision logic */ },
      "procedures": [ /* step-by-step procedures */ ],
      "metadata": {
        "success_rate": 0.92,
        "average_resolution_time": "15 minutes"
      }
    }
  ],
  "retrieval_time_ms": 150,
  "match_reasons": ["exact_alert_type_match", "severity_alignment"]
}
```

#### `get_decision_tree(scenario, context?)`

Retrieve decision logic for specific operational scenarios.

**Parameters:**
- `scenario` (string, required): Specific scenario or problem type
- `context` (object, optional): Additional context for decision logic

**Response:**
```json
{
  "decision_tree": {
    "root_condition": "disk_usage > 90%",
    "branches": [
      {
        "condition": "disk_usage > 95%",
        "action": "immediate_cleanup",
        "escalation": "page_on_call"
      }
    ]
  },
  "confidence_score": 0.88,
  "source": "disk-space-runbook",
  "retrieval_time_ms": 120
}
```

#### `get_procedure(procedureId, step?)`

Detailed execution steps for specific procedures.

**Parameters:**
- `procedureId` (string, required): Unique identifier for the procedure
- `step` (number, optional): Specific step number to retrieve

**Response:**
```json
{
  "procedure": {
    "id": "emergency-disk-cleanup",
    "title": "Emergency Disk Space Cleanup",
    "steps": [
      {
        "step": 1,
        "action": "Check available disk space",
        "command": "df -h",
        "expected_output": "Filesystem usage report",
        "time_estimate": "30 seconds"
      }
    ],
    "prerequisites": ["root_access", "backup_verification"],
    "rollback_procedure": "rollback-disk-cleanup"
  },
  "confidence_score": 0.92,
  "retrieval_time_ms": 100
}
```

#### `get_escalation_path(severity, context?, businessHours?)`

Determine appropriate escalation procedures based on severity and context.

**Parameters:**
- `severity` (string, required): Incident severity level
- `context` (object, optional): Additional incident context
- `businessHours` (boolean, optional): Whether incident occurs during business hours

**Response:**
```json
{
  "escalation_path": [
    {
      "level": 1,
      "role": "on_call_engineer",
      "contact_method": "pager",
      "response_time": "5 minutes"
    },
    {
      "level": 2,
      "role": "senior_engineer",
      "contact_method": "phone",
      "response_time": "15 minutes"
    }
  ],
  "business_hours_adjustment": {
    "enabled": true,
    "modifications": ["extend_response_times", "add_manager_notification"]
  },
  "confidence_score": 0.90,
  "retrieval_time_ms": 80
}
```

### Supporting Tools

#### `list_sources(includeHealth?)`

Manage and monitor documentation sources.

**Parameters:**
- `includeHealth` (boolean, optional): Include health status for each source

**Response:**
```json
{
  "sources": [
    {
      "name": "local-runbooks",
      "type": "file",
      "status": "healthy",
      "document_count": 25,
      "last_updated": "2024-01-15T10:30:00Z",
      "health_score": 0.98
    }
  ],
  "total_sources": 3,
  "healthy_sources": 3,
  "retrieval_time_ms": 50
}
```

#### `search_knowledge_base(query, filters?)`

General documentation search across all sources.

**Parameters:**
- `query` (string, required): Search query
- `filters` (object, optional): Search filters (type, source, date range)

**Response:**
```json
{
  "results": [
    {
      "id": "monitoring-best-practices",
      "title": "Monitoring Best Practices Guide",
      "content_preview": "Best practices for system monitoring...",
      "confidence_score": 0.87,
      "source": "knowledge-base",
      "document_type": "guide"
    }
  ],
  "total_results": 15,
  "search_time_ms": 200,
  "facets": {
    "document_types": ["runbook", "procedure", "guide"],
    "sources": ["local-docs", "web-docs"]
  }
}
```

#### `record_resolution_feedback(incidentId, outcome, feedback?)`

Capture resolution outcomes for continuous improvement.

**Parameters:**
- `incidentId` (string, required): Unique incident identifier
- `outcome` (object, required): Resolution outcome details
- `feedback` (object, optional): Additional feedback and lessons learned

**Response:**
```json
{
  "feedback_recorded": true,
  "feedback_id": "fb-2024-001",
  "improvements_suggested": [
    "add_verification_step",
    "update_time_estimates"
  ],
  "confidence_score": 0.85,
  "processing_time_ms": 100
}
```

## REST API Endpoints

The REST API provides HTTP access to Personal Pipeline functionality with 11 endpoints.

### Base URL
```
http://localhost:3000/api
```

### Authentication
Currently, no authentication is required for the demo environment. Production deployments should implement appropriate authentication mechanisms.

### Search Endpoints

#### POST /api/search
General documentation search across all sources.

**Request Body:**
```json
{
  "query": "disk space cleanup",
  "filters": {
    "document_type": "runbook",
    "source": "local-docs",
    "max_results": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [ /* search results */ ],
    "total_results": 5,
    "search_time_ms": 150
  }
}
```

#### POST /api/runbooks/search
Specialized runbook search by alert characteristics.

**Request Body:**
```json
{
  "alert_type": "memory_leak",
  "severity": "high",
  "systems": ["web-server", "database"],
  "context": {
    "environment": "production",
    "business_hours": true
  }
}
```

#### GET /api/runbooks
List all runbooks with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Results per page (default: 10, max: 100)
- `severity` (string): Filter by severity level
- `system` (string): Filter by system/component

#### GET /api/runbooks/:id
Get specific runbook by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "runbook": { /* full runbook details */ },
    "retrieval_time_ms": 50
  }
}
```

### Operational Endpoints

#### POST /api/decision-tree
Get decision logic for specific scenarios.

**Request Body:**
```json
{
  "scenario": "high_cpu_usage",
  "context": {
    "system_type": "web_server",
    "load_average": "8.5"
  }
}
```

#### GET /api/procedures/:id
Get detailed procedure steps by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "procedure": { /* procedure details */ },
    "steps": [ /* detailed steps */ ]
  }
}
```

#### POST /api/escalation
Get escalation paths based on severity and context.

**Request Body:**
```json
{
  "severity": "critical",
  "context": {
    "affected_systems": ["payment_gateway"],
    "business_impact": "high"
  },
  "business_hours": false
}
```

#### POST /api/feedback
Record resolution feedback for system improvement.

**Request Body:**
```json
{
  "incident_id": "inc-2024-001",
  "outcome": {
    "resolution_time": 900,
    "success": true,
    "method": "standard_procedure"
  },
  "feedback": {
    "procedure_effectiveness": 0.9,
    "suggestions": ["add verification step"]
  }
}
```

### Management Endpoints

#### GET /api/sources
List all configured documentation sources with health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "name": "local-runbooks",
        "type": "file",
        "health_status": "healthy",
        "last_check": "2024-01-15T10:30:00Z"
      }
    ],
    "summary": {
      "total": 3,
      "healthy": 3,
      "degraded": 0,
      "unhealthy": 0
    }
  }
}
```

#### GET /api/health
Consolidated API health status with performance metrics.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "metrics": {
    "uptime_seconds": 86400,
    "requests_per_second": 12.5,
    "average_response_time_ms": 150,
    "error_rate": 0.001
  },
  "components": {
    "database": "healthy",
    "cache": "healthy",
    "external_apis": "healthy"
  }
}
```

#### GET /api/performance
API performance metrics and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "request_count": 10000,
      "average_response_time": 150,
      "95th_percentile": 300,
      "error_rate": 0.001
    },
    "endpoints": [
      {
        "path": "/api/runbooks/search",
        "average_response_time": 180,
        "request_count": 2500
      }
    ],
    "cache_stats": {
      "hit_rate": 0.85,
      "miss_rate": 0.15
    }
  }
}
```

## Error Handling

All API responses follow a consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid alert type provided",
    "details": {
      "field": "alert_type",
      "provided": "invalid_type",
      "valid_values": ["disk_space", "memory_leak", "network_issue"]
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req-123456"
}
```

### Error Codes

- `VALIDATION_ERROR`: Invalid request parameters or body
- `NOT_FOUND`: Requested resource not found
- `INTERNAL_ERROR`: Internal server error
- `TIMEOUT`: Request timeout
- `RATE_LIMIT`: Rate limit exceeded
- `SOURCE_UNAVAILABLE`: Documentation source unavailable

## Performance Characteristics

### Response Time Targets
- **Critical runbooks**: <200ms response time
- **Standard procedures**: <200ms response time
- **Health checks**: <50ms response time
- **Search operations**: <500ms response time

### Caching Strategy
- **Hybrid Caching**: Redis + memory with intelligent fallback
- **Cache TTL**: 5 minutes for frequently accessed content
- **Cache Warming**: Proactive caching of critical runbooks
- **Invalidation**: Smart cache invalidation on content updates

### Concurrent Operations
- **Maximum concurrent requests**: 50+
- **Rate limiting**: 100 requests per minute per client
- **Circuit breaker**: Automatic failover for degraded sources

## SDKs and Client Libraries

### TypeScript/JavaScript Client

```typescript
import { PersonalPipelineClient } from '@personal-pipeline/client';

const client = new PersonalPipelineClient({
  baseUrl: 'http://localhost:3000',
  timeout: 5000
});

// Search runbooks
const runbooks = await client.searchRunbooks({
  alertType: 'disk_space',
  severity: 'critical'
});

// Get decision tree
const decisionTree = await client.getDecisionTree('high_cpu_usage');
```

### MCP Integration

```javascript
import { MCPClient } from '@modelcontextprotocol/client';

const client = new MCPClient('personal-pipeline');

// Use MCP tools directly
const result = await client.callTool('search_runbooks', {
  alertType: 'memory_leak',
  severity: 'high'
});
```

## Development and Testing

### Testing the API

Use the interactive MCP explorer for testing:

```bash
# Start interactive MCP testing tool
npm run mcp-explorer

# Test specific endpoints
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "disk space"}'
```

### API Validation

```bash
# Validate configuration
npm run validate-config

# Run health checks
npm run health

# Performance testing
npm run benchmark
```