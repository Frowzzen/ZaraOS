# ZaraOS Changelog

All notable changes to ZaraOS are recorded here.
Every feature, fix, and architectural decision gets an entry.

Format per release:
- **Added** — new features and capabilities
- **Changed** — modifications to existing features
- **Fixed** — bug fixes
- **Architecture** — structural decisions that affect how things are built

---

## [Alpha 0.4] — 2025-05-11

### Added
- **VoiceWaveform component** `src/components/voice-waveform.tsx` — 7 framer-motion bars with staggered amplitudes and durations that animate when voice is active and collapse when idle. Props: `active`, `color` (amber/cyan/purple), `size` (xs/sm/md).
- **Intent-aware system prompts** `src/core/ai/prompts/zara-system-prompt.ts` — `ZARA_INTENT_ADDENDUMS` map with 14 per-intent behavioral sections (ai_question, search, open_app, close_app, navigation_action, scroll_action, file_action, media_action, system_status, privacy_action, settings_action, developer_action, skill_action, unknown). Each addendum replaces the generic `ZARA_COMMAND_PARSING` block when a concrete intent is known.
- **Health check caching** `src/core/ai/routing/provider-router.ts` — `cachedHealthCheck()` with 60s TTL for available providers, 20s for unavailable. Eliminates 2-3 second network timeout penalty on every AI message dispatch when Ollama/llama.cpp are not running.
- **Real OpenAI inference** `src/core/ai/providers/openai-provider.ts` — SSE streaming to `api.openai.com/v1/chat/completions`. Health check via `GET /v1/models`. Default model: `gpt-4o-mini`.
- **Real Anthropic inference** `src/core/ai/providers/anthropic-provider.ts` — SSE streaming with `anthropic-dangerous-direct-browser-access: true` header (official Anthropic browser opt-in). System prompt as top-level `system` field. Health check via `GET /v1/models`. Default model: `claude-3-5-haiku-latest`.
- **Real Google Gemini inference** `src/core/ai/providers/gemini-provider.ts` — SSE via `?alt=sse` query param. API key as URL query param. Role mapping: assistant → `model`. Health check via `GET /v1beta/models`. Default model: `gemini-1.5-flash`.
- **Cache invalidation helpers** `src/core/ai/providers/provider-registry.ts` — `invalidateProviderHealthCache(id?)` exported. Cache evicted on `setProviderApiKey()`, `setProviderEndpoint()`, and explicit UI Test button clicks.
- **`getCachedStatus(id)`** `src/core/ai/routing/provider-router.ts` — peek at cached health status without triggering a live network check; used by the AI Provider UI.

### Changed
- **VoiceWaveform in assistant listening bar** `src/pages/assistant.tsx` — replaced static pulsing amber dot with animated `VoiceWaveform` component.
- **VoiceWaveform in global command box** `src/components/global-command-box.tsx` — replaced pulsing dot in the LISTENING badge with `VoiceWaveform` (xs size).
- **VoiceWaveform in sidebar voice toggle** `src/components/layout.tsx` — replaced static active dot with `VoiceWaveform` (xs, amber) when voice mode is on.
- **`buildSystemPrompt()`** `src/core/ai/prompts/zara-system-prompt.ts` — now accepts optional `intent?: string` parameter and selects the matching `ZARA_INTENT_ADDENDUMS` entry when intent is known.
- **`buildRequestPayload()`** `src/core/ai/ai-runtime.ts` — now passes `intent` to `buildSystemPrompt()`.

### Fixed
- **cloudAIEnabled never set** `src/core/zara-runtime.ts` / `src/core/ai/providers/provider-registry.ts` — `ProviderRouter.cloudAIEnabled` was always `false` at startup, permanently blocking cloud providers even when the `cloud_ai` permission was granted. Fixed by calling `setCloudAIAllowed(permissionsManager.isGranted('cloud_ai'))` in `ZaraRuntime.initialize()`, and wiring `setCloudAIAllowed(true/false)` through `requestPermission()` / `revokePermission()`.

### Architecture
- Health cache lives on `ProviderRouter`, not on individual providers — providers stay stateless.
- Cloud providers are always constructed at startup but only routed to when `cloudAIEnabled=true` AND the provider is enabled AND it has an API key AND it passes a health check.
- Anthropic does not accept `system` role in the messages array — system prompt is sent as a top-level `system` field in every request body.

