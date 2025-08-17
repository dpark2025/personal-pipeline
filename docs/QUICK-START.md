# Personal Pipeline - Quick Start Guide

Get Personal Pipeline running in under 5 minutes! This guide covers the fastest path to deployment for new users.

## 🚀 Choose Your Installation Method

### Option 1: Docker (Recommended) ⭐
**Best for:** Production use, isolated environments, easy setup

```bash
# 1. Pull and run the container
docker run -d \
  --name personal-pipeline \
  -p 3000:3000 \
  -v personal-pipeline-data:/app/data \
  personal-pipeline/mcp-server:latest

# 2. Verify it's running
curl http://localhost:3000/health
```

**✅ Pros:** No dependencies, isolated environment, production-ready  
**❌ Cons:** Requires Docker, larger download

### Option 2: npm Global Install
**Best for:** Development, CLI usage, Node.js environments

```bash
# 1. Install globally
npm install -g @personal-pipeline/mcp-server

# 2. Start the server
personal-pipeline start

# 3. Verify it's running
personal-pipeline status
```

**✅ Pros:** Native performance, smaller footprint, direct CLI access  
**❌ Cons:** Requires Node.js 18+, may conflict with other global packages

### Option 3: Local npm Install
**Best for:** Project integration, programmatic usage

```bash
# 1. Install in your project
npm install @personal-pipeline/mcp-server

# 2. Start the server
npx personal-pipeline start

# 3. Or use programmatically
node -e "import('@personal-pipeline/mcp-server').then(({PersonalPipelineServer}) => new PersonalPipelineServer().start())"
```

**✅ Pros:** Project-scoped, version controlled, programmatic access  
**❌ Cons:** Requires Node.js knowledge, longer setup

## ⚡ Quick Demo Setup

Want to try it immediately? Use our demo environment:

```bash
# Clone and demo (if you have the source)
git clone https://github.com/your-username/personal-pipeline-mcp.git
cd personal-pipeline-mcp
npm run demo:start

# OR use Docker with demo data
docker run -d \
  --name pp-demo \
  -p 3000:3000 \
  -e DEMO_MODE=true \
  personal-pipeline/mcp-server:latest
```

## 🔧 Basic Configuration

### Automatic Setup
Personal Pipeline creates a default configuration on first run:

```bash
# View current configuration
personal-pipeline config --show

# Generate sample configuration
personal-pipeline config --create-sample
```

### Manual Configuration
Create `config/config.yaml`:

```yaml
sources:
  - name: "local-docs"
    type: "file"
    path: "./documentation"
    watch: true
    patterns: ["**/*.md", "**/*.json"]

cache:
  strategy: "memory"  # Start simple, upgrade to Redis later
  memory:
    max_keys: 1000
    ttl: 3600

server:
  port: 3000
  host: "0.0.0.0"
  cors_enabled: true
```

## 🧪 First Test

### Test the REST API
```bash
# Health check
curl http://localhost:3000/health

# Search for documentation
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "getting started", "limit": 5}'

# List available sources
curl http://localhost:3000/api/sources
```

### Test the MCP Protocol
```bash
# List available MCP tools
pp-mcp tools

# Test a specific tool
pp-mcp call search_runbooks --params '{"query": "database", "limit": 3}'

# Interactive explorer
pp-mcp explorer
```

### Test the CLI
```bash
# Quick search
pp search "troubleshooting" --limit 3

# Performance test
personal-pipeline benchmark --quick

# Health dashboard
personal-pipeline status --watch
```

## 📚 Add Your Documentation

### File System (Simplest)
```bash
# Create documentation directory
mkdir -p ./documentation/runbooks

# Add a sample runbook
cat > ./documentation/runbooks/database-issues.md << 'EOF'
# Database Connection Issues

## Symptoms
- Connection timeouts
- Authentication failures
- Slow queries

## Solutions
1. Check database server status
2. Verify connection strings
3. Review authentication credentials
4. Monitor connection pool
EOF

# Restart to pick up new docs
personal-pipeline restart
```

### GitHub Integration
```yaml
# Add to config/config.yaml
sources:
  - name: "github-docs"
    type: "github"
    owner: "your-org"
    repo: "documentation"
    auth:
      token_env: "GITHUB_TOKEN"
    patterns: ["**/*.md"]
```

```bash
# Set environment variable
export GITHUB_TOKEN="your_github_personal_access_token"

# Restart to load GitHub docs
personal-pipeline restart
```

## 🔍 Verify Installation

### Health Checks
```bash
# Basic health
curl http://localhost:3000/health

# Detailed health with metrics
curl http://localhost:3000/health/detailed | jq

# Cache status
curl http://localhost:3000/health/cache | jq

# Source adapter status
curl http://localhost:3000/health/sources | jq
```

### Performance Validation
```bash
# Quick performance test
personal-pipeline benchmark --concurrent 5 --duration 15

# Expected results:
# ✅ Response time < 200ms
# ✅ Success rate > 95%
# ✅ Cache hit rate > 60%
```

