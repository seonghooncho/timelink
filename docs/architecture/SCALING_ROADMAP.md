# Timelink 확장 로드맵

## 근본 목적

[부하테스트 결과](../testing/LOAD_TEST_REPORT.md)를 기준으로 트래픽과 그룹 규모가 늘 때 어떤 병목을 먼저 제거해야 하는지 판단할 수 있게 하는 것이 목적입니다.

## 비목적

이 문서는 당장 대규모 분산 아키텍처로 갈아엎기 위한 설계서가 아니며, 운영 초기 비용 구조를 불필요하게 키우는 변경을 우선하지 않습니다.

## 현재 판단

현 구조는 운영 초기 소규모 트래픽에는 사용할 수 있다. 다만 Lambda 동시 실행 quota 10, 그룹 목록의 그룹 metadata 추가 조회, 알림/조율 목록의 페이지 후 메모리 필터링, 조율 상세의 응답 전체 읽기가 명확한 확장 한계다.

보수적인 기준:

- 동시 active API 사용자: 10명 안팎
- 지속 혼합 트래픽: 5~7 req/s
- 소규모 그룹: 10~20명 수준
- 조율 응답: 수십~수백 slot 수준

이 기준을 넘기기 전에는 아래 순서로 개선한다.

## 1단계: 운영 초기 즉시 개선

현재 초대코드는 invite mapping item과 조건부 쓰기 구조로 정리되어 있어 scan 병목은 우선순위에서 내려간다. 운영 초기는 구조를 크게 바꾸기보다 관측과 배포 전 검증 누락을 줄이는 데 집중한다.

같이 처리할 항목:

- Lambda `Throttles`, `Errors`, API 5xx, p95/p99 지연 CloudWatch alarm을 추가한다.
- PWA 설치 안내가 주요 탭을 가리지 않도록 위치/높이/auto-dismiss 정책을 조정한다.
- k6와 Playwright 테스트를 배포 전 수동 점검 루틴에 포함한다.

## 2단계: 동시 사용자 10~30명

Lambda 계정 동시 실행 quota를 50 이상으로 올리고, `planner-prod-api`, `planner-prod-notification-worker`, `planner-prod-ai`에 필요한 reserved concurrency를 나눈다. 비용 구조를 크게 바꾸지 않으면서 throttling 여지를 줄일 수 있다.

같이 봐야 할 기준:

- baseline p95가 1.5초 이상으로 지속된다.
- p99가 5초를 자주 넘는다.
- Lambda throttles가 0이 아닌 상태로 반복된다.
- API Gateway/CloudFront에서 timeout이나 connection reset이 사용자 신고로 이어진다.

SnapStart는 cold start 완화에는 유효하지만 동시 실행 quota를 늘려주지 않는다. quota와 reserved concurrency는 별도로 관리한다.

## 3단계: 그룹/조율 데이터 증가

그룹 목록, 조율 목록, 알림 목록의 조회 방식을 데이터 증가 기준으로 재설계한다. 현재 `memberCount`, `responseCount`는 metadata에 저장하지만, 목록 응답을 만들 때 그룹 metadata를 추가 조회하거나 status/type 필터를 페이지 조회 후 메모리에서 적용하는 구간이 남아 있다.

우선순위:

- 그룹 membership item에 목록 표시용 그룹명, 설명, 이미지, 멤버 수를 denormalize하거나 batch get으로 그룹 metadata 조회를 묶는다.
- 조율/알림 목록은 `status`, `type`, `isRead` 조건을 먼저 만족하는 키 또는 GSI를 추가해 페이지 후 메모리 필터링을 없앤다.
- 그룹 멤버 목록에 cursor pagination을 추가한다.
- 조율 상세의 heatmap은 응답 전체를 매번 읽지 않고 slot별 집계 item을 유지한다.

개선 기준:

- 사용자당 그룹 수가 20개를 자주 넘는다.
- 그룹 멤버가 50명 이상이 된다.
- 조율 하나의 응답 slot item이 500개 이상으로 늘어난다.
- 그룹 상세/조율 상세 p95가 1초 이상으로 반복된다.

## 4단계: 알림/푸시 확장

운영 초기에는 알림마다 EventBridge Scheduler schedule을 만드는 방식이 단순하고 추적하기 쉽다. 다만 일정/리마인드가 늘면 schedule 생성/삭제와 worker fanout이 병목이 된다.

전환 기준:

- 하루 생성/삭제 reminder job이 수천 개 이상이다.
- Scheduler Create/Delete TPS나 invocation throttle에 근접한다.
- 하나의 그룹 알림이 50명 이상에게 동시에 push fanout된다.
- worker Lambda duration과 retry가 증가한다.

장기 구조:

- due time 기준 GSI를 둔 reminder job table을 만들고, EventBridge periodic rule이 가까운 job을 조회한다.
- 발송은 SQS로 fanout하고 worker가 subscription 단위로 처리한다.
- 실패한 endpoint는 비동기로 정리한다.

## 당장 제안할 작업

1. Lambda concurrency quota를 50으로 올리는 신청을 준비하고, API/worker/AI reserved concurrency 분배안을 정한다.
2. 그룹 목록 metadata 조회와 알림/조율 목록 필터링의 실제 read 비용을 CloudWatch 지표와 부하테스트로 추적한다.
3. 사용자당 그룹 수 20개, 그룹 멤버 50명, 조율 응답 slot 500개 기준에 접근하면 batch get 또는 denormalized item/GSI 개선을 먼저 적용한다.
4. PWA 설치 안내 overlay가 주요 버튼 클릭을 막지 않도록 UI layer를 조정한다.
5. 이 문서의 k6/Playwright 시나리오를 배포 전 체크에 연결한다.
