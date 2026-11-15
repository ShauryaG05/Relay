# Laptop Remote Control: Implementation Plan

Version 0.1, draft. Task breakdown for the requirements and design docs. Tasks are grouped into phases, each ending with something you can run and check. Task sizes are relative (S, M, L), not hours, because the stack and your pace are not known well enough to estimate time honestly.

The plan does not contain code. Each task says what to build and how to know it is done.

## 1. Scope boundaries

**Must have (MVP, Phases 0 to 4):** login, pairing, presence, power actions with confirmation, system stats, file browser with allowlist, audit log, auto-start on macOS, mobile-friendly UI.

**Nice to have (Phase 5):** process manager, screenshot, volume and media (brightness if feasible), notifications, launch apps and saved scripts.

**Later (Phase 6):** scheduled actions, live screen view and remote input, terminal.

**Future (Phase 7):** multi-user, passkeys.

**Out of scope:** Windows and Linux, native app, Wake-on-LAN, file sync, acting before login.

**Technical constraints:** Next.js, Tailwind, shadcn, MongoDB, Node agent, macOS only. The agent cannot run at the login window.

## 2. Phase 0: Decisions and macOS spikes

Goal: remove guesses before building. Each spike is a small throwaway test on your Mac, with the result written down.

- [ ] **0.1 Settle open decisions (S).** Answer O1 to O10 from the requirements doc, at least O1, O2, O3, O4. Done when each has an answer or a stated default. Traces to: all.
- [ ] **0.2 Spike: lock screen (S).** Find a method that actually locks your Mac and asks for a password, on your macOS version, when run as your user. Done when one method works reliably and the setting or permission it needs is written down. Traces to: REQ-4.
- [ ] **0.3 Spike: restart, shutdown, sleep (S).** Find what works without root, and which Automation permission is requested. Done when each action works from a launchd-started process. Traces to: REQ-4, REQ-9.
- [ ] **0.4 Spike: screenshot under launchd (S).** Confirm screen capture works when started by the background agent, and which program needs Screen Recording permission. Traces to: REQ-11.
- [ ] **0.5 Spike: brightness and media control (M).** Test whether brightness can be set reliably on your hardware, and which media apps can be controlled. Decide keep, limit or drop. Traces to: REQ-12.
- [ ] **0.6 Spike: file access under launchd (S).** Check whether the background agent can read Desktop, Documents and Downloads, and what grant is needed. Traces to: REQ-6.
- [ ] **0.7 Spike: Google sign-in and email/password in one auth setup (S).** Confirm the chosen auth library supports both with the session style you want. Traces to: REQ-1.

Phase 0 done when: spike results are written in a short notes file, and the design doc's macOS section is updated from candidates to confirmed or changed.

## 3. Phase 1: Foundation

Goal: a running skeleton with login and a database.

- [ ] **1.1 Repository setup (S).** One repository with four parts: web app, gateway, agent, and a shared package for protocol types and validation. Linting, formatting and a test runner configured. Node version pinned. Done when each part starts and the shared package imports in all three. Traces to: D5.
- [ ] **1.2 MongoDB connection and models (M).** Connection helper and the collections `users`, `devices`, `pairingCodes`, `confirmations`, `auditLogs` with indexes, including expiry indexes. Done when a test can create and read each record. Depends on: 1.1. Traces to: design section 6.
- [ ] **1.3 Shared protocol definitions (M).** Envelope, message types, command types for Phase 1, error codes, validation schemas. Done when invalid messages are rejected in unit tests. Depends on: 1.1. Traces to: REQ-19, REQ-21.
- [ ] **1.4 Authentication (L).** Google sign-in and email/password, sessions, sign-out, owner email allowlist, failed-attempt limiting, password hashing. Done when an allowed email can sign in both ways, a different email is refused, and the lockout works. Depends on: 0.7, 1.2. Traces to: REQ-1.
- [ ] **1.5 App shell (M).** shadcn setup, theme (light and dark), layout with mobile navigation, empty pages for devices, pairing, audit and settings, route protection. Done when pages are reachable only when signed in and look correct at 360 px wide. Depends on: 1.4. Traces to: REQ-18.

Phase 1 done when: you can sign in on your phone and see empty pages.

## 4. Phase 2: Connectivity and pairing

Goal: your Mac shows as online in the web app.

