/**
 * Request/Response Transformation Utilities
 *
 * Handles transformation between REST API requests and MCP tool parameters,
 * and between MCP tool responses and REST API responses. Preserves metadata,
 * confidence scores, and performance metrics while ensuring compatibility.
 */

import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';

// ============================================================================
// Type Definitions with Enhanced Type Safety
// ============================================================================

// Strict typing for MCP tool requests
export interface MCPToolRequest {
  [key: string]: any;
  _metadata?: {
    tool_name: string;
    request_id?: string;
    user_agent?: string;
    cache_preferred?: boolean;
    transform_time_ms?: number;
    validation_passed?: boolean;
  };
  _performance_hints?: {
    query_complexity?: number;
    suggested_cache_ttl?: number;
    parallel_search?: boolean;
    cache_priority?: 'high' | 'medium' | 'standard';
    urgency_multiplier?: number;
    suggested_timeout_ms?: number;
  };
}

// Enhanced error severity with recovery actions
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PerformanceTier = 'fast' | 'medium' | 'slow';
export type CacheStrategy = 'high_priority' | 'performance_cache' | 'high_confidence' | 'standard';

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  severity: ErrorSeverity;
  retry_after_ms?: number;
  recovery_actions?: string[];
  context?: {
    tool_name?: string;
    error_category?: string;
    recovery_suggestions?: string[];
    user_actionable?: boolean;
    [key: string]: any;
  };
}

export interface ResponseMetadata {
  confidence_score?: number;
  retrieval_time_ms?: number;
  source?: string;
  cached?: boolean;
  match_reasons?: string[];
  tool_name?: string;
  request_id?: string;
  performance_tier?: PerformanceTier;
  cache_strategy?: CacheStrategy;
  validation_score?: number;
  optimization_applied?: string[];
  timestamp?: string;
  [key: string]: any;
}

export interface RestResponse {
  success: boolean;
  data?: any;
  error?: ErrorDetails;
  metadata?: ResponseMetadata;
}

// ============================================================================
// Request Transformation Functions
// ============================================================================

/**
 * Transform REST API request to MCP tool parameters with enhanced validation and optimization
 * Now includes comprehensive input validation, sanitization, and performance optimization hints
 */
