# Personal Pipeline - Deployment Guide

Comprehensive deployment documentation for Personal Pipeline MCP server covering all deployment scenarios from development to enterprise production.

## 📋 Table of Contents

- [Deployment Options Overview](#deployment-options-overview)
- [Docker Deployment](#docker-deployment)
- [npm Package Deployment](#npm-package-deployment)
- [Source Code Deployment](#source-code-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [Configuration Management](#configuration-management)
- [Security Considerations](#security-considerations)
- [Monitoring and Observability](#monitoring-and-observability)
- [Scaling and High Availability](#scaling-and-high-availability)

## 🚀 Deployment Options Overview

### Decision Matrix

| Deployment Method | Use Case | Complexity | Performance | Isolation | Scalability |
|-------------------|----------|------------|-------------|-----------|-------------|
| **Docker** | Production, Cloud | Medium | High | Excellent | Excellent |
| **npm Global** | Development, CLI | Low | High | Fair | Limited |
| **npm Local** | Integration | Low | High | Good | Limited |
| **Source Build** | Custom, Edge Cases | High | Highest | Good | Excellent |
| **Cloud Managed** | Enterprise | Medium | High | Excellent | Excellent |

### Quick Recommendations

- **🏢 Enterprise Production**: Docker with orchestration (Kubernetes, Docker Swarm)
- **☁️ Cloud Deployment**: Container services (AWS ECS, Google Cloud Run, Azure Container Instances)
- **🧑‍💻 Development**: npm global install or Docker with volumes
- **🔧 Integration**: npm local install or programmatic usage
- **📦 CI/CD**: Docker containers with automated registry deployment

## 🐳 Docker Deployment

### Basic Docker Deployment

#### Single Container
```bash
# Pull the latest image
docker pull personal-pipeline/mcp-server:latest

# Run with default settings
docker run -d \
  --name personal-pipeline \
  -p 3000:3000 \
  -v personal-pipeline-data:/app/data \
  -v personal-pipeline-cache:/app/cache \
  -v personal-pipeline-logs:/app/logs \
  personal-pipeline/mcp-server:latest
```

#### With Custom Configuration
```bash
# Create configuration directory
mkdir -p ./config

# Copy sample configuration
curl -o ./config/config.yaml \
  https://raw.githubusercontent.com/your-username/personal-pipeline-mcp/main/config/config.sample.yaml

# Run with custom config
docker run -d \
  --name personal-pipeline \
  -p 3000:3000 \
  -v $(pwd)/config:/app/config:ro \
  -v personal-pipeline-data:/app/data \
  -v personal-pipeline-cache:/app/cache \
  -e LOG_LEVEL=info \
  -e NODE_ENV=production \
  personal-pipeline/mcp-server:latest
```

### Docker Compose Deployment

#### Basic Setup
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
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./config:/app/config:ro
      - personal-pipeline-data:/app/data
      - personal-pipeline-cache:/app/cache
      - personal-pipeline-logs:/app/logs
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
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  personal-pipeline-data:
  personal-pipeline-cache:
  personal-pipeline-logs:
  redis-data:

networks:
  default:
    name: personal-pipeline-network
```

```bash
# Deploy with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f personal-pipeline

# Scale (if needed)
docker-compose up -d --scale personal-pipeline=3
```

#### Production Setup with Load Balancer
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - personal-pipeline
    restart: unless-stopped

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
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=warn
      - REDIS_URL=redis://redis:6379
      - API_KEY_REQUIRED=true
      - API_KEY_ENV=PP_API_KEY
    volumes:
      - ./config:/app/config:ro
      - personal-pipeline-data:/app/data
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb

volumes:
  personal-pipeline-data:
  redis-data:
```

### Multi-Architecture Deployment

#### Build for Multiple Architectures
```bash
# Enable Docker buildx
docker buildx create --name multiarch --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag personal-pipeline/mcp-server:latest \
  --push .
```

#### Platform-Specific Deployment
```bash
# ARM64 (Apple Silicon, ARM servers)
docker run --platform linux/arm64 \
  personal-pipeline/mcp-server:latest

# AMD64 (Intel/AMD servers)
docker run --platform linux/amd64 \
  personal-pipeline/mcp-server:latest
```

## 📦 npm Package Deployment

### Global Installation

#### Standard Global Install
```bash
# Install globally
npm install -g @personal-pipeline/mcp-server

# Verify installation
personal-pipeline --version
pp-mcp --version

# Start server
personal-pipeline start

# Start with custom configuration
personal-pipeline start --config ./config/config.yaml --port 8080
```

#### Global Install with Version Pinning
```bash
# Install specific version
npm install -g @personal-pipeline/mcp-server@0.1.0

# Install from specific registry
npm install -g @personal-pipeline/mcp-server \
  --registry https://your-private-registry.com

# Update global installation
npm update -g @personal-pipeline/mcp-server
```

### Local Project Installation

#### As Dependency
```bash
# Install as dependency
npm install @personal-pipeline/mcp-server

# Install as dev dependency
npm install --save-dev @personal-pipeline/mcp-server

# Install from private registry
npm install @personal-pipeline/mcp-server \
  --registry https://your-private-registry.com
```

#### Package.json Scripts
```json
{
  "scripts": {
    "pp:start": "personal-pipeline start",
    "pp:dev": "personal-pipeline start --debug",
    "pp:test": "personal-pipeline test --integration",
    "pp:benchmark": "personal-pipeline benchmark --quick"
  },
  "dependencies": {
    "@personal-pipeline/mcp-server": "^0.1.0"
  }
}
```

### Programmatic Usage

#### Basic Server Integration
```javascript
// server.js
import { PersonalPipelineServer, ConfigManager } from '@personal-pipeline/mcp-server';

async function startServer() {
  try {
    // Load configuration
    const config = await ConfigManager.loadConfig('./config/config.yaml');
    
    // Create server instance
    const server = new PersonalPipelineServer(config);
    
    // Start server
    await server.start();
    
    console.log('Personal Pipeline server started successfully');
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

#### Express.js Integration
```javascript
// app.js
import express from 'express';
import { PersonalPipelineServer } from '@personal-pipeline/mcp-server';

const app = express();
const pipelineConfig = {
  sources: [
    {
      name: 'local-docs',
      type: 'file',
      path: './documentation'
    }
  ],
  cache: { strategy: 'memory' },
  server: { port: 3001 } // Different port for MCP server
};

let pipelineServer;

async function startApp() {
  try {
    // Start Personal Pipeline server
    pipelineServer = new PersonalPipelineServer(pipelineConfig);
    await pipelineServer.start();
    
    // Add middleware to use Personal Pipeline
    app.use('/api/docs', async (req, res, next) => {
      req.pipelineServer = pipelineServer;
      next();
    });
    
    // API routes using Personal Pipeline
    app.get('/api/docs/search', async (req, res) => {
      try {
        const { query, limit = 10 } = req.query;
        const results = await req.pipelineServer.searchKnowledgeBase(query, { limit });
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Start Express server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Express server running on port ${PORT}`);
      console.log(`Personal Pipeline MCP server running on port 3001`);
    });
    
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (pipelineServer) {
    await pipelineServer.stop();
  }
  process.exit(0);
});

startApp();
```

## 🔧 Source Code Deployment

### From Git Repository

#### Development Build
```bash
# Clone repository
git clone https://github.com/your-username/personal-pipeline-mcp.git
cd personal-pipeline-mcp

# Install dependencies
npm install

# Build project
npm run build

# Start in development mode
npm run dev

# Or start production build
npm start
```

#### Production Build
```bash
# Clone and build
git clone https://github.com/your-username/personal-pipeline-mcp.git
cd personal-pipeline-mcp

# Install production dependencies only
npm ci --only=production

# Build for production
NODE_ENV=production npm run build

# Start production server
NODE_ENV=production npm start
```

### Custom Build Process

#### With Environment-Specific Configuration
```bash
#!/bin/bash
# deploy.sh

set -e

ENVIRONMENT=${1:-production}
CONFIG_DIR="./config/environments/${ENVIRONMENT}"

echo "Deploying to ${ENVIRONMENT} environment..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Copy environment-specific configuration
cp "${CONFIG_DIR}/config.yaml" ./config/config.yaml
cp "${CONFIG_DIR}/.env" ./.env

# Build application
NODE_ENV=${ENVIRONMENT} npm run build

# Restart service
pm2 restart personal-pipeline || pm2 start dist/index.js --name personal-pipeline

echo "Deployment to ${ENVIRONMENT} completed successfully"
```

#### With Database Migrations
```bash
#!/bin/bash
# deploy-with-migrations.sh

set -e

echo "Starting deployment with database migrations..."

# Backup current version
cp -r ./config ./config.backup.$(date +%Y%m%d_%H%M%S)

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Run database migrations (if applicable)
npm run migrate

# Build application
npm run build

# Test configuration
npm run config --validate

# Restart service with zero-downtime
npm run deploy:rolling-update

echo "Deployment completed successfully"
```

## ☁️ Cloud Platform Deployment

### AWS Deployment

#### ECS (Elastic Container Service)
```json
{
  "family": "personal-pipeline",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "personal-pipeline",
      "image": "personal-pipeline/mcp-server:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "LOG_LEVEL", "value": "info"},
        {"name": "REDIS_URL", "value": "redis://your-redis-cluster.cache.amazonaws.com:6379"}
      ],
      "secrets": [
        {"name": "GITHUB_TOKEN", "valueFrom": "arn:aws:secretsmanager:region:account:secret:github-token"},
        {"name": "PP_API_KEY", "valueFrom": "arn:aws:secretsmanager:region:account:secret:pp-api-key"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/personal-pipeline",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Lambda (Serverless)
```javascript
// lambda-handler.js
import { PersonalPipelineServer } from '@personal-pipeline/mcp-server';

let server;

export const handler = async (event, context) => {
  // Initialize server if not already done
  if (!server) {
    const config = {
      sources: [
        {
          name: 'aws-docs',
          type: 's3',
          bucket: process.env.DOCS_BUCKET,
          prefix: 'documentation/'
        }
      ],
      cache: {
        strategy: 'elasticache',
        redis: {
          url: process.env.REDIS_URL
        }
      }
    };
    
    server = new PersonalPipelineServer(config);
    await server.start();
  }
  
  // Handle API Gateway event
  const { httpMethod, path, body, queryStringParameters } = event;
  
  try {
    let result;
    
    if (path === '/search' && httpMethod === 'POST') {
      const { query, limit } = JSON.parse(body);
      result = await server.searchKnowledgeBase(query, { limit });
    } else if (path === '/health' && httpMethod === 'GET') {
      result = { status: 'healthy', timestamp: new Date().toISOString() };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Lambda error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

### Google Cloud Platform

#### Cloud Run
```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: personal-pipeline
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/memory: "1Gi"
        run.googleapis.com/cpu: "1000m"
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
      - image: gcr.io/your-project/personal-pipeline:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-connection
              key: url
        resources:
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
```

```bash
# Deploy to Cloud Run
gcloud run deploy personal-pipeline \
  --image gcr.io/your-project/personal-pipeline:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --port 3000
```

### Azure Container Instances

```json
{
  "apiVersion": "2021-07-01",
  "type": "Microsoft.ContainerInstance/containerGroups",
  "name": "personal-pipeline",
  "location": "East US",
  "properties": {
    "containers": [
      {
        "name": "personal-pipeline",
        "properties": {
          "image": "personal-pipeline/mcp-server:latest",
          "ports": [
            {
              "protocol": "TCP",
              "port": 3000
            }
          ],
          "environmentVariables": [
            {"name": "NODE_ENV", "value": "production"},
            {"name": "LOG_LEVEL", "value": "info"}
          ],
          "resources": {
            "requests": {
              "memoryInGB": 1,
              "cpu": 1
            }
          }
        }
      }
    ],
    "ipAddress": {
      "type": "Public",
      "ports": [
        {
          "protocol": "TCP",
          "port": 3000
        }
      ]
    },
    "osType": "Linux",
    "restartPolicy": "Always"
  }
}
```

## 🔧 Configuration Management

### Environment-Based Configuration

#### Directory Structure
```
config/
├── environments/
│   ├── development/
│   │   ├── config.yaml
│   │   └── .env
│   ├── staging/
│   │   ├── config.yaml
│   │   └── .env
│   └── production/
│       ├── config.yaml
│       └── .env
├── config.sample.yaml
└── schema.json
```

#### Environment-Specific Configurations

**Development** (`config/environments/development/config.yaml`):
```yaml
sources:
  - name: "local-docs"
    type: "file"
    path: "./test-data"
    watch: true

cache:
  strategy: "memory"
  memory:
    max_keys: 100
    ttl: 600

server:
  port: 3000
  cors_enabled: true
  debug: true

logging:
  level: "debug"
  console: true
```

**Production** (`config/environments/production/config.yaml`):
```yaml
sources:
  - name: "github-docs"
    type: "github"
    owner: "your-org"
    repo: "documentation"
    auth:
      token_env: "GITHUB_TOKEN"
  
  - name: "confluence-wiki"
    type: "confluence"
    base_url_env: "CONFLUENCE_BASE_URL"
    auth:
      type: "bearer_token"
      token_env: "CONFLUENCE_TOKEN"

cache:
  strategy: "redis"
  redis:
    url_env: "REDIS_URL"
    key_prefix: "pp:"
    ttl: 3600
  memory:
    max_keys: 1000
    ttl: 300

server:
  port: 3000
  host: "0.0.0.0"
  cors_enabled: true
  cors_origins: ["https://yourdomain.com"]
  rate_limit:
    enabled: true
    window: 15
    max_requests: 1000

security:
  api_key_required: true
  api_key_env: "PP_API_KEY"

logging:
  level: "info"
  console: false
  file: "/app/logs/app.log"
```

### Configuration Templates

#### Kubernetes ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: personal-pipeline-config
data:
  config.yaml: |
    sources:
      - name: "k8s-docs"
        type: "file"
        path: "/mnt/docs"
    cache:
      strategy: "redis"
      redis:
        url: "redis://redis-service:6379"
    server:
      port: 3000
      host: "0.0.0.0"
```

#### Docker Secrets
```bash
# Create secrets
echo "your-github-token" | docker secret create github_token -
echo "your-api-key" | docker secret create pp_api_key -

# Use in docker-compose.yml
version: '3.8'
services:
  personal-pipeline:
    image: personal-pipeline/mcp-server:latest
    secrets:
      - github_token
      - pp_api_key
    environment:
      - GITHUB_TOKEN_FILE=/run/secrets/github_token
      - PP_API_KEY_FILE=/run/secrets/pp_api_key

secrets:
  github_token:
    external: true
  pp_api_key:
    external: true
```

## 🔐 Security Considerations

### Authentication and Authorization

#### API Key Authentication
```yaml
# config.yaml
security:
  api_key_required: true
  api_key_env: "PP_API_KEY"
  api_key_header: "X-API-Key"  # Default header name
```

```bash
# Set API key
export PP_API_KEY="your-secure-random-api-key"

# Use with curl
curl -H "X-API-Key: your-secure-random-api-key" \
  http://localhost:3000/api/search
```

#### JWT Authentication
```yaml
# config.yaml
security:
  jwt_enabled: true
  jwt_secret_env: "JWT_SECRET"
  jwt_expiry: "1h"
  jwt_issuer: "personal-pipeline"
```

### Network Security

#### SSL/TLS Configuration
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS;
    
    location / {
        proxy_pass http://personal-pipeline:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Firewall Rules
```bash
# UFW (Ubuntu Firewall)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 3000/tcp   # Block direct access to app
ufw enable

# iptables
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP
```

### Container Security

#### Security Scanning
```bash
# Scan container for vulnerabilities
docker scout cves personal-pipeline/mcp-server:latest

# Trivy scanning
trivy image personal-pipeline/mcp-server:latest

# Snyk scanning
snyk container test personal-pipeline/mcp-server:latest
```

#### Secure Container Deployment
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
  -p 3000:3000 \
  personal-pipeline/mcp-server:latest
```

## 📊 Monitoring and Observability

### Health Checks

#### Application Health Endpoints
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health with metrics
curl http://localhost:3000/health/detailed

# Component-specific health
curl http://localhost:3000/health/cache
curl http://localhost:3000/health/sources
curl http://localhost:3000/health/performance
```

#### Docker Health Checks
```dockerfile
# In Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

#### Kubernetes Probes
```yaml
# In deployment.yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 60
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Logging

#### Structured Logging Configuration
```yaml
# config.yaml
logging:
  level: "info"
  format: "json"
  console: true
  file: "/app/logs/app.log"
  rotation:
    max_files: 10
    max_size: "10mb"
  fields:
    service: "personal-pipeline"
    version: "0.1.0"
```

#### Log Aggregation
```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  personal-pipeline:
    image: personal-pipeline/mcp-server:latest
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "localhost:24224"
        tag: "personal-pipeline"

  fluentd:
    image: fluent/fluentd:v1.14
    volumes:
      - ./fluentd.conf:/fluentd/etc/fluent.conf
    ports:
      - "24224:24224"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
```

### Metrics and Monitoring

#### Prometheus Metrics
```bash
# Get Prometheus metrics
curl http://localhost:3000/metrics?format=prometheus
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Personal Pipeline Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph", 
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "cache_hits_total / (cache_hits_total + cache_misses_total) * 100",
            "legendFormat": "Hit Rate %"
          }
        ]
      }
    ]
  }
}
```

## 🚀 Scaling and High Availability

### Horizontal Scaling

#### Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Create service with replicas
docker service create \
  --name personal-pipeline \
  --replicas 3 \
  --publish 3000:3000 \
  --mount type=bind,source=$(pwd)/config,target=/app/config \
  personal-pipeline/mcp-server:latest

# Scale service
docker service scale personal-pipeline=5
```

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: personal-pipeline
spec:
  replicas: 3
  selector:
    matchLabels:
      app: personal-pipeline
  template:
    metadata:
      labels:
        app: personal-pipeline
    spec:
      containers:
      - name: personal-pipeline
        image: personal-pipeline/mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30

---
apiVersion: v1
kind: Service
metadata:
  name: personal-pipeline-service
spec:
  selector:
    app: personal-pipeline
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: personal-pipeline-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: personal-pipeline
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Load Balancing

#### Nginx Load Balancer
```nginx
# nginx.conf
upstream personal_pipeline {
    least_conn;
    server personal-pipeline-1:3000 max_fails=3 fail_timeout=30s;
    server personal-pipeline-2:3000 max_fails=3 fail_timeout=30s;
    server personal-pipeline-3:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://personal_pipeline;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Health check
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Retry failed requests
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_next_upstream_tries 3;
        proxy_next_upstream_timeout 10s;
    }
    
    location /health {
        access_log off;
        proxy_pass http://personal_pipeline/health;
    }
}
```

### Database and Cache Scaling

#### Redis Cluster
```yaml
# redis-cluster.yml
version: '3.8'

services:
  redis-node-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7001:6379"
    volumes:
      - redis-1-data:/data

  redis-node-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7002:6379"
    volumes:
      - redis-2-data:/data

  redis-node-3:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7003:6379"
    volumes:
      - redis-3-data:/data

volumes:
  redis-1-data:
  redis-2-data:
  redis-3-data:
```

```bash
# Initialize Redis cluster
docker-compose -f redis-cluster.yml up -d

# Create cluster
docker exec -it redis-node-1 redis-cli --cluster create \
  redis-node-1:6379 redis-node-2:6379 redis-node-3:6379 \
  --cluster-replicas 0
```

## 🔄 Backup and Recovery

### Configuration Backup
```bash
#!/bin/bash
# backup-config.sh

BACKUP_DIR="/backups/personal-pipeline/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup configuration
cp -r ./config "$BACKUP_DIR/"

# Backup data volumes (if using Docker)
docker run --rm \
  -v personal-pipeline-data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/data.tar.gz /data

# Backup Redis data
docker run --rm \
  -v redis-data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/redis.tar.gz /data

echo "Backup completed: $BACKUP_DIR"
```

### Automated Backup with Cron
```bash
# Add to crontab
0 2 * * * /path/to/backup-config.sh

# Weekly full backup
0 1 * * 0 /path/to/full-backup.sh

# Monthly archive
0 0 1 * * /path/to/archive-backup.sh
```

### Disaster Recovery
```bash
#!/bin/bash
# restore-backup.sh

BACKUP_DATE=${1:-$(date +%Y-%m-%d)}
BACKUP_DIR="/backups/personal-pipeline/$BACKUP_DATE"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "Restoring from backup: $BACKUP_DIR"

# Stop services
docker-compose down

# Restore configuration
cp -r "$BACKUP_DIR/config" ./

# Restore data
docker run --rm \
  -v personal-pipeline-data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar xzf /backup/data.tar.gz -C /

# Restore Redis data
docker run --rm \
  -v redis-data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar xzf /backup/redis.tar.gz -C /

# Start services
docker-compose up -d

echo "Restore completed from $BACKUP_DIR"
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Choose appropriate deployment method
- [ ] Review security requirements
- [ ] Plan backup and recovery strategy
- [ ] Prepare monitoring and alerting
- [ ] Test configuration in staging environment

### Deployment
- [ ] Deploy application with chosen method
- [ ] Configure SSL/TLS certificates
- [ ] Set up load balancing (if required)
- [ ] Configure monitoring and logging
- [ ] Test all endpoints and functionality

### Post-Deployment
- [ ] Verify health checks are passing
- [ ] Monitor performance metrics
- [ ] Set up automated backups
- [ ] Document deployment process
- [ ] Plan scaling strategy

### Production Readiness
- [ ] Security hardening completed
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested
- [ ] Load testing completed
- [ ] Documentation updated

---

**Next Steps:**
- [Container-Specific Deployment](./CONTAINERS.md)
- [Package Management](./PACKAGES.md)  
- [Enterprise Deployment](./ENTERPRISE-DEPLOYMENT.md)
- [Monitoring Guide](./MONITORING.md)