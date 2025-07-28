/**
 * Core types and interfaces for Personal Pipeline MCP Server
 */

import { z } from 'zod';

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Confidence score for match quality (0.0 - 1.0)
 */
export const ConfidenceScore = z.number().min(0).max(1);
export type ConfidenceScore = z.infer<typeof ConfidenceScore>;

/**
 * Alert severity levels
 */
export const AlertSeverity = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

/**
 * Source types for documentation
 */
export const SourceType = z.enum(['confluence', 'notion', 'github', 'database', 'web', 'file']);
export type SourceType = z.infer<typeof SourceType>;

// ============================================================================
// Runbook Types
// ============================================================================

/**
 * Decision tree branch with conditional logic
 */
export const DecisionBranch = z.object({
  id: z.string(),
  condition: z.string(),
  description: z.string(),
  action: z.string(),
  next_step: z.string().optional(),
  confidence: ConfidenceScore,
  rollback_step: z.string().optional(),
});
export type DecisionBranch = z.infer<typeof DecisionBranch>;

/**
 * Decision tree structure
 */
export const DecisionTree = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  branches: z.array(DecisionBranch),
  default_action: z.string(),
  metadata: z.record(z.any()).optional(),
});
export type DecisionTree = z.infer<typeof DecisionTree>;

/**
 * Procedure step with execution details
 */
export const ProcedureStep = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  command: z.string().optional(),
  expected_outcome: z.string(),
  timeout_seconds: z.number().optional(),
  prerequisites: z.array(z.string()).optional(),
  rollback_procedure: z.string().optional(),
  tools_required: z.array(z.string()).optional(),
});
export type ProcedureStep = z.infer<typeof ProcedureStep>;

/**
 * Complete runbook structure
 */
export const Runbook = z.object({
  id: z.string(),
  title: z.string(),
  version: z.string(),
  description: z.string(),
  triggers: z.array(z.string()),
  severity_mapping: z.record(AlertSeverity),
  decision_tree: DecisionTree,
  procedures: z.array(ProcedureStep),
  escalation_path: z.string().optional(),
  metadata: z.object({
    created_at: z.string(),
    updated_at: z.string(),
    author: z.string(),
    confidence_score: ConfidenceScore,
    success_rate: z.number().min(0).max(1).optional(),
    avg_resolution_time_minutes: z.number().optional(),
  }),
});
export type Runbook = z.infer<typeof Runbook>;

// ============================================================================
// Search and Retrieval Types
// ============================================================================

/**
 * Search filters for documentation retrieval
 */
export const SearchFilters = z.object({
  source_types: z.array(SourceType).optional(),
  max_age_days: z.number().optional(),
  severity: AlertSeverity.optional(),
  categories: z.array(z.string()).optional(),
  confidence_threshold: ConfidenceScore.optional(),
});
export type SearchFilters = z.infer<typeof SearchFilters>;

/**
 * Search result with confidence and metadata
 */
export const SearchResult = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  source: z.string(),
  source_type: SourceType,
  confidence_score: ConfidenceScore,
  match_reasons: z.array(z.string()),
  retrieval_time_ms: z.number(),
  url: z.string().optional(),
  last_updated: z.string(),
  metadata: z.record(z.any()).optional(),
});
export type SearchResult = z.infer<typeof SearchResult>;

// ============================================================================
// Source Adapter Types
// ============================================================================

/**
 * Authentication configuration for sources
 */
export const AuthConfig = z.object({
  type: z.enum(['bearer_token', 'basic_auth', 'api_key', 'oauth2']),
  token_env: z.string().optional(),
  username_env: z.string().optional(),
  password_env: z.string().optional(),
  api_key_env: z.string().optional(),
  oauth_config: z.record(z.string()).optional(),
});
export type AuthConfig = z.infer<typeof AuthConfig>;

/**
 * Source configuration
 */
export const SourceConfig = z.object({
  name: z.string(),
  type: SourceType,
  base_url: z.string().optional(),
  auth: AuthConfig.optional(),
  refresh_interval: z.string(),
  priority: z.number(),
  enabled: z.boolean().default(true),
  timeout_ms: z.number().default(30000),
  max_retries: z.number().default(3),
  metadata: z.record(z.any()).optional(),
});
export type SourceConfig = z.infer<typeof SourceConfig>;

/**
 * Health check result for sources
 */
export const HealthCheck = z.object({
  source_name: z.string(),
  healthy: z.boolean(),
  response_time_ms: z.number(),
  last_check: z.string(),
  error_message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});
export type HealthCheck = z.infer<typeof HealthCheck>;

// ============================================================================
// MCP Tool Response Types
// ============================================================================

/**
 * Base response structure for all MCP tools
 */
export const BaseResponse = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  retrieval_time_ms: z.number(),
  timestamp: z.string(),
});
export type BaseResponse = z.infer<typeof BaseResponse>;

/**
 * Runbook search response
 */
export const RunbookSearchResponse = BaseResponse.extend({
  runbooks: z.array(Runbook),
  total_results: z.number(),
  confidence_scores: z.array(ConfidenceScore),
});
export type RunbookSearchResponse = z.infer<typeof RunbookSearchResponse>;

/**
 * Decision tree response
 */
export const DecisionTreeResponse = BaseResponse.extend({
  decision_tree: DecisionTree,
  confidence_score: ConfidenceScore,
  context_applied: z.boolean(),
});
export type DecisionTreeResponse = z.infer<typeof DecisionTreeResponse>;

/**
 * Procedure response
 */
export const ProcedureResponse = BaseResponse.extend({
  procedure: ProcedureStep,
  related_steps: z.array(ProcedureStep).optional(),
  confidence_score: ConfidenceScore,
});
export type ProcedureResponse = z.infer<typeof ProcedureResponse>;

/**
 * Escalation path response
 */
export const EscalationResponse = BaseResponse.extend({
  escalation_contacts: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      contact: z.string(),
      availability: z.string(),
    })
  ),
  escalation_procedure: z.string(),
  estimated_response_time: z.string(),
});
export type EscalationResponse = z.infer<typeof EscalationResponse>;

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Server configuration
 */
export const ServerConfig = z.object({
  port: z.number().default(3000),
  host: z.string().default('localhost'),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  cache_ttl_seconds: z.number().default(3600),
  max_concurrent_requests: z.number().default(100),
  request_timeout_ms: z.number().default(30000),
  health_check_interval_ms: z.number().default(60000),
});
export type ServerConfig = z.infer<typeof ServerConfig>;

/**
 * Application configuration
 */
export const AppConfig = z.object({
  server: ServerConfig,
  sources: z.array(SourceConfig),
  embedding: z
    .object({
      enabled: z.boolean().default(true),
      model: z.string().default('sentence-transformers/all-MiniLM-L6-v2'),
      cache_size: z.number().default(1000),
    })
    .optional(),
});
export type AppConfig = z.infer<typeof AppConfig>;

// ============================================================================
// Error Types
// ============================================================================

export class PPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PPError';
  }
}

export class SourceError extends PPError {
  constructor(message: string, sourceName: string, context?: Record<string, any>) {
    super(message, 'SOURCE_ERROR', 502, { ...context, sourceName });
    this.name = 'SourceError';
  }
}

export class ValidationError extends PPError {
  constructor(message: string, field: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, { ...context, field });
    this.name = 'ValidationError';
  }
}
