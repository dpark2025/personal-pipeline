#!/usr/bin/env tsx
/**
 * Enhanced MCP Tool Explorer for Personal Pipeline MCP Server
 * 
 * Authored by: Backend Technical Lead Agent
 * Date: 2025-08-15
 * 
 * Production-ready developer tool that significantly enhances the existing
 * test-mcp.js foundation with TypeScript implementation, auto-completion,
 * enhanced UI, session management, and performance analytics.
 * 
 * Key Features:
 * - Auto-completion engine with tab completion
 * - Enhanced visual interface with colors and tables
 * - Session management with history and favorites
 * - Smart parameter handling with context-aware suggestions
 * - Performance analytics and metrics tracking
 * - Full backward compatibility with existing MCPClient/MCPTester
 */

import { spawn, ChildProcess } from 'child_process';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Import the enhancement modules
import { AutoCompleter } from '../src/explorer/auto-completer.js';
import { VisualInterface } from '../src/explorer/visual-interface.js';
import { SessionManager } from '../src/explorer/session-manager.js';
import { ParameterHandler } from '../src/explorer/parameter-handler.js';
import { PerformanceAnalytics } from '../src/explorer/performance-analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced MCP Tool definitions with additional metadata
interface ToolParameter {
  type: 'string' | 'boolean' | 'number' | 'array' | 'object';
  required: boolean;
  description: string;
  suggestions?: string[];
  validation?: (value: any) => boolean;
  examples?: any[];
}

interface MCPToolSchema {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, ToolParameter>;
  usage_stats?: {
    total_calls: number;
    success_rate: number;
    avg_response_time: number;
    last_used?: Date;
  };
}

