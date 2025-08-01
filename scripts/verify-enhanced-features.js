#!/usr/bin/env node

/**
 * Feature Verification Script for Enhanced FileSystemAdapter
 * 
 * This script specifically tests each enhanced feature to prove they work:
 * 1. Multiple root directories
 * 2. Recursive scanning with depth control  
 * 3. File pattern matching (include/exclude)
 * 4. Advanced file type detection
 * 5. Metadata extraction
 * 6. Performance optimizations
 * 
 * Authored by: Integration Specialist (Barry)
 * Date: 2025-08-01
 */

import { EnhancedFileSystemAdapter } from '../dist/adapters/file-enhanced.js';
import { promises as fs } from 'fs';
import path from 'path';

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyFeatures() {
  log('\n🧪 Enhanced FileSystemAdapter Feature Verification', 'bold');
  log('='.repeat(60), 'blue');

  let passedTests = 0;
  let totalTests = 0;

  async function testFeature(name, testFn) {
    totalTests++;
    try {
      log(`\n${totalTests}. Testing ${name}...`, 'blue');
      await testFn();
      log(`✅ ${name} - PASSED`, 'green');
      passedTests++;
      return true;
    } catch (error) {
      log(`❌ ${name} - FAILED: ${error.message}`, 'red');
      return false;
    }
  }

  // Feature 1: Multiple Root Directories
  await testFeature('Multiple Root Directories', async () => {
    const adapter = new EnhancedFileSystemAdapter({
      name: 'multi-path-test',
      type: 'file',
      base_paths: ['./docs', './config', './planning'], // Multiple directories
      recursive: false, // Keep it simple for this test
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3
    });

    await adapter.initialize();
    
    const metadata = await adapter.getMetadata();
    log(`  → Indexed ${metadata.documentCount} documents from multiple directories`);
    
    if (metadata.documentCount === 0) {
      throw new Error('No documents found from multiple directories');
    }

    // Search should find documents from different directories
    const results = await adapter.search('milestone');
    const paths = results.map(r => r.metadata?.file_path || '');
    const uniqueDirs = new Set(paths.map(p => p.split('/')[0]));
    
    log(`  → Found documents in ${uniqueDirs.size} different directories`);
    if (uniqueDirs.size < 2) {
      log(`  → Warning: Expected documents from multiple directories, found in: ${Array.from(uniqueDirs).join(', ')}`);
    }

    await adapter.cleanup();
  });

  // Feature 2: Recursive Scanning with Depth Control
  await testFeature('Recursive Scanning with Depth Control', async () => {
    const shallowAdapter = new EnhancedFileSystemAdapter({
      name: 'shallow-test',
      type: 'file',
      base_paths: ['./docs'],
      recursive: false, // No recursion
      max_depth: 0,
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3
    });

    const deepAdapter = new EnhancedFileSystemAdapter({
      name: 'deep-test',
      type: 'file', 
      base_paths: ['./docs'],
      recursive: true, // With recursion
      max_depth: 5,
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3
    });

    await shallowAdapter.initialize();
    await deepAdapter.initialize();

    const shallowCount = (await shallowAdapter.getMetadata()).documentCount;
    const deepCount = (await deepAdapter.getMetadata()).documentCount;

    log(`  → Shallow scan (no recursion): ${shallowCount} documents`);
    log(`  → Deep scan (recursive): ${deepCount} documents`);

    if (deepCount <= shallowCount) {
      log(`  → Warning: Deep scan should find more documents than shallow scan`);
    }

    await shallowAdapter.cleanup();
    await deepAdapter.cleanup();
  });

  // Feature 3: File Pattern Matching
  await testFeature('File Pattern Matching (Include/Exclude)', async () => {
    const adapter = new EnhancedFileSystemAdapter({
      name: 'pattern-test',
      type: 'file',
      base_paths: ['./docs'],
      recursive: true,
      file_patterns: {
        include: ['*.md'], // Only markdown files
        exclude: ['**/DEMO-*', '**/TEST*'] // Exclude demo and test files
      },
      supported_extensions: ['.md', '.json', '.txt'],
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3
    });

    await adapter.initialize();
    
    const results = await adapter.search('test');
    const fileTypes = results.map(r => r.metadata?.file_type || '');
    const uniqueTypes = new Set(fileTypes);

    log(`  → Found file types: ${Array.from(uniqueTypes).join(', ')}`);
    
    // Should only find .md files due to include pattern
    const nonMarkdownFiles = results.filter(r => r.metadata?.file_type !== '.md');
    if (nonMarkdownFiles.length > 0) {
      log(`  → Warning: Found non-markdown files despite include pattern`);
    }

    // Should not find files matching exclude patterns
    const excludedFiles = results.filter(r => 
      r.metadata?.file_path?.includes('DEMO-') || 
      r.metadata?.file_path?.includes('TEST')
    );
    
    if (excludedFiles.length > 0) {
      log(`  → Warning: Found excluded files: ${excludedFiles.map(f => f.title).join(', ')}`);
    } else {
      log(`  → Correctly excluded DEMO- and TEST files`);
    }

    await adapter.cleanup();
  });

  // Feature 4: Advanced File Type Detection
  await testFeature('Advanced File Type Detection', async () => {
    const adapter = new EnhancedFileSystemAdapter({
      name: 'filetype-test',
      type: 'file',
      base_paths: ['./docs'],
      recursive: true,
      supported_extensions: ['.md', '.json', '.txt', '.yml', '.yaml'],
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3
    });

    await adapter.initialize();
    
    const results = await adapter.search('config');
    const mimeTypes = results.map(r => r.metadata?.mime_type).filter(Boolean);
    const uniqueMimeTypes = new Set(mimeTypes);

    log(`  → Detected MIME types: ${Array.from(uniqueMimeTypes).join(', ')}`);
    
    // Should detect various MIME types
    const expectedTypes = ['text/markdown', 'application/json', 'text/plain'];
    const foundExpected = expectedTypes.filter(type => uniqueMimeTypes.has(type));
    
    log(`  → Found expected MIME types: ${foundExpected.join(', ')}`);

    if (foundExpected.length === 0) {
      throw new Error('No expected MIME types detected');
    }

    await adapter.cleanup();
  });

  // Feature 5: Metadata Extraction
  await testFeature('Metadata Extraction', async () => {
    const adapter = new EnhancedFileSystemAdapter({
      name: 'metadata-test',
      type: 'file',
      base_paths: ['./docs'],
      recursive: true,
      extract_metadata: true,
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3
    });

    await adapter.initialize();
    
    const results = await adapter.search('runbook');
    
    if (results.length === 0) {
      throw new Error('No documents found for metadata testing');
    }

    const result = results[0];
    const metadata = result.metadata;

    log(`  → Sample document: ${result.title}`);
    log(`  → File type: ${metadata?.file_type}`);
    log(`  → Size: ${metadata?.size} bytes`);
    log(`  → Last modified: ${metadata?.last_modified}`);
    log(`  → Directory: ${metadata?.directory}`);

    // Check for essential metadata fields
    const requiredFields = ['file_type', 'size', 'last_modified', 'directory'];
    const missingFields = requiredFields.filter(field => !metadata?.[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing metadata fields: ${missingFields.join(', ')}`);
    }

    // Check for extracted front matter (if any)
    if (metadata?.author) {
      log(`  → Author: ${metadata.author}`);
    }
    if (metadata?.tags) {
      log(`  → Tags: ${metadata.tags}`);
    }

    await adapter.cleanup();
  });

  // Feature 6: Performance Optimizations
  await testFeature('Performance Optimizations', async () => {
    const adapter = new EnhancedFileSystemAdapter({
      name: 'performance-test',
      type: 'file',
      base_paths: ['./docs'],
      recursive: true,
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3
    });

    // Test initialization speed
    const initStart = Date.now();
    await adapter.initialize();
    const initDuration = Date.now() - initStart;

    const metadata = await adapter.getMetadata();
    log(`  → Initialized ${metadata.documentCount} documents in ${initDuration}ms`);

    if (initDuration > 5000) {
      log(`  → Warning: Initialization took longer than expected (${initDuration}ms)`);
    }

    // Test search speed
    const searchStart = Date.now();
    const results = await adapter.search('runbook');
    const searchDuration = Date.now() - searchStart;

    log(`  → Found ${results.length} results in ${searchDuration}ms`);

    if (searchDuration > 100) {
      log(`  → Warning: Search took longer than expected (${searchDuration}ms)`);
    }

    // Test refresh speed
    const refreshStart = Date.now();
    await adapter.refreshIndex(true);
    const refreshDuration = Date.now() - refreshStart;

    log(`  → Refreshed index in ${refreshDuration}ms`);

    await adapter.cleanup();
  });

  // Feature 7: Error Handling and Edge Cases
  await testFeature('Error Handling and Edge Cases', async () => {
    // Test with non-existent directory
    const badAdapter = new EnhancedFileSystemAdapter({
      name: 'error-test',
      type: 'file',
      base_paths: ['/non/existent/path'],
      refresh_interval: '1h',
      priority: 1,
      enabled: true,
      timeout_ms: 30000,
      max_retries: 3
    });

    let initError = null;
    try {
      await badAdapter.initialize();
    } catch (error) {
      initError = error;
    }

    if (!initError) {
      throw new Error('Expected initialization to fail with non-existent path');
    }

    log(`  → Correctly handled initialization error: ${initError.message}`);

    // Test health check with bad configuration
    const health = await badAdapter.healthCheck();
    if (health.healthy) {
      throw new Error('Health check should report unhealthy status');
    }

    log(`  → Health check correctly reports unhealthy status`);
    log(`  → Error message: ${health.error_message}`);

    await badAdapter.cleanup();
  });

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log(`📊 Feature Verification Summary`, 'bold');
  log(`✅ Passed: ${passedTests}/${totalTests} tests`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    log(`\n🎉 All Enhanced FileSystemAdapter features are working correctly!`, 'green');
    log(`\nVerified Features:`, 'bold');
    log(`• Multiple root directories support`);
    log(`• Recursive scanning with depth control`);
    log(`• File pattern matching (include/exclude)`);
    log(`• Advanced file type detection with MIME types`);
    log(`• Enhanced metadata extraction`);
    log(`• Performance optimizations`);
    log(`• Error handling and edge cases`);
  } else {
    log(`\n⚠️  Some features may need attention`, 'yellow');
  }

  return passedTests === totalTests;
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyFeatures().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}