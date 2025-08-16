#!/usr/bin/env tsx
/**
 * Generate Integration Test Data
 *
 * Creates realistic test data for integration testing across all 4 adapters,
 * including runbooks, knowledge base articles, procedures, and configuration files.
 *
 * Authored by: Integration Specialist
 * Date: 2025-08-15
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Test Data Templates
// ============================================================================

interface TestDataSet {
  runbooks: RunbookTestData[];
  knowledgeBase: KnowledgeBaseTestData[];
  procedures: ProcedureTestData[];
  configurations: ConfigurationTestData[];
}

interface RunbookTestData {
  id: string;
  filename: string;
  title: string;
  content: string;
  metadata: {
    alert_types: string[];
    severity_levels: string[];
    systems: string[];
    confidence_score: number;
    tags: string[];
  };
}

interface KnowledgeBaseTestData {
  id: string;
  filename: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

interface ProcedureTestData {
  id: string;
  filename: string;
  title: string;
  content: string;
  steps: string[];
  prerequisites: string[];
}

interface ConfigurationTestData {
  name: string;
  filename: string;
  content: string;
  description: string;
}

// ============================================================================
// Test Data Generator
// ============================================================================

export class IntegrationTestDataGenerator {
  private baseDir: string;
  private testDataDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(__dirname, '..');
    this.testDataDir = path.join(this.baseDir, 'test-data-integration');
  }

  async generateAllTestData(): Promise<void> {
    const spinner = ora('Generating integration test data...').start();

    try {
      // Create directory structure
      await this.createDirectoryStructure();

      // Generate test data
      const testData = this.generateTestDataSet();

      // Write runbooks
      await this.writeRunbooks(testData.runbooks);
      spinner.text = 'Generated runbooks...';

      // Write knowledge base articles
      await this.writeKnowledgeBase(testData.knowledgeBase);
      spinner.text = 'Generated knowledge base...';

      // Write procedures
      await this.writeProcedures(testData.procedures);
      spinner.text = 'Generated procedures...';

      // Write configurations
      await this.writeConfigurations(testData.configurations);
      spinner.text = 'Generated configurations...';

      // Write adapter-specific test data
      await this.writeAdapterSpecificData();
      spinner.text = 'Generated adapter-specific data...';

      // Generate test scenarios file
      await this.writeTestScenarios();
      spinner.text = 'Generated test scenarios...';

      spinner.succeed(chalk.green('Integration test data generated successfully!'));
      
      console.log(chalk.cyan(`\nTest data location: ${this.testDataDir}`));
      console.log(chalk.gray('Use this data directory for integration testing with all adapters'));

    } catch (error) {
      spinner.fail(chalk.red('Failed to generate test data'));
      throw error;
    }
  }

  private async createDirectoryStructure(): Promise<void> {
    const directories = [
      this.testDataDir,
      path.join(this.testDataDir, 'runbooks'),
      path.join(this.testDataDir, 'knowledge-base'),
      path.join(this.testDataDir, 'procedures'),
      path.join(this.testDataDir, 'configurations'),
      path.join(this.testDataDir, 'github-test'),
      path.join(this.testDataDir, 'web-test'),
      path.join(this.testDataDir, 'confluence-test'),
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private generateTestDataSet(): TestDataSet {
    return {
      runbooks: this.generateRunbooks(),
      knowledgeBase: this.generateKnowledgeBase(),
      procedures: this.generateProcedures(),
      configurations: this.generateConfigurations(),
    };
  }

  // ========================================================================
  // Runbook Generation
  // ========================================================================

  private generateRunbooks(): RunbookTestData[] {
    return [
      {
        id: 'RB-DISK-001',
        filename: 'disk-space-critical.md',
        title: 'Disk Space Critical Response',
        content: this.generateDiskSpaceRunbook(),
        metadata: {
          alert_types: ['disk_space', 'disk_full', 'filesystem_full'],
          severity_levels: ['critical', 'high'],
          systems: ['web-server', 'database', 'application-server'],
          confidence_score: 0.95,
          tags: ['disk', 'storage', 'critical', 'emergency'],
        },
      },
      {
        id: 'RB-MEM-001',
        filename: 'memory-leak-investigation.md',
        title: 'Memory Leak Investigation and Resolution',
        content: this.generateMemoryLeakRunbook(),
        metadata: {
          alert_types: ['memory_leak', 'high_memory', 'oom_killer'],
          severity_levels: ['high', 'critical'],
          systems: ['java-app', 'node-app', 'database'],
          confidence_score: 0.87,
          tags: ['memory', 'leak', 'investigation', 'java'],
        },
      },
      {
        id: 'RB-SEC-001',
        filename: 'security-incident-response.md',
        title: 'Security Incident Response Protocol',
        content: this.generateSecurityIncidentRunbook(),
        metadata: {
          alert_types: ['security_breach', 'unauthorized_access', 'malware_detected'],
          severity_levels: ['critical', 'high'],
          systems: ['auth-server', 'user-database', 'api-gateway'],
          confidence_score: 0.93,
          tags: ['security', 'incident', 'breach', 'emergency'],
        },
      },
      {
        id: 'RB-PERF-001',
        filename: 'application-performance-degradation.md',
        title: 'Application Performance Degradation Response',
        content: this.generatePerformanceRunbook(),
        metadata: {
          alert_types: ['cpu_high', 'response_time_high', 'throughput_low'],
          severity_levels: ['medium', 'high'],
          systems: ['web-app', 'api-server', 'load-balancer'],
          confidence_score: 0.82,
          tags: ['performance', 'cpu', 'response-time', 'optimization'],
        },
      },
      {
        id: 'RB-NET-001',
        filename: 'network-connectivity-issues.md',
        title: 'Network Connectivity Troubleshooting',
        content: this.generateNetworkRunbook(),
        metadata: {
          alert_types: ['network_down', 'packet_loss', 'dns_failure'],
          severity_levels: ['medium', 'high', 'critical'],
          systems: ['network', 'dns-server', 'gateway'],
          confidence_score: 0.79,
          tags: ['network', 'connectivity', 'dns', 'troubleshooting'],
        },
      },
    ];
  }

  private generateDiskSpaceRunbook(): string {
    return `# Disk Space Critical Response

## Overview
This runbook provides immediate response procedures for critical disk space alerts.

## Alert Criteria
- **Alert Type**: disk_space, disk_full, filesystem_full
- **Severity**: Critical (>90% usage), High (>80% usage)
- **Affected Systems**: Web servers, databases, application servers

## Immediate Actions

### Step 1: Assess Situation
\`\`\`bash
# Check disk usage across all mounted filesystems
df -h

# Identify largest directories
du -sh /var/* | sort -rh | head -10
\`\`\`

### Step 2: Emergency Cleanup
\`\`\`bash
# Clean temporary files
sudo find /tmp -type f -atime +7 -delete

# Clean log files older than 30 days
sudo find /var/log -name "*.log" -type f -mtime +30 -delete

# Clean package cache
sudo apt-get clean
\`\`\`

### Step 3: Monitor Progress
\`\`\`bash
# Watch disk usage in real-time
watch -n 5 'df -h | grep -E "(Filesystem|/dev/)"'
\`\`\`

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
`;
  }

  private generateMemoryLeakRunbook(): string {
    return `# Memory Leak Investigation and Resolution

## Overview
Systematic approach to identifying and resolving memory leaks in production systems.

## Alert Criteria
- **Alert Type**: memory_leak, high_memory, oom_killer
- **Severity**: High (>80% memory), Critical (>90% memory)
- **Affected Systems**: Java applications, Node.js services, databases

## Investigation Procedure

### Step 1: Initial Assessment
\`\`\`bash
# Check overall memory usage
free -h

# Identify memory-consuming processes
ps aux --sort=-%mem | head -20

# Check for OOM killer activity
dmesg | grep -i "killed process"
\`\`\`

### Step 2: Application-Specific Analysis

#### For Java Applications
\`\`\`bash
# Generate heap dump
jcmd <PID> GC.run_finalization
jcmd <PID> VM.classloader_stats

# Analyze garbage collection
jstat -gc <PID> 5s 10
\`\`\`

#### For Node.js Applications
\`\`\`bash
# Generate heap snapshot
kill -USR2 <PID>

# Monitor memory usage
node --inspect-brk=0.0.0.0:9229 app.js
\`\`\`

### Step 3: Immediate Mitigation
\`\`\`bash
# Restart problematic service
sudo systemctl restart <service-name>

# Temporarily increase memory limits
echo 'vm.overcommit_memory=1' >> /etc/sysctl.conf
sysctl -p
\`\`\`

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
`;
  }

  private generateSecurityIncidentRunbook(): string {
    return `# Security Incident Response Protocol

## Overview
Immediate response procedures for confirmed or suspected security incidents.

## Alert Criteria
- **Alert Type**: security_breach, unauthorized_access, malware_detected
- **Severity**: Critical (confirmed breach), High (suspicious activity)
- **Affected Systems**: Authentication servers, user databases, API gateways

## Immediate Response (First 15 Minutes)

### Step 1: Incident Containment
\`\`\`bash
# Block suspicious IP addresses
sudo iptables -A INPUT -s <SUSPICIOUS_IP> -j DROP

# Disable compromised user accounts
curl -X POST /api/users/<USER_ID>/disable

# Isolate affected systems
sudo iptables -A OUTPUT -d <AFFECTED_SERVER> -j DROP
\`\`\`

### Step 2: Evidence Preservation
\`\`\`bash
# Capture network traffic
sudo tcpdump -w /tmp/incident-$(date +%Y%m%d_%H%M%S).pcap

# Preserve system logs
sudo cp /var/log/auth.log /tmp/auth-backup-$(date +%Y%m%d_%H%M%S).log
sudo cp /var/log/syslog /tmp/syslog-backup-$(date +%Y%m%d_%H%M%S).log
\`\`\`

### Step 3: Immediate Assessment
\`\`\`bash
# Check for unauthorized logins
sudo last -x | head -50

# Review recent file modifications
sudo find /etc /var/www -type f -mtime -1 -ls

# Check running processes
ps aux | grep -v "\\[.*\\]"
\`\`\`

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
`;
  }

  private generatePerformanceRunbook(): string {
    return `# Application Performance Degradation Response

## Overview
Systematic approach to diagnosing and resolving application performance issues.

## Alert Criteria
- **Alert Type**: cpu_high, response_time_high, throughput_low
- **Severity**: Medium (>70% CPU), High (>85% CPU)
- **Affected Systems**: Web applications, API servers, load balancers

## Performance Investigation

### Step 1: System Metrics Analysis
\`\`\`bash
# CPU utilization analysis
top -n 1 -b | head -20
iostat -x 1 5

# Memory usage patterns
vmstat 5 5

# Network performance
netstat -i
ss -tuln | wc -l
\`\`\`

### Step 2: Application Metrics
\`\`\`bash
# Application response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8080/health"

# Database query performance
mysql -e "SHOW PROCESSLIST;" | grep -v Sleep

# Connection pool status
curl -s http://localhost:8080/metrics/connections
\`\`\`

### Step 3: Load Distribution
\`\`\`bash
# Check load balancer status
curl -s http://loadbalancer:8080/status

# Verify service discovery
dig +short service.discovery.internal

# Connection distribution
netstat -an | grep :80 | wc -l
\`\`\`

## Immediate Mitigation

### Scale Up Resources
\`\`\`bash
# Increase application instances
kubectl scale deployment webapp --replicas=6

# Adjust resource limits
kubectl patch deployment webapp -p '{"spec":{"template":{"spec":{"containers":[{"name":"webapp","resources":{"limits":{"cpu":"2","memory":"4Gi"}}}]}}}}'
\`\`\`

### Optimize Database
\`\`\`bash
# Clear query cache
mysql -e "RESET QUERY CACHE;"

# Analyze slow queries
mysql -e "SELECT * FROM INFORMATION_SCHEMA.PROCESSLIST WHERE TIME > 5;"
\`\`\`

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
`;
  }

  private generateNetworkRunbook(): string {
    return `# Network Connectivity Troubleshooting

## Overview
Comprehensive network troubleshooting procedures for connectivity issues.

## Alert Criteria
- **Alert Type**: network_down, packet_loss, dns_failure
- **Severity**: Critical (total outage), High (>10% packet loss)
- **Affected Systems**: Network infrastructure, DNS servers, gateways

## Network Diagnostics

### Step 1: Basic Connectivity
\`\`\`bash
# Test local interface
ping -c 4 127.0.0.1

# Test gateway connectivity
ping -c 4 $(route -n | grep 'UG' | awk '{print $2}')

# Test external connectivity
ping -c 4 8.8.8.8
\`\`\`

### Step 2: DNS Resolution
\`\`\`bash
# Test DNS resolution
nslookup google.com
dig @8.8.8.8 google.com

# Check local DNS configuration
cat /etc/resolv.conf
\`\`\`

### Step 3: Network Path Analysis
\`\`\`bash
# Trace network path
traceroute google.com

# Check for packet loss
mtr -r -c 10 google.com

# Analyze network interfaces
ip addr show
ip route show
\`\`\`

## Common Fixes

### DNS Issues
\`\`\`bash
# Flush DNS cache
sudo systemctl restart systemd-resolved

# Temporary DNS override
echo "nameserver 8.8.8.8" > /etc/resolv.conf
\`\`\`

### Interface Problems
\`\`\`bash
# Restart network interface
sudo ifdown eth0 && sudo ifup eth0

# Reset network stack
sudo systemctl restart networking
\`\`\`

### Routing Issues
\`\`\`bash
# Add default route
sudo route add default gw 192.168.1.1

# Check routing table
netstat -rn
\`\`\`

## Escalation Points
- Multiple network paths affected
- ISP-level connectivity issues
- Hardware failure suspected
- Security incident suspected

## Recovery Verification
- [ ] All interfaces operational
- [ ] DNS resolution working
- [ ] Internal connectivity restored
- [ ] External connectivity confirmed
- [ ] Services responding normally

## Prevention Measures
1. Network monitoring enhancement
2. Redundant path configuration
3. DNS server redundancy
4. Regular connectivity testing
`;
  }

  // ========================================================================
  // Knowledge Base Generation
  // ========================================================================

  private generateKnowledgeBase(): KnowledgeBaseTestData[] {
    return [
      {
        id: 'KB-MON-001',
        filename: 'monitoring-best-practices.md',
        title: 'System Monitoring Best Practices',
        content: this.generateMonitoringGuide(),
        category: 'best-practices',
        tags: ['monitoring', 'alerting', 'metrics', 'observability'],
      },
      {
        id: 'KB-SEC-001',
        filename: 'security-hardening-guide.md',
        title: 'Security Hardening Guide',
        content: this.generateSecurityGuide(),
        category: 'security',
        tags: ['security', 'hardening', 'compliance', 'best-practices'],
      },
      {
        id: 'KB-PERF-001',
        filename: 'performance-optimization-guide.md',
        title: 'Application Performance Optimization',
        content: this.generatePerformanceGuide(),
        category: 'performance',
        tags: ['performance', 'optimization', 'tuning', 'scalability'],
      },
      {
        id: 'KB-DEP-001',
        filename: 'deployment-procedures.md',
        title: 'Deployment Procedures and Guidelines',
        content: this.generateDeploymentGuide(),
        category: 'deployment',
        tags: ['deployment', 'cicd', 'procedures', 'automation'],
      },
      {
        id: 'KB-TROU-001',
        filename: 'troubleshooting-methodology.md',
        title: 'Systematic Troubleshooting Methodology',
        content: this.generateTroubleshootingGuide(),
        category: 'troubleshooting',
        tags: ['troubleshooting', 'methodology', 'debugging', 'investigation'],
      },
    ];
  }

  private generateMonitoringGuide(): string {
    return `# System Monitoring Best Practices

## Overview
Comprehensive guide to implementing effective system monitoring and alerting.

## Core Monitoring Principles

### 1. The Four Golden Signals
- **Latency**: Response time for requests
- **Traffic**: Demand being placed on the system
- **Errors**: Rate of failed requests
- **Saturation**: Resource utilization levels

### 2. Alert Design Philosophy
- **Actionable**: Every alert should require human action
- **Contextual**: Provide enough information for quick resolution
- **Proportional**: Alert severity should match business impact
- **Predictive**: Alert before problems become critical

## Implementation Guidelines

### Metric Collection
\`\`\`yaml
# Prometheus configuration example
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "first_rules.yml"
  - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
\`\`\`

### Alerting Rules
\`\`\`yaml
groups:
- name: example
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: High error rate detected
\`\`\`

## Key Metrics to Monitor

### System Level
- CPU utilization and load average
- Memory usage and swap activity
- Disk I/O and space utilization
- Network throughput and error rates

### Application Level
- Request rate and response time
- Error rate and types
- Database query performance
- Cache hit rates

### Business Level
- User registration rates
- Transaction volumes
- Revenue metrics
- User engagement indicators

## Monitoring Stack Recommendations

### Infrastructure Monitoring
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and management

### Application Monitoring
- **APM Tools**: New Relic, DataDog, or Elastic APM
- **Custom Metrics**: Application-specific business metrics
- **Distributed Tracing**: Jaeger or Zipkin

### Log Management
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Structured Logging**: JSON format with correlation IDs
- **Log Retention**: Based on compliance and storage costs

## Dashboard Design

### Executive Dashboard
- High-level business metrics
- Overall system health
- Critical alert summary
- SLA compliance metrics

### Operational Dashboard
- Detailed system metrics
- Service-level indicators
- Alert status and trends
- Capacity planning metrics

### Developer Dashboard
- Application performance metrics
- Error rates and types
- Deployment success rates
- Code quality metrics

## Alert Fatigue Prevention

### Alert Tuning
- Regular review of alert thresholds
- Consolidation of related alerts
- Temporary alert suppression during maintenance
- Alert escalation policies

### Documentation
- Runbook links for each alert
- Clear remediation steps
- Historical context and trends
- Post-incident review integration

## Continuous Improvement

### Metrics Review Process
1. Monthly alert effectiveness review
2. Quarterly threshold adjustment
3. Annual monitoring strategy review
4. Post-incident monitoring improvements

### Automation Opportunities
- Self-healing systems for common issues
- Automated scaling based on metrics
- Intelligent alert routing
- Predictive anomaly detection
`;
  }

  private generateSecurityGuide(): string {
    return `# Security Hardening Guide

## Overview
Comprehensive security hardening procedures for infrastructure and applications.

## Operating System Hardening

### User Account Security
\`\`\`bash
# Disable root login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Require complex passwords
apt-get install libpam-pwquality

# Set password policies
echo "minlen=12" >> /etc/security/pwquality.conf
echo "minclass=3" >> /etc/security/pwquality.conf
\`\`\`

### Network Security
\`\`\`bash
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
\`\`\`

### File System Security
\`\`\`bash
# Set proper permissions
chmod 700 /root
chmod 755 /etc
chmod 644 /etc/passwd
chmod 600 /etc/shadow

# Enable file integrity monitoring
apt-get install aide
aideinit
\`\`\`

## Application Security

### Web Application Security
- Input validation and sanitization
- Output encoding for XSS prevention
- SQL injection prevention
- CSRF token implementation
- Secure session management

### API Security
\`\`\`yaml
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
\`\`\`

### Database Security
\`\`\`sql
-- Create application user with limited privileges
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'SecurePassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'appuser'@'localhost';

-- Enable SSL connections
REQUIRE SSL;

-- Configure audit logging
SET GLOBAL log_queries_not_using_indexes = ON;
SET GLOBAL slow_query_log = ON;
\`\`\`

## Network Security

### TLS/SSL Configuration
\`\`\`nginx
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
\`\`\`

### Network Segmentation
- DMZ for public-facing services
- Internal network isolation
- Database tier separation
- Administrative network segregation

## Monitoring and Compliance

### Security Monitoring
\`\`\`yaml
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
\`\`\`

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
\`\`\`bash
# Vulnerability scanning
nmap -sV --script vuln target-host

# Web application scanning
nikto -h http://target-application

# Configuration auditing
lynis audit system
\`\`\`

### Continuous Security
- Automated vulnerability scanning
- Configuration drift detection
- Security patch management
- Compliance monitoring
- Threat intelligence integration
`;
  }

  private generatePerformanceGuide(): string {
    return `# Application Performance Optimization

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
\`\`\`sql
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
\`\`\`

### Caching Strategies
\`\`\`javascript
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
\`\`\`

### Code Optimization
\`\`\`javascript
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
\`\`\`

## Infrastructure Optimization

### Web Server Tuning
\`\`\`nginx
# Nginx optimization
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \\.(css|js|png|jpg|jpeg|gif|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
\`\`\`

### Application Server Tuning
\`\`\`yaml
# Node.js PM2 configuration
apps:
  - name: api-server
    script: ./app.js
    instances: max
    exec_mode: cluster
    env:
      NODE_ENV: production
      NODE_OPTIONS: --max-old-space-size=4096
\`\`\`

### Load Balancing
\`\`\`yaml
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
\`\`\`

## Monitoring and Profiling

### Application Profiling
\`\`\`javascript
// Performance monitoring
const perf = require('perf_hooks').performance;

function measurePerformance(fn) {
    return function(...args) {
        const start = perf.now();
        const result = fn.apply(this, args);
        const end = perf.now();
        
        console.log(\`Function \${fn.name} took \${end - start} milliseconds\`);
        return result;
    };
}
\`\`\`

### Database Monitoring
\`\`\`sql
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
\`\`\`

### Infrastructure Monitoring
\`\`\`bash
# System performance monitoring
iostat -x 1 5
vmstat 5 5
sar -u 1 10

# Network monitoring
netstat -i
ss -tuln
\`\`\`

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
`;
  }

  private generateDeploymentGuide(): string {
    return `# Deployment Procedures and Guidelines

## Overview
Comprehensive deployment procedures ensuring reliable, secure, and efficient software releases.

## Deployment Pipeline

### CI/CD Pipeline Architecture
\`\`\`yaml
# GitHub Actions workflow
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test
      - name: Run security scan
        run: npm audit

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build application
        run: npm run build
      - name: Build Docker image
        run: docker build -t app:\${{ github.sha }} .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: kubectl apply -f k8s/staging/
      - name: Run integration tests
        run: npm run test:integration
      - name: Deploy to production
        run: kubectl apply -f k8s/production/
\`\`\`

### Deployment Strategies

#### Blue-Green Deployment
\`\`\`bash
# Switch traffic to new version
kubectl patch service app-service -p '{"spec":{"selector":{"version":"green"}}}'

# Verify deployment
kubectl get pods -l version=green
kubectl logs -l version=green

# Rollback if needed
kubectl patch service app-service -p '{"spec":{"selector":{"version":"blue"}}}'
\`\`\`

#### Canary Deployment
\`\`\`yaml
# Canary deployment configuration
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: app-rollout
spec:
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 10m}
      - setWeight: 100
\`\`\`

#### Rolling Deployment
\`\`\`yaml
# Kubernetes rolling update
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      containers:
      - name: app
        image: app:latest
\`\`\`

## Pre-Deployment Checklist

### Code Quality Gates
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage above threshold (80%)
- [ ] Security scan completed
- [ ] Performance tests passed
- [ ] Code review approved
- [ ] Documentation updated

### Infrastructure Readiness
- [ ] Environment provisioned
- [ ] Database migrations tested
- [ ] Configuration verified
- [ ] Secrets management configured
- [ ] Monitoring alerts configured
- [ ] Backup procedures verified

### Deployment Preparation
- [ ] Deployment plan reviewed
- [ ] Rollback plan prepared
- [ ] Communication plan ready
- [ ] Maintenance window scheduled
- [ ] Team notifications sent
- [ ] External dependencies verified

## Deployment Execution

### Deployment Process
1. **Pre-deployment**: Environment verification
2. **Database Migration**: Schema and data updates
3. **Application Deployment**: Code release
4. **Configuration Update**: Environment-specific settings
5. **Service Restart**: Graceful service updates
6. **Smoke Testing**: Basic functionality verification
7. **Monitoring**: Health and performance validation

### Deployment Commands
\`\`\`bash
# Application deployment
docker pull app:latest
docker stop app-container
docker rm app-container
docker run -d --name app-container -p 8080:8080 app:latest

# Database migration
npm run db:migrate

# Configuration update
kubectl apply -f config/production.yaml

# Health verification
curl -f http://localhost:8080/health
\`\`\`

## Post-Deployment Validation

### Health Checks
\`\`\`bash
# Application health
curl -f http://app.domain.com/health

# Database connectivity
curl -f http://app.domain.com/health/database

# External service connectivity
curl -f http://app.domain.com/health/dependencies

# Performance verification
curl -w "@curl-format.txt" -o /dev/null -s http://app.domain.com/api/test
\`\`\`

### Monitoring Verification
- [ ] Application metrics reporting
- [ ] Error rates within normal range
- [ ] Response times acceptable
- [ ] Resource utilization normal
- [ ] Business metrics tracking

## Rollback Procedures

### Automated Rollback Triggers
\`\`\`yaml
# Automated rollback configuration
rollback_conditions:
  error_rate_threshold: 5%
  response_time_threshold: 2000ms
  health_check_failures: 3
  monitoring_duration: 10m
\`\`\`

### Manual Rollback Process
\`\`\`bash
# Application rollback
kubectl rollout undo deployment/app-deployment

# Database rollback (if needed)
npm run db:rollback

# Configuration rollback
kubectl apply -f config/previous-version.yaml

# Verification
kubectl get pods
kubectl logs -l app=app-deployment
\`\`\`

## Environment Management

### Environment Promotion
- **Development**: Feature development and testing
- **Staging**: Integration testing and UAT
- **Production**: Live environment

### Configuration Management
\`\`\`yaml
# Environment-specific configuration
development:
  database_url: postgres://dev-db:5432/app
  log_level: debug
  cache_ttl: 60

staging:
  database_url: postgres://staging-db:5432/app
  log_level: info
  cache_ttl: 300

production:
  database_url: postgres://prod-db:5432/app
  log_level: warn
  cache_ttl: 3600
\`\`\`

## Security Considerations

### Deployment Security
- Secret management with vault/sealed secrets
- Image scanning for vulnerabilities
- Network security and firewall rules
- Access control and authentication
- Audit logging for all deployments

### Production Security
\`\`\`yaml
# Security policies
network_policies:
  - deny_all_ingress_by_default
  - allow_specific_service_communication
  - restrict_egress_traffic

pod_security:
  - run_as_non_root
  - read_only_root_filesystem
  - drop_all_capabilities
  - no_privilege_escalation
\`\`\`

## Disaster Recovery

### Backup Procedures
- Database backup before deployment
- Configuration backup
- Application artifact backup
- Infrastructure state backup

### Recovery Procedures
1. Assess the scope of the issue
2. Implement immediate rollback
3. Restore from backup if needed
4. Validate system functionality
5. Communicate status to stakeholders
6. Conduct post-incident review
`;
  }

  private generateTroubleshootingGuide(): string {
    return `# Systematic Troubleshooting Methodology

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
\`\`\`bash
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
\`\`\`

### Phase 2: Detailed Analysis (15 minutes)
\`\`\`bash
# Performance metrics
iostat -x 1 5
vmstat 5 5
netstat -tulpn

# Application-specific checks
curl -s http://localhost:8080/metrics
docker logs container-name --tail 100
kubectl describe pod pod-name
\`\`\`

### Phase 3: Deep Investigation (30+ minutes)
\`\`\`bash
# System trace analysis
strace -p PID -f -e trace=network
tcpdump -i any -n -s 0 host problematic-host

# Database investigation
mysql -e "SHOW PROCESSLIST;"
pg_stat_activity query for PostgreSQL

# Memory and CPU profiling
perf top -p PID
jstack PID (for Java applications)
\`\`\`

## Common Problem Categories

### Application Issues

#### Performance Problems
\`\`\`bash
# Identify bottlenecks
top -p APPLICATION_PID
lsof -p APPLICATION_PID
strace -c -p APPLICATION_PID

# Database performance
EXPLAIN ANALYZE SELECT * FROM slow_table;
SHOW ENGINE INNODB STATUS;
\`\`\`

#### Memory Issues
\`\`\`bash
# Memory usage analysis
cat /proc/PID/status | grep -E "(VmSize|VmRSS|VmData|VmStk)"
smem -p
valgrind --tool=memcheck --leak-check=full APPLICATION

# Java heap analysis
jmap -histo PID
jstat -gc PID 5s 10
\`\`\`

#### Connection Issues
\`\`\`bash
# Connection tracking
netstat -an | grep :8080
ss -tulpn | grep :8080
lsof -i :8080

# Connection pool status
curl -s http://localhost:8080/actuator/metrics/hikaricp.connections
\`\`\`

### Infrastructure Issues

#### Network Problems
\`\`\`bash
# Network diagnostics
traceroute destination-host
mtr -r -c 10 destination-host
iperf3 -c destination-host

# DNS resolution
nslookup hostname
dig @8.8.8.8 hostname
host hostname
\`\`\`

#### Storage Issues
\`\`\`bash
# Disk analysis
iotop -o
iostat -x 1 5
lsblk -f

# File system checks
fsck /dev/device
tune2fs -l /dev/device
\`\`\`

#### Service Dependencies
\`\`\`bash
# Service status
systemctl status service-name
journalctl -u service-name -f

# Dependency chain
systemctl list-dependencies service-name
systemctl show service-name
\`\`\`

## Troubleshooting Tools and Techniques

### Log Analysis
\`\`\`bash
# Centralized log analysis
grep -r "ERROR" /var/log/
journalctl --since "1 hour ago" --until now
tail -f /var/log/application.log | grep ERROR

# Log correlation
awk '/ERROR/{print $1, $2, $NF}' /var/log/application.log
sed -n '/2023-12-01 10:00/,/2023-12-01 11:00/p' /var/log/application.log
\`\`\`

### Performance Profiling
\`\`\`bash
# CPU profiling
perf record -g ./application
perf report

# Memory profiling
valgrind --tool=massif ./application
ms_print massif.out.PID

# I/O profiling
iotop -a -o
iftop -i interface
\`\`\`

### Network Analysis
\`\`\`bash
# Packet capture
tcpdump -i any -s 0 -w capture.pcap host problematic-host
wireshark capture.pcap

# Network flow analysis
netstat -i
ss -tuln
nload interface-name
\`\`\`

## Documentation and Communication

### Issue Documentation Template
\`\`\`markdown
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
\`\`\`

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
`;
  }

  // ========================================================================
  // Procedure Generation
  // ========================================================================

  private generateProcedures(): ProcedureTestData[] {
    return [
      {
        id: 'PROC-EMERGENCY-001',
        filename: 'emergency-disk-cleanup.md',
        title: 'Emergency Disk Space Cleanup',
        content: this.generateEmergencyCleanupProcedure(),
        steps: [
          'Identify largest directories',
          'Clean temporary files',
          'Remove old log files',
          'Clear package caches',
          'Verify space recovered',
        ],
        prerequisites: ['sudo access', 'backup verification', 'monitoring alerts'],
      },
      {
        id: 'PROC-RESTART-001',
        filename: 'service-restart-procedure.md',
        title: 'Service Restart Procedure',
        content: this.generateServiceRestartProcedure(),
        steps: [
          'Check service status',
          'Graceful shutdown',
          'Verify dependencies',
          'Start service',
          'Validate functionality',
        ],
        prerequisites: ['service access', 'dependency verification', 'health checks'],
      },
      {
        id: 'PROC-BACKUP-001',
        filename: 'database-backup-procedure.md',
        title: 'Database Backup and Recovery',
        content: this.generateBackupProcedure(),
        steps: [
          'Stop application writes',
          'Create database dump',
          'Verify backup integrity',
          'Store backup securely',
          'Resume operations',
        ],
        prerequisites: ['database access', 'storage space', 'maintenance window'],
      },
    ];
  }

  private generateEmergencyCleanupProcedure(): string {
    return `# Emergency Disk Space Cleanup Procedure

## Purpose
Immediate disk space recovery for critical situations when disk usage exceeds 90%.

## Prerequisites
- Root or sudo access to the affected system
- Verified backup of critical data
- Monitoring system alerts acknowledged

## Procedure Steps

### Step 1: Assess Current Situation (2 minutes)
\`\`\`bash
# Check disk usage across all filesystems
df -h

# Identify largest directories (top 10)
du -sh /var/* | sort -rh | head -10
du -sh /tmp/* | sort -rh | head -10
du -sh /opt/* | sort -rh | head -10
\`\`\`

**Expected Outcome**: Clear understanding of disk usage distribution
**Success Criteria**: Disk usage report generated and largest consumers identified

### Step 2: Emergency Cleanup - Temporary Files (3 minutes)
\`\`\`bash
# Clean system temporary files
sudo find /tmp -type f -atime +7 -delete
sudo find /var/tmp -type f -atime +7 -delete

# Clean user temporary files
sudo find /tmp -name "*.tmp" -type f -delete
sudo find /tmp -name "core.*" -type f -delete

# Verify cleanup results
df -h
\`\`\`

**Expected Outcome**: Recovery of 1-5GB from temporary files
**Success Criteria**: Disk usage reduced by at least 2%

### Step 3: Log File Cleanup (5 minutes)
\`\`\`bash
# Identify large log files
find /var/log -name "*.log" -size +100M -ls

# Archive and compress old logs
sudo find /var/log -name "*.log" -type f -mtime +30 -exec gzip {} \\;

# Remove very old compressed logs
sudo find /var/log -name "*.gz" -type f -mtime +90 -delete

# Clear journal logs older than 7 days
sudo journalctl --vacuum-time=7d
\`\`\`

**Expected Outcome**: Recovery of 5-20GB from log files
**Success Criteria**: Log disk usage reduced significantly

### Step 4: Package Cache Cleanup (2 minutes)
\`\`\`bash
# Clean package manager caches
sudo apt-get clean
sudo apt-get autoremove

# Clean snap packages (if applicable)
sudo snap refresh
sudo snap remove --purge $(snap list --all | awk '/disabled/{print $1}')

# Verify cleanup
df -h
\`\`\`

**Expected Outcome**: Recovery of 1-10GB from package caches
**Success Criteria**: Package cache space recovered

### Step 5: Verification and Monitoring (3 minutes)
\`\`\`bash
# Final disk usage check
df -h

# Verify critical services are running
systemctl status nginx
systemctl status mysql
systemctl status application-service

# Check application logs for errors
tail -50 /var/log/application.log
\`\`\`

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
`;
  }

  private generateServiceRestartProcedure(): string {
    return `# Service Restart Procedure

## Purpose
Systematic service restart with minimal downtime and proper validation.

## Prerequisites
- Service access and restart permissions
- Knowledge of service dependencies
- Access to monitoring and health check systems

## Procedure Steps

### Step 1: Pre-Restart Assessment (3 minutes)
\`\`\`bash
# Check current service status
systemctl status service-name

# Verify service health
curl -f http://localhost:8080/health

# Check service dependencies
systemctl list-dependencies service-name

# Review recent logs
journalctl -u service-name --since "15 minutes ago"
\`\`\`

**Expected Outcome**: Understanding of current service state
**Success Criteria**: Service status documented and dependencies verified

### Step 2: Graceful Shutdown (2 minutes)
\`\`\`bash
# Send graceful shutdown signal
sudo systemctl stop service-name

# Wait for graceful shutdown (up to 30 seconds)
sleep 30

# Verify service stopped
systemctl is-active service-name
ps aux | grep service-name
\`\`\`

**Expected Outcome**: Service cleanly stopped without force
**Success Criteria**: Service process terminated gracefully

### Step 3: Pre-Start Verification (2 minutes)
\`\`\`bash
# Check configuration validity
sudo nginx -t  # for nginx
sudo systemctl status service-name  # for systemd services

# Verify file permissions
ls -la /etc/service-name/
ls -la /var/log/service-name/

# Check disk space and resources
df -h
free -h
\`\`\`

**Expected Outcome**: Configuration valid and resources available
**Success Criteria**: No configuration errors, sufficient resources

### Step 4: Service Start (1 minute)
\`\`\`bash
# Start the service
sudo systemctl start service-name

# Verify service started
systemctl is-active service-name
systemctl status service-name
\`\`\`

**Expected Outcome**: Service started successfully
**Success Criteria**: Service status shows active/running

### Step 5: Post-Start Validation (5 minutes)
\`\`\`bash
# Health check validation
curl -f http://localhost:8080/health

# Functional testing
curl -f http://localhost:8080/api/test

# Monitor logs for errors
journalctl -u service-name -f

# Check performance metrics
curl -s http://localhost:8080/metrics
\`\`\`

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
`;
  }

  private generateBackupProcedure(): string {
    return `# Database Backup and Recovery Procedure

## Purpose
Create reliable database backups and validate recovery procedures.

## Prerequisites
- Database administrative access
- Sufficient storage space for backup
- Maintenance window scheduled
- Application write access coordination

## Procedure Steps

### Step 1: Pre-Backup Preparation (5 minutes)
\`\`\`bash
# Check database status
mysql -e "SHOW PROCESSLIST;"
mysql -e "SHOW ENGINE INNODB STATUS\\G" | grep -A 20 "TRANSACTIONS"

# Verify disk space
df -h /backup/location

# Stop application writes (coordinate with team)
curl -X POST http://application:8080/maintenance/start
\`\`\`

**Expected Outcome**: Database ready for backup, application in maintenance mode
**Success Criteria**: No active long-running transactions, sufficient disk space

### Step 2: Create Database Backup (15 minutes)
\`\`\`bash
# Create timestamped backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/backup/db_backup_\${TIMESTAMP}.sql"

# Perform backup with consistency
mysqldump --single-transaction --routines --triggers --all-databases > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Verify backup file created
ls -lh "\${BACKUP_FILE}.gz"
\`\`\`

**Expected Outcome**: Complete database backup created and compressed
**Success Criteria**: Backup file exists and has reasonable size

### Step 3: Backup Validation (10 minutes)
\`\`\`bash
# Check backup integrity
gunzip -t "\${BACKUP_FILE}.gz"

# Verify backup contents
zcat "\${BACKUP_FILE}.gz" | head -50
zcat "\${BACKUP_FILE}.gz" | tail -50

# Test restore on test database (if available)
mysql test_db < <(zcat "\${BACKUP_FILE}.gz")
mysql test_db -e "SELECT COUNT(*) FROM important_table;"
\`\`\`

**Expected Outcome**: Backup integrity confirmed
**Success Criteria**: Backup can be read and contains expected data

### Step 4: Secure Backup Storage (5 minutes)
\`\`\`bash
# Copy to secure location
rsync -av "\${BACKUP_FILE}.gz" backup-server:/secure/backups/

# Verify remote copy
ssh backup-server "ls -lh /secure/backups/db_backup_\${TIMESTAMP}.sql.gz"

# Set proper permissions
chmod 600 "\${BACKUP_FILE}.gz"
ssh backup-server "chmod 600 /secure/backups/db_backup_\${TIMESTAMP}.sql.gz"
\`\`\`

**Expected Outcome**: Backup securely stored in multiple locations
**Success Criteria**: Backup available on primary and backup storage

### Step 5: Resume Operations (2 minutes)
\`\`\`bash
# Resume application writes
curl -X POST http://application:8080/maintenance/stop

# Verify application functionality
curl -f http://application:8080/health
curl -f http://application:8080/api/test

# Check database performance
mysql -e "SHOW PROCESSLIST;"
\`\`\`

**Expected Outcome**: Normal operations resumed
**Success Criteria**: Application responding normally, database performance good

## Recovery Procedure

### Emergency Recovery Steps
\`\`\`bash
# Stop application
curl -X POST http://application:8080/maintenance/start

# Restore from backup
zcat /backup/db_backup_\${TIMESTAMP}.sql.gz | mysql

# Verify data integrity
mysql -e "CHECK TABLE important_table;"

# Resume application
curl -X POST http://application:8080/maintenance/stop
\`\`\`

## Success Criteria
- [ ] Backup completed without errors
- [ ] Backup integrity verified
- [ ] Backup stored securely
- [ ] Application downtime minimized
- [ ] Recovery procedure tested
- [ ] Documentation updated

## Monitoring and Alerting
- Backup completion notification
- Backup size monitoring
- Automated integrity checking
- Recovery time objectives met

## Disaster Recovery Integration
- Offsite backup replication
- Cross-region backup storage
- Automated recovery testing
- Business continuity planning
`;
  }

  // ========================================================================
  // Configuration Generation
  // ========================================================================

  private generateConfigurations(): ConfigurationTestData[] {
    return [
      {
        name: 'integration-test-minimal',
        filename: 'config-minimal.yaml',
        content: this.generateMinimalConfig(),
        description: 'Minimal configuration for local file adapter only',
      },
      {
        name: 'integration-test-multi-adapter',
        filename: 'config-multi-adapter.yaml',
        content: this.generateMultiAdapterConfig(),
        description: 'Configuration with all 4 adapters for comprehensive testing',
      },
      {
        name: 'integration-test-performance',
        filename: 'config-performance.yaml',
        content: this.generatePerformanceConfig(),
        description: 'Optimized configuration for performance testing',
      },
    ];
  }

  private generateMinimalConfig(): string {
    return `# Minimal Integration Test Configuration
# Single adapter setup for basic functionality testing

server:
  port: 3000
  host: localhost
  log_level: error
  cache_ttl_seconds: 300
  max_concurrent_requests: 20
  request_timeout_ms: 15000

sources:
  - name: test-local-docs
    type: file
    base_url: ./test-data-integration
    enabled: true
    priority: 1
    timeout_ms: 5000
    max_retries: 1
    watch_changes: false
    pdf_extraction: true
    recursive: true
    max_depth: 3
    extract_metadata: true
    supported_extensions: ['.md', '.txt', '.json', '.yml', '.yaml']
    file_patterns:
      exclude: ['**/node_modules/**', '**/.git/**', '**/test/**']

cache:
  enabled: true
  strategy: memory_only
  memory:
    max_keys: 200
    ttl_seconds: 300
    check_period_seconds: 60

performance:
  enable_monitoring: true
  collect_metrics: true
  metric_retention_minutes: 60

testing:
  integration_mode: true
  mock_external_services: false
  performance_tracking: true
`;
  }

  private generateMultiAdapterConfig(): string {
    return `# Multi-Adapter Integration Test Configuration
# All 4 adapters configured for comprehensive testing

server:
  port: 3000
  host: localhost
  log_level: info
  cache_ttl_seconds: 600
  max_concurrent_requests: 50
  request_timeout_ms: 30000

sources:
  - name: test-local-docs
    type: file
    base_url: ./test-data-integration
    enabled: true
    priority: 1
    timeout_ms: 5000
    max_retries: 1
    watch_changes: false
    pdf_extraction: true
    recursive: true
    max_depth: 3
    extract_metadata: true
    supported_extensions: ['.md', '.txt', '.json', '.yml', '.yaml']

  - name: test-confluence
    type: confluence
    base_url: https://atlassian-test.example.com/wiki
    enabled: ${process.env.CONFLUENCE_TOKEN ? 'true' : 'false'}
    priority: 2
    timeout_ms: 15000
    max_retries: 2
    auth:
      type: bearer_token
      token_env: CONFLUENCE_TOKEN
    spaces: ['TEST', 'DOCS']
    content_types: ['page', 'blogpost']

  - name: test-github
    type: github
    base_url: https://api.github.com
    enabled: ${process.env.GITHUB_TOKEN ? 'true' : 'false'}
    priority: 3
    timeout_ms: 10000
    max_retries: 2
    auth:
      type: personal_token
      token_env: GITHUB_TOKEN
    repositories:
      - owner: example
        repo: docs
        path: documentation/
      - owner: example
        repo: runbooks
        path: runbooks/

  - name: test-web-apis
    type: web
    base_url: https://httpbin.org
    enabled: true
    priority: 4
    timeout_ms: 10000
    max_retries: 2
    auth:
      type: none
    endpoints:
      - name: json-endpoint
        url: /json
        method: GET
        content_type: json
        json_paths: ['$.slideshow.title', '$.slideshow.slides[*].title']
      - name: xml-endpoint
        url: /xml
        method: GET
        content_type: xml

cache:
  enabled: true
  strategy: hybrid
  memory:
    max_keys: 1000
    ttl_seconds: 600
    check_period_seconds: 120
  redis:
    enabled: false  # Use memory only for testing
    
performance:
  enable_monitoring: true
  collect_metrics: true
  metric_retention_minutes: 120
  
testing:
  integration_mode: true
  mock_external_services: false
  performance_tracking: true
  cross_adapter_testing: true
`;
  }

  private generatePerformanceConfig(): string {
    return `# Performance-Optimized Integration Test Configuration
# Tuned for high performance and throughput testing

server:
  port: 3000
  host: localhost
  log_level: warn
  cache_ttl_seconds: 1800
  max_concurrent_requests: 100
  request_timeout_ms: 60000
  worker_threads: 4

sources:
  - name: perf-test-local
    type: file
    base_url: ./test-data-integration
    enabled: true
    priority: 1
    timeout_ms: 3000
    max_retries: 3
    watch_changes: false
    pdf_extraction: false  # Disabled for performance
    recursive: true
    max_depth: 2
    extract_metadata: false  # Disabled for performance
    supported_extensions: ['.md', '.txt', '.json']
    batch_size: 100

  - name: perf-test-web
    type: web
    base_url: https://httpbin.org
    enabled: true
    priority: 2
    timeout_ms: 5000
    max_retries: 2
    performance:
      max_concurrent_requests: 20
      connection_pool_size: 50
      keep_alive: true
    endpoints:
      - name: fast-json
        url: /json
        method: GET
        content_type: json
        cache_ttl: 3600

cache:
  enabled: true
  strategy: memory_only  # Fastest caching
  memory:
    max_keys: 5000
    ttl_seconds: 1800
    check_period_seconds: 300
    
# Performance-specific settings
performance:
  enable_monitoring: true
  collect_metrics: true
  metric_retention_minutes: 240
  high_performance_mode: true
  async_processing: true
  batch_operations: true
  
# Optimization flags
optimization:
  enable_compression: true
  connection_pooling: true
  lazy_loading: true
  prefetch_common_queries: true
  
testing:
  integration_mode: true
  performance_mode: true
  benchmark_mode: true
  load_testing: true
`;
  }

  // ========================================================================
  // File Writing Methods
  // ========================================================================

  private async writeRunbooks(runbooks: RunbookTestData[]): Promise<void> {
    const runbooksDir = path.join(this.testDataDir, 'runbooks');
    
    for (const runbook of runbooks) {
      await fs.writeFile(
        path.join(runbooksDir, runbook.filename),
        runbook.content,
        'utf-8'
      );
      
      // Also write as JSON for adapter testing
      const jsonContent = {
        id: runbook.id,
        title: runbook.title,
        content: runbook.content,
        metadata: runbook.metadata,
        type: 'runbook',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const jsonFilename = runbook.filename.replace('.md', '.json');
      await fs.writeFile(
        path.join(runbooksDir, jsonFilename),
        JSON.stringify(jsonContent, null, 2),
        'utf-8'
      );
    }
  }

  private async writeKnowledgeBase(articles: KnowledgeBaseTestData[]): Promise<void> {
    const kbDir = path.join(this.testDataDir, 'knowledge-base');
    
    for (const article of articles) {
      await fs.writeFile(
        path.join(kbDir, article.filename),
        article.content,
        'utf-8'
      );
      
      // Also write as JSON
      const jsonContent = {
        id: article.id,
        title: article.title,
        content: article.content,
        category: article.category,
        tags: article.tags,
        type: 'knowledge_base',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const jsonFilename = article.filename.replace('.md', '.json');
      await fs.writeFile(
        path.join(kbDir, jsonFilename),
        JSON.stringify(jsonContent, null, 2),
        'utf-8'
      );
    }
  }

  private async writeProcedures(procedures: ProcedureTestData[]): Promise<void> {
    const proceduresDir = path.join(this.testDataDir, 'procedures');
    
    for (const procedure of procedures) {
      await fs.writeFile(
        path.join(proceduresDir, procedure.filename),
        procedure.content,
        'utf-8'
      );
      
      // Also write as JSON
      const jsonContent = {
        id: procedure.id,
        title: procedure.title,
        content: procedure.content,
        steps: procedure.steps,
        prerequisites: procedure.prerequisites,
        type: 'procedure',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const jsonFilename = procedure.filename.replace('.md', '.json');
      await fs.writeFile(
        path.join(proceduresDir, jsonFilename),
        JSON.stringify(jsonContent, null, 2),
        'utf-8'
      );
    }
  }

  private async writeConfigurations(configurations: ConfigurationTestData[]): Promise<void> {
    const configDir = path.join(this.testDataDir, 'configurations');
    
    for (const config of configurations) {
      await fs.writeFile(
        path.join(configDir, config.filename),
        config.content,
        'utf-8'
      );
    }
  }

  private async writeAdapterSpecificData(): Promise<void> {
    // GitHub test data
    const githubDir = path.join(this.testDataDir, 'github-test');
    await fs.writeFile(
      path.join(githubDir, 'README.md'),
      '# GitHub Test Repository\n\nThis is test data for GitHub adapter integration testing.',
      'utf-8'
    );

    // Web test data
    const webDir = path.join(this.testDataDir, 'web-test');
    await fs.writeFile(
      path.join(webDir, 'test-endpoints.json'),
      JSON.stringify({
        endpoints: [
          { url: 'https://httpbin.org/json', type: 'json' },
          { url: 'https://httpbin.org/xml', type: 'xml' },
        ],
      }, null, 2),
      'utf-8'
    );

    // Confluence test data
    const confluenceDir = path.join(this.testDataDir, 'confluence-test');
    await fs.writeFile(
      path.join(confluenceDir, 'test-spaces.json'),
      JSON.stringify({
        spaces: ['TEST', 'DOCS'],
        content_types: ['page', 'blogpost'],
      }, null, 2),
      'utf-8'
    );
  }

  private async writeTestScenarios(): Promise<void> {
    const scenariosContent = `# Integration Test Scenarios

## Overview
This file contains predefined test scenarios for comprehensive integration testing.

## Test Scenarios

### 1. Basic Functionality
- Single adapter search
- Health check validation
- Configuration loading

### 2. Multi-Adapter Integration
- Cross-source search queries
- Result aggregation and ranking
- Load distribution

### 3. Performance Testing
- Cached vs uncached response times
- Concurrent query handling
- Throughput measurement

### 4. Failover Testing
- Adapter failure simulation
- Graceful degradation
- Recovery mechanisms

### 5. Authentication Testing
- Multiple auth methods
- Token validation
- Error handling

## Test Data Files
- runbooks/: Operational runbook test data
- knowledge-base/: General documentation test data
- procedures/: Step-by-step procedure test data
- configurations/: Test configuration files

## Usage
Use the test data in this directory with the integration test runner:

\`\`\`bash
npm run test:integration
\`\`\`

## Configuration
Select different test configurations from the configurations/ directory
to test various adapter combinations and scenarios.
`;

    await fs.writeFile(
      path.join(this.testDataDir, 'TEST-SCENARIOS.md'),
      scenariosContent,
      'utf-8'
    );
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Generate Integration Test Data

Usage: tsx scripts/generate-integration-test-data.ts [options]

Options:
  --output-dir <path>    Output directory for test data (default: ./test-data-integration)
  --help, -h             Show this help message

Examples:
  tsx scripts/generate-integration-test-data.ts
  tsx scripts/generate-integration-test-data.ts --output-dir /tmp/test-data
    `);
    process.exit(0);
  }

  try {
    const outputDirIndex = args.indexOf('--output-dir');
    const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : undefined;

    const generator = new IntegrationTestDataGenerator(outputDir);
    await generator.generateAllTestData();

    console.log(chalk.green('\n✅ Integration test data generation completed successfully!'));
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('❌ Failed to generate integration test data:'));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

