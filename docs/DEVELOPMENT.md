# Personal Pipeline Development Guide

## Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0  
- **TypeScript**: >= 5.3.3 (installed via devDependencies)
- **Git**: For version control

## Quick Setup

```bash
# Clone the repository
git clone https://github.com/your-username/personal-pipeline-mcp.git
cd personal-pipeline-mcp

# Install dependencies
npm install

# Copy configuration template
cp config/config.sample.yaml config/config.yaml

# Build the project
npm run build

# Start development server
npm run dev
```

## Project Structure

```
personal-pipeline-mcp/
├── src/                    # Source code
│   ├── core/              # MCP server implementation
│   ├── adapters/          # Source adapter framework
│   ├── tools/             # MCP tool implementations
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utilities and configuration
│   └── index.ts           # Main entry point
├── tests/                 # Test files
│   └── unit/              # Unit tests
├── config/                # Configuration files
│   ├── config.yaml        # Live configuration (gitignored)
│   └── config.sample.yaml # Configuration template
├── docs/                  # Documentation
├── dist/                  # Compiled JavaScript (gitignored)
└── package.json           # Project configuration
```

## Development Commands

### Core Development
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Clean build artifacts
npm run clean
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check if code is properly formatted
npm run format:check

# Run TypeScript compiler checks
npm run typecheck
```

### Health Checks
```bash
# Check if server is running
npm run health

# Manual health check
curl http://localhost:3000/health

# Development Tools (Milestone 1.2)
npm run generate-sample-data  # Generate test data and realistic runbooks
npm run validate-config       # Validate YAML configuration with schema checking
npm run test-mcp             # Interactive MCP client testing tool
```

## Development Tools (Milestone 1.2)

The project now includes three powerful development utilities to streamline development and testing:

### Sample Data Generator

Generate realistic test data for development and testing:

```bash
# Generate sample data with default settings
npm run generate-sample-data

# Generated content includes:
# - 15 realistic runbooks across 7 alert scenarios
# - 30 knowledge base articles with metadata
# - Test configuration files
# - JSON and Markdown formats
```

**Output Structure**:
```
test-data/
├── runbooks/           # JSON runbook files
├── knowledge-base/     # Markdown articles + metadata
├── configs/           # Sample configuration files
└── generation-summary.json
```

**Usage Examples**:
```bash
# Use generated test data
cp test-data/configs/test-config.yaml config/config.yaml
npm run dev
npm run test-mcp
```

### Configuration Validator

Validate YAML configuration files with comprehensive checking:

```bash
# Validate default config
npm run validate-config

# Validate specific config file
npm run validate-config -- --config path/to/config.yaml

# Save validation report
npm run validate-config -- --output validation-report.json

# Skip specific checks
npm run validate-config -- --no-connections --no-environment
```

**Validation Features**:
- Schema validation with Zod
- Environment variable checking
- Source connection testing
- System requirements verification
- Performance recommendations

**Example Output**:
```
✅ Passed: 12
⚠️  Warnings: 2
❌ Errors: 0
📋 Total: 14

🎉 Configuration validation passed!
```

### MCP Client Testing Tool

Interactive tool for testing all 7 MCP tools:

```bash
# Interactive mode (default)
npm run test-mcp

# Run automated test suite
npm run test-mcp -- --test-suite

# Quick validation of all tools
npm run test-mcp -- --validate

# Test specific tool
npm run test-mcp -- --tool search_runbooks
```

**Interactive Mode Features**:
- Menu-driven tool selection
- Parameter input with validation
- Real-time response formatting
- Performance metrics display

**Test Suite Features**:
- 18 automated test scenarios
- Response time monitoring
- Success rate calculation
- Detailed error reporting

**Example Usage**:
```bash
# Start interactive testing
npm run test-mcp

# Select tool (1-7)
Select tool (0-7): 1

# Follow prompts to test search_runbooks
Enter alert_type: disk_space
Enter severity: critical
Enter affected_systems: web-server-01

# View formatted response
✅ Success!
⏱️  Response time: 45ms
📄 Response: { ... }
```

## Configuration

### Environment Variables

Create a `.env` file in the project root for sensitive configuration:

```bash
# Example .env file
NODE_ENV=development
LOG_LEVEL=debug

# Source authentication (examples)
CONFLUENCE_TOKEN=your_confluence_token
GITHUB_TOKEN=your_github_token
DATABASE_URL=postgresql://user:pass@localhost/db
```

### Configuration File

Edit `config/config.yaml` to configure documentation sources:

```yaml
server:
  port: 3000
  host: "localhost"
  log_level: "info"
  cache_ttl_seconds: 3600

