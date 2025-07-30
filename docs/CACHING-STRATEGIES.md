# Caching Strategies and Configuration Guide

This document provides comprehensive guidance on Personal Pipeline's caching system, including configuration options, performance implications, and best practices.

## Overview

Personal Pipeline implements a sophisticated **hybrid caching strategy** that combines in-memory caching with optional Redis persistence. The system is designed to provide optimal performance while maintaining operational resilience.

## Caching Architecture

### Hybrid Caching Strategy

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│  Personal        │───▶│  Documentation  │
│   (LangGraph)   │    │  Pipeline        │    │  Sources        │
└─────────────────┘    │                  │    └─────────────────┘
                       │  ┌─────────────┐ │
                       │  │ L1: Memory  │ │ ◄── Fast Access
                       │  │    Cache    │ │     (≤5ms)
                       │  └─────────────┘ │
                       │         │        │
                       │  ┌─────────────┐ │
                       │  │ L2: Redis   │ │ ◄── Persistent
                       │  │    Cache    │ │     (≤50ms)
                       │  └─────────────┘ │
                       └──────────────────┘
```

### Cache Hierarchy

1. **L1 Cache (Memory)**: Ultra-fast in-memory cache for frequently accessed items (≤5ms)
2. **L2 Cache (Redis)**: Persistent cache shared across instances (≤50ms)
3. **Source Fetch**: Direct retrieval from documentation sources (≤500ms)

## Caching Modes

### 1. Hybrid Mode (Recommended)

**Configuration**:
```yaml
cache:
  strategy: hybrid
  redis:
    enabled: true
```

**Characteristics**:
- **Performance**: Fastest overall performance
- **Persistence**: Cache survives application restarts
- **Memory Usage**: Lower memory footprint
- **Scalability**: Shared cache across multiple instances
- **Complexity**: Requires Redis installation

**Use Cases**:
- Production deployments
- Multi-instance setups
- Performance-critical environments
- Long-running services

### 2. Memory-Only Mode

**Configuration**:
```yaml
cache:
  strategy: memory_only
  # OR
  redis:
    enabled: false
```

**Characteristics**:
- **Performance**: Fast first access, slower subsequent requests
- **Persistence**: Cache lost on restart (cold start)
- **Memory Usage**: Higher memory footprint
- **Scalability**: Independent caches per instance
- **Complexity**: No external dependencies

**Use Cases**:
- Development environments
- Containerized deployments without persistent storage
- Simple single-instance setups
- Testing and CI/CD

## Configuration Options

### Basic Configuration

```yaml
cache:
  enabled: true              # Enable/disable caching entirely
  strategy: hybrid           # hybrid | memory_only
  
  memory:
    max_keys: 1000           # Maximum cached items
    ttl_seconds: 3600        # Default TTL (1 hour)
    check_period_seconds: 600 # Cleanup interval
  
  redis:
    enabled: true            # Enable Redis (auto-detected)
    url: redis://localhost:6379
    ttl_seconds: 7200        # Redis TTL (2 hours)
    key_prefix: 'pp:cache:'
```

### Advanced Redis Configuration

```yaml
redis:
  # Connection Settings
  url: redis://localhost:6379           # Basic connection
  # url: redis://user:pass@host:port    # With authentication
  # url: rediss://host:port             # SSL/TLS connection
  
  # Performance Tuning
  connection_timeout_ms: 5000          # Connection timeout
  retry_attempts: 3                    # Retry attempts
  retry_delay_ms: 2000                 # Initial retry delay
  
  # Resilience Settings
  max_retry_delay_ms: 120000           # Maximum retry delay (2 minutes)
  backoff_multiplier: 2.5              # Exponential backoff factor
  connection_retry_limit: 5            # Circuit breaker threshold
  
  # Key Management
  key_prefix: 'pp:cache:'              # Namespace prefix
  ttl_seconds: 7200                    # Default TTL
```

### Content-Specific Settings

Personal Pipeline supports different caching strategies for different content types:

```yaml
content_types:
  runbooks:                    # Critical operational runbooks
    ttl_seconds: 3600          # 1 hour - frequently accessed
    warmup: true               # Pre-load on startup
    
  procedures:                  # Step-by-step procedures  
    ttl_seconds: 1800          # 30 minutes - moderate access
    warmup: false              # Load on-demand
    
  decision_trees:              # Decision logic
    ttl_seconds: 2400          # 40 minutes - important but stable
    warmup: true               # Pre-load for incident response
    
  knowledge_base:              # General documentation
    ttl_seconds: 900           # 15 minutes - less critical
    warmup: false              # Load on-demand
