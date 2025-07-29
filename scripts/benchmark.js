#!/usr/bin/env node

/**
 * Comprehensive Performance Benchmarking Suite for Personal Pipeline MCP Server
 * 
 * This script benchmarks all 7 MCP tools under various load conditions,
 * measures response times, throughput, memory usage, and cache performance.
 * 
 * Usage:
 *   node scripts/benchmark.js [options]
 *   
 * Options:
 *   --concurrent <n>    Number of concurrent requests per test (default: 10)
 *   --duration <n>      Test duration in seconds (default: 30)
 *   --cache-test        Include cache performance tests
 *   --no-warmup         Skip cache warmup phase
 *   --output <file>     Save results to JSON file
 *   --target <ms>       Target response time in ms (default: 200)
 *   --verbose           Detailed logging
 */

import { performance } from 'perf_hooks';
import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Performance thresholds and targets
const PERFORMANCE_TARGETS = {
  cached_response_ms: 200,
  uncached_response_ms: 500,
  cold_query_response_ms: 2000,
  min_cache_hit_rate: 0.70,
  max_memory_mb: 2048,
  max_cpu_percent: 70,
  min_throughput_per_sec: 10,
  max_error_rate: 0.01, // 1%
};

// Test scenarios for each MCP tool
const MCP_TOOLS = [
  {
    name: 'search_runbooks',
    description: 'Search for operational runbooks',
    args: {
      alert_type: 'memory_pressure',
      severity: 'high',
      affected_systems: ['web-server', 'database'],
      context: { datacenter: 'us-east-1' }
    },
    critical: true, // Should be cached for fastest response
  },
  {
    name: 'get_decision_tree',
    description: 'Retrieve decision logic',
    args: {
      alert_context: {
        alert_type: 'disk_full',
        severity: 'critical',
        system: 'database-01'
      }
    },
    critical: true,
  },
  {
    name: 'get_procedure',
    description: 'Get detailed procedure steps',
    args: {
      runbook_id: 'memory-pressure-001',
      step_name: 'check_memory_usage',
      current_context: { server: 'web-01' }
    },
    critical: false,
  },
  {
    name: 'get_escalation_path',
    description: 'Determine escalation procedures',
    args: {
      severity: 'critical',
      business_hours: false,
      failed_attempts: ['restart_service', 'clear_cache']
    },
    critical: false,
  },
  {
    name: 'list_sources',
    description: 'List documentation sources',
    args: {
      include_health: true
    },
    critical: false,
  },
  {
    name: 'search_knowledge_base',
    description: 'General documentation search',
    args: {
      query: 'kubernetes pod restart troubleshooting',
      categories: ['kubernetes', 'troubleshooting'],
      max_results: 10
    },
    critical: false,
  },
  {
    name: 'record_resolution_feedback',
    description: 'Record resolution feedback',
    args: {
      runbook_id: 'memory-pressure-001',
      procedure_id: 'check_memory_usage',
      outcome: 'success',
      resolution_time_minutes: 15,
      notes: 'Successfully resolved memory pressure issue'
    },
    critical: false,
  }
];

class PerformanceBenchmark {
  constructor(options = {}) {
    this.options = {
      concurrent: options.concurrent || 10,
      duration: options.duration || 30,
      cacheTest: options.cacheTest !== false,
      warmup: options.warmup !== false,
      target: options.target || PERFORMANCE_TARGETS.cached_response_ms,
      verbose: options.verbose || false,
      output: options.output,
      serverUrl: options.serverUrl || 'http://localhost:3000',
      ...options
    };

    this.results = {
      timestamp: new Date().toISOString(),
      config: this.options,
      targets: PERFORMANCE_TARGETS,
      summary: {},
      detailed: {},
      recommendations: [],
      errors: [],
    };

    this.mcpProcess = null;
    this.isServerReady = false;
  }

