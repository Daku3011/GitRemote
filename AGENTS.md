# GitRemote

Two-package monorepo: Android app + PC agent for remote Git operations from a phone.

## Packages

```
pc-agent/     Node.js Express daemon (scan repos, serve Git API via simple-git)
mobile-app/   React Native Expo (SDK 56, RN 0.85, TS 6.0)
```

## Commands

| Package | Command | Notes |
|---------|---------|-------|
| `pc-agent/` | `npm start` | Starts Express server. Requires `pc-agent/config.json` (gitignored, must be created). Falls back to defaults if missing. |
| `mobile-app/` | `npm start` | Expo dev server, scan QR with Expo Go. |
| `mobile-app/` | `npm run android` / `ios` / `web` | Expo shortcuts. |
| `mobile-app/` | `eas build -p android --profile preview` | Standalone APK build. |

No tests, linter, or typecheck scripts are configured in either package. TypeScript compiles clean with `npx tsc --noEmit`.

## Architecture

- **PC Agent mode**: Phone → HTTP (cleartext) → Express daemon on LAN. Daemon advertises via Bonjour/mDNS. Auth via 4-digit pairing code → bearer token. Graceful shutdown on SIGINT/SIGTERM.
- **GitHub Cloud mode**: Phone → HTTPS → api.github.com via classic PAT (repo scope, `token` auth header, `User-Agent: GitMobileToPC`). Supports browse, edit, and commit single files.
- Repos are scanned up to 2 dirs deep under `scanDir` (defaults to `os.homedir()` if not configured).
- Repo IDs are base64url-encoded absolute paths.

## PC Agent API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pair` | POST | Exchange 4-digit code for bearer token |
| `/api/workspaces` | GET | List discovered repos with branch + changes count |
| `/api/workspaces/:id/status` | GET | Detailed file status (staged/unstaged) |
| `/api/workspaces/:id/diff` | GET | Unified diff for a file (`?file=&staged=`) |
| `/api/workspaces/:id/stage` | POST | Stage/unstage files (`{files, stage}`) |
| `/api/workspaces/:id/commit` | POST | Commit staged changes (`{message}`) |
| `/api/workspaces/:id/push` | POST | Push to origin/current-branch |
| `/api/workspaces/:id/pull` | POST | Pull from upstream |
| `/api/workspaces/:id/fetch` | POST | Fetch from remote |
| `/api/workspaces/:id/branches` | GET | List all branches |
| `/api/workspaces/:id/branches/checkout` | POST | Checkout (or create with `{create:true}`) a branch |
| `/api/workspaces/:id/branches/:name` | DELETE | Delete a branch |
| `/api/workspaces/:id/log` | GET | Commit log (`?count=&branch=`) |
| `/api/workspaces/:id/stash` | GET | List stashes |
| `/api/workspaces/:id/stash` | POST | Save stash (`{message}` optional) |
| `/api/workspaces/:id/stash/pop` | POST | Pop latest stash |
| `/api/workspaces/:id/stash/drop` | POST | Drop latest stash |

## Mobile-app specifics

- **Expo v56**: Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing Expo code.
- Entry: `index.ts` → `App.tsx` (thin router). Screens in `src/screens/`, API in `src/api.ts`, types in `src/types.ts`, styles in `src/styles.ts`, Base64 polyfill in `src/utils/base64.ts`.
- `android.usesCleartextTraffic: true` in `app.json` (required for local HTTP to PC agent).
- Credentials persisted via `@react-native-async-storage/async-storage`.
- No navigation library — all screens managed via `screen` state variable in `App.tsx`.
- All API functions are typed in `src/api.ts` — import them instead of calling fetch directly.
- WorkspaceDetailScreen includes modals for branches, commit log, and stash management.
