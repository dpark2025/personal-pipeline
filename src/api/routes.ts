/**
 * REST API Route Definitions
 *
 * Implements REST API endpoints that bridge to MCP tools, providing HTTP access
 * to all Personal Pipeline functionality with proper error handling and validation.
 */

import express from 'express';
import { PPMCPTools } from '../tools/index.js';
import { SourceAdapterRegistry } from '../adapters/base.js';
import { CacheService, createCacheKey } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import {
  validateRequest,
  handleAsyncRoute,
  createSuccessResponse,
  createErrorResponse,
} from './middleware.js';
import {
  createSuccessResponseWithCorrelation,
  createErrorResponseWithCorrelation,
} from './correlation.js';
import { transformMCPResponse, transformRestRequest } from './transforms.js';
import { ValidationError, PPError, SourceError } from '../types/index.js';
import { performance } from 'perf_hooks';

/**
 * Determines the appropriate HTTP status code based on error type
 */
function getErrorStatusCode(error: unknown): number {
  if (error instanceof ValidationError) {
    return 400; // Bad Request
  }
  if (error instanceof SourceError) {
    return 502; // Bad Gateway
  }
  if (error instanceof PPError) {
    return error.statusCode;
  }

  // Check error message for common client error patterns
  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    errorMessage.includes('invalid') ||
    errorMessage.includes('validation') ||
    errorMessage.includes('missing required') ||
    errorMessage.includes('bad request') ||
    errorMessage.includes('malformed')
  ) {
    return 400; // Bad Request
  }

  if (errorMessage.includes('not found')) {
    return 404; // Not Found
  }

  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('unavailable') ||
    errorMessage.includes('service down')
  ) {
    return 503; // Service Unavailable
  }

  // Default to 500 for unknown errors
  return 500;
}

export interface APIRouteOptions {
  mcpTools: PPMCPTools;
  sourceRegistry: SourceAdapterRegistry;
  cacheService?: CacheService | undefined;
}

// ============================================================================
// Advanced Error Handling
// ============================================================================

