// ============================================================
// ZaraOS Memory Storage Layer
//
// Persistence adapter for all AI memory data.
// Alpha 0.3: localStorage only.
//
// FUTURE (Alpha 0.4+):
//   Replace localStorage with encrypted IndexedDB.
//   Use the Web Crypto API (AES-GCM) with a user-derived key.
//   Zero knowledge: the key never leaves the device.
//
// FUTURE (Tauri/Linux):
//   Replace with Tauri's secure storage plugin or a
//   SQLCipher encrypted SQLite database on the filesystem.
// ============================================================

import type { ConversationSession, MemoryEntry, UserPreferences, SkillUsageRecord } from "./memory-types";
import { DEFAULT_USER_PREFERENCES } from "./memory-types";

const KEYS = {
  SESSIONS: "zaraos_memory_sessions_v1",
  ENTRIES: "zaraos_memory_entries_v1",
  PREFERENCES: "zaraos_memory_prefs_v1",
  SKILL_USAGE: "zaraos_memory_skill_usage_v1",
  CURRENT_SESSION_ID: "zaraos_memory_current_session_v1",
};

// ── Generic helpers ───────────────────────────────────────

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* Corrupted — reset silently */ }
  return fallback;
}

function writeStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* Storage quota exceeded — non-fatal */ }
}

// ── Session Storage ───────────────────────────────────────

export function saveSession(session: ConversationSession): void {
  const all = readStore<Record<string, ConversationSession>>(KEYS.SESSIONS, {});
  all[session.id] = session;

  // Keep only the most recent 50 sessions to prevent unbounded growth.
  const entries = Object.entries(all).sort(([, a], [, b]) => b.lastActivityAt - a.lastActivityAt);
  const trimmed = Object.fromEntries(entries.slice(0, 50));
  writeStore(KEYS.SESSIONS, trimmed);
}

export function loadSession(sessionId: string): ConversationSession | null {
  const all = readStore<Record<string, ConversationSession>>(KEYS.SESSIONS, {});
  return all[sessionId] ?? null;
}

export function loadAllSessions(): ConversationSession[] {
  const all = readStore<Record<string, ConversationSession>>(KEYS.SESSIONS, {});
  return Object.values(all).sort((a, b) => b.lastActivityAt - a.lastActivityAt);
}

export function deleteSession(sessionId: string): void {
  const all = readStore<Record<string, ConversationSession>>(KEYS.SESSIONS, {});
  delete all[sessionId];
  writeStore(KEYS.SESSIONS, all);
}

export function getCurrentSessionId(): string | null {
  return localStorage.getItem(KEYS.CURRENT_SESSION_ID);
}

export function setCurrentSessionId(id: string): void {
  localStorage.setItem(KEYS.CURRENT_SESSION_ID, id);
}

// ── Entry Storage ─────────────────────────────────────────

export function saveEntries(entries: MemoryEntry[]): void {
  // Limit to 1000 entries — trim oldest non-pinned first.
  const pinned = entries.filter((e) => e.pinned);
  const unpinned = entries.filter((e) => !e.pinned).sort((a, b) => b.timestamp - a.timestamp);
  const trimmed = [...pinned, ...unpinned.slice(0, 1000 - pinned.length)];
  writeStore(KEYS.ENTRIES, trimmed);
}

export function loadEntries(): MemoryEntry[] {
  return readStore<MemoryEntry[]>(KEYS.ENTRIES, []);
}

// ── User Preferences ──────────────────────────────────────

export function savePreferences(prefs: UserPreferences): void {
  writeStore(KEYS.PREFERENCES, prefs);
}

export function loadPreferences(): UserPreferences {
  return readStore<UserPreferences>(KEYS.PREFERENCES, { ...DEFAULT_USER_PREFERENCES });
}

// ── Skill Usage ───────────────────────────────────────────

export function saveSkillUsage(records: SkillUsageRecord[]): void {
  writeStore(KEYS.SKILL_USAGE, records);
}

export function loadSkillUsage(): SkillUsageRecord[] {
  return readStore<SkillUsageRecord[]>(KEYS.SKILL_USAGE, []);
}

// ── Purge everything ─────────────────────────────────────

export function purgeAllMemory(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

// ── Estimate storage size ─────────────────────────────────

export function estimateStorageBytes(): number {
  return Object.values(KEYS).reduce((total, key) => {
    const val = localStorage.getItem(key);
    return total + (val ? val.length * 2 : 0); // UTF-16 = 2 bytes per char
  }, 0);
}
