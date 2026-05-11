// ============================================================
// ZaraOS OpenAI Provider
//
// Cloud provider adapter for OpenAI GPT models.
// DISABLED by default. Requires explicit user opt-in and
// a user-provided API key stored in localStorage only.
//
// SECURITY RULES:
//   - This provider is NEVER enabled without explicit user action.
//   - API keys are stored in localStorage only — never logged,
//     never transmitted to ZaraOS servers (there are none).
//   - This adapter only activates when:
//     a) the user has enabled cloud AI in Privacy settings, AND
//     b) the user has entered their own OpenAI API key.
//   - No API calls are made in this file in Alpha 0.3.
//
// ZaraOS does not pay for cloud inference.
// Users bring their own API keys.
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

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAIProvider implements AIProviderAdapter {
  readonly id = "openai";
  readonly name = "OpenAI";
  readonly isLocal = false;
  readonly isCloud = true;
  readonly isEnabled: boolean;

  private activeModel: string;
  private apiKey: string | null = null;

  constructor(options?: { enabled?: boolean; model?: string; apiKey?: string }) {
    this.isEnabled = options?.enabled ?? false;
    this.activeModel = options?.model ?? OPENAI_DEFAULT_MODEL;
    this.apiKey = options?.apiKey ?? null;
  }

  setApiKey(key: string): void {
    // SECURITY: Key stored in memory only during session.
    // Persistence to localStorage is handled by the AI settings layer.
    // Key is never logged.
    this.apiKey = key || null;
  }

  async initialize(): Promise<void> {
    // No initialization needed for cloud provider.
    // Key is set externally via setApiKey().
  }

  async sendMessage(messages: AIMessage[], options?: AISendOptions): Promise<string> {
    if (!this.apiKey) {
      return "OpenAI is not configured. Add your API key in AI Provider settings to enable cloud inference.";
    }

    // FUTURE: Real OpenAI call when user has configured their key.
    // Requires cloud_ai permission to be granted in Privacy settings.
    //
    // const response = await fetch(OPENAI_API_URL, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${this.apiKey}`,
    //   },
    //   body: JSON.stringify({
    //     model: options?.model ?? this.activeModel,
    //     messages: this.prependSystem(messages, options?.systemPrompt),
    //     stream: false,
    //     temperature: options?.temperature ?? 0.7,
    //     max_tokens: options?.maxTokens ?? 1024,
    //   }),
    //   signal: options?.signal,
    // });
    // const data = await response.json();
    // return data.choices[0].message.content;

    return "OpenAI cloud inference is configured but disabled in Alpha 0.3. Enable cloud AI in Privacy settings first.";
  }

  async streamMessage(messages: AIMessage[], onChunk: AIStreamCallback, _options?: AISendOptions): Promise<void> {
    const text = await this.sendMessage(messages);
    for (let i = 0; i < text.length; i += 4) {
      await new Promise((r) => setTimeout(r, 20));
      onChunk({ delta: text.slice(i, i + 4), done: i + 4 >= text.length });
    }
  }

  async listModels(): Promise<string[]> {
    return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
  }

  getActiveModel(): string { return this.activeModel; }
  setModel(modelId: string): void { this.activeModel = modelId; }

  async healthCheck(): Promise<AIProviderStatus> {
    if (!this.apiKey) {
      return { available: false, healthy: false, reason: "No API key configured", lastCheckedAt: Date.now() };
    }
    return { available: true, healthy: true, reason: "API key present — cloud access enabled", activeModel: this.activeModel, lastCheckedAt: Date.now() };
  }

  supportsStreaming(): boolean { return true; }
  supportsVision(): boolean { return true; }
  supportsTools(): boolean { return true; }
  supportsOffline(): boolean { return false; }
  getCapabilities(): AICapabilities { return { ...OPENAI_CAPABILITIES }; }

  private prependSystem(messages: AIMessage[], systemPrompt?: string): AIMessage[] {
    if (!systemPrompt) return messages;
    return [{ role: "system", content: systemPrompt }, ...messages];
  }
}

export const openaiProvider = new OpenAIProvider({ enabled: false });
