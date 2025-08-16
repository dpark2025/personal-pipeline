/**
 * Integration Test Configuration Templates and Utilities
 *
 * Provides configuration templates and utilities for testing different
 * adapter combinations and deployment scenarios.
 *
 * Authored by: Integration Specialist
 * Date: 2025-08-15
 */

import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// ============================================================================
// Configuration Templates
// ============================================================================

export interface IntegrationTestConfiguration {
  name: string;
  description: string;
  adapters: AdapterConfig[];
  expectedBehavior: {
    minimumWorkingAdapters: number;
    expectedPerformance: {
      cachedResponseTime: number;
      uncachedResponseTime: number;
    };
    authenticationRequired: boolean;
    features: string[];
  };
}

export interface AdapterConfig {
  name: string;
  type: 'file' | 'confluence' | 'github' | 'web';
  enabled: boolean;
  priority: number;
  auth?: {
    type: string;
    envVar: string;
    required: boolean;
  };
  testEndpoints?: {
    url: string;
    expected: any;
  }[];
}

// ============================================================================
// Test Configuration Templates
// ============================================================================

export const INTEGRATION_TEST_CONFIGURATIONS: IntegrationTestConfiguration[] = [
  {
    name: 'minimal-local',
    description: 'Minimal configuration with only local file adapter',
    adapters: [
      {
        name: 'local-docs',
        type: 'file',
        enabled: true,
        priority: 1,
      },
    ],
    expectedBehavior: {
      minimumWorkingAdapters: 1,
      expectedPerformance: {
        cachedResponseTime: 50,
        uncachedResponseTime: 200,
      },
      authenticationRequired: false,
      features: ['basic_search', 'runbook_retrieval', 'health_monitoring'],
    },
  },
  {
    name: 'local-plus-web',
    description: 'Local files plus web adapter for external documentation',
    adapters: [
      {
        name: 'local-docs',
        type: 'file',
        enabled: true,
        priority: 1,
      },
      {
        name: 'web-docs',
        type: 'web',
        enabled: true,
        priority: 2,
        testEndpoints: [
          {
            url: 'https://httpbin.org/json',
            expected: { slideshow: true },
          },
        ],
      },
    ],
    expectedBehavior: {
      minimumWorkingAdapters: 1,
      expectedPerformance: {
        cachedResponseTime: 150,
        uncachedResponseTime: 500,
      },
      authenticationRequired: false,
      features: [
        'multi_source_search',
        'cross_source_ranking',
        'failover_support',
        'web_content_processing',
      ],
    },
  },
  {
    name: 'enterprise-github',
    description: 'Enterprise setup with GitHub integration',
    adapters: [
      {
        name: 'local-docs',
        type: 'file',
        enabled: true,
        priority: 1,
      },
      {
        name: 'github-docs',
        type: 'github',
        enabled: true,
        priority: 2,
        auth: {
          type: 'personal_token',
          envVar: 'GITHUB_TOKEN',
          required: true,
        },
      },
    ],
    expectedBehavior: {
      minimumWorkingAdapters: 1,
      expectedPerformance: {
        cachedResponseTime: 200,
        uncachedResponseTime: 1000,
      },
      authenticationRequired: true,
      features: [
        'github_search',
        'repository_indexing',
        'rate_limiting',
        'authentication_validation',
      ],
    },
  },
  {
    name: 'enterprise-confluence',
    description: 'Enterprise setup with Confluence integration',
    adapters: [
      {
        name: 'local-docs',
        type: 'file',
        enabled: true,
        priority: 1,
      },
      {
        name: 'confluence-docs',
        type: 'confluence',
        enabled: true,
        priority: 2,
        auth: {
          type: 'bearer_token',
          envVar: 'CONFLUENCE_TOKEN',
          required: true,
        },
      },
    ],
    expectedBehavior: {
      minimumWorkingAdapters: 1,
      expectedPerformance: {
        cachedResponseTime: 200,
        uncachedResponseTime: 800,
      },
      authenticationRequired: true,
      features: [
        'confluence_search',
        'cql_queries',
        'space_filtering',
        'content_extraction',
      ],
    },
  },
  {
    name: 'full-enterprise',
    description: 'Complete enterprise setup with all adapters',
    adapters: [
      {
        name: 'local-docs',
        type: 'file',
        enabled: true,
        priority: 1,
      },
      {
        name: 'confluence-docs',
        type: 'confluence',
        enabled: true,
        priority: 2,
        auth: {
          type: 'bearer_token',
          envVar: 'CONFLUENCE_TOKEN',
          required: true,
        },
      },
      {
        name: 'github-docs',
        type: 'github',
        enabled: true,
        priority: 3,
        auth: {
          type: 'personal_token',
          envVar: 'GITHUB_TOKEN',
          required: true,
        },
      },
      {
        name: 'external-apis',
        type: 'web',
        enabled: true,
        priority: 4,
      },
    ],
    expectedBehavior: {
      minimumWorkingAdapters: 2,
      expectedPerformance: {
        cachedResponseTime: 200,
        uncachedResponseTime: 1500,
      },
      authenticationRequired: true,
      features: [
        'multi_source_aggregation',
        'intelligent_ranking',
        'failover_resilience',
        'enterprise_auth',
        'comprehensive_search',
      ],
    },
  },
];

