// ============================================================
// ZaraOS — Installer IPC Bridge
//
// Provides disk detection and installation coordination for the
// ZaraOS installer panel (/install).
//
// In Tauri mode: calls real lsblk-based disk detection and
// delegates installation to the bundled install script.
//
// In browser mode: returns mock disk data so the UI renders
// and can be developed/tested without native hardware.
// ============================================================

import { isTauriRuntime, tauriInvoke } from "./tauri-bridge";

// ── Types ─────────────────────────────────────────────────────

export interface DiskInfo {
  name: string;          // "nvme0n1", "sda"
  path: string;          // "/dev/nvme0n1"
  size: string;          // "512 GB"
  size_bytes: number;
  model: string;         // "Samsung SSD 980"
  transport: string;     // "nvme" | "sata" | "usb" | ""
  removable: boolean;
  is_boot: boolean;      // true = this disk has the current OS
}

export type InstallMode = "wipe" | "dualboot";

export interface InstallConfig {
  target_disk: string;       // e.g. "/dev/nvme0n1"
  mode: InstallMode;
  dualboot_split_gb?: number; // GB to give ZaraOS (dualboot mode only)
  username: string;
  hostname: string;
}

export interface InstallProgress {
  phase: string;
  percent: number;
  detail: string;
}

// ── Mock data (browser fallback) ──────────────────────────────

const MOCK_DISKS: DiskInfo[] = [
  {
    name: "nvme0n1",
    path: "/dev/nvme0n1",
    size: "512 GB",
    size_bytes: 512_000_000_000,
    model: "Micron 2400 NVMe 512GB",
    transport: "nvme",
    removable: false,
    is_boot: true,
  },
  {
    name: "sdb",
    path: "/dev/sdb",
    size: "256 GB",
    size_bytes: 256_000_000_000,
    model: "Memorex USB 3.1",
    transport: "usb",
    removable: true,
    is_boot: false,
  },
];

// ── API ───────────────────────────────────────────────────────

/**
 * Returns a list of physical disks available as install targets.
 * NVMe disks appear first, then SATA, then USB.
 */
export async function listDisks(): Promise<DiskInfo[]> {
  if (!isTauriRuntime()) return MOCK_DISKS;
  return tauriInvoke<DiskInfo[]>("list_disks");
}

/**
 * Begins the ZaraOS installation onto the selected disk.
 *
 * This calls the bundled install.sh script via the Tauri shell
 * plugin. Progress updates are delivered via Tauri events
 * (listen for "install-progress" events in the UI).
 *
 * DESTRUCTIVE — irreversible in "wipe" mode.
 */
export async function startInstall(config: InstallConfig): Promise<void> {
  if (!isTauriRuntime()) {
    // Simulate a slow install in browser for UI testing
    return new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return tauriInvoke<void>("start_install", { config });
}

/**
 * Returns a human-readable transport label for display.
 */
export function transportLabel(transport: string): string {
  switch (transport) {
    case "nvme": return "NVMe SSD";
    case "sata": return "SATA SSD/HDD";
    case "usb":  return "USB Drive";
    default:     return "Internal";
  }
}

/**
 * Returns true if a disk is a safe install target
 * (large enough, not the current live USB boot media).
 */
export function isSafeTarget(disk: DiskInfo): boolean {
  return disk.size_bytes >= 32_000_000_000; // at least 32 GB
}
