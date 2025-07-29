# Testing Framework Documentation

**Authored by: QA Engineer**  
**Date: 2025-01-29**

This document provides comprehensive information about the testing framework implemented for Personal Pipeline MCP Server milestone 1.3.

## Overview

The testing framework ensures comprehensive quality assurance through multiple testing layers:

- **Unit Tests**: 80%+ coverage of core components
- **Integration Tests**: End-to-end workflow validation
- **Error Scenario Tests**: Failure handling and recovery
- **Performance Tests**: Response time and load validation
- **Security Tests**: Vulnerability scanning and compliance

## Test Structure

```
tests/
├── unit/                   # Unit tests for individual components
│   ├── core/              # Server and core functionality
│   └── utils/             # Utility services (cache, monitoring, performance)
├── integration/           # End-to-end integration tests
│   ├── cache-integration.test.ts
│   ├── performance-integration.test.ts
│   └── health-monitoring-integration.test.ts
├── error-scenarios/       # Error handling and recovery tests
│   ├── redis-failure.test.ts
│   └── network-issues.test.ts
└── helpers/               # Test utilities and data generation
    ├── test-data-generator.ts
    └── test-utils.ts
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm test -- tests/unit
npm test -- tests/integration
npm test -- tests/error-scenarios

# Watch mode for development
npm run test:watch
```

### Advanced Test Runner

The project includes a comprehensive test runner script:

```bash
# Complete test suite with reporting
npm run test:runner

# Parallel execution for faster results
npm run test:runner:parallel

# Verbose output with coverage
npm run test:runner:verbose

# Quality gate validation (CI/CD)
npm run test:quality-gate
```

## Test Categories

### Unit Tests

**Coverage**: 80%+ target for all core modules

**Focus Areas**:
- Cache service operations (memory and Redis)
- Monitoring service and alert management
- Performance tracking and metrics
- Circuit breaker functionality
- Configuration management

**Key Features**:
- Redis mocking for consistent testing
- Comprehensive error scenario coverage
- Performance validation
- Statistics and health check testing

### Integration Tests

**Purpose**: End-to-end workflow validation

**Test Scenarios**:
- **Cache Integration**: MCP tool calls with caching
- **Performance Integration**: Response time validation under load
- **Health Monitoring**: System health checks and alerting

**Performance Requirements**:
- Cached responses: <200ms
- Uncached responses: <500ms
- Concurrent load: 50+ simultaneous requests
- Memory usage: <512MB

### Error Scenario Tests

**Redis Failure Scenarios**:
- Connection timeouts and failures
- Authentication and authorization errors
- Data corruption and recovery
- Network partition handling
- Circuit breaker activation

**Network Issue Scenarios**:
- DNS resolution failures
- Packet loss simulation
- Slow network conditions
- Connection drops and recovery
- Mixed failure conditions

### Performance Tests

**Benchmarking**:
- Response time measurement
- Throughput analysis
- Memory usage validation
- Concurrent load testing
- Scalability assessment

**Thresholds**:
- Average response time: <200ms (cached), <500ms (uncached)
- Memory growth: <100MB under load
- Error rate: <1% under normal conditions
- Cache hit rate: >80% for operational scenarios

## Test Data Management

### Test Data Generator

The `TestDataGenerator` class provides realistic test data:

```typescript
import { testDataGenerator } from '../helpers/test-data-generator';

// Generate test runbooks
const runbook = testDataGenerator.generateRunbook({
  category: 'infrastructure',
  complexity: 'complex'
});

// Generate complete test dataset
const dataset = testDataGenerator.generateTestDataset({
  runbooks: 5,
  procedures: 3,
  decisionTrees: 2,
  knowledgeBase: 4
});
```

### Test Environment Setup

Use `createTestEnvironment` for consistent test setup:

```typescript
import { createTestEnvironment } from '../helpers/test-utils';

const testEnv = await createTestEnvironment({
  enableCache: true,
  cacheStrategy: 'memory_with_redis',
  generateTestData: {
    runbooks: 5,
    procedures: 3
  }
});

// Use testEnv.server, testEnv.cacheService, etc.
await testEnv.cleanup(); // Always cleanup
```

## Quality Gates

### Coverage Requirements

- **Lines**: ≥80%
- **Statements**: ≥80%
- **Functions**: ≥80% 
- **Branches**: ≥75%

### Performance Requirements

- **Response Time**: 
  - Cached: <200ms average
  - Uncached: <500ms average
- **Concurrent Load**: Handle 50+ simultaneous requests
- **Memory Usage**: <512MB under normal load
- **Cache Hit Rate**: >80% for repeated operations

### Security Requirements

