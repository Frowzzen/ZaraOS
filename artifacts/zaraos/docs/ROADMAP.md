# ZaraOS Roadmap

## Alpha 0.1 — Complete (Prototype UI + Architecture Foundation)

- [x] Full ZaraOS UI shell (dark OS-style, sidebar, 10 panels)
- [x] Zara Assistant with mocked AI responses and typing animation
- [x] Zara Console (natural language command input, structured routing)
- [x] App Launcher, Files, Media, Settings, Privacy, AI Providers, Developer Portal
- [x] Layered runtime architecture (UI → Runtime → AI/Input/System/Plugin/Security)
- [x] Central Zara Runtime with permission gating
- [x] Structured command parsing with intent classification
- [x] Permissions system (deny-by-default, localStorage persistence)
- [x] Privacy store (mic/camera/AI/network state)
- [x] AI Engine abstraction (8 providers, all mocked)
- [x] Voice Engine placeholder (Whisper/Web Speech API integration points)
- [x] Gesture Engine placeholder (MediaPipe integration points)
- [x] Plugin manifest spec (PluginManifest type, mock registry)

---

## Alpha 0.2 — Complete (Real Voice Input)

- [x] Web Speech API integration in VoiceEngine (browser-native, no install)
- [x] Real-time voice command detection feeding into Zara Runtime
- [x] Visual waveform animation during listening
- [x] Voice error messages (permission denied, not supported, browser compat)
- [x] Voice unsupported notice (Firefox / non-WebSpeech browsers)
- [ ] Whisper.cpp WASM build for fully offline STT — Beta milestone
- [ ] Wake word detection ("Hey Zara") — Beta milestone

---

## Alpha 0.3 — Complete (Real AI Inference)

- [x] Full provider router with local-first fallback chain (Ollama → llama.cpp → local → cloud)
- [x] Ollama connection (localhost:11434) with real HTTP fetch, CORS detection
- [x] Provider health check with 60-second result cache
- [x] Streaming response display in Assistant via SSE/fetch streaming
- [x] llama.cpp REST server integration as alternative local provider
- [x] OpenAI / Anthropic / Gemini / Grok / DeepSeek cloud adapters (user-supplied keys)
- [x] AES-GCM encrypted API key storage in localStorage
- [x] Intent-aware system prompt injection per command type
- [x] Context window management (conversation history in AIMemory)
- [x] "Connect AI" quick-connect banner in Assistant when in simulated mode
- [x] Ollama CORS vs unreachable detection with actionable error messages

---

## Alpha 0.4 — Complete (Gesture Input)

- [x] MediaPipe Tasks Vision WASM integration (`@mediapipe/tasks-vision`)
- [x] HandLandmarker — 21-landmark per-frame detection at 30 fps
- [x] Gesture classifier: OPEN_PALM, SWIPE_LEFT, SWIPE_RIGHT, SWIPE_UP, SWIPE_DOWN, PINCH, FIST, TWO_FINGERS_UP, SWIPE_ACROSS, GRAB
- [x] Swipe detection via wrist velocity history (8-frame window, normalized threshold)
- [x] Gesture → Runtime routing (same pipeline as voice and keyboard)
- [x] GestureOverlay component (live camera feed + hand skeleton canvas, bottom-right corner)
- [x] Camera permission via real `getUserMedia()` API
- [x] WASM lazy-load from CDN (no bundle size impact)
- [x] Panel navigation by gesture (SWIPE_LEFT / SWIPE_RIGHT mapped to prev/next panel)

---

## Alpha 0.5 — Complete (Memory Panel + Skills + Developer Portal)

- [x] Memory Panel — full visibility and control over Zara's local memory
- [x] AIMemory store (pinned entries, session history, skill usage, export/import)
- [x] Skills Hub with registered skill registry and permission checking
- [x] Developer Portal with full plugin registry and manifest spec
- [x] 10 panels total, all wired to the same Runtime pipeline

---

## Beta 0.1 — Tauri Desktop Shell (In Progress)

- [x] Tauri project scaffold (`src-tauri/` Cargo workspace)
- [x] IPC bridge layer (TypeScript `invoke()` wrappers)
- [x] Rust command handlers: `fs_read`, `fs_write`, `shell_exec`, `kv_get`, `kv_set`
- [x] Tauri-backed secure keychain (replaces localStorage API key storage)
- [x] Tauri File System plugin for real file browsing
- [ ] Build locally: `cargo tauri build` (requires Rust + native toolchain)
- [ ] Native system tray integration
- [ ] Auto-launch on boot (optional)
- [ ] Linux `.deb` / `.rpm` / `.AppImage` packaging

> **Note:** The Tauri IPC layer is scaffolded and tested in-browser via
> the `isTauriRuntime()` guard. The native binary requires a local Rust
> toolchain — see `docs/TAURI_ROADMAP.md` for full build instructions.

---

## Beta 0.2 — Plugin Ecosystem

- [ ] Plugin manifest validation (JSON Schema)
- [ ] Plugin sandbox (Tauri WebView isolation)
- [ ] Plugin manifest signature verification
- [ ] Zara Store (mock) — browseable plugin catalog
- [ ] First-party plugins: Gesture Music Player, File Summarizer, Creator Workflow

---

## Beta 0.3 — Cloud AI + Security Hardening

- [ ] Network permission gating via Tauri allowlist
- [ ] Privacy audit log (all hardware and network events timestamped)
- [ ] Whisper.cpp WASM for fully offline STT (replaces Web Speech API)
- [ ] Wake word detection ("Hey Zara") — always-listening mode

---

## v1.0 — Linux ISO + USB Bootable OS

- [ ] Cubic-based custom Ubuntu/Debian ISO
- [ ] ZaraOS auto-launched as the primary desktop environment
- [ ] Plymouth boot animation (ZaraOS branded)
- [ ] Auto-login as zaraos user
- [ ] USB persistence layer for settings and AI models
- [ ] x86_64 compatibility tested (Intel + AMD)
- [ ] ARM64 build (Raspberry Pi 5, Apple Silicon via separate path)
