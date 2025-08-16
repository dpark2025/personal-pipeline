# Memory Leak Investigation and Resolution

## Overview
Systematic approach to identifying and resolving memory leaks in production systems.

## Alert Criteria
- **Alert Type**: memory_leak, high_memory, oom_killer
- **Severity**: High (>80% memory), Critical (>90% memory)
- **Affected Systems**: Java applications, Node.js services, databases

## Investigation Procedure

### Step 1: Initial Assessment
```bash
# Check overall memory usage
free -h

# Identify memory-consuming processes
ps aux --sort=-%mem | head -20

# Check for OOM killer activity
dmesg | grep -i "killed process"
```

### Step 2: Application-Specific Analysis

#### For Java Applications
```bash
# Generate heap dump
jcmd <PID> GC.run_finalization
jcmd <PID> VM.classloader_stats

# Analyze garbage collection
jstat -gc <PID> 5s 10
```

#### For Node.js Applications
```bash
# Generate heap snapshot
kill -USR2 <PID>

# Monitor memory usage
node --inspect-brk=0.0.0.0:9229 app.js
```

### Step 3: Immediate Mitigation
```bash
# Restart problematic service
sudo systemctl restart <service-name>

# Temporarily increase memory limits
echo 'vm.overcommit_memory=1' >> /etc/sysctl.conf
sysctl -p
```

## Escalation Thresholds
- Memory usage >95% for more than 5 minutes
- OOM killer activity detected
- Critical services becoming unresponsive
- Memory growth rate >10% per hour

## Recovery Validation
- [ ] Memory usage stabilized below 70%
- [ ] No OOM killer activity
- [ ] All services responding normally
- [ ] Application performance metrics normal

## Long-term Actions
1. Implement memory profiling
2. Set up heap dump automation
3. Review application code for leaks
4. Optimize garbage collection settings