interface ToolErrorDetails {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  httpStatus: number;
  recoveryActions: string[];
  retryRecommended: boolean;
  escalationRequired?: boolean;
  businessImpact?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Handle tool-specific errors with intelligent classification and recovery suggestions
 */
function handleToolSpecificError(
  error: any,
  toolName: string,
  context: {
    requestId?: string;
    executionTime?: number;
    [key: string]: any;
  }
): ToolErrorDetails {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT');
  const isValidationError =
    errorMessage.includes('validation') || errorMessage.includes('required');
  // const isNetworkError = errorMessage.includes('network') || errorMessage.includes('connection');
  // const isSourceError = errorMessage.includes('source') || errorMessage.includes('adapter');

  // Base error details
  let errorDetails: ToolErrorDetails = {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    severity: 'medium',
    httpStatus: 500,
    recoveryActions: ['Retry the request', 'Contact support if problem persists'],
    retryRecommended: true,
  };

  // Tool-specific error handling
  switch (toolName) {
    case 'search_knowledge_base':
      errorDetails = handleSearchKnowledgeBaseError(error, errorMessage, context);
      break;
    case 'search_runbooks':
      errorDetails = handleSearchRunbooksError(error, errorMessage, context);
      break;
    case 'get_escalation_path':
      errorDetails = handleEscalationPathError(error, errorMessage, context);
      break;
    case 'get_decision_tree':
      errorDetails = handleDecisionTreeError(error, errorMessage, context);
      break;
    case 'get_procedure':
      errorDetails = handleProcedureError(error, errorMessage, context);
      break;
    default:
      // Generic error handling with context-aware improvements
      if (isValidationError) {
        errorDetails = {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          severity: 'low',
          httpStatus: 400,
          recoveryActions: ['Check request format and required fields', 'Verify data types'],
          retryRecommended: false,
        };
      } else if (isTimeoutError) {
        errorDetails = {
          code: 'TIMEOUT_ERROR',
          message: 'Request timed out',
          severity: 'medium',
          httpStatus: 504,
          recoveryActions: ['Retry with simplified parameters', 'Check system load'],
          retryRecommended: true,
        };
      }
      break;
  }

  // Add execution time context if available
  if (context.executionTime && context.executionTime > 10000) {
    errorDetails.recoveryActions.unshift('Consider simplifying the request for better performance');
  }

  return errorDetails;
}

/**
 * Handle search knowledge base specific errors
 */
function handleSearchKnowledgeBaseError(
  _error: any, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  errorMessage: string,
  _context: any // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
): ToolErrorDetails {
  if (errorMessage.includes('Query must be at least')) {
    return {
      code: 'INVALID_QUERY',
      message: 'Search query is too short or invalid',
      severity: 'low',
      httpStatus: 400,
      recoveryActions: [
        'Provide a query with at least 2 meaningful characters',
        'Remove special characters if present',
        'Use descriptive search terms',
      ],
      retryRecommended: false,
    };
  }

  if (errorMessage.includes('Query too long')) {
    return {
      code: 'QUERY_TOO_LONG',
      message: 'Search query exceeds maximum length',
      severity: 'low',
      httpStatus: 400,
      recoveryActions: [
        'Shorten the search query to under 500 characters',
        'Focus on key terms',
        'Remove unnecessary words',
      ],
      retryRecommended: false,
    };
  }

  if (errorMessage.includes('No results found') || errorMessage.includes('empty')) {
    return {
      code: 'NO_RESULTS',
      message: 'No matching documents found',
      severity: 'low',
      httpStatus: 404,
      recoveryActions: [
        'Try broader search terms',
        'Check spelling and terminology',
        'Remove category filters if applied',
      ],
      retryRecommended: false,
    };
  }

  // Default knowledge base error
  return {
    code: 'KNOWLEDGE_BASE_ERROR',
    message: 'Knowledge base search failed',
    severity: 'medium',
    httpStatus: 500,
    recoveryActions: [
      'Retry with simpler search terms',
      'Check if knowledge base sources are available',
      'Try searching in specific categories',
    ],
    retryRecommended: true,
  };
}

/**
 * Handle search runbooks specific errors - critical for incident response
 */
function handleSearchRunbooksError(
  _error: any,
  errorMessage: string,
  context: any
): ToolErrorDetails {
  const severity = context.severity || 'unknown';
  const isCriticalIncident = severity === 'critical';

  if (errorMessage.includes('Missing required fields')) {
    return {
      code: 'MISSING_RUNBOOK_FIELDS',
      message: 'Required runbook search parameters missing',
      severity: 'medium',
      httpStatus: 400,
      recoveryActions: [
        'Provide alert_type, severity, and affected_systems',
        'Ensure severity is one of: critical, high, medium, low, info',
        'Verify affected_systems is a non-empty array',
      ],
      retryRecommended: false,
      businessImpact: isCriticalIncident ? 'high' : 'medium',
    };
  }

  if (errorMessage.includes('No runbooks found')) {
    return {
      code: 'NO_RUNBOOKS_FOUND',
      message: 'No matching runbooks available for this scenario',
      severity: isCriticalIncident ? 'high' : 'medium',
      httpStatus: 404,
      recoveryActions: [
        'Try with broader affected systems',
        'Check if alert_type is spelled correctly',
        'Use general escalation procedures',
        'Contact on-call engineer if critical',
      ],
      retryRecommended: false,
      escalationRequired: isCriticalIncident,
      businessImpact: isCriticalIncident ? 'critical' : 'medium',
    };
  }

  if (errorMessage.includes('Invalid severity level')) {
    return {
      code: 'INVALID_SEVERITY',
      message: 'Invalid severity level specified',
      severity: 'low',
      httpStatus: 400,
      recoveryActions: [
        'Use one of: critical, high, medium, low, info',
        'Check severity spelling and capitalization',
      ],
      retryRecommended: false,
    };
  }

  // Default runbook error - always high severity due to incident response nature
  return {
    code: 'RUNBOOK_SEARCH_FAILED',
    message: 'Runbook search operation failed',
    severity: isCriticalIncident ? 'critical' : 'high',
    httpStatus: 500,
    recoveryActions: [
      'Retry the search immediately',
      'Check runbook source availability',
      'Use manual escalation procedures',
      'Contact incident commander if critical',
    ],
    retryRecommended: true,
    escalationRequired: isCriticalIncident,
    businessImpact: isCriticalIncident ? 'critical' : 'high',
  };
}

/**
 * Handle escalation path specific errors - critical for incident management
 */
function handleEscalationPathError(
  _error: any, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  _errorMessage: string, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  _context: any // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
): ToolErrorDetails {
  return {
    code: 'ESCALATION_PATH_ERROR',
    message: 'Failed to retrieve escalation procedures',
    severity: 'critical', // Always critical - escalation is essential
    httpStatus: 500,
    recoveryActions: [
      'Use default escalation contacts immediately',
      'Contact on-call manager directly',
      'Follow emergency escalation procedures',
      'Document the escalation path failure',
    ],
    retryRecommended: true,
    escalationRequired: true,
    businessImpact: 'high',
  };
}

/**
 * Handle decision tree specific errors
 */
function handleDecisionTreeError(
  _error: any, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  _errorMessage: string, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  _context: any // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
): ToolErrorDetails {
  return {
    code: 'DECISION_TREE_ERROR',
    message: 'Failed to retrieve decision logic',
    severity: 'medium',
    httpStatus: 500,
    recoveryActions: [
      'Retry with simplified alert context',
      'Use manual decision making process',
      'Consult team lead for guidance',
    ],
    retryRecommended: true,
  };
}

/**
 * Handle procedure specific errors
 */
function handleProcedureError(
  _error: any, // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
  errorMessage: string, 
  _context: any // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
): ToolErrorDetails {
  if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
    return {
      code: 'PROCEDURE_NOT_FOUND',
      message: 'Requested procedure not found',
      severity: 'medium',
      httpStatus: 404,
      recoveryActions: [
        'Check procedure ID format (runbook_id_step_name)',
        'Verify the runbook exists',
        'Use related procedures if available',
      ],
      retryRecommended: false,
    };
  }

