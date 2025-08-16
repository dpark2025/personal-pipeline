# ⚠️ DOCUMENTATION ARCHIVE STATUS ⚠️
## 🔒 **DEPRECATED - NO LONGER REFERENCED FOR CURRENT PROJECT**
**Status**: Historical/milestone documentation - reference only  
**Archive Date**: August 16, 2025  
**Reference**: This document is deprecated and should not be used for current development  

---


# Demo Environment Troubleshooting Guide

*Authored by: Integration Specialist (Barry)*  
*Date: 2025-07-29*

## Overview

This guide provides solutions for common issues encountered when setting up and running the Personal Pipeline MCP Server demo environment. The demo showcases all milestone 1.3 features including caching, performance monitoring, health checks, and load testing.

## Common Issues & Solutions

### 1. Demo Setup Failures

#### Issue: "Prerequisites check failed"
```bash
❌ Node.js version 16.x found, but version 18+ required.
```

**Solution:**
```bash
# Install Node.js 18+ using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node --version  # Should show v18.x.x

# Or update Node.js through your package manager
# macOS: brew install node@18
# Ubuntu: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
```

#### Issue: "npm install failed"
```bash
❌ Failed to install dependencies
```

**Solution:**
```bash
# Clear npm cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# If using a different Node.js version, rebuild native modules
npm rebuild

# Check for permission issues (avoid sudo)
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### 2. Server Startup Issues

#### Issue: "Port 3000 already in use"
```bash
❌ Server failed to start within 30 seconds
```

**Solution:**
```bash
# Check what's using port 3000
lsof -i :3000

# Kill existing process
kill $(lsof -ti:3000)

# Or use a different port
npm run demo:start -- --port 3001
```

#### Issue: "Server process died during startup"
```bash
❌ Server process died during startup
📋 Check server log: server-demo.log
```

**Solution:**
```bash
# Check server logs for specific error
tail -20 server-demo.log

# Common causes and fixes:
# 1. Missing build files
npm run build

# 2. Configuration file issues
cp config/config.sample.yaml config/config.yaml

# 3. Permission issues with log files
chmod 644 *.log

# 4. TypeScript compilation errors
npm run typecheck
```

### 3. Redis Connection Issues

#### Issue: "Redis setup failed"
```bash
⚠️ Redis server failed to start properly. Using memory-only mode.
```

**Solution:**
```bash
# Check if Redis is installed
redis-server --version

# Install Redis (macOS)
brew install redis

# Install Redis (Ubuntu)
sudo apt update
sudo apt install redis-server

# Start Redis manually
redis-server --port 6379 --daemonize yes

# Verify Redis is running
redis-cli ping  # Should return PONG

# Alternative: Use memory-only mode
npm run demo:start:memory-only
```

#### Issue: "Redis connection refused"
```bash
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Check Redis status
redis-cli ping

# Start Redis if not running
redis-server --port 6379 --daemonize yes

# Check Redis configuration
redis-cli config get bind
redis-cli config get port

# Reset Redis if corrupted
redis-server --port 6379 --flushall --daemonize yes

# Use alternative port if 6379 is occupied
npm run demo:start -- --redis-port 6380
```

### 4. Sample Data Issues

#### Issue: "Sample data generation failed"
```bash
❌ Failed to generate sample data
```

**Solution:**
```bash
# Run sample data generation manually
npm run generate-sample-data

# Check for disk space
df -h

# Verify test-data directory
ls -la test-data/
ls -la test-data/runbooks/
ls -la test-data/knowledge-base/

# Recreate if corrupted
rm -rf test-data/
npm run generate-sample-data

# Check permissions
chmod -R 755 test-data/
```

#### Issue: "Test data search not working"
```bash
❌ Sample data search failed
```

**Solution:**
```bash
# Verify sample data exists
ls test-data/runbooks/ | wc -l  # Should show ~15 files
ls test-data/knowledge-base/ | wc -l  # Should show ~60 files (.md + .meta.json)

# Test data manually
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "disk space", "type": "runbooks"}' | jq

# Check server logs for indexing errors
grep -i error server-demo.log

