# ============================================
# Lambda Function
# ============================================

locals {
  api_lambda_environment = {
    SPRING_PROFILES_ACTIVE = var.spring_profiles_active
    AWS_REGION_OVERRIDE    = var.aws_region
    DYNAMODB_TABLE_PREFIX  = "${var.project_name}_${var.environment}_"
    AWS_S3_BUCKET_NAME     = aws_s3_bucket.public_assets.bucket
    AWS_S3_PUBLIC_BASE_URL = "https://${aws_s3_bucket.public_assets.bucket}.s3.${var.aws_region}.amazonaws.com"
    JWT_SECRET             = var.jwt_secret
    CORS_ORIGINS           = var.api_cors_origins
  }
}

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-${var.environment}-api"
  handler       = "com.planner.StreamLambdaHandler::handleRequest"
  runtime       = "java21"
  memory_size   = var.lambda_memory
  timeout       = var.lambda_timeout
  architectures = ["arm64"] # Graviton2 — 최소 비용

  filename         = "${path.module}/../backend/build/libs/planner-backend-0.0.1-SNAPSHOT.jar"
  source_code_hash = filebase64sha256("${path.module}/../backend/build/libs/planner-backend-0.0.1-SNAPSHOT.jar")

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

# Publish version for SnapStart
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version
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
      }
    ]
  })
}
