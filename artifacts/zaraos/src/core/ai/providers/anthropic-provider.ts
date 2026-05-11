// ============================================================
// ZaraOS Anthropic Provider — Alpha 0.4
//
// Real HTTP calls to api.anthropic.com using the user's own key.
// Cloud AI — DISABLED by default. Requires cloud_ai permission
// and a user-provided API key.
//
// CORS note:
//   Anthropic blocks browser → API calls by default.
//   The `anthropic-dangerous-direct-browser-access: true` header
//   is the official opt-in for browser clients. It is required
//   and is sent on every request. Anthropic documents this
//   explicitly for web app integrations.
//
// Streaming: Anthropic SSE event stream.
//   Event types used:
//     content_block_delta  → text chunk { delta.type: "text_delta", delta.text }
//     message_stop         → stream is done
//
// Health check: GET /v1/models — lists available models,
//   validates the key without consuming any tokens.
// ============================================================

import type {
  AIProviderAdapter,
  AIMessage,
  AISendOptions,
  AIStreamCallback,
  AIProviderStatus,
} from "./provider-adapter";
import type { AICapabilities } from "../models/ai-capabilities";
import { ANTHROPIC_CAPABILITIES } from "../models/ai-capabilities";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODELS_URL   = "https://api.anthropic.com/v1/models";
const ANTHROPIC_VERSION      = "2023-06-01";
const DEFAULT_MODEL          = "claude-3-5-haiku-latest";
const REQUEST_TIMEOUT        = 60_000;
const HEALTH_TIMEOUT         = 10_000;

export class AnthropicProvider implements AIProviderAdapter {
  readonly id      = "anthropic";
  readonly name    = "Anthropic";
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
      return "Anthropic: No API key configured. Add your key in AI Provider settings.";
    }

    try {
      const response = await fetch(ANTHROPIC_MESSAGES_URL, {
        method:  "POST",
        headers: this.headers(),
        body:    JSON.stringify({
          model:      options?.model     ?? this.activeModel,
          max_tokens: options?.maxTokens ?? 1024,
          ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
          messages:   this.filterMessages(messages),
          temperature: options?.temperature ?? 0.7,
        }),
        signal: options?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? `HTTP ${response.status}`);
      }

      const data = await response.json() as {
        content?: Array<{ type: string; text?: string }>;
      };
      const textBlock = data.content?.find((c) => c.type === "text");
      return textBlock?.text ?? "No response from Anthropic.";
    } catch (e) {
      return `Anthropic error: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  }

  // ── Streaming inference (SSE) ─────────────────────────────

  async streamMessage(messages: AIMessage[], onChunk: AIStreamCallback, options?: AISendOptions): Promise<void> {
    if (!this.apiKey) {
      onChunk({ delta: "Anthropic: No API key configured. Add your key in AI Provider settings.", done: true });
      return;
    }

    try {
      const response = await fetch(ANTHROPIC_MESSAGES_URL, {
        method:  "POST",
        headers: this.headers(),
        body:    JSON.stringify({
          model:       options?.model     ?? this.activeModel,
          max_tokens:  options?.maxTokens ?? 1024,
          ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
          messages:    this.filterMessages(messages),
          stream:      true,
          temperature: options?.temperature ?? 0.7,
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
        buffer = lines.pop() ?? "";

        let eventType = "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("event: ")) {
            eventType = trimmed.slice(7).trim();
            continue;
          }
          if (!trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6).trim();
          if (!payload) continue;

          try {
            const parsed = JSON.parse(payload);

            if (eventType === "content_block_delta" || parsed.type === "content_block_delta") {
              const text = parsed.delta?.text ?? "";
              if (text) onChunk({ delta: text, done: false });

            } else if (eventType === "message_stop" || parsed.type === "message_stop") {
              onChunk({ delta: "", done: true });
              return;

            } else if (parsed.type === "error") {
              throw new Error(parsed.error?.message ?? "Anthropic stream error");
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue; // skip malformed lines
            throw parseErr;
          }
        }
      }

      onChunk({ delta: "", done: true });
    } catch (e) {
      onChunk({ delta: `\n[Anthropic error: ${e instanceof Error ? e.message : "Unknown"}]`, done: true });
    }
  }

  // ── Health check — validates key via GET /v1/models ──────

  async healthCheck(): Promise<AIProviderStatus> {
    if (!this.apiKey) {
      return { available: false, healthy: false, reason: "No API key configured", lastCheckedAt: Date.now() };
    }

    try {
      const start    = Date.now();
      const response = await fetch(ANTHROPIC_MODELS_URL, {
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
          reason:       "API key valid — Anthropic is reachable",
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
        reason:       "Anthropic unreachable — check your internet connection",
        lastCheckedAt: Date.now(),
      };
    }
  }

  // ── Model management ──────────────────────────────────────

  async listModels(): Promise<string[]> {
    if (!this.apiKey) {
      return ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"];
    }
    try {
      const response = await fetch(ANTHROPIC_MODELS_URL, {
        headers: this.headers(),
        signal:  AbortSignal.timeout(HEALTH_TIMEOUT),
      });
      if (!response.ok) throw new Error("Not ok");
      const data = await response.json() as { data?: Array<{ id: string }> };
      const models = (data.data ?? []).map((m) => m.id);
      return models.length > 0
        ? models
        : ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"];
    } catch {
      return ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"];
    }
  }

  getActiveModel(): string { return this.activeModel; }
  setModel(modelId: string): void { this.activeModel = modelId; }

  supportsStreaming(): boolean { return true; }
  supportsVision():   boolean { return true; }
  supportsTools():    boolean { return true; }
  supportsOffline():  boolean { return false; }
  getCapabilities():  AICapabilities { return { ...ANTHROPIC_CAPABILITIES }; }

  // ── Helpers ───────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      "Content-Type":                             "application/json",
      "x-api-key":                                this.apiKey!,
      "anthropic-version":                        ANTHROPIC_VERSION,
      // Required for browser-to-API calls — official Anthropic opt-in.
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }

  // Anthropic does not accept "system" role inside messages array.
  // System prompt is passed as a top-level `system` field instead.
  private filterMessages(messages: AIMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
    return messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }
}

export const anthropicProvider = new AnthropicProvider({ enabled: false });
