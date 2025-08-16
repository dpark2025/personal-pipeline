# Application Performance Degradation Response

## Overview
Systematic approach to diagnosing and resolving application performance issues.

## Alert Criteria
- **Alert Type**: cpu_high, response_time_high, throughput_low
- **Severity**: Medium (>70% CPU), High (>85% CPU)
- **Affected Systems**: Web applications, API servers, load balancers

## Performance Investigation

### Step 1: System Metrics Analysis
```bash
# CPU utilization analysis
top -n 1 -b | head -20
iostat -x 1 5

# Memory usage patterns
vmstat 5 5

# Network performance
netstat -i
ss -tuln | wc -l
```

### Step 2: Application Metrics
```bash
# Application response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8080/health"

# Database query performance
mysql -e "SHOW PROCESSLIST;" | grep -v Sleep

# Connection pool status
curl -s http://localhost:8080/metrics/connections
```

### Step 3: Load Distribution
```bash
# Check load balancer status
curl -s http://loadbalancer:8080/status

# Verify service discovery
dig +short service.discovery.internal

# Connection distribution
netstat -an | grep :80 | wc -l
```

## Immediate Mitigation

### Scale Up Resources
```bash
# Increase application instances
kubectl scale deployment webapp --replicas=6

# Adjust resource limits
kubectl patch deployment webapp -p '{"spec":{"template":{"spec":{"containers":[{"name":"webapp","resources":{"limits":{"cpu":"2","memory":"4Gi"}}}]}}}}'
```

### Optimize Database
```bash
# Clear query cache
mysql -e "RESET QUERY CACHE;"

# Analyze slow queries
mysql -e "SELECT * FROM INFORMATION_SCHEMA.PROCESSLIST WHERE TIME > 5;"
```

## Performance Thresholds
- **CPU Usage**: >85% sustained for 5+ minutes
- **Response Time**: >2 seconds for 95th percentile
- **Throughput**: <50% of baseline for 10+ minutes
- **Error Rate**: >5% for any endpoint

## Recovery Validation
- [ ] CPU usage below 70%
- [ ] Response times under 1 second
- [ ] Error rate below 1%
- [ ] Throughput within 10% of baseline
- [ ] All health checks passing

## Optimization Actions
1. Database query optimization
2. Application profiling
3. Caching implementation
4. Resource allocation review
5. Load testing validation
