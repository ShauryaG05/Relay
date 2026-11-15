# Laptop Remote Control: Design

Version 0.1, draft. Technical design for the requirements in Laptop Remote Control: Requirements. Requirement IDs (REQ-n) and open decisions (O-n) refer to that doc. Where a macOS mechanism is only a candidate, it says so; nothing here is verified on your machine until the spike tasks in the plan are done.

## 1. Overview

The system has three running programs and one database:

- **Web app (COMP-1):** Next.js UI and API, styled with Tailwind and shadcn.
- **Gateway (COMP-2):** a long-running Node server that holds WebSocket connections from agents and browsers and relays messages.
- **Agent (COMP-3):** a Node program on the Mac that executes a fixed list of approved commands.
- **MongoDB (COMP-4):** users, devices, pairing codes, audit log and related data.

The agent always connects outward to the gateway. Nothing on your Mac listens for incoming connections, which avoids port forwarding and keeps the Mac off the open internet.

## 2. Key architecture decisions

**D1: The gateway is a separate Node process, not part of Next.js route handlers.** Next.js deployed on serverless platforms cannot keep long-lived WebSocket connections open, and the agent needs one. A small separate gateway in the same repository solves this. Alternative: a custom Next.js server that also hosts WebSockets, which works only on an always-on host and ties the two together. Recommendation: separate gateway. This depends on hosting (O2).

**D2: The agent runs only a fixed list of commands.** The gateway never sends a shell string to the agent. Each command type has a handler, a parameter schema and a permission level. This is what keeps a compromised web account from becoming arbitrary code execution on the Mac (REQ-19). The terminal in Phase 3 is the one deliberate exception and has extra gates (REQ-17).

**D3: Confirmation is enforced on the server.** The UI dialog is a convenience. The server rejects destructive commands without a valid confirmation record (REQ-5).

**D4: Files are relayed, not stored.** File downloads and uploads stream through the gateway and are never saved on the server (REQ-6). Alternative: a temporary object store. Open decision to revisit if large or resumable transfers matter.

**D5: One shared protocol package.** The web app, gateway and agent import the same message type definitions and validation schemas from one shared package, so a change to a command shows up as a compile error everywhere.

## 3. Components

#### COMP-1 Web app (Next.js)

- **Responsibility:** login, device list and detail pages, issuing commands, showing results, audit log, settings.
- **Does not:** hold agent connections, run any command on the Mac, or store file contents.
- **Pages (proposed):** `/login`, `/devices`, `/devices/[id]` with tabs for Overview, Files, Processes and Controls, `/pair`, `/audit`, `/settings`.
- **shadcn components likely used:** Card, Button, Badge, Tabs, Table, Dialog and AlertDialog (confirmations), Sheet (mobile menu), Slider (volume), Toast, Skeleton, Form and Input.
- **Layout:** mobile-first, with a bottom or collapsible navigation on small screens (REQ-18).
- **Authentication:** Google and email/password through an auth library that supports both. Auth.js is the likely candidate; confirm that its credentials flow fits your session needs before committing. The user record carries an array of linked sign-in methods so passkeys can be added later (REQ-1, REQ-21).
- **Single-owner mode:** a configured owner email allowlist blocks sign-up by anyone else (REQ-1).

#### COMP-2 Gateway (Node, WebSocket)

- **Responsibility:** authenticate agents (device token) and browsers (short-lived ticket), track presence, route commands to the right agent, route results back, enforce confirmation and ownership checks, write audit entries, rate-limit.
- **Does not:** execute commands, render UI, or keep file contents.
- **Browser authentication:** the web app issues a short-lived signed ticket to a logged-in user. The browser presents it when opening its WebSocket to the gateway. The gateway checks it and learns the user ID.
- **Presence:** an in-memory map of connected devices plus `lastSeenAt` written to MongoDB at a modest interval, not on every heartbeat.
- **Scaling note:** one gateway process is enough for version 1. If it ever runs as several processes, presence and routing need a shared layer; that is out of scope now.

#### COMP-3 Agent (Node, macOS)

