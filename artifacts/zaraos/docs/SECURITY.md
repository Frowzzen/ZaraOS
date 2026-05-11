# ZaraOS Security Model

## Principles

1. **Local first** — data never leaves the device unless the user explicitly enables cloud AI and provides their own API key.
2. **Deny by default** — microphone, camera, cloud AI, system actions, and developer mode are all disabled at launch.
3. **Explicit consent** — every capability that accesses hardware or external networks requires an explicit user grant.
4. **No company-paid inference** — ZaraOS does not proxy or pay for AI API calls. Users bring their own keys.
5. **Visible state** — the Privacy Panel shows the real-time status of every active capability. Nothing is hidden.
6. **Minimal surface** — the app has no backend, no analytics, no telemetry, and no external calls in Alpha 0.1.

---

## Permission System

Managed by `src/core/permissions.ts`. All permissions are checked by the Zara Runtime before executing any command.

| Permission        | Default  | Required For                              |
|-------------------|----------|-------------------------------------------|
| `microphone`      | OFF      | Voice input, Zara voice listening         |
| `camera`          | OFF      | Gesture tracking                          |
| `local_ai`        | ON       | Zara assistant, console AI responses      |
| `cloud_ai`        | OFF      | External AI providers (user API key)      |
| `network`         | OFF      | Web search, cloud AI, future updates      |
| `files`           | OFF      | File browser, folder summarization        |
| `system_actions`  | OFF      | App launching, system commands            |
| `plugins`         | OFF      | Third-party plugin installation           |
| `developer_mode`  | OFF      | Developer Portal, advanced tools          |

---

## API Key Handling

- Keys are stored in `localStorage` under an obfuscated key.
- Keys are **never** logged (no `console.log`, `console.error`, or similar with key values).
- Keys are **never** transmitted in Alpha 0.1 — cloud provider calls are mocked.
- Keys are displayed as `••••••••` in the UI after entry.
- The UI clearly labels localStorage as prototype-only storage.

**Future:** Encrypted storage using the Web Crypto API (or Tauri's secure keychain on desktop).

---

## Destructive Commands

Any command marked `destructive: true` in the command router will not execute without an explicit user confirmation step. The Runtime returns `action: "confirm_required"` and the UI must show a confirmation dialog before re-invoking.

---

## Hardware Access

- Microphone and camera are off by default and require user toggle in the Privacy Panel.
- When mic or camera is active, a visible animated indicator appears in the sidebar and Privacy Panel.
- Neither the mic nor camera is accessed in Alpha 0.1 — they are UI-only toggles on the privacy state.
- In future versions, `navigator.mediaDevices.getUserMedia()` will be called only after the user has toggled the permission on.

---

## Plugin Sandboxing

Plugins must:
1. Declare all permissions in their manifest.
2. Have all declared permissions already granted by the user.
3. Run in a sandbox (future enforcement via Tauri WebView isolation or iframe CSP).
4. Pass a manifest signature check (future: cryptographic verification).

---

## Network Security

- No external HTTP calls are made in Alpha 0.1.
- When Ollama is connected (future), calls are made to `localhost:11434` only — no external network.
- Cloud AI calls (future) will only be made after the user has: enabled cloud AI, granted network permission, and provided their own API key.

---

## Threat Model Summary

| Threat                              | Mitigation                                              |
|-------------------------------------|---------------------------------------------------------|
| API key exposure via logs           | Keys never passed to console.* anywhere                 |
| API key exposure via network        | No cloud calls in Alpha 0.1; localStorage only          |
| Unauthorized microphone access      | Requires explicit user toggle; deny by default          |
| Unauthorized camera access          | Requires explicit user toggle; deny by default          |
| Destructive system command          | Flagged and blocked pending confirmation                |
| Malicious plugin                    | Manifest validation + permission check before install   |
| localStorage tampering              | Non-sensitive data only; keys obfuscated at rest        |
| XSS via plugin output               | Future: CSP + sandbox iframe for plugin UI              |

See `SECURITY_AUDIT_ALPHA_0_1.md` for the current audit findings.
