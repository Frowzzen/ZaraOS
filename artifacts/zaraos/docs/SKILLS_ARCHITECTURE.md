# ZaraOS — Skills Architecture

Skills are the capability unit of ZaraOS. Every action Zara can perform — sending email,
playing audio, searching the web, deleting a file — is declared and executed as a skill.

This document describes how skills work, why they are designed the way they are, and how
they integrate with the Zara Runtime.

---

## What Is a Skill?

A skill is a **typed capability declaration** with:
- A unique ID (`skill.email`, `skill.web_search`, etc.)
- Metadata: name, description, category, status
- Required permissions (microphone, files, network, etc.)
- Input examples: voice commands, text commands, gesture commands
- Execution rules: confirmation required, dangerous flag, local-first flag
- Runtime state: enabled/disabled per user preference

Skills are NOT functions called directly by UI components.
All skill execution flows through `zaraRuntime.executeSkill()`.

---

## Skill Categories

| Category | Description |
|---|---|
| `communication` | Email, text messages, calls, contacts |
| `productivity` | Timers, alarms, calendar, scheduling, reminders, notes |
| `web_knowledge` | Search, fact-check, summarize, research, translate, define |
| `files_documents` | File management, document editing, summarize, optimize |
| `system_control` | App launching, window management, scroll, settings |
| `media` | Audio playback, video, volume control |
| `developer` | Build, plugin creation, test, package |

---

## Skill Status

| Status | Meaning |
|---|---|
| `built_in` | Fully implemented and functional |
| `mocked` | Architecture declared — execution returns safe mocked response |
| `future` | Declared only — returns "coming soon" message |

---

## Skill Execution Flow

```
User Input (voice / text / gesture)
        ↓
Command Router (parseAndRoute)
        ↓
Parsed Command {intent, skillId, requiresConfirmation, destructive}
        ↓
Zara Runtime (executeCommand / executeSkill)
        ↓
  ┌─────────────────┐
  │ Permission Gate │ → denied? → return permission_denied
  │ Enabled Gate    │ → disabled? → return disabled
  │ Dangerous Gate  │ → dangerous + not confirmed? → return confirm_required
  │ Confirm Gate    │ → needs confirm + not confirmed? → return confirm_required
  │ Future Gate     │ → future status? → return "coming soon"
  └─────────────────┘
        ↓
   Skill Runtime (executeSkill)
        ↓
   Mocked response (Alpha 0.1/0.2)
   Real execution (Alpha 0.4+)
        ↓
   SkillExecutionResult → UI
```

---

## Why Skills Are Local-First

ZaraOS is designed for users who value privacy and data sovereignty.

1. **On-device processing first** — every skill that can run without internet does so by default.
2. **No vendor lock-in** — no skill requires a specific cloud provider.
3. **User-owned accounts** — skills that need external services (email, calendar) use the user's own accounts. ZaraOS never holds credentials.
4. **Transparent data flow** — every skill declares exactly what permissions it needs and why.
5. **Opt-in cloud** — cloud features are always optional and always require explicit permission.

---

## Permission Model

Skills declare required permissions in their manifest. Before any skill executes:

1. The Skill Runtime checks all declared permissions against the OS permission state.
2. Missing permissions cause the skill to return `permission_denied`.
3. The user is directed to Privacy settings to grant missing permissions.
4. No skill can bypass this gate — the check is in the runtime, not the UI.

### Permission Categories Used by Skills

| Permission | What it allows |
|---|---|
| `microphone` | Voice input, call audio |
| `camera` | Gesture tracking, video calls |
| `files` | Read/write local files |
| `network` | Any external network request |
| `local_ai` | On-device AI inference |
| `cloud_ai` | External AI API calls |
| `system_actions` | OS-level operations |
| `contacts` | Access to address book |
| `calendar` | Calendar read/write |
| `notifications` | System notifications |
| `clipboard` | Clipboard read/write |

---

## Confirmation System

Some skills require explicit user confirmation before executing:

- All skills with `dangerous: true` (e.g., delete files, package app)
- Skills with `requiresConfirmation: true` (e.g., send email, place call, organize folders)

When confirmation is required:
1. Skill runtime returns `action: "confirm_required"` with a `confirmationReason`.
2. The UI shows a `ConfirmationDialog` with the skill name, reason, and danger level.
3. If the user confirms, the skill is re-executed with `confirmedByUser: true`.
4. If the user cancels, no action is taken.

**No real destructive action is taken in Alpha 0.1/0.2.** All dangerous actions are mocked.

---

## Built-in Skills Registry

All built-in skills are declared in:
```
src/core/skills/builtin-skills.ts
```

The registry exports:
- `BUILTIN_SKILLS` — full array of all skill declarations
- `getSkillById(id)` — look up by ID
- `getSkillsByCategory(category)` — filter by category
- `getEnabledSkills()` — only enabled skills
- `searchSkills(query)` — full-text search across name, description, commands

---

## Skill Runtime API

The Skill Runtime (`src/core/skills/skill-runtime.ts`) provides:

```typescript
skillRuntime.listSkills()                    // all skills
skillRuntime.getSkillsByCategory(category)   // filtered by category
skillRuntime.getSkill(id)                    // single skill
skillRuntime.searchSkills(query)             // text search
skillRuntime.checkSkillPermissions(skillId)  // {granted, missing}
skillRuntime.enableSkill(skillId)            // user enables
skillRuntime.disableSkill(skillId)           // user disables
skillRuntime.executeSkill(input)             // execute with gates
skillRuntime.getStats()                      // summary counts
```

---

## Zara Runtime Skill Methods

The Zara Runtime wraps the Skill Runtime and adds the permission layer:

```typescript
zaraRuntime.listSkills()
zaraRuntime.getSkill(skillId)
zaraRuntime.executeSkill(skillId, input, source)
zaraRuntime.checkSkillPermissions(skillId)
zaraRuntime.requestSkillConfirmation(skillId)
zaraRuntime.enableSkill(skillId)
zaraRuntime.disableSkill(skillId)
```

UI components call `useRuntime()` and then call these methods.
UI components never import `skillRuntime` directly.

---

## Adding a New Built-in Skill

1. Open `src/core/skills/builtin-skills.ts`
2. Add a new `ZaraSkill` object to `BUILTIN_SKILLS`
3. Add a mock response to `MOCK_RESPONSES` in `skill-runtime.ts`
4. Add command patterns to `src/lib/command-router.ts` that resolve to the skill's ID
5. The skill will automatically appear in the Skills Hub

---

## Future: Real Skill Execution (Alpha 0.4+)

In Alpha 0.4+, real skill execution will be wired in:

- Email: JavaMail / IMAP over local Tauri commands
- Calendar: CalDAV client (user's own server)
- Web search: SearXNG self-hosted or privacy-respecting search API
- File operations: Tauri `fs` plugin
- AI summarization: Ollama local endpoint
- Voice commands: Whisper.cpp via Tauri
- Gestures: MediaPipe Hands in-browser

---

## Future: Zara Store (Beta+)

Third-party developers will publish skills to the Zara Store.

A third-party skill must:
1. Declare a full `ZaraSkill` manifest
2. Declare all permissions it needs — no hidden access
3. Run in a sandboxed context (Web Worker or Tauri sandbox)
4. Pass ZaraOS security review before Store listing
5. Be user-removable at any time

See `PLUGIN_SPEC.md` for the full manifest specification including skill declarations.
