# ============================================
# AI Service — Lambda (Container Image)
# ============================================

locals {
  ai_lambda_environment = {
    GEMINI_API_KEY = var.gemini_api_key
    CORS_ORIGINS   = var.ai_cors_origins
    LOG_LEVEL      = "INFO"
  }
}

# ECR Repository
resource "aws_ecr_repository" "ai" {
  name                 = "${var.project_name}-${var.environment}-ai"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-ai-ecr"
  }
}

# ECR Lifecycle — 최근 5개 이미지만 유지 (비용 절감)
resource "aws_ecr_lifecycle_policy" "ai" {
  repository = aws_ecr_repository.ai.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

# Lambda Function (Container Image)
resource "aws_lambda_function" "ai" {
  function_name = "${var.project_name}-${var.environment}-ai"
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.ai.repository_url}:latest"
  role          = aws_iam_role.ai_lambda_exec.arn

  memory_size   = var.ai_lambda_memory
  timeout       = var.ai_lambda_timeout
  architectures = ["arm64"]

  image_config {
    command = ["app.main.handler"]
  }

  environment {
    variables = local.ai_lambda_environment
  }

  tags = {
    Name = "${var.project_name}-ai"
  }

  depends_on = [aws_ecr_repository.ai]
}

# Lambda Alias
resource "aws_lambda_alias" "ai_live" {
  name             = "live"
  function_name    = aws_lambda_function.ai.function_name
  function_version = aws_lambda_function.ai.version
}

# ============================================
# IAM Role for AI Lambda
# ============================================

resource "aws_iam_role" "ai_lambda_exec" {
  name = "${var.project_name}-${var.environment}-ai-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ai_lambda_basic" {
  role       = aws_iam_role.ai_lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ai_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.ai.function_name}"
  retention_in_days = 7
}
