/**
 * Configuration management for Personal Pipeline MCP Server
 *
 * Handles loading and validating configuration from YAML files
 * and environment variables.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { AppConfig, SourceConfig, ServerConfig } from '../types/index.js';
import { logger } from './logger.js';

export class ConfigManager {
  private config: AppConfig | null = null;
  private configPath: string;

  constructor(configPath: string = './config/config.yaml') {
    this.configPath = configPath;
  }

  /**
   * Load configuration from file and environment variables
   */
  async loadConfig(): Promise<AppConfig> {
    try {
      // Load base configuration from YAML file
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      const yamlConfig = yaml.parse(configContent);

      // Apply environment variable overrides
      const config = this.applyEnvironmentOverrides(yamlConfig);

      // Resolve relative paths before validation
      const resolvedConfig = this.resolveRelativePaths(config);

      // Validate configuration
      const validatedConfig = AppConfig.parse(resolvedConfig);

      this.config = validatedConfig;
      logger.info('Configuration loaded successfully', {
        configPath: this.configPath,
        sourceCount: validatedConfig.sources.length,
      });

      return validatedConfig;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // Configuration file doesn't exist, create default
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

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Reload configuration from file
   */
  async reloadConfig(): Promise<AppConfig> {
    logger.info('Reloading configuration');
    return this.loadConfig();
  }

  /**
   * Save current configuration to file
   */
  async saveConfig(config?: AppConfig): Promise<void> {
    const configToSave = config || this.config;
    if (!configToSave) {
      throw new Error('No configuration to save');
    }

    try {
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Convert to YAML and save
      const yamlContent = yaml.stringify(configToSave, {
        indent: 2,
        lineWidth: 120,
      });

      await fs.writeFile(this.configPath, yamlContent, 'utf-8');
      logger.info('Configuration saved successfully', {
        configPath: this.configPath,
      });
    } catch (error) {
      logger.error('Failed to save configuration', {
        error: error instanceof Error ? error.message : String(error),
        configPath: this.configPath,
      });
      throw error;
    }
  }

  /**
   * Add a new source to the configuration
   */
  addSource(sourceConfig: SourceConfig): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    // Check if source with same name already exists
    const existingIndex = this.config.sources.findIndex(s => s.name === sourceConfig.name);
    if (existingIndex >= 0) {
      this.config.sources[existingIndex] = sourceConfig;
      logger.info('Updated existing source configuration', {
        sourceName: sourceConfig.name,
      });
    } else {
      this.config.sources.push(sourceConfig);
      logger.info('Added new source configuration', {
        sourceName: sourceConfig.name,
      });
    }
  }

  /**
   * Remove a source from the configuration
   */
  removeSource(sourceName: string): boolean {
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

  /**
   * Update server configuration
   */
  updateServerConfig(serverConfig: Partial<ServerConfig>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    this.config.server = { ...this.config.server, ...serverConfig };
    logger.info('Updated server configuration', { changes: serverConfig });
  }

  /**
   * Resolve relative paths in configuration with intelligent path resolution
   */
  private resolveRelativePaths(config: any): any {
    if (!config.sources) {
      return config;
    }

    const configDir = path.dirname(path.resolve(this.configPath));
    const configDirParent = path.dirname(configDir); // Usually the project root for config/config.yaml
    
    // Create a deep copy to avoid mutating the original config
    const resolvedConfig = JSON.parse(JSON.stringify(config));
    
    // Helper function to resolve a single path with smart fallback logic
    const resolvePath = (originalPath: string, sourceName: string): string => {
      // Strategy 1: Try resolving relative to config file directory
      const configDirPath = path.resolve(configDir, originalPath);
      
      // Strategy 2: Try resolving relative to config file's parent directory (usually project root)
      const configParentPath = path.resolve(configDirParent, originalPath);
      
      // Use sync fs.access to check which path exists
      try {
        require('fs').accessSync(configDirPath);
        logger.debug('Resolved relative path (config dir)', {
          sourceName,
          originalPath,
          resolvedPath: configDirPath,
          configDir,
        });
        return configDirPath;
      } catch {
        // Config dir path doesn't exist, try config parent (project root)
        try {
          require('fs').accessSync(configParentPath);
          logger.debug('Resolved relative path (config parent)', {
            sourceName,
            originalPath,
            resolvedPath: configParentPath,
            configDirParent,
          });
          return configParentPath;
        } catch {
          // Neither path exists, default to config parent and let the adapter handle the error
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
    
    // Resolve base_url for each source
    for (const source of resolvedConfig.sources) {
      if (source.base_url && typeof source.base_url === 'string') {
        // Only resolve relative paths (those starting with ./ or ../)
        if (source.base_url.startsWith('./') || source.base_url.startsWith('../')) {
          source.base_url = resolvePath(source.base_url, source.name);
        }
      }
      
      // Also resolve base_paths if present
      if (source.base_paths && Array.isArray(source.base_paths)) {
        source.base_paths = source.base_paths.map((basePath: string) => {
          if (typeof basePath === 'string' && (basePath.startsWith('./') || basePath.startsWith('../'))) {
            return resolvePath(basePath, source.name);
          }
          return basePath;
        });
      }
    }

    return resolvedConfig;
  }

  /**
   * Create default configuration
   */
  private async createDefaultConfig(): Promise<AppConfig> {
    const defaultConfig: AppConfig = {
      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || 'localhost',
        log_level: (process.env.LOG_LEVEL as any) || 'info',
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
        // Default to memory-only unless Redis is explicitly configured
        strategy: (process.env.CACHE_STRATEGY as any) || (process.env.REDIS_URL ? 'hybrid' : 'memory_only'),
        memory: {
          max_keys: parseInt(process.env.CACHE_MEMORY_MAX_KEYS || '1000'),
          ttl_seconds: parseInt(process.env.CACHE_MEMORY_TTL_SECONDS || '3600'),
          check_period_seconds: parseInt(process.env.CACHE_MEMORY_CHECK_PERIOD_SECONDS || '600'),
        },
        redis: {
          // Only enable Redis if REDIS_URL is provided or explicitly enabled
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

    // Save default configuration
    await this.saveConfig(defaultConfig);
    this.config = defaultConfig;

    return defaultConfig;
  }

  /**
   * Apply environment variable overrides to configuration
   */
  private applyEnvironmentOverrides(config: any): any {
    const result = { ...config };

    // Server configuration overrides
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

    // Cache configuration overrides
    if (process.env.CACHE_TTL_SECONDS) {
      result.server = result.server || {};
      result.server.cache_ttl_seconds = parseInt(process.env.CACHE_TTL_SECONDS);
    }

    // Embedding configuration overrides
    if (process.env.ENABLE_EMBEDDINGS) {
      result.embedding = result.embedding || {};
      result.embedding.enabled = process.env.ENABLE_EMBEDDINGS === 'true';
    }

    if (process.env.EMBEDDING_MODEL) {
      result.embedding = result.embedding || {};
      result.embedding.model = process.env.EMBEDDING_MODEL;
    }

    // Apply environment variables to source configurations
    if (result.sources && Array.isArray(result.sources)) {
      result.sources = result.sources.map((source: any) => {
        const updatedSource = { ...source };

        // Apply auth environment variables
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

  /**
   * Watch configuration file for changes
   */
  async watchConfig(callback: (config: AppConfig) => void): Promise<void> {
    // Note: File watching is disabled in this implementation to avoid complexity.
    // In a production environment, you could implement this using chokidar or similar.
    logger.info('Configuration file watching is disabled in this implementation', {
      configPath: this.configPath,
    });

    // Callback parameter is kept for interface compatibility
    void callback;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();

// Helper function to get configuration
export async function getConfig(): Promise<AppConfig> {
  return configManager.loadConfig();
}

// Helper function to create a sample configuration file
export async function createSampleConfig(
  outputPath: string = './config/config.sample.yaml'
): Promise<void> {
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

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  // Write sample configuration
  const yamlContent = yaml.stringify(sampleConfig, {
    indent: 2,
    lineWidth: 120,
  });

  await fs.writeFile(outputPath, yamlContent, 'utf-8');
  logger.info('Sample configuration created', { outputPath });
}
