# ZaraOS

A futuristic AI-native desktop operating environment prototype — the app layer for a future bootable Linux USB OS, powered by an AI assistant named Zara.

## Run & Operate

- `pnpm --filter @workspace/zaraos run dev` — run ZaraOS frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + framer-motion
- Routing: wouter
- State: React Context + localStorage (browser); Tauri IPC (native)
- Native desktop: Tauri v2 (target: Linux x86_64, Ubuntu 24.04)
- API: Express 5 (api-server, not yet used by ZaraOS frontend)
- DB: PostgreSQL + Drizzle ORM (not yet used by ZaraOS frontend)
- Build: esbuild (CJS bundle for API server); `cargo tauri build` (native app)

## Where things live

### Core Architecture
- `artifacts/zaraos/src/core/types.ts` — all shared TypeScript interfaces (ParsedCommand, CommandResult, ZaraStatus, PluginManifest, PermissionCategory, CommandIntent, etc.)
- `artifacts/zaraos/src/core/zara-runtime.ts` — central Zara Runtime (the OS brain); includes `systemControlDispatch()` for real power/volume/brightness/WiFi IPC
- `artifacts/zaraos/src/core/runtime-context.tsx` — React context for useRuntime() hook
- `artifacts/zaraos/src/core/permissions.ts` — deny-by-default permissions system

### Tauri IPC Layer
- `artifacts/zaraos/src/core/tauri/tauri-bridge.ts` — `isTauriRuntime()`, `tauriInvoke()`
- `artifacts/zaraos/src/core/tauri/tauri-system.ts` — real system stats (CPU, RAM, disk, network, uptime)
- `artifacts/zaraos/src/core/tauri/tauri-system-controls.ts` — power, volume, brightness, WiFi IPC
- `artifacts/zaraos/src/core/tauri/tauri-apps.ts` — .desktop app scanner + launcher
- `artifacts/zaraos/src/core/tauri/tauri-fs.ts` — file system access + shellExec
- `artifacts/zaraos/src/core/tauri/tauri-keychain.ts` — Stronghold (native) / AES-GCM localStorage (browser) key store

### Rust Backend (src-tauri)
- `artifacts/zaraos/src-tauri/src/commands/system.rs` — `get_system_stats` (sysinfo crate)
- `artifacts/zaraos/src-tauri/src/commands/power.rs` — `power_action`, `set_volume`, `set_brightness`
- `artifacts/zaraos/src-tauri/src/commands/network.rs` — `wifi_scan`, `wifi_connect`, `wifi_disconnect`, `wifi_status`
- `artifacts/zaraos/src-tauri/src/commands/apps.rs` — `list_apps`, `launch_app`
- `artifacts/zaraos/src-tauri/src/commands/mod.rs` — command registration
- `artifacts/zaraos/src-tauri/src/main.rs` — Tauri app entry point

### App Layer
- `artifacts/zaraos/src/pages/` — all ZaraOS panels (home, assistant, console, apps, files, media, settings, privacy, ai-providers, developers, memory, skills)
- `artifacts/zaraos/src/lib/` — engine modules (ai-engine, voice-engine, gesture-engine, command-router, privacy-store)
- `artifacts/zaraos/src/lib/command-router.ts` — intent classifier with full `system_control` intent for power/volume/brightness/WiFi voice commands
- `artifacts/zaraos/src/components/layout.tsx` — desktop OS shell (sidebar + main panel + Power menu)
- `artifacts/zaraos/src/components/first-boot-setup.tsx` — Ollama model selector wizard (Tauri-only, KV-gated)
- `artifacts/zaraos/src/index.css` — ZaraOS dark theme (electric cyan/teal + violet accents)

### Resources (bundled into native app)
- `artifacts/zaraos/src-tauri/resources/zaraos-ollama.service` — systemd user service for Ollama
- `artifacts/zaraos/src-tauri/resources/zaraos-session.sh` — Openbox session script (Openbox → picom → Ollama → ZaraOS binary)
- `artifacts/zaraos/src-tauri/resources/zaraos-openbox.desktop` — XDG session registration
- `artifacts/zaraos/src-tauri/resources/lightdm.conf` — LightDM auto-login config
- `artifacts/zaraos/src-tauri/resources/zaraos-plymouth/` — Plymouth boot splash theme

### ISO Build Scripts
- `scripts/build-iso.sh` — full 7-phase Ubuntu 24.04 → ZaraOS ISO build pipeline (requires root + compiled binary)
- `scripts/setup-linux.sh` — one-shot Ubuntu dev environment setup (Rust, Tauri CLI, Node, pnpm, Ollama, GPU detection)

### Documentation
- `artifacts/zaraos/docs/ARCHITECTURE.md` — layer diagram and command flow
- `artifacts/zaraos/docs/SECURITY.md` — permission system and threat model
- `artifacts/zaraos/docs/ROADMAP.md` — Alpha → Beta → v1.0 plan
- `artifacts/zaraos/docs/PLUGIN_SPEC.md` — full plugin manifest spec
- `artifacts/zaraos/docs/LOCAL_FIRST_AI.md` — local-first AI philosophy and provider stack
- `artifacts/zaraos/docs/TAURI_ROADMAP.md` — Tauri desktop packaging and Linux ISO strategy

