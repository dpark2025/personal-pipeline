# Application Performance Optimization

## Overview
Systematic approach to identifying, analyzing, and resolving performance bottlenecks.

## Performance Fundamentals

### Key Performance Indicators
- **Response Time**: Time to complete a request
- **Throughput**: Requests processed per unit time
- **Resource Utilization**: CPU, memory, I/O usage
- **Error Rate**: Percentage of failed requests

### Performance Testing Types
- **Load Testing**: Normal expected load
- **Stress Testing**: Beyond normal capacity
- **Spike Testing**: Sudden load increases
- **Volume Testing**: Large amounts of data
- **Endurance Testing**: Extended periods

## Application Layer Optimization

### Database Performance
```sql
-- Index optimization
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_order_date ON orders(created_at);

-- Query optimization
EXPLAIN ANALYZE SELECT u.name, COUNT(o.id) 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
WHERE u.active = true 
GROUP BY u.id;

-- Connection pooling
SET max_connections = 200;
SET shared_buffers = '256MB';
```

### Caching Strategies
```javascript
// Redis caching implementation
const redis = require('redis');
const client = redis.createClient();

async function getCachedData(key) {
    const cached = await client.get(key);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const data = await fetchFromDatabase(key);
    await client.setex(key, 3600, JSON.stringify(data));
    return data;
}
```

### Code Optimization
```javascript
// Async/await optimization
async function processUsers() {
    const users = await User.findAll();
    
    // Parallel processing
    const promises = users.map(user => processUser(user));
    return Promise.all(promises);
}

// Memory optimization
function processLargeDataset(data) {
    // Stream processing instead of loading all data
    const stream = fs.createReadStream('large-file.csv');
    return stream
        .pipe(csv())
        .pipe(transform)
        .pipe(process.stdout);
}
```

## Infrastructure Optimization

### Web Server Tuning
```nginx
# Nginx optimization
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \.(css|js|png|jpg|jpeg|gif|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Application Server Tuning
```yaml
# Node.js PM2 configuration
apps:
  - name: api-server
    script: ./app.js
    instances: max
    exec_mode: cluster
    env:
      NODE_ENV: production
      NODE_OPTIONS: --max-old-space-size=4096
```

### Load Balancing
```yaml
# HAProxy configuration
frontend web_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/cert.pem
    redirect scheme https if !{ ssl_fc }
    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /health
    server web1 10.0.1.10:8080 check
    server web2 10.0.1.11:8080 check
```

## Monitoring and Profiling

### Application Profiling
```javascript
// Performance monitoring
const perf = require('perf_hooks').performance;

function measurePerformance(fn) {
    return function(...args) {
        const start = perf.now();
        const result = fn.apply(this, args);
        const end = perf.now();
        
        console.log(`Function ${fn.name} took ${end - start} milliseconds`);
        return result;
    };
}
```

### Database Monitoring
```sql
-- PostgreSQL performance monitoring
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Connection monitoring
SELECT 
    datname,
    numbackends,
    xact_commit,
    xact_rollback
FROM pg_stat_database;
```

### Infrastructure Monitoring
```bash
# System performance monitoring
iostat -x 1 5
vmstat 5 5
sar -u 1 10

# Network monitoring
netstat -i
ss -tuln
```

## Performance Optimization Checklist

### Database Optimization
- [ ] Proper indexing strategy
- [ ] Query optimization
- [ ] Connection pooling
- [ ] Read replicas for scaling
- [ ] Database partitioning
- [ ] Regular maintenance tasks

### Application Optimization
- [ ] Code profiling and optimization
- [ ] Caching implementation
- [ ] Asynchronous processing
- [ ] Resource pooling
- [ ] Memory leak prevention
- [ ] Bundle optimization

### Infrastructure Optimization
- [ ] Load balancing configuration
- [ ] CDN implementation
- [ ] Auto-scaling policies
- [ ] Resource allocation tuning
- [ ] Network optimization
- [ ] Storage performance tuning

## Continuous Performance Management

### Performance Testing Pipeline
1. Automated performance tests in CI/CD
2. Performance regression detection
3. Capacity planning analysis
4. Performance budget enforcement
5. Real user monitoring (RUM)

### Performance Culture
- Performance requirements in user stories
- Regular performance reviews
- Performance impact assessment
- Team performance training
- Performance-focused code reviews
