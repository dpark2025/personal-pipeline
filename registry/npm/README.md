# Personal Pipeline NPM Registry

**Private NPM Registry Infrastructure for Personal Pipeline Project**

This directory contains the complete infrastructure for running a private NPM registry using Verdaccio, providing secure internal package distribution and version management.

## Quick Start

```bash
# Setup and start the registry
npm run registry:setup
npm run registry:start

# Add a user
npm run registry:adduser

# Build and publish your package
npm run package:build
npm run package:publish

# Access the web UI
open http://localhost:8080
```

## Service URLs

- **NPM Registry**: http://localhost:4873
- **Registry UI**: http://localhost:8080  
- **Monitoring**: http://localhost:9091
- **Analytics**: http://localhost:3001

## Directory Structure

```
registry/npm/
├── config/             # Verdaccio configuration
├── storage/            # Package storage
├── logs/               # Registry logs
├── cache/              # Local cache data
├── auth/               # User authentication
├── monitoring/         # Prometheus configuration
├── grafana/           # Grafana dashboards
├── scripts/           # Backup and utility scripts
└── backups/           # Backup storage
```

## Available Commands

### Registry Management
```bash
npm run registry:start          # Start registry services
npm run registry:stop           # Stop registry services
npm run registry:status         # Check service status
npm run registry:health         # Health check
npm run registry:logs          # View logs
```

### User Management
```bash
npm run registry:adduser       # Add new user
npm run registry:login         # Login to registry
npm run registry:whoami        # Check current user
npm run registry:logout        # Logout
```

### Package Operations
```bash
npm run package:build          # Build package
npm run package:publish        # Publish package
npm run package:version:patch  # Bump patch version
npm run package:info           # Show package info
```

### Advanced Management
```bash
./scripts/registry-manager.sh users list           # List all users
./scripts/registry-manager.sh packages list        # List all packages
./scripts/registry-manager.sh health status        # Detailed health check
./scripts/registry-manager.sh backup create        # Create backup
./scripts/registry-manager.sh analytics stats      # Show statistics
```

## Authentication

Default users (change passwords in production):
- **Admin**: username `admin`, password `admin_password_2025`
- **Developer**: username `developer`, password `dev_password_2025`

## Configuration Files

- `config/config.yaml` - Main Verdaccio configuration
- `auth/htpasswd` - User authentication database
- `auth/users.json` - User roles and permissions
- `monitoring/prometheus.yml` - Monitoring configuration

## Backup and Recovery

Automated daily backups are configured with 30-day retention. Manual operations:

```bash
./scripts/registry-manager.sh backup create         # Create backup
./scripts/registry-manager.sh backup list          # List backups
./scripts/registry-manager.sh backup restore <file> # Restore backup
```

## Monitoring and Analytics

- **Prometheus**: Metrics collection at http://localhost:9091
- **Grafana**: Performance dashboards at http://localhost:3001
- **Registry UI**: Package management at http://localhost:8080

Default Grafana credentials:
- Username: `admin`
- Password: `npm_analytics_2025`

## Security Features

- **htpasswd authentication** with bcrypt encryption
- **Scoped package access** control
- **JWT token** based API authentication  
- **Audit logging** for all operations
- **Rate limiting** and CORS protection

## Package Publishing

1. **Configure your package:**
   ```json
   {
     "name": "@personal-pipeline/your-package",
     "publishConfig": {
       "registry": "http://localhost:4873",
       "access": "restricted"
     }
   }
   ```

2. **Build and publish:**
   ```bash
   npm run package:build
   npm run package:publish
   ```

## Package Consumption

Add to your `.npmrc`:
```ini
registry=http://localhost:4873/
@personal-pipeline:registry=http://localhost:4873/
//localhost:4873/:_authToken=<your-token>
```

Then install packages normally:
```bash
npm install @personal-pipeline/mcp-server
```

## Troubleshooting

### Common Issues

1. **Registry not accessible**: Check if services are running with `npm run registry:status`
2. **Authentication errors**: Login with `npm run registry:login`
3. **Package not found**: Verify registry URL and package name
4. **Storage issues**: Clean up with `./scripts/registry-manager.sh cleanup all`

### Getting Help

- Check logs: `npm run registry:logs`
- Health status: `./scripts/registry-manager.sh health status`
- Full documentation: `docs/NPM-REGISTRY.md`

## Production Deployment

For production deployment:

1. **Change default passwords**
2. **Enable HTTPS/TLS**
3. **Configure external storage**
4. **Set up monitoring alerts**
5. **Implement backup strategy**

See `docs/NPM-REGISTRY.md` for complete production setup guide.

---

**Documentation**: [Complete NPM Registry Guide](../docs/NPM-REGISTRY.md)  
**Author**: Backend Technical Lead Agent  
**Date**: 2025-01-16