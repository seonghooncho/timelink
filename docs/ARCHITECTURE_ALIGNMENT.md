# 아키텍처 정합성 점검

## 근본 목적

프론트엔드, 백엔드, 인프라가 같은 호출 경로와 데이터 계약을 바라보도록 맞춰서, 개발 중에는 로컬 실행이 끊기지 않고 배포 후에는 경로 불일치 때문에 기능이 죽는 상황을 줄이는 것이 목적입니다.

## 비목적

이 문서는 모든 세부 구현을 다시 설명하거나 당장 하지 않을 리팩터링까지 강제로 수행하기 위한 문서가 아니며, 현재 구조와 직접 연결되지 않은 미관성 정리를 나열하는 것도 목적이 아닙니다.

## 현재 반영된 정리

- 프론트 인증은 백엔드 `auth` API 기반 세션으로 통일했고, 운영 로그인은 Google/Kakao OAuth가 백엔드 JWT를 발급하는 흐름으로 정리했다.
- 프로필/그룹 이미지 업로드는 프론트 직접 저장소 호출이 아니라 백엔드 `storage` API로 통일했다.
- 프론트는 `CloudFront + S3`, 백엔드와 AI는 `API Gateway + Lambda` 경로가 되도록 인프라 라우팅을 명시적으로 정리했다.
- 로컬 개발은 Vite proxy, 배포는 CloudFront `/api/* -> API Gateway` 라우팅으로 경로를 맞췄다.
- 인프라는 프론트 정적 호스팅 버킷과 업로드 이미지 버킷을 분리했다.
- Terraform은 `infra/terraform/init`에서 remote state(S3 + DynamoDB lock)를 먼저 만들고, `infra/terraform/minimum`에서 앱 스택을 관리하도록 분리했다.
- 백엔드와 AI의 런타임 설정은 Lambda env 직접 주입 대신 SSM Parameter Store에서 읽도록 전환했다.
- DynamoDB 문서는 PartiQL 기준 운영 예시를 함께 남기고, 런타임 hot path는 단일 테이블 키 조회를 유지한다.
- 그룹 초대 링크는 `inviteCode` 기반 join 라우트와 로그인 후 복귀 경로까지 연결했다.
- 그룹 일정 생성은 `groupId`를 전달하도록 정리했고, 그룹 목록 멤버 수는 백엔드 값과 맞췄다.
- AI 컨테이너 이미지는 일반 Python 이미지가 아니라 AWS Lambda Python base image를 사용하도록 수정했다.
- 목록 API의 `meta.nextCursor`는 프론트 공통 request 레이어에서 보존하고, 일정/알림/조율 조회가 다음 커서를 따라 전체 페이지를 가져오도록 정리했다.
- 필수 약관 동의는 소셜 로그인 후 보호 라우트에서 `requiredConsentCompleted`를 확인하고, `profiles/me/consents/required` API로 기록하는 흐름으로 정리했다.
- 일정 시간 계약은 종료 시간을 직접 받지 않고 `startTime + duration`으로 계산하는 구조로 정리했고, 프론트 타임테이블도 소요시간 기준으로 블럭을 그리도록 맞췄다.
- 알림은 사용자 설정, 알림센터 저장, Web Push 구독, EventBridge Scheduler 기반 리마인드 예약 경로를 같은 백엔드 설정과 DynamoDB 키 구조로 바라보도록 정리했다.
- 그룹 멤버 목록과 상세 응답은 그룹 멤버에 저장된 표시명만 보지 않고 프로필을 batch 조회해 최신 닉네임/아바타를 반영하도록 정리했다.
- 조율 목록의 `responseCount`는 백엔드 DTO, 프론트 API 타입, 그룹 상세 화면 표시까지 연결되어 있다.

## 즉시 수정이 필요한 항목

현재 문서 기준으로 프론트와 백엔드 호출 경로가 즉시 깨지는 정합성 항목은 남아 있지 않다.

## 추후 구조 개선 후보

- 조율 생성 화면의 멤버 선택 UI는 현재 백엔드 생성 DTO와 프론트 그룹 목록 훅에 연결되어 있지 않다. 전체 그룹원 대상 조율로 유지할지, 선택 멤버 대상 조율로 확장할지 제품 계약부터 정해야 한다.
- 조율 히트맵의 `users` 값은 현재 응답자의 `userId`를 그대로 내려주므로, 실제 사용자 표시명/아바타가 필요하면 프로필 batch 조회를 조율 상세 응답에도 적용해야 한다.
- 프론트 커스텀 도메인의 `/health`는 SPA 리라이트 대상이고, 백엔드 헬스체크는 API Gateway 원본 `/health`에서 확인된다. 운영 모니터링이 커스텀 도메인을 기준으로 잡힐 경우 `/api/planner/v1/health` 추가 또는 CloudFront `/health` 라우팅 분리가 필요하다.
- `fe/src/types/types.ts`에는 API DTO와 어긋나는 과거 도메인 타입(`TimeCoordination.memberIds`, `GroupMember.name/avatar`)이 남아 있다. 현재 서비스 레이어 타입과 충돌하지는 않지만, 추후 타입 혼선을 줄이려면 정리하는 편이 낫다.
- 백엔드 컨트롤러의 `AuthUtil.getCurrentUserId()` 반복은 `@CurrentUserId` 같은 argument resolver로 줄일 수 있다.
