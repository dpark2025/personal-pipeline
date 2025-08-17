#!/bin/bash

# ==============================================================================
# Personal Pipeline MCP Server - Docker Deployment Script
# ==============================================================================
# Flexible deployment script for various Docker registries and environments

set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default values
IMAGE_NAME="${IMAGE_NAME:-personal-pipeline/mcp-server}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"
REGISTRY_USERNAME="${REGISTRY_USERNAME:-}"
REGISTRY_PASSWORD="${REGISTRY_PASSWORD:-}"
BUILD_BEFORE_DEPLOY="${BUILD_BEFORE_DEPLOY:-true}"
PUSH_LATEST="${PUSH_LATEST:-true}"
VERBOSE="${VERBOSE:-false}"
DRY_RUN="${DRY_RUN:-false}"

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

dry_run() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo -e "${YELLOW}[DRY RUN] $1${NC}"
        return 0
    else
        return 1
    fi
}

usage() {
    cat << EOF
Personal Pipeline MCP Server - Docker Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -i, --image IMAGE        Image name (default: personal-pipeline/mcp-server)
    -t, --tag TAG           Image tag (default: latest)
    -r, --registry REGISTRY Registry URL (Docker Hub, AWS ECR, Azure ACR, etc.)
    -u, --username USERNAME Registry username
    -p, --password PASSWORD Registry password (or use environment variables)
    --no-build              Skip building image before deployment
    --no-latest             Don't push 'latest' tag
    --dry-run              Show what would be done without executing
    -v, --verbose          Enable verbose output
    -h, --help             Show this help message

REGISTRY EXAMPLES:
    Docker Hub:      (empty/default)
    AWS ECR:         123456789012.dkr.ecr.us-west-2.amazonaws.com
    Azure ACR:       myregistry.azurecr.io
    Google GCR:      gcr.io/my-project
    GitHub Registry: ghcr.io/username
    Private:         registry.company.com

ENVIRONMENT VARIABLES:
    REGISTRY_USERNAME      Registry username
    REGISTRY_PASSWORD      Registry password or token
    DOCKER_REGISTRY        Registry URL
    BUILD_BEFORE_DEPLOY    Build image before deployment (true/false)
    PUSH_LATEST           Push latest tag (true/false)

EXAMPLES:
    # Deploy to Docker Hub
    $0 --username myuser --password mypass --tag v1.0.0

    # Deploy to AWS ECR
    $0 --registry 123456789012.dkr.ecr.us-west-2.amazonaws.com --tag v1.0.0

    # Deploy to GitHub Container Registry
    $0 --registry ghcr.io/username --username username --password ghp_token

    # Dry run deployment
    $0 --dry-run --tag v1.0.0

    # Deploy without building
    $0 --no-build --tag latest
EOF
}

# ==============================================================================
# Registry-specific Functions
# ==============================================================================
setup_docker_hub() {
    verbose "Setting up Docker Hub authentication..."
    
    if [[ -n "${REGISTRY_USERNAME}" && -n "${REGISTRY_PASSWORD}" ]]; then
        if ! dry_run "docker login --username ${REGISTRY_USERNAME}"; then
            echo "${REGISTRY_PASSWORD}" | docker login --username "${REGISTRY_USERNAME}" --password-stdin
        fi
    else
        warn "Docker Hub credentials not provided. Assuming already logged in."
    fi
}

setup_aws_ecr() {
    local registry_url="$1"
    
    verbose "Setting up AWS ECR authentication..."
    
    # Extract region from ECR URL
    local region
    region=$(echo "${registry_url}" | sed -n 's/.*\.dkr\.ecr\.\([^.]*\)\.amazonaws\.com.*/\1/p')
    
    if [[ -z "${region}" ]]; then
        error "Could not extract AWS region from ECR URL: ${registry_url}"
    fi
    
    verbose "Detected AWS region: ${region}"
    
    # Use AWS CLI to get login token
    if command -v aws &> /dev/null; then
        if ! dry_run "aws ecr get-login-password --region ${region}"; then
            aws ecr get-login-password --region "${region}" | \
                docker login --username AWS --password-stdin "${registry_url}"
        fi
    else
        error "AWS CLI not found. Install AWS CLI to deploy to ECR."
    fi
}

setup_azure_acr() {
    local registry_url="$1"
    
    verbose "Setting up Azure ACR authentication..."
    
    if command -v az &> /dev/null; then
        if ! dry_run "az acr login --name ${registry_url}"; then
            az acr login --name "${registry_url}"
        fi
    elif [[ -n "${REGISTRY_USERNAME}" && -n "${REGISTRY_PASSWORD}" ]]; then
        if ! dry_run "docker login ${registry_url} --username ${REGISTRY_USERNAME}"; then
            echo "${REGISTRY_PASSWORD}" | docker login "${registry_url}" --username "${REGISTRY_USERNAME}" --password-stdin
        fi
    else
        error "Azure CLI not found and no credentials provided. Install Azure CLI or provide credentials."
    fi
}

setup_github_registry() {
    local registry_url="$1"
    
    verbose "Setting up GitHub Container Registry authentication..."
    
    if [[ -n "${REGISTRY_USERNAME}" && -n "${REGISTRY_PASSWORD}" ]]; then
        if ! dry_run "docker login ${registry_url} --username ${REGISTRY_USERNAME}"; then
            echo "${REGISTRY_PASSWORD}" | docker login "${registry_url}" --username "${REGISTRY_USERNAME}" --password-stdin
        fi
    else
        error "GitHub Container Registry requires username and personal access token"
    fi
}

