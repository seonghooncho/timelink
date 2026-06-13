# Timelink 부하테스트 결과

## 근본 목적

현재 운영 구조가 어느 정도의 동시 사용과 API 요청을 감당할 수 있는지 직접 측정하고, 배포 전 실제로 고쳐야 할 서버리스/데이터 접근 위험을 드러내는 것이 목적입니다.

## 비목적

이 문서는 장기 확장 설계를 모두 확정하지 않으며, 테스트 중 발견한 문제를 임시 재시도로 덮는 방법을 최종 해결책으로 제시하지 않습니다.

## 측정 기준

- 테스트 일시: 2026-06-12 03:17:16 ~ 03:27:13 KST
- 대상: 운영 도메인 `https://timelink.cloud`, AWS account `160885253413`, region `ap-northeast-2`
- API Lambda: `planner-prod-api:live`, 측정 당시 계정 Lambda 동시 실행 quota `10`
- DynamoDB: `planner_prod_main`, on-demand
- 도구: k6 `v2.0.0`, Playwright `1.60.0` Chromium
- 테스트 코드: `test/k6/timelink-load-test.js`, `test/playwright/serverless-flow.spec.ts`
- 정리 코드: `test/scripts/cleanup-load-test.mjs`

## 시나리오

| 시나리오 | 목적 | 구성 |
| --- | --- | --- |
| k6 smoke | 배포/인증/기본 조회 경로 확인 | 6명 데이터 생성, 2 VU, 홈/그룹 조회 30초 |
| k6 baseline | 운영 초기 혼합 트래픽 기준선 | 12명 데이터 생성, 10 VU, 홈/그룹/조율 조회, 일정 쓰기, 알림 설정 토글 2분 |
| k6 quota_probe | Lambda quota 10 초과 시 양상 확인 | 12명 데이터 생성, 16 VU, 홈/그룹/조율 조회 45초 |
| Playwright | 브라우저와 API 흐름 결합 검증 | 그룹 조율 UI/추천 모달/투표자 표시, 일정 알림 설정 |

## 결과 요약

| 실행 | 최대 VU | 요청 수 | 처리량 | HTTP 실패율 | p95 | p99 | 최대 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| smoke | 2 | 125 | 2.12 req/s | 0% | 872 ms | 1.58 s | 2.50 s |
| baseline | 10 | 1,292 | 7.19 req/s | 0% | 969 ms | 2.89 s | 42.68 s |
| quota_probe | 16 | 836 | 6.51 req/s | 0.84% | 807 ms | 5.32 s | 60.00 s |
| Playwright | 1 browser | 2 tests | - | 0% | - | - | 25.9 s |

해석:

- 현재 quota 10 기준에서는 10 VU 혼합 트래픽이 오류 없이 통과했다.
- 16 VU probe는 짧은 시간에도 connection reset, request timeout, 긴 graceful stop이 발생했다.
- 16 VU에서 처리량이 baseline보다 늘지 않았고, max 지연이 60초까지 증가했으므로 운영 SLO 기준으로는 quota 초과 상태를 안정 수용으로 보지 않는다.
- 운영 초기에는 동시 active API 사용자 10명 안팎, 지속 혼합 트래픽 5~7 req/s 수준을 보수적인 기준으로 둔다. 가입자 수나 대기 사용자는 이보다 많아도 되지만, 같은 순간 API를 누르는 사용자는 별도로 봐야 한다.

## AWS 지표

측정 구간 CloudWatch 요약:

| 항목 | 값 |
| --- | ---: |
| `planner-prod-api` invocations | 2,315 |
| `planner-prod-api` errors | 0 |
| `planner-prod-api` throttles | 4 |
| `planner-prod-api` duration p95 max | 204.53 ms |
| DynamoDB throttled requests | 0 |
| DynamoDB read throttle events | 0 |
| DynamoDB write throttle events | 0 |
| DynamoDB consumed read capacity max | 17 |
| DynamoDB consumed write capacity max | 25 |

