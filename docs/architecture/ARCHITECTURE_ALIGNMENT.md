# 아키텍처 정합성 점검

## 근본 목적

프론트엔드, 백엔드, 인프라가 같은 호출 경로와 데이터 계약을 바라보도록 맞춰서, 개발 중에는 로컬 실행이 끊기지 않고 배포 후에는 경로 불일치 때문에 기능이 죽는 상황을 줄이는 것이 목적입니다.

## 비목적

이 문서는 모든 세부 구현을 다시 설명하거나 당장 하지 않을 리팩터링까지 강제로 수행하기 위한 문서가 아니며, 현재 구조와 직접 연결되지 않은 미관성 정리를 나열하는 것도 목적이 아닙니다.

## 현재 반영된 정리

- 프론트 인증은 기존 외부 인증 의존을 제거하고 백엔드 `auth` API 기반 세션으로 전환했다.
- 프로필/그룹/일정/모임 소개/모임 글 이미지 업로드는 백엔드 `storage` API에서 presigned URL을 발급하고, S3 `upload/` 이벤트 기반 Lambda가 WebP로 변환해 `public/{member|group|schedule|group-intro|group-post|community-post}/`에 저장하는 흐름으로 통일했다. 프로필류와 모임 대표 이미지는 작은 화면용 thumbnail variant도 함께 저장한다.
- 프론트는 `CloudFront + S3`, 백엔드와 AI는 `API Gateway + Lambda` 경로가 되도록 인프라 라우팅을 명시적으로 정리했다.
- 로컬 개발은 Vite proxy, 배포는 CloudFront `/api/* -> API Gateway` 라우팅으로 경로를 맞췄다.
- 인프라는 프론트 정적 호스팅 버킷과 업로드 이미지 버킷을 분리했다.
- Terraform은 `infra/terraform/init`에서 remote state(S3 + DynamoDB lock)를 먼저 만들고, `infra/terraform/minimum`에서 앱 스택을 관리하도록 분리했다.
- 백엔드와 AI의 런타임 설정은 Lambda env 직접 주입 대신 SSM Parameter Store에서 읽도록 전환했다.
- DynamoDB 문서는 PartiQL 기준 운영 예시를 함께 남기고, 런타임 hot path는 단일 테이블 키 조회를 유지한다.
- 그룹 초대 링크는 `inviteCode` 기반 join 라우트와 로그인 후 복귀 경로까지 연결했다.
- 그룹 일정 생성은 `groupId`와 선택 참여자 목록을 전달하도록 정리했고, 생성자는 자동 포함되며 선택 참여자의 개인 캘린더에 일정 사본을 만든다.
- 모임 일정 사본은 `groupScheduleId`와 참여자 인덱스로 묶어 작성자 수정/삭제 전파와 참여자별 `약속 빠지기`를 구분한다.
- 시간 조율 대상은 그룹 전체 멤버로 정의했고, 프론트의 멤버 선택 UI와 더미 `members` 상태를 제거했다.
- 조율 목록의 응답 수는 백엔드 `responseCount` 값을 프론트 목록 화면에서 그대로 사용하도록 연결했다.
- 프론트 공통 request 레이어가 목록 API의 `meta.nextCursor`를 유지하도록 맞췄다.
- 프론트의 일정/알림/조율 목록은 기본 화면 진입 시 모든 페이지를 합치지 않고, 범위 조회와 `limit/cursor` 기반 더보기로 가져오도록 정리했다.
- AI 컨테이너 이미지는 일반 Python 이미지가 아니라 AWS Lambda Python base image를 사용하도록 수정했다.
- 운영 부하테스트와 Playwright 서버리스 흐름 검증은 `test/k6`, `test/playwright` 하위에 재현 가능한 테스트 코드로 추가했다.
- 그룹 초대코드는 `INVITE#code` mapping item과 조건부 쓰기로 유일성을 보장하고, join 시 scan 없이 invite mapping을 조회한다.

## 즉시 수정이 필요한 항목

- 라우팅/API 계약 불일치 중 즉시 수정이 필요한 항목은 없다.
- 다만 모바일 앱은 Web Push 구독을 직접 만들지 않으므로, `pushAlarm` 설정값 동기화와 앱 자체 APNs/FCM 푸시 전달은 분리해서 봐야 한다.

## 추후 구조 개선 후보

- 그룹 목록은 현재 membership 조회 뒤 그룹 metadata를 추가 조회하므로, 그룹 수가 커지면 목록 표시 필드를 membership에 denormalize하거나 batch get으로 묶어야 한다.
- 알림/조율 목록은 일부 필터를 페이지 조회 뒤 메모리에서 적용하므로, 데이터가 늘면 필터 조건을 반영한 key 또는 GSI가 필요하다.
- 조율 상세 heatmap은 응답 전체를 매번 읽어 계산하므로, 응답 slot이 많아지면 slot별 집계 item을 별도로 유지해야 한다.
- 그룹 멤버 목록은 현재 전체 배열을 반환하므로, 그룹 규모가 커지면 cursor pagination 계약을 추가해야 한다.
- 커스텀 도메인 `/health`는 CloudFront SPA fallback으로 처리될 수 있으므로, 운영 헬스체크는 API Gateway `/health`를 기준으로 두거나 `/api/planner/v1/health` 같은 API 경로를 별도 계약으로 추가하는 편이 낫다.
- 프론트의 오래된 공용 타입은 실제 서비스 API 타입과 분리되어 남아 있을 수 있으므로, 기능 단위로 더 이상 쓰지 않는 타입을 계속 제거한다.
- 백엔드 컨트롤러의 `AuthUtil.getCurrentUserId()` 반복은 `@CurrentUserId` 같은 argument resolver로 줄일 수 있다.
- PWA 설치 안내 같은 상단 overlay는 일부 화면의 핵심 탭을 가릴 수 있으므로, 레이어 규칙과 safe area 여백을 계속 점검한다.