### Shared Libraries
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — Drizzle DB schema

## Architecture — Command Flow

All input (voice, gesture, keyboard, plugin) flows through the Zara Runtime:

```
UI (useRuntime) → Zara Runtime → parseAndRoute() → permission check → dispatch
                                                                    ↓
                              system_control  →  Tauri IPC (power / volume / brightness / WiFi)
                              skill_action    →  Skill Runtime
                              ai_question     →  AI Runtime → Provider Router
                              navigation      →  React Router (wouter)
```

## Architecture decisions

- **Layered runtime**: UI → Runtime → [AI | Input | System | Plugin | Security]. UI calls useRuntime(), never engines directly.
- **Deny-by-default permissions**: mic, camera, cloud AI, network, files, system actions all OFF at launch.
- **Structured commands**: parseAndRoute() returns a typed ParsedCommand with intent, confidence, requiresPermission, destructive flags. `system_control` intent routes to real Tauri IPC in native mode, returns a clear "native only" message in browser.
- **ZaraStatus**: Zara has 6 status states (idle, listening, thinking, speaking, offline, privacy-lock) tracked by runtime.
- **Dual runtime**: All Tauri IPC modules have browser fallbacks — the full UI works in the browser, native features activate automatically when running as a Tauri binary.
- **AI Engine abstraction** (`src/lib/ai-engine.ts`) supports local-first provider selection with cloud fallback. Users bring their own API keys.
- **Plugin manifest** (`PluginManifest` type) is the contract for all third-party plugins.

## Product — Alpha 0.6

- **Dashboard** — live clock, real system stats (CPU, RAM, disk, network — 2s polling in native mode)
- **Zara Assistant** — AI chat with ZaraStatus states, voice/text input, streaming responses
- **Console** — natural language command console with full intent routing including system_control
- **App Launcher** — ZaraOS built-in modules + real installed app grid (scans .desktop files in native mode)
- **Files** — real file browser with breadcrumbs, file type icons, text preview (native); placeholder (browser)
- **Media** — audio/video player placeholder
- **Settings** — Network tab (WiFi scanner + connect form), System tab (real stats, volume/brightness sliders, power buttons)
- **Privacy Panel** — mic/camera/AI/network toggles
- **AI Provider Manager** — API key management (AES-GCM encrypted localStorage) + Ollama Model Manager
- **Memory Panel** — full visibility and control over Zara's local memory
- **Developer Portal** — plugin registry with manifest spec + Zara Store preview
- **Skills Hub** — skill browser and activation panel
- **First-Boot Setup** — Ollama model selector wizard (shown once on first native launch)

## Voice Commands — System Control

These natural language commands are now fully wired from voice/keyboard → Runtime → Tauri IPC:

- Power: "shut down", "restart", "suspend", "lock screen"
- Volume: "volume up", "louder", "volume down", "quieter", "mute", "unmute", "max volume"
- Brightness: "brighter", "dimmer", "full brightness"
- WiFi: "scan wifi", "what wifi networks", "disconnect wifi"

## Getting the Code onto the Dell Laptop

```bash
# On the Dell (Ubuntu fresh install):
git clone https://github.com/YOUR_USERNAME/zaraos.git
cd zaraos
bash scripts/setup-linux.sh      # installs Rust, Node, pnpm, Tauri CLI, Ollama
pnpm install
cargo tauri build                 # compiles the native binary
# After build: binary is at artifacts/zaraos/src-tauri/target/release/zaraos
sudo bash scripts/build-iso.sh   # optional: build a bootable ISO
```

## User preferences

- ZaraOS is always dark mode — no light mode toggle at OS level
- No emojis in the UI
- Voice and gesture are first-class input methods (even as placeholders)
- Local AI is the default; cloud AI is opt-in with user-provided keys
- UI never calls engines directly — always through useRuntime()

## Gotchas

- All Tauri IPC modules (`src/core/tauri/`) have browser fallbacks — never import them unconditionally at module top level in code that runs in both environments; use dynamic `import()` or check `isTauriRuntime()` first.
- `cargo tauri build` only works on Linux x86_64 (Ubuntu). Cannot cross-compile from macOS/Windows for the Linux target without a VM.
- `scripts/build-iso.sh` requires root, `xorriso`, `mksquashfs`, and the compiled Tauri binary at `src-tauri/target/release/zaraos`.
- API keys entered in AI Provider Manager are stored in localStorage only (prototype, clearly labeled in UI).
- The `App` component had a bad self-import in the original scaffold — fixed; the file now exports `MainApp` as default with RuntimeProvider wrapping everything.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- `artifacts/zaraos/src/core/` contains the runtime brain — start here when wiring real engines.
- `artifacts/zaraos/src/lib/` contains integration points for Whisper.cpp, MediaPipe, Ollama, etc.
- `artifacts/zaraos/docs/TAURI_ROADMAP.md` is the full plan for going from web app → native desktop app → Linux ISO.
