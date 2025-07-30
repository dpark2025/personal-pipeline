/**
 * REST API Middleware
 * 
 * Provides request validation, error handling, performance monitoring,
 * and response formatting middleware for the REST API endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { getPerformanceMonitor } from '../utils/performance.js';
import { performance } from 'perf_hooks';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ValidationSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    enum?: string[];
    items?: { type: string };
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    minItems?: number;
    maxItems?: number;
    additionalProperties?: boolean;
    optional?: boolean;
    default?: any;
  }>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    execution_time_ms?: number;
    timestamp?: string;
    request_id?: string;
    [key: string]: any;
  };
  timestamp: string;
}

export interface AsyncRouteHandler {
  (req: Request, res: Response, next: NextFunction): Promise<void>;
}

// ============================================================================
// Request Validation Middleware
// ============================================================================

/**
 * Validates request body against a JSON schema
 */
export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validationResult = validateObject(req.body, schema);
      
      if (!validationResult.valid) {
        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors: validationResult.errors,
          body: JSON.stringify(req.body).substring(0, 200)
        });

        res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'Request validation failed',
          { 
            validation_errors: validationResult.errors,
            received_fields: Object.keys(req.body || {})
          }
        ));
        return;
      }

      // Set defaults and transform validated data
      req.body = validationResult.data;
      next();

    } catch (error) {
      logger.error('Request validation error', {
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json(createErrorResponse(
        'VALIDATION_ERROR',
        'Request validation failed due to internal error'
      ));
    }
  };
}

/**
 * Validates an object against a schema
 */
function validateObject(obj: any, schema: ValidationSchema): {
  valid: boolean;
  data?: any;
  errors?: string[];
} {
  const errors: string[] = [];
  const result: any = {};

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (obj[field] === undefined || obj[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Validate properties
  for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
    const value = obj[fieldName];
    
    // Handle optional fields
    if (value === undefined || value === null) {
      if (!fieldSchema.optional && schema.required?.includes(fieldName)) {
        continue; // Already handled in required check
      }
      
      // Set default value if provided
      if (fieldSchema.default !== undefined) {
        result[fieldName] = fieldSchema.default;
      }
      continue;
    }

    // Type validation
    const typeValid = validateType(value, fieldSchema);
    if (!typeValid.valid) {
      errors.push(`Field '${fieldName}': ${typeValid.error}`);
      continue;
    }

    result[fieldName] = typeValid.value;
  }

  // Check for unexpected fields if not allowed
  if (!schema.additionalProperties) {
    const allowedFields = Object.keys(schema.properties);
    const providedFields = Object.keys(obj || {});
    const unexpectedFields = providedFields.filter(f => !allowedFields.includes(f));
    
    if (unexpectedFields.length > 0) {
      errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    data: result,
    ...(errors.length > 0 && { errors })
  };
}

/**
 * Validates a value against a field schema
 */
function validateType(value: any, schema: any): {
  valid: boolean;
  value?: any;
  error?: string;
} {
  try {
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Must be a string' };
        }
        
        if (schema.minLength && value.length < schema.minLength) {
          return { valid: false, error: `Must be at least ${schema.minLength} characters` };
        }
        
        if (schema.maxLength && value.length > schema.maxLength) {
          return { valid: false, error: `Must be at most ${schema.maxLength} characters` };
        }
        
        if (schema.enum && !schema.enum.includes(value)) {
          return { valid: false, error: `Must be one of: ${schema.enum.join(', ')}` };
        }
        
        return { valid: true, value };

      case 'number':
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof num !== 'number' || isNaN(num)) {
          return { valid: false, error: 'Must be a number' };
        }
        
        if (schema.minimum !== undefined && num < schema.minimum) {
          return { valid: false, error: `Must be at least ${schema.minimum}` };
        }
        
        if (schema.maximum !== undefined && num > schema.maximum) {
          return { valid: false, error: `Must be at most ${schema.maximum}` };
        }
        
        return { valid: true, value: num };

      case 'boolean':
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue === 'true') return { valid: true, value: true };
          if (lowerValue === 'false') return { valid: true, value: false };
        }
        
        if (typeof value !== 'boolean') {
          return { valid: false, error: 'Must be a boolean' };
        }
        
        return { valid: true, value };

      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, error: 'Must be an array' };
        }
        
        if (schema.minItems && value.length < schema.minItems) {
          return { valid: false, error: `Must have at least ${schema.minItems} items` };
        }
        
        if (schema.maxItems && value.length > schema.maxItems) {
          return { valid: false, error: `Must have at most ${schema.maxItems} items` };
        }
        
        // Validate array items if schema provided
        if (schema.items) {
          const validatedItems = [];
          for (let i = 0; i < value.length; i++) {
            const itemValidation = validateType(value[i], schema.items);
            if (!itemValidation.valid) {
              return { valid: false, error: `Item ${i}: ${itemValidation.error}` };
            }
            validatedItems.push(itemValidation.value);
          }
          return { valid: true, value: validatedItems };
        }
        
        return { valid: true, value };

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return { valid: false, error: 'Must be an object' };
        }
        
        return { valid: true, value };

      default:
        return { valid: false, error: `Unknown type: ${schema.type}` };
    }
  } catch (error) {
    return { valid: false, error: 'Validation error occurred' };
  }
}

