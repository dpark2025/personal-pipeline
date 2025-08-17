/**
 * Personal Pipeline MCP Server - Main Entry Point
 *
 * Intelligent MCP server for documentation retrieval and incident response.
 * Provides structured access to operational runbooks, procedures, and
 * decision trees through the Model Context Protocol.
 */

import 'dotenv/config';
import { personalPipelineServer } from './core/server.js';
import { logger } from './utils/logger.js';
import { createSampleConfig } from './utils/config.js';

// Suppress ioredis unhandled error messages to stderr
const originalStderrWrite = process.stderr.write;
process.stderr.write = function (chunk: any, encoding?: any, callback?: any) {
  // Filter out ioredis unhandled error messages
  if (typeof chunk === 'string' && chunk.includes('[ioredis] Unhandled error event:')) {
    // Log it properly through our logger instead
    if (chunk.includes('connect ECONNREFUSED') && chunk.includes('6379')) {
      logger.debug('Suppressed ioredis unhandled error message', {
        message: 'Redis connection error handled by connection manager',
      });
    }
    return true; // Suppress the output
  }

  // For all other stderr output, use the original write function
  return originalStderrWrite.call(this, chunk, encoding, callback);
};

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

    // Create sample configuration if needed
    if (process.argv.includes('--create-sample-config')) {
      await createSampleConfig();
      logger.info('Sample configuration created at ./config/config.sample.yaml');
      process.exit(0);
    }

    // Start the server
    await personalPipelineServer.start();

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
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions and rejections
  process.on('uncaughtException', error => {
    // Check if this is a Redis connection error that we can safely ignore
    if (
      error.message &&
      error.message.includes('connect ECONNREFUSED') &&
      error.message.includes('6379')
    ) {
      logger.debug('Caught Redis connection error at process level', {
        error: error.message,
        message: 'This error is handled by the Redis connection manager',
      });
      return; // Don't exit for Redis connection errors
    }

    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    // Check if this is a Redis-related rejection
    if (
      reason instanceof Error &&
      reason.message &&
      reason.message.includes('connect ECONNREFUSED') &&
      reason.message.includes('6379')
    ) {
      logger.debug('Caught Redis rejection at process level', {
        reason: reason.message,
        message: 'This rejection is handled by the Redis connection manager',
      });
      return; // Don't exit for Redis connection rejections
    }

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

// Export server instance for testing and programmatic usage
export { personalPipelineServer };

// Re-export main classes and interfaces for library usage
export { PersonalPipelineServer } from './core/server.js';

// Export types for TypeScript users
export * from './types/index.js';

// Export adapter framework
export * from './adapters/index.js';

// Export utilities  
export * from './utils/index.js';

// Export tools for advanced usage
export { PPMCPTools } from './tools/index.js';
