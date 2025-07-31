# Suggested Commands for Personal Pipeline Development

## Primary Development Commands
```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Start the MCP server (production)
npm start

# Run tests
npm test
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

## Code Quality Commands (MUST RUN BEFORE COMPLETION)
```bash
# Linting - MUST pass before marking tasks complete
npm run lint            # Check for linting errors
npm run lint:fix        # Auto-fix linting issues

# Formatting - MUST be consistent
npm run format          # Format code with Prettier
npm run format:check    # Check if formatting is correct

# Type checking - MUST pass
npm run typecheck       # Run TypeScript compiler checks
```

## Development Utilities
```bash
# Generate sample data and runbooks
npm run generate-sample-data

# Validate YAML configuration
npm run validate-config

# Interactive MCP client testing
npm run test-mcp

# Health check
npm run health

# Clean build artifacts
npm run clean
```

## Performance & Monitoring Commands
```bash
# Benchmarking
npm run benchmark
npm run benchmark:quick   # Quick 15-second test
npm run benchmark:stress  # Full stress test

# Load testing
npm run load-test
npm run load-test:peak    # Peak load scenario
npm run load-test:storm   # Storm scenario

# Performance monitoring
npm run performance:monitor
npm run performance:validate
npm run performance:reset
```

## Demo Environment Commands
```bash
# One-command demo setup
npm run demo:start

# Interactive walkthrough
npm run demo:walkthrough

# Validate demo
npm run demo:validate

# Stop demo
npm run demo:stop
```

## Git Commands (Darwin/macOS)
```bash
# Git is installed at: /opt/homebrew/bin/git
git status
git add .
git commit -m "type(scope): description"
git push origin branch-name

# Branch naming: feature/*, fix/*, docs/*
```

## System Utilities (Darwin/macOS specific)
```bash
# File operations
ls -la              # List files with details
find . -name "*.ts" # Find TypeScript files
grep -r "pattern"   # Search in files

# Process management
ps aux | grep node  # Find Node.js processes
lsof -i :3000      # Check what's using port 3000

# Directory navigation
cd /Users/dpark/projects/github.com/pp
pwd                # Print working directory
```

## Environment Setup
```bash
# Copy example config
cp config/config.sample.yaml config/config.yaml

# Set environment variables
export CONFLUENCE_TOKEN="your-token"
export GITHUB_TOKEN="your-token"
export REDIS_URL="redis://localhost:6379"
```