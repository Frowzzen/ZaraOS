# ZaraOS Local AI Roadmap

## Philosophy

ZaraOS is built on the belief that intelligent computing should not require a subscription, a cloud account, or an internet connection. The AI layer evolves from simulated intelligence toward fully on-device inference, with cloud as an opt-in accessory — never a requirement.

---

## Phase 1 — Mock Runtime (Alpha 0.3, Current)

**Status: Complete**

What exists:
- Full AI Runtime architecture (`src/core/ai/ai-runtime.ts`)
- Provider adapter system (6 providers declared)
- Local provider returns context-aware simulated responses
- Zara personality system prompt
- Conversation memory (localStorage)
- Context injection (system state, privacy state, skills)
- AI routing layer (local-first by default)
- Tool calling architecture (declared, not executed)
- Streaming simulation (character-by-character)

What is mocked:
- All AI responses (intelligent templates, not real inference)
- Ollama/llama.cpp reachability (tries, falls back gracefully)
- Tool execution (returns mocked results)

---

## Phase 2 — Ollama Integration (Alpha 0.4)

**Target: Alpha 0.4**

Goal: Real local inference via Ollama on developer machines.

Steps:
1. User installs Ollama (`curl -fsSL https://ollama.com/install.sh | sh`)
2. User pulls a model (`ollama pull llama3`)
3. User enables Ollama in ZaraOS AI Provider settings
4. `OllamaProvider.healthCheck()` detects the running server
5. `providerRouter` automatically routes to Ollama
6. Real streamed responses replace simulated ones

Required changes (already architected, just needs enabling):
- `OllamaProvider` is already written — just set `isEnabled: true`
- `ProviderRouter` already tries Ollama before falling back to local
- Streaming is already wired through the AI Runtime

Recommended starter models:
| Model | Size | Use case |
|---|---|---|
| llama3 | 4.7 GB | General assistant |
| phi3 | 2.2 GB | Lightweight commands |
| mistral | 4.1 GB | Balanced quality |
| gemma2 | 5.5 GB | Strong reasoning |
| deepseek-coder | 4.2 GB | Code generation |

---

## Phase 3 — Whisper.cpp Voice (Alpha 0.4 / 0.5)

**Target: Alpha 0.4+**

Goal: Real voice input via Whisper.cpp running locally.

Architecture:
- Capture audio via `getUserMedia()` (already permission-gated)
- Pass raw PCM to a Whisper.cpp WASM binary or Tauri subprocess
- Receive text transcript, feed into `zaraRuntime.executeCommand()`
- Voice activity detection to auto-start/stop recording

Integration point: `src/lib/voice-engine.ts` — the `startListening()` method already has the integration comment.

Options:
- **Browser (WASM):** `whisper.wasm` — no install needed, runs in-browser
- **Tauri (native):** `tauri-plugin-whisper` or subprocess via `std::process::Command`
- **Ollama future:** Ollama may add Whisper support for audio models

---

## Phase 4 — MediaPipe Gestures (Alpha 0.5)

**Target: Alpha 0.5**

Goal: Real gesture recognition via MediaPipe Hands.

Architecture:
- Request camera permission via `getUserMedia({ video: true })`
- Feed video frames to `@mediapipe/hands` WASM module
- Classify landmarks into `GestureType` enum values
- Dispatch via `gestureEngine.dispatchGesture(type)` → `zaraRuntime.executeCommand()`

Integration point: `src/lib/gesture-engine.ts` — the `startTracking()` method has the integration comment.

Performance target: < 30ms per frame on mid-range laptop CPU.

---

## Phase 5 — GPU Acceleration (Beta 0.6)

**Target: Beta**

Goal: Real GPU-accelerated inference for faster responses.

Strategies:
- **Ollama with GPU:** `ollama serve` automatically uses NVIDIA/AMD/Apple GPU if available
- **llama.cpp with Metal/CUDA:** Compile with `-DLLAMA_METAL=ON` (macOS) or `-DLLAMA_CUBLAS=ON` (NVIDIA Linux)
- **WebGPU (browser):** WebLLM uses WebGPU for GPU-accelerated in-browser inference — no install needed

Performance targets with GPU:
| Model | CPU (tokens/s) | GPU (tokens/s) |
|---|---|---|
| llama3-8b-q4 | ~10 | ~50+ |
| phi3-mini-q4 | ~25 | ~120+ |
| mistral-7b-q4 | ~12 | ~55+ |

---

## Phase 6 — On-Device Multimodal AI (Beta 0.7)

**Target: Beta**

Goal: Extend Zara to understand images, documents, and eventually audio.

Vision:
- `llava` model via Ollama for image understanding
- Screenshot analysis: "what's on my screen?"
- Document OCR + AI: "summarize this PDF page"

Audio:
- Real Whisper.cpp integration (from Phase 3) enabling real-time voice
- Future: voice response via local TTS (Coqui TTS or Piper)

Zara's conversation flow:
```
User speaks → Whisper.cpp → text → Zara Runtime → AI inference → response text → Piper TTS → audio output
```

---

## Phase 7 — Agent Workflows (v1.0)

**Target: v1.0**

Goal: Multi-step autonomous task execution with user approval checkpoints.

Architecture:
- Planner LLM: breaks a high-level goal into a task graph
- Executor: executes each node via the Tool Registry
- Human-in-the-loop: pauses at any node marked `requiresConfirmation`
- Memory: agent progress is checkpointed to conversation memory

Example workflow:
```
User: "Prepare my weekly report from my documents folder"
Zara:
  1. [confirm] Read documents folder?  → user: yes
  2. Scan folder, list relevant files
  3. [confirm] Summarize these 3 files?  → user: yes
  4. Generate summary using local AI
  5. [confirm] Save report to Documents/weekly-report.md?  → user: yes
  6. Write file, confirm completion
```

Each step is auditable. No step executes without passing through the permission and confirmation gates.