```

## Performance Characteristics

### Response Time Analysis

| Cache Level | Hit Rate | Response Time | Typical Use Case |
|-------------|----------|---------------|------------------|
| L1 (Memory) | 40-60% | ≤5ms | Frequently accessed runbooks |
| L2 (Redis) | 30-40% | ≤50ms | Recently accessed content |
| Source Fetch | 10-20% | ≤500ms | New or rarely accessed content |

### Memory Usage Patterns

| Mode | Memory Usage | Startup Time | Restart Impact |
|------|--------------|--------------|----------------|
| Memory-Only | High (100%) | Fast | Cold cache, slower |
| Hybrid | Lower (60-80%) | Medium | Warm cache, faster |

### Throughput Comparison

```
Memory-Only Mode:
├── First Request: ~500ms (source fetch)
├── Cached Request: ~5ms (memory hit)
└── After Restart: ~500ms (cold cache)

Hybrid Mode:
├── First Request: ~50ms (Redis hit) or ~500ms (source fetch)
├── Cached Request: ~5ms (memory hit)
└── After Restart: ~50ms (warm Redis cache)
```

## Operational Monitoring

### Health Check Endpoints

```bash
# Overall cache health
curl http://localhost:3000/health/cache

# Detailed cache statistics
curl http://localhost:3000/health/cache | jq '.cache.stats'

# Redis-specific health
curl http://localhost:3000/health/cache | jq '.cache.redis_stats'
```

### Performance Metrics

```bash
# Cache performance metrics
npm run performance:monitor

# Expected output:
{
  "cache": {
    "hit_rate": 85.4,
    "memory_hit_rate": 52.1,
    "redis_hit_rate": 33.3,
    "avg_response_time": 12.5,
    "memory_usage_mb": 245.8
  }
}
```

### Key Performance Indicators (KPIs)

| Metric | Target | Good | Needs Attention |
|--------|--------|------|-----------------|
| **Total Hit Rate** | >80% | >75% | <70% |
| **Memory Hit Rate** | >50% | >40% | <30% |
| **Avg Response Time** | <20ms | <50ms | >100ms |
| **Redis Connection** | 100% | >99% | <95% |

## Troubleshooting

### Common Issues and Solutions

#### 1. Low Cache Hit Rate

**Symptoms**:
- Hit rate below 70%
- Slow response times
- High source adapter load

**Diagnosis**:
```bash
curl http://localhost:3000/health/cache | jq '.cache.stats.hit_rate'
```

**Solutions**:
- Increase TTL for frequently accessed content
- Enable warmup for critical content types
- Check if cache is being invalidated too frequently

```yaml
content_types:
  runbooks:
    ttl_seconds: 7200    # Increase from 3600
    warmup: true         # Enable pre-loading
```

#### 2. Redis Connection Issues

**Symptoms**:
- "Redis connection failed" warnings
- Fallback to memory-only mode
- Circuit breaker activation

**Diagnosis**:
```bash
redis-cli ping
npm run health:cache
```

**Solutions**:
1. **Verify Redis is running**:
   ```bash
   # Linux/macOS
   sudo systemctl status redis
   
   # Docker
   docker ps | grep redis
   ```

2. **Adjust connection settings**:
   ```yaml
   redis:
     connection_timeout_ms: 10000  # Increase timeout
     retry_attempts: 5             # More retries
   ```

3. **Check network connectivity**:
   ```bash
   telnet localhost 6379
   ```

#### 3. High Memory Usage

**Symptoms**:
- Application consuming excessive memory
- Out-of-memory errors
- System slowdown

**Diagnosis**:
```bash
npm run performance:monitor | jq '.cache.memory_usage_mb'
```

**Solutions**:
1. **Reduce memory cache size**:
   ```yaml
   memory:
     max_keys: 500        # Reduce from 1000
     ttl_seconds: 1800    # Reduce TTL
   ```

2. **Optimize content-specific TTL**:
   ```yaml
   content_types:
     knowledge_base:
       ttl_seconds: 300   # Reduce for less critical content
   ```

3. **Enable Redis for better memory efficiency**:
   ```yaml
   redis:
     enabled: true        # Offload to Redis
   ```

#### 4. Cache Invalidation Issues

**Symptoms**:
- Stale data being served
- Content not updating
- Inconsistent responses

**Solutions**:
1. **Reduce TTL for dynamic content**:
   ```yaml
   content_types:
     procedures:
       ttl_seconds: 900   # 15 minutes instead of 30
   ```

2. **Manual cache clearing**:
   ```bash
   # Clear specific content type
   curl -X DELETE http://localhost:3000/cache/runbooks
   
   # Clear all cache
   curl -X DELETE http://localhost:3000/cache/all
   ```

### Performance Tuning

#### For High-Traffic Environments

```yaml
cache:
  memory:
    max_keys: 2000               # Increase capacity
    ttl_seconds: 7200            # Longer TTL
  redis:
    ttl_seconds: 14400           # Even longer Redis TTL
    connection_timeout_ms: 3000  # Faster timeout for high-throughput
