/**
 * Adapter exports for Personal Pipeline
 * 
 * Central export point for all source adapters
 */

export { SourceAdapter, SourceAdapterRegistry } from './base.js';
export { EnhancedFileSystemAdapter as FileSystemAdapter } from './file-enhanced.js';

// Future adapters will be exported here
// export { ConfluenceAdapter } from './confluence.js';
// export { GitHubAdapter } from './github.js';
// export { DatabaseAdapter } from './database.js';
// export { WebAdapter } from './web.js';
// export { DiscordAdapter } from './discord.js';