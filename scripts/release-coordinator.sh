#!/bin/bash

# Release Coordinator for Personal Pipeline MCP Server
# Authored by: DevOps Infrastructure Engineer
# Date: 2025-01-17
#
# Professional release coordination system:
# - Orchestrates semantic versioning, artifact building, and GitHub releases
# - Provides quality gates and validation throughout the process
# - Supports stable releases, pre-releases, release candidates, and hotfixes
# - Includes rollback capabilities and recovery procedures

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PACKAGE_JSON="${PROJECT_ROOT}/package.json"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Default configuration
RELEASE_TYPE="auto"
DRY_RUN=false
FORCE=false
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_GITHUB=false
VERBOSE=false
INTERACTIVE=false
PUBLISH_NPM=false
PUBLISH_DOCKER=false

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_header() {
    echo -e "\n${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' $(seq 1 ${#1}))${NC}\n"
}

log_step() {
    echo -e "${MAGENTA}▶${NC} $1"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

# Usage information
show_usage() {
    cat << EOF
${CYAN}Personal Pipeline Release Coordinator${NC}

Comprehensive release management system with semantic versioning,
artifact building, and GitHub release creation.

Usage: $0 [release-type] [options]

Release Types:
    auto                Automatically determine version from commits (default)
    patch               Create patch release (0.0.X)
    minor               Create minor release (0.X.0)
    major               Create major release (X.0.0)
    prerelease          Create pre-release version
    rc                  Create release candidate
    hotfix              Create hotfix release
    
Options:
    --dry-run           Show what would be done without making changes
    --force             Force operation even if checks fail
    --skip-tests        Skip test execution
    --skip-build        Skip artifact building
    --skip-github       Skip GitHub release creation
    --publish-npm       Publish to npm registry
    --publish-docker    Push Docker images to registry
    --interactive       Interactive mode with prompts
    --verbose           Enable verbose output
    --help, -h          Show this help message

Examples:
    $0 auto                                    # Auto-determine version
    $0 minor --dry-run                         # Preview minor release
    $0 patch --publish-npm --publish-docker    # Create and publish patch
    $0 prerelease --interactive                # Interactive pre-release
    $0 hotfix --force                          # Force hotfix release

Environment Variables:
    GITHUB_TOKEN        GitHub personal access token
    NPM_TOKEN          npm registry authentication token
    DOCKER_REGISTRY    Docker registry URL (default: ghcr.io)

EOF
}

# Parse command line arguments
parse_arguments() {
    if [[ $# -eq 0 ]]; then
        RELEASE_TYPE="auto"
        return
    fi

    # First argument might be release type
    case "$1" in
        auto|patch|minor|major|prerelease|rc|hotfix)
            RELEASE_TYPE="$1"
            shift
            ;;
    esac

    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-github)
                SKIP_GITHUB=true
                shift
                ;;
            --publish-npm)
                PUBLISH_NPM=true
                shift
                ;;
            --publish-docker)
                PUBLISH_DOCKER=true
                shift
                ;;
            --interactive)
                INTERACTIVE=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Get package information
get_package_info() {
    PACKAGE_NAME=$(node -p "require('$PACKAGE_JSON').name" 2>/dev/null || echo "unknown")
    CURRENT_VERSION=$(node -p "require('$PACKAGE_JSON').version" 2>/dev/null || echo "0.0.0")
    
    log_debug "Package: $PACKAGE_NAME"
    log_debug "Current version: $CURRENT_VERSION"
}

# Validate environment
validate_environment() {
    log_header "Environment Validation"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi
    
    # Check for required tools
    local required_tools=("node" "npm" "git")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version)
    log_debug "Node.js version: $node_version"
    
    # Check npm version
    local npm_version=$(npm --version)
    log_debug "npm version: $npm_version"
    
    # Check git status
    if [[ -n "$(git status --porcelain)" ]] && [[ "$FORCE" != "true" ]]; then
        log_error "Uncommitted changes detected"
        log_info "Commit or stash changes before creating a release"
        log_info "Use --force to override this check"
        exit 1
    fi
    
    # Check current branch
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    log_debug "Current branch: $current_branch"
    
    if [[ "$current_branch" != "main" ]] && [[ "$current_branch" != "master" ]] && [[ "$FORCE" != "true" ]]; then
        log_warning "Not on main/master branch (current: $current_branch)"
        if [[ "$INTERACTIVE" == "true" ]]; then
            read -p "Continue with release from $current_branch? (y/N): " confirm
            if [[ "$confirm" != [yY] ]]; then
                exit 1
            fi
        fi
    fi
    
    # Validate GitHub token if GitHub release is enabled
    if [[ "$SKIP_GITHUB" != "true" ]] && [[ -z "${GITHUB_TOKEN:-}" ]]; then
        log_error "GITHUB_TOKEN environment variable is required for GitHub releases"
        log_info "Set GITHUB_TOKEN or use --skip-github to skip GitHub release creation"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Pre-flight checks