# Regenerate and restart
npm run generate-sample-data
npm run demo:stop
npm run demo:start
```

### 5. Performance & Health Check Issues

#### Issue: "Performance validation failed"
```bash
❌ FAIL: P95 response time: 1500ms (target: ≤500ms)
```

**Solution:**
```bash
# Check system resources
htop  # Look for high CPU/memory usage
df -h # Check disk space

# Clear cache and restart
curl -X POST http://localhost:3000/cache/clear
npm run performance:reset

# Reduce load and retry
pkill -f "load-test\|benchmark"
sleep 10
npm run demo:validate

# Check for competing processes
ps aux | grep -E "(node|npm|redis)" | grep -v grep

# System optimization
# Close unnecessary applications
# Increase available memory
# Check network connectivity
```

#### Issue: "Cache hit rate too low"
```bash
⚠️ Cache hit rate: 45% (target: ≥80%)
```

**Solution:**
```bash
# Warm cache properly
curl -X POST http://localhost:3000/cache/clear
sleep 5

# Run multiple queries for same data
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/search \
    -H "Content-Type: application/json" \
    -d '{"query": "disk space critical", "type": "runbooks"}'
  sleep 1
done

# Check cache health
curl http://localhost:3000/health/cache | jq

# Verify cache configuration
grep -A 20 "cache:" config/demo-config.yaml
```

### 6. Load Testing Issues

#### Issue: "Load test high error rate"
```bash
❌ FAIL: Error rate under load: 15% (target: ≤5%)
```

**Solution:**
```bash
# Check server resources during load
# In one terminal:
npm run health:dashboard:fast

# In another terminal:
npm run load-test:peak

# Reduce concurrent requests
npm run benchmark:quick  # Uses only 5 concurrent instead of 50

# Check for resource limits
ulimit -n  # File descriptor limit
ulimit -u  # Process limit

# Increase limits if needed (Linux/macOS)
ulimit -n 4096
ulimit -u 2048
```

#### Issue: "Circuit breakers triggering during demo"
```bash
🔴 cache: open (failures: 5/5)
```

**Solution:**
```bash
# Check circuit breaker status
curl http://localhost:3000/circuit-breakers | jq

# Wait for circuit breaker recovery (30 seconds default)
sleep 30
curl http://localhost:3000/circuit-breakers | jq

# Reset circuit breakers if needed
# (This would require server restart)
npm run demo:stop
sleep 5
npm run demo:start --no-benchmarks

# Check underlying service health
curl http://localhost:3000/health/detailed | jq
```

### 7. Monitoring & Dashboard Issues

#### Issue: "Health dashboard not updating"
```bash
# Dashboard shows stale data or errors
```

**Solution:**
```bash
# Check if monitoring service is running
ps aux | grep -E "health.*dashboard" | grep -v grep

# Restart health monitoring
pkill -f "health.*dashboard"
npm run health:dashboard:fast &

# Check monitoring endpoint directly
curl http://localhost:3000/monitoring/status | jq

# Verify monitoring configuration
curl http://localhost:3000/monitoring/rules | jq
```

#### Issue: "jq command not found"
```bash
jq: command not found
```

**Solution:**
```bash
# Install jq for JSON parsing
# macOS
brew install jq

# Ubuntu/Debian
sudo apt update && sudo apt install jq

# CentOS/RHEL
sudo yum install jq

# Alternative: Use python for JSON parsing
curl http://localhost:3000/health | python -m json.tool
```

### 8. Demo Walkthrough Issues

#### Issue: "Interactive demo not responding"
```bash
# Demo script hangs or shows errors
```

**Solution:**
```bash
# Check server connectivity
curl http://localhost:3000/health

# Run demo with timeout
timeout 300 npm run demo:walkthrough

# Skip problematic scenarios
# Edit scripts/demo-walkthrough.js to comment out failing scenarios

# Run validation instead
npm run demo:validate

# Manual testing
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "type": "runbooks"}' | jq
```

### 9. Cleanup Issues

#### Issue: "Demo won't stop completely"
```bash
⚠️ MCP Server: Still running
⚠️ Redis: Still running
```

**Solution:**
```bash
# Force stop all related processes
pkill -f "personal-pipeline\|pp-server\|redis-server\|health.*dashboard"

