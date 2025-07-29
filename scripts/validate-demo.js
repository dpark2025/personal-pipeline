#!/usr/bin/env node
/**
 * Demo Environment Validation Script
 * 
 * Comprehensive validation of all milestone 1.3 features including
 * performance targets, health metrics, cache effectiveness, and
 * system resilience under load.
 * 
 * Authored by: Integration Specialist (Barry)  
 * Date: 2025-07-29
 */

import { performance } from 'perf_hooks';
import { setTimeout } from 'timers/promises';

// Configuration
const CONFIG = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  validationTargets: {
    cachedResponseTime: 200,      // ms
    coldResponseTime: 500,        // ms  
    cacheHitRate: 0.8,           // 80%
    errorRateNormal: 0.01,       // 1%
    errorRateStress: 0.05,       // 5%
    throughputMin: 10,           // req/s
    p95ResponseTime: 500,        // ms
    p99ResponseTime: 1000,       // ms
    memoryUsageMax: 1024,        // MB
    healthCheckTimeout: 30000    // ms
  },
  testScenarios: {
    cachePerformance: {
      queries: [
        'disk space critical alert',
        'memory leak java application', 
        'database connection timeout',
        'ssl certificate expired',
        'network packet loss high'
      ],
      iterations: 3,
      warmupQueries: 2
    },
    loadTesting: {
      concurrentRequests: 25,
      duration: 30000,          // 30 seconds
      rampUpTime: 5000          // 5 seconds
    },
    healthValidation: {
      components: ['server', 'cache', 'sources', 'performance', 'monitoring'],
      timeout: 10000            // 10 seconds per component
    }
  }
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Logging utilities
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}🔄 ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.white}${colors.bright}${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.cyan}📊 ${msg}${colors.reset}`),
  pass: (msg) => console.log(`${colors.green}✅ PASS: ${msg}${colors.reset}`),
  fail: (msg) => console.log(`${colors.red}❌ FAIL: ${msg}${colors.reset}`)
};

// Validation results tracking
const validationResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  warnings: 0,
  results: []
};

// API helper functions
async function apiCall(endpoint, options = {}) {
  try {
    const url = `${CONFIG.serverUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || 10000,
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Request timeout: ${endpoint}`);
    }
    throw error;
  }
}

async function searchRunbooks(query, showTiming = false) {
  const startTime = performance.now();
  
  try {
    const result = await apiCall('/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        type: 'runbooks',
        limit: 5
      })
    });
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    if (showTiming) {
      log.data(`Query: "${query}" - Response time: ${responseTime}ms`);
    }
    
    return { result, responseTime, success: !!result };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    return { result: null, responseTime, success: false, error: error.message };
  }
}

// Validation test functions
function addTest(name, passed, message, details = {}) {
  validationResults.totalTests++;
  if (passed) {
    validationResults.passedTests++;
    log.pass(`${name}: ${message}`);
  } else {
    validationResults.failedTests++;
    log.fail(`${name}: ${message}`);
  }
  
  validationResults.results.push({
    name,
    passed,
    message,
    details,
    timestamp: new Date().toISOString()
  });
}

function addWarning(name, message, details = {}) {
  validationResults.warnings++;
  log.warning(`${name}: ${message}`);
  
  validationResults.results.push({
    name,
    passed: null,
    message,
    details,
    warning: true,
    timestamp: new Date().toISOString()
  });
}

// Validation scenarios
async function validateServerAvailability() {
  log.header('\n🏥 Server Availability Validation');
  log.header('=====================================');
  
  try {
    log.step('Checking server availability...');
    const startTime = performance.now();
    const health = await apiCall('/health');
    const responseTime = performance.now() - startTime;
    
    addTest(
      'Server Availability',
      !!health && health.status === 'healthy',
      `Server ${health ? 'is healthy' : 'is not responding'}`,
      { responseTime: Math.round(responseTime), health }
    );
    
    if (health) {
      addTest(
        'Health Check Response Time',
        responseTime < CONFIG.validationTargets.healthCheckTimeout,
        `Health check responded in ${Math.round(responseTime)}ms (target: <${CONFIG.validationTargets.healthCheckTimeout}ms)`,
        { responseTime: Math.round(responseTime) }
      );
    }
    
    return !!health;
  } catch (error) {
    addTest(
      'Server Availability',
      false,
      `Server is not accessible: ${error.message}`,
      { error: error.message }
    );
    return false;
  }
}

async function validateCachePerformance() {
  log.header('\n💾 Cache Performance Validation');
  log.header('==================================');
  
  const { queries, iterations, warmupQueries } = CONFIG.testScenarios.cachePerformance;
  const coldTimes = [];
  const cachedTimes = [];
  
  for (const query of queries) {
    log.step(`Testing cache performance for: "${query}"`);
    
    // Cold query (cache miss)
    const coldResult = await searchRunbooks(query);
    if (coldResult.success) {
      coldTimes.push(coldResult.responseTime);
      log.data(`Cold query: ${coldResult.responseTime}ms`);
    }
    
    // Warm up cache
    for (let i = 0; i < warmupQueries; i++) {
      await searchRunbooks(query);
      await setTimeout(100);
    }
    
    // Cached queries
    const cachedTimesForQuery = [];
    for (let i = 0; i < iterations; i++) {
      const cachedResult = await searchRunbooks(query);
      if (cachedResult.success) {
        cachedTimesForQuery.push(cachedResult.responseTime);
      }
      await setTimeout(100);
    }
    
    if (cachedTimesForQuery.length > 0) {
      const avgCachedTime = Math.round(cachedTimesForQuery.reduce((a, b) => a + b, 0) / cachedTimesForQuery.length);
      cachedTimes.push(...cachedTimesForQuery);
      log.data(`Cached queries avg: ${avgCachedTime}ms`);
      
      const improvement = coldResult.success ? Math.round(((coldResult.responseTime - avgCachedTime) / coldResult.responseTime) * 100) : 0;
      if (improvement > 0) {
        log.data(`Cache improvement: ${improvement}%`);
      }
    }
  }
  
  // Validate cache performance targets
  const avgColdTime = coldTimes.length > 0 ? Math.round(coldTimes.reduce((a, b) => a + b, 0) / coldTimes.length) : 0;
  const avgCachedTime = cachedTimes.length > 0 ? Math.round(cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length) : 0;
  
  addTest(
    'Cold Response Time',
    avgColdTime <= CONFIG.validationTargets.coldResponseTime,
    `Average cold response time: ${avgColdTime}ms (target: ≤${CONFIG.validationTargets.coldResponseTime}ms)`,
    { avgColdTime, target: CONFIG.validationTargets.coldResponseTime }
  );
  
  addTest(
    'Cached Response Time',
    avgCachedTime <= CONFIG.validationTargets.cachedResponseTime,
    `Average cached response time: ${avgCachedTime}ms (target: ≤${CONFIG.validationTargets.cachedResponseTime}ms)`,
    { avgCachedTime, target: CONFIG.validationTargets.cachedResponseTime }
  );
  
  // Check cache statistics
  try {
    log.step('Checking cache statistics...');
    const cacheStats = await apiCall('/health/cache');
    
    if (cacheStats && typeof cacheStats.hit_rate === 'number') {
      addTest(
        'Cache Hit Rate',
        cacheStats.hit_rate >= CONFIG.validationTargets.cacheHitRate,
        `Cache hit rate: ${(cacheStats.hit_rate * 100).toFixed(1)}% (target: ≥${CONFIG.validationTargets.cacheHitRate * 100}%)`,
        { hitRate: cacheStats.hit_rate, target: CONFIG.validationTargets.cacheHitRate }
      );
      
      addTest(
        'Cache Health',
        cacheStats.memory_cache?.healthy === true,
        `Memory cache healthy: ${cacheStats.memory_cache?.healthy}`,
        { memoryHealthy: cacheStats.memory_cache?.healthy, redisHealthy: cacheStats.redis_cache?.healthy }
      );
    } else {
      addWarning('Cache Statistics', 'Cache statistics not available or invalid format');
    }
  } catch (error) {
    addWarning('Cache Statistics', `Could not retrieve cache statistics: ${error.message}`);
  }
}

async function validateHealthMonitoring() {
  log.header('\n❤️ Health Monitoring Validation');
  log.header('=================================');
  
  const { components, timeout } = CONFIG.testScenarios.healthValidation;
  
  // Test detailed health endpoint
  try {
    log.step('Checking detailed health monitoring...');
    const detailedHealth = await apiCall('/health/detailed', { timeout });
    
    if (detailedHealth) {
      for (const component of components) {
        const componentHealth = detailedHealth[component];
        if (componentHealth) {
          const isHealthy = componentHealth.healthy === true || 
                           (componentHealth.healthy_count >= 0 && componentHealth.total_count > 0);
          
          addTest(
            `${component.charAt(0).toUpperCase() + component.slice(1)} Health`,
            isHealthy,
            `${component} health status: ${isHealthy ? 'healthy' : 'unhealthy'}`,
            componentHealth
          );
        } else {
          addWarning(`${component} Health`, `No health data available for ${component}`);
        }
      }
    } else {
      addTest('Detailed Health Check', false, 'Detailed health endpoint not accessible');
    }
  } catch (error) {
    addTest('Health Monitoring', false, `Health monitoring failed: ${error.message}`);
  }
  
  // Test monitoring alerts
  try {
    log.step('Checking monitoring alerts system...');
    const monitoringStatus = await apiCall('/monitoring/status', { timeout: 5000 });
    
    if (monitoringStatus) {
      addTest(
        'Monitoring System',
        monitoringStatus.enabled === true && monitoringStatus.running === true,
        `Monitoring system: ${monitoringStatus.running ? 'running' : 'not running'}`,
        monitoringStatus
      );
      
      const alerts = await apiCall('/monitoring/alerts', { timeout: 5000 });
      if (alerts) {
        log.data(`Active alerts: ${alerts.active_alerts?.length || 0}`);
        log.data(`Total alerts: ${alerts.total_alerts || 0}`);
      }
    }
  } catch (error) {
    addWarning('Alerts System', `Could not check alerts system: ${error.message}`);
  }
}

async function validatePerformanceMetrics() {
  log.header('\n📊 Performance Metrics Validation');
  log.header('===================================');
  
  try {
    log.step('Fetching comprehensive performance metrics...');
    const perfMetrics = await apiCall('/performance');
    
    if (!perfMetrics) {
      addTest('Performance Metrics', false, 'Performance metrics endpoint not accessible');
      return;
    }
    
    // Response time validation
    if (perfMetrics.response_times) {
      const { avg_ms, p95_ms, p99_ms, max_ms } = perfMetrics.response_times;
      
      addTest(
        'P95 Response Time',
        p95_ms <= CONFIG.validationTargets.p95ResponseTime,
        `P95 response time: ${p95_ms.toFixed(1)}ms (target: ≤${CONFIG.validationTargets.p95ResponseTime}ms)`,
        { p95: p95_ms, target: CONFIG.validationTargets.p95ResponseTime }
      );
      
      addTest(
        'P99 Response Time',
        p99_ms <= CONFIG.validationTargets.p99ResponseTime,
        `P99 response time: ${p99_ms.toFixed(1)}ms (target: ≤${CONFIG.validationTargets.p99ResponseTime}ms)`,
        { p99: p99_ms, target: CONFIG.validationTargets.p99ResponseTime }
      );
      
      log.data(`Average response time: ${avg_ms.toFixed(1)}ms`);
      log.data(`Max response time: ${max_ms.toFixed(1)}ms`);
    }
    
    // Throughput validation
    if (perfMetrics.throughput) {
      const { requests_per_second } = perfMetrics.throughput;
      
      if (requests_per_second > 0) {
        addTest(
          'Throughput',
          requests_per_second >= CONFIG.validationTargets.throughputMin,
          `Throughput: ${requests_per_second.toFixed(1)} req/s (target: ≥${CONFIG.validationTargets.throughputMin} req/s)`,
          { throughput: requests_per_second, target: CONFIG.validationTargets.throughputMin }
        );
      } else {
        addWarning('Throughput', 'No requests processed yet, throughput validation skipped');
      }
    }
    
    // Error rate validation
    if (perfMetrics.error_tracking) {
      const { error_rate, total_errors } = perfMetrics.error_tracking;
      
      addTest(
        'Error Rate',
        error_rate <= CONFIG.validationTargets.errorRateNormal,
        `Error rate: ${(error_rate * 100).toFixed(2)}% (target: ≤${CONFIG.validationTargets.errorRateNormal * 100}%)`,
        { errorRate: error_rate, target: CONFIG.validationTargets.errorRateNormal }
      );
      
      log.data(`Total errors: ${total_errors}`);
    }
    
    // Resource usage validation
    if (perfMetrics.resource_usage) {
      const { memory_mb, heap_used_mb, cpu_percent } = perfMetrics.resource_usage;
      
      addTest(
        'Memory Usage',
        memory_mb <= CONFIG.validationTargets.memoryUsageMax,
        `Memory usage: ${memory_mb}MB (target: ≤${CONFIG.validationTargets.memoryUsageMax}MB)`,
        { memoryUsage: memory_mb, target: CONFIG.validationTargets.memoryUsageMax }
      );
      
      log.data(`Heap used: ${heap_used_mb}MB`);
      log.data(`CPU usage: ${cpu_percent}%`);
    }
    
  } catch (error) {
    addTest('Performance Metrics', false, `Performance metrics validation failed: ${error.message}`);
  }
}

async function validateCircuitBreakers() {
  log.header('\n⚡ Circuit Breaker Validation');
  log.header('==============================');
  
  try {
    log.step('Checking circuit breaker status...');
    const circuitBreakers = await apiCall('/circuit-breakers');
    
    if (circuitBreakers && circuitBreakers.circuit_breakers) {
      const breakers = circuitBreakers.circuit_breakers;
      
      addTest(
        'Circuit Breakers Available',
        breakers.length > 0,
        `Found ${breakers.length} circuit breakers`,
        { count: breakers.length }
      );
      
      let healthyBreakers = 0;
      breakers.forEach(breaker => {
        const isHealthy = breaker.state === 'closed' || breaker.state === 'half-open';
        if (isHealthy) healthyBreakers++;
        
        log.data(`${breaker.name}: ${breaker.state} (failures: ${breaker.failure_count}/${breaker.failure_threshold})`);
      });
      
      addTest(
        'Circuit Breaker Health',
        healthyBreakers === breakers.length,
        `${healthyBreakers}/${breakers.length} circuit breakers in healthy state`,
        { healthy: healthyBreakers, total: breakers.length }
      );
      
    } else {
      addWarning('Circuit Breakers', 'Circuit breaker information not available');
    }
  } catch (error) {
    addWarning('Circuit Breakers', `Could not check circuit breakers: ${error.message}`);
  }
}

async function validateLoadTesting() {
  log.header('\n🏋️ Load Testing Validation');
  log.header('============================');
  
  log.step('Running controlled load test...');
  log.info('This test validates system behavior under concurrent load');
  
  const { concurrentRequests, duration } = CONFIG.testScenarios.loadTesting;
  const queries = CONFIG.testScenarios.cachePerformance.queries;
  
  const startTime = performance.now();
  const results = [];
  const promises = [];
  
  // Generate concurrent requests
  for (let i = 0; i < concurrentRequests; i++) {
    const query = queries[i % queries.length];
    promises.push(searchRunbooks(query, false));
    
    // Stagger requests slightly to simulate real load
    if (i < concurrentRequests - 1) {
      await setTimeout(Math.random() * 100);
    }
  }
  
  // Wait for all requests to complete
  const loadResults = await Promise.allSettled(promises);
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  // Analyze results
  const successful = loadResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = loadResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
  const errorRate = failed / (successful + failed);
  
  const responseTimes = loadResults
    .filter(r => r.status === 'fulfilled' && r.value.success)
    .map(r => r.value.responseTime);
  
  const avgResponseTime = responseTimes.length > 0 ? 
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
  
  const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
  const throughput = (successful + failed) / (totalTime / 1000);
  
  log.data(`Load test completed in ${Math.round(totalTime)}ms`);
  log.data(`Successful requests: ${successful}`);
  log.data(`Failed requests: ${failed}`);
  log.data(`Average response time: ${Math.round(avgResponseTime)}ms`);
  log.data(`Max response time: ${Math.round(maxResponseTime)}ms`);
  log.data(`Throughput: ${throughput.toFixed(1)} req/s`);
  
  // Validate load test results
  addTest(
    'Load Test Success Rate',
    errorRate <= CONFIG.validationTargets.errorRateStress,
    `Error rate under load: ${(errorRate * 100).toFixed(1)}% (target: ≤${CONFIG.validationTargets.errorRateStress * 100}%)`,
    { errorRate, successful, failed }
  );
  
  addTest(
    'Load Test Response Time',
    avgResponseTime <= CONFIG.validationTargets.p95ResponseTime * 2, // Allow 2x normal response time under load
    `Average response time under load: ${Math.round(avgResponseTime)}ms (target: ≤${CONFIG.validationTargets.p95ResponseTime * 2}ms)`,
    { avgResponseTime, target: CONFIG.validationTargets.p95ResponseTime * 2 }
  );
  
  addTest(
    'Load Test Throughput',
    throughput >= CONFIG.validationTargets.throughputMin,
    `Throughput under load: ${throughput.toFixed(1)} req/s (target: ≥${CONFIG.validationTargets.throughputMin} req/s)`,
    { throughput, target: CONFIG.validationTargets.throughputMin }
  );
}

async function generateValidationReport() {
  log.header('\n📋 Validation Report');
  log.header('====================');
  
  const passRate = (validationResults.passedTests / validationResults.totalTests * 100).toFixed(1);
  const timestamp = new Date().toISOString();
  
  console.log();
  log.data(`Total Tests: ${validationResults.totalTests}`);
  log.data(`Passed: ${validationResults.passedTests}`);
  log.data(`Failed: ${validationResults.failedTests}`);
  log.data(`Warnings: ${validationResults.warnings}`);
  log.data(`Pass Rate: ${passRate}%`);
  console.log();
  
  if (validationResults.passedTests === validationResults.totalTests) {
    log.success('🎉 ALL VALIDATIONS PASSED! Demo environment meets all milestone 1.3 targets.');
  } else if (passRate >= 80) {
    log.warning(`⚠️ Most validations passed (${passRate}%). Review failed tests for optimization opportunities.`);
  } else {
    log.error(`❌ Validation failed (${passRate}% pass rate). Demo environment needs attention.`);
  }
  
  // Generate detailed report
  const report = {
    timestamp,
    summary: {
      totalTests: validationResults.totalTests,
      passedTests: validationResults.passedTests,
      failedTests: validationResults.failedTests,
      warnings: validationResults.warnings,
      passRate: parseFloat(passRate)
    },
    targets: CONFIG.validationTargets,
    results: validationResults.results,
    environment: {
      serverUrl: CONFIG.serverUrl,
      nodeVersion: process.version,
      platform: process.platform
    }
  };
  
  // Save report to file
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const reportPath = path.join(process.cwd(), 'validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    log.info(`Detailed report saved: ${reportPath}`);
  } catch (error) {
    log.warning(`Could not save detailed report: ${error.message}`);
  }
  
  return validationResults.failedTests === 0;
}

// Main validation function
async function main() {
  try {
    log.header('🚀 Personal Pipeline MCP Server - Demo Validation');
    log.header('===================================================');
    console.log('Comprehensive validation of all milestone 1.3 features and performance targets.\n');
    
    // Server availability is prerequisite for all other tests
    const serverAvailable = await validateServerAvailability();
    if (!serverAvailable) {
      log.error('Server is not available. Please ensure the demo environment is running:');
      log.info('./scripts/setup-demo.sh');
      process.exit(1);
    }
    
    // Run all validation scenarios
    await validateCachePerformance();
    await validateHealthMonitoring();  
    await validatePerformanceMetrics();
    await validateCircuitBreakers();
    await validateLoadTesting();
    
    // Generate final report
    const allPassed = await generateValidationReport();
    
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      log.success('Demo environment validation completed successfully! 🎉');
      process.exit(0);
    } else {
      log.warning('Demo environment validation completed with issues. ⚠️');
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`Validation failed with unexpected error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Validation interrupted. Goodbye!');
  process.exit(0);
});

// Export for testing
export { validateServerAvailability, validateCachePerformance, CONFIG };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}