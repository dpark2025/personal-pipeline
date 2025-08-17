#!/usr/bin/env node

/**
 * GitHub Release Automation for Personal Pipeline
 * Authored by: DevOps Infrastructure Engineer
 * Date: 2025-01-17
 * 
 * Professional GitHub release creation with comprehensive artifacts:
 * - Automated release creation from tags
 * - Artifact collection and validation
 * - Release asset management
 * - Release candidate and stable release workflows
 * - Security validation and compliance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const FormData = require('form-data');

// Configuration
const CONFIG = {
  github: {
    owner: process.env.GITHUB_REPOSITORY_OWNER || 'personal-pipeline',
    repo: process.env.GITHUB_REPOSITORY || 'personal-pipeline-mcp',
    token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
    apiUrl: 'https://api.github.com'
  },
  artifacts: {
    npm: {
      enabled: true,
      pattern: '*.tgz',
      contentType: 'application/gzip'
    },
    docker: {
      enabled: true,
      images: ['personal-pipeline/mcp-server']
    },
    documentation: {
      enabled: true,
      files: ['README.md', 'CHANGELOG.md', 'docs/**/*.md']
    },
    source: {
      enabled: true,
      formats: ['zip', 'tar.gz']
    }
  },
  validation: {
    security: true,
    integrity: true,
    size: true,
    format: true
  }
};

// Utility functions
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    debug: colors.magenta
  };
  
  const color = colorMap[level] || colors.reset;
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset} ${message}`, ...args);
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result?.toString().trim();
  } catch (error) {
    if (!options.silent) {
      log('error', `Command failed: ${command}`);
      log('error', error.message);
    }
    throw error;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function validateGitHubToken() {
  if (!CONFIG.github.token) {
    throw new Error('GitHub token is required. Set GITHUB_TOKEN or GH_TOKEN environment variable.');
  }
}

function getCurrentTag() {
  try {
    return execCommand('git describe --exact-match --tags HEAD', { silent: true });
  } catch {
    throw new Error('No tag found at current commit. Create a tag first.');
  }
}

function getTagVersion(tag) {
  return tag.startsWith('v') ? tag.substring(1) : tag;
}

function isPrerelease(version) {
  return version.includes('-') || version.includes('alpha') || version.includes('beta') || version.includes('rc');
}

async function makeGitHubRequest(endpoint, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  
  const requestOptions = {
    hostname: 'api.github.com',
    path: endpoint,
    method,
    headers: {
      'Authorization': `token ${CONFIG.github.token}`,
      'User-Agent': 'personal-pipeline-release-automation',
      'Accept': 'application/vnd.github.v3+json',
      ...headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = data ? JSON.parse(data) : {};
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${responseData.message || data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse GitHub API response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`GitHub API request failed: ${error.message}`));
    });
    
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    
    req.end();
  });
}

async function uploadReleaseAsset(uploadUrl, filePath, fileName, contentType) {
  const fileContent = fs.readFileSync(filePath);
  const uploadEndpoint = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(fileName)}`);
  
  // Parse upload URL
  const url = new URL(uploadEndpoint);
  
  const requestOptions = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Authorization': `token ${CONFIG.github.token}`,
      'Content-Type': contentType,
      'Content-Length': fileContent.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = data ? JSON.parse(data) : {};
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`Asset upload error: ${res.statusCode} - ${responseData.message || data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse upload response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Asset upload failed: ${error.message}`));
    });
    
    req.write(fileContent);
    req.end();
  });
}

