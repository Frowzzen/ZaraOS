# ZaraOS — GitHub Export Guide

This guide explains how to push ZaraOS to GitHub and run it on any development machine.

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
git commit -m "ZaraOS Alpha 0.2 — initial export"
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
# Run ZaraOS frontend only (recommended for development)
pnpm --filter @workspace/zaraos run dev

# The terminal will print the local URL:
# http://localhost:<PORT>
# Open this in your browser.
```

Or set a specific port:

```bash
PORT=5173 pnpm --filter @workspace/zaraos run dev
```

---

## Building for Production

```bash
# Build the ZaraOS frontend
pnpm --filter @workspace/zaraos run build

# Output: artifacts/zaraos/dist/
```

---

## Previewing the Production Build

```bash
pnpm --filter @workspace/zaraos run preview
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

## Linting (if configured)

```bash
pnpm run lint
```

---

## Package Scripts Summary

From the repo root:

| Script | What it does |
|---|---|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run typecheck` | Full TypeScript check across all packages |
| `pnpm run build` | Build all packages |
| `pnpm --filter @workspace/zaraos run dev` | Run ZaraOS dev server |
| `pnpm --filter @workspace/zaraos run build` | Build ZaraOS production bundle |
| `pnpm --filter @workspace/zaraos run preview` | Preview production build |
| `pnpm --filter @workspace/api-server run dev` | Run API server (Alpha — not yet used) |

---

## Environment Variables

ZaraOS Alpha 0.1/0.2 requires **no environment variables** to run.

For the API server (not yet used by ZaraOS frontend):

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/zaraos
SESSION_SECRET=change-this-to-a-random-string
PORT=5000
```

Create a `.env.local` file in `artifacts/api-server/` — this file is gitignored.

**Never commit `.env` files with real secrets.**

---

## What Is Mocked in Alpha 0.1/0.2

The following features are declared but not live:

| Feature | Status |
|---|---|
| AI responses (Zara) | Mocked canned responses |
| Voice input (Whisper/Web Speech) | Architecture stub |
| Gesture recognition (MediaPipe) | Architecture stub |
| Email, SMS, calls | Declared skills — not wired |
| File system access | Mocked file browser |
| Calendar, reminders | Mocked local data |
| Web search | Mocked response |
| Local AI (Ollama / llama.cpp) | Provider selection mocked |
| Cloud AI providers | Key input saved to localStorage only |

---

## What Must Be Done Later for Tauri / Linux

See `LINUX_ISO_PREP.md` for the full roadmap. Summary:

1. Install Tauri CLI: `cargo install tauri-cli` (requires Rust)
2. Initialize Tauri in the ZaraOS artifact: `tauri init`
3. Configure Tauri's `tauri.conf.json` to point to the Vite build
4. Run: `tauri dev` (native window) or `tauri build` (distributable)
5. Wire real system calls (file access, notifications, audio) via Tauri plugins
6. Replace mocked engines with real implementations (Whisper.cpp, MediaPipe, Ollama)
7. Bundle into a custom Ubuntu/KDE ISO using Cubic

---

## Repo Structure

```
zaraos/
├── artifacts/
│   ├── zaraos/              # ZaraOS React + Vite frontend
│   │   ├── src/
│   │   │   ├── core/        # Runtime, types, permissions, skills
│   │   │   ├── components/  # UI components (layout, dialogs)
│   │   │   ├── pages/       # All OS panels
│   │   │   ├── lib/         # Engines, command router, privacy store
│   │   │   └── App.tsx      # Root with route definitions
│   │   └── docs/            # ZaraOS technical documentation
│   └── api-server/          # Express API server (Alpha — not yet used)
├── lib/
│   ├── api-spec/            # OpenAPI spec + generated hooks/schemas
│   └── db/                  # Drizzle ORM schema
├── scripts/                 # Utility scripts
├── pnpm-workspace.yaml      # Workspace config
└── README.md
```

---

## Community and Contributing

ZaraOS is open-source and designed to be community-extendable through the plugin/skill system.

See `PLUGIN_SPEC.md` for the plugin manifest specification.  
See `SKILLS_ARCHITECTURE.md` for how skills work.  
See `ROADMAP.md` for the Alpha → Beta → v1.0 plan.
