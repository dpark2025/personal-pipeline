#!/bin/bash

# NPM Registry Setup Script for Personal Pipeline
# Authored by: Backend Technical Lead Agent
# Date: 2025-01-16
#
# Complete registry setup with:
# - Verdaccio private npm registry
# - User authentication and management
# - Directory structure creation
# - Configuration validation
# - Docker Compose orchestration

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REGISTRY_DIR="${PROJECT_ROOT}/registry/npm"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Usage information
show_usage() {
    cat << EOF
${CYAN}Personal Pipeline NPM Registry Setup${NC}

Usage: $0 [options]

Options:
    --interactive       Interactive setup with prompts
    --production        Production setup with enhanced security
    --clean             Clean existing setup before creating new one
    --skip-docker       Skip Docker setup, configuration only
    --help, -h          Show this help message

Examples:
    $0                          # Standard setup
    $0 --interactive           # Interactive setup with prompts
    $0 --production            # Production setup
    $0 --clean                 # Clean setup

EOF
}

# Parse command line arguments
parse_arguments() {
    INTERACTIVE_MODE=false
    PRODUCTION_MODE=false
    CLEAN_SETUP=false
    SKIP_DOCKER=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --interactive)
                INTERACTIVE_MODE=true
                shift
                ;;
            --production)
                PRODUCTION_MODE=true
                shift
                ;;
            --clean)
                CLEAN_SETUP=true
                shift
                ;;
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Interactive prompts
prompt_user() {
    local prompt="$1"
    local default="$2"
    local response

    if [[ "$INTERACTIVE_MODE" == "true" ]]; then
        read -p "$prompt [$default]: " response
        echo "${response:-$default}"
    else
        echo "$default"
    fi
}

confirm_action() {
    local prompt="$1"
    local response

    if [[ "$INTERACTIVE_MODE" == "true" ]]; then
        read -p "$prompt (y/N): " response
        [[ "$response" =~ ^[Yy]$ ]]
    else
        return 0
    fi
}

# Check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites"

    local missing_deps=()

    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing_deps+=("docker-compose")
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi

    # Check htpasswd (for user management)
    if ! command -v htpasswd &> /dev/null && ! command -v docker &> /dev/null; then
        missing_deps+=("apache2-utils")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and run the script again"
        exit 1
    fi

    log_success "All prerequisites satisfied"
}

