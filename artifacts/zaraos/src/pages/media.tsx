import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize, FastForward, Rewind, PlaySquare, Music } from "lucide-react";
import { useState } from "react";

export default function Media() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState([30]);
  const [volume, setVolume] = useState([80]);
  const [activeTab, setActiveTab] = useState<"video" | "audio">("video");

  const playlist = [
    { title: "ZaraOS Core Introduction", duration: "02:45", type: "video" },
    { title: "Ambient Neural Network Beats", duration: "45:00", type: "audio" },
    { title: "System Diagnostics Log", duration: "12:30", type: "video" },
    { title: "Quantum Computing Overview", duration: "55:12", type: "video" },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex flex-col h-full gap-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
              <PlaySquare className="w-10 h-10 text-purple-400" />
              Media Center
            </h1>
            <p className="text-muted-foreground font-mono text-sm">Unified playback interface.</p>
          </div>
          <div className="flex gap-2 p-1 rounded-lg" style={{ background: "linear-gradient(145deg,#ffffff,#f0f2f8)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "inset 2px 2px 6px rgba(166,180,200,0.25), inset -1px -1px 4px rgba(255,255,255,0.85)" }}>
            <Button
              variant={activeTab === "video" ? "default" : "ghost"}
              className={activeTab === "video" ? "bg-primary/20 text-primary hover:bg-primary/30" : "text-muted-foreground hover:text-slate-900"}
              onClick={() => setActiveTab("video")}
              data-testid="tab-video"
            >
              <PlaySquare className="w-4 h-4 mr-2" /> Video
            </Button>
            <Button
              variant={activeTab === "audio" ? "default" : "ghost"}
              className={activeTab === "audio" ? "bg-primary/20 text-primary hover:bg-primary/30" : "text-muted-foreground hover:text-slate-900"}
              onClick={() => setActiveTab("audio")}
              data-testid="tab-audio"
            >
              <Music className="w-4 h-4 mr-2" /> Audio
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Player Viewport */}
            <Card className="overflow-hidden relative flex-1 min-h-[300px] flex flex-col" style={{ background: "linear-gradient(145deg,#1e1f2e,#15161f)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black"></div>
              
              <div className="flex-1 flex items-center justify-center relative z-10">
                {isPlaying ? (
                  <div className="w-32 h-32 rounded-full border-4 border-purple-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.2)] animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-purple-500/20"></div>
                  </div>
                ) : (
                  <div className="text-muted-foreground/50 flex flex-col items-center gap-4">
                    {activeTab === "video" ? <PlaySquare className="w-16 h-16" /> : <Music className="w-16 h-16" />}
                    <span className="font-mono text-sm uppercase tracking-widest">NO MEDIA PLAYING</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent relative z-20">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground">01:23</span>
                    <Slider 
                      value={progress} 
                      onValueChange={setProgress} 
                      max={100} 
                      step={1} 
                      className="flex-1 cursor-pointer" 
                      data-testid="slider-progress"
                    />
                    <span className="text-xs font-mono text-muted-foreground">02:45</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" data-testid="btn-rewind">
                        <Rewind className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" data-testid="btn-skip-back">
                        <SkipBack className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="w-12 h-12 rounded-full border-primary/50 text-primary hover:bg-primary/20 hover:text-primary transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                        onClick={() => setIsPlaying(!isPlaying)}
                        data-testid="btn-play-pause"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" data-testid="btn-skip-forward">
                        <SkipForward className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" data-testid="btn-fast-forward">
                        <FastForward className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-4 w-48">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      <Slider value={volume} onValueChange={setVolume} max={100} step={1} className="flex-1" data-testid="slider-volume" />
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" data-testid="btn-maximize">
                        <Maximize className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
              Up Next
              <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">AUTOPLAY</span>
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
              {playlist.map((item, i) => (
                <div key={i} className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer group transition-all
                  ${i === 0 
                    ? 'bg-purple-900/20 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}
                `}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                      ${i === 0 ? 'bg-purple-500/20 text-purple-500' : 'bg-slate-100 text-muted-foreground'}
                    `}>
                      {item.type === 'video' ? <PlaySquare className="w-5 h-5" /> : <Music className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className={`font-medium text-sm line-clamp-1 ${i === 0 ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-800'}`}>
                        {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{item.duration}</div>
                    </div>
                  </div>
                  {i === 0 && <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse"></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
