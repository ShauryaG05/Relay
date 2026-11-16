const express = require("express");
const app = express();

// Enable JSON & URL-encoded parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// CORS middleware to allow view dashboard connection
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// In-memory devices state
const connectedDevices = [
  {
    id: "mac-pro-01",
    name: "Shaurya's MacBook Pro",
    type: "laptop",
    os: "macOS Sequoia 15.2",
    arch: "Apple M3 Max",
    ip: "192.168.1.142",
    status: "online",
    ping: 12,
    battery: { level: 88, charging: true },
    cpu: { load: 24, temp: 42 },
    memory: { used: 18.2, total: 36, unit: "GB" },
    disk: { used: 310, total: 1000, unit: "GB" },
    uptime: "4d 18h 32m",
    audio: { muted: false, volume: 65 },
    screen: { brightness: 80, blank: false }
  },
  {
    id: "win-desktop-02",
    name: "Studio Workstation PC",
    type: "desktop",
    os: "Windows 11 Pro",
    arch: "Intel Core i9-14900K / RTX 4090",
    ip: "192.168.1.108",
    status: "online",
    ping: 18,
    battery: null,
    cpu: { load: 58, temp: 64 },
    memory: { used: 38.6, total: 64, unit: "GB" },
    disk: { used: 1420, total: 2000, unit: "GB" },
    uptime: "11d 04h 10m",
    audio: { muted: true, volume: 40 },
    screen: { brightness: 100, blank: false }
  }
];

const auditLogs = [];

// Base route
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "Relay Control Hub API",
    version: "2.4.0",
    activeAgents: connectedDevices.length
  });
});

// Legacy lock endpoint (preserves backwards compatibility)
app.post("/lock", (req, res) => {
  const logEntry = {
    id: Date.now(),
    action: "LOCK",
    target: "mac-pro-01",
    message: "Lock command successfully dispatched to target daemon",
    timestamp: new Date().toISOString(),
    latency: Math.floor(Math.random() * 12) + 8
  };
  auditLogs.unshift(logEntry);
  res.json({
    success: true,
    action: "lock",
    message: "Lock command dispatched to remote agent.",
    log: logEntry
  });
});

// Unified remote action endpoint
app.post("/api/action", (req, res) => {
  const { action, deviceId = "mac-pro-01", params = {} } = req.body;

  if (!action) {
    return res.status(400).json({ error: "Missing required 'action' parameter." });
  }

  const actionDescriptions = {
    lock: "Device locked successfully. Lock screen engaged.",
    restart: "System reboot sequence initiated on host OS.",
    shutdown: "System shutdown signal transmitted to host.",
    sleep: "Host placed in low-power S3 suspend state.",
    logout: "Active graphical session terminated.",
    killswitch: "Emergency killswitch triggered: network severed and session locked.",
    mute: `Audio output ${params.muted ? "muted" : "unmuted"}.`,
    volume: `Master volume set to ${params.volume ?? 50}%.`,
    brightness: `Display backlight adjusted to ${params.brightness ?? 80}%.`,
    screen_blank: `Display output ${params.blank ? "blanked" : "restored"}.`,
    wol: "Wake-on-LAN Magic Packet broadcast across local subnet.",
    clipboard: "Remote clipboard content updated successfully.",
    dnd: `Do Not Disturb mode ${params.dnd ? "enabled" : "disabled"}.`,
    screenshot: "Remote desktop frame captured."
  };

  const message = actionDescriptions[action] || `Remote action [${action.toUpperCase()}] executed.`;
  const latency = Math.floor(Math.random() * 14) + 9;

  const logEntry = {
    id: Date.now(),
    action: action.toUpperCase(),
    target: deviceId,
    message,
    timestamp: new Date().toISOString(),
    latency
  };

  auditLogs.unshift(logEntry);
  if (auditLogs.length > 50) auditLogs.pop();

  res.json({
    success: true,
    action,
    deviceId,
    message,
    latency,
    timestamp: new Date().toISOString()
  });
});

// List connected devices & telemetry
app.get("/api/devices", (req, res) => {
  res.json(connectedDevices);
});

// List recent activity audit logs
app.get("/api/logs", (req, res) => {
  res.json(auditLogs);
});

// Remote terminal execution
app.post("/api/exec", (req, res) => {
  const { command, deviceId } = req.body;
  if (!command) {
    return res.status(400).json({ error: "No command provided" });
  }

  const trimmed = command.trim();
  let output = "";

  if (trimmed === "uptime") {
    output = `up 4 days, 18:32, 2 users, load average: 1.45, 1.22, 1.05`;
  } else if (trimmed.startsWith("ping")) {
    output = `PING 1.1.1.1: 56 data bytes\n64 bytes from 1.1.1.1: icmp_seq=0 ttl=57 time=11.4 ms\n64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=12.1 ms\n--- 1.1.1.1 ping statistics ---\n2 packets transmitted, 2 received, 0% loss`;
  } else if (trimmed === "whoami") {
    output = `root@relay-node-01 (elevated daemon session)`;
  } else if (trimmed.includes("flushdns")) {
    output = `Successfully flushed DNS resolver cache.`;
  } else if (trimmed === "top" || trimmed.startsWith("ps")) {
    output = `PID    COMMAND      %CPU  %MEM  STATE\n1429   relay-agent  0.4   0.8   running\n2310   kernel_task  8.2   4.1   sleeping\n842    WindowServer 4.1   3.5   running`;
  } else {
    output = `[Relay Agent on ${deviceId || "mac-pro-01"}]\n$ ${trimmed}\nCommand completed with exit status 0.`;
  }

  res.json({
    success: true,
    command: trimmed,
    output,
    timestamp: new Date().toLocaleTimeString()
  });
});

module.exports = app;
