// ============================================================
// ZaraOS OpenAI Provider — Alpha 0.4
//
// Real HTTP calls to api.openai.com using the user's own API key.
// Cloud AI — DISABLED by default. Requires:
//   1. cloud_ai permission granted in Privacy settings
//   2. User-provided API key saved in AI Provider settings
//
// Security rules:
//   - Key lives in localStorage only — never sent to any ZaraOS server.
//   - No inference call is made until both conditions above are true.
//   - ZaraOS never pays for inference; users bring their own keys.
//
// Streaming: OpenAI Server-Sent Events (SSE).
//   Each chunk: "data: {...}\n\n"
//   Final chunk: "data: [DONE]\n\n"
//
// Health check: GET /v1/models — lightweight, validates the key
//   without consuming any tokens.
// ============================================================

import type {
  AIProviderAdapter,
  AIMessage,
  AISendOptions,
  AIStreamCallback,
  AIProviderStatus,
} from "./provider-adapter";
import type { AICapabilities } from "../models/ai-capabilities";
import { OPENAI_CAPABILITIES } from "../models/ai-capabilities";

const OPENAI_CHAT_URL  = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODELS_URL = "https://api.openai.com/v1/models";
const DEFAULT_MODEL    = "gpt-4o-mini";
const REQUEST_TIMEOUT  = 60_000;
const HEALTH_TIMEOUT   = 10_000;

export class OpenAIProvider implements AIProviderAdapter {
  readonly id      = "openai";
  readonly name    = "OpenAI";
  readonly isLocal = false;
  readonly isCloud = true;
  readonly isEnabled: boolean;

  private activeModel: string;
  private apiKey: string | null = null;

  constructor(options?: { enabled?: boolean; model?: string; apiKey?: string }) {
    this.isEnabled   = options?.enabled ?? false;
    this.activeModel = options?.model   ?? DEFAULT_MODEL;
    this.apiKey      = options?.apiKey  ?? null;
  }

  setApiKey(key: string): void { this.apiKey = key || null; }

  async initialize(): Promise<void> {}

  // ── Non-streaming inference ───────────────────────────────

  async sendMessage(messages: AIMessage[], options?: AISendOptions): Promise<string> {
    if (!this.apiKey) {
      return "OpenAI: No API key configured. Add your key in AI Provider settings.";
    }

    try {
      const response = await fetch(OPENAI_CHAT_URL, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model:       options?.model       ?? this.activeModel,
          messages:    this.buildMessages(messages, options?.systemPrompt),
          stream:      false,
          temperature: options?.temperature ?? 0.7,
          max_tokens:  options?.maxTokens   ?? 1024,
        }),
        signal: options?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? `HTTP ${response.status}`);
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content ?? "No response from OpenAI.";
    } catch (e) {
      return `OpenAI error: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  }

  // ── Streaming inference (SSE) ─────────────────────────────

  async streamMessage(messages: AIMessage[], onChunk: AIStreamCallback, options?: AISendOptions): Promise<void> {
    if (!this.apiKey) {
      onChunk({ delta: "OpenAI: No API key configured. Add your key in AI Provider settings.", done: true });
      return;
    }

    try {
      const response = await fetch(OPENAI_CHAT_URL, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model:       options?.model       ?? this.activeModel,
          messages:    this.buildMessages(messages, options?.systemPrompt),
          stream:      true,
          temperature: options?.temperature ?? 0.7,
          max_tokens:  options?.maxTokens   ?? 1024,
        }),
        signal: options?.signal,
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? `HTTP ${response.status}`);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6).trim();
          if (payload === "[DONE]") {
            onChunk({ delta: "", done: true });
            return;
          }
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
            };
            const delta       = parsed.choices?.[0]?.delta?.content ?? "";
            const finishReason = parsed.choices?.[0]?.finish_reason;
            const isDone      = finishReason === "stop" || finishReason === "length";
            if (delta) onChunk({ delta, done: isDone });
            if (isDone) return;
          } catch { /* skip malformed chunk */ }
        }
      }

      onChunk({ delta: "", done: true });
    } catch (e) {
      onChunk({ delta: `\n[OpenAI error: ${e instanceof Error ? e.message : "Unknown"}]`, done: true });
    }
  }

  // ── Health check — validates key via GET /v1/models ──────

  async healthCheck(): Promise<AIProviderStatus> {
    if (!this.apiKey) {
      return { available: false, healthy: false, reason: "No API key configured", lastCheckedAt: Date.now() };
    }

    try {
      const start    = Date.now();
      const response = await fetch(OPENAI_MODELS_URL, {
        headers: this.headers(),
        signal:  AbortSignal.timeout(HEALTH_TIMEOUT),
      });
      const latencyMs = Date.now() - start;

      if (response.ok) {
        return {
          available:    true,
          healthy:      true,
          latencyMs,
          activeModel:  this.activeModel,
          reason:       "API key valid — OpenAI is reachable",
          lastCheckedAt: Date.now(),
        };
      }

      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      return {
        available:    false,
        healthy:      false,
        reason:       err.error?.message ?? `HTTP ${response.status}`,
        lastCheckedAt: Date.now(),
      };
    } catch {
      return {
        available:    false,
        healthy:      false,
        reason:       "OpenAI unreachable — check your internet connection",
        lastCheckedAt: Date.now(),
      };
    }
  }

  // ── Model management ──────────────────────────────────────

  async listModels(): Promise<string[]> {
    if (!this.apiKey) {
      return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
    }
    try {
      const response = await fetch(OPENAI_MODELS_URL, {
        headers: this.headers(),
        signal:  AbortSignal.timeout(HEALTH_TIMEOUT),
      });
      if (!response.ok) throw new Error("Not ok");
      const data = await response.json() as { data?: Array<{ id: string }> };
      const chatModels = (data.data ?? [])
        .map((m) => m.id)
        .filter((id) => id.startsWith("gpt-"))
        .sort();
      return chatModels.length > 0
        ? chatModels
        : ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
    } catch {
      return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
    }
  }

  getActiveModel(): string { return this.activeModel; }
  setModel(modelId: string): void { this.activeModel = modelId; }

  supportsStreaming(): boolean { return true; }
  supportsVision():   boolean { return true; }
  supportsTools():    boolean { return true; }
  supportsOffline():  boolean { return false; }
  getCapabilities():  AICapabilities { return { ...OPENAI_CAPABILITIES }; }

  // ── Helpers ───────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
    };
  }

  private buildMessages(messages: AIMessage[], systemPrompt?: string): AIMessage[] {
    if (!systemPrompt) return messages;
    return [{ role: "system", content: systemPrompt }, ...messages];
  }
}

export const openaiProvider = new OpenAIProvider({ enabled: false });
