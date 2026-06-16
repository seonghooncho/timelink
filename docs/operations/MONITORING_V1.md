# Timelink 모니터링 v1

## 근본 목적

운영 초기의 저비용 구조를 유지하면서, 부하테스트에서 드러난 Lambda throttle, API 지연, DynamoDB scan 재발 같은 장애 징후를 이메일과 Discord에서 빠르게 이해하고 놓치지 않게 하는 것이 목적입니다.

## 비목적

이 문서는 APM, 분산 추적, 사용자 행동 분석, 고도화된 SLO 체계를 완성하는 문서가 아닙니다. 운영 초기에는 CloudWatch 기본 지표, SNS, Lambda formatter, SES, Discord webhook만 사용하고, 트래픽이 늘어날 때 구조를 확장합니다.

## 문서 기준

- 버전: 모니터링 v1
- 기준일: 2026-06-14
- 기준 환경: AWS account `160885253413`, region `ap-northeast-2`, 운영 도메인 `https://timelink.cloud`
- 근거 문서: [부하테스트 결과 v2](../testing/LOAD_TEST_REPORT_V2.md), [확장 로드맵](../architecture/SCALING_ROADMAP.md)

## 현재 모니터링 구조

Terraform `infra/terraform/minimum/monitoring.tf`에서 아래 리소스를 관리합니다.

| 영역 | 리소스 |
| --- | --- |
| 알림 채널 | SNS topic `planner-prod-monitoring-alerts` |
| 읽기용 알림 | Lambda `planner-prod-monitoring-alert-formatter` -> SES 요약 이메일 + Discord webhook |
| 백업 알림 | SNS email-json subscription `sunghuncho127@gmail.com` |
| 지표/알람 | CloudWatch metric alarm |
| 비용 구조 | CloudWatch 기본 지표 + SNS/Lambda/SES/Discord webhook 중심의 저비용 구조 |

CloudWatch 알람은 SNS topic으로 발행되고, formatter Lambda가 원본 JSON을 운영 요약으로 변환해 SES 이메일을 먼저 발송한 뒤 Discord webhook으로도 보냅니다. Discord webhook URL은 코드에 두지 않고 SSM SecureString `/planner/prod/monitoring/discord_webhook_url`에 저장합니다. 파라미터가 없거나 Discord 전송이 실패해도 이메일 발송은 실패 처리하지 않습니다.

SES가 sandbox 상태이면 `monitoring_alert_email`로 지정한 이메일 identity가 인증되어 있어야 발송됩니다. 기존 SNS email-json 구독은 formatter 장애나 SES 인증 문제를 대비한 백업 경로로 당분간 유지합니다. formatter 이메일과 Discord 알림이 실제 운영에서 확인되면 raw JSON 백업 구독은 제거하거나 별도 백업 주소로 분리합니다.

## 로그와 요청 추적

| 영역 | 기준 |
| --- | --- |
| API Lambda log group | `/aws/lambda/planner-prod-api`, retention 14일 |
| Notification worker log group | `/aws/lambda/planner-prod-notification-worker`, retention 14일 |
| API Gateway access log group | `/aws/apigateway/planner-prod`, retention 14일 |
| Image processor log group | `/aws/lambda/planner-prod-image-processor`, retention 14일 |
| Formatter log group | `/aws/lambda/planner-prod-monitoring-alert-formatter`, retention 14일 |
| Backend log level | `com.planner=INFO`, `software.amazon.awssdk=WARN`, `com.amazonaws.serverless.proxy=WARN` |

API 요청은 `X-Request-Id`가 있으면 재사용하고 없으면 생성합니다. 응답에도 같은 `X-Request-Id`를 반환하며, 완료 로그는 `http_request_completed requestId=... method=... path=... status=... durationMs=...` 형태로 남깁니다.

로그에는 Authorization header, JWT/OAuth/refresh token, request/response body 전체, 이메일, 전화번호, 초대코드 원문을 남기지 않습니다. path는 가능한 route template을 사용하고, fallback에서도 invite code와 주요 id segment를 마스킹합니다. AWS serverless container의 원문 access log는 `WARN`으로 낮추고, 서버 예외는 `ERROR` stack trace로 CloudWatch Logs에 남깁니다.

관리자 대시보드의 `/admin/analytics`에는 날짜별 느린 API 섹션도 제공합니다. API Lambda가 `/api/planner/v1/**` 요청을 완료한 뒤 route template 단위로 DynamoDB histogram을 갱신하고, summary API가 p50/p95/평균/호출 수/4xx/5xx count를 계산합니다. `/api/planner/v1/analytics/track` 자체는 page_view마다 호출되어 노이즈가 크므로 이 latency 집계에서는 제외합니다.

## 알람 기준

| 알람 | 기준 | 이유 |
| --- | --- | --- |
| API Lambda Errors | 1분 내 1건 이상 | 사용자 요청 실패의 직접 신호입니다. |
| API Lambda Throttles | 1분 내 1건 이상 | 75 VU probe에서 reserved concurrency 50에 닿자 실제 throttle이 발생했습니다. |
| Notification worker Errors/Throttles | 1분 내 1건 이상 | 일정/리마인드 푸시 누락을 빠르게 확인합니다. |
| AI Lambda Errors/Throttles | 1분 내 1건 이상 | AI 기능이 API와 별도 Lambda라 별도 감시합니다. |
| API Lambda p95 Duration | 5분 p95 3초 초과가 2회 연속 | Lambda 내부 처리 지연을 잡습니다. |
| API Gateway 5xx | 1분 내 1건 이상 | Lambda 밖의 API 경로 문제까지 확인합니다. |
| API Gateway p95 Latency | 5분 p95 5초 초과가 2회 연속 | 사용자가 체감하는 API 지연을 잡습니다. |
| DynamoDB Read/Write ThrottleEvents | 1분 내 1건 이상 | 온디맨드라도 burst/계정 한계나 hot partition을 감지합니다. |
| DynamoDB Scan ReturnedItemCount | 5분 단위 2회 연속 1건 이상 | 앱 코드에서 scan이 재발하면 비용과 지연이 급증할 수 있습니다. |

