output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "service_names" {
  description = "Names of ECS services"
  value = {
    for k, service in aws_ecs_service.services : k => service.name
  }
}

output "service_arns" {
  description = "ARNs of ECS services"
  value = {
    for k, service in aws_ecs_service.services : k => service.id
  }
}

output "task_definition_arns" {
  description = "ARNs of task definitions"
  value = {
    for k, td in aws_ecs_task_definition.services : k => td.arn
  }
}

output "ecs_tasks_security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}

output "task_execution_role_arn" {
  description = "ARN of the task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "task_role_arn" {
  description = "ARN of the task role"
  value       = aws_iam_role.ecs_task.arn
}
