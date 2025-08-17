#!/bin/bash
# Personal Pipeline Registry Backup Script
# Authored by: DevOps Infrastructure Engineer
# Date: 2025-01-16

set -euo pipefail

# Configuration from environment
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
REGISTRY_DATA_PATH="${REGISTRY_DATA_PATH:-/registry-data}"
BACKUP_PATH="${BACKUP_PATH:-/backups}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1"
}

# Install required packages
install_packages() {
    log_info "Installing required packages..."
    apk add --no-cache tar gzip coreutils findutils
}

# Create backup
create_backup() {
    local timestamp=$(date +'%Y%m%d_%H%M%S')
    local backup_name="registry_backup_${timestamp}.tar.gz"
    local backup_file="$BACKUP_PATH/$backup_name"
    
    log_info "Creating backup: $backup_name"
    
    # Ensure backup directory exists
    mkdir -p "$BACKUP_PATH"
    
    # Check if registry data exists
    if [[ ! -d "$REGISTRY_DATA_PATH" ]]; then
        log_error "Registry data path does not exist: $REGISTRY_DATA_PATH"
        return 1
    fi
    
    # Create backup with compression
    log_info "Compressing registry data..."
    tar -czf "$backup_file" -C "$(dirname "$REGISTRY_DATA_PATH")" "$(basename "$REGISTRY_DATA_PATH")"
    
    if [[ $? -eq 0 ]]; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_success "Backup created successfully: $backup_name ($backup_size)"
        
        # Create metadata file
        cat > "$backup_file.info" << EOF
{
  "backup_name": "$backup_name",
  "timestamp": "$timestamp",
  "created_at": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "source_path": "$REGISTRY_DATA_PATH",
  "backup_size": "$backup_size",
  "retention_days": $BACKUP_RETENTION_DAYS
}
EOF
        
        log_info "Backup metadata saved to: $backup_name.info"
    else
        log_error "Failed to create backup"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
    
    if [[ ! -d "$BACKUP_PATH" ]]; then
        log_warning "Backup directory does not exist: $BACKUP_PATH"
        return 0
    fi
    
    local deleted_count=0
    
    # Find and remove old backup files
    while IFS= read -r -d '' file; do
        log_info "Removing old backup: $(basename "$file")"
        rm -f "$file" "$file.info"
        ((deleted_count++))
    done < <(find "$BACKUP_PATH" -name "registry_backup_*.tar.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -print0)
    
    if [[ $deleted_count -gt 0 ]]; then
        log_success "Removed $deleted_count old backup(s)"
    else
        log_info "No old backups to remove"
    fi
}

# List backups
list_backups() {
    log_info "Available backups:"
    
    if [[ ! -d "$BACKUP_PATH" ]]; then
        log_warning "Backup directory does not exist: $BACKUP_PATH"
        return 0
    fi
    
    local backup_count=0
    
    for backup_file in "$BACKUP_PATH"/registry_backup_*.tar.gz; do
        if [[ -f "$backup_file" ]]; then
            local backup_name=$(basename "$backup_file")
            local backup_size=$(du -h "$backup_file" | cut -f1)
            local backup_date=$(stat -c %y "$backup_file" | cut -d' ' -f1)
            
            echo "  - $backup_name ($backup_size, $backup_date)"
            ((backup_count++))
        fi
    done
    
    if [[ $backup_count -eq 0 ]]; then
        log_info "No backups found"
    else
        log_info "Total backups: $backup_count"
    fi
}

# Restore backup
restore_backup() {
    local backup_name="$1"
    local backup_file="$BACKUP_PATH/$backup_name"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_warning "Restoring backup will overwrite existing registry data!"
    log_info "Restoring from: $backup_name"
    
    # Create backup of current data
    if [[ -d "$REGISTRY_DATA_PATH" ]]; then
        local current_backup="$BACKUP_PATH/pre_restore_backup_$(date +'%Y%m%d_%H%M%S').tar.gz"
        log_info "Creating backup of current data: $(basename "$current_backup")"
        tar -czf "$current_backup" -C "$(dirname "$REGISTRY_DATA_PATH")" "$(basename "$REGISTRY_DATA_PATH")"
    fi
    
    # Remove existing data
    rm -rf "$REGISTRY_DATA_PATH"
    
    # Extract backup
    log_info "Extracting backup..."
    tar -xzf "$backup_file" -C "$(dirname "$REGISTRY_DATA_PATH")"
    
    if [[ $? -eq 0 ]]; then
        log_success "Backup restored successfully"
    else
        log_error "Failed to restore backup"
        return 1
    fi
}

# Setup cron job
setup_cron() {
    log_info "Setting up backup cron job..."
    
    # Install cronie if not present
    if ! command -v crond &> /dev/null; then
        apk add --no-cache cronie
    fi
    
    # Create crontab entry
    echo "$BACKUP_SCHEDULE /scripts/backup.sh run" > /tmp/backup-cron
    crontab /tmp/backup-cron
    rm /tmp/backup-cron
    
    # Start cron daemon
    crond -f -d 8 &
    
    log_success "Backup cron job scheduled: $BACKUP_SCHEDULE"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Check if registry data exists
    if [[ ! -d "$REGISTRY_DATA_PATH" ]]; then
        log_error "Registry data path does not exist"
        return 1
    fi
    
    # Check backup directory
    if [[ ! -d "$BACKUP_PATH" ]]; then
        log_warning "Backup directory does not exist, creating..."
        mkdir -p "$BACKUP_PATH"
    fi
    
    # Check disk space
    local available_space=$(df "$BACKUP_PATH" | awk 'NR==2 {print $4}')
    local required_space=$(du -s "$REGISTRY_DATA_PATH" | awk '{print $1}')
    
    if [[ $available_space -lt $((required_space * 2)) ]]; then
        log_warning "Low disk space for backups"
    fi
    
    log_success "Health check passed"
}

# Show usage
show_usage() {
    cat << EOF
Personal Pipeline Registry Backup Script

Usage: $0 [COMMAND]

Commands:
  run                     - Create backup and cleanup old ones
  create                  - Create backup only
  cleanup                 - Cleanup old backups only
  list                    - List available backups
  restore <backup_name>   - Restore from backup
  setup-cron             - Setup automated backups
  health                  - Perform health check
  help                    - Show this help

Environment Variables:
  BACKUP_SCHEDULE         - Cron schedule (default: 0 2 * * *)
  BACKUP_RETENTION_DAYS   - Days to keep backups (default: 30)
  REGISTRY_DATA_PATH      - Path to registry data (default: /registry-data)
  BACKUP_PATH            - Path to store backups (default: /backups)

Examples:
  $0 run                              # Create backup and cleanup
  $0 restore registry_backup_20250116_020000.tar.gz
  $0 list                             # List all backups

EOF
}

# Main execution
main() {
    local command="${1:-help}"
    
    case "$command" in
        run)
            install_packages
            health_check
            create_backup
            cleanup_old_backups
            ;;
        create)
            install_packages
            create_backup
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        list)
            list_backups
            ;;
        restore)
            if [[ $# -ne 2 ]]; then
                log_error "restore command requires backup name"
                show_usage
                exit 1
            fi
            install_packages
            restore_backup "$2"
            ;;
        setup-cron)
            install_packages
            setup_cron
            ;;
        health)
            health_check
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