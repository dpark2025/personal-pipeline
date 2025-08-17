"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfluenceAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const base_js_1 = require("./base.js");
const logger_js_1 = require("../utils/logger.js");
class BearerTokenAuth {
    constructor(tokenEnv) {
        const token = process.env[tokenEnv];
        if (!token) {
            throw new Error(`Environment variable ${tokenEnv} not set for Confluence authentication`);
        }
        this.token = token;
    }
    async validateToken() {
        return true;
    }
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
        };
    }
}
class BasicAuth {
    constructor(usernameEnv, passwordEnv) {
        const username = process.env[usernameEnv];
        const password = process.env[passwordEnv];
        if (!username || !password) {
            throw new Error(`Environment variables ${usernameEnv} and ${passwordEnv} must be set for Confluence basic auth`);
        }
        this.username = username;
        this.password = password;
    }
    async validateToken() {
        return true;
    }
    getAuthHeaders() {
        const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        return {
            'Authorization': `Basic ${credentials}`,
        };
    }
}
class CQLQueryBuilder {
    buildSearch(query, spaceKeys) {
        const escapedQuery = this.escapeQuery(query);
        let cql = `text ~ "${escapedQuery}"`;
        if (spaceKeys && spaceKeys.length > 0) {
            const spaceFilter = spaceKeys.map(key => `space.key = "${key}"`).join(' OR ');
            cql += ` AND (${spaceFilter})`;
        }
        cql += ' AND type = page AND status = current';
        return cql;
    }
    buildRunbookSearch(alertType, severity, spaceKeys) {
        const terms = [
            alertType,
            severity,
            'runbook',
            'procedure',
            'troubleshoot',
            'incident',
        ].filter(Boolean);
        const searchTerms = terms.map(term => `text ~ "${this.escapeQuery(term)}"`).join(' OR ');
        let cql = `(${searchTerms})`;
        if (spaceKeys && spaceKeys.length > 0) {
            const spaceFilter = spaceKeys.map(key => `space.key = "${key}"`).join(' OR ');
            cql += ` AND (${spaceFilter})`;
        }
        cql += ' AND type = page AND status = current';
        return cql;
    }
    buildContentFilter(filters, spaceKeys) {
        const conditions = [];
        if (spaceKeys && spaceKeys.length > 0) {
            const spaceFilter = spaceKeys.map(key => `space.key = "${key}"`).join(' OR ');
            conditions.push(`(${spaceFilter})`);
        }
        if (filters.max_age_days) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - filters.max_age_days);
            conditions.push(`lastModified >= "${cutoffDate.toISOString().split('T')[0]}"`);
        }
        conditions.push('type = page', 'status = current');
        return conditions.join(' AND ');
    }
    escapeQuery(query) {
        return query.replace(/[\\'"]/g, '\\$&');
    }
}
class ConfluenceContentProcessor {
    parsePageContent(page) {
        const htmlContent = page.body.storage?.value || page.body.view?.value || '';
        if (!htmlContent) {
            return '';
        }
        let processedContent = htmlContent;
        processedContent = processedContent.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, level, content) => {
            return `\n${'#'.repeat(parseInt(level))} ${content.replace(/<[^>]*>/g, '').trim()}\n`;
        });
        processedContent = processedContent.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (_, content) => {
            const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gs, '• $1\n');
            return `\n${listItems}\n`;
        });
        processedContent = processedContent.replace(/<ol[^>]*>(.*?)<\/ol>/gs, (_, content) => {
            let counter = 1;
            const listItems = content.replace(/<li[^>]*>(.*?)<\/li>/gs, () => {
                return `${counter++}. ${RegExp.$1}\n`;
            });
            return `\n${listItems}\n`;
        });
        processedContent = processedContent.replace(/<code[^>]*>(.*?)<\/code>/gs, '`$1`');
        processedContent = processedContent.replace(/<pre[^>]*>(.*?)<\/pre>/gs, '\n```\n$1\n```\n');
        processedContent = this.processMacros(processedContent);
        const plainText = processedContent
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
        return plainText;
    }
    processMacros(content) {
        let processedContent = content;
        processedContent = processedContent.replace(/<ac:structured-macro[^>]*ac:name="(info|warning|note|tip)"[^>]*>.*?<ac:rich-text-body>(.*?)<\/ac:rich-text-body>.*?<\/ac:structured-macro>/gs, (_, type, body) => {
            return `\n[${type.toUpperCase()}] ${body}\n`;
        });
        processedContent = processedContent.replace(/<ac:structured-macro[^>]*ac:name="code"[^>]*>.*?<ac:plain-text-body><!\[CDATA\[(.*?)\]\]><\/ac:plain-text-body>.*?<\/ac:structured-macro>/gs, '\n```\n$1\n```\n');
        processedContent = processedContent.replace(/<ac:structured-macro[^>]*ac:name="expand"[^>]*>.*?<ac:rich-text-body>(.*?)<\/ac:rich-text-body>.*?<\/ac:structured-macro>/gs, '\n[EXPAND] $1\n');
        return processedContent;
    }
    extractMacros(content) {
        const macros = [];
        const macroPattern = /<ac:structured-macro[^>]+ac:name="([^"]+)"[^>]*>(.*?)<\/ac:structured-macro>/gs;
        let match;
        while ((match = macroPattern.exec(content)) !== null) {
            if (match[1] && match[2]) {
                macros.push({
                    type: match[1],
                    content: match[2],
                });
            }
        }
        return macros;
    }
    convertToMarkdown(html) {
        return html
            .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/g, (_, level, content) => `${'#'.repeat(parseInt(level))} ${content}`)
            .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
            .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
            .replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
            .replace(/<ul[^>]*>(.*?)<\/ul>/gs, '$1')
            .replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    extractRunbookStructure(_content, page) {
        const plainContent = this.parsePageContent(page);
        const runbookKeywords = ['runbook', 'procedure', 'steps', 'troubleshoot', 'incident'];
        const hasRunbookKeywords = runbookKeywords.some(keyword => plainContent.toLowerCase().includes(keyword));
        if (!hasRunbookKeywords) {
            return null;
        }
        return {
            id: page.id,
            title: page.title,
            version: page.version.number.toString(),
            description: plainContent.substring(0, 200) + '...',
            triggers: ['general'],
            severity_mapping: {
                critical: 'critical',
                high: 'high',
                info: 'info',
            },
            decision_tree: {
                id: 'confluence_decision_tree',
                name: `Decision tree for ${page.title}`,
                description: 'Automated decision tree from Confluence content',
                branches: [
                    {
                        id: 'check_content',
                        condition: 'Review the content',
                        description: 'Follow the procedure outlined in the documentation',
                        action: 'follow_procedure',
                        next_step: 'complete',
                        confidence: 0.8,
                    }
                ],
                default_action: 'escalate',
            },
            procedures: this.extractSteps(plainContent),
            escalation_path: 'Contact support team',
            metadata: {
                created_at: page.version.when,
                updated_at: page.version.when,
                author: page.version.by.displayName,
                confidence_score: 0.7,
                success_rate: 0.85,
                avg_resolution_time_minutes: 30,
            },
        };
    }
    extractSteps(content) {
        const steps = [];
        const stepPatterns = [
            /(\d+)\.\s+([^0-9]{1,200})/g,
            /Step\s+(\d+)[:.]?\s*([^Step]{1,200})/gi,
        ];
        for (const pattern of stepPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null && match[1] && match[2]) {
                const stepNumber = parseInt(match[1]);
                const description = match[2]?.trim() || '';
                steps.push({
                    id: `step_${stepNumber}`,
                    name: `Step ${stepNumber}`,
                    description: description,
                    expected_outcome: 'Step completed successfully',
                    timeout_seconds: 300,
                });
            }
        }
        if (steps.length === 0) {
            steps.push({
                id: 'general_procedure',
                name: 'General Procedure',
                description: 'Follow the procedure outlined in the documentation',
                expected_outcome: 'Procedure completed successfully',
                timeout_seconds: 1800,
            });
        }
        return steps.slice(0, 10);
    }
}
class ConfluenceAdapter extends base_js_1.SourceAdapter {
    constructor(config) {
        super(config);
        this.spaceKeys = config.space_keys || [];
        this.maxResults = config.max_results || 50;
        this.queryBuilder = new CQLQueryBuilder();
        this.contentProcessor = new ConfluenceContentProcessor();
        this.initializeAuth(config);
        this.client = axios_1.default.create({
            baseURL: config.base_url,
            timeout: config.timeout_ms || 10000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...this.authProvider.getAuthHeaders(),
            },
        });
        this.client.interceptors.response.use((response) => response, (error) => {
            logger_js_1.logger.error('Confluence API error', {
                status: error.response?.status,
                message: error.response?.data?.message,
                url: error.config?.url,
            });
            throw error;
        });
    }
    initializeAuth(config) {
        switch (config.auth.type) {
            case 'bearer_token':
                if (!config.auth.token_env) {
                    throw new Error('token_env required for bearer_token authentication');
                }
                this.authProvider = new BearerTokenAuth(config.auth.token_env);
                break;
            case 'basic':
                const usernameEnv = config.auth.username_env;
                const passwordEnv = config.auth.password_env;
                if (!usernameEnv || !passwordEnv) {
                    throw new Error('username_env and password_env required for basic authentication');
                }
                this.authProvider = new BasicAuth(usernameEnv, passwordEnv);
                break;
            default:
                throw new Error(`Unsupported authentication type: ${config.auth.type}`);
        }
    }
    async initialize() {
        try {
            logger_js_1.logger.info('Initializing ConfluenceAdapter', {
                baseUrl: this.config.base_url,
                spaceKeys: this.spaceKeys,
                authType: this.config.auth.type,
            });
            await this.authProvider.validateToken();
            await this.testConnectivity();
            this.isInitialized = true;
            logger_js_1.logger.info('ConfluenceAdapter initialized successfully');
        }
        catch (error) {
            logger_js_1.logger.error('Failed to initialize ConfluenceAdapter', { error });
            throw new Error(`Failed to initialize ConfluenceAdapter: ${error}`);
        }
    }
    async testConnectivity() {
        try {
            const response = await this.client.get('/rest/api/user/current');
            logger_js_1.logger.info('Confluence connectivity test passed', {
                user: response.data?.displayName,
            });
        }
        catch (error) {
            throw new Error(`Confluence connectivity test failed: ${error}`);
        }
    }
    async search(query, filters) {
        try {
            const cqlQuery = this.buildAdvancedCQLQuery(query, filters);
            logger_js_1.logger.debug('Executing Confluence search', { query, cqlQuery, filters });
            const startTime = Date.now();
            const response = await this.client.get('/rest/api/content/search', {
                params: {
                    cql: cqlQuery,
                    expand: 'body.storage,body.view,version,space',
                    limit: Math.min(filters?.limit || this.maxResults, this.maxResults),
                },
            });
            const retrievalTime = Date.now() - startTime;
            logger_js_1.logger.debug('Confluence search completed', {
                resultCount: response.data.results.length,
                retrievalTimeMs: retrievalTime
            });
            return this.processSearchResults(response.data.results, query, retrievalTime);
        }
        catch (error) {
            logger_js_1.logger.error('Confluence search failed', { query, error });
            throw new Error(`Confluence search failed: ${error}`);
        }
    }
    async searchRunbooks(alertType, severity, affectedSystems) {
        try {
            const queries = this.buildRunbookSearchQueries(alertType, severity, affectedSystems);
            const allResults = [];
            logger_js_1.logger.debug('Searching Confluence for runbooks with multiple queries', {
                alertType,
                severity,
                affectedSystems,
                queryCount: queries.length
            });
            for (const query of queries) {
                try {
                    const response = await this.client.get('/rest/api/content/search', {
                        params: {
                            cql: query,
                            expand: 'body.storage,body.view,version,space',
                            limit: Math.min(20, this.maxResults),
                        },
                    });
                    allResults.push(...response.data.results);
                }
                catch (queryError) {
                    logger_js_1.logger.warn('Individual runbook query failed', { query, error: queryError });
                }
            }
            const uniquePages = Array.from(new Map(allResults.map(page => [page.id, page])).values());
            const runbooks = [];
            for (const page of uniquePages) {
                const runbook = this.contentProcessor.extractRunbookStructure(page.body.storage?.value || page.body.view?.value || '', page);
                if (runbook) {
                    runbook.metadata.confidence_score = this.calculateRunbookRelevance(runbook, alertType, severity, affectedSystems);
                    runbooks.push(runbook);
                }
            }
            runbooks.sort((a, b) => b.metadata.confidence_score - a.metadata.confidence_score);
            logger_js_1.logger.info('Found Confluence runbooks', {
                count: runbooks.length,
                alertType,
                severity,
                uniquePages: uniquePages.length
            });
            return runbooks.slice(0, 10);
        }
        catch (error) {
            logger_js_1.logger.error('Confluence runbook search failed', { alertType, severity, error });
            throw new Error(`Confluence runbook search failed: ${error}`);
        }
    }
    buildRunbookSearchQueries(alertType, severity, affectedSystems) {
        const queries = [];
        queries.push(this.queryBuilder.buildRunbookSearch(alertType, severity, this.spaceKeys));
        for (const system of affectedSystems.slice(0, 3)) {
            const systemQuery = this.queryBuilder.buildSearch(`${alertType} ${system} runbook`, this.spaceKeys);
            queries.push(systemQuery);
        }
        const severityQuery = this.queryBuilder.buildSearch(`${severity} incident procedure troubleshoot`, this.spaceKeys);
        queries.push(severityQuery);
        const generalQuery = this.queryBuilder.buildSearch(`runbook ${alertType}`, this.spaceKeys);
        queries.push(generalQuery);
        return queries;
    }
    calculateRunbookRelevance(runbook, alertType, severity, affectedSystems) {
        let score = 0.3;
        const title = runbook.title.toLowerCase();
        const description = runbook.description.toLowerCase();
        const alertTypeLower = alertType.toLowerCase();
        const severityLower = severity.toLowerCase();
        if (title.includes(alertTypeLower)) {
            score += 0.4;
        }
        if (description.includes(alertTypeLower)) {
            score += 0.1;
        }
        if (description.includes(severityLower)) {
            score += 0.1;
        }
        const systemMatches = affectedSystems.filter(system => title.includes(system.toLowerCase()) || description.includes(system.toLowerCase())).length;
        score += Math.min(systemMatches * 0.1, 0.2);
        if (runbook.severity_mapping && runbook.severity_mapping[severityLower]) {
            score += 0.1;
        }
        const triggerMatches = runbook.triggers.filter(trigger => trigger.toLowerCase().includes(alertTypeLower) ||
            alertTypeLower.includes(trigger.toLowerCase())).length;
        score += Math.min(triggerMatches * 0.05, 0.1);
        return Math.min(score, 1.0);
    }
    async getDocument(id) {
        try {
            const response = await this.client.get(`/rest/api/content/${id}`, {
                params: {
                    expand: 'body.storage,body.view,version,space',
                },
            });
            return this.convertPageToSearchResult(response.data, '', 1.0);
        }
        catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            logger_js_1.logger.error('Failed to get Confluence document', { id, error });
            throw new Error(`Failed to get Confluence document: ${error}`);
        }
    }
    buildAdvancedCQLQuery(query, filters) {
        let cqlQuery = this.queryBuilder.buildSearch(query, this.spaceKeys);
        if (filters) {
            if (filters.max_age_days) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - filters.max_age_days);
                cqlQuery += ` AND lastModified >= "${cutoffDate.toISOString().split('T')[0]}"`;
            }
            if (filters.categories && filters.categories.length > 0) {
                const categoryFilters = filters.categories.map(category => {
                    switch (category) {
                        case 'runbook':
                            return 'text ~ "runbook OR procedure OR troubleshoot"';
                        case 'api':
                            return 'text ~ "API OR endpoint OR REST"';
                        case 'guide':
                            return 'text ~ "guide OR howto OR tutorial"';
                        default:
                            return `text ~ "${category}"`;
                    }
                }).join(' OR ');
                cqlQuery += ` AND (${categoryFilters})`;
            }
        }
        return cqlQuery;
    }
    processSearchResults(pages, query, retrievalTime) {
        return pages.map(page => {
            const confidence = this.calculateEnhancedConfidence(page, query);
            const result = this.convertPageToSearchResult(page, query, confidence);
            result.retrieval_time_ms = retrievalTime;
            return result;
        })
            .sort((a, b) => b.confidence_score - a.confidence_score);
    }
    convertPageToSearchResult(page, query, confidence) {
        const content = this.contentProcessor.parsePageContent(page);
        return {
            id: page.id,
            title: page.title,
            content,
            source: this.config.name,
            source_type: 'confluence',
            url: `${this.config.base_url}${page._links.webui}`,
            confidence_score: confidence,
            last_updated: page.version.when,
            metadata: {
                space_key: page.space.key,
                space_name: page.space.name,
                page_id: page.id,
                version: page.version.number,
                author: page.version.by.displayName,
                last_modified: page.version.when,
                type: page.type,
                status: page.status,
            },
            match_reasons: this.generateMatchReasons(page, query),
            retrieval_time_ms: 0,
        };
    }
    calculateEnhancedConfidence(page, query) {
        let confidence = 0.3;
        const title = page.title.toLowerCase();
        const content = this.contentProcessor.parsePageContent(page).toLowerCase();
        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);
        let titleScore = 0;
        if (title.includes(queryLower)) {
            titleScore += 0.3;
        }
        const titleTermMatches = queryTerms.filter(term => title.includes(term)).length;
        titleScore += (titleTermMatches / queryTerms.length) * 0.2;
        confidence += Math.min(titleScore, 0.35);
        let contentScore = 0;
        const contentMatches = (content.match(new RegExp(queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
        contentScore += Math.min(contentMatches * 0.05, 0.15);
        const contentTermMatches = queryTerms.reduce((acc, term) => {
            const matches = (content.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
            return acc + Math.min(matches, 3);
        }, 0);
        contentScore += Math.min(contentTermMatches * 0.02, 0.15);
        confidence += Math.min(contentScore, 0.30);
        const lastUpdated = new Date(page.version.when);
        const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) {
            confidence += 0.15;
        }
        else if (daysSinceUpdate < 30) {
            confidence += 0.10;
        }
        else if (daysSinceUpdate < 90) {
            confidence += 0.05;
        }
        if (page.space.key.toLowerCase().includes('ops') ||
            page.space.key.toLowerCase().includes('docs')) {
            confidence += 0.1;
        }
        const indicatorWords = ['runbook', 'procedure', 'troubleshoot', 'guide', 'howto', 'api', 'documentation'];
        const foundIndicators = indicatorWords.filter(indicator => title.includes(indicator) || content.includes(indicator)).length;
        confidence += Math.min(foundIndicators * 0.02, 0.1);
        return Math.min(confidence, 1.0);
    }
    generateMatchReasons(page, query) {
        const reasons = [];
        const title = page.title.toLowerCase();
        const content = this.contentProcessor.parsePageContent(page).toLowerCase();
        const queryLower = query.toLowerCase();
        if (title.includes(queryLower)) {
            reasons.push('Title match');
        }
        if (content.includes(queryLower)) {
            reasons.push('Content match');
        }
        if (page.space.key.toLowerCase().includes(queryLower)) {
            reasons.push('Space match');
        }
        if (reasons.length === 0) {
            reasons.push('General relevance');
        }
        return reasons;
    }
    async healthCheck() {
        const startTime = Date.now();
        try {
            const response = await this.client.get('/rest/api/user/current');
            const responseTime = Date.now() - startTime;
            return {
                source_name: this.config.name,
                healthy: true,
                response_time_ms: responseTime,
                last_check: new Date().toISOString(),
                metadata: {
                    user: response.data?.displayName,
                    space_count: this.spaceKeys.length,
                    base_url: this.config.base_url,
                    auth_type: this.config.auth.type,
                },
            };
        }
        catch (error) {
            return {
                source_name: this.config.name,
                healthy: false,
                response_time_ms: Date.now() - startTime,
                last_check: new Date().toISOString(),
                error_message: `Health check failed: ${error}`,
            };
        }
    }
    async getMetadata() {
        return {
            name: this.config.name,
            type: 'confluence',
            documentCount: -1,
            lastIndexed: new Date().toISOString(),
            avgResponseTime: 300,
            successRate: 0.95,
        };
    }
    async refreshIndex(_force) {
        return true;
    }
    async cleanup() {
        logger_js_1.logger.info('Cleaning up ConfluenceAdapter');
        this.isInitialized = false;
        logger_js_1.logger.info('ConfluenceAdapter cleaned up');
    }
}
exports.ConfluenceAdapter = ConfluenceAdapter;
