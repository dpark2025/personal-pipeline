# Docker Distribution

Comprehensive guide to Docker-based distribution of Personal Pipeline, including multi-architecture builds, registry management, and container orchestration.

## Overview

Personal Pipeline provides multiple Docker distribution options:

- **Pre-built Images** - Ready-to-run containers from local registry
- **Multi-Architecture Support** - AMD64 and ARM64 builds
- **Development Images** - Hot-reload enabled containers for development
- **Production Images** - Optimized containers for production deployment

## Quick Start

```bash
# Pull and run latest image
docker run -p 3000:3000 localhost:5000/personal-pipeline/mcp-server:latest

# Or with environment configuration
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -v $(pwd)/config:/app/config \
  localhost:5000/personal-pipeline/mcp-server:latest
```

## Docker Registry Setup

### Local Docker Registry

```bash
# Start local Docker registry
docker run -d -p 5000:5000 --name pp-docker-registry \
  -v $(pwd)/registry-data/docker:/var/lib/registry \
  registry:2

# Verify registry is running
curl http://localhost:5000/v2/
```

### Registry with Docker Compose

```yaml
# docker-compose.registry.yml
version: '3.8'
services:
  docker-registry:
    image: registry:2
    container_name: pp-docker-registry
    ports:
      - "5000:5000"
    volumes:
      - ./registry-data/docker:/var/lib/registry
    environment:
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /var/lib/registry
      REGISTRY_HTTP_ADDR: 0.0.0.0:5000
    restart: unless-stopped

  registry-ui:
    image: joxit/docker-registry-ui:2
    container_name: pp-registry-ui
    ports:
      - "8080:80"
    environment:
      REGISTRY_TITLE: Personal Pipeline Registry
      REGISTRY_URL: http://docker-registry:5000
      DELETE_IMAGES: true
    depends_on:
      - docker-registry
```

## Building Images

### Multi-Architecture Builds

```bash
# Set up buildx for multi-platform builds
docker buildx create --name pp-builder --use
docker buildx inspect --bootstrap

# Build for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t localhost:5000/personal-pipeline/mcp-server:latest \
  --push .
```

### Development vs Production Builds

```dockerfile
# Dockerfile.dev - Development image with hot reload
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Dockerfile - Production image (optimized)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

### Build Scripts

```bash
# Build development image
docker build -f Dockerfile.dev -t localhost:5000/personal-pipeline/mcp-server:dev .

# Build production image
docker build -t localhost:5000/personal-pipeline/mcp-server:latest .

# Build with specific version tag
docker build -t localhost:5000/personal-pipeline/mcp-server:v1.2.3 .

# Push to local registry
docker push localhost:5000/personal-pipeline/mcp-server:latest
```

## Image Management

### Tagging Strategy

```bash
# Development tags
docker tag app:latest localhost:5000/personal-pipeline/mcp-server:dev
docker tag app:latest localhost:5000/personal-pipeline/mcp-server:feature-branch

# Release tags  
docker tag app:latest localhost:5000/personal-pipeline/mcp-server:v1.2.3
docker tag app:latest localhost:5000/personal-pipeline/mcp-server:latest
docker tag app:latest localhost:5000/personal-pipeline/mcp-server:stable

# Environment tags
docker tag app:latest localhost:5000/personal-pipeline/mcp-server:staging
docker tag app:latest localhost:5000/personal-pipeline/mcp-server:production
```

### Image Variants

```bash
# Base server image
localhost:5000/personal-pipeline/mcp-server:latest

# Development image with tools
localhost:5000/personal-pipeline/mcp-server:dev

# Minimal production image
localhost:5000/personal-pipeline/mcp-server:minimal

# Image with all adapters
localhost:5000/personal-pipeline/mcp-server:full

# Debug image with additional tools
localhost:5000/personal-pipeline/mcp-server:debug
```

## Container Configuration

### Environment Variables

```bash
# Core configuration
NODE_ENV=production
CONFIG_FILE=/app/config/config.yaml
LOG_LEVEL=info
PORT=3000

# Redis configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_redis_password

# Performance tuning
NODE_OPTIONS="--max-old-space-size=2048"
UV_THREADPOOL_SIZE=16

# Security
DROP_PRIVILEGES=true
RUN_AS_USER=node
```

### Volume Mounts

```bash
# Configuration files
-v $(pwd)/config:/app/config:ro

# Data persistence
-v pp-data:/app/data

# Logs
-v pp-logs:/app/logs

