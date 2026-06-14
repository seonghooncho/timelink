# Timelink Playwright Serverless Tests

## 근본 목적

운영 API와 실제 브라우저 UI를 함께 열어 그룹 조율, 모임 약속 참여/미참여 노출, 프로필 표시, 모바일 오버플로우, 일정 duration 계약, 입력 길이 경계, 이미지 업로드 검증, 알림 설정 흐름이 배포 환경에서 깨지지 않는지 확인합니다.

## 비목적

이 문서는 전체 E2E 테스트 전략을 설명하지 않으며, 테스트 데이터 cleanup 없이 운영 API에 반복 실행하는 것을 권장하지 않습니다.

## 실행

```sh
export TIMELINK_RUN_ID=tl-load-playwright-$(date -u +%Y%m%dT%H%M%SZ)
export TIMELINK_JWT_SECRET="$(aws ssm get-parameter \
  --name /planner/prod/backend/jwt.secret \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text)"

npm run test:playwright
node test/scripts/cleanup-load-test.mjs "$TIMELINK_RUN_ID"
```

실패해도 cleanup은 반드시 실행합니다. 테스트 데이터는 `TIMELINK_RUN_ID`를 포함하도록 생성됩니다.
