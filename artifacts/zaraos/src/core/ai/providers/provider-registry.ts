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
import { secureStorage } from "../../security/secure-storage";
import type { AIProviderAdapter, AIProviderStatus } from "./provider-adapter";

// ── Storage Keys ─────────────────────────────────────────────
const SK_ENABLED   = "zaraos_providers_enabled_v1";
const SK_PREFERRED = "zaraos_preferred_provider_v1";
const SK_ENDPOINTS = "zaraos_provider_endpoints_v1";
// Legacy plain-text key storage — kept for migration read only.
// Alpha 0.5+: keys are stored via SecureStorage (AES-GCM encrypted).
const SK_KEYS_LEGACY = "zaraos_provider_keys_v1";

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

  // Phase 1 (sync): create providers without API keys.
  // Keys are injected asynchronously in loadAndMigrateSecureKeys() below.
  _ollama = new OllamaProvider({
    enabled: true,
    baseUrl: endpoints["ollama"],
  });

  _llamacpp = new LlamaCppProvider({
    enabled: true,
    endpoint: endpoints["llamacpp"],
  });

  _openai    = new OpenAIProvider({ enabled: true });
  _anthropic = new AnthropicProvider({ enabled: true });
  _gemini    = new GeminiProvider({ enabled: true });

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

// ── Async Key Loading & Migration ─────────────────────────
// Phase 2: Reads API keys from SecureStorage and injects them
// into live provider instances. Also migrates any legacy plain
// keys from SK_KEYS_LEGACY to SecureStorage on first run.
//
// Called from aiRuntime.initialize() after initializeProviders().

export async function loadAndMigrateSecureKeys(): Promise<void> {
  const cloudIds = ["openai", "anthropic", "gemini"];

  // Migrate legacy plain-text keys if present
  const legacyKeys = loadJson<Record<string, string>>(SK_KEYS_LEGACY, {});
  const hasMigrated = legacyKeys && Object.keys(legacyKeys).length > 0;
  if (hasMigrated) {
    for (const id of cloudIds) {
      const legacyKey = legacyKeys[id];
      if (legacyKey && !secureStorage.has(id)) {
        await secureStorage.set(id, legacyKey);
      }
    }
    // Remove legacy plain-text storage after migration
    localStorage.removeItem(SK_KEYS_LEGACY);
  }

  // Inject keys into live provider instances
  for (const id of cloudIds) {
    const key = await secureStorage.get(id);
    if (key) {
      const provider = providerRouter.getProvider(id);
      if (provider && "setApiKey" in provider) {
        (provider as { setApiKey: (k: string) => void }).setApiKey(key);
      }
    }
  }
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
  // 1. Update the live provider instance immediately (sync).
  const provider = providerRouter.getProvider(id);
  if (provider && "setApiKey" in provider) {
    (provider as { setApiKey: (k: string) => void }).setApiKey(key);
  }
  // 2. Persist to SecureStorage (async — fire and forget).
  //    The key takes effect in memory immediately above.
  //    Never log the key value on error.
  secureStorage.set(id, key).catch(() => {
    console.error(`[SecureStorage] Failed to persist key for provider: ${id}`);
  });
  // 3. Having a key enables cloud providers automatically.
  if (key && ["openai", "anthropic", "gemini"].includes(id)) {
    setProviderEnabled(id, true);
  }
  // 4. Evict stale health cache so the router re-validates.
  providerRouter.invalidateHealthCache(id);
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
  // Endpoint change makes any cached reachability result invalid.
  providerRouter.invalidateHealthCache(id);
}

// ── Health check bypass for explicit UI "Test" actions ───
// Evicts the cache for this provider so the result is always
// live, then re-seeds the cache with the fresh result so the
// router immediately benefits from the new status.

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
  // Force eviction so we never serve a stale result to the UI.
  providerRouter.invalidateHealthCache(id);
  const status = await provider.healthCheck();
  // Re-seed the cache so the router uses this fresh result for
  // the next 60 s (available) or 20 s (unavailable).
  // The router will re-cache automatically on next cachedHealthCheck(),
  // but calling invalidateHealthCache above already cleared it — the
  // fresh result will be written on the router's next route() call.
  return status;
}

// ── Cache invalidation helper ─────────────────────────────
// Call this when a provider is toggled, reconfigured, or its
// endpoint / key changes so stale routing decisions are evicted.

