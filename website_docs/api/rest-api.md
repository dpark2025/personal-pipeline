# REST API Reference

Personal Pipeline provides 11 REST API endpoints for flexible integration with web applications, scripts, and external systems alongside the native MCP protocol.

## Overview

The REST API offers the same functionality as the MCP tools but through standard HTTP endpoints, making it accessible to any system that can make HTTP requests.

### Base URL
```
http://localhost:3000/api
```

### Response Format
All endpoints return JSON responses with consistent structure:

```typescript
{
  success: boolean;
  data?: any;                // Response data (on success)
  error?: {                  // Error details (on failure)
    code: string;
    message: string;
    details?: object;
  };
  meta: {
    timestamp: string;
    request_id: string;
    response_time_ms: number;
  };
}
```

## Search Endpoints

### POST /api/search
General documentation search across all sources.

**Request Body:**
```typescript
{
  query: string;              // Search query
  sources?: string[];         // Specific sources to search
  document_types?: string[];  // Filter by document type
  limit?: number;            // Max results (default: 10, max: 50)
  include_content?: boolean;  // Include full content (default: false)
  filters?: {                // Additional filters
    tags?: string[];
    date_range?: {
      start?: string;        // ISO date string
      end?: string;
    };
    author?: string;
  };
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    results: Array<{
      id: string;
      title: string;
      content?: string;        // If include_content = true
      excerpt: string;         // Short excerpt with highlights
      source: string;
      document_type: string;
      last_updated: string;
      confidence_score: number; // 0.0-1.0
      match_highlights: string[];
      metadata: {
        author?: string;
        tags?: string[];
        url?: string;
      };
    }>;
    total_results: number;
    query_suggestions?: string[];
    facets?: {
      sources: Record<string, number>;
      document_types: Record<string, number>;
      tags: Record<string, number>;
    };
  },
  meta: {
    timestamp: "2025-08-16T10:30:00.000Z",
    request_id: "req_abc123",
    response_time_ms: 45
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "disk space cleanup",
    "limit": 5,
    "include_content": false,
    "filters": {
      "tags": ["runbook", "maintenance"],
      "date_range": {
        "start": "2024-01-01"
      }
    }
  }'
```

### POST /api/runbooks/search
Search runbooks by alert characteristics.

**Request Body:**
```typescript
{
  alert_type: string;           // Type of alert
  severity: "low" | "medium" | "high" | "critical";
  affected_systems?: string[];  // Systems experiencing issues
  error_message?: string;      // Specific error message
  limit?: number;              // Max results (default: 5, max: 20)
  include_procedures?: boolean; // Include full procedures (default: true)
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    runbooks: Array<{
      id: string;
      title: string;
      description: string;
      severity_mapping: {
        low?: object;
        medium?: object;
        high?: object;
        critical?: object;
      };
      triggers: string[];
      decision_tree?: object;
      procedures?: Array<{
        id: string;
        title: string;
        steps: Array<{
          step_number: number;
          title: string;
          description: string;
          commands?: string[];
          expected_output?: string;
        }>;
        estimated_time: string;
      }>;
      escalation_path?: object;
      confidence_score: number;
      match_reasons: string[];
      metadata: {
        last_updated: string;
        success_rate?: number;
        avg_resolution_time?: string;
      };
    }>;
    total_found: number;
    recommendations?: {
      similar_incidents: string[];
      prevention_tips: string[];
    };
  }
}
```

### GET /api/runbooks
List all runbooks with filtering and pagination.

**Query Parameters:**
```
?limit=20                    # Results per page (default: 20, max: 100)
&offset=0                    # Pagination offset (default: 0)
&severity=high               # Filter by severity
&systems=web,database        # Filter by affected systems
&tags=maintenance,urgent     # Filter by tags
&status=active               # Filter by status (active, archived)
&sort=updated_desc           # Sort order (updated_desc, title_asc, severity_desc)
```

**Response:**
```typescript
{
  success: true,
  data: {
    runbooks: Array<{
      id: string;
      title: string;
      description: string;
      severity_levels: string[];
      systems: string[];
      tags: string[];
      status: "active" | "archived";
      last_updated: string;
      usage_stats: {
        times_used: number;
        success_rate: number;
        avg_resolution_time: string;
      };
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
    filters: {
      available_severities: string[];
      available_systems: string[];
      available_tags: string[];
    };
  }
}
```

