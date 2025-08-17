# Installation Guide

Get Personal Pipeline running in your environment with this comprehensive installation guide.

## Quick Start

```bash
# Method 1: Clone from source (recommended)
git clone https://github.com/dpark2025/personal-pipeline.git
cd personal-pipeline
npm install && npm run build

# Method 2: Demo environment (fastest)
npm run demo:start

# Method 3: Direct development
npm run dev
```

## Prerequisites

### System Requirements

- **Node.js**: 18.0+ (LTS recommended)
- **npm**: 8.0+ or yarn 1.22+
- **Memory**: 512MB minimum, 2GB recommended
- **Disk**: 1GB free space for installation
- **Network**: Internet access for initial setup

### Optional Dependencies

- **Docker**: 20.10+ for container deployment
- **Redis**: 6.0+ for enhanced caching (optional)
- **Git**: For source code installation

## Installation Methods

### Method 1: Source Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/dpark2025/personal-pipeline.git
cd personal-pipeline

# Install dependencies
npm install

# Build the application
npm run build

# Start the MCP server
npm start
```

### Method 2: Development Mode

```bash
# Clone and start in development mode
git clone https://github.com/dpark2025/personal-pipeline.git
cd personal-pipeline
npm install

# Start with hot reload
npm run dev
```

### Method 3: Demo Environment

```bash
# Quick demo with sample data
git clone https://github.com/dpark2025/personal-pipeline.git
cd personal-pipeline
npm install

# Start full demo environment
npm run demo:start

# Or interactive demo setup
npm run demo:start:interactive
```

## Configuration

### Basic Configuration

Create a configuration file at `config/config.yaml`:

```yaml
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
  format: "json"
```

### Environment Variables

```bash
# Server configuration
export PORT=3000
export HOST=0.0.0.0
export NODE_ENV=production

# Configuration file
export CONFIG_FILE=./config/config.yaml

# Logging
export LOG_LEVEL=info
export LOG_FORMAT=json

# Redis (optional)
export REDIS_URL=redis://localhost:6379
```

## Verification

### Health Check

```bash
# Check server health
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 123.45,
  "timestamp": "2025-08-16T10:30:00.000Z"
}
```

### MCP Tools Test

```bash
# Test MCP tools
npm run test-mcp

# Or manually test search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "runbook", "limit": 5}'
```

## Post-Installation Setup

### 1. Configure Sources

Add your documentation sources to `config/config.yaml`:

```yaml
sources:
  - name: "confluence"
    type: "confluence"
    base_url: "https://company.atlassian.net/wiki"
    auth:
      type: "bearer_token"
      token_env: "CONFLUENCE_TOKEN"
    
  - name: "github-docs"
    type: "github"
    repository: "company/docs"
    auth:
      type: "token"
      token_env: "GITHUB_TOKEN"
```

### 2. Set Up Authentication

```bash
# Set environment variables
export CONFLUENCE_TOKEN=your_confluence_token
export GITHUB_TOKEN=your_github_token

# Or create .env file
echo "CONFLUENCE_TOKEN=your_confluence_token" > .env
echo "GITHUB_TOKEN=your_github_token" >> .env
```

### 3. Initialize Cache

```bash
# Start with Redis for better performance
docker run -d -p 6379:6379 redis:alpine

# Update configuration for Redis
export REDIS_URL=redis://localhost:6379

# Restart Personal Pipeline
npm restart
```

### 4. Load Documentation

```bash
# Index existing documentation
npm run index-docs

# Verify indexing
curl http://localhost:3000/api/sources
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process or change port
export PORT=3001
```

**Configuration file not found:**
```bash
# Verify file exists
ls -la config/config.yaml

# Use absolute path
export CONFIG_FILE=/full/path/to/config.yaml
```

**Permission errors:**
```bash
# Fix file permissions
chmod 644 config/config.yaml
chmod 755 $(which personal-pipeline)

# Or run with specific user
sudo -u nodejs personal-pipeline
```

**Memory issues:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Or use Docker with memory limit
docker run --memory=1g localhost:5000/personal-pipeline/mcp-server:latest
```

### Getting Help

```bash
# View help
personal-pipeline --help

# Check logs
tail -f logs/app.log

# Enable debug logging
export DEBUG=personal-pipeline:*
export LOG_LEVEL=debug
```

## Production Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  personal-pipeline:
    image: localhost:5000/personal-pipeline/mcp-server:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379
    volumes:
      - ./config:/app/config:ro
      - logs:/app/logs
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  logs:
  redis-data:
```

### Systemd Service

```ini
# /etc/systemd/system/personal-pipeline.service
[Unit]
Description=Personal Pipeline MCP Server
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/personal-pipeline
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=CONFIG_FILE=/opt/personal-pipeline/config/config.yaml

[Install]
WantedBy=multi-user.target
```

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'personal-pipeline',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Security Considerations

### File Permissions

```bash
# Secure configuration files
chmod 600 config/config.yaml
chmod 600 .env

# Secure log directory
chmod 755 logs/
chmod 644 logs/*.log
```

### Network Security

```bash
# Bind to localhost only (for reverse proxy)
export HOST=127.0.0.1

# Use HTTPS in production
export HTTPS_CERT=/path/to/cert.pem
export HTTPS_KEY=/path/to/key.pem
```

### Environment Isolation

```bash
# Run as non-root user
useradd -r -s /bin/false nodejs
su nodejs -c "personal-pipeline"

# Use Docker user namespace
docker run --user 1001:1001 localhost:5000/personal-pipeline/mcp-server:latest
```

## Performance Tuning

### Node.js Optimization

```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Optimize garbage collection
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"

# Enable V8 optimizations
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size --gc-interval=100"
```

### Caching Configuration

```yaml
# config/config.yaml
cache:
  type: "redis"
  url: "redis://localhost:6379"
  ttl: 3600
  max_size: "100mb"
  
  # Memory fallback
  memory:
    max_size: "50mb"
    ttl: 300
```

## Next Steps

- [Configuration Guide](./configuration.md) - Detailed configuration options
- [Architecture Overview](./architecture.md) - Understanding the system design
- [API Reference](../api/mcp-tools.md) - Using the MCP tools and REST API
- [Registry Setup](../registry/setup.md) - Setting up local registries