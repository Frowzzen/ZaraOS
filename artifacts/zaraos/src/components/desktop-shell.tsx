import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { isTauriRuntime } from "@/core/tauri/tauri-bridge";
import { systemPower } from "@/core/tauri/tauri-system-controls";
import { ZaraOSIcon } from "@/components/zaraos-logo";
import { GlobalCommandBox } from "@/components/global-command-box";
import { GestureOverlay } from "@/components/gesture-overlay";
import { useInputMode } from "@/core/input-mode";
import { gestureEngine } from "@/lib/gesture-engine";
import { zaraRuntime } from "@/core/zara-runtime";
import {
  Mic,
  MicOff,
  Search,
  X,
  Power,
  RotateCcw,
  Moon,
  Lock,
} from "lucide-react";

// ── App registry ──────────────────────────────────────────────────────────────

type AppId =
  | "assistant" | "files"   | "settings"  | "console"
  | "browser"   | "privacy" | "ai-providers" | "memory"
  | "skills"    | "install" | "apps"      | "media" | "developers";

const appMeta: Record<AppId, { title: string; w: number; h: number }> = {
  assistant:      { title: "Zara Assistant",   w: 720,  h: 560 },
  files:          { title: "Files",            w: 860,  h: 560 },
  settings:       { title: "Settings",         w: 800,  h: 580 },
  console:        { title: "Console",          w: 820,  h: 520 },
  browser:        { title: "Browser",          w: 980,  h: 650 },
  privacy:        { title: "Privacy",          w: 720,  h: 520 },
  "ai-providers": { title: "AI Providers",     w: 760,  h: 560 },
  memory:         { title: "Memory",           w: 740,  h: 540 },
  skills:         { title: "Skills",           w: 760,  h: 540 },
  install:        { title: "Install ZaraOS",   w: 820,  h: 580 },
  apps:           { title: "Applications",     w: 840,  h: 580 },
  media:          { title: "Media",            w: 800,  h: 540 },
  developers:     { title: "Developer Portal", w: 820,  h: 560 },
};

const Assistant   = lazy(() => import("@/pages/assistant"));
const Files       = lazy(() => import("@/pages/files"));
const Settings    = lazy(() => import("@/pages/settings"));
const Console     = lazy(() => import("@/pages/console"));
const Browser     = lazy(() => import("@/pages/browser"));
const Privacy     = lazy(() => import("@/pages/privacy"));
const AIProviders = lazy(() => import("@/pages/ai-providers"));
const Memory      = lazy(() => import("@/pages/memory"));
const Skills      = lazy(() => import("@/pages/skills"));
const Install     = lazy(() => import("@/pages/install"));
const Apps        = lazy(() => import("@/pages/apps"));
const Media       = lazy(() => import("@/pages/media"));
const Developers  = lazy(() => import("@/pages/developers"));

const appComponents: Record<AppId, React.LazyExoticComponent<React.ComponentType>> = {
  assistant: Assistant,
  files: Files,
  settings: Settings,
  console: Console,
  browser: Browser,
  privacy: Privacy,
  "ai-providers": AIProviders,
  memory: Memory,
  skills: Skills,
  install: Install,
  apps: Apps,
  media: Media,
  developers: Developers,
};

// ── Command parser ────────────────────────────────────────────────────────────

function parseCommand(input: string): AppId {
  const q = input.toLowerCase().trim();
  if (/\b(file|folder|document|explorer|finder|director)\b/.test(q)) return "files";
  if (/\b(setting|preference|config|system pref)\b/.test(q))          return "settings";
  if (/\b(browser|internet|web|surf|http|www\.)\b/.test(q))           return "browser";
  if (/\b(console|terminal|shell|command line|cmd)\b/.test(q))        return "console";
  if (/\b(privacy|security|permission|mic|camera)\b/.test(q))         return "privacy";
  if (/\b(memory|remember|history)\b/.test(q))                        return "memory";
  if (/\b(ai|model|provider|ollama|llm|api key)\b/.test(q))           return "ai-providers";
  if (/\b(skill|plugin|extension|capabilit)\b/.test(q))               return "skills";
  if (/\b(install|usb|partition|disk|grub)\b/.test(q))                return "install";
  if (/\b(app|application|launcher|program|software)\b/.test(q))      return "apps";
  if (/\b(media|music|video|audio|player|movie)\b/.test(q))           return "media";
  if (/\b(developer|dev portal|plugin api)\b/.test(q))                return "developers";
  return "assistant";
}

