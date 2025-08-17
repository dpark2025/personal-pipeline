#!/bin/bash

# ==============================================================================
# Personal Pipeline MCP Server - Docker Container Test Script
# ==============================================================================
# Comprehensive testing of Docker container functionality

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default values
IMAGE_NAME="${IMAGE_NAME:-personal-pipeline/mcp-server}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CONTAINER_NAME="${CONTAINER_NAME:-pp-test-container}"
TEST_PORT="${TEST_PORT:-3001}"
TIMEOUT="${TIMEOUT:-60}"
VERBOSE="${VERBOSE:-false}"
CLEANUP="${CLEANUP:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

# ==============================================================================
# Helper Functions
# ==============================================================================
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    cleanup
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

verbose() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] DEBUG: $1${NC}"
    fi
}

test_pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    TEST_RESULTS+=("PASS: $1")
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    TEST_RESULTS+=("FAIL: $1")
    ((TESTS_FAILED++))
}

cleanup() {
    if [[ "${CLEANUP}" == "true" ]]; then
        log "Cleaning up test containers..."
        
        # Stop and remove test container
        docker stop "${CONTAINER_NAME}" 2>/dev/null || true
        docker rm "${CONTAINER_NAME}" 2>/dev/null || true
        
        # Remove test network if exists
        docker network rm pp-test-network 2>/dev/null || true
        
        verbose "Cleanup completed"
    fi
}

wait_for_container() {
    local container_name="$1"
    local timeout="$2"
    local counter=0
    
    verbose "Waiting for container ${container_name} to be ready..."
    
    while [[ $counter -lt $timeout ]]; do
        if docker exec "${container_name}" /usr/local/bin/healthcheck.sh &>/dev/null; then
            verbose "Container is ready after ${counter} seconds"
            return 0
        fi
        
        sleep 1
        ((counter++))
    done
    
    return 1
}

# ==============================================================================
# Usage
# ==============================================================================
usage() {
    cat << EOF
Personal Pipeline MCP Server - Docker Container Test Script

Usage: $0 [OPTIONS]

OPTIONS:
    -i, --image IMAGE      Image name (default: personal-pipeline/mcp-server)
    -t, --tag TAG         Image tag (default: latest)
    -n, --name NAME       Container name for testing (default: pp-test-container)
    -p, --port PORT       Test port (default: 3001)
    --timeout SECONDS     Timeout for tests (default: 60)
    --no-cleanup          Don't cleanup containers after tests
    -v, --verbose         Enable verbose output
    -h, --help            Show this help message

EXAMPLES:
    # Basic test
    $0

    # Test specific image
    $0 --image myregistry/pp-server --tag v1.0.0

    # Test with custom port and verbose output
    $0 --port 3005 --verbose

    # Test without cleanup (for debugging)
    $0 --no-cleanup
EOF
}

# ==============================================================================
# Parse Arguments
# ==============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--image)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -n|--name)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        -p|--port)
            TEST_PORT="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --no-cleanup)
            CLEANUP="false"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1. Use --help for usage information."
            ;;
    esac
done

# ==============================================================================
# Pre-test Setup
# ==============================================================================
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

log "Starting Docker container tests..."
info "Testing image: ${FULL_IMAGE_NAME}"
info "Container name: ${CONTAINER_NAME}"
info "Test port: ${TEST_PORT}"

# Trap cleanup on exit
trap cleanup EXIT

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    error "Docker is not installed or not in PATH"
fi

# Check if image exists
if ! docker image inspect "${FULL_IMAGE_NAME}" &>/dev/null; then
    error "Image ${FULL_IMAGE_NAME} not found. Build it first with: docker/scripts/build.sh"
fi

# Create test network
docker network create pp-test-network 2>/dev/null || true

# ==============================================================================
# Test 1: Container Startup
# ==============================================================================
log "Test 1: Container startup and basic functionality"

# Start container
verbose "Starting container ${CONTAINER_NAME}..."
docker run -d \
    --name "${CONTAINER_NAME}" \
    --network pp-test-network \
    -p "${TEST_PORT}:3000" \
    -e NODE_ENV=production \
    -e LOG_LEVEL=info \
    "${FULL_IMAGE_NAME}"

if [[ $? -eq 0 ]]; then
    test_pass "Container started successfully"
else
    test_fail "Container failed to start"
    error "Cannot continue tests without running container"
fi

# ==============================================================================
# Test 2: Container Health
# ==============================================================================
log "Test 2: Container health check"

if wait_for_container "${CONTAINER_NAME}" "${TIMEOUT}"; then
    test_pass "Container health check passed"
