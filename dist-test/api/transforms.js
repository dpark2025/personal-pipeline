import { logger } from '../utils/logger.js';
import { performance } from 'perf_hooks';
export function transformRestRequest(toolName, requestBody, context) {
    const startTime = performance.now();
    try {
        const sanitizedBody = sanitizeRequestBody(requestBody, toolName);
        const validationResult = validateToolRequest(sanitizedBody, toolName);
        if (!validationResult.isValid) {
            throw new Error(`Request validation failed for ${toolName}: ${validationResult.errors.join(', ')}`);
        }
        const baseRequest = {
            ...sanitizedBody,
            _metadata: {
                tool_name: toolName,
                request_id: context?.requestId || generateTransformId(),
                user_agent: context?.userAgent || undefined,
                cache_preferred: context?.cacheHint !== false,
                transform_time_ms: 0,
                validation_passed: true,
                endpoint: context?.endpoint || undefined,
            },
        };
        let transformedRequest;
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
    }
    catch (error) {
        const transformTime = performance.now() - startTime;
        logger.error('Request transformation failed', {
            toolName,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            requestBody: JSON.stringify(requestBody).substring(0, 200),
            transformTime: Math.round(transformTime),
        });
        throw new Error(`Failed to transform request for tool: ${toolName} - ${error instanceof Error ? error.message : String(error)}`);
    }
}
function transformSearchKnowledgeBaseRequest(body) {
    const query = body.query?.trim();
    if (!query || query.length < 2) {
        throw new Error('Query must be at least 2 characters long and contain meaningful content');
    }
    if (query.length > 500) {
        throw new Error('Query too long - maximum 500 characters allowed');
    }
    const queryMetrics = analyzeQuery(query);
    if (queryMetrics.suspiciousPatterns.length > 0) {
        logger.warn('Suspicious query patterns detected', {
            patterns: queryMetrics.suspiciousPatterns,
            query: query.substring(0, 50),
        });
    }
    const maxResults = calculateOptimalResultLimit(body.max_results, queryMetrics, body._metadata?.user_agent);
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
        },
        _metadata: body._metadata,
    };
}
function transformSearchRunbooksRequest(body) {
    const requiredFields = ['alert_type', 'severity', 'affected_systems'];
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields for runbook search: ${missingFields.join(', ')}`);
    }
    const alertType = validateAlertType(body.alert_type);
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    if (!validSeverities.includes(body.severity)) {
        throw new Error(`Invalid severity level. Must be one of: ${validSeverities.join(', ')}`);
    }
    const affectedSystems = normalizeAndValidateSystems(body.affected_systems);
    if (affectedSystems.length === 0) {
        throw new Error('At least one valid affected system must be specified');
    }
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
            suggested_timeout_ms: body.severity === 'critical' ? 3000 : body.severity === 'high' ? 5000 : 10000,
        },
        _metadata: {
            ...body._metadata,
            validation_enhanced: true,
            risk_score: calculateRiskScore(body.severity, alertType, affectedSystems),
        },
    };
}
function transformDecisionTreeRequest(body) {
    return {
        alert_context: body.alert_context,
        current_agent_state: body.current_agent_state || undefined,
    };
}
function transformProcedureRequest(body) {
    return {
        runbook_id: body.runbook_id,
        step_name: body.step_name,
        current_context: body.current_context || {},
    };
}
function transformEscalationRequest(body) {
    return {
        severity: body.severity,
        business_hours: body.business_hours,
        failed_attempts: body.failed_attempts || [],
    };
}
function transformListSourcesRequest(body) {
    return {
        include_health: body.include_health !== false,
    };
}
function transformFeedbackRequest(body) {
    return {
        runbook_id: body.runbook_id,
        procedure_id: body.procedure_id,
        outcome: body.outcome,
        resolution_time_minutes: body.resolution_time_minutes,
        notes: body.notes || undefined,
    };
}
export function transformMCPResponse(mcpResult, context) {
    const transformStartTime = performance.now();
    try {
        if (mcpResult.isError) {
            return transformMCPError(mcpResult, context);
        }
        const content = extractMCPContent(mcpResult);
        if (!content) {
            return createAdvancedErrorResponse('INVALID_MCP_RESPONSE', 'MCP response contained no readable content', 'high', context?.toolName, {
                mcp_result_structure: Object.keys(mcpResult),
                content_array_length: mcpResult.content?.length || 0,
            });
        }
        let parsedContent;
        if (typeof content === 'string') {
            try {
                parsedContent = JSON.parse(content);
            }
            catch (parseError) {
                logger.warn('MCP response JSON parsing failed, treating as plain text', {
                    toolName: context?.toolName,
                    contentLength: content.length,
                    parseError: parseError instanceof Error ? parseError.message : String(parseError),
                });
                parsedContent = { message: content, _raw_content: true };
            }
        }
        else {
            parsedContent = content;
        }
        const totalTime = context?.startTime ? performance.now() - context.startTime : undefined;
        const transformTime = performance.now() - transformStartTime;
        const enhancedContext = {
            ...(context?.toolName && { toolName: context.toolName }),
            ...(context?.requestId && { requestId: context.requestId }),
            ...(totalTime && { totalExecutionTime: totalTime }),
            transformTime,
        };
        const response = transformSuccessfulMCPResponse(parsedContent, enhancedContext);
        return response;
    }
    catch (error) {
        const transformTime = performance.now() - transformStartTime;
        logger.error('MCP response transformation failed', {
            toolName: context?.toolName,
            requestId: context?.requestId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            mcpResult: JSON.stringify(mcpResult).substring(0, 500),
            transformTime: Math.round(transformTime),
        });
        return createAdvancedErrorResponse('RESPONSE_TRANSFORMATION_ERROR', 'Failed to transform MCP response', 'critical', context?.toolName, {
            error: error instanceof Error ? error.message : String(error),
            transform_time_ms: Math.round(transformTime),
        });
    }
}
function extractMCPContent(mcpResult) {
    if (!mcpResult.content || !Array.isArray(mcpResult.content)) {
        return null;
    }
    for (const item of mcpResult.content) {
        if (item.type === 'text' && 'text' in item) {
            return item.text;
        }
    }
    return null;
}
function transformMCPError(mcpResult, context) {
    const content = extractMCPContent(mcpResult);
    const errorInfo = {
        code: 'MCP_TOOL_ERROR',
        message: 'MCP tool execution failed',
        severity: 'medium',
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
        }
        catch (parseError) {
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
function transformSuccessfulMCPResponse(content, context) {
    const isSuccess = content.success !== false;
    if (!isSuccess) {
        return createAdvancedErrorResponse(content.error?.code || 'OPERATION_FAILED', content.error?.message || content.message || 'Operation failed', 'medium', context?.toolName, content.error?.details || content);
    }
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
                break;
        }
    }
    return createGenericMCPResponse(content, context);
}
function createGenericMCPResponse(content, context) {
    const metadata = {
        ...(context?.toolName && { tool_name: context.toolName }),
        ...(context?.requestId && { request_id: context.requestId }),
    };
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
    if (metadata.retrieval_time_ms !== undefined) {
        metadata.performance_tier =
            metadata.retrieval_time_ms < 200
                ? 'fast'
                : metadata.retrieval_time_ms < 1000
                    ? 'medium'
                    : 'slow';
    }
    if (context?.toolName) {
        metadata.cache_strategy = determineCacheStrategy(context.toolName, content, metadata.retrieval_time_ms);
    }
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
export function transformRunbookSearchResponse(content) {
    const runbooks = content?.runbooks || [];
    const total_results = content?.total_results || runbooks.length;
    const confidence_scores = content?.confidence_scores || runbooks.map((r) => r.metadata?.confidence_score || 0);
    const enhancedRunbooks = runbooks.map((runbook) => ({
        ...runbook,
        url: `/api/runbooks/${runbook.id}`,
        procedures_url: runbook.procedures?.map((p) => `/api/procedures/${runbook.id}_${p.name || p.id}`),
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
export function transformSearchResultsResponse(content) {
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
    const results = content.results || [];
    const totalResults = content.total_results || results.length || 0;
    const retrievalTime = content.retrieval_time_ms || 0;
    const confidenceScores = results.map((result) => result.confidence_score || 0);
    const avgConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((sum, score) => sum + score, 0) /
            confidenceScores.length
        : 0;
    return {
        success: true,
        data: {
            results,
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
export function transformProcedureResponse(content) {
    const response = createGenericMCPResponse(content);
    if (response.success && response.data?.procedure) {
        response.data.procedure = {
            ...response.data.procedure,
            execution_url: `/api/procedures/${response.data.procedure.id}/execute`,
            runbook_url: response.data.procedure.runbook_id
                ? `/api/runbooks/${response.data.procedure.runbook_id}`
                : undefined,
        };
        if (response.data.related_steps) {
            response.data.related_steps = response.data.related_steps.map((step) => ({
                ...step,
                url: `/api/procedures/${step.id}`,
            }));
        }
    }
    return response;
}
export function transformEscalationResponse(content) {
    const response = createGenericMCPResponse(content);
    if (response.success && response.data?.escalation_contacts) {
        response.data.escalation_contacts = response.data.escalation_contacts.map((contact) => ({
            ...contact,
            contact_methods: parseContactMethods(contact.contact),
            escalation_order: response.data.escalation_contacts.indexOf(contact) + 1,
        }));
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
function generateTransformId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
function sanitizeRequestBody(body, toolName) {
    if (!body || typeof body !== 'object') {
        return body;
    }
    const sanitized = { ...body };
    const dangerousFields = ['__proto__', 'constructor', 'prototype'];
    dangerousFields.forEach(field => {
        if (field in sanitized) {
            delete sanitized[field];
            logger.warn('Removed dangerous field from request', { field, toolName });
        }
    });
    Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = sanitizeString(sanitized[key]);
        }
        else if (Array.isArray(sanitized[key])) {
            sanitized[key] = sanitized[key].map((item) => typeof item === 'string' ? sanitizeString(item) : item);
        }
    });
    return sanitized;
}
function sanitizeString(str) {
    return str
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
}
function validateToolRequest(body, toolName) {
    const errors = [];
    const warnings = [];
    switch (toolName) {
        case 'search_knowledge_base':
            if (!body.query || typeof body.query !== 'string') {
                errors.push('Query field is required and must be a string');
            }
            if (body.max_results &&
                (typeof body.max_results !== 'number' || body.max_results < 1 || body.max_results > 100)) {
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
            if (!body.affected_systems ||
                (!Array.isArray(body.affected_systems) && typeof body.affected_systems !== 'string')) {
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
function sanitizeQuery(query) {
    return query
        .replace(/[<>"'&]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function validateCategories(categories) {
    if (!categories)
        return undefined;
    const categoryArray = Array.isArray(categories) ? categories : [categories];
    const validCategories = categoryArray
        .filter((cat) => typeof cat === 'string' && cat.trim().length > 0)
        .map((cat) => cat.trim().toLowerCase())
        .slice(0, 10);
    return validCategories.length > 0 ? validCategories : undefined;
}
function validateMaxAge(maxAge) {
    if (maxAge === undefined)
        return undefined;
    const age = typeof maxAge === 'string' ? parseInt(maxAge) : maxAge;
    if (typeof age === 'number' && age > 0 && age <= 3650) {
        return age;
    }
    logger.warn('Invalid max_age_days value, ignoring', { maxAge });
    return undefined;
}
function calculateOptimalResultLimit(requestedLimit, queryMetrics, userAgent) {
    let baseLimit = 10;
    if (typeof requestedLimit === 'number' && requestedLimit > 0) {
        baseLimit = Math.min(requestedLimit, 100);
    }
    if (queryMetrics.complexity > 0.8) {
        baseLimit = Math.min(baseLimit, 5);
    }
    else if (queryMetrics.complexity < 0.3) {
        baseLimit = Math.min(baseLimit * 2, 50);
    }
    if (userAgent && (userAgent.includes('Mobile') || userAgent.includes('Android'))) {
        baseLimit = Math.min(baseLimit, 20);
    }
    return baseLimit;
}
function determineSearchCacheTTL(queryMetrics, categories) {
    let baseTTL = 1800;
    if (queryMetrics.complexity < 0.3) {
        baseTTL = 3600;
    }
    if (categories && categories.includes('runbook')) {
        baseTTL = 7200;
    }
    if (queryMetrics.complexity > 0.8) {
        baseTTL = 900;
    }
    return baseTTL;
}
function validateAlertType(alertType) {
    if (typeof alertType !== 'string') {
        throw new Error('Alert type must be a string');
    }
    const normalized = alertType.trim().toLowerCase();
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
    if (!knownPatterns.some(pattern => normalized.includes(pattern))) {
        logger.info('Unknown alert type pattern detected', { alertType: normalized });
    }
    return normalized;
}
function normalizeAndValidateSystems(systems) {
    if (!systems)
        return [];
    const systemArray = Array.isArray(systems) ? systems : [systems];
    const validSystems = systemArray
        .filter((system) => typeof system === 'string' && system.trim().length > 0)
        .map((system) => system.trim().toLowerCase())
        .filter((system) => system.length <= 50)
        .slice(0, 20);
    return [...new Set(validSystems)];
}
function determineCachePriority(severity, alertType, affectedSystems) {
    if (severity === 'critical')
        return 'high';
    if (severity === 'high' &&
        (alertType.includes('service_down') || affectedSystems.includes('production'))) {
        return 'high';
    }
    if (severity === 'high')
        return 'medium';
    return 'standard';
}
function calculateUrgencyScore(severity, alertType, context) {
    let score = 0;
    const severityScores = {
        critical: 1.0,
        high: 0.8,
        medium: 0.5,
        low: 0.3,
        info: 0.1,
    };
    score = severityScores[severity] || 0.5;
    const highUrgencyTypes = ['service_down', 'security_breach', 'data_loss'];
    if (highUrgencyTypes.some(type => alertType.includes(type))) {
        score = Math.min(score + 0.2, 1.0);
    }
    if (context?.business_hours === false) {
        score = Math.max(score - 0.1, 0);
    }
    return Math.round(score * 100) / 100;
}
function sanitizeContext(context) {
    if (!context || typeof context !== 'object') {
        return {};
    }
    const sanitized = { ...context };
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
    sensitiveFields.forEach(field => {
        if (field in sanitized) {
            delete sanitized[field];
        }
    });
    return sanitized;
}
function assessBusinessImpact(severity, affectedSystems) {
    const criticalSystems = ['production', 'database', 'payment', 'auth', 'api'];
    const hasCriticalSystems = affectedSystems.some(system => criticalSystems.some(critical => system.includes(critical)));
    if (severity === 'critical' && hasCriticalSystems)
        return 'critical';
    if (severity === 'critical' || (severity === 'high' && hasCriticalSystems))
        return 'high';
    if (severity === 'high' || severity === 'medium')
        return 'medium';
    return 'low';
}
function calculateRiskScore(severity, alertType, affectedSystems) {
    let score = 0;
    const severityPoints = {
        critical: 40,
        high: 30,
        medium: 20,
        low: 10,
        info: 5,
    };
    score += severityPoints[severity] || 20;
    const highRiskTypes = ['security_breach', 'data_loss', 'service_down'];
    if (highRiskTypes.some(type => alertType.includes(type))) {
        score += 30;
    }
    else if (alertType.includes('error') || alertType.includes('failure')) {
        score += 20;
    }
    else {
        score += 10;
    }
    const criticalSystems = ['production', 'database', 'payment', 'auth'];
    const criticalCount = affectedSystems.filter(system => criticalSystems.some(critical => system.includes(critical))).length;
    score += Math.min(criticalCount * 10, 30);
    return Math.min(score, 100);
}
function parseContactMethods(contact) {
    const methods = {};
    if (contact.includes('@')) {
        methods.email = contact;
    }
    if (contact.match(/\+?[\d\s\-()]+/)) {
        methods.phone = contact;
    }
    if (contact.includes('slack:') || contact.includes('#')) {
        methods.slack = contact;
    }
    return methods;
}
export function validateMCPResponse(mcpResult) {
    try {
        if (!mcpResult || typeof mcpResult !== 'object') {
            return false;
        }
        if (!mcpResult.content || !Array.isArray(mcpResult.content)) {
            return false;
        }
        return mcpResult.content.some(item => item.type === 'text' && 'text' in item && typeof item.text === 'string');
    }
    catch (error) {
        logger.error('MCP response validation failed', { error });
        return false;
    }
}
export function sanitizeResponseData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
    const sanitized = { ...data };
    for (const field of sensitiveFields) {
        if (field in sanitized) {
            delete sanitized[field];
        }
    }
    for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeResponseData(value);
        }
    }
    return sanitized;
}
function createAdvancedErrorResponse(code, message, severity, toolName, details) {
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
function categorizeError(error, toolName) {
    const code = error.code || '';
    const message = error.message || '';
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
    if (toolName) {
        const toolCategory = getToolErrorCategory(toolName, error);
        if (toolCategory) {
            return toolCategory;
        }
    }
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
function getToolErrorCategory(toolName, _error) {
    switch (toolName) {
        case 'search_runbooks':
            return {
                category: 'runbook_search',
                severity: 'high',
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
                severity: 'critical',
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
function analyzeQuery(query) {
    const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 2);
    const patterns = [];
    const suspiciousPatterns = [];
    if (query.includes('"'))
        patterns.push('quoted_phrases');
    if (query.includes('*') || query.includes('?'))
        patterns.push('wildcards');
    if (query.includes('AND') || query.includes('OR'))
        patterns.push('boolean_operators');
    if (/[a-zA-Z]+:\S+/.test(query))
        patterns.push('field_searches');
    if (/<script|javascript:|on\w+=/i.test(query)) {
        suspiciousPatterns.push('script_injection');
    }
    if (/\.\.\//g.test(query)) {
        suspiciousPatterns.push('path_traversal');
    }
    if (/union\s+select|drop\s+table|insert\s+into/i.test(query)) {
        suspiciousPatterns.push('sql_injection');
    }
    let complexity = 0;
    complexity += Math.min(terms.length / 10, 0.4);
    complexity += patterns.length * 0.15;
    complexity += query.length > 100 ? 0.2 : 0;
    complexity += suspiciousPatterns.length * 0.1;
    const indexOptimizable = terms.length <= 5 && patterns.length <= 2 && query.length <= 100;
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
function determineCacheStrategy(toolName, content, retrievalTime) {
    if (toolName === 'search_runbooks' || toolName === 'get_escalation_path') {
        return 'high_priority';
    }
    if (retrievalTime && retrievalTime > 1000) {
        return 'performance_cache';
    }
    if (content.confidence_score && content.confidence_score > 0.8) {
        return 'high_confidence';
    }
    return 'standard';
}
//# sourceMappingURL=transforms.js.map