# Check for remaining processes
ps aux | grep -E "(node|redis)" | grep -v grep

# Kill by port if needed
kill $(lsof -ti:3000)  # Server port
kill $(lsof -ti:6379)  # Redis port

# Clean up files manually
rm -f server-demo.log redis-demo.log monitoring-demo.log
rm -f server.pid monitoring.pid

# Nuclear option: restart terminal/shell
```

## Environment-Specific Issues

### macOS Issues

#### Issue: "Permission denied" errors
```bash
# Fix common permission issues
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Use homebrew Node.js installation
brew uninstall node
brew install node@18
brew link node@18
```

#### Issue: "Command not found" after installation
```bash
# Add to shell profile
echo 'export PATH="/usr/local/opt/node@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Linux/Ubuntu Issues

#### Issue: "snap Node.js issues"
```bash
# Remove snap Node.js (often causes issues)
sudo snap remove node

# Install via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Windows/WSL Issues

#### Issue: "Redis not available on Windows"
```bash
# Use memory-only mode
npm run demo:start:memory-only

# Or install Redis on WSL
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

## Performance Optimization

### System Requirements
- **Minimum**: 4GB RAM, 2 CPU cores, 1GB disk space
- **Recommended**: 8GB RAM, 4 CPU cores, 2GB disk space
- **Node.js**: Version 18+ (latest LTS recommended)
- **Redis**: Version 6+ (optional, will fallback to memory-only)

### Performance Tuning
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Optimize Redis
redis-cli config set maxmemory 256mb
redis-cli config set maxmemory-policy allkeys-lre

# Monitor resource usage
npm run health:dashboard:fast &
npm run demo:validate
```

## Getting Help

### Diagnostic Information
```bash
# Collect diagnostic information
echo "=== System Information ===" > diagnostic.log
uname -a >> diagnostic.log
node --version >> diagnostic.log
npm --version >> diagnostic.log
redis-server --version >> diagnostic.log 2>&1 || echo "Redis not available" >> diagnostic.log

echo -e "\n=== Process Information ===" >> diagnostic.log
ps aux | grep -E "(node|redis)" | grep -v grep >> diagnostic.log

echo -e "\n=== Port Usage ===" >> diagnostic.log
lsof -i :3000 >> diagnostic.log 2>&1 || echo "Port 3000 not in use" >> diagnostic.log
lsof -i :6379 >> diagnostic.log 2>&1 || echo "Port 6379 not in use" >> diagnostic.log

echo -e "\n=== Recent Logs ===" >> diagnostic.log
tail -50 server-demo.log >> diagnostic.log 2>&1 || echo "No server log" >> diagnostic.log
tail -50 demo-setup.log >> diagnostic.log 2>&1 || echo "No setup log" >> diagnostic.log

# Share diagnostic.log when reporting issues
```

### Log Analysis
```bash
# Check for common error patterns
grep -i -E "(error|fail|timeout|refused)" *.log

# Monitor logs in real-time
tail -f server-demo.log &
tail -f demo-setup.log &
```

### Reset Everything
```bash
# Complete reset (nuclear option)
npm run demo:stop:clean
pkill -f "personal-pipeline\|pp-server\|redis-server\|health.*dashboard"
rm -rf node_modules test-data config/demo-config.yaml
rm -f *.log *.pid
npm install
npm run demo:start
```

## Contact & Support

If issues persist after trying these solutions:

1. **Check Logs**: Always examine `demo-setup.log`, `server-demo.log`, and `redis-demo.log`
2. **Collect Diagnostics**: Run the diagnostic information collection script above
3. **Review Configuration**: Verify `config/demo-config.yaml` matches expected format
4. **System Resources**: Ensure adequate RAM, CPU, and disk space
5. **Network Connectivity**: Test local network connectivity and DNS resolution

For additional help, refer to the main project documentation or create an issue with:
- Operating system and version
- Node.js and npm versions  
- Complete error messages
- Diagnostic log output
- Steps to reproduce the issue

The demo environment is designed to be robust and self-healing, but complex systems can encounter edge cases. Most issues are resolved by clearing cache, restarting components, or running setup again with different options.