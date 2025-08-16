# Personal Pipeline - AI Assistant Usage Guide

## Overview

Personal Pipeline is an intelligent Model Context Protocol (MCP) server designed for automated retrieval of internal documentation to support AI-driven monitoring alert response and incident management. This guide teaches AI assistants how to use the system most efficiently.

## Quick Start for AI Assistants

### Essential Commands
```bash
# Check system health
npm run health

# Start demo environment (fastest setup)
npm run demo:start

# Interactive testing
npm run mcp-explorer

# Performance validation
npm run benchmark:quick
```

### System Status Check Protocol
Always start interactions by checking system health:
```bash
curl http://localhost:3000/api/health | jq
```

## Core Capabilities

### 1. MCP Protocol Tools (7 Core Functions)

#### `search_runbooks` - Operational Incident Response ⭐⭐⭐
**Purpose**: Find incident response procedures based on alert characteristics
**Usage Pattern**: Highest priority for operational scenarios
```javascript
{
  "alert_type": "disk_space_critical|memory_leak|cpu_high|database_slow|network_issues|ssl_certificate|security_incident",
  "severity": "critical|high|medium|low",
  "affected_systems": ["system-name"]
}
```

#### `get_decision_tree` - Diagnostic Logic
**Purpose**: Retrieve conditional decision logic for specific scenarios
**Usage Pattern**: When you need step-by-step diagnostic procedures
```javascript
{
  "scenario": "disk_space_critical",
  "system_context": "filesystem"
}
```

#### `get_procedure` - Detailed Execution Steps
**Purpose**: Get step-by-step procedures for specific tasks
**Usage Pattern**: When you need detailed implementation steps
```javascript
{
  "procedure_id": "emergency_disk_cleanup",
  "context": "production"
}
```

#### `get_escalation_path` - Incident Escalation
**Purpose**: Determine appropriate escalation procedures
**Usage Pattern**: When incidents require team coordination
```javascript
{
  "incident_type": "security_breach",
  "severity": "critical",
  "business_impact": "high"
}
```

#### `list_sources` - Source Management
**Purpose**: Manage and validate documentation sources
**Usage Pattern**: System administration and health checks
```javascript
{
  "include_health": true,
  "show_stats": true
}
```

#### `search_knowledge_base` - General Documentation Search
**Purpose**: Search across all documentation types
**Usage Pattern**: Broad information discovery
```javascript
{
  "query": "search terms",
  "categories": ["runbooks", "procedures", "knowledge"],
  "max_results": 10
}
```

#### `record_resolution_feedback` - Continuous Improvement
**Purpose**: Capture resolution outcomes for system learning
**Usage Pattern**: After completing incident response
```javascript
{
  "incident_id": "INC-2024-001",
  "resolution_time_minutes": 45,
  "success": true,
  "feedback": "Runbook was accurate and complete"
}
```

### 2. REST API Endpoints (11 HTTP Endpoints)

#### High-Priority Operational Endpoints

**Runbook Search** (Most Important)
```bash
POST /api/runbooks/search
Content-Type: application/json
{
  "alert_type": "disk_space_critical",
  "severity": "critical", 
  "affected_systems": ["web-server-01"]
}
```

**General Search** (Secondary)
```bash
POST /api/search
Content-Type: application/json
{
  "query": "database performance",
  "categories": ["runbooks", "knowledge"],
  "max_results": 5
}
```

**Health Monitoring**
```bash
GET /api/health          # Quick health check
GET /api/health/detailed # Comprehensive status
GET /api/performance     # Performance metrics
```

#### All Available Endpoints
1. `POST /api/search` - General documentation search
2. `POST /api/runbooks/search` - Specialized runbook search  
3. `GET /api/runbooks` - List runbooks with filtering
4. `GET /api/runbooks/:id` - Get specific runbook
5. `POST /api/decision-tree` - Get decision logic
6. `GET /api/procedures/:id` - Get procedure steps
7. `POST /api/escalation` - Get escalation paths
8. `POST /api/feedback` - Record resolution feedback
9. `GET /api/sources` - List documentation sources
10. `GET /api/health` - System health status
11. `GET /api/performance` - Performance metrics

## Optimal Usage Patterns

### 1. Incident Response Workflow (Primary Use Case)

