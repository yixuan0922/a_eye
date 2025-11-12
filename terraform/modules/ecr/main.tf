# ECR Repositories for each microservice

resource "aws_ecr_repository" "microservices" {
  for_each = var.microservices

  name                 = "${var.name_prefix}-${each.value.name}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.name_prefix}-${each.value.name}"
    Service = each.value.name
  }
}

# Lifecycle policy to clean up old images
resource "aws_ecr_lifecycle_policy" "microservices" {
  for_each = aws_ecr_repository.microservices

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
