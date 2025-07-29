#!/usr/bin/env node

/**
 * Load Testing Framework for Personal Pipeline MCP Server
 * 
 * Specialized load testing tool that simulates realistic incident response scenarios
 * with varying load patterns, cache behavior testing, and performance regression detection.
 * 
 * Usage:
 *   node scripts/load-test.js [options]
 */

import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load testing scenarios
const LOAD_SCENARIOS = {
  // Normal operational load
  normal: {
    name: 'Normal Operations',
    concurrent_users: 10,
    duration_seconds: 60,
    request_rate_per_second: 5,
    cache_hit_ratio: 0.8,
    error_rate_threshold: 0.01,
  },

  // Peak operational load
  peak: {
    name: 'Peak Operations',
    concurrent_users: 25,
    duration_seconds: 120,
    request_rate_per_second: 15,
    cache_hit_ratio: 0.7,
    error_rate_threshold: 0.02,
  },

  // Incident storm scenario
  storm: {
    name: 'Incident Storm',
    concurrent_users: 50,
    duration_seconds: 300,
    request_rate_per_second: 30,
    cache_hit_ratio: 0.5, // More unique queries during incidents
    error_rate_threshold: 0.05,
  },

  // Stress test
  stress: {
    name: 'Stress Test',
    concurrent_users: 100,
    duration_seconds: 180,
    request_rate_per_second: 50,
    cache_hit_ratio: 0.3,
    error_rate_threshold: 0.10,
  },

  // Spike test
  spike: {
    name: 'Spike Test',
    concurrent_users: 150,
    duration_seconds: 60,
    request_rate_per_second: 100,
    cache_hit_ratio: 0.2,
    error_rate_threshold: 0.15,
  },
};

// Realistic incident scenarios
const INCIDENT_SCENARIOS = [
  {
    name: 'Memory Pressure Alert',
    tools: [
      { name: 'search_runbooks', weight: 0.4 },
      { name: 'get_decision_tree', weight: 0.3 },
      { name: 'get_procedure', weight: 0.2 },
      { name: 'get_escalation_path', weight: 0.1 },
    ],
    args_templates: {
      search_runbooks: {
        alert_type: ['memory_pressure', 'memory_leak', 'memory_exhaustion'],
        severity: ['critical', 'high', 'medium'],
        affected_systems: [['web-server'], ['database'], ['cache-server'], ['web-server', 'database']],
      },
      get_decision_tree: {
        alert_context: {
          alert_type: ['memory_pressure'],
          severity: ['critical', 'high'],
          system: ['web-01', 'db-01', 'cache-01'],
        },
      },
    },
  },

  {
    name: 'Service Downtime',
    tools: [
      { name: 'search_runbooks', weight: 0.5 },
      { name: 'get_escalation_path', weight: 0.3 },
      { name: 'get_decision_tree', weight: 0.2 },
    ],
    args_templates: {
      search_runbooks: {
        alert_type: ['service_down', 'service_unavailable', 'connection_refused'],
        severity: ['critical', 'high'],
        affected_systems: [['api-gateway'], ['payment-service'], ['user-service']],
      },
      get_escalation_path: {
        severity: ['critical'],
        business_hours: [true, false],
        failed_attempts: [[], ['restart_service'], ['restart_service', 'check_logs']],
      },
    },
  },

  {
    name: 'Performance Degradation',
    tools: [
      { name: 'search_knowledge_base', weight: 0.4 },
      { name: 'search_runbooks', weight: 0.3 },
      { name: 'get_procedure', weight: 0.3 },
    ],
    args_templates: {
      search_knowledge_base: {
        query: [
          'database slow queries',
          'high CPU usage troubleshooting',
          'network latency issues',
          'application performance monitoring',
        ],
        categories: [['performance'], ['database'], ['monitoring']],
        max_results: [5, 10, 15],
      },
    },
  },

  {
    name: 'Security Incident',
    tools: [
      { name: 'search_runbooks', weight: 0.4 },
      { name: 'get_escalation_path', weight: 0.3 },
      { name: 'record_resolution_feedback', weight: 0.3 },
    ],
    args_templates: {
      search_runbooks: {
        alert_type: ['security_breach', 'unauthorized_access', 'ddos_attack'],
        severity: ['critical'],
        affected_systems: [['auth-service'], ['api-gateway'], ['database']],
      },
      get_escalation_path: {
        severity: ['critical'],
        business_hours: [true, false],
        failed_attempts: [['isolate_system'], ['contact_security_team']],
      },
    },
  },
];

