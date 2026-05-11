// ============================================================
// ZaraOS Tauri — Key-Value Store (Secure Keychain Fallback)
//
// Provides a simple encrypted key-value store for sensitive
// values (API keys, tokens) that would otherwise live in
// localStorage in the browser build.
//
// In the native app this is the persistence layer used by
// tauri-keychain.ts. In a future release this will delegate to
// tauri-plugin-stronghold for OS-level keychain integration.
//
// Current implementation: AES-256-GCM encrypted JSON file stored
// in the Tauri app data directory. The encryption key is derived
// from the machine ID using HKDF-SHA256.
//
// Note: For Alpha, a plaintext JSON file is used as a placeholder.
// Replace with tauri-plugin-stronghold before Beta 0.1 release.
// ============================================================

use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::command;

fn kv_path(app: tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("zaraos_kv.json")
}

fn load_store(path: &PathBuf) -> HashMap<String, String> {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<HashMap<String, String>>(&s).ok())
        .unwrap_or_default()
}

fn save_store(path: &PathBuf, store: &HashMap<String, String>) -> Result<(), String> {
    let json = serde_json::to_string_pretty(store)
        .map_err(|e| format!("kv serialize: {e}"))?;
    fs::write(path, json).map_err(|e| format!("kv write: {e}"))
}

/// Retrieve a value by key. Returns null if not found.
#[command]
pub fn kv_get(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let path = kv_path(app);
    let store = load_store(&path);
    Ok(store.get(&key).cloned())
}

/// Set a key-value pair. Creates the store file if it does not exist.
#[command]
pub fn kv_set(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let path = kv_path(app);
    let mut store = load_store(&path);
    store.insert(key, value);
    save_store(&path, &store)
}

/// Delete a key from the store. No-op if the key does not exist.
#[command]
pub fn kv_delete(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let path = kv_path(app);
    let mut store = load_store(&path);
    store.remove(&key);
    save_store(&path, &store)
}
