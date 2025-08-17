#!/usr/bin/env node

/**
 * Simple Theme Preview Server
 * 
 * This script provides a simple way to preview all VitePress themes locally
 * by switching themes on-demand and serving them individually.
 */

import { createServer } from 'http';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PORT = 8080;
const themes = ['professional', 'dark', 'minimalist', 'enterprise'];

// Landing page HTML
const landingPageHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VitePress Theme Preview - Personal Pipeline</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            color: white;
            padding: 3rem 2rem;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .themes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            padding: 3rem 2rem;
        }
        
        .theme-card {
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            background: white;
        }
        
        .theme-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.15);
            border-color: #3b82f6;
        }
        
        .theme-preview {
            height: 150px;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }
        
        .theme-preview.professional {
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        }
        
        .theme-preview.dark {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        }
        
        .theme-preview.minimalist {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        
        .theme-preview.enterprise {
            background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
        }
        
        .theme-icon {
            font-size: 3rem;
            color: white;
        }
        
        .theme-content {
            padding: 1.5rem;
        }
        
        .theme-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1f2937;
        }
        
        .theme-description {
            color: #6b7280;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
        
        .theme-link {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background 0.2s ease;
            cursor: pointer;
        }
        
        .theme-link:hover {
            background: #2563eb;
        }
        
        .current-server {
            background: #f0f9ff;
            padding: 1rem 2rem;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #0369a1;
            font-weight: 500;
        }
        
        .instructions {
            background: #f8fafc;
            padding: 2rem;
            text-align: center;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .themes-grid {
                grid-template-columns: 1fr;
                padding: 2rem 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 VitePress Theme Preview</h1>
            <p>Personal Pipeline Documentation - Local Development Server</p>
        </div>
        
        <div class="themes-grid">
            <div class="theme-card">
                <div class="theme-preview professional">
                    <div class="theme-icon">💼</div>
                </div>
                <div class="theme-content">
                    <h3 class="theme-title">Professional Corporate</h3>
                    <p class="theme-description">Clean business styling for enterprise documentation</p>
                    <a href="/switch/professional" class="theme-link">Preview Professional Theme →</a>
                </div>
            </div>
            
            <div class="theme-card">
                <div class="theme-preview dark">
                    <div class="theme-icon">🌙</div>
                </div>
                <div class="theme-content">
                    <h3 class="theme-title">Developer Dark</h3>
                    <p class="theme-description">Dark mode optimized for developer workflows</p>
                    <a href="/switch/dark" class="theme-link">Preview Dark Theme →</a>
                </div>
            </div>
            
            <div class="theme-card">
                <div class="theme-preview minimalist">
                    <div class="theme-icon">🟢</div>
                </div>
                <div class="theme-content">
                    <h3 class="theme-title">Minimalist Documentation</h3>
                    <p class="theme-description">Ultra-clean design for simple documentation</p>
                    <a href="/switch/minimalist" class="theme-link">Preview Minimalist Theme →</a>
                </div>
            </div>
            
            <div class="theme-card">
                <div class="theme-preview enterprise">
                    <div class="theme-icon">🏢</div>
                </div>
                <div class="theme-content">
                    <h3 class="theme-title">Enterprise Technical</h3>
                    <p class="theme-description">Comprehensive portal for large organizations</p>
                    <a href="/switch/enterprise" class="theme-link">Preview Enterprise Theme →</a>
                </div>
            </div>
        </div>
        
        <div class="current-server">
            🚀 Local development server running on http://localhost:${PORT}
        </div>
        
        <div class="instructions">
            <p><strong>Instructions:</strong></p>
            <p>Click on any theme above to switch and preview it. The VitePress development server will restart with the selected theme.</p>
            <p>Current theme configurations are working correctly - this server makes it easy to preview them all!</p>
        </div>
    </div>
</body>
</html>`;

function switchTheme(theme) {
    return new Promise((resolve, reject) => {
        console.log(`🔄 Switching to ${theme} theme...`);
        const switcher = spawn('node', ['website_docs/.vitepress/theme-switcher.js', theme], {
            stdio: 'pipe'
        });
        
        let output = '';
        switcher.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        switcher.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Successfully switched to ${theme} theme`);
                resolve(output);
            } else {
                reject(new Error(`Theme switch failed with code ${code}`));
            }
        });
    });
}

function startVitePressServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting VitePress development server...');
        const vitepress = spawn('npm', ['run', 'docs:dev'], {
            stdio: 'pipe',
            detached: true
        });
        
        let started = false;
        vitepress.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('VitePress:', output.trim());
            
            if (output.includes('Local:') && !started) {
                started = true;
                // Give VitePress a moment to fully start
                setTimeout(() => resolve(vitepress), 2000);
            }
        });
        
        vitepress.stderr.on('data', (data) => {
            console.error('VitePress Error:', data.toString());
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
            if (!started) {
                reject(new Error('VitePress server failed to start within 30 seconds'));
            }
        }, 30000);
    });
}

let vitepressProcess = null;

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(landingPageHTML);
        return;
    }
    
    if (url.pathname.startsWith('/switch/')) {
        const theme = url.pathname.replace('/switch/', '');
        
        if (!themes.includes(theme)) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`<h1>Theme not found</h1><p>Available themes: ${themes.join(', ')}</p>`);
            return;
        }
        
        try {
            // Stop existing VitePress server
            if (vitepressProcess) {
                console.log('🛑 Stopping existing VitePress server...');
                process.kill(-vitepressProcess.pid);
                vitepressProcess = null;
                // Wait for clean shutdown
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Switch theme
            await switchTheme(theme);
            
            // Start new VitePress server
            vitepressProcess = await startVitePressServer();
            
            // Redirect to VitePress server
            res.writeHead(302, { 
                'Location': 'http://localhost:5173/personal-pipeline/',
                'Content-Type': 'text/html'
            });
            res.end(`
                <html>
                    <head>
                        <meta http-equiv="refresh" content="3;url=http://localhost:5173/personal-pipeline/">
                    </head>
                    <body>
                        <h2>🎨 Switching to ${theme} theme...</h2>
                        <p>You will be redirected to the VitePress server in 3 seconds.</p>
                        <p>If not redirected, <a href="http://localhost:5173/personal-pipeline/">click here</a></p>
                    </body>
                </html>
            `);
            
        } catch (error) {
            console.error('❌ Error switching theme:', error);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>Error switching theme</h1>
                <p>${error.message}</p>
                <p><a href="/">← Back to theme selector</a></p>
            `);
        }
        return;
    }
    
    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
        <h1>Page not found</h1>
        <p><a href="/">← Back to theme selector</a></p>
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n👋 Shutting down theme preview server...');
    
    if (vitepressProcess) {
        console.log('🛑 Stopping VitePress server...');
        process.kill(-vitepressProcess.pid);
    }
    
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

server.listen(PORT, () => {
    console.log('🎨 VitePress Theme Preview Server');
    console.log('=====================================');
    console.log(`🌐 Theme Selector: http://localhost:${PORT}`);
    console.log(`📚 VitePress Server: http://localhost:5173/personal-pipeline/ (starts when you select a theme)`);
    console.log('');
    console.log('Available themes:');
    themes.forEach(theme => {
        console.log(`   - ${theme}: http://localhost:${PORT}/switch/${theme}`);
    });
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});