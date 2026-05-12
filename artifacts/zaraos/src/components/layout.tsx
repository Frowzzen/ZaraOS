import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
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
  Power,
  RotateCcw,
  Moon,
  Lock,
  HardDriveDownload,
} from "lucide-react";
import { systemPower } from "@/core/tauri/tauri-system-controls";
import { isTauriRuntime } from "@/core/tauri/tauri-bridge";
import { ZaraOSIcon } from "@/components/zaraos-logo";
import { GlobalCommandBox } from "@/components/global-command-box";
import { GestureOverlay } from "@/components/gesture-overlay";
import { useInputMode } from "@/core/input-mode";
import { gestureEngine } from "@/lib/gesture-engine";
import { zaraRuntime } from "@/core/zara-runtime";

interface LayoutProps {
  children: React.ReactNode;
}

const apps = [
  { href: "/",             icon: Home,             label: "Desktop"      },
  { href: "/assistant",    icon: MessageSquare,     label: "Assistant"    },
  { href: "/console",      icon: Terminal,          label: "Console"      },
  { href: "/apps",         icon: LayoutGrid,        label: "Apps"         },
  { href: "/files",        icon: FolderOpen,        label: "Files"        },
  { href: "/media",        icon: PlaySquare,        label: "Media"        },
  { href: "/settings",     icon: Settings,          label: "Settings"     },
  { href: "/privacy",      icon: ShieldAlert,       label: "Privacy"      },
  { href: "/ai-providers", icon: Cpu,               label: "AI Providers" },
  { href: "/memory",       icon: Brain,             label: "Memory"       },
  { href: "/developers",   icon: Code,              label: "Developers"   },
  { href: "/skills",       icon: Zap,               label: "Skills"       },
  { href: "/install",      icon: HardDriveDownload, label: "Install"      },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [clock, setClock] = useState(new Date());
  const isTauri = isTauriRuntime();
  const { toggleCommandBox, voiceActive, gestureActive, toggleVoice, toggleGesture } = useInputMode();

  const isDesktop = location === "/";
  const activeApp = apps.find((a) => a.href === location) ?? apps[0];

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    gestureEngine.setCurrentPath(location);
  }, [location]);

  useEffect(() => {
    const unsub = gestureEngine.onGesture((_gesture, command) => {
      zaraRuntime.executeCommand(command, "gesture");
    });
    return unsub;
  }, []);

  const timeStr = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="h-screen w-full overflow-hidden flex flex-col text-foreground font-sans"
      style={{ background: "hsl(240 33% 4%)" }}
    >
      {/* ── Desktop wallpaper ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 90% 55% at 50% -5%, rgba(0,240,255,0.07) 0%, transparent 65%),
            radial-gradient(ellipse 50% 45% at 95% 95%, rgba(138,43,226,0.05) 0%, transparent 60%),
            radial-gradient(circle at 1px 1px, rgba(0,240,255,0.035) 1px, transparent 0)
          `,
          backgroundSize: "100% 100%, 100% 100%, 30px 30px",
        }}
      />

      {/* ── Top menu bar ── */}
      <header
        className="relative z-50 h-9 flex-shrink-0 flex items-center px-4 gap-4"
        style={{
          background: "rgba(4,6,16,0.88)",
          backdropFilter: "blur(24px) saturate(1.4)",
          borderBottom: "1px solid rgba(0,240,255,0.055)",
        }}
      >
        {/* Left: logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <ZaraOSIcon size={13} className="text-primary drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" />
          <span className="text-[11px] font-bold text-white/80 tracking-widest hidden sm:block">ZaraOS</span>
          <span className="text-[9px] font-mono text-primary/35 tracking-widest hidden sm:block">ALPHA 0.6</span>
        </div>

        {/* Center: active app name */}
        <div className="flex-1 flex justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={location}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              transition={{ duration: 0.12 }}
              className="text-[11px] font-medium text-white/45 tracking-wide"
            >
              {isDesktop ? "" : activeApp.label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Right: system tray */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={toggleVoice}
            title={voiceActive ? "Voice on" : "Voice off"}
            className={`transition-colors ${
              voiceActive ? "text-amber-400" : "text-white/20 hover:text-white/45"
            }`}
          >
            {voiceActive
              ? <Mic style={{ width: "0.75rem", height: "0.75rem" }} />
              : <MicOff style={{ width: "0.75rem", height: "0.75rem" }} />
            }
          </button>

          <button
            onClick={toggleGesture}
            title={gestureActive ? "Gesture on" : "Gesture off"}
            className={`transition-colors ${
              gestureActive ? "text-purple-400" : "text-white/20 hover:text-white/45"
            }`}
          >
            <Hand style={{ width: "0.75rem", height: "0.75rem" }} />
          </button>

          <span className="text-[11px] font-mono text-white/60 tabular-nums">{timeStr}</span>
        </div>
      </header>

      {/* ── Main surface ── */}
      <div className="relative z-10 flex-1 overflow-hidden flex flex-col min-h-0">
        {isDesktop ? (
          /* Desktop view — content sits directly on the wallpaper */
          <div className="flex-1 overflow-y-auto min-h-0">
            {children}
          </div>
        ) : (
          /* App window — floating window chrome */
          <div className="flex-1 flex flex-col items-center p-2.5 pb-0 overflow-hidden min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={location}
                initial={{ opacity: 0, scale: 0.975, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.975, y: -6 }}
                transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full max-w-[1440px] h-full flex flex-col min-h-0"
                style={{
                  background: "rgba(7,10,24,0.93)",
                  backdropFilter: "blur(28px) saturate(1.3)",
                  border: "1px solid rgba(0,240,255,0.09)",
                  borderBottom: "none",
                  borderRadius: "12px 12px 0 0",
                  boxShadow:
                    "0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.045)",
                }}
              >
                {/* Window title bar */}
                <div
                  className="flex items-center h-10 px-4 flex-shrink-0 gap-3"
                  style={{
                    borderBottom: "1px solid rgba(0,240,255,0.06)",
                    borderRadius: "12px 12px 0 0",
                    background: "rgba(0,0,0,0.15)",
                  }}
                >
                  {/* Traffic lights */}
                  <div className="flex items-center gap-[6px]">
                    <Link href="/">
                      <button
                        className="w-3 h-3 rounded-full flex-shrink-0 transition-opacity hover:opacity-100 opacity-80 group"
                        title="Close (go to desktop)"
                        style={{ background: "#ff5f57" }}
                      />
                    </Link>
                    <button
                      className="w-3 h-3 rounded-full flex-shrink-0 opacity-30 cursor-default"
                      style={{ background: "#febc2e" }}
                    />
                    <button
                      className="w-3 h-3 rounded-full flex-shrink-0 opacity-30 cursor-default"
                      style={{ background: "#28c840" }}
                    />
                  </div>

                  {/* App icon + name — centered */}
                  <div className="flex-1 flex items-center justify-center gap-1.5">
                    <activeApp.icon
                      className="text-primary/50"
                      style={{ width: "0.8125rem", height: "0.8125rem" }}
                    />
                    <span className="text-[11px] font-medium text-white/40 tracking-wide">
                      {activeApp.label}
                    </span>
                  </div>

                  {/* Balance spacer */}
                  <div style={{ width: "54px" }} />
                </div>

                {/* Window content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="animate-in fade-in duration-150 h-full">
                    {children}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Bottom dock ── */}
      <div
        className="relative z-50 flex-shrink-0 flex items-center justify-center px-4"
        style={{
          height: "72px",
          background: "rgba(4,6,16,0.82)",
          backdropFilter: "blur(24px) saturate(1.4)",
          borderTop: "1px solid rgba(0,240,255,0.055)",
        }}
      >
        <div className="flex items-center gap-0.5">
          {/* App icons */}
          {apps.map((app) => {
            const Icon = app.icon;
            const isActive = location === app.href;
            return (
              <Link key={app.href} href={app.href}>
                <div className="relative group flex flex-col items-center px-0.5">
                  <button
                    data-testid={`dock-${app.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? "border border-primary/25"
                        : "border border-transparent hover:border-white/8 group-hover:scale-110"
                    }`}
                    style={
                      isActive
                        ? {
                            background: "rgba(0,240,255,0.1)",
                            boxShadow: "0 0 18px rgba(0,240,255,0.12)",
                            transform: "scale(1.08)",
                          }
                        : { background: "transparent" }
                    }
                  >
                    <Icon
                      style={{ width: "1.125rem", height: "1.125rem" }}
                      className={`transition-colors ${
                        isActive
                          ? "text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                          : "text-white/40 group-hover:text-white/75"
                      }`}
                    />
                  </button>

                  {/* Active dot */}
                  <div
                    className="w-1 h-1 rounded-full mt-0.5 transition-all duration-200"
                    style={{
                      background: isActive ? "hsl(184 100% 50%)" : "transparent",
                      boxShadow: isActive ? "0 0 6px rgba(0,240,255,0.8)" : "none",
                    }}
                  />

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                    <div
                      className="px-2 py-1 rounded-lg text-[10px] font-medium text-white/75 whitespace-nowrap"
                      style={{
                        background: "rgba(7,10,24,0.97)",
                        border: "1px solid rgba(0,240,255,0.1)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                      }}
                    >
                      {app.label}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Separator */}
          <div
            className="mx-2 self-center"
            style={{ width: "1px", height: "28px", background: "rgba(255,255,255,0.07)" }}
          />

          {/* Command box */}
          <div className="relative group flex flex-col items-center px-0.5">
            <button
              onClick={toggleCommandBox}
              data-testid="button-open-command-box"
              title="Command Box (Ctrl+Space)"
              className="w-11 h-11 rounded-xl flex items-center justify-center border border-transparent hover:border-white/8 group-hover:scale-110 transition-all duration-200"
            >
              <TerminalSquare
                style={{ width: "1.125rem", height: "1.125rem" }}
                className="text-white/40 group-hover:text-white/75 transition-colors"
              />
            </button>
            <div className="w-1 h-1 mt-0.5" />
            <div className="absolute bottom-full mb-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
              <div
                className="px-2 py-1 rounded-lg text-[10px] font-medium text-white/75 whitespace-nowrap"
                style={{ background: "rgba(7,10,24,0.97)", border: "1px solid rgba(0,240,255,0.1)" }}
              >
                Command
              </div>
            </div>
          </div>

          {/* Power */}
          <div className="relative">
            <div className="group flex flex-col items-center px-0.5">
              <button
                onClick={() => setShowPowerMenu((v) => !v)}
                data-testid="button-power-menu"
                title="Power"
                className="w-11 h-11 rounded-xl flex items-center justify-center border border-transparent hover:border-red-500/15 hover:bg-red-500/8 group-hover:scale-110 transition-all duration-200"
              >
                <Power
                  style={{ width: "1.125rem", height: "1.125rem" }}
                  className="text-white/30 group-hover:text-red-400 transition-colors"
                />
              </button>
              <div className="w-1 h-1 mt-0.5" />
            </div>

            {/* Power menu */}
            {showPowerMenu && (
              <div
                className="absolute bottom-full mb-3 right-0 rounded-xl overflow-hidden shadow-2xl min-w-[170px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                style={{
                  background: "rgba(7,10,24,0.98)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
                }}
              >
                {[
                  { label: "Lock Screen", icon: Lock,      action: "lock"     as const, color: "text-primary"   },
                  { label: "Suspend",     icon: Moon,      action: "suspend"  as const, color: "text-blue-400"  },
                  { label: "Restart",     icon: RotateCcw, action: "reboot"   as const, color: "text-amber-400" },
                  { label: "Shut Down",   icon: Power,     action: "shutdown" as const, color: "text-red-400"   },
                ].map(({ label, icon: Icon, action, color }) => (
                  <button
                    key={action}
                    onClick={() => {
                      setShowPowerMenu(false);
                      if (isTauri) void systemPower(action);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${
                      isTauri ? color : "text-muted-foreground/35"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{label}</span>
                    {!isTauri && (
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground/25">native</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Global overlays ── */}
      <GlobalCommandBox />
      {gestureActive && <GestureOverlay onClose={toggleGesture} />}
    </div>
  );
}
