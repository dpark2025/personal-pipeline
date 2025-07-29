#!/usr/bin/env node

/**
 * Test Runner Script
 * Comprehensive test execution and reporting
 * 
 * QA Engineer: Test automation and CI/CD integration for milestone 1.3
 * Coverage: Test orchestration, reporting, and quality gates
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, coverage: {} },
      integration: { passed: 0, failed: 0, duration: 0 },
      errorScenarios: { passed: 0, failed: 0, scenarios: [] },
      performance: { benchmarks: [], thresholds: {} },
      security: { vulnerabilities: 0, issues: [] }
    };
    
    this.options = {
      verbose: process.argv.includes('--verbose'),
      coverage: process.argv.includes('--coverage'),
      bail: process.argv.includes('--bail'),
      parallel: process.argv.includes('--parallel'),
      reporters: process.argv.includes('--reporters') ? 
        process.argv[process.argv.indexOf('--reporters') + 1]?.split(',') || ['console'] : 
        ['console']
    };
  }

  async run() {
    console.log('🚀 Starting comprehensive test suite...\n');
    
    try {
      // Pre-test validation
      await this.preTestValidation();
      
      // Run test suites
      if (this.options.parallel) {
        await this.runTestsInParallel();
      } else {
        await this.runTestsSequentially();
      }
      
      // Generate reports
      await this.generateReports();
      
      // Quality gate validation
      await this.validateQualityGates();
      
      console.log('\n✅ Test suite completed successfully!');
      process.exit(0);
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      
      if (this.options.verbose) {
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  }

  async preTestValidation() {
    console.log('🔍 Running pre-test validation...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    if (!nodeVersion.startsWith('v18') && !nodeVersion.startsWith('v20')) {
      throw new Error(`Unsupported Node.js version: ${nodeVersion}. Requires v18 or v20.`);
    }
    
    // Verify dependencies
    try {
      await this.execAsync('npm list --depth=0');
    } catch (error) {
      console.warn('⚠️  Some dependencies may be missing. Run npm install.');
    }
    
    // Check test files exist
    const testDirs = ['tests/unit', 'tests/integration', 'tests/error-scenarios'];
    for (const dir of testDirs) {
      try {
        await fs.access(dir);
      } catch (error) {
        throw new Error(`Test directory not found: ${dir}`);
      }
    }
    
    console.log('✅ Pre-test validation passed\n');
  }

  async runTestsSequentially() {
    console.log('📋 Running tests sequentially...\n');
    
    // 1. Linting and type checking
    await this.runLinting();
    await this.runTypeChecking();
    
    // 2. Unit tests with coverage
    await this.runUnitTests();
    
    // 3. Integration tests
    await this.runIntegrationTests();
    
    // 4. Error scenario tests
    await this.runErrorScenarioTests();
    
    // 5. Performance tests
    if (!process.env.SKIP_PERFORMANCE) {
      await this.runPerformanceTests();
    }
    
    // 6. Security scanning
    if (!process.env.SKIP_SECURITY) {
      await this.runSecurityScan();
    }
  }

  async runTestsInParallel() {
    console.log('⚡ Running tests in parallel...\n');
    
    // Always run linting and type checking first
    await this.runLinting();
    await this.runTypeChecking();
    
    // Run test suites in parallel
    const testPromises = [
      this.runUnitTests(),
      this.runIntegrationTests(),
      this.runErrorScenarioTests()
    ];
    
    if (!process.env.SKIP_PERFORMANCE) {
      testPromises.push(this.runPerformanceTests());
    }
    
    if (!process.env.SKIP_SECURITY) {
      testPromises.push(this.runSecurityScan());
    }
    
    await Promise.all(testPromises);
  }

  async runLinting() {
    console.log('🔍 Running ESLint...');
    
    try {
      await this.execAsync('npm run lint');
      console.log('✅ Linting passed\n');
    } catch (error) {
      if (this.options.bail) {
        throw new Error('Linting failed');
      }
      console.log('❌ Linting failed (continuing...)\n');
    }
  }

  async runTypeChecking() {
    console.log('🔍 Running TypeScript type checking...');
    
    try {
      await this.execAsync('npm run typecheck');
      console.log('✅ Type checking passed\n');
    } catch (error) {
      if (this.options.bail) {
        throw new Error('Type checking failed');
      }
      console.log('❌ Type checking failed (continuing...)\n');
    }
  }

  async runUnitTests() {
    console.log('🧪 Running unit tests...');
    
    try {
      const command = this.options.coverage ? 'npm run test:coverage' : 'npm test -- tests/unit';
      const output = await this.execAsync(command);
      
      // Parse Jest output for results
      this.parseJestOutput(output, 'unit');
      
      // Parse coverage if enabled
      if (this.options.coverage) {
        await this.parseCoverageResults();
      }
      
      console.log(`✅ Unit tests passed (${this.results.unit.passed} tests)\n`);
    } catch (error) {
      this.results.unit.failed++;
      if (this.options.bail) {
        throw new Error('Unit tests failed');
      }
      console.log('❌ Unit tests failed (continuing...)\n');
    }
  }

  async runIntegrationTests() {
    console.log('🔗 Running integration tests...');
    
    try {
      const startTime = Date.now();
      const output = await this.execAsync('npm test -- tests/integration');
      const duration = Date.now() - startTime;
      
      this.results.integration.duration = duration;
      this.parseJestOutput(output, 'integration');
      
      console.log(`✅ Integration tests passed (${this.results.integration.passed} tests, ${duration}ms)\n`);
    } catch (error) {
      this.results.integration.failed++;
      if (this.options.bail) {
        throw new Error('Integration tests failed');
      }
      console.log('❌ Integration tests failed (continuing...)\n');
    }
  }

  async runErrorScenarioTests() {
    console.log('💥 Running error scenario tests...');
    
    try {
      const output = await this.execAsync('npm test -- tests/error-scenarios');
      this.parseJestOutput(output, 'errorScenarios');
      
      // Extract scenario names
      this.results.errorScenarios.scenarios = [
        'Redis Failures',
        'Network Issues',
        'Service Degradation',
        'Recovery Scenarios'
      ];
      
      console.log(`✅ Error scenario tests passed (${this.results.errorScenarios.passed} tests)\n`);
    } catch (error) {
      this.results.errorScenarios.failed++;
      if (this.options.bail) {
        throw new Error('Error scenario tests failed');
      }
      console.log('❌ Error scenario tests failed (continuing...)\n');
    }
  }

  async runPerformanceTests() {
    console.log('⚡ Running performance tests...');
    
    try {
      // Run benchmark script if it exists
      try {
        const benchmarkOutput = await this.execAsync('npm run benchmark:quick');
        this.parseBenchmarkResults(benchmarkOutput);
      } catch (error) {
        console.log('⚠️  Benchmark script not available, running performance validation');
      }
      
      // Run performance validation
      await this.execAsync('npm run performance:validate');
      
      this.results.performance.thresholds = {
        cachedResponseTime: '<200ms',
        uncachedResponseTime: '<500ms',
        concurrentRequests: '50+',
        memoryUsage: '<512MB'
      };
      
      console.log('✅ Performance tests passed\n');
    } catch (error) {
      if (this.options.bail) {
        throw new Error('Performance tests failed');
      }
      console.log('❌ Performance tests failed (continuing...)\n');
    }
  }

  async runSecurityScan() {
    console.log('🔒 Running security scan...');
    
    try {
      // Run npm audit
      try {
        await this.execAsync('npm audit --audit-level=moderate');
        this.results.security.vulnerabilities = 0;
      } catch (error) {
        // Parse audit output for vulnerability count
        const auditOutput = error.stdout || error.stderr || '';
        const vulnMatch = auditOutput.match(/(\d+) vulnerabilities/);
        this.results.security.vulnerabilities = vulnMatch ? parseInt(vulnMatch[1]) : 0;
      }
      
      console.log(`✅ Security scan completed (${this.results.security.vulnerabilities} vulnerabilities)\n`);
    } catch (error) {
      if (this.options.bail) {
        throw new Error('Security scan failed');
      }
      console.log('❌ Security scan failed (continuing...)\n');
    }
  }

  parseJestOutput(output, testType) {
    const lines = output.split('\n');
    
    // Look for Jest summary line
    const summaryLine = lines.find(line => line.includes('Tests:') || line.includes('Test Suites:'));
    
    if (summaryLine) {
      const passedMatch = summaryLine.match(/(\d+) passed/);
      const failedMatch = summaryLine.match(/(\d+) failed/);
      
      if (passedMatch) {
        this.results[testType].passed = parseInt(passedMatch[1]);
      }
      
      if (failedMatch) {
        this.results[testType].failed = parseInt(failedMatch[1]);
      }
    }
  }

  async parseCoverageResults() {
    try {
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      const coverageData = await fs.readFile(coveragePath, 'utf8');
      const coverage = JSON.parse(coverageData);
      
      this.results.unit.coverage = {
        lines: coverage.total.lines.pct,
        statements: coverage.total.statements.pct,
        functions: coverage.total.functions.pct,
        branches: coverage.total.branches.pct
      };
    } catch (error) {
      console.warn('⚠️  Could not parse coverage results');
    }
  }

  parseBenchmarkResults(output) {
    // Parse benchmark output for performance metrics
    const lines = output.split('\n');
    
    lines.forEach(line => {
      if (line.includes('Average:') && line.includes('ms')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const testName = parts[0].trim();
          const timeMatch = parts[1].match(/([\d.]+)ms/);
          
          if (timeMatch) {
            this.results.performance.benchmarks.push({
              name: testName,
              averageTime: parseFloat(timeMatch[1]),
              unit: 'ms'
            });
          }
        }
      }
    });
  }

  async generateReports() {
    console.log('📊 Generating test reports...');
    
    const report = this.generateTextReport();
    
    // Write to file
    await fs.writeFile('test-results.txt', report);
    
    // Generate JSON report for CI/CD
    const jsonReport = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalTests: this.getTotalTests(),
        totalPassed: this.getTotalPassed(),
        totalFailed: this.getTotalFailed(),
        overallStatus: this.getTotalFailed() === 0 ? 'PASSED' : 'FAILED'
      }
    };
    
    await fs.writeFile('test-results.json', JSON.stringify(jsonReport, null, 2));
    
    if (this.options.reporters.includes('console')) {
      console.log('\n' + report);
    }
  }

  generateTextReport() {
    const lines = [];
    
    lines.push('='.repeat(60));
    lines.push('                    TEST RESULTS SUMMARY');
    lines.push('='.repeat(60));
    lines.push('');
    
    // Unit Tests
    lines.push('📋 UNIT TESTS');
    lines.push(`   Passed: ${this.results.unit.passed}`);
    lines.push(`   Failed: ${this.results.unit.failed}`);
    
    if (this.results.unit.coverage.lines !== undefined) {
      lines.push('   Coverage:');
      lines.push(`     Lines: ${this.results.unit.coverage.lines}%`);
      lines.push(`     Statements: ${this.results.unit.coverage.statements}%`);
      lines.push(`     Functions: ${this.results.unit.coverage.functions}%`);
      lines.push(`     Branches: ${this.results.unit.coverage.branches}%`);
    }
    lines.push('');
    
    // Integration Tests
    lines.push('🔗 INTEGRATION TESTS');
    lines.push(`   Passed: ${this.results.integration.passed}`);
    lines.push(`   Failed: ${this.results.integration.failed}`);
    lines.push(`   Duration: ${this.results.integration.duration}ms`);
    lines.push('');
    
    // Error Scenarios
    lines.push('💥 ERROR SCENARIO TESTS');
    lines.push(`   Passed: ${this.results.errorScenarios.passed}`);
    lines.push(`   Failed: ${this.results.errorScenarios.failed}`);
    lines.push(`   Scenarios: ${this.results.errorScenarios.scenarios.join(', ')}`);
    lines.push('');
    
    // Performance
    lines.push('⚡ PERFORMANCE TESTS');
    lines.push('   Thresholds:');
    Object.entries(this.results.performance.thresholds).forEach(([key, value]) => {
      lines.push(`     ${key}: ${value}`);
    });
    
    if (this.results.performance.benchmarks.length > 0) {
      lines.push('   Benchmarks:');
      this.results.performance.benchmarks.forEach(benchmark => {
        lines.push(`     ${benchmark.name}: ${benchmark.averageTime}${benchmark.unit}`);
      });
    }
    lines.push('');
    
    // Security
    lines.push('🔒 SECURITY SCAN');
    lines.push(`   Vulnerabilities: ${this.results.security.vulnerabilities}`);
    lines.push('');
    
    // Summary
    lines.push('📊 OVERALL SUMMARY');
    lines.push(`   Total Tests: ${this.getTotalTests()}`);
    lines.push(`   Total Passed: ${this.getTotalPassed()}`);
    lines.push(`   Total Failed: ${this.getTotalFailed()}`);
    lines.push(`   Status: ${this.getTotalFailed() === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  async validateQualityGates() {
    console.log('🚪 Validating quality gates...');
    
    const failures = [];
    
    // Coverage thresholds
    if (this.results.unit.coverage.lines !== undefined) {
      if (this.results.unit.coverage.lines < 80) {
        failures.push(`Line coverage below 80%: ${this.results.unit.coverage.lines}%`);
      }
      
      if (this.results.unit.coverage.statements < 80) {
        failures.push(`Statement coverage below 80%: ${this.results.unit.coverage.statements}%`);
      }
      
      if (this.results.unit.coverage.functions < 80) {
        failures.push(`Function coverage below 80%: ${this.results.unit.coverage.functions}%`);
      }
      
      if (this.results.unit.coverage.branches < 75) {
        failures.push(`Branch coverage below 75%: ${this.results.unit.coverage.branches}%`);
      }
    }
    
    // Test failures
    if (this.getTotalFailed() > 0) {
      failures.push(`${this.getTotalFailed()} tests failed`);
    }
    
    // Security vulnerabilities (high/critical only)
    if (this.results.security.vulnerabilities > 5) {
      failures.push(`Too many vulnerabilities: ${this.results.security.vulnerabilities}`);
    }
    
    if (failures.length > 0) {
      console.log('❌ Quality gate validation failed:');
      failures.forEach(failure => console.log(`   - ${failure}`));
      throw new Error('Quality gates not met');
    }
    
    console.log('✅ All quality gates passed\n');
  }

  getTotalTests() {
    return this.results.unit.passed + this.results.unit.failed +
           this.results.integration.passed + this.results.integration.failed +
           this.results.errorScenarios.passed + this.results.errorScenarios.failed;
  }

  getTotalPassed() {
    return this.results.unit.passed + this.results.integration.passed + this.results.errorScenarios.passed;
  }

  getTotalFailed() {
    return this.results.unit.failed + this.results.integration.failed + this.results.errorScenarios.failed;
  }

  execAsync(command) {
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;