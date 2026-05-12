import { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  X,
  Globe,
  Mic,
  MicOff,
  Search,
  ExternalLink,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  index: number;
  title: string;
  url: string;
  description: string;
  age?: string;
  favicon?: string;
}

interface ZaraMsg {
  id: string;
  role: "user" | "zara";
  text: string;
  results?: SearchResult[];
  loading?: boolean;
  error?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "What's happening in tech today",
  "Best mechanical keyboards 2025",
  "How to learn Rust",
  "youtube.com",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isDirectUrl(q: string): boolean {
  const s = q.trim();
  return (
    /^https?:\/\//i.test(s) ||
    /^www\./i.test(s) ||
    (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/|$)/.test(s) && !s.includes(" "))
  );
}

function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s;
}

function toViewableUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}?autoplay=0`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      return `https://www.youtube.com/embed/${id}?autoplay=0`;
    }
  } catch {
    /* not a URL */
  }
  return url;
}

function detectResultSelection(text: string): number | null {
  const q = text.toLowerCase().trim();
  const wordMap: Record<string, number> = {
    first: 1, "1st": 1, one: 1, "1": 1,
    second: 2, "2nd": 2, two: 2, "2": 2,
    third: 3, "3rd": 3, three: 3, "3": 3,
    fourth: 4, "4th": 4, four: 4, "4": 4,
    fifth: 5, "5th": 5, five: 5, "5": 5,
    sixth: 6, "6th": 6, six: 6, "6": 6,
  };
  const pattern =
    /\b(open|pull up|go to|show|visit|load|navigate to|take me to)\b.{0,12}?\b(first|second|third|fourth|fifth|sixth|1st|2nd|3rd|4th|5th|6th|one|two|three|four|five|six|[1-6])\b/i;
  const plain = /\b(result|number|#)\s*([1-6])\b/i;
  const m = q.match(pattern);
  if (m) return wordMap[m[2].toLowerCase()] ?? null;
  const m2 = q.match(plain);
  if (m2) return parseInt(m2[2], 10);
  return null;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function uid() {
  return Math.random().toString(36).slice(2);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ZaraBrowser() {
  const [messages, setMessages] = useState<ZaraMsg[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeUrl, setActiveUrl] = useState("");
  const [urlBarInput, setUrlBarInput] = useState("");
  const [iframeLoading, setIframeLoading] = useState(false);
  const [lastResults, setLastResults] = useState<SearchResult[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState(-1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigateTo = useCallback(
    (raw: string, fromChat = false) => {
      const url = toViewableUrl(normalizeUrl(raw));
      setActiveUrl(url);
      setUrlBarInput(url);
      setIframeLoading(true);
      setIframeError(false);
      setNavHistory((h) => {
        const next = h.slice(0, navIndex + 1);
        next.push(url);
        setNavIndex(next.length - 1);
        return next;
      });
      if (fromChat) {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "zara", text: `Opening ${domainOf(url)}...` },
        ]);
      }
    },
    [navIndex]
  );

  const goBack = () => {
    if (navIndex > 0) {
      const newIdx = navIndex - 1;
      setNavIndex(newIdx);
      const url = navHistory[newIdx];
      setActiveUrl(url);
      setUrlBarInput(url);
      setIframeLoading(true);
      setIframeError(false);
    }
  };

  const goForward = () => {
    if (navIndex < navHistory.length - 1) {
      const newIdx = navIndex + 1;
      setNavIndex(newIdx);
      const url = navHistory[newIdx];
      setActiveUrl(url);
      setUrlBarInput(url);
      setIframeLoading(true);
      setIframeError(false);
    }
  };

  const reload = () => {
    if (iframeRef.current && activeUrl) {
      iframeRef.current.src = activeUrl;
      setIframeLoading(true);
      setIframeError(false);
    }
  };

  // ── Search ─────────────────────────────────────────────────────────────────

  const runSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    const loadId = uid();
    setMessages((prev) => [
      ...prev,
      { id: loadId, role: "zara", text: "", loading: true },
    ]);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&count=6`
      );
      const data = (await res.json()) as {
        results?: SearchResult[];
        error?: string;
        setup?: boolean;
      };
      if (data.setup) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadId
              ? {
                  ...m,
                  loading: false,
                  error: true,
                  text: "Brave Search isn't configured yet. Add your BRAVE_SEARCH_API_KEY in the Secrets panel — get a free key at brave.com/search/api",
                }
              : m
          )
        );
        return;
      }
      if (!data.results?.length) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadId
              ? { ...m, loading: false, text: "I didn't find any results for that. Try rephrasing?" }
              : m
          )
        );
        return;
      }
      setLastResults(data.results);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadId
            ? {
                ...m,
                loading: false,
                text: `Here's what I found for "${query}". Say "open result 1" or tap any card to visit the site.`,
                results: data.results,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadId
            ? { ...m, loading: false, error: true, text: "Search failed — check your connection and try again." }
            : m
        )
      );
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ── Send ───────────────────────────────────────────────────────────────────

  const handleSend = useCallback(
    (text = input) => {
      const q = text.trim();
      if (!q) return;
      setInput("");
      setHasStarted(true);
      setMessages((prev) => [...prev, { id: uid(), role: "user", text: q }]);

      if (isDirectUrl(q)) {
        navigateTo(q, true);
        return;
      }
      const sel = detectResultSelection(q);
      if (sel !== null && lastResults.length > 0) {
        const result = lastResults[sel - 1];
        if (result) {
          navigateTo(result.url, true);
        } else {
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "zara", text: `I only have ${lastResults.length} results. Which one did you mean?` },
          ]);
        }
        return;
      }
      void runSearch(q);
    },
    [input, lastResults, navigateTo, runSearch]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const showViewer = !!activeUrl;

  return (
    <Layout>
      <div className="h-full flex overflow-hidden bg-transparent">

        {/* ── Conversation panel ── */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{
            width: showViewer ? "340px" : "100%",
            borderRight: showViewer ? "1px solid rgba(0,0,0,0.07)" : "none",
            transition: "width 0.3s ease",
          }}
        >

          {/* Header — only shown after conversation starts */}
          <AnimatePresence>
            {hasStarted && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div
                  className="rounded-lg overflow-hidden flex-shrink-0"
                  style={{ background: "#080808", padding: "2px 6px" }}
                >
                  <img
                    src="/zara-browser-logo.png"
                    alt="Zara Browser"
                    className="h-4 w-auto object-contain"
                    draggable={false}
                  />
                </div>
                {isSearching && (
                  <Loader2 className="w-3 h-3 text-black/28 animate-spin ml-auto" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Body — home screen OR messages */}
          <div className="flex-1 min-h-0 relative overflow-hidden">

            {/* HOME SCREEN */}
            <AnimatePresence>
              {!hasStarted && (
                <motion.div
                  key="home"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex flex-col items-center justify-center px-10"
                >
                  {/* Logo card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="rounded-2xl overflow-hidden mb-6 shadow-xl"
                    style={{
                      background: "#080808",
                      padding: "20px 36px",
                      boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)",
                    }}
                  >
                    <img
                      src="/zara-browser-logo.png"
                      alt="Zara Browser"
                      className="h-14 w-auto object-contain"
                      draggable={false}
                    />
                  </motion.div>

                  {/* Tagline */}
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                    className="text-sm text-black/35 mb-8 text-center font-light tracking-wide"
                  >
                    Search, navigate, explore — just ask.
                  </motion.p>

                  {/* Suggestion chips */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.18 }}
                    className="flex flex-wrap justify-center gap-2 max-w-xs"
                  >
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="px-3 py-1.5 rounded-full text-xs text-black/45 hover:text-black/70 transition-all duration-150 hover:shadow-sm"
                        style={{
                          background: "rgba(255,255,255,0.72)",
                          border: "1px solid rgba(0,0,0,0.08)",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CHAT MESSAGES */}
            <AnimatePresence>
              {hasStarted && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 overflow-y-auto px-4 py-3 space-y-3"
                >
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "user" ? (
                          <div
                            className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm text-sm text-black/75"
                            style={{
                              background: "rgba(0,0,0,0.07)",
                              border: "1px solid rgba(0,0,0,0.08)",
                            }}
                          >
                            {msg.text}
                          </div>
                        ) : (
                          <div className="max-w-full w-full space-y-2">
                            {msg.loading ? (
                              <div className="flex items-center gap-2 text-xs text-black/35 font-mono">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Searching the web...
                              </div>
                            ) : msg.error ? (
                              <div
                                className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs text-black/60"
                                style={{ background: "rgba(220,50,50,0.06)", border: "1px solid rgba(220,50,50,0.12)" }}
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                                <span>{msg.text}</span>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs text-black/55 leading-relaxed whitespace-pre-line">
                                  {msg.text}
                                </p>
                                {msg.results && msg.results.length > 0 && (
                                  <div className="space-y-1.5 mt-2">
                                    {msg.results.map((r) => (
                                      <button
                                        key={r.index}
                                        onClick={() => navigateTo(r.url, true)}
                                        className="w-full text-left group"
                                      >
                                        <div
                                          className="px-3 py-2.5 rounded-xl transition-all duration-150 group-hover:shadow-sm"
                                          style={{
                                            background: "rgba(255,255,255,0.65)",
                                            border: "1px solid rgba(0,0,0,0.07)",
                                            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                                          }}
                                        >
                                          <div className="flex items-start gap-2">
                                            <span
                                              className="text-[9px] font-mono font-bold mt-0.5 flex-shrink-0 w-4 text-center"
                                              style={{ color: "rgba(0,0,0,0.28)" }}
                                            >
                                              {r.index}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-[11px] font-semibold text-black/70 leading-tight truncate group-hover:text-black/85 transition-colors">
                                                {r.title}
                                              </div>
                                              <div className="text-[10px] text-black/38 mt-0.5 leading-snug line-clamp-2">
                                                {r.description}
                                              </div>
                                              <div className="flex items-center gap-1 mt-1">
                                                <Globe className="w-2.5 h-2.5 text-black/22 flex-shrink-0" />
                                                <span className="text-[9px] font-mono text-black/25 truncate">
                                                  {domainOf(r.url)}
                                                </span>
                                              </div>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-black/20 flex-shrink-0 mt-0.5 group-hover:text-black/40 transition-colors" />
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                    <p className="text-[9px] text-black/18 font-mono px-1">Search by Brave</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input bar */}
          <div
            className="flex-shrink-0 p-3"
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.70)",
                border: "1px solid rgba(0,0,0,0.09)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <Search className="w-3.5 h-3.5 text-black/22 flex-shrink-0" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleSend();
                  if (e.key === "Escape") setInput("");
                }}
                placeholder={hasStarted ? "Ask Zara or enter a URL..." : "Search the web or enter a URL..."}
                className="flex-1 bg-transparent text-xs text-black/70 outline-none placeholder:text-black/22"
                autoFocus
              />
              {input && (
                <button onClick={() => setInput("")} className="text-black/20 hover:text-black/45 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => setVoiceActive((v) => !v)}
                className={`flex-shrink-0 transition-colors ${voiceActive ? "text-black/60" : "text-black/22 hover:text-black/45"}`}
              >
                {voiceActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>
              {input.trim() && (
                <button
                  onClick={() => handleSend()}
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-black/50 hover:text-black/75 transition-colors"
                  style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)" }}
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Website viewer panel ── */}
        <AnimatePresence>
          {showViewer && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden min-w-0"
            >
              {/* Viewer toolbar */}
              <div
                className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
              >
                <button
                  onClick={goBack}
                  disabled={navIndex <= 0}
                  className="p-1.5 rounded-lg text-black/30 hover:text-black/60 hover:bg-black/5 transition-all disabled:opacity-20 disabled:cursor-default"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={goForward}
                  disabled={navIndex >= navHistory.length - 1}
                  className="p-1.5 rounded-lg text-black/30 hover:text-black/60 hover:bg-black/5 transition-all disabled:opacity-20 disabled:cursor-default"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={reload}
                  className="p-1.5 rounded-lg text-black/30 hover:text-black/60 hover:bg-black/5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div
                  className="flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <Globe className="w-3 h-3 text-black/22 flex-shrink-0" />
                  <input
                    value={urlBarInput}
                    onChange={(e) => setUrlBarInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigateTo(urlBarInput);
                    }}
                    placeholder="Enter a URL..."
                    className="flex-1 bg-transparent text-xs text-black/60 placeholder:text-black/22 outline-none font-mono"
                  />
                  {iframeLoading && (
                    <Loader2 className="w-3 h-3 text-black/25 animate-spin flex-shrink-0" />
                  )}
                </div>

                <button
                  onClick={() => window.open(activeUrl, "_blank")}
                  title="Open in system browser"
                  className="p-1.5 rounded-lg text-black/25 hover:text-black/55 hover:bg-black/5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => { setActiveUrl(""); setUrlBarInput(""); }}
                  className="p-1.5 rounded-lg text-black/25 hover:text-black/55 hover:bg-black/5 transition-all"
                  title="Close viewer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* iframe */}
              <div className="flex-1 relative overflow-hidden bg-white">
                {iframeError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <AlertCircle className="w-8 h-8 text-black/20" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-black/45">This site can't be embedded</p>
                      <p className="text-xs text-black/28 mt-1 max-w-xs">
                        {domainOf(activeUrl)} blocks iframe embedding. Open it in your system browser instead.
                      </p>
                    </div>
                    <button
                      onClick={() => window.open(activeUrl, "_blank")}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-black/55 hover:text-black/75 transition-colors"
                      style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.08)" }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in system browser
                    </button>
                  </div>
                ) : (
                  <>
                    {iframeLoading && (
                      <div
                        className="absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden"
                        style={{ background: "rgba(0,0,0,0.06)" }}
                      >
                        <motion.div
                          className="h-full"
                          style={{ background: "rgba(0,0,0,0.35)" }}
                          initial={{ width: "0%", x: "0%" }}
                          animate={{ width: "60%", x: "70%" }}
                          transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                        />
                      </div>
                    )}
                    <iframe
                      ref={iframeRef}
                      key={activeUrl}
                      src={activeUrl}
                      className="w-full h-full border-0"
                      onLoad={() => setIframeLoading(false)}
                      onError={() => { setIframeLoading(false); setIframeError(true); }}
                      title="Zara Browser"
                      allow="autoplay; fullscreen; camera; microphone; geolocation; payment; encrypted-media"
                    />
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
