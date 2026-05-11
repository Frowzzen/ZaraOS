// ============================================================
// ZaraOS Google Gemini Provider — Alpha 0.4
//
// Real HTTP calls to generativelanguage.googleapis.com.
// Cloud AI — DISABLED by default. Requires cloud_ai permission
// and a user-provided Google AI API key.
//
// API key is passed as a URL query param (`?key=...`) per the
// Google AI REST API design — no auth header needed/used.
// CORS is permitted by Google for browser clients.
//
// Message format:
//   Google uses a "contents" array with "parts" instead of
//   OpenAI's "messages" array. This adapter converts between
//   the two formats transparently.
//
//   System prompts → top-level "systemInstruction" field.
//   User/assistant turns → "contents" array.
//     role: "user" → role: "user"
//     role: "assistant" → role: "model"  (Google's convention)
//
// Streaming: Server-Sent Events via ?alt=sse query param.
//   Each event data is a JSON object with candidates[].content.parts[].text
//
// Health check: GET /v1beta/models?key=... — lists models,
//   validates the key without any token consumption.
// ============================================================

import type {
  AIProviderAdapter,
  AIMessage,
  AISendOptions,
  AIStreamCallback,
  AIProviderStatus,
} from "./provider-adapter";
import type { AICapabilities } from "../models/ai-capabilities";
import { GEMINI_CAPABILITIES } from "../models/ai-capabilities";

const GEMINI_BASE      = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL    = "gemini-1.5-flash";
const REQUEST_TIMEOUT  = 60_000;
const HEALTH_TIMEOUT   = 10_000;

// ── Gemini message types ──────────────────────────────────

interface GeminiPart     { text: string }
interface GeminiContent  { role: "user" | "model"; parts: GeminiPart[] }
interface GeminiInstruction { parts: GeminiPart[] }

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: GeminiInstruction;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export class GeminiProvider implements AIProviderAdapter {
  readonly id      = "gemini";
  readonly name    = "Google Gemini";
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
      return "Gemini: No API key configured. Add your Google AI API key in AI Provider settings.";
    }

    const model = options?.model ?? this.activeModel;
    const url   = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    try {
      const response = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(this.buildBody(messages, options)),
        signal:  options?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? `HTTP ${response.status}`);
      }

      const data = await response.json() as GeminiResponse;
      return this.extractText(data) ?? "No response from Gemini.";
    } catch (e) {
      return `Gemini error: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  }

  // ── Streaming inference (SSE via alt=sse) ─────────────────

  async streamMessage(messages: AIMessage[], onChunk: AIStreamCallback, options?: AISendOptions): Promise<void> {
    if (!this.apiKey) {
      onChunk({ delta: "Gemini: No API key configured. Add your Google AI API key in AI Provider settings.", done: true });
      return;
    }

    const model = options?.model ?? this.activeModel;
    const url   = `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`;

    try {
      const response = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(this.buildBody(messages, options)),
        signal:  options?.signal,
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

        if (done) {
          // Flush remaining buffer
          if (buffer.trim()) {
            const lines = buffer.split("\n");
            for (const line of lines) {
              const text = this.parseSSELine(line);
              if (text) onChunk({ delta: text, done: false });
            }
          }
          onChunk({ delta: "", done: true });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const text = this.parseSSELine(line);
          if (text !== null) onChunk({ delta: text, done: false });
        }
      }
    } catch (e) {
      onChunk({ delta: `\n[Gemini error: ${e instanceof Error ? e.message : "Unknown"}]`, done: true });
    }
  }

  // ── Health check — validates key via GET /v1beta/models ──

  async healthCheck(): Promise<AIProviderStatus> {
    if (!this.apiKey) {
      return { available: false, healthy: false, reason: "No API key configured", lastCheckedAt: Date.now() };
    }

    try {
      const start    = Date.now();
      const url      = `${GEMINI_BASE}/models?key=${encodeURIComponent(this.apiKey)}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(HEALTH_TIMEOUT),
      });
      const latencyMs = Date.now() - start;

      if (response.ok) {
        return {
          available:    true,
          healthy:      true,
          latencyMs,
          activeModel:  this.activeModel,
          reason:       "API key valid — Google AI is reachable",
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
        reason:       "Google AI unreachable — check your internet connection",
        lastCheckedAt: Date.now(),
      };
    }
  }

  // ── Model management ──────────────────────────────────────

  async listModels(): Promise<string[]> {
    const fallback = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.5-pro"];
    if (!this.apiKey) return fallback;

    try {
      const url      = `${GEMINI_BASE}/models?key=${encodeURIComponent(this.apiKey)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(HEALTH_TIMEOUT) });
      if (!response.ok) throw new Error("Not ok");
      const data = await response.json() as { models?: Array<{ name: string }> };
      const models = (data.models ?? [])
        .map((m) => m.name.replace("models/", ""))
        .filter((id) => id.includes("gemini"))
        .sort();
      return models.length > 0 ? models : fallback;
    } catch {
      return fallback;
    }
  }

  getActiveModel(): string { return this.activeModel; }
  setModel(modelId: string): void { this.activeModel = modelId; }

  supportsStreaming(): boolean { return true; }
  supportsVision():   boolean { return true; }
  supportsTools():    boolean { return true; }
  supportsOffline():  boolean { return false; }
  getCapabilities():  AICapabilities { return { ...GEMINI_CAPABILITIES }; }

  // ── Helpers ───────────────────────────────────────────────

  private buildBody(messages: AIMessage[], options?: AISendOptions): GeminiRequestBody {
    const contents: GeminiContent[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role:  m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction: GeminiInstruction | undefined = options?.systemPrompt
      ? { parts: [{ text: options.systemPrompt }] }
      : undefined;

    return {
      contents,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: {
        temperature:     options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens   ?? 1024,
      },
    };
  }

  private extractText(data: GeminiResponse): string | null {
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }

  private parseSSELine(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) return null;
    const payload = trimmed.slice(6).trim();
    if (!payload) return null;
    try {
      const parsed = JSON.parse(payload) as GeminiResponse;
      return this.extractText(parsed) ?? null;
    } catch {
      return null;
    }
  }
}

export const geminiProvider = new GeminiProvider({ enabled: false });