# Custom adapters
-v $(pwd)/custom-adapters:/app/src/adapters/custom:ro
```

### Complete Run Example

```bash
docker run -d \
  --name personal-pipeline \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e REDIS_URL=redis://redis:6379 \
  -v $(pwd)/config:/app/config:ro \
  -v pp-data:/app/data \
  -v pp-logs:/app/logs \
  --restart unless-stopped \
  localhost:5000/personal-pipeline/mcp-server:latest
```

## Docker Compose Orchestration

### Complete Stack

```yaml
# docker-compose.yml
version: '3.8'

services:
  personal-pipeline:
    image: localhost:5000/personal-pipeline/mcp-server:latest
    container_name: personal-pipeline-server
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379
      CONFIG_FILE: /app/config/config.yaml
    volumes:
      - ./config:/app/config:ro
      - pp-data:/app/data
      - pp-logs:/app/logs
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    container_name: personal-pipeline-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: personal-pipeline-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - personal-pipeline
    restart: unless-stopped

volumes:
  pp-data:
  pp-logs:
  redis-data:

networks:
  default:
    name: personal-pipeline-network
```

### Development Stack

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  personal-pipeline-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: personal-pipeline-dev
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    environment:
      NODE_ENV: development
      DEBUG: "personal-pipeline:*"
    volumes:
      - .:/app
      - /app/node_modules
      - ./config:/app/config
    command: npm run dev
    restart: unless-stopped

  redis-dev:
    image: redis:7-alpine
    container_name: personal-pipeline-redis-dev
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
```

## Image Optimization

### Multi-stage Build Optimization

```dockerfile
# Optimized production Dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

FROM node:18-alpine AS runtime
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy production dependencies and built application
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Image Size Optimization

```bash
# View image layers and sizes
docker history localhost:5000/personal-pipeline/mcp-server:latest

# Analyze image size
docker images localhost:5000/personal-pipeline/mcp-server

# Use dive to analyze layers
dive localhost:5000/personal-pipeline/mcp-server:latest
```

## Registry Operations

### Image Management

```bash
# List images in registry
curl http://localhost:5000/v2/_catalog

# List tags for specific image
curl http://localhost:5000/v2/personal-pipeline/mcp-server/tags/list

# Get image manifest
curl http://localhost:5000/v2/personal-pipeline/mcp-server/manifests/latest

# Delete image (if delete enabled)
curl -X DELETE http://localhost:5000/v2/personal-pipeline/mcp-server/manifests/sha256:...
```

### Registry Maintenance

```bash
# Garbage collection
docker exec pp-docker-registry registry garbage-collect /etc/docker/registry/config.yml

# View registry storage usage
du -sh ./registry-data/docker/

# Backup registry data
tar -czf docker-registry-backup-$(date +%Y%m%d).tar.gz ./registry-data/docker/
```

## Security & Best Practices

### Image Security

```dockerfile
# Security best practices in Dockerfile
FROM node:18-alpine

# Update packages
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Use non-root user
USER nodejs

# Avoid running as PID 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Registry Security

```yaml
# docker-compose.yml with authentication
services:
  docker-registry:
    image: registry:2
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
      REGISTRY_HTTP_TLS_KEY: /certs/domain.key
    volumes:
      - ./auth:/auth
      - ./certs:/certs
      - ./registry-data:/var/lib/registry
```

### Scanning for Vulnerabilities

```bash
# Scan image with Trivy
trivy image localhost:5000/personal-pipeline/mcp-server:latest

# Scan with Docker Scout
docker scout cves localhost:5000/personal-pipeline/mcp-server:latest

# Continuous scanning in CI/CD
docker scout quickview localhost:5000/personal-pipeline/mcp-server:latest
```

## Deployment Strategies

### Rolling Updates

```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: personal-pipeline
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      containers:
      - name: personal-pipeline
        image: localhost:5000/personal-pipeline/mcp-server:latest
        ports:
        - containerPort: 3000
```

### Blue-Green Deployment

```bash
# Deploy new version to green environment
docker-compose -f docker-compose.green.yml up -d

# Test green environment
curl http://green.personal-pipeline.local/health

# Switch traffic to green
# Update load balancer configuration

# Stop blue environment
docker-compose -f docker-compose.blue.yml down
```

## Monitoring & Observability

### Container Health Checks

```dockerfile
# Dockerfile health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Monitoring Stack

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana-data:/var/lib/grafana

  cadvisor:
    image: gcr.io/cadvisor/cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
```

## Next Steps

- [Security Guide](./security.md) - Advanced Docker security configuration
- [Monitoring](./monitoring.md) - Container monitoring and observability
- [Troubleshooting](./troubleshooting.md) - Common Docker issues and solutions
- [Production Deployment](../guides/deployment.md) - Production deployment strategies