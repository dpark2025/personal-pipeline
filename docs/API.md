# Personal Pipeline MCP Server API Documentation

## Overview

The Personal Pipeline MCP server provides 7 core tools for intelligent documentation retrieval and incident response support. All tools follow the Model Context Protocol (MCP) specification and return structured JSON responses.

## MCP Tools

### 1. search_runbooks

Search for operational runbooks based on alert characteristics.

**Description**: Context-aware operational runbook retrieval with confidence scoring.

**Input Schema**:
```json
{
  "alert_type": "string",      // Required: e.g., "memory_pressure", "disk_full"
  "severity": "string",        // Required: "critical"|"high"|"medium"|"low"|"info"
  "affected_systems": ["string"], // Required: List of affected systems
  "context": {}                // Optional: Additional context object
}
```

**Example Request**:
```json
{
  "alert_type": "memory_pressure",
  "severity": "high",
  "affected_systems": ["web-server-01", "api-gateway"],
  "context": {
    "memory_usage_percent": 85,
    "duration_minutes": 15
  }
}
```

**Response Structure**:
```json
{
  "success": true,
  "runbooks": [
    {
      "id": "mem-pressure-001",
      "title": "High Memory Usage Runbook",
      "version": "1.2",
      "description": "Procedures for handling memory pressure alerts",
      "triggers": ["memory_usage > 80%", "OOM killer active"],
      "severity_mapping": { "high": "critical", "medium": "high" },
      "decision_tree": { /* Decision tree object */ },
      "procedures": [ /* Array of procedure steps */ ],
      "metadata": {
        "confidence_score": 0.92,
        "success_rate": 0.85,
        "avg_resolution_time_minutes": 12
      }
    }
  ],
  "total_results": 1,
  "confidence_scores": [0.92],
  "retrieval_time_ms": 45,
  "timestamp": "2025-07-28T20:15:30.123Z"
}
```

### 2. get_decision_tree

Retrieve decision logic for specific operational scenarios.

**Description**: Get structured decision trees with conditional logic for progressive incident resolution.

**Input Schema**:
```json
{
  "alert_context": {},         // Required: Context about the alert
  "current_agent_state": {}    // Optional: Current state for progressive decisions
}
```

**Example Request**:
```json
{
  "alert_context": {
    "alert_type": "disk_full",
    "severity": "critical",
    "affected_systems": ["database-01"],
    "disk_usage_percent": 95
  },
  "current_agent_state": {
    "previous_actions": ["checked_disk_usage", "identified_large_files"],
    "current_step": "cleanup_evaluation"
  }
}
```

**Response Structure**:
```json
{
  "success": true,
  "decision_tree": {
    "id": "disk_cleanup_dt",
    "name": "Disk Cleanup Decision Tree",
    "description": "Decision logic for disk space recovery",
    "branches": [
      {
        "id": "check_logs",
        "condition": "disk_usage > 90%",
        "description": "Check for large log files",
        "action": "identify_log_files",
        "next_step": "cleanup_logs",
        "confidence": 0.9
      }
    ],
    "default_action": "escalate"
  },
  "confidence_score": 0.85,
  "context_applied": true,
  "retrieval_time_ms": 32,
  "timestamp": "2025-07-28T20:15:30.123Z"
}
```

### 3. get_procedure

Retrieve detailed execution steps for specific procedures.

**Description**: Get step-by-step execution instructions for operational procedures.

**Input Schema**:
```json
{
  "runbook_id": "string",      // Required: ID of the runbook
  "step_name": "string",       // Required: Name of the procedure step
  "current_context": {}        // Optional: Context for parameter substitution
}
```

**Example Request**:
```json
{
  "runbook_id": "mem-pressure-001",
  "step_name": "restart_service",
  "current_context": {
    "service_name": "nginx",
    "server_hostname": "web-01"
  }
}
```

**Response Structure**:
```json
{
  "success": true,
  "procedure": {
    "id": "mem-pressure-001_restart_service",
    "name": "restart_service",
    "description": "Restart the affected service gracefully",
    "command": "sudo systemctl restart nginx",
    "expected_outcome": "Service restarted successfully, memory usage decreased",
    "timeout_seconds": 300,
    "prerequisites": ["backup_config", "notify_team"],
    "tools_required": ["shell", "monitoring_tools"]
  },
  "confidence_score": 0.8,
  "retrieval_time_ms": 28,
  "timestamp": "2025-07-28T20:15:30.123Z"
}
```

### 4. get_escalation_path

Determine appropriate escalation procedures based on context.

**Description**: Get escalation contacts and procedures based on severity and business hours.

**Input Schema**:
```json
{
  "severity": "string",        // Required: "critical"|"high"|"medium"|"low"|"info"
  "business_hours": boolean,   // Required: Whether incident is during business hours
  "failed_attempts": ["string"] // Optional: List of failed resolution attempts
}
```

**Example Request**:
```json
{
  "severity": "critical",
  "business_hours": false,
  "failed_attempts": ["restart_service", "clear_disk_space"]
}
```

