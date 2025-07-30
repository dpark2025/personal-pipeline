# Redis Quick Reference for Personal Pipeline

Quick reference guide for common Redis operations and troubleshooting commands when working with Personal Pipeline.

## Quick Setup Commands

### Install Redis (Platform-Specific)

```bash
# macOS (Homebrew)
brew install redis && brew services start redis

# Ubuntu/Debian
sudo apt install redis-server && sudo systemctl start redis-server

# Docker (Quick Start)
docker run -d --name redis-pp -p 6379:6379 redis:7-alpine

# Verify Installation
redis-cli ping  # Expected: PONG
```

## Personal Pipeline Integration

### Check Cache Status

```bash
# Overall cache health
npm run health:cache

# Detailed cache information
curl http://localhost:3000/health/cache | jq '.'

# Quick cache status check
curl -s http://localhost:3000/health/cache | jq '.cache.redis_connected'
```

### Performance Monitoring

```bash
# Monitor cache performance
npm run performance:monitor

# Check cache hit rates
curl -s http://localhost:3000/health/cache | jq '.cache.stats.hit_rate'

# View cache statistics
curl -s http://localhost:3000/health/cache | jq '.cache.stats'
```

## Redis CLI Commands

### Connection and Basic Operations

```bash
# Connect to Redis
redis-cli

# Test connection
redis-cli ping

# Connect to specific host/port
redis-cli -h localhost -p 6379

# Connect with authentication
redis-cli -a your_password
```

### Monitoring Personal Pipeline Cache

```bash
# List all Personal Pipeline cache keys
redis-cli keys "pp:cache:*"

# Count cached items
redis-cli eval "return #redis.call('keys', 'pp:cache:*')" 0

# View specific cache entry
redis-cli get "pp:cache:runbooks:disk_space"

# Monitor Redis commands in real-time
redis-cli monitor

# View cache TTL
redis-cli ttl "pp:cache:runbooks:disk_space"
```

### Performance Analysis

```bash
# Server information
redis-cli info server

# Memory usage
redis-cli info memory

# Client connections
redis-cli info clients

# Statistics
redis-cli info stats

# Latency monitoring
redis-cli --latency -h localhost -p 6379
```

## Troubleshooting Commands

### Connection Issues

```bash
# Test Redis connectivity
redis-cli ping
# Expected: PONG

# Check if Redis is running
sudo systemctl status redis         # Linux
brew services list | grep redis     # macOS
docker ps | grep redis             # Docker

# Test network connectivity
telnet localhost 6379
# or
nc -zv localhost 6379
```

### Performance Issues

```bash
# Check memory usage
redis-cli info memory | grep used_memory_human

# Monitor slow queries (>10ms)
redis-cli config set slowlog-log-slower-than 10000
redis-cli slowlog get 10

# Check for memory pressure
redis-cli info memory | grep maxmemory
```

### Cache Management

```bash
# Clear Personal Pipeline cache (careful!)
redis-cli del $(redis-cli keys "pp:cache:*")

# Clear specific content type
redis-cli del $(redis-cli keys "pp:cache:runbooks:*")

# Check cache size
redis-cli eval "return #redis.call('keys', 'pp:cache:*')" 0

# View cache expiration times
redis-cli keys "pp:cache:*" | xargs -I {} redis-cli ttl {}
```

## Configuration Quick Fixes

### Enable/Disable Redis in Personal Pipeline

```yaml
# In config/config.yaml
cache:
  redis:
    enabled: true    # Set to false to disable Redis
```

### Common Configuration Issues

```bash
# Check current Redis configuration
redis-cli config get "*"

# Set password (if needed)
redis-cli config set requirepass your_password

# Set memory limit
redis-cli config set maxmemory 256mb
redis-cli config set maxmemory-policy allkeys-lru
```

## Health Check Scripts

### Quick Health Check

```bash
#!/bin/bash
# health-check.sh

echo "=== Personal Pipeline Cache Health ==="
echo -n "Redis Connection: "
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "❌ Failed"
fi

echo -n "Personal Pipeline Cache: "
CACHE_STATUS=$(curl -s http://localhost:3000/health/cache | jq -r '.cache.redis_connected // false')
if [ "$CACHE_STATUS" = "true" ]; then
    echo "✅ Hybrid Mode"
else
    echo "⚠️  Memory-Only Mode"
fi

echo -n "Cache Hit Rate: "
HIT_RATE=$(curl -s http://localhost:3000/health/cache | jq -r '.cache.stats.hit_rate // 0')
echo "${HIT_RATE}%"
```

### Performance Check

