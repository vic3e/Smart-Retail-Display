#!/bin/bash
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

echo "Launching $CHROMIUM_BIN in kiosk mode..."
# Launch Chromium in crash-resilient, GPU-accelerated full kiosk mode
"$CHROMIUM_BIN" --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required "http://127.0.0.1:8000"

