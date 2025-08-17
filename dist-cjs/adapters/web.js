"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAdapter = exports.RateLimitError = exports.AuthenticationError = exports.WebAdapterError = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const turndown_1 = __importDefault(require("turndown"));
const xml2js_1 = require("xml2js");
const jsonpath_plus_1 = require("jsonpath-plus");
const base_js_1 = require("./base.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class WebAdapterError extends Error {
    constructor(message, endpoint) {
        super(message);
        this.endpoint = endpoint;
        this.name = 'WebAdapterError';
    }
}
exports.WebAdapterError = WebAdapterError;
class AuthenticationError extends Error {
    constructor(message, endpoint) {
        super(message);
        this.endpoint = endpoint;
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class RateLimitError extends Error {
    constructor(message, endpoint) {
        super(message);
        this.endpoint = endpoint;
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class WebAdapter extends base_js_1.SourceAdapter {
    constructor(config, cacheService) {
        super(config);
        this.name = 'web';
        this.type = 'http';
        this.documentIndex = new Map();
        this.rateLimitStates = new Map();
        this.config = config;
        this.logger = logger_js_1.default.child({ adapter: 'web', name: config.name });
        if (cacheService) {
            this.cache = cacheService;
        }
        this.httpClient = this.createHttpClient();
        this.turndownService = new turndown_1.default({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });
    }
    async initialize() {
        this.logger.info('Initializing WebAdapter', {
            endpoints: this.config.endpoints.length,
            authType: this.config.auth.type,
            maxConcurrent: this.config.performance.max_concurrent_requests
        });
        this.validateConfiguration();
        await this.validateEndpointConnectivity();
        this.logger.info('WebAdapter initialized successfully');
    }
    async search(query, filters) {
        const startTime = Date.now();
        this.logger.debug('Starting web search', {
            query,
            filters,
            endpoints: this.config.endpoints.length
        });
        const cacheKey = this.generateCacheKey('search', { query, filters });
        if (this.cache) {
            const cached = await this.cache.get({ type: 'knowledge_base', identifier: cacheKey });
            if (cached) {
                this.logger.debug('Returning cached search results', {
                    query,
                    resultCount: cached.length,
                    cacheKey
                });
                return cached;
            }
        }
        try {
            const searchPromises = this.config.endpoints.map(endpoint => this.searchEndpoint(query, endpoint, filters));
            const endpointResults = await Promise.allSettled(searchPromises);
            const allResults = [];
            endpointResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    allResults.push(...result.value);
                }
                else {
                    this.logger.warn('Endpoint search failed', {
                        endpoint: this.config.endpoints[index]?.name || `endpoint_${index}`,
                        error: result.reason?.message || 'Unknown error'
                    });
                }
            });
            const scoredResults = allResults.map(result => ({
                ...result,
                confidence_score: this.calculateWebConfidence(result, query),
                match_reasons: this.generateWebMatchReasons(result, query),
                retrieval_time_ms: Date.now() - startTime
            }));
            const finalResults = this.filterAndRankResults(scoredResults, filters);
            if (this.cache && finalResults.length > 0) {
                await this.cache.set({ type: 'knowledge_base', identifier: cacheKey }, finalResults);
            }
            const duration = Date.now() - startTime;
            this.logger.info('Web search completed', {
                query,
                resultCount: finalResults.length,
                duration,
                endpoints: this.config.endpoints.length
            });
            return finalResults;
        }
        catch (error) {
            this.logger.error('Web search failed', {
                query,
                error: error.message
            });
            throw new WebAdapterError(`Search failed: ${error.message}`);
        }
    }
    async getDocument(id) {
        this.logger.debug('Getting document', { id });
        const cacheKey = this.generateCacheKey('document', { id });
        if (this.cache) {
            const cached = await this.cache.get({ type: 'knowledge_base', identifier: cacheKey });
            if (cached) {
                this.logger.debug('Returning cached document', { id });
                return cached;
            }
        }
        const content = this.documentIndex.get(id);
        if (content) {
            const result = this.convertContentToSearchResult(content, 'direct-access');
            if (this.cache) {
                await this.cache.set({ type: 'knowledge_base', identifier: cacheKey }, result);
            }
            return result;
        }
        this.logger.warn('Document not found', { id });
        return null;
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
            confidence_threshold: 0.3
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
        const checks = {};
        const errors = [];
        try {
            for (const endpoint of this.config.endpoints.slice(0, 3)) {
                try {
                    const response = await this.executeHttpRequest(endpoint);
                    checks[endpoint.name] = response.status < 400;
                }
                catch (error) {
                    checks[endpoint.name] = false;
                    errors.push(`${endpoint.name}: ${error.message}`);
                }
            }
            const healthyEndpoints = Object.values(checks).filter(Boolean).length;
            const totalEndpoints = Object.keys(checks).length;
            const isHealthy = healthyEndpoints > 0;
            return {
                source_name: this.config.name,
                healthy: isHealthy,
                response_time_ms: 200,
                last_check: new Date().toISOString(),
                error_message: errors.length > 0 ? errors.join('; ') : undefined,
                metadata: {
                    totalEndpoints,
                    healthyEndpoints,
                    authType: this.config.auth.type,
                    checks
                }
            };
        }
        catch (error) {
            return {
                source_name: this.config.name,
                healthy: false,
                response_time_ms: 0,
                last_check: new Date().toISOString(),
                error_message: error.message,
                metadata: {}
            };
        }
    }
    async getMetadata() {
        return {
            name: this.config.name,
            type: 'web',
            documentCount: this.documentIndex.size,
            lastIndexed: new Date().toISOString(),
            avgResponseTime: 250,
            successRate: 0.95
        };
    }
    async refreshIndex(force = false) {
        this.logger.info('Refreshing web adapter index', { force });
        try {
            if (force) {
                this.documentIndex.clear();
                if (this.cache) {
                    await this.cache.clearAll();
                }
            }
            await this.validateEndpointConnectivity();
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
        this.documentIndex.clear();
        this.rateLimitStates.clear();
        this.logger.info('WebAdapter cleanup completed');
    }
    createHttpClient() {
        const client = axios_1.default.create({
            timeout: this.config.performance.default_timeout_ms,
            headers: this.buildGlobalHeaders(),
            validateStatus: (status) => status < 500,
            maxRedirects: this.config.content_processing.follow_redirects ? 5 : 0
        });
        client.interceptors.request.use((config) => {
            this.logger.debug('HTTP request', {
                method: config.method?.toUpperCase(),
                url: config.url,
                headers: this.sanitizeHeaders(config.headers || {})
            });
            return config;
        });
        client.interceptors.response.use((response) => {
            this.logger.debug('HTTP response', {
                status: response.status,
                url: response.config.url,
                contentType: response.headers['content-type'],
                size: this.getResponseSize(response)
            });
            return response;
        }, (error) => {
            this.logger.error('HTTP error', {
                status: error.response?.status,
                url: error.config?.url,
                message: error.message
            });
            return Promise.reject(error);
        });
        return client;
    }
    buildGlobalHeaders() {
        const headers = {
            'User-Agent': this.config.performance.user_agent || 'PersonalPipeline-WebAdapter/1.0'
        };
        if (this.config.auth.type === 'api_key' && this.config.auth.api_key_header) {
            const apiKey = process.env[this.config.auth.api_key_env];
            if (apiKey) {
                headers[this.config.auth.api_key_header] = apiKey;
            }
        }
        else if (this.config.auth.type === 'bearer_token' && this.config.auth.bearer_token_env) {
            const token = process.env[this.config.auth.bearer_token_env];
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        else if ((this.config.auth.type === 'basic_auth' || this.config.auth.type === 'basic') && this.config.auth.username_env && this.config.auth.password_env) {
            const username = process.env[this.config.auth.username_env];
            const password = process.env[this.config.auth.password_env];
            if (username && password) {
                const credentials = Buffer.from(`${username}:${password}`).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
            }
        }
        else if (this.config.auth.type === 'bearer' && this.config.auth.bearer_token_env) {
            const token = process.env[this.config.auth.bearer_token_env];
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        if (this.config.auth.custom_headers) {
            Object.assign(headers, this.config.auth.custom_headers);
        }
        if (this.config.auth.header_envs) {
            for (const [headerName, envVar] of Object.entries(this.config.auth.header_envs)) {
                const value = process.env[envVar];
                if (value) {
                    headers[headerName] = value;
                }
            }
        }
        return headers;
    }
    validateConfiguration() {
        if (!this.config.endpoints || this.config.endpoints.length === 0) {
            throw new WebAdapterError('No endpoints configured');
        }
        for (const endpoint of this.config.endpoints) {
            if (!endpoint.name || !endpoint.url) {
                throw new WebAdapterError(`Invalid endpoint configuration: missing name or URL`);
            }
            if (!['GET', 'POST'].includes(endpoint.method)) {
                throw new WebAdapterError(`Unsupported HTTP method: ${endpoint.method}`);
            }
            if (!['html', 'json', 'xml', 'text', 'auto'].includes(endpoint.content_type)) {
                throw new WebAdapterError(`Unsupported content type: ${endpoint.content_type}`);
            }
        }
        const requiredEnvVars = [];
        if (this.config.auth.type === 'api_key') {
            requiredEnvVars.push(this.config.auth.api_key_env);
        }
        else if (this.config.auth.type === 'bearer_token' || this.config.auth.type === 'bearer') {
            if (this.config.auth.bearer_token_env) {
                requiredEnvVars.push(this.config.auth.bearer_token_env);
            }
        }
        else if (this.config.auth.type === 'basic_auth' || this.config.auth.type === 'basic') {
            if (this.config.auth.username_env)
                requiredEnvVars.push(this.config.auth.username_env);
            if (this.config.auth.password_env)
                requiredEnvVars.push(this.config.auth.password_env);
        }
        for (const envVar of requiredEnvVars) {
            if (envVar && !process.env[envVar]) {
                this.logger.warn(`Missing environment variable: ${envVar}`);
            }
        }
    }
    async validateEndpointConnectivity() {
        const testPromises = this.config.endpoints.map(async (endpoint) => {
            try {
                const response = await this.executeHttpRequest(endpoint);
                this.logger.debug('Endpoint connectivity validated', {
                    endpoint: endpoint.name,
                    status: response.status
                });
                return { endpoint: endpoint.name, success: true };
            }
            catch (error) {
                this.logger.warn('Endpoint connectivity failed', {
                    endpoint: endpoint.name,
                    error: error.message
                });
                return { endpoint: endpoint.name, success: false, error: error.message };
            }
        });
        const results = await Promise.allSettled(testPromises);
        const failedEndpoints = results
            .filter(result => result.status === 'fulfilled' && !result.value.success)
            .map(result => result.status === 'fulfilled' ? result.value.endpoint : 'unknown');
        if (failedEndpoints.length === this.config.endpoints.length) {
            this.logger.warn('All endpoints failed connectivity test - continuing anyway');
        }
        if (failedEndpoints.length > 0) {
            this.logger.warn('Some endpoints failed connectivity test', {
                failedEndpoints,
                totalEndpoints: this.config.endpoints.length
            });
        }
    }
    async searchEndpoint(query, endpoint, _filters) {
        try {
            await this.checkRateLimit(endpoint);
            const response = await this.executeHttpRequest(endpoint, query);
            const extractedContent = await this.processContent(response, endpoint);
            const documentId = this.generateDocumentId(endpoint.name, extractedContent.title);
            this.documentIndex.set(documentId, extractedContent);
            return this.convertToSearchResults(extractedContent, endpoint, query);
        }
        catch (error) {
            this.logger.error('Endpoint search failed', {
                endpoint: endpoint.name,
                error: error.message
            });
            return [];
        }
    }
    async executeHttpRequest(endpoint, query) {
        const config = {
            method: endpoint.method,
            url: endpoint.url,
            timeout: endpoint.timeout_ms || this.config.performance.default_timeout_ms,
            headers: {
                ...this.buildGlobalHeaders(),
                ...endpoint.headers
            }
        };
        if (endpoint.query_params) {
            config.params = { ...config.params, ...endpoint.query_params };
        }
        if (query && endpoint.method === 'GET') {
            config.params = { ...config.params, q: query, query: query, search: query };
        }
        if (this.config.auth.type === 'api_key' && this.config.auth.api_key_query) {
            const apiKey = process.env[this.config.auth.api_key_env];
            if (apiKey) {
                config.params = { ...config.params, [this.config.auth.api_key_query]: apiKey };
            }
        }
        if (endpoint.method === 'POST') {
            let body = endpoint.body || '{}';
            if (query) {
                body = body.replace('${query}', query);
            }
            config.data = body;
            config.headers['Content-Type'] = 'application/json';
        }
        try {
            const response = await this.httpClient.request(config);
            return {
                data: response.data,
                status: response.status,
                headers: response.headers,
                url: response.config.url || endpoint.url,
                content_type: response.headers['content-type'] || 'unknown'
            };
        }
        catch (error) {
            if (error.response) {
                const status = error.response.status;
                if (status === 401 || status === 403) {
                    throw new AuthenticationError(`Authentication failed for ${endpoint.name}: ${status}`, endpoint.name);
                }
                if (status === 429) {
                    throw new RateLimitError(`Rate limit exceeded for ${endpoint.name}`, endpoint.name);
                }
                throw new WebAdapterError(`HTTP ${status} error for ${endpoint.name}: ${error.message}`, endpoint.name);
            }
            throw new WebAdapterError(`Request failed for ${endpoint.name}: ${error.message}`, endpoint.name);
        }
    }
    async processContent(response, endpoint) {
        const contentType = this.detectContentType(response, endpoint);
        this.logger.debug('Processing content', {
            endpoint: endpoint.name,
            contentType,
            size: typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length
        });
        switch (contentType) {
            case 'html':
                return this.processHTML(response.data, endpoint.selectors || {}, endpoint.name);
            case 'json':
                return this.processJSON(response.data, endpoint.json_paths || [], endpoint.name);
            case 'xml':
                return await this.processXML(response.data, endpoint.xml_xpaths || [], endpoint.name);
            case 'text':
                return this.processText(response.data, endpoint.name);
            default:
                throw new WebAdapterError(`Unsupported content type: ${contentType}`, endpoint.name);
        }
    }
    detectContentType(response, endpoint) {
        if (endpoint.content_type !== 'auto') {
            return endpoint.content_type;
        }
        const contentType = response.content_type.toLowerCase();
        if (contentType.includes('application/json')) {
            return 'json';
        }
        else if (contentType.includes('text/html')) {
            return 'html';
        }
        else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
            return 'xml';
        }
        else {
            return 'text';
        }
    }
    processHTML(html, selectors, endpointName) {
        try {
            const $ = cheerio.load(html);
            let title = '';
            if (selectors.title) {
                title = $(selectors.title).first().text().trim();
            }
            else {
                title = $('title').text().trim() || $('h1').first().text().trim() || '';
            }
            if (selectors.exclude) {
                selectors.exclude.forEach(excludeSelector => {
                    $(excludeSelector).remove();
                });
            }
            let contentHtml = '';
            if (selectors.content) {
                contentHtml = $(selectors.content).html() || '';
            }
            else {
                $('script, style, nav, header, footer, aside, .sidebar, .navigation').remove();
                contentHtml = $('main').html() || $('article').html() || $('body').html() || html;
            }
            const markdown = this.htmlToMarkdown(contentHtml);
            const metadata = this.extractHTMLMetadata($);
            let links = [];
            if (selectors.links) {
                links = $(selectors.links).map((_, el) => $(el).attr('href')).get().filter(Boolean);
            }
            const searchableContent = this.generateSearchableContent(title, markdown, metadata);
            return {
                title: title || 'Web Document',
                content: markdown,
                raw_content: html,
                metadata,
                links,
                searchable_content: searchableContent
            };
        }
        catch (error) {
            this.logger.error('HTML processing failed', {
                endpoint: endpointName,
                error: error.message
            });
            throw new WebAdapterError(`HTML processing failed: ${error.message}`, endpointName);
        }
    }
    processJSON(data, jsonPaths, endpointName) {
        try {
            const extractedData = {};
            if (jsonPaths.length > 0) {
                for (const path of jsonPaths) {
                    try {
                        const result = (0, jsonpath_plus_1.JSONPath)({ path, json: data });
                        const pathKey = path.replace(/^\$\.?/, '').replace(/\[\*\]/g, '');
                        extractedData[pathKey] = result;
                    }
                    catch (error) {
                        this.logger.warn('JSONPath extraction failed', {
                            endpoint: endpointName,
                            path,
                            error: error.message
                        });
                    }
                }
            }
            else {
                Object.assign(extractedData, data);
            }
            const title = this.extractJSONTitle(extractedData);
            const content = this.jsonToMarkdown(extractedData);
            const searchableContent = this.generateSearchableContent(title, content, extractedData);
            return {
                title,
                content,
                raw_content: JSON.stringify(data, null, 2),
                metadata: extractedData,
                searchable_content: searchableContent
            };
        }
        catch (error) {
            this.logger.error('JSON processing failed', {
                endpoint: endpointName,
                error: error.message
            });
            throw new WebAdapterError(`JSON processing failed: ${error.message}`, endpointName);
        }
    }
    async processXML(xmlData, _xpaths, endpointName) {
        return new Promise((resolve, reject) => {
            (0, xml2js_1.parseString)(xmlData, { explicitArray: false }, (err, result) => {
                if (err) {
                    this.logger.error('XML parsing failed', {
                        endpoint: endpointName,
                        error: err.message
                    });
                    reject(new WebAdapterError(`XML parsing failed: ${err.message}`, endpointName));
                    return;
                }
                try {
                    const extractedData = result || {};
                    const title = this.extractXMLTitle(extractedData);
                    const content = this.jsonToMarkdown(extractedData);
                    const searchableContent = this.generateSearchableContent(title, content, extractedData);
                    resolve({
                        title,
                        content,
                        raw_content: xmlData,
                        metadata: extractedData,
                        searchable_content: searchableContent
                    });
                }
                catch (error) {
                    this.logger.error('XML processing failed', {
                        endpoint: endpointName,
                        error: error.message
                    });
                    reject(new WebAdapterError(`XML processing failed: ${error.message}`, endpointName));
                }
            });
        });
    }
    processText(text, endpointName) {
        try {
            const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
            const title = lines[0] || 'Text Document';
            const content = text.trim();
            const searchableContent = this.generateSearchableContent(title, content, {});
            return {
                title,
                content,
                raw_content: text,
                metadata: { lines: lines.length, characters: text.length },
                searchable_content: searchableContent
            };
        }
        catch (error) {
            this.logger.error('Text processing failed', {
                endpoint: endpointName,
                error: error.message
            });
            throw new WebAdapterError(`Text processing failed: ${error.message}`, endpointName);
        }
    }
    htmlToMarkdown(html) {
        try {
            return this.turndownService.turndown(html);
        }
        catch (error) {
            this.logger.warn('HTML to Markdown conversion failed, using plain text', {
                error: error.message
            });
            const $ = cheerio.load(html);
            return $.root().text();
        }
    }
    extractHTMLMetadata($) {
        const metadata = {};
        $('meta').each((_, el) => {
            const name = $(el).attr('name') || $(el).attr('property');
            const content = $(el).attr('content');
            if (name && content) {
                metadata[name] = content;
            }
        });
        return metadata;
    }
    extractJSONTitle(data) {
        const titleFields = ['title', 'name', 'label', 'heading', 'subject'];
        for (const field of titleFields) {
            if (data[field] && typeof data[field] === 'string') {
                return data[field];
            }
        }
        for (const [, value] of Object.entries(data)) {
            if (typeof value === 'string' && value.length > 0 && value.length < 100) {
                return value;
            }
        }
        return 'JSON Document';
    }
    extractXMLTitle(data) {
        if (data.title)
            return String(data.title);
        if (data.name)
            return String(data.name);
        const keys = Object.keys(data);
        if (keys.length > 0) {
            return `XML Document (${keys[0]})`;
        }
        return 'XML Document';
    }
    jsonToMarkdown(data) {
        const lines = [];
        const processValue = (key, value, depth = 0) => {
            const indent = '  '.repeat(depth);
            if (Array.isArray(value)) {
                lines.push(`${indent}**${key}:**`);
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        lines.push(`${indent}- Item ${index + 1}:`);
                        Object.entries(item).forEach(([k, v]) => processValue(k, v, depth + 1));
                    }
                    else {
                        lines.push(`${indent}- ${item}`);
                    }
                });
            }
            else if (typeof value === 'object' && value !== null) {
                lines.push(`${indent}**${key}:**`);
                Object.entries(value).forEach(([k, v]) => processValue(k, v, depth + 1));
            }
            else {
                lines.push(`${indent}**${key}:** ${value}`);
            }
        };
        Object.entries(data).forEach(([key, value]) => processValue(key, value));
        return lines.join('\n');
    }
    generateSearchableContent(title, content, metadata) {
        const parts = [title, content];
        for (const value of Object.values(metadata)) {
            if (typeof value === 'string') {
                parts.push(value);
            }
            else if (Array.isArray(value)) {
                parts.push(...value.filter(v => typeof v === 'string'));
            }
        }
        return parts
            .join(' ')
            .replace(/\s+/g, ' ')
            .toLowerCase()
            .trim();
    }
    async checkRateLimit(endpoint) {
        const limit = endpoint.rate_limit || 60;
        const state = this.getOrCreateLimitState(endpoint.name);
        if (state.requestCount >= limit) {
            const waitTime = 60000 - (Date.now() - state.windowStart);
            if (waitTime > 0) {
                this.logger.info(`Rate limit reached for ${endpoint.name}, waiting ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                this.resetLimitWindow(endpoint.name);
            }
        }
        state.requestCount++;
    }
    getOrCreateLimitState(endpointName) {
        if (!this.rateLimitStates.has(endpointName)) {
            this.rateLimitStates.set(endpointName, {
                requestCount: 0,
                windowStart: Date.now()
            });
        }
        const state = this.rateLimitStates.get(endpointName);
        if (Date.now() - state.windowStart >= 60000) {
            this.resetLimitWindow(endpointName);
        }
        return state;
    }
    resetLimitWindow(endpointName) {
        this.rateLimitStates.set(endpointName, {
            requestCount: 0,
            windowStart: Date.now()
        });
    }
    convertToSearchResults(content, endpoint, _query) {
        const result = {
            id: this.generateDocumentId(endpoint.name, content.title),
            title: content.title,
            content: content.content,
            source: this.config.name,
            source_type: 'web',
            confidence_score: 0.8,
            match_reasons: [],
            retrieval_time_ms: 0,
            last_updated: new Date().toISOString(),
            metadata: {
                endpoint: endpoint.name,
                url: endpoint.url,
                content_type: endpoint.content_type,
                ...content.metadata
            }
        };
        return [result];
    }
    convertContentToSearchResult(content, source) {
        return {
            id: this.generateDocumentId(source, content.title),
            title: content.title,
            content: content.content,
            source: this.config.name,
            source_type: 'web',
            confidence_score: 1.0,
            match_reasons: ['Direct document access'],
            retrieval_time_ms: 0,
            last_updated: new Date().toISOString(),
            metadata: content.metadata
        };
    }
    calculateWebConfidence(result, query) {
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
        const endpointName = result.metadata?.endpoint?.toLowerCase() || '';
        if (endpointName.includes('runbook') || endpointName.includes('ops')) {
            confidence += 0.25;
        }
        else if (endpointName.includes('doc') || endpointName.includes('api')) {
            confidence += 0.15;
        }
        else {
            confidence += 0.1;
        }
        return Math.min(confidence, 1.0);
    }
    generateWebMatchReasons(result, query) {
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
        const endpointName = result.metadata?.endpoint?.toLowerCase() || '';
        if (endpointName.includes('runbook')) {
            reasons.push('Runbook endpoint');
        }
        else if (endpointName.includes('doc')) {
            reasons.push('Documentation endpoint');
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
                const endpointName = result.metadata?.endpoint?.toLowerCase() || '';
                return filters.categories.some(category => endpointName.includes(category.toLowerCase()));
            });
        }
        filtered.sort((a, b) => b.confidence_score - a.confidence_score);
        if (filters?.limit) {
            filtered = filtered.slice(0, filters.limit);
        }
        return filtered;
    }
    isLikelyRunbookContent(result, alertType, severity) {
        const content = result.content.toLowerCase();
        const title = result.title.toLowerCase();
        const endpoint = result.metadata?.endpoint?.toLowerCase() || '';
        const runbookKeywords = ['runbook', 'procedure', 'troubleshoot', 'incident', 'operations', 'ops'];
        const hasRunbookKeywords = runbookKeywords.some(keyword => title.includes(keyword) || content.includes(keyword) || endpoint.includes(keyword));
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
    generateDocumentId(endpoint, title) {
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        return `${endpoint}-${cleanTitle}`;
    }
    generateCacheKey(operation, params) {
        const paramString = JSON.stringify(params);
        const hash = Buffer.from(paramString).toString('base64').substring(0, 8);
        return `web:${operation}:${hash}`;
    }
    sanitizeHeaders(headers) {
        const sanitized = {};
        for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('key')) {
                sanitized[key] = '[REDACTED]';
            }
            else {
                sanitized[key] = String(value);
            }
        }
        return sanitized;
    }
    getResponseSize(response) {
        const contentLength = response.headers['content-length'];
        if (contentLength) {
            const bytes = parseInt(contentLength);
            return bytes > 1024 ? `${Math.round(bytes / 1024)}KB` : `${bytes}B`;
        }
        return 'unknown';
    }
}
exports.WebAdapter = WebAdapter;
