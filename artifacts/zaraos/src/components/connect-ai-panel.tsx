// ============================================================
// ConnectAIPanel — Quick-connect for real AI inference
//
// Shown inside the Assistant panel when Zara is running in
// simulated mode. Offers two paths:
//   1. OpenAI / Anthropic API key (cloud, works from any browser)
//   2. Ollama local server (local-first, requires Ollama installed)
//
// On successful connect the panel signals the caller so the
// parent can hide it. The runtime status broadcast will
// automatically flip aiRuntimeStatus.isSimulated → false on
// the next message exchange.
// ============================================================

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRuntime } from "@/core/runtime-hook";
import {
  Cpu,
  Cloud,
  CheckCircle2,
  Loader2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Terminal,
  Key,
} from "lucide-react";
import type { AIProvider } from "@/core/types";

type Tab = "openai" | "anthropic" | "ollama";
type ConnectStatus = "idle" | "checking" | "success" | "error";

const CLOUD_PROVIDERS: Array<{ id: Tab; label: string; model: string; keyHint: string }> = [
  { id: "openai",    label: "OpenAI",    model: "gpt-4o-mini", keyHint: "sk-..." },
  { id: "anthropic", label: "Anthropic", model: "claude-3-haiku-20240307", keyHint: "sk-ant-..." },
];

interface ConnectAIPanelProps {
  onConnected?: () => void;
}

export function ConnectAIPanel({ onConnected }: ConnectAIPanelProps) {
  const {
    setAIProviderApiKey,
    checkAIProviderHealth,
    selectAIProvider,
    enableAIProvider,
    requestPermission,
  } = useRuntime();

  const [tab, setTab]         = useState<Tab>("openai");
  const [apiKey, setApiKey]   = useState("");
  const [status, setStatus]   = useState<ConnectStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");

  // ── Cloud provider connect ───────────────────────────────
  const handleConnectCloud = async () => {
    if (!apiKey.trim()) return;
    setStatus("checking");
    setStatusMsg("Validating API key...");

    // Grant cloud AI permission first
    requestPermission("cloud_ai");

    // Inject key into provider and enable it
    setAIProviderApiKey(tab, apiKey.trim());
    enableAIProvider(tab, true);

    // Validate via health check
    const result = await checkAIProviderHealth(tab);
    if (result.available) {
      selectAIProvider(tab as AIProvider);
      setStatus("success");
      setStatusMsg(`${CLOUD_PROVIDERS.find((p) => p.id === tab)?.label} connected. Real AI inference active.`);
      setTimeout(() => onConnected?.(), 1800);
    } else {
      setStatus("error");
      setStatusMsg(result.reason ?? "Key invalid or provider unreachable. Check and try again.");
    }
  };

  // ── Ollama connect test ──────────────────────────────────
  const handleTestOllama = async () => {
    setStatus("checking");
    setStatusMsg("Checking Ollama at 127.0.0.1:11434...");
    enableAIProvider("ollama", true);
    const result = await checkAIProviderHealth("ollama");
    if (result.available) {
      selectAIProvider("ollama" as AIProvider);
      setStatus("success");
      setStatusMsg(result.reason ?? `Ollama connected (${result.latencyMs ?? 0}ms). Local inference active.`);
      setTimeout(() => onConnected?.(), 2200);
    } else {
      setStatus("error");
      setStatusMsg(result.reason ?? "Ollama not reachable. See instructions below.");
    }
  };

  const isCloud = tab !== "ollama";
  const providerMeta = CLOUD_PROVIDERS.find((p) => p.id === tab);

  return (
    <div className="mt-4 mb-2 rounded-xl border border-primary/20 bg-background/60 backdrop-blur-md overflow-hidden">
      {/* ── Tab bar ── */}
      <div className="flex border-b border-white/5">
        {CLOUD_PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setTab(p.id); setStatus("idle"); setStatusMsg(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-r border-white/5 transition-colors ${
              tab === p.id
                ? "bg-primary/10 text-primary border-b-2 border-b-primary"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <Cloud className="w-3 h-3" />
            {p.label}
          </button>
        ))}
        <button
          onClick={() => { setTab("ollama"); setStatus("idle"); setStatusMsg(""); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono transition-colors ${
            tab === "ollama"
              ? "bg-primary/10 text-primary border-b-2 border-b-primary"
              : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <Cpu className="w-3 h-3" />
          Ollama (Local)
        </button>
      </div>

      <div className="p-4">
        {/* ── Cloud provider ── */}
        {isCloud && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-mono text-muted-foreground/70">
              Enter your {providerMeta?.label} API key. It stays on your device — never sent to any ZaraOS server.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setStatus("idle"); }}
                  placeholder={providerMeta?.keyHint ?? "API key..."}
                  className="pl-9 h-9 bg-background border-white/10 text-sm font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleConnectCloud()}
                  disabled={status === "checking" || status === "success"}
                />
              </div>
              <Button
                size="sm"
                onClick={handleConnectCloud}
                disabled={!apiKey.trim() || status === "checking" || status === "success"}
                className="h-9 px-4 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs font-mono"
              >
                {status === "checking" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Ollama ── */}
        {!isCloud && (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-mono text-muted-foreground/70">
              Ollama runs local LLMs on your machine — no API key needed, nothing leaves your device.
            </p>

            {/* Steps */}
            <div className="flex flex-col gap-1.5 text-[11px] font-mono text-muted-foreground/60">
              {[
                { n: 1, cmd: "Install Ollama from ollama.com", link: "https://ollama.com" },
                { n: 2, cmd: "ollama pull llama3", note: "or any model" },
                { n: 3, cmd: "OLLAMA_ORIGINS=* ollama serve", note: "allows browser access" },
              ].map((step) => (
                <div key={step.n} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-white/10 text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {step.n}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {step.link ? (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary/70 hover:text-primary underline underline-offset-2"
                      >
                        {step.cmd} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3 h-3 text-primary/40" />
                        <code className="text-primary/80">{step.cmd}</code>
                      </span>
                    )}
                    {step.note && (
                      <span className="text-muted-foreground/40">— {step.note}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              size="sm"
              onClick={handleTestOllama}
              disabled={status === "checking" || status === "success"}
              className="self-start h-9 px-4 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs font-mono"
            >
              {status === "checking" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 mr-2" />
              )}
              Test Connection
            </Button>
          </div>
        )}

        {/* ── Status feedback ── */}
        {status !== "idle" && statusMsg && (
          <div className={`mt-3 flex items-center gap-2 text-[11px] font-mono px-3 py-2 rounded-lg border ${
            status === "checking" ? "border-white/10 text-muted-foreground bg-white/5" :
            status === "success"  ? "border-green-500/30 text-green-400 bg-green-500/10" :
                                    "border-red-500/30 text-red-400 bg-red-500/10"
          }`}>
            {status === "checking" && <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
            {status === "success"  && <CheckCircle2 className="w-3 h-3 flex-shrink-0" />}
            {status === "error"    && <XCircle className="w-3 h-3 flex-shrink-0" />}
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
