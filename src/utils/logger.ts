/**
 * Logging utility for Personal Pipeline MCP Server
 *
 * Provides structured logging with different levels and formats
 * for development and production environments.
 */

import winston from 'winston';

// Define log levels
const levels = {
  silent: -1, // Special level to disable all logging
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  silent: 'gray',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Create custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...meta } = info;
    let metaStr = '';

    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta, null, 2)}`;
    }

    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine log level based on environment
const level = () => {
  // Check LOG_LEVEL environment variable first
  const logLevel = process.env.LOG_LEVEL;
  if (
    logLevel &&
    ['silent', 'error', 'warn', 'info', 'http', 'debug'].includes(logLevel.toLowerCase())
  ) {
    return logLevel.toLowerCase();
  }

  // Fallback to NODE_ENV-based logic
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Create transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: level(),
    format: consoleFormat,
  }),

  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logHelpers = {
  /**
   * Log MCP tool call start
   */
  toolCallStart: (toolName: string, args: any) => {
    logger.info(`MCP tool call started: ${toolName}`, {
      tool: toolName,
      arguments: args,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log MCP tool call completion
   */
  toolCallComplete: (toolName: string, executionTime: number, success: boolean) => {
    logger.info(`MCP tool call completed: ${toolName}`, {
      tool: toolName,
      executionTimeMs: executionTime,
      success,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log MCP tool call error
   */
  toolCallError: (toolName: string, error: Error, executionTime: number) => {
    logger.error(`MCP tool call failed: ${toolName}`, {
      tool: toolName,
      error: error.message,
      stack: error.stack,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log source adapter operations
   */
  adapterOperation: (adapterName: string, operation: string, details?: any) => {
    logger.debug(`Adapter operation: ${adapterName}.${operation}`, {
      adapter: adapterName,
      operation,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log performance metrics
   */
  performance: (operation: string, duration: number, metadata?: any) => {
    logger.info(`Performance: ${operation}`, {
      operation,
      durationMs: duration,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log health check results
   */
  healthCheck: (source: string, healthy: boolean, responseTime: number, error?: string) => {
    const level = healthy ? 'info' : 'warn';
    logger.log(level, `Health check: ${source}`, {
      source,
      healthy,
      responseTimeMs: responseTime,
      error,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log configuration changes
   */
  configChange: (component: string, changes: any) => {
    logger.info(`Configuration change: ${component}`, {
      component,
      changes,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Log security events
   */
  security: (event: string, details: any) => {
    logger.warn(`Security event: ${event}`, {
      event,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },
};

// Create logs directory if it doesn't exist
import * as fs from 'fs';
import * as path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;
