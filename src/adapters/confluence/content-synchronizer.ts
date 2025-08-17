/**
 * Confluence Content Synchronizer - Real-time content synchronization
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Advanced synchronization system for Confluence content:
 * - Real-time change detection and monitoring
 * - Incremental synchronization with delta updates
 * - Intelligent conflict resolution
 * - Performance-optimized bulk operations
 * - Enterprise-scale synchronization patterns
 * - Comprehensive error handling and recovery
 */

import { EventEmitter } from 'events';
import { ApiClient } from './api-client.js';
import { ContentProcessor } from './content-processor.js';
import { ConfluencePageContent, ConfluenceSpace } from './confluence-adapter.js';
import { logger } from '../../utils/logger.js';

export interface SyncResult {
  spaces: ConfluenceSpace[];
  pages: ConfluencePageContent[];
  errors: Error[];
  metrics: SyncMetrics;
}

export interface SyncMetrics {
  totalSpaces: number;
  totalPages: number;
  newPages: number;
  updatedPages: number;
  deletedPages: number;
  errorCount: number;
  processingTime: number;
  avgPageProcessingTime: number;
}

export interface ChangeEvent {
  type: 'page_created' | 'page_updated' | 'page_deleted' | 'space_updated';
  spaceKey: string;
  pageId?: string;
  pageTitle?: string;
  timestamp: Date;
  author?: string;
}

export interface SyncOptions {
  incremental?: boolean;
  maxPages?: number;
  parallelism?: number;
  batchSize?: number;
  continueOnError?: boolean;
}

/**
 * Real-time content synchronization system
 */
export class ContentSynchronizer extends EventEmitter {
  private apiClient: ApiClient;
  private contentProcessor: ContentProcessor;
  
  // Synchronization state
  private lastSyncTime?: Date;
  private syncedPages: Map<string, { version: number; lastModified: string }> = new Map();
  private syncInProgress = false;
  private changeMonitoringActive = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  // Performance metrics
  private syncMetrics = {
    totalSyncs: 0,
    totalSyncTime: 0,
    avgSyncTime: 0,
    lastSyncDuration: 0,
    errorCount: 0,
    pagesProcessed: 0,
    avgPageProcessingTime: 0,
  };

  constructor(apiClient: ApiClient, contentProcessor: ContentProcessor) {
    super();
    this.apiClient = apiClient;
    this.contentProcessor = contentProcessor;
  }

  /**
   * Synchronize all accessible spaces
   */
  async syncAllSpaces(
    spaceKeys?: string[],
    maxPagesPerSpace?: number,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Synchronization already in progress');
    }

    const startTime = performance.now();
    this.syncInProgress = true;

