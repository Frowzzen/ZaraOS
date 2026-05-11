# ZaraOS Secure Storage Model

## Overview

ZaraOS Alpha 0.5 introduces a `SecureStorage` abstraction layer for all sensitive values (API keys, tokens, secrets). This document explains the current browser implementation, its limitations, and the upgrade path to full OS keychain integration in future Tauri/Linux builds.

---

## Why localStorage Is Not Enough

In Alpha 0.1–0.4, API keys were stored in plain `localStorage` under `zaraos_provider_keys_v1`. This was intentional prototype behavior and clearly labeled in the UI. The problems with raw localStorage:

1. **Readable by any JavaScript on the page.** If a malicious script runs in the same origin (e.g. a compromised dependency), it can read all localStorage keys.
2. **Readable in DevTools.** Any person with access to the browser can open DevTools → Application → Local Storage and see all values.
3. **No access control.** localStorage has no concept of "this value can only be read by this function" — everything is globally readable.
4. **Not cleared on logout.** localStorage persists indefinitely unless explicitly deleted.
5. **Included in browser sync.** Some browsers sync localStorage across devices, which can expose keys unexpectedly.

---

## Alpha 0.5 — Encrypted localStorage via Web Crypto AES-GCM

### What changed

All sensitive values now flow through `src/core/security/secure-storage.ts`. The `SecureStorage` module:

1. Generates a random 256-bit key material string and stores it in `localStorage` (`zaraos_skm_v1`)
2. Derives an AES-GCM-256 key from it using PBKDF2 (100,000 iterations, SHA-256, random salt)
3. Encrypts each value with a unique 96-bit IV using `window.crypto.subtle.encrypt()`
4. Packs `IV + ciphertext` into a single base64 blob stored in `localStorage`

### What this improves

- API keys are **no longer readable as plain text** in DevTools → Application → Local Storage
- Values are **encrypted at rest** — an attacker who extracts the localStorage dump gets ciphertext, not keys
- Each value has a **unique IV** — two identical keys stored under different IDs produce different ciphertext

### Remaining limitations in Alpha 0.5

- **The key material is still in localStorage.** An attacker with JavaScript execution can read both the key material and the ciphertext and decrypt everything. This is the fundamental limitation of browser-based cryptography — you cannot store a secret in the same environment you are protecting it from.
- **No hardware backing.** There is no TPM, Secure Enclave, or hardware security module involvement in the browser.
- **Single origin only.** SubtleCrypto is only available over HTTPS. On `file://` or non-HTTPS origins, SecureStorage falls back to base64 obfuscation (labeled `PLAIN:` prefix) as a clearly-marked degraded mode.

### What this does NOT fix

- XSS attacks with script execution in the page
- Physical access to the machine with DevTools open
- Malicious browser extensions with `localStorage` access

### Fallback

If `window.crypto.subtle` is unavailable, SecureStorage falls back to base64 obfuscation. The stored value is prefixed with `PLAIN:` so the code can detect and warn about it. This mode is worse than AES-GCM but still better than raw plaintext from a casual inspection standpoint.

---

## Planned: Encrypted IndexedDB (Alpha 0.6)

The next improvement is to move encrypted values from `localStorage` to IndexedDB with the following benefits:

- Larger storage limits (localStorage is capped at ~5–10 MB)
- Asynchronous non-blocking reads/writes
- Structural storage (no JSON serialization overhead)
- `IDBKeyRange` for efficient prefix queries

The encryption layer (AES-GCM via SubtleCrypto) remains identical — only the persistence backend changes. The `secureStorage.set/get/has/delete` interface does not change.

---

## Planned: Tauri OS Keychain (Alpha 0.6 / Beta 0.7)

When ZaraOS is packaged with Tauri, `SecureStorage` will be upgraded to use the native OS keychain via Tauri's `invoke()` bridge:

```typescript
// Future Tauri implementation (same interface, different backend)
async set(id: string, value: string): Promise<void> {
  await window.__TAURI__.invoke("keychain_set", { id, value });
}

async get(id: string): Promise<string | null> {
  return window.__TAURI__.invoke("keychain_get", { id });
}
```

On each platform this uses:
- **macOS**: Keychain Services (`SecItemAdd`, `SecItemCopyMatching`)
- **Windows**: Windows Credential Manager (`CredWrite`, `CredRead`)
- **Linux**: Secret Service API via `libsecret` (GNOME Keyring / KDE Wallet)

The Tauri Rust backend handles the native API calls — the key material never crosses the Tauri bridge; only named IDs and values do.

---

## Planned: Linux ISO — Secret Service / SQLCipher (v1.0)

On the ZaraOS Linux ISO, the keychain will use:

1. **Secret Service API** (via `libsecret`) for interactive desktop sessions
2. **SQLCipher** for encrypted SQLite storage when running headless or in kiosk mode
3. **Linux Kernel Keyring** (`keyctl`) as a fallback for daemon processes

The Zara Runtime will detect the runtime environment and select the appropriate backend automatically. The `SecureStorage` interface presented to application code never changes.

---

## API Reference

```typescript
await secureStorage.set(id, value)   // Encrypt and store
await secureStorage.get(id)          // Decrypt and return, or null
secureStorage.has(id)               // Boolean presence check (no decrypt)
secureStorage.delete(id)            // Secure removal
secureStorage.mask(id)              // "••••••••••••••••" or "" — safe for UI
secureStorage.listIds()             // List all managed IDs
```

---

## Security Rules

1. **Never log raw values.** `secureStorage.get()` results must never be passed to `console.log`, error reporters, analytics, or any system prompt.
2. **Never return raw values to UI state.** UI components receive `secureStorage.mask(id)` or a boolean `hasKey`. The raw value only moves from `secureStorage.get()` directly into an API request header.
3. **Invalidate on delete.** When a key is deleted, call `providerRouter.invalidateHealthCache(id)` to prevent stale routing decisions.
4. **Mask in status reports.** AI system prompts and context blocks must never include API key values, even masked. They may include `hasApiKey: true/false`.

---

## Implementation Files

- `src/core/security/secure-storage.ts` — the SecureStorage module
- `src/core/ai/providers/provider-registry.ts` — calls `secureStorage.set/get/has/delete` for all provider keys

## Status

| Feature | Alpha 0.5 | Alpha 0.6 | Tauri | Linux ISO |
|---------|-----------|-----------|-------|-----------|
| AES-GCM encrypted localStorage | YES | YES | Replaced | Replaced |
| Encrypted IndexedDB | — | YES | Replaced | — |
| OS Keychain (macOS/Win/Linux) | — | — | YES | — |
| Linux Secret Service / SQLCipher | — | — | — | YES |
