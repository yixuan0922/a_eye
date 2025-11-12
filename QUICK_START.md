# Quick Start Guide - A_Eye Microservices

## 🚀 Get Started in 5 Minutes

### 1. Prerequisites Check

```bash
# Check Docker is installed
docker --version
docker-compose --version

# Check Node.js (optional, only if running services locally)
node --version  # Should be 20+
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials (at minimum, set AWS credentials)
nano .env
```

### 3. Start Everything

```bash
# Build and start all services
docker-compose up --build

# Wait for services to be ready (takes ~2 minutes first time)
# You'll see: "🚀 [Service Name] running on port [PORT]"
```

### 4. Verify Services

```bash
# Check all services are healthy
curl http://localhost:4000/api/services/status

# Should return:
# {
#   "gateway": "healthy",
#   "services": [...]
# }
```

### 5. Access Application

Open in browser:
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:4000
- **Service Status**: http://localhost:4000/api/services/status

---

## 📝 Common Commands

### Docker Compose

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild a specific service
docker-compose up --build violations-service

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f violations-service

# Restart a service
docker-compose restart violations-service

# Check running services
docker-compose ps
```

### Database

```bash
# Run migrations
docker-compose exec violations-service npx prisma migrate deploy --schema=../../shared/schema.prisma

# Generate Prisma client
docker-compose exec violations-service npx prisma generate --schema=../../shared/schema.prisma

# Open Prisma Studio (GUI)
docker-compose exec violations-service npx prisma studio --schema=../../shared/schema.prisma

# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d a_eye

# Backup database
docker-compose exec postgres pg_dump -U postgres a_eye > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres a_eye < backup.sql
```

### Service Development

```bash
# Run a service locally (without Docker)
cd services/violations-service
npm install
npm run dev

# Build a service
npm run build

# Start production build
npm start
```

### Testing

```bash
# Test API Gateway
curl http://localhost:4000/health

# Test Violations Service
curl http://localhost:3001/health

# Test Unauthorized Service
curl http://localhost:3002/health

# Create a test violation
curl -X POST http://localhost:4000/api/ppe-violations \
  -H "Content-Type: application/json" \
  -d '{
    "personName": "Test User",
    "siteId": "your-site-id",
    "cameraName": "Test Camera",
    "previousState": "compliant",
    "currentState": "non-compliant",
    "ppeWearing": [],
    "ppeMissing": ["hard_hat"],
    "ppeRequired": ["hard_hat"],
    "violationReason": "Test violation"
  }'

# Query violations
curl "http://localhost:4000/api/ppe-violations?siteId=your-site-id"
```

---

## 🐛 Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker info

# Check logs for errors
docker-compose logs

# Remove old containers and try again
docker-compose down -v
docker-compose up --build
```

### Port already in use

```bash
# Find what's using the port
lsof -i :3001  # Replace 3001 with your port

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
ports:
  - "3101:3001"  # Map to different host port
```

### Database connection errors

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up postgres
```

### Service can't connect to database

```bash
# Make sure DATABASE_URL is correct in .env
# Should be: postgresql://postgres:postgres@postgres:5432/a_eye

# Check service logs
docker-compose logs violations-service

# Restart the service
docker-compose restart violations-service
```

### Prisma errors

```bash
# Regenerate Prisma client
docker-compose exec violations-service npx prisma generate --schema=../../shared/schema.prisma

# Reset database schema (WARNING: deletes data)
docker-compose exec violations-service npx prisma migrate reset --schema=../../shared/schema.prisma
```

---

## 🎯 Next Steps

Once you have everything running:

1. **Explore the API**: Use the service status endpoint to see all available services
2. **Read the docs**: Check `MICROSERVICES_SETUP.md` for detailed information
3. **Create remaining services**: Run `./scripts/create-remaining-services.sh`
4. **Deploy to cloud**: Follow Terraform instructions in `MICROSERVICES_SETUP.md`

---

## 📚 Additional Resources

- **Setup Guide**: `MICROSERVICES_SETUP.md`
- **Architecture**: `README_MICROSERVICES.md`
- **Migration Report**: `MIGRATION_SUMMARY.md`
- **Terraform**: `terraform/README.md` (to be created)

---

## 💡 Pro Tips

1. **Use Docker for consistency**: Even if developing locally, Docker ensures same environment as production
2. **Check service status frequently**: http://localhost:4000/api/services/status
3. **Use Prisma Studio**: Great for viewing and editing database records
4. **Watch logs in real-time**: `docker-compose logs -f` helps debug issues quickly
5. **Keep services updated**: Regularly `docker-compose pull` to get latest images

---

## 🆘 Need Help?

- Check the logs: `docker-compose logs -f`
- Review documentation: See files listed above
- Verify environment variables: `cat .env`
- Check service health: `curl http://localhost:4000/api/services/status`

---

**Happy Coding! 🚀**
