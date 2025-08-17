#!/bin/bash

# Personal Pipeline - Docker Registry Testing Script
# Authored by: QA/Test Engineer Agent
# Date: 2025-01-16
#
# Comprehensive testing script for Docker registry functionality
# Tests: Authentication, Push/Pull, Multi-arch, UI, Performance

set -euo pipefail

# Configuration
REGISTRY_URL="localhost:5000"
REGISTRY_UI_URL="http://localhost:8080"
TEST_IMAGE_NAME="personal-pipeline/test-image"
TEST_USERNAME="testuser"
TEST_PASSWORD="testpass123"
COMPOSE_FILE="docker-compose.registry.yml"

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
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        failure "Docker daemon is not running"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Start registry services
start_registry() {
    log "Starting Docker registry services..."
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        failure "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Create required directories
    mkdir -p registry/{auth,data,cache,backups,config,certs}
    
    # Start services
    if docker-compose -f "$COMPOSE_FILE" up -d; then
        success "Registry services started"
        
        # Wait for services to be ready
        log "Waiting for services to be ready..."
        sleep 30
        
        # Check service health
        check_service_health
    else
        failure "Failed to start registry services"
        exit 1
    fi
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    # Check registry health
    if curl -sf "http://$REGISTRY_URL/v2/" > /dev/null; then
        success "Docker registry is healthy"
    else
        failure "Docker registry health check failed"
    fi
    
    # Check registry UI
    if curl -sf "$REGISTRY_UI_URL" > /dev/null; then
        success "Registry UI is accessible"
    else
        failure "Registry UI is not accessible"
    fi
}

# Test authentication setup
test_authentication() {
    log "Testing authentication setup..."
    
    # Create test user if htpasswd exists
    if command -v htpasswd &> /dev/null; then
        if [ ! -f "registry/auth/htpasswd" ]; then
            mkdir -p registry/auth
            htpasswd -Bbn "$TEST_USERNAME" "$TEST_PASSWORD" > registry/auth/htpasswd
            success "Test user created successfully"
        else
            success "Authentication file already exists"
        fi
    else
        warning "htpasswd not available, skipping user creation"
    fi
    
    # Test registry access without authentication (should fail)
    if ! curl -sf "http://$REGISTRY_URL/v2/_catalog" > /dev/null; then
        success "Registry properly requires authentication"
    else
        warning "Registry allows unauthenticated access"
    fi
}

# Test image operations
test_image_operations() {
    log "Testing image push/pull operations..."
    
    # Create a simple test image
    local test_dir=$(mktemp -d)
    cat > "$test_dir/Dockerfile" << EOF
FROM alpine:3.19
LABEL maintainer="Personal Pipeline Test"
LABEL version="1.0"
RUN echo "Personal Pipeline Test Image" > /test.txt
CMD ["cat", "/test.txt"]
EOF
    
    # Build test image
    if docker build -t "$TEST_IMAGE_NAME:latest" "$test_dir"; then
        success "Test image built successfully"
    else
        failure "Failed to build test image"
        return 1
    fi
    
    # Tag for registry
    local registry_tag="$REGISTRY_URL/$TEST_IMAGE_NAME:latest"
    if docker tag "$TEST_IMAGE_NAME:latest" "$registry_tag"; then
        success "Image tagged for registry"
    else
        failure "Failed to tag image for registry"
        return 1
    fi
    
    # Login to registry (if authentication is configured)
    if [ -f "registry/auth/htpasswd" ]; then
        if echo "$TEST_PASSWORD" | docker login "$REGISTRY_URL" --username "$TEST_USERNAME" --password-stdin; then
            success "Successfully logged into registry"
        else
            failure "Failed to login to registry"
            return 1
        fi
    fi
    
    # Push image
    log "Pushing test image to registry..."
    if docker push "$registry_tag"; then
        success "Image pushed to registry successfully"
    else
        failure "Failed to push image to registry"
        return 1
    fi
    
    # Remove local image
    docker rmi "$registry_tag" "$TEST_IMAGE_NAME:latest" || true
    
    # Pull image back
    log "Pulling test image from registry..."
    if docker pull "$registry_tag"; then
        success "Image pulled from registry successfully"
    else
        failure "Failed to pull image from registry"
        return 1
    fi
    
    # Test image functionality
    if docker run --rm "$registry_tag" | grep -q "Personal Pipeline Test Image"; then
        success "Pulled image functions correctly"
    else
        failure "Pulled image does not function correctly"
    fi
    
    # Cleanup
    rm -rf "$test_dir"
    docker rmi "$registry_tag" || true
}

