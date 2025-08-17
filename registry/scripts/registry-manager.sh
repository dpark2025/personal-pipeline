#!/bin/bash
# Personal Pipeline Registry Management Script
# Authored by: DevOps Infrastructure Engineer
# Date: 2025-01-16

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REGISTRY_URL="${REGISTRY_URL:-localhost:5000}"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.registry.yml"
AUTH_SCRIPT="$SCRIPT_DIR/setup-auth.sh"
BUILD_SCRIPT="$SCRIPT_DIR/build-multiarch.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Docker Compose is available
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        log_error "Docker Compose is not available"
        exit 1
    fi
}

# Initialize registry setup
init_registry() {
    log_info "Initializing Personal Pipeline Registry..."
    
    # Create directory structure
    mkdir -p "$PROJECT_ROOT/registry"/{config,auth,certs,scripts,data,cache,backups}
    
    # Setup authentication
    log_info "Setting up authentication..."
    "$AUTH_SCRIPT" setup
    
    log_success "Registry initialization completed"
}

# Start registry services
start_registry() {
    log_info "Starting Personal Pipeline Registry services..."
    
    cd "$PROJECT_ROOT"
    
    # Check if auth is setup
    if [[ ! -f "$PROJECT_ROOT/registry/auth/htpasswd" ]]; then
        log_warning "Authentication not setup. Running setup..."
        "$AUTH_SCRIPT" setup
    fi
    
    # Start services
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    check_health
    
    log_success "Registry services started successfully"
    show_access_info
}

# Stop registry services
stop_registry() {
    log_info "Stopping Personal Pipeline Registry services..."
    
    cd "$PROJECT_ROOT"
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" down
    
    log_success "Registry services stopped"
}

# Restart registry services
restart_registry() {
    log_info "Restarting Personal Pipeline Registry services..."
    stop_registry
    start_registry
}

# Check service health
check_health() {
    log_info "Checking registry health..."
    
    local registry_health="❌"
    local ui_health="❌"
    
    # Check registry
    if curl -sf "http://$REGISTRY_URL/v2/" &> /dev/null; then
        registry_health="✅"
    fi
    
    # Check UI
    if curl -sf "http://localhost:8080" &> /dev/null; then
        ui_health="✅"
    fi
    
    echo
    echo "Service Health Status:"
    echo "  Registry (${REGISTRY_URL}): $registry_health"
    echo "  Registry UI (localhost:8080): $ui_health"
    echo
    
    if [[ "$registry_health" == "✅" ]]; then
        log_success "Registry is healthy"
        return 0
    else
        log_error "Registry is not healthy"
        return 1
    fi
}

# Show access information
show_access_info() {
    local credentials_file="$PROJECT_ROOT/registry/auth/credentials.txt"
    
    cat << EOF

${GREEN}╔════════════════════════════════════════════════════════════════════════════════╗
║                     Personal Pipeline Registry Access Information                 ║
╚════════════════════════════════════════════════════════════════════════════════════╝${NC}

Registry Endpoints:
  Registry URL:     http://$REGISTRY_URL
  Registry UI:      http://localhost:8080
  
Access Commands:
  Login:            docker login $REGISTRY_URL
  Push Image:       docker push $REGISTRY_URL/image:tag
  Pull Image:       docker pull $REGISTRY_URL/image:tag

EOF

    if [[ -f "$credentials_file" ]]; then
        echo "Default Credentials (from $credentials_file):"
        cat "$credentials_file" | sed 's/^/  /'
        echo
    fi
    
    echo "Management Commands:"
    echo "  List Images:      curl -u username:password http://$REGISTRY_URL/v2/_catalog"
    echo "  List Tags:        curl -u username:password http://$REGISTRY_URL/v2/image/tags/list"
    echo
}

# Show registry status
show_status() {
    log_info "Personal Pipeline Registry Status"
    echo
    
    cd "$PROJECT_ROOT"
    
    # Show running services
    echo "Running Services:"
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps
    echo
    
    # Show health status
    check_health
    
    # Show disk usage
    if [[ -d "$PROJECT_ROOT/registry/data" ]]; then
        local data_size=$(du -sh "$PROJECT_ROOT/registry/data" 2>/dev/null | cut -f1 || echo "Unknown")
        echo "Registry Data Size: $data_size"
    fi
    
    if [[ -d "$PROJECT_ROOT/registry/cache" ]]; then
        local cache_size=$(du -sh "$PROJECT_ROOT/registry/cache" 2>/dev/null | cut -f1 || echo "Unknown")
        echo "Registry Cache Size: $cache_size"
    fi
    
    if [[ -d "$PROJECT_ROOT/registry/backups" ]]; then
        local backup_count=$(find "$PROJECT_ROOT/registry/backups" -name "*.tar.gz" 2>/dev/null | wc -l || echo "0")
        echo "Available Backups: $backup_count"
    fi
    
    echo
}

