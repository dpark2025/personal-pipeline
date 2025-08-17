/**
 * Database Connection Manager - Multi-database connection pooling and management
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Enterprise-grade connection management with support for multiple database types,
 * connection pooling, health monitoring, and failover capabilities.
 * 
 * Supported Databases:
 * - PostgreSQL (pg)
 * - MongoDB (mongodb)
 * - MySQL/MariaDB (mysql2)
 * - SQLite (sqlite3)
 * - Microsoft SQL Server (mssql)
 * - Oracle Database (oracledb)
 */

import { logger } from '../../utils/logger.js';
import { DatabaseConnectionConfig, DatabaseType, DatabaseConnection, ConnectionOptions } from './database-adapter.js';

/**
 * Connection pool options
 */
export interface ConnectionPoolOptions {
  /** Maximum number of connections in pool */
  maxConnections?: number;
  /** Minimum number of connections to maintain */
  minConnections?: number;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Idle timeout in milliseconds */
  idleTimeout?: number;
  /** Maximum connection lifetime in milliseconds */
  maxLifetime?: number;
  /** SSL/TLS configuration */
  ssl?: boolean;
  /** Retry attempts for failed connections */
  retryAttempts?: number;
  /** Delay between retry attempts */
  retryDelay?: number;
  /** Enable connection validation */
  validateConnections?: boolean;
  /** Validation query timeout */
  validationTimeout?: number;
}

/**
 * Connection health status
 */
export interface ConnectionHealth {
  healthy: boolean;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalConnections: number;
  error?: string;
  lastCheck: Date;
}

/**
 * Connection status enumeration
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'idle';

/**
 * Connection pool statistics
 */
export interface ConnectionPoolStats {
  active: number;
  idle: number;
  waiting: number;
  total: number;
  created: number;
  destroyed: number;
  errors: number;
  acquisitionTime: number;
  avgResponseTime: number;
}

/**
 * Database client configuration for different database types
 */
interface DatabaseClientConfig {
  postgresql: any;
  mongodb: any;
  mysql: any;
  mariadb: any;
  sqlite: any;
  mssql: any;
  oracle: any;
}

/**
 * Enterprise-grade connection manager with multi-database support
 */
