// Polyfill for Node.js compatibility with undici/web APIs - MUST BE FIRST
if (typeof globalThis.File === 'undefined') {
  // Basic File polyfill for Node.js environment
  globalThis.File = class File {
    constructor(bits: any, name: string, options?: any) {
      Object.defineProperty(this, 'name', { value: name, enumerable: true });
      Object.defineProperty(this, 'size', { value: 0, enumerable: true });
      Object.defineProperty(this, 'type', { value: options?.type || '', enumerable: true });
    }
  } as any;
}

// Additional web API polyfills for undici compatibility
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = class Blob {
    constructor(parts: any[] = [], options: any = {}) {
      Object.defineProperty(this, 'size', { value: 0, enumerable: true });
      Object.defineProperty(this, 'type', { value: options.type || '', enumerable: true });
    }
  } as any;
}

if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    private data = new Map();
    append(name: string, value: any) { this.data.set(name, value); }
    get(name: string) { return this.data.get(name); }
  } as any;
}

/**
 * Personal Pipeline MCP Server - Main Entry Point
 *
 * Intelligent MCP server for documentation retrieval and incident response.
 * Provides structured access to operational runbooks, procedures, and
 * 
 * BUILD TRIGGER: Disable Docker build, fix File API polyfill placement
 * decision trees through the Model Context Protocol.
 * 
 * Build trigger: Debug package validation errors - import test failure (adapter list fix)
 */

import 'dotenv/config';
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
