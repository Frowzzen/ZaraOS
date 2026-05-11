# ZaraOS — Replit Independence Audit

**Date:** Alpha 0.3 (updated post-portability fix)
**Status:** PASSED — No Replit lock-in. Builds and runs on any machine.
**Auditor:** ZaraOS Dev Session

---

## Purpose

Verify that ZaraOS can be exported to GitHub, cloned on any Linux/Mac/Windows machine,
run with standard Node.js tooling, and eventually packaged as a Tauri desktop app
or included in a custom Linux ISO — without any Replit-specific dependency breaking.

---

## Portability Fix Applied in Alpha 0.3

A build portability issue was identified and fixed before the Alpha 0.3 release:

**Root cause:** `vite.config.ts` threw fatal errors if `PORT` or `BASE_PATH` were not
set in the environment. Since Replit's workflow system injects these variables, builds
inside Replit worked fine, but `pnpm --filter @workspace/zaraos run build` failed on
any machine without them.

**Fix applied:**
- `PORT` now defaults to `5173` (Vite's standard dev port) if not set.
- `BASE_PATH` now defaults to `"/"` if not set.
- Neither variable is required. Replit may still override them via `artifact.toml`
  `[services.env]` — the app reads them if present, uses defaults if not.
- Replit-specific Vite plugins (`@replit/vite-plugin-cartographer`,
  `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal`)
  are now conditionally loaded only when `REPL_ID` is present in the environment.
  Outside Replit they are silently skipped.
- `strictPort: false` so the dev server finds the next available port if 5173 is taken.

**Result:** All four standard scripts now work without any environment setup:

```bash
pnpm --filter @workspace/zaraos run dev
pnpm --filter @workspace/zaraos run build
pnpm --filter @workspace/zaraos run preview
pnpm --filter @workspace/zaraos run typecheck
```

---

## What Was Checked

### 1. Replit Database (Neon / Replit DB / key-value store)
**Status: NOT USED in ZaraOS frontend (Alpha 0.x)**

- No `@replit/database` import found anywhere.
- No `REPLIT_DB_URL` environment variable referenced.
- The `api-server` artifact uses PostgreSQL via Drizzle ORM with a standard `DATABASE_URL`
  connection string — this works with any Postgres instance (local, Supabase, Neon, Railway, etc.).
- ZaraOS Alpha 0.x uses `localStorage` only — no backend calls at all.

### 2. Replit Auth
**Status: NOT USED**

- No `@replit/passport` import found.
- No `REPLIT_ID`, `REPLIT_PUBKEY`, `REPLIT_IDENTITY`, or similar auth env vars referenced.
- No authentication system in Alpha 0.x (by design — local OS, no multi-user yet).

### 3. Environment Variables
**Status: ALL OPTIONAL — safe defaults provided**

| Variable | Usage | Default | Portable? |
|---|---|---|---|
| `PORT` | Dev/preview server port | `5173` | YES |
| `BASE_PATH` | App base path for routing | `"/"` | YES |
| `DATABASE_URL` | Postgres connection string (API server only) | None needed for frontend | YES |
| `SESSION_SECRET` | Express session signing (API server only) | None needed for frontend | YES |
| `REPL_ID` | Detects Replit environment | Absent outside Replit | YES — only loads optional Replit plugins |

No `REPL_OWNER`, `REPL_SLUG`, `REPLIT_CLUSTER`, or other Replit-only vars used in
any required code path.

### 4. Hardcoded Replit URLs
**Status: NOT FOUND**

- No hardcoded `*.replit.app` URLs in source code.
- No hardcoded `localhost:PORT` bypassing the proxy.
- All internal routing uses relative paths.

### 5. Replit Secrets Manager
**Status: NOT USED**

- `SESSION_SECRET` is referenced as standard `process.env.SESSION_SECRET` — works anywhere.
- API keys in the AI Provider Manager are stored in `localStorage` only (by design).
- No `@replit/sdk` or Replit secrets API imported.

### 6. Replit-Only Vite Plugins
**Status: OPTIONAL — conditionally loaded**

The three Replit Vite plugins are included in `devDependencies` and **will be installed**
by `pnpm install` on any machine (they are small packages). However, they are **only
activated** when `REPL_ID` is present:

```ts
const isReplitEnv = process.env.REPL_ID !== undefined;
// plugins only loaded if isDev && isReplitEnv
```

Outside Replit, `REPL_ID` is absent, so the plugins are skipped. No error, no warning.
The packages install harmlessly and are tree-shaken from the production build.

### 7. Absolute Paths
**Status: NOT FOUND in source**

- No hardcoded `/home/runner/` or `/nix/store/` paths in source code.
- All imports use relative paths or TypeScript path aliases (`@/`).
- `@/` alias resolves to `src/` via `tsconfig.json` — standard Vite/TS pattern.
- `@assets` alias points to `attached_assets/` — this directory may not exist outside
  Replit, but nothing in the current source imports from `@assets`. If it is used in
  future, either commit the assets or conditionally handle the missing directory.

### 8. Hidden Cloud Dependencies
**Status: NONE**

- No external API calls in Alpha 0.3 source code.
- AI runtime (`core/ai/`) uses a simulated local provider by default.
- Ollama and llama.cpp providers are present but disabled by default (require explicit enable).
- Cloud providers (OpenAI, Anthropic, Gemini) require the user's own API key and the
  `cloud_ai` permission to be granted — they make no calls otherwise.
- Voice engine and gesture engine are stubs — no cloud APIs.

### 9. Package Manager
**Status: PORTABLE**

- Uses `pnpm` workspaces — works on any machine with `pnpm` installed.
- `pnpm-lock.yaml` is committed — reproducible installs.
- Node.js 20+ required (documented).

### 10. Build System
**Status: PORTABLE**

- Vite 7 — cross-platform, no Replit dependency.
- Tailwind CSS v4 — PostCSS-based, cross-platform.
- TypeScript 5.9 — standard.
- esbuild — cross-platform binary.

---

## What Was Found and Fixed

One issue was identified and fixed in Alpha 0.3:

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `vite.config.ts` threw fatal errors if `PORT` or `BASE_PATH` were not set | **Blocking** | **Fixed** |

Minor items (non-blocking, no action needed):

| # | Finding | Severity | Status |
|---|---|---|---|
| 2 | `.replit` file — Replit workflow config, harmless outside Replit | Low | No action |
| 3 | `replit.nix` — Nix environment definition, only used by Replit | Low | In .gitignore |
| 4 | `artifact.toml` files — Replit service routing, apps don't depend on them | Low | Kept for reference |
| 5 | `.local/` directory — Replit AI skill definitions | Low | In .gitignore |

---

## How to Run Outside Replit

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/zaraos.git
cd zaraos

# 2. Install Node.js 20+ and pnpm
nvm install 20 && nvm use 20
npm install -g pnpm

# 3. Install dependencies
pnpm install

# 4. Run dev server (opens at http://localhost:5173)
pnpm --filter @workspace/zaraos run dev

# 5. Build for production
pnpm --filter @workspace/zaraos run build
# Output: artifacts/zaraos/dist/public/

# 6. Preview the production build
pnpm --filter @workspace/zaraos run preview

# 7. TypeScript check
pnpm --filter @workspace/zaraos run typecheck
```

No environment variables required for any of the above commands.

---

## Audit Conclusion

**ZaraOS is fully portable.** The one blocking issue (required env vars) has been fixed.
The project can be:

- Pushed to GitHub and cloned on any machine
- Built on any Linux / macOS / Windows machine without environment setup
- Run in CI/CD pipelines without Replit-specific configuration
- Converted to a Tauri desktop app without restructuring
- Included in a custom Linux ISO as a desktop application

See `GITHUB_EXPORT_GUIDE.md` and `LINUX_ISO_PREP.md` for the full export and packaging path.
