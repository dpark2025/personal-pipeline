import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { parseString as parseXML } from 'xml2js';
import { JSONPath } from 'jsonpath-plus';
export class ContentExtractor {
    logger;
    options;
    turndownService;
    robotsCache = new Map();
    stats = {
        totalProcessed: 0,
        successfulExtractions: 0,
        failedExtractions: 0,
        avgQualityScore: 0,
        contentTypeDistribution: new Map()
    };
    constructor(options, logger) {
        this.options = options;
        this.logger = logger.child({ component: 'ContentExtractor' });
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
            emDelimiter: '*',
            strongDelimiter: '**'
        });
        this.configureTurndownService();
    }
    async initialize() {
        this.logger.info('Initializing content extractor', {
            maxContentSizeMb: this.options.maxContentSizeMb,
            extractLinks: this.options.extractLinks,
            respectRobots: this.options.respectRobots
        });
        await this.runSelfTest();
        this.logger.info('Content extractor initialized successfully');
    }
    async extract(response, endpoint, source) {
        const startTime = Date.now();
        this.logger.debug('Starting content extraction', {
            url: response.url,
            contentType: response.contentType,
            contentLength: response.contentLength,
            endpoint: endpoint.name,
            source: source.name
        });
        try {
            if (this.exceedsContentSizeLimit(response)) {
                throw new Error(`Content size exceeds limit: ${response.contentLength} bytes`);
            }
            if (this.options.respectRobots && source.type === 'scraping') {
                const allowed = await this.checkRobotsAllowed(response.url);
                if (!allowed) {
                    throw new Error('Robots.txt disallows access to this resource');
                }
            }
            const contentType = this.detectContentType(response, endpoint);
            this.updateContentTypeStats(contentType);
            const extractedContent = await this.processContentByType(response, endpoint, source, contentType);
            const filteredContent = this.applyContentFilters(extractedContent, endpoint.filters);
            const qualityAssessment = this.assessContentQuality(filteredContent);
            this.updateStats(true, qualityAssessment.score);
            const duration = Date.now() - startTime;
            this.logger.info('Content extraction completed', {
                url: response.url,
                contentType,
                extractedCount: filteredContent.length,
                qualityScore: qualityAssessment.score,
                duration
            });
            return filteredContent;
        }
        catch (error) {
            this.updateStats(false, 0);
            this.logger.error('Content extraction failed', {
                url: response.url,
                error: error.message,
                endpoint: endpoint.name
            });
            throw error;
        }
    }
    getStats() {
        return {
            ...this.stats,
            contentTypeDistribution: Object.fromEntries(this.stats.contentTypeDistribution),
            successRate: this.stats.totalProcessed > 0
                ? this.stats.successfulExtractions / this.stats.totalProcessed
                : 0
        };
    }
    async cleanup() {
        this.logger.info('Cleaning up content extractor');
        this.robotsCache.clear();
        this.logger.info('Content extractor cleanup completed');
    }
    configureTurndownService() {
        this.turndownService.addRule('codeBlocks', {
            filter: ['pre'],
            replacement: (content, node) => {
                const language = node.getAttribute('data-language') ||
                    node.querySelector('code')?.getAttribute('class')?.replace('language-', '') || '';
                return `\n\n\`\`\`${language}\n${content}\n\`\`\`\n\n`;
            }
        });
        this.turndownService.addRule('tables', {
            filter: 'table',
            replacement: (content) => {
                return `\n\n${content}\n\n`;
            }
        });
        this.turndownService.addRule('removeScripts', {
            filter: ['script', 'style', 'noscript'],
            replacement: () => ''
        });
    }
    async runSelfTest() {
        try {
            const testHtml = '<html><body><h1>Test</h1><p>Content</p></body></html>';
            const $ = cheerio.load(testHtml);
            const title = $('h1').text();
            if (title !== 'Test') {
                throw new Error('HTML processing self-test failed');
            }
            const testJson = { title: 'Test', content: 'Content' };
            const jsonPath = JSONPath({ path: '$.title', json: testJson });
            if (jsonPath[0] !== 'Test') {
                throw new Error('JSON processing self-test failed');
            }
            const markdown = this.turndownService.turndown(testHtml);
            if (!markdown.includes('# Test')) {
                throw new Error('Markdown conversion self-test failed');
            }
            this.logger.debug('Content extractor self-test passed');
        }
        catch (error) {
            throw new Error(`Content extractor self-test failed: ${error.message}`);
        }
    }
    exceedsContentSizeLimit(response) {
        const maxBytes = this.options.maxContentSizeMb * 1024 * 1024;
        return response.contentLength > maxBytes;
    }
    async checkRobotsAllowed(url) {
        try {
            const urlObj = new URL(url);
            const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
            if (this.robotsCache.has(robotsUrl)) {
                return this.robotsCache.get(robotsUrl);
            }
            try {
                const response = await fetch(robotsUrl, {
                    signal: AbortSignal.timeout(5000),
                    headers: { 'User-Agent': 'PersonalPipeline-WebAdapter/1.0' }
                });
                if (response.ok) {
                    const robotsText = await response.text();
                    const allowed = this.parseRobotsTxt(robotsText, urlObj.pathname);
                    this.robotsCache.set(robotsUrl, allowed);
                    return allowed;
                }
            }
            catch {
            }
            this.robotsCache.set(robotsUrl, true);
            return true;
        }
        catch (error) {
            this.logger.warn('Error checking robots.txt', {
                url,
                error: error.message
            });
            return true;
        }
    }
    parseRobotsTxt(robotsText, path) {
        const lines = robotsText.split('\n').map(line => line.trim());
        let userAgentSection = false;
        let disallowedPaths = [];
        for (const line of lines) {
            if (line.startsWith('User-agent:')) {
                const userAgent = line.substring(11).trim();
                if (userAgent === '*' || userAgent.toLowerCase().includes('personalpipeline')) {
                    userAgentSection = true;
                }
                else {
                    userAgentSection = false;
                    disallowedPaths = [];
                }
            }
            else if (userAgentSection && line.startsWith('Disallow:')) {
                const disallowPath = line.substring(9).trim();
                if (disallowPath) {
                    disallowedPaths.push(disallowPath);
                }
            }
        }
        for (const disallowPath of disallowedPaths) {
            if (path.startsWith(disallowPath)) {
                return false;
            }
        }
        return true;
    }
    detectContentType(response, endpoint) {
        if (endpoint.content_type !== 'auto') {
            return endpoint.content_type;
        }
        const contentType = response.contentType.toLowerCase();
        if (contentType.includes('application/json')) {
            return 'json';
        }
        else if (contentType.includes('text/html')) {
            return 'html';
        }
        else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
            return 'xml';
        }
        else if (contentType.includes('application/rss') || contentType.includes('application/atom')) {
            return 'rss';
        }
        else {
            return 'text';
        }
    }
    async processContentByType(response, endpoint, source, contentType) {
        switch (contentType) {
            case 'html':
                return this.processHTML(response, endpoint, source);
            case 'json':
                return this.processJSON(response, endpoint, source);
            case 'xml':
                return await this.processXML(response, endpoint, source);
            case 'rss':
                return await this.processRSS(response, endpoint, source);
            case 'text':
                return this.processText(response, endpoint, source);
            default:
                throw new Error(`Unsupported content type: ${contentType}`);
        }
    }
    processHTML(response, endpoint, source) {
        try {
            const $ = cheerio.load(response.data);
            const selectors = endpoint.selectors || {};
            if (selectors.exclude) {
                selectors.exclude.forEach(excludeSelector => {
                    $(excludeSelector).remove();
                });
            }
            let title = '';
            if (selectors.title) {
                title = $(selectors.title).first().text().trim();
            }
            else {
                title = $('title').text().trim() ||
                    $('h1').first().text().trim() ||
                    $('[property="og:title"]').attr('content') ||
                    'Web Document';
            }
            let contentHtml = '';
            if (selectors.content) {
                contentHtml = $(selectors.content).html() || '';
            }
            else {
                $('script, style, nav, header, footer, aside, .sidebar, .navigation, .ads').remove();
                contentHtml = $('main').html() ||
                    $('article').html() ||
                    $('.content').html() ||
                    $('.post').html() ||
                    $('body').html() ||
                    response.data;
            }
            const markdown = this.htmlToMarkdown(contentHtml);
            const metadata = this.extractHTMLMetadata($);
            let links = [];
            if (this.options.extractLinks) {
                if (selectors.links) {
                    links = $(selectors.links).map((_, el) => $(el).attr('href')).get().filter(Boolean);
                }
                else {
                    links = $('a[href]').map((_, el) => $(el).attr('href')).get().filter(Boolean);
                }
                links = this.resolveRelativeUrls(links, response.url);
            }
            if (selectors.date) {
                const dateText = $(selectors.date).text().trim();
                if (dateText) {
                    metadata.published_date = dateText;
                }
            }
            if (selectors.author) {
                const authorText = $(selectors.author).text().trim();
                if (authorText) {
                    metadata.author = authorText;
                }
            }
            const searchableContent = this.generateSearchableContent(title, markdown, metadata);
            const extracted = {
                id: this.generateContentId(source.name, endpoint.name, title),
                title: title || 'Web Document',
                content: markdown,
                raw_content: response.data,
                metadata: {
                    content_type: 'html',
                    url: response.url,
                    status: response.status,
                    ...metadata
                },
                links,
                searchable_content: searchableContent,
                extracted_at: new Date().toISOString(),
                source_url: response.url
            };
            return [extracted];
        }
        catch (error) {
            throw new Error(`HTML processing failed: ${error.message}`);
        }
    }
    processJSON(response, endpoint, source) {
        try {
            const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            const jsonPaths = endpoint.json_paths || [];
            if (Array.isArray(data)) {
                return data.map((item, index) => this.processJSONItem(item, index, response, endpoint, source, jsonPaths));
            }
            return [this.processJSONItem(data, 0, response, endpoint, source, jsonPaths)];
        }
        catch (error) {
            throw new Error(`JSON processing failed: ${error.message}`);
        }
    }
    processJSONItem(data, index, response, endpoint, source, jsonPaths) {
        const extractedData = {};
        if (jsonPaths.length > 0) {
            for (const path of jsonPaths) {
                try {
                    const result = JSONPath({ path, json: data });
                    const pathKey = path.replace(/^\$\.?/, '').replace(/\[\*\]/g, '');
                    extractedData[pathKey] = result;
                }
                catch (error) {
                    this.logger.warn('JSONPath extraction failed', {
                        path,
                        error: error.message
                    });
                }
            }
        }
        else {
            Object.assign(extractedData, data);
        }
        const title = this.extractJSONTitle(extractedData, index);
        const content = this.jsonToMarkdown(extractedData);
        const searchableContent = this.generateSearchableContent(title, content, extractedData);
        return {
            id: this.generateContentId(source.name, endpoint.name, title),
            title,
            content,
            raw_content: JSON.stringify(data, null, 2),
            metadata: {
                content_type: 'json',
                url: response.url,
                status: response.status,
                index,
                ...extractedData
            },
            links: [],
            searchable_content: searchableContent,
            extracted_at: new Date().toISOString(),
            source_url: response.url
        };
    }
    async processXML(response, endpoint, source) {
        return new Promise((resolve, reject) => {
            parseXML(response.data, { explicitArray: false, mergeAttrs: true }, (err, result) => {
                if (err) {
                    reject(new Error(`XML parsing failed: ${err.message}`));
                    return;
                }
                try {
                    const extractedData = result || {};
                    const title = this.extractXMLTitle(extractedData);
                    const content = this.jsonToMarkdown(extractedData);
                    const searchableContent = this.generateSearchableContent(title, content, extractedData);
                    const extracted = {
                        id: this.generateContentId(source.name, endpoint.name, title),
                        title,
                        content,
                        raw_content: response.data,
                        metadata: {
                            content_type: 'xml',
                            url: response.url,
                            status: response.status,
                            ...extractedData
                        },
                        links: [],
                        searchable_content: searchableContent,
                        extracted_at: new Date().toISOString(),
                        source_url: response.url
                    };
                    resolve([extracted]);
                }
                catch (error) {
                    reject(new Error(`XML processing failed: ${error.message}`));
                }
            });
        });
    }
    async processRSS(response, endpoint, source) {
        try {
            const xmlResult = await this.processXML(response, endpoint, source);
            const content = xmlResult[0];
            const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            const $ = cheerio.load(data, { xmlMode: true });
            const items = [];
            $('item').each((index, element) => {
                const $item = $(element);
                const title = $item.find('title').text().trim();
                const description = $item.find('description').text().trim();
                const link = $item.find('link').text().trim();
                const pubDate = $item.find('pubDate').text().trim();
                if (title && description) {
                    items.push({
                        id: this.generateContentId(source.name, endpoint.name, `${title}-${index}`),
                        title,
                        content: description,
                        raw_content: $item.html() || '',
                        metadata: {
                            content_type: 'rss',
                            url: response.url,
                            status: response.status,
                            link,
                            published_date: pubDate,
                            item_index: index
                        },
                        links: link ? [link] : [],
                        searchable_content: this.generateSearchableContent(title, description, { link, pubDate }),
                        extracted_at: new Date().toISOString(),
                        source_url: response.url
                    });
                }
            });
            $('entry').each((index, element) => {
                const $entry = $(element);
                const title = $entry.find('title').text().trim();
                const summary = $entry.find('summary').text().trim();
                const content = $entry.find('content').text().trim();
                const link = $entry.find('link').attr('href') || '';
                const updated = $entry.find('updated').text().trim();
                const description = content || summary;
                if (title && description) {
                    items.push({
                        id: this.generateContentId(source.name, endpoint.name, `${title}-${index}`),
                        title,
                        content: description,
                        raw_content: $entry.html() || '',
                        metadata: {
                            content_type: 'atom',
                            url: response.url,
                            status: response.status,
                            link,
                            updated_date: updated,
                            entry_index: index
                        },
                        links: link ? [link] : [],
                        searchable_content: this.generateSearchableContent(title, description, { link, updated }),
                        extracted_at: new Date().toISOString(),
                        source_url: response.url
                    });
                }
            });
            return items.length > 0 ? items : [content];
        }
        catch (error) {
            throw new Error(`RSS processing failed: ${error.message}`);
        }
    }
    processText(response, endpoint, source) {
        try {
            const text = typeof response.data === 'string' ? response.data : String(response.data);
            const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
            const title = lines[0] || 'Text Document';
            const content = text.trim();
            const searchableContent = this.generateSearchableContent(title, content, {});
            const extracted = {
                id: this.generateContentId(source.name, endpoint.name, title),
                title,
                content,
                raw_content: text,
                metadata: {
                    content_type: 'text',
                    url: response.url,
                    status: response.status,
                    line_count: lines.length,
                    character_count: text.length
                },
                links: [],
                searchable_content: searchableContent,
                extracted_at: new Date().toISOString(),
                source_url: response.url
            };
            return [extracted];
        }
        catch (error) {
            throw new Error(`Text processing failed: ${error.message}`);
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
        $('meta[property^="og:"]').each((_, el) => {
            const property = $(el).attr('property');
            const content = $(el).attr('content');
            if (property && content) {
                metadata[property] = content;
            }
        });
        $('meta[name^="twitter:"]').each((_, el) => {
            const name = $(el).attr('name');
            const content = $(el).attr('content');
            if (name && content) {
                metadata[name] = content;
            }
        });
        return metadata;
    }
    extractJSONTitle(data, index) {
        const titleFields = ['title', 'name', 'label', 'heading', 'subject', 'summary'];
        for (const field of titleFields) {
            if (data[field] && typeof data[field] === 'string' && data[field].length > 0) {
                return data[field];
            }
        }
        for (const [_key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null) {
                for (const field of titleFields) {
                    if (value[field] && typeof value[field] === 'string') {
                        return value[field];
                    }
                }
            }
        }
        for (const [_key, value] of Object.entries(data)) {
            if (typeof value === 'string' && value.length > 0 && value.length < 100) {
                return value;
            }
        }
        return `JSON Document ${index + 1}`;
    }
    extractXMLTitle(data) {
        if (data.title)
            return String(data.title);
        if (data.name)
            return String(data.name);
        if (data.label)
            return String(data.label);
        if (data.rss?.channel?.title) {
            return String(data.rss.channel.title);
        }
        if (data.feed?.title) {
            return String(data.feed.title);
        }
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
            if (value === null || value === undefined) {
                lines.push(`${indent}**${key}:** null`);
            }
            else if (Array.isArray(value)) {
                lines.push(`${indent}**${key}:**`);
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
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
    resolveRelativeUrls(urls, baseUrl) {
        try {
            const base = new URL(baseUrl);
            return urls.map(url => {
                try {
                    if (url.startsWith('http://') || url.startsWith('https://')) {
                        return url;
                    }
                    if (url.startsWith('//')) {
                        return `${base.protocol}${url}`;
                    }
                    if (url.startsWith('/')) {
                        return `${base.protocol}//${base.host}${url}`;
                    }
                    return new URL(url, baseUrl).href;
                }
                catch {
                    return url;
                }
            });
        }
        catch {
            return urls;
        }
    }
    applyContentFilters(content, filters) {
        if (!filters) {
            return content;
        }
        return content.filter(item => {
            if (filters.min_content_length && item.content.length < filters.min_content_length) {
                return false;
            }
            if (filters.max_content_length && item.content.length > filters.max_content_length) {
                return false;
            }
            if (filters.include_patterns) {
                const includeMatch = filters.include_patterns.some(pattern => {
                    try {
                        const regex = new RegExp(pattern, 'i');
                        return regex.test(item.content) || regex.test(item.title);
                    }
                    catch {
                        return item.content.includes(pattern) || item.title.includes(pattern);
                    }
                });
                if (!includeMatch) {
                    return false;
                }
            }
            if (filters.exclude_patterns) {
                const excludeMatch = filters.exclude_patterns.some(pattern => {
                    try {
                        const regex = new RegExp(pattern, 'i');
                        return regex.test(item.content) || regex.test(item.title);
                    }
                    catch {
                        return item.content.includes(pattern) || item.title.includes(pattern);
                    }
                });
                if (excludeMatch) {
                    return false;
                }
            }
            if (filters.required_elements && item.metadata.content_type === 'html') {
                const hasRequired = filters.required_elements.every(selector => {
                    try {
                        const $ = cheerio.load(item.raw_content);
                        return $(selector).length > 0;
                    }
                    catch {
                        return false;
                    }
                });
                if (!hasRequired) {
                    return false;
                }
            }
            return true;
        });
    }
    assessContentQuality(content) {
        if (content.length === 0) {
            return {
                score: 0,
                factors: { length: 0, structure: 0, readability: 0, completeness: 0 },
                issues: ['No content extracted']
            };
        }
        const issues = [];
        let totalScore = 0;
        for (const item of content) {
            const factors = {
                length: this.assessContentLength(item),
                structure: this.assessContentStructure(item),
                readability: this.assessContentReadability(item),
                completeness: this.assessContentCompleteness(item)
            };
            const itemScore = (factors.length + factors.structure + factors.readability + factors.completeness) / 4;
            totalScore += itemScore;
            if (factors.length < 0.3)
                issues.push(`Low content length: ${item.title}`);
            if (factors.structure < 0.3)
                issues.push(`Poor structure: ${item.title}`);
            if (factors.readability < 0.3)
                issues.push(`Poor readability: ${item.title}`);
            if (factors.completeness < 0.3)
                issues.push(`Incomplete content: ${item.title}`);
        }
        const avgScore = totalScore / content.length;
        return {
            score: avgScore,
            factors: {
                length: content.reduce((sum, item) => sum + this.assessContentLength(item), 0) / content.length,
                structure: content.reduce((sum, item) => sum + this.assessContentStructure(item), 0) / content.length,
                readability: content.reduce((sum, item) => sum + this.assessContentReadability(item), 0) / content.length,
                completeness: content.reduce((sum, item) => sum + this.assessContentCompleteness(item), 0) / content.length
            },
            issues
        };
    }
    assessContentLength(content) {
        const length = content.content.length;
        if (length < 50)
            return 0.1;
        if (length < 200)
            return 0.4;
        if (length < 500)
            return 0.7;
        if (length < 2000)
            return 1.0;
        if (length < 10000)
            return 0.9;
        return 0.7;
    }
    assessContentStructure(content) {
        const text = content.content;
        let score = 0;
        if (text.includes('#'))
            score += 0.3;
        if (text.includes('- ') || text.includes('* ') || /^\d+\./m.test(text))
            score += 0.2;
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        if (paragraphs.length > 1)
            score += 0.3;
        if (text.includes('```'))
            score += 0.2;
        return Math.min(score, 1.0);
    }
    assessContentReadability(content) {
        const text = content.content;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        if (sentences.length === 0 || words.length === 0)
            return 0;
        const avgWordsPerSentence = words.length / sentences.length;
        const avgCharsPerWord = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        let score = 1.0;
        if (avgWordsPerSentence > 25 || avgWordsPerSentence < 5)
            score -= 0.3;
        if (avgCharsPerWord > 8 || avgCharsPerWord < 3)
            score -= 0.2;
        return Math.max(score, 0.1);
    }
    assessContentCompleteness(content) {
        let score = 0;
        if (content.title && content.title.length > 0)
            score += 0.3;
        if (content.content.length > 100)
            score += 0.4;
        if (Object.keys(content.metadata).length > 2)
            score += 0.2;
        if (this.options.extractLinks && content.links.length > 0)
            score += 0.1;
        return Math.min(score, 1.0);
    }
    generateContentId(sourceName, endpointName, title) {
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50);
        const timestamp = Date.now().toString(36);
        return `${sourceName}:${endpointName}:${cleanTitle}-${timestamp}`;
    }
    updateContentTypeStats(contentType) {
        const current = this.stats.contentTypeDistribution.get(contentType) || 0;
        this.stats.contentTypeDistribution.set(contentType, current + 1);
    }
    updateStats(success, qualityScore) {
        this.stats.totalProcessed++;
        if (success) {
            this.stats.successfulExtractions++;
            const total = this.stats.successfulExtractions;
            this.stats.avgQualityScore =
                ((this.stats.avgQualityScore * (total - 1)) + qualityScore) / total;
        }
        else {
            this.stats.failedExtractions++;
        }
    }
}
//# sourceMappingURL=content-extractor.js.map