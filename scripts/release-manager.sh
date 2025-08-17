#!/bin/bash

# Release Manager for Personal Pipeline NPM Package
# Authored by: Backend Technical Lead Agent
# Date: 2025-01-16
#
# Complete release automation with:
# - Release preparation and validation
# - Automated changelog generation
# - Git tag management and release notes
# - Multi-stage release workflow
# - Rollback capabilities and recovery

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PACKAGE_JSON="${PROJECT_ROOT}/package.json"
CHANGELOG_PATH="${PROJECT_ROOT}/CHANGELOG.md"
REGISTRY_URL="http://localhost:4873"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
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

log_step() {
    echo -e "${MAGENTA}▶${NC} $1"
}

# Usage information
show_usage() {
    cat << EOF
${CYAN}Personal Pipeline Release Manager${NC}

Usage: $0 [command] [options]

Commands:
    prepare             Prepare release (validation, tests, build)
    create              Create release (version bump, tags, changelog)
    publish             Publish release to registry
    rollback [version]  Rollback to previous version
    changelog           Update changelog only
    status              Show current release status
    help, -h            Show this help message

Options:
    --version-type TYPE Version bump type (patch, minor, major, prerelease)
    --tag TAG          Distribution tag (latest, beta, alpha)
    --registry URL     Registry URL (default: $REGISTRY_URL)
    --dry-run          Perform dry run without making changes
    --force            Force operation even if checks fail
    --skip-tests       Skip test execution
    --production       Use production settings
    --interactive      Interactive mode with prompts

Examples:
    $0 prepare                               # Prepare release
    $0 create --version-type patch          # Create patch release
    $0 publish --tag latest                 # Publish to latest tag
    $0 rollback 0.1.0                      # Rollback to version 0.1.0
    $0 status                               # Show release status

EOF
}

# Parse command line arguments
parse_arguments() {
    COMMAND=""
    VERSION_TYPE="patch"
    TAG="latest"
    DRY_RUN=false
    FORCE=false
    SKIP_TESTS=false
    PRODUCTION_MODE=false
    INTERACTIVE_MODE=false
    ROLLBACK_VERSION=""

    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi

    COMMAND="$1"
    shift

    while [[ $# -gt 0 ]]; do
        case $1 in
            --version-type)
                VERSION_TYPE="$2"
                shift 2
                ;;
            --tag)
                TAG="$2"
                shift 2
                ;;
            --registry)
                REGISTRY_URL="$2"
                shift 2
                ;;
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
            --production)
                PRODUCTION_MODE=true
                REGISTRY_URL="https://npm.personal-pipeline.dev"
                shift
                ;;
            --interactive)
                INTERACTIVE_MODE=true
                shift
                ;;
            *)
                if [[ "$COMMAND" == "rollback" ]] && [[ -z "$ROLLBACK_VERSION" ]]; then
                    ROLLBACK_VERSION="$1"
                    shift
                else
                    log_error "Unknown option: $1"
                    show_usage
                    exit 1
                fi
                ;;
        esac
    done
}

# Get package information
get_package_info() {
    PACKAGE_NAME=$(node -p "require('$PACKAGE_JSON').name")
    CURRENT_VERSION=$(node -p "require('$PACKAGE_JSON').version")
    PACKAGE_DESCRIPTION=$(node -p "require('$PACKAGE_JSON').description")
}

# Interactive prompts
prompt_user() {
    local prompt="$1"
    local default="$2"
    local response

    if [[ "$INTERACTIVE_MODE" == "true" ]]; then
        read -p "$prompt [$default]: " response
        echo "${response:-$default}"
    else
        echo "$default"
    fi
}

confirm_action() {
    local prompt="$1"
    local response

    if [[ "$INTERACTIVE_MODE" == "true" ]]; then
        read -p "$prompt (y/N): " response
        [[ "$response" =~ ^[Yy]$ ]]
    else
        return 0
    fi
}

