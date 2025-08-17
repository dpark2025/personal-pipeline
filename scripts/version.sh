#!/bin/bash

# version.sh - Automated semantic versioning for npm packages
# 
# Provides automated version management with git tagging, changelog
# generation, and release preparation.

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
BUMP_TYPE=""
DRY_RUN=false
FORCE=false
SKIP_GIT=false
SKIP_CHANGELOG=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    patch|minor|major|prerelease)
      BUMP_TYPE="$1"
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
    --skip-git)
      SKIP_GIT=true
      shift
      ;;
    --skip-changelog)
      SKIP_CHANGELOG=true
      shift
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [BUMP_TYPE] [OPTIONS]"
      echo ""
      echo "Bump Types:"
      echo "  patch       Increment patch version (1.0.0 -> 1.0.1)"
      echo "  minor       Increment minor version (1.0.0 -> 1.1.0)"
      echo "  major       Increment major version (1.0.0 -> 2.0.0)"
      echo "  prerelease  Increment prerelease version (1.0.0 -> 1.0.1-0)"
      echo ""
      echo "Options:"
      echo "  --dry-run        Show what would be done without making changes"
      echo "  --force          Force version bump even with uncommitted changes"
      echo "  --skip-git       Skip git tagging and commits"
      echo "  --skip-changelog Skip changelog generation"
      echo "  --verbose, -v    Enable verbose output"
      echo "  --help, -h       Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 patch                    # Bump patch version"
      echo "  $0 minor --dry-run          # Preview minor version bump"
      echo "  $0 major --skip-changelog   # Bump major without changelog"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

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

# Check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Get current version from package.json
get_current_version() {
  node -e "console.log(JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/package.json', 'utf8')).version)"
}

# Calculate new version
calculate_new_version() {
  local current_version="$1"
  local bump_type="$2"
  
  # Split version into parts
  IFS='.' read -r major minor patch <<< "$current_version"
  
  # Remove any prerelease suffix from patch
  patch=$(echo "$patch" | cut -d'-' -f1)
  
  case "$bump_type" in
    major)
      echo "$((major + 1)).0.0"
      ;;
    minor)
      echo "$major.$((minor + 1)).0"
      ;;
    patch)
      echo "$major.$minor.$((patch + 1))"
      ;;
    prerelease)
      # Check if current version has prerelease
      if [[ "$current_version" == *"-"* ]]; then
        # Increment prerelease number
        local prerelease=$(echo "$current_version" | cut -d'-' -f2)
        echo "$major.$minor.$patch-$((prerelease + 1))"
      else
        # Add first prerelease
        echo "$major.$minor.$((patch + 1))-0"
      fi
      ;;
    *)
      log_error "Unknown bump type: $bump_type"
      exit 1
      ;;
  esac
}

# Check git status
check_git_status() {
  if [[ "$SKIP_GIT" == "true" ]]; then
    return 0
  fi
  
  if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
    log_error "Not a git repository"
    return 1
  fi
  
  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    if [[ "$FORCE" != "true" ]]; then
      log_error "Uncommitted changes detected. Use --force to override or commit your changes."
      return 1
    else
      log_warning "Proceeding with uncommitted changes (--force enabled)"
    fi
  fi
  
  # Check current branch
  local current_branch=$(git branch --show-current)
  log_verbose "Current branch: $current_branch"
  
  return 0
}

# Update package.json version
update_package_version() {
  local new_version="$1"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would update package.json version to $new_version"
    return 0
  fi
  
  # Use npm version to update package.json
  log_info "Updating package.json version to $new_version..."
  
  cd "$PROJECT_ROOT"
  npm version "$new_version" --no-git-tag-version >/dev/null
  
  log_success "Updated package.json to version $new_version"
}

