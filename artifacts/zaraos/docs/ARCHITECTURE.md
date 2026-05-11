# ZaraOS Architecture

## Overview

ZaraOS is structured as a layered runtime system. All input — from voice, gesture, keyboard, or plugins — flows through a central Zara Runtime before reaching any engine or UI component.

```
┌─────────────────────────────────────────────────────────┐
│                      UI Layer                           │
│  Pages / Panels / Components (React)                    │
│  Only calls Runtime — never engines directly            │
└────────────────────┬────────────────────────────────────┘
                     │ useRuntime()
┌────────────────────▼────────────────────────────────────┐
│                  Zara Runtime                           │
│  src/core/zara-runtime.ts                               │
│  Central command orchestrator. Checks permissions,      │
│  routes intents, manages Zara status, dispatches to     │
│  AI / System / Plugin layers.                           │
└──────┬──────────┬──────────┬──────────┬────────────────┘
       │          │          │          │
┌──────▼──┐ ┌────▼────┐ ┌───▼───┐ ┌───▼───────┐
│AI Layer │ │ Input   │ │System │ │Plugin     │
│ai-engine│ │ Layer   │ │Layer  │ │Layer      │
│(LLM     │ │voice +  │ │(mock/ │ │manifest + │
│ proxy)  │ │gesture  │ │Tauri) │ │registry   │
└─────────┘ └─────────┘ └───────┘ └───────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│               Security / Permissions Layer              │
│  src/core/permissions.ts                                │
│  Enforced by Runtime before every action.               │
└─────────────────────────────────────────────────────────┘
```

---

## Layers

### 1. UI Layer (`src/pages/`, `src/components/`)

React components and pages. They render state and dispatch commands. They must never import `aiEngine`, `voiceEngine`, or `gestureEngine` directly — all communication goes through `useRuntime()`.

### 2. Zara Runtime (`src/core/zara-runtime.ts`)

The brain of ZaraOS. Responsibilities:

- Receives commands from all input sources
- Checks permissions before executing
- Flags destructive actions for confirmation
- Routes intent to the correct downstream layer
- Manages Zara's status state (idle / listening / thinking / speaking / offline / privacy-lock)
- Tracks command history
- Manages plugin registry

### 3. AI Layer (`src/lib/ai-engine.ts`)

Abstraction over all AI providers (local and cloud). In Alpha 0.1, all responses are mocked. Integration points are clearly commented for:

- Ollama (local, REST API on port 11434)
- llama.cpp (local, REST server)
- OpenAI, Anthropic, Gemini, Grok, DeepSeek (cloud, user-provided API keys)

### 4. Input Layer (`src/lib/voice-engine.ts`, `src/lib/gesture-engine.ts`)

All human input channels. Voice and gesture engines normalize their output into the same string format that the command router accepts. Both are architectural placeholders in Alpha 0.1.

Integration points:
- Voice: Web Speech API → Whisper.cpp → Vosk (in order of preference)
- Gesture: MediaPipe Hands → OpenCV

### 5. System Layer (future — `src/core/system-layer.ts`)

Handles app launching, file system access, process management. All mocked in Alpha 0.1. When Tauri is integrated, this layer will use `tauri.invoke()` calls. Linux command execution will use an allowlist: only whitelisted commands can be dispatched, and destructive operations require a confirmation prompt.

### 6. Plugin Layer (`src/core/types.ts` → `PluginManifest`)

Plugins declare their identity, permissions, voice commands, gesture commands, and entry point in a JSON manifest. The runtime validates manifests before registration. Sandbox is required for untrusted plugins (future enforcement).

### 7. Security / Permissions Layer (`src/core/permissions.ts`)

Enforced by the Runtime before every action. No engine or app can access protected capabilities without a granted permission. See `SECURITY.md` for the full model.

---

## Command Flow

```
User speaks: "open settings"
     │
     ▼
VoiceEngine.onResult("open settings")
     │
     ▼
zaraRuntime.executeCommand("open settings", "voice")
     │
     ▼
parseAndRoute("open settings", "voice")
  → intent: "settings_action"
  → target: "/settings"
  → requiresPermission: false
  → destructive: false
  → confidence: 0.97
     │
     ▼
permissionsManager.isGranted("settings_action") → true (not required)
     │
     ▼
CommandResult {
  success: true,
  intent: "settings_action",
  response: "Opening system settings.",
  action: "navigate",
  payload: "/settings",
  source: "voice",
  timestamp: ...
}
     │
     ▼
UI: wouter navigates to /settings
```

---

## State Management

- **PrivacyStore** (`src/lib/privacy-store.tsx`) — React Context backed by localStorage. Tracks mic/camera/AI/network state. Used by all panels.
- **RuntimeContext** (`src/core/runtime-context.tsx`) — Exposes the ZaraRuntime singleton to React components via `useRuntime()`.
- **PermissionsManager** (`src/core/permissions.ts`) — Singleton class backed by localStorage. Checked by the Runtime before every action.
- **AIEngine** (`src/lib/ai-engine.ts`) — Singleton class. Provider configs stored in localStorage (API keys obfuscated, never logged).

---

## Future: Tauri Integration

The System Layer is the only place Tauri calls will appear. The contract (function signatures, return types) will stay identical. The implementation switches from mocked responses to `tauri.invoke()` calls.

See `TAURI_ROADMAP.md` for the full migration plan.
