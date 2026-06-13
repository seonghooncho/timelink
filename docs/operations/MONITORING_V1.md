# Timelink 모니터링 v1

## 근본 목적

운영 초기의 저비용 구조를 유지하면서, 부하테스트에서 드러난 Lambda throttle, API 지연, DynamoDB scan 재발 같은 장애 징후를 빠르게 확인하고 이메일 알림으로 놓치지 않게 하는 것이 목적입니다.

## 비목적

이 문서는 APM, 분산 추적, 사용자 행동 분석, 고도화된 SLO 체계를 완성하는 문서가 아닙니다. 운영 초기에는 CloudWatch 기본 지표와 SNS 이메일 알림만 사용하고, 트래픽이 늘어날 때 구조를 확장합니다.

## 문서 기준

- 버전: 모니터링 v1
- 기준일: 2026-06-12
- 기준 환경: AWS account `160885253413`, region `ap-northeast-2`, 운영 도메인 `https://timelink.cloud`
- 근거 문서: [부하테스트 결과](../testing/LOAD_TEST_REPORT.md), [확장 로드맵](../architecture/SCALING_ROADMAP.md)

## 현재 모니터링 구조

Terraform `infra/terraform/minimum/monitoring.tf`에서 아래 리소스를 관리합니다.

| 영역 | 리소스 |
| --- | --- |
| 알림 채널 | SNS topic `planner-prod-monitoring-alerts` |
| 읽기용 알림 | Lambda `planner-prod-monitoring-alert-formatter` -> SES 한글 이메일 |
| 백업 알림 | SNS email-json subscription `sunghuncho127@gmail.com` |
| 지표/알람 | CloudWatch metric alarm |
| 비용 구조 | CloudWatch 기본 지표 + SNS/Lambda/SES 중심의 저비용 구조 |

CloudWatch 알람은 SNS topic으로 발행되고, formatter Lambda가 원본 JSON을 한글 요약 메일로 변환해 SES로 발송합니다. SES가 sandbox 상태이면 `monitoring_alert_email`로 지정한 이메일 identity가 인증되어 있어야 발송됩니다. 기존 SNS email-json 구독은 formatter 장애나 SES 인증 문제를 대비한 백업 경로로 유지합니다.

## 알람 기준

| 알람 | 기준 | 이유 |
| --- | --- | --- |
| API Lambda Errors | 1분 내 1건 이상 | 사용자 요청 실패의 직접 신호입니다. |
| API Lambda Throttles | 1분 내 1건 이상 | 부하테스트 quota probe에서 실제로 throttle이 발생했습니다. |
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

SES identity 인증 상태 확인:

```sh
aws sesv2 get-email-identity \
  --region ap-northeast-2 \
  --email-identity sunghuncho127@gmail.com \
  --query '{IdentityType:IdentityType,VerifiedForSendingStatus:VerifiedForSendingStatus}'
```

Formatter Lambda 테스트:

```sh
aws lambda invoke \
  --function-name "$(terraform output -raw monitoring_alert_formatter_function_name)" \
  --cli-binary-format raw-in-base64-out \
  --payload file://test/fixtures/cloudwatch-alarm-sns-event.json \
  /tmp/timelink-monitoring-alert-test.json
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

- SES 이메일은 확인과 대응 자동화가 없습니다. 알림이 하루 3회 이상 반복되면 Slack/Discord webhook 또는 Incident Manager로 전환합니다.
- SES sandbox 상태에서는 인증된 주소로만 보낼 수 있습니다. 운영 알림 수신자를 늘리거나 도메인 발신 품질을 높일 때는 `timelink.cloud` 도메인 identity와 DKIM/SPF/DMARC를 Terraform/Cloudflare로 관리합니다.
- CloudWatch 기본 지표는 어떤 API가 느린지까지 알려주지 않습니다. API Gateway p95가 2일 연속 2초를 넘거나 5xx가 반복되면 구조화 로그와 CloudWatch Logs Insights 쿼리를 문서화합니다.
- Lambda throttle이 운영 중 1회라도 재발하면 예약 동시성/계정 동시성/비동기 큐 분리 여부를 검토합니다.
- DynamoDB scan 알람이 앱 트래픽 중 울리면 해당 repository 경로를 즉시 query/get 기반으로 바꿉니다.
- 그룹당 멤버 수가 100명 이상이거나 조율당 응답 슬롯이 1,000개 이상으로 늘면 counter cache만으로 부족하므로 집계 아이템 또는 스트림 기반 비동기 집계로 전환합니다.
- 현재 `infra/terraform/minimum` state에는 과거 Cloudflare/custom-domain 리소스가 남아 있어 Cloudflare 토큰 없이 full `terraform plan`이 실패할 수 있습니다. 다음 인프라 정비 때 state와 configuration 정합성을 맞춘 뒤 target apply 없이 운영할 수 있게 만듭니다.
