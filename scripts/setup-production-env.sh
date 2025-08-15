#!/bin/bash

# Personal Pipeline - Production Environment Setup Script
# This script automates the production deployment setup process
# Author: Personal Pipeline Team
# Version: 1.0

set -euo pipefail  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PP_USER="pp-service"
PP_HOME="/opt/personal-pipeline"
LOG_DIR="/var/log/personal-pipeline"
SERVICE_NAME="personal-pipeline"

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect OS and package manager
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VERSION=$VERSION_ID
    else
        log_error "Cannot detect operating system"
        exit 1
    fi
    
    log_info "Detected OS: $OS $VERSION"
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        PKG_MANAGER="apt"
        PKG_UPDATE="apt update"
        PKG_INSTALL="apt install -y"
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
        PKG_MANAGER="yum"
        PKG_UPDATE="yum update -y"
        PKG_INSTALL="yum install -y"
    else
        log_warning "Unsupported OS detected. Continuing with manual setup required."
        PKG_MANAGER="manual"
    fi
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check RAM
    TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [[ $TOTAL_RAM -lt 2048 ]]; then
        log_warning "RAM is ${TOTAL_RAM}MB. Recommended minimum is 2048MB."
    else
        log_success "RAM check passed: ${TOTAL_RAM}MB available"
    fi
    
    # Check disk space
    DISK_SPACE=$(df -BG / | awk 'NR==2{print int($4)}')
    if [[ $DISK_SPACE -lt 10 ]]; then
        log_warning "Disk space is ${DISK_SPACE}GB. Recommended minimum is 10GB."
    else
        log_success "Disk space check passed: ${DISK_SPACE}GB available"
    fi
}

