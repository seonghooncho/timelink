# Timelink — 컴포넌트 & 디자인 가이드

> Timelink 프론트엔드의 전체 컴포넌트 구조와 디자인 시스템 문서입니다.

## 근본 목적

프론트엔드 디자인 토큰과 컴포넌트 책임을 일관되게 유지해 UI 변경 시 중복 구현과 해석 차이를 줄이는 것이 목적입니다.

## 비목적

모든 화면 픽셀 단위 결과를 고정하는 문서가 아니며, 컴포넌트 내부 구현 세부사항을 소스코드 대신 장황하게 복제하려는 문서도 아닙니다.

---

## 1. 디자인 시스템

### 1.1 폰트
- **Primary**: `Noto Sans KR` (300~700)
- 적용: `font-family: 'Noto Sans KR', sans-serif`

### 1.2 컬러 토큰 (HSL)

| Token | 용도 |
|-------|------|
| `--background` | 페이지 배경 (밝은 회색) |
| `--foreground` | 기본 텍스트 |
| `--card` / `--card-foreground` | 카드 배경/텍스트 |
| `--primary` / `--primary-foreground` | 주요 액션 (초록 계열) |
| `--secondary` | 보조 배경 |
| `--muted` / `--muted-foreground` | 비활성 요소 |
| `--accent` | 호버/포커스 배경 |
| `--destructive` | 삭제/경고 (빨강 계열) |
| `--border` / `--input` / `--ring` | 테두리, 입력, 포커스 링 |

### 1.3 카테고리 컬러

| 카테고리 | Base | Light | Strong |
|---------|------|-------|--------|
| `task` (과제) | 파랑 220° | 밝은 파랑 | 진한 파랑 |
| `appointment` (약속) | 초록 160° | 밝은 초록 | 진한 초록 |
| `important` (중요) | 빨강 0° | 밝은 빨강 | 진한 빨강 |
| `group` (그룹) | 보라 260° | 밝은 보라 | 진한 보라 |
| `repeat` (반복) | 주황 30° | 밝은 주황 | 진한 주황 |

### 1.4 간격 & 라운딩
- `--radius`: `1rem` (16px)
- 카드: `rounded-xl` (12px) ~ `rounded-2xl` (16px)
- 버튼: `rounded-lg` (8px) ~ `rounded-xl` (12px)

### 1.5 애니메이션
- `accordion-down/up`: 아코디언 열기/닫기 (0.2s ease-out)
- `slide-up`: 바텀시트 등장 (0.3s ease-out)
- `fade-in`: 페이드 인 (0.2s ease-out)
- framer-motion: 모달, 확인창에 spring 애니메이션 사용

### 1.6 레이어 & 오버레이

