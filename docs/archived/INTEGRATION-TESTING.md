# ⚠️ DOCUMENTATION ARCHIVE STATUS ⚠️
## 🔒 **DEPRECATED - NO LONGER REFERENCED FOR CURRENT PROJECT**
**Status**: Historical/milestone documentation - reference only  
**Archive Date**: August 16, 2025  
**Reference**: This document is deprecated and should not be used for current development  

---


# Personal Pipeline Integration Test Suite

## Overview

The Personal Pipeline Integration Test Suite provides comprehensive testing for all 4 source adapters working together in real-world scenarios. It validates multi-source search, end-to-end incident response workflows, performance requirements, failover mechanisms, and authentication across the entire system.

## Architecture

### Test Categories

1. **Source Integration Tests** - All 4 adapters responding and healthy
2. **Cross-Source Search Tests** - Search queries spanning multiple sources
3. **Workflow Integration Tests** - Complete incident response workflows
4. **Performance Integration Tests** - Response time validation under load
5. **Failover Integration Tests** - Adapter failure and recovery testing
6. **Authentication Integration Tests** - Multi-auth method validation
7. **Configuration Tests** - Various configuration scenario validation

### Supported Adapters

- **FileSystemAdapter** - Local files and directories
- **ConfluenceAdapter** - Atlassian Confluence wiki pages
- **GitHubAdapter** - GitHub repositories and documentation
- **WebAdapter** - REST APIs and web-based documentation sources

## Quick Start

### Prerequisites

1. **Node.js 18+** and npm installed
2. **Personal Pipeline server** dependencies installed (`npm install`)
3. **Optional environment variables** for external adapters:
   - `CONFLUENCE_TOKEN` - For Confluence adapter testing
   - `GITHUB_TOKEN` - For GitHub adapter testing

### Running Integration Tests

```bash
# Generate test data and run full integration test suite
npm run test:integration:setup

# Run integration tests with existing data
npm run test:integration

# Quick test suite (reduced timeouts)
npm run test:integration:quick

# Thorough test suite (extended timeouts)
npm run test:integration:thorough

# Skip specific adapters if credentials not available
npm run test:integration:no-github
npm run test:integration:no-confluence
```

### Generate Test Data Only

```bash
# Generate comprehensive test data for all adapters
npm run generate:integration-test-data

# Generate test data to custom location
tsx scripts/generate-integration-test-data.ts --output-dir /custom/path
```

## Test Configuration

### Environment Variables

The test suite automatically detects available credentials and adjusts testing accordingly:

```bash
# Required for Confluence adapter integration testing
export CONFLUENCE_TOKEN="your-confluence-api-token"

# Required for GitHub adapter integration testing  
export GITHUB_TOKEN="your-github-personal-access-token"

# Optional: Custom server port
export TEST_SERVER_PORT=3001
```

### Test Data Structure

The integration test suite generates realistic test data:

```
test-data-integration/
├── runbooks/                  # Operational runbooks (MD + JSON)
│   ├── disk-space-critical.md
│   ├── memory-leak-investigation.md
│   ├── security-incident-response.md
│   └── ...
├── knowledge-base/            # General documentation (MD + JSON)
│   ├── monitoring-best-practices.md
│   ├── security-hardening-guide.md
│   └── ...
├── procedures/                # Step-by-step procedures (MD + JSON)
│   ├── emergency-disk-cleanup.md
│   ├── service-restart-procedure.md
│   └── ...
├── configurations/            # Test configurations
│   ├── config-minimal.yaml
│   ├── config-multi-adapter.yaml
│   └── config-performance.yaml
└── TEST-SCENARIOS.md          # Test scenario documentation
```

## Test Scenarios

### 1. Source Integration Tests

**Purpose**: Validate all adapters are properly configured, healthy, and operational.

**Tests**:
- Adapter health checks across all sources
- Basic functionality validation for each adapter
- Authentication status verification
- Configuration validation

**Success Criteria**:
- All enabled adapters report healthy status
- Authentication configured correctly for external adapters
- Basic search functionality works across all sources

### 2. Cross-Source Search Tests

**Purpose**: Ensure search queries work across multiple documentation sources with proper result aggregation.

