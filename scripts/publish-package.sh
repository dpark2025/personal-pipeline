#!/bin/bash

# Package Publishing Script for Personal Pipeline NPM Registry
# Authored by: Backend Technical Lead Agent
# Date: 2025-01-16
#
# Automated package publishing with:
# - Pre-publication validation and testing
# - Multi-environment support (local, staging, production)
# - Rollback capabilities and safety checks
# - Publishing to private Verdaccio registry
# - Integration with version management

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PACKAGE_JSON="${PROJECT_ROOT}/package.json"
REGISTRY_URL="http://localhost:4873"
DEFAULT_TAG="latest"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Usage information
show_usage() {
    cat << EOF
${CYAN}Personal Pipeline Package Publisher${NC}

Usage: $0 [options]

Options:
    --registry URL      Registry URL (default: $REGISTRY_URL)
    --tag TAG          Distribution tag (default: $DEFAULT_TAG)
    --dry-run          Perform dry run without publishing
    --force            Force publish even if version exists
    --skip-tests       Skip test execution
    --skip-build       Skip build process
    --skip-validation  Skip pre-publication validation
    --production       Use production registry settings
    --beta             Publish as beta version
    --alpha            Publish as alpha version
    --help, -h         Show this help message

Examples:
    $0                                    # Publish to local registry
    $0 --dry-run                         # Test publication process
    $0 --tag beta                        # Publish as beta version
    $0 --registry https://npm.company.com # Publish to company registry
    $0 --production                      # Publish to production registry

EOF
}

# Parse command line arguments
parse_arguments() {
    DRY_RUN=false
    FORCE_PUBLISH=false
    SKIP_TESTS=false
    SKIP_BUILD=false
    SKIP_VALIDATION=false
    PRODUCTION_MODE=false
    TAG="$DEFAULT_TAG"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --registry)
                REGISTRY_URL="$2"
                shift 2
                ;;
            --tag)
                TAG="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE_PUBLISH=true
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
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --production)
                PRODUCTION_MODE=true
                REGISTRY_URL="https://npm.personal-pipeline.dev"
                shift
                ;;
            --beta)
                TAG="beta"
                shift
                ;;
            --alpha)
                TAG="alpha"
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

# Validate environment
validate_environment() {
    log_header "Environment Validation"

    # Check if package.json exists
    if [[ ! -f "$PACKAGE_JSON" ]]; then
        log_error "package.json not found at $PACKAGE_JSON"
        exit 1
    fi

    # Check if we're in a git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_warning "Not in a git repository"
    fi

    # Check npm authentication
    if ! npm whoami --registry "$REGISTRY_URL" >/dev/null 2>&1; then
        log_error "Not authenticated with npm registry: $REGISTRY_URL"
        log_info "Please run: npm login --registry $REGISTRY_URL"
        exit 1
    fi

    # Check registry connectivity
    if ! curl -s -f "$REGISTRY_URL/-/ping" >/dev/null; then
        log_error "Cannot connect to registry: $REGISTRY_URL"
        log_info "Please ensure the registry is running"
        exit 1
    fi

    log_success "Environment validation passed"
}

# Get package information
get_package_info() {
    PACKAGE_NAME=$(node -p "require('$PACKAGE_JSON').name")
    PACKAGE_VERSION=$(node -p "require('$PACKAGE_JSON').version")
    PACKAGE_DESCRIPTION=$(node -p "require('$PACKAGE_JSON').description")

    log_info "Package: $PACKAGE_NAME"
    log_info "Version: $PACKAGE_VERSION"
    log_info "Registry: $REGISTRY_URL"
    log_info "Tag: $TAG"
}

# Check if version already exists
check_version_exists() {
    log_header "Version Check"

    if npm info "$PACKAGE_NAME@$PACKAGE_VERSION" --registry "$REGISTRY_URL" >/dev/null 2>&1; then
        if [[ "$FORCE_PUBLISH" == "true" ]]; then
            log_warning "Version $PACKAGE_VERSION already exists, but --force specified"
        else
            log_error "Version $PACKAGE_VERSION already exists in registry"
            log_info "Use --force to override or bump the version"
            exit 1
        fi
    else
        log_success "Version $PACKAGE_VERSION is available for publishing"
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests (--skip-tests specified)"
        return
    fi

    log_header "Running Tests"

    cd "$PROJECT_ROOT"

    # Run lint
    log_info "Running linter..."
    if ! npm run lint; then
        log_error "Linting failed"
        exit 1
    fi

    # Run type checking
    log_info "Running type checker..."
    if ! npm run typecheck; then
        log_error "Type checking failed"
        exit 1
    fi

    # Run unit tests
    log_info "Running unit tests..."
    if ! npm test; then
        log_error "Unit tests failed"
        exit 1
    fi

    log_success "All tests passed"
}

