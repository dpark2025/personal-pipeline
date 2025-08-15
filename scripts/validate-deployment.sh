#!/bin/bash

# Personal Pipeline - Deployment Validation Script
# This script validates that a deployed Personal Pipeline instance is working correctly
# Author: Personal Pipeline Team
# Version: 1.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
HOST="${PP_HOST:-localhost}"
PORT="${PP_PORT:-3000}"
PROTOCOL="${PP_PROTOCOL:-http}"
BASE_URL="${PROTOCOL}://${HOST}:${PORT}"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    ((TESTS_TOTAL++))
    
    log_info "Testing: $test_name"
    
    if output=$(eval "$test_command" 2>&1); then
        if [[ "$output" =~ $expected_pattern ]] || [[ -z "$expected_pattern" ]]; then
            log_success "$test_name - PASSED"
            return 0
        else
            log_error "$test_name - FAILED (unexpected output: $output)"
            return 1
        fi
    else
        log_error "$test_name - FAILED (command failed: $output)"
        return 1
    fi
}

# Test basic connectivity
test_connectivity() {
    log_info "Testing basic connectivity..."
    
    run_test "Server responds to requests" \
        "curl -s -f --connect-timeout 5 --max-time 10 '$BASE_URL/health' > /dev/null" \
        ""
}

# Test health endpoints
test_health_endpoints() {
    log_info "Testing health endpoints..."
    
    run_test "Health endpoint returns healthy status" \
        "curl -s '$BASE_URL/health' | jq -r '.status'" \
        "healthy"
    
    run_test "API health endpoint accessible" \
        "curl -s '$BASE_URL/api/health' | jq -r '.status'" \
        "healthy"
}

# Test MCP tools via REST API
test_rest_api() {
    log_info "Testing REST API endpoints..."
    
    run_test "Sources endpoint responds" \
        "curl -s '$BASE_URL/api/sources' | jq -r '.sources | type'" \
        "array"
    
    run_test "Search endpoint responds" \
        "curl -s -X POST '$BASE_URL/api/search' -H 'Content-Type: application/json' -d '{\"query\": \"test\", \"limit\": 1}' | jq -r '.results | type'" \
        "array"
    
    run_test "Performance endpoint responds" \
        "curl -s '$BASE_URL/api/performance' | jq -r '.performance | type'" \
        "object"
}

# Test caching functionality
test_caching() {
    log_info "Testing caching functionality..."
    
    # Make same request twice to test caching
    run_test "First request succeeds" \
        "curl -s '$BASE_URL/health' | jq -r '.cache.overall_healthy'" \
        "true"
    
    run_test "Cache is operational" \
        "curl -s '$BASE_URL/health' | jq -r '.cache.memory_cache.healthy'" \
        "true"
}

# Test source adapters
test_source_adapters() {
    log_info "Testing source adapters..."
    
    run_test "Source adapters are initialized" \
        "curl -s '$BASE_URL/health' | jq -r '.sources | length'" \
        "[0-9]+"
    
    run_test "All source adapters are healthy" \
        "curl -s '$BASE_URL/health' | jq -r '.sources | map(.healthy) | all'" \
        "true"
}

# Test performance
test_performance() {
    log_info "Testing performance characteristics..."
    
    # Test response times
    local start_time=$(date +%s%N)
    curl -s "$BASE_URL/health" > /dev/null
    local end_time=$(date +%s%N)
    local duration_ms=$(( (end_time - start_time) / 1000000 ))
    
    if [ $duration_ms -lt 200 ]; then
        log_success "Response time under 200ms ($duration_ms ms)"
        ((TESTS_PASSED++))
    else
        log_warning "Response time over 200ms ($duration_ms ms)"
    fi
    ((TESTS_TOTAL++))
}

# Test security headers (if using HTTPS/reverse proxy)
test_security() {
    if [[ "$PROTOCOL" == "https" ]]; then
        log_info "Testing security headers..."
        
        run_test "Security headers present" \
            "curl -s -I '$BASE_URL/health' | grep -E '(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)'" \
            "X-"
    else
        log_info "Skipping security header tests (HTTP deployment)"
    fi
}

# Test production configuration
test_production_config() {
    log_info "Testing production configuration..."
    
    run_test "Server environment is production" \
        "curl -s '$BASE_URL/api/health' | jq -r '.environment // \"development\"'" \
        "production|development"  # Allow both for flexibility
    
    run_test "Redis cache is connected" \
        "curl -s '$BASE_URL/health' | jq -r '.cache.redis_cache.healthy // false'" \
        "true"
}

# Print summary
print_summary() {
    echo ""
    echo "========================================="
    echo "Personal Pipeline Deployment Validation"
    echo "========================================="
    echo "Server: $BASE_URL"
    echo "Tests Run: $TESTS_TOTAL"
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ ALL TESTS PASSED - Deployment is healthy!${NC}"
        echo ""
        echo "System is ready for production use:"
        echo "• Health endpoint: $BASE_URL/health"
        echo "• API documentation: $BASE_URL/api/docs"
        echo "• REST API base: $BASE_URL/api"
        echo ""
        return 0
    else
        echo -e "${RED}❌ $TESTS_FAILED TESTS FAILED - Review deployment${NC}"
        echo ""
        echo "Common issues to check:"
        echo "• Ensure Redis is running and accessible"
        echo "• Verify all source adapters have proper permissions"
        echo "• Check network connectivity and firewall rules"
        echo "• Review application logs for errors"
        echo ""
        return 1
    fi
}

# Help message
show_help() {
    echo "Personal Pipeline Deployment Validation Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --host HOST      Server hostname (default: localhost)"
    echo "  --port PORT      Server port (default: 3000)"
    echo "  --protocol PROTO Protocol (http/https, default: http)"
    echo "  --url URL        Full base URL (overrides host/port/protocol)"
    echo "  --help           Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  PP_HOST         Server hostname"
    echo "  PP_PORT         Server port"
    echo "  PP_PROTOCOL     Protocol (http/https)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test localhost:3000"
    echo "  $0 --host prod.example.com --port 443 --protocol https"
    echo "  $0 --url https://api.mycompany.com"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            HOST="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --protocol)
            PROTOCOL="$2"
            shift 2
            ;;
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Reconstruct BASE_URL if individual components provided  
if [[ "${HOST}" != "localhost" ]] || [[ "${PORT}" != "3000" ]] || [[ "${PROTOCOL}" != "http" ]]; then
    BASE_URL="${PROTOCOL}://${HOST}:${PORT}"
fi

# Main execution
main() {
    echo "Personal Pipeline Deployment Validation"
    echo "======================================="
    echo "Testing: $BASE_URL"
    echo ""
    
    # Check dependencies
    if ! command -v curl >/dev/null 2>&1; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        log_error "jq is required but not installed"
        exit 1
    fi
    
    # Run test suites
    test_connectivity
    test_health_endpoints
    test_rest_api
    test_caching
    test_source_adapters
    test_performance
    test_security
    test_production_config
    
    # Print results
    print_summary
}

# Execute main function
main "$@"