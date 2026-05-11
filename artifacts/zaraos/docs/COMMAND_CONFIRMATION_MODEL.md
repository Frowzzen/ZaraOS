# ZaraOS — Command Confirmation Model

This document explains how ZaraOS protects users from accidental or dangerous actions
through a structured confirmation system.

---

## Why Confirmation Exists

ZaraOS responds to natural language voice and text commands. Natural language is ambiguous.
A user saying "delete everything in downloads" could be intentional or a mistake.

The confirmation system exists to:
1. Prevent accidental irreversible actions
2. Show the user exactly what will happen before it does
3. Ensure sensitive data transmissions (email, SMS, calls) are deliberate
4. Protect against unintended skill execution from misheard voice commands

---

## Confirmation Trigger Rules

### Always Confirm (dangerous: true)

These actions are irreversible or potentially catastrophic:

| Action | Skill ID | Reason |
|---|---|---|
| Delete file | `skill.delete_files` | Permanent — cannot be undone |
| Package app for store | `skill.package_app` | Modifies build artifacts |

### Always Confirm (requiresConfirmation: true)

These actions transmit data externally or significantly modify system state:

| Action | Skill ID | Reason |
|---|---|---|
| Send email | `skill.email` | Transmits data to external network |
| Send text message | `skill.text_messages` | Transmits data to external carrier |
| Place call | `skill.calls` | Connects to external network |
| Organize folder | `skill.organize_folders` | Moves files — preview first |

### Never Confirm (safe, local, reversible)

Navigation, playback, search, timers, notes, scrolling — all execute immediately.

---

## Confirmation Flow

```
User issues command (voice / text / gesture)
        ↓
Command Router parses → ParsedCommand {requiresConfirmation, destructive, skillId}
        ↓
Zara Runtime detects confirmation requirement
        ↓
Returns CommandResult {action: "confirm_required", response: confirmationReason}
        ↓
UI shows ConfirmationDialog:
  ┌─────────────────────────────────────┐
  │  Confirm Action                     │
  │                                     │
  │  [Skill Icon]  Delete File          │
  │  DANGEROUS                          │
  │                                     │
  │  File deletion is permanent and     │
  │  cannot be undone.                  │
  │                                     │
  │  [ Cancel ]          [ Confirm ]    │
  └─────────────────────────────────────┘
        ↓
If confirmed → re-execute skill with confirmedByUser: true
If cancelled → no action taken, log only "user cancelled"
```

---

## Confirmation Dialog Variants

### Standard Confirmation

For `requiresConfirmation: true` but `dangerous: false`:
- Blue/neutral styling
- "Confirm" button in primary color
- Clear action description
- Cancel is default focus

### Dangerous Action Confirmation

For `dangerous: true`:
- Red/warning styling
- "Confirm" button in red/destructive color
- "DANGEROUS" badge visible
- Explicit irreversibility warning
- Cancel is default focus
- No auto-dismiss timeout

---

## What Is Logged During Confirmation

ZaraOS follows a strict privacy-first logging model during confirmation:

**Logged (safe metadata only):**
- Skill ID that was requested
- Timestamp of confirmation request
- Whether user confirmed or cancelled
- Input source (voice, text, gesture)

**Never logged:**
- Email recipient, subject, or body
- SMS recipient or content
- File names or paths
- Call recipients
- Any personal content

This ensures the confirmation audit trail cannot be used to reconstruct sensitive user actions.

---

## Destructive Command Detection in Command Router

The command router (`command-router.ts`) sets `destructive: true` on parsed commands that:

- Match delete/remove patterns: `"delete *"`, `"remove *"`, `"erase *"`
- Match send patterns: `"send email"`, `"send text"`, `"call *"`
- Match irreversible system actions

When `destructive: true`, the runtime always triggers the confirmation flow regardless
of the skill's own `requiresConfirmation` setting.

---

## Alpha 0.1/0.2 Note

**No real actions are taken in Alpha 0.1/0.2.**

Even if a user confirms a dangerous action, the skill runtime returns a mocked response.
No files are deleted, no emails are sent, no calls are placed.

The confirmation dialog is shown correctly to establish the UX pattern,
but the underlying execution is always safe.

---

## Future: Biometric Confirmation (Beta+)

For very sensitive actions (e.g., install plugin, share files externally, cloud AI with personal data),
a future release may support biometric re-authentication via:

- Tauri OS biometric plugin (fingerprint, face ID)
- PIN fallback
- Passphrase fallback

This prevents a bystander from confirming a sensitive action if the user leaves their machine unlocked.

---

## Future: Undo System (Beta+)

For actions that are destructive but theoretically recoverable (file move, rename, organize),
a future undo buffer will hold the reverse operation for 30 seconds after confirmation.

Truly irreversible actions (file delete, sent email, placed call) will not have undo.
