/**
 * Monitoring Service Tests using Node.js Test Runner
 * 
 * Tests monitoring, alerting, and health check functionality
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  MonitoringService,
  initializeMonitoringService,
  getMonitoringService,
} from '../../src/utils/monitoring.js';
import type { MonitoringConfig, MonitoringRule } from '../../src/utils/monitoring.js';

// Mock logger to prevent console output during tests
const mockLogger = {
  info: mock.fn(),
  debug: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
};

// Mock performance monitor
const mockPerformanceMonitor = {
  getMetrics: mock.fn(() => ({
    response_times: {
      p95_ms: 500,
      avg_ms: 200,
      max_ms: 1000,
      min_ms: 50,
    },
    error_tracking: {
      error_rate: 0.02,
      total_errors: 5,
      errors_by_type: { cache_error: 2, network_error: 3 },
    },
    throughput: {
      requests_per_second: 10,
      total_requests: 1000,
      window_size_seconds: 60,
    },
    resource_usage: {
      memory_mb: 512,
      cpu_percent: 25,
      active_handles: 10,
      active_requests: 2,
    },
  })),
};

// Mock cache service
const mockCacheService = {
  getStats: mock.fn(() => ({
    hit_rate: 0.85,
    total_operations: 500,
    redis_connected: true,
  })),
  healthCheck: mock.fn(async () => ({
    memory_cache: { healthy: true },
    redis_cache: { healthy: true },
    overall_healthy: true,
  })),
};

describe('MonitoringService (Node.js Test Runner)', () => {
  let monitoringService: MonitoringService;
  let mockConfig: MonitoringConfig;

  beforeEach(() => {
    // Reset all mock calls
    Object.values(mockLogger).forEach(fn => fn.mock.resetCalls());
    mockPerformanceMonitor.getMetrics.mock.resetCalls();
    Object.values(mockCacheService).forEach(fn => {
      if (typeof fn === 'object' && fn.mock) {
        fn.mock.resetCalls();
      }
    });

    mockConfig = {
      enabled: true,
      checkIntervalMs: 1000, // 1 second for faster testing
      alertRetentionHours: 1,
      maxActiveAlerts: 10,
      notificationChannels: {
        console: true,
        webhook: {
          url: 'http://localhost:3000/webhook',
          timeout: 5000,
        },
      },
    };

    monitoringService = new MonitoringService(mockConfig);
  });

  afterEach(() => {
    if (monitoringService) {
      monitoringService.stop();
      monitoringService.removeAllListeners();
    }
  });

  describe('Service Initialization and Configuration', () => {
    it('should initialize with default monitoring rules', () => {
      const rules = monitoringService.getRules();

      assert(rules.length > 0);
      assert(rules.some(rule => rule.id === 'system_down'));
      assert(rules.some(rule => rule.id === 'high_response_time'));
      assert(rules.some(rule => rule.id === 'high_memory_usage'));
      assert(rules.some(rule => rule.id === 'low_cache_hit_rate'));
    });

    it('should have all default rules enabled', () => {
      const rules = monitoringService.getRules();
      const enabledRules = rules.filter(rule => rule.enabled);

      assert.strictEqual(enabledRules.length, rules.length);
    });

    it('should categorize rules by severity levels', () => {
      const rules = monitoringService.getRules();
      const severityLevels = ['critical', 'high', 'medium', 'low'];

      severityLevels.forEach(severity => {
        const rulesOfSeverity = rules.filter(rule => rule.severity === severity);
        assert(rulesOfSeverity.length > 0);
      });
    });
  });

  describe('Rule Management', () => {
    it('should add custom monitoring rules', () => {
      const customRule: MonitoringRule = {
        id: 'custom_test_rule',
        name: 'Custom Test Rule',
        description: 'A test rule for QA validation',
        severity: 'medium',
        condition: (metrics: any) => metrics.test_value > 100,
        cooldownMs: 60000,
        enabled: true,
      };

      monitoringService.addRule(customRule);
      const rules = monitoringService.getRules();
      const addedRule = rules.find(rule => rule.id === 'custom_test_rule');

      assert(addedRule);
      assert.strictEqual(addedRule.name, 'Custom Test Rule');
      assert.strictEqual(addedRule.severity, 'medium');
    });

    it('should remove monitoring rules', () => {
      const initialRulesCount = monitoringService.getRules().length;

      const success = monitoringService.removeRule('low_cache_hit_rate');
      const finalRulesCount = monitoringService.getRules().length;

      assert.strictEqual(success, true);
      assert.strictEqual(finalRulesCount, initialRulesCount - 1);
      assert.strictEqual(
        monitoringService.getRules().find(rule => rule.id === 'low_cache_hit_rate'),
        undefined
      );
    });

    it('should update rule enabled status', () => {
      const ruleId = 'high_response_time';

      // Disable rule
      const disableSuccess = monitoringService.updateRuleStatus(ruleId, false);
      assert.strictEqual(disableSuccess, true);

      const disabledRule = monitoringService.getRules().find(rule => rule.id === ruleId);
      assert.strictEqual(disabledRule?.enabled, false);

      // Re-enable rule
      const enableSuccess = monitoringService.updateRuleStatus(ruleId, true);
      assert.strictEqual(enableSuccess, true);

      const enabledRule = monitoringService.getRules().find(rule => rule.id === ruleId);
      assert.strictEqual(enabledRule?.enabled, true);
    });

    it('should return false when removing non-existent rule', () => {
      const success = monitoringService.removeRule('non_existent_rule');
      assert.strictEqual(success, false);
    });

    it('should return false when updating non-existent rule', () => {
      const success = monitoringService.updateRuleStatus('non_existent_rule', false);
      assert.strictEqual(success, false);
    });
  });

  describe('Metrics Recording and Retrieval', () => {
    it('should record custom metrics', () => {
      const metricName = 'custom_metric';
      const metricValue = 42;

      monitoringService.recordMetric(metricName, metricValue);

      // Verify metric was recorded (implementation specific)
      assert.doesNotThrow(() => {
        monitoringService.recordMetric(metricName, metricValue);
      });
    });

    it('should get monitoring status', () => {
      const status = monitoringService.getStatus();

      assert(status);
      assert(typeof status.status === 'string');
    });

    it('should handle alert history', () => {
      const history = monitoringService.getAlertHistory();
      assert(Array.isArray(history));
    });

    it('should handle active alerts', () => {
      const activeAlerts = monitoringService.getActiveAlerts();
      assert(Array.isArray(activeAlerts));
    });
  });

  describe('Manual Alert Management', () => {
    it('should manually resolve alerts', () => {
      const alertId = 'test-alert-123';
      const resolved = monitoringService.manuallyResolveAlert(alertId);
      
      // Should return boolean indicating success/failure
      assert(typeof resolved === 'boolean');
    });
  });

  describe('Health Check Functionality', () => {
    it('should perform health check', async () => {
      const health = await monitoringService.healthCheck();

      assert(health);
      assert(typeof health.healthy === 'boolean');
    });
  });

  describe('Service Lifecycle', () => {
    it('should start and stop monitoring', () => {
      // Should not throw errors
      assert.doesNotThrow(() => {
        monitoringService.start();
        monitoringService.stop();
      });
    });

    it('should shut down gracefully', async () => {
      await assert.doesNotReject(async () => {
        await monitoringService.shutdown();
      });
    });
  });

  describe('Threshold Checking', () => {
    it('should check thresholds', () => {
      // Should not throw when checking thresholds
      assert.doesNotThrow(() => {
        monitoringService.checkThresholds();
      });
    });
  });
});

describe('Monitoring Service Factory Functions (Node.js Test Runner)', () => {
  afterEach(() => {
    // Clean up singleton state
    try {
      const service = getMonitoringService();
      service.stop();
    } catch (error) {
      // Service may not be initialized
    }
  });

  it('should initialize monitoring service', () => {
    const config: MonitoringConfig = {
      enabled: true,
      checkIntervalMs: 5000,
      alertRetentionHours: 24,
      maxActiveAlerts: 50,
      notificationChannels: {
        console: true,
      },
    };

    const service = initializeMonitoringService(config);
    assert(service instanceof MonitoringService);
  });

  it('should return same service instance', () => {
    const config: MonitoringConfig = {
      enabled: true,
      checkIntervalMs: 5000,
      alertRetentionHours: 24,
      maxActiveAlerts: 50,
      notificationChannels: {
        console: true,
      },
    };

    const service1 = initializeMonitoringService(config);
    const service2 = getMonitoringService();

    assert.strictEqual(service1, service2);
  });
});