export function transformRestRequest(
  toolName: string,
  requestBody: any,
  context?: { requestId?: string; userAgent?: string; cacheHint?: boolean; endpoint?: string }
): MCPToolRequest {
  const startTime = performance.now();

  try {
    // Validate and sanitize request body
    const sanitizedBody = sanitizeRequestBody(requestBody, toolName);
    const validationResult = validateToolRequest(sanitizedBody, toolName);

    if (!validationResult.isValid) {
      throw new Error(
        `Request validation failed for ${toolName}: ${validationResult.errors.join(', ')}`
      );
    }

    // Add enhanced context metadata to request
    const baseRequest = {
      ...sanitizedBody,
      _metadata: {
        tool_name: toolName,
        request_id: context?.requestId || generateTransformId(),
        user_agent: context?.userAgent || undefined,
        cache_preferred: context?.cacheHint !== false,
        transform_time_ms: 0, // Will be updated below
        validation_passed: true,
        endpoint: context?.endpoint || undefined,
      },
    };

    let transformedRequest: MCPToolRequest;

    switch (toolName) {
      case 'search_knowledge_base':
        transformedRequest = transformSearchKnowledgeBaseRequest(baseRequest);
        break;

      case 'search_runbooks':
        transformedRequest = transformSearchRunbooksRequest(baseRequest);
        break;

      case 'get_decision_tree':
        transformedRequest = transformDecisionTreeRequest(baseRequest);
        break;

      case 'get_procedure':
        transformedRequest = transformProcedureRequest(baseRequest);
        break;

      case 'get_escalation_path':
        transformedRequest = transformEscalationRequest(baseRequest);
        break;

      case 'list_sources':
        transformedRequest = transformListSourcesRequest(baseRequest);
        break;

      case 'record_resolution_feedback':
        transformedRequest = transformFeedbackRequest(baseRequest);
        break;

      default:
        logger.warn('Unknown tool name for request transformation', { toolName });
        transformedRequest = baseRequest;
    }

    // Update transformation time
    const transformTime = performance.now() - startTime;
    if (transformedRequest._metadata) {
      transformedRequest._metadata.transform_time_ms = Math.round(transformTime);
    }

    logger.debug('Request transformation completed', {
      toolName,
      transformTime: Math.round(transformTime),
      requestSize: JSON.stringify(requestBody).length,
      transformedSize: JSON.stringify(transformedRequest).length,
    });

    return transformedRequest;
  } catch (error) {
    const transformTime = performance.now() - startTime;

    logger.error('Request transformation failed', {
      toolName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: JSON.stringify(requestBody).substring(0, 200),
      transformTime: Math.round(transformTime),
    });

    throw new Error(
      `Failed to transform request for tool: ${toolName} - ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Transform search knowledge base request with query optimization
 */
function transformSearchKnowledgeBaseRequest(body: any): MCPToolRequest {
  // Enhanced validation and optimization for knowledge base search
  const query = body.query?.trim();
  if (!query || query.length < 2) {
    throw new Error('Query must be at least 2 characters long and contain meaningful content');
  }

  if (query.length > 500) {
    throw new Error('Query too long - maximum 500 characters allowed');
  }

  // Advanced query analysis with security checks
  const queryMetrics = analyzeQuery(query);
  if (queryMetrics.suspiciousPatterns.length > 0) {
    logger.warn('Suspicious query patterns detected', {
      patterns: queryMetrics.suspiciousPatterns,
      query: query.substring(0, 50),
    });
  }

  // Intelligent result limiting based on complexity and user context
  const maxResults = calculateOptimalResultLimit(
    body.max_results,
    queryMetrics,
    body._metadata?.user_agent
  );

  // Enhanced category validation
  const validatedCategories = validateCategories(body.categories);

  return {
    query: sanitizeQuery(query),
    categories: validatedCategories,
    max_age_days: validateMaxAge(body.max_age_days),
    max_results: maxResults,
    _performance_hints: {
      query_complexity: queryMetrics.complexity,
      suggested_cache_ttl: determineSearchCacheTTL(queryMetrics, validatedCategories),
      parallel_search: queryMetrics.terms.length > 3 && queryMetrics.complexity < 0.8,
      // index_hint: queryMetrics.indexOptimizable ? 'primary' : 'secondary',
      // priority_boost: queryMetrics.businessCritical ? 1.5 : 1.0
    },
    _metadata: body._metadata,
  };
}

/**
 * Transform search runbooks request with intelligent filtering
 */
function transformSearchRunbooksRequest(body: any): MCPToolRequest {
  // Enhanced validation for critical runbook searches
  const requiredFields = ['alert_type', 'severity', 'affected_systems'];
  const missingFields = requiredFields.filter(field => !body[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields for runbook search: ${missingFields.join(', ')}`);
  }

  // Validate and normalize alert type with known patterns
  const alertType = validateAlertType(body.alert_type);

  // Validate severity level
  const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
  if (!validSeverities.includes(body.severity)) {
    throw new Error(`Invalid severity level. Must be one of: ${validSeverities.join(', ')}`);
  }

  // Enhanced system normalization with validation
  const affectedSystems = normalizeAndValidateSystems(body.affected_systems);

  if (affectedSystems.length === 0) {
    throw new Error('At least one valid affected system must be specified');
  }

  // Enhanced caching strategy based on multiple factors
  const cachePriority = determineCachePriority(body.severity, alertType, affectedSystems);
  const urgencyScore = calculateUrgencyScore(body.severity, alertType, body.context);

  return {
    alert_type: alertType,
    severity: body.severity,
    affected_systems: affectedSystems,
    context: {
      ...sanitizeContext(body.context),
      normalized_systems: affectedSystems,
      search_timestamp: new Date().toISOString(),
      urgency_score: urgencyScore,
      business_impact: assessBusinessImpact(body.severity, affectedSystems),
    },
    _performance_hints: {
      cache_priority: cachePriority,
      urgency_multiplier: urgencyScore >= 0.8 ? 2.0 : urgencyScore >= 0.6 ? 1.5 : 1.0,
      suggested_timeout_ms:
        body.severity === 'critical' ? 3000 : body.severity === 'high' ? 5000 : 10000,
      // parallel_lookup: affectedSystems.length > 1,
      // priority_queue: body.severity === 'critical' || urgencyScore >= 0.8
    },
    _metadata: {
      ...body._metadata,
      validation_enhanced: true,
      risk_score: calculateRiskScore(body.severity, alertType, affectedSystems),
    },
  };
}

/**
 * Transform decision tree request
 */
function transformDecisionTreeRequest(body: any): MCPToolRequest {
  return {
    alert_context: body.alert_context,
    current_agent_state: body.current_agent_state || undefined,
  };
}

/**
 * Transform procedure request
 */
function transformProcedureRequest(body: any): MCPToolRequest {
  return {
    runbook_id: body.runbook_id,
    step_name: body.step_name,
    current_context: body.current_context || {},
  };
}

/**
 * Transform escalation request
 */
function transformEscalationRequest(body: any): MCPToolRequest {
  return {
    severity: body.severity,
    business_hours: body.business_hours,
    failed_attempts: body.failed_attempts || [],
  };
}

/**
 * Transform list sources request
 */
function transformListSourcesRequest(body: any): MCPToolRequest {
  return {
    include_health: body.include_health !== false,
  };
}

