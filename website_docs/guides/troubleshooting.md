# Troubleshooting Guide

Comprehensive troubleshooting guide for Personal Pipeline, covering common issues, debugging techniques, and solutions.

## Quick Problem Resolution

### 🚨 Emergency Fixes

| Problem | Quick Fix | Command |
|---------|-----------|---------|
| **Server won't start** | Kill processes using port | `npx kill-port 3000` |
| **Server won't stop** | Force kill all processes | `pkill -f "personal-pipeline"` |
| **Port already in use** | Find and kill process | `lsof -i :3000` |
| **Redis connection failed** | Check/start Redis | `redis-cli ping` |
| **Memory issues** | Increase Node.js memory | `export NODE_OPTIONS="--max-old-space-size=4096"` |
| **Process cleanup** | Complete environment reset | `npm run demo:stop` |

## Server Management Issues

### Server Won't Start

#### Symptoms
- Error: `EADDRINUSE` (port already in use)
- Server exits immediately
- Configuration validation errors

#### Diagnosis
```bash
# Check if port is already in use
netstat -tulpn | grep :3000
lsof -i :3000

# Check for existing Personal Pipeline processes
ps aux | grep personal-pipeline

# Validate configuration
npm run validate-config
```

#### Solutions
```bash
# Solution 1: Kill process using the port
npx kill-port 3000

# Solution 2: Use different port
PORT=8080 npm run dev

# Solution 3: Kill all Personal Pipeline processes
pkill -f "node.*personal-pipeline"
pkill -f "tsx.*src/index"

# Solution 4: Fix configuration errors
cp config/config.sample.yaml config/config.yaml
npm run validate-config
```

### Server Won't Stop

#### Symptoms
- Ctrl+C doesn't stop the server
- Process continues running after terminal close
- Multiple instances running simultaneously

#### Diagnosis
```bash
# Find all related processes
ps aux | grep -E "(personal-pipeline|node.*src/index|tsx.*src/index)"

# Check for zombie processes
ps aux | grep -E "(defunct|zombie)"

# Check port usage
netstat -tulpn | grep :3000
```

#### Solutions
```bash
# Solution 1: Use demo stop command
npm run demo:stop

# Solution 2: Graceful shutdown by PID
kill -SIGTERM [PID]

# Solution 3: Force kill all processes
pkill -9 -f "personal-pipeline"
pkill -9 -f "node.*src/index"
pkill -9 -f "tsx.*src/index"

# Solution 4: Complete cleanup script
./scripts/cleanup-environment.sh
```

### Process Accumulation

#### Symptoms
- Multiple server instances running
- Increasing memory usage over time
- Port conflicts on restart

#### Diagnosis
```bash
# Count Personal Pipeline processes
ps aux | grep personal-pipeline | grep -v grep | wc -l

# Check memory usage
ps aux --sort=-%mem | grep personal-pipeline

# Monitor process creation
watch "ps aux | grep personal-pipeline | grep -v grep"
```

#### Solutions
```bash
# Solution 1: Implement proper cleanup workflow
npm run demo:stop  # Always run when finished

# Solution 2: Automated cleanup script
cat > scripts/cleanup-all.sh << 'EOF'
#!/bin/bash
pkill -f "personal-pipeline" 2>/dev/null || true
pkill -f "redis-server.*6379" 2>/dev/null || true
npx kill-port 3000 2>/dev/null || true
npx kill-port 6379 2>/dev/null || true
echo "✅ All processes cleaned up"
EOF

chmod +x scripts/cleanup-all.sh
./scripts/cleanup-all.sh
```

## Configuration Issues

### Invalid Configuration

#### Symptoms
- Server fails to start with validation errors
- "Config file not found" errors
- YAML parsing errors

#### Diagnosis
```bash
# Validate configuration syntax
npm run validate-config

# Check configuration file existence
ls -la config/config.yaml

# Validate YAML syntax
npx js-yaml config/config.yaml
```

#### Solutions
```bash
# Solution 1: Create from template
cp config/config.sample.yaml config/config.yaml

# Solution 2: Fix YAML syntax errors
# Common issues:
# - Incorrect indentation (use spaces, not tabs)
# - Missing quotes around special characters
# - Invalid boolean values (use true/false, not yes/no)

# Solution 3: Validate and fix
npm run validate-config -- --fix
```

### Source Adapter Configuration

#### Symptoms
- "Source adapter failed to initialize" errors
- Empty search results
- Adapter health check failures

#### Diagnosis
```bash
# Check source adapter status
curl http://localhost:3000/api/sources

# Test individual source
curl http://localhost:3000/api/health
```

#### Solutions
```yaml
# Fix common configuration issues
sources:
  - name: "local-docs"
    type: "file"
    base_url: "./docs"  # Ensure path exists and is readable
    recursive: true
    supported_extensions: ['.md', '.txt', '.json']
    
  - name: "web-api"
    type: "web"
    base_url: "https://api.example.com"
    auth:
      type: "bearer_token"
      token_env: "API_TOKEN"  # Ensure environment variable is set
```

