/**
 * Configuration management for Personal Pipeline MCP Server
 *
 * Handles loading and validating configuration from YAML files
 * and environment variables.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { AppConfig, SourceConfig, ServerConfig } from '../types';
import { logger } from './logger';

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

      // Validate configuration
      const validatedConfig = AppConfig.parse(config);

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