/**
 * Transform feedback request
 */
function transformFeedbackRequest(body: any): MCPToolRequest {
  return {
    runbook_id: body.runbook_id,
    procedure_id: body.procedure_id,
    outcome: body.outcome,
    resolution_time_minutes: body.resolution_time_minutes,
    notes: body.notes || undefined,
  };
}

// ============================================================================
// Response Transformation Functions
// ============================================================================

/**
 * Transform MCP tool response to REST API format with advanced error handling and performance analysis
 */
export function transformMCPResponse(
  mcpResult: CallToolResult,
  context?: { toolName?: string; requestId?: string; startTime?: number }
): RestResponse {
  const transformStartTime = performance.now();

  try {
    // Handle error responses with context-aware error mapping
    if (mcpResult.isError) {
      return transformMCPError(mcpResult, context);
    }

    // Extract content from MCP response
    const content = extractMCPContent(mcpResult);

    if (!content) {
      return createAdvancedErrorResponse(
        'INVALID_MCP_RESPONSE',
        'MCP response contained no readable content',
        'high',
        context?.toolName,
        {
          mcp_result_structure: Object.keys(mcpResult),
          content_array_length: mcpResult.content?.length || 0,
        }
      );
    }

    // Parse JSON content with enhanced error handling
    let parsedContent: any;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        logger.warn('MCP response JSON parsing failed, treating as plain text', {
          toolName: context?.toolName,
          contentLength: content.length,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        });
        parsedContent = { message: content, _raw_content: true };
      }
    } else {
      parsedContent = content;
    }

    // Add performance metadata
    const totalTime = context?.startTime ? performance.now() - context.startTime : undefined;
    const transformTime = performance.now() - transformStartTime;

    // Transform successful response with enhanced metadata
    const enhancedContext = {
      ...(context?.toolName && { toolName: context.toolName }),
      ...(context?.requestId && { requestId: context.requestId }),
      ...(totalTime && { totalExecutionTime: totalTime }),
      transformTime,
    };
    const response = transformSuccessfulMCPResponse(parsedContent, enhancedContext);

    return response;
  } catch (error) {
    const transformTime = performance.now() - transformStartTime;

    logger.error('MCP response transformation failed', {
      toolName: context?.toolName,
      requestId: context?.requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      mcpResult: JSON.stringify(mcpResult).substring(0, 500),
      transformTime: Math.round(transformTime),
    });

    return createAdvancedErrorResponse(
      'RESPONSE_TRANSFORMATION_ERROR',
      'Failed to transform MCP response',
      'critical',
      context?.toolName,
      {
        error: error instanceof Error ? error.message : String(error),
        transform_time_ms: Math.round(transformTime),
      }
    );
  }
}

/**
 * Extract text content from MCP CallToolResult
 */
function extractMCPContent(mcpResult: CallToolResult): string | null {
  if (!mcpResult.content || !Array.isArray(mcpResult.content)) {
    return null;
  }

  // Find the first text content
  for (const item of mcpResult.content) {
    if (item.type === 'text' && 'text' in item) {
      return (item as TextContent).text;
    }
  }

  return null;
}

/**
 * Transform MCP error response with intelligent error categorization and recovery hints
 */
