variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where ECS will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "microservices" {
  description = "Map of microservice configurations"
  type = map(object({
    name           = string
    container_port = number
    cpu            = number
    memory         = number
    desired_count  = number
  }))
}

variable "ecr_repositories" {
  description = "Map of ECR repository URLs"
  type        = map(string)
}

variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

variable "alb_target_group_arns" {
  description = "Map of ALB target group ARNs"
  type        = map(string)
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}
