# Configuration Schema Alignment Issues

## Issue Summary

During service functionality test development, several configuration structure misalignments were discovered between the test config, sample configs, and the actual Zod schema definitions. These need to be addressed to ensure consistent configuration across the application.

## Current Problems

### 1. Service Test Configuration Structure Issues

**Location**: `scripts/test-package.sh` (lines 409-422)

**Current Test Config**:
```yaml
sources:
  - name: "test"
    type: "file"
    base_url: "${testDir}"
    refresh_interval: "1m"
    priority: 1
    enabled: true
logging:
  level: "error"
performance:
  cache:
    enabled: false
```

**Issues Found**:
- ❌ `logging.level` should be `server.log_level` (per AppConfig schema)
- ❌ `performance.cache` should be top-level `cache` (per AppConfig schema)
- ❌ Missing required `server` section entirely

### 2. Schema vs. Implementation Misalignments

**Schema Definition** (`src/types/index.ts`):
```typescript
export const AppConfig = z.object({
  server: ServerConfig,           // Required
  sources: z.array(SourceConfig), // Required
  cache: CacheConfig.optional(),  // Optional
  embedding: z.object({...}).optional(),
  semantic_search: z.object({...}).optional(),
});
```

**Actual Structure Expected**:
```yaml
server:
  port: 3000
  host: "localhost"
  log_level: "error"              # Not logging.level
  cache_ttl_seconds: 3600
  max_concurrent_requests: 100
  request_timeout_ms: 30000
  health_check_interval_ms: 60000
sources: [...]
cache:                            # Not performance.cache
  enabled: false
  strategy: "memory_only"
```

### 3. Configuration Validation Inconsistencies

**Default Config Creation** (`src/utils/config.ts` lines 256+):
- Creates structure that matches schema perfectly
- But sample configs and test configs don't follow same structure

**Environment Variable Overrides** (`src/utils/config.ts` lines 355+):
- Correctly uses `server.log_level` structure
- But test config tries to use `logging.level`

## Recommended Solutions

### Immediate Fix (Required)
Update service test configuration to match schema:

```yaml
server:
  log_level: "error"
sources:
  - name: "test"
    type: "file"
    base_url: "${testDir}"
    refresh_interval: "1m"
    priority: 1
    enabled: true
    timeout_ms: 5000      # Faster for tests
    max_retries: 1        # Fewer retries for tests
cache:
  enabled: false
```

### Future Work (Nice to Have)

1. **Configuration Validation Enhancement**
   - Add configuration validation step during server startup
   - Provide clear error messages for common config mistakes
   - Add config validation to CI/CD pipeline

2. **Sample Config Alignment**
   - Review all sample configs (`config/*.sample.yaml`) for schema compliance
   - Ensure documentation examples match actual schema requirements
   - Add schema validation to sample config generation

3. **Developer Experience Improvements**
   - Add JSON Schema generation from Zod schemas for IDE validation
   - Create config validation CLI tool (`npm run validate-config`)
   - Add config migration utilities for schema changes

## Files Affected

- `scripts/test-package.sh` - Service test config (immediate fix needed)
- `src/types/index.ts` - Schema definitions (reference)
- `src/utils/config.ts` - Config loading and defaults (working correctly)
- `config/*.sample.yaml` - Sample configurations (review needed)
- Documentation files referencing configuration structure

## Test Verification

After fixing the service test config:
1. Service functionality test should pass
2. CONFIG_FILE environment variable should work correctly
3. Server should start without "Base path does not exist" errors

## Priority

- **High**: Fix service test configuration (blocking CI/CD)
- **Medium**: Validate sample configs against schema
- **Low**: Developer experience improvements

## Related

- Service functionality test implementation (current work)
- CONFIG_FILE environment variable support (completed)
- Command-line argument support (completed)