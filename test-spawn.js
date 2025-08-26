import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing spawn vs direct execution...');

// Test 1: Direct execution with captured output
console.log('\n=== Test 1: Direct execution ===');
const directProcess = spawn('timeout', ['5', 'node', 'dist/index.js', '--config', 'test-debug.yaml'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let directOutput = '';
directProcess.stdout.on('data', (data) => {
  directOutput += data.toString();
});

directProcess.stderr.on('data', (data) => {
  directOutput += data.toString();
});

directProcess.on('close', (code) => {
  console.log(`Direct process exited with code: ${code}`);
  console.log('Direct output length:', directOutput.length);
  console.log('First 500 chars:', directOutput.substring(0, 500));
  
  runPackageTest();
});

async function runPackageTest() {
  console.log('\n=== Test 2: Package test simulation ===');
  
  // Simulate the exact same environment as the package test
  const configFile = './test-debug.yaml';
  const packagePath = join(__dirname, 'dist', 'index.js');
  
  const serverProcess = spawn('node', [packagePath], {
    env: { ...process.env, CONFIG_FILE: configFile, LOG_LEVEL: 'error' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let serverOutput = '';
  let serverReady = false;
  
  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
    console.log('STDOUT chunk:', data.toString().substring(0, 200));
    if (data.toString().includes('ready to accept connections')) {
      serverReady = true;
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    serverOutput += data.toString();
    console.log('STDERR chunk:', data.toString().substring(0, 200));
  });
  
  // Wait for server startup (max 10 seconds)
  let attempts = 0;
  while (!serverReady && attempts < 100) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
    
    if (serverProcess.exitCode !== null) {
      console.log(`Package test server exited early with code ${serverProcess.exitCode}: ${serverOutput}`);
      break;
    }
  }
  
  if (!serverReady) {
    serverProcess.kill();
    console.log(`Package test timeout after 10 seconds. Output length: ${serverOutput.length}`);
    console.log('Package test output:', serverOutput);
  } else {
    console.log('Package test succeeded!');
    serverProcess.kill('SIGTERM');
  }
}
