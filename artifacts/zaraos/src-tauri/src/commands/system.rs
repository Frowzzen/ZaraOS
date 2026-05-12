// ============================================================
// ZaraOS Tauri — System Stats Command
//
// Exposes real-time hardware telemetry to the TypeScript frontend
// via the Tauri IPC bridge. Uses the `sysinfo` crate to read
// CPU, RAM, swap, disk, network, and process data from the kernel.
//
// Called every 2 seconds by home.tsx to update the Dashboard.
// Falls back to mock values in the browser build (isTauriRuntime guard).
// ============================================================

use serde::Serialize;
use sysinfo::{Disks, Networks, System};
use tauri::command;
use std::time::Duration;

#[derive(Serialize, Clone)]
pub struct SystemStats {
    pub cpu_usage_percent: f32,
    pub ram_used_gb: f64,
    pub ram_total_gb: f64,
    pub ram_used_percent: f32,
    pub swap_used_gb: f64,
    pub swap_total_gb: f64,
    pub disk_used_gb: f64,
    pub disk_total_gb: f64,
    pub disk_free_gb: f64,
    pub network_rx_kbps: f64,
    pub network_tx_kbps: f64,
    pub uptime_seconds: u64,
    pub cpu_brand: String,
    pub cpu_cores: usize,
}

#[derive(Serialize, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f32,
    pub ram_mb: f64,
}

#[command]
pub fn get_system_stats() -> SystemStats {
    let mut sys = System::new_all();
    // Brief pause between measurements so CPU delta is meaningful
    std::thread::sleep(Duration::from_millis(120));
    sys.refresh_all();

    // Average per-core usage — works across all sysinfo 0.30.x versions
    let cpu_usage = {
        let cpus = sys.cpus();
        if cpus.is_empty() { 0.0_f32 }
        else { cpus.iter().map(|c| c.cpu_usage()).sum::<f32>() / cpus.len() as f32 }
    };

    let ram_used  = sys.used_memory()  as f64 / 1_073_741_824.0;
    let ram_total = sys.total_memory() as f64 / 1_073_741_824.0;
    let ram_pct   = if ram_total > 0.0 { (ram_used / ram_total * 100.0) as f32 } else { 0.0 };

    let swap_used  = sys.used_swap()  as f64 / 1_073_741_824.0;
    let swap_total = sys.total_swap() as f64 / 1_073_741_824.0;

    // Root filesystem stats
    let disks = Disks::new_with_refreshed_list();
    let (disk_used, disk_total) = disks
        .iter()
        .find(|d| d.mount_point() == std::path::Path::new("/"))
        .map(|d| {
            let total = d.total_space()     as f64 / 1_073_741_824.0;
            let avail = d.available_space() as f64 / 1_073_741_824.0;
            (total - avail, total)
        })
        .unwrap_or((0.0, 0.0));
    let disk_free = disk_total - disk_used;

    // Network: sum all non-loopback interfaces
    let networks = Networks::new_with_refreshed_list();
    let (rx_bytes, tx_bytes) = networks
        .iter()
        .filter(|(name, _)| !name.starts_with("lo"))
        .map(|(_, data)| (data.received(), data.transmitted()))
        .fold((0u64, 0u64), |(ar, at), (r, t)| (ar + r, at + t));

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown CPU".to_string());
    let cpu_cores = sys.cpus().len();

    fn round1(v: f64) -> f64 { (v * 10.0).round() / 10.0 }

    SystemStats {
        cpu_usage_percent: (cpu_usage * 10.0).round() / 10.0,
        ram_used_gb:  round1(ram_used),
        ram_total_gb: round1(ram_total),
        ram_used_percent: (ram_pct * 10.0).round() / 10.0,
        swap_used_gb:  round1(swap_used),
        swap_total_gb: round1(swap_total),
        disk_used_gb:  round1(disk_used),
        disk_total_gb: round1(disk_total),
        disk_free_gb:  round1(disk_free),
        network_rx_kbps: rx_bytes as f64 / 1024.0,
        network_tx_kbps: tx_bytes as f64 / 1024.0,
        uptime_seconds: System::uptime(),
        cpu_brand,
        cpu_cores,
    }
}

#[command]
pub fn get_top_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut procs: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .map(|(pid, p)| ProcessInfo {
            pid: pid.as_u32(),
            name: p.name().to_string(),
            cpu_percent: (p.cpu_usage() * 10.0).round() / 10.0,
            ram_mb: (p.memory() as f64 / 1_048_576.0 * 10.0).round() / 10.0,
        })
        .collect();

    procs.sort_by(|a, b| {
        b.cpu_percent
            .partial_cmp(&a.cpu_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    procs.truncate(12);
    procs
}
