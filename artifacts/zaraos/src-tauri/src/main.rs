// ============================================================
// ZaraOS — Tauri Application Entry Point
//
// All IPC command handlers are registered here. The list of
// registered commands must stay in sync with the TypeScript
// tauriInvoke() call sites in src/core/tauri/.
//
// Build:
//   cargo tauri dev     — hot-reload dev mode (requires pnpm dev running)
//   cargo tauri build   — production binary + installer packages
//
// Linux prerequisites:
//   sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
//     libayatana-appindicator3-dev librsvg2-dev build-essential
// ============================================================

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // ── File system ──────────────────────────────────
            commands::fs::fs_read_text,
            commands::fs::fs_write_text,
            commands::fs::fs_list_dir,
            commands::fs::fs_exists,
            // ── Shell ────────────────────────────────────────
            commands::shell::shell_exec,
            // ── Key-value store (secure keychain) ────────────
            commands::kv::kv_get,
            commands::kv::kv_set,
            commands::kv::kv_delete,
            // ── System telemetry ─────────────────────────────
            commands::system::get_system_stats,
            commands::system::get_top_processes,
            // ── Power / volume / brightness ───────────────────
            commands::power::system_power,
            commands::power::get_volume,
            commands::power::set_volume,
            commands::power::toggle_mute,
            commands::power::get_brightness,
            commands::power::set_brightness,
            // ── Network (WiFi via nmcli) ──────────────────────
            commands::network::list_wifi_networks,
            commands::network::connect_wifi,
            commands::network::disconnect_wifi,
            commands::network::get_network_status,
            // ── App launcher ──────────────────────────────────
            commands::apps::list_installed_apps,
            commands::apps::launch_app,
            // ── Installer ────────────────────────────────────
            commands::disks::list_disks,
            commands::disks::start_install,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ZaraOS");
}