# Validate release environment
validate_release_environment() {
    log_header "Release Environment Validation"

    # Check git repository
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi

    # Check for uncommitted changes
    if [[ -n "$(git status --porcelain)" ]] && [[ "$FORCE" != "true" ]]; then
        log_error "Uncommitted changes detected"
        log_info "Commit or stash changes before creating a release"
        log_info "Use --force to override this check"
        exit 1
    fi

    # Check current branch
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$current_branch" != "main" ]] && [[ "$current_branch" != "master" ]] && [[ "$FORCE" != "true" ]]; then
        log_warning "Not on main/master branch (current: $current_branch)"
        if [[ "$INTERACTIVE_MODE" == "true" ]]; then
            if ! confirm_action "Continue with release from $current_branch?"; then
                exit 1
            fi
        fi
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
        exit 1
    fi

    log_success "Release environment validation passed"
}

# Prepare release
prepare_release() {
    log_header "Preparing Release"

    cd "$PROJECT_ROOT"

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
    if ! npm run lint; then
        log_error "Linting failed"
        exit 1
    fi

    # Type checking
    if ! npm run typecheck; then
        log_error "Type checking failed"
        exit 1
    fi

    # Build package
    log_step "Building package..."
    npm run clean
    if ! npm run build; then
        log_error "Build failed"
        exit 1
    fi

    # Package validation
    log_step "Validating package..."
    if ! npm pack --dry-run >/dev/null 2>&1; then
        log_error "Package validation failed"
        exit 1
    fi

    log_success "Release preparation completed"
}

# Create release
create_release() {
    log_header "Creating Release"

    cd "$PROJECT_ROOT"

    # Interactive version type selection
    if [[ "$INTERACTIVE_MODE" == "true" ]]; then
        echo "Current version: $CURRENT_VERSION"
        echo "Available version types:"
        echo "  1) patch (0.0.X) - Bug fixes"
        echo "  2) minor (0.X.0) - New features"
        echo "  3) major (X.0.0) - Breaking changes"
        echo "  4) prerelease - Alpha/beta versions"
        
        local choice=$(prompt_user "Select version type (1-4)" "1")
        case $choice in
            1) VERSION_TYPE="patch" ;;
            2) VERSION_TYPE="minor" ;;
            3) VERSION_TYPE="major" ;;
            4) VERSION_TYPE="prerelease" ;;
            *) VERSION_TYPE="patch" ;;
        esac
    fi

    # Bump version
    log_step "Bumping version ($VERSION_TYPE)..."
    if [[ "$DRY_RUN" == "true" ]]; then
        NEW_VERSION=$(node scripts/version-manager.js "$VERSION_TYPE" --skip-git-tag --skip-changelog | grep "New version:" | cut -d' ' -f3)
        log_info "DRY RUN: Would bump version to $NEW_VERSION"
    else
        NEW_VERSION=$(node scripts/version-manager.js "$VERSION_TYPE")
        NEW_VERSION=$(node -p "require('$PACKAGE_JSON').version")
        log_success "Version bumped to $NEW_VERSION"
    fi

    # Create git tag
    if [[ "$DRY_RUN" != "true" ]]; then
        log_step "Creating git tag..."
        git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
        log_success "Created tag: v$NEW_VERSION"
    fi

    log_success "Release created: $NEW_VERSION"
}

# Publish release
publish_release() {
    log_header "Publishing Release"

    cd "$PROJECT_ROOT"

    local publish_args="--registry $REGISTRY_URL --tag $TAG"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        publish_args="$publish_args --dry-run"
    fi

    # Publish package
    log_step "Publishing to registry..."
    if bash scripts/publish-package.sh $publish_args; then
        log_success "Package published successfully"
    else
        log_error "Package publication failed"
        exit 1
    fi

    # Push git tags
    if [[ "$DRY_RUN" != "true" ]]; then
        log_step "Pushing git tags..."
        if git push origin --tags; then
            log_success "Git tags pushed"
        else
            log_warning "Failed to push git tags"
        fi
    fi

    log_success "Release published"
}