// ============================================================================
// Test Scenario Generator
// ============================================================================

export interface TestScenario {
  name: string;
  description: string;
  queries: TestQuery[];
  expectedOutcomes: {
    minimumResults: number;
    minimumSources: number;
    minimumConfidence: number;
    maxResponseTime: number;
  };
}

export interface TestQuery {
  query: string;
  type: 'search' | 'runbook' | 'procedure' | 'escalation';
  parameters?: any;
  expectedSources?: string[];
}

export const INTEGRATION_TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'incident-response-disk-space',
    description: 'Complete disk space incident response workflow',
    queries: [
      {
        query: 'disk space cleanup',
        type: 'search',
        expectedSources: ['local-docs', 'confluence-docs'],
      },
      {
        query: 'disk_space',
        type: 'runbook',
        parameters: {
          alert_type: 'disk_space',
          severity: 'critical',
          affected_systems: ['web-server-01'],
        },
      },
      {
        query: 'emergency_cleanup',
        type: 'procedure',
        parameters: {
          runbook_id: 'disk-space-response',
          step_name: 'emergency_cleanup',
        },
      },
      {
        query: 'critical_escalation',
        type: 'escalation',
        parameters: {
          severity: 'critical',
          business_hours: false,
        },
      },
    ],
    expectedOutcomes: {
      minimumResults: 2,
      minimumSources: 1,
      minimumConfidence: 0.6,
      maxResponseTime: 1000,
    },
  },
  {
    name: 'security-incident-response',
    description: 'Security incident detection and response',
    queries: [
      {
        query: 'security incident response',
        type: 'search',
        expectedSources: ['local-docs', 'confluence-docs', 'github-docs'],
      },
      {
        query: 'security_breach',
        type: 'runbook',
        parameters: {
          alert_type: 'security_breach',
          severity: 'critical',
          affected_systems: ['auth-server', 'user-database'],
        },
      },
    ],
    expectedOutcomes: {
      minimumResults: 1,
      minimumSources: 1,
      minimumConfidence: 0.7,
      maxResponseTime: 500,
    },
  },
  {
    name: 'performance-troubleshooting',
    description: 'Application performance issue investigation',
    queries: [
      {
        query: 'application performance troubleshooting',
        type: 'search',
      },
      {
        query: 'cpu_high',
        type: 'runbook',
        parameters: {
          alert_type: 'cpu_high',
          severity: 'high',
          affected_systems: ['app-server-01'],
        },
      },
    ],
    expectedOutcomes: {
      minimumResults: 1,
      minimumSources: 1,
      minimumConfidence: 0.5,
      maxResponseTime: 800,
    },
  },
  {
    name: 'cross-source-knowledge-search',
    description: 'Knowledge base search across multiple sources',
    queries: [
      {
        query: 'best practices monitoring',
        type: 'search',
      },
      {
        query: 'deployment procedures',
        type: 'search',
      },
      {
        query: 'troubleshooting guides',
        type: 'search',
      },
    ],
    expectedOutcomes: {
      minimumResults: 3,
      minimumSources: 2,
      minimumConfidence: 0.4,
      maxResponseTime: 1200,
    },
  },
];

