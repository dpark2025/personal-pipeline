/**
 * Request/Response Transformation Utilities
 * 
 * Handles transformation between REST API requests and MCP tool parameters,
 * and between MCP tool responses and REST API responses. Preserves metadata,
 * confidence scores, and performance metrics while ensuring compatibility.
 */

import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Type Definitions
// ============================================================================

export interface MCPToolRequest {
  [key: string]: any;
}

export interface RestResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    confidence_score?: number;
    retrieval_time_ms?: number;
    source?: string;
    cached?: boolean;
    match_reasons?: string[];
    [key: string]: any;
  };
}

// ============================================================================
// Request Transformation Functions
// ============================================================================

/**
 * Transform REST API request to MCP tool parameters
 */
export function transformRestRequest(toolName: string, requestBody: any): MCPToolRequest {
  try {
    switch (toolName) {
      case 'search_knowledge_base':
        return transformSearchKnowledgeBaseRequest(requestBody);
      
      case 'search_runbooks':
        return transformSearchRunbooksRequest(requestBody);
      
      case 'get_decision_tree':
        return transformDecisionTreeRequest(requestBody);
      
      case 'get_procedure':
        return transformProcedureRequest(requestBody);
      
      case 'get_escalation_path':
        return transformEscalationRequest(requestBody);
      
      case 'list_sources':
        return transformListSourcesRequest(requestBody);
      
      case 'record_resolution_feedback':
        return transformFeedbackRequest(requestBody);
      
      default:
        logger.warn('Unknown tool name for request transformation', { toolName });
        return requestBody;
    }
  } catch (error) {
    logger.error('Request transformation failed', {
      toolName,
      error: error instanceof Error ? error.message : String(error),
      requestBody: JSON.stringify(requestBody).substring(0, 200)
    });
    throw new Error(`Failed to transform request for tool: ${toolName}`);
  }
}

/**
 * Transform search knowledge base request
 */
function transformSearchKnowledgeBaseRequest(body: any): MCPToolRequest {
  return {
    query: body.query,
    categories: body.categories || undefined,
    max_age_days: body.max_age_days || undefined,
    max_results: body.max_results || 10
  };
}

/**
 * Transform search runbooks request
 */
function transformSearchRunbooksRequest(body: any): MCPToolRequest {
  return {
    alert_type: body.alert_type,
    severity: body.severity,
    affected_systems: body.affected_systems,
    context: body.context || {}
  };
}

/**
 * Transform decision tree request
 */
function transformDecisionTreeRequest(body: any): MCPToolRequest {
  return {
    alert_context: body.alert_context,
    current_agent_state: body.current_agent_state || undefined
  };
}

/**
 * Transform procedure request
 */
function transformProcedureRequest(body: any): MCPToolRequest {
  return {
    runbook_id: body.runbook_id,
    step_name: body.step_name,
    current_context: body.current_context || {}
  };
}

/**
 * Transform escalation request
 */
function transformEscalationRequest(body: any): MCPToolRequest {
  return {
    severity: body.severity,
    business_hours: body.business_hours,
    failed_attempts: body.failed_attempts || []
  };
}

/**
 * Transform list sources request
 */
function transformListSourcesRequest(body: any): MCPToolRequest {
  return {
    include_health: body.include_health !== false
  };
}

/**
 * Transform feedback request
 */
function transformFeedbackRequest(body: any): MCPToolRequest {
  return {
    runbook_id: body.runbook_id,
    procedure_id: body.procedure_id,
    outcome: body.outcome,
    resolution_time_minutes: body.resolution_time_minutes,
    notes: body.notes || undefined
  };
}

// ============================================================================
// Response Transformation Functions
// ============================================================================

/**
 * Transform MCP tool response to REST API format
 */