# List images in registry
list_images() {
    log_info "Listing images in registry..."
    
    # Try to get catalog
    if curl -sf "http://$REGISTRY_URL/v2/_catalog" &> /dev/null; then
        echo "Images in registry:"
        curl -s "http://$REGISTRY_URL/v2/_catalog" | jq -r '.repositories[]?' 2>/dev/null || echo "No images found"
    else
        log_warning "Cannot access registry catalog. Trying with authentication..."
        echo "Please use: curl -u username:password http://$REGISTRY_URL/v2/_catalog"
    fi
}

# Build and push Personal Pipeline image
build_and_push() {
    log_info "Building and pushing Personal Pipeline image..."
    
    # Use the build script
    "$BUILD_SCRIPT" --registry "$REGISTRY_URL" --push --test
    
    log_success "Build and push completed"
}

# Clean registry data
clean_registry() {
    local confirm="${1:-}"
    
    if [[ "$confirm" != "--confirm" ]]; then
        log_warning "This will delete ALL registry data including images and backups!"
        echo "To confirm, run: $0 clean --confirm"
        return 1
    fi
    
    log_info "Cleaning registry data..."
    
    # Stop services first
    stop_registry
    
    # Remove data directories
    rm -rf "$PROJECT_ROOT/registry/data"/*
    rm -rf "$PROJECT_ROOT/registry/cache"/*
    
    log_success "Registry data cleaned"
}

# Show logs
show_logs() {
    local service="${1:-}"
    local follow="${2:-}"
    
    cd "$PROJECT_ROOT"
    
    if [[ -n "$service" ]]; then
        if [[ "$follow" == "--follow" ]]; then
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs -f "$service"
        else
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs "$service"
        fi
    else
        if [[ "$follow" == "--follow" ]]; then
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs -f
        else
            $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs
        fi
    fi
}

# User management
manage_users() {
    local action="$1"
    shift
    
    case "$action" in
        add)
            if [[ $# -ne 2 ]]; then
                log_error "Usage: $0 users add <username> <password>"
                exit 1
            fi
            "$AUTH_SCRIPT" add "$1" "$2"
            ;;
        remove)
            if [[ $# -ne 1 ]]; then
                log_error "Usage: $0 users remove <username>"
                exit 1
            fi
            "$AUTH_SCRIPT" remove "$1"
            ;;
        list)
            "$AUTH_SCRIPT" list
            ;;
        *)
            log_error "Unknown user action: $action"
            echo "Available actions: add, remove, list"
            exit 1
            ;;
    esac
}

# Update registry configuration
update_config() {
    log_info "Updating registry configuration..."
    
    # Restart services to apply config changes
    restart_registry
    
    log_success "Configuration updated"
}

# Show usage
show_usage() {
    cat << EOF
Personal Pipeline Registry Management Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  init                    - Initialize registry setup
  start                   - Start registry services
  stop                    - Stop registry services
  restart                 - Restart registry services
  status                  - Show registry status
  health                  - Check service health
  logs [service] [--follow] - Show logs
  
  images                  - List images in registry
  build                   - Build and push Personal Pipeline image
  
  users <action>          - Manage users (add/remove/list)
    add <user> <pass>     - Add new user
    remove <user>         - Remove user
    list                  - List users
  
  clean [--confirm]       - Clean all registry data
  update-config           - Update configuration and restart
  
  help                    - Show this help

Examples:
  $0 init                           # Initialize registry
  $0 start                          # Start services
  $0 status                         # Check status
  $0 users add developer devpass    # Add user
  $0 build                          # Build and push image
  $0 logs registry --follow         # Follow registry logs

EOF
}

# Main execution
main() {
    local command="${1:-help}"
    
    # Check prerequisites
    check_docker_compose
    
    case "$command" in
        init)
            init_registry
            ;;
        start)
            start_registry
            ;;
        stop)
            stop_registry
            ;;
        restart)
            restart_registry
            ;;
        status)
            show_status
            ;;
        health)
            check_health
            ;;
        logs)
            shift
            show_logs "$@"
            ;;
        images)
            list_images
            ;;
        build)
            build_and_push
            ;;
        users)
            shift
            manage_users "$@"
            ;;
        clean)
            shift
            clean_registry "$@"
            ;;
        update-config)
            update_config
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"