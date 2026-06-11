# 운영 배포 유의사항

## 근본 목적

운영 배포 시 소셜 로그인, 프론트 캐시, Lambda alias 반영처럼 장애로 이어지기 쉬운 지점을 짧게 확인해 배포 후 기능 깨짐을 줄이는 것이 목적입니다.

## 비목적

이 문서는 전체 인프라 아키텍처 명세가 아니며, Terraform 변경 절차나 장기 배포 자동화 설계를 모두 설명하지 않습니다.

## 문서 기준

- 버전: 운영 배포 참고 v1
- 기준일: 2026-06-12
- 기준 환경: AWS account `160885253413`, region `ap-northeast-2`, 운영 도메인 `https://timelink.cloud`
- 구조가 바뀌면 이 문서의 리소스명과 절차를 먼저 갱신합니다.

## 현행 운영 구조 요약

| 영역 | 현행 구조 |
| --- | --- |
| Frontend | Vite build 산출물을 S3 `planner-frontend-prod-160885253413`에 업로드하고 CloudFront `E6SMS7ZNIN4ZI`가 서빙 |
| API | CloudFront `/api/*`가 API Gateway로 전달되고, API Gateway가 Lambda `planner-prod-api:live` 호출 |
| Notification worker | EventBridge Scheduler가 Lambda `planner-prod-notification-worker:live` 호출 |
| Backend artifact | `backend/build/distributions/planner-backend-0.0.1-SNAPSHOT.zip`을 S3 `planner-lambda-artifacts-prod-160885253413`에 올린 뒤 Lambda code update |
| Runtime config | Lambda는 `APP_CONFIG_PREFIX=/planner/prod/backend` 기준으로 SSM Parameter Store를 읽음 |

운영 헬스체크는 커스텀 도메인 `/health`가 아니라 API Gateway endpoint를 기준으로 확인합니다.

```sh
curl -sS https://sotr621lgc.execute-api.ap-northeast-2.amazonaws.com/health
```

## 소셜 로그인 배포 전 확인

OAuth 설정은 배포 때 가장 자주 깨지는 지점입니다. 프론트 콜백 페이지와 OAuth provider redirect URI를 구분합니다.

| 항목 | 현재 기대값 |
| --- | --- |
| Google provider redirect URI | `https://timelink.cloud/api/planner/v1/auth/oauth/google/callback` |
| Kakao provider redirect URI | `https://timelink.cloud/api/planner/v1/auth/oauth/kakao/callback` |
| 프론트 최종 콜백 페이지 | `https://timelink.cloud/auth/callback` |
| 허용 프론트 origin | `https://timelink.cloud`, `https://www.timelink.cloud` |
| Kakao profile scope | `profile_nickname,profile_image` |

확인 포인트:

- Google/Kakao 개발자 콘솔의 redirect URI가 위 provider redirect URI와 정확히 일치해야 합니다.
- `https://timelink.cloud/auth/callback`은 provider 콘솔 redirect URI가 아닙니다. 백엔드 콜백 후 프론트로 돌려보내는 내부 페이지입니다.
- Kakao에서 닉네임과 프로필 사진을 받으려면 `profile_nickname`, `profile_image` 동의 항목이 앱 설정에 있어야 합니다.
- SSM에는 아래 이름들이 존재해야 합니다. secret 값은 문서나 PR에 쓰지 않습니다.

```text
/planner/prod/backend/oauth.public-api-base-url
/planner/prod/backend/cors.allowed-origins
/planner/prod/backend/oauth.google.client-id
/planner/prod/backend/oauth.google.client-secret
/planner/prod/backend/oauth.kakao.client-id
/planner/prod/backend/oauth.kakao.client-secret
/planner/prod/backend/oauth.kakao.scope
```

비로그인 상태에서 아래 경로가 로그인 화면으로 이어지고, 로그인 후 `/auth/callback#accessToken=...`을 거쳐 원래 경로로 복귀하는지 확인합니다.

```text
https://timelink.cloud/login
https://timelink.cloud/groups
```

## 배포 전 체크리스트

- PR이 `main`에 머지됐고 배포 작업트리가 `origin/main`의 머지 커밋을 바라보는지 확인합니다.
- 백엔드 변경이 있으면 프론트보다 백엔드를 먼저 배포합니다.
- 인증, CORS, 도메인, OAuth, PWA, service worker 변경이 있으면 소셜 로그인과 새 asset 반영을 배포 후 직접 확인합니다.
- routine 코드 배포에는 Terraform apply를 사용하지 않습니다. 인프라 변경이 필요한 경우에만 별도 plan을 검토합니다.
- CloudFront invalidation을 S3 업로드 뒤 반드시 수행합니다.
- 기존 DynamoDB 아이템을 새 메타데이터 구조로 보강해야 하는 변경이면 `npm run ops:backfill-metadata -- --dry-run`으로 영향 범위를 먼저 봅니다.

