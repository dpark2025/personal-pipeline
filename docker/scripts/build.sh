#!/bin/bash

# ==============================================================================
# Personal Pipeline MCP Server - Docker Build Script
# ==============================================================================
# Automated Docker build with multi-architecture support and optimization

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DOCKER_DIR="${PROJECT_ROOT}/docker"

# Default values
IMAGE_NAME="${IMAGE_NAME:-personal-pipeline/mcp-server}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BUILD_PLATFORM="${BUILD_PLATFORM:-linux/amd64,linux/arm64}"
PUSH_IMAGE="${PUSH_IMAGE:-false}"
CACHE_FROM="${CACHE_FROM:-true}"
VERBOSE="${VERBOSE:-false}"
NO_CACHE="${NO_CACHE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Helper Functions
# ==============================================================================
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

verbose() {
    if [[ "${VERBOSE}" == "true" ]]; then
        echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] DEBUG: $1${NC}"
    fi
}

usage() {
    cat << EOF
Personal Pipeline MCP Server - Docker Build Script

Usage: $0 [OPTIONS]

OPTIONS:
    -n, --name NAME         Image name (default: personal-pipeline/mcp-server)
    -t, --tag TAG          Image tag (default: latest)
    -p, --platform PLATFORMS  Build platforms (default: linux/amd64,linux/arm64)
    --push                 Push image to registry after build
    --no-cache             Build without cache
    --no-cache-from        Don't use cache from existing images
    -v, --verbose          Enable verbose output
    -h, --help             Show this help message

ENVIRONMENT VARIABLES:
    IMAGE_NAME             Image name (overrides --name)
    IMAGE_TAG              Image tag (overrides --tag)
    BUILD_PLATFORM         Build platforms (overrides --platform)
    PUSH_IMAGE             Push after build (true/false)
    CACHE_FROM             Use cache from existing images (true/false)
    DOCKER_REGISTRY        Registry to push to (optional)
    DOCKER_USERNAME        Registry username (for push)
    DOCKER_PASSWORD        Registry password (for push)

EXAMPLES:
    # Basic build
    $0

    # Build and push to registry
    $0 --push --tag v1.0.0

    # Build for specific platform
    $0 --platform linux/amd64

    # Build with custom name and no cache
    $0 --name myregistry/pp-server --no-cache

    # Verbose build with push
    $0 --verbose --push --tag latest
EOF
}

# ==============================================================================
# Parse Command Line Arguments
# ==============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -p|--platform)
            BUILD_PLATFORM="$2"
            shift 2
            ;;
        --push)
            PUSH_IMAGE="true"
            shift
            ;;
        --no-cache)
            NO_CACHE="true"
            shift
            ;;
        --no-cache-from)
            CACHE_FROM="false"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1. Use --help for usage information."
            ;;
    esac
done

# ==============================================================================
# Validation
# ==============================================================================
log "Starting Docker build process..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    error "Docker is not installed or not in PATH"
fi

# Check if buildx is available for multi-platform builds
if [[ "${BUILD_PLATFORM}" == *","* ]]; then
    if ! docker buildx version &> /dev/null; then
        error "Docker buildx is required for multi-platform builds"
    fi
fi

# Validate project structure
if [[ ! -f "${PROJECT_ROOT}/package.json" ]]; then
    error "package.json not found in project root: ${PROJECT_ROOT}"
fi

if [[ ! -f "${PROJECT_ROOT}/Dockerfile" ]]; then
    error "Dockerfile not found in project root: ${PROJECT_ROOT}"
fi

# ==============================================================================
# Build Configuration
# ==============================================================================
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

verbose "Build configuration:"
verbose "  Project root: ${PROJECT_ROOT}"
verbose "  Image name: ${FULL_IMAGE_NAME}"
verbose "  Build platform(s): ${BUILD_PLATFORM}"
verbose "  Push after build: ${PUSH_IMAGE}"
verbose "  Use cache: $([ "${NO_CACHE}" == "true" ] && echo "false" || echo "true")"
verbose "  Cache from existing: ${CACHE_FROM}"