### GET /api/runbooks/:id
Get specific runbook by ID.

**Path Parameters:**
- `id` - Runbook identifier

**Query Parameters:**
```
?include_procedures=true     # Include full procedures (default: true)
&include_history=false       # Include revision history (default: false)
&include_stats=true          # Include usage statistics (default: true)
```

**Response:**
```typescript
{
  success: true,
  data: {
    runbook: {
      id: string;
      title: string;
      description: string;
      version: string;
      severity_mapping: object;
      triggers: string[];
      decision_tree: object;
      procedures: Array<{
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
          estimated_time?: string;
        }>;
        success_criteria: string[];
        rollback_procedure?: object;
      }>;
      escalation_path: object;
      metadata: {
        created_at: string;
        updated_at: string;
        created_by: string;
        updated_by: string;
        tags: string[];
        systems: string[];
      };
      statistics?: {
        times_used: number;
        success_rate: number;
        avg_resolution_time: string;
        last_used: string;
      };
      history?: Array<{
        version: string;
        updated_at: string;
        updated_by: string;
        changes: string[];
      }>;
    };
  }
}
```

## Operational Endpoints

### POST /api/decision-tree
Get decision logic for specific scenarios.

**Request Body:**
```typescript
{
  scenario: string;            // Scenario description
  context?: {                 // Additional context
    systems?: string[];
    error_codes?: string[];
    user_role?: string;
    business_impact?: string;
  };
  max_depth?: number;         // Maximum tree depth (default: 5, max: 10)
  format?: "tree" | "linear"; // Response format (default: "tree")
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    decision_tree: {
      id: string;
      title: string;
      scenario: string;
      root_decision: {
        id: string;
        question: string;
        type: "boolean" | "multiple_choice" | "numeric";
        options: Array<{
          id: string;
          label: string;
          condition: string;
          action: string;
          next_decision_id?: string;
          next_decision?: object;     // Nested decision (if max_depth > 1)
          estimated_time?: string;
          confidence?: number;
        }>;
        metadata?: {
          difficulty: "easy" | "medium" | "hard";
          required_skills: string[];
          tools_needed: string[];
        };
      };
    };
    linear_flow?: Array<{      // If format = "linear"
      step: number;
      type: "decision" | "action";
      content: string;
      conditions?: string[];
    }>;
    confidence_score: number;
    source: {
      name: string;
      document_id: string;
      last_updated: string;
    };
  }
}
```

### GET /api/procedures/:id
Get detailed procedure steps by ID.

**Path Parameters:**
- `id` - Procedure identifier

**Query Parameters:**
```
?include_prerequisites=true  # Include setup steps (default: true)
&include_troubleshooting=true # Include troubleshooting info (default: true)
&format=detailed             # Response format (detailed, compact)
```

**Response:**
```typescript
{
  success: true,
  data: {
    procedure: {
      id: string;
      title: string;
      description: string;
      category: string;
      difficulty: "easy" | "medium" | "hard";
      prerequisites?: Array<{
        type: "skill" | "tool" | "access" | "condition";
        description: string;
        required: boolean;
      }>;
      steps: Array<{
        step_number: number;
        title: string;
        description: string;
        type: "action" | "verification" | "decision";
        commands?: Array<{
          command: string;
          platform: "linux" | "windows" | "macos" | "any";
          description?: string;
        }>;
        expected_output?: string;
        success_criteria?: string[];
        troubleshooting?: Array<{
          issue: string;
          solution: string;
          escalation?: boolean;
        }>;
        estimated_time?: string;
        parallel_execution?: boolean;
      }>;
      estimated_total_time: string;
      success_criteria: string[];
      rollback_procedure?: {
        steps: Array<{
          step_number: number;
          description: string;
          commands?: string[];
        }>;
      };
      metadata: {
        last_updated: string;
        success_rate: number;
        avg_execution_time: string;
        complexity_score: number;
      };
    };
  }
}
```

### POST /api/escalation
Get escalation paths based on severity and context.

