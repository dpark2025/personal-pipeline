# Personal Pipeline

An intelligent Model Context Protocol (MCP) server that provides automated retrieval of internal documentation to support AI-driven monitoring alert response and incident management.

## Overview

This MCP server transforms scattered operational knowledge into structured, actionable intelligence for automated incident response. It's specifically designed to support LangGraph agents handling monitoring alerts by providing context-aware retrieval of runbooks, decision trees, and operational procedures.

The system provides dual access patterns (MCP + REST API), comprehensive documentation, and hybrid caching for improved performance.

## ✨ Key Features

### 🎯 Core Capabilities
- **🔍 Intelligent runbook retrieval** for operational scenarios with <200ms response times
- **🧠 Context-aware search** with semantic matching and confidence scoring
- **🤖 AI-optimized responses** for automated decision making and incident response  
- **🔄 Dual access patterns** - MCP Protocol + REST API
- **📊 Structured decision trees** for progressive incident resolution
- **🚨 Escalation management** with business hours and on-call awareness

### 🚀 Performance & Monitoring
- **💎 Hybrid Caching System** - Redis + memory with intelligent fallback
- **📈 Real-time Performance Monitoring** - Comprehensive metrics and health dashboards
- **🛡️ Health Monitoring** - Automated health checks and status reporting
- **⚙️ Circuit Breaker Protection** - Resilience patterns for reliability
- **🔍 Observability** - Structured logging and performance tracking

### 🏗️ Technical Features
- **📦 TypeScript/Node.js** - Modern, type-safe implementation
- **📚 Comprehensive Documentation** - VitePress website with multiple themes
- **🔄 Automated CI/CD** - GitHub Actions with quality gates
- **📋 Semantic Versioning** - Automated release management

## Prerequisites

### Required Dependencies
- **Node.js** >= 20.0.0
- **npm** >= 8.0.0

### Optional Dependencies
- **Redis** >= 6.0.0 - Optional caching layer for enhanced performance
  - **Without Redis**: System works in memory-only mode with automatic fallback
  - **With Redis**: Provides persistent caching across restarts and improved performance
  - **Setup**: Set `REDIS_URL` environment variable to enable

### Performance Comparison
| Mode | Cache Persistence | Startup Time | Memory Usage |
|------|------------------|--------------|--------------|
| Memory-Only | ❌ No | Fast | Higher |
| Hybrid (Redis) | ✅ Yes | Medium | Lower |

The system automatically detects Redis availability and gracefully falls back to memory-only mode if Redis is unavailable.

## Quick Start

### Demo Environment
Get started quickly with the demo environment:

```bash
# Start demo with sample data and monitoring
npm run demo:start

# Stop demo environment
npm run demo:stop
```

### Production Setup

```bash
# Clone the repository
git clone https://github.com/[username]/personal-pipeline.git
cd personal-pipeline

# Install dependencies
npm install

# Configure your documentation sources
cp config/config.sample.yaml config/config.yaml
# Edit config/config.yaml with your documentation sources

# Build the project
npm run build

# Start the MCP server
npm start

# Or run in development mode
npm run dev
```

## Architecture

The system follows a modular architecture with pluggable adapters for different documentation sources:

```
LangGraph Agent → MCP Protocol → Core Engine → Source Adapters
External Tools  → REST API    →               ├── FileSystem ✅ (Local files)
                                              ├── Web ✅ (REST APIs, Websites) 
                                              ├── GitHub 🚧 (Planned)
                                              └── Confluence 🚧 (Planned)
```

## Core MCP Tools

### Primary Tools
- `search_runbooks()` - Context-aware operational runbook retrieval
- `get_decision_tree()` - Retrieve decision logic for specific scenarios
- `get_procedure()` - Detailed execution steps for procedures
- `get_escalation_path()` - Determine appropriate escalation procedures

### Supporting Tools
- `list_sources()` - Manage documentation sources
- `search_knowledge_base()` - General documentation search
- `record_resolution_feedback()` - Capture outcomes for continuous improvement

## Performance

- **Runbook retrieval**: <200ms response times with caching
- **Concurrent operations**: Supports 50+ simultaneous queries
- **High availability**: Circuit breaker protection and graceful degradation
- **Test coverage**: 80%+ comprehensive testing
- **Caching**: Hybrid Redis + memory system for improved performance

## Supported Documentation Sources

