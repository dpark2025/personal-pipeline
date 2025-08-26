# CI/CD Workflow Troubleshooting Guide

This guide provides detailed troubleshooting steps for the optimized CI/CD workflow system.

## 🚨 Quick Diagnostics

### Check Overall System Health
```bash
# View recent workflow runs
gh run list --limit 10

# Check workflow status
gh run list --workflow=version.yml --limit 5
gh run list --workflow=build.yml --limit 5  
gh run list --workflow=enhanced-release.yml --limit 5

# View failed runs
gh run list --status=failure --limit 5
```

### Common Status Patterns

#### ✅ Healthy Chain
```
✅ Version Management → SUCCESS (2-3 min)
✅ Build & Package → SUCCESS (6-8 min)
✅ Enhanced Release → SUCCESS (5-10 min)
```

#### ❌ Broken Chain
```
❌ Version Management → FAILURE
🛑 Build & Package → Not triggered (correct behavior)

✅ Version Management → SUCCESS  
❌ Build & Package → FAILURE
🛑 Enhanced Release → Blocked (manual intervention needed)
```

## 🔧 Workflow-Specific Troubleshooting

### Version Management Issues

#### Problem: Workflow not triggering
```bash
# Check if push affects triggering paths
git diff HEAD~1 --name-only

# Expected triggering files:
# - src/**
# - package.json
# - Dockerfile
```

**Solution**: Ensure changes touch monitored paths or manually trigger:
```bash
gh workflow run version.yml --field bump_type=patch
```

#### Problem: Conventional commit parsing fails
```bash
# Check recent commits format
git log --oneline -5

# Expected formats:
# ✅ feat: add new feature
# ✅ fix: resolve bug
# ✅ feat!: breaking change
# ❌ updated code (no type)
```

**Solution**: Use proper conventional commit format:
```bash
git commit --amend -m "feat: describe your change"
git push --force-with-lease
```

#### Problem: Version bump skipped
**Symptoms**: Workflow succeeds but no version change

**Causes**:
- No commits since last version tag
- Only documentation/non-code changes
- Commits don't match conventional format

**Solution**: Force version bump:
```bash
gh workflow run version.yml --field bump_type=patch --field force=true
```

### Build & Package Issues

#### Problem: Build not triggering after version success
```bash
# Check if version workflow actually succeeded
gh run view $(gh run list --workflow=version.yml --limit 1 --json databaseId --jq '.[0].databaseId')

# Check build workflow trigger
gh run list --workflow=build.yml --limit 3
```

**Solution**: If version succeeded but build didn't trigger:
```bash
# Manually trigger build
gh workflow run build.yml --field force_rebuild=true
```

#### Problem: Docker build failures
**Common causes**:
- Architecture compatibility (arm64 vs amd64)
- Base image updates breaking compatibility  
- Registry authentication issues

```bash
# Test Docker build locally
docker build -t test-build .

# Check multi-arch build
docker buildx build --platform linux/amd64,linux/arm64 -t test-build .
```

#### Problem: npm package build failures
```bash
# Test locally
npm run build
npm run test:ci

# Check package validation
npm pack --dry-run
```

### Enhanced Release Issues

#### Problem: Release workflow fails to call build.yml
**Error**: `workflow is not reusable` 

**Cause**: Build workflow missing `workflow_call` trigger

**Solution**: Verify build.yml has workflow_call section:
```yaml
on:
  workflow_call:
    inputs:
      force_rebuild:
        # ... inputs defined
```

#### Problem: Docker image reference failures
**Error**: `image-ref not found`

**Cause**: prepare-release-outputs job not generating correct image names

**Solution**: Check compatibility layer outputs:
```bash
# View release workflow logs
gh run view $(gh run list --workflow=enhanced-release.yml --limit 1 --json databaseId --jq '.[0].databaseId') --log
```

## 📊 Performance Issues

### Slow Workflow Execution

#### Build taking too long (>10 minutes)
```bash
# Check cache hit rates
gh api repos/:owner/:repo/actions/cache/usage

# Clear caches if needed
gh extension install actions/gh-actions-cache
gh actions-cache list
gh actions-cache delete <cache-key>
```

#### Version analysis taking too long
**Cause**: Large git history analysis

