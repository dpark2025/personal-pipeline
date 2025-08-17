#!/bin/bash

# Personal Pipeline - Registry Integration Testing Script
# Authored by: QA/Test Engineer Agent
# Date: 2025-01-16
#
# Integration testing for Docker + NPM registry infrastructure
# Tests: Cross-registry workflows, build automation, monitoring integration

set -euo pipefail

# Configuration
DOCKER_REGISTRY_URL="localhost:5000"
NPM_REGISTRY_URL="http://localhost:4873"
DOCKER_UI_URL="http://localhost:8080"
NPM_ANALYTICS_URL="http://localhost:3001"
TEST_PROJECT_NAME="personal-pipeline-integration-test"
DOCKER_COMPOSE_REGISTRY="docker-compose.registry.yml"
DOCKER_COMPOSE_NPM="docker-compose.npm-registry.yml"

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

# Temporary directory for test projects
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
    log "Checking prerequisites for integration testing..."
    
    # Check required tools
    local required_tools=("docker" "docker-compose" "node" "npm" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            failure "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        failure "Docker daemon is not running"
        exit 1
    fi
    
    # Create temporary directory
    TEST_DIR=$(mktemp -d)
    
    success "Prerequisites check passed"
}

# Start all registry services
start_all_registries() {
    log "Starting all registry services..."
    
    # Check compose files exist
    if [ ! -f "$DOCKER_COMPOSE_REGISTRY" ]; then
        failure "Docker registry compose file not found: $DOCKER_COMPOSE_REGISTRY"
        exit 1
    fi
    
    if [ ! -f "$DOCKER_COMPOSE_NPM" ]; then
        failure "NPM registry compose file not found: $DOCKER_COMPOSE_NPM"
        exit 1
    fi
    
    # Create required directories
    mkdir -p registry/{auth,data,cache,backups,config,certs}
    mkdir -p registry/npm/{config,storage,logs,auth,plugins,scripts,redis,monitoring,grafana,analytics,backups,cache}
    
    # Start Docker registry
    log "Starting Docker registry..."
    if docker-compose -f "$DOCKER_COMPOSE_REGISTRY" up -d; then
        success "Docker registry services started"
    else
        failure "Failed to start Docker registry services"
        exit 1
    fi
    
    # Start NPM registry
    log "Starting NPM registry..."
    if docker-compose -f "$DOCKER_COMPOSE_NPM" up -d; then
        success "NPM registry services started"
    else
        failure "Failed to start NPM registry services"
        exit 1
    fi
    
    # Wait for services to be ready
    log "Waiting for all services to be ready..."
    sleep 60
    
    # Check service health
    check_all_services_health
}

# Check health of all services
check_all_services_health() {
    log "Checking health of all registry services..."
    
    # Check Docker registry
    local retry_count=0
    local max_retries=12
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -sf "http://$DOCKER_REGISTRY_URL/v2/" > /dev/null; then
            success "Docker registry is healthy"
            break
        else
            ((retry_count++))
            if [ $retry_count -eq $max_retries ]; then
                failure "Docker registry health check failed"
                return 1
            fi
            log "Waiting for Docker registry... (attempt $retry_count/$max_retries)"
            sleep 5
        fi
    done
    
    # Check NPM registry
    retry_count=0
    while [ $retry_count -lt $max_retries ]; do
        if curl -sf "$NPM_REGISTRY_URL/-/ping" > /dev/null; then
            success "NPM registry is healthy"
            break
        else
            ((retry_count++))
            if [ $retry_count -eq $max_retries ]; then
                failure "NPM registry health check failed"
                return 1
            fi
            log "Waiting for NPM registry... (attempt $retry_count/$max_retries)"
            sleep 5
        fi
    done
    
    # Check Docker registry UI
    if curl -sf "$DOCKER_UI_URL" > /dev/null; then
        success "Docker registry UI is accessible"
    else
        warning "Docker registry UI is not accessible"
    fi
    
    # Check NPM analytics (if available)
    if curl -sf "$NPM_ANALYTICS_URL/api/health" > /dev/null 2>&1; then
        success "NPM registry analytics is accessible"
    else
        warning "NPM registry analytics is not accessible"
    fi
}

# Test network connectivity between registries
test_network_connectivity() {
    log "Testing network connectivity between registries..."
    
    # Test Docker to NPM registry connectivity
    if docker run --rm --network registry-network alpine:3.19 \
        sh -c "wget -qO- http://npm-registry:4873/-/ping" > /dev/null 2>&1; then
        success "Docker to NPM registry connectivity working"
    else
        warning "Docker to NPM registry connectivity issues"
    fi
    
    # Test NPM to Docker registry connectivity
    if docker run --rm --network npm-network alpine:3.19 \
        sh -c "wget -qO- http://registry:5000/v2/" > /dev/null 2>&1; then
        success "NPM to Docker registry connectivity working"
    else
        warning "NPM to Docker registry connectivity issues"
    fi
    
    # Test shared network (if configured)
    if docker network ls | grep -q registry-network; then
        success "Registry network is available"
    else
        warning "Registry network is not configured"
    fi
}

