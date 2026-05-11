import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Settings as SettingsIcon, Monitor, User, Volume2, Hand, Cpu, HardDrive } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "appearance", label: "Appearance", icon: Monitor },
    { id: "voice", label: "Voice & Audio", icon: Volume2 },
    { id: "gestures", label: "Gestures", icon: Hand },
    { id: "system", label: "System", icon: Cpu },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex h-full gap-8">
        {/* Settings Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>
          </div>
          <nav className="flex flex-col gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_15px_rgba(0,240,255,0.05)]' 
                    : 'text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent'}
                `}
                data-testid={`settings-tab-${tab.id}`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4 rounded-xl bg-card border border-white/5">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">ABOUT</div>
            <div className="text-sm text-white font-medium">ZaraOS Alpha</div>
            <div className="text-xs text-muted-foreground font-mono mt-1">v0.1.0-build.842</div>
            <Button variant="outline" size="sm" className="w-full mt-4 border-white/10 hover:bg-white/5">Check Updates</Button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="max-w-2xl flex flex-col gap-6 pb-12">
            
            {activeTab === "general" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">General</h2>
                  <p className="text-muted-foreground">Basic system configuration and preferences.</p>
                </div>
                
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg">Language & Region</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-[1fr_200px] gap-4 items-center">
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
                    <div className="grid grid-cols-[1fr_200px] gap-4 items-center border-t border-white/5 pt-4">
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

            {activeTab === "appearance" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Appearance</h2>
                  <p className="text-muted-foreground">Visual styling and UI density.</p>
                </div>
                
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="pt-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">Theme Mode</div>
                        <div className="text-xs text-muted-foreground">ZaraOS is designed for Dark Mode.</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="border-primary text-primary bg-primary/10">Dark</Button>
                        <Button variant="outline" className="border-white/10 text-muted-foreground hover:text-white" disabled>Light (Not Rec.)</Button>
                      </div>
                    </div>
                    
                    <div className="border-t border-white/5 pt-6">
                      <div className="mb-4">
                        <div className="text-sm font-medium text-white">Accent Color</div>
                        <div className="text-xs text-muted-foreground">Primary UI highlight color</div>
                      </div>
                      <div className="flex gap-4">
                        {['bg-cyan-400 ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-background', 'bg-purple-500', 'bg-amber-500', 'bg-green-500', 'bg-red-500'].map((color, i) => (
                          <div key={i} className={`w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform ${color}`}></div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "voice" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Voice & Audio</h2>
                  <p className="text-muted-foreground">Assistant voice configuration and audio outputs.</p>
                </div>
                
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="pt-6 flex flex-col gap-6">
                    <div className="grid grid-cols-[1fr_200px] gap-4 items-center">
                      <div>
                        <div className="text-sm font-medium text-white">Zara Voice Model</div>
                        <div className="text-xs text-muted-foreground">Synthesized voice characteristics</div>
                      </div>
                      <Select defaultValue="zara-1">
                        <SelectTrigger className="bg-black/50 border-white/10">
                          <SelectValue placeholder="Select Voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zara-1">Zara Default (Smooth)</SelectItem>
                          <SelectItem value="zara-2">Zara Technical (Crisp)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="border-t border-white/5 pt-6">
                      <div className="mb-4">
                        <div className="text-sm font-medium text-white">Speaking Speed</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-muted-foreground">0.5x</span>
                        <Slider defaultValue={[1]} max={2} step={0.1} className="flex-1" />
                        <span className="text-xs font-mono text-muted-foreground">2.0x</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-white/5 pt-6">
                      <div>
                        <div className="text-sm font-medium text-white">Always Listening (Wake Word)</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          Respond to "Hey Zara" <span className="bg-amber-500/20 text-amber-400 px-1 rounded text-[10px] uppercase">High Battery Usage</span>
                        </div>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "gestures" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Gestures</h2>
                  <p className="text-muted-foreground">Camera-based spatial tracking controls.</p>
                </div>
                
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="pt-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                      <div>
                        <div className="text-sm font-medium text-white">Enable Camera Tracking</div>
                        <div className="text-xs text-muted-foreground">Required for all spatial gestures</div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    {[
                      { name: "Swipe Left/Right", action: "Switch Workspaces" },
                      { name: "Open Palm", action: "Show App Launcher" },
                      { name: "Pinch & Drag", action: "Scroll/Pan" },
                      { name: "Fist", action: "Close Active Window" }
                    ].map((g, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="text-sm text-gray-300">{g.name}</div>
                        <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">{g.action}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {activeTab === "system" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">System Status</h2>
                  <p className="text-muted-foreground">Hardware resources and kernel parameters.</p>
                </div>
                
                <Card className="bg-card/40 border-white/5 backdrop-blur">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 divide-x divide-y divide-white/5">
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                          <Cpu className="w-5 h-5" /> <span className="text-sm font-medium">Processor</span>
                        </div>
                        <div className="text-xl font-bold text-white">Neural Core X1</div>
                        <div className="text-xs font-mono text-green-400 mt-2">Optimal (45°C)</div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                          <HardDrive className="w-5 h-5" /> <span className="text-sm font-medium">Memory</span>
                        </div>
                        <div className="text-xl font-bold text-white">32 GB LPDDR6</div>
                        <div className="text-xs font-mono text-primary mt-2">18.4 GB Available</div>
                      </div>
                    </div>
                    <div className="p-6 border-t border-white/5 flex gap-4">
                      <Button variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30">Restart System</Button>
                      <Button variant="outline" className="border-white/10 hover:bg-white/5">Export Diagnostics</Button>
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
