# AGENTS.md

## Cursor Cloud specific instructions

`contentout-editor-panel` is the **Contentout Team Portal** — a Vite + React 19 + TypeScript SPA (`src/`) plus a Node/Express + SQLite backend (`server/`). It runs in two modes, selected by the `VITE_API_URL` env var (see `DEPLOYMENT.md`):

- **Demo mode** (no `VITE_API_URL`): the SPA uses the in-memory mock provider (`src/store.tsx`). Zero config; state resets on reload.
- **Official mode** (`VITE_API_URL` set, e.g. via `.env.local`): the SPA uses the backend provider (`src/backendStore.tsx`) → real JWT auth, SQLite persistence, server-enforced role permissions, SSE live notifications, and a server-side Anthropic AI proxy.

Standard commands live in `package.json` (`scripts`):

- Frontend only (demo mode): `npm run dev` (Vite on `http://localhost:5173/`).
- Full stack (official mode): `npm run dev:all` — runs the API (`server/index.js` on `:8787`) and Vite together. Requires `.env.local` containing `VITE_API_URL=http://localhost:8787`.
- Backend only: `npm run server`.
- Lint: `npm run lint` (oxlint). Build: `npm run build` (`tsc -b && vite build`). Preview: `npm run preview`.

Non-obvious notes:
- Package manager is **npm**; Node 22.x. The lint (oxlint) has no type-aware rules — rely on `npm run build` for type checking.
- `tsc` only compiles `src/` (per `tsconfig.app.json`); the backend in `server/` is plain ESM JS and is not type-checked by the build.
- **The backend now requires Postgres** via `DATABASE_URL` (see `.env`, loaded by dotenv). Official mode won't start without it; run a local Postgres for full-stack dev. Demo mode (no `VITE_API_URL`) needs no database. Data is stored as JSONB; the DB self-seeds from `server/seed.js` (controlled by `SEED_DEMO`).
- Live notifications use **WebSockets** (`/ws`); AI chat **streams** via `/api/ai/stream`. AI/email/Discord all degrade gracefully without keys.
- The frontend data layer is the same `AppContext` interface for both providers (`src/store.tsx` mock, `src/backendStore.tsx` real, shared via `src/appContext.tsx`); components never call the backend directly — they go through the provider + `src/lib/api.ts`.
- Auth/session token is held in memory only (no localStorage/sessionStorage), so a hard refresh logs you out in official mode by design. The Queue view toggle (`Queue`/`Calendar`) also resets to `Queue` on reload — re-click `Calendar` after any reload.
- Deploy target is **Railway** (one project: Postgres + `api` + `web`), configured by `Dockerfile.api` / `Dockerfile.web` and documented in `DEPLOYMENT.md`.
- **Screen-capture gotcha (important for verifying animations):** this VM's screenshot/recording pipeline does NOT capture GPU-composited `opacity`/`transform` animations, so CSS keyframes and Web Animations API transitions (e.g. the calendar month slide/fade in `src/components/CalendarView.tsx`) look *instant* in screenshots and screen recordings even when they are running correctly. Don't conclude an animation is broken from video/screenshots alone — verify by sampling `getComputedStyle(el).opacity` mid-animation in the DevTools console (it will read a fractional value while `playState === 'running'`). They animate normally on a real user's machine.