- [ ] **2.1 Gateway skeleton (M).** WebSocket server, agent authentication by device token, browser authentication by short-lived ticket, connection registry, structured logging. Done when a test agent and a test browser can connect and unauthenticated connections are refused. Depends on: 1.2, 1.3. Traces to: REQ-19.
- [ ] **2.2 Pairing code API and page (M).** Create a one-time code with 10-minute expiry, show it once, attempt limiting, hashed storage. Done when expired, reused and wrong codes are rejected without saying why. Depends on: 1.4, 1.5. Traces to: REQ-2.
- [ ] **2.3 Agent pairing step (M).** Command-line pairing that submits the code, receives the device token, and stores it by the chosen method (O4). Done when pairing succeeds once and the saved token works on reconnect. Depends on: 2.1, 2.2. Traces to: REQ-2, REQ-19.
- [ ] **2.4 Agent connection manager (M).** Connect, authenticate, send hello with version and capabilities, heartbeat every 10 seconds, reconnect with growing delay. Done when stopping and restarting the gateway makes the agent reconnect by itself. Depends on: 2.3. Traces to: REQ-3.
- [ ] **2.5 Presence and device pages (M).** Online and offline status, last seen, device list, device detail shell, live status updates in the browser. Done when unplugging the Mac's network shows offline within about 30 seconds. Depends on: 2.4. Traces to: REQ-3.
- [ ] **2.6 Revoke device (S).** Revoke action closes the live connection and the token stops working. Done when a revoked agent cannot reconnect. Depends on: 2.5. Traces to: REQ-2.

Phase 2 done when: you pair your real Mac and see it online on your phone.

## 5. Phase 3: MVP features

Goal: the core features work on your Mac.

- [ ] **3.1 Command pipeline (L).** Request, validation, ownership check, rate limit, forward, result, timeout, command ID de-duplication, audit entry before and after. Done when a harmless test command round-trips, and offline, invalid and timed-out cases return the right error code. Depends on: 2.5. Traces to: REQ-3, REQ-8, REQ-20.
- [ ] **3.2 Confirmation for destructive actions (M).** Confirmation records, AlertDialog, server enforcement, 30-second single-use rule, optional re-authentication hook. Done when a command without a valid confirmation is rejected even if sent directly. Depends on: 3.1. Traces to: REQ-5.
- [ ] **3.3 Power actions (M).** Lock, sleep, restart, shutdown using the methods confirmed in 0.2 and 0.3, with clear error messages for missing permission. Done when each works on your Mac and restart and shutdown need confirmation. Depends on: 3.2, 0.2, 0.3. Traces to: REQ-4.
- [ ] **3.4 System stats (M).** Sampler on the agent, subscribe and unsubscribe, live cards for CPU, memory, disk, battery and network, hidden battery when absent. Done when values match Activity Monitor roughly and streaming stops when the page closes. Depends on: 3.1. Traces to: REQ-7.
- [ ] **3.5 Folder allowlist (M).** Settings page to add and remove folders, config update to the agent with acknowledgement, local storage on the Mac. Done when changes apply only after the agent confirms. Depends on: 3.1. Traces to: REQ-6.
- [ ] **3.6 File listing (M).** Path resolution with symbolic link handling, whole-segment allowlist check, listing with size and date, clear error for blocked macOS folders. Done when path escape tests all fail safely. Depends on: 3.5, 0.6. Traces to: REQ-6.
- [ ] **3.7 Download and upload (L).** Streamed transfers through the gateway, size limit, cancel, temporary file then rename on upload, cleanup of partial files, overwrite confirmation. Done when a large file transfers without being stored on the server and a cancelled transfer leaves no partial file. Depends on: 3.6. Traces to: REQ-6.
- [ ] **3.8 Audit log page (M).** List newest first, filters by device, action and date, redaction rules in place, no edit or delete path. Done when every earlier action appears with correct details and no secrets. Depends on: 3.1. Traces to: REQ-8.
- [ ] **3.9 Auto-start on macOS (M).** Install and uninstall scripts for a LaunchAgent, absolute path to Node, restart on crash, local error log. Done when the agent is online after a reboot and login with no manual step, and killing the agent brings it back. Depends on: 2.4. Traces to: REQ-9.
- [ ] **3.10 Device page UI (M).** Overview with status and stats, quick actions reachable within two taps, Files tab. Done when the main actions work comfortably on your phone. Depends on: 3.3, 3.4, 3.7. Traces to: REQ-18.

Phase 3 done when: you can lock your Mac, check stats and download a file from your phone, with every action in the audit log.

## 6. Phase 4: MVP hardening and release

Goal: safe enough to leave running on your real machine.