### ✅ Currently Available
- **FileSystem**: Local documentation with advanced search and indexing
- **Web**: REST APIs and website content scraping

### 🚧 Planned
- **GitHub**: Repository documentation indexing
- **Confluence**: Wiki content integration
- **Enhanced Search**: Semantic search capabilities

## Configuration

Create a `config/config.yaml` file to define your documentation sources:

```yaml
sources:
  - name: "local-docs"
    type: "file"
    base_url: "./docs"
    recursive: true
    max_depth: 5
    supported_extensions:
      - '.md'
      - '.txt'
      - '.json'
      - '.yml'
    
  - name: "api-docs"
    type: "web"
    base_url: "https://api.example.com"
    endpoints:
      - path: "/docs"
        method: "GET"
        content_type: "json"
    performance:
      timeout_ms: 10000
      max_retries: 3
```

## Development

```bash
# Install development dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage

# Code quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code with Prettier
npm run typecheck       # Run TypeScript compiler checks

# Health check
npm run health          # Check if server is running

# Development utilities
npm run generate-sample-data  # Generate realistic test data
npm run validate-config       # Validate configuration files
npm run test-mcp             # Interactive MCP tool testing
```

## Contributing

We welcome contributions from developers of all skill levels! Personal Pipeline is an open source project that thrives on community involvement.

### Quick Start for Contributors
- **First-time contributors**: Look for issues labeled "good first issue"
- **Experienced developers**: Check out "help wanted" issues for bigger challenges
- **Documentation**: Help improve our guides and examples

### How to Contribute
1. **Read our guides**: [CONTRIBUTING.md](CONTRIBUTING.md) | [GOVERNANCE.md](GOVERNANCE.md)
2. **Join the discussion**: Use GitHub Issues and Discussions
3. **Submit code**: Fork, create a feature branch, and submit a pull request
4. **Report bugs**: Use our issue templates for clear bug reports
5. **Suggest features**: Share ideas for new functionality

### Community Standards
- Be respectful and inclusive in all interactions
- Provide constructive feedback in code reviews
- Help other contributors learn and grow
- Follow our coding standards and testing requirements

### Areas Where We Need Help
- **Source Adapters**: Add support for new documentation systems
- **Performance**: Optimize caching and search algorithms  
- **Testing**: Improve test coverage and add integration tests
- **Documentation**: Enhance guides and add usage examples
- **UI/UX**: Improve developer tools and interfaces

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Open Source Commitment
Personal Pipeline is committed to remaining open source. We believe in:
- **Transparency**: All development happens in the open
- **Community-driven**: Decisions made with community input
- **Accessibility**: Easy to use, contribute to, and understand
- **Sustainability**: Long-term support and maintenance

## Support

- **Documentation**: See the [docs/](docs/) directory for detailed guides
  - [Development Guide](docs/DEVELOPMENT.md) - Complete development setup and workflows
  - [Redis Setup Guide](docs/REDIS-SETUP.md) - Comprehensive Redis installation and configuration
  - [Caching Strategies](docs/CACHING-STRATEGIES.md) - Caching configuration and performance optimization
  - [Development Tools Guide](docs/DEVELOPMENT-TOOLS-GUIDE.md) - Using the development utilities
  - [API Documentation](docs/API.md) - MCP tools and HTTP endpoints
  - [Architecture](docs/ARCHITECTURE.md) - System design and components
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join the community discussions for questions and ideas

## Roadmap

### Current Focus
- **GitHub Adapter**: Repository documentation indexing (in development)
- **Confluence Adapter**: Wiki content integration (planned)
- **Enhanced Search**: Semantic search capabilities (planned)
- **Performance**: Continued optimization and monitoring improvements

## Development Scripts

The project includes comprehensive automation scripts for development, testing, and CI/CD:

### Key Development Scripts
- **`npm run dev`** - Development mode with hot reload  
- **`npm run build`** - Production build
- **`npm run test`** - Run test suite with coverage
- **`npm run lint`** - Code quality checking
- **`npm run demo:start`** - Demo environment setup
- **`npm run mcp-explorer`** - Interactive MCP testing tool

### CI/CD Automation
- **GitHub Actions workflows** for automated testing and releases
- **Semantic versioning** with automated changelog generation  
- **Quality gates** with TypeScript, ESLint, and test coverage
- **Performance benchmarking** and validation
