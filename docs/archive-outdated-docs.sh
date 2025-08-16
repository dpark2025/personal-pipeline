#!/bin/bash

# Script to archive outdated documentation files

ARCHIVE_HEADER="# ⚠️ DOCUMENTATION ARCHIVE STATUS ⚠️
## 🔒 **DEPRECATED - NO LONGER REFERENCED FOR CURRENT PROJECT**
**Status**: Historical/milestone documentation - reference only  
**Archive Date**: August 16, 2025  
**Reference**: This document is deprecated and should not be used for current development  

---

"

# Files to archive (completion reports, specific implementation docs, outdated guides)
ARCHIVE_FILES=(
    "ENHANCED-MCP-EXPLORER.md"
    "ADAPTER-FRAMEWORK-ANALYSIS.md"
    "ADAPTER-INTEGRATION-GUIDE.md"
    "CACHING-STRATEGIES.md"
    "CHALLENGES-AND-SOLUTIONS.md"
    "CONFIG-PROTECTION-SOLUTION.md"
    "DEMO-COMMAND-RENAME.md"
    "DEMO-TROUBLESHOOTING.md"
    "ENHANCED-FILESYSTEM-ADAPTER.md"
    "INTEGRATION-TESTING.md"
    "Node.js-Test-Runner-Migration-Summary.md"
    "PERFORMANCE-TESTING.md"
    "REDIS-QUICK-REFERENCE.md"
    "TESTING-LESSONS-LEARNED.md"
    "WEBADAPTER-SEARCH-FIX.md"
    "PRODUCTION-DEPLOYMENT.md"
    "health-monitoring-system.md"
    "operational-procedures.md"
    "sample-runbook.md"
    "disk-space-runbook.json"
)

# Add archive headers and move files
for file in "${ARCHIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        # Add header to file
        (echo "$ARCHIVE_HEADER"; cat "$file") > "$file.tmp"
        mv "$file.tmp" "$file"
        # Move to archived directory
        mv "$file" "archived/"
        echo "✅ Archived $file"
    else
        echo "⚠️ File not found: $file"
    fi
done

# Also move the already processed completion file
if [ -f "DOCUMENTATION-INDEXER-COMPLETION.md" ]; then
    mv "DOCUMENTATION-INDEXER-COMPLETION.md" "archived/"
    echo "✅ Moved DOCUMENTATION-INDEXER-COMPLETION.md to archived"
fi

echo "Archive process completed."