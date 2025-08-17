#!/usr/bin/env node

/**
 * Serve All Themes Script
 * 
 * Serves the theme preview with all 4 VitePress themes
 * using a simple HTTP server for local development.
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PREVIEW_DIR = join(__dirname, '../website_docs/.vitepress/theme-preview');
const PORT = 8080;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

const server = createServer((req, res) => {
  let filePath = join(PREVIEW_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // Security check - prevent directory traversal
  if (!filePath.startsWith(PREVIEW_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  // Check if file exists
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  
  // Check if it's a directory, serve index.html
  if (statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('Directory index not found');
      return;
    }
  }
  
  try {
    const content = readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
    
    // Log the request
    console.log(`📄 ${req.method} ${req.url} → ${filePath.replace(PREVIEW_DIR, '')}`);
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.writeHead(500);
    res.end('Internal server error');
  }
});

// Check if theme preview exists
if (!existsSync(PREVIEW_DIR)) {
  console.log('❌ Theme preview not found!');
  console.log('   Run: npm run build:all-themes');
  process.exit(1);
}

server.listen(PORT, () => {
  console.log('🎨 VitePress Theme Preview Server');
  console.log('=====================================');
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${PREVIEW_DIR}`);
  console.log('');
  console.log('Available themes:');
  console.log(`   🏠 Theme Index:     http://localhost:${PORT}/`);
  console.log(`   💼 Professional:    http://localhost:${PORT}/professional/`);
  console.log(`   🌙 Dark:            http://localhost:${PORT}/dark/`);
  console.log(`   🟢 Minimalist:      http://localhost:${PORT}/minimalist/`);
  console.log(`   🏢 Enterprise:      http://localhost:${PORT}/enterprise/`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down theme preview server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});