## Performance Issues

### Slow Response Times

#### Symptoms
- Search operations taking >500ms
- API requests timing out
- High CPU/memory usage

#### Diagnosis
```bash
# Performance monitoring
npm run performance:monitor

# Benchmark specific operations
npm run benchmark

# Check system resources
htop  # or top
free -h
df -h
```

#### Solutions
```bash
# Solution 1: Enable Redis caching
export REDIS_URL="redis://localhost:6379"
redis-server --daemonize yes
npm restart

# Solution 2: Optimize memory settings
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"

# Solution 3: Reduce concurrent operations
# In config/config.yaml:
performance:
  concurrent_searches: 5  # Reduce from default 10
  timeout_ms: 3000        # Reduce timeout
```

### Memory Leaks

#### Symptoms
- Continuously increasing memory usage
- Out of memory errors
- Slow performance over time

#### Diagnosis
```bash
# Monitor memory usage
node --inspect src/index.ts
# Open chrome://inspect in Chrome

# Enable garbage collection logs
node --trace-gc src/index.ts

# Memory profiling
npm run benchmark -- --profile-memory
```

#### Solutions
```bash
# Solution 1: Increase memory limit temporarily
export NODE_OPTIONS="--max-old-space-size=8192"

# Solution 2: Fix memory leaks in code
# - Ensure proper cleanup in adapters
# - Clear cache periodically
# - Remove event listeners

# Solution 3: Restart server periodically
# Add to crontab for production:
# 0 2 * * * cd /path/to/personal-pipeline && npm run restart
```

## Redis Connection Issues

### Redis Connection Failed

#### Symptoms
- "Redis connection refused" errors
- Fallback to memory-only mode
- Cache performance degradation

#### Diagnosis
```bash
# Check Redis status
redis-cli ping

# Check Redis connection
redis-cli -h localhost -p 6379 ping

# Check if Redis is running
ps aux | grep redis-server

# Test connection with URL
redis-cli -u "$REDIS_URL" ping
```

#### Solutions
```bash
# Solution 1: Start Redis server
# macOS (Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis

# Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Solution 2: Check Redis configuration
redis-cli CONFIG GET "*"

# Solution 3: Use different Redis URL
export REDIS_URL="redis://localhost:6379/1"  # Use database 1

# Solution 4: Disable Redis (use memory-only)
unset REDIS_URL
npm restart
```

### Redis Memory Issues

#### Symptoms
- Redis out of memory errors
- Slow cache operations
- Cache evictions

#### Diagnosis
```bash
# Check Redis memory usage
redis-cli INFO memory

# Check Redis configuration
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy
```

#### Solutions
```bash
# Solution 1: Increase Redis memory limit
redis-cli CONFIG SET maxmemory 256mb

# Solution 2: Configure eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Solution 3: Clear Redis cache
redis-cli FLUSHALL

# Solution 4: Optimize cache TTL
# In config/config.yaml:
cache:
  ttl: 300  # Reduce from default
  max_memory_items: 500  # Reduce cache size
```

## Development Issues

### Build Failures

#### Symptoms
- TypeScript compilation errors
- Missing dependencies
- Import/export errors

#### Diagnosis
```bash
# Check TypeScript compilation
npm run typecheck

# Check for missing dependencies
npm audit

# Verify imports
npm run lint
```

#### Solutions
```bash
# Solution 1: Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build

# Solution 2: Fix TypeScript errors
npm run typecheck -- --listFiles

# Solution 3: Update dependencies
npm update
npm audit fix
```

### Test Failures

#### Symptoms
- Unit tests failing
- Integration tests timing out
- Coverage below threshold

#### Diagnosis
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific failing test
npm test -- tests/unit/specific-test.test.ts

# Check test coverage
npm run test:coverage
```

#### Solutions
```bash
# Solution 1: Update test snapshots
npm test -- --updateSnapshot

# Solution 2: Increase test timeouts
# In jest.config.js:
testTimeout: 10000  # Increase from 5000

# Solution 3: Fix flaky tests
# Use proper async/await patterns
# Add proper cleanup in afterEach

# Solution 4: Mock external dependencies
jest.mock('external-dependency')
```

### Hot Reload Issues

#### Symptoms
- Changes not reflected immediately
- Server not restarting on file changes
- Build errors on save

#### Diagnosis
```bash
# Check file watcher limits (Linux)
cat /proc/sys/fs/inotify/max_user_watches

# Check tsx process
ps aux | grep tsx
```

#### Solutions
```bash
# Solution 1: Increase file watcher limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Solution 2: Restart development server
# Press Ctrl+C and run:
npm run dev

# Solution 3: Clear TypeScript cache
rm -rf .tsbuildinfo
rm -rf dist/
```

## Network and API Issues

### API Endpoint Errors

#### Symptoms
- 404 Not Found errors
- 500 Internal Server Error
- Request timeouts

#### Diagnosis
```bash
# Test API endpoints directly
curl -v http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d '{"query": "test"}'

