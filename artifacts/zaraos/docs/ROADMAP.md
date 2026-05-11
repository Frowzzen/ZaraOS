# ZaraOS Roadmap

## Alpha 0.1 — Current (Prototype UI + Architecture Foundation)

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

## Alpha 0.2 — Real Voice Input

- [ ] Web Speech API integration in VoiceEngine (browser-native, no install)
- [ ] Real-time voice command detection feeding into Zara Runtime
- [ ] Visual waveform animation during listening
- [ ] Whisper.cpp WASM build for fully offline STT (no cloud)
- [ ] Wake word detection placeholder ("Hey Zara")
- [ ] Voice command history in Console

---

## Alpha 0.3 — Real Local AI

- [ ] Ollama connection (localhost:11434) for real LLM inference
- [ ] Provider health check — detect if Ollama is running
- [ ] Model listing from Ollama API
- [ ] Streaming response display in Assistant panel
- [ ] llama.cpp REST server integration as alternative
- [ ] Context window management (conversation history trimming)
- [ ] Intent-aware system prompt per command type

---

## Alpha 0.4 — Gesture Input

- [ ] MediaPipe Hands WASM integration
- [ ] Gesture recognition: OPEN_PALM, SWIPE_LEFT, SWIPE_RIGHT, PINCH, FIST
- [ ] Gesture → Runtime routing (same path as voice)
- [ ] Gesture overlay UI (live hand skeleton visualization)
- [ ] Camera permission real browser API integration
- [ ] Panel navigation by gesture (swipe left/right)

---

## Beta 0.1 — Tauri Desktop App

- [ ] Tauri shell wrapping the React frontend
- [ ] Native system tray integration
- [ ] Tauri File System plugin for real file browsing
- [ ] Tauri Shell plugin for allowlisted command execution
- [ ] Tauri secure keychain for API key storage (replaces localStorage)
- [ ] Auto-launch on boot (optional)
- [ ] Linux .deb / .rpm packaging

---

## Beta 0.2 — Plugin Ecosystem

- [ ] Plugin manifest validation (JSON Schema)
- [ ] Plugin sandbox (Tauri WebView isolation)
- [ ] Plugin manifest signature verification
- [ ] Zara Store (mock) — browseable plugin catalog
- [ ] First-party plugins: Gesture Music Player, File Summarizer, Creator Workflow

---

## Beta 0.3 — Cloud AI + Security Hardening

- [ ] Real OpenAI integration (user-provided API key)
- [ ] Real Anthropic integration (user-provided API key)
- [ ] Real Gemini integration (user-provided API key)
- [ ] Web Crypto API key encryption in storage
- [ ] Network permission gating via Tauri allowlist
- [ ] Privacy audit log (all hardware and network events timestamped)

---

## v1.0 — Linux ISO + USB Bootable OS

- [ ] Cubic-based custom Ubuntu/Debian ISO
- [ ] ZaraOS auto-launched as the primary desktop environment
- [ ] Plymouth boot animation (ZaraOS branded)
- [ ] Auto-login as zaraos user
- [ ] USB persistence layer for settings and AI models
- [ ] x86_64 compatibility tested (Intel + AMD)
- [ ] ARM64 build (Raspberry Pi 5, Apple Silicon via separate path)
