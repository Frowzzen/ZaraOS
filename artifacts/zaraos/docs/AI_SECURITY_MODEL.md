# ZaraOS AI Security Model

## Local-First AI Philosophy

Zara operates on a simple principle: **your data never leaves your device without your explicit consent.**

By default:
- All AI inference runs locally (simulated in Alpha 0.3, Ollama/llama.cpp in Alpha 0.4+)
- No data is uploaded to any cloud service
- No background network connections are made
- No telemetry or usage analytics are collected

## Cloud AI — Opt-In Only

Cloud providers (OpenAI, Anthropic, Gemini) are:
- **Disabled by default** — require explicit user action to enable
- **Permission-gated** — the `cloud_ai` permission must be granted in Privacy settings
- **Bring-your-own-key** — users provide their own API keys; ZaraOS never pays for inference
- **Never used silently** — Zara informs the user when cloud AI is active

API keys:
- Stored in localStorage only (Alpha 0.3)
- Never logged to console, never transmitted to ZaraOS servers
- Never included in any analytics payload
- FUTURE: Will be stored in encrypted IndexedDB (Alpha 0.4+)

## No Hidden Telemetry

ZaraOS does not contain:
- Analytics SDKs (no Google Analytics, Mixpanel, Amplitude, etc.)
- Crash reporting SDKs that transmit data (no Sentry cloud mode)
- Feature flag services that phone home
- A/B testing services
- Any background polling of remote endpoints

## No Automatic Uploads

ZaraOS never automatically uploads:
- Conversation history
- Command history
- File contents
- Voice recordings
- Gesture data
- System information

## No Background Recordings

- Microphone access: **OFF by default**. Requires explicit permission grant per session.
- Camera access: **OFF by default**. Requires explicit permission grant per session.
- Microphone permission is revoked when the user closes the voice session.
- No audio is stored beyond the current voice recognition operation.

## Confirmation-Required Actions

Actions that affect external state require user confirmation before execution:
- Sending emails
- Making phone calls
- Sending SMS messages
- Deleting files (also marked DANGEROUS — irreversible)
- Modifying system settings

Confirmation dialogs:
- Never show personal content (no email body, no file paths, no contact details)
- Always provide a clear Cancel option as the default focus
- Never auto-confirm after a timeout

## AI Execution Boundaries

In Alpha 0.3, Zara **cannot**:
- Execute real file system operations
- Make real network requests
- Send real emails, SMS, or calls
- Access the clipboard
- Access browser history
- Access device contacts

These boundaries will be lifted one by one in Alpha 0.4+ with:
- Explicit permission gates
- Skill-level confirmation rules
- Tauri sandboxed execution

## Future Encrypted Memory

Current (Alpha 0.3): Conversation history stored in localStorage as plain JSON.

Future (Alpha 0.4+):
- Migrate to encrypted IndexedDB using Web Crypto API (AES-GCM)
- Key derived from user passphrase — never stored on disk
- Zero-knowledge: even if storage is extracted, content is unreadable without the key

Future (Linux/Tauri):
- SQLCipher encrypted SQLite on the local filesystem
- Optional: user-generated backup key stored on a physical USB security key

## AI Execution Sandboxing (Future)

When Zara gains real tool execution (Alpha 0.5+):
- Each tool call runs in a Tauri-sandboxed subprocess
- Subprocess has only the permissions required by the tool
- File access is scoped to user-selected directories
- Network access is scoped to declared endpoints

## Why Zara Avoids Acting Without Consent

Zara is an OS intelligence layer, not an autonomous agent. This means:

1. Zara responds to user intent — she does not act on her own initiative
2. Destructive or irreversible actions always pause for confirmation
3. Permission grants are granular and revocable at any time
4. The user is always informed when Zara is doing something that affects external state
5. "I don't know" is a valid response — Zara does not fabricate when uncertain

The goal is **trustworthy AI**, not impressive AI. An assistant that surprises the user with unconfirmed actions destroys trust permanently.