```bash
# Step 1: Search for relevant runbooks
curl -X POST http://localhost:3000/api/runbooks/search \
  -H "Content-Type: application/json" \
  -d '{"alert_type": "disk_space_critical", "severity": "critical"}'

# Step 2: Get decision tree if needed
curl -X POST http://localhost:3000/api/decision-tree \
  -H "Content-Type: application/json" \
  -d '{"scenario": "disk_space_critical"}'

# Step 3: Get detailed procedures
curl http://localhost:3000/api/procedures/emergency_disk_cleanup

# Step 4: Check escalation if needed
curl -X POST http://localhost:3000/api/escalation \
  -H "Content-Type: application/json" \
  -d '{"incident_type": "storage", "severity": "critical"}'

# Step 5: Record resolution feedback
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"success": true, "resolution_time_minutes": 30}'
```

### 2. Knowledge Discovery Workflow

```bash
# Broad search across all content
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "database performance tuning", "max_results": 10}'

# Browse available sources
curl http://localhost:3000/api/sources
```

### 3. System Administration Workflow

```bash
# Check overall health
curl http://localhost:3000/api/health

# Detailed system status
curl http://localhost:3000/api/health/detailed | jq

# Performance metrics
curl http://localhost:3000/api/performance | jq

# Source health
curl http://localhost:3000/api/sources | jq
```

## Performance Characteristics

### Response Time Expectations
- **Cached runbooks**: < 150ms (target achieved)
- **Standard procedures**: < 200ms (exceeds 500ms target)
- **Health checks**: < 10ms
- **Complex searches**: < 500ms

### Caching Strategy
- **Hybrid caching**: Redis + memory with intelligent fallback
- **Cache hit rate**: 60-80% MTTR reduction
- **Circuit breaker**: Prevents cascade failures

### Load Capacity
- **Concurrent requests**: 50+ simultaneous operations
- **Throughput**: >10 requests/second sustained
- **Error rate**: <1% under normal load

## Configuration and Setup

### Quick Demo Setup
```bash
# One-command demo environment
npm run demo:start

# Interactive setup with customization
npm run demo:start:interactive

# Cleanup when done
npm run demo:stop
```

### Development Environment
```bash
# Development with hot reload
npm run dev

# Generate sample data
npm run generate-sample-data

# Validate configuration  
npm run validate-config

# Interactive MCP testing
npm run test-mcp
```

### Production Deployment

#### Minimum Requirements
- Node.js 18+, npm 8+
- Redis 6+ (optional but recommended)
- 2GB RAM, 10GB disk space
- HTTPS outbound access

#### Environment Variables
```bash
# Core settings
NODE_ENV=production
REDIS_URL=redis://localhost:6379

# Source credentials (as needed)
CONFLUENCE_TOKEN=your-confluence-token
GITHUB_TOKEN=your-github-token
```

#### Configuration Structure
```yaml
server:
  port: 3000
  host: 0.0.0.0
  log_level: info

cache:
  enabled: true
  strategy: hybrid  # or memory_only
  redis:
    url_env: REDIS_URL
    ttl_seconds: 3600

sources:
  - name: ops-confluence
    type: confluence
    base_url: https://company.atlassian.net/wiki
    auth:
      type: bearer_token
      token_env: CONFLUENCE_TOKEN
```

## Troubleshooting

### Common Issues and Solutions

#### Server Not Responding
```bash
# Check if server is running
curl http://localhost:3000/api/health

# Check logs
tail -f logs/app.log

# Restart server
npm start
```

#### Cache Performance Issues
```bash
# Check cache health
curl http://localhost:3000/api/health/detailed | jq '.cache'

# Verify Redis connection
redis-cli ping

# Clear cache if needed
curl -X POST http://localhost:3000/cache/clear
```

#### Authentication Failures
```bash
# Test Confluence authentication
curl -H "Authorization: Bearer $CONFLUENCE_TOKEN" \
  "https://company.atlassian.net/wiki/rest/api/space"

# Test GitHub authentication  
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/user"

# Check environment variables
printenv | grep -E "(CONFLUENCE|GITHUB)_TOKEN"
```

#### Performance Degradation
```bash
# Check current metrics
curl http://localhost:3000/api/performance | jq

# Run performance validation
npm run performance:validate

# Check resource usage
npm run health:dashboard
```

