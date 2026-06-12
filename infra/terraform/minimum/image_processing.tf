# ============================================
# Image processing pipeline
# ============================================

locals {
  image_processor_source_dir = "${path.module}/functions/image-processor"
}

resource "terraform_data" "image_processor_dependencies" {
  triggers_replace = {
    package_json = filesha256("${local.image_processor_source_dir}/package.json")
    source       = filesha256("${local.image_processor_source_dir}/index.mjs")
  }

  provisioner "local-exec" {
    working_dir = local.image_processor_source_dir
    command     = "npm install --omit=dev"
  }
}

data "archive_file" "image_processor" {
  depends_on = [terraform_data.image_processor_dependencies]

  type        = "zip"
  source_dir  = local.image_processor_source_dir
  output_path = "${path.module}/functions/image-processor.zip"
}

resource "aws_iam_role" "image_processor_exec" {
  name = "${var.project_name}-${var.environment}-image-processor-role"

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

resource "aws_iam_role_policy_attachment" "image_processor_basic" {
  role       = aws_iam_role.image_processor_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "image_processor_access" {
  name = "${var.project_name}-${var.environment}-image-processor-access"
  role = aws_iam_role.image_processor_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.public_assets.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.main.arn
      }
    ]
  })
}

resource "aws_lambda_function" "image_processor" {
  function_name    = "${var.project_name}-${var.environment}-image-processor"
  description      = "Convert uploaded images to WebP and update DynamoDB image status"
  filename         = data.archive_file.image_processor.output_path
  source_code_hash = data.archive_file.image_processor.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  publish          = true
  memory_size      = 512
  timeout          = 60
  architectures    = ["x86_64"]
  role             = aws_iam_role.image_processor_exec.arn

  environment {
    variables = {
      TABLE_NAME           = aws_dynamodb_table.main.name
      BUCKET_NAME          = aws_s3_bucket.public_assets.bucket
      PUBLIC_BASE_URL      = local.frontend_origin
      MAX_IMAGE_SIZE_BYTES = tostring(15 * 1024 * 1024)
    }
  }

  tags = {
    Name = "${var.project_name}-image-processor"
  }
}

resource "aws_cloudwatch_log_group" "image_processor" {
  name              = "/aws/lambda/${aws_lambda_function.image_processor.function_name}"
  retention_in_days = 14
}

resource "aws_lambda_permission" "image_processor_s3" {
  statement_id  = "AllowS3InvokeImageProcessor"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.public_assets.arn
}

resource "aws_s3_bucket_notification" "public_assets_uploads" {
  bucket = aws_s3_bucket.public_assets.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "upload/"
  }

  depends_on = [aws_lambda_permission.image_processor_s3]
}

resource "aws_s3_bucket_lifecycle_configuration" "public_assets_upload_cleanup" {
  bucket = aws_s3_bucket.public_assets.id

  rule {
    id     = "expire-upload-prefix"
    status = "Enabled"

    filter {
      prefix = "upload/"
    }

    expiration {
      days = 7
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
