# Systematic Troubleshooting Methodology

## Overview
Structured approach to identifying, diagnosing, and resolving technical issues efficiently.

## Troubleshooting Framework

### 1. Problem Identification
- **Symptom Description**: What is happening?
- **Impact Assessment**: Who/what is affected?
- **Timeline**: When did it start?
- **Scope**: How widespread is the issue?

### 2. Information Gathering
- **System State**: Current status and metrics
- **Recent Changes**: Deployments, configurations
- **Error Messages**: Logs and user reports
- **Environmental Factors**: Load, resource usage

### 3. Hypothesis Formation
- **Root Cause Theories**: Possible explanations
- **Probability Assessment**: Likelihood ranking
- **Testing Strategy**: How to validate theories
- **Impact Consideration**: Risk of investigative actions

### 4. Testing and Validation
- **Controlled Testing**: Isolated environment tests
- **Progressive Validation**: Incremental verification
- **Documentation**: Record findings and attempts
- **Rollback Planning**: Undo strategies

## Systematic Investigation Process

### Phase 1: Initial Assessment (5 minutes)
```bash
# Quick system overview
uptime
df -h
free -h
ps aux | head -20

# Network connectivity
ping -c 3 8.8.8.8
curl -I http://localhost:8080/health

# Recent system activity
tail -50 /var/log/syslog
journalctl -u service-name --since "10 minutes ago"
```

### Phase 2: Detailed Analysis (15 minutes)
```bash
# Performance metrics
iostat -x 1 5
vmstat 5 5
netstat -tulpn

# Application-specific checks
curl -s http://localhost:8080/metrics
docker logs container-name --tail 100
kubectl describe pod pod-name
```

### Phase 3: Deep Investigation (30+ minutes)
```bash
# System trace analysis
strace -p PID -f -e trace=network
tcpdump -i any -n -s 0 host problematic-host

# Database investigation
mysql -e "SHOW PROCESSLIST;"
pg_stat_activity query for PostgreSQL

# Memory and CPU profiling
perf top -p PID
jstack PID (for Java applications)
```

## Common Problem Categories

### Application Issues

#### Performance Problems
```bash
# Identify bottlenecks
top -p APPLICATION_PID
lsof -p APPLICATION_PID
strace -c -p APPLICATION_PID

# Database performance
EXPLAIN ANALYZE SELECT * FROM slow_table;
SHOW ENGINE INNODB STATUS;
```

#### Memory Issues
```bash
# Memory usage analysis
cat /proc/PID/status | grep -E "(VmSize|VmRSS|VmData|VmStk)"
smem -p
valgrind --tool=memcheck --leak-check=full APPLICATION

# Java heap analysis
jmap -histo PID
jstat -gc PID 5s 10
```

#### Connection Issues
```bash
# Connection tracking
netstat -an | grep :8080
ss -tulpn | grep :8080
lsof -i :8080

# Connection pool status
curl -s http://localhost:8080/actuator/metrics/hikaricp.connections
```

### Infrastructure Issues

#### Network Problems
```bash
# Network diagnostics
traceroute destination-host
mtr -r -c 10 destination-host
iperf3 -c destination-host

# DNS resolution
nslookup hostname
dig @8.8.8.8 hostname
host hostname
```

#### Storage Issues
```bash
# Disk analysis
iotop -o
iostat -x 1 5
lsblk -f

# File system checks
fsck /dev/device
tune2fs -l /dev/device
```

#### Service Dependencies
```bash
# Service status
systemctl status service-name
journalctl -u service-name -f

# Dependency chain
systemctl list-dependencies service-name
systemctl show service-name
```

## Troubleshooting Tools and Techniques

### Log Analysis
```bash
# Centralized log analysis
grep -r "ERROR" /var/log/
journalctl --since "1 hour ago" --until now
tail -f /var/log/application.log | grep ERROR

# Log correlation
awk '/ERROR/{print $1, $2, $NF}' /var/log/application.log
sed -n '/2023-12-01 10:00/,/2023-12-01 11:00/p' /var/log/application.log
```

### Performance Profiling
```bash
# CPU profiling
perf record -g ./application
perf report

# Memory profiling
valgrind --tool=massif ./application
ms_print massif.out.PID

# I/O profiling
iotop -a -o
iftop -i interface
```

### Network Analysis
```bash
# Packet capture
tcpdump -i any -s 0 -w capture.pcap host problematic-host
wireshark capture.pcap

# Network flow analysis
netstat -i
ss -tuln
nload interface-name
```

## Documentation and Communication

### Issue Documentation Template
```markdown
## Issue Summary
- **Problem**: Brief description
- **Impact**: Affected users/services
- **Severity**: Critical/High/Medium/Low
- **Start Time**: When issue began

## Investigation
- **Symptoms**: What was observed
- **Investigation Steps**: What was checked
- **Findings**: Key discoveries
- **Root Cause**: Confirmed or suspected cause

## Resolution
- **Fix Applied**: What was done
- **Verification**: How success was confirmed
- **Rollback Plan**: If fix fails
- **Follow-up**: Preventive measures
```

### Escalation Criteria
- **Immediate**: Critical system down, data loss
- **1 Hour**: High impact, multiple users affected
- **4 Hours**: Medium impact, single service affected
- **Next Day**: Low impact, non-critical issues

## Prevention and Improvement

### Root Cause Analysis
1. **Problem Statement**: Clear issue description
2. **Timeline**: Sequence of events
3. **Contributing Factors**: What allowed the issue
4. **Root Cause**: Fundamental underlying cause
5. **Corrective Actions**: Immediate fixes
6. **Preventive Measures**: Long-term improvements

### Knowledge Management
- Document common issues and solutions
- Maintain troubleshooting runbooks
- Share lessons learned across teams
- Regular review and update procedures
- Create automated diagnostic tools

### Continuous Improvement
- Post-incident reviews
- Process refinement
- Tool enhancement
- Training and skill development
- Proactive monitoring improvements
