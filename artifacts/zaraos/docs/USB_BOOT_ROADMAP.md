# ZaraOS — Live USB Boot Roadmap

This document tracks everything required to go from the current state
(React web app running in Replit) to a bootable Linux USB image with
ZaraOS as the primary desktop environment.

Each phase has a clear **gate** — the hard requirement that must pass
before the next phase starts. Do not skip gates.

---

## Current State Snapshot

| Area                  | Status                                                       |
|-----------------------|--------------------------------------------------------------|
| UI / UX               | Complete — 10 panels, full dark OS shell                     |
| AI inference          | Live — Ollama + 7 cloud providers wired                      |
| Gesture recognition   | Live — MediaPipe HandLandmarker in-browser                   |
| Voice input           | Live — Web Speech API                                        |
| Tauri IPC layer       | Scaffolded — TypeScript + Rust stubs written, not compiled   |
| System stats          | Mocked — hardcoded constants in `home.tsx`                   |
| File browser          | Placeholder — no real FS access                              |
| App launcher          | Placeholder — tiles exist, nothing actually launches         |
| System controls       | Missing — no shutdown, restart, volume, brightness, WiFi     |
| Boot / ISO            | Not started                                                  |

---

## Phase 1 — Native Binary (Gate: compiled binary runs fullscreen)

**Blocked on a local Linux machine with Rust installed.**
Nothing else in this roadmap is possible until the binary builds.

### 1.1 — Build environment setup

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Linux system deps (Ubuntu/Debian)
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev \
  build-essential curl wget libssl-dev \
  libxdo-dev libsoup-3.0-dev

# Tauri CLI
cargo install tauri-cli --version "^2"

# Node / pnpm
pnpm install
```

### 1.2 — First build

```bash
cd artifacts/zaraos
cargo tauri build
# Binary at: src-tauri/target/release/zaraos
# Installer at: src-tauri/target/release/bundle/
```

### 1.3 — Verify fullscreen frameless window

`tauri.conf.json` already sets `decorations: false` and `transparent: true`.
Confirm the window fills the screen with no browser chrome.

### Gate 1 criteria
- [ ] `cargo tauri build` exits 0
- [ ] Binary launches and ZaraOS UI is visible
- [ ] Window is fullscreen, no title bar, no browser chrome

---

## Phase 2 — Real System Data (Gate: dashboard shows live hardware stats)

Currently `SYSTEM_STATS` in `home.tsx` is a hardcoded array. Every number
is fake. This phase replaces that with real data from the Rust backend.

### 2.1 — Add `sysinfo` crate to `Cargo.toml`

```toml
[dependencies]
sysinfo = "0.30"
```

### 2.2 — Add `system_stats` Rust command

New file: `src-tauri/src/commands/system.rs`

```rust
use sysinfo::{System, Disks, Networks};
use serde::Serialize;
use tauri::command;

#[derive(Serialize)]
pub struct SystemStats {
    pub cpu_usage_percent: f32,
    pub ram_used_gb: f64,
    pub ram_total_gb: f64,
    pub swap_used_gb: f64,
    pub network_rx_kbps: f64,
    pub network_tx_kbps: f64,
    pub disk_used_gb: f64,
    pub disk_total_gb: f64,
    pub uptime_seconds: u64,
}

