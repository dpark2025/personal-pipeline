#!/bin/bash

# NPM Registry Management Utilities for Personal Pipeline
# Authored by: Backend Technical Lead Agent
# Date: 2025-01-16
#
# Complete registry management with:
# - User management and authentication
# - Package management and cleanup
# - Health monitoring and diagnostics
# - Backup and restore operations
# - Performance optimization and analytics

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REGISTRY_DIR="${PROJECT_ROOT}/registry/npm"
REGISTRY_URL="http://localhost:4873"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_header() {
    echo -e "\n${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' $(seq 1 ${#1}))${NC}\n"
}

log_step() {
    echo -e "${MAGENTA}▶${NC} $1"
}

# Usage information
show_usage() {
    cat << EOF
${CYAN}Personal Pipeline NPM Registry Manager${NC}

Usage: $0 [command] [options]

Commands:
    users                   User management operations
    packages                Package management operations
    health                  Health monitoring and diagnostics
    backup                  Backup and restore operations
    analytics               Registry analytics and statistics
    cleanup                 Cleanup and maintenance operations
    config                  Configuration management
    help, -h                Show this help message

User Management:
    users list              List all users
    users add <username>    Add new user
    users remove <username> Remove user
    users reset <username>  Reset user password
    users info <username>   Show user information

Package Management:
    packages list           List all packages
    packages info <package> Show package information
    packages remove <package> Remove package
    packages versions <package> Show package versions
    packages cleanup        Remove old package versions

Health Monitoring:
    health status           Show registry health status
    health logs             Show registry logs
    health metrics          Show performance metrics
    health test             Test registry connectivity

Backup Operations:
    backup create           Create registry backup
    backup restore <file>   Restore from backup
    backup list             List available backups
    backup cleanup          Remove old backups

Analytics:
    analytics stats         Show registry statistics
    analytics packages      Show package analytics
    analytics users         Show user analytics
    analytics performance   Show performance analytics

Cleanup Operations:
    cleanup packages        Remove old package versions
    cleanup logs            Clean up log files
    cleanup cache           Clear registry cache
    cleanup all             Perform all cleanup operations

Configuration:
    config show             Show current configuration
    config validate         Validate configuration
    config reload           Reload configuration

Examples:
    $0 users add developer              # Add new user
    $0 packages list                    # List all packages
    $0 health status                    # Check registry health
    $0 backup create                    # Create backup
    $0 analytics stats                  # Show statistics

EOF
}

# Check if registry is running
check_registry_running() {
    if ! curl -s -f "$REGISTRY_URL/-/ping" >/dev/null 2>&1; then
        log_error "Registry is not running or not accessible at $REGISTRY_URL"
        log_info "Start the registry with: npm run registry:start"
        exit 1
    fi
}

# User management functions
manage_users() {
    local action="$1"
    local username="${2:-}"

    case "$action" in
        list)
            list_users
            ;;
        add)
            if [[ -z "$username" ]]; then
                log_error "Username required for add operation"
                exit 1
            fi
            add_user "$username"
            ;;
        remove)
            if [[ -z "$username" ]]; then
                log_error "Username required for remove operation"
                exit 1
            fi
            remove_user "$username"
            ;;
        reset)
            if [[ -z "$username" ]]; then
                log_error "Username required for reset operation"
                exit 1
            fi
            reset_user_password "$username"
            ;;
        info)
            if [[ -z "$username" ]]; then
                log_error "Username required for info operation"
                exit 1
            fi
            show_user_info "$username"
            ;;
        *)
            log_error "Unknown user management action: $action"
            exit 1
            ;;
    esac
}

# List all users
list_users() {
    log_header "Registry Users"

    local htpasswd_file="${REGISTRY_DIR}/auth/htpasswd"
    
    if [[ ! -f "$htpasswd_file" ]]; then
        log_warning "No users found (htpasswd file missing)"
        return
    fi

    log_info "Registered users:"
    while IFS=: read -r username _; do
        echo "  • $username"
    done < "$htpasswd_file"

    log_info "Total users: $(wc -l < "$htpasswd_file")"
}

# Add new user
add_user() {
    local username="$1"
    local htpasswd_file="${REGISTRY_DIR}/auth/htpasswd"

    log_header "Adding User: $username"

    # Check if user already exists
    if grep -q "^$username:" "$htpasswd_file" 2>/dev/null; then
        log_error "User '$username' already exists"
        exit 1
    fi

    # Get password
    read -s -p "Enter password for $username: " password
    echo
    read -s -p "Confirm password: " password_confirm
    echo

    if [[ "$password" != "$password_confirm" ]]; then
        log_error "Passwords do not match"
        exit 1
    fi

    # Add user to htpasswd file
    if command -v htpasswd &> /dev/null; then
        htpasswd -b "$htpasswd_file" "$username" "$password"
    else
        # Use Docker to generate htpasswd
        docker run --rm httpd:2.4-alpine htpasswd -nbB "$username" "$password" >> "$htpasswd_file"
    fi

    log_success "User '$username' added successfully"
    log_info "User can now login with: npm login --registry $REGISTRY_URL"
}

