# Quick Start Guide

Get Personal Pipeline running in under 5 minutes with this step-by-step guide.

## Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js version (20+ required)
node --version

# Check npm version (8+ required)  
npm --version

# Check Docker (optional, for Redis caching)
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
# - Start the MCP server with REST API
# - Start Redis cache (if REDIS_URL is set)
# - Set up performance monitoring
# - Create test data in ./test-data directory
```

## Method 2: Development Mode  

### Step 1: Clone and Build

```bash
# Clone repository
git clone https://github.com/dpark2025/personal-pipeline.git
cd personal-pipeline

# Install dependencies and build
npm install
npm run build
```

### Step 2: Create Configuration

```bash
# Copy sample configuration
cp config/config.sample.yaml config/config.yaml

# Edit as needed for your sources
# nano config/config.yaml
```

### Step 3: Start Development Server

```bash
# Start with hot reload
npm run dev

# Or start production server
npm start
```

### Step 4: Verify Installation

```bash
# Check server health
npm run health

# Or use REST API directly
curl http://localhost:3000/api/health

# Expected response:
# {
#   "success": true,
#   "status": "healthy", 
#   "version": "1.4.0",
#   "uptime_seconds": 12.34
# }
```

## Testing Your Installation

### 1. Health Check

```bash
# Check server health via npm script
npm run health

# Or use REST API directly
curl http://localhost:3000/api/health | jq

# Detailed performance metrics
curl http://localhost:3000/api/performance | jq
```

### 2. Test REST API Endpoints

```bash
# Search for runbooks
curl -X POST http://localhost:3000/api/runbooks/search \
  -H "Content-Type: application/json" \
  -d '{
    "alert_type": "disk_space",
    "severity": "high",
    "max_results": 3
  }' | jq

# General documentation search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "memory pressure",
    "max_results": 3
  }' | jq
```

### 3. List Available Sources

```bash
# View configured sources and their health
curl http://localhost:3000/api/sources | jq
```

### 4. Interactive MCP Testing

```bash
# Start interactive MCP testing tool
npm run test-mcp

# Enhanced MCP explorer with analytics
npm run mcp-explorer

# This provides:
# - Interactive tool testing
# - Performance analytics 
# - Automated test suite with 24/24 scenarios
```

## Sample Configuration

### Basic Setup (FileSystem Only)

```yaml
# config/config.yaml
server:
  port: 3000
  host: '0.0.0.0'

sources:
  - name: "local-docs"
    type: "file"
    base_url: "./docs" 
    recursive: true
    max_depth: 5
    watch_changes: true
    supported_extensions:
      - '.md'
      - '.txt'
      - '.json'
      - '.yml'

cache:
  strategy: "memory"
  ttl: 300
  max_size: "100mb"

logging:
  level: "info"
  format: "json"
```

### With Web Adapter (REST APIs)

```yaml
# config/config.yaml  
server:
  port: 3000
  host: '0.0.0.0'

sources:
  - name: "local-docs"
    type: "file"
    base_url: "./docs"
    recursive: true
    
  - name: "api-docs"
    type: "web"
    base_url: "https://api.example.com"
    endpoints:
      - path: "/docs"
        method: "GET"
        content_type: "json"
    performance:
      timeout_ms: 10000
      max_retries: 3

cache:
  strategy: "memory"
  ttl: 300

logging:
  level: "info" 
```

### With Redis Caching

```yaml
# config/config.yaml
server:
  port: 3000
  host: '0.0.0.0'

sources:
  - name: "local-docs"
    type: "file" 
    base_url: "./docs"
    recursive: true

cache:
  strategy: "hybrid"  # Redis + memory fallback
  redis:
    enabled: true
    url: "redis://localhost:6379" 
    ttl: 3600
  memory:
    ttl: 300
    max_size: "50mb"

logging:
  level: "info"
  format: "json"
```

## Next Steps

### 1. Add More Documentation Sources

```bash
# For Web APIs (REST endpoints)
# Update your config.yaml to include web sources
# See "With Web Adapter" example above

# Configure for local file scanning
# Point to your documentation directories
# Update sources.base_url paths in config.yaml
```

### 2. Performance Optimization  

```bash
# Start Redis for better caching
docker run -d -p 6379:6379 redis:alpine
export REDIS_URL="redis://localhost:6379"

# Monitor performance
npm run performance:monitor  

# Run performance dashboard
npm run health:dashboard
```

### 3. Production Deployment

```bash
# Build for production
npm run build

# Create production configuration  
cp config/config.sample.yaml config/config.yaml
# Edit config.yaml for your sources

# Start production server
npm start
```

## Common Issues & Solutions

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process or change port in config.yaml
# Or set PORT environment variable
export PORT=3001
npm start
```

### Configuration File Not Found

```bash
# Verify config file location
ls -la config/config.yaml

# Copy from sample if missing
cp config/config.sample.yaml config/config.yaml

# Validate configuration
npm run validate-config
```

### Redis Connection Issues

```bash
# Redis is optional - disable if not needed
# Remove REDIS_URL environment variable
unset REDIS_URL

# Or start Redis if you want caching
docker run -d -p 6379:6379 redis:alpine
export REDIS_URL="redis://localhost:6379"
```

### Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
npm start
```

## Getting Help

### Documentation

- [Configuration Guide](../guides/configuration.md) - Complete configuration reference
- [API Reference](../api/) - REST API and MCP tools documentation  
- [Source Adapters](../api/adapters.md) - Available adapters (FileSystem, Web)

### Troubleshooting

```bash
# Check system health
npm run health

# Enable debug logging
export LOG_LEVEL=debug
npm start

# Performance monitoring dashboard
npm run health:dashboard

# Run comprehensive tests
npm test
```

### Community Support

- [GitHub Issues](https://github.com/dpark2025/personal-pipeline/issues)
- [Documentation Site](https://dpark2025.github.io/personal-pipeline/)
- [Discussions](https://github.com/dpark2025/personal-pipeline/discussions)

## What's Next?

Once you have Personal Pipeline running:

1. **Configure Sources** - Add your file and web documentation sources
2. **Create Runbooks** - Set up operational procedures in Markdown or JSON
3. **Integrate with MCP Clients** - Connect to LangGraph or other MCP agents
4. **Monitor Performance** - Use built-in performance monitoring
5. **Scale Up** - Deploy with Redis caching and production configuration

Happy monitoring! 🚀