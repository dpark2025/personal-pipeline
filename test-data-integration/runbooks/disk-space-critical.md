# Disk Space Critical Response

## Overview
This runbook provides immediate response procedures for critical disk space alerts.

## Alert Criteria
- **Alert Type**: disk_space, disk_full, filesystem_full
- **Severity**: Critical (>90% usage), High (>80% usage)
- **Affected Systems**: Web servers, databases, application servers

## Immediate Actions

### Step 1: Assess Situation
```bash
# Check disk usage across all mounted filesystems
df -h

# Identify largest directories
du -sh /var/* | sort -rh | head -10
```

### Step 2: Emergency Cleanup
```bash
# Clean temporary files
sudo find /tmp -type f -atime +7 -delete

# Clean log files older than 30 days
sudo find /var/log -name "*.log" -type f -mtime +30 -delete

# Clean package cache
sudo apt-get clean
```

### Step 3: Monitor Progress
```bash
# Watch disk usage in real-time
watch -n 5 'df -h | grep -E "(Filesystem|/dev/)"'
```

## Escalation Criteria
- Disk usage remains above 85% after emergency cleanup
- Critical system processes begin failing
- Unable to free sufficient space within 15 minutes

## Recovery Verification
- [ ] Disk usage below 80%
- [ ] All critical services operational
- [ ] Monitoring alerts cleared
- [ ] Application response times normal

## Post-Incident Actions
1. Review disk growth trends
2. Implement automated cleanup scripts
3. Update monitoring thresholds
4. Document lessons learned

## Contact Information
- **Primary**: Infrastructure Team (infrateam@company.com)
- **Escalation**: Engineering Manager (manager@company.com)
- **Emergency**: 24/7 Oncall (+1-555-ONCALL)
