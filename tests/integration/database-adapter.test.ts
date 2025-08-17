/**
 * Database Adapter Integration Tests
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Integration tests for DatabaseAdapter with real database operations
 * (using in-memory SQLite for testing).
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { DatabaseAdapter } from '../../src/adapters/database/database-adapter.js';
import { DatabaseConfig } from '../../src/types/index.js';
import path from 'path';
import fs from 'fs/promises';

// Mock the logger for cleaner test output
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DatabaseAdapter Integration Tests', () => {
  let adapter: DatabaseAdapter;
  let tempDbPath: string;

  const mockConfig: DatabaseConfig = {
    name: 'test-sqlite-db',
    type: 'database',
    connection: {
      type: 'sqlite',
      database: ':memory:', // In-memory SQLite for testing
      ssl: false,
      pool_size: 1,
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
          title_field: 'title',
          content_field: 'procedure',
          category_field: 'severity',
          author_field: 'author',
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

  beforeAll(async () => {
    // Create temporary database file for some tests
    tempDbPath = path.join(process.cwd(), 'test-db.sqlite');
  });

  afterAll(async () => {
    // Clean up temporary files
    try {
      await fs.unlink(tempDbPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  beforeEach(async () => {
    adapter = new DatabaseAdapter(mockConfig, {
      enableSemanticSearch: false, // Disable for integration tests
      schemaDetection: { autoDiscover: false }, // Disable auto-discovery
    });
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.cleanup();
    }
  });

  describe('Basic Adapter Operations', () => {
    it('should initialize adapter successfully', async () => {
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);
    });

    it('should perform health check', async () => {
      await adapter.initialize();
      
      const health = await adapter.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.source_name).toBe('test-sqlite-db');
      expect(health.response_time_ms).toBeGreaterThan(0);
      expect(health.metadata).toEqual(expect.objectContaining({
        databaseType: 'sqlite',
      }));
    });

    it('should return adapter metadata', async () => {
      await adapter.initialize();
      
      const metadata = await adapter.getMetadata();
      
      expect(metadata).toEqual(expect.objectContaining({
        name: 'test-sqlite-db',
        type: 'database',
        documentCount: expect.any(Number),
        lastIndexed: expect.any(String),
        avgResponseTime: expect.any(Number),
        successRate: expect.any(Number),
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid database configuration', () => {
      const invalidConfig = {
        ...mockConfig,
        connection: {
          ...mockConfig.connection,
          type: 'invalid' as any,
        },
      };

      expect(() => new DatabaseAdapter(invalidConfig)).toThrow();
    });

    it('should handle connection failures gracefully', async () => {
      const badConfig = {
        ...mockConfig,
        connection: {
          ...mockConfig.connection,
          database: '/invalid/path/that/does/not/exist.db',
        },
      };

      const badAdapter = new DatabaseAdapter(badConfig);
      
      await expect(badAdapter.initialize()).rejects.toThrow();
    });

    it('should handle search operations when not initialized', async () => {
      // Don't initialize the adapter
      await expect(adapter.search('test query')).rejects.toThrow();
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should return empty results for non-existent tables', async () => {
      const results = await adapter.search('test query');
      
      // Since we're using an in-memory database with no data,
      // this should return empty results without errors
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle search with filters', async () => {
      const results = await adapter.search('test query', {
        categories: ['runbook'],
        limit: 10,
      });
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle document retrieval by ID', async () => {
      const result = await adapter.getDocument('database:documentation:1');
      
      // Should return null for non-existent document
      expect(result).toBeNull();
    });

    it('should handle invalid document ID format', async () => {
      const result = await adapter.getDocument('invalid-id-format');
      
      expect(result).toBeNull();
    });
  });

  describe('Runbook Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should search for runbooks by alert characteristics', async () => {
      const runbooks = await adapter.searchRunbooks(
        'memory_pressure',
        'critical',
        ['web-server', 'database'],
        { cpu_usage: '90%' }
      );
      
      expect(Array.isArray(runbooks)).toBe(true);
    });
  });

  describe('Index Management', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should refresh index successfully', async () => {
      const result = await adapter.refreshIndex();
      
      expect(result).toBe(true);
    });

    it('should force refresh index', async () => {
      const result = await adapter.refreshIndex(true);
      
      expect(result).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should handle multiple concurrent searches', async () => {
      const searchPromises = Array(5).fill(null).map((_, i) => 
        adapter.search(`query ${i}`)
      );

      const results = await Promise.all(searchPromises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should handle concurrent document retrievals', async () => {
      const documentPromises = Array(3).fill(null).map((_, i) => 
        adapter.getDocument(`database:test:${i}`)
      );

      const results = await Promise.all(documentPromises);
      
      expect(results).toHaveLength(3);
      // All should return null since documents don't exist
      results.forEach(result => {
        expect(result).toBeNull();
      });
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources properly', async () => {
      await adapter.initialize();
      
      expect(adapter.isReady()).toBe(true);
      
      await adapter.cleanup();
      
      expect(adapter.isReady()).toBe(false);
    });

    it('should handle cleanup when not initialized', async () => {
      // Should not throw when cleaning up non-initialized adapter
      await expect(adapter.cleanup()).resolves.not.toThrow();
    });

    it('should handle multiple cleanup calls', async () => {
      await adapter.initialize();
      
      await adapter.cleanup();
      await adapter.cleanup(); // Second cleanup should not throw
      
      expect(adapter.isReady()).toBe(false);
    });
  });
});