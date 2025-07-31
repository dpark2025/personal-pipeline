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
      name: 'Search Endpoints Demo',
      description: 'Compare general search vs specialized runbook search endpoints',
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
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      // Provide specific guidance based on error type
      if (response.status === 404) {
        errorMessage += '\n  🔍 Suggestion: Check if the endpoint URL is correct and the server is running';
      } else if (response.status === 400) {
        errorMessage += '\n  🔧 Suggestion: Verify request parameters and data format';
        if (errorText) {
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              errorMessage += `\n  📋 Details: ${errorData.error}`;
            }
          } catch (e) {
            errorMessage += `\n  📋 Details: ${errorText}`;
          }
        }
      } else if (response.status === 500) {
        errorMessage += '\n  🛠️  Suggestion: Server error - check server logs or try again';
      } else if (response.status >= 502 && response.status <= 504) {
        errorMessage += '\n  🌐 Suggestion: Network/gateway error - check server connectivity';
      }
      
      throw new Error(errorMessage);
    }
    
    return await response.json();
    
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      log.error(`Connection failed: Unable to reach server at ${CONFIG.serverUrl}`);
      log.error('  🚀 Solution: Start the server with "npm start" or "npm run dev"');
      log.error('  🔧 Solution: Check if SERVER_URL environment variable is correct');
    } else {
      log.error(`API call to ${endpoint} failed:`);
      log.error(`  ${error.message}`);
    }
    return null;
  }
}

async function searchRunbooks(query, showTiming = true) {
  const startTime = performance.now();
  
  const result = await apiCall('/api/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      categories: ['runbooks'],
      max_results: 5
    })
  });
  
  const endTime = performance.now();
  const responseTime = Math.round(endTime - startTime);
  
  if (showTiming) {
    log.data(`Query: "${query}" - Response time: ${responseTime}ms`);
  }
  
  return { result, responseTime };
}