- [ ] **4.1 Rate limiting across login, pairing, commands and files (S).** Traces to: REQ-19.
- [ ] **4.2 Security test pass (M).** Expired and reused codes, revoked token, replayed confirmation, another user's device, path escapes, malformed messages. Done when all are covered by automated tests and pass. Traces to: REQ-19.
- [ ] **4.3 Real Mac checklist (S).** Written step-by-step list covering every macOS action, run after reboot and after a Node upgrade. Traces to: REQ-4, REQ-9.
- [ ] **4.4 Deployment (M).** Host gateway, web app and database per O2, TLS, environment variables, Google OAuth redirect settings. Done when pairing works from outside your home network. Traces to: REQ-19, REQ-20.
- [ ] **4.5 Documentation (S).** Setup, pairing, macOS permissions, update and uninstall steps, recovery if the token is lost. Traces to: REQ-9.
- [ ] **4.6 Failure drills (S).** Restart the gateway, drop Wi-Fi mid-transfer, revoke while connected. Done when recovery matches the error-handling section of the design. Traces to: REQ-3, REQ-20.

Phase 4 done when: the MVP is deployed and you use it daily for a week without a security or reliability surprise.

## 7. Phase 5: Useful extras

Each task follows the command pipeline and ends with an audit entry. Build in this order.

- [ ] **5.1 Notifications (S).** Depends on: 3.1. Traces to: REQ-13.
- [ ] **5.2 Volume and mute (S).** Depends on: 3.1. Traces to: REQ-12.
- [ ] **5.3 Brightness and media control (M).** Only the parts that 0.5 showed to work. Unsupported controls hidden. Traces to: REQ-12.
- [ ] **5.4 Screenshot (M).** Returned to the browser and not stored. Clear message when Screen Recording permission is missing. Depends on: 0.4. Traces to: REQ-11.
- [ ] **5.5 Process manager (M).** List and sort, kill with confirmation, refuse protected processes. Depends on: 3.2. Traces to: REQ-10.
- [ ] **5.6 App launcher (S).** List reported by the agent. Traces to: REQ-14.
- [ ] **5.7 Saved scripts (M).** Registered locally on the Mac, run by ID only, timeout and output limit. No script text from the web app. Traces to: REQ-14, REQ-19.

Phase 5 done when: each extra works on your Mac and unsupported ones are hidden, not broken.

## 8. Phase 6: Advanced

Each item starts with a short spike and a design update before building.

- [ ] **6.1 Scheduled actions (L).** Needs decision O6, and a decision on whether the schedule runs on the gateway or on the agent. Traces to: REQ-15.
- [ ] **6.2 Live screen view and remote input (L).** Spike for frame rate and latency, visible session indicator, Screen Recording and Accessibility permissions, start and stop controls. Traces to: REQ-16.
- [ ] **6.3 Remote terminal (L).** Disabled by default and enabled only in local agent configuration, re-authentication, idle timeout, audit of sessions. Traces to: REQ-17.

## 9. Phase 7: Future

- [ ] **7.1 Multi-user mode (L).** Remove the owner-only sign-up restriction, verify isolation between users with tests, per-user limits. Traces to: REQ-21.
- [ ] **7.2 Passkeys (M).** Add passkey login to the existing auth setup. Traces to: REQ-1, REQ-21.

## 10. Dependency summary

- 0.x spikes can run in parallel with Phase 1.
- Phase 1 comes before Phase 2. Pairing needs both login and the gateway.
- Everything in Phase 3 needs the command pipeline (3.1).
- File tasks run in order: 3.5, 3.6, 3.7.
- Phase 5 items are independent of each other once 3.1 and 3.2 exist.
- Phase 6 starts only after Phase 4 has been used for a while.

## 11. Requirement traceability

- REQ-1: 0.7, 1.4, 7.2
- REQ-2: 2.2, 2.3, 2.6
- REQ-3: 2.4, 2.5, 3.1, 4.6
- REQ-4: 0.2, 0.3, 3.3
- REQ-5: 3.2
- REQ-6: 0.6, 3.5, 3.6, 3.7
- REQ-7: 3.4
- REQ-8: 3.1, 3.8
- REQ-9: 3.9, 4.3, 4.5
- REQ-10: 5.5
- REQ-11: 0.4, 5.4
- REQ-12: 0.5, 5.2, 5.3
- REQ-13: 5.1
- REQ-14: 5.6, 5.7
- REQ-15: 6.1
- REQ-16: 6.2
- REQ-17: 6.3
- REQ-18: 1.5, 3.10
- REQ-19: 1.3, 2.1, 4.1, 4.2, 4.4
- REQ-20: 3.1, 4.4, 4.6
- REQ-21: 1.3, 7.1, 7.2

## 12. Quality checklist

- [ ] Every requirement maps to at least one task (section 11).
- [ ] Every spike result is written back into the design doc.
- [ ] Every command has a schema, timeout, destructive flag and audit entry.
- [ ] Every macOS action was tested on the real Mac under launchd, not only from a terminal.
- [ ] No secret in source control.
