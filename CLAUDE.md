# LAYERED (Fashion Diary Web)

패션 다이어리 웹앱. 옷장 관리, 코디 기록, OOTD, 날씨 연동 기능 제공.

## 기술 스택

- **Framework**: Next.js App Router (TypeScript)
- **Database / Auth / Storage**: Supabase
- **Styling**: CSS (별도 .css 파일, CSS 변수 기반 테마)

## 프로젝트 구조

```
app/
  (main)/          # 메인 페이지들
    wardrobe/      # 옷장
    wardrobe/new/  # 아이템 추가
    diary/         # OOTD
    outfits/new/   # 코디 기록
    outfits/[id]/edit/
    stats/         # 리포트
    account/       # 설정
  api/             # API 라우트
  styles/
    core/          # 전역 CSS (base.css, tokens.css 등)
    pages/         # 페이지별 CSS

components/
  common/          # 공통 컴포넌트 (app-rail, main-nav, icons 등)
  diary/           # 다이어리 관련
  wardrobe/        # 옷장 관련
  account/         # 설정 관련

lib/
  queries/         # Supabase 쿼리 함수
  auth.ts          # requireUser, getCurrentUser
  app-user.ts      # getOrCreateAppUserId, requireAppUserContext
  supabase/        # Supabase 클라이언트
```

## CSS 규칙

- **인라인 스타일 금지** — 반드시 .css 파일에 작성
- 페이지별 CSS는 `app/styles/pages/` 하위에 위치
- CSS 변수 사용:
  - `--font-serif` — 제목 폰트
  - `--surface`, `--line`, `--muted-foreground`, `--foreground` — 색상
  - `--radius-xl`, `--radius-md` — 모서리
  - `--primary`, `--destructive` — 액션 색상
- 다크모드: `:root:is([data-theme="dark"], .dark)` 셀렉터 사용

## 페이지 레이아웃 규칙 (일관성 유지)

모든 메인 페이지(옷장, 아이템 추가, OOTD, 코디 기록, 리포트, 설정)는 동일한 구조:

```css
.{page}-page {
  padding: 1.8rem;
  min-height: calc(100vh - 2.8rem);
}

.{page}-page h1 {
  margin: 0;
  font-family: var(--font-serif);
}

.{page}-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}
```

## 버튼 클래스

- `solid-button` — 기본 액션 버튼
- `ghost-button` — 보조 버튼
- `danger-button` — 삭제 등 위험한 액션

## 인증 패턴

- 서버 컴포넌트: `requireUser()` 또는 `requireAppUserContext()`
- API 라우트: `getCurrentUser()` + `getOrCreateAppUserId()`
- Supabase 서비스 롤 클라이언트: `createServiceRoleSupabaseClient()`

## 주요 DB 테이블

- `outfit` — id, user_id, date, note, city, t_min, t_max, humidity, rain
- `outfit_item` — outfit_id (CASCADE DELETE), item_id
- `outfit_photo` — outfit_id, photo_path
- `item` — id, user_id, name, category, image_path 등

## 네비게이션 구조

- 좌측 사이드바 (`AppRail`) — 상단 헤더 없음
- 네비게이션 링크: `app-link`, `app-link-icon`, `app-link-text` 클래스
- 다크모드 토글은 사이드바 하단에 위치
- 설정 링크는 `MainNav` 내 `SettingsIcon`으로 표시

## 코딩 방침

- 새 파일 생성보다 **기존 파일 수정 우선**
- 불필요한 추상화, 헬퍼 함수 생성 금지
- 요청하지 않은 기능 추가나 리팩토링 금지
- 타입/주석은 변경한 코드에만 추가