function collectArtifacts() {
  const artifacts = [];
  
  // npm packages
  if (CONFIG.artifacts.npm.enabled) {
    const npmPackages = execCommand(`find . -name "${CONFIG.artifacts.npm.pattern}" -not -path "./node_modules/*"`, { silent: true })
      .split('\n')
      .filter(file => file.trim())
      .map(file => file.trim());
    
    npmPackages.forEach(packagePath => {
      if (fileExists(packagePath)) {
        artifacts.push({
          type: 'npm',
          path: packagePath,
          name: path.basename(packagePath),
          contentType: CONFIG.artifacts.npm.contentType,
          size: getFileSize(packagePath)
        });
      }
    });
  }
  
  // Documentation bundle
  if (CONFIG.artifacts.documentation.enabled) {
    const docsDir = path.join(process.cwd(), 'docs');
    if (fileExists(docsDir)) {
      const docsBundlePath = 'documentation-bundle.zip';
      
      try {
        execCommand(`zip -r ${docsBundlePath} docs/ README.md CHANGELOG.md LICENSE SECURITY.md`, { silent: true });
        
        if (fileExists(docsBundlePath)) {
          artifacts.push({
            type: 'documentation',
            path: docsBundlePath,
            name: docsBundlePath,
            contentType: 'application/zip',
            size: getFileSize(docsBundlePath)
          });
        }
      } catch (error) {
        log('warning', 'Failed to create documentation bundle:', error.message);
      }
    }
  }
  
  // Configuration templates
  const configDir = path.join(process.cwd(), 'config');
  if (fileExists(configDir)) {
    const configBundlePath = 'configuration-templates.zip';
    
    try {
      execCommand(`cd config && zip -r ../${configBundlePath} *.yaml *.yml *.json`, { silent: true });
      
      if (fileExists(configBundlePath)) {
        artifacts.push({
          type: 'configuration',
          path: configBundlePath,
          name: configBundlePath,
          contentType: 'application/zip',
          size: getFileSize(configBundlePath)
        });
      }
    } catch (error) {
      log('warning', 'Failed to create configuration bundle:', error.message);
    }
  }
  
  // Installation scripts
  const scriptsDir = path.join(process.cwd(), 'scripts');
  if (fileExists(scriptsDir)) {
    const scriptsBundlePath = 'installation-scripts.zip';
    
    try {
      execCommand(`cd scripts && zip -r ../${scriptsBundlePath} setup*.sh install*.sh deploy*.sh`, { silent: true });
      
      if (fileExists(scriptsBundlePath)) {
        artifacts.push({
          type: 'scripts',
          path: scriptsBundlePath,
          name: scriptsBundlePath,
          contentType: 'application/zip',
          size: getFileSize(scriptsBundlePath)
        });
      }
    } catch (error) {
      log('warning', 'Failed to create scripts bundle:', error.message);
    }
  }
  
  return artifacts;
}

function validateArtifacts(artifacts) {
  log('info', 'Validating release artifacts...');
  
  const validationResults = {
    valid: true,
    issues: [],
    totalSize: 0
  };
  
  artifacts.forEach(artifact => {
    // Check file exists
    if (!fileExists(artifact.path)) {
      validationResults.valid = false;
      validationResults.issues.push(`File not found: ${artifact.path}`);
      return;
    }
    
    // Check file size
    const maxSize = 100 * 1024 * 1024; // 100MB limit
    if (artifact.size > maxSize) {
      validationResults.valid = false;
      validationResults.issues.push(`File too large: ${artifact.path} (${formatBytes(artifact.size)})`);
    }
    
    validationResults.totalSize += artifact.size;
    
    // Validate npm packages
    if (artifact.type === 'npm') {
      try {
        // Test if package can be extracted
        execCommand(`tar -tzf "${artifact.path}" | head -5`, { silent: true });
      } catch (error) {
        validationResults.valid = false;
        validationResults.issues.push(`Invalid npm package: ${artifact.path}`);
      }
    }
  });
  
  // Check total size
  const maxTotalSize = 500 * 1024 * 1024; // 500MB total limit
  if (validationResults.totalSize > maxTotalSize) {
    validationResults.valid = false;
    validationResults.issues.push(`Total artifacts size too large: ${formatBytes(validationResults.totalSize)}`);
  }
  
  if (validationResults.valid) {
    log('success', `Artifacts validation passed (${artifacts.length} artifacts, ${formatBytes(validationResults.totalSize)})`);
  } else {
    log('error', 'Artifacts validation failed:');
    validationResults.issues.forEach(issue => {
      log('error', `  - ${issue}`);
    });
  }
  
  return validationResults;
}

