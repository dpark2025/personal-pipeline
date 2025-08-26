import { z } from 'zod';
export const ConfidenceScore = z.number().min(0).max(1);
export const AlertSeverity = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export const SourceType = z.enum(['confluence', 'notion', 'github', 'database', 'web', 'file']);
export const DocumentCategory = z.enum(['runbook', 'api', 'guide', 'general']);
export const DecisionBranch = z.object({
    id: z.string(),
    condition: z.string(),
    description: z.string(),
    action: z.string(),
    next_step: z.string().optional(),
    confidence: ConfidenceScore,
    rollback_step: z.string().optional(),
});
export const DecisionTree = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    branches: z.array(DecisionBranch),
    default_action: z.string(),
    metadata: z.record(z.any()).optional(),
});
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
export const SearchFilters = z.object({
    source_types: z.array(SourceType).optional(),
    max_age_days: z.number().optional(),
    severity: AlertSeverity.optional(),
    categories: z.array(z.string()).optional(),
    confidence_threshold: ConfidenceScore.optional(),
    min_confidence: ConfidenceScore.optional(),
    category: DocumentCategory.optional(),
    limit: z.number().optional(),
});
export const SearchResult = z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    summary: z.string().optional(),
    source: z.string().optional(),
    source_name: z.string().optional(),
    source_type: SourceType,
    category: DocumentCategory.optional(),
    confidence_score: ConfidenceScore,
    match_reasons: z.array(z.string()),
    retrieval_time_ms: z.number(),
    url: z.string().optional(),
    last_updated: z.string(),
    metadata: z.record(z.any()).optional(),
});
export const AuthConfig = z.object({
    type: z.enum([
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
    token_env: z.string().optional(),
    username_env: z.string().optional(),
    password_env: z.string().optional(),
    api_key_env: z.string().optional(),
    oauth_config: z.record(z.string()).optional(),
    credentials: z.record(z.string()).optional(),
});
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
    categories: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
});
export const HealthCheck = z.object({
    source_name: z.string(),
    healthy: z.boolean(),
    response_time_ms: z.number(),
    last_check: z.string(),
    error_message: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});
