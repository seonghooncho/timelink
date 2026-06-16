# Timelink Product Analytics v1

## 근본 목적

GA는 유입과 랜딩 분석에 유지하면서, Timelink 내부 제품 사용 흐름을 개인정보 없이 관측해 운영자가 가입, 활성, 모임/일정/공유 사용량, 최근 에러를 빠르게 확인할 수 있게 하는 것이 목적입니다.

## 비목적

이 문서는 GA를 대체하거나, 대형 BI/데이터 웨어하우스, 실시간 스트리밍 분석, 사용자별 행동 원장 시스템을 만드는 문서가 아닙니다. 운영 초기에는 현재 서버리스 구조에 맞는 최소 비용 집계와 작은 관리자 화면만 둡니다.

## 현재 판단

Timelink는 CloudFront/S3 프론트엔드, API Gateway, Java Lambda 기반 Spring API, 단일 DynamoDB 테이블, S3 이미지 저장소를 사용합니다. 따라서 product analytics도 별도 분석 플랫폼을 먼저 붙이기보다 기존 API Lambda 안에 얇은 `analytics` 도메인을 추가하는 편이 낫습니다.

이 구조를 선택하는 이유는 다음과 같습니다.

- 인증, CORS, 배포, 로깅, SSM 설정 로딩을 기존 백엔드와 공유할 수 있습니다.
- API Gateway route와 Lambda를 추가하지 않아 운영 표면과 비용을 작게 유지합니다.
- DynamoDB single-table 패턴을 유지해 조회 지표를 빠르게 만들 수 있습니다.
- S3 raw event는 나중에 Athena/Glue/Firehose로 확장할 여지를 남기면서 지금은 단순하게 저장합니다.

## GA와 자체 분석의 역할 분리

| 영역 | 도구 | 이유 |
| --- | --- | --- |
| 유입, 랜딩, 데모, 캠페인 | GA4 | 외부 유입 경로와 랜딩 성과 분석에 적합합니다. |
| 제품 내부 사용량 | 자체 analytics | 로그인 이후 핵심 기능 사용량과 운영 지표를 개인정보 없이 직접 통제합니다. |
| 운영 장애 징후 | CloudWatch 모니터링 v1 | Lambda/API/DynamoDB 장애와 성능 이상을 감시합니다. |

웹의 기존 GA 래퍼는 제거하지 않습니다. 자체 analytics는 별도 클라이언트와 API로 분리해 GA 이벤트명 변경이나 차단이 제품 지표에 영향을 주지 않게 합니다.

## 이벤트 계약 v1

수집 이벤트는 whitelist 방식으로 제한합니다.

| 이벤트 | 의미 |
| --- | --- |
| `page_view` | 웹/앱 화면 진입 |
| `signup_completed` | 서버에서 새 프로필이 생성됨 |
| `login_completed` | 서버 로그인 세션 발급 완료 |
| `link_created` | 초대/조율 등 공유 가능한 진입 링크 생성 |
| `link_opened` | 초대/공유 링크 진입 |
| `link_copied` | 사용자가 공유 링크를 복사 |
| `link_shared` | OS/browser 공유 UI 호출 성공 |
| `link_deleted` | 공유 링크 또는 링크가 포함된 리소스 삭제 |
| `settings_updated` | 알림/프로필/모임 설정 저장 완료 |
| `error_shown` | 사용자에게 에러 UI가 표시됨 |

허용 property는 낮은 민감도의 enum, 작은 숫자, route template 중심입니다.

- 공통: `surface`, `platform`, `route`, `feature`, `source`, `result`
- 화면: `page_type`
- 링크: `link_type`
- 설정: `settings_type`
- 에러: `error_code`, `severity`
- 숫자: `duration_ms`, `activity_seconds`

## 개인정보 경계

analytics event에는 아래 값을 저장하지 않습니다.

- email, name, phone
- access token, refresh token, OAuth code/state
- raw userId
- 초대코드 원문
- 원문 URL
- 일정/모임/게시글/댓글/메모의 제목, 설명, 본문

로그인 사용자는 서버에서 JWT principal을 읽고 `ANALYTICS_HMAC_SECRET`으로 HMAC-SHA256 `user_key`를 만든 뒤 저장합니다. 클라이언트가 보낸 사용자 식별자는 무시합니다.

서버는 이벤트명과 properties를 whitelist로 검증하고, 허용되지 않은 property는 저장하지 않습니다. 이벤트 수집 실패는 제품 동작을 막지 않도록 warning log로 남기고 수집 요청은 가능한 한 non-blocking으로 처리합니다.

## 저장 구조

DynamoDB는 기존 `planner_{env}_main` single table을 사용합니다.

