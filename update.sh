#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Pulling latest from GitHub..."
git pull origin main

echo "Installing dependencies..."
pnpm install

echo "Done. Starting ZaraOS in dev mode..."
cargo tauri dev
