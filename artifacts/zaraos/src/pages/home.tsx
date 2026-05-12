import { Layout } from "@/components/layout";
import { usePrivacy } from "@/lib/privacy-store";
import { useRuntime } from "@/core/runtime-context";
import { Link } from "wouter";
import {
  MessageSquare,
  Terminal,
  LayoutGrid,
  FolderOpen,
  Settings,
  ShieldAlert,
  Cpu,
  Brain,
  Zap,
  HardDriveDownload,
  Server,
  Cloud,
  Radio,
  Loader2,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSystemStats, formatUptime } from "@/core/tauri/tauri-system";
import type { SystemStats } from "@/core/tauri/tauri-system";

const quickApps = [
  { href: "/assistant",    icon: MessageSquare, label: "Assistant"    },
  { href: "/console",      icon: Terminal,      label: "Console"      },
  { href: "/apps",         icon: LayoutGrid,    label: "Apps"         },
  { href: "/files",        icon: FolderOpen,    label: "Files"        },
  { href: "/ai-providers", icon: Cpu,           label: "AI"           },
  { href: "/memory",       icon: Brain,         label: "Memory"       },
  { href: "/privacy",      icon: ShieldAlert,   label: "Privacy"      },
  { href: "/settings",     icon: Settings,      label: "Settings"     },
  { href: "/skills",       icon: Zap,           label: "Skills"       },
  { href: "/install",      icon: HardDriveDownload, label: "Install"  },
];

