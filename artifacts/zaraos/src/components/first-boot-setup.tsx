// ============================================================
// ZaraOS — First Boot Setup Wizard
//
// Shown on first launch of the native app to let the user
// choose an Ollama model to pull. Detected via the 'zaraos:first-boot'
// key in the Tauri KV store.
//
// Skipped in browser mode (isTauriRuntime() === false).
// Skipped if the key already exists (setup already completed).
//
// Pulls the selected model via shell_exec("ollama pull <model>")
// and streams output to a log area. On completion, marks the
// first-boot key as done and dismisses.
// ============================================================

import { useEffect, useState, useRef } from "react";
import { isTauriRuntime } from "@/core/tauri/tauri-bridge";
import { keychainGet, keychainSet } from "@/core/tauri/tauri-keychain";
import { shellExec } from "@/core/tauri/tauri-fs";
import { Loader2, CheckCircle2, Download, Zap, Server, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Model options ─────────────────────────────────────────────
const MODELS = [
  {
    id: "tinyllama",
    name: "TinyLlama 1.1B",
    size: "~600 MB",
    ram: "~1 GB RAM",
    description: "Fastest. Good for low-end hardware or quick responses.",
    badge: "Fastest",
    badgeColor: "text-green-400 border-green-500/30 bg-green-500/10",
  },
  {
    id: "llama3.2:3b",
    name: "Llama 3.2 3B",
    size: "~2 GB",
    ram: "~4 GB RAM",
    description: "Balanced. Solid reasoning, runs on 8 GB RAM comfortably.",
    badge: "Recommended",
    badgeColor: "text-primary border-primary/30 bg-primary/10",
    recommended: true,
  },
  {
    id: "llama3.1:8b",
    name: "Llama 3.1 8B",
    size: "~5 GB",
    ram: "~10 GB RAM",
    description: "Best quality. Requires 16 GB RAM for smooth performance.",
    badge: "Best Quality",
    badgeColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
  {
    id: "skip",
    name: "Skip for now",
    size: "—",
    ram: "—",
    description: "Continue without pulling a model. You can do this later in AI Providers.",
    badge: "Later",
    badgeColor: "text-muted-foreground border-white/10 bg-white/5",
  },
] as const;

type ModelId = typeof MODELS[number]["id"];
const FIRST_BOOT_KEY = "zaraos:first-boot-done";

// ── Component ─────────────────────────────────────────────────

interface FirstBootSetupProps {
  onComplete: () => void;
}

export function FirstBootSetup({ onComplete }: FirstBootSetupProps) {
  const [checked, setChecked] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<ModelId>("llama3.2:3b");
  const [phase, setPhase] = useState<"select" | "pulling" | "done">("select");
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // Check KV store to decide if we should show the wizard
  useEffect(() => {
    if (!isTauriRuntime()) {
      setChecked(true);
      return;
    }
    keychainGet(FIRST_BOOT_KEY)
      .then((val: string | null) => {
        if (!val) setVisible(true);
      })
      .catch(() => {}) // if KV fails, don't block startup
      .finally(() => setChecked(true));
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  async function handleStart() {
    if (selected === "skip") {
      await finalize();
      return;
    }

    setPhase("pulling");
    setLog([`Pulling ${selected} from Ollama registry...`, ""]);

    try {
      const output = await shellExec(`ollama pull ${selected}`);
      const lines = output.split("\n").filter(Boolean);
      setLog(lines.length ? lines : ["Done."]);
      setPhase("done");
    } catch (e) {
      setLog((prev) => [
        ...prev,
        "",
        `Error: ${e instanceof Error ? e.message : String(e)}`,
        "",
        'Make sure Ollama is installed: curl -fsSL https://ollama.com/install.sh | sh',
      ]);
      setPhase("done"); // still let them continue
    }
  }

  async function finalize() {
    await keychainSet(FIRST_BOOT_KEY, "done").catch(() => {});
    setVisible(false);
    onComplete();
  }

  if (!checked || !visible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-card border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="font-mono font-bold text-primary-foreground text-xl">Z</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Welcome to ZaraOS</h1>
              <p className="text-xs font-mono text-muted-foreground/60">First launch — local AI setup</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ZaraOS runs AI locally on your machine — no cloud required.
            Choose a model to download. You can change this anytime in AI Providers.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">

          {/* Model selection */}
          {phase === "select" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-primary/60" />
                <span className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">
                  Select Ollama Model
                </span>
              </div>

              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelected(model.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
                    selected === model.id
                      ? "border-primary/40 bg-primary/8"
                      : "border-white/8 bg-black/20 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        selected === model.id ? "border-primary bg-primary" : "border-white/20"
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{model.name}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${model.badgeColor}`}>
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                      </div>
                    </div>
                    {model.id !== "skip" && (
                      <div className="text-right text-[10px] font-mono text-muted-foreground/50 flex-shrink-0">
                        <div>{model.size}</div>
                        <div>{model.ram}</div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pull log */}
          {(phase === "pulling" || phase === "done") && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                {phase === "pulling" ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
                <span className="text-sm font-mono text-muted-foreground">
                  {phase === "pulling" ? `Pulling ${selected}...` : "Complete"}
                </span>
              </div>
              <div
                ref={logRef}
                className="bg-black/60 border border-white/8 rounded-xl p-4 h-48 overflow-y-auto"
              >
                {log.map((line, i) => (
                  <div key={i} className="text-xs font-mono text-green-400/80 leading-relaxed">
                    {line || "\u00A0"}
                  </div>
                ))}
                {phase === "pulling" && (
                  <span className="text-xs font-mono text-primary animate-pulse">_</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground/40">
            <Server className="w-3 h-3" />
            All processing stays on your machine
          </div>
          <div className="flex items-center gap-3">
            {phase === "select" && (
              <Button
                variant="ghost"
                className="text-muted-foreground/50 hover:text-white"
                onClick={finalize}
              >
                Skip
              </Button>
            )}
            {phase === "select" && (
              <Button onClick={() => void handleStart()} className="gap-2">
                <Download className="w-4 h-4" />
                {selected === "skip" ? "Continue" : "Download Model"}
              </Button>
            )}
            {phase === "pulling" && (
              <Button disabled className="gap-2 opacity-50">
                <Loader2 className="w-4 h-4 animate-spin" />
                Downloading...
              </Button>
            )}
            {phase === "done" && (
              <Button onClick={() => void finalize()} className="gap-2">
                <Zap className="w-4 h-4" />
                Launch ZaraOS
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
