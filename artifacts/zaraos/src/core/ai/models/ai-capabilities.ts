// ============================================================
// ZaraOS AI Capability Types
//
// Defines what any AI provider or model can do.
// Providers declare their capabilities at initialization time.
// The AI Routing layer uses capabilities to select the best
// provider for each request.
//
// Portability: No Replit, cloud, or paid service dependency.
// ============================================================

// ── Capability Identifiers ────────────────────────────────
export type AICapabilityKey =
  | "streaming"          // Can stream token-by-token responses
  | "tools"              // Supports function/tool calling
  | "vision"             // Accepts image inputs
  | "speech"             // Accepts audio inputs (separate from Whisper.cpp)
  | "gestures"           // Gesture-context aware (future)
  | "offline"            // Works without internet
  | "reasoning"          // Chain-of-thought / multi-step reasoning
  | "summarization"      // Optimized for document summarization
  | "command_execution"  // Can interpret and route OS commands
  | "memory";            // Supports in-context memory injection

// ── Capability Record ─────────────────────────────────────
export interface AICapabilities {
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  speech: boolean;
  gestures: boolean;
  offline: boolean;
  reasoning: boolean;
  summarization: boolean;
  commandExecution: boolean;
  memory: boolean;
  // Context limits
  contextWindowTokens: number;
  maxOutputTokens: number;
}

// ── Preset capability profiles ────────────────────────────

// The mocked local runtime — available with zero dependencies.
export const LOCAL_SIMULATED_CAPABILITIES: AICapabilities = {
  streaming: true,      // Simulated streaming in Alpha 0.3
  tools: false,
  vision: false,
  speech: false,
  gestures: false,
  offline: true,        // Fully offline — this is the default
  reasoning: true,      // Simulated reasoning responses
  summarization: true,  // Simulated summarization
  commandExecution: true,
  memory: true,
  contextWindowTokens: 4096,
  maxOutputTokens: 512,
};

// Ollama — local inference server (localhost:11434)
// Enable when Ollama is installed and a model is pulled.
export const OLLAMA_CAPABILITIES: AICapabilities = {
  streaming: true,
  tools: false,         // Depends on model (llama3.1+ supports tools)
  vision: false,        // Depends on model (llava supports vision)
  speech: false,
  gestures: false,
  offline: true,        // Fully offline — runs on local GPU/CPU
  reasoning: true,
  summarization: true,
  commandExecution: true,
  memory: true,
  contextWindowTokens: 8192,
  maxOutputTokens: 2048,
};

// llama.cpp — direct model binary
export const LLAMACPP_CAPABILITIES: AICapabilities = {
  streaming: true,
  tools: false,
  vision: false,
  speech: false,
  gestures: false,
  offline: true,
  reasoning: true,
  summarization: true,
  commandExecution: true,
  memory: true,
  contextWindowTokens: 4096,
  maxOutputTokens: 1024,
};

// OpenAI — cloud only, disabled by default
export const OPENAI_CAPABILITIES: AICapabilities = {
  streaming: true,
  tools: true,
  vision: true,
  speech: true,
  gestures: false,
  offline: false,       // Requires internet — cloud provider
  reasoning: true,
  summarization: true,
  commandExecution: true,
  memory: false,        // Server-side memory is a separate product
  contextWindowTokens: 128000,
  maxOutputTokens: 4096,
};

// Anthropic — cloud only, disabled by default
export const ANTHROPIC_CAPABILITIES: AICapabilities = {
  streaming: true,
  tools: true,
  vision: true,
  speech: false,
  gestures: false,
  offline: false,
  reasoning: true,
  summarization: true,
  commandExecution: true,
  memory: false,
  contextWindowTokens: 200000,
  maxOutputTokens: 4096,
};

// Gemini — cloud only, disabled by default
export const GEMINI_CAPABILITIES: AICapabilities = {
  streaming: true,
  tools: true,
  vision: true,
  speech: true,
  gestures: false,
  offline: false,
  reasoning: true,
  summarization: true,
  commandExecution: true,
  memory: false,
  contextWindowTokens: 1000000,
  maxOutputTokens: 8192,
};

// ── Capability helpers ────────────────────────────────────

export function hasCapability(
  caps: AICapabilities,
  key: AICapabilityKey
): boolean {
  const map: Record<AICapabilityKey, boolean> = {
    streaming: caps.streaming,
    tools: caps.tools,
    vision: caps.vision,
    speech: caps.speech,
    gestures: caps.gestures,
    offline: caps.offline,
    reasoning: caps.reasoning,
    summarization: caps.summarization,
    command_execution: caps.commandExecution,
    memory: caps.memory,
  };
  return map[key] ?? false;
}

export function capabilityLabel(key: AICapabilityKey): string {
  const labels: Record<AICapabilityKey, string> = {
    streaming: "Streaming",
    tools: "Tool Calling",
    vision: "Vision",
    speech: "Speech",
    gestures: "Gesture-Aware",
    offline: "Offline",
    reasoning: "Reasoning",
    summarization: "Summarization",
    command_execution: "Command Execution",
    memory: "Memory",
  };
  return labels[key] ?? key;
}
