import { spawn } from 'child_process';

console.log('Testing different LOG_LEVEL settings...');

async function testLogLevel(logLevel, testName) {
  console.log(`\n=== ${testName}: LOG_LEVEL=${logLevel} ===`);
  
  const serverProcess = spawn('node', ['dist/index.js', '--config', 'test-debug.yaml'], {
    env: { ...process.env, LOG_LEVEL: logLevel },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let serverOutput = '';
  let serverReady = false;
  
  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
    if (data.toString().includes('ready to accept connections')) {
      serverReady = true;
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    serverOutput += data.toString();
  });
  
  // Wait for server startup (max 8 seconds)
  let attempts = 0;
  while (!serverReady && attempts < 80) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
    
    if (serverProcess.exitCode !== null) {
      console.log(`Server exited early with code ${serverProcess.exitCode}`);
      break;
    }
  }
  
  serverProcess.kill('SIGTERM');
  
  console.log(`Result: ${serverReady ? 'SUCCESS' : 'TIMEOUT'}`);
  console.log(`Output length: ${serverOutput.length} chars`);
  console.log(`First 300 chars: ${serverOutput.substring(0, 300)}`);
  
  return serverReady;
}

// Test different log levels
await testLogLevel('info', 'Test A');
await testLogLevel('error', 'Test B'); 
await testLogLevel('warn', 'Test C');
console.log('\nTesting complete');
