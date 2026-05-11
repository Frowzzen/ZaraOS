# ZaraOS Tauri Readiness Audit — Alpha 0.5

## Purpose

This audit identifies every browser-specific API, storage mechanism, and architectural assumption in ZaraOS Alpha 0.5 that will need to change when the app is packaged with Tauri. Each item is tagged with a migration priority and a recommended Tauri equivalent.

---

## 1. Voice Engine — Browser-Only

**File:** `src/lib/voice-engine.ts`
**Browser API:** `SpeechRecognition` / `webkitSpeechRecognition` (Web Speech API)
**Status:** Browser-only. Not available in Tauri WebView on all platforms.
**Priority:** HIGH — voice is a first-class input method.

### Migration plan
Replace with **Whisper.cpp** running as a Tauri sidecar subprocess:

```rust
// Tauri command (src-tauri/src/main.rs)
#[tauri::command]
async fn transcribe(audio_bytes: Vec<u8>) -> Result<String, String> {
  // Spawn whisper.cpp subprocess, pass audio, return transcript
}
```

```typescript
// voice-engine.ts — Tauri path
const transcript = await window.__TAURI__.invoke("transcribe", { audio_bytes });
```

The `VoiceEngine` interface (`startListening`, `stopListening`, `onResult`, `onStateChange`) does not change. Only the implementation inside the class changes. Feature detection can select the path at runtime:

```typescript
const isTauri = "__TAURI__" in window;
// → use SpeechRecognition in browser, invoke("transcribe") in Tauri
```

---

## 2. Cloud API Calls — Browser-Only Long-Term

**Files:** `src/core/ai/providers/openai-provider.ts`, `anthropic-provider.ts`, `gemini-provider.ts`
**Browser API:** `fetch()` directly to cloud provider endpoints
**Status:** Works in browser now (with CORS headers). Should move behind Tauri proxy in production.

### Current CORS requirements
- OpenAI: native CORS allowed
- Anthropic: requires `anthropic-dangerous-direct-browser-access: true` header
- Gemini: API key in URL query param

### Why this matters for Tauri
Direct browser-to-cloud calls expose API keys in network DevTools. In a Tauri build, cloud calls should be proxied through the Rust backend:

```rust
#[tauri::command]
async fn cloud_ai_request(provider: String, payload: String) -> Result<String, String> {
  // Read key from OS keychain, make HTTP call from Rust, never expose key to JS
}
```

This removes the key from JavaScript entirely. The JS provider adapter calls `invoke("cloud_ai_request")` instead of `fetch()`.

**Migration priority:** MEDIUM — browser prototype is acceptable for Alpha/Beta.

---

## 3. API Key Storage — Partially Migrated

**File:** `src/core/security/secure-storage.ts`
**Current:** AES-GCM encrypted localStorage (Alpha 0.5)
**Target:** OS keychain via Tauri invoke

**Migration plan (Alpha 0.6):**

```typescript
// Tauri backend adapter
export const secureStorage = {
  async set(id: string, value: string): Promise<void> {
    await window.__TAURI__.invoke("keychain_set", { id, value });
  },
  async get(id: string): Promise<string | null> {
    return window.__TAURI__.invoke("keychain_get", { id });
  },
  // has, delete remain the same signature
};
```

Rust keychain implementation uses `keyring` crate:
- macOS: Keychain Services
- Windows: Windows Credential Manager
- Linux: Secret Service API (libsecret)

---

## 4. localStorage — All Persistence

**Files:** All files in `src/core/ai/memory/`, `src/core/ai/providers/provider-registry.ts`, `src/core/input-mode.tsx`, `src/core/permissions.ts`
**Status:** localStorage everywhere. Works fine in browser and Tauri WebView.

### What to migrate in Tauri

| Data | Current | Tauri Target |
|------|---------|--------------|
| Conversation memory (messages, entries) | localStorage | SQLite via `tauri-plugin-sql` |
| Provider preferences (enabled, preferred) | localStorage | SQLite or app config file |
| API keys | Encrypted localStorage | OS Keychain |
| Permission state | localStorage | App config file (persisted across updates) |
| Input mode preferences | localStorage | App config file |

**Migration priority:** LOW for Alpha, MEDIUM for Beta. localStorage works in Tauri WebView — migration is an optimization, not a blocker.

---

## 5. Ollama — Local Process Management

**File:** `src/core/ai/providers/ollama-provider.ts`
**Current:** HTTP calls to `localhost:11434` — assumes Ollama is already running.
**Target:** Tauri manages the Ollama process lifecycle.

### Migration plan

```rust
// src-tauri/src/ollama.rs
pub async fn start_ollama() -> Result<(), Error> {
  Command::new("ollama").arg("serve").spawn()?;
  // Poll /api/version until ready
}

pub async fn stop_ollama() -> Result<(), Error> {
  // Signal the process
}
```

