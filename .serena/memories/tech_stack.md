# Personal Pipeline Tech Stack

## Core Technologies
- **Runtime**: TypeScript/Node.js 18+
- **Type System**: TypeScript with strict mode enabled
- **Module System**: ES2022 modules

## Frameworks & Libraries
- **MCP SDK**: `@modelcontextprotocol/sdk` v0.5.0 (Model Context Protocol)
- **Web Framework**: Express.js for REST API
- **Security**: helmet (security headers), cors (CORS support)
- **Search**: fuse.js (fuzzy search)
- **AI/ML** (planned): `@xenova/transformers` for semantic search (Phase 2)
- **Content Processing**: cheerio (HTML parsing), turndown (HTML to Markdown)
- **Caching**: 
  - node-cache (in-memory caching)
  - ioredis/redis (Redis client for persistent caching)
- **Validation**: Zod for runtime type checking and schema validation
- **Logging**: Winston for structured logging
- **Configuration**: YAML format with environment variable support
- **API Documentation**: swagger-ui-express, OpenAPI 3.0 spec

## Development Tools
- **Build**: TypeScript Compiler (tsc)
- **Development Server**: tsx for hot reload
- **Testing**: Jest with ts-jest
- **Linting**: ESLint with TypeScript plugins
- **Formatting**: Prettier
- **Package Manager**: npm

## Architecture Patterns
- Modular architecture with pluggable source adapters
- Abstract base classes for extensibility (SourceAdapter)
- Dependency injection pattern
- Circuit breaker pattern for resilience
- Factory pattern for component creation
- Singleton pattern for services (cache, monitoring, performance)