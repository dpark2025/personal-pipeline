import winston from 'winston';
const levels = {
    silent: -1,
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const colors = {
    silent: 'gray',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston.addColors(colors);
const consoleFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.colorize({ all: true }), winston.format.printf(info => {
    const { timestamp, level, message, ...meta } = info;
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
        metaStr = ` ${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
}));
const fileFormat = winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json());
const level = () => {
    const logLevel = process.env.LOG_LEVEL;
    if (logLevel && ['silent', 'error', 'warn', 'info', 'http', 'debug'].includes(logLevel.toLowerCase())) {
        return logLevel.toLowerCase();
    }
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'info';
};
const transports = [
    new winston.transports.Console({
        level: level(),
        format: consoleFormat,
    }),
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
    }),
    new winston.transports.File({
        filename: 'logs/combined.log',
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
    }),
];
export const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
    exitOnError: false,
});
export const loggerStream = {
    write: (message) => {
        logger.http(message.trim());
    },
};
export const logHelpers = {
    toolCallStart: (toolName, args) => {
        logger.info(`MCP tool call started: ${toolName}`, {
            tool: toolName,
            arguments: args,
            timestamp: new Date().toISOString(),
        });
    },
    toolCallComplete: (toolName, executionTime, success) => {
        logger.info(`MCP tool call completed: ${toolName}`, {
            tool: toolName,
            executionTimeMs: executionTime,
            success,
            timestamp: new Date().toISOString(),
        });
    },
    toolCallError: (toolName, error, executionTime) => {
        logger.error(`MCP tool call failed: ${toolName}`, {
            tool: toolName,
            error: error.message,
            stack: error.stack,
            executionTimeMs: executionTime,
            timestamp: new Date().toISOString(),
        });
    },
    adapterOperation: (adapterName, operation, details) => {
        logger.debug(`Adapter operation: ${adapterName}.${operation}`, {
            adapter: adapterName,
            operation,
            ...details,
            timestamp: new Date().toISOString(),
        });
    },
    performance: (operation, duration, metadata) => {
        logger.info(`Performance: ${operation}`, {
            operation,
            durationMs: duration,
            ...metadata,
            timestamp: new Date().toISOString(),
        });
    },
    healthCheck: (source, healthy, responseTime, error) => {
        const level = healthy ? 'info' : 'warn';
        logger.log(level, `Health check: ${source}`, {
            source,
            healthy,
            responseTimeMs: responseTime,
            error,
            timestamp: new Date().toISOString(),
        });
    },
    configChange: (component, changes) => {
        logger.info(`Configuration change: ${component}`, {
            component,
            changes,
            timestamp: new Date().toISOString(),
        });
    },
    security: (event, details) => {
        logger.warn(`Security event: ${event}`, {
            event,
            ...details,
            timestamp: new Date().toISOString(),
        });
    },
};
import * as fs from 'fs';
import * as path from 'path';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
export default logger;
//# sourceMappingURL=logger.js.map