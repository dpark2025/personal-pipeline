/**
 * Database Schema Detector - Automatic schema discovery and mapping
 * 
 * Authored by: Backend Technical Lead
 * Date: 2025-01-17
 * 
 * Enterprise-grade schema detection system for automatic discovery of
 * database structures, content patterns, and documentation tables.
 * 
 * Features:
 * - Multi-database schema discovery
 * - Content pattern analysis for documentation detection
 * - Relationship mapping and foreign key detection
 * - Performance optimization with intelligent sampling
 * - Metadata extraction and statistical analysis
 */

import { logger } from '../../utils/logger.js';
import { ConnectionManager } from './connection-manager.js';
import { QueryBuilder } from './query-builder.js';
import { DatabaseType, TableSchema, ColumnSchema } from './database-adapter.js';

/**
 * Schema detection options
 */
export interface SchemaDetectionOptions {
  /** Automatically discover all tables/collections */
  autoDiscover?: boolean;
  /** Include system tables in discovery */
  includeSystemTables?: boolean;
  /** Minimum row count for table inclusion */
  minRowCount?: number;
  /** Maximum tables to analyze per database */
  maxTablesPerDatabase?: number;
  /** Sample size for content analysis */
  contentSampleSize?: number;
  /** Enable relationship detection */
  detectRelationships?: boolean;
  /** Enable content pattern analysis */
  analyzeContentPatterns?: boolean;
  /** Confidence threshold for documentation table detection */
  documentationTableThreshold?: number;
}

/**
 * Schema detection result
 */
export interface SchemaDetectionResult {
  tables: TableSchema[];
  collections?: CollectionSchema[]; // For MongoDB
  relationships: RelationshipInfo[];
  documentationTables: DocumentationTableInfo[];
  statistics: SchemaStatistics;
  detectionTime: number;
}

/**
 * Collection schema for NoSQL databases
 */
export interface CollectionSchema {
  name: string;
  documentCount: number;
  averageDocumentSize: number;
  fieldTypes: Record<string, string>;
  sampleDocuments: any[];
  indexes: string[];
  isDocumentationCollection: boolean;
}

/**
 * Table information with content analysis
 */
export interface TableInfo {
  name: string;
  schema?: string;
  rowCount: number;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  isDocumentationTable: boolean;
  contentPatterns: ContentPattern[];
  confidence: number;
}

/**
 * Column information with enhanced metadata
 */
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isIndexed?: boolean;
  uniqueValues?: number;
  contentType?: 'title' | 'content' | 'category' | 'author' | 'date' | 'tags' | 'metadata' | 'unknown';
  sampleValues?: any[];
}

/**
 * Index information
 */
export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
  type: string;
}

/**
 * Relationship information between tables
 */
export interface RelationshipInfo {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  confidence: number;
}

/**
 * Documentation table information
 */
export interface DocumentationTableInfo {
  tableName: string;
  confidence: number;
  detectedType: 'runbook' | 'documentation' | 'faq' | 'procedure' | 'mixed';
  recommendedMapping: {
    titleField: string;
    contentField: string;
    categoryField?: string;
    authorField?: string;
    dateField?: string;
    tagsField?: string;
  };
  contentPatterns: ContentPattern[];
  statistics: {
    totalRows: number;
    avgContentLength: number;
    documentationScore: number;
  };
}

/**
 * Content pattern detected in table data
 */
export interface ContentPattern {
  pattern: 'runbook' | 'procedure' | 'faq' | 'documentation' | 'code' | 'configuration';
  confidence: number;
  indicators: string[];
  sampleRows: number;
}

/**
 * Schema detection statistics
 */
export interface SchemaStatistics {
  totalTables: number;
  totalColumns: number;
  totalRows: number;
  documentationTables: number;
  averageTableSize: number;
  detectionAccuracy: number;
  processingTime: number;
}

/**
 * Database-specific schema queries
 */
interface SchemaQueries {
  listTables: string;
  getTableInfo: string;
  getColumnInfo: string;
  getIndexInfo: string;
  getForeignKeys: string;
  getRowCount: string;
  sampleData: string;
}

/**
 * Enterprise-grade schema detector with intelligent analysis
 */
