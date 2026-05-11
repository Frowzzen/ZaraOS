// ============================================================
// ZaraOS Tauri — Network Management Commands
//
// WiFi discovery and connection management via NetworkManager (nmcli).
// NetworkManager is the standard network management daemon on Ubuntu/Debian
// and is included in the ZaraOS ISO by default.
//
// Commands:
//   list_wifi_networks  — scan and return available networks
//   connect_wifi        — connect to an SSID with a password
//   disconnect_wifi     — disconnect current WiFi connection
//   get_network_status  — returns overall connectivity state
// ============================================================

use serde::Serialize;
use std::process::Command;
use tauri::command;

#[derive(Serialize, Clone)]
pub struct WifiNetwork {
    pub ssid: String,
    pub signal: i32,      // Signal strength 0-100 (nmcli SIGNAL field)
    pub connected: bool,
    pub security: String, // "WPA2", "WPA3", "--" for open, etc.
    pub bssid: String,
}

/// List available WiFi networks using nmcli.
/// Triggers a rescan before listing for fresh results.
#[command]
pub fn list_wifi_networks() -> Result<Vec<WifiNetwork>, String> {
    // Trigger rescan (best effort — may require elevated perms on some distros)
    let _ = Command::new("nmcli")
        .args(["device", "wifi", "rescan"])
        .output();

    let out = Command::new("nmcli")
        .args([
            "-t",
            "-f", "SSID,BSSID,SIGNAL,ACTIVE,SECURITY",
            "device", "wifi", "list",
        ])
        .output()
        .map_err(|e| format!("nmcli list: {e}"))?;

    let stdout = String::from_utf8_lossy(&out.stdout);

    let mut networks: Vec<WifiNetwork> = stdout
        .lines()
        .filter_map(|line| {
            // nmcli -t separates fields with ':' but escapes literal ':'
            // Fields: SSID:BSSID:SIGNAL:ACTIVE:SECURITY
            let parts: Vec<&str> = line.splitn(5, ':').collect();
            if parts.len() < 4 {
                return None;
            }
            let ssid = parts[0].trim().replace("\\:", ":");
            if ssid.is_empty() {
                return None;
            }
            Some(WifiNetwork {
                ssid,
                bssid: parts.get(1).unwrap_or(&"").to_string(),
                signal: parts[2].parse().unwrap_or(0),
                connected: parts[3] == "yes",
                security: parts
                    .get(4)
                    .map(|s| s.trim().to_string())
                    .unwrap_or_else(|| "--".to_string()),
            })
        })
        .collect();

    // Deduplicate by SSID, keeping the strongest signal entry
    networks.sort_by(|a, b| b.signal.cmp(&a.signal));
    networks.dedup_by(|a, b| a.ssid == b.ssid);

    Ok(networks)
}

/// Connect to a WiFi network by SSID and password.
/// For open networks, pass an empty password string.
#[command]
pub fn connect_wifi(ssid: String, password: String) -> Result<(), String> {
    let status = if password.is_empty() {
        Command::new("nmcli")
            .args(["device", "wifi", "connect", &ssid])
            .status()
    } else {
        Command::new("nmcli")
            .args(["device", "wifi", "connect", &ssid, "password", &password])
            .status()
    }
    .map_err(|e| format!("nmcli connect: {e}"))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "Could not connect to '{ssid}'. Check the password and try again."
        ))
    }
}

/// Disconnect the current WiFi connection.
#[command]
pub fn disconnect_wifi() -> Result<(), String> {
    Command::new("nmcli")
        .args(["device", "disconnect", "wifi"])
        .status()
        .map(|_| ())
        .map_err(|e| format!("nmcli disconnect: {e}"))
}

/// Returns the overall NetworkManager connectivity state.
/// Possible values: "full", "limited", "portal", "none", "unknown"
#[command]
pub fn get_network_status() -> Result<String, String> {
    let out = Command::new("nmcli")
        .args(["-t", "-f", "CONNECTIVITY", "general", "status"])
        .output()
        .map_err(|e| format!("nmcli status: {e}"))?;

    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}