## 백엔드 배포 방법

Java 21 기준으로 Lambda zip을 빌드합니다.

```sh
cd backend
JAVA_HOME=/home/cho/.cache/codex-jdks/jdk-21 PATH=/home/cho/.cache/codex-jdks/jdk-21/bin:$PATH ./gradlew buildLambdaZip
```

artifact bucket에 업로드한 뒤 두 Lambda를 같은 zip으로 업데이트하고 publish version을 `live` alias에 연결합니다.

```sh
ARTIFACT="backend/build/distributions/planner-backend-0.0.1-SNAPSHOT.zip"
BUCKET="planner-lambda-artifacts-prod-160885253413"
KEY="backend/manual/$(date -u +%Y%m%dT%H%M%SZ)-<merge-sha>-planner-backend.zip"

aws s3 cp "$ARTIFACT" "s3://$BUCKET/$KEY"

for FN in planner-prod-api planner-prod-notification-worker; do
  VERSION=$(aws lambda update-function-code \
    --function-name "$FN" \
    --s3-bucket "$BUCKET" \
    --s3-key "$KEY" \
    --publish \
    --query 'Version' \
    --output text)

  aws lambda wait function-updated --function-name "$FN"
  aws lambda update-alias --function-name "$FN" --name live --function-version "$VERSION"
  aws lambda wait function-active --function-name "$FN:live"
done
```

확인:

```sh
aws lambda get-alias --function-name planner-prod-api --name live
aws lambda get-alias --function-name planner-prod-notification-worker --name live
curl -sS https://sotr621lgc.execute-api.ap-northeast-2.amazonaws.com/health
```

초대코드 매핑, `memberCount`, `responseCount` 같은 기존 데이터 보강이 필요한 배포에서는 백엔드 반영 직후 idempotent 백필을 한 번 실행합니다.

```sh
npm run ops:backfill-metadata -- --fix-duplicate-invites
```

## 프론트 배포 방법

`main`의 배포 대상 커밋에서 빌드합니다. Vite는 JS/CSS asset 파일명에 hash를 붙여 버저닝하므로, `index.html`은 항상 최신을 받게 하고 `/assets/*`는 장기 캐시해도 됩니다.

```sh
npm run fe:build
aws s3 sync fe/dist s3://planner-frontend-prod-160885253413 \
  --delete \
  --exclude 'assets/*' \
  --cache-control 'no-cache'

aws s3 sync fe/dist/assets s3://planner-frontend-prod-160885253413/assets \
  --delete \
  --cache-control 'public,max-age=31536000,immutable'
```

CloudFront 캐시를 무효화하고 완료까지 기다립니다.

```sh
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id E6SMS7ZNIN4ZI \
  --paths '/*' \
  --query 'Invalidation.Id' \
  --output text)

aws cloudfront wait invalidation-completed \
  --distribution-id E6SMS7ZNIN4ZI \
  --id "$INVALIDATION_ID"
```

프론트 롤백은 이전 git commit으로 다시 빌드한 뒤 같은 S3 업로드와 CloudFront invalidation 절차를 반복합니다.

확인:

```sh
curl -L -s https://timelink.cloud/index.html | rg -o "assets/index-[A-Za-z0-9_-]+\\.(js|css)" | sort -u
curl -I -sS https://timelink.cloud/assets/<current-js-asset>.js
```

## 배포 후 확인

- `https://timelink.cloud`가 새 JS/CSS asset을 내려주는지 확인합니다.
- Google/Kakao 로그인을 각각 한 번씩 확인합니다.
- 그룹 상세, 일정 조율, 일정 등록처럼 방금 배포한 핵심 화면을 직접 열어봅니다.
- 푸시/알림 관련 백엔드 변경이 있으면 `planner-prod-notification-worker:live` alias와 Scheduler target ARN 설정을 함께 확인합니다.

## 문제 발생 시 우선 확인 순서

1. 프론트가 새 asset을 받고 있는지 확인합니다. 이전 asset이면 CloudFront invalidation과 브라우저/PWA 캐시를 의심합니다.
2. API health가 실패하면 `planner-prod-api:live` alias version과 CloudWatch Logs를 확인합니다.
3. 소셜 로그인만 실패하면 provider redirect URI, SSM `oauth.public-api-base-url`, `cors.allowed-origins`, Kakao scope를 먼저 확인합니다.
4. 프론트만 최신이고 백엔드가 구버전이면 backend alias를 배포 version으로 다시 연결합니다.
