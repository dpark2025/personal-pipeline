# Developer Guide

Complete guide for contributing to Personal Pipeline, including development setup, coding standards, and contribution guidelines.

## Getting Started

### Prerequisites

- **Node.js**: 20.0+ (LTS recommended) 
- **npm**: 8.0+
- **Git**: For version control
- **Redis**: 6.0+ (completely optional, for enhanced caching)

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/dpark2025/personal-pipeline.git
cd personal-pipeline

# 2. Install dependencies
npm install

# 3. Set up configuration
cp config/config.sample.yaml config/config.yaml
# Edit config.yaml with your sources

# 4. Start development server
npm run dev
```

### Development Commands

```bash
# Development & Building
npm run dev              # Start with hot reload
npm run build            # Production build
npm start                # Start production server
npm run clean            # Remove build artifacts

# Testing & Quality
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run format:check     # Check formatting
npm run typecheck        # TypeScript compilation check

# Demo & Tools
npm run demo:start       # Start full demo environment
npm run mcp-explorer     # Enhanced MCP testing tool
npm run benchmark        # Performance testing
npm run health:dashboard # Health monitoring
```

## Project Structure

```
personal-pipeline/
├── src/                 # Source code
│   ├── api/            # REST API implementation
│   ├── core/           # MCP server core
│   ├── adapters/       # Source adapter framework
│   ├── tools/          # MCP tool implementations
│   ├── types/          # TypeScript definitions
│   └── utils/          # Utilities and helpers
├── tests/              # Test files
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── config/             # Configuration files
├── docs/               # Technical documentation
├── website_docs/       # VitePress documentation
├── planning/           # Project planning documents
└── scripts/            # Build and utility scripts
```

## Coding Standards

### TypeScript Guidelines

**Type Safety**
```typescript
// ✅ Good: Strong typing
interface SearchRequest {
  query: string;
  max_results?: number;
  filters?: SearchFilters;
}

// ❌ Bad: Any types
function search(request: any): any {
  // ...
}
```

**Error Handling**
```typescript
// ✅ Good: Explicit error handling
async function searchDocuments(query: string): Promise<Result<Document[], Error>> {
  try {
    const results = await adapter.search(query);
    return { success: true, data: results };
  } catch (error) {
    logger.error('Search failed', { query, error });
    return { success: false, error: error as Error };
  }
}

// ❌ Bad: Unhandled errors
async function searchDocuments(query: string) {
  return await adapter.search(query); // May throw
}
```

**Interface Design**
```typescript
// ✅ Good: Clear, focused interfaces
interface SourceAdapter {
  search(query: string, filters?: SearchFilters): Promise<SearchResult[]>;
  getDocument(id: string): Promise<Document>;
  healthCheck(): Promise<HealthStatus>;
}

// ❌ Bad: Overly broad interfaces
interface Adapter {
  doEverything(params: any): Promise<any>;
}
```

### Code Organization

**File Naming**
- Use kebab-case for files: `source-adapter.ts`
- Use PascalCase for classes: `SourceAdapter`
- Use camelCase for functions: `searchDocuments`

**Module Structure**
```typescript
// ✅ Good: Clear module structure
export class FileSystemAdapter implements SourceAdapter {
  private readonly config: FileSystemConfig;
  private readonly logger: Logger;

  constructor(config: FileSystemConfig) {
    this.config = config;
    this.logger = createLogger('FileSystemAdapter');
  }

  async search(query: string): Promise<SearchResult[]> {
    // Implementation
  }
}
```

**Dependency Injection**
```typescript
// ✅ Good: Constructor injection
export class PersonalPipelineServer {
  constructor(
    private readonly adapters: Map<string, SourceAdapter>,
    private readonly cache: CacheManager,
    private readonly logger: Logger
  ) {}
}

// ❌ Bad: Direct dependencies
export class PersonalPipelineServer {
  private adapter = new FileSystemAdapter(); // Hard to test
}
```

## Testing Guidelines

### Unit Testing

**Test Structure**
```typescript
describe('FileSystemAdapter', () => {
  let adapter: FileSystemAdapter;
  let mockConfig: FileSystemConfig;

  beforeEach(() => {
    mockConfig = {
      name: 'test',
      type: 'filesystem',
      path: '/test/path'
    };
    adapter = new FileSystemAdapter(mockConfig);
  });

  describe('search', () => {
    it('should return relevant documents', async () => {
      // Arrange
      const query = 'test query';
      
      // Act
      const results = await adapter.search(query);
      
      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].confidence_score).toBeGreaterThan(0.8);
    });

    it('should handle empty results gracefully', async () => {
      const results = await adapter.search('nonexistent');
      expect(results).toEqual([]);
    });
  });
});
```

**Mock Guidelines**
```typescript
// ✅ Good: Focused mocks
const mockAdapter = {
  search: jest.fn().mockResolvedValue([mockResult]),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' })
} as jest.Mocked<SourceAdapter>;