// ============================================================================
// Async Route Handler Wrapper
// ============================================================================

/**
 * Wraps async route handlers to catch and handle errors properly
 */
export function handleAsyncRoute(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = generateRequestId();
    const startTime = performance.now();
    
    // Add request ID for tracking
    req.headers['x-request-id'] = requestId;
    
    logger.info('REST API request started', {
      method: req.method,
      path: req.path,
      request_id: requestId,
      user_agent: req.get('User-Agent'),
      content_length: req.get('Content-Length')
    });

    // Execute the handler and catch any errors
    Promise.resolve(handler(req, res, next))
      .catch((error) => {
        const executionTime = performance.now() - startTime;
        
        logger.error('REST API request failed', {
          method: req.method,
          path: req.path,
          request_id: requestId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          execution_time_ms: Math.round(executionTime)
        });

        // Record performance metrics
        const performanceMonitor = getPerformanceMonitor();
        performanceMonitor.recordToolExecution(`REST_${req.method}_${req.path}`, executionTime, true);

        // Only send response if not already sent
        if (!res.headersSent) {
          res.status(500).json(createErrorResponse(
            'INTERNAL_SERVER_ERROR',
            'An unexpected error occurred',
            { 
              request_id: requestId,
              execution_time_ms: Math.round(executionTime)
            }
          ));
        }
      })
      .finally(() => {
        const executionTime = performance.now() - startTime;
        
        // Record successful requests
        if (!res.headersSent || res.statusCode < 500) {
          const performanceMonitor = getPerformanceMonitor();
          performanceMonitor.recordToolExecution(
            `REST_${req.method}_${req.path}`, 
            executionTime, 
            res.statusCode >= 400
          );
        }

        logger.info('REST API request completed', {
          method: req.method,
          path: req.path,
          request_id: requestId,
          status_code: res.statusCode,
          execution_time_ms: Math.round(executionTime)
        });
      });
  };
}

// ============================================================================
// Response Helper Functions
// ============================================================================

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T, 
  metadata: Record<string, any> = {}
): APIResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details: Record<string, any> = {}
): APIResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    metadata: {
      timestamp: new Date().toISOString(),
      ...details
    },
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// Performance Monitoring Middleware
// ============================================================================

/**
 * Enhanced middleware to monitor API performance with intelligent optimization
 */
