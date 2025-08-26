export class UrlManager {
    logger;
    sources;
    urlTemplates = new Map();
    baseUrlCache = new Map();
    paginationState = new Map();
    constructor(sources, logger) {
        this.sources = sources;
        this.logger = logger.child({ component: 'UrlManager' });
    }
    async initialize() {
        this.logger.info('Initializing URL manager', {
            sourceCount: this.sources.length
        });
        for (const source of this.sources) {
            try {
                const baseUrl = new URL(source.base_url);
                this.baseUrlCache.set(source.name, baseUrl);
                this.logger.debug('Base URL validated', {
                    source: source.name,
                    baseUrl: source.base_url
                });
            }
            catch (error) {
                this.logger.error('Invalid base URL', {
                    source: source.name,
                    baseUrl: source.base_url,
                    error: error.message
                });
                throw new Error(`Invalid base URL for source ${source.name}: ${error.message}`);
            }
        }
        this.initializeUrlTemplates();
        this.logger.info('URL manager initialized successfully');
    }
    buildEndpointUrl(source, endpoint, params) {
        try {
            const baseUrl = this.baseUrlCache.get(source.name);
            if (!baseUrl) {
                throw new Error(`Base URL not found for source: ${source.name}`);
            }
            if (endpoint.path.startsWith('http://') || endpoint.path.startsWith('https://')) {
                return this.processUrlTemplate(endpoint.path, params);
            }
            const url = new URL(endpoint.path, baseUrl);
            const finalUrl = this.processUrlTemplate(url.href, params);
            this.logger.debug('Built endpoint URL', {
                source: source.name,
                endpoint: endpoint.name,
                url: finalUrl,
                params
            });
            return finalUrl;
        }
        catch (error) {
            this.logger.error('Failed to build endpoint URL', {
                source: source.name,
                endpoint: endpoint.name,
                error: error.message
            });
            throw error;
        }
    }
    buildHealthCheckUrl(source, healthPath) {
        try {
            const baseUrl = this.baseUrlCache.get(source.name);
            if (!baseUrl) {
                throw new Error(`Base URL not found for source: ${source.name}`);
            }
            const url = new URL(healthPath, baseUrl);
            return url.href;
        }
        catch (error) {
            this.logger.error('Failed to build health check URL', {
                source: source.name,
                healthPath,
                error: error.message
            });
            throw error;
        }
    }
    buildDocumentUrl(source, endpoint, documentId) {
        try {
            const baseUrl = this.buildEndpointUrl(source, endpoint);
            if (endpoint.path.includes('{id}') || endpoint.path.includes('${id}')) {
                return baseUrl.replace(/\{id\}|\$\{id\}/g, documentId);
            }
            const url = new URL(baseUrl);
            if (!url.pathname.endsWith('/')) {
                url.pathname += '/';
            }
            url.pathname += encodeURIComponent(documentId);
            return url.href;
        }
        catch (error) {
            this.logger.error('Failed to build document URL', {
                source: source.name,
                endpoint: endpoint.name,
                documentId,
                error: error.message
            });
            throw error;
        }
    }
    generatePaginatedUrls(source, endpoint, pagination, startPage = 1, maxPages = 10) {
        try {
            const baseUrl = this.buildEndpointUrl(source, endpoint);
            const _urls = [];
            const stateKey = `${source.name}:${endpoint.name}`;
            const state = this.paginationState.get(stateKey) || {
                currentPage: startPage,
                hasMore: true
            };
            switch (pagination.type) {
                case 'page_number':
                    return this.generatePageNumberUrls(baseUrl, pagination, state, maxPages);
                case 'offset':
                    return this.generateOffsetUrls(baseUrl, pagination, state, maxPages);
                case 'cursor':
                    return this.generateCursorUrls(baseUrl, pagination, state, maxPages);
                default:
                    throw new Error(`Unsupported pagination type: ${pagination.type}`);
            }
        }
        catch (error) {
            this.logger.error('Failed to generate paginated URLs', {
                source: source.name,
                endpoint: endpoint.name,
                error: error.message
            });
            throw error;
        }
    }
    validateUrl(urlString) {
        const issues = [];
        const suggestions = [];
        try {
            const url = new URL(urlString);
            if (!url.protocol.startsWith('http')) {
                issues.push('URL must use HTTP or HTTPS protocol');
            }
            if (!url.hostname) {
                issues.push('URL must have a valid hostname');
            }
            if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
                issues.push('Localhost URLs are not recommended for production');
                suggestions.push('Use a proper domain name for production environments');
            }
            if (url.pathname.includes('//')) {
                issues.push('URL contains double slashes in path');
                suggestions.push('Normalize path separators');
            }
            if (url.href.includes(' ')) {
                issues.push('URL contains unencoded spaces');
                suggestions.push('URL encode special characters');
            }
            const normalizedUrl = this.normalizeUrl(url);
            return {
                isValid: issues.length === 0,
                normalizedUrl: normalizedUrl.href,
                issues,
                suggestions
            };
        }
        catch (error) {
            return {
                isValid: false,
                issues: [`Invalid URL format: ${error.message}`],
                suggestions: ['Check URL syntax and ensure it includes protocol (http:// or https://)']
            };
        }
    }
    resolveRelativeUrl(relativeUrl, baseUrl) {
        try {
            const resolved = new URL(relativeUrl, baseUrl);
            return resolved.href;
        }
        catch (error) {
            this.logger.warn('Failed to resolve relative URL', {
                relativeUrl,
                baseUrl,
                error: error.message
            });
            return relativeUrl;
        }
    }
    extractDomainInfo(url) {
        try {
            const urlObj = new URL(url);
            const hostParts = urlObj.hostname.split('.');
            const tld = hostParts[hostParts.length - 1];
            const domain = hostParts.length > 1 ? hostParts[hostParts.length - 2] : hostParts[0];
            const subdomain = hostParts.length > 2 ? hostParts.slice(0, -2).join('.') : undefined;
            return {
                domain,
                subdomain,
                tld,
                port: urlObj.port ? parseInt(urlObj.port) : undefined
            };
        }
        catch (error) {
            throw new Error(`Failed to extract domain info: ${error.message}`);
        }
    }
    updatePaginationState(source, endpoint, page, hasMore, nextCursor, totalPages) {
        const stateKey = `${source.name}:${endpoint.name}`;
        this.paginationState.set(stateKey, {
            currentPage: page,
            hasMore,
            nextCursor,
            totalPages
        });
        this.logger.debug('Updated pagination state', {
            source: source.name,
            endpoint: endpoint.name,
            page,
            hasMore,
            totalPages
        });
    }
    getPaginationState(source, endpoint) {
        const stateKey = `${source.name}:${endpoint.name}`;
        return this.paginationState.get(stateKey);
    }
    async cleanup() {
        this.logger.info('Cleaning up URL manager');
        this.urlTemplates.clear();
        this.baseUrlCache.clear();
        this.paginationState.clear();
        this.logger.info('URL manager cleanup completed');
    }
    initializeUrlTemplates() {
        const commonTemplates = {
            search: {
                pattern: '/search?q=${query}',
                parameters: ['query'],
                examples: ['/search?q=documentation', '/search?q=api+guide']
            },
            document: {
                pattern: '/documents/${id}',
                parameters: ['id'],
                examples: ['/documents/123', '/documents/user-guide']
            },
            list: {
                pattern: '/items?page=${page}&limit=${limit}',
                parameters: ['page', 'limit'],
                examples: ['/items?page=1&limit=20', '/items?page=2&limit=50']
            },
            rss: {
                pattern: '/feed.xml',
                parameters: [],
                examples: ['/feed.xml', '/rss.xml']
            }
        };
        for (const [name, template] of Object.entries(commonTemplates)) {
            this.urlTemplates.set(name, template);
        }
    }
    processUrlTemplate(urlTemplate, params) {
        if (!params) {
            return urlTemplate;
        }
        let processedUrl = urlTemplate;
        for (const [key, value] of Object.entries(params)) {
            const placeholder1 = `\${${key}}`;
            const placeholder2 = `{${key}}`;
            processedUrl = processedUrl.replace(new RegExp(placeholder1, 'g'), encodeURIComponent(value));
            processedUrl = processedUrl.replace(new RegExp(placeholder2, 'g'), encodeURIComponent(value));
        }
        return processedUrl;
    }
    generatePageNumberUrls(baseUrl, pagination, state, maxPages) {
        const urls = [];
        const url = new URL(baseUrl);
        const startPage = state.currentPage;
        const endPage = Math.min(startPage + maxPages - 1, pagination.max_pages || startPage + maxPages - 1);
        for (let page = startPage; page <= endPage; page++) {
            const pageUrl = new URL(url);
            pageUrl.searchParams.set(pagination.page_param, page.toString());
            if (pagination.size_param) {
                pageUrl.searchParams.set(pagination.size_param, '20');
            }
            urls.push(pageUrl.href);
        }
        const hasMore = pagination.max_pages ? endPage < pagination.max_pages : true;
        return {
            urls,
            hasMore,
            totalPages: pagination.max_pages
        };
    }
    generateOffsetUrls(baseUrl, pagination, state, maxPages) {
        const urls = [];
        const url = new URL(baseUrl);
        const pageSize = 20;
        for (let i = 0; i < maxPages; i++) {
            const offset = (state.currentPage - 1 + i) * pageSize;
            const offsetUrl = new URL(url);
            offsetUrl.searchParams.set(pagination.page_param, offset.toString());
            if (pagination.size_param) {
                offsetUrl.searchParams.set(pagination.size_param, pageSize.toString());
            }
            urls.push(offsetUrl.href);
        }
        return {
            urls,
            hasMore: true
        };
    }
    generateCursorUrls(baseUrl, pagination, state, maxPages) {
        const urls = [];
        const url = new URL(baseUrl);
        if (state.nextCursor) {
            url.searchParams.set(pagination.page_param, state.nextCursor);
        }
        if (pagination.size_param) {
            url.searchParams.set(pagination.size_param, '20');
        }
        urls.push(url.href);
        return {
            urls,
            hasMore: state.hasMore,
            nextCursor: state.nextCursor
        };
    }
    normalizeUrl(url) {
        const normalized = new URL(url.href);
        if ((normalized.protocol === 'http:' && normalized.port === '80') ||
            (normalized.protocol === 'https:' && normalized.port === '443')) {
            normalized.port = '';
        }
        normalized.pathname = normalized.pathname.replace(/\/+/g, '/');
        if (normalized.pathname.length > 1 && normalized.pathname.endsWith('/')) {
            normalized.pathname = normalized.pathname.slice(0, -1);
        }
        const params = Array.from(normalized.searchParams.entries()).sort();
        normalized.search = '';
        for (const [key, value] of params) {
            normalized.searchParams.append(key, value);
        }
        return normalized;
    }
}
//# sourceMappingURL=url-manager.js.map