function transformMCPError(
  mcpResult: CallToolResult,
  context?: { toolName?: string; requestId?: string }
): RestResponse {
  const content = extractMCPContent(mcpResult);

  let errorInfo: any = {
    code: 'MCP_TOOL_ERROR',
    message: 'MCP tool execution failed',
    severity: 'medium' as const,
  };

  if (content) {
    try {
      const parsedError = JSON.parse(content);

      if (parsedError.message) {
        errorInfo.message = parsedError.message;
      }
      if (parsedError.code) {
        errorInfo.code = parsedError.code;
      }

      // Categorize error severity and add recovery hints
      const errorCategory = categorizeError(parsedError, context?.toolName);
      errorInfo.severity = errorCategory.severity;
      errorInfo.retry_after_ms = errorCategory.retryAfter;
      errorInfo.context = {
        tool_name: context?.toolName,
        error_category: errorCategory.category,
        recovery_suggestions: errorCategory.suggestions,
      };

      errorInfo.details = {
        ...parsedError,
        original_error: true,
      };
    } catch (parseError) {
      errorInfo.message = content;
      errorInfo.severity = 'low';
      errorInfo.context = {
        tool_name: context?.toolName,
        parse_error: true,
        raw_content_length: content.length,
      };
    }
  }

  return {
    success: false,
    error: errorInfo,
    metadata: {
      ...(context?.requestId && { request_id: context.requestId }),
      ...(context?.toolName && { tool_name: context.toolName }),
      error_timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Transform successful MCP response to REST format with performance analysis and caching hints
 */
function transformSuccessfulMCPResponse(
  content: any,
  context?: {
    toolName?: string;
    requestId?: string;
    totalExecutionTime?: number;
    transformTime?: number;
  }
): RestResponse {
  // Ensure we have a success field
  const isSuccess = content.success !== false;

  if (!isSuccess) {
    return createAdvancedErrorResponse(
      content.error?.code || 'OPERATION_FAILED',
      content.error?.message || content.message || 'Operation failed',
      'medium',
      context?.toolName,
      content.error?.details || content
    );
  }

  // Route to tool-specific transformations based on tool name
  if (context?.toolName) {
    switch (context.toolName) {
      case 'search_runbooks':
        return transformRunbookSearchResponse(content);
      case 'search_knowledge_base':
        return transformSearchResultsResponse(content);
      case 'get_procedure':
        return transformProcedureResponse(content);
      case 'get_escalation_path':
        return transformEscalationResponse(content);
      case 'get_decision_tree':
      case 'list_sources':
      case 'record_resolution_feedback':
      default:
        // Fall through to generic transformation for tools without specific handlers
        break;
    }
  }

  // Use generic transformation for tools without specific handlers
  return createGenericMCPResponse(content, context);
}

/**
 * Generic transformation function that doesn't route to tool-specific handlers
 * Used by tool-specific transformations to avoid infinite recursion
 */
function createGenericMCPResponse(
  content: any,
  context?: {
    toolName?: string;
    requestId?: string;
    totalExecutionTime?: number;
    transformTime?: number;
  }
): RestResponse {
  // Extract and enhance metadata
  const metadata: any = {
    ...(context?.toolName && { tool_name: context.toolName }),
    ...(context?.requestId && { request_id: context.requestId }),
  };

  // Standard metadata fields
  if (content.retrieval_time_ms !== undefined) {
    metadata.retrieval_time_ms = content.retrieval_time_ms;
  }
  if (context?.totalExecutionTime) {
    metadata.total_execution_time_ms = Math.round(context.totalExecutionTime);
  }
  if (context?.transformTime) {
    metadata.transform_time_ms = Math.round(context.transformTime);
  }
  if (content.timestamp) {
    metadata.timestamp = content.timestamp;
  }
  if (content.confidence_score !== undefined) {
    metadata.confidence_score = content.confidence_score;
  }
  if (content.source) {
    metadata.source = content.source;
  }
  if (content.cached !== undefined) {
    metadata.cached = content.cached;
  }
  if (content.match_reasons) {
    metadata.match_reasons = content.match_reasons;
  }

  // Add performance tier analysis
  if (metadata.retrieval_time_ms !== undefined) {
    metadata.performance_tier =
      metadata.retrieval_time_ms < 200
        ? 'fast'
        : metadata.retrieval_time_ms < 1000
          ? 'medium'
          : 'slow';
  }

  // Add caching strategy recommendations
  if (context?.toolName) {
    metadata.cache_strategy = determineCacheStrategy(
      context.toolName,
      content,
      metadata.retrieval_time_ms
    );
  }

  // Create data object without metadata fields
  const data = { ...content };
  const metadataFields = [
    'success',
    'retrieval_time_ms',
    'timestamp',
    'confidence_score',
    'source',
    'cached',
    'match_reasons',
    '_metadata',
    '_performance_hints',
  ];

  metadataFields.forEach(field => delete data[field]);

  return {
    success: true,
    data,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

// ============================================================================
// Tool-Specific Response Transformations
// ============================================================================

/**
 * Transform runbook search response
 */
export function transformRunbookSearchResponse(content: any): RestResponse {
  // Always return a consistent data structure
  const runbooks = content?.runbooks || [];
  const total_results = content?.total_results || runbooks.length;
  const confidence_scores =
    content?.confidence_scores || runbooks.map((r: any) => r.metadata?.confidence_score || 0);

  // Enhance runbook data with REST-specific formatting
  const enhancedRunbooks = runbooks.map((runbook: any) => ({
    ...runbook,
    // Add REST-specific fields
    url: `/api/runbooks/${runbook.id}`,
    procedures_url: runbook.procedures?.map(
      (p: any) => `/api/procedures/${runbook.id}_${p.name || p.id}`
    ),
  }));

  const finalData = {
    runbooks: enhancedRunbooks,
    total_results,
    confidence_scores,
  };

  return {
    success: true,
    data: finalData,
    metadata: {},
  };
}

/**
 * Transform search results response
 */
export function transformSearchResultsResponse(content: any): RestResponse {
  // Transform actual search results from MCP tool
  if (!content || typeof content !== 'object') {
    return {
      success: false,
      data: {
        results: [],
        total_results: 0,
        confidence_scores: [],
      },
      metadata: {
        error: 'Invalid content received from search tool',
      },
    };
  }

  // Extract results from MCP response
  const results = content.results || [];
  const totalResults = content.total_results || results.length || 0;
  const retrievalTime = content.retrieval_time_ms || 0;

  // Extract confidence scores from results
  const confidenceScores = results.map((result: any) => result.confidence_score || 0);
  const avgConfidence =
    confidenceScores.length > 0
      ? confidenceScores.reduce((sum: number, score: number) => sum + score, 0) /
        confidenceScores.length
      : 0;

  return {
    success: true,
    data: {
      results: results,
      total_results: totalResults,
      confidence_scores: confidenceScores,
      search_info: {
        total_results: totalResults,
        returned_results: results.length,
        avg_confidence: Math.round(avgConfidence * 100) / 100,
        retrieval_time_ms: retrievalTime,
      },
    },
    metadata: {
      search_info: {
        total_results: totalResults,
        returned_results: results.length,
        avg_confidence: Math.round(avgConfidence * 100) / 100,
      },
    },
  };
}

/**
 * Transform procedure response
 */
export function transformProcedureResponse(content: any): RestResponse {
  const response = createGenericMCPResponse(content);

  if (response.success && response.data?.procedure) {
    // Add REST-specific fields to procedure
    response.data.procedure = {
      ...response.data.procedure,
      execution_url: `/api/procedures/${response.data.procedure.id}/execute`,
      runbook_url: response.data.procedure.runbook_id
        ? `/api/runbooks/${response.data.procedure.runbook_id}`
        : undefined,
    };

    // Add related procedures with URLs
    if (response.data.related_steps) {
      response.data.related_steps = response.data.related_steps.map((step: any) => ({
        ...step,
        url: `/api/procedures/${step.id}`,
      }));
    }
  }

  return response;
}

/**
 * Transform escalation response
 */
export function transformEscalationResponse(content: any): RestResponse {
  const response = createGenericMCPResponse(content);

  if (response.success && response.data?.escalation_contacts) {
    // Add contact formatting for REST API
    response.data.escalation_contacts = response.data.escalation_contacts.map((contact: any) => ({
      ...contact,
      // Add structured contact info
      contact_methods: parseContactMethods(contact.contact),
      escalation_order: response.data.escalation_contacts.indexOf(contact) + 1,
    }));

    // Add escalation metadata
    response.metadata = {
      ...response.metadata,
      escalation_info: {
        total_contacts: response.data.escalation_contacts.length,
        estimated_response_time: response.data.estimated_response_time,
        escalation_trigger: response.data.escalation_procedure,
      },
    };
  }

  return response;
}

// ============================================================================
// Enhanced Validation and Sanitization Functions
// ============================================================================

/**
 * Generate unique transform ID for tracking
 */
function generateTransformId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Sanitize request body to prevent injection attacks
 */
function sanitizeRequestBody(body: any, toolName: string): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };

  // Remove potentially dangerous fields
  const dangerousFields = ['__proto__', 'constructor', 'prototype'];
  dangerousFields.forEach(field => {
    if (field in sanitized) {
      delete sanitized[field];
      logger.warn('Removed dangerous field from request', { field, toolName });
    }
  });

  // Sanitize string fields
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]);
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    }
  });

  return sanitized;
}

