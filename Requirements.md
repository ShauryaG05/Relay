# Laptop Remote Control: Requirements

Version 0.1, draft. Written from your answers so far. Anything marked Assumption or Open decision is not confirmed by you yet. Companion docs: Laptop Remote Control: Design, and Laptop Remote Control: Implementation Plan.

## 1. Introduction

Laptop Remote Control is a web app that lets its owner operate their own Mac from a phone browser or any other browser. A small Node agent runs on the Mac, keeps an outbound connection to a server, and carries out a fixed list of approved actions requested from the web app. Version 1 serves one owner and one Mac. The design must not block adding more users and devices later.

## 2. Confirmed decisions

- Target OS: macOS
- Frontend: Next.js with Tailwind CSS and shadcn components
- Database: MongoDB
- Login: Google sign-in and custom email/password; passkeys later
- Agent: Node
- Client: mobile web app (a responsive website, not a native app)
- Audience: you first, other people later
- Feature list: as agreed in the earlier messages

## 3. Assumptions to confirm

- **A1:** The server is reachable from the internet, so your phone works away from home Wi-Fi. The agent connects outward to it, so no router port forwarding is needed.
- **A2:** Pairing uses a one-time code that expires, not a permanent account code. A permanent code that leaks would let someone attach a device to your account.
- **A3:** Version 1 manages one Mac, but devices are stored separately from users so more can be added.
- **A4:** The agent runs as your logged-in macOS user. It starts at login, not at the login window, so it cannot act while the Mac is at the login screen, shut down, or asleep with the network off.
- **A5:** Delivery is phased: Phase 1 MVP, Phase 2 extras, Phase 3 advanced.
- **A6:** Your macOS version and chip (Intel or Apple Silicon) are not known yet. Some actions depend on them.

Numeric targets below (seconds, attempt counts, size limits) are proposals for you to adjust.

## 4. Glossary

- **Owner:** the person who owns the account and the Mac.
- **Web app:** the Next.js site used from phone or browser.
- **Gateway:** the always-on Node server that relays messages between web app and agent.
- **Agent:** the Node program on the Mac that executes approved actions.
- **Device:** one paired Mac.
- **Pairing code:** a one-time, expiring code that links an agent to an account.
- **Device token:** a long-lived secret the agent receives after pairing and uses to authenticate.
- **Command:** one request from the web app to the agent, such as lock or list a folder.
- **Destructive action:** a command that interrupts the user's work or deletes or ends something: restart, shutdown, kill process, and similar.
- **Allowlisted folder:** a folder the file browser is permitted to expose.
- **Saved script:** a script registered on the Mac and triggered from the web app by its ID.
- **Audit log:** an append-only record of every action taken.

## 5. Functional requirements

### Phase 1: MVP

#### REQ-1 Login

**User story:** As the owner, I want to sign in with Google or with email and password, so that only I can reach my devices.

Acceptance criteria:

- WHEN a visitor signs in with Google, THE system SHALL open the matching account or create it if allowed.
- WHEN a visitor registers with email and password, THE system SHALL store only a salted hash of the password.
- WHILE the system is in single-owner mode, THE system SHALL reject sign-up from any email not on the owner allowlist.
- WHEN a user signs out, THE system SHALL invalidate that session.
- IF there are 5 failed password attempts for an account within 15 minutes, THEN THE system SHALL block further attempts for that account for a cooling-off period.
- THE user data model SHALL allow passkeys to be added later without migrating existing accounts.

#### REQ-2 Device pairing

**User story:** As the owner, I want to link my Mac to my account with a code, so that only devices I approve can connect.

Acceptance criteria:

- WHEN a logged-in user requests pairing, THE system SHALL generate a one-time code that expires after 10 minutes.
- WHEN the agent submits a valid unused code, THE system SHALL create a device record, return a device token once, and mark the code used.
- IF a code is expired, already used, or wrong, THEN THE system SHALL reject it without revealing which condition applied.
- IF 5 wrong codes are submitted for one account, THEN THE system SHALL lock pairing for that account for a cooling-off period.
- THE system SHALL store only a hash of the device token and of pairing codes.
- WHEN the owner revokes a device, THE gateway SHALL disconnect that agent and refuse its token from then on.

