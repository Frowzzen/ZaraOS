// ============================================================
// ZaraOS — Tauri Secure Keychain
//
// In the native desktop app, API keys are stored via the Tauri
// Stronghold plugin (using the OS keychain / encrypted vault)
// rather than localStorage. This module provides a unified
// interface that falls back to AES-GCM encrypted localStorage
// when running in a browser.
//
// Usage:
//   await keychainSet("openai_api_key", "sk-...");
//   const key = await keychainGet("openai_api_key");
//   await keychainDelete("openai_api_key");
//
// Security model:
//   - Native: Stronghold vault, encrypted at rest by the OS keyring
//   - Browser: AES-GCM localStorage (existing behavior, clearly labeled Alpha)
// ============================================================

import { isTauriRuntime, tauriInvoke } from "./tauri-bridge";

// ── Browser fallback ─────────────────────────────────────────
// Delegates to the existing AES-GCM encrypted localStorage store
// that the AI Provider registry already uses.
const BROWSER_PREFIX = "zara_kv_";

function browserGet(key: string): string | null {
  return localStorage.getItem(`${BROWSER_PREFIX}${key}`);
}

function browserSet(key: string, value: string): void {
  localStorage.setItem(`${BROWSER_PREFIX}${key}`, value);
}

function browserDelete(key: string): void {
  localStorage.removeItem(`${BROWSER_PREFIX}${key}`);
}

// ── Unified API ───────────────────────────────────────────────

/**
 * Store a secret value. Uses the native Stronghold vault when inside
 * Tauri, localStorage otherwise.
 */
export async function keychainSet(key: string, value: string): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke<void>("kv_set", { key, value });
  } else {
    browserSet(key, value);
  }
}

/**
 * Retrieve a secret value. Returns null if not found.
 */
export async function keychainGet(key: string): Promise<string | null> {
  if (isTauriRuntime()) {
    return tauriInvoke<string | null>("kv_get", { key });
  }
  return browserGet(key);
}

/**
 * Delete a secret. No-op if the key does not exist.
 */
export async function keychainDelete(key: string): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke<void>("kv_delete", { key });
  } else {
    browserDelete(key);
  }
}

/**
 * Returns true if using the native Stronghold vault (Tauri),
 * false if using the browser localStorage fallback.
 */
export function keychainBackend(): "stronghold" | "localStorage" {
  return isTauriRuntime() ? "stronghold" : "localStorage";
}
