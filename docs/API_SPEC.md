# 📅 일정관리 앱 — RESTful API 명세서

> **Base URL**: `api/planner/v1`  
> **인증**: 모든 요청에 `Authorization: Bearer <JWT>` 헤더 필요 (별도 명시 없는 한)  
> **Content-Type**: `application/json`

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
11. [파일 업로드 (Storage)](#11-파일-업로드-storage)
12. [데이터베이스 스키마](#12-데이터베이스-스키마)
13. [RLS 정책](#13-rls-정책)
14. [Realtime 구독](#14-realtime-구독)

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
    "page": 1,
    "per_page": 20,
    "total": 100
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
| `page` | integer | 1 | 페이지 번호 |
| `per_page` | integer | 20 | 페이지 당 항목 수 (max: 100) |

### 정렬 쿼리 파라미터
| 파라미터 | 타입 | 예시 | 설명 |
|----------|------|------|------|
| `sort` | string | `start_time` | 정렬 기준 필드 |
| `order` | string | `asc` / `desc` | 정렬 방향 (기본: asc) |

---

## 2. 인증 (Auth)

> 인증은 Lovable Cloud OAuth를 통해 처리. 프론트엔드에서 Supabase JWT를 획득한 뒤 `Authorization: Bearer <JWT>` 헤더로 백엔드에 전달.  
> 백엔드(Spring Boot)는 `JwtAuthenticationFilter`에서 토큰을 검증하여 `userId`를 추출.

| 기능 | 클라이언트 호출 | 설명 |
|------|----------------|------|
| Google 로그인 | `lovable.auth.signInWithOAuth('google')` | OAuth 리다이렉트 |
| 로그아웃 | `supabase.auth.signOut()` | 세션 종료 |
| 세션 복원 | `supabase.auth.getSession()` | JWT 토큰 복원 |
| 상태 변경 감지 | `supabase.auth.onAuthStateChange()` | 리스너 |
| API 호출 시 | `Authorization: Bearer <access_token>` | 모든 백엔드 요청에 포함 |

---

## 3. 프로필 (Profiles)

> 사용자 프로필. 회원가입 시 DB 트리거로 자동 생성.

### 테이블: `profiles`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` PK | `auth.users.id` 참조 |
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
| `user_id` | `uuid` FK | `auth.users.id` |
| `title` | `text` NOT NULL | 일정 제목 |
| `content` | `text` | 일정 내용/메모 |
| `category` | `schedule_category` | enum: task, appointment, group, important, repeat |
| `is_important` | `boolean` | 중요 여부 (기본: false) |
| `start_time` | `timestamptz` NOT NULL | 시작 시간 |
| `end_time` | `timestamptz` NOT NULL | 종료 시간 |
| `duration` | `real` | 소요 시간 (시간 단위) |
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
| `start_date` | string (ISO) | ❌ | 범위 시작일 |
| `end_date` | string (ISO) | ❌ | 범위 종료일 |
| `category` | string | ❌ | 카테고리 필터 |
| `is_completed` | boolean | ❌ | 완료 여부 필터 |
| `group_id` | uuid | ❌ | 그룹 일정 필터 |
| `sort` | string | ❌ | 기본: `start_time` |
| `order` | string | ❌ | 기본: `asc` |

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
  "meta": { "page": 1, "per_page": 20, "total": 5 }
}
```

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

**Request Body**
```json
{
  "title": "수강 신청",
  "content": "시간표 확인",
  "category": "task",
  "is_important": true,
  "start_time": "2026-03-08T12:00:00Z",
  "end_time": "2026-03-08T15:00:00Z",
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

내 그룹 목록 (내가 멤버인 그룹)

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "졸업 프로젝트",
      "description": "졸프 팀",
      "imageUrl": "https://...",
      "inviteCode": "ABC123",
      "memberCount": 4,
      "myRole": "manager",
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ]
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
  "imageUrl": "https://..."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | ✅ | 그룹 이름 |
| `description` | string | ❌ | 설명 |
| `imageUrl` | string | ❌ | 그룹 이미지 URL |

**Response** `201 Created` — GroupDetailResDTO 반환

---

#### `PATCH` /api/planner/v1/groups/:id

그룹 정보 수정. **manager만** 수행 가능.

**Request Body** (변경할 필드만)
```json
{
  "name": "졸업 프로젝트 (수정)",
  "description": "업데이트된 설명",
  "imageUrl": "https://..."
}
```

**Response** `200 OK` — GroupDetailResDTO 반환

**Error** `403 NOT_GROUP_MANAGER` — 관리자가 아닌 경우

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

### Endpoints

---

#### `GET` /api/planner/v1/groups/:groupId/coordinations

그룹 내 조율 목록

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `status` | string | ❌ | `active` / `closed` (기본: `active`) |

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

조율 생성

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
| `is_read` | boolean | ❌ | 읽음 필터 |

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
  "meta": { "page": 1, "per_page": 20, "total": 5 }
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
| `user_id` | `uuid` PK FK | — | `auth.users.id` |
| `schedule_alarm` | `boolean` | true | 일정 알림 |
| `group_alarm` | `boolean` | true | 그룹 알림 |
| `remind_one_day_before` | `boolean` | true | 1일 전 리마인드 |
| `remind_one_day_before_time` | `text` | '22:00' | 리마인드 시간 |
| `remind_same_day` | `boolean` | true | 당일 리마인드 |
| `remind_same_day_time` | `text` | '08:00' | 리마인드 시간 |
| `important_alarm` | `boolean` | true | 중요 일정 알림 |
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
    "schedule_alarm": true,
    "group_alarm": true,
    "remind_one_day_before": true,
    "remind_one_day_before_time": "22:00",
    "remind_same_day": true,
    "remind_same_day_time": "08:00",
    "important_alarm": true,
    "important_alarm_time": "08:00"
  }
}
```

---

#### `PATCH` /api/planner/v1/settings/notifications

알림 설정 수정 (변경할 필드만)

**Request Body**
```json
{
  "schedule_alarm": false,
  "remind_same_day_time": "09:00"
}
```

**Response** `200 OK`

---

## 11. 파일 업로드 (Storage)

### Endpoints

---

#### `POST` /api/planner/v1/storage/group-images

그룹 이미지 업로드

**Request**: `multipart/form-data`
| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | 이미지 파일 (max 5MB) |
| `group_id` | string | 그룹 ID |

**Response** `201 Created`
```json
{
  "data": {
    "url": "https://...public/group-images/uuid.jpg"
  }
}
```

---

#### `POST` /api/planner/v1/storage/avatars

프로필 아바타 업로드

**Request**: `multipart/form-data`
| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | 이미지 파일 (max 2MB) |

**Response** `201 Created`
```json
{
  "data": {
    "url": "https://...public/avatars/uuid.jpg"
  }
}
```

---

## 12. AI 기능

### Endpoints

---

#### `POST` /api/planner/v1/schedules/extract

사진에서 일정 정보 AI 추출

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

## 13. 데이터베이스 스키마

> **저장소**: Amazon DynamoDB (Single Table Design)  
> **테이블명**: `planner_main`  
> 상세 스키마는 `infra/SCHEMA.md` 참고

### 엔티티 관계
```
auth.users (Supabase 내장 - 인증 전용)
  ├── Profile (PK: USER#{userId}, SK: PROFILE)
  ├── NotificationSettings (PK: USER#{userId}, SK: NOTIF_SETTINGS)
  ├── Schedule (PK: USER#{userId}, SK: SCHEDULE#{id})
  ├── Notification (PK: USER#{userId}, SK: NOTIF#{id})
  └── GroupMember (GSI2PK: USER#{userId}, GSI2SK: GROUP#{groupId})
        └── Group (PK: GROUP#{groupId}, SK: METADATA)
              └── Coordination (PK: GROUP#{groupId}, SK: COORD#{id})
                    └── CoordinationResponse (PK: COORD#{coordId}, SK: RESP#{userId}#{date}#{hour})
```

### 프론트엔드 연동
- `src/services/api.ts`: 모든 API 호출을 관리하는 서비스 레이어
- `src/context/AppContext.tsx`: 인증 상태 감지 후 자동으로 백엔드에서 데이터 로드
- Mock 데이터 의존성 제거, 모든 CRUD는 백엔드 API 경유

### Enum 타입
```sql
CREATE TYPE schedule_category AS ENUM ('task', 'appointment', 'group', 'important', 'repeat');
CREATE TYPE member_role AS ENUM ('manager', 'member');
CREATE TYPE coordination_mode AS ENUM ('once', 'repeat');
CREATE TYPE coordination_status AS ENUM ('active', 'closed');
CREATE TYPE notification_type AS ENUM ('schedule', 'system');
```

---

## 14. RLS 정책 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `profiles` | 본인만 | 트리거 자동 | 본인만 | ❌ |
| `schedules` | 본인 + 그룹멤버 | 인증 사용자 | 본인만 | 본인만 |
| `groups` | 그룹 멤버만 | 인증 사용자 | manager만 | manager만 |
| `group_members` | 같은 그룹 멤버 | 본인/manager | manager만 | 본인/manager |
| `coordinations` | 그룹 멤버만 | 그룹 멤버 | 생성자만 | 생성자만 |
| `coordination_responses` | 그룹 멤버만 | 본인만 | 본인만 | 본인만 |
| `notifications` | 본인만 | service_role | 본인(is_read) | 본인만 |
| `notification_settings` | 본인만 | 트리거 자동 | 본인만 | ❌ |

---

## 15. Realtime 구독

| 테이블 | 이벤트 | 용도 |
|--------|--------|------|
| `coordination_responses` | INSERT, DELETE | 히트맵 실시간 반영 |
| `notifications` | INSERT | 새 알림 실시간 수신 |
| `group_members` | INSERT, DELETE | 멤버 변경 실시간 반영 |

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
| `PATCH` | `/groups/:id` | 그룹 수정 | manager | ✅ |
| `DELETE` | `/groups/:id` | 그룹 삭제 (멤버 cleanup 포함) | manager | ✅ |
| `POST` | `/groups/join` | 초대코드 가입 | 인증 | ✅ |
| `GET` | `/groups/:gid/members` | 멤버 목록 | 멤버 | ✅ |
| `DELETE` | `/groups/:gid/members/me` | 그룹 나가기 | 멤버 | ✅ |
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

> **Base URL prefix**: `api/planner/v1`  
> **미구현**: 멤버 역할 변경(`PATCH /groups/:gid/members/:mid`), 멤버 내보내기(`DELETE /groups/:gid/members/:mid`), 파일 업로드, AI 일정 추출은 별도 서비스(FastAPI)에서 처리

---

*마지막 업데이트: 2026-03-08 (그룹 join/update/leave/getMembers 엔드포인트 구현 반영)*
