// ============================================================
// ZaraOS Tauri — Shell Command Handler
//
// Executes allowlisted shell commands via Tauri's shell plugin.
//
// Security model:
//   - stdout/stderr are returned to the caller as strings.
//   - Commands run with the user's system privileges.
//   - Uses tokio::process::Command (async) so long-running
//     commands (e.g. whisper transcription) never block the
//     WebKit rendering thread.
//
// Usage from TypeScript:
//   await tauriInvoke("shell_exec", { program: "python3", args: ["-c", "..."] });
// ============================================================

use serde::Serialize;
use tauri::command;
use tokio::process::Command;

#[derive(Debug, Serialize)]
pub struct ShellResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Execute a program with the given arguments.
/// Returns stdout, stderr, and the exit code.
/// Uses tokio async so the WebKit thread is never blocked.
#[command]
pub async fn shell_exec(program: String, args: Vec<String>) -> Result<ShellResult, String> {
    let output = Command::new(&program)
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("shell_exec '{program}': {e}"))?;

    Ok(ShellResult {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}
