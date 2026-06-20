# GitRemote

An Android application and PC companion agent that lets you review, stage, commit, and push Git changes on your computer directly from your phone.

The project features two modes of operation:
*   **PC Agent Mode**: Connects locally over Wi-Fi to a lightweight daemon running on your computer. Stage files, review diffs, and commit or push changes using your PC's native Git client and SSH keys.
*   **GitHub Cloud Mode**: Connects directly to the GitHub REST API using a Personal Access Token. Browse files, edit code, and write commits directly to your remote repository when your PC is turned off.

---

## System Architecture

```
                  +-----------------------------------+
                  |        Android Mobile App         |
                  +-----------------------------------+
                     /                             \
     [PC Server is On]                              [PC Server is Off]
                   /                                 \
  +---------------------------------+       +---------------------------------+
  |      PC Agent Connection        |       |      GitHub Cloud Connection    |
  |  - Connects locally over Wi-Fi  |       |  - Connects over the internet   |
  |  - Runs native Git command APIs |       |  - Uses GitHub REST API         |
  |  - Uses PC SSH keys/credentials |       |  - Authenticates via user PAT   |
  +---------------------------------+       +---------------------------------+
```

---

## Directory Structure

*   `pc-agent/`: A Node.js daemon that scans for local repositories, serves Git API endpoints using `simple-git`, and advertises network presence via Bonjour/mDNS.
*   `mobile-app/`: A React Native Expo application built with TypeScript, containing screens for project navigation, local IP pairing, direct file editing, and a line-by-line diff inspector.

---

## Setup Instructions

### 1. PC Agent Setup

The PC agent requires Node.js to scan directories and execute Git operations.

1. Navigate to the agent folder and install dependencies:
   ```bash
   cd pc-agent
   npm install
   ```
2. Configure the server settings in `pc-agent/config.json`:
   ```json
   {
     "port": 3011,
     "scanDir": "C:\\Users\\rdwar\\Documents"
   }
   ```
   *Replace `scanDir` with the root directory containing your repositories.*
3. Start the server:
   ```bash
   npm start
   ```
4. Note the 4-digit pairing code printed in the console window upon startup.

*Note: If you plan to connect over local Wi-Fi, ensure your Windows Defender Firewall allows traffic on your configured port (default `3011`).*

### 2. Mobile App Setup

The mobile client is built on React Native and Expo.

1. Navigate to the app folder and install dependencies:
   ```bash
   cd mobile-app
   npm install
   ```
2. Run in development mode:
   ```bash
   npm start
   ```
   Scan the printed QR code with your phone's camera using the **Expo Go** application.

3. Build a standalone APK (to run without a computer):
   ```bash
   eas build -p android --profile preview
   ```
   Once compiled, scan the output QR code to download and install the `.apk` package.

---

## Connection Setup

### Local Mode (PC Agent)
*   Ensure your phone and PC are connected to the same Wi-Fi network.
*   In the app, select the **PC Agent** tab.
*   Input your PC's local IP address and port (e.g. `192.168.1.50:3011`).
*   Enter the 4-digit pairing code shown in your PC Agent console to pair the devices.

### Cloud Mode (GitHub API)
*   Select the **GitHub Cloud** tab.
*   Create a classic Personal Access Token on GitHub with the `repo` scope enabled.
*   Input the token in the application. You can now browse your online projects and commit updates directly when your computer is off.

---

## Security

Pairing tokens and GitHub access credentials are saved locally in your phone's sandboxed storage. They are only transmitted directly to your local PC Agent server or the official secure GitHub REST API endpoints.
