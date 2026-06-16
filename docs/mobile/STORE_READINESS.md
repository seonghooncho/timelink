# 모바일 앱 스토어 제출 준비

## 근본 목적

Timelink 모바일 앱을 `main/mobile`에서 운영 웹/백엔드와 같은 API 계약으로 관리하고, 앱스토어와 플레이스토어 제출 직전까지 반복 검증할 수 있게 한다.

## 비목적

이 문서는 Apple Developer, Google Play Console 계정에서 실제 심사 제출을 대체하지 않는다. 서명 키, Apple Team ID, Play Console 앱 등록처럼 계정 권한이 필요한 값은 코드에 임의로 고정하지 않는다.

## 현재 구조

- 앱 위치: `mobile/`
- 프레임워크: Expo managed React Native
- 네이티브 폴더: `mobile/android`, `mobile/ios`는 커밋하지 않고 `expo prebuild`로 생성한다.
- Android 패키지명: `cloud.timelink.app`
- iOS 번들 ID: `cloud.timelink.mobile`
- 운영 API: `https://timelink.cloud/api/planner/v1`
- OAuth 모바일 콜백 origin: `timelink://app`
- Universal/App Links 대상: `https://timelink.cloud`, `https://www.timelink.cloud`

루트 명령:

```sh
npm run mobile:typecheck
npm run mobile:test
npm run mobile:prebuild:android
npm run mobile:prebuild:ios
npm run mobile:export:web
```

## 반영된 기능 계약

- 일정 생성은 `날짜 + 시작 시간 + 소요시간`으로 보낸다. 종료 시각은 앱에서 `시작 + 소요시간`으로 계산해 표시하고, 알림 기본값은 웹과 동일하게 꺼진 상태다.
- 시작 시간은 30분 단위 선택 UI로 제한한다.
- 일반 일정 생성에서는 모임 카테고리를 숨긴다. 모임 상세에서 만든 일정만 `category=group`으로 고정하고 참여 멤버를 선택해 생성한다.
- 모임 화면은 `내 모임`과 `둘러보기` 탭으로 나뉜다. 공개 모임은 검색, 소개 페이지, 가입요청 흐름을 제공한다.
- 모임 상세는 약속, 시간 조율, 모임 글을 같은 화면에서 확인하고, 모임 소개와 멤버 목록은 헤더 메뉴에서 접근한다.
- 커뮤니티 탭은 게시글 목록, 익명 작성, 이미지 1장 첨부, 상세 댓글과 좋아요를 제공한다.
- 프로필, 모임, 일정 이미지는 15MB 이하 파일을 presigned URL로 `upload/`에 올리고, 백엔드 WebP 처리 결과를 `imageId/imageStatus`로 추적한다. 프로필류와 모임 대표 이미지는 작은 화면에서 thumbnail variant를 우선 사용한다.
- 모바일 이미지는 Expo 기본 편집 UI를 거쳐 업로드한다. 웹의 커스텀 crop/position UI와 완전히 같은 조작감은 추후 네이티브 crop 컴포넌트 도입 때 맞춘다.
- 모임 알림 on/off는 모바일 마이페이지에 노출하지 않는다. 모임 알림은 서버 기본 정책대로 알림센터에 생성된다.
- `pushAlarm` 설정값은 모바일에서도 조회/저장하지만, 현재 실제 푸시 대상은 Web Push 구독이다. 앱 자체 APNs/FCM 푸시는 별도 설계가 필요하다.
- 일정 알림이 꺼져 있으면 리마인드 설정은 보이지만 수정할 수 없다.
- 조율 결과 타임슬롯을 선택하면 투표한 사람의 프로필과 이름을 모달로 보여준다.
- 모바일 테스트는 일정 시간 경계값, 이미지 제한/thumbnail 우선순위, 게시글 잠금/익명 표시 정책을 우선 보호한다.

## 스토어 제출 기준

- Google Play 신규/업데이트 앱은 Android 15(API 35) 이상 target이 필요하다. 현재 `expo-build-properties`로 `compileSdkVersion=36`, `targetSdkVersion=35`를 명시했다. `compileSdkVersion`은 AndroidX 최신 의존성 빌드 요구사항을 맞추기 위한 값이고, Play 정책 대상인 `targetSdkVersion`은 35로 유지한다.
- App Store 제출에는 개인정보 처리방침 URL, 개인정보 라벨, SDK privacy manifest/signature 확인이 필요하다.
- iOS 사진/카메라 권한 문구는 `app.json`에 한글로 설정했다.
- EAS 빌드 프로필은 `mobile/eas.json`에 추가했다.

참고:

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play target API requirement: https://support.google.com/googleplay/android-developer/answer/11926878

## 남은 외부 설정

- Apple Developer Team ID 확보 후 `apple-app-site-association`을 운영 도메인에 배포해야 Universal Links 검증이 완료된다.
- EAS project id와 스토어 자격증명은 계정 연결 후 확정한다.
- 로컬 AAB 빌드는 현재 개발 머신에 Android SDK 경로가 없어 끝까지 검증하지 못했다. `ANDROID_HOME` 또는 `mobile/android/local.properties`의 `sdk.dir` 설정 후 `npm run mobile:build:android-release`로 확인한다.

## Android App Links

- 정적 파일: `fe/public/.well-known/assetlinks.json`
- 운영 URL: `https://timelink.cloud/.well-known/assetlinks.json`
- Android 패키지명: `cloud.timelink.app`
- Play Console 앱 서명 키 SHA-256: `F7:BA:DE:E0:FC:1C:1D:71:DF:53:B4:E2:A2:49:FD:11:63:1D:F3:8C:15:0D:C6:76:B7:5A:BB:A6:9E:74:AC:7F`

업로드 키 인증서가 아니라 Google Play에서 출시 APK에 서명할 때 쓰는 앱 서명 키 인증서를 기준으로 한다.

## 네이티브 푸시 판단

현재 운영 백엔드 푸시는 Web Push(VAPID) 구조다. iOS/Android 네이티브 앱은 Web Push subscription이 아니라 APNs/FCM 또는 Expo Push Token을 사용해야 하므로 `pushAlarm` 설정값만으로 앱 자체 푸시가 전달되지는 않는다.

이번 모바일 통합에서는 알림센터와 일정 알림 설정을 맞추고, `pushAlarm`은 서버 설정 동기화 수준으로 유지한다. 장기적으로는 `NativePushSubscription` 저장소를 추가하고 notification worker가 Web Push와 Native Push를 목적지별로 분기하는 구조가 맞다.

## 검증 결과

- `npm run mobile:typecheck`: 통과
- `npm run mobile:test`: 통과
- `npm run mobile:export:web`: 통과
- `npm run mobile:prebuild:android`: 통과
- `npm run mobile:prebuild:ios`: 통과
- `npm audit --omit=dev --audit-level=high`: high 이상 없음. Expo/Jest 하위 moderate 취약점은 `npm audit fix --force`가 주요 패키지 교체를 요구해 보류한다.
