# Timelink k6 Load Tests

## 근본 목적

운영 API가 현재 서버리스 구조에서 어느 지점부터 지연, throttling, 오류를 보이는지 확인하기 위한 재현 가능한 k6 시나리오입니다.

## 비목적

이 문서는 전체 성능 튜닝 절차를 설명하지 않으며, 테스트 데이터 cleanup 없이 운영 API에 부하를 반복 실행하는 것을 권장하지 않습니다.

## 실행 전 환경변수

```sh
export TIMELINK_API_BASE=https://timelink.cloud/api/planner/v1
export TIMELINK_RUN_ID=tl-load-$(date -u +%Y%m%dT%H%M%SZ)
export TIMELINK_JWT_SECRET="$(aws ssm get-parameter \
  --name /planner/prod/backend/jwt.secret \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)"
```

CloudWatch metric을 같이 모으려면 API Gateway와 CloudFront ID를 추가합니다.

```sh
export TIMELINK_API_GATEWAY_ID=<http-api-id>
export TIMELINK_API_GATEWAY_STAGE='$default'
export TIMELINK_CLOUDFRONT_DISTRIBUTION_ID=<distribution-id>
```

## 프로필

| 프로필 | 목적 | 기본 구성 |
| --- | --- | --- |
| `smoke_prod` | 운영 API 기본 경로 확인 | 6명, 2 VU, 30초 |
| `baseline_20vu` | 운영 초기 혼합 트래픽 기준선 | 24명, 20 VU, 5분 |
| `reserved_limit_50vu` | API Lambda reserved concurrency 50 근처 확인 | 60명, 50 VU, 5분 |
| `probe_75vu_short` | 짧은 초과 probe | 80명, 75 VU, 90초 |
| `group_scale_read` | 큰 모임 상세/멤버/게시글/조율 조회 확인 | 50명 모임, 30 VU, 3분 |
| `coordination_heatmap_scale` | 조율 상세 heatmap 응답 전체 조회 병목 확인 | 50명 응답, 30 VU, 3분 |
| `community_group_post_mix` | 커뮤니티/모임 게시판 읽기/댓글/좋아요 확인 | 40명, 25 VU, 3분 |
| `write_burst_schedule_notification` | 일정 생성/완료/알림 설정 write burst 확인 | 30명, 20 VU, 3분 |

기존 이름 `smoke`, `baseline`, `quota_probe`는 각각 `smoke_prod`, `baseline_20vu`, `probe_75vu_short` alias로 남겨둡니다.

## 실행

프로필마다 다른 `TIMELINK_RUN_ID`를 쓰고, 실행 직후 cleanup합니다. 같은 run id를 여러 프로필에 재사용하면 데이터 규모가 섞여 결과 해석이 어려워집니다.

```sh
mkdir -p test-results/k6 test-results/aws test-results/cleanup

PROFILE=smoke_prod
RUN_ID=tl-load-${PROFILE}-$(date -u +%Y%m%dT%H%M%SZ)
START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
k6 run --summary-export "test-results/k6/${RUN_ID}.json" \
  -e TIMELINK_JWT_SECRET="$TIMELINK_JWT_SECRET" \
  -e TIMELINK_RUN_ID="$RUN_ID" \
  -e TIMELINK_LOAD_PROFILE="$PROFILE" \
  test/k6/timelink-load-test.js
END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
node test/scripts/collect-aws-metrics.mjs "$START" "$END" > "test-results/aws/${RUN_ID}.json"
node test/scripts/cleanup-load-test.mjs "$RUN_ID" > "test-results/cleanup/${RUN_ID}.json"
```

권장 실행 순서는 `smoke_prod` → Playwright → `baseline_20vu` → `reserved_limit_50vu` → 규모별 세부 프로필 → `probe_75vu_short`입니다. `probe_75vu_short`에서 5xx나 Lambda throttle이 급증하면 즉시 중단합니다.

## 판단 기준

- HTTP 실패율 1% 미만
- API p95 2초 미만
- API p99 7초 미만
- Lambda throttle 0 또는 일시적 소량
- DynamoDB throttle 0
- cleanup 후 테스트 데이터와 Scheduler 잔여 없음

## 정리

테스트 후 cleanup은 반드시 실행합니다.

```sh
node test/scripts/cleanup-load-test.mjs "$TIMELINK_RUN_ID"
```
