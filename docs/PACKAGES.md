# Personal Pipeline - Package Guide

Comprehensive guide for npm package installation, usage, and integration including CLI tools, programmatic usage, and private registry setup.

## 📋 Table of Contents

- [Package Overview](#package-overview)
- [Installation Methods](#installation-methods)
- [CLI Usage](#cli-usage)
- [Programmatic Usage](#programmatic-usage)
- [Private Registry Setup](#private-registry-setup)
- [Development Integration](#development-integration)
- [CI/CD Integration](#cicd-integration)
- [Package Management](#package-management)
- [Troubleshooting](#troubleshooting)

## 📦 Package Overview

### Package Information

Personal Pipeline is distributed as a comprehensive npm package with multiple access patterns:

```json
{
  "name": "@personal-pipeline/mcp-server",
  "version": "0.1.0",
  "description": "Intelligent MCP server for documentation retrieval and incident response",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

### Package Features

- **Multiple CLI Tools**: `personal-pipeline`, `pp-mcp`, `pp`
- **Programmatic API**: Full TypeScript/JavaScript API
- **Modular Exports**: Import only what you need
- **TypeScript Support**: Complete type definitions
- **Cross-Platform**: Windows, macOS, Linux support
- **Private Registry**: Compatible with any npm registry

### Package Structure

```
@personal-pipeline/mcp-server/
├── bin/                    # CLI executables
│   ├── personal-pipeline   # Full CLI interface
│   ├── pp-mcp             # MCP protocol focused
│   └── pp                 # Quick commands
├── dist/                  # Compiled JavaScript
│   ├── index.js           # Main entry point
│   ├── core/              # Server classes
│   ├── adapters/          # Source adapters
│   ├── tools/             # MCP tools
│   ├── types/             # Type definitions
│   └── utils/             # Utilities
├── lib/                   # Library exports
└── config/                # Sample configurations
```

## 🚀 Installation Methods

### Global Installation

#### Standard Global Install
```bash
# Install globally from npm registry
npm install -g @personal-pipeline/mcp-server

# Verify installation
personal-pipeline --version
pp-mcp --version
pp --version

# View installation location
npm list -g @personal-pipeline/mcp-server
```

#### Version-Specific Installation
```bash
# Install specific version
npm install -g @personal-pipeline/mcp-server@0.1.0

# Install latest beta
npm install -g @personal-pipeline/mcp-server@beta

# Install from specific tag
npm install -g @personal-pipeline/mcp-server@next
```

#### Registry-Specific Installation
```bash
# Install from private registry
npm install -g @personal-pipeline/mcp-server \
  --registry https://your-private-registry.com

# Install with registry configuration
npm config set registry https://your-private-registry.com
npm install -g @personal-pipeline/mcp-server
```

### Local Project Installation

#### Production Dependency
```bash
# Add as production dependency
npm install @personal-pipeline/mcp-server

# Add specific version
npm install @personal-pipeline/mcp-server@^0.1.0

# Save exact version
npm install --save-exact @personal-pipeline/mcp-server
```

#### Development Dependency
```bash
# Add as development dependency
npm install --save-dev @personal-pipeline/mcp-server

# Use in development scripts only
npm install -D @personal-pipeline/mcp-server
```

#### Package.json Configuration
```json
{
  "name": "my-project",
  "dependencies": {
    "@personal-pipeline/mcp-server": "^0.1.0"
  },
  "devDependencies": {
    "@personal-pipeline/mcp-server": "^0.1.0"
  },
  "scripts": {
    "start": "personal-pipeline start",
    "dev": "personal-pipeline start --debug",
    "test": "personal-pipeline test --integration",
    "benchmark": "personal-pipeline benchmark --quick"
  }
}
```

### Yarn Installation

#### Global Yarn Installation
```bash
# Install globally with Yarn
yarn global add @personal-pipeline/mcp-server

# Verify installation
yarn global list @personal-pipeline/mcp-server
```

#### Project Yarn Installation
```bash
# Add to project
yarn add @personal-pipeline/mcp-server

# Add as dev dependency
yarn add --dev @personal-pipeline/mcp-server

# Add specific version
yarn add @personal-pipeline/mcp-server@0.1.0
```

## 🛠️ CLI Usage

### Primary CLI Tools

Personal Pipeline provides three CLI interfaces:

| Command | Purpose | Use Case |
|---------|---------|----------|
| `personal-pipeline` | Full featured CLI | Production, development, administration |
| `pp-mcp` | MCP protocol focused | MCP testing, protocol debugging |
| `pp` | Quick commands | Daily operations, shortcuts |

### Full CLI (`personal-pipeline`)

#### Server Management
```bash
# Start server with default configuration
personal-pipeline start

# Start with custom configuration
personal-pipeline start --config ./config/custom.yaml

# Start with specific port
personal-pipeline start --port 8080

# Start in debug mode
personal-pipeline start --debug --verbose

# Start without cache
personal-pipeline start --no-cache
```

#### Configuration Management
```bash
# Create sample configuration
personal-pipeline config --create-sample

# Validate configuration
personal-pipeline config --validate

# Show current configuration
personal-pipeline config --show

# Test configuration
personal-pipeline config --test
```

#### Performance and Testing
```bash
# Run performance benchmark
personal-pipeline benchmark --duration 60 --concurrent 20

# Quick benchmark
personal-pipeline benchmark --quick

# Stress test
personal-pipeline benchmark --stress

# Integration tests
personal-pipeline test --integration

# API tests
personal-pipeline test --api --verbose
```

#### Health and Monitoring
```bash
# Check server status
personal-pipeline status

# Detailed status with metrics
personal-pipeline status --detailed

# Watch status in real-time
personal-pipeline status --watch

# Health dashboard
personal-pipeline dashboard

# View logs
personal-pipeline logs --tail 100
```

### MCP CLI (`pp-mcp`)

#### MCP Protocol Operations
```bash
# Start MCP server in stdio mode
pp-mcp serve

# List available MCP tools
pp-mcp tools

# Get detailed tool information
pp-mcp tools --detailed

# Call specific MCP tool
pp-mcp call search_runbooks --params '{"query": "database", "limit": 5}'

# Interactive MCP explorer
pp-mcp explorer

# MCP explorer with analytics
pp-mcp explorer --analytics
```

#### MCP Testing and Debugging
```bash
# Test MCP protocol
pp-mcp test --protocol

# Test specific tools
pp-mcp test --tool search_runbooks

# Run MCP test suite
pp-mcp test-suite --quick

# Debug MCP communication
pp-mcp debug --verbose
```

### Quick CLI (`pp`)

#### Common Operations
```bash
# Quick start
pp start

# Quick search
pp search "database issues" --limit 3

# Quick status check
pp status

# Quick health check
pp health

# Quick stop
pp stop
```

#### Demo Operations
```bash
# Start demo environment
pp demo --start

# Stop demo environment
pp demo --stop

# Demo with specific data
pp demo --data ./my-test-data
```

### Advanced CLI Usage

#### Environment-Specific Commands
```bash
# Development environment
NODE_ENV=development personal-pipeline start --debug

# Production environment
NODE_ENV=production personal-pipeline start --config ./config/prod.yaml

# Staging environment
NODE_ENV=staging personal-pipeline start --port 8080
```

#### Scripted Operations
```bash
#!/bin/bash
# automated-setup.sh

echo "Setting up Personal Pipeline..."

# Install globally if not present
if ! command -v personal-pipeline &> /dev/null; then
    npm install -g @personal-pipeline/mcp-server
fi

# Create configuration
personal-pipeline config --create-sample

# Start in background
personal-pipeline start --daemon

# Wait for startup
sleep 10

# Test installation
personal-pipeline status

echo "Setup completed!"
```

## 💻 Programmatic Usage

### Basic Server Setup

#### JavaScript/Node.js Usage
```javascript
// server.js
const { PersonalPipelineServer, ConfigManager } = require('@personal-pipeline/mcp-server');

async function startServer() {
  try {
    // Load configuration
    const config = await ConfigManager.loadConfig('./config/config.yaml');
    
    // Create server instance
    const server = new PersonalPipelineServer(config);
    
    // Start server
    await server.start();
    
    console.log('Personal Pipeline server started on port', config.server.port);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Shutting down...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

#### TypeScript Usage
```typescript
// server.ts
import { 
  PersonalPipelineServer, 
  ConfigManager, 
  type AppConfig 
} from '@personal-pipeline/mcp-server';

interface CustomConfig extends AppConfig {
  customSettings: {
    feature1: boolean;
    feature2: string;
  };
}

async function startServer(): Promise<void> {
  try {
    const config = await ConfigManager.loadConfig<CustomConfig>('./config/config.yaml');
    
    const server = new PersonalPipelineServer(config);
    await server.start();
    
    console.log(`Server started on ${config.server.host}:${config.server.port}`);
    
    // Type-safe access to custom configuration
    if (config.customSettings.feature1) {
      console.log('Feature 1 enabled:', config.customSettings.feature2);
    }
    
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

startServer();
```

### Modular Imports

#### Using Specific Components
```javascript
// Import only what you need
import { FileSystemAdapter } from '@personal-pipeline/mcp-server/adapters';
import { CacheService } from '@personal-pipeline/mcp-server/utils';
import { SearchResult } from '@personal-pipeline/mcp-server/types';

// Create file system adapter
const adapter = new FileSystemAdapter({
  name: 'local-docs',
  path: './documentation',
  watch: true,
  patterns: ['**/*.md', '**/*.json']
});

// Initialize and use
await adapter.initialize();
const results = await adapter.search('troubleshooting');
```

#### Using Utilities
```javascript
import { 
  logger, 
  PerformanceMonitor,
  CacheService 
} from '@personal-pipeline/mcp-server/utils';

// Structured logging
logger.info('Application started', { 
  version: '1.0.0',
  environment: process.env.NODE_ENV 
});

// Performance monitoring
const monitor = PerformanceMonitor.getInstance();
const timer = monitor.startTimer('database-query');

try {
  // Your operation here
  const result = await performDatabaseQuery();
  
  timer.end({ success: true });
  return result;
} catch (error) {
  timer.end({ success: false, error: error.message });
  throw error;
}

// Caching
const cache = CacheService.getInstance();
await cache.set('user:123', userData, 3600); // 1 hour TTL
const user = await cache.get('user:123');
```

### Express.js Integration

#### Middleware Integration
```javascript
// app.js
import express from 'express';
import { PersonalPipelineServer } from '@personal-pipeline/mcp-server';

const app = express();
let pipelineServer;

// Initialize Personal Pipeline
async function initializePipeline() {
  const config = {
    sources: [
      {
        name: 'local-docs',
        type: 'file',
        path: './documentation'
      }
    ],
    cache: { strategy: 'memory' },
    server: { port: 3001 } // Different port
  };
  
  pipelineServer = new PersonalPipelineServer(config);
  await pipelineServer.start();
}

// Middleware to add pipeline to requests
app.use('/api/docs', (req, res, next) => {
  req.pipelineServer = pipelineServer;
  next();
});

// API routes using Personal Pipeline
app.get('/api/docs/search', async (req, res) => {
  try {
    const { query, limit = 10, source } = req.query;
    
    const results = await req.pipelineServer.searchKnowledgeBase(query, {
      limit: parseInt(limit),
      source
    });
    
    res.json({
      success: true,
      results,
      total: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/docs/runbooks', async (req, res) => {
  try {
    const { alertType, severity, systems } = req.query;
    
    const runbooks = await req.pipelineServer.searchRunbooks(alertType, {
      severity,
      systems: systems ? systems.split(',') : undefined
    });
    
    res.json({
      success: true,
      runbooks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start application
async function start() {
  await initializePipeline();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`Personal Pipeline running on port 3001`);
  });
}

start().catch(console.error);
```

### Next.js Integration

#### API Routes
```javascript
// pages/api/search.js
import { PersonalPipelineServer } from '@personal-pipeline/mcp-server';

let server;

async function getServer() {
  if (!server) {
    server = new PersonalPipelineServer({
      sources: [
        {
          name: 'next-docs',
          type: 'file',
          path: './docs'
        }
      ],
      cache: { strategy: 'memory' }
    });
    await server.start();
  }
  return server;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { query, limit = 10 } = req.body;
    const pipelineServer = await getServer();
    
    const results = await pipelineServer.searchKnowledgeBase(query, { limit });
    
    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

#### React Hook
```typescript
// hooks/usePersonalPipeline.ts
import { useState, useCallback } from 'react';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  confidence_score: number;
}

export function usePersonalPipeline() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const search = useCallback(async (query: string, limit = 10): Promise<SearchResult[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      return data.results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { search, loading, error };
}
```

## 🏪 Private Registry Setup

### Verdaccio Private Registry

#### Install and Configure Verdaccio
```bash
# Install Verdaccio globally
npm install -g verdaccio

# Start Verdaccio
verdaccio

# Or run with Docker
docker run -it --rm --name verdaccio \
  -p 4873:4873 \
  verdaccio/verdaccio
```

#### Configure npm for Private Registry
```bash
# Set registry for specific package
npm config set @personal-pipeline:registry http://localhost:4873

# Set global registry
npm config set registry http://localhost:4873

# Login to private registry
npm adduser --registry http://localhost:4873
```

### Docker-Based Private Registry

#### Docker Compose Setup
```yaml
# docker-compose.npm-registry.yml
version: '3.8'

services:
  npm-registry:
    image: verdaccio/verdaccio:latest
    container_name: npm-registry
    ports:
      - "4873:4873"
    volumes:
      - verdaccio-data:/verdaccio/storage
      - verdaccio-config:/verdaccio/conf
      - ./verdaccio.yaml:/verdaccio/conf/config.yaml:ro
    environment:
      - VERDACCIO_USER_UID=1001
      - VERDACCIO_USER_GID=1001
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: npm-registry-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - npm-registry
    restart: unless-stopped

volumes:
  verdaccio-data:
  verdaccio-config:
```

#### Verdaccio Configuration
```yaml
# verdaccio.yaml
storage: /verdaccio/storage

auth:
  htpasswd:
    file: /verdaccio/conf/htpasswd
    max_users: 1000

uplinks:
  npmjs:
    url: https://registry.npmjs.org/

packages:
  '@personal-pipeline/*':
    access: $authenticated
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs

  '**':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs

server:
  keepAliveTimeout: 60

middlewares:
  audit:
    enabled: true

logs:
  - { type: stdout, format: pretty, level: http }
```

### Publishing to Private Registry

#### Prepare Package for Publishing
```bash
# Build package
npm run build

# Update version
npm version patch

# Publish to private registry
npm publish --registry http://localhost:4873

# Publish with tag
npm publish --tag beta --registry http://localhost:4873
```

#### Automated Publishing Script
```bash
#!/bin/bash
# publish-package.sh

set -e

REGISTRY=${1:-http://localhost:4873}
TAG=${2:-latest}

echo "Publishing to registry: $REGISTRY"
echo "Tag: $TAG"

# Build package
npm run build

# Test package
npm run test

# Publish
if [ "$TAG" = "latest" ]; then
    npm publish --registry $REGISTRY
else
    npm publish --tag $TAG --registry $REGISTRY
fi

echo "Package published successfully"
```

### Enterprise Registry Integration

#### AWS CodeArtifact
```bash
# Login to CodeArtifact
aws codeartifact login --tool npm --repository my-repo --domain my-domain

# Configure npm
npm config set registry https://my-domain-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/my-repo/

# Publish package
npm publish
```

#### Azure Artifacts
```bash
# Install Azure Artifacts credential provider
npm install -g vsts-npm-auth

# Authenticate
vsts-npm-auth -config .npmrc

# Configure registry
npm config set registry https://pkgs.dev.azure.com/myorg/_packaging/myfeed/npm/registry/

# Publish package
npm publish
```

#### GitHub Packages
```bash
# Login to GitHub Packages
npm login --scope=@personal-pipeline --registry=https://npm.pkg.github.com

# Configure .npmrc
echo "@personal-pipeline:registry=https://npm.pkg.github.com" >> .npmrc

# Publish to GitHub Packages
npm publish
```

## 🛠️ Development Integration

### Development Workflow

#### Local Development Setup
```bash
# Clone repository
git clone https://github.com/your-org/my-project.git
cd my-project

# Install Personal Pipeline as dev dependency
npm install --save-dev @personal-pipeline/mcp-server

# Add scripts to package.json
npm pkg set scripts.docs:start="personal-pipeline start --debug"
npm pkg set scripts.docs:test="personal-pipeline test --integration"

# Start development server
npm run docs:start
```

#### Hot Reload Development
```javascript
// dev-server.js
const { PersonalPipelineServer } = require('@personal-pipeline/mcp-server');
const chokidar = require('chokidar');

let server;

async function startServer() {
  if (server) {
    await server.stop();
  }
  
  server = new PersonalPipelineServer({
    sources: [
      {
        name: 'dev-docs',
        type: 'file',
        path: './docs',
        watch: true
      }
    ],
    cache: { strategy: 'memory' },
    server: { port: 3000 }
  });
  
  await server.start();
  console.log('Development server started on port 3000');
}

// Watch for configuration changes
chokidar.watch('./config/config.yaml').on('change', () => {
  console.log('Configuration changed, restarting server...');
  startServer();
});

startServer();
```

### Testing Integration

#### Unit Testing with Jest
```javascript
// __tests__/pipeline.test.js
const { PersonalPipelineServer } = require('@personal-pipeline/mcp-server');

describe('Personal Pipeline Integration', () => {
  let server;
  
  beforeAll(async () => {
    server = new PersonalPipelineServer({
      sources: [
        {
          name: 'test-docs',
          type: 'file',
          path: './test-data'
        }
      ],
      cache: { strategy: 'memory' },
      server: { port: 0 } // Use random port
    });
    
    await server.start();
  });
  
  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });
  
  test('should search documentation', async () => {
    const results = await server.searchKnowledgeBase('test query');
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });
  
  test('should return runbooks', async () => {
    const runbooks = await server.searchRunbooks('database');
    expect(runbooks).toBeDefined();
    expect(runbooks.length).toBeGreaterThan(0);
  });
});
```

#### Integration Testing
```bash
#!/bin/bash
# test-integration.sh

set -e

echo "Starting integration tests..."

# Start Personal Pipeline in background
personal-pipeline start --port 3001 --daemon

# Wait for startup
sleep 5

# Test health endpoint
curl -f http://localhost:3001/health

# Test search endpoint
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 5}' \
  | jq '.results | length'

# Stop server
personal-pipeline stop

echo "Integration tests completed"
```

### Build Integration

#### Webpack Configuration
```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  externals: {
    '@personal-pipeline/mcp-server': 'commonjs @personal-pipeline/mcp-server'
  },
  node: {
    __dirname: false,
    __filename: false
  }
};
```

#### Rollup Configuration
```javascript
// rollup.config.js
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'cjs'
  },
  external: ['@personal-pipeline/mcp-server'],
  plugins: [
    nodeResolve(),
    commonjs()
  ]
};
```

## 🚀 CI/CD Integration

### GitHub Actions

#### Basic CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Personal Pipeline
      run: npm install -g @personal-pipeline/mcp-server
    
    - name: Run tests
      run: npm test
    
    - name: Test Personal Pipeline integration
      run: |
        personal-pipeline start --daemon --port 3001
        sleep 10
        curl -f http://localhost:3001/health
        personal-pipeline stop
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        registry-url: 'https://registry.npmjs.org'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to production
      run: |
        # Deploy your application using Personal Pipeline
        personal-pipeline deploy --config ./config/production.yaml
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### Private Registry Workflow
```yaml
# .github/workflows/private-registry.yml
name: Private Registry Deployment

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Configure private registry
      run: |
        npm config set @personal-pipeline:registry ${{ secrets.PRIVATE_REGISTRY_URL }}
        npm config set //${{ secrets.PRIVATE_REGISTRY_HOST }}/:_authToken ${{ secrets.PRIVATE_REGISTRY_TOKEN }}
    
    - name: Install from private registry
      run: npm install @personal-pipeline/mcp-server
    
    - name: Deploy application
      run: npm run deploy
```

### GitLab CI

#### GitLab CI Configuration
```yaml
# .gitlab-ci.yml
stages:
  - test
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:${NODE_VERSION}
  cache:
    paths:
      - node_modules/
  before_script:
    - npm ci
    - npm install -g @personal-pipeline/mcp-server
  script:
    - npm test
    - personal-pipeline test --integration
  only:
    - branches

deploy:
  stage: deploy
  image: node:${NODE_VERSION}
  before_script:
    - npm config set @personal-pipeline:registry ${PRIVATE_REGISTRY_URL}
    - npm config set //${PRIVATE_REGISTRY_HOST}/:_authToken ${PRIVATE_REGISTRY_TOKEN}
    - npm ci
  script:
    - npm run build
    - personal-pipeline deploy --config ./config/production.yaml
  only:
    - main
```

### Jenkins Pipeline

#### Jenkinsfile
```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        PRIVATE_REGISTRY = credentials('private-registry-url')
        REGISTRY_TOKEN = credentials('private-registry-token')
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g n'
                sh "n ${NODE_VERSION}"
                sh 'npm install -g @personal-pipeline/mcp-server'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm ci'
                sh 'npm test'
                sh 'personal-pipeline test --integration'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh """
                    npm config set @personal-pipeline:registry ${PRIVATE_REGISTRY}
                    npm config set //${PRIVATE_REGISTRY}/:_authToken ${REGISTRY_TOKEN}
                    npm ci
                    npm run build
                    personal-pipeline deploy --config ./config/production.yaml
                """
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
```

## 📦 Package Management

### Version Management

#### Semantic Versioning
```bash
# Patch version (0.1.0 → 0.1.1)
npm version patch

# Minor version (0.1.1 → 0.2.0)
npm version minor

# Major version (0.2.0 → 1.0.0)
npm version major

# Pre-release version (1.0.0 → 1.0.1-0)
npm version prerelease

# Specific version
npm version 1.2.3
```

#### Version Constraints
```json
{
  "dependencies": {
    "@personal-pipeline/mcp-server": "^0.1.0",     // Compatible version
    "@personal-pipeline/mcp-server": "~0.1.0",     // Patch updates only
    "@personal-pipeline/mcp-server": "0.1.0",      // Exact version
    "@personal-pipeline/mcp-server": ">=0.1.0",    // Minimum version
    "@personal-pipeline/mcp-server": "latest"      // Latest version
  }
}
```

### Dependency Management

#### Update Dependencies
```bash
# Check for updates
npm outdated

# Update to latest compatible versions
npm update

# Update specific package
npm update @personal-pipeline/mcp-server

# Install latest version
npm install @personal-pipeline/mcp-server@latest
```

#### Security Auditing
```bash
# Audit dependencies for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fixes (may introduce breaking changes)
npm audit fix --force

# View detailed audit report
npm audit --json
```

### Package Lock Management

#### Package-lock.json
```bash
# Ensure consistent installs
npm ci

# Update package-lock.json
npm install

# Verify package-lock.json
npm ls

# Clean install (remove node_modules first)
rm -rf node_modules package-lock.json
npm install
```

## 🔧 Troubleshooting

### Installation Issues

#### Permission Errors (Global Install)
```bash
# Fix npm permissions on macOS/Linux
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use nvm to avoid permission issues
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
npm install -g @personal-pipeline/mcp-server
```

#### Registry Connection Issues
```bash
# Check current registry
npm config get registry

# Test registry connectivity
npm ping

# Clear npm cache
npm cache clean --force

# Reset npm configuration
npm config delete registry
npm config delete @personal-pipeline:registry
```

#### Version Conflicts
```bash
# Check installed versions
npm list @personal-pipeline/mcp-server

# Remove conflicting versions
npm uninstall -g @personal-pipeline/mcp-server
npm uninstall @personal-pipeline/mcp-server

# Clean install
npm cache clean --force
npm install @personal-pipeline/mcp-server
```

### Runtime Issues

#### Module Not Found
```bash
# Verify installation
npm list @personal-pipeline/mcp-server

# Check Node.js version
node --version

# Reinstall package
npm uninstall @personal-pipeline/mcp-server
npm install @personal-pipeline/mcp-server
```

#### CLI Command Not Found
```bash
# Check global bin directory
npm config get prefix
echo $PATH

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH=$PATH:$(npm config get prefix)/bin

# Or use npx
npx personal-pipeline start
```

#### Configuration Issues
```bash
# Validate configuration
personal-pipeline config --validate

# Show current configuration
personal-pipeline config --show

# Reset to defaults
personal-pipeline config --reset

# Create new sample configuration
personal-pipeline config --create-sample
```

### Performance Issues

#### Slow Installation
```bash
# Use faster registry mirror
npm config set registry https://registry.npmmirror.com

# Clear cache and reinstall
npm cache clean --force
npm install

# Use offline installation (if available)
npm install --offline
```

#### Memory Issues
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 $(which personal-pipeline) start

# Or set environment variable
export NODE_OPTIONS="--max-old-space-size=4096"
personal-pipeline start
```

### Debug Mode

#### Enable Debug Logging
```bash
# Debug npm operations
DEBUG=npm* npm install @personal-pipeline/mcp-server

# Debug Personal Pipeline
DEBUG=personal-pipeline* personal-pipeline start

# Verbose logging
personal-pipeline start --debug --verbose
```

#### Diagnostic Information
```bash
# System information
npm doctor

# Environment information
npm config list

# Personal Pipeline diagnostics
personal-pipeline doctor

# Generate support bundle
personal-pipeline support --bundle
```

---

## 📋 Package Usage Checklist

### Installation
- [ ] Choose appropriate installation method (global vs local)
- [ ] Verify Node.js version compatibility (>=18.0.0)
- [ ] Configure registry if using private registry
- [ ] Test installation with version check
- [ ] Set up CLI tools in PATH

### Development
- [ ] Add package to project dependencies
- [ ] Configure TypeScript if using types
- [ ] Set up development scripts
- [ ] Test programmatic usage
- [ ] Configure hot reload if needed

### Production
- [ ] Use exact versions in package-lock.json
- [ ] Configure production registry
- [ ] Set up monitoring and health checks
- [ ] Plan update strategy
- [ ] Document deployment process

### CI/CD
- [ ] Configure registry authentication
- [ ] Set up automated testing
- [ ] Configure deployment scripts
- [ ] Test deployment pipeline
- [ ] Set up monitoring and alerts

---

**Next Steps:**
- [Enterprise Deployment Guide](./ENTERPRISE-DEPLOYMENT.md)
- [Container Deployment](./CONTAINERS.md)
- [Security Configuration](./SECURITY.md)
- [Monitoring Setup](./MONITORING.md)