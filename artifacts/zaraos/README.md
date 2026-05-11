# ZaraOS

**An AI-native desktop operating environment.**

ZaraOS is the software layer of a future bootable Linux-based USB operating system. It is designed to feel like a high-performance control surface powered by an AI assistant named Zara — voice-first, gesture-forward, local-first, and privacy-focused.

This is ZaraOS Alpha 0.1 — the UI and architecture foundation.

---

## What It Is

ZaraOS is not a Linux distribution. Linux is the future hardware compatibility layer. ZaraOS is the AI operating environment that runs on top of it — analogous to how macOS is the experience layer running on Apple Silicon.

The vision: boot a USB drive, ZaraOS launches, and Zara is there waiting. No mouse required. Speak to it. Gesture at it. It handles the rest.

---

## Run It

```bash
pnpm --filter @workspace/zaraos run dev
```

Requires Node.js 24 and pnpm. No backend needed for Alpha 0.1.

---

## What Is Built

| Panel             | Description                                              |
|-------------------|----------------------------------------------------------|
| Dashboard         | Live clock, system stats, privacy fortress, activity feed |
| Zara Assistant    | AI chat with status states, voice input, mocked responses |
| Zara Console      | Natural language command console (not a Linux terminal)  |
| App Launcher      | Voice/gesture-friendly app grid                          |
| Files             | Placeholder file browser                                 |
| Media             | Audio/video player placeholder                           |
| Settings          | System configuration                                     |
| Privacy Panel     | Mic/camera/AI/network toggles and status                 |
| AI Providers      | API key management for 8 providers (localStorage only)   |
| Developer Portal  | Plugin registry, manifest spec, Zara Store preview       |

---

## Architecture

All input flows through the **Zara Runtime** (`src/core/zara-runtime.ts`). The UI never calls engines directly.

```
UI → useRuntime() → Zara Runtime → [AI | Input | System | Plugin | Security] Layer
```

See `docs/ARCHITECTURE.md` for the full diagram and command flow.

---

## Documentation

| File                              | Contents                                         |
|-----------------------------------|--------------------------------------------------|
| `docs/ARCHITECTURE.md`            | Layer diagram, command flow, state management    |
| `docs/SECURITY.md`                | Permission system, API key handling, threat model |
| `docs/ROADMAP.md`                 | Alpha → Beta → v1.0 milestone plan               |
| `docs/PLUGIN_SPEC.md`             | Full plugin manifest spec and examples           |
| `docs/LOCAL_FIRST_AI.md`          | Local AI philosophy, provider stack, hardware guide |
| `docs/TAURI_ROADMAP.md`           | Desktop packaging plan, Linux ISO strategy       |
| `docs/SECURITY_AUDIT_ALPHA_0_1.md`| Current audit findings and recommendations      |

---

## Tech Stack

- React 18 + TypeScript
- Vite + Tailwind CSS
- shadcn/ui + Framer Motion
- wouter (routing)
- lucide-react (icons)
- localStorage (all state — no backend in Alpha 0.1)

---

## What Is Not Built Yet

- Real voice recognition (Web Speech API integration point is ready)
- Real gesture recognition (MediaPipe Hands integration point is ready)
- Real Ollama connection (integration point is ready in `src/lib/ai-engine.ts`)
- Real file system access (requires Tauri)
- Backend (Express + PostgreSQL exists in the monorepo but is not connected)
- Tauri packaging (see `docs/TAURI_ROADMAP.md`)
- Linux ISO (see `docs/TAURI_ROADMAP.md`)

---

## Security

API keys are stored in `localStorage` only. Never logged. Never transmitted. All AI responses are mocked in Alpha 0.1. See `docs/SECURITY.md` and `docs/SECURITY_AUDIT_ALPHA_0_1.md`.

---

## Product Rules

- ZaraOS does not pay for AI inference. Users bring their own API keys.
- Local AI is the default. Cloud AI is opt-in.
- No telemetry. No analytics. No external calls.
- Always dark mode. No light mode toggle.
- No emojis in the UI.
- Voice and gesture are first-class inputs. Keyboard is the fallback.
