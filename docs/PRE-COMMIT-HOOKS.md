# Pre-Commit Hooks

This repository uses git pre-commit hooks to ensure code quality and prevent broken code from being committed.

## What Gets Checked

The pre-commit hook automatically runs the following checks before allowing any commit:

1. **TypeScript Compiler Checks** (`npm run typecheck`)
   - Verifies all TypeScript code compiles without errors
   - Catches type-related issues early

2. **ESLint** (`npm run lint`)
   - Runs code quality and style checks
   - Prevents commits if there are linting errors (warnings are allowed)

3. **Tests** (`npm test`)
   - Runs the complete test suite
   - Ensures all tests pass before commit

## Hook Location

The pre-commit hook is located at `.git/hooks/pre-commit` and is automatically executable.

## How It Works

When you run `git commit`, the hook will:

- Run all checks in sequence
- Display progress with colored output
- Stop and prevent the commit if any check fails
- Provide helpful instructions on how to fix issues
- Allow the commit to proceed if all checks pass

## Example Output

```bash
🔍 Running pre-commit checks...

🔧 Running TypeScript compiler checks...
✅ TypeScript checks passed

🔧 Running ESLint...
✅ ESLint checks passed

🔧 Running tests...
✅ All tests passed

🎉 All pre-commit checks passed! Proceeding with commit...
```

## Bypassing the Hook (Not Recommended)

In emergency situations, you can bypass the pre-commit hook using:

```bash
git commit --no-verify -m "emergency fix"
```

**Warning:** Only use this for genuine emergencies. Bypassed commits should be fixed as soon as possible.

## Fixing Common Issues

### TypeScript Errors
```bash
npm run typecheck
# Fix reported type errors
```

### Linting Errors
```bash
npm run lint          # See linting issues
npm run lint:fix      # Auto-fix many issues
```

### Test Failures
```bash
npm test              # Run tests to see failures
npm run test:watch    # Run tests in watch mode for development
```

## Hook Management

### Reinstalling the Hook
If the hook gets removed or corrupted:

1. Copy the hook from a working repository
2. Make it executable: `chmod +x .git/hooks/pre-commit`

### Customizing the Hook
The hook script can be found in `.git/hooks/pre-commit`. Modify it to add or remove checks as needed.

**Note:** Since `.git/hooks/` is not tracked by git, changes to the hook need to be documented and manually applied in each repository clone.

## Benefits

- **Prevents Broken Builds:** Catches compilation and test failures before they reach the repository
- **Maintains Code Quality:** Enforces consistent code style and best practices
- **Saves CI/CD Resources:** Reduces failed builds on the CI/CD pipeline
- **Improves Code Review:** Reviewers can focus on logic rather than syntax issues
- **Team Consistency:** Ensures all team members follow the same quality standards

## Performance

The typical pre-commit check takes 30-60 seconds depending on:
- Number of files changed
- Test suite size
- System performance

This time investment prevents longer debugging sessions and maintains repository health.