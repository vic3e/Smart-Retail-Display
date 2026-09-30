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

Since modern Raspberry Pi OS uses the **Wayfire** window manager, we configure autostart settings in `~/.config/wayfire.ini`. This disables the screensaver and triggers Chromium in crash-resilient fullscreen kiosk mode.

### 1. Install Cursor-Hider Utility
This utility automatically hides your mouse cursor after 2 seconds of inactivity so it doesn't stay on top of your signs:
```bash
sudo apt install unclutter -y
```

### 2. Configure Autostart
Open the Wayfire configuration file:
```bash
nano ~/.config/wayfire.ini
```

Scroll to the very bottom and add the following `[autostart]` block. 
*Note: If you run your server locally on the Pi, keep `"http://127.0.0.1:8000"`. If you wish to pull directly from your cloud production Render instance, change it to `"https://lumen-qdvs.onrender.com/"`.*

```ini
[autostart]
# Disable screensaver and Display Power Management Signaling (stops display from sleeping)
screensaver = false
dpms = false

# Automatically hide mouse cursor after 2 seconds of inactivity
cursor_hide = unclutter -idle 2

# Launch Chromium in crash-resilient, GPU-accelerated full kiosk mode
chromium = chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required "http://127.0.0.1:8000"
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
