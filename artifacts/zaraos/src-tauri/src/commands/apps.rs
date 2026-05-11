// ============================================================
// ZaraOS Tauri — Application Launcher Commands
//
// Discovers installed Linux applications by scanning XDG .desktop
// files from standard system directories, then launches them via
// the shell as detached background processes.
//
// Scanned directories (in order):
//   /usr/share/applications         — system-wide apps
//   /usr/local/share/applications   — locally installed apps
//   ~/.local/share/applications     — per-user apps
//
// Apps with NoDisplay=true or Terminal=true are excluded —
// terminal apps can still be opened via the Console panel.
// ============================================================

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;

#[derive(Serialize, Clone, Debug)]
pub struct InstalledApp {
    pub name: String,
    pub exec: String,
    pub icon: String,
    pub comment: String,
    pub categories: Vec<String>,
    pub generic_name: String,
}

/// Parse a single .desktop file and return an InstalledApp if it's displayable.
fn parse_desktop_file(path: &Path) -> Option<InstalledApp> {
    let content = fs::read_to_string(path).ok()?;

    let mut name         = String::new();
    let mut exec         = String::new();
    let mut icon         = String::new();
    let mut comment      = String::new();
    let mut generic_name = String::new();
    let mut categories   = Vec::new();
    let mut no_display   = false;
    let mut terminal     = false;
    let mut in_section   = false;

    for line in content.lines() {
        let line = line.trim();

        if line == "[Desktop Entry]" {
            in_section = true;
            continue;
        }
        if line.starts_with('[') && line.ends_with(']') {
            in_section = false;
            continue;
        }
        if !in_section || line.starts_with('#') {
            continue;
        }

        // Ignore locale-specific keys (e.g. Name[de]=)
        if let Some((key, value)) = line.split_once('=') {
            if key.contains('[') {
                continue; // locale variant — skip
            }
            match key.trim() {
                "Name"        => { if name.is_empty()         { name         = value.to_string(); } }
                "GenericName" => { if generic_name.is_empty()  { generic_name = value.to_string(); } }
                "Exec"        => {
                    // Strip %f %u %F %U %d %D %n %N %k %v field codes
                    exec = value
                        .split_whitespace()
                        .filter(|s| !s.starts_with('%'))
                        .collect::<Vec<_>>()
                        .join(" ");
                }
                "Icon"       => { if icon.is_empty()    { icon    = value.to_string(); } }
                "Comment"    => { if comment.is_empty() { comment = value.to_string(); } }
                "Categories" => {
                    categories = value
                        .split(';')
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                }
                "NoDisplay" => { if value == "true" { no_display = true; } }
                "Terminal"  => { if value == "true" { terminal   = true; } }
                _ => {}
            }
        }
    }

    // Reject invisible, terminal-only, or incomplete entries
    if no_display || terminal || name.is_empty() || exec.is_empty() {
        return None;
    }

    Some(InstalledApp {
        name,
        exec,
        icon,
        comment,
        categories,
        generic_name,
    })
}

fn app_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/usr/local/share/applications"),
    ];
    // Per-user apps
    if let Some(home) = std::env::var_os("HOME") {
        dirs.push(PathBuf::from(home).join(".local/share/applications"));
    }
    dirs
}

/// Scan XDG application directories and return all displayable apps sorted by name.
#[command]
pub fn list_installed_apps() -> Vec<InstalledApp> {
    let mut apps: Vec<InstalledApp> = app_dirs()
        .iter()
        .filter_map(|dir| fs::read_dir(dir).ok())
        .flatten()
        .flatten()
        .filter(|entry| {
            entry
                .path()
                .extension()
                .map(|ext| ext == "desktop")
                .unwrap_or(false)
        })
        .filter_map(|entry| parse_desktop_file(&entry.path()))
        .collect();

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // Deduplicate by name (prefer earlier / higher-priority directory)
    apps.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());

    apps
}

/// Launch an application by its Exec command as a detached background process.
/// The process is fully detached — ZaraOS does not wait for it to exit.
#[command]
pub fn launch_app(exec: String) -> Result<(), String> {
    std::process::Command::new("sh")
        .args(["-c", &format!("nohup {exec} >/dev/null 2>&1 &")])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("launch_app: {e}"))
}