else
    test_fail "Container health check failed or timed out"
    
    # Show container logs for debugging
    echo "Container logs:"
    docker logs "${CONTAINER_NAME}" --tail 20
fi

# ==============================================================================
# Test 3: Network Connectivity
# ==============================================================================
log "Test 3: Network connectivity"

# Test if port is accessible
if curl -f -s --max-time 10 "http://localhost:${TEST_PORT}/health" > /dev/null; then
    test_pass "Network connectivity test passed"
else
    test_fail "Network connectivity test failed"
fi

# ==============================================================================
# Test 4: API Endpoints
# ==============================================================================
log "Test 4: API endpoint functionality"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s --max-time 10 "http://localhost:${TEST_PORT}/health" || echo "")
if echo "${HEALTH_RESPONSE}" | grep -q '"status":"healthy"'; then
    test_pass "Health endpoint returned expected response"
else
    test_fail "Health endpoint test failed"
    verbose "Health response: ${HEALTH_RESPONSE}"
fi

# Test API sources endpoint
SOURCES_RESPONSE=$(curl -s --max-time 10 "http://localhost:${TEST_PORT}/api/sources" || echo "")
if echo "${SOURCES_RESPONSE}" | grep -q '"sources"'; then
    test_pass "API sources endpoint accessible"
else
    test_fail "API sources endpoint test failed"
    verbose "Sources response: ${SOURCES_RESPONSE}"
fi

# ==============================================================================
# Test 5: Container Resource Usage
# ==============================================================================
log "Test 5: Container resource usage"

# Get container stats
STATS=$(docker stats "${CONTAINER_NAME}" --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}")
if [[ -n "${STATS}" ]]; then
    test_pass "Container resource monitoring working"
    verbose "Container stats: ${STATS}"
else
    test_fail "Container resource monitoring failed"
fi

# ==============================================================================
# Test 6: Container Logs
# ==============================================================================
log "Test 6: Container logging"

# Check if container is producing logs
LOG_COUNT=$(docker logs "${CONTAINER_NAME}" 2>&1 | wc -l)
if [[ ${LOG_COUNT} -gt 0 ]]; then
    test_pass "Container logging working (${LOG_COUNT} log lines)"
else
    test_fail "Container logging test failed"
fi

# ==============================================================================
# Test 7: Signal Handling
# ==============================================================================
log "Test 7: Signal handling and graceful shutdown"

# Send SIGTERM to container
docker stop "${CONTAINER_NAME}" --time 30

# Check if container stopped gracefully
CONTAINER_STATE=$(docker inspect "${CONTAINER_NAME}" --format '{{.State.Status}}')
if [[ "${CONTAINER_STATE}" == "exited" ]]; then
    test_pass "Graceful shutdown test passed"
else
    test_fail "Graceful shutdown test failed (state: ${CONTAINER_STATE})"
fi

# ==============================================================================
# Test 8: File Permissions
# ==============================================================================
log "Test 8: File permissions and security"

# Start container again for file permission tests
docker start "${CONTAINER_NAME}"
wait_for_container "${CONTAINER_NAME}" 30

# Check if running as non-root user
USER_ID=$(docker exec "${CONTAINER_NAME}" id -u)
if [[ "${USER_ID}" != "0" ]]; then
    test_pass "Container running as non-root user (UID: ${USER_ID})"
else
    test_fail "Container running as root user (security risk)"
fi

# Check file permissions
PERMISSIONS=$(docker exec "${CONTAINER_NAME}" ls -la /app/dist/index.js | awk '{print $1}')
if [[ "${PERMISSIONS}" =~ ^-rw.*$ ]]; then
    test_pass "Application files have correct permissions"
else
    test_fail "Application files have incorrect permissions: ${PERMISSIONS}"
fi

# ==============================================================================
# Test Results Summary
# ==============================================================================
log "Test execution completed!"

echo
echo "=============================================="
echo "          TEST RESULTS SUMMARY"
echo "=============================================="
echo "Tests passed: ${TESTS_PASSED}"
echo "Tests failed: ${TESTS_FAILED}"
echo "Total tests:  $((TESTS_PASSED + TESTS_FAILED))"
echo

if [[ ${TESTS_FAILED} -eq 0 ]]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Container is ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED! Review the issues above.${NC}"
    echo
    echo "Failed tests:"
    for result in "${TEST_RESULTS[@]}"; do
        if [[ "${result}" =~ ^FAIL: ]]; then
            echo -e "${RED}  - ${result#FAIL: }${NC}"
        fi
    done
    echo
    echo "Container logs (last 20 lines):"
    docker logs "${CONTAINER_NAME}" --tail 20
    
    exit 1
fi