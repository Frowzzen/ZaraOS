// ============================================================
// ZaraOS Provider Router
//
// Selects which AI provider handles a given request.
// Strategy: local-first, with graceful degradation.
//
// Priority order (default):
//   1. Ollama (if running and reachable)
//   2. llama.cpp (if running and reachable)
//   3. Local simulated provider (always available)
//   4. Cloud providers (only if user has enabled cloud AI)
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
  private strategy: RoutingStrategy = "local_first";
  private cloudAIEnabled = false;
  private preferredProviderId: string | null = null;

  register(provider: AIProviderAdapter): void {
    this.providers.push(provider);
  }

  setStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy;
  }

  setCloudAIEnabled(enabled: boolean): void {
    this.cloudAIEnabled = enabled;
  }

  setPreferredProvider(id: string | null): void {
    this.preferredProviderId = id;
  }

  async route(requiresOffline = false): Promise<RoutingDecision> {
    // Explicit provider override.
    if (this.preferredProviderId) {
      const explicit = this.providers.find(
        (p) => p.id === this.preferredProviderId && p.isEnabled
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
        (p) => p.supportsOffline() && p.isEnabled
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
      // Try local providers in priority order.
      const localOrder = ["ollama", "llamacpp", "local"];
      for (const id of localOrder) {
        const p = this.providers.find((p) => p.id === id && p.isEnabled);
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

      // Fall through to cloud if enabled.
      if (this.cloudAIEnabled) {
        const cloudOrder = ["openai", "anthropic", "gemini"];
        for (const id of cloudOrder) {
          const p = this.providers.find((p) => p.id === id && p.isEnabled);
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

    // Guaranteed fallback: local simulated provider.
    const fallback = this.providers.find((p) => p.id === "local")!;
    return {
      provider: fallback,
      reason: "Default fallback: local simulated runtime",
      isSimulated: true,
      isCloud: false,
    };
  }

  getRegisteredProviders(): AIProviderAdapter[] {
    return [...this.providers];
  }

  getEnabledProviders(): AIProviderAdapter[] {
    return this.providers.filter((p) => p.isEnabled);
  }
}

export const providerRouter = new ProviderRouter();