export default function Home() {
  const privacy = usePrivacy();
  const { aiRuntimeStatus, getAIMemoryStats } = useRuntime();
  const [time, setTime] = useState(new Date());
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const getAIMemoryStatsRef = useRef(getAIMemoryStats);

  useEffect(() => { getAIMemoryStatsRef.current = getAIMemoryStats; }, [getAIMemoryStats]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const refresh = () => { getSystemStats().then(setSystemStats).catch(() => {}); };
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, []);

  const isRealInference = !aiRuntimeStatus.isSimulated;
  const isCloud = aiRuntimeStatus.isCloud;
  const phase = aiRuntimeStatus.phase;

  const aiIcon =
    phase === "thinking" || phase === "streaming"
      ? <Loader2 className="w-3 h-3 animate-spin" />
      : isRealInference
        ? (isCloud ? <Cloud className="w-3 h-3" /> : <Server className="w-3 h-3" />)
        : <Radio className="w-3 h-3" />;

  const aiText =
    phase === "thinking" ? "Thinking..." :
    phase === "streaming" ? "Streaming..." :
    phase === "error" ? "Error" :
    isRealInference ? (isCloud ? "Cloud inference" : "Local inference") :
    "Simulated mode";

  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <Layout>
      <div className="h-full flex flex-col min-h-0" style={{ padding: "0" }}>

        {/* ── Center section: clock + Zara greeting + app grid ── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8 py-10 min-h-0">

          {/* Clock */}
          <div className="flex flex-col items-center gap-1 select-none">
            <div
              className="font-mono text-white tabular-nums leading-none"
              style={{ fontSize: "clamp(3.5rem, 8vw, 7rem)", fontWeight: 200, letterSpacing: "-0.02em" }}
            >
              {timeStr}
            </div>
            <div className="text-sm font-medium text-white/35 tracking-widest uppercase font-mono">
              {dateStr}
            </div>
          </div>

          {/* Zara status pill */}
          <Link href="/assistant">
            <div
              className="flex items-center gap-3 px-5 py-2.5 rounded-full cursor-pointer transition-all duration-200 hover:scale-105 group"
              style={{
                background: "rgba(0,240,255,0.06)",
                border: "1px solid rgba(0,240,255,0.14)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 0 24px rgba(0,240,255,0.06)",
              }}
            >
              <div className="flex items-center gap-1.5">
                {aiIcon && (
                  <span className={`${isRealInference ? "text-green-400" : "text-primary/50"}`}>
                    {aiIcon}
                  </span>
                )}
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: isRealInference ? "#4ade80" : "hsl(184 100% 50%)",
                    boxShadow: isRealInference
                      ? "0 0 8px rgba(74,222,128,0.8)"
                      : "0 0 8px rgba(0,240,255,0.6)",
                  }}
                />
              </div>
              <span className="text-xs font-mono text-white/55 tracking-wide">
                Zara — {aiText}
              </span>
              <span className="text-xs text-primary/30 group-hover:text-primary/60 transition-colors font-mono ml-1">→</span>
            </div>
          </Link>

          {/* Quick-launch app grid */}
          <div className="grid grid-cols-5 gap-3 w-full max-w-xl">
            {quickApps.map((app) => {
              const Icon = app.icon;
              return (
                <Link key={app.href} href={app.href}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer group transition-all duration-200 hover:scale-105">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                      }}
                    >
                      <Icon
                        style={{ width: "1.25rem", height: "1.25rem" }}
                        className="text-white/40 group-hover:text-primary transition-colors duration-200 group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                      />
                    </div>
                    <span className="text-[10px] font-medium text-white/30 group-hover:text-white/60 transition-colors tracking-wide">
                      {app.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Bottom status bar ── */}
        <div
          className="flex-shrink-0 flex items-center justify-center gap-6 px-8 py-3 flex-wrap"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.04)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          {/* System stats */}
          {[
            {
              label: "CPU",
              value: systemStats ? `${systemStats.cpu_usage_percent.toFixed(0)}%` : "—",
              sub: systemStats ? `${systemStats.cpu_cores}c` : "",
              color: "#00f0ff",
            },
            {
              label: "RAM",
              value: systemStats ? `${systemStats.ram_used_gb}` : "—",
              sub: systemStats ? `/ ${systemStats.ram_total_gb} GB` : "",
              color: "#a855f7",
            },
            {
              label: "DISK",
              value: systemStats ? `${systemStats.disk_free_gb} GB` : "—",
              sub: "free",
              color: "#22c55e",
            },
            {
              label: "NET",
              value: systemStats ? `${(systemStats.network_rx_kbps / 1024).toFixed(1)}` : "—",
              sub: "MB/s",
              color: "#f59e0b",
            },
            ...(systemStats
              ? [{ label: "UP", value: formatUptime(systemStats.uptime_seconds), sub: "", color: "rgba(255,255,255,0.3)" }]
              : []),
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-1.5">
              <span className="text-[9px] font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
                {s.label}
              </span>
              <span className="text-[12px] font-mono tabular-nums font-medium" style={{ color: s.color }}>
                {s.value}
              </span>
              {s.sub && (
                <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {s.sub}
                </span>
              )}
            </div>
          ))}

          {/* Divider */}
          <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.06)" }} />

          {/* Privacy indicators */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" title="Microphone">
              {privacy.micActive
                ? <Mic style={{ width: "0.625rem", height: "0.625rem" }} className="text-amber-400" />
                : <MicOff style={{ width: "0.625rem", height: "0.625rem" }} className="text-white/15" />
              }
            </div>
            <div className="flex items-center gap-1.5" title="Camera">
              {privacy.cameraActive
                ? <Eye style={{ width: "0.625rem", height: "0.625rem" }} className="text-amber-400" />
                : <EyeOff style={{ width: "0.625rem", height: "0.625rem" }} className="text-white/15" />
              }
            </div>
            <div className="flex items-center gap-1.5" title={`Cloud AI ${privacy.cloudAIRunning ? "active" : "blocked"}`}>
              <Wifi
                style={{ width: "0.625rem", height: "0.625rem" }}
                className={privacy.cloudAIRunning ? "text-amber-400" : "text-white/15"}
              />
            </div>
            <div className="flex items-center gap-1.5" title="Local AI">
              <ShieldCheck
                style={{ width: "0.625rem", height: "0.625rem" }}
                className={privacy.localAIRunning ? "text-green-400" : "text-white/15"}
              />
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
