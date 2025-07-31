/**
 * Comprehensive REST API Endpoint Tests
 * 
 * Tests all 11 REST API endpoints with realistic examples,
 * correlation ID tracking, error handling, and performance validation.
 */

import request from 'supertest';
import { PersonalPipelineServer } from '../../src/core/server.js';
import { ConfigManager } from '../../src/utils/config.js';
// import { logger } from '../../src/utils/logger.js';

describe('Personal Pipeline REST API Endpoints', () => {
  let server: PersonalPipelineServer;
  let app: any;
  let baseURL: string;

  beforeAll(async () => {
    // Initialize server with test configuration
    const configManager = new ConfigManager();
    server = new PersonalPipelineServer(configManager);
    
    // Start server
    await server.start();
    
    // Get Express app for testing
    app = (server as any).expressApp;
    baseURL = '/api';
    
    // Wait for server to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000);

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  }, 10000);

  describe('Correlation ID Tracking', () => {
    it('should generate correlation ID when not provided', async () => {
      const response = await request(app)
        .get(`${baseURL}/health`)
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.headers['x-correlation-id']).toMatch(/^req_\d{15}_[a-z0-9]{8}$/);
      expect(response.body.metadata?.correlation_id).toBeDefined();
    });

    it('should use provided correlation ID', async () => {
      const customCorrelationId = 'test_correlation_12345';
      
      const response = await request(app)
        .get(`${baseURL}/health`)
        .set('X-Correlation-ID', customCorrelationId)
        .expect(200);

      expect(response.headers['x-correlation-id']).toBe(customCorrelationId);
      expect(response.body.metadata?.correlation_id).toBe(customCorrelationId);
    });

    it('should handle invalid correlation ID gracefully', async () => {
      const invalidCorrelationId = 'x'.repeat(150); // Too long
      
      const response = await request(app)
        .get(`${baseURL}/health`)
        .set('X-Correlation-ID', invalidCorrelationId)
        .expect(200);

      // Should generate new correlation ID
      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.headers['x-correlation-id']).not.toBe(invalidCorrelationId);
      expect(response.headers['x-correlation-id']).toMatch(/^req_\d{15}_[a-z0-9]{8}$/);
    });
  });

  describe('1. POST /api/search - General Knowledge Base Search', () => {
    it('should search knowledge base successfully', async () => {
      const searchPayload = {
        query: 'database connection timeout troubleshooting',
        categories: ['database', 'troubleshooting'],
        max_results: 5
      };

      const response = await request(app)
        .post(`${baseURL}/search`)
        .send(searchPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata.correlation_id).toBeDefined();
      expect(response.body.metadata.execution_time_ms).toBeGreaterThan(0);
      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.headers['x-response-time']).toBeDefined();
    });

    it('should validate required query parameter', async () => {
      const response = await request(app)
        .post(`${baseURL}/search`)
        .send({ categories: ['test'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.correlation_id).toBeDefined();
      expect(response.body.error.details.validation_errors).toContain('Missing required field: query');
    });

    it('should handle empty query string', async () => {
      const response = await request(app)
        .post(`${baseURL}/search`)
        .send({ query: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should limit max_results parameter', async () => {
      const response = await request(app)
        .post(`${baseURL}/search`)
        .send({ 
          query: 'test query',
          max_results: 150 // Above limit
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. POST /api/runbooks/search - Runbook Search', () => {
    it('should search runbooks by alert characteristics', async () => {
      const runbookSearchPayload = {
        alert_type: 'database_connection_failure',
        severity: 'high',
        affected_systems: ['user-api', 'postgres-primary'],
        context: {
          error_message: 'Connection timeout after 30s',
          occurrence_count: 5
        }
      };

      const response = await request(app)
        .post(`${baseURL}/runbooks/search`)
        .send(runbookSearchPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata.correlation_id).toBeDefined();
      expect(response.body.metadata.execution_time_ms).toBeGreaterThan(0);
      
      // Should be cached for critical runbook operations
      expect(response.headers['x-cache-hint']).toBeDefined();
    });

    it('should validate required fields for runbook search', async () => {
      const response = await request(app)
        .post(`${baseURL}/runbooks/search`)
        .send({ 
          alert_type: 'database_failure'
          // Missing severity and affected_systems
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.validation_errors).toEqual(
        expect.arrayContaining([
          'Missing required field: severity',
          'Missing required field: affected_systems'
        ])
      );
    });

    it('should validate severity enum values', async () => {
      const response = await request(app)
        .post(`${baseURL}/runbooks/search`)
        .send({
          alert_type: 'test_alert',
          severity: 'super_critical', // Invalid severity
          affected_systems: ['system1']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require non-empty affected_systems array', async () => {
      const response = await request(app)
        .post(`${baseURL}/runbooks/search`)
        .send({
          alert_type: 'test_alert',
          severity: 'high',
          affected_systems: []
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. GET /api/runbooks/:id - Specific Runbook Retrieval', () => {
    it('should retrieve specific runbook by ID', async () => {
      const runbookId = 'rb_001_db_connection';
      
      const response = await request(app)
        .get(`${baseURL}/runbooks/${runbookId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata.correlation_id).toBeDefined();
    });

    it('should handle non-existent runbook ID', async () => {
      const response = await request(app)
        .get(`${baseURL}/runbooks/non_existent_runbook`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RUNBOOK_NOT_FOUND');
      expect(response.body.error.details.correlation_id).toBeDefined();
    });

    it('should handle malformed runbook ID', async () => {
      const response = await request(app)
        .get(`${baseURL}/runbooks/invalid-id-format!@#`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RUNBOOK_NOT_FOUND');
    });
  });

  describe('4. GET /api/runbooks - List All Runbooks', () => {
    it('should list all runbooks with default parameters', async () => {
      const response = await request(app)
        .get(`${baseURL}/runbooks`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.runbooks).toBeDefined();
      expect(response.body.data.total_count).toBeDefined();
      expect(response.body.data.filters_applied).toBeDefined();
      expect(response.body.data.filters_applied.limit).toBe(50);
    });

    it('should apply category filter', async () => {
      const response = await request(app)
        .get(`${baseURL}/runbooks?category=database&limit=10`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters_applied.category).toBe('database');
      expect(response.body.data.filters_applied.limit).toBe(10);
    });

    it('should apply severity filter', async () => {
      const response = await request(app)
        .get(`${baseURL}/runbooks?severity=critical`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters_applied.severity).toBe('critical');
    });

    it('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get(`${baseURL}/runbooks?limit=abc`)
        .expect(200);

      // Should use default limit when invalid
      expect(response.body.data.filters_applied.limit).toBe(50);
    });
  });

  describe('5. POST /api/decision-tree - Decision Logic Retrieval', () => {
    it('should retrieve decision tree for alert context', async () => {
      const decisionTreePayload = {
        alert_context: {
          alert_type: 'database_connection_failure',
          severity: 'high',
          affected_systems: ['user-api'],
          metrics: {
            connection_count: 0,
            error_rate: 0.95
          }
        },
        current_agent_state: {
          attempted_steps: ['check_service_status'],
          execution_time_seconds: 45
        }
      };

      const response = await request(app)
        .post(`${baseURL}/decision-tree`)
        .send(decisionTreePayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata.correlation_id).toBeDefined();
    });

    it('should validate required alert_context', async () => {
      const response = await request(app)
        .post(`${baseURL}/decision-tree`)
        .send({
          current_agent_state: { attempted_steps: [] }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle missing alert_context gracefully', async () => {
      const response = await request(app)
        .post(`${baseURL}/decision-tree`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details.validation_errors).toContain('Missing required field: alert_context');
    });
  });

  describe('6. GET /api/procedures/:id - Procedure Details', () => {
    it('should retrieve procedure details by ID', async () => {
      const procedureId = 'rb_001_restart_pool';
      
      const response = await request(app)
        .get(`${baseURL}/procedures/${procedureId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata.correlation_id).toBeDefined();
    });

    it('should validate procedure ID format', async () => {
      const response = await request(app)
        .get(`${baseURL}/procedures/invalid_format`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PROCEDURE_ID');
      expect(response.body.error.message).toContain('runbook_id_step_name');
    });

    it('should handle missing procedure ID', async () => {
      await request(app)
        .get(`${baseURL}/procedures/`)
        .expect(404);
    });

    it('should handle empty procedure ID', async () => {
      const response = await request(app)
        .get(`${baseURL}/procedures/ `)
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_PROCEDURE_ID');
    });
  });

  describe('7. POST /api/escalation - Escalation Path Determination', () => {
    it('should determine escalation path for critical incident', async () => {
      const escalationPayload = {
        severity: 'critical',
        business_hours: false,
        failed_attempts: ['primary_oncall']
      };

      const response = await request(app)
        .post(`${baseURL}/escalation`)
        .send(escalationPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata.correlation_id).toBeDefined();
    });

    it('should handle business hours escalation', async () => {
      const escalationPayload = {
        severity: 'medium',
        business_hours: true
      };

      const response = await request(app)
        .post(`${baseURL}/escalation`)
        .send(escalationPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`${baseURL}/escalation`)
        .send({ severity: 'high' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.validation_errors).toContain('Missing required field: business_hours');
    });

    it('should validate severity enum', async () => {
      const response = await request(app)
        .post(`${baseURL}/escalation`)
        .send({
          severity: 'super_high',
          business_hours: true
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('8. GET /api/sources - Documentation Sources', () => {
    it('should list all configured sources with health status', async () => {
      const response = await request(app)
        .get(`${baseURL}/sources`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.sources).toBeDefined();
      expect(response.body.metadata.correlation_id).toBeDefined();
    });

    it('should include health information by default', async () => {
      const response = await request(app)
        .get(`${baseURL}/sources`)
        .expect(200);

      if (response.body.data.sources.length > 0) {
        const firstSource = response.body.data.sources[0];
        expect(firstSource).toHaveProperty('healthy');
        expect(firstSource).toHaveProperty('response_time_ms');
        expect(firstSource).toHaveProperty('last_check');
      }
    });
  });

  describe('9. POST /api/feedback - Resolution Feedback', () => {
    it('should record resolution feedback successfully', async () => {
      const feedbackPayload = {
        runbook_id: 'rb_001_db_connection',
        procedure_id: 'restart_pool',
        outcome: 'success',
        resolution_time_minutes: 15,
        notes: 'Required additional database restart after connection pool restart'
      };

      const response = await request(app)
        .post(`${baseURL}/feedback`)
        .send(feedbackPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata.correlation_id).toBeDefined();
    });

    it('should validate required feedback fields', async () => {
      const response = await request(app)
        .post(`${baseURL}/feedback`)
        .send({
          runbook_id: 'rb_001',
          outcome: 'success'
          // Missing procedure_id and resolution_time_minutes
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.validation_errors).toEqual(
        expect.arrayContaining([
          'Missing required field: procedure_id',
          'Missing required field: resolution_time_minutes'
        ])
      );
    });

    it('should validate outcome enum values', async () => {
      const response = await request(app)
        .post(`${baseURL}/feedback`)
        .send({
          runbook_id: 'rb_001',
          procedure_id: 'step_001',
          outcome: 'maybe_success', // Invalid outcome
          resolution_time_minutes: 10
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate resolution_time_minutes is non-negative', async () => {
      const response = await request(app)
        .post(`${baseURL}/feedback`)
        .send({
          runbook_id: 'rb_001',
          procedure_id: 'step_001',
          outcome: 'success',
          resolution_time_minutes: -5
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('10. GET /api/health - API Health Status', () => {
    it('should return API health status', async () => {
      const response = await request(app)
        .get(`${baseURL}/health`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.api_status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.api_status);
      expect(response.body.data.sources).toBeDefined();
      expect(response.body.data.uptime_seconds).toBeGreaterThan(0);
      expect(response.body.metadata.correlation_id).toBeDefined();
    });

    it('should include cache health information', async () => {
      const response = await request(app)
        .get(`${baseURL}/health`)
        .expect(200);

      if (response.body.data.cache) {
        expect(response.body.data.cache.overall_healthy).toBeDefined();
        expect(response.body.data.cache.memory_cache).toBeDefined();
      }
    });

    it('should return appropriate status code based on health', async () => {
      const response = await request(app)
        .get(`${baseURL}/health`);

      if (response.body.data.api_status === 'healthy') {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(503);
      }
    });
  });

  describe('11. GET /api/performance - Performance Metrics', () => {
    it('should return performance metrics', async () => {
      const response = await request(app)
        .get(`${baseURL}/performance`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tools).toBeDefined();
      expect(response.body.data.cache).toBeDefined();
      expect(response.body.data.system).toBeDefined();
      expect(response.body.data.system.memory_usage_mb).toBeGreaterThan(0);
      expect(response.body.data.system.uptime_seconds).toBeGreaterThan(0);
      expect(response.body.data.system.node_version).toBeDefined();
      expect(response.body.metadata.correlation_id).toBeDefined();
    });

    it('should include timestamp in performance data', async () => {
      const response = await request(app)
        .get(`${baseURL}/performance`)
        .expect(200);

      expect(response.body.data.timestamp).toBeDefined();
      const timestamp = new Date(response.body.data.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 10000); // Within last 10 seconds
    });
  });

  describe('Performance Requirements Validation', () => {
    it('should meet response time requirements for critical endpoints', async () => {
      const criticalEndpoints = [
        { method: 'post', path: '/runbooks/search', payload: { alert_type: 'test', severity: 'critical', affected_systems: ['system1'] } },
        { method: 'post', path: '/escalation', payload: { severity: 'critical', business_hours: false } },
        { method: 'get', path: '/health' }
      ];

      for (const endpoint of criticalEndpoints) {
        const startTime = Date.now();
        
        let response;
        if (endpoint.method === 'post') {
          response = await request(app)
            .post(`${baseURL}${endpoint.path}`)
            .send(endpoint.payload);
        } else {
          response = await request(app)
            .get(`${baseURL}${endpoint.path}`);
        }

        const responseTime = Date.now() - startTime;
        
        // Critical endpoints should respond within 500ms for incident response
        expect(responseTime).toBeLessThan(500);
        expect(response.headers['x-response-time']).toBeDefined();
      }
    });

    it('should include performance headers in all responses', async () => {
      const response = await request(app)
        .get(`${baseURL}/health`)
        .expect(200);

      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-performance-tier']).toBeDefined();
      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post(`${baseURL}/search`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details.correlation_id).toBeDefined();
    });

    it('should handle oversized requests', async () => {
      const largePayload = {
        query: 'test query',
        large_field: 'x'.repeat(15 * 1024 * 1024) // 15MB
      };

      const response = await request(app)
        .post(`${baseURL}/search`)
        .send(largePayload)
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REQUEST_TOO_LARGE');
    });

    it('should provide recovery actions in error responses', async () => {
      const response = await request(app)
        .post(`${baseURL}/search`)
        .send({ query: '' })
        .expect(400);

      expect(response.body.error.details.recovery_actions).toBeDefined();
      expect(Array.isArray(response.body.error.details.recovery_actions)).toBe(true);
      expect(response.body.error.details.retry_recommended).toBeDefined();
    });
  });

  describe('Documentation and API Discovery', () => {
    it('should redirect /api/docs to Swagger UI', async () => {
      const response = await request(app)
        .get(`${baseURL}/docs`)
        .expect(302);

      expect(response.headers.location).toBe('/api/docs/');
    });

    it('should serve OpenAPI specification', async () => {
      const response = await request(app)
        .get(`${baseURL}/docs/openapi.json`)
        .expect(200);

      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.info.title).toBe('Personal Pipeline REST API');
      expect(response.body.paths).toBeDefined();
      expect(Object.keys(response.body.paths)).toHaveLength(11); // All 11 endpoints
    });

    it('should provide testing utilities', async () => {
      const response = await request(app)
        .get(`${baseURL}/docs/test-utils`)
        .expect(200);

      expect(response.body.correlation_id_format).toBeDefined();
      expect(response.body.sample_correlation_id).toBeDefined();
      expect(response.body.testing_tips).toBeDefined();
      expect(response.body.example_headers).toBeDefined();
    });
  });
});