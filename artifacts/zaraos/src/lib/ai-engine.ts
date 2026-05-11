import { create } from "zustand";

export type AIProvider = "local" | "openai" | "anthropic" | "gemini" | "grok" | "deepseek" | "ollama" | "llamacpp";

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  configured: boolean;
  active: boolean;
  apiKey?: string;
  model?: string;
}

class AIEngine {
  private currentProvider: AIProvider = "local";

  public selectProvider(provider: AIProvider) {
    this.currentProvider = provider;
    console.log(`[AIEngine] Switched to provider: ${provider}`);
  }

  public getModel(): string {
    return this.currentProvider === "local" ? "zara-core-v1" : "gpt-4o";
  }

  public async sendMessage(message: string): Promise<string> {
    // Mock response for Alpha 0.1
    // TODO: Wire up real API calls here based on this.currentProvider
    // if (this.currentProvider === "openai") { ... }
    // if (this.currentProvider === "ollama") { ... }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Received command: "${message}". I am Zara, your local AI assistant. Processing your request locally for maximum privacy.`);
      }, 1000);
    });
  }
}

export const aiEngine = new AIEngine();
