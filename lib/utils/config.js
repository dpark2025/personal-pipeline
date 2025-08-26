import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { AppConfig } from '../types/index.js';
import { logger } from './logger.js';
export class ConfigManager {
    config = null;
    configPath;
    constructor(configPath = './config/config.yaml') {
        this.configPath = configPath;
    }
    async loadConfig() {
        try {
            const configContent = await fs.readFile(this.configPath, 'utf-8');
            const yamlConfig = yaml.parse(configContent);
            const config = this.applyEnvironmentOverrides(yamlConfig);
            const resolvedConfig = this.resolveRelativePaths(config);
            const validatedConfig = AppConfig.parse(resolvedConfig);
            this.config = validatedConfig;
            logger.info('Configuration loaded successfully', {
                configPath: this.configPath,
                sourceCount: validatedConfig.sources.length,
            });
            return validatedConfig;
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                logger.warn('Configuration file not found, creating default configuration');
                return this.createDefaultConfig();
            }
            logger.error('Failed to load configuration', {
                error: error instanceof Error ? error.message : String(error),
                configPath: this.configPath,
            });
            throw new Error(`Configuration loading failed: ${error}`);
        }
    }
    getConfig() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return this.config;
    }
    async reloadConfig() {
        logger.info('Reloading configuration');
        return this.loadConfig();
    }
    async saveConfig(config) {
        const configToSave = config || this.config;
        if (!configToSave) {
            throw new Error('No configuration to save');
        }
        try {
            const configDir = path.dirname(this.configPath);
            await fs.mkdir(configDir, { recursive: true });
            const yamlContent = yaml.stringify(configToSave, {
                indent: 2,
                lineWidth: 120,
            });
            await fs.writeFile(this.configPath, yamlContent, 'utf-8');
            logger.info('Configuration saved successfully', {
                configPath: this.configPath,
            });
        }
        catch (error) {
            logger.error('Failed to save configuration', {
                error: error instanceof Error ? error.message : String(error),
                configPath: this.configPath,
            });
            throw error;
        }
    }
    addSource(sourceConfig) {
        if (!this.config) {
            throw new Error('Configuration not loaded');
        }
        const existingIndex = this.config.sources.findIndex(s => s.name === sourceConfig.name);
        if (existingIndex >= 0) {
            this.config.sources[existingIndex] = sourceConfig;
            logger.info('Updated existing source configuration', {
                sourceName: sourceConfig.name,
            });
        }
        else {
            this.config.sources.push(sourceConfig);
            logger.info('Added new source configuration', {
                sourceName: sourceConfig.name,
            });
        }
    }
    removeSource(sourceName) {
        if (!this.config) {
            throw new Error('Configuration not loaded');
        }
        const initialLength = this.config.sources.length;
        this.config.sources = this.config.sources.filter(s => s.name !== sourceName);
        const removed = this.config.sources.length < initialLength;
        if (removed) {
            logger.info('Removed source configuration', { sourceName });
        }
        return removed;
    }
    updateServerConfig(serverConfig) {
        if (!this.config) {
            throw new Error('Configuration not loaded');
        }
        this.config.server = { ...this.config.server, ...serverConfig };
        logger.info('Updated server configuration', { changes: serverConfig });
    }
    resolveRelativePaths(config) {
        if (!config.sources) {
            return config;
        }
        const configDir = path.dirname(path.resolve(this.configPath));
        const configDirParent = path.dirname(configDir);
        const resolvedConfig = JSON.parse(JSON.stringify(config));
        const resolvePath = (originalPath, sourceName) => {
            const configDirPath = path.resolve(configDir, originalPath);
            const configParentPath = path.resolve(configDirParent, originalPath);
            try {
                require('fs').accessSync(configDirPath);
                logger.debug('Resolved relative path (config dir)', {
                    sourceName,
                    originalPath,
                    resolvedPath: configDirPath,
                    configDir,
                });
                return configDirPath;
            }
            catch {
                try {
                    require('fs').accessSync(configParentPath);
                    logger.debug('Resolved relative path (config parent)', {
                        sourceName,
                        originalPath,
                        resolvedPath: configParentPath,
                        configDirParent,
                    });
                    return configParentPath;
                }
                catch {
                    logger.warn('Path does not exist relative to config dir or parent, using config parent', {
                        sourceName,
                        originalPath,
                        configDirPath,
                        configParentPath,
                    });
                    return configParentPath;
                }
            }
        };
        for (const source of resolvedConfig.sources) {
            if (source.base_url && typeof source.base_url === 'string') {
                if (source.base_url.startsWith('./') || source.base_url.startsWith('../')) {
                    source.base_url = resolvePath(source.base_url, source.name);
                }
            }
            if (source.base_paths && Array.isArray(source.base_paths)) {
                source.base_paths = source.base_paths.map((basePath) => {
                    if (typeof basePath === 'string' && (basePath.startsWith('./') || basePath.startsWith('../'))) {
                        return resolvePath(basePath, source.name);
                    }
                    return basePath;
                });
            }
        }
        return resolvedConfig;
    }
    async createDefaultConfig() {
        const defaultConfig = {
            server: {
                port: parseInt(process.env.PORT || '3000'),
                host: process.env.HOST || 'localhost',
                log_level: process.env.LOG_LEVEL || 'info',
                cache_ttl_seconds: parseInt(process.env.CACHE_TTL_SECONDS || '3600'),
                max_concurrent_requests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '100'),
                request_timeout_ms: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
                health_check_interval_ms: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '60000'),
            },
            sources: [
                {
                    name: 'local-docs',
                    type: 'file',
                    base_url: './docs',
                    refresh_interval: '1h',
                    priority: 1,
                    enabled: true,
                    timeout_ms: 5000,
                    max_retries: 2,
                },
            ],
            cache: {
                enabled: process.env.CACHE_ENABLED !== 'false',
                strategy: process.env.CACHE_STRATEGY || (process.env.REDIS_URL ? 'hybrid' : 'memory_only'),
                memory: {
                    max_keys: parseInt(process.env.CACHE_MEMORY_MAX_KEYS || '1000'),
                    ttl_seconds: parseInt(process.env.CACHE_MEMORY_TTL_SECONDS || '3600'),
                    check_period_seconds: parseInt(process.env.CACHE_MEMORY_CHECK_PERIOD_SECONDS || '600'),
                },
                redis: {
                    enabled: process.env.REDIS_URL ? true : (process.env.REDIS_ENABLED === 'true'),
                    url: process.env.REDIS_URL || 'redis://localhost:6379',
                    ttl_seconds: parseInt(process.env.CACHE_REDIS_TTL_SECONDS || '7200'),
                    key_prefix: process.env.CACHE_REDIS_KEY_PREFIX || 'pp:cache:',
                    connection_timeout_ms: parseInt(process.env.REDIS_CONNECTION_TIMEOUT_MS || '5000'),
                    retry_attempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3'),
                    retry_delay_ms: parseInt(process.env.REDIS_RETRY_DELAY_MS || '1000'),
                    max_retry_delay_ms: parseInt(process.env.REDIS_MAX_RETRY_DELAY_MS || '30000'),
                    backoff_multiplier: parseFloat(process.env.REDIS_BACKOFF_MULTIPLIER || '2'),
                    connection_retry_limit: parseInt(process.env.REDIS_CONNECTION_RETRY_LIMIT || '5'),
                },
                content_types: {
                    runbooks: {
                        ttl_seconds: parseInt(process.env.CACHE_RUNBOOKS_TTL_SECONDS || '3600'),
                        warmup: process.env.CACHE_RUNBOOKS_WARMUP !== 'false',
                    },
                    procedures: {
                        ttl_seconds: parseInt(process.env.CACHE_PROCEDURES_TTL_SECONDS || '1800'),
                        warmup: process.env.CACHE_PROCEDURES_WARMUP === 'true',
                    },
                    decision_trees: {
                        ttl_seconds: parseInt(process.env.CACHE_DECISION_TREES_TTL_SECONDS || '2400'),
                        warmup: process.env.CACHE_DECISION_TREES_WARMUP !== 'false',
                    },
                    knowledge_base: {
                        ttl_seconds: parseInt(process.env.CACHE_KNOWLEDGE_BASE_TTL_SECONDS || '900'),
                        warmup: process.env.CACHE_KNOWLEDGE_BASE_WARMUP === 'true',
                    },
                    web_response: {
                        ttl_seconds: parseInt(process.env.CACHE_WEB_RESPONSE_TTL_SECONDS || '1800'),
                        warmup: process.env.CACHE_WEB_RESPONSE_WARMUP === 'true',
                    },
                },
            },
            embedding: {
                enabled: process.env.ENABLE_EMBEDDINGS !== 'false',
                model: process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
                cache_size: parseInt(process.env.EMBEDDING_CACHE_SIZE || '1000'),
            },
        };
        await this.saveConfig(defaultConfig);
        this.config = defaultConfig;
        return defaultConfig;
    }
    applyEnvironmentOverrides(config) {
        const result = { ...config };
        if (process.env.PORT) {
            result.server = result.server || {};
            result.server.port = parseInt(process.env.PORT);
        }
        if (process.env.HOST) {
            result.server = result.server || {};
            result.server.host = process.env.HOST;
        }
        if (process.env.LOG_LEVEL) {
            result.server = result.server || {};
            result.server.log_level = process.env.LOG_LEVEL;
        }
        if (process.env.CACHE_TTL_SECONDS) {
            result.server = result.server || {};
            result.server.cache_ttl_seconds = parseInt(process.env.CACHE_TTL_SECONDS);
        }
        if (process.env.ENABLE_EMBEDDINGS) {
            result.embedding = result.embedding || {};
            result.embedding.enabled = process.env.ENABLE_EMBEDDINGS === 'true';
        }
        if (process.env.EMBEDDING_MODEL) {
            result.embedding = result.embedding || {};
            result.embedding.model = process.env.EMBEDDING_MODEL;
        }
        if (result.sources && Array.isArray(result.sources)) {
            result.sources = result.sources.map((source) => {
                const updatedSource = { ...source };
                if (updatedSource.auth) {
                    if (updatedSource.auth.token_env && process.env[updatedSource.auth.token_env]) {
                        updatedSource.auth.token = process.env[updatedSource.auth.token_env];
                    }
                    if (updatedSource.auth.username_env && process.env[updatedSource.auth.username_env]) {
                        updatedSource.auth.username = process.env[updatedSource.auth.username_env];
                    }
                    if (updatedSource.auth.password_env && process.env[updatedSource.auth.password_env]) {
                        updatedSource.auth.password = process.env[updatedSource.auth.password_env];
                    }
                    if (updatedSource.auth.api_key_env && process.env[updatedSource.auth.api_key_env]) {
                        updatedSource.auth.api_key = process.env[updatedSource.auth.api_key_env];
                    }
                }
                return updatedSource;
            });
        }
        return result;
    }
    async watchConfig(callback) {
        logger.info('Configuration file watching is disabled in this implementation', {
            configPath: this.configPath,
        });
        void callback;
    }
}
export const configManager = new ConfigManager();
export async function getConfig() {
    return configManager.loadConfig();
}
export async function createSampleConfig(outputPath = './config/config.sample.yaml') {
    const sampleConfig = {
        server: {
            port: 3000,
            host: 'localhost',
            log_level: 'info',
            cache_ttl_seconds: 3600,
            max_concurrent_requests: 100,
            request_timeout_ms: 30000,
            health_check_interval_ms: 60000,
        },
        sources: [
            {
                name: 'confluence-ops',
                type: 'confluence',
                base_url: 'https://your-company.atlassian.net/wiki',
                auth: {
                    type: 'bearer_token',
                    token_env: 'CONFLUENCE_TOKEN',
                },
                refresh_interval: '1h',
                priority: 1,
                enabled: true,
                timeout_ms: 30000,
                max_retries: 3,
            },
            {
                name: 'github-docs',
                type: 'github',
                base_url: 'https://api.github.com/repos/your-org/docs',
                auth: {
                    type: 'bearer_token',
                    token_env: 'GITHUB_TOKEN',
                },
                refresh_interval: '30m',
                priority: 2,
                enabled: true,
                timeout_ms: 15000,
                max_retries: 2,
            },
            {
                name: 'local-runbooks',
                type: 'file',
                base_url: './runbooks',
                refresh_interval: '5m',
                priority: 3,
                enabled: true,
                timeout_ms: 5000,
                max_retries: 1,
            },
        ],
        cache: {
            enabled: true,
            strategy: 'hybrid',
            memory: {
                max_keys: 1000,
                ttl_seconds: 3600,
                check_period_seconds: 600,
            },
            redis: {
                enabled: true,
                url: 'redis://localhost:6379',
                ttl_seconds: 7200,
                key_prefix: 'pp:cache:',
                connection_timeout_ms: 5000,
                retry_attempts: 3,
                retry_delay_ms: 1000,
                max_retry_delay_ms: 30000,
                backoff_multiplier: 2,
                connection_retry_limit: 5,
            },
            content_types: {
                runbooks: {
                    ttl_seconds: 3600,
                    warmup: true,
                },
                procedures: {
                    ttl_seconds: 1800,
                    warmup: false,
                },
                decision_trees: {
                    ttl_seconds: 2400,
                    warmup: true,
                },
                knowledge_base: {
                    ttl_seconds: 900,
                    warmup: false,
                },
            },
        },
        embedding: {
            enabled: true,
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            cache_size: 1000,
        },
    };
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    const yamlContent = yaml.stringify(sampleConfig, {
        indent: 2,
        lineWidth: 120,
    });
    await fs.writeFile(outputPath, yamlContent, 'utf-8');
    logger.info('Sample configuration created', { outputPath });
}
