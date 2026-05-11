// ============================================================
// ZaraOS Permissions System
// Manages the permission state for all system capabilities.
//
// Rules enforced here:
// - Mic and camera require explicit user grant.
// - Cloud AI is disabled by default.
// - Local AI is enabled by default.
// - System actions require explicit permission.
// - Destructive actions require confirmation (flagged, not blocked here).
// - Plugins must declare their permissions in their manifest.
// - API keys must never be logged or exposed anywhere.
//
// Future: This module will interface with Tauri's permission API
// and a Linux polkit-style prompt for system-level capabilities.
// ============================================================

import type { PermissionCategory, PermissionRecord } from "./types";

const STORAGE_KEY = "zaraos_permissions_v1";

// ── Default permission grants ─────────────────────────────
// Only local_ai is on by default. Everything else must be
// explicitly enabled by the user.
const DEFAULT_PERMISSIONS: Record<PermissionCategory, boolean> = {
  microphone: false,
  camera: false,
  local_ai: true,
  cloud_ai: false,
  network: false,
  files: false,
  system_actions: false,
  plugins: false,
  developer_mode: false,
};

// ── Load from localStorage ────────────────────────────────
function loadPermissions(): Record<PermissionCategory, PermissionRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Corrupted storage — reset to defaults silently.
  }
  return buildDefaults();
}

function buildDefaults(): Record<PermissionCategory, PermissionRecord> {
  const result = {} as Record<PermissionCategory, PermissionRecord>;
  for (const [cat, granted] of Object.entries(DEFAULT_PERMISSIONS)) {
    result[cat as PermissionCategory] = {
      category: cat as PermissionCategory,
      granted,
      grantedAt: granted ? Date.now() : undefined,
    };
  }
  return result;
}

function savePermissions(perms: Record<PermissionCategory, PermissionRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
  } catch {
    // localStorage full — not a fatal error.
  }
}

// ── Permissions Manager ───────────────────────────────────
class PermissionsManager {
  private perms: Record<PermissionCategory, PermissionRecord>;

  constructor() {
    this.perms = loadPermissions();
  }

  public isGranted(category: PermissionCategory): boolean {
    return this.perms[category]?.granted ?? false;
  }

  public grant(category: PermissionCategory): void {
    this.perms[category] = {
      category,
      granted: true,
      grantedAt: Date.now(),
    };
    savePermissions(this.perms);
  }

  public revoke(category: PermissionCategory): void {
    this.perms[category] = {
      ...this.perms[category],
      granted: false,
      revokedAt: Date.now(),
    };
    savePermissions(this.perms);
  }

  public toggle(category: PermissionCategory): boolean {
    if (this.isGranted(category)) {
      this.revoke(category);
      return false;
    } else {
      this.grant(category);
      return true;
    }
  }

  public getAll(): Record<PermissionCategory, PermissionRecord> {
    return { ...this.perms };
  }

  public reset(): void {
    this.perms = buildDefaults();
    savePermissions(this.perms);
  }

  // Check that a plugin's declared permissions are all granted.
  public pluginPermissionsGranted(requiredPermissions: PermissionCategory[]): boolean {
    return requiredPermissions.every((cat) => this.isGranted(cat));
  }
}

// Singleton — one permissions manager for the whole runtime.
export const permissionsManager = new PermissionsManager();
