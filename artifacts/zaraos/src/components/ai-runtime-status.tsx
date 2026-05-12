// ============================================================
// AI Runtime Status Widget
//
// Shows the current AI runtime state: provider, model,
// simulated/real badge, memory token usage, and last latency.
//
// Usage: <AIRuntimeStatus /> — embeds anywhere in the OS shell.
// ============================================================

import { useRuntime } from "@/core/runtime-hook";
import { Cpu, Brain, Zap, Database, Clock } from "lucide-react";

interface AIRuntimeStatusProps {
  compact?: boolean;
}

export function AIRuntimeStatus({ compact = false }: AIRuntimeStatusProps) {
  const { aiRuntimeStatus } = useRuntime();

  const {
    phase,
    providerName,
    modelId,
    isSimulated,
    isCloud,
    latencyMs,
    memoryTokens,
    conversationTurns,
  } = aiRuntimeStatus;

  const phaseColors: Record<typeof phase, string> = {
    idle:      "text-muted-foreground/50",
    thinking:  "text-purple-400",
    streaming: "text-cyan-400",
    done:      "text-green-400",
    error:     "text-red-400",
  };

  const phaseLabel: Record<typeof phase, string> = {
    idle:      "IDLE",
    thinking:  "THINKING",
    streaming: "STREAMING",
    done:      "DONE",
    error:     "ERROR",
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono">
        <div className={`flex items-center gap-1 ${phaseColors[phase]}`}>
          <Cpu className="w-3 h-3" />
          <span>{providerName}</span>
        </div>
        {isSimulated && (
          <span className="px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400/70 text-[9px]">
            SIM
          </span>
        )}
        {isCloud && (
          <span className="px-1 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400/70 text-[9px]">
            CLOUD
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 bg-card/30 backdrop-blur p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-white">AI Runtime</span>
        </div>
        <span className={`text-[10px] font-mono ${phaseColors[phase]}`}>
          {phaseLabel[phase]}
        </span>
      </div>

      {/* Provider + Model */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">Provider</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-primary/60 flex-shrink-0" />
            <span className="text-white/80 truncate">{providerName}</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">Model</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-primary/60 flex-shrink-0" />
            <span className="text-white/80 truncate">{modelId}</span>
          </div>
        </div>
      </div>

      {/* Memory + Latency */}
      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">Tokens</span>
          <div className="flex items-center gap-1">
            <Database className="w-3 h-3 text-primary/60 flex-shrink-0" />
            <span className="text-white/70">{(memoryTokens ?? 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">Turns</span>
          <span className="text-white/70">{conversationTurns ?? 0}</span>
        </div>
        {latencyMs !== undefined && (
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground/50 uppercase tracking-widest text-[9px]">Latency</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary/60 flex-shrink-0" />
              <span className="text-white/70">{latencyMs}ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Mode badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {isSimulated && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/8 text-amber-400/70">
            SIMULATED — Install Ollama for real inference
          </span>
        )}
        {!isSimulated && !isCloud && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-green-500/20 bg-green-500/8 text-green-400/70">
            LOCAL — Running on this device
          </span>
        )}
        {isCloud && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/8 text-blue-400/70">
            CLOUD — Data may leave this device
          </span>
        )}
      </div>
    </div>
  );
}
