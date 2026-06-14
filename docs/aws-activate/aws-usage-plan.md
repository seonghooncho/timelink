# AWS Usage Plan For Timelink

## 근본 목적

AWS Activate credits를 Timelink의 초기 운영 안정성, 비용 통제, 사용자 검증 속도 향상에 직접 연결해 신청 답변과 실제 운영 계획이 일치하도록 한다.

## 비목적

이 문서는 무제한 확장, 고비용 실험, 비밀값 저장, 운영 AWS 리소스 즉시 생성, 또는 배포 자동화를 정당화하기 위한 문서가 아니다.

## Current Product Context

Timelink is already live at https://timelink.cloud/ as a web/PWA. The early architecture should stay simple, observable, and inexpensive while the product validates group schedule coordination workflows.

## Credit Usage Priorities

1. Keep the live web/PWA reliable.
2. Store and deliver static assets and user-uploaded images.
3. Run backend/API workloads with serverless or managed services where possible.
4. Support scheduled notifications and background jobs.
5. Improve production observability with logs, metrics, alarms, and tracing where useful.
6. Experiment with AI-assisted schedule extraction only behind strict cost controls.

## Early-Stage Architecture Options

### Option A: Current Serverless-Leaning Stack

- Static frontend on S3 with CloudFront and DNS/CDN routing.
- API Gateway and Lambda for backend/API entry points where suitable.
- DynamoDB for serverless persistence when access patterns are simple.
- S3 for image/object storage.
- EventBridge Scheduler for reminders and scheduled jobs.
- CloudWatch logs, metrics, and alarms for production visibility.
- SSM Parameter Store for non-secret configuration references and runtime config prefixes.

Use this while traffic is small and operational simplicity matters more than deep infrastructure control.

### Option B: Managed Container Or Compute Migration

- Keep CloudFront/S3 for frontend delivery.
- Move heavier backend workloads to ECS/Fargate, App Runner, or Elastic Beanstalk if Lambda limits become awkward.
- Keep S3 for object storage and CloudWatch for logs/metrics.
- Use RDS only if relational consistency becomes necessary and cost is justified.

Use this only after serverless limits or operational complexity become concrete.

### Option C: AI Extraction Experiments

- Run OCR or AI schedule extraction as an asynchronous workflow.
- Store uploaded images in S3 and process through Lambda or a queued worker.
- Start with strict per-request limits, file-size limits, and rate limits.
- Avoid open-ended model calls, GPU instances, or always-on high-cost compute during MVP/beta.

Use this only when product usage shows schedule extraction is important enough to justify spend.

## Cost-Control Recommendations

### AWS Budgets

Create a monthly cost budget for the Timelink AWS account and configure alerts before usage grows. AWS Budgets can track cost and usage and send notifications when actual or forecasted spend approaches thresholds.

Recommended starting alerts:

- 50 percent of monthly budget
- 80 percent of monthly budget
- 100 percent of monthly budget
- Forecasted spend above monthly budget

Official reference: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html

### Cost Anomaly Detection

Enable AWS Cost Anomaly Detection to detect unusual spend patterns. AWS notes that detection uses billing data with delay, so it should complement budgets rather than replace service-level limits.

Official reference: https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html

### Resource Tagging

Tag cost-accruing resources consistently. Do not put personal data or secrets in tags.

Recommended tags:

- `Project=Timelink`
- `Environment=prod` or `Environment=dev`
- `Owner=founder`
- `ManagedBy=terraform` where applicable
- `CostCenter=timelink`

Official reference: https://docs.aws.amazon.com/tag-editor/latest/userguide/tagging.html

### Dev/Prod Separation

Use separate environments when production traffic and experiments start to diverge.

- Keep production stable and low-risk.
- Put AI/OCR experiments in a separate dev or staging environment.
- Use lower limits for non-production workloads.
- Avoid sharing production storage buckets with experimental processing unless access policies are clear.

### Avoid Accidental High-Cost Services

Do not start always-on high-cost resources unless a concrete product need exists.

- Avoid large EC2 instances, GPU instances, NAT Gateway-heavy designs, OpenSearch clusters, and provisioned databases during early validation.
- Avoid unrestricted AI/model calls.
- Prefer serverless/on-demand services with explicit quotas and alarms.
- Review CloudWatch log retention so logs do not grow indefinitely.
- Add lifecycle rules for temporary image/object storage where appropriate.

## Domain Email Plan

The intended public contact address is `contact@timelink.cloud`.

Do not use Amazon WorkMail for a new mailbox. AWS documentation states that Amazon WorkMail will no longer accept new customers beginning April 30, 2026 and support ends March 31, 2027.

Official reference: https://docs.aws.amazon.com/workmail/latest/adminguide/workmail-end-of-support.html

Use Amazon SES instead:

- Verify `timelink.cloud` as an SES identity.
- Add SES DKIM/SPF/DMARC records in Cloudflare DNS.
- Configure SES email receiving in `us-east-1`.
- Route incoming email to S3 and a Lambda forwarding workflow.
- Request SES production access before relying on outbound mail to unverified recipients.

Official reference: https://docs.aws.amazon.com/ses/latest/dg/receiving-email.html

Current AWS resources for the contact email setup are documented in `docs/aws-activate/contact-email-setup.md`.

Suggested AWS CLI verification commands:

```sh
aws sesv2 get-email-identity --email-identity timelink.cloud --region us-east-1
aws ses describe-active-receipt-rule-set --region us-east-1
```

DNS records returned by AWS must be added in the authoritative DNS provider before the identity becomes usable.

## Application Answer Summary

Use this concise English answer in the AWS application if asked how AWS will be used:

```text
AWS credits will support production hosting, object storage, serverless backend workloads, image handling, scheduled notifications, monitoring, and future AI-assisted schedule extraction experiments. Timelink will use AWS Budgets, Cost Anomaly Detection, resource tagging, and environment separation to keep early-stage infrastructure cost controlled.
```
