/**
 * OpenAPI 3.0 Specification Generator for Personal Pipeline REST API
 *
 * Generates comprehensive API documentation from existing Zod schemas
 * and route definitions with realistic examples for all 11 endpoints.
 */

import { OpenAPIV3 } from 'openapi-types';

/**
 * Complete OpenAPI 3.0 specification for Personal Pipeline REST API
 */
export const openAPISpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Personal Pipeline REST API',
    version: '1.0.0',
    description: `
# Personal Pipeline REST API

Intelligent Model Context Protocol (MCP) server REST API for automated retrieval of internal documentation 
to support AI-driven monitoring alert response and incident management.

## Features

- **Runbook Management**: Search and retrieve operational runbooks by alert characteristics
- **Decision Trees**: Get conditional logic for incident response scenarios  
- **Procedures**: Detailed step-by-step execution procedures
- **Escalation Paths**: Automated escalation contact and procedure retrieval
- **Knowledge Base**: General documentation search across all sources
- **Feedback System**: Resolution outcome tracking for continuous improvement
- **Performance Monitoring**: API health and performance metrics

## Authentication

Currently the API operates without authentication. In production environments, 
implement proper authentication and authorization mechanisms.

## Rate Limiting

The API supports up to 50 concurrent requests with intelligent caching to optimize performance.

## Error Handling

All endpoints return standardized error responses with:
- Correlation IDs for request tracking
- Detailed error codes and messages  
- Recovery actions and retry recommendations
- Business impact assessment for critical operations
    `,
    contact: {
      name: 'Personal Pipeline Team',
      email: 'support@personal-pipeline.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.personal-pipeline.com',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Search',
      description: 'General documentation search operations',
    },
    {
      name: 'Runbooks',
      description: 'Operational runbook management and retrieval',
    },
    {
      name: 'Decision Trees',
      description: 'Conditional logic and decision support',
    },
    {
      name: 'Procedures',
      description: 'Step-by-step procedure execution details',
    },
    {
      name: 'Escalation',
      description: 'Incident escalation path management',
    },
    {
      name: 'Sources',
      description: 'Documentation source management',
    },
    {
      name: 'Feedback',
      description: 'Resolution feedback and analytics',
    },
    {
      name: 'Monitoring',
      description: 'API health and performance monitoring',
    },
  ],
  paths: {
    '/api/search': {
      post: {
        tags: ['Search'],
        summary: 'Search knowledge base',
        description:
          'General documentation search across all configured sources with intelligent ranking',
        operationId: 'searchKnowledgeBase',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 500,
                    description: 'Search query with descriptive terms',
                    example: 'database connection timeout troubleshooting',
                  },
                  categories: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional category filters',
                    example: ['database', 'troubleshooting'],
                  },
                  max_age_days: {
                    type: 'number',
                    minimum: 1,
                    description: 'Maximum age of documents in days',
                    example: 30,
                  },
                  max_results: {
                    type: 'number',
                    minimum: 1,
                    maximum: 100,
                    default: 10,
                    description: 'Maximum number of results to return',
                    example: 10,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Search completed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SearchResponse' },
                example: {
                  success: true,
                  data: {
                    results: [
                      {
                        id: 'kb_001_database_timeout',
                        title: 'Database Connection Timeout Troubleshooting',
                        content:
                          'When database connections timeout, first check connection pool settings...',
                        source: 'confluence_ops',
                        source_type: 'confluence',
                        confidence_score: 0.92,
                        match_reasons: ['query term match', 'category relevance', 'recent updates'],
                        retrieval_time_ms: 145,
                        url: 'https://company.atlassian.net/wiki/spaces/OPS/pages/123456',
                        last_updated: '2024-01-15T10:30:00Z',
                        metadata: {
                          author: 'ops-team',
                          tags: ['database', 'troubleshooting', 'timeout'],
                        },
                      },
                    ],
                    total_results: 1,
                    execution_time_ms: 156,
                  },
                  metadata: {
                    execution_time_ms: 156,
                    correlation_id: 'req_20240130_143502_abc123',
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/runbooks/search': {
      post: {
        tags: ['Runbooks'],
        summary: 'Search runbooks by alert characteristics',
        description:
          'Find operational runbooks matching specific alert types, severity levels, and affected systems',
        operationId: 'searchRunbooks',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['alert_type', 'severity', 'affected_systems'],
                properties: {
                  alert_type: {
                    type: 'string',
                    minLength: 1,
                    description: 'Type of alert triggering the search',
                    example: 'database_connection_failure',
                  },
                  severity: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low', 'info'],
                    description: 'Alert severity level',
                    example: 'high',
                  },
                  affected_systems: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                    description: 'List of affected systems or services',
                    example: ['user-api', 'postgres-primary'],
                  },
                  context: {
                    type: 'object',
                    description: 'Additional context for runbook matching',
                    additionalProperties: true,
                    example: {
                      error_message: 'Connection timeout after 30s',
                      occurrence_count: 5,
                      time_window: '5m',
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Runbook search completed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RunbookSearchResponse' },
                example: {
                  success: true,
                  data: {
                    runbooks: [
                      {
                        id: 'rb_001_db_connection',
                        title: 'Database Connection Failure Response',
                        version: '2.1.0',
                        description:
                          'Immediate response procedures for database connectivity issues',
                        triggers: ['database_connection_failure', 'connection_timeout'],
                        severity_mapping: {
                          critical: 'critical',
                          high: 'high',
                          medium: 'medium',
                        },
                        decision_tree: {
                          id: 'dt_db_connection',
                          name: 'Database Connection Decision Tree',
                          description: 'Systematic approach to database connection issues',
                          branches: [
                            {
                              id: 'check_pool',
                              condition: 'connection_pool_exhausted',
                              description: 'Check if connection pool is exhausted',
                              action: 'Restart connection pool service',
                              next_step: 'verify_connections',
                              confidence: 0.85,
                            },
                          ],
                          default_action: 'escalate_to_dba',
                        },
                        procedures: [
                          {
                            id: 'restart_pool',
                            name: 'Restart Connection Pool',
                            description: 'Restart the database connection pool service',
                            command: 'sudo systemctl restart db-connection-pool',
                            expected_outcome: 'Service restarts within 30 seconds',
                            timeout_seconds: 60,
                            prerequisites: ['sudo_access', 'service_account'],
                          },
                        ],
                        escalation_path: 'dba_on_call',
                        metadata: {
                          created_at: '2024-01-01T00:00:00Z',
                          updated_at: '2024-01-15T10:30:00Z',
                          author: 'ops-team',
                          confidence_score: 0.91,
                          success_rate: 0.87,
                          avg_resolution_time_minutes: 12,
                        },
                      },
                    ],
                    total_results: 1,
                    confidence_scores: [0.91],
                  },
                  metadata: {
                    execution_time_ms: 89,
                    correlation_id: 'req_20240130_143503_def456',
                    cached: true,
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/runbooks/{id}': {
      get: {
        tags: ['Runbooks'],
        summary: 'Get specific runbook by ID',
        description:
          'Retrieve a specific runbook with all details including procedures and decision trees',
        operationId: 'getRunbook',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique runbook identifier',
            example: 'rb_001_db_connection',
          },
        ],
        responses: {
          '200': {
            description: 'Runbook retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RunbookResponse' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/runbooks': {
      get: {
        tags: ['Runbooks'],
        summary: 'List all runbooks',
        description: 'List all available runbooks with optional filtering by category and severity',
        operationId: 'listRunbooks',
        parameters: [
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by runbook category',
            example: 'database',
          },
          {
            name: 'severity',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low', 'info'],
            },
            description: 'Filter by severity level',
            example: 'high',
          },
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            description: 'Maximum number of runbooks to return',
            example: 20,
          },
        ],
        responses: {
          '200': {
            description: 'Runbooks listed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RunbookListResponse' },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/decision-tree': {
      post: {
        tags: ['Decision Trees'],
        summary: 'Get decision logic',
        description: 'Retrieve decision tree logic for specific alert contexts and scenarios',
        operationId: 'getDecisionTree',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['alert_context'],
                properties: {
                  alert_context: {
                    type: 'object',
                    description: 'Context information about the current alert',
                    additionalProperties: true,
                    example: {
                      alert_type: 'database_connection_failure',
                      severity: 'high',
                      affected_systems: ['user-api'],
                      metrics: {
                        connection_count: 0,
                        error_rate: 0.95,
                      },
                    },
                  },
                  current_agent_state: {
                    type: 'object',
                    description: 'Current state of the responding agent',
                    additionalProperties: true,
                    example: {
                      attempted_steps: ['check_service_status'],
                      execution_time_seconds: 45,
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Decision tree retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DecisionTreeResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/procedures/{id}': {
      get: {
        tags: ['Procedures'],
        summary: 'Get procedure details',
        description: 'Retrieve detailed execution steps for a specific procedure',
        operationId: 'getProcedure',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Procedure identifier in format: runbook_id_step_name',
            example: 'rb_001_restart_pool',
          },
        ],
        responses: {
          '200': {
            description: 'Procedure retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProcedureResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/escalation': {
      post: {
        tags: ['Escalation'],
        summary: 'Get escalation path',
        description:
          'Determine appropriate escalation contacts and procedures based on severity and business hours',
        operationId: 'getEscalationPath',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['severity', 'business_hours'],
                properties: {
                  severity: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low', 'info'],
                    description: 'Incident severity level',
                    example: 'critical',
                  },
                  business_hours: {
                    type: 'boolean',
                    description: 'Whether escalation is during business hours',
                    example: false,
                  },
                  failed_attempts: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Previous escalation attempts that failed',
                    example: ['primary_oncall', 'secondary_oncall'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Escalation path determined successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EscalationResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/sources': {
      get: {
        tags: ['Sources'],
        summary: 'List documentation sources',
        description: 'List all configured documentation sources with health status',
        operationId: 'listSources',
        responses: {
          '200': {
            description: 'Sources listed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SourcesResponse' },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/feedback': {
      post: {
        tags: ['Feedback'],
        summary: 'Record resolution feedback',
        description:
          'Record the outcome of incident resolution for system improvement and analytics',
        operationId: 'recordFeedback',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['runbook_id', 'procedure_id', 'outcome', 'resolution_time_minutes'],
                properties: {
                  runbook_id: {
                    type: 'string',
                    minLength: 1,
                    description: 'ID of the runbook used',
                    example: 'rb_001_db_connection',
                  },
                  procedure_id: {
                    type: 'string',
                    minLength: 1,
                    description: 'ID of the specific procedure executed',
                    example: 'restart_pool',
                  },
                  outcome: {
                    type: 'string',
                    enum: ['success', 'partial_success', 'failure', 'escalated'],
                    description: 'Final outcome of the resolution attempt',
                    example: 'success',
                  },
                  resolution_time_minutes: {
                    type: 'number',
                    minimum: 0,
                    description: 'Total time taken to resolve the incident',
                    example: 15,
                  },
                  notes: {
                    type: 'string',
                    description: 'Additional notes about the resolution process',
                    example: 'Required additional database restart after connection pool restart',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Feedback recorded successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FeedbackResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['Monitoring'],
        summary: 'API health status',
        description: 'Get consolidated health status of the API and all connected services',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          '503': {
            description: 'API is unhealthy or degraded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/performance': {
      get: {
        tags: ['Monitoring'],
        summary: 'Performance metrics',
        description: 'Get detailed performance metrics and statistics for the API',
        operationId: 'getPerformanceMetrics',
        responses: {
          '200': {
            description: 'Performance metrics retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PerformanceResponse' },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalServerError' },
        },
      },
    },
  },
  components: {
    schemas: {
      SearchResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: { $ref: '#/components/schemas/SearchResult' },
              },
              total_results: { type: 'number' },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      SearchResult: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          source: { type: 'string' },
          source_type: {
            type: 'string',
            enum: ['confluence', 'notion', 'github', 'database', 'web', 'file'],
          },
          confidence_score: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
          match_reasons: {
            type: 'array',
            items: { type: 'string' },
          },
          retrieval_time_ms: { type: 'number' },
          url: { type: 'string' },
          last_updated: { type: 'string', format: 'date-time' },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
      RunbookSearchResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              runbooks: {
                type: 'array',
                items: { $ref: '#/components/schemas/Runbook' },
              },
              total_results: { type: 'number' },
              confidence_scores: {
                type: 'array',
                items: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                },
              },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      RunbookResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { $ref: '#/components/schemas/Runbook' },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      RunbookListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              runbooks: {
                type: 'array',
                items: { $ref: '#/components/schemas/Runbook' },
              },
              total_count: { type: 'number' },
              filters_applied: {
                type: 'object',
                properties: {
                  category: { type: 'string', nullable: true },
                  severity: { type: 'string', nullable: true },
                  limit: { type: 'number' },
                },
              },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      Runbook: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          version: { type: 'string' },
          description: { type: 'string' },
          triggers: {
            type: 'array',
            items: { type: 'string' },
          },
          severity_mapping: {
            type: 'object',
            additionalProperties: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low', 'info'],
            },
          },
          decision_tree: { $ref: '#/components/schemas/DecisionTree' },
          procedures: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProcedureStep' },
          },
          escalation_path: { type: 'string' },
          metadata: {
            type: 'object',
            properties: {
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              author: { type: 'string' },
              confidence_score: {
                type: 'number',
                minimum: 0,
                maximum: 1,
              },
              success_rate: {
                type: 'number',
                minimum: 0,
                maximum: 1,
              },
              avg_resolution_time_minutes: { type: 'number' },
            },
          },
        },
      },
      DecisionTree: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          branches: {
            type: 'array',
            items: { $ref: '#/components/schemas/DecisionBranch' },
          },
          default_action: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
      DecisionBranch: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          condition: { type: 'string' },
          description: { type: 'string' },
          action: { type: 'string' },
          next_step: { type: 'string' },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
          rollback_step: { type: 'string' },
        },
      },
      ProcedureStep: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          command: { type: 'string' },
          expected_outcome: { type: 'string' },
          timeout_seconds: { type: 'number' },
          prerequisites: {
            type: 'array',
            items: { type: 'string' },
          },
          rollback_procedure: { type: 'string' },
          tools_required: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      DecisionTreeResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              decision_tree: { $ref: '#/components/schemas/DecisionTree' },
              confidence_score: {
                type: 'number',
                minimum: 0,
                maximum: 1,
              },
              context_applied: { type: 'boolean' },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      ProcedureResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              procedure: { $ref: '#/components/schemas/ProcedureStep' },
              related_steps: {
                type: 'array',
                items: { $ref: '#/components/schemas/ProcedureStep' },
              },
              confidence_score: {
                type: 'number',
                minimum: 0,
                maximum: 1,
              },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      EscalationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              escalation_contacts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    role: { type: 'string' },
                    contact: { type: 'string' },
                    availability: { type: 'string' },
                  },
                },
              },
              escalation_procedure: { type: 'string' },
              estimated_response_time: { type: 'string' },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      SourcesResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: ['confluence', 'notion', 'github', 'database', 'web', 'file'],
                    },
                    healthy: { type: 'boolean' },
                    response_time_ms: { type: 'number' },
                    last_check: { type: 'string', format: 'date-time' },
                    error_message: { type: 'string' },
                    metadata: { type: 'object', additionalProperties: true },
                  },
                },
              },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      FeedbackResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              feedback_id: { type: 'string' },
              recorded_at: { type: 'string', format: 'date-time' },
              acknowledgment: { type: 'string' },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['healthy', 'degraded', 'unhealthy'],
              },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source_name: { type: 'string' },
                    healthy: { type: 'boolean' },
                    response_time_ms: { type: 'number' },
                    last_check: { type: 'string', format: 'date-time' },
                    error_message: { type: 'string' },
                  },
                },
              },
              cache: {
                type: 'object',
                properties: {
                  memory_cache: {
                    type: 'object',
                    properties: {
                      healthy: { type: 'boolean' },
                      keys_count: { type: 'number' },
                      memory_usage_mb: { type: 'number' },
                      response_time_ms: { type: 'number' },
                    },
                  },
                  redis_cache: {
                    type: 'object',
                    properties: {
                      healthy: { type: 'boolean' },
                      connected: { type: 'boolean' },
                      response_time_ms: { type: 'number' },
                      error_message: { type: 'string' },
                    },
                  },
                  overall_healthy: { type: 'boolean' },
                },
              },
              tools: { type: 'object', additionalProperties: true },
              uptime_seconds: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      PerformanceResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              tools: { type: 'object', additionalProperties: true },
              cache: { type: 'object', additionalProperties: true },
              system: {
                type: 'object',
                properties: {
                  memory_usage_mb: { type: 'number' },
                  uptime_seconds: { type: 'number' },
                  node_version: { type: 'string' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          metadata: { $ref: '#/components/schemas/ResponseMetadata' },
        },
      },
      ResponseMetadata: {
        type: 'object',
        properties: {
          execution_time_ms: { type: 'number' },
          correlation_id: { type: 'string' },
          cached: { type: 'boolean' },
          cache_hit_time: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Request validation failed',
              },
              details: {
                type: 'object',
                additionalProperties: true,
                example: {
                  execution_time_ms: 45,
                  correlation_id: 'req_20240130_143504_error123',
                  recovery_actions: [
                    'Check request format and required fields',
                    'Verify data types',
                  ],
                  retry_recommended: false,
                },
              },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request - validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: {
                  execution_time_ms: 12,
                  correlation_id: 'req_20240130_143504_val456',
                  recovery_actions: [
                    'Check request format and required fields',
                    'Verify data types match schema requirements',
                  ],
                  retry_recommended: false,
                },
              },
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'RESOURCE_NOT_FOUND',
                message: 'Requested resource not found',
                details: {
                  execution_time_ms: 23,
                  correlation_id: 'req_20240130_143505_nf789',
                  recovery_actions: [
                    'Verify the resource ID is correct',
                    'Check if resource exists in the system',
                  ],
                  retry_recommended: false,
                },
              },
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An unexpected error occurred',
                details: {
                  execution_time_ms: 156,
                  correlation_id: 'req_20240130_143506_err999',
                  recovery_actions: ['Retry the request', 'Contact support if problem persists'],
                  retry_recommended: true,
                  escalation_required: false,
                },
              },
            },
          },
        },
      },
    },
    parameters: {
      CorrelationId: {
        name: 'X-Correlation-ID',
        in: 'header',
        description: 'Unique identifier for request tracking across systems',
        schema: { type: 'string' },
        example: 'req_20240130_143507_corr123',
      },
    },
  },
};