    try {
      logger.info('Starting Confluence synchronization', {
        spaceKeys: spaceKeys?.length || 'all',
        maxPagesPerSpace,
        incremental: options.incremental,
      });

      // Get target spaces
      const targetSpaces = await this.getTargetSpaces(spaceKeys);
      
      if (targetSpaces.length === 0) {
        logger.warn('No accessible spaces found for synchronization');
        return this.createEmptySyncResult(startTime);
      }

      // Synchronize each space
      const allPages: ConfluencePageContent[] = [];
      const allErrors: Error[] = [];
      let totalMetrics: SyncMetrics = this.createEmptyMetrics();

      for (const space of targetSpaces) {
        try {
          logger.debug('Synchronizing space', { spaceKey: space.key, spaceName: space.name });
          
          const spaceResult = await this.syncSpace(space.key, maxPagesPerSpace, options);
          
          allPages.push(...spaceResult.pages);
          allErrors.push(...spaceResult.errors);
          totalMetrics = this.mergeMetrics(totalMetrics, spaceResult.metrics);

          this.emit('spaceSync', { spaceKey: space.key, pageCount: spaceResult.pages.length });

        } catch (error) {
          const syncError = new Error(`Failed to sync space ${space.key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          allErrors.push(syncError);
          
          if (!options.continueOnError) {
            throw syncError;
          }
          
          logger.warn('Space sync failed, continuing with next space', { 
            spaceKey: space.key, 
            error: syncError.message 
          });
        }
      }

      // Update synchronization state
      this.lastSyncTime = new Date();
      this.updateSyncMetrics(startTime);

      const result: SyncResult = {
        spaces: targetSpaces,
        pages: allPages,
        errors: allErrors,
        metrics: {
          ...totalMetrics,
          processingTime: performance.now() - startTime,
        },
      };

      logger.info('Confluence synchronization completed', {
        spacesProcessed: targetSpaces.length,
        pagesProcessed: allPages.length,
        errors: allErrors.length,
        duration: `${result.metrics.processingTime.toFixed(2)}ms`,
      });

      this.emit('syncComplete', result);
      return result;

    } catch (error) {
      this.syncMetrics.errorCount++;
      logger.error('Confluence synchronization failed', { error });
      this.emit('syncError', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Synchronize a specific space
   */
  async syncSpace(
    spaceKey: string,
    maxPages?: number,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = performance.now();

    try {
      logger.debug('Starting space synchronization', { spaceKey, maxPages });

      // Get space information
      const space = await this.apiClient.getSpace(spaceKey);
      if (!space) {
        throw new Error(`Space not found: ${spaceKey}`);
      }

      // Get pages to sync
      const pagesToSync = await this.getPagesToSync(spaceKey, maxPages, options);
      
      // Process pages
      const processedPages: ConfluencePageContent[] = [];
      const errors: Error[] = [];
      const defaultOptions: Required<SyncOptions> = {
        incremental: false,
        parallelism: 5,
        batchSize: 10,
        continueOnError: true,
        ...options,
      };

      // Process pages in batches
      for (let i = 0; i < pagesToSync.length; i += defaultOptions.batchSize) {
        const batch = pagesToSync.slice(i, i + defaultOptions.batchSize);
        
        try {
          const batchResults = await this.processBatch(batch, defaultOptions);
          processedPages.push(...batchResults.pages);
          errors.push(...batchResults.errors);
        } catch (error) {
          const batchError = new Error(`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errors.push(batchError);
          
          if (!defaultOptions.continueOnError) {
            throw batchError;
          }
        }

        // Emit progress
        this.emit('syncProgress', {
          spaceKey,
          processed: Math.min(i + defaultOptions.batchSize, pagesToSync.length),
          total: pagesToSync.length,
        });
      }

      // Update tracked pages
      this.updateTrackedPages(processedPages);

      const metrics = this.calculateSyncMetrics(
        processedPages,
        errors,
        performance.now() - startTime
      );

      const result: SyncResult = {
        spaces: [space],
        pages: processedPages,
        errors,
        metrics,
      };

      logger.debug('Space synchronization completed', {
        spaceKey,
        pagesProcessed: processedPages.length,
        errors: errors.length,
        duration: `${metrics.processingTime.toFixed(2)}ms`,
      });

      return result;

    } catch (error) {
      logger.error('Space synchronization failed', { spaceKey, error });
      throw error;
    }
  }

