# ZaraOS

A futuristic AI-native desktop operating environment prototype — the app layer for a future bootable Linux USB OS, powered by an AI assistant named Zara.

## Run & Operate

- `pnpm --filter @workspace/zaraos run dev` — run ZaraOS frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + framer-motion
- Routing: wouter
- State: React Context + localStorage (no backend for Alpha 0.1)
- API: Express 5 (api-server, not yet used by ZaraOS Alpha 0.1)
- DB: PostgreSQL + Drizzle ORM (not yet used by ZaraOS Alpha 0.1)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/zaraos/src/pages/` — all ZaraOS panels (home, assistant, console, apps, files, media, settings, privacy, ai-providers, developers)
- `artifacts/zaraos/src/lib/` — architecture modules (ai-engine, voice-engine, gesture-engine, command-router, privacy-store)
- `artifacts/zaraos/src/components/layout.tsx` — desktop OS shell (sidebar + main panel)
- `artifacts/zaraos/src/index.css` — ZaraOS dark theme (electric cyan/teal + violet accents)
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — Drizzle DB schema

## Architecture decisions

- Frontend-only for Alpha 0.1 — all state in localStorage, no backend calls. Designed so a real backend (Express routes, DB) can be wired in later without restructuring.
- AI Engine abstraction (`src/lib/ai-engine.ts`) supports local-first provider selection with cloud fallback. Users bring their own API keys — ZaraOS does not pay for cloud AI calls.
- Voice and gesture engines are architecture placeholders — Web Speech API / Whisper.cpp / MediaPipe Hands can be wired into the clearly commented integration points.
- Command router accepts both typed and speech-to-text input, routes to simulated responses now, designed for allowlist-gated Linux command execution later.
- Privacy store tracks mic/camera/AI/network state as a React Context backed by localStorage.

## Product

ZaraOS Alpha 0.1 includes:
- **Dashboard** — live clock, system stats, privacy fortress, activity feed
- **Zara Assistant** — AI chat with typing effects and mocked responses
- **Console** — natural language command console (not a Linux terminal)
- **App Launcher** — grid of built-in app tiles (Web Browser, Files, Documents, Video, Audio, Settings, Developer Portal, AI Provider Manager)
- **Files** — placeholder file browser
- **Media** — combined audio/video player placeholder
- **Settings** — system configuration
- **Privacy Panel** — mic/camera/AI/network status and toggles
- **AI Provider Manager** — API key management for OpenAI, Anthropic, Gemini, Grok, DeepSeek, Ollama, llama.cpp
- **Developer Portal** — plugin ecosystem preview with mock plugin registry

## User preferences

- ZaraOS is always dark mode — no light mode toggle at OS level
- No emojis in the UI
- Voice and gesture are first-class input methods (even as placeholders)
- Local AI is the default; cloud AI is opt-in with user-provided keys

## Gotchas

- Alpha 0.1 has no backend — all data is mocked or in localStorage
- API keys entered in AI Provider Manager are stored in localStorage only (prototype behavior, clearly labeled in UI)
- Do not attempt to build the Linux ISO in Replit
- When adding real backend routes later, use the api-server artifact and follow the pnpm-workspace skill conventions

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- `artifacts/zaraos/src/lib/` contains integration points for Whisper.cpp, MediaPipe, Ollama, etc.
