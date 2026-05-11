// ============================================================
// ZaraOS — Tauri System Stats IPC Layer
//
// Wraps the Rust `get_system_stats` and `get_top_processes`
// commands. Falls back to realistic mock values in the browser
// so the Dashboard renders correctly in both environments.
//
// Usage:
//   const stats = await getSystemStats();
//   // Refresh every 2 s in a useEffect interval
// ============================================================

import { isTauriRuntime, tauriInvoke } from "./tauri-bridge";

export interface SystemStats {
  cpu_usage_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_used_percent: number;
  swap_used_gb: number;
  swap_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_free_gb: number;
  network_rx_kbps: number;
  network_tx_kbps: number;
  uptime_seconds: number;
  cpu_brand: string;
  cpu_cores: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  ram_mb: number;
}

// ── Browser mock values ───────────────────────────────────────
// Used when running in Replit / any non-Tauri browser context.
const MOCK_STATS: SystemStats = {
  cpu_usage_percent: 14,
  ram_used_gb: 3.2,
  ram_total_gb: 16,
  ram_used_percent: 20,
  swap_used_gb: 0,
  swap_total_gb: 0,
  disk_used_gb: 120,
  disk_total_gb: 512,
  disk_free_gb: 392,
  network_rx_kbps: 1200,
  network_tx_kbps: 320,
  uptime_seconds: 3600,
  cpu_brand: "Simulated CPU (browser mode)",
  cpu_cores: 8,
};

const MOCK_PROCESSES: ProcessInfo[] = [
  { pid: 1,   name: "zaraos",  cpu_percent: 8.2,  ram_mb: 320  },
  { pid: 2,   name: "ollama",  cpu_percent: 5.1,  ram_mb: 1240 },
  { pid: 3,   name: "Xorg",    cpu_percent: 2.3,  ram_mb: 180  },
  { pid: 4,   name: "openbox", cpu_percent: 0.1,  ram_mb: 32   },
  { pid: 5,   name: "pipewire",cpu_percent: 0.4,  ram_mb: 48   },
];

// ── Public API ────────────────────────────────────────────────

/** Fetch current hardware stats. Safe to call in any environment. */
export async function getSystemStats(): Promise<SystemStats> {
  if (isTauriRuntime()) {
    return tauriInvoke<SystemStats>("get_system_stats");
  }
  return MOCK_STATS;
}

/** Fetch the top 12 processes by CPU usage. */
export async function getTopProcesses(): Promise<ProcessInfo[]> {
  if (isTauriRuntime()) {
    return tauriInvoke<ProcessInfo[]>("get_top_processes");
  }
  return MOCK_PROCESSES;
}

/** Format uptime seconds into a human-readable string. */
export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
