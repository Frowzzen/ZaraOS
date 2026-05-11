// ============================================================
// ZaraOS Local Provider
//
// The default AI provider. Runs entirely in-browser with
// zero external dependencies. Simulates intelligent local
// inference using context-aware response templates.
//
// This is the ONLY provider enabled by default.
// All other providers start disabled.
//
// FUTURE (Alpha 0.4+):
//   Replace the simulated inference in sendMessage() with a
//   real WebAssembly LLM runtime (e.g. WebLLM, Wllama, or a
//   Tauri-bridged llama.cpp binary). The adapter interface
//   stays identical — only this file changes.
//
// FUTURE (Linux/Tauri):
//   When running as a Tauri app on Linux, this provider can
//   be replaced with a Tauri invoke() call to a Rust-managed
//   llama.cpp subprocess. See docs/TAURI_ROADMAP.md.
// ============================================================

import type {
  AIProviderAdapter,
  AIMessage,
  AISendOptions,
  AIStreamCallback,
  AIProviderStatus,
} from "./provider-adapter";
import type { AICapabilities } from "../models/ai-capabilities";
import { LOCAL_SIMULATED_CAPABILITIES } from "../models/ai-capabilities";
import { getSimulatedResponse } from "../prompts/zara-system-prompt";

const SIMULATED_LATENCY_MIN_MS = 600;
const SIMULATED_LATENCY_MAX_MS = 1400;
const STREAM_CHUNK_DELAY_MS = 28; // ms per character chunk for streaming sim

function randomLatency(): number {
  return (
    SIMULATED_LATENCY_MIN_MS +
    Math.random() * (SIMULATED_LATENCY_MAX_MS - SIMULATED_LATENCY_MIN_MS)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Extract intent hint from the last user message for better mocked responses.
function extractIntentHint(messages: AIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "ai_question";
  const text = last.content.toLowerCase();
  if (text.includes("status") || text.includes("system") || text.includes("health")) return "system_status";
  if (text.includes("file") || text.includes("folder") || text.includes("document")) return "file_action";
  if (text.includes("navigate") || text.includes("open") || text.includes("go to")) return "navigation_action";
  if (text.includes("privacy") || text.includes("permission") || text.includes("mic") || text.includes("camera")) return "privacy_action";
  if (text.includes("skill") || text.includes("timer") || text.includes("alarm") || text.includes("email") || text.includes("call")) return "skill_action";
  return "ai_question";
}

export class LocalProvider implements AIProviderAdapter {
  readonly id = "local";
  readonly name = "Zara Local (Simulated)";
  readonly isLocal = true;
  readonly isCloud = false;
  readonly isEnabled = true;

  private activeModel = "zara-core-v0.1";
  private status: AIProviderStatus = {
    available: true,
    healthy: true,
    latencyMs: 0,
    activeModel: "zara-core-v0.1",
    reason: "Simulated local runtime active",
    lastCheckedAt: Date.now(),
  };

  async initialize(): Promise<void> {
    // Simulated init — no real model to load.
    // FUTURE: Load WASM LLM runtime here.
    this.status = {
      available: true,
      healthy: true,
      activeModel: this.activeModel,
      reason: "Local AI runtime ready (simulated)",
      lastCheckedAt: Date.now(),
    };
  }

  async sendMessage(
    messages: AIMessage[],
    options?: AISendOptions
  ): Promise<string> {
    // Simulate inference latency. Capture once so reported latency matches actual delay.
    const latencyMs = randomLatency();
    await sleep(latencyMs);

    const intent = extractIntentHint(messages);
    const response = getSimulatedResponse(intent, messages[messages.length - 1]?.content);

    // Update latency stat.
    this.status.latencyMs = Math.round(latencyMs);
    this.status.lastCheckedAt = Date.now();

    return response;
  }

  async streamMessage(
    messages: AIMessage[],
    onChunk: AIStreamCallback,
    _options?: AISendOptions
  ): Promise<void> {
    // Simulate inference startup latency.
    await sleep(400 + Math.random() * 200);

    const intent = extractIntentHint(messages);
    const fullResponse = getSimulatedResponse(intent, messages[messages.length - 1]?.content);

    // Stream character by character in small chunks for realism.
    const chunkSize = 3;
    for (let i = 0; i < fullResponse.length; i += chunkSize) {
      await sleep(STREAM_CHUNK_DELAY_MS);
      const delta = fullResponse.slice(i, i + chunkSize);
      const done = i + chunkSize >= fullResponse.length;
      onChunk({ delta, done });
      if (done) break;
    }
  }

  async listModels(): Promise<string[]> {
    // FUTURE: When WebLLM or Tauri llama.cpp is wired in,
    // this will return the list of locally downloaded model files.
    return [
      "zara-core-v0.1",      // Current simulated runtime
      "llama3-8b-q4",        // Future: Ollama pull target
      "mistral-7b-q4",       // Future: Ollama pull target
      "phi3-mini-q4",        // Future: Lightweight on-device option
    ];
  }

  getActiveModel(): string {
    return this.activeModel;
  }

  setModel(modelId: string): void {
    this.activeModel = modelId;
    this.status.activeModel = modelId;
  }

  async healthCheck(): Promise<AIProviderStatus> {
    this.status.lastCheckedAt = Date.now();
    return { ...this.status };
  }

  supportsStreaming(): boolean { return true; }
  supportsVision(): boolean { return false; }
  supportsTools(): boolean { return false; }
  supportsOffline(): boolean { return true; }

  getCapabilities(): AICapabilities {
    return { ...LOCAL_SIMULATED_CAPABILITIES };
  }
}

export const localProvider = new LocalProvider();
