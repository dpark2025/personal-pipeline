# GitHub Pages Setup Guide for VitePress Documentation

This guide provides step-by-step instructions for deploying Personal Pipeline's VitePress documentation to GitHub Pages.

## 🚀 Quick Setup

### Option 1: GitHub Actions (Recommended)

This is the modern, recommended approach that builds and deploys automatically.

#### Prerequisites
- Repository with VitePress documentation in `/website_docs/`
- GitHub repository with admin access
- VitePress configuration with correct `base` path

#### Setup Steps

1. **Verify Repository Structure**
   ```
   your-repo/
   ├── .github/workflows/deploy-docs.yml  # ✅ Already created
   ├── website_docs/
   │   ├── .vitepress/
   │   │   ├── config.js
   │   │   └── theme-*.js
   │   ├── index.md
   │   └── [other docs]
   └── package.json
   ```

2. **Configure GitHub Repository Settings**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select **"GitHub Actions"**
   - Click **Save**

3. **Push Changes to Main Branch**
   ```bash
   git add .
   git commit -m "feat: add GitHub Pages deployment with VitePress"
   git push origin main
   ```

4. **Monitor Deployment**
   - Go to **Actions** tab in your repository
   - Watch the "Deploy VitePress Documentation" workflow
   - Once complete, your site will be available at:
     `https://your-username.github.io/personal-pipeline-mcp/`

### Option 2: Deploy from Branch (Alternative)

If you prefer to manage the build process manually and deploy from a dedicated branch.

#### Setup Steps

1. **Build Documentation Locally**
   ```bash
   # First, fix npm registry if needed
   npm config set registry https://registry.npmjs.org/
   
   # Install dependencies and build
   npm install
   npm run docs:build
   ```

2. **Create Deployment Branch**
   ```bash
   # Create and switch to deployment branch
   git checkout -b gh-pages
   
   # Copy built files to root
   cp -r website_docs/.vitepress/dist/* .
   
   # Add .nojekyll to disable Jekyll processing
   touch .nojekyll
   
   # Commit and push
   git add .
   git commit -m "deploy: initial GitHub Pages deployment"
   git push origin gh-pages
   ```

3. **Configure Repository Settings**
   - Go to **Settings** → **Pages**
   - Under **Source**, select **"Deploy from a branch"**
   - Choose **"gh-pages"** branch and **"/ (root)"** folder
   - Click **Save**

## 🔧 Configuration Details

### VitePress Base Path Configuration

All theme configurations include the correct base path:

```javascript
// In each theme-*.js file
export default defineConfig({
  base: '/personal-pipeline-mcp/',  // Repository name
  cleanUrls: true,
  lastUpdated: true,
  // ... rest of config
})
```

### GitHub Actions Workflow

The workflow at `.github/workflows/deploy-docs.yml` includes:

- **Triggers**: Pushes to `main` branch affecting `website_docs/**`
- **Node.js Setup**: Version 18 with npm caching
- **Build Process**: Runs `npm run docs:build`
- **Jekyll Bypass**: Adds `.nojekyll` file
- **Deployment**: Uses official GitHub Pages actions

### Important Files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-docs.yml` | GitHub Actions workflow for automatic deployment |
| `website_docs/.vitepress/config.js` | Main VitePress configuration (theme-aware) |
| `website_docs/.vitepress/theme-*.js` | Individual theme configurations |
| `website_docs/index.md` | Homepage with hero layout |

## 🎨 Theme Selection for Deployment

Choose your preferred theme before deployment:

```bash
# Select theme (affects the deployed site)
npm run docs:theme:professional   # Business/corporate
npm run docs:theme:dark          # Developer-focused
npm run docs:theme:minimalist    # Clean and simple
npm run docs:theme:enterprise    # Full-featured portal

# Verify theme selection
cat website_docs/.vitepress/config.js
```

## 🔍 Troubleshooting

### Common Issues

**1. Site not loading / 404 errors**
- Check that `base: '/personal-pipeline-mcp/'` is set correctly
- Verify repository name matches the base path
- Ensure GitHub Pages is enabled in repository settings

**2. Build failing in GitHub Actions**
- Check workflow logs in the **Actions** tab
- Verify VitePress is installed in `package.json` devDependencies
- Ensure all theme files are properly formatted

**3. Assets not loading**
- Check that asset paths are relative (not absolute)
- Verify `.nojekyll` file is present in deployed site
- Check browser network tab for 404 errors

**4. Theme not applying**
- Verify theme was selected before pushing
- Check that theme config files exist and are valid
- Review theme-switcher output for errors

### Manual Deployment Test

Test the build process locally:

```bash
# Build documentation
npm run docs:build

# Check output directory
ls -la website_docs/.vitepress/dist/

# Serve locally to test
npm run docs:preview
```

### Workflow Debugging

Check GitHub Actions logs:

1. Go to repository **Actions** tab
2. Click on failed workflow run
3. Expand "Build with VitePress" step
4. Review error messages and fix issues

## 📝 Deployment Checklist

Before pushing for deployment:

- [ ] VitePress theme selected and tested
- [ ] Repository name matches `base` configuration  
- [ ] GitHub Pages enabled in repository settings
- [ ] `.github/workflows/deploy-docs.yml` exists
- [ ] All documentation files are in `website_docs/`
- [ ] Links are relative (not absolute paths)
- [ ] Navigation and sidebar links are correct

## 🔄 Updating Documentation

After initial setup, updating is simple:

1. **Edit documentation** in `website_docs/`
2. **Switch themes** if desired using `npm run docs:theme:*`
3. **Commit and push** to `main` branch
4. **GitHub Actions automatically rebuilds** and deploys

## 📊 Site Analytics

Your deployed site will be available at:
- **URL**: `https://your-username.github.io/personal-pipeline-mcp/`
- **HTTPS**: Automatically enabled
- **Custom Domain**: Can be configured in repository settings
- **CDN**: Global edge caching provided by GitHub

## 🎯 Next Steps

After successful deployment:

1. **Test all navigation links** and ensure they work
2. **Verify theme appearance** matches expectations  
3. **Set up custom domain** if desired
4. **Configure analytics** if needed
5. **Update repository README** with documentation link

---

**Deployment Status**: ✅ Ready for GitHub Pages with GitHub Actions workflow  
**Theme Support**: 4 complete theme variants available  
**Automation Level**: Fully automated deployment on push to main  
**Last Updated**: 2025-08-16