sources:
  # Local file system adapter
  - name: "local-docs"
    type: "file"
    base_url: "./docs"
    enabled: true
    priority: 1
    refresh_interval: "5m"
    
  # Confluence adapter (when implemented)
  - name: "company-confluence"
    type: "confluence"
    base_url: "https://company.atlassian.net/wiki"
    auth:
      type: "bearer_token"
      token_env: "CONFLUENCE_TOKEN"
    enabled: false
    priority: 2
    refresh_interval: "1h"
```

## Development Workflow

### 1. Setting Up New Features

```bash
# Create feature branch
git checkout -b feature/new-source-adapter

# Make changes
# ...

# Run quality checks
npm run typecheck
npm run lint
npm run test

# Build and test
npm run build
npm start
```

### 2. Testing MCP Tools

Use the MCP client to test tools during development:

```bash
# Start the server
npm run dev

# In another terminal, test with curl (for HTTP endpoints)
curl -X GET http://localhost:3000/health

# For MCP protocol testing, you'll need an MCP client
# The server communicates via stdio transport
```

### 3. Adding New Source Adapters

1. **Create adapter class** extending `SourceAdapter`:

```typescript
// src/adapters/my-source.ts
import { SourceAdapter } from './base';

export class MySourceAdapter extends SourceAdapter {
  async search(query: string): Promise<SearchResult[]> {
    // Implementation
  }
  
  async searchRunbooks(alertType: string): Promise<Runbook[]> {
    // Implementation
  }
  
  // ... other required methods
}
```

2. **Register the adapter factory**:

```typescript
// src/core/server.ts
this.sourceRegistry.registerFactory('my-source', (config) => {
  return new MySourceAdapter(config);
});
```

3. **Add configuration schema**:

```typescript
// src/types/index.ts - update SourceType enum
export const SourceType = z.enum([
  'confluence', 'notion', 'github', 'database', 'web', 'file', 'my-source'
]);
```

4. **Write tests**:

```typescript
// tests/unit/adapters/my-source.test.ts
describe('MySourceAdapter', () => {
  // Test implementation
});
```

### 4. Adding New MCP Tools

1. **Add tool definition** to `PPMCPTools` class:

```typescript
// src/tools/index.ts
private getMyNewTool(): Tool {
  return {
    name: 'my_new_tool',
    description: 'Description of what the tool does',
    inputSchema: {
      type: 'object',
      properties: {
        // Define input parameters
      },
      required: ['param1']
    }
  };
}
```

2. **Add tool handler**:

```typescript
// Add to handleToolCall switch statement
case 'my_new_tool':
  result = await this.myNewTool(request.params.arguments);
  break;
```

3. **Implement tool logic**:

```typescript
private async myNewTool(args: any): Promise<MyToolResponse> {
  // Implementation
}
```

4. **Update documentation**:

```markdown
<!-- docs/API.md -->
### my_new_tool

Description of the tool...
```

## Testing Strategy

### Unit Tests

Test individual components in isolation:

```typescript
// tests/unit/tools/search.test.ts
import { PPMCPTools } from '../../../src/tools';

describe('PPMCPTools - search_runbooks', () => {
  it('should return runbooks matching alert criteria', async () => {
    // Test implementation
  });
});
```

### Integration Tests

Test component interactions:

```typescript
// tests/integration/server.test.ts
import { PersonalPipelineServer } from '../../src/core/server';

describe('PersonalPipelineServer Integration', () => {
  it('should handle complete tool call flow', async () => {
    // Test implementation
  });
});
```

### Test Coverage Requirements

- **Minimum**: 80% overall coverage
- **Target**: 90%+ for core components
- **Critical Paths**: 100% coverage for MCP protocol handling

```bash
# Check current coverage
npm run test:coverage

