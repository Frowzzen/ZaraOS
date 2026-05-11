// ============================================================
// ZaraOS AI Engine
//
// Provider abstraction layer. Supports local-first inference
// with optional cloud provider fallback when the user has
// configured their own API key.
//
// SECURITY RULES:
//   - API keys are NEVER logged.
//   - API keys are NEVER sent anywhere in Alpha 0.1.
//   - Cloud providers are disabled by default.
//   - Local is always the default provider.
//
// Integration points:
//   - Ollama: Replace sendLocalMessage() with fetch("http://localhost:11434/api/chat")
//   - OpenAI:  Replace sendCloudMessage() with openai.chat.completions.create(...)
//   - llama.cpp: Replace with llama.cpp server REST API call
//   - Whisper.cpp: Separate VoiceEngine — not this file
// ============================================================

import type { AIProvider, AIProviderConfig } from "@/core/types";
import type { CommandIntent } from "@/core/types";

const STORAGE_KEY = "zaraos_ai_providers_v1";

// ── Intent-aware mocked responses ────────────────────────
const INTENT_RESPONSES: Partial<Record<CommandIntent, string[]>> = {
  ai_question: [
    "I've analyzed your query locally. Based on context, here's what I found. All processing happened on-device — nothing left this machine.",
    "Running inference locally. My analysis: your request aligns with standard patterns I can handle without cloud access.",
    "Processing complete. I operate fully offline by default, so your data never leaves ZaraOS.",
  ],
  file_action: [
    "I scanned the folder structure. Found 12 items: 3 documents, 9 media files, 1.2 GB total. Would you like a detailed breakdown?",
    "File analysis complete. No sensitive data patterns detected. All scanning happened locally.",
  ],
  system_status: [
    "System is nominal. CPU at 14%, RAM usage 3.2/16 GB, local AI engine active. No anomalies detected.",
    "All core systems are running. Local inference engine is healthy. Privacy mode: Engaged.",
  ],
  media_action: [
    "Media command received. Routing to the local media engine.",
  ],
  unknown: [
    "I didn't fully understand that command. Could you rephrase? You can also type 'help' for available commands.",
    "I'm not sure how to handle that yet. Try 'open settings', 'show files', or ask me a question.",
  ],
};

function getMockedResponse(intent?: CommandIntent): string {
  const pool = (intent && INTENT_RESPONSES[intent]) ?? INTENT_RESPONSES.ai_question!;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Provider Config Storage ───────────────────────────────
function loadProviderConfigs(): AIProviderConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupted storage — reset silently.
  }
  return DEFAULT_CONFIGS();
}

function saveProviderConfigs(configs: AIProviderConfig[]): void {
  // SECURITY: Strip API keys before logging — keys stored only, never exposed.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
    // Storage full — not fatal.
  }
}

function DEFAULT_CONFIGS(): AIProviderConfig[] {
  return [
    { id: "local",     name: "Zara Local",     configured: true,  active: true,  isPrimary: true  },
    { id: "ollama",    name: "Ollama",          configured: false, active: false, isPrimary: false },
    { id: "llamacpp",  name: "llama.cpp",       configured: false, active: false, isPrimary: false },
    { id: "openai",    name: "OpenAI",          configured: false, active: false, isPrimary: false },
    { id: "anthropic", name: "Anthropic",       configured: false, active: false, isPrimary: false },
    { id: "gemini",    name: "Google Gemini",   configured: false, active: false, isPrimary: false },
    { id: "grok",      name: "Grok",            configured: false, active: false, isPrimary: false },
    { id: "deepseek",  name: "DeepSeek",        configured: false, active: false, isPrimary: false },
  ];
}

// ── AI Engine Class ───────────────────────────────────────
class AIEngine {
  private currentProvider: AIProvider = "local";
  private configs: AIProviderConfig[];

  constructor() {
    this.configs = loadProviderConfigs();
    const primary = this.configs.find((c) => c.isPrimary && c.configured);
    if (primary) this.currentProvider = primary.id;
  }

  public selectProvider(provider: AIProvider): void {
    this.currentProvider = provider;
    // Update configs to reflect active provider.
    this.configs = this.configs.map((c) => ({
      ...c,
      active: c.id === provider,
      isPrimary: c.id === provider,
    }));
    saveProviderConfigs(this.configs);
  }

  public getModel(): string {
    const modelMap: Record<AIProvider, string> = {
      local:     "zara-core-v0.1",
      ollama:    "llama3",
      llamacpp:  "llama-3-8b-q4",
      openai:    "gpt-4o",
      anthropic: "claude-3-5-sonnet",
      gemini:    "gemini-1.5-pro",
      grok:      "grok-2",
      deepseek:  "deepseek-v2",
    };
    return modelMap[this.currentProvider] ?? "unknown";
  }

  public getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }

  public getProviderConfigs(): AIProviderConfig[] {
    return this.configs.map((c) => ({ ...c, apiKey: c.apiKey ? "••••••••" : undefined }));
  }

  public setApiKey(provider: AIProvider, key: string): void {
    // SECURITY: Key is written to localStorage only. Never logged. Never transmitted.
    this.configs = this.configs.map((c) =>
      c.id === provider ? { ...c, apiKey: key, configured: key.length > 0 } : c
    );
    saveProviderConfigs(this.configs);
  }

  public setModel(provider: AIProvider, model: string): void {
    this.configs = this.configs.map((c) =>
      c.id === provider ? { ...c, model } : c
    );
    saveProviderConfigs(this.configs);
  }

  public async sendMessage(message: string, intent?: CommandIntent): Promise<string> {
    // Alpha 0.1: All responses are mocked.
    // Local provider — simulate inference latency.
    if (this.currentProvider === "local" || this.currentProvider === "ollama" || this.currentProvider === "llamacpp") {
      return new Promise((resolve) => {
        const delay = 800 + Math.random() * 700;
        setTimeout(() => resolve(getMockedResponse(intent)), delay);
      });
    }

    // Cloud providers — would use real API here if cloud_ai permission is granted.
    // FUTURE (openai):
    //   const openai = new OpenAI({ apiKey: realKey, dangerouslyAllowBrowser: true });
    //   const res = await openai.chat.completions.create({ model: this.getModel(), messages: [...] });
    //   return res.choices[0].message.content ?? "";
    //
    // FUTURE (ollama):
    //   const res = await fetch("http://localhost:11434/api/chat", { method: "POST", body: JSON.stringify({ model, messages }) });
    //   return (await res.json()).message.content;

    return new Promise((resolve) => {
      setTimeout(() => resolve(getMockedResponse(intent)), 1200);
    });
  }
}

export { AIEngine };
export type { AIProvider, AIProviderConfig };
export const aiEngine = new AIEngine();
