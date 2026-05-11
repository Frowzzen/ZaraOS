// ============================================================
// ZaraOS — Tauri IPC Bridge
//
// Provides runtime detection and a safe invoke() wrapper around
// the Tauri v2 IPC API.
//
// Usage:
//   if (isTauriRuntime()) {
//     const result = await tauriInvoke<string>("fs_read_text", { path: "/etc/hostname" });
//   } else {
//     // fall back to web storage / mock
//   }
//
// The browser build keeps this import harmless — isTauriRuntime()
// returns false and tauriInvoke() throws with a clear message.
// ============================================================

// ── Tauri v2 global type augmentation ───────────────────────
// Tauri v2 exposes __TAURI__ on window when the frontend loads inside
// a Tauri WebView. The shape below covers the subset we use.
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T>(
          cmd: string,
          args?: Record<string, unknown>
        ) => Promise<T>;
      };
    };
  }
}

/**
 * Returns true when the frontend is running inside the Tauri desktop shell.
 * Always false in a browser / Replit preview.
 */
export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" && window.__TAURI__ !== undefined
  );
}

/**
 * Invoke a Rust command through the Tauri IPC bridge.
 * Throws a descriptive error when called from a browser environment.
 */
export async function tauriInvoke<T = unknown>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error(
      `[Tauri IPC] "${command}" requires the native desktop app. ` +
        "Build and run with `cargo tauri dev` or `cargo tauri build`."
    );
  }
  return window.__TAURI__!.core.invoke<T>(command, args);
}
