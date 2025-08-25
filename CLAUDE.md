# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Pipeline (PP) is an intelligent Model Context Protocol (MCP) server designed for automated retrieval of internal documentation to support AI-driven monitoring alert response and incident management. **Phase 1 core implementation is complete** with a working TypeScript/Node.js MCP server, REST API, and FileSystemAdapter. Recent bug fixes have resolved critical build and stability issues.

The project planning and milestone documents are located in: `planning/` directory

**📋 Planning Directory Organization**:
- `project-milestones.md` - Main project roadmap
- `MILESTONE-*.md` - Individual milestone documentation
- `*-plan.md` - Implementation and strategy plans
- All project goal-related documents

## Development Commands

**⚠️ IMPORTANT**: Always stop services when done working:
```bash
# Stop demo environment
npm run demo:stop

# Stop any remaining processes
pkill -f "node.*personal-pipeline"
pkill -f "redis-server.*6379"
```

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

# Demo Environment (Milestone 1.3-1.4)
npm run demo:start           # Start full demo with Redis + performance monitoring
npm run demo:start:interactive # Interactive demo setup with prompts
npm run demo:stop            # Clean shutdown of demo environment

# Development Tools (Milestone 1.2)
npm run generate-sample-data  # Generate realistic test data and runbooks
npm run validate-config       # Validate YAML config with schema checking
npm run test-mcp             # Interactive MCP client testing tool

# Enhanced MCP Tool Explorer (NEW - Milestone 2.1) ⭐ 100% OPERATIONAL
npm run mcp-explorer                    # Enhanced interactive CLI with auto-completion
npm run mcp-explorer:analytics          # Performance analytics dashboard
npm run mcp-explorer:test-suite         # Enhanced automated test suite (24/24 scenarios passing)
npm run mcp-explorer:clear-session      # Clear session data and history

# Performance & Monitoring (Milestone 1.3-1.4)
npm run benchmark            # Performance benchmark suite
npm run benchmark:quick      # Quick performance test (5 concurrent, 15s)
npm run benchmark:stress     # Stress test (50 concurrent, 2 minutes)
npm run load-test            # Comprehensive load testing
npm run health:dashboard     # Real-time health monitoring dashboard
npm run performance:monitor  # Performance metrics monitoring
npm run monitoring:status    # System monitoring status
```

## Architecture & Structure

### Current Project Structure
```
src/
├── api/            # REST API implementation (NEW - Milestone 1.4)
│   ├── routes.ts   # 11 REST API endpoints (1196 lines)
│   ├── middleware.ts # Request validation & performance monitoring (828 lines)
│   ├── transforms.ts # REST ↔ MCP transformation layer (1405 lines)
│   └── caching-middleware.ts # Intelligent caching system (609 lines)
├── core/           # MCP server implementation
│   └── server.ts   # PersonalPipelineServer class with REST API integration
├── adapters/       # Source adapter framework
│   ├── base.ts     # Abstract SourceAdapter + registry
│   └── file.ts     # FileSystemAdapter implementation
├── tools/          # MCP tool implementations
│   └── index.ts    # PPMCPTools class with 7 tools
├── types/          # TypeScript type definitions
│   └── index.ts    # Zod schemas and types
├── utils/          # Configuration and utilities
│   ├── config.ts   # ConfigManager class
│   ├── logger.js   # Winston logging setup
│   ├── cache.ts    # Hybrid caching (Redis + memory)
│   ├── performance.ts # Performance monitoring
│   └── monitoring.ts  # Real-time monitoring system
└── index.ts        # Main entry point

config/
├── config.yaml         # Active demo configuration (gitignored)
├── config.sample.yaml  # Production template
├── github-sample.yaml  # GitHub adapter template
├── web-sample.yaml     # Web scraping template
└── CONFIG_OVERVIEW.md  # Configuration documentation

docs/
├── API.md                  # MCP tools and REST API documentation
├── ARCHITECTURE.md         # System architecture
├── DEVELOPMENT.md          # Development guides
├── TESTING.md              # Testing strategies
├── sample-runbook.md       # Example runbook in Markdown
├── disk-space-runbook.json # Example runbook in JSON
└── [other technical docs]  # Various technical documentation

planning/
├── project-milestones.md           # Complete project planning
├── MILESTONE-1.1.md                # Foundation milestone
├── MILESTONE-1.2.md                # Development tools milestone  
├── MILESTONE-1.3-CACHE.md          # Caching implementation
├── MILESTONE-1.3-SUMMARY.md        # Performance optimization
├── MILESTONE-1.4-REST-API.md       # REST API implementation
├── PHASE-2-IMPLEMENTATION-PLAN.md  # Phase 2 detailed planning
├── PHASE-2-ADAPTER-REQUIREMENTS.md # Phase 2 adapter requirements
├── TEAM-LEARNING-PROCESS.md        # Team processes
└── roles/                          # Agent role definitions
    ├── expert-ai-ml-engineer.md
    ├── expert-backend-lead.md
    └── [other role definitions]

tests/
└── unit/               # Unit tests
    ├── core/           # Server tests
    └── utils/          # Utility tests
```

### Core Architecture
The system follows a modular architecture with dual access patterns and pluggable adapters:
```
External Systems → REST API → 
                            ↘
LangGraph Agent → MCP Protocol → Core Engine → Source Adapters
                            ↗                    ├── Web (REST APIs, Websites)
         Demo Scripts → REST API                └── Files (Local)
