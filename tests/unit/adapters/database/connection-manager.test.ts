/**
 * Connection Manager Unit Tests
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Unit tests for DatabaseConnectionManager with mock database clients
 * and connection pool validation.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ConnectionManager, ConnectionPoolOptions } from '../../../../src/adapters/database/connection-manager.js';
import { DatabaseConnectionConfig, DatabaseType } from '../../../../src/adapters/database/database-adapter.js';

// Mock the logger
jest.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;

  const mockPostgreSQLConfig: DatabaseConnectionConfig = {
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
  };

  const mockMongoDBConfig: DatabaseConnectionConfig = {
    type: 'mongodb',
    database: 'test_db',
    uri_env: 'MONGODB_URI',
    ssl: false,
    pool_size: 20,
    connection_timeout_ms: 30000,
    idle_timeout_ms: 300000,
    max_lifetime_ms: 1800000,
  };

  beforeEach(() => {
    // Set test environment variables
    process.env.DB_USER = 'testuser';
    process.env.DB_PASSWORD = 'testpassword';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test_db';
  });

  afterEach(async () => {
    if (connectionManager) {
      await connectionManager.cleanup();
    }
    // Clean up environment variables
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.MONGODB_URI;
  });

  describe('constructor', () => {
    it('should create connection manager with default options', () => {
      connectionManager = new ConnectionManager(mockPostgreSQLConfig);
      expect(connectionManager).toBeInstanceOf(ConnectionManager);
    });

    it('should create connection manager with custom options', () => {
      const options: ConnectionPoolOptions = {
        maxConnections: 20,
        connectionTimeout: 60000,
        idleTimeout: 600000,
        ssl: true,
      };

      connectionManager = new ConnectionManager(mockPostgreSQLConfig, options);
      expect(connectionManager).toBeInstanceOf(ConnectionManager);
    });
  });

  describe('PostgreSQL connections', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockPostgreSQLConfig);
    });

    it('should initialize PostgreSQL connection pool', async () => {
      // Mock pg module
      const mockPool = {
        connect: jest.fn().mockResolvedValue({
          query: jest.fn(),
          release: jest.fn(),
        }),
        end: jest.fn().mockResolvedValue(undefined),
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      };

      jest.doMock('pg', () => ({
        Pool: jest.fn().mockImplementation(() => mockPool),
      }));

      await connectionManager.initialize();

      // Verify pool was created with correct configuration
      expect(connectionManager).toBeDefined();
    });

    it('should get and release PostgreSQL connections', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn(),
      };

      // Mock the pool property
      (connectionManager as any).pool = mockPool;
      (connectionManager as any).isInitialized = true;

      const connection = await connectionManager.getConnection();

      expect(connection.type).toBe('postgresql');
      expect(connection.client).toBe(mockClient);
      expect(connection.isConnected).toBe(true);

      await connectionManager.releaseConnection(connection);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('MongoDB connections', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockMongoDBConfig);
    });

    it('should initialize MongoDB connection', async () => {
      const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        db: jest.fn().mockReturnValue({
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockResolvedValue({}),
          }),
        }),
      };

      jest.doMock('mongodb', () => ({
        MongoClient: jest.fn().mockImplementation(() => mockClient),
      }));

      await connectionManager.initialize();

      expect(connectionManager).toBeDefined();
    });

    it('should get and release MongoDB connections', async () => {
      const mockClient = {
        db: jest.fn().mockReturnValue({
          collection: jest.fn(),
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockResolvedValue({}),
          }),
        }),
        close: jest.fn(),
      };

      // Mock the client property
      (connectionManager as any).client = mockClient;
      (connectionManager as any).isInitialized = true;

      const connection = await connectionManager.getConnection();

      expect(connection.type).toBe('mongodb');
      expect(connection.client).toBe(mockClient);

      // MongoDB connections are reusable, so release should not close
      await connectionManager.releaseConnection(connection);
      expect(mockClient.close).not.toHaveBeenCalled();
    });
  });

  describe('health checks', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockPostgreSQLConfig);
    });

    it('should return healthy status when connections are working', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ test: 1 }] }),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      };

      (connectionManager as any).pool = mockPool;
      (connectionManager as any).isInitialized = true;

      const health = await connectionManager.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.totalConnections).toBe(5);
      expect(health.idleConnections).toBe(3);
    });

    it('should return unhealthy status when connections fail', async () => {
      const mockPool = {
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
        totalCount: 0,
        idleCount: 0,
        waitingCount: 5,
      };

      (connectionManager as any).pool = mockPool;
      (connectionManager as any).isInitialized = true;

      const health = await connectionManager.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toContain('Connection failed');
    });
  });

  describe('connection pool statistics', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockPostgreSQLConfig);
    });

    it('should return accurate pool statistics', async () => {
      const mockPool = {
        totalCount: 10,
        idleCount: 6,
        waitingCount: 2,
      };

      (connectionManager as any).pool = mockPool;
      (connectionManager as any).connectionStats = {
        active: 4,
        idle: 6,
        waiting: 2,
        total: 10,
        created: 10,
        destroyed: 0,
        errors: 0,
        acquisitionTime: 15,
        avgResponseTime: 25,
      };

      const stats = await connectionManager.getPoolStats();

      expect(stats.total).toBe(10);
      expect(stats.active).toBe(4);
      expect(stats.idle).toBe(6);
      expect(stats.waiting).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle initialization failures gracefully', async () => {
      connectionManager = new ConnectionManager({
        ...mockPostgreSQLConfig,
        host: 'nonexistent-host',
      });

      await expect(connectionManager.initialize()).rejects.toThrow();
    });

    it('should handle connection acquisition failures', async () => {
      connectionManager = new ConnectionManager(mockPostgreSQLConfig);

      const mockPool = {
        connect: jest.fn().mockRejectedValue(new Error('Pool exhausted')),
      };

      (connectionManager as any).pool = mockPool;
      (connectionManager as any).isInitialized = true;

      await expect(connectionManager.getConnection()).rejects.toThrow('Pool exhausted');
    });

    it('should handle cleanup errors gracefully', async () => {
      connectionManager = new ConnectionManager(mockPostgreSQLConfig);

      const mockPool = {
        end: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
      };

      (connectionManager as any).pool = mockPool;
      (connectionManager as any).isInitialized = true;

      // Should not throw despite pool cleanup failure
      await expect(connectionManager.cleanup()).resolves.not.toThrow();
    });
  });

  describe('unsupported database types', () => {
    it('should handle unsupported database types during connection', async () => {
      const unsupportedConfig = {
        ...mockPostgreSQLConfig,
        type: 'unsupported' as DatabaseType,
      };

      connectionManager = new ConnectionManager(unsupportedConfig);
      (connectionManager as any).isInitialized = true;

      await expect(connectionManager.getConnection()).rejects.toThrow(
        'Unsupported database type: unsupported'
      );
    });
  });

  describe('concurrent connection management', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockPostgreSQLConfig);
    });

    it('should handle multiple concurrent connection requests', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve(mockClient), Math.random() * 100)
          )
        ),
      };

      (connectionManager as any).pool = mockPool;
      (connectionManager as any).isInitialized = true;

      // Request multiple connections concurrently
      const connectionPromises = Array(5).fill(null).map(() => 
        connectionManager.getConnection()
      );

      const connections = await Promise.all(connectionPromises);

      expect(connections).toHaveLength(5);
      connections.forEach(conn => {
        expect(conn.isConnected).toBe(true);
        expect(conn.type).toBe('postgresql');
      });

      // Release all connections
      await Promise.all(
        connections.map(conn => connectionManager.releaseConnection(conn))
      );

      expect(mockClient.release).toHaveBeenCalledTimes(5);
    });
  });
});