setup_generic_registry() {
    local registry_url="$1"
    
    verbose "Setting up generic registry authentication: ${registry_url}"
    
    if [[ -n "${REGISTRY_USERNAME}" && -n "${REGISTRY_PASSWORD}" ]]; then
        if ! dry_run "docker login ${registry_url} --username ${REGISTRY_USERNAME}"; then
            echo "${REGISTRY_PASSWORD}" | docker login "${registry_url}" --username "${REGISTRY_USERNAME}" --password-stdin
        fi
    else
        warn "No credentials provided for registry. Assuming already logged in."
    fi
}

# ==============================================================================
# Parse Command Line Arguments
# ==============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--image)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -u|--username)
            REGISTRY_USERNAME="$2"
            shift 2
            ;;
        -p|--password)
            REGISTRY_PASSWORD="$2"
            shift 2
            ;;
        --no-build)
            BUILD_BEFORE_DEPLOY="false"
            shift
            ;;
        --no-latest)
            PUSH_LATEST="false"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
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
# Environment Variable Overrides
# ==============================================================================
REGISTRY="${REGISTRY:-${DOCKER_REGISTRY:-}}"
REGISTRY_USERNAME="${REGISTRY_USERNAME:-${DOCKER_USERNAME:-}}"
REGISTRY_PASSWORD="${REGISTRY_PASSWORD:-${DOCKER_PASSWORD:-}}"

# ==============================================================================
# Validation
# ==============================================================================
log "Starting Docker deployment process..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    error "Docker is not installed or not in PATH"
fi

# Determine full image name with registry
if [[ -n "${REGISTRY}" ]]; then
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    LATEST_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:latest"
else
    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
    LATEST_IMAGE_NAME="${IMAGE_NAME}:latest"
fi

verbose "Deployment configuration:"
verbose "  Source image: ${IMAGE_NAME}:${IMAGE_TAG}"
verbose "  Target image: ${FULL_IMAGE_NAME}"
verbose "  Registry: ${REGISTRY:-Docker Hub}"
verbose "  Build before deploy: ${BUILD_BEFORE_DEPLOY}"
verbose "  Push latest tag: ${PUSH_LATEST}"
verbose "  Dry run: ${DRY_RUN}"

# ==============================================================================
# Build Image (if requested)
# ==============================================================================
if [[ "${BUILD_BEFORE_DEPLOY}" == "true" ]]; then
    log "Building Docker image before deployment..."
    
    if ! dry_run "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"; then
        "${SCRIPT_DIR}/build.sh" --name "${IMAGE_NAME}" --tag "${IMAGE_TAG}" --verbose="${VERBOSE}"
    fi
else
    # Check if image exists
    if ! docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" &>/dev/null; then
        error "Image ${IMAGE_NAME}:${IMAGE_TAG} not found. Build it first or use --build flag."
    fi
    
    info "Using existing image: ${IMAGE_NAME}:${IMAGE_TAG}"
fi

# ==============================================================================
# Registry Authentication
# ==============================================================================
log "Setting up registry authentication..."

if [[ -z "${REGISTRY}" ]]; then
    setup_docker_hub
elif [[ "${REGISTRY}" =~ \.dkr\.ecr\..+\.amazonaws\.com ]]; then
    setup_aws_ecr "${REGISTRY}"
elif [[ "${REGISTRY}" =~ \.azurecr\.io ]]; then
    setup_azure_acr "${REGISTRY}"
elif [[ "${REGISTRY}" =~ ^ghcr\.io ]]; then
    setup_github_registry "${REGISTRY}"
else
    setup_generic_registry "${REGISTRY}"
fi

# ==============================================================================
# Tag and Push Images
# ==============================================================================
log "Tagging and pushing images..."

# Tag image for registry
if [[ "${FULL_IMAGE_NAME}" != "${IMAGE_NAME}:${IMAGE_TAG}" ]]; then
    info "Tagging image for registry..."
    if ! dry_run "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${FULL_IMAGE_NAME}"; then
        docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${FULL_IMAGE_NAME}"
    fi
fi

# Push main tag
info "Pushing image: ${FULL_IMAGE_NAME}"
if ! dry_run "docker push ${FULL_IMAGE_NAME}"; then
    docker push "${FULL_IMAGE_NAME}"
fi

# Push latest tag (if requested and not already latest)
if [[ "${PUSH_LATEST}" == "true" && "${IMAGE_TAG}" != "latest" ]]; then
    info "Tagging and pushing latest..."
    
    if ! dry_run "docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${LATEST_IMAGE_NAME}"; then
        docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${LATEST_IMAGE_NAME}"
    fi
    
    if ! dry_run "docker push ${LATEST_IMAGE_NAME}"; then
        docker push "${LATEST_IMAGE_NAME}"
    fi
fi

# ==============================================================================
# Deployment Complete
# ==============================================================================
log "Docker deployment completed successfully!"

echo
echo "=============================================="
echo "         DEPLOYMENT SUMMARY"
echo "=============================================="
echo "Image deployed: ${FULL_IMAGE_NAME}"
if [[ "${PUSH_LATEST}" == "true" && "${IMAGE_TAG}" != "latest" ]]; then
    echo "Latest tag:     ${LATEST_IMAGE_NAME}"
fi
echo "Registry:       ${REGISTRY:-Docker Hub}"
echo

info "To pull and run the deployed image:"
echo "  docker pull ${FULL_IMAGE_NAME}"
echo "  docker run -d --name personal-pipeline -p 3000:3000 ${FULL_IMAGE_NAME}"
echo

info "To deploy with Docker Compose:"
echo "  # Update docker-compose.yml with: image: ${FULL_IMAGE_NAME}"
echo "  docker-compose up -d"
echo

if [[ "${DRY_RUN}" == "true" ]]; then
    warn "This was a dry run. No actual deployment occurred."
fi