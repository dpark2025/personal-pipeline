# Server Management Guide

Complete guide for starting, stopping, and managing Personal Pipeline server instances across different deployment scenarios.

## Overview

Personal Pipeline provides multiple ways to run and manage the server, from development to production environments. This guide covers all server management operations including graceful shutdown procedures.

## Server Startup Options

### Development Mode

```bash
# Start with hot reload (recommended for development)
npm run dev

# Start with debug logging
LOG_LEVEL=debug npm run dev

# Start on custom port
PORT=8080 npm run dev
```

**Features:**
- Hot reload on code changes
- Debug logging enabled
- Development middleware active
- Memory-only caching (unless Redis configured)

### Production Mode

```bash
# Build and start production server
npm run build
npm start

# Or combined
npm run build && npm start

# Start with production logging
NODE_ENV=production npm start
```

**Features:**
- Optimized build
- Production error handling
- Structured logging
- Redis caching (if configured)

### Demo Environment

```bash
# Start complete demo with sample data
npm run demo:start

# Interactive demo setup with prompts
npm run demo:start:interactive

# Stop demo environment (includes cleanup)
npm run demo:stop
```

## Server Stopping Procedures

### 🚨 **IMPORTANT**: Always Stop Services When Done

Personal Pipeline creates background processes that need proper cleanup. **Always stop services** when finished working to prevent resource leaks and port conflicts.

### Quick Stop Commands

```bash
# Stop demo environment (recommended)
npm run demo:stop

# Kill all Personal Pipeline processes
pkill -f "node.*personal-pipeline"

# Kill Redis if started by demo
pkill -f "redis-server.*6379"

# Stop specific port (if known)
npx kill-port 3000
```

### Graceful Shutdown Methods

#### 1. Keyboard Interrupt (Ctrl+C)

For servers started with `npm run dev` or `npm start`:

```bash
# Press Ctrl+C in the terminal where server is running
^C

# The server will:
# - Stop accepting new connections
# - Complete current requests
# - Clean up resources
# - Exit gracefully
```

#### 2. Process Management

```bash
# Find Personal Pipeline processes
ps aux | grep personal-pipeline

# Kill by process ID (replace PID with actual process ID)
kill -SIGTERM [PID]

# Force kill if graceful shutdown fails
kill -SIGKILL [PID]
```

#### 3. Using Process Manager (PM2)

```bash
# If using PM2 for production
pm2 stop personal-pipeline
pm2 delete personal-pipeline

# Stop all PM2 processes
pm2 stop all
pm2 delete all
```

#### 4. Docker Container Management

```bash
# Stop Docker container
docker stop personal-pipeline

# Stop and remove container
docker stop personal-pipeline && docker rm personal-pipeline

# Stop all Personal Pipeline containers
docker ps | grep personal-pipeline | awk '{print $1}' | xargs docker stop
```

## Complete Cleanup Procedures

### Full Environment Cleanup

```bash
#!/bin/bash
# scripts/cleanup-environment.sh

echo "🧹 Cleaning up Personal Pipeline environment..."

# Stop demo environment
echo "Stopping demo environment..."
npm run demo:stop 2>/dev/null || true

# Kill any remaining Personal Pipeline processes
echo "Killing Personal Pipeline processes..."
pkill -f "node.*personal-pipeline" 2>/dev/null || true
pkill -f "tsx.*src/index.ts" 2>/dev/null || true

# Stop Redis if running on default port
echo "Stopping Redis..."
pkill -f "redis-server.*6379" 2>/dev/null || true

# Clean up temporary files
echo "Cleaning temporary files..."
rm -rf /tmp/personal-pipeline-*
rm -rf .cache/
rm -rf logs/*.log

# Kill processes using common ports
echo "Freeing up ports..."
npx kill-port 3000 2>/dev/null || true
npx kill-port 6379 2>/dev/null || true

# Clean up Docker containers (if any)
echo "Cleaning Docker containers..."
docker ps -a | grep personal-pipeline | awk '{print $1}' | xargs docker rm -f 2>/dev/null || true

echo "✅ Cleanup completed!"
```

### Verification Commands

```bash
# Check if server is still running
curl -f http://localhost:3000/api/health 2>/dev/null && echo "Server running" || echo "Server stopped"

# Check port status
netstat -tulpn | grep :3000 || echo "Port 3000 free"

# Check processes
ps aux | grep -v grep | grep personal-pipeline || echo "No Personal Pipeline processes"

# Check Redis
ps aux | grep -v grep | grep redis || echo "No Redis processes"
```

