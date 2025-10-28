# Docker Setup Guide

This guide explains how to run AppCord using Docker for both local development and production environments.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- Git

## Quick Start

### Local Development

1. **Clone the repository and navigate to the project directory:**
   ```bash
   cd appcord
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and add your credentials:**
   ```bash
   # Required variables
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Start the development environment:**
   ```bash
   docker-compose up
   ```

5. **Access the application:**
   - Open your browser to http://localhost:3000

### Production

1. **Create production environment file:**
   ```bash
   cp .env.example .env.production
   ```

2. **Edit `.env.production` with production credentials**

3. **Start the production environment:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Check container health:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

## Docker Architecture

### Multi-Stage Dockerfile

The `Dockerfile` uses a multi-stage build process:

1. **base** - Base Node.js 20 Alpine image
2. **deps** - Dependencies installation
3. **builder** - Application build stage
4. **runner** - Production runtime (optimized)
5. **development** - Development runtime (with hot reload)

### Named Volumes

The setup uses named volumes for better performance and data persistence:

#### Development (`docker-compose.yml`)
- `appcord-node-modules` - Stores node_modules for faster container rebuilds
- `appcord-nextjs-cache` - Caches Next.js build artifacts

#### Production (`docker-compose.prod.yml`)
- `appcord-prod-nextjs-cache` - Caches Next.js build artifacts

## Commands Reference

### Development Environment

```bash
# Start services
docker-compose up

# Start services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop services and remove volumes
docker-compose down -v

# Rebuild containers
docker-compose up --build

# Execute commands in running container
docker-compose exec app npm run lint
docker-compose exec app npm test

# Access container shell
docker-compose exec app sh
```

### Production Environment

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Scale services (if needed)
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

## Environment Variables

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://app.supabase.com) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | [Supabase Dashboard](https://app.supabase.com) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | [Supabase Dashboard](https://app.supabase.com) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | [Anthropic Console](https://console.anthropic.com/) |
| `OPENAI_API_KEY` | OpenAI API key | [OpenAI Platform](https://platform.openai.com/api-keys) |

### Optional Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VERCEL_TOKEN` | Vercel deployment token | [Vercel Account](https://vercel.com/account/tokens) |
| `VERCEL_TEAM_ID` | Vercel team ID | [Vercel Dashboard](https://vercel.com/dashboard) |

## Volume Management

### Inspect Volumes

```bash
# List all volumes
docker volume ls

# Inspect specific volume
docker volume inspect appcord-node-modules

# Check volume disk usage
docker system df -v
```

### Clean Up Volumes

```bash
# Remove specific volume (container must be stopped)
docker volume rm appcord-node-modules

# Remove all unused volumes
docker volume prune

# Remove everything (use with caution!)
docker system prune -a --volumes
```

## Networking

Both development and production setups use bridge networks:

- Development: `appcord-network`
- Production: `appcord-prod-network`

These networks allow containers to communicate with each other while remaining isolated from other Docker containers.

## Health Checks

The production setup includes health checks:

- **Endpoint**: `/api/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start period**: 40 seconds

Check health status:
```bash
docker inspect --format='{{.State.Health.Status}}' appcord-prod
```

## Troubleshooting

### Container won't start

1. Check logs:
   ```bash
   docker-compose logs app
   ```

2. Verify environment variables:
   ```bash
   docker-compose exec app env
   ```

3. Check if port 3000 is already in use:
   ```bash
   lsof -i :3000
   ```

### Hot reload not working in development

1. Ensure source code is properly mounted
2. Try setting `WATCHPACK_POLLING=true` in environment variables (already set in docker-compose.yml)
3. Restart the container:
   ```bash
   docker-compose restart app
   ```

### Build fails

1. Clear Docker cache:
   ```bash
   docker builder prune
   ```

2. Rebuild without cache:
   ```bash
   docker-compose build --no-cache
   ```

### Performance issues

1. Check resource usage:
   ```bash
   docker stats
   ```

2. Increase Docker resources (Docker Desktop Settings)
3. Clean up unused resources:
   ```bash
   docker system prune -a
   ```

## Production Best Practices

1. **Use `.env.production` file** - Keep production credentials separate
2. **Enable logging** - Use external logging services (Datadog, CloudWatch, etc.)
3. **Monitor health checks** - Set up alerts for failed health checks
4. **Regular backups** - Backup volumes and configurations
5. **Security scanning** - Scan images for vulnerabilities:
   ```bash
   docker scan appcord-prod
   ```
6. **Resource limits** - Add resource constraints in docker-compose.prod.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
       reservations:
         cpus: '0.5'
         memory: 512M
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t appcord:latest .

      - name: Run tests
        run: docker run appcord:latest npm test
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [AppCord Main README](./README.md)

## Support

For issues and questions:
- Check the [main README](./README.md)
- Review Docker logs
- Check container health status
- Verify environment variables

---

**Note**: This Docker setup is optimized for Next.js 15+ with standalone output mode. The configuration automatically handles server-side rendering and API routes.