// ❌ Bad: Over-mocking
jest.mock('entire-module');
```

### Integration Testing

**Test Real Components**
```typescript
describe('PersonalPipelineServer Integration', () => {
  let server: PersonalPipelineServer;
  let testConfig: Config;

  beforeAll(async () => {
    testConfig = await loadTestConfig();
    server = new PersonalPipelineServer(testConfig);
    await server.initialize();
  });

  afterAll(async () => {
    await server.cleanup();
  });

  it('should handle complete search workflow', async () => {
    const request = { query: 'disk space runbook' };
    const response = await server.handleSearchRequest(request);
    
    expect(response.runbooks).toHaveLength(1);
    expect(response.confidence_score).toBeGreaterThan(0.9);
  });
});
```

### Performance Testing

```typescript
describe('Performance Tests', () => {
  it('should respond within 150ms for critical queries', async () => {
    const start = Date.now();
    await server.searchRunbooks('disk_space', 'critical');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(150);
  });

  it('should handle 50 concurrent requests', async () => {
    const requests = Array(50).fill(null).map(() => 
      server.searchRunbooks('memory_high', 'medium')
    );
    
    const results = await Promise.all(requests);
    expect(results.every(r => r.length > 0)).toBe(true);
  });
});
```

## Architecture Contributions

### Adding New Source Adapters

1. **Create the Adapter Class**
```typescript
export class CustomAdapter implements SourceAdapter {
  constructor(private config: CustomAdapterConfig) {}

  async search(query: string): Promise<SearchResult[]> {
    // Implementation
  }

  async getDocument(id: string): Promise<Document> {
    // Implementation
  }

  async searchRunbooks(alertType: string): Promise<Runbook[]> {
    // Implementation
  }

  async healthCheck(): Promise<HealthStatus> {
    // Implementation
  }

  getMetadata(): AdapterMetadata {
    // Implementation
  }