```bash
#!/bin/bash
# performance-check.sh

echo "=== Redis Performance Check ==="
echo "Memory Usage:"
redis-cli info memory | grep -E "(used_memory_human|maxmemory_human)"

echo -e "\nConnected Clients:"
redis-cli info clients | grep connected_clients

echo -e "\nCache Keys:"
redis-cli eval "return #redis.call('keys', 'pp:cache:*')" 0

echo -e "\nPersonal Pipeline Performance:"
curl -s http://localhost:3000/performance | jq '.cache'
```

## Development Workflows

### Starting Development with Redis

```bash
# Full setup with Redis
redis-cli ping                    # Verify Redis
cp config/config.sample.yaml config/config.yaml
npm install
npm run dev

# Check cache mode
npm run health:cache | jq '.cache.strategy'
# Expected: "hybrid"
```

### Development without Redis

```bash
# Works automatically - no Redis setup needed
npm install
npm run dev

# Check fallback mode
npm run health:cache | jq '.cache.strategy'
# Expected: "memory_only" or "hybrid" with redis_connected: false
```

### Demo Environment Setup

```bash
# Demo with Redis (recommended)
npm run demo:setup

# Demo without Redis
npm run demo:setup:memory-only

# Validate demo performance
npm run demo:validate
```

## Emergency Procedures

### Redis Service Issues

```bash
# Restart Redis service
sudo systemctl restart redis-server    # Linux
brew services restart redis           # macOS
docker restart redis-pp              # Docker
```

### Clear Problematic Cache

```bash
# Nuclear option - clear all cache (use carefully!)
redis-cli flushdb

# Surgical option - clear specific problematic keys
redis-cli del "pp:cache:problematic_key"

# Restart Personal Pipeline to rebuild cache
npm run health  # Stop if running
npm start       # Restart
```

### Memory Issues

```bash
# Check Redis memory usage
redis-cli info memory | grep used_memory_human

# Set emergency memory limit
redis-cli config set maxmemory 128mb
redis-cli config set maxmemory-policy allkeys-lru

# Clear expired keys manually
redis-cli eval "for i=1,1000 do redis.call('randomkey') end" 0
```

## Monitoring Automation

### Simple Monitoring Script

```bash
#!/bin/bash
# redis-monitor.sh

while true; do
    clear
    echo "=== Redis Monitor ($(date)) ==="
    echo "Status: $(redis-cli ping 2>/dev/null || echo 'DISCONNECTED')"
    echo "Memory: $(redis-cli info memory | grep used_memory_human | cut -d: -f2)"
    echo "Keys: $(redis-cli eval "return #redis.call('keys', 'pp:cache:*')" 0 2>/dev/null || echo '0')"
    echo "Hit Rate: $(curl -s http://localhost:3000/health/cache | jq -r '.cache.stats.hit_rate // "N/A"')%"
    echo ""
    echo "Press Ctrl+C to exit"
    sleep 5
done
```

### Health Check Cron Job

```bash
# Add to crontab (crontab -e)
# Check cache health every 5 minutes
*/5 * * * * /path/to/your/health-check.sh >> /var/log/pp-cache-health.log 2>&1
```

## Common Use Cases

### Development Testing

```bash
# Test with cold cache
redis-cli flushdb
curl http://localhost:3000/tools/search_runbooks

# Test cache warming
npm restart
curl http://localhost:3000/health/cache | jq '.cache.stats'
```

### Performance Optimization

```bash
# Monitor cache performance during load
redis-cli monitor &
npm run benchmark:quick
kill %1  # Stop monitoring
```

### Debugging Cache Issues

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Monitor specific cache keys
redis-cli monitor | grep "pp:cache"

# Check cache consistency
npm run test-mcp -- --tool search_runbooks
```

## Getting Help

### When Redis Issues Occur

1. **Check Redis Status**: `redis-cli ping`
2. **Check Personal Pipeline Health**: `npm run health:cache`
3. **Review Logs**: `tail -f logs/app.log | grep -i redis`
4. **Check Configuration**: `cat config/config.yaml | grep -A 20 redis`

### Support Resources

- **Redis Documentation**: https://redis.io/documentation
- **Personal Pipeline Issues**: GitHub issue tracker
- **Configuration Guide**: [CACHING-STRATEGIES.md](CACHING-STRATEGIES.md)
- **Setup Guide**: [REDIS-SETUP.md](REDIS-SETUP.md)

### Emergency Contacts

```bash
# System works without Redis - automatic fallback
# If Redis issues persist, disable temporarily:
# In config/config.yaml:
# redis:
#   enabled: false
```

---

**Remember**: Personal Pipeline gracefully handles Redis outages by automatically falling back to memory-only mode. Redis is optional but recommended for optimal performance.