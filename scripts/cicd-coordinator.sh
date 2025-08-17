#!/bin/bash

# cicd-coordinator.sh - CI/CD Pipeline Coordination Script
# 
# Provides unified interface for managing CI/CD workflows and coordination
# between different build and deployment processes.

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
COMMAND=""
VERBOSE=false
DRY_RUN=false
FORCE=false

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo -e "${YELLOW}[VERBOSE]${NC} $1"
  fi
}

# Show help
show_help() {
  cat << EOF
CI/CD Coordinator - Unified CI/CD Pipeline Management

USAGE:
  $0 COMMAND [OPTIONS]

COMMANDS:
  status           Show CI/CD pipeline status
  validate         Validate CI/CD configuration
  build            Trigger build workflow
  release          Trigger release workflow
  version          Manage version bumping
  artifacts        Manage build artifacts
  monitoring       Show CI/CD monitoring information
  setup            Setup CI/CD environment
  cleanup          Cleanup CI/CD artifacts

VERSION COMMANDS:
  version patch    Bump patch version (1.0.0 -> 1.0.1)
  version minor    Bump minor version (1.0.0 -> 1.1.0)
  version major    Bump major version (1.0.0 -> 2.0.0)
  version auto     Auto-detect version bump based on commits

BUILD COMMANDS:
  build npm        Build npm package only
  build docker     Build Docker images only
  build all        Build all artifacts

RELEASE COMMANDS:
  release prepare  Prepare release artifacts
  release create   Create GitHub release
  release publish  Publish to registries

OPTIONS:
  --verbose, -v    Enable verbose output
  --dry-run        Show what would be done without executing
  --force          Force operation (bypass safety checks)
  --help, -h       Show this help message

EXAMPLES:
  $0 status                    # Show pipeline status
  $0 version patch             # Bump patch version
  $0 build all --verbose       # Build all artifacts with verbose output
  $0 release prepare --dry-run # Prepare release in dry-run mode
  $0 validate                  # Validate CI/CD configuration

ENVIRONMENT VARIABLES:
  GITHUB_TOKEN     GitHub personal access token
  NPM_TOKEN        npm registry token
  DOCKER_REGISTRY  Docker registry URL
  CI_ENVIRONMENT   CI environment (github, local)

For more information, visit:
https://github.com/your-username/personal-pipeline-mcp
EOF
}

# Parse command line arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      status|validate|build|release|version|artifacts|monitoring|setup|cleanup)
        COMMAND="$1"
        shift
        # Handle subcommands
        case $1 in
          npm|docker|all|patch|minor|major|auto|prepare|create|publish)
            COMMAND="$COMMAND:$1"
            shift
            ;;
          *)
            # No subcommand, continue with options
            ;;
        esac
        ;;
      --verbose|-v)
        VERBOSE=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --force)
        FORCE=true
        shift
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
    esac
  done

  if [[ -z "$COMMAND" ]]; then
    log_error "No command specified"
    show_help
    exit 1
  fi
}

# Check dependencies
check_dependencies() {
  local missing_deps=()
  
  # Check for required tools
  for tool in git node npm jq curl; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      missing_deps+=("$tool")
    fi
  done
  
  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    log_error "Missing required dependencies: ${missing_deps[*]}"
    log_info "Please install the missing tools and try again"
    exit 1
  fi
  
  log_verbose "All dependencies are available"
}

# Get current project status
get_project_status() {
  cd "$PROJECT_ROOT"
  
  local version=$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version)" 2>/dev/null || echo "unknown")
  local branch=$(git branch --show-current 2>/dev/null || echo "unknown")
  local commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  local uncommitted=$(git status --porcelain 2>/dev/null | wc -l)
  
  echo "version:$version,branch:$branch,commit:$commit,uncommitted:$uncommitted"
}

