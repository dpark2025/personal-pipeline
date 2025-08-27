# Development Guide

This comprehensive guide covers development setup, workflows, and best practices for Personal Pipeline contributors and maintainers.

## Prerequisites

### Required Software

- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **npm** >= 8.0.0 (comes with Node.js)
- **Git** >= 2.30.0 ([Download](https://git-scm.com/))

### Optional Dependencies

- **Redis** >= 6.0.0 for enhanced caching (see [Redis Setup Guide](#redis-setup))
- **Docker** for containerized development
- **VS Code** with recommended extensions

### System Requirements

- **Memory**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space for development dependencies
- **OS**: macOS, Linux, or Windows with WSL2

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/[username]/personal-pipeline.git
cd personal-pipeline

# Install dependencies
npm install

# Verify installation
npm run health
```

### 2. Configuration

```bash
# Copy sample configuration
cp config/config.sample.yaml config/config.yaml

# Edit configuration for your environment
# See Configuration Guide below
```

### 3. Start Development

```bash
# Start in development mode with hot reload
npm run dev

# Or start demo environment with sample data
npm run demo:start
```

### 4. Stop Development

⚠️ **IMPORTANT**: Always stop services when finished to prevent resource leaks and port conflicts.

```bash
# Stop demo environment (recommended - includes full cleanup)
npm run demo:stop

# Or if running individual components:
# 1. Press Ctrl+C in terminal where server is running
# 2. Kill any remaining processes:
pkill -f "node.*personal-pipeline"
pkill -f "redis-server.*6379"

# Verify all processes stopped
npm run health  # Should fail if properly stopped
```

See [Server Management Guide](./SERVER-MANAGEMENT.md) for complete server lifecycle documentation.

## Development Environment Setup

### IDE Configuration

#### VS Code Extensions (Recommended)

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml"
  ]
}
```

#### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.format.enable": true,
  "files.associations": {
    "*.yaml": "yaml",
    "*.yml": "yaml"
  }
}
```

### Environment Variables

Create `.env.development`:

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Logging
LOG_LEVEL=debug

# Optional: Redis Configuration
# REDIS_URL=redis://localhost:6379

# Optional: External API Keys
# CONFLUENCE_TOKEN=your_confluence_token
# GITHUB_TOKEN=your_github_token
```

### Redis Setup

Redis provides enhanced caching but is optional. The system works in memory-only mode without Redis.

#### Install Redis

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

**Docker:**
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

#### Enable Redis

```bash
# Set environment variable
export REDIS_URL="redis://localhost:6379"

# Or add to .env.development
echo "REDIS_URL=redis://localhost:6379" >> .env.development
```

#### Verify Redis Connection

```bash
# Test Redis integration
npm run test:redis

# Check cache status
npm run health
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run dev  # Start development server
npm test     # Run tests
npm run lint # Check code quality

# Commit changes
git add .
git commit -m "feat: add your feature description"
```

### 2. Testing Strategy

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration

# Test with Redis (requires Redis server)
npm run test:redis
```

### 3. Code Quality

```bash
# Lint and fix code
npm run lint
npm run lint:fix

# Format code
npm run format

# Type checking
npm run typecheck

# Full quality check
npm run lint && npm run typecheck && npm test
```

### 4. Build and Deployment

```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Clean build artifacts
npm run clean
```

## Project Structure

```
personal-pipeline/
├── src/                    # Source code
│   ├── adapters/          # Source adapters
│   │   ├── base.ts        # Abstract base class
│   │   ├── file-enhanced.ts # File system adapter
│   │   ├── index.ts       # Adapter registry
│   │   └── web/           # Web adapter components
│   ├── api/               # REST API implementation
│   │   ├── routes.ts      # API routes
│   │   ├── middleware.ts  # Request middleware
│   │   ├── transforms.ts  # Data transformations
│   │   └── caching-middleware.ts # Caching layer
│   ├── core/              # Core server logic
│   │   └── server.ts      # Main MCP server
│   ├── search/            # Search and intelligence
│   │   ├── intelligent-search-engine.ts
│   │   ├── semantic-engine.ts
│   │   └── query-processing/
│   ├── tools/             # MCP tools implementation
│   │   └── index.ts       # PPMCPTools class
│   ├── types/             # TypeScript definitions
│   │   └── index.ts       # Shared types and schemas
│   ├── utils/             # Utilities and helpers
│   │   ├── cache.ts       # Caching system
│   │   ├── config.ts      # Configuration manager
│   │   ├── logger.ts      # Winston logging
│   │   ├── monitoring.ts  # Health monitoring
│   │   └── performance.ts # Performance tracking
│   └── index.ts           # Application entry point
├── config/                # Configuration files
├── docs/                  # Documentation
├── tests/                 # Test suites
├── scripts/               # Development scripts
└── planning/              # Project planning documents
```

## Development Tools

### Interactive MCP Explorer

Test MCP tools interactively:

```bash
# Start interactive explorer
npm run mcp-explorer

# Features:
# - Auto-completion for tool names and parameters
# - Performance analytics
# - Session management
# - Test suite execution
```

### Sample Data Generation

Generate realistic test data:

```bash
# Generate sample runbooks and knowledge base
npm run generate-sample-data

# Validate generated data
npm run validate-config
```

### Health Dashboard

Monitor system health in real-time:

```bash
# Start health dashboard
npm run health:dashboard

# Features:
# - Real-time metrics
# - Performance graphs
# - Error tracking
# - Cache statistics
```

### Performance Testing

```bash
# Quick performance test
npm run benchmark:quick

# Comprehensive benchmark
npm run benchmark

# Stress testing
npm run benchmark:stress

# Load testing with monitoring
npm run load-test
```

## Configuration Management

### Configuration Files

```yaml
# config/config.yaml - Main configuration
server:
  port: 3000
  host: '0.0.0.0'
  cors_origins: ['*']

cache:
  strategy: hybrid    # memory | redis | hybrid
  ttl: 300           # 5 minutes
  max_memory_items: 1000

sources:
  - name: "local-runbooks"
    type: "file"
    base_url: "./test-data-integration/runbooks"
    recursive: true
    supported_extensions: ['.md', '.json']
    priority: 1

  - name: "web-docs"
    type: "web"
    base_url: "https://api.example.com"
    endpoints:
      - path: "/docs"
        method: "GET"
        content_type: "json"
    auth:
      type: "bearer_token"
      token_env: "API_TOKEN"

performance:
  concurrent_searches: 10
  timeout_ms: 5000
  circuit_breaker:
    failure_threshold: 5
    recovery_timeout: 30000

logging:
  level: "info"
  format: "json"
  file: "logs/personal-pipeline.log"
```

### Configuration Validation

```bash
# Validate configuration
npm run validate-config

# Check configuration schema
npm run validate-config -- --verbose

# Test configuration with dry run
npm run validate-config -- --dry-run
```

## Testing Framework

### Test Structure

```
tests/
├── unit/                  # Unit tests
│   ├── adapters/         # Adapter tests
│   ├── core/             # Core logic tests
│   ├── tools/            # MCP tools tests
│   └── utils/            # Utility tests
├── integration/           # Integration tests
│   ├── api/              # API endpoint tests
│   ├── cache/            # Cache integration tests
│   └── adapters/         # Adapter integration tests
├── performance/           # Performance tests
└── utils/                # Test utilities
    ├── test-helpers.ts   # Common test helpers
    ├── test-data-generators.ts # Test data generation
    └── redis-mock.ts     # Redis mocking utilities
```

### Writing Tests

#### Unit Test Example

```typescript
// tests/unit/tools/search-runbooks.test.ts
import { PPMCPTools } from '../../../src/tools/index.js';
import { MockAdapter } from '../../utils/test-helpers.js';

describe('search_runbooks', () => {
  let tools: PPMCPTools;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    tools = new PPMCPTools();
    tools.registerAdapter('test', mockAdapter);
  });

  it('should search runbooks by alert type', async () => {
    // Arrange
    mockAdapter.mockSearchRunbooks([
      {
        id: 'disk-space-critical',
        title: 'Critical Disk Space Alert',
        confidence_score: 0.95
      }
    ]);

    // Act
    const result = await tools.search_runbooks('disk_space', 'critical');

    // Assert
    expect(result).toHaveProperty('runbooks');
    expect(result.runbooks).toHaveLength(1);
    expect(result.runbooks[0].confidence_score).toBeGreaterThan(0.9);
  });
});
```

#### Integration Test Example

```typescript
// tests/integration/api/runbooks.test.ts
import request from 'supertest';
import { createTestApp } from '../../utils/test-helpers.js';

describe('POST /api/runbooks/search', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('should search runbooks via REST API', async () => {
    const response = await request(app)
      .post('/api/runbooks/search')
      .send({
        alert_type: 'disk_space',
        severity: 'critical'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.runbooks).toBeDefined();
  });
});
```

### Performance Testing

```typescript
// tests/performance/search-performance.test.ts
describe('Search Performance', () => {
  it('should meet response time requirements', async () => {
    const startTime = Date.now();
    
    const result = await tools.search_runbooks('disk_space', 'critical');
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200); // < 200ms requirement
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(50).fill(null).map(() => 
      tools.search_runbooks('memory_leak', 'high')
    );

    const results = await Promise.all(requests);
    
    results.forEach(result => {
      expect(result.retrieval_time_ms).toBeLessThan(500);
    });
  });
});
```

## Debugging

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Personal Pipeline",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      },
      "runtimeArgs": ["--loader", "tsx/esm"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "env": {
        "NODE_ENV": "test"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging and Monitoring

```typescript
// Use structured logging
import { logger } from '../utils/logger.js';

