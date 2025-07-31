#!/bin/bash

# Demo Environment Cleanup Script for Personal Pipeline MCP Server
# 
# Gracefully stops all demo services and cleans up resources
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
NC='\033[0m' # No Color

# Configuration
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_PORT=${SERVER_PORT:-3000}
REDIS_PORT=${REDIS_PORT:-6379}

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

# Stop MCP server
stop_server() {
    log_step "Stopping MCP server..."
    
    local stopped=false
    
    # Try to stop gracefully using PID file
    if [ -f "${DEMO_DIR}/server.pid" ]; then
        local pid=$(cat "${DEMO_DIR}/server.pid")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping server (PID: $pid)..."
            kill "$pid"
            
            # Wait for graceful shutdown
            local attempts=0
            while [ $attempts -lt 10 ]; do
                if ! kill -0 "$pid" 2>/dev/null; then
                    stopped=true
                    break
                fi
                sleep 1
                ((attempts++))
            done
            
            # Force kill if still running
            if ! $stopped && kill -0 "$pid" 2>/dev/null; then
                log_warning "Force stopping server..."
                kill -9 "$pid" 2>/dev/null || true
                stopped=true
            fi
        fi
        rm -f "${DEMO_DIR}/server.pid"
    fi
    
    # Try to stop by port
    if ! $stopped; then
        local pids=$(lsof -ti:$SERVER_PORT 2>/dev/null || true)
        if [ -n "$pids" ]; then
            log_info "Stopping processes on port $SERVER_PORT..."
            echo "$pids" | xargs kill 2>/dev/null || true
            sleep 2
            
            # Force kill if still running
            pids=$(lsof -ti:$SERVER_PORT 2>/dev/null || true)
            if [ -n "$pids" ]; then
                echo "$pids" | xargs kill -9 2>/dev/null || true
            fi
            stopped=true
        fi
    fi
    
    if $stopped; then
        log_success "MCP server stopped"
    else
        log_info "MCP server was not running"
    fi
}

