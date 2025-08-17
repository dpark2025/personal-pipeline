# Personal Pipeline - Intelligent MCP Server

Welcome to the **Personal Pipeline** documentation - an intelligent Model Context Protocol (MCP) server designed for automated retrieval of internal documentation to support AI-driven monitoring alert response and incident management.

## 🚀 Quick Start

Get started with Personal Pipeline in under 5 minutes:

```bash
# Install from local registry
npm install @personal-pipeline/mcp-server --registry http://localhost:4873

# Or using Docker
docker run -p 3000:3000 personal-pipeline/mcp-server
```

## 📚 Documentation

### Core Features
- **7 MCP Tools** for intelligent documentation retrieval
- **11 REST API Endpoints** for flexible integration
- **Multi-source Adapters** supporting files, databases, and web sources
- **Enterprise-grade Caching** with Redis and memory layers
- **Performance Monitoring** with real-time dashboards

### Getting Started
- [Installation Guide](./guides/installation.md) - Complete setup instructions
- [Configuration Guide](./guides/configuration.md) - Customizing your deployment
- [Quick Start](./examples/quickstart.md) - Get running in 5 minutes

### API Reference
- [MCP Tools](./api/mcp-tools.md) - 7 intelligent tools for documentation retrieval
- [REST API](./api/rest-api.md) - 11 HTTP endpoints for integration
- [Source Adapters](./api/adapters.md) - Multi-source documentation support

### Registry & Distribution
- [Local Registry Setup](./registry/setup.md) - Private registry configuration
- [Package Management](./registry/packages.md) - Publishing and versioning
- [Docker Distribution](./registry/docker.md) - Container-based deployment

## 🏗️ Architecture

Personal Pipeline follows a modular architecture with dual access patterns:

```
External Systems → REST API → 
                            ↘
LangGraph Agent → MCP Protocol → Core Engine → Source Adapters
                            ↗                    ├── Wiki (Confluence, Notion)
         Demo Scripts → REST API                ├── Database (PostgreSQL, MongoDB)
                                               ├── Web (REST APIs, Websites)
                                               └── Files (Local, GitHub)
```

## 🎯 Performance

- **Sub-150ms** response time for critical runbook retrieval
- **99.9% uptime** with circuit breaker resilience
- **75% cache hit rate** with hybrid caching
- **50+ concurrent** operations supported

## 🛠️ Local Development

```bash
# Clone and setup
git clone https://github.com/your-username/personal-pipeline-mcp.git
cd personal-pipeline-mcp
npm install

# Start development environment
npm run dev

# Run tests
npm test

# Start local registry
npm run registry:start
```

## 📖 Learn More

- [Architecture Overview](./guides/architecture.md)
- [Development Guide](./guides/development.md)
- [Deployment Options](./guides/deployment.md)
- [API Examples](./examples/api-usage.md)

---

**Made with ❤️ by the Personal Pipeline Team**