#!/bin/bash

# Demo Environment Setup Script for Personal Pipeline MCP Server
# 
# Comprehensive one-command demo environment deployment showcasing all
# milestone 1.3 features including caching, performance monitoring,
# health checks, and integrated testing utilities.
#
# Authored by: Integration Specialist (Barry)
# Date: 2025-07-29

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${DEMO_DIR}/demo-setup.log"
REDIS_PORT=${REDIS_PORT:-6379}
SERVER_PORT=${SERVER_PORT:-3000}
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-30}

# Feature flags
SETUP_REDIS=${SETUP_REDIS:-true}
GENERATE_SAMPLE_DATA=${GENERATE_SAMPLE_DATA:-true}
WARM_CACHE=${WARM_CACHE:-true}
RUN_BENCHMARKS=${RUN_BENCHMARKS:-true}
START_MONITORING=${START_MONITORING:-true}
INTERACTIVE_MODE=${INTERACTIVE_MODE:-false}

# Logging setup
exec 1> >(tee -a "${LOG_FILE}")
exec 2> >(tee -a "${LOG_FILE}" >&2)

# Cleanup function
cleanup() {
    local exit_code=$?
    echo
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Demo setup completed successfully!${NC}"
        echo -e "${WHITE}📊 Setup log: ${LOG_FILE}${NC}"
    else
        echo -e "${RED}❌ Demo setup failed!${NC}"
        echo -e "${WHITE}📋 Check log: ${LOG_FILE}${NC}"
    fi
    exit $exit_code
}
trap cleanup EXIT

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# Wait for user input in interactive mode
wait_for_user() {
    if [ "$INTERACTIVE_MODE" = "true" ]; then
        echo -e "${CYAN}Press Enter to continue...${NC}"
        read -r
    fi
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+ first."
        exit 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    local major_version=$(echo "$node_version" | cut -d. -f1)
    if [ "$major_version" -lt 18 ]; then
        log_error "Node.js version $node_version found, but version 18+ required."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm not found. Please install npm."
        exit 1
    fi
    
    # Check if Redis is available (optional)
    local redis_available=false
    if command -v redis-server &> /dev/null || command -v redis-cli &> /dev/null; then
        redis_available=true
    fi
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found. Some features may not work optimally."
        log_info "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    fi
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        log_error "curl not found. Please install curl."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
    log_info "Node.js: $(node --version)"
    log_info "npm: $(npm --version)"
    log_info "Redis available: $redis_available"
    
    if [ "$redis_available" = "false" ] && [ "$SETUP_REDIS" = "true" ]; then
        log_warning "Redis not found. Will run in memory-only cache mode."
        SETUP_REDIS=false
    fi
}

# Setup Redis (if available and requested)
setup_redis() {
    if [ "$SETUP_REDIS" = "false" ]; then
        log_info "Skipping Redis setup (memory-only mode)"
        return 0
    fi
    
    log_step "Setting up Redis for demo..."
    
    # Check if Redis is already running
    if redis-cli -p "$REDIS_PORT" ping &> /dev/null; then
        log_success "Redis already running on port $REDIS_PORT"
        return 0
    fi
    
    # Try to start Redis
    if command -v redis-server &> /dev/null; then
        log_info "Starting Redis server on port $REDIS_PORT..."
        redis-server --port "$REDIS_PORT" --daemonize yes --logfile "${DEMO_DIR}/redis-demo.log" || {
            log_warning "Failed to start Redis server. Falling back to memory-only mode."
            SETUP_REDIS=false
            return 0
        }
        
        # Wait for Redis to start
        local attempts=0
        while [ $attempts -lt 10 ]; do
            if redis-cli -p "$REDIS_PORT" ping &> /dev/null; then
                log_success "Redis server started successfully"
                return 0
            fi
            sleep 1
            ((attempts++))
        done
        
        log_warning "Redis server failed to start properly. Using memory-only mode."
        SETUP_REDIS=false
    else
        log_info "Redis server not available. Using memory-only cache mode."
        SETUP_REDIS=false
    fi
}