[Material elevation](https://m2.material.io/design/environment/elevation.html), [Apple HIG modality](https://developer.apple.com/design/human-interface-guidelines/modality), [WAI-ARIA modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Radix Portal](https://www.radix-ui.com/primitives/docs/components/dialog) 패턴을 기준으로 앱 레이어를 제한된 단계로 관리한다.

| Layer | Token | 용도 |
|-------|-------|------|
| Content | `app-layer-content` / `app-layer-content-raised` | 일반 콘텐츠, 카드 내부 강조 요소 |
| Header | `app-layer-header` | sticky 상단 헤더 |
| Floating | `app-layer-floating` | FAB, 모임 상세 고정 액션바 |
| Navigation | `app-layer-navigation` | 하단 고정 내비게이션 |
| Popover | `app-layer-popover` | 드롭다운, 툴팁, 시간 선택 메뉴 |
| Notice | `app-layer-notice` | PWA 설치 안내처럼 비차단 상단 안내 |
| Overlay | `app-layer-overlay` | 배경을 덮는 dim/scrim |
| Modal | `app-layer-modal` | Dialog, Sheet, Drawer, 바텀시트 콘텐츠 |
| Critical | `app-layer-critical` | 확인 모달, 토스트처럼 마지막에 보여야 하는 피드백 |

- 하단 내비게이션보다 위에 떠야 하는 요소는 `popover` 이상을 사용한다.
- 배경을 막는 UI는 overlay와 content 레이어를 분리한다.
- 바텀시트는 `app-bottom-sheet-root`와 `app-bottom-sheet-panel`을 함께 사용해 하단 내비게이션 영역을 침범하지 않는다.
- 새 컴포넌트에서 임의의 `z-50`, `z-[100]`을 만들기보다 위 레이어 유틸리티를 먼저 사용한다.

---

## 2. 레이아웃 컴포넌트

### `MobileLayout`
> 모든 페이지를 감싸는 최상위 레이아웃
- `max-w-lg mx-auto` 로 모바일 뷰포트 제한
- `hideNav` prop으로 하단 네비게이션 숨김 (로그인 페이지 등)

```tsx
<MobileLayout hideNav={false}>
  {children}
</MobileLayout>
```

### `PageHeader`
> 상단 헤더 바 (sticky)
- `title`: 페이지 제목
- `showBack`: 뒤로가기 버튼
- `rightElement`: 우측 커스텀 요소 (알림 아이콘 등)

```tsx
<PageHeader title="캘린더" showBack rightElement={<BellButton />} />
```

### `BottomNav`
> 하단 고정 네비게이션 (홈/캘린더/모임/커뮤니티/마이)
- 현재 경로에 따라 활성 상태 자동 표시
- `app-bottom-nav`와 `app-layer-navigation`으로 safe-area와 레이어를 함께 관리

---

## 3. 공통 컴포넌트 (`fe/src/components/common/`)

### `CategoryBadge`
> 카테고리를 표시하는 작은 뱃지
- Props: `category`, `variant` (default/light/strong), `size` (sm/md)

```tsx
<CategoryBadge category="task" variant="light" size="sm" />
```

### `ConfirmModal`
> 확인/취소 모달 (framer-motion 애니메이션)
- Props: `open`, `onClose`, `onConfirm`, `title`, `description`, `variant` (default/destructive)

### `FAB` (Floating Action Button)
> 우측 하단 플로팅 버튼
- Props: `to` (네비게이션), `onClick`, `variant` (default/group)
- default: 검정 배경, group: 보라 배경

### `TabBar`
> 재사용 가능한 탭 바
- Props: `tabs` (key/label 배열), `activeKey`, `onChange`

```tsx
<TabBar 
  tabs={[{ key: 'once', label: '한 번만' }, { key: 'repeat', label: '반복' }]} 
  activeKey={tab} 
  onChange={setTab} 
/>
```

### `ToggleSwitch`
> ON/OFF 토글 스위치
- Props: `checked`, `onChange`
- 활성: primary 색상, 비활성: muted 색상

### `GroupAvatar`
> 모임 아바타 (이미지 또는 기본 아이콘)
- Props: `image?`, `name`, `size` (sm/md/lg)
- 이미지가 없으면 보라색 모임 아이콘 표시

```tsx
<GroupAvatar image={group.image} name={group.name} size="md" />
```

### `TimeChip`
> 시간 표시 칩
- Props: `label`, `active`
- 시간 조율 페이지에서 사용

---

## 4. 일정 컴포넌트 (`fe/src/components/schedule/`)

### `ScheduleCard`
> 풀사이즈 일정 카드 (캘린더 페이지 목록용)
- 좌측 카테고리 컬러 바 + 뱃지 + 제목 + 시간 + 체크박스

### `ScheduleCardCompact`
> 컴팩트 일정 카드 (110×140px, 수평 스크롤용)
- 카테고리별 배경색 + 시간 + 제목 + 소요시간 + 체크박스
- `isImportant`일 때 진한 색 배경

### `ScheduleStrip`
> 날짜별 그룹화된 수평 스크롤 일정 카드 목록
- Props: `groups`, `onScheduleClick`, `onComplete`, `emptyMessage`
- MainPage에서 홈 일정 카드 영역으로 사용

```tsx
<ScheduleStrip
  groups={groupedSchedules}
  onScheduleClick={handleClick}
  onComplete={handleComplete}
  emptyMessage="모임 일정이 없습니다"
/>
```

### `ScheduleDetailModal`
> 바텀시트 형태의 일정 상세 모달
- 뷰/편집 모드 전환
- framer-motion spring 애니메이션

### `Timetable`
> 타임테이블 그리드 뷰 (4일 단위)
- 시간 축 (7~20시) + 겹침 처리 (최대 2열 + overflow 뱃지)
- 현재 시간 인디케이터 (빨간 선)

---

## 5. 조율 컴포넌트 (`fe/src/components/coordination/`)

### `CoordinationOneTime`
> 일회성 시간 조율 폼 (캘린더 날짜 선택)
- 대상은 모임 전체 멤버로 고정 표시하며 생성자를 자동 포함한다.

### `CoordinationRepeat`
> 반복 시간 조율 폼 (요일 선택)
- 대상은 모임 전체 멤버로 고정 표시하며 생성자를 자동 포함한다.

---

## 6. 커스텀 훅 (`fe/src/hooks/`)

### `useGroupedSchedules`
> 일정 배열을 날짜별로 그룹화하는 훅
- 미완료 일정만 필터링, 시간순 정렬
- 오늘/N일 뒤 라벨 자동 생성

```tsx
const groupedSchedules = useGroupedSchedules(schedules);
// → [{ date: '2026-03-08', label: '오늘 3/8', schedules: [...] }, ...]
```

### `use-mobile`
> 모바일 뷰포트 감지 훅

---

## 7. 유틸리티 (`fe/src/utils/`)

| 함수 | 파일 | 설명 |
|------|------|------|
| `getCategoryColor(category, variant)` | `category.ts` | 카테고리별 Tailwind 클래스 반환 |
| `getCategoryLabel(category)` | `category.ts` | 카테고리 한글 라벨 (과제/약속/그룹/중요/반복) |
| `formatTime(iso)` | `category.ts` | `HH:MM` 형태 시간 포맷 |
| `formatDate(iso)` | `category.ts` | `M/D` 형태 날짜 포맷 |
| `getDayLabel(iso)` | `category.ts` | 요일 라벨 (일/월/화/수/목/금/토) |

---

## 8. 페이지 구조

| 경로 | 페이지 | 주요 컴포넌트 |
|------|--------|-------------|
| `/` | MainPage | ScheduleStrip, Timetable, FAB |
| `/calendar` | CalendarPage | 캘린더 그리드, ScheduleDetailModal |
| `/schedule/new` | ScheduleFormPage | AI 사진 분석, 카테고리 선택 |
| `/groups` | GroupsPage | 내 모임/둘러보기 탭, 다음 일정 요약, 공개 모임 가입 요청 |
| `/community` | CommunityPage | 커뮤니티 게시물 목록, 글쓰기 바텀시트 |
| `/community/posts/:postId` | CommunityPostDetailPage | 게시물 상세, 좋아요, 댓글, 작성자 메뉴 |
| `/groups/new` | GroupFormPage | 공개 여부 선택, 이미지 업로드 |
| `/groups/:id` | GroupDetailPage | GroupAvatar, 헤더 메뉴, 멤버/멤버관리 모달, 일정/조율 목록 |
| `/groups/:id/coordination` | TimeCoordinationPage | TabBar, CoordinationOneTime/Repeat |
| `/groups/:id/coordination/timetable` | CoordinationTimetablePage | 히트맵 |
| `/mypage` | MyPage | ToggleSwitch |
| `/login` | LoginPage | Google OAuth |
| `/notifications` | NotificationsPage | TabBar, CategoryBadge |

---

## 9. 디자인 원칙

1. **모바일 퍼스트**: `max-w-lg` 제한, 터치 친화적 (min 44px 터치 영역)
2. **시맨틱 토큰**: 하드코딩 색상 금지, CSS 변수 기반
3. **일관된 간격**: `px-4` 페이지 좌우 패딩, `space-y-2~6` 수직 간격
4. **카드 기반 UI**: `bg-card rounded-xl border border-border` 패턴
5. **미니멀 인터랙션**: `active:scale-[0.97~0.99]` 터치 피드백
6. **접근성**: 포커스 링, 충분한 대비, sr-only 라벨

---

*마지막 업데이트: 2026-06-13*