**Request Body:**
```typescript
{
  incident_type: string;       // Type of incident
  severity: "low" | "medium" | "high" | "critical";
  business_impact?: "none" | "low" | "medium" | "high" | "critical";
  affected_services?: string[];
  customer_impact?: boolean;
  time_since_start?: number;   // Minutes since incident started
  attempted_solutions?: string[];
  context?: {
    business_hours?: boolean;
    on_call_available?: boolean;
    previous_escalations?: number;
  };
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    escalation_path: {
      current_level: number;
      escalation_required: boolean;
      next_escalation_time?: string;
      levels: Array<{
        level: number;
        title: string;
        description: string;
        contacts: Array<{
          name: string;
          role: string;
          contact_methods: Array<{
            type: "email" | "phone" | "slack" | "pager";
            value: string;
            priority: number;
          }>;
          response_time_sla: string;
          availability: {
            timezone: string;
            business_hours: string;
            on_call_schedule?: string;
          };
        }>;
        escalation_triggers: Array<{
          condition: string;
          automatic: boolean;
          delay_minutes?: number;
        }>;
        actions: string[];
      }>;
      business_impact_assessment: {
        level: string;
        description: string;
        financial_impact?: string;
        customer_impact: string;
        sla_breach_risk: string;
      };
      communication_plan: {
        internal_channels: string[];
        external_channels: string[];
        update_frequency: string;
        stakeholder_groups: string[];
      };
    };
    recommendations: {
      immediate_actions: string[];
      prevention_measures: string[];
      process_improvements: string[];
    };
    confidence_score: number;
  }
}
```

### POST /api/feedback
Record resolution feedback for system improvement.

**Request Body:**
```typescript
{
  incident_id: string;        // Unique incident identifier
  runbook_used?: string;      // Runbook that was used
  procedures_used?: string[]; // Procedures that were executed
  resolution_time_minutes: number;
  was_successful: boolean;
  outcome: "resolved" | "partially_resolved" | "escalated" | "workaround";
  feedback: {
    runbook_accuracy?: number;     // 1-5 rating
    procedure_clarity?: number;    // 1-5 rating
    completeness?: number;         // 1-5 rating
    ease_of_use?: number;         // 1-5 rating
    missing_information?: string[];
    suggested_improvements?: string;
    false_positives?: string[];   // Incorrect matches/suggestions
  };
  root_cause?: {
    category: string;
    description: string;
    contributing_factors?: string[];
  };
  resolution_summary: string;
  lessons_learned?: string[];
  prevention_recommendations?: string[];
  metadata?: {
    operator_name?: string;
    operator_experience?: "junior" | "mid" | "senior";
    business_hours?: boolean;
    tools_used?: string[];
  };
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    feedback_id: string;
    stored_at: string;
    analysis: {
      runbook_effectiveness: number;    // Overall score 0-100
      improvement_areas: Array<{
        area: string;
        priority: "low" | "medium" | "high";
        suggestion: string;
      }>;
      similar_incidents: {
        count: number;
        patterns: string[];
        success_rate: number;
      };
      trending_issues: string[];
    };
    recommendations: {
      documentation_updates: string[];
      process_improvements: string[];
      training_needs: string[];
      tool_enhancements: string[];
    };
    impact_metrics: {
      mttr_improvement_potential: string;
      accuracy_score_change: number;
      confidence_score_impact: number;
    };
  }
}
```

## Management Endpoints

### GET /api/sources
List all configured documentation sources with health status.

**Query Parameters:**
```
?include_health=true         # Include health status (default: true)
&include_stats=true          # Include usage statistics (default: false)
&source_type=confluence      # Filter by source type
&status=healthy              # Filter by health status
```

**Response:**
```typescript
{
  success: true,
  data: {
    sources: Array<{
      name: string;
      type: string;
      status: "healthy" | "degraded" | "offline" | "maintenance";
      configuration: {
        priority: number;
        refresh_interval: string;
        last_refresh: string;
        next_refresh: string;
      };
      health?: {
        response_time_ms: number;
        success_rate: number;
        error_rate: number;
        last_error?: {
          timestamp: string;
          message: string;
          code: string;
        };
        uptime_percentage: number;
      };
      statistics?: {
        document_count: number;
        queries_today: number;
        queries_total: number;
        avg_response_time: number;
        cache_hit_rate: number;
        last_query: string;
        most_queried_documents: Array<{
          id: string;
          title: string;
          query_count: number;
        }>;
      };
      capabilities: string[];    // Available features
    }>;
    summary: {
      total_sources: number;
      healthy_sources: number;
      total_documents: number;
      cache_efficiency: number;
    };
  }
}
```

