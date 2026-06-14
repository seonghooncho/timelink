# Timelink 확장 로드맵

## 근본 목적

[부하테스트 결과 v2](../testing/LOAD_TEST_REPORT_V2.md)를 기준으로 트래픽과 모임 규모가 늘 때 어떤 병목을 먼저 제거해야 하는지 판단할 수 있게 하는 것이 목적입니다.

## 비목적

이 문서는 당장 대규모 분산 아키텍처로 갈아엎기 위한 설계서가 아니며, 운영 초기 비용 구조를 불필요하게 키우는 변경을 우선하지 않습니다.

## 현재 판단

현 구조는 운영 초기 사용자 모집에는 사용할 수 있습니다. Lambda 계정 동시 실행 quota는 `1,000`, `planner-prod-api` reserved concurrency는 `50`, provisioned concurrency는 `0`입니다.

부하테스트 v2 기준:

- 20 VU 혼합 트래픽은 안정 기준선입니다. 실패율 0.025%, Lambda/DynamoDB throttle 0건이었습니다.
- 50 VU 혼합 트래픽은 운영 초기의 보수적 상한으로 봅니다. p95 761 ms, p99 1.78초였지만 일부 timeout이 남았습니다.
- 일정 생성/알림 설정 write burst는 초대코드와 reminder sync 병목 수정 후 실패율 0%, Lambda/DynamoDB throttle 0건으로 통과했습니다. 다만 p95 2.7초대라 일정 생성 피크는 별도 모니터링 대상입니다.
- 75 VU probe는 현재 설정에서 안정 수용으로 보지 않습니다. Lambda concurrency가 50에 닿으며 throttle 61건과 API Gateway 5xx 61건이 발생했습니다.
- DynamoDB throttle은 모든 시나리오에서 0건이었습니다. 지금은 table capacity보다 Lambda reserved concurrency, 조율 heatmap 집계, 게시판/목록 tail latency를 먼저 봐야 합니다.

보수적인 기준:

- 안정 기준선: 동시 active API 사용자 20명 안팎, 혼합 트래픽 약 15~17 req/s
- 운영 초기 상한: 동시 active API 사용자 50명 안팎, 혼합 트래픽 약 30 req/s
- 재설계/증설 필요: 75명 이상이 같은 순간 계속 API를 누르는 이벤트성 사용
- 소규모 모임: 10~50명 수준
- 조율 응답: 수백 slot까지는 관측하면서 운영, 500 slot 이상부터 집계 구조 검토

전체 가입자 수나 MAU는 이보다 크게 받을 수 있습니다. 다만 모임 특성상 같은 시간대에 여러 명이 동시에 조율/게시글/일정을 누르는 이벤트성 피크가 생기므로, active API 사용자 기준으로 운영 알람을 해석합니다.

## 1단계: 운영 초기 즉시 개선

현재 구조를 크게 바꾸기보다 운영 중 드러난 명확한 문제를 먼저 제거합니다.

처리 완료 또는 진행 중인 항목:

- 초대코드는 `INVITE#code` mapping item과 조건부 쓰기로 유일성을 보장합니다.
- 부하테스트에서 발견한 그룹 생성 초대코드 충돌은 attempt마다 다른 deterministic 후보 코드를 만들도록 수정했습니다.
- 새 일정 생성은 기존 reminder job 삭제 없이 바로 예약하고, 알림 설정 저장은 reminder 필드 변경 시에만 전체 reminder sync를 수행하도록 수정했습니다.
- k6/Playwright 시나리오는 모임, 조율, 게시판, 알림 설정, 모바일 overflow를 포함하도록 보강했습니다.
- cleanup 스크립트는 테스트 게시글 cascade, 큰 table scan 출력, Scheduler 병렬 삭제를 처리하도록 보강했습니다.

계속 관측할 항목:

- 50 VU 혼합 트래픽에서 HTTP 실패율 0.1% 미만, Lambda throttle 0건이 유지되는지 확인합니다.
- write burst에서 p99가 5초를 반복해서 넘는지 확인합니다.
- Cloudflare 경유 connection reset이 반복되면 CloudFront 직접 경로와 비교합니다.

## 2단계: Lambda 동시성 여유 조정

현재 API reserved concurrency `50`은 운영 초기 비용과 다른 Lambda 여유를 고려한 값입니다. 알림/배치/이미지 처리 Lambda가 사용할 수 있도록 unreserved concurrency는 최소 50~100 이상 남깁니다.

reserved concurrency 증설 기준:

- `planner-prod-api` Lambda throttle이 운영 중 1건이라도 반복된다.
- API Gateway 5xx가 Lambda throttle과 같은 시간대에 발생한다.
- 50 VU 수준의 피크가 실제 사용자 행동으로 자주 발생한다.
- p99가 5초를 자주 넘고, CloudWatch에서 concurrency가 50에 근접한다.

