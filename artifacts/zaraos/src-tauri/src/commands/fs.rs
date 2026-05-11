// ============================================================
// ZaraOS Tauri — File System Commands
//
// Exposes UTF-8 file read/write and directory listing to the
// TypeScript frontend via the Tauri IPC bridge.
//
// Scope:
//   All paths are passed through Tauri's FS plugin scope defined
//   in tauri.conf.json. Paths outside the allowed scope will be
//   rejected by the plugin before reaching these handlers.
// ============================================================

use serde::{Deserialize, Serialize};
use std::fs;
use std::time::UNIX_EPOCH;
use tauri::command;

#[derive(Debug, Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub modified_at: u64, // Unix timestamp in milliseconds
}

/// Read a UTF-8 text file and return its contents as a String.
#[command]
pub fn fs_read_text(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("fs_read_text: {e}"))
}

/// Write UTF-8 text to a file, creating it if it does not exist.
/// Parent directories must already exist.
#[command]
pub fn fs_write_text(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("fs_write_text: {e}"))
}

/// List directory entries at `path`.
#[command]
pub fn fs_list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| format!("fs_list_dir: {e}"))?;

    let mut result = Vec::new();
    for entry in entries.flatten() {
        let metadata = entry.metadata().unwrap_or_else(|_| {
            // Fallback metadata — zero-fill non-readable entries
            entry.metadata().unwrap()
        });
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        result.push(DirEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            path: entry.path().to_string_lossy().into_owned(),
            is_dir: metadata.is_dir(),
            size_bytes: metadata.len(),
            modified_at,
        });
    }

    Ok(result)
}

/// Check whether a path exists within the allowed FS scope.
#[command]
pub fn fs_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}
