# Timelink 부하테스트 결과 v2

## 근본 목적

Lambda reserved concurrency `50`과 계정 quota `1,000` 적용 이후 운영 API가 어느 정도의 동시 active 사용자를 감당하는지 재측정하고, 모임/조율/게시판/알림이 섞인 실제 서비스 흐름에서 먼저 약해지는 지점을 찾는 것이 목적입니다.

## 비목적

이 문서는 총 가입자 수를 단정하지 않습니다. k6 VU는 앱을 열어 둔 전체 회원 수가 아니라 같은 순간 API를 계속 호출하는 active 사용자에 가깝습니다. 가입자 수, DAU, 동시 active API 사용자는 분리해서 판단합니다.

## 측정 기준

- 테스트 일시: 2026-06-14 04:50 ~ 06:09 KST
- 대상: 운영 도메인 `https://timelink.cloud`, AWS account `160885253413`, region `ap-northeast-2`
- API Gateway: `sotr621lgc`, stage `$default`
- CloudFront distribution: `E6SMS7ZNIN4ZI`
- API Lambda: `planner-prod-api`
- Lambda quota: account concurrency `1,000`, `planner-prod-api` reserved concurrency `50`, provisioned concurrency `0`
- DynamoDB: `planner_prod_main`, on-demand
- 도구: k6 `v2.0.0`, Playwright `1.60.0` Chromium
- 테스트 코드: `test/k6/timelink-load-test.js`, `test/playwright/serverless-flow.spec.ts`
- 정리 코드: `test/scripts/cleanup-load-test.mjs`

## 시나리오

| 프로필 | 목적 | 구성 |
| --- | --- | --- |
| `smoke_prod` | 운영 인증/기본 API 경로 확인 | 6명, 2 VU, 30초 |
| `baseline_20vu` | 운영 초기 혼합 트래픽 기준선 | 24명, 20 VU, 5분 |
| `reserved_limit_50vu` | API Lambda reserved concurrency 50 근처 확인 | 60명, 50 VU, 5분 |
| `group_scale_read` | 큰 모임 상세/멤버/게시글/조율 조회 | 50명 모임, 30 VU, 3분 |
| `coordination_heatmap_scale` | 조율 상세 heatmap과 내 응답 조회 | 50명 응답, 30 VU, 3분 |
| `community_group_post_mix` | 커뮤니티/모임 게시글/댓글/좋아요 혼합 | 40명, 25 VU, 3분 |
| `write_burst_schedule_notification` | 일정 생성/완료/알림 설정 write burst | 30명, 20 VU, 3분 |
| `probe_75vu_short` | reserved concurrency 초과 구간 확인 | 80명, 75 VU, 90초 |

Playwright는 실제 브라우저 기준으로 모바일 overflow, 조율 추천 모달, 투표자 표시, 그룹 게시글 작성 버튼과 하단 고정 액션 충돌을 함께 확인했습니다.

## 결과 요약

| 프로필 | 요청 | 처리량 | HTTP 실패율 | p95 | p99 | max | API throttle | Lambda 동시성 | DynamoDB throttle |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `smoke_prod` | 112 | 1.71 req/s | 0.000% | 1,138 ms | 7,946 ms | 10,239 ms | 0 | 1 | 0 |
| `baseline_20vu` | 7,914 | 16.51 req/s | 0.025% | 669 ms | 1,773 ms | 60,000 ms | 0 | 16 | 0 |
| `reserved_limit_50vu` | 19,676 | 29.84 req/s | 0.030% | 761 ms | 1,782 ms | 60,006 ms | 0 | 40 | 0 |
| `group_scale_read` | 9,819 | 17.21 req/s | 0.020% | 790 ms | 1,930 ms | 60,006 ms | 0 | 28 | 0 |
| `coordination_heatmap_scale` | 5,536 | 13.81 req/s | 0.018% | 1,074 ms | 3,370 ms | 60,002 ms | 0 | 27 | 0 |
| `community_group_post_mix` | 4,424 | 11.40 req/s | 0.158% | 717 ms | 1,357 ms | 60,002 ms | 0 | 17 | 0 |
| `write_burst_schedule_notification` | 91 | 2.35 req/s | 1.099% | 571 ms | 1,920 ms | 5,345 ms | 0 | 1 | 0 |
| `probe_75vu_short` | 9,855 | 19.78 req/s | 0.660% | 850 ms | 2,430 ms | 60,001 ms | 61 | 50 | 0 |

