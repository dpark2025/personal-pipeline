/**
 * Adapter exports for Personal Pipeline
 *
 * Central export point for all source adapters
 */

export { SourceAdapter, SourceAdapterRegistry } from './base.js';
export { EnhancedFileSystemAdapter as FileSystemAdapter } from './file-enhanced.js';
export { GitHubAdapter } from './github/index.js';
export { WebAdapter } from './web.js';
export { ConfluenceAdapter } from './confluence/index.js';

// Future adapters will be exported here
// export { DiscordAdapter } from './discord.js';
