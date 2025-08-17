/**
 * Database Query Builder - Dynamic SQL/NoSQL query construction
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Enterprise-grade query builder supporting multiple database types with
 * SQL injection prevention, query optimization, and performance monitoring.
 * 
 * Supported Databases:
 * - PostgreSQL (advanced SQL features)
 * - MySQL/MariaDB (standard SQL)
 * - SQLite (lightweight SQL)
 * - Microsoft SQL Server (T-SQL)
 * - MongoDB (NoSQL aggregation pipeline)
 * - Oracle Database (PL/SQL)
 */

import { logger } from '../../utils/logger.js';
import { DatabaseType, DatabaseQuery } from './database-adapter.js';

/**
 * Query builder options
 */
export interface QueryBuilderOptions {
  /** Enable query optimization */
  enableOptimization?: boolean;
  /** Maximum query size in bytes */
  maxQuerySize?: number;
  /** Enable SQL parameterization for injection prevention */
  enableParameterization?: boolean;
  /** Query timeout in milliseconds */
  queryTimeout?: number;
  /** Enable query logging for debugging */
  enableQueryLogging?: boolean;
}

/**
 * Search query configuration
 */
export interface SearchQuery {
  term: string;
  fields: string[];
  fuzzy?: boolean;
  caseSensitive?: boolean;
  exact?: boolean;
  boost?: Record<string, number>;
}

/**
 * Filter condition for WHERE clauses
 */
export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value?: any;
  values?: any[];
}

/**
 * ORDER BY clause configuration
 */
export interface OrderByClause {
  field: string;
  direction: 'ASC' | 'DESC';
  nulls?: 'FIRST' | 'LAST';
}

/**
 * JOIN clause configuration
 */
export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: string;
  alias?: string;
}

/**
 * Query statistics for performance monitoring
 */
export interface QueryStats {
  queryCount: number;
  totalExecutionTime: number;
  avgExecutionTime: number;
  slowQueries: number;
  optimizedQueries: number;
}

/**
 * Enterprise-grade query builder with multi-database support
 */
export class QueryBuilder {
  private databaseType: DatabaseType;
  private options: Required<QueryBuilderOptions>;
  private queryStats: QueryStats = {
    queryCount: 0,
    totalExecutionTime: 0,
    avgExecutionTime: 0,
    slowQueries: 0,
    optimizedQueries: 0,
  };