| PK | SK | 용도 |
| --- | --- | --- |
| `ANALYTICS#DAY#YYYY-MM-DD` | `EVENT#{eventName}` | 일별 이벤트 count |
| `ANALYTICS#DAY#YYYY-MM-DD` | `FEATURE#{feature}` | 기능별 사용량 count |
| `ANALYTICS#ACTIVE#YYYY-MM-DD` | `USER#{user_key}` | 일별 활성 사용자 marker |
| `ANALYTICS#ERRORS` | `TS#{timestamp}#EVENT#{eventId}` | 최근 에러 이벤트 |
| `ANALYTICS#API#DAY#YYYY-MM-DD` | `ROUTE#{method}#{routeTemplate}` | API latency histogram과 상태 코드 count |
| `ANALYTICS#META` | `TOTAL_USERS` | 새 프로필 생성 counter |

“오늘” 기준은 서비스 운영 기준 시간대인 `Asia/Seoul` 날짜를 사용합니다. raw event의 timestamp는 UTC `Instant`를 저장합니다.

S3 raw event는 별도 bucket에 저장합니다.

```text
analytics/raw/dt=YYYY-MM-DD/hour=HH/{eventId}.json
```

초기에는 event당 object 1개로 시작합니다. 트래픽 증가로 작은 파일 수가 비용/조회 문제를 만들면 SQS 배치 또는 Firehose로 전환합니다.

API 성능 지표는 개인정보와 원문 URL을 피하기 위해 S3 raw event로 저장하지 않습니다. 서버가 Spring handler route template을 우선 사용하고, fallback path에서도 id/초대코드성 segment를 마스킹한 뒤 날짜별 histogram bucket(`<=50ms`, `<=100ms`, ..., `>30s`)으로만 집계합니다. 관리자 화면의 p50/p95는 이 histogram에서 근사 계산합니다.

## 관리자 대시보드

관리자 API는 기존 JWT 인증을 사용하고, `analytics.admin-user-ids` allowlist에 포함된 userId만 조회할 수 있습니다.

- 화면 경로: `/admin/analytics`
- 권한 확인 API: `GET /api/planner/v1/admin/me`
- 지표 조회 API: `GET /api/planner/v1/admin/analytics/summary?date=YYYY-MM-DD`
- `/admin` 경로는 제품 하단 내비게이션, PWA 설치 유도, 푸시 권한 유도, 제품 route tracker를 렌더링하지 않는 별도 admin layout을 사용합니다.
- allowlist에는 이메일이 아니라 백엔드 userId를 넣습니다. Google 소셜 계정은 `google_<sub>` 형태입니다.

초기 admin 계정 등록 절차:

1. 관리자에게 사용할 Google 계정으로 한 번 로그인합니다.
2. `/admin/analytics`에 접속합니다.
3. 접근 거부 화면에 표시되는 현재 로그인 ID를 복사합니다.
4. 해당 값을 `analytics.admin-user-ids`에 추가하고 backend 설정을 재배포합니다.

v1 화면 지표:

- 총 회원 수
- 오늘 가입자 수
- 오늘 활성 사용자 수
- 7일 활성 사용자 수
- 30일 활성 사용자 수
- 오늘 생성된 링크 수
- 오늘 열린 링크 수
- 기능별 사용량 TOP 5
- 느린 API TOP 8: route template, p50, p95, 평균, 호출 수, 4xx/5xx count
- 오늘 평균 활동 시간
- 최근 에러 이벤트

총 회원 수는 `signup_completed`/프로필 생성 시 증가하는 counter를 기준으로 합니다. 기능 배포 이전 기존 회원 수는 운영자가 1회성 백필로 맞춥니다.

## 운영 설정

필수 환경변수 또는 SSM parameter:

| key | 설명 |
| --- | --- |
| `analytics.enabled` | 자체 analytics 활성화 여부 |
| `analytics.hmac-secret` | raw userId를 `user_key`로 변환하는 HMAC secret |
| `analytics.raw-bucket-name` | raw event 저장 S3 bucket |
| `analytics.admin-user-ids` | 관리자 조회를 허용할 comma-separated userId 목록. 이메일이 아니라 `google_<sub>` 같은 백엔드 userId |
| `analytics.api-metrics-enabled` | API latency histogram 저장 여부. `analytics.enabled=true`일 때만 의미 있음 |

HMAC secret은 운영에서 SecureString으로 관리합니다. admin allowlist는 권한 판정에만 사용하며 event 저장에는 raw userId를 남기지 않습니다.

## 한계와 다음 개선 시점

- raw S3 event는 초기 단순성을 위해 object-per-event입니다. page_view가 하루 수만 건 이상으로 늘면 SQS/Firehose 배치 구조로 바꿉니다.
- DAU/WAU/MAU는 DynamoDB marker query 기반입니다. 활성 사용자가 크게 늘면 HyperLogLog 또는 일별 집계 item으로 전환합니다.
- 관리자 권한은 userId allowlist입니다. 운영자가 늘거나 권한 등급이 필요해지면 별도 service role model을 둡니다.
- 기존 회원 수는 배포 시점 이전 데이터를 자동으로 알 수 없으므로 1회 백필이 필요합니다.
- API latency p50/p95는 raw request 원장을 보관하지 않는 histogram 기반 근사치입니다. 정확한 tracing이나 span 단위 병목 분석이 필요해지면 X-Ray/OpenTelemetry를 별도로 검토합니다.
