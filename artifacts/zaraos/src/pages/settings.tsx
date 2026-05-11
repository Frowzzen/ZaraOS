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
} from "lucide-react";
import { useState } from "react";
import { useInputMode, INPUT_MODE_META } from "@/core/input-mode";
import { gestureEngine } from "@/lib/gesture-engine";
import { GESTURE_MAPPINGS } from "@/lib/gesture-mapper";
import type { InputMode, GestureType } from "@/core/types";

const TABS = [
  { id: "general",    label: "General",    icon: SettingsIcon },
  { id: "appearance", label: "Appearance", icon: Monitor      },
  { id: "voice",      label: "Voice",      icon: Volume2      },
  { id: "input",      label: "Input Mode", icon: Layers       },
  { id: "gestures",   label: "Gestures",   icon: Hand         },
  { id: "system",     label: "System",     icon: Cpu          },
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
  const { mode, setMode, config, voiceActive, gestureActive, keyboardOnly, toggleVoice, toggleGesture } = useInputMode();

  function simulateGesture(gesture: GestureType, label: string) {
    gestureEngine.startTracking("/settings");
    gestureEngine.simulateGesture(gesture);
    setTimeout(() => gestureEngine.stopTracking(), 100);
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
                          <span className="bg-amber-500/20 text-amber-400 px-1 rounded text-[10px] uppercase">High Battery</span>
                        </div>
                      </div>
                      <Switch />
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
                    Camera-based hand gesture controls. All gestures route through Zara Runtime.
                    Real MediaPipe tracking will be wired in Alpha 0.4.
                  </p>
                </div>

                {/* Camera enable */}
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="pt-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Enable Camera Tracking</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Required for all spatial gestures — uses local MediaPipe (future)
                      </div>
                    </div>
                    <Switch
                      data-testid="switch-camera-tracking"
                      onCheckedChange={(v) => {
                        if (v) gestureEngine.startTracking();
                        else gestureEngine.stopTracking();
                      }}
                    />
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

                {/* Future note */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-purple-500/15 bg-purple-500/5">
                  <Hand className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Real gesture recognition via MediaPipe Hands is planned for Alpha 0.4. The integration point is in{" "}
                    <span className="text-white font-mono">src/lib/gesture-engine.ts</span>.
                    All classified gestures will call{" "}
                    <span className="text-white font-mono">gestureEngine.dispatchGesture()</span> with no other changes needed.
                  </p>
                </div>
              </div>
            )}

            {/* System */}
            {activeTab === "system" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">System Status</h2>
                  <p className="text-muted-foreground text-sm">Hardware resources and kernel parameters.</p>
                </div>
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 divide-x divide-y divide-white/5">
                      <div className="p-6">
                        <div className="flex items-center gap-2.5 mb-2 text-muted-foreground">
                          <Cpu className="w-4 h-4" />
                          <span className="text-sm font-medium">Processor</span>
                        </div>
                        <div className="text-lg font-bold text-white">Neural Core X1</div>
                        <div className="text-xs font-mono text-green-400 mt-1.5">Optimal (45°C)</div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2.5 mb-2 text-muted-foreground">
                          <HardDrive className="w-4 h-4" />
                          <span className="text-sm font-medium">Memory</span>
                        </div>
                        <div className="text-lg font-bold text-white">32 GB LPDDR6</div>
                        <div className="text-xs font-mono text-primary mt-1.5">18.4 GB Available</div>
                      </div>
                    </div>
                    <div className="p-5 border-t border-white/5 flex gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30"
                        data-testid="button-restart-system"
                      >
                        Restart System
                      </Button>
                      <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5">
                        Export Diagnostics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