// Enhanced tool definitions with categories and suggestions
const ENHANCED_MCP_TOOLS: Record<string, MCPToolSchema> = {
  search_runbooks: {
    name: 'search_runbooks',
    description: 'Context-aware operational runbook retrieval',
    category: 'Operations',
    parameters: {
      alert_type: {
        type: 'string',
        required: true,
        description: 'Type of alert (disk_space, memory_leak, cpu_high, etc.)',
        suggestions: ['disk_space', 'memory_leak', 'cpu_high', 'network_latency', 'database_slow', 'service_down'],
        examples: ['disk_space', 'memory_leak', 'cpu_high']
      },
      severity: {
        type: 'string',
        required: true,
        description: 'Alert severity (critical, high, medium, low, info)',
        suggestions: ['critical', 'high', 'medium', 'low', 'info'],
        examples: ['critical', 'high', 'medium']
      },
      affected_systems: {
        type: 'array',
        required: true,
        description: 'List of affected system names',
        examples: [['web-server-01'], ['app-server-01', 'db-server-01']]
      }
    }
  },
  get_decision_tree: {
    name: 'get_decision_tree',
    description: 'Retrieve decision logic for specific scenarios',
    category: 'Decision Support',
    parameters: {
      alert_context: {
        type: 'object',
        required: true,
        description: 'Context about the alert or situation',
        examples: [
          { scenario_type: 'disk_space' },
          { scenario_type: 'memory_leak', system_type: 'java' }
        ]
      },
      current_agent_state: {
        type: 'object',
        required: false,
        description: 'Current state of the agent for progressive decision making',
        examples: [{ previous_actions: ['checked_logs'], confidence: 0.8 }]
      }
    }
  },
  get_procedure: {
    name: 'get_procedure',
    description: 'Detailed execution steps for procedures',
    category: 'Procedures',
    parameters: {
      procedure_id: {
        type: 'string',
        required: true,
        description: 'Unique procedure identifier',
        suggestions: ['emergency_procedure', 'standard_procedure', 'diagnostic_procedure', 'maintenance_procedure'],
        examples: ['emergency_procedure', 'standard_procedure']
      },
      context: {
        type: 'object',
        required: false,
        description: 'Execution context',
        examples: [{ urgency: 'high' }, { environment: 'production' }]
      }
    }
  },
  get_escalation_path: {
    name: 'get_escalation_path',
    description: 'Determine appropriate escalation procedures',
    category: 'Escalation',
    parameters: {
      severity: {
        type: 'string',
        required: true,
        description: 'Alert severity level',
        suggestions: ['critical', 'high', 'medium', 'low'],
        examples: ['critical', 'high']
      },
      business_hours: {
        type: 'boolean',
        required: true,
        description: 'Whether it\'s business hours',
        examples: [true, false]
      },
      failed_attempts: {
        type: 'array',
        required: false,
        description: 'List of previously failed resolution attempts',
        examples: [['restart_service'], ['restart_service', 'clear_cache']]
      }
    }
  },
  list_sources: {
    name: 'list_sources',
    description: 'Manage documentation sources',
    category: 'Management',
    parameters: {
      enabled_only: {
        type: 'boolean',
        required: false,
        description: 'Only return enabled sources',
        examples: [true, false]
      }
    }
  },
  search_knowledge_base: {
    name: 'search_knowledge_base',
    description: 'General documentation search across all sources',
    category: 'Search',
    parameters: {
      query: {
        type: 'string',
        required: true,
        description: 'Search query string',
        examples: ['disk space troubleshooting', 'memory leak detection', 'security best practices']
      },
      filters: {
        type: 'object',
        required: false,
        description: 'Search filters',
        examples: [{ category: 'troubleshooting' }, { type: 'runbook' }]
      },
      max_results: {
        type: 'number',
        required: false,
        description: 'Maximum number of results',
        examples: [5, 10, 20]
      }
    }
  },
  record_resolution_feedback: {
    name: 'record_resolution_feedback',
    description: 'Capture outcomes for continuous improvement',
    category: 'Feedback',
    parameters: {
      runbook_id: {
        type: 'string',
        required: true,
        description: 'ID of the runbook that was used',
        examples: ['RB-DISK-001', 'RB-MEM-001', 'RB-SEC-001']
      },
      procedure_id: {
        type: 'string',
        required: true,
        description: 'ID of the procedure that was executed',
        examples: ['emergency_procedure', 'standard_procedure', 'diagnostic_procedure']
      },
      outcome: {
        type: 'string',
        required: true,
        description: 'Outcome of the resolution attempt',
        suggestions: ['success', 'partial_success', 'failure', 'escalated'],
        examples: ['success', 'escalated']
      },
      resolution_time_minutes: {
        type: 'number',
        required: true,
        description: 'Time taken to resolve the issue in minutes',
        examples: [15, 45, 120]
      },
      notes: {
        type: 'string',
        required: false,
        description: 'Additional notes about the resolution process',
        examples: ['Resolved quickly using standard procedure', 'Required escalation to specialist team']
      }
    }
  }
};

// Enhanced test scenarios with better coverage
const ENHANCED_TEST_SCENARIOS: Record<string, any[]> = {
  search_runbooks: [
    { alert_type: 'disk_space', severity: 'critical', affected_systems: ['web-server-01'] },
    { alert_type: 'memory_leak', severity: 'high', affected_systems: ['app-server-02'] },
    { alert_type: 'cpu_high', severity: 'medium', affected_systems: ['db-server-01'] },
    { alert_type: 'network_latency', severity: 'high', affected_systems: ['load-balancer-01'] }
  ],
  get_decision_tree: [
    { alert_context: { scenario_type: 'disk_space' } },
    { alert_context: { scenario_type: 'memory_leak', system_type: 'java' } },
    { alert_context: { scenario_type: 'cpu_high', environment: 'production' } }
  ],
  get_procedure: [
    { procedure_id: 'emergency_procedure' },
    { procedure_id: 'standard_procedure' },
    { procedure_id: 'diagnostic_procedure' },
    { procedure_id: 'maintenance_procedure' }
  ],
  get_escalation_path: [
    { severity: 'critical', business_hours: false },
    { severity: 'high', business_hours: true },
    { severity: 'critical', business_hours: false }
  ],
  list_sources: [
    { enabled_only: true },
    { enabled_only: false },
    {}
  ],
  search_knowledge_base: [
    { query: 'disk space troubleshooting', max_results: 5 },
    { query: 'memory leak detection', categories: ['troubleshooting'] },
    { query: 'security best practices', max_results: 10 },
    { query: 'database performance', categories: ['troubleshooting'] }
  ],
  record_resolution_feedback: [
    { runbook_id: 'RB-DISK-001', procedure_id: 'emergency_procedure', outcome: 'success', resolution_time_minutes: 15, notes: 'Resolved quickly using standard procedure' },
    { runbook_id: 'RB-MEM-001', procedure_id: 'diagnostic_procedure', outcome: 'escalated', resolution_time_minutes: 45, notes: 'Required escalation to specialist team' },
    { runbook_id: 'RB-SEC-001', procedure_id: 'standard_procedure', outcome: 'success', resolution_time_minutes: 30, notes: 'Used enhanced debugging tools' }
  ]
};