  // SQL Query State
  private selectFields: string[] = ['*'];
  private fromTable: string = '';
  private joinClauses: JoinClause[] = [];
  private whereConditions: string[] = [];
  private orderByFields: OrderByClause[] = [];
  private groupByFields: string[] = [];
  private havingConditions: string[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private parameters: any[] = [];

  // MongoDB Query State
  private mongoCollection: string = '';
  private mongoFilter: Record<string, any> = {};
  private mongoProjection: Record<string, any> = {};
  private mongoSort: Record<string, any> = {};
  private mongoSkip?: number;
  private mongoLimit?: number;

  constructor(databaseType: DatabaseType, options: QueryBuilderOptions = {}) {
    this.databaseType = databaseType;
    this.options = {
      enableOptimization: options.enableOptimization ?? true,
      maxQuerySize: options.maxQuerySize ?? 1000000, // 1MB
      enableParameterization: options.enableParameterization ?? true,
      queryTimeout: options.queryTimeout ?? 30000,
      enableQueryLogging: options.enableQueryLogging ?? false,
    };
  }

  // SQL Query Builder Methods

  /**
   * SELECT clause - specify fields to return
   */
  select(fields: string | string[]): QueryBuilder {
    if (typeof fields === 'string') {
      this.selectFields = [fields];
    } else {
      this.selectFields = [...fields];
    }
    return this;
  }

  /**
   * FROM clause - specify source table
   */
  from(table: string): QueryBuilder {
    this.fromTable = table;
    this.mongoCollection = table; // Also set for MongoDB
    return this;
  }

  /**
   * WHERE clause - add filter condition
   */
  where(field: string, operator: FilterCondition['operator'] | any, value?: any): QueryBuilder {
    if (typeof operator === 'object' && value === undefined) {
      // MongoDB-style query: where('field', { $eq: value })
      this.mongoFilter[field] = operator;
      return this;
    }

    const condition = this.buildWhereCondition(field, operator, value);
    this.whereConditions.push(condition.sql);
    
    if (condition.parameter !== undefined) {
      this.parameters.push(condition.parameter);
    }

    // Also build MongoDB filter
    this.addMongoFilter(field, operator, value);

    return this;
  }

  /**
   * WHERE IN clause - filter by array of values
   */
  whereIn(field: string, values: any[]): QueryBuilder {
    if (values.length === 0) {
      return this;
    }

    const placeholders = values.map(() => '?').join(', ');
    this.whereConditions.push(`${this.escapeIdentifier(field)} IN (${placeholders})`);
    this.parameters.push(...values);

    // MongoDB filter
    this.mongoFilter[field] = { $in: values };

    return this;
  }

  /**
   * WHERE LIKE clause - pattern matching
   */
  whereLike(field: string, pattern: string, caseSensitive = false): QueryBuilder {
    const operator = caseSensitive ? 'LIKE' : this.getCaseInsensitiveLikeOperator();
    this.whereConditions.push(`${this.escapeIdentifier(field)} ${operator} ?`);
    this.parameters.push(pattern);

    // MongoDB filter using regex
    const flags = caseSensitive ? '' : 'i';
    const regexPattern = pattern.replace(/%/g, '.*').replace(/_/g, '.');
    this.mongoFilter[field] = { $regex: regexPattern, $options: flags };

    return this;
  }

  /**
   * Full-text search across multiple fields
   */
  search(query: string, fields: string[], options: Partial<SearchQuery> = {}): QueryBuilder {
    if (!query || fields.length === 0) {
      return this;
    }

    const searchOptions: SearchQuery = {
      term: query,
      fields,
      fuzzy: options.fuzzy ?? false,
      caseSensitive: options.caseSensitive ?? false,
      exact: options.exact ?? false,
      boost: options.boost ?? {},
    };

    if (this.isNoSQLDatabase()) {
      return this.buildMongoTextSearch(searchOptions);
    } else {
      return this.buildSQLTextSearch(searchOptions);
    }
  }

  /**
   * JOIN clause - join with another table
   */
  join(table: string, on: string, type: JoinClause['type'] = 'INNER', alias?: string): QueryBuilder {
    this.joinClauses.push({
      type,
      table,
      on,
      alias,
    });
    return this;
  }

  /**
   * LEFT JOIN clause
   */
  leftJoin(table: string, on: string, alias?: string): QueryBuilder {
    return this.join(table, on, 'LEFT', alias);
  }

  /**
   * ORDER BY clause - specify sorting
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC', nulls?: 'FIRST' | 'LAST'): QueryBuilder {
    this.orderByFields.push({ field, direction, nulls });
    
    // MongoDB sort
    this.mongoSort[field] = direction === 'ASC' ? 1 : -1;

    return this;
  }

  /**
   * GROUP BY clause
   */
  groupBy(fields: string | string[]): QueryBuilder {
    if (typeof fields === 'string') {
      this.groupByFields.push(fields);
    } else {
      this.groupByFields.push(...fields);
    }
    return this;
  }

  /**
   * HAVING clause - filter grouped results
   */
  having(condition: string): QueryBuilder {
    this.havingConditions.push(condition);
    return this;
  }

  /**
   * LIMIT clause - limit number of results
   */
  limit(count: number): QueryBuilder {
    this.limitValue = count;
    this.mongoLimit = count;
    return this;
  }

  /**
   * OFFSET/SKIP clause - skip number of results
   */
  offset(start: number): QueryBuilder {
    this.offsetValue = start;
    this.mongoSkip = start;
    return this;
  }

  /**
   * Build the final query based on database type
   */
  build(): DatabaseQuery {
    this.queryStats.queryCount++;

    if (this.isNoSQLDatabase()) {
      return this.buildMongoQuery();
    } else {
      return this.buildSQLQuery();
    }
  }

  /**
   * Build a health check query for the specific database type
   */
  buildHealthCheckQuery(): DatabaseQuery {
    switch (this.databaseType) {
      case 'postgresql':
      case 'mysql':
      case 'mariadb':
      case 'sqlite':
      case 'mssql':
        return {
          sql: 'SELECT 1 as health_check',
          parameters: [],
        };
      case 'oracle':
        return {
          sql: 'SELECT 1 as health_check FROM DUAL',
          parameters: [],
        };
      case 'mongodb':
        return {
          collection: 'health_check',
          filter: {},
          options: { limit: 1 },
        };
      default:
        throw new Error(`Unsupported database type for health check: ${this.databaseType}`);
    }
  }

  /**
   * Reset the query builder state
   */
  reset(): QueryBuilder {
    this.selectFields = ['*'];
    this.fromTable = '';
    this.joinClauses = [];
    this.whereConditions = [];
    this.orderByFields = [];
    this.groupByFields = [];
    this.havingConditions = [];
    this.limitValue = undefined;
    this.offsetValue = undefined;
    this.parameters = [];

    this.mongoCollection = '';
    this.mongoFilter = {};
    this.mongoProjection = {};
    this.mongoSort = {};
    this.mongoSkip = undefined;
    this.mongoLimit = undefined;

    return this;
  }

  /**
   * Get query statistics
   */
  getStats(): QueryStats {
    return { ...this.queryStats };
  }

  // Private methods

  private isNoSQLDatabase(): boolean {
    return this.databaseType === 'mongodb';
  }

  private buildSQLQuery(): DatabaseQuery {
    let sql = '';

    // SELECT clause
    sql += `SELECT ${this.selectFields.join(', ')}`;

    // FROM clause
    if (!this.fromTable) {
      throw new Error('FROM table is required for SQL queries');
    }
    sql += ` FROM ${this.escapeIdentifier(this.fromTable)}`;

    // JOIN clauses
    for (const join of this.joinClauses) {
      const tableRef = join.alias ? `${this.escapeIdentifier(join.table)} AS ${this.escapeIdentifier(join.alias)}` : this.escapeIdentifier(join.table);
      sql += ` ${join.type} JOIN ${tableRef} ON ${join.on}`;
    }

    // WHERE clause
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    // GROUP BY clause
    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.map(f => this.escapeIdentifier(f)).join(', ')}`;
    }

    // HAVING clause
    if (this.havingConditions.length > 0) {
      sql += ` HAVING ${this.havingConditions.join(' AND ')}`;
    }

    // ORDER BY clause
    if (this.orderByFields.length > 0) {
      const orderClauses = this.orderByFields.map(order => {
        let clause = `${this.escapeIdentifier(order.field)} ${order.direction}`;
        if (order.nulls && this.supportsNullsOrdering()) {
          clause += ` NULLS ${order.nulls}`;
        }
        return clause;
      });
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // LIMIT and OFFSET
    sql += this.buildLimitClause();

    // Validate query size
    if (sql.length > this.options.maxQuerySize) {
      throw new Error(`Query size exceeds maximum allowed size: ${sql.length} > ${this.options.maxQuerySize}`);
    }

    if (this.options.enableQueryLogging) {
      logger.debug('Generated SQL query', { sql, parameters: this.parameters });
    }

    return {
      sql,
      parameters: [...this.parameters],
    };
  }

  private buildMongoQuery(): DatabaseQuery {
    if (!this.mongoCollection) {
      throw new Error('Collection is required for MongoDB queries');
    }

    const options: Record<string, any> = {};

    if (Object.keys(this.mongoProjection).length > 0) {
      options.projection = this.mongoProjection;
    }

    if (Object.keys(this.mongoSort).length > 0) {
      options.sort = this.mongoSort;
    }

    if (this.mongoSkip !== undefined) {
      options.skip = this.mongoSkip;
    }

    if (this.mongoLimit !== undefined) {
      options.limit = this.mongoLimit;
    }

    if (this.options.enableQueryLogging) {
      logger.debug('Generated MongoDB query', { 
        collection: this.mongoCollection,
        filter: this.mongoFilter,
        options 
      });
    }

    return {
      collection: this.mongoCollection,
      filter: this.mongoFilter,
      options,
    };
  }

  private buildWhereCondition(field: string, operator: FilterCondition['operator'], value: any): { sql: string; parameter?: any } {
    const escapedField = this.escapeIdentifier(field);

    switch (operator) {
      case 'eq':
        return { sql: `${escapedField} = ?`, parameter: value };
      case 'ne':
        return { sql: `${escapedField} != ?`, parameter: value };
      case 'gt':
        return { sql: `${escapedField} > ?`, parameter: value };
      case 'gte':
        return { sql: `${escapedField} >= ?`, parameter: value };
      case 'lt':
        return { sql: `${escapedField} < ?`, parameter: value };
      case 'lte':
        return { sql: `${escapedField} <= ?`, parameter: value };
      case 'like':
        return { sql: `${escapedField} LIKE ?`, parameter: value };
      case 'ilike':
        const ilikeOp = this.getCaseInsensitiveLikeOperator();
        return { sql: `${escapedField} ${ilikeOp} ?`, parameter: value };
      case 'is_null':
        return { sql: `${escapedField} IS NULL` };
      case 'is_not_null':
        return { sql: `${escapedField} IS NOT NULL` };
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  private addMongoFilter(field: string, operator: FilterCondition['operator'], value: any): void {
    switch (operator) {
      case 'eq':
        this.mongoFilter[field] = value;
        break;
      case 'ne':
        this.mongoFilter[field] = { $ne: value };
        break;
      case 'gt':
        this.mongoFilter[field] = { $gt: value };
        break;
      case 'gte':
        this.mongoFilter[field] = { $gte: value };
        break;
      case 'lt':
        this.mongoFilter[field] = { $lt: value };
        break;
      case 'lte':
        this.mongoFilter[field] = { $lte: value };
        break;
      case 'like':
      case 'ilike':
        const pattern = value.replace(/%/g, '.*').replace(/_/g, '.');
        const options = operator === 'ilike' ? 'i' : '';
        this.mongoFilter[field] = { $regex: pattern, $options: options };
        break;
      case 'is_null':
        this.mongoFilter[field] = null;
        break;
      case 'is_not_null':
        this.mongoFilter[field] = { $ne: null };
        break;
    }
  }

  private buildSQLTextSearch(searchOptions: SearchQuery): QueryBuilder {
    const { term, fields, caseSensitive, exact } = searchOptions;
    
    if (exact) {
      // Exact match across fields
      const exactConditions = fields.map(field => {
        const operator = caseSensitive ? '=' : this.getCaseInsensitiveEqualsOperator();
        return `${this.escapeIdentifier(field)} ${operator} ?`;
      });
      this.whereConditions.push(`(${exactConditions.join(' OR ')})`);
      
      // Add parameter for each field
      for (let i = 0; i < fields.length; i++) {
        this.parameters.push(caseSensitive ? term : term.toLowerCase());
      }
    } else {
      // Pattern matching across fields
      const likeOperator = caseSensitive ? 'LIKE' : this.getCaseInsensitiveLikeOperator();
      const likeConditions = fields.map(field => 
        `${this.escapeIdentifier(field)} ${likeOperator} ?`
      );
      this.whereConditions.push(`(${likeConditions.join(' OR ')})`);
      
      // Add parameter for each field
      const searchPattern = `%${term}%`;
      for (let i = 0; i < fields.length; i++) {
        this.parameters.push(searchPattern);
      }
    }

    return this;
  }

  private buildMongoTextSearch(searchOptions: SearchQuery): QueryBuilder {
    const { term, fields, caseSensitive, exact } = searchOptions;

    if (exact) {
      // Exact match using $or
      const exactConditions = fields.map(field => ({
        [field]: caseSensitive ? term : { $regex: `^${this.escapeRegex(term)}$`, $options: 'i' }
      }));
      this.mongoFilter.$or = exactConditions;
    } else {
      // Text search using $or with regex
      const flags = caseSensitive ? '' : 'i';
      const pattern = this.escapeRegex(term);
      const textConditions = fields.map(field => ({
        [field]: { $regex: pattern, $options: flags }
      }));
      this.mongoFilter.$or = textConditions;
    }

    return this;
  }

  private buildLimitClause(): string {
    let clause = '';

    switch (this.databaseType) {
      case 'postgresql':
      case 'mysql':
      case 'mariadb':
      case 'sqlite':
        if (this.limitValue !== undefined) {
          clause += ` LIMIT ${this.limitValue}`;
        }
        if (this.offsetValue !== undefined) {
          clause += ` OFFSET ${this.offsetValue}`;
        }
        break;
      case 'mssql':
        // SQL Server uses OFFSET...FETCH
        if (this.offsetValue !== undefined || this.limitValue !== undefined) {
          clause += ` OFFSET ${this.offsetValue || 0} ROWS`;
          if (this.limitValue !== undefined) {
            clause += ` FETCH NEXT ${this.limitValue} ROWS ONLY`;
          }
        }
        break;
      case 'oracle':
        // Oracle uses ROWNUM or OFFSET...FETCH (12c+)
        if (this.offsetValue !== undefined || this.limitValue !== undefined) {
          clause += ` OFFSET ${this.offsetValue || 0} ROWS`;
          if (this.limitValue !== undefined) {
            clause += ` FETCH NEXT ${this.limitValue} ROWS ONLY`;
          }
        }
        break;
    }

    return clause;
  }

  private escapeIdentifier(identifier: string): string {
    switch (this.databaseType) {
      case 'postgresql':
        return `"${identifier.replace(/"/g, '""')}"`;
      case 'mysql':
      case 'mariadb':
        return `\`${identifier.replace(/`/g, '``')}\``;
      case 'mssql':
        return `[${identifier.replace(/]/g, ']]')}]`;
      case 'sqlite':
        return `"${identifier.replace(/"/g, '""')}"`;
      case 'oracle':
        return `"${identifier.replace(/"/g, '""')}"`;
      default:
        return identifier;
    }
  }

  private getCaseInsensitiveLikeOperator(): string {
    switch (this.databaseType) {
      case 'postgresql':
        return 'ILIKE';
      case 'mysql':
      case 'mariadb':
      case 'sqlite':
      case 'mssql':
      case 'oracle':
        return 'LIKE'; // Case insensitivity handled at collation level
      default:
        return 'LIKE';
    }
  }

  private getCaseInsensitiveEqualsOperator(): string {
    // Most databases handle case insensitivity through collation
    return '=';
  }

  private supportsNullsOrdering(): boolean {
    return ['postgresql', 'oracle', 'mssql'].includes(this.databaseType);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}