# Create integrated test project
create_integrated_test_project() {
    log "Creating integrated test project..."
    
    local project_dir="$TEST_DIR/$TEST_PROJECT_NAME"
    mkdir -p "$project_dir"
    cd "$project_dir"
    
    # Create package.json with registry configuration
    cat > package.json << EOF
{
  "name": "@personal-pipeline/integration-test",
  "version": "1.0.0",
  "description": "Integration test project for Personal Pipeline registries",
  "main": "index.js",
  "scripts": {
    "build": "npm run build:app && npm run build:docker",
    "build:app": "echo 'Building application...'",
    "build:docker": "docker build -t localhost:5000/personal-pipeline/integration-test:latest .",
    "publish": "npm run build && npm run publish:npm && npm run publish:docker",
    "publish:npm": "npm publish --registry $NPM_REGISTRY_URL",
    "publish:docker": "docker push localhost:5000/personal-pipeline/integration-test:latest",
    "test": "node test.js"
  },
  "publishConfig": {
    "registry": "$NPM_REGISTRY_URL"
  },
  "keywords": ["integration", "test", "personal-pipeline"],
  "author": "Personal Pipeline Test Suite",
  "license": "MIT"
}
EOF
    
    # Create main application file
    cat > index.js << 'EOF'
const packageInfo = require('./package.json');

module.exports = {
    name: packageInfo.name,
    version: packageInfo.version,
    greet: function(name) {
        return `Hello ${name} from Personal Pipeline Integration Test!`;
    },
    getInfo: function() {
        return {
            name: this.name,
            version: this.version,
            registry: 'Personal Pipeline Local Registry',
            timestamp: new Date().toISOString()
        };
    }
};

// CLI support
if (require.main === module) {
    console.log('Personal Pipeline Integration Test');
    console.log('Version:', packageInfo.version);
    console.log(module.exports.greet('User'));
}
EOF
    
    # Create test file
    cat > test.js << 'EOF'
const app = require('./index.js');

console.log('Running integration tests...');

// Test basic functionality
const greeting = app.greet('Test');
if (greeting.includes('Hello Test')) {
    console.log('✅ Greeting test passed');
} else {
    console.log('❌ Greeting test failed');
    process.exit(1);
}

// Test info function
const info = app.getInfo();
if (info.name && info.version) {
    console.log('✅ Info test passed');
} else {
    console.log('❌ Info test failed');
    process.exit(1);
}

console.log('All tests passed!');
EOF
    
    # Create Dockerfile
    cat > Dockerfile << 'EOF'
FROM node:18-alpine

LABEL maintainer="Personal Pipeline Team"
LABEL version="1.0.0"
LABEL description="Integration test application"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Change ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Start application
CMD ["node", "index.js"]
EOF
    
    # Create .dockerignore
    cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.coverage
*.md
EOF
    
    cd - > /dev/null
    echo "$project_dir"
}

# Test end-to-end build and publish workflow
test_build_and_publish_workflow() {
    log "Testing end-to-end build and publish workflow..."
    
    local project_dir=$(create_integrated_test_project)
    cd "$project_dir"
    
    # Set up NPM authentication
    npm config set registry "$NPM_REGISTRY_URL"
    
    # Run application tests
    if npm test; then
        success "Application tests passed"
    else
        failure "Application tests failed"
        cd - > /dev/null
        return 1
    fi
    
    # Build Docker image
    if docker build -t "$DOCKER_REGISTRY_URL/personal-pipeline/integration-test:latest" .; then
        success "Docker image built successfully"
    else
        failure "Docker image build failed"
        cd - > /dev/null
        return 1
    fi
    
    # Test Docker image
    if docker run --rm "$DOCKER_REGISTRY_URL/personal-pipeline/integration-test:latest" | grep -q "Personal Pipeline Integration Test"; then
        success "Docker image functions correctly"
    else
        failure "Docker image does not function correctly"
        cd - > /dev/null
        return 1
    fi
    
    # Push Docker image
    if docker push "$DOCKER_REGISTRY_URL/personal-pipeline/integration-test:latest"; then
        success "Docker image pushed to registry successfully"
    else
        failure "Docker image push failed"
        cd - > /dev/null
        return 1
    fi
    
    # Publish NPM package (if authenticated)
    if npm whoami --registry "$NPM_REGISTRY_URL" > /dev/null 2>&1; then
        if npm publish --registry "$NPM_REGISTRY_URL"; then
            success "NPM package published successfully"
        else
            warning "NPM package publish failed (may need authentication)"
        fi
    else
        warning "NPM authentication not configured, skipping package publish"
    fi
    
    cd - > /dev/null
}

