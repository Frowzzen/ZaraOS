import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrivacy } from "@/lib/privacy-store";
import { Activity, Cpu, HardDrive, Network, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const privacy = usePrivacy();
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: "CPU Usage", value: "14%", icon: Cpu, color: "text-primary" },
    { label: "RAM Usage", value: "3.2 / 16 GB", icon: HardDrive, color: "text-secondary" },
    { label: "Neural Cores", value: "Active", icon: Zap, color: "text-purple-400" },
    { label: "Network IO", value: "1.2 MB/s", icon: Network, color: "text-green-400" },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">System Overview</h1>
            <p className="text-xl text-primary font-mono bg-primary/10 px-3 py-1 rounded-md border border-primary/20 inline-block shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              Welcome back. I am Zara, running locally.
            </p>
          </div>
          <div className="text-right font-mono hidden md:block">
            <div className="text-3xl text-white font-light">{time.toLocaleTimeString()}</div>
            <div className="text-muted-foreground">{time.toLocaleDateString()}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card/50 border-white/5 backdrop-blur-sm hover:border-primary/30 transition-colors duration-300">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-background ${stat.color} shadow-[0_0_15px_currentColor] opacity-80`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-mono">{stat.label}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
          
          {/* Privacy Status */}
          <Card className="col-span-1 bg-card/40 border-white/5 backdrop-blur flex flex-col">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                Privacy Fortress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 rounded bg-black/40 border border-white/5">
                <span className="text-sm font-medium">Local AI</span>
                {privacy.localAIRunning ? (
                  <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">Active</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">Inactive</span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-black/40 border border-white/5">
                <span className="text-sm font-medium">Cloud AI</span>
                {privacy.cloudAIRunning ? (
                  <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Active</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">Blocked</span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-black/40 border border-white/5">
                <span className="text-sm font-medium">Microphone</span>
                {privacy.micActive ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
                    <span className="text-xs text-amber-400">Listening</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Inactive</span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-black/40 border border-white/5">
                <span className="text-sm font-medium">Camera</span>
                {privacy.cameraActive ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
                    <span className="text-xs text-amber-400">Tracking</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Inactive</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="col-span-1 lg:col-span-2 bg-card/40 border-white/5 backdrop-blur flex flex-col">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-primary" />
                System Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              <div className="flex flex-col divide-y divide-white/5">
                {[
                  { time: "10:42 AM", msg: "Zara initialized successfully", type: "system" },
                  { time: "10:45 AM", msg: "Scanned 1,204 files in /Documents", type: "info" },
                  { time: "11:02 AM", msg: "User authenticated via biometrics", type: "auth" },
                  { time: "11:15 AM", msg: "Blocked tracking request from background process", type: "security" },
                  { time: "11:30 AM", msg: "Started local LLM inference context", type: "ai" },
                ].map((log, i) => (
                  <div key={i} className="flex gap-4 p-4 hover:bg-white/5 transition-colors group">
                    <span className="text-xs text-muted-foreground font-mono w-20 shrink-0 mt-0.5">{log.time}</span>
                    <span className={`text-sm ${log.type === 'security' ? 'text-green-400' : 'text-gray-300'} font-mono`}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
