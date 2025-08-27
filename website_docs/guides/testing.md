# Testing Guide

Comprehensive testing strategies and practices for Personal Pipeline, covering unit tests, integration tests, performance testing, and quality assurance.

## Testing Overview

Personal Pipeline uses a multi-layered testing strategy to ensure reliability, performance, and maintainability:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and API endpoints  
- **Performance Tests**: Validate response times and throughput
- **Security Tests**: Validate security measures and input handling
- **End-to-End Tests**: Test complete user workflows

## Test Framework and Tools

### Core Testing Stack

- **Jest**: Primary testing framework with built-in assertion library
- **Supertest**: HTTP testing for REST API endpoints
- **Redis Mock**: In-memory Redis simulation for testing
- **Test Helpers**: Custom utilities for test setup and data generation

### Test Configuration

```javascript
// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test suite
npm run test:unit
npm run test:integration

# Run tests with Redis integration
npm run test:redis

# Run Redis tests in watch mode
npm run test:redis:watch
```

### Test Environment Variables

```bash
# Test configuration
NODE_ENV=test
LOG_LEVEL=warn

# Redis testing (optional)
TEST_REDIS=true
REDIS_URL=redis://localhost:6379

# Test data paths
TEST_DATA_PATH=./test-data-integration
```

### Continuous Integration

```bash
# CI test pipeline
npm ci                    # Install dependencies
npm run lint             # Code quality
npm run typecheck        # Type checking
npm run test:coverage    # Tests with coverage
npm run build            # Build verification
```

## Unit Testing

### Test Structure

```
tests/
├── unit/                     # Unit tests
│   ├── adapters/            # Adapter tests
│   │   ├── file.test.ts     # FileSystem adapter
│   │   ├── web.test.ts      # Web adapter
│   │   └── base.test.ts     # Base adapter
│   ├── core/                # Core logic tests
│   │   └── server.test.ts   # MCP server
│   ├── tools/               # MCP tools tests
│   │   ├── search-runbooks.test.ts
│   │   ├── decision-tree.test.ts
│   │   └── procedures.test.ts
│   └── utils/               # Utility tests
│       ├── cache.test.ts
│       ├── config.test.ts
│       └── performance.test.ts
```

### Unit Test Examples

#### Testing MCP Tools

```typescript
// tests/unit/tools/search-runbooks.test.ts
import { PPMCPTools } from '../../../src/tools/index.js';
import { createMockAdapter } from '../../utils/test-helpers.js';

describe('PPMCPTools - search_runbooks', () => {
  let tools: PPMCPTools;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    tools = new PPMCPTools();
    tools.registerAdapter('test', mockAdapter);
  });

  describe('successful searches', () => {
    it('should return runbooks matching alert type', async () => {
      // Arrange
      const expectedRunbook = {
        id: 'disk-space-critical',
        title: 'Critical Disk Space Alert Response',
        confidence_score: 0.95,
        severity_mapping: {
          critical: 'immediate_response'
        }
      };

      mockAdapter.setSearchRunbooksResponse([expectedRunbook]);

      // Act
      const result = await tools.search_runbooks('disk_space', 'critical');

      // Assert
      expect(result.success).toBe(true);
      expect(result.runbooks).toHaveLength(1);
      expect(result.runbooks[0]).toMatchObject(expectedRunbook);
      expect(result.retrieval_time_ms).toBeGreaterThan(0);
    });

    it('should meet performance requirements', async () => {
      // Arrange
      mockAdapter.setSearchRunbooksResponse([
        { id: 'test-runbook', confidence_score: 0.9 }
      ]);

      // Act
      const startTime = Date.now();
      const result = await tools.search_runbooks('disk_space');
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(200);
      expect(result.retrieval_time_ms).toBeLessThan(200);
    });
  });

  describe('error handling', () => {
    it('should handle adapter failures gracefully', async () => {
      // Arrange
      mockAdapter.setSearchRunbooksError(new Error('Adapter failure'));

      // Act & Assert
      await expect(
        tools.search_runbooks('disk_space')
      ).rejects.toThrow('Runbook search failed');
    });

    it('should validate input parameters', async () => {
      // Act & Assert
      await expect(
        tools.search_runbooks('')
      ).rejects.toThrow('Alert type is required');
    });
  });
});
```

#### Testing Adapters

