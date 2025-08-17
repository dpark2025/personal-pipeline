#!/usr/bin/env node

/**
 * Version Manager for Personal Pipeline NPM Package
 * Authored by: Backend Technical Lead Agent
 * Date: 2025-01-16
 * 
 * Semantic versioning automation with:
 * - Automated version bumping (patch, minor, major)
 * - Git tag creation and management
 * - Changelog generation and maintenance
 * - Version validation and consistency checks
 * - Release notes generation
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Logger utility with colored output
 */
class Logger {
  static info(message) {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
  }

  static success(message) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
  }

  static warning(message) {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  }

  static error(message) {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
  }

  static header(message) {
    console.log(`\n${colors.cyan}${message}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(message.length)}${colors.reset}\n`);
  }
}

/**
 * Version Manager Class
 */
class VersionManager {
  constructor() {
    this.packageJsonPath = join(projectRoot, 'package.json');
    this.changelogPath = join(projectRoot, 'CHANGELOG.md');
    this.packageJson = this.loadPackageJson();
  }

  /**
   * Load package.json file
   */
  loadPackageJson() {
    try {
      const content = readFileSync(this.packageJsonPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      Logger.error(`Failed to load package.json: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Save package.json file
   */
  savePackageJson() {
    try {
      const content = JSON.stringify(this.packageJson, null, 2) + '\n';
      writeFileSync(this.packageJsonPath, content, 'utf8');
      Logger.success(`Updated package.json to version ${this.packageJson.version}`);
    } catch (error) {
      Logger.error(`Failed to save package.json: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Parse semantic version
   */
  parseVersion(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || null
    };
  }

  /**
   * Format version object to string
   */
  formatVersion(versionObj) {
    let version = `${versionObj.major}.${versionObj.minor}.${versionObj.patch}`;
    if (versionObj.prerelease) {
      version += `-${versionObj.prerelease}`;
    }
    return version;
  }

  /**
   * Bump version based on type
   */
  bumpVersion(type, prerelease = null) {
    const currentVersion = this.parseVersion(this.packageJson.version);
    Logger.info(`Current version: ${this.packageJson.version}`);

    let newVersion;
    switch (type) {
      case 'patch':
        newVersion = {
          major: currentVersion.major,
          minor: currentVersion.minor,
          patch: currentVersion.patch + 1,
          prerelease: prerelease
        };
        break;

      case 'minor':
        newVersion = {
          major: currentVersion.major,
          minor: currentVersion.minor + 1,
          patch: 0,
          prerelease: prerelease
        };
        break;

      case 'major':
        newVersion = {
          major: currentVersion.major + 1,
          minor: 0,
          patch: 0,
          prerelease: prerelease
        };
        break;

      case 'prerelease':
        if (currentVersion.prerelease) {
          // Increment prerelease number
          const prereleaseMatch = currentVersion.prerelease.match(/^(.+)\.(\d+)$/);
          if (prereleaseMatch) {
            const prereleaseType = prereleaseMatch[1];
            const prereleaseNumber = parseInt(prereleaseMatch[2], 10) + 1;
            newVersion = {
              ...currentVersion,
              prerelease: `${prereleaseType}.${prereleaseNumber}`
            };
          } else {
            newVersion = {
              ...currentVersion,
              prerelease: `${currentVersion.prerelease}.1`
            };
          }
        } else {
          // Add prerelease to current version
          newVersion = {
            ...currentVersion,
            prerelease: prerelease || 'alpha.1'
          };
        }
        break;

      default:
        Logger.error(`Unknown version type: ${type}`);
        process.exit(1);
    }

    const newVersionString = this.formatVersion(newVersion);
    Logger.info(`New version: ${newVersionString}`);

    return newVersionString;
  }

  /**
   * Update changelog
   */
  updateChangelog(version) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const changelogEntry = `\n## [${version}] - ${date}\n\n### Added\n- Version ${version} release\n\n### Changed\n- Updated package version to ${version}\n\n### Fixed\n- Minor bug fixes and improvements\n\n`;

      let changelogContent = '';
      if (existsSync(this.changelogPath)) {
        changelogContent = readFileSync(this.changelogPath, 'utf8');
        
        // Insert new entry after the header
        const headerMatch = changelogContent.match(/^(# Changelog.*?\n\n)/s);
        if (headerMatch) {
          changelogContent = headerMatch[1] + changelogEntry + changelogContent.slice(headerMatch[1].length);
        } else {
          changelogContent = changelogEntry + changelogContent;
        }
      } else {
        changelogContent = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\nand this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n${changelogEntry}`;
      }

      writeFileSync(this.changelogPath, changelogContent, 'utf8');
      Logger.success(`Updated CHANGELOG.md for version ${version}`);
    } catch (error) {
      Logger.warning(`Failed to update changelog: ${error.message}`);
    }
  }

  /**
   * Create git tag
   */
  createGitTag(version) {
    try {
      // Check if git repository exists
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });

      // Check for uncommitted changes
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        Logger.warning('There are uncommitted changes in the repository');
        Logger.info('Staging package.json and CHANGELOG.md changes...');
        
        execSync('git add package.json', { stdio: 'inherit' });
        if (existsSync(this.changelogPath)) {
          execSync('git add CHANGELOG.md', { stdio: 'inherit' });
        }
        
        execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
      }

      // Create tag
      execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' });
      Logger.success(`Created git tag: v${version}`);

      // Show tag information
      const tagInfo = execSync(`git show v${version} --no-patch --format="%H %s"`, { encoding: 'utf8' });
      Logger.info(`Tag info: ${tagInfo.trim()}`);

    } catch (error) {
      Logger.warning(`Git operations failed: ${error.message}`);
      Logger.warning('You may need to create the git tag manually');
    }
  }

  /**
   * Validate version
   */
  validateVersion(version) {
    try {
      this.parseVersion(version);
      return true;
    } catch (error) {
      Logger.error(`Version validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Show current version information
   */
  showVersionInfo() {
    Logger.header('Current Version Information');
    Logger.info(`Package name: ${this.packageJson.name}`);
    Logger.info(`Current version: ${this.packageJson.version}`);
    
    const parsed = this.parseVersion(this.packageJson.version);
    Logger.info(`  Major: ${parsed.major}`);
    Logger.info(`  Minor: ${parsed.minor}`);
    Logger.info(`  Patch: ${parsed.patch}`);
    if (parsed.prerelease) {
      Logger.info(`  Prerelease: ${parsed.prerelease}`);
    }

    // Show next possible versions
    Logger.info('\nNext possible versions:');
    Logger.info(`  Patch: ${this.bumpVersion('patch')}`);
    Logger.info(`  Minor: ${this.bumpVersion('minor')}`);
    Logger.info(`  Major: ${this.bumpVersion('major')}`);
    Logger.info(`  Prerelease: ${this.bumpVersion('prerelease')}`);
  }

  /**
   * Execute version bump
   */
  executeVersionBump(type, options = {}) {
    Logger.header(`Bumping ${type} version`);

    const newVersion = this.bumpVersion(type, options.prerelease);
    
    if (!this.validateVersion(newVersion)) {
      process.exit(1);
    }

    // Update package.json
    this.packageJson.version = newVersion;
    this.savePackageJson();

    // Update changelog
    if (!options.skipChangelog) {
      this.updateChangelog(newVersion);
    }

    // Create git tag
    if (!options.skipGitTag) {
      this.createGitTag(newVersion);
    }

    Logger.success(`Successfully bumped version to ${newVersion}`);
    return newVersion;
  }
}

/**
 * Main execution function
 */
function main() {
  const versionManager = new VersionManager();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    versionManager.showVersionInfo();
    return;
  }

  const command = args[0];
  const options = {};

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--skip-changelog') {
      options.skipChangelog = true;
    } else if (arg === '--skip-git-tag') {
      options.skipGitTag = true;
    } else if (arg.startsWith('--prerelease=')) {
      options.prerelease = arg.split('=')[1];
    }
  }

  switch (command) {
    case 'patch':
    case 'minor':
    case 'major':
    case 'prerelease':
      versionManager.executeVersionBump(command, options);
      break;

    case 'info':
      versionManager.showVersionInfo();
      break;

    case '--help':
    case '-h':
      console.log(`
${colors.cyan}Personal Pipeline Version Manager${colors.reset}

Usage: node scripts/version-manager.js [command] [options]

Commands:
  patch                 Bump patch version (0.0.X)
  minor                 Bump minor version (0.X.0)
  major                 Bump major version (X.0.0)
  prerelease            Bump prerelease version (X.Y.Z-alpha.N)
  info                  Show current version information
  --help, -h            Show this help message

Options:
  --skip-changelog      Skip updating CHANGELOG.md
  --skip-git-tag        Skip creating git tag
  --prerelease=TYPE     Set prerelease type (alpha, beta, rc)

Examples:
  node scripts/version-manager.js patch
  node scripts/version-manager.js minor --skip-git-tag
  node scripts/version-manager.js prerelease --prerelease=beta
  node scripts/version-manager.js info
      `);
      break;

    default:
      Logger.error(`Unknown command: ${command}`);
      Logger.info('Use --help for usage information');
      process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { VersionManager };