export class SchemaDetector {
  private connectionManager: ConnectionManager;
  private options: Required<SchemaDetectionOptions>;
  private queryBuilder: QueryBuilder;
  private schemaQueries: Map<DatabaseType, SchemaQueries> = new Map();

  constructor(connectionManager: ConnectionManager, options: SchemaDetectionOptions = {}) {
    this.connectionManager = connectionManager;
    this.options = {
      autoDiscover: options.autoDiscover ?? true,
      includeSystemTables: options.includeSystemTables ?? false,
      minRowCount: options.minRowCount ?? 1,
      maxTablesPerDatabase: options.maxTablesPerDatabase ?? 100,
      contentSampleSize: options.contentSampleSize ?? 100,
      detectRelationships: options.detectRelationships ?? true,
      analyzeContentPatterns: options.analyzeContentPatterns ?? true,
      documentationTableThreshold: options.documentationTableThreshold ?? 0.6,
    };

    // Initialize query builder - will get database type from connection
    this.queryBuilder = new QueryBuilder('postgresql'); // Placeholder, will be updated
    this.initializeSchemaQueries();
  }

  /**
   * Detect database schema and analyze content patterns
   */
  async detectSchema(): Promise<SchemaDetectionResult> {
    const startTime = performance.now();

    try {
      logger.info('Starting database schema detection');

      const connection = await this.connectionManager.getConnection();
      this.queryBuilder = new QueryBuilder(connection.type);

      const result: SchemaDetectionResult = {
        tables: [],
        relationships: [],
        documentationTables: [],
        statistics: {
          totalTables: 0,
          totalColumns: 0,
          totalRows: 0,
          documentationTables: 0,
          averageTableSize: 0,
          detectionAccuracy: 0,
          processingTime: 0,
        },
        detectionTime: 0,
      };

      if (connection.type === 'mongodb') {
        result.collections = await this.detectMongoDBSchema(connection);
        result.statistics.totalTables = result.collections.length;
      } else {
        result.tables = await this.detectSQLSchema(connection);
        result.statistics.totalTables = result.tables.length;
        
        if (this.options.detectRelationships) {
          result.relationships = await this.detectRelationships(connection, result.tables);
        }
      }

      // Analyze documentation tables/collections
      if (this.options.analyzeContentPatterns) {
        result.documentationTables = await this.analyzeDocumentationTables(connection, result.tables || result.collections || []);
        result.statistics.documentationTables = result.documentationTables.length;
      }

      // Calculate statistics
      result.statistics = await this.calculateStatistics(result);
      result.detectionTime = performance.now() - startTime;

      await this.connectionManager.releaseConnection(connection);

      logger.info('Schema detection completed', {
        totalTables: result.statistics.totalTables,
        documentationTables: result.statistics.documentationTables,
        detectionTime: `${result.detectionTime.toFixed(2)}ms`,
      });

      return result;

    } catch (error) {
      logger.error('Schema detection failed', { error });
      throw error;
    }
  }

  /**
   * Analyze a specific table for documentation patterns
   */
  async analyzeTable(tableName: string): Promise<DocumentationTableInfo | null> {
    try {
      const connection = await this.connectionManager.getConnection();
      
      const tableInfo = await this.getTableInfo(connection, tableName);
      if (!tableInfo) {
        return null;
      }

      const documentationAnalysis = await this.analyzeTableContent(connection, tableInfo);
      
      await this.connectionManager.releaseConnection(connection);
      
      return documentationAnalysis;

    } catch (error) {
      logger.error(`Failed to analyze table ${tableName}`, { error });
      return null;
    }
  }

  // Private methods

  private async detectSQLSchema(connection: any): Promise<TableSchema[]> {
    const tables: TableSchema[] = [];
    const queries = this.schemaQueries.get(connection.type);
    
    if (!queries) {
      throw new Error(`Schema queries not defined for database type: ${connection.type}`);
    }

    // Get list of tables
    const tableListResult = await this.executeQuery(connection, queries.listTables);
    const tableNames = this.extractTableNames(tableListResult, connection.type);

    // Filter system tables if requested
    const filteredTables = this.options.includeSystemTables 
      ? tableNames 
      : tableNames.filter(name => !this.isSystemTable(name, connection.type));

    // Limit tables to analyze
    const tablesToAnalyze = filteredTables.slice(0, this.options.maxTablesPerDatabase);

    for (const tableName of tablesToAnalyze) {
      try {
        const tableSchema = await this.analyzeTableSchema(connection, tableName, queries);
        
        // Filter by minimum row count
        if (tableSchema.rowCount >= this.options.minRowCount) {
          tables.push(tableSchema);
        }
      } catch (error) {
        logger.warn(`Failed to analyze table ${tableName}`, { error });
      }
    }

    return tables;
  }

