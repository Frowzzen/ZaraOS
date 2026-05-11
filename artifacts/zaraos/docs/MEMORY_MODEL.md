# ZaraOS Memory Model

## Overview

ZaraOS memory gives Zara continuity across a session and (optionally) across sessions. All memory is local-first and privacy-preserving by design.

## Memory Scopes

| Scope | Lifetime | Use |
|---|---|---|
| `session` | Until tab/app closes | Current conversation context |
| `persistent` | Until user clears | Cross-session preferences, notes |
| `pinned` | Until user unpins | Explicit long-term memory |

## Memory Categories

| Category | What it stores |
|---|---|
| `conversation` | Chat message history |
| `preference` | User behavioral preferences |
| `skill_usage` | Which skills were used, when, and how often |
| `command_history` | Raw command strings (not content) |
| `system` | OS-level events stored for context |
| `context_note` | Zara-authored notes about the session |

## What is NEVER Stored

- API keys or tokens
- Passwords or authentication data
- Raw email body content
- File contents
- Contact details beyond what the user explicitly asks Zara to remember
- Biometric data

## Session Management

Each ZaraOS session has a unique ID. When Zara restarts:
1. If a session was active in the last 30 minutes → resume it
2. Otherwise → start a new session

Session ID is stored in `localStorage.zaraos_memory_current_session_v1`.

## Conversation History

Conversation turns are stored as `ConversationMessage` objects:
- `role`: user | assistant | system
- `content`: the message text
- `source`: voice | gesture | keyboard | system | plugin
- `skillId`: if the message related to a skill execution
- `intent`: the parsed command intent at the time
- `provider`: which AI provider responded
- `model`: which model responded
- `latencyMs`: how long the response took
- `streamed`: whether it was streamed

## Context Window Pruning

When building the message array for AI inference:
1. Start from most recent message and work backwards
2. Estimate tokens: ~1 token per 4 characters
3. Stop when estimated total exceeds `maxTokens` (default 3000)
4. The system prompt is prepended separately and not counted

This ensures Zara's responses remain fast even in long conversations.

## Skill Usage Tracking

For each skill invocation, memory records:
- `skillId`
- `lastUsedAt` timestamp
- `useCount` (incremented each use)
- `lastResult`: success | failed | cancelled | pending

This powers "recently used skills" in context injection and future "frequently used" UI.

## User Preferences

Preferences persisted in memory:
- `preferredProvider`: which AI provider to use by default
- `preferredModel`: which model within that provider
- `localFirstEnabled`: always true by default
- `offlineModeEnabled`: refuse cloud calls entirely
- `memoryEnabled`: whether to persist conversation at all
- `conversationRetentionDays`: 0 = session only, 7 = default, 30 = extended
- `preferredInputMode`: hybrid | voice | gesture | text
- `streamingEnabled`: show streaming responses
- `contextInjectionEnabled`: inject OS state into prompts

## Storage Implementation

**Alpha 0.3:** `localStorage` only.
- Sessions key: `zaraos_memory_sessions_v1`
- Entries key: `zaraos_memory_entries_v1`
- Preferences key: `zaraos_memory_prefs_v1`
- Skill usage key: `zaraos_memory_skill_usage_v1`

**Limits:** Maximum 50 sessions, 1000 memory entries. Oldest non-pinned entries are pruned first.

## Future Storage (Alpha 0.4+)

**Browser:** Encrypted IndexedDB using Web Crypto API (AES-GCM).
- Key derived from user passphrase
- Key never stored — derived on login
- Content unreadable without correct passphrase

**Tauri/Linux:** SQLCipher encrypted SQLite.
- File at `~/.config/zaraos/memory.db`
- Key derived from system keyring or user passphrase
- Optional backup to encrypted file on user-selected USB key

## Clearing Memory

Users can clear memory at granular levels:
1. Clear current session only (start fresh conversation)
2. Clear all conversation history (preserve preferences)
3. Purge all memory (factory reset for AI memory)

Pinned entries are always preserved unless the user explicitly unpins them first.
