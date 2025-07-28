# Development Tools Guide

This guide covers the three convenience scripts introduced in Milestone 1.2 to streamline development and testing of the Personal Pipeline MCP server.

## Overview

The development tools provide:
- **Sample Data Generation**: Realistic test data for development and testing
- **Configuration Validation**: Comprehensive YAML config validation with schema checking
- **MCP Client Testing**: Interactive tool for testing all 7 MCP tools

## 1. Sample Data Generator

### Purpose
Generate realistic runbooks, procedures, and knowledge base articles for testing and development.

### Usage

```bash
# Generate sample data with default settings
npm run generate-sample-data
```

### What It Creates

The generator creates a comprehensive test dataset:

```
test-data/
├── runbooks/              # 15 realistic runbooks (JSON format)
│   ├── disk_space_critical_000.json
│   ├── memory_leak_high_001.json
│   └── ...
├── knowledge-base/        # 30 knowledge articles (Markdown + metadata)
│   ├── kb_troubleshooting_000.md
│   ├── kb_troubleshooting_000.meta.json
│   └── ...
├── configs/              # Sample configuration files
│   └── test-config.yaml
└── generation-summary.json  # Generation metadata
```

### Sample Runbook Structure

Each generated runbook includes:
- **Alert scenarios**: 7 types (disk_space, memory_leak, cpu_high, database_slow, network_issues, ssl_certificate, security_incident)
- **Decision trees**: Conditional logic with confidence scores
- **Procedures**: Emergency, standard, and diagnostic procedures
- **Escalation paths**: Team roles and contact information
- **Metadata**: Confidence scores, success rates, resolution times

### Using Generated Data

```bash
# 1. Generate the test data
npm run generate-sample-data

# 2. Use the generated configuration
cp test-data/configs/test-config.yaml config/config.yaml

# 3. Start the server with test data
npm run dev

# 4. Test with the MCP client
npm run test-mcp
```

### Customization

The generator can be customized by editing `scripts/generate-sample-data.js`:
- Modify `CONFIG` object for different counts
- Update `ALERT_SCENARIOS` for different alert types
- Change `TEAM_ROLES` for different escalation paths

## 2. Configuration Validator

### Purpose
Validate YAML configuration files with comprehensive schema checking, environment variable validation, and source connection testing.

### Usage

```bash
# Validate default configuration
npm run validate-config

# Validate specific config file
npm run validate-config -- --config path/to/config.yaml

# Save validation report to file
npm run validate-config -- --output validation-report.json

# Skip specific validation checks
npm run validate-config -- --no-connections
npm run validate-config -- --no-environment
npm run validate-config -- --no-system
```

### Validation Categories

#### 1. Schema Validation
- YAML syntax checking
- Zod schema validation
- Required field verification
- Data type validation

#### 2. Server Configuration
- Port range validation (warns if < 1024)
- Host configuration checking
- Cache TTL recommendations
- Request limit validation

#### 3. Source Configuration
- Duplicate source name detection
- Type-specific validation (file, confluence, github, etc.)
- Authentication configuration checking
- Refresh interval format validation

#### 4. Environment Variables
- Required credential checking
- Missing environment variable detection
- Authentication configuration validation

#### 5. System Requirements
- Node.js version checking (requires >= 18.0.0)
- Memory usage monitoring
- Package.json accessibility

#### 6. Connection Testing
- File source accessibility testing
- URL format validation for web sources
- Permission checking for file systems

### Example Output

```
🔍 Personal Pipeline Configuration Validator

Validating configuration: config/config.yaml

📋 Validating configuration schema...
🔐 Validating environment variables...
⚙️  Validating system requirements...
🌐 Testing source connections...

📊 Validation Summary:
✅ Passed: 12
⚠️  Warnings: 2
❌ Errors: 0
📋 Total: 14

🎉 Configuration validation passed!

📋 Detailed Results:
✅ [file] Configuration file exists: config/config.yaml
✅ [schema] YAML file parsed successfully
✅ [schema] Configuration schema validation passed
✅ [server] Valid port configuration: 3000
⚠️ [sources] Some sources have duplicate priorities
✅ [environment] No environment variables required
✅ [system] Node.js version v18.17.0 is supported
✅ [connection] Source "test-runbooks": directory accessible
```

