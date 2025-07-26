# MCP Internal Documentation Agent

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
git clone https://github.com/[username]/mcp-internal-docs-agent.git
cd mcp-internal-docs-agent

# Install dependencies
npm install

# Configure your documentation sources
cp config/sources.example.yaml config/sources.yaml
# Edit config/sources.yaml with your documentation sources

# Start the MCP server
npm start
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

Create a `config/sources.yaml` file to define your documentation sources:

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

# Run tests
npm test

# Run with development logging
npm run dev

# Build for production
npm run build
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
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join the community discussions for questions and ideas

## Roadmap

- **Phase 1**: Core MCP server with basic runbook retrieval
- **Phase 2**: Multi-source support and advanced search
- **Phase 3**: LangGraph integration and operational features
- **Phase 4**: Scale testing and enterprise enhancements

See the [PRD.md](PRD.md) for detailed specifications and implementation timeline.

---

**Built for operational excellence** | **Powered by AI** | **Designed for scale**