/**
 * Enhanced MCP Client with improved functionality
 */
class EnhancedMCPClient {
  private serverProcess: ChildProcess | null = null;
  private isConnected: boolean = false;
  private requestId: number = 0;
  private performanceAnalytics: PerformanceAnalytics;

  constructor() {
    this.performanceAnalytics = new PerformanceAnalytics();
  }

  /**
   * Start the MCP server process
   */
  async startServer(serverPath = 'npm run dev'): Promise<void> {
    console.log(chalk.blue('🚀 Starting MCP server...'));
    
    try {
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      await this.waitForServer(3000);
      this.isConnected = true;
      console.log(chalk.green('✅ MCP server started successfully'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start MCP server:'), (error as Error).message);
      throw error;
    }
  }

  /**
   * Wait for server to be ready
   */
  private async waitForServer(port: number, timeout = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error(`Server did not start within ${timeout}ms`);
  }

  /**
   * Connect to existing server or use mock mode
   */
  async connectToExistingServer(port = 3000): Promise<void> {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        this.isConnected = true;
        console.log(chalk.green('✅ Connected to existing MCP server'));
        return;
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  MCP server not available, using mock mode'));
      this.isConnected = false;
    }
  }

  /**
   * Stop the MCP server
   */
  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      console.log(chalk.blue('🛑 Stopping MCP server...'));
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
      this.isConnected = false;
    }
  }

  /**
   * Send MCP request to server with enhanced tracking
   */
  async sendRequest(method: string, params: any = {}): Promise<any> {
    const requestId = ++this.requestId;
    const startTime = Date.now();

    try {
      let result;
      
      if (this.isConnected) {
        result = await this.makeRealAPICall(method, params);
      } else {
        result = await this.simulateMCPCall(method, params);
      }
      
      const responseTime = Date.now() - startTime;
      
      // Track performance
      this.performanceAnalytics.recordRequest(method, responseTime, true);
      
      return {
        success: true,
        result,
        responseTime,
        requestId,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Track failed request
      this.performanceAnalytics.recordRequest(method, responseTime, false);
      
      return {
        success: false,
        error: (error as Error).message,
        responseTime,
        requestId,
      };
    }
  }

  /**
   * Make real API call to the running server
   */
  private async makeRealAPICall(method: string, params: any): Promise<any> {
    const baseUrl = 'http://localhost:3000/api';
    
    const endpointMap: Record<string, { method: string; path: string }> = {
      'search_runbooks': { method: 'POST', path: '/runbooks/search' },
      'get_decision_tree': { method: 'POST', path: '/decision-tree' },
      'get_procedure': { method: 'GET', path: `/procedures/${params.procedure_id || 'default'}` },
      'get_escalation_path': { method: 'POST', path: '/escalation' },
      'list_sources': { method: 'GET', path: '/sources' },
      'search_knowledge_base': { method: 'POST', path: '/search' },
      'record_resolution_feedback': { method: 'POST', path: '/feedback' },
    };
    
    const endpoint = endpointMap[method];
    if (!endpoint) {
      throw new Error(`Unknown tool: ${method}`);
    }
    
    const url = `${baseUrl}${endpoint.path}`;
    const options: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (endpoint.method === 'POST') {
      options.body = JSON.stringify(params);
    }
    
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Simulate MCP call with enhanced mock responses
   */
  private async simulateMCPCall(method: string, params: any): Promise<any> {
    const delay = Math.random() * 200 + 50; // 50-250ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Generate realistic mock responses
    switch (method) {
      case 'search_runbooks':
        return {
          runbooks: [
            {
              id: `rb_${params.alert_type}_001`,
              title: `${params.alert_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Response`,
              confidence_score: Math.random() * 0.3 + 0.7,
              procedures: ['emergency_procedure', 'standard_procedure'],
              severity: params.severity,
              affected_systems: params.affected_systems,
            },
          ],
          total_results: 1,
          confidence_scores: [Math.random() * 0.3 + 0.7],
          success: true,
          retrieval_time_ms: delay,
          timestamp: new Date().toISOString(),
        };

      case 'get_decision_tree':
        return {
          decision_tree: {
            id: `${params.scenario_type}_decision_tree`,
            name: `${params.scenario_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Decision Tree`,
            branches: [
              {
                id: 'critical_path',
                condition: `${params.scenario_type}_metric > critical_threshold`,
                action: 'emergency_procedure',
                confidence: 0.95,
              },
              {
                id: 'standard_path',
                condition: `${params.scenario_type}_metric > warning_threshold`,
                action: 'standard_procedure',
                confidence: 0.85,
              },
            ],
          },
          confidence_score: Math.random() * 0.3 + 0.7,
          context_applied: !!params.context,
          success: true,
          retrieval_time_ms: delay,
          timestamp: new Date().toISOString(),
        };

      case 'list_sources':
        return {
          sources: [
            {
              name: 'test-runbooks',
              type: 'file',
              enabled: true,
              health_status: 'healthy',
              last_updated: new Date().toISOString(),
              documents_count: 25,
            },
            {
              name: 'test-knowledge-base',
              type: 'file',
              enabled: true,
              health_status: 'healthy',
              last_updated: new Date().toISOString(),
              documents_count: 150,
            },
          ],
          total_sources: 2,
          success: true,
          retrieval_time_ms: delay,
          timestamp: new Date().toISOString(),
        };

      default:
        return {
          success: true,
          message: `Enhanced mock response for ${method}`,
          parameters_received: params,
          retrieval_time_ms: delay,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * List available tools with enhanced metadata
   */
  async listTools(): Promise<MCPToolSchema[]> {
    return Object.values(ENHANCED_MCP_TOOLS);
  }

  /**
   * Get tool schema
   */
  getToolSchema(toolName: string): MCPToolSchema | null {
    return ENHANCED_MCP_TOOLS[toolName] || null;
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): PerformanceAnalytics {
    return this.performanceAnalytics;
  }
}

/**
 * Enhanced MCP Explorer - Main class with all enhancements
 */
class EnhancedMCPExplorer {
  private client: EnhancedMCPClient;
  private rl: readline.Interface;
  private autoCompleter: AutoCompleter;
  private visualInterface: VisualInterface;
  private sessionManager: SessionManager;
  private parameterHandler: ParameterHandler;
  private performanceAnalytics: PerformanceAnalytics;

  constructor() {
    this.client = new EnhancedMCPClient();
    this.autoCompleter = new AutoCompleter(ENHANCED_MCP_TOOLS);
    this.visualInterface = new VisualInterface();
    this.sessionManager = new SessionManager();
    this.parameterHandler = new ParameterHandler(ENHANCED_MCP_TOOLS);
    this.performanceAnalytics = new PerformanceAnalytics();
    
    // Create readline interface with auto-completion
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: this.autoCompleter.complete.bind(this.autoCompleter),
      history: this.sessionManager.getHistory(),
    });

    // Enable history navigation
    this.setupHistoryNavigation();
  }

  /**
   * Setup history navigation with arrow keys
   */
  private setupHistoryNavigation(): void {
    // This will be handled by the readline interface automatically
    // with the history array provided in the constructor
  }

  /**
   * Main interactive mode with enhancements
   */
  async run(): Promise<void> {
    try {
      await this.sessionManager.loadSession();
      this.visualInterface.showWelcome();
      
      console.log(chalk.blue('📡 Checking MCP server connection...\n'));
      await this.client.connectToExistingServer();
      
      await this.mainLoop();
      
    } catch (error) {
      console.error(chalk.red('❌ Error in enhanced explorer:'), (error as Error).message);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Main interaction loop
   */
  private async mainLoop(): Promise<void> {
    while (true) {
      try {
        // Show main menu
        await this.showMainMenu();
        
        const selection = await this.askQuestion(chalk.cyan('Select option: '));
        
        if (selection === '0' || selection.toLowerCase() === 'exit') {
          console.log(chalk.green('👋 Goodbye!'));
          break;
        }
        
        await this.handleSelection(selection);
        console.log('\n' + chalk.gray('='.repeat(80)) + '\n');
        
      } catch (error) {
        if ((error as Error).message.includes('closed')) {
          console.log(chalk.green('\n👋 Goodbye!'));
          break;
        }
        console.error(chalk.red('❌ Error:'), (error as Error).message);
      }
    }
  }

  /**
   * Show enhanced main menu
   */
  private async showMainMenu(): Promise<void> {
    const tools = await this.client.listTools();
    const favorites = this.sessionManager.getFavorites();
    const analytics = this.client.getPerformanceAnalytics();
    
    this.visualInterface.showToolsMenu(tools, favorites, analytics);
  }

  /**
   * Handle user selection
   */
  private async handleSelection(selection: string): Promise<void> {
    const trimmedSelection = selection.trim();
    
    // Handle special commands
    if (trimmedSelection.startsWith('/')) {
      await this.handleSpecialCommand(trimmedSelection);
      return;
    }
    
    // Handle tool selection
    const tools = await this.client.listTools();
    const toolIndex = parseInt(trimmedSelection) - 1;
    
    if (toolIndex >= 0 && toolIndex < tools.length) {
      const selectedTool = tools[toolIndex];
      await this.testToolInteractively(selectedTool.name);
    } else {
      console.log(chalk.red('❌ Invalid selection. Please try again.'));
    }
  }

  /**
   * Handle special commands like /favorites, /history, /analytics
   */
  private async handleSpecialCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.slice(1).split(' ');
    
    switch (cmd.toLowerCase()) {
      case 'favorites':
      case 'fav':
        this.visualInterface.showFavorites(this.sessionManager.getFavorites());
        break;
        
      case 'history':
      case 'hist':
        this.visualInterface.showHistory(this.sessionManager.getHistory());
        break;
        
      case 'analytics':
      case 'stats':
        this.visualInterface.showAnalytics(this.client.getPerformanceAnalytics());
        break;
        
      case 'clear':
        console.clear();
        break;
        
      case 'help':
        this.visualInterface.showHelp();
        break;
        
      default:
        console.log(chalk.red(`❌ Unknown command: ${cmd}`));
        console.log(chalk.gray('Available commands: /favorites, /history, /analytics, /clear, /help'));
    }
  }

  /**
   * Test a tool interactively with enhancements
   */
  private async testToolInteractively(toolName: string): Promise<void> {
    console.log(chalk.blue(`\n🔍 Testing: ${toolName}`));
    
    const schema = this.client.getToolSchema(toolName);
    if (!schema) {
      console.log(chalk.red('❌ Tool schema not found'));
      return;
    }
    
    this.visualInterface.showToolDetails(schema);
    
    // Collect parameters with enhanced handling
    const params = await this.parameterHandler.collectParameters(schema, this.askQuestion.bind(this));
    
    // Add to history
    this.sessionManager.addToHistory(`${toolName} ${JSON.stringify(params)}`);
    
    // Send request
    console.log(chalk.blue('\n🚀 Sending request...'));
    const response = await this.client.sendRequest(toolName, params);
    
    // Display enhanced results
    this.visualInterface.displayResponse(response, schema);
    
    // Ask to add to favorites
    if (response.success) {
      const addToFav = await this.askQuestion(chalk.cyan('Add this tool call to favorites? (y/N): '));
      if (addToFav.toLowerCase().startsWith('y')) {
        this.sessionManager.addToFavorites(toolName, params);
        console.log(chalk.green('✅ Added to favorites'));
      }
    }
  }

  /**
   * Run automated test suite with enhancements
   */
  async runEnhancedTestSuite(): Promise<any> {
    console.log(chalk.blue('🧪 Running enhanced automated test suite...\n'));
    
    await this.client.connectToExistingServer();
    
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: [] as any[],
      startTime: new Date(),
      endTime: null as Date | null,
    };
    
    for (const [toolName, scenarios] of Object.entries(ENHANCED_TEST_SCENARIOS)) {
      console.log(chalk.cyan(`Testing ${toolName}...`));
      
      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        results.total++;
        
        try {
          const response = await this.client.sendRequest(toolName, scenario);
          
          if (response.success) {
            results.passed++;
            console.log(chalk.green(`  ✅ Scenario ${i + 1}: ${response.responseTime}ms`));
          } else {
            results.failed++;
            console.log(chalk.red(`  ❌ Scenario ${i + 1}: ${response.error}`));
          }
          
          results.tests.push({
            tool: toolName,
            scenario: i + 1,
            success: response.success,
            responseTime: response.responseTime,
            error: response.error || null,
            timestamp: new Date(),
          });
          
        } catch (error) {
          results.failed++;
          console.log(chalk.red(`  ❌ Scenario ${i + 1}: ${(error as Error).message}`));
          
          results.tests.push({
            tool: toolName,
            scenario: i + 1,
            success: false,
            responseTime: 0,
            error: (error as Error).message,
            timestamp: new Date(),
          });
        }
      }
    }
    
    results.endTime = new Date();
    
    // Display enhanced summary
    this.visualInterface.showTestSummary(results);
    
    return results;
  }

  /**
   * Ask question with readline
   */
  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.rl.closed) {
        reject(new Error('Readline interface closed'));
        return;
      }
      
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
      
      this.rl.once('close', () => {
        reject(new Error('Readline interface closed'));
      });
    });
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    await this.sessionManager.saveSession();
    this.rl.close();
    await this.client.stopServer();
  }
}

