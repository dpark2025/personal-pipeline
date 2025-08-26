#!/usr/bin/env node

/**
 * Health Check Test Script
 * Tests the improved health check functionality with different scenarios
 */

import http from 'http';

const testScenarios = [
  {
    name: 'Normal API Health Check',
    path: '/api/health',
    expectedStatus: [200, 503], // Either healthy or degraded is acceptable
    requiredFields: ['api_status', 'sources', 'configuration', 'uptime_seconds']
  },
  {
    name: 'Basic Health Check',
    path: '/health', 
    expectedStatus: [200, 503],
    requiredFields: ['status']
  }
];

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, parseError: error.message });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTest(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📍 Path: ${scenario.path}`);

  try {
    const result = await makeRequest(scenario.path);
    
    console.log(`📊 Status: ${result.status}`);
    
    // Check status code
    if (!scenario.expectedStatus.includes(result.status)) {
      console.log(`❌ Unexpected status code. Expected: ${scenario.expectedStatus.join(' or ')}, Got: ${result.status}`);
      return false;
    }
    
    if (result.parseError) {
      console.log(`⚠️  JSON Parse Error: ${result.parseError}`);
      console.log(`📄 Raw Response: ${result.data.substring(0, 200)}...`);
      return false;
    }
    
    // Check for generic error responses (old issue)
    if (result.data.error && result.data.error.code === 'INTERNAL_SERVER_ERROR') {
      console.log(`❌ Generic INTERNAL_SERVER_ERROR detected (this was the original issue)`);
      console.log(`🔗 Correlation ID: ${result.data.error.details?.correlation_id}`);
      return false;
    }
    
    // Check required fields
    const missingFields = scenario.requiredFields.filter(field => !(field in result.data));
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    // Analyze the response
    if (result.data.api_status) {
      console.log(`🏥 API Status: ${result.data.api_status}`);
      if (result.data.configuration) {
        console.log(`⚙️  Configuration: ${result.data.configuration.sources_configured} sources, cache: ${result.data.configuration.cache_enabled}`);
      }
      if (result.data.configuration_status) {
        console.log(`🔧 Configuration Status: ${result.data.configuration_status}`);
      }
      if (result.data.message) {
        console.log(`💬 Message: ${result.data.message}`);
      }
    }
    
    console.log(`✅ Test passed!`);
    return true;
    
  } catch (error) {
    console.log(`❌ Test failed with error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Health Check Tests');
  console.log('================================');
  
  let passed = 0;
  let failed = 0;
  
  for (const scenario of testScenarios) {
    const success = await runTest(scenario);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All health check tests passed! The fix is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);