#!/bin/bash

# test-package.sh - Comprehensive package testing and validation
# 
# Tests the built npm package to ensure it works correctly when installed
# and used both globally and locally.

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_DIR="$PROJECT_ROOT/.package-test"
TEMP_REGISTRY_PORT="4874"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_MODE="full"
CLEANUP_ON_EXIT=true
VERBOSE=false
USE_LOCAL_REGISTRY=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --quick)
      TEST_MODE="quick"
      shift
      ;;
    --full)
      TEST_MODE="full"
      shift
      ;;
    --no-cleanup)
      CLEANUP_ON_EXIT=false
      shift
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --no-registry)
      USE_LOCAL_REGISTRY=false
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --quick           Run quick tests only"
      echo "  --full            Run full test suite (default)"
      echo "  --no-cleanup      Don't cleanup test directories"
      echo "  --verbose, -v     Enable verbose output"
      echo "  --no-registry     Don't use local registry"
      echo "  --help, -h        Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
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

# Test results tracking
declare -a TEST_RESULTS=()
TESTS_PASSED=0
TESTS_FAILED=0

# Record test result
record_test() {
  local test_name="$1"
  local status="$2"
  local message="$3"
  
  TEST_RESULTS+=("$status|$test_name|$message")
  
  if [[ "$status" == "PASS" ]]; then
    ((TESTS_PASSED++))
    log_success "✅ $test_name: $message"
  else
    ((TESTS_FAILED++))
    log_error "❌ $test_name: $message"
  fi
}

# Cleanup function
cleanup() {
  if [[ "$CLEANUP_ON_EXIT" == "true" ]]; then
    log_info "Cleaning up test environment..."
    rm -rf "$TEST_DIR"
    
    # Stop local registry if running
    if [[ "$USE_LOCAL_REGISTRY" == "true" ]]; then
      pkill -f "verdaccio.*$TEMP_REGISTRY_PORT" 2>/dev/null || true
    fi
  else
    log_info "Test directory preserved: $TEST_DIR"
  fi
}

# Setup cleanup trap
trap cleanup EXIT

# Setup test environment
setup_test_environment() {
  log_info "Setting up test environment..."
  
  # Create test directory
  rm -rf "$TEST_DIR"
  mkdir -p "$TEST_DIR"
  
  # Create subdirectories for different test scenarios
  mkdir -p "$TEST_DIR/global-install"
  mkdir -p "$TEST_DIR/local-install"
  mkdir -p "$TEST_DIR/programmatic-usage"
  mkdir -p "$TEST_DIR/cli-tests"
  
  log_verbose "Test directory created: $TEST_DIR"
}

# Start local registry for testing
start_local_registry() {
  if [[ "$USE_LOCAL_REGISTRY" != "true" ]]; then
    return 0
  fi
  
  log_info "Starting local npm registry for testing..."
  
  # Check if verdaccio is available
  if ! command -v verdaccio >/dev/null 2>&1; then
    log_warning "verdaccio not found, installing..."
    npm install -g verdaccio
  fi
  
  # Create minimal verdaccio config
  local config_file="$TEST_DIR/verdaccio-config.yaml"
  cat > "$config_file" << EOF
storage: $TEST_DIR/verdaccio-storage
auth:
  htpasswd:
    file: ./htpasswd
    max_users: -1
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
packages:
  '@*/*':
    access: \$all
    publish: \$authenticated
    unpublish: \$authenticated
    proxy: npmjs
  '**':
    access: \$all
    publish: \$authenticated
    unpublish: \$authenticated
    proxy: npmjs
logs:
  - {type: stdout, format: pretty, level: warn}
EOF

  # Start verdaccio
  verdaccio --config "$config_file" --listen "http://localhost:$TEMP_REGISTRY_PORT" &
  local registry_pid=$!
  
  # Wait for registry to start
  local attempts=0
  while [[ $attempts -lt 30 ]]; do
    if curl -s "http://localhost:$TEMP_REGISTRY_PORT" >/dev/null 2>&1; then
      log_success "Local registry started on port $TEMP_REGISTRY_PORT"
      return 0
    fi
    sleep 1
    ((attempts++))
  done
  
  log_error "Failed to start local registry"
  kill $registry_pid 2>/dev/null || true
  return 1
}

