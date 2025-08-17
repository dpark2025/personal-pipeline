import { SourceConfig, SearchResult, SearchFilters, HealthCheck, Runbook } from '../types/index.js';
export declare abstract class SourceAdapter {
    protected config: SourceConfig;
    protected isInitialized: boolean;
    constructor(config: SourceConfig);
    abstract initialize(): Promise<void>;
    abstract search(query: string, filters?: SearchFilters): Promise<SearchResult[]>;
    abstract getDocument(id: string): Promise<SearchResult | null>;
    abstract searchRunbooks(alertType: string, severity: string, affectedSystems: string[], context?: Record<string, any>): Promise<Runbook[]>;
    abstract healthCheck(): Promise<HealthCheck>;
    abstract refreshIndex(force?: boolean): Promise<boolean>;
    configure(config: Partial<SourceConfig>): void;
    getConfig(): SourceConfig;
    isReady(): boolean;
    cleanup(): Promise<void>;
    abstract getMetadata(): Promise<{
        name: string;
        type: string;
        documentCount: number;
        lastIndexed: string;
        avgResponseTime: number;
        successRate: number;
    }>;
}
export declare class SourceAdapterRegistry {
    private adapters;
    private factories;
    registerFactory(type: string, factory: (config: SourceConfig) => SourceAdapter): void;
    createAdapter(config: SourceConfig): Promise<SourceAdapter>;
    getAdapter(name: string): SourceAdapter | undefined;
    getAllAdapters(): SourceAdapter[];
    removeAdapter(name: string): Promise<boolean>;
    healthCheckAll(): Promise<HealthCheck[]>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=base.d.ts.map