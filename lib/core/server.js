import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ConfigManager } from '../utils/config.js';
import { logger, loggerStream } from '../utils/logger.js';
import { PPMCPTools } from '../tools/index.js';
import { SourceAdapterRegistry } from '../adapters/base.js';
import { EnhancedFileSystemAdapter } from '../adapters/file-enhanced.js';
import { createSemanticEnhancedAdapter, SemanticEnhancedAdapter } from '../search/semantic-integration.js';
import { initializeCacheService } from '../utils/cache.js';
import { performance } from 'perf_hooks';
import { initializePerformanceMonitor, getPerformanceMonitor } from '../utils/performance.js';
import { initializeMonitoringService, getMonitoringService, defaultMonitoringConfig, } from '../utils/monitoring.js';
import { CircuitBreakerFactory } from '../utils/circuit-breaker.js';
import { createAPIRoutes } from '../api/routes.js';
import { securityHeaders, performanceMonitoring, requestSizeLimiter, globalErrorHandler, } from '../api/middleware.js';
import { correlationMiddleware, correlationErrorHandler } from '../api/correlation.js';
import { createSwaggerRouter } from '../api/swagger.js';
import { intelligentCaching, warmCriticalCache } from '../api/caching-middleware.js';
export class PersonalPipelineServer {
    configManager;
    mcpServer;
    expressApp;
    sourceRegistry;
    mcpTools;
    cacheService = null;
    config = null;
    isStarted = false;
    semanticConfig = {
        enabled: true,
        fallbackToFuzzy: true,
        enhanceExistingAdapters: true,
    };
    constructor(configManager = new ConfigManager(), semanticConfig) {
        this.configManager = configManager;
        if (semanticConfig) {
            this.semanticConfig = { ...this.semanticConfig, ...semanticConfig };
        }
        this.mcpServer = new Server({
            name: 'personal-pipeline-mcp',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.expressApp = express();
        this.sourceRegistry = new SourceAdapterRegistry();
        this.setupExpress();
        this.setupMCPHandlers();
        this.registerSourceAdapters();
    }
    async start() {
        if (this.isStarted) {
            logger.warn('Server is already started');
            return;
        }
        try {
            this.config = await this.configManager.loadConfig();
            if (this.config.semantic_search) {
                this.semanticConfig = {
                    enabled: this.config.semantic_search.enabled,
                    fallbackToFuzzy: this.config.semantic_search.fallback_to_fuzzy,
                    enhanceExistingAdapters: this.config.semantic_search.enhance_existing_adapters,
                };
            }
            logger.info('Configuration loaded', {
                sourceCount: this.config.sources.length,
                serverPort: this.config.server.port,
                semanticSearchEnabled: this.semanticConfig.enabled,
                semanticEnhancement: this.semanticConfig.enhanceExistingAdapters,
            });
            initializePerformanceMonitor({
                windowSize: 60000,
                maxSamples: 1000,
            });
            await this.initializeCacheService();
            const monitoringService = initializeMonitoringService(defaultMonitoringConfig);
            monitoringService.start();
            this.mcpTools = new PPMCPTools(this.sourceRegistry, this.cacheService || undefined);
            await this.initializeSourceAdapters();
            this.setupAPIRoutes();
            if (this.cacheService && this.mcpTools) {
                setTimeout(() => {
                    warmCriticalCache(this.cacheService, this.mcpTools).catch(error => {
                        logger.warn('Cache warming failed during startup', {
                            error: error instanceof Error ? error.message : String(error),
                        });
                    });
                }, 5000);
            }
            await this.startExpressServer();
            await this.startMCPServer();
            this.isStarted = true;
            logger.info('Personal Pipeline MCP Server started successfully', {
                mcpEnabled: true,
                httpPort: this.config.server.port,
                sourceCount: this.sourceRegistry.getAllAdapters().length,
            });
        }
        catch (error) {
            logger.error('Failed to start server', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    async stop() {
        if (!this.isStarted) {
            return;
        }
        logger.info('Stopping Personal Pipeline MCP Server...');
        try {
            try {
                const monitoringService = getMonitoringService();
                monitoringService.stop();
            }
            catch (error) {
            }
            await this.sourceRegistry.cleanup();
            if (this.cacheService) {
                await this.cacheService.shutdown();
            }
            await this.mcpServer.close();
            this.isStarted = false;
            logger.info('Personal Pipeline MCP Server stopped successfully');
        }
        catch (error) {
            logger.error('Error during server shutdown', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    async getHealthStatus() {
        try {
            const sourceHealthChecks = await this.sourceRegistry.healthCheckAll();
            const healthySources = sourceHealthChecks.filter(h => h.healthy).length;
            const totalSources = sourceHealthChecks.length;
            let cacheHealth = null;
            if (this.cacheService) {
                try {
                    cacheHealth = await this.cacheService.healthCheck();
                }
                catch (error) {
                    logger.error('Cache health check failed', { error });
                }
            }
            return {
                status: totalSources > 0 && healthySources / totalSources >= 0.5 ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                version: '0.1.0',
                sources: sourceHealthChecks,
                cache: cacheHealth,
                semantic_search: {
                    enabled: this.semanticConfig.enabled,
                    enhancement_active: this.semanticConfig.enhanceExistingAdapters,
                    fallback_enabled: this.semanticConfig.fallbackToFuzzy,
                },
                uptime: process.uptime(),
            };
        }
        catch (error) {
            logger.error('Health check failed', { error });
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                version: '0.1.0',
                sources: [],
                semantic_search: {
                    enabled: this.semanticConfig.enabled,
                    enhancement_active: this.semanticConfig.enhanceExistingAdapters,
                    fallback_enabled: this.semanticConfig.fallbackToFuzzy,
                },
                uptime: process.uptime(),
            };
        }
    }
    setupExpress() {
        this.expressApp.use(helmet());
        this.expressApp.use(cors());
        this.expressApp.use(securityHeaders());
        this.expressApp.use(correlationMiddleware);
        this.expressApp.use(express.json({ limit: '10mb' }));
        this.expressApp.use(express.urlencoded({ extended: true }));
        this.expressApp.use(requestSizeLimiter(10));
        this.expressApp.use(performanceMonitoring());
        this.expressApp.use(intelligentCaching(this.cacheService));
        if (process.env.NODE_ENV !== 'test') {
            this.expressApp.use(morgan('combined', { stream: loggerStream }));
        }
        this.expressApp.get('/health', async (_req, res) => {
            try {
                const health = await this.getHealthStatus();
                res.status(health.status === 'healthy' ? 200 : 503).json(health);
            }
            catch (error) {
                res.status(500).json({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: 'Health check failed',
                });
            }
        });
        this.expressApp.get('/ready', (_req, res) => {
            if (this.isStarted) {
                res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
            }
            else {
                res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
            }
        });
        this.expressApp.get('/metrics', async (req, res) => {
            try {
                const format = req.query.format;
                const adapters = this.sourceRegistry.getAllAdapters();
                const metrics = await Promise.all(adapters.map(async (adapter) => {
                    try {
                        return await adapter.getMetadata();
                    }
                    catch (error) {
                        return {
                            name: adapter.getConfig().name,
                            type: adapter.getConfig().type,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        };
                    }
                }));
                let cacheStats = null;
                if (this.mcpTools) {
                    try {
                        cacheStats = this.mcpTools.getCacheStats();
                    }
                    catch (error) {
                        logger.error('Failed to get cache stats', { error });
                    }
                }
                const memUsage = process.memoryUsage();
                const performanceMetrics = {
                    memory: {
                        rss_mb: Math.round(memUsage.rss / 1024 / 1024),
                        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
                        heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
                        external_mb: Math.round(memUsage.external / 1024 / 1024),
                    },
                    process: {
                        uptime_seconds: process.uptime(),
                        pid: process.pid,
                        node_version: process.version,
                    },
                };
                let toolPerformance = null;
                if (this.mcpTools) {
                    try {
                        toolPerformance = this.mcpTools.getPerformanceMetrics();
                    }
                    catch (error) {
                        logger.error('Failed to get tool performance metrics', { error });
                    }
                }
                const metricsData = {
                    timestamp: new Date().toISOString(),
                    version: '0.1.0',
                    uptime: process.uptime(),
                    sources: metrics,
                    cache: cacheStats,
                    performance: performanceMetrics,
                    tools: toolPerformance,
                };
                if (format === 'prometheus') {
                    const prometheusMetrics = this.formatPrometheusMetrics(metricsData);
                    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
                    res.send(prometheusMetrics);
                }
                else {
                    res.json(metricsData);
                }
            }
            catch (error) {
                res.status(500).json({
                    error: 'Failed to collect metrics',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.post('/mcp/call', async (req, res) => {
            try {
                const { tool, arguments: args } = req.body;
                if (!tool) {
                    res.status(400).json({
                        error: 'Missing required field: tool',
                        timestamp: new Date().toISOString(),
                    });
                    return;
                }
                if (!this.mcpTools) {
                    res.status(503).json({
                        error: 'MCP tools not initialized',
                        timestamp: new Date().toISOString(),
                    });
                    return;
                }
                const mcpRequest = {
                    method: 'tools/call',
                    params: {
                        name: tool,
                        arguments: args || {},
                    },
                };
                const startTime = performance.now();
                const result = await this.mcpTools.handleToolCall(mcpRequest);
                const executionTime = performance.now() - startTime;
                let responseData;
                if (result.content &&
                    result.content.length > 0 &&
                    result.content[0] &&
                    'text' in result.content[0] &&
                    result.content[0].text) {
                    try {
                        responseData = JSON.parse(result.content[0].text);
                    }
                    catch (error) {
                        responseData = result.content[0].text;
                    }
                }
                else {
                    responseData = result;
                }
                res.json({
                    success: !result.isError,
                    data: responseData,
                    execution_time_ms: Math.round(executionTime),
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                logger.error('MCP call endpoint error', {
                    error: error instanceof Error ? error.message : String(error),
                    tool: req.body?.tool,
                });
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/performance', async (_req, res) => {
            try {
                if (!this.mcpTools) {
                    res.status(503).json({
                        error: 'MCP tools not initialized',
                        timestamp: new Date().toISOString(),
                    });
                    return;
                }
                const performanceMonitor = getPerformanceMonitor();
                const report = performanceMonitor.generateReport();
                const toolMetrics = this.mcpTools.getPerformanceMetrics();
                const analysis = {
                    overall_grade: this.calculatePerformanceGrade(report.summary),
                    targets_met: this.checkPerformanceTargets(report.summary),
                    bottlenecks: this.identifyBottlenecks(toolMetrics.by_tool),
                    optimization_opportunities: this.findOptimizationOpportunities(report.summary, toolMetrics.by_tool),
                    resource_efficiency: this.analyzeResourceEfficiency(report.summary),
                };
                res.json({
                    timestamp: new Date().toISOString(),
                    performance_report: report,
                    detailed_metrics: toolMetrics,
                    analysis,
                });
            }
            catch (error) {
                logger.error('Performance endpoint error', { error });
                res.status(500).json({
                    error: 'Failed to generate performance report',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.post('/performance/reset', (_req, res) => {
            try {
                const performanceMonitor = getPerformanceMonitor();
                performanceMonitor.reset();
                res.json({
                    success: true,
                    message: 'Performance metrics reset',
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to reset performance metrics',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/monitoring/status', (_req, res) => {
            try {
                const monitoringService = getMonitoringService();
                const status = monitoringService.getStatus();
                res.json(status);
            }
            catch (error) {
                res.status(503).json({
                    error: 'Monitoring service not available',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/monitoring/alerts', (req, res) => {
            try {
                const monitoringService = getMonitoringService();
                const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
                const alerts = monitoringService.getAlertHistory(limit);
                res.json({
                    alerts,
                    total: alerts.length,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                res.status(503).json({
                    error: 'Monitoring service not available',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/monitoring/alerts/active', (_req, res) => {
            try {
                const monitoringService = getMonitoringService();
                const activeAlerts = monitoringService.getActiveAlerts();
                res.json({
                    alerts: activeAlerts,
                    count: activeAlerts.length,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                res.status(503).json({
                    error: 'Monitoring service not available',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.post('/monitoring/alerts/:alertId/resolve', (req, res) => {
            try {
                const monitoringService = getMonitoringService();
                const { alertId } = req.params;
                const resolved = monitoringService.manuallyResolveAlert(alertId);
                if (resolved) {
                    res.json({
                        success: true,
                        message: 'Alert resolved successfully',
                        alertId,
                        timestamp: new Date().toISOString(),
                    });
                }
                else {
                    res.status(404).json({
                        success: false,
                        error: 'Alert not found or already resolved',
                        alertId,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
            catch (error) {
                res.status(503).json({
                    error: 'Monitoring service not available',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/monitoring/rules', (_req, res) => {
            try {
                const monitoringService = getMonitoringService();
                const rules = monitoringService.getRules();
                res.json({
                    rules,
                    count: rules.length,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                res.status(503).json({
                    error: 'Monitoring service not available',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/circuit-breakers', (_req, res) => {
            try {
                const healthStatus = CircuitBreakerFactory.getHealthStatus();
                res.json({
                    ...healthStatus,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                res.status(500).json({
                    error: 'Failed to get circuit breaker status',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.post('/circuit-breakers/:name/reset', (req, res) => {
            try {
                const { name } = req.params;
                const breaker = CircuitBreakerFactory.getBreaker(name);
                if (breaker) {
                    breaker.manualReset();
                    res.json({
                        success: true,
                        message: 'Circuit breaker reset successfully',
                        name,
                        timestamp: new Date().toISOString(),
                    });
                }
                else {
                    res.status(404).json({
                        success: false,
                        error: 'Circuit breaker not found',
                        name,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to reset circuit breaker',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/health/detailed', async (_req, res) => {
            try {
                const health = await this.getDetailedHealthStatus();
                res.status(health.overall_status === 'healthy' ? 200 : 503).json(health);
            }
            catch (error) {
                res.status(500).json({
                    overall_status: 'unhealthy',
                    error: 'Detailed health check failed',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/live', (_req, res) => {
            res.status(200).json({
                status: 'alive',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            });
        });
        this.expressApp.get('/health/cache', async (_req, res) => {
            try {
                if (!this.cacheService) {
                    res.status(503).json({
                        status: 'unavailable',
                        message: 'Cache service not initialized',
                        timestamp: new Date().toISOString(),
                    });
                    return;
                }
                const health = await this.cacheService.healthCheck();
                res.status(health.overall_healthy ? 200 : 503).json(health);
            }
            catch (error) {
                res.status(500).json({
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/health/sources', async (_req, res) => {
            try {
                const sourceHealthChecks = await this.sourceRegistry.healthCheckAll();
                const healthySources = sourceHealthChecks.filter(h => h.healthy).length;
                const totalSources = sourceHealthChecks.length;
                res.status(healthySources > 0 ? 200 : 503).json({
                    status: healthySources > 0 ? 'healthy' : 'unhealthy',
                    sources: sourceHealthChecks,
                    summary: {
                        healthy_count: healthySources,
                        total_count: totalSources,
                        health_percentage: totalSources > 0 ? (healthySources / totalSources) * 100 : 0,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                res.status(500).json({
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.get('/health/performance', async (_req, res) => {
            try {
                const performanceMonitor = getPerformanceMonitor();
                const metrics = performanceMonitor.getMetrics();
                const isHealthy = metrics.response_times.p95_ms < 2000 &&
                    metrics.error_tracking.error_rate < 0.1 &&
                    metrics.resource_usage.memory_mb < 2048;
                res.status(isHealthy ? 200 : 503).json({
                    status: isHealthy ? 'healthy' : 'degraded',
                    metrics,
                    thresholds: {
                        max_p95_response_ms: 2000,
                        max_error_rate: 0.1,
                        max_memory_mb: 2048,
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                res.status(500).json({
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                });
            }
        });
        this.expressApp.use((error, req, res) => {
            logger.error('Express error', {
                error: error.message,
                stack: error.stack,
                url: req.url,
                method: req.method,
            });
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'An unexpected error occurred',
                timestamp: new Date().toISOString(),
            });
        });
    }
    setupAPIRoutes() {
        if (!this.mcpTools) {
            logger.error('Cannot setup API routes: MCP tools not initialized');
            throw new Error('MCP tools must be initialized before setting up API routes');
        }
        try {
            const apiRoutes = createAPIRoutes({
                mcpTools: this.mcpTools,
                sourceRegistry: this.sourceRegistry,
                ...(this.cacheService && { cacheService: this.cacheService }),
            });
            const swaggerRouter = createSwaggerRouter();
            this.expressApp.use('/api', apiRoutes);
            this.expressApp.use('/api/docs', swaggerRouter);
            logger.info('REST API routes initialized successfully', {
                prefix: '/api',
                total_routes: this.countRoutes(apiRoutes),
                documentation: '/api/docs',
                openapi_spec: '/api/docs/openapi.json',
                components: {
                    mcp_tools: !!this.mcpTools,
                    source_registry: !!this.sourceRegistry,
                    cache_service: !!this.cacheService,
                },
            });
            this.expressApp.use('*', (_req, res) => {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'The requested endpoint does not exist',
                    timestamp: new Date().toISOString(),
                });
            });
            this.expressApp.use(correlationErrorHandler);
            this.expressApp.use(globalErrorHandler());
        }
        catch (error) {
            logger.error('Failed to setup API routes', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    countRoutes(router) {
        try {
            return router.stack ? router.stack.length : 0;
        }
        catch (error) {
            return 0;
        }
    }
    setupMCPHandlers() {
        this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
            logger.debug('Received list_tools request');
            const tools = this.mcpTools.getTools();
            const result = {
                tools,
            };
            logger.debug('Returning tools', { toolCount: tools.length });
            return result;
        });
        this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
            logger.info(`Received tool call: ${request.params.name}`, {
                tool: request.params.name,
                hasArguments: !!request.params.arguments,
            });
            try {
                const result = await this.mcpTools.handleToolCall(request);
                logger.info(`Tool call completed: ${request.params.name}`, {
                    tool: request.params.name,
                    success: !result.isError,
                });
                return result;
            }
            catch (error) {
                logger.error(`Tool call failed: ${request.params.name}`, {
                    tool: request.params.name,
                    error: error instanceof Error ? error.message : String(error),
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                message: error instanceof Error ? error.message : 'Unknown error',
                                timestamp: new Date().toISOString(),
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
        });
        this.mcpServer.onerror = error => {
            logger.error('MCP Server error', {
                error: error instanceof Error ? error.message : String(error),
            });
        };
    }
    async initializeCacheService() {
        if (!this.config) {
            throw new Error('Configuration not loaded');
        }
        try {
            const redisUrl = process.env.REDIS_URL;
            const isRedisConfigured = redisUrl !== undefined;
            const cacheConfig = this.config.cache || {
                enabled: true,
                strategy: isRedisConfigured ? 'hybrid' : 'memory_only',
                memory: {
                    max_keys: 1000,
                    ttl_seconds: 3600,
                    check_period_seconds: 600,
                },
                redis: {
                    enabled: isRedisConfigured,
                    url: redisUrl || 'redis://localhost:6379',
                    ttl_seconds: 7200,
                    key_prefix: 'pp:cache:',
                    connection_timeout_ms: 5000,
                    retry_attempts: 3,
                    retry_delay_ms: 1000,
                    max_retry_delay_ms: 30000,
                    backoff_multiplier: 2,
                    connection_retry_limit: 5,
                },
                content_types: {
                    runbooks: {
                        ttl_seconds: 3600,
                        warmup: true,
                    },
                    procedures: {
                        ttl_seconds: 1800,
                        warmup: false,
                    },
                    decision_trees: {
                        ttl_seconds: 2400,
                        warmup: true,
                    },
                    knowledge_base: {
                        ttl_seconds: 900,
                        warmup: false,
                    },
                    web_response: {
                        ttl_seconds: 1800,
                        warmup: false,
                    },
                },
            };
            if (cacheConfig.enabled) {
                this.cacheService = initializeCacheService(cacheConfig);
                logger.info('Cache service initialized successfully', {
                    strategy: cacheConfig.strategy,
                    memory_enabled: true,
                    redis_enabled: cacheConfig.redis.enabled,
                });
            }
            else {
                logger.info('Cache service disabled by configuration');
            }
        }
        catch (error) {
            logger.error('Failed to initialize cache service', {
                error: error instanceof Error ? error.message : String(error),
            });
            this.cacheService = null;
        }
    }
    registerSourceAdapters() {
        this.sourceRegistry.registerFactory('file', config => {
            const baseAdapter = new EnhancedFileSystemAdapter(config);
            if (this.semanticConfig.enabled && this.semanticConfig.enhanceExistingAdapters) {
                logger.info('Creating semantic-enhanced FileSystemAdapter', {
                    name: config.name,
                    fallbackEnabled: this.semanticConfig.fallbackToFuzzy,
                });
                const semanticConfig = this.config?.semantic_search;
                return createSemanticEnhancedAdapter(baseAdapter, {
                    enableSemanticSearch: true,
                    enableFallback: this.semanticConfig.fallbackToFuzzy,
                    semanticThreshold: semanticConfig?.min_similarity_threshold || 0.3,
                    semanticWeight: semanticConfig?.scoring_weights?.semantic || 0.7,
                    maxResults: 50,
                });
            }
            return baseAdapter;
        });
        logger.debug('Source adapter factories registered with semantic enhancement support', {
            adapters: ['file', 'github', 'web', 'confluence', 'database'],
            semanticEnabled: this.semanticConfig.enabled,
            semanticEnhancement: this.semanticConfig.enhanceExistingAdapters,
        });
    }
    async initializeSourceAdapters() {
        if (!this.config) {
            throw new Error('Configuration not loaded');
        }
        logger.info('Initializing source adapters', {
            sourceCount: this.config.sources.length,
        });
        const initPromises = this.config.sources
            .filter(source => source.enabled)
            .map(async (sourceConfig) => {
            try {
                await this.sourceRegistry.createAdapter(sourceConfig);
                logger.info(`Initialized source adapter: ${sourceConfig.name}`, {
                    type: sourceConfig.type,
                    priority: sourceConfig.priority,
                });
            }
            catch (error) {
                logger.error(`Failed to initialize source adapter: ${sourceConfig.name}`, {
                    type: sourceConfig.type,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        });
        await Promise.allSettled(initPromises);
        const initializedCount = this.sourceRegistry.getAllAdapters().length;
        logger.info('Source adapter initialization completed', {
            initializedCount,
            configuredCount: this.config.sources.length,
        });
        if (initializedCount === 0) {
            logger.warn('No source adapters were successfully initialized');
        }
    }
    async startExpressServer() {
        if (!this.config) {
            throw new Error('Configuration not loaded');
        }
        return new Promise((resolve, reject) => {
            const server = this.expressApp.listen(this.config.server.port, this.config.server.host, () => {
                logger.info('Express server started', {
                    host: this.config.server.host,
                    port: this.config.server.port,
                });
                resolve();
            });
            server.on('error', error => {
                logger.error('Express server error', { error });
                reject(error);
            });
        });
    }
    async startMCPServer() {
        const transport = new StdioServerTransport();
        await this.mcpServer.connect(transport);
        logger.info('MCP server connected via stdio transport');
    }
    async getDetailedHealthStatus() {
        const components = {};
        let healthyComponents = 0;
        let totalComponents = 0;
        components.mcp_server = {
            status: this.isStarted ? 'healthy' : 'unhealthy',
            uptime_seconds: process.uptime(),
            version: '0.1.0',
        };
        totalComponents++;
        if (this.isStarted)
            healthyComponents++;
        if (this.cacheService) {
            try {
                const cacheHealth = await this.cacheService.healthCheck();
                components.cache_service = {
                    status: cacheHealth.overall_healthy ? 'healthy' : 'degraded',
                    memory_cache: cacheHealth.memory_cache,
                    redis_cache: cacheHealth.redis_cache,
                };
                totalComponents++;
                if (cacheHealth.overall_healthy)
                    healthyComponents++;
            }
            catch (error) {
                components.cache_service = {
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
                totalComponents++;
            }
        }
        else {
            components.cache_service = {
                status: 'not_configured',
                message: 'Cache service not initialized',
            };
        }
        try {
            const sourceHealthChecks = await this.sourceRegistry.healthCheckAll();
            const healthySources = sourceHealthChecks.filter(h => h.healthy).length;
            components.source_adapters = {
                status: healthySources > 0 ? 'healthy' : 'unhealthy',
                total_sources: sourceHealthChecks.length,
                healthy_sources: healthySources,
                sources: sourceHealthChecks,
            };
            totalComponents++;
            if (healthySources > 0)
                healthyComponents++;
        }
        catch (error) {
            components.source_adapters = {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            totalComponents++;
        }
        try {
            const performanceMonitor = getPerformanceMonitor();
            const metrics = performanceMonitor.getMetrics();
            const isPerformanceHealthy = metrics.response_times.p95_ms < 2000 &&
                metrics.error_tracking.error_rate < 0.1 &&
                metrics.resource_usage.memory_mb < 2048;
            components.performance = {
                status: isPerformanceHealthy ? 'healthy' : 'degraded',
                response_time_p95_ms: metrics.response_times.p95_ms,
                error_rate: metrics.error_tracking.error_rate,
                memory_usage_mb: metrics.resource_usage.memory_mb,
                meets_sla: isPerformanceHealthy,
            };
            totalComponents++;
            if (isPerformanceHealthy)
                healthyComponents++;
        }
        catch (error) {
            components.performance = {
                status: 'unknown',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            totalComponents++;
        }
        if (this.mcpTools) {
            try {
                const toolMetrics = this.mcpTools.getPerformanceMetrics();
                const toolCount = Object.keys(toolMetrics.by_tool || {}).length;
                components.mcp_tools = {
                    status: toolCount > 0 ? 'healthy' : 'degraded',
                    total_tools: toolCount,
                    tools_available: this.mcpTools.getTools().length,
                };
                totalComponents++;
                if (toolCount > 0)
                    healthyComponents++;
            }
            catch (error) {
                components.mcp_tools = {
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
                totalComponents++;
            }
        }
        else {
            components.mcp_tools = {
                status: 'not_initialized',
                message: 'MCP tools not initialized',
            };
        }
        components.semantic_search = {
            status: this.semanticConfig.enabled ? 'enabled' : 'disabled',
            enhancement_active: this.semanticConfig.enhanceExistingAdapters,
            fallback_enabled: this.semanticConfig.fallbackToFuzzy,
            enhanced_adapters: this.getEnhancedAdapterStatuses(),
        };
        totalComponents++;
        if (this.semanticConfig.enabled)
            healthyComponents++;
        const healthPercentage = totalComponents > 0 ? (healthyComponents / totalComponents) * 100 : 0;
        let overallStatus;
        if (healthPercentage >= 80) {
            overallStatus = 'healthy';
        }
        else if (healthPercentage >= 50) {
            overallStatus = 'degraded';
        }
        else {
            overallStatus = 'unhealthy';
        }
        return {
            overall_status: overallStatus,
            components,
            summary: {
                healthy_components: healthyComponents,
                total_components: totalComponents,
                health_percentage: Math.round(healthPercentage),
                uptime_seconds: process.uptime(),
            },
            timestamp: new Date().toISOString(),
        };
    }
    formatPrometheusMetrics(data) {
        const lines = [];
        const timestamp = Date.now();
        const addMetric = (name, value, labels = {}, help) => {
            if (help) {
                lines.push(`# HELP ${name} ${help}`);
                lines.push(`# TYPE ${name} gauge`);
            }
            const labelStr = Object.entries(labels)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');
            const labelPart = labelStr ? `{${labelStr}}` : '';
            lines.push(`${name}${labelPart} ${value} ${timestamp}`);
        };
        addMetric('pp_uptime_seconds', data.uptime, {}, 'Process uptime in seconds');
        if (data.performance?.memory) {
            addMetric('pp_memory_rss_bytes', data.performance.memory.rss_mb * 1024 * 1024, {}, 'Resident set size memory');
            addMetric('pp_memory_heap_used_bytes', data.performance.memory.heap_used_mb * 1024 * 1024, {}, 'Heap memory used');
            addMetric('pp_memory_heap_total_bytes', data.performance.memory.heap_total_mb * 1024 * 1024, {}, 'Total heap memory');
            addMetric('pp_memory_external_bytes', data.performance.memory.external_mb * 1024 * 1024, {}, 'External memory');
        }
        if (data.cache) {
            addMetric('pp_cache_hit_rate', data.cache.hit_rate, {}, 'Cache hit rate (0-1)');
            addMetric('pp_cache_operations_total', data.cache.total_operations, {}, 'Total cache operations');
            addMetric('pp_cache_hits_total', data.cache.hits, {}, 'Total cache hits');
            addMetric('pp_cache_misses_total', data.cache.misses, {}, 'Total cache misses');
        }
        if (data.tools?.by_tool) {
            Object.entries(data.tools.by_tool).forEach(([toolName, metrics]) => {
                const labels = { tool: toolName };
                addMetric('pp_tool_calls_total', metrics.calls || 0, labels, 'Total tool calls');
                addMetric('pp_tool_errors_total', metrics.errors || 0, labels, 'Total tool errors');
                addMetric('pp_tool_avg_duration_ms', metrics.avg_time_ms || 0, labels, 'Average tool execution time in milliseconds');
                addMetric('pp_tool_error_rate', metrics.error_rate || 0, labels, 'Tool error rate (0-1)');
            });
        }
        if (data.sources) {
            data.sources.forEach((source, index) => {
                const labels = { source: source.name || `source_${index}`, type: source.type || 'unknown' };
                const isHealthy = !source.error ? 1 : 0;
                addMetric('pp_source_healthy', isHealthy, labels, 'Source adapter health status (1=healthy, 0=unhealthy)');
                if (source.response_time_ms !== undefined) {
                    addMetric('pp_source_response_time_ms', source.response_time_ms, labels, 'Source adapter response time in milliseconds');
                }
            });
        }
        return `${lines.join('\n')}\n`;
    }
    calculatePerformanceGrade(metrics) {
        let score = 100;
        if (metrics.response_times.p95_ms > 500) {
            score -= Math.min(30, (metrics.response_times.p95_ms - 500) / 50);
        }
        if (metrics.error_tracking.error_rate > 0.01) {
            score -= Math.min(40, metrics.error_tracking.error_rate * 1000);
        }
        if (metrics.resource_usage.memory_mb > 1024) {
            score -= Math.min(20, (metrics.resource_usage.memory_mb - 1024) / 100);
        }
        if (metrics.throughput.requests_per_second > 0 && metrics.throughput.requests_per_second < 5) {
            score -= Math.min(10, (5 - metrics.throughput.requests_per_second) * 2);
        }
        if (score >= 90)
            return 'A';
        if (score >= 80)
            return 'B';
        if (score >= 70)
            return 'C';
        if (score >= 60)
            return 'D';
        return 'F';
    }
    checkPerformanceTargets(metrics) {
        return {
            response_time_target: {
                target_ms: 200,
                actual_p95_ms: metrics.response_times.p95_ms,
                meets_target: metrics.response_times.p95_ms <= 200,
                cached_target_ms: 200,
                uncached_target_ms: 500,
            },
            throughput_target: {
                target_rps: 10,
                actual_rps: metrics.throughput.requests_per_second,
                meets_target: metrics.throughput.requests_per_second >= 10,
            },
            error_rate_target: {
                target_rate: 0.01,
                actual_rate: metrics.error_tracking.error_rate,
                meets_target: metrics.error_tracking.error_rate <= 0.01,
            },
            memory_target: {
                target_mb: 2048,
                actual_mb: metrics.resource_usage.memory_mb,
                meets_target: metrics.resource_usage.memory_mb <= 2048,
            },
        };
    }
    identifyBottlenecks(toolMetrics) {
        const bottlenecks = [];
        for (const [toolName, metrics] of Object.entries(toolMetrics)) {
            const toolData = metrics;
            if (toolData.avg_time_ms > 1000) {
                bottlenecks.push({
                    type: 'response_time',
                    tool: toolName,
                    severity: toolData.avg_time_ms > 2000 ? 'high' : 'medium',
                    description: `Tool ${toolName} has high average response time: ${toolData.avg_time_ms.toFixed(0)}ms`,
                    impact: 'User experience degradation',
                    recommendation: 'Optimize database queries, implement caching, or reduce computational complexity',
                });
            }
            if (toolData.error_rate > 0.05) {
                bottlenecks.push({
                    type: 'error_rate',
                    tool: toolName,
                    severity: toolData.error_rate > 0.1 ? 'high' : 'medium',
                    description: `Tool ${toolName} has high error rate: ${(toolData.error_rate * 100).toFixed(1)}%`,
                    impact: 'Service reliability issues',
                    recommendation: 'Investigate error causes, improve error handling, and add retry mechanisms',
                });
            }
            if (toolData.percentiles && toolData.percentiles.p95 > 2000) {
                bottlenecks.push({
                    type: 'p95_response_time',
                    tool: toolName,
                    severity: 'medium',
                    description: `Tool ${toolName} has high P95 response time: ${toolData.percentiles.p95.toFixed(0)}ms`,
                    impact: 'Poor worst-case performance',
                    recommendation: 'Optimize slow code paths and implement performance monitoring',
                });
            }
        }
        return bottlenecks.sort((a, b) => {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        });
    }
    findOptimizationOpportunities(metrics, toolMetrics) {
        const opportunities = [];
        if (this.cacheService) {
            const cacheStats = this.mcpTools?.getCacheStats();
            if (cacheStats && cacheStats.hit_rate < 0.8) {
                opportunities.push({
                    category: 'caching',
                    priority: 'high',
                    title: 'Improve cache hit rate',
                    description: `Current cache hit rate is ${(cacheStats.hit_rate * 100).toFixed(1)}%. Target: 80%+`,
                    potential_improvement: 'Response time reduction of 200-300ms for cached requests',
                    implementation: [
                        'Implement cache warming for critical runbooks',
                        'Increase TTL for stable content',
                        'Add predictive caching based on usage patterns',
                    ],
                });
            }
        }
        if (metrics.resource_usage.memory_mb > 1024) {
            opportunities.push({
                category: 'memory',
                priority: 'medium',
                title: 'Optimize memory usage',
                description: `Memory usage is ${metrics.resource_usage.memory_mb}MB. Target: <1GB`,
                potential_improvement: 'Reduced memory pressure and better scalability',
                implementation: [
                    'Implement object pooling for large responses',
                    'Optimize data structures and serialization',
                    'Add memory leak detection and monitoring',
                ],
            });
        }
        const slowTools = Object.entries(toolMetrics)
            .filter(([, data]) => data.avg_time_ms > 500)
            .map(([name]) => name);
        if (slowTools.length > 0) {
            opportunities.push({
                category: 'database',
                priority: 'high',
                title: 'Optimize database queries',
                description: `Tools ${slowTools.join(', ')} have slow response times`,
                potential_improvement: 'Response time reduction of 50-70%',
                implementation: [
                    'Add database indexes for frequently queried fields',
                    'Implement query result caching',
                    'Optimize N+1 query patterns',
                    'Consider read replicas for query distribution',
                ],
            });
        }
        if (metrics.throughput.requests_per_second < 10 && metrics.throughput.total_requests > 0) {
            opportunities.push({
                category: 'concurrency',
                priority: 'medium',
                title: 'Improve concurrent request handling',
                description: `Current throughput: ${metrics.throughput.requests_per_second.toFixed(1)} RPS. Target: 10+ RPS`,
                potential_improvement: 'Increased system capacity and user satisfaction',
                implementation: [
                    'Implement connection pooling optimization',
                    'Add request queuing and throttling',
                    'Consider horizontal scaling options',
                    'Optimize async/await patterns',
                ],
            });
        }
        return opportunities.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        });
    }
    analyzeResourceEfficiency(metrics) {
        const memoryEfficiency = Math.max(0, 100 - (metrics.resource_usage.memory_mb / 2048) * 100);
        const responseTimeEfficiency = Math.max(0, 100 - (metrics.response_times.avg_ms / 1000) * 100);
        const errorEfficiency = Math.max(0, 100 - metrics.error_tracking.error_rate * 10000);
        const overallEfficiency = (memoryEfficiency + responseTimeEfficiency + errorEfficiency) / 3;
        return {
            overall_efficiency_percent: Math.round(overallEfficiency),
            memory_efficiency_percent: Math.round(memoryEfficiency),
            response_time_efficiency_percent: Math.round(responseTimeEfficiency),
            error_efficiency_percent: Math.round(errorEfficiency),
            efficiency_grade: this.getEfficiencyGrade(overallEfficiency),
            recommendations: this.getEfficiencyRecommendations(memoryEfficiency, responseTimeEfficiency, errorEfficiency),
        };
    }
    getEfficiencyGrade(efficiency) {
        if (efficiency >= 90)
            return 'Excellent';
        if (efficiency >= 80)
            return 'Good';
        if (efficiency >= 70)
            return 'Fair';
        if (efficiency >= 60)
            return 'Poor';
        return 'Critical';
    }
    getEfficiencyRecommendations(memory, responseTime, error) {
        const recommendations = [];
        if (memory < 70) {
            recommendations.push('Optimize memory usage through better data structures and garbage collection tuning');
        }
        if (responseTime < 70) {
            recommendations.push('Improve response times through caching, query optimization, and code profiling');
        }
        if (error < 90) {
            recommendations.push('Reduce error rates through better error handling, input validation, and testing');
        }
        if (recommendations.length === 0) {
            recommendations.push('System efficiency is good - focus on monitoring and maintaining current performance levels');
        }
        return recommendations;
    }
    getEnhancedAdapterStatuses() {
        const adapters = this.sourceRegistry.getAllAdapters();
        return adapters.map(adapter => {
            const isSemanticEnhanced = adapter instanceof SemanticEnhancedAdapter;
            let semanticStatus = null;
            if (isSemanticEnhanced) {
                try {
                    semanticStatus = {
                        ready: adapter.isSemanticReady(),
                        config: adapter.getConfig().semantic_config,
                    };
                }
                catch (error) {
                    semanticStatus = {
                        ready: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    };
                }
            }
            return {
                name: adapter.getConfig().name,
                type: adapter.getConfig().type,
                semantic_enhanced: isSemanticEnhanced,
                semantic_status: semanticStatus,
            };
        });
    }
}
export const personalPipelineServer = new PersonalPipelineServer();
