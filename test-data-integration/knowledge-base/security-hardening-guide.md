# Security Hardening Guide

## Overview
Comprehensive security hardening procedures for infrastructure and applications.

## Operating System Hardening

### User Account Security
```bash
# Disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Require complex passwords
apt-get install libpam-pwquality

# Set password policies
echo "minlen=12" >> /etc/security/pwquality.conf
echo "minclass=3" >> /etc/security/pwquality.conf
```

### Network Security
```bash
# Configure firewall
ufw enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Disable unnecessary services
systemctl disable telnet
systemctl disable ftp
systemctl disable rsh
```

### File System Security
```bash
# Set proper permissions
chmod 700 /root
chmod 755 /etc
chmod 644 /etc/passwd
chmod 600 /etc/shadow

# Enable file integrity monitoring
apt-get install aide
aideinit
```

## Application Security

### Web Application Security
- Input validation and sanitization
- Output encoding for XSS prevention
- SQL injection prevention
- CSRF token implementation
- Secure session management

### API Security
```yaml
# Rate limiting configuration
rate_limiting:
  requests_per_minute: 100
  burst_size: 20
  block_duration: 300

# Authentication requirements
authentication:
  require_api_key: true
  token_expiration: 3600
  refresh_token_rotation: true
```

### Database Security
```sql
-- Create application user with limited privileges
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'SecurePassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'appuser'@'localhost';

-- Enable SSL connections
REQUIRE SSL;

-- Configure audit logging
SET GLOBAL log_queries_not_using_indexes = ON;
SET GLOBAL slow_query_log = ON;
```

## Network Security

### TLS/SSL Configuration
```nginx
# Nginx SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
```

### Network Segmentation
- DMZ for public-facing services
- Internal network isolation
- Database tier separation
- Administrative network segregation

## Monitoring and Compliance

### Security Monitoring
```yaml
# SIEM configuration
security_events:
  - failed_login_attempts
  - privilege_escalation
  - file_system_changes
  - network_anomalies
  - malware_detection

alert_thresholds:
  failed_logins: 5_per_minute
  privilege_escalation: immediate
  suspicious_network: immediate
```

### Compliance Standards
- **SOC 2**: Service organization controls
- **PCI DSS**: Payment card industry standards
- **GDPR**: General data protection regulation
- **HIPAA**: Health insurance portability
- **ISO 27001**: Information security management

## Incident Response Integration

### Security Event Classification
- **P1 Critical**: Active attack or data breach
- **P2 High**: Security control failure
- **P3 Medium**: Policy violation
- **P4 Low**: Informational security event

### Response Procedures
1. Immediate containment
2. Evidence preservation
3. Impact assessment
4. Remediation actions
5. Post-incident review

## Automation and Tooling

### Security Scanning
```bash
# Vulnerability scanning
nmap -sV --script vuln target-host

# Web application scanning
nikto -h http://target-application

# Configuration auditing
lynis audit system
```

### Continuous Security
- Automated vulnerability scanning
- Configuration drift detection
- Security patch management
- Compliance monitoring
- Threat intelligence integration
