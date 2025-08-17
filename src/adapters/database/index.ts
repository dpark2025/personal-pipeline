/**
 * Database Adapter - Enterprise Database Integration Package
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Complete Database adapter package for Personal Pipeline
 * with semantic search integration and enterprise multi-database support.
 */

export { DatabaseAdapter } from './database-adapter.js';
export { ConnectionManager } from './connection-manager.js';
export { QueryBuilder } from './query-builder.js';
export { ContentProcessor } from './content-processor.js';
export { SchemaDetector } from './schema-detector.js';
export { CacheManager } from './cache-manager.js';

export type {
  DatabaseAdapterOptions,
  DatabaseConfig,
  DatabaseSearchResult,
  DatabaseConnection,
  ConnectionOptions,
  DatabaseQuery,
  QueryResult,
  SchemaMapping,
  TableSchema,
  ColumnSchema,
} from './database-adapter.js';

export type {
  ConnectionPoolOptions,
  ConnectionHealth,
  DatabaseType,
  ConnectionStatus,
} from './connection-manager.js';

export type {
  QueryBuilderOptions,
  SearchQuery,
  FilterCondition,
  OrderByClause,
  JoinClause,
} from './query-builder.js';

export type {
  ContentProcessingOptions,
  ExtractedDatabaseContent,
  ContentMetrics,
  RunbookDetectionResult,
} from './content-processor.js';

export type {
  SchemaDetectionOptions,
  SchemaDetectionResult,
  TableInfo,
  ColumnInfo,
  RelationshipInfo,
} from './schema-detector.js';

export type {
  DatabaseCacheOptions,
  CacheStats,
  CacheEntry,
} from './cache-manager.js';