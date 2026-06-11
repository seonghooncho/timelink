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

## 실행

프로필별 데이터가 서로 영향을 주지 않도록 `smoke`, `baseline`, `quota_probe`는 가능하면 서로 다른 `TIMELINK_RUN_ID`로 실행하고 각 실행 직후 cleanup을 수행합니다.

```sh
k6 run --summary-export "test-results/k6/${TIMELINK_RUN_ID}-smoke.json" \
  -e TIMELINK_JWT_SECRET="$TIMELINK_JWT_SECRET" \
  -e TIMELINK_RUN_ID="$TIMELINK_RUN_ID" \
  -e TIMELINK_LOAD_PROFILE=smoke \
  test/k6/timelink-load-test.js

k6 run --summary-export "test-results/k6/${TIMELINK_RUN_ID}-baseline.json" \
  -e TIMELINK_JWT_SECRET="$TIMELINK_JWT_SECRET" \
  -e TIMELINK_RUN_ID="$TIMELINK_RUN_ID" \
  -e TIMELINK_LOAD_PROFILE=baseline \
  test/k6/timelink-load-test.js

k6 run --summary-export "test-results/k6/${TIMELINK_RUN_ID}-quota-probe.json" \
  -e TIMELINK_JWT_SECRET="$TIMELINK_JWT_SECRET" \
  -e TIMELINK_RUN_ID="$TIMELINK_RUN_ID" \
  -e TIMELINK_LOAD_PROFILE=quota_probe \
  test/k6/timelink-load-test.js
```

## 프로필

- `smoke`: 배포/인증/기본 API가 깨지지 않았는지 확인합니다.
- `baseline`: Lambda 동시성 10 기준으로 운영 초기 예상 혼합 트래픽을 검증합니다.
- `quota_probe`: 동시성 10을 넘는 짧은 probe로 throttling과 오류 양상을 확인합니다.

## 정리

테스트 후 아래 cleanup을 반드시 실행합니다.

```sh
node test/scripts/cleanup-load-test.mjs "$TIMELINK_RUN_ID"
```
