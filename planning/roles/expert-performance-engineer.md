# Performance Engineer

## Role Overview
**Position**: Scale Testing & Optimization Specialist  
**Commitment**: 0.4 FTE for weeks 10-12 (3 weeks)  
**Phase Focus**: Phase 4  
**Team Role**: Performance and scalability specialist  

## Core Responsibilities
- Performance testing framework development
- Load testing and capacity planning
- Database and cache optimization
- Horizontal scaling implementation
- Performance regression testing
- Bottleneck identification and optimization
- Performance monitoring and alerting

## Required Qualifications

### Performance Skills
- **3+ years performance testing** and optimization
- **Load Testing Tools** - JMeter, k6, Artillery, or similar
- **Database Performance** - Query optimization, indexing
- **Caching Strategies** - Redis optimization, cache patterns
- **Profiling Tools** - Application and system profiling
- **Horizontal Scaling** - Load balancing, auto-scaling

### Technical Skills
- **System Architecture** - Distributed systems, microservices
- **Monitoring Tools** - APM, metrics collection, alerting
- **Performance Analysis** - Bottleneck identification, root cause analysis
- **Capacity Planning** - Resource forecasting, growth modeling
- **Optimization** - Code optimization, system tuning

## Preferred Qualifications
- Experience with **real-time systems** and low-latency requirements
- Knowledge of **memory optimization** and garbage collection
- Background in **distributed system** performance
- Experience with **auto-scaling** and predictive scaling
- Understanding of **performance monitoring** and alerting
- **Cloud platform** performance optimization experience

## Key Deliverables by Phase

### Phase 4 (Weeks 10-12)
- Comprehensive performance testing framework
- Load testing scenarios for all critical paths
- Database optimization and indexing strategy
- Cache optimization and warming strategies
- Horizontal scaling implementation and testing
- Performance monitoring dashboard
- Capacity planning and growth projections
- Performance regression test suite
- Optimization recommendations and implementation

## Performance Testing Framework

### Load Testing Scenarios
- **Normal Load**: Expected operational traffic patterns
- **Peak Load**: Maximum expected concurrent users
- **Stress Testing**: Beyond normal capacity limits
- **Spike Testing**: Sudden traffic increases
- **Volume Testing**: Large data set processing
- **Endurance Testing**: Extended duration stability

### Performance Metrics
- **Response Time**: P50, P95, P99 latencies
- **Throughput**: Requests per second, concurrent users
- **Error Rate**: Failed requests, timeout percentage
- **Resource Utilization**: CPU, memory, disk, network
- **Database Performance**: Query time, connection pool usage
- **Cache Performance**: Hit rate, eviction rate

## Performance Targets

### Response Time Requirements
- **Critical runbooks**: <200ms (cached)
- **Standard procedures**: <500ms
- **Cold retrievals**: <2 seconds
- **Bulk operations**: <5 seconds
- **Search queries**: <300ms (semantic), <100ms (cached)

### Throughput Requirements
- **Concurrent queries**: 50+ simultaneous
- **Peak load**: 500 queries/minute
- **Sustained load**: 200 queries/minute
- **Burst capacity**: 1000 queries/minute for 5 minutes

### Resource Limits
- **Memory usage**: <2GB resident per instance
- **CPU utilization**: <70% average, <90% peak
- **Database connections**: <100 concurrent
- **Cache memory**: <1GB Redis per instance

## Optimization Strategies

### Application Optimization
- **Code Profiling**: Identify CPU and memory hotspots
- **Algorithm Optimization**: Improve time complexity
- **Memory Management**: Reduce allocation, prevent leaks
- **Async Operations**: Non-blocking I/O patterns
- **Connection Pooling**: Database and HTTP connections
- **Caching**: Multi-level caching strategy

### Database Optimization
- **Query Optimization**: Index usage, query plans
- **Index Strategy**: Composite indexes, partial indexes
- **Connection Pooling**: Optimal pool sizing
- **Read Replicas**: Read query distribution
- **Partitioning**: Table partitioning for large datasets
- **Query Caching**: Prepared statements, result caching

### Cache Optimization
- **Cache Hierarchy**: L1 (memory), L2 (Redis), L3 (database)
- **Cache Patterns**: Cache-aside, write-through, write-behind
- **Eviction Policies**: LRU, TTL-based eviction
- **Cache Warming**: Proactive cache population
- **Cache Monitoring**: Hit rates, memory usage

