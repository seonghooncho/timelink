locals {
  backend_ssm_prefix = "/${var.project_name}/${var.environment}/backend"
  ai_ssm_prefix      = "/${var.project_name}/${var.environment}/ai"
  frontend_origin    = trimsuffix(var.frontend_origin_override != "" ? var.frontend_origin_override : "https://${aws_cloudfront_distribution.frontend.domain_name}", "/")

  backend_ssm_parameters = {
    "aws.dynamodb.endpoint"     = "aws"
    "aws.dynamodb.table-prefix" = "${var.project_name}_${var.environment}_"
    "aws.s3.bucket-name"        = aws_s3_bucket.public_assets.bucket
    "aws.s3.public-base-url"    = local.frontend_origin
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

  overwrite = true
  name  = "${local.backend_ssm_prefix}/${each.key}"
  type  = "String"
  value = each.value
}

resource "aws_ssm_parameter" "ai_config" {
  for_each = local.ai_ssm_parameters

  overwrite = true
  name  = "${local.ai_ssm_prefix}/${each.key}"
  type  = "String"
  value = each.value
}
