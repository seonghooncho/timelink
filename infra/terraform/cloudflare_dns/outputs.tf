output "managed_record_keys" {
  description = "Terraform keys for Cloudflare DNS records managed by this stack."
  value       = keys(cloudflare_record.records)
}

output "zone_name" {
  description = "Cloudflare zone name managed by this stack."
  value       = var.zone_name
}
