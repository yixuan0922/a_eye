# A_Eye Microservices Architecture - Setup Guide

## 🏗️ Architecture Overview

This project has been transformed from a monolithic Next.js application into a cloud-native microservices architecture.

### **Service Breakdown**

| Service | Port | Description | Technology |
|---------|------|-------------|------------|
| **API Gateway** | 4000 | Request routing, rate limiting | Express + http-proxy-middleware |
| **Violations Service** | 3001 | PPE & generic violations management | Express + Prisma |
| **Unauthorized Service** | 3002 | Unauthorized access detection | Express + Prisma |
| **Personnel Service** | 3003 | Personnel management + S3 photos | Express + Prisma + AWS SDK |
| **Camera Service** | 3004 | Camera management + streaming | Express + Prisma |
| **Attendance Service** | 3005 | Attendance tracking & reports | Express + Prisma |
| **Site Service** | 3006 | Site management + QR codes | Express + Prisma |
| **Frontend** | 3000 | Next.js UI application | Next.js 14 + React 18 |
| **PostgreSQL** | 5432 | Shared database | PostgreSQL 15 |

---

## 📁 Directory Structure

```
a_eye/
├── services/
│   ├── api-gateway/         # API Gateway (port 4000)
│   ├── violations-service/  # Violations API (port 3001)
│   ├── unauthorized-service/# Unauthorized Access API (port 3002)
│   ├── personnel-service/   # Personnel API (port 3003) - TO BE CREATED
│   ├── camera-service/      # Camera API (port 3004) - TO BE CREATED
│   ├── attendance-service/  # Attendance API (port 3005) - TO BE CREATED
│   └── site-service/        # Site API (port 3006) - TO BE CREATED
│
├── shared/
│   ├── schema.prisma        # Shared Prisma schema
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Shared utilities
│
├── terraform/               # Infrastructure as Code
│   ├── main.tf              # Main Terraform config
│   ├── variables.tf         # Input variables
│   ├── outputs.tf           # Output values
│   └── modules/
│       ├── networking/      # VPC, subnets, NAT
│       ├── ecs/             # ECS cluster & services - TO BE COMPLETED
│       ├── ecr/             # Container registries
│       ├── rds/             # PostgreSQL database - TO BE COMPLETED
│       └── alb/             # Load balancer - TO BE COMPLETED
│
├── docker-compose.yml       # Local development orchestration
├── src/                     # Existing Next.js frontend
└── prisma/                  # Original Prisma setup
```

---

## 🚀 Quick Start - Local Development

### **Prerequisites**

- Docker & Docker Compose
- Node.js 20+
- npm or pnpm

### **1. Clone and Install**

```bash
# Already in the project directory
cd /Users/chengrong/Desktop/a_eye

# Install dependencies for each service (or use Docker)
cd services/violations-service && npm install
cd ../unauthorized-service && npm install
cd ../api-gateway && npm install
# ... repeat for other services
```

### **2. Set Up Environment Variables**

```bash
# Copy example env files
cp services/violations-service/.env.example services/violations-service/.env
cp services/unauthorized-service/.env.example services/unauthorized-service/.env
cp services/api-gateway/.env.example services/api-gateway/.env

# Create root .env for docker-compose
cat > .env << EOF
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/a_eye
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
EOF
```

### **3. Start Services with Docker Compose**

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### **4. Access Services**

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:4000
- **Service Status**: http://localhost:4000/api/services/status
- **Individual Services**:
  - Violations: http://localhost:3001/health
  - Unauthorized: http://localhost:3002/health
  - Personnel: http://localhost:3003/health (when created)
  - Camera: http://localhost:3004/health (when created)
  - Attendance: http://localhost:3005/health (when created)
  - Site: http://localhost:3006/health (when created)

### **5. Database Setup**

```bash
# Run migrations (from any service directory)
cd services/violations-service
npx prisma migrate deploy --schema=../../shared/schema.prisma

# Or generate Prisma client
npx prisma generate --schema=../../shared/schema.prisma

# Seed database (if needed)
npm run db:seed
```

---

## ☁️ Cloud Deployment with Terraform

### **Prerequisites**

- AWS Account
- Terraform >= 1.5.0
- AWS CLI configured
- Docker for building images

### **1. Configure AWS Credentials**

```bash
aws configure
# Enter your AWS Access Key, Secret Key, and Region
```

### **2. Initialize Terraform**

```bash
cd terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan
```

### **3. Deploy Infrastructure**

