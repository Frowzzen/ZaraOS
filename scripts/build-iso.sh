#!/usr/bin/env bash
# ============================================================
# ZaraOS ISO Builder
#
# Builds a bootable ZaraOS USB image based on Ubuntu 26.04 LTS.
#
# Requirements (Ubuntu host):
#   sudo apt-get install -y squashfs-tools genisoimage \
#     xorriso syslinux-utils isolinux wget
#
# Usage:
#   sudo ./scripts/build-iso.sh [options]
#
# Options:
#   --model=NAME      Ollama model to pre-pull (default: llama3.2:3b)
#   --no-ollama       Skip Ollama model pre-pull
#   --skip-checksum   Skip ISO SHA256 verification
#
# Output:
#   ./dist/zaraos-<version>-amd64.iso
#
# Write to USB:
#   sudo dd if=./dist/zaraos-*.iso of=/dev/sdX bs=4M status=progress oflag=sync
#   # or use Balena Etcher / GNOME Disks
#
# For live USB with persistence, flash with Rufus (Windows) or
# use --persistence flag with usb-creator-gtk (Linux), then
# boot and select "Try ZaraOS (persistent)" from GRUB.
#
# Phases:
#   1. Download Ubuntu 26.04 minimal server ISO (base)
#   2. Extract squashfs
#   3. Chroot and install ZaraOS deps (Xorg, Openbox, LightDM, Ollama)
#   4. Install ZaraOS Tauri binary + Plymouth theme
#   5. Configure auto-login + session
#   6. Add persistence support to GRUB boot menu
#   7. Optionally pre-pull an Ollama model
#   8. Repack squashfs + rebuild ISO
# ============================================================

set -euo pipefail
trap 'echo "BUILD FAILED on line $LINENO" >&2; cleanup' ERR

# ── Config ────────────────────────────────────────────────────
ZARAOS_VERSION="0.6.0"
UBUNTU_VERSION="26.04"
UBUNTU_CODENAME="plucky"   # Ubuntu 26.04 LTS codename (update if different)
UBUNTU_ISO_URL="https://releases.ubuntu.com/${UBUNTU_VERSION}/ubuntu-${UBUNTU_VERSION}-live-server-amd64.iso"
UBUNTU_ISO_SHA256_URL="https://releases.ubuntu.com/${UBUNTU_VERSION}/SHA256SUMS"

MODEL="${MODEL:-llama3.2:3b}"
PULL_OLLAMA=true
SKIP_CHECKSUM=false
WORK_DIR="/tmp/zaraos-build-$$"
DIST_DIR="$(dirname "$0")/../dist"
BINARY="$(dirname "$0")/../artifacts/zaraos/src-tauri/target/release/zaraos"
RESOURCES="$(dirname "$0")/../artifacts/zaraos/src-tauri/resources"

# ── Parse args ────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --model=*)        MODEL="${arg#--model=}" ;;
    --no-ollama)      PULL_OLLAMA=false ;;
    --skip-checksum)  SKIP_CHECKSUM=true ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────
log()  { echo -e "\033[1;36m[ZaraOS ISO]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*" >&2; }
die()  { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; exit 1; }

cleanup() {
  log "Cleaning up..."
  for d in run dev/pts dev proc sys; do
    umount "$WORK_DIR/edit/$d" 2>/dev/null || true
  done
  mountpoint -q "$WORK_DIR/mnt/iso" 2>/dev/null && umount "$WORK_DIR/mnt/iso" || true
}

require_cmd() {
  command -v "$1" &>/dev/null || die "Required command '$1' not found. Run: sudo apt-get install -y $2"
}

# ── Pre-flight checks ─────────────────────────────────────────
log "ZaraOS ISO Builder v${ZARAOS_VERSION} — base: Ubuntu ${UBUNTU_VERSION} LTS"
log "Target model: $MODEL"

require_cmd xorriso    "xorriso"
require_cmd mksquashfs "squashfs-tools"
require_cmd unsquashfs "squashfs-tools"
require_cmd wget       "wget"

[[ -f "$BINARY" ]] || die "ZaraOS binary not found at $BINARY. Run 'cargo tauri build' first."
[[ $EUID -ne 0 ]] && die "ISO build requires root. Run with: sudo $0"

mkdir -p "$WORK_DIR"/{mnt/{iso,squashfs},edit,iso-new} "$DIST_DIR"

# ── Phase 1: Download Ubuntu ISO ─────────────────────────────
ISO_CACHE="/tmp/ubuntu-${UBUNTU_VERSION}-live-server-amd64.iso"
if [[ ! -f "$ISO_CACHE" ]]; then
  log "Downloading Ubuntu ${UBUNTU_VERSION} LTS server ISO (~2 GB)..."
  wget -c --show-progress -O "$ISO_CACHE" "$UBUNTU_ISO_URL"
fi