async function searchRunbooksSpecific(alertType, severity = 'medium', affectedSystems = ['any'], showTiming = true) {
  const startTime = performance.now();
  
  const result = await apiCall('/api/runbooks/search', {
    method: 'POST',
    body: JSON.stringify({
      alert_type: alertType,
      severity: severity,
      affected_systems: affectedSystems,
      context: {
        urgency: severity === 'critical' ? 'high' : 'normal'
      }
    })
  });
  
  const endTime = performance.now();
  const responseTime = Math.round(endTime - startTime);
  
  if (showTiming) {
    log.data(`Runbook search: "${alertType}" (${severity}) - Response time: ${responseTime}ms`);
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

async function searchEndpointsDemo() {
  log.header('\n🔍 Search Endpoints Demo');
  log.header('===========================');
  console.log('This demo compares the general search endpoint vs specialized runbook search.');
  console.log('Shows the difference between /api/search and /api/runbooks/search endpoints.\n');
  
  await question('Press Enter to start search endpoints demo...');
  
  const searchTerms = [
    { query: 'disk space critical', alertType: 'disk_usage_critical', severity: 'critical', affectedSystems: ['storage', 'filesystem'] },
    { query: 'memory leak', alertType: 'memory_usage_high', severity: 'high', affectedSystems: ['application', 'system'] },
    { query: 'database timeout', alertType: 'query_timeout', severity: 'high', affectedSystems: ['database', 'api'] }
  ];
  
  for (const { query, alertType, severity, affectedSystems } of searchTerms) {
    log.step(`Comparing search methods for: "${query}"`);
    
    // Test general search endpoint
    log.info('1. General search (/api/search):');
    const { result: generalResult, responseTime: generalTime } = await searchRunbooks(query);
    
    if (generalResult) {
      log.data(`  Found ${generalResult.data?.documents?.length || 0} documents`);
      log.data(`  Confidence scores: ${generalResult.data?.documents?.slice(0, 2).map(d => d.confidence_score?.toFixed(2) || 'N/A').join(', ') || 'N/A'}`);
    } else {
      log.warning('  No results from general search');
    }
    
    // Wait a moment
    await setTimeout(300);
    
    // Test specialized runbook search endpoint  
    log.info('2. Specialized runbook search (/api/runbooks/search):');
    const { result: specificResult, responseTime: specificTime } = await searchRunbooksSpecific(alertType, severity, affectedSystems);
    
    if (specificResult) {
      log.data(`  Found ${specificResult.data?.runbooks?.length || 0} runbooks`);
      log.data(`  Match reasons: ${specificResult.data?.runbooks?.[0]?.match_reasons?.slice(0, 2).join(', ') || 'N/A'}`);
    } else {
      log.warning('  No results from specialized search');
    }
    
    // Compare performance
    log.success(`Performance comparison: General ${generalTime}ms vs Specialized ${specificTime}ms`);
    console.log();
  }
  
  // Show endpoint usage guidance
  log.step('Endpoint Usage Guidance:');
  console.log('  📋 Use /api/search for:');
  console.log('    • General knowledge base queries');
  console.log('    • Cross-category searches');
  console.log('    • Exploratory documentation lookup');
  console.log();
  console.log('  🎯 Use /api/runbooks/search for:');
  console.log('    • Alert-specific operational procedures');
  console.log('    • Incident response scenarios');
  console.log('    • System-specific troubleshooting');
}

async function healthMonitoringDemo() {
  log.header('\n❤️ Health Monitoring Demo');
  log.header('===========================');
  console.log('This demo shows comprehensive health monitoring including cache, performance, and system metrics.\n');
  
  if (process.stdin.isTTY) {
    await question('Press Enter to start health monitoring demo...');
  }
  
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
    log.data(`Server healthy: ${detailedHealth.components?.mcp_server?.status === 'healthy'}`);
    log.data(`Cache healthy: ${detailedHealth.components?.cache_service?.status === 'healthy'}`);
    log.data(`Sources healthy: ${detailedHealth.components?.source_adapters?.healthy_sources || 0}/${detailedHealth.components?.source_adapters?.total_sources || 0}`);
    log.data(`Performance healthy: ${detailedHealth.components?.performance?.status === 'healthy'}`);
  }
  
  // Performance health
  log.step('Checking performance health...');
  const perfHealth = await apiCall('/health/performance');
  if (perfHealth && perfHealth.metrics) {
    log.data(`Average response time: ${perfHealth.metrics.response_times?.avg_ms?.toFixed(1) || 'N/A'}ms`);
    log.data(`P95 response time: ${perfHealth.metrics.response_times?.p95_ms?.toFixed(1) || 'N/A'}ms`);
    log.data(`Error rate: ${((perfHealth.metrics.error_tracking?.error_rate || 0) * 100).toFixed(2)}%`);
    log.data(`Requests per second: ${perfHealth.metrics.throughput?.requests_per_second?.toFixed(1) || 'N/A'}`);
  }
  
  // Monitoring alerts
  log.step('Checking monitoring alerts...');
  const alerts = await apiCall('/monitoring/alerts');
  if (alerts) {
    const activeAlerts = alerts.alerts?.filter(alert => !alert.resolved) || [];
    const totalAlerts = alerts.total || alerts.alerts?.length || 0;
    
    if (activeAlerts.length > 0) {
      log.warning(`${activeAlerts.length} active alerts (${totalAlerts} total)`);
      activeAlerts.forEach(alert => {
        log.data(`  ${alert.severity.toUpperCase()}: ${alert.title}`);
        if (alert.timestamp) {
          log.data(`    Time: ${new Date(alert.timestamp).toLocaleTimeString()}`);
        }
      });
    } else {
      log.success(`No active alerts (${totalAlerts} resolved alerts in history)`);
    }
  }
}

async function loadTestingDemo() {
  log.header('\n🏋️ Load Testing Demo');
  log.header('=====================');
  console.log('This demo runs a controlled load test to show system behavior under stress.\n');
  
  if (process.stdin.isTTY) {
    const shouldRun = await question('Run load test? This will stress the system (y/N): ');
    if (shouldRun.toLowerCase() !== 'y') {
      log.info('Skipping load testing demo');
      return;
    }
  } else {
    log.info('Running load test in non-interactive mode...');
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
  if (postLoadHealth && postLoadHealth.metrics) {
    log.data(`Post-load P95 response time: ${postLoadHealth.metrics.response_times?.p95_ms?.toFixed(1) || 'N/A'}ms`);
    log.data(`Post-load error rate: ${((postLoadHealth.metrics.error_tracking?.error_rate || 0) * 100).toFixed(2)}%`);
  }
}

async function circuitBreakerDemo() {
  log.header('\n⚡ Circuit Breaker Demo - Understanding System Resilience');
  log.header('========================================================');
  
  // Educational introduction
  console.log('🎓 What are Circuit Breakers?');
  console.log('Circuit breakers are a resilience pattern that prevents cascade failures.');
  console.log('They work like electrical circuit breakers in your home - when something');
  console.log('goes wrong, they "trip" to protect the entire system.\n');
  
  console.log('🔄 Circuit Breaker States:');
  console.log('  🟢 CLOSED   = Normal operation, requests flow through');
  console.log('  🔴 OPEN     = Failure detected, requests fail fast (no system stress)');
  console.log('  🟡 HALF_OPEN = Testing recovery, allowing limited requests through\n');
  
  console.log('📊 Key Metrics to Watch:');
  console.log('  • Failure Count: How many recent failures occurred');
  console.log('  • Failure Threshold: Maximum failures before circuit opens');
  console.log('  • Success Rate: Percentage of successful operations');
  console.log('  • Last Failure: When the most recent failure happened\n');
  
  if (process.stdin.isTTY) {
    await question('Press Enter to check our system\'s circuit breaker status...');
  }
  
  log.step('Analyzing current circuit breaker protection...');
  const circuitBreakers = await apiCall('/circuit-breakers');
  
  if (circuitBreakers && circuitBreakers.breakers) {
    log.success('✅ Circuit breakers are active and protecting your system!\n');
    
    console.log('🛡️  CIRCUIT BREAKER STATUS REPORT');
    console.log('═'.repeat(50));
    
    circuitBreakers.breakers.forEach((cb, index) => {
      const statusIcon = cb.state === 'closed' ? '🟢' : cb.state === 'open' ? '🔴' : '🟡';
      const healthStatus = cb.state === 'closed' ? 'HEALTHY' : cb.state === 'open' ? 'PROTECTED' : 'RECOVERING';
      
      console.log(`\n${index + 1}. ${cb.name} ${statusIcon}`);
      console.log(`   Status: ${healthStatus} (${cb.state.toUpperCase()})`);
      console.log(`   Health: ${cb.failures || 0}/${cb.failure_threshold || 5} failures`);
      
      // Explain what this means
      if (cb.state === 'closed') {
        console.log(`   ✅ Meaning: System is healthy, all requests being processed normally`);
        if (cb.failures > 0) {
          console.log(`   ⚠️  Note: ${cb.failures} recent failures detected but within safe limits`);
        }
      } else if (cb.state === 'open') {
        console.log(`   🚨 Meaning: Failing fast to prevent system overload`);
        console.log(`   🛡️  Protection: Blocking requests until service recovers`);
      } else if (cb.state === 'half_open') {
        console.log(`   🔄 Meaning: Testing if service has recovered`);
        console.log(`   🎯 Action: Allowing limited requests to check health`);
      }
      
      if (cb.lastFailure) {
        const timeSince = new Date() - new Date(cb.lastFailure);
        const minutesAgo = Math.round(timeSince / (1000 * 60));
        console.log(`   🕐 Last Issue: ${minutesAgo > 0 ? `${minutesAgo} minutes ago` : 'Just now'} (${new Date(cb.lastFailure).toLocaleTimeString()})`);
      }
      
      if (cb.uptime !== undefined) {
        const uptimeColor = cb.uptime > 95 ? colors.green : cb.uptime > 90 ? colors.yellow : colors.red;
        console.log(`   📈 Success Rate: ${uptimeColor}${cb.uptime.toFixed(1)}%${colors.reset}`);
        
        // Explain success rate
        if (cb.uptime > 99) {
          console.log(`   💚 Excellent: Nearly perfect reliability`);
        } else if (cb.uptime > 95) {
          console.log(`   💛 Good: Reliable with minor issues`);
        } else if (cb.uptime > 90) {
          console.log(`   🧡 Concerning: Frequent failures, monitoring needed`);
        } else {
          console.log(`   ❤️  Critical: High failure rate, immediate attention required`);
        }
      }
    });
    
    // Overall system health summary
    console.log('\n🏥 SYSTEM PROTECTION SUMMARY');
    console.log('═'.repeat(35));
    const total = circuitBreakers.healthy + circuitBreakers.degraded + circuitBreakers.failed;
    console.log(`Total Services: ${total}`);
    console.log(`🟢 Healthy: ${circuitBreakers.healthy} (${Math.round((circuitBreakers.healthy/total)*100)}%)`);
    if (circuitBreakers.degraded > 0) {
      console.log(`🟡 Recovering: ${circuitBreakers.degraded} (${Math.round((circuitBreakers.degraded/total)*100)}%)`);
    }
    if (circuitBreakers.failed > 0) {
      console.log(`🔴 Protected: ${circuitBreakers.failed} (${Math.round((circuitBreakers.failed/total)*100)}%)`);
    }
    
    // Provide actionable insights
    if (circuitBreakers.failed > 0) {
      log.warning('\n🔧 ACTION NEEDED:');
      console.log('   • Some services are in protective mode');
      console.log('   • Check service logs for root cause');
      console.log('   • Fix underlying issues to allow recovery');
      console.log('   • Monitor for successful recovery to CLOSED state');
    } else if (circuitBreakers.degraded > 0) {
      log.info('\n👀 MONITORING:');
      console.log('   • Services are testing recovery');
      console.log('   • Watch for transition to CLOSED (healthy) state');
      console.log('   • If they return to OPEN, investigate further');
    } else {
      log.success('\n🎉 EXCELLENT: All services are healthy and protected!');
    }
    
  } else {
    log.warning('Circuit breaker information not available');
    console.log('This could mean:');
    console.log('  • Circuit breakers are not configured for this system');
    console.log('  • The monitoring endpoint is not accessible');
    console.log('  • This is a simplified demo environment');
  }
  
  // Educational wrap-up
  console.log('\n🎯 WHY CIRCUIT BREAKERS MATTER:');
  console.log('═'.repeat(35));
  console.log('✅ Prevent cascade failures that could crash your entire system');
  console.log('⚡ Provide fast responses instead of hanging requests');
  console.log('🔄 Allow automatic recovery without manual intervention');
  console.log('📈 Improve overall system reliability and user experience');
  console.log('🛡️  Protect both your system and external services from overload');
  
  console.log('\n💡 IN REAL INCIDENT RESPONSE:');
  console.log('   • CLOSED circuits = Services operating normally');
  console.log('   • OPEN circuits = Known issues, system is protecting itself');  
  console.log('   • HALF_OPEN circuits = Recovery in progress, monitor closely');
}

async function performanceMetricsDemo() {
  log.header('\n📊 Performance Metrics Demo');
  log.header('=============================');
  console.log('This demo displays comprehensive performance analytics and insights.\n');
  
  if (process.stdin.isTTY) {
    await question('Press Enter to view performance metrics...');
  }
  
  // Overall performance metrics
  log.step('Fetching comprehensive performance metrics...');
  const perfMetrics = await apiCall('/performance');
  if (perfMetrics) {
    const metrics = perfMetrics.detailed_metrics?.overall || perfMetrics.performance_report?.summary;
    if (metrics) {
      log.data('Response Time Metrics:');
      log.data(`  Average: ${metrics.response_times?.avg_ms?.toFixed(1) || 'N/A'}ms`);
      log.data(`  P50: ${metrics.response_times?.p50_ms?.toFixed(1) || 'N/A'}ms`);
      log.data(`  P95: ${metrics.response_times?.p95_ms?.toFixed(1) || 'N/A'}ms`);
      log.data(`  P99: ${metrics.response_times?.p99_ms?.toFixed(1) || 'N/A'}ms`);
      log.data(`  Max: ${metrics.response_times?.max_ms?.toFixed(1) || 'N/A'}ms`);
      
      log.data('\nThroughput Metrics:');
      log.data(`  Requests per second: ${metrics.throughput?.requests_per_second?.toFixed(2) || 'N/A'}`);
      log.data(`  Total requests: ${metrics.throughput?.total_requests || 'N/A'}`);
      
      log.data('\nError Tracking:');
      log.data(`  Total errors: ${metrics.error_tracking?.total_errors || 'N/A'}`);
      log.data(`  Error rate: ${((metrics.error_tracking?.error_rate || 0) * 100).toFixed(2)}%`);
      
      log.data('\nResource Usage:');
      log.data(`  Memory: ${metrics.resource_usage?.memory_mb || 'N/A'}MB`);
      log.data(`  Heap used: ${metrics.resource_usage?.heap_used_mb || 'N/A'}MB`);
      log.data(`  Active handles: ${metrics.resource_usage?.active_handles || 'N/A'}`);
      log.data(`  Active requests: ${metrics.resource_usage?.active_requests || 'N/A'}`);
      
      if (metrics.cache_performance) {
        log.data('\nCache Performance:');
        log.data(`  Hit rate: ${(metrics.cache_performance.hit_rate * 100).toFixed(1)}%`);
        log.data(`  Total operations: ${metrics.cache_performance.total_operations}`);
        log.data(`  Avg cache response: ${metrics.cache_performance.avg_response_time_ms?.toFixed(1) || 'N/A'}ms`);
      }
    } else {
      log.warning('Performance metrics not available in expected format');
    }
  }
  
  // Performance recommendations
  log.step('Performance insights and recommendations:');
  if (perfMetrics) {
    const metrics = perfMetrics.detailed_metrics?.overall || perfMetrics.performance_report?.summary;
    const recommendations = [];
    
    if (metrics?.response_times?.p95_ms > 1000) {
      recommendations.push('• P95 response time > 1s - consider cache optimization');
    }
    if (metrics?.error_tracking?.error_rate > 0.05) {
      recommendations.push(`• Error rate ${((metrics.error_tracking.error_rate || 0) * 100).toFixed(1)}% is high - investigate error causes`);
    }
    if (metrics?.resource_usage?.memory_mb > 512) {
      recommendations.push('• Memory usage > 512MB - monitor for memory leaks');
    }
    if (metrics?.cache_performance && metrics.cache_performance.hit_rate < 0.8) {
      recommendations.push('• Cache hit rate < 80% - review caching strategy');
    }
    
    // Also check for alerts from the performance report
    if (perfMetrics.performance_report?.alerts?.length > 0) {
      perfMetrics.performance_report.alerts.forEach(alert => {
        recommendations.push(`• ${alert}`);
      });
    }
    
    if (recommendations.length > 0) {
      log.warning('Performance recommendations:');
      recommendations.forEach(rec => console.log(`  ${rec}`));
    } else {
      log.success('All performance metrics within optimal ranges!');
    }
  }
}

// System monitoring snapshot - improved UX version
async function realTimeMonitoring() {
  log.header('\n📡 System Monitoring Dashboard');
  log.header('===============================');
  
  // Clear purpose explanation
  console.log('🎯 PURPOSE: This demonstrates live system health monitoring');
  console.log('   Perfect for operations teams during incident response');
  console.log('   Shows key metrics that help diagnose system performance\n');
  
  console.log('📊 WHAT YOU\'LL SEE:');
  console.log('   • Response Times: How fast the system responds to requests');
  console.log('   • Throughput: How many requests per second we\'re handling');
  console.log('   • Error Rates: Percentage of failed requests (should be near 0%)');
  console.log('   • Memory Usage: System memory consumption');
  console.log('   • Cache Performance: How well our cache is working\n');
  
  if (process.stdin.isTTY) {
    const monitorChoice = await question('Choose monitoring mode:\n  1. Quick Snapshot (current metrics)\n  2. Live Updates (10 second demo)\n  3. Skip this demo\nChoice (1-3): ');
    
    if (monitorChoice === '3') {
      log.info('Skipping monitoring demo');
      return;
    }
    
    if (monitorChoice === '1') {
      await showSystemSnapshot();
      return;
    }
    
    if (monitorChoice === '2') {
      await showLiveMonitoring();
      return;
    }
    
    // Default to snapshot if invalid choice
    log.warning('Invalid choice, showing snapshot instead...');
    await showSystemSnapshot();
  } else {
    log.info('Running monitoring snapshot in non-interactive mode...');
    await showSystemSnapshot();
  }
}

// Quick snapshot of current system metrics
async function showSystemSnapshot() {
  log.step('📸 Taking system health snapshot...');
  console.log();
  
  const timestamp = new Date().toLocaleString();
  console.log(`🕐 Snapshot Time: ${timestamp}`);
  console.log('═'.repeat(50));
  
  // Get all metrics in parallel for faster response
  const [health, cache, alerts] = await Promise.all([
    apiCall('/health/performance'),
    apiCall('/health/cache'),
    apiCall('/monitoring/alerts')
  ]);
  
  // Performance metrics
  if (health && health.metrics) {
    console.log('⚡ PERFORMANCE METRICS:');
    const avgTime = health.metrics.response_times?.avg_ms?.toFixed(1) || 'N/A';
    const p95Time = health.metrics.response_times?.p95_ms?.toFixed(1) || 'N/A';
    const rps = health.metrics.throughput?.requests_per_second?.toFixed(1) || 'N/A';
    const errorRate = ((health.metrics.error_tracking?.error_rate || 0) * 100).toFixed(2);
    const memory = health.metrics.resource_usage?.memory_mb || 'N/A';
    
    console.log(`   Response Time: ${avgTime}ms average (${p95Time}ms p95)`);
    console.log(`   Throughput: ${rps} requests/second`);
    console.log(`   Error Rate: ${errorRate}% ${errorRate === '0.00' ? '✅' : '⚠️'}`);
    console.log(`   Memory Usage: ${memory}MB`);
    
    // Provide context for the numbers
    if (parseFloat(avgTime) < 200) {
      console.log('   💚 Response time: Excellent (< 200ms)');
    } else if (parseFloat(avgTime) < 500) {
      console.log('   💛 Response time: Good (< 500ms)');
    } else {
      console.log('   🧡 Response time: Needs attention (> 500ms)');
    }
  }
  
  // Cache performance
  if (cache && cache.memory_cache) {
    console.log('\n💾 CACHE PERFORMANCE:');
    const hitRate = ((cache.hit_rate || 0) * 100).toFixed(1);
    const keys = cache.memory_cache.keys_count || 0;
    const cacheMemory = cache.memory_cache.memory_usage_mb || 0;
    
    console.log(`   Hit Rate: ${hitRate}% ${parseFloat(hitRate) > 80 ? '✅' : '⚠️'}`);
    console.log(`   Cached Items: ${keys} entries`);
    console.log(`   Cache Memory: ${cacheMemory}MB`);
    
    // Explain cache performance
    if (parseFloat(hitRate) > 80) {
      console.log('   💚 Cache is working excellently (>80% hit rate)');
    } else if (parseFloat(hitRate) > 50) {
      console.log('   💛 Cache is helping but could be optimized');
    } else {
      console.log('   🧡 Cache needs tuning for better performance');
    }
  }
  
  // Active alerts
  if (alerts && alerts.alerts) {
    const activeAlerts = alerts.alerts.filter(alert => !alert.resolved) || [];
    console.log('\n🚨 SYSTEM ALERTS:');
    
    if (activeAlerts.length === 0) {
      console.log('   ✅ No active alerts - system is healthy!');
    } else {
      console.log(`   ⚠️  ${activeAlerts.length} active alerts require attention:`);
      activeAlerts.slice(0, 3).forEach((alert, index) => {
        console.log(`   ${index + 1}. ${alert.severity.toUpperCase()}: ${alert.title}`);
      });
      if (activeAlerts.length > 3) {
        console.log(`   ... and ${activeAlerts.length - 3} more alerts`);
      }
    }
  }
  
  console.log('\n🎯 OPERATIONAL INSIGHTS:');
  console.log('   • This snapshot shows current system health');
  console.log('   • During incidents, watch for changes in these metrics');
  console.log('   • Response times spike = performance issues');
  console.log('   • Error rates increase = service problems');
  console.log('   • Cache hit rate drops = possible cache issues');
  
  log.success('\n📊 System snapshot complete!');
}

// Brief live monitoring demonstration  
async function showLiveMonitoring() {
  log.step('🔄 Starting brief live monitoring demo...');
  console.log('This will show 3 updates over 10 seconds, then automatically stop.\n');
  
  let iteration = 0;
  const maxIterations = 3;
  let lastMetrics = null;
  
  const monitor = setInterval(async () => {
    iteration++;
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`\n📊 Live Update ${iteration}/${maxIterations} - ${timestamp}`);
    console.log('─'.repeat(40));
    
    const health = await apiCall('/health/performance');
    if (health && health.metrics) {
      const currentMetrics = {
        avgTime: health.metrics.response_times?.avg_ms?.toFixed(1) || 'N/A',
        rps: health.metrics.throughput?.requests_per_second?.toFixed(1) || 'N/A',
        errorRate: ((health.metrics.error_tracking?.error_rate || 0) * 100).toFixed(2),
        memory: health.metrics.resource_usage?.memory_mb || 'N/A'
      };
      
      console.log(`Response Time: ${currentMetrics.avgTime}ms`);
      console.log(`Throughput: ${currentMetrics.rps} req/s`);
      console.log(`Error Rate: ${currentMetrics.errorRate}%`);
      console.log(`Memory: ${currentMetrics.memory}MB`);
      
      // Show changes from previous iteration
      if (lastMetrics && iteration > 1) {
        const timeDiff = parseFloat(currentMetrics.avgTime) - parseFloat(lastMetrics.avgTime);
        if (Math.abs(timeDiff) > 1) {
          const trend = timeDiff > 0 ? '📈 slower' : '📉 faster';
          console.log(`└─ Response time is ${Math.abs(timeDiff).toFixed(1)}ms ${trend}`);
        }
      }
      
      lastMetrics = currentMetrics;
    }
    
    if (iteration >= maxIterations) {
      clearInterval(monitor);
      console.log('\n✅ Live monitoring demo completed!');
      console.log('\n💡 In real operations:');
      console.log('   • Set up dashboards for continuous monitoring');
      console.log('   • Configure alerts for threshold breaches');
      console.log('   • Use monitoring data to identify trends');
      console.log('   • Correlate metrics with incidents for root cause analysis');
    }
  }, 3000); // Every 3 seconds for a quicker demo
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
  console.log('  7. System Monitoring Dashboard 📡');
  console.log('  8. Run All Demos 🚀');
  console.log('  0. Exit\n');
  
  const choice = await question('Select a demo scenario (0-8): ');
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
  
  await searchEndpointsDemo();
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
      log.info('Please run: npm run demo:start');
      process.exit(1);
    }
    log.success(`Server is running (${health.status})`);
    
    // Check for non-interactive mode (specific scenario argument)
    const scenarioArg = process.argv[2];
    if (scenarioArg && scenarioArg.match(/^[3-7]$/)) {
      const scenarioNum = parseInt(scenarioArg);
      log.info(`Running scenario ${scenarioNum} in non-interactive mode`);
      
      switch (scenarioNum) {
        case 3:
          await healthMonitoringDemo();
          break;
        case 4:
          await loadTestingDemo();
          break;
        case 5:
          await circuitBreakerDemo();
          break;
        case 6:  
          await performanceMetricsDemo();
          break;
        case 7:
          await realTimeMonitoring();
          break;
      }
      
      log.success(`Scenario ${scenarioNum} completed successfully!`);
      process.exit(0);
    }
    
    // Main demo loop (interactive mode)
    while (true) {
      const choice = await showMainMenu();
      
      switch (choice) {
        case 1:
          await cachePerformanceDemo();
          break;
        case 2:
          await searchEndpointsDemo();
          break;
        case 3:
          await healthMonitoringDemo();
          break;
        case 4:
          await loadTestingDemo();
          break;
        case 5:
          await circuitBreakerDemo();
          break;
        case 6:
          await performanceMetricsDemo();
          break;
        case 7:
          await realTimeMonitoring();
          break;
        case 8:
          await runAllDemos();
          break;
        case 0:
          log.success('Thank you for exploring the Personal Pipeline MCP Server demo!');
          process.exit(0);
        default:
          log.warning('Invalid choice. Please select 0-8.');
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