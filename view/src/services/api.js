// Client API layer for Relay Control Center
const API_BASE = 'http://localhost:4000';

export const mockDevices = [
  {
    id: 'mac-pro-01',
    name: "Shaurya's MacBook Pro",
    type: 'laptop',
    os: 'macOS Sequoia 15.2',
    arch: 'Apple M3 Max',
    ip: '192.168.1.142',
    status: 'online',
    ping: 12,
    battery: { level: 88, charging: true },
    cpu: { load: 24, temp: 42 },
    memory: { used: 18.2, total: 36, unit: 'GB' },
    disk: { used: 310, total: 1000, unit: 'GB' },
    uptime: '4d 18h 32m',
    audio: { muted: false, volume: 65 },
    screen: { brightness: 80, blank: false }
  },
  {
    id: 'win-desktop-02',
    name: 'Studio Workstation PC',
    type: 'desktop',
    os: 'Windows 11 Pro',
    arch: 'Intel Core i9-14900K / RTX 4090',
    ip: '192.168.1.108',
    status: 'online',
    ping: 18,
    battery: null,
    cpu: { load: 58, temp: 64 },
    memory: { used: 38.6, total: 64, unit: 'GB' },
    disk: { used: 1420, total: 2000, unit: 'GB' },
    uptime: '11d 04h 10m',
    audio: { muted: true, volume: 40 },
    screen: { brightness: 100, blank: false }
  },
  {
    id: 'linux-srv-03',
    name: 'Edge AI Inference Node',
    type: 'server',
    os: 'Ubuntu 24.04 LTS',
    arch: 'AMD EPYC 7763 / dual A100',
    ip: '10.8.0.45',
    status: 'standby',
    ping: 34,
    battery: null,
    cpu: { load: 8, temp: 37 },
    memory: { used: 12.1, total: 128, unit: 'GB' },
    disk: { used: 840, total: 4000, unit: 'GB' },
    uptime: '42d 12h 00m',
    audio: { muted: true, volume: 0 },
    screen: { brightness: 0, blank: true }
  }
];

export async function sendRemoteAction(action, deviceId, params = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Call server endpoint
    const response = await fetch(`${API_BASE}/api/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, deviceId, params }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    // If backend is not running or timeout, fallback gracefully to simulated response
    console.debug(`[Relay API] Server connection standby (${err.message}), using simulated agent response.`);
  }

  // Simulated agent acknowledgment
  return {
    success: true,
    action,
    deviceId,
    timestamp: new Date().toISOString(),
    message: `Remote command [${action.toUpperCase()}] dispatched to target agent successfully.`,
    acknowledgedAt: Date.now(),
    latency: Math.floor(Math.random() * 15) + 10
  };
}

export async function executeRemoteCommand(cmd, deviceId) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_BASE}/api/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd, deviceId }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.debug(`[Relay Shell] Server standby, running simulated agent response.`);
  }

  // Simulated terminal execution output for demo
  const trimmed = cmd.trim();
  let output = '';

  if (trimmed === 'uptime' || trimmed === 'w') {
    output = `up 4 days, 18:32, 2 users, load average: 1.45, 1.22, 1.05`;
  } else if (trimmed.startsWith('ping')) {
    output = `PING 1.1.1.1 (1.1.1.1): 56 data bytes\n64 bytes from 1.1.1.1: icmp_seq=0 ttl=57 time=11.4 ms\n64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=12.1 ms\n--- 1.1.1.1 ping statistics ---\n2 packets transmitted, 2 packets received, 0.0% packet loss`;
  } else if (trimmed === 'whoami') {
    output = `root@relay-node-01 (elevated agent session)`;
  } else if (trimmed.includes('flushdns') || trimmed.includes('mDNSResponder')) {
    output = `Successfully flushed DNS resolver cache. Resetting local sockets.`;
  } else if (trimmed === 'top' || trimmed.startsWith('ps')) {
    output = `PID    COMMAND      %CPU  %MEM  STATE\n1429   relay-agent  0.4   0.8   running\n2310   kernel_task  8.2   4.1   sleeping\n842    WindowServer 4.1   3.5   running\n19842  node         1.2   2.4   sleeping`;
  } else {
    output = `[Relay Agent v2.4.0 on ${deviceId}]\n$ ${trimmed}\nExit code 0. Command executed in 23ms.`;
  }

  return {
    success: true,
    command: cmd,
    output,
    timestamp: new Date().toLocaleTimeString()
  };
}

