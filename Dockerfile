# ==============================================================================
# Personal Pipeline MCP Server - Production Dockerfile
# ==============================================================================
# Multi-stage Docker build for production-ready container
# Supports multi-architecture builds (amd64, arm64)
# Optimized for security, performance, and minimal attack surface

# ==============================================================================
# Build Stage
# ==============================================================================
FROM node:18-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Verify package-lock.json exists and install dependencies
RUN ls -la package* && npm ci --silent

# Copy source code
COPY src/ ./src/
COPY config/*.sample.yaml ./config/

# Build the application
RUN npm run build

# Remove devDependencies to reduce size
RUN npm ci --only=production --silent

# ==============================================================================
# Runtime Stage
# ==============================================================================
FROM node:18-slim AS runtime

# Install runtime dependencies and security updates
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y \
    dumb-init \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

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
COPY --from=builder /app/config ./config

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/cache /app/logs /app/config && \
    chown -R ppuser:ppuser /app

# Copy default configuration samples
COPY config/config.sample.yaml /app/config/
COPY config/web-sample.yaml /app/config/
COPY config/web-simple-sample.yaml /app/config/

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
      org.opencontainers.image.version="0.1.0" \
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