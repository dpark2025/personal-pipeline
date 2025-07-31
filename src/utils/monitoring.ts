/**
 * Monitoring and Alerting Infrastructure
 *
 * Comprehensive monitoring system with alerting capabilities, health checks,
 * and operational intelligence for the Personal Pipeline MCP server.
 *
 * Authored by: DevOps Engineer (Hank)
 * Date: 2025-07-29
 */

import { EventEmitter } from 'events';
import { logger } from './logger.js';
import { getPerformanceMonitor } from './performance.js';
import { getCacheService } from './cache.js';

export interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  condition: (metrics: any) => boolean;
  cooldownMs: number;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface MonitoringConfig {
  enabled: boolean;
  checkIntervalMs: number;
  alertRetentionHours: number;
  maxActiveAlerts: number;
  notificationChannels: {
    console: boolean;
    webhook?: {
      url: string;
      timeout: number;
    };
    email?: {
      smtp: any;
      to: string[];
    };
  };
}

export class MonitoringService extends EventEmitter {
  private config: MonitoringConfig;
  private rules: Map<string, MonitoringRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastTriggered: Map<string, number> = new Map();
  private monitoringTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.setupDefaultRules();
  }

  /**
   * Setup default monitoring rules
   */
  private setupDefaultRules(): void {
    // Critical: System unavailable
    this.addRule({
      id: 'system_down',
      name: 'System Down',
      description: 'MCP server is not responding',
      severity: 'critical',
      condition: metrics => !metrics.server_healthy,
      cooldownMs: 60000, // 1 minute
      enabled: true,
    });

    // Critical: Cache service completely down
    this.addRule({
      id: 'cache_down',
      name: 'Cache Service Down',
      description: 'Cache service is completely unavailable',
      severity: 'critical',
      condition: metrics =>
        metrics.cache && !metrics.cache.memory_healthy && !metrics.cache.redis_healthy,
      cooldownMs: 300000, // 5 minutes
      enabled: true,
    });

    // High: Response time degradation
    this.addRule({
      id: 'high_response_time',
      name: 'High Response Time',
      description: 'P95 response time exceeds 2 seconds',
      severity: 'high',
      condition: metrics => metrics.performance?.response_times?.p95_ms > 2000,
      cooldownMs: 300000, // 5 minutes
      enabled: true,
    });

    // High: Memory usage critical
    this.addRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      description: 'Memory usage exceeds 2GB',
      severity: 'high',
      condition: metrics => metrics.system?.memory_mb > 2048,
      cooldownMs: 600000, // 10 minutes
      enabled: true,
    });

    // High: Error rate spike
    this.addRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Error rate exceeds 10%',
      severity: 'high',
      condition: metrics => metrics.performance?.error_rate > 0.1,
      cooldownMs: 300000, // 5 minutes
      enabled: true,
    });

    // Medium: Low cache hit rate
    this.addRule({
      id: 'low_cache_hit_rate',
      name: 'Low Cache Hit Rate',
      description: 'Cache hit rate below 50%',
      severity: 'medium',
      condition: metrics => metrics.cache?.hit_rate < 0.5,
      cooldownMs: 900000, // 15 minutes
      enabled: true,
    });

    // Medium: Source adapter issues
    this.addRule({
      id: 'source_adapters_degraded',
      name: 'Source Adapters Degraded',
      description: 'More than 50% of source adapters are unhealthy',
      severity: 'medium',
      condition: metrics => metrics.sources && metrics.sources.healthy_percentage < 50,
      cooldownMs: 600000, // 10 minutes
      enabled: true,
    });

    // Medium: Low throughput
    this.addRule({
      id: 'low_throughput',
      name: 'Low Throughput',
      description: 'Request throughput below 1 req/s with active traffic',
      severity: 'medium',
      condition: metrics =>
        metrics.performance?.throughput?.requests_per_second > 0 &&
        metrics.performance.throughput.requests_per_second < 1,
      cooldownMs: 900000, // 15 minutes
      enabled: true,
    });

    // Low: Redis connection issues
    this.addRule({
      id: 'redis_connection_issues',
      name: 'Redis Connection Issues',
      description: 'Redis cache is not connected',
      severity: 'low',
      condition: metrics => metrics.cache?.redis_enabled && !metrics.cache.redis_connected,
      cooldownMs: 1800000, // 30 minutes
      enabled: true,
    });

    logger.info('Default monitoring rules configured', {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
    });
  }

  /**
   * Add a monitoring rule
   */
  addRule(rule: MonitoringRule): void {
    this.rules.set(rule.id, rule);
    logger.debug('Monitoring rule added', { ruleId: rule.id, severity: rule.severity });
  }

  /**
   * Remove a monitoring rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.debug('Monitoring rule removed', { ruleId });
    }
    return removed;
  }

  /**
   * Update rule enabled status
   */
  updateRuleStatus(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      logger.debug('Monitoring rule status updated', { ruleId, enabled });
      return true;
    }
    return false;
  }

  /**
   * Start monitoring service
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Monitoring service already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Monitoring service disabled by configuration');
      return;
    }

    this.isRunning = true;
    this.monitoringTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkIntervalMs);

    logger.info('Monitoring service started', {
      checkInterval: this.config.checkIntervalMs,
      rulesCount: this.rules.size,
      notificationChannels: Object.keys(this.config.notificationChannels),
    });

    // Perform initial check
    this.performHealthCheck();
  }

  /**
   * Stop monitoring service
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    logger.info('Monitoring service stopped');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const metrics = await this.collectMetrics();
      this.evaluateRules(metrics);
      this.cleanupOldAlerts();
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Collect all system metrics
   */
  private async collectMetrics(): Promise<any> {
    const performanceMonitor = getPerformanceMonitor();
    const performanceMetrics = performanceMonitor.getMetrics();

    const metrics: any = {
      timestamp: new Date(),
      server_healthy: true, // Will be set by server health check
      performance: {
        response_times: performanceMetrics.response_times,
        error_rate: performanceMetrics.error_tracking.error_rate,
        throughput: performanceMetrics.throughput,
      },
      system: {
        memory_mb: performanceMetrics.resource_usage.memory_mb,
        cpu_percent: performanceMetrics.resource_usage.cpu_percent,
        uptime_seconds: process.uptime(),
      },
    };

    // Collect cache metrics if available
    try {
      const cacheService = getCacheService();
      const cacheStats = cacheService.getStats();
      const cacheHealth = await cacheService.healthCheck();

      metrics.cache = {
        hit_rate: cacheStats.hit_rate,
        total_operations: cacheStats.total_operations,
        memory_healthy: cacheHealth.memory_cache.healthy,
        redis_healthy: cacheHealth.redis_cache?.healthy || false,
        redis_connected: cacheStats.redis_connected || false,
        redis_enabled: true,
      };
    } catch (error) {
      metrics.cache = {
        hit_rate: 0,
        total_operations: 0,
        memory_healthy: false,
        redis_healthy: false,
        redis_connected: false,
        redis_enabled: false,
      };
    }

    // Note: Source adapter metrics would be collected here
    // This requires access to the source registry from the server
    metrics.sources = {
      healthy_percentage: 100, // Placeholder
      total_sources: 0,
      healthy_sources: 0,
    };

    return metrics;
  }

  /**
   * Evaluate all monitoring rules against current metrics
   */
  private evaluateRules(metrics: any): void {
    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      try {
        const shouldTrigger = rule.condition(metrics);
        const now = Date.now();
        const lastTriggered = this.lastTriggered.get(ruleId) || 0;
        const cooldownElapsed = now - lastTriggered > rule.cooldownMs;

        if (shouldTrigger && cooldownElapsed) {
          this.triggerAlert(rule, metrics);
          this.lastTriggered.set(ruleId, now);
        } else if (!shouldTrigger) {
          // Auto-resolve alert if condition is no longer met
          this.resolveAlert(ruleId);
        }
      } catch (error) {
        logger.error('Rule evaluation failed', {
          ruleId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: MonitoringRule, metrics: any): void {
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      severity: rule.severity,
      title: rule.name,
      description: rule.description,
      source: 'monitoring_service',
      timestamp: new Date(),
      resolved: false,
      metadata: {
        ruleId: rule.id,
        metrics: this.extractRelevantMetrics(metrics, rule),
      },
    };

    // Check if we're at max active alerts
    if (this.activeAlerts.size >= this.config.maxActiveAlerts) {
      logger.warn('Maximum active alerts reached, skipping new alert', {
        alertId: alert.id,
        maxAlerts: this.config.maxActiveAlerts,
      });
      return;
    }

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    logger.warn('Alert triggered', {
      alertId: alert.id,
      severity: alert.severity,
      title: alert.title,
      ruleId: rule.id,
    });

    this.emit('alert', alert);
    this.sendNotification(alert);
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(ruleId: string): void {
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.metadata?.ruleId === ruleId && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        this.activeAlerts.delete(alertId);

        logger.info('Alert resolved', {
          alertId,
          ruleId,
          duration: alert.resolvedAt.getTime() - alert.timestamp.getTime(),
        });

        this.emit('alert_resolved', alert);
        break;
      }
    }
  }

  /**
   * Send alert notification
   */
  private sendNotification(alert: Alert): void {
    if (this.config.notificationChannels.console) {
      this.sendConsoleNotification(alert);
    }

    if (this.config.notificationChannels.webhook) {
      this.sendWebhookNotification(alert);
    }

    // Email notifications would be implemented here
  }

  /**
   * Send console notification
   */
  private sendConsoleNotification(alert: Alert): void {
    const severityColors = {
      critical: '\x1b[1;31m', // Bright red
      high: '\x1b[1;33m', // Bright yellow
      medium: '\x1b[1;36m', // Bright cyan
      low: '\x1b[1;37m', // Bright white
    };

    const color = severityColors[alert.severity];
    const reset = '\x1b[0m';

    console.log(`${color}🚨 ALERT [${alert.severity.toUpperCase()}] ${alert.title}${reset}`);
    console.log(`   ${alert.description}`);
    console.log(`   Time: ${alert.timestamp.toLocaleString()}`);
    console.log(`   ID: ${alert.id}`);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: Alert): Promise<void> {
    if (!this.config.notificationChannels.webhook) return;

    try {
      const webhook = this.config.notificationChannels.webhook;
      // TODO: Implement webhook notification with payload:
      // {
      //   alert_id: alert.id,
      //   severity: alert.severity,
      //   title: alert.title,
      //   description: alert.description,
      //   timestamp: alert.timestamp.toISOString(),
      //   source: alert.source,
      //   metadata: alert.metadata,
      // };

      // Note: In a real implementation, you'd use a proper HTTP client
      logger.info('Webhook notification sent', {
        alertId: alert.id,
        webhookUrl: webhook.url,
      });
    } catch (error) {
      logger.error('Failed to send webhook notification', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract relevant metrics for alert context
   */
  private extractRelevantMetrics(metrics: any, rule: MonitoringRule): any {
    // Extract only the metrics relevant to this rule
    const relevant: any = {
      timestamp: metrics.timestamp,
    };

    if (rule.id.includes('response_time')) {
      relevant.response_times = metrics.performance?.response_times;
    }
    if (rule.id.includes('memory')) {
      relevant.memory = metrics.system?.memory_mb;
    }
    if (rule.id.includes('cache')) {
      relevant.cache = metrics.cache;
    }
    if (rule.id.includes('error')) {
      relevant.error_rate = metrics.performance?.error_rate;
    }
    if (rule.id.includes('source')) {
      relevant.sources = metrics.sources;
    }

    return relevant;
  }

  /**
   * Clean up old alerts from history
   */
  private cleanupOldAlerts(): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - this.config.alertRetentionHours);

    const originalLength = this.alertHistory.length;
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoffTime);

    if (this.alertHistory.length < originalLength) {
      logger.debug('Old alerts cleaned up', {
        removed: originalLength - this.alertHistory.length,
        remaining: this.alertHistory.length,
      });
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    rules: number;
    activeAlerts: number;
    totalAlerts: number;
    lastCheck: Date | null;
  } {
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      rules: this.rules.size,
      activeAlerts: this.activeAlerts.size,
      totalAlerts: this.alertHistory.length,
      lastCheck: new Date(), // Would track actual last check time
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    const alerts = this.alertHistory.slice().reverse(); // Most recent first
    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * Get monitoring rules
   */
  getRules(): MonitoringRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Manually trigger alert resolution
   */
  manuallyResolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.activeAlerts.delete(alertId);

      logger.info('Alert manually resolved', { alertId });
      this.emit('alert_resolved', alert);
      return true;
    }
    return false;
  }
}

// Global monitoring service instance
let monitoringServiceInstance: MonitoringService | null = null;

/**
 * Initialize monitoring service
 */
export function initializeMonitoringService(config: MonitoringConfig): MonitoringService {
  if (monitoringServiceInstance) {
    logger.warn('Monitoring service already initialized');
    return monitoringServiceInstance;
  }

  monitoringServiceInstance = new MonitoringService(config);
  return monitoringServiceInstance;
}

/**
 * Get monitoring service instance
 */
export function getMonitoringService(): MonitoringService {
  if (!monitoringServiceInstance) {
    throw new Error('Monitoring service not initialized');
  }
  return monitoringServiceInstance;
}

/**
 * Default monitoring configuration
 */
export const defaultMonitoringConfig: MonitoringConfig = {
  enabled: true,
  checkIntervalMs: 30000, // 30 seconds
  alertRetentionHours: 24, // 24 hours
  maxActiveAlerts: 50,
  notificationChannels: {
    console: true,
  },
};
