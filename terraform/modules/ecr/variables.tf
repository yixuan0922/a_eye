variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
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
