#!/bin/bash

# sync-agents.sh - Sync agent files to .claude/agents directory

set -e  # Exit on any error

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AGENTS_SOURCE="$PROJECT_ROOT/agents"
AGENTS_DEST="$PROJECT_ROOT/.claude/agents"

echo "Syncing agent files..."
echo "Source: $AGENTS_SOURCE"
echo "Destination: $AGENTS_DEST"

# Check if source directory exists
if [ ! -d "$AGENTS_SOURCE" ]; then
    echo "Error: Source directory $AGENTS_SOURCE does not exist"
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$AGENTS_DEST"

# Copy all files from agents to .claude/agents
cp -r "$AGENTS_SOURCE"/* "$AGENTS_DEST"/

echo "Agent files synced successfully!"
echo "Files copied:"
ls -la "$AGENTS_DEST"