// ============================================================
// ZaraOS App Launcher
//
// In the native Tauri app: discovers all installed Linux
// applications by scanning XDG .desktop files via the
// list_installed_apps Rust command, then launches them as
// detached background processes via launch_app.
//
// In the browser: shows ZaraOS built-in panels as navigable
// tiles (existing behavior). The "Installed Apps" section is
// hidden in browser mode since launching native processes is
// impossible from a web context.
// ============================================================

import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Globe, FolderOpen, FileText, PlaySquare, Settings,
  ShieldAlert, Cpu, Code, Zap, LayoutGrid, Search,
  Loader2, AlertTriangle, ExternalLink,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { isTauriRuntime } from "@/core/tauri/tauri-bridge";
import { listInstalledApps, launchApp, categoryLabel } from "@/core/tauri/tauri-apps";
import type { InstalledApp } from "@/core/tauri/tauri-apps";
import { Input } from "@/components/ui/input";

// ── ZaraOS built-in panel tiles (always shown) ───────────────
const BUILTIN_APPS = [
  { name: "Browser",     icon: Globe,       path: "/apps",         color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20"   },
  { name: "Files",       icon: FolderOpen,  path: "/files",        color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
  { name: "Documents",   icon: FileText,    path: "/apps",         color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20"  },
  { name: "Media",       icon: PlaySquare,  path: "/media",        color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { name: "Settings",    icon: Settings,    path: "/settings",     color: "text-gray-400",   bg: "bg-gray-500/10",   border: "border-gray-500/20"   },
  { name: "Privacy",     icon: ShieldAlert, path: "/privacy",      color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    },
  { name: "AI Config",   icon: Cpu,         path: "/ai-providers", color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/20"    },
  { name: "Dev Portal",  icon: Code,        path: "/developers",   color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/20"   },
  { name: "Skills Hub",  icon: Zap,         path: "/skills",       color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20"   },
];

// ── Installed app grid (Tauri only) ──────────────────────────

function AppTile({ app, onLaunch }: { app: InstalledApp; onLaunch: () => void }) {
  const [launching, setLaunching] = useState(false);

  async function handleClick() {
    if (launching) return;
    setLaunching(true);
    await launchApp(app.exec);
    setTimeout(() => setLaunching(false), 1500);
    onLaunch();
  }

  return (
    <button
      onClick={() => void handleClick()}
      className="group rounded-xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: "linear-gradient(145deg,#ffffff,#f0f2f8)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "4px 4px 12px rgba(166,180,200,0.28), -3px -3px 10px rgba(255,255,255,0.90)" }}
      title={app.comment || app.name}
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
        <LayoutGrid className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-sm text-slate-700 group-hover:text-indigo-600 transition-colors truncate max-w-[120px]">
          {app.name}
        </p>
        {app.generic_name && app.generic_name !== app.name && (
          <p className="text-[10px] text-muted-foreground/50 font-mono truncate max-w-[120px]">
            {app.generic_name}
          </p>
        )}
      </div>
      {launching && (
        <div className="flex items-center gap-1 text-[10px] font-mono text-primary/60">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Launching
        </div>
      )}
    </button>
  );
}

export default function Apps() {
  const isTauri = isTauriRuntime();
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastLaunched, setLastLaunched] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    setLoadingApps(true);
    listInstalledApps()
      .then(setInstalledApps)
      .catch(() => setAppsError("Could not load installed applications."))
      .finally(() => setLoadingApps(false));
  }, [isTauri]);

  // Group by category
  const grouped = useMemo(() => {
    const filtered = search.trim()
      ? installedApps.filter(
          (a) =>
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.comment.toLowerCase().includes(search.toLowerCase())
        )
      : installedApps;

    const map = new Map<string, InstalledApp[]>();
    for (const app of filtered) {
      const cat = app.categories[0] ?? "Other";
      const label = categoryLabel(cat);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(app);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [installedApps, search]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex flex-col gap-10 h-full overflow-y-auto">

        {/* ── ZaraOS Modules ── */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Applications</h1>
          <p className="text-muted-foreground font-mono text-sm mb-6">
            System modules and installed packages
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {BUILTIN_APPS.map((app, index) => (
              <Link key={app.name} href={app.path}>
                <Card
                  className={`cursor-pointer hover:${app.border} transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4`}
                  style={{ background: "linear-gradient(145deg,#ffffff,#f4f5fc)", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "4px 4px 14px rgba(166,180,200,0.28), -3px -3px 10px rgba(255,255,255,0.88)", animationDelay: `${index * 40}ms` }}
                  data-testid={`app-tile-${app.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center gap-4 text-center">
                    <div className={`w-14 h-14 rounded-2xl ${app.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <app.icon className={`w-7 h-7 ${app.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-800 group-hover:text-indigo-600 transition-colors">{app.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Open Panel</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Installed Applications (Tauri only) ── */}
        {isTauri && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Installed Applications</h2>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {loadingApps ? "Scanning..." : `${installedApps.length} apps found`}
                </p>
              </div>
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search apps..."
                  className="pl-8 h-8 text-sm bg-white border-slate-200 focus:border-primary/50"
                />
              </div>
            </div>

            {loadingApps && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}

            {appsError && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-mono">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {appsError}
              </div>
            )}

            {lastLaunched && (
              <div className="flex items-center gap-2 text-xs font-mono text-primary/60 px-1 mb-3 animate-in fade-in duration-200">
                <ExternalLink className="w-3 h-3" />
                Launched: {lastLaunched}
              </div>
            )}

            {!loadingApps && !appsError && grouped.length === 0 && search && (
              <p className="text-center text-sm text-muted-foreground font-mono py-8">
                No apps matching "{search}"
              </p>
            )}

            <div className="flex flex-col gap-8">
              {grouped.map(([category, apps]) => (
                <div key={category}>
                  <h3 className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest mb-3 px-1">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {apps.map((app) => (
                      <AppTile
                        key={`${app.name}-${app.exec}`}
                        app={app}
                        onLaunch={() => setLastLaunched(app.name)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
