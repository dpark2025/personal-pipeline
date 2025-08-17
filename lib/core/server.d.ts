import { ConfigManager } from '../utils/config.js';
export declare class PersonalPipelineServer {
    private configManager;
    private mcpServer;
    private expressApp;
    private sourceRegistry;
    private mcpTools;
    private cacheService;
    private config;
    private isStarted;
    constructor(configManager?: ConfigManager);
    start(): Promise<void>;
    stop(): Promise<void>;
    getHealthStatus(): Promise<{
        status: 'healthy' | 'unhealthy';
        timestamp: string;
        version: string;
        sources: any[];
        cache?: any;
        uptime: number;
    }>;
    private setupExpress;
    private setupAPIRoutes;
    private countRoutes;
    private setupMCPHandlers;
    private initializeCacheService;
    private registerSourceAdapters;
    private initializeSourceAdapters;
    private startExpressServer;
    private startMCPServer;
    getDetailedHealthStatus(): Promise<{
        overall_status: 'healthy' | 'degraded' | 'unhealthy';
        components: Record<string, any>;
        summary: any;
        timestamp: string;
    }>;
    private formatPrometheusMetrics;
    private calculatePerformanceGrade;
    private checkPerformanceTargets;
    private identifyBottlenecks;
    private findOptimizationOpportunities;
    private analyzeResourceEfficiency;
    private getEfficiencyGrade;
    private getEfficiencyRecommendations;
}
export declare const personalPipelineServer: PersonalPipelineServer;
//# sourceMappingURL=server.d.ts.map