```

#### For Resource-Constrained Environments

```yaml
cache:
  memory:
    max_keys: 500                # Reduce memory usage
    ttl_seconds: 1800            # Shorter TTL
  redis:
    enabled: false               # Disable Redis if needed
```

#### For Development Environments

```yaml
cache:
  memory:
    ttl_seconds: 300             # Short TTL for quick updates
  content_types:
    runbooks:
      warmup: false              # Skip warmup for faster startup
    decision_trees:
      warmup: false
```

## Best Practices

### Configuration Guidelines

1. **Choose the Right Strategy**:
   - **Production**: Always use hybrid mode with Redis
   - **Development**: Memory-only is acceptable for quick iteration
   - **Testing**: Consider disabling cache for consistent test results

2. **Set Appropriate TTL Values**:
   - **Critical content**: Longer TTL (1-2 hours)
   - **Dynamic content**: Shorter TTL (15-30 minutes)
   - **Static content**: Very long TTL (4-24 hours)

3. **Use Warmup Strategically**:
   - Enable for frequently accessed content
   - Disable for rarely used content to save startup time
   - Monitor startup time vs. cache hit rate trade-offs

4. **Monitor and Adjust**:
   - Regularly review cache hit rates
   - Adjust TTL based on content update frequency
   - Monitor memory usage and Redis performance

### Deployment Considerations

#### Docker Deployments

```yaml
# docker-compose.yml
version: '3.8'
services:
  personal-pipeline:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
```

#### Kubernetes Deployments

```yaml
# Use Redis as a separate service
apiVersion: v1
kind: ConfigMap
metadata:
  name: pp-config
data:
  config.yaml: |
    cache:
      redis:
        url: redis://redis-service:6379
```

#### Multi-Instance Deployments

- Use Redis for shared caching across instances
- Consider Redis clustering for high availability
- Monitor cache coherence across instances

### Security Considerations

1. **Redis Authentication**:
   ```yaml
   redis:
     url: redis://user:password@localhost:6379
   ```

2. **Network Security**:
   - Bind Redis to localhost in development
   - Use TLS for production deployments
   - Implement proper firewall rules

3. **Key Namespace**:
   ```yaml
   redis:
     key_prefix: 'pp:prod:cache:'  # Environment-specific prefix
   ```

## Migration Guide

### From Memory-Only to Hybrid

1. **Install Redis** (see [Redis Setup Guide](REDIS-SETUP.md))
2. **Update configuration**:
   ```yaml
   cache:
     strategy: hybrid  # Change from memory_only
     redis:
       enabled: true
   ```
3. **Restart application**
4. **Verify hybrid mode**:
   ```bash
   npm run health:cache | jq '.cache.strategy'
   ```

### From Legacy Caching to New System

If migrating from an older caching implementation:

1. **Backup existing cache data** if needed
2. **Update configuration schema**
3. **Test with small dataset first**
4. **Monitor performance during migration**
5. **Rollback plan**: Keep old configuration as backup

## Advanced Topics

### Custom Cache Strategies

For advanced use cases, you can implement custom caching logic:

```typescript
// Custom cache adapter example
class CustomCacheStrategy extends CacheService {
  async get(key: CacheKey): Promise<any> {
    // Custom cache retrieval logic
    return super.get(key);
  }
}
```

### Integration with External Systems

- **Monitoring**: Integrate with Prometheus/Grafana
- **Alerting**: Set up alerts for cache performance degradation
- **Analytics**: Track cache patterns for optimization

### Performance Testing

```bash
# Benchmark caching performance
npm run benchmark:cache

# Load test with caching enabled
npm run load-test:peak --cache-enabled

# A/B test memory-only vs hybrid
npm run test:cache-comparison
```

## Conclusion

Personal Pipeline's caching system provides flexible, high-performance data access with intelligent fallback mechanisms. By understanding the configuration options and monitoring capabilities, you can optimize the system for your specific use case while maintaining operational resilience.

For additional support:
- Check [Redis Setup Guide](REDIS-SETUP.md) for installation help
- Review [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues
- Monitor performance with built-in health checks
- Join our community discussions for optimization tips