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
// Enabled state is tracked in a mutable Set so user toggles in
// the AI Provider settings take effect immediately without
// needing to reconstruct provider instances.
// ============================================================

import type { AIProviderAdapter } from "../providers/provider-adapter";

export type RoutingStrategy = "local_first" | "cloud_first" | "explicit";

export interface RoutingDecision {
  provider: AIProviderAdapter;
  reason: string;
  isSimulated: boolean;
  isCloud: boolean;
}

export class ProviderRouter {
  private providers: AIProviderAdapter[] = [];
  private enabledSet: Set<string> = new Set();
  private strategy: RoutingStrategy = "local_first";
  private cloudAIEnabled = false;
  private preferredProviderId: string | null = null;

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

  async route(requiresOffline = false): Promise<RoutingDecision> {
    // Explicit provider override.
    if (this.preferredProviderId) {
      const explicit = this.providers.find(
        (p) => p.id === this.preferredProviderId && this.enabledSet.has(p.id)
      );
      if (explicit) {
        const status = await explicit.healthCheck();
        if (status.available) {
          return {
            provider: explicit,
            reason: `User-selected provider: ${explicit.name}`,
            isSimulated: explicit.id === "local",
            isCloud: explicit.isCloud,
          };
        }
      }
    }

    // Offline-only mode — skip cloud providers.
    if (requiresOffline) {
      const localProviders = this.providers.filter(
        (p) => p.supportsOffline() && this.enabledSet.has(p.id)
      );
      for (const p of localProviders) {
        const status = await p.healthCheck();
        if (status.available) {
          return {
            provider: p,
            reason: `Offline mode: using ${p.name}`,
            isSimulated: p.id === "local",
            isCloud: false,
          };
        }
      }
    }

    if (this.strategy === "local_first") {
      const localOrder = ["ollama", "llamacpp", "local"];
      for (const id of localOrder) {
        const p = this.providers.find((p) => p.id === id && this.enabledSet.has(p.id));
        if (!p) continue;
        const status = await p.healthCheck();
        if (status.available) {
          return {
            provider: p,
            reason: `Local-first: ${p.name} is available`,
            isSimulated: id === "local",
            isCloud: false,
          };
        }
      }

      if (this.cloudAIEnabled) {
        const cloudOrder = ["openai", "anthropic", "gemini"];
        for (const id of cloudOrder) {
          const p = this.providers.find((p) => p.id === id && this.enabledSet.has(p.id));
          if (!p) continue;
          const status = await p.healthCheck();
          if (status.available) {
            return {
              provider: p,
              reason: `Cloud fallback (local unavailable): ${p.name}`,
              isSimulated: false,
              isCloud: true,
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
      provider: fallback,
      reason: "Default fallback: local simulated runtime",
      isSimulated: true,
      isCloud: false,
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