### Functional Testing
```bash
# Test all MCP tools
pp-mcp test-suite --quick

# Test REST API endpoints
personal-pipeline test --api

# Integration test
personal-pipeline test --integration
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Use different port
personal-pipeline start --port 8080
# OR
docker run -p 8080:3000 personal-pipeline/mcp-server:latest
```

#### 2. Configuration Not Found
```bash
# Create default configuration
personal-pipeline config --create-sample

# Specify configuration location
personal-pipeline start --config ./custom-config.yaml
```

#### 3. Redis Connection Failed
```bash
# Start without Redis (memory-only cache)
personal-pipeline start --no-cache

# OR update config to use memory cache
echo "cache:
  strategy: memory" > config/config.yaml
```

#### 4. Documentation Not Found
```bash
# Check source configuration
personal-pipeline sources --status

# Verify file paths exist
ls -la ./documentation/

# Force source refresh
personal-pipeline sources --refresh
```

#### 5. Permission Denied (Docker)
```bash
# Fix volume permissions
docker run --rm -v personal-pipeline-data:/data alpine chown -R 1001:1001 /data

# OR run with current user
docker run --user $(id -u):$(id -g) personal-pipeline/mcp-server:latest
```

### Debug Mode
```bash
# Enable debug logging
personal-pipeline start --debug --verbose

# View logs
personal-pipeline logs --tail 100

# Docker logs
docker logs personal-pipeline --tail 100 -f
```

### Health Diagnostics
```bash
# Complete health check
personal-pipeline doctor

# Check system requirements
personal-pipeline doctor --requirements

# Validate configuration
personal-pipeline config --validate
```

## 📈 Performance Tuning

### Quick Wins
```yaml
# config/config.yaml
cache:
  strategy: "redis"  # Use Redis for better performance
  redis:
    url: "redis://localhost:6379"
  memory:
    max_keys: 5000    # Increase memory cache
    ttl: 7200         # 2 hour cache

server:
  compression: true   # Enable response compression
  rate_limit:
    window: 15        # 15 minute window
    max_requests: 1000 # 1000 requests per window
```

### Redis Setup (Optional but Recommended)
```bash
# Docker Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# Update configuration
export REDIS_URL="redis://localhost:6379"
personal-pipeline restart

# Verify Redis connection
personal-pipeline cache --status
```

## 🔐 Security Hardening

### Basic Security
```yaml
# config/config.yaml
server:
  cors_enabled: true
  cors_origins: ["https://yourdomain.com"]
  rate_limit:
    enabled: true
    window: 15
    max_requests: 100
  
security:
  api_key_required: true
  api_key_env: "PP_API_KEY"
```

```bash
# Set API key
export PP_API_KEY="your-secure-api-key"

# Test with API key
curl -H "X-API-Key: your-secure-api-key" http://localhost:3000/health
```

### Container Security
```bash
# Run as non-root user
docker run --user 1001:1001 personal-pipeline/mcp-server:latest

# Read-only container
docker run --read-only --tmpfs /app/cache personal-pipeline/mcp-server:latest

# Security scan
docker scout cves personal-pipeline/mcp-server:latest
```

## 🎯 Next Steps

### 1. Add More Documentation Sources
- [Configure GitHub integration](./DEPLOYMENT.md#github-integration)
- [Set up Confluence adapter](./DEPLOYMENT.md#confluence-integration)
- [Connect to databases](./DEPLOYMENT.md#database-sources)

### 2. Scale for Production
- [Set up Redis caching](./CONTAINERS.md#redis-setup)
- [Configure load balancing](./ENTERPRISE-DEPLOYMENT.md#load-balancing)
- [Implement monitoring](./ENTERPRISE-DEPLOYMENT.md#monitoring)

### 3. Integrate with Your Workflow
- [LangGraph integration](./DEPLOYMENT.md#langgraph-integration)
- [CI/CD setup](./PACKAGES.md#cicd-integration)
- [Custom adapters](./DEVELOPMENT.md#custom-adapters)

### 4. Advanced Features
- [Performance optimization](./ENTERPRISE-DEPLOYMENT.md#performance-optimization)
- [Security hardening](./ENTERPRISE-DEPLOYMENT.md#security)
- [Backup and recovery](./ENTERPRISE-DEPLOYMENT.md#backup-recovery)

---

## 🏁 Success Checklist

- [ ] Personal Pipeline is running on port 3000
- [ ] Health check returns 200 OK
- [ ] At least one documentation source is configured
- [ ] MCP tools are responding correctly
- [ ] REST API endpoints are accessible
- [ ] Basic performance test passes
- [ ] Configuration is saved and documented

**Congratulations!** 🎉 Personal Pipeline is now running. Check out the [Deployment Guide](./DEPLOYMENT.md) for advanced configuration options.

---

**Need Help?**
- 📖 [Full Documentation](./DEPLOYMENT.md)
- 🐛 [Troubleshooting Guide](./TROUBLESHOOTING.md)  
- 💬 [Community Support](https://github.com/your-username/personal-pipeline-mcp/discussions)
- 🚨 [Report Issues](https://github.com/your-username/personal-pipeline-mcp/issues)