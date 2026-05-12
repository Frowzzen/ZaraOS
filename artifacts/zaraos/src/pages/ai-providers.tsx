// ============================================================
// AI Provider Manager — Alpha 0.5
//
// Fully functional provider management:
//   - AES-GCM encrypted API key storage (secureStorage)
//   - Live health checks for Ollama and llama.cpp
//   - Ollama Model Manager — fetch/inspect installed models
//   - Cloud safety warnings (explicit data-leaves-device notice)
//   - Switches that wire through to the routing layer
//   - Custom endpoint URLs for local providers
//   - Real-time provider status badges
//   - Preferred provider selection
// ============================================================

import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AIRuntimeStatus } from "@/components/ai-runtime-status";
import { useRuntime } from "@/core/runtime-context";
import { useState, useEffect, useCallback } from "react";
import type { ProviderSummary } from "@/core/ai/providers/provider-registry";
import type { AIProviderStatus } from "@/core/ai/providers/provider-adapter";
import {
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Server,
  Cloud,
  Lock,
  ShieldOff,
  AlertTriangle,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  Brain,
  Package,
  HardDrive,
} from "lucide-react";

type HealthMap = Record<string, AIProviderStatus | "checking" | null>;

interface OllamaModel {
  name: string;
  size: number;
  modified_at?: string;
  digest?: string;
}

function StatusBadge({ id, health }: { id: string; health: AIProviderStatus | "checking" | null }) {
  if (id === "local") {
    return (
      <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
        <CheckCircle2 className="w-2.5 h-2.5" />
        ACTIVE
      </span>
    );
  }
  if (health === "checking") {
    return (
      <span className="text-[9px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        CHECKING
      </span>
    );
  }
  if (health === null) return null;
  if ((health as AIProviderStatus).available) {
    return (
      <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
        <CheckCircle2 className="w-2.5 h-2.5" />
        CONNECTED
      </span>
    );
  }
  return (
    <span className="text-[9px] font-mono text-red-400/80 bg-red-500/8 px-1.5 py-0.5 rounded border border-red-500/15 flex items-center gap-1">
      <XCircle className="w-2.5 h-2.5" />
      NOT RUNNING
    </span>
  );
}

