"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAPIRoutes = createAPIRoutes;
const express_1 = __importDefault(require("express"));
const cache_js_1 = require("../utils/cache.js");
const logger_js_1 = require("../utils/logger.js");
const middleware_js_1 = require("./middleware.js");
const correlation_js_1 = require("./correlation.js");
const transforms_js_1 = require("./transforms.js");
const index_js_1 = require("../types/index.js");
const perf_hooks_1 = require("perf_hooks");
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
    if (errorMessage.includes('invalid') ||
        errorMessage.includes('validation') ||
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
function handleToolSpecificError(error, toolName, context) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT');
    const isValidationError = errorMessage.includes('validation') || errorMessage.includes('required');
    let errorDetails = {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        severity: 'medium',
        httpStatus: 500,
        recoveryActions: ['Retry the request', 'Contact support if problem persists'],
        retryRecommended: true,
    };
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
            if (isValidationError) {
                errorDetails = {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    severity: 'low',
                    httpStatus: 400,
                    recoveryActions: ['Check request format and required fields', 'Verify data types'],
                    retryRecommended: false,
                };
            }
            else if (isTimeoutError) {
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
    if (context.executionTime && context.executionTime > 10000) {
        errorDetails.recoveryActions.unshift('Consider simplifying the request for better performance');
    }
    return errorDetails;
}
function handleSearchKnowledgeBaseError(_error, errorMessage, _context) {
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
function handleSearchRunbooksError(_error, errorMessage, context) {
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
function handleEscalationPathError(_error, _errorMessage, _context) {
    return {
        code: 'ESCALATION_PATH_ERROR',
        message: 'Failed to retrieve escalation procedures',
        severity: 'critical',
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
function handleDecisionTreeError(_error, _errorMessage, _context) {
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
function handleProcedureError(_error, errorMessage, _context) {
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
function createAPIRoutes(options) {
    const router = express_1.default.Router();
    const { mcpTools, sourceRegistry, cacheService } = options;
    router.post('/search', (0, middleware_js_1.validateRequest)({
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
    }), (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        try {
            const categories = req.body.categories || [];
            const isRunbookSearch = categories.includes('runbooks') && categories.length === 1;
            let toolName = 'search_knowledge_base';
            let transformedBody = req.body;
            if (isRunbookSearch) {
                toolName = 'search_runbooks';
                transformedBody = {
                    alert_type: req.body.query.replace(/\s+/g, '_').toLowerCase(),
                    severity: 'medium',
                    affected_systems: ['system'],
                    context: {
                        original_query: req.body.query,
                        max_results: req.body.max_results,
                        smart_routed: true,
                    },
                };
                logger_js_1.logger.info('Smart routing: redirecting to search_runbooks', {
                    original_query: req.body.query,
                    transformed_alert_type: transformedBody.alert_type,
                    categories,
                });
            }
            const requestId = req.headers['x-request-id'];
            const userAgent = req.get('User-Agent');
            const mcpRequest = (0, transforms_js_1.transformRestRequest)(toolName, transformedBody, {
                ...(requestId && { requestId }),
                ...(userAgent && { userAgent }),
                cacheHint: req.query.cache !== 'false',
                endpoint: req.path,
            });
            const cacheKeyPrefix = isRunbookSearch ? 'runbooks' : 'knowledge_base';
            const cacheKey = cacheService
                ? (0, cache_js_1.createCacheKey)(cacheKeyPrefix, JSON.stringify(mcpRequest))
                : null;
            let cachedResult = null;
            if (cacheService && cacheKey) {
                try {
                    cachedResult = await cacheService.get(cacheKey);
                    if (cachedResult) {
                        logger_js_1.logger.info('Cache hit for knowledge base search', {
                            requestId: req.headers['x-request-id'],
                            cacheKey: cacheKey.identifier.substring(0, 50),
                        });
                    }
                }
                catch (cacheError) {
                    logger_js_1.logger.warn('Cache lookup failed, proceeding without cache', {
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
            }
            else {
                const mcpResult = await mcpTools.handleToolCall({
                    method: 'tools/call',
                    params: {
                        name: toolName,
                        arguments: mcpRequest,
                    },
                });
                const requestId = req.headers['x-request-id'];
                const context = {
                    toolName,
                    ...(requestId && { requestId }),
                    startTime,
                };
                restResponse = (0, transforms_js_1.transformMCPResponse)(mcpResult, context);
                if (cacheService && cacheKey && restResponse.success && restResponse.data) {
                    try {
                        await cacheService.set(cacheKey, restResponse);
                        logger_js_1.logger.debug('Cached knowledge base search result', {
                            cacheKey: cacheKey.identifier.substring(0, 50),
                            strategy: restResponse.metadata?.cache_strategy,
                        });
                    }
                    catch (cacheError) {
                        logger_js_1.logger.warn('Failed to cache result', {
                            error: cacheError instanceof Error ? cacheError.message : String(cacheError),
                        });
                    }
                }
            }
            const executionTime = perf_hooks_1.performance.now() - startTime;
            logger_js_1.logger.info('REST API search completed', {
                query: req.body.query.substring(0, 50),
                tool_used: toolName,
                smart_routed: isRunbookSearch,
                results_count: restResponse.data?.results?.length || restResponse.data?.runbooks?.length || 0,
                execution_time_ms: Math.round(executionTime),
                cached: restResponse.data?.cached || false,
            });
            res.json((0, correlation_js_1.createSuccessResponseWithCorrelation)(restResponse.data, req, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            const requestId = req.headers['x-request-id'];
            const errorDetails = handleToolSpecificError(error, 'search_knowledge_base', {
                query: req.body.query,
                requestId,
                executionTime,
            });
            logger_js_1.logger.error('REST API search failed', {
                query: req.body.query?.substring(0, 100),
                error: errorDetails.message,
                error_code: errorDetails.code,
                severity: errorDetails.severity,
                execution_time_ms: Math.round(executionTime),
                request_id: requestId,
            });
            res.status(errorDetails.httpStatus).json((0, correlation_js_1.createErrorResponseWithCorrelation)(errorDetails.code, errorDetails.message, req, {
                execution_time_ms: Math.round(executionTime),
                recovery_actions: errorDetails.recoveryActions,
                retry_recommended: errorDetails.retryRecommended,
            }));
        }
    }));
    router.post('/runbooks/search', (0, middleware_js_1.validateRequest)({
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
    }), (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        try {
            const requestId = req.headers['x-request-id'];
            const userAgent = req.get('User-Agent');
            const mcpRequest = (0, transforms_js_1.transformRestRequest)('search_runbooks', req.body, {
                ...(requestId && { requestId }),
                ...(userAgent && { userAgent }),
                cacheHint: true,
                endpoint: req.path,
            });
            const cacheKey = cacheService
                ? (0, cache_js_1.createCacheKey)('runbooks', JSON.stringify({
                    alert_type: req.body.alert_type,
                    severity: req.body.severity,
                    affected_systems: req.body.affected_systems,
                }))
                : null;
            let cachedResult = null;
            if (cacheService && cacheKey) {
                try {
                    cachedResult = await cacheService.get(cacheKey);
                    if (cachedResult) {
                        logger_js_1.logger.info('High-priority cache hit for runbook search', {
                            alertType: req.body.alert_type,
                            severity: req.body.severity,
                            requestId: req.headers['x-request-id'],
                        });
                    }
                }
                catch (cacheError) {
                    logger_js_1.logger.error('Critical cache lookup failed for runbooks', {
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
            }
            else {
                const mcpResult = await mcpTools.handleToolCall({
                    method: 'tools/call',
                    params: {
                        name: 'search_runbooks',
                        arguments: mcpRequest,
                    },
                });
                const requestId = req.headers['x-request-id'];
                const context = {
                    toolName: 'search_runbooks',
                    ...(requestId && { requestId }),
                    startTime,
                };
                restResponse = (0, transforms_js_1.transformMCPResponse)(mcpResult, context);
                if (cacheService && cacheKey && restResponse.success && restResponse.data) {
                    try {
                        await cacheService.set(cacheKey, restResponse);
                        logger_js_1.logger.info('Cached runbook search result with high priority', {
                            alertType: req.body.alert_type,
                            severity: req.body.severity,
                            resultsCount: restResponse.data?.runbooks?.length || 0,
                        });
                    }
                    catch (cacheError) {
                        logger_js_1.logger.error('Failed to cache critical runbook result', {
                            error: cacheError instanceof Error ? cacheError.message : String(cacheError),
                        });
                    }
                }
            }
            const executionTime = perf_hooks_1.performance.now() - startTime;
            logger_js_1.logger.info('REST API runbook search completed', {
                alert_type: req.body.alert_type,
                severity: req.body.severity,
                results_count: restResponse.data?.runbooks?.length || 0,
                execution_time_ms: Math.round(executionTime),
            });
            res.json((0, correlation_js_1.createSuccessResponseWithCorrelation)(restResponse.data, req, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            const requestId = req.headers['x-request-id'];
            const errorDetails = handleToolSpecificError(error, 'search_runbooks', {
                alertType: req.body.alert_type,
                severity: req.body.severity,
                affectedSystems: req.body.affected_systems,
                requestId,
                executionTime,
            });
            logger_js_1.logger.error('REST API runbook search failed - HIGH PRIORITY', {
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
            res.status(errorDetails.httpStatus).json((0, correlation_js_1.createErrorResponseWithCorrelation)(errorDetails.code, errorDetails.message, req, {
                execution_time_ms: Math.round(executionTime),
                recovery_actions: errorDetails.recoveryActions,
                retry_recommended: errorDetails.retryRecommended,
                escalation_required: errorDetails.escalationRequired,
                business_impact: errorDetails.businessImpact,
            }));
        }
    }));
    router.get('/runbooks/:id', (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        const runbookId = req.params.id;
        try {
            const mcpRequest = (0, transforms_js_1.transformRestRequest)('search_runbooks', {
                alert_type: 'any',
                severity: 'info',
                affected_systems: ['any'],
                context: { runbook_id: runbookId },
            });
            const mcpResult = await mcpTools.handleToolCall({
                method: 'tools/call',
                params: {
                    name: 'search_runbooks',
                    arguments: mcpRequest,
                },
            });
            const restResponse = (0, transforms_js_1.transformMCPResponse)(mcpResult);
            const executionTime = perf_hooks_1.performance.now() - startTime;
            const runbooks = restResponse.data?.runbooks || [];
            const specificRunbook = runbooks.find((r) => r.id === runbookId);
            if (!specificRunbook) {
                res
                    .status(404)
                    .json((0, correlation_js_1.createErrorResponseWithCorrelation)('RUNBOOK_NOT_FOUND', `Runbook with ID '${runbookId}' not found`, req, { execution_time_ms: Math.round(executionTime) }));
                return;
            }
            logger_js_1.logger.info('REST API runbook retrieval completed', {
                runbook_id: runbookId,
                execution_time_ms: Math.round(executionTime),
            });
            res.json((0, correlation_js_1.createSuccessResponseWithCorrelation)(specificRunbook, req, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            const statusCode = getErrorStatusCode(error);
            logger_js_1.logger.error('REST API runbook retrieval failed', {
                runbook_id: runbookId,
                error: error instanceof Error ? error.message : String(error),
                status_code: statusCode,
                execution_time_ms: Math.round(executionTime),
            });
            res
                .status(statusCode)
                .json((0, correlation_js_1.createErrorResponseWithCorrelation)('RUNBOOK_RETRIEVAL_FAILED', error instanceof Error ? error.message : 'Runbook retrieval operation failed', req, { execution_time_ms: Math.round(executionTime) }));
        }
    }));
    router.get('/runbooks', (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        try {
            const { category, severity, limit = 50 } = req.query;
            const mcpRequest = (0, transforms_js_1.transformRestRequest)('search_runbooks', {
                alert_type: 'any',
                severity: severity || 'info',
                affected_systems: ['any'],
                context: {
                    list_all: true,
                    category,
                    limit: parseInt(limit) || 50,
                },
            });
            const mcpResult = await mcpTools.handleToolCall({
                method: 'tools/call',
                params: {
                    name: 'search_runbooks',
                    arguments: mcpRequest,
                },
            });
            const restResponse = (0, transforms_js_1.transformMCPResponse)(mcpResult);
            const executionTime = perf_hooks_1.performance.now() - startTime;
            logger_js_1.logger.info('REST API runbook listing completed', {
                results_count: restResponse.data?.runbooks?.length || 0,
                category: category || 'all',
                execution_time_ms: Math.round(executionTime),
            });
            res.json((0, correlation_js_1.createSuccessResponseWithCorrelation)({
                runbooks: restResponse.data?.runbooks || [],
                total_count: restResponse.data?.total_results || 0,
                filters_applied: {
                    category: category || null,
                    severity: severity || null,
                    limit: parseInt(limit) || 50,
                },
            }, req, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            const statusCode = getErrorStatusCode(error);
            logger_js_1.logger.error('REST API runbook listing failed', {
                error: error instanceof Error ? error.message : String(error),
                status_code: statusCode,
                execution_time_ms: Math.round(executionTime),
            });
            res
                .status(statusCode)
                .json((0, correlation_js_1.createErrorResponseWithCorrelation)('RUNBOOK_LISTING_FAILED', error instanceof Error ? error.message : 'Runbook listing operation failed', req, { execution_time_ms: Math.round(executionTime) }));
        }
    }));
    router.post('/decision-tree', (0, middleware_js_1.validateRequest)({
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
    }), (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        try {
            const mcpRequest = (0, transforms_js_1.transformRestRequest)('get_decision_tree', req.body);
            const mcpResult = await mcpTools.handleToolCall({
                method: 'tools/call',
                params: {
                    name: 'get_decision_tree',
                    arguments: mcpRequest,
                },
            });
            const restResponse = (0, transforms_js_1.transformMCPResponse)(mcpResult);
            const executionTime = perf_hooks_1.performance.now() - startTime;
            res.json((0, correlation_js_1.createSuccessResponseWithCorrelation)(restResponse.data, req, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            const statusCode = getErrorStatusCode(error);
            res.status(statusCode).json((0, middleware_js_1.createErrorResponse)('DECISION_TREE_FAILED', error instanceof Error ? error.message : 'Decision tree retrieval failed', {
                execution_time_ms: Math.round(executionTime),
            }));
        }
    }));
    router.get('/procedures/:id', (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        const procedureId = req.params.id;
        if (!procedureId) {
            res
                .status(400)
                .json((0, middleware_js_1.createErrorResponse)('MISSING_PROCEDURE_ID', 'Procedure ID is required'));
            return;
        }
        try {
            const [runbookId, stepName] = procedureId.split('_', 2);
            if (!runbookId || !stepName) {
                res
                    .status(400)
                    .json((0, middleware_js_1.createErrorResponse)('INVALID_PROCEDURE_ID', 'Procedure ID must be in format: runbook_id_step_name'));
                return;
            }
            const mcpRequest = (0, transforms_js_1.transformRestRequest)('get_procedure', {
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
            const restResponse = (0, transforms_js_1.transformMCPResponse)(mcpResult);
            const executionTime = perf_hooks_1.performance.now() - startTime;
            res.json((0, correlation_js_1.createSuccessResponseWithCorrelation)(restResponse.data, req, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            const statusCode = getErrorStatusCode(error);
            res.status(statusCode).json((0, middleware_js_1.createErrorResponse)('PROCEDURE_RETRIEVAL_FAILED', error instanceof Error ? error.message : 'Procedure retrieval failed', {
                execution_time_ms: Math.round(executionTime),
            }));
        }
    }));
    router.post('/escalation', (0, middleware_js_1.validateRequest)({
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
    }), (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        try {
            const mcpRequest = (0, transforms_js_1.transformRestRequest)('get_escalation_path', req.body);
            const mcpResult = await mcpTools.handleToolCall({
                method: 'tools/call',
                params: {
                    name: 'get_escalation_path',
                    arguments: mcpRequest,
                },
            });
            const restResponse = (0, transforms_js_1.transformMCPResponse)(mcpResult);
            const executionTime = perf_hooks_1.performance.now() - startTime;
            res.json((0, correlation_js_1.createSuccessResponseWithCorrelation)(restResponse.data, req, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            res.status(getErrorStatusCode(error)).json((0, middleware_js_1.createErrorResponse)('ESCALATION_FAILED', 'Escalation path retrieval failed', {
                execution_time_ms: Math.round(executionTime),
            }));
        }
    }));
    router.get('/sources', (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        try {
            const includeHealth = true;
            const mcpRequest = (0, transforms_js_1.transformRestRequest)('list_sources', {
                include_health: includeHealth,
            });
            const mcpResult = await mcpTools.handleToolCall({
                method: 'tools/call',
                params: {
                    name: 'list_sources',
                    arguments: mcpRequest,
                },
            });
            const restResponse = (0, transforms_js_1.transformMCPResponse)(mcpResult);
            const executionTime = perf_hooks_1.performance.now() - startTime;
            res.json((0, correlation_js_1.createSuccessResponseWithCorrelation)(restResponse.data, req, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            res.status(getErrorStatusCode(error)).json((0, middleware_js_1.createErrorResponse)('SOURCES_LISTING_FAILED', 'Sources listing failed', {
                execution_time_ms: Math.round(executionTime),
            }));
        }
    }));
    router.post('/feedback', (0, middleware_js_1.validateRequest)({
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
    }), (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        try {
            const mcpRequest = (0, transforms_js_1.transformRestRequest)('record_resolution_feedback', req.body);
            const mcpResult = await mcpTools.handleToolCall({
                method: 'tools/call',
                params: {
                    name: 'record_resolution_feedback',
                    arguments: mcpRequest,
                },
            });
            const restResponse = (0, transforms_js_1.transformMCPResponse)(mcpResult);
            const executionTime = perf_hooks_1.performance.now() - startTime;
            logger_js_1.logger.info('REST API feedback recorded', {
                runbook_id: req.body.runbook_id,
                outcome: req.body.outcome,
                resolution_time_minutes: req.body.resolution_time_minutes,
                execution_time_ms: Math.round(executionTime),
            });
            res.json((0, correlation_js_1.createSuccessResponseWithCorrelation)(restResponse.data, req, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            res
                .status(getErrorStatusCode(error))
                .json((0, correlation_js_1.createErrorResponseWithCorrelation)('FEEDBACK_RECORDING_FAILED', 'Feedback recording failed', req, { execution_time_ms: Math.round(executionTime) }));
        }
    }));
    router.get('/health', (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        try {
            const [sourcesHealth, cacheHealth, toolsMetrics] = await Promise.allSettled([
                sourceRegistry.healthCheckAll(),
                cacheService?.healthCheck() || Promise.resolve(null),
                Promise.resolve(mcpTools.getPerformanceMetrics()),
            ]);
            const executionTime = perf_hooks_1.performance.now() - startTime;
            const healthStatus = {
                api_status: 'healthy',
                sources: sourcesHealth.status === 'fulfilled' ? sourcesHealth.value : [],
                cache: cacheHealth.status === 'fulfilled' ? cacheHealth.value : null,
                tools: toolsMetrics.status === 'fulfilled' ? toolsMetrics.value : null,
                uptime_seconds: process.uptime(),
                timestamp: new Date().toISOString(),
            };
            const healthySources = healthStatus.sources.filter((s) => s.healthy).length;
            const totalSources = healthStatus.sources.length;
            const sourceHealthRatio = totalSources > 0 ? healthySources / totalSources : 1;
            if (sourceHealthRatio < 0.5) {
                healthStatus.api_status = 'unhealthy';
            }
            else if (sourceHealthRatio < 0.8) {
                healthStatus.api_status = 'degraded';
            }
            const statusCode = healthStatus.api_status === 'healthy' ? 200 : 503;
            res.status(statusCode).json((0, middleware_js_1.createSuccessResponse)(healthStatus, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            res
                .status(getErrorStatusCode(error))
                .json((0, correlation_js_1.createErrorResponseWithCorrelation)('HEALTH_CHECK_FAILED', 'API health check failed', req, { execution_time_ms: Math.round(executionTime) }));
        }
    }));
    router.get('/performance', (0, middleware_js_1.handleAsyncRoute)(async (req, res) => {
        const startTime = perf_hooks_1.performance.now();
        try {
            const toolsMetrics = mcpTools.getPerformanceMetrics();
            const cacheStats = mcpTools.getCacheStats();
            const executionTime = perf_hooks_1.performance.now() - startTime;
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
            res.json((0, middleware_js_1.createSuccessResponse)(performanceData, {
                execution_time_ms: Math.round(executionTime),
            }));
        }
        catch (error) {
            const executionTime = perf_hooks_1.performance.now() - startTime;
            res
                .status(getErrorStatusCode(error))
                .json((0, correlation_js_1.createErrorResponseWithCorrelation)('PERFORMANCE_METRICS_FAILED', 'Performance metrics retrieval failed', req, { execution_time_ms: Math.round(executionTime) }));
        }
    }));
    router.get('/docs', (_req, res) => {
        res.redirect('/api/docs/');
    });
    return router;
}