# Build package for testing
build_package() {
  log_info "Building package for testing..."
  
  cd "$PROJECT_ROOT"
  
  # Build the package
  if bash scripts/build-package.sh --production; then
    record_test "Package Build" "PASS" "Package built successfully"
  else
    record_test "Package Build" "FAIL" "Package build failed"
    return 1
  fi
}

# Create package tarball
create_package_tarball() {
  log_info "Creating package tarball..."
  
  cd "$PROJECT_ROOT"
  
  # Create tarball
  local tarball_path="$TEST_DIR/package.tgz"
  if npm pack --pack-destination "$TEST_DIR" >/dev/null 2>&1; then
    # Find the created tarball
    local created_tarball=$(find "$TEST_DIR" -name "*.tgz" | head -1)
    if [[ -f "$created_tarball" ]]; then
      mv "$created_tarball" "$tarball_path"
      record_test "Package Tarball" "PASS" "Tarball created: $(basename "$tarball_path")"
      echo "$tarball_path"
    else
      record_test "Package Tarball" "FAIL" "Tarball not found after npm pack"
      return 1
    fi
  else
    record_test "Package Tarball" "FAIL" "npm pack failed"
    return 1
  fi
}

# Test package metadata
test_package_metadata() {
  log_info "Testing package metadata..."
  
  cd "$PROJECT_ROOT"
  
  # Check package.json validity
  if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
    record_test "Package JSON" "PASS" "package.json is valid JSON"
  else
    record_test "Package JSON" "FAIL" "package.json is invalid"
    return 1
  fi
  
  # Check required fields
  local package_name=$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json', 'utf8')).name)")
  local package_version=$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version)")
  
  if [[ -n "$package_name" && -n "$package_version" ]]; then
    record_test "Package Metadata" "PASS" "Name: $package_name, Version: $package_version"
  else
    record_test "Package Metadata" "FAIL" "Missing name or version"
    return 1
  fi
  
  # Check bin entries
  local bin_entries=$(node -e "const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log(Object.keys(pkg.bin || {}).length)")
  if [[ "$bin_entries" -gt 0 ]]; then
    record_test "CLI Binaries" "PASS" "$bin_entries CLI entries defined"
  else
    record_test "CLI Binaries" "FAIL" "No CLI binaries defined"
  fi
}

# Test local installation
test_local_installation() {
  log_info "Testing local package installation..."
  
  local test_dir="$TEST_DIR/local-install"
  cd "$test_dir"
  
  # Create test package.json
  cat > package.json << EOF
{
  "name": "test-local-install",
  "version": "1.0.0",
  "type": "module"
}
EOF

  # Install package locally
  local tarball_path="$1"
  if npm install "$tarball_path" >/dev/null 2>&1; then
    record_test "Local Install" "PASS" "Package installed locally"
  else
    record_test "Local Install" "FAIL" "Local installation failed"
    return 1
  fi
  
  # Test programmatic import
  cat > test-import.js << 'EOF'
try {
  const { personalPipelineServer } = await import('@personal-pipeline/mcp-server');
  if (personalPipelineServer) {
    console.log('SUCCESS: Main export imported');
  } else {
    console.log('FAIL: Main export is undefined');
    process.exit(1);
  }
} catch (error) {
  console.log('FAIL: Import failed:', error.message);
  process.exit(1);
}
EOF

  if node test-import.js >/dev/null 2>&1; then
    record_test "Programmatic Import" "PASS" "Main exports work correctly"
  else
    record_test "Programmatic Import" "FAIL" "Import failed"
  fi
  
  # Test submodule imports
  cat > test-submodules.js << 'EOF'
try {
  const { SourceAdapter } = await import('@personal-pipeline/mcp-server/adapters');
  const { ConfigManager } = await import('@personal-pipeline/mcp-server/utils');
  
  if (SourceAdapter && ConfigManager) {
    console.log('SUCCESS: Submodule imports work');
  } else {
    console.log('FAIL: Submodule exports are undefined');
    process.exit(1);
  }
} catch (error) {
  console.log('FAIL: Submodule import failed:', error.message);
  process.exit(1);
}
EOF

  if node test-submodules.js >/dev/null 2>&1; then
    record_test "Submodule Imports" "PASS" "Submodule exports work correctly"
  else
    record_test "Submodule Imports" "FAIL" "Submodule import failed"
  fi
}