### GET /api/health
Consolidated API health status with performance metrics.

**Query Parameters:**
```
?include_details=true        # Include detailed component health
&include_metrics=true        # Include performance metrics
&check_sources=true          # Perform source health checks
```

**Response:**
```typescript
{
  success: true,
  data: {
    status: "healthy" | "degraded" | "offline";
    version: string;
    uptime_seconds: number;
    timestamp: string;
    components: {
      api: {
        status: "healthy" | "degraded" | "offline";
        response_time_ms: number;
        requests_per_minute: number;
        error_rate: number;
      };
      cache: {
        status: "healthy" | "degraded" | "offline";
        type: string;
        hit_rate: number;
        memory_usage?: string;
        connection_count?: number;
      };
      sources: {
        total: number;
        healthy: number;
        degraded: number;
        offline: number;
        details?: Array<{
          name: string;
          status: string;
          last_check: string;
        }>;
      };
      database?: {
        status: "healthy" | "degraded" | "offline";
        connection_count: number;
        query_time_ms: number;
      };
    };
    performance?: {
      requests: {
        total: number;
        success_rate: number;
        avg_response_time: number;
        p95_response_time: number;
        p99_response_time: number;
      };
      resources: {
        memory_usage_mb: number;
        memory_usage_percent: number;
        cpu_usage_percent: number;
        open_file_descriptors: number;
      };
      cache_stats: {
        hit_rate: number;
        miss_rate: number;
        eviction_rate: number;
        memory_usage: string;
      };
    };
    alerts?: Array<{
      level: "warning" | "error" | "critical";
      component: string;
      message: string;
      timestamp: string;
      details?: object;
    }>;
  }
}
```

### GET /api/performance
API performance metrics and statistics.

**Query Parameters:**
```
?period=1h                   # Time period (1m, 5m, 15m, 1h, 24h)
&include_breakdown=true      # Include endpoint breakdown
&include_trends=true         # Include trend analysis
```

**Response:**
```typescript
{
  success: true,
  data: {
    period: string;
    summary: {
      total_requests: number;
      success_rate: number;
      error_rate: number;
      avg_response_time: number;
      p50_response_time: number;
      p95_response_time: number;
      p99_response_time: number;
      requests_per_minute: number;
      concurrent_connections: number;
    };
    breakdown?: {
      by_endpoint: Array<{
        endpoint: string;
        method: string;
        request_count: number;
        avg_response_time: number;
        error_rate: number;
        slowest_request: number;
      }>;
      by_status_code: Record<string, number>;
      by_source: Array<{
        source: string;
        request_count: number;
        avg_response_time: number;
        cache_hit_rate: number;
      }>;
    };
    trends?: {
      response_time_trend: string;    // "improving", "stable", "degrading"
      request_volume_trend: string;
      error_rate_trend: string;
      cache_performance_trend: string;
    };
    thresholds: {
      response_time_warning: number;
      response_time_critical: number;
      error_rate_warning: number;
      error_rate_critical: number;
    };
    recommendations?: string[];
  }
}
```

## Error Handling

### HTTP Status Codes

- `200 OK` - Successful request
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - Source adapter error
- `503 Service Unavailable` - Service temporarily unavailable

### Error Response Format

```typescript
{
  success: false,
  error: {
    code: string;              // Machine-readable error code
    message: string;           // Human-readable error message
    details?: {               // Additional error details
      field?: string;          // Field that caused the error
      value?: any;            // Invalid value
      constraints?: string[]; // Validation constraints
    };
    suggestion?: string;      // Suggested resolution
    documentation_url?: string; // Link to relevant documentation
  },
  meta: {
    timestamp: string;
    request_id: string;
    response_time_ms: number;
  }
}
```

### Common Error Codes

