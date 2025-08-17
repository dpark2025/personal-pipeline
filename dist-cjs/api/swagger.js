"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSwaggerRouter = createSwaggerRouter;
exports.generateExampleCorrelationId = generateExampleCorrelationId;
exports.validateOpenAPISpec = validateOpenAPISpec;
const express_1 = __importDefault(require("express"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const openapi_js_1 = require("./openapi.js");
const logger_js_1 = require("../utils/logger.js");
function createSwaggerRouter() {
    const router = express_1.default.Router();
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
            requestInterceptor: (request) => {
                if (!request.headers['X-Correlation-ID']) {
                    const correlationId = `docs_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
                    request.headers['X-Correlation-ID'] = correlationId;
                }
                logger_js_1.logger.info('Swagger UI API test initiated', {
                    method: request.method,
                    url: request.url,
                    correlation_id: request.headers['X-Correlation-ID'],
                    source: 'swagger-ui',
                });
                return request;
            },
            responseInterceptor: (response) => {
                logger_js_1.logger.info('Swagger UI API test completed', {
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
    router.use('/', swagger_ui_express_1.default.serve);
    router.get('/', swagger_ui_express_1.default.setup(openapi_js_1.openAPISpec, swaggerOptions));
    router.get('/openapi.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');
        logger_js_1.logger.info('OpenAPI specification requested', {
            user_agent: req.get('User-Agent'),
            referer: req.get('Referer'),
            ip: req.ip,
        });
        res.json(openapi_js_1.openAPISpec);
    });
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
    logger_js_1.logger.info('Swagger UI router configured successfully', {
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
function generateExampleCorrelationId() {
    const timestamp = new Date()
        .toISOString()
        .replace(/[-T:.Z]/g, '')
        .substring(0, 15);
    const random = Math.random().toString(36).substring(2, 9);
    return `req_${timestamp}_${random}`;
}
function validateOpenAPISpec() {
    const errors = [];
    try {
        if (!openapi_js_1.openAPISpec.openapi) {
            errors.push('Missing OpenAPI version');
        }
        if (!openapi_js_1.openAPISpec.info?.title) {
            errors.push('Missing API info or title');
        }
        if (!openapi_js_1.openAPISpec.paths || Object.keys(openapi_js_1.openAPISpec.paths).length === 0) {
            errors.push('No API paths defined');
        }
        if (!openapi_js_1.openAPISpec.components?.schemas) {
            errors.push('Missing schema components');
        }
        for (const [path, methods] of Object.entries(openapi_js_1.openAPISpec.paths)) {
            if (!methods || typeof methods !== 'object') {
                errors.push(`Invalid path definition: ${path}`);
                continue;
            }
            for (const [method, operation] of Object.entries(methods)) {
                if (typeof operation === 'object' && operation !== null && !Array.isArray(operation)) {
                    const op = operation;
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
    }
    catch (error) {
        return {
            valid: false,
            errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
}
const validation = validateOpenAPISpec();
if (!validation.valid) {
    logger_js_1.logger.error('OpenAPI specification validation failed', {
        errors: validation.errors,
    });
}
else {
    logger_js_1.logger.info('OpenAPI specification validated successfully', {
        paths_count: Object.keys(openapi_js_1.openAPISpec.paths).length,
        schemas_count: Object.keys(openapi_js_1.openAPISpec.components?.schemas || {}).length,
    });
}
