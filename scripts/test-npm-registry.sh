#!/bin/bash

# Personal Pipeline - NPM Registry Testing Script
# Authored by: QA/Test Engineer Agent
# Date: 2025-01-16
#
# Comprehensive testing script for NPM registry (Verdaccio) functionality
# Tests: Authentication, Publishing, Installing, Scoped packages, Performance

set -euo pipefail

# Configuration
REGISTRY_URL="http://localhost:4873"
REGISTRY_ANALYTICS_URL="http://localhost:3001"
MONITORING_URL="http://localhost:9091"
TEST_PACKAGE_NAME="@personal-pipeline/test-package"
TEST_USERNAME="testuser"
TEST_PASSWORD="testpass123"
TEST_EMAIL="test@personal-pipeline.dev"
COMPOSE_FILE="docker-compose.npm-registry.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Temporary directory for test packages
TEST_DIR=""

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

failure() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        failure "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        failure "npm is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        failure "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        failure "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        failure "curl is not installed or not in PATH"
        exit 1
    fi
    
    # Create temporary directory for test packages
    TEST_DIR=$(mktemp -d)
    
    success "Prerequisites check passed"
}

# Start NPM registry services
start_registry() {
    log "Starting NPM registry services..."
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        failure "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Create required directories
    mkdir -p registry/npm/{config,storage,logs,auth,plugins,scripts,redis,monitoring,grafana,analytics,backups,cache}
    
    # Create basic Verdaccio configuration if it doesn't exist
    if [ ! -f "registry/npm/config/config.yaml" ]; then
        create_verdaccio_config
    fi
    
    # Start services
    if docker-compose -f "$COMPOSE_FILE" up -d; then
        success "NPM registry services started"
        
        # Wait for services to be ready
        log "Waiting for services to be ready..."
        sleep 45
        
        # Check service health
        check_service_health
    else
        failure "Failed to start NPM registry services"
        exit 1
    fi
}

# Create basic Verdaccio configuration
create_verdaccio_config() {
    log "Creating Verdaccio configuration..."
    
    cat > "registry/npm/config/config.yaml" << 'EOF'
# Verdaccio Configuration for Personal Pipeline
# Listen on all addresses
listen: 0.0.0.0:4873

# Storage path
storage: /verdaccio/storage

# Auth
auth:
  htpasswd:
    file: /verdaccio/auth/htpasswd
    max_users: 100

# Package access
packages:
  '@personal-pipeline/*':
    access: $authenticated
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs

  '**':
    access: $all
    publish: $authenticated
    unpublish: $authenticated
    proxy: npmjs

# Uplinks
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    cache: true

# Logs
logs:
  - { type: stdout, format: pretty, level: info }

# Web UI
web:
  enable: true
  title: Personal Pipeline NPM Registry

# Server settings
server:
  keepAliveTimeout: 60

# Security
security:
  api:
    jwt:
      sign:
        expiresIn: 60d
        notBefore: 1
      verify:
        someProp: 'some-value'

# HTTP/HTTPS
https:
  enable: false

# Plugins
plugins: /verdaccio/plugins

# Experiments
experiments:
  search: false
  token: false
EOF
    
    success "Verdaccio configuration created"
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    # Check NPM registry health
    local retry_count=0
    local max_retries=12
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -sf "$REGISTRY_URL/-/ping" > /dev/null; then
            success "NPM registry is healthy"
            break
        else
            ((retry_count++))
            if [ $retry_count -eq $max_retries ]; then
                failure "NPM registry health check failed after $max_retries attempts"
                return 1
            fi
            log "Waiting for NPM registry to be ready... (attempt $retry_count/$max_retries)"
            sleep 5
        fi
    done
    
    # Check registry cache (Redis)
    if docker-compose -f "$COMPOSE_FILE" exec -T npm-registry-cache redis-cli ping > /dev/null; then
        success "NPM registry cache is healthy"
    else
        warning "NPM registry cache health check failed"
    fi
    
    # Check monitoring (if accessible)
    if curl -sf "$MONITORING_URL/-/healthy" > /dev/null 2>&1; then
        success "NPM registry monitoring is accessible"
    else
        warning "NPM registry monitoring is not accessible"
    fi
    
    # Check analytics (if accessible)
    if curl -sf "$REGISTRY_ANALYTICS_URL/api/health" > /dev/null 2>&1; then
        success "NPM registry analytics is accessible"
    else
        warning "NPM registry analytics is not accessible"
    fi
}