#[command]
pub fn get_system_stats() -> SystemStats {
    let mut sys = System::new_all();
    sys.refresh_all();
    // ... (poll sysinfo fields)
}
```

### 2.3 — Wire to `home.tsx`

Replace the `SYSTEM_STATS` constant with a `useEffect` that calls
`tauriInvoke("get_system_stats")` every 2 seconds when inside Tauri.
Keep the hardcoded values as the browser fallback.

### 2.4 — Add process list for Activity Monitor

New Rust command: `get_top_processes()` — top 10 by CPU.
Wire to a new expandable section in the Dashboard Activity feed.

### Gate 2 criteria
- [ ] CPU%, RAM GB, network KB/s on Dashboard reflect real hardware values
- [ ] Stats update live every ~2 seconds
- [ ] Browser build still works with mock fallback

---

## Phase 3 — Real File System (Gate: Files panel browses real directories)

### 3.1 — Wire Files panel to `fsListDir()`

The Tauri IPC for this is already scaffolded (`tauri-fs.ts`). The Files
panel just needs to call it instead of returning a placeholder.

- Default root: `$HOME`
- Breadcrumb navigation
- Show file size, modified date (already in `DirEntry` struct)
- Icons by file type (text, image, video, folder)

### 3.2 — File preview

- Text files: render in a read-only code panel via `fsReadText()`
- Images: pass the file path as a Tauri asset URL (use `convertFileSrc()`)
- PDF: open in a WebView panel

### 3.3 — Zara file commands

Wire voice/gesture/text commands into the Files panel:
- "Open Documents" → `fsListDir($HOME/Documents)`
- "Show recent files" → parse inode change times from `fs_list_dir`
- "Read [filename]" → `fsReadText()` + display in assistant

### Gate 3 criteria
- [ ] Files panel shows real home directory contents
- [ ] Can navigate into subdirectories
- [ ] Can open and read a plain text file
- [ ] Zara understands "open my files"

---

## Phase 4 — App Launcher (Gate: can open Firefox, a terminal, and a file manager)

### 4.1 — Discover installed apps

Rust command: `list_installed_apps()` — scans `/usr/share/applications/*.desktop`
and returns `{ name, exec, icon, categories }` for each entry.

### 4.2 — Wire App Launcher tiles to real `shell_exec()`

The Tauri shell plugin is already configured. Add an IPC command that
calls `xdg-open` or the app's `Exec` line from its `.desktop` file.

Required apps to be installed in the ISO:
- **Firefox** — web browser (fallback for any web content)
- **Alacritty** or **foot** — lightweight GPU terminal
- **Thunar** or **Nautilus** — file manager (backup to ZaraOS Files panel)
- **Ollama** — local AI (see Phase 6)

### 4.3 — Zara app voice commands

- "Open terminal" → `shell_exec("alacritty")`
- "Open browser" → `shell_exec("firefox")`
- "Launch [app name]" → fuzzy-match against installed apps list

### Gate 4 criteria
- [ ] App Launcher shows actual installed applications
- [ ] Clicking a tile launches the real app
- [ ] Terminal, browser, and file manager all open correctly
- [ ] Zara voice command "open terminal" works

---

## Phase 5 — System Controls (Gate: can shut down, restart, and control volume)

This is what separates "an app that runs on Linux" from "an OS."

### 5.1 — Power management

New Rust command: `system_power(action: "shutdown" | "reboot" | "suspend" | "lock")`.
Calls `systemctl poweroff`, `systemctl reboot`, `systemctl suspend`, or
`loginctl lock-session`.

Wire to:
- Sidebar power button (new icon in Layout)
- Zara voice command: "shut down", "restart", "sleep"
- Privacy Panel lock button

### 5.2 — Volume control

Rust command: `set_volume(percent: u8)` / `get_volume()` via `pactl` (PulseAudio)
or `wpctl` (PipeWire). Wire to:
- Volume slider in Settings → System tab
- Gesture: TWO_FINGERS_UP / DOWN mapped to volume up/down
- Zara command: "volume up", "set volume to 50%"

### 5.3 — Screen brightness

Rust command: `set_brightness(percent: u8)` via `brightnessctl`.
Wire to Settings and Zara voice commands.

### 5.4 — WiFi management

Rust command: `list_wifi_networks()` and `connect_wifi(ssid, password)` via `nmcli`.
New Settings tab: "Network" — shows available networks, connection status.
Required for headless USB boot (users need to get online for cloud AI).

### 5.5 — Screen lock / privacy mode

Lock screen using `loginctl lock-session`. When locked, ZaraOS shows its own
lock screen overlay (Privacy Panel full-screen mode) before unlocking via
password or biometric.

### Gate 5 criteria
- [ ] Power button in sidebar shuts down / restarts cleanly
- [ ] Volume control works with keyboard and voice
- [ ] WiFi connection screen works (can join a network from ZaraOS)
- [ ] Screen locks and shows ZaraOS lock overlay

---

## Phase 6 — Local AI on the Machine (Gate: Zara gives real responses without internet)

### 6.1 — Install Ollama in the ISO

Add to ISO build script:
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:3b    # ~2 GB — fast, low-RAM
ollama pull nomic-embed-text  # for embeddings / memory
```

### 6.2 — Auto-start Ollama as a system service

`/etc/systemd/system/ollama.service` — starts on boot before ZaraOS launches.
Set `OLLAMA_ORIGINS=*` in the service environment so ZaraOS WebView can reach it.

### 6.3 — First-run AI setup

On first boot, ZaraOS detects Ollama running and auto-selects it.
If no model is pulled yet, show a one-time setup screen with model size options:
- Lightweight (3B, ~2 GB) — works on 4 GB RAM
- Balanced (7B, ~4.5 GB) — works on 8 GB RAM
- Full (13B, ~8 GB) — recommended for 16 GB+

### 6.4 — Model manager in Ollama Manager panel

Wire the existing Ollama Model Manager UI to real `ollama list` and `ollama pull`
commands via `shell_exec()`.

### Gate 6 criteria
- [ ] On boot, Ollama is running and ZaraOS connects automatically
- [ ] Zara responds with real AI inference, no internet required
- [ ] Model manager shows and can pull models
- [ ] System prompts are tuned for the local model's context window

---

## Phase 7 — ISO Build (Gate: bootable ISO file created)

### 7.1 — Choose the base

**Recommended: Ubuntu 24.04 minimal (no desktop environment)**

```bash
# Install Cubic (Custom Ubuntu ISO Creator)
sudo apt-add-repository ppa:cubic-wizard/release
sudo apt-get install cubic
```

### 7.2 — ISO configuration checklist

Inside Cubic's chroot environment:

```bash
# Runtime deps for Tauri / WebKitGTK
apt-get install -y \
  libwebkit2gtk-4.1-0 libgtk-3-0 \
  libayatana-appindicator3-1 \
  xorg openbox lightdm lightdm-gtk-greeter \
  pipewire wireplumber \
  network-manager \
  brightnessctl \
  alacritty firefox

# Copy the ZaraOS binary and .desktop file
cp zaraos /usr/local/bin/
cp zaraos.desktop /usr/share/applications/
cp zaraos.desktop /etc/xdg/autostart/

# Ollama
curl -fsSL https://ollama.com/install.sh | sh
# Pre-pull a model (adds ~2 GB to ISO)
ollama pull llama3.2:3b

# Create zaraos user with auto-login
useradd -m -s /bin/bash zaraos
passwd -d zaraos  # passwordless login for live USB

# Configure LightDM auto-login
echo "[SeatDefaults]
autologin-user=zaraos
autologin-user-timeout=0
user-session=openbox" >> /etc/lightdm/lightdm.conf

# Openbox autostart — launches ZaraOS on login
mkdir -p /home/zaraos/.config/openbox
echo "zaraos &" > /home/zaraos/.config/openbox/autostart
```

### 7.3 — Plymouth boot animation

```bash
apt-get install -y plymouth plymouth-themes
# Add ZaraOS branded theme (electric cyan/black)
cp -r zaraos-plymouth /usr/share/plymouth/themes/zaraos
plymouth-set-default-theme zaraos
update-initramfs -u
```

### 7.4 — USB persistence layer

When writing the ISO to USB with a tool like `Ventoy` or manual `dd + casper`:
```
# In /etc/casper.conf
export USERNAME=zaraos
export FLAVOUR=ZaraOS
```
Persistence overlay stores home directory and `/etc` changes across reboots.

### Gate 7 criteria
- [ ] `cubic` produces a valid `.iso` file
- [ ] ISO boots in a VM (QEMU or VirtualBox) — use this for iteration
- [ ] ZaraOS launches fullscreen after boot, no desktop visible underneath
- [ ] All Phase 1-6 features work inside the VM

---

## Phase 8 — USB Writing + Hardware Testing (Gate: boots on real hardware)

### 8.1 — Write to USB

```bash
# Recommended: Ventoy (supports multiple ISOs on one drive)
# Install Ventoy on a 32+ GB USB stick, copy the .iso file to it

# Or raw dd (simpler, single ISO):
sudo dd if=zaraos-alpha.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

### 8.2 — Hardware compatibility checklist

Test on at minimum:
- [ ] Intel CPU laptop (WiFi, touchpad, webcam for gesture)
- [ ] AMD CPU laptop
- [ ] NVIDIA GPU machine (check WebKitGTK + GPU acceleration)
- [ ] Machine with only 4 GB RAM (lightweight model test)

Known issues to check:
- **Secure Boot**: may need to sign the bootloader or disable Secure Boot in BIOS
- **WiFi drivers**: Broadcom and Realtek often need proprietary firmware packages
  (`apt-get install linux-firmware firmware-realtek firmware-iwlwifi`)
- **HiDPI screens**: set `GDK_SCALE=2` in the Openbox autostart for 4K displays
- **Webcam for gesture**: verify `v4l2-ctl --list-devices` shows the camera

### 8.3 — Minimum hardware requirements for the ISO

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | x86_64, 2 cores | 4+ cores |
| RAM | 4 GB | 8 GB+ |
| USB | 16 GB | 32 GB (with persistence) |
| GPU | Any with OpenGL 3.3 | Dedicated GPU for gesture at 30fps |
| Webcam | USB or built-in | 720p or better |
| Storage | USB only | SSD (for AI model speed) |

### Gate 8 criteria
- [ ] USB boots on at least 2 different physical machines
- [ ] Gesture recognition works with the built-in webcam
- [ ] Ollama starts and Zara responds without internet
- [ ] WiFi connects via ZaraOS network panel
- [ ] System shuts down cleanly from ZaraOS power button

---

## Summary: Critical Path

```
Phase 1 (native binary)
    └── Phase 2 (real system stats)
    └── Phase 3 (real file system)
    └── Phase 4 (app launcher)
    └── Phase 5 (system controls)       ← can run Phases 2-5 in parallel
    └── Phase 6 (local AI)
            └── Phase 7 (ISO build)
                    └── Phase 8 (USB + hardware test)
```

Phases 2 through 6 are independent once Phase 1 (the native binary) is
working and can be built simultaneously by different contributors.

---

## Rough Effort Estimate

| Phase | Effort | Blocks |
|-------|--------|--------|
| 1 — Native binary | 1-2 hours (setup) | Everything |
| 2 — System stats | 1 day | Dashboard accuracy |
| 3 — Real file system | 2 days | Files panel + Zara file commands |
| 4 — App launcher | 1-2 days | Launching real apps |
| 5 — System controls | 2-3 days | Feels like a real OS |
| 6 — Local AI | 1 day | Zara works offline |
| 7 — ISO build | 2-3 days | Bootable image |
| 8 — Hardware testing | Ongoing | Compatibility |

**Realistic timeline to first bootable USB test: 2-3 focused weeks** assuming
one developer working across all phases after the Rust build environment is set up.
