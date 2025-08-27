/**
 * MCP Tools Implementation
 *
 * Core tools that implement the MCP protocol for Personal Pipeline server.
 * These tools provide the main functionality for documentation retrieval
 * and incident response support.
 */

import {
  Tool,
  CallToolRequest,
  CallToolResult,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import {
  RunbookSearchResponse,
  DecisionTreeResponse,
  ProcedureResponse,
  EscalationResponse,
  SearchResult,
  HealthCheck,
  BaseResponse,
} from '../types/index.js';
import { SourceAdapterRegistry } from '../adapters/base.js';
import { logger } from '../utils/logger.js';
import { CacheService, createCacheKey, CacheContentType } from '../utils/cache.js';
import { getPerformanceMonitor, PerformanceTimer } from '../utils/performance.js';

export class PPMCPTools {
  private sourceRegistry: SourceAdapterRegistry;
  private cacheService: CacheService | null;

  constructor(sourceRegistry: SourceAdapterRegistry, cacheService?: CacheService) {
    this.sourceRegistry = sourceRegistry;
    this.cacheService = cacheService || null;
  }

  /**
   * Get all available MCP tools
   */
  getTools(): Tool[] {
    return [
      this.getSearchRunbooksTool(),
      this.getDecisionTreeTool(),
      this.getProcedureTool(),
      this.getEscalationPathTool(),
      this.getListSourcesTool(),
      this.getSearchKnowledgeBaseTool(),
      this.getRecordResolutionFeedbackTool(),
    ];
  }

  /**
   * Get cache statistics if cache service is available
   */
  getCacheStats() {
    return this.cacheService?.getStats() || null;
  }

  /**
   * Get cache health check if cache service is available
   */
  async getCacheHealth() {
    return this.cacheService?.healthCheck() || null;
  }

  /**
   * Warm cache with critical data if cache service is available
   */
  async warmCache(criticalData: Array<{ key: any; data: any }>) {
    if (this.cacheService) {
      await this.cacheService.warmCache(criticalData);
    }
  }

  /**
   * Clear cache by content type if cache service is available
   */
  async clearCacheByType(contentType: CacheContentType) {
    if (this.cacheService) {
      await this.cacheService.clearByType(contentType);
    }
  }

  /**
   * Handle MCP tool calls with performance monitoring
   */
  async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const timer = new PerformanceTimer();
    const performanceMonitor = getPerformanceMonitor();
    let isError = false;

    try {
      logger.info(`Handling tool call: ${request.params.name}`, {
        tool: request.params.name,
        arguments: request.params.arguments,
      });

      let result: any;

      switch (request.params.name) {
        case 'search_runbooks':
          result = await this.searchRunbooks(request.params.arguments);
          break;
        case 'get_decision_tree':
          result = await this.getDecisionTree(request.params.arguments);
          break;
        case 'get_procedure':
          result = await this.getProcedure(request.params.arguments);
          break;
        case 'get_escalation_path':
          result = await this.getEscalationPath(request.params.arguments);
          break;
        case 'list_sources':
          result = await this.listSources(request.params.arguments);
          break;
        case 'search_knowledge_base':
          result = await this.searchKnowledgeBase(request.params.arguments);
          break;
        case 'record_resolution_feedback':
          result = await this.recordResolutionFeedback(request.params.arguments);
          break;
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }

      const executionTime = timer.elapsed();

      logger.info(`Tool call completed: ${request.params.name}`, {
        tool: request.params.name,
        executionTimeMs: executionTime,
        success: true,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...result,
                retrieval_time_ms: Math.round(executionTime),
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          } as TextContent,
        ],
      };
    } catch (error) {
      isError = true;
      const executionTime = timer.elapsed();

      logger.error(`Tool call failed: ${request.params.name}`, {
        tool: request.params.name,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                retrieval_time_ms: Math.round(executionTime),
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          } as TextContent,
        ],
        isError: true,
      };
    } finally {
      // Record performance metrics
      const executionTime = timer.elapsed();
      performanceMonitor.recordToolExecution(request.params.name, executionTime, isError);
    }
  }

  /**
   * Get performance metrics for all tools
   */
  getPerformanceMetrics() {
    const performanceMonitor = getPerformanceMonitor();
    return {
      overall: performanceMonitor.getMetrics(),
      by_tool: Object.fromEntries(performanceMonitor.getToolMetrics()),
      report: performanceMonitor.generateReport(),
    };
  }

  // ========================================================================
  // Tool Definitions
  // ========================================================================

  private getSearchRunbooksTool(): Tool {
    return {
      name: 'search_runbooks',
      description: 'Search for operational runbooks based on alert characteristics',
      inputSchema: {
        type: 'object',
        properties: {
          alert_type: {
            type: 'string',
            description: 'Type of alert (e.g., "memory_pressure", "disk_full", "service_down")',
          },
          severity: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low', 'info'],
            description: 'Alert severity level',
          },
          affected_systems: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of systems affected by the alert',
          },
          context: {
            type: 'object',
            description: 'Additional context for matching (optional)',
            additionalProperties: true,
          },
        },
        required: ['alert_type', 'severity', 'affected_systems'],
      },
    };
  }

  private getDecisionTreeTool(): Tool {
    return {
      name: 'get_decision_tree',
      description: 'Retrieve decision logic for specific operational scenarios',
      inputSchema: {
        type: 'object',
        properties: {
          alert_context: {
            type: 'object',
            description: 'Context about the alert or situation',
            additionalProperties: true,
          },
          current_agent_state: {
            type: 'object',
            description: 'Current state of the agent for progressive decision making (optional)',
            additionalProperties: true,
          },
        },
        required: ['alert_context'],
      },
    };
  }

  private getProcedureTool(): Tool {
    return {
      name: 'get_procedure',
      description: 'Retrieve detailed execution steps for specific procedures',
      inputSchema: {
        type: 'object',
        properties: {
          runbook_id: {
            type: 'string',
            description: 'ID of the runbook containing the procedure',
          },
          step_name: {
            type: 'string',
            description: 'Name of the specific procedure step',
          },
          current_context: {
            type: 'object',
            description: 'Current execution context for parameter substitution (optional)',
            additionalProperties: true,
          },
        },
        required: ['runbook_id', 'step_name'],
      },
    };
  }

  private getEscalationPathTool(): Tool {
    return {
      name: 'get_escalation_path',
      description: 'Determine appropriate escalation procedures based on context',
      inputSchema: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low', 'info'],
            description: 'Severity of the incident',
          },
          business_hours: {
            type: 'boolean',
            description: 'Whether the incident occurred during business hours',
          },
          failed_attempts: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of previously failed resolution attempts (optional)',
          },
        },
        required: ['severity', 'business_hours'],
      },
    };
  }

  private getListSourcesTool(): Tool {
    return {
      name: 'list_sources',
      description: 'List all configured documentation sources with health status',
      inputSchema: {
        type: 'object',
        properties: {
          include_health: {
            type: 'boolean',
            description: 'Include health check information (default: true)',
            default: true,
          },
        },
      },
    };
  }

  private getSearchKnowledgeBaseTool(): Tool {
    return {
      name: 'search_knowledge_base',
      description: 'General documentation search across all sources',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string',
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'Limit search to specific categories (optional)',
          },
          max_age_days: {
            type: 'number',
            description: 'Only return documents updated within this many days (optional)',
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10)',
            default: 10,
          },
        },
        required: ['query'],
      },
    };
  }

  private getRecordResolutionFeedbackTool(): Tool {
    return {
      name: 'record_resolution_feedback',
      description: 'Record feedback about resolution outcomes for system improvement',
      inputSchema: {
        type: 'object',
        properties: {
          runbook_id: {
            type: 'string',
            description: 'ID of the runbook that was used',
          },
          procedure_id: {
            type: 'string',
            description: 'ID of the procedure that was executed',
          },
          outcome: {
            type: 'string',
            enum: ['success', 'partial_success', 'failure', 'escalated'],
            description: 'Outcome of the resolution attempt',
          },
          resolution_time_minutes: {
            type: 'number',
            description: 'Time taken to resolve the issue in minutes',
          },
          notes: {
            type: 'string',
            description: 'Additional notes about the resolution process (optional)',
          },
        },
        required: ['runbook_id', 'procedure_id', 'outcome', 'resolution_time_minutes'],
      },
    };
  }

  // ========================================================================
  // Tool Implementations
  // ========================================================================

  private async searchRunbooks(args: any): Promise<RunbookSearchResponse> {
    const { alert_type, severity, affected_systems, context } = args;

    // Create cache key based on search parameters
    const cacheKey = createCacheKey(
      'runbooks',
      JSON.stringify({ alert_type, severity, affected_systems, context })
    );

    // Try to get from cache first
    if (this.cacheService) {
      const cachedResult = await this.cacheService.get<RunbookSearchResponse>(cacheKey);
      if (cachedResult) {
        logger.debug('Cache hit for runbook search', {
          alert_type,
          severity,
          cache_key: `${cacheKey.identifier.substring(0, 50)}...`,
        });
        return {
          ...cachedResult,
          retrieval_time_ms: 0, // Will be updated by caller
          timestamp: new Date().toISOString(),
        };
      }
    }

    const adapters = this.sourceRegistry.getAllAdapters();
    const allRunbooks: any[] = [];

    // Search across all adapters
    for (const adapter of adapters) {
      try {
        const runbooks = await adapter.searchRunbooks(
          alert_type,
          severity,
          affected_systems,
          context
        );
        allRunbooks.push(...runbooks);
      } catch (error) {
        logger.error(`Error searching runbooks in adapter ${adapter.getConfig().name}:`, error);
      }
    }

    // Sort by confidence score
    allRunbooks.sort(
      (a, b) => (b.metadata?.confidence_score || 0) - (a.metadata?.confidence_score || 0)
    );

    const result: RunbookSearchResponse = {
      success: true,
      runbooks: allRunbooks,
      total_results: allRunbooks.length,
      confidence_scores: allRunbooks.map(r => r.metadata?.confidence_score || 0),
      retrieval_time_ms: 0, // Will be set by caller
      timestamp: new Date().toISOString(),
    };

    // Cache the result if cache service is available
    if (this.cacheService && allRunbooks.length > 0) {
      await this.cacheService.set(cacheKey, result);
      logger.debug('Cached runbook search result', {
        alert_type,
        severity,
        results_count: allRunbooks.length,
        cache_key: `${cacheKey.identifier.substring(0, 50)}...`,
      });
    }

    return result;
  }

  private async getDecisionTree(args: any): Promise<DecisionTreeResponse> {
    const { alert_context, current_agent_state } = args;

    // Create cache key based on alert context
    const cacheKey = createCacheKey(
      'decision_trees',
      JSON.stringify({ alert_context, has_agent_state: !!current_agent_state })
    );

    // Try to get from cache first
    if (this.cacheService) {
      const cachedResult = await this.cacheService.get<DecisionTreeResponse>(cacheKey);
      if (cachedResult) {
        logger.debug('Cache hit for decision tree', {
          alert_context: alert_context?.alert_type || 'unknown',
          cache_key: `${cacheKey.identifier.substring(0, 50)}...`,
        });
        return {
          ...cachedResult,
          retrieval_time_ms: 0, // Will be updated by caller
          timestamp: new Date().toISOString(),
        };
      }
    }

    // For now, return a simple decision tree
    // In a full implementation, this would search for relevant decision trees
    // based on the alert context

    const result: DecisionTreeResponse = {
      success: true,
      decision_tree: {
        id: 'default_dt',
        name: 'Default Decision Tree',
        description: 'Default decision tree for incident response',
        branches: [
          {
            id: 'check_severity',
            condition: 'severity === "critical"',
            description: 'Check if severity is critical',
            action: 'immediate_escalation',
            next_step: 'escalate',
            confidence: 0.9,
          },
          {
            id: 'standard_procedure',
            condition: 'severity !== "critical"',
            description: 'Follow standard procedure',
            action: 'execute_runbook',
            next_step: 'monitor',
            confidence: 0.8,
          },
        ],
        default_action: 'escalate',
      },
      confidence_score: 0.8,
      context_applied: current_agent_state !== undefined,
      retrieval_time_ms: 0,
      timestamp: new Date().toISOString(),
    };

    // Cache the result if cache service is available
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result);
      logger.debug('Cached decision tree result', {
        alert_context: alert_context?.alert_type || 'unknown',
        cache_key: `${cacheKey.identifier.substring(0, 50)}...`,
      });
    }

    return result;
  }

  private async getProcedure(args: any): Promise<ProcedureResponse> {
    const { runbook_id, step_name } = args;

    // Create cache key based on runbook and step
    const cacheKey = createCacheKey('procedures', JSON.stringify({ runbook_id, step_name }));

    // Try to get from cache first
    if (this.cacheService) {
      const cachedResult = await this.cacheService.get<ProcedureResponse>(cacheKey);
      if (cachedResult) {
        logger.debug('Cache hit for procedure', {
          runbook_id,
          step_name,
          cache_key: cacheKey.identifier,
        });
        return {
          ...cachedResult,
          retrieval_time_ms: 0, // Will be updated by caller
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Search for the specific procedure
    // This is a simplified implementation

    const result: ProcedureResponse = {
      success: true,
      procedure: {
        id: `${runbook_id}_${step_name}`,
        name: step_name,
        description: `Procedure for ${step_name}`,
        command: 'echo "Execute procedure steps here"',
        expected_outcome: 'Procedure completed successfully',
        timeout_seconds: 300,
        prerequisites: [],
        tools_required: ['shell', 'monitoring_tools'],
      },
      confidence_score: 0.8,
      retrieval_time_ms: 0,
      timestamp: new Date().toISOString(),
    };

    // Cache the result if cache service is available
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result);
      logger.debug('Cached procedure result', {
        runbook_id,
        step_name,
        cache_key: cacheKey.identifier,
      });
    }

    return result;
  }

  private async getEscalationPath(args: any): Promise<EscalationResponse> {
    const { severity, business_hours } = args;

    // Simple escalation logic based on severity and business hours
    const escalationContacts = business_hours
      ? [
          {
            name: 'On-Call Engineer',
            role: 'L2 Support',
            contact: 'oncall-l2@company.com',
            availability: 'business_hours',
          },
          {
            name: 'Team Lead',
            role: 'L3 Support',
            contact: 'team-lead@company.com',
            availability: 'business_hours',
          },
        ]
      : [
          {
            name: 'Night Shift Lead',
            role: 'L2 Support',
            contact: 'oncall-night@company.com',
            availability: '24x7',
          },
          {
            name: 'Emergency Escalation',
            role: 'L3 Support',
            contact: 'emergency@company.com',
            availability: '24x7',
          },
        ];

    return {
      success: true,
      escalation_contacts: escalationContacts,
      escalation_procedure: `1. Contact ${escalationContacts[0]?.name} via ${escalationContacts[0]?.contact}\n2. If no response in 15 minutes, escalate to ${escalationContacts[1]?.name}`,
      estimated_response_time: severity === 'critical' ? '5 minutes' : '30 minutes',
      retrieval_time_ms: 0,
      timestamp: new Date().toISOString(),
    };
  }

  private async listSources(args: any): Promise<{
    success: boolean;
    sources: Array<{
      name: string;
      type: string;
      enabled: boolean;
      health?: HealthCheck;
      metadata?: any;
    }>;
  }> {
    const { include_health = true } = args;

    const adapters = this.sourceRegistry.getAllAdapters();
    const sources = [];

    for (const adapter of adapters) {
      const config = adapter.getConfig();
      const source: any = {
        name: config.name,
        type: config.type,
        enabled: config.enabled,
      };

      if (include_health) {
        try {
          source.health = await adapter.healthCheck();
          source.metadata = await adapter.getMetadata();
        } catch (error) {
          source.health = {
            source_name: config.name,
            healthy: false,
            response_time_ms: 0,
            last_check: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Health check failed',
          };
        }
      }

      sources.push(source);
    }

    return {
      success: true,
      sources,
    };
  }

  private async searchKnowledgeBase(args: any): Promise<{
    success: boolean;
    results: SearchResult[];
    total_results: number;
  }> {
    const { query, categories, max_age_days, max_results = 10 } = args;

    // Create cache key based on search parameters
    const cacheKey = createCacheKey(
      'knowledge_base',
      JSON.stringify({ query, categories, max_age_days, max_results })
    );

    // Try to get from cache first
    if (this.cacheService) {
      const cachedResult = await this.cacheService.get<{
        success: boolean;
        results: SearchResult[];
        total_results: number;
      }>(cacheKey);
      if (cachedResult) {
        logger.debug('Cache hit for knowledge base search', {
          query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
          categories,
          cache_key: `${cacheKey.identifier.substring(0, 50)}...`,
        });
        return cachedResult;
      }
    }

    const adapters = this.sourceRegistry.getAllAdapters();
    const allResults: SearchResult[] = [];

    for (const adapter of adapters) {
      try {
        const results = await adapter.search(query, {
          categories,
          max_age_days,
          confidence_threshold: 0.4, // Reasonable threshold for quality results
        });
        allResults.push(...results);
      } catch (error) {
        logger.error(`Error searching in adapter ${adapter.getConfig().name}:`, error);
      }
    }

    // Sort by confidence score and limit results
    allResults.sort((a, b) => b.confidence_score - a.confidence_score);
    const limitedResults = allResults.slice(0, max_results);

    const result = {
      success: true,
      results: limitedResults,
      total_results: allResults.length,
    };

    // Cache the result if cache service is available and we have results
    if (this.cacheService && limitedResults.length > 0) {
      await this.cacheService.set(cacheKey, result);
      logger.debug('Cached knowledge base search result', {
        query: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
        results_count: limitedResults.length,
        cache_key: `${cacheKey.identifier.substring(0, 50)}...`,
      });
    }

    return result;
  }

  private async recordResolutionFeedback(args: any): Promise<BaseResponse> {
    const { runbook_id, procedure_id, outcome, resolution_time_minutes, notes } = args;

    // In a full implementation, this would store feedback in a database
    // or send to an analytics system
    logger.info('Recording resolution feedback', {
      runbook_id,
      procedure_id,
      outcome,
      resolution_time_minutes,
      notes,
    });

    return {
      success: true,
      message: 'Feedback recorded successfully',
      retrieval_time_ms: 0,
      timestamp: new Date().toISOString(),
    };
  }
}
