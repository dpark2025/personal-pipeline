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
exports.logHelpers = exports.loggerStream = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston_1.default.addColors(colors);
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf(info => {
    const { timestamp, level, message, ...meta } = info;
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
        metaStr = ` ${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
}));
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'info';
};
const transports = [
    new winston_1.default.transports.Console({
        level: level(),
        format: consoleFormat,
    }),
    new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
    }),
    new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
    }),
];
exports.logger = winston_1.default.createLogger({
    level: level(),
    levels,
    transports,
    exitOnError: false,
});
exports.loggerStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
exports.logHelpers = {
    toolCallStart: (toolName, args) => {
        exports.logger.info(`MCP tool call started: ${toolName}`, {
            tool: toolName,
            arguments: args,
            timestamp: new Date().toISOString(),
        });
    },
    toolCallComplete: (toolName, executionTime, success) => {
        exports.logger.info(`MCP tool call completed: ${toolName}`, {
            tool: toolName,
            executionTimeMs: executionTime,
            success,
            timestamp: new Date().toISOString(),
        });
    },
    toolCallError: (toolName, error, executionTime) => {
        exports.logger.error(`MCP tool call failed: ${toolName}`, {
            tool: toolName,
            error: error.message,
            stack: error.stack,
            executionTimeMs: executionTime,
            timestamp: new Date().toISOString(),
        });
    },
    adapterOperation: (adapterName, operation, details) => {
        exports.logger.debug(`Adapter operation: ${adapterName}.${operation}`, {
            adapter: adapterName,
            operation,
            ...details,
            timestamp: new Date().toISOString(),
        });
    },
    performance: (operation, duration, metadata) => {
        exports.logger.info(`Performance: ${operation}`, {
            operation,
            durationMs: duration,
            ...metadata,
            timestamp: new Date().toISOString(),
        });
    },
    healthCheck: (source, healthy, responseTime, error) => {
        const level = healthy ? 'info' : 'warn';
        exports.logger.log(level, `Health check: ${source}`, {
            source,
            healthy,
            responseTimeMs: responseTime,
            error,
            timestamp: new Date().toISOString(),
        });
    },
    configChange: (component, changes) => {
        exports.logger.info(`Configuration change: ${component}`, {
            component,
            changes,
            timestamp: new Date().toISOString(),
        });
    },
    security: (event, details) => {
        exports.logger.warn(`Security event: ${event}`, {
            event,
            ...details,
            timestamp: new Date().toISOString(),
        });
    },
};
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
exports.default = exports.logger;
