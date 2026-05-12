import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Settings as SettingsIcon,
  Monitor,
  Volume2,
  Hand,
  Cpu,
  HardDrive,
  Layers,
  Mic,
  MicOff,
  Keyboard,
  Check,
  Terminal,
  ChevronRight,
  ShieldCheck,
  Wifi,
  WifiOff,
  Sun,
  Power,
  RotateCcw,
  Moon,
  Lock,
  RefreshCw,
  Loader2,
  Signal,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useInputMode, INPUT_MODE_META } from "@/core/input-mode";
import { gestureEngine } from "@/lib/gesture-engine";
import { GESTURE_MAPPINGS } from "@/lib/gesture-mapper";
import type { InputMode, GestureType } from "@/core/types";
import {
  getVolume, setVolume, getBrightness, setBrightness,
  systemPower, listWifiNetworks, connectWifi, disconnectWifi,
  signalLabel, signalBars,
} from "@/core/tauri/tauri-system-controls";
import type { WifiNetwork } from "@/core/tauri/tauri-system-controls";
import { isTauriRuntime } from "@/core/tauri/tauri-bridge";
import { voiceEngine } from "@/lib/voice-engine";
import { getSystemStats } from "@/core/tauri/tauri-system";
import type { SystemStats } from "@/core/tauri/tauri-system";
import { Input } from "@/components/ui/input";

const TABS = [
  { id: "general",    label: "General",    icon: SettingsIcon },
  { id: "appearance", label: "Appearance", icon: Monitor      },
  { id: "voice",      label: "Voice",      icon: Volume2      },
  { id: "input",      label: "Input Mode", icon: Layers       },
  { id: "gestures",   label: "Gestures",   icon: Hand         },
  { id: "system",     label: "System",     icon: Cpu          },
  { id: "network",    label: "Network",    icon: Wifi         },
];

const ALL_MODES: InputMode[] = ["hybrid", "voice", "gesture", "text"];

