import winston from 'winston';
export declare const logger: winston.Logger;
export declare const loggerStream: {
    write: (message: string) => void;
};
export declare const logHelpers: {
    toolCallStart: (toolName: string, args: any) => void;
    toolCallComplete: (toolName: string, executionTime: number, success: boolean) => void;
    toolCallError: (toolName: string, error: Error, executionTime: number) => void;
    adapterOperation: (adapterName: string, operation: string, details?: any) => void;
    performance: (operation: string, duration: number, metadata?: any) => void;
    healthCheck: (source: string, healthy: boolean, responseTime: number, error?: string) => void;
    configChange: (component: string, changes: any) => void;
    security: (event: string, details: any) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map