# Test global installation
test_global_installation() {
  if [[ "$TEST_MODE" == "quick" ]]; then
    log_info "Skipping global installation test in quick mode"
    return 0
  fi
  
  log_info "Testing global package installation..."
  
  local test_dir="$TEST_DIR/global-install"
  local tarball_path="$1"
  
  # Install package globally in test environment
  local npm_prefix="$test_dir/npm-global"
  mkdir -p "$npm_prefix"
  
  cd "$test_dir"
  
  # Install globally with custom prefix
  if NPM_CONFIG_PREFIX="$npm_prefix" npm install -g "$tarball_path" >/dev/null 2>&1; then
    record_test "Global Install" "PASS" "Package installed globally"
  else
    record_test "Global Install" "FAIL" "Global installation failed"
    return 1
  fi
  
  # Test CLI commands
  local bin_dir="$npm_prefix/bin"
  export PATH="$bin_dir:$PATH"
  
  # Test main CLI
  if command -v personal-pipeline >/dev/null 2>&1; then
    record_test "CLI Availability" "PASS" "personal-pipeline command available"
    
    # Test CLI help
    if personal-pipeline --help >/dev/null 2>&1; then
      record_test "CLI Help" "PASS" "CLI help works"
    else
      record_test "CLI Help" "FAIL" "CLI help failed"
    fi
  else
    record_test "CLI Availability" "FAIL" "personal-pipeline command not found"
  fi
  
  # Test additional CLI tools
  for cli in pp-mcp pp; do
    if command -v "$cli" >/dev/null 2>&1; then
      record_test "CLI Tool: $cli" "PASS" "$cli command available"
    else
      record_test "CLI Tool: $cli" "FAIL" "$cli command not found"
    fi
  done
}

# Test CLI functionality
test_cli_functionality() {
  log_info "Testing CLI functionality..."
  
  local test_dir="$TEST_DIR/cli-tests"
  cd "$test_dir"
  
  # Create test environment for CLI
  cat > package.json << EOF
{
  "name": "test-cli",
  "version": "1.0.0",
  "type": "module"
}
EOF

  # Install package
  local tarball_path="$1"
  npm install "$tarball_path" >/dev/null 2>&1
  
  # Test CLI through npx
  if npx personal-pipeline --version >/dev/null 2>&1; then
    record_test "CLI Version" "PASS" "Version command works"
  else
    record_test "CLI Version" "FAIL" "Version command failed"
  fi
  
  if npx personal-pipeline --help >/dev/null 2>&1; then
    record_test "CLI Help" "PASS" "Help command works"
  else
    record_test "CLI Help" "FAIL" "Help command failed"
  fi
  
  # Test config command
  if npx personal-pipeline config --help >/dev/null 2>&1; then
    record_test "CLI Config" "PASS" "Config command available"
  else
    record_test "CLI Config" "FAIL" "Config command failed"
  fi
}

# Test package size
test_package_size() {
  log_info "Testing package size..."
  
  local tarball_path="$1"
  local size_bytes=$(stat -f%z "$tarball_path" 2>/dev/null || stat -c%s "$tarball_path" 2>/dev/null || echo "0")
  local size_mb=$((size_bytes / 1024 / 1024))
  
  # Package size thresholds
  local max_size_mb=50  # 50MB max
  local warning_size_mb=25  # Warning at 25MB
  
  if [[ $size_mb -lt $warning_size_mb ]]; then
    record_test "Package Size" "PASS" "Size: ${size_mb}MB (excellent)"
  elif [[ $size_mb -lt $max_size_mb ]]; then
    record_test "Package Size" "PASS" "Size: ${size_mb}MB (acceptable)"
    log_warning "Package size is ${size_mb}MB - consider optimization"
  else
    record_test "Package Size" "FAIL" "Size: ${size_mb}MB (too large)"
  fi
}

