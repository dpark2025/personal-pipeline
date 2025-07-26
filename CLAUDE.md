# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Pipeline (PP) is an intelligent Model Context Protocol (MCP) server designed for automated retrieval of internal documentation to support AI-driven monitoring alert response and incident management. The project is currently in the planning/design phase with comprehensive documentation but no implementation code yet.

## Development Commands

Since this project is in early planning stages, the typical development commands will likely be:

```bash
# Install dependencies (when package.json exists)
npm install

# Run the MCP server (when implemented)
npm start

# Development mode with logging (planned)
npm run dev

# Build for production (planned)
npm run build

# Run tests (when implemented)
npm test

# Run tests in watch mode (planned)
npm run test:watch

# Run tests with coverage (planned)
npm run test:coverage
```

## Architecture & Structure

### Core Architecture
The system follows a modular architecture with pluggable adapters:
```
LangGraph Agent → MCP Protocol → Core Engine → Source Adapters
                                      ├── Wiki (Confluence, Notion)
                                      ├── Database (PostgreSQL, MongoDB)
                                      ├── Web (REST APIs, Websites)
                                      └── Files (Local, GitHub)
```

### Technology Stack (Planned)
- **Core Runtime**: TypeScript/Node.js 18+
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Search**: `@xenova/transformers` (local embeddings), `fuse.js` (fuzzy search)
- **Content Processing**: `cheerio`, `turndown`, `puppeteer`
- **Caching**: `node-cache` (in-memory), `ioredis` (Redis)
- **Configuration**: YAML format

### Key Components (Planned Implementation)

#### MCP Tools
- `search_runbooks()` - Context-aware operational runbook retrieval
- `get_decision_tree()` - Retrieve decision logic for specific scenarios  
- `get_procedure()` - Detailed execution steps for procedures
- `get_escalation_path()` - Determine appropriate escalation procedures
- `list_sources()` - Manage documentation sources
- `search_knowledge_base()` - General documentation search
- `record_resolution_feedback()` - Capture outcomes for improvement

#### Source Adapter Framework
All adapters implement the `SourceAdapter` interface with methods:
- `search(query, filters?)` - Search documentation
- `getDocument(id)` - Retrieve specific documents
- `healthCheck()` - Verify source availability
- `refreshIndex()` - Update cached content
- `configure(config)` - Set up source configuration
- `authenticate(credentials)` - Handle authentication

#### Performance Requirements
- Critical runbooks: < 200ms response time (cached)
- Standard procedures: < 500ms response time
- Concurrent queries: 50+ simultaneous operations
- Cache hit rate: > 80% for operational scenarios
- Service availability: 99.9% uptime

## Configuration

### Documentation Sources
Configuration will be via `config/sources.yaml` (not tracked in git):
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
```

### Environment Variables
Credentials should be stored in environment variables:
- `CONFLUENCE_TOKEN` - Confluence API token
- `GITHUB_TOKEN` - GitHub API token
- `REDIS_URL` - Redis connection string
- Other source-specific credentials

## Development Guidelines

### Code Style
- Use TypeScript for all code
- Follow conventional commit format: `type(scope): description`
- Maintain test coverage above 80%
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

### Testing Strategy
- Unit tests for all core functionality
- Integration tests for source adapters
- Performance benchmarking for response times
- Error handling and edge case testing

### Security Considerations
- Never log sensitive information (passwords, tokens)
- Use environment variables for all credentials
- Validate all external inputs
- Implement proper error handling without information leakage
- Follow principle of least privilege for source access

## Data Formats

### Structured Runbook Format
Runbooks follow a specific JSON schema with:
- `id`, `title`, `version` metadata
- `triggers` array defining alert conditions
- `severity_mapping` for different alert levels
- `decision_tree` with conditional logic branches
- `procedures` array with step-by-step instructions
- `metadata` including confidence scores and success rates

### Response Format
All tool responses include:
- Structured data (runbooks, procedures, etc.)
- `confidence_score` (0.0-1.0) for match quality
- `match_reasons` explaining why content was selected
- `retrieval_time_ms` for performance monitoring
- `source` information for provenance

## Implementation Phases

1. **Phase 1** (Weeks 1-3): Core MCP server with basic runbook retrieval
2. **Phase 2** (Weeks 4-6): Multi-source support and enhanced search
3. **Phase 3** (Weeks 7-9): LangGraph integration and operational features
4. **Phase 4** (Weeks 10-12): Scale testing and enterprise enhancements

## Key Success Metrics

- Sub-second response time for critical runbook retrieval
- 95%+ accuracy in matching alerts to relevant procedures
- Support for 10+ different documentation source types
- 40% reduction in MTTR for automated incident response
- 99.9% uptime for operational scenarios