### Command Line Options

```bash
# Show help
npm run validate-config -- --help

# Configuration options
--config, -c <path>     Path to configuration file
--output, -o <path>     Save validation report to file

# Skip validation checks
--no-connections        Skip connection testing
--no-environment        Skip environment variable validation
--no-system            Skip system requirements check
```

## 3. MCP Client Testing Tool

### Purpose
Interactive tool for testing all 7 MCP tools with parameter validation, response formatting, and performance monitoring.

### Usage Modes

#### Interactive Mode (Default)
```bash
npm run test-mcp
```

Provides a menu-driven interface for testing tools:
1. Lists all 7 available tools
2. Allows parameter input with validation
3. Displays formatted responses with timing
4. Shows confidence scores and metadata

#### Automated Test Suite
```bash
npm run test-mcp -- --test-suite
```

Runs 18 predefined test scenarios across all tools:
- Multiple scenarios per tool
- Performance timing for each test
- Success rate calculation
- Detailed error reporting

#### Quick Validation
```bash
npm run test-mcp -- --validate
```

Quick health check of all tools:
- Tests one scenario per tool
- Fast validation of tool availability
- Summary of passing/failing tools

#### Specific Tool Testing
```bash
npm run test-mcp -- --tool search_runbooks
```

Test a specific tool interactively.

### Tool Definitions

The tester includes complete schemas for all 7 MCP tools:

1. **search_runbooks**: Context-aware operational runbook retrieval
2. **get_decision_tree**: Retrieve decision logic for specific scenarios
3. **get_procedure**: Detailed execution steps for procedures
4. **get_escalation_path**: Determine appropriate escalation procedures
5. **list_sources**: Manage documentation sources
6. **search_knowledge_base**: General documentation search
7. **record_resolution_feedback**: Capture outcomes for improvement

### Interactive Testing Example

```bash
$ npm run test-mcp

🔧 Personal Pipeline MCP Client Tester - Interactive Mode

📡 Connecting to MCP server...

Available Tools:
1. search_runbooks - Context-aware operational runbook retrieval
2. get_decision_tree - Retrieve decision logic for specific scenarios
3. get_procedure - Detailed execution steps for procedures
4. get_escalation_path - Determine appropriate escalation procedures
5. list_sources - Manage documentation sources
6. search_knowledge_base - General documentation search across all sources
7. record_resolution_feedback - Capture outcomes for continuous improvement
0. Exit

Select tool (0-7): 1

🔍 Testing: search_runbooks
📋 Context-aware operational runbook retrieval

Parameters:
- alert_type (required): Type of alert (disk_space, memory_leak, cpu_high, etc.)
- severity (optional): Alert severity (critical, high, medium, low)
- affected_systems (optional): List of affected system names

Enter alert_type: disk_space
Enter severity (press Enter to skip): critical
Enter affected_systems (press Enter to skip): web-server-01

🚀 Sending request...
⏱️  Response time: 87ms
✅ Success!

📄 Response:
{
  "runbooks": [
    {
      "id": "rb_disk_space_001",
      "title": "Disk Space Response",
      "confidence_score": 0.92,
      "procedures": ["emergency_procedure", "standard_procedure"]
    }
  ],
  "total_results": 1,
  "confidence_scores": [0.92],
  "success": true,
  "retrieval_time_ms": 87,
  "timestamp": "2025-07-28T20:15:30.123Z"
}
```

### Test Suite Example

