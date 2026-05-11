// ============================================================
// ZaraOS Anthropic Provider
// Cloud provider — DISABLED by default. User API key required.
// ZaraOS does not pay for cloud inference.
// See openai-provider.ts for full security commentary.
// ============================================================

import type { AIProviderAdapter, AIMessage, AISendOptions, AIStreamCallback, AIProviderStatus } from "./provider-adapter";
import type { AICapabilities } from "../models/ai-capabilities";
import { ANTHROPIC_CAPABILITIES } from "../models/ai-capabilities";

const ANTHROPIC_DEFAULT_MODEL = "claude-3-5-haiku-latest";

export class AnthropicProvider implements AIProviderAdapter {
  readonly id = "anthropic";
  readonly name = "Anthropic";
  readonly isLocal = false;
  readonly isCloud = true;
  readonly isEnabled: boolean;

  private activeModel: string;
  private apiKey: string | null = null;

  constructor(options?: { enabled?: boolean; model?: string; apiKey?: string }) {
    this.isEnabled = options?.enabled ?? false;
    this.activeModel = options?.model ?? ANTHROPIC_DEFAULT_MODEL;
    this.apiKey = options?.apiKey ?? null;
  }

  setApiKey(key: string): void { this.apiKey = key || null; }

  async initialize(): Promise<void> {}

  async sendMessage(messages: AIMessage[], _options?: AISendOptions): Promise<string> {
    if (!this.apiKey) {
      return "Anthropic is not configured. Add your API key in AI Provider settings.";
    }
    // FUTURE: Real Anthropic Messages API call.
    // POST https://api.anthropic.com/v1/messages
    // Headers: x-api-key, anthropic-version
    // Body: { model, max_tokens, system, messages: [{role, content}] }
    return "Anthropic cloud inference is configured but disabled in Alpha 0.3.";
  }

  async streamMessage(messages: AIMessage[], onChunk: AIStreamCallback, _options?: AISendOptions): Promise<void> {
    const text = await this.sendMessage(messages);
    for (let i = 0; i < text.length; i += 4) {
      await new Promise((r) => setTimeout(r, 20));
      onChunk({ delta: text.slice(i, i + 4), done: i + 4 >= text.length });
    }
  }

  async listModels(): Promise<string[]> {
    return ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"];
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
  getCapabilities(): AICapabilities { return { ...ANTHROPIC_CAPABILITIES }; }
}

export const anthropicProvider = new AnthropicProvider({ enabled: false });