해석:

- 20 VU baseline은 운영 초기 기준선으로 안정권입니다. 실패율은 0.025%였고 Lambda/DynamoDB throttle은 없었습니다.
- 50 VU 혼합 트래픽은 p95 761 ms, p99 1.78초로 사용할 수 있는 수준이지만, 일부 요청 timeout이 남아 있어 안정 한계에 가까운 상한으로 봅니다.
- 75 VU probe는 Lambda 동시성 `50`에 정확히 닿으면서 API Gateway 5xx 61건과 Lambda throttle 61건이 발생했습니다. 이 구간은 현재 설정에서 안정 수용으로 보지 않습니다.
- DynamoDB throttle은 모든 시나리오에서 0이었습니다. 이번 실험에서 1차 병목은 DynamoDB 용량보다 Lambda reserved concurrency와 일부 집계/목록 경로의 tail latency입니다.
- 조율 heatmap은 다른 읽기 시나리오보다 p95/p99가 높습니다. 조율 응답 전체를 읽어 화면 집계를 구성하는 구조가 규모 증가 시 먼저 약해질 가능성이 큽니다.

## Playwright 결과

- 최종 run: `tl-load-playwright-20260613T195625Z`
- 결과: 7 passed, 1.4분
- 검증 범위:
  - 홈/모임/커뮤니티/마이페이지 모바일 viewport 가로 overflow 없음
  - 조율 추천 모달 표시와 투표자 프로필 모달 동작
  - 그룹 게시글 작성 FAB가 하단 고정 액션보다 위에 위치
  - 그룹 게시글 작성 후 목록 반영
  - 테스트로 생성한 그룹/조율/Scheduler cleanup

## 발견한 문제와 처리

### 1. 모임 생성 중 `INVALID_INVITE_CODE` 발생

`write_burst_schedule_notification` setup에서 `POST /groups`가 400 `INVALID_INVITE_CODE`로 실패했습니다. 운영 Lambda 환경에서 짧은 시간 다수의 그룹 생성이 발생할 때 랜덤 초대코드가 10회 연속 충돌하는 양상이었습니다.

현재 처리:

- `GroupService`의 초대코드 생성은 `groupId + now + attempt` 기반 deterministic base36 코드로 변경했습니다.
- 기존 `INVITE#code` 조건부 저장은 유지해 중복 코드는 여전히 DynamoDB에서 막습니다.
- 충돌 시 같은 랜덤 상태를 반복하지 않고 attempt마다 다른 후보 코드를 생성합니다.
- 단위 테스트에 “첫 초대코드 저장 실패 후 다른 코드로 재시도” 케이스를 추가했습니다.

검증:

- Java 21 환경에서 `./gradlew test --tests com.planner.domain.group.service.GroupServiceTest`를 통과했습니다.
- 운영 배포 후 `write_burst_schedule_notification`을 다시 실행해 write burst 기준을 확정해야 합니다.

### 2. 부하테스트 cleanup 스크립트가 큰 table scan 출력에서 실패

baseline cleanup 중 AWS CLI scan 출력이 기본 buffer를 넘어서 `ENOBUFS`가 발생했습니다.

현재 처리:

- `test/scripts/cleanup-load-test.mjs`의 AWS CLI `maxBuffer`를 64 MB로 확장했습니다.
- 테스트 게시글 댓글/좋아요까지 삭제되도록 `POST#...` cascade 수집을 강화했습니다.

### 3. 게시판/목록 경로의 긴 tail latency

50 VU와 규모별 읽기 시나리오에서 `/groups`, `/groups/{id}/posts`, `/community/posts/{id}/comments`, `/schedules` 등 일부 요청이 60초 timeout까지 갔습니다. CloudWatch 기준 Lambda handler p95는 낮고 DynamoDB throttle은 없었으므로, 평균 처리시간보다 tail path와 연결 경로 문제가 더 큽니다.