**Tests**:
- Multi-source search query execution
- Runbook aggregation from multiple sources  
- Knowledge base integration testing
- Search result merging and ranking validation

**Example Queries**:
```typescript
// Multi-source technical search
{
  query: "disk space cleanup procedures",
  expected_sources: ["local-docs", "confluence-docs", "github-docs"],
  min_results: 3
}

// Incident response workflow search  
{
  alert_type: "memory_leak",
  severity: "high", 
  affected_systems: ["app-server-02"],
  expected_runbooks: 2
}
```

**Success Criteria**:
- Results returned from multiple sources
- Proper confidence scoring and ranking
- No duplicate content across sources
- Response times within thresholds

### 3. Workflow Integration Tests

**Purpose**: Validate complete end-to-end incident response workflows using multiple documentation sources.

**Complete Incident Response Workflow**:
1. **Runbook Search** - Find relevant operational runbooks
2. **Decision Tree** - Get decision logic for the scenario
3. **Procedure Retrieval** - Get detailed execution steps
4. **Escalation Check** - Determine escalation procedures
5. **Feedback Recording** - Record resolution outcomes

**Test Scenarios**:
- Critical disk space incident response
- Security incident detection and response
- Application performance troubleshooting
- Network connectivity issue resolution

**Success Criteria**:
- All workflow steps complete successfully
- Total workflow time under performance thresholds
- Proper data flow between workflow components
- Accurate escalation and feedback mechanisms

### 4. Performance Integration Tests

**Purpose**: Validate system performance under realistic load with multiple adapters.

**Performance Requirements**:
- **Cached responses**: < 200ms (target: < 150ms)
- **Uncached responses**: < 500ms (target: < 300ms)
- **Health checks**: < 100ms
- **Concurrent queries**: 50+ simultaneous operations

**Tests**:
- Cached vs uncached response time validation
- Concurrent query performance testing
- Load distribution across adapters
- Cache hit rate optimization

**Performance Scenarios**:
```typescript
// Concurrent load test
{
  concurrent_requests: 20,
  test_duration: "2 minutes",
  query_types: ["search", "runbook", "procedure"],
  success_threshold: "95%"
}

// Cache performance test
{
  cache_warm_queries: 10,
  cache_test_queries: 50,
  expected_hit_rate: "80%",
  max_response_time: "150ms"
}
```

**Success Criteria**:
- All response time thresholds met
- Successful handling of concurrent load
- Cache hit rates above targets
- No performance degradation over time

### 5. Failover Integration Tests

**Purpose**: Test system resilience when individual adapters fail or become unavailable.

**Failover Scenarios**:
- Individual adapter failure simulation
- Network connectivity issues
- Authentication failures
- Partial system degradation

**Tests**:
- Graceful degradation when adapters unavailable
- Circuit breaker behavior validation
- Partial failure handling
- Recovery mechanism testing

**Success Criteria**:
- System remains operational with reduced adapter set
- No cascade failures from single adapter issues
- Proper error handling and user feedback
- Automatic recovery when adapters become available

### 6. Authentication Integration Tests

**Purpose**: Validate different authentication methods work correctly across all adapters.

**Authentication Methods**:
- **File Adapter**: No authentication required
- **Confluence**: Bearer token authentication
- **GitHub**: Personal access token authentication  
- **Web**: Various methods (API key, Basic auth, etc.)

**Tests**:
- Multiple authentication method validation
- Token refresh and rotation testing
- Authentication error handling
- Cross-adapter authentication status

**Success Criteria**:
- All configured authentication methods work
- Proper error handling for invalid credentials
- No authentication leakage between adapters
- Graceful handling of expired tokens

### 7. Configuration Tests

**Purpose**: Validate various configuration scenarios and edge cases.

**Configuration Scenarios**:
- Minimal configuration (single adapter)
- Multi-adapter configuration  
- Performance-optimized configuration
- Security-hardened configuration

**Tests**:
- Configuration file validation
- Adapter-specific configuration testing
- Cache configuration validation
- Performance tuning verification

## Performance Targets

### Response Time Requirements

