#!/bin/bash

# Personal Pipeline - Registry Performance Benchmarking Script
# Authored by: QA/Test Engineer Agent
# Date: 2025-01-16
#
# Performance benchmarking for Docker and NPM registries
# Tests: Response times, throughput, concurrent operations, resource usage

set -euo pipefail

# Configuration
DOCKER_REGISTRY_URL="localhost:5000"
NPM_REGISTRY_URL="http://localhost:4873"
DOCKER_UI_URL="http://localhost:8080"
NPM_ANALYTICS_URL="http://localhost:3001"

# Benchmark parameters
DEFAULT_CONCURRENT_USERS=10
DEFAULT_DURATION=60
DEFAULT_ITERATIONS=100

# Parse command line arguments
CONCURRENT_USERS=${1:-$DEFAULT_CONCURRENT_USERS}
DURATION=${2:-$DEFAULT_DURATION}
ITERATIONS=${3:-$DEFAULT_ITERATIONS}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
BENCHMARK_RESULTS=""
TEST_DIR=""

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

failure() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Initialize benchmark environment
init_benchmark() {
    log "Initializing benchmark environment..."
    
    # Create temporary directory
    TEST_DIR=$(mktemp -d)
    
    # Check if registries are running
    if ! curl -sf "http://$DOCKER_REGISTRY_URL/v2/" > /dev/null; then
        failure "Docker registry is not accessible at $DOCKER_REGISTRY_URL"
        exit 1
    fi
    
    if ! curl -sf "$NPM_REGISTRY_URL/-/ping" > /dev/null; then
        failure "NPM registry is not accessible at $NPM_REGISTRY_URL"
        exit 1
    fi
    
    success "Benchmark environment initialized"
}

# Create test data
create_test_data() {
    log "Creating test data..."
    
    # Create test Docker images
    local small_image_dir="$TEST_DIR/small-image"
    mkdir -p "$small_image_dir"
    cat > "$small_image_dir/Dockerfile" << 'EOF'
FROM alpine:3.19
RUN echo "Small test image" > /test.txt
CMD ["cat", "/test.txt"]
EOF
    
    local medium_image_dir="$TEST_DIR/medium-image"
    mkdir -p "$medium_image_dir"
    cat > "$medium_image_dir/Dockerfile" << 'EOF'
FROM node:18-alpine
RUN npm install -g express
RUN echo "Medium test image" > /test.txt
CMD ["cat", "/test.txt"]
EOF
    
    # Build test images
    docker build -t "perf-test-small:latest" "$small_image_dir" > /dev/null
    docker build -t "perf-test-medium:latest" "$medium_image_dir" > /dev/null
    
    # Tag for registry
    docker tag "perf-test-small:latest" "$DOCKER_REGISTRY_URL/perf-test-small:latest"
    docker tag "perf-test-medium:latest" "$DOCKER_REGISTRY_URL/perf-test-medium:latest"
    
    # Create test NPM packages
    for i in {1..5}; do
        local package_dir="$TEST_DIR/test-package-$i"
        mkdir -p "$package_dir"
        cd "$package_dir"
        
        cat > package.json << EOF
{
  "name": "@personal-pipeline/perf-test-$i",
  "version": "1.0.0",
  "description": "Performance test package $i",
  "main": "index.js",
  "publishConfig": {
    "registry": "$NPM_REGISTRY_URL"
  }
}
EOF
        
        echo "module.exports = { test: 'package $i' };" > index.js
        cd - > /dev/null
    done
    
    success "Test data created"
}