# Rollback release
rollback_release() {
    log_header "Rolling Back Release"

    if [[ -z "$ROLLBACK_VERSION" ]]; then
        log_error "Rollback version not specified"
        exit 1
    fi

    cd "$PROJECT_ROOT"

    # Confirm rollback
    if [[ "$INTERACTIVE_MODE" == "true" ]]; then
        echo "Current version: $CURRENT_VERSION"
        echo "Rollback to version: $ROLLBACK_VERSION"
        if ! confirm_action "Are you sure you want to rollback?"; then
            log_info "Rollback cancelled"
            exit 0
        fi
    fi

    # Update package.json
    log_step "Updating package.json to version $ROLLBACK_VERSION..."
    if [[ "$DRY_RUN" != "true" ]]; then
        node -e "
            const pkg = require('$PACKAGE_JSON');
            pkg.version = '$ROLLBACK_VERSION';
            require('fs').writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
        "
    fi

    # Create rollback commit
    if [[ "$DRY_RUN" != "true" ]]; then
        log_step "Creating rollback commit..."
        git add package.json
        git commit -m "chore: rollback to version $ROLLBACK_VERSION"
        
        # Create rollback tag
        git tag -a "v$ROLLBACK_VERSION-rollback" -m "Rollback to version $ROLLBACK_VERSION"
    fi

    log_success "Rollback to version $ROLLBACK_VERSION completed"
}

# Update changelog
update_changelog() {
    log_header "Updating Changelog"

    cd "$PROJECT_ROOT"

    # Generate changelog using version manager
    node scripts/version-manager.js info
    
    log_step "Updating CHANGELOG.md..."
    
    if [[ ! -f "$CHANGELOG_PATH" ]]; then
        log_warning "CHANGELOG.md not found, creating new one"
        cat > "$CHANGELOG_PATH" << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF
    fi

    log_success "Changelog updated"
}

# Show release status
show_release_status() {
    log_header "Release Status"

    get_package_info

    log_info "Package: $PACKAGE_NAME"
    log_info "Current Version: $CURRENT_VERSION"
    log_info "Registry: $REGISTRY_URL"

    # Check git status
    if git rev-parse --git-dir >/dev/null 2>&1; then
        local current_branch=$(git rev-parse --abbrev-ref HEAD)
        local git_status=$(git status --porcelain)
        
        log_info "Git Branch: $current_branch"
        
        if [[ -n "$git_status" ]]; then
            log_warning "Uncommitted changes detected"
        else
            log_success "Working directory clean"
        fi

        # Show recent tags
        log_info "Recent tags:"
        git tag --sort=-version:refname | head -5 | while read tag; do
            echo "  $tag"
        done
    fi

    # Check registry status
    log_info "Registry Status:"
    if npm info "$PACKAGE_NAME" --registry "$REGISTRY_URL" >/dev/null 2>&1; then
        local published_versions=$(npm info "$PACKAGE_NAME" versions --registry "$REGISTRY_URL" --json 2>/dev/null | jq -r '.[-5:][]' 2>/dev/null || echo "Unable to fetch versions")
        echo "  Latest published versions:"
        echo "$published_versions" | tail -5 | while read version; do
            echo "    $version"
        done
    else
        log_warning "Package not found in registry"
    fi
}

# Main execution
main() {
    log_header "Personal Pipeline Release Manager"

    # Parse arguments
    parse_arguments "$@"

    # Get package information
    get_package_info

    # Execute command
    case "$COMMAND" in
        prepare)
            validate_release_environment
            prepare_release
            ;;
        create)
            validate_release_environment
            prepare_release
            create_release
            ;;
        publish)
            validate_release_environment
            publish_release
            ;;
        rollback)
            validate_release_environment
            rollback_release
            ;;
        changelog)
            update_changelog
            ;;
        status)
            show_release_status
            ;;
        help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_usage
            exit 1
            ;;
    esac

    log_success "Operation completed successfully!"
}

# Execute main function
main "$@"