**Request Validation Errors:**
- `INVALID_REQUEST` - Malformed request body
- `MISSING_REQUIRED_FIELD` - Required field missing
- `INVALID_FIELD_VALUE` - Field value doesn't meet constraints
- `INVALID_JSON` - Request body is not valid JSON

**Authentication/Authorization Errors:**
- `AUTHENTICATION_REQUIRED` - API key or token required
- `INVALID_CREDENTIALS` - Invalid API key or token
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `TOKEN_EXPIRED` - Authentication token has expired

**Resource Errors:**
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `RUNBOOK_NOT_FOUND` - Specified runbook ID not found
- `PROCEDURE_NOT_FOUND` - Specified procedure ID not found
- `SOURCE_NOT_FOUND` - Specified source doesn't exist

**System Errors:**
- `SOURCE_UNAVAILABLE` - Documentation source is offline
- `CACHE_ERROR` - Cache system error
- `DATABASE_ERROR` - Database connection or query error
- `TIMEOUT` - Request exceeded time limit
- `RATE_LIMITED` - Too many requests from client

**Business Logic Errors:**
- `NO_MATCHING_RUNBOOKS` - No runbooks found for criteria
- `AMBIGUOUS_SEARCH` - Search query too vague
- `INVALID_ESCALATION_PATH` - Cannot determine escalation
- `FEEDBACK_VALIDATION_FAILED` - Invalid feedback data

## API Versioning

The REST API uses URL-based versioning:

```
# Current version (v1)
http://localhost:3000/api/search

# Explicit version
http://localhost:3000/api/v1/search

# Future versions
http://localhost:3000/api/v2/search
```

### Version Support Policy

- **Current Version (v1)**: Fully supported
- **Previous Version**: Security updates only
- **Future Versions**: Beta features available

## Rate Limiting

### Default Limits

- **Authenticated requests**: 1000 requests/hour
- **Anonymous requests**: 100 requests/hour
- **Search operations**: 60 requests/minute
- **Bulk operations**: 10 requests/minute

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1625097600
X-RateLimit-Window: 3600
```

### Rate Limit Response

```typescript
{
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
    details: {
      limit: 1000,
      remaining: 0,
      reset_time: "2025-08-16T11:00:00.000Z"
    },
    suggestion: "Reduce request frequency or upgrade to higher rate limits"
  }
}
```

## Authentication

### API Key Authentication

```bash
# Include API key in header
curl -H "X-API-Key: your_api_key" \
  http://localhost:3000/api/search

# Or as query parameter
curl "http://localhost:3000/api/search?api_key=your_api_key"
```

### JWT Authentication

```bash
# Get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}'

# Use JWT token
curl -H "Authorization: Bearer your_jwt_token" \
  http://localhost:3000/api/search
```

## Client Libraries

### JavaScript/TypeScript

```typescript
import { PersonalPipelineClient } from '@personal-pipeline/client';

const client = new PersonalPipelineClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your_api_key'
});

// Search runbooks
const runbooks = await client.searchRunbooks({
  alert_type: 'disk_space',
  severity: 'high'
});

// Get procedure
const procedure = await client.getProcedure('proc_123');
```

### Python

```python
from personal_pipeline import Client

client = Client(
    base_url='http://localhost:3000',
    api_key='your_api_key'
)

# Search runbooks
runbooks = client.search_runbooks(
    alert_type='disk_space',
    severity='high'
)

# Get procedure
procedure = client.get_procedure('proc_123')
```

### cURL Examples

```bash
# Search documentation
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"query": "memory leak", "limit": 10}'

# Get runbook
curl http://localhost:3000/api/runbooks/rb_123 \
  -H "X-API-Key: your_api_key"

# Record feedback
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "incident_id": "inc_456",
    "resolution_time_minutes": 30,
    "was_successful": true,
    "resolution_summary": "Fixed by restarting service"
  }'
```

## Next Steps

- [MCP Tools Reference](./mcp-tools.md) - Native MCP protocol tools
- [Source Adapters](./adapters.md) - Configuring documentation sources
- [Error Handling](./errors.md) - Comprehensive error handling guide
- [API Examples](../examples/api-usage.md) - Practical integration examples