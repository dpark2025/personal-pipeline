# Personal Pipeline

An intelligent Model Context Protocol (MCP) server that transforms scattered operational knowledge into structured, actionable intelligence for automated incident response.

## What is Personal Pipeline?

Personal Pipeline is specifically designed to support LangGraph agents handling monitoring alerts by providing context-aware retrieval of runbooks, decision trees, and operational procedures. It transforms your operational documentation into an intelligent system that can respond to incidents automatically.

A fully operational TypeScript/Node.js MCP server with enterprise-grade features.

## 🚀 Quick Start

Choose your installation method:

```bash
# Method 1: From source (recommended for development)
git clone https://github.com/dpark2025/personal-pipeline.git
cd personal-pipeline
npm install && npm run build

# Method 2: Demo environment (fastest way to try it)
npm run demo:start

# Method 3: Docker (coming soon)
# docker run -p 3000:3000 personal-pipeline/mcp-server
```

## 🎯 Key Features

### Dual Access Patterns
- **MCP Protocol**: Native integration with LangGraph agents and MCP-compatible clients
- **REST API**: 11 HTTP endpoints for external integrations and web UIs

### Intelligence Layer
- **7 MCP Tools** for context-aware documentation retrieval
- **<200ms response times** for most operations
- **Confidence scoring** for all recommendations
- **Decision trees** for progressive incident resolution

### Enterprise Performance
- **Stable operation** with circuit breaker resilience
- **Improved cache performance** with hybrid Redis + memory caching
- **50+ concurrent operations** supported
- **Performance monitoring** with real-time dashboards

## 📖 Documentation

### Getting Started
- [Installation Guide](./guides/installation.md) - Complete setup instructions  
- [Configuration Guide](./guides/configuration.md) - Customizing your deployment
- [Architecture Overview](./guides/architecture.md) - Understanding the system design

### API Reference
- [MCP Tools](./api/mcp-tools.md) - 7 intelligent tools for documentation retrieval
- [REST API](./api/rest-api.md) - 11 HTTP endpoints for integration

### Examples & Guides
- [Quick Start](./examples/quickstart.md) - Get running in 5 minutes
- [Developer Guide](./guides/development.md) - Contributing and development setup

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Personal Pipeline                        │
│                    MCP Server Architecture                      │
└─────────────────────────────────────────────────────────────────┘

ACCESS PATTERNS:
  LangGraph Agent  ──────────►  MCP Protocol  ─┐
  External Systems ──────────►  REST API      ─┼──► Core Engine
  Demo Scripts     ──────────►  HTTP Client   ─┘

CORE ENGINE:
  ├── 7 MCP Tools (search_runbooks, get_decision_tree, etc.)
  ├── 11 REST Endpoints (search, health, performance, etc.)
  ├── Source Adapter Registry
  ├── Hybrid Caching Layer (Redis + Memory)
  └── Performance Monitoring

SOURCE ADAPTERS:
  ├── FileSystem Adapter     ──────► Local Files & Directories
  ├── Web Adapter            ──────► REST APIs & Website Content
  └── Database Adapter       ──────► PostgreSQL/MongoDB (Planned)

INFRASTRUCTURE:
  ├── Redis Cache            ──────► Improved performance
  ├── Circuit Breakers       ──────► Stable operation
  └── Health Monitoring      ──────► Real-time metrics
```

## 🛠️ Development

```bash
# Development environment
npm run dev

# Performance testing  
npm run benchmark

# Enhanced MCP explorer
npm run mcp-explorer

# Health monitoring
npm run health:dashboard
```

## 🚀 Performance Metrics

- **<200ms response time** for typical operations
- **Performance targets met** in benchmark testing  
- **11 REST API endpoints** with dual MCP/REST access
- **Stable operation** with error handling and resilience

---

Ready to get started? Check out our [Installation Guide](./guides/installation.md) or try the [Quick Start](./examples/quickstart.md).