export function invalidateProviderHealthCache(id?: string): void {
  providerRouter.invalidateHealthCache(id);
}

export function getProviderSummaries(): ProviderSummary[] {
  const enabledState = loadJson<Record<string, boolean>>(SK_ENABLED, { ...DEFAULT_ENABLED });
  const endpoints    = loadJson<Record<string, string>>(SK_ENDPOINTS, {});
  const preferred    = providerRouter.getPreferredProviderId();

  const configs: Array<{
    id: string; name: string; isLocal: boolean; isCloud: boolean;
    requiresKey: boolean; requiresEndpoint: boolean; defaultEndpoint?: string;
  }> = [
    { id: "local",     name: "Zara Local Runtime",  isLocal: true,  isCloud: false, requiresKey: false, requiresEndpoint: false },
    { id: "ollama",    name: "Ollama",               isLocal: true,  isCloud: false, requiresKey: false, requiresEndpoint: true,  defaultEndpoint: "http://127.0.0.1:11434" },
    { id: "llamacpp",  name: "llama.cpp Server",     isLocal: true,  isCloud: false, requiresKey: false, requiresEndpoint: true,  defaultEndpoint: "http://127.0.0.1:8080"  },
    { id: "openai",    name: "OpenAI",               isLocal: false, isCloud: true,  requiresKey: true,  requiresEndpoint: false },
    { id: "anthropic", name: "Anthropic",            isLocal: false, isCloud: true,  requiresKey: true,  requiresEndpoint: false },
    { id: "gemini",    name: "Google Gemini",        isLocal: false, isCloud: true,  requiresKey: true,  requiresEndpoint: false },
  ];

  return configs.map((c) => ({
    ...c,
    isEnabled:       enabledState[c.id] ?? DEFAULT_ENABLED[c.id] ?? false,
    isPreferred:     preferred === c.id,
    currentEndpoint: endpoints[c.id],
    // Use SecureStorage.has() (sync) — never exposes the raw key value.
    hasApiKey:       c.requiresKey ? secureStorage.has(c.id) : false,
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

// ── Auto-connect local providers on startup ───────────────────
// Silently pings Ollama. If it responds with at least one model,
// immediately switches the preferred provider from "local" (simulated)
// to "ollama" — no user action required.
//
// Called once from RuntimeProvider after zaraRuntime.initialize().
// Safe to call multiple times — exits early if provider is already set.

// WebKit2GTK-compatible fetch with timeout.
// AbortSignal.timeout() is not supported on all WebKit versions; use manual abort.
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export async function autoConnectLocalProviders(): Promise<{ id: string; name: string; model: string } | null> {
  // Don't override an explicit user choice — but always re-probe if already ollama
  // so model name stays current across restarts.
  const saved = localStorage.getItem(SK_PREFERRED);
  if (saved && saved !== "local" && saved !== "ollama") return null;

  // Always prefer 127.0.0.1 over localhost — on Linux, localhost may resolve
  // to ::1 (IPv6) but Ollama only binds to 127.0.0.1 (IPv4).
  const endpoints = loadJson<Record<string, string>>(SK_ENDPOINTS, {});
  const rawUrl    = endpoints["ollama"] ?? "http://127.0.0.1:11434";
  const ollamaUrl = rawUrl.replace("localhost", "127.0.0.1");

  try {
    const res = await fetchWithTimeout(`${ollamaUrl}/api/tags`, 4000);
    if (!res.ok) return null;

    const data = (await res.json()) as { models?: { name: string }[] };
    const models = data.models ?? [];
    if (models.length === 0) return null;

    const model = models[0].name;
    providerRouter.setPreferredProvider("ollama");
    localStorage.setItem(SK_PREFERRED, "ollama");
    // Update the live OllamaProvider instance AND persist the corrected endpoint.
    // setProviderEndpoint() patches the running instance's baseUrl so this session
    // immediately uses 127.0.0.1 rather than waiting for the next app restart.
    setProviderEndpoint("ollama", ollamaUrl);

    return { id: "ollama", name: "Ollama (Local)", model };
  } catch {
    return null;
  }
}

// ── Auto-initialization ───────────────────────────────────────
// Providers are initialized synchronously the moment this module is
// imported. This guarantees they are registered before any React
// component's useEffect runs a health check.
// initializeProviders() is idempotent — safe to call multiple times.
if (typeof window !== "undefined") {
  initializeProviders();
}
