#!/usr/bin/env node
/**
 * Sample Data Generator for Personal Pipeline MCP Server
 * 
 * Generates realistic runbooks, procedures, and documentation for testing
 * and development purposes.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '../test-data'),
  runbookCount: 15,
  procedureCount: 25,
  knowledgeBaseCount: 30,
};

// Alert types and scenarios
const ALERT_SCENARIOS = [
  {
    type: 'disk_space',
    severities: ['critical', 'high', 'medium'],
    systems: ['web-server', 'db-server', 'cache-server', 'log-server'],
    triggers: ['disk_usage_critical', 'filesystem_full', 'disk_space_warning'],
  },
  {
    type: 'memory_leak',
    severities: ['critical', 'high'],
    systems: ['java-app', 'nodejs-app', 'python-app', 'container'],
    triggers: ['memory_usage_high', 'oom_killer', 'gc_pressure'],
  },
  {
    type: 'cpu_high',
    severities: ['high', 'medium', 'low'],
    systems: ['web-server', 'worker-node', 'batch-processor'],
    triggers: ['cpu_usage_high', 'load_average_high', 'context_switching'],
  },
  {
    type: 'database_slow',
    severities: ['critical', 'high', 'medium'],
    systems: ['mysql', 'postgres', 'redis', 'mongodb'],
    triggers: ['query_timeout', 'connection_pool_full', 'lock_timeout'],
  },
  {
    type: 'network_issues',
    severities: ['critical', 'high'],
    systems: ['load-balancer', 'firewall', 'switch', 'router'],
    triggers: ['packet_loss', 'latency_high', 'connection_refused'],
  },
  {
    type: 'ssl_certificate',
    severities: ['critical', 'high'],
    systems: ['web-server', 'api-gateway', 'cdn'],
    triggers: ['cert_expiring', 'cert_expired', 'cert_invalid'],
  },
  {
    type: 'security_incident',
    severities: ['critical', 'high'],
    systems: ['authentication', 'authorization', 'audit-system'],
    triggers: ['suspicious_login', 'privilege_escalation', 'data_breach'],
  },
];

// Team roles and escalation paths
const TEAM_ROLES = [
  { name: 'Level 1 Support', role: 'l1_support', contact: 'support-l1@company.com', availability: '24/7' },
  { name: 'Level 2 Support', role: 'l2_support', contact: 'support-l2@company.com', availability: 'business hours' },
  { name: 'SRE On-Call', role: 'sre_oncall', contact: 'sre-oncall@company.com', availability: '24/7' },
  { name: 'Security Team', role: 'security', contact: 'security@company.com', availability: '24/7' },
  { name: 'Database Team', role: 'dba', contact: 'dba@company.com', availability: 'business hours' },
  { name: 'Network Team', role: 'network', contact: 'network@company.com', availability: 'business hours' },
];

// Common tools and commands
const COMMON_TOOLS = {
  monitoring: ['htop', 'iostat', 'netstat', 'ss', 'lsof', 'ps'],
  disk: ['df', 'du', 'find', 'ncdu', 'lsblk'],
  network: ['ping', 'traceroute', 'curl', 'wget', 'nslookup', 'dig'],
  database: ['mysql', 'psql', 'redis-cli', 'mongo'],
  containers: ['docker', 'kubectl', 'podman'],
  logs: ['tail', 'grep', 'awk', 'sed', 'journalctl'],
};

/**
 * Generate a realistic runbook for a given scenario
 */
function generateRunbook(scenario, index) {
  const severity = scenario.severities[Math.floor(Math.random() * scenario.severities.length)];
  const system = scenario.systems[Math.floor(Math.random() * scenario.systems.length)];
  const escalationRole = TEAM_ROLES[Math.floor(Math.random() * TEAM_ROLES.length)];
  
  const runbookId = `${scenario.type}_${severity}_${String(index).padStart(3, '0')}`;
  const timestamp = new Date().toISOString();
  
  return {
    id: runbookId,
    title: `${scenario.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${severity.toUpperCase()} Alert Response`,
    version: `1.${Math.floor(Math.random() * 9) + 1}`,
    description: `Runbook for responding to ${severity} severity ${scenario.type.replace(/_/g, ' ')} alerts on ${system} systems`,
    triggers: scenario.triggers,
    severity_mapping: {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
    },
    decision_tree: generateDecisionTree(scenario, severity),
    procedures: generateProcedures(scenario, severity, system),
    escalation_path: escalationRole.role,
    metadata: {
      created_at: timestamp,
      updated_at: timestamp,
      author: 'SRE Team',
      confidence_score: Math.random() * 0.3 + 0.7, // 0.7 - 1.0
      success_rate: Math.random() * 0.2 + 0.8, // 0.8 - 1.0
      avg_resolution_time_minutes: Math.floor(Math.random() * 120) + 10, // 10-130 minutes
    },
  };
}

