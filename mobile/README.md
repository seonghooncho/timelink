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

현재 소셜 로그인은 앱 쪽 구현이 준비되어 있으며, 서버/OAuth provider에서 `timelink://app` 기반 callback 허용이 필요하다.
