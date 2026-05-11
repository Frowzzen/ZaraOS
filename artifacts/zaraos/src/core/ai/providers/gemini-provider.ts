// ============================================================
// ZaraOS Gemini Provider
// Cloud provider — DISABLED by default. User API key required.
// ZaraOS does not pay for cloud inference.
// ============================================================

import type { AIProviderAdapter, AIMessage, AISendOptions, AIStreamCallback, AIProviderStatus } from "./provider-adapter";
import type { AICapabilities } from "../models/ai-capabilities";
import { GEMINI_CAPABILITIES } from "../models/ai-capabilities";

const GEMINI_DEFAULT_MODEL = "gemini-1.5-flash";

export class GeminiProvider implements AIProviderAdapter {
  readonly id = "gemini";
  readonly name = "Google Gemini";
  readonly isLocal = false;
  readonly isCloud = true;
  readonly isEnabled: boolean;

  private activeModel: string;
  private apiKey: string | null = null;

  constructor(options?: { enabled?: boolean; model?: string; apiKey?: string }) {
    this.isEnabled = options?.enabled ?? false;
    this.activeModel = options?.model ?? GEMINI_DEFAULT_MODEL;
    this.apiKey = options?.apiKey ?? null;
  }

  setApiKey(key: string): void { this.apiKey = key || null; }
  async initialize(): Promise<void> {}

  async sendMessage(messages: AIMessage[], _options?: AISendOptions): Promise<string> {
    if (!this.apiKey) return "Gemini is not configured. Add your Google AI API key in AI Provider settings.";
    // FUTURE: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
    return "Gemini cloud inference is configured but disabled in Alpha 0.3.";
  }

  async streamMessage(messages: AIMessage[], onChunk: AIStreamCallback, _options?: AISendOptions): Promise<void> {
    const text = await this.sendMessage(messages);
    for (let i = 0; i < text.length; i += 4) {
      await new Promise((r) => setTimeout(r, 20));
      onChunk({ delta: text.slice(i, i + 4), done: i + 4 >= text.length });
    }
  }

  async listModels(): Promise<string[]> {
    return ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
  }

  getActiveModel(): string { return this.activeModel; }
  setModel(modelId: string): void { this.activeModel = modelId; }

  async healthCheck(): Promise<AIProviderStatus> {
    if (!this.apiKey) return { available: false, healthy: false, reason: "No API key configured", lastCheckedAt: Date.now() };
    return { available: true, healthy: true, reason: "API key present", activeModel: this.activeModel, lastCheckedAt: Date.now() };
  }

  supportsStreaming(): boolean { return true; }
  supportsVision(): boolean { return true; }
  supportsTools(): boolean { return true; }
  supportsOffline(): boolean { return false; }
  getCapabilities(): AICapabilities { return { ...GEMINI_CAPABILITIES }; }
}

export const geminiProvider = new GeminiProvider({ enabled: false });
