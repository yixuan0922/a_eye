# A_Eye - Cloud-Native Microservices Architecture

[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://www.docker.com/)
[![Terraform](https://img.shields.io/badge/Terraform-configured-purple)](https://www.terraform.io/)
[![AWS](https://img.shields.io/badge/AWS-ECS-orange)](https://aws.amazon.com/ecs/)

AI-powered workplace safety surveillance system built with microservices architecture for cloud deployment.

## 🚀 Quick Start

```bash
# Start all services locally with Docker Compose
docker-compose up --build

# Access the application
open http://localhost:3000
```

## 📋 Table of Contents

- [Architecture](#architecture)
- [Services](#services)
- [Getting Started](#getting-started)
- [Local Development](#local-development)
- [Cloud Deployment](#cloud-deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │ :3000
│  (Next.js)  │
└──────┬──────┘
       │
       ↓
┌──────────────────────────────────────────┐
│         API Gateway :4000                │
│  (Routing, Rate Limiting, Auth)          │
└──────────────────────────────────────────┘
       │
       ├─────→ [Violations Service]    :3001
       ├─────→ [Unauthorized Service]  :3002
       ├─────→ [Personnel Service]     :3003
       ├─────→ [Camera Service]        :3004
       ├─────→ [Attendance Service]    :3005
       └─────→ [Site Service]          :3006
                      ↓
              ┌────────────────┐
              │   PostgreSQL   │ :5432
              └────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Express.js, Prisma ORM, PostgreSQL
- **Infrastructure**: Docker, AWS ECS, Terraform
- **Storage**: AWS S3
- **AI/ML**: Face Recognition (Flask API)

## 🎯 Services

| Service | Port | Responsibility |
|---------|------|----------------|
| **API Gateway** | 4000 | Request routing, load balancing, rate limiting |
| **Violations** | 3001 | PPE violations, safety violations management |
| **Unauthorized Access** | 3002 | Unauthorized personnel detection and tracking |
| **Personnel** | 3003 | Employee management, face recognition, photo storage |
| **Camera** | 3004 | Camera management, stream handling, P2P connections |
| **Attendance** | 3005 | Attendance tracking, presence detection, reporting |
| **Site** | 3006 | Facility management, QR codes, multi-site support |

## 🚀 Getting Started

### Prerequisites

- **Docker Desktop** (or Docker + Docker Compose)
- **Node.js** 20+ (for local development)
- **AWS Account** (for cloud deployment)
- **Terraform** 1.5+ (for infrastructure)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd a_eye
```

2. **Set up environment variables**

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/a_eye
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
FLASK_API_URL=https://aeye001.biofuel.osiris.sg
```

3. **Start services**

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d
```

4. **Initialize database**

```bash
# Run migrations
docker-compose exec violations-service npx prisma migrate deploy --schema=../../shared/schema.prisma

# Seed database (optional)
docker-compose exec violations-service npm run db:seed
```

5. **Access the application**

- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- Service Health: http://localhost:4000/api/services/status

## 💻 Local Development

### Running Individual Services

```bash
cd services/violations-service
npm install
npm run dev
```

### Database Management

```bash
# Prisma Studio (GUI)
npx prisma studio --schema=./shared/schema.prisma

# Run migrations
npx prisma migrate dev --schema=./shared/schema.prisma

# Generate Prisma Client
npx prisma generate --schema=./shared/schema.prisma
```

### Testing Services

```bash
# Health checks
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Service status via API Gateway
curl http://localhost:4000/api/services/status
```

## ☁️ Cloud Deployment

### AWS ECS Deployment with Terraform

1. **Configure AWS credentials**

```bash
aws configure
```

2. **Initialize Terraform**

```bash
cd terraform
terraform init
```

3. **Create terraform.tfvars**

```hcl
aws_region     = "us-east-1"
environment    = "prod"
project_name   = "a-eye"
db_password    = "your-secure-password"
certificate_arn = "arn:aws:acm:..." # Optional for HTTPS
```

4. **Deploy infrastructure**

```bash
terraform plan
terraform apply
```

5. **Build and push Docker images**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push (example for violations-service)
docker build -t a-eye-violations:latest -f services/violations-service/Dockerfile .
docker tag a-eye-violations:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/a-eye-prod-violations-service:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/a-eye-prod-violations-service:latest
```

6. **Access deployed application**

```bash
# Get load balancer URL
terraform output alb_dns_name

# Visit in browser
open http://$(terraform output -raw alb_dns_name)
```

### Deployment Architecture

```
┌──────────────────────────────────────┐
│      AWS Cloud (us-east-1)           │
│                                       │
│  ┌────────────────────────────────┐  │
│  │  Application Load Balancer     │  │
│  │  (Public subnet)               │  │
│  └────────────┬───────────────────┘  │
│               │                       │
│  ┌────────────▼───────────────────┐  │
│  │   ECS Cluster                  │  │
│  │   (Private subnets)            │  │
│  │                                │  │
│  │  [API Gateway] [Violations]   │  │
│  │  [Personnel] [Camera] ...     │  │
│  └────────────┬───────────────────┘  │
│               │                       │
│  ┌────────────▼───────────────────┐  │
│  │   RDS PostgreSQL               │  │
│  │   (Private subnet)             │  │
│  └────────────────────────────────┘  │
│                                       │
│  ┌────────────────────────────────┐  │
│  │   S3 Bucket                    │  │
│  │   (Photos & snapshots)         │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

## 📚 API Documentation

### API Gateway Endpoints

All requests go through the API Gateway at `http://localhost:4000` (local) or `http://<alb-dns>` (cloud).

#### Violations

```bash
# Create PPE violation
POST /api/ppe-violations
{
  "personName": "John Doe",
  "siteId": "...",
  "cameraName": "Camera 1",
  "previousState": "compliant",
  "currentState": "non-compliant",
  "ppeWearing": ["vest"],
  "ppeMissing": ["hard_hat"],
  "ppeRequired": ["hard_hat", "vest"],
  "violationReason": "Missing hard hat"
}

# Get violations
GET /api/ppe-violations?siteId=...&status=active

# Resolve violation
PATCH /api/ppe-violations/:id/resolve
{
  "resolvedBy": "Admin",
  "resolutionNotes": "Issue resolved"
}
```

#### Unauthorized Access

```bash
# Create alert
POST /api/unauthorized-access
{
  "trackId": 123,
  "siteId": "...",
  "cameraName": "Camera 1",
  "location": "Entrance A",
  "detectionTimestamp": "2024-01-01T10:00:00Z",
  "durationSeconds": 15.5,
  "totalFramesTracked": 450,
  "faceDetectionAttempts": 10
}

# Get alerts
GET /api/unauthorized-access?siteId=...&status=active

# Update alert
PATCH /api/unauthorized-access/:id
{
  "status": "resolved",
  "identifiedPersonnelId": "..."
}
```

See [MICROSERVICES_SETUP.md](./MICROSERVICES_SETUP.md) for complete API documentation.

## 🛠️ Development Scripts

```bash
# Create remaining services (personnel, camera, attendance, site)
./scripts/create-remaining-services.sh

# Start all services
docker-compose up

# Stop all services
docker-compose down

# Rebuild specific service
docker-compose up --build violations-service

# View logs
docker-compose logs -f violations-service

# Run database migrations
docker-compose exec violations-service npx prisma migrate deploy --schema=../../shared/schema.prisma
```

## 📊 Monitoring

### Service Health

```bash
# Check all services
curl http://localhost:4000/api/services/status

# Check individual service
curl http://localhost:3001/health
```

### Logs

```bash
# Docker Compose logs
docker-compose logs -f

# Specific service
docker-compose logs -f violations-service

# AWS CloudWatch (production)
aws logs tail /ecs/a-eye-prod-violations-service --follow
```

## 🔒 Security

- **Authentication**: Implement JWT tokens in API Gateway
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: TLS/SSL for all communications
- **Secrets**: AWS Secrets Manager for credentials
- **Rate Limiting**: 1000 requests per 15 minutes per IP
- **Container Scanning**: Automatic vulnerability scanning in ECR

## 🚧 Remaining Work

1. **Complete Remaining Services**: Personnel, Camera, Attendance, Site services need full implementation
2. **Complete Terraform Modules**: ECS, RDS, and ALB modules need completion
3. **Frontend Migration**: Update frontend to use API Gateway
4. **Authentication**: Implement JWT-based authentication
5. **CI/CD Pipeline**: Set up GitHub Actions or AWS CodePipeline
6. **Monitoring**: Add CloudWatch dashboards and alarms
7. **Testing**: Add unit and integration tests

## 📖 Documentation

- [Microservices Setup Guide](./MICROSERVICES_SETUP.md) - Detailed setup instructions
- [Terraform Configuration](./terraform/README.md) - Infrastructure as Code guide
- [API Documentation](./docs/API.md) - Complete API reference (to be created)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with Docker Compose
4. Submit a pull request

## 📝 License

[Your License Here]

## 👥 Team

Developed by [Your Team/Company]

---

**Built with ❤️ using Claude Code**
