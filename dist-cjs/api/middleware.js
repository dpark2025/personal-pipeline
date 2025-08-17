"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
exports.handleAsyncRoute = handleAsyncRoute;
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
exports.performanceMonitoring = performanceMonitoring;
exports.securityHeaders = securityHeaders;
exports.requestSizeLimiter = requestSizeLimiter;
exports.globalErrorHandler = globalErrorHandler;
const logger_js_1 = require("../utils/logger.js");
const performance_js_1 = require("../utils/performance.js");
const perf_hooks_1 = require("perf_hooks");
const correlation_js_1 = require("./correlation.js");
const index_js_1 = require("../types/index.js");
function getErrorStatusCode(error) {
    if (error instanceof index_js_1.ValidationError) {
        return 400;
    }
    if (error instanceof index_js_1.SourceError) {
        return 502;
    }
    if (error instanceof index_js_1.PPError) {
        return error.statusCode;
    }
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (errorMessage.includes('validation') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('missing required') ||
        errorMessage.includes('bad request') ||
        errorMessage.includes('malformed')) {
        return 400;
    }
    if (errorMessage.includes('not found')) {
        return 404;
    }
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('unavailable') ||
        errorMessage.includes('service down')) {
        return 503;
    }
    return 500;
}
function validateRequest(schema) {
    return (req, res, next) => {
        try {
            const validationResult = validateObject(req.body, schema);
            if (!validationResult.valid) {
                logger_js_1.logger.warn('Request validation failed', {
                    path: req.path,
                    method: req.method,
                    errors: validationResult.errors,
                    body: JSON.stringify(req.body).substring(0, 200),
                    correlation_id: (0, correlation_js_1.getCorrelationId)(req),
                });
                res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Request validation failed', {
                    validation_errors: validationResult.errors,
                    received_fields: Object.keys(req.body || {}),
                }, req));
                return;
            }
            req.body = validationResult.data;
            next();
        }
        catch (error) {
            logger_js_1.logger.error('Request validation error', {
                path: req.path,
                method: req.method,
                error: error instanceof Error ? error.message : String(error),
                correlation_id: (0, correlation_js_1.getCorrelationId)(req),
            });
            res
                .status(400)
                .json(createErrorResponse('VALIDATION_ERROR', 'Request validation failed due to internal error', {}, req));
        }
    };
}
function validateObject(obj, schema) {
    const errors = [];
    const result = {};
    if (schema.required) {
        for (const field of schema.required) {
            if (obj[field] === undefined || obj[field] === null) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
        const value = obj[fieldName];
        if (value === undefined || value === null) {
            if (!fieldSchema.optional && schema.required?.includes(fieldName)) {
                continue;
            }
            if (fieldSchema.default !== undefined) {
                result[fieldName] = fieldSchema.default;
            }
            continue;
        }
        const typeValid = validateType(value, fieldSchema);
        if (!typeValid.valid) {
            errors.push(`Field '${fieldName}': ${typeValid.error}`);
            continue;
        }
        result[fieldName] = typeValid.value;
    }
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
        ...(errors.length > 0 && { errors }),
    };
}
function validateType(value, schema) {
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
                    if (lowerValue === 'true')
                        return { valid: true, value: true };
                    if (lowerValue === 'false')
                        return { valid: true, value: false };
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
    }
    catch (error) {
        return { valid: false, error: 'Validation error occurred' };
    }
}
function handleAsyncRoute(handler) {
    return (req, res, next) => {
        const startTime = perf_hooks_1.performance.now();
        const correlationId = (0, correlation_js_1.getCorrelationId)(req);
        logger_js_1.logger.info('REST API request started', {
            method: req.method,
            path: req.path,
            correlation_id: correlationId,
            user_agent: req.get('User-Agent'),
            content_length: req.get('Content-Length'),
        });
        Promise.resolve(handler(req, res, next))
            .catch(error => {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            logger_js_1.logger.error('REST API request failed', {
                method: req.method,
                path: req.path,
                correlation_id: correlationId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                execution_time_ms: Math.round(executionTime),
            });
            const performanceMonitor = (0, performance_js_1.getPerformanceMonitor)();
            performanceMonitor.recordToolExecution(`REST_${req.method}_${req.path}`, executionTime, true);
            if (!res.headersSent) {
                const statusCode = getErrorStatusCode(error);
                res.status(statusCode).json(createErrorResponse(statusCode === 400
                    ? 'BAD_REQUEST'
                    : statusCode === 404
                        ? 'NOT_FOUND'
                        : statusCode === 503
                            ? 'SERVICE_UNAVAILABLE'
                            : 'INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'An unexpected error occurred', {
                    execution_time_ms: Math.round(executionTime),
                }, req));
            }
        })
            .finally(() => {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            if (!res.headersSent || res.statusCode < 500) {
                const performanceMonitor = (0, performance_js_1.getPerformanceMonitor)();
                performanceMonitor.recordToolExecution(`REST_${req.method}_${req.path}`, executionTime, res.statusCode >= 400);
            }
            logger_js_1.logger.info('REST API request completed', {
                method: req.method,
                path: req.path,
                correlation_id: correlationId,
                status_code: res.statusCode,
                execution_time_ms: Math.round(executionTime),
            });
        });
    };
}
function createSuccessResponse(data, metadata = {}, req) {
    const baseMetadata = {
        timestamp: new Date().toISOString(),
        ...metadata,
    };
    if (req) {
        baseMetadata.correlation_id = (0, correlation_js_1.getCorrelationId)(req);
    }
    return {
        success: true,
        data,
        metadata: baseMetadata,
        timestamp: new Date().toISOString(),
    };
}
function createErrorResponse(code, message, details = {}, req) {
    const baseDetails = {
        timestamp: new Date().toISOString(),
        ...details,
    };
    if (req) {
        baseDetails.correlation_id = (0, correlation_js_1.getCorrelationId)(req);
    }
    return {
        success: false,
        error: {
            code,
            message,
            details: baseDetails,
        },
        metadata: {
            ...baseDetails,
        },
        timestamp: new Date().toISOString(),
    };
}
function performanceMonitoring() {
    return (req, res, next) => {
        const startTime = perf_hooks_1.performance.now();
        const correlationId = (0, correlation_js_1.getCorrelationId)(req);
        const requestMetrics = {
            method: req.method,
            path: req.path,
            contentLength: parseInt(req.get('Content-Length') || '0'),
            userAgent: req.get('User-Agent'),
            acceptsCompression: req.acceptsEncodings(['gzip', 'deflate']),
            queryComplexity: analyzeRequestComplexity(req),
        };
        const originalJson = res.json;
        res.json = function (body) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            const performanceMonitor = (0, performance_js_1.getPerformanceMonitor)();
            const responseSize = JSON.stringify(body).length;
            res.setHeader('X-Response-Time', `${Math.round(executionTime)}ms`);
            res.setHeader('X-Performance-Tier', getPerformanceTier(executionTime, req.path));
            res.setHeader('X-Correlation-ID', correlationId);
            if (executionTime > 1000) {
                res.setHeader('X-Cache-Hint', 'recommended');
            }
            if (responseSize > 10000 && requestMetrics.acceptsCompression) {
                res.setHeader('X-Compression-Recommended', 'true');
            }
            performanceMonitor.recordToolExecution(`REST_${req.method}_${req.path}`, executionTime, res.statusCode >= 400);
            const performanceData = {
                ...requestMetrics,
                correlation_id: correlationId,
                status_code: res.statusCode,
                execution_time_ms: Math.round(executionTime),
                response_size_bytes: responseSize,
                performance_tier: getPerformanceTier(executionTime, requestMetrics.path),
                optimization_opportunities: identifyOptimizationOpportunities(executionTime, responseSize, requestMetrics),
            };
            logger_js_1.logger.info('REST API performance analysis', performanceData);
            if (body && typeof body === 'object' && body.metadata) {
                body.metadata = {
                    ...body.metadata,
                    performance_analysis: {
                        execution_time_ms: Math.round(executionTime),
                        performance_tier: performanceData.performance_tier,
                        response_size_bytes: responseSize,
                        optimization_score: calculateOptimizationScore(performanceData),
                    },
                };
            }
            return originalJson.call(this, body);
        };
        next();
    };
}
function securityHeaders() {
    return (req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        const correlationId = (0, correlation_js_1.getCorrelationId)(req);
        res.setHeader('X-Correlation-ID', correlationId);
        next();
    };
}
function requestSizeLimiter(maxSizeMB = 10) {
    return (req, res, next) => {
        const contentLength = parseInt(req.get('Content-Length') || '0');
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (contentLength > maxSizeBytes) {
            logger_js_1.logger.warn('Request size limit exceeded', {
                path: req.path,
                method: req.method,
                content_length: contentLength,
                max_size_bytes: maxSizeBytes,
                correlation_id: (0, correlation_js_1.getCorrelationId)(req),
            });
            res.status(413).json(createErrorResponse('REQUEST_TOO_LARGE', `Request size exceeds limit of ${maxSizeMB}MB`, {
                content_length: contentLength,
                max_size_bytes: maxSizeBytes,
            }, req));
            return;
        }
        next();
    };
}
function analyzeRequestComplexity(req) {
    const factors = [];
    let score = 0;
    if (req.path.includes('/search')) {
        score += 0.3;
        factors.push('search_operation');
    }
    if (req.path.includes('/runbooks')) {
        score += 0.2;
        factors.push('runbook_lookup');
    }
    if (req.body) {
        const bodySize = JSON.stringify(req.body).length;
        if (bodySize > 1000) {
            score += 0.2;
            factors.push('large_request_body');
        }
        if (req.body.query && req.body.query.length > 50) {
            score += 0.2;
            factors.push('complex_query');
        }
        if (req.body.affected_systems && req.body.affected_systems.length > 5) {
            score += 0.1;
            factors.push('multiple_systems');
        }
    }
    const queryKeys = Object.keys(req.query || {});
    if (queryKeys.length > 3) {
        score += 0.1;
        factors.push('multiple_query_params');
    }
    const estimatedTime = Math.min(score * 2000, 5000);
    return {
        score: Math.min(score, 1),
        factors,
        estimated_time_ms: estimatedTime,
    };
}
function getPerformanceTier(executionTime, path) {
    const thresholds = getEndpointThresholds(path);
    if (executionTime < thresholds.excellent)
        return 'excellent';
    if (executionTime < thresholds.good)
        return 'good';
    if (executionTime < thresholds.acceptable)
        return 'acceptable';
    if (executionTime < thresholds.slow)
        return 'slow';
    return 'critical';
}
function getEndpointThresholds(path) {
    if (path?.includes('/runbooks') || path?.includes('/escalation')) {
        return {
            excellent: 150,
            good: 300,
            acceptable: 500,
            slow: 1000,
        };
    }
    if (path?.includes('/search')) {
        return {
            excellent: 200,
            good: 500,
            acceptable: 1000,
            slow: 2000,
        };
    }
    if (path?.includes('/decision-tree') || path?.includes('/procedures')) {
        return {
            excellent: 250,
            good: 600,
            acceptable: 1200,
            slow: 2500,
        };
    }
    if (path?.includes('/sources') || path?.includes('/health') || path?.includes('/performance')) {
        return {
            excellent: 100,
            good: 250,
            acceptable: 500,
            slow: 1000,
        };
    }
    return {
        excellent: 200,
        good: 500,
        acceptable: 1000,
        slow: 2000,
    };
}
function identifyOptimizationOpportunities(executionTime, responseSize, requestMetrics) {
    const opportunities = [];
    const path = requestMetrics.path;
    const method = requestMetrics.method;
    if (executionTime > 1000) {
        opportunities.push('enable_caching');
    }
    if (responseSize > 50000) {
        opportunities.push('implement_compression');
        if (responseSize > 100000) {
            opportunities.push('consider_pagination');
        }
    }
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
    if (requestMetrics.contentLength > 10000) {
        opportunities.push('validate_request_size');
        if (requestMetrics.contentLength > 50000) {
            opportunities.push('implement_request_streaming');
        }
    }
    if (method === 'POST' && executionTime > 800) {
        opportunities.push('optimize_post_processing');
    }
    if (method === 'GET' && executionTime > 300) {
        opportunities.push('implement_get_caching');
    }
    if (requestMetrics.userAgent?.includes('Mobile')) {
        if (responseSize > 25000) {
            opportunities.push('optimize_mobile_payload');
        }
        if (executionTime > 800) {
            opportunities.push('implement_mobile_specific_caching');
        }
    }
    if (requestMetrics.queryComplexity?.factors?.includes('multiple_query_params')) {
        opportunities.push('batch_parameter_processing');
    }
    return opportunities;
}
function calculateOptimizationScore(performanceData) {
    let score = 100;
    if (performanceData.execution_time_ms > 200) {
        score -= Math.min(30, (performanceData.execution_time_ms - 200) / 50);
    }
    if (performanceData.response_size_bytes > 10000 && !performanceData.acceptsCompression) {
        score -= 20;
    }
    if (performanceData.queryComplexity?.score > 0.7) {
        score -= 15;
    }
    if (performanceData.execution_time_ms < 200) {
        score += 5;
    }
    return Math.max(0, Math.min(100, Math.round(score)));
}
function globalErrorHandler() {
    return (error, req, res, _next) => {
        const correlationId = (0, correlation_js_1.getCorrelationId)(req);
        logger_js_1.logger.error('Unhandled API error', {
            method: req.method,
            path: req.path,
            correlation_id: correlationId,
            error: error.message,
            stack: error.stack,
        });
        if (!res.headersSent) {
            const statusCode = getErrorStatusCode(error);
            res
                .status(statusCode)
                .json(createErrorResponse(statusCode === 400
                ? 'BAD_REQUEST'
                : statusCode === 404
                    ? 'NOT_FOUND'
                    : statusCode === 503
                        ? 'SERVICE_UNAVAILABLE'
                        : 'INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'An unexpected error occurred', {}, req));
        }
    };
}
