# Quick Start Guide

Get Personal Pipeline running in under 5 minutes with this step-by-step guide.

## Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js version (18+ required)
node --version

# Check npm version (8+ required)
npm --version

# Check Docker (optional, for registry)
docker --version
```

## Method 1: Demo Environment (Fastest)

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/dpark2025/personal-pipeline.git
cd personal-pipeline

# Install dependencies
npm install
```

### Step 2: Start Demo Environment

```bash
# Start the full demo with sample data
npm run demo:start

# This will:
# - Generate sample configuration and test data
# - Start the MCP server
# - Start Redis cache (if available)
# - Set up performance monitoring
```

## Method 2: Development Mode

### Step 1: Source Installation

```bash
# Clone and build from source
git clone https://github.com/dpark2025/personal-pipeline.git
cd personal-pipeline
npm install && npm run build
```

### Step 2: Start Development Server

```bash
# Start with hot reload
npm run dev

# Or start production server
npm start
```

### Step 3: Basic Configuration

```bash
# Create config directory
mkdir -p config

# Copy sample configuration
cp node_modules/@personal-pipeline/mcp-server/config/config.sample.yaml config/config.yaml
```

### Step 4: Start the Server

```bash
# Start Personal Pipeline
personal-pipeline

# Or with npm script
npm start
```

### Step 5: Verify Installation

```bash
# Check server health
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "version": "0.1.0",
#   "uptime": 12.34
# }
```

## Method 2: Docker Container

### Step 1: Pull and Run

```bash
# Pull latest image
docker pull localhost:5000/personal-pipeline/mcp-server:latest

# Run with default configuration
docker run -p 3000:3000 localhost:5000/personal-pipeline/mcp-server:latest
```

### Step 2: Run with Custom Configuration

```bash
# Create config directory
mkdir -p config

# Create basic configuration
cat > config/config.yaml << EOF
server:
  port: 3000
  host: '0.0.0.0'

sources:
  - name: "local-docs"
    type: "filesystem"
    path: "./docs"
    refresh_interval: "5m"

cache:
  type: "memory"
  ttl: 300

logging:
  level: "info"
EOF

# Run with custom config
docker run -p 3000:3000 \
  -v $(pwd)/config:/app/config \
  localhost:5000/personal-pipeline/mcp-server:latest
```

## Method 3: Source Code

### Step 1: Clone and Install

```bash
# Clone repository
git clone https://github.com/your-username/personal-pipeline-mcp.git
cd personal-pipeline-mcp

# Install dependencies
npm install
```

### Step 2: Development Setup

```bash
# Set up demo environment
npm run demo:start

# This will:
# - Start Redis for caching
# - Generate sample data
# - Configure demo sources
# - Start the server
```

### Step 3: Development Mode

```bash
# Start in development mode with hot reload
npm run dev

# Or run tests
npm test
```

## Testing Your Installation

### 1. Health Check

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health information
curl http://localhost:3000/health/detailed | jq
```

### 2. Test MCP Tools

```bash
# Search for runbooks
curl -X POST http://localhost:3000/api/runbooks/search \
  -H "Content-Type: application/json" \
  -d '{
    "alert_type": "disk_space",
    "severity": "high",
    "limit": 3
  }' | jq
```

### 3. List Available Sources

```bash
# View configured sources
curl http://localhost:3000/api/sources | jq
```

### 4. Interactive MCP Explorer

```bash
# Start interactive MCP client
npm run mcp-explorer

# This provides:
# - Interactive tool testing
# - Performance analytics
# - Automated test suite
```

## Sample Configuration

### Basic Setup

```yaml
# config/config.yaml
server:
  port: 3000
  host: '0.0.0.0'

sources:
  - name: "local-docs"
    type: "filesystem"
    path: "./docs"
    refresh_interval: "5m"
    priority: 1

cache:
  type: "memory"
  ttl: 300
  max_size: "100mb"

logging:
  level: "info"
  format: "json"
```

### With Redis Caching

```yaml
# config/config.yaml
server:
  port: 3000
  host: '0.0.0.0'

sources:
  - name: "local-docs"
    type: "filesystem"
    path: "./docs"
    refresh_interval: "5m"

cache:
  type: "redis"
  url: "redis://localhost:6379"
  ttl: 3600
  fallback:
    type: "memory"
    ttl: 300

logging:
  level: "info"
  format: "json"
```

### Production Configuration

```yaml
# config/config.yaml
server:
  port: 3000
  host: '0.0.0.0'

sources:
  - name: "confluence"
    type: "confluence"
    base_url: "https://company.atlassian.net/wiki"
    auth:
      type: "bearer_token"
      token_env: "CONFLUENCE_TOKEN"
    refresh_interval: "1h"
    priority: 1

  - name: "github-docs"
    type: "github"
    repository: "company/docs"
    path: "runbooks/"
    auth:
      type: "token"
      token_env: "GITHUB_TOKEN"
    refresh_interval: "30m"
    priority: 2

cache:
  type: "redis"
  url: "redis://localhost:6379"
  ttl: 3600
  circuit_breaker:
    enabled: true
    failure_threshold: 5
    reset_timeout: 30000

performance:
  monitoring:
    enabled: true
    metrics_endpoint: "/metrics"
  
logging:
  level: "info"
  format: "json"
  destinations:
    - type: "file"
      filename: "logs/app.log"
    - type: "console"
```

## Next Steps

### 1. Add Documentation Sources

```bash
# Set up environment variables for external sources
export CONFLUENCE_TOKEN=your_confluence_token
export GITHUB_TOKEN=your_github_token

# Update configuration to include these sources
# Restart Personal Pipeline
```

### 2. Performance Optimization

```bash
# Start Redis for better caching
docker run -d -p 6379:6379 redis:alpine

# Update config to use Redis
# Monitor performance
npm run performance:monitor
```

### 3. Production Deployment

```bash
# Build for production
npm run build

# Create production configuration
cp config/config.sample.yaml config/production.yaml

# Deploy with process manager
pm2 start dist/index.js --name personal-pipeline
```

## Common Issues & Solutions

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process or change port
export PORT=3001
```

### Configuration File Not Found

```bash
# Verify config file location
ls -la config/config.yaml

# Use absolute path
export CONFIG_FILE=/full/path/to/config.yaml
```

### Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
```

### Permission Errors

```bash
# Fix file permissions
chmod 644 config/config.yaml

# Run as specific user
sudo -u nodejs personal-pipeline
```

## Getting Help

### Documentation

- [Installation Guide](../guides/installation.md) - Detailed installation instructions
- [Configuration Guide](../guides/configuration.md) - Complete configuration reference
- [API Reference](../api/mcp-tools.md) - MCP tools and REST API documentation

### Troubleshooting

```bash
# Enable debug logging
export DEBUG=personal-pipeline:*
export LOG_LEVEL=debug

# View logs
tail -f logs/app.log

# Check system health
npm run health:dashboard
```

### Community Support

- [GitHub Issues](https://github.com/your-username/personal-pipeline-mcp/issues)
- [Documentation Site](https://your-username.github.io/personal-pipeline-mcp/)
- [Community Forum](https://github.com/your-username/personal-pipeline-mcp/discussions)

## What's Next?

Once you have Personal Pipeline running:

1. **Configure Sources** - Add your documentation sources
2. **Create Runbooks** - Set up operational procedures
3. **Integrate with Agents** - Connect to LangGraph or other AI agents
4. **Monitor Performance** - Set up monitoring and alerting
5. **Scale Up** - Deploy to production environment

Happy monitoring! 🚀