# Install Node.js
install_nodejs() {
    log_info "Installing Node.js..."
    
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | cut -c 2-)
        REQUIRED_VERSION="18.0.0"
        
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            log_success "Node.js $NODE_VERSION is already installed and meets requirements"
            return 0
        else
            log_warning "Node.js $NODE_VERSION is installed but outdated. Upgrading..."
        fi
    fi
    
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        $PKG_INSTALL nodejs
    elif [[ "$PKG_MANAGER" == "yum" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        $PKG_INSTALL nodejs npm
    else
        log_error "Please install Node.js >= 18.0.0 manually"
        exit 1
    fi
    
    # Verify installation
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        log_success "Node.js $(node --version) and npm $(npm --version) installed successfully"
    else
        log_error "Node.js installation failed"
        exit 1
    fi
}

# Install Redis
install_redis() {
    log_info "Installing Redis..."
    
    if command -v redis-server >/dev/null 2>&1; then
        log_success "Redis is already installed"
        return 0
    fi
    
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        $PKG_UPDATE
        $PKG_INSTALL redis-server
    elif [[ "$PKG_MANAGER" == "yum" ]]; then
        $PKG_INSTALL epel-release
        $PKG_INSTALL redis
    else
        log_error "Please install Redis manually"
        exit 1
    fi
    
    # Configure Redis for production
    REDIS_CONF="/etc/redis/redis.conf"
    if [[ -f "$REDIS_CONF" ]]; then
        log_info "Configuring Redis for production..."
        
        # Backup original config
        cp "$REDIS_CONF" "${REDIS_CONF}.backup.$(date +%Y%m%d)"
        
        # Apply production settings
        sed -i 's/^# requirepass foobared/requirepass RedisPass123!/' "$REDIS_CONF"
        sed -i 's/^# maxmemory <bytes>/maxmemory 1gb/' "$REDIS_CONF"
        sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' "$REDIS_CONF"
        
        log_warning "Redis password set to 'RedisPass123!' - Change this in production!"
    fi
    
    # Start and enable Redis
    systemctl start redis-server || systemctl start redis
    systemctl enable redis-server || systemctl enable redis
    
    # Test Redis connection
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Redis installed and running successfully"
    else
        log_error "Redis installation or startup failed"
        exit 1
    fi
}

# Install Nginx (optional)
install_nginx() {
    log_info "Installing Nginx (reverse proxy)..."
    
    if command -v nginx >/dev/null 2>&1; then
        log_success "Nginx is already installed"
        return 0
    fi
    
    read -p "Install Nginx for reverse proxy? [y/N]: " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Skipping Nginx installation"
        return 0
    fi
    
    $PKG_INSTALL nginx
    
    systemctl start nginx
    systemctl enable nginx
    
    log_success "Nginx installed and started"
}

# Create application user and directories
setup_user_and_directories() {
    log_info "Creating application user and directories..."
    
    # Create user if doesn't exist
    if ! id "$PP_USER" >/dev/null 2>&1; then
        useradd -m -s /bin/bash "$PP_USER"
        log_success "Created user: $PP_USER"
    else
        log_info "User $PP_USER already exists"
    fi
    
    # Create application directory
    if [[ ! -d "$PP_HOME" ]]; then
        mkdir -p "$PP_HOME"
        chown "$PP_USER:$PP_USER" "$PP_HOME"
        log_success "Created application directory: $PP_HOME"
    else
        log_info "Application directory $PP_HOME already exists"
    fi
    
    # Create log directory
    if [[ ! -d "$LOG_DIR" ]]; then
        mkdir -p "$LOG_DIR"
        chown "$PP_USER:$PP_USER" "$LOG_DIR"
        chmod 755 "$LOG_DIR"
        log_success "Created log directory: $LOG_DIR"
    else
        log_info "Log directory $LOG_DIR already exists"
    fi
}

# Setup application files
setup_application() {
    log_info "Setting up application files..."
    
    # Check if we're in the project directory
    if [[ -f "package.json" && -f "src/index.ts" ]]; then
        log_info "Copying application files from current directory..."
        
        # Copy files (excluding node_modules and .git)
        rsync -av --exclude=node_modules --exclude=.git --exclude=dist . "$PP_HOME/"
        chown -R "$PP_USER:$PP_USER" "$PP_HOME"
        
        # Switch to application directory and install dependencies
        cd "$PP_HOME"
        sudo -u "$PP_USER" npm ci --production
        
        # Build application
        sudo -u "$PP_USER" npm run build
        
        log_success "Application files copied and built"
    else
        log_warning "Not in project directory. You'll need to clone/copy the application manually to $PP_HOME"
        return 0
    fi
}

# Create production configuration
create_production_config() {
    log_info "Creating production configuration..."
    
    CONFIG_DIR="$PP_HOME/config"
    CONFIG_FILE="$CONFIG_DIR/production.yaml"
    
    # Create config directory
    sudo -u "$PP_USER" mkdir -p "$CONFIG_DIR"
    
    # Create production config if it doesn't exist
    if [[ ! -f "$CONFIG_FILE" ]]; then
        cat > "$CONFIG_FILE" << EOF
# Production Configuration for Personal Pipeline
server:
  port: 3000
  host: "0.0.0.0"
  environment: "production"

# Logging configuration
logging:
  level: "info"
  format: "json"
  file: "$LOG_DIR/app.log"

# Cache configuration
cache:
  redis:
    enabled: true
    host: "localhost"
    port: 6379
    password: "\${REDIS_PASSWORD}"
    db: 0
    ttl: 3600
  
  memory:
    enabled: true
    max_items: 1000
    ttl: 1800

# Performance settings
performance:
  max_concurrent_requests: 100
  request_timeout: 30000
  enable_compression: true
  cache_warming: true

# Documentation sources
sources:
  - name: "local-docs"
    type: "filesystem"
    path: "$PP_HOME/docs"
    watch_changes: true
    refresh_interval: "5m"
    priority: 1

# Health monitoring
monitoring:
  enabled: true
  health_check_interval: 30
  performance_tracking: true
EOF
        
        chown "$PP_USER:$PP_USER" "$CONFIG_FILE"
        log_success "Created production configuration: $CONFIG_FILE"
    else
        log_info "Production configuration already exists"
    fi
}

# Create environment file
create_environment_file() {
    log_info "Creating environment file..."
    
    ENV_FILE="$PP_HOME/.env.production"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        cat > "$ENV_FILE" << EOF
# Personal Pipeline Production Environment
NODE_ENV=production
CONFIG_FILE=$PP_HOME/config/production.yaml

# Redis credentials
REDIS_PASSWORD=RedisPass123!

# Security (change these in production!)
JWT_SECRET=$(openssl rand -base64 32)
API_KEY=$(openssl rand -base64 16)

# Monitoring
PROMETHEUS_ENABLED=false
EOF
        
        chmod 600 "$ENV_FILE"
        chown "$PP_USER:$PP_USER" "$ENV_FILE"
        log_success "Created environment file: $ENV_FILE"
        log_warning "Update credentials in $ENV_FILE before production use!"
    else
        log_info "Environment file already exists"
    fi
}

# Create systemd service
create_systemd_service() {
    log_info "Creating systemd service..."
    
    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Personal Pipeline MCP Server
Documentation=https://github.com/your-org/personal-pipeline
After=network.target redis.service
Wants=redis.service

[Service]
Type=simple
User=$PP_USER
Group=$PP_USER
WorkingDirectory=$PP_HOME
Environment=NODE_ENV=production
EnvironmentFile=$PP_HOME/.env.production
ExecStart=/usr/bin/node dist/index.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$PP_HOME $LOG_DIR

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log_success "Created and enabled systemd service: $SERVICE_NAME"
}

# Setup log rotation
setup_log_rotation() {
    log_info "Setting up log rotation..."
    
    LOGROTATE_FILE="/etc/logrotate.d/$SERVICE_NAME"
    
    cat > "$LOGROTATE_FILE" << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $PP_USER $PP_USER
    postrotate
        systemctl reload $SERVICE_NAME
    endscript
}
EOF
    
    log_success "Log rotation configured"
}

