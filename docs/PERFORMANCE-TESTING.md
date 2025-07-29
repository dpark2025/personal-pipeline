# Performance Testing Suite

Comprehensive performance benchmarking and load testing framework for the Personal Pipeline MCP Server, designed to validate <200ms response time targets and ensure system scalability under operational loads.

## Overview

The performance testing suite consists of three main components:

1. **Benchmark Suite** (`scripts/benchmark.js`) - Comprehensive performance validation of all 7 MCP tools
2. **Load Testing Framework** (`scripts/load-test.js`) - Realistic incident response scenario testing  
3. **Performance Monitoring** (`src/utils/performance.ts`) - Real-time metrics collection and analysis

## Performance Targets

### Response Time Requirements
- **Critical runbooks**: <200ms (cached content)
- **Standard procedures**: <500ms (standard queries)  
- **Cold retrievals**: <2 seconds (first-time queries)
- **Search queries**: <300ms (semantic), <100ms (cached)
- **Bulk operations**: <5 seconds (large result sets)

### Throughput Requirements
- **Concurrent queries**: 50+ simultaneous operations
- **Peak load**: 500 queries/minute sustained
- **Burst capacity**: 1000 queries/minute for 5 minutes
- **Database**: 100+ concurrent connections efficiently managed
- **Cache**: Sub-millisecond access times for hot data

### Resource Limits
- **Memory usage**: <2GB resident per instance
- **CPU utilization**: <70% average, <90% peak
- **Database connections**: <100 concurrent per instance
- **Cache memory**: <1GB Redis per instance
- **Network**: <100Mbps bandwidth utilization

## Quick Start

### Basic Performance Benchmark
```bash
# Quick benchmark (5 concurrent, 15 seconds)
npm run benchmark:quick

# Full benchmark (default settings)
npm run benchmark

# Stress test (50 concurrent, 2 minutes)
npm run benchmark:stress
```

### Load Testing
```bash
# Normal operational load
npm run load-test

# Peak operational load with real-time monitoring
npm run load-test:peak

# Incident storm scenario
npm run load-test:storm
```

### Performance Monitoring
```bash
# View current performance metrics
npm run performance:monitor

# Reset performance counters
npm run performance:reset
```

## Benchmark Suite

### Features
- **Comprehensive Tool Testing**: Benchmarks all 7 MCP tools under various conditions
- **Cache Performance Analysis**: Tests with and without caching enabled
- **Concurrent Load Testing**: Simulates 10-150+ concurrent users
- **Memory Monitoring**: Tracks memory usage and resource efficiency
- **Automated Reporting**: Generates HTML and JSON reports with recommendations

### Usage

```bash
node scripts/benchmark.js [options]

Options:
  --concurrent <n>    Number of concurrent requests per test (default: 10)
  --duration <n>      Test duration in seconds (default: 30) 
  --cache-test        Include cache performance tests
  --no-warmup         Skip cache warmup phase
  --output <file>     Save results to JSON file
  --target <ms>       Target response time in ms (default: 200)
  --verbose           Detailed logging
  --external-server   Use external server (don't start MCP server)
```

### Example Output

```
🚀 Starting Performance Benchmark Suite
Target: <200ms cached responses
Concurrent: 10 requests
Duration: 30s per test

🔥 Running cache warmup phase...
✅ Cache warmup completed in 245ms

📊 Running baseline performance tests...
   search_runbooks: 156ms avg ✅
   get_decision_tree: 89ms avg ✅
   get_procedure: 134ms avg ✅
   get_escalation_path: 67ms avg ✅
   list_sources: 45ms avg ✅
   search_knowledge_base: 298ms avg ❌
   record_resolution_feedback: 23ms avg ✅
✅ Baseline tests completed

📊 Overall Grade: A
🎯 Targets Met: 6/7
💾 Cache Performance: Hit Rate: 84.2% ✅
🧠 Memory Performance: Peak Memory: 156MB ✅
```

## Load Testing Framework

### Test Scenarios

1. **Normal Operations** (10 concurrent users, 5 RPS)
   - Typical operational load
   - 80% cache hit ratio
   - <1% error rate threshold

2. **Peak Operations** (25 concurrent users, 15 RPS)
   - Peak business hours load
   - 70% cache hit ratio
   - <2% error rate threshold

