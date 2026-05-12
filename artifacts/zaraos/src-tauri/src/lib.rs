// ============================================================
// ZaraOS — Tauri Library Entry Point
//
// Exposes the app builder as a library so Tauri v2 can link
// it as both a binary (main.rs) and a cdylib/staticlib for
// mobile and other Tauri tooling targets.
// ============================================================

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
            commands::power::exit_app,
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
            // ── App launcher + window manager ────────────────
            commands::apps::list_installed_apps,
            commands::apps::launch_app,
            commands::apps::list_open_windows,
            commands::apps::focus_window,
            commands::apps::close_window,
            commands::apps::minimize_window,
            commands::apps::focus_window_by_index,
            // ── Installer ────────────────────────────────────
            commands::disks::list_disks,
            commands::disks::start_install,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ZaraOS");
}
