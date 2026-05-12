import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { isTauriRuntime } from "@/core/tauri/tauri-bridge";
import { systemPower, exitApp } from "@/core/tauri/tauri-system-controls";
import { ZaraOSIcon } from "@/components/zaraos-logo";
import { GlobalCommandBox } from "@/components/global-command-box";
import { GestureOverlay } from "@/components/gesture-overlay";
import { useInputMode } from "@/core/input-mode";
import { gestureEngine } from "@/lib/gesture-engine";
import { voiceEngine } from "@/lib/voice-engine";
import { zaraRuntime } from "@/core/zara-runtime";
import {
  Mic,
  MicOff,
  Search,
  X,
  Minus,
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
  // Note: use `settings?` (not `setting`) so the regex matches the plural "settings"
  // and `\b` anchors work correctly on both singular and plural forms.
  if (/\b(files?|folder|document|explorer|finder|director)\b/.test(q))  return "files";
  if (/\bsettings?\b|\bpreferences?\b|\bconfig\b/.test(q))               return "settings";
  if (/\b(browser|internet|web|surf|http|www\.)\b/.test(q))              return "browser";
  if (/\b(console|terminal|shell|command.?line|cmd)\b/.test(q))          return "console";
  if (/\b(privacy|security|permissions?)\b/.test(q))                     return "privacy";
  if (/\b(memory|remember|history)\b/.test(q))                           return "memory";
  if (/\b(ai\b|models?|provider|ollama|llm|api.?key)\b/.test(q))        return "ai-providers";
  if (/\b(skills?|plugin|extension|capabilit)\b/.test(q))               return "skills";
  if (/\b(install|usb|partition|disk|grub)\b/.test(q))                  return "install";
  if (/\b(apps?|application|launcher|program|software)\b/.test(q))      return "apps";
  if (/\b(media|music|video|audio|player|movie)\b/.test(q))             return "media";
  if (/\b(developer|dev.?portal|plugin.?api)\b/.test(q))                return "developers";
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

interface ZaraInlineResponse {
  query: string;
  reply: string;
  streaming: boolean;
}

export function DesktopShell() {
  const [windows, setWindows] = useState<WinState[]>([]);
  const [command, setCommand] = useState("");
  const [clock, setClock] = useState(new Date());
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");
  const [zaraInline, setZaraInline] = useState<ZaraInlineResponse | null>(null);

  const isTauri = isTauriRuntime();
  const { voiceActive, gestureActive, toggleVoice, toggleGesture, setVoice } = useInputMode();
  const inputRef = useRef<HTMLInputElement>(null);
  const windowsRef = useRef<WinState[]>([]);

  useEffect(() => { windowsRef.current = windows; }, [windows]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsub = gestureEngine.onGesture((_g, cmd) => {
      zaraRuntime.executeCommand(cmd, "gesture");
    });
    return unsub;
  }, []);

  // ── Voice engine wiring ───────────────────────────────────────────────────
  useEffect(() => {
    if (!voiceActive) {
      voiceEngine.abort();
      setInterimText("");
      return;
    }

    if (!voiceEngine.isSupported) {
      setVoiceError(
        voiceEngine.isTauriMode
          ? "Mic input coming in Alpha 0.7 — use the keyboard or command bar to talk to Zara."
          : "Voice input requires Chrome or Edge. Use the keyboard in this browser."
      );
      setVoice(false);
      setTimeout(() => setVoiceError(null), 6000);
      return;
    }

    voiceEngine.startListening();

    const unsubResult = voiceEngine.onResult((text, isFinal) => {
      if (isFinal) {
        setInterimText("");
        handleCommand(text);
        setVoice(false);
      } else {
        setInterimText(text);
      }
    });

    const unsubState = voiceEngine.onStateChange((state, errorMsg) => {
      if (state === "error" && errorMsg) {
        setVoiceError(errorMsg);
        setVoice(false);
        setTimeout(() => setVoiceError(null), 4000);
      }
      if (state === "idle") {
        setInterimText("");
      }
    });

    return () => {
      unsubResult();
      unsubState();
      voiceEngine.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceActive]);

  // Ctrl+Space focuses the command bar; Escape dismisses inline panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setZaraInline(null);
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
    async (input: string) => {
      const q = input.trim();
      if (!q) return;
      setCommand("");

      const appId = parseCommand(q);

      // Non-AI commands open their panel window as usual
      if (appId !== "assistant") {
        openWindow(appId);
        return;
      }

      // AI question — stream the answer inline above the bar, no window pop-up
      setZaraInline({ query: q, reply: "", streaming: true });
      let accumulated = "";
      try {
        await zaraRuntime.streamAssistantMessage(
          q,
          (chunk) => {
            if (!chunk.done) {
              accumulated += chunk.delta;
              setZaraInline((prev) => prev ? { ...prev, reply: accumulated } : null);
            }
          },
          "keyboard"
        );
        setZaraInline((prev) => prev ? { ...prev, reply: accumulated, streaming: false } : null);
        if (accumulated) voiceEngine.speak(accumulated);
      } catch {
        const err = "Something went wrong. Make sure Ollama is running.";
        setZaraInline((prev) => prev ? { ...prev, reply: err, streaming: false } : null);
      }
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
      style={{ background: "linear-gradient(145deg, #eef0f8 0%, #e8ebf5 35%, #ede8f8 70%, #eef1f9 100%)" }}
    >
      {/* ── Voice error toast ───────────────────────────────────────────────── */}
      {voiceError && (
        <div
          className="absolute top-11 left-1/2 -translate-x-1/2 z-[9500] px-4 py-2 rounded-xl text-xs font-mono text-red-500"
          style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(239,68,68,0.20)", backdropFilter: "blur(16px)", boxShadow: "0 4px 20px rgba(166,180,200,0.30)" }}
        >
          {voiceError}
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 h-9 z-[9000] flex items-center px-4 gap-3"
        style={{
          background: "rgba(248,249,254,0.88)",
          backdropFilter: "blur(24px) saturate(1.4)",
          borderBottom: "1px solid rgba(148,163,184,0.14)",
          boxShadow: "0 2px 12px rgba(166,180,200,0.18)",
        }}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <ZaraOSIcon size={13} className="text-indigo-500/80" />
          <span className="text-[10px] font-bold tracking-widest hidden sm:block text-gradient-accent" style={{ opacity: 0.7 }}>ZaraOS</span>
        </div>

        <div className="flex-1" />

        {/* Voice toggle */}
        <button
          onClick={toggleVoice}
          data-testid="button-toggle-voice"
          title={voiceActive ? "Voice on" : "Voice off"}
          className={`transition-colors ${voiceActive ? "text-indigo-500" : "text-slate-400 hover:text-slate-600"}`}
        >
          {voiceActive
            ? <Mic style={{ width: "0.75rem", height: "0.75rem" }} />
            : <MicOff style={{ width: "0.75rem", height: "0.75rem" }} />
          }
        </button>

        {/* Clock */}
        <div className="flex flex-col items-end leading-none gap-0.5 select-none">
          <span className="text-[11px] font-mono tabular-nums" style={{ color: "rgba(51,65,85,0.75)" }}>{timeStr}</span>
          <span className="text-[9px] font-mono" style={{ color: "rgba(100,116,135,0.55)" }}>{dateStr}</span>
        </div>

        {/* Power */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowPowerMenu((v) => !v)}
            data-testid="button-power-menu"
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Power"
          >
            <Power style={{ width: "0.75rem", height: "0.75rem" }} />
          </button>

          {showPowerMenu && (
            <div
              className="absolute top-full mt-1.5 right-0 rounded-xl overflow-hidden min-w-[170px] z-[9999]"
              style={{
                background: "rgba(255,255,255,0.97)",
                border: "1px solid rgba(148,163,184,0.16)",
                boxShadow: "0 12px 40px rgba(166,180,200,0.40), 0 4px 12px rgba(166,180,200,0.22), -4px -4px 16px rgba(255,255,255,0.90)",
                borderRadius: 16,
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
                  onClick={() => {
                    setShowPowerMenu(false);
                    if (!isTauri) return;
                    if (action === "shutdown") void exitApp();
                    else void systemPower(action);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors"
                  style={{ color: "#334155" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.07)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <Icon style={{ width: "0.8125rem", height: "0.8125rem" }} className="flex-shrink-0" />
                  <span className="text-xs">{label}</span>
                  {!isTauri && <span className="ml-auto text-[9px] font-mono opacity-30">native</span>}
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
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.96)",
                  border: "1px solid rgba(148,163,184,0.13)",
                  boxShadow: "0 20px 60px rgba(148,163,184,0.38), 0 6px 20px rgba(148,163,184,0.22), -6px -6px 24px rgba(255,255,255,0.90)",
                }}
                onClick={() => focusWindow(win.id)}
              >
                {/* Title bar */}
                <div
                  className="flex items-center h-10 px-3 gap-3 flex-shrink-0 cursor-move select-none"
                  style={{
                    borderBottom: "1px solid rgba(148,163,184,0.12)",
                    borderRadius: "20px 20px 0 0",
                    background: "linear-gradient(180deg, #ffffff 0%, #f8f9fc 100%)",
                  }}
                  onMouseDown={(e) => startDrag(win.id, e)}
                >
                  {/* Title — left aligned */}
                  <div className="flex-1 flex items-center gap-2 pointer-events-none min-w-0">
                    <span
                      className="text-[11px] font-semibold tracking-widest uppercase truncate"
                      style={{ color: "#334155", letterSpacing: "0.12em" }}
                    >
                      {appMeta[win.appId].title}
                    </span>
                  </div>

                  {/* ZaraOS window controls — right side, not macOS circles */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
                      title="Minimize"
                      className="group flex items-center justify-center rounded-lg transition-all"
                      style={{ width: 26, height: 22, background: "linear-gradient(145deg, #f0f2f7, #ffffff)", boxShadow: "2px 2px 6px rgba(166,180,200,0.38), -1px -1px 4px rgba(255,255,255,0.90)" }}
                    >
                      <Minus
                        style={{ width: "0.6rem", height: "0.6rem" }}
                        className="text-slate-400 group-hover:text-slate-700 transition-colors"
                      />
                    </button>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                      title="Close"
                      className="group flex items-center justify-center rounded-lg transition-all"
                      style={{ width: 26, height: 22, background: "linear-gradient(145deg, #f0f2f7, #ffffff)", boxShadow: "2px 2px 6px rgba(166,180,200,0.38), -1px -1px 4px rgba(255,255,255,0.90)" }}
                    >
                      <X
                        style={{ width: "0.6rem", height: "0.6rem" }}
                        className="text-gray-500 group-hover:text-red-500 transition-colors"
                      />
                    </button>
                  </div>
                </div>

                {/* Content — light background inside window */}
                <div
                  className="flex-1 overflow-hidden min-h-0 zaraos-window-body"
                  style={{ borderRadius: "0 0 20px 20px" }}
                >
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full w-full bg-white">
                        <div
                          className="w-5 h-5 rounded-full animate-spin"
                          style={{ border: "2px solid rgba(166,180,200,0.4)", borderTopColor: "#6366f1" }}
                        />
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
                background: "linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 2px 24px rgba(99,102,241,0.18))",
              }}
            >
              {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div
              className="font-mono tracking-widest uppercase mt-3"
              style={{ fontSize: "0.75rem", color: "rgba(100,116,135,0.55)" }}
            >
              {clock.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <div
              className="mt-10 text-xs font-mono tracking-widest"
              style={{ color: "rgba(148,163,184,0.55)" }}
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
                className="px-3 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition-all hover:brightness-110"
                style={{
                  color: "#6366f1",
                  background: "linear-gradient(145deg, #ffffff, #f0f2f8)",
                  border: "1px solid rgba(148,163,184,0.18)",
                  boxShadow: "3px 3px 10px rgba(166,180,200,0.38), -2px -2px 8px rgba(255,255,255,0.92)",
                }}
              >
                {appMeta[win.appId].title}
              </button>
            ))}
          </div>
        )}

        {/* ── Inline Zara response panel ─────────────────────────────────────── */}
        <AnimatePresence>
          {zaraInline && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.97)",
                border: "1px solid rgba(148,163,184,0.14)",
                boxShadow: "0 12px 40px rgba(148,163,184,0.34), 0 4px 12px rgba(148,163,184,0.18), -4px -4px 16px rgba(255,255,255,0.88)",
              }}
            >
              {/* User query */}
              <div className="px-5 pt-4 pb-2.5 border-b border-gray-100">
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">You</p>
                <p className="text-sm text-gray-800 font-medium leading-snug">{zaraInline.query}</p>
              </div>

              {/* Zara reply */}
              <div className="px-5 pt-3 pb-3 overflow-y-auto" style={{ maxHeight: 240 }}>
                <p className="text-[10px] font-mono tracking-widest uppercase mb-1.5 text-gradient-accent">Zara</p>
                {zaraInline.reply ? (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {zaraInline.reply}
                    {zaraInline.streaming && (
                      <span className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle" style={{ background: "linear-gradient(to bottom, #6366f1, #8b5cf6)", borderRadius: 2, opacity: 0.7 }} />
                    )}
                  </p>
                ) : zaraInline.streaming ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "linear-gradient(135deg,#8b5cf6,#a78bfa)", animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No response. Check that Ollama is running.</p>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 py-2.5 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    sessionStorage.setItem("zaraos:pendingQuery", zaraInline.query);
                    setZaraInline(null);
                    openWindow("assistant");
                  }}
                  className="text-[11px] font-mono hover:underline transition-colors text-gradient-accent"
                  style={{ opacity: 0.85 }}
                >
                  Open full assistant
                </button>
                <button
                  onClick={() => setZaraInline(null)}
                  className="text-[11px] font-mono text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Dismiss  (Esc)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: "rgba(248,249,254,0.94)",
            border: "1px solid rgba(148,163,184,0.16)",
            boxShadow: "0 10px 36px rgba(148,163,184,0.30), 0 3px 10px rgba(148,163,184,0.16), -4px -4px 16px rgba(255,255,255,0.88)",
          }}
        >
          <Search style={{ width: "1rem", height: "1rem", color: "rgba(148,163,184,0.70)", flexShrink: 0 }} />

          <input
            ref={inputRef}
            value={interimText || command}
            onChange={(e) => { setInterimText(""); setCommand(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { handleCommand(interimText || command); setInterimText(""); }
              if (e.key === "Escape") { setCommand(""); setInterimText(""); }
            }}
            placeholder='Ask Zara or say "open files", "browser", "settings"...'
            className="flex-1 bg-transparent text-sm outline-none font-sans"
            style={{
              color: interimText ? "#8b5cf6" : "#334155",
              fontStyle: interimText ? "italic" : "normal",
            }}
            data-testid="input-command-bar"
            autoFocus
          />

          {command && (
            <button
              onClick={() => setCommand("")}
              className="flex-shrink-0 transition-colors"
              style={{ color: "rgba(148,163,184,0.70)" }}
            >
              <X style={{ width: "0.875rem", height: "0.875rem" }} />
            </button>
          )}

          <button
            onClick={toggleVoice}
            data-testid="button-toggle-voice-bar"
            title={voiceActive ? "Voice on — click to disable" : "Voice off — click to enable"}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all"
            style={{
              color: voiceActive ? "#6366f1" : "rgba(148,163,184,0.65)",
              background: voiceActive ? "linear-gradient(145deg,#f0f1fb,#e8eaf8)" : "transparent",
              boxShadow: voiceActive ? "inset 2px 2px 5px rgba(166,180,200,0.35), inset -2px -2px 5px rgba(255,255,255,0.80)" : "none",
            }}
          >
            {voiceActive
              ? <Mic style={{ width: "0.875rem", height: "0.875rem" }} />
              : <MicOff style={{ width: "0.875rem", height: "0.875rem" }} />
            }
          </button>

          {command.trim() && (
            <button
              onClick={() => handleCommand(command)}
              className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                color: "#ffffff",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                boxShadow: "0 2px 10px rgba(99,102,241,0.35)",
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
