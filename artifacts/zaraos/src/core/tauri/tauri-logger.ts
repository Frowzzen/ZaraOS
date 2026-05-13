// ============================================================
// ZaraOS Debug Logger — Developer tool only
//
// Writes timestamped log lines to /tmp/zaraos-debug.log on the
// native Dell/Linux machine. Never runs in the browser.
//
// Usage (fire-and-forget, non-blocking):
//   import { debugLog } from "@/core/tauri/tauri-logger";
//   debugLog("gesture", "detect() returned 0 landmarks");
//
// To upload the log to GitHub for agent review, run on the Dell:
//   bash ~/ZaraOS/scripts/upload-debug-log.sh
//
// Log file location: /tmp/zaraos-debug.log
// The file is cleared on each app launch (see initDebugLog).
// ============================================================

const LOG_PATH    = "/tmp/zaraos-debug.log";
const BUF_PATH    = "/tmp/zaraos-logbuf.tmp";
const FLUSH_MS    = 1500; // flush buffer every 1.5 s

let buffer:        string[]             = [];
let flushTimer:    ReturnType<typeof setTimeout> | null = null;
let initialized    = false;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Write a debug line to /tmp/zaraos-debug.log (Tauri only, fire-and-forget).
 * Lines are buffered and flushed every 1.5 s to avoid hammering the FS.
 *
 * @param tag   Short category tag, e.g. "gesture", "voice", "wake"
 * @param msg   Message string (avoid single quotes to keep shell safe)
 */
export function debugLog(tag: string, msg: string): void {
  if (typeof window === "undefined") return;
  if (!("__TAURI_INTERNALS__" in window) && !("__TAURI__" in window)) return;

  const ts   = new Date().toISOString();
  const line = `[${ts}] [${tag.toUpperCase().padEnd(8)}] ${msg}`;
  buffer.push(line);

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, FLUSH_MS);
  }
}

/**
 * Call once at app startup (Tauri only).
 * Clears any leftover log from a previous session and writes a header.
 */
export async function initDebugLog(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("__TAURI_INTERNALS__" in window) && !("__TAURI__" in window)) return;
  if (initialized) return;
  initialized = true;

  try {
    const { fsWriteText, shellExec } = await import("./tauri-fs");
    const header = [
      "=".repeat(64),
      `ZaraOS Debug Log — ${new Date().toISOString()}`,
      `User agent: ${navigator.userAgent}`,
      "=".repeat(64),
      "",
    ].join("\n");
    await fsWriteText(LOG_PATH, header);
    // Verify the shell append pipeline works
    await fsWriteText(BUF_PATH, "[INIT] Debug logger ready.\n");
    await shellExec("sh", ["-c", `cat ${BUF_PATH} >> ${LOG_PATH}`]);
  } catch (err) {
    console.warn("[tauri-logger] init failed:", err);
  }
}

// ── Internal flush ────────────────────────────────────────────────────────────

async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  const lines = buffer.splice(0);
  const content = lines.join("\n") + "\n";

  try {
    const { fsWriteText, shellExec } = await import("./tauri-fs");
    await fsWriteText(BUF_PATH, content);
    await shellExec("sh", ["-c", `cat ${BUF_PATH} >> ${LOG_PATH}`]);
  } catch {
    // If the FS write fails, push lines back so they aren't lost
    buffer = [...lines, ...buffer];
  }
}
