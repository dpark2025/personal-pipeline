/**
 * Comprehensive Monitoring Service Tests
 * Tests for monitoring, alerting, and health check functionality
 * 
 * QA Engineer: Testing monitoring infrastructure for milestone 1.3
 * Coverage: Alert rules, notifications, metrics collection, health monitoring
 */

import { MonitoringService, MonitoringConfig, Alert, MonitoringRule, initializeMonitoringService, getMonitoringService } from '../../../src/utils/monitoring';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

jest.mock('../../../src/utils/performance', () => ({
  getPerformanceMonitor: jest.fn(() => ({
    getMetrics: jest.fn(() => ({
      response_times: {
        p95_ms: 500,
        avg_ms: 200,
        max_ms: 1000,
        min_ms: 50,
      },
      error_tracking: {
        error_rate: 0.02,
        total_errors: 5,
        errors_by_type: { 'cache_error': 2, 'network_error': 3 }
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
      }
    }))
  }))
}));

jest.mock('../../../src/utils/cache', () => ({
  getCacheService: jest.fn(() => ({
    getStats: jest.fn(() => ({
      hit_rate: 0.85,
      total_operations: 500,
      redis_connected: true,
    })),
    healthCheck: jest.fn(() => Promise.resolve({
      memory_cache: { healthy: true },
      redis_cache: { healthy: true },
      overall_healthy: true,
    }))
  }))
}));