## Server Process Management

### Using systemd (Linux Production)

Create service file `/etc/systemd/system/personal-pipeline.service`:

```ini
[Unit]
Description=Personal Pipeline MCP Server
After=network.target
After=redis.service

[Service]
Type=simple
User=personal-pipeline
WorkingDirectory=/opt/personal-pipeline
ExecStart=/usr/bin/node dist/index.js
ExecStop=/bin/kill -SIGTERM $MAINPID
TimeoutStopSec=30
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=LOG_LEVEL=info
EnvironmentFile=-/opt/personal-pipeline/.env

# Security
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/personal-pipeline/logs

[Install]
WantedBy=multi-user.target
```

Management commands:

```bash
# Start service
sudo systemctl start personal-pipeline

# Stop service
sudo systemctl stop personal-pipeline

# Restart service
sudo systemctl restart personal-pipeline

# Enable auto-start on boot
sudo systemctl enable personal-pipeline

# Check status
sudo systemctl status personal-pipeline

# View logs
sudo journalctl -u personal-pipeline -f
```

### Using PM2 (Node.js Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name personal-pipeline

# Stop
pm2 stop personal-pipeline

# Restart
pm2 restart personal-pipeline

# Delete from PM2
pm2 delete personal-pipeline

# Monitor
pm2 monit

# View logs
pm2 logs personal-pipeline

# Save PM2 configuration
pm2 save

# Setup auto-startup
pm2 startup
```

PM2 ecosystem file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'personal-pipeline',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};

# Start with config
pm2 start ecosystem.config.js
```

## Docker Management

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  personal-pipeline:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    volumes:
      - ./config:/app/config:ro
      - ./logs:/app/logs
      
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Management commands:

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart specific service
docker-compose restart personal-pipeline

# View logs
docker-compose logs -f personal-pipeline

# Scale (if needed)
docker-compose up -d --scale personal-pipeline=2
```

## Health Monitoring

### Built-in Health Checks

```bash
# Check server health
npm run health

# Detailed health status
curl http://localhost:3000/api/health

# Performance metrics
curl http://localhost:3000/api/performance

# Source adapter status
curl http://localhost:3000/api/sources
```

### Health Dashboard

```bash
# Start real-time health dashboard
npm run health:dashboard

# Performance monitoring
npm run performance:monitor

# System monitoring status
npm run monitoring:status
```

### Custom Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

echo "🏥 Personal Pipeline Health Check"

# Check if server is responding
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ Server is healthy"
    
    # Get detailed health info
    HEALTH=$(curl -s http://localhost:3000/api/health | jq -r '.status')
    UPTIME=$(curl -s http://localhost:3000/api/health | jq -r '.metrics.uptime_seconds')
    
    echo "   Status: $HEALTH"
    echo "   Uptime: ${UPTIME}s"
else
    echo "❌ Server is not responding"
    exit 1
fi

# Check Redis connection (if configured)
if [[ -n "$REDIS_URL" ]]; then
    if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
        echo "✅ Redis is healthy"
    else
        echo "⚠️  Redis connection failed"
    fi
fi

# Check log errors (last 100 lines)
ERROR_COUNT=$(tail -100 logs/personal-pipeline.log 2>/dev/null | grep -c ERROR || echo 0)
if [[ $ERROR_COUNT -gt 0 ]]; then
    echo "⚠️  Found $ERROR_COUNT errors in recent logs"
else
    echo "✅ No recent errors in logs"
fi
```

## Troubleshooting Server Issues

### Common Problems and Solutions

#### Server Won't Start

```bash
# Check if port is already in use
netstat -tulpn | grep :3000

# Kill process using the port
npx kill-port 3000

# Check for configuration errors
npm run validate-config

# Start with debug logging
LOG_LEVEL=debug npm run dev
```

#### Server Won't Stop

```bash
# Find all related processes
ps aux | grep -E "(personal-pipeline|node.*src/index|tsx.*src/index)"

# Force kill all processes
pkill -9 -f "personal-pipeline"
pkill -9 -f "node.*src/index"
pkill -9 -f "tsx.*src/index"

# Check for zombie processes
ps aux | grep -E "(defunct|zombie)"
```

#### Memory Leaks

