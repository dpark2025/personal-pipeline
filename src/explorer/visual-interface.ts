/**
 * Visual Interface Module for Enhanced MCP Tool Explorer
 * 
 * Authored by: Backend Technical Lead Agent
 * Date: 2025-08-15
 * 
 * Provides enhanced terminal UI with colors, tables, formatting, and visual
 * feedback for an exceptional developer experience.
 */

import chalk from 'chalk';

interface MCPToolSchema {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, any>;
  usage_stats?: {
    total_calls: number;
    success_rate: number;
    avg_response_time: number;
    last_used?: Date;
  };
}

interface Favorite {
  toolName: string;
  parameters: any;
  timestamp: Date;
  nickname?: string;
}

interface PerformanceAnalytics {
  getTotalRequests(): number;
  getAverageResponseTime(): number;
  getSuccessRate(): number;
  getToolStats(): Record<string, any>;
  getRecentActivity(): any[];
}

/**
 * Enhanced visual interface with colors, tables, and formatting
 */
export class VisualInterface {
  
  /**
   * Show welcome screen with branding
   */
  showWelcome(): void {
    console.clear();
    
    const banner = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ${chalk.cyan.bold('🚀 Enhanced MCP Tool Explorer')}                                       ║
║  ${chalk.gray('Personal Pipeline - Intelligent Documentation Retrieval')}              ║
║                                                                              ║
║  ${chalk.green('Features:')} Auto-completion • Visual Interface • Session Management    ║
║  ${chalk.blue('Version:')} 2.0.0 Enhanced                                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
    `;
    
    console.log(banner);
    console.log(chalk.gray('Type /help for available commands\n'));
  }

  /**
   * Show tools menu with enhanced formatting
   */
  showToolsMenu(tools: MCPToolSchema[], favorites: Favorite[], analytics: PerformanceAnalytics): void {
    console.log(chalk.bold.cyan('📋 Available MCP Tools:\n'));
    
    // Group tools by category
    const categories = this.groupToolsByCategory(tools);
    
    let index = 1;
    Object.entries(categories).forEach(([category, categoryTools]) => {
      console.log(chalk.bold.yellow(`${category}:`));
      
      categoryTools.forEach(tool => {
        const stats = this.formatToolStats(tool);
        const isFavorite = favorites.some(fav => fav.toolName === tool.name);
        const favoriteIcon = isFavorite ? chalk.yellow('⭐') : '  ';
        
        console.log(`${favoriteIcon} ${chalk.cyan(index.toString().padStart(2))}. ${chalk.bold(tool.name)}`);
        console.log(`     ${chalk.gray(tool.description)}`);
        if (stats) {
          console.log(`     ${stats}`);
        }
        console.log();
        index++;
      });
    });
    
    // Show additional options
    console.log(chalk.bold.magenta('Special Options:'));
    console.log(`   ${chalk.cyan('0')}. ${chalk.bold('Exit')}`);
    console.log(`   ${chalk.cyan('/fav')}. Show Favorites`);
    console.log(`   ${chalk.cyan('/hist')}. Show History`);
    console.log(`   ${chalk.cyan('/stats')}. Show Analytics`);
    console.log(`   ${chalk.cyan('/help')}. Show Help\n`);
    
    // Show quick stats
    this.showQuickStats(analytics, favorites.length);
  }

  /**
   * Show tool details with enhanced formatting
   */
  showToolDetails(schema: MCPToolSchema): void {
    console.log(chalk.bold.blue(`\n📋 ${schema.name}`));
    console.log(chalk.gray(`Category: ${schema.category}`));
    console.log(chalk.gray(`Description: ${schema.description}\n`));
    
    if (Object.keys(schema.parameters).length === 0) {
      console.log(chalk.gray('No parameters required.\n'));
      return;
    }
    
    console.log(chalk.bold('Parameters:'));
    
    // Create parameter table
    const paramTable = this.createParameterTable(schema.parameters);
    console.log(paramTable);
  }

  /**
   * Create formatted parameter table
   */
  private createParameterTable(parameters: Record<string, any>): string {
    const headers = ['Parameter', 'Type', 'Required', 'Description'];
    const rows: string[][] = [];
    
    Object.entries(parameters).forEach(([name, param]) => {
      const required = param.required ? chalk.red('Yes') : chalk.gray('No');
      const type = chalk.cyan(param.type);
      const description = this.truncateText(param.description, 40);
      
      rows.push([chalk.bold(name), type, required, description]);
    });
    
    return this.formatTable(headers, rows);
  }

  /**
   * Format data as a table
   */
  private formatTable(headers: string[], rows: string[][]): string {
    // Calculate column widths (accounting for ANSI color codes)
    const stripAnsi = (str: string) => str.replace(/\u001b\[[0-9;]*m/g, '');
    const getDisplayWidth = (str: string) => stripAnsi(str).length;
    
    const colWidths = headers.map((header, index) => {
      const headerWidth = getDisplayWidth(header);
      const columnWidth = Math.max(
        headerWidth,
        ...rows.map(row => getDisplayWidth(row[index] || ''))
      );
      return Math.min(columnWidth, 50); // Max width of 50
    });
    
    // Create separator
    const separator = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
    const middleSep = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
    const bottomSep = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
    
    let table = separator + '\n';
    
    // Add headers
    const headerRow = '│' + headers.map((header, i) => 
      ` ${chalk.bold(header.padEnd(colWidths[i]!))} `
    ).join('│') + '│';
    table += headerRow + '\n' + middleSep + '\n';
    
    // Add rows
    rows.forEach(row => {
      const tableRow = '│' + row.map((cell, i) => {
        const paddedCell = cell + ' '.repeat(Math.max(0, colWidths[i]! - getDisplayWidth(cell)));
        return ` ${paddedCell} `;
      }).join('│') + '│';
      table += tableRow + '\n';
    });
    
    table += bottomSep;
    return table;
  }

  /**
   * Display response with enhanced formatting
   */
  displayResponse(response: any, _schema: MCPToolSchema): void {
    const responseTime = response.responseTime;
    const timeColor = responseTime < 100 ? 'green' : responseTime < 500 ? 'yellow' : 'red';
    
    console.log(chalk.bold('\n📊 Response Details:'));
    console.log(`⏱️  Response time: ${chalk[timeColor](responseTime + 'ms')}`);
    console.log(`🆔 Request ID: ${chalk.gray(response.requestId)}`);
    
    if (response.success) {
      console.log(`✅ Status: ${chalk.green('Success')}\n`);
      
      // Format response data
      console.log(chalk.bold('📄 Response Data:'));
      this.displayFormattedJSON(response.result);
      
      // Show confidence scores if available
      if (response.result.confidence_score) {
        const confidence = response.result.confidence_score;
        const confidenceColor = confidence > 0.8 ? 'green' : confidence > 0.6 ? 'yellow' : 'red';
        console.log(`\n🎯 Confidence: ${chalk[confidenceColor]((confidence * 100).toFixed(1) + '%')}`);
      }
      
    } else {
      console.log(`❌ Status: ${chalk.red('Failed')}`);
      console.log(`💥 Error: ${chalk.red(response.error)}`);
    }
  }

  /**
   * Display JSON with syntax highlighting
   */
  private displayFormattedJSON(data: any, indent: number = 0): void {
    const indentStr = '  '.repeat(indent);
    
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        console.log(indentStr + '[');
        data.forEach((item, index) => {
          this.displayFormattedJSON(item, indent + 1);
          if (index < data.length - 1) console.log(',');
        });
        console.log(indentStr + ']');
      } else {
        console.log(indentStr + '{');
        const entries = Object.entries(data);
        entries.forEach(([key, value], index) => {
          process.stdout.write(`${indentStr}  ${chalk.blue(`"${key}"`)}: `);
          if (typeof value === 'object' && value !== null) {
            console.log('');
            this.displayFormattedJSON(value, indent + 1);
          } else {
            this.displayFormattedJSON(value, 0);
          }
          if (index < entries.length - 1) console.log(',');
        });
        console.log(indentStr + '}');
      }
    } else {
      const valueColor = typeof data === 'string' ? 'green' : 
                        typeof data === 'number' ? 'cyan' :
                        typeof data === 'boolean' ? 'yellow' : 'gray';
      const formattedValue = typeof data === 'string' ? `"${data}"` : String(data);
      console.log(chalk[valueColor](formattedValue));
    }
  }

  /**
   * Show favorites with formatting
   */
  showFavorites(favorites: Favorite[]): void {
    console.log(chalk.bold.yellow('\n⭐ Favorite Tool Calls:\n'));
    
    if (favorites.length === 0) {
      console.log(chalk.gray('No favorites saved yet. Add some by using tools and selecting "y" when prompted.\n'));
      return;
    }
    
    favorites.forEach((favorite, index) => {
      const timeAgo = this.formatTimeAgo(favorite.timestamp);
      console.log(`${chalk.cyan((index + 1).toString().padStart(2))}. ${chalk.bold(favorite.toolName)}`);
      if (favorite.nickname) {
        console.log(`    ${chalk.magenta('Nickname:')} ${favorite.nickname}`);
      }
      console.log(`    ${chalk.gray('Added:')} ${timeAgo}`);
      console.log(`    ${chalk.gray('Parameters:')} ${JSON.stringify(favorite.parameters)}`);
      console.log();
    });
  }

  /**
   * Show command history
   */
  showHistory(history: string[]): void {
    console.log(chalk.bold.blue('\n📜 Command History:\n'));
    
    if (history.length === 0) {
      console.log(chalk.gray('No command history available.\n'));
      return;
    }
    
    // Show last 20 commands
    const recentHistory = history.slice(-20);
    recentHistory.forEach((command, index) => {
      const globalIndex = history.length - recentHistory.length + index + 1;
      console.log(`${chalk.gray(globalIndex.toString().padStart(3))}. ${command}`);
    });
    
    if (history.length > 20) {
      console.log(chalk.gray(`\n... and ${history.length - 20} more commands`));
    }
    console.log();
  }

  /**
   * Show performance analytics
   */
  showAnalytics(analytics: PerformanceAnalytics): void {
    console.log(chalk.bold.green('\n📊 Performance Analytics:\n'));
    
    // Overall stats
    const totalRequests = analytics.getTotalRequests();
    const avgResponseTime = analytics.getAverageResponseTime();
    const successRate = analytics.getSuccessRate();
    
    console.log(chalk.bold('Overall Statistics:'));
    console.log(`📈 Total Requests: ${chalk.cyan(totalRequests)}`);
    console.log(`⚡ Avg Response Time: ${chalk.cyan(avgResponseTime.toFixed(1) + 'ms')}`);
    console.log(`✅ Success Rate: ${chalk.green((successRate * 100).toFixed(1) + '%')}\n`);
    
    // Tool-specific stats
    const toolStats = analytics.getToolStats();
    if (Object.keys(toolStats).length > 0) {
      console.log(chalk.bold('Tool Statistics:'));
      
      const statsTable = Object.entries(toolStats).map(([tool, stats]: [string, any]) => [
        chalk.bold(tool),
        chalk.cyan(stats.calls.toString()),
        chalk.cyan(stats.avgTime.toFixed(1) + 'ms'),
        stats.successRate >= 0.9 ? chalk.green((stats.successRate * 100).toFixed(1) + '%') :
        stats.successRate >= 0.7 ? chalk.yellow((stats.successRate * 100).toFixed(1) + '%') :
        chalk.red((stats.successRate * 100).toFixed(1) + '%')
      ]);
      
      console.log(this.formatTable(['Tool', 'Calls', 'Avg Time', 'Success Rate'], statsTable));
    }
    
    // Recent activity
    const recentActivity = analytics.getRecentActivity();
    if (recentActivity.length > 0) {
      console.log(chalk.bold('\nRecent Activity:'));
      recentActivity.slice(-5).forEach(activity => {
        const timeAgo = this.formatTimeAgo(activity.timestamp);
        const statusIcon = activity.success ? chalk.green('✅') : chalk.red('❌');
        console.log(`${statusIcon} ${chalk.bold(activity.tool)} - ${activity.responseTime}ms (${timeAgo})`);
      });
    }
    
    console.log();
  }

  /**
   * Show test suite summary
   */
  showTestSummary(results: any): void {
    const duration = results.endTime.getTime() - results.startTime.getTime();
    const successRate = (results.passed / results.total) * 100;
    
    console.log(chalk.bold.blue('\n📋 Test Suite Summary:'));
    console.log(chalk.bold('═'.repeat(50)));
    
    // Overall results
    console.log(`🕒 Duration: ${chalk.cyan(duration + 'ms')}`);
    console.log(`📊 Total Tests: ${chalk.cyan(results.total)}`);
    console.log(`✅ Passed: ${chalk.green(results.passed)}`);
    console.log(`❌ Failed: ${chalk.red(results.failed)}`);
    
    const successColor = successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red';
    console.log(`📈 Success Rate: ${chalk[successColor](successRate.toFixed(1) + '%')}`);
    
    // Performance summary
    const avgResponseTime = results.tests
      .filter((test: any) => test.success)
      .reduce((sum: number, test: any) => sum + test.responseTime, 0) / results.passed;
    
    console.log(`⚡ Avg Response Time: ${chalk.cyan(avgResponseTime.toFixed(1) + 'ms')}`);
    
    // Failed tests details
    const failedTests = results.tests.filter((test: any) => !test.success);
    if (failedTests.length > 0) {
      console.log(chalk.bold.red('\n❌ Failed Tests:'));
      failedTests.forEach((test: any) => {
        console.log(`  • ${test.tool} (Scenario ${test.scenario}): ${test.error}`);
      });
    }
    
    console.log();
  }

  /**
   * Show help information
   */
  showHelp(): void {
    console.log(chalk.bold.cyan('\n📖 Enhanced MCP Tool Explorer - Help\n'));
    
    console.log(chalk.bold('🎯 Basic Usage:'));
    console.log('  • Select a tool by number (1-7)');
    console.log('  • Use Tab for auto-completion');
    console.log('  • Type 0 or "exit" to quit\n');
    
    console.log(chalk.bold('⭐ Special Commands:'));
    console.log('  • /favorites, /fav   - Show favorite tool calls');
    console.log('  • /history, /hist    - Show command history');
    console.log('  • /analytics, /stats - Show performance analytics');
    console.log('  • /clear            - Clear screen');
    console.log('  • /help             - Show this help\n');
    
    console.log(chalk.bold('🚀 Pro Tips:'));
    console.log('  • Use arrow keys to navigate command history');
    console.log('  • Mark successful calls as favorites for quick access');
    console.log('  • Check /analytics for performance insights');
    console.log('  • Tab completion works for parameters and values\n');
    
    console.log(chalk.bold('🔧 Command Line Options:'));
    console.log('  • --test-suite      - Run automated tests');
    console.log('  • --analytics       - Show analytics and exit');
    console.log('  • --tool <name>     - Test specific tool');
    console.log('  • --clear-session   - Clear all session data\n');
  }

  /**
   * Helper methods
   */
  private groupToolsByCategory(tools: MCPToolSchema[]): Record<string, MCPToolSchema[]> {
    const categories: Record<string, MCPToolSchema[]> = {};
    
    tools.forEach(tool => {
      if (!categories[tool.category]) {
        categories[tool.category] = [];
      }
      categories[tool.category]!.push(tool);
    });
    
    return categories;
  }

  private formatToolStats(tool: MCPToolSchema): string {
    if (!tool.usage_stats) {
      return '';
    }
    
    const stats = tool.usage_stats;
    const calls = chalk.gray(`${stats.total_calls} calls`);
    const successRate = stats.success_rate >= 0.9 ? 
      chalk.green(`${(stats.success_rate * 100).toFixed(0)}%`) :
      chalk.yellow(`${(stats.success_rate * 100).toFixed(0)}%`);
    const avgTime = chalk.gray(`${stats.avg_response_time.toFixed(0)}ms`);
    
    return `${calls} • ${successRate} success • ${avgTime} avg`;
  }

  private showQuickStats(analytics: PerformanceAnalytics, favoritesCount: number): void {
    const totalRequests = analytics.getTotalRequests();
    const avgTime = analytics.getAverageResponseTime();
    const successRate = analytics.getSuccessRate();
    
    console.log(chalk.gray('Quick Stats: ') + 
      `${totalRequests} requests • ` +
      `${avgTime.toFixed(0)}ms avg • ` +
      `${(successRate * 100).toFixed(0)}% success • ` +
      `${favoritesCount} favorites`);
    console.log();
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}