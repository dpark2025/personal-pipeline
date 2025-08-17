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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PPMCPTools = exports.PersonalPipelineServer = exports.personalPipelineServer = void 0;
require("dotenv/config");
const server_js_1 = require("./core/server.js");
Object.defineProperty(exports, "personalPipelineServer", { enumerable: true, get: function () { return server_js_1.personalPipelineServer; } });
const logger_js_1 = require("./utils/logger.js");
const config_js_1 = require("./utils/config.js");
const originalStderrWrite = process.stderr.write;
process.stderr.write = function (chunk, encoding, callback) {
    if (typeof chunk === 'string' && chunk.includes('[ioredis] Unhandled error event:')) {
        if (chunk.includes('connect ECONNREFUSED') && chunk.includes('6379')) {
            logger_js_1.logger.debug('Suppressed ioredis unhandled error message', {
                message: 'Redis connection error handled by connection manager',
            });
        }
        return true;
    }
    return originalStderrWrite.call(this, chunk, encoding, callback);
};
async function main() {
    try {
        logger_js_1.logger.info('Starting Personal Pipeline MCP Server...', {
            version: '0.1.0',
            nodeVersion: process.version,
            platform: process.platform,
        });
        setupGracefulShutdown();
        if (process.argv.includes('--create-sample-config')) {
            await (0, config_js_1.createSampleConfig)();
            logger_js_1.logger.info('Sample configuration created at ./config/config.sample.yaml');
            process.exit(0);
        }
        await server_js_1.personalPipelineServer.start();
        logger_js_1.logger.info('Personal Pipeline MCP Server is ready to accept connections');
    }
    catch (error) {
        logger_js_1.logger.error('Failed to start Personal Pipeline MCP Server', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}
function setupGracefulShutdown() {
    const shutdown = async (signal) => {
        logger_js_1.logger.info(`Received ${signal}, initiating graceful shutdown...`);
        try {
            await server_js_1.personalPipelineServer.stop();
            logger_js_1.logger.info('Server stopped successfully');
            process.exit(0);
        }
        catch (error) {
            logger_js_1.logger.error('Error during shutdown', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        }
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', error => {
        if (error.message &&
            error.message.includes('connect ECONNREFUSED') &&
            error.message.includes('6379')) {
            logger_js_1.logger.debug('Caught Redis connection error at process level', {
                error: error.message,
                message: 'This error is handled by the Redis connection manager',
            });
            return;
        }
        logger_js_1.logger.error('Uncaught Exception', {
            error: error.message,
            stack: error.stack,
        });
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        if (reason instanceof Error &&
            reason.message &&
            reason.message.includes('connect ECONNREFUSED') &&
            reason.message.includes('6379')) {
            logger_js_1.logger.debug('Caught Redis rejection at process level', {
                reason: reason.message,
                message: 'This rejection is handled by the Redis connection manager',
            });
            return;
        }
        logger_js_1.logger.error('Unhandled Rejection', {
            reason: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined,
            promise: promise.toString(),
        });
        process.exit(1);
    });
    process.on('ready', () => {
        logger_js_1.logger.info('Process is ready and listening for connections');
    });
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Fatal error during startup:', error);
        process.exit(1);
    });
}
var server_js_2 = require("./core/server.js");
Object.defineProperty(exports, "PersonalPipelineServer", { enumerable: true, get: function () { return server_js_2.PersonalPipelineServer; } });
__exportStar(require("./types/index.js"), exports);
__exportStar(require("./adapters/index.js"), exports);
__exportStar(require("./utils/index.js"), exports);
var index_js_1 = require("./tools/index.js");
Object.defineProperty(exports, "PPMCPTools", { enumerable: true, get: function () { return index_js_1.PPMCPTools; } });
