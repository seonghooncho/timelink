variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for timelink.cloud. Pass with TF_VAR_cloudflare_zone_id or local terraform.tfvars."
  type        = string
}

variable "zone_name" {
  description = "Cloudflare DNS zone name."
  type        = string
  default     = "timelink.cloud"
}

variable "cloudfront_domain" {
  description = "CloudFront distribution domain used by the apex and www CNAME records."
  type        = string
  default     = "d31yt03ijaevlb.cloudfront.net"
}
