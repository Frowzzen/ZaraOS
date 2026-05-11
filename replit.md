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

### Core Architecture (Alpha 0.2+)
- `artifacts/zaraos/src/core/types.ts` — all shared TypeScript interfaces (ParsedCommand, CommandResult, ZaraStatus, PluginManifest, PermissionCategory, etc.)
- `artifacts/zaraos/src/core/zara-runtime.ts` — central Zara Runtime (the OS brain)
- `artifacts/zaraos/src/core/runtime-context.tsx` — React context for useRuntime() hook
- `artifacts/zaraos/src/core/permissions.ts` — deny-by-default permissions system

### App Layer
- `artifacts/zaraos/src/pages/` — all ZaraOS panels (home, assistant, console, apps, files, media, settings, privacy, ai-providers, developers)
- `artifacts/zaraos/src/lib/` — engine modules (ai-engine, voice-engine, gesture-engine, command-router, privacy-store)
- `artifacts/zaraos/src/components/layout.tsx` — desktop OS shell (sidebar + main panel)
- `artifacts/zaraos/src/index.css` — ZaraOS dark theme (electric cyan/teal + violet accents)

### Documentation
- `artifacts/zaraos/docs/ARCHITECTURE.md` — layer diagram and command flow
- `artifacts/zaraos/docs/SECURITY.md` — permission system and threat model
- `artifacts/zaraos/docs/ROADMAP.md` — Alpha → Beta → v1.0 plan
- `artifacts/zaraos/docs/PLUGIN_SPEC.md` — full plugin manifest spec
- `artifacts/zaraos/docs/LOCAL_FIRST_AI.md` — local-first AI philosophy and provider stack
- `artifacts/zaraos/docs/TAURI_ROADMAP.md` — Tauri desktop packaging and Linux ISO strategy
- `artifacts/zaraos/docs/SECURITY_AUDIT_ALPHA_0_1.md` — current security audit

### Shared Libraries
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — Drizzle DB schema

## Architecture — Command Flow

All input (voice, gesture, keyboard, plugin) flows through the Zara Runtime:

```
UI (useRuntime) → Zara Runtime → parseAndRoute() → permission check → dispatch
                                                                    ↓
                                                     AI Layer / System Layer / Plugin Layer
```

## Architecture decisions

- **Layered runtime**: UI → Runtime → [AI | Input | System | Plugin | Security]. UI calls useRuntime(), never engines directly.
- **Deny-by-default permissions**: mic, camera, cloud AI, network, files, system actions all OFF at launch.
- **Structured commands**: parseAndRoute() returns a typed ParsedCommand with intent, confidence, requiresPermission, destructive flags.
- **ZaraStatus**: Zara has 6 status states (idle, listening, thinking, speaking, offline, privacy-lock) tracked by runtime.
- **Frontend-only for Alpha 0.1** — all state in localStorage, no backend calls. Designed so a real backend (Express routes, DB) can be wired in later without restructuring.
- **AI Engine abstraction** (`src/lib/ai-engine.ts`) supports local-first provider selection with cloud fallback. Users bring their own API keys — ZaraOS does not pay for cloud AI calls.
- **Voice and gesture engines** are architecture placeholders — Web Speech API / Whisper.cpp / MediaPipe Hands can be wired into the clearly commented integration points.
- **Plugin manifest** (`PluginManifest` type) is the contract for all third-party plugins — id, name, version, developer, permissions, voiceCommands, gestureCommands, aiCapabilities, sandboxRequired.

## Product

ZaraOS Alpha 0.5 includes:
- **Dashboard** — live clock, system stats, privacy fortress, activity feed
- **Zara Assistant** — AI chat with ZaraStatus states (idle/listening/thinking/speaking/offline/privacy-lock), input source indicators, voice button, mocked responses
- **Console** — natural language command console with structured intent routing
- **App Launcher** — grid of built-in app tiles with voice command hints
- **Files** — placeholder file browser
- **Media** — combined audio/video player placeholder
- **Settings** — system configuration
- **Privacy Panel** — mic/camera/AI/network status and toggles
- **AI Provider Manager** — API key management with AES-GCM encrypted storage + Ollama Model Manager
- **Memory Panel** — full visibility and control over Zara's local memory (stats, pinned, export/import, clear/purge)
- **Developer Portal** — full plugin registry with manifest spec, 4 example plugins, Zara Store preview

## User preferences

- ZaraOS is always dark mode — no light mode toggle at OS level
- No emojis in the UI
- Voice and gesture are first-class input methods (even as placeholders)
- Local AI is the default; cloud AI is opt-in with user-provided keys
- UI never calls engines directly — always through useRuntime()

## Gotchas

- Alpha 0.1 has no backend — all data is mocked or in localStorage
- API keys entered in AI Provider Manager are stored in localStorage only (prototype behavior, clearly labeled in UI)
- Do not attempt to build the Linux ISO in Replit
- When adding real backend routes later, use the api-server artifact and follow the pnpm-workspace skill conventions
- The `App` component had a bad self-import in the original scaffold — this was fixed; the file now exports `MainApp` as default with RuntimeProvider wrapping everything

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- `artifacts/zaraos/src/core/` contains the runtime brain — start here when wiring real engines
- `artifacts/zaraos/src/lib/` contains integration points for Whisper.cpp, MediaPipe, Ollama, etc.
- `artifacts/zaraos/docs/TAURI_ROADMAP.md` is the full plan for going from web app → native desktop app → Linux ISO
