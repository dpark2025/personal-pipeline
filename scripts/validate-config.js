#!/usr/bin/env node
/**
 * Configuration Validator for Personal Pipeline MCP Server
 * 
 * Validates YAML configuration files, tests source connections,
 * checks credentials, and verifies system requirements.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import types for validation
const SourceType = z.enum(['confluence', 'notion', 'github', 'database', 'web', 'file']);
const AlertSeverity = z.enum(['critical', 'high', 'medium', 'low', 'info']);

const AuthConfig = z.object({
  type: z.enum(['bearer_token', 'basic_auth', 'api_key', 'oauth2']),
  token_env: z.string().optional(),
  username_env: z.string().optional(),
  password_env: z.string().optional(),
  api_key_env: z.string().optional(),
  oauth_config: z.record(z.string()).optional(),
});

const SourceConfig = z.object({
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

const ServerConfig = z.object({
  port: z.number().default(3000),
  host: z.string().default('localhost'),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  cache_ttl_seconds: z.number().default(3600),
  max_concurrent_requests: z.number().default(100),
  request_timeout_ms: z.number().default(30000),
  health_check_interval_ms: z.number().default(60000),
});

const AppConfig = z.object({
  server: ServerConfig,
  sources: z.array(SourceConfig),
  embedding: z.object({
    enabled: z.boolean().default(true),
    model: z.string().default('sentence-transformers/all-MiniLM-L6-v2'),
    cache_size: z.number().default(1000),
  }).optional(),
});

// Validation results tracking
class ValidationResults {
  constructor() {
    this.results = [];
    this.errors = 0;
    this.warnings = 0;
    this.passed = 0;
  }

  addResult(type, category, message, details = null) {
    const result = {
      type, // 'pass', 'warn', 'error'
      category, // 'schema', 'connection', 'permission', etc.
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    
    this.results.push(result);
    
    if (type === 'error') this.errors++;
    else if (type === 'warn') this.warnings++;
    else if (type === 'pass') this.passed++;
  }

  getSummary() {
    return {
      total: this.results.length,
      passed: this.passed,
      warnings: this.warnings,
      errors: this.errors,
      success: this.errors === 0,
    };
  }

  getReport() {
    return {
      summary: this.getSummary(),
      results: this.results,
      generated_at: new Date().toISOString(),
    };
  }
}

/**
 * Validate configuration file schema
 */
async function validateSchema(configPath, results) {
  console.log('📋 Validating configuration schema...');
  
  try {
    // Check if file exists
    try {
      await fs.access(configPath);
      results.addResult('pass', 'file', `Configuration file exists: ${configPath}`);
    } catch (error) {
      results.addResult('error', 'file', `Configuration file not found: ${configPath}`);
      return false;
    }

    // Read and parse YAML
    let configContent;
    try {
      const fileContent = await fs.readFile(configPath, 'utf8');
      configContent = yaml.parse(fileContent);
      results.addResult('pass', 'schema', 'YAML file parsed successfully');
    } catch (error) {
      results.addResult('error', 'schema', `Failed to parse YAML: ${error.message}`);
      return false;
    }

    // Validate against schema
    try {
      const validatedConfig = AppConfig.parse(configContent);
      results.addResult('pass', 'schema', 'Configuration schema validation passed');
      
      // Additional schema validations
      validateServerConfig(validatedConfig.server, results);
      validateSourcesConfig(validatedConfig.sources, results);
      validateEmbeddingConfig(validatedConfig.embedding, results);
      
      return validatedConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          results.addResult('error', 'schema', `Schema validation error: ${issue.path.join('.')} - ${issue.message}`);
        }
      } else {
        results.addResult('error', 'schema', `Schema validation failed: ${error.message}`);
      }
      return false;
    }
  } catch (error) {
    results.addResult('error', 'schema', `Unexpected error during schema validation: ${error.message}`);
    return false;
  }
}

/**
 * Validate server configuration
 */
