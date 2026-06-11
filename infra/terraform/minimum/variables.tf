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

variable "notification_worker_memory" {
  description = "Notification worker Lambda memory in MB."
  type        = number
  default     = 1024
}

variable "notification_worker_timeout" {
  description = "Notification worker Lambda timeout in seconds."
  type        = number
  default     = 120
}

variable "frontend_origin_override" {
  description = "Optional custom frontend origin. Leave blank to use the CloudFront domain."
  type        = string
  default     = ""
}

variable "backend_log_level" {
  description = "Application log level for the backend Lambda."
  type        = string
  default     = "INFO"
}

variable "push_vapid_public_key" {
  description = "URL-safe base64 VAPID public key for browser push subscriptions."
  type        = string
  default     = ""
}

variable "push_vapid_private_key" {
  description = "URL-safe base64 VAPID private key. Leave blank and set the SSM SecureString manually if preferred."
  type        = string
  default     = ""
  sensitive   = true
}

variable "push_subject" {
  description = "VAPID subject, for example mailto:ops@example.com or https://example.com."
  type        = string
  default     = "mailto:sunghuncho127@gmail.com"
}

variable "monitoring_alert_email" {
  description = "Email endpoint for low-cost CloudWatch alarm notifications."
  type        = string
  default     = "sunghuncho127@gmail.com"
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
