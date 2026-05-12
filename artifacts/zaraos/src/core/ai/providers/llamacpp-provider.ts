// ============================================================
// ZaraOS llama.cpp Provider
//
// Integration point for llama.cpp — a pure C++ LLM runtime
// that can run quantized models (GGUF format) directly on CPU
// or GPU with no Python, no CUDA, and no cloud.
//
// CURRENT STATE (Alpha 0.3):
//   Placeholder adapter. Returns simulated responses.
//   llama.cpp is not assumed to be installed.
//
// HOW TO ENABLE:
//   Option A — llama.cpp server mode:
//     ./llama-server -m model.gguf --port 8080 --host 127.0.0.1
//     Set endpoint to http://localhost:8080 in AI settings.
//
//   Option B — Tauri bridge (preferred for ZaraOS):
//     The Tauri Rust backend spawns llama.cpp as a subprocess.
//     window.__TAURI__.invoke("start_llamacpp", { model: "..." })
//     Communication via local stdio or named pipe.
//     See docs/TAURI_ROADMAP.md for the full integration plan.
//
// LINUX ISO PLAN:
//   llama.cpp will be compiled and bundled in the ZaraOS ISO.
//   A GGUF model (e.g., Llama-3-8B-Q4_K_M) will ship on the USB.
//   The Tauri service manager will launch it at boot.
//   Users can swap models by placing GGUF files in ~/zara/models/.
//
// API (llama.cpp server mode follows OpenAI-compatible API):
//   POST http://localhost:8080/v1/chat/completions
//   Same schema as OpenAI — easy to wire in.
// ============================================================

import type {
  AIProviderAdapter,
  AIMessage,
  AISendOptions,
  AIStreamCallback,
  AIProviderStatus,
} from "./provider-adapter";
import type { AICapabilities } from "../models/ai-capabilities";
import { LLAMACPP_CAPABILITIES } from "../models/ai-capabilities";
import { getSimulatedResponse } from "../prompts/zara-system-prompt";

const LLAMACPP_DEFAULT_ENDPOINT = "http://127.0.0.1:8080";

// WebKit2GTK-compatible fetch timeout (AbortSignal.timeout is not supported).
function makeFetchSignal(ms: number): AbortSignal {
  const ctrl  = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

export class LlamaCppProvider implements AIProviderAdapter {
  readonly id = "llamacpp";
  readonly name = "llama.cpp (Local)";
  readonly isLocal = true;
  readonly isCloud = false;
  readonly isEnabled: boolean;

  private activeModel: string;
  private endpoint: string;
  private isAvailable = false;

  constructor(options?: { enabled?: boolean; model?: string; endpoint?: string }) {
    this.isEnabled = options?.enabled ?? false;
    this.activeModel = options?.model ?? "llama-3-8b-q4_k_m";
    this.endpoint = options?.endpoint ?? LLAMACPP_DEFAULT_ENDPOINT;
  }

  async initialize(): Promise<void> {
    const status = await this.healthCheck();
    this.isAvailable = status.available;
  }

  async sendMessage(messages: AIMessage[], options?: AISendOptions): Promise<string> {
    if (!this.isAvailable) return this.simulatedFallback(messages);

    try {
      // llama.cpp server implements OpenAI-compatible /v1/chat/completions
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options?.model ?? this.activeModel,
          messages: this.prependSystem(messages, options?.systemPrompt),
          stream: false,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 512,
        }),
        signal: makeFetchSignal(60000),
      });

      if (!response.ok) throw new Error(`llama.cpp error: ${response.status}`);
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content ?? "No response.";
    } catch {
      this.isAvailable = false;
      return this.simulatedFallback(messages);
    }
  }

  async streamMessage(messages: AIMessage[], onChunk: AIStreamCallback, options?: AISendOptions): Promise<void> {
    if (!this.isAvailable) {
      const text = this.simulatedFallback(messages);
      for (let i = 0; i < text.length; i += 3) {
        await new Promise((r) => setTimeout(r, 30));
        onChunk({ delta: text.slice(i, i + 3), done: i + 3 >= text.length });
      }
      return;
    }

    try {
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.activeModel,
          messages: this.prependSystem(messages, options?.systemPrompt),
          stream: true,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 512,
        }),
        signal: options?.signal,
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const raw = line.replace("data: ", "").trim();
          if (raw === "[DONE]") { onChunk({ delta: "", done: true }); return; }
          try {
            const parsed = JSON.parse(raw) as { choices?: Array<{ delta?: { content?: string }; finish_reason?: string }> };
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            const isDone = parsed.choices?.[0]?.finish_reason === "stop";
            if (delta) onChunk({ delta, done: isDone });
            if (isDone) return;
          } catch { /* skip */ }
        }
      }
    } catch {
      onChunk({ delta: " [llama.cpp disconnected]", done: true });
    }
  }

  async listModels(): Promise<string[]> {
    return ["llama-3-8b-q4_k_m", "mistral-7b-q4_k_m", "phi-3-mini-q4", "gemma-2b-q4"];
  }

  getActiveModel(): string { return this.activeModel; }
  setModel(modelId: string): void { this.activeModel = modelId; }

  async healthCheck(): Promise<AIProviderStatus> {
    try {
      const response = await fetch(`${this.endpoint}/health`, {
        signal: makeFetchSignal(2000),
      });
      if (response.ok) {
        this.isAvailable = true;
        return { available: true, healthy: true, activeModel: this.activeModel, reason: "llama.cpp server is running", lastCheckedAt: Date.now() };
      }
    } catch { /* Not running */ }
    this.isAvailable = false;
    return { available: false, healthy: false, reason: "llama.cpp server not reachable at 127.0.0.1:8080", lastCheckedAt: Date.now() };
  }

  supportsStreaming(): boolean { return true; }
  supportsVision(): boolean { return false; }
  supportsTools(): boolean { return false; }
  supportsOffline(): boolean { return true; }
  getCapabilities(): AICapabilities { return { ...LLAMACPP_CAPABILITIES }; }

  private prependSystem(messages: AIMessage[], systemPrompt?: string): AIMessage[] {
    if (!systemPrompt) return messages;
    return [{ role: "system", content: systemPrompt }, ...messages];
  }

  private simulatedFallback(messages: AIMessage[]): string {
    const last = [...messages].reverse().find((m) => m.role === "user");
    const response = getSimulatedResponse("ai_question", last?.content);
    return `${response}\n\n[Note: llama.cpp is not connected. Running in simulated mode.]`;
  }
}

export const llamaCppProvider = new LlamaCppProvider({ enabled: false });
