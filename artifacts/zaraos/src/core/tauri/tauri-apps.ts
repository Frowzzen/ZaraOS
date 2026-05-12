// ============================================================
// ZaraOS — Tauri App Launcher + Window Manager IPC Layer
//
// Wraps Rust commands for:
//   - Installed app discovery (list_installed_apps)
//   - App launching (launch_app)
//   - Window management (list_open_windows, focus_window,
//     close_window, minimize_window, focus_window_by_index)
//
// All functions gracefully fall back in the browser —
// window management is a native-only capability.
// ============================================================

import { isTauriRuntime, tauriInvoke } from "./tauri-bridge";

// ── Installed App ─────────────────────────────────────────────

export interface InstalledApp {
  name: string;
  exec: string;
  icon: string;
  comment: string;
  categories: string[];
  generic_name: string;
}

// Shown in browser — ZaraOS internal modules only
const BROWSER_APPS: InstalledApp[] = [
  { name: "Files",         exec: "", icon: "folder",      comment: "Browse files",         categories: ["Utility"],     generic_name: "File Manager"  },
  { name: "Media Player",  exec: "", icon: "multimedia",  comment: "Play audio and video", categories: ["AudioVideo"],  generic_name: "Media Player"  },
  { name: "Settings",      exec: "", icon: "preferences", comment: "System configuration", categories: ["Settings"],    generic_name: "Settings"      },
  { name: "Privacy",       exec: "", icon: "security",    comment: "Privacy controls",     categories: ["Security"],    generic_name: "Privacy Panel" },
  { name: "AI Providers",  exec: "", icon: "system",      comment: "Configure AI",         categories: ["Utility"],     generic_name: "AI Config"     },
  { name: "Developer Hub", exec: "", icon: "code",        comment: "Plugin development",   categories: ["Development"], generic_name: "Dev Portal"    },
];

/** List all installed applications. Browser mode returns ZaraOS built-ins only. */
export async function listInstalledApps(): Promise<InstalledApp[]> {
  if (isTauriRuntime()) {
    return tauriInvoke<InstalledApp[]>("list_installed_apps");
  }
  return BROWSER_APPS;
}

/** Launch an installed application by its Exec string. No-op in the browser. */
export async function launchApp(exec: string): Promise<void> {
  if (!exec) return;
  if (isTauriRuntime()) {
    await tauriInvoke<void>("launch_app", { exec });
  }
}

/** Map common category names to a display label. */
export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    AudioVideo: "Media", Audio: "Audio", Video: "Video",
    Development: "Development", Education: "Education", Game: "Games",
    Graphics: "Graphics", Network: "Internet", Office: "Office",
    Science: "Science", Settings: "Settings", System: "System",
    Utility: "Utilities",
  };
  return map[category] ?? category;
}

// ── Open Window ───────────────────────────────────────────────

export interface OpenWindow {
  id: string;     // hex window ID e.g. "0x05600001"
  title: string;
  desktop: number;
}

/** List all open windows (Tauri only). Returns [] in the browser. */
export async function listOpenWindows(): Promise<OpenWindow[]> {
  if (isTauriRuntime()) {
    return tauriInvoke<OpenWindow[]>("list_open_windows");
  }
  return [];
}

/**
 * Focus (raise) a window by title substring match.
 * No-op in the browser. Requires wmctrl on the system.
 */
export async function focusWindow(name: string): Promise<void> {
  if (!name || !isTauriRuntime()) return;
  await tauriInvoke<void>("focus_window", { name });
}

/**
 * Close a window gracefully by title substring match.
 * No-op in the browser. Requires wmctrl on the system.
 */
export async function closeWindow(name: string): Promise<void> {
  if (!name || !isTauriRuntime()) return;
  await tauriInvoke<void>("close_window", { name });
}

/**
 * Minimize a window by title substring match.
 * No-op in the browser. Requires xdotool on the system.
 */
export async function minimizeWindow(name: string): Promise<void> {
  if (!name || !isTauriRuntime()) return;
  await tauriInvoke<void>("minimize_window", { name });
}

/**
 * Focus the window at index `idx` in the open windows list (for cycling).
 * Returns the focused window's title, or null if none found.
 */
export async function focusWindowByIndex(idx: number): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  try {
    return await tauriInvoke<string>("focus_window_by_index", { idx });
  } catch {
    return null;
  }
}

// ── Fuzzy App Matching (used by runtime) ──────────────────────

/**
 * Fuzzy-match a query string against the installed apps list.
 * Tries exact match → prefix match → query-contains-name → name-contains-query → exec match.
 */
export function fuzzyMatchApp(query: string, apps: InstalledApp[]): InstalledApp | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // 1. Exact name
  let m = apps.find((a) => a.name.toLowerCase() === q);
  if (m) return m;

  // 2. Name starts with query
  m = apps.find((a) => a.name.toLowerCase().startsWith(q));
  if (m) return m;

  // 3. Query contains the full app name (e.g. "google chrome" contains "chrome"? no — reverse)
  //    App name contains the query token
  m = apps.find((a) => a.name.toLowerCase().includes(q));
  if (m) return m;

  // 4. Query contains the app name
  m = apps.find((a) => q.includes(a.name.toLowerCase()) && a.name.length > 3);
  if (m) return m;

  // 5. Exec string contains the query (e.g. "chromium" matches "chromium-browser")
  m = apps.find((a) => a.exec.toLowerCase().split(/\s+/)[0].includes(q));
  if (m) return m;

  // 6. Word-level partial: any word in query appears in app name
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  for (const word of words) {
    m = apps.find((a) => a.name.toLowerCase().includes(word));
    if (m) return m;
  }

  return null;
}

/** Known home directory folder aliases → absolute path fragments. */
export const KNOWN_DIRS: Record<string, string> = {
  home:      "~",
  desktop:   "~/Desktop",
  downloads: "~/Downloads",
  documents: "~/Documents",
  pictures:  "~/Pictures",
  photos:    "~/Pictures",
  music:     "~/Music",
  videos:    "~/Videos",
  movies:    "~/Videos",
  trash:     "~/.local/share/Trash/files",
};