# ==============================================================================
# Pre-build Tasks
# ==============================================================================
log "Preparing build environment..."

# Change to project root
cd "${PROJECT_ROOT}"

# Create buildx builder for multi-platform builds if needed
if [[ "${BUILD_PLATFORM}" == *","* ]]; then
    info "Setting up multi-platform builder..."
    
    BUILDER_NAME="pp-builder"
    
    # Remove existing builder if it exists
    docker buildx rm "${BUILDER_NAME}" 2>/dev/null || true
    
    # Create new builder
    docker buildx create --name "${BUILDER_NAME}" --driver docker-container --use
    docker buildx inspect --bootstrap
fi

# ==============================================================================
# Build Arguments
# ==============================================================================
BUILD_ARGS=()

# Add cache arguments
if [[ "${NO_CACHE}" == "true" ]]; then
    BUILD_ARGS+=("--no-cache")
else
    if [[ "${CACHE_FROM}" == "true" ]]; then
        BUILD_ARGS+=("--cache-from" "type=registry,ref=${IMAGE_NAME}:cache")
        BUILD_ARGS+=("--cache-to" "type=registry,ref=${IMAGE_NAME}:cache,mode=max")
    fi
fi

# Add platform argument
BUILD_ARGS+=("--platform" "${BUILD_PLATFORM}")

# Add build context and dockerfile
BUILD_ARGS+=("--file" "Dockerfile")
BUILD_ARGS+=(".")

# Add labels
BUILD_ARGS+=("--label" "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)")
BUILD_ARGS+=("--label" "org.opencontainers.image.revision=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')")

# Add tag
BUILD_ARGS+=("--tag" "${FULL_IMAGE_NAME}")

# Add additional tags if specified
if [[ "${IMAGE_TAG}" != "latest" ]]; then
    BUILD_ARGS+=("--tag" "${IMAGE_NAME}:latest")
fi

# Add push option if requested
if [[ "${PUSH_IMAGE}" == "true" ]]; then
    BUILD_ARGS+=("--push")
else
    BUILD_ARGS+=("--load")
fi

# ==============================================================================
# Docker Build
# ==============================================================================
log "Building Docker image: ${FULL_IMAGE_NAME}"

verbose "Build command: docker buildx build ${BUILD_ARGS[*]}"

# Execute build
if [[ "${VERBOSE}" == "true" ]]; then
    docker buildx build "${BUILD_ARGS[@]}"
else
    docker buildx build "${BUILD_ARGS[@]}" 2>&1 | grep -E "(ERROR|WARN|=>|#)" || true
fi

BUILD_EXIT_CODE=$?

if [[ ${BUILD_EXIT_CODE} -ne 0 ]]; then
    error "Docker build failed with exit code ${BUILD_EXIT_CODE}"
fi

# ==============================================================================
# Post-build Tasks
# ==============================================================================
log "Build completed successfully!"

# Show image information if not pushed
if [[ "${PUSH_IMAGE}" != "true" ]]; then
    info "Image details:"
    docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}\t{{.CreatedAt}}"
    
    echo
    info "To run the container:"
    echo "  docker run -d --name personal-pipeline -p 3000:3000 ${FULL_IMAGE_NAME}"
    echo
    info "To run with Redis:"
    echo "  docker-compose -f docker/docker-compose.yml up -d"
    echo
    info "To push to registry:"
    echo "  docker push ${FULL_IMAGE_NAME}"
fi

# Clean up builder if created
if [[ "${BUILD_PLATFORM}" == *","* ]]; then
    verbose "Cleaning up multi-platform builder..."
    docker buildx rm "${BUILDER_NAME}" 2>/dev/null || true
fi

# ==============================================================================
# Registry Push (if enabled)
# ==============================================================================
if [[ "${PUSH_IMAGE}" == "true" ]]; then
    log "Image pushed to registry successfully!"
    
    echo
    info "To pull and run from registry:"
    echo "  docker pull ${FULL_IMAGE_NAME}"
    echo "  docker run -d --name personal-pipeline -p 3000:3000 ${FULL_IMAGE_NAME}"
fi

log "Docker build process completed successfully!"