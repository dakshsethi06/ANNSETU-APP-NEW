# AnnSetu IoT Onboarding Guide & QEMU Simulator Setup

Welcome to the team! This guide will walk you through setting up the AnnSetu IoT platform locally on your machine, including the Backend, Frontend (Admin Panel), and the ESP32 QEMU Simulator for testing OTA updates.

---

## 1. Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v18+ recommended)
- **Git**
- **Python** (v3.8+)
- **Supabase** account (you will need the local or cloud URL/Keys)

---

## 2. Set Up the ESP-IDF & QEMU Environment

Since we are testing firmware using a virtual ESP32, you need the Espressif toolchain and the QEMU simulator.

1. **Install ESP-IDF**:
   - Download the **ESP-IDF Offline Installer** for Windows from the [Espressif Website](https://dl.espressif.com/dl/esp-idf/).
   - Run the installer. It will install the ESP-IDF, Git, Python, and the cross-compilers.
   - Once installed, you will have an "ESP-IDF CMD" or "ESP-IDF PowerShell" shortcut on your desktop. **Always use this shortcut** when compiling firmware!

2. **Install QEMU for ESP32**:
   - Download the latest Espressif QEMU release from [their GitHub releases page](https://github.com/espressif/qemu/releases).
   - Extract the `.zip` file to a folder (e.g., `C:\qemu-esp32`).
   - Add the path to the extracted `bin` folder (e.g., `C:\qemu-esp32\bin`) to your Windows System `PATH` environment variable.

---

## 3. Clone and Run the Backend

1. Open a standard terminal and clone the repository.
2. Navigate to the backend directory:
   ```cmd
   cd AnnsetuNewApp/backend
   ```
3. Install dependencies:
   ```cmd
   npm install
   ```
4. Set up your `.env` file with the Supabase credentials and MQTT broker details.
5. Start the backend server:
   ```cmd
   npm start
   ```

---

## 4. Clone and Run the Admin Panel (Frontend)

1. In a new terminal, navigate to the frontend directory:
   ```cmd
   cd Annsetu-Adminpanel/frontend
   ```
2. Install dependencies:
   ```cmd
   npm install
   ```
3. Start the Next.js development server:
   ```cmd
   npm run dev
   ```
4. Open your browser and go to `http://localhost:3000`.

---

## 5. Build and Run the Virtual ESP32 Device

Now we need to compile the mock firmware and run it in the QEMU simulator.

1. Open your **ESP-IDF CMD** or **ESP-IDF PowerShell** environment (installed in step 2).
2. Navigate to the firmware directory:
   ```cmd
   cd AnnsetuNewApp/esp32_qemu_mock
   ```
3. Build the firmware:
   ```cmd
   idf.py build
   ```
4. **Important**: Because QEMU needs a raw flash image, we must merge the bootloader, partition table, and the app into a single `.bin` file. Run the following:
   ```cmd
   cd build
   esptool.py --chip esp32 merge_bin -o merged_flash.bin --fill-flash-size 4MB @flash_args
   cd ..
   ```
5. **Run the Simulator**:
   ```cmd
   qemu-system-xtensa -nographic -machine esp32 -drive file=build/merged_flash.bin,if=mtd,format=raw -nic user,model=open_eth
   ```

The virtual ESP32 will now boot up, connect to the virtual network, and start publishing telemetry to the backend!

---

## 6. Testing OTA (Over-The-Air) Updates

Once everything is running, you can test the OTA system:
1. Go to the Admin Panel (`http://localhost:3000/devices`).
2. Click the "OTA Update" button next to the active virtual device.
3. When prompted for a file, upload the compiled application binary:
   - **Path:** `AnnsetuNewApp/esp32_qemu_mock/build/esp32_qemu_mock.bin`
   - *(Note: Do NOT upload `merged_flash.bin` here. The OTA process only accepts the pure app binary!)*
4. The backend will send an MQTT command, and the virtual device will download and flash the new firmware.

> **Note on QEMU OTA Bug**: 
> QEMU for ESP32 has a known bug where the software reboot (`esp_restart()`) at the end of an OTA update causes a crash (`InstrFetchProhibited`). If you see a crash loop after an OTA flash completes in the simulator:
> 1. Press `Ctrl+C` to stop QEMU.
> 2. Run the `qemu-system-xtensa` command from Step 5 again.
> 3. It will boot cleanly into the new firmware! This issue does not happen on real ESP32 hardware.