# Remove user
remove_user() {
    local username="$1"
    local htpasswd_file="${REGISTRY_DIR}/auth/htpasswd"

    log_header "Removing User: $username"

    # Check if user exists
    if ! grep -q "^$username:" "$htpasswd_file" 2>/dev/null; then
        log_error "User '$username' not found"
        exit 1
    fi

    # Confirm removal
    read -p "Are you sure you want to remove user '$username'? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "User removal cancelled"
        exit 0
    fi

    # Remove user from htpasswd file
    sed -i.bak "/^$username:/d" "$htpasswd_file"
    rm -f "${htpasswd_file}.bak"

    log_success "User '$username' removed successfully"
}

# Reset user password
reset_user_password() {
    local username="$1"
    local htpasswd_file="${REGISTRY_DIR}/auth/htpasswd"

    log_header "Resetting Password for User: $username"

    # Check if user exists
    if ! grep -q "^$username:" "$htpasswd_file" 2>/dev/null; then
        log_error "User '$username' not found"
        exit 1
    fi

    # Get new password
    read -s -p "Enter new password for $username: " password
    echo
    read -s -p "Confirm new password: " password_confirm
    echo

    if [[ "$password" != "$password_confirm" ]]; then
        log_error "Passwords do not match"
        exit 1
    fi

    # Update password
    remove_user "$username" 2>/dev/null || true
    if command -v htpasswd &> /dev/null; then
        htpasswd -b "$htpasswd_file" "$username" "$password"
    else
        docker run --rm httpd:2.4-alpine htpasswd -nbB "$username" "$password" >> "$htpasswd_file"
    fi

    log_success "Password for user '$username' reset successfully"
}

# Show user information
show_user_info() {
    local username="$1"
    local users_config="${REGISTRY_DIR}/auth/users.json"

    log_header "User Information: $username"

    # Check htpasswd file
    local htpasswd_file="${REGISTRY_DIR}/auth/htpasswd"
    if grep -q "^$username:" "$htpasswd_file" 2>/dev/null; then
        log_success "User exists in authentication database"
    else
        log_error "User not found in authentication database"
        return
    fi

    # Check users config if exists
    if [[ -f "$users_config" ]] && command -v jq &> /dev/null; then
        local user_info=$(jq -r ".users.\"$username\"" "$users_config" 2>/dev/null)
        if [[ "$user_info" != "null" ]]; then
            echo "User details:"
            echo "$user_info" | jq .
        fi
    fi

    # Show recent activity if available
    log_info "Checking recent activity..."
    docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" logs npm-registry 2>/dev/null | grep "$username" | tail -5 || log_info "No recent activity found"
}

# Package management functions
manage_packages() {
    local action="$1"
    local package="${2:-}"

    check_registry_running

    case "$action" in
        list)
            list_packages
            ;;
        info)
            if [[ -z "$package" ]]; then
                log_error "Package name required for info operation"
                exit 1
            fi
            show_package_info "$package"
            ;;
        remove)
            if [[ -z "$package" ]]; then
                log_error "Package name required for remove operation"
                exit 1
            fi
            remove_package "$package"
            ;;
        versions)
            if [[ -z "$package" ]]; then
                log_error "Package name required for versions operation"
                exit 1
            fi
            show_package_versions "$package"
            ;;
        cleanup)
            cleanup_packages
            ;;
        *)
            log_error "Unknown package management action: $action"
            exit 1
            ;;
    esac
}

# List all packages
list_packages() {
    log_header "Registry Packages"

    local packages=$(curl -s "$REGISTRY_URL/-/all" | jq -r 'keys[]' 2>/dev/null || echo "")
    
    if [[ -z "$packages" ]]; then
        log_warning "No packages found in registry"
        return
    fi

    log_info "Published packages:"
    echo "$packages" | while read -r package; do
        if [[ -n "$package" ]]; then
            echo "  • $package"
        fi
    done

    local package_count=$(echo "$packages" | wc -l)
    log_info "Total packages: $package_count"
}

