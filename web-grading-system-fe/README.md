# Web Grading System — Frontend

React + TypeScript + antd + axios SPA for the grading system.

**Conventions live in `.opencode/skills/react-frontend-antd/SKILL.md`** (repo root) —
read it before adding a screen, an API call, or a translation key. The phased plan is in
`docs/design/frontend-course-ui-plan.md`.

## Run

```bash
cd frontend-src/web-grading-system-fe
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server, proxies `/api/**` to the API gateway |
| `npm run lint` | oxlint |
| `npm run i18n:check` | asserts `src/locales/vi.json` and `en.json` have identical keys |
| `npm run build` | `i18n:check && tsc -b && vite build` |
| `npm run preview` | serve the built `dist/` |

## Environment

`.env.development` (committed default) / `.env.development.local` (per machine,
gitignored):

```
# Local dev (default):
VITE_API_PROXY_TARGET=http://localhost:30195     # Traefik NodePort (this machine)
# Public tunnel (for contributors without a local gateway — uncomment if needed):
# VITE_API_PROXY_TARGET=https://web-dev1-api.vucongtuanduong.dpdns.org
# Gateway booted locally:
# VITE_API_PROXY_TARGET=http://localhost:8080
```

The dev server proxies `/api` to that target so the browser only ever sees
`localhost:5173` — same-origin, therefore no CORS. The gateway itself has no CORS filter;
pointing axios straight at another origin would be blocked on the `X-User-Id` header.

## Vercel deployment

- **Root Directory** in the Vercel project settings must be set to `frontend-src/web-grading-system-fe`.
- `vercel.json` declares `outputDirectory: "dist"` and two rewrites:
  - `/api/:path*` → `https://web-dev1-api.vucongtuanduong.dpdns.org/api/:path*`
    (public hostname routed through the Cloudflare Zero Trust tunnel → Traefik gateway)
  - `/(.*)` → `/index.html` (SPA fallback for `createBrowserRouter`)
- The `/api` rewrite includes `Cache-Control: no-store` headers so Vercel's CDN
  does not cache responses carrying `X-User-Id`.
- The app uses relative `/api/v1/**` paths (`baseURL: ''` in `src/shared/api/http.ts`).
  Vercel's rewrite makes those transparently reach the gateway without CORS.
- No `VITE_API_BASE_URL` env var is needed — the rewrite handles routing.

## Identity (pre-Keycloak)

`/login` asks for a role (Giảng viên / Sinh viên) and a UUID, stored in
`localStorage['wgs.identity']`. Every request gets `X-User-Id` from
`src/shared/auth/identity.ts` — the single place to swap in Keycloak later.

The UUID must exist in the backend (a lecturer's `ownerId`, or a
`class_students.student_user_id`), otherwise reads return empty/404.

## Layout of `src/`

```
app/        App, providers (ConfigProvider + i18n), router
shared/     api (axios + endpoints), auth, theme tokens, layout, types, ui
locales/    vi.json · en.json · i18n.ts
features/   auth · classes · student   (screens live here)
```

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Foundation: proxy, theme, i18n, axios layer, identity, routing, shell | **done** |
| 2 | Lecturer class list (create / archive) | **done** (verified 2026-09-28) |
| 3 | Lecturer class detail: roster + CSV import, score components, score entry, transcript | pending |
| 4 | Student endpoints in `course-service` (`/api/v1/student/classes*`) | pending |
| 5 | Student screens: my classes, roster, my scores | pending |
| 6 | Vercel deployment + CDN cache hardening | **done** |
| 7 | Hardening + docs | pending |

Out of scope for now: assignment/plan authoring, submissions + results, Docker image
library, Keycloak.
