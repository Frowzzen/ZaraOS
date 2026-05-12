// ============================================================
// ZaraOS — Tauri Application Entry Point
//
// Build:
//   cargo tauri dev     — hot-reload dev mode (requires pnpm dev running)
//   cargo tauri build   — production binary
//
// Linux prerequisites:
//   sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
//     libayatana-appindicator3-dev librsvg2-dev build-essential
// ============================================================

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    zaraos_lib::run();
}