3. **Incident Storm** (50 concurrent users, 30 RPS)
   - High-stress incident response scenario
   - 50% cache hit ratio (unique queries)
   - <5% error rate threshold

4. **Stress Test** (100 concurrent users, 50 RPS)
   - System capacity testing
   - 30% cache hit ratio
   - <10% error rate threshold

5. **Spike Test** (150 concurrent users, 100 RPS)
   - Sudden traffic surge simulation
   - 20% cache hit ratio
   - <15% error rate threshold

### Incident Scenarios

The load testing framework simulates realistic incident response patterns:

- **Memory Pressure Alerts**: search_runbooks → get_decision_tree → get_procedure
- **Service Downtime**: search_runbooks → get_escalation_path → get_decision_tree
- **Performance Degradation**: search_knowledge_base → search_runbooks → get_procedure
- **Security Incidents**: search_runbooks → get_escalation_path → record_resolution_feedback

### Usage

```bash
node scripts/load-test.js [options]

Options:
  --scenario <name>    Load test scenario (normal|peak|storm|stress|spike)
  --server-url <url>   MCP server URL (default: http://localhost:3000)
  --output <dir>       Output directory for reports
  --verbose            Detailed logging
  --realtime           Real-time monitoring
  --no-cache           Disable cache profiling
```

### Example Output

```
🚀 Starting Load Test: Peak Operations
👥 Concurrent Users: 25
⏱️  Duration: 120s
📊 Target RPS: 15

🔥 Warmup Phase (30s)...
   Average response time: 187ms
   Requests completed: 142
   Error rate: 0.70%

⚡ Load Test Phase (120s)...
   Average response time: 234ms
   Total requests: 1,847
   Actual RPS: 15.4
   Error rate: 1.2%

❄️ Cooldown Phase (15s)...
   Recovery response time: 156ms

📊 Overall Grade: B
📈 Total Requests: 1,847
⚡ Achieved RPS: 15.4 (103% of target)
❌ Error Rate: 1.20%
💾 Cache Performance: Hit Rate: 72.1% (Grade: C)
```

## Performance Monitoring

### Real-Time Metrics

The performance monitoring system tracks:

- **Response Times**: Average, P50, P95, P99 percentiles
- **Throughput**: Requests per second, total requests
- **Error Tracking**: Error rates by type and tool
- **Resource Usage**: Memory, CPU, active handles/requests
- **Cache Performance**: Hit rates, operations, response times

### API Endpoints

#### `/metrics` - System Metrics
```bash
curl http://localhost:3000/metrics
```

Returns comprehensive system metrics including:
- Source adapter health and statistics
- Cache performance metrics
- Process memory and resource usage
- Tool performance summaries

#### `/performance` - Performance Dashboard
```bash  
curl http://localhost:3000/performance
```

Returns detailed performance analysis including:
- Performance grade and target compliance
- Bottleneck identification
- Optimization recommendations
- Resource efficiency analysis

#### `/performance/reset` - Reset Metrics
```bash
curl -X POST http://localhost:3000/performance/reset
```

Resets all performance counters (useful for testing).

### Performance Grades

- **A (90-100%)**: Excellent performance, all targets met
- **B (80-89%)**: Good performance, minor optimizations needed
- **C (70-79%)**: Fair performance, moderate improvements required
- **D (60-69%)**: Poor performance, significant optimization needed
- **F (<60%)**: Critical performance issues, immediate attention required

## Integration with CI/CD

### Automated Performance Testing

Add performance validation to your CI/CD pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Start server
        run: npm run dev &
        
      - name: Wait for server
        run: sleep 10
      
      - name: Run quick benchmark
        run: npm run benchmark:quick --output results/benchmark.json
      
      - name: Run load test
        run: npm run load-test --scenario normal --output results/
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: results/
```

### Performance Regression Detection

Set up automated alerts for performance regressions:

```bash
# Add to CI script
node scripts/benchmark.js --target 200 --output benchmark.json
if [ $? -ne 0 ]; then
  echo "Performance regression detected!"
  exit 1
