#!/usr/bin/env bash
# ============================================================
# ZaraOS Installer Script
#
# Called by the ZaraOS installer UI (Tauri shell plugin) after
# the user confirms their install configuration.
#
# Arguments (JSON on stdin or as env vars set by Tauri):
#   ZARAOS_TARGET_DISK   — e.g. /dev/nvme0n1
#   ZARAOS_INSTALL_MODE  — "wipe" or "dualboot"
#   ZARAOS_SPLIT_GB      — GB for ZaraOS (dualboot only)
#   ZARAOS_HOSTNAME      — hostname to set
#   ZARAOS_USERNAME      — primary user to create
#
# Progress is reported by writing JSON lines to stdout:
#   {"phase":"Partitioning drive...","percent":15}
#
# Exit codes:
#   0 = success
#   1 = user error (bad args, disk busy, etc.)
#   2 = system error (parted failed, rsync failed, etc.)
#
# Requirements (installed by build-iso.sh in the live ISO):
#   parted, gdisk, mkfs.ext4, rsync, grub-install, os-prober,
#   ntfsresize (Windows dual boot), e2fsck + resize2fs (Linux dual boot)
# ============================================================

set -euo pipefail

# ── Helpers ───────────────────────────────────────────────────
progress() {
  local phase="$1" percent="$2"
  echo "{\"phase\":\"${phase}\",\"percent\":${percent}}"
}

die() {
  echo "{\"error\":\"$*\",\"percent\":-1}"
  exit 2
}

user_error() {
  echo "{\"error\":\"$*\",\"percent\":-1}"
  exit 1
}

log() { echo "{\"log\":\"$*\",\"percent\":-1}"; }

# ── Validate inputs ───────────────────────────────────────────
DISK="${ZARAOS_TARGET_DISK:-}"
MODE="${ZARAOS_INSTALL_MODE:-}"
SPLIT_GB="${ZARAOS_SPLIT_GB:-100}"
HOSTNAME="${ZARAOS_HOSTNAME:-zaraos}"
USERNAME="${ZARAOS_USERNAME:-zaraos}"

[[ -z "$DISK" ]] && user_error "No target disk specified."
[[ -z "$MODE" ]] && user_error "No install mode specified."
[[ "$MODE" != "wipe" && "$MODE" != "dualboot" ]] && user_error "Invalid mode: $MODE"
[[ ! -b "$DISK" ]] && user_error "Disk not found: $DISK"
[[ $EUID -ne 0 ]] && die "Installer requires root privileges."

# Safety: refuse to install on the currently mounted root
CURRENT_ROOT=$(findmnt -n -o SOURCE / | sed 's/[0-9]*$//' | sed 's/p[0-9]*$//')
if [[ "$CURRENT_ROOT" == "$DISK" ]]; then
  user_error "Cannot install to the disk that is currently running the OS ($DISK)."
fi

MOUNT_POINT="/mnt/zaraos-install"
mkdir -p "$MOUNT_POINT"

# Determine partition naming convention
# NVMe: /dev/nvme0n1 → /dev/nvme0n1p1, /dev/nvme0n1p2
# SATA: /dev/sda    → /dev/sda1, /dev/sda2
if [[ "$DISK" =~ nvme ]]; then
  PART_PREFIX="${DISK}p"
else
  PART_PREFIX="${DISK}"
fi

# ── Phase 1: Detect existing OS (for dual boot) ───────────────
DETECTED_OS="unknown"
if [[ "$MODE" == "dualboot" ]]; then
  progress "Detecting existing operating system..." 5

  # Check partitions for NTFS (Windows) or ext4 (Linux)
  while IFS= read -r part; do
    FSTYPE=$(blkid -o value -s TYPE "$part" 2>/dev/null || true)
    case "$FSTYPE" in
      ntfs)
        DETECTED_OS="windows"
        WINDOWS_PART="$part"
        log "Detected Windows NTFS on $part"
        break
        ;;
      ext4|btrfs|xfs)
        DETECTED_OS="linux"
        LINUX_PART="$part"
        log "Detected Linux on $part ($FSTYPE)"
        break
        ;;
    esac
  done < <(lsblk -ln -o PATH "$DISK" | tail -n +2)
