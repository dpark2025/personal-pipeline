#!/usr/bin/env node

/**
 * Performance Validation Script
 * 
 * Automated validation of performance targets and system health.
 * Used for CI/CD integration and production readiness checks.
 */

import { PerformanceBenchmark } from './benchmark.js';
import { LoadTestFramework } from './load-test.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Performance validation criteria
const VALIDATION_CRITERIA = {
  response_time: {
    critical_tools_ms: 200,
    standard_tools_ms: 500,
    p95_threshold_ms: 1000,
  },
  throughput: {
    min_rps: 10,
    target_rps: 25,
  },
  reliability: {
    max_error_rate: 0.02, // 2%
    min_availability: 0.99, // 99%
  },
  resource_usage: {
    max_memory_mb: 2048,
    max_cpu_percent: 80,
  },
  cache_performance: {
    min_hit_rate: 0.70, // 70%
    target_hit_rate: 0.85, // 85%
  },
};

class PerformanceValidator {
  constructor(options = {}) {
    this.options = {
      serverUrl: options.serverUrl || 'http://localhost:3000',
      outputDir: options.outputDir || join(__dirname, '..', 'reports'),
      strict: options.strict || false, // Fail on any target miss
      verbose: options.verbose || false,
      ...options
    };

    this.results = {
      timestamp: new Date().toISOString(),
      validation_criteria: VALIDATION_CRITERIA,
      tests_run: [],
      overall_status: 'pending',
      targets_met: 0,
      targets_total: 0,
      critical_issues: [],
      warnings: [],
      recommendations: [],
    };
  }

  /**
   * Run comprehensive performance validation
   */
  async validate() {
    try {
      console.log('🔍 Starting Performance Validation');
      console.log(`Server: ${this.options.serverUrl}`);
      console.log(`Strict Mode: ${this.options.strict ? 'ON' : 'OFF'}\n`);

      // Check server availability
      await this.checkServerHealth();

      // Run baseline performance tests
      await this.runBaselineValidation();

      // Run load testing validation
      await this.runLoadValidation();

      // Run cache performance validation
      await this.runCacheValidation();

      // Run resource usage validation
      await this.runResourceValidation();

      // Analyze overall results
      this.analyzeResults();

      // Generate validation report
      await this.generateReport();

      const success = this.results.overall_status === 'pass';
      console.log(`\n${success ? '✅' : '❌'} Performance Validation ${success ? 'PASSED' : 'FAILED'}`);
      
      return success;

    } catch (error) {
      console.error('❌ Performance validation failed:', error.message);
      this.results.overall_status = 'error';
      this.results.critical_issues.push({
        category: 'validation',
        description: `Validation process failed: ${error.message}`,
        severity: 'critical',
      });
      return false;
    }
  }

