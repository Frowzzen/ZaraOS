# ZaraOS — Linux ISO Packaging Preparation

This document outlines the future path from the current React web app to a fully bootable
ZaraOS USB Linux OS. It is honest about what exists now versus what must be built later.

**Current state:** ZaraOS is a React + TypeScript frontend — the software layer for the OS.  
**Future state:** A bootable Ubuntu/KDE-based Linux ISO with ZaraOS as the default desktop shell.

---

## Honest Status Assessment

| Layer | Status |
|---|---|
| ZaraOS React app (frontend shell) | BUILT — Alpha 0.2 |
| ZaraOS skill and plugin architecture | BUILT — Alpha 0.2 |
| AI engine integration (Ollama / Whisper.cpp) | NOT YET — stubs in place |
| Tauri native desktop wrapper | NOT YET — planned Alpha 0.4 |
| Linux system commands (real exec) | NOT YET — mocked |
| File system access (real) | NOT YET — mocked |
| Bootable ISO | NOT YET — planned Beta |
| USB boot testing | NOT YET — planned Beta |

---

## Full Path: Web App → Bootable USB OS

### Step 1: Export ZaraOS to GitHub

```bash
git clone https://github.com/<your-username>/zaraos.git
cd zaraos
pnpm install
pnpm --filter @workspace/zaraos run dev
```

See `GITHUB_EXPORT_GUIDE.md` for full instructions.

---

### Step 2: Run on a Linux Development Machine

**Recommended:** Ubuntu 22.04 LTS or Ubuntu 24.04 LTS with KDE Plasma desktop.

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Clone and run
git clone https://github.com/<your-username>/zaraos.git
cd zaraos
pnpm install
pnpm --filter @workspace/zaraos run dev
```

At this stage ZaraOS runs as a browser-based app — no system integration yet.

---

### Step 3: Build the Production App

```bash
pnpm --filter @workspace/zaraos run build
# Output: artifacts/zaraos/dist/
```

The `dist/` folder is a standard Vite static build:
- `index.html` — entry point
- `assets/` — JS, CSS, fonts
- Can be served by any static file server or embedded in a Tauri app

---

### Step 4: Convert to Tauri Desktop App

Tauri provides native OS access (file system, notifications, audio, system commands)
while keeping the React frontend unchanged.

#### Prerequisites
```bash
# Install Rust (required for Tauri)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Tauri CLI
cargo install tauri-cli

# System dependencies (Ubuntu)
sudo apt install -y \
  libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev
```

#### Initialize Tauri
```bash
cd artifacts/zaraos
cargo tauri init
```

Configure `src-tauri/tauri.conf.json`:
```json
{
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "ZaraOS",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "fullscreen": false,
        "decorations": false
      }
    ]
  }
}
```

#### Run as native app
```bash
cargo tauri dev
```

#### Replace mocked engines with Tauri commands
In `src-tauri/src/lib.rs`:
```rust
#[tauri::command]
fn execute_system_command(cmd: &str) -> String {
    // Allowlist-verified command execution
    // ZaraOS enforces its own permission layer before calling this
}
```

Replace `systemDispatch()` stubs in `zara-runtime.ts` with `invoke('execute_system_command', ...)`.

---

### Step 5: Wire Real Engines (AI, Voice, Gesture)

#### Local AI (Ollama)
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3
```

Update `ai-engine.ts` to call `http://localhost:11434/api/generate`.

#### Voice (Whisper.cpp)
```bash
git clone https://github.com/ggml-org/whisper.cpp
cd whisper.cpp && make
./main -m models/ggml-base.bin -f audio.wav
```

Wire into `voice-engine.ts` via Tauri command for microphone capture + transcription.

#### Gesture (MediaPipe Hands)
Wire into `gesture-engine.ts` — MediaPipe runs entirely in the browser (no cloud).

---

### Step 6: Package as a Linux Application

#### Tauri build (produces .deb, .AppImage, .rpm)
```bash
cargo tauri build
# Output: src-tauri/target/release/bundle/
```

Outputs:
- `zaraos_x.y.z_amd64.deb` — Debian/Ubuntu package
- `zaraos_x.y.z_amd64.AppImage` — portable Linux binary
- `zaraos_x.y.z_amd64.rpm` — Red Hat/Fedora package

---

### Step 7: Install Into a Custom Ubuntu/KDE ISO

