# Main Terraform configuration for A_Eye microservices on AWS ECS

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration - uncomment and configure for production
  # backend "s3" {
  #   bucket         = "a-eye-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "A_Eye"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# Local variables
locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # Microservices configuration
  microservices = {
    violations = {
      name          = "violations-service"
      container_port = 3001
      cpu           = 256
      memory        = 512
      desired_count = 2
    }
    unauthorized = {
      name          = "unauthorized-service"
      container_port = 3002
      cpu           = 256
      memory        = 512
      desired_count = 2
    }
    personnel = {
      name          = "personnel-service"
      container_port = 3003
      cpu           = 512
      memory        = 1024
      desired_count = 2
    }
    camera = {
      name          = "camera-service"
      container_port = 3004
      cpu           = 256
      memory        = 512
      desired_count = 2
    }
    attendance = {
      name          = "attendance-service"
      container_port = 3005
      cpu           = 256
      memory        = 512
      desired_count = 2
    }
    site = {
      name          = "site-service"
      container_port = 3006
      cpu           = 256
      memory        = 512
      desired_count = 2
    }
    api_gateway = {
      name          = "api-gateway"
      container_port = 4000
      cpu           = 512
      memory        = 1024
      desired_count = 3
    }
    frontend = {
      name          = "frontend"
      container_port = 3000
      cpu           = 512
      memory        = 1024
      desired_count = 2
    }
  }
}

# Networking Module
module "networking" {
  source = "./modules/networking"

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  availability_zones  = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

# RDS Module (PostgreSQL)
module "rds" {
  source = "./modules/rds"

  name_prefix         = local.name_prefix
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids
  db_name             = var.db_name
  db_username         = var.db_username
  db_password         = var.db_password
  db_instance_class   = var.db_instance_class
  allocated_storage   = var.db_allocated_storage
  multi_az            = var.environment == "prod" ? true : false

  allowed_security_group_ids = [module.ecs.ecs_tasks_security_group_id]
}

# ECR Module (Container Registry)
module "ecr" {
  source = "./modules/ecr"

  name_prefix    = local.name_prefix
  microservices  = local.microservices
}

# ECS Module (Container Orchestration)
module "ecs" {
  source = "./modules/ecs"

  name_prefix           = local.name_prefix
  vpc_id                = module.networking.vpc_id
  private_subnet_ids    = module.networking.private_subnet_ids
  public_subnet_ids     = module.networking.public_subnet_ids
  microservices         = local.microservices
  ecr_repositories      = module.ecr.repository_urls
  database_url          = module.rds.database_url
  alb_target_group_arns = module.alb.target_group_arns

  # Environment variables
  aws_region      = var.aws_region
  environment     = var.environment
}

# Application Load Balancer Module
module "alb" {
  source = "./modules/alb"

  name_prefix        = local.name_prefix
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  certificate_arn    = var.certificate_arn
  microservices      = local.microservices
}
