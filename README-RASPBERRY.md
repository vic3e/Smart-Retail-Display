# Raspberry Pi Deployment Guide

This guide provides copy-and-paste commands to set up the **Lumen Digital Signage** application on a fresh Raspberry Pi OS installation. 

These commands use shell variables (`$(whoami)` and `$(pwd)`) to **automatically detect your username and installation path**, making the setup completely copy-paste friendly without manual editing!

---

## 📋 Prerequisites & Flashing
Before starting, ensure your Raspberry Pi is flashed with:
* **Operating System**: `Raspberry Pi OS (64-bit) with Desktop` (Debian Bookworm is recommended).
* **Do NOT use the "Lite" version**, as a graphical environment is required to render Chromium.
* Connect your Pi to the internet (Wi-Fi or Ethernet).

---

## 🚀 Step 1: Clone the Code and Install Dependencies

Open a terminal on your Raspberry Pi desktop and run the following block of commands. This will clone the repository to your home folder, configure a virtual Python environment, install all required backend packages, and copy the default environment configuration.

```bash
# 1. Navigate to your user's home directory
cd /home/$(whoami)

# 2. Clone the repository (Replace URL with your own fork if you have one!)
git clone https://github.com/YOUR_USERNAME/Smart-Retail-Display.git

# 3. Enter the project folder
cd Smart-Retail-Display

# 4. Create a virtual environment and activate it
python3 -m venv .venv
source .venv/bin/activate

# 5. Upgrade pip and install all backend requirements
pip install --upgrade pip
pip install -r backend/requirements.txt

# 6. Initialize environment configurations
cp .env.example .env
```

### Configure Environment Variables (Optional)
If you are using physical relays connected to the GPIO pins, change the mode from `mock` to `real` in your `.env` configuration:
```bash
nano .env
```
Find the `GPIO_MODE` variable and set it:
```ini
GPIO_MODE=real
```
*(Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit).*

---

## ⚙️ Step 2: Create the Automatic Boot Service

To make sure your FastAPI backend runs automatically whenever the Pi restarts, we will create a background system service (`systemd`).

**Simply copy, paste, and run this entire block in your terminal.** It will automatically generate the service file using your Pi's username and correct directories:

```bash
cat <<EOF | sudo tee /etc/systemd/system/lumen-backend.service
[Unit]
Description=Lumen Digital Signage Backend
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### Start and Enable the Service
Run these commands to tell the Pi to register and start your new service:
```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable the service to launch automatically on system boot
sudo systemctl enable lumen-backend.service

# Start the service right now
sudo systemctl start lumen-backend.service

# Verify the service is active and running successfully
sudo systemctl status lumen-backend.service
```
*(If active, you will see a green `active (running)` status. Press `q` to exit the status screen).*

---

## 🖥️ Step 3: Configure Kiosk Mode & Prevent Sleep

Since modern Raspberry Pi OS uses either **Labwc** (on latest updates and Raspberry Pi 5) or **Wayfire** (on older releases of Bookworm) as its desktop window manager, follow the instructions below corresponding to your system.

### A. Determine your Desktop Window Manager
To check which window manager is currently active, open a terminal on your Pi and run:
```bash
echo $WAYLAND_DISPLAY
```
Alternatively, check which configuration directories exist in your home directory:
- If `~/.config/labwc` exists, you are running **Labwc**.
- If `~/.config/wayfire.ini` exists, you are running **Wayfire**.

---

### B. Setup Kiosk Auto-Start Script
To prevent Chromium from launching before the FastAPI backend has fully initialized (which causes a "This site can't be reached" error screen), we use a helper script that waits for port 8000 to be healthy before starting the browser.

1. Create a script named `start-kiosk.sh` in your project folder:
```bash
nano ~/Smart-Retail-Display/start-kiosk.sh
```

2. Copy and paste the following content:
```bash
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
```

3. Make the script executable:
```bash
chmod +x ~/Smart-Retail-Display/start-kiosk.sh
```

*(Note: We hide the mouse cursor globally in the application's CSS stylesheet, meaning you do not need legacy X11 utilities like `unclutter` which fail to work on modern Wayland desktop compositors like Labwc).*

---

### C. Configure Desktop Autostart

#### Option 1: For Labwc (Latest Raspberry Pi OS Default / Raspberry Pi 5)
1. Ensure the Labwc configuration directory exists:
```bash
mkdir -p ~/.config/labwc
```

2. Open or create the Labwc autostart configuration:
```bash
nano ~/.config/labwc/autostart
```

3. Add the following line at the bottom to execute our kiosk launcher script in the background:
```bash
# Launch the Digital Signage Kiosk with port-readiness wait
~/Smart-Retail-Display/start-kiosk.sh &
```
*(Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit).*

4. Disable screen blanking at the compositor level using raspi-config:
```bash
sudo raspi-config nonint do_blanking 1
```

---

#### Option 2: For Wayfire (Older Raspberry Pi OS Bookworm / Raspberry Pi 4)
1. Open the Wayfire configuration file:
```bash
nano ~/.config/wayfire.ini
```

2. Scroll to the very bottom and add or update the `[autostart]` block to execute our kiosk launcher:
```ini
[autostart]
# Disable screensaver and Display Power Management Signaling (stops display from sleeping)
screensaver = false
dpms = false

