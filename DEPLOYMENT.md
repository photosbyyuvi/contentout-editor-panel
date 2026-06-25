# Deployment — Contentout Team Portal

The portal runs in one of two modes, selected purely by the `VITE_API_URL` env var:

- **Demo mode** (no `VITE_API_URL`): the frontend uses an in-memory mock (`src/store.tsx`). Zero config; state resets on reload. Good for previews.
- **Official mode** (`VITE_API_URL` set): the frontend talks to the real backend in `server/` — credentialed JWT auth, a real database, and server-enforced role permissions (`src/backendStore.tsx`).

## Run locally (official mode)

```bash
npm install
npm run dev:all      # starts the API (:8787) and the Vite app (:5173) together
```

`.env.local` already contains `VITE_API_URL=http://localhost:8787`. Sign in with any seeded account (password `contentout`), e.g. `yuvi@contentout.co` (owner), `amrit@contentout.co` (admin), `savithru@contentout.co` (editor). Data persists in `server/data/portal.db` across restarts.

## Production

**Frontend** → Vercel (or any static host). `vercel.json` is included (SPA rewrites). Set the project env var `VITE_API_URL` to your deployed backend URL.

**Backend** (`server/`) → any Node host (Railway, Render, Fly.io, a VM). Set:

| Var | Purpose |
|---|---|
| `JWT_SECRET` | long random string that signs sessions (required) |
| `PORT` | listen port (default 8787) |
| `SQLITE_PATH` | path to the SQLite file on a persistent volume |
| `ANTHROPIC_API_KEY` | enables live AI Mode (otherwise graceful fallback) |
| `RESEND_API_KEY` | enables real notification emails |
| `DISCORD_WEBHOOK_URL` | enables Discord notifications |

### Database

The backend ships on SQLite (`better-sqlite3`) for simplicity and works in production on a host with a persistent volume. To scale, swap the `repo` layer in `server/db.js` for managed Postgres (e.g. Supabase/Neon via a `DATABASE_URL`) — the API routes are storage-agnostic.

### Security notes

- Passwords are bcrypt-hashed; sessions are JWTs (12h).
- Role permissions are enforced server-side per request (not just hidden UI); billing/pay fields are stripped from API responses for anyone who isn't the Owner or the editor themselves.
- The Anthropic key is only ever used server-side; it is never shipped to the browser.
