import { AppConfig, SourceConfig, ServerConfig } from '../types/index.js';
export declare class ConfigManager {
    private config;
    private configPath;
    constructor(configPath?: string);
    loadConfig(): Promise<AppConfig>;
    getConfig(): AppConfig;
    reloadConfig(): Promise<AppConfig>;
    saveConfig(config?: AppConfig): Promise<void>;
    addSource(sourceConfig: SourceConfig): void;
    removeSource(sourceName: string): boolean;
    updateServerConfig(serverConfig: Partial<ServerConfig>): void;
    private createDefaultConfig;
    private applyEnvironmentOverrides;
    watchConfig(callback: (config: AppConfig) => void): Promise<void>;
}
export declare const configManager: ConfigManager;
export declare function getConfig(): Promise<AppConfig>;
export declare function createSampleConfig(outputPath?: string): Promise<void>;
//# sourceMappingURL=config.d.ts.map