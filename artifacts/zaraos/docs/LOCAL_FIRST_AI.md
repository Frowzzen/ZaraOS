# ZaraOS — Local-First AI Philosophy

## Why Local AI Is The Default

ZaraOS is built on the principle that AI inference should happen on the user's device, not in a cloud data center. This is not just a product decision — it is the foundation of our privacy model.

When AI runs locally:
- No query leaves the device
- No company sees your data
- No subscription is required
- The AI works offline
- Latency is lower (no network round-trip)
- You own your model weights

Cloud AI is available as an opt-in feature when the user needs it and is willing to provide their own API key. ZaraOS does not proxy, resell, or pay for AI inference.

---

## Local AI Stack

### Tier 1 — Built-in (always available)

**Zara Core v0.1** — A lightweight rule-based + retrieval system that handles structured commands (open app, show files, system status) without a neural model. This is always available, zero latency, zero RAM overhead.

### Tier 2 — Local Neural (user-installed)

**Ollama** — The easiest way to run open-weight models locally. ZaraOS connects to `http://localhost:11434` — the user installs and manages models themselves.

Recommended models for modest hardware:
- `llama3:8b-q4` — 4.5 GB RAM, good balance
- `mistral:7b-q4` — 4 GB RAM, fast
- `phi3:mini` — 2.3 GB RAM, fast on light hardware
- `gemma2:2b` — 1.6 GB RAM, ultra-light

**llama.cpp** — For users who want more control over quantization and GGUF model files. ZaraOS can connect to a llama.cpp server on any local port.

### Tier 3 — Cloud (opt-in, user API key required)

Only available when the user has:
1. Enabled cloud AI in the Privacy Panel
2. Granted the `cloud_ai` permission
3. Entered their own API key in the AI Provider Manager

Supported providers: OpenAI, Anthropic, Google Gemini, Grok, DeepSeek.

ZaraOS never stores cloud provider keys in a backend. Keys live in the user's own localStorage (Alpha 0.1) or device keychain (future Tauri builds).

---

## AI Provider Selection Logic

```
User sends message
       │
       ▼
Is local_ai permission granted?
  YES → Try local provider (Ollama → llama.cpp → Zara Core)
  NO  → Return "local AI disabled" response
       │
       ▼ (if local fails)
Is cloud_ai permission granted AND key configured?
  YES → Try configured cloud provider
  NO  → Return "local AI unavailable, enable cloud AI to continue"
```

---

## Privacy Boundaries By Provider

| Provider       | Data Leaves Device? | Requires API Key? | Default? |
|----------------|--------------------|--------------------|----------|
| Zara Core      | No                 | No                 | Yes      |
| Ollama         | No                 | No                 | No       |
| llama.cpp      | No                 | No                 | No       |
| OpenAI         | Yes (to OpenAI)    | Yes (user's own)   | No       |
| Anthropic      | Yes (to Anthropic) | Yes (user's own)   | No       |
| Google Gemini  | Yes (to Google)    | Yes (user's own)   | No       |
| Grok           | Yes (to xAI)       | Yes (user's own)   | No       |
| DeepSeek       | Yes (to DeepSeek)  | Yes (user's own)   | No       |

---

## Recommended Hardware

ZaraOS is designed to run on modest hardware. Local AI performance depends on RAM and CPU/GPU.

| RAM     | Recommended Local Model          |
|---------|----------------------------------|
| 4 GB    | phi3:mini, gemma2:2b             |
| 8 GB    | mistral:7b-q4, llama3:8b-q4     |
| 16 GB   | llama3:8b, mistral:7b full       |
| 32 GB+  | llama3:70b-q4, mixtral:8x7b-q4  |

GPU acceleration (NVIDIA CUDA, AMD ROCm, Apple Metal) is handled by Ollama and llama.cpp automatically when available.

---

## Roadmap

- **Alpha 0.3** — Real Ollama connection (streaming responses)
- **Alpha 0.4** — llama.cpp REST server integration
- **Beta 0.1** — Whisper.cpp for fully local voice-to-text
- **Beta 0.3** — Secure encrypted key storage for cloud providers
- **v1.0** — Pre-loaded lightweight model on USB boot image
