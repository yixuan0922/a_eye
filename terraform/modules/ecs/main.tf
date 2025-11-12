# ECS Cluster and Services Module

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.name_prefix}-cluster"
  }
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.name_prefix}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.name_prefix}-ecs-task-execution"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (for application permissions)
resource "aws_iam_role" "ecs_task" {
  name = "${var.name_prefix}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.name_prefix}-ecs-task"
  }
}

# S3 access for personnel service
resource "aws_iam_role_policy" "s3_access" {
  name = "${var.name_prefix}-s3-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = ["*"]
    }]
  })
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.name_prefix}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow inbound from ALB"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.name_prefix}-ecs-tasks-sg"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  for_each = var.microservices

  name              = "/ecs/${var.name_prefix}/${each.value.name}"
  retention_in_days = 7

  tags = {
    Name    = "/ecs/${var.name_prefix}/${each.value.name}"
    Service = each.value.name
  }
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "services" {
  for_each = var.microservices

  family                   = "${var.name_prefix}-${each.value.name}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = each.value.name
    image = "${var.ecr_repositories[each.key]}:latest"

    portMappings = [{
      containerPort = each.value.container_port
      protocol      = "tcp"
    }]

    environment = concat([
      { name = "NODE_ENV", value = var.environment },
      { name = "PORT", value = tostring(each.value.container_port) },
      { name = "DATABASE_URL", value = var.database_url }
    ],
    each.key == "api_gateway" ? [
      { name = "VIOLATIONS_SERVICE_URL", value = "http://violations-service.local:3001" },
      { name = "UNAUTHORIZED_SERVICE_URL", value = "http://unauthorized-service.local:3002" },
      { name = "PERSONNEL_SERVICE_URL", value = "http://personnel-service.local:3003" },
      { name = "CAMERA_SERVICE_URL", value = "http://camera-service.local:3004" },
      { name = "ATTENDANCE_SERVICE_URL", value = "http://attendance-service.local:3005" },
      { name = "SITE_SERVICE_URL", value = "http://site-service.local:3006" }
    ] : [],
    each.key == "frontend" ? [
      { name = "NEXT_PUBLIC_API_URL", value = "http://api-gateway.local:4000" }
    ] : [])

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs[each.key].name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:${each.value.container_port}/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = {
    Name    = "${var.name_prefix}-${each.value.name}"
    Service = each.value.name
  }
}

# ECS Services
resource "aws_ecs_service" "services" {
  for_each = var.microservices

  name            = "${var.name_prefix}-${each.value.name}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arns[each.key]
    container_name   = each.value.name
    container_port   = each.value.container_port
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command = true

  tags = {
    Name    = "${var.name_prefix}-${each.value.name}"
    Service = each.value.name
  }

  depends_on = [aws_iam_role_policy_attachment.ecs_task_execution]
}

# Auto Scaling for ECS Services
resource "aws_appautoscaling_target" "ecs" {
  for_each = var.microservices

  max_capacity       = each.value.desired_count * 3
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  for_each = var.microservices

  name               = "${var.name_prefix}-${each.key}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
