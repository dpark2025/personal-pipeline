# Local Registry Setup

This guide walks you through setting up a private npm registry and Docker registry for Personal Pipeline package distribution.

## Overview

Personal Pipeline supports local distribution through:
- **Private npm Registry** (Verdaccio) for npm packages
- **Local Docker Registry** for container images
- **Automated Publishing** with version management
- **Security & Access Control** for enterprise environments

## Quick Start

```bash
# Start the local registry
npm run registry:start

# Verify registry is running
npm run registry:health

# Set up authentication
npm run registry:adduser
```

## Prerequisites

- Node.js 18+ and npm 8+
- Docker and Docker Compose
- 2GB free disk space for registry data
- Port 4873 available for npm registry
- Port 5000 available for Docker registry

## npm Registry Setup

### 1. Start Verdaccio Registry

```bash
# Start the registry with Docker Compose
npm run registry:start

# Check status
npm run registry:status
```

### 2. Configure npm Client

```bash
# Add registry user
npm adduser --registry http://localhost:4873

# Configure as default registry
npm config set registry http://localhost:4873

# Verify configuration
npm config get registry
```

### 3. Publishing Packages

```bash
# Build and validate package
npm run package:build

# Publish to local registry
npm run package:publish

# Verify publication
npm run package:info
```

## Docker Registry Setup

### 1. Enable Docker Registry

Edit `docker-compose.npm-registry.yml` to enable Docker registry:

```yaml
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
```

### 2. Build and Push Images

```bash
# Build multi-architecture images
docker buildx build --platform linux/amd64,linux/arm64 \
  -t localhost:5000/personal-pipeline/mcp-server:latest .

# Push to local registry
docker push localhost:5000/personal-pipeline/mcp-server:latest
```

## Registry Configuration

### Verdaccio Configuration

The registry is configured via `config/verdaccio.yaml`:

```yaml
storage: ./storage
auth:
  htpasswd:
    file: ./htpasswd
    max_users: 1000

uplinks:
  npmjs:
    url: https://registry.npmjs.org/

packages:
  '@personal-pipeline/*':
    access: $authenticated
    publish: $authenticated
    proxy: npmjs

  '**':
    access: $all
    publish: $authenticated
    proxy: npmjs

server:
  keepAliveTimeout: 60

middlewares:
  audit:
    enabled: true

logs:
  - {type: stdout, format: pretty, level: http}
```

### Environment Variables

```bash
# Registry configuration
VERDACCIO_PORT=4873
VERDACCIO_CONFIG=./config/verdaccio.yaml

# Docker registry
DOCKER_REGISTRY_PORT=5000
DOCKER_REGISTRY_DATA=./registry-data/docker

# Security
REGISTRY_AUTH_TOKEN_REALM=http://localhost:4873
REGISTRY_AUTH_SERVICE=verdaccio
```

## Security & Access Control

### User Management

```bash
# Add new user
npm adduser --registry http://localhost:4873

# View current user
npm whoami --registry http://localhost:4873

# Logout
npm logout --registry http://localhost:4873
```

### Package Access Control

Configure package access in `verdaccio.yaml`:

```yaml
packages:
  # Private packages - authenticated users only
  '@personal-pipeline/*':
    access: $authenticated
    publish: $authenticated
    
  # Public packages - all users can access
  '@public/*':
    access: $all
    publish: $authenticated
```

### Docker Registry Security

For production deployments, enable authentication:

```yaml
# docker-compose.yml
services:
  docker-registry:
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: Registry Realm
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
    volumes:
      - ./auth:/auth
```

## Monitoring & Maintenance

### Health Checks

```bash
# Check registry health
npm run registry:health

# View registry logs
npm run registry:logs

# Check package info
npm info @personal-pipeline/mcp-server --registry http://localhost:4873
```

### Storage Management

```bash
# View storage usage
du -sh ./registry-data/

# Clean old package versions
npm run registry:cleanup --older-than=30d

# Backup registry data
tar -czf registry-backup-$(date +%Y%m%d).tar.gz ./registry-data/
```

### Performance Tuning

Optimize registry performance:

```yaml
# verdaccio.yaml
server:
  keepAliveTimeout: 60
  maxHeaderSize: 8192

storage:
  caching:
    enabled: true
    ttl: 300

web:
  enable: true
  title: Personal Pipeline Registry
```

## Troubleshooting

### Common Issues

**Registry not starting:**
```bash
# Check port availability
lsof -i :4873

# Restart with clean state
npm run registry:stop && npm run registry:start
```

**Authentication errors:**
```bash
# Clear npm authentication
npm logout --registry http://localhost:4873

# Re-authenticate
npm adduser --registry http://localhost:4873
```

**Package publishing failures:**
```bash
# Verify package.json publishConfig
cat package.json | jq '.publishConfig'

# Check authentication
npm whoami --registry http://localhost:4873

# Validate package
npm run package:validate
```

### Log Analysis

```bash
# View Verdaccio logs
docker logs pp-npm-registry

# View detailed npm logs
npm publish --loglevel verbose --registry http://localhost:4873
```

## Enterprise Features

### High Availability Setup

For production environments:

```yaml
# docker-compose.prod.yml
services:
  verdaccio-1:
    image: verdaccio/verdaccio
    deploy:
      replicas: 2
  
  redis:
    image: redis:alpine
    volumes:
      - redis-data:/data
  
  nginx:
    image: nginx
    depends_on:
      - verdaccio-1
```

### Backup & Recovery

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "registry-backup-${DATE}.tar.gz" ./registry-data/
aws s3 cp "registry-backup-${DATE}.tar.gz" s3://backups/registry/
```

## Next Steps

- [Package Management](./packages.md) - Managing package versions and dependencies
- [Docker Distribution](./docker.md) - Container-based deployment
- [Security Guide](./security.md) - Advanced security configuration
- [Monitoring](./monitoring.md) - Registry monitoring and alerting