function validateServerConfig(serverConfig, results) {
  // Port validation
  if (serverConfig.port < 1024) {
    results.addResult('warn', 'server', `Port ${serverConfig.port} requires root privileges`);
  } else if (serverConfig.port > 65535) {
    results.addResult('error', 'server', `Invalid port number: ${serverConfig.port}`);
  } else {
    results.addResult('pass', 'server', `Valid port configuration: ${serverConfig.port}`);
  }

  // Host validation
  const validHosts = ['localhost', '0.0.0.0', '127.0.0.1'];
  if (!validHosts.includes(serverConfig.host) && !/^\d+\.\d+\.\d+\.\d+$/.test(serverConfig.host)) {
    results.addResult('warn', 'server', `Non-standard host configuration: ${serverConfig.host}`);
  } else {
    results.addResult('pass', 'server', `Valid host configuration: ${serverConfig.host}`);
  }

  // Cache TTL validation
  if (serverConfig.cache_ttl_seconds < 60) {
    results.addResult('warn', 'server', `Very short cache TTL: ${serverConfig.cache_ttl_seconds}s`);
  } else if (serverConfig.cache_ttl_seconds > 86400) {
    results.addResult('warn', 'server', `Very long cache TTL: ${serverConfig.cache_ttl_seconds}s`);
  }

  // Request limits validation
  if (serverConfig.max_concurrent_requests > 1000) {
    results.addResult('warn', 'server', `High concurrent request limit: ${serverConfig.max_concurrent_requests}`);
  }

  if (serverConfig.request_timeout_ms < 5000) {
    results.addResult('warn', 'server', `Short request timeout: ${serverConfig.request_timeout_ms}ms`);
  }
}

/**
 * Validate sources configuration
 */
function validateSourcesConfig(sources, results) {
  if (sources.length === 0) {
    results.addResult('error', 'sources', 'No sources configured - at least one source is required');
    return;
  }

  results.addResult('pass', 'sources', `${sources.length} source(s) configured`);

  // Check for duplicate source names
  const sourceNames = sources.map(s => s.name);
  const duplicates = sourceNames.filter((name, index) => sourceNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    results.addResult('error', 'sources', `Duplicate source names: ${duplicates.join(', ')}`);
  }

  // Validate each source
  sources.forEach((source, index) => {
    validateSingleSource(source, index, results);
  });

  // Check priority distribution
  const priorities = sources.map(s => s.priority).sort((a, b) => a - b);
  const uniquePriorities = [...new Set(priorities)];
  if (uniquePriorities.length !== priorities.length) {
    results.addResult('warn', 'sources', 'Some sources have duplicate priorities');
  }
}

/**
 * Validate individual source configuration
 */
function validateSingleSource(source, index, results) {
  const prefix = `Source "${source.name}"`;

  // Type-specific validations
  switch (source.type) {
    case 'file':
      if (!source.base_url) {
        results.addResult('error', 'sources', `${prefix}: file sources require base_url`);
      } else {
        results.addResult('pass', 'sources', `${prefix}: valid file source configuration`);
      }
      break;

    case 'confluence':
    case 'notion':
    case 'github':
      if (!source.base_url) {
        results.addResult('error', 'sources', `${prefix}: ${source.type} sources require base_url`);
      }
      if (!source.auth) {
        results.addResult('error', 'sources', `${prefix}: ${source.type} sources require authentication`);
      } else {
        validateAuthConfig(source.auth, source.name, results);
      }
      break;

    case 'database':
      if (!source.auth) {
        results.addResult('error', 'sources', `${prefix}: database sources require authentication`);
      }
      break;

    case 'web':
      if (!source.base_url) {
        results.addResult('error', 'sources', `${prefix}: web sources require base_url`);
      }
      break;
  }

  // Refresh interval validation
  if (!/^\d+[smhd]$/.test(source.refresh_interval)) {
    results.addResult('error', 'sources', `${prefix}: invalid refresh_interval format "${source.refresh_interval}"`);
  }

  // Timeout validation
  if (source.timeout_ms < 1000) {
    results.addResult('warn', 'sources', `${prefix}: very short timeout ${source.timeout_ms}ms`);
  } else if (source.timeout_ms > 300000) {
    results.addResult('warn', 'sources', `${prefix}: very long timeout ${source.timeout_ms}ms`);
  }

  // Retry validation
  if (source.max_retries > 10) {
    results.addResult('warn', 'sources', `${prefix}: high retry count ${source.max_retries}`);
  }
}

/**
 * Validate authentication configuration
 */
