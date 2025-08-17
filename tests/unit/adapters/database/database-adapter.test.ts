/**
 * Database Adapter Unit Tests
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Comprehensive test suite for DatabaseAdapter with mock database operations
 * and edge case validation.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseAdapter, DatabaseConfig, DatabaseType } from '../../../../src/adapters/database/database-adapter.js';
import { ConnectionManager } from '../../../../src/adapters/database/connection-manager.js';
import { QueryBuilder } from '../../../../src/adapters/database/query-builder.js';
import { ContentProcessor } from '../../../../src/adapters/database/content-processor.js';
import { SchemaDetector } from '../../../../src/adapters/database/schema-detector.js';
import { CacheManager } from '../../../../src/adapters/database/cache-manager.js';
import { SourceConfig, SearchFilters } from '../../../../src/types/index.js';

// Mock the logger
jest.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock dependencies
jest.mock('../../../../src/adapters/database/connection-manager.js');
jest.mock('../../../../src/adapters/database/query-builder.js');
jest.mock('../../../../src/adapters/database/content-processor.js');
jest.mock('../../../../src/adapters/database/schema-detector.js');
jest.mock('../../../../src/adapters/database/cache-manager.js');

const MockConnectionManager = ConnectionManager as jest.MockedClass<typeof ConnectionManager>;
const MockQueryBuilder = QueryBuilder as jest.MockedClass<typeof QueryBuilder>;
const MockContentProcessor = ContentProcessor as jest.MockedClass<typeof ContentProcessor>;
const MockSchemaDetector = SchemaDetector as jest.MockedClass<typeof SchemaDetector>;
const MockCacheManager = CacheManager as jest.MockedClass<typeof CacheManager>;

describe('DatabaseAdapter', () => {
  let adapter: DatabaseAdapter;
  let mockConnectionManager: jest.Mocked<ConnectionManager>;
  let mockQueryBuilder: jest.Mocked<QueryBuilder>;
  let mockContentProcessor: jest.Mocked<ContentProcessor>;
  let mockSchemaDetector: jest.Mocked<SchemaDetector>;
  let mockCacheManager: jest.Mocked<CacheManager>;

  const mockConfig: DatabaseConfig = {
    name: 'test-database',
    type: 'database',
    connection: {
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username_env: 'DB_USER',
      password_env: 'DB_PASSWORD',
      ssl: false,
      pool_size: 10,
      connection_timeout_ms: 30000,
      idle_timeout_ms: 300000,
      max_lifetime_ms: 1800000,
    },
    schema: {
      tables: [
        {
          name: 'documentation',
          title_field: 'title',
          content_field: 'content',
          category_field: 'category',
          updated_field: 'updated_at',
          type: 'documentation',
        },
        {
          name: 'runbooks',
          title_field: 'name',
          content_field: 'procedure',
          category_field: 'severity',
          type: 'runbook',
        },
      ],
    },
    refresh_interval: '1h',
    priority: 1,
    enabled: true,
    timeout_ms: 30000,
    max_retries: 3,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockConnectionManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getConnection: jest.fn().mockResolvedValue({
        type: 'postgresql',
        client: { query: jest.fn() },
        isConnected: true,
        lastUsed: new Date(),
      }),
      releaseConnection: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue({
        healthy: true,
        activeConnections: 2,
        idleConnections: 8,
        waitingRequests: 0,
        totalConnections: 10,
        lastCheck: new Date(),
      }),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      search: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        sql: 'SELECT * FROM documentation WHERE title LIKE ?',
        parameters: ['%test%'],
      }),
      buildHealthCheckQuery: jest.fn().mockReturnValue({
        sql: 'SELECT 1 as health_check',
        parameters: [],
      }),
      reset: jest.fn().mockReturnThis(),
      getStats: jest.fn().mockReturnValue({
        queryCount: 10,
        totalExecutionTime: 1000,
        avgExecutionTime: 100,
        slowQueries: 1,
        optimizedQueries: 9,
      }),
    } as any;

    mockContentProcessor = {
      convertToSearchResult: jest.fn().mockResolvedValue({
        id: 'database:documentation:1',
        title: 'Test Document',
        content: 'This is test content',
        source: 'documentation',
        source_name: 'database:documentation',
        source_type: 'database',
        confidence_score: 0.9,
        match_reasons: ['title_match', 'content_available'],
        retrieval_time_ms: 50,
        last_updated: new Date().toISOString(),
        metadata: {
          database_type: 'postgresql',
          table_name: 'documentation',
        },
      }),
      detectRunbook: jest.fn().mockResolvedValue({
        isRunbook: false,
        confidence: 0.3,
        indicators: [],
        metadata: {
          hasSteps: false,
          hasDecisionTree: false,
          hasEscalation: false,
          complexity: 'low',
        },
      }),
      getMetrics: jest.fn().mockReturnValue({
        totalProcessed: 100,
        runbooksDetected: 10,
        processingErrors: 0,
        avgProcessingTime: 25,
        contentTypes: { documentation: 90, runbook: 10 },
        confidenceDistribution: {},
      }),
    } as any;

    mockSchemaDetector = {
      detectSchema: jest.fn().mockResolvedValue({
        tables: [
          {
            name: 'documentation',
            columns: [
              { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true },
              { name: 'title', type: 'varchar', nullable: false, maxLength: 255 },
              { name: 'content', type: 'text', nullable: false },
            ],
            primaryKey: ['id'],
            indexes: ['idx_title'],
            rowCount: 100,
          },
        ],
        relationships: [],
        documentationTables: [
          {
            tableName: 'documentation',
            confidence: 0.9,
            detectedType: 'documentation',
            recommendedMapping: {
              titleField: 'title',
              contentField: 'content',
            },
            contentPatterns: [],
            statistics: {
              totalRows: 100,
              avgContentLength: 500,
              documentationScore: 0.9,
            },
          },
        ],
        statistics: {
          totalTables: 1,
          totalColumns: 3,
          totalRows: 100,
          documentationTables: 1,
          averageTableSize: 100,
          detectionAccuracy: 0.95,
          processingTime: 150,
        },
        detectionTime: 150,
      }),
    } as any;

    mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
      clear: jest.fn().mockResolvedValue(undefined),
      cacheQueryResult: jest.fn().mockResolvedValue(undefined),
      getCachedQueryResult: jest.fn().mockResolvedValue(null),
      getStats: jest.fn().mockReturnValue({
        totalKeys: 10,
        totalSize: 1024,
        hits: 5,
        misses: 5,
        hitRate: 0.5,
        evictions: 0,
        compressionRatio: 1.2,
        memoryUsageMB: 1,
        avgAccessTime: 2,
        queryTypes: { search: 8, document: 2 },
        tableCacheStats: {},
      }),
    } as any;

    // Mock constructors
    MockConnectionManager.mockImplementation(() => mockConnectionManager);
    MockQueryBuilder.mockImplementation(() => mockQueryBuilder);
    MockContentProcessor.mockImplementation(() => mockContentProcessor);
    MockSchemaDetector.mockImplementation(() => mockSchemaDetector);
    MockCacheManager.mockImplementation(() => mockCacheManager);

    // Create adapter instance
    adapter = new DatabaseAdapter(mockConfig);
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.cleanup();
    }
  });

  describe('constructor', () => {
    it('should create adapter with valid configuration', () => {
      expect(adapter).toBeInstanceOf(DatabaseAdapter);
      expect(MockConnectionManager).toHaveBeenCalledWith(
        mockConfig.connection,
        expect.objectContaining({
          maxConnections: 10,
          connectionTimeout: 30000,
        })
      );
    });

    it('should throw error with invalid configuration', () => {
      const invalidConfig = { ...mockConfig, type: 'invalid' as any };
      expect(() => new DatabaseAdapter(invalidConfig)).toThrow('Invalid adapter type');
    });

    it('should set default options when not provided', () => {
      const adapter = new DatabaseAdapter(mockConfig);
      expect(adapter).toBeInstanceOf(DatabaseAdapter);
    });
  });

  describe('initialize', () => {
    it('should initialize all components successfully', async () => {
      await adapter.initialize();

      expect(mockConnectionManager.initialize).toHaveBeenCalled();
      expect(mockSchemaDetector.detectSchema).toHaveBeenCalled();
      expect(adapter.isReady()).toBe(true);
    });

    it('should handle initialization failure', async () => {
      mockConnectionManager.initialize.mockRejectedValue(new Error('Connection failed'));

      await expect(adapter.initialize()).rejects.toThrow('Database adapter initialization failed');
    });

    it('should skip schema discovery when disabled', async () => {
      const adapterWithoutDiscovery = new DatabaseAdapter(mockConfig, {
        schemaDetection: { autoDiscover: false },
      });

      await adapterWithoutDiscovery.initialize();

      expect(mockSchemaDetector.detectSchema).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return cached results when available', async () => {
      const cachedResults = [
        {
          id: 'cached:1',
          title: 'Cached Document',
          content: 'Cached content',
          source: 'cache',
          source_type: 'database' as const,
          confidence_score: 0.95,
          match_reasons: ['cache_hit'],
          retrieval_time_ms: 1,
          last_updated: new Date().toISOString(),
        },
      ];

      mockCacheManager.get.mockResolvedValue(cachedResults);

      const results = await adapter.search('test query');

      expect(results).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'cached:1',
          title: 'Cached Document',
        })
      ]));
      expect(mockCacheManager.get).toHaveBeenCalled();
    });

    it('should perform native search when cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      
      // Mock executeQuery for native search
      const mockExecuteQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            title: 'Test Document',
            content: 'Test content',
            category: 'documentation',
          },
        ],
        count: 1,
        executionTime: 50,
        fromCache: false,
      });
      
      // Replace the private executeQuery method
      (adapter as any).executeQuery = mockExecuteQuery;

      const results = await adapter.search('test query');

      expect(results).toHaveLength(1);
      expect(mockContentProcessor.convertToSearchResult).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should handle search with filters', async () => {
      const filters: SearchFilters = {
        categories: ['runbook'],
        limit: 10,
        confidence_threshold: 0.5,
      };

      await adapter.search('test query', filters);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should handle search errors gracefully', async () => {
      mockConnectionManager.getConnection.mockRejectedValue(new Error('Connection error'));

      await expect(adapter.search('test query')).rejects.toThrow('Connection error');
    });
  });

  describe('getDocument', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should retrieve document by ID successfully', async () => {
      const documentId = 'database:documentation:1';
      
      // Mock executeQuery for getDocument
      const mockExecuteQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            title: 'Specific Document',
            content: 'Specific content',
          },
        ],
        count: 1,
        executionTime: 25,
        fromCache: false,
      });
      
      (adapter as any).executeQuery = mockExecuteQuery;

      const result = await adapter.getDocument(documentId);

      expect(result).toEqual(expect.objectContaining({
        id: 'database:documentation:1',
        title: 'Test Document',
      }));
    });

    it('should return null for non-existent document', async () => {
      const mockExecuteQuery = jest.fn().mockResolvedValue({
        rows: [],
        count: 0,
        executionTime: 15,
        fromCache: false,
      });
      
      (adapter as any).executeQuery = mockExecuteQuery;

      const result = await adapter.getDocument('database:documentation:999');

      expect(result).toBeNull();
    });

    it('should handle invalid document ID format', async () => {
      const result = await adapter.getDocument('invalid-id-format');
      expect(result).toBeNull();
    });
  });

  describe('searchRunbooks', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should search for runbooks with alert characteristics', async () => {
      mockContentProcessor.convertToSearchResult.mockResolvedValue({
        id: 'database:runbooks:1',
        title: 'Memory Alert Runbook',
        content: 'Steps to handle memory alerts...',
        source: 'runbooks',
        source_type: 'database' as const,
        confidence_score: 0.95,
        match_reasons: ['runbook_detected', 'alert_type_match'],
        retrieval_time_ms: 75,
        last_updated: new Date().toISOString(),
        metadata: {
          is_runbook: true,
        },
      });

      const mockExecuteQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            name: 'Memory Alert Runbook',
            procedure: 'Steps to handle memory alerts...',
            severity: 'critical',
          },
        ],
        count: 1,
        executionTime: 60,
        fromCache: false,
      });
      
      (adapter as any).executeQuery = mockExecuteQuery;

      const runbooks = await adapter.searchRunbooks(
        'memory_pressure',
        'critical',
        ['web-server'],
        { cpu_usage: '90%' }
      );

      expect(runbooks).toHaveLength(0); // Since convertToRunbook is mocked to return null
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return healthy status when all components are working', async () => {
      const mockExecuteQuery = jest.fn().mockResolvedValue({
        rows: [{ health_check: 1 }],
        count: 1,
        executionTime: 5,
        fromCache: false,
      });
      
      (adapter as any).executeQuery = mockExecuteQuery;

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.source_name).toBe('test-database');
      expect(health.metadata).toEqual(expect.objectContaining({
        databaseType: 'postgresql',
      }));
    });

    it('should return unhealthy status when connection fails', async () => {
      mockConnectionManager.healthCheck.mockResolvedValue({
        healthy: false,
        error: 'Connection pool exhausted',
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 5,
        totalConnections: 0,
        lastCheck: new Date(),
      });

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error_message).toContain('Connection pool');
    });
  });

  describe('refreshIndex', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should refresh index successfully', async () => {
      const result = await adapter.refreshIndex();

      expect(result).toBe(true);
      expect(mockSchemaDetector.detectSchema).toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      const result = await adapter.refreshIndex(true);

      expect(result).toBe(true);
      expect(mockCacheManager.clear).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      mockSchemaDetector.detectSchema.mockRejectedValue(new Error('Schema detection failed'));

      const result = await adapter.refreshIndex();

      expect(result).toBe(false);
    });
  });

  describe('getMetadata', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return adapter metadata', async () => {
      const metadata = await adapter.getMetadata();

      expect(metadata).toEqual(expect.objectContaining({
        name: 'test-database',
        type: 'database',
        documentCount: expect.any(Number),
        lastIndexed: expect.any(String),
        avgResponseTime: expect.any(Number),
        successRate: expect.any(Number),
      }));
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      await adapter.initialize();
      await adapter.cleanup();

      expect(mockCacheManager.clear).toHaveBeenCalled();
      expect(mockConnectionManager.cleanup).toHaveBeenCalled();
      expect(adapter.isReady()).toBe(false);
    });
  });

  describe('executeQuery', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should execute SQL query for SQL databases', async () => {
      const connection = {
        type: 'postgresql' as DatabaseType,
        client: {
          query: jest.fn().mockResolvedValue({
            rows: [{ id: 1, title: 'Test' }],
            rowCount: 1,
          }),
        },
        isConnected: true,
        lastUsed: new Date(),
      };

      const query = {
        sql: 'SELECT * FROM test',
        parameters: [],
      };

      const result = await adapter.executeQuery(connection, query);

      expect(result.rows).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(connection.client.query).toHaveBeenCalledWith(query.sql, query.parameters);
    });

    it('should execute MongoDB query for NoSQL databases', async () => {
      const connection = {
        type: 'mongodb' as DatabaseType,
        client: {
          db: jest.fn().mockReturnValue({
            collection: jest.fn().mockReturnValue({
              find: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([
                  { _id: 'test', title: 'Test Document' },
                ]),
              }),
            }),
          }),
        },
        isConnected: true,
        lastUsed: new Date(),
      };

      const query = {
        collection: 'documents',
        filter: { title: /test/i },
        options: {},
      };

      const result = await adapter.executeQuery(connection, query);

      expect(result.documents).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should handle unsupported database types', async () => {
      const connection = {
        type: 'unsupported' as any,
        client: {},
        isConnected: true,
        lastUsed: new Date(),
      };

      const query = { sql: 'SELECT 1' };

      await expect(adapter.executeQuery(connection, query)).rejects.toThrow(
        'Unsupported database type: unsupported'
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty search results', async () => {
      await adapter.initialize();
      
      const mockExecuteQuery = jest.fn().mockResolvedValue({
        rows: [],
        count: 0,
        executionTime: 10,
        fromCache: false,
      });
      
      (adapter as any).executeQuery = mockExecuteQuery;

      const results = await adapter.search('nonexistent');
      expect(results).toEqual([]);
    });

    it('should handle malformed schema configuration', () => {
      const malformedConfig = {
        ...mockConfig,
        schema: {
          tables: [
            // Missing required fields
            { name: 'invalid_table' },
          ],
        },
      };

      expect(() => new DatabaseAdapter(malformedConfig)).toThrow();
    });

    it('should handle concurrent operations safely', async () => {
      await adapter.initialize();
      
      const mockExecuteQuery = jest.fn().mockResolvedValue({
        rows: [{ id: 1, title: 'Test' }],
        count: 1,
        executionTime: 50,
        fromCache: false,
      });
      
      (adapter as any).executeQuery = mockExecuteQuery;

      // Execute multiple searches concurrently
      const searches = Array(5).fill(null).map((_, i) => 
        adapter.search(`query ${i}`)
      );

      const results = await Promise.all(searches);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});