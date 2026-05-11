import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { aiEngine } from "@/lib/ai-engine";
import { voiceEngine } from "@/lib/voice-engine";
import { usePrivacy } from "@/lib/privacy-store";
import { Mic, Send, Command, Activity } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Assistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I'm Zara. How can I assist you today? I'm running locally, so your data stays here." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setMicActive } = usePrivacy();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    try {
      const response = await aiEngine.sendMessage(userMsg);
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error communicating with AI engine." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleVoice = async () => {
    if (!isListening) {
      const permitted = await voiceEngine.requestPermission();
      if (permitted) {
        voiceEngine.startListening();
        setIsListening(true);
        setMicActive(true);
        // Simulate listening for 3 seconds then returning text
        setTimeout(() => {
          setInput("Summarize my recent documents");
          toggleVoice();
        }, 3000);
      }
    } else {
      voiceEngine.stopListening();
      setIsListening(false);
      setMicActive(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full max-w-4xl mx-auto bg-card/30 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
            <h2 className="font-bold text-lg text-white">Zara Core</h2>
            <span className="text-xs font-mono text-muted-foreground px-2 py-1 bg-white/5 rounded border border-white/10">v0.1</span>
          </div>
          <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            LOCAL INFERENCE
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-card border-white/10 text-white' 
                  : 'bg-purple-900/30 border-purple-500/30 text-purple-400'
              }`}>
                {msg.role === 'user' ? <Command className="w-5 h-5" /> : 'Z'}
              </div>
              <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground font-medium rounded-tr-sm shadow-[0_4px_20px_rgba(0,240,255,0.15)]'
                  : 'bg-card/80 border border-white/5 text-gray-200 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border bg-purple-900/30 border-purple-500/30 text-purple-400 shadow-lg">
                Z
              </div>
              <div className="px-5 py-3.5 rounded-2xl bg-card/80 border border-white/5 text-gray-200 rounded-tl-sm flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-xl">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="icon"
              className={`h-14 w-14 rounded-full flex-shrink-0 border-2 transition-all duration-300 ${
                isListening 
                  ? 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:bg-amber-500/30 hover:text-amber-300' 
                  : 'border-white/10 hover:border-primary/50 hover:text-primary hover:bg-primary/10'
              }`}
              onClick={toggleVoice}
              data-testid="button-voice-toggle"
            >
              <Mic className="w-6 h-6" />
            </Button>
            <div className="relative flex-1">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a command or ask a question..."
                className="w-full h-14 bg-background border-white/10 focus-visible:ring-primary focus-visible:border-primary text-base px-6 rounded-full shadow-inner"
                data-testid="input-chat"
              />
              <Button 
                size="icon"
                className="absolute right-2 top-2 h-10 w-10 rounded-full bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 mt-3 pl-16">
            {["summarize folder", "open settings", "play music"].map(cmd => (
              <span key={cmd} className="text-xs font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded cursor-pointer hover:bg-white/10 hover:text-white transition-colors" onClick={() => setInput(cmd)}>
                /{cmd}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
