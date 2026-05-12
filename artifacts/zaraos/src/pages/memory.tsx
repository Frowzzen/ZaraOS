// ============================================================
// ZaraOS Memory Panel — Alpha 0.5
//
// Gives users full visibility and control over Zara's local
// conversation memory. All data is local-only — no cloud sync,
// no telemetry, no hidden uploads.
//
// Security rules:
//   - Destructive actions require confirmation dialog
//   - Export is user-initiated only
//   - Import warns about overwrite risk
//   - Memory is clearly labeled as local-only
// ============================================================

import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRuntime } from "@/core/runtime-hook";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Brain,
  Trash2,
  Shield,
  Download,
  Upload,
  AlertTriangle,
  Pin,
  Clock,
  Cpu,
  Database,
  MessageSquare,
  Zap,
  FileText,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type PurgeTarget = "session" | "history" | "all" | null;

function StatCard({
  icon: Icon,
  label,
  value,
  color = "text-primary",
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl" style={{ background: "linear-gradient(145deg,#ffffff,#f0f2f8)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "3px 3px 10px rgba(166,180,200,0.25), -2px -2px 8px rgba(255,255,255,0.88)" }}>
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-[10px] font-mono text-muted-foreground/40">{sub}</span>}
    </div>
  );
}

function ConfirmDialog({
  target,
  onConfirm,
  onCancel,
}: {
  target: PurgeTarget;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titles: Record<NonNullable<PurgeTarget>, string> = {
    session: "Clear Current Session?",
    history: "Clear All History?",
    all: "Purge All Memory?",
  };
  const descriptions: Record<NonNullable<PurgeTarget>, string> = {
    session: "The current conversation will be erased and a new session will start. Pinned entries are preserved.",
    history: "All conversation history will be deleted. Pinned memory entries are preserved. This cannot be undone.",
    all: "Everything will be deleted — all conversations, all memory entries including pinned ones, all skill usage records, and all preferences. This cannot be undone.",
  };
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/40 backdrop-blur-sm">
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-red-900/20">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-slate-800 font-bold text-base mb-1">{titles[target]}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{descriptions[target]}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/8 border border-red-500/15 mb-4">
          <Shield className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300/70 font-mono">
            All memory is stored locally. Deleting here deletes permanently — no backup exists.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 border border-slate-200 hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
            onClick={onConfirm}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Confirm Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Memory() {
  const {
    getAIMemoryStats,
    clearAIConversation,
    clearAIHistory,
    purgeAllAIMemory,
    getAIMemoryPinnedEntries,
    getAIMemoryRecentEntries,
    getAIMemorySkillUsage,
    isAIMemoryEnabled,
    setAIMemoryEnabled,
    exportAIMemory,
    importAIMemory,
    getAICurrentSessionId,
    estimateAIStorageBytes,
  } = useRuntime();

  const [stats, setStats] = useState(() => { try { return getAIMemoryStats(); } catch { return null; } });
  const [memoryEnabled, setMemoryEnabled] = useState(() => { try { return isAIMemoryEnabled(); } catch { return true; } });
  const [storageBytes, setStorageBytes] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [pinnedEntries, setPinnedEntries] = useState<Array<{ id: string; content: string; timestamp: number }>>([]);
  const [recentEntries, setRecentEntries] = useState<Array<{ id: string; content: string; category: string; timestamp: number }>>([]);
  const [skillUsage, setSkillUsage] = useState<Array<{ skillId: string; useCount: number; lastUsedAt: number; lastResult: string }>>([]);
  const [confirmTarget, setConfirmTarget] = useState<PurgeTarget>(null);
  const [showPinned, setShowPinned] = useState(true);
  const [showRecent, setShowRecent] = useState(true);
  const [showSkills, setShowSkills] = useState(true);
  const [exportMessage, setExportMessage] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    try {
      setStats(getAIMemoryStats());
      setStorageBytes(estimateAIStorageBytes());
      setSessionId(getAICurrentSessionId() ?? "—");
      setPinnedEntries(getAIMemoryPinnedEntries() ?? []);
      setRecentEntries(getAIMemoryRecentEntries(8) ?? []);
      setSkillUsage(getAIMemorySkillUsage(5) ?? []);
      setMemoryEnabled(isAIMemoryEnabled());
    } catch { /* ignore */ }
  }, [getAIMemoryStats, estimateAIStorageBytes, getAICurrentSessionId, getAIMemoryPinnedEntries, getAIMemoryRecentEntries, getAIMemorySkillUsage, isAIMemoryEnabled]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleConfirm = () => {
    if (confirmTarget === "session") {
      clearAIConversation();
    } else if (confirmTarget === "history") {
      clearAIHistory();
    } else if (confirmTarget === "all") {
      purgeAllAIMemory();
    }
    setConfirmTarget(null);
    refresh();
  };

  const handleToggleMemory = (enabled: boolean) => {
    setAIMemoryEnabled(enabled);
    setMemoryEnabled(enabled);
  };

  const handleExport = () => {
    try {
      const json = exportAIMemory();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zaraos-memory-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage("Export complete. File saved to your downloads.");
      setTimeout(() => setExportMessage(""), 4000);
    } catch {
      setExportMessage("Export failed.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      try {
        importAIMemory(json);
        refresh();
        setExportMessage("Import complete. Memory restored from file.");
        setTimeout(() => setExportMessage(""), 4000);
      } catch {
        setExportMessage("Import failed — invalid memory file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const formatAge = (ms: number) => {
    if (ms < 60_000) return "just now";
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
    return `${Math.floor(ms / 86_400_000)}d ago`;
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1_048_576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1_048_576).toFixed(1)} MB`;
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* ── Header ── */}
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-primary" />
            Memory
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            Zara's local memory. Fully private. No cloud sync.
          </p>
        </div>

        {/* ── Privacy Notice ── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/15">
          <Shield className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-300/70 font-mono leading-relaxed">
            All memory is stored locally in your browser. Nothing is uploaded to any server, logged by ZaraOS, or shared with any AI provider. Memory is used only to give Zara context across conversation turns.
          </p>
        </div>

        {/* ── Memory Toggle ── */}
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-800 font-semibold">Conversation Memory</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {memoryEnabled
                    ? "Memory is active — Zara remembers this session"
                    : "Memory is disabled — Zara has no context across turns"}
                </p>
              </div>
              <Switch
                checked={memoryEnabled}
                onCheckedChange={handleToggleMemory}
                data-testid="switch-memory-enabled"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Session Stats ── */}
        <div>
          <h2 className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">Current Session</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={MessageSquare} label="Turns" value={stats?.conversationTurns ?? 0} color="text-primary" />
            <StatCard icon={Cpu} label="Est. Tokens" value={(stats?.estimatedTokens ?? 0).toLocaleString()} color="text-violet-400" />
            <StatCard icon={Pin} label="Pinned" value={stats?.pinnedEntries ?? 0} color="text-amber-400" />
            <StatCard icon={Database} label="Storage" value={formatBytes(storageBytes)} color="text-green-400" />
          </div>
        </div>

        {/* ── More Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={FileText} label="Total Entries" value={stats?.totalEntries ?? 0} color="text-primary" />
          <StatCard icon={Clock} label="Persistent" value={stats?.persistentEntries ?? 0} color="text-cyan-400" />
          <StatCard icon={Database} label="Session" value={stats?.sessionEntries ?? 0} color="text-muted-foreground" />
          <div className="flex flex-col gap-1 p-4 rounded-xl" style={{ background: "linear-gradient(145deg,#ffffff,#f0f2f8)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "3px 3px 10px rgba(166,180,200,0.25), -2px -2px 8px rgba(255,255,255,0.88)" }}>
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">Session ID</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground truncate">{sessionId.slice(0, 18)}...</span>
          </div>
        </div>

        {/* ── Pinned Memories ── */}
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowPinned(!showPinned)}>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-amber-400" />
                Pinned Memories
                <span className="text-[10px] font-mono bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {pinnedEntries.length}
                </span>
              </div>
              {showPinned ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          {showPinned && (
            <CardContent className="pt-0">
              {pinnedEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground/40 font-mono py-4 text-center">
                  No pinned memories. Pinned entries survive all clear operations.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {pinnedEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <Pin className="w-3.5 h-3.5 text-amber-400/60 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 leading-relaxed">{entry.content}</p>
                        <p className="text-[10px] text-muted-foreground/40 font-mono mt-1">
                          {formatAge(Date.now() - entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Recent Memory Entries ── */}
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowRecent(!showRecent)}>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Recent Memory Entries
              </div>
              {showRecent ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          {showRecent && (
            <CardContent className="pt-0">
              {recentEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground/40 font-mono py-4 text-center">
                  No memory entries yet. Entries accumulate as you use Zara.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-white/5">
                  {recentEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 py-3">
                      <span className="text-[9px] font-mono text-muted-foreground/40 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 uppercase">
                        {entry.category}
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed flex-1 min-w-0 line-clamp-2">{entry.content}</p>
                      <span className="text-[10px] font-mono text-muted-foreground/30 flex-shrink-0">
                        {formatAge(Date.now() - entry.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Skill Usage ── */}
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowSkills(!showSkills)}>
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                Recent Skill Usage
              </div>
              {showSkills ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          {showSkills && (
            <CardContent className="pt-0">
              {skillUsage.length === 0 ? (
                <p className="text-xs text-muted-foreground/40 font-mono py-4 text-center">
                  No skills used yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {skillUsage.map((record) => (
                    <div key={record.skillId} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <Zap className="w-3.5 h-3.5 text-violet-400/60 flex-shrink-0" />
                      <span className="text-xs font-mono text-slate-700 flex-1">{record.skillId}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/40">{record.useCount}x</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        record.lastResult === "success"
                          ? "text-green-400 bg-green-500/10 border-green-500/20"
                          : record.lastResult === "failed"
                          ? "text-red-400 bg-red-500/10 border-red-500/20"
                          : "text-muted-foreground bg-slate-50 border-slate-200"
                      }`}>
                        {record.lastResult}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* ── Export / Import ── */}
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Export / Import
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/70 font-mono leading-relaxed">
                Export creates a local JSON file of your memory. Import overwrites current memory. Never share memory exports — they contain your full conversation history.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                className="gap-2 border-slate-200 text-sm"
                onClick={handleExport}
                data-testid="button-export-memory"
              >
                <Download className="w-3.5 h-3.5" />
                Export Memory
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-slate-200 text-sm"
                onClick={() => importRef.current?.click()}
                data-testid="button-import-memory"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Memory
              </Button>
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>
            {exportMessage && (
              <div className="flex items-center gap-2 text-xs font-mono text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {exportMessage}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/40 font-mono">
              Alpha 0.5: Memory exports are unencrypted JSON. Future: encrypted export with user-provided passphrase.
            </p>
          </CardContent>
        </Card>

        {/* ── Destructive Controls ── */}
        <Card className="bg-card/40 border-red-500/10 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-400/80">
              <Trash2 className="w-4 h-4" />
              Clear &amp; Purge
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Memory deletions are immediate and permanent. There is no recovery. All data is local — there is no server backup.
            </p>
            <div className="flex flex-col gap-3">
              {/* Clear session */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm text-slate-800 font-medium">Clear Current Session</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Erase this conversation. Start a fresh session. Pinned entries preserved.</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10 gap-1.5 flex-shrink-0"
                  onClick={() => setConfirmTarget("session")}
                  data-testid="button-clear-session"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear
                </Button>
              </div>

              {/* Clear all history */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm text-slate-800 font-medium">Clear All History</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Delete all conversations and entries. Pinned memories survive.</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-400/70 hover:text-orange-300 hover:bg-orange-500/10 gap-1.5 flex-shrink-0"
                  onClick={() => setConfirmTarget("history")}
                  data-testid="button-clear-history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </Button>
              </div>

              {/* Purge all */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                <div>
                  <p className="text-sm text-red-300 font-medium">Purge All Memory</p>
                  <p className="text-xs text-red-400/50 font-mono mt-0.5">Nuclear option. Everything deleted — including pinned entries and preferences.</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400/70 hover:text-red-300 hover:bg-red-500/10 gap-1.5 border border-red-500/20 flex-shrink-0"
                  onClick={() => setConfirmTarget("all")}
                  data-testid="button-purge-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Purge All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Confirmation Dialog ── */}
      {confirmTarget && (
        <ConfirmDialog
          target={confirmTarget}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </Layout>
  );
}
