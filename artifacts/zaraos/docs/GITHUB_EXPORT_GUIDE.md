# ZaraOS — GitHub Export Guide

This guide explains how to push ZaraOS to GitHub and run it on any development machine.
No Replit account or Replit-specific environment is required.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 or 22 LTS recommended | https://nodejs.org or `nvm` |
| pnpm | 9+ | `npm install -g pnpm` |
| Git | 2.30+ | https://git-scm.com |

---

## Pushing to GitHub

```bash
# From the ZaraOS project root
git init
git remote add origin https://github.com/<your-username>/zaraos.git
git add .
git commit -m "ZaraOS Alpha 0.3 — initial export"
git push -u origin main
```

The `.gitignore` already excludes:
- `node_modules/`
- `.env*` files
- `.local/` (Replit-specific agent skills)
- `replit.nix`, `.cache/`, `.upm/`
- Generated PDFs

---

## Cloning on a New Machine

```bash
git clone https://github.com/<your-username>/zaraos.git
cd zaraos
pnpm install
```

---

## Running the Dev Server

```bash
# Run ZaraOS frontend — no environment variables required
pnpm --filter @workspace/zaraos run dev

# The terminal will print:
#   VITE v7.x.x  ready in Xms
#   Local: http://localhost:5173/
# Open this in your browser.
```

To use a different port:

```bash
PORT=3000 pnpm --filter @workspace/zaraos run dev
```

---

## Building for Production

```bash
# Build the ZaraOS frontend — no environment variables required
pnpm --filter @workspace/zaraos run build

# Output: artifacts/zaraos/dist/public/
# This is a standard static Vite build:
#   index.html       — SPA entry point
#   assets/          — bundled JS, CSS, fonts
```

The production build works on any machine without Replit, PORT, or BASE_PATH being set.
Safe defaults are used automatically (`PORT=5173`, `BASE_PATH="/"`).

---

## Previewing the Production Build

```bash
pnpm --filter @workspace/zaraos run preview
# Opens at http://localhost:5173/ (or next available port)
```

---

## TypeScript Checking

```bash
# Check all packages
pnpm run typecheck

# Check ZaraOS frontend only
pnpm --filter @workspace/zaraos run typecheck
```

---

## Package Scripts Summary

All four scripts work without any environment setup:

| Script | What it does |
|---|---|
| `pnpm --filter @workspace/zaraos run dev` | Start dev server at http://localhost:5173 |
| `pnpm --filter @workspace/zaraos run build` | Build production bundle to `dist/public/` |
| `pnpm --filter @workspace/zaraos run preview` | Preview production build locally |
| `pnpm --filter @workspace/zaraos run typecheck` | TypeScript check (zero errors) |
| `pnpm install` | Install all workspace dependencies |
| `pnpm run typecheck` | Full TypeScript check across all packages |

---

## Environment Variables

**ZaraOS frontend requires no environment variables.**

Optional overrides:

| Variable | Default | Effect |
|---|---|---|
| `PORT` | `5173` | Dev/preview server port |
| `BASE_PATH` | `"/"` | App base path (for reverse-proxy sub-path deploys) |

For the API server (not yet used by ZaraOS Alpha 0.x frontend):

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/zaraos
SESSION_SECRET=change-this-to-a-random-string
PORT=5000
```

Create a `.env.local` file in `artifacts/api-server/` — this file is gitignored.

**Never commit `.env` files with real secrets.**

---

## What Is Mocked in Alpha 0.3

The following features are architecturally wired but not running against real systems yet:

| Feature | Status |
|---|---|
| AI responses (Zara) | Simulated by local-provider.ts with realistic latency |
| Ollama integration | Provider adapter written and ready — enable with one flag |
| llama.cpp integration | Provider adapter written and ready — enable with one flag |
| OpenAI / Anthropic / Gemini | Adapters written — requires user API key + cloud_ai permission |
| Voice input (Whisper / Web Speech) | Architecture stub — integration point clearly marked |
| Gesture recognition (MediaPipe) | Architecture stub — integration point clearly marked |
| File system access | Mocked file browser |
| Skills execution | Declared — not wired to real system calls |
| Web search | Mocked response |

---

## What Must Be Done Later for Tauri / Linux

See `LINUX_ISO_PREP.md` for the full roadmap. Summary:

1. Install Tauri CLI: `cargo install tauri-cli` (requires Rust)
2. Initialize Tauri in the ZaraOS artifact: `tauri init`
3. Configure Tauri's `tauri.conf.json` to point to the Vite build output (`dist/public/`)
4. Run: `tauri dev` (native window) or `tauri build` (distributable)
5. Wire real system calls (file access, notifications, audio) via Tauri plugins
6. Replace stubbed engines with real implementations (Whisper.cpp, MediaPipe, Ollama)
7. Bundle into a custom Ubuntu/KDE ISO using Cubic

---

## Repo Structure

```
zaraos/
├── artifacts/
│   ├── zaraos/              # ZaraOS React + Vite frontend
│   │   ├── src/
│   │   │   ├── core/        # Runtime, types, permissions, skills, AI runtime
│   │   │   ├── components/  # UI components (layout, dialogs, error boundary)
│   │   │   ├── pages/       # All 11 OS panels
│   │   │   └── lib/         # Engines, command router, privacy store
│   │   ├── docs/            # ZaraOS technical documentation (19 files)
│   │   └── vite.config.ts   # Portable — no required env vars
│   └── api-server/          # Express API server (Alpha — not yet used by frontend)
├── lib/
│   ├── api-spec/            # OpenAPI spec + generated hooks/schemas
│   └── db/                  # Drizzle ORM schema
├── scripts/                 # Utility scripts
├── pnpm-workspace.yaml      # Workspace config
└── README.md
```

---

## Replit-Specific Files (Safe to Ignore Outside Replit)

| File | Purpose | Outside Replit |
|---|---|---|
| `.replit` | Replit workflow configuration | Ignored automatically |
| `replit.nix` | Nix environment | In `.gitignore` |
| `artifact.toml` | Replit service routing | Harmless — apps don't depend on it |
| `.local/` | Replit AI skill definitions | In `.gitignore` |

---

## Community and Contributing

ZaraOS is open-source and designed to be community-extendable through the plugin/skill system.

See `PLUGIN_SPEC.md` for the plugin manifest specification.
See `SKILLS_ARCHITECTURE.md` for how skills work.
See `ROADMAP.md` for the Alpha → Beta → v1.0 plan.