preflight_checks() {
    log_header "Pre-flight Checks"
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    log_step "Installing dependencies..."
    npm ci --silent
    
    # Run tests
    if [[ "$SKIP_TESTS" != "true" ]]; then
        log_step "Running test suite..."
        if ! npm test; then
            log_error "Tests failed"
            exit 1
        fi
        log_success "All tests passed"
    fi
    
    # Run linting
    log_step "Running code quality checks..."
    if ! npm run lint --silent; then
        log_error "Linting failed"
        exit 1
    fi
    
    # Type checking
    if ! npm run typecheck --silent; then
        log_error "Type checking failed"
        exit 1
    fi
    
    log_success "Pre-flight checks completed"
}

# Create semantic release
create_semantic_release() {
    log_header "Creating Semantic Release"
    
    cd "$PROJECT_ROOT"
    
    local semantic_args="$RELEASE_TYPE"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        semantic_args="$semantic_args --dry-run"
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        semantic_args="$semantic_args --verbose"
    fi
    
    if [[ "$INTERACTIVE" == "true" ]]; then
        semantic_args="$semantic_args --interactive"
    fi
    
    if [[ "$FORCE" == "true" ]]; then
        semantic_args="$semantic_args --allow-dirty"
    fi
    
    log_step "Running semantic release..."
    if ! node scripts/semantic-release.js $semantic_args; then
        log_error "Semantic release failed"
        exit 1
    fi
    
    # Get the new version
    NEW_VERSION=$(node -p "require('$PACKAGE_JSON').version" 2>/dev/null || echo "$CURRENT_VERSION")
    NEW_TAG="v$NEW_VERSION"
    
    log_success "Semantic release completed: $NEW_VERSION"
}

# Build release artifacts
build_artifacts() {
    log_header "Building Release Artifacts"
    
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_info "Skipping artifact build"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Clean and build
    log_step "Building project..."
    npm run clean
    if ! npm run build; then
        log_error "Build failed"
        exit 1
    fi
    
    # Create npm package
    log_step "Creating npm package..."
    if ! npm pack; then
        log_error "npm package creation failed"
        exit 1
    fi
    
    # Build Docker image
    if command -v docker >/dev/null 2>&1; then
        log_step "Building Docker image..."
        if ! docker build -t "personal-pipeline/mcp-server:$NEW_VERSION" .; then
            log_error "Docker build failed"
            exit 1
        fi
        
        # Tag as latest for stable releases
        if [[ "$NEW_VERSION" != *"-"* ]]; then
            docker tag "personal-pipeline/mcp-server:$NEW_VERSION" "personal-pipeline/mcp-server:latest"
        fi
    else
        log_warning "Docker not available, skipping Docker image build"
    fi
    
    log_success "All artifacts built successfully"
}

# Create GitHub release
create_github_release() {
    log_header "Creating GitHub Release"
    
    if [[ "$SKIP_GITHUB" == "true" ]]; then
        log_info "Skipping GitHub release creation"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    local github_args="$NEW_TAG"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        github_args="$github_args --dry-run"
    fi
    
    if [[ "$VERBOSE" == "true" ]]; then
        github_args="$github_args --verbose"
    fi
    
    if [[ "$FORCE" == "true" ]]; then
        github_args="$github_args --force"
    fi
    
    log_step "Creating GitHub release..."
    if ! node scripts/github-release.js $github_args; then
        log_error "GitHub release creation failed"
        exit 1
    fi
    
    log_success "GitHub release created successfully"
}

# Publish to registries
publish_artifacts() {
    log_header "Publishing Artifacts"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Skipping artifact publishing"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Publish npm package
    if [[ "$PUBLISH_NPM" == "true" ]]; then
        log_step "Publishing npm package..."
        
        if [[ -z "${NPM_TOKEN:-}" ]]; then
            log_error "NPM_TOKEN environment variable is required for npm publishing"
            exit 1
        fi
        
        # Set npm registry authentication
        echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
        
        local npm_tag="latest"
        if [[ "$NEW_VERSION" == *"-"* ]]; then
            npm_tag="beta"
        fi
        
        if ! npm publish --tag "$npm_tag"; then
            log_error "npm publishing failed"
            exit 1
        fi
        
        log_success "npm package published to $npm_tag tag"
    fi
    
    # Push Docker images
    if [[ "$PUBLISH_DOCKER" == "true" ]]; then
        log_step "Publishing Docker images..."
        
        local registry="${DOCKER_REGISTRY:-ghcr.io}"
        local image_name="$registry/personal-pipeline/mcp-server"
        
        # Tag for registry
        docker tag "personal-pipeline/mcp-server:$NEW_VERSION" "$image_name:$NEW_VERSION"
        
        # Push version tag
        if ! docker push "$image_name:$NEW_VERSION"; then
            log_error "Docker image push failed"
            exit 1
        fi
        
        # Push latest tag for stable releases
        if [[ "$NEW_VERSION" != *"-"* ]]; then
            docker tag "personal-pipeline/mcp-server:latest" "$image_name:latest"
            docker push "$image_name:latest"
        fi
        
        log_success "Docker images published to $registry"
    fi
}