## 이번 코드 개선과 연결되는 지표

- 그룹 초대코드는 `INVITE#code` 직접 조회로 변경해 join 시 DynamoDB scan을 제거합니다.
- 기존 운영 데이터는 `scripts/ops/backfill-dynamodb-metadata.mjs`로 invite mapping, `memberCount`, `responseCount`를 백필합니다.
- 그룹 목록은 `memberCount`와 그룹 metadata batch get을 사용하고, 조율 목록은 `responseCount`를 우선 사용해 목록 조회마다 하위 아이템 전체를 읽지 않습니다.
- PWA 설치 유도는 핵심 플로우와 닫기 후 7일 동안 숨겨 Playwright에서 확인된 클릭 차단 문제를 줄입니다.

## 운영 확인 방법

Terraform 적용:

```sh
cd infra/terraform/minimum
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

현재 운영 state 정합성 정리 전에는 full plan에 Cloudflare/custom-domain 변경이 섞이면 적용하지 않습니다. 모니터링만 수정할 때는 plan에서 생성/변경/삭제 범위를 확인한 뒤 모니터링 리소스만 target apply 합니다.

SNS 구독 상태 확인:

```sh
aws sns list-subscriptions-by-topic \
  --topic-arn "$(terraform output -raw monitoring_alert_topic_arn)"
```

Discord webhook URL 저장:

```sh
aws ssm put-parameter \
  --region ap-northeast-2 \
  --name /planner/prod/monitoring/discord_webhook_url \
  --type SecureString \
  --value '<discord-webhook-url>' \
  --overwrite
```

SES identity 인증 상태 확인:

```sh
aws sesv2 get-email-identity \
  --region ap-northeast-2 \
  --email-identity sunghuncho127@gmail.com \
  --query '{IdentityType:IdentityType,VerifiedForSendingStatus:VerifiedForSendingStatus}'
```

Formatter Lambda 테스트:

```sh
cd infra/terraform/minimum
python3 -m unittest discover -s functions/monitoring-alert-formatter -p 'test_*.py'

aws lambda invoke \
  --function-name "$(terraform output -raw monitoring_alert_formatter_function_name)" \
  --cli-binary-format raw-in-base64-out \
  --payload file://functions/monitoring-alert-formatter/fixtures/cloudwatch-alarm-sns-event.json \
  /tmp/timelink-monitoring-alert-test.json
```

Logs Insights 시작 쿼리:

```sql
fields @timestamp, @message
filter @message like /requestId|http_request_completed|ERROR|Exception/
sort @timestamp desc
limit 50
```

알람 확인:

```sh
aws cloudwatch describe-alarms \
  --alarm-name-prefix planner-prod \
  --query 'MetricAlarms[?contains(AlarmName, `lambda`) || contains(AlarmName, `dynamodb`) || contains(AlarmName, `api-gateway`)].{Name:AlarmName,State:StateValue}'
```

배포 전 백필 dry-run:

```sh
npm run ops:backfill-metadata -- --dry-run
```

배포 시 실제 백필:

```sh
npm run ops:backfill-metadata -- --fix-duplicate-invites
```

## 한계와 다음 개선 시점

- SES/Discord 알림은 확인과 대응 자동화가 없습니다. 알림이 하루 3회 이상 반복되면 Incident Manager 같은 대응 흐름을 검토합니다.
- SES sandbox 상태에서는 인증된 주소로만 보낼 수 있습니다. 운영 알림 수신자를 늘리거나 도메인 발신 품질을 높일 때는 `timelink.cloud` 도메인 identity와 DKIM/SPF/DMARC를 Terraform/Cloudflare로 관리합니다.
- CloudWatch 기본 지표는 Lambda/API Gateway 전체 p95만 보여줍니다. 어떤 API가 느린지는 관리자 대시보드의 route별 histogram으로 먼저 확인하고, 원인 분석이 더 필요하면 구조화 로그와 CloudWatch Logs Insights 쿼리를 함께 사용합니다.
- Lambda throttle이 운영 중 1회라도 재발하면 예약 동시성/계정 동시성/비동기 큐 분리 여부를 검토합니다.
- DynamoDB scan 알람이 앱 트래픽 중 울리면 해당 repository 경로를 즉시 query/get 기반으로 바꿉니다.
- 그룹당 멤버 수가 100명 이상이거나 조율당 응답 슬롯이 1,000개 이상으로 늘면 counter cache만으로 부족하므로 집계 아이템 또는 스트림 기반 비동기 집계로 전환합니다.
- 현재 `infra/terraform/minimum` state에는 과거 Cloudflare/custom-domain 리소스가 남아 있어 Cloudflare 토큰 없이 full `terraform plan`이 실패할 수 있습니다. 다음 인프라 정비 때 state와 configuration 정합성을 맞춘 뒤 target apply 없이 운영할 수 있게 만듭니다.