**Response Structure**:
```json
{
  "success": true,
  "escalation_contacts": [
    {
      "name": "Night Shift Lead",
      "role": "L2 Support",
      "contact": "oncall-night@company.com",
      "availability": "24x7"
    }
  ],
  "escalation_procedure": "1. Contact Night Shift Lead via oncall-night@company.com\\n2. If no response in 15 minutes, escalate to Emergency Escalation",
  "estimated_response_time": "5 minutes",
  "retrieval_time_ms": 15,
  "timestamp": "2025-07-28T20:15:30.123Z"
}
```

### 5. list_sources

List all configured documentation sources with health status.

**Description**: Get information about all configured documentation sources and their health.

**Input Schema**:
```json
{
  "include_health": boolean    // Optional: Include health check info (default: true)
}
```

**Example Request**:
```json
{
  "include_health": true
}
```

**Response Structure**:
```json
{
  "success": true,
  "sources": [
    {
      "name": "local-docs",
      "type": "file",
      "enabled": true,
      "health": {
        "source_name": "local-docs",
        "healthy": true,
        "response_time_ms": 5,
        "last_check": "2025-07-28T20:15:30.123Z",
        "metadata": {
          "document_count": 2,
          "last_index_update": "2025-07-28T20:00:00.000Z"
        }
      }
    }
  ]
}
```

### 6. search_knowledge_base

General documentation search across all sources.

**Description**: Perform general search across all configured documentation sources.

**Input Schema**:
```json
{
  "query": "string",           // Required: Search query
  "categories": ["string"],    // Optional: Limit to specific categories
  "max_age_days": number,      // Optional: Only return recent documents
  "max_results": number        // Optional: Maximum results (default: 10)
}
```

**Example Request**:
```json
{
  "query": "database connection timeout",
  "categories": ["troubleshooting", "database"],
  "max_results": 5
}
```

**Response Structure**:
```json
{
  "success": true,
  "results": [
    {
      "id": "db-timeout-guide",
      "title": "Database Connection Timeout Troubleshooting",
      "content": "This guide covers common database timeout issues...",
      "source": "local-docs",
      "source_type": "file",
      "confidence_score": 0.87,
      "match_reasons": ["title match", "content relevance"],
      "retrieval_time_ms": 23,
      "last_updated": "2025-07-28T10:00:00.000Z"
    }
  ],
  "total_results": 1
}
```

### 7. record_resolution_feedback

Record feedback about resolution outcomes for system improvement.

**Description**: Capture resolution feedback to improve the system's recommendations over time.

**Input Schema**:
```json
{
  "runbook_id": "string",              // Required: ID of runbook used
  "procedure_id": "string",            // Required: ID of procedure executed
  "outcome": "string",                 // Required: "success"|"partial_success"|"failure"|"escalated"
  "resolution_time_minutes": number,   // Required: Time to resolve
  "notes": "string"                    // Optional: Additional notes
}
```

**Example Request**:
```json
{
  "runbook_id": "mem-pressure-001",
  "procedure_id": "restart_service",
  "outcome": "success",
  "resolution_time_minutes": 8,
  "notes": "Service restart resolved the memory pressure issue completely"
}
```

**Response Structure**:
```json
{
  "success": true,
  "message": "Feedback recorded successfully",
  "retrieval_time_ms": 12,
  "timestamp": "2025-07-28T20:15:30.123Z"
}
```

## HTTP Endpoints

The server also provides HTTP endpoints for health checking and monitoring:

### GET /health

Returns the overall health status of the server and all configured sources.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-28T20:15:30.123Z",
  "version": "0.1.0",
  "sources": [
    {
      "source_name": "local-docs",
      "healthy": true,
      "response_time_ms": 5,
      "last_check": "2025-07-28T20:15:30.123Z"
    }
  ],
  "uptime": 3600.5
}
```

### GET /ready

Kubernetes readiness probe endpoint.

**Response**:
```json
{
  "status": "ready",
  "timestamp": "2025-07-28T20:15:30.123Z"
}
```

### GET /metrics

Returns server metrics and source adapter statistics.

**Response**:
```json
{
  "timestamp": "2025-07-28T20:15:30.123Z",
  "version": "0.1.0",
  "uptime": 3600.5,
  "sources": [
    {
      "name": "local-docs",
      "type": "file",
      "document_count": 2,
      "cache_hit_rate": 0.85,
      "avg_response_time_ms": 15
    }
  ]
}
```

## Error Handling

All tools return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "retrieval_time_ms": 25,
  "timestamp": "2025-07-28T20:15:30.123Z"
}
```

Common error scenarios:
- **Invalid input**: Schema validation failures
- **Source unavailable**: Documentation source is down
- **Timeout**: Request exceeded timeout limit
- **Not found**: Requested resource doesn't exist
- **Rate limited**: Too many requests

## Performance Characteristics

- **Target response times**:
  - Cached runbook queries: < 200ms
  - Standard procedures: < 500ms
  - General search: < 1000ms
- **Concurrent queries**: 50+ simultaneous operations supported
- **Cache efficiency**: 80%+ hit rate for operational scenarios
- **Availability**: 99.9% uptime target

## Authentication

Currently the MCP server uses stdio transport and inherits authentication from the calling LangGraph agent. Future versions will support:
- API key authentication
- OAuth2 integration
- Role-based access control
- Audit logging

## Rate Limiting

- Default: 100 requests per minute per client
- Configurable via `server.max_concurrent_requests`
- Graceful degradation with queue management
- Circuit breaker pattern for source protection