fi

# ── Phase 2: Partition the disk ───────────────────────────────
progress "Verifying disk layout..." 10

DISK_SIZE_BYTES=$(blockdev --getsize64 "$DISK")
DISK_SIZE_GB=$(( DISK_SIZE_BYTES / 1000000000 ))

if [[ "$MODE" == "wipe" ]]; then
  progress "Partitioning drive (full install)..." 15

  # Wipe and repartition:
  # Partition 1: EFI  512 MiB  FAT32
  # Partition 2: swap 4 GiB    swap
  # Partition 3: root remainder ext4
  parted -s "$DISK" mklabel gpt
  parted -s "$DISK" mkpart "EFI"  fat32  1MiB  513MiB
  parted -s "$DISK" set 1 esp on
  parted -s "$DISK" mkpart "swap" linux-swap 513MiB 4609MiB
  parted -s "$DISK" mkpart "ZaraOS" ext4 4609MiB 100%

  EFI_PART="${PART_PREFIX}1"
  SWAP_PART="${PART_PREFIX}2"
  ROOT_PART="${PART_PREFIX}3"

  progress "Formatting partitions..." 22
  mkfs.fat -F32 -n "EFI" "$EFI_PART"
  mkswap -L "zaraos-swap" "$SWAP_PART"
  mkfs.ext4 -L "ZaraOS" -F "$ROOT_PART"

