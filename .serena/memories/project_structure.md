# Personal Pipeline Project Structure

## Root Directory Structure
```
/Users/dpark/projects/github.com/pp/
├── src/                    # Source code
├── tests/                  # Test files
├── docs/                   # Documentation
├── config/                 # Configuration files
├── planning/               # Project planning documents
├── scripts/                # Utility scripts
├── agents/                 # Agent descriptions (Claude-specific)
├── .claude/                # Claude-specific instructions
├── .github/                # GitHub workflows and templates
├── issues/                 # Issue tracking
├── test-data/              # Sample test data
└── dist/                   # Built output (gitignored)
```

## Source Code Organization (`src/`)
```
src/
├── api/                    # REST API implementation
│   ├── routes.ts          # API route definitions (11 endpoints)
│   ├── middleware.ts      # Request validation & monitoring
│   ├── transforms.ts      # REST ↔ MCP transformation
│   ├── caching-middleware.ts # Intelligent caching
│   ├── correlation.ts     # Request correlation tracking
│   ├── openapi.ts         # OpenAPI specification
│   └── swagger.ts         # Swagger UI setup
├── core/                   # Core MCP server
│   └── server.ts          # PersonalPipelineServer class
├── adapters/              # Source adapters
│   ├── base.ts           # Abstract SourceAdapter class
│   └── file.ts           # FileSystemAdapter implementation
├── tools/                 # MCP tool implementations
│   └── index.ts          # PPMCPTools class (7 tools)
├── types/                 # TypeScript definitions
│   └── index.ts          # Zod schemas and types
├── utils/                 # Utilities
│   ├── config.ts         # Configuration management
│   ├── logger.ts         # Winston logging setup
│   ├── cache.ts          # Hybrid caching service
│   ├── performance.ts    # Performance monitoring
│   ├── monitoring.ts     # Real-time monitoring
│   ├── circuit-breaker.ts # Circuit breaker pattern
│   └── redis-connection-manager.ts # Redis connection
└── index.ts              # Main entry point
```

## Key Components Map
- **MCP Server**: `core/server.ts` - Main server implementation
- **REST API**: `api/routes.ts` - 11 HTTP endpoints
- **Tools**: `tools/index.ts` - 7 MCP tools
- **Adapters**: `adapters/` - Pluggable source adapters
- **Types**: `types/index.ts` - All TypeScript types with Zod validation
- **Configuration**: `utils/config.ts` - YAML-based configuration
- **Caching**: `utils/cache.ts` - Hybrid Redis + memory cache
- **Monitoring**: `utils/monitoring.ts` - Health and performance tracking

## Important Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration (strict mode)
- `.eslintrc.cjs` - ESLint rules
- `.prettierrc` - Code formatting rules
- `CLAUDE.md` - Project-specific Claude instructions
- `config/config.yaml` - Runtime configuration (gitignored)
- `config/config.sample.yaml` - Configuration template

## Documentation Structure (`docs/`)
- API documentation
- Architecture guides
- Milestone summaries
- Development guides
- Performance testing
- Redis setup and strategies
- Demo guides and troubleshooting