## AI Assistant Best Practices

### 1. Always Start with Health Checks
Before any operations, verify system status:
```bash
curl http://localhost:3000/api/health
```

### 2. Use Appropriate Search Methods
- **Operational scenarios**: Use `/api/runbooks/search`
- **General information**: Use `/api/search`
- **Specific procedures**: Use `/api/procedures/:id`

### 3. Leverage Response Metadata
All responses include:
- `confidence_score` (0.0-1.0) - Trust level of results
- `match_reasons` - Why content was selected
- `retrieval_time_ms` - Performance monitoring
- `source` - Content provenance

### 4. Handle Errors Gracefully
- System falls back to memory-only if Redis fails
- Circuit breakers prevent cascade failures
- Always check response status and error messages

### 5. Optimize for Cache Performance
- Repeated queries are much faster (cache hits)
- Use consistent query patterns when possible
- Monitor cache hit rates via performance endpoints

### 6. Provide Feedback
- Use `record_resolution_feedback` after successful resolutions
- Include resolution time and success status
- Help improve system accuracy over time

## Integration Examples

### Basic Integration Pattern
```javascript
async function getIncidentRunbook(alertType, severity, systems) {
  try {
    const response = await fetch('http://localhost:3000/api/runbooks/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert_type: alertType,
        severity: severity,
        affected_systems: systems
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.runbooks.length > 0) {
      return data.runbooks[0]; // Highest confidence match
    }
    
    throw new Error('No matching runbooks found');
  } catch (error) {
    console.error('Runbook search failed:', error);
    return null;
  }
}
```

### Advanced Integration with Feedback
```javascript
async function handleIncident(alertType, severity, systems) {
  const startTime = Date.now();
  
  try {
    // 1. Get runbook
    const runbook = await getIncidentRunbook(alertType, severity, systems);
    
    // 2. Get decision tree if available
    const decisionTree = await getDecisionTree(alertType);
    
    // 3. Execute procedures (implementation specific)
    const result = await executeIncidentResponse(runbook, decisionTree);
    
    // 4. Record feedback
    const resolutionTime = Math.round((Date.now() - startTime) / 1000 / 60);
    await recordFeedback({
      incident_id: generateIncidentId(),
      resolution_time_minutes: resolutionTime,
      success: result.success,
      feedback: result.notes
    });
    
    return result;
  } catch (error) {
    await recordFeedback({
      success: false,
      feedback: `Error: ${error.message}`
    });
    throw error;
  }
}
```

## Development and Testing

### Sample Data for Testing
```bash
# Generate realistic test data
npm run generate-sample-data

# Creates:
# - 15 runbooks (JSON format)
# - 30 knowledge articles (Markdown)
# - Test configuration
```

### Interactive Testing Tools
```bash
# MCP client testing
npm run test-mcp

# Enhanced MCP explorer with auto-completion
npm run mcp-explorer

# Configuration validation
npm run validate-config

# Performance benchmarking
npm run benchmark:quick
```

### Development Commands
```bash
npm run dev                    # Development with hot reload
npm run build                  # Production build
npm run test                   # Run test suite
npm run lint                   # Code quality checks
npm run format                 # Code formatting
npm run clean                  # Clean build artifacts
```

## Success Metrics and Monitoring

### Key Performance Indicators
- **Response Time**: <150ms for cached runbooks (achieved)
- **Cache Hit Rate**: >60% operational scenarios (achieved 75%)
- **Availability**: 99.9% uptime with circuit breakers
- **Accuracy**: 95%+ relevant results for incident scenarios

### Monitoring Endpoints
```bash
GET /api/health          # Basic health status
GET /api/health/detailed # Comprehensive health check
GET /api/performance     # Performance metrics and statistics
GET /api/sources         # Source adapter health and stats
```

### Real-time Monitoring
```bash
# Health dashboard
npm run health:dashboard

# Performance monitoring
npm run performance:monitor

# System monitoring status
npm run monitoring:status
```

This guide provides everything an AI assistant needs to efficiently use Personal Pipeline for incident response, knowledge discovery, and system administration. The system is designed to be intelligent, fast, and reliable for operational scenarios.