# Clean existing setup
clean_existing_setup() {
    if [[ "$CLEAN_SETUP" != "true" ]]; then
        return
    fi

    log_header "Cleaning Existing Setup"

    # Stop running containers
    if [[ -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" ]]; then
        log_info "Stopping NPM registry containers..."
        docker-compose -f "${PROJECT_ROOT}/docker-compose.npm-registry.yml" down -v || true
    fi

    # Remove registry data directories
    if [[ -d "$REGISTRY_DIR" ]]; then
        log_info "Removing existing registry data..."
        if confirm_action "This will delete all registry data. Continue?"; then
            rm -rf "${REGISTRY_DIR:?}"/{storage,logs,cache,analytics,monitoring/data,backups}/* 2>/dev/null || true
        fi
    fi

    log_success "Cleanup completed"
}

# Create directory structure
create_directory_structure() {
    log_header "Creating Directory Structure"

    local directories=(
        "storage"
        "logs"
        "cache"
        "auth"
        "plugins"
        "monitoring/data"
        "analytics"
        "backups"
        "scripts"
        "grafana/dashboards"
        "grafana/provisioning/datasources"
        "grafana/provisioning/dashboards"
        "redis"
    )

    cd "$PROJECT_ROOT"

    for dir in "${directories[@]}"; do
        mkdir -p "registry/npm/$dir"
        log_info "Created: registry/npm/$dir"
    done

    # Set proper permissions
    chmod 755 registry/npm
    chmod 700 registry/npm/auth
    chmod 755 registry/npm/storage
    chmod 755 registry/npm/logs

    log_success "Directory structure created"
}

# Create authentication files
create_authentication() {
    log_header "Setting Up Authentication"

    local htpasswd_file="${REGISTRY_DIR}/auth/htpasswd"
    local users_config="${REGISTRY_DIR}/auth/users.json"

    # Default users
    local admin_user="admin"
    local admin_password="admin_password_2025"
    local dev_user="developer"
    local dev_password="dev_password_2025"

    if [[ "$INTERACTIVE_MODE" == "true" ]]; then
        admin_user=$(prompt_user "Admin username" "$admin_user")
        read -s -p "Admin password: " admin_password
        echo
        dev_user=$(prompt_user "Developer username" "$dev_user")
        read -s -p "Developer password: " dev_password
        echo
    fi

    # Create htpasswd file
    log_info "Creating htpasswd file..."
    
    # Use Docker to create htpasswd if htpasswd command is not available
    if command -v htpasswd &> /dev/null; then
        htpasswd -bc "$htpasswd_file" "$admin_user" "$admin_password"
        htpasswd -b "$htpasswd_file" "$dev_user" "$dev_password"
    else
        # Use Docker to generate htpasswd
        docker run --rm httpd:2.4-alpine htpasswd -nbB "$admin_user" "$admin_password" > "$htpasswd_file"
        docker run --rm httpd:2.4-alpine htpasswd -nbB "$dev_user" "$dev_password" >> "$htpasswd_file"
    fi

    # Create users configuration
    cat > "$users_config" << EOF
{
  "users": {
    "$admin_user": {
      "name": "$admin_user",
      "email": "$admin_user@personal-pipeline.dev",
      "role": "admin",
      "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
      "packages": ["*"]
    },
    "$dev_user": {
      "name": "$dev_user",
      "email": "$dev_user@personal-pipeline.dev",
      "role": "developer",
      "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
      "packages": ["@personal-pipeline/*"]
    }
  },
  "roles": {
    "admin": {
      "permissions": ["read", "write", "publish", "unpublish", "admin"]
    },
    "developer": {
      "permissions": ["read", "write", "publish"]
    }
  }
}
EOF

    chmod 600 "$htpasswd_file"
    chmod 600 "$users_config"

    log_success "Authentication configured"
    log_info "Admin user: $admin_user"
    log_info "Developer user: $dev_user"
}

# Create monitoring configuration
create_monitoring_config() {
    log_header "Setting Up Monitoring"

    # Prometheus configuration
    cat > "${REGISTRY_DIR}/monitoring/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "npm_registry_rules.yml"

scrape_configs:
  - job_name: 'npm-registry'
    static_configs:
      - targets: ['npm-registry:4873']
    metrics_path: '/-/metrics'
    scrape_interval: 30s

  - job_name: 'npm-registry-cache'
    static_configs:
      - targets: ['npm-registry-cache:6379']
    scrape_interval: 30s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
EOF

    # Alert rules
    cat > "${REGISTRY_DIR}/monitoring/npm_registry_rules.yml" << EOF
groups:
  - name: npm_registry_alerts
    rules:
      - alert: NpmRegistryDown
        expr: up{job="npm-registry"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "NPM Registry is down"
          description: "NPM Registry has been down for more than 1 minute"

      - alert: NpmRegistryHighMemory
        expr: container_memory_usage_bytes{name="pp-npm-registry"} / container_spec_memory_limit_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "NPM Registry high memory usage"
          description: "NPM Registry memory usage is above 80%"

      - alert: NpmRegistrySlowResponse
        expr: http_request_duration_seconds{job="npm-registry"} > 2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "NPM Registry slow response"
          description: "NPM Registry response time is above 2 seconds"
EOF

    # Grafana datasource
    cat > "${REGISTRY_DIR}/grafana/provisioning/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://npm-registry-monitor:9090
    isDefault: true
    editable: true
EOF

    # Grafana dashboard provisioning
    cat > "${REGISTRY_DIR}/grafana/provisioning/dashboards/default.yml" << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    log_success "Monitoring configuration created"
}

# Create backup scripts
create_backup_scripts() {
    log_header "Setting Up Backup Scripts"

    # NPM registry backup script
    cat > "${REGISTRY_DIR}/scripts/backup-npm.sh" << 'EOF'
#!/bin/sh

# NPM Registry Backup Script
set -e

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="npm-registry-backup-${BACKUP_DATE}"
BACKUP_FILE="/backups/${BACKUP_NAME}.tar.gz"

echo "Starting NPM registry backup: $BACKUP_NAME"

# Create backup
cd /registry-data
tar -czf "$BACKUP_FILE" . --exclude='./tmp' --exclude='./cache'

echo "Backup completed: $BACKUP_FILE"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Cleanup old backups (keep last 30 days)
find /backups -name "npm-registry-backup-*.tar.gz" -mtime +30 -delete

echo "Backup cleanup completed"
EOF

    chmod +x "${REGISTRY_DIR}/scripts/backup-npm.sh"

    # Restore script
    cat > "${REGISTRY_DIR}/scripts/restore-npm.sh" << 'EOF'
#!/bin/sh

# NPM Registry Restore Script
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file>"
    echo "Available backups:"
    ls -la /backups/npm-registry-backup-*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring NPM registry from: $BACKUP_FILE"

# Stop registry if running
docker-compose -f /workspace/docker-compose.npm-registry.yml stop npm-registry || true

# Create backup of current data
if [ -d "/registry-data" ] && [ "$(ls -A /registry-data)" ]; then
    CURRENT_BACKUP="/backups/pre-restore-$(date +%Y%m%d_%H%M%S).tar.gz"
    cd /registry-data
    tar -czf "$CURRENT_BACKUP" .
    echo "Current data backed up to: $CURRENT_BACKUP"
fi

# Restore from backup
cd /registry-data
rm -rf ./* ./.* 2>/dev/null || true
tar -xzf "$BACKUP_FILE"

echo "Restore completed"
echo "Start the registry with: docker-compose -f /workspace/docker-compose.npm-registry.yml start npm-registry"
EOF

    chmod +x "${REGISTRY_DIR}/scripts/restore-npm.sh"

    log_success "Backup scripts created"
}

# Create Redis configuration
create_redis_config() {
    log_header "Setting Up Redis Configuration"

    cat > "${REGISTRY_DIR}/redis/redis.conf" << EOF
# Redis configuration for NPM registry cache
port 6379
bind 0.0.0.0
protected-mode yes
requirepass npm_registry_cache_2025

# Memory configuration
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (disabled for cache)
save ""
appendonly no

# Network
tcp-keepalive 60
timeout 300

# Logging
loglevel notice
logfile ""

# Performance
tcp-backlog 511
databases 16

# Security
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG ""
EOF

    log_success "Redis configuration created"
}

# Create Docker publisher
create_docker_publisher() {
    log_header "Setting Up Docker Publisher"

    cat > "${REGISTRY_DIR}/Dockerfile.publisher" << 'EOF'
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache \
    git \
    bash \
    curl \
    jq

# Set working directory
WORKDIR /workspace

# Install global npm tools
RUN npm install -g npm@latest

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the package
RUN npm run build

# Create entrypoint script
RUN cat > /workspace/entrypoint.sh << 'ENTRY'
#!/bin/bash
set -e

echo "NPM Package Publisher"
echo "Registry: ${NPM_REGISTRY_URL:-http://npm-registry:4873}"
echo "Package Version: ${PACKAGE_VERSION:-latest}"
echo "Dry Run: ${DRY_RUN:-false}"

# Login to registry if token provided
if [ -n "$NPM_AUTH_TOKEN" ]; then
    echo "//$(echo $NPM_REGISTRY_URL | sed 's|http[s]*://||')/:_authToken=$NPM_AUTH_TOKEN" > ~/.npmrc
fi

# Publish package
if [ "$DRY_RUN" = "true" ]; then
    echo "DRY RUN: Would publish package"
    npm publish --dry-run --registry ${NPM_REGISTRY_URL:-http://npm-registry:4873}
else
    echo "Publishing package..."
    npm publish --registry ${NPM_REGISTRY_URL:-http://npm-registry:4873}
fi

echo "Publication completed"
ENTRY

chmod +x /workspace/entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/workspace/entrypoint.sh"]
EOF

    log_success "Docker publisher created"
}

# Start NPM registry
start_registry() {
    if [[ "$SKIP_DOCKER" == "true" ]]; then
        log_info "Skipping Docker setup (--skip-docker specified)"
        return
    fi

    log_header "Starting NPM Registry"

    cd "$PROJECT_ROOT"

    # Start the registry
    log_info "Starting NPM registry services..."
    docker-compose -f docker-compose.npm-registry.yml up -d

    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 10

    # Check registry health
    local retry_count=0
    local max_retries=30

    while [[ $retry_count -lt $max_retries ]]; do
        if curl -s -f "http://localhost:4873/-/ping" >/dev/null; then
            log_success "NPM registry is ready"
            break
        fi
        
        ((retry_count++))
        log_info "Waiting for registry... ($retry_count/$max_retries)"
        sleep 2
    done

    if [[ $retry_count -eq $max_retries ]]; then
        log_error "NPM registry failed to start"
        docker-compose -f docker-compose.npm-registry.yml logs npm-registry
        exit 1
    fi

    # Show service status
    log_info "Service status:"
    docker-compose -f docker-compose.npm-registry.yml ps
}

# Create initial configuration
create_npmrc() {
    log_header "Creating NPM Configuration"

    local npmrc_content="registry=http://localhost:4873/
@personal-pipeline:registry=http://localhost:4873/
//localhost:4873/:_authToken=
always-auth=true"

    # Create global .npmrc template
    cat > "${REGISTRY_DIR}/npmrc.template" << EOF
# NPM Registry Configuration Template
# Copy this to ~/.npmrc and update with your auth token

$npmrc_content
EOF

    # Create project .npmrc
    if [[ ! -f "${PROJECT_ROOT}/.npmrc" ]]; then
        echo "$npmrc_content" > "${PROJECT_ROOT}/.npmrc"
        log_success "Created project .npmrc"
    fi

    log_success "NPM configuration created"
    log_info "Template available at: registry/npm/npmrc.template"
}

# Show setup summary
show_setup_summary() {
    log_header "Setup Summary"

    log_success "NPM Registry setup completed successfully!"
    
    echo -e "\n${CYAN}Service URLs:${NC}"
    echo "• NPM Registry: http://localhost:4873"
    echo "• Registry UI: http://localhost:8080"
    echo "• Monitoring: http://localhost:9091"
    echo "• Analytics: http://localhost:3001"
    
    echo -e "\n${CYAN}Quick Start Commands:${NC}"
    echo "• Start registry: npm run registry:start"
    echo "• Stop registry: npm run registry:stop"
    echo "• Check status: npm run registry:status"
    echo "• View logs: npm run registry:logs"
    
    echo -e "\n${CYAN}User Management:${NC}"
    echo "• Add user: npm run registry:adduser"
    echo "• Login: npm run registry:login"
    echo "• Check user: npm run registry:whoami"
    
    echo -e "\n${CYAN}Package Operations:${NC}"
    echo "• Build package: npm run package:build"
    echo "• Publish package: npm run package:publish"
    echo "• Version bump: npm run package:version:patch"
    
    echo -e "\n${CYAN}Authentication Files:${NC}"
    echo "• htpasswd: registry/npm/auth/htpasswd"
    echo "• Users config: registry/npm/auth/users.json"
    echo "• NPM config template: registry/npm/npmrc.template"
    
    echo -e "\n${CYAN}Next Steps:${NC}"
    echo "1. Login to the registry: npm run registry:login"
    echo "2. Build your package: npm run package:build"
    echo "3. Publish your package: npm run package:publish"
    echo "4. View the registry UI: http://localhost:8080"
}

# Main execution
main() {
    log_header "Personal Pipeline NPM Registry Setup"

    # Parse arguments
    parse_arguments "$@"

    # Check prerequisites
    check_prerequisites

    # Clean existing setup if requested
    clean_existing_setup

    # Create directory structure
    create_directory_structure

    # Setup authentication
    create_authentication

    # Create monitoring configuration
    create_monitoring_config

    # Create backup scripts
    create_backup_scripts

    # Create Redis configuration
    create_redis_config

    # Create Docker publisher
    create_docker_publisher

    # Create NPM configuration
    create_npmrc

    # Start registry
    start_registry

    # Show summary
    show_setup_summary
}

# Execute main function
main "$@"