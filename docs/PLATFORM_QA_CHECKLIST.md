## 근본 목적
웹, Android, iOS에서 실제 로그인과 세션 유지, 핵심 화면 이동이 안정적으로 동작하는지 같은 기준으로 점검해 출시 직전 플랫폼별 결함 가능성을 줄인다.

## 비목적
형식적인 테스트 목록만 남기고 실제로 실행하지 않은 항목을 완료처럼 표시하는 것은 목적이 아니다.

# Timelink Platform QA Checklist

## 웹
- [x] 로그인 화면 진입 확인
- [x] 게스트 로그인 후 홈 진입 확인
- [x] 그룹 탭 진입 확인
- [x] 마이페이지 진입 확인
- [x] 브라우저 저장소에 `planner.auth.session` 저장 확인
- [x] `/api/planner/v1/profiles/me` 응답 확인
- [x] `/api/planner/v1/schedules` 응답 확인
- [x] `/api/planner/v1/groups` 응답 확인
- [x] `/api/planner/v1/notifications` 응답 확인
- [x] Google OAuth 시작 URL이 공식 `accounts.google.com`으로 이동하는지 확인
- [x] Kakao OAuth 시작 URL이 공식 `kauth.kakao.com`으로 이동하는지 확인
- [ ] 실제 Google 로그인 후 `/auth/callback` 복귀와 세션 갱신 확인
- [ ] 실제 Kakao 로그인 후 `/auth/callback` 복귀와 세션 갱신 확인
- [ ] 일정 생성 UI 저장 후 홈 반영 확인
- [ ] 그룹 생성 또는 초대 코드 참여 플로우 확인

## Android
- [x] `npm run mobile:typecheck`
- [x] `./gradlew :app:assembleDebug`
- [x] OAuth 시작 URL 생성 로직 확인
- [x] 세션 bootstrap에서 401과 5xx를 구분하도록 수정 및 검증
- [ ] 실제 Android 기기에서 앱 설치 확인
- [ ] 게스트 로그인 후 앱 재실행 시 세션 유지 확인
- [ ] Google 로그인 후 앱 복귀 확인
- [ ] Kakao 로그인 후 앱 복귀 확인
- [ ] 알림/카메라 등 런타임 권한 경고 여부 확인

## iOS
- [x] iOS 프로젝트 존재 확인
- [ ] `xcodebuild` 시뮬레이터 빌드 최종 성공 확인
- [ ] iOS 시뮬레이터 실행 확인
- [ ] 실제 iPhone 설치 후 앱 실행 확인
- [ ] 게스트 로그인 후 앱 재실행 시 세션 유지 확인
- [ ] Google 로그인 후 앱 복귀 확인
- [ ] Kakao 로그인 후 앱 복귀 확인

## 사용자 개입 필요 절차
1. Android 실기기 연결 또는 에뮬레이터 실행
2. iPhone USB 연결 및 Xcode 대상 선택
3. Google/Kakao 실제 계정 로그인 승인
4. 일정 생성과 그룹 생성처럼 실제 사용자 데이터를 만드는 플로우 확인