- **Responsibility:** keep the connection to the gateway, run command handlers, sample stats, enforce folder allowlist, report capabilities and version.
- **Does not:** listen on any port, accept unknown commands, or run server-provided strings in a shell.
- **Internal modules:**
  - Connection manager: connect, authenticate with the device token, heartbeat every 10 seconds, reconnect with increasing delay.
  - Dispatcher: validates each incoming command against its schema, then calls the handler.
  - Handlers: power, files, stats, processes, screenshot, audio and display, notify, launch and scripts. Later: scheduler, screen, terminal.
  - Config store: gateway URL, device ID, allowlisted folders, registered scripts. The device token is stored separately (O4).
  - Logger: errors to a local log file.
- **Pairing mode:** a one-time command-line step that submits the pairing code and saves the returned device token.
- **Auto-start:** a launchd LaunchAgent (see section 7).

#### COMP-4 MongoDB

- Holds the collections in section 6.
- Used by the web app and the gateway. The agent never talks to it directly.
- Hosting (Atlas or self-hosted) is part of O2.

## 4. Data flows

#### Flow 1: Pairing (REQ-2)

1. Owner logs in and opens `/pair`. The web app asks the API to create a pairing code.
2. The API stores a hash of the code with an expiry of 10 minutes and shows the code once.
3. Owner runs the agent's pairing step on the Mac and types the code.
4. The agent sends the code to the gateway or API over TLS.
5. The server checks hash, expiry, unused and attempt limits. On success it creates the device, generates a random device token, stores only its hash, marks the code used, and returns the token once.
6. The agent saves the token and connects normally.
7. The pairing is written to the audit log.

#### Flow 2: Command (REQ-3, REQ-4, REQ-20)

1. Owner taps an action on the device page.
2. The browser sends a command request over its WebSocket (or an authenticated API call) with a new command ID.
3. The gateway checks: session valid, user owns the device, device online, command type allowed, parameters valid, rate limit, and confirmation present if destructive.
4. The gateway writes an audit entry as pending, forwards the command to the agent.
5. The agent validates again, runs the handler, and replies with a result or error.
6. The gateway updates the audit entry, and sends the result to the browser.
7. If no result arrives within the command's timeout, the gateway records and reports a timeout.

Command IDs make retries safe: the agent ignores a command ID it already completed.

#### Flow 3: Destructive action confirmation (REQ-5)

1. Browser requests a confirmation for an action and device.
2. Server creates a confirmation record bound to user, device, action and parameters, valid for 30 seconds and one use. If re-authentication is enabled (O5), it is required here.
3. The UI shows the AlertDialog. On confirm, the command is sent with the confirmation ID.
4. The gateway consumes the confirmation. A second use fails.

#### Flow 4: Live stats (REQ-7)

1. When a device page opens, the browser subscribes to that device's stats.
2. The gateway tells the agent to start sampling, about every 2 seconds.
3. Stats flow agent to gateway to subscribed browsers.
4. When the last subscriber leaves, the gateway tells the agent to stop.

#### Flow 5: File download (REQ-6)

1. Browser requests a file path on a device.
2. The gateway checks ownership and online status, then asks the agent to open the file.
3. The agent resolves the real path, checks it is inside an allowlisted folder, checks size against the limit, and starts sending chunks.
4. The gateway streams chunks to the browser's HTTP response, without saving them.
5. If the browser disconnects, the gateway tells the agent to stop. Upload follows the reverse path; the agent writes to a temporary name and renames on success, removing it on failure.

#### Flow 6: Presence (REQ-3)

1. Agent connects and sends version and capabilities. The gateway marks the device online.
2. Heartbeats arrive every 10 seconds. After three missed heartbeats, or on socket close, the gateway marks the device offline and stores `lastSeenAt`.
3. Browsers watching the device receive status changes.

## 5. Protocol

All messages are JSON with a version number and a shared envelope.

**Envelope fields:** protocol version, message type, message ID, device ID, timestamp, payload.

**Agent to gateway:** hello (token, agent version, capabilities), heartbeat, stats, command result, command error, file chunk, file end, script list, app list.

**Gateway to agent:** command (command ID, type, parameters, confirmation ID if needed), cancel, stats subscribe and unsubscribe, config update (allowlist).

**Browser to gateway:** subscribe to device, command request, confirmation request, cancel.

**Gateway to browser:** device status, stats, command result, command error, confirmation challenge.

**Command types by phase:**

