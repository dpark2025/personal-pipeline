/**
 * Intelligent Caching Middleware
 *
 * Provides endpoint-specific caching with performance optimization and
 * intelligent cache strategy selection based on request characteristics.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Intelligent caching middleware for endpoint-specific optimization
 */
export function intelligentCaching(cacheService?: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!cacheService) {
      next();
      return;
    }

    // Only cache GET requests and specific POST endpoints
    const cacheable =
      req.method === 'GET' || (req.method === 'POST' && isCacheableEndpoint(req.path));

    if (!cacheable) {
      next();
      return;
    }

    // Generate cache key based on endpoint and parameters
    const cacheKey = generateCacheKey(req);
    const cacheStrategy = determineCacheStrategy(req.path, req.body);

    // Try to get cached response
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

          // Add cache headers
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Strategy', cacheStrategy);
          res.setHeader('X-Cache-Key', cacheKey.substring(0, 50));

          // Return cached response with updated metadata
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

        // No cache hit, proceed with request but set up caching
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Strategy', cacheStrategy);

        // Override res.json to cache successful responses  
        const originalJson = res.json.bind(res);
        res.json = function (this: Response, body: any) {
          // Cache successful responses
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
              .catch((cacheError: any) => {
                logger.warn('Failed to cache API response', {
                  error: cacheError instanceof Error ? cacheError.message : String(cacheError),
                  path: req.path,
                });
              });
          }

          return originalJson.call(this, body);
        };

        next();
      } catch (cacheError: any) {
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

/**
 * Check if endpoint is cacheable
 */
function isCacheableEndpoint(path: string): boolean {
  const cacheableEndpoints = [
    '/api/search',
    '/api/runbooks/search',
    '/api/decision-tree',
    '/api/escalation',
    '/api/sources',
  ];

  return cacheableEndpoints.some(endpoint => path.startsWith(endpoint));
}

/**
 * Generate cache key for request
 */
function generateCacheKey(req: Request): string {
  const pathKey = req.path.replace(/[^a-zA-Z0-9]/g, '_');
  const paramsKey =
    req.method === 'GET' ? JSON.stringify(req.query) : JSON.stringify(req.body || {});

  return `api_cache:${pathKey}:${Buffer.from(paramsKey).toString('base64').substring(0, 100)}`;
}

/**
 * Determine cache strategy for endpoint with enhanced intelligence
 */
function determineCacheStrategy(path: string, body?: any): string {
  // Critical incident response endpoints - highest priority
  if (path.includes('/runbooks') || path.includes('/escalation')) {
    const severity = body?.severity || 'unknown';
    return severity === 'critical' ? 'critical_incident' : 'high_priority_incident';
  }

  // Search endpoints with complexity analysis
  if (path.includes('/search')) {
    const query = body?.query || '';
    const queryLength = query.length;
    const hasSpecialChars = /[*?"'&<>]/.test(query);
    const hasMultipleTerms = query.split(/\s+/).length > 3;

    if (queryLength > 50 || hasSpecialChars || hasMultipleTerms) {
      return 'complex_query';
    }

    // Business critical terms get extended caching
    const criticalTerms = ['critical', 'emergency', 'production', 'outage', 'down'];
    if (criticalTerms.some(term => query.toLowerCase().includes(term))) {
      return 'business_critical_query';
    }

    return 'simple_query';
  }

  // Decision tree and procedure endpoints
  if (path.includes('/decision-tree')) {
    return 'decision_logic';
  }

  if (path.includes('/procedures')) {
    return 'procedure_steps';
  }

  // Administrative endpoints
  if (path.includes('/sources') || path.includes('/health')) {
    return 'metadata';
  }

  if (path.includes('/performance')) {
    return 'analytics';
  }

  return 'standard';
}

/**
 * Get cache TTL based on strategy and content with dynamic adjustment
 */
function getCacheTTL(_path: string, strategy: string, body: any): number {
  const baseTimeOfDay = getTimeOfDayMultiplier();
  const contentFreshness = assessContentFreshness(body);

  let baseTTL: number;

  switch (strategy) {
    case 'critical_incident':
      baseTTL = 7200; // 2 hours - critical runbooks change infrequently
      break;
    case 'high_priority_incident':
      baseTTL = 3600; // 1 hour for high priority incident data
      break;
    case 'business_critical_query':
      baseTTL = 2700; // 45 minutes for business critical searches
      break;
    case 'complex_query':
      baseTTL = 1800; // 30 minutes for complex searches
      break;
    case 'simple_query':
      baseTTL = 900; // 15 minutes for simple searches
      break;
    case 'decision_logic':
      baseTTL = 5400; // 90 minutes - decision trees are relatively stable
      break;
    case 'procedure_steps':
      baseTTL = 4320; // 72 minutes - procedures change less frequently
      break;
    case 'metadata':
      baseTTL = 14400; // 4 hours for source metadata
      break;
    case 'analytics':
      baseTTL = 300; // 5 minutes for performance data
      break;
    default:
      baseTTL = 600; // 10 minutes default
  }

  // Apply time-of-day adjustments (cache longer during off-hours)
  let adjustedTTL = Math.round(baseTTL * baseTimeOfDay);

  // Apply content freshness adjustments
  adjustedTTL = Math.round(adjustedTTL * contentFreshness);

  // Ensure reasonable bounds
  return Math.max(300, Math.min(adjustedTTL, 28800)); // 5 minutes to 8 hours
}

/**
 * Get time-of-day multiplier for cache TTL adjustment
 */
function getTimeOfDayMultiplier(): number {
  const hour = new Date().getHours();

  // During business hours (9 AM - 6 PM), use standard TTL
  if (hour >= 9 && hour <= 18) {
    return 1.0;
  }

  // During off-hours, extend cache duration (less likely to change)
  if (hour >= 22 || hour <= 6) {
    return 1.5; // 50% longer cache during night
  }

  return 1.2; // 20% longer during early morning/evening
}

/**
 * Assess content freshness requirements
 */
function assessContentFreshness(body: any): number {
  if (!body) return 1.0;

  // Runbooks with critical severity need fresher data
  if (body.severity === 'critical') {
    return 0.8; // 20% shorter cache for critical incidents
  }

  // Large result sets might be more stable
  if (body.max_results && body.max_results > 20) {
    return 1.1; // 10% longer cache for comprehensive queries
  }

  // Queries with specific systems might need fresher data
  if (body.affected_systems && body.affected_systems.length > 3) {
    return 0.9; // 10% shorter cache for complex system queries
  }

  return 1.0;
}

/**
 * Enhanced cache warming utility for critical endpoints
 */
export async function warmCriticalCache(cacheService: any, mcpTools: any): Promise<void> {
  if (!cacheService || !mcpTools) {
    return;
  }

  logger.info('Starting cache warming for critical endpoints');

  try {
    // Enhanced critical scenarios for cache warming
    const criticalScenarios = [
      // Critical production scenarios
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

      // Network and connectivity
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

      // Security incidents
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

      // Database issues
      { alert_type: 'database_error', severity: 'high', affected_systems: ['database', 'data'] },
      { alert_type: 'backup_failure', severity: 'medium', affected_systems: ['backup', 'data'] },
    ];

    // Also warm common knowledge base searches
    const commonQueries = [
      'critical production outage',
      'database performance issues',
      'memory leak troubleshooting',
      'network connectivity problems',
      'authentication service down',
    ];

    // Warm runbook cache
    for (const scenario of criticalScenarios) {
      try {
        const cacheKey = `runbooks:${scenario.alert_type}:${scenario.severity}:${JSON.stringify(scenario.affected_systems)}`;

        // Check if already cached
        const existing = await cacheService.get(cacheKey);
        if (existing) {
          continue;
        }

        // Perform search to warm cache
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
      } catch (error) {
        logger.warn('Failed to warm runbook cache', {
          scenario,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Warm knowledge base cache
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
      } catch (error) {
        logger.warn('Failed to warm knowledge base cache', {
          query,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Cache warming completed');
  } catch (error) {
    logger.error('Cache warming failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Advanced cache performance analyzer with detailed insights
 */
export function analyzeCachePerformance(cacheService: any): {
  hit_rate: number;
  total_requests: number;
  performance_impact: string;
  recommendations: string[];
  detailed_metrics: {
    average_response_time_saved_ms: number;
    cache_efficiency_score: number;
    strategy_performance: Record<string, { hit_rate: number; requests: number }>;
    peak_usage_hours: number[];
    memory_usage_mb: number;
    eviction_rate: number;
  };
} {
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

  // Calculate detailed metrics
  const avgResponseTimeSaved = calculateAverageResponseTimeSaved(stats);
  const cacheEfficiencyScore = calculateCacheEfficiencyScore(hitRate, stats);
  const strategyPerformance = analyzeStrategyPerformance(stats);
  const peakUsageHours = identifyPeakUsageHours(stats);
  const memoryUsage = stats.memory_usage_mb || 0;
  const evictionRate = (stats.evictions || 0) / Math.max(totalRequests, 1);

  let performanceImpact = 'excellent';
  const recommendations = [];

  // Enhanced analysis with multiple factors
  if (hitRate < 0.4) {
    performanceImpact = 'critical';
    recommendations.push('URGENT: Cache hit rate is critically low - review caching strategy');
    recommendations.push('Implement immediate cache warming for critical endpoints');
    recommendations.push('Increase TTL for stable content types');
  } else if (hitRate < 0.6) {
    performanceImpact = 'poor';
    recommendations.push('Increase cache TTL for stable content');
    recommendations.push('Implement cache warming for critical endpoints');
    recommendations.push('Review cache key generation strategy');
  } else if (hitRate < 0.75) {
    performanceImpact = 'moderate';
    recommendations.push('Optimize cache key generation for better hit rates');
    recommendations.push('Consider longer TTL for metadata endpoints');
  } else if (hitRate < 0.9) {
    performanceImpact = 'good';
    recommendations.push('Fine-tune TTL strategies for different content types');
  } else {
    performanceImpact = 'excellent';
    if (evictionRate > 0.1) {
      recommendations.push('Consider reducing TTL slightly to prevent excessive evictions');
    } else {
      recommendations.push('Cache performance is optimal');
    }
  }

  // Memory usage recommendations
  if (memoryUsage > 500) {
    recommendations.push('High memory usage detected - consider cache size limits');
  }

  // Eviction rate recommendations
  if (evictionRate > 0.2) {
    recommendations.push('High eviction rate - consider increasing cache size or reducing TTL');
  }

  // Strategy-specific recommendations
  Object.entries(strategyPerformance).forEach(([strategy, perf]) => {
    if (perf.hit_rate < 0.5 && perf.requests > 10) {
      recommendations.push(`Poor performance for ${strategy} strategy - review TTL settings`);
    }
  });

  if (totalRequests < 100) {
    recommendations.push('Monitor cache performance as request volume increases');
  }

  // Peak usage recommendations
  if (peakUsageHours.length > 0) {
    recommendations.push(
      `Consider pre-warming cache before peak hours: ${peakUsageHours.join(', ')}:00`
    );
  }

  return {
    hit_rate: Math.round(hitRate * 10000) / 100, // Round to 2 decimal places
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

/**
 * Calculate average response time saved by caching
 */
function calculateAverageResponseTimeSaved(stats: any): number {
  // Estimate based on typical response times
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
    Object.entries(stats.strategy_stats).forEach(([strategy, stratStats]: [string, any]) => {
      const estimatedTime =
        typicalResponseTimes[strategy as keyof typeof typicalResponseTimes] || 300;
      const hits = stratStats.hits || 0;
      totalTimeSaved += hits * estimatedTime;
      totalHits += hits;
    });
  }

  return totalHits > 0 ? Math.round(totalTimeSaved / totalHits) : 0;
}

/**
 * Calculate cache efficiency score (0-100)
 */
function calculateCacheEfficiencyScore(hitRate: number, stats: any): number {
  let score = hitRate * 60; // Base score from hit rate (60% weight)

  // Memory efficiency (20% weight)
  const memoryEfficiency = Math.min(1, 100 / (stats.memory_usage_mb || 100));
  score += memoryEfficiency * 20;

  // Eviction efficiency (20% weight)
  const evictionRate = (stats.evictions || 0) / Math.max(stats.hits + stats.misses, 1);
  const evictionEfficiency = Math.max(0, 1 - evictionRate * 2);
  score += evictionEfficiency * 20;

  return Math.min(100, Math.round(score));
}

/**
 * Analyze performance by cache strategy
 */
function analyzeStrategyPerformance(
  stats: any
): Record<string, { hit_rate: number; requests: number }> {
  const strategyPerformance: Record<string, { hit_rate: number; requests: number }> = {};

  if (stats.strategy_stats) {
    Object.entries(stats.strategy_stats).forEach(([strategy, stratStats]: [string, any]) => {
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

/**
 * Identify peak usage hours from cache statistics
 */
function identifyPeakUsageHours(stats: any): number[] {
  if (!stats.hourly_usage) {
    return [];
  }

  const hourlyUsage = stats.hourly_usage;
  const avgUsage =
    Object.values(hourlyUsage).reduce((sum: number, usage: any) => sum + usage, 0) / 24;

  return Object.entries(hourlyUsage)
    .filter(([, usage]: [string, any]) => usage > avgUsage * 1.5) // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
    .map(([hour]) => parseInt(hour)) // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
    .sort((a, b) => a - b);
}
