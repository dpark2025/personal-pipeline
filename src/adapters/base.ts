/**
 * Base Source Adapter Interface
 *
 * All source adapters must implement this interface to provide
 * consistent access to documentation sources.
 */

import { SourceConfig, SearchResult, SearchFilters, HealthCheck, Runbook } from '../types/index.js';

/**
 * Abstract base class for all source adapters
 */
export abstract class SourceAdapter {
  protected config: SourceConfig;
  protected isInitialized: boolean = false;

  constructor(config: SourceConfig) {
    this.config = config;
  }

  /**
   * Initialize the adapter with configuration and authentication
   */
  abstract initialize(): Promise<void>;

  /**
   * Search for documentation across the source
   * @param query - Search query string
   * @param filters - Optional filters to refine search
   * @returns Array of search results with confidence scores
   */
  abstract search(query: string, filters?: SearchFilters): Promise<SearchResult[]>;

  /**
   * Retrieve a specific document by ID
   * @param id - Document identifier
   * @returns Single search result or null if not found
   */
  abstract getDocument(id: string): Promise<SearchResult | null>;

  /**
   * Search specifically for runbooks based on alert characteristics
   * @param alertType - Type of alert (e.g., "memory_pressure", "disk_full")
   * @param severity - Alert severity level
   * @param affectedSystems - Systems affected by the alert
   * @param context - Additional context for matching
   * @returns Array of relevant runbooks
   */
  abstract searchRunbooks(
    alertType: string,
    severity: string,
    affectedSystems: string[],
    context?: Record<string, any>
  ): Promise<Runbook[]>;

  /**
   * Check the health and availability of the source
   * @returns Health check result with status and metrics
   */
  abstract healthCheck(): Promise<HealthCheck>;

  /**
   * Refresh the cached content from the source
   * @param force - Force refresh even if cache is still valid
   * @returns Success indicator
   */
  abstract refreshIndex(force?: boolean): Promise<boolean>;

  /**
   * Configure the adapter with new settings
   * @param config - New configuration to apply
   */
  configure(config: Partial<SourceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current configuration
   */
  getConfig(): SourceConfig {
    return { ...this.config };
  }

  /**
   * Check if the adapter is properly initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup resources when shutting down
   */
  async cleanup(): Promise<void> {
    this.isInitialized = false;
  }

  /**
   * Get adapter-specific metadata and statistics
   */
  abstract getMetadata(): Promise<{
    name: string;
    type: string;
    documentCount: number;
    lastIndexed: string;
    avgResponseTime: number;
    successRate: number;
  }>;
}

/**
 * Registry for managing source adapters
 */
export class SourceAdapterRegistry {
  private adapters: Map<string, SourceAdapter> = new Map();
  private factories: Map<string, (config: SourceConfig) => SourceAdapter> = new Map();

  /**
   * Register a factory function for creating adapters of a specific type
   */
  registerFactory(type: string, factory: (config: SourceConfig) => SourceAdapter): void {
    this.factories.set(type, factory);
  }

  /**
   * Create and register a new adapter instance
   */
  async createAdapter(config: SourceConfig): Promise<SourceAdapter> {
    const factory = this.factories.get(config.type);
    if (!factory) {
      throw new Error(`No factory registered for adapter type: ${config.type}`);
    }

    const adapter = factory(config);
    await adapter.initialize();
    this.adapters.set(config.name, adapter);

    return adapter;
  }

  /**
   * Get an adapter by name
   */
  getAdapter(name: string): SourceAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): SourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Remove an adapter from the registry
   */
  async removeAdapter(name: string): Promise<boolean> {
    const adapter = this.adapters.get(name);
    if (adapter) {
      await adapter.cleanup();
      return this.adapters.delete(name);
    }
    return false;
  }

  /**
   * Health check all registered adapters
   */
  async healthCheckAll(): Promise<HealthCheck[]> {
    const healthChecks = await Promise.allSettled(
      Array.from(this.adapters.values()).map(adapter => adapter.healthCheck())
    );

    return healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
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

  /**
   * Cleanup all adapters
   */
  async cleanup(): Promise<void> {
    await Promise.all(Array.from(this.adapters.values()).map(adapter => adapter.cleanup()));
    this.adapters.clear();
  }
}
