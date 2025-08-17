import { z } from 'zod';
export declare const ConfidenceScore: z.ZodNumber;
export type ConfidenceScore = z.infer<typeof ConfidenceScore>;
export declare const AlertSeverity: z.ZodEnum<["critical", "high", "medium", "low", "info"]>;
export type AlertSeverity = z.infer<typeof AlertSeverity>;
export declare const SourceType: z.ZodEnum<["confluence", "notion", "github", "database", "web", "file"]>;
export type SourceType = z.infer<typeof SourceType>;
export declare const DocumentCategory: z.ZodEnum<["runbook", "api", "guide", "general"]>;
export type DocumentCategory = z.infer<typeof DocumentCategory>;
export declare const DecisionBranch: z.ZodObject<{
    id: z.ZodString;
    condition: z.ZodString;
    description: z.ZodString;
    action: z.ZodString;
    next_step: z.ZodOptional<z.ZodString>;
    confidence: z.ZodNumber;
    rollback_step: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    condition: string;
    description: string;
    action: string;
    confidence: number;
    next_step?: string | undefined;
    rollback_step?: string | undefined;
}, {
    id: string;
    condition: string;
    description: string;
    action: string;
    confidence: number;
    next_step?: string | undefined;
    rollback_step?: string | undefined;
}>;
export type DecisionBranch = z.infer<typeof DecisionBranch>;
export declare const DecisionTree: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    branches: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        condition: z.ZodString;
        description: z.ZodString;
        action: z.ZodString;
        next_step: z.ZodOptional<z.ZodString>;
        confidence: z.ZodNumber;
        rollback_step: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        condition: string;
        description: string;
        action: string;
        confidence: number;
        next_step?: string | undefined;
        rollback_step?: string | undefined;
    }, {
        id: string;
        condition: string;
        description: string;
        action: string;
        confidence: number;
        next_step?: string | undefined;
        rollback_step?: string | undefined;
    }>, "many">;
    default_action: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    name: string;
    branches: {
        id: string;
        condition: string;
        description: string;
        action: string;
        confidence: number;
        next_step?: string | undefined;
        rollback_step?: string | undefined;
    }[];
    default_action: string;
    metadata?: Record<string, any> | undefined;
}, {
    id: string;
    description: string;
    name: string;
    branches: {
        id: string;
        condition: string;
        description: string;
        action: string;
        confidence: number;
        next_step?: string | undefined;
        rollback_step?: string | undefined;
    }[];
    default_action: string;
    metadata?: Record<string, any> | undefined;
}>;
export type DecisionTree = z.infer<typeof DecisionTree>;
export declare const ProcedureStep: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    command: z.ZodOptional<z.ZodString>;
    expected_outcome: z.ZodString;
    timeout_seconds: z.ZodOptional<z.ZodNumber>;
    prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    rollback_procedure: z.ZodOptional<z.ZodString>;
    tools_required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    name: string;
    expected_outcome: string;
    command?: string | undefined;
    timeout_seconds?: number | undefined;
    prerequisites?: string[] | undefined;
    rollback_procedure?: string | undefined;
    tools_required?: string[] | undefined;
}, {
    id: string;
    description: string;
    name: string;
    expected_outcome: string;
    command?: string | undefined;
    timeout_seconds?: number | undefined;
    prerequisites?: string[] | undefined;
    rollback_procedure?: string | undefined;
    tools_required?: string[] | undefined;
}>;
export type ProcedureStep = z.infer<typeof ProcedureStep>;
export declare const Runbook: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    version: z.ZodString;
    description: z.ZodString;
    triggers: z.ZodArray<z.ZodString, "many">;
    severity_mapping: z.ZodRecord<z.ZodString, z.ZodEnum<["critical", "high", "medium", "low", "info"]>>;
    decision_tree: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        branches: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            condition: z.ZodString;
            description: z.ZodString;
            action: z.ZodString;
            next_step: z.ZodOptional<z.ZodString>;
            confidence: z.ZodNumber;
            rollback_step: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }, {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }>, "many">;
        default_action: z.ZodString;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        branches: {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }[];
        default_action: string;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        branches: {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }[];
        default_action: string;
        metadata?: Record<string, any> | undefined;
    }>;
    procedures: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        command: z.ZodOptional<z.ZodString>;
        expected_outcome: z.ZodString;
        timeout_seconds: z.ZodOptional<z.ZodNumber>;
        prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        rollback_procedure: z.ZodOptional<z.ZodString>;
        tools_required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }>, "many">;
    escalation_path: z.ZodOptional<z.ZodString>;
    metadata: z.ZodObject<{
        created_at: z.ZodString;
        updated_at: z.ZodString;
        author: z.ZodString;
        confidence_score: z.ZodNumber;
        success_rate: z.ZodOptional<z.ZodNumber>;
        avg_resolution_time_minutes: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        created_at: string;
        updated_at: string;
        author: string;
        confidence_score: number;
        success_rate?: number | undefined;
        avg_resolution_time_minutes?: number | undefined;
    }, {
        created_at: string;
        updated_at: string;
        author: string;
        confidence_score: number;
        success_rate?: number | undefined;
        avg_resolution_time_minutes?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    metadata: {
        created_at: string;
        updated_at: string;
        author: string;
        confidence_score: number;
        success_rate?: number | undefined;
        avg_resolution_time_minutes?: number | undefined;
    };
    title: string;
    version: string;
    triggers: string[];
    severity_mapping: Record<string, "critical" | "high" | "medium" | "low" | "info">;
    decision_tree: {
        id: string;
        description: string;
        name: string;
        branches: {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }[];
        default_action: string;
        metadata?: Record<string, any> | undefined;
    };
    procedures: {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }[];
    escalation_path?: string | undefined;
}, {
    id: string;
    description: string;
    metadata: {
        created_at: string;
        updated_at: string;
        author: string;
        confidence_score: number;
        success_rate?: number | undefined;
        avg_resolution_time_minutes?: number | undefined;
    };
    title: string;
    version: string;
    triggers: string[];
    severity_mapping: Record<string, "critical" | "high" | "medium" | "low" | "info">;
    decision_tree: {
        id: string;
        description: string;
        name: string;
        branches: {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }[];
        default_action: string;
        metadata?: Record<string, any> | undefined;
    };
    procedures: {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }[];
    escalation_path?: string | undefined;
}>;
export type Runbook = z.infer<typeof Runbook>;
export declare const SearchFilters: z.ZodObject<{
    source_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["confluence", "notion", "github", "database", "web", "file"]>, "many">>;
    max_age_days: z.ZodOptional<z.ZodNumber>;
    severity: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low", "info"]>>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    confidence_threshold: z.ZodOptional<z.ZodNumber>;
    min_confidence: z.ZodOptional<z.ZodNumber>;
    category: z.ZodOptional<z.ZodEnum<["runbook", "api", "guide", "general"]>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    source_types?: ("confluence" | "notion" | "github" | "database" | "web" | "file")[] | undefined;
    max_age_days?: number | undefined;
    severity?: "critical" | "high" | "medium" | "low" | "info" | undefined;
    categories?: string[] | undefined;
    confidence_threshold?: number | undefined;
    min_confidence?: number | undefined;
    category?: "runbook" | "api" | "guide" | "general" | undefined;
    limit?: number | undefined;
}, {
    source_types?: ("confluence" | "notion" | "github" | "database" | "web" | "file")[] | undefined;
    max_age_days?: number | undefined;
    severity?: "critical" | "high" | "medium" | "low" | "info" | undefined;
    categories?: string[] | undefined;
    confidence_threshold?: number | undefined;
    min_confidence?: number | undefined;
    category?: "runbook" | "api" | "guide" | "general" | undefined;
    limit?: number | undefined;
}>;
export type SearchFilters = z.infer<typeof SearchFilters>;
export declare const SearchResult: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    content: z.ZodString;
    source: z.ZodString;
    source_name: z.ZodOptional<z.ZodString>;
    source_type: z.ZodEnum<["confluence", "notion", "github", "database", "web", "file"]>;
    category: z.ZodOptional<z.ZodEnum<["runbook", "api", "guide", "general"]>>;
    confidence_score: z.ZodNumber;
    match_reasons: z.ZodArray<z.ZodString, "many">;
    retrieval_time_ms: z.ZodNumber;
    url: z.ZodOptional<z.ZodString>;
    last_updated: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    confidence_score: number;
    content: string;
    source: string;
    source_type: "confluence" | "notion" | "github" | "database" | "web" | "file";
    match_reasons: string[];
    retrieval_time_ms: number;
    last_updated: string;
    metadata?: Record<string, any> | undefined;
    category?: "runbook" | "api" | "guide" | "general" | undefined;
    source_name?: string | undefined;
    url?: string | undefined;
}, {
    id: string;
    title: string;
    confidence_score: number;
    content: string;
    source: string;
    source_type: "confluence" | "notion" | "github" | "database" | "web" | "file";
    match_reasons: string[];
    retrieval_time_ms: number;
    last_updated: string;
    metadata?: Record<string, any> | undefined;
    category?: "runbook" | "api" | "guide" | "general" | undefined;
    source_name?: string | undefined;
    url?: string | undefined;
}>;
export type SearchResult = z.infer<typeof SearchResult>;
export type Document = SearchResult;
export declare const AuthConfig: z.ZodObject<{
    type: z.ZodEnum<["bearer_token", "basic_auth", "api_key", "oauth2", "personal_token", "github_app", "basic", "bearer", "cookie"]>;
    token_env: z.ZodOptional<z.ZodString>;
    username_env: z.ZodOptional<z.ZodString>;
    password_env: z.ZodOptional<z.ZodString>;
    api_key_env: z.ZodOptional<z.ZodString>;
    oauth_config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    credentials: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
    token_env?: string | undefined;
    username_env?: string | undefined;
    password_env?: string | undefined;
    api_key_env?: string | undefined;
    oauth_config?: Record<string, string> | undefined;
    credentials?: Record<string, string> | undefined;
}, {
    type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
    token_env?: string | undefined;
    username_env?: string | undefined;
    password_env?: string | undefined;
    api_key_env?: string | undefined;
    oauth_config?: Record<string, string> | undefined;
    credentials?: Record<string, string> | undefined;
}>;
export type AuthConfig = z.infer<typeof AuthConfig>;
export declare const SourceConfig: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["confluence", "notion", "github", "database", "web", "file"]>;
    base_url: z.ZodOptional<z.ZodString>;
    auth: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["bearer_token", "basic_auth", "api_key", "oauth2", "personal_token", "github_app", "basic", "bearer", "cookie"]>;
        token_env: z.ZodOptional<z.ZodString>;
        username_env: z.ZodOptional<z.ZodString>;
        password_env: z.ZodOptional<z.ZodString>;
        api_key_env: z.ZodOptional<z.ZodString>;
        oauth_config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        credentials: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
        api_key_env?: string | undefined;
        oauth_config?: Record<string, string> | undefined;
        credentials?: Record<string, string> | undefined;
    }, {
        type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
        api_key_env?: string | undefined;
        oauth_config?: Record<string, string> | undefined;
        credentials?: Record<string, string> | undefined;
    }>>;
    refresh_interval: z.ZodString;
    priority: z.ZodNumber;
    enabled: z.ZodDefault<z.ZodBoolean>;
    timeout_ms: z.ZodDefault<z.ZodNumber>;
    max_retries: z.ZodDefault<z.ZodNumber>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "confluence" | "notion" | "github" | "database" | "web" | "file";
    name: string;
    refresh_interval: string;
    priority: number;
    enabled: boolean;
    timeout_ms: number;
    max_retries: number;
    metadata?: Record<string, any> | undefined;
    categories?: string[] | undefined;
    base_url?: string | undefined;
    auth?: {
        type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
        api_key_env?: string | undefined;
        oauth_config?: Record<string, string> | undefined;
        credentials?: Record<string, string> | undefined;
    } | undefined;
}, {
    type: "confluence" | "notion" | "github" | "database" | "web" | "file";
    name: string;
    refresh_interval: string;
    priority: number;
    metadata?: Record<string, any> | undefined;
    categories?: string[] | undefined;
    base_url?: string | undefined;
    auth?: {
        type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
        api_key_env?: string | undefined;
        oauth_config?: Record<string, string> | undefined;
        credentials?: Record<string, string> | undefined;
    } | undefined;
    enabled?: boolean | undefined;
    timeout_ms?: number | undefined;
    max_retries?: number | undefined;
}>;
export type SourceConfig = z.infer<typeof SourceConfig>;
export declare const HealthCheck: z.ZodObject<{
    source_name: z.ZodString;
    healthy: z.ZodBoolean;
    response_time_ms: z.ZodNumber;
    last_check: z.ZodString;
    error_message: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    source_name: string;
    healthy: boolean;
    response_time_ms: number;
    last_check: string;
    metadata?: Record<string, any> | undefined;
    error_message?: string | undefined;
}, {
    source_name: string;
    healthy: boolean;
    response_time_ms: number;
    last_check: string;
    metadata?: Record<string, any> | undefined;
    error_message?: string | undefined;
}>;
export type HealthCheck = z.infer<typeof HealthCheck>;
export declare const BaseResponse: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    retrieval_time_ms: z.ZodNumber;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    message?: string | undefined;
}, {
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    message?: string | undefined;
}>;
export type BaseResponse = z.infer<typeof BaseResponse>;
export declare const RunbookSearchResponse: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    retrieval_time_ms: z.ZodNumber;
    timestamp: z.ZodString;
} & {
    runbooks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        version: z.ZodString;
        description: z.ZodString;
        triggers: z.ZodArray<z.ZodString, "many">;
        severity_mapping: z.ZodRecord<z.ZodString, z.ZodEnum<["critical", "high", "medium", "low", "info"]>>;
        decision_tree: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            branches: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                condition: z.ZodString;
                description: z.ZodString;
                action: z.ZodString;
                next_step: z.ZodOptional<z.ZodString>;
                confidence: z.ZodNumber;
                rollback_step: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                condition: string;
                description: string;
                action: string;
                confidence: number;
                next_step?: string | undefined;
                rollback_step?: string | undefined;
            }, {
                id: string;
                condition: string;
                description: string;
                action: string;
                confidence: number;
                next_step?: string | undefined;
                rollback_step?: string | undefined;
            }>, "many">;
            default_action: z.ZodString;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            name: string;
            branches: {
                id: string;
                condition: string;
                description: string;
                action: string;
                confidence: number;
                next_step?: string | undefined;
                rollback_step?: string | undefined;
            }[];
            default_action: string;
            metadata?: Record<string, any> | undefined;
        }, {
            id: string;
            description: string;
            name: string;
            branches: {
                id: string;
                condition: string;
                description: string;
                action: string;
                confidence: number;
                next_step?: string | undefined;
                rollback_step?: string | undefined;
            }[];
            default_action: string;
            metadata?: Record<string, any> | undefined;
        }>;
        procedures: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            command: z.ZodOptional<z.ZodString>;
            expected_outcome: z.ZodString;
            timeout_seconds: z.ZodOptional<z.ZodNumber>;
            prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            rollback_procedure: z.ZodOptional<z.ZodString>;
            tools_required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            name: string;
            expected_outcome: string;
            command?: string | undefined;
            timeout_seconds?: number | undefined;
            prerequisites?: string[] | undefined;
            rollback_procedure?: string | undefined;
            tools_required?: string[] | undefined;
        }, {
            id: string;
            description: string;
            name: string;
            expected_outcome: string;
            command?: string | undefined;
            timeout_seconds?: number | undefined;
            prerequisites?: string[] | undefined;
            rollback_procedure?: string | undefined;
            tools_required?: string[] | undefined;
        }>, "many">;
        escalation_path: z.ZodOptional<z.ZodString>;
        metadata: z.ZodObject<{
            created_at: z.ZodString;
            updated_at: z.ZodString;
            author: z.ZodString;
            confidence_score: z.ZodNumber;
            success_rate: z.ZodOptional<z.ZodNumber>;
            avg_resolution_time_minutes: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            created_at: string;
            updated_at: string;
            author: string;
            confidence_score: number;
            success_rate?: number | undefined;
            avg_resolution_time_minutes?: number | undefined;
        }, {
            created_at: string;
            updated_at: string;
            author: string;
            confidence_score: number;
            success_rate?: number | undefined;
            avg_resolution_time_minutes?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        metadata: {
            created_at: string;
            updated_at: string;
            author: string;
            confidence_score: number;
            success_rate?: number | undefined;
            avg_resolution_time_minutes?: number | undefined;
        };
        title: string;
        version: string;
        triggers: string[];
        severity_mapping: Record<string, "critical" | "high" | "medium" | "low" | "info">;
        decision_tree: {
            id: string;
            description: string;
            name: string;
            branches: {
                id: string;
                condition: string;
                description: string;
                action: string;
                confidence: number;
                next_step?: string | undefined;
                rollback_step?: string | undefined;
            }[];
            default_action: string;
            metadata?: Record<string, any> | undefined;
        };
        procedures: {
            id: string;
            description: string;
            name: string;
            expected_outcome: string;
            command?: string | undefined;
            timeout_seconds?: number | undefined;
            prerequisites?: string[] | undefined;
            rollback_procedure?: string | undefined;
            tools_required?: string[] | undefined;
        }[];
        escalation_path?: string | undefined;
    }, {
        id: string;
        description: string;
        metadata: {
            created_at: string;
            updated_at: string;
            author: string;
            confidence_score: number;
            success_rate?: number | undefined;
            avg_resolution_time_minutes?: number | undefined;
        };
        title: string;
        version: string;
        triggers: string[];
        severity_mapping: Record<string, "critical" | "high" | "medium" | "low" | "info">;
        decision_tree: {
            id: string;
            description: string;
            name: string;
            branches: {
                id: string;
                condition: string;
                description: string;
                action: string;
                confidence: number;
                next_step?: string | undefined;
                rollback_step?: string | undefined;
            }[];
            default_action: string;
            metadata?: Record<string, any> | undefined;
        };
        procedures: {
            id: string;
            description: string;
            name: string;
            expected_outcome: string;
            command?: string | undefined;
            timeout_seconds?: number | undefined;
            prerequisites?: string[] | undefined;
            rollback_procedure?: string | undefined;
            tools_required?: string[] | undefined;
        }[];
        escalation_path?: string | undefined;
    }>, "many">;
    total_results: z.ZodNumber;
    confidence_scores: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    runbooks: {
        id: string;
        description: string;
        metadata: {
            created_at: string;
            updated_at: string;
            author: string;
            confidence_score: number;
            success_rate?: number | undefined;
            avg_resolution_time_minutes?: number | undefined;
        };
        title: string;
        version: string;
        triggers: string[];
        severity_mapping: Record<string, "critical" | "high" | "medium" | "low" | "info">;
        decision_tree: {
            id: string;
            description: string;
            name: string;
            branches: {
                id: string;
                condition: string;
                description: string;
                action: string;
                confidence: number;
                next_step?: string | undefined;
                rollback_step?: string | undefined;
            }[];
            default_action: string;
            metadata?: Record<string, any> | undefined;
        };
        procedures: {
            id: string;
            description: string;
            name: string;
            expected_outcome: string;
            command?: string | undefined;
            timeout_seconds?: number | undefined;
            prerequisites?: string[] | undefined;
            rollback_procedure?: string | undefined;
            tools_required?: string[] | undefined;
        }[];
        escalation_path?: string | undefined;
    }[];
    total_results: number;
    confidence_scores: number[];
    message?: string | undefined;
}, {
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    runbooks: {
        id: string;
        description: string;
        metadata: {
            created_at: string;
            updated_at: string;
            author: string;
            confidence_score: number;
            success_rate?: number | undefined;
            avg_resolution_time_minutes?: number | undefined;
        };
        title: string;
        version: string;
        triggers: string[];
        severity_mapping: Record<string, "critical" | "high" | "medium" | "low" | "info">;
        decision_tree: {
            id: string;
            description: string;
            name: string;
            branches: {
                id: string;
                condition: string;
                description: string;
                action: string;
                confidence: number;
                next_step?: string | undefined;
                rollback_step?: string | undefined;
            }[];
            default_action: string;
            metadata?: Record<string, any> | undefined;
        };
        procedures: {
            id: string;
            description: string;
            name: string;
            expected_outcome: string;
            command?: string | undefined;
            timeout_seconds?: number | undefined;
            prerequisites?: string[] | undefined;
            rollback_procedure?: string | undefined;
            tools_required?: string[] | undefined;
        }[];
        escalation_path?: string | undefined;
    }[];
    total_results: number;
    confidence_scores: number[];
    message?: string | undefined;
}>;
export type RunbookSearchResponse = z.infer<typeof RunbookSearchResponse>;
export declare const DecisionTreeResponse: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    retrieval_time_ms: z.ZodNumber;
    timestamp: z.ZodString;
} & {
    decision_tree: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        branches: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            condition: z.ZodString;
            description: z.ZodString;
            action: z.ZodString;
            next_step: z.ZodOptional<z.ZodString>;
            confidence: z.ZodNumber;
            rollback_step: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }, {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }>, "many">;
        default_action: z.ZodString;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        branches: {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }[];
        default_action: string;
        metadata?: Record<string, any> | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        branches: {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }[];
        default_action: string;
        metadata?: Record<string, any> | undefined;
    }>;
    confidence_score: z.ZodNumber;
    context_applied: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    decision_tree: {
        id: string;
        description: string;
        name: string;
        branches: {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }[];
        default_action: string;
        metadata?: Record<string, any> | undefined;
    };
    confidence_score: number;
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    context_applied: boolean;
    message?: string | undefined;
}, {
    decision_tree: {
        id: string;
        description: string;
        name: string;
        branches: {
            id: string;
            condition: string;
            description: string;
            action: string;
            confidence: number;
            next_step?: string | undefined;
            rollback_step?: string | undefined;
        }[];
        default_action: string;
        metadata?: Record<string, any> | undefined;
    };
    confidence_score: number;
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    context_applied: boolean;
    message?: string | undefined;
}>;
export type DecisionTreeResponse = z.infer<typeof DecisionTreeResponse>;
export declare const ProcedureResponse: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    retrieval_time_ms: z.ZodNumber;
    timestamp: z.ZodString;
} & {
    procedure: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        command: z.ZodOptional<z.ZodString>;
        expected_outcome: z.ZodString;
        timeout_seconds: z.ZodOptional<z.ZodNumber>;
        prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        rollback_procedure: z.ZodOptional<z.ZodString>;
        tools_required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }>;
    related_steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        command: z.ZodOptional<z.ZodString>;
        expected_outcome: z.ZodString;
        timeout_seconds: z.ZodOptional<z.ZodNumber>;
        prerequisites: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        rollback_procedure: z.ZodOptional<z.ZodString>;
        tools_required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }>, "many">>;
    confidence_score: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    confidence_score: number;
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    procedure: {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    };
    message?: string | undefined;
    related_steps?: {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }[] | undefined;
}, {
    confidence_score: number;
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    procedure: {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    };
    message?: string | undefined;
    related_steps?: {
        id: string;
        description: string;
        name: string;
        expected_outcome: string;
        command?: string | undefined;
        timeout_seconds?: number | undefined;
        prerequisites?: string[] | undefined;
        rollback_procedure?: string | undefined;
        tools_required?: string[] | undefined;
    }[] | undefined;
}>;
export type ProcedureResponse = z.infer<typeof ProcedureResponse>;
export declare const EscalationResponse: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodOptional<z.ZodString>;
    retrieval_time_ms: z.ZodNumber;
    timestamp: z.ZodString;
} & {
    escalation_contacts: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        role: z.ZodString;
        contact: z.ZodString;
        availability: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        role: string;
        contact: string;
        availability: string;
    }, {
        name: string;
        role: string;
        contact: string;
        availability: string;
    }>, "many">;
    escalation_procedure: z.ZodString;
    estimated_response_time: z.ZodString;
}, "strip", z.ZodTypeAny, {
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    escalation_contacts: {
        name: string;
        role: string;
        contact: string;
        availability: string;
    }[];
    escalation_procedure: string;
    estimated_response_time: string;
    message?: string | undefined;
}, {
    retrieval_time_ms: number;
    success: boolean;
    timestamp: string;
    escalation_contacts: {
        name: string;
        role: string;
        contact: string;
        availability: string;
    }[];
    escalation_procedure: string;
    estimated_response_time: string;
    message?: string | undefined;
}>;
export type EscalationResponse = z.infer<typeof EscalationResponse>;
export declare const CacheConfig: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    strategy: z.ZodDefault<z.ZodEnum<["memory_only", "redis_only", "hybrid"]>>;
    memory: z.ZodObject<{
        max_keys: z.ZodDefault<z.ZodNumber>;
        ttl_seconds: z.ZodDefault<z.ZodNumber>;
        check_period_seconds: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        max_keys: number;
        ttl_seconds: number;
        check_period_seconds: number;
    }, {
        max_keys?: number | undefined;
        ttl_seconds?: number | undefined;
        check_period_seconds?: number | undefined;
    }>;
    redis: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        url: z.ZodDefault<z.ZodString>;
        ttl_seconds: z.ZodDefault<z.ZodNumber>;
        key_prefix: z.ZodDefault<z.ZodString>;
        connection_timeout_ms: z.ZodDefault<z.ZodNumber>;
        retry_attempts: z.ZodDefault<z.ZodNumber>;
        retry_delay_ms: z.ZodDefault<z.ZodNumber>;
        max_retry_delay_ms: z.ZodDefault<z.ZodNumber>;
        backoff_multiplier: z.ZodDefault<z.ZodNumber>;
        connection_retry_limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        enabled: boolean;
        ttl_seconds: number;
        key_prefix: string;
        connection_timeout_ms: number;
        retry_attempts: number;
        retry_delay_ms: number;
        max_retry_delay_ms: number;
        backoff_multiplier: number;
        connection_retry_limit: number;
    }, {
        url?: string | undefined;
        enabled?: boolean | undefined;
        ttl_seconds?: number | undefined;
        key_prefix?: string | undefined;
        connection_timeout_ms?: number | undefined;
        retry_attempts?: number | undefined;
        retry_delay_ms?: number | undefined;
        max_retry_delay_ms?: number | undefined;
        backoff_multiplier?: number | undefined;
        connection_retry_limit?: number | undefined;
    }>;
    content_types: z.ZodObject<{
        runbooks: z.ZodObject<{
            ttl_seconds: z.ZodDefault<z.ZodNumber>;
            warmup: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            ttl_seconds: number;
            warmup: boolean;
        }, {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        }>;
        procedures: z.ZodObject<{
            ttl_seconds: z.ZodDefault<z.ZodNumber>;
            warmup: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            ttl_seconds: number;
            warmup: boolean;
        }, {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        }>;
        decision_trees: z.ZodObject<{
            ttl_seconds: z.ZodDefault<z.ZodNumber>;
            warmup: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            ttl_seconds: number;
            warmup: boolean;
        }, {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        }>;
        knowledge_base: z.ZodObject<{
            ttl_seconds: z.ZodDefault<z.ZodNumber>;
            warmup: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            ttl_seconds: number;
            warmup: boolean;
        }, {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        procedures: {
            ttl_seconds: number;
            warmup: boolean;
        };
        runbooks: {
            ttl_seconds: number;
            warmup: boolean;
        };
        decision_trees: {
            ttl_seconds: number;
            warmup: boolean;
        };
        knowledge_base: {
            ttl_seconds: number;
            warmup: boolean;
        };
    }, {
        procedures: {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        };
        runbooks: {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        };
        decision_trees: {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        };
        knowledge_base: {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    strategy: "memory_only" | "redis_only" | "hybrid";
    memory: {
        max_keys: number;
        ttl_seconds: number;
        check_period_seconds: number;
    };
    redis: {
        url: string;
        enabled: boolean;
        ttl_seconds: number;
        key_prefix: string;
        connection_timeout_ms: number;
        retry_attempts: number;
        retry_delay_ms: number;
        max_retry_delay_ms: number;
        backoff_multiplier: number;
        connection_retry_limit: number;
    };
    content_types: {
        procedures: {
            ttl_seconds: number;
            warmup: boolean;
        };
        runbooks: {
            ttl_seconds: number;
            warmup: boolean;
        };
        decision_trees: {
            ttl_seconds: number;
            warmup: boolean;
        };
        knowledge_base: {
            ttl_seconds: number;
            warmup: boolean;
        };
    };
}, {
    memory: {
        max_keys?: number | undefined;
        ttl_seconds?: number | undefined;
        check_period_seconds?: number | undefined;
    };
    redis: {
        url?: string | undefined;
        enabled?: boolean | undefined;
        ttl_seconds?: number | undefined;
        key_prefix?: string | undefined;
        connection_timeout_ms?: number | undefined;
        retry_attempts?: number | undefined;
        retry_delay_ms?: number | undefined;
        max_retry_delay_ms?: number | undefined;
        backoff_multiplier?: number | undefined;
        connection_retry_limit?: number | undefined;
    };
    content_types: {
        procedures: {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        };
        runbooks: {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        };
        decision_trees: {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        };
        knowledge_base: {
            ttl_seconds?: number | undefined;
            warmup?: boolean | undefined;
        };
    };
    enabled?: boolean | undefined;
    strategy?: "memory_only" | "redis_only" | "hybrid" | undefined;
}>;
export type CacheConfig = z.infer<typeof CacheConfig>;
export declare const CacheStats: z.ZodObject<{
    hits: z.ZodNumber;
    misses: z.ZodNumber;
    hit_rate: z.ZodNumber;
    total_operations: z.ZodNumber;
    memory_usage_bytes: z.ZodOptional<z.ZodNumber>;
    redis_connected: z.ZodOptional<z.ZodBoolean>;
    last_reset: z.ZodString;
    by_content_type: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        hits: z.ZodNumber;
        misses: z.ZodNumber;
        hit_rate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        hits: number;
        misses: number;
        hit_rate: number;
    }, {
        hits: number;
        misses: number;
        hit_rate: number;
    }>>>;
}, "strip", z.ZodTypeAny, {
    hits: number;
    misses: number;
    hit_rate: number;
    total_operations: number;
    last_reset: string;
    memory_usage_bytes?: number | undefined;
    redis_connected?: boolean | undefined;
    by_content_type?: Record<string, {
        hits: number;
        misses: number;
        hit_rate: number;
    }> | undefined;
}, {
    hits: number;
    misses: number;
    hit_rate: number;
    total_operations: number;
    last_reset: string;
    memory_usage_bytes?: number | undefined;
    redis_connected?: boolean | undefined;
    by_content_type?: Record<string, {
        hits: number;
        misses: number;
        hit_rate: number;
    }> | undefined;
}>;
export type CacheStats = z.infer<typeof CacheStats>;
export declare const CacheHealthCheck: z.ZodObject<{
    memory_cache: z.ZodObject<{
        healthy: z.ZodBoolean;
        keys_count: z.ZodNumber;
        memory_usage_mb: z.ZodNumber;
        response_time_ms: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        healthy: boolean;
        response_time_ms: number;
        keys_count: number;
        memory_usage_mb: number;
    }, {
        healthy: boolean;
        response_time_ms: number;
        keys_count: number;
        memory_usage_mb: number;
    }>;
    redis_cache: z.ZodOptional<z.ZodObject<{
        healthy: z.ZodBoolean;
        connected: z.ZodBoolean;
        response_time_ms: z.ZodNumber;
        error_message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        healthy: boolean;
        response_time_ms: number;
        connected: boolean;
        error_message?: string | undefined;
    }, {
        healthy: boolean;
        response_time_ms: number;
        connected: boolean;
        error_message?: string | undefined;
    }>>;
    overall_healthy: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    memory_cache: {
        healthy: boolean;
        response_time_ms: number;
        keys_count: number;
        memory_usage_mb: number;
    };
    overall_healthy: boolean;
    redis_cache?: {
        healthy: boolean;
        response_time_ms: number;
        connected: boolean;
        error_message?: string | undefined;
    } | undefined;
}, {
    memory_cache: {
        healthy: boolean;
        response_time_ms: number;
        keys_count: number;
        memory_usage_mb: number;
    };
    overall_healthy: boolean;
    redis_cache?: {
        healthy: boolean;
        response_time_ms: number;
        connected: boolean;
        error_message?: string | undefined;
    } | undefined;
}>;
export type CacheHealthCheck = z.infer<typeof CacheHealthCheck>;
export declare const ServerConfig: z.ZodObject<{
    port: z.ZodDefault<z.ZodNumber>;
    host: z.ZodDefault<z.ZodString>;
    log_level: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    cache_ttl_seconds: z.ZodDefault<z.ZodNumber>;
    max_concurrent_requests: z.ZodDefault<z.ZodNumber>;
    request_timeout_ms: z.ZodDefault<z.ZodNumber>;
    health_check_interval_ms: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    port: number;
    host: string;
    log_level: "info" | "debug" | "warn" | "error";
    cache_ttl_seconds: number;
    max_concurrent_requests: number;
    request_timeout_ms: number;
    health_check_interval_ms: number;
}, {
    port?: number | undefined;
    host?: string | undefined;
    log_level?: "info" | "debug" | "warn" | "error" | undefined;
    cache_ttl_seconds?: number | undefined;
    max_concurrent_requests?: number | undefined;
    request_timeout_ms?: number | undefined;
    health_check_interval_ms?: number | undefined;
}>;
export type ServerConfig = z.infer<typeof ServerConfig>;
export declare const AppConfig: z.ZodObject<{
    server: z.ZodObject<{
        port: z.ZodDefault<z.ZodNumber>;
        host: z.ZodDefault<z.ZodString>;
        log_level: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        cache_ttl_seconds: z.ZodDefault<z.ZodNumber>;
        max_concurrent_requests: z.ZodDefault<z.ZodNumber>;
        request_timeout_ms: z.ZodDefault<z.ZodNumber>;
        health_check_interval_ms: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        port: number;
        host: string;
        log_level: "info" | "debug" | "warn" | "error";
        cache_ttl_seconds: number;
        max_concurrent_requests: number;
        request_timeout_ms: number;
        health_check_interval_ms: number;
    }, {
        port?: number | undefined;
        host?: string | undefined;
        log_level?: "info" | "debug" | "warn" | "error" | undefined;
        cache_ttl_seconds?: number | undefined;
        max_concurrent_requests?: number | undefined;
        request_timeout_ms?: number | undefined;
        health_check_interval_ms?: number | undefined;
    }>;
    sources: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodEnum<["confluence", "notion", "github", "database", "web", "file"]>;
        base_url: z.ZodOptional<z.ZodString>;
        auth: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<["bearer_token", "basic_auth", "api_key", "oauth2", "personal_token", "github_app", "basic", "bearer", "cookie"]>;
            token_env: z.ZodOptional<z.ZodString>;
            username_env: z.ZodOptional<z.ZodString>;
            password_env: z.ZodOptional<z.ZodString>;
            api_key_env: z.ZodOptional<z.ZodString>;
            oauth_config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
            credentials: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
            token_env?: string | undefined;
            username_env?: string | undefined;
            password_env?: string | undefined;
            api_key_env?: string | undefined;
            oauth_config?: Record<string, string> | undefined;
            credentials?: Record<string, string> | undefined;
        }, {
            type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
            token_env?: string | undefined;
            username_env?: string | undefined;
            password_env?: string | undefined;
            api_key_env?: string | undefined;
            oauth_config?: Record<string, string> | undefined;
            credentials?: Record<string, string> | undefined;
        }>>;
        refresh_interval: z.ZodString;
        priority: z.ZodNumber;
        enabled: z.ZodDefault<z.ZodBoolean>;
        timeout_ms: z.ZodDefault<z.ZodNumber>;
        max_retries: z.ZodDefault<z.ZodNumber>;
        categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "confluence" | "notion" | "github" | "database" | "web" | "file";
        name: string;
        refresh_interval: string;
        priority: number;
        enabled: boolean;
        timeout_ms: number;
        max_retries: number;
        metadata?: Record<string, any> | undefined;
        categories?: string[] | undefined;
        base_url?: string | undefined;
        auth?: {
            type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
            token_env?: string | undefined;
            username_env?: string | undefined;
            password_env?: string | undefined;
            api_key_env?: string | undefined;
            oauth_config?: Record<string, string> | undefined;
            credentials?: Record<string, string> | undefined;
        } | undefined;
    }, {
        type: "confluence" | "notion" | "github" | "database" | "web" | "file";
        name: string;
        refresh_interval: string;
        priority: number;
        metadata?: Record<string, any> | undefined;
        categories?: string[] | undefined;
        base_url?: string | undefined;
        auth?: {
            type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
            token_env?: string | undefined;
            username_env?: string | undefined;
            password_env?: string | undefined;
            api_key_env?: string | undefined;
            oauth_config?: Record<string, string> | undefined;
            credentials?: Record<string, string> | undefined;
        } | undefined;
        enabled?: boolean | undefined;
        timeout_ms?: number | undefined;
        max_retries?: number | undefined;
    }>, "many">;
    cache: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        strategy: z.ZodDefault<z.ZodEnum<["memory_only", "redis_only", "hybrid"]>>;
        memory: z.ZodObject<{
            max_keys: z.ZodDefault<z.ZodNumber>;
            ttl_seconds: z.ZodDefault<z.ZodNumber>;
            check_period_seconds: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            max_keys: number;
            ttl_seconds: number;
            check_period_seconds: number;
        }, {
            max_keys?: number | undefined;
            ttl_seconds?: number | undefined;
            check_period_seconds?: number | undefined;
        }>;
        redis: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            url: z.ZodDefault<z.ZodString>;
            ttl_seconds: z.ZodDefault<z.ZodNumber>;
            key_prefix: z.ZodDefault<z.ZodString>;
            connection_timeout_ms: z.ZodDefault<z.ZodNumber>;
            retry_attempts: z.ZodDefault<z.ZodNumber>;
            retry_delay_ms: z.ZodDefault<z.ZodNumber>;
            max_retry_delay_ms: z.ZodDefault<z.ZodNumber>;
            backoff_multiplier: z.ZodDefault<z.ZodNumber>;
            connection_retry_limit: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            enabled: boolean;
            ttl_seconds: number;
            key_prefix: string;
            connection_timeout_ms: number;
            retry_attempts: number;
            retry_delay_ms: number;
            max_retry_delay_ms: number;
            backoff_multiplier: number;
            connection_retry_limit: number;
        }, {
            url?: string | undefined;
            enabled?: boolean | undefined;
            ttl_seconds?: number | undefined;
            key_prefix?: string | undefined;
            connection_timeout_ms?: number | undefined;
            retry_attempts?: number | undefined;
            retry_delay_ms?: number | undefined;
            max_retry_delay_ms?: number | undefined;
            backoff_multiplier?: number | undefined;
            connection_retry_limit?: number | undefined;
        }>;
        content_types: z.ZodObject<{
            runbooks: z.ZodObject<{
                ttl_seconds: z.ZodDefault<z.ZodNumber>;
                warmup: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                ttl_seconds: number;
                warmup: boolean;
            }, {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            }>;
            procedures: z.ZodObject<{
                ttl_seconds: z.ZodDefault<z.ZodNumber>;
                warmup: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                ttl_seconds: number;
                warmup: boolean;
            }, {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            }>;
            decision_trees: z.ZodObject<{
                ttl_seconds: z.ZodDefault<z.ZodNumber>;
                warmup: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                ttl_seconds: number;
                warmup: boolean;
            }, {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            }>;
            knowledge_base: z.ZodObject<{
                ttl_seconds: z.ZodDefault<z.ZodNumber>;
                warmup: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                ttl_seconds: number;
                warmup: boolean;
            }, {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            procedures: {
                ttl_seconds: number;
                warmup: boolean;
            };
            runbooks: {
                ttl_seconds: number;
                warmup: boolean;
            };
            decision_trees: {
                ttl_seconds: number;
                warmup: boolean;
            };
            knowledge_base: {
                ttl_seconds: number;
                warmup: boolean;
            };
        }, {
            procedures: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
            runbooks: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
            decision_trees: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
            knowledge_base: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        strategy: "memory_only" | "redis_only" | "hybrid";
        memory: {
            max_keys: number;
            ttl_seconds: number;
            check_period_seconds: number;
        };
        redis: {
            url: string;
            enabled: boolean;
            ttl_seconds: number;
            key_prefix: string;
            connection_timeout_ms: number;
            retry_attempts: number;
            retry_delay_ms: number;
            max_retry_delay_ms: number;
            backoff_multiplier: number;
            connection_retry_limit: number;
        };
        content_types: {
            procedures: {
                ttl_seconds: number;
                warmup: boolean;
            };
            runbooks: {
                ttl_seconds: number;
                warmup: boolean;
            };
            decision_trees: {
                ttl_seconds: number;
                warmup: boolean;
            };
            knowledge_base: {
                ttl_seconds: number;
                warmup: boolean;
            };
        };
    }, {
        memory: {
            max_keys?: number | undefined;
            ttl_seconds?: number | undefined;
            check_period_seconds?: number | undefined;
        };
        redis: {
            url?: string | undefined;
            enabled?: boolean | undefined;
            ttl_seconds?: number | undefined;
            key_prefix?: string | undefined;
            connection_timeout_ms?: number | undefined;
            retry_attempts?: number | undefined;
            retry_delay_ms?: number | undefined;
            max_retry_delay_ms?: number | undefined;
            backoff_multiplier?: number | undefined;
            connection_retry_limit?: number | undefined;
        };
        content_types: {
            procedures: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
            runbooks: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
            decision_trees: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
            knowledge_base: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
        };
        enabled?: boolean | undefined;
        strategy?: "memory_only" | "redis_only" | "hybrid" | undefined;
    }>>;
    embedding: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        model: z.ZodDefault<z.ZodString>;
        cache_size: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        model: string;
        cache_size: number;
    }, {
        enabled?: boolean | undefined;
        model?: string | undefined;
        cache_size?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    server: {
        port: number;
        host: string;
        log_level: "info" | "debug" | "warn" | "error";
        cache_ttl_seconds: number;
        max_concurrent_requests: number;
        request_timeout_ms: number;
        health_check_interval_ms: number;
    };
    sources: {
        type: "confluence" | "notion" | "github" | "database" | "web" | "file";
        name: string;
        refresh_interval: string;
        priority: number;
        enabled: boolean;
        timeout_ms: number;
        max_retries: number;
        metadata?: Record<string, any> | undefined;
        categories?: string[] | undefined;
        base_url?: string | undefined;
        auth?: {
            type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
            token_env?: string | undefined;
            username_env?: string | undefined;
            password_env?: string | undefined;
            api_key_env?: string | undefined;
            oauth_config?: Record<string, string> | undefined;
            credentials?: Record<string, string> | undefined;
        } | undefined;
    }[];
    cache?: {
        enabled: boolean;
        strategy: "memory_only" | "redis_only" | "hybrid";
        memory: {
            max_keys: number;
            ttl_seconds: number;
            check_period_seconds: number;
        };
        redis: {
            url: string;
            enabled: boolean;
            ttl_seconds: number;
            key_prefix: string;
            connection_timeout_ms: number;
            retry_attempts: number;
            retry_delay_ms: number;
            max_retry_delay_ms: number;
            backoff_multiplier: number;
            connection_retry_limit: number;
        };
        content_types: {
            procedures: {
                ttl_seconds: number;
                warmup: boolean;
            };
            runbooks: {
                ttl_seconds: number;
                warmup: boolean;
            };
            decision_trees: {
                ttl_seconds: number;
                warmup: boolean;
            };
            knowledge_base: {
                ttl_seconds: number;
                warmup: boolean;
            };
        };
    } | undefined;
    embedding?: {
        enabled: boolean;
        model: string;
        cache_size: number;
    } | undefined;
}, {
    server: {
        port?: number | undefined;
        host?: string | undefined;
        log_level?: "info" | "debug" | "warn" | "error" | undefined;
        cache_ttl_seconds?: number | undefined;
        max_concurrent_requests?: number | undefined;
        request_timeout_ms?: number | undefined;
        health_check_interval_ms?: number | undefined;
    };
    sources: {
        type: "confluence" | "notion" | "github" | "database" | "web" | "file";
        name: string;
        refresh_interval: string;
        priority: number;
        metadata?: Record<string, any> | undefined;
        categories?: string[] | undefined;
        base_url?: string | undefined;
        auth?: {
            type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
            token_env?: string | undefined;
            username_env?: string | undefined;
            password_env?: string | undefined;
            api_key_env?: string | undefined;
            oauth_config?: Record<string, string> | undefined;
            credentials?: Record<string, string> | undefined;
        } | undefined;
        enabled?: boolean | undefined;
        timeout_ms?: number | undefined;
        max_retries?: number | undefined;
    }[];
    cache?: {
        memory: {
            max_keys?: number | undefined;
            ttl_seconds?: number | undefined;
            check_period_seconds?: number | undefined;
        };
        redis: {
            url?: string | undefined;
            enabled?: boolean | undefined;
            ttl_seconds?: number | undefined;
            key_prefix?: string | undefined;
            connection_timeout_ms?: number | undefined;
            retry_attempts?: number | undefined;
            retry_delay_ms?: number | undefined;
            max_retry_delay_ms?: number | undefined;
            backoff_multiplier?: number | undefined;
            connection_retry_limit?: number | undefined;
        };
        content_types: {
            procedures: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
            runbooks: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
            decision_trees: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
            knowledge_base: {
                ttl_seconds?: number | undefined;
                warmup?: boolean | undefined;
            };
        };
        enabled?: boolean | undefined;
        strategy?: "memory_only" | "redis_only" | "hybrid" | undefined;
    } | undefined;
    embedding?: {
        enabled?: boolean | undefined;
        model?: string | undefined;
        cache_size?: number | undefined;
    } | undefined;
}>;
export type AppConfig = z.infer<typeof AppConfig>;
export declare const GitHubAuthConfig: z.ZodObject<{
    type: z.ZodEnum<["personal_token", "github_app"]>;
    token_env: z.ZodOptional<z.ZodString>;
    app_config: z.ZodOptional<z.ZodObject<{
        app_id: z.ZodString;
        private_key_env: z.ZodString;
        installation_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        app_id: string;
        private_key_env: string;
        installation_id?: string | undefined;
    }, {
        app_id: string;
        private_key_env: string;
        installation_id?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "personal_token" | "github_app";
    token_env?: string | undefined;
    app_config?: {
        app_id: string;
        private_key_env: string;
        installation_id?: string | undefined;
    } | undefined;
}, {
    type: "personal_token" | "github_app";
    token_env?: string | undefined;
    app_config?: {
        app_id: string;
        private_key_env: string;
        installation_id?: string | undefined;
    } | undefined;
}>;
export type GitHubAuthConfig = z.infer<typeof GitHubAuthConfig>;
export declare const GitHubRepositoryFilters: z.ZodObject<{
    languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    min_stars: z.ZodOptional<z.ZodNumber>;
    max_age_days: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    max_age_days?: number | undefined;
    languages?: string[] | undefined;
    topics?: string[] | undefined;
    min_stars?: number | undefined;
}, {
    max_age_days?: number | undefined;
    languages?: string[] | undefined;
    topics?: string[] | undefined;
    min_stars?: number | undefined;
}>;
export type GitHubRepositoryFilters = z.infer<typeof GitHubRepositoryFilters>;
export declare const GitHubScopeConfig: z.ZodObject<{
    repositories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    include_private: z.ZodDefault<z.ZodBoolean>;
    user_consent_given: z.ZodDefault<z.ZodBoolean>;
    repository_filters: z.ZodOptional<z.ZodObject<{
        languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        min_stars: z.ZodOptional<z.ZodNumber>;
        max_age_days: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        max_age_days?: number | undefined;
        languages?: string[] | undefined;
        topics?: string[] | undefined;
        min_stars?: number | undefined;
    }, {
        max_age_days?: number | undefined;
        languages?: string[] | undefined;
        topics?: string[] | undefined;
        min_stars?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    include_private: boolean;
    user_consent_given: boolean;
    repositories?: string[] | undefined;
    organizations?: string[] | undefined;
    repository_filters?: {
        max_age_days?: number | undefined;
        languages?: string[] | undefined;
        topics?: string[] | undefined;
        min_stars?: number | undefined;
    } | undefined;
}, {
    repositories?: string[] | undefined;
    organizations?: string[] | undefined;
    include_private?: boolean | undefined;
    user_consent_given?: boolean | undefined;
    repository_filters?: {
        max_age_days?: number | undefined;
        languages?: string[] | undefined;
        topics?: string[] | undefined;
        min_stars?: number | undefined;
    } | undefined;
}>;
export type GitHubScopeConfig = z.infer<typeof GitHubScopeConfig>;
export declare const GitHubContentConfig: z.ZodObject<{
    readme: z.ZodDefault<z.ZodBoolean>;
    wiki: z.ZodDefault<z.ZodBoolean>;
    documentation: z.ZodDefault<z.ZodBoolean>;
    issues: z.ZodDefault<z.ZodBoolean>;
    pull_requests: z.ZodDefault<z.ZodBoolean>;
    code_comments: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    issues: boolean;
    readme: boolean;
    wiki: boolean;
    documentation: boolean;
    pull_requests: boolean;
    code_comments: boolean;
}, {
    issues?: boolean | undefined;
    readme?: boolean | undefined;
    wiki?: boolean | undefined;
    documentation?: boolean | undefined;
    pull_requests?: boolean | undefined;
    code_comments?: boolean | undefined;
}>;
export type GitHubContentConfig = z.infer<typeof GitHubContentConfig>;
export declare const GitHubPerformanceConfig: z.ZodObject<{
    cache_ttl: z.ZodDefault<z.ZodString>;
    max_file_size_kb: z.ZodDefault<z.ZodNumber>;
    rate_limit_quota: z.ZodDefault<z.ZodNumber>;
    min_request_interval_ms: z.ZodDefault<z.ZodNumber>;
    concurrent_requests: z.ZodDefault<z.ZodNumber>;
    max_repositories_per_scan: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    cache_ttl: string;
    max_file_size_kb: number;
    rate_limit_quota: number;
    min_request_interval_ms: number;
    concurrent_requests: number;
    max_repositories_per_scan: number;
}, {
    cache_ttl?: string | undefined;
    max_file_size_kb?: number | undefined;
    rate_limit_quota?: number | undefined;
    min_request_interval_ms?: number | undefined;
    concurrent_requests?: number | undefined;
    max_repositories_per_scan?: number | undefined;
}>;
export type GitHubPerformanceConfig = z.infer<typeof GitHubPerformanceConfig>;
export declare const GitHubWebhookConfig: z.ZodObject<{
    endpoint_url: z.ZodString;
    secret_env: z.ZodString;
    events: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    endpoint_url: string;
    secret_env: string;
    events: string[];
}, {
    endpoint_url: string;
    secret_env: string;
    events?: string[] | undefined;
}>;
export type GitHubWebhookConfig = z.infer<typeof GitHubWebhookConfig>;
export declare const GitHubConfig: z.ZodObject<{
    name: z.ZodString;
    base_url: z.ZodOptional<z.ZodString>;
    refresh_interval: z.ZodString;
    priority: z.ZodNumber;
    enabled: z.ZodDefault<z.ZodBoolean>;
    timeout_ms: z.ZodDefault<z.ZodNumber>;
    max_retries: z.ZodDefault<z.ZodNumber>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"github">;
    auth: z.ZodObject<{
        type: z.ZodEnum<["personal_token", "github_app"]>;
        token_env: z.ZodOptional<z.ZodString>;
        app_config: z.ZodOptional<z.ZodObject<{
            app_id: z.ZodString;
            private_key_env: z.ZodString;
            installation_id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            app_id: string;
            private_key_env: string;
            installation_id?: string | undefined;
        }, {
            app_id: string;
            private_key_env: string;
            installation_id?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "personal_token" | "github_app";
        token_env?: string | undefined;
        app_config?: {
            app_id: string;
            private_key_env: string;
            installation_id?: string | undefined;
        } | undefined;
    }, {
        type: "personal_token" | "github_app";
        token_env?: string | undefined;
        app_config?: {
            app_id: string;
            private_key_env: string;
            installation_id?: string | undefined;
        } | undefined;
    }>;
    scope: z.ZodObject<{
        repositories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        organizations: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        include_private: z.ZodDefault<z.ZodBoolean>;
        user_consent_given: z.ZodDefault<z.ZodBoolean>;
        repository_filters: z.ZodOptional<z.ZodObject<{
            languages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            min_stars: z.ZodOptional<z.ZodNumber>;
            max_age_days: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            max_age_days?: number | undefined;
            languages?: string[] | undefined;
            topics?: string[] | undefined;
            min_stars?: number | undefined;
        }, {
            max_age_days?: number | undefined;
            languages?: string[] | undefined;
            topics?: string[] | undefined;
            min_stars?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        include_private: boolean;
        user_consent_given: boolean;
        repositories?: string[] | undefined;
        organizations?: string[] | undefined;
        repository_filters?: {
            max_age_days?: number | undefined;
            languages?: string[] | undefined;
            topics?: string[] | undefined;
            min_stars?: number | undefined;
        } | undefined;
    }, {
        repositories?: string[] | undefined;
        organizations?: string[] | undefined;
        include_private?: boolean | undefined;
        user_consent_given?: boolean | undefined;
        repository_filters?: {
            max_age_days?: number | undefined;
            languages?: string[] | undefined;
            topics?: string[] | undefined;
            min_stars?: number | undefined;
        } | undefined;
    }>;
    content_types: z.ZodDefault<z.ZodObject<{
        readme: z.ZodDefault<z.ZodBoolean>;
        wiki: z.ZodDefault<z.ZodBoolean>;
        documentation: z.ZodDefault<z.ZodBoolean>;
        issues: z.ZodDefault<z.ZodBoolean>;
        pull_requests: z.ZodDefault<z.ZodBoolean>;
        code_comments: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        issues: boolean;
        readme: boolean;
        wiki: boolean;
        documentation: boolean;
        pull_requests: boolean;
        code_comments: boolean;
    }, {
        issues?: boolean | undefined;
        readme?: boolean | undefined;
        wiki?: boolean | undefined;
        documentation?: boolean | undefined;
        pull_requests?: boolean | undefined;
        code_comments?: boolean | undefined;
    }>>;
    performance: z.ZodDefault<z.ZodObject<{
        cache_ttl: z.ZodDefault<z.ZodString>;
        max_file_size_kb: z.ZodDefault<z.ZodNumber>;
        rate_limit_quota: z.ZodDefault<z.ZodNumber>;
        min_request_interval_ms: z.ZodDefault<z.ZodNumber>;
        concurrent_requests: z.ZodDefault<z.ZodNumber>;
        max_repositories_per_scan: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        cache_ttl: string;
        max_file_size_kb: number;
        rate_limit_quota: number;
        min_request_interval_ms: number;
        concurrent_requests: number;
        max_repositories_per_scan: number;
    }, {
        cache_ttl?: string | undefined;
        max_file_size_kb?: number | undefined;
        rate_limit_quota?: number | undefined;
        min_request_interval_ms?: number | undefined;
        concurrent_requests?: number | undefined;
        max_repositories_per_scan?: number | undefined;
    }>>;
    webhook: z.ZodOptional<z.ZodObject<{
        endpoint_url: z.ZodString;
        secret_env: z.ZodString;
        events: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        endpoint_url: string;
        secret_env: string;
        events: string[];
    }, {
        endpoint_url: string;
        secret_env: string;
        events?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "github";
    name: string;
    auth: {
        type: "personal_token" | "github_app";
        token_env?: string | undefined;
        app_config?: {
            app_id: string;
            private_key_env: string;
            installation_id?: string | undefined;
        } | undefined;
    };
    refresh_interval: string;
    priority: number;
    enabled: boolean;
    timeout_ms: number;
    max_retries: number;
    content_types: {
        issues: boolean;
        readme: boolean;
        wiki: boolean;
        documentation: boolean;
        pull_requests: boolean;
        code_comments: boolean;
    };
    scope: {
        include_private: boolean;
        user_consent_given: boolean;
        repositories?: string[] | undefined;
        organizations?: string[] | undefined;
        repository_filters?: {
            max_age_days?: number | undefined;
            languages?: string[] | undefined;
            topics?: string[] | undefined;
            min_stars?: number | undefined;
        } | undefined;
    };
    performance: {
        cache_ttl: string;
        max_file_size_kb: number;
        rate_limit_quota: number;
        min_request_interval_ms: number;
        concurrent_requests: number;
        max_repositories_per_scan: number;
    };
    metadata?: Record<string, any> | undefined;
    categories?: string[] | undefined;
    base_url?: string | undefined;
    webhook?: {
        endpoint_url: string;
        secret_env: string;
        events: string[];
    } | undefined;
}, {
    type: "github";
    name: string;
    auth: {
        type: "personal_token" | "github_app";
        token_env?: string | undefined;
        app_config?: {
            app_id: string;
            private_key_env: string;
            installation_id?: string | undefined;
        } | undefined;
    };
    refresh_interval: string;
    priority: number;
    scope: {
        repositories?: string[] | undefined;
        organizations?: string[] | undefined;
        include_private?: boolean | undefined;
        user_consent_given?: boolean | undefined;
        repository_filters?: {
            max_age_days?: number | undefined;
            languages?: string[] | undefined;
            topics?: string[] | undefined;
            min_stars?: number | undefined;
        } | undefined;
    };
    metadata?: Record<string, any> | undefined;
    categories?: string[] | undefined;
    base_url?: string | undefined;
    enabled?: boolean | undefined;
    timeout_ms?: number | undefined;
    max_retries?: number | undefined;
    content_types?: {
        issues?: boolean | undefined;
        readme?: boolean | undefined;
        wiki?: boolean | undefined;
        documentation?: boolean | undefined;
        pull_requests?: boolean | undefined;
        code_comments?: boolean | undefined;
    } | undefined;
    performance?: {
        cache_ttl?: string | undefined;
        max_file_size_kb?: number | undefined;
        rate_limit_quota?: number | undefined;
        min_request_interval_ms?: number | undefined;
        concurrent_requests?: number | undefined;
        max_repositories_per_scan?: number | undefined;
    } | undefined;
    webhook?: {
        endpoint_url: string;
        secret_env: string;
        events?: string[] | undefined;
    } | undefined;
}>;
export type GitHubConfig = z.infer<typeof GitHubConfig>;
export declare const FileSystemConfig: z.ZodObject<{
    name: z.ZodString;
    base_url: z.ZodOptional<z.ZodString>;
    auth: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["bearer_token", "basic_auth", "api_key", "oauth2", "personal_token", "github_app", "basic", "bearer", "cookie"]>;
        token_env: z.ZodOptional<z.ZodString>;
        username_env: z.ZodOptional<z.ZodString>;
        password_env: z.ZodOptional<z.ZodString>;
        api_key_env: z.ZodOptional<z.ZodString>;
        oauth_config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        credentials: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
        api_key_env?: string | undefined;
        oauth_config?: Record<string, string> | undefined;
        credentials?: Record<string, string> | undefined;
    }, {
        type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
        api_key_env?: string | undefined;
        oauth_config?: Record<string, string> | undefined;
        credentials?: Record<string, string> | undefined;
    }>>;
    refresh_interval: z.ZodString;
    priority: z.ZodNumber;
    enabled: z.ZodDefault<z.ZodBoolean>;
    timeout_ms: z.ZodDefault<z.ZodNumber>;
    max_retries: z.ZodDefault<z.ZodNumber>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"file">;
    base_paths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    recursive: z.ZodDefault<z.ZodBoolean>;
    max_depth: z.ZodDefault<z.ZodNumber>;
    file_patterns: z.ZodOptional<z.ZodObject<{
        include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    }, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    }>>;
    supported_extensions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    extract_metadata: z.ZodDefault<z.ZodBoolean>;
    pdf_extraction: z.ZodDefault<z.ZodBoolean>;
    watch_changes: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "file";
    name: string;
    refresh_interval: string;
    priority: number;
    enabled: boolean;
    timeout_ms: number;
    max_retries: number;
    recursive: boolean;
    max_depth: number;
    extract_metadata: boolean;
    pdf_extraction: boolean;
    watch_changes: boolean;
    metadata?: Record<string, any> | undefined;
    categories?: string[] | undefined;
    base_url?: string | undefined;
    auth?: {
        type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
        api_key_env?: string | undefined;
        oauth_config?: Record<string, string> | undefined;
        credentials?: Record<string, string> | undefined;
    } | undefined;
    base_paths?: string[] | undefined;
    file_patterns?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    } | undefined;
    supported_extensions?: string[] | undefined;
}, {
    type: "file";
    name: string;
    refresh_interval: string;
    priority: number;
    metadata?: Record<string, any> | undefined;
    categories?: string[] | undefined;
    base_url?: string | undefined;
    auth?: {
        type: "bearer_token" | "basic_auth" | "api_key" | "oauth2" | "personal_token" | "github_app" | "basic" | "bearer" | "cookie";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
        api_key_env?: string | undefined;
        oauth_config?: Record<string, string> | undefined;
        credentials?: Record<string, string> | undefined;
    } | undefined;
    enabled?: boolean | undefined;
    timeout_ms?: number | undefined;
    max_retries?: number | undefined;
    base_paths?: string[] | undefined;
    recursive?: boolean | undefined;
    max_depth?: number | undefined;
    file_patterns?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    } | undefined;
    supported_extensions?: string[] | undefined;
    extract_metadata?: boolean | undefined;
    pdf_extraction?: boolean | undefined;
    watch_changes?: boolean | undefined;
}>;
export type FileSystemConfig = z.infer<typeof FileSystemConfig>;
export declare const ConfluenceConfig: z.ZodObject<{
    name: z.ZodString;
    refresh_interval: z.ZodString;
    priority: z.ZodNumber;
    enabled: z.ZodDefault<z.ZodBoolean>;
    timeout_ms: z.ZodDefault<z.ZodNumber>;
    max_retries: z.ZodDefault<z.ZodNumber>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
} & {
    type: z.ZodLiteral<"confluence">;
    base_url: z.ZodString;
    space_keys: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    auth: z.ZodObject<{
        type: z.ZodEnum<["bearer_token", "basic"]>;
        token_env: z.ZodOptional<z.ZodString>;
        username_env: z.ZodOptional<z.ZodString>;
        password_env: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "bearer_token" | "basic";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
    }, {
        type: "bearer_token" | "basic";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
    }>;
    rate_limit: z.ZodDefault<z.ZodNumber>;
    max_results: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "confluence";
    name: string;
    base_url: string;
    auth: {
        type: "bearer_token" | "basic";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
    };
    refresh_interval: string;
    priority: number;
    enabled: boolean;
    timeout_ms: number;
    max_retries: number;
    rate_limit: number;
    max_results: number;
    metadata?: Record<string, any> | undefined;
    categories?: string[] | undefined;
    space_keys?: string[] | undefined;
}, {
    type: "confluence";
    name: string;
    base_url: string;
    auth: {
        type: "bearer_token" | "basic";
        token_env?: string | undefined;
        username_env?: string | undefined;
        password_env?: string | undefined;
    };
    refresh_interval: string;
    priority: number;
    metadata?: Record<string, any> | undefined;
    categories?: string[] | undefined;
    enabled?: boolean | undefined;
    timeout_ms?: number | undefined;
    max_retries?: number | undefined;
    space_keys?: string[] | undefined;
    rate_limit?: number | undefined;
    max_results?: number | undefined;
}>;
export type ConfluenceConfig = z.infer<typeof ConfluenceConfig>;
export declare const GitHubRepositoryMetadata: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    full_name: z.ZodString;
    default_branch: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    language: z.ZodNullable<z.ZodString>;
    topics: z.ZodArray<z.ZodString, "many">;
    stars: z.ZodNumber;
    forks: z.ZodNumber;
    is_private: z.ZodBoolean;
    is_fork: z.ZodBoolean;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    pushed_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string | null;
    created_at: string;
    updated_at: string;
    topics: string[];
    owner: string;
    repo: string;
    full_name: string;
    default_branch: string;
    language: string | null;
    stars: number;
    forks: number;
    is_private: boolean;
    is_fork: boolean;
    pushed_at: string;
}, {
    description: string | null;
    created_at: string;
    updated_at: string;
    topics: string[];
    owner: string;
    repo: string;
    full_name: string;
    default_branch: string;
    language: string | null;
    stars: number;
    forks: number;
    is_private: boolean;
    is_fork: boolean;
    pushed_at: string;
}>;
export type GitHubRepositoryMetadata = z.infer<typeof GitHubRepositoryMetadata>;
export declare const GitHubContentFile: z.ZodObject<{
    path: z.ZodString;
    name: z.ZodString;
    sha: z.ZodString;
    size: z.ZodNumber;
    type: z.ZodEnum<["file", "dir"]>;
    download_url: z.ZodNullable<z.ZodString>;
    git_url: z.ZodString;
    html_url: z.ZodString;
    encoding: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    type: "file" | "dir";
    name: string;
    sha: string;
    size: number;
    download_url: string | null;
    git_url: string;
    html_url: string;
    content?: string | undefined;
    encoding?: string | undefined;
}, {
    path: string;
    type: "file" | "dir";
    name: string;
    sha: string;
    size: number;
    download_url: string | null;
    git_url: string;
    html_url: string;
    content?: string | undefined;
    encoding?: string | undefined;
}>;
export type GitHubContentFile = z.infer<typeof GitHubContentFile>;
export declare const GitHubRateLimit: z.ZodObject<{
    limit: z.ZodNumber;
    remaining: z.ZodNumber;
    reset: z.ZodNumber;
    used: z.ZodNumber;
    resource: z.ZodString;
}, "strip", z.ZodTypeAny, {
    limit: number;
    remaining: number;
    reset: number;
    used: number;
    resource: string;
}, {
    limit: number;
    remaining: number;
    reset: number;
    used: number;
    resource: string;
}>;
export type GitHubRateLimit = z.infer<typeof GitHubRateLimit>;
export declare class PPError extends Error {
    code: string;
    statusCode: number;
    context?: Record<string, any> | undefined;
    constructor(message: string, code: string, statusCode?: number, context?: Record<string, any> | undefined);
}
export declare class SourceError extends PPError {
    constructor(message: string, sourceName: string, context?: Record<string, any>);
}
export declare class ValidationError extends PPError {
    constructor(message: string, field: string, context?: Record<string, any>);
}
export declare class GitHubError extends PPError {
    gitHubCode?: string | undefined;
    constructor(message: string, gitHubCode?: string | undefined, statusCode?: number, context?: Record<string, any>);
}
export declare class GitHubRateLimitError extends GitHubError {
    resetTime: Date;
    constructor(message: string, resetTime: Date, context?: Record<string, any>);
}
export declare class GitHubAuthenticationError extends GitHubError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class GitHubConfigurationError extends GitHubError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class GitHubAdapterError extends GitHubError {
    constructor(message: string, context?: Record<string, any>);
}
//# sourceMappingURL=index.d.ts.map