function validateAuthConfig(auth, sourceName, results) {
  const prefix = `Source "${sourceName}" auth`;

  switch (auth.type) {
    case 'bearer_token':
      if (!auth.token_env) {
        results.addResult('error', 'auth', `${prefix}: bearer_token requires token_env`);
      } else {
        results.addResult('pass', 'auth', `${prefix}: valid bearer_token configuration`);
      }
      break;

    case 'basic_auth':
      if (!auth.username_env || !auth.password_env) {
        results.addResult('error', 'auth', `${prefix}: basic_auth requires username_env and password_env`);
      } else {
        results.addResult('pass', 'auth', `${prefix}: valid basic_auth configuration`);
      }
      break;

    case 'api_key':
      if (!auth.api_key_env) {
        results.addResult('error', 'auth', `${prefix}: api_key requires api_key_env`);
      } else {
        results.addResult('pass', 'auth', `${prefix}: valid api_key configuration`);
      }
      break;

    case 'oauth2':
      if (!auth.oauth_config) {
        results.addResult('error', 'auth', `${prefix}: oauth2 requires oauth_config`);
      } else {
        results.addResult('pass', 'auth', `${prefix}: valid oauth2 configuration`);
      }
      break;
  }
}

/**
 * Validate embedding configuration
 */
function validateEmbeddingConfig(embedding, results) {
  if (!embedding) {
    results.addResult('pass', 'embedding', 'Embedding configuration not specified (using defaults)');
    return;
  }

  if (embedding.enabled) {
    results.addResult('pass', 'embedding', 'Embedding enabled');
    
    if (embedding.cache_size < 100) {
      results.addResult('warn', 'embedding', `Small embedding cache size: ${embedding.cache_size}`);
    } else if (embedding.cache_size > 10000) {
      results.addResult('warn', 'embedding', `Large embedding cache size: ${embedding.cache_size}`);
    }
  } else {
    results.addResult('warn', 'embedding', 'Embedding disabled - search functionality may be limited');
  }
}

/**
 * Test environment variables
 */
async function validateEnvironment(config, results) {
  console.log('🔐 Validating environment variables...');

  const requiredEnvVars = new Set();
  
  // Collect all required environment variables
  for (const source of config.sources) {
    if (source.auth) {
      if (source.auth.token_env) requiredEnvVars.add(source.auth.token_env);
      if (source.auth.username_env) requiredEnvVars.add(source.auth.username_env);
      if (source.auth.password_env) requiredEnvVars.add(source.auth.password_env);
      if (source.auth.api_key_env) requiredEnvVars.add(source.auth.api_key_env);
    }
  }

  // Check if environment variables exist
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      results.addResult('pass', 'environment', `Environment variable ${envVar} is set`);
    } else {
      results.addResult('error', 'environment', `Missing required environment variable: ${envVar}`);
    }
  }

  if (requiredEnvVars.size === 0) {
    results.addResult('pass', 'environment', 'No environment variables required');
  }
}

/**
 * Test source connections
 */
async function validateConnections(config, results) {
  console.log('🌐 Testing source connections...');

  for (const source of config.sources) {
    if (!source.enabled) {
      results.addResult('warn', 'connection', `Source "${source.name}" is disabled, skipping connection test`);
      continue;
    }

    try {
      await testSourceConnection(source, results);
    } catch (error) {
      results.addResult('error', 'connection', `Source "${source.name}" connection test failed: ${error.message}`);
    }
  }
}

/**
 * Test individual source connection
 */
async function testSourceConnection(source, results) {
  const startTime = Date.now();
  
  try {
    switch (source.type) {
      case 'file':
        await testFileSource(source, results);
        break;
      case 'confluence':
      case 'notion':
      case 'github':
      case 'web':
        await testWebSource(source, results);
        break;
      case 'database':
        results.addResult('warn', 'connection', `Source "${source.name}": database connection testing not implemented`);
        break;
      default:
        results.addResult('warn', 'connection', `Source "${source.name}": unknown source type "${source.type}"`);
    }
  } catch (error) {
    results.addResult('error', 'connection', `Source "${source.name}": ${error.message}`);
  }

  const duration = Date.now() - startTime;
  if (duration > source.timeout_ms) {
    results.addResult('warn', 'connection', `Source "${source.name}": response time ${duration}ms exceeds timeout ${source.timeout_ms}ms`);
  }
}

/**
 * Test file source
 */
