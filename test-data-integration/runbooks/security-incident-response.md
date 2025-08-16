# Security Incident Response Protocol

## Overview
Immediate response procedures for confirmed or suspected security incidents.

## Alert Criteria
- **Alert Type**: security_breach, unauthorized_access, malware_detected
- **Severity**: Critical (confirmed breach), High (suspicious activity)
- **Affected Systems**: Authentication servers, user databases, API gateways

## Immediate Response (First 15 Minutes)

### Step 1: Incident Containment
```bash
# Block suspicious IP addresses
sudo iptables -A INPUT -s <SUSPICIOUS_IP> -j DROP

# Disable compromised user accounts
curl -X POST /api/users/<USER_ID>/disable

# Isolate affected systems
sudo iptables -A OUTPUT -d <AFFECTED_SERVER> -j DROP
```

### Step 2: Evidence Preservation
```bash
# Capture network traffic
sudo tcpdump -w /tmp/incident-$(date +%Y%m%d_%H%M%S).pcap

# Preserve system logs
sudo cp /var/log/auth.log /tmp/auth-backup-$(date +%Y%m%d_%H%M%S).log
sudo cp /var/log/syslog /tmp/syslog-backup-$(date +%Y%m%d_%H%M%S).log
```

### Step 3: Immediate Assessment
```bash
# Check for unauthorized logins
sudo last -x | head -50

# Review recent file modifications
sudo find /etc /var/www -type f -mtime -1 -ls

# Check running processes
ps aux | grep -v "\[.*\]"
```

## Communication Protocol

### Internal Notification (Immediate)
1. **Security Team**: security@company.com
2. **Incident Commander**: incidents@company.com
3. **Executive Team**: exec-oncall@company.com

### External Notification (If Required)
1. Law enforcement (if criminal activity suspected)
2. Regulatory bodies (if PII/PHI involved)
3. Customers (if data breach confirmed)

## Escalation Criteria
- Confirmed data exfiltration
- Ransomware detected
- Privilege escalation confirmed
- Customer data accessed
- Critical infrastructure compromised

## Recovery Checklist
- [ ] Threat eliminated/contained
- [ ] All compromised accounts secured
- [ ] Affected systems patched/rebuilt
- [ ] Monitoring enhanced
- [ ] Incident timeline documented
- [ ] Post-incident review scheduled

## Post-Incident Requirements
1. Forensic analysis completion
2. Root cause determination
3. Security improvements implemented
4. Incident report filed
5. Compliance notifications sent