  /**
   * Run comprehensive benchmark suite
   */
  async run() {
    try {
      console.log('🚀 Starting Performance Benchmark Suite');
      console.log(`Target: <${this.options.target}ms cached responses`);
      console.log(`Concurrent: ${this.options.concurrent} requests`);
      console.log(`Duration: ${this.options.duration}s per test\n`);

      // Start MCP server if needed
      await this.startMCPServer();

      // Wait for server to be ready
      await this.waitForServer();

      // Benchmark phases
      await this.runWarmupPhase();
      await this.runBaselineTests();
      await this.runLoadTests();
      await this.runCacheTests();
      await this.runStressTests();
      await this.runMemoryTests();

      // Analysis and reporting
      await this.analyzeResults();
      await this.generateReport();

      console.log('\n✅ Benchmark suite completed successfully!');
      return true;

    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      this.results.errors.push({
        phase: 'overall',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return false;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Start MCP server process for testing
   */
  async startMCPServer() {
    if (this.options.externalServer) {
      console.log('📡 Using external MCP server');
      return;
    }

    console.log('🔧 Starting MCP server for benchmarking...');

    return new Promise((resolve, reject) => {
      this.mcpProcess = spawn('npm', ['run', 'dev'], {
        cwd: join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let serverOutput = '';

      this.mcpProcess.stdout.on('data', (data) => {
        serverOutput += data.toString();
        if (this.options.verbose) {
          console.log(`[MCP] ${data.toString().trim()}`);
        }
        
        // Check if server is ready
        if (data.toString().includes('Express server started')) {
          this.isServerReady = true;
          resolve();
        }
      });

      this.mcpProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (this.options.verbose) {
          console.error(`[MCP ERROR] ${message}`);
        }
        
        // Don't fail on warnings
        if (!message.includes('warning') && !message.includes('deprecated')) {
          reject(new Error(`MCP server failed to start: ${message}`));
        }
      });

      this.mcpProcess.on('error', (error) => {
        reject(new Error(`Failed to start MCP server: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.isServerReady) {
          reject(new Error('MCP server failed to start within 30 seconds'));
        }
      }, 30000);
    });
  }

  /**
   * Wait for server to be fully ready
   */
  async waitForServer() {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${this.options.serverUrl}/health`);
        if (response.ok) {
          const health = await response.json();
          if (health.status === 'healthy') {
            console.log('✅ MCP server is ready and healthy');
            return;
          }
        }
      } catch (error) {
        // Server not ready yet
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Server failed to become healthy within 30 seconds');
  }

  /**
   * Warm up cache with critical data
   */
  async runWarmupPhase() {
    if (!this.options.warmup) {
      console.log('⏭️ Skipping cache warmup phase');
      return;
    }

    console.log('🔥 Running cache warmup phase...');
    const startTime = performance.now();

    // Warm up critical tools first
    const criticalTools = MCP_TOOLS.filter(tool => tool.critical);
    
    for (const tool of criticalTools) {
      try {
        await this.callMCPTool(tool.name, tool.args);
        if (this.options.verbose) {
          console.log(`   Warmed up: ${tool.name}`);
        }
      } catch (error) {
        console.warn(`   Failed to warm up ${tool.name}: ${error.message}`);
      }
    }

    const warmupTime = performance.now() - startTime;
    console.log(`✅ Cache warmup completed in ${warmupTime.toFixed(0)}ms\n`);
  }

  /**
   * Run baseline performance tests (single requests)
   */
  async runBaselineTests() {
    console.log('📊 Running baseline performance tests...');
    this.results.detailed.baseline = {};

    for (const tool of MCP_TOOLS) {
      const toolResults = await this.benchmarkTool(tool, {
        concurrent: 1,
        iterations: 10,
        phase: 'baseline'
      });

      this.results.detailed.baseline[tool.name] = toolResults;

      const avgTime = toolResults.response_times.reduce((a, b) => a + b, 0) / toolResults.response_times.length;
      const meetTarget = avgTime <= (tool.critical ? this.options.target : PERFORMANCE_TARGETS.uncached_response_ms);
      
      console.log(`   ${tool.name}: ${avgTime.toFixed(0)}ms avg ${meetTarget ? '✅' : '❌'}`);
    }

    console.log('✅ Baseline tests completed\n');
  }

  /**
   * Run load tests with concurrent requests
   */
  async runLoadTests() {
    console.log(`⚡ Running load tests (${this.options.concurrent} concurrent)...`);
    this.results.detailed.load = {};

    for (const tool of MCP_TOOLS) {
      const toolResults = await this.benchmarkTool(tool, {
        concurrent: this.options.concurrent,
        duration: this.options.duration,
        phase: 'load'
      });

      this.results.detailed.load[tool.name] = toolResults;

      const avgTime = toolResults.response_times.reduce((a, b) => a + b, 0) / toolResults.response_times.length;
      const throughput = toolResults.total_requests / (this.options.duration);
      const errorRate = toolResults.errors / toolResults.total_requests;

      console.log(`   ${tool.name}: ${avgTime.toFixed(0)}ms avg, ${throughput.toFixed(1)} req/s, ${(errorRate * 100).toFixed(1)}% errors`);
    }

    console.log('✅ Load tests completed\n');
  }

  /**
   * Run cache-specific performance tests
   */
  async runCacheTests() {
    if (!this.options.cacheTest) {
      console.log('⏭️ Skipping cache tests');
      return;
    }

    console.log('💾 Running cache performance tests...');
    this.results.detailed.cache = {};

    // Test cache hit performance
    for (const tool of MCP_TOOLS.filter(t => t.critical)) {
      // First request (cache miss)
      const missTime = await this.measureSingleRequest(tool.name, tool.args);
      
      // Second request (cache hit)
      const hitTime = await this.measureSingleRequest(tool.name, tool.args);
      
      // Multiple cache hits
      const hitTimes = [];
      for (let i = 0; i < 10; i++) {
        const time = await this.measureSingleRequest(tool.name, tool.args);
        hitTimes.push(time);
      }

      const avgHitTime = hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length;
      const improvement = ((missTime - avgHitTime) / missTime * 100);

      this.results.detailed.cache[tool.name] = {
        cache_miss_ms: missTime,
        cache_hit_ms: avgHitTime,
        improvement_percent: improvement,
        hit_times: hitTimes,
      };

      console.log(`   ${tool.name}: ${missTime.toFixed(0)}ms miss → ${avgHitTime.toFixed(0)}ms hit (${improvement.toFixed(0)}% faster)`);
    }

    // Get cache statistics
    try {
      const cacheStats = await this.getCacheStats();
      this.results.detailed.cache.statistics = cacheStats;
      console.log(`   Cache hit rate: ${(cacheStats.hit_rate * 100).toFixed(1)}%`);
    } catch (error) {
      console.warn('   Failed to get cache statistics:', error.message);
    }

    console.log('✅ Cache tests completed\n');
  }

  /**
   * Run stress tests with high load
   */
  async runStressTests() {
    console.log('🔥 Running stress tests (2x concurrent load)...');
    
    const stressConcurrent = this.options.concurrent * 2;
    const stressDuration = Math.max(10, this.options.duration / 3);

    this.results.detailed.stress = {};

    // Test critical tools under stress
    const criticalTools = MCP_TOOLS.filter(tool => tool.critical);
    
    for (const tool of criticalTools) {
      const toolResults = await this.benchmarkTool(tool, {
        concurrent: stressConcurrent,
        duration: stressDuration,
        phase: 'stress'
      });

      this.results.detailed.stress[tool.name] = toolResults;

      const avgTime = toolResults.response_times.reduce((a, b) => a + b, 0) / toolResults.response_times.length;
      const errorRate = toolResults.errors / toolResults.total_requests;

      console.log(`   ${tool.name}: ${avgTime.toFixed(0)}ms avg, ${(errorRate * 100).toFixed(1)}% errors`);
    }

    console.log('✅ Stress tests completed\n');
  }

  /**
   * Monitor memory usage during tests
   */
  async runMemoryTests() {
    console.log('🧠 Running memory performance tests...');

    const memoryStats = [];
    const duration = 30; // 30 seconds
    const interval = 1000; // 1 second

    // Start memory monitoring
    const monitoringPromise = this.monitorMemory(duration, interval, memoryStats);

    // Run concurrent load while monitoring
    const loadPromise = this.benchmarkTool(MCP_TOOLS[0], {
      concurrent: this.options.concurrent,
      duration: duration,
      phase: 'memory'
    });

    const [, toolResults] = await Promise.all([monitoringPromise, loadPromise]);

    const avgMemory = memoryStats.reduce((a, b) => a + b.memory_mb, 0) / memoryStats.length;
    const maxMemory = Math.max(...memoryStats.map(s => s.memory_mb));
    const avgCpu = memoryStats.reduce((a, b) => a + b.cpu_percent, 0) / memoryStats.length;

    this.results.detailed.memory = {
      average_memory_mb: avgMemory,
      peak_memory_mb: maxMemory,
      average_cpu_percent: avgCpu,
      memory_samples: memoryStats,
      concurrent_requests: toolResults,
    };

    console.log(`   Average memory: ${avgMemory.toFixed(0)}MB`);
    console.log(`   Peak memory: ${maxMemory.toFixed(0)}MB`);
    console.log(`   Average CPU: ${avgCpu.toFixed(1)}%`);

    console.log('✅ Memory tests completed\n');
  }

  /**
   * Benchmark a specific MCP tool
   */
  async benchmarkTool(tool, options = {}) {
    const {
      concurrent = 1,
      duration = 10,
      iterations = null,
      phase = 'test'
    } = options;

    const results = {
      tool_name: tool.name,
      phase,
      concurrent,
      duration,
      response_times: [],
      errors: 0,
      total_requests: 0,
      start_time: Date.now(),
    };

    const promises = [];
    const startTime = performance.now();
    const endTime = iterations ? null : startTime + (duration * 1000);

    // Create concurrent workers
    for (let i = 0; i < concurrent; i++) {
      promises.push(this.runWorker(tool, endTime, iterations, results));
    }

    await Promise.all(promises);

    results.end_time = Date.now();
    results.actual_duration = (performance.now() - startTime) / 1000;
    results.throughput = results.total_requests / results.actual_duration;
    results.error_rate = results.errors / results.total_requests;

    // Calculate percentiles
    const sorted = results.response_times.sort((a, b) => a - b);
    results.percentiles = {
      p50: this.getPercentile(sorted, 50),
      p95: this.getPercentile(sorted, 95),
      p99: this.getPercentile(sorted, 99),
    };

    return results;
  }

  /**
   * Worker function for concurrent testing
   */
  async runWorker(tool, endTime, iterations, results) {
    let requestCount = 0;

    while (true) {
      // Check termination conditions
      if (iterations && requestCount >= iterations / results.concurrent) break;
      if (endTime && performance.now() > endTime) break;

      try {
        const responseTime = await this.measureSingleRequest(tool.name, tool.args);
        results.response_times.push(responseTime);
        results.total_requests++;
      } catch (error) {
        results.errors++;
        results.total_requests++;
        if (this.options.verbose) {
          console.warn(`Request failed for ${tool.name}: ${error.message}`);
        }
      }

      requestCount++;
    }
  }

  /**
   * Measure response time for a single MCP tool call
   */
  async measureSingleRequest(toolName, args) {
    const startTime = performance.now();
    await this.callMCPTool(toolName, args);
    return performance.now() - startTime;
  }

  /**
   * Make MCP tool call via HTTP API
   */
  async callMCPTool(toolName, args) {
    const response = await fetch(`${this.options.serverUrl}/mcp/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: toolName,
        arguments: args,
      }),
      timeout: 30000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get cache statistics from server
   */
  async getCacheStats() {
    const response = await fetch(`${this.options.serverUrl}/metrics`);
    if (!response.ok) {
      throw new Error(`Failed to get metrics: ${response.status}`);
    }
    const metrics = await response.json();
    return metrics.cache || {};
  }

  /**
   * Monitor system memory and CPU usage
   */
  async monitorMemory(durationSeconds, intervalMs, statsArray) {
    const samples = Math.floor((durationSeconds * 1000) / intervalMs);
    
    for (let i = 0; i < samples; i++) {
      try {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        statsArray.push({
          timestamp: Date.now(),
          memory_mb: Math.round(memUsage.rss / 1024 / 1024),
          heap_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
          cpu_percent: Math.round((cpuUsage.user + cpuUsage.system) / 1000) / 10,
        });
      } catch (error) {
        console.warn('Failed to collect memory stats:', error.message);
      }

      if (i < samples - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  /**
   * Analyze benchmark results and generate recommendations
   */
  async analyzeResults() {
    console.log('📈 Analyzing results and generating recommendations...');

    const summary = {
      total_tests: Object.keys(this.results.detailed).length,
      targets_met: 0,
      targets_failed: 0,
      performance_grade: 'A',
      critical_issues: [],
      recommendations: [],
    };

    // Analyze baseline performance
    if (this.results.detailed.baseline) {
      for (const [toolName, results] of Object.entries(this.results.detailed.baseline)) {
        const tool = MCP_TOOLS.find(t => t.name === toolName);
        const avgTime = results.response_times.reduce((a, b) => a + b, 0) / results.response_times.length;
        const target = tool.critical ? PERFORMANCE_TARGETS.cached_response_ms : PERFORMANCE_TARGETS.uncached_response_ms;

        if (avgTime <= target) {
          summary.targets_met++;
        } else {
          summary.targets_failed++;
          summary.critical_issues.push({
            tool: toolName,
            issue: 'Response time exceeds target',
            actual: `${avgTime.toFixed(0)}ms`,
            target: `${target}ms`,
            severity: tool.critical ? 'high' : 'medium',
          });
        }
      }
    }

    // Analyze cache performance
    if (this.results.detailed.cache?.statistics) {
      const hitRate = this.results.detailed.cache.statistics.hit_rate || 0;
      if (hitRate < PERFORMANCE_TARGETS.min_cache_hit_rate) {
        summary.critical_issues.push({
          tool: 'cache',
          issue: 'Cache hit rate below target',
          actual: `${(hitRate * 100).toFixed(1)}%`,
          target: `${(PERFORMANCE_TARGETS.min_cache_hit_rate * 100).toFixed(1)}%`,
          severity: 'high',
        });
      }
    }

    // Analyze memory usage
    if (this.results.detailed.memory) {
      const peakMemory = this.results.detailed.memory.peak_memory_mb;
      if (peakMemory > PERFORMANCE_TARGETS.max_memory_mb) {
        summary.critical_issues.push({
          tool: 'memory',
          issue: 'Memory usage exceeds target',
          actual: `${peakMemory}MB`,
          target: `${PERFORMANCE_TARGETS.max_memory_mb}MB`,
          severity: 'medium',
        });
      }
    }

    // Generate recommendations
    this.generateRecommendations(summary);

    // Calculate overall grade
    const issueCount = summary.critical_issues.length;
    if (issueCount === 0) summary.performance_grade = 'A';
    else if (issueCount <= 2) summary.performance_grade = 'B';
    else if (issueCount <= 4) summary.performance_grade = 'C';
    else summary.performance_grade = 'F';

    this.results.summary = summary;
    console.log(`   Overall Grade: ${summary.performance_grade}`);
    console.log(`   Targets Met: ${summary.targets_met}/${summary.targets_met + summary.targets_failed}`);
    console.log(`   Critical Issues: ${summary.critical_issues.length}`);
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(summary) {
    const recommendations = [];

    // Cache optimization recommendations
    if (this.results.detailed.cache?.statistics?.hit_rate < 0.8) {
      recommendations.push({
        category: 'caching',
        priority: 'high',
        title: 'Improve cache hit rate',
        description: 'Implement cache warming for critical runbooks and increase TTL for stable content',
        impact: 'high',
      });
    }

    // Memory optimization recommendations
    if (this.results.detailed.memory?.peak_memory_mb > 1024) {
      recommendations.push({
        category: 'memory',
        priority: 'medium',
        title: 'Optimize memory usage',
        description: 'Implement memory pooling and optimize data structures for large responses',
        impact: 'medium',
      });
    }

    // Response time optimization
    const slowTools = [];
    if (this.results.detailed.baseline) {
      for (const [toolName, results] of Object.entries(this.results.detailed.baseline)) {
        const avgTime = results.response_times.reduce((a, b) => a + b, 0) / results.response_times.length;
        if (avgTime > 500) {
          slowTools.push(toolName);
        }
      }
    }

    if (slowTools.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Optimize slow tools',
        description: `Tools ${slowTools.join(', ')} need performance optimization. Consider database indexing, query optimization, or result caching.`,
        impact: 'high',
      });
    }

    summary.recommendations = recommendations;
    this.results.recommendations = recommendations;
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport() {
    console.log('📋 Generating performance report...');

    // Console summary
    this.printConsoleSummary();

    // Save detailed JSON report
    if (this.options.output) {
      const outputPath = this.options.output;
      const outputDir = dirname(outputPath);
      
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
      console.log(`📄 Detailed report saved to: ${outputPath}`);
    }

    // Generate HTML report
    const htmlPath = join(__dirname, '..', 'reports', 'performance-report.html');
    await this.generateHTMLReport(htmlPath);
    console.log(`🌐 HTML report generated: ${htmlPath}`);
  }

  /**
   * Print console summary
   */
  printConsoleSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 PERFORMANCE BENCHMARK SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n📊 Overall Grade: ${this.results.summary.performance_grade}`);
    console.log(`🎯 Targets Met: ${this.results.summary.targets_met}/${this.results.summary.targets_met + this.results.summary.targets_failed}`);

    if (this.results.summary.critical_issues.length > 0) {
      console.log('\n❌ Critical Issues:');
      this.results.summary.critical_issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue.tool}: ${issue.issue}`);
        console.log(`      Actual: ${issue.actual}, Target: ${issue.target}`);
      });
    }

    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`      ${rec.description}`);
      });
    }

    // Performance metrics summary
    if (this.results.detailed.baseline) {
      console.log('\n⚡ Response Time Summary:');
      for (const [toolName, results] of Object.entries(this.results.detailed.baseline)) {
        const avgTime = results.response_times.reduce((a, b) => a + b, 0) / results.response_times.length;
        const tool = MCP_TOOLS.find(t => t.name === toolName);
        const target = tool.critical ? PERFORMANCE_TARGETS.cached_response_ms : PERFORMANCE_TARGETS.uncached_response_ms;
        const status = avgTime <= target ? '✅' : '❌';
        console.log(`   ${toolName}: ${avgTime.toFixed(0)}ms ${status}`);
      }
    }

    if (this.results.detailed.cache?.statistics) {
      const stats = this.results.detailed.cache.statistics;
      console.log(`\n💾 Cache Performance:`);
      console.log(`   Hit Rate: ${(stats.hit_rate * 100).toFixed(1)}% ${stats.hit_rate >= PERFORMANCE_TARGETS.min_cache_hit_rate ? '✅' : '❌'}`);
      console.log(`   Total Operations: ${stats.total_operations}`);
    }

    if (this.results.detailed.memory) {
      const memory = this.results.detailed.memory;
      console.log(`\n🧠 Memory Performance:`);
      console.log(`   Peak Memory: ${memory.peak_memory_mb.toFixed(0)}MB ${memory.peak_memory_mb <= PERFORMANCE_TARGETS.max_memory_mb ? '✅' : '❌'}`);
      console.log(`   Average CPU: ${memory.average_cpu_percent.toFixed(1)}%`);
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Generate HTML performance report
   */
  async generateHTMLReport(outputPath) {
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const html = this.generateHTMLContent();
    writeFileSync(outputPath, html);
  }

  /**
   * Generate HTML report content
   */
  generateHTMLContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Benchmark Report - Personal Pipeline MCP</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .grade { font-size: 3em; font-weight: bold; margin: 20px 0; }
        .grade.A { color: #22c55e; }
        .grade.B { color: #84cc16; }
        .grade.C { color: #f59e0b; }
        .grade.F { color: #ef4444; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .metric-title { font-weight: 600; color: #374151; margin-bottom: 10px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #1f2937; }
        .metric-target { color: #6b7280; font-size: 0.9em; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: 500; font-size: 0.8em; }
        .status.success { background: #dcfce7; color: #166534; }
        .status.error { background: #fee2e2; color: #991b1b; }
        .recommendations { background: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 30px 0; }
        .chart-container { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .timestamp { color: #6b7280; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Performance Benchmark Report</h1>
            <p class="timestamp">Generated: ${this.results.timestamp}</p>
            <div class="grade ${this.results.summary.performance_grade}">${this.results.summary.performance_grade}</div>
            <p>Overall Performance Grade</p>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-title">Targets Met</div>
                <div class="metric-value">${this.results.summary.targets_met}/${this.results.summary.targets_met + this.results.summary.targets_failed}</div>
                <div class="metric-target">Performance targets achieved</div>
            </div>
            ${this.results.detailed.cache?.statistics ? `
            <div class="metric-card">
                <div class="metric-title">Cache Hit Rate</div>
                <div class="metric-value">${(this.results.detailed.cache.statistics.hit_rate * 100).toFixed(1)}%</div>
                <div class="metric-target">Target: ≥${(PERFORMANCE_TARGETS.min_cache_hit_rate * 100).toFixed(1)}%</div>
            </div>
            ` : ''}
            ${this.results.detailed.memory ? `
            <div class="metric-card">
                <div class="metric-title">Peak Memory</div>
                <div class="metric-value">${this.results.detailed.memory.peak_memory_mb.toFixed(0)}MB</div>
                <div class="metric-target">Target: ≤${PERFORMANCE_TARGETS.max_memory_mb}MB</div>
            </div>
            ` : ''}
            <div class="metric-card">
                <div class="metric-title">Critical Issues</div>
                <div class="metric-value">${this.results.summary.critical_issues.length}</div>
                <div class="metric-target">Issues requiring attention</div>
            </div>
        </div>

        ${this.results.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>💡 Performance Recommendations</h3>
            <ul>
                ${this.results.recommendations.map(rec => 
                    `<li><strong>[${rec.priority.toUpperCase()}]</strong> ${rec.title}: ${rec.description}</li>`
                ).join('')}
            </ul>
        </div>
        ` : ''}

        <h3>📊 Tool Performance Summary</h3>
        <table>
            <thead>
                <tr>
                    <th>Tool</th>
                    <th>Avg Response Time</th>
                    <th>P95 Response Time</th>
                    <th>Target</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${this.results.detailed.baseline ? Object.entries(this.results.detailed.baseline).map(([toolName, results]) => {
                    const avgTime = results.response_times.reduce((a, b) => a + b, 0) / results.response_times.length;
                    const tool = MCP_TOOLS.find(t => t.name === toolName);
                    const target = tool.critical ? PERFORMANCE_TARGETS.cached_response_ms : PERFORMANCE_TARGETS.uncached_response_ms;
                    const status = avgTime <= target ? 'success' : 'error';
                    return `
                    <tr>
                        <td>${toolName}</td>
                        <td>${avgTime.toFixed(0)}ms</td>
                        <td>${results.percentiles.p95.toFixed(0)}ms</td>
                        <td>${target}ms</td>
                        <td><span class="status ${status}">${avgTime <= target ? 'PASS' : 'FAIL'}</span></td>
                    </tr>
                    `;
                }).join('') : '<tr><td colspan="5">No baseline data available</td></tr>'}
            </tbody>
        </table>

        <div class="chart-container">
            <h4>Test Configuration</h4>
            <p><strong>Concurrent Requests:</strong> ${this.options.concurrent}</p>
            <p><strong>Test Duration:</strong> ${this.options.duration} seconds</p>
            <p><strong>Cache Testing:</strong> ${this.options.cacheTest ? 'Enabled' : 'Disabled'}</p>
            <p><strong>Cache Warmup:</strong> ${this.options.warmup ? 'Enabled' : 'Disabled'}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Calculate percentile from sorted array
   */
  getPercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.mcpProcess && !this.mcpProcess.killed) {
      console.log('🧹 Cleaning up MCP server process...');
      this.mcpProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        this.mcpProcess.on('exit', resolve);
        setTimeout(resolve, 5000); // Force kill after 5 seconds
      });
    }
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
      case 'concurrent':
        options.concurrent = parseInt(value) || 10;
        break;
      case 'duration':
        options.duration = parseInt(value) || 30;
        break;
      case 'cache-test':
        options.cacheTest = true;
        i--; // No value for this flag
        break;
      case 'no-warmup':
        options.warmup = false;
        i--; // No value for this flag
        break;
      case 'output':
        options.output = value;
        break;
      case 'target':
        options.target = parseInt(value) || 200;
        break;
      case 'verbose':
        options.verbose = true;
        i--; // No value for this flag
        break;
      case 'external-server':
        options.externalServer = true;
        i--; // No value for this flag
        break;
      case 'help':
        console.log(`
Performance Benchmark Suite for Personal Pipeline MCP Server

Usage: node scripts/benchmark.js [options]

Options:
  --concurrent <n>    Number of concurrent requests per test (default: 10)
  --duration <n>      Test duration in seconds (default: 30)
  --cache-test        Include cache performance tests
  --no-warmup         Skip cache warmup phase
  --output <file>     Save results to JSON file
  --target <ms>       Target response time in ms (default: 200)
  --verbose           Detailed logging
  --external-server   Use external server (don't start MCP server)
  --help              Show this help message

Examples:
  node scripts/benchmark.js --concurrent 25 --duration 60
  node scripts/benchmark.js --cache-test --output results/benchmark.json
  node scripts/benchmark.js --target 100 --verbose
        `);
        process.exit(0);
      default:
        if (key && !value) {
          console.error(`Missing value for option: --${key}`);
          process.exit(1);
        }
    }
  }

  // Set default output path if not specified
  if (!options.output) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    options.output = join(__dirname, '..', 'reports', `benchmark-${timestamp}.json`);
  }

  console.log('🚀 Starting Personal Pipeline MCP Performance Benchmark\n');

  const benchmark = new PerformanceBenchmark(options);
  const success = await benchmark.run();

  process.exit(success ? 0 : 1);
}

export { PerformanceBenchmark, PERFORMANCE_TARGETS, MCP_TOOLS };