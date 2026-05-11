// ============================================================
// ZaraOS Provider Registry
//
// Single source of truth for all AI provider instances.
// Responsible for:
//   - Creating provider instances at startup
//   - Registering them with the ProviderRouter
//   - Persisting user preferences (enabled state, API keys,
//     custom endpoints) to localStorage
//   - Exposing mutation helpers used by ZaraRuntime
//
// Security note:
//   API keys are stored in localStorage only — never sent to
//   any ZaraOS server. This is intentional prototype behavior
//   clearly labeled in the UI. Encrypted IndexedDB is Alpha 0.4.
//
// Call initializeProviders() once during aiRuntime.initialize().
// All other functions are safe to call at any time after that.
// ============================================================

import { providerRouter } from "../routing/provider-router";
import { localProvider } from "./local-provider";
import { OllamaProvider } from "./ollama-provider";
import { LlamaCppProvider } from "./llamacpp-provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { GeminiProvider } from "./gemini-provider";
import type { AIProviderAdapter, AIProviderStatus } from "./provider-adapter";

// ── Storage Keys ─────────────────────────────────────────────
const SK_ENABLED   = "zaraos_providers_enabled_v1";
const SK_PREFERRED = "zaraos_preferred_provider_v1";
const SK_ENDPOINTS = "zaraos_provider_endpoints_v1";
const SK_KEYS      = "zaraos_provider_keys_v1";

// ── Default Enabled State ─────────────────────────────────────
// Ollama is enabled by default — it activates automatically when
// Ollama is installed and running. If not running, the router
// falls back to the local simulated provider transparently.
const DEFAULT_ENABLED: Record<string, boolean> = {
  local:     true,
  ollama:    true,
  llamacpp:  false,
  openai:    false,
  anthropic: false,
  gemini:    false,
};

// ── Local storage helpers ─────────────────────────────────────
function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

function saveJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ── Provider instances ────────────────────────────────────────
// Created once during initializeProviders(), referenced by helpers below.
let _ollama: OllamaProvider | null = null;
let _llamacpp: LlamaCppProvider | null = null;
let _openai: OpenAIProvider | null = null;
let _anthropic: AnthropicProvider | null = null;
let _gemini: GeminiProvider | null = null;

let _initialized = false;

// ── All providers in declaration order ───────────────────────
export const PROVIDER_ORDER = [
  "local", "ollama", "llamacpp", "openai", "anthropic", "gemini",
] as const;

export type ProviderId = typeof PROVIDER_ORDER[number];

export interface ProviderSummary {
  id: string;
  name: string;
  isLocal: boolean;
  isCloud: boolean;
  isEnabled: boolean;
  isPreferred: boolean;
  requiresKey: boolean;
  requiresEndpoint: boolean;
  defaultEndpoint?: string;
  currentEndpoint?: string;
  hasApiKey: boolean;
}

// ── Initialization ────────────────────────────────────────────

export function initializeProviders(): void {
  if (_initialized) return;
  _initialized = true;

  const enabledState = loadJson<Record<string, boolean>>(SK_ENABLED, DEFAULT_ENABLED);
  const endpoints    = loadJson<Record<string, string>>(SK_ENDPOINTS, {});
  const keys         = loadJson<Record<string, string>>(SK_KEYS, {});

  // Create provider instances
  _ollama = new OllamaProvider({
    enabled: true, // always constructed enabled; actual availability = healthCheck()
    baseUrl: endpoints["ollama"],
  });

  _llamacpp = new LlamaCppProvider({
    enabled: true,
    endpoint: endpoints["llamacpp"],
  });

  _openai = new OpenAIProvider({
    enabled: true,
    apiKey: keys["openai"],
  });

  _anthropic = new AnthropicProvider({
    enabled: true,
    apiKey: keys["anthropic"],
  });

  _gemini = new GeminiProvider({
    enabled: true,
    apiKey: keys["gemini"],
  });

  // Register all providers — user's enabled preference controls routing
  providerRouter.register(localProvider, enabledState["local"] ?? true);
  providerRouter.register(_ollama,       enabledState["ollama"]    ?? true);
  providerRouter.register(_llamacpp,     enabledState["llamacpp"]  ?? false);
  providerRouter.register(_openai,       enabledState["openai"]    ?? false);
  providerRouter.register(_anthropic,    enabledState["anthropic"] ?? false);
  providerRouter.register(_gemini,       enabledState["gemini"]    ?? false);

  // Restore preferred provider
  const preferred = localStorage.getItem(SK_PREFERRED);
  if (preferred) providerRouter.setPreferredProvider(preferred);
}

// ── Provider mutation helpers ─────────────────────────────────