# Launch the Digital Signage Kiosk with port-readiness wait
chromium = ~/Smart-Retail-Display/start-kiosk.sh
```
*(Press `Ctrl+O` then `Enter` to save, and `Ctrl+X` to exit).*


---

## 🔄 Step 4: Reboot and Test

Once steps 1 through 3 are completed, restart your Raspberry Pi to watch it boot directly into the digital signage:

```bash
sudo reboot
```

---

## 🛠️ Handy Maintenance Commands

If you ever need to inspect or manage the background backend service, use these commands:

### Check real-time logs
To see what the FastAPI server is print-logging (such as payment receipts or GPIO trigger statuses), run:
```bash
journalctl -u lumen-backend.service -f -n 100
```

### Restart the backend
If you make code changes or modify the `.env` file, reload the backend service:
```bash
sudo systemctl restart lumen-backend.service
```

### Stop the backend
```bash
sudo systemctl stop lumen-backend.service
```

---

## 🔊 Audio Configuration (HDMI Audio to TV Speakers)

Modern Raspberry Pi OS uses **PipeWire** and **WirePlumber** to manage audio. By default, the Pi may route audio to the 3.5mm analog headphone jack instead of your TV's HDMI port.

### 1. Set HDMI as the Default Sound Card
Inspect your available audio sinks:
```bash
wpctl status
```
Find the node number for `Built-in Audio Digital Stereo (HDMI)` (commonly `67` or by node name `alsa_output.platform-fef00700.hdmi.hdmi-stereo`), then set it as the default output:
```bash
wpctl set-default @DEFAULT_AUDIO_SINK@
# Or specify by node name:
wpctl set-default alsa_output.platform-fef00700.hdmi.hdmi-stereo
```

### 2. Adjust or Check Volume
* **Set to full volume (100%)**:
  ```bash
  wpctl set-volume @DEFAULT_AUDIO_SINK@ 1.0
  ```
* **Set to 50% volume**:
  ```bash
  wpctl set-volume @DEFAULT_AUDIO_SINK@ 0.50
  ```
* **Increase volume by 20%**:
  ```bash
  wpctl set-volume @DEFAULT_AUDIO_SINK@ 20%+
  ```
* **Check current volume**:
  ```bash
  wpctl get-volume @DEFAULT_AUDIO_SINK@
  ```
* **Mute / Unmute toggle**:
  ```bash
  wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle
  ```

---

## 🔗 Screen Pairing & Store Management

Each display kiosk generates a unique `deviceId` on first launch and pairs to a specific merchant store, enforcing strict per-business content isolation.

### 1. Pairing a Fresh Screen
1. When unlinked, the TV screen will display the **"Connect to Your Account" / "Scan to Connect"** screen with a QR code and a 6-digit pairing code input box.
2. In your Zuke Dashboard, switch to the desired business (e.g. *Viciel Beauty*).
3. Navigate to **Marketplace > Smart Retail Display > Manage Your Screens** (`/pages/smart-retail-display/manage-screens.html`).
4. Click **"Connect New Screen"** to generate a secure 6-digit code.
5. Enter the code on the TV screen (or scan the on-screen QR code).
6. The TV will instantly link to that business, hide the pairing view, and begin cycling that store's ads and live entertainment.

### 2. How to Unpair the TV Screen
To unlink the screen from a business and connect it to another store, use any of these methods:
* **On-Screen Control**: Click the disconnect icon in the top-right corner of the TV screen (next to the mute button) and confirm.
* **Keyboard Shortcut**: Press **`U`** on any keyboard plugged into the Pi to prompt and unpair.
* **URL Parameter**: Open Chromium to `http://127.0.0.1:8000/?unpair=true` to clear the stored device credentials and reload into pairing mode.
* **Remote Terminal (SSH)**: Run:
  ```bash
  killall -9 chromium 2>/dev/null
  rm -rf ~/.config/chromium/Default/Local\ Storage/leveldb/*
  ~/Smart-Retail-Display/start-kiosk.sh &
  ```
* **Dashboard Remote Disconnect**: In **Manage Your Screens**, click **"Disconnect Screen"** under the active screen card.

---

## 🖼️ Ad Framing & Content Display

* **Aspect Ratio Preservation**: During ad cycles, the screen shifts to a sidebar layout (`68vw` ad frame + `32vw` mini-player/QR sidebar). The display engine applies `object-fit: contain` so that 16:9 banners, portrait graphics, and square ads fit the frame without having their edges, prices, or copy cropped.
* **Optional QR Destination**: If an ad does not have a Paystack payment link, the system automatically checks for a store WhatsApp number to create a direct click-to-chat QR link, or renders the **"Ask in Store"** badge if no link is configured.

