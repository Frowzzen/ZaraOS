// ============================================================
// AI Provider Manager — Alpha 0.3
//
// Upgraded from Alpha 0.1:
//   - All 6 providers listed (local, ollama, llamacpp, openai, anthropic, gemini)
//   - AI Runtime Status widget embedded
//   - Memory stats panel
//   - Clear conversation action
//   - Endpoint URL for Ollama and llama.cpp
//   - API key inputs for cloud providers
//   - Local-first philosophy callout
// ============================================================

import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AIRuntimeStatus } from "@/components/ai-runtime-status";
import { useRuntime } from "@/core/runtime-context";
import { useState } from "react";
import {
  Cpu,
  ShieldCheck,
  Trash2,
  Server,
  Cloud,
  Lock,
  AlertTriangle,
  Database,
} from "lucide-react";

interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  isLocal: boolean;
  isEnabled: boolean;
  requiresKey: boolean;
  requiresEndpoint: boolean;
  defaultEndpoint?: string;
  keyPlaceholder?: string;
  status: "active" | "ready" | "disabled" | "cloud-gated";
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "local",
    name: "Zara Local Runtime",
    description: "Built-in simulated intelligence. Always available. No install required.",
    isLocal: true,
    isEnabled: true,
    requiresKey: false,
    requiresEndpoint: false,
    status: "active",
  },
  {
    id: "ollama",
    name: "Ollama",
    description: "Run open-source models (Llama 3, Mistral, Phi-3) on your hardware. Install Ollama to enable real inference.",
    isLocal: true,
    isEnabled: false,
    requiresKey: false,
    requiresEndpoint: true,
    defaultEndpoint: "http://localhost:11434",
    status: "ready",
  },
  {
    id: "llamacpp",
    name: "llama.cpp Server",
    description: "OpenAI-compatible server. Run GGUF models directly. Maximum control over quantization and context.",
    isLocal: true,
    isEnabled: false,
    requiresKey: false,
    requiresEndpoint: true,
    defaultEndpoint: "http://localhost:8080",
    status: "ready",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o and GPT-4o-mini. Cloud provider — data leaves your device. Requires your own API key.",
    isLocal: false,
    isEnabled: false,
    requiresKey: true,
    requiresEndpoint: false,
    keyPlaceholder: "sk-...",
    status: "cloud-gated",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet and Claude 3 Haiku. Cloud provider — data leaves your device. Requires your own API key.",
    isLocal: false,
    isEnabled: false,
    requiresKey: true,
    requiresEndpoint: false,
    keyPlaceholder: "sk-ant-...",
    status: "cloud-gated",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini 1.5 Pro and Flash. Cloud provider — data leaves your device. Requires your own API key.",
    isLocal: false,
    isEnabled: false,
    requiresKey: true,
    requiresEndpoint: false,
    keyPlaceholder: "AIza...",
    status: "cloud-gated",
  },
];

export default function AIProviders() {
  const { clearAIConversation, getAIMemoryStats, aiRuntimeStatus } = useRuntime();
  const [activeProviderId, setActiveProviderId] = useState("local");
  const [endpoints, setEndpoints] = useState<Record<string, string>>({});
  const [memoryStats, setMemoryStats] = useState(() => {
    try { return getAIMemoryStats(); } catch { return null; }
  });

  const handleSetPrimary = (id: string) => {
    if (PROVIDERS.find((p) => p.id === id)?.status === "cloud-gated") {
      return;
    }
    setActiveProviderId(id);
  };

  const handleClearMemory = () => {
    clearAIConversation();
    try { setMemoryStats(getAIMemoryStats()); } catch { setMemoryStats(null); }
  };

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
            Configure where Zara's intelligence runs. Local is the default and the default forever.
          </p>
        </div>

        {/* ── AI Runtime Status Widget ── */}
        <AIRuntimeStatus />

        {/* ── Philosophy Note ── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/15">
          <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-300/70 font-mono leading-relaxed">
            Local-first by design. Cloud providers require your own API key — ZaraOS never pays for inference on your behalf and never stores your keys on any server. Keys are held in localStorage only.
          </p>
        </div>

        {/* ── Provider Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PROVIDERS.map((p) => {
            const isActive = activeProviderId === p.id;
            const isCloudGated = p.status === "cloud-gated";

            return (
              <Card
                key={p.id}
                className={`bg-card/40 border-white/5 backdrop-blur transition-all duration-200 ${
                  isActive
                    ? "border-primary/40 shadow-[0_0_24px_rgba(0,240,255,0.08)]"
                    : ""
                } ${isCloudGated ? "opacity-70" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isActive && (
                        <span className="text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          ACTIVE
                        </span>
                      )}
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
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{p.description}</p>
                </CardHeader>

                <CardContent className="pb-3">
                  {p.requiresEndpoint && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                        Endpoint URL
                      </label>
                      <Input
                        value={endpoints[p.id] ?? p.defaultEndpoint ?? ""}
                        onChange={(e) => setEndpoints((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder={p.defaultEndpoint}
                        className="bg-black/50 border-white/10 text-sm h-9 font-mono"
                        data-testid={`input-endpoint-${p.id}`}
                      />
                    </div>
                  )}

                  {p.requiresKey && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        API Key — stored locally only
                      </label>
                      <Input
                        type="password"
                        placeholder={p.keyPlaceholder ?? "API key..."}
                        className="bg-black/50 border-white/10 text-sm h-9 font-mono"
                        data-testid={`input-key-${p.id}`}
                      />
                    </div>
                  )}

                  {p.id === "local" && (
                    <div className="text-xs text-muted-foreground/60 font-mono">
                      Default runtime. Context-aware responses. No external dependencies.
                      {aiRuntimeStatus.isSimulated && (
                        <div className="mt-1 text-amber-400/60">
                          Running in simulated mode — install Ollama for real inference.
                        </div>
                      )}
                    </div>
                  )}

                  {isCloudGated && (
                    <div className="flex items-start gap-1.5 mt-2 text-[11px] font-mono text-amber-400/60">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>Requires cloud_ai permission in Privacy settings before activation.</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-3 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {isCloudGated ? "Requires permission" : isActive ? "Primary provider" : "Set as primary"}
                  </span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => handleSetPrimary(p.id)}
                    disabled={isCloudGated}
                    data-testid={`switch-provider-${p.id}`}
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>

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
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {memoryStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">Turns</span>
                  <span className="text-white text-lg font-bold">{memoryStats.conversationTurns}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">Est. Tokens</span>
                  <span className="text-white text-lg font-bold">{memoryStats.estimatedTokens.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">Pinned</span>
                  <span className="text-white text-lg font-bold">{memoryStats.pinnedEntries}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">Entries</span>
                  <span className="text-white text-lg font-bold">{memoryStats.totalEntries}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-mono">Memory stats unavailable.</p>
            )}
            <p className="text-[10px] text-muted-foreground/40 font-mono mt-3">
              Alpha 0.3: Stored in localStorage. Future: Encrypted IndexedDB (Alpha 0.4+), SQLCipher on Linux.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
