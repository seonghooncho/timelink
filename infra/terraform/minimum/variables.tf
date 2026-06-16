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

variable "api_reserved_concurrent_executions" {
  description = "Reserved concurrency for the API Lambda. Keep enough unreserved concurrency for notifications, image processing, and batch jobs."
  type        = number
  default     = 50
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

variable "additional_frontend_cors_origins" {
  description = "Additional frontend origins that may upload directly to S3 with presigned URLs."
  type        = list(string)
  default     = ["https://www.timelink.cloud"]
}

variable "backend_log_level" {
  description = "Application log level for the backend Lambda."
  type        = string
  default     = "INFO"
}

variable "backend_aws_sdk_log_level" {
  description = "AWS SDK log level for the backend Lambda."
  type        = string
  default     = "WARN"
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

variable "analytics_enabled" {
  description = "Enable low-cost first-party product analytics. Requires analytics_hmac_secret to be non-empty."
  type        = bool
  default     = false
}

variable "analytics_hmac_secret" {
  description = "Secret used to HMAC raw backend user IDs into analytics user_key values."
  type        = string
  default     = ""
  sensitive   = true
}

variable "analytics_admin_user_ids" {
  description = "Backend user IDs allowed to open the analytics admin dashboard, for example google_<sub>. Do not put email addresses here."
  type        = list(string)
  default     = ["google_117924700620020287535"]
}

variable "analytics_raw_retention_days" {
  description = "Retention period for raw analytics S3 events."
  type        = number
  default     = 30
}

variable "jwt_access_expiration_ms" {
  description = "Access token lifetime in milliseconds."
  type        = number
  default     = 900000
}

variable "jwt_refresh_expiration_ms" {
  description = "Refresh token lifetime in milliseconds."
  type        = number
  default     = 1209600000
}

variable "monitoring_alert_email" {
  description = "Email endpoint for low-cost CloudWatch alarm notifications."
  type        = string
  default     = "sunghuncho127@gmail.com"
}

variable "monitoring_discord_webhook_parameter_name" {
  description = "Optional SSM SecureString parameter name containing the Discord webhook URL for monitoring alerts. Leave blank to use /<project>/<environment>/monitoring/discord_webhook_url."
  type        = string
  default     = ""
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
