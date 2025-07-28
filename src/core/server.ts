/**
 * Personal Pipeline MCP Server
 *
 * Core MCP server implementation that provides intelligent documentation
 * retrieval for incident response and operational support.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ConfigManager } from '../utils/config';
import { logger, loggerStream } from '../utils/logger';
import { PPMCPTools } from '../tools';
import { SourceAdapterRegistry } from '../adapters/base';
import { FileSystemAdapter } from '../adapters/file';
import { AppConfig } from '../types';

export class PersonalPipelineServer {
  private mcpServer: Server;
  private expressApp: express.Application;
  private sourceRegistry: SourceAdapterRegistry;
  private mcpTools: PPMCPTools;
  private config: AppConfig | null = null;
  private isStarted: boolean = false;

  constructor(private configManager = new ConfigManager()) {
    this.mcpServer = new Server(
      {
        name: 'personal-pipeline-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.expressApp = express();
    this.sourceRegistry = new SourceAdapterRegistry();
    this.mcpTools = new PPMCPTools(this.sourceRegistry);

    this.setupExpress();
    this.setupMCPHandlers();
    this.registerSourceAdapters();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      logger.warn('Server is already started');
      return;
    }

    try {
      // Load configuration
      this.config = await this.configManager.loadConfig();
      logger.info('Configuration loaded', {
        sourceCount: this.config.sources.length,
        serverPort: this.config.server.port,
      });

      // Initialize source adapters
      await this.initializeSourceAdapters();

      // Start Express server for health checks
      await this.startExpressServer();

      // Start MCP server
      await this.startMCPServer();

      this.isStarted = true;
      logger.info('Personal Pipeline MCP Server started successfully', {
        mcpEnabled: true,
        httpPort: this.config.server.port,
        sourceCount: this.sourceRegistry.getAllAdapters().length,
      });
    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    logger.info('Stopping Personal Pipeline MCP Server...');

    try {
      // Cleanup source adapters
      await this.sourceRegistry.cleanup();

      // Close MCP server
      await this.mcpServer.close();

      this.isStarted = false;
      logger.info('Personal Pipeline MCP Server stopped successfully');
    } catch (error) {
      logger.error('Error during server shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get server health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    version: string;
    sources: any[];
    uptime: number;
  }> {
    try {
      const sourceHealthChecks = await this.sourceRegistry.healthCheckAll();
      const healthySources = sourceHealthChecks.filter(h => h.healthy).length;
      const totalSources = sourceHealthChecks.length;

      return {
        status: totalSources > 0 && healthySources / totalSources >= 0.5 ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        sources: sourceHealthChecks,
        uptime: process.uptime(),
      };
    } catch (error) {
      logger.error('Health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        sources: [],
        uptime: process.uptime(),
      };
    }
  }

  /**
   * Setup Express server for health checks and metrics
   */
  private setupExpress(): void {
    // Security middleware
    this.expressApp.use(helmet());
    this.expressApp.use(cors());

    // Request parsing
    this.expressApp.use(express.json({ limit: '10mb' }));
    this.expressApp.use(express.urlencoded({ extended: true }));

    // Request logging
    if (process.env.NODE_ENV !== 'test') {
      const morgan = require('morgan');
      this.expressApp.use(morgan('combined', { stream: loggerStream }));
    }

    // Health check endpoint
    this.expressApp.get('/health', async (_req, res) => {
      try {
        const health = await this.getHealthStatus();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });

    // Ready check endpoint (Kubernetes readiness probe)
    this.expressApp.get('/ready', (_req, res) => {
      if (this.isStarted) {
        res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
      } else {
        res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
      }
    });

    // Metrics endpoint
    this.expressApp.get('/metrics', async (_req, res) => {
      try {
        const adapters = this.sourceRegistry.getAllAdapters();
        const metrics = await Promise.all(
          adapters.map(async adapter => {
            try {
              return await adapter.getMetadata();
            } catch (error) {
              return {
                name: adapter.getConfig().name,
                type: adapter.getConfig().type,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          })
        );

        res.json({
          timestamp: new Date().toISOString(),
          version: '0.1.0',
          uptime: process.uptime(),
          sources: metrics,
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to collect metrics',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 404 handler
    this.expressApp.use('*', (_req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        timestamp: new Date().toISOString(),
      });
    });

    // Error handler
    this.expressApp.use(
      (error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        logger.error('Express error', {
          error: error.message,
          stack: error.stack,
          url: req.url,
          method: req.method,
        });

        res.status(500).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        });
      }
    );
  }

  /**
   * Setup MCP server handlers
   */
  private setupMCPHandlers(): void {
    // List tools handler
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Received list_tools request');

      const tools = this.mcpTools.getTools();

      const result: ListToolsResult = {
        tools,
      };

      logger.debug('Returning tools', { toolCount: tools.length });
      return result;
    });

    // Call tool handler
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      logger.info(`Received tool call: ${request.params.name}`, {
        tool: request.params.name,
        hasArguments: !!request.params.arguments,
      });

      try {
        const result = await this.mcpTools.handleToolCall(request);

        logger.info(`Tool call completed: ${request.params.name}`, {
          tool: request.params.name,
          success: !result.isError,
        });

        return result;
      } catch (error) {
        logger.error(`Tool call failed: ${request.params.name}`, {
          tool: request.params.name,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  message: error instanceof Error ? error.message : 'Unknown error',
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });

    // Error handler
    this.mcpServer.onerror = error => {
      logger.error('MCP Server error', {
        error: error instanceof Error ? error.message : String(error),
      });
    };
  }

  /**
   * Register source adapter factories
   */
  private registerSourceAdapters(): void {
    // Register file system adapter factory
    this.sourceRegistry.registerFactory('file', config => {
      return new FileSystemAdapter(config);
    });

    // TODO: Register other adapter factories when implemented
    // this.sourceRegistry.registerFactory('confluence', (config) => {
    //   return new ConfluenceAdapter(config);
    // });
    // this.sourceRegistry.registerFactory('github', (config) => {
    //   return new GitHubAdapter(config);
    // });

    logger.debug('Source adapter factories registered');
  }

  /**
   * Initialize source adapters from configuration
   */
  private async initializeSourceAdapters(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    logger.info('Initializing source adapters', {
      sourceCount: this.config.sources.length,
    });

    const initPromises = this.config.sources
      .filter(source => source.enabled)
      .map(async sourceConfig => {
        try {
          await this.sourceRegistry.createAdapter(sourceConfig);
          logger.info(`Initialized source adapter: ${sourceConfig.name}`, {
            type: sourceConfig.type,
            priority: sourceConfig.priority,
          });
        } catch (error) {
          logger.error(`Failed to initialize source adapter: ${sourceConfig.name}`, {
            type: sourceConfig.type,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with other adapters even if one fails
        }
      });

    await Promise.allSettled(initPromises);

    const initializedCount = this.sourceRegistry.getAllAdapters().length;
    logger.info('Source adapter initialization completed', {
      initializedCount,
      configuredCount: this.config.sources.length,
    });

    if (initializedCount === 0) {
      logger.warn('No source adapters were successfully initialized');
    }
  }

  /**
   * Start Express server
   */
  private async startExpressServer(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    return new Promise((resolve, reject) => {
      const server = this.expressApp.listen(
        this.config!.server.port,
        this.config!.server.host,
        () => {
          logger.info('Express server started', {
            host: this.config!.server.host,
            port: this.config!.server.port,
          });
          resolve();
        }
      );

      server.on('error', error => {
        logger.error('Express server error', { error });
        reject(error);
      });
    });
  }

  /**
   * Start MCP server
   */
  private async startMCPServer(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    logger.info('MCP server connected via stdio transport');
  }
}

// Export singleton instance for easy use
export const personalPipelineServer = new PersonalPipelineServer();
