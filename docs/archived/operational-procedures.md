# ⚠️ DOCUMENTATION ARCHIVE STATUS ⚠️
## 🔒 **DEPRECATED - NO LONGER REFERENCED FOR CURRENT PROJECT**
**Status**: Historical/milestone documentation - reference only  
**Archive Date**: August 16, 2025  
**Reference**: This document is deprecated and should not be used for current development  

---


# Personal Pipeline - Operational Procedures

**Authored by: DevOps Engineer (Hank)**  
**Date: 2025-07-29**  
**Version: 1.0**

## Overview

This document provides comprehensive operational procedures for the Personal Pipeline MCP server, including health monitoring, incident response, maintenance procedures, and recovery operations.

## Health Monitoring

### Health Check Endpoints

#### Basic Health Check
```bash
# Quick health status
curl http://localhost:3000/health

# Detailed health with all components
curl http://localhost:3000/health/detailed
```

#### Component-Specific Health Checks
```bash
# Cache service health
curl http://localhost:3000/health/cache

# Source adapters health
curl http://localhost:3000/health/sources

# Performance health
curl http://localhost:3000/health/performance

# Liveness probe (Kubernetes)
curl http://localhost:3000/live

# Readiness probe (Kubernetes) 
curl http://localhost:3000/ready
```

### Metrics and Monitoring

#### Metrics Collection
```bash
# JSON metrics
curl http://localhost:3000/metrics

# Prometheus format
curl 'http://localhost:3000/metrics?format=prometheus'

# Performance dashboard
curl http://localhost:3000/performance
```

#### Real-Time Dashboard
```bash
# Start health dashboard
npm run health:dashboard

# Fast refresh (2 second intervals)
npm run health:dashboard:fast

# Custom configuration
node scripts/health-dashboard.js --url http://localhost:3000 --interval 10
```

### Monitoring and Alerting

#### Alert Management
```bash
# View monitoring status
npm run monitoring:status

# View all alerts
npm run monitoring:alerts

# View active alerts only
npm run monitoring:alerts:active

# View monitoring rules
npm run monitoring:rules

# Resolve specific alert
curl -X POST http://localhost:3000/monitoring/alerts/{alertId}/resolve
```

#### Circuit Breaker Status
```bash
# View all circuit breakers
npm run circuit-breakers:status

# Reset specific circuit breaker
curl -X POST http://localhost:3000/circuit-breakers/{name}/reset
```

### Performance Monitoring

#### Performance Benchmarking
```bash
# Quick benchmark (5 concurrent, 15 seconds)
npm run benchmark:quick

# Full benchmark
npm run benchmark

# Stress test (50 concurrent, 2 minutes)
npm run benchmark:stress

# Performance validation
npm run performance:validate

# Strict validation with verbose output
npm run performance:validate:strict
```

#### Load Testing
```bash
# Standard load test
npm run load-test

# Peak load scenario
npm run load-test:peak

# Storm scenario with verbose output
npm run load-test:storm
```

## Service Management

### Starting the Server

#### Development Mode
```bash
# Development with hot reload
npm run dev

# Start with sample config generation
npm start -- --create-sample-config
```

#### Production Mode
```bash
# Build and start
npm run build
npm start

# With custom configuration
CONFIG_PATH=/path/to/config.yaml npm start
```

### Stopping the Server

#### Graceful Shutdown
```bash
# Send SIGTERM for graceful shutdown
kill -TERM $(pgrep -f "node.*index.js")

# Or use Ctrl+C in terminal
```

#### Force Stop (Emergency Only)
```bash
# Force kill (not recommended)
kill -KILL $(pgrep -f "node.*index.js")
```

### Configuration Management

#### Validating Configuration
```bash
# Validate YAML config file
npm run validate-config

# Test with specific config
CONFIG_PATH=/path/to/config.yaml npm run validate-config
```

#### Sample Data Generation
```bash
# Generate test data and runbooks
npm run generate-sample-data

# Generate with custom parameters
node scripts/generate-sample-data.js --count 50 --severity high
```

## Incident Response

### System Down (Critical)

**Symptoms:**
- Health check endpoints return 503 or timeout
- MCP server not responding
- Dashboard shows system offline

**Immediate Actions:**
1. Check if process is running: `ps aux | grep node`
2. Check system resources: `free -h`, `df -h`
3. Review recent logs: `tail -f logs/app.log`
4. Attempt graceful restart: `npm start`