```typescript
// tests/unit/adapters/file.test.ts
import { FileSystemAdapter } from '../../../src/adapters/file-enhanced.js';
import { createTestFileSystem } from '../../utils/test-helpers.js';

describe('FileSystemAdapter', () => {
  let adapter: FileSystemAdapter;
  let testFS: TestFileSystem;

  beforeEach(async () => {
    testFS = createTestFileSystem({
      'runbooks/disk-space.md': '# Disk Space Runbook\n\nCritical alert response...',
      'runbooks/memory-leak.json': JSON.stringify({
        id: 'memory-leak',
        title: 'Memory Leak Investigation'
      })
    });

    adapter = new FileSystemAdapter({
      name: 'test-fs',
      type: 'file',
      base_url: testFS.root,
      recursive: true,
      supported_extensions: ['.md', '.json']
    });

    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.cleanup();
    testFS.cleanup();
  });

  describe('search functionality', () => {
    it('should find documents by content search', async () => {
      // Act
      const results = await adapter.search('disk space');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].confidence_score).toBeGreaterThan(0.7);
      expect(results[0].id).toContain('disk-space');
    });

    it('should support fuzzy matching', async () => {
      // Act
      const results = await adapter.search('memry leak'); // Typo

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].id).toContain('memory-leak');
    });
  });

  describe('health checking', () => {
    it('should report healthy status', async () => {
      // Act
      const health = await adapter.healthCheck();

      // Assert
      expect(health.status).toBe('healthy');
      expect(health.response_time_ms).toBeGreaterThan(0);
      expect(health.document_count).toBeGreaterThan(0);
    });
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// tests/integration/api/runbooks.test.ts
import request from 'supertest';
import { createTestApp } from '../../utils/test-helpers.js';

describe('Runbook API Integration', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp({
      cacheStrategy: 'memory'
    });
  });

  describe('POST /api/runbooks/search', () => {
    it('should search runbooks via REST API', async () => {
      // Act
      const response = await request(app)
        .post('/api/runbooks/search')
        .send({
          alert_type: 'disk_space',
          severity: 'critical',
          systems: ['web-server']
        })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.runbooks).toBeInstanceOf(Array);
      expect(response.body.data.runbooks.length).toBeGreaterThan(0);
      
      const runbook = response.body.data.runbooks[0];
      expect(runbook).toHaveProperty('id');
      expect(runbook).toHaveProperty('confidence_score');
    });

    it('should validate request parameters', async () => {
      // Act
      const response = await request(app)
        .post('/api/runbooks/search')
        .send({
          alert_type: '', // Invalid
          severity: 'invalid_severity'
        })
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should meet performance requirements', async () => {
      // Act
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/runbooks/search')
        .send({
          alert_type: 'disk_space',
          severity: 'critical'
        })
        .expect(200);
      const endTime = Date.now();

      // Assert
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(200); // < 200ms requirement
    });
  });

  describe('GET /api/health', () => {
    it('should return system health status', async () => {
      // Act
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.components).toBeDefined();
    });

    it('should respond quickly for health checks', async () => {
      // Act
      const startTime = Date.now();
      await request(app).get('/api/health').expect(200);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(50); // < 50ms for health checks
    });
  });
});
```

### Cache Integration Tests

```typescript
// tests/integration/cache-service.test.ts
import { HybridCache } from '../../src/utils/cache.js';
import { createTestRedisClient } from '../utils/redis-mock.js';

describe('Cache Service Integration', () => {
  let cache: HybridCache;

  beforeAll(async () => {
    const redisClient = await createTestRedisClient();
    cache = new HybridCache({
      strategy: 'hybrid',
      redisClient: redisClient
    });
  });

  describe('cache consistency', () => {
    it('should maintain consistency between memory and Redis', async () => {
      // Arrange
      const testData = { id: 'test-1', data: 'consistency-test' };

      // Act
      await cache.set('consistency-key', testData);
      
      // Clear memory cache to force Redis lookup
      await cache.clearMemory();
      const fromRedis = await cache.get('consistency-key');

      // Assert
      expect(fromRedis).toEqual(testData);
    });

    it('should handle concurrent cache operations', async () => {
      // Arrange
      const operations = Array.from({ length: 100 }, (_, i) => ({
        key: `load-test-${i}`,
        value: { id: i, data: `test-data-${i}` }
      }));

      // Act
      const startTime = Date.now();
      
      await Promise.all([
        // Concurrent writes
        ...operations.map(op => cache.set(op.key, op.value)),
        // Concurrent reads
        ...operations.map(op => cache.get(op.key))
      ]);

      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
```