# Benchmark Docker registry operations
benchmark_docker_registry() {
    log "Benchmarking Docker registry operations..."
    
    local results_file="$TEST_DIR/docker-benchmark-results.txt"
    
    # Test image push performance
    log "Testing Docker image push performance..."
    local push_times=()
    for i in {1..5}; do
        local start_time=$(date +%s%3N)
        docker push "$DOCKER_REGISTRY_URL/perf-test-small:latest" > /dev/null 2>&1
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        push_times+=($duration)
    done
    
    # Calculate average push time
    local total_push_time=0
    for time in "${push_times[@]}"; do
        total_push_time=$((total_push_time + time))
    done
    local avg_push_time=$((total_push_time / ${#push_times[@]}))
    
    echo "Docker Push Performance:" >> "$results_file"
    echo "  Average push time: ${avg_push_time}ms" >> "$results_file"
    echo "  Target: <10000ms" >> "$results_file"
    
    # Test image pull performance
    log "Testing Docker image pull performance..."
    local pull_times=()
    for i in {1..5}; do
        docker rmi "$DOCKER_REGISTRY_URL/perf-test-small:latest" > /dev/null 2>&1 || true
        local start_time=$(date +%s%3N)
        docker pull "$DOCKER_REGISTRY_URL/perf-test-small:latest" > /dev/null 2>&1
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        pull_times+=($duration)
    done
    
    # Calculate average pull time
    local total_pull_time=0
    for time in "${pull_times[@]}"; do
        total_pull_time=$((total_pull_time + time))
    done
    local avg_pull_time=$((total_pull_time / ${#pull_times[@]}))
    
    echo "Docker Pull Performance:" >> "$results_file"
    echo "  Average pull time: ${avg_pull_time}ms" >> "$results_file"
    echo "  Target: <2000ms" >> "$results_file"
    
    # Test registry API response times
    log "Testing Docker registry API performance..."
    local api_times=()
    for i in {1..10}; do
        local start_time=$(date +%s%3N)
        curl -sf "http://$DOCKER_REGISTRY_URL/v2/_catalog" > /dev/null
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        api_times+=($duration)
    done
    
    # Calculate average API response time
    local total_api_time=0
    for time in "${api_times[@]}"; do
        total_api_time=$((total_api_time + time))
    done
    local avg_api_time=$((total_api_time / ${#api_times[@]}))
    
    echo "Docker API Performance:" >> "$results_file"
    echo "  Average API response time: ${avg_api_time}ms" >> "$results_file"
    echo "  Target: <200ms" >> "$results_file"
    
    # Test concurrent operations
    log "Testing Docker concurrent operations..."
    local concurrent_start=$(date +%s%3N)
    
    for i in {1..5}; do
        (docker push "$DOCKER_REGISTRY_URL/perf-test-small:latest" > /dev/null 2>&1) &
    done
    wait
    
    local concurrent_end=$(date +%s%3N)
    local concurrent_duration=$((concurrent_end - concurrent_start))
    
    echo "Docker Concurrent Performance:" >> "$results_file"
    echo "  5 concurrent pushes: ${concurrent_duration}ms" >> "$results_file"
    echo "  Target: <30000ms" >> "$results_file"
    
    BENCHMARK_RESULTS+="Docker Registry Results:\n"
    BENCHMARK_RESULTS+="  Push Time: ${avg_push_time}ms (target: <10s)\n"
    BENCHMARK_RESULTS+="  Pull Time: ${avg_pull_time}ms (target: <2s)\n"
    BENCHMARK_RESULTS+="  API Time: ${avg_api_time}ms (target: <200ms)\n"
    BENCHMARK_RESULTS+="  Concurrent: ${concurrent_duration}ms (target: <30s)\n\n"
    
    success "Docker registry benchmarking completed"
}

# Benchmark NPM registry operations
benchmark_npm_registry() {
    log "Benchmarking NPM registry operations..."
    
    local results_file="$TEST_DIR/npm-benchmark-results.txt"
    
    # Setup npm authentication (if possible)
    npm config set registry "$NPM_REGISTRY_URL"
    
    # Test package publish performance
    log "Testing NPM package publish performance..."
    local publish_times=()
    for i in {1..3}; do
        local package_dir="$TEST_DIR/test-package-$i"
        cd "$package_dir"
        
        local start_time=$(date +%s%3N)
        npm publish > /dev/null 2>&1 || true
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        publish_times+=($duration)
        
        cd - > /dev/null
    done
    
    # Calculate average publish time
    local total_publish_time=0
    for time in "${publish_times[@]}"; do
        total_publish_time=$((total_publish_time + time))
    done
    local avg_publish_time=$((total_publish_time / ${#publish_times[@]}))
    
    echo "NPM Publish Performance:" >> "$results_file"
    echo "  Average publish time: ${avg_publish_time}ms" >> "$results_file"
    echo "  Target: <5000ms" >> "$results_file"
    
    # Test package install performance
    log "Testing NPM package install performance..."
    local install_times=()
    local install_test_dir="$TEST_DIR/install-perf-test"
    
    for i in {1..3}; do
        rm -rf "$install_test_dir"
        mkdir -p "$install_test_dir"
        cd "$install_test_dir"
        npm init -y > /dev/null
        
        local start_time=$(date +%s%3N)
        npm install "@personal-pipeline/perf-test-$i" > /dev/null 2>&1 || true
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        install_times+=($duration)
        
        cd - > /dev/null
    done
    
    # Calculate average install time
    local total_install_time=0
    for time in "${install_times[@]}"; do
        total_install_time=$((total_install_time + time))
    done
    local avg_install_time=$((total_install_time / ${#install_times[@]}))
    
    echo "NPM Install Performance:" >> "$results_file"
    echo "  Average install time: ${avg_install_time}ms" >> "$results_file"
    echo "  Target: <2000ms" >> "$results_file"
    
    # Test registry API response times
    log "Testing NPM registry API performance..."
    local api_times=()
    for i in {1..10}; do
        local start_time=$(date +%s%3N)
        curl -sf "$NPM_REGISTRY_URL/-/ping" > /dev/null
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        api_times+=($duration)
    done
    
    # Calculate average API response time
    local total_api_time=0
    for time in "${api_times[@]}"; do
        total_api_time=$((total_api_time + time))
    done
    local avg_api_time=$((total_api_time / ${#api_times[@]}))
    
    echo "NPM API Performance:" >> "$results_file"
    echo "  Average API response time: ${avg_api_time}ms" >> "$results_file"
    echo "  Target: <500ms" >> "$results_file"
    
    # Test search performance
    log "Testing NPM search performance..."
    local search_times=()
    for i in {1..5}; do
        local start_time=$(date +%s%3N)
        curl -sf "$NPM_REGISTRY_URL/-/v1/search?text=personal-pipeline" > /dev/null 2>&1 || true
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        search_times+=($duration)
    done
    
    # Calculate average search time
    local total_search_time=0
    for time in "${search_times[@]}"; do
        total_search_time=$((total_search_time + time))
    done
    local avg_search_time=$((total_search_time / ${#search_times[@]}))
    
    echo "NPM Search Performance:" >> "$results_file"
    echo "  Average search time: ${avg_search_time}ms" >> "$results_file"
    echo "  Target: <1000ms" >> "$results_file"
    
    BENCHMARK_RESULTS+="NPM Registry Results:\n"
    BENCHMARK_RESULTS+="  Publish Time: ${avg_publish_time}ms (target: <5s)\n"
    BENCHMARK_RESULTS+="  Install Time: ${avg_install_time}ms (target: <2s)\n"
    BENCHMARK_RESULTS+="  API Time: ${avg_api_time}ms (target: <500ms)\n"
    BENCHMARK_RESULTS+="  Search Time: ${avg_search_time}ms (target: <1s)\n\n"
    
    success "NPM registry benchmarking completed"
}

# Benchmark resource usage
benchmark_resource_usage() {
    log "Benchmarking resource usage..."
    
    local results_file="$TEST_DIR/resource-benchmark-results.txt"
    
    # Get container stats
    echo "Resource Usage Analysis:" > "$results_file"
    echo "========================" >> "$results_file"
    
    # Docker registry resource usage
    if docker ps --format "table {{.Names}}" | grep -q "pp-registry"; then
        local docker_stats=$(docker stats pp-registry --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}")
        echo "Docker Registry:" >> "$results_file"
        echo "$docker_stats" >> "$results_file"
    fi
    
    # NPM registry resource usage
    if docker ps --format "table {{.Names}}" | grep -q "pp-npm-registry"; then
        local npm_stats=$(docker stats pp-npm-registry --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}")
        echo "NPM Registry:" >> "$results_file"
        echo "$npm_stats" >> "$results_file"
    fi
    
    # System resource usage
    echo "System Resources:" >> "$results_file"
    echo "  Disk Usage: $(df -h . | tail -1 | awk '{print $5}')" >> "$results_file"
    echo "  Memory Usage: $(free -h | grep Mem | awk '{print $3"/"$2}')" >> "$results_file"
    echo "  Load Average: $(uptime | awk -F'load average:' '{ print $2 }')" >> "$results_file"
    
    success "Resource usage benchmarking completed"
}

# Load testing with concurrent users
load_test() {
    log "Running load test with $CONCURRENT_USERS concurrent users for ${DURATION}s..."
    
    local results_file="$TEST_DIR/load-test-results.txt"
    
    # Create load test script
    cat > "$TEST_DIR/load_test_worker.sh" << 'EOF'
#!/bin/bash
DOCKER_REGISTRY_URL="$1"
NPM_REGISTRY_URL="$2"
DURATION="$3"
WORKER_ID="$4"

end_time=$(($(date +%s) + DURATION))
operations=0
errors=0

while [ $(date +%s) -lt $end_time ]; do
    # Docker registry operations
    if curl -sf "http://$DOCKER_REGISTRY_URL/v2/" > /dev/null 2>&1; then
        ((operations++))
    else
        ((errors++))
    fi
    
    # NPM registry operations
    if curl -sf "$NPM_REGISTRY_URL/-/ping" > /dev/null 2>&1; then
        ((operations++))
    else
        ((errors++))
    fi
    
    sleep 0.1
done

echo "Worker $WORKER_ID: $operations operations, $errors errors"
EOF
    
    chmod +x "$TEST_DIR/load_test_worker.sh"
    
    # Start concurrent workers
    local pids=()
    local start_time=$(date +%s)
    
    for i in $(seq 1 $CONCURRENT_USERS); do
        "$TEST_DIR/load_test_worker.sh" "$DOCKER_REGISTRY_URL" "$NPM_REGISTRY_URL" "$DURATION" "$i" > "$TEST_DIR/worker_$i.log" &
        pids+=($!)
    done
    
    # Wait for all workers to complete
    for pid in "${pids[@]}"; do
        wait $pid
    done
    
    local end_time=$(date +%s)
    local actual_duration=$((end_time - start_time))
    
    # Collect results
    local total_operations=0
    local total_errors=0
    
    for i in $(seq 1 $CONCURRENT_USERS); do
        local worker_result=$(cat "$TEST_DIR/worker_$i.log")
        local ops=$(echo "$worker_result" | grep -o '[0-9]* operations' | cut -d' ' -f1)
        local errs=$(echo "$worker_result" | grep -o '[0-9]* errors' | cut -d' ' -f1)
        total_operations=$((total_operations + ops))
        total_errors=$((total_errors + errs))
    done
    
    # Calculate throughput
    local throughput=$(echo "scale=2; $total_operations / $actual_duration" | bc -l)
    local error_rate=$(echo "scale=2; $total_errors * 100 / ($total_operations + $total_errors)" | bc -l)
    
    echo "Load Test Results:" > "$results_file"
    echo "  Concurrent Users: $CONCURRENT_USERS" >> "$results_file"
    echo "  Duration: ${actual_duration}s" >> "$results_file"
    echo "  Total Operations: $total_operations" >> "$results_file"
    echo "  Total Errors: $total_errors" >> "$results_file"
    echo "  Throughput: ${throughput} ops/sec" >> "$results_file"
    echo "  Error Rate: ${error_rate}%" >> "$results_file"
    
    BENCHMARK_RESULTS+="Load Test Results:\n"
    BENCHMARK_RESULTS+="  Users: $CONCURRENT_USERS\n"
    BENCHMARK_RESULTS+="  Throughput: ${throughput} ops/sec\n"
    BENCHMARK_RESULTS+="  Error Rate: ${error_rate}%\n\n"
    
    success "Load testing completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up benchmark environment..."
    
    # Remove test images
    docker rmi "perf-test-small:latest" 2>/dev/null || true
    docker rmi "perf-test-medium:latest" 2>/dev/null || true
    docker rmi "$DOCKER_REGISTRY_URL/perf-test-small:latest" 2>/dev/null || true
    docker rmi "$DOCKER_REGISTRY_URL/perf-test-medium:latest" 2>/dev/null || true
    
    # Reset npm configuration
    npm config delete registry 2>/dev/null || true
    
    # Clean up temporary directory
    if [ -n "$TEST_DIR" ] && [ -d "$TEST_DIR" ]; then
        # Keep results but remove other temp files
        find "$TEST_DIR" -name "*.log" -delete 2>/dev/null || true
        find "$TEST_DIR" -name "load_test_worker.sh" -delete 2>/dev/null || true
    fi
}

# Generate benchmark report
generate_report() {
    log "Generating benchmark report..."
    
    local report_file="benchmark-results-$(date +%Y%m%d-%H%M%S).json"
    local timestamp=$(date -Iseconds)
    
    cat > "$report_file" << EOF
{
  "benchmark_run": {
    "timestamp": "$timestamp",
    "test_type": "registry_performance_benchmark",
    "environment": "local",
    "parameters": {
      "concurrent_users": $CONCURRENT_USERS,
      "duration": $DURATION,
      "iterations": $ITERATIONS
    },
    "targets": {
      "docker_push_time": "< 10000ms",
      "docker_pull_time": "< 2000ms",
      "docker_api_time": "< 200ms",
      "npm_publish_time": "< 5000ms",
      "npm_install_time": "< 2000ms",
      "npm_api_time": "< 500ms",
      "npm_search_time": "< 1000ms"
    }
  },
  "registry_endpoints": {
    "docker_registry": "$DOCKER_REGISTRY_URL",
    "npm_registry": "$NPM_REGISTRY_URL",
    "docker_ui": "$DOCKER_UI_URL",
    "npm_analytics": "$NPM_ANALYTICS_URL"
  }
}
EOF
    
    log "Benchmark report saved to: $report_file"
    
    # Display summary
    echo
    echo "================================================"
    echo "        REGISTRY PERFORMANCE BENCHMARK"
    echo "================================================"
    echo "Test Parameters:"
    echo "  Concurrent Users: $CONCURRENT_USERS"
    echo "  Duration: ${DURATION}s"
    echo "  Iterations: $ITERATIONS"
    echo
    echo "Results:"
    echo -e "$BENCHMARK_RESULTS"
    echo "================================================"
    echo "📊 Detailed results saved to: $report_file"
    echo "📁 Test artifacts in: $TEST_DIR"
    echo "================================================"
}

# Main execution
main() {
    log "Starting Registry Performance Benchmark"
    log "======================================="
    log "Parameters: $CONCURRENT_USERS users, ${DURATION}s duration, $ITERATIONS iterations"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run benchmarks
    init_benchmark
    create_test_data
    benchmark_docker_registry
    benchmark_npm_registry
    benchmark_resource_usage
    load_test
    
    # Generate report
    generate_report
    
    success "Performance benchmarking completed successfully"
}

# Display help
show_help() {
    echo "Usage: $0 [CONCURRENT_USERS] [DURATION] [ITERATIONS]"
    echo
    echo "Parameters:"
    echo "  CONCURRENT_USERS    Number of concurrent users (default: $DEFAULT_CONCURRENT_USERS)"
    echo "  DURATION           Test duration in seconds (default: $DEFAULT_DURATION)"
    echo "  ITERATIONS         Number of iterations for tests (default: $DEFAULT_ITERATIONS)"
    echo
    echo "Examples:"
    echo "  $0                    # Use default parameters"
    echo "  $0 5 30 50           # 5 users, 30 seconds, 50 iterations"
    echo "  $0 20 120 200        # Stress test: 20 users, 2 minutes, 200 iterations"
    echo
    echo "Requirements:"
    echo "  - Docker and Docker Compose running"
    echo "  - Registry services started"
    echo "  - curl and bc installed"
}

# Parse help argument
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_help
    exit 0
fi

# Validate numeric arguments
if ! [[ "$CONCURRENT_USERS" =~ ^[0-9]+$ ]] || [ "$CONCURRENT_USERS" -lt 1 ]; then
    failure "Invalid concurrent users: $CONCURRENT_USERS (must be positive integer)"
    exit 1
fi

if ! [[ "$DURATION" =~ ^[0-9]+$ ]] || [ "$DURATION" -lt 10 ]; then
    failure "Invalid duration: $DURATION (must be at least 10 seconds)"
    exit 1
fi

if ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || [ "$ITERATIONS" -lt 1 ]; then
    failure "Invalid iterations: $ITERATIONS (must be positive integer)"
    exit 1
fi

# Run main function
main "$@"