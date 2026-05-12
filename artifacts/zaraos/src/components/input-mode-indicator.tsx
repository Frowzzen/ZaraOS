// ============================================================
// Input Mode Indicator
// Shows the current input mode in the sidebar.
// Clicking cycles through modes. Right-click (or long press)
// opens the mode picker for direct selection.
// ============================================================

import { useState } from "react";
import { useInputMode, INPUT_MODE_META } from "@/core/input-mode";
import { Mic, Hand, Keyboard, Layers, X } from "lucide-react";
import type { InputMode } from "@/core/types";

const MODE_ICONS: Record<InputMode, React.ReactNode> = {
  hybrid:  <Layers className="w-3.5 h-3.5" />,
  voice:   <Mic className="w-3.5 h-3.5" />,
  gesture: <Hand className="w-3.5 h-3.5" />,
  text:    <Keyboard className="w-3.5 h-3.5" />,
};

const ALL_MODES: InputMode[] = ["hybrid", "voice", "gesture", "text"];

export function InputModeIndicator() {
  const { mode, setMode, cycleMode } = useInputMode();
  const [pickerOpen, setPickerOpen] = useState(false);

  const meta = INPUT_MODE_META[mode];

  return (
    <div className="relative w-full">
      {/* Mode picker dropdown */}
      {pickerOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 rounded-xl overflow-hidden z-50" style={{ background: "linear-gradient(145deg,#ffffff,#f0f2f8)", border: "1px solid rgba(148,163,184,0.20)", boxShadow: "6px 6px 20px rgba(166,180,200,0.35), -4px -4px 14px rgba(255,255,255,0.90)" }}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Input Mode
            </span>
            <button
              onClick={() => setPickerOpen(false)}
              className="text-muted-foreground hover:text-slate-900 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {ALL_MODES.map((m) => {
            const mm = INPUT_MODE_META[m];
            const isActive = m === mode;
            return (
              <button
                key={m}
                onClick={() => { setMode(m); setPickerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:bg-slate-50 ${
                  isActive ? mm.bgColor : ""
                }`}
                data-testid={`mode-option-${m}`}
              >
                <span className={isActive ? mm.color : "text-muted-foreground"}>
                  {MODE_ICONS[m]}
                </span>
                <div className="min-w-0">
                  <div className={`text-xs font-medium ${isActive ? "text-slate-900" : "text-muted-foreground"}`}>
                    {mm.label}
                  </div>
                  {isActive && (
                    <div className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
                      Active
                    </div>
                  )}
                </div>
                {isActive && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full ${mm.color.replace("text-", "bg-")}`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Indicator button */}
      <button
        onClick={() => setPickerOpen((v) => !v)}
        onDoubleClick={cycleMode}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:bg-slate-50 ${meta.borderColor} ${meta.bgColor}`}
        title={`${meta.label} — click to change`}
        data-testid="button-input-mode-indicator"
      >
        <span className={meta.color}>{MODE_ICONS[mode]}</span>
        <div className="hidden md:flex flex-col items-start min-w-0">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-none">
            Input Mode
          </span>
          <span className={`text-xs font-bold ${meta.color} leading-tight mt-0.5`}>
            {meta.shortLabel}
          </span>
        </div>
        {/* Active inputs mini-badges */}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          {(mode === "hybrid" || mode === "voice") && (
            <Mic className="w-2.5 h-2.5 text-amber-400/60" />
          )}
          {(mode === "hybrid" || mode === "gesture") && (
            <Hand className="w-2.5 h-2.5 text-purple-400/60" />
          )}
          <Keyboard className="w-2.5 h-2.5 text-green-400/60" />
        </div>
      </button>
    </div>
  );
}
