/**
 * Relay Agent Daemon
 * Runs on the host machine to execute remote commands from Relay Control Center
 */

const { exec } = require('child_process');
const os = require('os');

const platform = os.platform(); // 'darwin' (macOS), 'win32' (Windows), 'linux' (Linux)

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject({ error: error.message, stderr });
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

const commands = {
  // 1. Lock the device
  lock: async () => {
    if (platform === 'darwin') {
      // macOS: put display to sleep / lock
      return await runCommand('pmset displaysleepnow');
    } else if (platform === 'win32') {
      // Windows: Lock workstation
      return await runCommand('rundll32.exe user32.dll,LockWorkStation');
    } else {
      // Linux
      return await runCommand('loginctl lock-session || xdg-screensaver lock');
    }
  },

  // 2. Restart the system
  restart: async () => {
    if (platform === 'darwin') {
      return await runCommand("osascript -e 'tell app \"System Events\" to restart'");
    } else if (platform === 'win32') {
      return await runCommand('shutdown /r /t 5 /c "Relay remote reboot"');
    } else {
      return await runCommand('systemctl reboot || reboot');
    }
  },

  // 3. Shutdown the system
  shutdown: async () => {
    if (platform === 'darwin') {
      return await runCommand("osascript -e 'tell app \"System Events\" to shut down'");
    } else if (platform === 'win32') {
      return await runCommand('shutdown /s /t 5 /c "Relay remote shutdown"');
    } else {
      return await runCommand('systemctl poweroff || poweroff');
    }
  },

  // 4. Sleep / Standby
  sleep: async () => {
    if (platform === 'darwin') {
      return await runCommand('pmset sleepnow');
    } else if (platform === 'win32') {
      return await runCommand('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
    } else {
      return await runCommand('systemctl suspend');
    }
  },

  // 5. Mute Audio
  mute: async (shouldMute = true) => {
    if (platform === 'darwin') {
      return await runCommand(`osascript -e 'set volume output muted ${shouldMute ? 'true' : 'false'}'`);
    } else if (platform === 'win32') {
      return await runCommand('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"');
    } else {
      return await runCommand(`amixer set Master ${shouldMute ? 'mute' : 'unmute'}`);
    }
  },

  // 6. Set Volume (0 - 100)
  setVolume: async (level) => {
    const val = Math.max(0, Math.min(100, Math.round(level)));
    if (platform === 'darwin') {
      // macOS volume is 0-7 or 0-100 via AppleScript
      return await runCommand(`osascript -e 'set volume output volume ${val}'`);
    } else if (platform === 'linux') {
      return await runCommand(`amixer set Master ${val}%`);
    }
  },

  // 7. Get Device Telemetry
  getTelemetry: () => {
    const cpus = os.cpus();
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
    const usedMem = (totalMem - freeMem).toFixed(1);

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
      cpuCount: cpus.length,
      cpuModel: cpus[0]?.model || 'Unknown CPU',
      memory: {
        total: `${totalMem} GB`,
        used: `${usedMem} GB`,
        free: `${freeMem} GB`
      }
    };
  }
};

module.exports = {
  commands,
  runCommand
};

if (require.main === module) {
  console.log('[Relay Agent] Initialized on', os.hostname());
  console.log('[Relay Agent] Platform:', platform);
  console.log('[Relay Agent] Telemetry:', commands.getTelemetry());
}

