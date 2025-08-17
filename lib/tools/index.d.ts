import { Tool, CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SourceAdapterRegistry } from '../adapters/base.js';
import { CacheService, CacheContentType } from '../utils/cache.js';
export declare class PPMCPTools {
    private sourceRegistry;
    private cacheService;
    constructor(sourceRegistry: SourceAdapterRegistry, cacheService?: CacheService);
    getTools(): Tool[];
    getCacheStats(): {
        hits: number;
        misses: number;
        hit_rate: number;
        total_operations: number;
        last_reset: string;
        memory_usage_bytes?: number | undefined;
        redis_connected?: boolean | undefined;
        by_content_type?: Record<string, {
            hits: number;
            misses: number;
            hit_rate: number;
        }> | undefined;
    } | null;
    getCacheHealth(): Promise<{
        memory_cache: {
            healthy: boolean;
            response_time_ms: number;
            keys_count: number;
            memory_usage_mb: number;
        };
        overall_healthy: boolean;
        redis_cache?: {
            healthy: boolean;
            response_time_ms: number;
            connected: boolean;
            error_message?: string | undefined;
        } | undefined;
    } | null>;
    warmCache(criticalData: Array<{
        key: any;
        data: any;
    }>): Promise<void>;
    clearCacheByType(contentType: CacheContentType): Promise<void>;
    handleToolCall(request: CallToolRequest): Promise<CallToolResult>;
    getPerformanceMetrics(): {
        overall: import("../utils/performance.js").PerformanceMetrics;
        by_tool: {
            [k: string]: import("../utils/performance.js").ToolPerformanceData;
        };
        report: {
            summary: import("../utils/performance.js").PerformanceMetrics;
            tools: import("../utils/performance.js").ToolPerformanceData[];
            recommendations: string[];
            alerts: string[];
        };
    };
    private getSearchRunbooksTool;
    private getDecisionTreeTool;
    private getProcedureTool;
    private getEscalationPathTool;
    private getListSourcesTool;
    private getSearchKnowledgeBaseTool;
    private getRecordResolutionFeedbackTool;
    private searchRunbooks;
    private getDecisionTree;
    private getProcedure;
    private getEscalationPath;
    private listSources;
    private searchKnowledgeBase;
    private recordResolutionFeedback;
}
//# sourceMappingURL=index.d.ts.map