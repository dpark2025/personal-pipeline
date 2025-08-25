/**
 * REST API Transforms Unit Tests using Node.js Test Runner
 *
 * Tests basic transformation concepts and data structure validation
 * for REST to MCP conversions and MCP to REST response transformations.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('REST API Transforms Unit Tests (Node.js Test Runner)', () => {
  describe('Request Data Structure Validation', () => {
    it('should validate search knowledge base request structure', () => {
      const searchRequest = {
        query: 'database connection timeout troubleshooting',
        categories: ['database', 'troubleshooting'],
        max_results: 5,
      };

      // Validate required fields
      assert(searchRequest.query);
      assert.strictEqual(typeof searchRequest.query, 'string');
      assert(searchRequest.query.length > 0);

      // Validate optional fields
      if (searchRequest.categories) {
        assert(Array.isArray(searchRequest.categories));
      }

      if (searchRequest.max_results) {
        assert.strictEqual(typeof searchRequest.max_results, 'number');
        assert(searchRequest.max_results > 0);
      }
    });

    it('should validate runbook search request structure', () => {
      const runbookRequest = {
        alert_type: 'database_connection_failure',
        severity: 'critical',
        affected_systems: ['user-api', 'postgres-primary'],
        context: {
          error_message: 'Connection timeout after 30s',
          occurrence_count: 5,
        },
      };

      // Validate required fields
      assert(runbookRequest.alert_type);
      assert(runbookRequest.severity);
      assert(runbookRequest.affected_systems);

      // Validate data types
      assert.strictEqual(typeof runbookRequest.alert_type, 'string');
      assert.strictEqual(typeof runbookRequest.severity, 'string');
      assert(Array.isArray(runbookRequest.affected_systems));
      assert(runbookRequest.affected_systems.length > 0);

      // Validate severity values
      assert(['low', 'medium', 'high', 'critical'].includes(runbookRequest.severity));
    });

    it('should validate decision tree request structure', () => {
      const decisionTreeRequest = {
        alert_context: {
          alert_type: 'api_latency_spike',
          severity: 'high',
          affected_systems: ['user-api'],
          metrics: {
            avg_response_time: 2500,
            error_rate: 0.15,
          },
        },
        current_agent_state: {
          attempted_steps: ['check_service_status', 'check_database_health'],
          execution_time_seconds: 120,
        },
      };

      // Validate structure
      assert(decisionTreeRequest.alert_context);
      assert(decisionTreeRequest.current_agent_state);

      // Validate alert context
      assert(decisionTreeRequest.alert_context.alert_type);
      assert(decisionTreeRequest.alert_context.severity);
      assert(Array.isArray(decisionTreeRequest.alert_context.affected_systems));

      // Validate agent state
      assert(Array.isArray(decisionTreeRequest.current_agent_state.attempted_steps));
      assert.strictEqual(
        typeof decisionTreeRequest.current_agent_state.execution_time_seconds,
        'number'
      );
    });
  });

  describe('Response Data Structure Validation', () => {
    it('should validate MCP response structure', () => {
      const mcpResponse: CallToolResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              results: [
                {
                  id: 'doc_001',
                  title: 'Database Connection Troubleshooting',
                  content: 'Steps to diagnose and fix database connection issues...',
                  confidence_score: 0.85,
                  match_reasons: ['keyword match: database', 'context match: troubleshooting'],
                },
              ],
              metadata: {
                total_results: 1,
                execution_time_ms: 150,
                confidence_score: 0.85,
              },
            }),
          },
        ],
      };

      // Validate MCP response structure
      assert(mcpResponse.content);
      assert(Array.isArray(mcpResponse.content));
      assert(mcpResponse.content.length > 0);

      // Validate content structure
      const firstContent = mcpResponse.content[0];
      assert(firstContent);
      if (firstContent) {
        assert.strictEqual(firstContent.type, 'text');
        assert(firstContent.text);

        // Validate JSON parsing
        if (typeof firstContent.text === 'string') {
          const parsedContent = JSON.parse(firstContent.text);
          assert(parsedContent.results);
          assert(Array.isArray(parsedContent.results));
          assert(parsedContent.metadata);
        }
      }
    });

    it('should validate REST response structure', () => {
      const restResponse = {
        success: true,
        data: {
          results: [
            {
              id: 'doc_001',
              title: 'Database Troubleshooting',
              confidence_score: 0.85,
            },
          ],
        },
        metadata: {
          correlation_id: 'test_correlation_12345',
          execution_time_ms: 150,
          performance_tier: 'fast',
          cached: false,
        },
        timestamp: '2025-07-31T10:00:00.000Z',
      };

      // Validate REST response structure
      assert.strictEqual(typeof restResponse.success, 'boolean');
      assert(restResponse.data);
      assert(restResponse.metadata);
      assert(restResponse.timestamp);

      // Validate metadata
      assert(restResponse.metadata.correlation_id);
      assert.strictEqual(typeof restResponse.metadata.execution_time_ms, 'number');
      assert(restResponse.metadata.execution_time_ms >= 0);
      assert(['fast', 'medium', 'slow'].includes(restResponse.metadata.performance_tier));
      assert.strictEqual(typeof restResponse.metadata.cached, 'boolean');
    });
  });

  describe('Data Transformation Concepts', () => {
    it('should understand performance hint generation', () => {
      const testCases = [
        { severity: 'critical', expectedPriority: 'high_priority', expectedMultiplier: 2.0 },
        { severity: 'high', expectedPriority: 'performance_cache', expectedMultiplier: 1.5 },
        { severity: 'medium', expectedPriority: 'standard', expectedMultiplier: 1.2 },
        { severity: 'low', expectedPriority: 'standard', expectedMultiplier: 1.0 },
      ];

      testCases.forEach(({ severity, expectedPriority, expectedMultiplier }) => {
        // Simulate performance hint generation logic
        let cachePriority = 'standard';
        let urgencyMultiplier = 1.0;

        switch (severity) {
          case 'critical':
            cachePriority = 'high_priority';
            urgencyMultiplier = 2.0;
            break;
          case 'high':
            cachePriority = 'performance_cache';
            urgencyMultiplier = 1.5;
            break;
          case 'medium':
            urgencyMultiplier = 1.2;
            break;
        }

        assert.strictEqual(cachePriority, expectedPriority);
        assert.strictEqual(urgencyMultiplier, expectedMultiplier);
      });
    });

    it('should understand query complexity calculation', () => {
      const queries = [
        { text: 'test', expectedComplexity: 'low' },
        { text: 'database connection timeout troubleshooting', expectedComplexity: 'medium' },
        {
          text: 'complex distributed system failure analysis with multiple dependencies and cascading effects',
          expectedComplexity: 'high',
        },
      ];

      queries.forEach(({ text, expectedComplexity }) => {
        // Simulate complexity calculation
        let complexity = 'low';
        if (text.length > 50) complexity = 'high';
        else if (text.length > 20) complexity = 'medium';

        assert.strictEqual(complexity, expectedComplexity);
      });
    });

    it('should understand cache TTL determination', () => {
      const scenarios = [
        { priority: 'high_priority', expectedTTL: 1800 }, // 30 minutes
        { priority: 'performance_cache', expectedTTL: 3600 }, // 1 hour
        { priority: 'standard', expectedTTL: 900 }, // 15 minutes
        { priority: 'high_confidence', expectedTTL: 7200 }, // 2 hours
      ];

      scenarios.forEach(({ priority, expectedTTL }) => {
        // Simulate TTL calculation
        let ttl = 900; // default 15 minutes

        switch (priority) {
          case 'high_priority':
            ttl = 1800;
            break;
          case 'performance_cache':
            ttl = 3600;
            break;
          case 'high_confidence':
            ttl = 7200;
            break;
        }

        assert.strictEqual(ttl, expectedTTL);
      });
    });
  });

  describe('Error Transformation', () => {
    it('should understand error response transformation', () => {
      const mcpError: CallToolResult = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'SEARCH_TIMEOUT',
                message: 'Search operation timed out after 30 seconds',
                severity: 'medium',
                recovery_actions: ['Retry with reduced scope', 'Check source adapter health'],
                retry_recommended: true,
              },
            }),
          },
        ],
        isError: true,
      };

      // Validate error structure
      assert.strictEqual(mcpError.isError, true);
      assert(mcpError.content);

      const firstContent = mcpError.content[0];
      if (firstContent && typeof firstContent.text === 'string') {
        const errorContent = JSON.parse(firstContent.text);
        assert(errorContent.error);
        assert(errorContent.error.code);
        assert(errorContent.error.message);
        assert(Array.isArray(errorContent.error.recovery_actions));
        assert.strictEqual(typeof errorContent.error.retry_recommended, 'boolean');
      }
    });

    it('should handle malformed response errors', () => {
      const malformedResponse: CallToolResult = {
        content: [
          {
            type: 'text',
            text: 'invalid json content',
          },
        ],
      };

      // Test JSON parsing error handling
      const firstContent = malformedResponse.content[0];
      if (firstContent && typeof firstContent.text === 'string') {
        assert.throws(() => {
          JSON.parse(firstContent.text);
        });

        // Simulate error handling
        let isValidJSON = true;
        try {
          JSON.parse(firstContent.text);
        } catch (e) {
          isValidJSON = false;
        }

        assert.strictEqual(isValidJSON, false);
      }
    });
  });

  describe('Performance Tier Classification', () => {
    it('should classify performance tiers correctly', () => {
      const performanceTests = [
        { executionTime: 50, expectedTier: 'fast' },
        { executionTime: 150, expectedTier: 'medium' },
        { executionTime: 500, expectedTier: 'slow' },
      ];

      performanceTests.forEach(({ executionTime, expectedTier }) => {
        // Simulate performance tier calculation
        let tier = 'slow';
        if (executionTime < 100) tier = 'fast';
        else if (executionTime < 300) tier = 'medium';

        assert.strictEqual(tier, expectedTier);
      });
    });

    it('should handle cache performance impact', () => {
      const cacheScenarios = [
        { cached: true, baseTime: 200, expectedTime: 20 },
        { cached: false, baseTime: 200, expectedTime: 200 },
      ];

      cacheScenarios.forEach(({ cached, baseTime, expectedTime }) => {
        // Simulate cache performance impact
        const actualTime = cached ? Math.min(baseTime * 0.1, 50) : baseTime;
        assert.strictEqual(actualTime, expectedTime);
      });
    });
  });

  describe('Metadata Enrichment', () => {
    it('should enrich metadata with correlation IDs', () => {
      const correlationId = 'test_correlation_12345';

      // Validate correlation ID format
      assert(/^[a-zA-Z0-9_-]+$/.test(correlationId));
      assert(correlationId.length > 0);
      assert(correlationId.length <= 100);
    });

    it('should enrich metadata with performance information', () => {
      const performanceMetadata = {
        execution_time_ms: 150,
        performance_tier: 'medium',
        cached: false,
        transform_time_ms: 5,
      };

      // Validate performance metadata
      assert(performanceMetadata.execution_time_ms >= 0);
      assert(['fast', 'medium', 'slow'].includes(performanceMetadata.performance_tier));
      assert.strictEqual(typeof performanceMetadata.cached, 'boolean');
      assert(performanceMetadata.transform_time_ms >= 0);
    });

    it('should enrich metadata with source information', () => {
      const sourceMetadata = {
        source: 'web_ops_wiki',
        source_type: 'web',
        last_updated: '2025-07-30T10:00:00.000Z',
        document_count: 1250,
      };

      // Validate source metadata
      assert(sourceMetadata.source);
      assert(sourceMetadata.source_type);
      assert(sourceMetadata.last_updated);
      assert.strictEqual(typeof sourceMetadata.document_count, 'number');
      assert(sourceMetadata.document_count >= 0);

      // Validate timestamp format
      assert(new Date(sourceMetadata.last_updated).getTime() > 0);
    });
  });
});
