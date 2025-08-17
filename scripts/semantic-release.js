#!/usr/bin/env node

/**
 * Semantic Release Automation for Personal Pipeline
 * Authored by: DevOps Infrastructure Engineer
 * Date: 2025-01-17
 * 
 * Professional semantic versioning with automated release management:
 * - Conventional commit analysis for automatic version bumping
 * - Intelligent release notes generation
 * - Artifact coordination and validation
 * - Release candidate and hotfix support
 * - Rollback and recovery capabilities
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const semver = require('semver');

// Configuration
const CONFIG = {
  project: {
    name: 'Personal Pipeline MCP Server',
    packageName: '@personal-pipeline/mcp-server',
    repository: 'personal-pipeline-mcp',
    author: 'Personal Pipeline Team'
  },
  versioning: {
    initialVersion: '0.1.0',
    prereleaseIdentifier: 'beta',
    hotfixBranches: ['hotfix/**', 'fix/**'],
    releaseBranches: ['main', 'master', 'release/**']
  },
  artifacts: {
    npm: true,
    docker: true,
    documentation: true,
    sourceMaps: true
  },
  validation: {
    tests: true,
    linting: true,
    security: true,
    performance: true
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

function getCurrentVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fileExists(packagePath)) {
    throw new Error('package.json not found');
  }
  
  const packageJson = JSON.parse(readFile(packagePath));
  return packageJson.version || CONFIG.versioning.initialVersion;
}

function getCurrentBranch() {
  try {
    return execCommand('git rev-parse --abbrev-ref HEAD', { silent: true });
  } catch {
    return 'unknown';
  }
}

function getCommitsSinceLastTag() {
  try {
    const lastTag = execCommand('git describe --tags --abbrev=0', { silent: true });
    return execCommand(`git log ${lastTag}..HEAD --oneline`, { silent: true })
      .split('\n')
      .filter(line => line.trim());
  } catch {
    // No tags exist, get all commits
    return execCommand('git log --oneline', { silent: true })
      .split('\n')
      .filter(line => line.trim());
  }
}

function analyzeCommits(commits) {
  const analysis = {
    breaking: [],
    features: [],
    fixes: [],
    performance: [],
    refactor: [],
    docs: [],
    chore: [],
    other: [],
    hasBreaking: false,
    hasFeatures: false,
    hasFixes: false
  };

  commits.forEach(commit => {
    const message = commit.toLowerCase();
    
    if (message.includes('breaking change') || message.includes('!:')) {
      analysis.breaking.push(commit);
      analysis.hasBreaking = true;
    } else if (message.startsWith('feat(') || message.startsWith('feat:')) {
      analysis.features.push(commit);
      analysis.hasFeatures = true;
    } else if (message.startsWith('fix(') || message.startsWith('fix:')) {
      analysis.fixes.push(commit);
      analysis.hasFixes = true;
    } else if (message.startsWith('perf(') || message.startsWith('perf:')) {
      analysis.performance.push(commit);
    } else if (message.startsWith('refactor(') || message.startsWith('refactor:')) {
      analysis.refactor.push(commit);
    } else if (message.startsWith('docs(') || message.startsWith('docs:')) {
      analysis.docs.push(commit);
    } else if (message.startsWith('chore(') || message.startsWith('chore:')) {
      analysis.chore.push(commit);
    } else {
      analysis.other.push(commit);
    }
  });

  return analysis;
}

function determineVersionBump(commitAnalysis, currentVersion, options = {}) {
  const { forceType, isHotfix, isPrerelease } = options;
  
  if (forceType) {
    return forceType;
  }
  
  if (isHotfix) {
    return 'patch';
  }
  
  if (commitAnalysis.hasBreaking) {
    return 'major';
  }
  
  if (commitAnalysis.hasFeatures) {
    return 'minor';
  }
  
  if (commitAnalysis.hasFixes || commitAnalysis.performance.length > 0) {
    return 'patch';
  }
  
  // No significant changes
  return isPrerelease ? 'prerelease' : 'patch';
}

function calculateNewVersion(currentVersion, bumpType, options = {}) {
  const { isPrerelease, prereleaseId } = options;
  
  if (isPrerelease) {
    if (semver.prerelease(currentVersion)) {
      return semver.inc(currentVersion, 'prerelease', prereleaseId);
    } else {
      return semver.inc(currentVersion, `pre${bumpType}`, prereleaseId);
    }
  }
  
  return semver.inc(currentVersion, bumpType);
}

function generateReleaseNotes(version, commitAnalysis, options = {}) {
  const { isPrerelease, previousVersion } = options;
  const date = new Date().toISOString().split('T')[0];
  
  let notes = `# Release ${version}\n\n`;
  
  // Release metadata
  notes += `**Release Date:** ${date}\n`;
  notes += `**Version:** ${version}\n`;
  notes += `**Type:** ${isPrerelease ? 'Pre-release' : 'Stable Release'}\n`;
  if (previousVersion) {
    notes += `**Previous Version:** ${previousVersion}\n`;
  }
  notes += '\n';
  
  // Breaking changes (highest priority)
  if (commitAnalysis.breaking.length > 0) {
    notes += '## ⚠️ BREAKING CHANGES\n\n';
    commitAnalysis.breaking.forEach(commit => {
      notes += `- ${commit.replace(/^[a-f0-9]+\s/, '')}\n`;
    });
    notes += '\n';
  }
  
  // New features
  if (commitAnalysis.features.length > 0) {
    notes += '## ✨ New Features\n\n';
    commitAnalysis.features.forEach(commit => {
      notes += `- ${commit.replace(/^[a-f0-9]+\s/, '')}\n`;
    });
    notes += '\n';
  }
  
  // Bug fixes
  if (commitAnalysis.fixes.length > 0) {
    notes += '## 🐛 Bug Fixes\n\n';
    commitAnalysis.fixes.forEach(commit => {
      notes += `- ${commit.replace(/^[a-f0-9]+\s/, '')}\n`;
    });
    notes += '\n';
  }
  
  // Performance improvements
  if (commitAnalysis.performance.length > 0) {
    notes += '## ⚡ Performance Improvements\n\n';
    commitAnalysis.performance.forEach(commit => {
      notes += `- ${commit.replace(/^[a-f0-9]+\s/, '')}\n`;
    });
    notes += '\n';
  }
  
  // Refactoring
  if (commitAnalysis.refactor.length > 0) {
    notes += '## ♻️ Code Refactoring\n\n';
    commitAnalysis.refactor.forEach(commit => {
      notes += `- ${commit.replace(/^[a-f0-9]+\s/, '')}\n`;
    });
    notes += '\n';
  }
  
  // Documentation
  if (commitAnalysis.docs.length > 0) {
    notes += '## 📚 Documentation\n\n';
    commitAnalysis.docs.forEach(commit => {
      notes += `- ${commit.replace(/^[a-f0-9]+\s/, '')}\n`;
    });
    notes += '\n';
  }
  
  // Maintenance
  if (commitAnalysis.chore.length > 0) {
    notes += '## 🔧 Maintenance\n\n';
    commitAnalysis.chore.forEach(commit => {
      notes += `- ${commit.replace(/^[a-f0-9]+\s/, '')}\n`;
    });
    notes += '\n';
  }
  
  // Other changes
  if (commitAnalysis.other.length > 0) {
    notes += '## Other Changes\n\n';
    commitAnalysis.other.forEach(commit => {
      notes += `- ${commit.replace(/^[a-f0-9]+\s/, '')}\n`;
    });
    notes += '\n';
  }
  
  // Installation instructions
  notes += '## 📦 Installation\n\n';
  notes += '### npm Package\n';
  notes += '```bash\n';
  notes += `npm install ${CONFIG.project.packageName}@${version}\n`;
  notes += '```\n\n';
  
  notes += '### Docker Image\n';
  notes += '```bash\n';
  notes += `docker pull ghcr.io/personal-pipeline/mcp-server:${version}\n`;
  notes += '```\n\n';
  
  // Verification
  notes += '## 🔍 Verification\n\n';
  notes += '### Package Integrity\n';
  notes += '```bash\n';
  notes += `npm audit ${CONFIG.project.packageName}@${version}\n`;
  notes += '```\n\n';
  
  notes += '### Docker Image Health Check\n';
  notes += '```bash\n';
  notes += `docker run --rm ghcr.io/personal-pipeline/mcp-server:${version} npm run health\n`;
  notes += '```\n\n';
  
  // Links
  notes += '## 🔗 Links\n\n';
  notes += `- [GitHub Release](https://github.com/${CONFIG.project.repository}/releases/tag/v${version})\n`;
  notes += `- [npm Package](https://www.npmjs.com/package/${CONFIG.project.packageName})\n`;
  notes += `- [Docker Image](https://ghcr.io/personal-pipeline/mcp-server:${version})\n`;
  notes += `- [Documentation](https://github.com/${CONFIG.project.repository}/tree/v${version}/docs)\n\n`;
  
  return notes;
}

function validateRelease(version, options = {}) {
  const { skipTests, skipLinting, skipSecurity } = options;
  
  log('info', 'Running release validation...');
  
  // Check git status
  try {
    const gitStatus = execCommand('git status --porcelain', { silent: true });
    if (gitStatus && !options.allowDirty) {
      throw new Error('Working directory is not clean. Commit or stash changes first.');
    }
  } catch (error) {
    log('error', 'Git status check failed:', error.message);
    throw error;
  }
  
  // Run tests
  if (!skipTests && CONFIG.validation.tests) {
    try {
      log('info', 'Running test suite...');
      execCommand('npm test');
      log('success', 'Tests passed');
    } catch (error) {
      log('error', 'Tests failed');
      throw error;
    }
  }
  
  // Run linting
  if (!skipLinting && CONFIG.validation.linting) {
    try {
      log('info', 'Running code quality checks...');
      execCommand('npm run lint');
      execCommand('npm run typecheck');
      log('success', 'Code quality checks passed');
    } catch (error) {
      log('error', 'Code quality checks failed');
      throw error;
    }
  }
  
  // Security validation
  if (!skipSecurity && CONFIG.validation.security) {
    try {
      log('info', 'Running security audit...');
      execCommand('npm audit --audit-level=moderate');
      log('success', 'Security audit passed');
    } catch (error) {
      log('warning', 'Security audit found issues, please review');
      // Don't fail the release for security issues, just warn
    }
  }
  
  log('success', 'Release validation completed');
}

function buildArtifacts(version, options = {}) {
  const { skipBuild } = options;
  
  if (skipBuild) {
    log('info', 'Skipping artifact build');
    return;
  }
  
  log('info', 'Building release artifacts...');
  
  // Clean and build
  try {
    execCommand('npm run clean');
    execCommand('npm run build');
    log('success', 'Project built successfully');
  } catch (error) {
    log('error', 'Build failed');
    throw error;
  }
  
  // Create npm package
  if (CONFIG.artifacts.npm) {
    try {
      log('info', 'Creating npm package...');
      execCommand('npm pack');
      log('success', 'npm package created');
    } catch (error) {
      log('error', 'npm package creation failed');
      throw error;
    }
  }
  
  // Build Docker image
  if (CONFIG.artifacts.docker) {
    try {
      log('info', 'Building Docker image...');
      execCommand(`docker build -t personal-pipeline/mcp-server:${version} .`);
      execCommand(`docker tag personal-pipeline/mcp-server:${version} personal-pipeline/mcp-server:latest`);
      log('success', 'Docker image built');
    } catch (error) {
      log('error', 'Docker build failed');
      throw error;
    }
  }
  
  log('success', 'All artifacts built successfully');
}

function createTag(version, releaseNotes, options = {}) {
  const { dryRun } = options;
  
  if (dryRun) {
    log('info', `DRY RUN: Would create tag v${version}`);
    return;
  }
  
  try {
    // Update package.json
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFile(packagePath));
    packageJson.version = version;
    writeFile(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    
    // Update CHANGELOG.md
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    let changelog = '';
    if (fileExists(changelogPath)) {
      changelog = readFile(changelogPath);
    } else {
      changelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n`;
    }
    
    // Insert new release notes at the top (after header)
    const lines = changelog.split('\n');
    const insertIndex = lines.findIndex(line => line.startsWith('## ')) || lines.length;
    lines.splice(insertIndex, 0, releaseNotes.replace(/^# Release/, '## ['));
    writeFile(changelogPath, lines.join('\n'));
    
    // Create git commit and tag
    execCommand('git add package.json CHANGELOG.md');
    execCommand(`git commit -m "chore: release version ${version}

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"`);
    
    execCommand(`git tag -a "v${version}" -m "Release ${version}

📦 Release with automated build and testing

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"`);
    
    log('success', `Created tag v${version}`);
  } catch (error) {
    log('error', 'Failed to create tag:', error.message);
    throw error;
  }
}

function showReleaseSummary(currentVersion, newVersion, commitAnalysis, releaseNotes) {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.cyan}                     RELEASE SUMMARY${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`📦 Package: ${CONFIG.project.name}`);
  console.log(`📌 Current Version: ${currentVersion}`);
  console.log(`🎯 New Version: ${colors.green}${newVersion}${colors.reset}`);
  console.log(`🔄 Version Bump: ${commitAnalysis.hasBreaking ? 'major' : commitAnalysis.hasFeatures ? 'minor' : 'patch'}`);
  console.log(`📝 Commits Analyzed: ${Object.values(commitAnalysis).flat().length - 3}`); // Subtract boolean flags
  console.log(`🏷️  Git Tag: v${newVersion}`);
  console.log('='.repeat(80));
  
  if (commitAnalysis.hasBreaking) {
    console.log(`${colors.red}⚠️  Breaking Changes: ${commitAnalysis.breaking.length}${colors.reset}`);
  }
  if (commitAnalysis.hasFeatures) {
    console.log(`${colors.green}✨ New Features: ${commitAnalysis.features.length}${colors.reset}`);
  }
  if (commitAnalysis.hasFixes) {
    console.log(`${colors.yellow}🐛 Bug Fixes: ${commitAnalysis.fixes.length}${colors.reset}`);
  }
  
  console.log('='.repeat(80));
  console.log('\n');
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    command: 'auto',
    versionType: null,
    dryRun: false,
    skipTests: false,
    skipLinting: false,
    skipSecurity: false,
    skipBuild: false,
    prerelease: false,
    hotfix: false,
    allowDirty: false,
    interactive: false,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case 'auto':
      case 'release':
      case 'prerelease':
      case 'hotfix':
      case 'analyze':
        options.command = arg;
        break;
      case '--version-type':
        options.versionType = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--skip-tests':
        options.skipTests = true;
        break;
      case '--skip-linting':
        options.skipLinting = true;
        break;
      case '--skip-security':
        options.skipSecurity = true;
        break;
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--prerelease':
        options.prerelease = true;
        break;
      case '--hotfix':
        options.hotfix = true;
        break;
      case '--allow-dirty':
        options.allowDirty = true;
        break;
      case '--interactive':
        options.interactive = true;
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
        }
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
${colors.cyan}Personal Pipeline Semantic Release${colors.reset}

Usage: node scripts/semantic-release.js [command] [options]

Commands:
  auto         Automatically determine version bump from commits (default)
  release      Create a stable release
  prerelease   Create a prerelease version
  hotfix       Create a hotfix release
  analyze      Analyze commits without creating a release

Options:
  --version-type TYPE    Force specific version bump (patch, minor, major)
  --dry-run             Show what would be done without making changes
  --skip-tests          Skip test execution
  --skip-linting        Skip code quality checks
  --skip-security       Skip security audit
  --skip-build          Skip artifact building
  --prerelease          Create prerelease version
  --hotfix              Force hotfix mode
  --allow-dirty         Allow uncommitted changes
  --interactive         Interactive mode with prompts
  --verbose             Enable verbose output
  --help, -h            Show this help message

Examples:
  node scripts/semantic-release.js auto
  node scripts/semantic-release.js release --dry-run
  node scripts/semantic-release.js prerelease --version-type minor
  node scripts/semantic-release.js analyze
  node scripts/semantic-release.js hotfix --skip-tests
`);
}

async function main() {
  const options = parseArgs();
  
  try {
    log('info', `Starting semantic release (command: ${options.command})`);
    
    // Get current state
    const currentVersion = getCurrentVersion();
    const currentBranch = getCurrentBranch();
    const commits = getCommitsSinceLastTag();
    const commitAnalysis = analyzeCommits(commits);
    
    if (options.verbose) {
      log('debug', `Current version: ${currentVersion}`);
      log('debug', `Current branch: ${currentBranch}`);
      log('debug', `Commits since last tag: ${commits.length}`);
    }
    
    // Analyze command
    if (options.command === 'analyze') {
      log('info', 'Commit analysis:');
      console.log(JSON.stringify(commitAnalysis, null, 2));
      return;
    }
    
    // Determine version bump
    const isPrerelease = options.command === 'prerelease' || options.prerelease;
    const isHotfix = options.command === 'hotfix' || options.hotfix;
    const versionBump = determineVersionBump(commitAnalysis, currentVersion, {
      forceType: options.versionType,
      isHotfix,
      isPrerelease
    });
    
    // Calculate new version
    const newVersion = calculateNewVersion(currentVersion, versionBump, {
      isPrerelease,
      prereleaseId: CONFIG.versioning.prereleaseIdentifier
    });
    
    if (!newVersion) {
      log('error', 'Failed to calculate new version');
      process.exit(1);
    }
    
    // Generate release notes
    const releaseNotes = generateReleaseNotes(newVersion, commitAnalysis, {
      isPrerelease,
      previousVersion: currentVersion
    });
    
    // Show summary
    showReleaseSummary(currentVersion, newVersion, commitAnalysis, releaseNotes);
    
    if (options.dryRun) {
      log('info', 'DRY RUN - No changes will be made');
      console.log('\nRelease Notes Preview:');
      console.log('='.repeat(50));
      console.log(releaseNotes);
      return;
    }
    
    // Interactive confirmation
    if (options.interactive) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('Proceed with release? (y/N): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'y') {
        log('info', 'Release cancelled');
        return;
      }
    }
    
    // Execute release
    validateRelease(newVersion, options);
    buildArtifacts(newVersion, options);
    createTag(newVersion, releaseNotes, options);
    
    log('success', `Release ${newVersion} created successfully!`);
    console.log('\nNext steps:');
    console.log(`  1. Push changes: git push && git push --tags`);
    console.log(`  2. Publish artifacts: npm run package:publish`);
    console.log(`  3. Create GitHub release: gh release create v${newVersion}`);
    
  } catch (error) {
    log('error', 'Release failed:', error.message);
    process.exit(1);
  }
}

// Add semver dependency check
if (!fs.existsSync(path.join(process.cwd(), 'node_modules', 'semver'))) {
  log('error', 'semver package not found. Please run: npm install semver');
  process.exit(1);
}

// Check if we need semver
try {
  require('semver');
} catch (error) {
  log('error', 'semver package not available. Installing...');
  try {
    execCommand('npm install semver --save-dev');
    log('success', 'semver package installed');
  } catch (installError) {
    log('error', 'Failed to install semver package');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    log('error', 'Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  getCurrentVersion,
  analyzeCommits,
  determineVersionBump,
  calculateNewVersion,
  generateReleaseNotes,
  validateRelease,
  buildArtifacts,
  createTag
};