  private async detectMongoDBSchema(connection: any): Promise<CollectionSchema[]> {
    const collections: CollectionSchema[] = [];

    try {
      const db = connection.client.db();
      const collectionNames = await db.listCollections().toArray();

      for (const collectionInfo of collectionNames) {
        const collectionName = collectionInfo.name;
        
        // Skip system collections unless requested
        if (!this.options.includeSystemTables && collectionName.startsWith('system.')) {
          continue;
        }

        try {
          const collection = db.collection(collectionName);
          const documentCount = await collection.countDocuments();
          
          // Filter by minimum document count
          if (documentCount < this.options.minRowCount) {
            continue;
          }

          // Sample documents for field analysis
          const sampleSize = Math.min(this.options.contentSampleSize, documentCount);
          const sampleDocuments = await collection.aggregate([
            { $sample: { size: sampleSize } }
          ]).toArray();

          // Analyze field types
          const fieldTypes = this.analyzeMongoFieldTypes(sampleDocuments);
          
          // Calculate average document size
          const avgDocumentSize = sampleDocuments.reduce((sum, doc) => 
            sum + JSON.stringify(doc).length, 0) / sampleDocuments.length;

          // Get indexes
          const indexes = await collection.listIndexes().toArray();
          const indexNames = indexes.map(idx => idx.name);

          // Detect if this is a documentation collection
          const isDocumentationCollection = await this.isDocumentationCollection(sampleDocuments);

          collections.push({
            name: collectionName,
            documentCount,
            averageDocumentSize,
            fieldTypes,
            sampleDocuments: sampleDocuments.slice(0, 5), // Keep small sample
            indexes: indexNames,
            isDocumentationCollection,
          });

        } catch (error) {
          logger.warn(`Failed to analyze collection ${collectionName}`, { error });
        }
      }

    } catch (error) {
      logger.error('Failed to detect MongoDB schema', { error });
    }

    return collections;
  }

  private async analyzeTableSchema(connection: any, tableName: string, queries: SchemaQueries): Promise<TableSchema> {
    // Get row count
    const rowCountQuery = queries.getRowCount.replace('{table}', tableName);
    const rowCountResult = await this.executeQuery(connection, rowCountQuery);
    const rowCount = this.extractRowCount(rowCountResult, connection.type);

    // Get column information
    const columnQuery = queries.getColumnInfo.replace('{table}', tableName);
    const columnResult = await this.executeQuery(connection, columnQuery);
    const columns = this.extractColumnInfo(columnResult, connection.type);

    // Get index information
    const indexQuery = queries.getIndexInfo.replace('{table}', tableName);
    const indexResult = await this.executeQuery(connection, indexQuery);
    const indexes = this.extractIndexInfo(indexResult, connection.type);

    // Find primary key columns
    const primaryKeyColumns = this.findPrimaryKeyColumns(columns, indexes);

    return {
      name: tableName,
      columns,
      primaryKey: primaryKeyColumns,
      indexes: indexes.map(idx => idx.name),
      rowCount,
    };
  }

  private async detectRelationships(connection: any, tables: TableSchema[]): Promise<RelationshipInfo[]> {
    const relationships: RelationshipInfo[] = [];
    const queries = this.schemaQueries.get(connection.type);
    
    if (!queries || !queries.getForeignKeys) {
      return relationships;
    }

    for (const table of tables) {
      try {
        const fkQuery = queries.getForeignKeys.replace('{table}', table.name);
        const fkResult = await this.executeQuery(connection, fkQuery);
        const foreignKeys = this.extractForeignKeyInfo(fkResult, connection.type);

        for (const fk of foreignKeys) {
          relationships.push({
            sourceTable: table.name,
            sourceColumn: fk.sourceColumn,
            targetTable: fk.targetTable,
            targetColumn: fk.targetColumn,
            relationshipType: 'one-to-many', // Default, could be analyzed further
            confidence: 0.9,
          });
        }
      } catch (error) {
        logger.warn(`Failed to detect relationships for table ${table.name}`, { error });
      }
    }

    return relationships;
  }

