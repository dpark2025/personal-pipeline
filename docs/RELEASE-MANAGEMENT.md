# Release Management Guide

Professional release automation system for Personal Pipeline MCP Server with semantic versioning, comprehensive artifact management, and quality gates.

## Overview

The Personal Pipeline release system provides enterprise-grade release automation with:

- **Semantic Versioning**: Automated version bumping based on conventional commits
- **Quality Gates**: Comprehensive validation before releases
- **Artifact Management**: npm packages, Docker images, and documentation bundles
- **GitHub Integration**: Automated GitHub releases with professional notes
- **Multi-Registry Support**: npm, Docker, and private registry publishing
- **Rollback Capabilities**: Recovery procedures and version rollback

## Quick Start

### 1. Basic Release (Recommended)

```bash
# Automatic version determination from commits
npm run release:auto

# Preview what would happen
npm run release:dry-run

# Interactive release with prompts
npm run release:interactive
```

### 2. Specific Version Types

```bash
# Patch release (0.0.X) - Bug fixes
npm run release:patch

# Minor release (0.X.0) - New features
npm run release:minor

# Major release (X.0.0) - Breaking changes
npm run release:major

# Pre-release version
npm run release:prerelease

# Release candidate
npm run release:rc

# Hotfix release
npm run release:hotfix
```

### 3. GitHub Releases

```bash
# Create GitHub release from current tag
npm run release:github

# Preview GitHub release
npm run release:github:dry-run
```

## Release Types

### Automatic Version Detection

The system analyzes commit messages using conventional commit format to automatically determine the appropriate version bump:

- **feat**: New features → Minor version bump
- **fix**: Bug fixes → Patch version bump
- **BREAKING CHANGE**: Breaking changes → Major version bump
- **perf**: Performance improvements → Patch version bump
- **refactor**: Code refactoring → Patch version bump

### Manual Version Control

You can override automatic detection:

```bash
# Force specific version type
./scripts/release-coordinator.sh patch
./scripts/release-coordinator.sh minor --publish-npm
./scripts/release-coordinator.sh major --publish-docker
```

### Pre-release and Release Candidates

```bash
# Create pre-release (1.0.0 → 1.0.1-beta.0)
npm run release:prerelease

# Create release candidate (1.0.0 → 1.0.1-rc.0)
npm run release:rc

# Publish to beta tag on npm
./scripts/release-coordinator.sh prerelease --publish-npm
```

## Artifacts and Publishing

### Available Artifacts

Each release creates the following artifacts:

1. **npm Package** (`*.tgz`)
   - Optimized for production use
   - Includes TypeScript definitions
   - CLI binaries included

2. **Docker Images**
   - Multi-architecture (linux/amd64, linux/arm64)
   - Alpine-based for minimal size
   - Health checks included

3. **Documentation Bundle** (`documentation-bundle.zip`)
   - Complete API documentation
   - README, CHANGELOG, LICENSE
   - Configuration examples

4. **Configuration Templates** (`configuration-templates.zip`)
   - Sample YAML configurations
   - Environment-specific templates
   - Deployment configurations

5. **Installation Scripts** (`installation-scripts.zip`)
   - Setup and deployment scripts
   - Registry configuration tools
   - Health check utilities

### Publishing Options

```bash
# Publish to npm registry
./scripts/release-coordinator.sh auto --publish-npm

# Publish Docker images
./scripts/release-coordinator.sh auto --publish-docker

# Publish to both npm and Docker
./scripts/release-coordinator.sh auto --publish-npm --publish-docker
```

### Registry Configuration

Set environment variables for publishing:

```bash
# npm publishing
export NPM_TOKEN="your-npm-token"

# Docker publishing
export DOCKER_REGISTRY="ghcr.io"  # Default: GitHub Container Registry

# GitHub releases
export GITHUB_TOKEN="your-github-token"
```

## Quality Gates

### Validation Phases

Every release goes through comprehensive validation:

1. **Environment Validation**
   - Node.js version compatibility
   - Git repository status
   - Required files presence

2. **Code Quality**
   - ESLint and Prettier checks
   - TypeScript type checking
   - Test suite execution
   - Code coverage analysis

3. **Security Validation**
   - npm audit for vulnerabilities
   - Docker image security scanning
   - Dependency vulnerability assessment