**Investigation:**
```bash
# Check system health
npm run health:check

# Review performance metrics
npm run performance:validate

# Check active alerts
npm run monitoring:alerts:active

# Review error logs
grep ERROR logs/app.log | tail -20
```

### High Response Times (High Priority)

**Symptoms:**
- P95 response times > 2 seconds
- Performance dashboard shows degradation
- User complaints about slowness

**Immediate Actions:**
1. Check performance metrics: `npm run performance:validate`
2. Review cache hit rates: `npm run health:cache`
3. Check memory usage and look for leaks
4. Verify database/source connections

**Optimization Steps:**
```bash
# Reset performance metrics for clean baseline
curl -X POST http://localhost:3000/performance/reset

# Run performance benchmark
npm run benchmark:quick

# Check cache performance
npm run health:cache

# Review optimization recommendations
curl http://localhost:3000/performance | jq '.analysis.optimization_opportunities'
```

### Cache Service Issues (Medium Priority)

**Symptoms:**
- Low cache hit rates (<50%)
- Cache health check failures
- Redis connection errors

**Immediate Actions:**
1. Check cache service health: `npm run health:cache`
2. Verify Redis connectivity
3. Review cache configuration
4. Monitor memory usage

**Recovery Steps:**
```bash
# Check Redis status
redis-cli ping

# Reset cache if needed
redis-cli flushall

# Restart cache service (requires server restart)
npm run dev

# Monitor cache recovery
watch -n 5 'npm run health:cache'
```

### Source Adapter Failures (Medium Priority)

**Symptoms:**
- Source health check failures
- Empty search results
- Connection timeouts

**Immediate Actions:**
1. Check source adapter health: `npm run health:sources`
2. Verify network connectivity to sources
3. Check authentication credentials
4. Review source adapter logs

**Recovery Steps:**
```bash
# Test individual source connections
npm run test-mcp -- search_runbooks --arguments '{"query":"test"}'

# Validate configuration
npm run validate-config

# Check network connectivity
ping confluence.company.com
nslookup github.com
```

## Maintenance Procedures

### Routine Maintenance

#### Daily Tasks
- [ ] Review health dashboard for anomalies
- [ ] Check active alerts and resolve if needed
- [ ] Monitor performance metrics trends
- [ ] Verify backup systems are working

#### Weekly Tasks
- [ ] Review alert history and patterns
- [ ] Update monitoring thresholds if needed
- [ ] Performance trend analysis
- [ ] Security patches and updates

#### Monthly Tasks
- [ ] Full system performance review
- [ ] Capacity planning assessment
- [ ] Disaster recovery testing
- [ ] Documentation updates

### Configuration Updates

#### Updating Source Configurations
1. Backup current configuration: `cp config/config.yaml config/config.yaml.backup`
2. Update configuration file
3. Validate configuration: `npm run validate-config`
4. Test changes in development: `npm run dev`
5. Deploy to production with rolling restart

#### Updating Cache Settings
1. Review current cache performance: `npm run health:cache`
2. Update cache configuration in `config.yaml`
3. Restart server to apply changes
4. Monitor cache performance post-change
5. Rollback if performance degrades

### Performance Tuning

#### Memory Optimization
```bash
# Monitor memory usage
node --expose-gc scripts/memory-profile.js

# Adjust Node.js memory limits
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

#### Cache Optimization
```bash
# Analyze cache patterns
curl http://localhost:3000/metrics | jq '.cache'

# Warm critical caches
curl -X POST http://localhost:3000/cache/warm

# Adjust TTL values based on usage patterns
```

## Disaster Recovery

### Backup Procedures

#### Configuration Backup
```bash
# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz config/

# Backup to remote location
scp config-backup-*.tar.gz backup-server:/backups/personal-pipeline/
```

#### Data Backup
```bash
# Export cached data (if persistent cache enabled)
redis-cli --rdb dump.rdb

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

### Recovery Procedures

#### System Recovery from Backup
1. Stop current service: `npm run stop`
2. Restore configuration: `tar -xzf config-backup-latest.tar.gz`
3. Validate configuration: `npm run validate-config`
4. Start service: `npm start`
5. Verify health: `npm run health:check`

