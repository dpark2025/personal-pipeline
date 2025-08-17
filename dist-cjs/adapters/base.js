"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceAdapterRegistry = exports.SourceAdapter = void 0;
class SourceAdapter {
    constructor(config) {
        this.isInitialized = false;
        this.config = config;
    }
    configure(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
    isReady() {
        return this.isInitialized;
    }
    async cleanup() {
        this.isInitialized = false;
    }
}
exports.SourceAdapter = SourceAdapter;
class SourceAdapterRegistry {
    constructor() {
        this.adapters = new Map();
        this.factories = new Map();
    }
    registerFactory(type, factory) {
        this.factories.set(type, factory);
    }
    async createAdapter(config) {
        const factory = this.factories.get(config.type);
        if (!factory) {
            throw new Error(`No factory registered for adapter type: ${config.type}`);
        }
        const adapter = factory(config);
        await adapter.initialize();
        this.adapters.set(config.name, adapter);
        return adapter;
    }
    getAdapter(name) {
        return this.adapters.get(name);
    }
    getAllAdapters() {
        return Array.from(this.adapters.values());
    }
    async removeAdapter(name) {
        const adapter = this.adapters.get(name);
        if (adapter) {
            await adapter.cleanup();
            return this.adapters.delete(name);
        }
        return false;
    }
    async healthCheckAll() {
        const healthChecks = await Promise.allSettled(Array.from(this.adapters.values()).map(adapter => adapter.healthCheck()));
        return healthChecks.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            else {
                const adapter = Array.from(this.adapters.values())[index];
                return {
                    source_name: adapter?.getConfig().name || 'unknown',
                    healthy: false,
                    response_time_ms: 0,
                    last_check: new Date().toISOString(),
                    error_message: result.reason?.message || 'Health check failed',
                };
            }
        });
    }
    async cleanup() {
        await Promise.all(Array.from(this.adapters.values()).map(adapter => adapter.cleanup()));
        this.adapters.clear();
    }
}
exports.SourceAdapterRegistry = SourceAdapterRegistry;
