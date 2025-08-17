# MCP Tools Reference

Personal Pipeline provides 7 intelligent MCP tools for documentation retrieval and incident response automation.

## Overview

The Model Context Protocol (MCP) tools are designed for seamless integration with LangGraph agents and other MCP-compatible systems. Each tool provides specific functionality for retrieving and managing operational documentation.

### Tool Categories

- **Search Tools**: Find relevant documentation quickly
- **Operational Tools**: Get procedures and decision trees
- **Management Tools**: Source configuration and feedback
- **Knowledge Tools**: Access general documentation

## Core Tools

### 1. search_runbooks

**Purpose**: Context-aware operational runbook retrieval based on alert characteristics.

**Parameters**:
```typescript
{
  alert_type: string;           // Type of alert (e.g., "disk_space", "memory_high")
  severity: "low" | "medium" | "high" | "critical";
  affected_systems?: string[];  // Systems experiencing issues
  error_message?: string;      // Specific error message
  limit?: number;              // Max results (default: 5)
}
```

**Response**:
```typescript
{
  runbooks: Array<{
    id: string;
    title: string;
    severity_mapping: object;
    triggers: string[];
    procedures: Array<{
      title: string;
      steps: string[];
      estimated_time: string;
    }>;
    confidence_score: number;    // 0.0-1.0
    match_reasons: string[];     // Why this runbook was selected
  }>;
  retrieval_time_ms: number;
  total_found: number;
}
```

**Example Usage**:
```javascript
const result = await searchRunbooks({
  alert_type: "disk_space_critical",
  severity: "high",
  affected_systems: ["web-server-01", "database-01"],
  limit: 3
});
```

### 2. get_decision_tree

**Purpose**: Retrieve decision logic for specific scenarios to guide troubleshooting.

**Parameters**:
```typescript
{
  scenario: string;            // Scenario description
  context?: object;           // Additional context
  max_depth?: number;         // Maximum tree depth (default: 5)
}
```

**Response**:
```typescript
{
  decision_tree: {
    id: string;
    title: string;
    root_decision: {
      question: string;
      options: Array<{
        condition: string;
        action: string;
        next_decision?: object;  // Nested decision
      }>;
    };
  };
  confidence_score: number;
  source: string;
}
```

### 3. get_procedure

**Purpose**: Get detailed execution steps for specific procedures.

**Parameters**:
```typescript
{
  procedure_id: string;        // Unique procedure identifier
  context?: object;           // Execution context
  include_prerequisites?: boolean;  // Include setup steps
}
```

**Response**:
```typescript
{
  procedure: {
    id: string;
    title: string;
    description: string;
    prerequisites?: string[];
    steps: Array<{
      step_number: number;
      title: string;
      description: string;
      commands?: string[];
      expected_output?: string;
      troubleshooting?: string[];
    }>;
    estimated_time: string;
    success_criteria: string[];
  };
  confidence_score: number;
}
```

### 4. get_escalation_path

**Purpose**: Determine appropriate escalation procedures based on severity and context.

**Parameters**:
```typescript
{
  incident_type: string;       // Type of incident
  severity: "low" | "medium" | "high" | "critical";
  business_impact?: string;    // Business impact description
  time_since_start?: number;   // Minutes since incident started
}
```

**Response**:
```typescript
{
  escalation_path: {
    levels: Array<{
      level: number;
      title: string;
      contacts: Array<{
        name: string;
        role: string;
        contact_methods: string[];
        response_time_sla: string;
      }>;
      escalation_trigger: string;
      escalation_time: string;
    }>;
    business_impact_assessment: string;
    communication_channels: string[];
  };
  confidence_score: number;
}
```

### 5. list_sources

**Purpose**: Manage and monitor documentation sources.

**Parameters**:
```typescript
{
  include_health?: boolean;    // Include health status
  include_stats?: boolean;     // Include usage statistics
  source_type?: string;       // Filter by source type
}
```

**Response**:
```typescript
{
  sources: Array<{
    name: string;
    type: string;
    status: "healthy" | "degraded" | "offline";
    last_refresh: string;
    document_count: number;
    health_details?: {
      response_time_ms: number;
      error_rate: number;
      last_error?: string;
    };
    statistics?: {
      queries_today: number;
      avg_response_time: number;
      cache_hit_rate: number;
    };
  }>;
  total_sources: number;
  healthy_sources: number;
}
```

### 6. search_knowledge_base

**Purpose**: General documentation search across all sources.

**Parameters**:
```typescript
{
  query: string;              // Search query
  sources?: string[];         // Specific sources to search
  document_types?: string[];  // Filter by document type
  limit?: number;            // Max results (default: 10)
  include_content?: boolean;  // Include document content
}
```