```

**Dual Access Patterns** (NEW - Milestone 1.4):
- **MCP Protocol**: Native protocol for LangGraph agents and MCP-compatible clients
- **REST API**: Standard HTTP endpoints for demo scripts, external integrations, and web UIs

### Technology Stack (Implemented)
- **Core Runtime**: TypeScript/Node.js 18+
- **MCP SDK**: `@modelcontextprotocol/sdk` v0.5.0
- **Web Framework**: Express.js with security middleware (helmet, cors)
- **Search**: `fuse.js` (fuzzy search), `@xenova/transformers` (planned for Phase 2)
- **Content Processing**: `cheerio`, `turndown`
- **Caching**: Hybrid Redis + `node-cache` with circuit breaker resilience
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

#### REST API Endpoints (11 HTTP Endpoints - NEW Milestone 1.4)
**Search Endpoints:**
- `POST /api/search` - General documentation search across all sources
- `POST /api/runbooks/search` - Search runbooks by alert characteristics
- `GET /api/runbooks` - List all runbooks with filtering and pagination
- `GET /api/runbooks/:id` - Get specific runbook by ID

**Operational Endpoints:**
- `POST /api/decision-tree` - Get decision logic for specific scenarios
- `GET /api/procedures/:id` - Get detailed procedure steps by ID
- `POST /api/escalation` - Get escalation paths based on severity and context
- `POST /api/feedback` - Record resolution feedback for system improvement

**Management Endpoints:**
- `GET /api/sources` - List all configured documentation sources with health status
- `GET /api/health` - Consolidated API health status with performance metrics
- `GET /api/performance` - API performance metrics and statistics

**Features:**
- **Enterprise-grade caching** with 7 intelligent strategies and cache warming
- **Advanced error handling** with business impact assessment and recovery guidance
- **Performance optimization** with sub-150ms response times for critical operations
- **Security hardening** with XSS protection, input sanitization, and validation

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
- **Planned Phase 2**: WebAdapter for REST APIs and website content

#### Performance Requirements (Achieved/Enhanced - Milestone 1.4)
- **Critical runbooks**: < 150ms response time (achieved with intelligent caching)
- **Standard procedures**: < 200ms response time (exceeded original 500ms target)
- **REST API endpoints**: Sub-150ms for critical operations, sub-10ms for health checks
- **Concurrent queries**: 50+ simultaneous operations with dual MCP/REST access
- **Cache performance**: 60-80% MTTR reduction with hybrid Redis + memory caching
- **Service availability**: Stable operation with circuit breaker resilience patterns

## Configuration

### Current Working Configuration
The project uses a **demo configuration** that's automatically generated and fully operational:
- **Active config**: `config/config.yaml` (auto-generated by demo setup)
- **Demo sources**: Points to `/test-data` with sample runbooks and knowledge base
- **Redis caching**: Hybrid Redis + memory with circuit breaker resilience
- **Performance monitoring**: Real-time monitoring with health dashboards enabled

### Configuration Files (See `config/CONFIG_OVERVIEW.md` for details)
- `config.yaml` - Active demo configuration (gitignored, auto-generated)  
- `config.sample.yaml` - Production template with comprehensive documentation
- `github-sample.yaml` - GitHub adapter integration template
- `web-sample.yaml` - Web scraping adapter template

### Documentation Sources
For production, configuration is via `config/config.yaml` (use templates as starting point):
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

1. **Phase 1** (Weeks 1-3): ✅ **CORE COMPLETE** - Working MCP server with critical issues resolved
   - Milestone 1.1: ✅ **COMPLETE** - Project foundation, 7 MCP tools, FileSystemAdapter
   - Milestone 1.2: ✅ **COMPLETE** - Development tools and testing utilities
   - Milestone 1.3: ✅ **COMPLETE** - Performance optimization and hybrid caching
   - Milestone 1.4: ✅ **COMPLETE** - REST API with 11 endpoints and dual access patterns
   - **Recent Fixes**: Build system, Redis stability, configuration paths resolved
2. **Phase 2** (Weeks 4-6): 📋 **PLANNED** - Web adapter integration and enhanced search capabilities
3. **Phase 3** (Weeks 7-9): 📋 **PLANNED** - LangGraph integration and operational features  
4. **Phase 4** (Weeks 10-12): 📋 **PLANNED** - Scale testing and enterprise enhancements

## Key Success Metrics

**Phase 1 Achieved (Working Implementation):**
- ✅ **Working MCP server** with 7 tools and FileSystemAdapter
- ✅ **REST API operational** with 11 endpoints and caching
- ✅ **Critical issues resolved**: Build system, Redis stability, configuration paths
- ✅ **Hybrid caching** with Redis + memory fallback
- ✅ **Dual access patterns** via MCP protocol and REST API

**Phase 2+ Targets (Planned):**
- Web adapter integration for REST APIs and website content scraping  
- Enhanced semantic search with transformer embeddings
- Improved accuracy in matching alerts to relevant procedures
- Integration with LangGraph for automated workflows

## 📊 Current Project Status

**Overall Health**: 🟡 **GOOD** - Core systems operational, critical issues resolved

**Recent Bug Fixes (August 25, 2025):**
- ✅ **Fixed**: Build system inconsistencies causing runtime import errors
- ✅ **Fixed**: Redis integration crashes requiring extensive error suppression
- ✅ **Fixed**: Configuration relative paths failing from different startup directories
- ⚠️ **Note**: Phase 2 adapters are documented but not implemented (see GitHub issue #24)

For detailed status, progress tracking, and session continuity information, see:
- **`PROJECT_STATUS.md`** - Real-time project health and session continuity tracker
- **`config/CONFIG_OVERVIEW.md`** - Configuration files documentation
- **`planning/project-milestones.md`** - Complete project roadmap

**Quick Status Check:**
```bash
# Verify server health
npm run health

# Full demo environment 
npm run demo:start

# Performance dashboard
npm run health:dashboard
```