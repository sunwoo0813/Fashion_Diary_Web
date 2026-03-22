# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# LAYERED (Fashion Diary Web)

패션 다이어리 웹앱. 옷장 관리, 코디 기록, OOTD, 날씨 연동 기능 제공.

## 개발 명령어

```bash
npm run dev        # 개발 서버 실행 (localhost:3000)
npm run build      # 프로덕션 빌드
npm run lint       # ESLint 검사
npm run typecheck  # TypeScript 타입 검사 (tsc --noEmit)
```

## 환경 변수

필수:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public 키
- `SUPABASE_SERVICE_ROLE_KEY` — 서버 전용 서비스 롤 키

선택:
- `SUPABASE_BUCKET` — 스토리지 버킷 이름 (기본값: `uploads`)
- `OPENAI_API_KEY` — AI 코디 추천 기능 (없으면 추천 비활성화)
- `OPENAI_RECOMMEND_MODEL` — 추천 AI 모델 (기본값: `gpt-4.1-mini`)
- `WEATHER_API_KEY` / `KMA_API_KEY` — 기상청 날씨 API (없으면 날씨 비활성화)
- `AUTH_DISABLE_EMAIL_CONFIRM` — `1`로 설정 시 이메일 인증 건너뜀

## 기술 스택

- **Framework**: Next.js 14 App Router (TypeScript)
- **Database / Auth / Storage**: Supabase
- **AI**: OpenAI API (`openai` 패키지, Responses API 사용)
- **Styling**: CSS (별도 .css 파일, CSS 변수 기반 테마)
- **유효성 검사**: Zod

## 아키텍처: 2중 사용자 시스템

Supabase 인증 유저(`auth.users`)와 앱 자체 유저 테이블(`user`)이 분리되어 있음. 이메일로 매핑.

- `auth.users.id` (UUID) — Supabase 인증 레이어
- `user.id` (integer) — 앱 내부 user_id, DB 외래키에 사용
- `getOrCreateAppUserId(email)` — 이메일로 앱 유저 id 조회/생성 (5분 인메모리 캐시)
- `requireAppUserContext()` — 인증 + 앱 유저 id 동시 반환

## 인증 패턴

- 서버 컴포넌트: `requireUser()` 또는 `requireAppUserContext()`
- API 라우트: `getCurrentUser()` + `getOrCreateAppUserId()`
- DB 직접 접근: 항상 `createServiceRoleSupabaseClient()` 사용 (RLS 우회)
- 미들웨어가 `x-auth-checked`, `x-auth-user-id`, `x-auth-user-email` 헤더 주입 → `getCurrentUser()`에서 Supabase 재호출 없이 사용

## 아키텍처: AI 코디 추천 파이프라인

`lib/ai/` 하위 모듈이 역할별로 분리됨:

1. `recommend-schemas.ts` — Zod 스키마, OpenAI JSON Schema 상수, 타입 정의, 폴백 값
2. `recommend-openai.ts` — OpenAI 클라이언트 생성, JSON 파싱, Responses API 래퍼
3. `recommend-scoring.ts` — 날씨/착용 빈도 기반 옷 점수 계산 (순수 함수)
4. `recommend-color.ts` — 색상 분류 및 조화 로직
5. `recommend-selection.ts` — 후보 아이템 선택 및 최종 코디 조합
6. `recommendOutfitShared.ts` — 위 모듈들의 re-export (하위 호환용, 신규 코드는 직접 import)

API 엔드포인트: `POST /api/outfits/recommend-ai` (OpenAI 사용), `/api/outfits/recommend` (룰 기반)

## 아키텍처: 옷장 데이터 조회

`lib/queries/wardrobe.ts`의 `getWardrobePageData()`:
- 아이템 목록, 카테고리 카운트, 착용 횟수, 최근 착용일, 즐겨찾기 상위 3개를 한 번에 반환
- 10초 인메모리 캐시 (서버 재시작 시 초기화)
- 착용 횟수는 `outfit_item`과 `outfit_photo_item` 양쪽을 합산

## 주요 DB 테이블

- `user` — id(int), email
- `item` — id, user_id(→user.id), name, category, image_path 등
- `outfit` — id, user_id, date, note, city, t_min, t_max, humidity, rain
- `outfit_item` — outfit_id (CASCADE DELETE), item_id
- `outfit_photo` — id, outfit_id, photo_path
- `outfit_photo_item` — photo_id, item_id (사진 태그)

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
