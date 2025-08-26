import { logger } from '../utils/logger.js';
export function intelligentCaching(cacheService) {
    return (req, res, next) => {
        if (!cacheService) {
            next();
            return;
        }
        const cacheable = req.method === 'GET' || (req.method === 'POST' && isCacheableEndpoint(req.path));
        if (!cacheable) {
            next();
            return;
        }
        const cacheKey = generateCacheKey(req);
        const cacheStrategy = determineCacheStrategy(req.path, req.body);
        void (async () => {
            try {
                const cachedResponse = await cacheService.get(cacheKey);
                if (cachedResponse) {
                    logger.info('Cache hit for API request', {
                        path: req.path,
                        method: req.method,
                        cacheKey: cacheKey.substring(0, 50),
                        strategy: cacheStrategy,
                    });
                    res.setHeader('X-Cache', 'HIT');
                    res.setHeader('X-Cache-Strategy', cacheStrategy);
                    res.setHeader('X-Cache-Key', cacheKey.substring(0, 50));
                    res.json({
                        ...cachedResponse,
                        metadata: {
                            ...cachedResponse.metadata,
                            cached: true,
                            cache_hit_time: new Date().toISOString(),
                            cache_strategy: cacheStrategy,
                        },
                    });
                    return;
                }
                res.setHeader('X-Cache', 'MISS');
                res.setHeader('X-Cache-Strategy', cacheStrategy);
                const originalJson = res.json;
                res.json = function (body) {
                    if (body && body.success !== false && res.statusCode < 400) {
                        const ttl = getCacheTTL(req.path, cacheStrategy, body);
                        void cacheService
                            .set(cacheKey, body, ttl)
                            .then(() => {
                            logger.debug('Cached API response', {
                                path: req.path,
                                cacheKey: cacheKey.substring(0, 50),
                                ttl,
                                strategy: cacheStrategy,
                            });
                        })
                            .catch((cacheError) => {
                            logger.warn('Failed to cache API response', {
                                error: cacheError instanceof Error ? cacheError.message : String(cacheError),
                                path: req.path,
                            });
                        });
                    }
                    return originalJson.call(this, body);
                };
                next();
            }
            catch (cacheError) {
                logger.warn('Cache lookup failed, proceeding without cache', {
                    error: cacheError instanceof Error ? cacheError.message : String(cacheError),
                    path: req.path,
                });
                res.setHeader('X-Cache', 'ERROR');
                next();
            }
        })();
    };
}
function isCacheableEndpoint(path) {
    const cacheableEndpoints = [
        '/api/search',
        '/api/runbooks/search',
        '/api/decision-tree',
        '/api/escalation',
        '/api/sources',
    ];
    return cacheableEndpoints.some(endpoint => path.startsWith(endpoint));
}
function generateCacheKey(req) {
    const pathKey = req.path.replace(/[^a-zA-Z0-9]/g, '_');
    const paramsKey = req.method === 'GET' ? JSON.stringify(req.query) : JSON.stringify(req.body || {});
    return `api_cache:${pathKey}:${Buffer.from(paramsKey).toString('base64').substring(0, 100)}`;
}
function determineCacheStrategy(path, body) {
    if (path.includes('/runbooks') || path.includes('/escalation')) {
        const severity = body?.severity || 'unknown';
        return severity === 'critical' ? 'critical_incident' : 'high_priority_incident';
    }
    if (path.includes('/search')) {
        const query = body?.query || '';
        const queryLength = query.length;
        const hasSpecialChars = /[*?"'&<>]/.test(query);
        const hasMultipleTerms = query.split(/\s+/).length > 3;
        if (queryLength > 50 || hasSpecialChars || hasMultipleTerms) {
            return 'complex_query';
        }
        const criticalTerms = ['critical', 'emergency', 'production', 'outage', 'down'];
        if (criticalTerms.some(term => query.toLowerCase().includes(term))) {
            return 'business_critical_query';
        }
        return 'simple_query';
    }
    if (path.includes('/decision-tree')) {
        return 'decision_logic';
    }
    if (path.includes('/procedures')) {
        return 'procedure_steps';
    }
    if (path.includes('/sources') || path.includes('/health')) {
        return 'metadata';
    }
    if (path.includes('/performance')) {
        return 'analytics';
    }
    return 'standard';
}
function getCacheTTL(_path, strategy, body) {
    const baseTimeOfDay = getTimeOfDayMultiplier();
    const contentFreshness = assessContentFreshness(body);
    let baseTTL;
    switch (strategy) {
        case 'critical_incident':
            baseTTL = 7200;
            break;
        case 'high_priority_incident':
            baseTTL = 3600;
            break;
        case 'business_critical_query':
            baseTTL = 2700;
            break;
        case 'complex_query':
            baseTTL = 1800;
            break;
        case 'simple_query':
            baseTTL = 900;
            break;
        case 'decision_logic':
            baseTTL = 5400;
            break;
        case 'procedure_steps':
            baseTTL = 4320;
            break;
        case 'metadata':
            baseTTL = 14400;
            break;
        case 'analytics':
            baseTTL = 300;
            break;
        default:
            baseTTL = 600;
    }
    let adjustedTTL = Math.round(baseTTL * baseTimeOfDay);
    adjustedTTL = Math.round(adjustedTTL * contentFreshness);
    return Math.max(300, Math.min(adjustedTTL, 28800));
}
function getTimeOfDayMultiplier() {
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 18) {
        return 1.0;
    }
    if (hour >= 22 || hour <= 6) {
        return 1.5;
    }
    return 1.2;
}
function assessContentFreshness(body) {
    if (!body)
        return 1.0;
    if (body.severity === 'critical') {
        return 0.8;
    }
    if (body.max_results && body.max_results > 20) {
        return 1.1;
    }
    if (body.affected_systems && body.affected_systems.length > 3) {
        return 0.9;
    }
    return 1.0;
}
export async function warmCriticalCache(cacheService, mcpTools) {
    if (!cacheService || !mcpTools) {
        return;
    }
    logger.info('Starting cache warming for critical endpoints');
    try {
        const criticalScenarios = [
            {
                alert_type: 'service_down',
                severity: 'critical',
                affected_systems: ['production', 'web', 'api'],
            },
            {
                alert_type: 'memory_pressure',
                severity: 'critical',
                affected_systems: ['production', 'database'],
            },
            { alert_type: 'disk_full', severity: 'high', affected_systems: ['database', 'storage'] },
            { alert_type: 'cpu_high', severity: 'high', affected_systems: ['production', 'web'] },
            {
                alert_type: 'network_error',
                severity: 'critical',
                affected_systems: ['network', 'connectivity'],
            },
            {
                alert_type: 'load_balancer_failure',
                severity: 'critical',
                affected_systems: ['infrastructure', 'web'],
            },
            {
                alert_type: 'security_breach',
                severity: 'critical',
                affected_systems: ['security', 'auth'],
            },
            {
                alert_type: 'authentication_failure',
                severity: 'high',
                affected_systems: ['auth', 'security'],
            },
            { alert_type: 'database_error', severity: 'high', affected_systems: ['database', 'data'] },
            { alert_type: 'backup_failure', severity: 'medium', affected_systems: ['backup', 'data'] },
        ];
        const commonQueries = [
            'critical production outage',
            'database performance issues',
            'memory leak troubleshooting',
            'network connectivity problems',
            'authentication service down',
        ];
        for (const scenario of criticalScenarios) {
            try {
                const cacheKey = `runbooks:${scenario.alert_type}:${scenario.severity}:${JSON.stringify(scenario.affected_systems)}`;
                const existing = await cacheService.get(cacheKey);
                if (existing) {
                    continue;
                }
                const mcpResult = await mcpTools.handleToolCall({
                    method: 'tools/call',
                    params: {
                        name: 'search_runbooks',
                        arguments: scenario,
                    },
                });
                if (mcpResult && !mcpResult.isError) {
                    const strategy = determineCacheStrategy('/runbooks/search', scenario);
                    const ttl = getCacheTTL('/runbooks/search', strategy, scenario);
                    await cacheService.set(cacheKey, mcpResult, ttl);
                    logger.debug('Warmed runbook cache', {
                        alert_type: scenario.alert_type,
                        severity: scenario.severity,
                        ttl,
                        strategy,
                    });
                }
            }
            catch (error) {
                logger.warn('Failed to warm runbook cache', {
                    scenario,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        for (const query of commonQueries) {
            try {
                const cacheKey = `kb_search:${Buffer.from(JSON.stringify({ query })).toString('base64').substring(0, 100)}`;
                const existing = await cacheService.get(cacheKey);
                if (existing) {
                    continue;
                }
                const mcpResult = await mcpTools.handleToolCall({
                    method: 'tools/call',
                    params: {
                        name: 'search_knowledge_base',
                        arguments: { query, max_results: 10 },
                    },
                });
                if (mcpResult && !mcpResult.isError) {
                    const strategy = determineCacheStrategy('/search', { query });
                    const ttl = getCacheTTL('/search', strategy, { query });
                    await cacheService.set(cacheKey, mcpResult, ttl);
                    logger.debug('Warmed knowledge base cache', {
                        query: query.substring(0, 30),
                        ttl,
                        strategy,
                    });
                }
            }
            catch (error) {
                logger.warn('Failed to warm knowledge base cache', {
                    query,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        logger.info('Cache warming completed');
    }
    catch (error) {
        logger.error('Cache warming failed', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
export function analyzeCachePerformance(cacheService) {
    if (!cacheService?.getStats) {
        return {
            hit_rate: 0,
            total_requests: 0,
            performance_impact: 'unknown',
            recommendations: ['Enable cache service for performance analysis'],
            detailed_metrics: {
                average_response_time_saved_ms: 0,
                cache_efficiency_score: 0,
                strategy_performance: {},
                peak_usage_hours: [],
                memory_usage_mb: 0,
                eviction_rate: 0,
            },
        };
    }
    const stats = cacheService.getStats();
    const hitRate = stats.hits / (stats.hits + stats.misses) || 0;
    const totalRequests = stats.hits + stats.misses;
    const avgResponseTimeSaved = calculateAverageResponseTimeSaved(stats);
    const cacheEfficiencyScore = calculateCacheEfficiencyScore(hitRate, stats);
    const strategyPerformance = analyzeStrategyPerformance(stats);
    const peakUsageHours = identifyPeakUsageHours(stats);
    const memoryUsage = stats.memory_usage_mb || 0;
    const evictionRate = (stats.evictions || 0) / Math.max(totalRequests, 1);
    let performanceImpact = 'excellent';
    const recommendations = [];
    if (hitRate < 0.4) {
        performanceImpact = 'critical';
        recommendations.push('URGENT: Cache hit rate is critically low - review caching strategy');
        recommendations.push('Implement immediate cache warming for critical endpoints');
        recommendations.push('Increase TTL for stable content types');
    }
    else if (hitRate < 0.6) {
        performanceImpact = 'poor';
        recommendations.push('Increase cache TTL for stable content');
        recommendations.push('Implement cache warming for critical endpoints');
        recommendations.push('Review cache key generation strategy');
    }
    else if (hitRate < 0.75) {
        performanceImpact = 'moderate';
        recommendations.push('Optimize cache key generation for better hit rates');
        recommendations.push('Consider longer TTL for metadata endpoints');
    }
    else if (hitRate < 0.9) {
        performanceImpact = 'good';
        recommendations.push('Fine-tune TTL strategies for different content types');
    }
    else {
        performanceImpact = 'excellent';
        if (evictionRate > 0.1) {
            recommendations.push('Consider reducing TTL slightly to prevent excessive evictions');
        }
        else {
            recommendations.push('Cache performance is optimal');
        }
    }
    if (memoryUsage > 500) {
        recommendations.push('High memory usage detected - consider cache size limits');
    }
    if (evictionRate > 0.2) {
        recommendations.push('High eviction rate - consider increasing cache size or reducing TTL');
    }
    Object.entries(strategyPerformance).forEach(([strategy, perf]) => {
        if (perf.hit_rate < 0.5 && perf.requests > 10) {
            recommendations.push(`Poor performance for ${strategy} strategy - review TTL settings`);
        }
    });
    if (totalRequests < 100) {
        recommendations.push('Monitor cache performance as request volume increases');
    }
    if (peakUsageHours.length > 0) {
        recommendations.push(`Consider pre-warming cache before peak hours: ${peakUsageHours.join(', ')}:00`);
    }
    return {
        hit_rate: Math.round(hitRate * 10000) / 100,
        total_requests: totalRequests,
        performance_impact: performanceImpact,
        recommendations,
        detailed_metrics: {
            average_response_time_saved_ms: avgResponseTimeSaved,
            cache_efficiency_score: cacheEfficiencyScore,
            strategy_performance: strategyPerformance,
            peak_usage_hours: peakUsageHours,
            memory_usage_mb: memoryUsage,
            eviction_rate: Math.round(evictionRate * 10000) / 100,
        },
    };
}
function calculateAverageResponseTimeSaved(stats) {
    const typicalResponseTimes = {
        critical_incident: 500,
        high_priority_incident: 400,
        complex_query: 800,
        simple_query: 200,
        business_critical_query: 300,
        metadata: 150,
        standard: 300,
    };
    let totalTimeSaved = 0;
    let totalHits = 0;
    if (stats.strategy_stats) {
        Object.entries(stats.strategy_stats).forEach(([strategy, stratStats]) => {
            const estimatedTime = typicalResponseTimes[strategy] || 300;
            const hits = stratStats.hits || 0;
            totalTimeSaved += hits * estimatedTime;
            totalHits += hits;
        });
    }
    return totalHits > 0 ? Math.round(totalTimeSaved / totalHits) : 0;
}
function calculateCacheEfficiencyScore(hitRate, stats) {
    let score = hitRate * 60;
    const memoryEfficiency = Math.min(1, 100 / (stats.memory_usage_mb || 100));
    score += memoryEfficiency * 20;
    const evictionRate = (stats.evictions || 0) / Math.max(stats.hits + stats.misses, 1);
    const evictionEfficiency = Math.max(0, 1 - evictionRate * 2);
    score += evictionEfficiency * 20;
    return Math.min(100, Math.round(score));
}
function analyzeStrategyPerformance(stats) {
    const strategyPerformance = {};
    if (stats.strategy_stats) {
        Object.entries(stats.strategy_stats).forEach(([strategy, stratStats]) => {
            const hits = stratStats.hits || 0;
            const misses = stratStats.misses || 0;
            const requests = hits + misses;
            const hit_rate = requests > 0 ? hits / requests : 0;
            strategyPerformance[strategy] = {
                hit_rate: Math.round(hit_rate * 10000) / 100,
                requests,
            };
        });
    }
    return strategyPerformance;
}
function identifyPeakUsageHours(stats) {
    if (!stats.hourly_usage) {
        return [];
    }
    const hourlyUsage = stats.hourly_usage;
    const avgUsage = Object.values(hourlyUsage).reduce((sum, usage) => sum + usage, 0) / 24;
    return Object.entries(hourlyUsage)
        .filter(([, usage]) => usage > avgUsage * 1.5)
        .map(([hour]) => parseInt(hour))
        .sort((a, b) => a - b);
}
//# sourceMappingURL=caching-middleware.js.map