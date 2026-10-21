#!/usr/bin/env bash
# Fetch and stage FFmpeg/FFprobe sidecars for the current platform.
# Run once after cloning, and after any `git clean`.
set -euo pipefail

cd "$(dirname "$0")/.."
BIN_DIR="src-tauri/binaries"
TRIPLE=$(rustc -vV | grep '^host:' | cut -d' ' -f2)
mkdir -p "$BIN_DIR"

case "$TRIPLE" in
  x86_64-unknown-linux-gnu)
    URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
    ARCHIVE="ffmpeg-linux-amd64.tar.xz"
    ;;
  aarch64-unknown-linux-gnu)
    URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz"
    ARCHIVE="ffmpeg-linux-arm64.tar.xz"
    ;;
  *)
    echo "Unsupported triple: $TRIPLE — download FFmpeg manually."
    exit 1
    ;;
esac

if [ ! -f "$BIN_DIR/openreel-ffmpeg-$TRIPLE" ]; then
  echo "Fetching $URL"
  curl -fL "$URL" -o "/tmp/$ARCHIVE"
  tar -xf "/tmp/$ARCHIVE" -C /tmp
  EXTRACTED=$(find /tmp -maxdepth 1 -type d -name 'ffmpeg-*' | head -1)
  cp "$EXTRACTED/ffmpeg"  "$BIN_DIR/openreel-ffmpeg-$TRIPLE"
  cp "$EXTRACTED/ffprobe" "$BIN_DIR/openreel-ffprobe-$TRIPLE"
  chmod +x "$BIN_DIR"/openreel-*-"$TRIPLE"
  rm -rf "$EXTRACTED" "/tmp/$ARCHIVE"
  echo "Sidecars staged for $TRIPLE"
else
  echo "Sidecars already present for $TRIPLE"
fi
