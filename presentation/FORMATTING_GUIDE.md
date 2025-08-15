# Personal Pipeline MVP Presentation - Formatting Guide

## Slide Size Constraints

The presentation has been formatted to fit within standard terminal dimensions:
- **Maximum Width**: 80 columns
- **Maximum Height**: 40 rows  
- **Margins**: 2 columns left/right, 1 row top/bottom
- **Effective Content Area**: ~76 columns × ~38 rows

## ASCII Diagram Guidelines

### Box Drawing Characters
```
┌─┐  ┌───┐  ╔═══╗
│ │  │   │  ║   ║
└─┘  └───┘  ╚═══╝

├─┤  ├───┤  ╠═══╣
├─┼─┤├───┼───┤╠═══╬═══╣
└─┴─┘└───┴───┘╚═══╩═══╝
```

### Connector Arrows
```
→ ← ↑ ↓ ↖ ↗ ↘ ↙
──→ ←── ↑ ↓
══→ ←═══ ⇑ ⇓
```

### Emoji and Icons
- 🚀 Launch/Performance
- ⚡ Speed/Power  
- 💾 Storage/Cache
- 🔧 Tools/Configuration
- 📊 Metrics/Analytics
- 🛡️ Security
- 🎯 Target/Goal
- ✅ Success/Complete
- 🔄 Process/Cycle

## Content Formatting Standards

### Tables
```
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |
```
- Keep column widths reasonable (< 15 chars when possible)
- Use abbreviations for long headers
- Break complex tables into multiple slides

### Code Blocks
- Limit lines to 70 characters
- Use line continuation where appropriate
- Break long commands across multiple lines

### ASCII Diagrams
- Keep total width under 76 columns
- Use consistent spacing and alignment
- Test with different terminal sizes

### Text Content
- Maximum 8-10 bullet points per slide
- Keep bullet text under 60 characters
- Use sub-bullets sparingly

## Common Formatting Patterns

### Architecture Diagrams
```ascii
┌─────────────┐   ┌─────────────┐
│   Component │──→│  Component  │
│             │   │             │
└─────────────┘   └─────────────┘
```

### Process Flow
```ascii
Step 1 ──→ Step 2 ──→ Step 3
  │                     │
  ↓                     ↓
Result                Final
```

### Performance Metrics
```ascii
Metric Name: Value ✅
Metric Name: Value ✅
Metric Name: Value ⚠️
```

## Validation Checklist

Before finalizing slides:
- [ ] All ASCII diagrams < 76 columns wide
- [ ] Code blocks properly formatted and < 70 chars
- [ ] Tables fit within constraints  
- [ ] Content blocks < 38 rows total
- [ ] No horizontal scrolling required
- [ ] Test on different terminal sizes

## Terminal Compatibility

Tested and optimized for:
- Standard terminal (80×24 minimum)
- iTerm2, Terminal.app (macOS)
- Windows Terminal
- VS Code integrated terminal
- SSH terminal sessions

## Troubleshooting

### Content Too Wide
- Use abbreviations in tables
- Break long lines with `\` continuation
- Simplify ASCII diagrams
- Use multiple slides for complex content

### Content Too Tall  
- Split into multiple slides
- Reduce bullet points
- Shorten code examples
- Use slide references ("continued...")

### Rendering Issues
- Check Unicode character support
- Verify terminal width settings
- Test with different themes (dark/light)
- Ensure proper line endings (LF not CRLF)

## Lookatme Specific Notes

The presentation uses lookatme's styling system:
```yaml
styles:
  margin:
    top: 1
    bottom: 1  
    left: 2
    right: 2
  padding:
    top: 1
    bottom: 1
    left: 2
    right: 2
```

This provides optimal balance between content space and readability.