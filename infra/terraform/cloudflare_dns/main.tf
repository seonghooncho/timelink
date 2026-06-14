terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.52"
    }
  }

  backend "s3" {}
}

provider "cloudflare" {}

locals {
  records = {
    apex = {
      name    = var.zone_name
      type    = "CNAME"
      value   = var.cloudfront_domain
      ttl     = 1
      proxied = true
    }
    www = {
      name    = "www"
      type    = "CNAME"
      value   = var.cloudfront_domain
      ttl     = 1
      proxied = true
    }
    acm_apex = {
      name    = "_930097219508cac473434ac7471ae54d"
      type    = "CNAME"
      value   = "_dea4ed1a281c19af69fd7282c5b5c3cd.jkddzztszm.acm-validations.aws"
      ttl     = 1
      proxied = false
    }
    acm_www = {
      name    = "_ad5f8bf5ef9e11381fcc0f735b706961.www"
      type    = "CNAME"
      value   = "_a856be3dd1f8210c9bc77a6d34aefaf2.jkddzztszm.acm-validations.aws"
      ttl     = 1
      proxied = false
    }
    ses_mx = {
      name     = var.zone_name
      type     = "MX"
      value    = "inbound-smtp.us-east-1.amazonaws.com"
      ttl      = 1
      proxied  = false
      priority = 2
    }
    ses_dkim_wzij = {
      name    = "wzij45sa2o62e4udoswoidjw3rxmjct7._domainkey"
      type    = "CNAME"
      value   = "wzij45sa2o62e4udoswoidjw3rxmjct7.dkim.amazonses.com"
      ttl     = 1
      proxied = false
    }
    ses_dkim_sgub = {
      name    = "sgubqly4xywuvk4jjhc2bgimdqswnp7n._domainkey"
      type    = "CNAME"
      value   = "sgubqly4xywuvk4jjhc2bgimdqswnp7n.dkim.amazonses.com"
      ttl     = 1
      proxied = false
    }
    ses_dkim_dyc = {
      name    = "dyc6ninpnhjt3srymswzi6dcneufdim3._domainkey"
      type    = "CNAME"
      value   = "dyc6ninpnhjt3srymswzi6dcneufdim3.dkim.amazonses.com"
      ttl     = 1
      proxied = false
    }
    ses_spf = {
      name    = var.zone_name
      type    = "TXT"
      value   = "v=spf1 include:amazonses.com ~all"
      ttl     = 1
      proxied = false
    }
    ses_dmarc = {
      name    = "_dmarc"
      type    = "TXT"
      value   = "v=DMARC1; p=none"
      ttl     = 1
      proxied = false
    }
  }
}

resource "cloudflare_record" "records" {
  for_each = local.records

  zone_id  = var.cloudflare_zone_id
  name     = each.value.name
  type     = each.value.type
  value    = each.value.value
  ttl      = each.value.ttl
  proxied  = each.value.proxied
  priority = try(each.value.priority, null)
}
