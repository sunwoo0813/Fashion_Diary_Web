# Fashion_Diary_Web

패션 다이어리 웹 프로젝트입니다.  
Flask + SQLAlchemy + Supabase(PostgreSQL/Storage) 기반으로 동작합니다.

## 로컬 실행

1. 의존성 설치
```bash
pip install -r requirements.txt
```
2. `.env` 설정
3. 서버 실행
```bash
python app.py
```

## 환경변수

로컬은 `.env`를 사용하고, Vercel은 Project Settings > Environment Variables에 동일한 키를 등록합니다.

필수 키:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_BUCKET`
- `FLASK_SECRET_KEY`
- `KMA_API_KEY` (or `WEATHER_API_KEY`)

## DATABASE_URL 권장값

- 로컬 개발(세션 풀러, IPv4 안정적)
  - `postgresql://postgres.<project_ref>:<password_encoded>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require`
- Vercel 배포(트랜잭션 풀러, 서버리스 권장)
  - `postgresql://postgres.<project_ref>:<password_encoded>@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require`

## 주의사항

- 비밀번호에 `@`가 포함되면 `%40`으로 인코딩해야 합니다.
