import 'dotenv/config';
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
async function main() {
    try {
        logger.info('Starting Personal Pipeline MCP Server...', {
            version: '0.1.0',
            nodeVersion: process.version,
            platform: process.platform,
        });
        setupGracefulShutdown();
        const configIndex = process.argv.findIndex(arg => arg === '--config' || arg === '-c');
        let configPath;
        if (configIndex !== -1 && configIndex + 1 < process.argv.length) {
            configPath = process.argv[configIndex + 1];
            logger.info(`Using explicit config file: ${configPath}`);
        }
        if (process.argv.includes('--create-sample-config')) {
            await createSampleConfig();
            logger.info('Sample configuration created at ./config/config.sample.yaml');
            process.exit(0);
        }
        if (configPath) {
            const { PersonalPipelineServer } = await import('./core/server.js');
            const { ConfigManager } = await import('./utils/config.js');
            const serverWithCustomConfig = new PersonalPipelineServer(new ConfigManager(configPath));
            await serverWithCustomConfig.start();
        }
        else {
            await personalPipelineServer.start();
        }
        logger.info('Personal Pipeline MCP Server is ready to accept connections');
    }
    catch (error) {
        logger.error('Failed to start Personal Pipeline MCP Server', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}
function setupGracefulShutdown() {
    const shutdown = async (signal) => {
        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        try {
            await personalPipelineServer.stop();
            logger.info('Server stopped successfully');
            process.exit(0);
        }
        catch (error) {
            logger.error('Error during shutdown', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        }
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
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
    process.on('ready', () => {
        logger.info('Process is ready and listening for connections');
    });
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Fatal error during startup:', error);
        process.exit(1);
    });
}
export { PersonalPipelineServer } from './core/server.js';
export { personalPipelineServer };
export * from './types/index.js';
export * from './adapters/index.js';
export * from './utils/index.js';
export { PPMCPTools } from './tools/index.js';
//# sourceMappingURL=index.js.map