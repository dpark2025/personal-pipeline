# Task Completion Checklist

## MANDATORY Steps Before Marking Any Task Complete

### 1. Code Quality Checks
```bash
# Run ALL quality checks - MUST pass
npm run lint            # ESLint must pass with no errors
npm run typecheck       # TypeScript compilation must succeed
npm run format:check    # Code must be properly formatted
```

### 2. Run Tests
```bash
# Ensure all tests pass
npm test                # All unit tests must pass
npm run test:coverage   # Check coverage is maintained above 80%
```

### 3. Fix Any Issues
- If linting fails: Run `npm run lint:fix` to auto-fix, then review changes
- If formatting is wrong: Run `npm run format` to fix formatting
- If TypeScript errors: Fix type issues before proceeding
- If tests fail: Debug and fix the failing tests

### 4. Validate Functionality
- Test the specific feature/fix locally
- Ensure no regressions in existing functionality
- Check that performance targets are met (if applicable)

### 5. Update Documentation
- Update JSDoc comments for any new/modified public APIs
- Update README.md if adding new features
- Add/update configuration examples if needed

### 6. Commit Guidelines
```bash
# Stage changes
git add .

# Commit with conventional format
git commit -m "type(scope): description"
# Types: feat, fix, docs, style, refactor, test, chore
# Example: "feat(adapter): add Redis connection pooling"
```

### 7. Additional Checks for Specific Changes
- **New Source Adapter**: Include tests, documentation, example config
- **API Changes**: Update OpenAPI spec, ensure backward compatibility
- **Performance Changes**: Run benchmarks to validate improvements
- **Security Changes**: Ensure no sensitive data in logs/errors

## Common Issues to Check
- No console.log statements (use Winston logger instead)
- No hardcoded credentials or sensitive data
- Proper error handling without information leakage
- All Promises are properly handled (no floating promises)
- Resource cleanup in adapter/service cleanup methods

## Remember
- Quality gates are non-negotiable
- Tests provide confidence in changes
- Documentation helps future developers
- Clean code is maintainable code