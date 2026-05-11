// ============================================================
// ZaraOS — Tauri Application Entry Point
//
// Registers all IPC command handlers and initialises Tauri plugins.
//
// Build:
//   cargo tauri dev     — development (hot-reload via Vite devUrl)
//   cargo tauri build   — production binary + installer
//
// Requires:
//   - Rust 1.77+ (stable)
//   - Tauri CLI:  cargo install tauri-cli --version "^2"
//   - System libs: libgtk-3-dev libwebkit2gtk-4.1-dev (Linux)
// ============================================================

// Prevents an additional console window on Windows in release mode.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // File system
            commands::fs::fs_read_text,
            commands::fs::fs_write_text,
            commands::fs::fs_list_dir,
            commands::fs::fs_exists,
            // Shell
            commands::shell::shell_exec,
            // Key-value store (secure keychain fallback)
            commands::kv::kv_get,
            commands::kv::kv_set,
            commands::kv::kv_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ZaraOS");
}
