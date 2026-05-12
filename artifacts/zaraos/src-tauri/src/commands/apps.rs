// ============================================================
// ZaraOS Tauri — Application Launcher + Window Manager Commands
//
// Discovers installed Linux applications by scanning XDG .desktop
// files from standard system directories, then launches them via
// the shell as detached background processes.
//
// Window management uses wmctrl (focus/close) and xdotool (minimize).
// Install prerequisites on Ubuntu:
//   sudo apt-get install -y wmctrl xdotool
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

// ── Installed App ─────────────────────────────────────────────

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

        if let Some((key, value)) = line.split_once('=') {
            if key.contains('[') {
                continue; // locale variant — skip
            }
            match key.trim() {
                "Name"        => { if name.is_empty()         { name         = value.to_string(); } }
                "GenericName" => { if generic_name.is_empty()  { generic_name = value.to_string(); } }
                "Exec"        => {
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

    if no_display || terminal || name.is_empty() || exec.is_empty() {
        return None;
    }

    Some(InstalledApp { name, exec, icon, comment, categories, generic_name })
}

fn app_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/usr/local/share/applications"),
    ];
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
    apps.dedup_by(|a, b| a.name.to_lowercase() == b.name.to_lowercase());
    apps
}

/// Launch an application by its Exec command as a detached background process.
#[command]
pub fn launch_app(exec: String) -> Result<(), String> {
    std::process::Command::new("sh")
        .args(["-c", &format!("nohup {exec} >/dev/null 2>&1 &")])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("launch_app: {e}"))
}

// ── Open Window ───────────────────────────────────────────────

#[derive(Serialize, Clone, Debug)]
pub struct OpenWindow {
    pub id: String,       // hex window ID, e.g. "0x05600001"
    pub title: String,
    pub desktop: i32,
}

/// List all open windows using wmctrl -l.
/// Returns an empty list if wmctrl is not installed.
#[command]
pub fn list_open_windows() -> Vec<OpenWindow> {
    let output = match std::process::Command::new("wmctrl").arg("-l").output() {
        Ok(o) => o,
        Err(_) => return vec![],
    };

    if !output.status.success() {
        return vec![];
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let hostname = std::env::var("HOSTNAME")
        .or_else(|_| std::fs::read_to_string("/etc/hostname").map(|s| s.trim().to_string()))
        .unwrap_or_default();

    stdout
        .lines()
        .filter_map(|line| {
            // Format: "0x05600001  0 hostname Window Title Here"
            let parts: Vec<&str> = line.splitn(4, char::is_whitespace)
                .filter(|s| !s.is_empty())
                .collect();
            if parts.len() < 4 {
                return None;
            }
            let id      = parts[0].to_string();
            let desktop = parts[1].parse::<i32>().unwrap_or(0);
            // parts[2] is the hostname — strip it, remainder is the title
            let title = line[line.find(parts[2]).unwrap_or(0)..]
                .trim_start_matches(parts[2])
                .trim()
                .to_string();

            // Filter out the desktop itself (desktop=-1) and the wmctrl window
            if desktop == -1 { return None; }

            // Strip hostname prefix if it appears (some WMs include it)
            let clean_title = title
                .strip_prefix(&hostname)
                .map(|s| s.trim())
                .unwrap_or(&title)
                .to_string();

            if clean_title.is_empty() { return None; }

            Some(OpenWindow { id, title: clean_title, desktop })
        })
        .collect()
}

/// Focus (raise and activate) a window by matching its title substring.
/// Requires wmctrl.
#[command]
pub fn focus_window(name: String) -> Result<(), String> {
    // wmctrl -a <name> matches on window title substring
    std::process::Command::new("wmctrl")
        .args(["-a", &name])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("focus_window: {e}. Is wmctrl installed?"))
}

/// Close a window gracefully by matching its title substring.
/// Requires wmctrl.
#[command]
pub fn close_window(name: String) -> Result<(), String> {
    std::process::Command::new("wmctrl")
        .args(["-c", &name])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("close_window: {e}. Is wmctrl installed?"))
}

/// Minimize a window by searching for its title with xdotool.
/// Requires xdotool.
#[command]
pub fn minimize_window(name: String) -> Result<(), String> {
    std::process::Command::new("sh")
        .args([
            "-c",
            &format!("xdotool search --name '{name}' windowminimize"),
        ])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("minimize_window: {e}. Is xdotool installed?"))
}

/// Focus the next window in the wmctrl window list (for cycling).
/// idx is which window in the list to focus (0-based).
#[command]
pub fn focus_window_by_index(idx: usize) -> Result<String, String> {
    let windows = list_open_windows();
    if windows.is_empty() {
        return Err("No open windows found.".to_string());
    }
    let window = &windows[idx % windows.len()];
    std::process::Command::new("wmctrl")
        .args(["-i", "-a", &window.id])
        .spawn()
        .map(|_| window.title.clone())
        .map_err(|e| format!("focus_window_by_index: {e}"))
}