## Scaling Architecture

### Horizontal Scaling
- **Load Balancing**: Round-robin, least connections
- **Auto-scaling**: CPU/memory based scaling policies
- **Service Discovery**: Dynamic service registration
- **Database Scaling**: Read replicas, sharding strategies
- **Cache Scaling**: Redis cluster, consistent hashing

### Performance Monitoring
- **Real-time Metrics**: Live performance dashboards
- **Alerting**: Performance degradation alerts
- **Trend Analysis**: Performance over time
- **Anomaly Detection**: Unusual performance patterns
- **Capacity Alerts**: Resource utilization thresholds

## Testing Infrastructure

### Load Testing Environment
- **Test Data**: Realistic data sets and scenarios
- **Test Clients**: Distributed load generation
- **Network Simulation**: Latency and bandwidth variation
- **Monitoring**: Real-time performance observation
- **Automation**: Continuous performance testing

### Performance Benchmarks
- **Baseline Performance**: Initial performance measurements
- **Regression Testing**: Performance change detection
- **Comparative Analysis**: Before/after optimization
- **Trend Tracking**: Performance over time
- **Goal Validation**: Target achievement verification

## Capacity Planning

### Growth Modeling
- **Usage Patterns**: Historical growth analysis
- **Forecasting**: Future capacity requirements
- **Scaling Timeline**: When to scale resources
- **Cost Analysis**: Performance vs. cost optimization
- **Risk Assessment**: Capacity shortage probability

### Resource Planning
- **Compute Resources**: CPU, memory requirements
- **Storage**: Database and cache storage needs
- **Network**: Bandwidth and latency requirements
- **Database**: Connection and query capacity
- **Cache**: Memory and throughput capacity

## Performance Monitoring Dashboard

### Key Metrics Display
- **Response Times**: Real-time latency charts
- **Throughput**: Requests per second graphs
- **Error Rates**: Error percentage and trends
- **Resource Usage**: CPU, memory, disk utilization
- **Cache Performance**: Hit rates and memory usage
- **Database**: Query times and connection usage

### Alerting Rules
- **Response Time**: >500ms P95 for 2 minutes
- **Error Rate**: >1% errors for 1 minute
- **Resource Usage**: >80% CPU/memory for 5 minutes
- **Cache Hit Rate**: <70% for 10 minutes
- **Database**: >100ms average query time

## Success Metrics
- **Performance Targets**: All response time targets met
- **Scalability**: System handles 10x baseline load
- **Stability**: Zero performance degradation under load
- **Efficiency**: Optimal resource utilization achieved
- **Monitoring**: Complete performance visibility
- **Automation**: Automated scaling and alerting functional

## Collaboration Requirements
- **Daily**: Performance metrics review with team
- **Weekly**: Optimization progress and planning
- **Bi-weekly**: Capacity planning and scaling decisions
- **Cross-functional**: Work with DevOps, backend, and AI/ML teams

## Technical Environment
- **Load Testing**: k6, Artillery, or JMeter
- **Monitoring**: Prometheus, Grafana, New Relic, DataDog
- **Profiling**: Node.js profiler, Chrome DevTools, clinic.js
- **Database**: PostgreSQL EXPLAIN, pgbench
- **Cache**: Redis CLI, redis-cli --latency
- **Cloud**: Cloud platform monitoring tools

## Tools and Technologies
- **Load Testing**: k6 (preferred), JMeter, Artillery
- **APM**: New Relic, DataDog, or AppDynamics
- **Profiling**: clinic.js, 0x, Chrome DevTools
- **Database**: pgbench, sysbench, custom scripts
- **Cache**: redis-benchmark, memtier_benchmark
- **Infrastructure**: Terraform, Kubernetes HPA

## Optimization Process
1. **Baseline Measurement**: Current performance assessment
2. **Bottleneck Identification**: Performance profiling and analysis
3. **Optimization Implementation**: Code and infrastructure changes
4. **Validation Testing**: Performance improvement verification
5. **Monitoring Setup**: Continuous performance tracking
6. **Documentation**: Optimization procedures and results

## Compensation Range
**Annual Salary**: $120K - $150K USD  
**3-Week Project**: ~$7K - $9K USD  

## Ideal Candidate Profile
An experienced performance engineer with deep understanding of system optimization, load testing expertise, and ability to identify and resolve performance bottlenecks in distributed systems. Should have strong analytical skills and experience with production performance optimization.