export const BaseResponse = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    retrieval_time_ms: z.number(),
    timestamp: z.string(),
});
export const RunbookSearchResponse = BaseResponse.extend({
    runbooks: z.array(Runbook),
    total_results: z.number(),
    confidence_scores: z.array(ConfidenceScore),
});
export const DecisionTreeResponse = BaseResponse.extend({
    decision_tree: DecisionTree,
    confidence_score: ConfidenceScore,
    context_applied: z.boolean(),
});
export const ProcedureResponse = BaseResponse.extend({
    procedure: ProcedureStep,
    related_steps: z.array(ProcedureStep).optional(),
    confidence_score: ConfidenceScore,
});
export const EscalationResponse = BaseResponse.extend({
    escalation_contacts: z.array(z.object({
        name: z.string(),
        role: z.string(),
        contact: z.string(),
        availability: z.string(),
    })),
    escalation_procedure: z.string(),
    estimated_response_time: z.string(),
});
export const CacheConfig = z.object({
    enabled: z.boolean().default(true),
    strategy: z.enum(['memory_only', 'redis_only', 'hybrid']).default('memory_only'),
    memory: z.object({
        max_keys: z.number().default(1000),
        ttl_seconds: z.number().default(3600),
        check_period_seconds: z.number().default(600),
    }),
    redis: z.object({
        enabled: z.boolean().default(false),
        url: z.string().default('redis://localhost:6379'),
        ttl_seconds: z.number().default(7200),
        key_prefix: z.string().default('pp:cache:'),
        connection_timeout_ms: z.number().default(5000),
        retry_attempts: z.number().default(3),
        retry_delay_ms: z.number().default(1000),
        max_retry_delay_ms: z.number().default(30000),
        backoff_multiplier: z.number().default(2),
        connection_retry_limit: z.number().default(5),
    }),
    content_types: z.object({
        runbooks: z.object({
            ttl_seconds: z.number().default(3600),
            warmup: z.boolean().default(true),
        }),
        procedures: z.object({
            ttl_seconds: z.number().default(1800),
            warmup: z.boolean().default(false),
        }),
        decision_trees: z.object({
            ttl_seconds: z.number().default(2400),
            warmup: z.boolean().default(true),
        }),
        knowledge_base: z.object({
            ttl_seconds: z.number().default(900),
            warmup: z.boolean().default(false),
        }),
        web_response: z.object({
            ttl_seconds: z.number().default(1800),
            warmup: z.boolean().default(false),
        }),
    }),
});
export const CacheStats = z.object({
    hits: z.number(),
    misses: z.number(),
    hit_rate: z.number(),
    total_operations: z.number(),
    memory_usage_bytes: z.number().optional(),
    redis_connected: z.boolean().optional(),
    last_reset: z.string(),
    by_content_type: z
        .record(z.object({
        hits: z.number(),
        misses: z.number(),
        hit_rate: z.number(),
    }))
        .optional(),
});
export const CacheHealthCheck = z.object({
    memory_cache: z.object({
        healthy: z.boolean(),
        keys_count: z.number(),
        memory_usage_mb: z.number(),
        response_time_ms: z.number(),
    }),
    redis_cache: z
        .object({
        healthy: z.boolean(),
        connected: z.boolean(),
        response_time_ms: z.number(),
        error_message: z.string().optional(),
    })
        .optional(),
    overall_healthy: z.boolean(),
});
export const ServerConfig = z.object({
    port: z.number().default(3000),
    host: z.string().default('localhost'),
    log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    cache_ttl_seconds: z.number().default(3600),
    max_concurrent_requests: z.number().default(100),
    request_timeout_ms: z.number().default(30000),
    health_check_interval_ms: z.number().default(60000),
});
export const AppConfig = z.object({
    server: ServerConfig,
    sources: z.array(SourceConfig),
    cache: CacheConfig.optional(),
    embedding: z
        .object({
        enabled: z.boolean().default(true),
        model: z.string().default('sentence-transformers/all-MiniLM-L6-v2'),
        cache_size: z.number().default(1000),
    })
        .optional(),
    semantic_search: z
        .object({
        enabled: z.boolean().default(true),
        model: z.string().default('Xenova/all-MiniLM-L6-v2'),
        max_cache_size: z.number().default(10000),
        min_similarity_threshold: z.number().min(0).max(1).default(0.3),
        enhance_existing_adapters: z.boolean().default(true),
        fallback_to_fuzzy: z.boolean().default(true),
        scoring_weights: z
            .object({
            semantic: z.number().min(0).max(1).default(0.6),
            fuzzy: z.number().min(0).max(1).default(0.3),
            metadata: z.number().min(0).max(1).default(0.1),
        })
            .default({}),
        performance: z
            .object({
            batch_size: z.number().default(32),
            enable_caching: z.boolean().default(true),
            warmup_cache: z.boolean().default(true),
            max_response_time_ms: z.number().default(200),
        })
            .default({}),
    })
        .optional(),
});
export const GitHubAuthConfig = z.object({
    type: z.enum(['personal_token', 'github_app', 'oauth2']),
    token_env: z.string().optional(),
    app_id_env: z.string().optional(),
    private_key_env: z.string().optional(),
    installation_id_env: z.string().optional(),
    client_id_env: z.string().optional(),
    client_secret_env: z.string().optional(),
    redirect_uri: z.string().optional(),
    scope: z.array(z.string()).optional(),
    app_config: z
        .object({
        app_id: z.string(),
        private_key_env: z.string(),
        installation_id: z.string().optional(),
    })
        .optional(),
});
export const GitHubRepositoryFilters = z.object({
    languages: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
    min_stars: z.number().optional(),
    max_age_days: z.number().optional(),
});
export const GitHubScopeConfig = z.object({
    repositories: z.array(z.string()).optional(),
    organizations: z.array(z.string()).optional(),
    include_private: z.boolean().default(false),
    user_consent_given: z.boolean().default(false),
    repository_filters: GitHubRepositoryFilters.optional(),
});
export const GitHubContentConfig = z.object({
    readme: z.boolean().default(true),
    wiki: z.boolean().default(false),
    documentation: z.boolean().default(true),
    issues: z.boolean().default(false),
    pull_requests: z.boolean().default(false),
    code_comments: z.boolean().default(false),
});
export const GitHubPerformanceConfig = z.object({
    cache_ttl: z.string().default('4h'),
    max_file_size_kb: z.number().default(100),
    rate_limit_quota: z.number().min(1).max(100).default(10),
    min_request_interval_ms: z.number().min(1000).default(2000),
    concurrent_requests: z.number().min(1).max(10).default(1),
    max_repositories_per_scan: z.number().min(1).max(50).default(5),
});
export const GitHubWebhookConfig = z.object({
    endpoint_url: z.string().url(),
    secret_env: z.string(),
    events: z.array(z.string()).default(['push']),
});
export const GitHubConfig = SourceConfig.extend({
    type: z.literal('github'),
    auth: GitHubAuthConfig.optional(),
    api_url: z.string().optional(),
    graphql_url: z.string().optional(),
    organization: z.string().optional(),
    repositories: z.array(z.union([
        z.string(),
        z.object({
            owner: z.string(),
            name: z.string(),
        })
    ])).optional(),
    scope: GitHubScopeConfig.optional(),
    content_types: GitHubContentConfig.default({}),
    performance: GitHubPerformanceConfig.default({}),
    webhook: GitHubWebhookConfig.optional(),
});
export const FileSystemConfig = SourceConfig.extend({
    type: z.literal('file'),
    base_paths: z.array(z.string()).optional(),
    recursive: z.boolean().default(true),
    max_depth: z.number().default(10),
    file_patterns: z.object({
        include: z.array(z.string()).optional(),
        exclude: z.array(z.string()).optional(),
    }).optional(),
    supported_extensions: z.array(z.string()).optional(),
    extract_metadata: z.boolean().default(true),
    pdf_extraction: z.boolean().default(true),
    watch_changes: z.boolean().default(false),
});
export const DatabaseType = z.enum([
    'postgresql',
    'mongodb',
    'mysql',
    'mariadb',
    'sqlite',
    'mssql',
    'oracle'
]);
export const DatabaseConnectionConfig = z.object({
    type: DatabaseType,
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string(),
    username_env: z.string().optional(),
    password_env: z.string().optional(),
    connection_string_env: z.string().optional(),
    uri_env: z.string().optional(),
    ssl: z.boolean().default(false),
    ssl_cert_path: z.string().optional(),
    ssl_key_path: z.string().optional(),
    ssl_ca_path: z.string().optional(),
    pool_size: z.number().min(1).max(100).default(20),
    connection_timeout_ms: z.number().default(30000),
    idle_timeout_ms: z.number().default(300000),
    max_lifetime_ms: z.number().default(1800000),
});
export const DatabaseSchemaMapping = z.object({
    tables: z.array(z.object({
        name: z.string(),
        title_field: z.string(),
        content_field: z.string(),
        category_field: z.string().optional(),
        updated_field: z.string().optional(),
        author_field: z.string().optional(),
        tags_field: z.string().optional(),
        metadata_field: z.string().optional(),
        type: z.enum(['runbook', 'documentation', 'faq', 'procedure']).optional(),
        filters: z.record(z.any()).optional(),
    })),
    collections: z.array(z.object({
        name: z.string(),
        title_field: z.string(),
        content_field: z.string(),
        category_field: z.string().optional(),
        updated_field: z.string().optional(),
        type: z.enum(['runbook', 'documentation', 'faq', 'procedure']).optional(),
    })).optional(),
});
export const DatabaseConfig = SourceConfig.extend({
    type: z.literal('database'),
    connection: DatabaseConnectionConfig,
    schema: DatabaseSchemaMapping,
    performance: z.object({
        query_timeout_ms: z.number().default(15000),
        max_concurrent_queries: z.number().default(25),
        cache_ttl_seconds: z.number().default(3600),
        enable_query_optimization: z.boolean().default(true),
    }).optional(),
});
export const ConfluenceConfig = SourceConfig.extend({
    type: z.literal('confluence'),
    base_url: z.string(),
    space_keys: z.array(z.string()).optional(),
    auth: z.object({
        type: z.enum(['bearer_token', 'basic']),
        token_env: z.string().optional(),
        username_env: z.string().optional(),
        password_env: z.string().optional(),
    }),
    rate_limit: z.number().default(10),
    max_results: z.number().default(50),
});
export const WebConfig = SourceConfig.extend({
    type: z.literal('web'),
    sources: z.array(z.object({
        name: z.string(),
        type: z.enum(['api', 'scraping', 'rss', 'wiki', 'knowledge_base']),
        base_url: z.string(),
        endpoints: z.array(z.object({
            name: z.string(),
            path: z.string(),
            method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
            content_type: z.enum(['html', 'json', 'xml', 'text', 'rss', 'auto']).default('auto'),
            selectors: z.object({
                title: z.string().optional(),
                content: z.string().optional(),
                metadata: z.string().optional(),
                links: z.string().optional(),
                date: z.string().optional(),
                author: z.string().optional(),
                exclude: z.array(z.string()).optional(),
            }).optional(),
            json_paths: z.array(z.string()).optional(),
            xml_xpaths: z.array(z.string()).optional(),
            headers: z.record(z.string()).optional(),
            query_params: z.record(z.string()).optional(),
            body_template: z.string().optional(),
            rate_limit: z.number().optional(),
            timeout_ms: z.number().optional(),
            retry_attempts: z.number().optional(),
            cache_ttl: z.string().optional(),
            filters: z.object({
                include_patterns: z.array(z.string()).optional(),
                exclude_patterns: z.array(z.string()).optional(),
                min_content_length: z.number().optional(),
                max_content_length: z.number().optional(),
                required_elements: z.array(z.string()).optional(),
            }).optional(),
            pagination: z.object({
                type: z.enum(['offset', 'cursor', 'page_number']),
                page_param: z.string(),
                size_param: z.string().optional(),
                max_pages: z.number().optional(),
                next_link_selector: z.string().optional(),
            }).optional(),
        })),
        auth_override: z.object({
            type: z.enum(['api_key', 'bearer_token', 'basic_auth', 'oauth2']),
            api_key: z.object({
                location: z.enum(['header', 'query', 'body']),
                name: z.string(),
                env_var: z.string(),
                prefix: z.string().optional(),
            }).optional(),
            bearer_token: z.object({
                env_var: z.string(),
                refresh_endpoint: z.string().optional(),
                refresh_interval_minutes: z.number().optional(),
            }).optional(),
            basic_auth: z.object({
                username_env: z.string(),
                password_env: z.string(),
            }).optional(),
            oauth2: z.object({
                client_id_env: z.string(),
                client_secret_env: z.string(),
                token_endpoint: z.string(),
                scope: z.string().optional(),
                grant_type: z.enum(['client_credentials', 'authorization_code']),
            }).optional(),
        }).optional(),
        performance_override: z.object({
            default_timeout_ms: z.number().optional(),
            max_concurrent_requests: z.number().optional(),
            default_retry_attempts: z.number().optional(),
            default_cache_ttl: z.string().optional(),
            user_agent: z.string().optional(),
        }).optional(),
        content_override: z.object({
            max_content_size_mb: z.number().optional(),
            follow_redirects: z.boolean().optional(),
            validate_ssl: z.boolean().optional(),
            extract_links: z.boolean().optional(),
            respect_robots: z.boolean().optional(),
        }).optional(),
        health_check: z.object({
            enabled: z.boolean(),
            endpoint: z.string().optional(),
            interval_minutes: z.number(),
            timeout_ms: z.number(),
        }),
    })),
    auth: z.object({
        type: z.enum(['api_key', 'bearer_token', 'basic_auth', 'oauth2']),
        api_key: z.object({
            location: z.enum(['header', 'query', 'body']),
            name: z.string(),
            env_var: z.string(),
            prefix: z.string().optional(),
        }).optional(),
        bearer_token: z.object({
            env_var: z.string(),
            refresh_endpoint: z.string().optional(),
            refresh_interval_minutes: z.number().optional(),
        }).optional(),
        basic_auth: z.object({
            username_env: z.string(),
            password_env: z.string(),
        }).optional(),
        oauth2: z.object({
            client_id_env: z.string(),
            client_secret_env: z.string(),
            token_endpoint: z.string(),
            scope: z.string().optional(),
            grant_type: z.enum(['client_credentials', 'authorization_code']),
        }).optional(),
    }),
    performance: z.object({
        default_timeout_ms: z.number().default(30000),
        max_concurrent_requests: z.number().default(10),
        default_retry_attempts: z.number().default(3),
        default_cache_ttl: z.string().default('5m'),
        user_agent: z.string().default('PersonalPipeline-WebAdapter/1.0'),
    }),
    content_processing: z.object({
        max_content_size_mb: z.number().default(10),
        follow_redirects: z.boolean().default(true),
        validate_ssl: z.boolean().default(true),
        extract_links: z.boolean().default(false),
        respect_robots: z.boolean().default(true),
    }),
    rate_limiting: z.object({
        global_requests_per_minute: z.number().default(300),
        per_source_requests_per_minute: z.number().default(60),
        burst_allowance: z.number().default(20),
    }),
});
export const GitHubRepositoryMetadata = z.object({
    owner: z.string(),
    repo: z.string(),
    full_name: z.string(),
    default_branch: z.string(),
    description: z.string().nullable(),
    language: z.string().nullable(),
    topics: z.array(z.string()),
    stars: z.number(),
    forks: z.number(),
    is_private: z.boolean(),
    is_fork: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    pushed_at: z.string(),
});
export const GitHubContentFile = z.object({
    path: z.string(),
    name: z.string(),
    sha: z.string(),
    size: z.number(),
    type: z.enum(['file', 'dir']),
    download_url: z.string().nullable(),
    git_url: z.string(),
    html_url: z.string(),
    encoding: z.string().optional(),
    content: z.string().optional(),
});
export const GitHubRateLimit = z.object({
    limit: z.number(),
    remaining: z.number(),
    reset: z.number(),
    used: z.number(),
    resource: z.string(),
});
export class PPError extends Error {
    code;
    statusCode;
    context;
    constructor(message, code, statusCode = 500, context) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.name = 'PPError';
    }
}
export class SourceError extends PPError {
    constructor(message, sourceName, context) {
        super(message, 'SOURCE_ERROR', 502, { ...context, sourceName });
        this.name = 'SourceError';
    }
}
export class ValidationError extends PPError {
    constructor(message, field, context) {
        super(message, 'VALIDATION_ERROR', 400, { ...context, field });
        this.name = 'ValidationError';
    }
}
export class GitHubError extends PPError {
    gitHubCode;
    constructor(message, gitHubCode, statusCode = 500, context) {
        super(message, 'GITHUB_ERROR', statusCode, context);
        this.gitHubCode = gitHubCode;
        this.name = 'GitHubError';
    }
}
export class GitHubRateLimitError extends GitHubError {
    resetTime;
    constructor(message, resetTime, context) {
        super(message, 'RATE_LIMIT_EXCEEDED', 429, { ...context, resetTime });
        this.resetTime = resetTime;
        this.name = 'GitHubRateLimitError';
    }
}
export class GitHubAuthenticationError extends GitHubError {
    constructor(message, context) {
        super(message, 'AUTHENTICATION_FAILED', 401, context);
        this.name = 'GitHubAuthenticationError';
    }
}
export class GitHubConfigurationError extends GitHubError {
    constructor(message, context) {
        super(message, 'CONFIGURATION_ERROR', 400, context);
        this.name = 'GitHubConfigurationError';
    }
}
export class GitHubAdapterError extends GitHubError {
    constructor(message, context) {
        super(message, 'ADAPTER_ERROR', 500, context);
        this.name = 'GitHubAdapterError';
    }
}
//# sourceMappingURL=index.js.map