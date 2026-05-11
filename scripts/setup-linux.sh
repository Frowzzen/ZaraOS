#!/usr/bin/env bash
# ============================================================
# ZaraOS — Linux Development Environment Setup
#
# Run this on a fresh Ubuntu 24.04 install on the Dell laptop
# to install everything needed to build ZaraOS natively.
#
# Usage (one command after Ubuntu install):
#   curl -fsSL https://raw.githubusercontent.com/your-org/zaraos/main/scripts/setup-linux.sh | bash
#
# Or from a cloned repo:
#   bash scripts/setup-linux.sh
#
# Time: ~5-10 minutes on a fast connection
# ============================================================

set -euo pipefail

log()  { echo -e "\033[1;36m[ZaraOS Setup]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }

log "ZaraOS Linux Development Environment Setup"
log "Target: Ubuntu 24.04 LTS on Dell i7-8850H"
echo ""

# ── System packages ───────────────────────────────────────────
log "Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

log "Installing Tauri system dependencies..."
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  build-essential \
  curl \
  wget \
  git \
  pkg-config \
  file \
  libssl-dev \
  2>&1 | tail -3

log "Installing system utilities (volume + brightness control)..."
sudo apt-get install -y \
  brightnessctl \
  network-manager \
  pulseaudio \
  pipewire \
  pipewire-pulse \
  2>&1 | tail -3
ok "System packages installed."

# ── WiFi fix (Broadcom) ───────────────────────────────────────
if lspci 2>/dev/null | grep -qi broadcom; then
  log "Broadcom WiFi detected — installing driver..."
  sudo apt-get install -y broadcom-sta-dkms 2>&1 | tail -2
  sudo modprobe wl 2>/dev/null || warn "modprobe wl failed — may need a reboot"
  ok "Broadcom driver installed."
fi

# ── NVIDIA driver ─────────────────────────────────────────────
if lspci 2>/dev/null | grep -qi nvidia; then
  log "NVIDIA GPU detected — installing driver 535..."
  sudo apt-get install -y nvidia-driver-535 2>&1 | tail -2
  ok "NVIDIA driver installed. Reboot may be required."
fi

# ── Node.js 22 ────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node --version | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  log "Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>&1 | tail -3
  sudo apt-get install -y nodejs 2>&1 | tail -2
fi
ok "Node.js: $(node --version)"

# ── pnpm ──────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  log "Installing pnpm..."
  npm install -g pnpm 2>&1 | tail -2
fi
ok "pnpm: $(pnpm --version)"

# ── Rust ──────────────────────────────────────────────────────
if ! command -v rustup &>/dev/null; then
  log "Installing Rust (rustup)..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
fi

# Source cargo env for this session
source "$HOME/.cargo/env" 2>/dev/null || true

log "Updating Rust to stable..."
rustup update stable 2>&1 | tail -2
ok "Rust: $(rustc --version)"

# ── Tauri CLI ─────────────────────────────────────────────────
if ! command -v cargo-tauri &>/dev/null; then
  log "Installing Tauri CLI (cargo install — takes ~5 min first time)..."
  cargo install tauri-cli --version "^2" 2>&1 | tail -3
fi
ok "Tauri CLI: $(cargo tauri --version)"

# ── Ollama ────────────────────────────────────────────────────
if ! command -v ollama &>/dev/null; then
  log "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh 2>&1 | tail -3
fi
ok "Ollama: $(ollama --version 2>/dev/null || echo 'installed')"

# ── Shell env setup ───────────────────────────────────────────
PROFILE="$HOME/.bashrc"
if [[ -f "$HOME/.zshrc" ]]; then
  PROFILE="$HOME/.zshrc"
fi

if ! grep -q 'cargo/env' "$PROFILE" 2>/dev/null; then
  echo "" >> "$PROFILE"
  echo '# Rust' >> "$PROFILE"
  echo 'source "$HOME/.cargo/env"' >> "$PROFILE"
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
log "All done! Development environment is ready."
echo ""
echo "  Next steps:"
echo ""
echo "  1. Clone or transfer the ZaraOS repo:"
echo "     git clone https://github.com/your-org/zaraos.git"
echo ""
echo "  2. Install JS dependencies:"
echo "     cd zaraos && pnpm install"
echo ""
echo "  3. Build the native binary:"
echo "     cd artifacts/zaraos && cargo tauri build"
echo ""
echo "  4. Binary output:"
echo "     artifacts/zaraos/src-tauri/target/release/zaraos"
echo ""
echo "  5. Build bootable ISO:"
echo "     sudo bash scripts/build-iso.sh"
echo ""
warn "If NVIDIA driver was installed, reboot first: sudo reboot"