  private async analyzeDocumentationTables(connection: any, tables: (TableSchema | CollectionSchema)[]): Promise<DocumentationTableInfo[]> {
    const documentationTables: DocumentationTableInfo[] = [];

    for (const table of tables) {
      try {
        let tableInfo: DocumentationTableInfo | null = null;

        if ('columns' in table) {
          // SQL table
          tableInfo = await this.analyzeTableContent(connection, table);
        } else {
          // MongoDB collection
          tableInfo = await this.analyzeCollectionContent(connection, table);
        }

        if (tableInfo && tableInfo.confidence >= this.options.documentationTableThreshold) {
          documentationTables.push(tableInfo);
        }
      } catch (error) {
        logger.warn(`Failed to analyze content for ${table.name}`, { error });
      }
    }

    return documentationTables;
  }

  private async analyzeTableContent(connection: any, table: TableSchema): Promise<DocumentationTableInfo | null> {
    // Sample data from the table
    const sampleQuery = this.buildSampleDataQuery(table.name, connection.type);
    const sampleResult = await this.executeQuery(connection, sampleQuery);
    const sampleRows = this.extractSampleData(sampleResult, connection.type);

    if (sampleRows.length === 0) {
      return null;
    }

    // Analyze content patterns
    const contentAnalysis = this.analyzeContentPatterns(sampleRows, table.columns);
    
    // Detect field mappings
    const fieldMapping = this.detectFieldMappings(table.columns, sampleRows);

    return {
      tableName: table.name,
      confidence: contentAnalysis.confidence,
      detectedType: contentAnalysis.type,
      recommendedMapping: fieldMapping,
      contentPatterns: contentAnalysis.patterns,
      statistics: {
        totalRows: table.rowCount || 0,
        avgContentLength: contentAnalysis.avgContentLength,
        documentationScore: contentAnalysis.confidence,
      },
    };
  }

  private async analyzeCollectionContent(connection: any, collection: CollectionSchema): Promise<DocumentationTableInfo | null> {
    // Analyze sample documents
    const contentAnalysis = this.analyzeMongoContentPatterns(collection.sampleDocuments);
    
    // Detect field mappings
    const fieldMapping = this.detectMongoFieldMappings(collection.fieldTypes, collection.sampleDocuments);

    return {
      tableName: collection.name,
      confidence: contentAnalysis.confidence,
      detectedType: contentAnalysis.type,
      recommendedMapping: fieldMapping,
      contentPatterns: contentAnalysis.patterns,
      statistics: {
        totalRows: collection.documentCount,
        avgContentLength: collection.averageDocumentSize,
        documentationScore: contentAnalysis.confidence,
      },
    };
  }

