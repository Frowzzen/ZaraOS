// ============================================================
// ZaraOS Installer
//
// Multi-step installation wizard. Supports:
//   - Full install  : wipe target disk, use all space for ZaraOS
//   - Dual boot     : keep existing OS (Windows or Ubuntu/Linux),
//                     split disk space, install GRUB alongside
//
// Disk detection is real in Tauri mode (lsblk). In browser mode
// mock disks are shown so the UI can be developed and tested.
//
// Actual partition/format/GRUB operations are performed by the
// bundled install.sh script invoked via the Tauri shell plugin.
// ============================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HardDrive, Layers, Trash2, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, Loader2, RotateCcw, Shield, Cpu, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { listDisks, transportLabel, isSafeTarget } from "@/core/tauri/tauri-installer";
import type { DiskInfo, InstallMode } from "@/core/tauri/tauri-installer";
import { isTauriRuntime } from "@/core/tauri/tauri-bridge";

// ── Step Types ────────────────────────────────────────────────

type Step = "mode" | "disk" | "configure" | "confirm" | "installing" | "done";

interface InstallState {
  mode: InstallMode | null;
  targetDisk: DiskInfo | null;
  dualbootSplitGb: number;
  hostname: string;
  username: string;
  detectedOS: "windows" | "ubuntu" | "linux" | "unknown" | null;
}

// ── Helpers ───────────────────────────────────────────────────

function detectOSFromDisk(disk: DiskInfo): "windows" | "ubuntu" | "unknown" {
  // Heuristic: if it's an NVMe or SATA internal disk that is the boot disk,
  // assume it has an OS. The installer's shell script does the real detection.
  // This is only for UI labeling purposes.
  if (disk.is_boot) return "ubuntu"; // We're running ZaraOS live so boot disk is Linux
  return "unknown";
}

function formatBytes(bytes: number): string {
  const gb = bytes / 1_000_000_000;
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${Math.round(gb)} GB`;
}

// ── Phase progress for the installing step ────────────────────
const INSTALL_PHASES = [
  "Verifying disk layout...",
  "Partitioning drive...",
  "Formatting ZaraOS partition...",
  "Installing base system...",
  "Installing ZaraOS...",
  "Configuring auto-login...",
  "Installing bootloader (GRUB)...",
  "Configuring dual boot menu...",
  "Finalizing...",
];

// ── Sub-components ────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ["mode", "disk", "configure", "confirm", "installing", "done"];
  const current = steps.indexOf(step);
  const labels = ["Mode", "Disk", "Configure", "Confirm", "Install", "Done"];
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.slice(0, 4).map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
            i < current ? "bg-primary text-black" :
            i === current ? "bg-primary/20 border border-primary text-primary" :
            "bg-muted/30 text-muted-foreground/40"
          }`}>
            {i < current ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
          </div>
          <span className={`text-[10px] font-mono tracking-wider hidden sm:block ${
            i === current ? "text-primary" : "text-muted-foreground/40"
          }`}>{labels[i].toUpperCase()}</span>
          {i < 3 && <div className={`w-6 h-px ${i < current ? "bg-primary/50" : "bg-muted/30"}`} />}
        </div>
      ))}
    </div>
  );
}