# Show CI/CD status
show_status() {
  log_info "CI/CD Pipeline Status"
  echo "====================="
  
  cd "$PROJECT_ROOT"
  
  # Project information
  local status_info=$(get_project_status)
  local version=$(echo "$status_info" | cut -d, -f1 | cut -d: -f2)
  local branch=$(echo "$status_info" | cut -d, -f2 | cut -d: -f2)
  local commit=$(echo "$status_info" | cut -d, -f3 | cut -d: -f2)
  local uncommitted=$(echo "$status_info" | cut -d, -f4 | cut -d: -f2)
  
  echo "📦 Project: Personal Pipeline MCP Server"
  echo "📝 Version: $version"
  echo "🌿 Branch: $branch"
  echo "📋 Commit: $commit"
  echo "📊 Uncommitted changes: $uncommitted"
  echo ""
  
  # CI/CD Configuration
  echo "🔧 CI/CD Configuration:"
  echo "   Workflows: $(find .github/workflows -name "*.yml" | wc -l) files"
  echo "   Scripts: $(find scripts -name "*.sh" | wc -l) shell scripts"
  echo ""
  
  # Recent workflow runs (if GitHub CLI is available)
  if command -v gh >/dev/null 2>&1; then
    echo "🏃 Recent Workflow Runs:"
    gh run list --limit 5 --json conclusion,displayTitle,createdAt | jq -r '.[] | "   \(.displayTitle): \(.conclusion) (\(.createdAt))"' || echo "   Unable to fetch workflow runs"
  else
    echo "🏃 Recent Workflow Runs: (Install GitHub CLI for details)"
  fi
  echo ""
  
  # Artifact status
  echo "📦 Artifacts:"
  if [[ -d "dist" ]]; then
    echo "   npm build: ✅ Available ($(du -sh dist | cut -f1))"
  else
    echo "   npm build: ❌ Not available"
  fi
  
  if docker images | grep -q "personal-pipeline"; then
    echo "   Docker images: ✅ Available"
  else
    echo "   Docker images: ❌ Not available"
  fi
}