# Generate changelog entry with conventional commit analysis
generate_changelog_entry() {
  local version="$1"
  local date=$(date +"%Y-%m-%d")
  
  if [[ "$SKIP_CHANGELOG" == "true" ]]; then
    log_info "Skipping changelog generation"
    return 0
  fi
  
  local changelog_file="$PROJECT_ROOT/CHANGELOG.md"
  local temp_changelog="$PROJECT_ROOT/.changelog.tmp"
  
  # Create changelog if it doesn't exist
  if [[ ! -f "$changelog_file" ]]; then
    cat > "$changelog_file" << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

EOF
  fi
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would add changelog entry for version $version"
    return 0
  fi
  
  log_info "Generating changelog entry for version $version with conventional commit analysis..."
  
  # Get git commits since last tag
  local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  local commit_range=""
  
  if [[ -n "$last_tag" ]]; then
    commit_range="$last_tag..HEAD"
  else
    commit_range="HEAD"
  fi
  
  # Analyze commits by type using conventional commit format
  local breaking_changes=$(git log "$commit_range" --oneline --no-merges --grep="BREAKING CHANGE\|!:" 2>/dev/null || echo "")
  local features=$(git log "$commit_range" --oneline --no-merges --grep="^feat(\|^feat:" 2>/dev/null || echo "")
  local fixes=$(git log "$commit_range" --oneline --no-merges --grep="^fix(\|^fix:" 2>/dev/null || echo "")
  local perf=$(git log "$commit_range" --oneline --no-merges --grep="^perf(\|^perf:" 2>/dev/null || echo "")
  local refactor=$(git log "$commit_range" --oneline --no-merges --grep="^refactor(\|^refactor:" 2>/dev/null || echo "")
  local docs=$(git log "$commit_range" --oneline --no-merges --grep="^docs(\|^docs:" 2>/dev/null || echo "")
  local chore=$(git log "$commit_range" --oneline --no-merges --grep="^chore(\|^chore:" 2>/dev/null || echo "")
  local other=$(git log "$commit_range" --oneline --no-merges --invert-grep --grep="^feat\|^fix\|^perf\|^refactor\|^docs\|^chore\|BREAKING CHANGE" 2>/dev/null || echo "")
  
  # Create new changelog entry with conventional commit sections
  cat > "$temp_changelog" << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [$version] - $date

EOF

  # Add breaking changes section
  if [[ -n "$breaking_changes" ]]; then
    echo "### ⚠️ BREAKING CHANGES" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
    echo "$breaking_changes" | sed 's/^[a-f0-9]\+ /- /' >> "$temp_changelog"
    echo "" >> "$temp_changelog"
  fi

  # Add features section
  if [[ -n "$features" ]]; then
    echo "### ✨ Features" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
    echo "$features" | sed 's/^[a-f0-9]\+ /- /' >> "$temp_changelog"
    echo "" >> "$temp_changelog"
  fi

  # Add bug fixes section
  if [[ -n "$fixes" ]]; then
    echo "### 🐛 Bug Fixes" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
    echo "$fixes" | sed 's/^[a-f0-9]\+ /- /' >> "$temp_changelog"
    echo "" >> "$temp_changelog"
  fi

  # Add performance improvements
  if [[ -n "$perf" ]]; then
    echo "### ⚡ Performance Improvements" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
    echo "$perf" | sed 's/^[a-f0-9]\+ /- /' >> "$temp_changelog"
    echo "" >> "$temp_changelog"
  fi

  # Add refactoring
  if [[ -n "$refactor" ]]; then
    echo "### ♻️ Code Refactoring" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
    echo "$refactor" | sed 's/^[a-f0-9]\+ /- /' >> "$temp_changelog"
    echo "" >> "$temp_changelog"
  fi

  # Add documentation updates
  if [[ -n "$docs" ]]; then
    echo "### 📚 Documentation" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
    echo "$docs" | sed 's/^[a-f0-9]\+ /- /' >> "$temp_changelog"
    echo "" >> "$temp_changelog"
  fi

  # Add maintenance and chores
  if [[ -n "$chore" ]]; then
    echo "### 🔧 Maintenance" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
    echo "$chore" | sed 's/^[a-f0-9]\+ /- /' >> "$temp_changelog"
    echo "" >> "$temp_changelog"
  fi

  # Add other changes
  if [[ -n "$other" ]]; then
    echo "### Other Changes" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
    echo "$other" | sed 's/^[a-f0-9]\+ /- /' >> "$temp_changelog"
    echo "" >> "$temp_changelog"
  fi

  # If no categorized commits, add a generic entry
  if [[ -z "$breaking_changes" && -z "$features" && -z "$fixes" && -z "$perf" && -z "$refactor" && -z "$docs" && -z "$chore" && -z "$other" ]]; then
    echo "### Changes" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
    echo "- Version $version release" >> "$temp_changelog"
    echo "" >> "$temp_changelog"
  fi

  # Append existing changelog content (skip header)
  if [[ -f "$changelog_file" ]]; then
    tail -n +7 "$changelog_file" >> "$temp_changelog"
  fi
  
  # Replace changelog
  mv "$temp_changelog" "$changelog_file"
  
  log_success "Updated CHANGELOG.md with conventional commit analysis"
}

