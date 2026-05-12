import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { useRuntime } from "@/core/runtime-hook";
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
  const [, navigate] = useLocation();
  const { executeCommand } = useRuntime();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCommand = async () => {
    if (!input.trim()) return;

    const cmd = input;
    setInput("");

    setLogs(prev => [...prev, { type: "input", text: `> ${cmd}` }]);

    try {
      const result = await executeCommand(cmd, "keyboard");
      setLogs(prev => [...prev, { type: "output", text: result.response }]);

      if (result.action === "navigate" && result.payload) {
        setTimeout(() => navigate(result.payload!), 1000);
      }
    } catch (err) {
      setLogs(prev => [...prev, {
        type: "output",
        text: err instanceof Error ? `Error: ${err.message}` : "Command failed.",
      }]);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full rounded-xl overflow-hidden font-mono" style={{ background: "linear-gradient(145deg,#1e1f2e,#15161f)", border: "1px solid rgba(99,102,241,0.18)", boxShadow: "6px 6px 20px rgba(166,180,200,0.35), -4px -4px 14px rgba(255,255,255,0.85)" }}>
        <div className="p-3 flex items-center gap-3" style={{ background: "rgba(30,31,46,0.96)", borderBottom: "1px solid rgba(99,102,241,0.12)" }}>
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

        <div className="p-4 flex items-center" style={{ borderTop: "1px solid rgba(99,102,241,0.12)", background: "rgba(20,21,30,0.98)" }}>
          <span className="text-primary font-bold mr-3">{">"}</span>
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
            className="flex-1 bg-transparent border-none text-green-300 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 rounded-none h-auto font-mono text-sm placeholder:text-slate-600"
            placeholder="Enter command..."
            autoFocus
            data-testid="input-console"
          />
        </div>
      </div>
    </Layout>
  );
}
