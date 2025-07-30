/**
 * REST API Route Definitions
 * 
 * Implements REST API endpoints that bridge to MCP tools, providing HTTP access
 * to all Personal Pipeline functionality with proper error handling and validation.
 */

import { Router } from 'express';
import { PPMCPTools } from '../tools/index.js';
import { SourceAdapterRegistry } from '../adapters/base.js';
import { CacheService } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import { 
  validateRequest, 
  handleAsyncRoute, 
  createSuccessResponse, 
  createErrorResponse 
} from './middleware.js';
import { transformMCPResponse, transformRestRequest } from './transforms.js';
import { performance } from 'perf_hooks';

export interface APIRouteOptions {
  mcpTools: PPMCPTools;
  sourceRegistry: SourceAdapterRegistry;
  cacheService?: CacheService | undefined;
}

/**
 * Create and configure all REST API routes
 */
export function createAPIRoutes(options: APIRouteOptions): Router {
  const router = Router();
  const { mcpTools, sourceRegistry, cacheService } = options;

  // ========================================================================
  // General Search Endpoints
  // ========================================================================

  /**
   * POST /api/search
   * General documentation search across all sources
   * Maps to: search_knowledge_base MCP tool
   */
  router.post('/search', 
    validateRequest({
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1 },
        categories: { 
          type: 'array', 
          items: { type: 'string' },
          optional: true 
        },
        max_age_days: { type: 'number', minimum: 1, optional: true },
        max_results: { type: 'number', minimum: 1, maximum: 100, default: 10 }
      },
      required: ['query']
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      
      try {
        // Transform REST request to MCP format
        const mcpRequest = transformRestRequest('search_knowledge_base', req.body);
        
        // Call MCP tool
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'search_knowledge_base',
            arguments: mcpRequest
          }
        });

        // Transform MCP response to REST format
        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        logger.info('REST API search completed', {
          query: req.body.query.substring(0, 50),
          results_count: restResponse.data?.results?.length || 0,
          execution_time_ms: Math.round(executionTime),
          cached: restResponse.data?.cached || false
        });

        res.json(createSuccessResponse(restResponse.data, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        logger.error('REST API search failed', {
          query: req.body.query,
          error: error instanceof Error ? error.message : String(error),
          execution_time_ms: Math.round(executionTime)
        });

        res.status(500).json(createErrorResponse(
          'SEARCH_FAILED',
          'Search operation failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  // ========================================================================
  // Runbook Endpoints
  // ========================================================================

  /**
   * POST /api/runbooks/search
   * Search for operational runbooks by alert characteristics
   * Maps to: search_runbooks MCP tool
   */
  router.post('/runbooks/search',
    validateRequest({
      type: 'object',
      properties: {
        alert_type: { type: 'string', minLength: 1 },
        severity: { 
          type: 'string', 
          enum: ['critical', 'high', 'medium', 'low', 'info'] 
        },
        affected_systems: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1
        },
        context: {
          type: 'object',
          additionalProperties: true,
          optional: true
        }
      },
      required: ['alert_type', 'severity', 'affected_systems']
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      
      try {
        // Transform REST request to MCP format
        const mcpRequest = transformRestRequest('search_runbooks', req.body);
        
        // Call MCP tool
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: mcpRequest
          }
        });

        // Transform MCP response to REST format
        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        logger.info('REST API runbook search completed', {
          alert_type: req.body.alert_type,
          severity: req.body.severity,
          results_count: restResponse.data?.runbooks?.length || 0,
          execution_time_ms: Math.round(executionTime)
        });

        res.json(createSuccessResponse(restResponse.data, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        logger.error('REST API runbook search failed', {
          alert_type: req.body.alert_type,
          error: error instanceof Error ? error.message : String(error),
          execution_time_ms: Math.round(executionTime)
        });

        res.status(500).json(createErrorResponse(
          'RUNBOOK_SEARCH_FAILED',
          'Runbook search operation failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  /**
   * GET /api/runbooks/:id
   * Get specific runbook by ID
   * Maps to: search_runbooks MCP tool with ID filter
   */
  router.get('/runbooks/:id',
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      const runbookId = req.params.id;
      
      try {
        // Transform REST request to MCP format - search by ID
        const mcpRequest = transformRestRequest('search_runbooks', {
          alert_type: 'any',
          severity: 'info',
          affected_systems: ['any'],
          context: { runbook_id: runbookId }
        });
        
        // Call MCP tool
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: mcpRequest
          }
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        // Filter for the specific runbook
        const runbooks = restResponse.data?.runbooks || [];
        const specificRunbook = runbooks.find((r: any) => r.id === runbookId);

        if (!specificRunbook) {
          res.status(404).json(createErrorResponse(
            'RUNBOOK_NOT_FOUND',
            `Runbook with ID '${runbookId}' not found`,
            { execution_time_ms: Math.round(executionTime) }
          ));
          return;
        }

        logger.info('REST API runbook retrieval completed', {
          runbook_id: runbookId,
          execution_time_ms: Math.round(executionTime)
        });

        res.json(createSuccessResponse(specificRunbook, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        logger.error('REST API runbook retrieval failed', {
          runbook_id: runbookId,
          error: error instanceof Error ? error.message : String(error),
          execution_time_ms: Math.round(executionTime)
        });

        res.status(500).json(createErrorResponse(
          'RUNBOOK_RETRIEVAL_FAILED',
          'Runbook retrieval operation failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  /**
   * GET /api/runbooks
   * List all available runbooks with optional filtering
   * Maps to: search_runbooks MCP tool with broad search
   */
  router.get('/runbooks',
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      
      try {
        // Extract query parameters
        const { category, severity, limit = 50 } = req.query;
        
        // Transform REST request to MCP format - broad search
        const mcpRequest = transformRestRequest('search_runbooks', {
          alert_type: 'any',
          severity: severity || 'info',
          affected_systems: ['any'],
          context: { 
            list_all: true,
            category: category,
            limit: parseInt(limit as string) || 50
          }
        });
        
        // Call MCP tool
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: mcpRequest
          }
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        logger.info('REST API runbook listing completed', {
          results_count: restResponse.data?.runbooks?.length || 0,
          category: category || 'all',
          execution_time_ms: Math.round(executionTime)
        });

        res.json(createSuccessResponse({
          runbooks: restResponse.data?.runbooks || [],
          total_count: restResponse.data?.total_results || 0,
          filters_applied: {
            category: category || null,
            severity: severity || null,
            limit: parseInt(limit as string) || 50
          }
        }, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        logger.error('REST API runbook listing failed', {
          error: error instanceof Error ? error.message : String(error),
          execution_time_ms: Math.round(executionTime)
        });

        res.status(500).json(createErrorResponse(
          'RUNBOOK_LISTING_FAILED',
          'Runbook listing operation failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  // ========================================================================
  // Decision Tree and Procedure Endpoints
  // ========================================================================

  /**
   * POST /api/decision-tree
   * Get decision logic for specific scenarios
   * Maps to: get_decision_tree MCP tool
   */
  router.post('/decision-tree',
    validateRequest({
      type: 'object',
      properties: {
        alert_context: {
          type: 'object',
          additionalProperties: true
        },
        current_agent_state: {
          type: 'object',
          additionalProperties: true,
          optional: true
        }
      },
      required: ['alert_context']
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      
      try {
        const mcpRequest = transformRestRequest('get_decision_tree', req.body);
        
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'get_decision_tree',
            arguments: mcpRequest
          }
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        res.json(createSuccessResponse(restResponse.data, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        res.status(500).json(createErrorResponse(
          'DECISION_TREE_FAILED',
          'Decision tree retrieval failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  /**
   * GET /api/procedures/:id
   * Get detailed procedure steps by ID
   * Maps to: get_procedure MCP tool
   */
  router.get('/procedures/:id',
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      const procedureId = req.params.id;
      
      if (!procedureId) {
        res.status(400).json(createErrorResponse(
          'MISSING_PROCEDURE_ID',
          'Procedure ID is required'
        ));
        return;
      }
      
      try {
        // Parse procedure ID to extract runbook_id and step_name
        const [runbookId, stepName] = procedureId.split('_', 2);
        
        if (!runbookId || !stepName) {
          res.status(400).json(createErrorResponse(
            'INVALID_PROCEDURE_ID',
            'Procedure ID must be in format: runbook_id_step_name'
          ));
          return;
        }

        const mcpRequest = transformRestRequest('get_procedure', {
          runbook_id: runbookId,
          step_name: stepName,
          current_context: req.query
        });
        
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'get_procedure',
            arguments: mcpRequest
          }
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        res.json(createSuccessResponse(restResponse.data, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        res.status(500).json(createErrorResponse(
          'PROCEDURE_RETRIEVAL_FAILED',
          'Procedure retrieval failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  // ========================================================================
  // Escalation and Source Management Endpoints
  // ========================================================================

  /**
   * POST /api/escalation
   * Get escalation paths based on severity and context
   * Maps to: get_escalation_path MCP tool
   */
  router.post('/escalation',
    validateRequest({
      type: 'object',
      properties: {
        severity: { 
          type: 'string', 
          enum: ['critical', 'high', 'medium', 'low', 'info'] 
        },
        business_hours: { type: 'boolean' },
        failed_attempts: {
          type: 'array',
          items: { type: 'string' },
          optional: true
        }
      },
      required: ['severity', 'business_hours']
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      
      try {
        const mcpRequest = transformRestRequest('get_escalation_path', req.body);
        
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'get_escalation_path',
            arguments: mcpRequest
          }
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        res.json(createSuccessResponse(restResponse.data, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        res.status(500).json(createErrorResponse(
          'ESCALATION_FAILED',
          'Escalation path retrieval failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  /**
   * GET /api/sources
   * List all configured documentation sources with health status
   * Maps to: list_sources MCP tool
   */
  router.get('/sources',
    handleAsyncRoute(async (_req, res) => {
      const startTime = performance.now();
      
      try {
        const includeHealth = true; // Always include health by default
        
        const mcpRequest = transformRestRequest('list_sources', {
          include_health: includeHealth
        });
        
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'list_sources',
            arguments: mcpRequest
          }
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        res.json(createSuccessResponse(restResponse.data, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        res.status(500).json(createErrorResponse(
          'SOURCES_LISTING_FAILED',
          'Sources listing failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  // ========================================================================
  // Feedback and Analytics Endpoints
  // ========================================================================

  /**
   * POST /api/feedback
   * Record resolution feedback for system improvement
   * Maps to: record_resolution_feedback MCP tool
   */
  router.post('/feedback',
    validateRequest({
      type: 'object',
      properties: {
        runbook_id: { type: 'string', minLength: 1 },
        procedure_id: { type: 'string', minLength: 1 },
        outcome: { 
          type: 'string', 
          enum: ['success', 'partial_success', 'failure', 'escalated'] 
        },
        resolution_time_minutes: { type: 'number', minimum: 0 },
        notes: { type: 'string', optional: true }
      },
      required: ['runbook_id', 'procedure_id', 'outcome', 'resolution_time_minutes']
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      
      try {
        const mcpRequest = transformRestRequest('record_resolution_feedback', req.body);
        
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'record_resolution_feedback',
            arguments: mcpRequest
          }
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        logger.info('REST API feedback recorded', {
          runbook_id: req.body.runbook_id,
          outcome: req.body.outcome,
          resolution_time_minutes: req.body.resolution_time_minutes,
          execution_time_ms: Math.round(executionTime)
        });

        res.json(createSuccessResponse(restResponse.data, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        res.status(500).json(createErrorResponse(
          'FEEDBACK_RECORDING_FAILED',
          'Feedback recording failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  // ========================================================================
  // API Health and Performance Endpoints
  // ========================================================================

  /**
   * GET /api/health
   * Get consolidated API health status
   */
  router.get('/health',
    handleAsyncRoute(async (_req, res) => {
      const startTime = performance.now();
      
      try {
        // Get health from multiple sources
        const [sourcesHealth, cacheHealth, toolsMetrics] = await Promise.allSettled([
          sourceRegistry.healthCheckAll(),
          cacheService?.healthCheck() || Promise.resolve(null),
          Promise.resolve(mcpTools.getPerformanceMetrics())
        ]);

        const executionTime = performance.now() - startTime;
        
        const healthStatus = {
          api_status: 'healthy',
          sources: sourcesHealth.status === 'fulfilled' ? sourcesHealth.value : [],
          cache: cacheHealth.status === 'fulfilled' ? cacheHealth.value : null,
          tools: toolsMetrics.status === 'fulfilled' ? toolsMetrics.value : null,
          uptime_seconds: process.uptime(),
          timestamp: new Date().toISOString()
        };

        // Determine overall health
        const healthySources = healthStatus.sources.filter((s: any) => s.healthy).length;
        const totalSources = healthStatus.sources.length;
        const sourceHealthRatio = totalSources > 0 ? healthySources / totalSources : 1;

        if (sourceHealthRatio < 0.5) {
          healthStatus.api_status = 'unhealthy';
        } else if (sourceHealthRatio < 0.8) {
          healthStatus.api_status = 'degraded';
        }

        const statusCode = healthStatus.api_status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json(createSuccessResponse(healthStatus, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        res.status(500).json(createErrorResponse(
          'HEALTH_CHECK_FAILED',
          'API health check failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  /**
   * GET /api/performance
   * Get API performance metrics and statistics
   */
  router.get('/performance',
    handleAsyncRoute(async (_req, res) => {
      const startTime = performance.now();
      
      try {
        const toolsMetrics = mcpTools.getPerformanceMetrics();
        const cacheStats = mcpTools.getCacheStats();
        const executionTime = performance.now() - startTime;

        const performanceData = {
          tools: toolsMetrics,
          cache: cacheStats,
          system: {
            memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            uptime_seconds: process.uptime(),
            node_version: process.version
          },
          timestamp: new Date().toISOString()
        };

        res.json(createSuccessResponse(performanceData, {
          execution_time_ms: Math.round(executionTime)
        }));

      } catch (error) {
        const executionTime = performance.now() - startTime;
        res.status(500).json(createErrorResponse(
          'PERFORMANCE_METRICS_FAILED',
          'Performance metrics retrieval failed',
          { execution_time_ms: Math.round(executionTime) }
        ));
      }
    })
  );

  return router;
}