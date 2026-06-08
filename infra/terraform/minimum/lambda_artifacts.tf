# ============================================
# Lambda deployment artifacts
# ============================================

resource "aws_s3_bucket" "lambda_artifacts" {
  bucket = "${var.project_name}-lambda-artifacts-${var.environment}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "lambda_artifacts" {
  bucket = aws_s3_bucket.lambda_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "lambda_artifacts" {
  bucket = aws_s3_bucket.lambda_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lambda_artifacts" {
  bucket = aws_s3_bucket.lambda_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_object" "backend_lambda_artifact" {
  bucket                 = aws_s3_bucket.lambda_artifacts.id
  key                    = "backend/planner-backend-${filesha256(local.lambda_zip_path)}.zip"
  source                 = local.lambda_zip_path
  source_hash            = filebase64sha256(local.lambda_zip_path)
  content_type           = "application/zip"
  server_side_encryption = "AES256"
  bucket_key_enabled     = false
  metadata               = {}

  depends_on = [
    aws_s3_bucket_public_access_block.lambda_artifacts,
    aws_s3_bucket_server_side_encryption_configuration.lambda_artifacts,
    aws_s3_bucket_versioning.lambda_artifacts
  ]
}
