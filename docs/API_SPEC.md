# Timelink — RESTful API 명세서

> **Base URL**: `/api/planner/v1`
> **AI Base URL**: `/api/ai/v1`
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
/api/planner/v1/{resource}/{id?}/{sub-resource?}/{sub-id?}
```

백엔드 헬스체크 `GET /health`는 API Gateway 원본 엔드포인트에서 사용하는 운영 점검 경로다. 프론트 커스텀 도메인의 `/health`는 SPA 라우팅 대상이므로 API 헬스체크 확인에는 API Gateway 원본 URL을 사용한다.

### JSON 필드명

API 요청/응답 JSON 필드명은 `camelCase`를 사용한다. DynamoDB 키나 내부 모델 필드는 문서의 저장소 설명에만 `snake_case` 또는 내부 키 이름으로 표기한다.

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
  "meta": {               // 페이지네이션 (목록 조회 시)
    "perPage": 20,
    "nextCursor": "opaque-cursor"
  }
}
```

### 공통 에러 응답
```json
{
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
| 400 | `VALIDATION_ERROR` | 유효성 검사 실패 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |

### 페이지네이션 쿼리 파라미터
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `cursor` | string | 없음 | 다음 페이지 커서 |
| `limit` | integer | 20 | 페이지 당 항목 수 |

정렬/필터 쿼리는 각 엔드포인트에 명시된 항목만 지원한다.

---

## 2. 인증 (Auth)

> 운영 인증은 소셜 OAuth 로그인으로 백엔드 JWT를 발급받는 방식이다.
> 백엔드(Spring Boot)는 `JwtAuthenticationFilter`에서 JWT를 검증하여 `userId`를 추출한다.
> `POST /auth/login`은 로컬/개발용 임시 로그인이며, 운영에서는 `auth.dev-login-enabled=false`가 기본값이라 `403 FORBIDDEN`을 반환한다.
> 소셜 로그인에서 받은 닉네임/프로필 이미지는 신규 프로필이거나 기존 값이 비어 있거나 시스템 생성 기본값인 경우에만 반영한다. 사용자가 직접 바꾼 닉네임/프로필 이미지는 이후 소셜 로그인으로 덮어쓰지 않는다.

| 기능 | 클라이언트 호출 | 설명 |
|------|----------------|------|
| 소셜 로그인 가능 여부 | `GET /auth/providers` | `google`, `kakao` 사용 가능 여부 |
| OAuth 시작 | `GET /auth/oauth/{provider}/start` | OAuth 제공자 동의 화면으로 `302` 리다이렉트 |
| OAuth 콜백 | `GET /auth/oauth/{provider}/callback` | 백엔드 JWT 발급 후 프론트 `/auth/callback`으로 `302` 리다이렉트 |
| 세션 복원 | `GET /auth/me` | 저장된 JWT 재검증 및 세션 복원 |
| 개발 로그인 | `POST /auth/login` | 로컬/개발 설정에서만 `userId`, `nickname`으로 JWT 발급 |
| 로그아웃 | 클라이언트 세션 삭제 | 서버 세션 저장소 없음 |
| API 호출 시 | `Authorization: Bearer <accessToken>` | 인증 필요 요청에 포함 |

#### `GET` /api/planner/v1/auth/providers

**Response** `200 OK`
```json
{
  "data": {
    "google": true,
    "kakao": true
  }
}
```

#### `GET` /api/planner/v1/auth/oauth/:provider/start

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `frontendOrigin` | string | ❌ | 콜백 후 돌아갈 프론트 Origin |
| `redirect` | string | ❌ | 로그인 완료 후 프론트 내부 이동 경로, 기본 `/` |

**Response** `302 Found` — OAuth 제공자 인증 URL로 이동

#### `GET` /api/planner/v1/auth/oauth/:provider/callback

OAuth 제공자가 호출하는 콜백. 성공 시 프론트 `/auth/callback#accessToken=...&userId=...&redirect=...&provider=...`로 이동한다.

#### `GET` /api/planner/v1/auth/me

**Response** `200 OK`
```json
{
  "data": {
    "accessToken": "jwt",
    "userId": "user-uuid"
  }
}
```

#### `POST` /api/planner/v1/auth/login

로컬/개발용 임시 로그인. 운영 기본 설정에서는 사용할 수 없다.

**Request Body**
```json
{
  "userId": "local_user",
  "nickname": "로컬 사용자"
}
```

**Response** `200 OK`
```json
{
  "data": {
    "accessToken": "jwt",
    "userId": "local_user"
  }
}
```

