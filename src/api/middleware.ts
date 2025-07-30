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
 * Middleware to monitor API performance and log metrics
 */
export function performanceMonitoring() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = performance.now();
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    
    // Override res.json to capture response details
    const originalJson = res.json;
    res.json = function(body: any) {
      const executionTime = performance.now() - startTime;
      const performanceMonitor = getPerformanceMonitor();
      
      // Record performance metrics
      performanceMonitor.recordToolExecution(
        `REST_${req.method}_${req.path}`,
        executionTime,
        res.statusCode >= 400
      );

      // Log performance metrics
      logger.info('REST API performance', {
        method: req.method,
        path: req.path,
        request_id: requestId,
        status_code: res.statusCode,
        execution_time_ms: Math.round(executionTime),
        response_size_bytes: JSON.stringify(body).length
      });

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