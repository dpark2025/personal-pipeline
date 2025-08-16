# Service Restart Procedure

## Purpose
Systematic service restart with minimal downtime and proper validation.

## Prerequisites
- Service access and restart permissions
- Knowledge of service dependencies
- Access to monitoring and health check systems

## Procedure Steps

### Step 1: Pre-Restart Assessment (3 minutes)
```bash
# Check current service status
systemctl status service-name

# Verify service health
curl -f http://localhost:8080/health

# Check service dependencies
systemctl list-dependencies service-name

# Review recent logs
journalctl -u service-name --since "15 minutes ago"
```

**Expected Outcome**: Understanding of current service state
**Success Criteria**: Service status documented and dependencies verified

### Step 2: Graceful Shutdown (2 minutes)
```bash
# Send graceful shutdown signal
sudo systemctl stop service-name

# Wait for graceful shutdown (up to 30 seconds)
sleep 30

# Verify service stopped
systemctl is-active service-name
ps aux | grep service-name
```

**Expected Outcome**: Service cleanly stopped without force
**Success Criteria**: Service process terminated gracefully

### Step 3: Pre-Start Verification (2 minutes)
```bash
# Check configuration validity
sudo nginx -t  # for nginx
sudo systemctl status service-name  # for systemd services

# Verify file permissions
ls -la /etc/service-name/
ls -la /var/log/service-name/

# Check disk space and resources
df -h
free -h
```

**Expected Outcome**: Configuration valid and resources available
**Success Criteria**: No configuration errors, sufficient resources

### Step 4: Service Start (1 minute)
```bash
# Start the service
sudo systemctl start service-name

# Verify service started
systemctl is-active service-name
systemctl status service-name
```

**Expected Outcome**: Service started successfully
**Success Criteria**: Service status shows active/running

### Step 5: Post-Start Validation (5 minutes)
```bash
# Health check validation
curl -f http://localhost:8080/health

# Functional testing
curl -f http://localhost:8080/api/test

# Monitor logs for errors
journalctl -u service-name -f

# Check performance metrics
curl -s http://localhost:8080/metrics
```

**Expected Outcome**: Service fully operational with normal performance
**Success Criteria**: All health checks pass, no errors in logs

## Success Criteria
- [ ] Service restarted without errors
- [ ] All health checks passing
- [ ] Performance metrics normal
- [ ] No error logs generated
- [ ] Dependent services unaffected
- [ ] Total downtime under 2 minutes

## Rollback Plan
If restart fails:
1. Check service logs immediately
2. Attempt restart with previous configuration
3. If persistent failure, escalate to engineering team
4. Consider switching to backup service instance

## Monitoring Validation
- Response time within normal range
- Error rate remains low
- Resource utilization normal
- Dependent service health maintained

## Post-Procedure Actions
1. Monitor service for 15 minutes
2. Update restart documentation if issues found
3. Review logs for optimization opportunities
4. Update team on restart results
