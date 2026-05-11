// ============================================================
// Global Command Box — Alpha 0.4
//
// A persistent floating text input accessible from every panel.
// Wired to real voice input — the Mic button now actually works.
//
// Open/close:  Ctrl+Space keyboard shortcut
//              or the floating trigger button in the Layout
//
// All commands route through zaraRuntime.executeCommand()
// with source = "keyboard" or "voice" — same pipeline as always.
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useRuntime } from "@/core/runtime-context";
import { useInputMode, INPUT_MODE_META } from "@/core/input-mode";
import { voiceEngine } from "@/lib/voice-engine";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  Send,
  X,
  Mic,
  MicOff,
  ChevronRight,
  Clock,
  Command,
  AlertTriangle,
} from "lucide-react";

interface CommandHistoryEntry {
  input: string;
  response: string;
  timestamp: number;
}

const MAX_HISTORY = 5;

export function GlobalCommandBox() {
  const { isCommandBoxOpen, closeCommandBox } = useInputMode();
  const { executeCommand, zaraStatus } = useRuntime();
  const [, navigate] = useLocation();

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Voice state
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Ref so the submit callback always sees the latest submit fn
  const submitRef = useRef<((text: string) => Promise<void>) | undefined>(undefined);

  // Focus input when opened
  useEffect(() => {
    if (isCommandBoxOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setInput("");
      setHistoryIndex(-1);
      setVoiceError(null);
      // Stop listening when box closes
      if (voiceEngine.isListening) voiceEngine.abort();
    }
  }, [isCommandBoxOpen]);

  // Click-outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        closeCommandBox();
      }
    }
    if (isCommandBoxOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isCommandBoxOpen, closeCommandBox]);

  const handleSubmit = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setInput("");
    setHistoryIndex(-1);
    setInterimTranscript("");

    const result = await executeCommand(text, "keyboard");

    setHistory((prev) => [
      { input: text, response: result.response, timestamp: Date.now() },
      ...prev.slice(0, MAX_HISTORY - 1),
    ]);

    if (result.action === "navigate" && result.payload) {
      navigate(result.payload);
      closeCommandBox();
    }

    setIsProcessing(false);
  }, [input, isProcessing, executeCommand, navigate, closeCommandBox]);

  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  // ── Wire voice engine ──────────────────────────────────

  useEffect(() => {
    const unsubResult = voiceEngine.onResult((text, isFinal) => {
      if (isFinal) {
        setIsVoiceListening(false);
        setInterimTranscript("");
        // Submit the voice result as a command
        submitRef.current?.(text);
      } else {
        setInterimTranscript(text);
      }
    });

    const unsubState = voiceEngine.onStateChange((state, errorMsg) => {
      if (state === "listening") {
        setIsVoiceListening(true);
        setVoiceError(null);
      } else if (state === "idle") {
        setIsVoiceListening(false);
        setInterimTranscript("");
      } else if (state === "error" || state === "unsupported") {
        setIsVoiceListening(false);
        setInterimTranscript("");
        if (errorMsg) setVoiceError(errorMsg);
      }
    });

    return () => {
      unsubResult();
      unsubState();
    };
  }, []);

  const toggleVoice = () => {
    setVoiceError(null);
    if (isVoiceListening) {
      voiceEngine.stopListening();
    } else {
      voiceEngine.startListening();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(next);
      setInput(history[next]?.input ?? "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(historyIndex - 1, -1);
      setHistoryIndex(next);
      setInput(next === -1 ? "" : history[next]?.input ?? "");
    }
  };

  const modeKey = "hybrid" as const;
  const modeMeta = INPUT_MODE_META[modeKey];

  if (!isCommandBoxOpen) return null;

  const displayValue = isVoiceListening && interimTranscript ? interimTranscript : input;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" />

      {/* Panel */}
      <div
        ref={overlayRef}
        className="relative w-full max-w-2xl mx-4 mb-8 pointer-events-auto animate-in slide-in-from-bottom-6 fade-in duration-200"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-card/90 border border-white/10 border-b-0 rounded-t-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary/80">ZARA COMMAND</span>
            <span className="text-white/20 px-1">|</span>
            <span>Ctrl+Space to toggle</span>
            {isVoiceListening && (
              <>
                <span className="text-white/20 px-1">|</span>
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                  LISTENING
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${modeMeta.color} ${modeMeta.borderColor} ${modeMeta.bgColor}`}>
              {isVoiceListening ? "VOICE INPUT" : "TEXT INPUT"}
            </span>
            <button
              onClick={closeCommandBox}
              className="text-muted-foreground hover:text-white transition-colors p-1 rounded"
              data-testid="button-close-command-box"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main panel */}
        <div className="bg-card/95 border border-white/10 border-t-0 rounded-b-2xl backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/50">
          {/* History */}
          {history.length > 0 && (
            <div className="px-4 pt-3 pb-1 flex flex-col gap-1.5 border-b border-white/5">
              {history.slice(0, 3).map((entry, i) => (
                <button
                  key={i}
                  className="flex items-start gap-2 text-left group"
                  onClick={() => setInput(entry.input)}
                  data-testid={`history-entry-${i}`}
                >
                  <Clock className="w-3 h-3 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-muted-foreground/60 group-hover:text-white/60 transition-colors truncate">
                      {entry.input}
                    </div>
                    <div className="text-[10px] text-muted-foreground/30 truncate">
                      <ChevronRight className="w-2.5 h-2.5 inline mr-0.5" />
                      {entry.response}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Voice error */}
          {voiceError && (
            <div className="px-4 pt-2 flex items-center gap-2 text-xs font-mono text-red-400/80">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span className="flex-1">{voiceError}</span>
              <button
                className="text-muted-foreground/40 hover:text-white text-[10px]"
                onClick={() => setVoiceError(null)}
              >
                dismiss
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Command className="w-4 h-4 text-primary/60 flex-shrink-0" />
            <input
              ref={inputRef}
              value={displayValue}
              onChange={(e) => !isVoiceListening && setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isVoiceListening ? "Speak your command..." : "Type any command or question..."}
              className={`flex-1 bg-transparent text-base placeholder:text-muted-foreground/40 outline-none font-sans ${
                isVoiceListening && interimTranscript ? "text-amber-300/80 italic" : "text-white"
              }`}
              data-testid="input-global-command"
              disabled={isProcessing}
              readOnly={isVoiceListening}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {voiceEngine.isSupported && (
                <button
                  className={`transition-colors p-1 rounded ${
                    isVoiceListening
                      ? "text-amber-400 hover:text-amber-300"
                      : "text-muted-foreground/40 hover:text-amber-400"
                  }`}
                  onClick={toggleVoice}
                  title={isVoiceListening ? "Stop listening" : "Voice input"}
                  data-testid="button-command-box-voice"
                >
                  {isVoiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <Button
                size="sm"
                className="h-8 w-8 rounded-full p-0 bg-primary hover:bg-primary/80 shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isProcessing || isVoiceListening}
                data-testid="button-command-box-send"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Suggestions */}
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {[
              "open assistant",
              "system status",
              "show files",
              "open settings",
              "privacy status",
              "open developers",
            ].map((cmd) => (
              <button
                key={cmd}
                onClick={() => setInput(cmd)}
                className="text-[11px] font-mono text-muted-foreground/50 bg-white/5 hover:bg-white/10 hover:text-white px-2 py-0.5 rounded border border-white/10 transition-colors"
                data-testid={`cmd-suggestion-${cmd.replace(/\s+/g, "-")}`}
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Status line */}
          <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground/30">
              {voiceEngine.isSupported
                ? "Voice + text input — routes through Zara Runtime"
                : "Text input — voice requires Chrome or Edge"}
            </span>
            <span className={`text-[10px] font-mono ${
              zaraStatus === "thinking" ? "text-purple-400" :
              isVoiceListening ? "text-amber-400" :
              zaraStatus === "idle" ? "text-muted-foreground/30" : "text-primary/50"
            }`}>
              ZARA {isVoiceListening ? "LISTENING" : zaraStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
