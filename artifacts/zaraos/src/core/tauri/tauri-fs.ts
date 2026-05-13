// ============================================================
// ZaraOS — Tauri File System Layer
//
// Wraps the Rust `fs_read_text`, `fs_write_text`, and `fs_list_dir`
// commands exposed via tauri-bridge.ts.
//
// All paths must be absolute. Relative paths are rejected to prevent
// path traversal issues. The Tauri allowlist in tauri.conf.json
// limits FS access to the user's home directory by default.
//
// In browser / Replit mode, all functions throw TauriNotAvailableError.
// Callers should guard with isTauriRuntime() before calling.
// ============================================================

import { tauriInvoke } from "./tauri-bridge";

export class TauriNotAvailableError extends Error {
  constructor(operation: string) {
    super(
      `[TauriFS] "${operation}" is only available in the native desktop app.`
    );
    this.name = "TauriNotAvailableError";
  }
}

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  sizeBytes: number;
  modifiedAt: number; // Unix timestamp ms
}

/**
 * Read a UTF-8 text file. Throws if the file does not exist or is not
 * readable within the current Tauri FS scope.
 */
export async function fsReadText(path: string): Promise<string> {
  return tauriInvoke<string>("fs_read_text", { path });
}

/**
 * Write UTF-8 text to a file, creating it if it does not exist.
 * Parent directories must already exist.
 */
export async function fsWriteText(path: string, content: string): Promise<void> {
  await tauriInvoke<void>("fs_write_text", { path, content });
}

/**
 * List directory entries at `path`. Returns an empty array for an empty dir.
 */
export async function fsListDir(path: string): Promise<DirEntry[]> {
  return tauriInvoke<DirEntry[]>("fs_list_dir", { path });
}

/**
 * Check if a path exists within the Tauri FS scope.
 */
export async function fsExists(path: string): Promise<boolean> {
  try {
    await tauriInvoke<void>("fs_exists", { path });
    return true;
  } catch {
    return false;
  }
}

export interface ShellResult {
  stdout:   string;
  stderr:   string;
  exitCode: number;
}

/**
 * Execute a program with arguments and return stdout, stderr, and exit code.
 * Matches the Rust shell_exec command signature (program + args array, no shell).
 * Only available in the native Tauri app — throws in the browser.
 */
export async function shellExec(
  program: string,
  args: string[] = [],
): Promise<ShellResult> {
  return tauriInvoke<ShellResult>("shell_exec", { program, args });
}