export function setProviderEnabled(id: string, enabled: boolean): void {
  providerRouter.setProviderEnabled(id, enabled);
  const state = loadJson<Record<string, boolean>>(SK_ENABLED, { ...DEFAULT_ENABLED });
  state[id] = enabled;
  saveJson(SK_ENABLED, state);
}

export function setPreferredProvider(id: string | null): void {
  providerRouter.setPreferredProvider(id);
  if (id) {
    localStorage.setItem(SK_PREFERRED, id);
  } else {
    localStorage.removeItem(SK_PREFERRED);
  }
}

export function getPreferredProviderId(): string | null {
  return providerRouter.getPreferredProviderId();
}

export function setProviderApiKey(id: string, key: string): void {
  const provider = providerRouter.getProvider(id);
  if (provider && "setApiKey" in provider) {
    (provider as { setApiKey: (k: string) => void }).setApiKey(key);
  }
  const keys = loadJson<Record<string, string>>(SK_KEYS, {});
  if (key) {
    keys[id] = key;
  } else {
    delete keys[id];
  }
  saveJson(SK_KEYS, keys);
  // Having a key enables cloud providers automatically
  if (key && ["openai", "anthropic", "gemini"].includes(id)) {
    setProviderEnabled(id, true);
  }
}

export function setProviderEndpoint(id: string, url: string): void {
  // Update the live provider instance if it exposes a setter
  if (id === "ollama" && _ollama) {
    (_ollama as unknown as { baseUrl: string }).baseUrl = url;
  }
  if (id === "llamacpp" && _llamacpp) {
    (_llamacpp as unknown as { endpoint: string }).endpoint = url;
  }
  const endpoints = loadJson<Record<string, string>>(SK_ENDPOINTS, {});
  if (url) {
    endpoints[id] = url;
  } else {
    delete endpoints[id];
  }
  saveJson(SK_ENDPOINTS, endpoints);
}

export async function checkProviderHealth(id: string): Promise<AIProviderStatus> {
  const provider = providerRouter.getProvider(id);
  if (!provider) {
    return {
      available: false,
      healthy: false,
      reason: `Unknown provider: ${id}`,
      lastCheckedAt: Date.now(),
    };
  }
  return provider.healthCheck();
}

export function getProviderSummaries(): ProviderSummary[] {
  const enabledState = loadJson<Record<string, boolean>>(SK_ENABLED, { ...DEFAULT_ENABLED });
  const endpoints    = loadJson<Record<string, string>>(SK_ENDPOINTS, {});
  const keys         = loadJson<Record<string, string>>(SK_KEYS, {});
  const preferred    = providerRouter.getPreferredProviderId();

  const configs: Array<{
    id: string; name: string; isLocal: boolean; isCloud: boolean;
    requiresKey: boolean; requiresEndpoint: boolean; defaultEndpoint?: string;
  }> = [
    { id: "local",     name: "Zara Local Runtime",  isLocal: true,  isCloud: false, requiresKey: false, requiresEndpoint: false },
    { id: "ollama",    name: "Ollama",               isLocal: true,  isCloud: false, requiresKey: false, requiresEndpoint: true,  defaultEndpoint: "http://localhost:11434" },
    { id: "llamacpp",  name: "llama.cpp Server",     isLocal: true,  isCloud: false, requiresKey: false, requiresEndpoint: true,  defaultEndpoint: "http://localhost:8080"  },
    { id: "openai",    name: "OpenAI",               isLocal: false, isCloud: true,  requiresKey: true,  requiresEndpoint: false },
    { id: "anthropic", name: "Anthropic",            isLocal: false, isCloud: true,  requiresKey: true,  requiresEndpoint: false },
    { id: "gemini",    name: "Google Gemini",        isLocal: false, isCloud: true,  requiresKey: true,  requiresEndpoint: false },
  ];

  return configs.map((c) => ({
    ...c,
    isEnabled:       enabledState[c.id] ?? DEFAULT_ENABLED[c.id] ?? false,
    isPreferred:     preferred === c.id,
    currentEndpoint: endpoints[c.id],
    hasApiKey:       Boolean(keys[c.id]),
  }));
}

export function getProvider(id: string): AIProviderAdapter | undefined {
  return providerRouter.getProvider(id);
}

// ── Cloud AI gate ─────────────────────────────────────────
// Must be called whenever the cloud_ai permission changes so
// the router knows whether cloud providers are allowed.
// Called by ZaraRuntime.requestPermission / revokePermission.

export function setCloudAIAllowed(allowed: boolean): void {
  providerRouter.setCloudAIEnabled(allowed);
}

// ── Auto-initialization ───────────────────────────────────────
// Providers are initialized synchronously the moment this module is
// imported. This guarantees they are registered before any React
// component's useEffect runs a health check.
// initializeProviders() is idempotent — safe to call multiple times.
if (typeof window !== "undefined") {
  initializeProviders();
}