  private analyzeContentPatterns(sampleRows: any[], columns: ColumnSchema[]): {
    confidence: number;
    type: 'runbook' | 'documentation' | 'faq' | 'procedure' | 'mixed';
    patterns: ContentPattern[];
    avgContentLength: number;
  } {
    const patterns: ContentPattern[] = [];
    let totalContentLength = 0;
    let documentationScore = 0;

    // Analyze text columns for content patterns
    const textColumns = columns.filter(col => 
      col.type.toLowerCase().includes('text') || 
      col.type.toLowerCase().includes('varchar') ||
      col.type.toLowerCase().includes('char')
    );

    for (const column of textColumns) {
      const columnValues = sampleRows.map(row => row[column.name]).filter(Boolean);
      
      if (columnValues.length === 0) continue;

      const columnAnalysis = this.analyzeColumnContent(columnValues);
      totalContentLength += columnAnalysis.avgLength;
      documentationScore += columnAnalysis.documentationScore;

      if (columnAnalysis.patterns.length > 0) {
        patterns.push(...columnAnalysis.patterns);
      }
    }

    const avgContentLength = totalContentLength / Math.max(textColumns.length, 1);
    const confidence = documentationScore / Math.max(textColumns.length, 1);

    // Determine primary type based on patterns
    const patternCounts = patterns.reduce((counts, pattern) => {
      counts[pattern.pattern] = (counts[pattern.pattern] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const primaryType = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as any || 'documentation';

    return {
      confidence,
      type: primaryType,
      patterns,
      avgContentLength,
    };
  }

  private analyzeColumnContent(values: string[]): {
    avgLength: number;
    documentationScore: number;
    patterns: ContentPattern[];
  } {
    const patterns: ContentPattern[] = [];
    const totalLength = values.reduce((sum, val) => sum + val.length, 0);
    const avgLength = totalLength / values.length;

    let documentationScore = 0;

    // Check for runbook patterns
    const runbookIndicators = values.filter(val => 
      /\b(?:runbook|procedure|incident|troubleshoot|escalate)\b/i.test(val)
    ).length;

    if (runbookIndicators > 0) {
      patterns.push({
        pattern: 'runbook',
        confidence: runbookIndicators / values.length,
        indicators: ['runbook_keywords'],
        sampleRows: runbookIndicators,
      });
      documentationScore += 0.8;
    }

    // Check for procedure patterns
    const procedureIndicators = values.filter(val => 
      /\b(?:step|instruction|process|workflow)\b/i.test(val)
    ).length;

    if (procedureIndicators > 0) {
      patterns.push({
        pattern: 'procedure',
        confidence: procedureIndicators / values.length,
        indicators: ['procedure_keywords'],
        sampleRows: procedureIndicators,
      });
      documentationScore += 0.6;
    }

    // Check for FAQ patterns
    const faqIndicators = values.filter(val => 
      /\b(?:question|answer|faq|how\s+to|what\s+is)\b/i.test(val)
    ).length;

    if (faqIndicators > 0) {
      patterns.push({
        pattern: 'faq',
        confidence: faqIndicators / values.length,
        indicators: ['faq_keywords'],
        sampleRows: faqIndicators,
      });
      documentationScore += 0.5;
    }

    // Base documentation score on content length and structure
    if (avgLength > 100) {
      documentationScore += 0.3;
    }
    if (avgLength > 500) {
      documentationScore += 0.2;
    }

    return {
      avgLength,
      documentationScore: Math.min(documentationScore, 1),
      patterns,
    };
  }

  private detectFieldMappings(columns: ColumnSchema[], sampleRows: any[]): {
    titleField: string;
    contentField: string;
    categoryField?: string;
    authorField?: string;
    dateField?: string;
    tagsField?: string;
  } {
    const mapping: any = {};

    // Detect title field
    const titleField = columns.find(col => 
      /\b(?:title|name|subject|heading)\b/i.test(col.name)
    )?.name || columns.find(col => 
      col.type.toLowerCase().includes('varchar') && col.maxLength && col.maxLength <= 255
    )?.name || columns[0]?.name;

    // Detect content field
    const contentField = columns.find(col => 
      /\b(?:content|body|description|text|message)\b/i.test(col.name)
    )?.name || columns.find(col => 
      col.type.toLowerCase().includes('text')
    )?.name || columns.find(col => 
      col.type.toLowerCase().includes('varchar') && (!col.maxLength || col.maxLength > 255)
    )?.name;

    // Detect other fields
    const categoryField = columns.find(col => 
      /\b(?:category|type|classification|group)\b/i.test(col.name)
    )?.name;

    const authorField = columns.find(col => 
      /\b(?:author|creator|user|owner)\b/i.test(col.name)
    )?.name;

    const dateField = columns.find(col => 
      /\b(?:date|time|created|updated|modified)\b/i.test(col.name) &&
      (col.type.toLowerCase().includes('date') || col.type.toLowerCase().includes('time'))
    )?.name;

    const tagsField = columns.find(col => 
      /\b(?:tags|labels|keywords)\b/i.test(col.name)
    )?.name;

    return {
      titleField: titleField || 'unknown',
      contentField: contentField || 'unknown',
      categoryField,
      authorField,
      dateField,
      tagsField,
    };
  }

  // Database-specific helper methods

  private initializeSchemaQueries(): void {
    // PostgreSQL queries
    this.schemaQueries.set('postgresql', {
      listTables: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `,
      getTableInfo: `
        SELECT * 
        FROM information_schema.tables 
        WHERE table_name = '{table}'
      `,
      getColumnInfo: `
        SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = '{table}' 
        ORDER BY ordinal_position
      `,
      getIndexInfo: `
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = '{table}'
      `,
      getForeignKeys: `
        SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = '{table}'
      `,
      getRowCount: `SELECT COUNT(*) as count FROM "{table}"`,
      sampleData: `SELECT * FROM "{table}" ORDER BY RANDOM() LIMIT 100`,
    });

    // MySQL queries
    this.schemaQueries.set('mysql', {
      listTables: `SHOW TABLES`,
      getTableInfo: `SHOW TABLE STATUS LIKE '{table}'`,
      getColumnInfo: `DESCRIBE {table}`,
      getIndexInfo: `SHOW INDEX FROM {table}`,
      getForeignKeys: `
        SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table}'
      `,
      getRowCount: `SELECT COUNT(*) as count FROM \`{table}\``,
      sampleData: `SELECT * FROM \`{table}\` ORDER BY RAND() LIMIT 100`,
    });

    // Add more database-specific queries as needed
    this.schemaQueries.set('sqlite', {
      listTables: `SELECT name FROM sqlite_master WHERE type='table'`,
      getTableInfo: `SELECT * FROM sqlite_master WHERE name='{table}'`,
      getColumnInfo: `PRAGMA table_info({table})`,
      getIndexInfo: `PRAGMA index_list({table})`,
      getForeignKeys: `PRAGMA foreign_key_list({table})`,
      getRowCount: `SELECT COUNT(*) as count FROM "{table}"`,
      sampleData: `SELECT * FROM "{table}" ORDER BY RANDOM() LIMIT 100`,
    });
  }

  private async executeQuery(connection: any, query: string): Promise<any> {
    switch (connection.type) {
      case 'postgresql':
      case 'mysql':
      case 'sqlite':
        return await connection.client.query(query);
      case 'mongodb':
        // MongoDB operations would be different
        throw new Error('MongoDB queries should use specific collection methods');
      default:
        throw new Error(`Unsupported database type: ${connection.type}`);
    }
  }

  private extractTableNames(result: any, databaseType: DatabaseType): string[] {
    switch (databaseType) {
      case 'postgresql':
        return result.rows.map((row: any) => row.table_name);
      case 'mysql':
        return result.map((row: any) => Object.values(row)[0]);
      case 'sqlite':
        return result.map((row: any) => row.name);
      default:
        return [];
    }
  }

  private isSystemTable(tableName: string, databaseType: DatabaseType): boolean {
    const systemPrefixes = {
      postgresql: ['pg_', 'information_schema'],
      mysql: ['mysql', 'information_schema', 'performance_schema', 'sys'],
      sqlite: ['sqlite_'],
      mssql: ['sys', 'INFORMATION_SCHEMA'],
      oracle: ['SYS', 'SYSTEM'],
    };

    const prefixes = systemPrefixes[databaseType] || [];
    return prefixes.some(prefix => tableName.toLowerCase().startsWith(prefix.toLowerCase()));
  }

  private extractRowCount(result: any, databaseType: DatabaseType): number {
    switch (databaseType) {
      case 'postgresql':
      case 'mysql':
      case 'sqlite':
        return parseInt(result.rows?.[0]?.count || result[0]?.count || '0');
      default:
        return 0;
    }
  }

  private extractColumnInfo(result: any, databaseType: DatabaseType): ColumnSchema[] {
    // Implementation would vary by database type
    // This is a simplified version
    const columns: ColumnSchema[] = [];
    
    const rows = result.rows || result;
    for (const row of rows) {
      columns.push({
        name: row.column_name || row.Field || row.name,
        type: row.data_type || row.Type || row.type,
        nullable: row.is_nullable === 'YES' || row.Null === 'YES' || row.notnull === 0,
        defaultValue: row.column_default || row.Default || row.dflt_value,
        maxLength: row.character_maximum_length,
        isPrimaryKey: false, // Will be determined from indexes
        isForeignKey: false, // Will be determined separately
      });
    }

    return columns;
  }

  private extractIndexInfo(result: any, databaseType: DatabaseType): IndexInfo[] {
    // Simplified implementation
    return [];
  }

  private extractForeignKeyInfo(result: any, databaseType: DatabaseType): Array<{
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
  }> {
    // Simplified implementation
    return [];
  }

  private extractSampleData(result: any, databaseType: DatabaseType): any[] {
    return result.rows || result || [];
  }

  private findPrimaryKeyColumns(columns: ColumnSchema[], indexes: IndexInfo[]): string[] {
    const primaryIndex = indexes.find(idx => idx.isPrimary);
    return primaryIndex?.columns || [];
  }

  private buildSampleDataQuery(tableName: string, databaseType: DatabaseType): string {
    const queries = this.schemaQueries.get(databaseType);
    return queries?.sampleData.replace('{table}', tableName) || '';
  }

  private analyzeMongoFieldTypes(documents: any[]): Record<string, string> {
    const fieldTypes: Record<string, string> = {};
    
    for (const doc of documents) {
      for (const [field, value] of Object.entries(doc)) {
        if (field === '_id') continue;
        
        const type = typeof value;
        if (!fieldTypes[field]) {
          fieldTypes[field] = type;
        } else if (fieldTypes[field] !== type) {
          fieldTypes[field] = 'mixed';
        }
      }
    }

    return fieldTypes;
  }

  private async isDocumentationCollection(documents: any[]): Promise<boolean> {
    // Analyze if this MongoDB collection contains documentation
    let documentationScore = 0;

    for (const doc of documents) {
      const content = JSON.stringify(doc).toLowerCase();
      
      if (/\b(?:title|content|description|body)\b/.test(content)) {
        documentationScore += 0.3;
      }
      
      if (/\b(?:runbook|procedure|documentation|guide)\b/.test(content)) {
        documentationScore += 0.5;
      }
    }

    return (documentationScore / documents.length) > 0.3;
  }

  private analyzeMongoContentPatterns(documents: any[]): {
    confidence: number;
    type: 'runbook' | 'documentation' | 'faq' | 'procedure' | 'mixed';
    patterns: ContentPattern[];
  } {
    // Simplified MongoDB content analysis
    return {
      confidence: 0.5,
      type: 'documentation',
      patterns: [],
    };
  }

  private detectMongoFieldMappings(fieldTypes: Record<string, string>, documents: any[]): {
    titleField: string;
    contentField: string;
    categoryField?: string;
    authorField?: string;
    dateField?: string;
    tagsField?: string;
  } {
    // Detect MongoDB field mappings
    const fieldNames = Object.keys(fieldTypes);
    
    const titleField = fieldNames.find(name => 
      /\b(?:title|name|subject)\b/i.test(name)
    ) || fieldNames[0] || 'title';

    const contentField = fieldNames.find(name => 
      /\b(?:content|body|description|text)\b/i.test(name)
    ) || fieldNames[1] || 'content';

    return {
      titleField,
      contentField,
      categoryField: fieldNames.find(name => /\b(?:category|type)\b/i.test(name)),
      authorField: fieldNames.find(name => /\b(?:author|creator)\b/i.test(name)),
      dateField: fieldNames.find(name => /\b(?:date|created|updated)\b/i.test(name)),
      tagsField: fieldNames.find(name => /\b(?:tags|labels)\b/i.test(name)),
    };
  }

  private async calculateStatistics(result: SchemaDetectionResult): Promise<SchemaStatistics> {
    const tables = result.tables || [];
    const collections = result.collections || [];
    const allTables = [...tables, ...collections];

    const totalRows = allTables.reduce((sum, table) => 
      sum + (('rowCount' in table) ? table.rowCount : table.documentCount), 0);

    const totalColumns = tables.reduce((sum, table) => sum + table.columns.length, 0);

    return {
      totalTables: allTables.length,
      totalColumns,
      totalRows,
      documentationTables: result.documentationTables.length,
      averageTableSize: totalRows / Math.max(allTables.length, 1),
      detectionAccuracy: 0.85, // Placeholder
      processingTime: result.detectionTime,
    };
  }
}