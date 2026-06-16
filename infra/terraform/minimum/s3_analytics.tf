# ============================================
# S3 bucket for low-cost product analytics raw events
# ============================================

resource "aws_s3_bucket" "analytics_raw" {
  bucket = "${var.project_name}-analytics-raw-${var.environment}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "analytics_raw" {
  bucket = aws_s3_bucket.analytics_raw.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "analytics_raw" {
  bucket = aws_s3_bucket.analytics_raw.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "analytics_raw" {
  bucket = aws_s3_bucket.analytics_raw.id

  rule {
    id     = "expire-raw-analytics"
    status = "Enabled"

    filter {
      prefix = "analytics/raw/"
    }

    expiration {
      days = var.analytics_raw_retention_days
    }
  }
}
