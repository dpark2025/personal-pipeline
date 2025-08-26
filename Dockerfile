# ==============================================================================
# Personal Pipeline MCP Server - Production Dockerfile
# ==============================================================================
# Multi-stage Docker build for production-ready container
# Supports multi-architecture builds (amd64, arm64)
# Optimized for security, performance, and minimal attack surface

# ==============================================================================
# Build Stage
# ==============================================================================
FROM node:20-slim AS builder

# Install only essential build dependencies (optimized for speed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Install dependencies with optimizations
RUN npm ci --silent --prefer-offline --no-audit --no-fund

# Copy source code
COPY src/ ./src/
COPY config/*.sample.yaml ./config/

# Build the application
RUN npm run build

# Remove devDependencies to reduce size
RUN npm ci --only=production --silent --prefer-offline --no-audit --no-fund

# ==============================================================================
# Runtime Stage
# ==============================================================================
FROM node:20-slim AS runtime

# Install minimal runtime dependencies (optimized)
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    curl \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create non-root user for security
RUN groupadd -g 1001 ppuser && \
    useradd -r -u 1001 -g ppuser ppuser

# Set working directory
WORKDIR /app

# Copy package.json for metadata and scripts
COPY package*.json ./

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Copy configuration samples and test config
COPY config/*.sample.yaml /app/config/
COPY config/config.test.yaml /app/config/

# Create minimal test data for container testing (avoiding build context issues)
RUN mkdir -p /test-data/runbooks /test-data/knowledge-base && \
    echo '{"id":"test-runbook-001","title":"Container Health Check Validation","version":"1.0.0","triggers":[{"alert_type":"test_alert","severity":["LOW","MEDIUM","HIGH"],"systems":["test-system","container","api"],"conditions":["service_name == '\''personal-pipeline'\''","environment == '\''test'\''"]}],"severity_mapping":{"LOW":{"response_time_sla":"< 5 minutes","escalation_threshold":"15 minutes"},"MEDIUM":{"response_time_sla":"< 2 minutes","escalation_threshold":"10 minutes"},"HIGH":{"response_time_sla":"< 1 minute","escalation_threshold":"5 minutes"}},"decision_tree":{"root":{"condition":"Is API responding to health checks?","actions":{"yes":{"condition":"Are source adapters healthy?","actions":{"yes":"proceed_to_cache_check","no":"check_source_configuration"}},"no":"restart_service"}},"proceed_to_cache_check":{"condition":"Is cache system operational?","actions":{"yes":"validate_mcp_tools","no":"check_cache_configuration"}}},"procedures":[{"id":"validate_api_health","name":"Validate API Health Check","steps":[{"step":1,"action":"Send GET request to /api/health","expected_result":"HTTP 200 or 503 with structured response","timeout_seconds":10},{"step":2,"action":"Verify response contains configuration section","expected_result":"sources_configured, cache_enabled, tools_available fields present"},{"step":3,"action":"Check for proper error handling","expected_result":"No INTERNAL_SERVER_ERROR responses"}]}],"metadata":{"confidence_score":1.0,"success_rate":1.0,"last_validated":"2025-08-26","test_environment":true,"dependencies":[]}}' > /test-data/runbooks/test-runbook.json && \
    echo '# Container Health Check Test Runbook\n\nThis is a test runbook for validating container health checks.\n\n## Purpose\nValidate that the API health check system works correctly in containerized environments.\n\n## Test Scenarios\n- API responds to /api/health requests\n- Source adapters report proper status\n- Cache system is operational' > /test-data/runbooks/test-runbook.md && \
    echo '{"title":"Test Knowledge Base Entry","content":"This is test knowledge base content for container validation.","category":"testing","tags":["container","health-check","validation"]}' > /test-data/knowledge-base/test-kb.json

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/cache /app/logs /app/config && \
    chown -R ppuser:ppuser /app && \
    chown -R ppuser:ppuser /test-data

# Health check script
COPY <<EOF /usr/local/bin/healthcheck.sh
#!/bin/sh
set -e

# Default values
HOST=\${HEALTH_CHECK_HOST:-localhost}
PORT=\${HEALTH_CHECK_PORT:-3000}
PATH=\${HEALTH_CHECK_PATH:-/health}
TIMEOUT=\${HEALTH_CHECK_TIMEOUT:-10}

# Perform health check
curl -f -s --max-time \$TIMEOUT "http://\$HOST:\$PORT\$PATH" || exit 1
EOF

RUN chmod +x /usr/local/bin/healthcheck.sh

# Set up environment
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    PORT=3000 \
    HOST=0.0.0.0 \
    CONFIG_PATH=/app/config/config.yaml \
    CACHE_DIR=/app/cache \
    DATA_DIR=/app/data \
    LOG_DIR=/app/logs

# Expose port
EXPOSE 3000

# Set up volumes for persistent data
VOLUME ["/app/config", "/app/data", "/app/cache", "/app/logs"]

# Switch to non-root user
USER ppuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Default command
CMD ["npm", "start"]

# ==============================================================================
# Labels for metadata
# ==============================================================================
LABEL org.opencontainers.image.title="Personal Pipeline MCP Server" \
      org.opencontainers.image.description="Intelligent MCP server for documentation retrieval and incident response" \
      org.opencontainers.image.vendor="Personal Pipeline Team" \
      org.opencontainers.image.version="0.3.5" \
      org.opencontainers.image.url="https://personal-pipeline.dev" \
      org.opencontainers.image.documentation="https://github.com/your-username/personal-pipeline-mcp" \
      org.opencontainers.image.source="https://github.com/your-username/personal-pipeline-mcp" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.authors="team@personal-pipeline.dev"

# ==============================================================================
# Runtime Configuration Examples
# ==============================================================================
# Environment variables that can be set at runtime:
#
# PORT=3000                    # Server port
# HOST=0.0.0.0                # Server host
# LOG_LEVEL=info              # Logging level (debug, info, warn, error)
# CONFIG_PATH=/app/config/config.yaml  # Configuration file path
# REDIS_URL=redis://redis:6379          # Redis connection string
# NODE_ENV=production         # Node environment
#
# Example run command:
# docker run -d \
#   --name personal-pipeline \
#   -p 3000:3000 \
#   -v $(pwd)/config:/app/config:ro \
#   -v personal-pipeline-data:/app/data \
#   -v personal-pipeline-cache:/app/cache \
#   -e REDIS_URL=redis://redis:6379 \
#   -e LOG_LEVEL=info \
#   personal-pipeline/mcp-server:latest