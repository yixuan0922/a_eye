# Terraform Outputs

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_url" {
  description = "URL of the Application Load Balancer"
  value       = "http://${module.alb.alb_dns_name}"
}

output "database_endpoint" {
  description = "Endpoint of the RDS database"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "database_url" {
  description = "Full database connection URL"
  value       = module.rds.database_url
  sensitive   = true
}

output "ecr_repository_urls" {
  description = "URLs of ECR repositories"
  value       = module.ecr.repository_urls
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_service_names" {
  description = "Names of ECS services"
  value       = module.ecs.service_names
}

output "api_gateway_url" {
  description = "URL for API Gateway"
  value       = "http://${module.alb.alb_dns_name}/api"
}

output "frontend_url" {
  description = "URL for Frontend"
  value       = "http://${module.alb.alb_dns_name}"
}
