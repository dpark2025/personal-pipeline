# Package Management

Complete guide to managing Personal Pipeline packages in your local registry, including versioning, dependencies, and distribution strategies.

## Package Structure

Personal Pipeline uses a monorepo structure with scoped packages:

```
@personal-pipeline/
├── mcp-server          # Core MCP server
├── cli-tools          # Command-line utilities  
├── web-ui             # Web interface (future)
├── adapters           # Source adapters
└── examples           # Example configurations
```

## Version Management

### Semantic Versioning

Personal Pipeline follows [SemVer](https://semver.org/) conventions:

- **MAJOR** (1.0.0): Breaking API changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Automated Versioning

```bash
# Bump version automatically
npm run package:version:patch   # 1.0.0 → 1.0.1
npm run package:version:minor   # 1.0.0 → 1.1.0
npm run package:version:major   # 1.0.0 → 2.0.0

# Custom version
npm run package:version 1.2.3-beta.1
```

### Version Tags

Support for distribution channels:

```bash
# Stable release
npm run package:publish

# Beta release
npm run package:publish:beta

# Alpha release  
npm run package:publish:alpha

# Development release
npm run package:publish --tag dev
```

## Publishing Workflow

### Automated Publishing

```bash
# Complete build and publish pipeline
npm run release:prepare    # Build, test, validate
npm run release:create     # Create release artifacts
npm run release:publish    # Publish to registry
```

### Manual Publishing

```bash
# 1. Build and validate
npm run package:build
npm run package:validate

# 2. Version bump
npm run package:version:minor

# 3. Publish to registry
npm run package:publish

# 4. Verify publication
npm run package:info
```

### Pre-publish Validation

Automated checks before publishing:

```bash
# package:validate runs:
npm run lint              # Code quality
npm run typecheck         # Type safety
npm run test             # Unit tests
npm run build            # Build verification
```

## Package Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "express": "^4.18.2",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  }
}
```

### Peer Dependencies

```json
{
  "peerDependencies": {
    "node": ">=18.0.0"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.3.3",
    "tsx": "^4.6.2",
    "@types/node": "^20.19.10"
  }
}
```

## Registry Operations

### Package Information

```bash
# View package details
npm info @personal-pipeline/mcp-server --registry http://localhost:4873

# View all versions
npm view @personal-pipeline/mcp-server versions --registry http://localhost:4873

# View package dependencies
npm view @personal-pipeline/mcp-server dependencies --registry http://localhost:4873
```

### Installing Packages

```bash
# Install latest version
npm install @personal-pipeline/mcp-server --registry http://localhost:4873

# Install specific version
npm install @personal-pipeline/mcp-server@1.2.3 --registry http://localhost:4873

# Install beta version
npm install @personal-pipeline/mcp-server@beta --registry http://localhost:4873
```

### Package Discovery

```bash
# Search packages
npm search personal-pipeline --registry http://localhost:4873

# List all packages
curl http://localhost:4873/-/all | jq 'keys'

# View registry statistics
curl http://localhost:4873/-/stats
```

## Distribution Strategies

### Multi-Environment Distribution

```yaml
# .npmrc configuration for different environments
development:
  registry: http://localhost:4873
  
staging:
  registry: https://registry-staging.internal
  
production:
  registry: https://registry.company.com
```

### Automated Distribution

```yaml
# GitHub Actions workflow
name: Package Distribution
on:
  release:
    types: [published]
    
jobs:
  distribute:
    runs-on: ubuntu-latest
    steps:
      - name: Publish to Local Registry
        run: npm publish --registry http://localhost:4873
        
      - name: Publish to Internal Registry
        run: npm publish --registry https://registry.internal