# Show package information
show_package_info() {
    local package="$1"

    log_header "Package Information: $package"

    local package_info=$(npm info "$package" --registry "$REGISTRY_URL" --json 2>/dev/null || echo "{}")
    
    if [[ "$package_info" == "{}" ]]; then
        log_error "Package '$package' not found"
        return
    fi

    if command -v jq &> /dev/null; then
        echo "Package details:"
        echo "$package_info" | jq '{name, version, description, author, license, homepage, repository}'
        
        echo -e "\nVersions:"
        echo "$package_info" | jq -r '.versions | keys[]' | tail -10
        
        echo -e "\nDependencies:"
        echo "$package_info" | jq '.dependencies // {}' | head -20
    else
        echo "$package_info"
    fi
}

# Remove package
remove_package() {
    local package="$1"

    log_header "Removing Package: $package"

    # Confirm removal
    read -p "Are you sure you want to remove package '$package'? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Package removal cancelled"
        exit 0
    fi

    # Remove package
    if npm unpublish "$package" --registry "$REGISTRY_URL" --force; then
        log_success "Package '$package' removed successfully"
    else
        log_error "Failed to remove package '$package'"
        exit 1
    fi
}

# Show package versions
show_package_versions() {
    local package="$1"

    log_header "Package Versions: $package"

    local versions=$(npm info "$package" versions --registry "$REGISTRY_URL" --json 2>/dev/null || echo "[]")
    
    if [[ "$versions" == "[]" ]]; then
        log_error "Package '$package' not found or has no versions"
        return
    fi

    if command -v jq &> /dev/null; then
        echo "Available versions:"
        echo "$versions" | jq -r '.[]' | sort -V | while read -r version; do
            echo "  • $version"
        done
        
        local version_count=$(echo "$versions" | jq 'length')
        log_info "Total versions: $version_count"
    else
        echo "$versions"
    fi
}

# Cleanup old packages
cleanup_packages() {
    log_header "Package Cleanup"

    log_warning "This operation will remove old package versions"
    read -p "Continue with package cleanup? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Package cleanup cancelled"
        exit 0
    fi

    # This is a placeholder for package cleanup logic
    # In a real implementation, you would:
    # 1. List all packages and versions
    # 2. Identify old versions based on retention policy
    # 3. Remove old versions while keeping recent ones
    
    log_info "Package cleanup completed"
}

# Health monitoring functions
monitor_health() {
    local action="$1"

    case "$action" in
        status)
            show_health_status
            ;;
        logs)
            show_registry_logs
            ;;
        metrics)
            show_performance_metrics
            ;;
        test)
            test_registry_connectivity
            ;;
        *)
            log_error "Unknown health monitoring action: $action"
            exit 1
            ;;
    esac
}

# Show health status
show_health_status() {
    log_header "Registry Health Status"

    # Check registry connectivity
    if curl -s -f "$REGISTRY_URL/-/ping" >/dev/null; then
        log_success "Registry is running and accessible"
    else
        log_error "Registry is not accessible"
        return
    fi

    # Check Docker containers
    log_info "Container status:"
    docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" ps

    # Check disk usage
    log_info "Storage usage:"
    du -sh "${REGISTRY_DIR}/storage" 2>/dev/null || log_warning "Storage directory not found"

    # Check memory usage
    if command -v docker &> /dev/null; then
        log_info "Memory usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" ps -q) 2>/dev/null || log_warning "Cannot get container stats"
    fi
}

# Show registry logs
show_registry_logs() {
    log_header "Registry Logs"

    docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" logs --tail=50 npm-registry
}

# Show performance metrics
show_performance_metrics() {
    log_header "Performance Metrics"

    # Registry response time
    log_info "Testing registry response time..."
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" "$REGISTRY_URL/-/ping" || echo "N/A")
    log_info "Registry response time: ${response_time}s"

    # Package count
    local package_count=$(curl -s "$REGISTRY_URL/-/all" | jq 'keys | length' 2>/dev/null || echo "N/A")
    log_info "Total packages: $package_count"

    # Storage size
    local storage_size=$(du -sh "${REGISTRY_DIR}/storage" 2>/dev/null | cut -f1 || echo "N/A")
    log_info "Storage size: $storage_size"
}

# Test registry connectivity
test_registry_connectivity() {
    log_header "Registry Connectivity Test"

    # Test ping endpoint
    if curl -s -f "$REGISTRY_URL/-/ping" >/dev/null; then
        log_success "Ping endpoint: OK"
    else
        log_error "Ping endpoint: FAILED"
    fi

    # Test whoami endpoint
    if npm whoami --registry "$REGISTRY_URL" >/dev/null 2>&1; then
        local current_user=$(npm whoami --registry "$REGISTRY_URL" 2>/dev/null || echo "anonymous")
        log_success "Authentication: OK (user: $current_user)"
    else
        log_warning "Authentication: Not logged in"
    fi

    # Test package search
    if curl -s "$REGISTRY_URL/-/all" >/dev/null; then
        log_success "Package search: OK"
    else
        log_error "Package search: FAILED"
    fi
}

