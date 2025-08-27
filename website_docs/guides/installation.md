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

- **Node.js**: 20.0+ (LTS recommended)
- **npm**: 8.0+ or yarn 1.22+
- **Memory**: 512MB minimum, 2GB recommended
- **Disk**: 1GB free space for installation
- **Network**: Internet access for initial setup

### Optional Dependencies

- **Redis**: 6.0+ for enhanced caching (completely optional)
- **Docker**: 20.10+ for Redis container (optional)
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
    type: "file"
    base_url: "./docs"
    recursive: true
    max_depth: 5
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
# Check server health via npm script
npm run health

# Or use REST API directly
curl http://localhost:3000/api/health

# Expected response:
{
  "success": true,
  "status": "healthy",
  "version": "1.4.0",
  "uptime_seconds": 123.45,
  "timestamp": "2025-08-16T10:30:00.000Z"
}
```

### MCP Tools Test

```bash
# Test MCP tools interactively
npm run test-mcp

# Enhanced MCP explorer
npm run mcp-explorer

# Or manually test search via REST API
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "runbook", "max_results": 5}'
```

## Post-Installation Setup

### 1. Configure Sources

Add your documentation sources to `config/config.yaml`. Currently supported adapters:

**FileSystem Adapter (Local files):**
```yaml
sources:
  - name: "local-docs"
    type: "file"
    base_url: "./docs"
    recursive: true
    max_depth: 5
    supported_extensions:
      - '.md'
      - '.txt'
      - '.json'
      - '.yml'
```

**Web Adapter (REST APIs):**
```yaml
sources:
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
```

### 2. Set Up Redis Caching (Optional)

```bash
# Start Redis container (optional for better caching)
docker run -d -p 6379:6379 redis:alpine

# Enable Redis caching via environment variable
export REDIS_URL=redis://localhost:6379

# Restart Personal Pipeline
npm start
```

### 3. Verify Configuration

```bash
# Validate your configuration
npm run validate-config

# Check configured sources
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

**Redis connection issues:**
```bash
# Redis is completely optional - disable if having issues
unset REDIS_URL

# Or start Redis if you want caching
docker run -d -p 6379:6379 redis:alpine
export REDIS_URL=redis://localhost:6379
```

**Memory issues:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
npm start
```

### Getting Help

```bash
# Check system health
npm run health

# View detailed performance metrics
npm run health:dashboard

# Enable debug logging
export LOG_LEVEL=debug
npm start
```

## Production Deployment

### Build and Run

```bash
# Build for production
npm run build

# Create production configuration
cp config/config.sample.yaml config/config.yaml
# Edit config.yaml for your sources

# Start production server
NODE_ENV=production npm start
```

### Docker Compose (with Redis)

```yaml
version: '3.8'
services:
  personal-pipeline:
    build: .  # Build from source
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
# config/config.yaml - Hybrid caching with Redis + memory fallback
cache:
  strategy: "hybrid"
  redis:
    enabled: true
    url: "redis://localhost:6379"
    ttl: 3600
  memory:
    max_size: "50mb"
    ttl: 300
```

## Next Steps

- [Configuration Guide](./configuration.md) - Detailed configuration options
- [Architecture Overview](./architecture.md) - Understanding the system design
- [API Reference](../api/) - REST API and MCP tools documentation
- [Source Adapters](../api/adapters.md) - Available adapters (FileSystem, Web)