class LoadTestFramework {
  constructor(options = {}) {
    this.options = {
      scenario: options.scenario || 'normal',
      serverUrl: options.serverUrl || 'http://localhost:3000',
      outputDir: options.outputDir || join(__dirname, '..', 'reports'),
      verbose: options.verbose || false,
      realtime: options.realtime || false,
      cacheProfile: options.cacheProfile || true,
      ...options
    };

    this.scenario = LOAD_SCENARIOS[this.options.scenario];
    if (!this.scenario) {
      throw new Error(`Unknown scenario: ${this.options.scenario}`);
    }

    this.results = {
      scenario: this.scenario,
      start_time: null,
      end_time: null,
      summary: {},
      detailed_metrics: {},
      cache_analysis: {},
      errors: [],
      recommendations: [],
    };

    this.workers = [];
    this.realtimeStats = {
      active_requests: 0,
      total_requests: 0,
      total_errors: 0,
      response_times: [],
      current_rps: 0,
    };
  }

  /**
   * Run load test scenario
   */
  async run() {
    try {
      console.log(`🚀 Starting Load Test: ${this.scenario.name}`);
      console.log(`👥 Concurrent Users: ${this.scenario.concurrent_users}`);
      console.log(`⏱️  Duration: ${this.scenario.duration_seconds}s`);
      console.log(`📊 Target RPS: ${this.scenario.request_rate_per_second}\n`);

      this.results.start_time = new Date().toISOString();

      // Initialize monitoring
      if (this.options.realtime) {
        this.startRealtimeMonitoring();
      }

      // Run load test phases
      await this.runWarmupPhase();
      await this.runLoadTestPhase();
      await this.runCooldownPhase();

      // Collect final metrics
      await this.collectFinalMetrics();

      // Analyze results
      this.analyzeResults();

      // Generate reports
      await this.generateReports();

      this.results.end_time = new Date().toISOString();
      console.log('\n✅ Load test completed successfully!');
      
      return this.results;

    } catch (error) {
      console.error('❌ Load test failed:', error.message);
      this.results.errors.push({
        phase: 'overall',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return this.results;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Warmup phase - establish baseline performance
   */
  async runWarmupPhase() {
    console.log('🔥 Warmup Phase (30s)...');
    
    const warmupDuration = 30;
    const warmupUsers = Math.min(5, this.scenario.concurrent_users);
    
    const warmupResults = await this.executeLoadPhase({
      concurrent_users: warmupUsers,
      duration_seconds: warmupDuration,
      request_rate_per_second: this.scenario.request_rate_per_second / 2,
      phase: 'warmup',
    });

    this.results.detailed_metrics.warmup = warmupResults;
    
    const avgResponseTime = this.calculateAverageResponseTime(warmupResults.response_times);
    console.log(`   Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Requests completed: ${warmupResults.total_requests}`);
    console.log(`   Error rate: ${(warmupResults.error_rate * 100).toFixed(2)}%\n`);
  }

  /**
   * Main load test phase
   */
  async runLoadTestPhase() {
    console.log(`⚡ Load Test Phase (${this.scenario.duration_seconds}s)...`);
    
    const loadResults = await this.executeLoadPhase({
      concurrent_users: this.scenario.concurrent_users,
      duration_seconds: this.scenario.duration_seconds,
      request_rate_per_second: this.scenario.request_rate_per_second,
      phase: 'load',
    });

    this.results.detailed_metrics.load = loadResults;
    
    const avgResponseTime = this.calculateAverageResponseTime(loadResults.response_times);
    console.log(`   Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Total requests: ${loadResults.total_requests}`);
    console.log(`   Actual RPS: ${loadResults.actual_rps.toFixed(1)}`);
    console.log(`   Error rate: ${(loadResults.error_rate * 100).toFixed(2)}%\n`);
  }

  /**
   * Cooldown phase - verify system recovery
   */
  async runCooldownPhase() {
    console.log('❄️ Cooldown Phase (15s)...');
    
    const cooldownResults = await this.executeLoadPhase({
      concurrent_users: 2,
      duration_seconds: 15,
      request_rate_per_second: 1,
      phase: 'cooldown',
    });

    this.results.detailed_metrics.cooldown = cooldownResults;
    
    const avgResponseTime = this.calculateAverageResponseTime(cooldownResults.response_times);
    console.log(`   Recovery response time: ${avgResponseTime.toFixed(0)}ms\n`);
  }

  /**
   * Execute a load testing phase with worker threads
   */
  async executeLoadPhase(config) {
    const { concurrent_users, duration_seconds, request_rate_per_second, phase } = config;
    
    const results = {
      phase,
      config,
      start_time: Date.now(),
      end_time: null,
      response_times: [],
      error_count: 0,
      total_requests: 0,
      actual_rps: 0,
      error_rate: 0,
      tool_stats: {},
      worker_stats: [],
    };

    const promises = [];
    
    // Create worker threads for concurrent load generation
    for (let i = 0; i < concurrent_users; i++) {
      const workerPromise = this.createWorker({
        workerId: i,
        duration_seconds,
        target_rps: request_rate_per_second / concurrent_users,
        server_url: this.options.serverUrl,
        cache_hit_ratio: this.scenario.cache_hit_ratio,
        verbose: this.options.verbose,
      });
      
      promises.push(workerPromise);
    }

    // Wait for all workers to complete
    const workerResults = await Promise.all(promises);

    // Aggregate results
    for (const workerResult of workerResults) {
      results.response_times.push(...workerResult.response_times);
      results.error_count += workerResult.error_count;
      results.total_requests += workerResult.total_requests;
      results.worker_stats.push(workerResult);

      // Aggregate tool statistics
      for (const [tool, stats] of Object.entries(workerResult.tool_stats)) {
        if (!results.tool_stats[tool]) {
          results.tool_stats[tool] = { count: 0, total_time: 0, errors: 0 };
        }
        results.tool_stats[tool].count += stats.count;
        results.tool_stats[tool].total_time += stats.total_time;
        results.tool_stats[tool].errors += stats.errors;
      }
    }

    results.end_time = Date.now();
    results.actual_duration = (results.end_time - results.start_time) / 1000;
    results.actual_rps = results.total_requests / results.actual_duration;
    results.error_rate = results.error_count / results.total_requests;

    return results;
  }

  /**
   * Create a worker thread for load generation
   */
  async createWorker(workerConfig) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { ...workerConfig, isWorker: true }
      });

      worker.on('message', (result) => {
        resolve(result);
      });

      worker.on('error', (error) => {
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      this.workers.push(worker);
    });
  }

  /**
   * Start real-time monitoring
   */
  startRealtimeMonitoring() {
    console.log('📊 Real-time monitoring enabled\n');
    
    const interval = setInterval(() => {
      const rps = this.realtimeStats.current_rps;
      const errorRate = this.realtimeStats.total_errors / Math.max(1, this.realtimeStats.total_requests);
      
      process.stdout.write(`\r📈 Active: ${this.realtimeStats.active_requests} | ` +
                          `Total: ${this.realtimeStats.total_requests} | ` +
                          `RPS: ${rps.toFixed(1)} | ` +
                          `Errors: ${(errorRate * 100).toFixed(1)}%`);
      
      // Reset current RPS counter
      this.realtimeStats.current_rps = 0;
    }, 1000);

    this.realtimeInterval = interval;
  }

  /**
   * Collect final performance metrics
   */
  async collectFinalMetrics() {
    console.log('📊 Collecting final metrics...');

    try {
      // Get server health and metrics
      const healthResponse = await fetch(`${this.options.serverUrl}/health`);
      const metricsResponse = await fetch(`${this.options.serverUrl}/metrics`);
      
      if (healthResponse.ok && metricsResponse.ok) {
        this.results.server_health = await healthResponse.json();
        this.results.server_metrics = await metricsResponse.json();
      }

      // Collect cache statistics if enabled
      if (this.options.cacheProfile && this.results.server_metrics?.cache) {
        this.results.cache_analysis = this.analyzeCachePerformance(this.results.server_metrics.cache);
      }

    } catch (error) {
      console.warn('   Failed to collect server metrics:', error.message);
    }
  }

  /**
   * Analyze cache performance
   */
  analyzeCachePerformance(cacheStats) {
    return {
      hit_rate: cacheStats.hit_rate || 0,
      total_operations: cacheStats.total_operations || 0,
      hits: cacheStats.hits || 0,
      misses: cacheStats.misses || 0,
      by_content_type: cacheStats.by_content_type || {},
      
      // Analysis
      performance_grade: this.gradeCachePerformance(cacheStats.hit_rate),
      meets_target: (cacheStats.hit_rate || 0) >= this.scenario.cache_hit_ratio,
      optimization_potential: this.calculateCacheOptimizationPotential(cacheStats),
    };
  }

  /**
   * Grade cache performance
   */
  gradeCachePerformance(hitRate) {
    if (hitRate >= 0.9) return 'A';
    if (hitRate >= 0.8) return 'B';
    if (hitRate >= 0.7) return 'C';
    if (hitRate >= 0.6) return 'D';
    return 'F';
  }

  /**
   * Calculate cache optimization potential
   */
  calculateCacheOptimizationPotential(cacheStats) {
    const currentHitRate = cacheStats.hit_rate || 0;
    const targetHitRate = 0.85; // Target 85% hit rate
    
    if (currentHitRate >= targetHitRate) {
      return 'Low - Cache performance is already optimal';
    }
    
    const improvement = targetHitRate - currentHitRate;
    const responseTimeImprovement = improvement * 300; // Assume 300ms average improvement per cache hit
    
    return `High - Potential ${responseTimeImprovement.toFixed(0)}ms response time improvement`;
  }

  /**
   * Analyze load test results
   */
  analyzeResults() {
    console.log('📈 Analyzing results...');

    const loadMetrics = this.results.detailed_metrics.load;
    if (!loadMetrics) return;

    // Calculate summary statistics
    const summary = {
      total_requests: loadMetrics.total_requests,
      error_rate: loadMetrics.error_rate,
      actual_rps: loadMetrics.actual_rps,
      target_rps: this.scenario.request_rate_per_second,
      rps_achievement: loadMetrics.actual_rps / this.scenario.request_rate_per_second,
    };

    // Response time analysis
    const responseTimes = loadMetrics.response_times.sort((a, b) => a - b);
    summary.response_times = {
      avg: this.calculateAverageResponseTime(responseTimes),
      p50: this.getPercentile(responseTimes, 50),
      p95: this.getPercentile(responseTimes, 95),
      p99: this.getPercentile(responseTimes, 99),
      max: Math.max(...responseTimes),
    };

    // Performance assessment
    summary.performance_grade = this.calculatePerformanceGrade(summary);
    summary.meets_error_threshold = loadMetrics.error_rate <= this.scenario.error_rate_threshold;
    summary.meets_response_targets = summary.response_times.p95 <= 2000; // 2s P95 target

    this.results.summary = summary;

    // Generate recommendations
    this.generateRecommendations(summary);
  }

  /**
   * Calculate overall performance grade
   */
  calculatePerformanceGrade(summary) {
    let score = 100;

    // Deduct points for high error rate
    if (summary.error_rate > this.scenario.error_rate_threshold) {
      score -= (summary.error_rate - this.scenario.error_rate_threshold) * 1000;
    }

    // Deduct points for low RPS achievement
    if (summary.rps_achievement < 0.9) {
      score -= (0.9 - summary.rps_achievement) * 50;
    }

    // Deduct points for high response times
    if (summary.response_times.p95 > 1000) {
      score -= (summary.response_times.p95 - 1000) / 20;
    }

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(summary) {
    const recommendations = [];

    // Error rate recommendations
    if (summary.error_rate > this.scenario.error_rate_threshold) {
      recommendations.push({
        category: 'reliability',
        priority: 'high',
        title: 'High error rate detected',
        description: `Error rate of ${(summary.error_rate * 100).toFixed(2)}% exceeds threshold of ${(this.scenario.error_rate_threshold * 100).toFixed(2)}%. Investigate error causes and implement retry mechanisms.`,
        impact: 'high',
      });
    }

    // Response time recommendations
    if (summary.response_times.p95 > 1000) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'High response times',
        description: `95th percentile response time of ${summary.response_times.p95.toFixed(0)}ms is above optimal range. Consider caching optimization and database query tuning.`,
        impact: 'high',
      });
    }