# Coverage thresholds in package.json
"jest": {
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## Debugging

### Development Debugging

```bash
# Start with debug logging
LOG_LEVEL=debug npm run dev

# Enable Node.js debugging
node --inspect dist/index.js

# Use VS Code debugger
# Set breakpoints and press F5
```

### Log Analysis

```bash
# View logs in real-time
tail -f logs/app.log

# Search for errors
grep "ERROR" logs/app.log

# View structured logs
cat logs/app.log | jq '.'
```

### Health Check Debugging

```bash
# Check server health
curl http://localhost:3000/health | jq '.'

# Check individual source health
curl http://localhost:3000/metrics | jq '.sources'

# Test MCP protocol via stdio
echo '{"method":"tools/list"}' | node dist/index.js
```

## Performance Optimization

### Profiling

```bash
# Profile startup time
time npm start

# Memory usage monitoring
node --max-old-space-size=4096 dist/index.js

# CPU profiling
node --prof dist/index.js
```

### Cache Optimization

```javascript
// Monitor cache performance
const cache = require('node-cache');
const myCache = new cache({ stdTTL: 600, checkperiod: 120 });

// Cache hit rate monitoring
const hitRate = myCache.getStats().hits / myCache.getStats().keys;
console.log(`Cache hit rate: ${hitRate * 100}%`);
```

### Query Performance

```typescript
// Monitor query performance
const startTime = Date.now();
const results = await adapter.search(query);
const duration = Date.now() - startTime;

logger.info('Query performance', {
  query,
  duration,
  resultCount: results.length,
  cacheHit: results.length > 0 && duration < 50
});
```

## Code Style Guide

### TypeScript Standards

```typescript
// Use strict typing
interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  maxResults?: number;
}

// Prefer async/await over Promises
async function searchDocuments(request: SearchRequest): Promise<SearchResult[]> {
  try {
    const results = await adapter.search(request.query, request.filters);
    return results.slice(0, request.maxResults || 10);
  } catch (error) {
    logger.error('Search failed', { error, query: request.query });
    throw new SourceError('Search operation failed', adapter.name);
  }
}

// Use proper error handling
class CustomError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CustomError';
  }
}
```

### ESLint Configuration

Key rules enforced:

```json
{
  "@typescript-eslint/no-unused-vars": "error",
  "@typescript-eslint/explicit-function-return-type": "warn",
  "prefer-const": "error",
  "no-var": "error",
  "complexity": ["warn", 10],
  "max-lines-per-function": ["warn", 100]
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

## Git Workflow

### Branch Strategy

```bash
# Feature development
git checkout -b feature/adapter-confluence
git checkout -b bugfix/memory-leak-fix
git checkout -b hotfix/critical-security-patch

# Always create PRs for main branch
git push origin feature/adapter-confluence
# Create pull request via GitHub
```

### Commit Messages

Follow conventional commits:

```bash
# Format: type(scope): description
git commit -m "feat(adapters): add Confluence source adapter"
git commit -m "fix(tools): resolve memory leak in search_runbooks"
git commit -m "docs(api): update tool documentation with examples"
git commit -m "test(integration): add end-to-end server tests"
```

### Pre-commit Hooks

```bash
# Install husky for git hooks
npx husky install

# Pre-commit checks
npm run lint
npm run typecheck
npm run test
```

## Deployment

### Local Deployment

```bash
# Production build
npm run build

# Start production server
NODE_ENV=production npm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t personal-pipeline-mcp .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -v $(pwd)/config:/app/config \
  personal-pipeline-mcp
```

### Environment Configuration

```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug

# Production
NODE_ENV=production
LOG_LEVEL=info
CACHE_TTL_SECONDS=3600
MAX_CONCURRENT_REQUESTS=100
```

## Troubleshooting

### Common Issues

1. **Server won't start**
   ```bash
   # Check Node.js version
   node --version  # Should be >= 18.0.0
   
   # Check for port conflicts
   lsof -i :3000
   
   # Check configuration
   npm run typecheck
   ```

2. **MCP tools not responding**
   ```bash
   # Check logs
   tail -f logs/app.log
   
   # Verify tool registration
   curl http://localhost:3000/health
   ```

3. **Source adapter failures**
   ```bash
   # Check source health
   curl http://localhost:3000/metrics
   
   # Verify configuration
   cat config/config.yaml
   ```

### Performance Issues

1. **Slow response times**
   - Check cache hit rates
   - Monitor source adapter performance
   - Review query complexity

2. **Memory leaks**
   - Monitor heap usage with `node --inspect`
   - Check for unclosed connections
   - Review cache cleanup policies

3. **High CPU usage**
   - Profile with `node --prof`
   - Check for infinite loops
   - Review recursive operations

### Development Tools Issues

1. **Sample data generation fails**
   ```bash
   # Check write permissions
   ls -la test-data/
   
   # Clear and regenerate
   rm -rf test-data/
   npm run generate-sample-data
   ```

2. **Configuration validation errors**
   ```bash
   # Check YAML syntax
   npm run validate-config -- --config config/config.yaml
   
   # Test with sample config
   npm run validate-config -- --config test-data/configs/test-config.yaml
   ```

3. **MCP testing tool connection issues**
   ```bash
   # Ensure server is running
   npm run health
   
   # Test with mock mode (no server required)
   npm run test-mcp -- --validate
   ```

### Getting Help

- **Documentation**: Check `/docs` directory
- **Issues**: GitHub issue tracker
- **Logs**: Check application logs for error details
- **Health Checks**: Use `/health` and `/metrics` endpoints
- **Development Tools**: Use `npm run validate-config` and `npm run test-mcp -- --help` for diagnostics

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed contribution guidelines.