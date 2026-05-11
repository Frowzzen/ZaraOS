// ============================================================
// ZaraOS Conversation Memory Manager
//
// Manages the full conversation lifecycle:
//   - Session creation and continuation
//   - Message append and retrieval
//   - Memory pruning for context window limits
//   - Skill usage tracking
//   - User preference management
// ============================================================

import type {
  ConversationMessage,
  ConversationSession,
  MemoryEntry,
  UserPreferences,
  SkillUsageRecord,
  MemoryStats,
} from "./memory-types";
import {
  saveSession,
  loadSession,
  loadAllSessions,
  deleteSession,
  saveEntries,
  loadEntries,
  savePreferences,
  loadPreferences,
  saveSkillUsage,
  loadSkillUsage,
  getCurrentSessionId,
  setCurrentSessionId,
  purgeAllMemory,
  estimateStorageBytes,
} from "./memory-storage";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class ConversationMemory {
  private currentSession: ConversationSession | null = null;
  private entries: MemoryEntry[] = [];
  private preferences: UserPreferences;
  private skillUsage: SkillUsageRecord[] = [];
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
    this.preferences = loadPreferences();
    this.entries = loadEntries();
    this.skillUsage = loadSkillUsage();
  }

  // ── Session Management ────────────────────────────────

  startSession(): ConversationSession {
    const id = generateId();
    const session: ConversationSession = {
      id,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      messageCount: 0,
      messages: [],
    };
    this.currentSession = session;
    setCurrentSessionId(id);
    if (this.enabled) saveSession(session);
    return session;
  }

  resumeOrStartSession(): ConversationSession {
    const existingId = getCurrentSessionId();
    if (existingId) {
      const existing = loadSession(existingId);
      if (existing && Date.now() - existing.lastActivityAt < 30 * 60 * 1000) {
        // Resume if active within the last 30 minutes.
        this.currentSession = existing;
        return existing;
      }
    }
    return this.startSession();
  }

  getCurrentSession(): ConversationSession | null {
    return this.currentSession;
  }

  // ── Message Management ────────────────────────────────

  addMessage(message: Omit<ConversationMessage, "id">): ConversationMessage {
    const msg: ConversationMessage = { ...message, id: generateId() };

    if (this.currentSession) {
      this.currentSession.messages.push(msg);
      this.currentSession.messageCount++;
      this.currentSession.lastActivityAt = Date.now();
      if (this.enabled) saveSession(this.currentSession);
    }

    return msg;
  }

  getMessages(limit?: number): ConversationMessage[] {
    if (!this.currentSession) return [];
    const msgs = this.currentSession.messages;
    return limit ? msgs.slice(-limit) : msgs;
  }

  // Build the message array for AI provider injection.
  // Prunes to fit within context window (rough token estimate).
  getMessagesForContext(maxTokens = 3000): ConversationMessage[] {
    const msgs = this.getMessages();
    // Rough estimate: 1 token ≈ 4 characters.
    let tokenCount = 0;
    const result: ConversationMessage[] = [];

    for (let i = msgs.length - 1; i >= 0; i--) {
      const estimatedTokens = Math.ceil(msgs[i].content.length / 4);
      if (tokenCount + estimatedTokens > maxTokens) break;
      tokenCount += estimatedTokens;
      result.unshift(msgs[i]);
    }

    return result;
  }

  // ── Memory Entries ────────────────────────────────────

  addEntry(
    content: string,
    category: MemoryEntry["category"],
    scope: MemoryEntry["scope"] = "persistent",
    tags: string[] = []
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: generateId(),
      scope,
      category,
      content,
      timestamp: Date.now(),
      pinned: scope === "pinned",
      tags,
      sessionId: this.currentSession?.id ?? "no-session",
    };
    this.entries.push(entry);
    if (this.enabled) saveEntries(this.entries);
    return entry;
  }

  pinEntry(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      entry.pinned = true;
      entry.scope = "pinned";
      if (this.enabled) saveEntries(this.entries);
    }
  }

  removeEntry(id: string): void {
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.enabled) saveEntries(this.entries);
  }

  getPinnedEntries(): MemoryEntry[] {
    return this.entries.filter((e) => e.pinned);
  }

  getEntriesByCategory(category: MemoryEntry["category"]): MemoryEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  // ── Skill Usage Tracking ──────────────────────────────

  recordSkillUsage(
    skillId: string,
    result: SkillUsageRecord["lastResult"]
  ): void {
    const existing = this.skillUsage.find((r) => r.skillId === skillId);
    if (existing) {
      existing.lastUsedAt = Date.now();
      existing.useCount++;
      existing.lastResult = result;
    } else {
      this.skillUsage.push({
        skillId,
        lastUsedAt: Date.now(),
        useCount: 1,
        lastResult: result,
      });
    }
    if (this.enabled) saveSkillUsage(this.skillUsage);
  }

  getRecentSkills(limit = 5): SkillUsageRecord[] {
    return [...this.skillUsage]
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, limit);
  }

  getMostUsedSkills(limit = 5): SkillUsageRecord[] {
    return [...this.skillUsage]
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
  }

  // ── User Preferences ──────────────────────────────────

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    savePreferences(this.preferences);
  }

  // ── Statistics ────────────────────────────────────────

  getStats(): MemoryStats {
    const now = Date.now();
    const oldest = this.entries.reduce(
      (min, e) => (e.timestamp < min ? e.timestamp : min),
      now
    );
    const allMsgs = this.getMessages();
    const estimatedTokens = allMsgs.reduce(
      (sum, m) => sum + Math.ceil(m.content.length / 4),
      0
    );

    return {
      totalEntries: this.entries.length,
      sessionEntries: this.entries.filter((e) => e.scope === "session").length,
      persistentEntries: this.entries.filter((e) => e.scope === "persistent").length,
      pinnedEntries: this.entries.filter((e) => e.pinned).length,
      conversationTurns: this.currentSession?.messageCount ?? 0,
      oldestEntryAge: now - oldest,
      estimatedTokens,
    };
  }

  // ── Lifecycle ─────────────────────────────────────────

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  clearCurrentSession(): void {
    this.currentSession = null;
    this.startSession();
  }

  clearAllHistory(): void {
    // Preserve pinned entries.
    this.entries = this.entries.filter((e) => e.pinned);
    if (this.enabled) saveEntries(this.entries);
    this.startSession();
  }

  purgeAll(): void {
    purgeAllMemory();
    this.entries = [];
    this.skillUsage = [];
    this.currentSession = null;
    this.preferences = loadPreferences();
  }

  getAllSessions(): ConversationSession[] {
    return loadAllSessions();
  }

  deleteSessionById(id: string): void {
    deleteSession(id);
    if (this.currentSession?.id === id) {
      this.startSession();
    }
  }

  estimateStorageBytes(): number {
    return estimateStorageBytes();
  }
}

export const conversationMemory = new ConversationMemory(true);
