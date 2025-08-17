# Personal Pipeline NPM Package - Usage Guide

This guide demonstrates how to use Personal Pipeline as an npm package.

## Installation Methods

### 1. Global CLI Installation
```bash
# Install globally for CLI usage
npm install -g @personal-pipeline/mcp-server

# Use CLI commands
personal-pipeline start
pp-mcp serve
pp search "database issues"
```

### 2. Local Project Installation
```bash
# Install in your project
npm install @personal-pipeline/mcp-server

# Or with yarn
yarn add @personal-pipeline/mcp-server
```

## Usage Examples

### CLI Usage

#### Quick Commands (pp)
```bash
# Quick start
pp start

# Quick search
pp search "memory leak" --limit 3

# Demo environment
pp demo --start
pp demo --stop
```

#### Full CLI (personal-pipeline)
```bash
# Start with custom configuration
personal-pipeline start --config ./custom-config.yaml --port 8080

# Run performance benchmarks
personal-pipeline benchmark --duration 60 --concurrent 20

# Test functionality
personal-pipeline test --integration --performance
```

#### MCP Protocol CLI (pp-mcp)
```bash
# Start MCP server in stdio mode
pp-mcp serve

# List available MCP tools
pp-mcp tools --detailed

# Call MCP tools directly
pp-mcp call search_runbooks --params '{"query": "database"}'

# Interactive explorer
pp-mcp explorer --analytics
```

### Programmatic Usage

#### Basic Server Setup
```javascript
import { PersonalPipelineServer, ConfigManager } from '@personal-pipeline/mcp-server';

// Load configuration
const config = await ConfigManager.loadConfig('./config/config.yaml');

// Create and start server
const server = new PersonalPipelineServer(config);
await server.start();

console.log('Personal Pipeline server is running!');
```

#### Using Source Adapters
```javascript
import { 
  FileSystemAdapter, 
  GitHubAdapter,
  SourceAdapterRegistry 
} from '@personal-pipeline/mcp-server/adapters';

// Create file system adapter
const fileAdapter = new FileSystemAdapter({
  name: 'local-docs',
  path: './documentation',
  watch: true,
  patterns: ['**/*.md', '**/*.json']
});

// Create GitHub adapter
const githubAdapter = new GitHubAdapter({
  name: 'github-wiki',
  owner: 'your-org',
  repo: 'wiki',
  auth: {
    token: process.env.GITHUB_TOKEN
  }
});

// Register adapters
const registry = SourceAdapterRegistry.getInstance();
registry.registerAdapter(fileAdapter);
registry.registerAdapter(githubAdapter);

await registry.initializeAdapters();
```

#### Utility Usage
```javascript
import { 
  logger, 
  CacheService, 
  PerformanceMonitor 
} from '@personal-pipeline/mcp-server/utils';

// Structured logging
logger.info('Application started', { version: '1.0.0' });
logger.error('Database error', { error: error.message });

// Caching
const cache = CacheService.getInstance();
await cache.set('user:123', userData, 3600); // 1 hour TTL
const user = await cache.get('user:123');

// Performance monitoring
const monitor = PerformanceMonitor.getInstance();
const timer = monitor.startTimer('database-query');
// ... perform operation
timer.end();
```

#### Type Safety with TypeScript
```typescript
import type { 
  AppConfig, 
  SearchResult, 
  RunbookData,
  SourceAdapter 
} from '@personal-pipeline/mcp-server/types';

interface CustomConfig extends AppConfig {
  customField: string;
}

const config: CustomConfig = {
  // your configuration with full type safety
  sources: [],
  cache: {},
  customField: 'value'
};

async function searchDocs(query: string): Promise<SearchResult[]> {
  // Function with proper typing
  const results = await server.search(query);
  return results;
}
```

### Advanced Integration

#### Express.js Integration
```javascript
import express from 'express';
import { PersonalPipelineServer } from '@personal-pipeline/mcp-server';

const app = express();
const pipelineServer = new PersonalPipelineServer(config);

// Start Personal Pipeline server
await pipelineServer.start();

// Add routes that use Personal Pipeline
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  const results = await pipelineServer.searchRunbooks(query);
  res.json(results);
});

app.listen(3000);
```

#### Docker Integration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install Personal Pipeline
RUN npm install -g @personal-pipeline/mcp-server

# Copy your configuration
COPY config/config.yaml ./config/

# Start the server
CMD ["personal-pipeline", "start", "--config", "./config/config.yaml"]
```

#### CI/CD Integration
```yaml
# GitHub Actions
name: Test with Personal Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Personal Pipeline
        run: npm install -g @personal-pipeline/mcp-server
      
      - name: Test MCP functionality
        run: pp-mcp tools
      
      - name: Run benchmarks
        run: personal-pipeline benchmark --quick
```

## Configuration

### Environment Variables
```bash
# Redis connection
export REDIS_URL="redis://localhost:6379"

# GitHub integration
export GITHUB_TOKEN="your-github-token"

# Confluence integration
export CONFLUENCE_TOKEN="your-confluence-token"
export CONFLUENCE_BASE_URL="https://your-company.atlassian.net/wiki"
```

### Configuration File
```yaml
# config/config.yaml
sources:
  - name: "docs"
    type: "file"
    path: "./documentation"
    watch: true
    
  - name: "github-wiki"
    type: "github"
    owner: "your-org"
    repo: "documentation"
    auth:
      token_env: "GITHUB_TOKEN"

cache:
  strategy: "hybrid"
  redis:
    url_env: "REDIS_URL"
  memory:
    max_keys: 1000

server:
  port: 3000
  cors_enabled: true
```

## Development Mode

### Using in Development
```bash
# Install for development
npm install @personal-pipeline/mcp-server --save-dev

# Use in development scripts
npx personal-pipeline start --debug
npx pp-mcp explorer --test-suite
```

### Custom Build Integration
```javascript
// build.js - Custom build script
import { PersonalPipelineServer } from '@personal-pipeline/mcp-server';

// Use Personal Pipeline in your build process
const server = new PersonalPipelineServer(config);
await server.start();

// Generate documentation index
const docs = await server.searchKnowledgeBase('');
await generateDocIndex(docs);

await server.stop();
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   personal-pipeline start --port 8080
   ```

2. **Configuration Not Found**
   ```bash
   personal-pipeline config --create-sample
   ```

3. **Redis Connection Issues**
   ```bash
   # Start without Redis
   personal-pipeline start --no-cache
   ```

4. **Debug Mode**
   ```bash
   personal-pipeline start --debug --verbose
   ```

### Health Checks
```bash
# Check server status
personal-pipeline status --detailed

# Check cache health
pp-mcp health --cache

# Check source adapters
pp-mcp health --sources
```

## Performance Optimization

### Production Deployment
```bash
# Production build and start
npm run package:build:prod
NODE_ENV=production personal-pipeline start
```

### Monitoring
```javascript
import { PerformanceMonitor } from '@personal-pipeline/mcp-server/utils';

const monitor = PerformanceMonitor.getInstance();

// Monitor critical operations
const searchTimer = monitor.startTimer('search-operation');
const results = await server.search(query);
searchTimer.end();

// Get performance metrics
const metrics = monitor.getMetrics();
console.log(`Average search time: ${metrics.averageSearchTime}ms`);
```

This package provides a complete, production-ready solution for intelligent documentation retrieval and incident response automation.