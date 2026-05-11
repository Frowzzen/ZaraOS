// ============================================================
// ZaraOS Files Panel
//
// In the native Tauri app: reads real directories and files via
// the Tauri IPC layer (fsListDir / fsReadText from tauri-fs.ts).
//
// In the browser: shows a placeholder UI that explains the
// feature requires the native app, with the mock folder structure
// visible for layout reference.
//
// Features:
//   - Breadcrumb navigation (clickable path segments)
//   - Back button (go up one directory level)
//   - File type icons by extension
//   - Single-click selects; double-click opens dir or reads file
//   - Inline text file preview panel (right side)
//   - Loading and error states
// ============================================================

import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { isTauriRuntime } from "@/core/tauri/tauri-bridge";
import { fsListDir, fsReadText } from "@/core/tauri/tauri-fs";
import type { DirEntry } from "@/core/tauri/tauri-fs";
import {
  Folder,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  HardDrive,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  X,
  AlertTriangle,
  Loader2,
  Lock,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

// ── File type helpers ─────────────────────────────────────────

const TEXT_EXTS  = new Set(["txt", "md", "log", "json", "yaml", "yml", "toml", "ini", "conf", "sh", "py", "js", "ts", "tsx", "jsx", "rs", "go", "c", "cpp", "h", "css", "html", "xml", "csv"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"]);
const VIDEO_EXTS = new Set(["mp4", "mkv", "webm", "avi", "mov", "m4v"]);
const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "flac", "aac", "m4a"]);
const CODE_EXTS  = new Set(["rs", "go", "py", "js", "ts", "tsx", "jsx", "c", "cpp", "h", "java", "kt", "swift"]);

function fileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function FileIcon({ name, isDir, className }: { name: string; isDir: boolean; className?: string }) {
  if (isDir) return <Folder className={className ?? "w-5 h-5 text-amber-400"} />;
  const ext = fileExt(name);
  if (IMAGE_EXTS.has(ext)) return <FileImage  className={className ?? "w-5 h-5 text-purple-400"} />;
  if (VIDEO_EXTS.has(ext)) return <FileVideo  className={className ?? "w-5 h-5 text-blue-400"}   />;
  if (AUDIO_EXTS.has(ext)) return <FileAudio  className={className ?? "w-5 h-5 text-pink-400"}   />;
  if (CODE_EXTS.has(ext))  return <FileCode   className={className ?? "w-5 h-5 text-green-400"}  />;
  if (TEXT_EXTS.has(ext))  return <FileText   className={className ?? "w-5 h-5 text-primary/70"} />;
  return <File className={className ?? "w-5 h-5 text-muted-foreground/50"} />;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

function formatDate(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────

const HOME_PATH = "/home/zaraos";

export default function Files() {
  const isTauri = isTauriRuntime();

  const [currentPath, setCurrentPath] = useState(HOME_PATH);
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name: string; content: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadDir = useCallback(async (path: string) => {
    if (!isTauri) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    setPreview(null);
    try {
      const result = await fsListDir(path);
      // Dirs first, then files, each group alpha-sorted
      result.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setEntries(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read directory");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [isTauri]);

  useEffect(() => {
    void loadDir(currentPath);
  }, [currentPath, loadDir]);

  function navigateTo(path: string) {
    setCurrentPath(path);
  }

  function goUp() {
    const parent = currentPath.split("/").slice(0, -1).join("/") || "/";
    navigateTo(parent);
  }

  async function handleEntryDoubleClick(entry: DirEntry) {
    if (entry.isDir) {
      navigateTo(entry.path);
      return;
    }
    const ext = fileExt(entry.name);
    if (TEXT_EXTS.has(ext)) {
      setPreviewLoading(true);
      setPreview(null);
      try {
        const content = await fsReadText(entry.path);
        setPreview({ name: entry.name, content });
      } catch {
        setPreview({ name: entry.name, content: "(Unable to read file)" });
      } finally {
        setPreviewLoading(false);
      }
    }
  }

  // ── Breadcrumbs ───────────────────────────────────────────
  const crumbs = currentPath
    .split("/")
    .filter(Boolean)
    .reduce<{ label: string; path: string }[]>((acc, segment) => {
      const path = acc.length ? `${acc[acc.length - 1].path}/${segment}` : `/${segment}`;
      return [...acc, { label: segment, path }];
    }, [{ label: "/", path: "/" }]);

  // ── Browser placeholder ───────────────────────────────────
  if (!isTauri) {
    return (
      <Layout>
        <div className="flex flex-col h-full max-w-6xl mx-auto gap-6">
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground">
              <HardDrive className="w-4 h-4 text-primary" />
              <span>/home/zaraos/</span>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Native App Required</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Real file system access requires the Tauri desktop app.
                Build ZaraOS natively with{" "}
                <span className="font-mono text-primary">cargo tauri build</span>{" "}
                to browse your actual files here.
              </p>
              <div className="text-xs font-mono text-muted-foreground/40 mt-2">
                Browser preview shows mock structure only
              </div>
            </div>
          </div>

          {/* Mock folder grid shown as reference */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 opacity-30 pointer-events-none">
            {["Documents", "Downloads", "Pictures", "Music", "Videos"].map((name) => (
              <div key={name} className="bg-card/30 border border-white/5 rounded-xl p-4 flex flex-col items-center gap-3">
                <Folder className="w-10 h-10 text-amber-400" />
                <span className="text-sm font-bold text-white">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // ── Tauri native file browser ─────────────────────────────
  return (
    <Layout>
      <div className="flex flex-col h-full max-w-7xl mx-auto gap-4">

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 bg-card/50 px-3 py-2.5 rounded-xl border border-white/5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-white"
            onClick={goUp}
            disabled={currentPath === "/"}
            title="Go up"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm font-mono text-muted-foreground flex-1 overflow-x-auto">
            <HardDrive className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            {crumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1 flex-shrink-0">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
                <button
                  onClick={() => navigateTo(crumb.path)}
                  className="hover:text-white transition-colors"
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-white flex-shrink-0"
            onClick={() => void loadDir(currentPath)}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* ── Main area ── */}
        <div className="flex-1 flex gap-4 min-h-0">

          {/* File list */}
          <div className="flex-1 bg-card/20 border border-white/5 rounded-xl overflow-hidden flex flex-col min-w-0">
            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}

            {error && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <p className="text-sm font-mono text-red-400/80">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void loadDir(currentPath)} className="border-white/10">
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && (
              <div className="flex-1 overflow-y-auto">
                {entries.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground font-mono">
                    Empty directory
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground bg-black/40 font-mono sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 font-normal text-left">Name</th>
                        <th className="px-4 py-2.5 font-normal text-right hidden md:table-cell">Size</th>
                        <th className="px-4 py-2.5 font-normal text-right hidden lg:table-cell">Modified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {entries.map((entry) => (
                        <tr
                          key={entry.path}
                          className={`cursor-pointer transition-colors ${
                            selected === entry.path
                              ? "bg-primary/10 text-white"
                              : "hover:bg-white/5 text-gray-300"
                          }`}
                          onClick={() => setSelected(entry.path)}
                          onDoubleClick={() => void handleEntryDoubleClick(entry)}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <FileIcon name={entry.name} isDir={entry.isDir} />
                              <span className={entry.isDir ? "font-medium text-white" : ""}>
                                {entry.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">
                            {entry.isDir ? "—" : formatBytes(entry.sizeBytes)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
                            {formatDate(entry.modifiedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* File preview panel */}
          {(preview || previewLoading) && (
            <div className="w-96 bg-card/30 border border-white/5 rounded-xl flex flex-col overflow-hidden flex-shrink-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/30">
                <span className="text-xs font-mono text-muted-foreground truncate">
                  {preview?.name ?? "Loading..."}
                </span>
                <button
                  onClick={() => setPreview(null)}
                  className="text-muted-foreground/40 hover:text-white transition-colors ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {previewLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ) : (
                  <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                    {preview?.content}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground/40 px-1">
          <span>{entries.length} items</span>
          {selected && <span className="truncate max-w-md">{selected}</span>}
        </div>
      </div>
    </Layout>
  );
}