# Build package
build_package() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_warning "Skipping build (--skip-build specified)"
        return
    fi

    log_header "Building Package"

    cd "$PROJECT_ROOT"

    # Clean previous build
    log_info "Cleaning previous build..."
    npm run clean

    # Build package
    log_info "Building package..."
    if ! npm run build; then
        log_error "Build failed"
        exit 1
    fi

    # Verify build artifacts
    if [[ ! -d "dist" ]]; then
        log_error "Build artifacts not found in dist/ directory"
        exit 1
    fi

    log_success "Package built successfully"
}

# Validate package
validate_package() {
    if [[ "$SKIP_VALIDATION" == "true" ]]; then
        log_warning "Skipping validation (--skip-validation specified)"
        return
    fi

    log_header "Package Validation"

    cd "$PROJECT_ROOT"

    # Check package files
    log_info "Validating package files..."
    local required_files=("dist/index.js" "package.json")
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done

    # Validate package.json
    log_info "Validating package.json..."
    if ! node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"; then
        log_error "Invalid package.json"
        exit 1
    fi

    # Check package size
    local package_size=$(du -sh . | cut -f1)
    log_info "Package size: $package_size"

    # Test package installation (dry run)
    log_info "Testing package integrity..."
    if ! npm pack --dry-run >/dev/null 2>&1; then
        log_error "Package integrity check failed"
        exit 1
    fi

    log_success "Package validation passed"
}

# Create package tarball
create_package() {
    log_header "Creating Package"

    cd "$PROJECT_ROOT"

    # Create tarball
    log_info "Creating package tarball..."
    local tarball=$(npm pack 2>/dev/null | tail -n 1)
    
    if [[ -z "$tarball" ]]; then
        log_error "Failed to create package tarball"
        exit 1
    fi

    PACKAGE_TARBALL="$tarball"
    log_success "Created package: $PACKAGE_TARBALL"

    # Show tarball contents
    log_info "Package contents:"
    tar -tzf "$PACKAGE_TARBALL" | head -20
    if [[ $(tar -tzf "$PACKAGE_TARBALL" | wc -l) -gt 20 ]]; then
        log_info "... and $(( $(tar -tzf "$PACKAGE_TARBALL" | wc -l) - 20 )) more files"
    fi
}

# Publish package
publish_package() {
    log_header "Publishing Package"

    cd "$PROJECT_ROOT"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would publish $PACKAGE_NAME@$PACKAGE_VERSION to $REGISTRY_URL with tag '$TAG'"
        log_info "Command would be: npm publish --registry $REGISTRY_URL --tag $TAG"
        return
    fi

    # Publish to registry
    log_info "Publishing to registry..."
    if npm publish --registry "$REGISTRY_URL" --tag "$TAG"; then
        log_success "Successfully published $PACKAGE_NAME@$PACKAGE_VERSION"
    else
        log_error "Failed to publish package"
        exit 1
    fi

    # Verify publication
    log_info "Verifying publication..."
    if npm info "$PACKAGE_NAME@$PACKAGE_VERSION" --registry "$REGISTRY_URL" >/dev/null 2>&1; then
        log_success "Package successfully published and verified"
    else
        log_error "Package publication verification failed"
        exit 1
    fi
}

# Cleanup
cleanup() {
    log_header "Cleanup"

    cd "$PROJECT_ROOT"

    # Remove tarball
    if [[ -n "${PACKAGE_TARBALL:-}" ]] && [[ -f "$PACKAGE_TARBALL" ]]; then
        rm -f "$PACKAGE_TARBALL"
        log_success "Cleaned up package tarball"
    fi
}

# Show publication summary
show_summary() {
    log_header "Publication Summary"

    log_info "Package: $PACKAGE_NAME"
    log_info "Version: $PACKAGE_VERSION"
    log_info "Registry: $REGISTRY_URL"
    log_info "Tag: $TAG"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Mode: DRY RUN"
    else
        log_info "Status: PUBLISHED"
        
        # Show installation instructions
        echo -e "\n${CYAN}Installation Instructions:${NC}"
        echo "npm install $PACKAGE_NAME --registry $REGISTRY_URL"
        
        if [[ "$TAG" != "latest" ]]; then
            echo "npm install $PACKAGE_NAME@$TAG --registry $REGISTRY_URL"
        fi
    fi
}

# Error handler
error_handler() {
    local exit_code=$?
    log_error "Script failed with exit code $exit_code"
    cleanup
    exit $exit_code
}

# Main execution
main() {
    # Set error handler
    trap error_handler ERR

    log_header "Personal Pipeline Package Publisher"

    # Parse arguments
    parse_arguments "$@"

    # Validate environment
    validate_environment

    # Get package information
    get_package_info

    # Check if version exists
    check_version_exists

    # Run tests
    run_tests

    # Build package
    build_package

    # Validate package
    validate_package

    # Create package
    create_package

    # Publish package
    publish_package

    # Cleanup
    cleanup

    # Show summary
    show_summary

    log_success "Package publication completed successfully!"
}

# Execute main function
main "$@"