# VitePress Theme Preview System

A complete theme comparison system that builds all 4 VitePress themes into a single deployable preview site.

## 🎨 **What This Creates**

- **Single Index Page**: Beautiful landing page with all 4 themes showcased
- **All Themes Built**: Professional, Dark, Minimalist, and Enterprise themes
- **Side-by-side Comparison**: View all themes without rebuilding
- **Local Development Server**: Test themes locally before deployment

## 🚀 **Quick Start**

### Build All Themes

```bash
# Build all 4 themes into theme-preview directory
npm run build:all-themes
```

### Serve Locally

```bash
# Start local server to view all themes
npm run serve:themes

# Open browser to: http://localhost:8080
```

### Deploy to GitHub Pages

The GitHub Actions workflow automatically builds all themes and deploys the theme preview as your live site.

## 📁 **Generated Structure**

```
website_docs/.vitepress/theme-preview/
├── index.html                    # Theme selection landing page
├── professional/                 # Professional Corporate theme
│   ├── index.html
│   ├── api/
│   ├── guides/
│   └── assets/
├── dark/                         # Developer Dark theme
│   ├── index.html
│   ├── api/
│   ├── guides/
│   └── assets/
├── minimalist/                   # Minimalist Documentation theme
│   ├── index.html
│   ├── api/
│   ├── guides/
│   └── assets/
└── enterprise/                   # Enterprise Technical theme
    ├── index.html
    ├── api/
    ├── guides/
    └── assets/
```

## 🎯 **Theme Preview Features**

### Landing Page (`index.html`)
- **Beautiful visual design** with gradient backgrounds
- **Theme cards** with previews and descriptions
- **Feature comparisons** for each theme
- **Direct links** to each theme's documentation
- **Responsive design** that works on all devices

### Individual Themes
- **Complete documentation** for each theme
- **All pages included** (API, guides, registry, examples)
- **Theme-specific styling** and navigation
- **Working links** and search functionality

## 🔧 **Development Workflow**

### Local Development

```bash
# 1. Build all themes
npm run build:all-themes

# 2. Start preview server
npm run serve:themes

# 3. Open browser
open http://localhost:8080
```

### Making Changes

```bash
# 1. Edit documentation in website_docs/
# 2. Rebuild all themes
npm run build:all-themes

# 3. View changes in browser (auto-refresh)
# Server automatically serves updated files
```

### Theme Selection

```bash
# Change default theme for single-theme builds
npm run docs:theme:dark
npm run docs:build

# Or build all themes for comparison
npm run build:all-themes
```

## 🌐 **Deployment**

### Automatic Deployment (GitHub Actions)

The workflow automatically:
1. **Builds all 4 themes** using `npm run build:all-themes`
2. **Creates theme preview** with landing page
3. **Deploys to GitHub Pages** as the main site

### Manual Deployment

```bash
# Build themes
npm run build:all-themes

# Deploy the theme-preview directory to your hosting
# All files are in: website_docs/.vitepress/theme-preview/
```

## 🎨 **Theme Comparison**

| Theme | Best For | Key Features | Color Scheme |
|-------|----------|--------------|--------------|
| **Professional** | Business docs | Corporate styling, Algolia search | Blue/Corporate |
| **Dark** | Developer teams | Dark mode, emoji icons | Cyan/Dark |
| **Minimalist** | Simple sites | Clean design, fast loading | Green/Clean |
| **Enterprise** | Large orgs | Advanced features, deep nav | Purple/Professional |

## 📊 **Performance**

### Build Times
- **All themes**: ~60 seconds (4 themes × ~15s each)
- **Single theme**: ~15 seconds
- **Local server**: Instant startup

### Site Performance
- **Landing page**: <100KB, loads in <1s
- **Each theme**: Optimized VitePress builds
- **Navigation**: Instant theme switching

## 🔍 **Troubleshooting**

### Build Issues

```bash
# If build fails, check individual themes
npm run docs:theme:professional
npm run docs:build

# Check for errors in specific theme
npm run docs:theme:dark
npm run docs:build
```

### Server Issues

```bash
# Check if theme-preview directory exists
ls -la website_docs/.vitepress/theme-preview/

# Rebuild if missing
npm run build:all-themes

# Start server with debug
node scripts/serve-themes.js
```

### Theme Not Working

```bash
# Verify theme files exist
ls -la website_docs/.vitepress/theme-*.js

# Test theme switching
npm run docs:theme:minimalist
cat website_docs/.vitepress/config.js
```

## 🚀 **Advanced Usage**

### Custom Theme Preview

You can customize the theme preview landing page by editing:
- `scripts/build-all-themes.js` - Modify the HTML template
- Styles in the `indexHtml` variable
- Add more themes to the `themes` array

### Integration with CI/CD

```yaml
# Example: Build themes in CI
- name: Build all themes
  run: npm run build:all-themes

- name: Deploy theme preview
  run: |
    # Deploy website_docs/.vitepress/theme-preview/
    # to your hosting provider
```

## 📝 **Next Steps**

1. **Run locally**: `npm run build:all-themes && npm run serve:themes`
2. **Choose your favorite theme** from the preview
3. **Deploy to production** with your selected theme
4. **Share the preview URL** with stakeholders for feedback

---

**Theme Preview Status**: ✅ Ready for deployment  
**Themes Available**: 4 complete variants  
**Local Server**: http://localhost:8080  
**Last Updated**: 2025-08-16