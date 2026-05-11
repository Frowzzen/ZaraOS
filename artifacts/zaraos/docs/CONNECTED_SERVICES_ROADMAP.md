# ZaraOS — Connected Services Roadmap

This document explains how ZaraOS will connect to external services in future releases,
the philosophy behind the connection model, and why ZaraOS does not pay for users' API costs.

---

## Current State (Alpha 0.1/0.2)

**No external services are connected.** ZaraOS Alpha is fully offline-capable.

All service-dependent skills are declared but their execution is mocked:
- Email → returns "not connected" message
- Calendar → shows empty local calendar
- Web search → returns mocked response
- Cloud AI → key input saved to localStorage only

This is intentional. The architecture is designed so services can be wired in later
without changing the runtime interface.

---

## The Connection Philosophy

### 1. User-Owned Accounts — Always

ZaraOS will NEVER hold user accounts, credentials, or billing relationships with external services.

Users bring their own:
- Email account (Gmail IMAP, ProtonMail bridge, Fastmail, etc.)
- Calendar service (Google Calendar CalDAV, Nextcloud, etc.)
- AI API key (OpenAI, Anthropic, Mistral — user pays, user controls)
- Phone/SMS account (if ever supported)

ZaraOS is a **client** that connects to services on behalf of the user.
It is not an intermediary that holds data or charges for API usage.

### 2. Local-First, External-Optional

Every connected service is optional enhancement:

| Feature | Without service | With service |
|---|---|---|
| AI | Local Ollama/llama.cpp models | Cloud fallback (user key) |
| Calendar | Manual local events | CalDAV sync |
| Search | Device search only | Web search via SearXNG |
| Email | No email | User's IMAP account |
| Notes | Local plain text | Optional cloud sync |

### 3. Privacy by Design

- Credentials stored in OS-level secure storage (Tauri keyring — Alpha 0.4+)
- No credentials ever transmitted to ZaraOS servers (there are none)
- No user data logged server-side (there is no server for this data)
- All service calls made directly from the user's device to the service

### 4. ZaraOS Does Not Pay for Inference

ZaraOS is local-first by both philosophy and economic necessity:

- Running cloud AI for thousands of users would be prohibitively expensive
- Users who want cloud AI use their own keys — they pay the provider directly
- This model is more transparent: users control costs and provider choice
- Local AI (Ollama, llama.cpp) has no per-call cost after hardware

---

## Connected Services Planned (Beta)

### Tier 1 — Local / Self-Hosted (no vendor dependency)

| Service | Protocol | Privacy |
|---|---|---|
| Local AI | Ollama REST API (localhost) | Maximum — on device |
| Calendar | CalDAV (Nextcloud, etc.) | User-hosted |
| Contacts | CardDAV | User-hosted |
| Email | IMAP/SMTP | User-controlled |
| Notes sync | Syncthing or SFTP | User-controlled |

### Tier 2 — Major Cloud Services (user key required)

| Service | What it enables | User provides |
|---|---|---|
| Google Calendar | Calendar sync | OAuth2 credentials |
| Gmail | Email read/send | OAuth2 credentials |
| OpenAI / Anthropic | Cloud AI fallback | API key |
| Mistral / Cohere | Cloud AI fallback | API key |

### Tier 3 — Future Integrations (post-v1.0)

| Service | What it enables |
|---|---|
| Slack | Read/send messages |
| Notion | Notes and documents |
| GitHub | Code and issues |
| Linear | Task management |
| Todoist / Things | Reminders and tasks |

---

## Connection Architecture (Alpha 0.4+)

When Connected Services is built, the architecture will be:

```
User configures service in Settings → Connected Services
        ↓
Credentials stored in Tauri OS keyring (never localStorage)
        ↓
ZaraOS creates a ServiceConnector for that service
        ↓
ServiceConnector exposes typed methods: send(), read(), list(), etc.
        ↓
Skill Runtime calls ServiceConnector methods (not raw APIs)
        ↓
All calls made device → service directly (no ZaraOS relay)
```

### ServiceConnector interface (planned)

```typescript
interface ServiceConnector {
  id: string;
  name: string;
  type: "email" | "calendar" | "ai" | "contacts" | "files";
  status: "connected" | "disconnected" | "error";
  connect(): Promise<boolean>;
  disconnect(): void;
  isConnected(): boolean;
  testConnection(): Promise<boolean>;
}
```

---

## Security Rules for Connected Services

1. All credentials stored in OS keyring — never in localStorage, never in logs
2. OAuth2 tokens refreshed automatically — refresh tokens never leave the device
3. API keys from AI Provider Manager already use localStorage only (Alpha) →
   will migrate to OS keyring in Alpha 0.4
4. No connected service can be accessed without explicit user permission grant
5. Disconnecting a service immediately revokes its access and clears cached data
6. All service connections auditable from Privacy → Connected Services panel

---

## Why Users Must Bring Their Own Keys

The economics of AI inference at scale:

| Provider | Cost per 1M tokens |
|---|---|
| GPT-4o | ~$5–15 |
| Claude Sonnet | ~$3–15 |
| Local Llama 3 (Ollama) | $0 |
| Local Mistral (Ollama) | $0 |

If ZaraOS paid for cloud AI for even 10,000 daily active users making 20 queries/day:
- 200M tokens/day × $5/M = $1,000/day = $365,000/year

This is not sustainable for an open-source project.

The local-first model solves this completely:
- Users with good hardware: free, private, fast
- Users who want cloud: use their own key, pay the provider directly
- ZaraOS: $0 inference costs, maximum user privacy

---

## User-Facing Connected Services Dashboard

The Privacy Panel will include a "Connected Services" section showing:

| Service | Status | Last used | Permissions | Actions |
|---|---|---|---|---|
| Ollama (local AI) | Disconnected | Never | local_ai | Connect |
| Google Calendar | Disconnected | Never | calendar, network | Connect |
| Gmail | Disconnected | Never | email, network | Connect |
| OpenAI | Disconnected | Never | cloud_ai, network | Connect |

By default: all disconnected, all off. Users connect services they choose.
