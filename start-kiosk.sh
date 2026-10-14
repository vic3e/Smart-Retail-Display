#!/bin/bash
# 0. Single-instance lock: ensure only one kiosk launcher runs per user/session.
# Prevents duplicate autostart triggers from spawning multiple Chromium windows.
LOCK_FILE="${XDG_RUNTIME_DIR:-/tmp}/lumen-kiosk.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[kiosk] Another kiosk launcher instance is already active; exiting to avoid duplicate windows."
  exit 0
fi

# Wait up to 60 seconds for the backend FastAPI server to start serving port 8000.
# This prevents the "Connection Refused" error page in Chromium on system boot!
echo "Waiting for Lumen Digital Signage backend on http://127.0.0.1:8000..."
i=0
while [ $i -lt 60 ]; do
  if curl -s -o /dev/null http://127.0.0.1:8000/ 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 1
done

echo "Backend is online! Detecting Chromium binary..."
# Detect whether chromium-browser or chromium is installed
if command -v chromium-browser >/dev/null 2>&1; then
  CHROMIUM_BIN="chromium-browser"
elif command -v chromium >/dev/null 2>&1; then
  CHROMIUM_BIN="chromium"
else
  echo "Error: Chromium is not installed! Please install it with 'sudo apt install chromium-browser -y'" >&2
  exit 1
fi

echo "Clearing Chromium temporary cache to prevent stale layout issues..."
rm -rf ~/.cache/chromium/

# Hide cursor ONLY for this Chromium kiosk window (keeps desktop cursor normal on Alt+F4)
export XCURSOR_THEME=transparent
export XCURSOR_SIZE=1

echo "Launching $CHROMIUM_BIN in kiosk mode..."
# Launch Chromium in crash-resilient, GPU-accelerated full kiosk mode
"$CHROMIUM_BIN" \
  --kiosk \
  --ozone-platform=wayland \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --password-store=basic \
  "http://127.0.0.1:8000"

