# DynamoDB Single Table Design — Access Patterns
#
# 이 프로젝트는 단일 DynamoDB 테이블(Single Table Design)을 사용합니다.
# 모든 엔티티가 하나의 테이블에 저장되며, PK/SK 패턴으로 구분합니다.

## 근본 목적

운영 DynamoDB 테이블의 실제 PK/SK/GSI 접근 패턴을 빠르게 확인할 수 있게 해서, 장애 조사나 데이터 점검 시 잘못된 키로 조회하는 시간을 줄이는 것이 목적입니다.

## 비목적

이 문서는 애플리케이션의 모든 필드 정의를 중복 설명하거나 DynamoDB 외 저장소 설계를 제안하기 위한 문서가 아닙니다.

## 키 패턴

#
# ┌─────────────────────┬──────────────────────────────┬──────────────────┐
# │ Entity              │ PK                           │ SK               │
# ├─────────────────────┼──────────────────────────────┼──────────────────┤
# │ Profile             │ USER#{userId}                │ PROFILE          │
# │ Schedule            │ USER#{userId}                │ SCHEDULE#{id}    │
# │ NotificationSettings│ USER#{userId}                │ NOTIF_SETTINGS   │
# │ Notification        │ USER#{userId}                │ NOTIF#{id}       │
# │ PushSubscription    │ USER#{userId}                │ PUSH_SUB#{hash}  │
# │ ReminderJob         │ USER#{userId}                │ REMINDER_JOB#..  │
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
# PartiQL reference:
# - SELECT * FROM "planner_prod_main" WHERE PK='USER#{userId}' AND SK='PROFILE'
# - SELECT * FROM "planner_prod_main" WHERE PK='USER#{userId}' AND begins_with(SK, 'SCHEDULE#')
# - SELECT * FROM "planner_prod_main" WHERE PK='USER#{userId}' AND begins_with(SK, 'NOTIF#')
# - SELECT * FROM "planner_prod_main" WHERE PK='USER#{userId}' AND begins_with(SK, 'PUSH_SUB#')
# - SELECT * FROM "planner_prod_main" WHERE PK='USER#{userId}' AND begins_with(SK, 'REMINDER_JOB#')
# - SELECT * FROM "planner_prod_main" WHERE PK='GROUP#{groupId}' AND begins_with(SK, 'MEMBER#')
# - SELECT * FROM "planner_prod_main" WHERE SK='METADATA' AND inviteCode='ABC123'
#
# 운영 원칙:
# - hot path는 PK/SK/GSI 기반 조회를 유지한다.
# - 비정형 lookup이나 운영 점검성 조회는 PartiQL(SQL-like)로 맞춘다.
#
# 비용 최적화:
# - PAY_PER_REQUEST (온디맨드) → 트래픽 적을 때 최소 비용
# - Point-in-time recovery 활성화
# - Lambda SnapStart + ARM64(Graviton) → 콜드스타트 최소화 + 비용 절감