- **Vulnerability Scan**: <5 moderate+ vulnerabilities
- **Dependency Audit**: All critical/high vulnerabilities addressed
- **Error Handling**: No sensitive information in error messages

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/test-quality.yml` workflow provides:

- **Multi-Node Testing**: Node.js 18.x and 20.x
- **Service Dependencies**: Redis 7-alpine
- **Parallel Test Execution**: Unit, integration, and error scenarios
- **Coverage Reporting**: Codecov integration
- **Performance Validation**: Automated benchmark execution
- **Security Scanning**: npm audit and vulnerability checks

### Workflow Stages

1. **Code Quality**: Linting and type checking
2. **Test Execution**: All test suites with coverage
3. **Performance Testing**: Benchmark validation
4. **Security Scanning**: Vulnerability assessment
5. **Report Generation**: Comprehensive test reporting
6. **Quality Gate Validation**: Threshold enforcement

## Test Utilities

### Performance Testing Helper

```typescript
import { PerformanceTestHelper } from '../helpers/test-utils';

const perfHelper = new PerformanceTestHelper();
perfHelper.start();
// ... perform operation
const responseTime = perfHelper.stop();
const stats = perfHelper.getStatistics();
```

### Cache Testing Helper

```typescript
import { CacheTestHelper } from '../helpers/test-utils';

const cacheHelper = new CacheTestHelper(cacheService);
await cacheHelper.warmCache('runbooks', 5);
const isValid = await cacheHelper.validateCacheHitRate(0.8);
```

### Load Generation

```typescript
import { generateLoad } from '../helpers/test-utils';

const result = await generateLoad(server, {
  requestCount: 50,
  concurrency: 10,
  requestTypes: [{
    name: 'search_runbooks',
    arguments: { alert_type: 'test', severity: 'medium', systems: ['test'] }
  }]
});
```

## Mocking Strategy

### Redis Mocking

All tests use consistent Redis mocking:

```typescript
import { createMockRedis } from '../helpers/test-utils';

const mockRedis = createMockRedis();
// Configure mock behavior
mockRedis.get.mockResolvedValue(testData);
mockRedis.setex.mockResolvedValue('OK');
```

### Service Mocking

External dependencies are mocked consistently:

- **Logger**: Prevents console output during tests
- **Redis**: Simulates various failure scenarios
- **Circuit Breakers**: Configurable failure patterns
- **File System**: Controlled test data environment

## Best Practices

### Test Writing Guidelines

1. **Descriptive Names**: Test names should clearly describe the scenario
2. **Isolated Tests**: Each test should be independent and repeatable
3. **Comprehensive Coverage**: Test both success and failure paths
4. **Performance Awareness**: Include performance assertions where relevant
5. **Cleanup**: Always cleanup resources in afterEach/afterAll hooks

### Error Testing

1. **Multiple Failure Modes**: Test various types of failures
2. **Recovery Scenarios**: Validate system recovery after failures
3. **Gradual Degradation**: Test partial failure conditions
4. **Performance Impact**: Ensure failures don't severely impact performance

### Integration Testing

1. **Real Workflows**: Test complete user scenarios
2. **Data Persistence**: Validate data consistency across operations
3. **Performance Validation**: Include performance requirements
4. **Health Monitoring**: Test system health reporting

## Troubleshooting

### Common Issues

**Test Timeouts**:
- Increase Jest timeout for integration tests
- Check for hanging promises or connections
- Verify test cleanup is working correctly

**Coverage Issues**:
- Review uncovered code paths
- Add tests for error conditions
- Check Jest configuration and exclusions

**Flaky Tests**:
- Add proper wait conditions
- Use deterministic test data
- Check for race conditions in async operations

**Performance Test Failures**:
- Verify system resources during testing
- Check for background processes affecting performance
- Review performance thresholds for CI environment

## Reporting

### Test Reports

Test execution generates multiple reports:

- **Coverage Report**: HTML and LCOV formats
- **Test Results**: JSON and text summaries
- **Performance Report**: Benchmark results and analysis
- **Security Report**: Vulnerability scan results

### CI/CD Reports

GitHub Actions generates:

- **Pull Request Comments**: Test result summaries
- **Artifacts**: Detailed reports and coverage data
- **Status Checks**: Quality gate validation results

## Future Enhancements

### Planned Improvements

1. **Visual Testing**: Screenshot comparison for UI components
2. **Contract Testing**: API contract validation
3. **Chaos Engineering**: More sophisticated failure injection
4. **Load Testing**: Extended load scenarios with realistic data
5. **Security Testing**: Deeper security scenario validation

### Monitoring Integration

1. **Real-time Test Metrics**: Live dashboard for test execution
2. **Trend Analysis**: Historical test performance tracking
3. **Predictive Analysis**: Early warning for potential issues
4. **Resource Optimization**: Test resource usage optimization