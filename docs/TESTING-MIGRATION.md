# Testing Framework Migration Guide

Migration from Jest to Node.js Test Runner for improved ESM support and HTTP mocking.

## Current State

We're running a **hybrid testing system** during migration:

- **Jest**: Existing tests (legacy system)
- **Node.js Test Runner**: New tests (target system)
- **Both**: Can run in parallel during transition

## Available Commands

### During Migration

```bash
# Run existing Jest tests only
npm run test:jest
npm run test:jest:watch
npm run test:jest:coverage

# Run new Node.js Test Runner tests only  
npm run test:testrunner
npm run test:testrunner:watch
npm run test:testrunner:coverage

# Run both test suites (for CI/validation)
npm run test:all
npm run test:all:coverage

# Default (unchanged during migration)
npm test  # Still runs Jest for now
```

### After Migration Complete

```bash
npm test          # Will point to Node.js Test Runner
npm run test:legacy  # Jest fallback (if needed)
```

## Migration Benefits Demonstrated

### WebAdapter Link Following Test

**Jest (Broken)**:
```
Expected: 2 documents
Received: 1 document  
❌ FAILED due to HTTP mocking conflicts
```

**Node.js Test Runner (Fixed)**:
```
✅ PASSED - indexed documents: 2
✅ No mocking conflicts, native ESM support
✅ 50% faster execution (317ms vs 717ms)
```

## Migration Strategy

### Phase 1: Critical Tests (Current)
- ✅ WebAdapter tests (pilot complete)
- 🔄 Other adapter tests with HTTP mocking issues
- 🔄 Tests failing due to ESM/mock conflicts

### Phase 2: Standard Tests
- Unit tests with simple mocking
- Configuration tests
- Utility function tests

### Phase 3: Integration Tests
- API endpoint tests
- Full system integration tests

### Phase 4: Finalization
- Update `npm test` to point to Node.js Test Runner
- Archive Jest configuration
- Update CI/CD pipelines

## Directory Structure

```
tests/
├── unit/              # Jest tests (existing)
├── integration/       # Jest tests (existing) 
├── node-test-runner/  # Node.js Test Runner tests (new)
│   ├── web.test.ts    # ✅ Migrated WebAdapter tests
│   └── ...            # Future migrated tests
└── __mocks__/         # Jest mocks (will be removed eventually)
```

## Test Conversion Examples

### Jest → Node.js Test Runner

**Before (Jest)**:
```typescript
import { jest } from '@jest/globals';
describe('Component', () => {
  beforeEach(() => { /* setup */ });
  it('should work', () => {
    expect(result).toBe(expected);
  });
});
```

**After (Node.js Test Runner)**:
```typescript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
describe('Component', () => {
  beforeEach(() => { /* setup */ });
  it('should work', () => {
    assert.strictEqual(result, expected);
  });
});
```

## Key Differences

| Feature | Jest | Node.js Test Runner |
|---------|------|-------------------|
| **Imports** | `import { jest } from '@jest/globals'` | `import { describe, it } from 'node:test'` |
| **Assertions** | `expect(x).toBe(y)` | `assert.strictEqual(x, y)` |
| **Async Errors** | `expect(fn).rejects.toThrow()` | `assert.rejects(fn, /pattern/)` |
| **Mocking** | `jest.fn()`, `jest.mock()` | Built-in `mock()` or external libraries |
| **HTTP Mocking** | Complex got + nock conflicts | Clean nock integration |
| **ESM Support** | Requires configuration | Native support |

## Migration Checklist

### For Each Test File:

- [ ] Copy test file to `tests/node-test-runner/`
- [ ] Update imports (node:test, node:assert)
- [ ] Convert expect() to assert()
- [ ] Remove Jest-specific mocks
- [ ] Verify HTTP mocking works with nock
- [ ] Run and validate test passes
- [ ] Add to testrunner test suite

### When All Tests Migrated:

- [ ] Update `npm test` to use Node.js Test Runner
- [ ] Update CI/CD configuration
- [ ] Archive Jest configuration files
- [ ] Remove Jest dependencies
- [ ] Update documentation

## Benefits Realized

1. **Fixed HTTP Mocking**: WebAdapter link following tests now pass
2. **Better ESM Support**: No more transform configuration needed
3. **Faster Execution**: 50% speed improvement demonstrated
4. **Simpler Setup**: No complex mock management
5. **Future-Proof**: Built into Node.js core, long-term stability
6. **Smaller Dependencies**: Fewer testing packages to maintain

## Rollback Plan

If issues arise during migration:
1. All Jest tests remain functional during transition
2. Can continue using `npm run test:jest` indefinitely
3. Node.js Test Runner tests are isolated in separate directory
4. Easy to revert `npm test` command if needed

## Current Status

- ✅ **Pilot Complete**: WebAdapter tests successfully migrated
- ✅ **Infrastructure**: Hybrid command system in place
- 🔄 **Next**: Migrate remaining adapter tests with HTTP issues
- 🔄 **Timeline**: Complete migration over next 2-3 development cycles