```bash
$ npm run test-mcp -- --test-suite

🧪 Running automated test suite...

Testing search_runbooks...
  ✅ Scenario 1: 87ms
  ✅ Scenario 2: 92ms
  ✅ Scenario 3: 76ms
Testing get_decision_tree...
  ✅ Scenario 1: 65ms
  ✅ Scenario 2: 71ms
...

📊 Test Suite Summary:
Total: 18
✅ Passed: 18
❌ Failed: 0
Success Rate: 100.0%
```

### Mock vs Real Server

The testing tool can operate in two modes:

1. **Mock Mode**: Simulates responses without requiring a running server
   - Used for validation and basic testing
   - Generates realistic mock responses
   - Useful for development and CI/CD

2. **Real Server Mode**: Connects to actual MCP server
   - Requires server to be running (`npm run dev`)
   - Tests actual tool implementations
   - Provides real performance metrics

## Integration Workflow

### Development Workflow

1. **Start with sample data**:
   ```bash
   npm run generate-sample-data
   cp test-data/configs/test-config.yaml config/config.yaml
   ```

2. **Validate configuration**:
   ```bash
   npm run validate-config
   ```

3. **Start server and test**:
   ```bash
   npm run dev
   npm run test-mcp
   ```

### CI/CD Integration

```bash
# In CI pipeline
npm run generate-sample-data
npm run validate-config --output validation-report.json
npm run test-mcp --validate
```

### Debugging Workflow

```bash
# 1. Validate configuration
npm run validate-config --output debug-validation.json

# 2. Generate fresh test data
npm run generate-sample-data

# 3. Test individual tools
npm run test-mcp --tool search_runbooks

# 4. Run full test suite
npm run test-mcp --test-suite
```

## Troubleshooting

### Common Issues

#### Sample Data Generation Fails
```bash
# Check permissions
ls -la test-data/
# Clear and regenerate
rm -rf test-data/
npm run generate-sample-data
```

#### Configuration Validation Errors
```bash
# Check YAML syntax
npm run validate-config --config config/config.yaml
# Test with sample config
npm run validate-config --config test-data/configs/test-config.yaml
```

#### MCP Testing Connection Issues
```bash
# Ensure server is running
npm run health
# Test with mock mode
npm run test-mcp --validate
```

### Performance Tips

- Use `--validate` for quick checks
- Use `--test-suite` for comprehensive testing
- Generate sample data once, reuse multiple times
- Validate configuration before starting server

## Advanced Usage

### Custom Test Scenarios

Edit `scripts/test-mcp.js` to add custom test scenarios:

```javascript
const CUSTOM_SCENARIOS = {
  search_runbooks: [
    { 
      alert_type: 'custom_alert', 
      severity: 'high', 
      affected_systems: ['custom-system'] 
    }
  ]
};
```

### Configuration Templates

Create multiple configuration templates in `test-data/configs/`:
- `dev-config.yaml` - Development settings
- `test-config.yaml` - Testing configuration
- `prod-config.yaml` - Production template

### Automated Testing

Integrate with existing test suite:

```javascript
// In Jest tests
import { MCPClient } from '../scripts/test-mcp.js';

describe('MCP Integration Tests', () => {
  const client = new MCPClient();
  
  test('search_runbooks returns valid response', async () => {
    const response = await client.sendRequest('search_runbooks', {
      alert_type: 'disk_space',
      severity: 'critical'
    });
    expect(response.success).toBe(true);
  });
});
```

## Best Practices

1. **Always validate configuration** before deploying
2. **Generate fresh test data** for each major development cycle
3. **Use interactive mode** for debugging specific tools
4. **Run test suite** before committing changes
5. **Save validation reports** for auditing and compliance
6. **Test with realistic data** using the sample generator

## Next Steps

These development tools provide a solid foundation for:
- **Milestone 1.3**: Performance optimization and enhanced caching
- **Phase 2**: Multi-source adapter development and testing
- **Phase 3**: LangGraph integration validation
- **Phase 4**: Enterprise-scale testing and validation