elif [[ "$MODE" == "dualboot" ]]; then
  progress "Preparing dual boot partition layout..." 15

  ZARAOS_GB=$(( SPLIT_GB < 40 ? 40 : SPLIT_GB ))

  if [[ "$DETECTED_OS" == "windows" ]]; then
    # ── Windows dual boot ─────────────────────────────────────
    # Shrink the Windows NTFS partition to make room
    progress "Checking Windows partition integrity..." 18

    # Find the NTFS partition
    NTFS_PART="${WINDOWS_PART:-}"
    [[ -z "$NTFS_PART" ]] && die "Could not locate Windows NTFS partition on $DISK."

    # Ensure it's not mounted
    umount "$NTFS_PART" 2>/dev/null || true

    NTFS_SIZE_BYTES=$(blockdev --getsize64 "$NTFS_PART")
    NTFS_SIZE_GB=$(( NTFS_SIZE_BYTES / 1000000000 ))
    REMAINING_GB=$(( NTFS_SIZE_GB - ZARAOS_GB ))

    [[ $REMAINING_GB -lt 40 ]] && user_error "Not enough space to shrink Windows partition. Need at least $ZARAOS_GB GB free."

    NEW_NTFS_BYTES=$(( REMAINING_GB * 1000000000 ))

    progress "Shrinking Windows partition (ntfsresize)..." 22
    ntfsresize -n --size "${NEW_NTFS_BYTES}" "$NTFS_PART" || \
      die "ntfsresize check failed — ensure Windows is fully shut down (not hibernate)."
    ntfsresize --size "${NEW_NTFS_BYTES}" "$NTFS_PART" || \
      die "ntfsresize failed. Boot Windows once and run chkdsk, then retry."

    progress "Creating ZaraOS partition..." 28
    # Use the freed space for ZaraOS root
    # Find end of NTFS partition and add ZaraOS partition after it
    NTFS_END_MB=$(parted -s "$DISK" unit MB print | grep "$(basename "$NTFS_PART")" | awk '{print $3}' | tr -d 'MB')
    DISK_END_MB=$(parted -s "$DISK" unit MB print | grep "^Disk" | awk '{print $3}' | tr -d 'MB')

    parted -s "$DISK" mkpart "ZaraOS" ext4 "${NTFS_END_MB}MB" "${DISK_END_MB}MB"

    # The new partition is the last one
    ROOT_PART=$(lsblk -ln -o PATH "$DISK" | tail -1)
    mkfs.ext4 -L "ZaraOS" -F "$ROOT_PART"

    # Find or create EFI partition (Windows should already have one)
    EFI_PART=$(lsblk -ln -o PATH,PARTTYPE "$DISK" | grep -i "c12a7328-f81f-11d2-ba4b-00a0c93ec93b" | awk '{print $1}' | head -1)
    [[ -z "$EFI_PART" ]] && die "Could not locate EFI system partition on $DISK."

  elif [[ "$DETECTED_OS" == "linux" ]]; then
    # ── Linux/Ubuntu dual boot ────────────────────────────────
    LINUX_PART="${LINUX_PART:-}"
    [[ -z "$LINUX_PART" ]] && die "Could not locate Linux partition on $DISK."

    umount "$LINUX_PART" 2>/dev/null || true

    LINUX_SIZE_BYTES=$(blockdev --getsize64 "$LINUX_PART")
    LINUX_SIZE_GB=$(( LINUX_SIZE_BYTES / 1000000000 ))
    REMAINING_GB=$(( LINUX_SIZE_GB - ZARAOS_GB ))
    [[ $REMAINING_GB -lt 20 ]] && user_error "Not enough space to shrink Linux partition."

    progress "Checking Linux filesystem integrity..." 18
    e2fsck -f -y "$LINUX_PART" || true

    NEW_LINUX_BYTES=$(( REMAINING_GB * 1000000000 ))
    NEW_LINUX_BLOCKS=$(( NEW_LINUX_BYTES / 4096 ))

    progress "Shrinking Linux partition (resize2fs)..." 22
    resize2fs "$LINUX_PART" "${NEW_LINUX_BLOCKS}" || die "resize2fs failed."

    progress "Shrinking partition table entry..." 26
    NEW_END_MB=$(( REMAINING_GB * 1000 ))
    parted -s "$DISK" resizepart "$(lsblk -ln -o NAME,PATH "$DISK" | grep "$(basename "$LINUX_PART")" | awk '{print NR}')" "${NEW_END_MB}MB"

    progress "Creating ZaraOS partition..." 30
    DISK_END_MB=$(parted -s "$DISK" unit MB print | grep "^Disk" | awk '{print $3}' | tr -d 'MB')
    parted -s "$DISK" mkpart "ZaraOS" ext4 "${NEW_END_MB}MB" "${DISK_END_MB}MB"
    ROOT_PART=$(lsblk -ln -o PATH "$DISK" | tail -1)
    mkfs.ext4 -L "ZaraOS" -F "$ROOT_PART"

    EFI_PART=$(lsblk -ln -o PATH,PARTTYPE "$DISK" | grep -i "c12a7328-f81f-11d2-ba4b-00a0c93ec93b" | awk '{print $1}' | head -1)
    [[ -z "$EFI_PART" ]] && die "Could not locate EFI system partition on $DISK."

  else
    die "Could not detect existing OS on $DISK for dual boot. Use Full Install mode instead."
  fi

  SWAP_PART=""  # No dedicated swap in dual boot (uses swapfile instead)
fi

# ── Phase 3: Mount and copy system ───────────────────────────
progress "Mounting ZaraOS partition..." 35

mount "$ROOT_PART" "$MOUNT_POINT"
mkdir -p "$MOUNT_POINT"/{boot/efi,proc,sys,dev,dev/pts,run}
mount "$EFI_PART" "$MOUNT_POINT/boot/efi"

progress "Copying ZaraOS system files (this takes ~10 minutes)..." 38

# Copy the live squashfs root to the target partition
# The live system is mounted at / when booted from the ISO
rsync -aAX --progress \
  --exclude=/proc --exclude=/sys --exclude=/dev \
  --exclude=/run --exclude=/tmp \
  --exclude=/boot/efi \
  --exclude=/media --exclude=/mnt \
  --exclude=/lost+found \
  / "$MOUNT_POINT/" 2>&1 | \
  awk '/^sent/{next} /files/{
    split($0,a,"%"); pct=a[1]+0; if(pct>38 && pct<75) print "{\"phase\":\"Copying system files...\",\"percent\":"pct"}"
  }'