export function transformMCPResponse(mcpResult: CallToolResult): RestResponse {
  try {
    // Handle error responses
    if (mcpResult.isError) {
      return transformMCPError(mcpResult);
    }

    // Extract content from MCP response
    const content = extractMCPContent(mcpResult);
    
    if (!content) {
      return {
        success: false,
        error: {
          code: 'INVALID_MCP_RESPONSE',
          message: 'MCP response contained no readable content'
        }
      };
    }

    // Parse JSON content if it's a string
    let parsedContent: any;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        // If parsing fails, treat as plain text response
        parsedContent = { message: content };
      }
    } else {
      parsedContent = content;
    }

    // Transform successful response
    return transformSuccessfulMCPResponse(parsedContent);

  } catch (error) {
    logger.error('MCP response transformation failed', {
      error: error instanceof Error ? error.message : String(error),
      mcpResult: JSON.stringify(mcpResult).substring(0, 500)
    });

    return {
      success: false,
      error: {
        code: 'RESPONSE_TRANSFORMATION_ERROR',
        message: 'Failed to transform MCP response',
        details: { error: error instanceof Error ? error.message : String(error) }
      }
    };
  }
}

/**
 * Extract text content from MCP CallToolResult
 */
function extractMCPContent(mcpResult: CallToolResult): string | null {
  if (!mcpResult.content || !Array.isArray(mcpResult.content)) {
    return null;
  }

  // Find the first text content
  for (const item of mcpResult.content) {
    if (item.type === 'text' && 'text' in item) {
      return (item as TextContent).text;
    }
  }

  return null;
}

/**
 * Transform MCP error response
 */
function transformMCPError(mcpResult: CallToolResult): RestResponse {
  const content = extractMCPContent(mcpResult);
  
  let errorInfo: any = {
    code: 'MCP_TOOL_ERROR',
    message: 'MCP tool execution failed'
  };

  if (content) {
    try {
      const parsedError = JSON.parse(content);
      if (parsedError.message) {
        errorInfo.message = parsedError.message;
      }
      if (parsedError.code) {
        errorInfo.code = parsedError.code;
      }
      errorInfo.details = parsedError;
    } catch (parseError) {
      errorInfo.message = content;
    }
  }

  return {
    success: false,
    error: errorInfo
  };
}

/**
 * Transform successful MCP response to REST format
 */
function transformSuccessfulMCPResponse(content: any): RestResponse {
  // Ensure we have a success field
  const isSuccess = content.success !== false;
  
  if (!isSuccess) {
    return {
      success: false,
      error: {
        code: content.error?.code || 'OPERATION_FAILED',
        message: content.error?.message || content.message || 'Operation failed',
        details: content.error?.details || content
      }
    };
  }

  // Extract metadata
  const metadata: any = {};
  
  // Standard metadata fields
  if (content.retrieval_time_ms !== undefined) {
    metadata.retrieval_time_ms = content.retrieval_time_ms;
  }
  if (content.timestamp) {
    metadata.timestamp = content.timestamp;
  }
  if (content.confidence_score !== undefined) {
    metadata.confidence_score = content.confidence_score;
  }
  if (content.source) {
    metadata.source = content.source;
  }
  if (content.cached !== undefined) {
    metadata.cached = content.cached;
  }
  if (content.match_reasons) {
    metadata.match_reasons = content.match_reasons;
  }

  // Create data object without metadata fields
  const data = { ...content };
  delete data.success;
  delete data.retrieval_time_ms;
  delete data.timestamp;
  delete data.confidence_score;
  delete data.source;
  delete data.cached;
  delete data.match_reasons;

  return {
    success: true,
    data,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined
  };
}

// ============================================================================
// Tool-Specific Response Transformations
// ============================================================================

/**
 * Transform runbook search response
 */
export function transformRunbookSearchResponse(content: any): RestResponse {
  const response = transformSuccessfulMCPResponse(content);
  
  if (response.success && response.data) {
    // Enhance runbook data with REST-specific formatting
    if (response.data.runbooks) {
      response.data.runbooks = response.data.runbooks.map((runbook: any) => ({
        ...runbook,
        // Add REST-specific fields
        url: `/api/runbooks/${runbook.id}`,
        procedures_url: runbook.procedures?.map((p: any) => 
          `/api/procedures/${runbook.id}_${p.name || p.id}`
        )
      }));
    }

    // Add pagination info if needed
    if (response.data.total_results > 0) {
      response.metadata = {
        ...response.metadata,
        pagination: {
          total: response.data.total_results,
          returned: response.data.runbooks?.length || 0,
          has_more: (response.data.runbooks?.length || 0) < response.data.total_results
        }
      };
    }
  }

  return response;
}