fi
```

## Optimization Recommendations

### Automatic Analysis

The performance testing suite automatically identifies optimization opportunities:

#### Caching Optimization
- **Low cache hit rate**: Implement cache warming for critical runbooks
- **Cache misses**: Increase TTL for stable content
- **Predictive caching**: Add usage pattern-based preloading

#### Database Optimization  
- **Slow queries**: Add indexes for frequently queried fields
- **N+1 patterns**: Implement query result caching
- **Connection pooling**: Optimize connection pool sizing

#### Memory Optimization
- **High memory usage**: Implement object pooling for large responses
- **Memory leaks**: Add leak detection and monitoring
- **GC optimization**: Tune garbage collection parameters

#### Concurrency Optimization
- **Low throughput**: Implement connection pooling optimization
- **Request queuing**: Add throttling and load shedding
- **Async patterns**: Optimize async/await usage

### Manual Optimization

For specific performance issues:

1. **Profile slow tools**: Use Node.js profiler to identify bottlenecks
2. **Analyze cache patterns**: Review cache hit rates by content type
3. **Monitor resource usage**: Track memory and CPU trends over time
4. **Load test regularly**: Run performance tests after code changes

## Troubleshooting

### Common Issues

#### High Response Times
```bash
# Check cache performance
curl http://localhost:3000/performance | jq '.analysis.bottlenecks'

# Profile specific tools
node --prof src/index.js
# Run benchmark
node --prof-process isolate-*.log > profile.txt
```

#### Memory Leaks
```bash
# Monitor memory usage
npm run benchmark -- --verbose --duration 300

# Check for memory growth patterns
curl http://localhost:3000/metrics | jq '.performance.memory'
```

#### Low Throughput
```bash
# Run concurrent load test
npm run load-test:peak

# Check for connection pool exhaustion
curl http://localhost:3000/performance | jq '.analysis.optimization_opportunities'
```

### Performance Debugging

1. **Enable verbose logging**: Add `--verbose` to benchmark commands
2. **Monitor real-time metrics**: Use `--realtime` with load tests
3. **Analyze bottlenecks**: Check `/performance` endpoint for issues
4. **Profile memory usage**: Run extended duration tests
5. **Check cache effectiveness**: Monitor cache hit rates and TTL settings

## Advanced Configuration

### Custom Performance Targets

Create custom benchmark configurations:

```javascript
// scripts/benchmark-custom.js
import { PerformanceBenchmark } from './benchmark.js';

const customBenchmark = new PerformanceBenchmark({
  concurrent: 20,
  duration: 60,
  target: 150, // Custom 150ms target
  cacheTest: true,
  verbose: true,
});

await customBenchmark.run();
```

### Custom Load Scenarios

Add new incident scenarios:

```javascript
// Add to INCIDENT_SCENARIOS in load-test.js
{
  name: 'Database Outage',
  tools: [
    { name: 'get_escalation_path', weight: 0.6 },
    { name: 'search_runbooks', weight: 0.4 },
  ],
  args_templates: {
    get_escalation_path: {
      severity: ['critical'],
      business_hours: [true, false],
      failed_attempts: [['check_database', 'restart_db_service']],
    },
  },
}
```

### Performance Monitoring Configuration

Customize monitoring parameters:

```typescript
// In server startup
initializePerformanceMonitor({
  windowSize: 120000, // 2-minute sliding window
  maxSamples: 2000,   // Keep last 2000 samples
});

// Start real-time monitoring
const monitor = getPerformanceMonitor();
monitor.startRealtimeMonitoring(1000); // 1-second intervals
```

## Reporting and Analysis

### Report Formats

- **JSON**: Machine-readable results for CI/CD integration
- **HTML**: Visual dashboards with charts and recommendations
- **Console**: Real-time output during test execution

### Key Metrics

- **Response Time Percentiles**: P50, P95, P99 analysis
- **Throughput Analysis**: RPS achievement vs. targets
- **Error Rate Tracking**: Error types and failure patterns
- **Resource Efficiency**: Memory, CPU, and network utilization
- **Cache Performance**: Hit rates, TTL effectiveness
- **Bottleneck Identification**: Specific tools and operations causing delays

The performance testing suite provides comprehensive validation of your MCP server's performance characteristics, enabling proactive optimization and ensuring reliable operation under production loads.