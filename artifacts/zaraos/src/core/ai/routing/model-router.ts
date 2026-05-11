// ============================================================
// ZaraOS Model Router
//
// Selects the best model for a given request type.
// Different tasks benefit from different model sizes:
//   - Commands / navigation: lightweight, fast
//   - Summarization: mid-size, accurate
//   - Complex reasoning: large, thorough
//   - Vision tasks: multimodal model required
// ============================================================

export type RequestType =
  | "command"         // Quick OS commands ("open settings", "set timer")
  | "conversation"    // General assistant conversation
  | "summarization"   // Summarize documents or pages
  | "reasoning"       // Multi-step reasoning or analysis
  | "vision"          // Image understanding (future)
  | "code"            // Code generation or explanation
  | "translation";    // Language translation

export interface ModelSelection {
  modelId: string;
  reason: string;
  estimatedLatencyMs: number;
}

// Model preference tables per provider.
const MODEL_PREFERENCES: Record<string, Partial<Record<RequestType, string>>> = {
  local: {
    command: "zara-core-v0.1",
    conversation: "zara-core-v0.1",
    summarization: "zara-core-v0.1",
    reasoning: "zara-core-v0.1",
  },
  ollama: {
    command: "phi3",          // Fast, lightweight
    conversation: "llama3",   // Balanced
    summarization: "llama3",
    reasoning: "llama3.1",    // Better reasoning
    code: "deepseek-coder",
    translation: "llama3",
  },
  llamacpp: {
    command: "phi-3-mini-q4",
    conversation: "llama-3-8b-q4_k_m",
    summarization: "llama-3-8b-q4_k_m",
    reasoning: "llama-3-8b-q4_k_m",
  },
  openai: {
    command: "gpt-4o-mini",
    conversation: "gpt-4o-mini",
    summarization: "gpt-4o",
    reasoning: "gpt-4o",
    code: "gpt-4o",
    translation: "gpt-4o-mini",
    vision: "gpt-4o",
  },
  anthropic: {
    command: "claude-3-5-haiku-latest",
    conversation: "claude-3-5-haiku-latest",
    summarization: "claude-3-5-sonnet-latest",
    reasoning: "claude-3-5-sonnet-latest",
    code: "claude-3-5-sonnet-latest",
    translation: "claude-3-5-haiku-latest",
  },
  gemini: {
    command: "gemini-1.5-flash",
    conversation: "gemini-1.5-flash",
    summarization: "gemini-1.5-pro",
    reasoning: "gemini-2.5-pro",
    vision: "gemini-1.5-pro",
    translation: "gemini-1.5-flash",
  },
};

const LATENCY_ESTIMATES: Record<string, Partial<Record<RequestType, number>>> = {
  local: { command: 800, conversation: 1000, summarization: 1200, reasoning: 1400 },
  ollama: { command: 2000, conversation: 4000, summarization: 8000, reasoning: 12000 },
  llamacpp: { command: 3000, conversation: 5000, summarization: 10000, reasoning: 15000 },
  openai: { command: 800, conversation: 2000, summarization: 4000, reasoning: 8000 },
  anthropic: { command: 1000, conversation: 2000, summarization: 3000, reasoning: 5000 },
  gemini: { command: 600, conversation: 1500, summarization: 3000, reasoning: 6000 },
};

export class ModelRouter {
  selectModel(
    providerId: string,
    requestType: RequestType,
    overrideModel?: string
  ): ModelSelection {
    if (overrideModel) {
      return {
        modelId: overrideModel,
        reason: "User-specified model",
        estimatedLatencyMs: LATENCY_ESTIMATES[providerId]?.[requestType] ?? 2000,
      };
    }

    const preferredModel = MODEL_PREFERENCES[providerId]?.[requestType];
    const defaultModel = this.getDefaultModel(providerId);
    const modelId = preferredModel ?? defaultModel;
    const latency = LATENCY_ESTIMATES[providerId]?.[requestType] ?? 2000;

    return {
      modelId,
      reason: preferredModel
        ? `Optimized model for ${requestType} on ${providerId}`
        : `Default model for ${providerId}`,
      estimatedLatencyMs: latency,
    };
  }

  classifyRequest(input: string): RequestType {
    const lower = input.toLowerCase();
    if (/\b(summarize|summary|tldr|overview)\b/.test(lower)) return "summarization";
    if (/\b(translate|in spanish|in french|in german|in japanese|in chinese)\b/.test(lower)) return "translation";
    if (/\b(code|function|class|implement|debug|fix the bug|write a)\b/.test(lower)) return "code";
    if (/\b(why|explain|reason|how does|analyze|compare|think about)\b/.test(lower)) return "reasoning";
    if (/\b(open|close|navigate|go to|launch|set|enable|disable|toggle)\b/.test(lower)) return "command";
    return "conversation";
  }

  private getDefaultModel(providerId: string): string {
    const defaults: Record<string, string> = {
      local: "zara-core-v0.1",
      ollama: "llama3",
      llamacpp: "llama-3-8b-q4_k_m",
      openai: "gpt-4o-mini",
      anthropic: "claude-3-5-haiku-latest",
      gemini: "gemini-1.5-flash",
    };
    return defaults[providerId] ?? "unknown";
  }
}

export const modelRouter = new ModelRouter();
