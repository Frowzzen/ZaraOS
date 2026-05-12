#!/usr/bin/env bash
# ============================================================
# ZaraOS Session Startup Script
#
# Install to: /usr/local/bin/zaraos-session
# chmod +x /usr/local/bin/zaraos-session
#
# Executed by LightDM as the zaraos-openbox X session.
# Order of operations:
#   1. Start Openbox (WM only, no panel/dock)
#   2. Start compositor (picom) for transparency + blur
#   3. Set wallpaper to pure black (ZaraOS is fullscreen)
#   4. Start Ollama user service
#   5. Launch ZaraOS Tauri binary fullscreen
# ============================================================

set -euo pipefail

# ── 1. Openbox (background, no dock) ─────────────────────────
openbox --startup /dev/null &
OPENBOX_PID=$!

# Brief pause for Openbox to initialise the WM
sleep 0.5

# ── 2. Compositor (picom for transparency effects) ────────────
if command -v picom &>/dev/null; then
  picom --experimental-backends --backend glx --vsync &
fi

# ── 3. Black wallpaper (ZaraOS is fullscreen, this is just a safety net) ──
xsetroot -solid "#000000"

# ── 4. Ensure Ollama user service is running ─────────────────
# OLLAMA_ORIGINS=* allows the Tauri WebView to connect to Ollama
export OLLAMA_ORIGINS="*"
systemctl --user enable --now ollama.service 2>/dev/null || \
  OLLAMA_ORIGINS="*" /usr/local/bin/ollama serve &

# ── 5. Launch ZaraOS Tauri binary ────────────────────────────
# The binary is installed by the .deb package to /usr/bin/zaraos
exec /usr/bin/zaraos
