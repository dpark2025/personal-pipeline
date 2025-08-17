#!/usr/bin/env node

/**
 * PP-MCP CLI - MCP Protocol Focused Interface
 * 
 * Simplified CLI specifically for MCP server operations and testing.
 * Provides direct access to MCP tools and protocol features.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { program } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version info
const packagePath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

program
  .name('pp-mcp')
  .description('Personal Pipeline MCP - Direct MCP protocol interface')
  .version(packageJson.version)
  .option('-c, --config <path>', 'Configuration file path', './config/config.yaml')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--json', 'Output in JSON format');

program
  .command('serve')
  .description('Start MCP server (stdio mode)')
  .action(async () => {
    try {
      // Start the MCP server in stdio mode
      const { personalPipelineServer } = await import('../dist/index.js');
      await personalPipelineServer.start();
    } catch (error) {
      console.error('Failed to start MCP server:', error.message);
      process.exit(1);
    }
  });

program
  .command('tools')
  .description('List available MCP tools')
  .option('--detailed', 'Show detailed tool descriptions')
  .action(async (options) => {
    try {
      const { listTools } = await import('../dist/cli/mcp-tools.js');
      await listTools({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Failed to list tools:', error.message);
      process.exit(1);
    }
  });

program
  .command('call <tool> [args...]')
  .description('Call an MCP tool directly')
  .option('-p, --params <json>', 'Tool parameters as JSON string')
  .option('-f, --file <path>', 'Read parameters from JSON file')
  .action(async (tool, args, options) => {
    try {
      const { callTool } = await import('../dist/cli/mcp-tools.js');
      await callTool(tool, args, {
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Tool call failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('search <query>')
  .description('Search documentation and runbooks')
  .option('-t, --type <type>', 'Search type (runbooks|docs|all)', 'all')
  .option('-f, --filters <json>', 'Search filters as JSON')
  .option('-l, --limit <number>', 'Maximum results to return', '10')
  .action(async (query, options) => {
    try {
      const { searchContent } = await import('../dist/cli/mcp-search.js');
      await searchContent(query, {
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Search failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('explorer')
  .description('Interactive MCP explorer and testing interface')
  .option('--analytics', 'Show analytics dashboard')
  .option('--test-suite', 'Run automated test suite')
  .action(async (options) => {
    try {
      const { startExplorer } = await import('../dist/cli/mcp-explorer.js');
      await startExplorer({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Explorer failed to start:', error.message);
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Check MCP server health and sources')
  .option('--sources', 'Check source adapter health')
  .option('--cache', 'Check cache status')
  .option('--performance', 'Show performance metrics')
  .action(async (options) => {
    try {
      const { checkHealth } = await import('../dist/cli/mcp-health.js');
      await checkHealth({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Health check failed:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}