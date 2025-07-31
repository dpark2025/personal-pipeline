# Demo Environment Guide - Personal Pipeline MCP Server

*Authored by: Integration Specialist (Barry)*  
*Date: 2025-07-29*

## Overview

This guide provides comprehensive instructions for setting up, running, and showcasing all milestone 1.3 features of the Personal Pipeline MCP server through an automated demo environment. The demo showcases advanced caching, performance monitoring, health checks, circuit breakers, and integrated testing utilities.

## Features Demonstrated

### 🚀 Milestone 1.3 Core Features
- **Hybrid Caching System**: Redis + in-memory caching with intelligent fallback
- **Performance Monitoring**: Real-time metrics with percentile analysis
- **Health Monitoring**: Comprehensive system health checks with alerting
- **Circuit Breakers**: Resilience patterns preventing cascade failures
- **Load Testing**: Stress testing with performance validation
- **Observability**: Rich metrics, logging, and monitoring dashboards

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Redis (optional - will fallback to memory-only mode)
- curl and jq (recommended for testing)
- 5-10 minutes for full setup

### One-Command Setup
```bash
# Complete demo environment setup
./scripts/setup-demo.sh

# Or with custom options
./scripts/setup-demo.sh --interactive --port 3001
```

### Cleanup
```bash
# Stop all demo services
./scripts/stop-demo.sh

# Clean up test data as well
./scripts/stop-demo.sh --clean-data
```

## Demo Environment Components

### 1. Setup Script (`scripts/setup-demo.sh`)
**Comprehensive automated setup with the following features:**

#### Core Setup Operations
- ✅ Prerequisites validation (Node.js, Redis, curl, jq)
- ✅ Dependency installation and project building
- ✅ Redis setup with automatic fallback to memory-only mode
- ✅ Realistic sample data generation (15 runbooks, 30 KB articles)
- ✅ Demo-specific configuration creation
- ✅ MCP server startup with health validation
- ✅ Cache warming with sample queries
- ✅ Performance benchmark execution
- ✅ Monitoring system startup
- ✅ Complete environment validation

#### Configuration Options
```bash
# Environment variables
SETUP_REDIS=false          # Skip Redis setup
GENERATE_SAMPLE_DATA=false # Skip sample data generation
WARM_CACHE=false           # Skip cache warming
RUN_BENCHMARKS=false       # Skip performance benchmarks
START_MONITORING=false     # Skip monitoring startup
INTERACTIVE_MODE=true      # Enable step-by-step mode

# Command line flags
--no-redis                 # Memory-only cache mode
--no-sample-data          # Skip data generation
--no-cache-warming        # Skip cache warming
--no-benchmarks           # Skip benchmarks
--no-monitoring           # Skip monitoring
--interactive             # Step-by-step mode
--port 3001               # Custom server port
--redis-port 6380         # Custom Redis port
```

#### Intelligent Features
- **Automatic fallback**: If Redis is unavailable, automatically switches to memory-only mode
- **Health validation**: Ensures all components are working before proceeding
- **Performance validation**: Runs benchmarks to verify response time targets
- **Error handling**: Comprehensive error detection with helpful troubleshooting info
- **Progress tracking**: Clear visual progress indicators and success confirmations

### 2. Interactive Demo Walkthrough (`scripts/demo-walkthrough.js`)
**Feature-rich interactive demonstration covering all milestone 1.3 capabilities:**

#### Available Demo Scenarios

##### 🚀 Cache Performance Demo ⭐⭐⭐
- Demonstrates cache hit/miss performance differences
- Shows response time improvements with repeated queries
- Displays cache statistics and hit rates
- Validates sub-200ms cached response targets

##### ❤️ Health Monitoring Demo ⭐⭐
- Comprehensive system health checks
- Real-time health metrics display
- Active alert monitoring
- Performance health validation

##### 🏋️ Load Testing Demo ⭐⭐⭐
- Controlled stress testing with concurrent requests
- System behavior analysis under load
- Performance degradation monitoring
- Recovery time validation

##### ⚡ Circuit Breaker Demo ⭐⭐
- Circuit breaker status monitoring
- Failure threshold tracking
- State transition visualization
- Recovery behavior demonstration

##### 📊 Performance Metrics Demo ⭐⭐
- Comprehensive performance analytics
- Response time percentile analysis
- Resource usage monitoring
- Performance recommendations

##### 📡 Real-time Monitoring
- Live system metrics updating every 5 seconds
- Dynamic performance visualization
- Resource usage tracking
- Cache performance monitoring

#### Interactive Features
- **Menu-driven navigation**: Easy selection of demo scenarios
- **Real-time data**: Live metrics and performance data
- **Visual feedback**: Color-coded output with status indicators
- **Progress tracking**: Clear indication of demo progress
- **Error handling**: Graceful handling of server unavailability

### 3. Cleanup Script (`scripts/stop-demo.sh`)
**Comprehensive cleanup with graceful shutdown:**