async function testFileSource(source, results) {
  try {
    const stats = await fs.stat(source.base_url);
    if (stats.isDirectory()) {
      results.addResult('pass', 'connection', `Source "${source.name}": directory accessible`);
      
      // Test read permissions
      const files = await fs.readdir(source.base_url);
      results.addResult('pass', 'connection', `Source "${source.name}": found ${files.length} items in directory`);
    } else {
      results.addResult('warn', 'connection', `Source "${source.name}": base_url points to a file, not a directory`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      results.addResult('error', 'connection', `Source "${source.name}": directory does not exist: ${source.base_url}`);
    } else if (error.code === 'EACCES') {
      results.addResult('error', 'connection', `Source "${source.name}": permission denied: ${source.base_url}`);
    } else {
      throw error;
    }
  }
}

/**
 * Test web-based source (simplified test)
 */
async function testWebSource(source, results) {
  try {
    // Simple URL validation
    new URL(source.base_url);
    results.addResult('pass', 'connection', `Source "${source.name}": URL format is valid`);
    
    // Note: We're not making actual HTTP requests to avoid dependencies
    // and potential issues with authentication in validation
    results.addResult('warn', 'connection', `Source "${source.name}": actual HTTP connection test skipped (would require network access)`);
  } catch (error) {
    results.addResult('error', 'connection', `Source "${source.name}": invalid URL format: ${source.base_url}`);
  }
}

/**
 * Validate system requirements
 */
async function validateSystemRequirements(results) {
  console.log('⚙️  Validating system requirements...');

  // Node.js version check
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    results.addResult('pass', 'system', `Node.js version ${nodeVersion} is supported`);
  } else {
    results.addResult('error', 'system', `Node.js version ${nodeVersion} is too old (requires >= 18.0.0)`);
  }

  // Memory check
  const memoryUsage = process.memoryUsage();
  const totalMemoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
  
  if (totalMemoryMB < 512) {
    results.addResult('warn', 'system', `Low memory usage: ${totalMemoryMB}MB`);
  } else {
    results.addResult('pass', 'system', `Memory usage: ${totalMemoryMB}MB`);
  }

  // Check for required packages
  try {
    const packagePath = path.join(__dirname, '../package.json');
    await fs.access(packagePath);
    results.addResult('pass', 'system', 'package.json is accessible');
  } catch (error) {
    results.addResult('error', 'system', 'Cannot access package.json');
  }
}

/**
 * Main validation function
 */
async function validateConfig(configPath, options = {}) {
  const results = new ValidationResults();
  
  console.log('🔍 Personal Pipeline Configuration Validator\n');
  console.log(`Validating configuration: ${configPath}\n`);

  // Step 1: Schema validation
  const config = await validateSchema(configPath, results);
  if (!config) {
    return results.getReport();
  }

  // Step 2: Environment validation
  if (options.checkEnvironment !== false) {
    await validateEnvironment(config, results);
  }

  // Step 3: System requirements
  if (options.checkSystem !== false) {
    await validateSystemRequirements(results);
  }

  // Step 4: Connection testing
  if (options.testConnections !== false) {
    await validateConnections(config, results);
  }

  return results.getReport();
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Default config path
  let configPath = path.join(__dirname, '../config/config.yaml');
  let outputPath = null;
  let options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
      case '-c':
        configPath = args[++i];
        break;
      case '--output':
      case '-o':
        outputPath = args[++i];
        break;
      case '--no-connections':
        options.testConnections = false;
        break;
      case '--no-environment':
        options.checkEnvironment = false;
        break;
      case '--no-system':
        options.checkSystem = false;
        break;
      case '--help':
      case '-h':
        console.log(`
Personal Pipeline Configuration Validator

Usage: node scripts/validate-config.js [options]

Options:
  -c, --config <path>     Path to configuration file (default: config/config.yaml)
  -o, --output <path>     Save validation report to file
  --no-connections        Skip connection testing
  --no-environment        Skip environment variable validation
  --no-system            Skip system requirements check
  -h, --help             Show this help message

Examples:
  node scripts/validate-config.js
  node scripts/validate-config.js --config test-data/configs/test-config.yaml
  node scripts/validate-config.js --output validation-report.json
        `);
        process.exit(0);
      default:
        if (!args[i].startsWith('--')) {
          configPath = args[i];
        }
    }
  }

  try {
    const report = await validateConfig(configPath, options);
    
    // Print summary
    console.log('\n📊 Validation Summary:');
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`❌ Errors: ${report.summary.errors}`);
    console.log(`📋 Total: ${report.summary.total}`);
    
    if (report.summary.success) {
      console.log('\n🎉 Configuration validation passed!');
    } else {
      console.log('\n❌ Configuration validation failed!');
    }

    // Print detailed results
    console.log('\n📋 Detailed Results:');
    for (const result of report.results) {
      const icon = result.type === 'pass' ? '✅' : result.type === 'warn' ? '⚠️ ' : '❌';
      console.log(`${icon} [${result.category}] ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
    }

    // Save report if requested
    if (outputPath) {
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved to: ${outputPath}`);
    }

    // Exit with appropriate code
    process.exit(report.summary.success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Fatal error during validation:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { validateConfig, ValidationResults };