---

## [Alpha 0.3] — 2025-05-08

### Added
- **Full AI layer architecture** `src/core/ai/` — replaced single `ai-engine.ts` with a layered system: `AIRuntime` → `RequestRouter` → `ProviderRouter` → Provider.
- **AIRuntime singleton** `src/core/ai/ai-runtime.ts` — central orchestrator for all AI operations. Manages system prompt building, context injection, conversation history, streaming, memory write-back, and status broadcasting. UI never calls this directly — always through `zaraRuntime`.
- **RequestRouter** `src/core/ai/routing/request-router.ts` — selects provider (via `ProviderRouter`), selects model (via `ModelRouter`), builds options, and dispatches to the chosen provider. Handles both streaming and non-streaming modes.
- **ProviderRouter** `src/core/ai/routing/provider-router.ts` — implements `local_first` routing strategy. Priority: Ollama → llama.cpp → local simulated → cloud (if enabled). Supports `explicit` strategy for user-pinned providers.
- **ModelRouter** `src/core/ai/routing/model-router.ts` — classifies request type (conversational/analytical/code/creative/factual) and selects the best available model per provider.
- **ProviderRegistry** `src/core/ai/providers/provider-registry.ts` — creates and registers all provider instances at startup. Persists enabled state, preferred provider, API keys, and endpoints to localStorage. Auto-initializes on module load (window guard).
- **AIProviderAdapter interface** `src/core/ai/providers/provider-adapter.ts` — common contract for all providers: `sendMessage`, `streamMessage`, `healthCheck`, `listModels`, `supportsStreaming`, `supportsVision`, `supportsTools`, `supportsOffline`, `getCapabilities`.
- **LocalProvider** `src/core/ai/providers/local-provider.ts` — always-available simulated provider. Uses `getSimulatedResponse()` for intent-aware fallback responses. Never fails.
- **OllamaProvider** `src/core/ai/providers/ollama-provider.ts` — real HTTP calls to `localhost:11434/api/chat`. NDJSON streaming. Health check via `/api/version`. Graceful fallback to simulated mode if Ollama is not running.
- **LlamaCppProvider** `src/core/ai/providers/llamacpp-provider.ts` — OpenAI-compatible REST API at `localhost:8080`. SSE streaming. Health check via `/v1/models`.
- **Conversation memory system** `src/core/ai/memory/` — `ConversationMemory` class managing sessions, messages, memory entries, skill usage records, user preferences. Context pruning at ~3000 tokens. Sessions resume if last activity < 30 minutes.
- **Context injection system** `src/core/ai/context/` — `buildContextBlock()` assembles a live OS state string (provider, model, permissions, active panel, input mode, memory stats, skills list) injected into every system prompt.
- **Zara personality system** `src/core/ai/prompts/zara-system-prompt.ts` — structured system prompt builder with named sections: BASE, PRIVACY_PRINCIPLES, LOCAL_FIRST, CONFIRMATION_RULES, SKILL_PHILOSOPHY, SAFETY_RULES, COMMAND_PARSING. Plus simulated response pool per intent.
- **Skills layer** `src/core/skills/` — `SkillRuntime` with `executeSkill()`, permission checking, confirmation gating, usage tracking. `ZaraSkill` interface defines the skill contract.
- **Skills page** `src/pages/skills.tsx` — Skill Hub listing all registered skills with permission status, usage stats, enable/disable controls.
- **AI Runtime Status component** `src/components/ai-runtime-status.tsx` — live provider name, model, simulated/cloud badge, latency, conversation turn count.
- **Streaming in assistant** `src/pages/assistant.tsx` — real token streaming via `zaraRuntime.streamAssistantMessage()`. Cursor blink during stream. Source badge (voice/gesture/keyboard) on each message.
- **Route-based code splitting** `src/App.tsx` — all 11 page components wrapped in `React.lazy()` + `Suspense`. Loading skeleton during chunk fetch.

### Changed
- **ZaraRuntime AI methods** `src/core/zara-runtime.ts` — all AI calls now route through `aiRuntime` instead of legacy `aiEngine`. `selectAIProvider`, `enableAIProvider`, `setProviderApiKey`, `checkProviderHealth` delegate to `provider-registry`.
- **AI Providers page** `src/pages/ai-providers.tsx` — fully rewritten to use live `getProviderSummaries()`, real health check via `checkAIProviderHealth()`, API key entry, endpoint config, Test button, preferred provider pin.