4. **Build Validation**
   - Clean build process
   - Artifact creation
   - Package integrity checks

5. **Compatibility Testing**
   - Module import validation
   - Engine compatibility checks
   - Runtime environment testing

### Running Validation Manually

```bash
# Full validation suite
node scripts/release-validation.js

# Specific validation categories
node scripts/release-validation.js quality
node scripts/release-validation.js security
node scripts/release-validation.js artifacts

# Save validation report
node scripts/release-validation.js --output validation-report.json
```

### Quality Thresholds

The system enforces these quality standards:

- **Test Coverage**: ≥80%
- **Build Time**: ≤120 seconds
- **Package Size**: ≤50MB
- **Docker Image Size**: ≤500MB
- **Security Score**: ≥8.0/10
- **Overall Quality Score**: ≥7.0/10

## GitHub Actions Integration

### Automated Releases

The enhanced GitHub Actions workflow (`enhanced-release.yml`) provides:

- **Tag-triggered releases**: Automatic releases when version tags are pushed
- **Manual releases**: Workflow dispatch with comprehensive options
- **Security validation**: Automated security scanning
- **Multi-platform builds**: Docker images for multiple architectures

### Workflow Triggers

```yaml
# Automatic on version tags
git tag v1.2.3
git push origin --tags

# Manual via GitHub Actions UI
# - Choose release type
# - Enable/disable publishing
# - Set dry-run mode
# - Override quality checks
```

### Workflow Configuration

```yaml
# Example workflow dispatch
inputs:
  release_type: 'minor'
  create_github_release: true
  publish_npm: true
  publish_docker: true
  dry_run: false
```

## Command Reference

### Core Release Commands

| Command | Description | Example |
|---------|-------------|---------|
| `release:auto` | Automatic version from commits | `npm run release:auto` |
| `release:patch` | Patch version release | `npm run release:patch` |
| `release:minor` | Minor version release | `npm run release:minor` |
| `release:major` | Major version release | `npm run release:major` |
| `release:prerelease` | Pre-release version | `npm run release:prerelease` |
| `release:rc` | Release candidate | `npm run release:rc` |
| `release:hotfix` | Hotfix release | `npm run release:hotfix` |

### Utility Commands

| Command | Description | Example |
|---------|-------------|---------|
| `release:dry-run` | Preview release changes | `npm run release:dry-run` |
| `release:interactive` | Interactive release mode | `npm run release:interactive` |
| `release:semantic` | Semantic versioning only | `npm run release:semantic` |
| `release:github` | Create GitHub release | `npm run release:github` |

### Advanced Options

```bash
# Release coordinator with all options
./scripts/release-coordinator.sh [type] [options]

Options:
  --dry-run              Preview mode
  --force                Override checks
  --skip-tests           Skip test execution
  --skip-build           Skip artifact building
  --skip-github          Skip GitHub release
  --publish-npm          Publish to npm
  --publish-docker       Publish Docker images
  --interactive          Interactive prompts
  --verbose              Detailed output
```

## Conventional Commits

### Commit Message Format

Use conventional commit format for automatic version detection:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Examples

```bash
# Features (minor version bump)
git commit -m "feat: add new MCP tool for document search"
git commit -m "feat(api): implement REST endpoints for runbook management"

# Bug fixes (patch version bump)
git commit -m "fix: resolve memory leak in cache adapter"
git commit -m "fix(docker): correct environment variable handling"

# Breaking changes (major version bump)
git commit -m "feat!: redesign API with new authentication system"
git commit -m "fix: remove deprecated endpoint

BREAKING CHANGE: The /v1/legacy endpoint has been removed"

# Other types (patch version bump)
git commit -m "perf: optimize database query performance"
git commit -m "refactor: simplify adapter configuration logic"
git commit -m "docs: update API documentation"
git commit -m "chore: update dependencies"
```

### Type Reference

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | Minor |
| `fix` | Bug fix | Patch |
| `perf` | Performance improvement | Patch |
| `refactor` | Code refactoring | Patch |
| `docs` | Documentation only | Patch |
| `chore` | Maintenance tasks | Patch |
| `test` | Adding/fixing tests | Patch |
| `ci` | CI/CD changes | Patch |
| `BREAKING CHANGE` | Breaking change | Major |
| `!` suffix | Breaking change | Major |