# Validate CI/CD configuration
validate_config() {
  log_info "Validating CI/CD configuration..."
  
  local validation_errors=()
  
  cd "$PROJECT_ROOT"
  
  # Check required files
  local required_files=(
    ".github/workflows/ci.yml"
    ".github/workflows/build.yml"
    ".github/workflows/release.yml"
    ".github/workflows/version.yml"
    "scripts/build-package.sh"
    "scripts/version.sh"
    "package.json"
    "Dockerfile"
  )
  
  for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
      validation_errors+=("Missing required file: $file")
    else
      log_verbose "✅ Found: $file"
    fi
  done
  
  # Validate package.json
  if [[ -f "package.json" ]]; then
    if ! jq empty package.json 2>/dev/null; then
      validation_errors+=("Invalid JSON in package.json")
    else
      # Check required fields
      local required_fields=("name" "version" "scripts")
      for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" package.json >/dev/null 2>&1; then
          validation_errors+=("Missing required field in package.json: $field")
        fi
      done
    fi
  fi
  
  # Validate workflow files
  for workflow in .github/workflows/*.yml; do
    if [[ -f "$workflow" ]]; then
      # Basic YAML syntax check
      if ! python3 -c "import yaml; yaml.safe_load(open('$workflow'))" 2>/dev/null; then
        validation_errors+=("Invalid YAML syntax in $workflow")
      else
        log_verbose "✅ Valid YAML: $workflow"
      fi
    fi
  done
  
  # Check script permissions
  for script in scripts/*.sh; do
    if [[ -f "$script" && ! -x "$script" ]]; then
      validation_errors+=("Script not executable: $script")
    fi
  done
  
  # Report validation results
  if [[ ${#validation_errors[@]} -eq 0 ]]; then
    log_success "CI/CD configuration is valid"
    return 0
  else
    log_error "CI/CD configuration has issues:"
    for error in "${validation_errors[@]}"; do
      echo "   ❌ $error"
    done
    return 1
  fi
}

# Trigger build workflow
trigger_build() {
  local build_type="$1"
  
  log_info "Triggering $build_type build..."
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would trigger $build_type build workflow"
    return 0
  fi
  
  case "$build_type" in
    npm)
      bash scripts/build-package.sh --production --verbose
      ;;
    docker)
      if command -v docker >/dev/null 2>&1; then
        docker build -t personal-pipeline/mcp-server:local .
      else
        log_error "Docker not available"
        return 1
      fi
      ;;
    all)
      bash scripts/build-package.sh --production --verbose
      if command -v docker >/dev/null 2>&1; then
        docker build -t personal-pipeline/mcp-server:local .
      fi
      ;;
    *)
      log_error "Unknown build type: $build_type"
      return 1
      ;;
  esac
  
  log_success "$build_type build completed"
}

# Manage version bumping
manage_version() {
  local version_type="$1"
  
  log_info "Managing version: $version_type"
  
  local version_args=("$version_type")
  
  if [[ "$DRY_RUN" == "true" ]]; then
    version_args+=("--dry-run")
  fi
  
  if [[ "$FORCE" == "true" ]]; then
    version_args+=("--force")
  fi
  
  if [[ "$VERBOSE" == "true" ]]; then
    version_args+=("--verbose")
  fi
  
  bash scripts/version.sh "${version_args[@]}"
}

# Setup CI/CD environment
setup_cicd() {
  log_info "Setting up CI/CD environment..."
  
  cd "$PROJECT_ROOT"
  
  # Install dependencies
  if [[ ! -d "node_modules" ]]; then
    log_info "Installing npm dependencies..."
    npm ci
  fi
  
  # Make scripts executable
  find scripts -name "*.sh" -exec chmod +x {} \;
  
  # Create necessary directories
  mkdir -p .github/workflows
  mkdir -p dist
  mkdir -p test-data
  
  # Validate configuration
  if validate_config; then
    log_success "CI/CD environment setup completed"
  else
    log_error "CI/CD environment setup failed validation"
    return 1
  fi
}

# Cleanup CI/CD artifacts
cleanup_cicd() {
  log_info "Cleaning up CI/CD artifacts..."
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would clean up build artifacts and temporary files"
    return 0
  fi
  
  cd "$PROJECT_ROOT"
  
  # Clean build artifacts
  rm -rf dist/ lib/ bin/
  
  # Clean temporary files
  find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
  find . -name ".DS_Store" -delete 2>/dev/null || true
  
  # Clean Docker images if requested
  if [[ "$FORCE" == "true" ]]; then
    if command -v docker >/dev/null 2>&1; then
      docker images | grep "personal-pipeline" | awk '{print $3}' | xargs -r docker rmi || true
    fi
  fi
  
  log_success "Cleanup completed"
}

# Show monitoring information
show_monitoring() {
  log_info "CI/CD Monitoring Information"
  echo "==========================="
  
  # Workflow status
  if command -v gh >/dev/null 2>&1; then
    echo "📊 Workflow Statistics:"
    gh run list --json conclusion,workflowName | jq -r 'group_by(.workflowName) | .[] | "\(.length) runs: \(.[0].workflowName)"'
    echo ""
  fi
  
  # Build artifacts
  echo "📦 Build Artifacts:"
  if [[ -d "dist" ]]; then
    echo "   Size: $(du -sh dist | cut -f1)"
    echo "   Files: $(find dist -type f | wc -l)"
  fi
  echo ""
  
  # Performance metrics
  echo "⚡ Performance Metrics:"
  if [[ -f "BUILD_SUMMARY.md" ]]; then
    grep -E "(Build Time|Package Size)" BUILD_SUMMARY.md || echo "   No performance data available"
  else
    echo "   No build summary available"
  fi
}

# Main execution function
main() {
  log_verbose "Starting CI/CD coordinator..."
  log_verbose "Command: $COMMAND"
  log_verbose "Dry run: $DRY_RUN"
  log_verbose "Force: $FORCE"
  
  check_dependencies
  
  case "$COMMAND" in
    status)
      show_status
      ;;
    validate)
      validate_config
      ;;
    build:npm|build:docker|build:all)
      trigger_build "${COMMAND#build:}"
      ;;
    build)
      trigger_build "all"
      ;;
    version:patch|version:minor|version:major|version:auto)
      manage_version "${COMMAND#version:}"
      ;;
    version)
      manage_version "auto"
      ;;
    setup)
      setup_cicd
      ;;
    cleanup)
      cleanup_cicd
      ;;
    monitoring)
      show_monitoring
      ;;
    release:*)
      log_warning "Release commands require GitHub Actions workflow"
      log_info "Use 'gh workflow run release.yml' to trigger releases"
      ;;
    artifacts)
      log_info "Use 'gh run download' to download workflow artifacts"
      ;;
    *)
      log_error "Unknown command: $COMMAND"
      show_help
      exit 1
      ;;
  esac
}

# Parse arguments and run
parse_args "$@"
main "$@"