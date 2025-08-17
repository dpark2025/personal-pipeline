"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMonitoringConfig = exports.MonitoringService = void 0;
exports.initializeMonitoringService = initializeMonitoringService;
exports.getMonitoringService = getMonitoringService;
const events_1 = require("events");
const logger_js_1 = require("./logger.js");
const performance_js_1 = require("./performance.js");
const cache_js_1 = require("./cache.js");
class MonitoringService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.rules = new Map();
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.lastTriggered = new Map();
        this.monitoringTimer = null;
        this.isRunning = false;
        this.config = config;
        this.setupDefaultRules();
    }
    setupDefaultRules() {
        this.addRule({
            id: 'system_down',
            name: 'System Down',
            description: 'MCP server is not responding',
            severity: 'critical',
            condition: metrics => !metrics.server_healthy,
            cooldownMs: 60000,
            enabled: true,
        });
        this.addRule({
            id: 'cache_down',
            name: 'Cache Service Down',
            description: 'Cache service is completely unavailable',
            severity: 'critical',
            condition: metrics => metrics.cache && !metrics.cache.memory_healthy && !metrics.cache.redis_healthy,
            cooldownMs: 300000,
            enabled: true,
        });
        this.addRule({
            id: 'high_response_time',
            name: 'High Response Time',
            description: 'P95 response time exceeds 2 seconds',
            severity: 'high',
            condition: metrics => metrics.performance?.response_times?.p95_ms > 2000,
            cooldownMs: 300000,
            enabled: true,
        });
        this.addRule({
            id: 'high_memory_usage',
            name: 'High Memory Usage',
            description: 'Memory usage exceeds 2GB',
            severity: 'high',
            condition: metrics => metrics.system?.memory_mb > 2048,
            cooldownMs: 600000,
            enabled: true,
        });
        this.addRule({
            id: 'high_error_rate',
            name: 'High Error Rate',
            description: 'Error rate exceeds 10%',
            severity: 'high',
            condition: metrics => metrics.performance?.error_rate > 0.1,
            cooldownMs: 300000,
            enabled: true,
        });
        this.addRule({
            id: 'low_cache_hit_rate',
            name: 'Low Cache Hit Rate',
            description: 'Cache hit rate below 50%',
            severity: 'medium',
            condition: metrics => metrics.cache?.hit_rate < 0.5,
            cooldownMs: 900000,
            enabled: true,
        });
        this.addRule({
            id: 'source_adapters_degraded',
            name: 'Source Adapters Degraded',
            description: 'More than 50% of source adapters are unhealthy',
            severity: 'medium',
            condition: metrics => metrics.sources && metrics.sources.healthy_percentage < 50,
            cooldownMs: 600000,
            enabled: true,
        });
        this.addRule({
            id: 'low_throughput',
            name: 'Low Throughput',
            description: 'Request throughput below 1 req/s with active traffic',
            severity: 'medium',
            condition: metrics => metrics.performance?.throughput?.requests_per_second > 0 &&
                metrics.performance.throughput.requests_per_second < 1,
            cooldownMs: 900000,
            enabled: true,
        });
        this.addRule({
            id: 'redis_connection_issues',
            name: 'Redis Connection Issues',
            description: 'Redis cache is not connected',
            severity: 'low',
            condition: metrics => metrics.cache?.redis_enabled && !metrics.cache.redis_connected,
            cooldownMs: 1800000,
            enabled: true,
        });
        logger_js_1.logger.info('Default monitoring rules configured', {
            totalRules: this.rules.size,
            enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
        });
    }
    addRule(rule) {
        this.rules.set(rule.id, rule);
        logger_js_1.logger.debug('Monitoring rule added', { ruleId: rule.id, severity: rule.severity });
    }
    removeRule(ruleId) {
        const removed = this.rules.delete(ruleId);
        if (removed) {
            logger_js_1.logger.debug('Monitoring rule removed', { ruleId });
        }
        return removed;
    }
    updateRuleStatus(ruleId, enabled) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = enabled;
            logger_js_1.logger.debug('Monitoring rule status updated', { ruleId, enabled });
            return true;
        }
        return false;
    }
    start() {
        if (this.isRunning) {
            logger_js_1.logger.warn('Monitoring service already running');
            return;
        }
        if (!this.config.enabled) {
            logger_js_1.logger.info('Monitoring service disabled by configuration');
            return;
        }
        this.isRunning = true;
        this.monitoringTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.checkIntervalMs);
        logger_js_1.logger.info('Monitoring service started', {
            checkInterval: this.config.checkIntervalMs,
            rulesCount: this.rules.size,
            notificationChannels: Object.keys(this.config.notificationChannels),
        });
        this.performHealthCheck();
    }
    stop() {
        if (!this.isRunning)
            return;
        this.isRunning = false;
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }
        logger_js_1.logger.info('Monitoring service stopped');
    }
    async performHealthCheck() {
        try {
            const metrics = await this.collectMetrics();
            this.evaluateRules(metrics);
            this.cleanupOldAlerts();
        }
        catch (error) {
            logger_js_1.logger.error('Health check failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async collectMetrics() {
        const performanceMonitor = (0, performance_js_1.getPerformanceMonitor)();
        const performanceMetrics = performanceMonitor.getMetrics();
        const metrics = {
            timestamp: new Date(),
            server_healthy: true,
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
        try {
            const cacheService = (0, cache_js_1.getCacheService)();
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
        }
        catch (error) {
            logger_js_1.logger.debug('Cache service not available for metrics collection', {
                error: error instanceof Error ? error.message : String(error),
            });
            metrics.cache = {
                hit_rate: 0,
                total_operations: 0,
                memory_healthy: false,
                redis_healthy: false,
                redis_connected: false,
                redis_enabled: false,
            };
        }
        metrics.sources = {
            healthy_percentage: 100,
            total_sources: 0,
            healthy_sources: 0,
        };
        return metrics;
    }
    evaluateRules(metrics) {
        for (const [ruleId, rule] of this.rules.entries()) {
            if (!rule.enabled)
                continue;
            try {
                const shouldTrigger = rule.condition(metrics);
                const now = Date.now();
                const lastTriggered = this.lastTriggered.get(ruleId) || 0;
                const cooldownElapsed = now - lastTriggered > rule.cooldownMs;
                if (shouldTrigger && cooldownElapsed) {
                    this.triggerAlert(rule, metrics);
                    this.lastTriggered.set(ruleId, now);
                }
                else if (!shouldTrigger) {
                    this.resolveAlert(ruleId);
                }
            }
            catch (error) {
                logger_js_1.logger.error('Rule evaluation failed', {
                    ruleId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    triggerAlert(rule, metrics) {
        const alert = {
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
        if (this.activeAlerts.size >= this.config.maxActiveAlerts) {
            logger_js_1.logger.warn('Maximum active alerts reached, skipping new alert', {
                alertId: alert.id,
                maxAlerts: this.config.maxActiveAlerts,
            });
            return;
        }
        this.activeAlerts.set(alert.id, alert);
        this.alertHistory.push(alert);
        logger_js_1.logger.warn('Alert triggered', {
            alertId: alert.id,
            severity: alert.severity,
            title: alert.title,
            ruleId: rule.id,
        });
        this.emit('alert', alert);
        this.sendNotification(alert);
    }
    resolveAlert(ruleId) {
        for (const [alertId, alert] of this.activeAlerts.entries()) {
            if (alert.metadata?.ruleId === ruleId && !alert.resolved) {
                alert.resolved = true;
                alert.resolvedAt = new Date();
                this.activeAlerts.delete(alertId);
                logger_js_1.logger.info('Alert resolved', {
                    alertId,
                    ruleId,
                    duration: alert.resolvedAt.getTime() - alert.timestamp.getTime(),
                });
                this.emit('alert_resolved', alert);
                break;
            }
        }
    }
    sendNotification(alert) {
        if (this.config.notificationChannels.console) {
            this.sendConsoleNotification(alert);
        }
        if (this.config.notificationChannels.webhook) {
            this.sendWebhookNotification(alert);
        }
    }
    sendConsoleNotification(alert) {
        const logMessage = `🚨 ALERT [${alert.severity.toUpperCase()}] ${alert.title}`;
        const logDetails = {
            description: alert.description,
            time: alert.timestamp.toLocaleString(),
            id: alert.id,
            severity: alert.severity
        };
        if (alert.severity === 'critical') {
            logger_js_1.logger.error(logMessage, logDetails);
        }
        else if (alert.severity === 'high') {
            logger_js_1.logger.warn(logMessage, logDetails);
        }
        else {
            logger_js_1.logger.info(logMessage, logDetails);
        }
    }
    async sendWebhookNotification(alert) {
        if (!this.config.notificationChannels.webhook)
            return;
        try {
            const webhook = this.config.notificationChannels.webhook;
            logger_js_1.logger.info('Webhook notification sent', {
                alertId: alert.id,
                webhookUrl: webhook.url,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to send webhook notification', {
                alertId: alert.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    extractRelevantMetrics(metrics, rule) {
        const relevant = {
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
    cleanupOldAlerts() {
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - this.config.alertRetentionHours);
        const originalLength = this.alertHistory.length;
        this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoffTime);
        if (this.alertHistory.length < originalLength) {
            logger_js_1.logger.debug('Old alerts cleaned up', {
                removed: originalLength - this.alertHistory.length,
                remaining: this.alertHistory.length,
            });
        }
    }
    getStatus() {
        return {
            enabled: this.config.enabled,
            running: this.isRunning,
            rules: this.rules.size,
            activeAlerts: this.activeAlerts.size,
            totalAlerts: this.alertHistory.length,
            lastCheck: new Date(),
        };
    }
    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }
    getAlertHistory(limit) {
        const alerts = this.alertHistory.slice().reverse();
        return limit ? alerts.slice(0, limit) : alerts;
    }
    getRules() {
        return Array.from(this.rules.values());
    }
    manuallyResolveAlert(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (alert && !alert.resolved) {
            alert.resolved = true;
            alert.resolvedAt = new Date();
            this.activeAlerts.delete(alertId);
            logger_js_1.logger.info('Alert manually resolved', { alertId });
            this.emit('alert_resolved', alert);
            return true;
        }
        return false;
    }
}
exports.MonitoringService = MonitoringService;
let monitoringServiceInstance = null;
function initializeMonitoringService(config) {
    if (monitoringServiceInstance) {
        logger_js_1.logger.warn('Monitoring service already initialized');
        return monitoringServiceInstance;
    }
    monitoringServiceInstance = new MonitoringService(config);
    return monitoringServiceInstance;
}
function getMonitoringService() {
    if (!monitoringServiceInstance) {
        throw new Error('Monitoring service not initialized');
    }
    return monitoringServiceInstance;
}
exports.defaultMonitoringConfig = {
    enabled: true,
    checkIntervalMs: 30000,
    alertRetentionHours: 24,
    maxActiveAlerts: 50,
    notificationChannels: {
        console: true,
    },
};