**Tool: [Cubic](https://github.com/PJ-Singh-001/Cubic)**

Cubic is a custom Ubuntu ISO creator with a GUI.

```bash
# Install Cubic
sudo apt-add-repository ppa:cubic-wizard/release
sudo apt install cubic
```

#### ISO customization steps

1. Open Cubic → select an Ubuntu 24.04 LTS ISO as the base
2. Cubic boots a virtual chroot environment
3. Inside the chroot:

```bash
# Install ZaraOS .deb
dpkg -i /path/to/zaraos_x.y.z_amd64.deb

# Set ZaraOS as default session (KDE + Wayland)
mkdir -p /usr/share/wayland-sessions/
cat > /usr/share/wayland-sessions/zaraos.desktop << EOF
[Desktop Entry]
Name=ZaraOS
Exec=/usr/bin/zaraos
Type=Application
EOF

# Install Ollama for local AI
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3

# Optional: pre-pull Whisper model
# whisper.cpp install steps here
```

4. Customize branding:
   - Boot splash: replace Plymouth theme (`/usr/share/plymouth/themes/`)
   - Login screen: configure SDDM (KDE login manager)
   - Wallpaper: copy to `/usr/share/wallpapers/zaraos/`
   - Icons: copy to `/usr/share/icons/zaraos/`
   - App name in GRUB: edit `/etc/default/grub`

5. Exit Cubic chroot → Generate ISO

---

### Step 8: Flash ISO to USB

```bash
# On Linux (replace /dev/sdX with your USB drive)
sudo dd if=zaraos-alpha.iso of=/dev/sdX bs=4M status=progress oflag=sync

# Or use balenaEtcher (GUI, cross-platform)
# https://etcher.balena.io
```

---

### Step 9: Boot Testing

#### Target hardware (initial)
- x86_64 PCs (standard AMD/Intel laptops and desktops)
- Minimum: 4 GB RAM, 8 GB USB drive
- Recommended: 8 GB RAM, 16 GB USB drive for Ollama models

#### Test targets
- UEFI boot (modern machines)
- Legacy BIOS boot (older machines)
- Secure Boot (may need signing — advanced)

#### Virtual machine testing first
```bash
# Test in QEMU before real hardware
qemu-system-x86_64 \
  -cdrom zaraos-alpha.iso \
  -m 4G \
  -enable-kvm \
  -vga virtio
```

---

## Architecture: What ZaraOS Is vs. What Linux Provides

```
┌─────────────────────────────────────┐
│  ZaraOS UI Layer                    │  ← We build this (React + Vite)
│  (Panels, Assistant, Console, etc.) │
├─────────────────────────────────────┤
│  ZaraOS Runtime Layer               │  ← We build this (TypeScript)
│  (Commands, Skills, Permissions)    │
├─────────────────────────────────────┤
│  Tauri Native Bridge                │  ← We configure this (Rust)
│  (File I/O, IPC, System calls)      │
├─────────────────────────────────────┤
│  KDE Plasma / Wayland               │  ← Linux provides this
│  (Window manager, display server)   │
├─────────────────────────────────────┤
│  Ubuntu Linux Kernel                │  ← Linux provides this
│  (Hardware drivers, networking)     │
├─────────────────────────────────────┤
│  x86_64 Hardware                    │  ← User's machine
└─────────────────────────────────────┘
```

ZaraOS does not replace the kernel. Linux handles hardware support underneath.
ZaraOS is the application layer — the AI-native user experience on top of Linux.

---

## Timeline (Estimated)

| Milestone | Description | When |
|---|---|---|
| Alpha 0.1 | React shell, all panels, runtime architecture | DONE |
| Alpha 0.2 | Input modes, skills system, gesture mapper | DONE |
| Alpha 0.3 | Ollama AI integration, real voice input | Next |
| Alpha 0.4 | Tauri wrapper, native file access | After 0.3 |
| Beta 0.5 | Real skill execution (search, calendar, files) | After 0.4 |
| Beta 0.8 | Custom ISO, boot testing | After 0.5 |
| v1.0 | Stable USB bootable OS | TBD |

---

## Resources

- Tauri: https://tauri.app
- Ollama: https://ollama.ai
- Whisper.cpp: https://github.com/ggml-org/whisper.cpp
- MediaPipe: https://ai.google.dev/edge/mediapipe/solutions/guide
- Cubic (ISO creator): https://github.com/PJ-Singh-001/Cubic
- balenaEtcher (USB flash): https://etcher.balena.io
- QEMU (VM testing): https://www.qemu.org