/**
 * Generate decision tree for a scenario
 */
function generateDecisionTree(scenario, severity) {
  const branches = [];
  
  // Critical path
  if (severity === 'critical') {
    branches.push({
      id: 'immediate_action',
      condition: `${scenario.type}_metric > critical_threshold`,
      description: `Immediate action required for critical ${scenario.type.replace(/_/g, ' ')}`,
      action: 'emergency_procedure',
      next_step: 'verify_resolution',
      confidence: 0.95,
      rollback_step: 'escalate_immediate',
    });
  }
  
  // Standard paths
  branches.push({
    id: 'standard_response',
    condition: `${scenario.type}_metric > warning_threshold`,
    description: `Standard response for ${scenario.type.replace(/_/g, ' ')} issues`,
    action: 'standard_procedure',
    next_step: 'monitor_improvement',
    confidence: 0.85,
    rollback_step: 'escalate_to_specialist',
  });
  
  // Monitoring path
  branches.push({
    id: 'monitor_only',
    condition: `${scenario.type}_metric <= warning_threshold`,
    description: 'Issue within acceptable range, monitor for trends',
    action: 'increase_monitoring',
    next_step: 'scheduled_review',
    confidence: 0.75,
  });
  
  return {
    id: `${scenario.type}_decision_tree`,
    name: `${scenario.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Decision Tree`,
    description: `Decision logic for handling ${scenario.type.replace(/_/g, ' ')} alerts`,
    branches,
    default_action: 'escalate_to_oncall',
  };
}

/**
 * Generate procedures for a scenario
 */
function generateProcedures(scenario, severity, system) {
  const procedures = [];
  const tools = getRelevantTools(scenario.type);
  
  // Emergency procedure for critical alerts
  if (severity === 'critical') {
    procedures.push({
      id: 'emergency_procedure',
      name: `Emergency ${scenario.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Resolution`,
      description: `Immediate actions to resolve critical ${scenario.type.replace(/_/g, ' ')} on ${system}`,
      command: generateCommand(scenario.type, 'emergency'),
      expected_outcome: `Restore ${system} to operational state within 5 minutes`,
      timeout_seconds: 300,
      prerequisites: ['admin_access', 'maintenance_window_optional'],
      rollback_procedure: 'escalate_immediate',
      tools_required: tools.slice(0, 3),
    });
  }
  
  // Standard procedure
  procedures.push({
    id: 'standard_procedure',
    name: `Standard ${scenario.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Resolution`,
    description: `Standard resolution steps for ${scenario.type.replace(/_/g, ' ')} issues`,
    command: generateCommand(scenario.type, 'standard'),
    expected_outcome: `Resolve ${scenario.type.replace(/_/g, ' ')} issue within normal timeframe`,
    timeout_seconds: 1800,
    prerequisites: ['standard_access'],
    rollback_procedure: 'revert_changes',
    tools_required: tools.slice(0, 4),
  });
  
  // Diagnostic procedure
  procedures.push({
    id: 'diagnostic_procedure',
    name: `${scenario.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Diagnostics`,
    description: `Gather diagnostic information for ${scenario.type.replace(/_/g, ' ')} analysis`,
    command: generateCommand(scenario.type, 'diagnostic'),
    expected_outcome: 'Collect comprehensive diagnostic data',
    timeout_seconds: 600,
    prerequisites: ['read_access'],
    tools_required: tools.slice(0, 5),
  });
  
  return procedures;
}

/**
 * Get relevant tools for a scenario type
 */
function getRelevantTools(scenarioType) {
  const toolMap = {
    disk_space: [...COMMON_TOOLS.disk, ...COMMON_TOOLS.monitoring],
    memory_leak: [...COMMON_TOOLS.monitoring, ...COMMON_TOOLS.containers],
    cpu_high: [...COMMON_TOOLS.monitoring, ...COMMON_TOOLS.logs],
    database_slow: [...COMMON_TOOLS.database, ...COMMON_TOOLS.monitoring],
    network_issues: [...COMMON_TOOLS.network, ...COMMON_TOOLS.monitoring],
    ssl_certificate: [...COMMON_TOOLS.network, 'openssl', 'certbot'],
    security_incident: [...COMMON_TOOLS.logs, 'audit', 'fail2ban'],
  };
  
  return toolMap[scenarioType] || COMMON_TOOLS.monitoring;
}

/**
 * Generate realistic commands for procedures
 */