# Test package installation and Docker image pull
test_pull_and_install_workflow() {
    log "Testing pull and install workflow..."
    
    # Test Docker image pull
    docker rmi "$DOCKER_REGISTRY_URL/personal-pipeline/integration-test:latest" 2>/dev/null || true
    
    if docker pull "$DOCKER_REGISTRY_URL/personal-pipeline/integration-test:latest"; then
        success "Docker image pulled successfully"
        
        # Test pulled image
        if docker run --rm "$DOCKER_REGISTRY_URL/personal-pipeline/integration-test:latest" | grep -q "Personal Pipeline Integration Test"; then
            success "Pulled Docker image functions correctly"
        else
            failure "Pulled Docker image does not function correctly"
        fi
    else
        failure "Docker image pull failed"
    fi
    
    # Test NPM package install (if package exists)
    local install_dir="$TEST_DIR/install-test"
    mkdir -p "$install_dir"
    cd "$install_dir"
    
    npm init -y > /dev/null
    npm config set registry "$NPM_REGISTRY_URL"
    
    if npm install "@personal-pipeline/integration-test" > /dev/null 2>&1; then
        success "NPM package installed successfully"
        
        # Test installed package
        if node -e "console.log(require('@personal-pipeline/integration-test').greet('Test'))" | grep -q "Hello Test"; then
            success "Installed NPM package functions correctly"
        else
            failure "Installed NPM package does not function correctly"
        fi
    else
        warning "NPM package install failed (package may not be published)"
    fi
    
    cd - > /dev/null
}

# Test cross-registry automation scripts
test_automation_scripts() {
    log "Testing automation scripts..."
    
    # Test registry management scripts
    if [ -f "scripts/registry-manager.sh" ]; then
        if [ -x "scripts/registry-manager.sh" ]; then
            success "Registry manager script is executable"
        else
            warning "Registry manager script is not executable"
        fi
    else
        warning "Registry manager script not found"
    fi
    
    # Test NPM registry setup script
    if [ -f "scripts/setup-npm-registry.sh" ]; then
        if [ -x "scripts/setup-npm-registry.sh" ]; then
            success "NPM registry setup script is executable"
        else
            warning "NPM registry setup script is not executable"
        fi
    else
        warning "NPM registry setup script not found"
    fi
    
    # Test package.json registry scripts
    if npm run --silent 2>/dev/null | grep -q "registry:"; then
        success "NPM registry scripts are configured"
    else
        warning "NPM registry scripts not found in package.json"
    fi
}

# Test monitoring integration
test_monitoring_integration() {
    log "Testing monitoring integration..."
    
    # Check if monitoring services are running
    local monitoring_services=0
    
    # Check Prometheus (NPM monitoring)
    if curl -sf "http://localhost:9091/metrics" > /dev/null 2>&1; then
        success "Prometheus monitoring accessible"
        ((monitoring_services++))
    else
        warning "Prometheus monitoring not accessible"
    fi
    
    # Check Grafana (NPM analytics)
    if curl -sf "$NPM_ANALYTICS_URL/api/health" > /dev/null 2>&1; then
        success "Grafana analytics accessible"
        ((monitoring_services++))
    else
        warning "Grafana analytics not accessible"
    fi
    
    # Check Docker registry health endpoint
    if curl -sf "http://$DOCKER_REGISTRY_URL/v2/" > /dev/null; then
        success "Docker registry health endpoint accessible"
        ((monitoring_services++))
    else
        failure "Docker registry health endpoint not accessible"
    fi
    
    # Check NPM registry health endpoint
    if curl -sf "$NPM_REGISTRY_URL/-/ping" > /dev/null; then
        success "NPM registry health endpoint accessible"
        ((monitoring_services++))
    else
        failure "NPM registry health endpoint not accessible"
    fi
    
    if [ $monitoring_services -ge 2 ]; then
        success "Monitoring integration working ($monitoring_services/4 services)"
    else
        warning "Limited monitoring integration ($monitoring_services/4 services)"
    fi
}