  /**
   * Check server health and availability
   */
  async checkServerHealth() {
    console.log('🏥 Checking server health...');

    try {
      const healthResponse = await fetch(`${this.options.serverUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }

      const health = await healthResponse.json();
      if (health.status !== 'healthy') {
        throw new Error(`Server is not healthy: ${health.status}`);
      }

      console.log('   ✅ Server is healthy and available\n');
      
    } catch (error) {
      throw new Error(`Server health check failed: ${error.message}`);
    }
  }

  /**
   * Run baseline performance validation
   */
  async runBaselineValidation() {
    console.log('📊 Running baseline performance validation...');

    const benchmark = new PerformanceBenchmark({
      concurrent: 5,
      duration: 30,
      target: VALIDATION_CRITERIA.response_time.critical_tools_ms,
      cacheTest: true,
      warmup: true,
      verbose: this.options.verbose,
      externalServer: true,
      serverUrl: this.options.serverUrl,
    });

    const benchmarkResults = await benchmark.run();
    this.results.tests_run.push({
      test_type: 'baseline_performance',
      results: benchmarkResults,
    });

    // Validate response time targets
    this.validateResponseTimes(benchmarkResults);

    console.log('   ✅ Baseline performance validation completed\n');
  }

  /**
   * Run load testing validation
   */
  async runLoadValidation() {
    console.log('⚡ Running load testing validation...');

    const loadTest = new LoadTestFramework({
      scenario: 'normal',
      serverUrl: this.options.serverUrl,
      verbose: this.options.verbose,
    });

    const loadResults = await loadTest.run();
    this.results.tests_run.push({
      test_type: 'load_testing',
      results: loadResults,
    });

    // Validate throughput and reliability
    this.validateThroughput(loadResults);
    this.validateReliability(loadResults);

    console.log('   ✅ Load testing validation completed\n');
  }

  /**
   * Run cache performance validation
   */
  async runCacheValidation() {
    console.log('💾 Running cache performance validation...');

    try {
      const metricsResponse = await fetch(`${this.options.serverUrl}/metrics`);
      if (!metricsResponse.ok) {
        throw new Error(`Metrics endpoint failed: ${metricsResponse.status}`);
      }

      const metrics = await metricsResponse.json();
      const cacheStats = metrics.cache;

      if (cacheStats) {
        this.validateCachePerformance(cacheStats);
      } else {
        this.results.warnings.push({
          category: 'cache',
          description: 'Cache statistics not available',
          impact: 'Cannot validate cache performance targets',
        });
      }

      console.log('   ✅ Cache performance validation completed\n');

    } catch (error) {
      this.results.warnings.push({
        category: 'cache',
        description: `Cache validation failed: ${error.message}`,
        impact: 'Cache performance could not be assessed',
      });
    }
  }

  /**
   * Run resource usage validation
   */
  async runResourceValidation() {
    console.log('🧠 Running resource usage validation...');

    try {
      const performanceResponse = await fetch(`${this.options.serverUrl}/performance`);
      if (!performanceResponse.ok) {
        throw new Error(`Performance endpoint failed: ${performanceResponse.status}`);
      }

      const performance = await performanceResponse.json();
      this.validateResourceUsage(performance.performance_report.summary);

      console.log('   ✅ Resource usage validation completed\n');

    } catch (error) {
      this.results.warnings.push({
        category: 'resources',
        description: `Resource validation failed: ${error.message}`,
        impact: 'Resource usage could not be assessed',
      });
    }
  }

  /**
   * Validate response time targets
   */
  validateResponseTimes(benchmarkResults) {
    const baselineResults = benchmarkResults.detailed.baseline;
    if (!baselineResults) return;

    for (const [toolName, results] of Object.entries(baselineResults)) {
      const avgTime = results.response_times.reduce((a, b) => a + b, 0) / results.response_times.length;
      const p95Time = results.percentiles.p95;

      // Critical tools should meet 200ms target
      const isCritical = ['search_runbooks', 'get_decision_tree'].includes(toolName);
      const target = isCritical 
        ? VALIDATION_CRITERIA.response_time.critical_tools_ms
        : VALIDATION_CRITERIA.response_time.standard_tools_ms;

      this.results.targets_total++;

      if (avgTime <= target) {
        this.results.targets_met++;
        if (this.options.verbose) {
          console.log(`   ✅ ${toolName}: ${avgTime.toFixed(0)}ms (target: ${target}ms)`);
        }
      } else {
        const severity = isCritical ? 'critical' : 'warning';
        this.results[severity === 'critical' ? 'critical_issues' : 'warnings'].push({
          category: 'response_time',
          tool: toolName,
          description: `Average response time ${avgTime.toFixed(0)}ms exceeds ${target}ms target`,
          severity,
          impact: isCritical ? 'Critical user experience impact' : 'Performance degradation',
        });

        if (this.options.verbose) {
          console.log(`   ❌ ${toolName}: ${avgTime.toFixed(0)}ms (target: ${target}ms)`);
        }
      }

      // Check P95 threshold
      this.results.targets_total++;
      if (p95Time <= VALIDATION_CRITERIA.response_time.p95_threshold_ms) {
        this.results.targets_met++;
      } else {
        this.results.warnings.push({
          category: 'p95_response_time',
          tool: toolName,
          description: `P95 response time ${p95Time.toFixed(0)}ms exceeds threshold`,
          severity: 'warning',
          impact: 'Poor worst-case performance',
        });
      }
    }
  }

  /**
   * Validate throughput targets
   */
  validateThroughput(loadResults) {
    const summary = loadResults.summary;
    if (!summary) return;

    this.results.targets_total++;

    if (summary.actual_rps >= VALIDATION_CRITERIA.throughput.min_rps) {
      this.results.targets_met++;
      if (this.options.verbose) {
        console.log(`   ✅ Throughput: ${summary.actual_rps.toFixed(1)} RPS (min: ${VALIDATION_CRITERIA.throughput.min_rps})`);
      }
    } else {
      this.results.critical_issues.push({
        category: 'throughput',
        description: `Throughput ${summary.actual_rps.toFixed(1)} RPS below minimum ${VALIDATION_CRITERIA.throughput.min_rps} RPS`,
        severity: 'critical',
        impact: 'Insufficient system capacity for operational load',
      });
    }

    // Check target throughput
    if (summary.actual_rps >= VALIDATION_CRITERIA.throughput.target_rps) {
      this.results.targets_met++;
    } else {
      this.results.warnings.push({
        category: 'throughput_target',
        description: `Throughput ${summary.actual_rps.toFixed(1)} RPS below target ${VALIDATION_CRITERIA.throughput.target_rps} RPS`,
        severity: 'warning',
        impact: 'May not handle peak operational load effectively',
      });
    }

    this.results.targets_total++;
  }

  /**
   * Validate reliability targets
   */
  validateReliability(loadResults) {
    const summary = loadResults.summary;
    if (!summary) return;

    this.results.targets_total++;

    if (summary.error_rate <= VALIDATION_CRITERIA.reliability.max_error_rate) {
      this.results.targets_met++;
      if (this.options.verbose) {
        console.log(`   ✅ Error Rate: ${(summary.error_rate * 100).toFixed(2)}% (max: ${(VALIDATION_CRITERIA.reliability.max_error_rate * 100).toFixed(2)}%)`);
      }
    } else {
      this.results.critical_issues.push({
        category: 'reliability',
        description: `Error rate ${(summary.error_rate * 100).toFixed(2)}% exceeds maximum ${(VALIDATION_CRITERIA.reliability.max_error_rate * 100).toFixed(2)}%`,
        severity: 'critical',
        impact: 'Poor service reliability and user experience',
      });
    }
  }

  /**
   * Validate cache performance
   */
  validateCachePerformance(cacheStats) {
    this.results.targets_total++;

    if (cacheStats.hit_rate >= VALIDATION_CRITERIA.cache_performance.min_hit_rate) {
      this.results.targets_met++;
      if (this.options.verbose) {
        console.log(`   ✅ Cache Hit Rate: ${(cacheStats.hit_rate * 100).toFixed(1)}% (min: ${(VALIDATION_CRITERIA.cache_performance.min_hit_rate * 100).toFixed(1)}%)`);
      }
    } else {
      this.results.critical_issues.push({
        category: 'cache_performance',
        description: `Cache hit rate ${(cacheStats.hit_rate * 100).toFixed(1)}% below minimum ${(VALIDATION_CRITERIA.cache_performance.min_hit_rate * 100).toFixed(1)}%`,
        severity: 'critical',
        impact: 'Poor response time performance due to cache inefficiency',
      });
    }

    // Check target hit rate
    this.results.targets_total++;
    if (cacheStats.hit_rate >= VALIDATION_CRITERIA.cache_performance.target_hit_rate) {
      this.results.targets_met++;
    } else {
      this.results.warnings.push({
        category: 'cache_target',
        description: `Cache hit rate ${(cacheStats.hit_rate * 100).toFixed(1)}% below target ${(VALIDATION_CRITERIA.cache_performance.target_hit_rate * 100).toFixed(1)}%`,
        severity: 'warning',
        impact: 'Sub-optimal cache performance',
      });
    }
  }

  /**
   * Validate resource usage
   */
  validateResourceUsage(metrics) {
    // Memory validation
    this.results.targets_total++;
    if (metrics.resource_usage.memory_mb <= VALIDATION_CRITERIA.resource_usage.max_memory_mb) {
      this.results.targets_met++;
      if (this.options.verbose) {
        console.log(`   ✅ Memory Usage: ${metrics.resource_usage.memory_mb}MB (max: ${VALIDATION_CRITERIA.resource_usage.max_memory_mb}MB)`);
      }
    } else {
      this.results.warnings.push({
        category: 'memory_usage',
        description: `Memory usage ${metrics.resource_usage.memory_mb}MB exceeds maximum ${VALIDATION_CRITERIA.resource_usage.max_memory_mb}MB`,
        severity: 'warning',
        impact: 'High memory usage may impact system stability',
      });
    }

    // CPU validation (if available)
    if (metrics.resource_usage.cpu_percent !== undefined) {
      this.results.targets_total++;
      if (metrics.resource_usage.cpu_percent <= VALIDATION_CRITERIA.resource_usage.max_cpu_percent) {
        this.results.targets_met++;
        if (this.options.verbose) {
          console.log(`   ✅ CPU Usage: ${metrics.resource_usage.cpu_percent.toFixed(1)}% (max: ${VALIDATION_CRITERIA.resource_usage.max_cpu_percent}%)`);
        }
      } else {
        this.results.warnings.push({
          category: 'cpu_usage',
          description: `CPU usage ${metrics.resource_usage.cpu_percent.toFixed(1)}% exceeds maximum ${VALIDATION_CRITERIA.resource_usage.max_cpu_percent}%`,
          severity: 'warning',
          impact: 'High CPU usage may impact response times',
        });
      }
    }
  }

  /**
   * Analyze overall validation results
   */
  analyzeResults() {
    const successRate = this.results.targets_met / this.results.targets_total;
    const hasCriticalIssues = this.results.critical_issues.length > 0;
    const hasWarnings = this.results.warnings.length > 0;

    // Determine overall status
    if (hasCriticalIssues) {
      this.results.overall_status = 'fail';
    } else if (this.options.strict && hasWarnings) {
      this.results.overall_status = 'fail';
    } else if (successRate >= 0.9) {
      this.results.overall_status = 'pass';
    } else if (successRate >= 0.8) {
      this.results.overall_status = hasWarnings ? 'warning' : 'pass';
    } else {
      this.results.overall_status = 'fail';
    }

    // Generate recommendations
    this.generateRecommendations();
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Cache recommendations
    if (this.results.critical_issues.some(issue => issue.category === 'cache_performance')) {
      recommendations.push({
        priority: 'high',
        category: 'caching',
        title: 'Implement cache optimization',
        actions: [
          'Enable cache warming for critical runbooks',
          'Increase TTL for stable content',
          'Monitor cache hit patterns and optimize accordingly',
        ],
      });
    }

    // Response time recommendations
    const slowTools = this.results.critical_issues
      .filter(issue => issue.category === 'response_time')
      .map(issue => issue.tool);

    if (slowTools.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        title: `Optimize slow tools: ${slowTools.join(', ')}`,
        actions: [
          'Profile slow code paths and optimize algorithms',
          'Add database indexing for frequently queried fields',
          'Implement result caching for expensive operations',
        ],
      });
    }

    // Throughput recommendations
    if (this.results.critical_issues.some(issue => issue.category === 'throughput')) {
      recommendations.push({
        priority: 'high',
        category: 'scalability',
        title: 'Improve system throughput',
        actions: [
          'Optimize connection pooling configuration',
          'Implement request queuing and throttling',
          'Consider horizontal scaling options',
        ],
      });
    }

    // Resource recommendations
    if (this.results.warnings.some(warning => warning.category.includes('usage'))) {
      recommendations.push({
        priority: 'medium',
        category: 'resources',
        title: 'Optimize resource usage',
        actions: [
          'Implement memory pooling for large objects',
          'Optimize garbage collection settings',
          'Monitor resource usage trends over time',
        ],
      });
    }

    this.results.recommendations = recommendations;
  }

  /**
   * Generate validation report
   */
  async generateReport() {
    console.log('📋 Generating validation report...');

    // Ensure output directory exists
    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Generate JSON report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = join(this.options.outputDir, `validation-${timestamp}.json`);
    writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    // Print console summary
    this.printSummary();

    console.log(`   📄 Validation report saved: ${jsonPath}`);
  }

  /**
   * Print validation summary
   */
  printSummary() {
    const { overall_status, targets_met, targets_total, critical_issues, warnings } = this.results;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PERFORMANCE VALIDATION SUMMARY');
    console.log('='.repeat(60));

    const statusIcon = {
      pass: '✅',
      warning: '⚠️',
      fail: '❌',
      error: '🚨',
    }[overall_status] || '❓';

    console.log(`\n${statusIcon} Overall Status: ${overall_status.toUpperCase()}`);
    console.log(`🎯 Targets Met: ${targets_met}/${targets_total} (${((targets_met / targets_total) * 100).toFixed(1)}%)`);

    if (critical_issues.length > 0) {
      console.log('\n❌ Critical Issues:');
      critical_issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.description}`);
        if (issue.impact) {
          console.log(`      Impact: ${issue.impact}`);
        }
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning.description}`);
      });
    }

    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        rec.actions.forEach(action => {
          console.log(`      • ${action}`);
        });
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];

    switch (key) {
      case 'server-url':
        options.serverUrl = value;
        break;
      case 'output':
        options.outputDir = value;
        break;
      case 'strict':
        options.strict = true;
        i--; // No value for this flag
        break;
      case 'verbose':
        options.verbose = true;
        i--; // No value for this flag
        break;
      case 'help':
        console.log(`
Performance Validation Script

Usage: node scripts/validate-performance.js [options]

Options:
  --server-url <url>   MCP server URL (default: http://localhost:3000)
  --output <dir>       Output directory for reports
  --strict             Fail on any warnings (default: false)
  --verbose            Detailed validation output
  --help               Show this help message

Exit Codes:
  0    All validation targets met
  1    Validation failed or critical issues found

Examples:
  node scripts/validate-performance.js
  node scripts/validate-performance.js --strict --verbose
  node scripts/validate-performance.js --server-url http://staging:3000
        `);
        process.exit(0);
      default:
        if (key && !value) {
          console.error(`Missing value for option: --${key}`);
          process.exit(1);
        }
    }
  }

  console.log('🔍 Starting Personal Pipeline Performance Validation\n');

  const validator = new PerformanceValidator(options);
  const success = await validator.validate();

  process.exit(success ? 0 : 1);
}

export { PerformanceValidator, VALIDATION_CRITERIA };