function generateCommand(scenarioType, procedureType) {
  const commands = {
    disk_space: {
      emergency: "find /tmp -type f -atime +1 -delete && find /var/log -name '*.log' -size +100M -exec truncate -s 50M {} \\;",
      standard: "du -sh /var/* | sort -hr | head -10 && find /tmp -type f -atime +7 -delete",
      diagnostic: "df -h && du -sh /var/log/* /tmp/* | sort -hr",
    },
    memory_leak: {
      emergency: "systemctl restart high-memory-service && docker system prune -f",
      standard: "kill -USR1 $(pgrep java) && systemctl reload application",
      diagnostic: "ps aux --sort=-%mem | head -20 && free -h && cat /proc/meminfo",
    },
    cpu_high: {
      emergency: "nice -n 19 killall high-cpu-process && systemctl restart load-balancer",
      standard: "renice 10 $(pgrep heavy-process) && systemctl reload nginx",
      diagnostic: "top -bn1 | head -20 && iostat 1 5 && cat /proc/loadavg",
    },
    database_slow: {
      emergency: "mysqladmin processlist && mysqladmin kill slow-query-ids",
      standard: "OPTIMIZE TABLE slow_table && ANALYZE TABLE performance_schema.events_statements_summary_by_digest",
      diagnostic: "SHOW PROCESSLIST && SHOW ENGINE INNODB STATUS && EXPLAIN slow_query",
    },
    network_issues: {
      emergency: "systemctl restart networking && iptables -F",
      standard: "ip route flush cache && systemctl reload firewall",
      diagnostic: "netstat -tuln && ss -tuln && ip route show",
    },
    ssl_certificate: {
      emergency: "certbot renew --force-renewal && systemctl reload nginx",
      standard: "certbot renew && nginx -t && systemctl reload nginx",
      diagnostic: "openssl x509 -in /etc/ssl/cert.pem -text -noout && certbot certificates",
    },
    security_incident: {
      emergency: "fail2ban-client unban --all && systemctl restart sshd",
      standard: "journalctl -u ssh -n 100 && fail2ban-client status sshd",
      diagnostic: "last -n 50 && journalctl --since '1 hour ago' | grep -i 'authentication failure'",
    },
  };
  
  return commands[scenarioType]?.[procedureType] || `echo "Placeholder command for ${scenarioType} ${procedureType}"`;
}

/**
 * Generate knowledge base articles
 */