export class ConnectionManager {
  private config: DatabaseConnectionConfig;
  private options: Required<ConnectionPoolOptions>;
  private pool: any; // Database-specific pool
  private client: any; // Database-specific client
  private connections: Map<string, DatabaseConnection> = new Map();
  private connectionStats: ConnectionPoolStats = {
    active: 0,
    idle: 0,
    waiting: 0,
    total: 0,
    created: 0,
    destroyed: 0,
    errors: 0,
    acquisitionTime: 0,
    avgResponseTime: 0,
  };
  private isInitialized = false;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: DatabaseConnectionConfig, options: ConnectionOptions = {}) {
    this.config = config;
    this.options = {
      maxConnections: options.maxConnections || config.pool_size || 20,
      minConnections: 2,
      connectionTimeout: options.connectionTimeout || config.connection_timeout_ms || 30000,
      idleTimeout: options.idleTimeout || config.idle_timeout_ms || 300000,
      maxLifetime: options.maxLifetime || config.max_lifetime_ms || 1800000,
      ssl: options.ssl ?? config.ssl ?? false,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      validateConnections: true,
      validationTimeout: 5000,
    };
  }

  /**
   * Initialize the connection manager and establish connection pool
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing connection manager', {
        databaseType: this.config.type,
        database: this.config.database,
        maxConnections: this.options.maxConnections,
      });

      // Create database-specific client and pool
      await this.createDatabaseClient();
      await this.createConnectionPool();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isInitialized = true;
      
      logger.info('Connection manager initialized successfully', {
        databaseType: this.config.type,
        poolSize: this.options.maxConnections,
      });

    } catch (error) {
      logger.error('Failed to initialize connection manager', { error });
      throw new Error(`Connection manager initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(): Promise<DatabaseConnection> {
    if (!this.isInitialized) {
      throw new Error('Connection manager not initialized');
    }

    const startTime = performance.now();

    try {
      let connection: any;
      
      // Get connection based on database type
      switch (this.config.type) {
        case 'postgresql':
        case 'mysql':
        case 'mariadb':
        case 'mssql':
          connection = await this.pool.connect();
          break;
        case 'mongodb':
          connection = this.client; // MongoDB client is reusable
          break;
        case 'sqlite':
          connection = this.client; // SQLite is file-based, single connection
          break;
        case 'oracle':
          connection = await this.pool.getConnection();
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }

      const dbConnection: DatabaseConnection = {
        type: this.config.type,
        client: connection,
        isConnected: true,
        lastUsed: new Date(),
        pool: this.pool,
      };

      // Update statistics
      this.connectionStats.active++;
      this.connectionStats.acquisitionTime = performance.now() - startTime;
      
      // Store connection reference
      const connectionId = this.generateConnectionId();
      this.connections.set(connectionId, dbConnection);

      return dbConnection;

    } catch (error) {
      this.connectionStats.errors++;
      logger.error('Failed to acquire database connection', { 
        databaseType: this.config.type,
        error 
      });
      throw error;
    }
  }

  /**
   * Release a connection back to the pool
   */
  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    try {
      // Find and remove connection from tracking
      for (const [id, conn] of this.connections.entries()) {
        if (conn.client === connection.client) {
          this.connections.delete(id);
          break;
        }
      }

      // Release connection based on database type
      switch (connection.type) {
        case 'postgresql':
        case 'mysql':
        case 'mariadb':
        case 'mssql':
          if (connection.client && connection.client.release) {
            connection.client.release();
          }
          break;
        case 'mongodb':
        case 'sqlite':
          // MongoDB and SQLite connections are reusable, no explicit release needed
          break;
        case 'oracle':
          if (connection.client && connection.client.close) {
            await connection.client.close();
          }
          break;
      }

      // Update statistics
      this.connectionStats.active = Math.max(0, this.connectionStats.active - 1);
      this.connectionStats.idle++;

    } catch (error) {
      logger.error('Failed to release database connection', { error });
    }
  }

  /**
   * Check the health of the connection pool
   */
  async healthCheck(): Promise<ConnectionHealth> {
    try {
      const poolStats = await this.getPoolStats();
      
      // Perform a simple test query
      await this.validateConnection();

      return {
        healthy: true,
        activeConnections: poolStats.active,
        idleConnections: poolStats.idle,
        waitingRequests: poolStats.waiting,
        totalConnections: poolStats.total,
        lastCheck: new Date(),
      };

    } catch (error) {
      return {
        healthy: false,
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
        totalConnections: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Get connection pool statistics
   */
  async getPoolStats(): Promise<ConnectionPoolStats> {
    // Update current pool statistics based on database type
    switch (this.config.type) {
      case 'postgresql':
        if (this.pool && this.pool.totalCount !== undefined) {
          this.connectionStats.total = this.pool.totalCount;
          this.connectionStats.idle = this.pool.idleCount;
          this.connectionStats.waiting = this.pool.waitingCount;
        }
        break;
      case 'mysql':
      case 'mariadb':
        if (this.pool && this.pool._allConnections) {
          this.connectionStats.total = this.pool._allConnections.length;
          this.connectionStats.idle = this.pool._freeConnections.length;
        }
        break;
      case 'mssql':
        if (this.pool && this.pool.pool) {
          this.connectionStats.total = this.pool.pool.size;
          this.connectionStats.idle = this.pool.pool.available;
        }
        break;
      case 'oracle':
        if (this.pool && this.pool._logStats) {
          const stats = this.pool._logStats();
          this.connectionStats.total = stats.connectionsInUse + stats.connectionsOpen;
          this.connectionStats.idle = stats.connectionsOpen;
        }
        break;
      default:
        // For MongoDB and SQLite, use tracked connections
        this.connectionStats.total = this.connections.size;
        this.connectionStats.idle = Math.max(0, this.connectionStats.total - this.connectionStats.active);
    }

    return { ...this.connectionStats };
  }

  /**
   * Cleanup all connections and close the pool
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up connection manager');

    try {
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Close all tracked connections
      for (const connection of this.connections.values()) {
        try {
          await this.releaseConnection(connection);
        } catch (error) {
          logger.warn('Error releasing connection during cleanup', { error });
        }
      }
      this.connections.clear();

      // Close the connection pool
      await this.closePool();

      this.isInitialized = false;
      
      logger.info('Connection manager cleanup completed');

    } catch (error) {
      logger.error('Error during connection manager cleanup', { error });
    }
  }

  // Private methods

  private async createDatabaseClient(): Promise<void> {
    const credentials = this.getCredentials();

    switch (this.config.type) {
      case 'postgresql':
        await this.createPostgreSQLClient(credentials);
        break;
      case 'mongodb':
        await this.createMongoDBClient(credentials);
        break;
      case 'mysql':
      case 'mariadb':
        await this.createMySQLClient(credentials);
        break;
      case 'sqlite':
        await this.createSQLiteClient();
        break;
      case 'mssql':
        await this.createMSSQLClient(credentials);
        break;
      case 'oracle':
        await this.createOracleClient(credentials);
        break;
      default:
        throw new Error(`Unsupported database type: ${this.config.type}`);
    }
  }

  private async createConnectionPool(): Promise<void> {
    switch (this.config.type) {
      case 'postgresql':
        const { Pool } = await import('pg');
        this.pool = new Pool({
          host: this.config.host,
          port: this.config.port || 5432,
          database: this.config.database,
          user: process.env[this.config.username_env || ''],
          password: process.env[this.config.password_env || ''],
          max: this.options.maxConnections,
          min: this.options.minConnections,
          idleTimeoutMillis: this.options.idleTimeout,
          connectionTimeoutMillis: this.options.connectionTimeout,
          ssl: this.options.ssl ? { rejectUnauthorized: false } : false,
        });
        break;

      case 'mysql':
      case 'mariadb':
        const mysql = await import('mysql2/promise');
        this.pool = mysql.createPool({
          host: this.config.host,
          port: this.config.port || 3306,
          database: this.config.database,
          user: process.env[this.config.username_env || ''],
          password: process.env[this.config.password_env || ''],
          connectionLimit: this.options.maxConnections,
          acquireTimeout: this.options.connectionTimeout,
          timeout: this.options.idleTimeout,
          ssl: this.options.ssl,
        });
        break;

      case 'mongodb':
        const { MongoClient } = await import('mongodb');
        const mongoUri = process.env[this.config.uri_env || ''] || 
          `mongodb://${this.config.host}:${this.config.port || 27017}/${this.config.database}`;
        
        this.client = new MongoClient(mongoUri, {
          maxPoolSize: this.options.maxConnections,
          minPoolSize: this.options.minConnections,
          connectTimeoutMS: this.options.connectionTimeout,
          serverSelectionTimeoutMS: this.options.connectionTimeout,
        });
        await this.client.connect();
        break;

      case 'sqlite':
        const sqlite3 = await import('sqlite3');
        const { open } = await import('sqlite');
        this.client = await open({
          filename: this.config.database,
          driver: sqlite3.Database,
        });
        break;

      case 'mssql':
        const mssql = await import('mssql');
        const mssqlConfig = {
          server: this.config.host || 'localhost',
          port: this.config.port || 1433,
          database: this.config.database,
          user: process.env[this.config.username_env || ''],
          password: process.env[this.config.password_env || ''],
          pool: {
            max: this.options.maxConnections,
            min: this.options.minConnections,
            idleTimeoutMillis: this.options.idleTimeout,
          },
          options: {
            encrypt: this.options.ssl,
            trustServerCertificate: true,
          },
        };
        this.pool = new mssql.ConnectionPool(mssqlConfig);
        await this.pool.connect();
        break;

      case 'oracle':
        const oracledb = await import('oracledb');
        this.pool = await oracledb.createPool({
          connectString: `${this.config.host}:${this.config.port || 1521}/${this.config.database}`,
          user: process.env[this.config.username_env || ''],
          password: process.env[this.config.password_env || ''],
          poolMax: this.options.maxConnections,
          poolMin: this.options.minConnections,
          poolTimeout: this.options.idleTimeout / 1000, // Oracle expects seconds
        });
        break;
    }
  }

  private async createPostgreSQLClient(credentials: any): Promise<void> {
    // PostgreSQL client creation is handled in createConnectionPool
    logger.debug('PostgreSQL client configuration prepared');
  }

  private async createMongoDBClient(credentials: any): Promise<void> {
    // MongoDB client creation is handled in createConnectionPool
    logger.debug('MongoDB client configuration prepared');
  }

  private async createMySQLClient(credentials: any): Promise<void> {
    // MySQL client creation is handled in createConnectionPool
    logger.debug('MySQL client configuration prepared');
  }

  private async createSQLiteClient(): Promise<void> {
    // SQLite client creation is handled in createConnectionPool
    logger.debug('SQLite client configuration prepared');
  }

  private async createMSSQLClient(credentials: any): Promise<void> {
    // MSSQL client creation is handled in createConnectionPool
    logger.debug('MSSQL client configuration prepared');
  }

  private async createOracleClient(credentials: any): Promise<void> {
    // Oracle client creation is handled in createConnectionPool
    logger.debug('Oracle client configuration prepared');
  }

  private getCredentials(): any {
    return {
      username: process.env[this.config.username_env || ''],
      password: process.env[this.config.password_env || ''],
      connectionString: process.env[this.config.connection_string_env || ''],
      uri: process.env[this.config.uri_env || ''],
    };
  }

  private async validateConnection(): Promise<void> {
    const connection = await this.getConnection();
    
    try {
      // Perform a simple validation query based on database type
      switch (this.config.type) {
        case 'postgresql':
        case 'mysql':
        case 'mariadb':
        case 'sqlite':
          await connection.client.query('SELECT 1');
          break;
        case 'mongodb':
          await connection.client.db().admin().ping();
          break;
        case 'mssql':
          await connection.client.request().query('SELECT 1');
          break;
        case 'oracle':
          await connection.client.execute('SELECT 1 FROM DUAL');
          break;
      }
    } finally {
      await this.releaseConnection(connection);
    }
  }

  private async closePool(): Promise<void> {
    try {
      switch (this.config.type) {
        case 'postgresql':
        case 'mysql':
        case 'mariadb':
          if (this.pool && this.pool.end) {
            await this.pool.end();
          }
          break;
        case 'mongodb':
          if (this.client && this.client.close) {
            await this.client.close();
          }
          break;
        case 'sqlite':
          if (this.client && this.client.close) {
            await this.client.close();
          }
          break;
        case 'mssql':
          if (this.pool && this.pool.close) {
            await this.pool.close();
          }
          break;
        case 'oracle':
          if (this.pool && this.pool.close) {
            await this.pool.close();
          }
          break;
      }
    } catch (error) {
      logger.warn('Error closing database pool', { error });
    }
  }

  private startHealthMonitoring(): void {
    // Perform health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        logger.warn('Health check failed', { error });
      }
    }, 30000);
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}