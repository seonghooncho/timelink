# ============================================
# Lambda Function
# ============================================

locals {
  lambda_zip_path = "${path.module}/../../../backend/build/distributions/planner-backend-0.0.1-SNAPSHOT.zip"
  api_lambda_environment = {
    APP_CONFIG_PREFIX = local.backend_ssm_prefix
    APP_DEPLOY_SHA256 = filebase64sha256(local.lambda_zip_path)
  }
}

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-${var.environment}-api"
  description   = "Planner backend API Lambda"
  handler       = "com.planner.StreamLambdaHandler::handleRequest"
  runtime       = "java21"
  publish       = true
  memory_size   = var.lambda_memory
  timeout       = var.lambda_timeout
  architectures = ["arm64"] # Graviton2 — 최소 비용

  s3_bucket         = aws_s3_object.backend_lambda_artifact.bucket
  s3_key            = aws_s3_object.backend_lambda_artifact.key
  s3_object_version = aws_s3_object.backend_lambda_artifact.version_id
  source_code_hash  = filebase64sha256(local.lambda_zip_path)

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = local.api_lambda_environment
  }

  snap_start {
    apply_on = "PublishedVersions"
  }

  tags = {
    Name = "${var.project_name}-api"
  }
}

resource "aws_lambda_function" "notification_worker" {
  function_name = "${var.project_name}-${var.environment}-notification-worker"
  description   = "Planner notification scheduler worker Lambda"
  handler       = "com.planner.NotificationSchedulerLambdaHandler::handleRequest"
  runtime       = "java21"
  publish       = true
  memory_size   = var.notification_worker_memory
  timeout       = var.notification_worker_timeout
  architectures = ["arm64"]

  s3_bucket         = aws_s3_object.backend_lambda_artifact.bucket
  s3_key            = aws_s3_object.backend_lambda_artifact.key
  s3_object_version = aws_s3_object.backend_lambda_artifact.version_id
  source_code_hash  = filebase64sha256(local.lambda_zip_path)

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = local.api_lambda_environment
  }

  snap_start {
    apply_on = "PublishedVersions"
  }

  tags = {
    Name = "${var.project_name}-notification-worker"
  }
}

# Publish version for SnapStart
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
}

resource "aws_lambda_alias" "notification_worker_live" {
  name             = "live"
  function_name    = aws_lambda_function.notification_worker.function_name
  function_version = aws_lambda_function.notification_worker.version
}

# ============================================
# IAM Role for Lambda
# ============================================

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-${var.environment}-lambda-role"

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

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "dynamodb_access" {
  name = "${var.project_name}-dynamodb-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.public_assets.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.backend_ssm_prefix}",
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.backend_ssm_prefix}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "scheduler:CreateSchedule",
          "scheduler:DeleteSchedule",
          "scheduler:GetSchedule",
          "scheduler:UpdateSchedule"
        ]
        Resource = [
          "arn:aws:scheduler:${var.aws_region}:${data.aws_caller_identity.current.account_id}:schedule/${aws_scheduler_schedule_group.notification_reminders.name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = aws_iam_role.scheduler_invoke_lambda.arn
      }
    ]
  })
}