function generateKnowledgeBaseArticle(index) {
  const topics = [
    'troubleshooting', 'best-practices', 'configuration', 'monitoring',
    'security', 'performance', 'deployment', 'backup-recovery'
  ];
  
  const topic = topics[index % topics.length];
  const scenario = ALERT_SCENARIOS[index % ALERT_SCENARIOS.length];
  
  return {
    id: `kb_${topic}_${String(index).padStart(3, '0')}`,
    title: `${topic.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${scenario.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    content: generateKnowledgeContent(topic, scenario),
    source: 'internal-wiki',
    source_type: 'file',
    tags: [topic, scenario.type, 'operations'],
    category: topic,
    last_updated: new Date().toISOString(),
    author: 'DevOps Team',
    confidence_score: Math.random() * 0.3 + 0.7,
  };
}

/**
 * Generate realistic knowledge base content
 */
function generateKnowledgeContent(topic, scenario) {
  const content = `# ${topic.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${scenario.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## Overview
This document provides ${topic.replace(/-/g, ' ')} guidance for ${scenario.type.replace(/_/g, ' ')} issues in our infrastructure.

## Common Symptoms
${scenario.triggers.map(trigger => `- ${trigger.replace(/_/g, ' ')}`).join('\n')}

## Affected Systems
${scenario.systems.map(system => `- ${system.replace(/-/g, ' ')}`).join('\n')}

## Best Practices
1. Monitor ${scenario.type.replace(/_/g, ' ')} metrics continuously
2. Set up appropriate alerting thresholds
3. Maintain documentation for common scenarios
4. Regular system health checks
5. Proactive capacity planning

## Troubleshooting Steps
1. Check system metrics and logs
2. Identify root cause using diagnostic tools
3. Apply appropriate resolution procedure
4. Verify fix and monitor for recurrence
5. Document lessons learned

## Related Procedures
- Emergency response for critical alerts
- Standard resolution procedures
- Escalation guidelines
- Post-incident review process

## Tools and Commands
${getRelevantTools(scenario.type).slice(0, 5).map(tool => `- \`${tool}\``).join('\n')}

## Contact Information
For escalation: ${TEAM_ROLES.find(role => role.role.includes('oncall'))?.contact || 'support@company.com'}

---
*Last updated: ${new Date().toLocaleDateString()}*
*Maintained by: DevOps Team*
`;

  return content;
}

/**
 * Create directory structure
 */
async function createDirectories() {
  const dirs = [
    CONFIG.outputDir,
    path.join(CONFIG.outputDir, 'runbooks'),
    path.join(CONFIG.outputDir, 'procedures'),
    path.join(CONFIG.outputDir, 'knowledge-base'),
    path.join(CONFIG.outputDir, 'configs'),
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Generate all sample data
 */
async function generateAllData() {
  console.log('🚀 Generating sample data for Personal Pipeline MCP Server...\n');
  
  // Create directories
  await createDirectories();
  console.log('✅ Created directory structure');
  
  // Generate runbooks
  console.log(`📚 Generating ${CONFIG.runbookCount} runbooks...`);
  let runbookIndex = 0;
  
  for (const scenario of ALERT_SCENARIOS) {
    for (let i = 0; i < Math.ceil(CONFIG.runbookCount / ALERT_SCENARIOS.length); i++) {
      if (runbookIndex >= CONFIG.runbookCount) break;
      
      const runbook = generateRunbook(scenario, runbookIndex);
      const filename = path.join(CONFIG.outputDir, 'runbooks', `${runbook.id}.json`);
      await fs.writeFile(filename, JSON.stringify(runbook, null, 2));
      runbookIndex++;
    }
  }
  console.log(`✅ Generated ${runbookIndex} runbooks`);
  
  // Generate knowledge base articles
  console.log(`📖 Generating ${CONFIG.knowledgeBaseCount} knowledge base articles...`);
  for (let i = 0; i < CONFIG.knowledgeBaseCount; i++) {
    const article = generateKnowledgeBaseArticle(i);
    const filename = path.join(CONFIG.outputDir, 'knowledge-base', `${article.id}.md`);
    await fs.writeFile(filename, article.content);
    
    // Also save metadata
    const metaFilename = path.join(CONFIG.outputDir, 'knowledge-base', `${article.id}.meta.json`);
    const { content, ...metadata } = article;
    await fs.writeFile(metaFilename, JSON.stringify(metadata, null, 2));
  }
  console.log(`✅ Generated ${CONFIG.knowledgeBaseCount} knowledge base articles`);
  
  // Generate sample configuration
  console.log('⚙️  Generating sample configuration...');
  const sampleConfig = {
    server: {
      port: 3000,
      host: 'localhost',
      log_level: 'info',
      cache_ttl_seconds: 3600,
      max_concurrent_requests: 100,
      request_timeout_ms: 30000,
      health_check_interval_ms: 60000,
    },
    sources: [
      {
        name: 'test-runbooks',
        type: 'file',
        base_url: './test-data/runbooks',
        refresh_interval: '1h',
        priority: 1,
        enabled: true,
        timeout_ms: 5000,
        max_retries: 2,
      },
      {
        name: 'test-knowledge-base',
        type: 'file',
        base_url: './test-data/knowledge-base',
        refresh_interval: '1h',
        priority: 2,
        enabled: true,
        timeout_ms: 5000,
        max_retries: 2,
      },
    ],
    embedding: {
      enabled: true,
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      cache_size: 100,
    },
  };
  
  const configFilename = path.join(CONFIG.outputDir, 'configs', 'test-config.yaml');
  const yaml = `# Test configuration for Personal Pipeline MCP Server
${Object.entries(sampleConfig).map(([key, value]) => 
  `${key}:\n${JSON.stringify(value, null, 2).split('\n').map(line => `  ${line}`).join('\n')}`
).join('\n\n')}`;
  
  await fs.writeFile(configFilename, yaml);
  console.log('✅ Generated sample configuration');
  
  // Generate summary
  const summary = {
    generated_at: new Date().toISOString(),
    total_runbooks: runbookIndex,
    total_knowledge_articles: CONFIG.knowledgeBaseCount,
    alert_scenarios: ALERT_SCENARIOS.length,
    output_directory: CONFIG.outputDir,
    config_file: configFilename,
  };
  
  const summaryFilename = path.join(CONFIG.outputDir, 'generation-summary.json');
  await fs.writeFile(summaryFilename, JSON.stringify(summary, null, 2));
  
  console.log('\n🎉 Sample data generation complete!');
  console.log(`📁 Output directory: ${CONFIG.outputDir}`);
  console.log(`📊 Summary: ${summaryFilename}`);
  console.log(`\nTo use this data:`);
  console.log(`1. Copy test-config.yaml to config/config.yaml`);
  console.log(`2. Update source paths in config.yaml`);
  console.log(`3. Restart the MCP server`);
  console.log(`4. Test with: node scripts/test-mcp.js`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllData().catch(console.error);
}

export { generateAllData, generateRunbook, generateKnowledgeBaseArticle };