# Install dependencies
install_dependencies() {
    log_step "Installing/updating dependencies..."
    
    cd "$DEMO_DIR"
    
    # Check if node_modules exists and is recent enough
    if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
        local last_install=$(stat -c %Y package-lock.json 2>/dev/null || stat -f %m package-lock.json)
        local package_modified=$(stat -c %Y package.json 2>/dev/null || stat -f %m package.json)
        
        if [ "$last_install" -gt "$package_modified" ]; then
            log_info "Dependencies are up to date"
            return 0
        fi
    fi
    
    npm install --silent || {
        log_error "Failed to install dependencies"
        exit 1
    }
    
    log_success "Dependencies installed"
}

# Build the project
build_project() {
    log_step "Building project..."
    
    cd "$DEMO_DIR"
    
    # Check if build is needed
    if [ -d "dist" ] && [ -f "dist/index.js" ]; then
        local last_build=$(stat -c %Y dist/index.js 2>/dev/null || stat -f %m dist/index.js)
        local source_modified=$(find src -name "*.ts" -newer dist/index.js 2>/dev/null | wc -l)
        
        if [ "$source_modified" -eq 0 ]; then
            log_info "Build is up to date"
            return 0
        fi
    fi
    
    npm run build --silent || {
        log_error "Failed to build project"
        exit 1
    }
    
    log_success "Project built successfully"
}

# Generate sample data
generate_sample_data() {
    if [ "$GENERATE_SAMPLE_DATA" = "false" ]; then
        log_info "Skipping sample data generation"
        return 0
    fi
    
    log_step "Generating realistic sample data..."
    
    cd "$DEMO_DIR"
    
    # Check if sample data already exists and is recent
    if [ -d "test-data" ] && [ -f "test-data/generation-summary.json" ]; then
        local last_generated=$(stat -c %Y test-data/generation-summary.json 2>/dev/null || stat -f %m test-data/generation-summary.json)
        local script_modified=$(stat -c %Y scripts/generate-sample-data.js 2>/dev/null || stat -f %m scripts/generate-sample-data.js)
        
        if [ "$last_generated" -gt "$script_modified" ]; then
            log_info "Sample data is up to date"
            return 0
        fi
    fi
    
    npm run generate-sample-data --silent || {
        log_error "Failed to generate sample data"
        exit 1
    }
    
    log_success "Sample data generated"
}

# Create demo configuration
create_demo_config() {
    log_step "Creating demo configuration..."
    
    local config_file="${DEMO_DIR}/config/demo-config.yaml"
    local redis_config=""
    
    if [ "$SETUP_REDIS" = "true" ]; then
        redis_config="
cache:
  enabled: true
  strategy: hybrid
  memory:
    ttl_seconds: 300
    max_keys: 1000
    check_period_seconds: 60
  redis:
    enabled: true
    url: redis://localhost:${REDIS_PORT}
    key_prefix: 'pp_demo:'
    connection_timeout_ms: 5000
    retry_attempts: 3
  content_types:
    runbooks:
      ttl_seconds: 600
    procedures:
      ttl_seconds: 300
    decision_trees:
      ttl_seconds: 900
    knowledge_base:
      ttl_seconds: 1800"
    else
        redis_config="
cache:
  enabled: true
  strategy: memory_only
  memory:
    ttl_seconds: 300
    max_keys: 1000
    check_period_seconds: 60
  redis:
    enabled: false
  content_types:
    runbooks:
      ttl_seconds: 600
    procedures:
      ttl_seconds: 300
    decision_trees:
      ttl_seconds: 900
    knowledge_base:
      ttl_seconds: 1800"
    fi
    
    cat > "$config_file" << EOF
# Demo Configuration for Personal Pipeline MCP Server
# Generated by setup-demo.sh on $(date)

server:
  port: ${SERVER_PORT}
  host: localhost
  log_level: info
  cache_ttl_seconds: 300
  max_concurrent_requests: 100
  request_timeout_ms: 30000
  health_check_interval_ms: 30000

# Documentation sources configuration
sources:
  - name: demo-runbooks
    type: file
    base_url: ./test-data/runbooks
    refresh_interval: 5m
    priority: 1
    enabled: true
    timeout_ms: 5000
    max_retries: 2

  - name: demo-knowledge-base
    type: file
    base_url: ./test-data/knowledge-base
    refresh_interval: 10m
    priority: 2
    enabled: true
    timeout_ms: 5000
    max_retries: 2

  - name: demo-docs
    type: file
    base_url: ./docs
    refresh_interval: 15m
    priority: 3
    enabled: true
    timeout_ms: 5000
    max_retries: 2

# Performance monitoring
performance:
  enabled: true
  window_size_ms: 300000  # 5 minutes
  max_samples: 1000
  realtime_monitoring: true
  monitoring_interval_ms: 5000

# Health monitoring  
monitoring:
  enabled: true
  check_interval_ms: 30000
  alert_retention_hours: 4
  max_active_alerts: 25
  notification_channels:
    console: true
${redis_config}

# Embedding configuration for semantic search
embedding:
  enabled: true
  model: sentence-transformers/all-MiniLM-L6-v2
  cache_size: 500

# Circuit breaker configuration
circuit_breaker:
  enabled: true
  failure_threshold: 5
  recovery_timeout_ms: 30000
  monitor_interval_ms: 10000
EOF
    
    log_success "Demo configuration created: $config_file"
}