# Test user registration and authentication
test_authentication() {
    log "Testing authentication and user management..."
    
    # Set npm registry for this session
    npm config set registry "$REGISTRY_URL"
    
    # Try to add user (this might fail if user exists, which is okay)
    log "Attempting to register test user..."
    if expect -c "
        spawn npm adduser --registry $REGISTRY_URL
        expect \"Username:\"
        send \"$TEST_USERNAME\r\"
        expect \"Password:\"
        send \"$TEST_PASSWORD\r\"
        expect \"Email:\"
        send \"$TEST_EMAIL\r\"
        expect eof
    " > /dev/null 2>&1; then
        success "User registration successful"
    else
        warning "User registration failed (user may already exist)"
    fi
    
    # Test login
    if expect -c "
        spawn npm login --registry $REGISTRY_URL
        expect \"Username:\"
        send \"$TEST_USERNAME\r\"
        expect \"Password:\"
        send \"$TEST_PASSWORD\r\"
        expect \"Email:\"
        send \"$TEST_EMAIL\r\"
        expect eof
    " > /dev/null 2>&1; then
        success "User login successful"
    else
        # Try alternative login method
        if echo -e "$TEST_USERNAME\n$TEST_PASSWORD\n$TEST_EMAIL" | npm login --registry "$REGISTRY_URL" > /dev/null 2>&1; then
            success "User login successful (alternative method)"
        else
            failure "User login failed"
            return 1
        fi
    fi
    
    # Verify authentication
    if npm whoami --registry "$REGISTRY_URL" > /dev/null 2>&1; then
        local username=$(npm whoami --registry "$REGISTRY_URL")
        success "Authentication verified (logged in as: $username)"
    else
        failure "Authentication verification failed"
    fi
}

# Create test package
create_test_package() {
    local package_name="$1"
    local package_version="${2:-1.0.0}"
    local package_dir="$TEST_DIR/$(basename "$package_name")"
    
    mkdir -p "$package_dir"
    cd "$package_dir"
    
    # Create package.json
    cat > package.json << EOF
{
  "name": "$package_name",
  "version": "$package_version",
  "description": "Test package for Personal Pipeline registry validation",
  "main": "index.js",
  "scripts": {
    "test": "echo \\"Test passed\\" && exit 0"
  },
  "keywords": ["test", "personal-pipeline", "registry"],
  "author": "Personal Pipeline Test Suite",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/personal-pipeline/test-package.git"
  },
  "publishConfig": {
    "registry": "$REGISTRY_URL"
  }
}
EOF
    
    # Create main file
    cat > index.js << 'EOF'
module.exports = {
    test: function() {
        return "Personal Pipeline Test Package";
    },
    version: require('./package.json').version
};
EOF
    
    # Create README
    cat > README.md << 'EOF'
# Personal Pipeline Test Package

This is a test package created for validating the Personal Pipeline NPM registry functionality.

## Installation

```bash
npm install @personal-pipeline/test-package --registry http://localhost:4873
```

## Usage

```javascript
const testPackage = require('@personal-pipeline/test-package');
console.log(testPackage.test()); // "Personal Pipeline Test Package"
```
EOF
    
    cd - > /dev/null
    echo "$package_dir"
}

# Test package publishing
test_package_publishing() {
    log "Testing package publishing..."
    
    # Create test package
    local package_dir=$(create_test_package "$TEST_PACKAGE_NAME" "1.0.0")
    cd "$package_dir"
    
    # Publish package
    if npm publish --registry "$REGISTRY_URL"; then
        success "Package published successfully"
    else
        failure "Package publishing failed"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
    
    # Verify package exists in registry
    if npm view "$TEST_PACKAGE_NAME" --registry "$REGISTRY_URL" > /dev/null 2>&1; then
        success "Package verification successful"
    else
        failure "Package verification failed"
        return 1
    fi
    
    # Test package info
    local package_info=$(npm info "$TEST_PACKAGE_NAME" --registry "$REGISTRY_URL" --json)
    if echo "$package_info" | grep -q "\"version\": \"1.0.0\""; then
        success "Package version information correct"
    else
        failure "Package version information incorrect"
    fi
}