- Phase 1: `power.lock`, `power.sleep`, `power.restart`, `power.shutdown`, `files.list`, `files.download`, `files.upload`, `stats.start`, `stats.stop`, `config.setAllowlist`
- Phase 2: `process.list`, `process.kill`, `screen.capture`, `audio.setVolume`, `audio.setMute`, `display.setBrightness`, `media.control`, `notify.show`, `app.list`, `app.launch`, `script.list`, `script.run`
- Phase 3: `schedule.*`, `screen.start`, `screen.stop`, `input.*`, `terminal.*`

Every command type has: a parameter schema, a timeout, a destructive flag, a required macOS permission list, and a phase.

**Error codes (proposed):** `DEVICE_OFFLINE`, `NOT_OWNER`, `INVALID_PARAMS`, `CONFIRMATION_REQUIRED`, `CONFIRMATION_INVALID`, `PATH_NOT_ALLOWED`, `PERMISSION_MISSING`, `UNSUPPORTED`, `TIMEOUT`, `TOO_LARGE`, `RATE_LIMITED`, `INTERNAL`.

## 6. Data model (MongoDB)

**users**

- id, email, name, role (`owner` or `user`), status
- authMethods: list of linked sign-in methods (Google ID, password, later passkey credentials)
- passwordHash (only if a password is set)
- createdAt, lastLoginAt

**devices**

- id, userId, name, platform, osVersion, chip, agentVersion
- tokenHash, pairedAt, revokedAt
- status, lastSeenAt
- allowedFolders (list of absolute paths)
- capabilities (what the agent reported as supported)

**pairingCodes**

- id, userId, codeHash, expiresAt, usedAt, failedAttempts
- Expiry index so old codes are removed automatically.

**confirmations**

- id, userId, deviceId, action, parameter hash, expiresAt, usedAt
- Expiry index.

**auditLogs**

- id, userId, deviceId, action, parameters (redacted), result, errorCode, ip, userAgent, createdAt
- Index on user and time, and on device and time. The app exposes no update or delete.

**scheduledActions** (Phase 3)

- id, userId, deviceId, action, parameters, schedule, enabled, lastRunAt, nextRunAt

Saved scripts and the folder allowlist live primarily on the Mac. The server keeps a copy of names and IDs reported by the agent for display only.

Every query that returns user data filters by the signed-in user's ID. This is what makes multi-user safe later (REQ-21).

## 7. macOS integration

Status key: **Candidate** means a likely mechanism that I have not verified on your Mac. **Spike** means a task in the plan tests it first.

- **Lock screen:** candidates are a private session utility whose behavior varies by macOS version, or turning the display off with `pmset displaysleepnow` combined with the system setting that requires a password immediately after sleep. Spike 0.2.
- **Sleep:** `pmset sleepnow`. Candidate.
- **Restart and shutdown:** AppleScript through System Events, which needs Automation permission, or `shutdown` which needs root. Spike 0.3.
- **Stats:** Node's built-in `os` module plus a system-information library such as `systeminformation`; battery may need `pmset -g batt`. Candidate.
- **Processes:** the `ps` command or the same library. Killing uses a signal; protected processes will refuse.
- **Screenshot:** the `screencapture` command. Needs Screen Recording permission for the process that launches it. Spike 0.4.
- **Volume and mute:** AppleScript `set volume`. Candidate.
- **Brightness:** macOS has no stock command line control; third-party tools exist and behavior varies by hardware and macOS version. If it is unreliable, the feature is dropped. Spike 0.5.
- **Media control:** AppleScript to specific apps such as Music or Spotify, not system-wide. Spike 0.5.
- **Notification:** AppleScript `display notification`. Candidate.
- **Launch apps:** `open -a`. Candidate.
- **File access:** macOS privacy protection may block Desktop, Documents and Downloads unless the process that runs the agent is granted access. Spike 0.6.
- **Remote screen and input (Phase 3):** need Screen Recording and Accessibility permissions.
- **Auto-start:** a LaunchAgent property list in the user's `Library/LaunchAgents` folder, set to run at load and restart on exit. It runs inside your login session, which is why GUI actions like lock and screenshot can work, and also why it does not run before login (A4). A LaunchDaemon runs at boot but outside the GUI session, so it is not the default choice.
- **Node under launchd:** the launch definition needs an absolute path to the Node binary. How Node is installed on your Mac (a version manager, Homebrew, or a bundled copy) affects that path. See O1 and task 1.1.
- **Permissions are granted to a specific program.** If the agent is run by launchd through Node, the permission list in System Settings shows that program. Moving or upgrading Node can reset a grant. The install guide must say what to approve and when.

