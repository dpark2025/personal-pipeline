#!/bin/bash
# Personal Pipeline Registry Authentication Setup
# Authored by: DevOps Infrastructure Engineer
# Date: 2025-01-16

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AUTH_DIR="$PROJECT_ROOT/registry/auth"
HTPASSWD_FILE="$AUTH_DIR/htpasswd"

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

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
}

# Create auth directory if it doesn't exist
setup_auth_directory() {
    log_info "Setting up authentication directory..."
    mkdir -p "$AUTH_DIR"
    
    # Set proper permissions
    chmod 755 "$AUTH_DIR"
    
    log_success "Authentication directory created at: $AUTH_DIR"
}

# Generate htpasswd file
setup_htpasswd() {
    local username="${1:-}"
    local password="${2:-}"
    local interactive="${3:-true}"
    
    if [[ "$interactive" == "true" ]]; then
        if [[ -z "$username" ]]; then
            read -p "Enter username for registry access: " username
        fi
        
        if [[ -z "$password" ]]; then
            read -s -p "Enter password for $username: " password
            echo
            read -s -p "Confirm password: " password_confirm
            echo
            
            if [[ "$password" != "$password_confirm" ]]; then
                log_error "Passwords do not match"
                exit 1
            fi
        fi
    else
        # Non-interactive mode - use defaults
        username="${username:-admin}"
        password="${password:-$(openssl rand -base64 32)}"
        log_info "Generated password for $username: $password"
        echo "Username: $username" > "$AUTH_DIR/credentials.txt"
        echo "Password: $password" >> "$AUTH_DIR/credentials.txt"
        chmod 600 "$AUTH_DIR/credentials.txt"
    fi
    
    log_info "Creating htpasswd file for user: $username"
    
    # Use Docker to generate htpasswd file (ensures compatibility)
    docker run --rm \
        -v "$AUTH_DIR:/auth" \
        httpd:2.4-alpine \
        htpasswd -Bbn "$username" "$password" > "$HTPASSWD_FILE"
    
    if [[ $? -eq 0 ]]; then
        log_success "htpasswd file created successfully"
        chmod 644 "$HTPASSWD_FILE"
    else
        log_error "Failed to create htpasswd file"
        exit 1
    fi
}

# Add additional user to existing htpasswd file
add_user() {
    local username="$1"
    local password="$2"
    
    if [[ ! -f "$HTPASSWD_FILE" ]]; then
        log_error "htpasswd file does not exist. Run setup first."
        exit 1
    fi
    
    log_info "Adding user: $username"
    
    # Check if user already exists
    if grep -q "^$username:" "$HTPASSWD_FILE"; then
        log_warning "User $username already exists. Updating password..."
        # Remove existing user
        grep -v "^$username:" "$HTPASSWD_FILE" > "$HTPASSWD_FILE.tmp"
        mv "$HTPASSWD_FILE.tmp" "$HTPASSWD_FILE"
    fi
    
    # Add new user
    docker run --rm \
        httpd:2.4-alpine \
        htpasswd -Bbn "$username" "$password" >> "$HTPASSWD_FILE"
    
    if [[ $? -eq 0 ]]; then
        log_success "User $username added successfully"
    else
        log_error "Failed to add user $username"
        exit 1
    fi
}

# Remove user from htpasswd file
remove_user() {
    local username="$1"
    
    if [[ ! -f "$HTPASSWD_FILE" ]]; then
        log_error "htpasswd file does not exist"
        exit 1
    fi
    
    if ! grep -q "^$username:" "$HTPASSWD_FILE"; then
        log_warning "User $username does not exist"
        return 0
    fi
    
    log_info "Removing user: $username"
    
    # Remove user
    grep -v "^$username:" "$HTPASSWD_FILE" > "$HTPASSWD_FILE.tmp"
    mv "$HTPASSWD_FILE.tmp" "$HTPASSWD_FILE"
    
    log_success "User $username removed successfully"
}