# Start the MCP server
start_server() {
    log_step "Starting MCP server..."
    
    cd "$DEMO_DIR"
    
    # Check if server is already running
    if curl -s "http://localhost:${SERVER_PORT}/health" &> /dev/null; then
        log_info "Server already running on port $SERVER_PORT"
        return 0
    fi
    
    # Set demo configuration
    export PP_CONFIG_FILE="${DEMO_DIR}/config/demo-config.yaml"
    
    # Start server in background
    npm start &> "${DEMO_DIR}/server-demo.log" &
    local server_pid=$!
    
    # Wait for server to start
    log_info "Waiting for server to start (PID: $server_pid)..."
    local attempts=0
    while [ $attempts -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -s "http://localhost:${SERVER_PORT}/health" &> /dev/null; then
            log_success "MCP server started on http://localhost:${SERVER_PORT}"
            echo "$server_pid" > "${DEMO_DIR}/server.pid"
            return 0
        fi
        sleep 1
        ((attempts++))
        
        # Check if process is still running
        if ! kill -0 $server_pid 2>/dev/null; then
            log_error "Server process died during startup"
            log_info "Check server log: ${DEMO_DIR}/server-demo.log"
            return 1
        fi
    done
    
    log_error "Server failed to start within $HEALTH_CHECK_TIMEOUT seconds"
    kill $server_pid 2>/dev/null || true
    return 1
}

# Warm cache with sample data
warm_cache() {
    if [ "$WARM_CACHE" = "false" ]; then
        log_info "Skipping cache warming"
        return 0
    fi
    
    log_step "Warming cache with sample data..."
    
    # Wait a moment for server to be fully ready
    sleep 2
    
    local warmed_count=0
    local failed_count=0
    
    # Warm cache with some common queries
    local queries=(
        "disk space critical"
        "memory leak"
        "database slow"
        "network issues"
        "ssl certificate"
        "cpu high"
        "security incident"
    )
    
    for query in "${queries[@]}"; do
        if curl -s -X POST "http://localhost:${SERVER_PORT}/api/search" \
           -H "Content-Type: application/json" \
           -d "{\"query\": \"$query\", \"type\": \"runbooks\"}" &> /dev/null; then
            ((warmed_count++))
        else
            ((failed_count++))
        fi
        sleep 0.5  # Brief pause between requests
    done
    
    log_success "Cache warming completed: $warmed_count successful, $failed_count failed"
}

# Run performance benchmarks
run_benchmarks() {
    if [ "$RUN_BENCHMARKS" = "false" ]; then
        log_info "Skipping performance benchmarks"
        return 0
    fi
    
    log_step "Running performance benchmarks..."
    
    cd "$DEMO_DIR"
    
    # Run quick benchmark
    if npm run benchmark:quick --silent; then
        log_success "Performance benchmarks completed"
    else
        log_warning "Performance benchmarks encountered issues"
    fi
    
    wait_for_user
}

# Start monitoring
start_monitoring() {
    if [ "$START_MONITORING" = "false" ]; then
        log_info "Skipping monitoring startup"
        return 0
    fi
    
    log_step "Starting performance and health monitoring..."
    
    # Start health dashboard in background if not in interactive mode
    if [ "$INTERACTIVE_MODE" = "false" ]; then
        nohup npm run health:dashboard:fast &> "${DEMO_DIR}/monitoring-demo.log" &
        echo $! > "${DEMO_DIR}/monitoring.pid"
        log_success "Health monitoring started (background)"
    else
        log_info "Health monitoring can be started with: npm run health:dashboard"
    fi
}

# Validate demo environment
validate_demo() {
    log_step "Validating demo environment..."
    
    local validation_passed=true
    
    # Test server health
    if ! curl -s "http://localhost:${SERVER_PORT}/health" | jq '.status' | grep -q "healthy"; then
        log_error "Server health check failed"
        validation_passed=false
    else
        log_success "Server health check passed"
    fi
    
    # Test cache health
    if ! curl -s "http://localhost:${SERVER_PORT}/health/cache" | jq '.overall_healthy' | grep -q "true"; then
        log_warning "Cache health check failed (may be expected in memory-only mode)"
    else
        log_success "Cache health check passed"
    fi
    
    # Test performance metrics
    if ! curl -s "http://localhost:${SERVER_PORT}/performance" | jq '.response_times' &> /dev/null; then
        log_error "Performance metrics unavailable"
        validation_passed=false
    else
        log_success "Performance metrics available"
    fi
    
    # Test sample data availability
    if ! curl -s "http://localhost:${SERVER_PORT}/api/search" \
         -H "Content-Type: application/json" \
         -d '{"query": "disk space", "type": "runbooks"}' | jq '.results' &> /dev/null; then
        log_error "Sample data search failed"
        validation_passed=false
    else
        log_success "Sample data search working"
    fi
    
    if [ "$validation_passed" = "true" ]; then
        log_success "Demo environment validation passed!"
    else
        log_error "Demo environment validation failed!"
        return 1
    fi
}

# Show demo information
show_demo_info() {
    echo
    echo -e "${WHITE}🎉 Personal Pipeline MCP Server Demo Environment${NC}"
    echo -e "${WHITE}=================================================${NC}"
    echo
    echo -e "${GREEN}✅ Demo Features Available:${NC}"
    echo -e "   🏠 MCP Server: http://localhost:${SERVER_PORT}"
    echo -e "   ❤️  Health Endpoint: http://localhost:${SERVER_PORT}/health"
    echo -e "   📊 Performance Metrics: http://localhost:${SERVER_PORT}/performance"
    echo -e "   🔍 Cache Status: http://localhost:${SERVER_PORT}/health/cache"
    echo -e "   📡 Monitoring Alerts: http://localhost:${SERVER_PORT}/monitoring/alerts"
    echo -e "   🔧 Circuit Breakers: http://localhost:${SERVER_PORT}/circuit-breakers"
    echo
    echo -e "${BLUE}📋 Available npm Scripts:${NC}"
    echo -e "   Health Dashboard:     npm run health:dashboard"
    echo -e "   Performance Monitor:  npm run performance:monitor"
    echo -e "   Load Testing:         npm run load-test"
    echo -e "   Benchmarking:         npm run benchmark"
    echo -e "   MCP Testing:          npm run test-mcp"
    echo
    echo -e "${PURPLE}🧪 Demo Scenarios:${NC}"
    echo -e "   1. Cache Performance: Query same runbooks multiple times"
    echo -e "   2. Load Testing:      npm run load-test:peak"
    echo -e "   3. Health Monitoring: Watch npm run health:dashboard"
    echo -e "   4. Circuit Breakers:  Monitor during high load"
    echo
    if [ "$SETUP_REDIS" = "true" ]; then
        echo -e "${CYAN}🗄️  Redis Cache:${NC}"
        echo -e "   Status: Running on port $REDIS_PORT"
        echo -e "   CLI: redis-cli -p $REDIS_PORT"
    else
        echo -e "${YELLOW}💾 Memory-Only Cache:${NC}"
        echo -e "   Redis not available, using in-memory caching"
    fi
    echo
    echo -e "${WHITE}📁 Important Files:${NC}"
    echo -e "   Configuration: config/demo-config.yaml"
    echo -e "   Server Log:    server-demo.log"
    echo -e "   Setup Log:     demo-setup.log"
    echo -e "   Sample Data:   test-data/"
    echo
    echo -e "${GREEN}🚀 To interact with the demo:${NC}"
    echo -e "   curl http://localhost:${SERVER_PORT}/health"
    echo -e "   curl http://localhost:${SERVER_PORT}/performance"
    echo -e "   npm run test-mcp"
    echo
    echo -e "${RED}🛑 To stop the demo:${NC}"
    echo -e "   ./scripts/stop-demo.sh"
    echo
}

# Main setup function
main() {
    echo -e "${WHITE}🚀 Personal Pipeline MCP Server - Demo Environment Setup${NC}"
    echo -e "${WHITE}=========================================================${NC}"
    echo
    echo -e "${BLUE}This script will set up a complete demo environment showcasing:${NC}"
    echo -e "   • Hybrid caching (Redis + memory) with performance monitoring"
    echo -e "   • Health checks and monitoring with alerting"
    echo -e "   • Circuit breakers and resilience patterns"
    echo -e "   • Performance benchmarking and load testing"
    echo -e "   • Sample runbooks and operational procedures"
    echo
    
    if [ "$INTERACTIVE_MODE" = "true" ]; then
        echo -e "${CYAN}Running in interactive mode. Press Enter to continue through each step.${NC}"
        wait_for_user
    fi
    
    # Setup steps
    check_prerequisites
    setup_redis
    install_dependencies
    build_project
    generate_sample_data
    create_demo_config
    start_server
    warm_cache
    run_benchmarks
    start_monitoring
    validate_demo
    show_demo_info
    
    echo -e "${GREEN}🎉 Demo environment is ready! Enjoy exploring milestone 1.3 features.${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-redis)
            SETUP_REDIS=false
            shift
            ;;
        --no-sample-data)
            GENERATE_SAMPLE_DATA=false
            shift
            ;;
        --no-cache-warming)
            WARM_CACHE=false
            shift
            ;;
        --no-benchmarks)
            RUN_BENCHMARKS=false
            shift
            ;;
        --no-monitoring)
            START_MONITORING=false
            shift
            ;;
        --interactive)
            INTERACTIVE_MODE=true
            shift
            ;;
        --port)
            SERVER_PORT="$2"
            shift 2
            ;;
        --redis-port)
            REDIS_PORT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Options:"
            echo "  --no-redis           Skip Redis setup (memory-only cache)"
            echo "  --no-sample-data     Skip sample data generation"
            echo "  --no-cache-warming   Skip cache warming"
            echo "  --no-benchmarks      Skip performance benchmarks"
            echo "  --no-monitoring      Skip monitoring startup"
            echo "  --interactive        Run in interactive mode"
            echo "  --port PORT          Server port (default: 3000)"
            echo "  --redis-port PORT    Redis port (default: 6379)"
            echo "  --help               Show this help message"
            echo
            echo "Environment Variables:"
            echo "  SETUP_REDIS=false          Disable Redis"
            echo "  GENERATE_SAMPLE_DATA=false Disable sample data"
            echo "  WARM_CACHE=false           Disable cache warming"
            echo "  RUN_BENCHMARKS=false       Disable benchmarks"
            echo "  START_MONITORING=false     Disable monitoring"
            echo "  INTERACTIVE_MODE=true      Enable interactive mode"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main setup
main "$@"