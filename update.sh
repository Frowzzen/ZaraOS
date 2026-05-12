#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "[1/4] Pulling latest from GitHub..."
git pull origin main

echo "[2/4] Clearing cached build files..."
rm -rf artifacts/zaraos/dist

echo "[3/4] Installing dependencies..."
pnpm install

echo "[4/4] Starting ZaraOS (dev mode - always uses latest files)..."
cd artifacts/zaraos
cargo tauri dev