function formatModelSize(bytes: number): string {
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

export default function AIProviders() {
  const {
    clearAIConversation,
    getAIMemoryStats,
    aiRuntimeStatus,
    enableAIProvider,
    setPreferredAIProvider,
    setAIProviderApiKey,
    setAIProviderEndpoint,
    checkAIProviderHealth,
    getAIProviderSummaries,
    getPreferredAIProviderId,
  } = useRuntime();

  const [summaries, setSummaries] = useState<ProviderSummary[]>(() => getAIProviderSummaries());
  const [health, setHealth] = useState<HealthMap>({});
  const [preferredId, setPreferredId] = useState<string | null>(() => getPreferredAIProviderId());
  const [endpoints, setEndpoints] = useState<Record<string, string>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [memoryStats, setMemoryStats] = useState(() => {
    try { return getAIMemoryStats(); } catch { return null; }
  });

  // Ollama model manager state
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaModelsFetching, setOllamaModelsFetching] = useState(false);
  const [ollamaModelsError, setOllamaModelsError] = useState<string | null>(null);
  const [activeOllamaModel, setActiveOllamaModel] = useState<string | null>(null);

  const runHealthChecks = useCallback(async (ids: string[]) => {
    setHealth((prev) => {
      const next = { ...prev };
      ids.forEach((id) => { next[id] = "checking"; });
      return next;
    });
    const results = await Promise.all(
      ids.map(async (id) => ({ id, status: await checkAIProviderHealth(id) }))
    );
    setHealth((prev) => {
      const next = { ...prev };
      results.forEach(({ id, status }) => { next[id] = status; });
      return next;
    });
    // After Ollama health check, update the active model display
    const ollamaResult = results.find((r) => r.id === "ollama");
    if (ollamaResult && (ollamaResult.status as AIProviderStatus).activeModel) {
      setActiveOllamaModel((ollamaResult.status as AIProviderStatus).activeModel ?? null);
    }
  }, [checkAIProviderHealth]);

  const fetchOllamaModels = useCallback(async (baseUrl = "http://127.0.0.1:11434") => {
    setOllamaModelsFetching(true);
    setOllamaModelsError(null);
    try {
      const res = await fetch(`${baseUrl}/api/tags`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { models?: OllamaModel[] };
      setOllamaModels(data.models ?? []);
    } catch (err) {
      setOllamaModelsError("Cannot connect to Ollama. Make sure 'ollama serve' is running.");
      setOllamaModels([]);
    } finally {
      setOllamaModelsFetching(false);
    }
  }, []);

  useEffect(() => {
    runHealthChecks(["ollama", "llamacpp"]);
    fetchOllamaModels();
  }, [runHealthChecks, fetchOllamaModels]);

  const refreshSummaries = () => setSummaries(getAIProviderSummaries());

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    if (id === "local") return;
    enableAIProvider(id, enabled);
    refreshSummaries();
  };

  const handleSetPreferred = (id: string) => {
    const newPref = preferredId === id ? null : id;
    setPreferredAIProvider(newPref as Parameters<typeof setPreferredAIProvider>[0]);
    setPreferredId(newPref);
    refreshSummaries();
  };

  const handleSaveEndpoint = (id: string) => {
    const url = endpoints[id];
    if (url) {
      setAIProviderEndpoint(id, url);
      runHealthChecks([id]);
      if (id === "ollama") fetchOllamaModels(url);
    }
  };

  const handleSaveApiKey = (id: string) => {
    const key = apiKeys[id];
    if (key !== undefined) {
      setAIProviderApiKey(id, key);
      refreshSummaries();
      // Clear the input — key is now encrypted in storage
      setApiKeys((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const handleDeleteApiKey = (id: string) => {
    setAIProviderApiKey(id, "");
    refreshSummaries();
  };

  const handleClearMemory = () => {
    clearAIConversation();
    try { setMemoryStats(getAIMemoryStats()); } catch { setMemoryStats(null); }
  };

  const getDescription = (id: string) => {
    const map: Record<string, string> = {
      local:     "Built-in simulated intelligence. Always available. No install required.",
      ollama:    "Run open-source models (Llama 3, Mistral, Phi-3) locally. Install Ollama and run 'ollama serve' to enable real inference.",
      llamacpp:  "OpenAI-compatible local server. Maximum quantization control. Run: './llama-server -m model.gguf --port 8080'",
      openai:    "GPT-4o and GPT-4o-mini. Cloud provider — inference happens on OpenAI servers. Your data leaves your device.",
      anthropic: "Claude 3.5 Sonnet and Haiku. Cloud provider — inference happens on Anthropic servers. Your data leaves your device.",
      gemini:    "Gemini 1.5 Pro and Flash. Cloud provider — inference happens on Google servers. Your data leaves your device.",
    };
    return map[id] ?? "";
  };

  const getKeyPlaceholder = (id: string) => {
    const map: Record<string, string> = {
      openai:    "sk-...",
      anthropic: "sk-ant-...",
      gemini:    "AIza...",
    };
    return map[id] ?? "API key...";
  };

  const ollamaHealth = health["ollama"] ?? null;
  const ollamaIsRunning =
    ollamaHealth !== null &&
    ollamaHealth !== "checking" &&
    (ollamaHealth as AIProviderStatus).available === true;

  const ollamaEndpoint = endpoints["ollama"] ?? summaries.find((s) => s.id === "ollama")?.currentEndpoint ?? "http://127.0.0.1:11434";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* ── Header ── */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Cpu className="w-10 h-10 text-primary" />
            AI Provider Management
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            Configure where Zara's intelligence runs. Local-first, always.
          </p>
        </div>

        {/* ── AI Runtime Status Widget ── */}
        <AIRuntimeStatus />

        {/* ── Active provider callout ── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
          <Cpu className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-primary/70 font-mono leading-relaxed">
            Currently routing to: <span className="text-primary font-semibold">{aiRuntimeStatus.providerName}</span>
            {" — "}{aiRuntimeStatus.modelId}
            {aiRuntimeStatus.isSimulated && " (simulated)"}
            {!aiRuntimeStatus.isSimulated && " (real inference)"}
          </p>
        </div>

        {/* ── Philosophy Note ── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/15">
          <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-300/70 font-mono leading-relaxed">
            Local-first by design. Cloud providers require your own API key — ZaraOS never pays for inference. In Alpha 0.5, API keys are encrypted with AES-GCM (Web Crypto) before being stored locally. Keys are never transmitted to ZaraOS or any third party beyond the chosen AI provider.
          </p>
        </div>

        {/* ── Provider Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {summaries.map((p) => {
            const isCloud = p.isCloud;
            const isPreferred = preferredId === p.id;
            const providerHealth = health[p.id] ?? null;
            const isRunning = providerHealth !== null && providerHealth !== "checking" && (providerHealth as AIProviderStatus).available;

            return (
              <Card
                key={p.id}
                className={`bg-card/40 border-white/5 backdrop-blur transition-all duration-200 ${
                  isPreferred
                    ? "border-primary/40 shadow-[0_0_24px_rgba(0,240,255,0.08)]"
                    : aiRuntimeStatus.providerId === p.id
                    ? "border-green-500/30 shadow-[0_0_16px_rgba(34,197,94,0.06)]"
                    : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                      {aiRuntimeStatus.providerId === p.id && (
                        <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                          IN USE
                        </span>
                      )}
                      {isPreferred && aiRuntimeStatus.providerId !== p.id && (
                        <span className="text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 flex items-center gap-0.5">
                          <Star className="w-2 h-2" />
                          PREFERRED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                      <StatusBadge id={p.id} health={providerHealth} />
                      {p.isLocal ? (
                        <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
                          <Server className="w-2.5 h-2.5" />
                          LOCAL
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                          <Cloud className="w-2.5 h-2.5" />
                          CLOUD
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {getDescription(p.id)}
                  </p>
                </CardHeader>

                <CardContent className="pb-3 flex flex-col gap-3">
                  {/* Endpoint URL for local providers */}
                  {p.requiresEndpoint && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                        Endpoint URL
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={endpoints[p.id] ?? p.currentEndpoint ?? p.defaultEndpoint ?? ""}
                          onChange={(e) => setEndpoints((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder={p.defaultEndpoint}
                          className="bg-black/50 border-white/10 text-sm h-9 font-mono flex-1"
                          data-testid={`input-endpoint-${p.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 border-white/10 text-xs"
                          onClick={() => handleSaveEndpoint(p.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* API key for cloud providers — AES-GCM encrypted */}
                  {p.requiresKey && (
                    <div className="flex flex-col gap-1.5">
                      {/* Cloud data-leaves-device warning */}
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 mb-1">
                        <ShieldOff className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-mono text-amber-300/70 leading-relaxed">
                            Cloud provider — your prompts and conversation history will leave your device and be processed on {p.name} servers. Enable "Cloud AI" in Privacy settings first.
                          </p>
                          <p className="text-[9px] font-mono text-amber-300/40 mt-0.5">
                            ZaraOS is a prototype. For sensitive conversations, use Ollama (local-only).
                          </p>
                        </div>
                      </div>

                      <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        API Key — AES-GCM encrypted, local only
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder={p.hasApiKey ? "Key saved — enter new key to replace" : getKeyPlaceholder(p.id)}
                          value={apiKeys[p.id] ?? ""}
                          onChange={(e) => setApiKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          className="bg-black/50 border-white/10 text-sm h-9 font-mono flex-1"
                          data-testid={`input-key-${p.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 border-white/10 text-xs"
                          onClick={() => handleSaveApiKey(p.id)}
                          disabled={!apiKeys[p.id]}
                        >
                          Save
                        </Button>
                        {p.hasApiKey && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 px-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteApiKey(p.id)}
                            title="Remove saved key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      {p.hasApiKey && (
                        <p className="text-[10px] text-green-400/60 font-mono flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Key saved and encrypted with AES-GCM.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Local provider status note */}
                  {p.id === "local" && (
                    <p className="text-xs text-muted-foreground/60 font-mono">
                      Default fallback runtime. Always available. No external dependencies.
                    </p>
                  )}

                  {/* Health check detail */}
                  {providerHealth && providerHealth !== "checking" && (
                    <p className={`text-[10px] font-mono ${(providerHealth as AIProviderStatus).available ? "text-green-400/60" : "text-red-400/50"}`}>
                      {(providerHealth as AIProviderStatus).reason}
                      {(providerHealth as AIProviderStatus).activeModel && ` — ${(providerHealth as AIProviderStatus).activeModel}`}
                    </p>
                  )}

                  {/* Cloud permission warning */}
                  {isCloud && !p.hasApiKey && (
                    <div className="flex items-start gap-1.5 text-[11px] font-mono text-muted-foreground/40">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>Add an API key above to enable this provider.</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3 border-t border-white/5 flex justify-between items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {p.requiresEndpoint && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-primary px-2 gap-1"
                        onClick={() => runHealthChecks([p.id])}
                        data-testid={`button-test-${p.id}`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Test
                      </Button>
                    )}
                    {p.id !== "local" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 text-xs px-2 gap-1 ${
                          isPreferred
                            ? "text-primary hover:text-muted-foreground"
                            : "text-muted-foreground hover:text-primary"
                        }`}
                        onClick={() => handleSetPreferred(p.id)}
                        disabled={isCloud && !p.hasApiKey}
                        data-testid={`button-prefer-${p.id}`}
                        title={isPreferred ? "Remove as preferred" : "Set as preferred provider"}
                      >
                        <Star className={`w-3 h-3 ${isPreferred ? "fill-primary" : ""}`} />
                        {isPreferred ? "Preferred" : "Set preferred"}
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {p.id === "local"
                        ? "Always on"
                        : p.isEnabled
                        ? isRunning ? "Running" : "Enabled"
                        : "Disabled"}
                    </span>
                    <Switch
                      checked={p.id === "local" ? true : p.isEnabled}
                      onCheckedChange={(checked) => handleToggleEnabled(p.id, checked)}
                      disabled={p.id === "local"}
                      data-testid={`switch-provider-${p.id}`}
                    />
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* ── Ollama Model Manager ── */}
        <Card className="bg-card/40 border-white/5 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Ollama Model Manager
              </CardTitle>
              <div className="flex items-center gap-2">
                {ollamaIsRunning ? (
                  <span className="text-[9px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    OLLAMA RUNNING
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-red-400/70 bg-red-500/8 px-2 py-0.5 rounded border border-red-500/15 flex items-center gap-1">
                    <XCircle className="w-2.5 h-2.5" />
                    OLLAMA NOT RUNNING
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-primary px-2 gap-1"
                  onClick={() => {
                    runHealthChecks(["ollama"]);
                    fetchOllamaModels(ollamaEndpoint);
                  }}
                  data-testid="button-refresh-ollama"
                >
                  <RefreshCw className={`w-3 h-3 ${ollamaModelsFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Current active model */}
            {activeOllamaModel && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
                <Brain className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-mono text-primary/70">Active model:</span>
                <span className="text-xs font-mono text-primary font-semibold">{activeOllamaModel}</span>
              </div>
            )}

            {/* Model list */}
            {ollamaModelsError ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-mono text-red-400/70">{ollamaModelsError}</p>
              </div>
            ) : ollamaModelsFetching ? (
              <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-mono">Fetching installed models...</span>
              </div>
            ) : ollamaModels.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground/50 py-4 text-center">
                No models found. Pull a model first: <code className="text-green-400/70">ollama pull llama3.2</code>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                    {ollamaModels.length} model{ollamaModels.length !== 1 ? "s" : ""} installed
                  </span>
                </div>
                {ollamaModels.map((model) => (
                  <div
                    key={model.name}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                      model.name === activeOllamaModel || model.name === (ollamaHealth as AIProviderStatus | null)?.activeModel
                        ? "bg-primary/5 border-primary/20"
                        : "bg-black/30 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Brain className={`w-3.5 h-3.5 flex-shrink-0 ${
                        model.name === activeOllamaModel ? "text-primary" : "text-muted-foreground/40"
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm text-white font-mono truncate">{model.name}</p>
                        {model.modified_at && (
                          <p className="text-[10px] text-muted-foreground/40 font-mono">
                            Updated {new Date(model.modified_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/40">
                        <HardDrive className="w-3 h-3" />
                        {formatModelSize(model.size)}
                      </div>
                      {(model.name === activeOllamaModel || model.name === (ollamaHealth as AIProviderStatus | null)?.activeModel) && (
                        <span className="text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          IN USE
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Install guidance */}
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] text-muted-foreground/40 font-mono leading-relaxed">
                To add models: <code className="text-green-400/60">ollama pull llama3.2</code> or <code className="text-green-400/60">ollama pull mistral</code>. Zara will use the first available model unless you set a preferred one via <code className="text-primary/50">ollama run &lt;model&gt;</code>.
              </p>
              <p className="text-[10px] text-muted-foreground/30 font-mono mt-1">
                Future (Tauri): ZaraOS will launch and manage the Ollama process automatically on startup.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── How to install Ollama ── */}
        <Card className="bg-card/40 border-white/5 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Getting Real Local Inference
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Ollama is the recommended path to real local AI. Install it, pull a model, and Zara will automatically detect and use it.
            </p>
            <div className="bg-black/60 rounded-lg p-4 font-mono text-xs text-green-300/80 flex flex-col gap-1.5 border border-white/5">
              <span className="text-muted-foreground/50"># Install Ollama (Linux / macOS)</span>
              <span>curl -fsSL https://ollama.com/install.sh | sh</span>
              <span className="text-muted-foreground/50 mt-1"># Pull a model (choose one)</span>
              <span>ollama pull llama3.2</span>
              <span>ollama pull mistral</span>
              <span>ollama pull phi4-mini</span>
              <span className="text-muted-foreground/50 mt-1"># Verify it's running</span>
              <span>curl http://localhost:11434/api/version</span>
            </div>
            <p className="text-[10px] text-muted-foreground/50 font-mono">
              Once Ollama is running, click "Refresh" in the Model Manager above. Zara will route all inference to the local model automatically — no restart required.
            </p>
          </CardContent>
        </Card>

        {/* ── Security Notice ── */}
        <Card className="bg-card/40 border-green-500/10 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-400/80">
              <ShieldAlert className="w-4 h-4" />
              API Key Security — Alpha 0.5
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              In Alpha 0.5, API keys are encrypted with AES-GCM-256 (Web Crypto API, PBKDF2 key derivation) before being stored in localStorage. This is a significant improvement over plain text but is not equivalent to a hardware keychain.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] font-mono">
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                <p className="text-green-400/80 font-semibold mb-1">What's protected</p>
                <p className="text-muted-foreground/50 leading-relaxed">Keys are not readable as plain text in DevTools. Ciphertext only in localStorage.</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-amber-400/80 font-semibold mb-1">Alpha limitation</p>
                <p className="text-muted-foreground/50 leading-relaxed">Key material is also in localStorage. XSS or malicious extensions could still extract keys.</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-primary/80 font-semibold mb-1">Future (Tauri)</p>
                <p className="text-muted-foreground/50 leading-relaxed">OS keychain (Keychain Services / Credential Manager / Secret Service). Zero JS exposure.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Memory Panel ── */}
        <Card className="bg-card/40 border-white/5 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Conversation Memory
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 gap-1.5"
                onClick={handleClearMemory}
                data-testid="button-clear-memory"
              >
                <Trash2 className="w-3 h-3" />
                Clear Session
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {memoryStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                {[
                  { label: "Turns",       value: memoryStats.conversationTurns },
                  { label: "Est. Tokens", value: memoryStats.estimatedTokens.toLocaleString() },
                  { label: "Pinned",      value: memoryStats.pinnedEntries },
                  { label: "Entries",     value: memoryStats.totalEntries },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">{label}</span>
                    <span className="text-white text-lg font-bold">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">Memory stats unavailable.</p>
            )}
            <p className="text-[10px] text-muted-foreground/40 font-mono mt-3">
              Alpha 0.5: Encrypted localStorage (AES-GCM). Future: SQLCipher on Linux ISO. Full memory controls in the Memory panel.
            </p>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
