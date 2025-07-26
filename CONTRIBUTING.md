# Contributing to MCP Internal Documentation Agent

We welcome contributions to the MCP Internal Documentation Agent! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- TypeScript knowledge
- Basic understanding of MCP (Model Context Protocol)

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcp-internal-docs-agent.git
   cd mcp-internal-docs-agent
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a development configuration:
   ```bash
   cp config/sources.example.yaml config/sources.yaml
   # Edit with your test documentation sources
   ```

5. Run tests to ensure everything works:
   ```bash
   npm test
   ```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing code style and linting rules
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing

- Write unit tests for new functionality
- Maintain test coverage above 80%
- Include integration tests for new adapters
- Test error handling and edge cases

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(adapter): add Notion API integration`
- `fix(cache): resolve Redis connection timeout`
- `docs(readme): update installation instructions`

### Branch Naming

Use descriptive branch names:
- `feature/notion-adapter`
- `fix/cache-timeout`
- `docs/api-documentation`

## Contribution Types

### Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Relevant logs or error messages

### Feature Requests

For new features:
- Describe the use case and motivation
- Provide implementation suggestions if possible
- Consider backward compatibility
- Discuss performance implications

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes following the guidelines above
3. Add tests for new functionality
4. Update documentation if needed
5. Ensure all tests pass
6. Submit a pull request with:
   - Clear title and description
   - Reference to related issues
   - Screenshots/examples if applicable

## Adding New Source Adapters

To add support for a new documentation source:

1. Create a new adapter in `src/adapters/`
2. Implement the `SourceAdapter` interface
3. Add configuration schema
4. Write comprehensive tests
5. Update documentation
6. Add example configuration

Example adapter structure:
```typescript
export class MySourceAdapter implements SourceAdapter {
  name = 'my-source';
  type = 'api' as const;

  async search(query: string, filters?: SearchFilters): Promise<Document[]> {
    // Implementation
  }

  async getDocument(id: string): Promise<Document> {
    // Implementation
  }

  async healthCheck(): Promise<boolean> {
    // Implementation
  }

  // ... other required methods
}
```

## Performance Guidelines

- Implement proper caching strategies
- Use connection pooling for database adapters
- Handle rate limiting gracefully
- Monitor memory usage in long-running operations
- Profile performance-critical code paths

## Security Considerations

- Never log sensitive information (passwords, tokens, etc.)
- Use environment variables for credentials
- Validate all external inputs
- Implement proper error handling without information leakage
- Follow principle of least privilege

## Documentation

- Update README.md for significant changes
- Add JSDoc comments for public APIs
- Include configuration examples
- Update the PRD if changing core functionality
- Add inline comments for complex logic

## Release Process

1. Version follows semantic versioning (semver)
2. Update CHANGELOG.md with notable changes
3. Create a release PR
4. Tag releases with version numbers
5. Publish to npm registry (maintainers only)

## Community Guidelines

- Be respectful and inclusive in all interactions
- Provide constructive feedback
- Help others learn and contribute
- Follow the project's code of conduct
- Ask questions if anything is unclear

## Getting Help

- Check existing issues and documentation first
- Join GitHub Discussions for questions
- Tag maintainers for urgent issues
- Provide context and details when seeking help

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## Acknowledgments

Thank you for contributing to the MCP Internal Documentation Agent! Your contributions help make operational knowledge more accessible and actionable for AI-driven incident response.

---

For questions about contributing, please open an issue or start a discussion in the GitHub repository.