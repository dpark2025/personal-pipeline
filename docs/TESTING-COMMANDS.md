# Testing Commands Reference

Quick reference for all testing commands during and after migration.

## Hybrid Testing Period (Current)

### Run Individual Test Suites

```bash
# Jest only (existing tests with known issues)
npm run test:jest
npm run test:jest:watch
npm run test:jest:coverage

# Node.js Test Runner only (new tests, working correctly)
npm run test:testrunner
npm run test:testrunner:watch  
npm run test:testrunner:coverage

# Both test suites for validation
npm run test:all
npm run test:all:coverage
```

### Development Workflow

```bash
# During active development - watch mode
npm run test:testrunner:watch  # New tests (faster, reliable)
npm run test:jest:watch        # Legacy tests (slower, some known failures)

# Before commits - run both
npm run test:all

# Default command (unchanged for now)
npm test  # Still runs Jest during migration
```

## After Migration Complete

```bash
# Main testing command (will be updated to Node.js Test Runner)
npm test

# Legacy fallback (if needed)
npm run test:legacy  # Will be Jest
```

## Current Test Results

### Jest (Legacy) - 374 tests
- ✅ **328 passed** (87.8% pass rate)
- ❌ **46 failed** (known issues: ESM/mocking conflicts)

### Node.js Test Runner (New) - 12 tests  
- ✅ **12 passed** (100% pass rate)
- ❌ **0 failed** (fixed the WebAdapter HTTP mocking issues)

## Key Difference Demonstrated

**Same WebAdapter test logic:**

| Framework | Result | Time | Issue |
|-----------|--------|------|-------|
| Jest | ❌ 1 document (expected 2) | 717ms | HTTP mock conflicts |
| Node.js Test Runner | ✅ 2 documents (as expected) | 317ms | No conflicts |

## Migration Benefits

1. **Fixed Critical Tests**: WebAdapter link following now works
2. **Performance**: 50% faster test execution
3. **Reliability**: Native ESM, no mocking conflicts
4. **Maintenance**: Fewer dependencies, simpler setup
5. **Future-Proof**: Built into Node.js core