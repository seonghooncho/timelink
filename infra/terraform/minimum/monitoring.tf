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
}

resource "aws_sns_topic" "monitoring_alerts" {
  name = "${var.project_name}-${var.environment}-monitoring-alerts"
}

resource "aws_sns_topic_subscription" "monitoring_alerts_email" {
  topic_arn = aws_sns_topic.monitoring_alerts.arn
  protocol  = "email"
  endpoint  = var.monitoring_alert_email
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