```typescript
// Called from ZaraRuntime.initialize() in Tauri mode
await window.__TAURI__.invoke("start_ollama");
```

On the Linux ISO, Ollama runs as a systemd service — no process management needed from Tauri.

---

## 6. Gesture Engine — Camera Access

**File:** `src/lib/gesture-engine.ts`
**Current:** Placeholder with simulation. MediaPipe Hands not yet wired.
**Status:** No real camera access yet — no migration needed until MediaPipe is wired.

### Future Tauri integration
When MediaPipe is added, the camera bridge needs native permission handling:

```rust
#[tauri::command]
async fn request_camera_permission() -> Result<bool, String> {
  // Use tauri-plugin-permissions or platform API
}
```

---

## 7. Web Speech API — Already Flagged for Replacement

See Section 1 (Voice Engine). The Whisper.cpp path is the Tauri replacement.

---

## 8. File System Access

**Files:** `src/pages/files.tsx`
**Current:** Placeholder — no real file access.
**Target:** `tauri-plugin-fs` for sandboxed file access.

```typescript
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
// ZaraOS files permission gates this via permissionsManager.isGranted("files")
```

---

## 9. System Command Execution

**Current:** `zaraRuntime.systemDispatch()` is a stub.
**Target:** Tauri `Command` API for safe subprocess execution.

```rust
#[tauri::command]
async fn system_exec(command: String, args: Vec<String>) -> Result<String, String> {
  // Sandbox: allowlist of approved commands only
  // Requires system_actions permission
}
```

---

## 10. Native System Notifications

**Current:** Not implemented.
**Target:** `tauri-plugin-notification` for OS-level notifications.

---

## 11. Auto-Update

**Current:** Not applicable (browser).
**Target:** `tauri-plugin-updater` with a signed update manifest served from the ZaraOS release server.

---

## Summary: Browser-Only APIs

| API | File | Tauri Replacement | Priority |
|-----|------|-------------------|----------|
| `SpeechRecognition` (voice) | voice-engine.ts | Whisper.cpp sidecar | HIGH |
| `fetch()` to cloud APIs | *-provider.ts | Rust proxy via invoke() | MEDIUM |
| `window.crypto.subtle` (key encryption) | secure-storage.ts | OS Keychain | MEDIUM |
| `localStorage` (all persistence) | many | SQLite + app config | LOW |
| `getUserMedia()` (camera) | gesture-engine.ts | tauri-plugin-camera | LOW (not wired) |
| `Notification` API | not yet used | tauri-plugin-notification | LOW |

---

## Summary: Features Needing Native Permissions

| Feature | Permission | Tauri Mechanism |
|---------|-----------|-----------------|
| Voice input | Microphone | `tauri-plugin-permissions` |
| Gesture input | Camera | `tauri-plugin-permissions` |
| File access | Files | `tauri-plugin-fs` (allowlisted paths) |
| System actions | System | `Command` with allowlist |
| OS notifications | — | `tauri-plugin-notification` |
| Keychain | — | `keyring` crate |

---

## What Is Already Tauri-Ready

- **Command routing layer** — `ZaraRuntime.executeCommand()` has no browser APIs. Wire `invoke()` for the system dispatch path only.
- **AI Runtime layer** — `aiRuntime`, `ProviderRouter`, `ModelRouter` are pure TypeScript with `fetch()`. Replacing `fetch()` in individual providers is localized to each provider file.
- **Permission system** — `PermissionsManager` is pure TypeScript + localStorage. No browser APIs.
- **Skills layer** — `SkillRuntime` has no browser APIs.
- **UI / React layer** — All components use standard React + Tailwind. Fully compatible with Tauri WebView.
- **Conversation memory** — Pure TypeScript + localStorage. Runs unchanged in Tauri.
- **Vite build system** — Outputs a standard HTML/CSS/JS bundle. Tauri wraps this bundle — no build changes needed.

---

## Recommended Tauri Migration Sequence

1. `tauri init` in project root — scaffold Rust backend alongside existing Vite app
2. Wire `window.__TAURI__` feature detection into `VoiceEngine` — add Whisper.cpp path
3. Add `keychain_set/get/has/delete` Tauri commands — update `SecureStorage` adapter
4. Add `start_ollama/stop_ollama` Tauri commands — integrate into `ZaraRuntime.initialize()`
5. Wire `cloud_ai_request` proxy commands — remove direct browser fetch for cloud providers
6. Add `tauri-plugin-fs` and wire into Files page behind the `files` permission gate
7. Replace localStorage persistence with SQLite via `tauri-plugin-sql` for conversation memory
