# GitRemote

An Android application and companion PC agent that lets you review, stage, commit, and push Git changes directly from your phone. 

The project supports two modes:
1. **PC Agent Mode**: Connects over your local Wi-Fi to a Node.js daemon running on your computer. Stage files, review diffs, and write commits using your PC's native Git configurations and credentials.
2. **GitHub Cloud Mode**: Connects directly to the GitHub REST API using a Personal Access Token. Browse files, edit code, and write commits when your PC is turned off.

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
   |  - Scan and auto-discover IP    |       |  - Connects over the internet   |
   |  - Runs native Git commands     |       |  - Uses GitHub REST API         |
   |  - Authenticates via pairing    |       |  - Authenticates via user PAT   |
   +---------------------------------+       +---------------------------------+
```

---

## Key Features

* **Auto-Discovery Subnet Scanner**: Find your running companion PC server automatically. The mobile app can scan the local network range to find the agent, removing the need to find and type local IP addresses.
* **Advanced Diff Inspector**: A code diff viewer that shows additions and deletions with line numbers, custom highlighting, and horizontal scroll support.
* **Asynchronous PC Scanning**: The PC daemon uses non-blocking file reads to scan your directories for Git repositories without slowing down the server.
* **Request Logger**: The PC agent logs all incoming sync requests with exact response status codes and network durations.
* **Modular React Native Codebase**: Fully modular React Native Expo codebase written in TypeScript with strict type check validation.

---

## Directory Structure

### PC Agent (`/pc-agent`)
* `index.js`: The Express server containing Git endpoints, request logging, and network advertisements.
* `config.json`: Server port and root directories settings.

### Mobile App (`/mobile-app`)
* `App.tsx`: Coordinator and screen navigation router.
* `src/components/`: Reusable interface components.
  * `DiffViewer.tsx`: Custom diff highlighter and stage toggler.
  * `PushConsole.tsx`: Modal showing real-time git push logs.
  * `Header.tsx`, `Button.tsx`, `Input.tsx`, `Card.tsx`, `Loader.tsx`: Styled theme components.
* `src/hooks/`: State managers.
  * `usePCAgent.ts`: Manages server pairing, workspace loading, staging, committing, and network discovery scans.
  * `useGithubCloud.ts`: Manages GitHub account authorization, repository listing, tree navigation, and code edits.
* `src/utils/`: Helpers and constants.
  * `theme.ts`: UI color palette and typography rules.
  * `api.ts`: Fetch client with timeout settings.
  * `crypto.ts`: Base64 encoders for file transfer.

---

## Setup Instructions

### 1. PC Agent Setup

The PC agent requires Node.js to scan directories and run Git commands.

1. Navigate to the agent folder and install the dependencies:
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
   *Replace `scanDir` with the folder where your Git repositories are stored.*
3. Start the server:
   ```bash
   npm start
   ```
4. Copy the 4-digit pairing code printed in your command line window on startup.

*Note: Ensure your Windows Defender Firewall allows traffic on the configured port (default `3011`) for local Wi-Fi pairing.*

### 2. Mobile App Setup

The mobile app runs on React Native and Expo.

1. Navigate to the app folder and install the dependencies:
   ```bash
   cd mobile-app
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
   Scan the printed QR code with your phone's camera using the **Expo Go** application.

---

## Connection Setup

### Local Mode (PC Agent)
* Connect your phone and PC to the same Wi-Fi network.
* Open the app, and select **PC Agent**.
* Tap **Auto-Discover PC** to locate the server on your network automatically, or enter the IP address manually.
* Enter the 4-digit pairing code shown in your PC console to connect.

### Cloud Mode (GitHub API)
* Open the app, and select **GitHub Cloud**.
* Create a classic Personal Access Token on GitHub with the `repo` scope.
* Input the token in the application. You can now browse your online projects, edit files, and commit directly.
