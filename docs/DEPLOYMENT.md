# Lumen Digital Signage: Multi-OS Deployment Guide

This document outlines the step-by-step instructions for deploying and running the Lumen Digital Signage client application across various hardware profiles and operating systems, all configured to fetch from the live Render instance (`https://lumen-qdvs.onrender.com/`).

It is split into two primary integration tracks:
1. **Dedicated Signage Hardware ("Our Device")** – For managed displays (Raspberry Pi, dedicated Mini-PCs, or laptops).
2. **Merchant Self-Onboarding ("Existing Store Displays")** – For merchants running the signage on their own existing iPads, Android Tablets, Smart TVs, or desktop web browsers.

---

## Track 1: Dedicated Signage Hardware ("Our Device")

When providing a pre-configured player to a merchant, the goal is a **zero-maintenance, zero-mouse, crash-resilient appliance** that boots directly into the signage fullscreen mode and recovers automatically from power or network failures.

### A. Raspberry Pi OS Setup (The Gold Standard)
Raspberry Pi 4 or 5 is the recommended signage hardware. The official Raspberry Pi OS (Debian Bookworm) uses either **Labwc** or **Wayfire** as its window manager.

#### 1. Setup Kiosk Auto-Start Script
To avoid a race condition where Chromium attempts to load the page before your backend has finished starting up, use a helper script to wait for port 8000 (or your Render URL) to become available.

1. Create `start-kiosk.sh` in your project folder:
```bash
nano ~/Smart-Retail-Display/start-kiosk.sh
```

2. Add the following content (changing the URL to your Render deployment `"https://lumen-qdvs.onrender.com/"` if displaying from the cloud):
```bash
#!/bin/bash
# Wait up to 60 seconds for the backend to start
TARGET_URL="http://127.0.0.1:8000" # Change to "https://lumen-qdvs.onrender.com/" if using cloud

echo "Waiting for Lumen Digital Signage backend on $TARGET_URL..."
i=0
while [ $i -lt 60 ]; do
  if curl -s -o /dev/null "$TARGET_URL" 2>/dev/null; then
    break
  fi
  i=$((i + 1))
  sleep 1
done

echo "Backend is online! Launching Chromium in kiosk mode..."
# Launch Chromium in crash-resilient, GPU-accelerated full kiosk mode
chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required "$TARGET_URL"
```

3. Make the script executable:
```bash
chmod +x ~/Smart-Retail-Display/start-kiosk.sh
```