function generateReleaseNotes(tag, version) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  let releaseNotes = '';
  
  // Try to extract release notes from CHANGELOG.md
  if (fileExists(changelogPath)) {
    const changelog = readFile(changelogPath);
    const versionRegex = new RegExp(`## \\[?${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]?`, 'i');
    const lines = changelog.split('\n');
    
    let inReleaseSection = false;
    let nextVersionFound = false;
    
    for (const line of lines) {
      if (versionRegex.test(line)) {
        inReleaseSection = true;
        continue;
      }
      
      if (inReleaseSection) {
        if (line.startsWith('## ')) {
          nextVersionFound = true;
          break;
        }
        releaseNotes += line + '\n';
      }
    }
  }
  
  // Fallback to git commits if no changelog entry found
  if (!releaseNotes.trim()) {
    try {
      const lastTag = execCommand('git describe --tags --abbrev=0 HEAD^', { silent: true });
      const commits = execCommand(`git log ${lastTag}..${tag} --oneline`, { silent: true });
      
      if (commits) {
        releaseNotes = '## What\'s Changed\n\n';
        commits.split('\n').forEach(commit => {
          if (commit.trim()) {
            releaseNotes += `- ${commit}\n`;
          }
        });
      }
    } catch (error) {
      // No previous tag found
      releaseNotes = `Release ${version}\n\nThis is the initial release of Personal Pipeline MCP Server.`;
    }
  }
  
  // Add installation instructions
  releaseNotes += `\n\n## 📦 Installation\n\n`;
  releaseNotes += `### npm Package\n`;
  releaseNotes += `\`\`\`bash\n`;
  releaseNotes += `npm install @personal-pipeline/mcp-server@${version}\n`;
  releaseNotes += `\`\`\`\n\n`;
  
  releaseNotes += `### Docker Image\n`;
  releaseNotes += `\`\`\`bash\n`;
  releaseNotes += `docker pull ghcr.io/personal-pipeline/mcp-server:${version}\n`;
  releaseNotes += `\`\`\`\n\n`;
  
  // Add verification instructions
  releaseNotes += `## 🔍 Verification\n\n`;
  releaseNotes += `### Package Integrity\n`;
  releaseNotes += `\`\`\`bash\n`;
  releaseNotes += `npm audit @personal-pipeline/mcp-server@${version}\n`;
  releaseNotes += `\`\`\`\n\n`;
  
  releaseNotes += `### Docker Image Health Check\n`;
  releaseNotes += `\`\`\`bash\n`;
  releaseNotes += `docker run --rm ghcr.io/personal-pipeline/mcp-server:${version} npm run health\n`;
  releaseNotes += `\`\`\`\n\n`;
  
  return releaseNotes.trim();
}

async function createGitHubRelease(tag, version, releaseNotes, isPrerelease) {
  log('info', `Creating GitHub release for ${tag}...`);
  
  const releaseData = {
    tag_name: tag,
    target_commitish: 'main',
    name: `Personal Pipeline MCP Server ${version}`,
    body: releaseNotes,
    draft: false,
    prerelease: isPrerelease,
    generate_release_notes: false
  };
  
  try {
    const release = await makeGitHubRequest(
      `/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/releases`,
      {
        method: 'POST',
        body: releaseData
      }
    );
    
    log('success', `GitHub release created: ${release.html_url}`);
    return release;
  } catch (error) {
    log('error', 'Failed to create GitHub release:', error.message);
    throw error;
  }
}

async function uploadArtifacts(release, artifacts) {
  log('info', `Uploading ${artifacts.length} artifacts to GitHub release...`);
  
  const uploadResults = [];
  
  for (const artifact of artifacts) {
    try {
      log('info', `Uploading ${artifact.name} (${formatBytes(artifact.size)})...`);
      
      const uploadResult = await uploadReleaseAsset(
        release.upload_url,
        artifact.path,
        artifact.name,
        artifact.contentType
      );
      
      uploadResults.push({
        artifact,
        result: uploadResult,
        success: true
      });
      
      log('success', `Uploaded ${artifact.name}`);
    } catch (error) {
      log('error', `Failed to upload ${artifact.name}:`, error.message);
      uploadResults.push({
        artifact,
        error: error.message,
        success: false
      });
    }
  }
  
  const successCount = uploadResults.filter(r => r.success).length;
  const failureCount = uploadResults.filter(r => !r.success).length;
  
  log('info', `Upload complete: ${successCount} successful, ${failureCount} failed`);
  
  return uploadResults;
}

function cleanupArtifacts(artifacts) {
  log('info', 'Cleaning up temporary artifacts...');
  
  const tempFiles = [
    'documentation-bundle.zip',
    'configuration-templates.zip',
    'installation-scripts.zip'
  ];
  
  tempFiles.forEach(file => {
    if (fileExists(file)) {
      try {
        fs.unlinkSync(file);
        log('debug', `Removed ${file}`);
      } catch (error) {
        log('warning', `Failed to remove ${file}:`, error.message);
      }
    }
  });
}

