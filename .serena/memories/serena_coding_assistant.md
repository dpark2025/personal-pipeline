# Serena Coding Assistant Usage

## Overview
Serena is a professional coding agent with semantic coding tools that should be used for all coding work in this project. It provides intelligent, token-efficient code analysis and modification capabilities.

## Key Serena Tools for Coding

### Code Reading/Analysis
- **`get_symbols_overview`** - Get high-level overview of symbols in files/directories
- **`find_symbol`** - Find specific symbols by name path (classes, methods, functions)
- **`find_referencing_symbols`** - Find all references to a symbol
- **`search_for_pattern`** - Flexible pattern search across codebase

### Code Editing
- **`replace_symbol_body`** - Replace entire symbol definitions
- **`insert_before_symbol`** - Insert code before a symbol
- **`insert_after_symbol`** - Insert code after a symbol
- **`replace_regex`** - Regex-based replacements for precise edits

### Important Guidelines
1. **NEVER read entire files** unless absolutely necessary - use symbol tools instead
2. **Use symbol-based navigation** to understand code structure efficiently
3. **Prefer symbolic editing** for modifying entire methods/classes
4. **Use regex editing** for small, precise changes within symbols
5. **Always use relative paths** from project root

## Example Workflows

### Reading Code
```
1. Use get_symbols_overview to understand file structure
2. Use find_symbol with specific name paths to read only needed code
3. Use find_referencing_symbols to understand usage
```

### Modifying Code
```
1. Find the symbol to modify with find_symbol
2. For whole symbol changes: use replace_symbol_body
3. For small edits: use replace_regex with precise patterns
4. For additions: use insert_before_symbol or insert_after_symbol
```

### Best Practices
- Minimize token usage by reading only necessary symbols
- Use symbolic tools to navigate relationships between code
- Make targeted edits rather than rewriting entire files
- Leverage Serena's understanding of code structure

## When to Use Serena
- All code reading and analysis tasks
- All code modifications and refactoring
- Understanding code relationships and dependencies
- Making precise, surgical code changes
- Avoiding unnecessary token consumption

Remember: Serena is specifically designed for intelligent code operations and should be the primary tool for all development work in this project.