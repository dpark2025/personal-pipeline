# Registry API Reference

## Authentication

### Bearer Token
```bash
# Get token
curl -X POST http://localhost:5000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'

# Use token
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/v2/_catalog
```

## Image Management Endpoints

### List Repositories
```http
GET /v2/_catalog
```

**Response:**
```json
{
  "repositories": [
    "my-app",
    "another-app"
  ]
}
```

### List Tags
```http
GET /v2/{repository}/tags/list
```

**Response:**
```json
{
  "name": "my-app",
  "tags": [
    "latest",
    "v1.0.0",
    "v1.1.0"
  ]
}
```

### Get Manifest
```http
GET /v2/{repository}/manifests/{tag}
Accept: application/vnd.docker.distribution.manifest.v2+json
```

### Delete Image
```http
DELETE /v2/{repository}/manifests/{digest}
```

## Health Check Endpoints

### Registry Health
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "storage": "ok",
    "database": "ok"
  }
}
```

### System Info
```http
GET /v2/
```

## Error Responses

### Common Error Codes
- `404` - Repository or tag not found
- `401` - Authentication required
- `403` - Access denied
- `500` - Internal server error

### Error Format
```json
{
  "errors": [
    {
      "code": "REPOSITORY_NOT_FOUND",
      "message": "Repository not found",
      "detail": "The repository 'my-app' was not found"
    }
  ]
}
```