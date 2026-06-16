locals {
  backend_ssm_prefix = "/${var.project_name}/${var.environment}/backend"
  ai_ssm_prefix      = "/${var.project_name}/${var.environment}/ai"
  frontend_origin    = trimsuffix(var.frontend_origin_override != "" ? var.frontend_origin_override : "https://${aws_cloudfront_distribution.frontend.domain_name}", "/")

  backend_ssm_parameters = {
    "aws.dynamodb.endpoint"         = "aws"
    "aws.dynamodb.table-prefix"     = "${var.project_name}_${var.environment}_"
    "aws.s3.bucket-name"            = aws_s3_bucket.public_assets.bucket
    "aws.s3.public-base-url"        = local.frontend_origin
    "aws.scheduler.group-name"      = aws_scheduler_schedule_group.notification_reminders.name
    "aws.scheduler.target-arn"      = aws_lambda_alias.notification_worker_live.arn
    "aws.scheduler.role-arn"        = aws_iam_role.scheduler_invoke_lambda.arn
    "analytics.enabled"             = tostring(var.analytics_enabled && var.analytics_hmac_secret != "")
    "analytics.api-metrics-enabled" = tostring(var.analytics_enabled && var.analytics_hmac_secret != "")
    "analytics.raw-bucket-name"     = aws_s3_bucket.analytics_raw.bucket
    "analytics.admin-user-ids"      = join(",", var.analytics_admin_user_ids)
    "cors.allowed-origins"          = local.frontend_origin
    "jwt.access-expiration"         = tostring(var.jwt_access_expiration_ms)
    "jwt.expiration"                = tostring(var.jwt_access_expiration_ms)
    "jwt.refresh-expiration"        = tostring(var.jwt_refresh_expiration_ms)
    "jwt.refresh-cookie-name"       = "timelink_rt"
    "jwt.refresh-cookie-path"       = "/api/planner/v1/auth"
    "jwt.refresh-cookie-same-site"  = "Lax"
    "jwt.refresh-cookie-secure"     = "true"
    "logging.level.com.planner"     = var.backend_log_level
    "push.vapid.public-key"         = var.push_vapid_public_key
    "push.subject"                  = var.push_subject
  }

  ai_ssm_parameters = {
    "CORS_ORIGINS" = local.frontend_origin
    "LOG_LEVEL"    = var.ai_log_level
  }
}

resource "aws_ssm_parameter" "backend_config" {
  for_each = local.backend_ssm_parameters

  overwrite = true
  name      = "${local.backend_ssm_prefix}/${each.key}"
  type      = "String"
  value     = each.value
}

resource "aws_ssm_parameter" "backend_aws_sdk_log_level" {
  overwrite = true
  name      = "${local.backend_ssm_prefix}/logging.level.software.amazon.awssdk"
  type      = "String"
  value     = var.backend_aws_sdk_log_level
}

resource "aws_ssm_parameter" "backend_lambda_container_log_level" {
  overwrite = true
  name      = "${local.backend_ssm_prefix}/logging.level.com.amazonaws.serverless.proxy"
  type      = "String"
  value     = "WARN"
}

resource "aws_ssm_parameter" "backend_push_vapid_private_key" {
  count = var.push_vapid_private_key == "" ? 0 : 1

  overwrite = true
  name      = "${local.backend_ssm_prefix}/push.vapid.private-key"
  type      = "SecureString"
  value     = var.push_vapid_private_key
}

resource "aws_ssm_parameter" "backend_analytics_hmac_secret" {
  count = var.analytics_hmac_secret == "" ? 0 : 1

  overwrite = true
  name      = "${local.backend_ssm_prefix}/analytics.hmac-secret"
  type      = "SecureString"
  value     = var.analytics_hmac_secret
}

resource "aws_ssm_parameter" "ai_config" {
  for_each = local.ai_ssm_parameters

  overwrite = true
  name      = "${local.ai_ssm_prefix}/${each.key}"
  type      = "String"
  value     = each.value
}
