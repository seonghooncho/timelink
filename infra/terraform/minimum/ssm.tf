locals {
  backend_ssm_prefix = "/${var.project_name}/${var.environment}/backend"
  ai_ssm_prefix      = "/${var.project_name}/${var.environment}/ai"
  frontend_origin    = trimsuffix(var.frontend_origin_override != "" ? var.frontend_origin_override : "https://${aws_cloudfront_distribution.frontend.domain_name}", "/")

  backend_ssm_parameters = {
    "aws.dynamodb.endpoint"     = "aws"
    "aws.dynamodb.table-prefix" = "${var.project_name}_${var.environment}_"
    "aws.s3.bucket-name"        = aws_s3_bucket.public_assets.bucket
    "aws.s3.public-base-url"    = "https://${aws_s3_bucket.public_assets.bucket}.s3.${var.aws_region}.amazonaws.com"
    "cors.allowed-origins"      = local.frontend_origin
    "logging.level.com.planner" = var.backend_log_level
  }

  ai_ssm_parameters = {
    "CORS_ORIGINS" = local.frontend_origin
    "LOG_LEVEL"    = var.ai_log_level
  }
}

resource "aws_ssm_parameter" "backend_config" {
  for_each = local.backend_ssm_parameters

  name  = "${local.backend_ssm_prefix}/${each.key}"
  type  = "String"
  value = each.value
}

resource "aws_ssm_parameter" "backend_jwt_secret" {
  name        = "${local.backend_ssm_prefix}/jwt.secret"
  description = "Backend JWT secret. Replace the placeholder value in SSM after the first apply."
  type        = "SecureString"
  value       = var.jwt_secret_placeholder

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "ai_config" {
  for_each = local.ai_ssm_parameters

  name  = "${local.ai_ssm_prefix}/${each.key}"
  type  = "String"
  value = each.value
}

resource "aws_ssm_parameter" "ai_gemini_api_key" {
  name        = "${local.ai_ssm_prefix}/GEMINI_API_KEY"
  description = "AI Gemini API key. Replace the placeholder value in SSM after the first apply."
  type        = "SecureString"
  value       = var.gemini_api_key_placeholder

  lifecycle {
    ignore_changes = [value]
  }
}
