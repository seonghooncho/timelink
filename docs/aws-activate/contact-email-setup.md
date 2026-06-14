# Contact Email Setup

## 근본 목적

Timelink의 공개 연락처 `contact@timelink.cloud`를 AWS SES 기반 수신 주소로 구성해 AWS Activate 신청과 운영 문의 대응에 사용할 수 있게 한다.

## 비목적

이 문서는 개인 메일함 주소, AWS 비밀값, Cloudflare API 토큰, 결제 정보, MFA 코드, 또는 운영 secret을 저장하기 위한 문서가 아니다.

## AWS Resources

- Region: `us-east-1`
- SES domain identity: `timelink.cloud`
- SES receipt rule set: `timelink-contact-rule-set`
- SES receipt rule: `contact-timelink-cloud`
- Recipient: `contact@timelink.cloud`
- S3 bucket: `timelink-contact-inbound-160885253413-us-east-1`
- S3 object prefix: `inbound/contact/`
- S3 retention: 180 days
- Lambda function: `timelink-contact-forwarder`
- Lambda role: `timelink-contact-forwarder-role`
- Forward target: configured in the Lambda environment, not stored in this repository.

## Cloudflare DNS Records

Add these records in Cloudflare DNS for `timelink.cloud`. Keep web-serving records unchanged.

| Type | Name | Content | Priority | Proxy |
| --- | --- | --- | --- | --- |
| MX | `@` | `inbound-smtp.us-east-1.amazonaws.com` | `2` | DNS only |
| CNAME | `wzij45sa2o62e4udoswoidjw3rxmjct7._domainkey` | `wzij45sa2o62e4udoswoidjw3rxmjct7.dkim.amazonses.com` | n/a | DNS only |
| CNAME | `sgubqly4xywuvk4jjhc2bgimdqswnp7n._domainkey` | `sgubqly4xywuvk4jjhc2bgimdqswnp7n.dkim.amazonses.com` | n/a | DNS only |
| CNAME | `dyc6ninpnhjt3srymswzi6dcneufdim3._domainkey` | `dyc6ninpnhjt3srymswzi6dcneufdim3.dkim.amazonses.com` | n/a | DNS only |
| TXT | `@` | `v=spf1 include:amazonses.com ~all` | n/a | DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=none` | n/a | DNS only |

Cloudflare may display the full record name after saving, for example `wzij45sa2o62e4udoswoidjw3rxmjct7._domainkey.timelink.cloud`.

## Manual Steps

1. Open Cloudflare DNS for `timelink.cloud`.
2. Add the MX, CNAME, SPF TXT, and DMARC TXT records above.
3. Open the SES verification email sent to the forwarding mailbox and click the verification link.
4. Wait for SES identity verification to become `SUCCESS`.
5. Send a test email to `contact@timelink.cloud`.
6. Confirm the raw email object appears in S3 and the forwarded message arrives in the forwarding mailbox.

## Verification Commands

```sh
aws sesv2 get-email-identity --email-identity timelink.cloud --region us-east-1
aws sesv2 get-email-identity --email-identity <forwarding-email> --region us-east-1
aws ses describe-active-receipt-rule-set --region us-east-1
aws lambda get-function-configuration --function-name timelink-contact-forwarder --region us-east-1
```

Use DNS-over-HTTPS or a DNS lookup tool to confirm the public records after Cloudflare propagation.
