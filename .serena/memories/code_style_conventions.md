# Code Style and Conventions

## TypeScript Conventions
- **Strict Mode**: All strict TypeScript compiler options enabled
- **Type Safety**: Explicit return types required for functions
- **Null Safety**: Strict null checks, prefer optional chaining and nullish coalescing
- **Any Usage**: Avoid `any` type, warnings in place (except in test files)
- **Imports**: Use ES module imports, no duplicate imports
- **Variables**: Use `const` by default, never use `var`

## Code Style
- **Formatting**: Prettier with single quotes, 2-space indentation, semicolons
- **Line Length**: 100 characters maximum
- **Trailing Comma**: ES5 style (trailing commas in objects/arrays)
- **Arrow Functions**: Preferred over function expressions
- **Template Literals**: Preferred over string concatenation
- **Object Shorthand**: Always use object property shorthand

## Naming Conventions
- **Files**: kebab-case for file names (e.g., `cache-service.ts`)
- **Classes**: PascalCase (e.g., `PersonalPipelineServer`)
- **Interfaces/Types**: PascalCase with descriptive names
- **Functions/Methods**: camelCase with verb prefixes (e.g., `getDocument`, `searchRunbooks`)
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for others
- **Private Members**: Prefix with underscore is not used, rely on TypeScript private keyword

## Code Organization
- Small, focused functions (max 100 lines per function)
- Maximum complexity of 10 (cyclomatic complexity)
- Maximum nesting depth of 4
- Maximum 5 parameters per function
- Meaningful variable and function names
- JSDoc comments for public APIs

## Error Handling
- Custom error classes extending base errors
- Proper error messages without sensitive information
- Always handle Promise rejections
- Use try-catch for async operations
- Validate external inputs with Zod schemas

## Testing Conventions
- Test files use `.test.ts` or `.spec.ts` suffix
- Place tests in `tests/` directory mirroring source structure
- Maintain 80%+ test coverage
- Test edge cases and error conditions
- Mock external dependencies