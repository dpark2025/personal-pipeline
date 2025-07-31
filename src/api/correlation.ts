/**
 * Correlation ID Generation and Tracking Middleware
 * 
 * Implements correlation ID generation for request tracking across
 * the entire REST API with proper propagation and logging integration.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

// Extend Express Request interface to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Generate a correlation ID with timestamp and randomness
 * Format: req_YYYYMMDD_HHMMSS_<random>
 */
export function generateCorrelationId(): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[-T:.Z]/g, '')
    .substring(0, 15); // YYYYMMDDHHMMSS
  
  const random = randomUUID()
    .split('-')[0]; // First 8 characters of UUID
  
  return `req_${timestamp}_${random}`;
}

/**
 * Middleware to add correlation ID to all requests
 * 
 * - Checks for existing X-Correlation-ID header
 * - Generates new ID if not present
 * - Adds to request object and response headers
 * - Integrates with Winston logger for structured logging
 */
export function correlationMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  // Check for existing correlation ID in headers
  let correlationId = req.get('X-Correlation-ID') || req.get('x-correlation-id');
  
  // Generate new ID if not provided
  if (!correlationId) {
    correlationId = generateCorrelationId();
  }
  
  // Validate correlation ID format (basic sanity check)
  if (typeof correlationId !== 'string' || correlationId.length > 100) {
    logger.warn('Invalid correlation ID received, generating new one', {
      originalId: correlationId,
      source: 'correlation-middleware'
    });
    correlationId = generateCorrelationId();
  }
  
  // Add to request object
  req.correlationId = correlationId;
  
  // Add to response headers for client tracking
  res.set('X-Correlation-ID', correlationId);
  
  // Add to logger context for structured logging
  logger.defaultMeta = {
    ...logger.defaultMeta,
    correlationId
  };
  
  // Log request initiation
  logger.info('Request initiated', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    correlationId
  });
  
  // Track request completion
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusClass = Math.floor(res.statusCode / 100);
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration_ms: duration,
      correlationId,
      success: statusClass === 2
    });
    
    // Clear correlation ID from logger context to prevent leakage
    if (logger.defaultMeta) {
      delete logger.defaultMeta.correlationId;
    }
  });
  
  res.on('error', (error) => {
    const duration = Date.now() - startTime;
    
    logger.error('Request failed with error', {
      method: req.method,
      path: req.path,
      error: error.message,
      duration_ms: duration,
      correlationId
    });
    
    // Clear correlation ID from logger context
    if (logger.defaultMeta) {
      delete logger.defaultMeta.correlationId;
    }
  });
  
  next();
}

/**
 * Enhanced error handler that ensures correlation ID is included in error responses
 */
export function correlationErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId = req.correlationId;
  
  // Log the error with correlation ID
  logger.error('Unhandled error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    correlationId
  });
  
  // Ensure correlation ID is in response
  if (correlationId) {
    res.set('X-Correlation-ID', correlationId);
  }
  
  // If response hasn't been sent, send error response
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: {
          correlation_id: correlationId,
          timestamp: new Date().toISOString(),
          recovery_actions: [
            'Retry the request',
            'Contact support with correlation ID if problem persists'
          ],
          retry_recommended: true
        }
      }
    });
  }
  
  // Clear correlation ID from logger context
  if (logger.defaultMeta) {
    delete logger.defaultMeta.correlationId;
  }
  
  next(error);
}

/**
 * Utility function to get correlation ID from request
 */
export function getCorrelationId(req: Request): string {
  return req.correlationId || 'unknown';
}

/**
 * Helper function to create response metadata with correlation ID
 */
export function createResponseMetadata(
  req: Request, 
  additionalMeta: Record<string, any> = {}
): Record<string, any> {
  return {
    correlation_id: getCorrelationId(req),
    timestamp: new Date().toISOString(),
    ...additionalMeta
  };
}

/**
 * Enhanced version of the existing createSuccessResponse to include correlation ID
 */
export function createSuccessResponseWithCorrelation(
  data: any,
  req: Request,
  metadata: Record<string, any> = {}
): any {
  return {
    success: true,
    data,
    metadata: createResponseMetadata(req, metadata)
  };
}

/**
 * Enhanced version of the existing createErrorResponse to include correlation ID
 */
export function createErrorResponseWithCorrelation(
  code: string,
  message: string,
  req: Request,
  details: Record<string, any> = {}
): any {
  return {
    success: false,
    error: {
      code,
      message,
      details: {
        ...details,
        correlation_id: getCorrelationId(req),
        timestamp: new Date().toISOString()
      }
    }
  };
}