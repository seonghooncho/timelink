variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "planner"
}

variable "lambda_memory" {
  description = "Lambda memory in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "frontend_origin_override" {
  description = "Optional custom frontend origin. Leave blank to use the CloudFront domain."
  type        = string
  default     = ""
}

variable "mobile_app_origin" {
  description = "Custom scheme origin used by the mobile app OAuth callback."
  type        = string
  default     = "timelink://app"
}

variable "backend_log_level" {
  description = "Application log level for the backend Lambda."
  type        = string
  default     = "INFO"
}

# ── AI Lambda ──

variable "ai_log_level" {
  description = "Application log level for the AI Lambda."
  type        = string
  default     = "INFO"
}

variable "ai_lambda_memory" {
  description = "AI Lambda memory in MB"
  type        = number
  default     = 256
}

variable "ai_lambda_timeout" {
  description = "AI Lambda timeout in seconds"
  type        = number
  default     = 60
}
