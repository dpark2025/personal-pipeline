#!/bin/bash

# Personal Pipeline MVP Presentation Launcher
# Quick script to start the presentation with optimal settings

set -e

PRESENTATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRESENTATION_FILE="$PRESENTATION_DIR/personal-pipeline-mvp.md"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Personal Pipeline MVP Presentation${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if lookatme is installed
if ! command -v lookatme >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: lookatme is not installed${NC}"
    echo "Please install it with: pip install lookatme"
    exit 1
fi

# Check if presentation file exists
if [ ! -f "$PRESENTATION_FILE" ]; then
    echo -e "${YELLOW}⚠️  Warning: Presentation file not found: $PRESENTATION_FILE${NC}"
    exit 1
fi

# Check if Personal Pipeline is running (optional)
if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Personal Pipeline is running - live demos available${NC}"
    echo -e "${GREEN}   Health: http://localhost:3000/health${NC}"
    echo -e "${GREEN}   Performance: http://localhost:3000/performance${NC}"
else
    echo -e "${YELLOW}⚠️  Personal Pipeline not running - static presentation only${NC}"
    echo -e "${YELLOW}   Start with: npm run demo:start${NC}"
fi

echo ""
echo -e "${BLUE}📋 Presentation Details:${NC}"
echo "   • Slides: 48 slides (including metadata)"
echo "   • Duration: 45-60 minutes"  
echo "   • Format: Terminal presentation"
echo ""
echo -e "${BLUE}🎮 Navigation Controls:${NC}"
echo "   • Next: Space, →, j, Page Down"
echo "   • Previous: Backspace, ←, k, Page Up"
echo "   • First: Home, g"
echo "   • Last: End, G"
echo "   • Quit: q, Ctrl+C"
echo "   • Help: h, ?"
echo ""

# Parse command line options
THEME="dark"
LIVE_RELOAD=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --light)
            THEME="light"
            shift
            ;;
        --dark)
            THEME="dark"
            shift
            ;;
        --live)
            LIVE_RELOAD="--live"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --light     Use light theme"
            echo "  --dark      Use dark theme (default)"
            echo "  --live      Enable live reload"
            echo "  --help      Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🎬 Starting presentation...${NC}"
echo -e "${GREEN}Press 'q' to quit when ready${NC}"
echo ""

# Change to presentation directory and start
cd "$PRESENTATION_DIR"

# Start the presentation
lookatme personal-pipeline-mvp.md --theme "$THEME" $LIVE_RELOAD