# Server Management Guide

Complete guide for starting, stopping, and managing Personal Pipeline server instances across different deployment scenarios.

## Quick Reference

⚠️ **CRITICAL**: Always run cleanup commands when finished to prevent resource conflicts!

| Action | Command | Purpose |
|--------|---------|---------|
| **Start Dev** | `npm run dev` | Development with hot reload |
| **Start Demo** | `npm run demo:start` | Complete demo environment |
| **Stop Demo** | `npm run demo:stop` | Clean shutdown with cleanup |
| **Force Stop** | `pkill -f "personal-pipeline"` | Emergency stop all processes |
| **Health Check** | `npm run health` | Verify server status |
| **Kill Port** | `npx kill-port 3000` | Free up port 3000 |

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

### 🚨 **CRITICAL**: Always Stop Services When Done

Personal Pipeline creates background processes that need proper cleanup. **Always stop services** when finished working to prevent resource leaks and port conflicts.

### Quick Stop Methods

```bash
# Method 1: Stop demo environment (RECOMMENDED)
npm run demo:stop

# Method 2: Kill all Personal Pipeline processes
pkill -f "node.*personal-pipeline"

# Method 3: Kill Redis if started by demo
pkill -f "redis-server.*6379"

# Method 4: Kill specific port (if known)
npx kill-port 3000
npx kill-port 6379
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

## Complete Cleanup Procedures

### Emergency Cleanup Script

```bash
#!/bin/bash
echo "🧹 Emergency cleanup for Personal Pipeline..."

# Stop demo environment
npm run demo:stop 2>/dev/null || true

# Kill any remaining processes
pkill -f "node.*personal-pipeline" 2>/dev/null || true
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
pkill -f "redis-server.*6379" 2>/dev/null || true

# Clean up ports
npx kill-port 3000 2>/dev/null || true
npx kill-port 6379 2>/dev/null || true

# Clean temporary files
rm -rf /tmp/personal-pipeline-*
rm -rf logs/*.log

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
```

## Production Deployment

### Using systemd (Linux)

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

# Environment
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=LOG_LEVEL=info
EnvironmentFile=-/opt/personal-pipeline/.env

[Install]
WantedBy=multi-user.target
```

Management commands:

```bash
# Start service
sudo systemctl start personal-pipeline

# Stop service
sudo systemctl stop personal-pipeline

# Enable auto-start on boot
sudo systemctl enable personal-pipeline

# Check status
sudo systemctl status personal-pipeline
```

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name personal-pipeline

# Stop
pm2 stop personal-pipeline

# Restart
pm2 restart personal-pipeline

# Monitor
pm2 monit

# Setup auto-startup
pm2 startup
pm2 save
```

### Using Docker

```yaml
# docker-compose.yml
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
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

Commands:

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f personal-pipeline
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

## Troubleshooting Server Issues

### Common Problems

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

#### Memory Issues

```bash
# Monitor memory usage
npm run performance:monitor

# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection logs
node --trace-gc dist/index.js
```

### Log Analysis

```bash
# View recent errors
grep -n "ERROR\|FATAL" logs/personal-pipeline.log | tail -20

# Monitor logs in real-time
tail -f logs/personal-pipeline.log | grep -E "(ERROR|WARN|FATAL)"

# Analyze startup issues
grep -A 10 -B 10 "startup\|initialization" logs/personal-pipeline.log
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

### Production Workflow

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

### Automated Scripts

Create `scripts/start-server.sh`:

```bash
#!/bin/bash
echo "🚀 Starting Personal Pipeline Server"

# Check if already running
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "⚠️ Server already running"
    exit 1
fi

# Start server based on environment
if [[ "$NODE_ENV" == "production" ]]; then
    pm2 start ecosystem.config.js
else
    npm run dev &
fi

echo "✅ Server started successfully"
```

Create `scripts/stop-server.sh`:

```bash
#!/bin/bash
echo "🛑 Stopping Personal Pipeline Server"

# Stop based on environment
if [[ "$NODE_ENV" == "production" ]]; then
    pm2 stop personal-pipeline
else
    npm run demo:stop
fi

echo "✅ Server stopped successfully"
```

## Port Reference

| Service | Default Port | Purpose |
|---------|-------------|---------|
| Personal Pipeline | 3000 | Main MCP server |
| Redis | 6379 | Caching (optional) |
| Health Dashboard | 3001 | Monitoring UI |
| Debug Inspector | 9229 | Node.js debugger |

## Final Reminders

🚨 **ALWAYS remember to stop services when finished:**

```bash
# The golden rule - run this when you're done
npm run demo:stop
```

This prevents:
- Port conflicts in future sessions
- Resource leaks and memory issues
- Redis connection problems
- Process accumulation

Following proper server lifecycle management ensures a smooth development experience and prevents common issues that can waste hours of debugging time.