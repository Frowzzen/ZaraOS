// ============================================================
// ZaraOS — Disk Detection Commands
//
// Used by the ZaraOS installer to enumerate physical disks and
// present install target options to the user.
//
// Uses `lsblk` (standard on all Ubuntu/Debian systems) to get
// disk info in JSON format. Only returns whole disks (not
// partitions) to avoid confusing the user with partition noise.
// ============================================================

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;
use tauri::{Emitter, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiskInfo {
    pub name: String,       // e.g. "sda", "nvme0n1"
    pub path: String,       // e.g. "/dev/sda"
    pub size: String,       // Human-readable: "512G"
    pub size_bytes: u64,    // Raw bytes for comparisons
    pub model: String,      // e.g. "Samsung SSD 980"
    pub transport: String,  // "usb", "nvme", "sata", ""
    pub removable: bool,    // true for USB drives
    pub is_boot: bool,      // true if this disk contains the current boot partition
}

#[derive(Debug, Deserialize)]
struct LsblkOutput {
    blockdevices: Vec<LsblkDevice>,
}

#[derive(Debug, Deserialize)]
struct LsblkDevice {
    name: String,
    size: Option<String>,
    model: Option<String>,
    tran: Option<String>,
    rm: Option<bool>,        // removable
    #[serde(rename = "type")]
    device_type: Option<String>,
    // lsblk outputs size in bytes when using -b
    #[serde(rename = "size-raw")]
    size_raw: Option<serde_json::Value>,
}

/// Returns a list of physical disks suitable for OS installation.
/// Excludes partitions, loop devices, and ROM drives.
#[command]
pub fn list_disks() -> Result<Vec<DiskInfo>, String> {
    let output = Command::new("lsblk")
        .args([
            "-J",           // JSON output
            "-d",           // Disks only (no partitions)
            "-b",           // Size in bytes
            "-o",           // Output columns
            "NAME,SIZE,MODEL,TRAN,RM,TYPE",
        ])
        .output()
        .map_err(|e| format!("lsblk failed: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "lsblk exited with error: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let raw = String::from_utf8_lossy(&output.stdout);

    // Parse JSON — lsblk -b returns size as a string of bytes
    let parsed: serde_json::Value =
        serde_json::from_str(&raw).map_err(|e| format!("JSON parse error: {e}"))?;

    let devices = parsed["blockdevices"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    // Detect current boot disk (to warn user if they select it in wipe mode)
    let boot_disk = detect_boot_disk();

    let mut disks = Vec::new();

    for dev in devices {
        let device_type = dev["type"].as_str().unwrap_or("").to_string();

        // Only include disk types — skip loop, rom, etc.
        if device_type != "disk" {
            continue;
        }

        let name = dev["name"].as_str().unwrap_or("").to_string();
        if name.is_empty() {
            continue;
        }

        let path = format!("/dev/{name}");

        // Size comes back as a string in bytes from lsblk -b -J
        let size_bytes: u64 = dev["size"]
            .as_str()
            .and_then(|s| s.parse().ok())
            .or_else(|| dev["size"].as_u64())
            .unwrap_or(0);

        let size_human = human_size(size_bytes);
        let model = dev["model"]
            .as_str()
            .unwrap_or("Unknown")
            .trim()
            .to_string();
        let transport = dev["tran"].as_str().unwrap_or("").to_string();
        let removable = dev["rm"].as_bool().unwrap_or(false);
        let is_boot = boot_disk.as_deref() == Some(name.as_str());

        // Skip very small devices (< 4 GB) — not useful as install targets
        if size_bytes < 4_000_000_000 {
            continue;
        }

        disks.push(DiskInfo {
            name,
            path,
            size: size_human,
            size_bytes,
            model,
            transport,
            removable,
            is_boot,
        });
    }

    // Sort: NVMe first, then SATA, then USB
    disks.sort_by(|a, b| {
        transport_priority(&a.transport).cmp(&transport_priority(&b.transport))
    });

    Ok(disks)
}

fn transport_priority(tran: &str) -> u8 {
    match tran {
        "nvme" => 0,
        "sata" => 1,
        "usb"  => 2,
        _      => 3,
    }
}

fn human_size(bytes: u64) -> String {
    const GB: u64 = 1_000_000_000;
    const TB: u64 = 1_000_000_000_000;
    if bytes >= TB {
        format!("{:.1} TB", bytes as f64 / TB as f64)
    } else {
        format!("{} GB", bytes / GB)
    }
}

/// Best-effort detection of which disk holds the current boot partition.
/// Reads /proc/cmdline to find the root= device, then maps back to a disk name.
fn detect_boot_disk() -> Option<String> {
    let cmdline = std::fs::read_to_string("/proc/cmdline").ok()?;
    let root_part = cmdline
        .split_whitespace()
        .find(|s| s.starts_with("root="))?
        .trim_start_matches("root=");

    // e.g. /dev/sda1 → sda, /dev/nvme0n1p3 → nvme0n1
    let dev_name = root_part.trim_start_matches("/dev/");

    // Strip partition suffix: sda1 → sda, nvme0n1p3 → nvme0n1
    let disk_name = strip_partition_suffix(dev_name);
    Some(disk_name.to_string())
}

// ── Installer ─────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallConfig {
    pub target_disk: String,
    pub mode: String,           // "wipe" or "dualboot"
    pub dualboot_split_gb: Option<u32>,
    pub username: String,
    pub hostname: String,
}

/// Launches the bundled install.sh script with pkexec (privilege escalation).
/// Progress lines are written to stdout as JSON and forwarded via Tauri events.
/// The UI listens for "install-progress" events to update the progress ring.
#[command]
pub fn start_install(
    config: InstallConfig,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Resolve the bundled install.sh path
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Could not resolve resource dir: {e}"))?
        .join("resources/install.sh");

    if !resource_path.exists() {
        return Err(format!("install.sh not found at {:?}", resource_path));
    }

    // Make executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&resource_path)
            .map_err(|e| e.to_string())?
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&resource_path, perms).map_err(|e| e.to_string())?;
    }

    let script = resource_path.to_string_lossy().to_string();
    let app_clone = app.clone();

    // Spawn in a background thread — install takes 10-20 minutes
    std::thread::spawn(move || {
        let mut child = std::process::Command::new("pkexec")
            .arg(&script)
            .env("ZARAOS_TARGET_DISK",  &config.target_disk)
            .env("ZARAOS_INSTALL_MODE", &config.mode)
            .env("ZARAOS_SPLIT_GB",     config.dualboot_split_gb.unwrap_or(100).to_string())
            .env("ZARAOS_HOSTNAME",     &config.hostname)
            .env("ZARAOS_USERNAME",     &config.username)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .spawn()
            .expect("Failed to launch install.sh via pkexec");

        if let Some(stdout) = child.stdout.take() {
            use std::io::{BufRead, BufReader};
            for line in BufReader::new(stdout).lines().flatten() {
                // Each line is a JSON progress event from install.sh
                let _ = app_clone.emit("install-progress", &line);
            }
        }

        let _ = child.wait();
    });

    Ok(())
}

fn strip_partition_suffix(dev: &str) -> &str {
    // NVMe: nvme0n1p3 → nvme0n1 (strip trailing p + digits)
    if dev.contains("nvme") {
        if let Some(pos) = dev.rfind('p') {
            let suffix = &dev[pos + 1..];
            if suffix.chars().all(|c| c.is_ascii_digit()) {
                return &dev[..pos];
            }
        }
    }
    // SATA/USB: sda1 → sda (strip trailing digits)
    let trimmed = dev.trim_end_matches(|c: char| c.is_ascii_digit());
    if trimmed.len() < dev.len() {
        trimmed
    } else {
        dev
    }
}