# Test multi-architecture support
test_multi_arch() {
    log "Testing multi-architecture support..."
    
    # Check if buildx is available
    if docker buildx version &> /dev/null; then
        success "Docker Buildx is available for multi-arch builds"
        
        # Create multi-arch test
        local test_dir=$(mktemp -d)
        cat > "$test_dir/Dockerfile" << EOF
FROM alpine:3.19
RUN uname -m > /arch.txt
CMD ["cat", "/arch.txt"]
EOF
        
        # Build for multiple architectures (if supported)
        local registry_tag="$REGISTRY_URL/$TEST_IMAGE_NAME:multiarch"
        if docker buildx build --platform linux/amd64,linux/arm64 -t "$registry_tag" "$test_dir" --push; then
            success "Multi-architecture build and push successful"
        else
            warning "Multi-architecture build failed (may not be supported in this environment)"
        fi
        
        rm -rf "$test_dir"
    else
        warning "Docker Buildx not available, skipping multi-arch tests"
    fi
}

# Test registry UI functionality
test_registry_ui() {
    log "Testing registry UI functionality..."
    
    # Check UI accessibility
    if curl -sf "$REGISTRY_UI_URL" > /dev/null; then
        success "Registry UI is accessible"
        
        # Check for specific UI elements
        local ui_response=$(curl -s "$REGISTRY_UI_URL")
        if echo "$ui_response" | grep -q "Personal Pipeline Registry"; then
            success "Registry UI shows correct title"
        else
            warning "Registry UI title not found"
        fi
        
        # Check catalog endpoint through UI
        if curl -sf "$REGISTRY_UI_URL/api/v2/_catalog" > /dev/null; then
            success "Registry UI catalog endpoint accessible"
        else
            warning "Registry UI catalog endpoint not accessible"
        fi
    else
        failure "Registry UI is not accessible"
    fi
}

# Test performance
test_performance() {
    log "Testing registry performance..."
    
    local start_time=$(date +%s)
    
    # Test catalog performance
    if curl -sf "http://$REGISTRY_URL/v2/_catalog" > /dev/null; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        if [ $duration -le 2 ]; then
            success "Registry catalog response time: ${duration}s (target: <2s)"
        else
            warning "Registry catalog response time: ${duration}s (exceeds target of 2s)"
        fi
    else
        failure "Registry catalog endpoint not accessible"
    fi
    
    # Test health endpoint performance
    start_time=$(date +%s)
    if curl -sf "http://$REGISTRY_URL/v2/" > /dev/null; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        
        if [ $duration -le 1 ]; then
            success "Registry health check time: ${duration}s (target: <1s)"
        else
            warning "Registry health check time: ${duration}s (exceeds target of 1s)"
        fi
    else
        failure "Registry health endpoint not accessible"
    fi
}

# Test backup functionality
test_backup() {
    log "Testing backup functionality..."
    
    if [ -f "registry/scripts/backup.sh" ]; then
        success "Backup script found"
        
        # Check if backup script is executable
        if [ -x "registry/scripts/backup.sh" ]; then
            success "Backup script is executable"
        else
            warning "Backup script is not executable"
        fi
    else
        warning "Backup script not found"
    fi
    
    # Check backup directory
    if [ -d "registry/backups" ]; then
        success "Backup directory exists"
    else
        warning "Backup directory not found"
    fi
}

# Cleanup function
cleanup() {
    log "Cleaning up test environment..."
    
    # Logout from registry
    docker logout "$REGISTRY_URL" 2>/dev/null || true
    
    # Remove test images
    docker rmi "$REGISTRY_URL/$TEST_IMAGE_NAME:latest" 2>/dev/null || true
    docker rmi "$REGISTRY_URL/$TEST_IMAGE_NAME:multiarch" 2>/dev/null || true
    docker rmi "$TEST_IMAGE_NAME:latest" 2>/dev/null || true
    
    # Stop services if requested
    if [ "${STOP_SERVICES:-false}" = "true" ]; then
        log "Stopping registry services..."
        docker-compose -f "$COMPOSE_FILE" down
    fi
}

# Generate test report
generate_report() {
    log "Generating test report..."
    
    local report_file="test-results-docker-registry-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "test_run": {
    "timestamp": "$(date -Iseconds)",
    "test_type": "docker_registry_validation",
    "environment": "local",
    "registry_url": "$REGISTRY_URL",
    "registry_ui_url": "$REGISTRY_UI_URL"
  },
  "results": {
    "total_tests": $TESTS_TOTAL,
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "success_rate": $(echo "scale=2; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l)
  },
  "test_categories": [
    "prerequisites",
    "service_health",
    "authentication",
    "image_operations",
    "multi_architecture",
    "ui_functionality",
    "performance",
    "backup"
  ]
}
EOF
    
    log "Test report saved to: $report_file"
    
    # Display summary
    echo
    echo "=========================================="
    echo "         DOCKER REGISTRY TEST SUMMARY"
    echo "=========================================="
    echo "Total Tests: $TESTS_TOTAL"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    echo "Success Rate: $(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc -l)%"
    echo "=========================================="
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Registry is ready for use.${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed. Please review the results.${NC}"
        return 1
    fi
}

# Main execution
main() {
    log "Starting Docker Registry Testing Suite"
    log "======================================="
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run tests
    check_prerequisites
    start_registry
    test_authentication
    test_image_operations
    test_multi_arch
    test_registry_ui
    test_performance
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