**Solution**: Limit commit analysis range:
```yaml
# In version workflow, modify analysis range
COMMIT_RANGE="HEAD~20..HEAD"  # Analyze last 20 commits only
```

### Resource Usage Issues

#### Runner out of disk space
```bash
# Add cleanup step to workflows
- name: Free disk space
  run: |
    docker system prune -af
    df -h
```

#### Memory issues during build
```bash
# Reduce parallel jobs
npm run build -- --max-old-space-size=4096
```

## 🔄 Recovery Procedures

### Complete Workflow Reset

#### When everything is broken:
```bash
# 1. Stop all running workflows
gh run list --status=in_progress --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run cancel {}

# 2. Clean up branches
git fetch --all --prune
git branch -D $(git branch -r --merged | grep -v main | xargs)

# 3. Reset to known good state  
git checkout main
git reset --hard origin/main

# 4. Trigger fresh workflow chain
git commit --allow-empty -m "fix: reset workflow chain"
git push
```

### Partial Chain Recovery

#### Version succeeded, build failed:
```bash
# Skip version, force build
gh workflow run build.yml --field force_rebuild=true --field build_target=all
```

#### Build succeeded, release failed:
```bash
# Manual release with build artifacts
gh workflow run enhanced-release.yml \
  --field release_type=patch \
  --field create_github_release=true \
  --field publish_npm=false \
  --field skip_tests=true
```

## 🧪 Testing & Validation

### Validate Workflow Changes Locally

#### Test version workflow logic:
```bash
# Dry run version bump
npm run cicd:version:patch -- --dry-run

# Test conventional commit parsing
node -e "
const commits = require('child_process')
  .execSync('git log --oneline -5')
  .toString()
  .split('\\n');
console.log('Recent commits:', commits);
"
```

#### Test build workflow components:
```bash
# Test build process
npm run clean
npm run build
npm run test:ci

# Test Docker build
docker build -t local-test .
docker run --rm local-test --help
```

### Validate Workflow Dependencies

#### Check workflow_run triggers:
```bash
# List all workflows
gh api repos/:owner/:repo/actions/workflows --jq '.workflows[] | {name, path}'

# Check specific workflow dependencies  
grep -r "workflow_run" .github/workflows/
grep -r "workflows:" .github/workflows/
```

## 📈 Monitoring & Metrics

### Performance Tracking

#### Workflow duration tracking:
```bash
# Get timing data for analysis
gh run list --limit 20 --json status,conclusion,createdAt,updatedAt,workflowName > workflow-metrics.json

# Analyze with jq
jq '.[] | select(.conclusion == "success") | {workflow: .workflowName, duration: ((.updatedAt | strptime("%Y-%m-%dT%H:%M:%SZ") | mktime) - (.createdAt | strptime("%Y-%m-%dT%H:%M:%SZ") | mktime))}' workflow-metrics.json
```

#### Success rate monitoring:
```bash
# Calculate success rates
gh run list --limit 50 --json conclusion,workflowName | \
  jq 'group_by(.workflowName) | map({workflow: .[0].workflowName, total: length, success: map(select(.conclusion == "success")) | length}) | map({workflow, success_rate: (.success / .total * 100)})'
```

### Alert Setup

#### GitHub Actions notifications:
```yaml
# Add to workflow failures
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: 'Workflow Failure: ${{ github.workflow }}',
        body: 'Workflow failed in ${{ github.job }} step'
      })
```

## 🛠️ Advanced Debugging

### Workflow Artifacts Analysis

#### Download and inspect artifacts:
```bash
# List artifacts
gh api repos/:owner/:repo/actions/artifacts

# Download specific artifact
gh run download <run-id> -n <artifact-name>
```

### Log Analysis

#### Search workflow logs:
```bash
# Get logs for specific run
gh run view <run-id> --log > workflow.log

# Search for specific errors
grep -i "error\|failed\|exception" workflow.log
grep -A 5 -B 5 "npm ERR" workflow.log
```

### Environment Debugging

#### Check workflow environment:
```yaml
# Add debug step to workflows
- name: Debug environment
  run: |
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"  
    echo "Available memory: $(free -m)"
    echo "Disk space: $(df -h)"
    printenv | sort
```

---

*This troubleshooting guide covers the optimized CI/CD workflow system implemented in August 2025.*