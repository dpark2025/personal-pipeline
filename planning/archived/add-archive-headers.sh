

#!/bin/bash

# Script to add archive headers to completed planning documentation

HEADER="# ⚠️ PLANNING DOCUMENTATION ARCHIVE STATUS ⚠️
## 🔒 **COMPLETED - NO LONGER REFERENCED FOR CURRENT PROJECT PLANS**
**Status**: MILESTONE/PLAN COMPLETE (2025)  
**Archive Date**: August 16, 2025  
**Reference**: Historical planning record only - do not use for current planning  

---

"

# List of files to process (excluding project-milestones.md and MILESTONE-1.1.md as already done)
FILES=(
    "MILESTONE-1.2.md"
    "MILESTONE-1.3-CACHE.md"
    "MILESTONE-1.3-SUMMARY.md"
    "MILESTONE-1.4-REST-API.md"
    "PHASE-2-ADAPTER-REQUIREMENTS.md"
    "PHASE-2-IMPLEMENTATION-PLAN.md"
    "CONFLUENCE-ADAPTER-TEST-REPORT.md"
    "GITHUB-ADAPTER-PHASE2-COMPLETION.md"
    "GITHUB-ADAPTER-TEST-REPORT.md"
    "WEB-ADAPTER-PHASE2-COMPLETION.md"
    "WEB-ADAPTER-TEST-REPORT.md"
    "REST-API-STEP-3-SUMMARY.md"
    "TEAM-LEARNING-PROCESS.md"
    "documentation-indexer-implementation-plan.md"
    "github-adapter-implementation-plan.md"
    "open-issues-resolution-plan.md"
    "phase-2-adapter-implementations.md"
    "phase-2-requirements.md"
    "phase-2-timeline-resources.md"
    "rest-api-implementation-plan.md"
    "web-adapter-implementation-plan.md"
    "web-scraper-discord-adapters-plan.md"
    "DOCUMENT-SYNC-PLAN.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        # Create temporary file with header + original content
        (echo "$HEADER"; cat "$file") > "$file.tmp"
        mv "$file.tmp" "$file"
        echo "✅ Added archive header to $file"
    else
        echo "⚠️ File not found: $file"
    fi
done

echo "Archive headers added to all planning files."
