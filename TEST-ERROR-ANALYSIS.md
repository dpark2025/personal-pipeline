# Test Error Analysis & Fix Plan

## Error Categories Identified

### 1. **ESM/Module Resolution Errors** (Critical - 4+ test suites)
**Pattern**: Jest cannot handle ES module dependencies
```
Jest encountered an unexpected token
Cannot use import statement outside a module
node_modules/got/dist/source/index.js:1
```
**Affected**: `web.test.ts`, and other tests importing `got`, modern ES modules

**Root Cause**: Jest's `transformIgnorePatterns` doesn't include modern ESM packages like `got`, `normalize-url`, `robots-parser`, etc.

### 2. **Missing Dependencies** (High - 2+ test suites) 
**Pattern**: Required packages not installed
```
Cannot find module 'file-type' from 'src/adapters/file-enhanced.ts'
```
**Affected**: `server.test.ts`, `file-enhanced.test.ts`

**Root Cause**: Dependencies referenced in code but not in package.json

### 3. **Test Isolation/State Issues** (Medium - 3+ test suites)
**Pattern**: Tests affecting each other, singletons not reset
```
Expected length: 3, Received length: 8
CircuitBreakerFactory.getAllBreakers()
```
**Affected**: `circuit-breaker.test.ts`, `cache.test.ts`

**Root Cause**: Global state (factories, singletons) not properly reset between tests

### 4. **Timing/Race Conditions** (Medium - 2+ test suites)
**Pattern**: Tests fail due to timing assumptions
```
Expected: "closed", Received: "half_open"
should transition to HALF_OPEN after recovery timeout
```
**Affected**: `circuit-breaker.test.ts`, integration tests

**Root Cause**: Hardcoded timeouts and race conditions in async operations

### 5. **Mock/Redis Integration Issues** (Medium - 2+ test suites)
**Pattern**: Mocked Redis calls not being tracked
```
expect(mockRedisInstance.get).toHaveBeenCalledWith(...)
Number of calls: 0
```
**Affected**: `cache.test.ts`, redis integration tests

**Root Cause**: Mocking strategy not comprehensive enough

## Implementation Plan

### Phase 1: Critical Fixes (2-3 hours)

#### 1.1 Fix Jest ESM Configuration
```javascript
// Update jest.config.js
transformIgnorePatterns: [
  'node_modules/(?!(@modelcontextprotocol/sdk|got|normalize-url|robots-parser|p-limit|fuse\\.js)/)'
]
```

#### 1.2 Install Missing Dependencies  
```bash
npm install --save-dev file-type
# Check for other missing deps
```

### Phase 2: High Priority Fixes (2 hours)

#### 2.1 Fix Test Isolation
```typescript
// Add to tests/setup.ts
beforeEach(() => {
  // Reset all singletons/factories
  CircuitBreakerFactory.reset();
  CacheService.reset();
});
```

#### 2.2 Improve Mocking Strategy
```typescript
// Enhanced Redis mocking in cache tests
const mockRedisInstance = {
  get: jest.fn(),
  setex: jest.fn(), 
  keys: jest.fn(),
  del: jest.fn(),
  ping: jest.fn(),
  removeAllListeners: jest.fn()
};
```

### Phase 3: Medium Priority Fixes (2-3 hours)

#### 3.1 Fix Timing Issues
- Replace hardcoded timeouts with deterministic test patterns
- Use `jest.useFakeTimers()` for time-dependent tests
- Add proper async/await patterns

#### 3.2 Enhance Test Utilities
- Create shared test utilities for common setup
- Standardize mock configurations
- Add helper functions for async testing

### Phase 4: Low Priority Enhancements (1-2 hours)

#### 4.1 Test Coverage Improvements
- Add missing test cases
- Improve error scenario coverage
- Enhance integration test reliability

## Expected Results

### Success Metrics
- **Test Pass Rate**: 100% (currently ~73% failing)  
- **Execution Time**: <15 seconds for full suite
- **Coverage**: Maintain >80% threshold
- **Reliability**: Tests pass consistently across runs

### File Impact
- **jest.config.js**: ESM configuration updates
- **package.json**: Missing dependency additions
- **tests/setup.ts**: Global test setup enhancements
- **Individual test files**: Mocking and timing fixes

## Risk Assessment

### Low Risk
- Jest configuration updates (easily reversible)
- Adding missing dependencies

### Medium Risk  
- Singleton reset patterns (might break existing functionality)
- Timing-dependent test changes

### Mitigation Strategy
- Test changes incrementally
- Maintain backup of working test configurations
- Validate core functionality still works after each change

## Timeline Estimate

- **Phase 1**: 2-3 hours (Critical path, blocks other tests)
- **Phase 2**: 2 hours (High impact fixes)
- **Phase 3**: 2-3 hours (Reliability improvements) 
- **Phase 4**: 1-2 hours (Polish and enhancements)

**Total**: 7-10 hours to achieve fully functional test suite