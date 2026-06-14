# Timelink UX Launch Polish

## 근본 목적

Timelink의 웹/PWA 진입, 공유 링크, 알림, 모임/커뮤니티 흐름을 하나의 안정적인 출시 품질 UX로 맞춰 신규 사용자가 신뢰하고 바로 참여할 수 있게 한다.

## 비목적

전체 앱 리디자인, 브랜드 재설계, route 제거, 모바일 네이티브 앱 개편, 배포, 신규 인프라 작업은 이 문서와 작업의 범위가 아니다.

## 제품 결정 요약

- 커뮤니티와 모임 글은 “Timelink-style social feed”로 맞춘다. 일정/모임 맥락을 해치지 않는 선에서 좋아요, 댓글, 작성자, 이미지 리듬을 일관화한다.
- 모임 게시물은 이번 버전에서 별도 상세 route를 만들지 않고 기존 모임 상세 안의 inline 댓글 흐름을 유지한다.
- PWA 설치 안내는 전역 팝업이 아니라 사용자가 설치 이유를 이해할 수 있는 맥락형 표면에서만 보여준다.
- 알림과 공유 링크는 안전한 내부 route만 열고, 불명확한 대상은 `/notifications` 또는 모임 목록으로 부드럽게 fallback한다.
- 공개 모임 생성은 private 생성보다 많은 설명을 유도하지만, 별도 schema 없이 기존 `description`, 이미지, 공개 설정 안에서 해결한다.

## 변경된 주요 경로와 컴포넌트

- 게시물 피드: `PostListItem`, `CommunityPage`, `GroupDetailPage`, `GroupIntroPage`
- PWA 설치: `PwaInstallPrompt`, `utils/pwa`, `manifest.webmanifest`, `sw.js`
- 알림 라우팅: `NotificationsPage`, `lib/navigationTargets`, `sw.js`
- 초대/공유 링크: `InviteRedirectPage`, `GroupJoinPage`, `lib/navigationTargets`
- 공개 모임 생성: `GroupFormPage`
- 백엔드 알림 target: `NotificationService`, `ReminderSchedulingService`, `WebPushService`

## PWA 설치 동작

| 환경 | 동작 |
| --- | --- |
| Android Chrome | `beforeinstallprompt`가 있으면 설치 버튼을 보여주고 native prompt를 호출한다. 없으면 메뉴 설치 안내를 보여준다. |
| Samsung Internet / Galaxy | native prompt가 있으면 설치 버튼, 없으면 Samsung Internet 메뉴의 앱 설치/홈 화면 추가를 안내한다. |
| Android KakaoTalk in-app browser | 설치가 제한될 수 있음을 알리고 외부 브라우저 열기 또는 링크 복사를 안내한다. |
| iOS Safari | 공유 버튼 → 홈 화면에 추가를 안내한다. |
| iOS Chrome | Safari에서 열어 홈 화면에 추가하는 경로와 링크 복사를 안내한다. |
| iOS KakaoTalk in-app browser | Safari로 열기와 링크 복사를 안내한다. |
| Desktop Chrome / Edge | native prompt가 있으면 설치 버튼, 없으면 주소창/브라우저 메뉴 설치 안내를 보여준다. |
| Installed standalone PWA | 설치 CTA를 보여주지 않는다. |

설치 안내는 현재 route와 query를 유지하는 링크 복사/설치 흐름을 전제로 한다. 초대, 조율, 게시물, 알림에서 들어온 사용자가 목적지를 잃지 않아야 한다.

## Notification Target Route Contract

프론트는 다음 순서로 알림 target을 결정한다.

1. `targetUrl`이 안전한 내부 path이면 그대로 사용한다.
2. `targetUrl`이 없거나 unsafe이면 `targetType + targetId`를 해석한다.
3. 해석할 수 없으면 `/notifications`로 fallback한다.

| targetType | fallback route |
| --- | --- |
| `GROUP_JOIN_REQUEST` | `/groups/{targetId}?panel=joinRequests` |
| `GROUP` | `/groups/{targetId}` |
| `COMMUNITY_POST`, `POST` | `/community/posts/{targetId}` |
| `SCHEDULE` | `/calendar` |
| unknown / missing | `/notifications` |

백엔드는 가능한 알림에 `targetUrl`, `targetType`, `targetId`를 함께 저장하고, Web Push payload에도 같은 값을 포함한다. 시간 조율처럼 `targetId`만으로 group context를 알 수 없는 알림은 `/groups/{groupId}/coordination/{coordId}/timetable` 형태의 `targetUrl`을 반드시 함께 내려보내는 계약으로 둔다.

## Invite / Shared Link Behavior Matrix

| 진입 | 로그인 상태 | 기대 동작 |
| --- | --- | --- |
| `/invite/{code}` | logged out | `/groups/join/{code}`로 redirect되고 보호 route가 로그인 후 원래 join route로 복귀시킨다. |
| `/invite/{code}?coord={id}` | logged out/in | join 성공 후 `/groups/{groupId}/coordination/{id}/timetable`로 이동한다. |
| `/invite/{code}?redirect=/safe/path` | logged out/in | 안전한 내부 redirect만 보존하고 join 성공 후 해당 path로 이동한다. |
| `/groups/join/{code}` | logged in | 바로 초대코드 join을 시도한다. |
| invalid / expired invite | logged in | 설명 카드와 `모임 둘러보기`, `알림 보기` 액션을 보여준다. |
| unsafe redirect | any | 무시하고 기본 join destination을 사용한다. |

OG/Kakao preview용 GET/HEAD 처리와 기존 공유 preview 이미지는 변경하지 않는다.

## Manual QA Checklist

- Android Chrome
  - `/mypage`에서 설치 버튼 또는 설치 안내가 보이는지 확인한다.
  - `/groups/join/{code}?coord={id}` 링크가 로그인 후 목적지로 복귀하는지 확인한다.
- Samsung Internet on Galaxy
  - 설치 안내 문구가 Samsung Internet 메뉴 기준으로 보이는지 확인한다.
- Android KakaoTalk in-app browser
  - 설치 버튼 대신 외부 브라우저/링크 복사 안내가 보이는지 확인한다.
  - KakaoTalk 공유 preview가 기존처럼 표시되는지 확인한다.
- iOS Safari
  - 공유 → 홈 화면에 추가 안내가 보이는지 확인한다.
- iOS Chrome
  - Safari로 열기/링크 복사 안내가 보이는지 확인한다.
- iOS KakaoTalk in-app browser
  - Safari로 열기 안내와 링크 복사가 가능한지 확인한다.
- Desktop Chrome / Edge
  - native install prompt가 있는 경우 설치 버튼이 실제 prompt를 여는지 확인한다.
- Installed standalone PWA mode
  - 설치 CTA가 보이지 않는지 확인한다.
  - push notification click이 기존 창을 target route로 이동시키는지 확인한다.
- Logged-out invite links
  - 로그인 후 join route와 `coord`/safe `redirect`가 유지되는지 확인한다.
- Logged-in invite links
  - 성공, invalid/expired, already-joined에 대한 설명과 이동이 자연스러운지 확인한다.
- Notification click routing
  - 가입 요청, 가입 승인/거절, 댓글/좋아요, 일정/시간 조율 알림이 의미 있는 route로 이동하는지 확인한다.