# List users in htpasswd file
list_users() {
    if [[ ! -f "$HTPASSWD_FILE" ]]; then
        log_error "htpasswd file does not exist"
        exit 1
    fi
    
    log_info "Registry users:"
    cut -d: -f1 "$HTPASSWD_FILE" | sort
}

# Validate htpasswd file
validate_htpasswd() {
    if [[ ! -f "$HTPASSWD_FILE" ]]; then
        log_error "htpasswd file does not exist"
        exit 1
    fi
    
    log_info "Validating htpasswd file..."
    
    # Check file format
    if ! grep -q ":" "$HTPASSWD_FILE"; then
        log_error "Invalid htpasswd file format"
        exit 1
    fi
    
    local user_count=$(wc -l < "$HTPASSWD_FILE")
    log_success "htpasswd file is valid with $user_count user(s)"
}

# Generate TLS certificates (self-signed)
generate_tls_certs() {
    local cert_dir="$PROJECT_ROOT/registry/certs"
    local hostname="${1:-localhost}"
    
    log_info "Generating self-signed TLS certificates for $hostname..."
    
    mkdir -p "$cert_dir"
    
    # Generate private key
    openssl genrsa -out "$cert_dir/registry.key" 4096
    
    # Generate certificate signing request
    openssl req -new -key "$cert_dir/registry.key" \
        -out "$cert_dir/registry.csr" \
        -subj "/C=US/ST=Local/L=Local/O=Personal Pipeline/CN=$hostname"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 \
        -in "$cert_dir/registry.csr" \
        -signkey "$cert_dir/registry.key" \
        -out "$cert_dir/registry.crt" \
        -extensions SAN \
        -config <(echo "[req]"; echo "distinguished_name=req"; echo "[SAN]"; echo "subjectAltName=DNS:$hostname,DNS:localhost,IP:127.0.0.1")
    
    # Set proper permissions
    chmod 600 "$cert_dir/registry.key"
    chmod 644 "$cert_dir/registry.crt"
    
    # Clean up CSR
    rm "$cert_dir/registry.csr"
    
    log_success "TLS certificates generated in: $cert_dir"
    log_warning "Remember to update docker-compose.registry.yml to enable TLS"
}

# Show usage
show_usage() {
    cat << EOF
Personal Pipeline Registry Authentication Setup

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  setup [username] [password]  - Initial setup with first user (interactive if no args)
  add <username> <password>    - Add new user
  remove <username>            - Remove user
  list                         - List all users
  validate                     - Validate htpasswd file
  tls [hostname]              - Generate self-signed TLS certificates
  help                        - Show this help

Examples:
  $0 setup                     # Interactive setup
  $0 setup admin mypassword    # Non-interactive setup
  $0 add developer devpass     # Add new user
  $0 remove olduser           # Remove user
  $0 list                     # List users
  $0 tls registry.local       # Generate TLS certs for custom hostname

EOF
}

# Main execution
main() {
    local command="${1:-help}"
    
    case "$command" in
        setup)
            check_docker
            setup_auth_directory
            if [[ $# -eq 1 ]]; then
                setup_htpasswd "" "" "true"
            elif [[ $# -eq 3 ]]; then
                setup_htpasswd "$2" "$3" "false"
            else
                log_error "Invalid arguments for setup command"
                show_usage
                exit 1
            fi
            ;;
        add)
            if [[ $# -ne 3 ]]; then
                log_error "add command requires username and password"
                show_usage
                exit 1
            fi
            add_user "$2" "$3"
            ;;
        remove)
            if [[ $# -ne 2 ]]; then
                log_error "remove command requires username"
                show_usage
                exit 1
            fi
            remove_user "$2"
            ;;
        list)
            list_users
            ;;
        validate)
            validate_htpasswd
            ;;
        tls)
            local hostname="${2:-localhost}"
            generate_tls_certs "$hostname"
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