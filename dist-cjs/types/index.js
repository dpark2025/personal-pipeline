"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubAdapterError = exports.GitHubConfigurationError = exports.GitHubAuthenticationError = exports.GitHubRateLimitError = exports.GitHubError = exports.ValidationError = exports.SourceError = exports.PPError = exports.GitHubRateLimit = exports.GitHubContentFile = exports.GitHubRepositoryMetadata = exports.ConfluenceConfig = exports.FileSystemConfig = exports.GitHubConfig = exports.GitHubWebhookConfig = exports.GitHubPerformanceConfig = exports.GitHubContentConfig = exports.GitHubScopeConfig = exports.GitHubRepositoryFilters = exports.GitHubAuthConfig = exports.AppConfig = exports.ServerConfig = exports.CacheHealthCheck = exports.CacheStats = exports.CacheConfig = exports.EscalationResponse = exports.ProcedureResponse = exports.DecisionTreeResponse = exports.RunbookSearchResponse = exports.BaseResponse = exports.HealthCheck = exports.SourceConfig = exports.AuthConfig = exports.SearchResult = exports.SearchFilters = exports.Runbook = exports.ProcedureStep = exports.DecisionTree = exports.DecisionBranch = exports.DocumentCategory = exports.SourceType = exports.AlertSeverity = exports.ConfidenceScore = void 0;
const zod_1 = require("zod");
exports.ConfidenceScore = zod_1.z.number().min(0).max(1);
exports.AlertSeverity = zod_1.z.enum(['critical', 'high', 'medium', 'low', 'info']);
exports.SourceType = zod_1.z.enum(['confluence', 'notion', 'github', 'database', 'web', 'file']);
exports.DocumentCategory = zod_1.z.enum(['runbook', 'api', 'guide', 'general']);
exports.DecisionBranch = zod_1.z.object({
    id: zod_1.z.string(),
    condition: zod_1.z.string(),
    description: zod_1.z.string(),
    action: zod_1.z.string(),
    next_step: zod_1.z.string().optional(),
    confidence: exports.ConfidenceScore,
    rollback_step: zod_1.z.string().optional(),
});
exports.DecisionTree = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    branches: zod_1.z.array(exports.DecisionBranch),
    default_action: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.ProcedureStep = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    command: zod_1.z.string().optional(),
    expected_outcome: zod_1.z.string(),
    timeout_seconds: zod_1.z.number().optional(),
    prerequisites: zod_1.z.array(zod_1.z.string()).optional(),
    rollback_procedure: zod_1.z.string().optional(),
    tools_required: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.Runbook = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    version: zod_1.z.string(),
    description: zod_1.z.string(),
    triggers: zod_1.z.array(zod_1.z.string()),
    severity_mapping: zod_1.z.record(exports.AlertSeverity),
    decision_tree: exports.DecisionTree,
    procedures: zod_1.z.array(exports.ProcedureStep),
    escalation_path: zod_1.z.string().optional(),
    metadata: zod_1.z.object({
        created_at: zod_1.z.string(),
        updated_at: zod_1.z.string(),
        author: zod_1.z.string(),
        confidence_score: exports.ConfidenceScore,
        success_rate: zod_1.z.number().min(0).max(1).optional(),
        avg_resolution_time_minutes: zod_1.z.number().optional(),
    }),
});
exports.SearchFilters = zod_1.z.object({
    source_types: zod_1.z.array(exports.SourceType).optional(),
    max_age_days: zod_1.z.number().optional(),
    severity: exports.AlertSeverity.optional(),
    categories: zod_1.z.array(zod_1.z.string()).optional(),
    confidence_threshold: exports.ConfidenceScore.optional(),
    min_confidence: exports.ConfidenceScore.optional(),
    category: exports.DocumentCategory.optional(),
    limit: zod_1.z.number().optional(),
});
exports.SearchResult = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    content: zod_1.z.string(),
    source: zod_1.z.string(),
    source_name: zod_1.z.string().optional(),
    source_type: exports.SourceType,
    category: exports.DocumentCategory.optional(),
    confidence_score: exports.ConfidenceScore,
    match_reasons: zod_1.z.array(zod_1.z.string()),
    retrieval_time_ms: zod_1.z.number(),
    url: zod_1.z.string().optional(),
    last_updated: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.AuthConfig = zod_1.z.object({
    type: zod_1.z.enum([
        'bearer_token',
        'basic_auth',
        'api_key',
        'oauth2',
        'personal_token',
        'github_app',
        'basic',
        'bearer',
        'cookie',
    ]),
    token_env: zod_1.z.string().optional(),
    username_env: zod_1.z.string().optional(),
    password_env: zod_1.z.string().optional(),
    api_key_env: zod_1.z.string().optional(),
    oauth_config: zod_1.z.record(zod_1.z.string()).optional(),
    credentials: zod_1.z.record(zod_1.z.string()).optional(),
});
exports.SourceConfig = zod_1.z.object({
    name: zod_1.z.string(),
    type: exports.SourceType,
    base_url: zod_1.z.string().optional(),
    auth: exports.AuthConfig.optional(),
    refresh_interval: zod_1.z.string(),
    priority: zod_1.z.number(),
    enabled: zod_1.z.boolean().default(true),
    timeout_ms: zod_1.z.number().default(30000),
    max_retries: zod_1.z.number().default(3),
    categories: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.HealthCheck = zod_1.z.object({
    source_name: zod_1.z.string(),
    healthy: zod_1.z.boolean(),
    response_time_ms: zod_1.z.number(),
    last_check: zod_1.z.string(),
    error_message: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.BaseResponse = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string().optional(),
    retrieval_time_ms: zod_1.z.number(),
    timestamp: zod_1.z.string(),
});
exports.RunbookSearchResponse = exports.BaseResponse.extend({
    runbooks: zod_1.z.array(exports.Runbook),
    total_results: zod_1.z.number(),
    confidence_scores: zod_1.z.array(exports.ConfidenceScore),
});
exports.DecisionTreeResponse = exports.BaseResponse.extend({
    decision_tree: exports.DecisionTree,
    confidence_score: exports.ConfidenceScore,
    context_applied: zod_1.z.boolean(),
});
exports.ProcedureResponse = exports.BaseResponse.extend({
    procedure: exports.ProcedureStep,
    related_steps: zod_1.z.array(exports.ProcedureStep).optional(),
    confidence_score: exports.ConfidenceScore,
});
exports.EscalationResponse = exports.BaseResponse.extend({
    escalation_contacts: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        role: zod_1.z.string(),
        contact: zod_1.z.string(),
        availability: zod_1.z.string(),
    })),
    escalation_procedure: zod_1.z.string(),
    estimated_response_time: zod_1.z.string(),
});
exports.CacheConfig = zod_1.z.object({
    enabled: zod_1.z.boolean().default(true),
    strategy: zod_1.z.enum(['memory_only', 'redis_only', 'hybrid']).default('hybrid'),
    memory: zod_1.z.object({
        max_keys: zod_1.z.number().default(1000),
        ttl_seconds: zod_1.z.number().default(3600),
        check_period_seconds: zod_1.z.number().default(600),
    }),
    redis: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        url: zod_1.z.string().default('redis://localhost:6379'),
        ttl_seconds: zod_1.z.number().default(7200),
        key_prefix: zod_1.z.string().default('pp:cache:'),
        connection_timeout_ms: zod_1.z.number().default(5000),
        retry_attempts: zod_1.z.number().default(3),
        retry_delay_ms: zod_1.z.number().default(1000),
        max_retry_delay_ms: zod_1.z.number().default(30000),
        backoff_multiplier: zod_1.z.number().default(2),
        connection_retry_limit: zod_1.z.number().default(5),
    }),
    content_types: zod_1.z.object({
        runbooks: zod_1.z.object({
            ttl_seconds: zod_1.z.number().default(3600),
            warmup: zod_1.z.boolean().default(true),
        }),
        procedures: zod_1.z.object({
            ttl_seconds: zod_1.z.number().default(1800),
            warmup: zod_1.z.boolean().default(false),
        }),
        decision_trees: zod_1.z.object({
            ttl_seconds: zod_1.z.number().default(2400),
            warmup: zod_1.z.boolean().default(true),
        }),
        knowledge_base: zod_1.z.object({
            ttl_seconds: zod_1.z.number().default(900),
            warmup: zod_1.z.boolean().default(false),
        }),
    }),
});
exports.CacheStats = zod_1.z.object({
    hits: zod_1.z.number(),
    misses: zod_1.z.number(),
    hit_rate: zod_1.z.number(),
    total_operations: zod_1.z.number(),
    memory_usage_bytes: zod_1.z.number().optional(),
    redis_connected: zod_1.z.boolean().optional(),
    last_reset: zod_1.z.string(),
    by_content_type: zod_1.z
        .record(zod_1.z.object({
        hits: zod_1.z.number(),
        misses: zod_1.z.number(),
        hit_rate: zod_1.z.number(),
    }))
        .optional(),
});
exports.CacheHealthCheck = zod_1.z.object({
    memory_cache: zod_1.z.object({
        healthy: zod_1.z.boolean(),
        keys_count: zod_1.z.number(),
        memory_usage_mb: zod_1.z.number(),
        response_time_ms: zod_1.z.number(),
    }),
    redis_cache: zod_1.z
        .object({
        healthy: zod_1.z.boolean(),
        connected: zod_1.z.boolean(),
        response_time_ms: zod_1.z.number(),
        error_message: zod_1.z.string().optional(),
    })
        .optional(),
    overall_healthy: zod_1.z.boolean(),
});
exports.ServerConfig = zod_1.z.object({
    port: zod_1.z.number().default(3000),
    host: zod_1.z.string().default('localhost'),
    log_level: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    cache_ttl_seconds: zod_1.z.number().default(3600),
    max_concurrent_requests: zod_1.z.number().default(100),
    request_timeout_ms: zod_1.z.number().default(30000),
    health_check_interval_ms: zod_1.z.number().default(60000),
});
exports.AppConfig = zod_1.z.object({
    server: exports.ServerConfig,
    sources: zod_1.z.array(exports.SourceConfig),
    cache: exports.CacheConfig.optional(),
    embedding: zod_1.z
        .object({
        enabled: zod_1.z.boolean().default(true),
        model: zod_1.z.string().default('sentence-transformers/all-MiniLM-L6-v2'),
        cache_size: zod_1.z.number().default(1000),
    })
        .optional(),
});
exports.GitHubAuthConfig = zod_1.z.object({
    type: zod_1.z.enum(['personal_token', 'github_app']),
    token_env: zod_1.z.string().optional(),
    app_config: zod_1.z
        .object({
        app_id: zod_1.z.string(),
        private_key_env: zod_1.z.string(),
        installation_id: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.GitHubRepositoryFilters = zod_1.z.object({
    languages: zod_1.z.array(zod_1.z.string()).optional(),
    topics: zod_1.z.array(zod_1.z.string()).optional(),
    min_stars: zod_1.z.number().optional(),
    max_age_days: zod_1.z.number().optional(),
});
exports.GitHubScopeConfig = zod_1.z.object({
    repositories: zod_1.z.array(zod_1.z.string()).optional(),
    organizations: zod_1.z.array(zod_1.z.string()).optional(),
    include_private: zod_1.z.boolean().default(false),
    user_consent_given: zod_1.z.boolean().default(false),
    repository_filters: exports.GitHubRepositoryFilters.optional(),
});
exports.GitHubContentConfig = zod_1.z.object({
    readme: zod_1.z.boolean().default(true),
    wiki: zod_1.z.boolean().default(false),
    documentation: zod_1.z.boolean().default(true),
    issues: zod_1.z.boolean().default(false),
    pull_requests: zod_1.z.boolean().default(false),
    code_comments: zod_1.z.boolean().default(false),
});
exports.GitHubPerformanceConfig = zod_1.z.object({
    cache_ttl: zod_1.z.string().default('4h'),
    max_file_size_kb: zod_1.z.number().default(100),
    rate_limit_quota: zod_1.z.number().min(1).max(100).default(10),
    min_request_interval_ms: zod_1.z.number().min(1000).default(2000),
    concurrent_requests: zod_1.z.number().min(1).max(10).default(1),
    max_repositories_per_scan: zod_1.z.number().min(1).max(50).default(5),
});
exports.GitHubWebhookConfig = zod_1.z.object({
    endpoint_url: zod_1.z.string().url(),
    secret_env: zod_1.z.string(),
    events: zod_1.z.array(zod_1.z.string()).default(['push']),
});
exports.GitHubConfig = exports.SourceConfig.extend({
    type: zod_1.z.literal('github'),
    auth: exports.GitHubAuthConfig,
    scope: exports.GitHubScopeConfig,
    content_types: exports.GitHubContentConfig.default({}),
    performance: exports.GitHubPerformanceConfig.default({}),
    webhook: exports.GitHubWebhookConfig.optional(),
});
exports.FileSystemConfig = exports.SourceConfig.extend({
    type: zod_1.z.literal('file'),
    base_paths: zod_1.z.array(zod_1.z.string()).optional(),
    recursive: zod_1.z.boolean().default(true),
    max_depth: zod_1.z.number().default(10),
    file_patterns: zod_1.z.object({
        include: zod_1.z.array(zod_1.z.string()).optional(),
        exclude: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
    supported_extensions: zod_1.z.array(zod_1.z.string()).optional(),
    extract_metadata: zod_1.z.boolean().default(true),
    pdf_extraction: zod_1.z.boolean().default(true),
    watch_changes: zod_1.z.boolean().default(false),
});
exports.ConfluenceConfig = exports.SourceConfig.extend({
    type: zod_1.z.literal('confluence'),
    base_url: zod_1.z.string(),
    space_keys: zod_1.z.array(zod_1.z.string()).optional(),
    auth: zod_1.z.object({
        type: zod_1.z.enum(['bearer_token', 'basic']),
        token_env: zod_1.z.string().optional(),
        username_env: zod_1.z.string().optional(),
        password_env: zod_1.z.string().optional(),
    }),
    rate_limit: zod_1.z.number().default(10),
    max_results: zod_1.z.number().default(50),
});
exports.GitHubRepositoryMetadata = zod_1.z.object({
    owner: zod_1.z.string(),
    repo: zod_1.z.string(),
    full_name: zod_1.z.string(),
    default_branch: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    language: zod_1.z.string().nullable(),
    topics: zod_1.z.array(zod_1.z.string()),
    stars: zod_1.z.number(),
    forks: zod_1.z.number(),
    is_private: zod_1.z.boolean(),
    is_fork: zod_1.z.boolean(),
    created_at: zod_1.z.string(),
    updated_at: zod_1.z.string(),
    pushed_at: zod_1.z.string(),
});
exports.GitHubContentFile = zod_1.z.object({
    path: zod_1.z.string(),
    name: zod_1.z.string(),
    sha: zod_1.z.string(),
    size: zod_1.z.number(),
    type: zod_1.z.enum(['file', 'dir']),
    download_url: zod_1.z.string().nullable(),
    git_url: zod_1.z.string(),
    html_url: zod_1.z.string(),
    encoding: zod_1.z.string().optional(),
    content: zod_1.z.string().optional(),
});
exports.GitHubRateLimit = zod_1.z.object({
    limit: zod_1.z.number(),
    remaining: zod_1.z.number(),
    reset: zod_1.z.number(),
    used: zod_1.z.number(),
    resource: zod_1.z.string(),
});
class PPError extends Error {
    constructor(message, code, statusCode = 500, context) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.name = 'PPError';
    }
}
exports.PPError = PPError;
class SourceError extends PPError {
    constructor(message, sourceName, context) {
        super(message, 'SOURCE_ERROR', 502, { ...context, sourceName });
        this.name = 'SourceError';
    }
}
exports.SourceError = SourceError;
class ValidationError extends PPError {
    constructor(message, field, context) {
        super(message, 'VALIDATION_ERROR', 400, { ...context, field });
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class GitHubError extends PPError {
    constructor(message, gitHubCode, statusCode = 500, context) {
        super(message, 'GITHUB_ERROR', statusCode, context);
        this.gitHubCode = gitHubCode;
        this.name = 'GitHubError';
    }
}
exports.GitHubError = GitHubError;
class GitHubRateLimitError extends GitHubError {
    constructor(message, resetTime, context) {
        super(message, 'RATE_LIMIT_EXCEEDED', 429, { ...context, resetTime });
        this.resetTime = resetTime;
        this.name = 'GitHubRateLimitError';
    }
}
exports.GitHubRateLimitError = GitHubRateLimitError;
class GitHubAuthenticationError extends GitHubError {
    constructor(message, context) {
        super(message, 'AUTHENTICATION_FAILED', 401, context);
        this.name = 'GitHubAuthenticationError';
    }
}
exports.GitHubAuthenticationError = GitHubAuthenticationError;
class GitHubConfigurationError extends GitHubError {
    constructor(message, context) {
        super(message, 'CONFIGURATION_ERROR', 400, context);
        this.name = 'GitHubConfigurationError';
    }
}
exports.GitHubConfigurationError = GitHubConfigurationError;
class GitHubAdapterError extends GitHubError {
    constructor(message, context) {
        super(message, 'ADAPTER_ERROR', 500, context);
        this.name = 'GitHubAdapterError';
    }
}
exports.GitHubAdapterError = GitHubAdapterError;