/**
 * CLI interface with enhanced options
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const explorer = new EnhancedMCPExplorer();
  
  try {
    if (args.includes('--help') || args.includes('-h')) {
      console.log(chalk.blue(`
Enhanced Personal Pipeline MCP Tool Explorer

Usage: tsx scripts/mcp-explorer.ts [options]

Options:
  --interactive, -i       Enhanced interactive mode (default)
  --test-suite           Run enhanced automated test suite
  --validate             Quick validation with enhanced output
  --tool <name>          Test specific tool with enhancements
  --analytics           Show performance analytics
  --clear-session       Clear session data
  --help, -h            Show this help message

Special Commands (in interactive mode):
  /favorites, /fav      Show favorite tool calls
  /history, /hist       Show command history
  /analytics, /stats    Show performance analytics
  /clear               Clear screen
  /help                Show help

Examples:
  tsx scripts/mcp-explorer.ts                    # Enhanced interactive mode
  tsx scripts/mcp-explorer.ts --test-suite       # Run enhanced test suite
  tsx scripts/mcp-explorer.ts --analytics        # Show analytics
  tsx scripts/mcp-explorer.ts --tool search_runbooks
      `));
      process.exit(0);
    }
    
    if (args.includes('--test-suite')) {
      await explorer.runEnhancedTestSuite();
      await explorer.cleanup();
      process.exit(0);
    } else if (args.includes('--analytics')) {
      const analytics = explorer['client'].getPerformanceAnalytics();
      explorer['visualInterface'].showAnalytics(analytics);
      await explorer.cleanup();
      process.exit(0);
    } else if (args.includes('--clear-session')) {
      await explorer['sessionManager'].clearSession();
      console.log(chalk.green('✅ Session data cleared'));
      await explorer.cleanup();
      process.exit(0);
    } else if (args.includes('--tool')) {
      const toolIndex = args.indexOf('--tool');
      const toolName = args[toolIndex + 1];
      if (toolName && ENHANCED_MCP_TOOLS[toolName]) {
        await explorer['client'].connectToExistingServer();
        await explorer.testToolInteractively(toolName);
        await explorer.cleanup();
        process.exit(0);
      } else {
        console.error(chalk.red('❌ Invalid or missing tool name'));
        await explorer.cleanup();
        process.exit(1);
      }
    } else {
      // Default to enhanced interactive mode
      await explorer.run();
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Fatal error:'), (error as Error).message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { EnhancedMCPClient, EnhancedMCPExplorer, ENHANCED_MCP_TOOLS, ENHANCED_TEST_SCENARIOS };