/**
 * Transform search results response
 */
export function transformSearchResultsResponse(content: any): RestResponse {
  const response = transformSuccessfulMCPResponse(content);
  
  if (response.success && response.data?.results) {
    // Enhance search results with REST-specific formatting
    response.data.results = response.data.results.map((result: any) => ({
      ...result,
      // Add REST API specific fields
      api_url: result.url ? `/api/documents/${encodeURIComponent(result.id)}` : undefined,
      snippet: result.content ? result.content.substring(0, 200) + '...' : undefined
    }));

    // Add search metadata
    response.metadata = {
      ...response.metadata,
      search_info: {
        total_results: response.data.total_results || response.data.results.length,
        returned_results: response.data.results.length,
        avg_confidence: response.data.results.length > 0 
          ? response.data.results.reduce((sum: number, r: any) => 
              sum + (r.confidence_score || 0), 0) / response.data.results.length
          : 0
      }
    };
  }

  return response;
}

/**
 * Transform procedure response
 */
export function transformProcedureResponse(content: any): RestResponse {
  const response = transformSuccessfulMCPResponse(content);
  
  if (response.success && response.data?.procedure) {
    // Add REST-specific fields to procedure
    response.data.procedure = {
      ...response.data.procedure,
      execution_url: `/api/procedures/${response.data.procedure.id}/execute`,
      runbook_url: response.data.procedure.runbook_id 
        ? `/api/runbooks/${response.data.procedure.runbook_id}`
        : undefined
    };

    // Add related procedures with URLs
    if (response.data.related_steps) {
      response.data.related_steps = response.data.related_steps.map((step: any) => ({
        ...step,
        url: `/api/procedures/${step.id}`
      }));
    }
  }

  return response;
}

/**
 * Transform escalation response
 */
export function transformEscalationResponse(content: any): RestResponse {
  const response = transformSuccessfulMCPResponse(content);
  
  if (response.success && response.data?.escalation_contacts) {
    // Add contact formatting for REST API
    response.data.escalation_contacts = response.data.escalation_contacts.map((contact: any) => ({
      ...contact,
      // Add structured contact info
      contact_methods: parseContactMethods(contact.contact),
      escalation_order: response.data.escalation_contacts.indexOf(contact) + 1
    }));

    // Add escalation metadata
    response.metadata = {
      ...response.metadata,
      escalation_info: {
        total_contacts: response.data.escalation_contacts.length,
        estimated_response_time: response.data.estimated_response_time,
        escalation_trigger: response.data.escalation_procedure
      }
    };
  }

  return response;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse contact information into structured format
 */
function parseContactMethods(contact: string): any {
  const methods: any = {};
  
  if (contact.includes('@')) {
    methods.email = contact;
  }
  
  if (contact.match(/\+?[\d\s\-\(\)]+/)) {
    methods.phone = contact;
  }
  
  if (contact.includes('slack:') || contact.includes('#')) {
    methods.slack = contact;
  }
  
  return methods;
}

/**
 * Validate MCP response structure
 */
export function validateMCPResponse(mcpResult: CallToolResult): boolean {
  try {
    if (!mcpResult || typeof mcpResult !== 'object') {
      return false;
    }
    
    if (!mcpResult.content || !Array.isArray(mcpResult.content)) {
      return false;
    }
    
    // Check if at least one content item is readable
    return mcpResult.content.some(item => 
      item.type === 'text' && 'text' in item && typeof item.text === 'string'
    );
  } catch (error) {
    logger.error('MCP response validation failed', { error });
    return false;
  }
}

/**
 * Sanitize response data for security
 */
export function sanitizeResponseData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Remove potentially sensitive fields
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }
  
  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeResponseData(value);
    }
  }
  
  return sanitized;
}