---

## 3. 프로필 (Profiles)

> 사용자 프로필. 소셜 로그인 또는 개발 로그인 시 없으면 자동 생성됩니다.

### 테이블: `profiles`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `string` PK | 백엔드가 발급하는 `userId` |
| `nickname` | `text` | 닉네임 (기본값: 이메일 앞부분) |
| `avatarUrl` | `text` | 프로필 이미지 URL |
| `termsVersion` | `text` | 동의한 서비스 이용약관 버전 |
| `termsAgreedAt` | `timestamptz` | 서비스 이용약관 동의 시각 |
| `privacyVersion` | `text` | 동의한 개인정보 처리방침 버전 |
| `privacyAgreedAt` | `timestamptz` | 개인정보 처리방침 동의 시각 |
| `requiredConsentCompleted` | `boolean` | 현재 필수 약관 동의 완료 여부 |
| `createdAt` | `timestamptz` | 생성일 |
| `updatedAt` | `timestamptz` | 수정일 |

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
    "avatarUrl": "https://...",
    "termsVersion": "2026-06-10",
    "termsAgreedAt": "2026-06-10T00:00:00Z",
    "privacyVersion": "2026-06-10",
    "privacyAgreedAt": "2026-06-10T00:00:00Z",
    "requiredConsentCompleted": true,
    "createdAt": "2026-03-08T00:00:00Z",
    "updatedAt": "2026-03-08T00:00:00Z"
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
  "avatarUrl": "https://..."
}
```

**Response** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "nickname": "새 닉네임",
    "avatarUrl": "https://...",
    "requiredConsentCompleted": true
  }
}
```

---

#### `POST` /api/planner/v1/profiles/me/consents/required

현재 필수 서비스 이용약관과 개인정보 처리방침 동의를 기록한다. 요청 바디는 없다.

**Response** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "nickname": "홍길동",
    "avatarUrl": "https://...",
    "termsVersion": "2026-06-10",
    "termsAgreedAt": "2026-06-10T00:00:00Z",
    "privacyVersion": "2026-06-10",
    "privacyAgreedAt": "2026-06-10T00:00:00Z",
    "requiredConsentCompleted": true
  }
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
| `has_alarm` | `boolean` | 알림 여부 (기본: false) |
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
| `startDate` | string (ISO) | ❌ | 범위 시작 일시 |
| `endDate` | string (ISO) | ❌ | 범위 종료 일시 |
| `limit` | integer | ❌ | 페이지 크기, 기본 20 |
| `cursor` | string | ❌ | 다음 페이지 커서 |

`startDate`와 `endDate`는 둘 다 제공된 경우에만 시간 범위 조회로 처리한다.

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "수강 신청",
      "content": "시간표 확인",
      "category": "task",
      "isImportant": true,
      "startTime": "2026-03-08T12:00:00Z",
      "endTime": "2026-03-08T15:00:00Z",
      "duration": 3,
      "isCompleted": false,
      "hasAlarm": true,
      "groupId": null,
      "createdAt": "2026-03-08T00:00:00Z",
      "updatedAt": "2026-03-08T00:00:00Z"
    }
  ],
  "meta": { "perPage": 20, "nextCursor": "opaque-cursor" }
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

종료 시간은 요청으로 받지 않고 `startTime + duration`으로 계산한다. `duration`이 없으면 1시간으로 저장하며, 계산된 종료 시간이 시작 날짜를 넘으면 `400 SCHEDULE_CROSSES_DAY`를 반환한다. `duration`은 시간 단위 숫자이며 0.5, 1, 1.5처럼 30분 단위의 양수만 허용한다.

**Request Body**
```json
{
  "title": "수강 신청",
  "content": "시간표 확인",
  "category": "task",
  "isImportant": true,
  "startTime": "2026-03-08T12:00:00Z",
  "duration": 3,
  "hasAlarm": true,
  "groupId": null
}
```

**Response** `201 Created`
```json
{
  "data": { "id": "uuid", "title": "수강 신청", ... }
}
```

**Errors**
- `400 INVALID_START_TIME` — `startTime` 형식이 ISO 일시가 아닌 경우
- `400 INVALID_DURATION` — `duration`이 30분 단위의 양수가 아닌 경우
- `400 SCHEDULE_CROSSES_DAY` — `startTime + duration`이 시작 날짜를 넘는 경우

---

#### `PATCH` /api/planner/v1/schedules/:id

일정 부분 수정

