#!/usr/bin/env node

/**
 * Personal Pipeline Health Check Dashboard
 * 
 * Real-time health monitoring dashboard for the Personal Pipeline MCP server.
 * Displays system health metrics, cache performance, source adapter status,
 * and performance metrics in a terminal-based interface.
 * 
 * Authored by: DevOps Engineer (Hank)
 * Date: 2025-07-29
 */

const http = require('http');
const readline = require('readline');
const { performance } = require('perf_hooks');

class HealthDashboard {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.refreshInterval = options.refreshInterval || 5000; // 5 seconds
    this.maxHistoryPoints = options.maxHistoryPoints || 60; // Keep 5 minutes of data
    this.isRunning = false;
    this.refreshTimer = null;
    
    // Historical data storage
    this.history = {
      overall_health: [],
      response_times: [],
      memory_usage: [],
      cache_hit_rates: [],
      error_rates: [],
      uptime: []
    };

    // Dashboard state
    this.lastMetrics = null;
    this.alertsCount = 0;
    this.startTime = Date.now();

    // Setup terminal
    this.setupTerminal();
  }

  /**
   * Setup terminal for better display
   */
  setupTerminal() {
    process.stdout.write('\x1b[?1049h'); // Save screen
    process.stdout.write('\x1b[2J'); // Clear screen
    process.stdout.write('\x1b[H'); // Move cursor to home
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      this.stop();
    });

    process.on('SIGTERM', () => {
      this.stop();
    });
  }

  /**
   * Restore terminal state
   */
  restoreTerminal() {
    process.stdout.write('\x1b[?1049l'); // Restore screen
    process.stdout.write('\x1b[0m'); // Reset colors
  }

  /**
   * Make HTTP request to MCP server
   */
  async makeRequest(endpoint, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.baseUrl);
      const req = http.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(timeout, () => {
        req.abort();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Fetch all health and metrics data
   */
  async fetchMetrics() {
    const startTime = performance.now();
    
    try {
      const [health, detailedHealth, metrics, performance] = await Promise.all([
        this.makeRequest('/health').catch(() => ({ status: 'error', error: 'Basic health check failed' })),
        this.makeRequest('/health/detailed').catch(() => ({ overall_status: 'error', error: 'Detailed health check failed' })),
        this.makeRequest('/metrics').catch(() => ({ error: 'Metrics unavailable' })),
        this.makeRequest('/performance').catch(() => ({ error: 'Performance data unavailable' }))
      ]);

      const fetchTime = performance.now() - startTime;

      return {
        health,
        detailedHealth,
        metrics,
        performance,
        fetchTime: Math.round(fetchTime),
        timestamp: new Date()
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Update historical data
   */
  updateHistory(data) {
    const timestamp = Date.now();

    // Overall health status (convert to numeric for charting)
    const healthScore = this.getHealthScore(data.detailedHealth);
    this.addToHistory('overall_health', timestamp, healthScore);

    // Response times
    if (data.performance?.performance_report?.summary?.response_times?.p95_ms) {
      this.addToHistory('response_times', timestamp, data.performance.performance_report.summary.response_times.p95_ms);
    }

    // Memory usage
    if (data.metrics?.performance?.memory?.heap_used_mb) {
      this.addToHistory('memory_usage', timestamp, data.metrics.performance.memory.heap_used_mb);
    }

    // Cache hit rate
    if (data.metrics?.cache?.hit_rate !== undefined) {
      this.addToHistory('cache_hit_rates', timestamp, data.metrics.cache.hit_rate * 100);
    }

    // Error rate
    if (data.performance?.performance_report?.summary?.error_tracking?.error_rate !== undefined) {
      this.addToHistory('error_rates', timestamp, data.performance.performance_report.summary.error_tracking.error_rate * 100);
    }

    // Uptime
    if (data.metrics?.uptime) {
      this.addToHistory('uptime', timestamp, data.metrics.uptime / 3600); // Convert to hours
    }
  }

  /**
   * Add data point to history with sliding window
   */
  addToHistory(metric, timestamp, value) {
    if (!this.history[metric]) {
      this.history[metric] = [];
    }

    this.history[metric].push({ timestamp, value });

    // Keep only recent data points
    if (this.history[metric].length > this.maxHistoryPoints) {
      this.history[metric].shift();
    }
  }

  /**
   * Convert health status to numeric score for charting
   */
  getHealthScore(detailedHealth) {
    if (!detailedHealth || detailedHealth.error) return 0;
    
    switch (detailedHealth.overall_status) {
      case 'healthy': return 100;
      case 'degraded': return 50;
      case 'unhealthy': return 0;
      default: return 0;
    }
  }

  /**
   * Generate sparkline chart for metrics
   */
  generateSparkline(data, width = 40, height = 8) {
    if (!data || data.length === 0) {
      return Array(height).fill(' '.repeat(width));
    }

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const sparkline = Array(height).fill().map(() => ' '.repeat(width));
    
    for (let i = 0; i < Math.min(data.length, width); i++) {
      const value = values[values.length - width + i] || 0;
      const normalized = (value - min) / range;
      const y = Math.floor((1 - normalized) * (height - 1));
      
      if (y >= 0 && y < height) {
        const x = i;
        sparkline[y] = sparkline[y].substring(0, x) + '█' + sparkline[y].substring(x + 1);
      }
    }

    return sparkline;
  }

  /**
   * Render the complete dashboard
   */
  renderDashboard(data) {
    // Clear screen and move to top
    process.stdout.write('\x1b[2J\x1b[H');

    const width = process.stdout.columns || 80;
    const divider = '═'.repeat(width);
    const now = new Date().toLocaleString();

    // Header
    console.log('\x1b[1;36m' + '╔' + divider + '╗\x1b[0m');
    console.log('\x1b[1;36m║\x1b[1;37m' + ' Personal Pipeline - Health Dashboard'.padEnd(width) + '\x1b[1;36m║\x1b[0m');
    console.log('\x1b[1;36m║\x1b[0m' + ` Last Updated: ${now}`.padEnd(width + 1) + '\x1b[1;36m║\x1b[0m');
    console.log('\x1b[1;36m' + '╚' + divider + '╝\x1b[0m');
    console.log();

    if (data.error) {
      console.log('\x1b[1;31m❌ CONNECTION ERROR:\x1b[0m', data.error);
      console.log();
      console.log('Make sure the Personal Pipeline server is running on', this.baseUrl);
      return;
    }

    // Overall Status
    this.renderOverallStatus(data);
    console.log();

    // Component Status
    this.renderComponentStatus(data);
    console.log();

    // Performance Metrics
    this.renderPerformanceMetrics(data);
    console.log();

    // Historical Charts
    this.renderHistoricalCharts();
    console.log();

    // Alerts and Recommendations
    this.renderAlertsAndRecommendations(data);
    console.log();

    // Footer
    console.log('\x1b[2m' + `Refresh Rate: ${this.refreshInterval/1000}s | Press Ctrl+C to exit | Dashboard Uptime: ${Math.round((Date.now() - this.startTime) / 1000)}s` + '\x1b[0m');
  }

  /**
   * Render overall status section
   */
  renderOverallStatus(data) {
    console.log('\x1b[1;37m📊 OVERALL STATUS\x1b[0m');
    console.log('─'.repeat(50));

    const health = data.detailedHealth;
    let statusColor = '\x1b[1;31m'; // Red
    let statusIcon = '❌';
    let statusText = 'UNHEALTHY';

    if (health && !health.error) {
      switch (health.overall_status) {
        case 'healthy':
          statusColor = '\x1b[1;32m';
          statusIcon = '✅';
          statusText = 'HEALTHY';
          break;
        case 'degraded':
          statusColor = '\x1b[1;33m';
          statusIcon = '⚠️';
          statusText = 'DEGRADED';
          break;
      }
    }

    console.log(statusColor + statusIcon + ' System Status: ' + statusText + '\x1b[0m');

    if (health && health.summary) {
      console.log(`   Components: ${health.summary.healthy_components}/${health.summary.total_components} healthy (${health.summary.health_percentage}%)`);
      console.log(`   Uptime: ${Math.round(health.summary.uptime_seconds / 3600 * 100) / 100} hours`);
    }

    if (data.fetchTime) {
      console.log(`   API Response: ${data.fetchTime}ms`);
    }
  }

  /**
   * Render component status section
   */
  renderComponentStatus(data) {
    console.log('\x1b[1;37m🔧 COMPONENT STATUS\x1b[0m');
    console.log('─'.repeat(50));

    const health = data.detailedHealth;
    if (!health || health.error) {
      console.log('\x1b[1;31m❌ Component data unavailable\x1b[0m');
      return;
    }

    const components = health.components || {};
    const componentOrder = ['mcp_server', 'cache_service', 'source_adapters', 'mcp_tools', 'performance'];

    componentOrder.forEach(componentName => {
      const component = components[componentName];
      if (!component) return;

      let icon = '❌';
      let color = '\x1b[1;31m';

      switch (component.status) {
        case 'healthy':
          icon = '✅';
          color = '\x1b[1;32m';
          break;
        case 'degraded':
          icon = '⚠️';
          color = '\x1b[1;33m';
          break;
        case 'not_configured':
        case 'not_initialized':
          icon = '⚪';
          color = '\x1b[1;37m';
          break;
      }

      const displayName = componentName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      console.log(color + icon + ` ${displayName}: ${component.status.toUpperCase()}\x1b[0m`);

      // Show additional details
      if (component.healthy_sources !== undefined) {
        console.log(`     Sources: ${component.healthy_sources}/${component.total_sources} healthy`);
      }
      if (component.response_time_p95_ms !== undefined) {
        console.log(`     P95 Response: ${Math.round(component.response_time_p95_ms)}ms`);
      }
      if (component.error_rate !== undefined) {
        console.log(`     Error Rate: ${(component.error_rate * 100).toFixed(1)}%`);
      }
      if (component.tools_available !== undefined) {
        console.log(`     Tools Available: ${component.tools_available}`);
      }
    });
  }

  /**
   * Render performance metrics section
   */
  renderPerformanceMetrics(data) {
    console.log('\x1b[1;37m⚡ PERFORMANCE METRICS\x1b[0m');
    console.log('─'.repeat(50));

    const metrics = data.metrics;
    const performance = data.performance;

    if (!metrics || metrics.error) {
      console.log('\x1b[1;31m❌ Metrics unavailable\x1b[0m');
      return;
    }

    // Memory usage
    if (metrics.performance?.memory) {
      const memory = metrics.performance.memory;
      console.log(`💾 Memory Usage: ${memory.heap_used_mb}MB / ${memory.heap_total_mb}MB (${Math.round(memory.heap_used_mb / memory.heap_total_mb * 100)}%)`);
    }

    // Cache performance
    if (metrics.cache) {
      const cache = metrics.cache;
      const hitRateColor = cache.hit_rate > 0.8 ? '\x1b[1;32m' : cache.hit_rate > 0.5 ? '\x1b[1;33m' : '\x1b[1;31m';
      console.log(`🏎️  Cache Hit Rate: ${hitRateColor}${(cache.hit_rate * 100).toFixed(1)}%\x1b[0m (${cache.hits}/${cache.total_operations})`);
    }

    // Response times
    if (performance?.performance_report?.summary?.response_times) {
      const rt = performance.performance_report.summary.response_times;
      const p95Color = rt.p95_ms < 500 ? '\x1b[1;32m' : rt.p95_ms < 1000 ? '\x1b[1;33m' : '\x1b[1;31m';
      console.log(`⏱️  Response Times: Avg ${Math.round(rt.avg_ms)}ms | P95 ${p95Color}${Math.round(rt.p95_ms)}ms\x1b[0m`);
    }

    // Throughput
    if (performance?.performance_report?.summary?.throughput) {
      const throughput = performance.performance_report.summary.throughput;
      console.log(`📈 Throughput: ${throughput.requests_per_second.toFixed(1)} req/s (${throughput.total_requests} total)`);
    }

    // Error rate
    if (performance?.performance_report?.summary?.error_tracking) {
      const errors = performance.performance_report.summary.error_tracking;
      const errorColor = errors.error_rate < 0.01 ? '\x1b[1;32m' : errors.error_rate < 0.05 ? '\x1b[1;33m' : '\x1b[1;31m';
      console.log(`🚨 Error Rate: ${errorColor}${(errors.error_rate * 100).toFixed(2)}%\x1b[0m (${errors.total_errors} errors)`);
    }
  }

  /**
   * Render historical charts section
   */
  renderHistoricalCharts() {
    console.log('\x1b[1;37m📊 HISTORICAL TRENDS (Last 5 minutes)\x1b[0m');
    console.log('─'.repeat(50));

    const charts = [
      { name: 'Response Times (P95)', key: 'response_times', unit: 'ms', target: 500 },
      { name: 'Memory Usage', key: 'memory_usage', unit: 'MB', target: 1024 },
      { name: 'Cache Hit Rate', key: 'cache_hit_rates', unit: '%', target: 80 },
      { name: 'Error Rate', key: 'error_rates', unit: '%', target: 1 }
    ];

    charts.forEach(chart => {
      const data = this.history[chart.key];
      if (!data || data.length === 0) return;

      const latestValue = data[data.length - 1]?.value || 0;
      const sparkline = this.generateSparkline(data, 30, 3);
      
      // Determine color based on target
      let valueColor = '\x1b[1;32m'; // Green
      if (chart.key === 'response_times' && latestValue > chart.target) valueColor = '\x1b[1;31m';
      if (chart.key === 'memory_usage' && latestValue > chart.target) valueColor = '\x1b[1;31m';
      if (chart.key === 'cache_hit_rates' && latestValue < chart.target) valueColor = '\x1b[1;31m';
      if (chart.key === 'error_rates' && latestValue > chart.target) valueColor = '\x1b[1;31m';

      console.log(`${chart.name}: ${valueColor}${latestValue.toFixed(1)}${chart.unit}\x1b[0m`);
      sparkline.forEach(line => console.log('  ' + line));
    });
  }

  /**
   * Render alerts and recommendations section
   */
  renderAlertsAndRecommendations(data) {
    const alerts = [];
    const recommendations = [];

    // Check for alerts
    if (data.performance?.analysis?.bottlenecks) {
      alerts.push(...data.performance.analysis.bottlenecks.map(b => `${b.type}: ${b.description}`));
    }

    if (data.performance?.analysis?.alerts) {
      alerts.push(...data.performance.analysis.alerts);
    }

    // Performance-based alerts
    if (data.metrics?.performance?.memory?.heap_used_mb > 1024) {
      alerts.push('High memory usage detected (>1GB)');
    }

    if (data.metrics?.cache?.hit_rate < 0.5) {
      alerts.push('Low cache hit rate (<50%)');
    }

    // Generate recommendations
    if (data.performance?.analysis?.optimization_opportunities) {
      recommendations.push(...data.performance.analysis.optimization_opportunities.map(o => o.title));
    }

    if (alerts.length > 0 || recommendations.length > 0) {
      console.log('\x1b[1;37m🚨 ALERTS & RECOMMENDATIONS\x1b[0m');
      console.log('─'.repeat(50));

      if (alerts.length > 0) {
        console.log('\x1b[1;31mAlerts:\x1b[0m');
        alerts.slice(0, 5).forEach(alert => {
          console.log(`  🚨 ${alert}`);
        });
      }

      if (recommendations.length > 0) {
        console.log('\x1b[1;33mRecommendations:\x1b[0m');
        recommendations.slice(0, 3).forEach(rec => {
          console.log(`  💡 ${rec}`);
        });
      }
    }
  }

  /**
   * Start the dashboard
   */
  async start() {
    if (this.isRunning) {
      console.log('Dashboard is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting Personal Pipeline Health Dashboard...');
    console.log(`Connecting to: ${this.baseUrl}`);
    
    // Initial render
    await this.refresh();

    // Setup periodic refresh
    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, this.refreshInterval);

    console.log('Dashboard started. Press Ctrl+C to exit.');
  }

  /**
   * Stop the dashboard
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.restoreTerminal();
    console.log('\nHealth Dashboard stopped.');
    process.exit(0);
  }

  /**
   * Refresh dashboard data and display
   */
  async refresh() {
    try {
      const data = await this.fetchMetrics();
      this.lastMetrics = data;
      
      if (!data.error) {
        this.updateHistory(data);
      }
      
      this.renderDashboard(data);
    } catch (error) {
      this.renderDashboard({ error: error.message, timestamp: new Date() });
    }
  }
}

/**
 * CLI Interface
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    baseUrl: 'http://localhost:3000',
    refreshInterval: 5000,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
      case '-u':
        options.baseUrl = args[++i];
        break;
      case '--interval':
      case '-i':
        options.refreshInterval = parseInt(args[++i]) * 1000;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Personal Pipeline Health Dashboard

Usage: node health-dashboard.js [options]

Options:
  -u, --url <url>         Server URL (default: http://localhost:3000)
  -i, --interval <sec>    Refresh interval in seconds (default: 5)
  -h, --help             Show this help message

Example:
  node health-dashboard.js --url http://localhost:3000 --interval 10

Controls:
  Ctrl+C                 Exit dashboard

Dashboard Features:
  - Real-time system health monitoring
  - Component status (MCP server, cache, sources, tools)
  - Performance metrics (response times, memory, cache hit rates)
  - Historical trend charts (sparklines)
  - Alerts and optimization recommendations
  - Prometheus-compatible metrics integration
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Validate options
  if (options.refreshInterval < 1000) {
    console.error('Error: Refresh interval must be at least 1 second');
    process.exit(1);
  }

  const dashboard = new HealthDashboard(options);
  dashboard.start().catch(error => {
    console.error('Failed to start dashboard:', error.message);
    process.exit(1);
  });
}

module.exports = { HealthDashboard };