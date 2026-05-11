// ============================================================
// ZaraOS Provider Router
//
// Selects which AI provider handles a given request.
// Strategy: local-first, with graceful degradation.
//
// Priority order (default):
//   1. Ollama (if user-enabled AND running/reachable)
//   2. llama.cpp (if user-enabled AND running/reachable)
//   3. Local simulated provider (always available)
//   4. Cloud providers (only if user has enabled cloud AI + has API key)
//
// ── Health Check Caching ──────────────────────────────────
//
// Without caching, route() calls provider.healthCheck() on
// EVERY message dispatch. Ollama and llama.cpp health checks
// have network timeouts (2–3 s) that fire on every request
// when those servers aren't running — creating a 3+ second
// penalty before every AI response.
//
// Cache policy:
//   available=true  → cache for CACHE_TTL_OK_MS   (60 s)
//   available=false → cache for CACHE_TTL_FAIL_MS (20 s)
//
// Rationale:
//   - Positive cache (60 s): re-validates running providers once
//     per minute; harmless because provider adapters degrade
//     gracefully on mid-session failure (e.g. Ollama crash).
//   - Negative cache (20 s): allows the router to quickly detect
//     when a local server starts without hammering it every call.
//
// Cache bypass:
//   Call invalidateHealthCache(id) before running an explicit
//   "Test" health check in the UI so the result is always fresh.
//   The next route() call will re-populate the cache.
//
// Enabled state is tracked in a mutable Set so user toggles in
// the AI Provider settings take effect immediately without
// needing to reconstruct provider instances.
// ============================================================

import type { AIProviderAdapter, AIProviderStatus } from "../providers/provider-adapter";

export type RoutingStrategy = "local_first" | "cloud_first" | "explicit";

export interface RoutingDecision {
  provider: AIProviderAdapter;
  reason: string;
  isSimulated: boolean;
  isCloud: boolean;
}

// ── Cache entry ───────────────────────────────────────────

interface CacheEntry {
  status: AIProviderStatus;
  expiresAt: number;
}

const CACHE_TTL_OK_MS   = 60_000; // 60 s — healthy providers
const CACHE_TTL_FAIL_MS = 20_000; // 20 s — unreachable providers

export class ProviderRouter {
  private providers: AIProviderAdapter[] = [];
  private enabledSet: Set<string> = new Set();
  private strategy: RoutingStrategy = "local_first";
  private cloudAIEnabled = false;
  private preferredProviderId: string | null = null;

  // ── Health Cache ──────────────────────────────────────────

  private healthCache = new Map<string, CacheEntry>();

  /**
   * Returns the cached health status for a provider, or runs a
   * live healthCheck() and caches the result if the cache is
   * missing or expired.
   */
  private async cachedHealthCheck(provider: AIProviderAdapter): Promise<AIProviderStatus> {
    const cached = this.healthCache.get(provider.id);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.status;
    }

