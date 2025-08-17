#!/usr/bin/env node

/**
 * Personal Pipeline CLI - Main Entry Point
 * 
 * Provides a comprehensive command-line interface for the Personal Pipeline
 * MCP server with support for multiple operation modes and configurations.
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
  .name('personal-pipeline')
  .description('Personal Pipeline - Intelligent MCP server for documentation retrieval and incident response')
  .version(packageJson.version)
  .option('-c, --config <path>', 'Configuration file path', './config/config.yaml')
  .option('-p, --port <number>', 'Server port', '3000')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--debug', 'Enable debug mode')
  .option('--no-cache', 'Disable caching')
  .option('--redis-url <url>', 'Redis connection URL')
  .option('--create-sample-config', 'Create sample configuration and exit');

program
  .command('start')
  .description('Start the Personal Pipeline MCP server')
  .option('-d, --daemon', 'Run as daemon process')
  .option('-w, --watch', 'Watch for file changes and restart')
  .action(async (options) => {
    try {
      // Dynamic import to avoid loading the entire server on help commands
      const { startServer } = await import('../dist/cli/start.js');
      await startServer({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Stop the Personal Pipeline MCP server')
  .option('-f, --force', 'Force stop the server')
  .action(async (options) => {
    try {
      const { stopServer } = await import('../dist/cli/stop.js');
      await stopServer({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Failed to stop server:', error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check server status and health')
  .option('-j, --json', 'Output in JSON format')
  .option('--detailed', 'Show detailed status information')
  .action(async (options) => {
    try {
      const { checkStatus } = await import('../dist/cli/status.js');
      await checkStatus({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Failed to check status:', error.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Configuration management commands')
  .option('--validate', 'Validate configuration file')
  .option('--create-sample', 'Create sample configuration')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    try {
      const { manageConfig } = await import('../dist/cli/config.js');
      await manageConfig({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Configuration error:', error.message);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test MCP server functionality')
  .option('--quick', 'Run quick tests only')
  .option('--integration', 'Run integration tests')
  .option('--performance', 'Run performance tests')
  .action(async (options) => {
    try {
      const { runTests } = await import('../dist/cli/test.js');
      await runTests({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Test failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('benchmark')
  .description('Run performance benchmarks')
  .option('--duration <seconds>', 'Test duration in seconds', '30')
  .option('--concurrent <number>', 'Number of concurrent connections', '10')
  .option('--output <format>', 'Output format (table|json|csv)', 'table')
  .action(async (options) => {
    try {
      const { runBenchmark } = await import('../dist/cli/benchmark.js');
      await runBenchmark({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Benchmark failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('demo')
  .description('Demo environment management')
  .option('--start', 'Start demo environment')
  .option('--stop', 'Stop demo environment')
  .option('--interactive', 'Interactive demo setup')
  .option('--clean', 'Clean demo data')
  .action(async (options) => {
    try {
      const { manageDemo } = await import('../dist/cli/demo.js');
      await manageDemo({
        ...program.opts(),
        ...options
      });
    } catch (error) {
      console.error('Demo command failed:', error.message);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}