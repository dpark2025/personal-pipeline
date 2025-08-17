"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCorrelationId = generateCorrelationId;
exports.correlationMiddleware = correlationMiddleware;
exports.correlationErrorHandler = correlationErrorHandler;
exports.getCorrelationId = getCorrelationId;
exports.createResponseMetadata = createResponseMetadata;
exports.createSuccessResponseWithCorrelation = createSuccessResponseWithCorrelation;
exports.createErrorResponseWithCorrelation = createErrorResponseWithCorrelation;
const crypto_1 = require("crypto");
const logger_js_1 = require("../utils/logger.js");
function generateCorrelationId() {
    const now = new Date();
    const timestamp = now
        .toISOString()
        .replace(/[-T:.Z]/g, '')
        .substring(0, 15);
    const random = (0, crypto_1.randomUUID)().split('-')[0];
    return `req_${timestamp}_${random}`;
}
function correlationMiddleware(req, res, next) {
    let correlationId = req.get('X-Correlation-ID') || req.get('x-correlation-id');
    if (!correlationId) {
        correlationId = generateCorrelationId();
    }
    if (typeof correlationId !== 'string' || correlationId.length > 100) {
        logger_js_1.logger.warn('Invalid correlation ID received, generating new one', {
            originalId: correlationId,
            source: 'correlation-middleware',
        });
        correlationId = generateCorrelationId();
    }
    req.correlationId = correlationId;
    res.set('X-Correlation-ID', correlationId);
    logger_js_1.logger.defaultMeta = {
        ...logger_js_1.logger.defaultMeta,
        correlationId,
    };
    logger_js_1.logger.info('Request initiated', {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        correlationId,
    });
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusClass = Math.floor(res.statusCode / 100);
        logger_js_1.logger.info('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration_ms: duration,
            correlationId,
            success: statusClass === 2,
        });
        if (logger_js_1.logger.defaultMeta) {
            delete logger_js_1.logger.defaultMeta.correlationId;
        }
    });
    res.on('error', error => {
        const duration = Date.now() - startTime;
        logger_js_1.logger.error('Request failed with error', {
            method: req.method,
            path: req.path,
            error: error.message,
            duration_ms: duration,
            correlationId,
        });
        if (logger_js_1.logger.defaultMeta) {
            delete logger_js_1.logger.defaultMeta.correlationId;
        }
    });
    next();
}
function correlationErrorHandler(error, req, res, next) {
    const correlationId = req.correlationId;
    logger_js_1.logger.error('Unhandled error occurred', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        correlationId,
    });
    if (correlationId) {
        res.set('X-Correlation-ID', correlationId);
    }
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
                        'Contact support with correlation ID if problem persists',
                    ],
                    retry_recommended: true,
                },
            },
        });
    }
    if (logger_js_1.logger.defaultMeta) {
        delete logger_js_1.logger.defaultMeta.correlationId;
    }
    next(error);
}
function getCorrelationId(req) {
    return req.correlationId || 'unknown';
}
function createResponseMetadata(req, additionalMeta = {}) {
    return {
        correlation_id: getCorrelationId(req),
        timestamp: new Date().toISOString(),
        ...additionalMeta,
    };
}
function createSuccessResponseWithCorrelation(data, req, metadata = {}) {
    return {
        success: true,
        data,
        metadata: createResponseMetadata(req, metadata),
    };
}
function createErrorResponseWithCorrelation(code, message, req, details = {}) {
    return {
        success: false,
        error: {
            code,
            message,
            details: {
                ...details,
                correlation_id: getCorrelationId(req),
                timestamp: new Date().toISOString(),
            },
        },
    };
}
