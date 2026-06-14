# Cloudflare DNS Terraform Stack

## 근본 목적

Timelink 운영 도메인 `timelink.cloud`의 Cloudflare DNS 레코드를 Terraform 상태에서 추적해, 웹 연결, ACM 인증, SES 메일 수신 레코드를 재현 가능하게 관리한다.

## 비목적

Cloudflare API 토큰, AWS secret, 결제정보, MFA 코드 같은 비밀값을 Git이나 SSM에 저장하는 것이 목적이 아니다. 이미 존재하는 운영 DNS 레코드를 import 없이 새로 생성하거나 삭제하는 것도 목적이 아니다.

## 관리 대상

이 스택은 현재 운영 DNS 레코드를 코드로 표현한다.

- Apex and `www` CNAME records to CloudFront
- Existing AWS ACM validation CNAME records
- Amazon SES receiving MX record
- Amazon SES DKIM CNAME records
- SPF and DMARC TXT records

## SSM 사용 여부

DNS 레코드 값은 SSM Parameter Store에 중복 저장하지 않는다. DNS의 source of truth는 Terraform code + Terraform state로 둔다.

Cloudflare API token은 secret이므로 SSM에 커밋 가능한 일반 설정처럼 저장하지 않는다. 로컬에서는 `CLOUDFLARE_API_TOKEN` 환경변수로 주입하고, CI에서 실행한다면 CI secret으로 주입한다.

## 초기화

```sh
cd infra/terraform/cloudflare_dns
cp backend.hcl.example backend.hcl
terraform init -backend-config=backend.hcl
```

`cloudflare_zone_id`는 Cloudflare dashboard의 domain overview에서 확인한 뒤 로컬 `terraform.tfvars` 또는 환경변수로 넣는다.

```sh
export CLOUDFLARE_API_TOKEN='...'
export TF_VAR_cloudflare_zone_id='...'
```

## 기존 레코드 Import

이미 Cloudflare에 존재하는 레코드이므로 첫 apply 전에 import가 필요하다. 레코드 ID는 Cloudflare dashboard/API에서 확인한다.

Import 형식:

```sh
terraform import 'cloudflare_record.records["apex"]' '<zone_id>/<record_id>'
terraform import 'cloudflare_record.records["www"]' '<zone_id>/<record_id>'
terraform import 'cloudflare_record.records["acm_apex"]' '<zone_id>/<record_id>'
terraform import 'cloudflare_record.records["acm_www"]' '<zone_id>/<record_id>'
terraform import 'cloudflare_record.records["ses_mx"]' '<zone_id>/<record_id>'
terraform import 'cloudflare_record.records["ses_dkim_wzij"]' '<zone_id>/<record_id>'
terraform import 'cloudflare_record.records["ses_dkim_sgub"]' '<zone_id>/<record_id>'
terraform import 'cloudflare_record.records["ses_dkim_dyc"]' '<zone_id>/<record_id>'
terraform import 'cloudflare_record.records["ses_spf"]' '<zone_id>/<record_id>'
terraform import 'cloudflare_record.records["ses_dmarc"]' '<zone_id>/<record_id>'
```

Import 후에는 반드시 plan에서 삭제/교체가 없는지 확인한다.

```sh
terraform plan
```

## Apply

```sh
npm run infra:cloudflare-dns:plan
npm run infra:cloudflare-dns:apply
```

운영 DNS 변경이므로 plan에서 의도하지 않은 delete/replace가 있으면 apply하지 않는다.
