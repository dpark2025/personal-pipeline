# Managing Docker Images

## Pushing Images

### Basic Push
```bash
# Tag your image
docker tag my-app:latest localhost:5000/my-app:latest

# Push to registry
docker push localhost:5000/my-app:latest
```

### Automated Push
```bash
# Using CI/CD pipeline
docker build -t localhost:5000/my-app:${BUILD_NUMBER} .
docker push localhost:5000/my-app:${BUILD_NUMBER}
```

## Pulling Images

### Pull Specific Version
```bash
docker pull localhost:5000/my-app:v1.2.3
```

### Pull Latest
```bash
docker pull localhost:5000/my-app:latest
```

## Image Management

### List Images
```bash
# Using registry API
curl -X GET http://localhost:5000/v2/_catalog

# Using CLI tools
docker images localhost:5000/*
```

### Delete Images
```bash
# Delete specific tag
curl -X DELETE http://localhost:5000/v2/my-app/manifests/v1.2.3

# Cleanup unused images
./scripts/cleanup-images.sh
```

## Best Practices

### Tagging Strategy
- Use semantic versioning: `v1.2.3`
- Include build metadata: `v1.2.3-build.123`
- Tag stable releases: `latest`, `stable`

### Security
- Scan images for vulnerabilities
- Use minimal base images
- Keep images updated

### Performance
- Use layer caching
- Optimize Dockerfile for faster builds
- Monitor registry storage usage