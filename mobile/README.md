# Timelink Mobile

## 근본 목적
웹 서비스와 동일한 디자인 톤과 핵심 사용자 흐름을 유지하는 React Native 앱을 `mobile/`에서 독립적으로 관리한다.

## 비목적
웹 컴포넌트를 그대로 복사하거나, 지금 당장 필요 없는 과도한 공용화와 네이티브 커스텀 구현을 목표로 하지 않는다.

## 구조
- `src/bootstrap`: 앱 부트스트랩과 provider 조합
- `src/navigation`: 루트 스택과 탭 네비게이션
- `src/context`: 인증 상태
- `src/services`: API 클라이언트와 세션 저장
- `src/hooks`: React Query 기반 도메인 조회/변경
- `src/components`: 공용 UI와 일정 관련 컴포넌트
- `src/screens`: 실제 화면 단위 구현
- `src/constants`, `src/utils`, `src/types`: 디자인 토큰, 유틸, 타입

## 실행
```bash
cd mobile
npm install
npm run start
```

## 검증
```bash
cd mobile
npm run typecheck
npm run test
npm run export:web
npm run prebuild:android
npm run prebuild:ios
```

## API / 인증
- Planner API 기본값: `https://timelink.cloud/api/planner/v1`
- AI API 기본값: `https://timelink.cloud/api/ai/v1`
- 웹 기준 origin: `https://timelink.cloud`
- 모바일 OAuth callback origin: `timelink://app`
- 앱 링크 prefix: `timelink://app`, `https://timelink.cloud`, `https://www.timelink.cloud`

현재 소셜 로그인은 앱 쪽 구현이 준비되어 있으며, 서버에서 `timelink://app` origin을 허용해야 한다.
Google/Kakao provider redirect URI는 `https://timelink.cloud/api/planner/v1/auth/oauth/{provider}/callback` 을 사용한다.

## 운영 기능 계약
- 일정 생성은 `날짜 + 시작 시간 + 소요시간`으로 보낸다.
- 화면에서 종료 시각이 필요하면 `시작 시간 + 소요시간`으로 계산한다.
- 일반 일정 생성에서는 모임 카테고리를 숨기고, 모임 상세에서 만든 일정만 모임 일정으로 생성한다.
- 모임 화면은 `내 모임`과 `둘러보기` 탭으로 나뉘며, 공개 모임은 소개 페이지에서 가입요청을 보낸다.
- 커뮤니티 탭은 게시글 목록, 익명 작성, 이미지 1장 첨부, 상세 댓글과 좋아요를 제공한다.
- 이미지 업로드는 presigned URL + WebP 처리 파이프라인을 사용하고, 엔티티에는 `imageId`와 `imageStatus`를 연결한다.
- 모임 알림은 앱 설정에서 끄지 않는다. 모임 활동 알림은 알림센터에 기본 생성된다.
- 일정 알림이 꺼져 있으면 리마인드 설정은 보이지만 수정할 수 없다.

## 링크 동작
- 로그인 완료 후 서버는 `timelink://app/auth/callback#...` 으로 앱에 세션을 전달한다.
- 앱은 웹과 같은 경로(`/calendar`, `/groups`, `/groups/:id/intro`, `/community`, `/community/posts/:postId`, `/groups/join/:inviteCode`, `/mypage`, `/notifications`)를 이해하도록 linking을 맞춰 둔 상태다.
- Android App Links는 `intentFilters`로 유지한다.
- iOS Universal Links(`associatedDomains`)는 유료 Apple Developer 팀에서만 활성화한다. 무료 Personal Team으로 로컬 실기기 테스트할 때는 비활성화해야 서명이 된다.

## 남은 외부 설정
- `https://timelink.cloud/.well-known/apple-app-site-association`
- `https://timelink.cloud/.well-known/assetlinks.json`

위 두 파일은 배포 도메인에서 추가로 제공해야 Universal Links / Android App Links 검증이 완료된다.
현재 저장소에는 Apple Team ID와 Android 서명 인증서 SHA256 fingerprint가 없어 정적 파일까지는 확정하지 않았다.

## 제출 준비 문서
[docs/mobile/STORE_READINESS.md](../docs/mobile/STORE_READINESS.md)를 먼저 확인한다.