Lambda 실행시간 p95는 낮지만 k6 max 지연은 길었다. 따라서 병목은 순수 Lambda handler 실행보다 Lambda 동시 실행 한도, 앞단 연결/대기, CloudFront/API Gateway 경로의 tail latency가 섞인 것으로 해석한다.

## 발견한 문제

아래 문제는 테스트 당시 관측값입니다. 이후 코드와 운영 설정에서 해결된 항목은 각 항목에 현재 상태를 함께 적습니다.

1. 그룹 초대코드가 중복될 수 있다.

   테스트 run `tl-load-20260611T181243Z`에서 서로 다른 테스트 그룹이 같은 초대코드 `5S3ZSV`를 받았다. 그 결과 `findByInviteCode`가 scan으로 먼저 찾은 이전 그룹에 멤버를 가입시켰고, 새 그룹 조율 응답 저장은 `NOT_GROUP_MEMBER`로 실패했다. Lambda SnapStart 환경에서 랜덤 상태가 반복될 가능성과 초대코드 유일성 보장 부재를 함께 봐야 한다.

   현재 상태: `INVITE#code` mapping item과 조건부 쓰기로 유일성을 보장하도록 수정했다.

2. 초대코드 조회가 DynamoDB scan이다.

   `GroupRepository.findByInviteCode()`는 `inviteCode` filter scan을 사용한다. 데이터가 늘면 O(table) 비용이 되고, 중복 코드가 있으면 어떤 그룹이 선택될지 안정적으로 보장할 수 없다.

   현재 상태: 초대코드 조회는 mapping item 직접 조회로 변경되어 scan 경로를 제거했다.

3. Lambda quota 초과 상태에서 tail latency와 실패가 발생한다.

   quota_probe는 HTTP 실패율 0.84%, Lambda throttles 4, k6 max 60초를 기록했다. 짧은 probe에서도 발생했으므로 동시 실행 quota 10을 운영 한계로 취급해야 한다.

   현재 상태: 계정 concurrency quota `1,000` 증액 요청을 진행하고, 승인 후 `planner-prod-api` reserved concurrency `50`을 적용한다.

4. 상단 PWA 설치 안내가 일부 클릭을 가릴 수 있다.

   Playwright 최초 실행에서 조율 화면의 `모두 가능한 시간` 탭 클릭이 상단 설치 안내에 막혔다. 사용자는 닫기 버튼으로 해소할 수 있지만, 화면 진입 직후 핵심 탭과 겹칠 수 있어 UI layer 개선 후보로 남긴다.

5. 목록/집계 경로가 규모 증가에 취약하다.

   테스트 당시 그룹 목록은 그룹별 `findGroupById`와 `findMembersByGroupId().size()`를 반복했고, 조율 목록은 항목별 `findResponses(coordId).size()`를 수행할 수 있었다. 현재 소규모에서는 통과했지만 모임/조율 수가 늘면 N+1 비용으로 tail latency가 커진다.

   현재 상태: 그룹 metadata 조회는 batch get으로 완화했고, `memberCount`와 `responseCount`가 없는 기존 데이터에서만 전체 수 계산 fallback이 실행된다. 조율 상세 heatmap은 여전히 응답 전체를 읽으므로 별도 집계 item 전환 기준까지 모니터링한다.

## 정리 확인

- 각 테스트 run은 실행 직후 `test/scripts/cleanup-load-test.mjs`로 삭제했다.
- 최종 재확인에서 모든 run id의 `deletedItems`는 `0`이었다.
- EventBridge Scheduler group `planner-prod-notification-reminders`는 테스트 종료 후 schedule `0`개였다.

## 근거 파일

- k6 결과: `test-results/k6/tl-load-smoke-20260611T181716Z.json`, `test-results/k6/tl-load-baseline-20260611T181827Z.json`, `test-results/k6/tl-load-quota-20260611T182144Z.json`
- Playwright 결과: `npm run test:playwright` 2 passed
- AWS 지표: `test-results/aws/metrics.json`
