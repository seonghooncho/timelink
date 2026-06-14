# ============================================
# Monitoring v1 — low-cost CloudWatch alarms
# ============================================

locals {
  monitoring_alarm_actions = [aws_sns_topic.monitoring_alerts.arn]
  monitored_lambda_functions = {
    api                 = "${var.project_name}-${var.environment}-api"
    notification_worker = "${var.project_name}-${var.environment}-notification-worker"
    ai                  = "${var.project_name}-${var.environment}-ai"
  }
  monitoring_api_gateway_stage = "$default"
  monitoring_dynamodb_table    = "${var.project_name}_${var.environment}_main"
  monitoring_discord_webhook_parameter_name = (
    var.monitoring_discord_webhook_parameter_name != ""
    ? var.monitoring_discord_webhook_parameter_name
    : "/${var.project_name}/${var.environment}/monitoring/discord_webhook_url"
  )
}

data "archive_file" "monitoring_alert_formatter" {
  type        = "zip"
  source_file = "${path.module}/functions/monitoring-alert-formatter/index.py"
  output_path = "${path.module}/functions/monitoring-alert-formatter.zip"
}

resource "aws_sns_topic" "monitoring_alerts" {
  name         = "${var.project_name}-${var.environment}-monitoring-alerts"
  display_name = "TimelinkAlerts"
}

resource "aws_sesv2_email_identity" "monitoring_alert_sender" {
  email_identity = var.monitoring_alert_email
}

resource "aws_sns_topic_subscription" "monitoring_alerts_email" {
  topic_arn                       = aws_sns_topic.monitoring_alerts.arn
  protocol                        = "email-json"
  endpoint                        = var.monitoring_alert_email
  confirmation_timeout_in_minutes = 1
  endpoint_auto_confirms          = false
}

resource "aws_sns_topic_subscription" "monitoring_alert_formatter" {
  topic_arn = aws_sns_topic.monitoring_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.monitoring_alert_formatter.arn
}

resource "aws_lambda_permission" "monitoring_alert_formatter_sns" {
  statement_id  = "AllowExecutionFromMonitoringAlertsSns"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.monitoring_alert_formatter.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.monitoring_alerts.arn
}

resource "aws_lambda_function" "monitoring_alert_formatter" {
  function_name    = "${var.project_name}-${var.environment}-monitoring-alert-formatter"
  description      = "Formats CloudWatch monitoring alerts into readable Korean emails and Discord messages."
  filename         = data.archive_file.monitoring_alert_formatter.output_path
  source_code_hash = data.archive_file.monitoring_alert_formatter.output_base64sha256
  handler          = "index.handler"
  runtime          = "python3.12"
  role             = aws_iam_role.monitoring_alert_formatter.arn
  memory_size      = 128
  timeout          = 10
  architectures    = ["arm64"]

  environment {
    variables = {
      ALERT_EMAIL_FROM               = var.monitoring_alert_email
      ALERT_EMAIL_FROM_NAME          = "Timelink 운영 알림"
      ALERT_EMAIL_TO                 = var.monitoring_alert_email
      DISCORD_WEBHOOK_PARAMETER_NAME = local.monitoring_discord_webhook_parameter_name
    }
  }

  tags = {
    Name = "${var.project_name}-monitoring-alert-formatter"
  }
}

resource "aws_cloudwatch_log_group" "monitoring_alert_formatter" {
  name              = "/aws/lambda/${aws_lambda_function.monitoring_alert_formatter.function_name}"
  retention_in_days = 14
}

resource "aws_iam_role" "monitoring_alert_formatter" {
  name = "${var.project_name}-${var.environment}-monitoring-alert-formatter-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "monitoring_alert_formatter_basic" {
  role       = aws_iam_role.monitoring_alert_formatter.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "monitoring_alert_formatter_ses" {
  name = "${var.project_name}-${var.environment}-monitoring-alert-formatter-ses"
  role = aws_iam_role.monitoring_alert_formatter.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail"
        ]
        Resource = aws_sesv2_email_identity.monitoring_alert_sender.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "monitoring_alert_formatter_ssm" {
  name = "${var.project_name}-${var.environment}-monitoring-alert-formatter-ssm"
  role = aws_iam_role.monitoring_alert_formatter.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.monitoring_discord_webhook_parameter_name}"
      }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = local.monitored_lambda_functions

  alarm_name          = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}-lambda-errors"
  alarm_description   = "Lambda errors detected for ${each.value}."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = each.value
  }

  alarm_actions = local.monitoring_alarm_actions
  ok_actions    = local.monitoring_alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  for_each = local.monitored_lambda_functions

  alarm_name          = "${var.project_name}-${var.environment}-${replace(each.key, "_", "-")}-lambda-throttles"
  alarm_description   = "Lambda throttles detected for ${each.value}."
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = each.value
  }

  alarm_actions = local.monitoring_alarm_actions
  ok_actions    = local.monitoring_alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "api_lambda_duration_p95" {
  alarm_name          = "${var.project_name}-${var.environment}-api-lambda-duration-p95"
  alarm_description   = "API Lambda p95 duration is high for two consecutive periods."
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  extended_statistic  = "p95"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 3000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = local.monitored_lambda_functions.api
  }

  alarm_actions = local.monitoring_alarm_actions
  ok_actions    = local.monitoring_alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx" {
  alarm_name          = "${var.project_name}-${var.environment}-api-gateway-5xx"
  alarm_description   = "HTTP API returned 5xx responses."
  namespace           = "AWS/ApiGateway"
  metric_name         = "5xx"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.api.id
    Stage = local.monitoring_api_gateway_stage
  }

  alarm_actions = local.monitoring_alarm_actions
  ok_actions    = local.monitoring_alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_latency_p95" {
  alarm_name          = "${var.project_name}-${var.environment}-api-gateway-latency-p95"
  alarm_description   = "HTTP API p95 latency is high for two consecutive periods."
  namespace           = "AWS/ApiGateway"
  metric_name         = "Latency"
  extended_statistic  = "p95"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 5000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.api.id
    Stage = local.monitoring_api_gateway_stage
  }

  alarm_actions = local.monitoring_alarm_actions
  ok_actions    = local.monitoring_alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttles" {
  alarm_name          = "${var.project_name}-${var.environment}-dynamodb-read-throttles"
  alarm_description   = "DynamoDB read throttle events detected."
  namespace           = "AWS/DynamoDB"
  metric_name         = "ReadThrottleEvents"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = local.monitoring_dynamodb_table
  }

  alarm_actions = local.monitoring_alarm_actions
  ok_actions    = local.monitoring_alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttles" {
  alarm_name          = "${var.project_name}-${var.environment}-dynamodb-write-throttles"
  alarm_description   = "DynamoDB write throttle events detected."
  namespace           = "AWS/DynamoDB"
  metric_name         = "WriteThrottleEvents"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = local.monitoring_dynamodb_table
  }

  alarm_actions = local.monitoring_alarm_actions
  ok_actions    = local.monitoring_alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_scan_returned_items" {
  alarm_name          = "${var.project_name}-${var.environment}-dynamodb-scan-returned-items"
  alarm_description   = "DynamoDB Scan returned items for two consecutive periods."
  namespace           = "AWS/DynamoDB"
  metric_name         = "ReturnedItemCount"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = local.monitoring_dynamodb_table
    Operation = "Scan"
  }

  alarm_actions = local.monitoring_alarm_actions
  ok_actions    = local.monitoring_alarm_actions
}
