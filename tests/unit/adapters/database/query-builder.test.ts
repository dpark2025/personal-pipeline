/**
 * Query Builder Unit Tests
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Unit tests for QueryBuilder with SQL and NoSQL query generation validation.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { QueryBuilder, QueryBuilderOptions } from '../../../../src/adapters/database/query-builder.js';
import { DatabaseType } from '../../../../src/adapters/database/database-adapter.js';

// Mock the logger
jest.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('QueryBuilder', () => {
  describe('PostgreSQL Query Builder', () => {
    let queryBuilder: QueryBuilder;

    beforeEach(() => {
      queryBuilder = new QueryBuilder('postgresql');
    });

    it('should build basic SELECT query', () => {
      const query = queryBuilder
        .select(['id', 'title', 'content'])
        .from('documents')
        .build();

      expect(query.sql).toBe('SELECT "id", "title", "content" FROM "documents"');
      expect(query.parameters).toEqual([]);
    });

    it('should build query with WHERE conditions', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .where('title', 'eq', 'Test Document')
        .where('category', 'eq', 'runbook')
        .build();

      expect(query.sql).toBe('SELECT * FROM "documents" WHERE "title" = ? AND "category" = ?');
      expect(query.parameters).toEqual(['Test Document', 'runbook']);
    });

    it('should build query with LIKE conditions', () => {
      const query = queryBuilder
        .select(['title', 'content'])
        .from('documents')
        .whereLike('title', '%runbook%')
        .build();

      expect(query.sql).toBe('SELECT "title", "content" FROM "documents" WHERE "title" ILIKE ?');
      expect(query.parameters).toEqual(['%runbook%']);
    });

    it('should build query with ORDER BY', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .orderBy('created_at', 'DESC')
        .orderBy('title', 'ASC')
        .build();

      expect(query.sql).toBe('SELECT * FROM "documents" ORDER BY "created_at" DESC, "title" ASC');
    });

    it('should build query with LIMIT and OFFSET', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .limit(10)
        .offset(20)
        .build();

      expect(query.sql).toBe('SELECT * FROM "documents" LIMIT 10 OFFSET 20');
    });

    it('should build query with JOINs', () => {
      const query = queryBuilder
        .select(['d.title', 'c.name'])
        .from('documents')
        .leftJoin('categories c', 'd.category_id = c.id')
        .where('d.published', 'eq', true)
        .build();

      expect(query.sql).toBe(
        'SELECT d.title, c.name FROM "documents" LEFT JOIN "categories" AS "c" ON d.category_id = c.id WHERE "d"."published" = ?'
      );
      expect(query.parameters).toEqual([true]);
    });

    it('should build full-text search query', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .search('incident response', ['title', 'content'])
        .build();

      expect(query.sql).toContain('ILIKE');
      expect(query.parameters).toEqual(['%incident response%', '%incident response%']);
    });

    it('should build WHERE IN query', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .whereIn('category', ['runbook', 'procedure', 'guide'])
        .build();

      expect(query.sql).toBe('SELECT * FROM "documents" WHERE "category" IN (?, ?, ?)');
      expect(query.parameters).toEqual(['runbook', 'procedure', 'guide']);
    });

    it('should handle empty WHERE IN array', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .whereIn('category', [])
        .build();

      expect(query.sql).toBe('SELECT * FROM "documents"');
      expect(query.parameters).toEqual([]);
    });

    it('should build complex query with multiple conditions', () => {
      const query = queryBuilder
        .select(['id', 'title', 'content', 'created_at'])
        .from('documents')
        .where('published', 'eq', true)
        .whereLike('title', '%alert%')
        .whereIn('category', ['runbook', 'procedure'])
        .where('created_at', 'gte', '2024-01-01')
        .orderBy('created_at', 'DESC')
        .limit(50)
        .offset(0)
        .build();

      expect(query.sql).toContain('WHERE');
      expect(query.sql).toContain('AND');
      expect(query.sql).toContain('ILIKE');
      expect(query.sql).toContain('IN');
      expect(query.sql).toContain('ORDER BY');
      expect(query.sql).toContain('LIMIT');
      expect(query.parameters).toHaveLength(6); // published, title pattern, 2 categories, created_at
    });
  });

  describe('MySQL Query Builder', () => {
    let queryBuilder: QueryBuilder;

    beforeEach(() => {
      queryBuilder = new QueryBuilder('mysql');
    });

    it('should use MySQL identifier escaping', () => {
      const query = queryBuilder
        .select(['id', 'title'])
        .from('documents')
        .build();

      expect(query.sql).toBe('SELECT `id`, `title` FROM `documents`');
    });

    it('should build MySQL LIMIT query correctly', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .limit(10)
        .offset(5)
        .build();

      expect(query.sql).toBe('SELECT * FROM `documents` LIMIT 10 OFFSET 5');
    });
  });

  describe('SQL Server Query Builder', () => {
    let queryBuilder: QueryBuilder;

    beforeEach(() => {
      queryBuilder = new QueryBuilder('mssql');
    });

    it('should use SQL Server identifier escaping', () => {
      const query = queryBuilder
        .select(['id', 'title'])
        .from('documents')
        .build();

      expect(query.sql).toBe('SELECT [id], [title] FROM [documents]');
    });

    it('should build SQL Server OFFSET/FETCH query', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .orderBy('id', 'ASC')
        .limit(10)
        .offset(5)
        .build();

      expect(query.sql).toBe('SELECT * FROM [documents] ORDER BY [id] ASC OFFSET 5 ROWS FETCH NEXT 10 ROWS ONLY');
    });
  });

  describe('MongoDB Query Builder', () => {
    let queryBuilder: QueryBuilder;

    beforeEach(() => {
      queryBuilder = new QueryBuilder('mongodb');
    });

    it('should build basic MongoDB query', () => {
      const query = queryBuilder
        .from('documents')
        .where('published', { $eq: true })
        .limit(10)
        .build();

      expect(query.collection).toBe('documents');
      expect(query.filter).toEqual({ published: { $eq: true } });
      expect(query.options?.limit).toBe(10);
    });

    it('should build MongoDB text search query', () => {
      const query = queryBuilder
        .from('documents')
        .search('incident response', ['title', 'content'])
        .build();

      expect(query.collection).toBe('documents');
      expect(query.filter?.$or).toBeDefined();
      expect(query.filter?.$or).toHaveLength(2);
    });

    it('should build MongoDB query with sort', () => {
      const query = queryBuilder
        .from('documents')
        .orderBy('created_at', 'DESC')
        .orderBy('title', 'ASC')
        .build();

      expect(query.options?.sort).toEqual({
        created_at: -1,
        title: 1,
      });
    });

    it('should build MongoDB query with skip and limit', () => {
      const query = queryBuilder
        .from('documents')
        .offset(20)
        .limit(10)
        .build();

      expect(query.options?.skip).toBe(20);
      expect(query.options?.limit).toBe(10);
    });
  });

  describe('Health Check Queries', () => {
    it('should build PostgreSQL health check query', () => {
      const queryBuilder = new QueryBuilder('postgresql');
      const query = queryBuilder.buildHealthCheckQuery();

      expect(query.sql).toBe('SELECT 1 as health_check');
      expect(query.parameters).toEqual([]);
    });

    it('should build Oracle health check query', () => {
      const queryBuilder = new QueryBuilder('oracle');
      const query = queryBuilder.buildHealthCheckQuery();

      expect(query.sql).toBe('SELECT 1 as health_check FROM DUAL');
    });

    it('should build MongoDB health check query', () => {
      const queryBuilder = new QueryBuilder('mongodb');
      const query = queryBuilder.buildHealthCheckQuery();

      expect(query.collection).toBe('health_check');
      expect(query.filter).toEqual({});
      expect(query.options?.limit).toBe(1);
    });
  });

  describe('Query Optimization', () => {
    let queryBuilder: QueryBuilder;

    beforeEach(() => {
      const options: QueryBuilderOptions = {
        enableOptimization: true,
        enableQueryLogging: true,
      };
      queryBuilder = new QueryBuilder('postgresql', options);
    });

    it('should track query statistics', () => {
      queryBuilder.build();
      queryBuilder.build();
      queryBuilder.build();

      const stats = queryBuilder.getStats();

      expect(stats.queryCount).toBe(3);
      expect(stats.totalExecutionTime).toBe(0); // No actual execution
    });

    it('should reset query builder state', () => {
      queryBuilder
        .select(['id', 'title'])
        .from('documents')
        .where('published', 'eq', true)
        .limit(10);

      const firstQuery = queryBuilder.build();
      expect(firstQuery.sql).toContain('WHERE');

      queryBuilder.reset();

      const secondQuery = queryBuilder
        .select(['*'])
        .from('categories')
        .build();

      expect(secondQuery.sql).toBe('SELECT * FROM "categories"');
      expect(secondQuery.parameters).toEqual([]);
    });
  });

  describe('SQL Injection Prevention', () => {
    let queryBuilder: QueryBuilder;

    beforeEach(() => {
      queryBuilder = new QueryBuilder('postgresql', {
        enableParameterization: true,
      });
    });

    it('should parameterize all user inputs', () => {
      const maliciousInput = "'; DROP TABLE documents; --";
      
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .where('title', 'eq', maliciousInput)
        .build();

      expect(query.sql).toBe('SELECT * FROM "documents" WHERE "title" = ?');
      expect(query.parameters).toEqual([maliciousInput]);
    });

    it('should handle special characters in search terms', () => {
      const searchTerm = "test'test\"test\\test";
      
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .search(searchTerm, ['title', 'content'])
        .build();

      expect(query.parameters).toContain(`%${searchTerm}%`);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing FROM clause in SQL', () => {
      const queryBuilder = new QueryBuilder('postgresql');
      
      expect(() => {
        queryBuilder.select(['*']).build();
      }).toThrow('FROM table is required for SQL queries');
    });

    it('should throw error for missing collection in MongoDB', () => {
      const queryBuilder = new QueryBuilder('mongodb');
      
      expect(() => {
        queryBuilder.build();
      }).toThrow('Collection is required for MongoDB queries');
    });

    it('should throw error for unsupported database type in health check', () => {
      const queryBuilder = new QueryBuilder('unsupported' as DatabaseType);
      
      expect(() => {
        queryBuilder.buildHealthCheckQuery();
      }).toThrow('Unsupported database type for health check: unsupported');
    });

    it('should throw error for query size exceeding limit', () => {
      const queryBuilder = new QueryBuilder('postgresql', {
        maxQuerySize: 100, // Very small limit
      });

      // Build a query that will exceed the size limit
      const longTableName = 'a'.repeat(200);
      
      expect(() => {
        queryBuilder
          .select(['*'])
          .from(longTableName)
          .build();
      }).toThrow('Query size exceeds maximum allowed size');
    });
  });

  describe('Advanced Query Features', () => {
    let queryBuilder: QueryBuilder;

    beforeEach(() => {
      queryBuilder = new QueryBuilder('postgresql');
    });

    it('should build query with GROUP BY and HAVING', () => {
      const query = queryBuilder
        .select(['category', 'COUNT(*) as count'])
        .from('documents')
        .groupBy(['category'])
        .having('COUNT(*) > 5')
        .build();

      expect(query.sql).toContain('GROUP BY');
      expect(query.sql).toContain('HAVING');
    });

    it('should build complex search with exact match', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .search('exact title', ['title'], { exact: true, caseSensitive: true })
        .build();

      expect(query.sql).toContain('=');
      expect(query.parameters).toContain('exact title');
    });

    it('should handle multiple different WHERE operators', () => {
      const query = queryBuilder
        .select(['*'])
        .from('documents')
        .where('views', 'gt', 100)
        .where('rating', 'lte', 5)
        .where('description', 'is_not_null')
        .where('archived', 'ne', true)
        .build();

      expect(query.sql).toContain('>');
      expect(query.sql).toContain('<=');
      expect(query.sql).toContain('IS NOT NULL');
      expect(query.sql).toContain('!=');
    });
  });
});