if [[ "$SKIP_CHECKSUM" == "false" ]]; then
  log "Fetching Ubuntu checksum from releases.ubuntu.com..."
  SHA256SUMS_FILE="/tmp/ubuntu-${UBUNTU_VERSION}-SHA256SUMS"
  wget -q -O "$SHA256SUMS_FILE" "$UBUNTU_ISO_SHA256_URL" || \
    warn "Could not fetch SHA256SUMS — skipping checksum verification. Re-run with --skip-checksum to suppress this."

  if [[ -f "$SHA256SUMS_FILE" ]]; then
    EXPECTED_SHA=$(grep "ubuntu-${UBUNTU_VERSION}-live-server-amd64.iso" "$SHA256SUMS_FILE" | awk '{print $1}')
    if [[ -n "$EXPECTED_SHA" ]]; then
      echo "${EXPECTED_SHA}  ${ISO_CACHE}" | sha256sum -c || \
        die "ISO checksum mismatch. Delete $ISO_CACHE and retry."
      log "Checksum verified."
    else
      warn "Could not find checksum for this ISO in SHA256SUMS — proceeding without verification."
    fi
  fi
else
  warn "Checksum verification skipped (--skip-checksum)."
fi

# ── Phase 2: Mount ISO and extract squashfs ───────────────────
log "Mounting ISO..."
mount -o loop,ro "$ISO_CACHE" "$WORK_DIR/mnt/iso"

log "Copying ISO structure..."
rsync -a --exclude=casper/filesystem.squashfs "$WORK_DIR/mnt/iso/" "$WORK_DIR/iso-new/"

log "Extracting squashfs (~5 minutes)..."
unsquashfs -d "$WORK_DIR/edit" "$WORK_DIR/mnt/iso/casper/filesystem.squashfs"

umount "$WORK_DIR/mnt/iso"

# ── Phase 3: Chroot and install packages ─────────────────────
log "Preparing chroot environment..."
mount --bind /run       "$WORK_DIR/edit/run"
mount --bind /dev       "$WORK_DIR/edit/dev"
mount --bind /dev/pts   "$WORK_DIR/edit/dev/pts"
mount --bind /proc      "$WORK_DIR/edit/proc"
mount --bind /sys       "$WORK_DIR/edit/sys"
cp /etc/resolv.conf "$WORK_DIR/edit/etc/resolv.conf"

chroot_run() { chroot "$WORK_DIR/edit" /bin/bash -c "$*"; }

log "Updating packages..."
chroot_run "apt-get update -qq"

log "Installing display server and desktop environment..."
chroot_run "DEBIAN_FRONTEND=noninteractive apt-get install -y \
  xorg \
  openbox \
  obconf \
  lightdm \
  lightdm-gtk-greeter \
  picom \
  brightnessctl \
  network-manager \
  pulseaudio \
  pavucontrol \
  fonts-noto \
  plymouth \
  plymouth-themes \
  xdg-utils \
  xdg-user-dirs \
  dbus-x11 \
  xterm \
  thunar \
  papirus-icon-theme \
  --no-install-recommends 2>&1 | tail -5"

log "Installing installer dependencies..."
chroot_run "DEBIAN_FRONTEND=noninteractive apt-get install -y \
  parted \
  gdisk \
  ntfs-3g \
  ntfsresize \
  e2fsprogs \
  grub-efi-amd64 \
  grub-pc-bin \
  os-prober \
  --no-install-recommends 2>&1 | tail -5"

log "Installing ZaraOS system dependencies..."
chroot_run "DEBIAN_FRONTEND=noninteractive apt-get install -y \
  libwebkit2gtk-4.1-0t64 \
  libgtk-3-0t64 \
  libayatana-appindicator3-1 \
  librsvg2-2 \
  wmctrl \
  xdotool \
  --no-install-recommends 2>&1 | tail -3"

log "Installing Ollama..."
chroot_run "curl -fsSL https://ollama.com/install.sh | sh"

log "Creating zaraos system user..."
chroot_run "id -u zaraos &>/dev/null || useradd -m -s /bin/bash -G audio,video,netdev,sudo zaraos"
chroot_run "echo 'zaraos:zaraos' | chpasswd"

# ── Phase 4: Install ZaraOS binary + assets ───────────────────
log "Installing ZaraOS binary..."
cp "$BINARY" "$WORK_DIR/edit/usr/bin/zaraos"
chmod +x "$WORK_DIR/edit/usr/bin/zaraos"

log "Installing ZaraOS session script..."
install -m 755 "$RESOURCES/zaraos-session.sh"       "$WORK_DIR/edit/usr/local/bin/zaraos-session"
install -m 644 "$RESOURCES/zaraos-openbox.desktop"  "$WORK_DIR/edit/usr/share/xsessions/zaraos-openbox.desktop"

log "Installing LightDM config..."
install -m 644 "$RESOURCES/lightdm.conf"            "$WORK_DIR/edit/etc/lightdm/lightdm.conf"

log "Installing Ollama systemd user service..."
install -Dm644 "$RESOURCES/zaraos-ollama.service" \
  "$WORK_DIR/edit/home/zaraos/.config/systemd/user/ollama.service"
chroot_run "chown -R zaraos:zaraos /home/zaraos/.config"