    const status  = await provider.healthCheck();
    const ttl     = status.available ? CACHE_TTL_OK_MS : CACHE_TTL_FAIL_MS;
    this.healthCache.set(provider.id, { status, expiresAt: Date.now() + ttl });
    return status;
  }

  /**
   * Evict one or all cache entries.
   * Call before an explicit UI "Test" action so the result is fresh.
   */
  invalidateHealthCache(id?: string): void {
    if (id !== undefined) {
      this.healthCache.delete(id);
    } else {
      this.healthCache.clear();
    }
  }

  /**
   * Peek at the cached status without triggering a live check.
   * Returns undefined if no cache entry exists or it has expired.
   */
  getCachedStatus(id: string): AIProviderStatus | undefined {
    const entry = this.healthCache.get(id);
    if (!entry || Date.now() >= entry.expiresAt) return undefined;
    return entry.status;
  }

  // ── Registration ─────────────────────────────────────────

  register(provider: AIProviderAdapter, enabled?: boolean): void {
    this.providers = this.providers.filter((p) => p.id !== provider.id);
    this.providers.push(provider);
    const shouldEnable = enabled ?? provider.isEnabled;
    if (shouldEnable) {
      this.enabledSet.add(provider.id);
    } else {
      this.enabledSet.delete(provider.id);
    }
    // Evict stale cache when a provider is (re-)registered.
    this.healthCache.delete(provider.id);
  }

  // ── Enabled State ─────────────────────────────────────────

  setProviderEnabled(id: string, enabled: boolean): void {
    if (enabled) this.enabledSet.add(id);
    else this.enabledSet.delete(id);
  }

  isProviderEnabled(id: string): boolean {
    return this.enabledSet.has(id);
  }

  // ── Routing Config ────────────────────────────────────────

  setStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy;
  }

  setCloudAIEnabled(enabled: boolean): void {
    this.cloudAIEnabled = enabled;
  }

  setPreferredProvider(id: string | null): void {
    this.preferredProviderId = id;
  }

  getPreferredProviderId(): string | null {
    return this.preferredProviderId;
  }

  // ── Route Selection ───────────────────────────────────────
  // All healthCheck() calls go through cachedHealthCheck() so
  // we never pay a network timeout on every message dispatch.

  async route(requiresOffline = false): Promise<RoutingDecision> {
    // Explicit provider override.
    if (this.preferredProviderId) {
      const explicit = this.providers.find(
        (p) => p.id === this.preferredProviderId && this.enabledSet.has(p.id)
      );
      if (explicit) {
        const status = await this.cachedHealthCheck(explicit);
        if (status.available) {
          return {
            provider:    explicit,
            reason:      `User-selected provider: ${explicit.name}`,
            isSimulated: explicit.id === "local",
            isCloud:     explicit.isCloud,
          };
        }
        // Preferred provider is down — clear its cache and fall through.
        this.healthCache.delete(explicit.id);
      }
    }

    // Offline-only mode — skip cloud providers.
    if (requiresOffline) {
      const localProviders = this.providers.filter(
        (p) => p.supportsOffline() && this.enabledSet.has(p.id)
      );
      for (const p of localProviders) {
        const status = await this.cachedHealthCheck(p);
        if (status.available) {
          return {
            provider:    p,
            reason:      `Offline mode: using ${p.name}`,
            isSimulated: p.id === "local",
            isCloud:     false,
          };
        }
      }
    }

    if (this.strategy === "local_first") {
      const localOrder = ["ollama", "llamacpp", "local"];
      for (const id of localOrder) {
        const p = this.providers.find((p) => p.id === id && this.enabledSet.has(p.id));
        if (!p) continue;
        const status = await this.cachedHealthCheck(p);
        if (status.available) {
          return {
            provider:    p,
            reason:      `Local-first: ${p.name} is available`,
            isSimulated: id === "local",
            isCloud:     false,
          };
        }
      }

      if (this.cloudAIEnabled) {
        const cloudOrder = ["openai", "anthropic", "gemini"];
        for (const id of cloudOrder) {
          const p = this.providers.find((p) => p.id === id && this.enabledSet.has(p.id));
          if (!p) continue;
          const status = await this.cachedHealthCheck(p);
          if (status.available) {
            return {
              provider:    p,
              reason:      `Cloud fallback (local unavailable): ${p.name}`,
              isSimulated: false,
              isCloud:     true,
            };
          }
        }
      }
    }

    // Guaranteed fallback: local simulated provider is always registered.
    const fallback = this.providers.find((p) => p.id === "local");
    if (!fallback) {
      throw new Error("No providers registered. Call initializeProviders() first.");
    }
    return {
      provider:    fallback,
      reason:      "Default fallback: local simulated runtime",
      isSimulated: true,
      isCloud:     false,
    };
  }

  // ── Inspection ────────────────────────────────────────────

  getRegisteredProviders(): AIProviderAdapter[] {
    return [...this.providers];
  }

  getEnabledProviders(): AIProviderAdapter[] {
    return this.providers.filter((p) => this.enabledSet.has(p.id));
  }

  getProvider(id: string): AIProviderAdapter | undefined {
    return this.providers.find((p) => p.id === id);
  }
}

export const providerRouter = new ProviderRouter();