# Basic firewall setup
setup_firewall() {
    log_info "Configuring basic firewall..."
    
    if ! command -v ufw >/dev/null 2>&1; then
        log_info "Installing UFW firewall..."
        $PKG_INSTALL ufw
    fi
    
    # Configure firewall rules
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP/HTTPS (if Nginx is installed)
    if command -v nginx >/dev/null 2>&1; then
        ufw allow 80/tcp
        ufw allow 443/tcp
        log_info "Opened HTTP/HTTPS ports for Nginx"
    else
        # Allow direct application access if no reverse proxy
        ufw allow 3000/tcp
        log_info "Opened port 3000 for direct application access"
    fi
    
    # Enable firewall
    ufw --force enable
    
    log_success "Basic firewall configured and enabled"
}

# Validation and testing
validate_installation() {
    log_info "Validating installation..."
    
    # Start the service
    systemctl start "$SERVICE_NAME"
    
    # Wait a moment for startup
    sleep 5
    
    # Check service status
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "Service is running"
    else
        log_error "Service failed to start"
        systemctl status "$SERVICE_NAME"
        return 1
    fi
    
    # Test health endpoint
    log_info "Testing health endpoint..."
    if curl -sf http://localhost:3000/api/health >/dev/null; then
        log_success "Health endpoint responding"
    else
        log_warning "Health endpoint not responding (this may be normal during first startup)"
    fi
    
    # Check Redis connectivity
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Redis connectivity verified"
    else
        log_warning "Redis connectivity issues detected"
    fi
}

# Print summary
print_summary() {
    log_info "Installation Summary"
    echo "===================="
    echo "Application Directory: $PP_HOME"
    echo "Configuration File: $PP_HOME/config/production.yaml"
    echo "Environment File: $PP_HOME/.env.production"
    echo "Log Directory: $LOG_DIR"
    echo "Service Name: $SERVICE_NAME"
    echo ""
    echo "Service Commands:"
    echo "  Start:   sudo systemctl start $SERVICE_NAME"
    echo "  Stop:    sudo systemctl stop $SERVICE_NAME"
    echo "  Status:  sudo systemctl status $SERVICE_NAME"
    echo "  Logs:    sudo journalctl -u $SERVICE_NAME -f"
    echo ""
    echo "Health Check:"
    echo "  curl http://localhost:3000/api/health"
    echo ""
    log_warning "Important Security Notes:"
    echo "1. Update Redis password in $PP_HOME/.env.production"
    echo "2. Configure proper SSL certificates for HTTPS"
    echo "3. Update API credentials for external services"
    echo "4. Review firewall rules for your environment"
    echo ""
    log_success "Production environment setup complete!"
}

# Main execution
main() {
    log_info "Starting Personal Pipeline Production Environment Setup"
    echo "====================================================="
    
    check_root
    detect_os
    check_requirements
    
    # Install system dependencies
    install_nodejs
    install_redis
    install_nginx
    
    # Setup application
    setup_user_and_directories
    setup_application
    create_production_config
    create_environment_file
    
    # Create services
    create_systemd_service
    setup_log_rotation
    setup_firewall
    
    # Validate and test
    validate_installation
    
    # Show summary
    print_summary
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Personal Pipeline Production Environment Setup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --no-nginx     Skip Nginx installation"
        echo "  --no-firewall  Skip firewall configuration"
        echo ""
        echo "This script must be run as root (use sudo)."
        exit 0
        ;;
    --no-nginx)
        SKIP_NGINX=true
        ;;
    --no-firewall)
        SKIP_FIREWALL=true
        ;;
esac

# Execute main function
main "$@"