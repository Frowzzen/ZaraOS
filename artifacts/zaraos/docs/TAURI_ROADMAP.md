# ZaraOS — Tauri Desktop Packaging Roadmap

## Why Tauri

ZaraOS Alpha 0.1 runs as a web app in the browser. This is appropriate for prototyping, but the end goal is a native desktop application that can:

1. Run without a browser
2. Access the local file system
3. Execute allowlisted Linux commands
4. Store sensitive data in a native keychain
5. Start on boot as the primary desktop environment
6. Be packaged into a custom Linux ISO

Tauri is the right choice because:

- **Rust backend** — small binary, fast startup, memory-safe system access
- **WebView frontend** — the entire ZaraOS React UI works without changes
- **Cross-platform** — Linux, Windows, macOS from one codebase
- **Small binary** — ~10MB installer vs. Electron's ~80MB
- **Native APIs** — file system, shell, notifications, system tray, global shortcuts

---

## What Will Not Change

The entire `artifacts/zaraos/src/` directory — every React component, page, and core module — will work identically inside Tauri's WebView. No changes are required to the UI layer, the Zara Runtime, or the AI Engine abstraction.

The only code that changes is the **System Layer** — currently mocked functions in `zara-runtime.ts` like `launchApp()` will call `tauri.invoke()` instead of returning mocked responses.

---

## Migration Steps

### Step 1 — Install Tauri CLI (Tauri v2)

```bash
# Requires Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
pnpm add -D @tauri-apps/cli @tauri-apps/api
pnpm tauri init
```

This generates `src-tauri/` alongside the existing `artifacts/zaraos/src/`.

### Step 2 — Configure Tauri Build

Update `tauri.conf.json`:

```json
{
  "build": {
    "beforeBuildCommand": "pnpm run build",
    "beforeDevCommand": "pnpm run dev",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{ "title": "ZaraOS", "fullscreen": true }]
  }
}
```

### Step 3 — Wire Up System Layer

Replace mocked system calls with Tauri invoke calls in `zara-runtime.ts`:

```typescript
// Before (mocked):
launchApp(appId: string) {
  return { response: `Launching ${appId}...`, action: "navigate" };
}

// After (Tauri):
import { invoke } from "@tauri-apps/api/core";
async launchApp(appId: string) {
  await invoke("launch_app", { appId });
}
```

### Step 4 — Add Tauri Plugins

```bash
pnpm tauri add fs          # File system access
pnpm tauri add shell       # Allowlisted command execution
pnpm tauri add notification # System notifications
pnpm tauri add global-shortcut # "Hey Zara" hotkey
pnpm tauri add keychain    # Secure API key storage
```

### Step 5 — Rust Command Allowlist

In `src-tauri/src/main.rs`, define an allowlist for shell commands. Only commands in this list can be executed:

```rust
#[tauri::command]
fn execute_safe_command(cmd: &str) -> Result<String, String> {
    let allowlist = ["ls", "pwd", "df", "systemctl status"];
    if !allowlist.contains(&cmd) {
        return Err("Command not in allowlist".into());
    }
    // Execute cmd and return output
}
```

---

## Security Considerations for Native Execution

When ZaraOS gains real system access via Tauri, new threat vectors open:

1. **Command injection** — All shell input must be sanitized and matched against the allowlist. No string interpolation into shell commands.
2. **File system scope** — Tauri FS plugin scope must be restricted to user home directory or ZaraOS data dir. Not `/` or system directories.
3. **Privilege escalation** — ZaraOS must never run as root. Use `pkexec` / `polkit` for operations that need elevation.
4. **Destructive confirmation** — Any command flagged `destructive: true` in the command router must show a native Tauri dialog before execution.
5. **Plugin sandboxing** — Third-party plugins must run in a separate WebView context with no access to the Tauri core APIs.

---

## Linux Package Strategy

### .deb (Debian/Ubuntu)

```bash
pnpm tauri build -- --target x86_64-unknown-linux-gnu
# Produces: target/release/bundle/deb/zaraos_0.1.0_amd64.deb
```

### .rpm (Fedora/RHEL)

```bash
# Requires cargo-rpm
pnpm tauri build -- --target x86_64-unknown-linux-gnu --bundles rpm
```

### AppImage (Universal Linux)

```bash
pnpm tauri build -- --bundles appimage
```

AppImage is the recommended distribution format for the USB boot image because it runs on any x86_64 Linux distribution without installation.

---

## ISO Strategy (Cubic)

After the Tauri AppImage is built:

1. Start with Ubuntu 24.04 LTS minimal ISO
2. Open Cubic, create a custom project
3. In the chroot environment: install required libs (`libwebkit2gtk`, `libssl`)
4. Copy ZaraOS AppImage to `/opt/zaraos/ZaraOS.AppImage`
5. Create an autostart entry: `/etc/xdg/autostart/zaraos.desktop`
6. Set GDM / LightDM to auto-login as `zaraos` user
7. Remove default desktop applications
8. Build the custom ISO
9. Flash to USB with Balena Etcher or `dd`

This approach works for x86_64 PCs. Apple Silicon and ARM devices require separate builds and different boot strategies (Asahi Linux for M-series Macs).

---

## Timeline

| Milestone         | Target Version |
|-------------------|----------------|
| Tauri scaffold    | Beta 0.1       |
| File system access| Beta 0.1       |
| Shell allowlist   | Beta 0.1       |
| Keychain storage  | Beta 0.3       |
| AppImage build    | Beta 0.2       |
| .deb package      | Beta 0.2       |
| Custom ISO        | v1.0           |
| USB boot testing  | v1.0           |