// ── Window state ──────────────────────────────────────────────────────────────

interface WinState {
  id: string;
  appId: AppId;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
}

let zCounter = 100;

// ── Desktop shell ─────────────────────────────────────────────────────────────

export function DesktopShell() {
  const [windows, setWindows] = useState<WinState[]>([]);
  const [command, setCommand] = useState("");
  const [clock, setClock] = useState(new Date());
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [wallpaper] = useState("/wallpaper.jpg");

  const isTauri = isTauriRuntime();
  const { voiceActive, gestureActive, toggleVoice, toggleGesture } = useInputMode();
  const inputRef = useRef<HTMLInputElement>(null);
  const windowsRef = useRef<WinState[]>([]);

  useEffect(() => { windowsRef.current = windows; }, [windows]);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsub = gestureEngine.onGesture((_g, cmd) => {
      zaraRuntime.executeCommand(cmd, "gesture");
    });
    return unsub;
  }, []);

  // Ctrl+Space focuses the command bar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Window management ────────────────────────────────────────────────────────

  const focusWindow = useCallback((id: string) => {
    zCounter++;
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: zCounter } : w)));
  }, []);

  const openWindow = useCallback((appId: AppId) => {
    setWindows((prev) => {
      const existing = prev.find((w) => w.appId === appId);
      if (existing) {
        zCounter++;
        return prev.map((w) =>
          w.id === existing.id ? { ...w, zIndex: zCounter, minimized: false } : w
        );
      }
      const meta = appMeta[appId];
      const count = prev.filter((w) => !w.minimized).length;
      const offset = (count % 6) * 28;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = Math.max(8, Math.round((vw - meta.w) / 2) + offset);
      const y = Math.max(44, Math.round((vh - meta.h) / 2 - 20) + offset);
      zCounter++;
      return [
        ...prev,
        { id: crypto.randomUUID(), appId, x, y, width: meta.w, height: meta.h, zIndex: zCounter, minimized: false },
      ];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    zCounter++;
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: false, zIndex: zCounter } : w))
    );
  }, []);

  // ── Drag ────────────────────────────────────────────────────────────────────

  const startDrag = useCallback(
    (winId: string, startE: React.MouseEvent) => {
      startE.preventDefault();
      startE.stopPropagation();
      focusWindow(winId);

      const win = windowsRef.current.find((w) => w.id === winId);
      if (!win) return;
      const offsetX = startE.clientX - win.x;
      const offsetY = startE.clientY - win.y;

      const onMove = (e: MouseEvent) => {
        setWindows((prev) =>
          prev.map((w) =>
            w.id === winId
              ? { ...w, x: Math.max(0, e.clientX - offsetX), y: Math.max(36, e.clientY - offsetY) }
              : w
          )
        );
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [focusWindow]
  );

  // ── Command bar ──────────────────────────────────────────────────────────────

  const handleCommand = useCallback(
    (input: string) => {
      const q = input.trim();
      if (!q) return;
      const appId = parseCommand(q);
      openWindow(appId);
      setCommand("");
    },
    [openWindow]
  );

  // ── Clock ────────────────────────────────────────────────────────────────────

  const timeStr = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = clock.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const minimized = windows.filter((w) => w.minimized);
  const visible   = windows.filter((w) => !w.minimized);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundImage: `url('${wallpaper}')`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 h-9 z-[9000] flex items-center px-4 gap-3"
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(24px) saturate(1.6)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
        }}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <ZaraOSIcon size={13} className="text-black/50" />
          <span className="text-[10px] font-bold text-black/40 tracking-widest hidden sm:block">ZaraOS</span>
        </div>

        <div className="flex-1" />

        {/* Voice toggle */}
        <button
          onClick={toggleVoice}
          data-testid="button-toggle-voice"
          title={voiceActive ? "Voice on" : "Voice off"}
          className={`transition-colors ${voiceActive ? "text-black/70" : "text-black/25 hover:text-black/45"}`}
        >
          {voiceActive
            ? <Mic style={{ width: "0.75rem", height: "0.75rem" }} />
            : <MicOff style={{ width: "0.75rem", height: "0.75rem" }} />
          }
        </button>

        {/* Clock */}
        <div className="flex flex-col items-end leading-none gap-0.5 select-none">
          <span className="text-[11px] font-mono text-black/55 tabular-nums">{timeStr}</span>
          <span className="text-[9px] font-mono text-black/30">{dateStr}</span>
        </div>

        {/* Power */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowPowerMenu((v) => !v)}
            data-testid="button-power-menu"
            className="text-black/22 hover:text-black/50 transition-colors"
            title="Power"
          >
            <Power style={{ width: "0.75rem", height: "0.75rem" }} />
          </button>

          {showPowerMenu && (
            <div
              className="absolute top-full mt-1.5 right-0 rounded-2xl overflow-hidden min-w-[170px] z-[9999]"
              style={{
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(32px) saturate(1.8)",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {([
                { label: "Lock Screen", icon: Lock,      action: "lock"     as const },
                { label: "Suspend",     icon: Moon,      action: "suspend"  as const },
                { label: "Restart",     icon: RotateCcw, action: "reboot"   as const },
                { label: "Shut Down",   icon: Power,     action: "shutdown" as const },
              ] as const).map(({ label, icon: Icon, action }) => (
                <button
                  key={action}
                  onClick={() => { setShowPowerMenu(false); if (isTauri) void systemPower(action); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-black/50 hover:text-black/80 hover:bg-black/4 transition-colors"
                >
                  <Icon style={{ width: "0.8125rem", height: "0.8125rem" }} className="flex-shrink-0" />
                  <span className="text-xs">{label}</span>
                  {!isTauri && <span className="ml-auto text-[9px] text-black/20 font-mono">native</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Windows layer ───────────────────────────────────────────────────── */}
      <div className="absolute inset-0 top-9">
        <AnimatePresence>
          {visible.map((win) => {
            const PageComponent = appComponents[win.appId];
            return (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, scale: 0.93, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 8 }}
                transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute flex flex-col"
                style={{
                  left: win.x,
                  top: win.y,
                  width: win.width,
                  height: win.height,
                  zIndex: win.zIndex,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.82)",
                  backdropFilter: "blur(40px) saturate(1.8)",
                  border: "1px solid rgba(255,255,255,0.55)",
                  boxShadow: "0 32px 72px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04)",
                }}
                onClick={() => focusWindow(win.id)}
              >
                {/* Title bar */}
                <div
                  className="flex items-center h-10 px-4 gap-3 flex-shrink-0 cursor-move"
                  style={{
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: "16px 16px 0 0",
                    background: "rgba(255,255,255,0.40)",
                  }}
                  onMouseDown={(e) => startDrag(win.id, e)}
                >
                  {/* Traffic lights */}
                  <div className="flex items-center gap-[6px] flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                      className="w-3 h-3 rounded-full flex-shrink-0 hover:brightness-110 transition-all"
                      style={{ background: "#ff5f57" }}
                      title="Close"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
                      className="w-3 h-3 rounded-full flex-shrink-0 hover:brightness-110 transition-all"
                      style={{ background: "#febc2e" }}
                      title="Minimize"
                    />
                    <button
                      className="w-3 h-3 rounded-full flex-shrink-0 opacity-25 cursor-default"
                      style={{ background: "#28c840" }}
                    />
                  </div>

                  {/* Title */}
                  <div className="flex-1 flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-medium text-black/38 tracking-wide select-none">
                      {appMeta[win.appId].title}
                    </span>
                  </div>

                  <div style={{ width: 54 }} className="flex-shrink-0" />
                </div>

                {/* Content */}
                <div
                  className="flex-1 overflow-hidden min-h-0"
                  style={{ borderRadius: "0 0 16px 16px" }}
                >
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full w-full">
                        <div className="w-5 h-5 rounded-full border border-black/10 border-t-black/40 animate-spin" />
                      </div>
                    }
                  >
                    <PageComponent />
                  </Suspense>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty desktop — big clock */}
        {windows.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <div
              className="font-mono tabular-nums leading-none"
              style={{
                fontSize: "clamp(4.5rem, 11vw, 9rem)",
                fontWeight: 200,
                letterSpacing: "-0.025em",
                color: "rgba(0,0,0,0.55)",
                textShadow: "0 2px 24px rgba(255,255,255,0.8)",
              }}
            >
              {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div
              className="font-mono tracking-widest uppercase mt-3"
              style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.28)", textShadow: "0 1px 8px rgba(255,255,255,0.6)" }}
            >
              {clock.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <div
              className="mt-10 text-xs font-mono tracking-widest"
              style={{ color: "rgba(0,0,0,0.20)", textShadow: "0 1px 6px rgba(255,255,255,0.5)" }}
            >
              Type a command or ask Zara anything
            </div>
          </div>
        )}
      </div>

      {/* ── Command bar ─────────────────────────────────────────────────────── */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[8999] flex flex-col items-center gap-2"
        style={{ width: "min(620px, 92vw)" }}
      >
        {/* Minimized window pills */}
        {minimized.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {minimized.map((win) => (
              <button
                key={win.id}
                onClick={() => restoreWindow(win.id)}
                className="px-3 py-1 rounded-lg text-[10px] font-medium transition-all"
                style={{
                  color: "rgba(0,0,0,0.45)",
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.55)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                {appMeta[win.appId].title}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(40px) saturate(1.8)",
            border: "1px solid rgba(255,255,255,0.60)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <Search style={{ width: "1rem", height: "1rem" }} className="text-black/25 flex-shrink-0" />

          <input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCommand(command);
              if (e.key === "Escape") setCommand("");
            }}
            placeholder='Ask Zara or say "open files", "browser", "settings"...'
            className="flex-1 bg-transparent text-sm text-black/70 outline-none placeholder:text-black/22 font-sans"
            data-testid="input-command-bar"
            autoFocus
          />

          {command && (
            <button
              onClick={() => setCommand("")}
              className="text-black/22 hover:text-black/50 transition-colors flex-shrink-0"
            >
              <X style={{ width: "0.875rem", height: "0.875rem" }} />
            </button>
          )}

          <button
            onClick={toggleVoice}
            data-testid="button-toggle-voice-bar"
            title={voiceActive ? "Voice on — click to disable" : "Voice off — click to enable"}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
              voiceActive
                ? "text-black/70"
                : "text-black/25 hover:text-black/50"
            }`}
            style={voiceActive ? { background: "rgba(0,0,0,0.06)" } : undefined}
          >
            {voiceActive
              ? <Mic style={{ width: "0.875rem", height: "0.875rem" }} />
              : <MicOff style={{ width: "0.875rem", height: "0.875rem" }} />
            }
          </button>

          {command.trim() && (
            <button
              onClick={() => handleCommand(command)}
              className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                color: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(0,0,0,0.10)",
              }}
            >
              Open
            </button>
          )}
        </div>
      </div>

      {/* ── Global overlays ─────────────────────────────────────────────────── */}
      <GlobalCommandBox />
      {gestureActive && <GestureOverlay onClose={toggleGesture} />}
    </div>
  );
}
