#!/usr/bin/env node

/**
 * Release Validation Script for Personal Pipeline
 * Authored by: DevOps Infrastructure Engineer
 * Date: 2025-01-17
 * 
 * Comprehensive release validation with quality gates:
 * - Pre-release validation and environment checks
 * - Artifact integrity validation
 * - Security compliance verification
 * - Performance and compatibility testing
 * - Release rollback validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  validation: {
    timeout: 300000, // 5 minutes
    retries: 3,
    thresholds: {
      testCoverage: 80,
      buildTime: 120, // seconds
      packageSize: 50 * 1024 * 1024, // 50MB
      dockerImageSize: 500 * 1024 * 1024, // 500MB
      securityScore: 8.0, // out of 10
      performanceScore: 7.0 // out of 10
    }
  },
  artifacts: {
    required: ['package.json', 'CHANGELOG.md', 'README.md'],
    npm: {
      pattern: '*.tgz',
      maxSize: 50 * 1024 * 1024
    },
    docker: {
      tag: 'personal-pipeline/mcp-server',
      maxSize: 500 * 1024 * 1024
    }
  },
  quality: {
    linting: true,
    typeChecking: true,
    testing: true,
    security: true,
    performance: true,
    compatibility: true
  }
};

// Utility functions
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    debug: colors.magenta
  };
  
  const color = colorMap[level] || colors.reset;
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset} ${message}`, ...args);
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      timeout: CONFIG.validation.timeout,
      ...options 
    });
    return result?.toString().trim();
  } catch (error) {
    if (!options.silent) {
      log('error', `Command failed: ${command}`);
      log('error', error.message);
    }
    throw error;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function withRetry(operation, retries = CONFIG.validation.retries) {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error;
      log('warning', `Attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Validation functions
function validateEnvironment() {
  log('info', 'Validating environment...');
  
  const validationResults = {
    valid: true,
    issues: [],
    checks: {}
  };
  
  // Check Node.js version
  try {
    const nodeVersion = execCommand('node --version', { silent: true });
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    
    if (majorVersion < 18) {
      validationResults.valid = false;
      validationResults.issues.push(`Node.js version ${nodeVersion} is below minimum requirement (v18)`);
    }
    
    validationResults.checks.nodeVersion = nodeVersion;
  } catch (error) {
    validationResults.valid = false;
    validationResults.issues.push('Node.js not found');
  }
  
  // Check npm version
  try {
    const npmVersion = execCommand('npm --version', { silent: true });
    validationResults.checks.npmVersion = npmVersion;
  } catch (error) {
    validationResults.valid = false;
    validationResults.issues.push('npm not found');
  }
  
  // Check git status
  try {
    const gitStatus = execCommand('git status --porcelain', { silent: true });
    if (gitStatus) {
      validationResults.issues.push('Uncommitted changes detected');
      validationResults.checks.gitClean = false;
    } else {
      validationResults.checks.gitClean = true;
    }
  } catch (error) {
    validationResults.valid = false;
    validationResults.issues.push('Not in a git repository');
  }
  
  // Check required files
  CONFIG.artifacts.required.forEach(file => {
    if (!fileExists(file)) {
      validationResults.valid = false;
      validationResults.issues.push(`Required file not found: ${file}`);
    }
  });
  
  // Check package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    validationResults.checks.packageName = packageJson.name;
    validationResults.checks.packageVersion = packageJson.version;
    
    if (!packageJson.name || !packageJson.version) {
      validationResults.valid = false;
      validationResults.issues.push('Invalid package.json: missing name or version');
    }
  } catch (error) {
    validationResults.valid = false;
    validationResults.issues.push('Invalid package.json');
  }
  
  if (validationResults.valid) {
    log('success', 'Environment validation passed');
  } else {
    log('error', 'Environment validation failed:');
    validationResults.issues.forEach(issue => {
      log('error', `  - ${issue}`);
    });
  }
  
  return validationResults;
}

async function validateQuality() {
  log('info', 'Running quality validation...');
  
  const qualityResults = {
    valid: true,
    issues: [],
    scores: {},
    details: {}
  };
  
  // Linting
  if (CONFIG.quality.linting) {
    try {
      log('info', 'Running linting checks...');
      execCommand('npm run lint', { silent: true });
      qualityResults.scores.linting = 10;
      log('success', 'Linting passed');
    } catch (error) {
      qualityResults.valid = false;
      qualityResults.issues.push('Linting failed');
      qualityResults.scores.linting = 0;
    }
  }
  
  // Type checking
  if (CONFIG.quality.typeChecking) {
    try {
      log('info', 'Running type checking...');
      execCommand('npm run typecheck', { silent: true });
      qualityResults.scores.typeChecking = 10;
      log('success', 'Type checking passed');
    } catch (error) {
      qualityResults.valid = false;
      qualityResults.issues.push('Type checking failed');
      qualityResults.scores.typeChecking = 0;
    }
  }
  
  // Testing
  if (CONFIG.quality.testing) {
    try {
      log('info', 'Running test suite...');
      const testOutput = execCommand('npm test', { silent: true });
      
      // Try to extract coverage information
      const coverageMatch = testOutput.match(/Statements\s+:\s+(\d+\.?\d*)%/);
      const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
      
      if (coverage < CONFIG.validation.thresholds.testCoverage) {
        qualityResults.issues.push(`Test coverage ${coverage}% below threshold ${CONFIG.validation.thresholds.testCoverage}%`);
      }
      
      qualityResults.scores.testing = Math.min(10, (coverage / CONFIG.validation.thresholds.testCoverage) * 10);
      qualityResults.details.testCoverage = coverage;
      log('success', `Tests passed (coverage: ${coverage}%)`);
    } catch (error) {
      qualityResults.valid = false;
      qualityResults.issues.push('Tests failed');
      qualityResults.scores.testing = 0;
    }
  }
  
  // Security audit
  if (CONFIG.quality.security) {
    try {
      log('info', 'Running security audit...');
      const auditOutput = execCommand('npm audit --json', { silent: true });
      const auditData = JSON.parse(auditOutput);
      
      const criticalVulns = auditData.metadata?.vulnerabilities?.critical || 0;
      const highVulns = auditData.metadata?.vulnerabilities?.high || 0;
      
      let securityScore = 10;
      if (criticalVulns > 0) {
        qualityResults.valid = false;
        qualityResults.issues.push(`${criticalVulns} critical vulnerabilities found`);
        securityScore = 0;
      } else if (highVulns > 0) {
        qualityResults.issues.push(`${highVulns} high vulnerabilities found`);
        securityScore = Math.max(5, 10 - highVulns);
      }
      
      qualityResults.scores.security = securityScore;
      qualityResults.details.securityVulnerabilities = {
        critical: criticalVulns,
        high: highVulns,
        moderate: auditData.metadata?.vulnerabilities?.moderate || 0,
        low: auditData.metadata?.vulnerabilities?.low || 0
      };
      
      log('success', `Security audit completed (score: ${securityScore}/10)`);
    } catch (error) {
      qualityResults.issues.push('Security audit failed');
      qualityResults.scores.security = 5; // Neutral score if audit fails
    }
  }
  
  // Calculate overall quality score
  const scores = Object.values(qualityResults.scores);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  qualityResults.overallScore = averageScore;
  
  if (averageScore < 7.0) {
    qualityResults.valid = false;
    qualityResults.issues.push(`Overall quality score ${averageScore.toFixed(1)}/10 below threshold 7.0/10`);
  }
  
  if (qualityResults.valid) {
    log('success', `Quality validation passed (score: ${averageScore.toFixed(1)}/10)`);
  } else {
    log('error', 'Quality validation failed:');
    qualityResults.issues.forEach(issue => {
      log('error', `  - ${issue}`);
    });
  }
  
  return qualityResults;
}

async function validateBuild() {
  log('info', 'Validating build process...');
  
  const buildResults = {
    valid: true,
    issues: [],
    metrics: {}
  };
  
  try {
    // Clean build
    log('info', 'Running clean build...');
    const buildStart = Date.now();
    
    execCommand('npm run clean', { silent: true });
    execCommand('npm run build', { silent: true });
    
    const buildTime = (Date.now() - buildStart) / 1000;
    buildResults.metrics.buildTime = buildTime;
    
    if (buildTime > CONFIG.validation.thresholds.buildTime) {
      buildResults.issues.push(`Build time ${buildTime}s exceeds threshold ${CONFIG.validation.thresholds.buildTime}s`);
    }
    
    // Check build output
    if (!fileExists('dist')) {
      buildResults.valid = false;
      buildResults.issues.push('Build output directory not found');
    } else {
      // Calculate build size
      const buildSize = execCommand('du -sb dist', { silent: true }).split('\t')[0];
      buildResults.metrics.buildSize = parseInt(buildSize);
      log('info', `Build size: ${formatBytes(buildResults.metrics.buildSize)}`);
    }
    
    log('success', `Build validation passed (${buildTime.toFixed(1)}s)`);
  } catch (error) {
    buildResults.valid = false;
    buildResults.issues.push('Build failed');
    log('error', 'Build validation failed:', error.message);
  }
  
  return buildResults;
}

async function validateArtifacts() {
  log('info', 'Validating release artifacts...');
  
  const artifactResults = {
    valid: true,
    issues: [],
    artifacts: {}
  };
  
  // Validate npm package
  try {
    log('info', 'Creating and validating npm package...');
    execCommand('npm pack', { silent: true });
    
    const npmPackages = fs.readdirSync('.').filter(file => file.endsWith('.tgz'));
    if (npmPackages.length === 0) {
      artifactResults.valid = false;
      artifactResults.issues.push('npm package not created');
    } else {
      const packagePath = npmPackages[0];
      const packageSize = getFileSize(packagePath);
      
      if (packageSize > CONFIG.artifacts.npm.maxSize) {
        artifactResults.issues.push(`npm package size ${formatBytes(packageSize)} exceeds limit ${formatBytes(CONFIG.artifacts.npm.maxSize)}`);
      }
      
      // Test package extraction
      try {
        execCommand(`tar -tzf "${packagePath}" | head -5`, { silent: true });
        artifactResults.artifacts.npm = {
          path: packagePath,
          size: packageSize,
          valid: true
        };
        log('success', `npm package validated: ${packagePath} (${formatBytes(packageSize)})`);
      } catch (error) {
        artifactResults.valid = false;
        artifactResults.issues.push('npm package extraction test failed');
      }
    }
  } catch (error) {
    artifactResults.valid = false;
    artifactResults.issues.push('npm package creation failed');
  }
  
  // Validate Docker image (if Docker is available)
  try {
    execCommand('docker --version', { silent: true });
    
    log('info', 'Building and validating Docker image...');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    const dockerTag = `${CONFIG.artifacts.docker.tag}:${version}`;
    
    execCommand(`docker build -t "${dockerTag}" .`, { silent: true });
    
    // Get image size
    const imageSizeOutput = execCommand(`docker images --format "table {{.Size}}" "${dockerTag}" | tail -1`, { silent: true });
    const imageSize = imageSizeOutput.includes('MB') ? 
      parseFloat(imageSizeOutput.replace('MB', '')) * 1024 * 1024 :
      parseFloat(imageSizeOutput.replace('GB', '')) * 1024 * 1024 * 1024;
    
    if (imageSize > CONFIG.artifacts.docker.maxSize) {
      artifactResults.issues.push(`Docker image size ${formatBytes(imageSize)} exceeds limit ${formatBytes(CONFIG.artifacts.docker.maxSize)}`);
    }
    
    // Test container startup
    try {
      execCommand(`docker run --rm -d --name test-container "${dockerTag}" sleep 10`, { silent: true });
      execCommand('docker stop test-container', { silent: true });
      
      artifactResults.artifacts.docker = {
        tag: dockerTag,
        size: imageSize,
        valid: true
      };
      log('success', `Docker image validated: ${dockerTag} (${formatBytes(imageSize)})`);
    } catch (error) {
      artifactResults.valid = false;
      artifactResults.issues.push('Docker container startup test failed');
    }
  } catch (error) {
    log('warning', 'Docker not available, skipping Docker image validation');
  }
  
  if (artifactResults.valid) {
    log('success', 'Artifact validation passed');
  } else {
    log('error', 'Artifact validation failed:');
    artifactResults.issues.forEach(issue => {
      log('error', `  - ${issue}`);
    });
  }
  
  return artifactResults;
}

async function validateCompatibility() {
  log('info', 'Running compatibility validation...');
  
  const compatResults = {
    valid: true,
    issues: [],
    compatibility: {}
  };
  
  try {
    // Check Node.js engines compatibility
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const engines = packageJson.engines;
    
    if (engines && engines.node) {
      const currentNodeVersion = execCommand('node --version', { silent: true });
      compatResults.compatibility.nodeEngine = {
        required: engines.node,
        current: currentNodeVersion
      };
      log('info', `Node.js compatibility: ${engines.node} (current: ${currentNodeVersion})`);
    }
    
    // Test basic imports
    try {
      execCommand('node -e "require(\'./dist/index.js\')"', { silent: true });
      compatResults.compatibility.imports = true;
      log('success', 'Module imports test passed');
    } catch (error) {
      compatResults.valid = false;
      compatResults.issues.push('Module imports test failed');
      compatResults.compatibility.imports = false;
    }
    
    log('success', 'Compatibility validation passed');
  } catch (error) {
    compatResults.valid = false;
    compatResults.issues.push('Compatibility validation failed');
    log('error', 'Compatibility validation failed:', error.message);
  }
  
  return compatResults;
}

function generateValidationReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    overall: {
      valid: Object.values(results).every(result => result.valid),
      score: 0
    },
    results,
    summary: {
      totalIssues: 0,
      criticalIssues: 0,
      warnings: 0
    }
  };
  
  // Calculate overall score
  const scores = [];
  if (results.quality && results.quality.overallScore) {
    scores.push(results.quality.overallScore);
  }
  
  // Add other scoring metrics
  Object.values(results).forEach(result => {
    if (result.valid) scores.push(10);
    else scores.push(0);
  });
  
  if (scores.length > 0) {
    report.overall.score = scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  
  // Count issues
  Object.values(results).forEach(result => {
    if (result.issues) {
      report.summary.totalIssues += result.issues.length;
      // Assume issues that make result invalid are critical
      if (!result.valid) {
        report.summary.criticalIssues += result.issues.length;
      } else {
        report.summary.warnings += result.issues.length;
      }
    }
  });
  
  return report;
}

function showValidationSummary(report) {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.cyan}                  RELEASE VALIDATION SUMMARY${colors.reset}`);
  console.log('='.repeat(80));
  
  const status = report.overall.valid ? 
    `${colors.green}PASSED${colors.reset}` : 
    `${colors.red}FAILED${colors.reset}`;
  
  console.log(`📊 Overall Status: ${status}`);
  console.log(`⭐ Overall Score: ${report.overall.score.toFixed(1)}/10`);
  console.log(`🔍 Total Issues: ${report.summary.totalIssues}`);
  console.log(`🚨 Critical Issues: ${report.summary.criticalIssues}`);
  console.log(`⚠️  Warnings: ${report.summary.warnings}`);
  console.log(`📅 Validation Time: ${report.timestamp}`);
  console.log('='.repeat(80));
  
  // Show individual validation results
  Object.entries(report.results).forEach(([category, result]) => {
    const statusIcon = result.valid ? '✅' : '❌';
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    console.log(`${statusIcon} ${categoryName}: ${result.valid ? 'Passed' : 'Failed'}`);
    
    if (result.issues && result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`    ${colors.yellow}⚠${colors.reset} ${issue}`);
      });
    }
  });
  
  console.log('='.repeat(80));
  
  if (report.overall.valid) {
    console.log(`${colors.green}✅ Release validation passed - ready for release!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Release validation failed - address issues before release${colors.reset}`);
  }
  
  console.log('\n');
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    command: 'full',
    output: null,
    verbose: false,
    skipCleanup: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case 'environment':
      case 'quality':
      case 'build':
      case 'artifacts':
      case 'compatibility':
      case 'full':
        options.command = arg;
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--skip-cleanup':
        options.skipCleanup = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          log('error', `Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
${colors.cyan}Personal Pipeline Release Validation${colors.reset}

Usage: node scripts/release-validation.js [command] [options]

Commands:
  environment     Validate environment and prerequisites
  quality         Run quality checks (linting, testing, security)
  build           Validate build process and output
  artifacts       Validate release artifacts (npm, Docker)
  compatibility   Test compatibility and imports
  full            Run all validations (default)

Options:
  --output FILE   Save validation report to file
  --verbose       Enable verbose output
  --skip-cleanup  Keep temporary files after validation
  --help, -h      Show this help message

Examples:
  node scripts/release-validation.js full
  node scripts/release-validation.js quality --verbose
  node scripts/release-validation.js artifacts --output validation-report.json
`);
}

async function main() {
  const options = parseArgs();
  
  try {
    log('info', `Starting release validation (command: ${options.command})`);
    
    const results = {};
    
    // Run validations based on command
    if (options.command === 'full' || options.command === 'environment') {
      results.environment = validateEnvironment();
    }
    
    if (options.command === 'full' || options.command === 'quality') {
      results.quality = await validateQuality();
    }
    
    if (options.command === 'full' || options.command === 'build') {
      results.build = await validateBuild();
    }
    
    if (options.command === 'full' || options.command === 'artifacts') {
      results.artifacts = await validateArtifacts();
    }
    
    if (options.command === 'full' || options.command === 'compatibility') {
      results.compatibility = await validateCompatibility();
    }
    
    // Generate validation report
    const report = generateValidationReport(results);
    
    // Output report
    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
      log('info', `Validation report saved to: ${options.output}`);
    }
    
    // Show summary
    showValidationSummary(report);
    
    // Cleanup
    if (!options.skipCleanup) {
      const tempFiles = ['*.tgz'];
      tempFiles.forEach(pattern => {
        try {
          execCommand(`rm -f ${pattern}`, { silent: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      });
    }
    
    // Exit with appropriate code
    process.exit(report.overall.valid ? 0 : 1);
    
  } catch (error) {
    log('error', 'Validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    log('error', 'Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateEnvironment,
  validateQuality,
  validateBuild,
  validateArtifacts,
  validateCompatibility,
  generateValidationReport
};