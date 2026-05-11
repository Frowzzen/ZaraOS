// ============================================================
// ZaraOS — Tauri App Launcher IPC Layer
//
// Wraps the Rust `list_installed_apps` and `launch_app` commands.
// Falls back to a static list of ZaraOS built-in modules in the browser.
//
// Usage:
//   const apps = await listInstalledApps();
//   await launchApp(app.exec);
// ============================================================

import { isTauriRuntime, tauriInvoke } from "./tauri-bridge";

export interface InstalledApp {
  name: string;
  exec: string;
  icon: string;       // Icon name from .desktop file (e.g. "firefox", "nautilus")
  comment: string;
  categories: string[];
  generic_name: string;
}

// Shown in browser — ZaraOS internal modules only
const BROWSER_APPS: InstalledApp[] = [
  { name: "Files",         exec: "", icon: "folder",         comment: "Browse files",          categories: ["Utility"],     generic_name: "File Manager"  },
  { name: "Media Player",  exec: "", icon: "multimedia",     comment: "Play audio and video",  categories: ["AudioVideo"],  generic_name: "Media Player"  },
  { name: "Settings",      exec: "", icon: "preferences",    comment: "System configuration",  categories: ["Settings"],    generic_name: "Settings"      },
  { name: "Privacy",       exec: "", icon: "security",       comment: "Privacy controls",      categories: ["Security"],    generic_name: "Privacy Panel" },
  { name: "AI Providers",  exec: "", icon: "system",         comment: "Configure AI",          categories: ["Utility"],     generic_name: "AI Config"     },
  { name: "Developer Hub", exec: "", icon: "code",           comment: "Plugin development",    categories: ["Development"], generic_name: "Dev Portal"    },
];

/**
 * List all installed applications on the system.
 * In the browser, returns the ZaraOS built-in module list.
 */
export async function listInstalledApps(): Promise<InstalledApp[]> {
  if (isTauriRuntime()) {
    return tauriInvoke<InstalledApp[]>("list_installed_apps");
  }
  return BROWSER_APPS;
}

/**
 * Launch an installed application by its Exec string.
 * No-op in the browser (apps can only be launched natively).
 */
export async function launchApp(exec: string): Promise<void> {
  if (!exec) return;
  if (isTauriRuntime()) {
    await tauriInvoke<void>("launch_app", { exec });
  }
}

/** Map common category names to a display label. */
export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    AudioVideo: "Media",
    Audio: "Audio",
    Video: "Video",
    Development: "Development",
    Education: "Education",
    Game: "Games",
    Graphics: "Graphics",
    Network: "Internet",
    Office: "Office",
    Science: "Science",
    Settings: "Settings",
    System: "System",
    Utility: "Utilities",
  };
  return map[category] ?? category;
}
