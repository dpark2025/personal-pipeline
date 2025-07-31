# Redis Setup Guide for Personal Pipeline

This guide provides comprehensive instructions for setting up Redis as an optional but recommended external dependency for the Personal Pipeline MCP server.

## Overview

Personal Pipeline uses a **hybrid caching strategy** that combines in-memory caching with optional Redis persistence. Redis is **not required** for the system to function, but provides significant performance and operational benefits.

### Caching Strategy Comparison

| Feature | Memory-Only Mode | Hybrid Mode (Redis) |
|---------|------------------|---------------------|
| **Setup Complexity** | Minimal | Moderate |
| **Cache Persistence** | ❌ No | ✅ Yes |
| **Performance** | Fast (first load) | Fastest (cached) |
| **Memory Usage** | Higher | Lower |
| **Restart Behavior** | Cold cache | Warm cache |
| **Multi-Instance** | Independent | Shared cache |
| **Production Ready** | ✅ Yes | ✅ Recommended |

## Installation Instructions

### macOS

#### Option 1: Homebrew (Recommended)

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Verify installation
redis-cli ping
# Expected output: PONG
```

#### Option 2: Redis Stack (Includes Redis Plus modules)

```bash
# Install Redis Stack
brew tap redis-stack/redis-stack
brew install redis-stack

# Start Redis Stack
brew services start redis-stack-server

# Verify installation
redis-cli ping
```

### Linux (Ubuntu/Debian)

#### Option 1: APT Package Manager

```bash
# Update package index
sudo apt update

# Install Redis
sudo apt install redis-server

# Start and enable Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
redis-cli ping
# Expected output: PONG
```

#### Option 2: Official Redis Repository

```bash
# Add Redis GPG key
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

# Add Redis repository
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# Update package list and install
sudo apt-get update
sudo apt-get install redis

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Linux (RHEL/CentOS/Fedora)

#### Using DNF/YUM

```bash
# Install EPEL repository (RHEL/CentOS)
sudo dnf install epel-release  # or: sudo yum install epel-release

# Install Redis
sudo dnf install redis  # or: sudo yum install redis

# Start and enable Redis service
sudo systemctl start redis
sudo systemctl enable redis

# Verify installation
redis-cli ping
```

### Windows (WSL Recommended)

#### Option 1: Windows Subsystem for Linux (Recommended)

```bash
# Install WSL2 and Ubuntu
# Follow the Ubuntu installation instructions above

# Or use Windows Package Manager
winget install Redis.Redis
```

#### Option 2: Native Windows Installation

