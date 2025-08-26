import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
export function generateCorrelationId() {
    const now = new Date();
    const timestamp = now
        .toISOString()
        .replace(/[-T:.Z]/g, '')
        .substring(0, 15);
    const random = randomUUID().split('-')[0];
    return `req_${timestamp}_${random}`;
}
export function correlationMiddleware(req, res, next) {
    let correlationId = req.get('X-Correlation-ID') || req.get('x-correlation-id');
    if (!correlationId) {
        correlationId = generateCorrelationId();
    }
    if (typeof correlationId !== 'string' || correlationId.length > 100) {
        logger.warn('Invalid correlation ID received, generating new one', {
            originalId: correlationId,
            source: 'correlation-middleware',
        });
        correlationId = generateCorrelationId();
    }
    req.correlationId = correlationId;
    res.set('X-Correlation-ID', correlationId);
    logger.defaultMeta = {
        ...logger.defaultMeta,
        correlationId,
    };
    logger.info('Request initiated', {
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
        logger.info('Request completed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration_ms: duration,
            correlationId,
            success: statusClass === 2,
        });
        if (logger.defaultMeta) {
            delete logger.defaultMeta.correlationId;
        }
    });
    res.on('error', error => {
        const duration = Date.now() - startTime;
        logger.error('Request failed with error', {
            method: req.method,
            path: req.path,
            error: error.message,
            duration_ms: duration,
            correlationId,
        });
        if (logger.defaultMeta) {
            delete logger.defaultMeta.correlationId;
        }
    });
    next();
}
export function correlationErrorHandler(error, req, res, next) {
    const correlationId = req.correlationId;
    logger.error('Unhandled error occurred', {
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
    if (logger.defaultMeta) {
        delete logger.defaultMeta.correlationId;
    }
    next(error);
}
export function getCorrelationId(req) {
    return req.correlationId || 'unknown';
}
export function createResponseMetadata(req, additionalMeta = {}) {
    return {
        correlation_id: getCorrelationId(req),
        timestamp: new Date().toISOString(),
        ...additionalMeta,
    };
}
export function createSuccessResponseWithCorrelation(data, req, metadata = {}) {
    return {
        success: true,
        data,
        metadata: createResponseMetadata(req, metadata),
    };
}
export function createErrorResponseWithCorrelation(code, message, req, details = {}) {
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
//# sourceMappingURL=correlation.js.map