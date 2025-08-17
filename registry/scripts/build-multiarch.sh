#!/bin/bash
# Personal Pipeline Multi-Architecture Build Script
# Authored by: DevOps Infrastructure Engineer
# Date: 2025-01-16

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REGISTRY_URL="${REGISTRY_URL:-localhost:5000}"
IMAGE_NAME="${IMAGE_NAME:-personal-pipeline-mcp}"
VERSION="${VERSION:-latest}"
BUILD_PLATFORMS="${BUILD_PLATFORMS:-linux/amd64,linux/arm64}"
BUILD_CACHE="${BUILD_CACHE:-true}"
PUSH_TO_REGISTRY="${PUSH_TO_REGISTRY:-false}"
BUILDER_NAME="pp-multiarch-builder"

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

# Show build information
show_build_info() {
    cat << EOF

${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗
║                     Personal Pipeline Multi-Architecture Build                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝${NC}

Build Configuration:
  Registry URL:     $REGISTRY_URL
  Image Name:       $IMAGE_NAME
  Version:          $VERSION
  Platforms:        $BUILD_PLATFORMS
  Build Cache:      $BUILD_CACHE
  Push to Registry: $PUSH_TO_REGISTRY
  Builder:          $BUILDER_NAME

Full Image Tag: $REGISTRY_URL/$IMAGE_NAME:$VERSION

EOF
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if buildx is available
    if ! docker buildx version &> /dev/null; then
        log_error "Docker Buildx is not available. Please install Docker Desktop or enable experimental features."
        exit 1
    fi
    
    # Check if we're in the correct directory
    if [[ ! -f "$PROJECT_ROOT/Dockerfile" ]]; then
        log_error "Dockerfile not found in $PROJECT_ROOT"
        exit 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_error "package.json not found in $PROJECT_ROOT"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Setup multi-arch builder
setup_builder() {
    log_info "Setting up multi-architecture builder..."
    
    # Check if builder already exists
    if docker buildx inspect "$BUILDER_NAME" &> /dev/null; then
        log_info "Builder '$BUILDER_NAME' already exists"
        docker buildx use "$BUILDER_NAME"
    else
        log_info "Creating new builder '$BUILDER_NAME'"
        docker buildx create \
            --name "$BUILDER_NAME" \
            --driver docker-container \
            --platform "$BUILD_PLATFORMS" \
            --use
    fi
    
    # Bootstrap the builder
    log_info "Bootstrapping builder..."
    docker buildx inspect "$BUILDER_NAME" --bootstrap
    
    log_success "Builder setup completed"
}

# Build application
build_app() {
    log_info "Building TypeScript application..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Build the application
    log_info "Compiling TypeScript..."
    npm run build
    
    log_success "Application build completed"
}

# Build multi-architecture Docker images
build_docker_images() {
    log_info "Building multi-architecture Docker images..."
    
    cd "$PROJECT_ROOT"
    
    local build_args=(
        "docker" "buildx" "build"
        "--platform" "$BUILD_PLATFORMS"
        "--builder" "$BUILDER_NAME"
        "--tag" "$REGISTRY_URL/$IMAGE_NAME:$VERSION"
        "--tag" "$REGISTRY_URL/$IMAGE_NAME:latest"
    )
    
    # Add cache configuration
    if [[ "$BUILD_CACHE" == "true" ]]; then
        build_args+=(
            "--cache-from" "type=local,src=/tmp/.buildx-cache"
            "--cache-to" "type=local,dest=/tmp/.buildx-cache-new,mode=max"
        )
    fi
    
    # Add build metadata
    build_args+=(
        "--label" "com.personalpipeline.version=$VERSION"
        "--label" "com.personalpipeline.build-date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
        "--label" "com.personalpipeline.vcs-ref=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
        "--label" "com.personalpipeline.platforms=$BUILD_PLATFORMS"
        "--label" "org.opencontainers.image.title=Personal Pipeline MCP Server"
        "--label" "org.opencontainers.image.description=Intelligent MCP server for documentation retrieval and incident response"
        "--label" "org.opencontainers.image.vendor=Personal Pipeline Team"
        "--label" "org.opencontainers.image.version=$VERSION"
        "--label" "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
        "--label" "org.opencontainers.image.revision=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
        "--label" "org.opencontainers.image.source=https://github.com/your-username/personal-pipeline-mcp"
    )
    
    # Add push option if enabled
    if [[ "$PUSH_TO_REGISTRY" == "true" ]]; then
        build_args+=("--push")
        log_info "Images will be pushed to registry"
    else
        build_args+=("--load")
        log_warning "Images will be loaded locally (single platform only)"
    fi
    
    # Add Dockerfile path
    build_args+=(".")
    
    log_info "Building with command:"
    echo "  ${build_args[*]}"
    echo
    
    # Execute build
    "${build_args[@]}"
    
    # Move cache (if using cache)
    if [[ "$BUILD_CACHE" == "true" ]] && [[ -d "/tmp/.buildx-cache-new" ]]; then
        rm -rf /tmp/.buildx-cache
        mv /tmp/.buildx-cache-new /tmp/.buildx-cache
    fi
    
    log_success "Multi-architecture build completed"
}

# Test built images
test_images() {
    if [[ "$PUSH_TO_REGISTRY" == "true" ]]; then
        log_info "Testing images from registry..."
        
        # Test each platform
        for platform in ${BUILD_PLATFORMS//,/ }; do
            log_info "Testing $platform image..."
            
            local test_container="pp-test-$(echo $platform | tr '/' '-')"
            
            # Run a quick test
            docker run --rm \
                --name "$test_container" \
                --platform "$platform" \
                "$REGISTRY_URL/$IMAGE_NAME:$VERSION" \
                node --version
                
            log_success "$platform image test passed"
        done
    else
        log_info "Testing locally loaded image..."
        
        # Test the loaded image
        docker run --rm \
            --name "pp-test-local" \
            "$REGISTRY_URL/$IMAGE_NAME:$VERSION" \
            node --version
            
        log_success "Local image test passed"
    fi
}

# Show image information
show_image_info() {
    log_info "Image information:"
    
    if [[ "$PUSH_TO_REGISTRY" == "true" ]]; then
        # Show manifest information
        docker buildx imagetools inspect "$REGISTRY_URL/$IMAGE_NAME:$VERSION"
    else
        # Show local image info
        docker images "$REGISTRY_URL/$IMAGE_NAME"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    
    # Remove any test containers
    docker ps -aq --filter "name=pp-test-" | xargs -r docker rm -f
    
    # Optionally remove builder
    if [[ "${CLEANUP_BUILDER:-false}" == "true" ]]; then
        log_info "Removing builder..."
        docker buildx rm "$BUILDER_NAME" || true
    fi
}

# Show usage
show_usage() {
    cat << EOF
Personal Pipeline Multi-Architecture Build Script

Usage: $0 [OPTIONS]

Options:
  --registry URL        Registry URL (default: localhost:5000)
  --image NAME          Image name (default: personal-pipeline-mcp)
  --version VERSION     Image version (default: latest)
  --platforms LIST      Build platforms (default: linux/amd64,linux/arm64)
  --no-cache            Disable build cache
  --push                Push images to registry
  --test                Run tests after build
  --cleanup-builder     Remove builder after build
  --help                Show this help

Environment Variables:
  REGISTRY_URL          Registry URL
  IMAGE_NAME            Image name
  VERSION               Image version
  BUILD_PLATFORMS       Comma-separated list of platforms
  BUILD_CACHE           Enable/disable build cache (true/false)
  PUSH_TO_REGISTRY      Push to registry (true/false)

Examples:
  $0                                    # Build for local use
  $0 --push                            # Build and push to registry
  $0 --version v1.0.0 --push          # Build specific version and push
  $0 --registry my-registry.com:5000   # Use custom registry
  $0 --platforms linux/amd64          # Build single platform

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --registry)
                REGISTRY_URL="$2"
                shift 2
                ;;
            --image)
                IMAGE_NAME="$2"
                shift 2
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --platforms)
                BUILD_PLATFORMS="$2"
                shift 2
                ;;
            --no-cache)
                BUILD_CACHE="false"
                shift
                ;;
            --push)
                PUSH_TO_REGISTRY="true"
                shift
                ;;
            --test)
                RUN_TESTS="true"
                shift
                ;;
            --cleanup-builder)
                CLEANUP_BUILDER="true"
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

# Main execution
main() {
    parse_args "$@"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    show_build_info
    check_prerequisites
    setup_builder
    build_app
    build_docker_images
    
    if [[ "${RUN_TESTS:-false}" == "true" ]]; then
        test_images
    fi
    
    show_image_info
    
    log_success "Multi-architecture build completed successfully!"
    
    if [[ "$PUSH_TO_REGISTRY" == "true" ]]; then
        echo
        log_info "Images pushed to registry:"
        echo "  docker pull $REGISTRY_URL/$IMAGE_NAME:$VERSION"
        echo "  docker pull $REGISTRY_URL/$IMAGE_NAME:latest"
    else
        echo
        log_info "Images available locally:"
        echo "  docker run --rm $REGISTRY_URL/$IMAGE_NAME:$VERSION"
    fi
}

# Run main function with all arguments
main "$@"