개선 방향:

- 게시글/댓글/멤버/조율 목록은 cursor pagination 유지 여부를 계속 점검합니다.
- 목록 표시용 값은 가능한 metadata/counter cache에 유지하고, 상세 진입 시에만 무거운 하위 목록을 읽습니다.
- Cloudflare 경유 요청에서 `connection reset by peer`가 관측됐으므로, 반복되면 CloudFront 직접 경로와 비교해 앞단 프록시 영향 여부를 분리합니다.

### 4. 조율 heatmap 집계 비용

`coordination_heatmap_scale`은 실패율은 낮았지만 p95 1.07초, p99 3.37초로 가장 무거운 읽기 경로였습니다.

개선 방향:

- 그룹 멤버 50명 이상, 조율 응답 slot 500개 이상부터는 응답 전체 읽기 대신 slot별 집계 item을 유지합니다.
- 투표 변경 시 집계 item을 동기 갱신하거나 DynamoDB Stream/SQS 기반 비동기 집계로 분리합니다.

## 수용 판단

운영 초기 권장 기준:

- 안정 기준선: 동시 active API 사용자 20명 안팎, 혼합 트래픽 약 15~17 req/s
- 보수적 상한: 동시 active API 사용자 50명 안팎, 혼합 트래픽 약 30 req/s
- 현재 설정에서 비권장: 동시 active API 사용자 75명 이상이 같은 순간 계속 API를 누르는 상황

실제 초기 사용자 모집 기준:

- 전체 가입자나 MAU는 동시 active API 사용자보다 훨씬 크게 잡을 수 있습니다.
- 다만 특정 시간에 같은 모임 구성원이 동시에 조율/게시글/일정 생성을 반복하는 이벤트성 사용은 50명 근처부터 tail latency를 모니터링해야 합니다.
- 75 VU에서 throttle이 발생했으므로, 운영 알람에서 `planner-prod-api` throttle이 1건이라도 반복되면 reserved concurrency를 80~100으로 올리거나 hot path를 먼저 줄여야 합니다.

## 당장 개선할 코드

이번 작업에서 직접 수정한 항목:

- 초대코드 생성 재시도 로직을 랜덤 반복에서 deterministic attempt 기반으로 변경
- 초대코드 충돌 단위 테스트 추가
- k6 대규모 시나리오 추가와 제목/본문 길이 제한에 맞는 테스트 데이터 생성
- Playwright 서버리스 흐름 시나리오 보강
- cleanup 스크립트 buffer와 게시글 cascade 정리 강화
- AWS metric 수집 스크립트에 Lambda concurrency, API Gateway, CloudFront 지표 추가

운영 배포 후 바로 재측정할 항목:

- `write_burst_schedule_notification`: 이번 run은 초대코드 버그 때문에 setup 단계에서 실패해 write burst 자체를 측정하지 못했습니다.
- `reserved_limit_50vu`: 초대코드 수정 후에도 50 VU 상한에서 오류율이 0.1% 아래인지 재확인합니다.

## 정리 확인

- 모든 run id에 대해 cleanup 스크립트를 재실행했습니다.
- 최종 재확인에서 각 run id의 `deletedItems`, `groupIds`, `coordinationIds`, `postIds`, `deletedSchedulers`는 모두 `0`이었습니다.
- EventBridge Scheduler group `planner-prod-notification-reminders`의 잔여 schedule 수는 `0`개였습니다.

## 근거 파일

로컬 원본 결과는 `test-results/` 하위에 남아 있으며 git에는 포함하지 않습니다.

- k6 raw summary: `test-results/k6/tl-load-*.json`
- k6 warning log: `test-results/logs/tl-load-*.log`
- AWS metrics: `test-results/aws/tl-load-*.json`
- cleanup 결과: `test-results/cleanup/*.json`, `test-results/cleanup/*.verify.json`
- Playwright 결과: `test-results/playwright-artifacts/`, `test-results/.last-run.json`
