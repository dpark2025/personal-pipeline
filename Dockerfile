FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache \
    curl \
    bash \
    tzdata

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/
COPY config/ ./config/

# Create non-root user
RUN addgroup -g 1001 -S ppuser && \
    adduser -S ppuser -u 1001 -G ppuser

# Set ownership
RUN chown -R ppuser:ppuser /app
USER ppuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]