*(Note: We hide the mouse cursor globally in the application's CSS stylesheet `style.css` using `cursor: none !important;` so legacy X11 utilities like `unclutter` are no longer needed on Wayland environments).*

#### 2. Configure Compositor Autostart

##### Option 1: For Labwc (Latest Raspberry Pi OS Default)
1. Ensure the directory exists and open the autostart file:
```bash
mkdir -p ~/.config/labwc
nano ~/.config/labwc/autostart
```
2. Add the following to start the launcher script:
```bash
~/Smart-Retail-Display/start-kiosk.sh &
```
3. Disable screen blanking at the system level:
```bash
sudo raspi-config nonint do_blanking 1
```

##### Option 2: For Wayfire (Older Raspberry Pi OS Bookworm)
1. Open the Wayfire configuration file:
```bash
nano ~/.config/wayfire.ini
```
2. Append or modify the `[autostart]` block:
```ini
[autostart]
# Disable screensaver and Display Power Management Signaling (prevent sleep)
screensaver = false
dpms = false

# Open Chromium in crash-resilient kiosk mode pointing to launcher script
chromium = ~/Smart-Retail-Display/start-kiosk.sh
```

---

### B. Windows Mini-PC or Managed Laptop
If deploying a small Windows-based Mini-PC (e.g., Intel NUC) mounted behind a TV:

#### 1. Disable Sleep and Screensavers
* Go to **Settings > System > Power & Sleep** and set both **Screen** and **Sleep** to **Never**.
* Open **Screen Saver Settings** and set to **None**.

#### 2. Create a Fullscreen Startup Shortcut
1. Press `Win + R`, type `shell:startup`, and press Enter. This opens the Windows **Startup folder**.
2. Right-click inside the folder, select **New > Shortcut**.
3. Paste the following line in the location field (make sure the quotes are exact):
   ```cmd
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --start-fullscreen "https://lumen-qdvs.onrender.com/"
   ```
4. Name it `Lumen Signage` and click **Finish**.
5. *Optional:* Set Windows to sign in automatically to the user account on boot without requiring a password (via `netplwiz`).

---

### C. macOS Kiosk Setup
If utilizing an Apple Mac Mini or managed MacBook:

#### 1. Setup Autostart Application
1. Open the built-in **Script Editor** app.
2. Paste this single-line shell command:
   ```applescript
   do shell script "/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --kiosk --start-fullscreen \"https://lumen-qdvs.onrender.com/\""
   ```
3. File > Save, name it `Lumen Signage`, and set the file format to **Application**.
4. Open **System Settings > General > Login Items**, and add your new `Lumen Signage` app to the "Open at Login" list.

#### 2. System Tweaks
* In **System Settings > Lock Screen**, set "Turn display off on battery/power adapter when inactive" to **Never**.
* Disable **Screen Saver**.


---

## Track 2: Merchant Self-Onboarding ("Existing Displays")

If a merchant wants to use their own hardware (e.g., an in-counter iPad, a display tablet, or a smart TV), we bypass OS-level scripts and leverage the **Progressive Web App (PWA)** standard. This turns the web application into a native, standalone, fullscreen experience with a single tap.

### A. iPad and iOS Tablets (Safari)
Apple iPads are highly popular for checkout-counter displays. 

1. Instruct the merchant to open **Safari** on the iPad and navigate to:
   `https://lumen-qdvs.onrender.com/`
2. Tap the **Share** button (the square icon with an upward arrow) in Safari.
3. Scroll down and select **Add to Home Screen**.
4. Name the app `Lumen Display` and tap **Add**.
5. **The Experience:** A native "Lumen" icon appears on their iPad homescreen. When they tap it, the browser address bar, back/forward buttons, and tab controls are **completely hidden**. The app opens directly as a fullscreen signage kiosk.

---

### B. Android Tablets & Tablets (Google Chrome)
For Samsung Galaxy Tabs, Lenovo Tablets, or similar Android devices:

1. Open **Google Chrome** and navigate to:
   `https://lumen-qdvs.onrender.com/`
2. Tap the **three-dot menu** in the top-right corner.
3. Select **Install App** (or **Add to Home Screen**).
4. **The Experience:** Android installs the app to their homescreen. Tapping the launcher opens the signage in a dedicated fullscreen window without Chrome's URL bar or system toolbar.

---

### C. Smart TVs and Android TV (Web Browser)
If the merchant is running a modern Smart TV (Samsung Tizen, LG WebOS, or Sony Android TV):

1. Instruct them to open the TV's built-in web browser.
2. Enter the URL: `https://lumen-qdvs.onrender.com/`
3. Use the TV remote to select the browser's **Fullscreen** or **Hide Address Bar** option (usually an icon on the browser toolbar or in its settings menu).
4. Bookmark the page so they can launch it easily.

*Recommendation for Smart TVs:* If they are using an Android TV or Fire TV stick, they can download free, specialized kiosk browsers from the Google Play Store (such as **Fully Kiosk Browser**), which can lock the TV to your Render URL on startup and hide all bars automatically.

---

## Track 3: Maintenance & Continuous Updates

Regardless of whether the merchant uses a dedicated Raspberry Pi, an iPad, or a Smart TV, the architecture remains **zero-touch** once deployed:

1. **GitHub Deployments:** When you make a code change on your computer and `git push` to GitHub, Render automatically builds and deploys your updates.
2. **Instant Synchronization:** Within ~30 seconds (on the very next poll cycle of the screens' `subscription-adapter.js`), every active iPad, Raspberry Pi, and Smart TV in the world will automatically pick up and run your updated frontend/backend code.
3. **Network Resiliency:** If a store's Wi-Fi drops out, the display automatically falls back to displaying cached slides (`media.json`), and silently polls in the background until the internet recovers, at which point it resumes live syncing without throwing crash screens.