# AGENTS.md

## Cursor Cloud specific instructions

`contentout-editor-panel` is a **frontend-only** single-page app (Vite + React 19 + TypeScript). There is no backend, database, or external service — the dashboard data is seeded in-memory in `src/App.tsx`, so the dev server is the only thing that needs to run.

Standard commands live in `package.json` (`scripts`). Quick reference:

- Dev server: `npm run dev` (Vite, serves on `http://localhost:5173/`). This is the command to use for development.
- Lint: `npm run lint` (oxlint, configured by `.oxlintrc.json`).
- Build: `npm run build` (runs `tsc -b` then `vite build`; output in `dist/`).
- Preview production build: `npm run preview`.

Non-obvious notes:
- Package manager is **npm** (`package-lock.json`); do not switch to pnpm/yarn.
- Requires Node 20.19+ / 22.12+ for Vite 8. The VM's default Node (v22.x) satisfies this.
- The lint command (`oxlint`) is fast and has no type-aware rules enabled by default; passing lint does not guarantee type-correctness — rely on `npm run build` (`tsc -b`) for type checking.