#### REQ-3 Connection and presence

**User story:** As the owner, I want to see whether my Mac is online and when it was last seen, so that I know whether commands can work.

Acceptance criteria:

- THE agent SHALL send a heartbeat every 10 seconds.
- IF three heartbeats are missed, THEN THE system SHALL show the device as offline.
- THE web app SHALL show online or offline status and the last-seen time for each device.
- WHEN the connection drops, THE agent SHALL reconnect automatically with increasing delay between attempts.
- IF a command targets an offline device, THEN THE system SHALL reject it immediately with a clear message and SHALL NOT queue destructive commands.

#### REQ-4 Power actions

**User story:** As the owner, I want to lock, sleep, restart or shut down my Mac remotely, so that I can secure or power it down when I am away.

Acceptance criteria:

- WHEN the owner requests lock, THE agent SHALL lock the screen so a password is needed to continue.
- WHEN the owner requests sleep, THE agent SHALL put the Mac to sleep.
- WHEN the owner requests restart or shutdown, THE agent SHALL perform it only after confirmation (REQ-5).
- THE web app SHALL show the result of each command: accepted, completed, failed, or timed out.
- IF the Mac cannot perform an action (for example a missing macOS permission), THEN THE agent SHALL return an error that names the cause.

Note: how lock, restart and shutdown are done reliably on your macOS version needs a test on your machine. See task 0.2 and 0.3 in the plan.

#### REQ-5 Confirmation for destructive actions

**User story:** As the owner, I want a confirmation step for risky actions, so that a mis-tap or a stolen session cannot cause damage.

Acceptance criteria:

- WHEN the owner requests a destructive action, THE web app SHALL show a confirmation dialog naming the action and the device.
- THE server SHALL enforce confirmation: a destructive command without a valid, unexpired confirmation SHALL be rejected, regardless of what the client sends.
- A confirmation SHALL be valid for 30 seconds and for one command only.
- WHERE re-authentication is enabled for destructive actions, THE system SHALL require it before issuing the confirmation. (Open decision O5.)

#### REQ-6 File browser

**User story:** As the owner, I want to browse folders on my Mac and move files to and from it, so that I can get a file without being at the laptop.

Acceptance criteria:

- THE agent SHALL expose only folders on the owner's allowlist and their contents.
- WHEN a path is requested, THE agent SHALL resolve it to its real location and reject it if it falls outside every allowlisted folder, including via `..` or symbolic links.
- WHEN the owner opens a folder, THE web app SHALL list names, type, size and modified time, and SHALL show up to 1000 entries within 2 seconds on a normal connection.
- WHEN the owner downloads a file, THE system SHALL stream it to the browser without storing it on the server.
- WHEN the owner uploads a file, THE agent SHALL write it only inside an allowlisted folder and SHALL NOT overwrite an existing file without confirmation.
- THE system SHALL enforce a configurable maximum transfer size, proposed default 500 MB.
- IF a transfer fails or is cancelled, THEN THE agent SHALL remove any partial file.
- THE owner SHALL be able to add and remove allowlisted folders from the web app, and THE agent SHALL apply the change only after the device acknowledges it.
- IF macOS privacy settings block access to a folder, THEN THE agent SHALL report that clearly.

#### REQ-7 Live system stats

**User story:** As the owner, I want to see CPU, memory, disk, battery and network use, so that I can check my Mac's health remotely.

Acceptance criteria:

- WHILE a device page is open, THE agent SHALL send stats about every 2 seconds.
- WHILE no one is viewing, THE agent SHALL NOT stream stats continuously.
- THE stats SHALL include CPU load, memory used and total, disk used and total, battery level and charging state, and network throughput.
- IF the Mac has no battery, THEN THE web app SHALL hide battery information instead of showing an error.