# Test package installation
test_package_installation() {
    log "Testing package installation..."
    
    # Create temporary project for installation test
    local install_dir="$TEST_DIR/install-test"
    mkdir -p "$install_dir"
    cd "$install_dir"
    
    # Initialize project
    npm init -y > /dev/null
    npm config set registry "$REGISTRY_URL"
    
    # Install test package
    if npm install "$TEST_PACKAGE_NAME"; then
        success "Package installation successful"
    else
        failure "Package installation failed"
        cd - > /dev/null
        return 1
    fi
    
    # Verify installation
    if [ -d "node_modules/@personal-pipeline/test-package" ]; then
        success "Package installation verified"
    else
        failure "Package installation verification failed"
        cd - > /dev/null
        return 1
    fi
    
    # Test package functionality
    if node -e "console.log(require('$TEST_PACKAGE_NAME').test())" | grep -q "Personal Pipeline Test Package"; then
        success "Installed package functions correctly"
    else
        failure "Installed package does not function correctly"
    fi
    
    cd - > /dev/null
}

# Test version management
test_version_management() {
    log "Testing version management..."
    
    # Create new version of test package
    local package_dir=$(create_test_package "$TEST_PACKAGE_NAME" "1.1.0")
    cd "$package_dir"
    
    # Publish new version
    if npm publish --registry "$REGISTRY_URL"; then
        success "New package version published successfully"
    else
        failure "New package version publishing failed"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
    
    # Check available versions
    if npm view "$TEST_PACKAGE_NAME" versions --registry "$REGISTRY_URL" --json | grep -q "1.1.0"; then
        success "Version management working correctly"
    else
        failure "Version management not working correctly"
    fi
}

# Test scoped packages
test_scoped_packages() {
    log "Testing scoped package support..."
    
    # Create scoped test package
    local scoped_package="@personal-pipeline/scoped-test"
    local package_dir=$(create_test_package "$scoped_package" "1.0.0")
    cd "$package_dir"
    
    # Publish scoped package
    if npm publish --registry "$REGISTRY_URL"; then
        success "Scoped package published successfully"
    else
        failure "Scoped package publishing failed"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
    
    # Verify scoped package
    if npm view "$scoped_package" --registry "$REGISTRY_URL" > /dev/null 2>&1; then
        success "Scoped package verification successful"
    else
        failure "Scoped package verification failed"
    fi
}

# Test performance
test_performance() {
    log "Testing NPM registry performance..."
    
    # Test ping response time
    local start_time=$(date +%s%3N)
    if curl -sf "$REGISTRY_URL/-/ping" > /dev/null; then
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        if [ $duration -le 500 ]; then
            success "Registry ping response time: ${duration}ms (target: <500ms)"
        else
            warning "Registry ping response time: ${duration}ms (exceeds target of 500ms)"
        fi
    else
        failure "Registry ping endpoint not accessible"
    fi
    
    # Test package search performance
    start_time=$(date +%s%3N)
    if curl -sf "$REGISTRY_URL/-/v1/search?text=test" > /dev/null; then
        end_time=$(date +%s%3N)
        duration=$((end_time - start_time))
        
        if [ $duration -le 1000 ]; then
            success "Package search response time: ${duration}ms (target: <1s)"
        else
            warning "Package search response time: ${duration}ms (exceeds target of 1s)"
        fi
    else
        warning "Package search endpoint not accessible"
    fi
    
    # Test package info performance
    start_time=$(date +%s%3N)
    if npm info "$TEST_PACKAGE_NAME" --registry "$REGISTRY_URL" > /dev/null 2>&1; then
        end_time=$(date +%s%3N)
        duration=$((end_time - start_time))
        
        if [ $duration -le 2000 ]; then
            success "Package info response time: ${duration}ms (target: <2s)"
        else
            warning "Package info response time: ${duration}ms (exceeds target of 2s)"
        fi
    else
        failure "Package info command failed"
    fi
}

# Test proxy functionality
test_proxy_functionality() {
    log "Testing NPM proxy functionality..."
    
    # Test installing a package from upstream npm
    local temp_project="$TEST_DIR/proxy-test"
    mkdir -p "$temp_project"
    cd "$temp_project"
    
    npm init -y > /dev/null
    npm config set registry "$REGISTRY_URL"
    
    # Install a small package from upstream
    if npm install lodash.isempty --no-save; then
        success "Proxy functionality working (upstream package installed)"
    else
        failure "Proxy functionality not working"
    fi
    
    cd - > /dev/null
}