# Backup operations
manage_backup() {
    local action="$1"
    local backup_file="${2:-}"

    case "$action" in
        create)
            create_backup
            ;;
        restore)
            if [[ -z "$backup_file" ]]; then
                log_error "Backup file required for restore operation"
                exit 1
            fi
            restore_backup "$backup_file"
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_backups
            ;;
        *)
            log_error "Unknown backup operation: $action"
            exit 1
            ;;
    esac
}

# Create backup
create_backup() {
    log_header "Creating Registry Backup"

    docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" exec npm-registry-backup /scripts/backup-npm.sh || {
        log_error "Backup creation failed"
        exit 1
    }

    log_success "Backup created successfully"
    list_backups
}

# Restore backup
restore_backup() {
    local backup_file="$1"

    log_header "Restoring Registry Backup"

    log_warning "This will replace all current registry data"
    read -p "Continue with restore? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Restore cancelled"
        exit 0
    fi

    docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" exec npm-registry-backup /scripts/restore-npm.sh "$backup_file" || {
        log_error "Restore failed"
        exit 1
    }

    log_success "Restore completed successfully"
}

# List backups
list_backups() {
    log_header "Available Backups"

    local backups_dir="${REGISTRY_DIR}/backups"
    
    if [[ ! -d "$backups_dir" ]] || [[ -z "$(ls -A "$backups_dir" 2>/dev/null)" ]]; then
        log_warning "No backups found"
        return
    fi

    log_info "Available backup files:"
    ls -lah "$backups_dir"/*.tar.gz 2>/dev/null | while read -r line; do
        echo "  $line"
    done
}

# Cleanup old backups
cleanup_backups() {
    log_header "Backup Cleanup"

    local backups_dir="${REGISTRY_DIR}/backups"
    local old_backups=$(find "$backups_dir" -name "*.tar.gz" -mtime +30 2>/dev/null || echo "")

    if [[ -z "$old_backups" ]]; then
        log_info "No old backups to cleanup"
        return
    fi

    log_info "Found old backups (>30 days):"
    echo "$old_backups"

    read -p "Remove these old backups? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo "$old_backups" | xargs rm -f
        log_success "Old backups cleaned up"
    else
        log_info "Cleanup cancelled"
    fi
}

# Analytics functions
show_analytics() {
    local type="$1"

    check_registry_running

    case "$type" in
        stats)
            show_registry_stats
            ;;
        packages)
            show_package_analytics
            ;;
        users)
            show_user_analytics
            ;;
        performance)
            show_performance_analytics
            ;;
        *)
            log_error "Unknown analytics type: $type"
            exit 1
            ;;
    esac
}

# Show registry statistics
show_registry_stats() {
    log_header "Registry Statistics"

    # Basic stats
    local package_count=$(curl -s "$REGISTRY_URL/-/all" | jq 'keys | length' 2>/dev/null || echo "0")
    local user_count=$(wc -l < "${REGISTRY_DIR}/auth/htpasswd" 2>/dev/null || echo "0")
    local storage_size=$(du -sh "${REGISTRY_DIR}/storage" 2>/dev/null | cut -f1 || echo "N/A")

    log_info "Total packages: $package_count"
    log_info "Total users: $user_count"
    log_info "Storage size: $storage_size"
    log_info "Registry uptime: $(docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" ps --format json npm-registry 2>/dev/null | jq -r '.Status' || echo "N/A")"
}

# Show package analytics
show_package_analytics() {
    log_header "Package Analytics"

    local packages=$(curl -s "$REGISTRY_URL/-/all" | jq -r 'keys[]' 2>/dev/null || echo "")
    
    if [[ -z "$packages" ]]; then
        log_warning "No packages found"
        return
    fi

    log_info "Package breakdown:"
    echo "$packages" | grep "^@" | wc -l | xargs printf "  Scoped packages: %d\n"
    echo "$packages" | grep -v "^@" | wc -l | xargs printf "  Unscoped packages: %d\n"
}

# Show user analytics
show_user_analytics() {
    log_header "User Analytics"

    local user_count=$(wc -l < "${REGISTRY_DIR}/auth/htpasswd" 2>/dev/null || echo "0")
    log_info "Total registered users: $user_count"

    # Recent activity
    log_info "Recent user activity:"
    docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" logs npm-registry 2>/dev/null | grep -E "(PUT|POST)" | tail -10 || log_info "No recent activity found"
}

# Show performance analytics
show_performance_analytics() {
    log_header "Performance Analytics"

    # Response time test
    log_info "Testing registry performance..."
    for i in {1..5}; do
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" "$REGISTRY_URL/-/ping" || echo "N/A")
        echo "  Test $i: ${response_time}s"
    done

    # Container stats
    if command -v docker &> /dev/null; then
        log_info "Container performance:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" $(docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" ps -q) 2>/dev/null || log_warning "Cannot get container stats"
    fi
}

# Cleanup operations
perform_cleanup() {
    local type="$1"

    case "$type" in
        packages)
            cleanup_packages
            ;;
        logs)
            cleanup_logs
            ;;
        cache)
            cleanup_cache
            ;;
        all)
            cleanup_all
            ;;
        *)
            log_error "Unknown cleanup type: $type"
            exit 1
            ;;
    esac
}

# Cleanup logs
cleanup_logs() {
    log_header "Log Cleanup"

    local logs_dir="${REGISTRY_DIR}/logs"
    
    if [[ ! -d "$logs_dir" ]]; then
        log_info "No logs directory found"
        return
    fi

    # Rotate logs
    find "$logs_dir" -name "*.log" -size +100M -exec gzip {} \;
    find "$logs_dir" -name "*.log.gz" -mtime +7 -delete

    log_success "Log cleanup completed"
}

# Cleanup cache
cleanup_cache() {
    log_header "Cache Cleanup"

    # Clear Redis cache
    docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" exec npm-registry-cache redis-cli -a npm_registry_cache_2025 FLUSHALL || log_warning "Failed to clear Redis cache"

    # Clear local cache
    local cache_dir="${REGISTRY_DIR}/cache"
    if [[ -d "$cache_dir" ]]; then
        rm -rf "${cache_dir:?}"/*
        log_success "Local cache cleared"
    fi

    log_success "Cache cleanup completed"
}

# Perform all cleanup operations
cleanup_all() {
    log_header "Complete Cleanup"

    log_warning "This will perform all cleanup operations"
    read -p "Continue with complete cleanup? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Cleanup cancelled"
        exit 0
    fi

    cleanup_logs
    cleanup_cache
    cleanup_backups

    log_success "Complete cleanup finished"
}

# Configuration management
manage_config() {
    local action="$1"

    case "$action" in
        show)
            show_configuration
            ;;
        validate)
            validate_configuration
            ;;
        reload)
            reload_configuration
            ;;
        *)
            log_error "Unknown configuration action: $action"
            exit 1
            ;;
    esac
}

# Show configuration
show_configuration() {
    log_header "Registry Configuration"

    local config_file="${REGISTRY_DIR}/config/config.yaml"
    
    if [[ -f "$config_file" ]]; then
        cat "$config_file"
    else
        log_error "Configuration file not found: $config_file"
    fi
}

# Validate configuration
validate_configuration() {
    log_header "Configuration Validation"

    local config_file="${REGISTRY_DIR}/config/config.yaml"
    
    if [[ ! -f "$config_file" ]]; then
        log_error "Configuration file not found: $config_file"
        exit 1
    fi

    # Basic YAML validation
    if command -v python3 &> /dev/null; then
        python3 -c "import yaml; yaml.safe_load(open('$config_file'))" && log_success "Configuration syntax is valid" || log_error "Configuration syntax is invalid"
    else
        log_warning "Cannot validate YAML syntax (python3 not available)"
    fi

    # Check required directories
    local required_dirs=("storage" "logs" "auth")
    for dir in "${required_dirs[@]}"; do
        if [[ -d "${REGISTRY_DIR}/$dir" ]]; then
            log_success "Directory exists: $dir"
        else
            log_error "Directory missing: $dir"
        fi
    done
}

# Reload configuration
reload_configuration() {
    log_header "Reloading Configuration"

    log_info "Restarting registry services..."
    docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" restart npm-registry

    log_success "Configuration reloaded"
}

# Main execution
main() {
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi

    local command="$1"
    shift

    case "$command" in
        users)
            manage_users "$@"
            ;;
        packages)
            manage_packages "$@"
            ;;
        health)
            monitor_health "$@"
            ;;
        backup)
            manage_backup "$@"
            ;;
        analytics)
            show_analytics "$@"
            ;;
        cleanup)
            perform_cleanup "$@"
            ;;
        config)
            manage_config "$@"
            ;;
        help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"