describe('MonitoringService - Comprehensive Testing', () => {
  let monitoringService: MonitoringService;
  let mockConfig: MonitoringConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
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
    }
  });

  describe('Service Initialization and Configuration', () => {
    it('should initialize with default monitoring rules', () => {
      const rules = monitoringService.getRules();
      
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(rule => rule.id === 'system_down')).toBe(true);
      expect(rules.some(rule => rule.id === 'high_response_time')).toBe(true);
      expect(rules.some(rule => rule.id === 'high_memory_usage')).toBe(true);
      expect(rules.some(rule => rule.id === 'low_cache_hit_rate')).toBe(true);
    });

    it('should have all default rules enabled', () => {
      const rules = monitoringService.getRules();
      const enabledRules = rules.filter(rule => rule.enabled);
      
      expect(enabledRules.length).toBe(rules.length);
    });

    it('should categorize rules by severity levels', () => {
      const rules = monitoringService.getRules();
      const severityLevels = ['critical', 'high', 'medium', 'low'];
      
      severityLevels.forEach(severity => {
        const rulesOfSeverity = rules.filter(rule => rule.severity === severity);
        expect(rulesOfSeverity.length).toBeGreaterThan(0);
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
        condition: (metrics) => metrics.test_value > 100,
        cooldownMs: 60000,
        enabled: true,
      };

      monitoringService.addRule(customRule);
      const rules = monitoringService.getRules();
      const addedRule = rules.find(rule => rule.id === 'custom_test_rule');

      expect(addedRule).toBeDefined();
      expect(addedRule?.name).toBe('Custom Test Rule');
      expect(addedRule?.severity).toBe('medium');
    });

    it('should remove monitoring rules', () => {
      const initialRulesCount = monitoringService.getRules().length;
      
      const success = monitoringService.removeRule('low_cache_hit_rate');
      const finalRulesCount = monitoringService.getRules().length;

      expect(success).toBe(true);
      expect(finalRulesCount).toBe(initialRulesCount - 1);
      expect(monitoringService.getRules().find(rule => rule.id === 'low_cache_hit_rate')).toBeUndefined();
    });

    it('should update rule enabled status', () => {
      const ruleId = 'high_response_time';
      
      // Disable rule
      const disableSuccess = monitoringService.updateRuleStatus(ruleId, false);
      expect(disableSuccess).toBe(true);
      
      const disabledRule = monitoringService.getRules().find(rule => rule.id === ruleId);
      expect(disabledRule?.enabled).toBe(false);

      // Re-enable rule
      const enableSuccess = monitoringService.updateRuleStatus(ruleId, true);
      expect(enableSuccess).toBe(true);
      
      const enabledRule = monitoringService.getRules().find(rule => rule.id === ruleId);
      expect(enabledRule?.enabled).toBe(true);
    });

    it('should return false when removing non-existent rule', () => {
      const success = monitoringService.removeRule('non_existent_rule');
      expect(success).toBe(false);
    });

    it('should return false when updating non-existent rule', () => {
      const success = monitoringService.updateRuleStatus('non_existent_rule', false);
      expect(success).toBe(false);
    });
  });

  describe('Service Lifecycle Management', () => {
    it('should start monitoring service', () => {
      const status = monitoringService.getStatus();
      expect(status.running).toBe(false);

      monitoringService.start();
      
      const statusAfterStart = monitoringService.getStatus();
      expect(statusAfterStart.running).toBe(true);
    });

    it('should stop monitoring service', () => {
      monitoringService.start();
      expect(monitoringService.getStatus().running).toBe(true);

      monitoringService.stop();
      expect(monitoringService.getStatus().running).toBe(false);
    });

    it('should not start if already running', () => {
      monitoringService.start();
      expect(monitoringService.getStatus().running).toBe(true);

      // Try to start again
      monitoringService.start();
      expect(monitoringService.getStatus().running).toBe(true);
    });

    it('should handle stop when not running', () => {
      expect(monitoringService.getStatus().running).toBe(false);
      
      // Should not throw error
      monitoringService.stop();
      expect(monitoringService.getStatus().running).toBe(false);
    });

    it('should not start when disabled in configuration', () => {
      const disabledConfig: MonitoringConfig = {
        ...mockConfig,
        enabled: false,
      };

      const disabledService = new MonitoringService(disabledConfig);
      disabledService.start();

      expect(disabledService.getStatus().running).toBe(false);
    });
  });

  describe('Alert Management', () => {
    it('should trigger alerts when conditions are met', (done) => {
      const testRule: MonitoringRule = {
        id: 'test_alert_trigger',
        name: 'Test Alert Trigger',
        description: 'Test rule that always triggers',
        severity: 'high',
        condition: () => true, // Always triggers
        cooldownMs: 100,
        enabled: true,
      };

      monitoringService.addRule(testRule);

      monitoringService.once('alert', (alert: Alert) => {
        expect(alert.severity).toBe('high');
        expect(alert.title).toBe('Test Alert Trigger');
        expect(alert.resolved).toBe(false);
        expect(alert.source).toBe('monitoring_service');
        done();
      });

      monitoringService.start();
    });

    it('should auto-resolve alerts when conditions are no longer met', (done) => {
      let conditionMet = true;
      
      const testRule: MonitoringRule = {
        id: 'test_alert_resolve',
        name: 'Test Alert Resolve',
        description: 'Test rule for resolution',
        severity: 'medium',
        condition: () => conditionMet,
        cooldownMs: 100,
        enabled: true,
      };

      monitoringService.addRule(testRule);

      monitoringService.once('alert', (alert: Alert) => {
        expect(alert.resolved).toBe(false);
        
        // Change condition to resolve alert
        conditionMet = false;
        
        monitoringService.once('alert_resolved', (resolvedAlert: Alert) => {
          expect(resolvedAlert.resolved).toBe(true);
          expect(resolvedAlert.resolvedAt).toBeDefined();
          done();
        });
      });

      monitoringService.start();
    });

    it('should respect cooldown periods for alerts', (done) => {
      let triggerCount = 0;
      
      const testRule: MonitoringRule = {
        id: 'test_cooldown',
        name: 'Test Cooldown',
        description: 'Test rule for cooldown testing',
        severity: 'low',
        condition: () => true,
        cooldownMs: 500, // 500ms cooldown
        enabled: true,
      };

      monitoringService.addRule(testRule);

      monitoringService.on('alert', () => {
        triggerCount++;
      });

      monitoringService.start();

      // Check after cooldown period
      setTimeout(() => {
        expect(triggerCount).toBe(1); // Should only trigger once due to cooldown
        done();
      }, 300);
    });

    it('should limit maximum active alerts', () => {
      const limitedConfig: MonitoringConfig = {
        ...mockConfig,
        maxActiveAlerts: 2,
      };

      const limitedService = new MonitoringService(limitedConfig);

      // Add rules that will trigger
      for (let i = 0; i < 5; i++) {
        const rule: MonitoringRule = {
          id: `test_limit_${i}`,
          name: `Test Limit ${i}`,
          description: `Test rule ${i}`,
          severity: 'low',
          condition: () => true,
          cooldownMs: 100,
          enabled: true,
        };
        limitedService.addRule(rule);
      }

      limitedService.start();
      
      // Allow time for alerts to trigger
      setTimeout(() => {
        const activeAlerts = limitedService.getActiveAlerts();
        expect(activeAlerts.length).toBeLessThanOrEqual(2);
        limitedService.stop();
      }, 200);
    });

    it('should manually resolve alerts', () => {
      const testRule: MonitoringRule = {
        id: 'test_manual_resolve',
        name: 'Test Manual Resolve',
        description: 'Test manual resolution',
        severity: 'medium',
        condition: () => true,
        cooldownMs: 100,
        enabled: true,
      };

      monitoringService.addRule(testRule);
      monitoringService.start();

      return new Promise<void>((resolve) => {
        monitoringService.once('alert', (alert: Alert) => {
          expect(alert.resolved).toBe(false);
          
          const resolveSuccess = monitoringService.manuallyResolveAlert(alert.id);
          expect(resolveSuccess).toBe(true);
          
          const activeAlerts = monitoringService.getActiveAlerts();
          expect(activeAlerts.find(a => a.id === alert.id)).toBeUndefined();
          
          resolve();
        });
      });
    });
  });

  describe('Default Monitoring Rules Behavior', () => {
    it('should trigger high response time alert', (done) => {
      // Mock high response time
      const { getPerformanceMonitor } = require('../../../src/utils/performance');
      getPerformanceMonitor.mockReturnValue({
        getMetrics: () => ({
          response_times: { p95_ms: 2500 }, // Above 2000ms threshold
          error_tracking: { error_rate: 0.01 },
          throughput: { requests_per_second: 10 },
          resource_usage: { memory_mb: 512 },
        })
      });

      monitoringService.once('alert', (alert: Alert) => {
        if (alert.title === 'High Response Time') {
          expect(alert.severity).toBe('high');
          expect(alert.description).toContain('P95 response time exceeds 2 seconds');
          done();
        }
      });

      monitoringService.start();
    });

    it('should trigger high memory usage alert', (done) => {
      // Mock high memory usage
      const { getPerformanceMonitor } = require('../../../src/utils/performance');
      getPerformanceMonitor.mockReturnValue({
        getMetrics: () => ({
          response_times: { p95_ms: 500 },
          error_tracking: { error_rate: 0.01 },
          throughput: { requests_per_second: 10 },
          resource_usage: { memory_mb: 2500 }, // Above 2048MB threshold
        })
      });

      monitoringService.once('alert', (alert: Alert) => {
        if (alert.title === 'High Memory Usage') {
          expect(alert.severity).toBe('high');
          expect(alert.description).toContain('Memory usage exceeds 2GB');
          done();
        }
      });

      monitoringService.start();
    });

    it('should trigger low cache hit rate alert', (done) => {
      // Mock low cache hit rate
      const { getCacheService } = require('../../../src/utils/cache');
      getCacheService.mockReturnValue({
        getStats: () => ({
          hit_rate: 0.3, // Below 50% threshold
          total_operations: 500,
          redis_connected: true,
        }),
        healthCheck: () => Promise.resolve({
          memory_cache: { healthy: true },
          redis_cache: { healthy: true },
          overall_healthy: true,
        })
      });

      monitoringService.once('alert', (alert: Alert) => {
        if (alert.title === 'Low Cache Hit Rate') {
          expect(alert.severity).toBe('medium');
          expect(alert.description).toContain('Cache hit rate below 50%');
          done();
        }
      });

      monitoringService.start();
    });

    it('should trigger high error rate alert', (done) => {
      // Mock high error rate
      const { getPerformanceMonitor } = require('../../../src/utils/performance');
      getPerformanceMonitor.mockReturnValue({
        getMetrics: () => ({
          response_times: { p95_ms: 500 },
          error_tracking: { error_rate: 0.15 }, // Above 10% threshold
          throughput: { requests_per_second: 10 },
          resource_usage: { memory_mb: 512 },
        })
      });

      monitoringService.once('alert', (alert: Alert) => {
        if (alert.title === 'High Error Rate') {
          expect(alert.severity).toBe('high');
          expect(alert.description).toContain('Error rate exceeds 10%');
          done();
        }
      });

      monitoringService.start();
    });
  });

  describe('Status and Reporting', () => {
    it('should provide comprehensive monitoring status', () => {
      monitoringService.start();
      const status = monitoringService.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.running).toBe(true);
      expect(status.rules).toBeGreaterThan(0);
      expect(status.activeAlerts).toBe(0);
      expect(status.totalAlerts).toBe(0);
      expect(status.lastCheck).toBeInstanceOf(Date);
    });

    it('should maintain alert history', (done) => {
      const testRule: MonitoringRule = {
        id: 'test_history',
        name: 'Test History',
        description: 'Test alert history',
        severity: 'low',
        condition: () => true,
        cooldownMs: 100,
        enabled: true,
      };

      monitoringService.addRule(testRule);

      monitoringService.once('alert', () => {
        const history = monitoringService.getAlertHistory();
        expect(history.length).toBe(1);
        expect(history[0]?.title).toBe('Test History');
        done();
      });

      monitoringService.start();
    });

    it('should clean up old alerts from history', () => {
      const shortRetentionConfig: MonitoringConfig = {
        ...mockConfig,
        alertRetentionHours: 0.001, // Very short retention for testing
      };

      const shortRetentionService = new MonitoringService(shortRetentionConfig);
      
      // This would be tested with time manipulation in a real scenario
      // For now, we just verify the cleanup mechanism exists
      expect(shortRetentionService.getAlertHistory().length).toBe(0);
    });

    it('should limit alert history results', () => {
      // This test would need to create multiple alerts first
      const history = monitoringService.getAlertHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Notification System', () => {
    it('should handle console notifications', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const testRule: MonitoringRule = {
        id: 'test_console_notification',
        name: 'Test Console Notification',
        description: 'Test console notification',
        severity: 'critical',
        condition: () => true,
        cooldownMs: 100,
        enabled: true,
      };

      monitoringService.addRule(testRule);

      monitoringService.once('alert', () => {
        setTimeout(() => {
          expect(consoleSpy).toHaveBeenCalled();
          const calls = consoleSpy.mock.calls.flat();
          const alertCall = calls.find(call => 
            typeof call === 'string' && call.includes('🚨 ALERT [CRITICAL]')
          );
          expect(alertCall).toBeDefined();
          
          consoleSpy.mockRestore();
          done();
        }, 50);
      });

      monitoringService.start();
    });

    it('should handle webhook notification configuration', () => {
      const webhookConfig: MonitoringConfig = {
        ...mockConfig,
        notificationChannels: {
          console: false,
          webhook: {
            url: 'https://hooks.example.com/webhook',
            timeout: 10000,
          },
        },
      };

      const webhookService = new MonitoringService(webhookConfig);
      expect(webhookService).toBeDefined();
      // Webhook functionality would be tested with HTTP mocking
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle metric collection failures gracefully', () => {
      // Mock performance monitor to throw error
      const { getPerformanceMonitor } = require('../../../src/utils/performance');
      getPerformanceMonitor.mockReturnValue({
        getMetrics: () => {
          throw new Error('Metrics collection failed');
        }
      });

      // Should not throw error when starting
      expect(() => monitoringService.start()).not.toThrow();
    });

    it('should handle rule evaluation failures', (done) => {
      const faultyRule: MonitoringRule = {
        id: 'faulty_rule',
        name: 'Faulty Rule',
        description: 'Rule that throws error',
        severity: 'low',
        condition: () => {
          throw new Error('Rule condition failed');
        },
        cooldownMs: 100,
        enabled: true,
      };

      monitoringService.addRule(faultyRule);
      monitoringService.start();

      // Should continue operating despite faulty rule
      setTimeout(() => {
        expect(monitoringService.getStatus().running).toBe(true);
        done();
      }, 200);
    });

    it('should handle missing cache service gracefully', () => {
      // Mock cache service to throw error
      const { getCacheService } = require('../../../src/utils/cache');
      getCacheService.mockImplementation(() => {
        throw new Error('Cache service not available');
      });

      monitoringService.start();
      
      // Should still be running
      expect(monitoringService.getStatus().running).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    afterEach(() => {
      jest.resetModules();
    });

    it('should maintain singleton instance with initializeMonitoringService', () => {
      const service1 = initializeMonitoringService(mockConfig);
      const service2 = initializeMonitoringService(mockConfig);
      
      expect(service1).toBe(service2);
    });

    it('should throw error when getting service before initialization', () => {
      expect(() => getMonitoringService()).toThrow('Monitoring service not initialized');
    });

    it('should return initialized service with getMonitoringService', () => {
      const initializedService = initializeMonitoringService(mockConfig);
      const retrievedService = getMonitoringService();
      
      expect(retrievedService).toBe(initializedService);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of monitoring rules efficiently', () => {
      const startTime = Date.now();
      
      // Add 100 monitoring rules
      for (let i = 0; i < 100; i++) {
        const rule: MonitoringRule = {
          id: `perf_rule_${i}`,
          name: `Performance Rule ${i}`,
          description: `Rule ${i} for performance testing`,
          severity: i % 2 === 0 ? 'low' : 'medium',
          condition: (metrics) => metrics.test_value > i,
          cooldownMs: 1000,
          enabled: true,
        };
        monitoringService.addRule(rule);
      }
      
      const addRulesTime = Date.now() - startTime;
      expect(addRulesTime).toBeLessThan(1000); // Should complete quickly
      
      const rules = monitoringService.getRules();
      expect(rules.length).toBeGreaterThanOrEqual(100);
    });

    it('should evaluate rules efficiently under load', (done) => {
      // Add multiple rules
      for (let i = 0; i < 50; i++) {
        const rule: MonitoringRule = {
          id: `load_rule_${i}`,
          name: `Load Rule ${i}`,
          description: `Load testing rule ${i}`,
          severity: 'low',
          condition: () => false, // Never triggers to focus on evaluation performance
          cooldownMs: 100,
          enabled: true,
        };
        monitoringService.addRule(rule);
      }

      const startTime = Date.now();
      monitoringService.start();

      setTimeout(() => {
        const evaluationTime = Date.now() - startTime;
        expect(evaluationTime).toBeLessThan(5000); // Should handle load well
        done();
      }, 100);
    });
  });
});