export function performanceMonitoring() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = performance.now();
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    
    // Track request characteristics for optimization
    const requestMetrics = {
      method: req.method,
      path: req.path,
      contentLength: parseInt(req.get('Content-Length') || '0'),
      userAgent: req.get('User-Agent'),
      acceptsCompression: req.acceptsEncodings(['gzip', 'deflate']),
      queryComplexity: analyzeRequestComplexity(req)
    };
    
    // Override res.json to capture response details and add performance headers
    const originalJson = res.json;
    res.json = function(body: any) {
      const executionTime = performance.now() - startTime;
      const performanceMonitor = getPerformanceMonitor();
      const responseSize = JSON.stringify(body).length;
      
      // Add performance headers
      res.setHeader('X-Response-Time', `${Math.round(executionTime)}ms`);
      res.setHeader('X-Performance-Tier', getPerformanceTier(executionTime, req.path));
      res.setHeader('X-Request-ID', requestId);
      
      // Add caching hints based on performance
      if (executionTime > 1000) {
        res.setHeader('X-Cache-Hint', 'recommended');
      }
      
      // Compression recommendations
      if (responseSize > 10000 && requestMetrics.acceptsCompression) {
        res.setHeader('X-Compression-Recommended', 'true');
      }
      
      // Record enhanced performance metrics
      performanceMonitor.recordToolExecution(
        `REST_${req.method}_${req.path}`,
        executionTime,
        res.statusCode >= 400
      );

      // Enhanced performance logging with optimization hints
      const performanceData = {
        ...requestMetrics,
        request_id: requestId,
        status_code: res.statusCode,
        execution_time_ms: Math.round(executionTime),
        response_size_bytes: responseSize,
        performance_tier: getPerformanceTier(executionTime, requestMetrics.path),
        optimization_opportunities: identifyOptimizationOpportunities(
          executionTime, 
          responseSize, 
          requestMetrics
        )
      };
      
      logger.info('REST API performance analysis', performanceData);
      
      // Add performance metadata to response body if it's a success response
      if (body && typeof body === 'object' && body.metadata) {
        body.metadata = {
          ...body.metadata,
          performance_analysis: {
            execution_time_ms: Math.round(executionTime),
            performance_tier: performanceData.performance_tier,
            response_size_bytes: responseSize,
            optimization_score: calculateOptimizationScore(performanceData)
          }
        };
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

// ============================================================================
// Security and Rate Limiting Middleware
// ============================================================================

/**
 * Basic security headers middleware
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add request ID if not present
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = generateRequestId();
    }

    next();
  };
}

/**
 * Request size limiting middleware
 */
export function requestSizeLimiter(maxSizeMB: number = 10) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (contentLength > maxSizeBytes) {
      logger.warn('Request size limit exceeded', {
        path: req.path,
        method: req.method,
        content_length: contentLength,
        max_size_bytes: maxSizeBytes
      });

      res.status(413).json(createErrorResponse(
        'REQUEST_TOO_LARGE',
        `Request size exceeds limit of ${maxSizeMB}MB`,
        { 
          content_length: contentLength,
          max_size_bytes: maxSizeBytes
        }
      ));
      return;
    }

    next();
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Analyze request complexity for performance optimization
 */
function analyzeRequestComplexity(req: Request): {
  score: number;
  factors: string[];
  estimated_time_ms: number;
} {
  const factors = [];
  let score = 0;
  
  // URL complexity
  if (req.path.includes('/search')) {
    score += 0.3;
    factors.push('search_operation');
  }
  
  if (req.path.includes('/runbooks')) {
    score += 0.2;
    factors.push('runbook_lookup');
  }
  
  // Body complexity
  if (req.body) {
    const bodySize = JSON.stringify(req.body).length;
    if (bodySize > 1000) {
      score += 0.2;
      factors.push('large_request_body');
    }
    
    // Search query complexity
    if (req.body.query && req.body.query.length > 50) {
      score += 0.2;
      factors.push('complex_query');
    }
    
    // Array parameters
    if (req.body.affected_systems && req.body.affected_systems.length > 5) {
      score += 0.1;
      factors.push('multiple_systems');
    }
  }
  
  // Query parameters
  const queryKeys = Object.keys(req.query || {});
  if (queryKeys.length > 3) {
    score += 0.1;
    factors.push('multiple_query_params');
  }
  
  const estimatedTime = Math.min(score * 2000, 5000); // Cap at 5 seconds
  
  return {
    score: Math.min(score, 1),
    factors,
    estimated_time_ms: estimatedTime
  };
}

/**
 * Get performance tier based on execution time with endpoint-specific thresholds
 */
function getPerformanceTier(executionTime: number, path?: string): string {
  // Define endpoint-specific performance thresholds
  const thresholds = getEndpointThresholds(path);
  
  if (executionTime < thresholds.excellent) return 'excellent';
  if (executionTime < thresholds.good) return 'good';
  if (executionTime < thresholds.acceptable) return 'acceptable';
  if (executionTime < thresholds.slow) return 'slow';
  return 'critical';
}

/**
 * Get endpoint-specific performance thresholds
 */
function getEndpointThresholds(path?: string): {
  excellent: number;
  good: number;
  acceptable: number;
  slow: number;
} {
  // Critical incident response endpoints have stricter thresholds
  if (path?.includes('/runbooks') || path?.includes('/escalation')) {
    return {
      excellent: 150,  // 150ms for critical operations
      good: 300,      // 300ms
      acceptable: 500, // 500ms
      slow: 1000      // 1000ms
    };
  }
  
  // Search endpoints
  if (path?.includes('/search')) {
    return {
      excellent: 200,
      good: 500,
      acceptable: 1000,
      slow: 2000
    };
  }
  
  // Decision tree and procedure endpoints
  if (path?.includes('/decision-tree') || path?.includes('/procedures')) {
    return {
      excellent: 250,
      good: 600,
      acceptable: 1200,
      slow: 2500
    };
  }
  
  // Administrative endpoints (sources, health, performance)
  if (path?.includes('/sources') || path?.includes('/health') || path?.includes('/performance')) {
    return {
      excellent: 100,
      good: 250,
      acceptable: 500,
      slow: 1000
    };
  }
  
  // Default thresholds
  return {
    excellent: 200,
    good: 500,
    acceptable: 1000,
    slow: 2000
  };
}

/**
 * Identify optimization opportunities based on performance metrics with endpoint-specific analysis
 */
function identifyOptimizationOpportunities(
  executionTime: number,
  responseSize: number,
  requestMetrics: any
): string[] {
  const opportunities = [];
  const path = requestMetrics.path;
  const method = requestMetrics.method;
  
  // General performance optimizations
  if (executionTime > 1000) {
    opportunities.push('enable_caching');
  }
  
  if (responseSize > 50000) {
    opportunities.push('implement_compression');
    if (responseSize > 100000) {
      opportunities.push('consider_pagination');
    }
  }
  
  // Endpoint-specific optimizations
  if (path.includes('/runbooks')) {
    if (executionTime > 300) {
      opportunities.push('critical_endpoint_slow_response');
      opportunities.push('implement_runbook_indexing');
    }
    if (responseSize > 20000) {
      opportunities.push('optimize_runbook_payload_size');
    }
  }
  
  if (path.includes('/search')) {
    if (executionTime > 500) {
      opportunities.push('implement_search_indexing');
      opportunities.push('optimize_search_algorithm');
    }
    if (requestMetrics.queryComplexity?.score > 0.7) {
      opportunities.push('optimize_query_complexity');
      opportunities.push('implement_query_preprocessing');
    }
  }
  
  if (path.includes('/escalation')) {
    if (executionTime > 200) {
      opportunities.push('critical_escalation_path_slow');
      opportunities.push('cache_escalation_contacts');
    }
  }
  
  if (path.includes('/decision-tree')) {
    if (executionTime > 400) {
      opportunities.push('optimize_decision_logic');
      opportunities.push('precompute_decision_paths');
    }
  }
  
  // Request size optimizations
  if (requestMetrics.contentLength > 10000) {
    opportunities.push('validate_request_size');
    if (requestMetrics.contentLength > 50000) {
      opportunities.push('implement_request_streaming');
    }
  }
  
  // Method-specific optimizations
  if (method === 'POST' && executionTime > 800) {
    opportunities.push('optimize_post_processing');
  }
  
  if (method === 'GET' && executionTime > 300) {
    opportunities.push('implement_get_caching');
  }
  
  // User agent specific optimizations
  if (requestMetrics.userAgent && requestMetrics.userAgent.includes('Mobile')) {
    if (responseSize > 25000) {
      opportunities.push('optimize_mobile_payload');
    }
    if (executionTime > 800) {
      opportunities.push('implement_mobile_specific_caching');
    }
  }
  
  // Concurrent request optimization
  if (requestMetrics.queryComplexity?.factors?.includes('multiple_query_params')) {
    opportunities.push('batch_parameter_processing');
  }
  
  return opportunities;
}

/**
 * Calculate optimization score (0-100)
 */
function calculateOptimizationScore(performanceData: any): number {
  let score = 100;
  
  // Deduct points for slow response times
  if (performanceData.execution_time_ms > 200) {
    score -= Math.min(30, (performanceData.execution_time_ms - 200) / 50);
  }
  
  // Deduct points for large responses without compression
  if (performanceData.response_size_bytes > 10000 && !performanceData.acceptsCompression) {
    score -= 20;
  }
  
  // Deduct points for complex queries without optimization
  if (performanceData.queryComplexity?.score > 0.7) {
    score -= 15;
  }
  
  // Bonus points for good practices
  if (performanceData.execution_time_ms < 200) {
    score += 5;
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Global error handler for unhandled API errors
 */
export function globalErrorHandler() {
  return (error: any, req: Request, res: Response, _next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    
    logger.error('Unhandled API error', {
      method: req.method,
      path: req.path,
      request_id: requestId,
      error: error.message,
      stack: error.stack
    });

    // Only send response if not already sent
    if (!res.headersSent) {
      res.status(500).json(createErrorResponse(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred',
        { request_id: requestId }
      ));
    }
  };
}