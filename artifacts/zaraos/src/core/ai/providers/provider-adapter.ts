// ============================================================
// ZaraOS AI Provider Adapter Interface
//
// Every AI provider (local, Ollama, llama.cpp, OpenAI, etc.)
// must implement this interface. The AI Runtime selects and
// calls providers exclusively through this contract.
//
// UI → Zara Runtime → AI Runtime → Provider Adapter
//
// The UI layer NEVER calls provider adapters directly.
// ============================================================

import type { AICapabilities } from "../models/ai-capabilities";

// ── Message Format ────────────────────────────────────────
export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ── Send Options ──────────────────────────────────────────
export interface AISendOptions {
  model?: string;
  temperature?: number;        // 0.0–1.0 (higher = more creative)
  maxTokens?: number;
  systemPrompt?: string;       // Injected at position 0 as "system" role
  stream?: boolean;
  signal?: AbortSignal;        // For request cancellation
}

// ── Streaming Chunk ───────────────────────────────────────
export interface AIStreamChunk {
  delta: string;               // New token(s) to append
  done: boolean;               // True on final chunk
  totalTokens?: number;        // Available on final chunk
}

export type AIStreamCallback = (chunk: AIStreamChunk) => void;

// ── Provider Health Status ────────────────────────────────
export interface AIProviderStatus {
  available: boolean;
  healthy: boolean;
  latencyMs?: number;
  activeModel?: string;
  reason?: string;             // Human-readable status explanation
  lastCheckedAt: number;
}

// ── Provider Adapter Interface ────────────────────────────
// All providers must implement every method.
// Methods that are not supported should throw or return sensible defaults.
export interface AIProviderAdapter {
  // Identity
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;    // true for local, ollama, llamacpp
  readonly isCloud: boolean;    // true for openai, anthropic, gemini
  readonly isEnabled: boolean;  // false for cloud providers by default

  // Lifecycle
  initialize(): Promise<void>;

  // Core inference
  sendMessage(
    messages: AIMessage[],
    options?: AISendOptions
  ): Promise<string>;

  streamMessage(
    messages: AIMessage[],
    onChunk: AIStreamCallback,
    options?: AISendOptions
  ): Promise<void>;

  // Model management
  listModels(): Promise<string[]>;
  getActiveModel(): string;
  setModel(modelId: string): void;

  // Health
  healthCheck(): Promise<AIProviderStatus>;

  // Capability checks
  supportsStreaming(): boolean;
  supportsVision(): boolean;
  supportsTools(): boolean;
  supportsOffline(): boolean;
  getCapabilities(): AICapabilities;
}