  async cleanup(): Promise<void> {
    // Implementation
  }
}
```

2. **Register the Adapter**
```typescript
// In src/adapters/index.ts
export const ADAPTER_REGISTRY = {
  filesystem: FileSystemAdapter,
  custom: CustomAdapter
};
```

3. **Add Configuration Schema**
```typescript
export const CustomAdapterConfigSchema = z.object({
  name: z.string(),
  type: z.literal('custom'),
  api_endpoint: z.string().url(),
  auth_token: z.string().optional()
});
```

### Adding New MCP Tools

1. **Define the Tool**
```typescript
export const newTool = {
  name: 'new_tool',
  description: 'Description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Parameter description' }
    },
    required: ['param1']
  }
};
```

2. **Implement the Handler**
```typescript
async handleNewTool(args: NewToolArgs): Promise<ToolResult> {
  const validation = NewToolArgsSchema.safeParse(args);
  if (!validation.success) {
    throw new Error(`Invalid arguments: ${validation.error.message}`);
  }

  const startTime = Date.now();
  
  try {
    // Tool implementation
    const result = await this.performNewToolOperation(validation.data);
    
    this.recordMetrics('new_tool', Date.now() - startTime, true);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    this.recordMetrics('new_tool', Date.now() - startTime, false);
    throw error;
  }
}
```

## REST API Contributions

### Adding New Endpoints

1. **Define the Route**
```typescript
// In src/api/routes.ts
router.post('/api/new-endpoint', validateRequest(NewEndpointSchema), async (req, res) => {
  try {
    const result = await mcpTools.handleNewOperation(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

2. **Add Request Validation**
```typescript
export const NewEndpointSchema = z.object({
  parameter: z.string().min(1),
  options: z.object({
    limit: z.number().min(1).max(100).default(10)
  }).optional()
});
```

3. **Update Documentation**
```typescript
/**
 * @api {post} /api/new-endpoint New Operation
 * @apiName NewEndpoint
 * @apiGroup API
 * @apiParam {String} parameter Description
 * @apiSuccess {Object} result Operation result
 */
```

## Performance Guidelines

### Response Time Targets
- **Critical operations**: < 150ms
- **Standard operations**: < 200ms
- **Health checks**: < 10ms
- **Cached responses**: < 2ms

### Memory Management
```typescript
// ✅ Good: Proper cleanup
export class ResourceManager {
  private resources: Resource[] = [];

  async cleanup(): Promise<void> {
    await Promise.all(
      this.resources.map(resource => resource.close())
    );
    this.resources = [];
  }
}

// ❌ Bad: Memory leaks
export class BadResourceManager {
  private resources: Resource[] = [];
  // No cleanup method
}
```

### Caching Best Practices
```typescript
// ✅ Good: Intelligent caching
async function getCachedResult<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = await cache.get(key);
  if (cached) {
    return cached;
  }

  const result = await fetcher();
  await cache.set(key, result, ttl);
  return result;
}
```

## Security Guidelines

### Input Validation
```typescript
// ✅ Good: Comprehensive validation
export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  max_results: z.number().min(1).max(100).default(10),
  filters: z.object({
    source: z.string().optional(),
    type: z.enum(['runbook', 'procedure', 'guide']).optional()
  }).optional()
});
```

### Error Handling
```typescript
// ✅ Good: Safe error responses
function handleError(error: Error, req: Request, res: Response) {
  logger.error('Request failed', { 
    path: req.path, 
    error: error.message,
    stack: error.stack 
  });

  // Don't expose internal errors
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
}
```

### Credential Management
```typescript
// ✅ Good: Environment variables
const config = {
  githubToken: process.env.GITHUB_TOKEN,
  confluenceToken: process.env.CONFLUENCE_TOKEN
};

// ❌ Bad: Hardcoded secrets
const config = {
  githubToken: 'ghp_secret123' // Never do this
};
```

## Contribution Workflow

### 1. Issue Creation
- Use issue templates
- Provide clear reproduction steps
- Include relevant logs and error messages
- Label appropriately (bug, feature, documentation)

### 2. Development Process
```bash
# 1. Create feature branch
git checkout -b feature/new-adapter

# 2. Make changes with proper commits
git commit -m "feat(adapters): add GitHub adapter support"

# 3. Run tests and linting
npm test
npm run lint
npm run typecheck

# 4. Push and create PR
git push origin feature/new-adapter
```

### 3. Pull Request Guidelines
- Use conventional commit format
- Include tests for new functionality
- Update documentation
- Ensure CI passes
- Request appropriate reviewers

### 4. Code Review Process
- Address all review comments
- Maintain conversation context
- Test suggested changes
- Update PR description if scope changes

## Debugging & Troubleshooting

### Logging
```typescript
// ✅ Good: Structured logging
logger.info('Search completed', {
  query,
  resultsCount: results.length,
  duration: Date.now() - startTime,
  cacheHit: fromCache
});

// ❌ Bad: Unstructured logging
console.log(`Found ${results.length} results for ${query}`);
```

### Development Tools
```bash
# Debug mode
DEBUG=personal-pipeline:* npm run dev

# Performance profiling
npm run benchmark

# MCP tool testing
npm run mcp-explorer

# Health monitoring
npm run health:dashboard
```

### Common Issues

**Port Conflicts**
```bash
# Find process using port
lsof -i :3000
# Kill process or change port
export PORT=3001
```

**Redis Connection Issues**
```bash
# Check Redis status
redis-cli ping
# Start Redis if needed
docker run -d -p 6379:6379 redis:alpine
```

**Memory Issues**
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Release Process

### Version Management
- Follow semantic versioning (semver)
- Update CHANGELOG.md
- Tag releases appropriately
- Update package.json version

### Deployment
```bash
# 1. Run full test suite
npm run test:full

# 2. Build production
npm run build

# 3. Performance verification
npm run benchmark

# 4. Create release
git tag v1.x.x
git push origin v1.x.x
```

## Getting Help

### Documentation
- [Architecture Guide](./architecture.md)
- [API Reference](../api/)
- [Configuration Guide](./configuration.md)

### Community
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and community support
- Code Reviews: Learning and knowledge sharing

### Development Support
- Run `npm run mcp-explorer` for interactive tool testing
- Use `npm run health:dashboard` for system monitoring
- Check logs in `logs/` directory for debugging

Ready to contribute? Start with our [Installation Guide](./installation.md) and check out the [open issues](https://github.com/dpark2025/personal-pipeline/issues) for ways to help!