#### REQ-8 Audit log

**User story:** As the owner, I want a record of every action, so that I can see what happened and when.

Acceptance criteria:

- THE system SHALL record user, device, action type, parameters, result, time, IP address and browser for every command, login, pairing and revocation.
- THE system SHALL NOT record file contents, passwords, tokens or pairing codes.
- THE audit log SHALL be append-only through the app; no screen or API SHALL edit or delete entries.
- THE web app SHALL show the log newest first with filters by device, action and date.
- Retention period: Open decision O7.

#### REQ-9 Agent lifecycle on macOS

**User story:** As the owner, I want the agent to start automatically and stay running, so that I never have to launch it by hand.

Acceptance criteria:

- THE agent SHALL start automatically when the owner logs in to macOS.
- IF the agent crashes, THEN THE system SHALL restart it automatically.
- THE project SHALL provide an install step and an uninstall step for the auto-start setup.
- THE agent SHALL log its own errors to a local file on the Mac.
- THE agent SHALL report its version to the gateway on connect.

#### REQ-18 Mobile web app

**User story:** As the owner, I want a layout that works well on my phone, so that I can use it away from the laptop.

Acceptance criteria:

- THE web app SHALL be usable at a 360 px wide screen without horizontal scrolling.
- THE primary actions (lock, sleep, status) SHALL be reachable within two taps from the device page.
- THE controls SHALL be large enough for touch input.
- THE web app SHALL support light and dark themes.

### Phase 2: Useful extras

#### REQ-10 Process manager

**User story:** As the owner, I want to see and stop running processes, so that I can recover from a stuck app.

Acceptance criteria:

- THE web app SHALL list processes with name, ID, CPU and memory use, sortable by CPU and memory.
- WHEN the owner kills a process, THE system SHALL require confirmation (REQ-5).
- IF the process belongs to the system or another user, THEN THE agent SHALL refuse and say why.

#### REQ-11 Screenshot

**User story:** As the owner, I want a screenshot on demand, so that I can see what the Mac is showing.

Acceptance criteria:

- WHEN the owner requests a screenshot, THE agent SHALL capture the screen and return the image.
- THE system SHALL NOT store screenshots on the server after delivery.
- IF macOS Screen Recording permission is missing, THEN THE agent SHALL return an error that explains how to grant it.
- THE system SHALL record each screenshot request in the audit log.

#### REQ-12 Volume, brightness and media

**User story:** As the owner, I want to change volume, brightness and playback remotely.

Acceptance criteria:

- THE web app SHALL let the owner set volume and mute.
- WHERE brightness control works on the owner's Mac, THE web app SHALL let the owner set it. Feasibility is unconfirmed; see task 0.5.
- WHERE a supported media app is running, THE web app SHALL offer play, pause, next and previous. Which apps are supported is decided after task 0.5.
- IF a control is unsupported on this Mac, THEN THE web app SHALL hide it instead of showing a broken control.

#### REQ-13 Notifications

**User story:** As the owner, I want to send a message that pops up on the Mac.

Acceptance criteria:

- WHEN the owner sends a message, THE agent SHALL show it as a macOS notification.
- THE message length SHALL be limited to a configurable maximum.

#### REQ-14 Launch apps and run saved scripts

**User story:** As the owner, I want to open apps and trigger my own scripts, so that I can start routine tasks remotely.

Acceptance criteria:

- THE web app SHALL let the owner launch an installed app chosen from a list reported by the agent.
- Saved scripts SHALL be registered on the Mac itself, in the agent's local configuration. THE web app SHALL trigger a script only by its ID.
- THE web app SHALL NOT send script text or shell commands to the agent in Phase 1 or Phase 2.
- THE agent SHALL return the script's exit status and a limited amount of output.
- THE agent SHALL stop a script that runs longer than a configurable timeout.