**Response**:
```typescript
{
  results: Array<{
    id: string;
    title: string;
    content?: string;          // If include_content = true
    excerpt: string;           // Short excerpt
    source: string;
    document_type: string;
    last_updated: string;
    confidence_score: number;
    match_highlights: string[];
  }>;
  query_time_ms: number;
  total_results: number;
  search_suggestions?: string[];
}
```

### 7. record_resolution_feedback

**Purpose**: Capture outcomes and feedback for continuous improvement.

**Parameters**:
```typescript
{
  incident_id: string;        // Unique incident identifier
  runbook_used?: string;      // Runbook that was used
  resolution_time_minutes: number;
  was_successful: boolean;
  feedback: {
    runbook_accuracy?: number;     // 1-5 rating
    procedure_clarity?: number;    // 1-5 rating
    missing_information?: string[];
    suggested_improvements?: string;
  };
  root_cause?: string;
  resolution_summary: string;
}
```

**Response**:
```typescript
{
  feedback_id: string;
  stored_at: string;
  analysis: {
    runbook_effectiveness: number;
    improvement_areas: string[];
    similar_incidents: number;
  };
  success: boolean;
}
```

## Error Handling

All tools return consistent error structures:

```typescript
{
  error: {
    code: string;              // Error code (e.g., "SOURCE_UNAVAILABLE")
    message: string;           // Human-readable message
    details?: object;          // Additional error details
    suggestion?: string;       // Suggested resolution
  };
  timestamp: string;
  request_id: string;
}
```

### Common Error Codes

- `SOURCE_UNAVAILABLE`: Documentation source is offline
- `INVALID_PARAMETERS`: Missing or invalid input parameters
- `TIMEOUT`: Request exceeded time limit
- `NOT_FOUND`: Requested document/runbook not found
- `RATE_LIMITED`: Too many requests
- `INSUFFICIENT_PERMISSIONS`: Access denied

## Performance Characteristics

### Response Time Targets

- **Critical Operations** (search_runbooks): < 150ms
- **Standard Operations** (get_procedure): < 200ms
- **Management Operations** (list_sources): < 100ms
- **Feedback Recording**: < 50ms

### Caching Strategy

- **Hot Cache**: Frequently accessed runbooks (< 10ms)
- **Warm Cache**: Recent searches (< 50ms)
- **Cold Cache**: New queries (< 200ms)

### Concurrency Support

- **Maximum Concurrent Requests**: 50+
- **Queue Management**: Automatic backpressure
- **Circuit Breaker**: Prevents cascade failures

## Integration Examples

### LangGraph Agent Integration

```python
from langchain.tools import Tool
from personal_pipeline_client import PersonalPipelineClient

client = PersonalPipelineClient(base_url="http://localhost:3000")

search_runbooks_tool = Tool(
    name="search_runbooks",
    description="Find operational runbooks for alerts",
    func=lambda alert_type, severity: client.search_runbooks({
        "alert_type": alert_type,
        "severity": severity
    })
)
```

### Direct MCP Usage

```javascript
import { MCPClient } from '@modelcontextprotocol/client';

const client = new MCPClient();
await client.connect('personal-pipeline-mcp://localhost:3000');

const result = await client.call_tool('search_runbooks', {
    alert_type: 'cpu_high',
    severity: 'medium',
    affected_systems: ['app-server-01']
});
```

## Tool Configuration

### Environment Variables

```bash
# Tool behavior
TOOL_TIMEOUT_MS=5000
TOOL_CACHE_TTL=300
TOOL_MAX_RESULTS=50

# Performance tuning
TOOL_PARALLEL_SEARCHES=true
TOOL_RESULT_STREAMING=true
```

### Tool-specific Settings

```yaml
# config/config.yaml
tools:
  search_runbooks:
    default_limit: 5
    max_limit: 20
    cache_ttl: 300
    
  get_procedure:
    include_prerequisites: true
    validation_required: true
    
  record_resolution_feedback:
    validation_schema: strict
    auto_analysis: true
```

## Best Practices

### Query Optimization

1. **Use specific alert types** for better runbook matching
2. **Include system context** when available
3. **Set appropriate limits** to balance speed vs completeness
4. **Cache frequent queries** at the client level

### Error Recovery

1. **Implement retry logic** with exponential backoff
2. **Graceful degradation** when sources are unavailable
3. **Fallback to manual procedures** when automation fails
4. **Log all errors** for analysis and improvement

### Security Considerations

1. **Validate all inputs** before processing
2. **Sanitize error messages** to prevent information leakage
3. **Use authentication** for sensitive operations
4. **Audit all access** for compliance

## Next Steps

- [REST API Reference](./rest-api.md) - HTTP endpoints for web integration
- [Source Adapters](./adapters.md) - Documentation source configuration
- [Error Handling](./errors.md) - Comprehensive error handling guide