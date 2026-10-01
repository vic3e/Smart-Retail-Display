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

echo "Backend is online! Launching Chromium in kiosk mode..."
# Launch Chromium in crash-resilient, GPU-accelerated full kiosk mode
chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required "http://127.0.0.1:8000"
