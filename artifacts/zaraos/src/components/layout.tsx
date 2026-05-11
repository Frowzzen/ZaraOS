import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  MessageSquare,
  Terminal,
  LayoutGrid,
  FolderOpen,
  PlaySquare,
  Settings,
  ShieldAlert,
  Cpu,
  Code,
  Zap,
  Brain,
  TerminalSquare,
  Mic,
  MicOff,
  Hand,
  Keyboard,
} from "lucide-react";
import { GlobalCommandBox } from "@/components/global-command-box";
import { InputModeIndicator } from "@/components/input-mode-indicator";
import { VoiceWaveform } from "@/components/voice-waveform";
import { useInputMode } from "@/core/input-mode";
import { gestureEngine } from "@/lib/gesture-engine";
import { zaraRuntime } from "@/core/zara-runtime";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/",             icon: Home,         label: "Dashboard"    },
  { href: "/assistant",    icon: MessageSquare, label: "Assistant"    },
  { href: "/console",      icon: Terminal,      label: "Console"      },
  { href: "/apps",         icon: LayoutGrid,    label: "Apps"         },
  { href: "/files",        icon: FolderOpen,    label: "Files"        },
  { href: "/media",        icon: PlaySquare,    label: "Media"        },
  { href: "/settings",     icon: Settings,      label: "Settings"     },
  { href: "/privacy",      icon: ShieldAlert,   label: "Privacy"      },
  { href: "/ai-providers", icon: Cpu,           label: "AI Providers" },
  { href: "/memory",       icon: Brain,         label: "Memory"       },
  { href: "/developers",   icon: Code,          label: "Developers"   },
  { href: "/skills",       icon: Zap,           label: "Skills"       },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const {
    toggleCommandBox,
    voiceActive,
    gestureActive,
    keyboardOnly,
    toggleVoice,
    toggleGesture,
  } = useInputMode();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Keep gesture engine aware of current panel for SWIPE_LEFT/RIGHT routing
  useEffect(() => {
    gestureEngine.setCurrentPath(location);
  }, [location]);

  // Wire gesture engine output into the Zara Runtime
  useEffect(() => {
    gestureEngine.onGesture((_gesture, command) => {
      zaraRuntime.executeCommand(command, "gesture");
    });
  }, []);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-16 md:w-64 border-r border-border bg-card flex flex-col justify-between items-center md:items-stretch py-5 flex-shrink-0 z-10 shadow-xl shadow-cyan-900/5">

        {/* Top: logo + nav */}
        <div className="flex flex-col items-center md:items-start w-full px-0 md:px-4 gap-6 min-h-0">

          {/* Logo */}
          <div className="flex items-center gap-3 px-1 md:px-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 flex-shrink-0">
              <span className="font-mono font-bold text-primary-foreground text-lg">Z</span>
            </div>
            <div className="hidden md:block">
              <h1 className="font-bold text-lg tracking-tight text-white leading-none">ZaraOS</h1>
              <p className="text-[10px] text-primary/70 font-mono tracking-widest uppercase mt-0.5">Alpha 0.5</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 w-full overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200
                      ${isActive
                        ? "bg-primary/10 text-primary border border-primary/25 shadow-[inset_0_0_12px_rgba(0,240,255,0.08)]"
                        : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                  >
                    <Icon
                      className={`flex-shrink-0 ${isActive ? "drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" : ""}`}
                      style={{ width: "1.0625rem", height: "1.0625rem" }}
                    />
                    <span className="hidden md:block font-medium text-sm">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: hardware toggles + mode indicator + command box + status */}
        <div className="px-0 md:px-4 flex flex-col items-center md:items-start gap-2.5 flex-shrink-0">
          <div className="w-full h-px bg-border mb-0.5" />

          {/* ── Voice & Gesture Quick Toggles ── */}
          <div className="w-full flex flex-col gap-1.5">
            {/* Section label — desktop only */}
            <span className="hidden md:block text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest px-1">
              Input Hardware
            </span>

            {/* Two toggle buttons side-by-side */}
            <div className="flex gap-1.5 w-full">
              {/* Voice toggle */}
              <button
                onClick={toggleVoice}
                title={voiceActive ? "Voice on — click to disable" : "Voice off — click to enable"}
                data-testid="button-toggle-voice"
                className={`flex-1 flex items-center justify-center md:justify-start gap-1.5 px-2 py-2 rounded-lg border transition-all duration-200 group ${
                  voiceActive
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    : "border-white/8 bg-white/3 text-muted-foreground/35 hover:border-white/15 hover:text-muted-foreground/60"
                }`}
              >
                {voiceActive
                  ? <Mic style={{ width: "0.875rem", height: "0.875rem" }} className="flex-shrink-0" />
                  : <MicOff style={{ width: "0.875rem", height: "0.875rem" }} className="flex-shrink-0" />
                }
                <span className="hidden md:block text-xs font-medium leading-none">
                  Voice
                </span>
                {/* Active indicator — waveform when on, dim dot when off */}
                <span className="hidden md:block ml-auto flex-shrink-0">
                  {voiceActive
                    ? <VoiceWaveform active color="amber" size="xs" />
                    : <span className="block w-1.5 h-1.5 rounded-full bg-white/10" />
                  }
                </span>
              </button>

              {/* Gesture toggle */}
              <button
                onClick={toggleGesture}
                title={gestureActive ? "Gesture on — click to disable" : "Gesture off — click to enable"}
                data-testid="button-toggle-gesture"
                className={`flex-1 flex items-center justify-center md:justify-start gap-1.5 px-2 py-2 rounded-lg border transition-all duration-200 group ${
                  gestureActive
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                    : "border-white/8 bg-white/3 text-muted-foreground/35 hover:border-white/15 hover:text-muted-foreground/60"
                }`}
              >
                <Hand style={{ width: "0.875rem", height: "0.875rem" }} className="flex-shrink-0" />
                <span className="hidden md:block text-xs font-medium leading-none">
                  Gesture
                </span>
                <span className={`hidden md:block ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  gestureActive ? "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.6)]" : "bg-white/10"
                }`} />
              </button>
            </div>

            {/* Keyboard-only indicator — shown when both are off */}
            {keyboardOnly && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-green-500/8 border border-green-500/15 animate-in fade-in duration-200">
                <Keyboard style={{ width: "0.75rem", height: "0.75rem" }} className="text-green-400 flex-shrink-0" />
                <span className="text-[11px] text-green-400 font-medium">Keyboard only</span>
              </div>
            )}
          </div>

          {/* Input Mode Indicator */}
          <div className="w-full">
            <InputModeIndicator />
          </div>

          {/* Command Box trigger */}
          <button
            onClick={toggleCommandBox}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5 hover:border-white/20 transition-all duration-200"
            title="Open command box (Ctrl+Space)"
            data-testid="button-open-command-box"
          >
            <TerminalSquare style={{ width: "0.875rem", height: "0.875rem" }} className="flex-shrink-0" />
            <div className="hidden md:flex flex-col items-start min-w-0">
              <span className="text-xs font-medium leading-none">Command Box</span>
              <span className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">Ctrl+Space</span>
            </div>
          </button>

          {/* System Status */}
          <div className="flex flex-col gap-0.5 w-full">
            <span className="text-[10px] text-muted-foreground font-mono hidden md:block uppercase tracking-widest">
              System Status
            </span>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse flex-shrink-0" />
              <span className="text-sm font-medium hidden md:block">Optimal</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-background/95">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none -z-10" />
        <div className="flex-1 overflow-y-auto p-5 md:p-8 z-0">
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 h-full">
            {children}
          </div>
        </div>
      </main>

      {/* ── Global Command Box overlay ── */}
      <GlobalCommandBox />
    </div>
  );
}
