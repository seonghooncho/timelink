# ============================================
# EventBridge Scheduler for notification reminders
# ============================================

resource "aws_scheduler_schedule_group" "notification_reminders" {
  name = "${var.project_name}-${var.environment}-notification-reminders"
}

resource "aws_iam_role" "scheduler_invoke_lambda" {
  name = "${var.project_name}-${var.environment}-scheduler-invoke-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "scheduler_invoke_lambda" {
  name = "${var.project_name}-${var.environment}-scheduler-invoke-lambda"
  role = aws_iam_role.scheduler_invoke_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.notification_worker.arn,
          aws_lambda_alias.notification_worker_live.arn
        ]
      }
    ]
  })
}

resource "aws_lambda_permission" "notification_scheduler" {
  statement_id  = "AllowEventBridgeSchedulerNotificationWorker"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notification_worker.function_name
  qualifier     = aws_lambda_alias.notification_worker_live.name
  principal     = "scheduler.amazonaws.com"
}