# Check server logs
tail -f logs/personal-pipeline.log

# Test with different tools
npx newman run api-tests.postman_collection.json
```

#### Solutions
```bash
# Solution 1: Check API documentation
# Verify correct endpoint URLs and HTTP methods

# Solution 2: Validate request format
# Use proper JSON content-type headers
# Check required vs optional parameters

# Solution 3: Increase timeout
# In client code:
const response = await fetch(url, {
  timeout: 10000  // 10 seconds
});
```

### CORS Issues

#### Symptoms
- Browser CORS errors
- Cross-origin request blocked
- Preflight request failures

#### Diagnosis
```bash
# Check CORS headers
curl -H "Origin: http://localhost:8080" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3000/api/search
```

#### Solutions
```yaml
# Update CORS configuration in config/config.yaml
server:
  cors_origins: 
    - "http://localhost:8080"
    - "https://yourdomain.com"
  cors_methods: ["GET", "POST", "PUT", "DELETE"]
  cors_headers: ["Content-Type", "Authorization"]
```

## Integration Issues

### MCP Client Connection

#### Symptoms
- MCP client can't connect to server
- Tool execution failures
- Protocol version mismatches

#### Diagnosis
```bash
# Test MCP connection
npm run mcp-explorer

# Check MCP protocol version
npm list @modelcontextprotocol/sdk
```

#### Solutions
```bash
# Solution 1: Update MCP SDK
npm update @modelcontextprotocol/sdk

# Solution 2: Check connection parameters
# Ensure correct server URL and port

# Solution 3: Test with CLI
npm run test-mcp
```

### LangGraph Integration

#### Symptoms
- LangGraph agent can't access tools
- Tool schema validation errors
- Response format issues

#### Diagnosis
```bash
# Validate tool schemas
npm run validate-tools

# Test tool execution
npm run mcp-explorer
```

#### Solutions
```python
# Update LangGraph integration
from langchain.tools import Tool

# Ensure proper tool registration
tools = [
    Tool(
        name="search_runbooks",
        description="Search operational runbooks",
        func=lambda **kwargs: mcp_client.call_tool("search_runbooks", kwargs)
    )
]
```

## Debugging Techniques

### Logging and Monitoring

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Filter logs by component
tail -f logs/personal-pipeline.log | grep "SearchEngine"

# Monitor API requests
tail -f logs/personal-pipeline.log | grep "REQUEST"

# Watch for errors
tail -f logs/personal-pipeline.log | grep -E "(ERROR|FATAL)"
```

### Performance Profiling

```bash
# CPU profiling
node --prof src/index.ts
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect src/index.ts
# Open chrome://inspect

# Benchmark specific operations
npm run benchmark -- --operation search_runbooks

# Load testing
npm run load-test -- --concurrent 10 --duration 60
```

### Network Debugging

```bash
# Monitor network traffic
netstat -tupln | grep :3000

# Check connection count
ss -tn state established | grep :3000 | wc -l

# Test with curl
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health
```

## Prevention Strategies

### Development Best Practices

1. **Always use cleanup commands**:
   ```bash
   # When finished working:
   npm run demo:stop
   ```

2. **Regular health checks**:
   ```bash
   # Before starting work:
   npm run health
   ```

3. **Proper error handling**:
   ```typescript
   try {
     await operation();
   } catch (error) {
     logger.error('Operation failed', { error });
     throw error;
   }
   ```

### Monitoring Setup

```bash
# Setup health monitoring
npm run health:dashboard &

# Setup log monitoring
tail -f logs/personal-pipeline.log | grep ERROR &

# Setup performance monitoring
npm run performance:monitor &
```

### Automated Recovery

```bash
# Create auto-recovery script
cat > scripts/auto-recover.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Server unhealthy, attempting recovery..."
    npm run demo:stop
    sleep 5
    npm run demo:start
fi
EOF

# Add to crontab for production
# */5 * * * * /path/to/personal-pipeline/scripts/auto-recover.sh
```

## Getting Help

### Internal Resources

- **Health Dashboard**: `npm run health:dashboard`
- **Performance Monitor**: `npm run performance:monitor`
- **MCP Explorer**: `npm run mcp-explorer`
- **Log Analysis**: Check `logs/personal-pipeline.log`

### External Resources

- **GitHub Issues**: Report bugs and get help
- **Documentation**: Check `docs/` directory
- **Community**: GitHub Discussions for questions

### Diagnostic Information

When reporting issues, include:

```bash
# System information
node --version
npm --version
redis-cli --version  # if using Redis

# Server status
npm run health

# Recent logs
tail -50 logs/personal-pipeline.log

# Configuration (sanitized)
cat config/config.yaml | grep -v password | grep -v token
```

Remember: Most issues can be resolved by proper server lifecycle management. Always run `npm run demo:stop` when finished working to prevent common problems!