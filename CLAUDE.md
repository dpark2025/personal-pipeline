# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Pipeline (PP) is an intelligent Model Context Protocol (MCP) server designed for automated retrieval of internal documentation to support AI-driven monitoring alert response and incident management. **Milestone 1.1 is complete** with a fully operational TypeScript/Node.js MCP server implementation.

## Development Commands

The project is now operational with complete build and development tooling:

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Start the MCP server
npm start

# Run tests
npm test
npm run test:watch      # Run tests in watch mode  
npm run test:coverage   # Run tests with coverage

# Code quality and validation
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues automatically
npm run format          # Format code with Prettier
npm run format:check    # Check if code is formatted
npm run typecheck       # Run TypeScript compiler checks

# Utilities
npm run clean           # Remove build artifacts
npm run health          # Check if server is running
```

## Architecture & Structure

### Current Project Structure
```
src/
├── core/           # MCP server implementation
│   └── server.ts   # PersonalPipelineServer class
├── adapters/       # Source adapter framework
│   ├── base.ts     # Abstract SourceAdapter + registry
│   └── file.ts     # FileSystemAdapter implementation
├── tools/          # MCP tool implementations
│   └── index.ts    # PPMCPTools class with 7 tools
├── types/          # TypeScript type definitions
│   └── index.ts    # Zod schemas and types
├── utils/          # Configuration and utilities
│   ├── config.ts   # ConfigManager class
│   └── logger.ts   # Winston logging setup
└── index.ts        # Main entry point

config/
├── config.yaml         # Live configuration (gitignored)
└── config.sample.yaml  # Configuration template

docs/
├── API.md              # MCP tools documentation
├── MILESTONE-1.1.md    # Completed milestone details
├── sample-runbook.md   # Example runbook in Markdown
└── disk-space-runbook.json # Example runbook in JSON

tests/
└── unit/               # Unit tests
    ├── core/           # Server tests
    └── utils/          # Utility tests
```

### Core Architecture
The system follows a modular architecture with pluggable adapters:
```
LangGraph Agent → MCP Protocol → Core Engine → Source Adapters
                                      ├── Wiki (Confluence, Notion)
                                      ├── Database (PostgreSQL, MongoDB)
                                      ├── Web (REST APIs, Websites)
                                      └── Files (Local, GitHub)
```

### Technology Stack (Implemented)
- **Core Runtime**: TypeScript/Node.js 18+
- **MCP SDK**: `@modelcontextprotocol/sdk` v0.5.0
- **Web Framework**: Express.js with security middleware (helmet, cors)
- **Search**: `fuse.js` (fuzzy search), `@xenova/transformers` (planned for Phase 2)
- **Content Processing**: `cheerio`, `turndown`
- **Caching**: `node-cache` (in-memory)
- **Validation**: Zod for runtime type checking and schema validation
- **Logging**: Winston structured logging
- **Configuration**: YAML format with environment variable support
- **Development**: ESLint, Prettier, Jest, tsx for hot reload

### Key Components (Implemented)

#### MCP Tools (7 Core Tools)
- `search_runbooks()` - Context-aware operational runbook retrieval
- `get_decision_tree()` - Retrieve decision logic for specific scenarios  
- `get_procedure()` - Detailed execution steps for procedures
- `get_escalation_path()` - Determine appropriate escalation procedures
- `list_sources()` - Manage documentation sources
- `search_knowledge_base()` - General documentation search
- `record_resolution_feedback()` - Capture outcomes for improvement

#### Source Adapter Framework (Implemented)
All adapters implement the `SourceAdapter` abstract class with methods:
- `search(query, filters?)` - Search documentation with confidence scoring
- `getDocument(id)` - Retrieve specific documents by ID
- `searchRunbooks(alertType, severity, systems)` - Specialized runbook search
- `healthCheck()` - Verify source availability and performance
- `getMetadata()` - Get adapter statistics and information
- `cleanup()` - Graceful shutdown and resource cleanup

**Current Adapters**:
- **FileSystemAdapter**: Local file and directory indexing with Markdown/JSON support
- **Planned**: ConfluenceAdapter, GitHubAdapter, DatabaseAdapter

#### Performance Requirements
- Critical runbooks: < 200ms response time (cached)
- Standard procedures: < 500ms response time
- Concurrent queries: 50+ simultaneous operations
- Cache hit rate: > 80% for operational scenarios
- Service availability: 99.9% uptime

## Configuration

### Documentation Sources
Configuration is via `config/config.yaml` (not tracked in git, use `config.sample.yaml` as template):
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

1. **Phase 1** (Weeks 1-3): ✅ **COMPLETE** - Core MCP server with basic runbook retrieval
   - Milestone 1.1: ✅ Project foundation, 7 MCP tools, FileSystemAdapter
   - Milestone 1.2: In Progress - Enhanced tools and caching
   - Milestone 1.3: Planned - Performance optimization and testing
2. **Phase 2** (Weeks 4-6): Multi-source support and enhanced search
3. **Phase 3** (Weeks 7-9): LangGraph integration and operational features  
4. **Phase 4** (Weeks 10-12): Scale testing and enterprise enhancements

## Key Success Metrics

- Sub-second response time for critical runbook retrieval
- 95%+ accuracy in matching alerts to relevant procedures
- Support for 10+ different documentation source types
- 40% reduction in MTTR for automated incident response
- 99.9% uptime for operational scenarios