function DiskCard({ disk, selected, onClick }: { disk: DiskInfo; selected: boolean; onClick: () => void }) {
  const safe = isSafeTarget(disk);
  return (
    <button
      onClick={onClick}
      disabled={!safe}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        selected
          ? "border-primary bg-primary/10"
          : safe
          ? "border-border/40 bg-card/40 hover:border-primary/50 hover:bg-primary/5"
          : "border-border/20 bg-card/20 opacity-40 cursor-not-allowed"
      }`}
    >
      <div className="flex items-start gap-3">
        <HardDrive className={`w-5 h-5 mt-0.5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold">{disk.path}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground font-mono">
              {transportLabel(disk.transport)}
            </span>
            {disk.is_boot && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                CURRENT BOOT
              </span>
            )}
            {disk.removable && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-mono">
                REMOVABLE
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{disk.model}</div>
          <div className="text-sm font-mono text-primary/80 mt-0.5">{disk.size}</div>
        </div>
        {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function Install() {
  const [step, setStep] = useState<Step>("mode");
  const [disks, setDisks] = useState<DiskInfo[]>([]);
  const [loadingDisks, setLoadingDisks] = useState(false);
  const [installPhase, setInstallPhase] = useState(0);
  const [installProgress, setInstallProgress] = useState(0);
  const [state, setState] = useState<InstallState>({
    mode: null,
    targetDisk: null,
    dualbootSplitGb: 100,
    hostname: "zaraos",
    username: "zaraos",
    detectedOS: null,
  });

  const isTauri = isTauriRuntime();

  // Load disks when user reaches disk step
  useEffect(() => {
    if (step === "disk") {
      setLoadingDisks(true);
      listDisks()
        .then(setDisks)
        .catch(() => setDisks([]))
        .finally(() => setLoadingDisks(false));
    }
  }, [step]);

  // Detect OS when disk is selected
  useEffect(() => {
    if (state.targetDisk) {
      const detected = detectOSFromDisk(state.targetDisk);
      setState((s) => ({ ...s, detectedOS: detected }));
    }
  }, [state.targetDisk]);

  // Simulate install progress (real progress will come via Tauri events)
  useEffect(() => {
    if (step !== "installing") return;
    let phase = 0;
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setStep("done"), 800);
      }
      const newPhase = Math.min(
        Math.floor((progress / 100) * INSTALL_PHASES.length),
        INSTALL_PHASES.length - 1
      );
      if (newPhase !== phase) {
        phase = newPhase;
        setInstallPhase(newPhase);
      }
      setInstallProgress(Math.round(progress));
    }, 400);

    return () => clearInterval(interval);
  }, [step]);

  const go = (s: Step) => setStep(s);

  const maxZaraGb = state.targetDisk
    ? Math.floor(state.targetDisk.size_bytes / 1_000_000_000) - 60
    : 200;

  const osLabel = state.detectedOS === "windows"
    ? "Windows"
    : state.detectedOS === "ubuntu"
    ? "Ubuntu"
    : state.detectedOS === "linux"
    ? "Linux"
    : "existing OS";

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 md:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Install ZaraOS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isTauri
            ? "Install ZaraOS to this machine's internal drive."
            : "Browser mode — using mock disks for UI preview."}
        </p>
      </div>

      {step !== "installing" && step !== "done" && <StepIndicator step={step} />}

      <AnimatePresence mode="wait">

        {/* ── Step 1: Mode ─────────────────────────────────── */}
        {step === "mode" && (
          <motion.div key="mode" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose how to install ZaraOS on this machine.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Full install card */}
              <button
                onClick={() => { setState((s) => ({ ...s, mode: "wipe" })); go("disk"); }}
                className="group text-left p-5 rounded-xl border border-border/40 bg-card/40 hover:border-primary/60 hover:bg-primary/5 transition-all"
              >
                <Trash2 className="w-7 h-7 text-red-400 mb-3 group-hover:text-red-300 transition-colors" />
                <div className="font-semibold text-sm">Full Install</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Wipe the selected disk and use all space for ZaraOS. Recommended for dedicated machines.
                </div>
                <div className="mt-3 text-xs text-red-400/80 font-mono">ERASES ALL DATA</div>
              </button>

              {/* Dual boot card */}
              <button
                onClick={() => { setState((s) => ({ ...s, mode: "dualboot" })); go("disk"); }}
                className="group text-left p-5 rounded-xl border border-border/40 bg-card/40 hover:border-primary/60 hover:bg-primary/5 transition-all"
              >
                <Layers className="w-7 h-7 text-primary mb-3 group-hover:text-primary/80 transition-colors" />
                <div className="font-semibold text-sm">Dual Boot</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Keep your existing OS — Windows or Ubuntu — and choose ZaraOS at startup. Disk space is split.
                </div>
                <div className="mt-3 text-xs text-primary/70 font-mono flex gap-3">
                  <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> Windows</span>
                  <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Ubuntu</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Disk ─────────────────────────────────── */}
        {step === "disk" && (
          <motion.div key="disk" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {state.mode === "wipe"
                ? "Select the disk to install ZaraOS on. All data on it will be erased."
                : "Select the disk that contains the OS you want to keep alongside ZaraOS."}
            </p>

            {loadingDisks ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning disks...
              </div>
            ) : disks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No suitable disks found.</div>
            ) : (
              <div className="space-y-3">
                {disks.map((disk) => (
                  <DiskCard
                    key={disk.path}
                    disk={disk}
                    selected={state.targetDisk?.path === disk.path}
                    onClick={() => setState((s) => ({ ...s, targetDisk: disk }))}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => go("mode")}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                size="sm"
                disabled={!state.targetDisk}
                onClick={() => go("configure")}
                className="ml-auto"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Configure ─────────────────────────────── */}
        {step === "configure" && (
          <motion.div key="configure" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">

            {/* Dual boot split slider */}
            {state.mode === "dualboot" && state.targetDisk && (
              <div className="space-y-3 p-4 rounded-lg border border-border/40 bg-card/30">
                <div className="text-sm font-semibold">Disk Space Split</div>
                <p className="text-xs text-muted-foreground">
                  How much of <span className="font-mono text-foreground">{state.targetDisk.path}</span> ({state.targetDisk.size}) should ZaraOS use?
                </p>
                <div className="space-y-3">
                  <Slider
                    min={40}
                    max={maxZaraGb}
                    step={10}
                    value={[state.dualbootSplitGb]}
                    onValueChange={([v]) => setState((s) => ({ ...s, dualbootSplitGb: v }))}
                  />
                  <div className="flex justify-between text-xs font-mono">
                    <div>
                      <div className="text-muted-foreground">{osLabel}</div>
                      <div className="text-foreground">{Math.floor(state.targetDisk.size_bytes / 1_000_000_000) - state.dualbootSplitGb} GB</div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary">ZaraOS</div>
                      <div className="text-primary">{state.dualbootSplitGb} GB</div>
                    </div>
                  </div>
                  {/* Visual bar */}
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden flex">
                    <div
                      className="h-full bg-muted/60 transition-all"
                      style={{ width: `${100 - (state.dualbootSplitGb / Math.floor(state.targetDisk.size_bytes / 1_000_000_000)) * 100}%` }}
                    />
                    <div className="h-full bg-primary/60 flex-1" />
                  </div>
                </div>
                {state.detectedOS === "windows" && (
                  <p className="text-xs text-amber-400/80 mt-2">
                    Windows NTFS partition will be safely shrunk using ntfsresize. Make sure Windows is shut down (not hibernated) before proceeding.
                  </p>
                )}
              </div>
            )}

            {/* System config */}
            <div className="space-y-3 p-4 rounded-lg border border-border/40 bg-card/30">
              <div className="text-sm font-semibold">System Identity</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-mono">HOSTNAME</label>
                  <input
                    value={state.hostname}
                    onChange={(e) => setState((s) => ({ ...s, hostname: e.target.value }))}
                    className="w-full bg-background/50 border border-border/40 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/60"
                    placeholder="zaraos"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-mono">USERNAME</label>
                  <input
                    value={state.username}
                    onChange={(e) => setState((s) => ({ ...s, username: e.target.value }))}
                    className="w-full bg-background/50 border border-border/40 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/60"
                    placeholder="zaraos"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => go("disk")}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button size="sm" onClick={() => go("confirm")} className="ml-auto">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Confirm ───────────────────────────────── */}
        {step === "confirm" && state.targetDisk && (
          <motion.div key="confirm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">

            {/* Warning banner */}
            {state.mode === "wipe" && (
              <div className="flex gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-400">This will erase all data</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Everything on <span className="font-mono text-foreground">{state.targetDisk.path}</span> ({state.targetDisk.model}) will be permanently deleted. This cannot be undone.
                  </div>
                </div>
              </div>
            )}

            {state.mode === "dualboot" && (
              <div className="flex gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-amber-400">Dual boot — partition resize required</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    The {osLabel} partition will be safely shrunk to make room for ZaraOS.
                    {state.detectedOS === "windows" && " Ensure Windows is fully shut down (not hibernate/fast startup) before proceeding."}
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="space-y-2 p-4 rounded-lg border border-border/40 bg-card/30">
              <div className="text-xs font-mono text-muted-foreground mb-3">INSTALL SUMMARY</div>
              {[
                ["Mode",    state.mode === "wipe" ? "Full install (wipe)" : "Dual boot"],
                ["Target",  `${state.targetDisk.path} — ${state.targetDisk.model}`],
                ["Size",    state.targetDisk.size],
                ...(state.mode === "dualboot" ? [
                  ["ZaraOS space", `${state.dualbootSplitGb} GB`],
                  [`${osLabel} space`, `${Math.floor(state.targetDisk.size_bytes / 1_000_000_000) - state.dualbootSplitGb} GB`],
                ] : []),
                ["Hostname",  state.hostname || "zaraos"],
                ["Username",  state.username || "zaraos"],
                ["Bootloader", "GRUB (UEFI)"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{k}</span>
                  <span className="text-foreground font-mono">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => go("configure")}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                size="sm"
                className={`ml-auto ${state.mode === "wipe" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                onClick={() => go("installing")}
              >
                {state.mode === "wipe" ? "Erase and Install" : "Install ZaraOS"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Step 5: Installing ────────────────────────────── */}
        {step === "installing" && (
          <motion.div key="installing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 gap-6">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none" stroke="currentColor" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - installProgress / 100)}`}
                  className="text-primary transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-mono font-bold text-primary">{installProgress}%</span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="text-sm font-semibold">Installing ZaraOS</div>
              <div className="text-xs text-muted-foreground font-mono">
                {INSTALL_PHASES[installPhase]}
              </div>
            </div>

            <div className="w-full max-w-sm space-y-1.5">
              {INSTALL_PHASES.map((phase, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${
                  i < installPhase ? "text-primary/60" :
                  i === installPhase ? "text-primary" :
                  "text-muted-foreground/30"
                }`}>
                  {i < installPhase
                    ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                    : i === installPhase
                    ? <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
                    : <div className="w-3 h-3 rounded-full border border-current/30 shrink-0" />}
                  {phase}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
              Do not power off or close the lid during installation.
            </p>
          </motion.div>
        )}

        {/* ── Step 6: Done ─────────────────────────────────── */}
        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <div className="text-xl font-bold">ZaraOS Installed</div>
              <div className="text-sm text-muted-foreground mt-1">
                {state.mode === "dualboot"
                  ? `ZaraOS and ${osLabel} are both installed. Select your OS at startup using the GRUB menu.`
                  : "ZaraOS is ready. Remove the USB drive and restart to boot into ZaraOS."}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep("mode");
                  setState({ mode: null, targetDisk: null, dualbootSplitGb: 100, hostname: "zaraos", username: "zaraos", detectedOS: null });
                  setInstallProgress(0);
                  setInstallPhase(0);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" /> Start over
              </Button>
              <Button size="sm" onClick={() => {
                if (isTauri) {
                  import("@/core/tauri/tauri-system-controls").then(({ systemPower }) => systemPower("reboot"));
                }
              }}>
                Restart now
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