## Performance Testing

### Response Time Testing

```typescript
// tests/performance/response-time.test.ts
import { PPMCPTools } from '../../src/tools/index.js';
import { createPerformanceTestAdapter } from '../utils/test-helpers.js';

describe('Performance Tests', () => {
  let tools: PPMCPTools;

  beforeAll(async () => {
    const perfAdapter = await createPerformanceTestAdapter({
      documentCount: 1000,
      runbookCount: 100
    });
    
    tools = new PPMCPTools();
    tools.registerAdapter('perf', perfAdapter);
  });

  describe('response time requirements', () => {
    it('should search runbooks within 200ms', async () => {
      // Arrange
      const measurements: number[] = [];

      // Act - Multiple measurements for statistical significance
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await tools.search_runbooks('disk_space', 'critical');
        const endTime = Date.now();
        measurements.push(endTime - startTime);
      }

      // Assert
      const averageTime = measurements.reduce((a, b) => a + b) / measurements.length;
      const maxTime = Math.max(...measurements);

      expect(averageTime).toBeLessThan(150); // Well under 200ms average
      expect(maxTime).toBeLessThan(200);     // No single request over 200ms
    });

    it('should handle concurrent requests efficiently', async () => {
      // Arrange
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        () => tools.search_runbooks(`alert_type_${i % 10}`, 'high')
      );

      // Act
      const startTime = Date.now();
      const results = await Promise.all(requests.map(req => req()));
      const endTime = Date.now();

      // Assert
      const totalTime = endTime - startTime;
      const averagePerRequest = totalTime / concurrentRequests;

      expect(averagePerRequest).toBeLessThan(500); // 500ms per request under load
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('memory management', () => {
    it('should not leak memory during extended operation', async () => {
      // Arrange
      const initialMemory = process.memoryUsage();
      const iterations = 1000;

      // Act
      for (let i = 0; i < iterations; i++) {
        await tools.search_runbooks(`memory_test_${i}`, 'medium');
        
        // Force garbage collection periodically if available
        if (global.gc && i % 100 === 0) {
          global.gc();
        }
      }

      // Wait for any pending operations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Assert
      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth
    });
  });
});
```

### Load Testing

```typescript
// tests/performance/load-test.test.ts
describe('Load Testing', () => {
  it('should handle peak load conditions', async () => {
    // Arrange
    const loadTest = createLoadTestScenario({
      baseUrl: 'http://localhost:3000',
      endpoints: [
        { path: '/api/runbooks/search', weight: 40 },
        { path: '/api/health', weight: 20 }
      ],
      loadPattern: {
        rampUp: { duration: 30, targetRPS: 50 },
        sustain: { duration: 120, RPS: 50 },
        rampDown: { duration: 30, targetRPS: 0 }
      }
    });

    // Act
    const results = await loadTest.execute();

    // Assert
    expect(results.summary.successRate).toBeGreaterThan(0.99);
    expect(results.summary.averageResponseTime).toBeLessThan(300);
    expect(results.summary.p95ResponseTime).toBeLessThan(500);
    expect(results.summary.errorRate).toBeLessThan(0.01);
  });
});
```

## Security Testing

### Input Validation Tests

```typescript
// tests/security/input-validation.test.ts
import request from 'supertest';
import { createTestApp } from '../utils/test-helpers.js';

describe('Security - Input Validation', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('SQL injection protection', () => {
    it('should reject SQL injection attempts', async () => {
      // Arrange
      const maliciousInputs = [
        "'; DROP TABLE runbooks; --",
        "' OR '1'='1",
        "1'; DELETE FROM procedures; --"
      ];

      // Act & Assert
      for (const input of maliciousInputs) {
        const response = await request(app)
          .post('/api/runbooks/search')
          .send({ alert_type: input })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('XSS protection', () => {
    it('should sanitize script injection attempts', async () => {
      // Arrange
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">'
      ];

      // Act & Assert
      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/search')
          .send({ query: payload })
          .expect(200);

        // Response should be sanitized
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('<script>');
        expect(responseText).not.toContain('javascript:');
        expect(responseText).not.toContain('onerror');
      }
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      // Arrange
      const requests = Array.from({ length: 110 }, () => 
        request(app).get('/api/health')
      );

      // Act
      const responses = await Promise.allSettled(requests);

      // Assert
      const rateLimitedResponses = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
```