### Architecture
- UI → `zaraRuntime` → `aiRuntime` → `requestRouter` → `providerRouter` → provider. No layer skips.
- All AI providers implement `AIProviderAdapter` — swapping a provider never touches the runtime.
- Context injection is separated from the prompt: `buildSystemPrompt()` defines Zara's personality; `buildContextBlock()` injects live OS state. Both are concatenated before dispatch.

---

## [Alpha 0.2] — 2025-05-05

### Added
- **InputMode system** `src/core/input-mode.tsx` — React context managing `mode` (hybrid/voice/gesture/text), `voiceActive`, `gestureActive`, `isCommandBoxOpen`. All state persisted to localStorage. Ctrl+Space registered globally.
- **Global Command Box** `src/components/global-command-box.tsx` — Spotlight/Alfred-style overlay triggered by Ctrl+Space. Full-width input, command history (Up/Down), 6 suggestion chips, source-aware routing through `zaraRuntime.executeCommand()`. Auto-navigates on `action: "navigate"` result.
- **Input Mode Indicator** `src/components/input-mode-indicator.tsx` — compact sidebar widget showing current mode with inline dropdown switcher. Double-click cycles modes.
- **Gesture Mapper** `src/lib/gesture-mapper.ts` — canonical `GestureType → command string` mapping. `PANEL_ORDER` array for accurate swipe navigation. `GESTURE_MAPPINGS` export for Settings UI.
- **Voice Engine structure** `src/lib/voice-engine.ts` — `VoiceEngine` class with `onResult()` / `onStateChange()` subscription pattern. `simulateVoiceInput()` for dev testing.
- **INPUT_MODE_META registry** `src/core/input-mode.tsx` — per-mode label, icon, Tailwind color/border/bg tokens. Used by any component for mode-appropriate styling without hardcoded colors.

### Changed
- **Gesture Engine** `src/lib/gesture-engine.ts` — upgraded from thin placeholder to integration-ready class. `setCurrentPath()` for panel-aware swipe navigation. 600ms debounce. `onGesture()` callback receives both `GestureType` and resolved command string. `simulateGestureSequence()` for testing.
- **Layout sidebar** `src/components/layout.tsx` — new INPUT HARDWARE section: Voice toggle (amber when active, VoiceWaveform/dot indicator), Gesture toggle (purple when active). `gestureEngine.setCurrentPath()` synced on route changes. Gesture→runtime bridge registered once in layout.
- **Settings page** `src/pages/settings.tsx` — new Input Mode tab (4-card mode selector, hardware toggles, Command Box shortcut card). Gestures tab rewritten with live gesture test buttons wired to `gestureEngine.simulateGesture()`.
- **Command Router** `src/lib/command-router.ts` — expanded intent rules: navigation rules per panel, scroll_action intent, gesture meta-commands (select focused, begin drag), OPEN_PALM → open assistant, question heuristic for ai_question.
- **App root** `src/App.tsx` — `InputModeProvider` added to provider stack between `RuntimeProvider` and `PrivacyProvider`.

### Architecture
- `voiceActive` and `gestureActive` are independent of the mode profile — mic can be off while mode is Hybrid.
- Gesture → command translation happens in `gesture-mapper.ts`, not in the engine. Engine stays hardware-agnostic.
- MediaPipe integration point clearly marked in `gesture-engine.ts` — wiring it in requires no changes outside that file.

---

## [Alpha 0.1] — 2025-05-01