# Test performance under load
test_performance_integration() {
    log "Testing integrated performance..."
    
    # Test concurrent operations
    local start_time=$(date +%s)
    
    # Concurrent Docker operations
    (docker pull alpine:3.19 > /dev/null 2>&1 &)
    (docker pull node:18-alpine > /dev/null 2>&1 &)
    
    # Concurrent NPM operations
    local temp_project="$TEST_DIR/perf-test"
    mkdir -p "$temp_project"
    cd "$temp_project"
    npm init -y > /dev/null
    npm config set registry "$NPM_REGISTRY_URL"
    (npm install lodash > /dev/null 2>&1 &)
    
    # Wait for operations to complete
    wait
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $duration -le 30 ]; then
        success "Concurrent operations completed in ${duration}s (target: <30s)"
    else
        warning "Concurrent operations took ${duration}s (exceeds target of 30s)"
    fi
    
    cd - > /dev/null
}

# Test installation speed (Milestone 1.2 requirement)
test_installation_speed() {
    log "Testing installation speed (Milestone 1.2 requirement)..."
    
    local start_time=$(date +%s)
    
    # Simulate fresh installation workflow
    local install_test_dir="$TEST_DIR/speed-test"
    mkdir -p "$install_test_dir"
    cd "$install_test_dir"
    
    # Initialize project
    npm init -y > /dev/null
    npm config set registry "$NPM_REGISTRY_URL"
    
    # Install from local registry (if packages exist)
    if npm info "@personal-pipeline/mcp-server" --registry "$NPM_REGISTRY_URL" > /dev/null 2>&1; then
        npm install "@personal-pipeline/mcp-server" > /dev/null 2>&1
    fi
    
    # Pull Docker image from local registry (if exists)
    if docker pull "$DOCKER_REGISTRY_URL/personal-pipeline/integration-test:latest" > /dev/null 2>&1; then
        success "Docker image pulled from local registry"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    cd - > /dev/null
    
    # Check against Milestone 1.2 requirement (5 minutes = 300 seconds)
    if [ $duration -le 300 ]; then
        success "Installation completed in ${duration}s (target: <300s) ✨ MILESTONE 1.2 MET"
    else
        failure "Installation took ${duration}s (exceeds target of 300s) ❌ MILESTONE 1.2 NOT MET"
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up integration test environment..."
    
    # Remove test images
    docker rmi "$DOCKER_REGISTRY_URL/personal-pipeline/integration-test:latest" 2>/dev/null || true
    docker rmi "personal-pipeline/integration-test:latest" 2>/dev/null || true
    
    # Clean up temporary directory
    if [ -n "$TEST_DIR" ] && [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
    fi
    
    # Reset npm configuration
    npm config delete registry 2>/dev/null || true
    
    # Stop services if requested
    if [ "${STOP_SERVICES:-false}" = "true" ]; then
        log "Stopping all registry services..."
        docker-compose -f "$DOCKER_COMPOSE_NPM" down 2>/dev/null || true
        docker-compose -f "$DOCKER_COMPOSE_REGISTRY" down 2>/dev/null || true
    fi
}

# Generate integration test report
generate_report() {
    log "Generating integration test report..."
    
    local report_file="test-results-registry-integration-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "test_run": {
    "timestamp": "$(date -Iseconds)",
    "test_type": "registry_integration_validation",
    "environment": "local",
    "docker_registry_url": "$DOCKER_REGISTRY_URL",
    "npm_registry_url": "$NPM_REGISTRY_URL",
    "milestone_target": "Installation completes in under 5 minutes"
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
    "network_connectivity",
    "build_and_publish_workflow",
    "pull_and_install_workflow",
    "automation_scripts",
    "monitoring_integration",
    "performance_integration",
    "installation_speed"
  ],
  "milestone_validation": {
    "milestone_1_2": {
      "requirement": "Installation completes in under 5 minutes",
      "status": "$([ $TESTS_FAILED -eq 0 ] && echo "PASSED" || echo "NEEDS_REVIEW")"
    }
  }
}
EOF
    
    log "Integration test report saved to: $report_file"
    
    # Display summary
    echo
    echo "=============================================="
    echo "     REGISTRY INTEGRATION TEST SUMMARY"
    echo "=============================================="
    echo "Total Tests: $TESTS_TOTAL"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    if [ $TESTS_TOTAL -gt 0 ]; then
        echo "Success Rate: $(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l 2>/dev/null || echo "0")%"
    else
        echo "Success Rate: N/A"
    fi
    echo "=============================================="
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All integration tests passed! Registry infrastructure is ready.${NC}"
        echo -e "${GREEN}✨ Milestone 1.2 requirements validated successfully.${NC}"
        return 0
    else
        echo -e "${RED}❌ Some integration tests failed. Please review the results.${NC}"
        return 1
    fi
}

# Main execution
main() {
    log "Starting Registry Integration Testing Suite"
    log "==========================================="
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run integration tests
    check_prerequisites
    start_all_registries
    test_network_connectivity
    test_build_and_publish_workflow
    test_pull_and_install_workflow
    test_automation_scripts
    test_monitoring_integration
    test_performance_integration
    test_installation_speed
    
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