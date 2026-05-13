// ============================================================
// ZaraOS — First Boot Setup Wizard
//
// Shown on first launch of the native app.
// Does NOT run `ollama pull` in-process (that blocks WebKit).
// Instead, shows the terminal command and marks setup done.
// The user runs the pull in a separate terminal.
// ============================================================

import { useEffect, useState } from "react";
import { isTauriRuntime } from "@/core/tauri/tauri-bridge";
import { keychainGet, keychainSet } from "@/core/tauri/tauri-keychain";
import { CheckCircle2, Copy, Zap, Server, Cpu, Check } from "lucide-react";
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
    badgeColor: "text-green-600 border-green-500/30 bg-green-500/10",
  },
  {
    id: "llama3.2:3b",
    name: "Llama 3.2 3B",
    size: "~2 GB",
    ram: "~4 GB RAM",
    description: "Balanced. Solid reasoning, runs on 8 GB RAM comfortably.",
    badge: "Recommended",
    badgeColor: "text-indigo-600 border-indigo-500/30 bg-indigo-500/10",
    recommended: true,
  },
  {
    id: "llama3.1:8b",
    name: "Llama 3.1 8B",
    size: "~5 GB",
    ram: "~10 GB RAM",
    description: "Best quality. Requires 16 GB RAM for smooth performance.",
    badge: "Best Quality",
    badgeColor: "text-purple-600 border-purple-500/30 bg-purple-500/10",
  },
  {
    id: "skip",
    name: "Skip for now",
    size: "—",
    ram: "—",
    description: "Continue without a model. Set one up later in AI Providers.",
    badge: "Later",
    badgeColor: "text-slate-500 border-slate-200 bg-slate-50",
  },
] as const;

type ModelId = typeof MODELS[number]["id"];
const FIRST_BOOT_KEY = "zaraos:first-boot-done";

interface FirstBootSetupProps {
  onComplete: () => void;
}

export function FirstBootSetup({ onComplete }: FirstBootSetupProps) {
  const [checked, setChecked]   = useState(false);
  const [visible, setVisible]   = useState(false);
  const [selected, setSelected] = useState<ModelId>("llama3.2:3b");
  const [copied, setCopied]     = useState(false);
  const [phase, setPhase]       = useState<"select" | "command">("select");

  // Check KV store — show only on first native launch
  useEffect(() => {
    if (!isTauriRuntime()) {
      setChecked(true);
      return;
    }
    keychainGet(FIRST_BOOT_KEY)
      .then((val: string | null) => { if (!val) setVisible(true); })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  async function finalize() {
    await keychainSet(FIRST_BOOT_KEY, "done").catch(() => {});
    setVisible(false);
    onComplete();
  }

  function handleNext() {
    if (selected === "skip") {
      void finalize();
    } else {
      setPhase("command");
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(`ollama pull ${selected}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!checked || !visible) return null;

  const pullCmd = `ollama pull ${selected}`;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(100,116,139,0.30)" }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          background: "linear-gradient(145deg,#ffffff,#f0f2f8)",
          border: "1px solid rgba(148,163,184,0.22)",
          borderRadius: 24,
          boxShadow:
            "8px 8px 30px rgba(166,180,200,0.45), -6px -6px 20px rgba(255,255,255,0.95)",
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="font-mono font-bold text-primary-foreground text-xl">Z</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Welcome to ZaraOS</h1>
              <p className="text-xs font-mono text-muted-foreground/60">First launch — local AI setup</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ZaraOS runs AI locally on your machine — no cloud required.
            Choose a model below, then run the command in a terminal to download it.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">

          {/* Phase 1 — model selection */}
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
                      ? "border-primary/40 bg-primary/5"
                      : "border-slate-200 bg-white hover:border-indigo-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          selected === model.id
                            ? "border-primary bg-primary"
                            : "border-slate-300"
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{model.name}</span>
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

          {/* Phase 2 — show terminal command */}
          {phase === "command" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-slate-700 font-medium">
                  Run this command in a terminal to download the model:
                </span>
              </div>

              {/* Command box */}
              <div
                className="flex items-center justify-between gap-3 rounded-xl px-5 py-4"
                style={{
                  background: "linear-gradient(145deg,#1a1e2e,#111520)",
                  border: "1px solid rgba(99,102,241,0.20)",
                }}
              >
                <code className="font-mono text-sm text-indigo-300 select-all">{pullCmd}</code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                  style={{
                    background: copied
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(99,102,241,0.15)",
                    color: copied ? "#22c55e" : "#818cf8",
                    border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.3)"}`,
                  }}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Open a new terminal window, paste the command, and let it download.
                You can continue using ZaraOS now — the model downloads in the background.
                Once done, Zara will automatically use it for AI responses.
              </p>
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
              <>
                <Button
                  variant="ghost"
                  className="text-muted-foreground/50 hover:text-slate-700"
                  onClick={() => void finalize()}
                >
                  Skip
                </Button>
                <Button onClick={handleNext} className="gap-2">
                  {selected === "skip" ? "Continue" : "Next"}
                </Button>
              </>
            )}
            {phase === "command" && (
              <>
                <Button
                  variant="ghost"
                  className="text-muted-foreground/50 hover:text-slate-700"
                  onClick={() => setPhase("select")}
                >
                  Back
                </Button>
                <Button onClick={() => void finalize()} className="gap-2">
                  <Zap className="w-4 h-4" />
                  Launch ZaraOS
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