const MODE_ICONS: Record<InputMode, React.ReactNode> = {
  hybrid:  <Layers className="w-5 h-5" />,
  voice:   <Mic className="w-5 h-5" />,
  gesture: <Hand className="w-5 h-5" />,
  text:    <Keyboard className="w-5 h-5" />,
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [lastSimulated, setLastSimulated] = useState<string>("");
  const [gestureIsTracking, setGestureIsTracking] = useState(gestureEngine.isActive());
  const [gestureError, setGestureError] = useState<string | null>(null);
  const { mode, setMode, config, voiceActive, gestureActive, keyboardOnly, toggleVoice, toggleGesture } = useInputMode();
  const isTauri = isTauriRuntime();

  // ── System controls state ─────────────────────────────────
  const [volume, setVolumeState] = useState(70);
  const [brightness, setBrightnessState] = useState(80);
  const [sysStats, setSysStats] = useState<SystemStats | null>(null);

  // ── Network state ─────────────────────────────────────────
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>([]);
  const [wifiLoading, setWifiLoading] = useState(false);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectPassword, setConnectPassword] = useState("");
  const [selectedSsid, setSelectedSsid] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    void getVolume().then(setVolumeState);
    void getBrightness().then(setBrightnessState);
    void getSystemStats().then(setSysStats);
  }, [isTauri]);

  const refreshWifi = useCallback(async () => {
    if (!isTauri) {
      const { listWifiNetworks: lwn } = await import("@/core/tauri/tauri-system-controls");
      const nets = await lwn();
      setWifiNetworks(nets);
      return;
    }
    setWifiLoading(true);
    try {
      const nets = await listWifiNetworks();
      setWifiNetworks(nets);
    } finally {
      setWifiLoading(false);
    }
  }, [isTauri]);

  useEffect(() => {
    if (activeTab === "network") void refreshWifi();
  }, [activeTab, refreshWifi]);

  // Keep gesture tracking state in sync with engine
  useEffect(() => {
    const unsubStatus = gestureEngine.onStatusChange(setGestureIsTracking);
    const unsubError  = gestureEngine.onError((msg) => setGestureError(msg));
    return () => { unsubStatus(); unsubError(); };
  }, []);

  function simulateGesture(gesture: GestureType, label: string) {
    gestureEngine.simulateGesture(gesture);
    setLastSimulated(label);
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex h-full gap-8">

        {/* ── Settings Sidebar ── */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200
                  ${activeTab === tab.id
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_15px_rgba(0,240,255,0.05)]"
                    : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                data-testid={`settings-tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4 rounded-xl bg-card border border-white/5">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">About</div>
            <div className="text-sm text-white font-medium">ZaraOS Alpha</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">v0.1.0-build.842</div>
            <Button variant="outline" size="sm" className="w-full mt-3 border-white/10 hover:bg-white/5">
              Check Updates
            </Button>
          </div>
        </div>

        {/* ── Settings Content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl flex flex-col gap-6 pb-12">

            {/* General */}
            {activeTab === "general" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">General</h2>
                  <p className="text-muted-foreground text-sm">Basic system configuration and preferences.</p>
                </div>
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardHeader><CardTitle className="text-base">Language & Region</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-[1fr_180px] gap-4 items-center">
                      <div>
                        <div className="text-sm font-medium text-white">System Language</div>
                        <div className="text-xs text-muted-foreground">Primary interface language</div>
                      </div>
                      <Select defaultValue="en-us">
                        <SelectTrigger className="bg-black/50 border-white/10">
                          <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-us">English (US)</SelectItem>
                          <SelectItem value="en-uk">English (UK)</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-4 items-center border-t border-white/5 pt-4">
                      <div>
                        <div className="text-sm font-medium text-white">Time Zone</div>
                        <div className="text-xs text-muted-foreground">Set local time automatically</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Appearance */}
            {activeTab === "appearance" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Appearance</h2>
                  <p className="text-muted-foreground text-sm">Visual styling and UI density.</p>
                </div>
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="pt-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">Theme Mode</div>
                        <div className="text-xs text-muted-foreground">ZaraOS is designed for Dark Mode.</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-primary text-primary bg-primary/10">Dark</Button>
                        <Button variant="outline" size="sm" className="border-white/10 text-muted-foreground" disabled>Light</Button>
                      </div>
                    </div>
                    <div className="border-t border-white/5 pt-6">
                      <div className="text-sm font-medium text-white mb-1">Accent Color</div>
                      <div className="text-xs text-muted-foreground mb-4">Primary UI highlight color</div>
                      <div className="flex gap-3">
                        {[
                          "bg-cyan-400 ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-background",
                          "bg-purple-500",
                          "bg-amber-500",
                          "bg-green-500",
                          "bg-rose-500",
                        ].map((color, i) => (
                          <div key={i} className={`w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform ${color}`} />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Voice */}
            {activeTab === "voice" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Voice</h2>
                  <p className="text-muted-foreground text-sm">Assistant voice configuration and audio.</p>
                </div>

                {/* Hardware status summary */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" />Hardware Status</CardTitle></CardHeader>
                  <CardContent className="pb-6 flex flex-col gap-3">
                    {/* TTS */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">Speaker Output (TTS)</div>
                        <div className="text-xs text-muted-foreground">
                          {voiceEngine.isTTSSupported
                            ? "speech-dispatcher detected — Zara can speak"
                            : "speech-dispatcher not found — install espeak-ng"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${voiceEngine.isTTSSupported ? "bg-green-400" : "bg-red-400"}`} />
                        <span className={`text-xs font-mono ${voiceEngine.isTTSSupported ? "text-green-400" : "text-red-400"}`}>
                          {voiceEngine.isTTSSupported ? "Ready" : "Missing dep"}
                        </span>
                      </div>
                    </div>
                    {voiceEngine.isTTSSupported && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="self-start gap-2 border-white/10 hover:border-primary/50 text-xs font-mono"
                        onClick={() => voiceEngine.speak("Hello. I am Zara. Audio output is working correctly.", { rate: 0.97, pitch: 1.05 })}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Test Speakers
                      </Button>
                    )}
                    {!voiceEngine.isTTSSupported && (
                      <div className="text-[11px] font-mono text-amber-400/70 bg-amber-400/5 border border-amber-400/10 rounded px-3 py-2">
                        sudo apt install espeak-ng speech-dispatcher speech-dispatcher-espeak-ng
                      </div>
                    )}

                    {/* Mic */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div>
                        <div className="text-sm font-medium text-white">Microphone Input (STT)</div>
                        <div className="text-xs text-muted-foreground">
                          {voiceEngine.isSupported
                            ? "Web Speech API available"
                            : voiceEngine.isTauriMode
                              ? "Coming in Alpha 0.7 via Whisper.cpp"
                              : "Not available — use Chrome or Edge"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${voiceEngine.isSupported ? "bg-green-400" : "bg-amber-400"}`} />
                        <span className={`text-xs font-mono ${voiceEngine.isSupported ? "text-green-400" : "text-amber-400"}`}>
                          {voiceEngine.isSupported ? "Ready" : "Alpha 0.7"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="pt-6 flex flex-col gap-6">
                    <div className="grid grid-cols-[1fr_180px] gap-4 items-center">
                      <div>
                        <div className="text-sm font-medium text-white">Zara Voice Model</div>
                        <div className="text-xs text-muted-foreground">Synthesized voice characteristics</div>
                      </div>
                      <Select defaultValue="zara-1">
                        <SelectTrigger className="bg-black/50 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zara-1">Zara Default (Smooth)</SelectItem>
                          <SelectItem value="zara-2">Zara Technical (Crisp)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border-t border-white/5 pt-6">
                      <div className="text-sm font-medium text-white mb-4">Speaking Speed</div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-muted-foreground w-8">0.5x</span>
                        <Slider defaultValue={[1]} max={2} step={0.1} className="flex-1" />
                        <span className="text-xs font-mono text-muted-foreground w-8">2.0x</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-6">
                      <div>
                        <div className="text-sm font-medium text-white">Always Listening (Wake Word)</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          Respond to "Hey Zara"
                          <span className="bg-amber-500/20 text-amber-400 px-1 rounded text-[10px] uppercase">Alpha 0.7</span>
                        </div>
                      </div>
                      <Switch disabled />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Input Mode ── */}
            {activeTab === "input" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Input Mode</h2>
                  <p className="text-muted-foreground text-sm">
                    Controls which input channels are active. All modes route through the same Zara Runtime pipeline.
                    Text input is always available as a silent fallback in every mode.
                  </p>
                </div>

                {/* Mode selector */}
                <div className="grid grid-cols-2 gap-3">
                  {ALL_MODES.map((m) => {
                    const meta = INPUT_MODE_META[m];
                    const isActive = mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`relative p-4 rounded-xl border text-left transition-all duration-200 ${
                          isActive
                            ? `${meta.borderColor} ${meta.bgColor} shadow-lg`
                            : "border-white/10 bg-card/30 hover:bg-white/5 hover:border-white/20"
                        }`}
                        data-testid={`input-mode-${m}`}
                      >
                        {isActive && (
                          <div className="absolute top-3 right-3">
                            <Check className={`w-4 h-4 ${meta.color}`} />
                          </div>
                        )}
                        <div className={`mb-3 ${isActive ? meta.color : "text-muted-foreground"}`}>
                          {MODE_ICONS[m]}
                        </div>
                        <div className={`text-sm font-bold ${isActive ? "text-white" : "text-muted-foreground"}`}>
                          {meta.label}
                        </div>
                        <div className="text-xs text-muted-foreground/60 mt-1 leading-snug">
                          {meta.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Hardware toggles */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-sm">Hardware Input</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Toggle voice and gesture independently. Keyboard is always available and cannot be disabled.
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">

                    {/* Voice row */}
                    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                      voiceActive
                        ? "border-amber-500/25 bg-amber-500/8"
                        : "border-white/8 bg-white/3"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${voiceActive ? "bg-amber-500/15 text-amber-400" : "bg-white/5 text-muted-foreground/30"}`}>
                          {voiceActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${voiceActive ? "text-white" : "text-muted-foreground/50"}`}>
                            Voice Input
                          </div>
                          <div className="text-xs text-muted-foreground/50 mt-0.5">
                            {voiceActive ? "Microphone active — Zara listens for commands" : "Microphone disabled — no audio capture"}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={voiceActive}
                        onCheckedChange={toggleVoice}
                        data-testid="switch-voice-active"
                      />
                    </div>

                    {/* Gesture row */}
                    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                      gestureActive
                        ? "border-purple-500/25 bg-purple-500/8"
                        : "border-white/8 bg-white/3"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${gestureActive ? "bg-purple-500/15 text-purple-400" : "bg-white/5 text-muted-foreground/30"}`}>
                          <Hand className="w-4 h-4" />
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${gestureActive ? "text-white" : "text-muted-foreground/50"}`}>
                            Gesture Input
                          </div>
                          <div className="text-xs text-muted-foreground/50 mt-0.5">
                            {gestureActive ? "Camera active — MediaPipe hand tracking enabled" : "Camera disabled — no video capture"}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={gestureActive}
                        onCheckedChange={toggleGesture}
                        data-testid="switch-gesture-active"
                      />
                    </div>

                    {/* Keyboard row — always on, locked */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-green-500/15 bg-green-500/5">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-green-500/15 text-green-400">
                          <Keyboard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            Keyboard &amp; Text
                            <span className="text-[10px] font-mono text-green-400 bg-green-500/15 border border-green-500/20 px-1.5 py-0.5 rounded">
                              ALWAYS ON
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground/50 mt-0.5">
                            Cannot be disabled — the silent fallback for privacy-first use
                          </div>
                        </div>
                      </div>
                      <Switch checked disabled />
                    </div>

                    {/* Keyboard-only notice */}
                    {keyboardOnly && (
                      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-green-500/20 bg-green-500/8 animate-in fade-in duration-300">
                        <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-green-400">Keyboard-only mode active</div>
                          <div className="text-xs text-muted-foreground/60 mt-0.5">
                            No microphone or camera in use. Maximum privacy.
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Command box shortcut */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="pt-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Command Box Shortcut</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Open the floating text command box from any panel
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono bg-black/50 border border-white/20 rounded text-muted-foreground">Ctrl</kbd>
                      <span className="text-muted-foreground/40 text-xs">+</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-black/50 border border-white/20 rounded text-muted-foreground">Space</kbd>
                    </div>
                  </CardContent>
                </Card>

                {/* Runtime note */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-card/20">
                  <ChevronRight className="w-4 h-4 text-primary/60 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All input modes route through the same <span className="text-white font-mono">zaraRuntime.executeCommand()</span> pipeline.
                    Voice, gesture, and text never create separate command systems. Switching modes only changes which hardware channels are active.
                  </p>
                </div>
              </div>
            )}

            {/* ── Gestures ── */}
            {activeTab === "gestures" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Gestures</h2>
                  <p className="text-muted-foreground text-sm">
                    Live hand gesture recognition via MediaPipe HandLandmarker (21-landmark, 30 fps).
                    All gestures route through the Zara Runtime pipeline identically to voice and keyboard.
                  </p>
                </div>

                {/* Camera enable */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="pt-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">Camera Tracking</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {gestureIsTracking
                            ? "MediaPipe HandLandmarker active — detecting hand gestures at 30 fps"
                            : "Camera off — enable to start live hand gesture recognition"}
                        </div>
                      </div>
                      <Switch
                        checked={gestureIsTracking}
                        data-testid="switch-camera-tracking"
                        onCheckedChange={(v) => {
                          setGestureError(null);
                          if (v) void gestureEngine.startTracking();
                          else gestureEngine.stopTracking();
                        }}
                      />
                    </div>
                    {gestureIsTracking && (
                      <div className="flex items-center gap-2 text-[11px] font-mono text-purple-400/70 px-0.5 animate-in fade-in duration-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
                        Tracking active — gesture overlay visible in the bottom-right corner
                      </div>
                    )}
                    {gestureError && (
                      <div className="flex items-start gap-2 text-[11px] font-mono text-red-400/80 px-0.5 animate-in fade-in duration-300">
                        <span className="flex-shrink-0 mt-0.5">!</span>
                        <span>{gestureError}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Last simulated */}
                {lastSimulated && (
                  <div className="flex items-center gap-2 text-sm font-mono text-primary/80 px-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Simulated: {lastSimulated}
                  </div>
                )}

                {/* Gesture mapping table */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardHeader><CardTitle className="text-sm">Gesture Map</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                      {GESTURE_MAPPINGS.map((mapping) => (
                        <div key={mapping.gesture} className="flex items-center gap-4 px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{mapping.label}</span>
                              {mapping.requiresGestureMode && (
                                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 rounded">
                                  Gesture Mode
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{mapping.description}</div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20 whitespace-nowrap">
                              {mapping.command}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white whitespace-nowrap"
                              onClick={() => simulateGesture(mapping.gesture, mapping.label)}
                              data-testid={`button-simulate-${mapping.gesture}`}
                            >
                              Test
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Implementation note */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                  <Hand className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    MediaPipe HandLandmarker loads its WASM bundle from CDN on first use (~8 MB, takes 2-4 s).
                    The classifier maps 21 normalized landmarks to gesture types via finger-extension angles
                    and wrist velocity history. The WASM bundle is cached after the first load.
                    All gestures flow through{" "}
                    <span className="text-white font-mono">gestureEngine.dispatchGesture()</span>{" "}
                    into the same{" "}
                    <span className="text-white font-mono">zaraRuntime.executeCommand()</span>{" "}
                    pipeline as voice and keyboard input.
                  </p>
                </div>
              </div>
            )}

            {/* System */}
            {activeTab === "system" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">System</h2>
                  <p className="text-muted-foreground text-sm">Hardware resources, display, audio, and power controls.</p>
                </div>

                {/* Hardware stats */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 divide-x divide-y divide-white/5">
                      <div className="p-6">
                        <div className="flex items-center gap-2.5 mb-2 text-muted-foreground">
                          <Cpu className="w-4 h-4" />
                          <span className="text-sm font-medium">Processor</span>
                        </div>
                        <div className="text-base font-bold text-white truncate">
                          {sysStats ? sysStats.cpu_brand : "—"}
                        </div>
                        <div className="text-xs font-mono text-primary mt-1.5">
                          {sysStats ? `${sysStats.cpu_usage_percent.toFixed(1)}% · ${sysStats.cpu_cores} cores` : "Loading..."}
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2.5 mb-2 text-muted-foreground">
                          <HardDrive className="w-4 h-4" />
                          <span className="text-sm font-medium">Memory</span>
                        </div>
                        <div className="text-base font-bold text-white">
                          {sysStats ? `${sysStats.ram_total_gb} GB RAM` : "—"}
                        </div>
                        <div className="text-xs font-mono text-primary mt-1.5">
                          {sysStats ? `${sysStats.ram_used_gb} GB used (${sysStats.ram_used_percent.toFixed(0)}%)` : "Loading..."}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Volume */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Volume2 className="w-4 h-4 text-primary" />Volume</CardTitle></CardHeader>
                  <CardContent className="flex items-center gap-4 pb-6">
                    <span className="text-xs font-mono text-muted-foreground w-6">0</span>
                    <Slider
                      value={[volume]}
                      min={0} max={100} step={1}
                      className="flex-1"
                      onValueChange={([v]) => {
                        setVolumeState(v);
                        void setVolume(v);
                      }}
                    />
                    <span className="text-xs font-mono text-white w-10 text-right">{volume}%</span>
                  </CardContent>
                </Card>

                {/* Brightness */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sun className="w-4 h-4 text-amber-400" />Brightness</CardTitle></CardHeader>
                  <CardContent className="flex items-center gap-4 pb-6">
                    <span className="text-xs font-mono text-muted-foreground w-6">5</span>
                    <Slider
                      value={[brightness]}
                      min={5} max={100} step={1}
                      className="flex-1"
                      onValueChange={([v]) => {
                        setBrightnessState(v);
                        void setBrightness(v);
                      }}
                    />
                    <span className="text-xs font-mono text-white w-10 text-right">{brightness}%</span>
                  </CardContent>
                </Card>

                {/* Power actions */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Power className="w-4 h-4 text-red-400" />Power</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-3 pb-6">
                    {[
                      { label: "Lock Screen", icon: Lock,      action: "lock"     as const, cls: "border-primary/30 text-primary hover:bg-primary/10"         },
                      { label: "Suspend",     icon: Moon,      action: "suspend"  as const, cls: "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"       },
                      { label: "Restart",     icon: RotateCcw, action: "reboot"   as const, cls: "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"    },
                      { label: "Shut Down",   icon: Power,     action: "shutdown" as const, cls: "border-red-500/30 text-red-400 hover:bg-red-500/10"          },
                    ].map(({ label, icon: Icon, action, cls }) => (
                      <Button
                        key={action}
                        variant="outline"
                        size="sm"
                        data-testid={`button-power-${action}`}
                        className={`gap-2 bg-transparent border ${cls} ${!isTauri ? "opacity-40 cursor-not-allowed" : ""}`}
                        onClick={() => { if (isTauri) void systemPower(action); }}
                        title={isTauri ? undefined : "Native app only"}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </Button>
                    ))}
                    {!isTauri && (
                      <p className="w-full text-[10px] font-mono text-muted-foreground/40 mt-1">
                        Power controls require the native desktop app
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Network */}
            {activeTab === "network" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Network</h2>
                    <p className="text-muted-foreground text-sm">WiFi networks managed via NetworkManager (nmcli).</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refreshWifi()}
                    disabled={wifiLoading}
                    className="gap-2 border-white/10 hover:bg-white/5 mt-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${wifiLoading ? "animate-spin" : ""}`} />
                    Scan
                  </Button>
                </div>

                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="p-0">
                    {wifiNetworks.length === 0 && !wifiLoading ? (
                      <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <WifiOff className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground font-mono">
                          {isTauri ? "No networks found — click Scan" : "Mock networks shown — browser mode"}
                        </p>
                      </div>
                    ) : wifiLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {wifiNetworks.map((net) => (
                          <div key={net.bssid || net.ssid} className="p-4">
                            <div
                              className="flex items-center gap-4 cursor-pointer"
                              onClick={() => {
                                setSelectedSsid(selectedSsid === net.ssid ? null : net.ssid);
                                setConnectPassword("");
                                setConnectError(null);
                              }}
                            >
                              {/* Signal bars */}
                              <div className="flex items-end gap-0.5 h-5 flex-shrink-0">
                                {[1,2,3,4].map((bar) => (
                                  <div
                                    key={bar}
                                    className={`w-1.5 rounded-sm transition-colors ${
                                      bar <= signalBars(net.signal)
                                        ? net.connected ? "bg-green-400" : "bg-primary"
                                        : "bg-white/10"
                                    }`}
                                    style={{ height: `${bar * 25}%` }}
                                  />
                                ))}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium text-sm ${net.connected ? "text-green-400" : "text-white"}`}>
                                    {net.ssid}
                                  </span>
                                  {net.connected && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-green-500/30 bg-green-500/10 text-green-400">
                                      Connected
                                    </span>
                                  )}
                                  {net.security && net.security !== "--" && (
                                    <span className="text-[10px] font-mono text-muted-foreground/50">{net.security}</span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground/50 font-mono mt-0.5">
                                  {signalLabel(net.signal)} · {net.signal}%
                                </div>
                              </div>

                              {net.connected ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void disconnectWifi();
                                  }}
                                >
                                  Disconnect
                                </Button>
                              ) : (
                                <ChevronRight className={`w-4 h-4 text-muted-foreground/30 transition-transform ${selectedSsid === net.ssid ? "rotate-90" : ""}`} />
                              )}
                            </div>

                            {/* Inline connect form */}
                            {selectedSsid === net.ssid && !net.connected && (
                              <div className="mt-3 pl-10 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                {net.security && net.security !== "--" && (
                                  <Input
                                    type="password"
                                    placeholder="Password"
                                    value={connectPassword}
                                    onChange={(e) => setConnectPassword(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        void (async () => {
                                          setConnectingTo(net.ssid);
                                          setConnectError(null);
                                          try {
                                            await connectWifi(net.ssid, connectPassword);
                                            await refreshWifi();
                                            setSelectedSsid(null);
                                          } catch (err) {
                                            setConnectError(err instanceof Error ? err.message : "Connection failed");
                                          } finally {
                                            setConnectingTo(null);
                                          }
                                        })();
                                      }
                                    }}
                                    className="h-8 text-sm bg-black/40 border-white/10 focus:border-primary/30"
                                    autoFocus
                                  />
                                )}
                                {connectError && (
                                  <p className="text-[11px] font-mono text-red-400/80">{connectError}</p>
                                )}
                                <Button
                                  size="sm"
                                  className="w-full gap-2"
                                  disabled={!!connectingTo}
                                  onClick={() => void (async () => {
                                    setConnectingTo(net.ssid);
                                    setConnectError(null);
                                    try {
                                      await connectWifi(net.ssid, connectPassword);
                                      await refreshWifi();
                                      setSelectedSsid(null);
                                    } catch (err) {
                                      setConnectError(err instanceof Error ? err.message : "Connection failed");
                                    } finally {
                                      setConnectingTo(null);
                                    }
                                  })()}
                                >
                                  {connectingTo === net.ssid ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" />Connecting...</>
                                  ) : (
                                    <><Wifi className="w-3.5 h-3.5" />Connect</>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!isTauri && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/3 text-xs font-mono text-muted-foreground/50">
                    <Signal className="w-4 h-4 flex-shrink-0" />
                    Real WiFi scanning requires the native desktop app. Showing mock networks.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