| Operation Type | Cached | Uncached | Target |
|---------------|--------|----------|---------|
| Health Check | < 50ms | < 100ms | < 25ms |
| Simple Search | < 100ms | < 300ms | < 150ms |
| Runbook Search | < 150ms | < 500ms | < 200ms |
| Complex Workflow | < 500ms | < 1500ms | < 800ms |

### Throughput Requirements

| Scenario | Concurrent Requests | Success Rate | Duration |
|----------|-------------------|--------------|----------|
| Normal Load | 20 req/s | > 99% | Continuous |
| Peak Load | 50 req/s | > 95% | 5 minutes |
| Stress Load | 100 req/s | > 90% | 2 minutes |

### Reliability Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| System Uptime | 99.9% | Per test run |
| Adapter Availability | 95% individual | Health checks |
| Cache Hit Rate | > 80% | For repeated queries |
| Error Rate | < 1% | For all operations |

## Test Execution

### Automated Execution

The integration test runner provides automated execution with comprehensive reporting:

```bash
# Full automated test suite
npm run test:integration

# Watch test results in real-time
npm run test:integration -- --watch

# Generate detailed test report
npm run test:integration -- --report-format json
```

### Manual Test Execution

For debugging or custom scenarios:

```typescript
import { IntegrationTestRunner } from './scripts/integration-tests';

const runner = new IntegrationTestRunner({
  serverPort: 3000,
  testTimeout: 60000,
  performanceThresholds: {
    cachedResponseTime: 150,
    uncachedResponseTime: 400,
  },
  adapters: {
    file: true,
    confluence: true,
    github: true,
    web: true,
  },
});

const results = await runner.runAllTests();
console.log(`Success Rate: ${results.summary.successRate}%`);
```

### Test Configuration Options

```typescript
interface TestConfig {
  serverPort: number;           // Server port (default: 3000)
  serverTimeout: number;        // Server startup timeout (default: 30s)
  testTimeout: number;          // Individual test timeout (default: 60s)
  concurrentRequests: number;   // Concurrent request limit (default: 10)
  
  performanceThresholds: {
    cachedResponseTime: number;    // Max cached response time (default: 200ms)
    uncachedResponseTime: number;  // Max uncached response time (default: 500ms)
    healthCheckTime: number;       // Max health check time (default: 100ms)
    failoverTime: number;          // Max failover time (default: 5000ms)
  };
  
  adapters: {
    file: boolean;        // Enable file adapter tests
    confluence: boolean;  // Enable Confluence adapter tests  
    github: boolean;      // Enable GitHub adapter tests
    web: boolean;         // Enable web adapter tests
  };
}
```

## Test Results and Reporting

### Test Result Structure

```typescript
interface IntegrationTestSuite {
  sourceIntegrationTests: TestResult[];      // Adapter health and functionality
  crossSourceSearchTests: TestResult[];     // Multi-source search validation  
  workflowIntegrationTests: TestResult[];    // End-to-end workflow testing
  performanceIntegrationTests: TestResult[]; // Performance validation
  failoverIntegrationTests: TestResult[];    // Resilience testing
  authenticationIntegrationTests: TestResult[]; // Auth method validation
  configurationTests: TestResult[];          // Configuration testing
  
  summary: {
    totalTests: number;      // Total number of tests executed
    passed: number;          // Number of successful tests
    failed: number;          // Number of failed tests
    skipped: number;         // Number of skipped tests
    overallDuration: number; // Total execution time in ms
    successRate: number;     // Percentage of successful tests
  };
}
```

### Performance Metrics

Each test includes detailed performance metrics:

```typescript
interface TestResult {
  testName: string;
  category: string;
  success: boolean;
  duration: number;
  details: any;
  error?: string;
  metrics?: {
    responseTime?: number;    // API response time
    accuracy?: number;        // Result accuracy score
    throughput?: number;      // Requests per second
    failoverTime?: number;    // Time to recover from failure
  };
}
```

### Report Generation

```bash
# Generate JSON report
npm run test:integration > integration-test-results.json

# Generate HTML report (if available)
npm run test:integration -- --format html --output reports/

# View real-time dashboard during testing
npm run test:integration -- --dashboard
```

## Troubleshooting

### Common Issues