권장 조치:

- 단기: `planner-prod-api` reserved concurrency를 80~100으로 올립니다.
- 동시에: 알림 worker, 이미지 처리, AI Lambda의 동시 실행 여유가 남는지 확인합니다.
- 보류: provisioned concurrency는 지금은 `0`을 유지합니다. 현재 문제는 cold start보다 reserved concurrency 한도와 tail path입니다.

## 3단계: 모임/조율 데이터 증가

데이터가 늘면 Lambda 동시성보다 DynamoDB 접근 패턴이 더 중요해집니다. 현재 그룹 metadata batch get과 counter cache는 일부 비용을 줄였지만, 상세 화면에서 하위 item을 많이 읽는 경로는 남아 있습니다.

우선순위:

- 사용자당 모임 수가 20개를 자주 넘으면 membership item에 목록 표시용 모임명, 설명, 이미지, 멤버 수를 denormalize합니다.
- 모임 멤버가 50명 이상이면 멤버 목록은 cursor pagination과 preview item으로 분리합니다.
- 조율 하나의 응답 slot item이 500개 이상이면 slot별 집계 item을 유지합니다.
- 조율/알림 목록은 `status`, `type`, `isRead` 조건을 먼저 만족하는 키 또는 GSI를 추가해 페이지 후 메모리 필터링을 줄입니다.

조율 heatmap 장기 구조:

- 응답 저장 시 slot별 count와 user preview를 집계 item에 반영합니다.
- 상세 화면은 집계 item을 먼저 읽고, 특정 slot을 클릭할 때만 해당 참여자 목록을 페이지로 가져옵니다.
- 정확성과 비용 사이에서 동기 갱신을 기본으로 두고, 쓰기 피크가 커지면 DynamoDB Stream/SQS 기반 비동기 집계로 전환합니다.

## 4단계: 게시판/커뮤니티 확장

v2 테스트에서 게시글/댓글 경로는 Lambda throttle 없이도 간헐적인 timeout과 connection reset이 발생했습니다. 실패율은 낮았지만 사용자 체감은 게시판에서 먼저 나빠질 수 있습니다.

개선 기준:

- 게시글 목록/상세 p95가 1초 이상 반복된다.
- 댓글 수가 게시글당 100개 이상인 글이 늘어난다.
- 커뮤니티/모임 게시글 작성이 같은 시간대에 집중된다.

권장 조치:

- 게시글 목록은 author/profile 정보를 목록용 필드로 denormalize합니다.
- 댓글은 cursor pagination을 유지하고, 목록에 최신 댓글 preview만 둡니다.
- 좋아요/댓글 수는 counter cache를 기본으로 유지합니다.
- 이미지가 있는 게시글은 썸네일 URL을 목록에 사용하고 원본급 이미지는 상세에서만 로드합니다.

## 5단계: 알림/푸시 확장

운영 초기에는 알림마다 EventBridge Scheduler schedule을 만드는 방식이 단순하고 추적하기 쉽습니다. 일정/리마인드가 늘면 schedule 생성/삭제와 worker fanout이 병목이 됩니다.

전환 기준:

- 하루 생성/삭제 reminder job이 수천 개 이상이다.
- Scheduler Create/Delete TPS나 invocation throttle에 근접한다.
- 하나의 모임 알림이 50명 이상에게 동시에 push fanout된다.
- worker Lambda duration과 retry가 증가한다.

장기 구조:

- due time 기준 GSI를 둔 reminder job table을 만들고, EventBridge periodic rule이 가까운 job을 조회합니다.
- 발송은 SQS로 fanout하고 worker가 subscription 단위로 처리합니다.
- 실패한 endpoint는 비동기로 정리합니다.

## 당장 제안할 작업

1. 운영 알람에서 API Lambda throttle이 1건이라도 반복되면 reserved concurrency를 80~100으로 올립니다.
2. 일정 생성 write burst p99가 5초를 반복해서 넘으면 reminder 예약을 SQS fanout 또는 due-time polling 구조로 분리합니다.
3. 모임 멤버 50명, 조율 응답 slot 500개 기준에 접근하면 조율 heatmap 집계 item 설계를 먼저 적용합니다.
4. 게시판 timeout/connection reset이 반복되면 Cloudflare 경유와 CloudFront 직접 경로를 분리해서 앞단 프록시 영향을 확인합니다.
5. 배포 전 수동 점검에는 `smoke_prod`, Playwright 서버리스 흐름, 필요한 경우 `baseline_20vu`만 우선 연결하고, 50/75 VU는 운영 시간 외 수동 실험으로 유지합니다.
