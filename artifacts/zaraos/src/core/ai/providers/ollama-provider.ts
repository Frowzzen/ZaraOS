// ============================================================
// ZaraOS Ollama Provider
//
// Integration point for Ollama — a local LLM server that runs
// on localhost:11434 and serves models like Llama3, Mistral,
// Phi3, Gemma, and hundreds more.
//
// CURRENT STATE (Alpha 0.3):
//   Ollama is NOT assumed to be installed. If it is not
//   reachable, this provider returns simulated responses
//   identical to the LocalProvider, with a note that the
//   real runtime is not connected.
//
// HOW TO ENABLE FOR REAL (Linux / macOS / Windows):
//   1. Install Ollama: https://ollama.com
//   2. Pull a model: ollama pull llama3
//   3. Start server: ollama serve (runs on port 11434 by default)
//   4. Enable Ollama in ZaraOS AI Provider settings.
//   5. The healthCheck() will detect it automatically.
//
// LINUX DEPLOYMENT PLAN:
//   On the ZaraOS Linux ISO, Ollama will be pre-installed and
//   started automatically as a systemd service at boot.
//   Zara will detect it at localhost:11434 and switch to it
//   without any user configuration.
//
// TAURI BRIDGE PLAN (Alpha 0.5+):
//   When ZaraOS is packaged as a Tauri app, the Rust backend
//   will manage the Ollama process lifecycle via std::process::Command.
//   The Tauri frontend will call window.__TAURI__.invoke("start_ollama")
//   and this adapter will connect to the managed instance.
//   The REST API stays identical — only the process management changes.
//
// API REFERENCE:
//   POST http://localhost:11434/api/chat
//   Body: { model: string, messages: [{role, content}], stream: bool }
//   Response (stream): NDJSON lines with { message: { role, content }, done: bool }
// ============================================================

import type {
  AIProviderAdapter,
  AIMessage,
  AISendOptions,
  AIStreamCallback,
  AIProviderStatus,
} from "./provider-adapter";
import type { AICapabilities } from "../models/ai-capabilities";
import { OLLAMA_CAPABILITIES } from "../models/ai-capabilities";
import { getSimulatedResponse } from "../prompts/zara-system-prompt";

const OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_DEFAULT_MODEL = "llama3";
const HEALTH_CHECK_TIMEOUT_MS = 3000;

export class OllamaProvider implements AIProviderAdapter {
  readonly id = "ollama";
  readonly name = "Ollama (Local)";
  readonly isLocal = true;
  readonly isCloud = false;
  readonly isEnabled: boolean;

  private activeModel: string;
  private baseUrl: string;
  private isAvailable = false;
  private lastHealthCheck = 0;

  constructor(options?: { enabled?: boolean; model?: string; baseUrl?: string }) {
    this.isEnabled = options?.enabled ?? false;
    this.activeModel = options?.model ?? OLLAMA_DEFAULT_MODEL;
    this.baseUrl = options?.baseUrl ?? OLLAMA_BASE_URL;
  }

  async initialize(): Promise<void> {
    // Check if Ollama is reachable. If not, fall back silently.
    const status = await this.healthCheck();
    this.isAvailable = status.available;
  }

  async sendMessage(
    messages: AIMessage[],
    options?: AISendOptions
  ): Promise<string> {
    if (!this.isAvailable) {
      // Fall back to simulated response with a note.
      return this.simulatedFallback(messages);
    }

    try {
      // REAL OLLAMA INTEGRATION:
      // This is the actual REST call to a running Ollama server.
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options?.model ?? this.activeModel,
          messages: this.buildOllamaMessages(messages, options?.systemPrompt),
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 512,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const data = await response.json() as { message?: { content?: string } };
      return data.message?.content ?? "No response from Ollama.";
    } catch {
      // Ollama is unreachable — degrade gracefully.
      this.isAvailable = false;
      return this.simulatedFallback(messages);
    }
  }

  async streamMessage(
    messages: AIMessage[],
    onChunk: AIStreamCallback,
    options?: AISendOptions
  ): Promise<void> {
    if (!this.isAvailable) {
      // Simulate streaming for degraded mode.
      const text = this.simulatedFallback(messages);
      const chunkSize = 3;
      for (let i = 0; i < text.length; i += chunkSize) {
        await new Promise((r) => setTimeout(r, 30));
        const done = i + chunkSize >= text.length;
        onChunk({ delta: text.slice(i, i + chunkSize), done });
      }
      return;
    }

    try {
      // REAL OLLAMA STREAMING:
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options?.model ?? this.activeModel,
          messages: this.buildOllamaMessages(messages, options?.systemPrompt),
          stream: true,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 512,
          },
        }),
        signal: options?.signal,
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
            const delta = parsed.message?.content ?? "";
            const isDone = parsed.done ?? false;
            if (delta) onChunk({ delta, done: isDone });
            if (isDone) return;
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch {
      this.isAvailable = false;
      onChunk({ delta: " [Ollama disconnected — fell back to local simulation]", done: true });
    }
  }

  async listModels(): Promise<string[]> {
    if (!this.isAvailable) {
      return ["llama3", "mistral", "phi3", "gemma2", "llama3.1", "qwen2"];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const data = await response.json() as { models?: Array<{ name: string }> };
      return (data.models ?? []).map((m) => m.name);
    } catch {
      return ["llama3", "mistral", "phi3"];
    }
  }

  getActiveModel(): string { return this.activeModel; }
  setModel(modelId: string): void { this.activeModel = modelId; }

  async healthCheck(): Promise<AIProviderStatus> {
    this.lastHealthCheck = Date.now();
    try {
      const start = Date.now();
      const response = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      const latencyMs = Date.now() - start;

      if (response.ok) {
        this.isAvailable = true;
        return {
          available: true,
          healthy: true,
          latencyMs,
          activeModel: this.activeModel,
          reason: "Ollama is running and reachable",
          lastCheckedAt: this.lastHealthCheck,
        };
      }
    } catch { /* Not reachable */ }

    this.isAvailable = false;
    return {
      available: false,
      healthy: false,
      reason: "Ollama not reachable at localhost:11434. Install Ollama and run 'ollama serve' to enable.",
      lastCheckedAt: this.lastHealthCheck,
    };
  }

  supportsStreaming(): boolean { return true; }
  supportsVision(): boolean { return false; } // True for llava model
  supportsTools(): boolean { return false; }   // True for llama3.1+
  supportsOffline(): boolean { return true; }

  getCapabilities(): AICapabilities { return { ...OLLAMA_CAPABILITIES }; }

  private buildOllamaMessages(
    messages: AIMessage[],
    systemPrompt?: string
  ): AIMessage[] {
    const result: AIMessage[] = [];
    if (systemPrompt) result.push({ role: "system", content: systemPrompt });
    return [...result, ...messages];
  }

  private simulatedFallback(messages: AIMessage[]): string {
    const last = [...messages].reverse().find((m) => m.role === "user");
    const response = getSimulatedResponse("ai_question", last?.content);
    return `${response}\n\n[Note: Ollama is not connected. Running in simulated mode. Install Ollama and pull a model to enable real local inference.]`;
  }
}

export const ollamaProvider = new OllamaProvider({ enabled: false });
