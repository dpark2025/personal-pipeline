# Package Build Summary

**Build Date:** 2025-08-26 03:15:36 UTC
**Build Mode:** production
**Node Version:** v24.6.0
**NPM Version:** 11.5.1

## Package Structure

### Distribution Files (`dist/`)
- Main entry point: `dist/index.js`
- TypeScript declarations: `dist/**/*.d.ts`
- Total files:       61

### Library Exports (`lib/`)
- Programmatic usage: `lib/index.js`
- Module exports:       10 modules

### CLI Binaries (`bin/`)
- `personal-pipeline` - Full CLI interface
- `pp-mcp` - MCP protocol focused interface  
- `pp` - Quick command shortcuts

## Installation Methods

### Global Installation
```bash
npm install -g @personal-pipeline/mcp-server
personal-pipeline start
```

### Local Installation
```bash
npm install @personal-pipeline/mcp-server
```

### Programmatic Usage
```javascript
import { PersonalPipelineServer } from '@personal-pipeline/mcp-server';
const server = new PersonalPipelineServer(config);
await server.start();
```

## Build Configuration
- Mode: production
- Tests: Passed
- Size Analysis: Disabled

Built with ❤️ by Personal Pipeline Team