// ============================================================================
// Configuration Generator
// ============================================================================

export class IntegrationTestConfigGenerator {
  static async generateConfigFile(
    configuration: IntegrationTestConfiguration,
    outputPath: string
  ): Promise<void> {
    const configYaml = this.generateConfigYaml(configuration);
    await writeFile(outputPath, configYaml, 'utf-8');
  }

  private static generateConfigYaml(config: IntegrationTestConfiguration): string {
    const yaml = `# Integration Test Configuration: ${config.name}
# ${config.description}
# Generated for Personal Pipeline Integration Testing

server:
  port: 3000
  host: localhost
  log_level: error  # Reduce noise during testing
  cache_ttl_seconds: 300  # Shorter cache for testing
  max_concurrent_requests: 50
  request_timeout_ms: 30000

# Test Sources Configuration
sources:
${config.adapters.map(adapter => this.generateAdapterConfig(adapter)).join('\n')}

# Test Cache Configuration
cache:
  enabled: true
  strategy: hybrid
  memory:
    max_keys: 500
    ttl_seconds: 300
    check_period_seconds: 60
  redis:
    enabled: false  # Use memory-only for testing
    
# Performance Settings for Testing  
performance:
  enable_monitoring: true
  collect_metrics: true
  
# Testing Features
testing:
  mock_external_services: false
  validate_responses: true
  performance_tracking: true
`;

    return yaml;
  }

  private static generateAdapterConfig(adapter: AdapterConfig): string {
    let config = `  - name: ${adapter.name}
    type: ${adapter.type}
    enabled: ${adapter.enabled}
    priority: ${adapter.priority}
    timeout_ms: 15000
    max_retries: 2`;

    if (adapter.type === 'file') {
      config += `
    base_url: ./test-data
    watch_changes: false
    pdf_extraction: true
    recursive: true
    max_depth: 3
    supported_extensions: ['.md', '.txt', '.json', '.yml']`;
    }

    if (adapter.type === 'confluence' && adapter.auth) {
      config += `
    base_url: https://example.atlassian.net/wiki
    auth:
      type: ${adapter.auth.type}
      token_env: ${adapter.auth.envVar}`;
    }

    if (adapter.type === 'github' && adapter.auth) {
      config += `
    base_url: https://api.github.com/repos/example/docs
    auth:
      type: ${adapter.auth.type}
      token_env: ${adapter.auth.envVar}
    repositories:
      - owner: example
        repo: documentation
        path: docs/`;
    }

    if (adapter.type === 'web') {
      config += `
    base_url: https://httpbin.org
    auth:
      type: none
    endpoints:
      - name: test-endpoint
        url: /json
        method: GET
        content_type: json`;
    }

    return config;
  }

  // ========================================================================
  // Environment Validation
  // ========================================================================

  static validateEnvironment(configuration: IntegrationTestConfiguration): {
    valid: boolean;
    missingRequirements: string[];
    warnings: string[];
  } {
    const missingRequirements: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    configuration.adapters.forEach(adapter => {
      if (adapter.auth?.required && adapter.auth.envVar) {
        if (!process.env[adapter.auth.envVar]) {
          missingRequirements.push(`${adapter.auth.envVar} (required for ${adapter.name})`);
        }
      }
    });

    // Check optional environment variables
    configuration.adapters.forEach(adapter => {
      if (adapter.auth && !adapter.auth.required && adapter.auth.envVar) {
        if (!process.env[adapter.auth.envVar]) {
          warnings.push(`${adapter.auth.envVar} (optional for ${adapter.name}) - adapter may have limited functionality`);
        }
      }
    });

    return {
      valid: missingRequirements.length === 0,
      missingRequirements,
      warnings,
    };
  }

