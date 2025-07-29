#!/usr/bin/env node
/**
 * Interactive Demo Walkthrough for Personal Pipeline MCP Server
 * 
 * Comprehensive demonstration of all milestone 1.3 features including
 * caching performance, health monitoring, circuit breakers, and load testing.
 * 
 * Authored by: Integration Specialist (Barry)
 * Date: 2025-07-29
 */

import readline from 'readline';
import { performance } from 'perf_hooks';
import { setTimeout } from 'timers/promises';

// Configuration
const CONFIG = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  scenarios: [
    {
      name: 'Cache Performance Demo',
      description: 'Demonstrate cache hit/miss performance with repeated queries',
      weight: 'high'
    },
    {
      name: 'Health Monitoring Demo', 
      description: 'Show real-time health metrics and monitoring alerts',
      weight: 'medium'
    },
    {
      name: 'Load Testing Demo',
      description: 'Demonstrate system behavior under load with circuit breakers',
      weight: 'high'
    },
    {
      name: 'Circuit Breaker Demo',
      description: 'Show circuit breaker activation and recovery',
      weight: 'medium'
    },
    {
      name: 'Performance Metrics Demo',
      description: 'Display comprehensive performance analytics',
      weight: 'medium'
    }
  ]
};

// Color codes
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

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}🔄 ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.white}${colors.bright}${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.cyan}📊 ${msg}${colors.reset}`)
};

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

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
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    log.error(`API call failed: ${error.message}`);
    return null;
  }
}

async function searchRunbooks(query, showTiming = true) {
  const startTime = performance.now();
  
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
  
  return { result, responseTime };
}

// Demo scenarios
async function cachePerformanceDemo() {
  log.header('\n🚀 Cache Performance Demo');
  log.header('==========================');
  console.log('This demo shows the difference between cache hits and misses.');
  console.log('First query will be slower (cache miss), subsequent queries will be faster (cache hits).\n');
  
  await question('Press Enter to start cache performance demo...');
  
  const queries = [
    'disk space critical alert',
    'memory leak detection',
    'database performance issues',
    'network connectivity problems'
  ];
  
  for (const query of queries) {
    log.step(`Testing query: "${query}"`);
    
    // First query (likely cache miss)
    const { responseTime: firstTime } = await searchRunbooks(query);
    
    // Wait a moment
    await setTimeout(500);
    
    // Second query (should be cache hit)
    const { responseTime: secondTime } = await searchRunbooks(query);
    
    const improvement = Math.round(((firstTime - secondTime) / firstTime) * 100);
    
    if (improvement > 0) {
      log.success(`Cache improvement: ${improvement}% faster (${firstTime}ms → ${secondTime}ms)`);
    } else {
      log.info(`Response times: ${firstTime}ms → ${secondTime}ms`);
    }
    
    console.log();
  }
  
  // Show cache statistics
  log.step('Fetching cache statistics...');
  const cacheStats = await apiCall('/health/cache');
  if (cacheStats) {
    log.data(`Cache hit rate: ${(cacheStats.hit_rate * 100).toFixed(1)}%`);
    log.data(`Total cache operations: ${cacheStats.total_operations}`);
    log.data(`Memory cache healthy: ${cacheStats.memory_cache.healthy}`);
    if (cacheStats.redis_cache) {
      log.data(`Redis cache healthy: ${cacheStats.redis_cache.healthy}`);
    }
  }
}

async function healthMonitoringDemo() {
  log.header('\n❤️ Health Monitoring Demo');
  log.header('===========================');
  console.log('This demo shows comprehensive health monitoring including cache, performance, and system metrics.\n');
  
  await question('Press Enter to start health monitoring demo...');
  
  // Overall health
  log.step('Checking overall system health...');
  const health = await apiCall('/health');
  if (health) {
    log.data(`System status: ${health.status}`);
    log.data(`Uptime: ${Math.round(health.uptime / 1000)}s`);
    log.data(`Version: ${health.version}`);
  }
  
  // Detailed health
  log.step('Fetching detailed health metrics...');
  const detailedHealth = await apiCall('/health/detailed');
  if (detailedHealth) {
    log.data(`Server healthy: ${detailedHealth.server.healthy}`);
    log.data(`Cache healthy: ${detailedHealth.cache.healthy}`);
    log.data(`Sources healthy: ${detailedHealth.sources.healthy_count}/${detailedHealth.sources.total_count}`);
    log.data(`Performance healthy: ${detailedHealth.performance.healthy}`);
  }
  
  // Performance health
  log.step('Checking performance health...');
  const perfHealth = await apiCall('/health/performance');
  if (perfHealth) {
    log.data(`Average response time: ${perfHealth.avg_response_time_ms.toFixed(1)}ms`);
    log.data(`P95 response time: ${perfHealth.p95_response_time_ms.toFixed(1)}ms`);
    log.data(`Error rate: ${(perfHealth.error_rate * 100).toFixed(2)}%`);
    log.data(`Requests per second: ${perfHealth.requests_per_second.toFixed(1)}`);
  }
  
  // Monitoring alerts
  log.step('Checking monitoring alerts...');
  const alerts = await apiCall('/monitoring/alerts');
  if (alerts && alerts.active_alerts) {
    if (alerts.active_alerts.length > 0) {
      log.warning(`${alerts.active_alerts.length} active alerts`);
      alerts.active_alerts.forEach(alert => {
        log.data(`  ${alert.severity.toUpperCase()}: ${alert.title}`);
      });
    } else {
      log.success('No active alerts');
    }
  }
}

async function loadTestingDemo() {
  log.header('\n🏋️ Load Testing Demo');
  log.header('=====================');
  console.log('This demo runs a controlled load test to show system behavior under stress.\n');
  
  const shouldRun = await question('Run load test? This will stress the system (y/N): ');
  if (shouldRun.toLowerCase() !== 'y') {
    log.info('Skipping load testing demo');
    return;
  }
  
  log.step('Starting controlled load test...');
  log.info('Generating concurrent requests to test system limits...');
  
  const concurrentRequests = 20;
  const requestBatches = 3;
  const queries = [
    'critical disk space',
    'memory leak java',
    'database connection timeout',
    'ssl certificate expired',
    'network packet loss'
  ];
  
  for (let batch = 1; batch <= requestBatches; batch++) {
    log.step(`Load test batch ${batch}/${requestBatches} (${concurrentRequests} concurrent requests)`);
    
    const promises = [];
    const batchStartTime = performance.now();
    
    for (let i = 0; i < concurrentRequests; i++) {
      const query = queries[i % queries.length];
      promises.push(searchRunbooks(query, false));
    }
    
    const results = await Promise.allSettled(promises);
    const batchEndTime = performance.now();
    const batchTime = Math.round(batchEndTime - batchStartTime);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    log.data(`Batch ${batch} completed in ${batchTime}ms`);
    log.data(`  Successful: ${successful}, Failed: ${failed}`);
    
    if (successful > 0) {
      const responseTimes = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.responseTime);
      const avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      const maxResponseTime = Math.max(...responseTimes);
      
      log.data(`  Avg response time: ${avgResponseTime}ms`);
      log.data(`  Max response time: ${maxResponseTime}ms`);
    }
    
    // Brief pause between batches
    if (batch < requestBatches) {
      await setTimeout(2000);
    }
  }
  
  log.success('Load test completed');
  
  // Check system health after load test
  log.step('Checking system health after load test...');
  const postLoadHealth = await apiCall('/health/performance');
  if (postLoadHealth) {
    log.data(`Post-load P95 response time: ${postLoadHealth.p95_response_time_ms.toFixed(1)}ms`);
    log.data(`Post-load error rate: ${(postLoadHealth.error_rate * 100).toFixed(2)}%`);
  }
}

async function circuitBreakerDemo() {
  log.header('\n⚡ Circuit Breaker Demo');
  log.header('========================');
  console.log('This demo shows circuit breaker status and behavior.\n');
  
  await question('Press Enter to check circuit breaker status...');
  
  log.step('Fetching circuit breaker status...');
  const circuitBreakers = await apiCall('/circuit-breakers');
  if (circuitBreakers && circuitBreakers.circuit_breakers) {
    log.data('Circuit Breaker Status:');
    circuitBreakers.circuit_breakers.forEach(cb => {
      const statusIcon = cb.state === 'closed' ? '🟢' : cb.state === 'open' ? '🔴' : '🟡';
      log.data(`  ${statusIcon} ${cb.name}: ${cb.state} (failures: ${cb.failure_count}/${cb.failure_threshold})`);
      if (cb.last_failure_time) {
        log.data(`    Last failure: ${new Date(cb.last_failure_time).toLocaleTimeString()}`);
      }
    });
  } else {
    log.info('Circuit breaker information not available');
  }
  
  // Show circuit breaker configuration
  log.step('Circuit breaker helps prevent cascade failures by:');
  console.log('  • Monitoring failure rates for external dependencies');
  console.log('  • Opening circuit when failure threshold is exceeded');
  console.log('  • Allowing system recovery before retrying');
  console.log('  • Providing fast-fail responses during outages');
}

async function performanceMetricsDemo() {
  log.header('\n📊 Performance Metrics Demo');
  log.header('=============================');
  console.log('This demo displays comprehensive performance analytics and insights.\n');
  
  await question('Press Enter to view performance metrics...');
  
  // Overall performance metrics
  log.step('Fetching comprehensive performance metrics...');
  const perfMetrics = await apiCall('/performance');
  if (perfMetrics) {
    log.data('Response Time Metrics:');
    log.data(`  Average: ${perfMetrics.response_times.avg_ms.toFixed(1)}ms`);
    log.data(`  P50: ${perfMetrics.response_times.p50_ms.toFixed(1)}ms`);
    log.data(`  P95: ${perfMetrics.response_times.p95_ms.toFixed(1)}ms`);
    log.data(`  P99: ${perfMetrics.response_times.p99_ms.toFixed(1)}ms`);
    log.data(`  Max: ${perfMetrics.response_times.max_ms.toFixed(1)}ms`);
    
    log.data('\nThroughput Metrics:');
    log.data(`  Requests per second: ${perfMetrics.throughput.requests_per_second.toFixed(2)}`);
    log.data(`  Total requests: ${perfMetrics.throughput.total_requests}`);
    
    log.data('\nError Tracking:');
    log.data(`  Total errors: ${perfMetrics.error_tracking.total_errors}`);
    log.data(`  Error rate: ${(perfMetrics.error_tracking.error_rate * 100).toFixed(2)}%`);
    
    log.data('\nResource Usage:');
    log.data(`  Memory: ${perfMetrics.resource_usage.memory_mb}MB`);
    log.data(`  Heap used: ${perfMetrics.resource_usage.heap_used_mb}MB`);
    log.data(`  Active handles: ${perfMetrics.resource_usage.active_handles}`);
    log.data(`  Active requests: ${perfMetrics.resource_usage.active_requests}`);
    
    if (perfMetrics.cache_performance) {
      log.data('\nCache Performance:');
      log.data(`  Hit rate: ${(perfMetrics.cache_performance.hit_rate * 100).toFixed(1)}%`);
      log.data(`  Total operations: ${perfMetrics.cache_performance.total_operations}`);
      log.data(`  Avg cache response: ${perfMetrics.cache_performance.avg_response_time_ms.toFixed(1)}ms`);
    }
  }
  
  // Performance recommendations
  log.step('Performance insights and recommendations:');
  if (perfMetrics) {
    const recommendations = [];
    
    if (perfMetrics.response_times.p95_ms > 1000) {
      recommendations.push('• P95 response time > 1s - consider cache optimization');
    }
    if (perfMetrics.error_tracking.error_rate > 0.05) {
      recommendations.push(`• Error rate ${(perfMetrics.error_tracking.error_rate * 100).toFixed(1)}% is high - investigate error causes`);
    }
    if (perfMetrics.resource_usage.memory_mb > 512) {
      recommendations.push('• Memory usage > 512MB - monitor for memory leaks');
    }
    if (perfMetrics.cache_performance && perfMetrics.cache_performance.hit_rate < 0.8) {
      recommendations.push('• Cache hit rate < 80% - review caching strategy');
    }
    
    if (recommendations.length > 0) {
      log.warning('Performance recommendations:');
      recommendations.forEach(rec => console.log(`  ${rec}`));
    } else {
      log.success('All performance metrics within optimal ranges!');
    }
  }
}

// Monitoring metrics in real-time
async function realTimeMonitoring() {
  log.header('\n📡 Real-time Monitoring');
  log.header('========================');
  console.log('This shows live system metrics updating every 5 seconds.\n');
  
  const shouldRun = await question('Start real-time monitoring? (y/N): ');
  if (shouldRun.toLowerCase() !== 'y') {
    log.info('Skipping real-time monitoring');
    return;
  }
  
  log.info('Starting real-time monitoring... Press Ctrl+C to stop');
  console.log();
  
  let iteration = 0;
  const maxIterations = 12; // Run for 1 minute (5s * 12)
  
  const monitor = setInterval(async () => {
    iteration++;
    const timestamp = new Date().toLocaleTimeString();
    
    // Clear previous metrics (simple approach)
    if (iteration > 1) {
      process.stdout.write('\x1B[8A'); // Move cursor up 8 lines
    }
    
    log.data(`[${timestamp}] System Metrics:`);
    
    const health = await apiCall('/health/performance');
    if (health) {
      console.log(`  Response Time: ${health.avg_response_time_ms.toFixed(1)}ms (P95: ${health.p95_response_time_ms.toFixed(1)}ms)`);
      console.log(`  Throughput: ${health.requests_per_second.toFixed(1)} req/s`);
      console.log(`  Error Rate: ${(health.error_rate * 100).toFixed(2)}%`);
      console.log(`  Memory: ${health.memory_usage_mb}MB`);
    }
    
    const cache = await apiCall('/health/cache');
    if (cache && cache.memory_cache) {
      console.log(`  Cache Hit Rate: ${(cache.hit_rate * 100).toFixed(1)}%`);
      console.log(`  Cache Keys: ${cache.memory_cache.keys_count}`);
      console.log(`  Cache Memory: ${cache.memory_cache.memory_usage_mb}MB`);
    }
    
    if (iteration >= maxIterations) {
      clearInterval(monitor);
      log.success('\nReal-time monitoring completed');
    }
  }, 5000);
}

// Main demo menu
async function showMainMenu() {
  log.header('\n🎯 Personal Pipeline MCP Server - Interactive Demo');
  log.header('===================================================');
  console.log('Welcome to the comprehensive milestone 1.3 feature demonstration!\n');
  
  console.log('Available demo scenarios:');
  CONFIG.scenarios.forEach((scenario, index) => {
    const weight = scenario.weight === 'high' ? '⭐⭐⭐' : scenario.weight === 'medium' ? '⭐⭐' : '⭐';
    console.log(`  ${index + 1}. ${scenario.name} ${weight}`);
    console.log(`     ${scenario.description}`);
  });
  console.log('  6. Real-time Monitoring 📡');
  console.log('  7. Run All Demos 🚀');
  console.log('  0. Exit\n');
  
  const choice = await question('Select a demo scenario (0-7): ');
  return parseInt(choice);
}

async function runAllDemos() {
  log.header('\n🚀 Running Complete Demo Suite');
  log.header('===============================');
  console.log('This will run all demo scenarios in sequence.\n');
  
  const confirm = await question('Continue with full demo? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    return;
  }
  
  await cachePerformanceDemo();
  await question('\nPress Enter to continue to next demo...');
  
  await healthMonitoringDemo();
  await question('\nPress Enter to continue to next demo...');
  
  await loadTestingDemo();
  await question('\nPress Enter to continue to next demo...');
  
  await circuitBreakerDemo();
  await question('\nPress Enter to continue to next demo...');
  
  await performanceMetricsDemo();
  
  log.success('\n🎉 Complete demo suite finished!');
}

// Main application
async function main() {
  try {
    // Check server availability
    log.step('Checking server availability...');
    const health = await apiCall('/health');
    if (!health) {
      log.error('MCP server is not running or not accessible');
      log.info('Please run: ./scripts/setup-demo.sh');
      process.exit(1);
    }
    log.success(`Server is running (${health.status})`);
    
    // Main demo loop
    while (true) {
      const choice = await showMainMenu();
      
      switch (choice) {
        case 1:
          await cachePerformanceDemo();
          break;
        case 2:
          await healthMonitoringDemo();
          break;
        case 3:
          await loadTestingDemo();
          break;
        case 4:
          await circuitBreakerDemo();
          break;
        case 5:
          await performanceMetricsDemo();
          break;
        case 6:
          await realTimeMonitoring();
          break;
        case 7:
          await runAllDemos();
          break;
        case 0:
          log.success('Thank you for exploring the Personal Pipeline MCP Server demo!');
          process.exit(0);
        default:
          log.warning('Invalid choice. Please select 0-7.');
          continue;
      }
      
      console.log('\n' + '='.repeat(60));
      await question('Press Enter to return to main menu...');
    }
    
  } catch (error) {
    log.error(`Demo error: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Demo interrupted. Goodbye!');
  rl.close();
  process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}