# 📅 일정관리 앱 — 컴포넌트 & 디자인 가이드

> 모바일 퍼스트 일정관리 앱의 전체 컴포넌트 구조와 디자인 시스템 문서입니다.

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
| `task` (과제) | 파랑 215° | 밝은 파랑 | 진한 파랑 |
| `appointment` (약속) | 초록 145° | 밝은 초록 | 진한 초록 |
| `important` (중요) | 빨강 0° | 밝은 빨강 | 진한 빨강 |
| `group` (그룹) | 보라 270° | 밝은 보라 | 진한 보라 |
| `repeat` (반복) | 주황 32° | 밝은 주황 | 진한 주황 |

### 1.4 간격 & 라운딩
- `--radius`: `0.75rem` (12px)
- 카드: `rounded-xl` (12px) ~ `rounded-2xl` (16px)
- 버튼: `rounded-lg` (8px) ~ `rounded-xl` (12px)

### 1.5 애니메이션
- `accordion-down/up`: 아코디언 열기/닫기 (0.2s ease-out)
- `slide-up`: 바텀시트 등장 (0.3s ease-out)
- `fade-in`: 페이드 인 (0.2s ease-out)
- framer-motion: 모달, 확인창에 spring 애니메이션 사용

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
> 하단 고정 네비게이션 (홈/캘린더/그룹/마이)
- 현재 경로에 따라 활성 상태 자동 표시
- `safe-bottom` 클래스로 노치 대응

---

## 3. 공통 컴포넌트 (`src/components/common/`)

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

### `TabBar` ✨ NEW
> 재사용 가능한 탭 바
- Props: `tabs` (key/label 배열), `activeKey`, `onChange`

```tsx
<TabBar 
  tabs={[{ key: 'once', label: '한 번만' }, { key: 'repeat', label: '반복' }]} 
  activeKey={tab} 
  onChange={setTab} 
/>
```

### `ToggleSwitch` ✨ NEW
> ON/OFF 토글 스위치
- Props: `checked`, `onChange`
- 활성: primary 색상, 비활성: muted 색상

### `GroupAvatar` ✨ NEW
> 그룹 아바타 (이미지 또는 기본 아이콘)
- Props: `image?`, `name`, `size` (sm/md/lg)
- 이미지가 없으면 보라색 그룹 아이콘 표시

```tsx
<GroupAvatar image={group.image} name={group.name} size="md" />
```

### `MemberSelector` ✨ NEW
> 멤버 선택 칩 UI
- Props: `members`, `selectedIds`, `onToggle`
- 선택: 검정 배경, 미선택: 카드 배경 + 테두리

### `TimeChip` ✨ NEW
> 시간 표시 칩
- Props: `label`, `active`
- 시간 조율 페이지에서 사용

---

## 4. 일정 컴포넌트 (`src/components/schedule/`)

### `ScheduleCard`
> 풀사이즈 일정 카드 (캘린더 페이지 목록용)
- 좌측 카테고리 컬러 바 + 뱃지 + 제목 + 시간 + 체크박스

### `ScheduleCardCompact`
> 컴팩트 일정 카드 (110×140px, 수평 스크롤용)
- 카테고리별 배경색 + 시간 + 제목 + 소요시간 + 체크박스
- `isImportant`일 때 진한 색 배경

### `ScheduleStrip` ✨ NEW
> 날짜별 그룹화된 수평 스크롤 일정 카드 목록
- Props: `groups`, `onScheduleClick`, `onComplete`, `emptyMessage`
- MainPage, GroupDetailPage에서 공통 사용

```tsx
<ScheduleStrip
  groups={groupedSchedules}
  onScheduleClick={handleClick}
  onComplete={handleComplete}
  emptyMessage="그룹 일정이 없습니다"
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

## 5. 조율 컴포넌트 (`src/components/coordination/`)

### `CoordinationOneTime`
> 일회성 시간 조율 폼 (캘린더 날짜 선택)

### `CoordinationRepeat`
> 반복 시간 조율 폼 (요일 선택)

---

## 6. 커스텀 훅 (`src/hooks/`)

### `useGroupedSchedules` ✨ NEW
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

## 7. 유틸리티 (`src/utils/`)

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
| `/groups` | GroupsPage | GroupAvatar, FAB |
| `/groups/new` | GroupFormPage | 이미지 업로드 |
| `/groups/:id` | GroupDetailPage | GroupAvatar, ScheduleStrip |
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

*마지막 업데이트: 2026-03-08*