/**
 * Sanitize individual string values
 */
function sanitizeString(str: string): string {
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate tool-specific request structure
 */
function validateToolRequest(
  body: any,
  toolName: string
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (toolName) {
    case 'search_knowledge_base':
      if (!body.query || typeof body.query !== 'string') {
        errors.push('Query field is required and must be a string');
      }
      if (
        body.max_results &&
        (typeof body.max_results !== 'number' || body.max_results < 1 || body.max_results > 100)
      ) {
        errors.push('max_results must be a number between 1 and 100');
      }
      break;

    case 'search_runbooks':
      if (!body.alert_type || typeof body.alert_type !== 'string') {
        errors.push('alert_type is required and must be a string');
      }
      if (!body.severity || typeof body.severity !== 'string') {
        errors.push('severity is required and must be a string');
      }
      if (
        !body.affected_systems ||
        (!Array.isArray(body.affected_systems) && typeof body.affected_systems !== 'string')
      ) {
        errors.push('affected_systems is required and must be an array or string');
      }
      break;

    case 'get_escalation_path':
      if (!body.severity || typeof body.severity !== 'string') {
        errors.push('severity is required and must be a string');
      }
      if (body.business_hours === undefined || typeof body.business_hours !== 'boolean') {
        errors.push('business_hours is required and must be a boolean');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize query string for search operations
 */
function sanitizeQuery(query: string): string {
  return query
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Validate and normalize categories
 */
function validateCategories(categories: any): string[] | undefined {
  if (!categories) return undefined;

  const categoryArray = Array.isArray(categories) ? categories : [categories];
  const validCategories = categoryArray
    .filter((cat: any) => typeof cat === 'string' && cat.trim().length > 0)
    .map((cat: string) => cat.trim().toLowerCase())
    .slice(0, 10); // Limit to 10 categories

  return validCategories.length > 0 ? validCategories : undefined;
}

/**
 * Validate max age parameter
 */
function validateMaxAge(maxAge: any): number | undefined {
  if (maxAge === undefined) return undefined;

  const age = typeof maxAge === 'string' ? parseInt(maxAge) : maxAge;
  if (typeof age === 'number' && age > 0 && age <= 3650) {
    // Max 10 years
    return age;
  }

  logger.warn('Invalid max_age_days value, ignoring', { maxAge });
  return undefined;
}

/**
 * Calculate optimal result limit based on query complexity and context
 */
function calculateOptimalResultLimit(
  requestedLimit: any,
  queryMetrics: any,
  userAgent?: string
): number {
  let baseLimit = 10;

  if (typeof requestedLimit === 'number' && requestedLimit > 0) {
    baseLimit = Math.min(requestedLimit, 100); // Cap at 100
  }

  // Adjust based on query complexity
  if (queryMetrics.complexity > 0.8) {
    baseLimit = Math.min(baseLimit, 5); // Limit complex queries
  } else if (queryMetrics.complexity < 0.3) {
    baseLimit = Math.min(baseLimit * 2, 50); // Allow more results for simple queries
  }

  // Adjust for mobile users (basic heuristic)
  if (userAgent && (userAgent.includes('Mobile') || userAgent.includes('Android'))) {
    baseLimit = Math.min(baseLimit, 20);
  }

  return baseLimit;
}

/**
 * Determine cache TTL for search operations
 */
function determineSearchCacheTTL(queryMetrics: any, categories?: string[]): number {
  let baseTTL = 1800; // 30 minutes default

  // Simple queries can be cached longer
  if (queryMetrics.complexity < 0.3) {
    baseTTL = 3600; // 1 hour
  }

  // Category-specific adjustments
  if (categories && categories.includes('runbook')) {
    baseTTL = 7200; // 2 hours for runbooks
  }

  // Reduce TTL for very complex queries
  if (queryMetrics.complexity > 0.8) {
    baseTTL = 900; // 15 minutes
  }

  return baseTTL;
}

/**
 * Validate and normalize alert type
 */
function validateAlertType(alertType: any): string {
  if (typeof alertType !== 'string') {
    throw new Error('Alert type must be a string');
  }

  const normalized = alertType.trim().toLowerCase();

  // Known alert type patterns
  const knownPatterns = [
    'memory_pressure',
    'disk_full',
    'cpu_high',
    'service_down',
    'network_error',
    'database_error',
    'authentication_failure',
    'security_breach',
    'performance_degradation',
  ];

  // Allow unknown alert types but log them for monitoring
  if (!knownPatterns.some(pattern => normalized.includes(pattern))) {
    logger.info('Unknown alert type pattern detected', { alertType: normalized });
  }

  return normalized;
}

/**
 * Normalize and validate affected systems
 */
function normalizeAndValidateSystems(systems: any): string[] {
  if (!systems) return [];

  const systemArray = Array.isArray(systems) ? systems : [systems];
  const validSystems = systemArray
    .filter((system: any) => typeof system === 'string' && system.trim().length > 0)
    .map((system: string) => system.trim().toLowerCase())
    .filter((system: string) => system.length <= 50) // Reasonable length limit
    .slice(0, 20); // Limit to 20 systems

  return [...new Set(validSystems)]; // Remove duplicates
}

/**
 * Determine cache priority based on multiple factors
 */
function determineCachePriority(
  severity: string,
  alertType: string,
  affectedSystems: string[]
): 'high' | 'medium' | 'standard' {
  if (severity === 'critical') return 'high';
  if (
    severity === 'high' &&
    (alertType.includes('service_down') || affectedSystems.includes('production'))
  ) {
    return 'high';
  }
  if (severity === 'high') return 'medium';
  return 'standard';
}

/**
 * Calculate urgency score (0-1) based on multiple factors
 */
function calculateUrgencyScore(severity: string, alertType: string, context?: any): number {
  let score = 0;

  // Base score from severity
  const severityScores: Record<string, number> = {
    critical: 1.0,
    high: 0.8,
    medium: 0.5,
    low: 0.3,
    info: 0.1,
  };

  score = severityScores[severity] || 0.5;

  // Adjust for alert type
  const highUrgencyTypes = ['service_down', 'security_breach', 'data_loss'];
  if (highUrgencyTypes.some(type => alertType.includes(type))) {
    score = Math.min(score + 0.2, 1.0);
  }

  // Adjust for business hours (if provided in context)
  if (context?.business_hours === false) {
    score = Math.max(score - 0.1, 0);
  }

  return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Sanitize context object
 */
function sanitizeContext(context: any): any {
  if (!context || typeof context !== 'object') {
    return {};
  }

  const sanitized = { ...context };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });

  return sanitized;
}

/**
 * Assess business impact based on severity and affected systems
 */
function assessBusinessImpact(
  severity: string,
  affectedSystems: string[]
): 'critical' | 'high' | 'medium' | 'low' {
  const criticalSystems = ['production', 'database', 'payment', 'auth', 'api'];
  const hasCriticalSystems = affectedSystems.some(system =>
    criticalSystems.some(critical => system.includes(critical))
  );

  if (severity === 'critical' && hasCriticalSystems) return 'critical';
  if (severity === 'critical' || (severity === 'high' && hasCriticalSystems)) return 'high';
  if (severity === 'high' || severity === 'medium') return 'medium';
  return 'low';
}

/**
 * Calculate risk score based on multiple factors
 */
function calculateRiskScore(
  severity: string,
  alertType: string,
  affectedSystems: string[]
): number {
  let score = 0;

  // Severity contribution (0-40 points)
  const severityPoints: Record<string, number> = {
    critical: 40,
    high: 30,
    medium: 20,
    low: 10,
    info: 5,
  };
  score += severityPoints[severity] || 20;

  // Alert type contribution (0-30 points)
  const highRiskTypes = ['security_breach', 'data_loss', 'service_down'];
  if (highRiskTypes.some(type => alertType.includes(type))) {
    score += 30;
  } else if (alertType.includes('error') || alertType.includes('failure')) {
    score += 20;
  } else {
    score += 10;
  }

  // Affected systems contribution (0-30 points)
  const criticalSystems = ['production', 'database', 'payment', 'auth'];
  const criticalCount = affectedSystems.filter(system =>
    criticalSystems.some(critical => system.includes(critical))
  ).length;

  score += Math.min(criticalCount * 10, 30);

  return Math.min(score, 100); // Cap at 100
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse contact information into structured format
 */
function parseContactMethods(contact: string): any {
  const methods: any = {};

  if (contact.includes('@')) {
    methods.email = contact;
  }

  if (contact.match(/\+?[\d\s\-\(\)]+/)) {
    methods.phone = contact;
  }

  if (contact.includes('slack:') || contact.includes('#')) {
    methods.slack = contact;
  }

  return methods;
}

/**
 * Validate MCP response structure
 */
export function validateMCPResponse(mcpResult: CallToolResult): boolean {
  try {
    if (!mcpResult || typeof mcpResult !== 'object') {
      return false;
    }

    if (!mcpResult.content || !Array.isArray(mcpResult.content)) {
      return false;
    }

    // Check if at least one content item is readable
    return mcpResult.content.some(
      item => item.type === 'text' && 'text' in item && typeof item.text === 'string'
    );
  } catch (error) {
    logger.error('MCP response validation failed', { error });
    return false;
  }
}

/**
 * Sanitize response data for security
 */
export function sanitizeResponseData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Remove potentially sensitive fields
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeResponseData(value);
    }
  }

  return sanitized;
}

// ============================================================================
// Advanced Error Handling and Performance Analysis Utilities
// ============================================================================

/**
 * Create advanced error response with categorization and recovery hints
 */
function createAdvancedErrorResponse(
  code: string,
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  toolName?: string,
  details?: any
): RestResponse {
  const errorCategory = categorizeError({ code, message }, toolName);

  return {
    success: false,
    error: {
      code,
      message,
      severity,
      retry_after_ms: errorCategory.retryAfter,
      context: {
        ...(toolName && { tool_name: toolName }),
        error_category: errorCategory.category,
        recovery_suggestions: errorCategory.suggestions,
      },
      details,
    },
    metadata: {
      error_timestamp: new Date().toISOString(),
      ...(toolName && { tool_name: toolName }),
    },
  };
}

/**
 * Categorize error type and provide recovery suggestions
 */
function categorizeError(
  error: any,
  toolName?: string
): {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryAfter: number;
  suggestions: string[];
} {
  const code = error.code || '';
  const message = error.message || '';

  // Network and connectivity errors
  if (code.includes('TIMEOUT') || message.includes('timeout')) {
    return {
      category: 'timeout',
      severity: 'medium',
      retryAfter: 2000,
      suggestions: [
        'Retry the request with a longer timeout',
        'Check source adapter connectivity',
        'Consider using cached results if available',
      ],
    };
  }

  // Validation errors
  if (code.includes('VALIDATION') || message.includes('validation')) {
    return {
      category: 'validation',
      severity: 'low',
      retryAfter: 0,
      suggestions: [
        'Check request parameters and format',
        'Ensure all required fields are provided',
        'Validate data types and constraints',
      ],
    };
  }

  // Source adapter errors
  if (code.includes('SOURCE') || message.includes('adapter')) {
    return {
      category: 'source_adapter',
      severity: 'high',
      retryAfter: 5000,
      suggestions: [
        'Check source adapter health status',
        'Verify source configuration and credentials',
        'Try alternative sources if available',
      ],
    };
  }

  // Cache errors
  if (code.includes('CACHE') || message.includes('cache')) {
    return {
      category: 'cache',
      severity: 'low',
      retryAfter: 1000,
      suggestions: [
        'Request will proceed without cache',
        'Check cache service health',
        'Consider clearing cache if persistent',
      ],
    };
  }

  // Tool-specific errors
  if (toolName) {
    const toolCategory = getToolErrorCategory(toolName, error);
    if (toolCategory) {
      return toolCategory;
    }
  }

  // Default error category
  return {
    category: 'unknown',
    severity: 'medium',
    retryAfter: 1000,
    suggestions: [
      'Retry the request after a short delay',
      'Check server logs for more details',
      'Contact support if problem persists',
    ],
  };
}

/**
 * Get tool-specific error categorization
 */
function getToolErrorCategory(
  toolName: string,
  _error: any
): {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryAfter: number;
  suggestions: string[];
} | null {
  switch (toolName) {
    case 'search_runbooks':
      return {
        category: 'runbook_search',
        severity: 'high', // Runbooks are critical for incident response
        retryAfter: 1000,
        suggestions: [
          'Try with broader search criteria',
          'Check if alert type is correctly specified',
          'Verify affected systems are properly formatted',
        ],
      };

    case 'get_escalation_path':
      return {
        category: 'escalation',
        severity: 'critical', // Escalation paths are critical
        retryAfter: 500,
        suggestions: [
          'Use default escalation procedures',
          'Contact on-call engineer directly',
          'Check business hours setting',
        ],
      };

    case 'search_knowledge_base':
      return {
        category: 'knowledge_search',
        severity: 'medium',
        retryAfter: 2000,
        suggestions: [
          'Try with different keywords',
          'Reduce the scope of the search',
          'Check spelling and terminology',
        ],
      };

    default:
      return null;
  }
}

/**
 * Enhanced query analysis for performance optimization and security
 */
function analyzeQuery(query: string): {
  complexity: number;
  terms: string[];
  patterns: string[];
  suspiciousPatterns: string[];
  indexOptimizable: boolean;
  businessCritical: boolean;
} {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2);
  const patterns = [];
  const suspiciousPatterns = [];

  // Check for complex patterns
  if (query.includes('"')) patterns.push('quoted_phrases');
  if (query.includes('*') || query.includes('?')) patterns.push('wildcards');
  if (query.includes('AND') || query.includes('OR')) patterns.push('boolean_operators');
  if (/[a-zA-Z]+:\S+/.test(query)) patterns.push('field_searches');

  // Security pattern detection
  if (/<script|javascript:|on\w+=/i.test(query)) {
    suspiciousPatterns.push('script_injection');
  }
  if (/\.\.\//g.test(query)) {
    suspiciousPatterns.push('path_traversal');
  }
  if (/union\s+select|drop\s+table|insert\s+into/i.test(query)) {
    suspiciousPatterns.push('sql_injection');
  }

  // Calculate complexity score (0-1)
  let complexity = 0;
  complexity += Math.min(terms.length / 10, 0.4); // Term count factor
  complexity += patterns.length * 0.15; // Pattern complexity
  complexity += query.length > 100 ? 0.2 : 0; // Length factor
  complexity += suspiciousPatterns.length * 0.1; // Security penalty

  // Determine if query is optimizable for indexing
  const indexOptimizable = terms.length <= 5 && patterns.length <= 2 && query.length <= 100;

  // Check for business-critical terms
  const criticalTerms = ['critical', 'emergency', 'production', 'outage', 'down', 'failure'];
  const businessCritical = criticalTerms.some(term => query.toLowerCase().includes(term));

  return {
    complexity: Math.min(complexity, 1),
    terms,
    patterns,
    suspiciousPatterns,
    indexOptimizable,
    businessCritical,
  };
}

/**
 * Determine optimal caching strategy based on tool and content
 */
function determineCacheStrategy(toolName: string, content: any, retrievalTime?: number): string {
  // High-priority caching for critical tools
  if (toolName === 'search_runbooks' || toolName === 'get_escalation_path') {
    return 'high_priority';
  }

  // Performance-based caching
  if (retrievalTime && retrievalTime > 1000) {
    return 'performance_cache';
  }

  // Content-based caching
  if (content.confidence_score && content.confidence_score > 0.8) {
    return 'high_confidence';
  }

  // Default strategy
  return 'standard';
}