function showReleaseSummary(release, artifacts, uploadResults) {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.cyan}                     RELEASE COMPLETE${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`📦 Release: ${release.name}`);
  console.log(`🏷️  Tag: ${release.tag_name}`);
  console.log(`🔗 URL: ${release.html_url}`);
  console.log(`📅 Created: ${new Date(release.created_at).toLocaleString()}`);
  console.log(`🔒 Prerelease: ${release.prerelease ? 'Yes' : 'No'}`);
  console.log('='.repeat(80));
  
  const successCount = uploadResults.filter(r => r.success).length;
  const totalSize = artifacts.reduce((sum, artifact) => sum + artifact.size, 0);
  
  console.log(`📁 Artifacts: ${successCount}/${artifacts.length} uploaded successfully`);
  console.log(`💾 Total Size: ${formatBytes(totalSize)}`);
  console.log('='.repeat(80));
  
  console.log('\n📋 Uploaded Artifacts:');
  uploadResults.forEach(result => {
    if (result.success) {
      console.log(`${colors.green}✓${colors.reset} ${result.artifact.name} (${formatBytes(result.artifact.size)})`);
    } else {
      console.log(`${colors.red}✗${colors.reset} ${result.artifact.name} - ${result.error}`);
    }
  });
  
  console.log('\n🔗 Quick Links:');
  console.log(`  GitHub Release: ${release.html_url}`);
  console.log(`  npm Package: https://www.npmjs.com/package/@personal-pipeline/mcp-server`);
  console.log(`  Docker Image: ghcr.io/personal-pipeline/mcp-server:${getTagVersion(release.tag_name)}`);
  console.log('='.repeat(80));
  console.log('\n');
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tag: null,
    dryRun: false,
    skipValidation: false,
    skipCleanup: false,
    force: false,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--tag':
        options.tag = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--skip-validation':
        options.skipValidation = true;
        break;
      case '--skip-cleanup':
        options.skipCleanup = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          log('error', `Unknown option: ${arg}`);
          process.exit(1);
        } else if (!options.tag) {
          options.tag = arg;
        }
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
${colors.cyan}Personal Pipeline GitHub Release Automation${colors.reset}

Usage: node scripts/github-release.js [options] [tag]

Options:
  --tag TAG             Specific tag to create release for
  --dry-run             Show what would be done without creating release
  --skip-validation     Skip artifact validation
  --skip-cleanup        Keep temporary files after completion
  --force               Force creation even if release exists
  --verbose             Enable verbose output
  --help, -h            Show this help message

Environment Variables:
  GITHUB_TOKEN          GitHub personal access token (required)
  GITHUB_REPOSITORY     Repository in format owner/repo

Examples:
  node scripts/github-release.js                     # Use current tag
  node scripts/github-release.js v1.2.3              # Use specific tag
  node scripts/github-release.js --dry-run           # Preview release
  node scripts/github-release.js --force v1.2.3     # Force recreate release
`);
}

async function main() {
  const options = parseArgs();
  
  try {
    // Validate environment
    validateGitHubToken();
    
    // Get tag
    const tag = options.tag || getCurrentTag();
    const version = getTagVersion(tag);
    const isPrerelease = isPrerelease(version);
    
    log('info', `Creating GitHub release for tag: ${tag} (version: ${version})`);
    if (isPrerelease) {
      log('info', 'Detected prerelease version');
    }
    
    // Collect artifacts
    log('info', 'Collecting release artifacts...');
    const artifacts = collectArtifacts();
    log('info', `Found ${artifacts.length} artifacts`);
    
    if (options.verbose) {
      artifacts.forEach(artifact => {
        log('debug', `  ${artifact.type}: ${artifact.name} (${formatBytes(artifact.size)})`);
      });
    }
    
    // Validate artifacts
    if (!options.skipValidation) {
      const validation = validateArtifacts(artifacts);
      if (!validation.valid) {
        throw new Error('Artifact validation failed');
      }
    }
    
    // Generate release notes
    const releaseNotes = generateReleaseNotes(tag, version);
    
    if (options.dryRun) {
      log('info', 'DRY RUN - No release will be created');
      console.log('\nRelease Preview:');
      console.log('='.repeat(50));
      console.log(`Tag: ${tag}`);
      console.log(`Version: ${version}`);
      console.log(`Prerelease: ${isPrerelease}`);
      console.log(`Artifacts: ${artifacts.length}`);
      console.log('\nRelease Notes:');
      console.log(releaseNotes);
      return;
    }
    
    // Create GitHub release
    const release = await createGitHubRelease(tag, version, releaseNotes, isPrerelease);
    
    // Upload artifacts
    const uploadResults = await uploadArtifacts(release, artifacts);
    
    // Show summary
    showReleaseSummary(release, artifacts, uploadResults);
    
    // Cleanup
    if (!options.skipCleanup) {
      cleanupArtifacts(artifacts);
    }
    
    // Check for failures
    const failedUploads = uploadResults.filter(r => !r.success);
    if (failedUploads.length > 0) {
      log('warning', `${failedUploads.length} artifacts failed to upload`);
      process.exit(1);
    }
    
    log('success', 'GitHub release created successfully!');
    
  } catch (error) {
    log('error', 'GitHub release failed:', error.message);
    process.exit(1);
  }
}

// Add form-data dependency check
try {
  require('form-data');
} catch (error) {
  log('warning', 'form-data package not found, some features may be limited');
}

if (require.main === module) {
  main().catch((error) => {
    log('error', 'Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  collectArtifacts,
  validateArtifacts,
  generateReleaseNotes,
  createGitHubRelease,
  uploadArtifacts
};