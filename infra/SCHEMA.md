# DynamoDB Single Table Design — Access Patterns
#
# 이 프로젝트는 단일 DynamoDB 테이블(Single Table Design)을 사용합니다.
# 모든 엔티티가 하나의 테이블에 저장되며, PK/SK 패턴으로 구분합니다.
#
# ┌─────────────────────┬──────────────────────────────┬──────────────────┐
# │ Entity              │ PK                           │ SK               │
# ├─────────────────────┼──────────────────────────────┼──────────────────┤
# │ Profile             │ USER#{userId}                │ PROFILE          │
# │ Schedule            │ USER#{userId}                │ SCHEDULE#{id}    │
# │ NotificationSettings│ USER#{userId}                │ NOTIF_SETTINGS   │
# │ Notification        │ USER#{userId}                │ NOTIF#{ts}#{id}  │
# │ Group               │ GROUP#{groupId}              │ METADATA         │
# │ GroupMember          │ GROUP#{groupId}              │ MEMBER#{userId}  │
# │ Coordination        │ GROUP#{groupId}              │ COORD#{coordId}  │
# │ CoordinationResponse│ COORD#{coordId}              │ RESP#{userId}#.. │
# └─────────────────────┴──────────────────────────────┴──────────────────┘
#
# GSI1: schedules-by-time
#   PK: USER#{userId}  SK: startTime (ISO)
#
# GSI2: user-groups
#   PK: USER#{userId}  SK: GROUP#{groupId}
#
# 비용 최적화:
# - PAY_PER_REQUEST (온디맨드) → 트래픽 적을 때 최소 비용
# - Point-in-time recovery 활성화
# - Lambda SnapStart + ARM64(Graviton) → 콜드스타트 최소화 + 비용 절감