    // Throughput recommendations
    if (summary.rps_achievement < 0.8) {
      recommendations.push({
        category: 'scalability',
        priority: 'medium',
        title: 'Low throughput achievement',
        description: `Achieved ${(summary.rps_achievement * 100).toFixed(0)}% of target RPS. Consider horizontal scaling or connection pooling optimization.`,
        impact: 'medium',
      });
    }

    // Cache recommendations
    if (this.results.cache_analysis && this.results.cache_analysis.hit_rate < 0.7) {
      recommendations.push({
        category: 'caching',
        priority: 'high',
        title: 'Low cache hit rate',
        description: `Cache hit rate of ${(this.results.cache_analysis.hit_rate * 100).toFixed(1)}% is below optimal. Implement cache warming and optimize TTL settings.`,
        impact: 'high',
      });
    }

    this.results.recommendations = recommendations;
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports() {
    console.log('📋 Generating reports...');

    // Ensure output directory exists
    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true });
    }

    // Generate JSON report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = join(this.options.outputDir, `load-test-${this.options.scenario}-${timestamp}.json`);
    writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    // Generate console summary
    this.printConsoleSummary();

    console.log(`📄 Detailed report saved to: ${jsonPath}`);
  }

  /**
   * Print console summary
   */
  printConsoleSummary() {
    const summary = this.results.summary;
    if (!summary) return;

    console.log('\n' + '='.repeat(60));
    console.log(`🎯 LOAD TEST SUMMARY - ${this.scenario.name.toUpperCase()}`);
    console.log('='.repeat(60));

    console.log(`\n📊 Overall Grade: ${summary.performance_grade}`);
    console.log(`📈 Total Requests: ${summary.total_requests.toLocaleString()}`);
    console.log(`⚡ Achieved RPS: ${summary.actual_rps.toFixed(1)} (${(summary.rps_achievement * 100).toFixed(0)}% of target)`);
    console.log(`❌ Error Rate: ${(summary.error_rate * 100).toFixed(2)}%`);

    console.log('\n⏱️ Response Times:');
    console.log(`   Average: ${summary.response_times.avg.toFixed(0)}ms`);
    console.log(`   P95: ${summary.response_times.p95.toFixed(0)}ms`);
    console.log(`   P99: ${summary.response_times.p99.toFixed(0)}ms`);
    console.log(`   Max: ${summary.response_times.max.toFixed(0)}ms`);

    if (this.results.cache_analysis) {
      console.log('\n💾 Cache Performance:');
      console.log(`   Hit Rate: ${(this.results.cache_analysis.hit_rate * 100).toFixed(1)}% (Grade: ${this.results.cache_analysis.performance_grade})`);
      console.log(`   Total Operations: ${this.results.cache_analysis.total_operations.toLocaleString()}`);
    }

    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`      ${rec.description}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime(responseTimes) {
    return responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
  }

  /**
   * Get percentile from sorted array
   */
  getPercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Stop real-time monitoring
    if (this.realtimeInterval) {
      clearInterval(this.realtimeInterval);
      console.log(''); // New line after real-time stats
    }

    // Terminate worker threads
    for (const worker of this.workers) {
      await worker.terminate();
    }
  }
}

// Worker thread implementation
if (!isMainThread && workerData?.isWorker) {
  const workerLoadTest = new WorkerLoadTest(workerData);
  workerLoadTest.run().then(result => {
    parentPort.postMessage(result);
  }).catch(error => {
    parentPort.postMessage({ error: error.message });
  });
}

class WorkerLoadTest {
  constructor(config) {
    this.config = config;
    this.results = {
      worker_id: config.workerId,
      start_time: Date.now(),
      end_time: null,
      response_times: [],
      error_count: 0,
      total_requests: 0,
      tool_stats: {},
    };
  }

  async run() {
    const endTime = Date.now() + (this.config.duration_seconds * 1000);
    const requestInterval = 1000 / this.config.target_rps; // ms between requests

    while (Date.now() < endTime) {
      const requestStart = Date.now();
      
      try {
        await this.makeRequest();
        this.results.total_requests++;
        
        const responseTime = Date.now() - requestStart;
        this.results.response_times.push(responseTime);
        
      } catch (error) {
        this.results.error_count++;
        this.results.total_requests++;
        
        if (this.config.verbose) {
          console.error(`Worker ${this.config.workerId} request failed:`, error.message);
        }
      }

      // Rate limiting
      const elapsed = Date.now() - requestStart;
      if (elapsed < requestInterval) {
        await new Promise(resolve => setTimeout(resolve, requestInterval - elapsed));
      }
    }

    this.results.end_time = Date.now();
    return this.results;
  }

  async makeRequest() {
    // Select incident scenario and tool
    const scenario = this.selectIncidentScenario();
    const tool = this.selectTool(scenario);
    const args = this.generateArgs(scenario, tool);

    // Track tool usage
    if (!this.results.tool_stats[tool]) {
      this.results.tool_stats[tool] = { count: 0, total_time: 0, errors: 0 };
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.config.server_url}/mcp/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: tool,
          arguments: args,
        }),
        timeout: 30000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await response.json();
      
      const responseTime = Date.now() - startTime;
      this.results.tool_stats[tool].count++;
      this.results.tool_stats[tool].total_time += responseTime;
      
    } catch (error) {
      this.results.tool_stats[tool].errors++;
      throw error;
    }
  }

  selectIncidentScenario() {
    // Weighted random selection of incident scenarios
    const randomIndex = Math.floor(Math.random() * INCIDENT_SCENARIOS.length);
    return INCIDENT_SCENARIOS[randomIndex];
  }

  selectTool(scenario) {
    // Weighted random selection of tools based on scenario
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (const tool of scenario.tools) {
      cumulativeWeight += tool.weight;
      if (random <= cumulativeWeight) {
        return tool.name;
      }
    }
    
    return scenario.tools[0].name; // Fallback
  }

  generateArgs(scenario, toolName) {
    const template = scenario.args_templates[toolName];
    if (!template) {
      // Return default args for tools not in template
      return this.getDefaultArgs(toolName);
    }

    const args = {};
    for (const [key, options] of Object.entries(template)) {
      if (Array.isArray(options)) {
        args[key] = options[Math.floor(Math.random() * options.length)];
      } else if (typeof options === 'object') {
        args[key] = {};
        for (const [subKey, subOptions] of Object.entries(options)) {
          if (Array.isArray(subOptions)) {
            args[key][subKey] = subOptions[Math.floor(Math.random() * subOptions.length)];
          } else {
            args[key][subKey] = subOptions;
          }
        }
      } else {
        args[key] = options;
      }
    }

    return args;
  }

  getDefaultArgs(toolName) {
    const defaults = {
      search_runbooks: {
        alert_type: 'generic_alert',
        severity: 'medium',
        affected_systems: ['system-01'],
      },
      get_decision_tree: {
        alert_context: { alert_type: 'generic', severity: 'medium' },
      },
      get_procedure: {
        runbook_id: 'generic-001',
        step_name: 'check_status',
      },
      get_escalation_path: {
        severity: 'medium',
        business_hours: true,
      },
      list_sources: {
        include_health: true,
      },
      search_knowledge_base: {
        query: 'troubleshooting guide',
        max_results: 10,
      },
      record_resolution_feedback: {
        runbook_id: 'generic-001',
        procedure_id: 'check_status',
        outcome: 'success',
        resolution_time_minutes: 10,
      },
    };

    return defaults[toolName] || {};
  }
}

// CLI interface
if (isMainThread && import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];

    switch (key) {
      case 'scenario':
        options.scenario = value;
        break;
      case 'server-url':
        options.serverUrl = value;
        break;
      case 'output':
        options.outputDir = value;
        break;
      case 'verbose':
        options.verbose = true;
        i--; // No value for this flag
        break;
      case 'realtime':
        options.realtime = true;
        i--; // No value for this flag
        break;
      case 'no-cache':
        options.cacheProfile = false;
        i--; // No value for this flag
        break;
      case 'help':
        console.log(`
Load Testing Framework for Personal Pipeline MCP Server

Usage: node scripts/load-test.js [options]

Scenarios:
  normal      Normal operational load (10 users, 5 RPS)
  peak        Peak operational load (25 users, 15 RPS)
  storm       Incident storm scenario (50 users, 30 RPS)
  stress      Stress test (100 users, 50 RPS)
  spike       Spike test (150 users, 100 RPS)

Options:
  --scenario <name>    Load test scenario (default: normal)
  --server-url <url>   MCP server URL (default: http://localhost:3000)
  --output <dir>       Output directory for reports
  --verbose            Detailed logging
  --realtime           Real-time monitoring
  --no-cache           Disable cache profiling
  --help               Show this help message

Examples:
  node scripts/load-test.js --scenario peak --realtime
  node scripts/load-test.js --scenario storm --output ./reports/storm-test
  node scripts/load-test.js --scenario stress --verbose
        `);
        process.exit(0);
      default:
        if (key && !value) {
          console.error(`Missing value for option: --${key}`);
          process.exit(1);
        }
    }
  }

  // Set defaults
  if (!options.scenario) options.scenario = 'normal';
  if (!options.outputDir) options.outputDir = join(__dirname, '..', 'reports');

  console.log('🚀 Starting Personal Pipeline MCP Load Test\n');

  const loadTest = new LoadTestFramework(options);
  const results = await loadTest.run();

  const success = results.summary?.performance_grade !== 'F' && 
                 results.summary?.error_rate <= LOAD_SCENARIOS[options.scenario].error_rate_threshold;

  process.exit(success ? 0 : 1);
}

export { LoadTestFramework, LOAD_SCENARIOS, INCIDENT_SCENARIOS };