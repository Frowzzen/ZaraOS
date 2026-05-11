# ZaraOS — Replit Independence Audit

**Date:** Alpha 0.2  
**Status:** PASSED — No blocking Replit lock-in found  
**Auditor:** ZaraOS Dev Session

---

## Purpose

Verify that ZaraOS can be exported to GitHub, cloned on any Linux/Mac/Windows machine,
run with standard Node.js tooling, and eventually packaged as a Tauri desktop app
or included in a custom Linux ISO — without any Replit-specific dependency breaking.

---

## What Was Checked

### 1. Replit Database (Neon / Replit DB / key-value store)
**Status: NOT USED in ZaraOS frontend (Alpha 0.1 / 0.2)**

- No `@replit/database` import found anywhere.
- No `REPLIT_DB_URL` environment variable referenced.
- The `api-server` artifact uses PostgreSQL via Drizzle ORM with a standard `DATABASE_URL`
  connection string — this works with any Postgres instance (local, Supabase, Neon, Railway, etc.).
- ZaraOS Alpha 0.1/0.2 uses `localStorage` only — no backend calls at all.

### 2. Replit Auth
**Status: NOT USED**

- No `@replit/passport` import found.
- No `REPLIT_ID`, `REPLIT_PUBKEY`, `REPLIT_IDENTITY`, or similar auth env vars referenced.
- No authentication system at all in Alpha 0.1/0.2 (by design — local OS, no multi-user yet).

### 3. Replit-Specific Environment Variables
**Status: SAFE — only standard vars used**

| Variable | Usage | Portable? |
|---|---|---|
| `PORT` | Dev server port (set by Replit workflow, but standard) | YES — any runner sets this |
| `BASE_PATH` | Reverse proxy path prefix | YES — standard pattern |
| `DATABASE_URL` | Postgres connection string | YES — any Postgres |
| `SESSION_SECRET` | Express session signing | YES — standard env var |

No `REPL_ID`, `REPL_OWNER`, `REPL_SLUG`, `REPLIT_CLUSTER`, or other Replit-only vars used.

### 4. Hardcoded replit.app URLs
**Status: NOT FOUND**

- No hardcoded `*.replit.app` URLs found in source code.
- No hardcoded `localhost:PORT` bypassing the proxy.
- All internal routing uses relative paths (e.g. `/api`, `/assets`).

### 5. Replit Secrets / Secrets Manager
**Status: NOT USED**

- `SESSION_SECRET` is referenced as a standard `process.env.SESSION_SECRET` — works anywhere.
- API keys in AI Provider Manager are stored in `localStorage` only (by design).
- No Replit secrets API (`@replit/sdk`) imported.

### 6. Server Assumptions (Replit-only execution environment)
**Status: PORTABLE**

- `api-server` uses Express 5 — runs on any Node.js 18+ machine.
- Build uses esbuild — cross-platform.
- No Replit-specific port forwarding or reverse proxy assumptions in code.
- `artifact.toml` files define service routing but the apps themselves don't depend on the proxy —
  they bind to `process.env.PORT` (standard) and can run directly with `PORT=5000 node server.js`.

### 7. Absolute Paths
**Status: NOT FOUND**

- No hardcoded `/home/runner/` or `/nix/store/` paths in source code.
- All file imports use relative paths or TypeScript path aliases (`@/`).
- `@/` alias resolves to `src/` via `tsconfig.json` — standard Vite/TS pattern.

### 8. Hidden Cloud Dependencies
**Status: NONE**

- No external API calls in Alpha 0.1/0.2 source code.
- AI engine (`ai-engine.ts`) is mocked — returns canned responses.
- Voice engine (`voice-engine.ts`) is a stub — no cloud speech API.
- Gesture engine (`gesture-engine.ts`) is a stub — no MediaPipe cloud.
- All skill executions are mocked — no real network requests.

### 9. Package Manager
**Status: PORTABLE**

- Uses `pnpm` workspaces — works on any machine with `pnpm` installed.
- `pnpm-lock.yaml` is committed — reproducible installs.
- Node.js 20+ required (documented in README).

### 10. Build System
**Status: PORTABLE**

- Vite 6 — cross-platform, no Replit dependency.
- Tailwind CSS — PostCSS-based, cross-platform.
- TypeScript 5.9 — standard.
- esbuild — cross-platform binary.

---

## What Was Found

**Zero blocking issues.** The codebase is already portable.

Minor items noted (non-blocking):

1. **`.replit` file** — Defines Replit workflow configuration. Not needed outside Replit but
   also harmless. Added to `.gitignore` (optional — keeping it doesn't break anything on Linux).

2. **`replit.nix`** — Nix environment definition. Only used by Replit's Nix environment.
   Added to `.gitignore`.

3. **`artifact.toml` files** — Replit-specific service routing configuration. Not needed
   outside Replit. On a Linux machine, run services directly with `PORT=3000 pnpm dev`.
   These can stay in the repo as documentation.

4. **`.local/` directory** — Replit-generated AI skill definitions. Already in `.gitignore`.

---

## What Remains Replit-Compatible (But Not Replit-Dependent)

These patterns work equally well on Replit and on a local Linux/Mac machine:

- `process.env.PORT` — any dev runner or systemd unit can set this.
- `process.env.DATABASE_URL` — standard for any Postgres-backed app.
- `process.env.SESSION_SECRET` — standard for any Express app.
- pnpm workspaces — works identically on any OS.
- Vite dev server — identical behavior everywhere.

---

## How to Run Outside Replit

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/zaraos.git
cd zaraos

# 2. Install Node.js 20+ (nvm recommended)
nvm install 20
nvm use 20

# 3. Install pnpm
npm install -g pnpm

# 4. Install dependencies
pnpm install

# 5. Run the ZaraOS frontend
cd artifacts/zaraos
PORT=5173 pnpm dev

# Or from root:
pnpm --filter @workspace/zaraos run dev

# 6. Open in browser
# http://localhost:5173

# Optional: Run the API server (not used by ZaraOS Alpha)
cd artifacts/api-server
DATABASE_URL=postgresql://user:pass@localhost:5432/zaraos \
SESSION_SECRET=your-random-secret \
PORT=5000 pnpm dev
```

---

## Audit Conclusion

**ZaraOS is fully portable.** No Replit lock-in exists. The project can be:

- Pushed to GitHub today
- Cloned and run on any Ubuntu / Debian / Arch / macOS machine
- Converted to a Tauri desktop app without restructuring
- Included in a custom Linux ISO as a desktop application

See `GITHUB_EXPORT_GUIDE.md` and `LINUX_ISO_PREP.md` for the full export and packaging path.
