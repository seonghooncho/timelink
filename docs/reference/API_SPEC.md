# Timelink — RESTful API 명세서

> **Base URL**: `api/planner/v1`  
> **인증**: 모든 요청에 `Authorization: Bearer <JWT>` 헤더 필요 (별도 명시 없는 한)  
> **Content-Type**: `application/json`

## 근본 목적

프론트엔드와 백엔드가 동일한 계약을 기준으로 개발되고 검증되도록 API 형태와 데이터 계약을 명확히 고정하는 것이 목적입니다.

## 비목적

구현체 내부 로직이나 인프라 세부 설정을 모두 설명하려는 문서는 아니며, 실제 코드와 분리된 중복 설계 문서를 늘리는 것이 목적도 아닙니다.

---

## 목차

1. [공통 규약](#1-공통-규약)
2. [인증 (Auth)](#2-인증-auth)
3. [프로필 (Profiles)](#3-프로필-profiles)
4. [일정 (Schedules)](#4-일정-schedules)
5. [그룹 (Groups)](#5-그룹-groups)
6. [그룹 멤버 (Group Members)](#6-그룹-멤버-group-members)
7. [시간 조율 (Coordinations)](#7-시간-조율-coordinations)
8. [시간 조율 응답 (Coordination Responses)](#8-시간-조율-응답-coordination-responses)
9. [알림 (Notifications)](#9-알림-notifications)
10. [알림 설정 (Notification Settings)](#10-알림-설정-notification-settings)
11. [푸시 알림 (Push Notifications)](#11-푸시-알림-push-notifications)
12. [파일 업로드 (Storage)](#12-파일-업로드-storage)
13. [AI 기능](#13-ai-기능)
14. [데이터베이스 스키마](#14-데이터베이스-스키마)
15. [DynamoDB / PartiQL 운영 기준](#15-dynamodb--partiql-운영-기준)
16. [전체 엔드포인트 요약](#16-전체-엔드포인트-요약)

---

## 1. 공통 규약

### URL 구조
```
api/planner/v1/{resource}/{id?}/{sub-resource?}/{sub-id?}
```

### HTTP 메서드 규칙
| 메서드 | 용도 | 멱등성 |
|--------|------|--------|
| `GET` | 리소스 조회 | ✅ |
| `POST` | 리소스 생성 | ❌ |
| `PUT` | 리소스 전체 교체 | ✅ |
| `PATCH` | 리소스 부분 수정 | ✅ |
| `DELETE` | 리소스 삭제 | ✅ |

### 공통 응답 형식
```json
{
  "data": { ... },        // 성공 시 데이터
  "error": null,          // 에러 메시지 (성공 시 null)
  "meta": {               // 페이지네이션 (목록 조회 시)
    "perPage": 20,
    "nextCursor": "opaque-cursor"
  }
}
```

### 공통 에러 응답
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다"
  }
}
```

| HTTP 상태 | 코드 | 설명 |
|-----------|------|------|
| 400 | `BAD_REQUEST` | 잘못된 요청 파라미터 |
| 401 | `UNAUTHORIZED` | 인증 필요 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 중복 리소스 |
| 422 | `VALIDATION_ERROR` | 유효성 검사 실패 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |

### 페이지네이션 쿼리 파라미터
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `cursor` | string | 없음 | 다음 페이지 커서 |
| `limit` | integer | 20 | 페이지 당 항목 수 (max: 100, 초과 시 100으로 제한) |

### 정렬 쿼리 파라미터
| 파라미터 | 타입 | 예시 | 설명 |
|----------|------|------|------|
| `sort` | string | `start_time` | 정렬 기준 필드 |
| `order` | string | `asc` / `desc` | 정렬 방향 (기본: asc) |

---

## 2. 인증 (Auth)

> 인증은 백엔드 `POST /api/planner/v1/auth/login`으로 세션 토큰을 발급받는 방식입니다.
> 백엔드(Spring Boot)는 `JwtAuthenticationFilter`에서 토큰을 검증하여 `userId`를 추출합니다.

| 기능 | 클라이언트 호출 | 설명 |
|------|----------------|------|
| 로그인 | `POST /auth/login` | `userId`, `nickname`으로 JWT 발급 |
| 세션 복원 | `GET /auth/me` | 저장된 JWT 재검증 및 세션 복원 |
| 로그아웃 | 클라이언트 세션 삭제 | 서버 세션 저장소 없음 |
| API 호출 시 | `Authorization: Bearer <access_token>` | 모든 백엔드 요청에 포함 |

---

## 3. 프로필 (Profiles)

> 사용자 프로필. 백엔드 로그인 시 없으면 자동 생성됩니다.

### 테이블: `profiles`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `string` PK | 백엔드가 발급하는 `userId` |
| `nickname` | `text` | 닉네임 (기본값: 이메일 앞부분) |
| `avatar_url` | `text` | 프로필 이미지 URL |
| `created_at` | `timestamptz` | 생성일 |
| `updated_at` | `timestamptz` | 수정일 |

### Endpoints

---

#### `GET` /api/planner/v1/profiles/me

내 프로필 조회

**Response** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "nickname": "홍길동",
    "avatar_url": "https://...",
    "created_at": "2026-03-08T00:00:00Z",
    "updated_at": "2026-03-08T00:00:00Z"
  }
}
```

---

#### `PATCH` /api/planner/v1/profiles/me

내 프로필 수정

**Request Body**
```json
{
  "nickname": "새 닉네임",
  "avatar_url": "https://..."
}
```

**Response** `200 OK`
```json
{
  "data": { "id": "uuid", "nickname": "새 닉네임", "avatar_url": "https://...", ... }
}
```

---

## 4. 일정 (Schedules)

> 사용자 개인 일정. 로그인 시 복원 필수.

### 테이블: `schedules`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` PK | 자동 생성 |
| `user_id` | `string` | 백엔드 JWT subject (`userId`) |
| `title` | `text` NOT NULL | 일정 제목 |
| `content` | `text` | 일정 내용/메모 |
| `category` | `schedule_category` | enum: task, appointment, group, important, repeat |
| `is_important` | `boolean` | 중요 여부 (기본: false) |
| `start_time` | `timestamptz` NOT NULL | 시작 시간 |
| `end_time` | `timestamptz` | `start_time + duration`으로 계산된 파생 종료 시간 |
| `duration` | `real` | 소요 시간 (시간 단위, 30분 단위, 기본 1시간) |
| `is_completed` | `boolean` | 완료 여부 (기본: false) |
| `has_alarm` | `boolean` | 알림 여부 (기본: true) |
| `group_id` | `uuid` FK nullable | 그룹 일정 시 그룹 ID |
| `created_at` | `timestamptz` | 생성일 |
| `updated_at` | `timestamptz` | 수정일 |

### Endpoints

---

#### `GET` /api/planner/v1/schedules

내 일정 목록 조회

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `startDate` | string (ISO) | ❌ | 범위 시작 시각 |
| `endDate` | string (ISO) | ❌ | 범위 종료 시각 |
| `cursor` | string | ❌ | 다음 페이지 커서 |
| `limit` | integer | ❌ | 기본 20, 최대 100 |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "수강 신청",
      "content": "시간표 확인",
      "category": "task",
      "is_important": true,
      "start_time": "2026-03-08T12:00:00Z",
      "end_time": "2026-03-08T15:00:00Z",
      "duration": 3,
      "is_completed": false,
      "has_alarm": true,
      "group_id": null,
      "created_at": "2026-03-08T00:00:00Z"
    }
  ],
  "meta": { "perPage": 20, "nextCursor": "opaque-cursor" }
}
```

`end_time`은 하위 호환 응답 필드다. 신규 화면의 시간 계산과 타임테이블 표시는 `start_time + duration`을 기준으로 한다.

---

#### `GET` /api/planner/v1/schedules/:id

일정 단건 조회

**Response** `200 OK`
```json
{
  "data": { "id": "uuid", "title": "수강 신청", ... }
}
```

---

#### `POST` /api/planner/v1/schedules

일정 생성

종료 시간은 요청으로 받지 않고 `start_time + duration`으로 계산한다. `duration`이 없으면 1시간으로 저장하며, 계산된 종료 시간이 시작 날짜를 넘으면 `400 SCHEDULE_CROSSES_DAY`를 반환한다.

**Request Body**
```json
{
  "title": "수강 신청",
  "content": "시간표 확인",
  "category": "task",
  "is_important": true,
  "start_time": "2026-03-08T12:00:00Z",
  "duration": 3,
  "has_alarm": true,
  "group_id": null
}
```

**Response** `201 Created`
```json
{
  "data": { "id": "uuid", "title": "수강 신청", ... }
}
```

---

#### `PATCH` /api/planner/v1/schedules/:id

일정 부분 수정

`start_time` 또는 `duration`이 변경되면 서버가 `end_time`을 다시 계산한다.

**Request Body** (변경할 필드만)
```json
{
  "title": "수강 신청 (수정)",
  "is_completed": true
}
```

**Response** `200 OK`

---

#### `DELETE` /api/planner/v1/schedules/:id

일정 삭제

**Response** `204 No Content`

---

## 5. 그룹 (Groups)

### DynamoDB 키 설계

| 엔티티 | PK | SK |
|--------|----|----|
| Group | `GROUP#{groupId}` | `METADATA` |
| GroupMember | `GROUP#{groupId}` | `MEMBER#{userId}` |

**GSI2** (사용자별 그룹 조회):  
| GSI2PK | GSI2SK |
|--------|--------|
| `USER#{userId}` | `GROUP#{groupId}` |

### Endpoints

---

#### `GET` /api/planner/v1/groups

내 그룹 목록 (내가 멤버인 그룹). 커서 페이지네이션을 사용하며 `limit` 기본값은 20, 최대값은 100입니다.

**Query Parameters**
| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `limit` | number | ❌ | 한 번에 조회할 개수. 기본 20, 최대 100 |
| `cursor` | string | ❌ | 다음 페이지 조회용 opaque cursor |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "졸업 프로젝트",
      "description": "졸프 팀",
      "imageUrl": "https://...",
      "imageId": "image-uuid",
      "imageStatus": "COMPLETED",
      "inviteCode": "ABC123",
      "memberCount": 4,
      "myRole": "manager",
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ],
  "meta": {
    "perPage": 20,
    "nextCursor": "opaque-cursor"
  }
}
```

---

#### `GET` /api/planner/v1/groups/:id

그룹 상세 (멤버 포함). **그룹 멤버만** 접근 가능.

**Response** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "name": "졸업 프로젝트",
    "description": "졸프 팀",
    "imageUrl": "https://...",
    "imageId": "image-uuid",
    "imageStatus": "COMPLETED",
    "inviteCode": "ABC123",
    "createdBy": "uuid",
    "members": [
      {
        "id": "member-uuid",
        "userId": "uuid",
        "role": "manager",
        "nickname": "홍길동",
        "avatarUrl": "https://...",
        "joinedAt": "2026-03-01T00:00:00Z"
      }
    ],
    "createdAt": "2026-03-01T00:00:00Z"
  }
}
```

**Error** `403 NOT_GROUP_MEMBER` — 멤버가 아닌 경우  
**Error** `404 GROUP_NOT_FOUND` — 존재하지 않는 그룹

---

#### `POST` /api/planner/v1/groups

그룹 생성. 생성자는 자동으로 `manager` 역할로 등록됨.

**Request Body**
```json
{
  "name": "졸업 프로젝트",
  "description": "졸프 팀",
  "imageId": "image-uuid"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | ✅ | 그룹 이름 |
| `description` | string | ❌ | 설명 |
| `imageId` | string | ❌ | `storage/images/presign`으로 생성한 이미지 업로드 ID |
| `imageUrl` | string | ❌ | 하위 호환용 그룹 이미지 URL |

**Response** `201 Created` — GroupDetailResDTO 반환

---

#### `PATCH` /api/planner/v1/groups/:id

그룹 정보 수정. **그룹 멤버라면** 수행 가능.

**Request Body** (변경할 필드만)
```json
{
  "name": "졸업 프로젝트 (수정)",
  "description": "업데이트된 설명",
  "imageId": "image-uuid"
}
```

**Response** `200 OK` — GroupDetailResDTO 반환

**Error** `403 NOT_GROUP_MEMBER` — 그룹 멤버가 아닌 경우

---

#### `DELETE` /api/planner/v1/groups/:id

그룹 삭제. **manager만** 수행 가능.  
> 그룹 삭제 시 모든 멤버 데이터도 함께 정리됩니다.

**Response** `204 No Content`

**Error** `403 NOT_GROUP_MANAGER` — 관리자가 아닌 경우

---

## 6. 그룹 멤버 (Group Members)

### Endpoints

---

#### `POST` /api/planner/v1/groups/join

초대 코드로 그룹 가입. `member` 역할로 자동 등록.

**Request Body**
```json
{
  "inviteCode": "ABC123"
}
```

**Response** `200 OK` — GroupDetailResDTO 반환 (가입한 그룹의 상세 정보)
```json
{
  "data": {
    "id": "uuid",
    "name": "졸업 프로젝트",
    "createdBy": "uuid",
    "members": [ ... ],
    "createdAt": "2026-03-01T00:00:00Z"
  }
}
```

**Error** `400 INVALID_INVITE_CODE` — 유효하지 않은 초대 코드  
**Error** `409 ALREADY_MEMBER` — 이미 그룹 멤버인 경우

---

#### `GET` /api/planner/v1/groups/:groupId/members

그룹 멤버 목록. **그룹 멤버만** 조회 가능.

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "member-uuid",
      "userId": "uuid",
      "role": "manager",
      "nickname": "홍길동",
      "avatarUrl": "https://...",
      "joinedAt": "2026-03-01T00:00:00Z"
    }
  ]
}
```

---

#### `DELETE` /api/planner/v1/groups/:groupId/members/me

그룹 나가기 (본인).

**Response** `204 No Content`

---

#### `DELETE` /api/planner/v1/groups/:groupId/members/:memberUserId`

그룹 멤버 내보내기. **manager만** 수행 가능.
자기 자신은 이 엔드포인트로 내보낼 수 없으며, 본인 탈퇴는 `/members/me`를 사용합니다.

**Response** `204 No Content`

**Error** `400 CANNOT_REMOVE_SELF` — 자기 자신을 내보내려는 경우
**Error** `403 NOT_GROUP_MANAGER` — 관리자가 아닌 경우
**Error** `403 NOT_GROUP_MEMBER` — 요청자 또는 대상자가 그룹 멤버가 아닌 경우

---

## 7. 시간 조율 (Coordinations)

### 테이블: `coordinations`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` PK | 자동 생성 |
| `group_id` | `uuid` FK | `groups.id` (CASCADE) |
| `created_by` | `uuid` FK | 생성자 |
| `title` | `text` NOT NULL | 조율 제목 |
| `mode` | `coordination_mode` | enum: once, repeat |
| `dates` | `text[]` | 후보 날짜 배열 |
| `start_hour` | `integer` | 시작 시간 (0-23) |
| `end_hour` | `integer` | 종료 시간 (0-23) |
| `status` | `coordination_status` | enum: active, closed |
| `created_at` | `timestamptz` | 생성일 |

**대상 정책**

- 시간 조율 대상은 해당 그룹의 전체 멤버다.
- 생성자는 그룹 멤버이므로 별도 선택 없이 항상 대상에 포함된다.
- 생성 요청은 `memberIds`, `participantIds` 같은 대상 선택 필드를 받지 않는다.
- 향후 일부 멤버 대상 조율을 도입하더라도 생성자가 빠져 있으면 서버가 자동 포함하는 정책을 따른다.

### Endpoints

---

#### `GET` /api/planner/v1/groups/:groupId/coordinations

그룹 내 조율 목록

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `status` | string | ❌ | `active` / `closed` (기본: `active`) |
| `cursor` | string | ❌ | 다음 페이지 커서 |
| `limit` | integer | ❌ | 기본 20, 최대 100 |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "요구사항 명세서 회의",
      "mode": "once",
      "dates": ["2026-03-10", "2026-03-11"],
      "start_hour": 9,
      "end_hour": 18,
      "status": "active",
      "response_count": 3,
      "created_by": "uuid",
      "created_at": "2026-03-08T00:00:00Z"
    }
  ]
}
```

---

#### `GET` /api/planner/v1/groups/:groupId/coordinations/:id

조율 상세 (히트맵 데이터 포함)

**Response** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "title": "요구사항 명세서 회의",
    "mode": "once",
    "dates": ["2026-03-10", "2026-03-11"],
    "start_hour": 9,
    "end_hour": 18,
    "status": "active",
    "heatmap": [
      { "date": "2026-03-10", "hour": 10, "count": 3, "users": ["홍길동", "김민수", "이서연"] },
      { "date": "2026-03-10", "hour": 11, "count": 2, "users": ["홍길동", "김민수"] }
    ],
    "my_responses": [
      { "date": "2026-03-10", "hour": 10 },
      { "date": "2026-03-10", "hour": 11 }
    ]
  }
}
```

---

#### `POST` /api/planner/v1/groups/:groupId/coordinations

그룹 전체 멤버를 대상으로 조율 생성

**Request Body**
```json
{
  "title": "요구사항 명세서 회의",
  "mode": "once",
  "dates": ["2026-03-10", "2026-03-11", "2026-03-12"],
  "start_hour": 9,
  "end_hour": 18
}
```

요청 바디에는 대상 멤버 목록을 포함하지 않는다. 조율 대상은 `groupId`에 속한 전체 멤버이며, 생성자도 자동 포함된다.

**Response** `201 Created`

---

#### `PATCH` /api/planner/v1/groups/:groupId/coordinations/:id

조율 수정/종료 (**생성자만**)

**Request Body**
```json
{
  "status": "closed"
}
```

**Response** `200 OK`

---

#### `DELETE` /api/planner/v1/groups/:groupId/coordinations/:id

조율 삭제 (**생성자만**)

**Response** `204 No Content`

---

## 8. 시간 조율 응답 (Coordination Responses)

### 테이블: `coordination_responses`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` PK | 자동 생성 |
| `coordination_id` | `uuid` FK | `coordinations.id` (CASCADE) |
| `user_id` | `uuid` FK | 응답자 |
| `date` | `text` | 날짜 (YYYY-MM-DD) |
| `hour` | `integer` | 시간 (0-23) |
| `created_at` | `timestamptz` | 응답일 |

**UNIQUE**: `(coordination_id, user_id, date, hour)`

### Endpoints

---

#### `PUT` /api/planner/v1/groups/:groupId/coordinations/:coordId/responses/me

내 가능 시간 일괄 제출 (기존 응답 교체)

**Request Body**
```json
{
  "slots": [
    { "date": "2026-03-10", "hour": 10 },
    { "date": "2026-03-10", "hour": 11 },
    { "date": "2026-03-10", "hour": 14 },
    { "date": "2026-03-11", "hour": 10 }
  ]
}
```

**Response** `200 OK`
```json
{
  "data": {
    "submitted_count": 4
  }
}
```

> **설계 결정**: `PUT`을 사용하여 멱등하게 전체 교체. 기존 응답 DELETE → 새 응답 INSERT 를 한 트랜잭션으로 처리.

---

#### `GET` /api/planner/v1/groups/:groupId/coordinations/:coordId/responses/me

내 응답 조회

**Response** `200 OK`
```json
{
  "data": {
    "slots": [
      { "date": "2026-03-10", "hour": 10 },
      { "date": "2026-03-10", "hour": 11 }
    ]
  }
}
```

---

#### `DELETE` /api/planner/v1/groups/:groupId/coordinations/:coordId/responses/me

내 응답 전체 삭제

**Response** `204 No Content`

---

## 9. 알림 (Notifications)

### 테이블: `notifications`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` PK | 자동 생성 |
| `user_id` | `uuid` FK | 수신자 |
| `type` | `notification_type` | enum: schedule, system |
| `title` | `text` NOT NULL | 알림 제목 |
| `content` | `text` | 알림 내용 |
| `category` | `schedule_category` nullable | 일정 카테고리 |
| `is_important` | `boolean` | 중요 여부 (기본: false) |
| `is_read` | `boolean` | 읽음 여부 (기본: false) |
| `created_at` | `timestamptz` | 생성일 |

### Endpoints

---

#### `GET` /api/planner/v1/notifications

내 알림 목록

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `type` | string | ❌ | `schedule` / `system` |
| `isRead` | boolean | ❌ | 읽음 필터 |
| `cursor` | string | ❌ | 다음 페이지 커서 |
| `limit` | integer | ❌ | 기본 20, 최대 100 |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "schedule",
      "title": "데이터베이스 LAB 2",
      "content": "마감까지 3시간 전 입니다",
      "category": "task",
      "is_important": false,
      "is_read": false,
      "created_at": "2026-03-08T09:00:00Z"
    }
  ],
  "meta": { "perPage": 20, "nextCursor": "opaque-cursor" }
}
```

---

#### `PATCH` /api/planner/v1/notifications/:id/read

알림 읽음 처리

**Response** `200 OK`

---

#### `PATCH` /api/planner/v1/notifications/read-all

전체 알림 읽음 처리

**Response** `200 OK`
```json
{
  "data": { "updated_count": 3 }
}
```

---

#### `DELETE` /api/planner/v1/notifications/:id

알림 삭제

**Response** `204 No Content`

---

## 10. 알림 설정 (Notification Settings)

### 테이블: `notification_settings`

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `user_id` | `string` PK | — | 백엔드 JWT subject (`userId`) |
| `schedule_alarm` | `boolean` | false | 일정 알림 |
| `group_alarm` | `boolean` | true | 하위 호환용 그룹 알림 필드. 알림센터 그룹 알림은 기본 생성되고, 푸시 발송 여부는 `push_alarm`을 기준으로 한다. |
| `push_alarm` | `boolean` | false | Web Push 발송 여부 |
| `remind_one_day_before` | `boolean` | false | 1일 전 리마인드 |
| `remind_one_day_before_time` | `text` | '22:00' | 리마인드 시간 |
| `remind_same_day` | `boolean` | false | 당일 리마인드 |
| `remind_same_day_time` | `text` | '08:00' | 리마인드 시간 |
| `important_alarm` | `boolean` | false | 중요 일정 알림 |
| `important_alarm_time` | `text` | '08:00' | 알림 시간 |
| `updated_at` | `timestamptz` | now() | 수정일 |

### Endpoints

---

#### `GET` /api/planner/v1/settings/notifications

내 알림 설정 조회

**Response** `200 OK`
```json
{
  "data": {
    "schedule_alarm": false,
    "group_alarm": true,
    "push_alarm": false,
    "remind_one_day_before": false,
    "remind_one_day_before_time": "22:00",
    "remind_same_day": false,
    "remind_same_day_time": "08:00",
    "important_alarm": false,
    "important_alarm_time": "08:00"
  }
}
```

---

#### `PATCH` /api/planner/v1/settings/notifications

알림 설정 수정 (변경할 필드만)

`schedule_alarm`이 `false`이면 리마인드 알림과 예약 일정 알림은 알림센터에도 저장되지 않는다. `push_alarm`은 알림센터 저장 여부와 별개로 Web Push 발송 여부만 제어한다. `group_alarm`은 과거 클라이언트 호환용이며 신규 클라이언트는 직접 수정하지 않는다.

**Request Body**
```json
{
  "schedule_alarm": false,
  "push_alarm": true,
  "remind_same_day_time": "09:00"
}
```

**Response** `200 OK`

---

## 11. 푸시 알림 (Push Notifications)

그룹 활동 알림은 알림센터 저장을 기본으로 한다. 일정 알림은 사용자가 `schedule_alarm`을 켠 경우에만 예약 알림을 생성한다. Web Push는 `push_alarm`과 브라우저 Push Subscription이 준비된 사용자에게만 함께 전송한다.

일정 알림은 운영 초기 기준으로 알림 job마다 EventBridge Scheduler one-time schedule을 생성한다. Scheduler는 notification worker Lambda를 호출하고, Lambda는 DynamoDB 알림 저장과 Web Push 전송을 수행한다.

### DynamoDB 키 설계

| 엔티티 | PK | SK | 설명 |
|--------|----|----|------|
| Push Subscription | `USER#{userId}` | `PUSH_SUB#{endpointHash}` | 브라우저 push endpoint와 keys |
| Reminder Job | `USER#{userId}` | `REMINDER_JOB#{type}-{scheduleId}` | EventBridge Scheduler 예약 추적 |

### Endpoints

---

#### `GET` /api/planner/v1/push/vapid-public-key

브라우저 Push Subscription 생성에 사용할 VAPID 공개키 조회

**Response** `200 OK`
```json
{
  "data": {
    "enabled": true,
    "publicKey": "B..."
  }
}
```

---

#### `POST` /api/planner/v1/push/subscriptions

현재 브라우저의 Push Subscription 등록/갱신

**Request Body**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "B...",
    "auth": "..."
  },
  "userAgent": "Mozilla/5.0 ..."
}
```

**Response** `200 OK`

---

#### `DELETE` /api/planner/v1/push/subscriptions

현재 브라우저의 Push Subscription 삭제

**Request Body**: `POST /push/subscriptions`와 동일

**Response** `204 No Content`

### 운영 설정

| 설정 | 설명 |
|------|------|
| `aws.scheduler.group-name` | EventBridge Scheduler schedule group |
| `aws.scheduler.target-arn` | notification worker Lambda alias ARN |
| `aws.scheduler.role-arn` | Scheduler가 Lambda를 invoke할 IAM role ARN |
| `push.vapid.public-key` | 브라우저 구독용 VAPID 공개키 |
| `push.vapid.private-key` | Web Push 서명용 VAPID 비공개키 (SSM SecureString 권장) |
| `push.subject` | VAPID subject (`mailto:` 또는 URL) |

---

## 12. 파일 업로드 (Storage)

이미지는 새 파이프라인 기준으로 `upload/` prefix에 임시 업로드한 뒤 Lambda가 WebP로 변환한다. 변환 결과는 용도별 public prefix에 저장된다.

- 임시 원본: `upload/`
- 프로필/멤버 결과: `public/member/`
- 그룹 결과: `public/group/`
- 일정 결과: `public/schedule/`
- 허용 타입: `jpg`, `jpeg`, `png`, `webp`
- 최대 크기: 15MB
- 처리 상태: `PROCESSING`, `COMPLETED`, `FAILED`

### Endpoints

---

#### `POST` /api/planner/v1/storage/images/presign

이미지 업로드용 presigned PUT URL을 발급한다. 클라이언트는 응답의 `uploadUrl`로 파일을 PUT 하고, 이후 `imageId`를 프로필/그룹/일정 수정 요청에 전달한다.

**Request Body**
```json
{
  "purpose": "GROUP",
  "fileName": "group.png",
  "contentType": "image/png",
  "contentLength": 123456,
  "targetId": "optional-target-id"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `purpose` | enum | ✅ | `MEMBER`, `GROUP`, `SCHEDULE` |
| `fileName` | string | ✅ | 원본 파일명 |
| `contentType` | string | ✅ | `image/jpeg`, `image/png`, `image/webp` |
| `contentLength` | number | ✅ | 15MB 이하 |
| `targetId` | string | ❌ | 이미 대상 ID가 있을 때만 전달 |

**Response** `200 OK`
```json
{
  "data": {
    "imageId": "image-uuid",
    "uploadKey": "upload/group/user-1/image-uuid/original.png",
    "uploadUrl": "https://s3-presigned-url",
    "method": "PUT",
    "headers": {
      "Content-Type": "image/png",
      "x-amz-meta-image-id": "image-uuid",
      "x-amz-meta-purpose": "GROUP",
      "x-amz-meta-owner-user-id": "user-1"
    },
    "maxSizeBytes": 15728640,
    "status": "PROCESSING"
  }
}
```

---

#### `GET` /api/planner/v1/storage/images/:imageId

이미지 변환 상태를 조회한다.

**Response** `200 OK`
```json
{
  "data": {
    "imageId": "image-uuid",
    "uploadKey": "upload/group/user-1/image-uuid/original.png",
    "publicKey": "public/group/group-1/image-uuid.webp",
    "url": "https://timelink.cloud/public/group/group-1/image-uuid.webp",
    "status": "COMPLETED",
    "failureReason": null
  }
}
```

---

#### `POST` /api/planner/v1/storage/images/group

그룹 이미지 multipart 업로드. Deprecated 하위 호환용이며 신규 클라이언트는 반드시 presigned 업로드를 사용한다.

**Request**: `multipart/form-data`
| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | 이미지 파일 (max 15MB) |

**Response** `200 OK`
```json
{
  "data": {
    "objectKey": "group/{userId}/{uuid}.jpg",
    "url": "https://.../group/{userId}/{uuid}.jpg"
  }
}
```

---

#### `POST` /api/planner/v1/storage/images/profile

프로필 아바타 multipart 업로드. Deprecated 하위 호환용이며 신규 클라이언트는 반드시 presigned 업로드를 사용한다.

**Request**: `multipart/form-data`
| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | 이미지 파일 (max 15MB) |

**Response** `200 OK`
```json
{
  "data": {
    "objectKey": "profile/{userId}/{uuid}.jpg",
    "url": "https://.../profile/{userId}/{uuid}.jpg"
  }
}
```

---

## 13. AI 기능

### Endpoints

---

#### `POST` /api/planner/v1/schedules/extract

사진에서 일정 정보 AI 추출

`end_date`와 `end_time`은 추출 결과 보조값이다. 일정 생성 요청에는 종료 시간을 보내지 않고, 클라이언트가 `duration`을 사용하거나 추출된 시작/종료 차이로 소요시간을 계산한다.

**Request Body**
```json
{
  "image_base64": "data:image/jpeg;base64,..."
}
```

**Response** `200 OK`
```json
{
  "data": {
    "title": "데이터베이스 과제",
    "content": "LAB 2 제출",
    "category": "task",
    "start_date": "2026-03-10",
    "start_time": "23:59",
    "end_date": "2026-03-10",
    "end_time": "23:59",
    "duration": 3,
    "is_important": false
  }
}
```

---

## 14. 데이터베이스 스키마

> **저장소**: Amazon DynamoDB (Single Table Design)
> **테이블명**: `planner_{environment}_main`
> 상세 스키마는 `infra/terraform/minimum/SCHEMA.md` 참고

### 엔티티 관계
```
auth-session (JWT subject = userId)
  ├── Profile (PK: USER#{userId}, SK: PROFILE)
  ├── NotificationSettings (PK: USER#{userId}, SK: NOTIF_SETTINGS)
  ├── PushSubscription (PK: USER#{userId}, SK: PUSH_SUB#{endpointHash})
  ├── ReminderJob (PK: USER#{userId}, SK: REMINDER_JOB#{type}-{scheduleId})
  ├── Schedule (PK: USER#{userId}, SK: SCHEDULE#{id})
  ├── Notification (PK: USER#{userId}, SK: NOTIF#{id})
  └── GroupMember (GSI2PK: USER#{userId}, GSI2SK: GROUP#{groupId})
        └── Group (PK: GROUP#{groupId}, SK: METADATA)
              └── Coordination (PK: GROUP#{groupId}, SK: COORD#{id})
                    └── CoordinationResponse (PK: COORD#{coordId}, SK: RESP#{userId}#{date}#{hour})
```

### 프론트엔드 연동
- `fe/src/services/api.ts`: 모든 API 호출을 관리하는 서비스 레이어
- `fe/src/context/AppContext.tsx`: 인증 상태 감지 후 자동으로 백엔드에서 데이터 로드
- Mock 데이터 의존성 제거, 모든 CRUD는 백엔드 API 경유

## 15. DynamoDB / PartiQL 운영 기준

- DynamoDB는 단일 테이블 설계를 사용하며 hot path는 PK/SK/GSI 질의를 유지합니다.
- 운영 점검이나 비정형 lookup은 `infra/terraform/minimum/SCHEMA.md`의 PartiQL 예시를 기준으로 확인합니다.
- 업로드 이미지는 S3 public assets bucket의 `upload/`에 임시 저장되고, Lambda WebP 변환 후 `public/{member|group|schedule}/` URL과 `imageStatus`를 저장합니다.

---

## 16. 전체 엔드포인트 요약

| 메서드 | 엔드포인트 | 설명 | 권한 | 구현 상태 |
|--------|-----------|------|------|----------|
| `GET` | `/profiles/me` | 내 프로필 조회 | 인증 | ✅ |
| `PATCH` | `/profiles/me` | 프로필 수정 | 인증 | ✅ |
| `GET` | `/schedules` | 일정 목록 | 인증 | ✅ |
| `GET` | `/schedules/:id` | 일정 상세 | 인증(본인) | ✅ |
| `POST` | `/schedules` | 일정 생성 | 인증 | ✅ |
| `PATCH` | `/schedules/:id` | 일정 수정 | 인증(본인) | ✅ |
| `DELETE` | `/schedules/:id` | 일정 삭제 | 인증(본인) | ✅ |
| `GET` | `/groups` | 내 그룹 목록 | 인증 | ✅ |
| `GET` | `/groups/:id` | 그룹 상세 | 멤버 | ✅ |
| `POST` | `/groups` | 그룹 생성 | 인증 | ✅ |
| `PATCH` | `/groups/:id` | 그룹 수정 | 멤버 | ✅ |
| `DELETE` | `/groups/:id` | 그룹 삭제 (멤버 cleanup 포함) | manager | ✅ |
| `POST` | `/groups/join` | 초대코드 가입 | 인증 | ✅ |
| `GET` | `/groups/:gid/members` | 멤버 목록 | 멤버 | ✅ |
| `DELETE` | `/groups/:gid/members/me` | 그룹 나가기 | 멤버 | ✅ |
| `DELETE` | `/groups/:gid/members/:memberUserId` | 멤버 내보내기 | manager | ✅ |
| `GET` | `/groups/:gid/coordinations` | 조율 목록 | 멤버 | ✅ |
| `GET` | `/groups/:gid/coordinations/:id` | 조율 상세 | 멤버 | ✅ |
| `POST` | `/groups/:gid/coordinations` | 조율 생성 | 멤버 | ✅ |
| `PATCH` | `/groups/:gid/coordinations/:id` | 조율 수정 | 생성자 | ✅ |
| `DELETE` | `/groups/:gid/coordinations/:id` | 조율 삭제 | 생성자 | ✅ |
| `PUT` | `/groups/:gid/coordinations/:cid/responses/me` | 응답 제출 | 멤버 | ✅ |
| `GET` | `/groups/:gid/coordinations/:cid/responses/me` | 내 응답 조회 | 멤버 | ✅ |
| `DELETE` | `/groups/:gid/coordinations/:cid/responses/me` | 응답 삭제 | 멤버 | ✅ |
| `GET` | `/notifications` | 알림 목록 | 인증 | ✅ |
| `PATCH` | `/notifications/:id/read` | 읽음 처리 | 인증(본인) | ✅ |
| `PATCH` | `/notifications/read-all` | 전체 읽음 | 인증 | ✅ |
| `DELETE` | `/notifications/:id` | 알림 삭제 | 인증(본인) | ✅ |
| `GET` | `/settings/notifications` | 알림 설정 조회 | 인증 | ✅ |
| `PATCH` | `/settings/notifications` | 알림 설정 수정 | 인증 | ✅ |
| `GET` | `/push/vapid-public-key` | VAPID 공개키 조회 | 인증 | ✅ |
| `POST` | `/push/subscriptions` | Push Subscription 등록 | 인증 | ✅ |
| `DELETE` | `/push/subscriptions` | Push Subscription 삭제 | 인증 | ✅ |
| `POST` | `/storage/images/presign` | 이미지 presigned 업로드 URL 발급 | 인증 | ✅ |
| `GET` | `/storage/images/:imageId` | 이미지 처리 상태 조회 | 인증(소유자) | ✅ |
| `POST` | `/storage/images/profile` | 프로필 이미지 multipart 업로드(deprecated 하위 호환) | 인증 | ✅ |
| `POST` | `/storage/images/group` | 그룹 이미지 multipart 업로드(deprecated 하위 호환) | 인증 | ✅ |

> **Base URL prefix**: `api/planner/v1`  
> **미구현**: 멤버 역할 변경(`PATCH /groups/:gid/members/:mid`)

---

*마지막 업데이트: 2026-06-12 (이미지 presigned 업로드 및 WebP 처리 상태 API 반영)*