// Log levels: error, warn, info, debug
logger.info('Processing search request', {
  alertType,
  severity,
  requestId: generateRequestId()
});

logger.error('Search failed', {
  error: error.message,
  stack: error.stack,
  context: { alertType, severity }
});
```

### Performance Profiling

```bash
# Profile application startup
node --prof src/index.ts

# Profile specific operations
npm run benchmark -- --profile

# Memory usage analysis
node --inspect src/index.ts
```

## Code Style and Standards

### TypeScript Guidelines

1. **Use strict TypeScript configuration**
2. **Define interfaces for all data structures**
3. **Use type guards for runtime validation**
4. **Prefer composition over inheritance**
5. **Use meaningful variable and function names**

```typescript
// Good: Clear interface definitions
interface RunbookSearchRequest {
  alertType: string;
  severity?: AlertSeverity;
  systems?: string[];
  context?: SearchContext;
}

// Good: Type guards
function isValidAlertType(type: unknown): type is string {
  return typeof type === 'string' && type.length > 0;
}

// Good: Descriptive function names
async function searchRunbooksWithConfidenceScoring(
  request: RunbookSearchRequest
): Promise<RunbookSearchResult> {
  // Implementation
}
```

### Error Handling

```typescript
// Custom error types
export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

// Error handling pattern
async function searchWithErrorHandling(query: string): Promise<SearchResult> {
  try {
    return await performSearch(query);
  } catch (error) {
    if (error instanceof AdapterError) {
      logger.error('Adapter error during search', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw error;
    }
    
    // Handle unexpected errors
    logger.error('Unexpected search error', {
      error: error.message,
      stack: error.stack
    });
    
    throw new AdapterError(
      'Search operation failed',
      'SEARCH_ERROR',
      { originalError: error.message }
    );
  }
}
```

### Async/Await Best Practices

```typescript
// Good: Proper error handling
async function processMultipleRequests(requests: Request[]): Promise<Result[]> {
  try {
    const results = await Promise.all(
      requests.map(async (request) => {
        try {
          return await processRequest(request);
        } catch (error) {
          logger.error('Request processing failed', {
            requestId: request.id,
            error: error.message
          });
          return createErrorResult(request.id, error);
        }
      })
    );
    
    return results;
  } catch (error) {
    logger.error('Batch processing failed', { error: error.message });
    throw new ProcessingError('Batch operation failed', 'BATCH_ERROR');
  }
}
```

## Performance Optimization

### Caching Strategies

```typescript
// Implement intelligent caching
class IntelligentCache {
  private hotCache = new Map<string, CacheEntry>(); // Frequently accessed
  private warmCache = new Map<string, CacheEntry>(); // Recently accessed
  
  async get(key: string): Promise<any> {
    // Check hot cache first
    if (this.hotCache.has(key)) {
      return this.hotCache.get(key)?.value;
    }
    
    // Check warm cache
    if (this.warmCache.has(key)) {
      const entry = this.warmCache.get(key)!;
      // Promote to hot cache if frequently accessed
      this.promoteToHot(key, entry);
      return entry.value;
    }
    
    return null; // Cache miss
  }
  
  private promoteToHot(key: string, entry: CacheEntry): void {
    if (entry.accessCount > HOT_CACHE_THRESHOLD) {
      this.hotCache.set(key, entry);
      this.warmCache.delete(key);
    }
  }
}
```

### Database Optimization

```typescript
// Batch operations for better performance
async function batchUpdateDocuments(updates: DocumentUpdate[]): Promise<void> {
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(update => updateDocument(update))
    );
    
    // Small delay to prevent overwhelming the system
    if (i + BATCH_SIZE < updates.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
```

## Deployment

### Local Deployment

```bash
# Build and run locally
npm run build
npm start

# Using Docker
docker build -t personal-pipeline .
docker run -p 3000:3000 personal-pipeline
```

### Production Considerations

1. **Environment Variables**: Use secure credential management
2. **Health Checks**: Implement comprehensive health endpoints
3. **Monitoring**: Set up metrics collection and alerting
4. **Logging**: Configure structured logging with log rotation
5. **Security**: Enable HTTPS, rate limiting, and input validation

### Docker Deployment

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS runtime

RUN addgroup -g 1001 -S nodejs && \
    adduser -S personal-pipeline -u 1001

WORKDIR /app
COPY --from=builder --chown=personal-pipeline:nodejs /app/node_modules ./node_modules
COPY --chown=personal-pipeline:nodejs . .

USER personal-pipeline

RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
```

## Contributing Guidelines

### Pull Request Process

1. **Fork and Clone**: Fork the repository and clone your fork
2. **Branch**: Create a feature branch from `main`
3. **Implement**: Make your changes with tests
4. **Test**: Ensure all tests pass and coverage is maintained
5. **Lint**: Run linting and fix any issues
6. **Commit**: Use conventional commit messages
7. **Push**: Push your branch to your fork
8. **PR**: Create a pull request with detailed description

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(api): add runbook search endpoint

Add POST /api/runbooks/search endpoint with filtering
and pagination support. Includes request validation
and comprehensive error handling.

Closes #123
```

### Code Review Guidelines

1. **Functionality**: Does the code work as intended?
2. **Performance**: Are there any performance implications?
3. **Security**: Are there any security vulnerabilities?
4. **Maintainability**: Is the code readable and maintainable?
5. **Testing**: Are there adequate tests?
6. **Documentation**: Is the code properly documented?

## Troubleshooting

### Server Management Issues

#### Server Won't Stop

```bash
# Force kill all Personal Pipeline processes
pkill -f "node.*personal-pipeline"
pkill -f "tsx.*src/index"

# Kill processes on specific ports
npx kill-port 3000
npx kill-port 6379

# Check for remaining processes
ps aux | grep -v grep | grep personal-pipeline
```

#### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000
netstat -tulpn | grep :3000

# Kill process using the port
npx kill-port 3000

# Or start on different port
PORT=8080 npm run dev
```

#### Process Cleanup Issues

```bash
# Complete environment reset
./scripts/cleanup-environment.sh

# Or manual cleanup:
pkill -f "personal-pipeline"
rm -rf /tmp/personal-pipeline-*
rm -rf logs/*.log
```

See [Server Management Guide](./SERVER-MANAGEMENT.md) for comprehensive troubleshooting procedures.

### Development Issues

#### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
rm -rf dist/
npm run build
```

#### Test Failures

```bash
# Run tests in verbose mode
npm test -- --verbose

# Run specific test file
npm test -- tests/unit/tools/search-runbooks.test.ts

# Update snapshots if needed
npm test -- --updateSnapshot
```

#### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Check connection in application
npm run health

# Run without Redis
unset REDIS_URL
npm run dev
```

#### Performance Issues

```bash
# Profile the application
npm run benchmark

# Check memory usage
node --inspect src/index.ts

# Enable debug logging
LOG_LEVEL=debug npm run dev
```

### Getting Help

1. **Documentation**: Check existing docs in `/docs` directory
2. **Issues**: Search GitHub issues for similar problems
3. **Discussions**: Use GitHub Discussions for questions
4. **Community**: Join the community chat for real-time help

## Resources

### Documentation Links

- [API Documentation](./API.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Testing Guide](./TESTING.md)
- [Configuration Reference](../config/CONFIG_OVERVIEW.md)

### External Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [Redis Documentation](https://redis.io/docs/)