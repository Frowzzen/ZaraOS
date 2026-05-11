// ============================================================
// ZaraOS — Tauri System Controls IPC Layer
//
// Wraps power management, volume, brightness, and WiFi commands.
// All functions are no-ops (with console warnings) in the browser.
//
// Usage:
//   await systemPower("shutdown");
//   await setVolume(70);
//   const networks = await listWifiNetworks();
// ============================================================

import { isTauriRuntime, tauriInvoke } from "./tauri-bridge";

// ── Power ─────────────────────────────────────────────────────

export type PowerAction = "shutdown" | "reboot" | "suspend" | "lock";

export async function systemPower(action: PowerAction): Promise<void> {
  if (!isTauriRuntime()) {
    console.warn(`[SystemControls] "${action}" requires the native desktop app.`);
    return;
  }
  await tauriInvoke<void>("system_power", { action });
}

// ── Volume ────────────────────────────────────────────────────

export async function getVolume(): Promise<number> {
  if (isTauriRuntime()) return tauriInvoke<number>("get_volume");
  return 70; // browser mock
}

export async function setVolume(percent: number): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke<void>("set_volume", { percent: Math.round(percent) });
  }
}

export async function toggleMute(): Promise<void> {
  if (isTauriRuntime()) await tauriInvoke<void>("toggle_mute");
}

// ── Brightness ────────────────────────────────────────────────

export async function getBrightness(): Promise<number> {
  if (isTauriRuntime()) return tauriInvoke<number>("get_brightness");
  return 80; // browser mock
}

export async function setBrightness(percent: number): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke<void>("set_brightness", { percent: Math.round(percent) });
  }
}

// ── WiFi ──────────────────────────────────────────────────────

export interface WifiNetwork {
  ssid: string;
  signal: number;    // 0-100
  connected: boolean;
  security: string;  // "WPA2", "WPA3", "--" for open
  bssid: string;
}

export async function listWifiNetworks(): Promise<WifiNetwork[]> {
  if (isTauriRuntime()) {
    return tauriInvoke<WifiNetwork[]>("list_wifi_networks");
  }
  // Browser mock — shows realistic placeholder data
  return [
    { ssid: "ZaraNet",        signal: 90, connected: true,  security: "WPA2", bssid: "AA:BB:CC:DD:EE:FF" },
    { ssid: "HomeNetwork_5G", signal: 72, connected: false, security: "WPA2", bssid: "11:22:33:44:55:66" },
    { ssid: "CoffeeShop",     signal: 45, connected: false, security: "--",   bssid: "AA:11:BB:22:CC:33" },
  ];
}

export async function connectWifi(ssid: string, password: string): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke<void>("connect_wifi", { ssid, password });
  }
}

export async function disconnectWifi(): Promise<void> {
  if (isTauriRuntime()) await tauriInvoke<void>("disconnect_wifi");
}

export async function getNetworkStatus(): Promise<string> {
  if (isTauriRuntime()) return tauriInvoke<string>("get_network_status");
  return "full"; // browser mock
}

/** Convert nmcli signal strength (0-100) to a label */
export function signalLabel(signal: number): string {
  if (signal >= 75) return "Excellent";
  if (signal >= 50) return "Good";
  if (signal >= 25) return "Fair";
  return "Weak";
}

/** Convert nmcli signal strength to bar count (1-4) */
export function signalBars(signal: number): number {
  if (signal >= 75) return 4;
  if (signal >= 50) return 3;
  if (signal >= 25) return 2;
  return 1;
}
