/**
 * Swagger UI Configuration for Personal Pipeline REST API
 *
 * Sets up interactive API documentation with comprehensive examples
 * and integrated correlation ID support for testing.
 */

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openAPISpec } from './openapi.js';
import { logger } from '../utils/logger.js';

/**
 * Create Swagger UI router with enhanced configuration
 */
export function createSwaggerRouter(): express.Router {
  const router = express.Router();

  // Custom CSS for improved styling
  const customCss = `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
    .swagger-ui .opblock-summary { padding: 15px; }
    .swagger-ui .parameter__name { font-weight: bold; }
    .swagger-ui .response-col_status { font-weight: bold; }
    .swagger-ui .btn.authorize { background-color: #3b82f6; border-color: #3b82f6; }
    .swagger-ui .btn.execute { background-color: #10b981; border-color: #10b981; }
    .swagger-ui .model { background-color: #f8fafc; }
    .swagger-ui .model-title { color: #1f2937; font-weight: bold; }
  `;

  // Swagger UI options with enhanced configuration
  const swaggerOptions = {
    customCss,
    customSiteTitle: 'Personal Pipeline API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
      showCommonExtensions: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      requestInterceptor: (request: any) => {
        // Add correlation ID to all test requests
        if (!request.headers['X-Correlation-ID']) {
          const correlationId = `docs_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          request.headers['X-Correlation-ID'] = correlationId;
        }

        // Log API testing activity
        logger.info('Swagger UI API test initiated', {
          method: request.method,
          url: request.url,
          correlation_id: request.headers['X-Correlation-ID'],
          source: 'swagger-ui',
        });

        return request;
      },
      responseInterceptor: (response: any) => {
        // Log API testing results
        logger.info('Swagger UI API test completed', {
          status: response.status,
          statusText: response.statusText,
          correlation_id: response.headers['x-correlation-id'],
          response_time: response.headers['x-response-time'],
          source: 'swagger-ui',
        });

        return response;
      },
    },
  };

  // Custom header HTML for testing instructions (used in Swagger options)
  // const customHeaderHtml = `
  //   <div style="background: #e0f2fe; border-left: 4px solid #0288d1; padding: 15px; margin: 20px 0; border-radius: 4px;">
  //     <h4 style="margin: 0 0 10px 0; color: #01579b;">🧪 Testing with Correlation IDs</h4>
  //     <p style="margin: 0; color: #0277bd;">
  //       All API requests automatically include correlation IDs for tracking.
  //       Check the response headers for <code>X-Correlation-ID</code> to trace your requests.
  //       For production integration, include <code>X-Correlation-ID</code> in your request headers.
  //     </p>
  //   </div>
  // `;

  // Serve Swagger UI with custom options
  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(openAPISpec, swaggerOptions));

  // Serve OpenAPI spec directly for programmatic access
  router.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');

    logger.info('OpenAPI specification requested', {
      user_agent: req.get('User-Agent'),
      referer: req.get('Referer'),
      ip: req.ip,
    });

    res.json(openAPISpec);
  });

  // Health check for documentation service
  router.get('/health', (req, res) => {
    const correlationId = req.get('X-Correlation-ID') || `health_${Date.now()}`;

    res.setHeader('X-Correlation-ID', correlationId);
    res.json({
      service: 'swagger-documentation',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      endpoints: {
        interactive_docs: '/api/docs/',
        openapi_spec: '/api/docs/openapi.json',
        health_check: '/api/docs/health',
      },
    });
  });

  // Add testing utilities endpoint
  router.get('/test-utils', (req, res) => {
    const correlationId = req.get('X-Correlation-ID') || `utils_${Date.now()}`;

    res.setHeader('X-Correlation-ID', correlationId);
    res.json({
      correlation_id_format: 'req_YYYYMMDD_HHMMSS_<random>',
      sample_correlation_id: `req_${new Date()
        .toISOString()
        .replace(/[-T:.Z]/g, '')
        .substring(0, 15)}_${Math.random().toString(36).substring(2, 9)}`,
      testing_tips: [
        'Include X-Correlation-ID header for request tracking',
        'Check X-Response-Time header for performance metrics',
        'Use /api/health for service status checks',
        'All errors include correlation IDs for support',
        'Rate limiting applies to all endpoints',
      ],
      example_headers: {
        'X-Correlation-ID': 'your-unique-tracking-id',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  });

  logger.info('Swagger UI router configured successfully', {
    endpoints: ['/api/docs/', '/api/docs/openapi.json', '/api/docs/health', '/api/docs/test-utils'],
    features: [
      'correlation_id_tracking',
      'request_interceptor',
      'response_logging',
      'custom_styling',
    ],
  });

  return router;
}

/**
 * Generate example correlation ID for documentation
 */
export function generateExampleCorrelationId(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .substring(0, 15);
  const random = Math.random().toString(36).substring(2, 9);
  return `req_${timestamp}_${random}`;
}

/**
 * Validate OpenAPI specification
 */
export function validateOpenAPISpec(): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  try {
    // Basic validation checks
    if (!openAPISpec.openapi) {
      errors.push('Missing OpenAPI version');
    }

    if (!openAPISpec.info || !openAPISpec.info.title) {
      errors.push('Missing API info or title');
    }

    if (!openAPISpec.paths || Object.keys(openAPISpec.paths).length === 0) {
      errors.push('No API paths defined');
    }

    // Check for required components
    if (!openAPISpec.components || !openAPISpec.components.schemas) {
      errors.push('Missing schema components');
    }

    // Validate path operations
    for (const [path, methods] of Object.entries(openAPISpec.paths)) {
      if (!methods || typeof methods !== 'object') {
        errors.push(`Invalid path definition: ${path}`);
        continue;
      }

      for (const [method, operation] of Object.entries(methods)) {
        if (typeof operation === 'object' && operation !== null && !Array.isArray(operation)) {
          const op = operation as any;
          if (!op.operationId) {
            errors.push(`Missing operationId for ${method.toUpperCase()} ${path}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      ...(errors.length > 0 && { errors }),
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

// Validate spec on module load
const validation = validateOpenAPISpec();
if (!validation.valid) {
  logger.error('OpenAPI specification validation failed', {
    errors: validation.errors,
  });
} else {
  logger.info('OpenAPI specification validated successfully', {
    paths_count: Object.keys(openAPISpec.paths).length,
    schemas_count: Object.keys(openAPISpec.components?.schemas || {}).length,
  });
}
