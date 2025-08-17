# Personal Pipeline - Container Guide

Comprehensive guide for Docker container deployment, including multi-architecture support, registry management, and production orchestration.

## 📋 Table of Contents

- [Container Overview](#container-overview)
- [Docker Registry Setup](#docker-registry-setup)
- [Single Container Deployment](#single-container-deployment)
- [Multi-Container Orchestration](#multi-container-orchestration)
- [Production Deployment Patterns](#production-deployment-patterns)
- [Multi-Architecture Support](#multi-architecture-support)
- [Container Security](#container-security)
- [Performance Optimization](#performance-optimization)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## 🐳 Container Overview

### Container Features

Personal Pipeline provides production-ready containers with:

- **Multi-stage builds** for optimized size and security
- **Multi-architecture support** (AMD64, ARM64)
- **Security hardening** with non-root user and minimal attack surface
- **Health checks** for container orchestration
- **Flexible configuration** via environment variables and volumes
- **Persistent storage** for data, cache, and logs

### Container Specifications

```dockerfile
# Container details
Base Image: node:18-alpine
User: ppuser (1001:1001)
Exposed Port: 3000
Volumes: /app/config, /app/data, /app/cache, /app/logs
Health Check: HTTP GET /health every 30s
```

### Available Images

| Image Tag | Architecture | Size | Use Case |
|-----------|-------------|------|----------|
| `latest` | AMD64, ARM64 | ~150MB | Production |
| `0.1.0` | AMD64, ARM64 | ~150MB | Stable release |
| `dev` | AMD64, ARM64 | ~180MB | Development |
| `alpine` | AMD64, ARM64 | ~120MB | Minimal |

## 🗄️ Docker Registry Setup

### Public Docker Hub

#### Pull from Docker Hub
```bash
# Pull latest image
docker pull personal-pipeline/mcp-server:latest

# Pull specific version
docker pull personal-pipeline/mcp-server:0.1.0

# Pull development version
docker pull personal-pipeline/mcp-server:dev
```

### Private Docker Registry

#### Set up Private Registry
```bash
# Start private registry
docker run -d \
  --name registry \
  --restart always \
  -p 5000:5000 \
  -v registry-data:/var/lib/registry \
  registry:2

# Tag and push to private registry
docker tag personal-pipeline/mcp-server:latest localhost:5000/personal-pipeline/mcp-server:latest
docker push localhost:5000/personal-pipeline/mcp-server:latest
```

#### Registry with Authentication
```yaml
# docker-compose.registry.yml
version: '3.8'

services:
  registry:
    image: registry:2
    ports:
      - "5000:5000"
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /data
    volumes:
      - registry-data:/data
      - registry-auth:/auth
    restart: unless-stopped

  registry-ui:
    image: joxit/docker-registry-ui:static
    ports:
      - "8080:80"
    environment:
      REGISTRY_TITLE: Personal Pipeline Registry
      REGISTRY_URL: http://registry:5000
      DELETE_IMAGES: true
      SHOW_CONTENT_DIGEST: true
    depends_on:
      - registry

volumes:
  registry-data:
  registry-auth:
```

```bash
# Create registry user
docker run --rm \
  --entrypoint htpasswd \
  httpd:2 -Bbn myuser mypassword > auth/htpasswd

# Start registry with authentication
docker-compose -f docker-compose.registry.yml up -d

# Login to private registry
docker login localhost:5000
```

### AWS ECR (Elastic Container Registry)

#### Push to ECR
```bash
# Get login token
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com

# Create repository
aws ecr create-repository --repository-name personal-pipeline/mcp-server

# Tag and push
docker tag personal-pipeline/mcp-server:latest \
  123456789012.dkr.ecr.us-west-2.amazonaws.com/personal-pipeline/mcp-server:latest

docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/personal-pipeline/mcp-server:latest
```

#### Pull from ECR
```bash
# Configure authentication
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com

# Pull image
docker pull 123456789012.dkr.ecr.us-west-2.amazonaws.com/personal-pipeline/mcp-server:latest
```

### Azure Container Registry

#### Push to ACR
```bash
# Login to ACR
az acr login --name myregistry

# Tag and push
docker tag personal-pipeline/mcp-server:latest myregistry.azurecr.io/personal-pipeline/mcp-server:latest
docker push myregistry.azurecr.io/personal-pipeline/mcp-server:latest
```

### Google Container Registry

#### Push to GCR
```bash
# Configure authentication
gcloud auth configure-docker

# Tag and push
docker tag personal-pipeline/mcp-server:latest gcr.io/my-project/personal-pipeline/mcp-server:latest
docker push gcr.io/my-project/personal-pipeline/mcp-server:latest
```

## 🚀 Single Container Deployment

### Basic Container Deployment

#### Minimal Setup
```bash
# Quick start with defaults
docker run -d \
  --name personal-pipeline \
  -p 3000:3000 \
  personal-pipeline/mcp-server:latest
```

#### Production Setup
```bash
# Production deployment with volumes and environment
docker run -d \
  --name personal-pipeline \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/config:/app/config:ro \
  -v personal-pipeline-data:/app/data \
  -v personal-pipeline-cache:/app/cache \
  -v personal-pipeline-logs:/app/logs \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -e REDIS_URL=redis://redis:6379 \
  --memory=512m \
  --cpus=0.5 \
  personal-pipeline/mcp-server:latest
```

### Environment Variables

#### Core Configuration
```bash
# Environment variables for container
export NODE_ENV=production              # Node.js environment
export LOG_LEVEL=info                   # Logging level
export PORT=3000                        # Server port
export HOST=0.0.0.0                     # Server host
export CONFIG_PATH=/app/config/config.yaml  # Config file path
```

#### External Services
```bash
# Redis configuration
export REDIS_URL=redis://redis:6379
export REDIS_PASSWORD=mypassword
export REDIS_DB=0

# GitHub integration
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export GITHUB_API_URL=https://api.github.com

# Confluence integration
export CONFLUENCE_BASE_URL=https://company.atlassian.net/wiki
export CONFLUENCE_TOKEN=your_confluence_token
```

#### Security Settings
```bash
# API security
export PP_API_KEY=your-secure-api-key
export JWT_SECRET=your-jwt-secret
export CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Volume Management

#### Volume Types
```bash
# Named volumes (recommended for production)
docker volume create personal-pipeline-data
docker volume create personal-pipeline-cache
docker volume create personal-pipeline-logs

# Bind mounts (good for development)
docker run -v $(pwd)/config:/app/config:ro personal-pipeline/mcp-server:latest

# tmpfs mounts (for temporary data)
docker run --tmpfs /app/tmp personal-pipeline/mcp-server:latest
```

#### Backup and Restore Volumes
```bash
# Backup volume
docker run --rm \
  -v personal-pipeline-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/data-$(date +%Y%m%d).tar.gz /data

# Restore volume
docker run --rm \
  -v personal-pipeline-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/data-20240101.tar.gz -C /
```

### Health Checks

#### Built-in Health Check
```bash
# View health check status
docker inspect --format='{{.State.Health.Status}}' personal-pipeline

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' personal-pipeline
```

#### Custom Health Check
```bash
# Run with custom health check
docker run -d \
  --name personal-pipeline \
  --health-cmd="curl -f http://localhost:3000/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=60s \
  personal-pipeline/mcp-server:latest
```

## 🔗 Multi-Container Orchestration

### Docker Compose - Basic Setup

#### Simple Compose File
```yaml
# docker-compose.yml
version: '3.8'

services:
  personal-pipeline:
    image: personal-pipeline/mcp-server:latest
    container_name: personal-pipeline
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    volumes:
      - ./config:/app/config:ro
      - personal-pipeline-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  personal-pipeline-data:
```

```bash
# Deploy with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f personal-pipeline

# Scale service
docker-compose up -d --scale personal-pipeline=3
```

### Docker Compose - Full Stack

#### Complete Production Stack
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: pp-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - personal-pipeline
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  personal-pipeline:
    image: personal-pipeline/mcp-server:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
      - REDIS_URL=redis://redis:6379
      - PP_API_KEY_FILE=/run/secrets/pp_api_key
    volumes:
      - ./config:/app/config:ro
      - personal-pipeline-data:/app/data
      - personal-pipeline-logs:/app/logs
    secrets:
      - pp_api_key
      - github_token
    depends_on:
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  redis:
    image: redis:7-alpine
    container_name: pp-redis
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    sysctls:
      - net.core.somaxconn=1024

  prometheus:
    image: prom/prometheus:latest
    container_name: pp-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: pp-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./grafana/datasources:/etc/grafana/provisioning/datasources:ro
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  personal-pipeline-data:
  personal-pipeline-logs:
  redis-data:
  prometheus-data:
  grafana-data:
  nginx-logs:

secrets:
  pp_api_key:
    file: ./secrets/pp_api_key.txt
  github_token:
    file: ./secrets/github_token.txt

networks:
  default:
    name: personal-pipeline-network
```

### Docker Swarm

#### Initialize Swarm
```bash
# Initialize Docker Swarm
docker swarm init

# Join additional nodes
docker swarm join --token SWMTKN-1-xxxxx manager-ip:2377
```

#### Deploy to Swarm
```yaml
# docker-stack.yml
version: '3.8'

services:
  personal-pipeline:
    image: personal-pipeline/mcp-server:latest
    deploy:
      replicas: 5
      placement:
        constraints: [node.role == worker]
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      update_config:
        parallelism: 2
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 5s
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    volumes:
      - personal-pipeline-data:/app/data
    networks:
      - personal-pipeline-network

  redis:
    image: redis:7-alpine
    deploy:
      replicas: 1
      placement:
        constraints: [node.role == manager]
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
    volumes:
      - redis-data:/data
    networks:
      - personal-pipeline-network

volumes:
  personal-pipeline-data:
  redis-data:

networks:
  personal-pipeline-network:
    driver: overlay
    attachable: true
```

```bash
# Deploy stack
docker stack deploy -c docker-stack.yml personal-pipeline

# View services
docker service ls

# Scale service
docker service scale personal-pipeline_personal-pipeline=10

# Update service
docker service update --image personal-pipeline/mcp-server:0.1.1 personal-pipeline_personal-pipeline
```

## 🏭 Production Deployment Patterns

### Blue-Green Deployment

#### Blue-Green Setup
```bash
#!/bin/bash
# blue-green-deploy.sh

NEW_VERSION=${1:-latest}
CURRENT_ENV=$(docker ps --filter "name=personal-pipeline-" --filter "status=running" --format "{{.Names}}" | head -1)

if [[ "$CURRENT_ENV" == *"blue"* ]]; then
    NEW_ENV="green"
    OLD_ENV="blue"
else
    NEW_ENV="blue"
    OLD_ENV="green"
fi

echo "Deploying to $NEW_ENV environment..."

# Deploy new version
docker run -d \
  --name "personal-pipeline-$NEW_ENV" \
  --network personal-pipeline-network \
  -e NODE_ENV=production \
  -e REDIS_URL=redis://redis:6379 \
  -v personal-pipeline-data:/app/data \
  personal-pipeline/mcp-server:$NEW_VERSION

# Wait for health check
echo "Waiting for health check..."
for i in {1..30}; do
    if docker exec "personal-pipeline-$NEW_ENV" curl -f http://localhost:3000/health; then
        echo "Health check passed"
        break
    fi
    sleep 5
done

# Update load balancer
echo "Updating load balancer to $NEW_ENV..."
# Update nginx upstream or load balancer configuration

# Remove old environment
if [ ! -z "$OLD_ENV" ]; then
    echo "Removing old environment: $OLD_ENV"
    docker stop "personal-pipeline-$OLD_ENV"
    docker rm "personal-pipeline-$OLD_ENV"
fi

echo "Blue-green deployment completed"
```

### Rolling Updates

#### Rolling Update Script
```bash
#!/bin/bash
# rolling-update.sh

NEW_VERSION=${1:-latest}
REPLICAS=${2:-3}

echo "Starting rolling update to version $NEW_VERSION..."

for i in $(seq 1 $REPLICAS); do
    echo "Updating replica $i/$REPLICAS..."
    
    # Stop old container
    docker stop "personal-pipeline-$i" || true
    docker rm "personal-pipeline-$i" || true
    
    # Start new container
    docker run -d \
      --name "personal-pipeline-$i" \
      --network personal-pipeline-network \
      -e NODE_ENV=production \
      -e REDIS_URL=redis://redis:6379 \
      -v personal-pipeline-data:/app/data \
      personal-pipeline/mcp-server:$NEW_VERSION
    
    # Wait for health check
    echo "Waiting for replica $i to be healthy..."
    for j in {1..30}; do
        if docker exec "personal-pipeline-$i" curl -f http://localhost:3000/health; then
            echo "Replica $i is healthy"
            break
        fi
        sleep 5
    done
    
    # Brief pause between updates
    sleep 10
done

echo "Rolling update completed"
```

### Canary Deployment

#### Canary Setup
```bash
#!/bin/bash
# canary-deploy.sh

NEW_VERSION=${1:-latest}
CANARY_PERCENTAGE=${2:-10}

echo "Starting canary deployment (${CANARY_PERCENTAGE}% traffic)..."

# Deploy canary version
docker run -d \
  --name personal-pipeline-canary \
  --network personal-pipeline-network \
  -e NODE_ENV=production \
  -e REDIS_URL=redis://redis:6379 \
  -v personal-pipeline-data:/app/data \
  personal-pipeline/mcp-server:$NEW_VERSION

# Update load balancer to send percentage of traffic to canary
# This would typically be done via nginx, HAProxy, or cloud load balancer

echo "Canary deployment completed. Monitor metrics and promote if successful."
```

## 🏗️ Multi-Architecture Support

### Building Multi-Architecture Images

#### Local Multi-Arch Build
```bash
# Create buildx builder
docker buildx create --name multiarch --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag personal-pipeline/mcp-server:latest \
  --push .

# Build platform-specific images
docker buildx build \
  --platform linux/arm64 \
  --tag personal-pipeline/mcp-server:arm64 \
  --push .
```

#### CI/CD Multi-Arch Build
```yaml
# .github/workflows/build.yml
name: Build Multi-Architecture Images

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: true
        tags: |
          personal-pipeline/mcp-server:latest
          personal-pipeline/mcp-server:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

### Platform-Specific Deployment

#### ARM64 Deployment (Apple Silicon, ARM servers)
```bash
# Explicitly pull ARM64 image
docker pull --platform linux/arm64 personal-pipeline/mcp-server:latest

# Run on ARM64
docker run --platform linux/arm64 \
  -d --name personal-pipeline \
  -p 3000:3000 \
  personal-pipeline/mcp-server:latest
```

#### AMD64 Deployment (Intel/AMD servers)
```bash
# Explicitly pull AMD64 image
docker pull --platform linux/amd64 personal-pipeline/mcp-server:latest

# Run on AMD64
docker run --platform linux/amd64 \
  -d --name personal-pipeline \
  -p 3000:3000 \
  personal-pipeline/mcp-server:latest
```

### Cross-Platform Development

#### Development on Apple Silicon
```bash
# Build and test on ARM64
docker buildx build --platform linux/arm64 --load -t pp-local:arm64 .
docker run --platform linux/arm64 pp-local:arm64

# Build and test on AMD64 (for production compatibility)
docker buildx build --platform linux/amd64 --load -t pp-local:amd64 .
docker run --platform linux/amd64 pp-local:amd64
```

## 🔒 Container Security

### Security Hardening

#### Secure Container Runtime
```bash
# Run with security options
docker run -d \
  --name personal-pipeline \
  --user 1001:1001 \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /app/cache \
  --cap-drop ALL \
  --cap-add CHOWN \
  --cap-add SETGID \
  --cap-add SETUID \
  --security-opt no-new-privileges:true \
  --security-opt seccomp=seccomp.json \
  --security-opt apparmor=docker-default \
  -p 3000:3000 \
  personal-pipeline/mcp-server:latest
```

#### Secrets Management
```yaml
# docker-compose.secrets.yml
version: '3.8'

services:
  personal-pipeline:
    image: personal-pipeline/mcp-server:latest
    environment:
      - GITHUB_TOKEN_FILE=/run/secrets/github_token
      - PP_API_KEY_FILE=/run/secrets/pp_api_key
    secrets:
      - github_token
      - pp_api_key
    # ... other configuration

secrets:
  github_token:
    external: true
  pp_api_key:
    external: true
```

```bash
# Create secrets
echo "ghp_your_token" | docker secret create github_token -
echo "your-api-key" | docker secret create pp_api_key -
```

### Container Scanning

#### Vulnerability Scanning
```bash
# Docker Scout scanning
docker scout cves personal-pipeline/mcp-server:latest

# Trivy scanning
trivy image personal-pipeline/mcp-server:latest

# Snyk scanning
snyk container test personal-pipeline/mcp-server:latest

# Clair scanning (via clair-scanner)
clair-scanner --ip=$(hostname -I | awk '{print $1}') personal-pipeline/mcp-server:latest
```

#### Continuous Security Monitoring
```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'personal-pipeline/mcp-server:latest'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

## ⚡ Performance Optimization

### Container Resource Management

#### Resource Limits
```bash
# Set memory and CPU limits
docker run -d \
  --name personal-pipeline \
  --memory=512m \
  --memory-swap=1g \
  --cpus=0.5 \
  --oom-kill-disable=false \
  personal-pipeline/mcp-server:latest
```

#### Resource Monitoring
```bash
# Monitor container resources
docker stats personal-pipeline

# Get detailed resource usage
docker exec personal-pipeline cat /sys/fs/cgroup/memory/memory.usage_in_bytes
docker exec personal-pipeline cat /sys/fs/cgroup/cpu/cpuacct.usage
```

### Image Optimization

#### Multi-stage Build Optimization
```dockerfile
# Optimized Dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

FROM node:18-alpine AS runtime
RUN apk add --no-cache dumb-init curl && \
    addgroup -g 1001 -S ppuser && \
    adduser -S ppuser -u 1001 -G ppuser
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
USER ppuser
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

### Network Optimization

#### Custom Networks
```bash
# Create custom network
docker network create --driver bridge personal-pipeline-network

# Run containers on custom network
docker run -d \
  --name personal-pipeline \
  --network personal-pipeline-network \
  personal-pipeline/mcp-server:latest
```

#### Network Performance
```yaml
# docker-compose.performance.yml
version: '3.8'

services:
  personal-pipeline:
    image: personal-pipeline/mcp-server:latest
    networks:
      - frontend
      - backend
    sysctls:
      - net.core.somaxconn=65535
      - net.ipv4.tcp_tw_reuse=1

networks:
  frontend:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: pp-frontend
  backend:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: pp-backend
```

## 📊 Monitoring and Logging

### Container Monitoring

#### Health Check Monitoring
```bash
# Advanced health check
docker run -d \
  --name personal-pipeline \
  --health-cmd="curl -f http://localhost:3000/health/detailed || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=60s \
  personal-pipeline/mcp-server:latest

# Monitor health status
watch docker inspect --format='{{.State.Health.Status}}' personal-pipeline
```

### Logging Configuration

#### Structured Logging
```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  personal-pipeline:
    image: personal-pipeline/mcp-server:latest
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=personal-pipeline"
        tag: "{{.ImageName}}/{{.Name}}/{{.ID}}"

  # ELK Stack for log aggregation
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

### Metrics Collection

#### Prometheus Integration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'personal-pipeline'
    static_configs:
      - targets: ['personal-pipeline:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']
```

#### cAdvisor for Container Metrics
```yaml
# Add to docker-compose.yml
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  container_name: cadvisor
  ports:
    - "8080:8080"
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:rw
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
    - /dev/disk/:/dev/disk:ro
  privileged: true
  devices:
    - /dev/kmsg
```

## 🔧 Troubleshooting

### Common Container Issues

#### Container Won't Start
```bash
# Check container logs
docker logs personal-pipeline

# Check container events
docker events --filter container=personal-pipeline

# Inspect container configuration
docker inspect personal-pipeline

# Debug container startup
docker run -it --rm personal-pipeline/mcp-server:latest sh
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats personal-pipeline

# Check container processes
docker exec personal-pipeline ps aux

# Monitor network traffic
docker exec personal-pipeline netstat -tulpn

# Check disk usage
docker exec personal-pipeline df -h
```

#### Network Connectivity Issues
```bash
# Test network connectivity
docker exec personal-pipeline ping redis
docker exec personal-pipeline curl http://localhost:3000/health

# Check network configuration
docker network ls
docker network inspect personal-pipeline-network

# Debug DNS resolution
docker exec personal-pipeline nslookup redis
```

### Container Debugging

#### Interactive Debugging
```bash
# Enter running container
docker exec -it personal-pipeline sh

# Run debug container with same network
docker run -it --rm \
  --network container:personal-pipeline \
  alpine sh

# Debug with strace
docker run -it --rm \
  --pid container:personal-pipeline \
  --cap-add SYS_PTRACE \
  alpine strace -p 1
```

#### Log Analysis
```bash
# Follow logs in real-time
docker logs -f personal-pipeline

# Search logs for errors
docker logs personal-pipeline 2>&1 | grep ERROR

# Export logs for analysis
docker logs personal-pipeline > app.log 2>&1
```

### Recovery Procedures

#### Container Recovery
```bash
#!/bin/bash
# recover-container.sh

CONTAINER_NAME="personal-pipeline"

echo "Starting container recovery..."

# Stop and remove failed container
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true

# Pull latest image
docker pull personal-pipeline/mcp-server:latest

# Restart with previous configuration
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 3000:3000 \
  -v personal-pipeline-data:/app/data \
  -v personal-pipeline-cache:/app/cache \
  -e NODE_ENV=production \
  personal-pipeline/mcp-server:latest

# Wait for health check
echo "Waiting for container to be healthy..."
for i in {1..30}; do
    if docker exec $CONTAINER_NAME curl -f http://localhost:3000/health; then
        echo "Container recovery successful"
        exit 0
    fi
    sleep 5
done

echo "Container recovery failed"
exit 1
```

#### Data Recovery
```bash
#!/bin/bash
# recover-data.sh

BACKUP_DIR="/backups/personal-pipeline"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.tar.gz | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "No backup found"
    exit 1
fi

echo "Restoring from backup: $LATEST_BACKUP"

# Stop container
docker stop personal-pipeline

# Restore data volume
docker run --rm \
  -v personal-pipeline-data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar xzf /backup/$(basename $LATEST_BACKUP) -C /

# Restart container
docker start personal-pipeline

echo "Data recovery completed"
```

---

## 📋 Container Deployment Checklist

### Pre-Deployment
- [ ] Choose appropriate registry (Docker Hub, ECR, ACR, GCR)
- [ ] Configure multi-architecture builds if needed
- [ ] Prepare configuration files and secrets
- [ ] Plan volume and data persistence strategy
- [ ] Design network architecture

### Deployment
- [ ] Pull or build container images
- [ ] Configure environment variables and secrets
- [ ] Set up volumes for persistent data
- [ ] Configure health checks and monitoring
- [ ] Deploy with appropriate orchestration tool

### Post-Deployment
- [ ] Verify container health checks are passing
- [ ] Test all application endpoints
- [ ] Monitor resource usage and performance
- [ ] Set up log aggregation and alerting
- [ ] Implement backup and recovery procedures

### Production Readiness
- [ ] Security scanning and hardening completed
- [ ] Resource limits and monitoring configured
- [ ] Load balancing and scaling strategy implemented
- [ ] Disaster recovery procedures tested
- [ ] Documentation updated

---

**Next Steps:**
- [Package Management Guide](./PACKAGES.md)
- [Enterprise Deployment](./ENTERPRISE-DEPLOYMENT.md)
- [Monitoring and Observability](./MONITORING.md)
- [Security Hardening](./SECURITY.md)