`startTime` 또는 `duration`이 변경되면 서버가 `endTime`을 다시 계산한다.

**Request Body** (변경할 필드만)
```json
{
  "title": "수강 신청 (수정)",
  "isCompleted": true
}
```

**Response** `200 OK`

`startTime` 또는 `duration`을 수정할 때도 생성과 동일하게 `INVALID_START_TIME`, `INVALID_DURATION`, `SCHEDULE_CROSSES_DAY` 검증이 적용된다.

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

초대 코드로 그룹 가입. 신규 가입자는 `member` 역할로 자동 등록된다. 이미 멤버인 사용자가 같은 초대 코드로 호출하면 오류가 아니라 기존 그룹 상세를 반환한다.

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
| `end_hour` | `integer` | 종료 시간 (1-24, `start_hour`보다 커야 함) |
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
| `limit` | integer | ❌ | 페이지 크기, 기본 20 |
| `cursor` | string | ❌ | 다음 페이지 커서 |

**Response** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "요구사항 명세서 회의",
      "mode": "once",
      "dates": ["2026-03-10", "2026-03-11"],
      "startHour": 9,
      "endHour": 18,
      "status": "active",
      "responseCount": 3,
      "createdBy": "uuid",
      "createdAt": "2026-03-08T00:00:00Z"
    }
  ],
  "meta": { "perPage": 20, "nextCursor": "opaque-cursor" }
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
    "startHour": 9,
    "endHour": 18,
    "status": "active",
    "heatmap": [
      { "date": "2026-03-10", "hour": 10, "count": 3, "users": ["홍길동", "김민수", "이서연"] },
      { "date": "2026-03-10", "hour": 11, "count": 2, "users": ["홍길동", "김민수"] }
    ],
    "myResponses": [
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
  "startHour": 9,
  "endHour": 18
}
```

**Response** `201 Created`

**Error** `400 INVALID_COORDINATION_REQUEST` — `mode`가 `once`/`repeat`가 아니거나, 날짜가 비어 있거나, 날짜 형식이 잘못되었거나, `startHour`/`endHour` 범위가 유효하지 않은 경우

---

#### `PATCH` /api/planner/v1/groups/:groupId/coordinations/:id

조율 수정/종료 (**그룹 멤버이면서 생성자만**)

**Request Body**
```json
{
  "status": "closed"
}
```

**Response** `200 OK`

**Error** `400 INVALID_COORDINATION_REQUEST` — `status`가 `active`/`closed`가 아닌 경우

---

#### `DELETE` /api/planner/v1/groups/:groupId/coordinations/:id

조율 삭제 (**그룹 멤버이면서 생성자만**)

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
    "submittedCount": 4
  }
}
```