# Test registry metrics and monitoring
test_monitoring() {
    log "Testing registry monitoring and metrics..."
    
    # Check if Prometheus metrics are available
    if curl -sf "$MONITORING_URL/metrics" > /dev/null 2>&1; then
        success "Prometheus metrics accessible"
    else
        warning "Prometheus metrics not accessible"
    fi
    
    # Check if Grafana is accessible
    if curl -sf "$REGISTRY_ANALYTICS_URL/api/health" > /dev/null 2>&1; then
        success "Grafana analytics accessible"
    else
        warning "Grafana analytics not accessible"
    fi
    
    # Check registry statistics
    if curl -sf "$REGISTRY_URL/-/verdaccio/data/packages" > /dev/null 2>&1; then
        success "Registry statistics endpoint accessible"
    else
        warning "Registry statistics endpoint not accessible"
    fi
}

# Test backup functionality
test_backup() {
    log "Testing backup functionality..."
    
    if [ -f "registry/npm/scripts/backup-npm.sh" ]; then
        success "NPM backup script found"
        
        # Check if backup script is executable
        if [ -x "registry/npm/scripts/backup-npm.sh" ]; then
            success "NPM backup script is executable"
        else
            warning "NPM backup script is not executable"
        fi
    else
        warning "NPM backup script not found"
    fi
    
    # Check backup directory
    if [ -d "registry/npm/backups" ]; then
        success "NPM backup directory exists"
    else
        warning "NPM backup directory not found"
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up test environment..."
    
    # Logout from registry
    npm logout --registry "$REGISTRY_URL" 2>/dev/null || true
    
    # Reset npm registry
    npm config delete registry 2>/dev/null || true
    
    # Unpublish test packages (if possible)
    npm unpublish "$TEST_PACKAGE_NAME" --force --registry "$REGISTRY_URL" 2>/dev/null || true
    npm unpublish "@personal-pipeline/scoped-test" --force --registry "$REGISTRY_URL" 2>/dev/null || true
    
    # Clean up temporary directory
    if [ -n "$TEST_DIR" ] && [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
    fi
    
    # Stop services if requested
    if [ "${STOP_SERVICES:-false}" = "true" ]; then
        log "Stopping NPM registry services..."
        docker-compose -f "$COMPOSE_FILE" down
    fi
}

# Generate test report
generate_report() {
    log "Generating test report..."
    
    local report_file="test-results-npm-registry-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "test_run": {
    "timestamp": "$(date -Iseconds)",
    "test_type": "npm_registry_validation",
    "environment": "local",
    "registry_url": "$REGISTRY_URL",
    "monitoring_url": "$MONITORING_URL",
    "analytics_url": "$REGISTRY_ANALYTICS_URL"
  },
  "results": {
    "total_tests": $TESTS_TOTAL,
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "success_rate": $(echo "scale=2; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l 2>/dev/null || echo "0")
  },
  "test_categories": [
    "prerequisites",
    "service_health",
    "authentication",
    "package_publishing",
    "package_installation",
    "version_management",
    "scoped_packages",
    "performance",
    "proxy_functionality",
    "monitoring",
    "backup"
  ]
}
EOF
    
    log "Test report saved to: $report_file"
    
    # Display summary
    echo
    echo "=========================================="
    echo "         NPM REGISTRY TEST SUMMARY"
    echo "=========================================="
    echo "Total Tests: $TESTS_TOTAL"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    if [ $TESTS_TOTAL -gt 0 ]; then
        echo "Success Rate: $(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l 2>/dev/null || echo "0")%"
    else
        echo "Success Rate: N/A"
    fi
    echo "=========================================="
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! NPM registry is ready for use.${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed. Please review the results.${NC}"
        return 1
    fi
}

# Main execution
main() {
    log "Starting NPM Registry Testing Suite"
    log "===================================="
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run tests
    check_prerequisites
    start_registry
    test_authentication
    test_package_publishing
    test_package_installation
    test_version_management
    test_scoped_packages
    test_performance
    test_proxy_functionality
    test_monitoring
    test_backup
    
    # Generate report
    generate_report
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --stop-services)
            STOP_SERVICES=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--stop-services] [--help]"
            echo "  --stop-services    Stop registry services after testing"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"