import { SourceAdapter } from '../base.js';
import { HttpClient } from './http-client.js';
import { AuthManager } from './auth-manager.js';
import { ContentExtractor } from './content-extractor.js';
import { UrlManager } from './url-manager.js';
import { CacheManager } from './cache-manager.js';
import { logger } from '../../utils/logger.js';
export class WebAdapter extends SourceAdapter {
    name = 'web';
    type = 'web';
    config;
    logger;
    httpClient;
    authManager;
    contentExtractor;
    urlManager;
    cacheManager;
    metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        cacheHitRate: 0,
        lastHealthCheck: new Date().toISOString()
    };
    constructor(config) {
        super(config);
        this.config = config;
        this.logger = logger.child({ adapter: 'web', name: config.name });
    }
    async initialize() {
        this.logger.info('Initializing WebAdapter', {
            sources: this.config.sources?.length || 0,
            authType: this.config.auth?.type || 'none'
        });
        this.authManager = new AuthManager(this.config.auth || { type: 'none' }, this.logger);
        this.httpClient = new HttpClient({
            timeout: this.config.performance?.default_timeout_ms || 30000,
            retryAttempts: this.config.performance?.default_retry_attempts || 3,
            maxConcurrentRequests: this.config.performance?.max_concurrent_requests || 10,
            userAgent: this.config.performance?.user_agent || 'PersonalPipeline-WebAdapter/1.0',
            validateSSL: this.config.content_processing?.validate_ssl ?? true,
            followRedirects: this.config.content_processing?.follow_redirects ?? true
        }, this.authManager, this.logger);
        this.contentExtractor = new ContentExtractor({
            maxContentSizeMb: this.config.content_processing?.max_content_size_mb || 10,
            extractLinks: this.config.content_processing?.extract_links ?? false,
            respectRobots: this.config.content_processing?.respect_robots ?? true
        }, this.logger);
        this.urlManager = new UrlManager(this.config.sources || [], this.logger);
        this.cacheManager = new CacheManager({
            defaultTtl: this.config.performance?.default_cache_ttl || '5m',
            maxCacheSize: 1000,
            enableMetrics: true
        }, this.logger);
        await this.authManager.initialize();
        await this.httpClient.initialize();
        await this.contentExtractor.initialize();
        await this.urlManager.initialize();
        await this.cacheManager.initialize();
        await this.validateSourceConnectivity();
        this.isInitialized = true;
        this.logger.info('WebAdapter initialized successfully');
    }
    async search(query, filters) {
        if (!this.isInitialized) {
            throw new Error('WebAdapter not initialized');
        }
        const startTime = Date.now();
        this.logger.debug('Starting web search', {
            query,
            filters,
            sources: this.config.sources?.length || 0
        });
        const cacheKey = this.generateCacheKey('search', { query, filters });
        if (this.cacheManager) {
            const cachedResults = await this.cacheManager.get(cacheKey);
            if (cachedResults) {
                this.logger.debug('Returning cached search results', {
                    query,
                    resultCount: cachedResults.length,
                    cacheKey
                });
                return cachedResults;
            }
        }
        try {
            const allResults = [];
            if (this.config.sources && this.httpClient && this.contentExtractor && this.urlManager) {
                const searchPromises = this.config.sources.flatMap(source => source.endpoints.map(endpoint => this.searchEndpoint(query, source, endpoint, filters)));
                const endpointResults = await Promise.allSettled(searchPromises);
                endpointResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        allResults.push(...result.value);
                    }
                    else {
                        const sourceName = this.config.sources?.[Math.floor(index / 2)]?.name || `source_${index}`;
                        this.logger.warn('Endpoint search failed', {
                            source: sourceName,
                            error: result.reason?.message || 'Unknown error'
                        });
                    }
                });
            }
            const scoredResults = allResults.map(result => ({
                ...result,
                confidence_score: this.calculateConfidence(result, query),
                match_reasons: this.generateMatchReasons(result, query),
                retrieval_time_ms: Date.now() - startTime
            }));
            const finalResults = this.filterAndRankResults(scoredResults, filters);
            if (this.cacheManager && finalResults.length > 0) {
                await this.cacheManager.set(cacheKey, finalResults);
            }
            this.updateMetrics(true, Date.now() - startTime);
            const duration = Date.now() - startTime;
            this.logger.info('Web search completed', {
                query,
                resultCount: finalResults.length,
                duration,
                cacheKey
            });
            return finalResults;
        }
        catch (error) {
            this.updateMetrics(false, Date.now() - startTime);
            this.logger.error('Web search failed', {
                query,
                error: error.message
            });
            throw new Error(`Web search failed: ${error.message}`);
        }
    }
    async getDocument(id) {
        if (!this.isInitialized) {
            throw new Error('WebAdapter not initialized');
        }
        this.logger.debug('Getting document', { id });
        const cacheKey = this.generateCacheKey('document', { id });
        if (this.cacheManager) {
            const cached = await this.cacheManager.get(cacheKey);
            if (cached) {
                this.logger.debug('Returning cached document', { id });
                return cached;
            }
        }
        const docInfo = this.parseDocumentId(id);
        if (!docInfo) {
            this.logger.warn('Invalid document ID format', { id });
            return null;
        }
        const { sourceName, endpointName, documentId } = docInfo;
        const source = this.config.sources?.find(s => s.name === sourceName);
        const endpoint = source?.endpoints.find(e => e.name === endpointName);
        if (!source || !endpoint) {
            this.logger.warn('Source or endpoint not found for document', {
                id, sourceName, endpointName
            });
            return null;
        }
        try {
            const content = await this.fetchDocument(source, endpoint, documentId);
            if (content) {
                const result = this.convertContentToSearchResult(content);
                if (this.cacheManager) {
                    await this.cacheManager.set(cacheKey, result);
                }
                return result;
            }
            return null;
        }
        catch (error) {
            this.logger.error('Failed to get document', {
                id,
                error: error.message
            });
            return null;
        }
    }
    async searchRunbooks(alertType, severity, affectedSystems) {
        this.logger.debug('Searching for runbooks', {
            alertType,
            severity,
            affectedSystems
        });
        const operationalTerms = [
            alertType,
            severity,
            ...affectedSystems,
            'runbook', 'procedure', 'troubleshooting', 'incident', 'operations'
        ].join(' ');
        const searchResults = await this.search(operationalTerms, {
            categories: ['runbooks', 'procedures', 'operations'],
            confidence_threshold: 0.3,
            limit: 20
        });
        const runbooks = [];
        for (const result of searchResults) {
            try {
                if (this.isLikelyRunbookContent(result, alertType, severity)) {
                    const runbook = await this.extractRunbookStructure(result, alertType, severity);
                    if (runbook) {
                        runbooks.push(runbook);
                    }
                }
            }
            catch (error) {
                this.logger.warn('Failed to extract runbook structure', {
                    resultId: result.id,
                    error: error.message
                });
            }
        }
        this.logger.info('Runbook search completed', {
            alertType,
            runbookCount: runbooks.length
        });
        return runbooks;
    }
    async healthCheck() {
        const startTime = Date.now();
        const checks = {};
        const errors = [];
        try {
            let authHealthy = true;
            if (this.authManager) {
                authHealthy = await this.authManager.healthCheck();
                checks['authentication'] = authHealthy;
                if (!authHealthy) {
                    errors.push('Authentication failed');
                }
            }
            const sourceChecks = {};
            if (this.config.sources) {
                for (const source of this.config.sources.slice(0, 5)) {
                    if (source.health_check.enabled) {
                        try {
                            const healthy = await this.testSourceHealth(source);
                            checks[source.name] = healthy;
                            sourceChecks[source.name] = healthy;
                            if (!healthy) {
                                errors.push(`${source.name}: Health check failed`);
                            }
                        }
                        catch (error) {
                            checks[source.name] = false;
                            sourceChecks[source.name] = false;
                            errors.push(`${source.name}: ${error.message}`);
                        }
                    }
                }
            }
            const healthyDataSources = Object.values(sourceChecks).filter(Boolean).length;
            const totalDataSources = Object.keys(sourceChecks).length;
            const hasHealthySources = totalDataSources === 0 || healthyDataSources > 0;
            const isHealthy = authHealthy && hasHealthySources;
            const responseTime = Date.now() - startTime;
            this.metrics.lastHealthCheck = new Date().toISOString();
            return {
                source_name: this.config.name,
                healthy: isHealthy,
                response_time_ms: responseTime,
                last_check: this.metrics.lastHealthCheck,
                error_message: errors.length > 0 ? errors.join('; ') : undefined,
                metadata: {
                    totalSources: totalDataSources,
                    healthySources: healthyDataSources,
                    authHealthy,
                    authType: this.config.auth?.type || 'none',
                    checks,
                    metrics: this.getMetricsSummary()
                }
            };
        }
        catch (error) {
            return {
                source_name: this.config.name,
                healthy: false,
                response_time_ms: Date.now() - startTime,
                last_check: new Date().toISOString(),
                error_message: error.message,
                metadata: {
                    metrics: this.getMetricsSummary()
                }
            };
        }
    }
    async getMetadata() {
        const cacheStats = this.cacheManager ? await this.cacheManager.getStats() : { totalEntries: 0 };
        return {
            name: this.config.name,
            type: 'web',
            documentCount: cacheStats.totalEntries,
            lastIndexed: this.metrics.lastHealthCheck,
            avgResponseTime: this.metrics.avgResponseTime,
            successRate: this.metrics.totalRequests > 0
                ? this.metrics.successfulRequests / this.metrics.totalRequests
                : 0
        };
    }
    async refreshIndex(force = false) {
        this.logger.info('Refreshing web adapter index', { force });
        try {
            if (force && this.cacheManager) {
                await this.cacheManager.clear();
            }
            await this.validateSourceConnectivity();
            if (force) {
                this.resetMetrics();
            }
            this.logger.info('Web adapter index refreshed successfully');
            return true;
        }
        catch (error) {
            this.logger.error('Failed to refresh web adapter index', {
                error: error.message
            });
            return false;
        }
    }
    async cleanup() {
        this.logger.info('Cleaning up WebAdapter');
        if (this.cacheManager)
            await this.cacheManager.cleanup();
        if (this.httpClient)
            await this.httpClient.cleanup();
        if (this.authManager)
            await this.authManager.cleanup();
        if (this.contentExtractor)
            await this.contentExtractor.cleanup();
        if (this.urlManager)
            await this.urlManager.cleanup();
        await super.cleanup();
        this.logger.info('WebAdapter cleanup completed');
    }
    async validateSourceConnectivity() {
        if (!this.config.sources)
            return;
        const testPromises = this.config.sources.map(async (source) => {
            try {
                const healthy = await this.testSourceHealth(source);
                this.logger.debug('Source connectivity validated', {
                    source: source.name,
                    healthy
                });
                return { source: source.name, success: healthy };
            }
            catch (error) {
                this.logger.warn('Source connectivity failed', {
                    source: source.name,
                    error: error.message
                });
                return { source: source.name, success: false, error: error.message };
            }
        });
        const results = await Promise.allSettled(testPromises);
        const failedSources = results
            .filter(result => result.status === 'fulfilled' && !result.value.success)
            .map(result => result.status === 'fulfilled' ? result.value.source : 'unknown');
        if (failedSources.length === this.config.sources.length) {
            this.logger.warn('All sources failed connectivity test - continuing anyway');
        }
        if (failedSources.length > 0) {
            this.logger.warn('Some sources failed connectivity test', {
                failedSources,
                totalSources: this.config.sources.length
            });
        }
    }
    async searchEndpoint(query, source, endpoint, _filters) {
        if (!this.httpClient || !this.contentExtractor || !this.urlManager) {
            return [];
        }
        try {
            const url = this.urlManager.buildEndpointUrl(source, endpoint);
            const response = await this.httpClient.request({
                method: endpoint.method,
                url,
                query,
                endpoint,
                source
            });
            const extractedContent = await this.contentExtractor.extract(response, endpoint, source);
            return this.convertExtractedContentToResults(extractedContent, source, endpoint, query);
        }
        catch (error) {
            this.logger.error('Endpoint search failed', {
                source: source.name,
                endpoint: endpoint.name,
                error: error.message
            });
            return [];
        }
    }
    calculateConfidence(result, query) {
        const queryLower = query.toLowerCase();
        const titleLower = result.title.toLowerCase();
        const contentLower = result.content.toLowerCase();
        let confidence = 0.0;
        if (titleLower.includes(queryLower)) {
            confidence += 0.4;
        }
        else {
            const titleWords = queryLower.split(/\s+/);
            const titleMatches = titleWords.filter(word => titleLower.includes(word)).length;
            confidence += (titleMatches / titleWords.length) * 0.4;
        }
        if (contentLower.includes(queryLower)) {
            confidence += 0.35;
        }
        else {
            const contentWords = queryLower.split(/\s+/);
            const contentMatches = contentWords.filter(word => contentLower.includes(word)).length;
            confidence += (contentMatches / contentWords.length) * 0.35;
        }
        const sourceType = result.metadata?.source_type || '';
        if (sourceType.includes('runbook') || sourceType.includes('ops')) {
            confidence += 0.25;
        }
        else if (sourceType.includes('doc') || sourceType.includes('api')) {
            confidence += 0.15;
        }
        else {
            confidence += 0.1;
        }
        return Math.min(confidence, 1.0);
    }
    generateMatchReasons(result, query) {
        const reasons = [];
        const queryLower = query.toLowerCase();
        const titleLower = result.title.toLowerCase();
        const contentLower = result.content.toLowerCase();
        if (titleLower.includes(queryLower)) {
            reasons.push('Exact title match');
        }
        else if (queryLower.split(/\s+/).some(word => titleLower.includes(word))) {
            reasons.push('Partial title match');
        }
        if (contentLower.includes(queryLower)) {
            reasons.push('Exact content match');
        }
        else if (queryLower.split(/\s+/).some(word => contentLower.includes(word))) {
            reasons.push('Partial content match');
        }
        const sourceType = result.metadata?.source_type || '';
        if (sourceType.includes('runbook')) {
            reasons.push('Runbook source');
        }
        else if (sourceType.includes('doc')) {
            reasons.push('Documentation source');
        }
        if (reasons.length === 0) {
            reasons.push('General relevance');
        }
        return reasons;
    }
    filterAndRankResults(results, filters) {
        let filtered = results;
        if (filters?.confidence_threshold) {
            filtered = filtered.filter(result => result.confidence_score >= filters.confidence_threshold);
        }
        if (filters?.categories) {
            filtered = filtered.filter(result => {
                const sourceType = result.metadata?.source_type?.toLowerCase() || '';
                return filters.categories.some(category => sourceType.includes(category.toLowerCase()));
            });
        }
        filtered.sort((a, b) => b.confidence_score - a.confidence_score);
        if (filters?.limit) {
            filtered = filtered.slice(0, filters.limit);
        }
        return filtered;
    }
    async testSourceHealth(source) {
        if (!source.health_check.enabled || !this.httpClient || !this.urlManager) {
            return true;
        }
        try {
            const healthEndpoint = source.health_check.endpoint || source.endpoints[0]?.path || '/';
            const url = this.urlManager.buildHealthCheckUrl(source, healthEndpoint);
            const response = await this.httpClient.healthCheck(url, source.health_check.timeout_ms);
            return response.status < 400;
        }
        catch (error) {
            this.logger.debug('Source health check failed', {
                source: source.name,
                error: error.message
            });
            return false;
        }
    }
    async fetchDocument(source, endpoint, documentId) {
        if (!this.httpClient || !this.contentExtractor || !this.urlManager) {
            return null;
        }
        try {
            const url = this.urlManager.buildDocumentUrl(source, endpoint, documentId);
            const response = await this.httpClient.request({
                method: 'GET',
                url,
                endpoint,
                source
            });
            const extractedContent = await this.contentExtractor.extract(response, endpoint, source);
            return extractedContent.length > 0 ? extractedContent[0] : null;
        }
        catch (error) {
            this.logger.error('Failed to fetch document', {
                source: source.name,
                endpoint: endpoint.name,
                documentId,
                error: error.message
            });
            return null;
        }
    }
    convertContentToSearchResult(content) {
        return {
            id: content.id,
            title: content.title,
            content: content.content,
            source: this.config.name,
            source_type: 'web',
            confidence_score: 1.0,
            match_reasons: ['Direct document access'],
            retrieval_time_ms: 0,
            last_updated: content.extracted_at,
            metadata: {
                source_url: content.source_url,
                ...content.metadata
            }
        };
    }
    convertExtractedContentToResults(contents, source, endpoint, _query) {
        return contents.map(content => ({
            id: content.id,
            title: content.title,
            content: content.content,
            source: this.config.name,
            source_type: 'web',
            confidence_score: 0.8,
            match_reasons: [],
            retrieval_time_ms: 0,
            last_updated: content.extracted_at,
            metadata: {
                source_name: source.name,
                endpoint_name: endpoint.name,
                source_type: source.type,
                source_url: content.source_url,
                ...content.metadata
            }
        }));
    }
    isLikelyRunbookContent(result, alertType, severity) {
        const content = result.content.toLowerCase();
        const title = result.title.toLowerCase();
        const sourceType = result.metadata?.source_type?.toLowerCase() || '';
        const runbookKeywords = ['runbook', 'procedure', 'troubleshoot', 'incident', 'operations', 'ops'];
        const hasRunbookKeywords = runbookKeywords.some(keyword => title.includes(keyword) || content.includes(keyword) || sourceType.includes(keyword));
        const alertTypeNormalized = alertType.replace(/_/g, ' ').toLowerCase();
        const hasAlertRelevance = content.includes(alertTypeNormalized) || title.includes(alertTypeNormalized);
        const hasSeverityRelevance = content.includes(severity.toLowerCase()) || title.includes(severity.toLowerCase());
        return hasRunbookKeywords && (hasAlertRelevance || hasSeverityRelevance);
    }
    async extractRunbookStructure(result, alertType, severity) {
        try {
            if (result.metadata?.content_type === 'json') {
                try {
                    const jsonContent = JSON.parse(result.content);
                    if (this.isValidRunbookJSON(jsonContent)) {
                        return jsonContent;
                    }
                }
                catch {
                }
            }
            return this.createSyntheticRunbook(result, alertType, severity);
        }
        catch (error) {
            this.logger.warn('Failed to extract runbook structure', {
                resultId: result.id,
                error: error.message
            });
            return null;
        }
    }
    isValidRunbookJSON(obj) {
        return obj &&
            typeof obj === 'object' &&
            obj.id &&
            obj.title &&
            (obj.procedures || obj.steps || obj.actions);
    }
    createSyntheticRunbook(result, alertType, severity) {
        const procedures = this.extractProceduresFromContent(result.content);
        return {
            id: result.id,
            title: result.title,
            version: '1.0',
            description: `Runbook extracted from ${result.source}`,
            triggers: [alertType],
            severity_mapping: {
                [severity]: severity,
                critical: 'critical',
                high: 'high',
                medium: 'medium',
                low: 'low',
                info: 'info'
            },
            decision_tree: {
                id: 'main',
                name: 'Main Decision Tree',
                description: 'Primary decision flow for this runbook',
                branches: [],
                default_action: 'escalate'
            },
            procedures,
            escalation_path: 'Standard escalation procedure',
            metadata: {
                confidence_score: result.confidence_score,
                author: 'WebAdapter',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                success_rate: 0.85
            }
        };
    }
    extractProceduresFromContent(content) {
        const procedures = [];
        const stepPatterns = [
            /^\d+\.\s*(.+)$/gm,
            /^Step \d+:\s*(.+)$/gm,
            /^\*\s*(.+)$/gm,
            /^-\s*(.+)$/gm
        ];
        let stepCounter = 1;
        for (const pattern of stepPatterns) {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                matches.forEach(match => {
                    const description = match.replace(/^\d+\.\s*|^Step \d+:\s*|^\*\s*|^-\s*/, '').trim();
                    if (description.length > 10) {
                        procedures.push({
                            id: `step_${stepCounter}`,
                            name: `Step ${stepCounter}`,
                            description,
                            expected_outcome: 'Step completed successfully',
                            timeout_seconds: 300
                        });
                        stepCounter++;
                    }
                });
                break;
            }
        }
        if (procedures.length === 0) {
            procedures.push({
                id: 'step_1',
                name: 'Primary Procedure',
                description: content.substring(0, 500),
                expected_outcome: 'Procedure completed successfully',
                timeout_seconds: 600
            });
        }
        return procedures;
    }
    parseDocumentId(id) {
        const parts = id.split(':');
        if (parts.length !== 3) {
            return null;
        }
        return {
            sourceName: parts[0],
            endpointName: parts[1],
            documentId: parts[2]
        };
    }
    generateCacheKey(operation, params) {
        const paramString = JSON.stringify(params);
        const hash = Buffer.from(paramString).toString('base64').substring(0, 8);
        return `web:${operation}:${hash}`;
    }
    updateMetrics(success, responseTime) {
        this.metrics.totalRequests++;
        if (success) {
            this.metrics.successfulRequests++;
        }
        else {
            this.metrics.failedRequests++;
        }
        const totalRequests = this.metrics.totalRequests;
        this.metrics.avgResponseTime =
            ((this.metrics.avgResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
    }
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgResponseTime: 0,
            cacheHitRate: 0,
            lastHealthCheck: new Date().toISOString()
        };
    }
    getMetricsSummary() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalRequests > 0
                ? this.metrics.successfulRequests / this.metrics.totalRequests
                : 0
        };
    }
}
//# sourceMappingURL=web-adapter.js.map