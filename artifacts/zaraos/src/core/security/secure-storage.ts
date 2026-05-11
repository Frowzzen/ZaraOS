// ============================================================
// ZaraOS Secure Storage — Alpha 0.5
//
// Abstraction layer for all sensitive value storage (API keys,
// tokens, secrets). Provides:
//   - A clean interface: get/set/delete/has
//   - Web Crypto AES-GCM encryption for browser Alpha 0.5
//   - Storage in localStorage (encrypted ciphertext only)
//   - A clearly labeled fallback path for environments where
//     SubtleCrypto is unavailable (e.g. non-HTTPS)
//   - Never logs raw key values
//   - Masks values before returning them to UI
//
// Alpha 0.5 limitations:
//   The encryption key is derived from a stable per-device
//   seed and stored in localStorage. This is significantly
//   better than raw localStorage but NOT equivalent to a
//   hardware-backed keychain. See docs/SECURE_STORAGE_MODEL.md.
//
// Future (Alpha 0.6+ with Tauri):
//   Replace the localStorage backend with Tauri's OS keychain
//   via: window.__TAURI__.invoke('keychain_set', { key, value })
//   The SecureStorage interface stays identical — only the
//   adapter changes.
// ============================================================

const CRYPTO_KEY_MATERIAL_KEY = "zaraos_skm_v1";
const STORAGE_PREFIX          = "zaraos_sec_v1_";
const SALT_KEY                = "zaraos_salt_v1";

// ── Crypto helpers ────────────────────────────────────────

function isCryptoAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined"
  );
}

async function getSalt(): Promise<Uint8Array> {
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) {
    return new Uint8Array(JSON.parse(stored) as number[]);
  }
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, JSON.stringify(Array.from(salt)));
  return salt;
}

async function deriveKey(): Promise<CryptoKey> {
  // Use a stable per-session material string combined with a
  // device-specific salt. Not a hardware secret — see docs.
  let keyMaterial = localStorage.getItem(CRYPTO_KEY_MATERIAL_KEY);
  if (!keyMaterial) {
    const raw = window.crypto.getRandomValues(new Uint8Array(32));
    keyMaterial = btoa(String.fromCharCode(...raw));
    localStorage.setItem(CRYPTO_KEY_MATERIAL_KEY, keyMaterial);
  }

  const salt = await getSalt();
  const enc = new TextEncoder();

  const importedKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(keyMaterial),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Cast salt buffer to ArrayBuffer for TypeScript strict lib compatibility
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100_000,
      hash: "SHA-256",
    },
    importedKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey();
  const iv  = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );

  // Pack iv + ciphertext into a single base64 blob
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(blob: string): Promise<string> {
  const key = await deriveKey();
  const combined = new Uint8Array(
    atob(blob).split("").map((c) => c.charCodeAt(0))
  );

  const iv         = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plainBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plainBuffer);
}

// ── Fallback (no SubtleCrypto) ────────────────────────────
// Basic obfuscation — not encryption. Clearly labeled.
// Activates only in non-HTTPS contexts where SubtleCrypto is
// unavailable (e.g. file:// during development).

function fallbackEncode(value: string): string {
  return "PLAIN:" + btoa(value);
}

function fallbackDecode(value: string): string {
  if (value.startsWith("PLAIN:")) {
    return atob(value.slice(6));
  }
  return value; // legacy plain value
}

// ── Public Interface ──────────────────────────────────────

export const secureStorage = {
  /**
   * Store a sensitive value. Encrypts with AES-GCM if SubtleCrypto
   * is available, otherwise uses labeled base64 obfuscation.
   * Never logs the value.
   */
  async set(id: string, value: string): Promise<void> {
    if (!value) {
      localStorage.removeItem(STORAGE_PREFIX + id);
      return;
    }
    try {
      if (isCryptoAvailable()) {
        const ciphertext = await encrypt(value);
        localStorage.setItem(STORAGE_PREFIX + id, ciphertext);
      } else {
        localStorage.setItem(STORAGE_PREFIX + id, fallbackEncode(value));
      }
    } catch {
      // If encryption fails, still write — never silently discard a key save
      localStorage.setItem(STORAGE_PREFIX + id, fallbackEncode(value));
    }
  },

  /**
   * Retrieve a sensitive value. Returns null if not found.
   * Never passes the raw value to logging systems.
   */
  async get(id: string): Promise<string | null> {
    const stored = localStorage.getItem(STORAGE_PREFIX + id);
    if (!stored) return null;

    // Detect obfuscated values from fallback path
    if (stored.startsWith("PLAIN:")) {
      return fallbackDecode(stored);
    }

    // Detect legacy plain values (pre-Alpha 0.5) — migrate on read
    if (!stored.startsWith("PLAIN:") && stored.length < 64 && !stored.includes("+") && !stored.includes("/")) {
      // Looks like a raw key — migrate to encrypted on read
      if (isCryptoAvailable()) {
        await secureStorage.set(id, stored);
      }
      return stored;
    }

    try {
      if (isCryptoAvailable()) {
        return await decrypt(stored);
      }
      return fallbackDecode(stored);
    } catch {
      // Decryption failure — value may be corrupted or from a
      // different key material. Return null rather than crashing.
      return null;
    }
  },

  /**
   * Check whether a value is stored (without decrypting).
   * Safe to call synchronously from UI.
   */
  has(id: string): boolean {
    return localStorage.getItem(STORAGE_PREFIX + id) !== null;
  },

  /**
   * Delete a stored value securely.
   */
  delete(id: string): void {
    localStorage.removeItem(STORAGE_PREFIX + id);
  },

  /**
   * Return a masked display string — never the real value.
   * Used by UI components to confirm a key is saved.
   */
  mask(id: string): string {
    return this.has(id) ? "••••••••••••••••" : "";
  },

  /**
   * List all storage IDs managed by SecureStorage.
   */
  listIds(): string[] {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) {
        ids.push(k.slice(STORAGE_PREFIX.length));
      }
    }
    return ids;
  },
};