#### Cleanup Operations
- ✅ Graceful MCP server shutdown with PID tracking
- ✅ Monitoring process termination
- ✅ Redis instance cleanup (if started by demo)
- ✅ Temporary file removal (logs, PIDs, config)
- ✅ Process verification and status reporting

## Demo Scenarios & Use Cases

### 1. Cache Performance Validation
**Demonstrates hybrid caching effectiveness:**
```bash
# Start demo environment
./scripts/setup-demo.sh

# Run interactive demo
node scripts/demo-walkthrough.js
# Select option 1: Cache Performance Demo
```

**Expected Results:**
- First query: 50-200ms (cache miss, data retrieval)
- Subsequent queries: 5-50ms (cache hit, much faster)
- Cache hit rate: >80% after warming
- Memory and Redis cache coordination

### 2. Load Testing & Circuit Breakers
**Shows system resilience under stress:**
```bash
# Heavy load testing
npm run load-test:storm

# Monitor circuit breaker status
curl http://localhost:3000/circuit-breakers | jq
```

**Expected Results:**
- Graceful performance degradation under load
- Circuit breaker activation when thresholds exceeded
- System recovery after load reduction
- No cascade failures or service crashes

### 3. Health Monitoring & Alerting
**Comprehensive health visibility:**
```bash
# Real-time health monitoring
npm run health:dashboard

# Check specific health endpoints
curl http://localhost:3000/health/detailed | jq
curl http://localhost:3000/health/cache | jq
curl http://localhost:3000/health/performance | jq
```

**Expected Results:**
- Real-time health status updates
- Performance metric tracking
- Alert generation for threshold breaches
- Recovery notifications when issues resolve

### 4. Performance Benchmarking
**Validates performance targets:**
```bash
# Quick benchmark (5 concurrent, 15s duration)
npm run benchmark:quick

# Stress benchmark (50 concurrent, 2 min duration)
npm run benchmark:stress

# Performance validation
npm run performance:validate:strict
```

**Expected Results:**
- Average response time: <200ms for cached content
- P95 response time: <500ms under normal load
- P99 response time: <1000ms under stress
- Throughput: >10 requests/second
- Error rate: <1% under normal conditions

## API Endpoints for Testing

### Health & Monitoring
```bash
# Overall health
curl http://localhost:3000/health

# Detailed health with all components
curl http://localhost:3000/health/detailed | jq

# Cache-specific health
curl http://localhost:3000/health/cache | jq

# Performance health metrics
curl http://localhost:3000/health/performance | jq

# Source adapter health
curl http://localhost:3000/health/sources | jq
```

### Performance & Metrics
```bash
# Comprehensive performance metrics
curl http://localhost:3000/performance | jq

# Prometheus-compatible metrics
curl http://localhost:3000/metrics?format=prometheus

# Reset performance counters
curl -X POST http://localhost:3000/performance/reset
```

### Monitoring & Alerting
```bash
# Monitoring status
curl http://localhost:3000/monitoring/status | jq

# Active alerts
curl http://localhost:3000/monitoring/alerts/active | jq

# All alerts (including resolved)
curl http://localhost:3000/monitoring/alerts | jq

# Monitoring rules
curl http://localhost:3000/monitoring/rules | jq
```

### Circuit Breakers
```bash
# Circuit breaker status
curl http://localhost:3000/circuit-breakers | jq

# Individual circuit breaker details
curl http://localhost:3000/circuit-breakers/cache | jq
```

### Functional Testing
```bash
# Search runbooks
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "disk space critical", "max_results": 5}' | jq

# Get specific runbook
curl http://localhost:3000/api/runbook/disk_space_critical_001 | jq

# List available sources
curl http://localhost:3000/api/sources | jq
```

## Configuration Files

### Demo Configuration (`config/demo-config.yaml`)
Automatically generated demo configuration optimized for showcasing features:

```yaml
# Key configuration highlights
server:
  port: 3000
  log_level: info
  max_concurrent_requests: 100

cache:
  enabled: true
  strategy: hybrid  # or memory_only if Redis unavailable
  memory:
    ttl_seconds: 300
    max_keys: 1000
  redis:
    enabled: true
    url: redis://localhost:6379

performance:
  enabled: true
  realtime_monitoring: true
  monitoring_interval_ms: 5000

monitoring:
  enabled: true
  check_interval_ms: 30000
  notification_channels:
    console: true
```

### Sample Data Structure
```
test-data/
├── runbooks/           # 15 realistic incident response runbooks
│   ├── disk_space_critical_001.json
│   ├── memory_leak_high_002.json
│   └── ...
├── knowledge-base/     # 30 operational knowledge articles
│   ├── troubleshooting_disk_space_001.md
│   ├── best-practices_memory_leak_002.md
│   └── ...
└── generation-summary.json  # Data generation metadata
```

## Troubleshooting

### Common Issues & Solutions