  /**
   * Start real-time change monitoring
   */
  async startChangeMonitoring(
    spaceKeys?: string[],
    intervalMinutes = 5
  ): Promise<void> {
    if (this.changeMonitoringActive) {
      logger.warn('Change monitoring already active');
      return;
    }

    this.changeMonitoringActive = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info('Starting Confluence change monitoring', {
      spaceKeys: spaceKeys?.length || 'all',
      intervalMinutes,
    });

    // Initial check for recent changes
    await this.checkForChanges(spaceKeys);

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForChanges(spaceKeys);
      } catch (error) {
        logger.error('Change monitoring check failed', { error });
        this.emit('monitoringError', error);
      }
    }, intervalMs);

    this.emit('monitoringStarted', { spaceKeys, intervalMinutes });
  }

  /**
   * Stop change monitoring
   */
  async stopChangeMonitoring(): Promise<void> {
    if (!this.changeMonitoringActive) {
      return;
    }

    this.changeMonitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Confluence change monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Get synchronization metrics
   */
  getMetrics() {
    return {
      ...this.syncMetrics,
      lastSyncTime: this.lastSyncTime?.toISOString(),
      syncInProgress: this.syncInProgress,
      changeMonitoringActive: this.changeMonitoringActive,
      trackedPages: this.syncedPages.size,
    };
  }

  /**
   * Force synchronization of specific pages
   */
  async forceSyncPages(pageIds: string[]): Promise<ConfluencePageContent[]> {
    const pages: ConfluencePageContent[] = [];

    for (const pageId of pageIds) {
      try {
        const page = await this.apiClient.getPage(pageId, {
          expand: 'body.storage,space,version,ancestors,metadata.labels',
        });

        if (page) {
          pages.push(page);
          this.updateTrackedPage(page);
        }
      } catch (error) {
        logger.warn('Failed to force sync page', { pageId, error });
      }
    }

    return pages;
  }

  // Private methods

  private async getTargetSpaces(spaceKeys?: string[]): Promise<ConfluenceSpace[]> {
    if (spaceKeys && spaceKeys.length > 0) {
      // Get specific spaces
      const spaces: ConfluenceSpace[] = [];
      for (const spaceKey of spaceKeys) {
        try {
          const space = await this.apiClient.getSpace(spaceKey);
          if (space) {
            spaces.push(space);
          }
        } catch (error) {
          logger.warn('Failed to get space', { spaceKey, error });
        }
      }
      return spaces;
    } else {
      // Get all accessible spaces
      return await this.apiClient.getSpaces({ limit: 100 });
    }
  }

  private async getPagesToSync(
    spaceKey: string,
    maxPages?: number,
    options: SyncOptions = {}
  ): Promise<ConfluencePageContent[]> {
    if (options.incremental && this.lastSyncTime) {
      // Get only pages updated since last sync
      return await this.apiClient.getRecentlyUpdated(
        this.lastSyncTime,
        [spaceKey],
        maxPages
      );
    } else {
      // Get all pages in the space
      return await this.apiClient.getAllSpacePages(spaceKey, maxPages);
    }
  }

  private async processBatch(
    pages: ConfluencePageContent[],
    options: Required<SyncOptions>
  ): Promise<{ pages: ConfluencePageContent[]; errors: Error[] }> {
    const processedPages: ConfluencePageContent[] = [];
    const errors: Error[] = [];

    // Process pages with controlled parallelism
    const promises: Promise<void>[] = [];
    const semaphore = new Array(options.parallelism).fill(null);

    for (const page of pages) {
      const promise = this.processPageWithSemaphore(page, semaphore, processedPages, errors);
      promises.push(promise);
    }

    await Promise.allSettled(promises);

    return { pages: processedPages, errors };
  }

  private async processPageWithSemaphore(
    page: ConfluencePageContent,
    semaphore: any[],
    processedPages: ConfluencePageContent[],
    errors: Error[]
  ): Promise<void> {
    // Wait for available slot
    await new Promise<void>((resolve) => {
      const checkSlot = () => {
        const availableIndex = semaphore.findIndex(slot => slot === null);
        if (availableIndex !== -1) {
          semaphore[availableIndex] = true;
          resolve();
        } else {
          setTimeout(checkSlot, 10);
        }
      };
      checkSlot();
    });

    try {
      // Check if page needs processing
      if (this.shouldProcessPage(page)) {
        // Process the page
        await this.contentProcessor.convertToSearchResult(page);
        processedPages.push(page);
        this.emit('pageProcessed', { pageId: page.id, title: page.title });
      }
    } catch (error) {
      const pageError = new Error(`Failed to process page ${page.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errors.push(pageError);
      logger.warn('Page processing failed', { pageId: page.id, error: pageError.message });
    } finally {
      // Release semaphore slot
      const occupiedIndex = semaphore.findIndex(slot => slot === true);
      if (occupiedIndex !== -1) {
        semaphore[occupiedIndex] = null;
      }
    }
  }

  private shouldProcessPage(page: ConfluencePageContent): boolean {
    const tracked = this.syncedPages.get(page.id);
    
    if (!tracked) {
      // New page
      return true;
    }

    // Check if page has been updated
    return tracked.version < page.version.number || 
           tracked.lastModified !== page.version.when;
  }

  private updateTrackedPages(pages: ConfluencePageContent[]): void {
    for (const page of pages) {
      this.updateTrackedPage(page);
    }
  }

  private updateTrackedPage(page: ConfluencePageContent): void {
    this.syncedPages.set(page.id, {
      version: page.version.number,
      lastModified: page.version.when,
    });
  }

  private async checkForChanges(spaceKeys?: string[]): Promise<void> {
    if (!this.lastSyncTime) {
      logger.debug('No previous sync time, skipping change check');
      return;
    }

    try {
      // Check for changes since last sync
      const cutoffTime = new Date(this.lastSyncTime.getTime() - 60000); // 1 minute buffer
      const recentPages = await this.apiClient.getRecentlyUpdated(
        cutoffTime,
        spaceKeys,
        100 // Limit to avoid overwhelming
      );

      if (recentPages.length > 0) {
        logger.info('Changes detected in Confluence', {
          changedPages: recentPages.length,
          since: cutoffTime.toISOString(),
        });

        // Emit change events
        for (const page of recentPages) {
          const changeEvent: ChangeEvent = {
            type: this.syncedPages.has(page.id) ? 'page_updated' : 'page_created',
            spaceKey: page.space.key,
            pageId: page.id,
            pageTitle: page.title,
            timestamp: new Date(page.version.when),
            author: page.version.by.displayName,
          };

          this.emit('change', changeEvent);
        }

        // Update tracked pages
        this.updateTrackedPages(recentPages);
      }

    } catch (error) {
      logger.error('Failed to check for changes', { error });
      throw error;
    }
  }

  private calculateSyncMetrics(
    pages: ConfluencePageContent[],
    errors: Error[],
    processingTime: number
  ): SyncMetrics {
    const newPages = pages.filter(page => !this.syncedPages.has(page.id)).length;
    const updatedPages = pages.length - newPages;

    return {
      totalSpaces: 1,
      totalPages: pages.length,
      newPages,
      updatedPages,
      deletedPages: 0, // Deletion detection would require more complex logic
      errorCount: errors.length,
      processingTime,
      avgPageProcessingTime: pages.length > 0 ? processingTime / pages.length : 0,
    };
  }

  private mergeMetrics(existing: SyncMetrics, additional: SyncMetrics): SyncMetrics {
    return {
      totalSpaces: existing.totalSpaces + additional.totalSpaces,
      totalPages: existing.totalPages + additional.totalPages,
      newPages: existing.newPages + additional.newPages,
      updatedPages: existing.updatedPages + additional.updatedPages,
      deletedPages: existing.deletedPages + additional.deletedPages,
      errorCount: existing.errorCount + additional.errorCount,
      processingTime: existing.processingTime + additional.processingTime,
      avgPageProcessingTime: (existing.avgPageProcessingTime + additional.avgPageProcessingTime) / 2,
    };
  }

  private createEmptyMetrics(): SyncMetrics {
    return {
      totalSpaces: 0,
      totalPages: 0,
      newPages: 0,
      updatedPages: 0,
      deletedPages: 0,
      errorCount: 0,
      processingTime: 0,
      avgPageProcessingTime: 0,
    };
  }

  private createEmptySyncResult(startTime: number): SyncResult {
    return {
      spaces: [],
      pages: [],
      errors: [],
      metrics: {
        ...this.createEmptyMetrics(),
        processingTime: performance.now() - startTime,
      },
    };
  }

  private updateSyncMetrics(startTime: number): void {
    const duration = performance.now() - startTime;
    
    this.syncMetrics.totalSyncs++;
    this.syncMetrics.totalSyncTime += duration;
    this.syncMetrics.avgSyncTime = this.syncMetrics.totalSyncTime / this.syncMetrics.totalSyncs;
    this.syncMetrics.lastSyncDuration = duration;
  }
}