```

## Package Metadata

### Enhanced package.json

```json
{
  "name": "@personal-pipeline/mcp-server",
  "version": "0.1.0",
  "description": "Intelligent MCP server for documentation retrieval",
  "keywords": [
    "mcp", "model-context-protocol", "documentation", 
    "incident-response", "langraph", "operational-runbooks"
  ],
  "author": {
    "name": "Personal Pipeline Team",
    "email": "team@personal-pipeline.dev",
    "url": "https://personal-pipeline.dev"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/personal-pipeline-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/your-username/personal-pipeline-mcp/issues"
  },
  "homepage": "https://personal-pipeline.dev",
  "files": [
    "dist/**/*",
    "config/config.sample.yaml",
    "docs/API.md",
    "README.md",
    "LICENSE"
  ],
  "bin": {
    "personal-pipeline": "./dist/index.js",
    "pp-mcp": "./dist/index.js"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "publishConfig": {
    "registry": "http://localhost:4873",
    "access": "restricted"
  }
}
```

## Security & Access Control

### Package Access Levels

```yaml
# verdaccio.yaml
packages:
  '@personal-pipeline/*':
    access: $authenticated      # Read access
    publish: $authenticated    # Publish access
    
  '@personal-pipeline/core/*':
    access: '@team-core'       # Team-specific access
    publish: '@team-core'
    
  '@personal-pipeline/public/*':
    access: $all              # Public access
    publish: $authenticated
```

### Package Signing

```bash
# Generate signing key
npm audit signatures

# Sign package during publish
npm publish --sign

# Verify package signature
npm audit signatures @personal-pipeline/mcp-server
```

## Maintenance & Cleanup

### Storage Management

```bash
# View package storage usage
du -sh ./storage/

# Clean old versions (keep last 5)
npm unpublish @personal-pipeline/mcp-server@1.0.0 --registry http://localhost:4873

# Automated cleanup script
#!/bin/bash
PACKAGE="@personal-pipeline/mcp-server"
VERSIONS=$(npm view $PACKAGE versions --json --registry http://localhost:4873)
OLD_VERSIONS=$(echo $VERSIONS | jq -r '.[:-5][]')

for version in $OLD_VERSIONS; do
  npm unpublish "$PACKAGE@$version" --registry http://localhost:4873
done
```

### Registry Maintenance

```bash
# Compact registry storage
docker exec pp-npm-registry verdaccio --storage /verdaccio/storage --compact

# Backup packages
tar -czf packages-backup-$(date +%Y%m%d).tar.gz ./storage/

# Restore from backup
tar -xzf packages-backup-20250816.tar.gz -C ./storage/
```

## Monitoring & Analytics

### Package Usage Analytics

```bash
# View download statistics
curl http://localhost:4873/-/stats | jq '.downloads'

# Package-specific stats
curl http://localhost:4873/-/stats/@personal-pipeline/mcp-server
```

### Health Monitoring

```bash
# Registry health check
npm run registry:health

# Package validation
npm run package:validate

# Dependency audit
npm audit --registry http://localhost:4873
```

## Advanced Features

### Private Scopes

```yaml
# verdaccio.yaml - Configure private scopes
packages:
  '@company-internal/*':
    access: $authenticated
    publish: '@internal-team'
    proxy: npmjs
```

### Package Mirroring

```yaml
# Mirror external packages
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    cache: true
    
  company-internal:
    url: https://registry.company.com/
    auth:
      type: bearer
      token: $COMPANY_REGISTRY_TOKEN
```

### Integration with CI/CD

```yaml
# .github/workflows/package.yml
name: Package Workflow
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'http://localhost:4873'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Validate package
        run: npm run package:validate
        
      - name: Publish package
        if: github.event_name == 'release'
        run: npm run package:publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.REGISTRY_TOKEN }}
```

## Next Steps

- [Docker Distribution](./docker.md) - Container-based package distribution
- [Security Guide](./security.md) - Advanced security and access control
- [Monitoring](./monitoring.md) - Registry monitoring and alerting
- [Backup & Recovery](./troubleshooting.md) - Disaster recovery procedures