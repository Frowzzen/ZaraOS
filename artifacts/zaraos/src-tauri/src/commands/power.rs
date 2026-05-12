// ============================================================
// ZaraOS Tauri — Power, Volume & Brightness Commands
//
// System-level controls exposed to the TypeScript frontend.
//
// Power: delegates to systemctl / loginctl.
// Volume: uses pactl (PulseAudio / PipeWire compatibility layer).
// Brightness: uses brightnessctl.
//
// All commands are non-blocking from the UI perspective — they return
// immediately and the OS handles the state transition.
// ============================================================

use std::process::Command;
use tauri::command;

// ── App Exit ──────────────────────────────────────────────────

/// Quit the ZaraOS process immediately.
/// Used during development so "Shut Down" kills the app instead of the whole PC.
#[command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

// ── Power Management ──────────────────────────────────────────

/// Execute a system power action.
/// Valid actions: "shutdown" | "reboot" | "suspend" | "lock"
#[command]
pub fn system_power(action: String) -> Result<(), String> {
    let result = match action.as_str() {
        "shutdown" => Command::new("systemctl").arg("poweroff").output(),
        "reboot"   => Command::new("systemctl").arg("reboot").output(),
        "suspend"  => Command::new("systemctl").arg("suspend").output(),
        "lock"     => Command::new("loginctl").arg("lock-session").output(),
        other      => return Err(format!("Unknown power action: {other}")),
    };
    result
        .map(|_| ())
        .map_err(|e| format!("system_power '{action}': {e}"))
}

// ── Volume Control (PulseAudio / PipeWire) ────────────────────

/// Get the current default sink volume as a 0-100 percent value.
#[command]
pub fn get_volume() -> Result<u8, String> {
    let out = Command::new("pactl")
        .args(["get-sink-volume", "@DEFAULT_SINK@"])
        .output()
        .map_err(|e| format!("pactl get-sink-volume: {e}"))?;

    let stdout = String::from_utf8_lossy(&out.stdout);
    // Example output: "Volume: front-left: 65536 / 100% / 0.00 dB, ..."
    // We grab the first percentage value.
    let pct = stdout
        .split('%')
        .next()
        .and_then(|s| s.split_whitespace().last())
        .and_then(|s| s.parse::<u8>().ok())
        .unwrap_or(50);
    Ok(pct)
}

/// Set the default sink volume. Clamps to 0-100%.
#[command]
pub fn set_volume(percent: u8) -> Result<(), String> {
    let pct = percent.min(100);
    Command::new("pactl")
        .args(["set-sink-volume", "@DEFAULT_SINK@", &format!("{pct}%")])
        .output()
        .map(|_| ())
        .map_err(|e| format!("pactl set-sink-volume: {e}"))
}

/// Toggle mute on the default sink.
#[command]
pub fn toggle_mute() -> Result<(), String> {
    Command::new("pactl")
        .args(["set-sink-mute", "@DEFAULT_SINK@", "toggle"])
        .output()
        .map(|_| ())
        .map_err(|e| format!("pactl toggle mute: {e}"))
}

// ── Screen Brightness ─────────────────────────────────────────

/// Get the current screen brightness as a 0-100 percent value.
#[command]
pub fn get_brightness() -> Result<u8, String> {
    let current_out = Command::new("brightnessctl")
        .arg("get")
        .output()
        .map_err(|e| format!("brightnessctl get: {e}"))?;

    let max_out = Command::new("brightnessctl")
        .arg("max")
        .output()
        .map_err(|e| format!("brightnessctl max: {e}"))?;

    let current: u64 = String::from_utf8_lossy(&current_out.stdout)
        .trim()
        .parse()
        .unwrap_or(0);
    let max: u64 = String::from_utf8_lossy(&max_out.stdout)
        .trim()
        .parse()
        .unwrap_or(100);

    if max == 0 {
        return Ok(100);
    }
    Ok(((current * 100 / max) as u8).min(100))
}

/// Set screen brightness. Clamps to 5-100% (prevents blackout at 0).
#[command]
pub fn set_brightness(percent: u8) -> Result<(), String> {
    let pct = percent.clamp(5, 100);
    Command::new("brightnessctl")
        .args(["set", &format!("{pct}%")])
        .output()
        .map(|_| ())
        .map_err(|e| format!("brightnessctl set: {e}"))
}
