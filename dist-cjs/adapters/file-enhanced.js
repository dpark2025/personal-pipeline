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
exports.EnhancedFileSystemAdapter = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const glob_1 = require("glob");
const file_type_1 = require("file-type");
const chokidar = __importStar(require("chokidar"));
let pdf;
const fuse_js_1 = __importDefault(require("fuse.js"));
const base_js_1 = require("./base.js");
const logger_js_1 = require("../utils/logger.js");
class EnhancedFileSystemAdapter extends base_js_1.SourceAdapter {
    constructor(config) {
        super(config);
        this.documents = new Map();
        this.searchIndex = null;
        this.watchers = [];
        this.indexingInProgress = false;
        this.basePaths = config.base_paths || [config.base_url || './docs'];
        this.supportedExtensions = config.supported_extensions || [
            '.md',
            '.txt',
            '.json',
            '.yml',
            '.yaml',
            '.pdf',
            '.rst',
            '.adoc',
        ];
        this.filePatterns = config.file_patterns ?? {};
        this.recursive = config.recursive ?? true;
        this.maxDepth = config.max_depth ?? 10;
        this.extractMetadata = config.extract_metadata ?? true;
        this.pdfExtraction = config.pdf_extraction ?? true;
        this.watchChanges = config.watch_changes ?? false;
    }
    async initialize() {
        try {
            logger_js_1.logger.info('Initializing Enhanced FileSystemAdapter', {
                basePaths: this.basePaths,
                recursive: this.recursive,
                maxDepth: this.maxDepth,
                supportedExtensions: this.supportedExtensions,
            });
            for (const basePath of this.basePaths) {
                try {
                    await fs.access(basePath);
                }
                catch (error) {
                    throw new Error(`Base path does not exist: ${basePath}`);
                }
            }
            await this.refreshIndex(true);
            if (this.watchChanges) {
                await this.setupFileWatchers();
            }
            this.isInitialized = true;
            logger_js_1.logger.info('Enhanced FileSystemAdapter initialized successfully', {
                documentCount: this.documents.size,
                watchersActive: this.watchers.length > 0,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to initialize Enhanced FileSystemAdapter', { error });
            throw new Error(`Failed to initialize FileSystemAdapter: ${error}`);
        }
    }
    async refreshIndex(force) {
        const fullReindex = force ?? false;
        if (this.indexingInProgress) {
            logger_js_1.logger.warn('Index refresh already in progress, skipping');
            return false;
        }
        this.indexingInProgress = true;
        const startTime = Date.now();
        try {
            logger_js_1.logger.info('Starting index refresh', { fullReindex });
            if (fullReindex) {
                this.documents.clear();
            }
            for (const basePath of this.basePaths) {
                await this.indexDirectory(basePath, basePath, 0);
            }
            this.buildSearchIndex();
            const duration = Date.now() - startTime;
            logger_js_1.logger.info('Index refresh completed', {
                duration,
                documentCount: this.documents.size,
                fullReindex,
            });
            return true;
        }
        catch (error) {
            logger_js_1.logger.error('Error during index refresh', { error });
            return false;
        }
        finally {
            this.indexingInProgress = false;
        }
    }
    async indexDirectory(dirPath, basePath, currentDepth) {
        if (!this.recursive && currentDepth > 0) {
            return;
        }
        if (currentDepth > this.maxDepth) {
            logger_js_1.logger.debug('Max depth reached, skipping directory', { dirPath, currentDepth });
            return;
        }
        try {
            const patterns = this.buildGlobPatterns(dirPath);
            const files = await (0, glob_1.glob)(patterns.include, {
                ignore: patterns.exclude,
                nodir: true,
                absolute: true,
            });
            for (const filePath of files) {
                await this.indexFile(filePath, basePath);
            }
            if (this.recursive && currentDepth < this.maxDepth) {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && !entry.name.startsWith('.')) {
                        const subDirPath = path.join(dirPath, entry.name);
                        await this.indexDirectory(subDirPath, basePath, currentDepth + 1);
                    }
                }
            }
        }
        catch (error) {
            logger_js_1.logger.error('Error indexing directory', { dirPath, error });
        }
    }
    buildGlobPatterns(dirPath) {
        const include = [];
        const exclude = [];
        if (this.filePatterns.include && this.filePatterns.include.length > 0) {
            include.push(...this.filePatterns.include.map(pattern => path.join(dirPath, pattern)));
        }
        else {
            include.push(...this.supportedExtensions.map(ext => path.join(dirPath, `*${ext}`)));
        }
        const defaultExcludes = [
            '**/.git/**',
            '**/node_modules/**',
            '**/.DS_Store',
            '**/dist/**',
            '**/build/**',
        ];
        exclude.push(...defaultExcludes);
        if (this.filePatterns.exclude) {
            exclude.push(...this.filePatterns.exclude);
        }
        return { include, exclude };
    }
    async indexFile(filePath, basePath) {
        try {
            const stats = await fs.stat(filePath);
            const maxSize = 10 * 1024 * 1024;
            if (stats.size > maxSize) {
                logger_js_1.logger.debug('Skipping large file', { filePath, size: stats.size });
                return;
            }
            const fileType = await this.detectFileType(filePath);
            if (!this.isSupported(filePath, fileType)) {
                return;
            }
            const content = await this.readFileContent(filePath, fileType);
            if (!content) {
                return;
            }
            const metadata = await this.extractFileMetadata(filePath, stats, fileType);
            const id = this.generateDocumentId(filePath);
            const relativePath = path.relative(basePath, filePath);
            const document = {
                id,
                path: filePath,
                relativePath,
                name: path.basename(filePath),
                content,
                searchableContent: this.extractSearchableContent(content, fileType),
                lastModified: stats.mtime,
                size: stats.size,
                type: path.extname(filePath),
                mimeType: fileType?.mime,
                metadata,
            };
            this.documents.set(id, document);
            logger_js_1.logger.debug('Indexed file', {
                filePath: relativePath,
                size: stats.size,
                mimeType: fileType?.mime,
            });
        }
        catch (error) {
            logger_js_1.logger.error('Error indexing file', { filePath, error });
        }
    }
    async detectFileType(filePath) {
        try {
            const fileType = await (0, file_type_1.fileTypeFromFile)(filePath);
            if (fileType) {
                return fileType;
            }
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap = {
                '.md': 'text/markdown',
                '.txt': 'text/plain',
                '.json': 'application/json',
                '.yml': 'text/yaml',
                '.yaml': 'text/yaml',
                '.pdf': 'application/pdf',
                '.rst': 'text/x-rst',
                '.adoc': 'text/asciidoc',
            };
            return {
                ext: ext.slice(1),
                mime: mimeMap[ext] || 'application/octet-stream',
            };
        }
        catch (error) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap = {
                '.md': 'text/markdown',
                '.txt': 'text/plain',
                '.json': 'application/json',
                '.yml': 'text/yaml',
                '.yaml': 'text/yaml',
                '.pdf': 'application/pdf',
                '.rst': 'text/x-rst',
                '.adoc': 'text/asciidoc',
            };
            return {
                ext: ext.slice(1),
                mime: mimeMap[ext] || 'application/octet-stream',
            };
        }
    }
    isSupported(filePath, fileType) {
        const ext = path.extname(filePath).toLowerCase();
        if (this.supportedExtensions.includes(ext)) {
            return true;
        }
        if (this.pdfExtraction && fileType?.mime === 'application/pdf') {
            return true;
        }
        return false;
    }
    async readFileContent(filePath, fileType) {
        try {
            if (this.pdfExtraction && fileType?.mime === 'application/pdf') {
                return await this.extractPdfText(filePath);
            }
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        }
        catch (error) {
            logger_js_1.logger.error('Error reading file content', { filePath, error });
            return null;
        }
    }
    async extractPdfText(filePath) {
        try {
            if (!pdf) {
                pdf = (await Promise.resolve().then(() => __importStar(require('pdf-parse')))).default;
            }
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        }
        catch (error) {
            logger_js_1.logger.error('Error extracting PDF text', { filePath, error });
            return null;
        }
    }
    extractSearchableContent(content, fileType) {
        if (fileType?.ext === 'md' || fileType?.mime === 'text/markdown') {
            const headings = content.match(/^#+\s+.+$/gm) || [];
            const lists = content.match(/^[\*\-\+]\s+.+$/gm) || [];
            return [
                ...headings,
                ...lists,
                content.slice(0, 500),
            ].join(' ');
        }
        if (fileType?.mime === 'application/json') {
            try {
                const json = JSON.parse(content);
                return this.extractJsonSearchableContent(json);
            }
            catch {
                return content.slice(0, 1000);
            }
        }
        return content.slice(0, 1000);
    }
    extractJsonSearchableContent(obj, depth = 0) {
        if (depth > 3)
            return '';
        const parts = [];
        if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                parts.push(key);
                if (typeof value === 'string') {
                    parts.push(value.slice(0, 100));
                }
                else if (typeof value === 'object') {
                    parts.push(this.extractJsonSearchableContent(value, depth + 1));
                }
            }
        }
        return parts.join(' ');
    }
    async extractFileMetadata(filePath, stats, fileType) {
        const metadata = {
            extension: path.extname(filePath),
            depth: filePath.split(path.sep).length - 1,
            directory: path.dirname(filePath),
            created: stats.birthtime,
            modified: stats.mtime,
        };
        if (this.extractMetadata) {
            if (fileType?.ext === 'md' || fileType?.mime === 'text/markdown') {
                const content = await fs.readFile(filePath, 'utf-8');
                const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                if (frontMatterMatch) {
                    try {
                        const { default: yaml } = await Promise.resolve().then(() => __importStar(require('yaml')));
                        const frontMatter = yaml.parse(frontMatterMatch[1] || '');
                        if (frontMatter.author)
                            metadata.author = frontMatter.author;
                        if (frontMatter.tags)
                            metadata.tags = frontMatter.tags;
                    }
                    catch (error) {
                        logger_js_1.logger.debug('Error parsing front matter', { filePath, error });
                    }
                }
            }
        }
        return metadata;
    }
    generateDocumentId(filePath) {
        return (0, crypto_1.createHash)('sha256').update(filePath).digest('hex');
    }
    buildSearchIndex() {
        const documents = Array.from(this.documents.values());
        this.searchIndex = new fuse_js_1.default(documents, {
            includeScore: true,
            threshold: 0.4,
            keys: [
                { name: 'name', weight: 0.3 },
                { name: 'searchableContent', weight: 0.5 },
                { name: 'content', weight: 0.2 },
                { name: 'metadata.tags', weight: 0.3 },
                { name: 'relativePath', weight: 0.1 },
            ],
            ignoreLocation: true,
            minMatchCharLength: 2,
        });
        logger_js_1.logger.debug('Search index built', { documentCount: documents.length });
    }
    async setupFileWatchers() {
        if (!this.watchChanges) {
            return;
        }
        logger_js_1.logger.info('Setting up file system watchers');
        for (const basePath of this.basePaths) {
            const watcher = chokidar.watch(basePath, {
                ignored: [
                    /(^|[\/\\])\../,
                    /node_modules/,
                    /.git/,
                    /dist/,
                    /build/,
                ],
                persistent: true,
                ignoreInitial: true,
                depth: this.recursive ? this.maxDepth : 0,
            });
            watcher
                .on('add', filePath => this.handleFileAdd(filePath, basePath))
                .on('change', filePath => this.handleFileChange(filePath, basePath))
                .on('unlink', filePath => this.handleFileRemove(filePath))
                .on('error', error => logger_js_1.logger.error('Watcher error', { error }));
            this.watchers.push(watcher);
        }
        logger_js_1.logger.info('File system watchers set up', { watcherCount: this.watchers.length });
    }
    async handleFileAdd(filePath, basePath) {
        logger_js_1.logger.debug('File added', { filePath });
        await this.indexFile(filePath, basePath);
        this.buildSearchIndex();
    }
    async handleFileChange(filePath, basePath) {
        logger_js_1.logger.debug('File changed', { filePath });
        await this.indexFile(filePath, basePath);
        this.buildSearchIndex();
    }
    handleFileRemove(filePath) {
        logger_js_1.logger.debug('File removed', { filePath });
        const id = this.generateDocumentId(filePath);
        if (this.documents.has(id)) {
            this.documents.delete(id);
            this.buildSearchIndex();
        }
    }
    async search(query, filters) {
        if (!this.searchIndex) {
            return [];
        }
        if (filters?.categories && filters.categories.length > 0) {
            const sourceCategories = this.config.categories || [];
            const hasMatchingCategory = filters.categories.some(category => sourceCategories.includes(category));
            if (!hasMatchingCategory) {
                return [];
            }
        }
        const searchOptions = {
            limit: 50,
            includeScore: true,
        };
        let results = this.searchIndex.search(query, searchOptions);
        if (results.length === 0) {
            const allDocuments = Array.from(this.documents.values());
            const exactMatches = allDocuments.filter(doc => {
                const searchContent = (doc.searchableContent || doc.content).toLowerCase();
                return searchContent.includes(query.toLowerCase());
            });
            results = exactMatches.map((doc, index) => ({
                item: doc,
                score: 0.1,
                refIndex: index,
            }));
        }
        if (filters?.confidence_threshold !== undefined) {
            const threshold = filters.confidence_threshold;
            results = results.filter(result => 1 - (result.score || 0) >= threshold);
        }
        return results.map(result => this.transformToSearchResult(result));
    }
    transformToSearchResult(fuseResult) {
        const doc = fuseResult.item;
        const confidence = 1 - (fuseResult.score || 0);
        return {
            id: doc.id,
            title: doc.name,
            content: doc.content,
            source: this.config.name,
            source_type: 'file',
            url: `file://${doc.path}`,
            confidence_score: confidence,
            last_updated: doc.lastModified.toISOString(),
            metadata: {
                file_path: doc.relativePath,
                file_type: doc.type,
                mime_type: doc.mimeType,
                last_modified: doc.lastModified.toISOString(),
                size: doc.size,
                ...doc.metadata,
            },
            match_reasons: this.generateMatchReasons(fuseResult),
            retrieval_time_ms: 0,
        };
    }
    generateMatchReasons(fuseResult) {
        const reasons = [];
        const matches = fuseResult.matches || [];
        for (const match of matches) {
            switch (match.key) {
                case 'name':
                    reasons.push('Filename match');
                    break;
                case 'searchableContent':
                    reasons.push('Content keyword match');
                    break;
                case 'metadata.tags':
                    reasons.push('Tag match');
                    break;
                case 'relativePath':
                    reasons.push('Path match');
                    break;
            }
        }
        if (reasons.length === 0) {
            reasons.push('General relevance');
        }
        return reasons;
    }
    async getDocument(id) {
        const doc = this.documents.get(id);
        if (!doc) {
            return null;
        }
        return {
            id: doc.id,
            title: doc.name,
            content: doc.content,
            source: this.config.name,
            source_type: 'file',
            url: `file://${doc.path}`,
            confidence_score: 1.0,
            last_updated: doc.lastModified.toISOString(),
            metadata: {
                file_path: doc.relativePath,
                file_type: doc.type,
                mime_type: doc.mimeType,
                last_modified: doc.lastModified.toISOString(),
                size: doc.size,
                ...doc.metadata,
            },
            match_reasons: ['Direct document retrieval'],
            retrieval_time_ms: 0,
        };
    }
    async searchRunbooks(alertType, severity, systems) {
        const queries = [
            alertType,
            `${alertType} ${severity}`,
            ...systems.map(system => `${system} ${alertType}`),
        ];
        const allResults = [];
        for (const query of queries) {
            const results = await this.search(query, { categories: ['runbooks'] });
            allResults.push(...results);
        }
        const uniqueResults = Array.from(new Map(allResults.map(result => [result.id, result])).values());
        const runbooks = [];
        for (const result of uniqueResults) {
            try {
                if (result.metadata?.mime_type === 'application/json') {
                    const runbook = JSON.parse(result.content);
                    if (this.isValidRunbook(runbook)) {
                        runbooks.push(runbook);
                    }
                }
                else {
                    const syntheticRunbook = this.createSyntheticRunbook(result, alertType, severity);
                    if (syntheticRunbook) {
                        runbooks.push(syntheticRunbook);
                    }
                }
            }
            catch (error) {
                logger_js_1.logger.debug('Error processing runbook', { title: result.title, error });
            }
        }
        return runbooks;
    }
    isValidRunbook(runbook) {
        return (runbook &&
            typeof runbook.id === 'string' &&
            typeof runbook.title === 'string' &&
            Array.isArray(runbook.triggers) &&
            runbook.decision_tree &&
            Array.isArray(runbook.procedures));
    }
    createSyntheticRunbook(_result, _alertType, _severity) {
        return null;
    }
    async healthCheck() {
        const startTime = Date.now();
        const issues = [];
        try {
            for (const basePath of this.basePaths) {
                try {
                    await fs.access(basePath);
                }
                catch (error) {
                    issues.push(`Base path inaccessible: ${basePath}`);
                }
            }
            if (this.documents.size === 0) {
                issues.push('No documents indexed');
            }
            if (!this.searchIndex) {
                issues.push('Search index not built');
            }
            if (this.watchChanges && this.watchers.length === 0) {
                issues.push('File watchers not active');
            }
            return {
                source_name: this.config.name,
                healthy: issues.length === 0,
                response_time_ms: Date.now() - startTime,
                last_check: new Date().toISOString(),
                error_message: issues.length > 0 ? issues.join('; ') : undefined,
                metadata: {
                    document_count: this.documents.size,
                    base_paths: this.basePaths,
                    watchers_active: this.watchers.length,
                    index_health: this.searchIndex ? 'healthy' : 'not built',
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
            type: 'file',
            documentCount: this.documents.size,
            lastIndexed: new Date().toISOString(),
            avgResponseTime: 50,
            successRate: 0.99,
        };
    }
    async cleanup() {
        logger_js_1.logger.info('Cleaning up Enhanced FileSystemAdapter');
        for (const watcher of this.watchers) {
            await watcher.close();
        }
        this.watchers = [];
        this.documents.clear();
        this.searchIndex = null;
        this.isInitialized = false;
        logger_js_1.logger.info('Enhanced FileSystemAdapter cleaned up');
    }
}
exports.EnhancedFileSystemAdapter = EnhancedFileSystemAdapter;
