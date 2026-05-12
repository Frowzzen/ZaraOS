// ============================================================
// Zara Assistant — Alpha 0.4
//
// Upgraded from Alpha 0.3:
//   - Real Web Speech API voice input (no more simulation)
//   - Live interim transcript shown in input field while speaking
//   - Voice error messages (permission denied, not supported, etc.)
//   - Voice unsupported notice for Firefox / non-Chrome browsers
//   - All existing streaming + memory features retained
// ============================================================

import { Layout } from "@/components/layout";
import { ConnectAIPanel } from "@/components/connect-ai-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceWaveform } from "@/components/voice-waveform";
import { useRuntime } from "@/core/runtime-context";
import { voiceEngine } from "@/lib/voice-engine";
import { usePrivacy } from "@/lib/privacy-store";
import { parseAndRoute } from "@/lib/command-router";
import { useLocation } from "wouter";
import {
  Mic,
  MicOff,
  Send,
  Command,
  Activity,
  Cpu,
  Cloud,
  CloudOff,
  Lock,
  Radio,
  Hand,
  Keyboard,
  Trash2,
  Database,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ZaraStatus, InputSource } from "@/core/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: InputSource;
  timestamp: number;
  provider?: string;
  model?: string;
  latencyMs?: number;
  streamed?: boolean;
}

const STATUS_CONFIG: Record<ZaraStatus, { label: string; color: string; glow: string; pulse: boolean }> = {
  idle:           { label: "Idle",         color: "bg-gray-500",   glow: "",                                           pulse: false },
  listening:      { label: "Listening",    color: "bg-amber-400",  glow: "shadow-[0_0_16px_rgba(251,191,36,0.6)]",    pulse: true  },
  thinking:       { label: "Thinking",     color: "bg-purple-500", glow: "shadow-[0_0_16px_rgba(168,85,247,0.6)]",    pulse: true  },
  speaking:       { label: "Responding",   color: "bg-cyan-400",   glow: "shadow-[0_0_16px_rgba(34,211,238,0.6)]",    pulse: true  },
  offline:        { label: "Offline",      color: "bg-red-500",    glow: "shadow-[0_0_16px_rgba(239,68,68,0.4)]",     pulse: false },
  "privacy-lock": { label: "Privacy Lock", color: "bg-green-500",  glow: "shadow-[0_0_16px_rgba(34,197,94,0.5)]",     pulse: false },
};

const SOURCE_ICON: Record<InputSource, React.ReactNode> = {
  voice:    <Radio className="w-3 h-3" />,
  gesture:  <Hand className="w-3 h-3" />,
  keyboard: <Keyboard className="w-3 h-3" />,
  system:   <Cpu className="w-3 h-3" />,
  plugin:   <Command className="w-3 h-3" />,
};

const SUGGESTED_COMMANDS = [
  "What can you do?",
  "summarize folder",
  "system status",
  "open settings",
  "play music",
];

// Intents handled by executeCommand (action + navigation) — NOT routed to AI
const ACTION_INTENTS = new Set([
  "open_app", "close_app", "navigation_action", "scroll_action",
  "file_action", "media_action", "privacy_action", "settings_action",
  "developer_action", "skill_action", "system_control",
  "launch_native_app", "close_native_app", "focus_native_app",
  "minimize_native_app", "cycle_apps",
]);

