# DynamoDB Single Table Design — Access Patterns

## 근본 목적

DynamoDB 단일 테이블의 key pattern과 운영 lookup 기준을 문서화해 이미지 업로드 상태처럼 새 엔티티가 추가되어도 백엔드, 운영 쿼리, 인프라 문서가 같은 저장 계약을 보도록 한다.

## 비목적

이 문서는 모든 도메인 필드를 완전한 ERD처럼 설명하거나 DynamoDB 모델을 RDB처럼 정규화하기 위한 문서가 아니다.

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
# │ GroupMember         │ GROUP#{groupId}              │ MEMBER#{userId}  │
# │ GroupJoinRequest    │ GROUP#{groupId}              │ JOIN_REQUEST#{userId} │
# │ Coordination        │ GROUP#{groupId}              │ COORD#{coordId}  │
# │ CoordinationResponse│ COORD#{coordId}              │ RESP#{userId}#.. │
# │ CommunityPost       │ POST#{postId}                │ METADATA         │
# │ CommunityComment    │ POST#{postId}                │ COMMENT#{ts}#{id}│
# │ CommunityPostLike   │ POST#{postId}                │ LIKE#{userId}    │
# │ ImageUpload         │ IMAGE#{imageId}              │ METADATA         │
# └─────────────────────┴──────────────────────────────┴──────────────────┘
#
# GSI1: schedules-by-time
#   PK: USER#{userId}  SK: startTime (ISO)
#
# GSI2: user-groups
#   PK: USER#{userId}  SK: GROUP#{groupId}
#
# GSI3: public-groups
#   PK: GROUP#PUBLIC  SK: CREATED_AT#{createdAt}#GROUP#{groupId}
#
# GSI4: group-schedules
#   PK: GROUP#{groupId}  SK: START#{startTime}#SCHEDULE#{scheduleId}
#
# GSI5: community-posts
#   PK: COMMUNITY#POSTS  SK: CREATED_AT#{createdAt}#POST#{postId}
#
# GSI6: group-posts
#   PK: GROUP#{groupId}#POSTS  SK: CREATED_AT#{createdAt}#POST#{postId}
#
# PartiQL reference:
# - SELECT * FROM "planner_prod_main" WHERE PK='USER#{userId}' AND SK='PROFILE'
# - SELECT * FROM "planner_prod_main" WHERE PK='GROUP#{groupId}' AND begins_with(SK, 'MEMBER#')
# - SELECT * FROM "planner_prod_main" WHERE PK='GROUP#{groupId}' AND begins_with(SK, 'JOIN_REQUEST#')
# - SELECT * FROM "planner_prod_main" WHERE PK='POST#{postId}' AND SK='METADATA'
# - SELECT * FROM "planner_prod_main" WHERE PK='POST#{postId}' AND begins_with(SK, 'COMMENT#')
# - SELECT * FROM "planner_prod_main" WHERE SK='METADATA' AND inviteCode='ABC123'
# - SELECT * FROM "planner_prod_main" WHERE PK='IMAGE#{imageId}' AND SK='METADATA'
#
# 운영 원칙:
# - hot path는 PK/SK/GSI 기반 조회를 유지한다.
# - 비정형 lookup이나 운영 점검성 조회는 PartiQL(SQL-like)로 맞춘다.
#
# 비용 최적화:
# - PAY_PER_REQUEST (온디맨드) → 트래픽 적을 때 최소 비용
# - Point-in-time recovery 활성화
# - Lambda SnapStart + ARM64(Graviton) → 콜드스타트 최소화 + 비용 절감
