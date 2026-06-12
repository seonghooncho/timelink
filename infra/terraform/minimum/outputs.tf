output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "frontend_bucket" {
  description = "S3 bucket for frontend assets"
  value       = aws_s3_bucket.frontend.bucket
}

output "public_assets_bucket" {
  description = "S3 bucket for uploaded public assets"
  value       = aws_s3_bucket.public_assets.bucket
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "ai_ecr_repository_url" {
  description = "ECR repository URL for AI service"
  value       = aws_ecr_repository.ai.repository_url
}

output "ai_lambda_function_name" {
  description = "AI Lambda function name"
  value       = aws_lambda_function.ai.function_name
}

output "backend_ssm_prefix" {
  description = "SSM prefix for backend runtime configuration"
  value       = local.backend_ssm_prefix
}

output "ai_ssm_prefix" {
  description = "SSM prefix for AI runtime configuration"
  value       = local.ai_ssm_prefix
}

output "backend_jwt_secret_parameter_name" {
  description = "Backend JWT secret parameter name"
  value       = "${local.backend_ssm_prefix}/jwt.secret"
}

output "backend_google_oauth_client_id_parameter_name" {
  description = "Backend Google OAuth client ID parameter name"
  value       = "${local.backend_ssm_prefix}/oauth.google.client-id"
}

output "backend_google_oauth_client_secret_parameter_name" {
  description = "Backend Google OAuth client secret parameter name"
  value       = "${local.backend_ssm_prefix}/oauth.google.client-secret"
}

output "backend_kakao_oauth_client_id_parameter_name" {
  description = "Backend Kakao OAuth client ID parameter name"
  value       = "${local.backend_ssm_prefix}/oauth.kakao.client-id"
}

output "backend_kakao_oauth_client_secret_parameter_name" {
  description = "Backend Kakao OAuth client secret parameter name"
  value       = "${local.backend_ssm_prefix}/oauth.kakao.client-secret"
}

output "ai_gemini_api_key_parameter_name" {
  description = "AI Gemini API key parameter name"
  value       = "${local.ai_ssm_prefix}/GEMINI_API_KEY"
}

output "monitoring_alert_topic_arn" {
  description = "SNS topic ARN for CloudWatch monitoring alerts"
  value       = aws_sns_topic.monitoring_alerts.arn
}

output "monitoring_alert_formatter_function_name" {
  description = "Lambda function name for readable monitoring alert emails"
  value       = aws_lambda_function.monitoring_alert_formatter.function_name
}

output "image_processor_function_name" {
  description = "Lambda function name for uploaded image WebP conversion"
  value       = aws_lambda_function.image_processor.function_name
}