#### Database Recovery
1. Restore Redis data: `redis-cli --rdb dump.rdb`
2. Warm caches: `curl -X POST http://localhost:3000/cache/warm`
3. Verify cache health: `npm run health:cache`

### Emergency Contacts

#### Escalation Path
1. **Level 1**: DevOps Engineer (Immediate response)
2. **Level 2**: Backend Lead (15 minutes)
3. **Level 3**: System Architect (30 minutes)
4. **Level 4**: Platform Team Lead (1 hour)

#### Communication Channels
- **Slack**: #personal-pipeline-alerts
- **Email**: devops-team@company.com
- **Phone**: Emergency escalation tree
- **Status Page**: status.company.com

## Performance Targets

### Service Level Objectives (SLOs)

#### Availability
- **Target**: 99.9% uptime (8.7 hours downtime/year)
- **Measurement**: Health check success rate
- **Alert Threshold**: <99.5% over 1 hour

#### Response Time
- **Target**: P95 < 500ms for cached requests
- **Target**: P95 < 2000ms for uncached requests
- **Measurement**: MCP tool response times
- **Alert Threshold**: P95 > 2000ms over 5 minutes

#### Throughput
- **Target**: 50+ concurrent requests
- **Target**: 500+ queries/minute peak capacity
- **Measurement**: Request rate metrics
- **Alert Threshold**: <10 req/s with active traffic

#### Cache Performance
- **Target**: >80% cache hit rate
- **Target**: <50ms cache response time
- **Measurement**: Cache metrics
- **Alert Threshold**: <50% hit rate over 15 minutes

#### Error Rate
- **Target**: <1% error rate
- **Measurement**: Failed request percentage
- **Alert Threshold**: >5% error rate over 5 minutes

### Capacity Planning

#### Current Baseline
- **Memory**: 512MB typical, 1GB peak
- **CPU**: 2 cores typical, 4 cores peak
- **Storage**: 10GB for logs and cache
- **Network**: 100Mbps typical

#### Scaling Triggers
- **Memory**: >1.5GB sustained for 15 minutes
- **CPU**: >80% sustained for 10 minutes
- **Response Time**: P95 >2s for 15 minutes
- **Error Rate**: >5% for 10 minutes

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: "Cache service not available"
**Cause**: Redis connection failure  
**Solution**: Check Redis server, verify connection string, restart if needed

#### Issue: "Source adapter timeout"
**Cause**: Network connectivity or source service issues  
**Solution**: Check network, verify source service health, adjust timeout settings

#### Issue: "High memory usage"
**Cause**: Memory leaks or large cache data  
**Solution**: Restart service, review cache TTL settings, check for memory leaks

#### Issue: "MCP tools not responding"
**Cause**: Source adapter failures or configuration issues  
**Solution**: Check source health, validate configuration, restart server

### Log Analysis

#### Important Log Patterns
```bash
# Connection errors
grep "connection.*error" logs/app.log

# Performance issues
grep "execution.*exceeded" logs/app.log

# Cache issues
grep "cache.*error" logs/app.log

# Authentication failures
grep "auth.*failed" logs/app.log
```

#### Log Rotation
```bash
# Archive old logs
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;

# Clean up old archives
find logs/ -name "*.log.gz" -mtime +30 -delete
```

## Security Procedures

### Access Control
- All API endpoints require authentication in production
- Health checks available without authentication for monitoring
- Administrative endpoints require elevated privileges

### Credential Management
- Store credentials in environment variables
- Rotate credentials every 90 days
- Use least privilege principle for service accounts

### Security Monitoring
```bash
# Check for security alerts
grep -i "security\|auth\|unauthorized" logs/app.log

# Monitor failed authentication attempts
grep "auth.*failed" logs/app.log | wc -l
```

## Testing Procedures

### Health Check Testing
```bash
# Test all health endpoints
./test-health-endpoints.sh

# Verify response formats
npm run test:integration
```

### Performance Testing
```bash
# Baseline performance test
npm run benchmark

# Load testing
npm run load-test

# Validate performance targets
npm run performance:validate:strict
```

### Integration Testing
```bash
# Test MCP tools functionality
npm run test-mcp

# Test source adapters
npm run test:integration:sources

# End-to-end testing
npm run test:e2e
```

---

**Document Maintenance:**
- Review quarterly for accuracy
- Update procedures based on incidents
- Version control all changes
- Validate procedures during testing