## Rollback Procedures

### Version Rollback

```bash
# Rollback to specific version
./scripts/release-manager.sh rollback 1.2.0

# Emergency rollback with force
./scripts/release-manager.sh rollback 1.2.0 --force
```

### Package Rollback

```bash
# Unpublish from npm (within 24 hours)
npm unpublish @personal-pipeline/mcp-server@1.2.3

# Deprecate package version
npm deprecate @personal-pipeline/mcp-server@1.2.3 "Security issue, use 1.2.4+"
```

### Docker Image Rollback

```bash
# Retag previous version as latest
docker tag ghcr.io/personal-pipeline/mcp-server:1.2.0 ghcr.io/personal-pipeline/mcp-server:latest
docker push ghcr.io/personal-pipeline/mcp-server:latest
```

## Troubleshooting

### Common Issues

#### Release Validation Failures

```bash
# Check specific validation category
node scripts/release-validation.js quality --verbose

# Skip tests for urgent hotfix
./scripts/release-coordinator.sh hotfix --skip-tests --force
```

#### Authentication Issues

```bash
# Verify npm authentication
npm whoami

# Login to npm
npm login

# Verify GitHub token
gh auth status
```

#### Docker Build Issues

```bash
# Clean Docker build cache
docker builder prune

# Check Docker daemon
docker version

# Manual image build
docker build -t test-image .
```

### Debug Mode

```bash
# Enable verbose logging
./scripts/release-coordinator.sh auto --verbose

# Generate detailed validation report
node scripts/release-validation.js --output debug-report.json --verbose
```

### Recovery Procedures

#### Failed Release Recovery

1. **Check Git Status**
   ```bash
   git status
   git log --oneline -10
   ```

2. **Clean Up Artifacts**
   ```bash
   rm -f *.tgz *.zip
   npm run clean
   ```

3. **Reset to Last Good State**
   ```bash
   git reset --hard HEAD~1  # Remove bad commit
   git tag -d v1.2.3        # Remove bad tag
   ```

4. **Retry Release**
   ```bash
   npm run release:auto --force
   ```

## Best Practices

### Development Workflow

1. **Use Conventional Commits**: Always use conventional commit format
2. **Regular Testing**: Run tests locally before commits
3. **Feature Branches**: Use feature branches for major changes
4. **Pull Requests**: Review changes before merging to main
5. **Semantic Versioning**: Let the system determine versions automatically

### Release Workflow

1. **Pre-release Validation**: Always run validation before releases
2. **Dry Run First**: Use dry-run mode to preview changes
3. **Incremental Releases**: Release frequently with small changes
4. **Documentation Updates**: Keep CHANGELOG.md current
5. **Security First**: Never release with critical vulnerabilities

### Production Releases

1. **Use Stable Branch**: Release from main/master branch
2. **Full Validation**: Run complete validation suite
3. **Backup Strategy**: Ensure rollback procedures are tested
4. **Monitoring**: Monitor releases after deployment
5. **Communication**: Announce significant releases to stakeholders

## Configuration

### Environment Variables

```bash
# Required for publishing
export GITHUB_TOKEN="ghp_xxx"
export NPM_TOKEN="npm_xxx"

# Optional customization
export DOCKER_REGISTRY="your-registry.com"
export RELEASE_BRANCH="main"
export NODE_VERSION="18"
```

### Package.json Configuration

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "publishConfig": {
    "registry": "https://registry.npmjs.org",
    "access": "public"
  }
}
```

### GitHub Actions Secrets

Configure these secrets in your GitHub repository:

- `GITHUB_TOKEN`: Automatically provided
- `NPM_TOKEN`: npm registry authentication
- `DOCKER_REGISTRY_TOKEN`: Docker registry authentication (if using custom registry)

## Support and Maintenance

### Monitoring

- Monitor release success rates
- Track artifact download metrics
- Review security scan results
- Monitor build performance

### Updates

- Keep dependencies updated
- Review and update quality thresholds
- Update documentation regularly
- Test rollback procedures periodically

### Support Channels

- GitHub Issues for bug reports
- GitHub Discussions for questions
- Security issues via SECURITY.md
- Team Slack for internal support

---

For additional help, run any script with `--help` flag or refer to the inline documentation in the scripts.