## 8. Security design

- **Transport:** TLS everywhere; the agent refuses to connect over an unencrypted URL.
- **Device token:** at least 256 bits of randomness; stored hashed on the server; stored on the Mac in Keychain or a mode-restricted file (O4); revocation closes the live connection.
- **Browser sessions:** HTTP-only, secure cookies; CSRF protection on state-changing requests; ticket for the WebSocket is short-lived and single-use.
- **Authorization:** every command checks that the user owns the device. There are no global admin shortcuts in version 1.
- **Input validation:** every message is validated against its schema on the gateway and again on the agent.
- **Paths:** resolve to the real path (following symbolic links), then compare with the allowlist using whole path segments, not string prefixes.
- **No shell with server strings:** handlers call fixed commands with arguments passed as arguments, never concatenated into a shell line.
- **Scripts:** run only scripts registered locally on the Mac, by ID, with a timeout and an output limit.
- **Rate limits:** login, pairing, command issue and file requests.
- **Audit:** written before the command is sent, then updated with the result; secrets are redacted.
- **Revocation and kill switch:** revoking a device or signing out all sessions is one action from the web app.
- **Threat model note:** the main risks are a stolen web session, a leaked device token, and a bug in path handling. The design addresses them with confirmation and optional re-authentication, hashed revocable tokens, and allowlist checks on the agent. A formal threat model can be written as an optional extra.

## 9. Error handling

- **Device offline:** reject immediately; never queue destructive commands (REQ-3).
- **Timeout:** each command type has a timeout; the result is recorded as timed out and the UI says the outcome is unknown, because the action may still have happened.
- **Agent disconnect mid-transfer:** the agent removes partial files; the browser sees a failed transfer.
- **Missing macOS permission:** the handler returns `PERMISSION_MISSING` with which permission and where to grant it.
- **Gateway restart:** agents reconnect with increasing delay and a small random offset to avoid all reconnecting at once; presence rebuilds from hello messages.
- **Duplicate commands:** ignored by command ID.

## 10. Testing strategy

- **Unit:** path validation (including `..` and symbolic links), schema validation, pairing code rules, confirmation rules, rate limiting.
- **Integration:** gateway with a fake agent covering pairing, presence, commands, timeouts, revocation, and ownership checks between two test users.
- **Real Mac checklist:** each macOS action run manually on your machine after every macOS update and after Node upgrades.
- **Security tests:** expired and reused pairing codes, revoked token, replayed confirmation, access to another user's device, path escape attempts.
- **UI:** manual check on a phone and on a desktop browser against the requirements in REQ-18.

## 11. Deployment

- **Gateway:** an always-on host that supports WebSockets and TLS. Options depend on O2.
- **Web app:** the same host or a separate one. Both must agree on the auth secret and the ticket signing key.
- **Database:** MongoDB Atlas or self-hosted (O2). Restrict network access and use a dedicated database user.
- **Configuration:** environment variables for database URL, auth secret, Google client ID and secret, gateway URL, owner email allowlist, ticket signing key.
- **Agent distribution:** a script that installs the agent folder, writes the LaunchAgent file, and loads it; and one that removes it. A packaged single file is a later option.
- **Monitoring:** basic logs from gateway and agent; alerts are optional later.

## 12. System boundaries

**In scope:** one owner, one or more Macs by design but one by testing, Phases 1 to 3 as planned.

**Out of scope:** Windows and Linux, native mobile app, passkeys, public sign-up, anything that must work while the Mac is off, acting before login.

**Assumptions:** the Mac has an internet connection while the owner is away, the owner can grant macOS permissions on the Mac once, and a host for the gateway is available.

## 13. Open decisions affecting design

- O1 macOS version and chip; O2 hosting; O3 off-network access; O4 token storage; O5 re-authentication; O6 offline scheduled actions policy; O7 audit retention; O8 terminal audit detail; O9 2FA for password login; O10 live screen in MVP.
- D1 and D4 above are recommendations awaiting your agreement.