```bash
# Create terraform.tfvars
cat > terraform.tfvars << EOF
aws_region     = "us-east-1"
environment    = "dev"
project_name   = "a-eye"

# Database
db_password    = "YourSecurePassword123!"

# Optional: SSL Certificate ARN for HTTPS
certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/..."
EOF

# Apply Terraform configuration
terraform apply

# Get outputs
terraform output
```

### **4. Build and Push Docker Images to ECR**

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push each service
# Example for violations-service:
docker build -t a-eye-dev-violations-service:latest -f services/violations-service/Dockerfile .
docker tag a-eye-dev-violations-service:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/a-eye-dev-violations-service:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/a-eye-dev-violations-service:latest

# Repeat for all services
```

### **5. Update ECS Services**

```bash
# Force new deployment after pushing images
aws ecs update-service --cluster a-eye-dev-cluster --service a-eye-dev-violations-service --force-new-deployment

# Repeat for all services
```

### **6. Access Deployed Application**

```bash
# Get ALB DNS name
terraform output alb_dns_name

# Access application
curl http://<alb-dns-name>/api/services/status
```

---

## 🔧 Development Workflow

### **Running Individual Services Locally**

```bash
# Run a single service (example: violations-service)
cd services/violations-service

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Start in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### **Testing API Endpoints**

```bash
# Health check
curl http://localhost:3001/health

# Create PPE violation
curl -X POST http://localhost:3001/api/ppe-violations \
  -H "Content-Type: application/json" \
  -d '{
    "personName": "John Doe",
    "siteId": "site-id",
    "cameraName": "Camera 1",
    "previousState": "compliant",
    "currentState": "non-compliant",
    "ppeWearing": ["vest"],
    "ppeMissing": ["hard_hat"],
    "ppeRequired": ["hard_hat", "vest"],
    "violationReason": "Missing hard hat"
  }'

# Get violations
curl "http://localhost:3001/api/ppe-violations?siteId=site-id"
```

---

## 📊 Monitoring and Debugging

### **View Service Logs**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f violations-service

# Last 100 lines
docker-compose logs --tail=100 violations-service
```

### **Check Service Health**

```bash
# API Gateway service status
curl http://localhost:4000/api/services/status

# Individual service health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

### **Database Access**

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d a_eye

# Or use Prisma Studio
cd services/violations-service
npx prisma studio --schema=../../shared/schema.prisma
```

---

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Database Credentials**: Use AWS Secrets Manager in production
3. **API Gateway**: Implement authentication middleware
4. **Rate Limiting**: Already configured in API Gateway
5. **HTTPS**: Use ACM certificates with ALB
6. **Container Scanning**: ECR automatically scans images

---

## 🎯 Next Steps - TO COMPLETE

### **1. Create Remaining Microservices**

The following services need to be created following the same pattern as violations-service and unauthorized-service:

- **personnel-service** (port 3003) - Handles S3 photo uploads and Flask API integration
- **camera-service** (port 3004) - Camera management and streaming
- **attendance-service** (port 3005) - Attendance tracking
- **site-service** (port 3006) - Site management and QR codes

### **2. Complete Terraform Modules**

- `terraform/modules/ecs/` - ECS cluster, services, and task definitions
- `terraform/modules/rds/` - PostgreSQL RDS instance
- `terraform/modules/alb/` - Application Load Balancer with target groups

### **3. Update Frontend**

Modify the frontend to call the API Gateway instead of local API routes:

```typescript
// Before: /api/violations
// After: http://localhost:4000/api/violations
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
```

### **4. CI/CD Pipeline**

Set up GitHub Actions or AWS CodePipeline for automated deployments:

```yaml
# .github/workflows/deploy.yml
name: Deploy Microservices
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push to ECR
      - name: Update ECS services
```

---

## 📚 Additional Resources

- **Prisma Documentation**: https://www.prisma.io/docs
- **Terraform AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws
- **AWS ECS Best Practices**: https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide
- **Docker Compose**: https://docs.docker.com/compose

---

## 🆘 Troubleshooting

### **Service won't start**
```bash
# Check logs
docker-compose logs service-name

# Rebuild container
docker-compose up --build service-name
```

### **Database connection issues**
```bash
# Check if postgres is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready -U postgres
```

### **Port conflicts**
```bash
# Check what's using a port
lsof -i :3001

# Change port in docker-compose.yml
ports:
  - "3101:3001"  # Map to different host port
```

---

## 📞 Support

For issues or questions, please create an issue in the repository or contact the development team.

---

**Generated with Claude Code** 🤖
