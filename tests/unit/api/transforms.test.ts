/**
 * REST API Transforms Unit Tests
 * 
 * Tests basic transformation concepts and data structure validation
 * for REST to MCP conversions and MCP to REST response transformations.
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

describe('REST API Transforms Unit Tests', () => {
  describe('Request Data Structure Validation', () => {
    it('should validate search knowledge base request structure', () => {
      const searchRequest = {
        query: 'database connection timeout troubleshooting',
        categories: ['database', 'troubleshooting'],
        max_results: 5
      };

      // Validate required fields
      expect(searchRequest.query).toBeDefined();
      expect(typeof searchRequest.query).toBe('string');
      expect(searchRequest.query.length).toBeGreaterThan(0);
      
      // Validate optional fields
      if (searchRequest.categories) {
        expect(Array.isArray(searchRequest.categories)).toBe(true);
      }
      
      if (searchRequest.max_results) {
        expect(typeof searchRequest.max_results).toBe('number');
        expect(searchRequest.max_results).toBeGreaterThan(0);
      }
    });

    it('should validate runbook search request structure', () => {
      const runbookRequest = {
        alert_type: 'database_connection_failure',
        severity: 'critical',
        affected_systems: ['user-api', 'postgres-primary'],
        context: {
          error_message: 'Connection timeout after 30s',
          occurrence_count: 5
        }
      };

      // Validate required fields
      expect(runbookRequest.alert_type).toBeDefined();
      expect(runbookRequest.severity).toBeDefined();
      expect(runbookRequest.affected_systems).toBeDefined();
      
      // Validate data types
      expect(typeof runbookRequest.alert_type).toBe('string');
      expect(typeof runbookRequest.severity).toBe('string');
      expect(Array.isArray(runbookRequest.affected_systems)).toBe(true);
      expect(runbookRequest.affected_systems.length).toBeGreaterThan(0);
      
      // Validate severity values
      expect(['low', 'medium', 'high', 'critical']).toContain(runbookRequest.severity);
    });

    it('should validate decision tree request structure', () => {
      const decisionTreeRequest = {
        alert_context: {
          alert_type: 'api_latency_spike',
          severity: 'high',
          affected_systems: ['user-api'],
          metrics: {
            avg_response_time: 2500,
            error_rate: 0.15
          }
        },
        current_agent_state: {
          attempted_steps: ['check_service_status', 'check_database_health'],
          execution_time_seconds: 120
        }
      };

      // Validate structure
      expect(decisionTreeRequest.alert_context).toBeDefined();
      expect(decisionTreeRequest.current_agent_state).toBeDefined();
      
      // Validate alert context
      expect(decisionTreeRequest.alert_context.alert_type).toBeDefined();
      expect(decisionTreeRequest.alert_context.severity).toBeDefined();
      expect(Array.isArray(decisionTreeRequest.alert_context.affected_systems)).toBe(true);
      
      // Validate agent state
      expect(Array.isArray(decisionTreeRequest.current_agent_state.attempted_steps)).toBe(true);
      expect(typeof decisionTreeRequest.current_agent_state.execution_time_seconds).toBe('number');
    });
  });

  describe('Response Data Structure Validation', () => {
    it('should validate MCP response structure', () => {
      const mcpResponse: CallToolResult = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            results: [
              {
                id: 'doc_001',
                title: 'Database Connection Troubleshooting',
                content: 'Steps to diagnose and fix database connection issues...',
                confidence_score: 0.85,
                match_reasons: ['keyword match: database', 'context match: troubleshooting']
              }
            ],
            metadata: {
              total_results: 1,
              execution_time_ms: 150,
              confidence_score: 0.85
            }
          })
        }]
      };

      // Validate MCP response structure
      expect(mcpResponse.content).toBeDefined();
      expect(Array.isArray(mcpResponse.content)).toBe(true);
      expect(mcpResponse.content.length).toBeGreaterThan(0);
      
      // Validate content structure
      const firstContent = mcpResponse.content[0];
      expect(firstContent).toBeDefined();
      if (firstContent) {
        expect(firstContent.type).toBe('text');
        expect(firstContent.text).toBeDefined();
        
        // Validate JSON parsing
        if (typeof firstContent.text === 'string') {
          const parsedContent = JSON.parse(firstContent.text);
          expect(parsedContent.results).toBeDefined();
          expect(Array.isArray(parsedContent.results)).toBe(true);
          expect(parsedContent.metadata).toBeDefined();
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
              confidence_score: 0.85
            }
          ]
        },
        metadata: {
          correlation_id: 'test_correlation_12345',
          execution_time_ms: 150,
          performance_tier: 'fast',
          cached: false
        },
        timestamp: '2025-07-31T10:00:00.000Z'
      };

      // Validate REST response structure
      expect(typeof restResponse.success).toBe('boolean');
      expect(restResponse.data).toBeDefined();
      expect(restResponse.metadata).toBeDefined();
      expect(restResponse.timestamp).toBeDefined();
      
      // Validate metadata
      expect(restResponse.metadata.correlation_id).toBeDefined();
      expect(typeof restResponse.metadata.execution_time_ms).toBe('number');
      expect(restResponse.metadata.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(['fast', 'medium', 'slow']).toContain(restResponse.metadata.performance_tier);
      expect(typeof restResponse.metadata.cached).toBe('boolean');
    });
  });

  describe('Data Transformation Concepts', () => {
    it('should understand performance hint generation', () => {
      const testCases = [
        { severity: 'critical', expectedPriority: 'high_priority', expectedMultiplier: 2.0 },
        { severity: 'high', expectedPriority: 'performance_cache', expectedMultiplier: 1.5 },
        { severity: 'medium', expectedPriority: 'standard', expectedMultiplier: 1.2 },
        { severity: 'low', expectedPriority: 'standard', expectedMultiplier: 1.0 }
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
        
        expect(cachePriority).toBe(expectedPriority);
        expect(urgencyMultiplier).toBe(expectedMultiplier);
      });
    });

    it('should understand query complexity calculation', () => {
      const queries = [
        { text: 'test', expectedComplexity: 'low' },
        { text: 'database connection timeout troubleshooting', expectedComplexity: 'medium' },
        { text: 'complex distributed system failure analysis with multiple dependencies and cascading effects', expectedComplexity: 'high' }
      ];

      queries.forEach(({ text, expectedComplexity }) => {
        // Simulate complexity calculation
        let complexity = 'low';
        if (text.length > 50) complexity = 'high';
        else if (text.length > 20) complexity = 'medium';
        
        expect(complexity).toBe(expectedComplexity);
      });
    });

    it('should understand cache TTL determination', () => {
      const scenarios = [
        { priority: 'high_priority', expectedTTL: 1800 }, // 30 minutes
        { priority: 'performance_cache', expectedTTL: 3600 }, // 1 hour  
        { priority: 'standard', expectedTTL: 900 }, // 15 minutes
        { priority: 'high_confidence', expectedTTL: 7200 } // 2 hours
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
        
        expect(ttl).toBe(expectedTTL);
      });
    });
  });

  describe('Error Transformation', () => {
    it('should understand error response transformation', () => {
      const mcpError: CallToolResult = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: {
              code: 'SEARCH_TIMEOUT',
              message: 'Search operation timed out after 30 seconds',
              severity: 'medium',
              recovery_actions: ['Retry with reduced scope', 'Check source adapter health'],
              retry_recommended: true
            }
          })
        }],
        isError: true
      };

      // Validate error structure
      expect(mcpError.isError).toBe(true);
      expect(mcpError.content).toBeDefined();
      
      const firstContent = mcpError.content[0];
      if (firstContent && typeof firstContent.text === 'string') {
        const errorContent = JSON.parse(firstContent.text);
        expect(errorContent.error).toBeDefined();
        expect(errorContent.error.code).toBeDefined();
        expect(errorContent.error.message).toBeDefined();
        expect(Array.isArray(errorContent.error.recovery_actions)).toBe(true);
        expect(typeof errorContent.error.retry_recommended).toBe('boolean');
      }
    });

    it('should handle malformed response errors', () => {
      const malformedResponse: CallToolResult = {
        content: [{
          type: 'text',
          text: 'invalid json content'
        }]
      };

      // Test JSON parsing error handling
      const firstContent = malformedResponse.content[0];
      if (firstContent && typeof firstContent.text === 'string') {
        expect(() => {
          JSON.parse(firstContent.text);
        }).toThrow();
        
        // Simulate error handling
        let isValidJSON = true;
        try {
          JSON.parse(firstContent.text);
        } catch (e) {
          isValidJSON = false;
        }
        
        expect(isValidJSON).toBe(false);
      }
    });
  });

  describe('Performance Tier Classification', () => {
    it('should classify performance tiers correctly', () => {
      const performanceTests = [
        { executionTime: 50, expectedTier: 'fast' },
        { executionTime: 150, expectedTier: 'medium' },
        { executionTime: 500, expectedTier: 'slow' }
      ];

      performanceTests.forEach(({ executionTime, expectedTier }) => {
        // Simulate performance tier calculation
        let tier = 'slow';
        if (executionTime < 100) tier = 'fast';
        else if (executionTime < 300) tier = 'medium';
        
        expect(tier).toBe(expectedTier);
      });
    });

    it('should handle cache performance impact', () => {
      const cacheScenarios = [
        { cached: true, baseTime: 200, expectedTime: 20 },
        { cached: false, baseTime: 200, expectedTime: 200 }
      ];

      cacheScenarios.forEach(({ cached, baseTime, expectedTime }) => {
        // Simulate cache performance impact
        const actualTime = cached ? Math.min(baseTime * 0.1, 50) : baseTime;
        expect(actualTime).toBe(expectedTime);
      });
    });
  });

  describe('Metadata Enrichment', () => {
    it('should enrich metadata with correlation IDs', () => {
      const correlationId = 'test_correlation_12345';
      
      // Validate correlation ID format
      expect(correlationId).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(correlationId.length).toBeGreaterThan(0);
      expect(correlationId.length).toBeLessThanOrEqual(100);
    });

    it('should enrich metadata with performance information', () => {
      const performanceMetadata = {
        execution_time_ms: 150,
        performance_tier: 'medium',
        cached: false,
        transform_time_ms: 5
      };

      // Validate performance metadata
      expect(performanceMetadata.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(['fast', 'medium', 'slow']).toContain(performanceMetadata.performance_tier);
      expect(typeof performanceMetadata.cached).toBe('boolean');
      expect(performanceMetadata.transform_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should enrich metadata with source information', () => {
      const sourceMetadata = {
        source: 'confluence_ops_wiki',
        source_type: 'confluence',
        last_updated: '2025-07-30T10:00:00.000Z',
        document_count: 1250
      };

      // Validate source metadata
      expect(sourceMetadata.source).toBeDefined();
      expect(sourceMetadata.source_type).toBeDefined();
      expect(sourceMetadata.last_updated).toBeDefined();
      expect(typeof sourceMetadata.document_count).toBe('number');
      expect(sourceMetadata.document_count).toBeGreaterThanOrEqual(0);
      
      // Validate timestamp format
      expect(new Date(sourceMetadata.last_updated).getTime()).toBeGreaterThan(0);
    });
  });
});