1. Download Redis from [releases page](https://github.com/microsoftarchive/redis/releases)
2. Extract and run `redis-server.exe`
3. Verify with `redis-cli.exe ping`

### Docker (Cross-Platform)

#### Quick Start

```bash
# Run Redis in Docker
docker run -d \
  --name redis-pp \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes

# Verify installation
docker exec redis-pp redis-cli ping
# Expected output: PONG
```

#### Docker Compose (Recommended for Development)

Create `docker-compose.redis.yml`:

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    container_name: redis-pp
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  redis-data:
```

```bash
# Start Redis with Docker Compose
docker-compose -f docker-compose.redis.yml up -d

# Check status
docker-compose -f docker-compose.redis.yml ps

# Stop Redis
docker-compose -f docker-compose.redis.yml down
```

## Configuration

### Personal Pipeline Configuration

Personal Pipeline automatically detects Redis and requires no configuration changes. However, you can customize Redis settings in `config/config.yaml`:

```yaml
cache:
  enabled: true
  strategy: hybrid  # Options: hybrid, memory_only
  memory:
    max_keys: 1000
    ttl_seconds: 3600
    check_period_seconds: 600
  redis:
    enabled: true  # Set to false to disable Redis
    url: redis://localhost:6379  # Default Redis URL
    ttl_seconds: 7200
    key_prefix: 'pp:cache:'
    connection_timeout_ms: 5000
    retry_attempts: 3
    retry_delay_ms: 2000
    max_retry_delay_ms: 120000
    backoff_multiplier: 2.5
    connection_retry_limit: 5
```

### Redis Server Configuration (Optional)

For production deployments, consider customizing Redis configuration:

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf  # Linux
# or
brew --prefix redis  # macOS - check installation path
```

Key settings to consider:

```conf
# Memory usage
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your_secure_password  # Set a password
bind 127.0.0.1  # Restrict to localhost

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

## Verification and Testing

### Basic Connection Test

```bash
# Test Redis connection
redis-cli ping
# Expected: PONG

# Test with Personal Pipeline
curl -s http://localhost:3000/health/cache | jq '.'
```

### Performance Verification

```bash
# Start Personal Pipeline
npm start

# Check cache status
npm run health:cache

# Expected output:
{
  "cache": {
    "enabled": true,
    "strategy": "hybrid",
    "redis_connected": true,
    "memory_stats": {...},
    "redis_stats": {...}
  }
}
```

### Load Testing with Redis

```bash
# Run benchmark with Redis enabled
npm run benchmark:quick

# Check cache performance
npm run performance:validate
```

## Troubleshooting

### Common Issues

#### Redis Connection Failed

**Symptoms**:
- Warning logs: "Redis connection failed, falling back to memory-only mode"
- Cache status shows `redis_connected: false`

**Solutions**:

1. **Check Redis is running**
   ```bash
   # Linux/macOS
   sudo systemctl status redis  # or redis-server
   
   # macOS with Homebrew
   brew services list | grep redis
   
   # Docker
   docker ps | grep redis
   ```

2. **Verify connection**
   ```bash
   redis-cli ping
   # If this fails, Redis is not running or not accessible
   ```

3. **Check firewall/network**
   ```bash
   # Test connection on specific port
   telnet localhost 6379
   # or
   nc -zv localhost 6379
   ```

#### Permission Denied

**Symptoms**:
- Redis logs show permission errors
- Cannot write to Redis data directory

**Solutions**:

```bash
# Fix Redis data directory permissions (Linux)
sudo chown redis:redis /var/lib/redis
sudo chmod 755 /var/lib/redis

# Check Redis log file permissions
sudo chown redis:redis /var/log/redis/redis-server.log
```

#### Memory Issues

**Symptoms**:
- Redis crashes with out-of-memory errors
- Poor performance under load

**Solutions**:

1. **Configure memory limit**
   ```conf
   # In redis.conf
   maxmemory 512mb
   maxmemory-policy allkeys-lru
   ```

2. **Monitor memory usage**
   ```bash
   redis-cli info memory
   ```

#### Connection Timeout

**Symptoms**:
- Intermittent Redis connection timeouts
- Circuit breaker activation

**Solutions**:

1. **Adjust timeout settings**
   ```yaml
   # In config/config.yaml
   redis:
     connection_timeout_ms: 10000  # Increase timeout
     retry_attempts: 5             # More retries
   ```

2. **Check network latency**
   ```bash
   redis-cli --latency -h localhost -p 6379
   ```

### Monitoring Redis Health

#### Redis CLI Commands

```bash
# Server information
redis-cli info server

# Memory usage
redis-cli info memory

# Client connections
redis-cli info clients

# Cache statistics
redis-cli info stats

# Monitor commands in real-time
redis-cli monitor
```

#### Personal Pipeline Health Checks

```bash
# Comprehensive health check
npm run health:check

# Cache-specific health
npm run health:cache

# Performance metrics
npm run performance:monitor

# Circuit breaker status
npm run circuit-breakers:status
```

## Performance Optimization

### Redis Tuning for Personal Pipeline

```conf
# Optimize for Personal Pipeline workload
# In redis.conf:

# Memory
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence (for development)
save 900 1
save 300 10

# Networking
tcp-keepalive 300
timeout 0

# Performance
databases 1  # Personal Pipeline uses database 0 only
```

### Personal Pipeline Cache Tuning

```yaml
# In config/config.yaml
cache:
  memory:
    max_keys: 2000        # Increase for larger datasets
    ttl_seconds: 7200     # Match Redis TTL
  redis:
    ttl_seconds: 14400    # Longer TTL for Redis
  content_types:
    runbooks:
      ttl_seconds: 7200   # Critical content - longer cache
      warmup: true        # Pre-load on startup
    procedures:
      ttl_seconds: 3600   # Standard procedures
      warmup: false
```

## Production Deployment

### High Availability Setup

For production deployments, consider Redis clustering or replication:

```bash
# Redis Sentinel for high availability
sudo apt install redis-sentinel

# Or Redis Cluster for horizontal scaling
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  --cluster-replicas 0
```

### Security Hardening

```conf
# In redis.conf:
requirepass your_secure_password
bind 127.0.0.1
protected-mode yes
rename-command FLUSHDB ""
rename-command FLUSHALL ""
```

### Monitoring and Alerting

```bash
# Set up Redis monitoring
# Use tools like:
# - Redis Insight (GUI)
# - Prometheus + Grafana
# - Personal Pipeline built-in monitoring

npm run monitoring:status
```

## Migration and Backup

### Backup Redis Data

```bash
# Create backup
redis-cli save
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb

# Restore from backup
sudo systemctl stop redis
cp /backup/redis-20240130.rdb /var/lib/redis/dump.rdb
sudo systemctl start redis
```

### Migrating from Memory-Only to Redis

1. **Install Redis** (follow instructions above)
2. **Update configuration** (optional - automatic detection works)
3. **Restart Personal Pipeline**
4. **Verify hybrid mode**

```bash
# Check cache status
npm run health:cache

# Should show:
# "strategy": "hybrid"
# "redis_connected": true
```

## Getting Help

### Resources

- **Redis Documentation**: https://redis.io/documentation
- **Personal Pipeline Issues**: GitHub issue tracker
- **Redis Community**: https://redis.io/community

### Common Commands Quick Reference

```bash
# Redis Operations
redis-cli ping                 # Test connection
redis-cli info                 # Server information
redis-cli keys "pp:cache:*"    # List Personal Pipeline cache keys
redis-cli flushdb              # Clear current database (use carefully!)

# Personal Pipeline Operations
npm run health:cache           # Check cache health
npm run performance:monitor    # Monitor performance
npm run demo:start             # Setup with Redis demo
npm run demo:start:memory-only # Setup without Redis
```

### Support

If you encounter issues not covered in this guide:

1. **Check logs**: `tail -f logs/app.log`
2. **Health check**: `npm run health:check`
3. **Redis logs**: `sudo journalctl -u redis` (Linux)
4. **Create issue**: Include logs, configuration, and system info

---

**Note**: Personal Pipeline is designed to work seamlessly with or without Redis. The system will automatically detect Redis availability and optimize performance accordingly. Redis setup is optional but recommended for production deployments.