#### Server Connection Problems
```bash
# Check if server is running
curl http://localhost:3000/health

# Start server manually if needed
npm run dev

# Check server logs
npm run dev | grep ERROR
```

#### Authentication Failures
```bash
# Verify environment variables
echo $CONFLUENCE_TOKEN
echo $GITHUB_TOKEN

# Test authentication manually
curl -H "Authorization: Bearer $CONFLUENCE_TOKEN" \
  https://your-company.atlassian.net/wiki/rest/api/space
```

#### Performance Issues
```bash
# Check system resources
top
free -h
df -h

# Monitor server performance during tests
npm run health:dashboard &
npm run test:integration
```

#### Test Data Issues
```bash
# Regenerate test data
rm -rf test-data-integration/
npm run generate:integration-test-data

# Verify test data structure
ls -la test-data-integration/
```

### Debug Mode

Enable detailed debugging:

```bash
# Enable debug logging
DEBUG=integration-tests npm run test:integration

# Run single test category
tsx scripts/integration-tests.ts --category performance

# Run with detailed error output
npm run test:integration -- --verbose --stack-trace
```

### Test Isolation

Run tests in isolation for debugging:

```typescript
// Test specific adapter
const runner = new IntegrationTestRunner({
  adapters: { file: true, confluence: false, github: false, web: false }
});

// Test specific scenario
await runner.testIncidentResponseWorkflow();

// Test specific performance threshold
await runner.testCachedPerformance();
```

## CI/CD Integration

### GitHub Actions Integration

```yaml
name: Integration Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate test data
        run: npm run generate:integration-test-data
        
      - name: Run integration tests
        run: npm run test:integration:quick
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CONFLUENCE_TOKEN: ${{ secrets.CONFLUENCE_TOKEN }}
          
      - name: Upload test results
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: integration-test-results
          path: integration-test-results.json
```

### Quality Gates

```yaml
# Minimum quality requirements
quality_gates:
  success_rate: 95%           # Minimum test pass rate
  max_duration: 300          # Maximum test suite duration (5 minutes)
  performance_regression: 10% # Maximum performance degradation
  adapter_availability: 90%   # Minimum adapter availability
```

## Contributing

### Adding New Test Scenarios

1. **Create test data** in `scripts/generate-integration-test-data.ts`
2. **Add test scenario** to appropriate test category
3. **Update expected results** and success criteria
4. **Test locally** before submitting PR

### Adding New Adapters

1. **Implement adapter** following the `SourceAdapter` interface
2. **Add adapter configuration** to test configs
3. **Create adapter-specific test data**
4. **Add authentication handling** if required
5. **Update integration tests** to include new adapter

### Performance Optimization

1. **Profile test execution** to identify bottlenecks
2. **Optimize test data generation** for faster setup
3. **Implement parallel test execution** where possible
4. **Add performance regression detection**

## Best Practices

### Test Design
- **Realistic scenarios** - Use real-world incident response workflows
- **Comprehensive coverage** - Test all adapter combinations
- **Performance-aware** - Include response time validation in all tests
- **Resilience testing** - Simulate failure conditions

### Test Data
- **Version control** - Keep test data in source control
- **Realistic content** - Use actual runbook and documentation patterns  
- **Multiple formats** - Support both Markdown and JSON formats
- **Comprehensive metadata** - Include confidence scores and tags

### Test Maintenance
- **Regular updates** - Keep test data current with real documentation
- **Performance monitoring** - Track test execution performance over time
- **Automated cleanup** - Clean up test artifacts after execution
- **Documentation** - Keep test documentation current and comprehensive

## Resources

### Documentation
- [Personal Pipeline Architecture](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Development Guide](./DEVELOPMENT.md)
- [Testing Strategy](./TESTING.md)

### Configuration Examples
- [Sample Configurations](../config/)
- [Environment Setup](../scripts/setup-demo.sh)
- [Performance Tuning](./PERFORMANCE-TUNING.md)

### Support
- **GitHub Issues**: [Report integration test issues](https://github.com/your-org/personal-pipeline/issues)
- **Discussions**: [Integration testing discussions](https://github.com/your-org/personal-pipeline/discussions)
- **Documentation**: [Complete documentation](https://docs.personal-pipeline.dev)