  return {
    code: 'PROCEDURE_ERROR',
    message: 'Failed to retrieve procedure details',
    severity: 'medium',
    httpStatus: 500,
    recoveryActions: [
      'Retry the procedure lookup',
      'Check runbook source availability',
      'Use manual procedure execution',
    ],
    retryRecommended: true,
  };
}

/**
 * Create and configure all REST API routes
 */
export function createAPIRoutes(options: APIRouteOptions): express.Router {
  const router = express.Router();
  const { mcpTools, sourceRegistry, cacheService } = options;

  // ========================================================================
  // General Search Endpoints
  // ========================================================================

  /**
   * POST /api/search
   * General documentation search across all sources
   * Maps to: search_knowledge_base MCP tool
   */
  router.post(
    '/search',
    validateRequest({
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1 },
        categories: {
          type: 'array',
          items: { type: 'string' },
          optional: true,
        },
        max_age_days: { type: 'number', minimum: 1, optional: true },
        max_results: { type: 'number', minimum: 1, maximum: 100, default: 10 },
      },
      required: ['query'],
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();

      try {
        // Smart routing: detect if this should be routed to runbook search
        const categories = req.body.categories || [];
        const isRunbookSearch = categories.includes('runbooks') && categories.length === 1;

        let toolName = 'search_knowledge_base';
        let transformedBody = req.body;

        if (isRunbookSearch) {
          // Route to search_runbooks tool and transform the request
          toolName = 'search_runbooks';
          transformedBody = {
            alert_type: req.body.query.replace(/\s+/g, '_').toLowerCase(),
            severity: 'medium', // Default severity for general searches
            affected_systems: ['system'], // Default system
            context: {
              original_query: req.body.query,
              max_results: req.body.max_results,
              smart_routed: true,
            },
          };

          logger.info('Smart routing: redirecting to search_runbooks', {
            original_query: req.body.query,
            transformed_alert_type: transformedBody.alert_type,
            categories,
          });
        }

        // Transform REST request to MCP format with enhanced context
        const requestId = req.headers['x-request-id'] as string;
        const userAgent = req.get('User-Agent');
        const mcpRequest = transformRestRequest(toolName, transformedBody, {
          ...(requestId && { requestId }),
          ...(userAgent && { userAgent }),
          cacheHint: req.query.cache !== 'false',
          endpoint: req.path,
        });

        // Intelligent caching check
        const cacheKeyPrefix = isRunbookSearch ? 'runbooks' : 'knowledge_base';
        const cacheKey = cacheService
          ? createCacheKey(cacheKeyPrefix as any, JSON.stringify(mcpRequest))
          : null;

        let cachedResult = null;
        if (cacheService && cacheKey) {
          try {
            cachedResult = await cacheService.get(cacheKey);
            if (cachedResult) {
              logger.info('Cache hit for knowledge base search', {
                requestId: req.headers['x-request-id'],
                cacheKey: cacheKey.identifier.substring(0, 50),
              });
            }
          } catch (cacheError) {
            logger.warn('Cache lookup failed, proceeding without cache', {
              error: cacheError instanceof Error ? cacheError.message : String(cacheError),
            });
          }
        }

        let restResponse;
        if (cachedResult) {
          restResponse = {
            ...cachedResult,
            metadata: {
              ...cachedResult.metadata,
              cached: true,
              cache_hit_time: new Date().toISOString(),
            },
          };
        } else {
          // Call MCP tool
          const mcpResult = await mcpTools.handleToolCall({
            method: 'tools/call',
            params: {
              name: toolName,
              arguments: mcpRequest,
            },
          });

          // Transform MCP response to REST format with enhanced context
          const requestId = req.headers['x-request-id'] as string;
          const context = {
            toolName,
            ...(requestId && { requestId }),
            startTime,
          };
          restResponse = transformMCPResponse(mcpResult, context);

          // Cache successful responses
          if (cacheService && cacheKey && restResponse.success && restResponse.data) {
            try {
              await cacheService.set(cacheKey, restResponse);
              logger.debug('Cached knowledge base search result', {
                cacheKey: cacheKey.identifier.substring(0, 50),
                strategy: restResponse.metadata?.cache_strategy,
              });
            } catch (cacheError) {
              logger.warn('Failed to cache result', {
                error: cacheError instanceof Error ? cacheError.message : String(cacheError),
              });
            }
          }
        }

        const executionTime = performance.now() - startTime;

        logger.info('REST API search completed', {
          query: req.body.query.substring(0, 50),
          tool_used: toolName,
          smart_routed: isRunbookSearch,
          results_count:
            restResponse.data?.results?.length || restResponse.data?.runbooks?.length || 0,
          execution_time_ms: Math.round(executionTime),
          cached: restResponse.data?.cached || false,
        });

        res.json(
          createSuccessResponseWithCorrelation(restResponse.data, req, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        const requestId = req.headers['x-request-id'] as string;
        const errorDetails = handleToolSpecificError(error, 'search_knowledge_base', {
          query: req.body.query,
          requestId,
          executionTime,
        });

        logger.error('REST API search failed', {
          query: req.body.query?.substring(0, 100),
          error: errorDetails.message,
          error_code: errorDetails.code,
          severity: errorDetails.severity,
          execution_time_ms: Math.round(executionTime),
          request_id: requestId,
        });

        res.status(errorDetails.httpStatus).json(
          createErrorResponseWithCorrelation(errorDetails.code, errorDetails.message, req, {
            execution_time_ms: Math.round(executionTime),
            recovery_actions: errorDetails.recoveryActions,
            retry_recommended: errorDetails.retryRecommended,
          })
        );
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
  router.post(
    '/runbooks/search',
    validateRequest({
      type: 'object',
      properties: {
        alert_type: { type: 'string', minLength: 1 },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low', 'info'],
        },
        affected_systems: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
        },
        context: {
          type: 'object',
          additionalProperties: true,
          optional: true,
        },
      },
      required: ['alert_type', 'severity', 'affected_systems'],
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();

      try {
        // Transform REST request to MCP format with enhanced context for critical runbook operations
        const requestId = req.headers['x-request-id'] as string;
        const userAgent = req.get('User-Agent');
        const mcpRequest = transformRestRequest('search_runbooks', req.body, {
          ...(requestId && { requestId }),
          ...(userAgent && { userAgent }),
          cacheHint: true, // Always prefer cache for runbooks due to criticality
          endpoint: req.path,
        });

        // High-priority caching for runbooks (critical for incident response)
        const cacheKey = cacheService
          ? createCacheKey(
              'runbooks',
              JSON.stringify({
                alert_type: req.body.alert_type,
                severity: req.body.severity,
                affected_systems: req.body.affected_systems,
              })
            )
          : null;

        let cachedResult = null;
        if (cacheService && cacheKey) {
          try {
            cachedResult = await cacheService.get(cacheKey);
            if (cachedResult) {
              logger.info('High-priority cache hit for runbook search', {
                alertType: req.body.alert_type,
                severity: req.body.severity,
                requestId: req.headers['x-request-id'],
              });
            }
          } catch (cacheError) {
            logger.error('Critical cache lookup failed for runbooks', {
              error: cacheError instanceof Error ? cacheError.message : String(cacheError),
              alertType: req.body.alert_type,
              severity: req.body.severity,
            });
          }
        }

        let restResponse;
        if (cachedResult) {
          restResponse = {
            ...cachedResult,
            metadata: {
              ...cachedResult.metadata,
              cached: true,
              cache_priority: 'critical',
              cache_hit_time: new Date().toISOString(),
            },
          };
        } else {
          // Call MCP tool with performance monitoring
          const mcpResult = await mcpTools.handleToolCall({
            method: 'tools/call',
            params: {
              name: 'search_runbooks',
              arguments: mcpRequest,
            },
          });

          // Transform MCP response to REST format
          const requestId = req.headers['x-request-id'] as string;
          const context = {
            toolName: 'search_runbooks',
            ...(requestId && { requestId }),
            startTime,
          };
          restResponse = transformMCPResponse(mcpResult, context);

          // Aggressive caching for runbooks (extend TTL based on severity)
          if (cacheService && cacheKey && restResponse.success && restResponse.data) {
            try {
              await cacheService.set(cacheKey, restResponse);
              logger.info('Cached runbook search result with high priority', {
                alertType: req.body.alert_type,
                severity: req.body.severity,
                resultsCount: restResponse.data?.runbooks?.length || 0,
              });
            } catch (cacheError) {
              logger.error('Failed to cache critical runbook result', {
                error: cacheError instanceof Error ? cacheError.message : String(cacheError),
              });
            }
          }
        }

        const executionTime = performance.now() - startTime;

        logger.info('REST API runbook search completed', {
          alert_type: req.body.alert_type,
          severity: req.body.severity,
          results_count: restResponse.data?.runbooks?.length || 0,
          execution_time_ms: Math.round(executionTime),
        });

        res.json(
          createSuccessResponseWithCorrelation(restResponse.data, req, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        const requestId = req.headers['x-request-id'] as string;
        const errorDetails = handleToolSpecificError(error, 'search_runbooks', {
          alertType: req.body.alert_type,
          severity: req.body.severity,
          affectedSystems: req.body.affected_systems,
          requestId,
          executionTime,
        });

        // Critical error handling for runbook searches - these are high-priority
        logger.error('REST API runbook search failed - HIGH PRIORITY', {
          alert_type: req.body.alert_type,
          severity: req.body.severity,
          affected_systems: req.body.affected_systems,
          error: errorDetails.message,
          error_code: errorDetails.code,
          error_severity: errorDetails.severity,
          execution_time_ms: Math.round(executionTime),
          request_id: requestId,
          business_impact: errorDetails.businessImpact,
        });

        // Use appropriate HTTP status based on error type
        res.status(errorDetails.httpStatus).json(
          createErrorResponseWithCorrelation(errorDetails.code, errorDetails.message, req, {
            execution_time_ms: Math.round(executionTime),
            recovery_actions: errorDetails.recoveryActions,
            retry_recommended: errorDetails.retryRecommended,
            escalation_required: errorDetails.escalationRequired,
            business_impact: errorDetails.businessImpact,
          })
        );
      }
    })
  );

  /**
   * GET /api/runbooks/:id
   * Get specific runbook by ID
   * Maps to: search_runbooks MCP tool with ID filter
   */
  router.get(
    '/runbooks/:id',
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      const runbookId = req.params.id;

      try {
        // Transform REST request to MCP format - search by ID
        const mcpRequest = transformRestRequest('search_runbooks', {
          alert_type: 'any',
          severity: 'info',
          affected_systems: ['any'],
          context: { runbook_id: runbookId },
        });

        // Call MCP tool
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: mcpRequest,
          },
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        // Filter for the specific runbook
        const runbooks = restResponse.data?.runbooks || [];
        const specificRunbook = runbooks.find((r: any) => r.id === runbookId);

        if (!specificRunbook) {
          res
            .status(404)
            .json(
              createErrorResponseWithCorrelation(
                'RUNBOOK_NOT_FOUND',
                `Runbook with ID '${runbookId}' not found`,
                req,
                { execution_time_ms: Math.round(executionTime) }
              )
            );
          return;
        }

        logger.info('REST API runbook retrieval completed', {
          runbook_id: runbookId,
          execution_time_ms: Math.round(executionTime),
        });

        res.json(
          createSuccessResponseWithCorrelation(specificRunbook, req, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        const statusCode = getErrorStatusCode(error);

        logger.error('REST API runbook retrieval failed', {
          runbook_id: runbookId,
          error: error instanceof Error ? error.message : String(error),
          status_code: statusCode,
          execution_time_ms: Math.round(executionTime),
        });

        res
          .status(statusCode)
          .json(
            createErrorResponseWithCorrelation(
              'RUNBOOK_RETRIEVAL_FAILED',
              error instanceof Error ? error.message : 'Runbook retrieval operation failed',
              req,
              { execution_time_ms: Math.round(executionTime) }
            )
          );
      }
    })
  );

  /**
   * GET /api/runbooks
   * List all available runbooks with optional filtering
   * Maps to: search_runbooks MCP tool with broad search
   */
  router.get(
    '/runbooks',
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
            category,
            limit: parseInt(limit as string) || 50,
          },
        });

        // Call MCP tool
        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'search_runbooks',
            arguments: mcpRequest,
          },
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        logger.info('REST API runbook listing completed', {
          results_count: restResponse.data?.runbooks?.length || 0,
          category: category || 'all',
          execution_time_ms: Math.round(executionTime),
        });

        res.json(
          createSuccessResponseWithCorrelation(
            {
              runbooks: restResponse.data?.runbooks || [],
              total_count: restResponse.data?.total_results || 0,
              filters_applied: {
                category: category || null,
                severity: severity || null,
                limit: parseInt(limit as string) || 50,
              },
            },
            req,
            {
              execution_time_ms: Math.round(executionTime),
            }
          )
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        const statusCode = getErrorStatusCode(error);

        logger.error('REST API runbook listing failed', {
          error: error instanceof Error ? error.message : String(error),
          status_code: statusCode,
          execution_time_ms: Math.round(executionTime),
        });

        res
          .status(statusCode)
          .json(
            createErrorResponseWithCorrelation(
              'RUNBOOK_LISTING_FAILED',
              error instanceof Error ? error.message : 'Runbook listing operation failed',
              req,
              { execution_time_ms: Math.round(executionTime) }
            )
          );
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
  router.post(
    '/decision-tree',
    validateRequest({
      type: 'object',
      properties: {
        alert_context: {
          type: 'object',
          additionalProperties: true,
        },
        current_agent_state: {
          type: 'object',
          additionalProperties: true,
          optional: true,
        },
      },
      required: ['alert_context'],
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();

      try {
        const mcpRequest = transformRestRequest('get_decision_tree', req.body);

        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'get_decision_tree',
            arguments: mcpRequest,
          },
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        res.json(
          createSuccessResponseWithCorrelation(restResponse.data, req, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        const statusCode = getErrorStatusCode(error);

        res.status(statusCode).json(
          createErrorResponse(
            'DECISION_TREE_FAILED',
            error instanceof Error ? error.message : 'Decision tree retrieval failed',
            {
              execution_time_ms: Math.round(executionTime),
            }
          )
        );
      }
    })
  );

  /**
   * GET /api/procedures/:id
   * Get detailed procedure steps by ID
   * Maps to: get_procedure MCP tool
   */
  router.get(
    '/procedures/:id',
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();
      const procedureId = req.params.id;

      if (!procedureId) {
        res
          .status(400)
          .json(createErrorResponse('MISSING_PROCEDURE_ID', 'Procedure ID is required'));
        return;
      }

      try {
        // Parse procedure ID to extract runbook_id and step_name
        const [runbookId, stepName] = procedureId.split('_', 2);

        if (!runbookId || !stepName) {
          res
            .status(400)
            .json(
              createErrorResponse(
                'INVALID_PROCEDURE_ID',
                'Procedure ID must be in format: runbook_id_step_name'
              )
            );
          return;
        }

        const mcpRequest = transformRestRequest('get_procedure', {
          runbook_id: runbookId,
          step_name: stepName,
          current_context: req.query,
        });

        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'get_procedure',
            arguments: mcpRequest,
          },
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        res.json(
          createSuccessResponseWithCorrelation(restResponse.data, req, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        const statusCode = getErrorStatusCode(error);

        res.status(statusCode).json(
          createErrorResponse(
            'PROCEDURE_RETRIEVAL_FAILED',
            error instanceof Error ? error.message : 'Procedure retrieval failed',
            {
              execution_time_ms: Math.round(executionTime),
            }
          )
        );
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
  router.post(
    '/escalation',
    validateRequest({
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low', 'info'],
        },
        business_hours: { type: 'boolean' },
        failed_attempts: {
          type: 'array',
          items: { type: 'string' },
          optional: true,
        },
      },
      required: ['severity', 'business_hours'],
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();

      try {
        const mcpRequest = transformRestRequest('get_escalation_path', req.body);

        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'get_escalation_path',
            arguments: mcpRequest,
          },
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        res.json(
          createSuccessResponseWithCorrelation(restResponse.data, req, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        res.status(getErrorStatusCode(error)).json(
          createErrorResponse('ESCALATION_FAILED', 'Escalation path retrieval failed', {
            execution_time_ms: Math.round(executionTime),
          })
        );
      }
    })
  );

  /**
   * GET /api/sources
   * List all configured documentation sources with health status
   * Maps to: list_sources MCP tool
   */
  router.get(
    '/sources',
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();

      try {
        const includeHealth = true; // Always include health by default

        const mcpRequest = transformRestRequest('list_sources', {
          include_health: includeHealth,
        });

        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'list_sources',
            arguments: mcpRequest,
          },
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        res.json(
          createSuccessResponseWithCorrelation(restResponse.data, req, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        res.status(getErrorStatusCode(error)).json(
          createErrorResponse('SOURCES_LISTING_FAILED', 'Sources listing failed', {
            execution_time_ms: Math.round(executionTime),
          })
        );
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
  router.post(
    '/feedback',
    validateRequest({
      type: 'object',
      properties: {
        runbook_id: { type: 'string', minLength: 1 },
        procedure_id: { type: 'string', minLength: 1 },
        outcome: {
          type: 'string',
          enum: ['success', 'partial_success', 'failure', 'escalated'],
        },
        resolution_time_minutes: { type: 'number', minimum: 0 },
        notes: { type: 'string', optional: true },
      },
      required: ['runbook_id', 'procedure_id', 'outcome', 'resolution_time_minutes'],
    }),
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();

      try {
        const mcpRequest = transformRestRequest('record_resolution_feedback', req.body);

        const mcpResult = await mcpTools.handleToolCall({
          method: 'tools/call',
          params: {
            name: 'record_resolution_feedback',
            arguments: mcpRequest,
          },
        });

        const restResponse = transformMCPResponse(mcpResult);
        const executionTime = performance.now() - startTime;

        logger.info('REST API feedback recorded', {
          runbook_id: req.body.runbook_id,
          outcome: req.body.outcome,
          resolution_time_minutes: req.body.resolution_time_minutes,
          execution_time_ms: Math.round(executionTime),
        });

        res.json(
          createSuccessResponseWithCorrelation(restResponse.data, req, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        res
          .status(getErrorStatusCode(error))
          .json(
            createErrorResponseWithCorrelation(
              'FEEDBACK_RECORDING_FAILED',
              'Feedback recording failed',
              req,
              { execution_time_ms: Math.round(executionTime) }
            )
          );
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
  router.get(
    '/health',
    handleAsyncRoute(async (req, res) => {
      const startTime = performance.now();

      try {
        // Get health from multiple sources
        const [sourcesHealth, cacheHealth, toolsMetrics] = await Promise.allSettled([
          sourceRegistry.healthCheckAll(),
          cacheService?.healthCheck() || Promise.resolve(null),
          Promise.resolve(mcpTools.getPerformanceMetrics()),
        ]);

        const executionTime = performance.now() - startTime;

        const healthStatus = {
          api_status: 'healthy',
          sources: sourcesHealth.status === 'fulfilled' ? sourcesHealth.value : [],
          cache: cacheHealth.status === 'fulfilled' ? cacheHealth.value : null,
          tools: toolsMetrics.status === 'fulfilled' ? toolsMetrics.value : null,
          uptime_seconds: process.uptime(),
          timestamp: new Date().toISOString(),
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

        res.status(statusCode).json(
          createSuccessResponse(healthStatus, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        res
          .status(getErrorStatusCode(error))
          .json(
            createErrorResponseWithCorrelation(
              'HEALTH_CHECK_FAILED',
              'API health check failed',
              req,
              { execution_time_ms: Math.round(executionTime) }
            )
          );
      }
    })
  );

  /**
   * GET /api/performance
   * Get API performance metrics and statistics
   */
  router.get(
    '/performance',
    handleAsyncRoute(async (req, res) => {
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
            node_version: process.version,
          },
          timestamp: new Date().toISOString(),
        };

        res.json(
          createSuccessResponse(performanceData, {
            execution_time_ms: Math.round(executionTime),
          })
        );
      } catch (error) {
        const executionTime = performance.now() - startTime;
        res
          .status(getErrorStatusCode(error))
          .json(
            createErrorResponseWithCorrelation(
              'PERFORMANCE_METRICS_FAILED',
              'Performance metrics retrieval failed',
              req,
              { execution_time_ms: Math.round(executionTime) }
            )
          );
      }
    })
  );

  // ========================================================================
  // API Documentation Endpoints
  // ========================================================================

  /**
   * GET /api/docs
   * Interactive API documentation using Swagger UI
   */
  router.get('/docs', (_req, res) => {
    res.redirect('/api/docs/');
  });

  return router;
}
