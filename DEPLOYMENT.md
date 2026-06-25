# Deploying the Contentout Team Portal on Railway

Everything lives on **one Railway project** with three services: **Postgres** (database), **api** (the Express + WebSocket backend), and **web** (the built SPA). The repo includes `Dockerfile.api`, `Dockerfile.web`, and a static server (`server/static.js`).

The app has two modes, chosen by `VITE_API_URL`:
- **Demo mode** (no `VITE_API_URL`): the SPA runs on an in-memory mock. Zero config.
- **Official mode** (`VITE_API_URL` set): the SPA talks to the real backend → JWT auth, Postgres persistence, server-enforced roles, WebSocket live notifications, streaming AI.

## Run locally (official mode)

Requires a local Postgres. `.env` (gitignored) holds `DATABASE_URL`, `JWT_SECRET`, etc.

```bash
npm install
npm run dev:all          # API on :8787 + Vite on :5173
```

`.env.local` sets `VITE_API_URL=http://localhost:8787`. Sign in with a seeded account (password `contentout`), e.g. `yuvi@contentout.co`.

## Deploy on Railway — click by click (no prior Railway experience needed)

1. Go to **railway.app**, sign in with GitHub, and click **New Project → Deploy from GitHub repo**; pick this repo. Railway makes the first service — rename it **api** (service Settings → Name).
2. **Add Postgres:** in the project, click **New → Database → Add PostgreSQL**. Railway creates a `Postgres` service with a `DATABASE_URL` variable. No setup needed.
3. **Configure the `api` service** → Settings → **Build**: set **Dockerfile Path** to `Dockerfile.api`. → Settings → **Networking**: click **Generate Domain** (gives a public URL like `api-production.up.railway.app`). → **Variables**, add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`  *(reference variable — type it exactly)*
   - `JWT_SECRET` = click the variable's **⋯ → Generate** (random value)
   - `SEED_DEMO` = `false`
   - `OWNER_EMAIL` = your email · `OWNER_PASSWORD` = a strong password · `OWNER_NAME` = your name
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://${{web.RAILWAY_PUBLIC_DOMAIN}}`
   - `ALLOWED_ORIGINS` = `https://${{web.RAILWAY_PUBLIC_DOMAIN}}`
   - *(optional)* `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `DISCORD_WEBHOOK_URL`
4. **Add the `web` service:** project → **New → GitHub Repo** → same repo. Rename it **web**. → Settings → **Build**: Dockerfile Path = `Dockerfile.web`. → Settings → **Networking**: **Generate Domain** (this is the URL you'll share with your team). → **Variables**, add:
   - `VITE_API_URL` = `https://${{api.RAILWAY_PUBLIC_DOMAIN}}`
5. **Redeploy** both services (Railway usually does this automatically when variables change; if not, each service → **Deploy**). Because the reference variables wire the URLs for you, you never paste a URL by hand.
6. Open the **web** service's public domain — that's your live portal. Sign in as the owner (`OWNER_EMAIL` / `OWNER_PASSWORD`).

### Which secrets you set vs. auto-generated
- **You set:** `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_NAME`, and any optional `ANTHROPIC_API_KEY` / `RESEND_API_KEY` / `DISCORD_WEBHOOK_URL`.
- **Auto-generated / auto-wired:** `JWT_SECRET` (Railway "Generate"), `DATABASE_URL` (from the Postgres service), and `FRONTEND_URL` / `ALLOWED_ORIGINS` / `VITE_API_URL` (reference variables).

## Onboarding your team
- **Invite:** People → Invite (email + role) → send the generated invite link; they set their own password at `/claim`.
- **Self-serve sign-up:** new editors can sign up from the login screen (set `ALLOW_SIGNUP=false` on the `api` service to disable).
- **Passwords:** anyone can change theirs under Profile → Change password.
- **Create work:** Team → New project (pick/add client, assign, optional AI brief).

## Notes
- The backend requires `DATABASE_URL` (Postgres). It refuses to boot in production with the default `JWT_SECRET`.
- Live notifications use WebSockets (`/ws`); AI chat streams token-by-token. Both work on Railway's always-on infra.
- Permissions are enforced server-side (pay/billing is stripped from API responses for anyone who isn't the Owner or that editor).