  // ========================================================================
  // Test Data Generation
  // ========================================================================

  static generateTestData(): {
    runbooks: any[];
    knowledgeBase: any[];
    procedures: any[];
  } {
    return {
      runbooks: [
        {
          id: 'disk-space-response',
          title: 'Disk Space Critical Response',
          version: '1.0',
          triggers: [
            { alert_type: 'disk_space', severity: 'critical', threshold: '90%' },
            { alert_type: 'disk_full', severity: 'critical', threshold: '95%' },
          ],
          procedures: ['emergency_cleanup', 'log_rotation', 'escalation'],
          metadata: {
            confidence_score: 0.95,
            success_rate: 0.89,
            avg_resolution_time: 15,
          },
        },
        {
          id: 'memory-leak-investigation',
          title: 'Memory Leak Investigation and Resolution',
          version: '2.1',
          triggers: [
            { alert_type: 'memory_leak', severity: 'high', threshold: '80%' },
            { alert_type: 'oom_killer', severity: 'critical' },
          ],
          procedures: ['heap_dump', 'process_analysis', 'restart_procedure'],
          metadata: {
            confidence_score: 0.87,
            success_rate: 0.76,
            avg_resolution_time: 45,
          },
        },
        {
          id: 'security-incident-response',
          title: 'Security Incident Response Protocol',
          version: '3.0',
          triggers: [
            { alert_type: 'security_breach', severity: 'critical' },
            { alert_type: 'unauthorized_access', severity: 'high' },
          ],
          procedures: ['incident_containment', 'forensic_analysis', 'communication_protocol'],
          metadata: {
            confidence_score: 0.93,
            success_rate: 0.91,
            avg_resolution_time: 120,
          },
        },
      ],
      knowledgeBase: [
        {
          id: 'monitoring-best-practices',
          title: 'System Monitoring Best Practices',
          content: 'Comprehensive guide to monitoring infrastructure and applications...',
          tags: ['monitoring', 'best-practices', 'infrastructure'],
          category: 'knowledge_base',
        },
        {
          id: 'troubleshooting-network',
          title: 'Network Troubleshooting Guide',
          content: 'Step-by-step network troubleshooting procedures...',
          tags: ['network', 'troubleshooting', 'connectivity'],
          category: 'knowledge_base',
        },
        {
          id: 'performance-optimization',
          title: 'Application Performance Optimization',
          content: 'Techniques for optimizing application performance...',
          tags: ['performance', 'optimization', 'applications'],
          category: 'knowledge_base',
        },
      ],
      procedures: [
        {
          id: 'emergency_cleanup',
          name: 'Emergency Disk Cleanup',
          command: 'sudo find /tmp -type f -atime +7 -delete',
          expected_outcome: 'Free up disk space by removing old temporary files',
          timeout_seconds: 300,
          prerequisites: ['sudo_access', 'backup_verification'],
        },
        {
          id: 'heap_dump',
          name: 'Java Heap Dump Analysis',
          command: 'jcmd <PID> GC.run_finalization && jcmd <PID> VM.classloader_stats',
          expected_outcome: 'Generate heap dump for memory analysis',
          timeout_seconds: 600,
          prerequisites: ['java_process_id', 'monitoring_tools'],
        },
        {
          id: 'incident_containment',
          name: 'Security Incident Containment',
          command: 'sudo iptables -A INPUT -s <SUSPICIOUS_IP> -j DROP',
          expected_outcome: 'Block suspicious traffic and contain security incident',
          timeout_seconds: 60,
          prerequisites: ['security_clearance', 'incident_verification'],
        },
      ],
    };
  }
}

export default IntegrationTestConfigGenerator;