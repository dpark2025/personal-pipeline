# Personal Pipeline (PP)

> **🎉 Status**: Milestone 1.2 Complete - Enhanced with development tools and testing utilities! See [docs/MILESTONE-1.1.md](docs/MILESTONE-1.1.md) for Phase 1 details.

An intelligent Model Context Protocol (MCP) server that provides automated retrieval of internal documentation to support AI-driven monitoring alert response and incident management.

## Overview

This MCP server transforms scattered operational knowledge into structured, actionable intelligence for automated incident response. It's specifically designed to support LangGraph agents handling monitoring alerts by providing context-aware retrieval of runbooks, decision trees, and operational procedures.

## Key Features

- **Sub-second runbook retrieval** for critical operational scenarios
- **Context-aware search** with semantic matching capabilities
- **Confidence-scored recommendations** for automated decision making
- **Multi-source integration** supporting 10+ documentation systems
- **Structured decision trees** for progressive incident resolution
- **Escalation management** with business hours and on-call awareness

## Quick Start

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
                                      ├── Wiki (Confluence, Notion)
                                      ├── Database (PostgreSQL, MongoDB)
                                      ├── Web (REST APIs, Websites)
                                      └── Files (Local, GitHub)
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

## Performance Targets

- **Critical runbooks**: < 200ms response time (cached)
- **Standard procedures**: < 500ms response time
- **Availability**: 99.9% uptime for operational scenarios
- **Accuracy**: 95%+ confidence score correlation with successful resolutions
- **Concurrent queries**: 50+ simultaneous operations

## Supported Documentation Sources

- **Wiki Systems**: Confluence, Notion
- **Version Control**: GitHub, GitLab repositories
- **Databases**: PostgreSQL, MongoDB
- **Web APIs**: REST endpoints, custom APIs
- **File Systems**: Local documentation, network shares

## Configuration

Create a `config/config.yaml` file to define your documentation sources:

```yaml
sources:
  - name: "ops-confluence"
    type: "confluence"
    base_url: "https://company.atlassian.net/wiki"
    auth:
      type: "bearer_token"
      token_env: "CONFLUENCE_TOKEN"
    refresh_interval: "1h"
    priority: 1
    
  - name: "runbook-repo"
    type: "github"
    repository: "company/ops-runbooks"
    path: "runbooks/"
    auth:
      type: "github_token"
      token_env: "GITHUB_TOKEN"
    refresh_interval: "15m"
    priority: 2
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

# Development utilities (New in Milestone 1.2)
npm run generate-sample-data  # Generate realistic test data
npm run validate-config       # Validate configuration files
npm run test-mcp             # Interactive MCP tool testing
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Setting up the development environment
- Code style and testing requirements
- Submitting pull requests
- Adding new source adapters

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: See the [docs/](docs/) directory for detailed guides
  - [Development Guide](docs/DEVELOPMENT.md) - Complete development setup and workflows
  - [Development Tools Guide](docs/DEVELOPMENT-TOOLS-GUIDE.md) - Using the new Milestone 1.2 development utilities
  - [API Documentation](docs/API.md) - MCP tools and HTTP endpoints
  - [Architecture](docs/ARCHITECTURE.md) - System design and components
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join the community discussions for questions and ideas

## Roadmap

- **Phase 1**: ✅ Core MCP server with basic runbook retrieval (Milestones 1.1-1.2 Complete)
- **Phase 2**: Multi-source support and advanced search (Milestone 1.3 In Progress)
- **Phase 3**: LangGraph integration and operational features
- **Phase 4**: Scale testing and enterprise enhancements

See the [PRD.md](PRD.md) for detailed specifications and implementation timeline.

---

**Built for operational excellence** | **Powered by AI** | **Designed for scale**