### Added
- **ZaraOS shell** `src/components/layout.tsx` — full desktop OS layout: fixed sidebar with nav items, main panel area, system status section.
- **Dashboard** `src/pages/home.tsx` — live clock, mocked CPU/RAM/Network/Neural stats cards, Privacy Fortress panel (4 permission toggles), System Activity feed.
- **Zara Assistant** `src/pages/assistant.tsx` — AI chat interface with ZaraStatus indicator (idle/listening/thinking/speaking/offline/privacy-lock), input source badges, mic button placeholder, mocked responses.
- **Console** `src/pages/console.tsx` — natural language command console with structured intent routing, command history, source badges.
- **App Launcher** `src/pages/apps.tsx` — grid of built-in app tiles with voice command hints per tile.
- **Files** `src/pages/files.tsx` — placeholder file browser, permission-gated.
- **Media** `src/pages/media.tsx` — combined audio/video player placeholder.
- **Settings** `src/pages/settings.tsx` — system configuration panel with tabs.
- **Privacy Panel** `src/pages/privacy.tsx` — mic/camera/AI/network/files status and enable/disable toggles wired to `PermissionsManager`.
- **AI Provider Manager** `src/pages/ai-providers.tsx` — API key management UI for 8 providers. Keys stored in localStorage only, never sent to ZaraOS servers.
- **Developer Portal** `src/pages/developers.tsx` — plugin registry, `PluginManifest` spec display, 4 example plugins, Zara Store preview.
- **Zara Runtime** `src/core/zara-runtime.ts` — central OS brain. Single entry point for all commands from all input sources. Permission checking, destructive action gates, plugin registry, app routing.
- **Runtime Context** `src/core/runtime-context.tsx` — `useRuntime()` React hook and `RuntimeProvider`. UI components use this exclusively.
- **Permissions Manager** `src/core/permissions.ts` — deny-by-default system. 9 permission categories. localStorage persistence.
- **Command Router** `src/lib/command-router.ts` — `parseAndRoute()` NLP intent classifier. Pattern matching for 30+ command phrases across all intents.
- **Privacy Store** `src/lib/privacy-store.ts` — `usePrivacy()` hook for reading permission state reactively.
- **Error Boundary** `src/components/error-boundary.tsx` — React error boundary wrapper around the full app.
- **Confirmation Dialog** `src/components/confirmation-dialog.tsx` — modal for destructive action confirmation.
- **Core types** `src/core/types.ts` — all shared TypeScript interfaces: `ParsedCommand`, `CommandResult`, `ZaraStatus`, `CommandIntent`, `InputSource`, `InputMode`, `PluginManifest`, `PermissionCategory`, `SystemStatus`, `AIProvider`.
- **ZaraOS theme** `src/index.css` — dark mode only. Electric cyan/teal primary. Violet accents. Monospace system font for terminal elements.
- **Documentation suite** `docs/` — ARCHITECTURE.md, SECURITY.md, ROADMAP.md, PLUGIN_SPEC.md, LOCAL_FIRST_AI.md, TAURI_ROADMAP.md, SECURITY_AUDIT_ALPHA_0_1.md, ZARA_PERSONALITY.md, MEMORY_MODEL.md, SKILLS_ARCHITECTURE.md, AI_RUNTIME_ARCHITECTURE.md, TOOL_CALLING_ARCHITECTURE.md, COMMAND_CONFIRMATION_MODEL.md, LOCAL_AI_ROADMAP.md, CONNECTED_SERVICES_ROADMAP.md, AI_SECURITY_MODEL.md, LINUX_ISO_PREP.md.

### Architecture
- All commands from all input sources (voice, gesture, keyboard, plugin) flow through `ZaraRuntime.executeCommand()`. No exceptions.
- UI calls `useRuntime()` only — never calls AI engines, voice engine, or gesture engine directly.
- Deny-by-default permissions enforced at the runtime level before any action executes.
- Frontend-only for Alpha 0.1 — all state in localStorage. Designed so a real backend can be wired in without restructuring.
- `PluginManifest` type defines the contract for all third-party plugins: id, name, version, developer, permissions, voiceCommands, gestureCommands, aiCapabilities, sandboxRequired.

---

## Roadmap (Planned)

### Alpha 0.5 (Next)
- Streaming responses in Console panel
- Skill execution with real AI context passing
- Memory panel UI (pinned entries, usage stats, purge controls)
- Ollama model selector (live model list, download progress)

### Alpha 0.6
- Tauri desktop app packaging (Windows / macOS / Linux)
- Whisper.cpp offline voice via Tauri subprocess (replaces Web Speech API)
- Encrypted API key storage (Web Crypto AES-GCM in IndexedDB)

### Beta 0.7
- Real file browser with files permission gate
- Media player with actual playback
- Backend wired in (Express routes + PostgreSQL)

### v1.0
- Bootable Linux ISO (Archiso / Debian live-build)
- Ollama pre-installed as systemd service
- Zara as the desktop shell
