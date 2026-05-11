# ZaraOS — Tauri Desktop Packaging Roadmap

## Why Tauri

ZaraOS runs as a web app in the browser (Replit / any browser). The end goal is a native
desktop application that can:

1. Run without a browser
2. Access the local file system
3. Execute allowlisted Linux commands
4. Store sensitive data in a native keychain (OS keyring / Stronghold)
5. Start on boot as the primary desktop environment
6. Be packaged into a custom Linux ISO

Tauri is the right choice because:

- **Rust backend** — small binary, fast startup, memory-safe system access
- **WebView frontend** — the entire ZaraOS React UI works without changes
- **Cross-platform** — Linux, Windows, macOS from one codebase
- **Small binary** — ~10 MB installer vs. Electron's ~80 MB
- **Native APIs** — file system, shell, notifications, system tray, global shortcuts

---

## Current Status

The Tauri IPC scaffold is **implemented**. The following are in place:

### TypeScript IPC Layer (`src/core/tauri/`)

| File                 | Purpose                                                         |
|----------------------|-----------------------------------------------------------------|
| `tauri-bridge.ts`    | `isTauriRuntime()` guard + `tauriInvoke()` wrapper              |
| `tauri-fs.ts`        | `fsReadText`, `fsWriteText`, `fsListDir`, `fsExists`            |
| `tauri-keychain.ts`  | `keychainGet/Set/Delete` — uses Stronghold in native, localStorage in browser |

### Rust Backend (`src-tauri/`)

| File                              | Purpose                                    |
|-----------------------------------|--------------------------------------------|
| `Cargo.toml`                      | Rust workspace with tauri, fs, shell deps  |
| `tauri.conf.json`                 | Window config, CSP, FS/shell allowlists    |
| `src/main.rs`                     | Tauri builder, plugin registration          |
| `src/commands/fs.rs`              | `fs_read_text`, `fs_write_text`, `fs_list_dir`, `fs_exists` |
| `src/commands/shell.rs`           | `shell_exec` with allowlisted programs     |
| `src/commands/kv.rs`              | `kv_get`, `kv_set`, `kv_delete` (encrypted JSON, Stronghold planned) |

The `isTauriRuntime()` guard means all IPC calls are no-ops in browser mode — the app
continues to work in Replit/browser with localStorage fallbacks.

---

## Building the Native App (Local Machine Required)

Replit cannot compile native binaries. Do this on your local Linux/macOS machine:

### Prerequisites

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 2. Install Linux system libs (Ubuntu/Debian)
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# 3. Install Tauri CLI
cargo install tauri-cli --version "^2"

# 4. Install Node deps (pnpm)
pnpm install
```

### Development

```bash
# From the workspace root
cargo tauri dev --config artifacts/zaraos/src-tauri/tauri.conf.json

# Or from the zaraos artifact directory
cd artifacts/zaraos
cargo tauri dev
```

### Production Build

```bash
# Creates installer in src-tauri/target/release/bundle/
cargo tauri build
```

---

## Phase Plan

### Phase 1 — Native Shell (Beta 0.1) ← Current

- [x] `src-tauri/` project scaffold
- [x] IPC bridge (TypeScript `invoke()` wrappers)
- [x] Rust FS commands (`fs_read_text`, `fs_write_text`, `fs_list_dir`)
- [x] Rust shell command handler (allowlisted programs)
- [x] Rust KV store (plaintext JSON; Stronghold upgrade pending)
- [x] Browser fallback for all IPC calls
- [ ] Build and test native binary on Linux
- [ ] Native system tray (Tauri tray-icon feature)
- [ ] Single-instance lock (prevent multiple ZaraOS windows)
- [ ] Auto-launch on login

### Phase 2 — Stronghold + File Browser (Beta 0.1.1)

- [ ] Replace KV JSON file with tauri-plugin-stronghold
- [ ] Wire Files panel to `fsListDir()` / `fsReadText()`
- [ ] File preview (text, images) via Tauri IPC
- [ ] Drag-and-drop from OS to ZaraOS Files panel

### Phase 3 — Linux Packaging (Beta 0.2)

- [ ] `.deb` package (Ubuntu/Debian)
- [ ] `.rpm` package (Fedora/RHEL)
- [ ] `.AppImage` (universal Linux)
- [ ] Code signing (optional, for distribution)
- [ ] Auto-updater (tauri-plugin-updater)

### Phase 4 — Linux ISO (v1.0)

- [ ] Cubic-based custom Ubuntu ISO
- [ ] Tauri binary pre-installed in ISO
- [ ] ZaraOS set as default session in display manager
- [ ] Plymouth boot animation (ZaraOS branded)
- [ ] USB persistence layer
- [ ] x86_64 (Intel/AMD) + ARM64 (Raspberry Pi 5) builds

---

## What Will Not Change

The entire `artifacts/zaraos/src/` directory — every React component, page, and core
module — works identically inside Tauri's WebView. No changes are required to the UI layer,
the Zara Runtime, or the AI Engine abstraction.

The only additions are:
1. **`src/core/tauri/`** — IPC wrappers that swap out at runtime based on `isTauriRuntime()`
2. **`src-tauri/`** — the Rust backend that handles native OS calls

---

## CSP for Tauri

The `tauri.conf.json` CSP allows:

- `https://cdn.jsdelivr.net` — MediaPipe WASM bundle
- `https://storage.googleapis.com` — MediaPipe hand model
- `https://api.openai.com`, `https://api.anthropic.com`, etc. — cloud AI providers
- `http://localhost:11434` — Ollama local AI
- `http://localhost:8080` — llama.cpp REST server
- `mediastream:` — camera access for MediaPipe gesture recognition
