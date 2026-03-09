variable "aws_region" {
  description = "AWS region used for the Terraform state bucket and lock table."
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project prefix used when naming Terraform bootstrap resources."
  type        = string
  default     = "planner"
}
