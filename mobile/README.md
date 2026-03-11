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
npm run export:web
```

## API / 인증
- Planner API 기본값: `https://timelink.cloud/api/planner/v1`
- AI API 기본값: `https://timelink.cloud/api/ai/v1`
- 웹 기준 origin: `https://timelink.cloud`
- 모바일 OAuth callback origin: `timelink://app`
- 앱 링크 prefix: `timelink://app`, `https://timelink.cloud`, `https://www.timelink.cloud`

현재 소셜 로그인은 앱 쪽 구현이 준비되어 있으며, 서버에서 `timelink://app` origin을 허용해야 한다.
Google/Kakao provider redirect URI는 `https://timelink.cloud/api/planner/v1/auth/oauth/{provider}/callback` 을 사용한다.

## 링크 동작
- 로그인 완료 후 서버는 `timelink://app/auth/callback#...` 으로 앱에 세션을 전달한다.
- 앱은 웹과 같은 경로(`/calendar`, `/groups`, `/groups/join/:inviteCode`, `/mypage`, `/notifications`)를 이해하도록 linking을 맞춰 둔 상태다.
- `app.json`에는 iOS `associatedDomains`와 Android `intentFilters`를 넣어 두었다.

## 남은 외부 설정
- `https://timelink.cloud/.well-known/apple-app-site-association`
- `https://timelink.cloud/.well-known/assetlinks.json`

위 두 파일은 배포 도메인에서 추가로 제공해야 Universal Links / Android App Links 검증이 완료된다.
현재 저장소에는 Apple Team ID와 Android 서명 인증서 SHA256 fingerprint가 없어 정적 파일까지는 확정하지 않았다.