# Show release summary
show_release_summary() {
    log_header "Release Summary"
    
    echo "📦 Package: $PACKAGE_NAME"
    echo "📌 Previous Version: $CURRENT_VERSION"
    echo "🎯 New Version: $NEW_VERSION"
    echo "🏷️  Git Tag: $NEW_TAG"
    echo "🔄 Release Type: $RELEASE_TYPE"
    echo "🔧 Mode: $([ "$DRY_RUN" = "true" ] && echo "DRY RUN" || echo "LIVE")"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        echo ""
        echo "🔗 Links:"
        echo "  - GitHub Release: https://github.com/personal-pipeline/personal-pipeline-mcp/releases/tag/$NEW_TAG"
        if [[ "$PUBLISH_NPM" == "true" ]]; then
            echo "  - npm Package: https://www.npmjs.com/package/$PACKAGE_NAME"
        fi
        if [[ "$PUBLISH_DOCKER" == "true" ]]; then
            echo "  - Docker Image: ${DOCKER_REGISTRY:-ghcr.io}/personal-pipeline/mcp-server:$NEW_VERSION"
        fi
        
        echo ""
        echo "✅ Release completed successfully!"
        echo ""
        echo "Next steps:"
        echo "  1. Verify the release: npm info $PACKAGE_NAME@$NEW_VERSION"
        echo "  2. Test the Docker image: docker run --rm ${DOCKER_REGISTRY:-ghcr.io}/personal-pipeline/mcp-server:$NEW_VERSION npm run health"
        echo "  3. Update deployment environments"
        echo "  4. Announce the release"
    else
        echo ""
        echo "ℹ️  This was a dry run - no changes were made"
    fi
}

# Error handling and cleanup
cleanup() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Release process failed with exit code $exit_code"
        
        # Clean up temporary files
        cd "$PROJECT_ROOT"
        rm -f *.tgz 2>/dev/null || true
        rm -f documentation-bundle.zip 2>/dev/null || true
        rm -f configuration-templates.zip 2>/dev/null || true
        rm -f installation-scripts.zip 2>/dev/null || true
        
        echo ""
        echo "🔧 Troubleshooting:"
        echo "  1. Check the error messages above"
        echo "  2. Verify environment setup (tokens, permissions)"
        echo "  3. Run with --verbose for more details"
        echo "  4. Use --dry-run to preview changes"
        echo "  5. Check git status and branch"
    fi
    
    exit $exit_code
}

# Set up error handling
trap cleanup EXIT

# Interactive confirmation
confirm_release() {
    if [[ "$INTERACTIVE" == "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
        echo ""
        echo "📋 Release Configuration:"
        echo "  Package: $PACKAGE_NAME"
        echo "  Current Version: $CURRENT_VERSION"
        echo "  Release Type: $RELEASE_TYPE"
        echo "  Publish npm: $PUBLISH_NPM"
        echo "  Publish Docker: $PUBLISH_DOCKER"
        echo ""
        
        read -p "Proceed with release? (y/N): " confirm
        if [[ "$confirm" != [yY] ]]; then
            log_info "Release cancelled by user"
            exit 0
        fi
    fi
}

# Main execution
main() {
    log_header "Personal Pipeline Release Coordinator"
    
    # Parse arguments
    parse_arguments "$@"
    
    # Get package information
    get_package_info
    
    # Show configuration in verbose mode
    if [[ "$VERBOSE" == "true" ]]; then
        log_debug "Configuration:"
        log_debug "  Release Type: $RELEASE_TYPE"
        log_debug "  Dry Run: $DRY_RUN"
        log_debug "  Force: $FORCE"
        log_debug "  Skip Tests: $SKIP_TESTS"
        log_debug "  Skip Build: $SKIP_BUILD"
        log_debug "  Skip GitHub: $SKIP_GITHUB"
        log_debug "  Publish npm: $PUBLISH_NPM"
        log_debug "  Publish Docker: $PUBLISH_DOCKER"
        log_debug "  Interactive: $INTERACTIVE"
    fi
    
    # Validate environment
    validate_environment
    
    # Interactive confirmation
    confirm_release
    
    # Execute release process
    preflight_checks
    create_semantic_release
    build_artifacts
    create_github_release
    publish_artifacts
    
    # Show summary
    show_release_summary
}

# Execute main function
main "$@"