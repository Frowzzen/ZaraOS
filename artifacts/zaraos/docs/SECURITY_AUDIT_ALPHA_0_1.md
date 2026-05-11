# ZaraOS Security Audit — Alpha 0.1

**Date:** May 2026
**Version:** Alpha 0.1
**Scope:** Frontend-only React web app, no backend, no real hardware access

---

## Executive Summary

ZaraOS Alpha 0.1 has a strong security posture for a prototype with no backend and no real system access. The core architecture is sound. Key risks are inherent to the prototype nature (localStorage for sensitive data, mocked permissions) and will be addressed before Beta.

**Current risk level: LOW** (no production data, no real API calls, no real hardware access)

---

## Strengths

### 1. No Backend Attack Surface
Alpha 0.1 has zero backend. There is no server to compromise, no database to exfiltrate, no network endpoints to attack. All data lives in the user's browser localStorage.

### 2. Deny-By-Default Permissions
All sensitive permissions (microphone, camera, cloud AI, network, files, system actions, developer mode) are disabled at first launch. The user must explicitly enable each one.

### 3. API Keys Not Logged
The AI Engine never passes API keys to `console.log`, `console.error`, or any logging surface. Keys are stored in localStorage only and displayed as `••••••••` in the UI.

### 4. No Real System Commands
All "system actions" in Alpha 0.1 are mocked navigation events. No actual Linux commands are executed. No file system is accessed. No processes are spawned.

### 5. Cloud AI Blocked By Default
Cloud AI is disabled by default at both the permission and privacy store level. The cloud AI toggle is visually marked and requires explicit user action to enable.

### 6. Destructive Command Gate
The command router flags destructive intents. The Runtime returns `action: "confirm_required"` and blocks execution pending user confirmation.

### 7. Local-First Architecture
No external API calls in Alpha 0.1. All AI responses are mocked locally. No telemetry, no analytics, no external data flows.

---

## Current Risks

### RISK-001 — localStorage is Unencrypted
**Severity:** Medium (prototype only)
**Description:** API keys, permissions, and privacy state are stored in plaintext in browser localStorage. Any script with same-origin access can read them.
**Current impact:** Minimal — no real API keys are transmitted and the app has no attack surface.
**Remediation (before Beta):** Implement Web Crypto API AES-GCM encryption for localStorage values that contain API keys. Migrate to Tauri secure keychain for desktop builds.

### RISK-002 — Voice/Camera Permissions Are UI-Only
**Severity:** Low (Alpha only)
**Description:** The mic/camera toggles in the Privacy Panel update the privacy store state, but do not call `navigator.mediaDevices.getUserMedia()`. The browser grants no real hardware access, so there is no real exposure.
**Remediation (Alpha 0.2):** Wire real `getUserMedia()` calls. Ensure browser permission prompt is shown before any hardware access.

### RISK-003 — No Content Security Policy
**Severity:** Low (local dev only)
**Description:** The Vite dev build has no explicit CSP header configured. In production, a strict CSP would prevent XSS from injecting scripts.
**Remediation (Beta):** Add CSP meta tag or HTTP header. Policy: `default-src 'self'; script-src 'self'; connect-src localhost:11434` (for Ollama).

### RISK-004 — Plugin System Has No Enforcement
**Severity:** Low (Alpha only)
**Description:** The plugin manifest type and registry exist, but there is no actual plugin execution engine. Plugins cannot be installed or run yet.
**Remediation (Beta 0.2):** Implement sandbox enforcement before plugin execution is enabled. Use CSP + iframe isolation for third-party plugin UI.

### RISK-005 — No Session Management
**Severity:** Low (no accounts exist)
**Description:** ZaraOS Alpha 0.1 has no user accounts and no sessions. All state is stored in the local browser. This is intentional for the prototype.
**Remediation (future):** If multi-user support is added, implement proper session management. For single-user USB OS, this may never be needed.

### RISK-006 — Dependency Supply Chain
**Severity:** Low
**Description:** The project depends on npm packages. A compromised package could introduce malicious code.
**Remediation:** Run `pnpm audit` before each release. Pin critical dependency versions. Consider adding Renovate for automated patch updates.

---

## Recommendations Before Alpha 0.2

1. Add CSP meta tag to `index.html`
2. Run `pnpm audit` and resolve any high/critical advisories
3. Wire real `getUserMedia()` before shipping voice or gesture features
4. Add a visible warning in the AI Provider Manager UI that localStorage is not encrypted storage

## Recommendations Before Beta

1. Implement Web Crypto AES-GCM encryption for localStorage API key storage
2. Enforce plugin sandbox (CSP + iframe isolation)
3. Add privacy audit log (timestamped record of all hardware and network events)
4. Security review of Tauri command allowlist before any shell access is enabled
5. Engage a third-party security reviewer before any public release

---

## Not In Scope For Alpha 0.1

- Network penetration testing (no backend)
- Authentication testing (no accounts)
- Real system command execution (all mocked)
- Real hardware device testing (browser-only)
