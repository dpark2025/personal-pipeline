#!/usr/bin/env node

/**
 * Debug script for MIME type detection
 * 
 * Investigates why MIME types aren't being detected in the enhanced adapter
 */

import { EnhancedFileSystemAdapter } from '../dist/adapters/file-enhanced.js';
import { fileTypeFromFile } from 'file-type';
import * as fs from 'fs/promises';
import * as path from 'path';

async function debugMimeDetection() {
  console.log('🔍 Debugging MIME Type Detection\n');

  // Test file-type module directly
  console.log('1. Testing file-type module directly:');
  try {
    const testFile = './docs/disk-space-runbook.json';
    const fileType = await fileTypeFromFile(testFile);
    console.log(`   ${testFile} → ${JSON.stringify(fileType)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test multiple files
  const testFiles = [
    './docs/API.md',
    './docs/disk-space-runbook.json',
    './config/config.sample.yaml',
    './README.md'
  ];

  console.log('\n2. Testing multiple files:');
  for (const file of testFiles) {
    try {
      const exists = await fs.access(file).then(() => true).catch(() => false);
      if (exists) {
        const fileType = await fileTypeFromFile(file);
        console.log(`   ${file} → ${JSON.stringify(fileType)}`);
      } else {
        console.log(`   ${file} → File not found`);
      }
    } catch (error) {
      console.log(`   ${file} → Error: ${error.message}`);
    }
  }

  // Test adapter's internal method
  console.log('\n3. Testing adapter detection method:');
  const adapter = new EnhancedFileSystemAdapter({
    name: 'debug-test',
    type: 'file',
    base_paths: ['./docs'],
    recursive: false,
    refresh_interval: '1h',
    priority: 1,
    enabled: true,
    timeout_ms: 30000,
    max_retries: 3
  });

  for (const file of testFiles) {
    try {
      const exists = await fs.access(file).then(() => true).catch(() => false);
      if (exists) {
        const detectedType = await adapter['detectFileType'](file);
        console.log(`   ${file} → ${JSON.stringify(detectedType)}`);
      }
    } catch (error) {
      console.log(`   ${file} → Error: ${error.message}`);
    }
  }

  // Test full adapter initialization and check results
  console.log('\n4. Testing full adapter initialization:');
  try {
    await adapter.initialize();
    const results = await adapter.search('config');
    
    console.log(`   Found ${results.length} results`);
    results.slice(0, 3).forEach(result => {
      console.log(`   ${result.title} → mime_type: ${result.metadata?.mime_type || 'undefined'}`);
    });
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  await adapter.cleanup();
}

debugMimeDetection().catch(console.error);