## Test Utilities and Helpers

### Mock Adapters

```typescript
// tests/utils/test-helpers.ts
export class MockAdapter extends SourceAdapter {
  private searchRunbooksResponse: RunbookResult[] = [];
  private errors: { [key: string]: Error } = {};

  setSearchRunbooksResponse(results: RunbookResult[]): void {
    this.searchRunbooksResponse = results;
  }

  setSearchRunbooksError(error: Error): void {
    this.errors.searchRunbooks = error;
  }

  async searchRunbooks(
    alertType: string,
    severity?: string
  ): Promise<RunbookResult[]> {
    if (this.errors.searchRunbooks) {
      throw this.errors.searchRunbooks;
    }
    
    return this.searchRunbooksResponse.filter(runbook => {
      if (severity && runbook.severity !== severity) return false;
      return true;
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      response_time_ms: 10,
      document_count: this.searchRunbooksResponse.length
    };
  }
}
```

### Test Data Generation

```typescript
// tests/utils/test-data-generators.ts
export function generateRunbook(overrides: Partial<Runbook> = {}): Runbook {
  return {
    id: `runbook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Runbook',
    version: '1.0.0',
    triggers: [
      {
        alert_type: 'disk_space',
        conditions: ['usage > 90%'],
        systems: ['web-server']
      }
    ],
    severity_mapping: {
      critical: 'immediate_response',
      high: 'rapid_response'
    },
    procedures: [
      {
        id: 'emergency-cleanup',
        title: 'Emergency Disk Cleanup',
        steps: [
          {
            step: 1,
            action: 'Check available disk space',
            command: 'df -h'
          }
        ]
      }
    ],
    metadata: {
      confidence_score: 0.85,
      success_rate: 0.92
    },
    ...overrides
  };
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run typecheck
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        REDIS_URL: redis://localhost:6379
    
    - name: Run performance tests
      run: npm run test:performance
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### Quality Gates

```bash
#!/bin/bash
# scripts/quality-gate.sh

echo "Running quality gate checks..."

# Code quality
npm run lint
npm run typecheck

# Test coverage
npm run test:coverage
COVERAGE=$(grep -o '"pct":[0-9.]*' coverage/coverage-summary.json | head -1 | grep -o '[0-9.]*')
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  echo "❌ Coverage below 80% (current: $COVERAGE%)"
  exit 1
fi

# Performance benchmarks
npm run benchmark:quick

echo "✅ All quality gates passed"
```

## Troubleshooting Tests

### Common Issues

#### Redis Test Issues

```bash
# Start Redis for testing
docker run -d --name test-redis -p 6379:6379 redis:7-alpine

# Run Redis-specific tests
npm run test:redis

# Clean up
docker stop test-redis && docker rm test-redis
```

#### Memory Leaks in Tests

```javascript
// Enable garbage collection in test environment
if (typeof global.gc === 'function') {
  afterEach(() => {
    global.gc();
  });
}
```

#### Flaky Tests

```typescript
// Use proper async handling
describe('flaky test prevention', () => {
  it('should wait for async operations', async () => {
    // ✅ Good: Properly awaiting
    const result = await someAsyncFunction();
    expect(result).toBeDefined();
  });

  it('should handle timing-sensitive operations', async () => {
    // ✅ Good: Poll until condition met
    await waitForCondition(
      () => cache.get('key') !== null,
      { timeout: 1000, interval: 50 }
    );
  });
});
```

## Test Development Guidelines

### Writing Good Tests

1. **Use descriptive test names** that explain the scenario
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Test one thing at a time** in each test case
4. **Use meaningful assertions** with clear error messages
5. **Clean up resources** in teardown methods
6. **Mock external dependencies** appropriately
7. **Test both success and error cases**
8. **Include performance tests** for critical paths

### Test Performance

- Keep unit tests fast (< 100ms each)
- Use appropriate timeouts for async operations
- Parallel test execution where possible
- Mock expensive operations in unit tests
- Use integration tests sparingly for critical paths

### Continuous Improvement

- Regularly review and update test coverage
- Add tests for reported bugs before fixing
- Refactor tests when code changes
- Monitor test performance and reliability
- Share testing best practices with the team

The comprehensive testing strategy ensures Personal Pipeline maintains high quality, performance, and reliability across all components and use cases.