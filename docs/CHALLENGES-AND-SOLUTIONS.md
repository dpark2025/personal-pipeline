# Challenges and Solutions

This document captures technical challenges encountered during development and their solutions for future reference.

## Testing Challenges

### Jest ES Module Import Error with @modelcontextprotocol/sdk

**Challenge**: `npm test` failing with `SyntaxError: Cannot use import statement outside a module` when importing from `@modelcontextprotocol/sdk`.

**Error Details**:
```
Jest encountered an unexpected token
/node_modules/@modelcontextprotocol/sdk/dist/server/index.js:1
import { Protocol, } from "../shared/protocol.js";
^^^^^^
SyntaxError: Cannot use import statement outside a module
```

**Root Cause**: 
- The `@modelcontextprotocol/sdk` package uses ES modules with `.js` extensions
- Jest was configured for CommonJS and couldn't transform the ES module imports
- Missing proper mocks for the MCP SDK modules

**Solution**:
1. **Enable ES Modules in package.json**:
   ```json
   {
     "type": "module"
   }
   ```

2. **Create dedicated Jest configuration** (`jest.config.js`):
   ```javascript
   export default {
     preset: 'ts-jest/presets/default-esm',
     testEnvironment: 'node',
     extensionsToTreatAsEsm: ['.ts'],
     transform: {
       '^.+\\.ts$': ['ts-jest', {
         useESM: true
       }]
     },
     moduleNameMapper: {
       '^(\\.{1,2}/.*)\\.js$': '$1'
     },
     transformIgnorePatterns: [
       'node_modules/(?!@modelcontextprotocol/)'
     ]
   };
   ```

3. **Add comprehensive mocks** for MCP SDK modules:
   ```javascript
   // Mock the MCP SDK
   jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
     Server: jest.fn().mockImplementation(() => ({
       setRequestHandler: jest.fn(),
       connect: jest.fn(),
       close: jest.fn(),
     })),
   }));

   jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
     StdioServerTransport: jest.fn(),
   }));

   jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
     CallToolRequestSchema: {},
     ListToolsRequestSchema: {},
   }));
   ```

4. **Enhanced Express mock** to include missing methods:
   ```javascript
   jest.mock('express', () => {
     const mockApp = {
       use: jest.fn(),
       get: jest.fn(),
       listen: jest.fn((_port: any, _host: any, callback: any) => {
         setTimeout(callback, 0);
         return { on: jest.fn() };
       }),
     };
     const express: any = jest.fn(() => mockApp);
     express.json = jest.fn(() => jest.fn());
     express.urlencoded = jest.fn(() => jest.fn());
     express.static = jest.fn(() => jest.fn());
     return express;
   });
   ```

**Result**: All tests now pass successfully with proper ES module handling.

**Key Learnings**:
- ES module packages require specific Jest configuration
- Modern MCP SDK packages use ES modules that need explicit mocking
- TypeScript + Jest + ES modules combination requires careful configuration
- Mock completeness is crucial for complex dependency chains

---

## Future Challenge Template

### [Challenge Title]

**Challenge**: Brief description of the problem.

**Error Details**: 
```
Error messages or symptoms
```

**Root Cause**: What caused the issue.

**Solution**: Step-by-step resolution.

**Result**: Outcome after applying the solution.

**Key Learnings**: Important insights for future reference.

---