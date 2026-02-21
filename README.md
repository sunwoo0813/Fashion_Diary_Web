# Fashion Diary Web (Next.js)

This project now runs on Next.js 14 + TypeScript + Supabase.
Flask is no longer used for runtime or deployment.

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Configure `.env` in the project root.

3. Run the app.

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Required Environment Variables

Public (used by browser + server):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET` (default: `uploads`)
- `APP_BASE_URL` (for auth redirect URLs)
- `AUTH_DISABLE_EMAIL_CONFIRM` (optional)
- `WEATHER_API_KEY` or `KMA_API_KEY`

Optional:

- `DATABASE_URL` (only if direct SQL is needed outside Supabase APIs)

## Vercel Deployment

1. Import this repository in Vercel.
2. Set all required environment variables in Project Settings.
3. Deploy. No Python runtime is required.

## Notes

- Legacy Flask source files may still exist in the repository for reference.
- Active runtime code is in `app/`, `components/`, `lib/`, and `actions/`.