# Test package integrity
test_package_integrity() {
  log_info "Testing package integrity..."
  
  local tarball_path="$1"
  local extract_dir="$TEST_DIR/package-extract"
  
  # Extract tarball
  mkdir -p "$extract_dir"
  if tar -xzf "$tarball_path" -C "$extract_dir" 2>/dev/null; then
    record_test "Package Extract" "PASS" "Tarball extracts correctly"
  else
    record_test "Package Extract" "FAIL" "Failed to extract tarball"
    return 1
  fi
  
  # Check essential files
  local package_dir=$(find "$extract_dir" -name "package" -type d | head -1)
  local essential_files=(
    "package.json"
    "bin/personal-pipeline.js"
    "bin/pp-mcp.js"
    "bin/pp.js"
    "dist/index.js"
    "lib/index.js"
  )
  
  local missing_files=()
  for file in "${essential_files[@]}"; do
    if [[ ! -f "$package_dir/$file" ]]; then
      missing_files+=("$file")
    fi
  done
  
  if [[ ${#missing_files[@]} -eq 0 ]]; then
    record_test "Essential Files" "PASS" "All essential files present"
  else
    record_test "Essential Files" "FAIL" "Missing files: ${missing_files[*]}"
  fi
  
  # Check file permissions
  for cli_file in "$package_dir"/bin/*.js; do
    if [[ -x "$cli_file" ]]; then
      record_test "CLI Permissions" "PASS" "$(basename "$cli_file") is executable"
    else
      record_test "CLI Permissions" "FAIL" "$(basename "$cli_file") not executable"
    fi
  done
}

# Generate test report
generate_test_report() {
  log_info "Generating test report..."
  
  local report_file="$PROJECT_ROOT/PACKAGE_TEST_REPORT.md"
  
  cat > "$report_file" << EOF
# Package Test Report

**Test Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Test Mode:** $TEST_MODE
**Tests Passed:** $TESTS_PASSED
**Tests Failed:** $TESTS_FAILED
**Success Rate:** $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%

## Test Results

EOF

  # Add detailed results
  for result in "${TEST_RESULTS[@]}"; do
    IFS='|' read -r status test_name message <<< "$result"
    local icon="✅"
    if [[ "$status" == "FAIL" ]]; then
      icon="❌"
    fi
    echo "- $icon **$test_name:** $message" >> "$report_file"
  done
  
  cat >> "$report_file" << EOF

## Test Environment

- Node Version: $(node --version)
- NPM Version: $(npm --version)
- Platform: $(uname -s)
- Architecture: $(uname -m)

## Package Information

$(cd "$PROJECT_ROOT" && npm ls --depth=0 2>/dev/null || echo "Package info unavailable")

## Recommendations

EOF

  # Add recommendations based on test results
  if [[ $TESTS_FAILED -eq 0 ]]; then
    echo "🎉 All tests passed! Your package is ready for distribution." >> "$report_file"
  else
    echo "⚠️ Some tests failed. Please review the issues above before publishing." >> "$report_file"
  fi
  
  cat >> "$report_file" << EOF

## Next Steps

1. Review any failed tests and fix issues
2. Run \`npm run package:build\` to rebuild if needed
3. Publish with \`npm run package:publish\`

Generated by Personal Pipeline package test suite
EOF

  log_success "Test report generated: $report_file"
}

# Main test function
main() {
  log_info "Starting package test suite..."
  log_info "Test mode: $TEST_MODE"
  
  # Setup
  setup_test_environment
  
  if [[ "$USE_LOCAL_REGISTRY" == "true" ]]; then
    start_local_registry
  fi
  
  # Build and test
  build_package || exit 1
  
  local tarball_path
  tarball_path=$(create_package_tarball) || exit 1
  
  # Run tests
  test_package_metadata
  test_package_integrity "$tarball_path"
  test_package_size "$tarball_path"
  test_local_installation "$tarball_path"
  test_cli_functionality "$tarball_path"
  
  if [[ "$TEST_MODE" == "full" ]]; then
    test_global_installation "$tarball_path"
  fi
  
  # Generate report
  generate_test_report
  
  # Final summary
  echo ""
  log_info "Package testing completed"
  echo "📊 Results: $TESTS_PASSED passed, $TESTS_FAILED failed"
  
  if [[ $TESTS_FAILED -eq 0 ]]; then
    log_success "🎉 All tests passed! Package is ready for distribution"
    exit 0
  else
    log_error "❌ Some tests failed. Please review and fix issues"
    exit 1
  fi
}

# Run main function
main "$@"