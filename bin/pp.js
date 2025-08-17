#!/usr/bin/env node

/**
 * PP CLI - Simplified Personal Pipeline Interface
 * 
 * Quick and easy CLI for common Personal Pipeline operations.
 * Provides shortcuts for frequently used commands.
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
  .name('pp')
  .description('Personal Pipeline - Quick CLI interface')
  .version(packageJson.version);

// Quick start command
program
  .command('start')
  .alias('s')
  .description('Quick start the server')
  .option('-p, --port <number>', 'Server port', '3000')
  .action(async (options) => {
    console.log('🚀 Starting Personal Pipeline server...');
    try {
      const { spawn } = await import('child_process');
      const serverProcess = spawn('node', [
        join(__dirname, 'personal-pipeline.js'),
        'start',
        ...(options.port ? ['--port', options.port] : [])
      ], {
        stdio: 'inherit'
      });
      
      serverProcess.on('exit', (code) => {
        process.exit(code || 0);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  });

// Quick stop command
program
  .command('stop')
  .alias('x')
  .description('Stop the server')
  .action(async () => {
    console.log('🛑 Stopping Personal Pipeline server...');
    try {
      const { spawn } = await import('child_process');
      const stopProcess = spawn('node', [
        join(__dirname, 'personal-pipeline.js'),
        'stop'
      ], {
        stdio: 'inherit'
      });
      
      stopProcess.on('exit', (code) => {
        process.exit(code || 0);
      });
    } catch (error) {
      console.error('❌ Failed to stop server:', error.message);
      process.exit(1);
    }
  });

// Quick status check
program
  .command('status')
  .alias('st')
  .description('Check server status')
  .action(async () => {
    console.log('📊 Checking Personal Pipeline status...');
    try {
      const { spawn } = await import('child_process');
      const statusProcess = spawn('node', [
        join(__dirname, 'personal-pipeline.js'),
        'status'
      ], {
        stdio: 'inherit'
      });
      
      statusProcess.on('exit', (code) => {
        process.exit(code || 0);
      });
    } catch (error) {
      console.error('❌ Failed to check status:', error.message);
      process.exit(1);
    }
  });

// Quick search
program
  .command('search <query>')
  .alias('find')
  .description('Quick search documentation')
  .option('-l, --limit <number>', 'Maximum results', '5')
  .action(async (query, options) => {
    console.log(`🔍 Searching for: "${query}"...`);
    try {
      const { spawn } = await import('child_process');
      const searchProcess = spawn('node', [
        join(__dirname, 'pp-mcp.js'),
        'search',
        query,
        ...(options.limit ? ['--limit', options.limit] : [])
      ], {
        stdio: 'inherit'
      });
      
      searchProcess.on('exit', (code) => {
        process.exit(code || 0);
      });
    } catch (error) {
      console.error('❌ Search failed:', error.message);
      process.exit(1);
    }
  });

// Quick demo commands
program
  .command('demo')
  .description('Demo environment shortcuts')
  .option('--start', 'Start demo environment')
  .option('--stop', 'Stop demo environment')
  .option('--status', 'Check demo status')
  .action(async (options) => {
    if (options.start) {
      console.log('🎭 Starting demo environment...');
      const { spawn } = await import('child_process');
      const demoProcess = spawn('npm', ['run', 'demo:start'], {
        stdio: 'inherit',
        cwd: join(__dirname, '..')
      });
      demoProcess.on('exit', (code) => process.exit(code || 0));
    } else if (options.stop) {
      console.log('🛑 Stopping demo environment...');
      const { spawn } = await import('child_process');
      const demoProcess = spawn('npm', ['run', 'demo:stop'], {
        stdio: 'inherit',
        cwd: join(__dirname, '..')
      });
      demoProcess.on('exit', (code) => process.exit(code || 0));
    } else if (options.status) {
      console.log('📊 Checking demo status...');
      const { spawn } = await import('child_process');
      const statusProcess = spawn('npm', ['run', 'health'], {
        stdio: 'inherit',
        cwd: join(__dirname, '..')
      });
      statusProcess.on('exit', (code) => process.exit(code || 0));
    } else {
      console.log('Usage: pp demo --start|--stop|--status');
    }
  });

// Show available commands if no arguments
program.action(() => {
  console.log(`
🔧 Personal Pipeline Quick CLI

Quick commands:
  pp start        Start the server
  pp stop         Stop the server  
  pp status       Check server status
  pp search       Search documentation
  pp demo         Demo environment management

For full functionality use: personal-pipeline --help
  `);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.action()();
}