> **설계 결정**: `PUT`을 사용하여 멱등하게 전체 교체한다. 서버는 제출 슬롯을 검증하고 중복 슬롯을 제거한 뒤 기존 응답을 삭제하고 새 응답을 저장한다.
> 슬롯 날짜는 조율의 `dates`에 포함되어야 하고, 시간은 `startHour <= hour < endHour` 범위여야 한다.

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
| `limit` | integer | ❌ | 페이지 크기, 기본 20 |
| `cursor` | string | ❌ | 다음 페이지 커서 |

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
      "isImportant": false,
      "isRead": false,
      "createdAt": "2026-03-08T09:00:00Z"
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
  "data": { "updatedCount": 3 }
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
| `group_alarm` | `boolean` | false | 그룹 알림 |
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
    "scheduleAlarm": false,
    "groupAlarm": false,
    "remindOneDayBefore": false,
    "remindOneDayBeforeTime": "22:00",
    "remindSameDay": false,
    "remindSameDayTime": "08:00",
    "importantAlarm": false,
    "importantAlarmTime": "08:00"
  }
}
```

---

#### `PATCH` /api/planner/v1/settings/notifications

알림 설정 수정 (변경할 필드만)

`scheduleAlarm`이 `false`인 상태에서 리마인드 설정(`remindOneDayBefore`, `remindSameDay`, `importantAlarm`)을 `true`로 켜려고 하면 서버는 `400 INVALID_NOTIFICATION_SETTINGS`를 반환한다. `scheduleAlarm`을 끄면 서버는 예약된 EventBridge Scheduler job을 정리하고, 다시 켰을 때 저장된 리마인드 설정을 기준으로 예약을 동기화한다.

**Request Body**
```json
{
  "scheduleAlarm": true,
  "remindSameDay": true,
  "remindSameDayTime": "09:00"
}
```

**Response** `200 OK`

---

## 11. 푸시 알림 (Push Notifications)

운영 알림은 알림센터 저장을 기본으로 하고, VAPID 설정과 브라우저 Push Subscription이 준비된 사용자는 Web Push도 함께 전송한다.

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

### Endpoints

---

#### `POST` /api/planner/v1/storage/images/group

그룹 이미지 업로드

**Request**: `multipart/form-data`
| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | 이미지 파일 (max 5MB) |

**Response** `200 OK`
```json
{
  "data": {
    "objectKey": "uploads/group/{userId}/{uuid}.jpg",
    "url": "https://.../uploads/group/{userId}/{uuid}.jpg"
  }
}
```

---

#### `POST` /api/planner/v1/storage/images/profile

프로필 아바타 업로드

**Request**: `multipart/form-data`
| 필드 | 타입 | 설명 |
|------|------|------|
| `file` | File | 이미지 파일 (max 5MB) |

**Response** `200 OK`
```json
{
  "data": {
    "objectKey": "uploads/profile/{userId}/{uuid}.jpg",
    "url": "https://.../uploads/profile/{userId}/{uuid}.jpg"
  }
}
```

---

## 13. AI 기능

### Endpoints

---

#### `POST` /api/ai/v1/extract-schedule

사진에서 일정 정보 AI 추출

`endDate`와 `endTime`은 추출 결과 보조값이다. 일정 생성 요청에는 종료 시간을 보내지 않고, 클라이언트가 `duration`을 사용하거나 추출된 시작/종료 차이로 소요시간을 계산한다. AI 서비스 응답은 백엔드 `CustomResponse` 래퍼 없이 객체를 직접 반환한다. 요청 형식이 맞지 않으면 FastAPI 기본 유효성 오류(`422`)가 반환된다.

**Request Body**
```json
{
  "imageBase64": "data:image/jpeg;base64,..."
}
```

**Response** `200 OK`
```json
{
  "title": "데이터베이스 과제",
  "content": "LAB 2 제출",
  "category": "task",
  "startDate": "2026-03-10",
  "startTime": "23:59",
  "endDate": "2026-03-10",
  "endTime": "23:59",
  "duration": 3,
  "isImportant": false
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
- 업로드 이미지는 S3 public assets bucket에 저장되고, 프론트는 해당 URL만 저장합니다.

---

## 16. 전체 엔드포인트 요약

| 메서드 | 엔드포인트 | 설명 | 권한 | 구현 상태 |
|--------|-----------|------|------|----------|
| `GET` | `/health` | 백엔드 헬스체크 | 공개 | ✅ |
| `GET` | `/auth/providers` | 소셜 로그인 제공자 사용 가능 여부 | 공개 | ✅ |
| `GET` | `/auth/oauth/:provider/start` | OAuth 인증 시작 | 공개 | ✅ |
| `GET` | `/auth/oauth/:provider/callback` | OAuth 콜백 처리 | 공개 | ✅ |
| `GET` | `/auth/me` | 세션 복원 | 인증 | ✅ |
| `POST` | `/auth/login` | 개발 로그인 | 개발 설정 | ✅ |
| `GET` | `/profiles/me` | 내 프로필 조회 | 인증 | ✅ |
| `PATCH` | `/profiles/me` | 프로필 수정 | 인증 | ✅ |
| `POST` | `/profiles/me/consents/required` | 필수 약관 동의 기록 | 인증 | ✅ |
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
| `GET` | `/push/vapid-public-key` | VAPID 공개키 조회 | 인증 | ✅ |
| `POST` | `/push/subscriptions` | Push Subscription 등록 | 인증 | ✅ |
| `DELETE` | `/push/subscriptions` | Push Subscription 삭제 | 인증 | ✅ |
| `POST` | `/storage/images/profile` | 프로필 이미지 업로드 | 인증 | ✅ |
| `POST` | `/storage/images/group` | 그룹 이미지 업로드 | 인증 | ✅ |
| `POST` | `/api/ai/v1/extract-schedule` | 사진 일정 추출 | 공개 | ✅ |

> **Base URL prefix**: `/api/planner/v1`
> **AI Base URL prefix**: `/api/ai/v1`
> **미구현**: 멤버 역할 변경(`PATCH /groups/:gid/members/:mid`), 멤버 내보내기(`DELETE /groups/:gid/members/:mid`)

---

*마지막 업데이트: 2026-06-11 (운영 인증, 약관 동의, 일정 시간/알림/AI 계약 정합성 반영)*
