// ============================================================
// ZaraOS Tauri — Shell Command Handler
//
// Executes allowlisted shell commands via Tauri's shell plugin.
// Commands NOT in the allowlist defined in tauri.conf.json are
// rejected before reaching this handler.
//
// Security model:
//   - The tauri-plugin-shell allowlist defines which binaries
//     and argument patterns are permitted.
//   - stdout/stderr are returned to the caller as strings.
//   - Commands run with the user's system privileges — no privilege
//     escalation is performed.
//
// Usage from TypeScript:
//   await tauriInvoke("shell_exec", { program: "ollama", args: ["list"] });
// ============================================================

use serde::Serialize;
use std::process::Command;
use tauri::command;

#[derive(Debug, Serialize)]
pub struct ShellResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Execute an allowlisted program with the given arguments.
/// Returns stdout, stderr, and the exit code.
#[command]
pub fn shell_exec(program: String, args: Vec<String>) -> Result<ShellResult, String> {
    let output = Command::new(&program)
        .args(&args)
        .output()
        .map_err(|e| format!("shell_exec '{program}': {e}"))?;

    Ok(ShellResult {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}
