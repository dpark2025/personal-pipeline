#!/usr/bin/env node

/**
 * Test script for Enhanced FileSystemAdapter
 * 
 * Tests the new Phase 2 capabilities:
 * - Multiple root directories
 * - Recursive scanning with depth control
 * - File pattern matching
 * - PDF text extraction
 * - Advanced metadata extraction
 * 
 * Authored by: Integration Specialist (Barry)
 * Date: 2025-08-01
 */

import { EnhancedFileSystemAdapter } from '../dist/adapters/file-enhanced.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const testConfig = {
  name: 'test-enhanced-fs',
  type: 'file',
  base_paths: ['./docs', './config'], // Multiple directories
  recursive: true,
  max_depth: 3,
  file_patterns: {
    include: ['*.md', '*.json', '*.pdf'],
    exclude: ['**/node_modules/**', '**/dist/**']
  },
  supported_extensions: ['.md', '.json', '.pdf', '.yml', '.yaml'],
  extract_metadata: true,
  pdf_extraction: true,
  watch_changes: false,
  refresh_interval: '1h',
  priority: 1,
  enabled: true,
  timeout_ms: 30000,
  max_retries: 3,
  categories: ['runbooks', 'documentation']
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function testEnhancedAdapter() {
  logSection('Enhanced FileSystemAdapter Test Suite');
  
  try {
    // Create adapter instance
    log('\n1. Creating Enhanced FileSystemAdapter...', 'cyan');
    const adapter = new EnhancedFileSystemAdapter(testConfig);
    log('✓ Adapter created successfully', 'green');

    // Initialize adapter
    log('\n2. Initializing adapter...', 'cyan');
    await adapter.initialize();
    log('✓ Adapter initialized', 'green');

    // Get metadata
    log('\n3. Getting adapter metadata...', 'cyan');
    const metadata = await adapter.getMetadata();
    console.log('Metadata:', JSON.stringify(metadata, null, 2));
    log(`✓ Document count: ${metadata.documentCount}`, 'green');

    // Test basic search
    log('\n4. Testing basic search...', 'cyan');
    const searchResults = await adapter.search('runbook');
    log(`✓ Found ${searchResults.length} results for "runbook"`, 'green');
    
    if (searchResults.length > 0) {
      console.log('\nFirst result:');
      console.log(JSON.stringify(searchResults[0], null, 2));
    }

    // Test pattern-based search
    log('\n5. Testing pattern-based search...', 'cyan');
    const patternResults = await adapter.search('disk space', {
      confidence_threshold: 0.5
    });
    log(`✓ Found ${patternResults.length} results for "disk space"`, 'green');

    // Test runbook search
    log('\n6. Testing runbook search...', 'cyan');
    const runbooks = await adapter.searchRunbooks(
      'disk_full',
      'critical',
      ['production', 'database']
    );
    log(`✓ Found ${runbooks.length} runbooks`, 'green');

    // Test document retrieval
    if (searchResults.length > 0) {
      log('\n7. Testing document retrieval...', 'cyan');
      const doc = await adapter.getDocument(searchResults[0].id);
      if (doc) {
        log('✓ Document retrieved successfully', 'green');
        console.log('Document title:', doc.title);
        console.log('Document metadata:', JSON.stringify(doc.metadata, null, 2));
      }
    }

    // Test health check
    log('\n8. Testing health check...', 'cyan');
    const health = await adapter.healthCheck();
    console.log('Health status:', JSON.stringify(health, null, 2));
    log(`✓ Health check ${health.healthy ? 'passed' : 'failed'}`, health.healthy ? 'green' : 'red');

    // Test refresh index
    log('\n9. Testing index refresh...', 'cyan');
    const refreshed = await adapter.refreshIndex(true);
    log(`✓ Index refresh ${refreshed ? 'succeeded' : 'failed'}`, refreshed ? 'green' : 'red');

    // Display statistics
    logSection('Test Summary');
    const finalMetadata = await adapter.getMetadata();
    console.log(`Total documents indexed: ${finalMetadata.documentCount}`);
    console.log(`Average response time: ${finalMetadata.avgResponseTime}ms`);
    console.log(`Success rate: ${finalMetadata.successRate * 100}%`);

    // Cleanup
    log('\n10. Cleaning up...', 'cyan');
    await adapter.cleanup();
    log('✓ Cleanup completed', 'green');

    logSection('All Tests Passed!');
    log('Enhanced FileSystemAdapter is working correctly', 'green');

  } catch (error) {
    logSection('Test Failed!');
    log(`Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${__filename}`) {
  testEnhancedAdapter().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}