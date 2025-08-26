/**
 * Personal Pipeline MCP Server - Main Entry Point
 *
 * Intelligent MCP server for documentation retrieval and incident response.
 * Provides structured access to operational runbooks, procedures, and
 * 
 * BUILD TRIGGER: Fix service test config with required fields
 * decision trees through the Model Context Protocol.
 * 
 * Build trigger: Debug package validation errors - import test failure (adapter list fix)
 */

import 'dotenv/config';

// Check for help before any imports to avoid initialization overhead
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Personal Pipeline MCP Server v0.1.0

Usage: node dist/index.js [options]

Options:
  -c, --config <path>         Specify config file path (default: ./config/config.yaml)
  --create-sample-config      Create a sample configuration file and exit
  -h, --help                  Show this help message

Environment Variables:
  CONFIG_FILE                 Config file path (overridden by --config option)
  LOG_LEVEL                   Logging level (debug, info, warn, error)
  `);
  process.exit(0);
}

import { personalPipelineServer } from './core/server.js';
import { logger } from './utils/logger.js';
import { createSampleConfig } from './utils/config.js';

/**
 * Main server startup function
 */
async function main(): Promise<void> {
  try {

    logger.info('Starting Personal Pipeline MCP Server...', {
      version: '0.1.0',
      nodeVersion: process.version,
      platform: process.platform,
    });

    // Handle graceful shutdown
    setupGracefulShutdown();

    // Parse command-line arguments
    const configIndex = process.argv.findIndex(arg => arg === '--config' || arg === '-c');
    let configPath: string | undefined;
    
    if (configIndex !== -1 && configIndex + 1 < process.argv.length) {
      configPath = process.argv[configIndex + 1];
      logger.info(`Using explicit config file: ${configPath}`);
    }

    // Create sample configuration if needed
    if (process.argv.includes('--create-sample-config')) {
      await createSampleConfig();
      logger.info('Sample configuration created at ./config/config.sample.yaml');
      process.exit(0);
    }

    // Start the server with optional config path
    if (configPath) {
      // Create a new server instance with explicit config path
      const { PersonalPipelineServer } = await import('./core/server.js');
      const { ConfigManager } = await import('./utils/config.js');
      const serverWithCustomConfig = new PersonalPipelineServer(new ConfigManager(configPath));
      await serverWithCustomConfig.start();
    } else {
      // Use default server instance
      await personalPipelineServer.start();
    }

    logger.info('Personal Pipeline MCP Server is ready to accept connections');
  } catch (error) {
    logger.error('Failed to start Personal Pipeline MCP Server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, initiating graceful shutdown...`);

    try {
      await personalPipelineServer.stop();
      logger.info('Server stopped successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  };

  // Handle different termination signals
  process.on('SIGTERM', () => void shutdown('SIGTERM')); // eslint-disable-line @typescript-eslint/no-misused-promises
  process.on('SIGINT', () => void shutdown('SIGINT')); // eslint-disable-line @typescript-eslint/no-misused-promises

  // Handle uncaught exceptions and rejections
  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString(),
    });
    process.exit(1);
  });

  // Log when process is ready
  process.on('ready', () => {
    logger.info('Process is ready and listening for connections');
  });
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  });
}

// Re-export main classes and interfaces for library usage
export { PersonalPipelineServer } from './core/server.js';

// Export server instance for testing and programmatic usage
export { personalPipelineServer };

// Export types for TypeScript users
export * from './types/index.js';

// Export adapter framework
export * from './adapters/index.js';

// Export utilities  
export * from './utils/index.js';

// Export tools for advanced usage
export { PPMCPTools } from './tools/index.js';
