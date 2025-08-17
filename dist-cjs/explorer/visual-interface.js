"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualInterface = void 0;
const chalk_1 = __importDefault(require("chalk"));
class VisualInterface {
    showWelcome() {
        console.clear();
        const banner = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ${chalk_1.default.cyan.bold('🚀 Enhanced MCP Tool Explorer')}                                       ║
║  ${chalk_1.default.gray('Personal Pipeline - Intelligent Documentation Retrieval')}              ║
║                                                                              ║
║  ${chalk_1.default.green('Features:')} Auto-completion • Visual Interface • Session Management    ║
║  ${chalk_1.default.blue('Version:')} 2.0.0 Enhanced                                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
    `;
        console.log(banner);
        console.log(chalk_1.default.gray('Type /help for available commands\n'));
    }
    showToolsMenu(tools, favorites, analytics) {
        console.log(chalk_1.default.bold.cyan('📋 Available MCP Tools:\n'));
        const categories = this.groupToolsByCategory(tools);
        let index = 1;
        Object.entries(categories).forEach(([category, categoryTools]) => {
            console.log(chalk_1.default.bold.yellow(`${category}:`));
            categoryTools.forEach(tool => {
                const stats = this.formatToolStats(tool);
                const isFavorite = favorites.some(fav => fav.toolName === tool.name);
                const favoriteIcon = isFavorite ? chalk_1.default.yellow('⭐') : '  ';
                console.log(`${favoriteIcon} ${chalk_1.default.cyan(index.toString().padStart(2))}. ${chalk_1.default.bold(tool.name)}`);
                console.log(`     ${chalk_1.default.gray(tool.description)}`);
                if (stats) {
                    console.log(`     ${stats}`);
                }
                console.log();
                index++;
            });
        });
        console.log(chalk_1.default.bold.magenta('Special Options:'));
        console.log(`   ${chalk_1.default.cyan('0')}. ${chalk_1.default.bold('Exit')}`);
        console.log(`   ${chalk_1.default.cyan('/fav')}. Show Favorites`);
        console.log(`   ${chalk_1.default.cyan('/hist')}. Show History`);
        console.log(`   ${chalk_1.default.cyan('/stats')}. Show Analytics`);
        console.log(`   ${chalk_1.default.cyan('/help')}. Show Help\n`);
        this.showQuickStats(analytics, favorites.length);
    }
    showToolDetails(schema) {
        console.log(chalk_1.default.bold.blue(`\n📋 ${schema.name}`));
        console.log(chalk_1.default.gray(`Category: ${schema.category}`));
        console.log(chalk_1.default.gray(`Description: ${schema.description}\n`));
        if (Object.keys(schema.parameters).length === 0) {
            console.log(chalk_1.default.gray('No parameters required.\n'));
            return;
        }
        console.log(chalk_1.default.bold('Parameters:'));
        const paramTable = this.createParameterTable(schema.parameters);
        console.log(paramTable);
    }
    createParameterTable(parameters) {
        const headers = ['Parameter', 'Type', 'Required', 'Description'];
        const rows = [];
        Object.entries(parameters).forEach(([name, param]) => {
            const required = param.required ? chalk_1.default.red('Yes') : chalk_1.default.gray('No');
            const type = chalk_1.default.cyan(param.type);
            const description = this.truncateText(param.description, 40);
            rows.push([chalk_1.default.bold(name), type, required, description]);
        });
        return this.formatTable(headers, rows);
    }
    formatTable(headers, rows) {
        const stripAnsi = (str) => str.replace(/\u001b\[[0-9;]*m/g, '');
        const getDisplayWidth = (str) => stripAnsi(str).length;
        const colWidths = headers.map((header, index) => {
            const headerWidth = getDisplayWidth(header);
            const columnWidth = Math.max(headerWidth, ...rows.map(row => getDisplayWidth(row[index] || '')));
            return Math.min(columnWidth, 50);
        });
        const separator = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
        const middleSep = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
        const bottomSep = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
        let table = separator + '\n';
        const headerRow = '│' + headers.map((header, i) => ` ${chalk_1.default.bold(header.padEnd(colWidths[i]))} `).join('│') + '│';
        table += headerRow + '\n' + middleSep + '\n';
        rows.forEach(row => {
            const tableRow = '│' + row.map((cell, i) => {
                const paddedCell = cell + ' '.repeat(Math.max(0, colWidths[i] - getDisplayWidth(cell)));
                return ` ${paddedCell} `;
            }).join('│') + '│';
            table += tableRow + '\n';
        });
        table += bottomSep;
        return table;
    }
    displayResponse(response, _schema) {
        const responseTime = response.responseTime;
        const timeColor = responseTime < 100 ? 'green' : responseTime < 500 ? 'yellow' : 'red';
        console.log(chalk_1.default.bold('\n📊 Response Details:'));
        console.log(`⏱️  Response time: ${chalk_1.default[timeColor](responseTime + 'ms')}`);
        console.log(`🆔 Request ID: ${chalk_1.default.gray(response.requestId)}`);
        if (response.success) {
            console.log(`✅ Status: ${chalk_1.default.green('Success')}\n`);
            console.log(chalk_1.default.bold('📄 Response Data:'));
            this.displayFormattedJSON(response.result);
            if (response.result.confidence_score) {
                const confidence = response.result.confidence_score;
                const confidenceColor = confidence > 0.8 ? 'green' : confidence > 0.6 ? 'yellow' : 'red';
                console.log(`\n🎯 Confidence: ${chalk_1.default[confidenceColor]((confidence * 100).toFixed(1) + '%')}`);
            }
        }
        else {
            console.log(`❌ Status: ${chalk_1.default.red('Failed')}`);
            console.log(`💥 Error: ${chalk_1.default.red(response.error)}`);
        }
    }
    displayFormattedJSON(data, indent = 0) {
        const indentStr = '  '.repeat(indent);
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                console.log(indentStr + '[');
                data.forEach((item, index) => {
                    this.displayFormattedJSON(item, indent + 1);
                    if (index < data.length - 1)
                        console.log(',');
                });
                console.log(indentStr + ']');
            }
            else {
                console.log(indentStr + '{');
                const entries = Object.entries(data);
                entries.forEach(([key, value], index) => {
                    process.stdout.write(`${indentStr}  ${chalk_1.default.blue(`"${key}"`)}: `);
                    if (typeof value === 'object' && value !== null) {
                        console.log('');
                        this.displayFormattedJSON(value, indent + 1);
                    }
                    else {
                        this.displayFormattedJSON(value, 0);
                    }
                    if (index < entries.length - 1)
                        console.log(',');
                });
                console.log(indentStr + '}');
            }
        }
        else {
            const valueColor = typeof data === 'string' ? 'green' :
                typeof data === 'number' ? 'cyan' :
                    typeof data === 'boolean' ? 'yellow' : 'gray';
            const formattedValue = typeof data === 'string' ? `"${data}"` : String(data);
            console.log(chalk_1.default[valueColor](formattedValue));
        }
    }
    showFavorites(favorites) {
        console.log(chalk_1.default.bold.yellow('\n⭐ Favorite Tool Calls:\n'));
        if (favorites.length === 0) {
            console.log(chalk_1.default.gray('No favorites saved yet. Add some by using tools and selecting "y" when prompted.\n'));
            return;
        }
        favorites.forEach((favorite, index) => {
            const timeAgo = this.formatTimeAgo(favorite.timestamp);
            console.log(`${chalk_1.default.cyan((index + 1).toString().padStart(2))}. ${chalk_1.default.bold(favorite.toolName)}`);
            if (favorite.nickname) {
                console.log(`    ${chalk_1.default.magenta('Nickname:')} ${favorite.nickname}`);
            }
            console.log(`    ${chalk_1.default.gray('Added:')} ${timeAgo}`);
            console.log(`    ${chalk_1.default.gray('Parameters:')} ${JSON.stringify(favorite.parameters)}`);
            console.log();
        });
    }
    showHistory(history) {
        console.log(chalk_1.default.bold.blue('\n📜 Command History:\n'));
        if (history.length === 0) {
            console.log(chalk_1.default.gray('No command history available.\n'));
            return;
        }
        const recentHistory = history.slice(-20);
        recentHistory.forEach((command, index) => {
            const globalIndex = history.length - recentHistory.length + index + 1;
            console.log(`${chalk_1.default.gray(globalIndex.toString().padStart(3))}. ${command}`);
        });
        if (history.length > 20) {
            console.log(chalk_1.default.gray(`\n... and ${history.length - 20} more commands`));
        }
        console.log();
    }
    showAnalytics(analytics) {
        console.log(chalk_1.default.bold.green('\n📊 Performance Analytics:\n'));
        const totalRequests = analytics.getTotalRequests();
        const avgResponseTime = analytics.getAverageResponseTime();
        const successRate = analytics.getSuccessRate();
        console.log(chalk_1.default.bold('Overall Statistics:'));
        console.log(`📈 Total Requests: ${chalk_1.default.cyan(totalRequests)}`);
        console.log(`⚡ Avg Response Time: ${chalk_1.default.cyan(avgResponseTime.toFixed(1) + 'ms')}`);
        console.log(`✅ Success Rate: ${chalk_1.default.green((successRate * 100).toFixed(1) + '%')}\n`);
        const toolStats = analytics.getToolStats();
        if (Object.keys(toolStats).length > 0) {
            console.log(chalk_1.default.bold('Tool Statistics:'));
            const statsTable = Object.entries(toolStats).map(([tool, stats]) => [
                chalk_1.default.bold(tool),
                chalk_1.default.cyan(stats.calls.toString()),
                chalk_1.default.cyan(stats.avgTime.toFixed(1) + 'ms'),
                stats.successRate >= 0.9 ? chalk_1.default.green((stats.successRate * 100).toFixed(1) + '%') :
                    stats.successRate >= 0.7 ? chalk_1.default.yellow((stats.successRate * 100).toFixed(1) + '%') :
                        chalk_1.default.red((stats.successRate * 100).toFixed(1) + '%')
            ]);
            console.log(this.formatTable(['Tool', 'Calls', 'Avg Time', 'Success Rate'], statsTable));
        }
        const recentActivity = analytics.getRecentActivity();
        if (recentActivity.length > 0) {
            console.log(chalk_1.default.bold('\nRecent Activity:'));
            recentActivity.slice(-5).forEach(activity => {
                const timeAgo = this.formatTimeAgo(activity.timestamp);
                const statusIcon = activity.success ? chalk_1.default.green('✅') : chalk_1.default.red('❌');
                console.log(`${statusIcon} ${chalk_1.default.bold(activity.tool)} - ${activity.responseTime}ms (${timeAgo})`);
            });
        }
        console.log();
    }
    showTestSummary(results) {
        const duration = results.endTime.getTime() - results.startTime.getTime();
        const successRate = (results.passed / results.total) * 100;
        console.log(chalk_1.default.bold.blue('\n📋 Test Suite Summary:'));
        console.log(chalk_1.default.bold('═'.repeat(50)));
        console.log(`🕒 Duration: ${chalk_1.default.cyan(duration + 'ms')}`);
        console.log(`📊 Total Tests: ${chalk_1.default.cyan(results.total)}`);
        console.log(`✅ Passed: ${chalk_1.default.green(results.passed)}`);
        console.log(`❌ Failed: ${chalk_1.default.red(results.failed)}`);
        const successColor = successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red';
        console.log(`📈 Success Rate: ${chalk_1.default[successColor](successRate.toFixed(1) + '%')}`);
        const avgResponseTime = results.tests
            .filter((test) => test.success)
            .reduce((sum, test) => sum + test.responseTime, 0) / results.passed;
        console.log(`⚡ Avg Response Time: ${chalk_1.default.cyan(avgResponseTime.toFixed(1) + 'ms')}`);
        const failedTests = results.tests.filter((test) => !test.success);
        if (failedTests.length > 0) {
            console.log(chalk_1.default.bold.red('\n❌ Failed Tests:'));
            failedTests.forEach((test) => {
                console.log(`  • ${test.tool} (Scenario ${test.scenario}): ${test.error}`);
            });
        }
        console.log();
    }
    showHelp() {
        console.log(chalk_1.default.bold.cyan('\n📖 Enhanced MCP Tool Explorer - Help\n'));
        console.log(chalk_1.default.bold('🎯 Basic Usage:'));
        console.log('  • Select a tool by number (1-7)');
        console.log('  • Use Tab for auto-completion');
        console.log('  • Type 0 or "exit" to quit\n');
        console.log(chalk_1.default.bold('⭐ Special Commands:'));
        console.log('  • /favorites, /fav   - Show favorite tool calls');
        console.log('  • /history, /hist    - Show command history');
        console.log('  • /analytics, /stats - Show performance analytics');
        console.log('  • /clear            - Clear screen');
        console.log('  • /help             - Show this help\n');
        console.log(chalk_1.default.bold('🚀 Pro Tips:'));
        console.log('  • Use arrow keys to navigate command history');
        console.log('  • Mark successful calls as favorites for quick access');
        console.log('  • Check /analytics for performance insights');
        console.log('  • Tab completion works for parameters and values\n');
        console.log(chalk_1.default.bold('🔧 Command Line Options:'));
        console.log('  • --test-suite      - Run automated tests');
        console.log('  • --analytics       - Show analytics and exit');
        console.log('  • --tool <name>     - Test specific tool');
        console.log('  • --clear-session   - Clear all session data\n');
    }
    groupToolsByCategory(tools) {
        const categories = {};
        tools.forEach(tool => {
            if (!categories[tool.category]) {
                categories[tool.category] = [];
            }
            categories[tool.category].push(tool);
        });
        return categories;
    }
    formatToolStats(tool) {
        if (!tool.usage_stats) {
            return '';
        }
        const stats = tool.usage_stats;
        const calls = chalk_1.default.gray(`${stats.total_calls} calls`);
        const successRate = stats.success_rate >= 0.9 ?
            chalk_1.default.green(`${(stats.success_rate * 100).toFixed(0)}%`) :
            chalk_1.default.yellow(`${(stats.success_rate * 100).toFixed(0)}%`);
        const avgTime = chalk_1.default.gray(`${stats.avg_response_time.toFixed(0)}ms`);
        return `${calls} • ${successRate} success • ${avgTime} avg`;
    }
    showQuickStats(analytics, favoritesCount) {
        const totalRequests = analytics.getTotalRequests();
        const avgTime = analytics.getAverageResponseTime();
        const successRate = analytics.getSuccessRate();
        console.log(chalk_1.default.gray('Quick Stats: ') +
            `${totalRequests} requests • ` +
            `${avgTime.toFixed(0)}ms avg • ` +
            `${(successRate * 100).toFixed(0)}% success • ` +
            `${favoritesCount} favorites`);
        console.log();
    }
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1)
            return 'just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }
    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    }
}
exports.VisualInterface = VisualInterface;
