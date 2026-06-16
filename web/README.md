# Clinic OS — Web Console (operator surface)

Next.js 14 + TypeScript + Tailwind + Zustand. The staff-facing surface: drive test
conversations, watch the routing graph + live timeline, confirm pending writes, and view
analytics. Patient-facing traffic comes through the iOS/Android apps.

## Run
```bash
cd web
npm install
cp .env.local.example .env.local        # NEXT_PUBLIC_API_BASE=http://localhost:8000/api
npm run dev                             # http://localhost:3000
```
In `app/console/page.tsx`, replace `CLINIC` with an id from `python manage.py seed`.

Pages: `/console` (composer + timeline + routing graph + confirm bar), `/` (dashboard),
`/analytics` (intent mix). SSE is consumed via `EventSource` in `lib/api.ts`.
