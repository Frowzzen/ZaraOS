import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { routeCommand } from "@/lib/command-router";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon } from "lucide-react";

interface LogEntry {
  type: "input" | "output" | "system";
  text: string;
}

export default function Console() {
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: "system", text: "ZaraOS Core Terminal v0.1" },
    { type: "system", text: "Natural language command parser ready." },
    { type: "system", text: "Type a command e.g., 'open browser', 'show files', 'enable developer mode'" }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCommand = () => {
    if (!input.trim()) return;
    
    const cmd = input;
    setInput("");
    
    setLogs(prev => [...prev, { type: "input", text: `> ${cmd}` }]);
    
    // Simulate processing delay
    setTimeout(() => {
      const response = routeCommand(cmd);
      setLogs(prev => [...prev, { type: "output", text: response.output }]);
      
      if (response.action === "navigate" && response.payload) {
        setTimeout(() => {
          setLocation(response.payload);
        }, 1000);
      }
    }, 400);
  };

  return (
    <Layout>
      <div className="flex flex-col h-full bg-black/80 border border-primary/20 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.05)] font-mono">
        <div className="p-3 bg-card border-b border-white/10 flex items-center gap-3">
          <TerminalIcon className="w-5 h-5 text-primary" />
          <span className="text-sm text-primary font-bold tracking-widest uppercase">Zara Console</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2 text-sm leading-relaxed" ref={scrollRef}>
          {logs.map((log, i) => (
            <div key={i} className={`
              ${log.type === 'system' ? 'text-muted-foreground' : ''}
              ${log.type === 'input' ? 'text-primary font-bold mt-2' : ''}
              ${log.type === 'output' ? 'text-gray-300' : ''}
              whitespace-pre-wrap
            `}>
              {log.text}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-black flex items-center">
          <span className="text-primary font-bold mr-3">{">"}</span>
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
            className="flex-1 bg-transparent border-none text-white focus-visible:ring-0 focus-visible:ring-offset-0 px-0 rounded-none h-auto font-mono text-sm placeholder:text-muted-foreground"
            placeholder="Enter command..."
            autoFocus
            data-testid="input-console"
          />
        </div>
      </div>
    </Layout>
  );
}