```bash
# Monitor memory usage
npm run performance:monitor

# Enable garbage collection logs
node --trace-gc dist/index.js

# Use heap profiler
node --inspect dist/index.js
```

#### Port Conflicts

```bash
# Find what's using the port
lsof -i :3000

# Kill specific process by PID
kill -SIGTERM [PID]

# Use different port
PORT=8080 npm run dev
```

#### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Test connection
npm run test:redis

# Start Redis if not running
redis-server --daemonize yes

# Or use Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Emergency Recovery Procedures

#### Complete Environment Reset

```bash
#!/bin/bash
echo "🚨 Emergency Recovery: Resetting Personal Pipeline Environment"

# Kill everything
pkill -9 -f "personal-pipeline" || true
pkill -9 -f "redis-server" || true
pkill -9 -f "node.*src/index" || true
pkill -9 -f "tsx" || true

# Free ports
npx kill-port 3000 || true
npx kill-port 6379 || true

# Clean build and cache
rm -rf dist/
rm -rf node_modules/.cache/
rm -rf logs/*.log

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Validate configuration
npm run validate-config

echo "✅ Environment reset complete. Try starting again."
```

#### Log Analysis for Issues

```bash
# View recent errors
grep -n "ERROR\|FATAL" logs/personal-pipeline.log | tail -20

# Monitor logs in real-time
tail -f logs/personal-pipeline.log | grep -E "(ERROR|WARN|FATAL)"

# Analyze startup issues
grep -A 10 -B 10 "startup\|initialization" logs/personal-pipeline.log

# Check for memory issues
grep -E "(memory|heap|gc)" logs/personal-pipeline.log
```

## Best Practices

### Development Workflow

```bash
# 1. Always check status before starting
npm run health 2>/dev/null && echo "Server already running" || echo "Ready to start"

# 2. Start in development mode
npm run dev

# 3. When finished, always cleanup
# Press Ctrl+C, then run:
npm run demo:stop
```

### Production Deployment

```bash
# 1. Build and test
npm run build
npm test

# 2. Start with process manager
pm2 start ecosystem.config.js

# 3. Verify deployment
npm run health

# 4. Monitor
pm2 monit
```

### Automated Management

Create startup script `scripts/start-server.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting Personal Pipeline Server"

# Check if already running
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "⚠️  Server already running"
    exit 1
fi

# Validate configuration
npm run validate-config

# Start server
if [[ "$NODE_ENV" == "production" ]]; then
    echo "Starting in production mode..."
    pm2 start ecosystem.config.js
else
    echo "Starting in development mode..."
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to be ready
    echo "Waiting for server to start..."
    for i in {1..30}; do
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            echo "✅ Server started successfully"
            exit 0
        fi
        sleep 1
    done
    
    echo "❌ Server failed to start within 30 seconds"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
```

Create shutdown script `scripts/stop-server.sh`:

```bash
#!/bin/bash
echo "🛑 Stopping Personal Pipeline Server"

if [[ "$NODE_ENV" == "production" ]]; then
    pm2 stop personal-pipeline
    pm2 delete personal-pipeline
else
    npm run demo:stop
fi

# Verify shutdown
sleep 2
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "⚠️  Server still running, force stopping..."
    pkill -f "personal-pipeline"
fi

echo "✅ Server stopped successfully"
```

Make scripts executable:

```bash
chmod +x scripts/start-server.sh
chmod +x scripts/stop-server.sh

# Use scripts
./scripts/start-server.sh
./scripts/stop-server.sh
```

## Quick Reference

### Essential Commands

| Action | Command |
|--------|---------|
| **Start Dev** | `npm run dev` |
| **Start Demo** | `npm run demo:start` |
| **Stop Demo** | `npm run demo:stop` |
| **Stop All** | `pkill -f "personal-pipeline"` |
| **Health Check** | `npm run health` |
| **Kill Port** | `npx kill-port 3000` |
| **Clean Logs** | `rm -rf logs/*.log` |
| **Emergency Stop** | `pkill -9 -f "node.*personal-pipeline"` |

### Port Reference

| Service | Default Port | Purpose |
|---------|-------------|---------|
| Personal Pipeline | 3000 | Main MCP server |
| Redis | 6379 | Caching (optional) |
| Health Dashboard | 3001 | Monitoring UI |
| Debug Inspector | 9229 | Node.js debugger |

Remember: **Always run `npm run demo:stop` when finished working to ensure proper cleanup!**