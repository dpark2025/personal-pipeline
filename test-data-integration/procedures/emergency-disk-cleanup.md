# Emergency Disk Space Cleanup Procedure

## Purpose
Immediate disk space recovery for critical situations when disk usage exceeds 90%.

## Prerequisites
- Root or sudo access to the affected system
- Verified backup of critical data
- Monitoring system alerts acknowledged

## Procedure Steps

### Step 1: Assess Current Situation (2 minutes)
```bash
# Check disk usage across all filesystems
df -h

# Identify largest directories (top 10)
du -sh /var/* | sort -rh | head -10
du -sh /tmp/* | sort -rh | head -10
du -sh /opt/* | sort -rh | head -10
```

**Expected Outcome**: Clear understanding of disk usage distribution
**Success Criteria**: Disk usage report generated and largest consumers identified

### Step 2: Emergency Cleanup - Temporary Files (3 minutes)
```bash
# Clean system temporary files
sudo find /tmp -type f -atime +7 -delete
sudo find /var/tmp -type f -atime +7 -delete

# Clean user temporary files
sudo find /tmp -name "*.tmp" -type f -delete
sudo find /tmp -name "core.*" -type f -delete

# Verify cleanup results
df -h
```

**Expected Outcome**: Recovery of 1-5GB from temporary files
**Success Criteria**: Disk usage reduced by at least 2%

### Step 3: Log File Cleanup (5 minutes)
```bash
# Identify large log files
find /var/log -name "*.log" -size +100M -ls

# Archive and compress old logs
sudo find /var/log -name "*.log" -type f -mtime +30 -exec gzip {} \;

# Remove very old compressed logs
sudo find /var/log -name "*.gz" -type f -mtime +90 -delete

# Clear journal logs older than 7 days
sudo journalctl --vacuum-time=7d
```

**Expected Outcome**: Recovery of 5-20GB from log files
**Success Criteria**: Log disk usage reduced significantly

### Step 4: Package Cache Cleanup (2 minutes)
```bash
# Clean package manager caches
sudo apt-get clean
sudo apt-get autoremove

# Clean snap packages (if applicable)
sudo snap refresh
sudo snap remove --purge $(snap list --all | awk '/disabled/{print $1}')

# Verify cleanup
df -h
```

**Expected Outcome**: Recovery of 1-10GB from package caches
**Success Criteria**: Package cache space recovered

### Step 5: Verification and Monitoring (3 minutes)
```bash
# Final disk usage check
df -h

# Verify critical services are running
systemctl status nginx
systemctl status mysql
systemctl status application-service

# Check application logs for errors
tail -50 /var/log/application.log
```

**Expected Outcome**: Disk usage below 85%, all services operational
**Success Criteria**: System stable and monitoring alerts cleared

## Success Criteria
- [ ] Disk usage reduced below 85%
- [ ] All critical services remain operational
- [ ] No application errors introduced
- [ ] Monitoring alerts cleared
- [ ] Total execution time under 15 minutes

## Rollback Plan
If cleanup causes issues:
1. Stop cleanup immediately
2. Restore from backup if data was accidentally deleted
3. Restart affected services
4. Escalate to senior engineering team

## Post-Procedure Actions
1. Update monitoring thresholds
2. Schedule automated cleanup jobs
3. Review disk growth trends
4. Document lessons learned
5. Plan capacity expansion if needed

## Emergency Contacts
- **Primary**: Infrastructure Team (infrastructure@company.com)
- **Escalation**: Engineering Manager (manager@company.com)
- **Emergency**: 24/7 Oncall (+1-555-ONCALL)