progress "Copying system files..." 75

# ── Phase 4: Configure the installed system ───────────────────
progress "Configuring system identity..." 76

# Set hostname
echo "$HOSTNAME" > "$MOUNT_POINT/etc/hostname"
cat > "$MOUNT_POINT/etc/hosts" <<EOF
127.0.0.1   localhost
127.0.1.1   $HOSTNAME
::1         localhost ip6-localhost ip6-loopback
EOF

# Create user if different from live user
if [[ "$USERNAME" != "zaraos" ]]; then
  chroot "$MOUNT_POINT" useradd -m -s /bin/bash -G audio,video,netdev,sudo "$USERNAME" 2>/dev/null || true
  chroot "$MOUNT_POINT" bash -c "echo '${USERNAME}:${USERNAME}' | chpasswd"
fi

# Generate a swapfile if no swap partition (dual boot)
if [[ -z "$SWAP_PART" ]]; then
  progress "Creating swap file (4 GB)..." 78
  dd if=/dev/zero of="$MOUNT_POINT/swapfile" bs=1M count=4096 status=none
  chmod 600 "$MOUNT_POINT/swapfile"
  mkswap "$MOUNT_POINT/swapfile"
fi

# ── Phase 5: Write fstab ──────────────────────────────────────
progress "Writing filesystem table..." 80

ROOT_UUID=$(blkid -s UUID -o value "$ROOT_PART")
EFI_UUID=$(blkid -s UUID -o value "$EFI_PART")

cat > "$MOUNT_POINT/etc/fstab" <<EOF
# ZaraOS fstab — generated by ZaraOS installer
UUID=$ROOT_UUID  /          ext4  errors=remount-ro  0  1
UUID=$EFI_UUID   /boot/efi  vfat  umask=0077         0  1
EOF

if [[ -n "$SWAP_PART" ]]; then
  SWAP_UUID=$(blkid -s UUID -o value "$SWAP_PART")
  echo "UUID=$SWAP_UUID  none  swap  sw  0  0" >> "$MOUNT_POINT/etc/fstab"
else
  echo "/swapfile  none  swap  sw  0  0" >> "$MOUNT_POINT/etc/fstab"
fi

# ── Phase 6: Install GRUB bootloader ─────────────────────────
progress "Installing GRUB bootloader..." 83

mount --bind /dev     "$MOUNT_POINT/dev"
mount --bind /dev/pts "$MOUNT_POINT/dev/pts"
mount --bind /proc    "$MOUNT_POINT/proc"
mount --bind /sys     "$MOUNT_POINT/sys"
mount --bind /run     "$MOUNT_POINT/run"

chroot "$MOUNT_POINT" grub-install \
  --target=x86_64-efi \
  --efi-directory=/boot/efi \
  --bootloader-id=ZaraOS \
  --recheck \
  "$DISK" || die "GRUB install failed."

progress "Detecting other operating systems..." 88

# os-prober finds Windows/Ubuntu so GRUB shows them in the boot menu
chroot "$MOUNT_POINT" bash -c "os-prober 2>/dev/null || true"

progress "Generating GRUB boot menu..." 90
chroot "$MOUNT_POINT" update-grub 2>&1 | grep -v "^$" | head -10 || die "update-grub failed."

# ── Phase 7: Unmount everything ───────────────────────────────
progress "Finalizing installation..." 95

for d in dev/pts dev proc sys run boot/efi; do
  umount "$MOUNT_POINT/$d" 2>/dev/null || true
done
umount "$MOUNT_POINT" 2>/dev/null || true

progress "Installation complete." 100
echo "{\"done\":true,\"mode\":\"${MODE}\",\"disk\":\"${DISK}\"}"
