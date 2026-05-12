import { useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { ArrowLeft, ArrowRight, RotateCcw, X, Globe } from "lucide-react";

export default function Browser() {
  const [inputUrl, setInputUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = (raw: string) => {
    let url = raw.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      if (url.includes(".") && !url.includes(" ")) {
        url = "https://" + url;
      } else {
        url = "https://www.google.com/search?q=" + encodeURIComponent(url);
      }
    }
    setActiveUrl(url);
    setInputUrl(url);
    setLoading(true);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(url);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setActiveUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setActiveUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
    }
  };

  const reload = () => {
    if (iframeRef.current && activeUrl) {
      iframeRef.current.src = activeUrl;
      setLoading(true);
    }
  };

  return (
    <Layout>
      <div className="h-full flex flex-col bg-background">
        {/* Address bar */}
        <div
          className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={goBack}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all disabled:opacity-20 disabled:cursor-default"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goForward}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all disabled:opacity-20 disabled:cursor-default"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={reload}
            disabled={!activeUrl}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all disabled:opacity-20 disabled:cursor-default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <Globe className="w-3 h-3 text-white/25 flex-shrink-0" />
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && navigate(inputUrl)}
              placeholder="Enter a URL or search the web..."
              className="flex-1 bg-transparent text-sm text-white/75 placeholder:text-white/22 outline-none font-mono"
            />
            {inputUrl && (
              <button onClick={() => setInputUrl("")} className="text-white/25 hover:text-white/60 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => navigate(inputUrl)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all border border-white/10"
          >
            Go
          </button>
        </div>

        {/* Iframe area */}
        <div className="flex-1 relative overflow-hidden">
          {!activeUrl ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Globe className="w-10 h-10 text-white/10" />
              <div className="text-center">
                <p className="text-sm font-medium text-white/30">No page loaded</p>
                <p className="text-xs text-white/18 font-mono mt-1">Type a URL or search term above</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {["google.com", "wikipedia.org", "news.ycombinator.com"].map((site) => (
                  <button
                    key={site}
                    onClick={() => navigate(site)}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/35 hover:text-white/60 transition-colors font-mono"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    {site}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden">
                  <div
                    className="h-full animate-pulse"
                    style={{ background: "rgba(255,255,255,0.4)", width: "60%" }}
                  />
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={activeUrl}
                className="w-full h-full border-0"
                onLoad={() => setLoading(false)}
                title="Browser"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