#### 1. Server Won't Start
```bash
# Check if port is in use
lsof -i :3000

# Check server logs
tail -f server-demo.log

# Manual health check
curl http://localhost:3000/health
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# View Redis logs
tail -f redis-demo.log

# Test connection
redis-cli -p 6379 info
```

#### 3. Cache Performance Issues
```bash
# Check cache health
curl http://localhost:3000/health/cache | jq

# Verify cache statistics
curl http://localhost:3000/performance | jq '.cache_performance'

# Clear cache if needed
curl -X POST http://localhost:3000/cache/clear
```

#### 4. Performance Degradation
```bash
# Check current metrics
curl http://localhost:3000/health/performance | jq

# Monitor resource usage
curl http://localhost:3000/performance | jq '.resource_usage'

# Check for active alerts
curl http://localhost:3000/monitoring/alerts/active | jq
```

#### 5. Sample Data Issues
```bash
# Regenerate sample data
npm run generate-sample-data

# Verify data exists
ls -la test-data/runbooks/
ls -la test-data/knowledge-base/

# Test data search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "max_results": 10}' | jq
```

### Log Files
- `demo-setup.log` - Setup script execution log
- `server-demo.log` - MCP server runtime log
- `redis-demo.log` - Redis server log (if Redis enabled)
- `monitoring-demo.log` - Health monitoring log

### Environment Variables
```bash
# Enable debug logging
export DEBUG=pp:*

# Custom configuration file
export PP_CONFIG_FILE=/path/to/custom-config.yaml

# Memory-only mode
export CACHE_STRATEGY=memory_only

# Custom ports
export SERVER_PORT=3001
export REDIS_PORT=6380
```

## Performance Targets & Validation

### Target Metrics (Milestone 1.3)
- **Response Time**: <200ms for cached runbooks, <500ms for cold retrieval
- **Throughput**: >50 concurrent requests supported
- **Cache Hit Rate**: >80% for operational scenarios
- **Availability**: 99.9% uptime (circuit breakers prevent cascade failures)
- **Error Rate**: <1% under normal load, <5% under stress

### Validation Commands
```bash
# Performance validation (strict mode)
npm run performance:validate:strict

# Load testing validation
npm run load-test:peak

# Cache performance validation
npm run test:cache-performance

# Health check validation
npm run health:check
```

## Demo Script Examples

### Quick Demo (5 minutes)
```bash
# 1. Setup environment
./scripts/setup-demo.sh --no-benchmarks

# 2. Show cache performance
node scripts/demo-walkthrough.js
# Select: Cache Performance Demo

# 3. Show health monitoring
curl http://localhost:3000/health/detailed | jq

# 4. Cleanup
./scripts/stop-demo.sh
```

### Full Demo (15 minutes)
```bash
# 1. Interactive setup
./scripts/setup-demo.sh --interactive

# 2. Complete walkthrough
node scripts/demo-walkthrough.js
# Select: Run All Demos

# 3. Manual testing
npm run test-mcp

# 4. Cleanup with data removal
./scripts/stop-demo.sh --clean-data
```

### Stakeholder Demo (presentation mode)
```bash
# 1. Silent setup with all features
./scripts/setup-demo.sh

# 2. Health monitoring dashboard
npm run health:dashboard &

# 3. Load testing demonstration
npm run load-test:peak

# 4. Performance metrics review
curl http://localhost:3000/performance | jq

# 5. Circuit breaker status
curl http://localhost:3000/circuit-breakers | jq
```

## Integration with Development Workflow

### Development Testing
```bash
# Use demo environment for development
./scripts/setup-demo.sh --no-benchmarks --no-monitoring

# Run tests against demo environment
npm test
npm run test:integration

# Performance profiling
npm run benchmark:quick
```

### CI/CD Integration
```bash
# Automated demo validation
./scripts/setup-demo.sh --no-interactive
npm run performance:validate
./scripts/stop-demo.sh
```

## Success Metrics

The demo environment validates all milestone 1.3 success criteria:

✅ **Sub-200ms cached response times**: Validated through cache performance demo  
✅ **Hybrid caching system**: Redis + memory with intelligent fallback  
✅ **Real-time performance monitoring**: Live metrics and alerting  
✅ **Circuit breaker protection**: Prevents cascade failures under load  
✅ **Comprehensive health checks**: Multi-component health validation  
✅ **Load testing capability**: Stress testing with performance validation  
✅ **Operational observability**: Rich metrics, logging, and monitoring  

## Next Steps

After exploring the demo environment:

1. **Review Implementation**: Examine the source code in `src/utils/` for caching, performance, and monitoring implementations
2. **Customize Configuration**: Adapt `config/demo-config.yaml` for your specific needs
3. **Extend Monitoring**: Add custom alerts and monitoring rules
4. **Performance Tuning**: Adjust cache TTLs and thresholds based on your use cases
5. **Integration**: Connect to your actual documentation sources (Confluence, GitHub, etc.)

For questions or issues, refer to the [troubleshooting guide](DEMO-TROUBLESHOOTING.md) or check the log files for detailed diagnostic information.