# Stop monitoring processes
stop_monitoring() {
    log_step "Stopping monitoring processes..."
    
    local stopped=false
    
    # Stop monitoring PID
    if [ -f "${DEMO_DIR}/monitoring.pid" ]; then
        local pid=$(cat "${DEMO_DIR}/monitoring.pid")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping monitoring (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            stopped=true
        fi
        rm -f "${DEMO_DIR}/monitoring.pid"
    fi
    
    # Stop any health dashboard processes
    local dashboard_pids=$(pgrep -f "health:dashboard" 2>/dev/null || true)
    if [ -n "$dashboard_pids" ]; then
        log_info "Stopping health dashboard processes..."
        echo "$dashboard_pids" | xargs kill 2>/dev/null || true
        stopped=true
    fi
    
    if $stopped; then
        log_success "Monitoring processes stopped"
    else
        log_info "No monitoring processes were running"
    fi
}

# Clean up cache data
cleanup_cache() {
    log_step "Cleaning up cache data..."
    
    local cleaned=false
    
    # Check if Redis is running and clean cache
    if redis-cli -p "$REDIS_PORT" ping &> /dev/null; then
        log_info "Flushing Redis cache data..."
        
        # Get cache stats before cleanup
        local cache_keys=$(redis-cli -p "$REDIS_PORT" eval "return #redis.call('keys', 'pp_demo:*')" 0 2>/dev/null || echo "0")
        
        # Clear demo-specific cache keys
        if redis-cli -p "$REDIS_PORT" eval "
            local keys = redis.call('keys', 'pp_demo:*')
            if #keys > 0 then
                return redis.call('del', unpack(keys))
            else
                return 0
            end
        " 0 &> /dev/null; then
            log_success "Cleared $cache_keys demo cache keys from Redis"
            cleaned=true
        fi
        
        # Optional: Full cache flush for clean demo environment
        if [ "${1:-}" = "--clean-data" ]; then
            log_info "Performing full Redis cache flush..."
            if redis-cli -p "$REDIS_PORT" flushall &> /dev/null; then
                log_success "Redis cache completely flushed"
                cleaned=true
            fi
        fi
    else
        log_info "Redis not running - skipping cache cleanup"
    fi
    
    # Clean up server-side memory cache via API (if server is running)
    if curl -s "http://localhost:${SERVER_PORT}/health" &> /dev/null; then
        log_info "Resetting server performance metrics and memory cache..."
        
        # Reset performance metrics
        if curl -X POST -s "http://localhost:${SERVER_PORT}/api/performance/reset" &> /dev/null; then
            log_success "Server performance metrics reset"
            cleaned=true
        fi
        
        # If there's a cache reset endpoint, use it
        if curl -X POST -s "http://localhost:${SERVER_PORT}/api/cache/reset" &> /dev/null 2>&1; then
            log_success "Server memory cache reset"
            cleaned=true
        fi
    fi
    
    if $cleaned; then
        log_success "Cache cleanup completed"
    else
        log_info "No cache data to clean"
    fi
}

# Stop Redis (if we started it)
stop_redis() {
    log_step "Stopping demo Redis instance..."
    
    # Check if Redis is running on our demo port
    if redis-cli -p "$REDIS_PORT" ping &> /dev/null; then
        log_info "Stopping Redis on port $REDIS_PORT..."
        redis-cli -p "$REDIS_PORT" shutdown 2>/dev/null || true
        
        # Wait for Redis to stop
        local attempts=0
        while [ $attempts -lt 5 ]; do
            if ! redis-cli -p "$REDIS_PORT" ping &> /dev/null; then
                log_success "Redis stopped"
                return 0
            fi
            sleep 1
            ((attempts++))
        done
        
        log_warning "Redis may still be running"
    else
        log_info "Redis was not running on port $REDIS_PORT"
    fi
}

# Clean up temporary files
cleanup_files() {
    log_step "Cleaning up temporary files..."
    
    local files_cleaned=0
    
    # Remove log files
    for log_file in server-demo.log redis-demo.log monitoring-demo.log demo-setup.log; do
        if [ -f "${DEMO_DIR}/$log_file" ]; then
            rm -f "${DEMO_DIR}/$log_file"
            ((files_cleaned++))
        fi
    done
    
    # Remove PID files
    for pid_file in server.pid monitoring.pid; do
        if [ -f "${DEMO_DIR}/$pid_file" ]; then
            rm -f "${DEMO_DIR}/$pid_file"
            ((files_cleaned++))
        fi
    done
    
    # Remove demo config (keep original config)
    if [ -f "${DEMO_DIR}/config/demo-config.yaml" ]; then
        rm -f "${DEMO_DIR}/config/demo-config.yaml"
        ((files_cleaned++))
    fi
    
    log_success "Cleaned up $files_cleaned temporary files"
}

# Clean up test data (optional)
cleanup_test_data() {
    if [ "${1:-}" = "--clean-data" ]; then
        log_step "Cleaning up test data..."
        
        if [ -d "${DEMO_DIR}/test-data" ]; then
            rm -rf "${DEMO_DIR}/test-data"
            log_success "Test data removed"
        else
            log_info "No test data to clean"
        fi
    fi
}

# Show final status
show_status() {
    echo
    echo -e "${BLUE}📊 Demo Environment Status${NC}"
    echo -e "${BLUE}==========================${NC}"
    
    # Check server status
    if curl -s "http://localhost:${SERVER_PORT}/health" &> /dev/null; then
        echo -e "${YELLOW}⚠️  MCP Server: Still running${NC}"
    else
        echo -e "${GREEN}✅ MCP Server: Stopped${NC}"
    fi
    
    # Check Redis status
    if redis-cli -p "$REDIS_PORT" ping &> /dev/null; then
        echo -e "${YELLOW}⚠️  Redis: Still running${NC}"
    else
        echo -e "${GREEN}✅ Redis: Stopped${NC}"
    fi
    
    # Check for any remaining processes
    local remaining_procs=$(pgrep -f "personal-pipeline\|pp-server\|health:dashboard" 2>/dev/null || true)
    if [ -n "$remaining_procs" ]; then
        echo -e "${YELLOW}⚠️  Related processes still running: $remaining_procs${NC}"
        echo -e "${BLUE}ℹ️  Use 'kill $remaining_procs' to force stop${NC}"
    else
        echo -e "${GREEN}✅ No related processes running${NC}"
    fi
    
    echo
}

# Main cleanup function
main() {
    echo -e "${PURPLE}🛑 Personal Pipeline MCP Server - Demo Environment Cleanup${NC}"
    echo -e "${PURPLE}==========================================================${NC}"
    echo
    
    # Clean cache before stopping services (so we can use API endpoints)
    cleanup_cache "$@"
    
    # Stop services
    stop_server
    stop_monitoring
    stop_redis
    
    # Clean up files and data
    cleanup_files
    cleanup_test_data "$@"
    
    show_status
    
    echo -e "${GREEN}🎉 Demo environment cleanup completed!${NC}"
    echo
    echo -e "${BLUE}ℹ️  To restart the demo: npm run demo:start${NC}"
}

# Parse command line arguments
if [[ "$#" -gt 0 && "$1" == "--help" ]]; then
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  --clean-data    Also remove generated test data and perform full cache flush"
    echo "  --help          Show this help message"
    echo
    echo "Cache Cleanup:"
    echo "  • Always clears demo-specific Redis cache keys (pp_demo:*)"
    echo "  • Resets server performance metrics and memory cache"
    echo "  • With --clean-data: performs complete Redis cache flush"
    echo
    echo "Environment Variables:"
    echo "  SERVER_PORT     Server port to check (default: 3000)" 
    echo "  REDIS_PORT      Redis port to stop (default: 6379)"
    exit 0
fi

# Run main cleanup
main "$@"