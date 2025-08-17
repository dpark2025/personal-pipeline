# Personal Pipeline MCP Server - Docker Deployment Guide

Complete guide for containerizing and deploying the Personal Pipeline MCP server to any Docker registry and infrastructure.

## 🚀 Quick Start

### Option 1: Pre-built Images (Recommended)

```bash
# Docker Hub
docker pull personal-pipeline/mcp-server:latest

# GitHub Container Registry
docker pull ghcr.io/personal-pipeline/mcp-server:latest

# Run with default configuration
docker run -d \
  --name personal-pipeline \
  -p 3000:3000 \
  -v $(pwd)/config:/app/config:ro \
  personal-pipeline/mcp-server:latest
```

### Option 2: Build from Source

```bash
# Clone repository
git clone https://github.com/your-username/personal-pipeline-mcp.git
cd personal-pipeline-mcp

# Build and run with Docker Compose
docker-compose -f docker/docker-compose.yml up -d

# Or build manually
docker/scripts/build.sh
docker run -d --name personal-pipeline -p 3000:3000 personal-pipeline/mcp-server:latest
```

## 📋 Table of Contents

- [🏗️ Architecture Overview](#️-architecture-overview)
- [🔧 Build Process](#-build-process)
- [🐳 Docker Images](#-docker-images)
- [🚀 Deployment Options](#-deployment-options)
- [🔐 Security Configuration](#-security-configuration)
- [📊 Monitoring & Health Checks](#-monitoring--health-checks)
- [🔄 CI/CD Integration](#-cicd-integration)
- [🛠️ Troubleshooting](#️-troubleshooting)

## 🏗️ Architecture Overview

### Multi-Stage Docker Build

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Builder       │    │    Runtime      │    │   Production    │
│                 │    │                 │    │                 │
│ • Node.js 18    │───▶│ • Node.js 18    │───▶│ • Optimized     │
│ • TypeScript    │    │ • Alpine Linux  │    │ • Secure        │
│ • Dependencies  │    │ • Non-root user │    │ • Multi-arch    │
│ • Build assets  │    │ • Health checks │    │ • 150MB size    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Security Features

- ✅ **Non-root user** (UID 1001)
- ✅ **Minimal attack surface** (Alpine Linux)
- ✅ **Security scanning** (Trivy integration)
- ✅ **Signal handling** (graceful shutdown)
- ✅ **Resource limits** (memory, CPU)
- ✅ **Read-only filesystem** support

### Multi-Architecture Support

- 🏗️ **linux/amd64** - Intel/AMD 64-bit
- 🍎 **linux/arm64** - ARM 64-bit (Apple Silicon, ARM servers)

## 🔧 Build Process

### Local Development Build

```bash
# Development environment with hot reload
docker-compose -f docker/docker-compose.dev.yml up -d

# Access development tools
docker-compose -f docker/docker-compose.dev.yml exec dev-tools bash

# View logs with hot reload
docker-compose -f docker/docker-compose.dev.yml logs -f personal-pipeline-dev
```

### Production Build

```bash
# Basic build
docker/scripts/build.sh

# Multi-architecture build
docker/scripts/build.sh --platform linux/amd64,linux/arm64

# Build and push to registry
docker/scripts/build.sh --push --tag v1.0.0

# Verbose build with custom name
docker/scripts/build.sh --verbose --name myregistry/pp-server --tag latest
```

### Build Script Options

```bash
Usage: docker/scripts/build.sh [OPTIONS]

OPTIONS:
    -n, --name NAME         Image name (default: personal-pipeline/mcp-server)
    -t, --tag TAG          Image tag (default: latest)
    -p, --platform PLATFORMS  Build platforms (default: linux/amd64,linux/arm64)
    --push                 Push image to registry after build
    --no-cache             Build without cache
    --no-cache-from        Don't use cache from existing images
    -v, --verbose          Enable verbose output
    -h, --help             Show this help message
```

## 🐳 Docker Images

### Image Variants

| Tag | Description | Size | Use Case |
|-----|-------------|------|----------|
| `latest` | Latest stable release | ~150MB | Production |
| `v1.x.x` | Specific version | ~150MB | Production (pinned) |
| `main` | Latest main branch | ~150MB | Staging |
| `dev` | Development build | ~200MB | Development |

### Image Labels

All images include OCI-compliant labels:

```dockerfile
org.opencontainers.image.title="Personal Pipeline MCP Server"
org.opencontainers.image.description="Intelligent MCP server for documentation retrieval"
org.opencontainers.image.version="1.0.0"
org.opencontainers.image.source="https://github.com/your-username/personal-pipeline-mcp"
org.opencontainers.image.licenses="MIT"
```

## 🚀 Deployment Options

### 1. Docker Hub Deployment

```bash
# Login to Docker Hub
docker login

# Deploy using deployment script
docker/scripts/deploy.sh \
  --registry "" \
  --username your-username \
  --password your-token \
  --tag v1.0.0

# Or set environment variables
export REGISTRY_USERNAME="your-username"
export REGISTRY_PASSWORD="your-token"
docker/scripts/deploy.sh --tag v1.0.0
```

### 2. AWS ECR Deployment

```bash
# Install AWS CLI and configure credentials
aws configure

# Deploy to ECR
docker/scripts/deploy.sh \
  --registry 123456789012.dkr.ecr.us-west-2.amazonaws.com \
  --tag v1.0.0

# Or use environment variables
export AWS_DEFAULT_REGION="us-west-2"
docker/scripts/deploy.sh \
  --registry 123456789012.dkr.ecr.us-west-2.amazonaws.com \
  --tag v1.0.0
```

### 3. Azure Container Registry

```bash
# Install Azure CLI and login
az login

# Deploy to ACR
docker/scripts/deploy.sh \
  --registry myregistry.azurecr.io \
  --tag v1.0.0

# Or with username/password
docker/scripts/deploy.sh \
  --registry myregistry.azurecr.io \
  --username myusername \
  --password mytoken \
  --tag v1.0.0
```

### 4. GitHub Container Registry

```bash
# Create GitHub Personal Access Token with write:packages scope
# https://github.com/settings/tokens

# Deploy to GHCR
docker/scripts/deploy.sh \
  --registry ghcr.io/username \
  --username username \
  --password ghp_your_token \
  --tag v1.0.0
```

### 5. Google Container Registry

```bash
# Configure gcloud and Docker
gcloud auth configure-docker

# Deploy to GCR
docker/scripts/deploy.sh \
  --registry gcr.io/my-project \
  --tag v1.0.0
```

### 6. Private Registry

```bash
# Deploy to private registry
docker/scripts/deploy.sh \
  --registry registry.company.com \
  --username myuser \
  --password mypass \
  --tag v1.0.0
```

## 🔐 Security Configuration

### Environment Variables

```bash
# Required
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
HOST=0.0.0.0

# Optional Redis
REDIS_URL=redis://redis:6379

# Optional authentication
API_KEY=your-secret-key
JWT_SECRET=your-jwt-secret

# Configuration
CONFIG_PATH=/app/config/config.yaml
```

### Volume Mounts

```bash
# Configuration (read-only)
-v /path/to/config:/app/config:ro

# Persistent data
-v personal-pipeline-data:/app/data
-v personal-pipeline-cache:/app/cache
-v personal-pipeline-logs:/app/logs

# SSL certificates (if needed)
-v /path/to/certs:/app/certs:ro
```

### Resource Limits

```yaml
# Docker Compose example
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '1.0'
    reservations:
      memory: 256M
      cpus: '0.5'
```

### Security Scanning

```bash
# Scan image for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image personal-pipeline/mcp-server:latest

# Scan for secrets
docker run --rm -v $(pwd):/code \
  trufflesecurity/trufflehog:latest filesystem /code
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health with metrics
curl http://localhost:3000/health/detailed

# Cache status
curl http://localhost:3000/health/cache

# Source status
curl http://localhost:3000/health/sources
```

### Monitoring Integration

#### Prometheus Metrics

```bash
# Export metrics in Prometheus format
curl http://localhost:3000/metrics?format=prometheus
```

#### Docker Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh
```

#### Log Aggregation

```bash
# JSON structured logs
docker logs personal-pipeline | jq .

# Filter by log level
docker logs personal-pipeline 2>&1 | grep '"level":"error"'
```

### Alerting Configuration

```yaml
# Example alerts.yml for monitoring
groups:
  - name: personal-pipeline
    rules:
      - alert: ContainerDown
        expr: up{job="personal-pipeline"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Personal Pipeline container is down"
      
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes{name="personal-pipeline"} > 400000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
```

## 🔄 CI/CD Integration

### GitHub Actions (Included)

The repository includes a complete GitHub Actions workflow (`.github/workflows/docker-build.yml`) that:

- ✅ Runs tests and code quality checks
- ✅ Builds multi-architecture images
- ✅ Tests container functionality
- ✅ Scans for security vulnerabilities
- ✅ Pushes to multiple registries
- ✅ Provides deployment notifications

#### Required Secrets

Set these in your GitHub repository settings:

```bash
# Docker Hub
DOCKERHUB_USERNAME=your-username
DOCKERHUB_TOKEN=your-access-token

# GitHub Container Registry (automatic)
GITHUB_TOKEN=automatically-provided

# AWS ECR (optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Azure ACR (optional)
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""

test:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test
    - npm run lint

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker/scripts/build.sh --tag $CI_COMMIT_SHA
    - docker/scripts/test.sh --image personal-pipeline/mcp-server --tag $CI_COMMIT_SHA

deploy:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker/scripts/deploy.sh --tag $CI_COMMIT_TAG
  only:
    - tags
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    
    environment {
        IMAGE_NAME = 'personal-pipeline/mcp-server'
        REGISTRY_CREDENTIALS = credentials('registry-credentials')
    }
    
    stages {
        stage('Test') {
            steps {
                sh 'npm ci'
                sh 'npm run test'
                sh 'npm run lint'
            }
        }
        
        stage('Build') {
            steps {
                sh 'docker/scripts/build.sh --tag ${BUILD_NUMBER}'
            }
        }
        
        stage('Test Container') {
            steps {
                sh 'docker/scripts/test.sh --tag ${BUILD_NUMBER}'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    docker/scripts/deploy.sh \
                        --tag ${BUILD_NUMBER} \
                        --username ${REGISTRY_CREDENTIALS_USR} \
                        --password ${REGISTRY_CREDENTIALS_PSW}
                '''
            }
        }
    }
}
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check container logs
docker logs personal-pipeline

# Check if port is available
lsof -i :3000

# Verify configuration
docker exec personal-pipeline cat /app/config/config.yaml
```

#### 2. Redis Connection Issues

```bash
# Check Redis connectivity
docker exec personal-pipeline redis-cli -h redis ping

# Verify Redis container
docker logs personal-pipeline-redis

# Test without Redis
docker run -e REDIS_URL="" personal-pipeline/mcp-server:latest
```

#### 3. Permission Issues

```bash
# Check file permissions
docker exec personal-pipeline ls -la /app/

# Verify user
docker exec personal-pipeline id

# Fix volume permissions
sudo chown -R 1001:1001 /path/to/volumes
```

#### 4. Build Issues

```bash
# Clean build cache
docker builder prune

# Build without cache
docker/scripts/build.sh --no-cache

# Check build context size
du -sh .
```

#### 5. Performance Issues

```bash
# Monitor resource usage
docker stats personal-pipeline

# Check memory usage
docker exec personal-pipeline cat /proc/meminfo

# Analyze performance
curl http://localhost:3000/performance
```

### Debug Mode

```bash
# Enable debug logging
docker run -e LOG_LEVEL=debug personal-pipeline/mcp-server:latest

# Interactive debugging
docker run -it --entrypoint /bin/sh personal-pipeline/mcp-server:latest

# Access development tools
docker-compose -f docker/docker-compose.dev.yml exec dev-tools bash
```

### Container Testing

```bash
# Run comprehensive tests
docker/scripts/test.sh --verbose

# Test specific functionality
docker/scripts/test.sh --no-cleanup  # Keep container for debugging

# Manual testing
docker exec -it personal-pipeline /bin/sh
```

## 📞 Support

### Documentation

- [API Documentation](../docs/API.md)
- [Architecture Guide](../docs/ARCHITECTURE.md)
- [Development Guide](../docs/DEVELOPMENT.md)

### Getting Help

1. **Check logs first**: `docker logs personal-pipeline`
2. **Search existing issues**: GitHub Issues
3. **Create detailed bug report**: Include logs, configuration, and steps to reproduce
4. **Join community**: Discussion forums or chat

### Performance Optimization

```bash
# Monitor performance
curl http://localhost:3000/performance | jq

# Optimize cache settings
curl -X POST http://localhost:3000/performance/reset

# Health dashboard
npm run health:dashboard
```

---

## 🏆 Production Checklist

Before deploying to production:

- [ ] **Security scan passed**: `trivy image personal-pipeline/mcp-server:latest`
- [ ] **Tests passing**: All container tests pass
- [ ] **Configuration reviewed**: No hardcoded secrets
- [ ] **Resource limits set**: Memory and CPU limits configured
- [ ] **Monitoring configured**: Health checks and alerts setup
- [ ] **Backup strategy**: Data persistence and backup plan
- [ ] **SSL/TLS configured**: HTTPS enabled if needed
- [ ] **Logging configured**: Centralized log collection
- [ ] **Documentation updated**: Deployment procedures documented

## 📈 Next Steps

After successful deployment:

1. **Set up monitoring** with Prometheus/Grafana
2. **Configure alerting** for critical metrics
3. **Implement backup strategy** for persistent data
4. **Set up log aggregation** with ELK stack or similar
5. **Plan scaling strategy** for increased load
6. **Regular security updates** and vulnerability scanning

Happy containerizing! 🐳