export default function Assistant() {
  const {
    zaraStatus,
    streamAssistantMessage,
    clearAIConversation,
    aiRuntimeStatus,
    executeCommand,
  } = useRuntime();
  const [, navigate] = useLocation();
  const { setMicActive, localAIRunning, cloudAIRunning } = usePrivacy();

  const [showConnectPanel, setShowConnectPanel] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I am Zara. I operate locally — your data never leaves this device. How can I help you?",
      source: "system",
      timestamp: Date.now(),
    },
  ]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetingSpoken = useRef(false);

  // Boot greeting — spoken once on mount.
  // Uses polling because WebKit2GTK does not reliably fire "voiceschanged".
  useEffect(() => {
    if (greetingSpoken.current) return;
    greetingSpoken.current = true;

    const doSpeak = () =>
      voiceEngine.speak(
        "Hello. I am Zara. I am online and running locally on this device. How can I help you today?",
        { rate: 0.97, pitch: 1.05 }
      );

    // Poll every 300 ms until voices are available (max 5 s), then speak.
    // If voices never load, speak anyway — browser uses its default voice.
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const voicesReady =
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        window.speechSynthesis.getVoices().length > 0;
      if (voicesReady || attempts >= 17) {
        clearInterval(poll);
        setTimeout(doSpeak, 600);
      }
    }, 300);

    return () => clearInterval(poll);
  }, []);

  // Track TTS speaking state for visual feedback and stop button
  useEffect(() => {
    return voiceEngine.onSpeakingChange(setIsSpeaking);
  }, []);

  // Keep a ref to handleSend so voice callbacks always see the latest version
  // without needing it in the subscription useEffect dependency array.
  const handleSendRef = useRef<((text: string, source: InputSource) => Promise<void>) | undefined>(undefined);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, zaraStatus, scrollToBottom]);

  const handleSend = useCallback(async (text?: string, source: InputSource = "keyboard") => {
    const userInput = (text ?? input).trim();
    if (!userInput) return;
    setInput("");
    setInterimTranscript("");

    const userMsg: Message = {
      role: "user",
      content: userInput,
      source,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // ── Route: action commands (navigation, system control, app launch, etc.) ──
    // These get an instant spoken confirmation + immediate action, no AI wait.
    const parsed = parseAndRoute(userInput, source);
    if (ACTION_INTENTS.has(parsed.intent)) {
      // Acknowledge voice input immediately so the user knows Zara heard them
      if (source === "voice") voiceEngine.speak("On it.", { rate: 1.1, pitch: 1.05 });

      try {
        const result = await executeCommand(userInput, source);
        const reply = result.response || "Done.";

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply, source: "system", timestamp: Date.now() },
        ]);

        // Speak the confirmation response
        voiceEngine.speak(reply, { rate: 0.98, pitch: 1.05 });

        // Execute navigation after a brief moment so Zara can start speaking first
        if (result.action === "navigate" && result.payload) {
          setTimeout(() => navigate(result.payload!), 900);
        }
      } catch {
        const errMsg = "I couldn't complete that action. Please try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errMsg, source: "system", timestamp: Date.now() },
        ]);
        voiceEngine.speak(errMsg);
      }
      return;
    }

    // ── Route: AI questions — stream the response then speak it ──
    // Acknowledge voice input immediately
    if (source === "voice") voiceEngine.speak("Let me think about that.", { rate: 1.05, pitch: 1.05 });

    let accumulated = "";
    setStreamingContent("");

    try {
      await streamAssistantMessage(
        userInput,
        (chunk) => {
          if (!chunk.done) {
            accumulated += chunk.delta;
            setStreamingContent(accumulated);
          }
        },
        source
      );

      setStreamingContent(null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: accumulated,
          source: "system",
          timestamp: Date.now(),
          provider: aiRuntimeStatus.providerId,
          model: aiRuntimeStatus.modelId,
          latencyMs: aiRuntimeStatus.latencyMs,
          streamed: true,
        },
      ]);
      // Speak the full AI response
      if (accumulated) voiceEngine.speak(accumulated);
    } catch {
      setStreamingContent(null);
      const errMsg = "Something went wrong. Make sure an AI provider is connected.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errMsg, source: "system", timestamp: Date.now() },
      ]);
      voiceEngine.speak(errMsg);
    }
  }, [input, streamAssistantMessage, executeCommand, navigate, aiRuntimeStatus.providerId, aiRuntimeStatus.modelId, aiRuntimeStatus.latencyMs]);

  // Keep ref in sync
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Auto-send a pending query forwarded from the desktop command bar.
  // When the user types e.g. "what is the weather?" in the main command bar
  // and it routes here, we pick up the message and send it automatically
  // so the conversation starts with their actual question — not a blank slate.
  useEffect(() => {
    const pending = sessionStorage.getItem("zaraos:pendingQuery");
    if (!pending) return;
    sessionStorage.removeItem("zaraos:pendingQuery");
    // Short delay: let the component mount and boot greeting fire first.
    const t = setTimeout(() => {
      handleSendRef.current?.(pending, "keyboard");
    }, 600);
    return () => clearTimeout(t);
  }, []); // Only on mount — intentionally empty deps

  // ── Wire voice engine ──────────────────────────────────
  // Subscribe once on mount. Callbacks call handleSend via the ref
  // to avoid stale closures.

  useEffect(() => {
    const unsubResult = voiceEngine.onResult((text, isFinal) => {
      if (isFinal) {
        setInterimTranscript("");
        setIsListening(false);
        setMicActive(false);
        handleSendRef.current?.(text, "voice");
      } else {
        setInterimTranscript(text);
      }
    });

    const unsubState = voiceEngine.onStateChange((state, errorMsg) => {
      if (state === "idle") {
        setIsListening(false);
        setMicActive(false);
        setInterimTranscript("");
      } else if (state === "listening") {
        setIsListening(true);
        setMicActive(true);
        setVoiceError(null);
      } else if (state === "error" || state === "unsupported") {
        setIsListening(false);
        setMicActive(false);
        setInterimTranscript("");
        if (errorMsg) setVoiceError(errorMsg);
      }
    });

    return () => {
      unsubResult();
      unsubState();
      voiceEngine.abort();
    };
  }, [setMicActive]);

  const handleClearConversation = () => {
    clearAIConversation();
    setMessages([
      {
        role: "assistant",
        content: "Conversation cleared. Memory reset. How can I help you?",
        source: "system",
        timestamp: Date.now(),
      },
    ]);
    setStreamingContent(null);
  };

  const toggleVoice = () => {
    setVoiceError(null);
    if (isListening) {
      voiceEngine.stopListening();
    } else {
      voiceEngine.startListening();
    }
  };

  const statusCfg = STATUS_CONFIG[zaraStatus];
  const isStreaming = streamingContent !== null;
  const isBusy = zaraStatus === "thinking" || isStreaming;
  const voiceSupported = voiceEngine.isSupported;
  const ttsSupportted = voiceEngine.isTTSSupported;

  return (
    <Layout>
      <div className="flex flex-col h-full max-w-4xl mx-auto">
        {/* ── Status Bar ── */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex-shrink-0">
              <div
                className={`w-12 h-12 rounded-full ${statusCfg.color} ${statusCfg.glow} flex items-center justify-center transition-all duration-500`}
              >
                <span className="font-mono font-bold text-white text-lg select-none">Z</span>
              </div>
              {statusCfg.pulse && (
                <div className={`absolute inset-0 rounded-full ${statusCfg.color} opacity-30 animate-ping`} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white leading-none">Zara</h2>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    zaraStatus === "offline"
                      ? "text-red-400 border-red-500/30 bg-red-500/10"
                      : "text-primary/80 border-primary/20 bg-primary/5"
                  }`}
                >
                  {statusCfg.label.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {aiRuntimeStatus.providerName} / {aiRuntimeStatus.modelId}
                {aiRuntimeStatus.isSimulated && (
                  <span className="ml-1.5 text-amber-400/60">[simulated]</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {(aiRuntimeStatus.memoryTokens ?? 0) > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-muted-foreground/50">
                <Database className="w-3 h-3" />
                <span>{aiRuntimeStatus.memoryTokens} tok</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
              {localAIRunning ? (
                <Cpu className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-red-400" />
              )}
              <span className={localAIRunning ? "text-green-400" : "text-red-400"}>
                {aiRuntimeStatus.providerName}
              </span>
            </div>
            {cloudAIRunning && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30">
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400">Cloud</span>
              </div>
            )}
            {!localAIRunning && !cloudAIRunning && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/30">
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400">Privacy Lock</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10"
              onClick={handleClearConversation}
              title="Clear conversation"
              data-testid="button-clear-conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Simulated Mode Banner ── */}
        {aiRuntimeStatus.isSimulated && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400/70">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Simulated mode — no real AI provider connected</span>
              </div>
              <button
                onClick={() => setShowConnectPanel((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0 ml-3"
              >
                <Zap className="w-3 h-3" />
                Connect AI
                {showConnectPanel
                  ? <ChevronUp className="w-3 h-3 ml-0.5" />
                  : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>
            </div>
            {showConnectPanel && (
              <div className="px-4 pb-4 border-t border-amber-500/10">
                <ConnectAIPanel onConnected={() => setShowConnectPanel(false)} />
              </div>
            )}
          </div>
        )}

        {/* ── Chat Panel ── */}
        <div className="flex-1 min-h-0 bg-card/30 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 max-w-[88%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center border shadow-lg ${
                    msg.role === "user"
                      ? "bg-card border-white/10 text-white"
                      : "bg-purple-900/30 border-purple-500/30 text-purple-400"
                  }`}
                >
                  {msg.role === "user" ? (
                    <Command className="w-4 h-4" />
                  ) : (
                    <span className="font-mono font-bold text-sm">Z</span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary/20 border border-primary/30 text-white rounded-tr-sm shadow-[0_4px_20px_rgba(0,240,255,0.1)]"
                        : "bg-card/80 border border-white/5 text-gray-200 rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div
                    className={`flex items-center gap-2 text-[10px] font-mono text-muted-foreground/40 ${
                      msg.role === "user" ? "justify-end mr-1" : "ml-1"
                    }`}
                  >
                    {msg.source && (
                      <>
                        {SOURCE_ICON[msg.source as InputSource]}
                        <span>{msg.source}</span>
                      </>
                    )}
                    {msg.latencyMs !== undefined && (
                      <span className="text-muted-foreground/30">{msg.latencyMs}ms</span>
                    )}
                    {msg.streamed && <span className="text-primary/30">streamed</span>}
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming bubble */}
            {isStreaming && (
              <div className="flex gap-3 max-w-[88%]">
                <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center border bg-purple-900/30 border-purple-500/30 text-purple-400 shadow-lg">
                  <span className="font-mono font-bold text-sm">Z</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="px-4 py-3 rounded-2xl bg-card/80 border border-primary/10 text-gray-200 rounded-tl-sm shadow-[0_0_12px_rgba(0,240,255,0.05)]">
                    {streamingContent}
                    <span className="inline-block w-0.5 h-4 ml-0.5 bg-primary/70 animate-pulse align-middle" />
                  </div>
                  <div className="ml-1 text-[10px] font-mono text-primary/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse inline-block" />
                    <span>streaming</span>
                  </div>
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {zaraStatus === "thinking" && !isStreaming && (
              <div className="flex gap-3 max-w-[88%]">
                <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center border bg-purple-900/30 border-purple-500/30 text-purple-400 shadow-lg">
                  <span className="font-mono font-bold text-sm">Z</span>
                </div>
                <div className="px-4 py-3 rounded-2xl bg-card/80 border border-white/5 text-gray-200 rounded-tl-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* ── Input Bar ── */}
          <div className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-xl">

            {/* Zara speaking indicator */}
            {isSpeaking && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <VoiceWaveform active={true} color="cyan" size="sm" />
                <span className="text-xs font-mono text-cyan-400 tracking-wider">
                  ZARA IS SPEAKING
                </span>
                <button
                  className="ml-auto text-[10px] font-mono px-2.5 py-1 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                  onClick={() => voiceEngine.stopSpeaking()}
                >
                  stop
                </button>
              </div>
            )}

            {/* Voice listening indicator */}
            {isListening && !isSpeaking && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <VoiceWaveform active={isListening} color="amber" size="sm" />
                <span className="text-xs font-mono text-amber-400">
                  LISTENING{interimTranscript ? ` — "${interimTranscript}"` : " — speak now"}
                </span>
              </div>
            )}

            {/* Voice error */}
            {voiceError && !isListening && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span className="text-xs font-mono text-red-400/80">{voiceError}</span>
                <button
                  className="ml-auto text-[10px] font-mono text-muted-foreground/40 hover:text-white"
                  onClick={() => setVoiceError(null)}
                >
                  dismiss
                </button>
              </div>
            )}

            {/* Voice not available — always visible when running in Tauri on Linux */}
            {!voiceSupported && (
              <div className="flex items-center gap-2 mb-3 px-1 text-[11px] font-mono text-amber-400/50">
                <Mic className="w-3 h-3 flex-shrink-0" />
                <span>
                  {voiceEngine.isTauriMode
                    ? "Mic input coming in Alpha 0.7 — type commands or ask Zara anything below."
                    : "Voice input requires Chrome or Edge."}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              {/* Mic button */}
              <Button
                variant="outline"
                size="icon"
                className={`h-12 w-12 rounded-full flex-shrink-0 border-2 transition-all duration-300 ${
                  !voiceSupported
                    ? "border-white/5 text-muted-foreground/20 cursor-not-allowed opacity-40"
                    : isListening
                    ? "border-amber-500 bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                    : "border-white/10 hover:border-primary/50 hover:text-primary hover:bg-primary/10"
                }`}
                onClick={voiceSupported ? toggleVoice : undefined}
                disabled={!voiceSupported || isBusy}
                data-testid="button-voice-toggle"
                title={
                  !voiceSupported
                    ? voiceEngine.isTauriMode
                      ? "Mic input coming in Alpha 0.7 — use the keyboard for now"
                      : "Voice not supported — use Chrome or Edge"
                    : isListening
                    ? "Stop listening"
                    : "Start voice input"
                }
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <div className="relative flex-1">
                <Input
                  value={isListening && interimTranscript ? interimTranscript : input}
                  onChange={(e) => !isListening && setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isBusy && !isListening && handleSend()}
                  placeholder={
                    isListening
                      ? "Listening..."
                      : "Type a command or ask Zara anything..."
                  }
                  disabled={isListening || isBusy}
                  className={`w-full h-12 bg-background border-white/10 focus-visible:ring-primary focus-visible:border-primary text-sm px-5 rounded-full shadow-inner pr-14 ${
                    isListening && interimTranscript ? "text-amber-300/80 italic" : ""
                  }`}
                  data-testid="input-chat"
                  readOnly={isListening}
                />
                <Button
                  size="icon"
                  className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_12px_rgba(0,240,255,0.35)]"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isBusy || isListening}
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Suggested commands */}
            <div className="flex gap-2 mt-3 flex-wrap pl-16">
              {SUGGESTED_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  className="text-[11px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/10 cursor-pointer hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => handleSend(cmd, "keyboard")}
                  disabled={isBusy || isListening}
                  data-testid={`suggestion-${cmd.replace(/\s+/g, "-")}`}
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Input mode legend */}
            <div className="flex items-center gap-4 mt-3 pl-16 text-[10px] font-mono text-muted-foreground/40">
              <span className={`flex items-center gap-1 ${voiceSupported ? "" : "opacity-40"}`}>
                <Radio className="w-2.5 h-2.5" />
                Voice {voiceSupported ? "" : "(not supported)"}
              </span>
              <span className="flex items-center gap-1"><Hand className="w-2.5 h-2.5" /> Gesture</span>
              <span className="flex items-center gap-1"><Keyboard className="w-2.5 h-2.5" /> Keyboard</span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-center gap-2 mt-3 text-[11px] font-mono text-muted-foreground/40">
          <Activity className="w-3 h-3" />
          <span>
            {aiRuntimeStatus.isSimulated
              ? "Simulated mode — Install Ollama for real local inference"
              : aiRuntimeStatus.isCloud
                ? "Cloud AI active — data may leave this device"
                : "Running locally — nothing transmitted externally"
            }
          </span>
        </div>
      </div>
    </Layout>
  );
}
