#!/bin/bash
#
# Setup script for git hooks
# Installs development git hooks for code quality checks
#

set -e

echo "🔧 Setting up git hooks..."

# Get the git directory (works with worktrees)
GIT_DIR=$(git rev-parse --git-dir)
HOOKS_DIR="$GIT_DIR/hooks"

# Ensure hooks directory exists
mkdir -p "$HOOKS_DIR"

# Install pre-commit hook (worktree-compatible)
echo "📋 Installing pre-commit hook..."
cp scripts/git-hooks/pre-commit "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will now run:"
echo "  - TypeScript compilation checks"
echo "  - ESLint validation"
echo "  - Test suite execution"
echo ""
echo "To bypass the hook temporarily: git commit --no-verify"