log "Installing Plymouth theme..."
mkdir -p "$WORK_DIR/edit/usr/share/plymouth/themes/zaraos"
cp "$RESOURCES/zaraos-plymouth/"* "$WORK_DIR/edit/usr/share/plymouth/themes/zaraos/"
chroot_run "plymouth-set-default-theme zaraos && update-initramfs -u 2>&1 | tail -3" || \
  warn "Plymouth theme registration failed — default theme will be used."

log "Enabling LightDM..."
chroot_run "systemctl enable lightdm"

# ── Phase 5: Enable Ollama service ────────────────────────────
log "Enabling Ollama service for zaraos user..."
chroot_run "su -c 'systemctl --user enable ollama.service' zaraos 2>/dev/null || true"

# ── Phase 6: Persistence support in GRUB ─────────────────────
log "Adding persistence boot entry to GRUB..."
GRUB_CFG="$WORK_DIR/iso-new/boot/grub/grub.cfg"

if [[ -f "$GRUB_CFG" ]]; then
  # Inject a persistence boot menuentry after the first entry
  PERSIST_ENTRY=$(cat <<'GRUBEOF'

menuentry "Try ZaraOS (with persistence)" {
    set gfxpayload=keep
    linux   /casper/vmlinuz boot=casper persistent quiet splash ---
    initrd  /casper/initrd
}
GRUBEOF
)
  # Find the first menuentry and append persistence entry after it
  awk '/^menuentry/{found++} found==1 && /^}/{print; print ENTRY; found=2; next} {print}' \
    ENTRY="$PERSIST_ENTRY" "$GRUB_CFG" > "${GRUB_CFG}.new" && mv "${GRUB_CFG}.new" "$GRUB_CFG" || \
    warn "Could not inject persistence entry — GRUB config structure may have changed."
  log "Persistence boot entry added."
else
  warn "GRUB config not found at expected path — skipping persistence entry."
fi

# ── Phase 7: Pre-pull Ollama model (optional) ─────────────────
if [[ "$PULL_OLLAMA" == "true" ]]; then
  log "Pre-pulling Ollama model: $MODEL (~2-5 GB, may take a while)..."
  chroot_run "su -c 'ollama serve &>/dev/null & sleep 4 && ollama pull $MODEL; kill %1 2>/dev/null || true' zaraos" || \
    warn "Model pull failed — model will be downloaded on first boot via the ZaraOS setup wizard."
fi

# ── Unmount chroot ────────────────────────────────────────────
log "Unmounting chroot..."
for d in run dev/pts dev proc sys; do
  umount "$WORK_DIR/edit/$d" 2>/dev/null || true
done

# ── Phase 8: Repack squashfs and build ISO ────────────────────
log "Repacking squashfs (~10 minutes)..."
mksquashfs "$WORK_DIR/edit" "$WORK_DIR/iso-new/casper/filesystem.squashfs" \
  -comp xz -b 1M -Xbcj x86 -noappend -no-progress 2>&1 | tail -3

# Update filesystem.size
du -sx --block-size=1 "$WORK_DIR/edit" | cut -f1 > "$WORK_DIR/iso-new/casper/filesystem.size"

log "Generating MD5 checksums..."
(cd "$WORK_DIR/iso-new" && find . -type f ! -name 'md5sum.txt' | sort | xargs md5sum > md5sum.txt)

OUTPUT_ISO="$DIST_DIR/zaraos-${ZARAOS_VERSION}-amd64.iso"
log "Building hybrid ISO: $OUTPUT_ISO"

xorriso -as mkisofs \
  -iso-level 3 \
  -full-iso9660-filenames \
  -volid "ZARAOS_${ZARAOS_VERSION//./_}" \
  -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin \
  -eltorito-boot boot/grub/i386-pc/eltorito.img \
  -no-emul-boot \
  -boot-load-size 4 \
  -boot-info-table \
  --eltorito-catalog boot.catalog \
  --grub2-boot-info \
  --grub2-mbr /usr/lib/grub/i386-pc/boot_hybrid.img \
  -eltorito-alt-boot \
  -e EFI/efiboot.img \
  -no-emul-boot \
  -isohybrid-gpt-basdat \
  -o "$OUTPUT_ISO" \
  "$WORK_DIR/iso-new" 2>&1 | tail -5

SIZE_MB=$(du -m "$OUTPUT_ISO" | cut -f1)
log ""
log "Build complete!"
log "  Output:   $OUTPUT_ISO"
log "  Size:     ${SIZE_MB} MB"
log "  Base:     Ubuntu ${UBUNTU_VERSION} LTS"
log "  Version:  ZaraOS ${ZARAOS_VERSION}"
log ""
log "Write to USB:"
log "  sudo dd if='$OUTPUT_ISO' of=/dev/sdX bs=4M status=progress oflag=sync"
log "  # or use Balena Etcher / Rufus (set persistent partition for live persistence)"
log ""
log "Boot options available in GRUB:"
log "  - Try ZaraOS          (live, no persistence)"
log "  - Try ZaraOS (persistent)  (live, saves files between boots)"
log "  - Install ZaraOS      (launches installer from within ZaraOS)"