# Create git tag and commit
create_git_tag() {
  local version="$1"
  
  if [[ "$SKIP_GIT" == "true" ]]; then
    log_info "Skipping git operations"
    return 0
  fi
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would create git commit and tag v$version"
    return 0
  fi
  
  cd "$PROJECT_ROOT"
  
  # Add changes to git
  git add package.json
  
  if [[ -f "CHANGELOG.md" && "$SKIP_CHANGELOG" != "true" ]]; then
    git add CHANGELOG.md
  fi
  
  # Create commit
  log_info "Creating git commit for version $version..."
  git commit -m "chore: bump version to $version

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
  
  # Create tag
  log_info "Creating git tag v$version..."
  git tag -a "v$version" -m "Release version $version

📦 Package release with automated build and testing

🚀 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
  
  log_success "Created git commit and tag v$version"
}

# Run tests before version bump
run_tests() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would run tests before version bump"
    return 0
  fi
  
  log_info "Running tests before version bump..."
  
  cd "$PROJECT_ROOT"
  
  # Run linting
  if npm run lint >/dev/null 2>&1; then
    log_success "Linting passed"
  else
    log_error "Linting failed"
    return 1
  fi
  
  # Run type checking
  if npm run typecheck >/dev/null 2>&1; then
    log_success "Type checking passed"
  else
    log_error "Type checking failed"
    return 1
  fi
  
  # Run tests
  if npm test >/dev/null 2>&1; then
    log_success "Tests passed"
  else
    log_error "Tests failed"
    return 1
  fi
}

# Show version summary
show_version_summary() {
  local current_version="$1"
  local new_version="$2"
  local bump_type="$3"
  
  echo ""
  echo "📋 Version Bump Summary"
  echo "======================"
  echo "📦 Package: $(node -e "console.log(JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/package.json', 'utf8')).name)")"
  echo "📊 Bump Type: $bump_type"
  echo "📌 Current Version: $current_version"
  echo "🎯 New Version: $new_version"
  echo "🔧 Mode: $([ "$DRY_RUN" = "true" ] && echo "DRY RUN" || echo "LIVE")"
  echo "📝 Changelog: $([ "$SKIP_CHANGELOG" = "true" ] && echo "Skipped" || echo "Generated")"
  echo "🏷️  Git Tag: $([ "$SKIP_GIT" = "true" ] && echo "Skipped" || echo "Created")"
  echo ""
}

# Interactive mode for version selection
interactive_version_selection() {
  local current_version="$1"
  
  echo "Current version: $current_version"
  echo ""
  echo "Select version bump type:"
  echo "1) patch   ($current_version -> $(calculate_new_version "$current_version" "patch"))"
  echo "2) minor   ($current_version -> $(calculate_new_version "$current_version" "minor"))"
  echo "3) major   ($current_version -> $(calculate_new_version "$current_version" "major"))"
  echo "4) prerelease ($current_version -> $(calculate_new_version "$current_version" "prerelease"))"
  echo "5) custom"
  echo ""
  
  read -p "Enter choice (1-5): " choice
  
  case $choice in
    1) echo "patch" ;;
    2) echo "minor" ;;
    3) echo "major" ;;
    4) echo "prerelease" ;;
    5) 
      read -p "Enter custom version: " custom_version
      echo "custom:$custom_version"
      ;;
    *)
      log_error "Invalid choice"
      exit 1
      ;;
  esac
}

# Main version management function
main() {
  log_info "Starting version management..."
  
  cd "$PROJECT_ROOT"
  
  # Get current version
  local current_version
  current_version=$(get_current_version)
  log_verbose "Current version: $current_version"
  
  # Determine bump type
  if [[ -z "$BUMP_TYPE" ]]; then
    BUMP_TYPE=$(interactive_version_selection "$current_version")
  fi
  
  # Handle custom version
  local new_version
  if [[ "$BUMP_TYPE" == custom:* ]]; then
    new_version="${BUMP_TYPE#custom:}"
  else
    new_version=$(calculate_new_version "$current_version" "$BUMP_TYPE")
  fi
  
  # Show summary
  show_version_summary "$current_version" "$new_version" "$BUMP_TYPE"
  
  # Confirmation for non-dry-run
  if [[ "$DRY_RUN" != "true" ]]; then
    read -p "Proceed with version bump? (y/N): " confirm
    if [[ "$confirm" != [yY] ]]; then
      log_info "Version bump cancelled"
      exit 0
    fi
  fi
  
  # Pre-flight checks
  check_git_status
  run_tests
  
  # Execute version bump
  update_package_version "$new_version"
  generate_changelog_entry "$new_version"
  create_git_tag "$new_version"
  
  # Final summary
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Dry run completed - no changes made"
  else
    log_success "Version bump completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Push changes: git push && git push --tags"
    echo "  2. Build package: npm run package:build"
    echo "  3. Publish package: npm run package:publish"
    echo ""
  fi
}

# Run main function
main "$@"