### Phase 3: Advanced

#### REQ-15 Scheduled actions

**User story:** As the owner, I want actions to run at set times, such as shutdown at midnight.

Acceptance criteria:

- THE owner SHALL be able to create, edit, pause and delete schedules for permitted actions.
- WHEN a scheduled time arrives, THE system SHALL run the action and record it in the audit log.
- IF the device is offline at the scheduled time, THEN THE system SHALL follow the policy chosen in Open decision O6.
- Destructive scheduled actions SHALL require confirmation at creation time.

#### REQ-16 Live screen view and remote input

**User story:** As the owner, I want to see my Mac's screen and control its mouse and keyboard.

Acceptance criteria:

- THE agent SHALL stream the screen only after an explicit start from the owner and SHALL stop when the owner stops or the session ends.
- THE Mac SHALL show a visible indicator while a session is active. Feasibility to be checked.
- THE agent SHALL send mouse and keyboard input only while a session is active.
- IF macOS Screen Recording or Accessibility permission is missing, THEN THE agent SHALL report which one.
- Frame rate and latency targets are set after a technical spike.

#### REQ-17 Remote terminal

**User story:** As the owner, I want a shell on my Mac in the browser.

Acceptance criteria:

- THE terminal SHALL be disabled by default and enabled per device in the Mac's local agent configuration, not only from the web app.
- THE system SHALL require re-authentication before opening a terminal session.
- THE system SHALL close idle sessions after a configurable timeout.
- THE audit log SHALL record session start, end and device. Whether it also records typed commands: Open decision O8.

## 6. Non-functional requirements

#### REQ-19 Security

- All traffic between browser, gateway and agent SHALL use TLS.
- THE agent SHALL execute only command types from a fixed list. It SHALL validate every parameter and ignore unknown commands.
- THE agent SHALL NOT pass server-provided strings to a shell in Phase 1 or Phase 2.
- Device tokens SHALL be revocable and SHALL be stored on the Mac in a protected location (Open decision O4).
- THE gateway SHALL rate-limit login, pairing and command requests.
- Session cookies SHALL be HTTP-only and secure, and state-changing requests SHALL be protected against cross-site request forgery.
- Secrets SHALL come from environment variables and SHALL NOT be committed to source control.
- Every command SHALL be checked against the signed-in user's ownership of the target device.

#### REQ-20 Reliability and performance

- THE gateway SHALL deliver a command to an online agent and return an acknowledgement within 3 seconds under normal conditions.
- THE agent SHALL use little enough CPU and memory when idle that it is not noticeable during normal use. A measured budget is set after the first build.
- THE system SHALL handle a restart of the gateway: agents reconnect and statuses recover without manual action.

#### REQ-21 Extensibility (planned, not in version 1)

- THE data model SHALL support several users, each with several devices, with strict isolation between users.
- THE login layer SHALL allow adding passkeys later.
- THE protocol SHALL be versioned so agents and gateway can be updated separately.

## 7. Out of scope for version 1

- Multiple users or public sign-up
- Passkeys
- Windows and Linux agents
- A native mobile app
- Wake-on-LAN and anything that works while the Mac is off
- Two-way file sync
- Acting at the macOS login window before login

## 8. Open decisions

- **O1:** Which macOS version and chip does your Mac use?
- **O2:** Where will the gateway and Next.js be hosted?
- **O3:** Is access from outside your home network required? (Assumed yes in A1.)
- **O4:** Where should the device token live on the Mac: Keychain or a restricted file?
- **O5:** Should destructive actions require re-authentication, or only the confirmation dialog?
- **O6:** If a scheduled action's time passes while the Mac is offline: skip it, or run it when the Mac returns?
- **O7:** How long should audit logs be kept?
- **O8:** Should the terminal audit record typed commands?
- **O9:** Is 2FA wanted for custom email/password login before passkeys arrive?
- **O10:** Should live screen view be pulled into the MVP? (Assumed no.)
